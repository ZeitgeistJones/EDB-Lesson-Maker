/**
 * Semantic provenance for discovery: score concept ↔ topic pairs.
 *
 * Grades: strong | reasonable | weak | invalid
 * Only strong/reasonable may contribute to topicCount / cross-domain / demand.
 *
 * General rules — not a per-lemma denylist. Uses token overlap, tag/domain
 * affinity clusters, and rejects bank-sweep-style co-occurrence alone.
 */
import { normalize } from './pack-exact-match.mjs';

/** Tags too broad to prove topic fit by themselves. */
export const GENERIC_TAGS = new Set([
  'part',
  'tool',
  'gear',
  'body',
  'find',
  'animal',
  'food',
  'clothing',
  'place',
  'person',
  'object',
  'item',
  'thing',
  'kit',
  'set',
  'role',
  'material',
]);

/**
 * Affinity clusters: if a concept's tags/domain align with a cluster AND the
 * topic hits that cluster's topic cues, the pair is strong/reasonable.
 * Clusters are educational themes, not individual word hardcodes.
 */
export const AFFINITY_CLUSTERS = [
  {
    id: 'animal-anatomy',
    tags: ['animal', 'part', 'ocean', 'farm'],
    domains: ['animals', 'ocean', 'farm'],
    topicCues: [
      'anatomy', 'shark', 'seal', 'fish', 'bird', 'whale', 'dolphin', 'reef',
      'coral', 'penguin',
    ],
    allowDomainTopicReuse: false,
  },
  {
    id: 'workshop-tools',
    tags: ['tool', 'gear'],
    domains: ['tools', 'trades', 'factories'],
    topicCues: [
      'tool', 'toolbox', 'workshop', 'garage', 'workbench', 'repair', 'diy',
      'hardware', 'drill', 'carpenter', 'mechanic', 'welder', 'blacksmith',
      'forge', 'nail', 'screw', 'measuring', 'power tool', 'clamp', 'vise',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'kitchen-food',
    tags: ['food'],
    domains: ['food'],
    topicCues: [
      'kitchen', 'bakery', 'food', 'cook', 'cooking', 'recipe', 'dessert',
      'cafeteria', 'spice', 'noodle', 'smoothie', 'mortar', 'pestle', 'ice cream',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'pottery-craft',
    tags: ['craft'],
    domains: ['trades'],
    partLemmas: ['mortar', 'pestle', 'kiln', 'clay', 'glaze', 'pottery wheel'],
    topicCues: [
      'pottery', 'kiln', 'clay', 'ceramic', 'wheel', 'glaze', 'pestle', 'mortar',
    ],
    allowDomainTopicReuse: false,
  },
  {
    id: 'castle-parts',
    tags: [],
    domains: ['archaeology'],
    // Lemmas that are themselves castle features (concept word ∈ this list)
    partLemmas: [
      'moat', 'turret', 'portcullis', 'battlement', 'drawbridge', 'keep',
      'rampart', 'bailey', 'parapet',
    ],
    topicCues: [
      'castle', 'moat', 'knight', 'medieval', 'siege', 'catapult', 'drawbridge',
      'armor', 'turret', 'battlement', 'portcullis',
    ],
    allowDomainTopicReuse: false,
  },
  {
    id: 'writing-scroll',
    tags: ['doc'],
    domains: ['archaeology', 'school'],
    topicCues: [
      'scroll', 'library', 'writing', 'ink', 'parchment', 'quill', 'script',
      'manuscript',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'geology-earth',
    tags: [],
    domains: ['geology'],
    topicCues: [
      'rock', 'cave', 'crystal', 'mineral', 'volcano', 'canyon', 'geyser',
      'glacier', 'earth', 'fossil', 'geode', 'lava', 'crater',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'medical-body',
    tags: ['body', 'kit'],
    domains: ['medical', 'body'],
    topicCues: [
      'doctor', 'dental', 'ambulance', 'first aid', 'x-ray', 'clinic',
      'hospital', 'body', 'face', 'mirror', 'hygiene', 'skeleton', 'vaccine',
      'eye exam', 'checkup',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'ship-rail-port',
    tags: [],
    domains: ['factories', 'ocean', 'airports'],
    topicCues: [
      'ship', 'cargo', 'freight', 'train', 'rail', 'port', 'harbor', 'deck',
      'mast', 'hull', 'airport', 'hangar', 'boarding', 'cruise',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'music-theater',
    tags: [],
    domains: ['music'],
    topicCues: [
      'music', 'orchestra', 'band', 'piano', 'guitar', 'stage', 'theater',
      'costume', 'ballet', 'choir', 'ticket', 'drum',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'emergency-safety',
    tags: ['kit'],
    domains: ['emergency'],
    topicCues: [
      'fire', 'rescue', 'emergency', 'safety', 'smoke', 'alarm', 'patrol',
      'helicopter', 'search', 'defibrillator',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'sewing-fabric',
    tags: ['clothing', 'material'],
    domains: ['sewing', 'clothing'],
    topicCues: [
      'fabric', 'sewing', 'stitch', 'knit', 'quilt', 'tailor', 'embroidery',
      'button', 'loom', 'fashion', 'uniform', 'costume', 'hat', 'shoe',
    ],
    allowDomainTopicReuse: true,
  },
  {
    id: 'lab-science',
    tags: [],
    domains: ['labs'],
    topicCues: [
      'lab', 'science', 'microscope', 'circuit', 'dna', 'beaker', 'burner',
      'petri', 'pipette',
    ],
    allowDomainTopicReuse: true,
  },
];

/** Broad ESL reuse categories for queue bucketing / diversity. */
export const BROAD_CATEGORY_BY_DOMAIN = {
  animals: 'animals-nature',
  ocean: 'animals-nature',
  farm: 'animals-nature',
  weather: 'nature-weather',
  geology: 'earth-geology',
  food: 'food-kitchen',
  body: 'body-health',
  medical: 'body-health',
  tools: 'tools-trades',
  trades: 'tools-trades',
  sewing: 'clothing-craft',
  clothing: 'clothing-craft',
  archaeology: 'history-castle',
  labs: 'lab-school',
  school: 'lab-school',
  music: 'arts-stage',
  factories: 'transport-industry',
  airports: 'travel-transport',
  emergency: 'emergency-safety',
};

export function tokenizeTopic(topic) {
  return new Set(
    normalize(String(topic || ''))
      .split(/[\s/×:_-]+/)
      .filter((t) => t.length > 1)
  );
}

function conceptTokens(word) {
  const w = normalize(word || '');
  const parts = w.split(/\s+/).filter((p) => p.length > 1);
  return { word: w, parts: new Set(parts) };
}

function cueHit(topicNorm, cues) {
  for (const cue of cues) {
    const c = normalize(cue);
    if (!c) continue;
    if (topicNorm.includes(c)) return true;
  }
  return false;
}

function hasLexicalOverlap(word, topic) {
  const { word: w, parts } = conceptTokens(word);
  const toks = tokenizeTopic(topic);
  if (toks.has(w)) return true;
  for (const p of parts) {
    if (p.length > 2 && toks.has(p)) return true;
  }
  return false;
}

/**
 * @returns {'strong'|'reasonable'|'weak'|'invalid'}
 */
export function classifyConceptTopicPair({
  word,
  topic,
  tags = [],
  domainId = null,
  domainLabels = [],
} = {}) {
  const { word: w, parts } = conceptTokens(word);
  const topicNorm = normalize(topic || '');
  const toks = tokenizeTopic(topic);
  if (!w || !topicNorm) return 'invalid';

  // 1) Direct lexical overlap → strong
  if (toks.has(w)) return 'strong';
  for (const p of parts) {
    if (p.length > 2 && toks.has(p)) return 'strong';
  }
  // Multiword concept: all content parts appear across topic
  if (parts.size >= 2) {
    let hit = 0;
    for (const p of parts) {
      if (p.length > 2 && (toks.has(p) || topicNorm.includes(p))) hit++;
    }
    if (hit >= 2) return 'strong';
    if (hit === 1) return 'reasonable';
  }

  // 2) Specific (non-generic) tag tokens in topic → strong/reasonable
  const specificTags = (tags || [])
    .map((t) => normalize(String(t)))
    .filter((t) => t.length > 2 && !GENERIC_TAGS.has(t));
  for (const t of specificTags) {
    if (toks.has(t) || topicNorm.includes(t)) return 'strong';
  }

  // 3) Affinity clusters — domain/theme reuse only when explicitly allowed.
  //    Generic tags (tool/find/place) must NOT validate every lemma onto every
  //    themed title in that domain (that inflated quill/mummy to 18 topics).
  const tagSet = new Set((tags || []).map((t) => normalize(String(t))));
  let bestAffinity = null;
  for (const cluster of AFFINITY_CLUSTERS) {
    const tagMatch = cluster.tags.some((t) => tagSet.has(normalize(t)));
    const domainMatch = domainId && cluster.domains.includes(domainId);
    if (!tagMatch && !domainMatch) continue;
    if (!cueHit(topicNorm, cluster.topicCues)) continue;

    if (cluster.id === 'animal-anatomy') {
      // Only validate body-part lemmas against fitting creature/anatomy topics —
      // not every animals-bank noun (quill, track, cub…) on every habitat title.
      if (!tagSet.has('part')) continue;
      const marineParts = new Set([
        'fin', 'gill', 'fluke', 'blowhole', 'dorsal', 'barnacle',
      ]);
      const sealFace = new Set(['snout', 'whisker']);
      if (
        marineParts.has(w) &&
        cueHit(topicNorm, [
          'shark', 'seal', 'fish', 'whale', 'dolphin', 'reef', 'coral',
          'harbor', 'anatomy', 'ocean', 'underwater',
        ])
      ) {
        return 'strong';
      }
      if (
        sealFace.has(w) &&
        cueHit(topicNorm, ['seal', 'otter', 'anatomy', 'harbor', 'mammal'])
      ) {
        return 'strong';
      }
      // Generic anatomy lesson: require the part word (or stem) in the topic
      if (topicNorm.includes('anatomy') && hasLexicalOverlap(w, topic)) {
        return 'strong';
      }
      continue;
    }

    if (cluster.id === 'castle-parts') {
      const parts = new Set((cluster.partLemmas || []).map(normalize));
      // Require a castle-site cue — not every medieval/knight/siege title.
      if (
        parts.has(w) &&
        cueHit(topicNorm, ['castle', 'drawbridge', 'moat', 'battlement', 'portcullis', 'turret'])
      ) {
        return 'strong';
      }
      continue;
    }

    if (cluster.id === 'pottery-craft') {
      const parts = new Set((cluster.partLemmas || []).map(normalize));
      if (parts.has(w) && cueHit(topicNorm, cluster.topicCues)) {
        // Reasonable (not strong) so affinity-credit cap applies — stops
        // "pottery × hospital" style crosses from minting multi-topic demand.
        bestAffinity = 'reasonable';
      }
      continue;
    }

    // Writing tools: allow on scroll/ink topics even with generic "tool" tag
    if (cluster.id === 'writing-scroll' && domainMatch) {
      bestAffinity = 'reasonable';
      continue;
    }

    if (cluster.allowDomainTopicReuse && domainMatch) {
      bestAffinity = 'reasonable';
      continue;
    }

    // Narrow clusters without reuse: only if a non-generic tag also hits the topic
    if (specificTags.some((t) => toks.has(t) || topicNorm.includes(t))) {
      return 'strong';
    }
  }
  if (bestAffinity) return bestAffinity;

  // 4) Topic contains domain label (castle, tools, …) + concept from that domain
  //    → reasonable only when label is specific (>3 chars) and not a huge dump signal
  for (const label of domainLabels || []) {
    const lab = normalize(label);
    if (lab.length < 4) continue;
    if (topicNorm.includes(lab) && domainId) {
      // Still weak if the only link is domain membership — bank sweep abuse.
      // Mark weak so it does NOT count toward demand.
      return 'weak';
    }
  }

  // 5) Same-domain co-occurrence with zero lexical/affinity link → weak (not demand)
  if (domainId) return 'weak';

  return 'invalid';
}

export function isValidProvenance(grade) {
  return grade === 'strong' || grade === 'reasonable';
}

/**
 * Pick the best home topic inside a domain for a concept (for bank sweep).
 * Returns null if no strong/reasonable topic exists.
 */
export function bestValidHomeTopic(concept, domain) {
  const topics = domain?.topics || [];
  let best = null;
  let bestGrade = null;
  const rank = { strong: 2, reasonable: 1 };
  for (const topic of topics) {
    const grade = classifyConceptTopicPair({
      word: concept.word,
      topic,
      tags: concept.tags || [],
      domainId: domain.id,
      domainLabels: domain.labels || [],
    });
    if (!isValidProvenance(grade)) continue;
    if (!best || rank[grade] > rank[bestGrade]) {
      best = topic;
      bestGrade = grade;
    }
  }
  return best ? { topic: best, grade: bestGrade } : null;
}

function unique(arr) {
  return [...new Set(arr)];
}

function finalizeScrub(row, attachments) {
  const validAll = attachments.filter((a) => isValidProvenance(a.grade));

  // Demand credit:
  // - strong always counts
  // - reasonable with lexical overlap counts
  // - other reasonable (domain affinity reuse): at most ONE total
  //   (prevents dual-bank lemmas like mortar from minting fake multi-domain demand)
  const demandTopics = [];
  let affinityCreditUsed = false;
  for (const a of validAll) {
    if (a.grade === 'strong' || hasLexicalOverlap(row.word, a.topic)) {
      demandTopics.push(a);
      continue;
    }
    if (affinityCreditUsed) continue;
    affinityCreditUsed = true;
    demandTopics.push(a);
  }

  const validTopics = unique(demandTopics.map((a) => a.topic));
  const validBase = unique(
    demandTopics.filter((a) => a.kind !== 'cross').map((a) => a.topic)
  );
  const validCross = unique(
    demandTopics.filter((a) => a.kind === 'cross').map((a) => a.topic)
  );
  const validDomains = unique(
    demandTopics.map((a) => a.domainId).filter(Boolean)
  );

  const topicCount = validBase.length + Math.min(2, validCross.length);
  const domainCount = Math.max(validDomains.length, topicCount > 0 ? 1 : 0);

  const allInvalidOrWeak =
    attachments.length > 0 && validAll.length === 0;

  return {
    ...row,
    provenanceGrades: attachments,
    validTopics,
    validTopicExamples: validTopics.slice(0, 5),
    invalidOrWeakTopics: attachments
      .filter((a) => !isValidProvenance(a.grade))
      .map((a) => ({ topic: a.topic, grade: a.grade })),
    topicCountBefore: row.topicCount,
    topicCount,
    domainCount,
    domainIds: validDomains.length ? validDomains : row.domainIds,
    allProvenanceInvalid: allInvalidOrWeak || (attachments.length === 0 && !topicCount),
    broadCategory: pickBroadCategory(validDomains.length ? validDomains : row.domainIds || []),
  };
}

/**
 * Scrub without the broken intermediate — clean entry point.
 */
export function scrubCandidate(row, domainLabelMap = new Map()) {
  const attachments = [];
  const seen = new Set();
  const pushTopic = (topic, kind) => {
    if (!topic || seen.has(topic)) return;
    seen.add(topic);
    const domainIds = row.domainIds?.length ? row.domainIds : [null];
    let grade = 'invalid';
    let usedDomain = domainIds[0] || null;
    for (const dId of domainIds) {
      const g = classifyConceptTopicPair({
        word: row.word,
        topic,
        tags: row.tags || [],
        domainId: dId,
        domainLabels: domainLabelMap.get(dId) || [],
      });
      const rank = { strong: 3, reasonable: 2, weak: 1, invalid: 0 };
      if (rank[g] > rank[grade]) {
        grade = g;
        usedDomain = dId;
      }
      if (g === 'strong') break;
    }
    attachments.push({ topic, kind, grade, domainId: usedDomain });
  };

  for (const t of row.meaningfulBaseTopics || []) pushTopic(t, 'base');
  for (const t of row.meaningfulCrossTopics || []) pushTopic(t, 'cross');
  for (const t of row.topics || []) {
    if (!(row.meaningfulBaseTopics || []).includes(t) &&
        !(row.meaningfulCrossTopics || []).includes(t)) {
      pushTopic(t, 'flavor');
    }
  }

  return finalizeScrub(row, attachments);
}

export function pickBroadCategory(domainIds = []) {
  const cats = new Set();
  for (const id of domainIds) {
    cats.add(BROAD_CATEGORY_BY_DOMAIN[id] || id || 'misc');
  }
  if (cats.size === 0) return 'misc';
  if (cats.size >= 2) return 'multi-domain';
  return [...cats][0];
}

/**
 * Re-score after scrub.
 * score = 30*topicFreq + 25*domainReuse + 15*usefulness + 15*picturable
 *       + 10*hardToSubstitute + 10*breadthBonus
 * Then apply cluster saturation penalty when ranking a list.
 */
export function scoreScrubbedGap(row, maxTopicCount, maxDomainCount = 1) {
  const topicCount = Math.max(0, row.topicCount || 0);
  const domainCount = Math.max(0, row.domainCount || 0);
  if (topicCount < 1) {
    return {
      score: 0,
      topicFreqNorm: 0,
      domainReuseNorm: 0,
      breadthBonus: 0,
    };
  }
  const topicFreqNorm = Math.min(1, topicCount / Math.max(2, maxTopicCount * 0.4));
  const domainReuseNorm =
    domainCount >= 2 ? Math.min(1, domainCount / Math.max(2, maxDomainCount * 0.5)) : 0;
  const breadthBonus =
    row.broadCategory === 'multi-domain' ? 1 : domainCount >= 2 ? 0.6 : 0.15;
  const usefulness = Number(row.usefulness ?? 0.7);
  const picturable = Number(row.picturable ?? 0.9);
  const hardToSubstitute = Number(row.hardToSubstitute ?? 0.45);
  const score =
    30 * topicFreqNorm +
    25 * domainReuseNorm +
    15 * usefulness +
    15 * picturable +
    10 * hardToSubstitute +
    10 * breadthBonus;
  return {
    score: Math.round(score * 100) / 100,
    topicCount,
    domainCount,
    topicFreqNorm: Math.round(topicFreqNorm * 1000) / 1000,
    domainReuseNorm: Math.round(domainReuseNorm * 1000) / 1000,
    breadthBonus,
    usefulness,
    picturable,
    hardToSubstitute,
  };
}

/**
 * Apply modest saturation penalty so one niche (castle, geology…) cannot
 * dominate the entire first wave. Does not remove items.
 */
export function applyClusterSaturation(rankedRows, { penalty = 0.12, startAt = 2 } = {}) {
  const clusterCounts = new Map();
  return rankedRows.map((row) => {
    const cluster = row.broadCategory || 'misc';
    const n = (clusterCounts.get(cluster) || 0) + 1;
    clusterCounts.set(cluster, n);
    let sat = 0;
    if (n > startAt) {
      sat = Math.min(0.45, penalty * (n - startAt));
    }
    const finalScore = Math.round(row.score * (1 - sat) * 100) / 100;
    return {
      ...row,
      clusterSaturationPenalty: sat,
      scoreBeforeSaturation: row.score,
      score: finalScore,
    };
  });
}

/** Niche / specialized if single narrow category and low domain reuse. */
export function isSpecialized(row) {
  if ((row.domainCount || 0) >= 2 || row.broadCategory === 'multi-domain') return false;
  const niche = new Set([
    'history-castle',
    'earth-geology',
    'lab-school',
    'transport-industry',
    'emergency-safety',
  ]);
  if (niche.has(row.broadCategory) && (row.topicCount || 0) <= 2) return true;
  // High hardToSubstitute + single topic → specialized tool/part
  if ((row.hardToSubstitute || 0) >= 0.55 && (row.topicCount || 0) <= 1) return true;
  return (row.topicCount || 0) <= 1 && (row.domainCount || 0) <= 1;
}
