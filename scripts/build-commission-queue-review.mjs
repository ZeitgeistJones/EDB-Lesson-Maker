/**
 * Review-only: combine coverageloop known gaps + discovery gaps into a
 * teaching-value Manus queue. Does NOT send Manus.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DISC = path.join(ROOT, 'tmp/asset-discovery/latest.json');
const COV = path.join(ROOT, 'tmp/asset-coverage/latest.json');
const DICT = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const OUT_JSON = path.join(ROOT, 'tmp/asset-discovery/commission-queue-review.json');
const OUT_MD = path.join(ROOT, 'tmp/asset-discovery/commission-queue-review.md');

const WEAK_KNOWN = new Set(['kids', 'parents', 'hug', 'circle']);
const WORTHWHILE_KNOWN_BOOST = new Set([
  'lava',
  'kiln',
  'glaze',
  'crater',
  'beacon',
  'cavity',
  'forehead',
  'stitch',
  'locksmith',
  'package',
  'artifact',
]);

function whyHigh(g) {
  const bits = [];
  if ((g.topicCount || 0) >= 2) bits.push(`appears in ${g.topicCount} discovery topics`);
  if ((g.domainCount || 0) >= 2) bits.push(`crosses ${g.domainCount} domains`);
  if ((g.picturable || 0) >= 0.9) bits.push('highly picturable');
  if ((g.hardToSubstitute || 0) >= 0.5) bits.push('hard to substitute with generic art');
  if ((g.usefulness || 0) >= 0.75) bits.push('high ESL usefulness');
  if ((g.tags || []).length) bits.push('tags: ' + g.tags.slice(0, 4).join('/'));
  return bits.join('; ') || 'scored from reuse/usefulness/picturable';
}

const d = JSON.parse(fs.readFileSync(DISC, 'utf8'));
const c = JSON.parse(fs.readFileSync(COV, 'utf8'));
const dictWords = JSON.parse(fs.readFileSync(DICT, 'utf8')).words.map((w) =>
  String(w).toLowerCase()
);
const dict = new Set(dictWords);

const nr = d.buckets.needsReview || [];
const nrOut = nr.filter((x) => !dict.has(String(x.word).toLowerCase()));
const nrIn = nr.filter((x) => dict.has(String(x.word).toLowerCase()));

const knownGaps = (c.rankedGaps || []).map((g) => {
  const weak = WEAK_KNOWN.has(g.word);
  const boost = WORTHWHILE_KNOWN_BOOST.has(g.word);
  return {
    source: 'knownGap',
    word: g.word,
    priorityScore: g.score,
    topicCount: g.freq || 0,
    topics: [],
    teachingNotes: weak
      ? 'deprioritized: weak/generic social or shape lemma — not a strong Manus spend'
      : boost
        ? 'worthwhile known gap: concrete picturable for specialty lessons'
        : 'known-dict gap; low curated demand frequency',
    worthwhile: !weak,
    // Discovery scores ~38–78; known ~23–30. Boost concrete known gaps into mid band
    // so lava/kiln can compete; keep weak known far below.
    commissionScore: weak
      ? Math.round(g.score * 0.35 * 100) / 100
      : Math.round((g.score + (boost ? 18 : 5)) * 100) / 100,
  };
});

const discoveryGaps = (d.rankedDiscoveryGaps || []).map((g) => ({
  source: 'newDiscoveryGap',
  word: g.word,
  priorityScore: g.score,
  topicCount: g.topicCount,
  topics: (g.topics || []).slice(0, 5),
  teachingNotes: whyHigh(g),
  worthwhile: (g.score || 0) >= 40 && (g.picturable || 0) >= 0.75,
  commissionScore: g.score,
}));

const combined = [
  ...discoveryGaps.filter((x) => x.worthwhile),
  ...knownGaps.filter((x) => x.worthwhile),
].sort(
  (a, b) =>
    b.commissionScore - a.commissionScore || a.word.localeCompare(b.word)
);

const top200 = (d.rankedDiscoveryGaps || []).slice(0, 200).map((g) => ({
  word: g.word,
  priorityScore: g.score,
  topicCount: g.topicCount,
  exampleTopics: (g.topics || []).slice(0, 4),
  whyHigh: whyHigh(g),
  domains: g.domainIds || [],
  picturable: g.picturable,
}));

const stats = {
  generatedAt: new Date().toISOString(),
  note: 'Review only — no Manus sent.',
  coverageloop: {
    dict: c.global?.dictionarySize ?? dictWords.length,
    verified: c.global?.verifiedCovered ?? c.verifiedCovered?.length,
    knownUniverseGaps: (c.rankedGaps || []).length,
    coveragePct: c.global?.coverageVerifiedPct ?? c.global?.coverageVerified,
  },
  discovery: {
    totalUniqueConcepts: d.totals.candidateConcepts,
    alreadyInCuratedDictionary:
      d.totals.alreadyKnownCovered + d.totals.knownGap + nrIn.length,
    outsideCuratedDictionary:
      d.totals.newCoveredConcept + d.totals.newDiscoveryGap + nrOut.length,
    outsideBreakdown: {
      verifiedPackArt: d.totals.newCoveredConcept,
      noDedicatedPackArt: d.totals.newDiscoveryGap,
      needsReview: nrOut.length,
    },
    bucketCounts: {
      alreadyKnownCovered: d.totals.alreadyKnownCovered,
      knownGap_inDiscoveryPool: d.totals.knownGap,
      newCoveredConcept: d.totals.newCoveredConcept,
      newDiscoveryGap: d.totals.newDiscoveryGap,
      needsReview_all: d.totals.needsReview,
      needsReview_inDict: nrIn.length,
      needsReview_outsideDict: nrOut.length,
    },
    clarification: {
      knownGap_coverageloop: (c.rankedGaps || []).length,
      knownGap_discoveryBucket: d.totals.knownGap,
      knownGap_discoveryWords: (d.buckets.knownGap || []).map((x) => x.word),
    },
  },
};

const out = {
  stats,
  A_allKnownGaps: (c.rankedGaps || []).map((g) => ({
    word: g.word,
    priorityScore: g.score,
    freq: g.freq,
    artTypeGuess: g.artTypeGuess,
    worthwhile: !WEAK_KNOWN.has(g.word),
  })),
  B_top200_newDiscoveryGap: top200,
  C_combinedCommissionQueue: combined.map((x, i) => ({ rank: i + 1, ...x })),
  deprioritizedKnownGaps: knownGaps.filter((x) => !x.worthwhile),
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

const lines = [];
lines.push('# Asset gap picture — review before Manus');
lines.push('');
lines.push('_No Manus jobs sent. Generated ' + out.stats.generatedAt + '_');
lines.push('');
lines.push('## Exact numbers');
lines.push('');
lines.push('| # | Metric | Value |');
lines.push('|---|---|---:|');
lines.push(
  `| 1 | Total unique concepts (discovery) | **${stats.discovery.totalUniqueConcepts}** |`
);
lines.push(
  `| 2 | Already in curated dictionary | **${stats.discovery.alreadyInCuratedDictionary}** |`
);
lines.push(
  `| 3 | Outside curated dictionary | **${stats.discovery.outsideCuratedDictionary}** |`
);
lines.push(
  `| 4a | Outside + verified pack art | **${stats.discovery.outsideBreakdown.verifiedPackArt}** |`
);
lines.push(
  `| 4b | Outside + no dedicated pack art | **${stats.discovery.outsideBreakdown.noDedicatedPackArt}** |`
);
lines.push(
  `| 4c | Outside + needsReview | **${stats.discovery.outsideBreakdown.needsReview}** |`
);
lines.push(`| 5 | newDiscoveryGap | **${d.totals.newDiscoveryGap}** |`);
lines.push(
  `| 6a | knownGap (coverageloop / full dict) | **${(c.rankedGaps || []).length}** |`
);
lines.push(
  `| 6b | knownGap (discovery pool only) | **${d.totals.knownGap}** (${stats.discovery.clarification.knownGap_discoveryWords.join(', ')}) |`
);
lines.push('');
lines.push('### A. All known gaps (coverageloop priority)');
lines.push('');
lines.push('| word | priority | worthwhile? |');
lines.push('|---|---:|---|');
for (const g of out.A_allKnownGaps) {
  lines.push(
    `| ${g.word} | ${g.priorityScore} | ${g.worthwhile ? 'yes' : 'NO — deprioritize'} |`
  );
}
lines.push('');
lines.push('### B. Top 200 newDiscoveryGap');
lines.push('');
lines.push('| score | word | topics | example topics | why |');
lines.push('|---:|---|---:|---|---|');
for (const g of top200) {
  lines.push(
    `| ${g.priorityScore} | ${g.word} | ${g.topicCount} | ${g.exampleTopics.join('; ')} | ${g.whyHigh} |`
  );
}
lines.push('');
lines.push(
  '### C. Combined commission queue (teaching value, not dict membership)'
);
lines.push('');
lines.push(
  'Worthwhile known gaps included; kids/parents/hug/circle demoted out of worthwhile set.'
);
lines.push('');
lines.push('| rank | score | word | source | topics | notes |');
lines.push('|---:|---:|---|---|---:|---|');
for (const g of out.C_combinedCommissionQueue) {
  lines.push(
    `| ${g.rank} | ${g.commissionScore} | ${g.word} | ${g.source} | ${g.topicCount} | ${(g.teachingNotes || '').replace(/\|/g, '/')} |`
  );
}
lines.push('');
lines.push('### Deprioritized known gaps (not in combined worthwhile queue)');
for (const g of out.deprioritizedKnownGaps) {
  lines.push(`- ${g.word} (coverageloop ${g.priorityScore})`);
}

fs.writeFileSync(OUT_MD, lines.join('\n'));
console.log(JSON.stringify(stats, null, 2));
console.log('combined queue length', combined.length);
console.log(
  'known in combined:',
  combined.filter((x) => x.source === 'knownGap').map((x) => `${x.word}@${x.commissionScore}`)
);
console.log('Wrote', OUT_MD);
