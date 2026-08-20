/**
 * Open-world asset gap discovery — second pipeline beside coverageloop.
 *
 * Pack-blind topic→concept expansion from scripts/data/discovery-universe/,
 * then strict pack matching via pack-exact-match.mjs (same as dict coverage).
 * Does NOT modify esl-picturable-source.json or commission art.
 *
 *   npm run discovery
 *   npm run discovery:gaps
 *   node scripts/asset-gap-discovery.mjs [--gaps-only] [--rounds=5] [--saturate=N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, verifiedPackHit } from './lib/pack-exact-match.mjs';
import {
  bestValidHomeTopic,
  classifyConceptTopicPair,
  isValidProvenance,
  scrubCandidate,
  scoreScrubbedGap,
  applyClusterSaturation,
  pickBroadCategory,
} from './lib/discovery-semantic-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UNIVERSE_DIR = path.join(ROOT, 'scripts/data/discovery-universe');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const OUT_DIR = path.join(ROOT, 'tmp/asset-discovery');

const ABSTRACTS = new Set([
  'happiness', 'freedom', 'justice', 'love', 'hate', 'peace', 'war', 'idea',
  'thought', 'feeling', 'emotion', 'concept', 'theory', 'knowledge', 'wisdom',
  'truth', 'beauty', 'courage', 'honesty', 'friendship', 'kindness', 'respect',
  'responsibility', 'opportunity', 'success', 'failure', 'progress', 'change',
  'difference', 'similarity', 'quality', 'quantity', 'amount', 'number',
  'thing', 'stuff', 'something', 'anything', 'everything', 'nothing',
  'process', 'system', 'method', 'approach', 'strategy', 'policy',
  'situation', 'condition', 'state', 'status', 'degree',
  'orbit', 'thunder', 'herd', 'flock', 'orchestra', 'customs', 'duty-free',
  // process / vague / non-still-life (seed noise that should not rank as gaps)
  'magma', 'sediment', 'eruption', 'itinerary', 'molecule', 'atom',
  // Keep pottery glaze / kitchen yeast discoverable (picturable still-lifes).
  'specimen', 'artifact', 'relic', 'constellation',
  'ash cloud', 'periodic table',
]);

/**
 * Standalone lemmas too muddy for kid ESL vocab art without sense disambiguation.
 * Keep clear picturable dual-reads (bat/cap/heart/drum/ray/…) discoverable.
 */
const MULTI_SENSE = new Set([
  // obscure / wrong-sense seed lemmas (tool or jargon collision)
  'plane', 'press', 'mold', 'last', 'bit', 'file', 'square',
  'phillips', 'sleeper', 'coupling',
  // geology / process multi-reads that are not clean cutouts
  'vent', 'fault', 'core', 'mantle', 'crust', 'hide', 'pattern', 'signal',
]);

const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'with', 'by',
  'from', 'as', 'at', 'is', 'are', 'be', 'was', 'were', 'it', 'its',
]);

const MULTIWORD_FRAME_RE =
  /^(how to|what is|why do|when to|where to|can you|do you|let us|let's|i am|we are|there is|there are)\b/i;

/** Round plans: domain ids + optional cross-product specialty key. */
const ROUND_PLANS = [
  {
    id: 'round1',
    label: 'habitats/food',
    domains: ['animals', 'food', 'farm', 'ocean', 'weather'],
    cross: 'habitats_food',
    crossDomains: ['animals', 'food'],
  },
  {
    id: 'round2',
    label: 'trades/medical',
    domains: ['trades', 'medical', 'tools', 'sewing', 'body'],
    cross: 'trades_medical',
    crossDomains: ['trades', 'medical'],
  },
  {
    id: 'round3',
    label: 'archaeology/medieval',
    domains: ['archaeology', 'geology', 'clothing', 'school'],
    cross: 'archaeology_medieval',
    crossDomains: ['archaeology', 'geology'],
  },
  {
    id: 'round4',
    label: 'labs/music/theater',
    domains: ['labs', 'music', 'school', 'weather'],
    cross: 'labs_music',
    crossDomains: ['labs', 'music'],
  },
  {
    id: 'round5',
    label: 'factories/rail/ships/emergency',
    domains: ['factories', 'emergency', 'airports', 'ocean', 'tools'],
    cross: 'factories_emergency',
    crossDomains: ['factories', 'emergency'],
  },
];

function parseArgs(argv) {
  const opts = {
    gapsOnly: false,
    rounds: 5,
    saturate: 8,
    top: 200,
  };
  for (const a of argv) {
    if (a === '--gaps-only') opts.gapsOnly = true;
    else if (a.startsWith('--rounds=')) opts.rounds = Math.max(1, Number(a.slice(9)) || 5);
    else if (a.startsWith('--saturate=')) opts.saturate = Math.max(0, Number(a.slice(11)) || 8);
    else if (a.startsWith('--top=')) opts.top = Math.max(1, Number(a.slice(6)) || 200);
  }
  return opts;
}

function loadUniverse() {
  if (!fs.existsSync(UNIVERSE_DIR)) {
    throw new Error(`Missing discovery universe: ${UNIVERSE_DIR}`);
  }
  const files = fs
    .readdirSync(UNIVERSE_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const byId = new Map();
  let meta = null;
  const metaPath = path.join(UNIVERSE_DIR, '_meta.json');
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  }
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(UNIVERSE_DIR, f), 'utf8'));
    if (!raw.id) continue;
    byId.set(raw.id, normalizeDomain(raw));
  }
  return { byId, meta };
}

function normalizeConcept(raw, domainDefaults) {
  if (typeof raw === 'string') {
    return {
      word: normalize(raw),
      usefulness: domainDefaults.usefulness,
      picturable: domainDefaults.picturable,
      hardToSubstitute: domainDefaults.hardToSubstitute,
      tags: [],
    };
  }
  const word = normalize(raw.word || raw.lemma || '');
  return {
    word,
    usefulness: Number(raw.usefulness ?? domainDefaults.usefulness),
    picturable: Number(raw.picturable ?? domainDefaults.picturable),
    hardToSubstitute: Number(raw.hardToSubstitute ?? domainDefaults.hardToSubstitute),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
  };
}

function normalizeDomain(raw) {
  const defaults = {
    usefulness: Number(raw.usefulness ?? 0.7),
    picturable: Number(raw.picturable ?? 0.85),
    hardToSubstitute: Number(raw.hardToSubstitute ?? 0.45),
  };
  const concepts = (Array.isArray(raw.concepts) ? raw.concepts : [])
    .map((c) => normalizeConcept(c, defaults))
    .filter((c) => c.word);
  const topics = (Array.isArray(raw.topics) ? raw.topics : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  return {
    id: raw.id,
    labels: Array.isArray(raw.labels) ? raw.labels.map(String) : [raw.id],
    ...defaults,
    topics,
    concepts,
  };
}

function pickConcepts(domain, n = 12) {
  const list = domain.concepts.slice();
  // Stable preference: higher picturable * usefulness first, then alpha
  list.sort((a, b) => {
    const sa = a.picturable * 0.6 + a.usefulness * 0.4;
    const sb = b.picturable * 0.6 + b.usefulness * 0.4;
    if (sb !== sa) return sb - sa;
    return a.word.localeCompare(b.word);
  });
  const target = Math.min(Math.max(8, n), 15, list.length);
  return list.slice(0, target);
}

/** Tokenize a lesson topic for relevance checks (handles cross "×" titles). */
function topicTokens(topic) {
  return new Set(
    normalize(String(topic || ''))
      .split(/[\s/×:_-]+/)
      .filter((t) => t.length > 2)
  );
}

/** Tags too broad to count as topic relevance on their own (avoid animal→every animal-* topic). */
const GENERIC_RELEVANCE_TAGS = new Set([
  'part', 'tool', 'gear', 'body', 'find', 'animal', 'food', 'clothing', 'place',
  'person', 'object', 'item', 'thing', 'kit', 'set',
]);

/**
 * True when the concept word/tags meaningfully belong on this topic.
 * Prevents kitchen nouns from riding every habitat×food cross-product.
 */
function conceptRelevantToTopic(concept, topic, domain = null) {
  const grade = classifyConceptTopicPair({
    word: concept.word,
    topic,
    tags: concept.tags || [],
    domainId: domain?.id || concept.domainId || null,
    domainLabels: domain?.labels || [],
  });
  return isValidProvenance(grade);
}

/**
 * Build concept list for one topic.
 * - Base domain topics: relevant primary concepts + small non-counting flavor.
 * - Cross topics: relevant concepts from cross domains only (no top-N dump).
 * Flavor attachments are marked meaningful:false so they do not inflate topicCount.
 */
function conceptsForTopic(domain, topic, extraDomains = [], opts = {}) {
  const { cross = false, flavorN = 3 } = opts;
  const sources = cross
    ? [domain, ...extraDomains.filter((d) => d && d.id !== domain.id)]
    : [domain];
  const out = [];
  const seen = new Set();

  for (const d of sources) {
    if (!d) continue;
    for (const c of d.concepts) {
      if (!conceptRelevantToTopic(c, topic, d)) continue;
      if (seen.has(c.word)) continue;
      seen.add(c.word);
      out.push({ ...c, domainId: d.id, meaningful: true });
    }
  }

  // Cross-product topics: never back-fill with unrelated domain dumps.
  if (cross) return out.slice(0, 15);

  // Base topics: tiny flavor slice so sparse topics stay usable — does not count for topicCount.
  if (flavorN > 0) {
    for (const c of pickConcepts(domain, flavorN + 4)) {
      if (seen.has(c.word)) continue;
      seen.add(c.word);
      out.push({ ...c, domainId: domain.id, meaningful: false });
      if ([...out].filter((x) => !x.meaningful).length >= flavorN) break;
    }
  }
  return out.slice(0, 15);
}

function expandCrossTopics(plan, byId, meta) {
  const templates =
    (meta?.crossTemplates && meta.crossTemplates[plan.cross]) ||
    DEFAULT_CROSS[plan.cross] ||
    [];
  const ids = plan.crossDomains || plan.domains;
  const domains = ids.map((id) => byId.get(id)).filter(Boolean);
  if (domains.length < 2 || !templates.length) return [];
  const [aDom, bDom] = domains;
  const aLabels = [...aDom.labels, aDom.id].slice(0, 4);
  const bLabels = [...bDom.labels, bDom.id].slice(0, 4);
  const out = [];
  for (const tmpl of templates) {
    for (const a of aLabels) {
      for (const b of bLabels.slice(0, 2)) {
        out.push(
          tmpl.replace(/\{a\}/g, a).replace(/\{b\}/g, b)
        );
      }
    }
  }
  // Also: pair base topics across the two domains (capped)
  const aTopics = aDom.topics.slice(0, 8);
  const bTopics = bDom.topics.slice(0, 8);
  for (let i = 0; i < Math.min(aTopics.length, bTopics.length); i++) {
    out.push(`${aTopics[i]} × ${bTopics[i]}`);
  }
  return [...new Set(out.map((t) => t.trim()).filter(Boolean))];
}

const DEFAULT_CROSS = {
  habitats_food: [
    '{a} habitat picnic',
    '{a} kitchen safari',
    'cooking with {a}',
    '{b} on the {a} trail',
  ],
  trades_medical: [
    '{a} clinic tools',
    '{b} workshop safety',
    '{a} meets {b}',
    'repair and care: {a}',
  ],
  archaeology_medieval: [
    '{a} castle dig',
    'medieval {a} market',
    '{a} ruin walk',
    '{b} artifact lab',
  ],
  labs_music: [
    '{a} sound lab',
    'stage science: {a}',
    '{b} instrument study',
    '{a} theater experiment',
  ],
  factories_emergency: [
    '{a} rescue drill',
    'port emergency: {a}',
    '{b} factory safety',
    '{a} rail response',
  ],
};

/**
 * Pack-blind topic→concepts for one round.
 * Base topics stay inside their domain; cross topics only take token-relevant
 * concepts. Every domain concept still enters via bank-sweep home topic.
 */
function generateRoundTopics(plan, byId, meta) {
  const topicMap = new Map(); // topic -> { concepts[], domainIds[], kind }
  const active = plan.domains.map((id) => byId.get(id)).filter(Boolean);

  function ensureBaseTopic(topic, primary) {
    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        topic,
        kind: 'base',
        concepts: conceptsForTopic(primary, topic, [], { cross: false, flavorN: 3 }),
        domainIds: [primary.id],
      });
    } else {
      const row = topicMap.get(topic);
      if (!row.domainIds.includes(primary.id)) row.domainIds.push(primary.id);
    }
    return topicMap.get(topic);
  }

  for (const d of active) {
    for (const topic of d.topics) {
      ensureBaseTopic(topic, d);
    }
    // Bank sweep: every domain concept must enter the pool, but ONLY a
    // semantically valid home topic may count toward topicCount. Round-robin
    // onto unrelated titles is forbidden (that inflated quill/vise/mortar).
    if (!d.topics.length) continue;
    const coveredMeaningful = new Set();
    for (const tr of [...topicMap.values()].filter((t) => t.kind === 'base' && t.domainIds.includes(d.id))) {
      for (const c of tr.concepts) {
        if (c.meaningful !== false) coveredMeaningful.add(c.word);
      }
    }
    const missing = d.concepts.filter((c) => !coveredMeaningful.has(c.word));
    for (const concept of missing) {
      const home = bestValidHomeTopic(concept, d);
      if (home) {
        const row = ensureBaseTopic(home.topic, d);
        const existing = row.concepts.find((c) => c.word === concept.word);
        if (existing) {
          existing.meaningful = true;
        } else {
          row.concepts.push({ ...concept, domainId: d.id, meaningful: true });
        }
      } else {
        // Orphan inventory: attach for pool membership, do NOT count as demand.
        const inventoryTopic = `${d.id} inventory`;
        if (!topicMap.has(inventoryTopic)) {
          topicMap.set(inventoryTopic, {
            topic: inventoryTopic,
            kind: 'base',
            concepts: [],
            domainIds: [d.id],
          });
        }
        const row = topicMap.get(inventoryTopic);
        if (!row.domainIds.includes(d.id)) row.domainIds.push(d.id);
        if (!row.concepts.find((c) => c.word === concept.word)) {
          row.concepts.push({ ...concept, domainId: d.id, meaningful: false });
        }
      }
    }
  }

  const crossDomains = (plan.crossDomains || [])
    .map((id) => byId.get(id))
    .filter(Boolean);
  const crossTopics = expandCrossTopics(plan, byId, meta);
  for (const topic of crossTopics) {
    if (topicMap.has(topic)) continue;
    const primary =
      crossDomains.find((d) =>
        d.labels.some((l) => topic.toLowerCase().includes(String(l).toLowerCase()))
      ) ||
      active.find((d) =>
        d.labels.some((l) => topic.toLowerCase().includes(String(l).toLowerCase()))
      ) ||
      crossDomains[0] ||
      active[0];
    if (!primary) continue;
    const extras = crossDomains.filter((d) => d.id !== primary.id);
    topicMap.set(topic, {
      topic,
      kind: 'cross',
      concepts: conceptsForTopic(primary, topic, extras, { cross: true }),
      domainIds: [primary.id, ...extras.map((d) => d.id)],
    });
  }

  return [...topicMap.values()];
}

function failsHeuristics(word, seenWords) {
  if (!word) return 'empty';
  const w = String(word).toLowerCase().trim();
  if (w.length < 2) return 'too-short';
  if (w.length > 28) return 'too-long';
  if (FUNCTION_WORDS.has(w)) return 'function-word';
  if (ABSTRACTS.has(w)) return 'abstract';
  if (MULTI_SENSE.has(w)) return 'multi-sense';
  if (MULTIWORD_FRAME_RE.test(w)) return 'multiword-frame';
  const parts = w.split(/\s+/);
  if (parts.length >= 4) return 'multiword-frame';
  if (parts.length === 3 && parts.some((p) => p.length <= 2)) return 'awkward-phrase';
  if (parts.length >= 2 && FUNCTION_WORDS.has(parts[0])) return 'function-word';
  // Over-specific junk: long hyphen compounds or very rare compounds
  if ((w.match(/-/g) || []).length >= 2) return 'over-specific';
  if (seenWords.has(w)) return 'duplicate';
  // Digits / codes / non-lemma noise
  if (/\d/.test(w)) return 'junk';
  if (/^['\-]|['\-]$/.test(w)) return 'junk';
  if (/_/.test(w)) return 'junk';
  return null;
}

/**
 * Merge a concept onto the cumulative pool.
 * topicCount counts unique *meaningful* base topics + down-weighted cross hits
 * (not raw attachment dumps). Flavor-only attachments stay in topics[] provenance
 * but do not inflate ranking.
 */
function mergeCandidate(pool, concept, topic, roundId, attachMeta = {}) {
  const word = concept.word;
  const kind = attachMeta.kind === 'cross' ? 'cross' : 'base';
  const meaningful = concept.meaningful !== false;
  let row = pool.get(word);
  if (!row) {
    row = {
      word,
      topics: [],
      meaningfulBaseTopics: [],
      meaningfulCrossTopics: [],
      topicCount: 0,
      domainCount: 0,
      usefulness: concept.usefulness,
      picturable: concept.picturable,
      hardToSubstitute: concept.hardToSubstitute,
      tags: [...(concept.tags || [])],
      domainIds: concept.domainId ? [concept.domainId] : [],
      rounds: [],
    };
    pool.set(word, row);
  }
  if (!row.topics.includes(topic)) {
    row.topics.push(topic);
  }
  if (meaningful) {
    if (kind === 'cross') {
      if (!row.meaningfulCrossTopics.includes(topic)) {
        row.meaningfulCrossTopics.push(topic);
      }
    } else if (!row.meaningfulBaseTopics.includes(topic)) {
      row.meaningfulBaseTopics.push(topic);
    }
  }
  // Keep stronger picturable / usefulness signals
  row.usefulness = Math.max(row.usefulness, concept.usefulness);
  row.picturable = Math.max(row.picturable, concept.picturable);
  row.hardToSubstitute = Math.max(row.hardToSubstitute, concept.hardToSubstitute);
  if (concept.domainId && !row.domainIds.includes(concept.domainId)) {
    row.domainIds.push(concept.domainId);
  }
  if (!row.rounds.includes(roundId)) row.rounds.push(roundId);
  for (const t of concept.tags || []) {
    if (!row.tags.includes(t)) row.tags.push(t);
  }
  recomputeTopicCount(row);
  return row;
}

/**
 * topicCount = unique meaningful base topics
 *            + min(2, meaningful cross topics)   // down-weight cross-product spam
 * Prefer multi-domain words via domainCount in ranking, not raw topic dumps.
 */
function recomputeTopicCount(row) {
  const base = (row.meaningfulBaseTopics || []).length;
  const crossCredit = Math.min(2, (row.meaningfulCrossTopics || []).length);
  row.topicCount = base + crossCredit;
  row.domainCount = (row.domainIds || []).length;
  return row.topicCount;
}

/**
 * score = 35*topicFreqNorm + 20*domainReuseNorm + 20*usefulness + 15*picturable + 10*hardToSubstitute
 * topicFreq uses hardened topicCount; domainReuse rewards words spanning real domains.
 */
function rankGap(row, maxTopicCount, maxDomainCount = 1) {
  const topicCount = Math.max(1, row.topicCount || 1);
  const domainCount = Math.max(1, row.domainCount || row.domainIds?.length || 1);
  const topicFreqNorm = Math.min(1, topicCount / Math.max(3, maxTopicCount * 0.35));
  const domainReuseNorm =
    domainCount >= 2 ? Math.min(1, domainCount / Math.max(2, maxDomainCount * 0.5)) : 0;
  const usefulness = Number(row.usefulness ?? 0.7);
  const picturable = Number(row.picturable ?? 0.9);
  const hardToSubstitute = Number(row.hardToSubstitute ?? 0.45);
  const score =
    35 * topicFreqNorm +
    20 * domainReuseNorm +
    20 * usefulness +
    15 * picturable +
    10 * hardToSubstitute;
  return {
    score: Math.round(score * 100) / 100,
    topicCount,
    domainCount,
    topicFreqNorm: Math.round(topicFreqNorm * 1000) / 1000,
    domainReuseNorm: Math.round(domainReuseNorm * 1000) / 1000,
    usefulness,
    picturable,
    hardToSubstitute,
  };
}

function classifyCandidate(row, dictSet, index, whitelist) {
  const word = row.word;
  const inDict = dictSet.has(word) || dictSet.has(normalize(word));
  const hit = verifiedPackHit(index, word, whitelist);
  const verified = !!(hit && hit.verified);

  if (inDict && verified) return { bucket: 'alreadyKnownCovered', hit };
  if (inDict && !verified) return { bucket: 'knownGap', hit };
  if (!inDict && verified) return { bucket: 'newCoveredConcept', hit };
  return { bucket: 'newDiscoveryGap', hit: null };
}

export function runDiscovery(options = {}) {
  const opts = {
    gapsOnly: false,
    rounds: 5,
    saturate: 8,
    top: 200,
    noHistory: false,
    ...options,
  };

  if (!fs.existsSync(DICT_PATH)) {
    throw new Error(`Missing dictionary: ${DICT_PATH}`);
  }
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing pack index: ${INDEX_PATH}`);
  }

  const { byId, meta } = loadUniverse();
  if (byId.size === 0) {
    throw new Error(
      `No domain banks in ${UNIVERSE_DIR} — run node scripts/seed-discovery-universe.mjs`
    );
  }

  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const whitelist = dict.canonicalWhitelist || {};
  const dictSet = new Set((dict.words || []).map((w) => normalize(w)));

  const pool = new Map();
  const allTopics = new Set();
  const roundStats = [];
  let saturatedEarly = false;
  const plans = ROUND_PLANS.slice(0, opts.rounds);

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const beforeSize = pool.size;
    const beforeGaps = new Set(
      [...pool.values()]
        .filter((r) => {
          const fail = failsHeuristics(r.word, new Set());
          if (fail) return false;
          const { bucket } = classifyCandidate(r, dictSet, index, whitelist);
          return bucket === 'newDiscoveryGap';
        })
        .map((r) => r.word)
    );

    const topicRows = generateRoundTopics(plan, byId, meta);
    let conceptsAdded = 0;
    for (const tr of topicRows) {
      allTopics.add(tr.topic);
      for (const concept of tr.concepts) {
        const existed = pool.has(concept.word);
        mergeCandidate(pool, concept, tr.topic, plan.id, { kind: tr.kind || 'base' });
        if (!existed) conceptsAdded++;
      }
    }

    // Reclassify to count new discovery gaps this round
    const afterGaps = new Set();
    const needsReviewThis = [];
    for (const row of pool.values()) {
      const fail = failsHeuristics(row.word, new Set());
      if (fail) {
        needsReviewThis.push(row.word);
        continue;
      }
      const { bucket } = classifyCandidate(row, dictSet, index, whitelist);
      if (bucket === 'newDiscoveryGap') afterGaps.add(row.word);
    }
    const newDiscoveryGapsAdded = [...afterGaps].filter((w) => !beforeGaps.has(w)).length;
    const newCandidates = pool.size - beforeSize;

    const stat = {
      round: i + 1,
      id: plan.id,
      label: plan.label,
      domains: plan.domains,
      topicsGenerated: topicRows.length,
      newCandidates,
      poolSize: pool.size,
      newDiscoveryGapsAdded,
      cumulativeDiscoveryGaps: afterGaps.size,
    };
    roundStats.push(stat);

    // Saturation: few high-score new gaps (topicCount>=2 preferred signal)
    const highScoreNew = [...afterGaps]
      .filter((w) => !beforeGaps.has(w))
      .filter((w) => (pool.get(w)?.topicCount || 0) >= 1 && (pool.get(w)?.picturable || 0) >= 0.7)
      .length;
    if (i > 0 && highScoreNew < opts.saturate) {
      saturatedEarly = true;
      stat.saturationSignal = true;
      stat.highScoreNew = highScoreNew;
      // Still continue remaining rounds per plan ("still write full report")
      // but record signal; we do not stop unless --saturate forces early end via env
    }
    if (process.env.DISCOVERY_STOP_ON_SATURATION === '1' && saturatedEarly) {
      break;
    }
  }

  // Final classification + semantic provenance scrub
  const buckets = {
    alreadyKnownCovered: [],
    knownGap: [],
    newCoveredConcept: [],
    newDiscoveryGap: [],
    needsReview: [],
  };

  const domainLabelMap = new Map();
  for (const [id, dom] of byId) {
    domainLabelMap.set(id, [...(dom.labels || []), id]);
  }

  const seenForDup = new Set();
  const scrubDeltas = [];
  for (const row of pool.values()) {
    const fail = failsHeuristics(row.word, seenForDup);
    seenForDup.add(row.word);
    if (fail) {
      buckets.needsReview.push({
        word: row.word,
        why: fail,
        topicCount: row.topicCount,
        domainCount: row.domainCount,
        topics: row.topics.slice(0, 8),
      });
      continue;
    }

    const scrubbed = scrubCandidate(row, domainLabelMap);
    const { bucket, hit } = classifyCandidate(scrubbed, dictSet, index, whitelist);

    if (scrubbed.allProvenanceInvalid || scrubbed.topicCount < 1) {
      buckets.needsReview.push({
        word: scrubbed.word,
        why: 'invalid-provenance',
        topicCount: 0,
        domainCount: scrubbed.domainCount,
        topics: (scrubbed.topics || []).slice(0, 8),
        invalidOrWeakTopics: scrubbed.invalidOrWeakTopics,
        provenanceGrades: scrubbed.provenanceGrades,
      });
      continue;
    }

    const entry = {
      word: scrubbed.word,
      topicCount: scrubbed.topicCount,
      domainCount: scrubbed.domainCount,
      rawTopicAttachments: (scrubbed.topics || []).length,
      topics: scrubbed.validTopics.slice().sort(),
      validTopics: scrubbed.validTopics.slice().sort(),
      meaningfulBaseTopics: (scrubbed.meaningfulBaseTopics || []).slice().sort(),
      meaningfulCrossTopics: (scrubbed.meaningfulCrossTopics || []).slice().sort(),
      usefulness: scrubbed.usefulness,
      picturable: scrubbed.picturable,
      hardToSubstitute: scrubbed.hardToSubstitute,
      tags: scrubbed.tags,
      domainIds: scrubbed.domainIds,
      broadCategory: scrubbed.broadCategory || pickBroadCategory(scrubbed.domainIds || []),
      rounds: scrubbed.rounds,
      provenanceGrades: scrubbed.provenanceGrades,
      topicCountBeforeScrub: scrubbed.topicCountBefore,
    };
    if (
      scrubbed.topicCountBefore != null &&
      scrubbed.topicCountBefore !== scrubbed.topicCount
    ) {
      scrubDeltas.push({
        word: scrubbed.word,
        topicCountBefore: scrubbed.topicCountBefore,
        topicCountAfter: scrubbed.topicCount,
        droppedTopics: scrubbed.invalidOrWeakTopics,
      });
    }
    if (hit) {
      entry.packKey = hit.key;
      entry.packFile = hit.file;
      entry.verified = hit.verified;
    }
    buckets[bucket].push(entry);
  }

  const maxTopicCount = Math.max(
    1,
    ...buckets.newDiscoveryGap.map((r) => r.topicCount || 1),
    ...buckets.newCoveredConcept.map((r) => r.topicCount || 1),
    1
  );
  const maxDomainCount = Math.max(
    1,
    ...[...buckets.newDiscoveryGap, ...buckets.newCoveredConcept].map(
      (r) => r.domainCount || 1
    ),
    1
  );

  const rankedDiscoveryGaps = applyClusterSaturation(
    buckets.newDiscoveryGap
      .map((g) => {
        const metaScore = scoreScrubbedGap(g, maxTopicCount, maxDomainCount);
        return { ...g, ...metaScore };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.word.localeCompare(b.word);
      })
  ).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  buckets.newDiscoveryGap = rankedDiscoveryGaps;

  // Score verified pack hits the same way so dict-promotion ranking is comparable.
  const rankedNewCovered = buckets.newCoveredConcept
    .map((g) => {
      const metaScore = scoreScrubbedGap(g, maxTopicCount, maxDomainCount);
      return { ...g, ...metaScore };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.word.localeCompare(b.word);
    });
  buckets.newCoveredConcept = rankedNewCovered;

  // Dict promotion = verified newCoveredConcept only (preferred).
  // Discovery gaps may appear as clearly labeled art-queue candidates — never as
  // ready-to-merge dictionary words.
  const dictPromotion = rankedNewCovered
    .filter((g) => g.picturable >= 0.75 && g.usefulness >= 0.55 && g.topicCount >= 1)
    .map((g) => ({
      word: g.word,
      readiness: 'dict-promotion',
      readyForDictMerge: true,
      reason: 'dict-promotion:newCoveredConcept-verified-pack-not-in-dict',
      topicCount: g.topicCount,
      domainCount: g.domainCount,
      score: g.score ?? null,
      picturable: g.picturable,
      usefulness: g.usefulness,
      packKey: g.packKey || null,
      packFile: g.packFile || null,
    }));

  const artQueueCandidates = rankedDiscoveryGaps
    .filter(
      (g) =>
        g.picturable >= 0.75 &&
        g.usefulness >= 0.55 &&
        g.topicCount >= 1 &&
        g.score >= 35
    )
    .map((g) => ({
      word: g.word,
      readiness: 'art-queue-only',
      readyForDictMerge: false,
      reason: 'art-queue-only:newDiscoveryGap-needs-art-not-dict-ready',
      topicCount: g.topicCount,
      domainCount: g.domainCount,
      score: g.score ?? null,
      picturable: g.picturable,
      usefulness: g.usefulness,
    }));

  const recommendedDictionaryAdditions = [...dictPromotion, ...artQueueCandidates];

  // Dedupe: prefer dict-promotion over art-queue for the same word
  const seenRec = new Set();
  const recommendedUnique = [];
  for (const r of recommendedDictionaryAdditions) {
    if (seenRec.has(r.word)) continue;
    seenRec.add(r.word);
    recommendedUnique.push(r);
  }
  recommendedUnique.sort((a, b) => {
    const ra = a.readyForDictMerge ? 1 : 0;
    const rb = b.readyForDictMerge ? 1 : 0;
    if (rb !== ra) return rb - ra;
    const sa = a.score ?? 0;
    const sb = b.score ?? 0;
    if (sb !== sa) return sb - sa;
    return a.word.localeCompare(b.word);
  });

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    method:
      'Open-world discovery from scripts/data/discovery-universe/ + strict pack-exact-match. ' +
      'Does not modify curated dictionary source. No aliases/PropBank/glyphs.',
    roundsPlanned: plans.length,
    roundsCompleted: roundStats.length,
    saturationSignal: saturatedEarly,
    universe: {
      domainCount: byId.size,
      domainIds: [...byId.keys()].sort(),
    },
    dictionary: {
      path: 'scripts/data/esl-picturable-dictionary.json',
      wordCount: dictSet.size,
    },
    packIndexKeys: Object.keys(index).length,
    totals: {
      topics: allTopics.size,
      candidateConcepts: pool.size,
      alreadyKnownCovered: buckets.alreadyKnownCovered.length,
      knownGap: buckets.knownGap.length,
      newCoveredConcept: buckets.newCoveredConcept.length,
      newDiscoveryGap: buckets.newDiscoveryGap.length,
      needsReview: buckets.needsReview.length,
      recommendedDictionaryAdditions: recommendedUnique.length,
      dictPromotionSuggestions: recommendedUnique.filter((r) => r.readyForDictMerge).length,
      artQueueOnlySuggestions: recommendedUnique.filter((r) => !r.readyForDictMerge).length,
    },
    roundStats,
    // Always persist full buckets in latest.json so promote/cover tools stay honest.
    // --gaps-only only narrows console output / ranked-gaps focus, not the snapshot.
    buckets,
    rankedDiscoveryGaps,
    provenance: {
      note:
        'topicCount = independently valid (strong|reasonable) lesson topics only. ' +
        'Weak/invalid concept↔topic pairs do not raise demand or cross-domain score. ' +
        'Bank-sweep homes require semantic fit; orphans go to "{domain} inventory" without demand. ' +
        'Cluster saturation lightly demotes later items from the same niche in ranking.',
      scrubDeltas: scrubDeltas
        .sort(
          (a, b) =>
            Math.abs(b.topicCountBefore - b.topicCountAfter) -
            Math.abs(a.topicCountBefore - a.topicCountAfter)
        )
        .slice(0, 80),
      sample: rankedDiscoveryGaps.slice(0, 20).map((g) => ({
        word: g.word,
        topicCount: g.topicCount,
        domainCount: g.domainCount,
        broadCategory: g.broadCategory,
        topics: (g.validTopics || g.topics || []).slice(0, 5),
        score: g.score,
      })),
    },
    recommendedDictionaryAdditions: recommendedUnique,
    recommendationNote:
      'readyForDictMerge:true = verified pack hit not in dict (promotion candidate). ' +
      'readyForDictMerge:false / art-queue-only = discovery gap needing art — not ready to merge into the curated dictionary.',
    topics: [...allTopics].sort(),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'latest.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

  const gapsTxt = rankedDiscoveryGaps.map((g) => g.word).join('\n') + (rankedDiscoveryGaps.length ? '\n' : '');
  fs.writeFileSync(path.join(OUT_DIR, 'ranked-gaps.txt'), gapsTxt);

  if (!opts.noHistory) {
    const histPath = path.join(OUT_DIR, 'history.jsonl');
    const line = JSON.stringify({
      generatedAt,
      totals: report.totals,
      roundsCompleted: report.roundsCompleted,
      saturationSignal: saturatedEarly,
      out: 'tmp/asset-discovery/latest.json',
    });
    fs.appendFileSync(histPath, line + '\n');
  }

  return { report, outPath };
}

function printSummary(report, topN) {
  const t = report.totals;
  console.log('\n=== Open-world asset gap discovery ===');
  console.log(`Rounds: ${report.roundsCompleted}/${report.roundsPlanned}` +
    (report.saturationSignal ? ' (saturation signal recorded)' : ''));
  console.log(`Topics: ${t.topics} | Candidates: ${t.candidateConcepts}`);
  console.log(`alreadyKnownCovered: ${t.alreadyKnownCovered}`);
  console.log(`knownGap:            ${t.knownGap}`);
  console.log(`newCoveredConcept:   ${t.newCoveredConcept}`);
  console.log(`newDiscoveryGap:     ${t.newDiscoveryGap}`);
  console.log(`needsReview:         ${t.needsReview}`);
  console.log(`recommendedAdds:     ${t.recommendedDictionaryAdditions}` +
    ` (dict-promotion=${t.dictPromotionSuggestions || 0}, art-queue-only=${t.artQueueOnlySuggestions || 0})`);
  console.log('\nPer-round:');
  for (const r of report.roundStats) {
    console.log(
      `  ${r.id} (${r.label}): +${r.newCandidates} candidates, +${r.newDiscoveryGapsAdded} discovery gaps` +
        (r.saturationSignal ? ' [saturate]' : '')
    );
  }
  const gaps = report.rankedDiscoveryGaps || [];
  console.log(`\nTop ${Math.min(topN, gaps.length)} discovery gaps:`);
  for (const g of gaps.slice(0, topN)) {
    console.log(
      `  ${String(g.score).padStart(5)}  ${g.word}  (topics=${g.topicCount}, domains=${g.domainCount || 1}, pic=${g.picturable})`
    );
  }
  const recs = report.recommendedDictionaryAdditions || [];
  if (recs.length) {
    console.log(`\nRecommendation sample (${Math.min(12, recs.length)} of ${recs.length}):`);
    for (const r of recs.slice(0, 12)) {
      console.log(
        `  [${r.readyForDictMerge ? 'dict' : 'art '}]  ${r.word}  topics=${r.topicCount}  ${r.reason}`
      );
    }
  }
  const nr = report.buckets?.needsReview || [];
  if (nr.length) {
    console.log(`\nneedsReview sample (${Math.min(12, nr.length)} of ${nr.length}):`);
    for (const n of nr.slice(0, 12)) {
      console.log(`  ${n.word}  [${n.why}]`);
    }
  }
  console.log(`\nWrote tmp/asset-discovery/latest.json`);
  console.log(`Wrote tmp/asset-discovery/ranked-gaps.txt (${gaps.length} lines)`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { report } = runDiscovery(opts);
  printSummary(report, opts.top);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
