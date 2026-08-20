/**
 * Scrub discovery + known gaps into three Manus-ready queues.
 * Review only — does NOT send Manus.
 *
 *   npm run discovery:scrub
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyClusterSaturation,
  isSpecialized,
  pickBroadCategory,
  scrubCandidate,
  scoreScrubbedGap,
} from './lib/discovery-semantic-provenance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISC = path.join(ROOT, 'tmp/asset-discovery/latest.json');
const COV = path.join(ROOT, 'tmp/asset-coverage/latest.json');
const UNIVERSE = path.join(ROOT, 'scripts/data/discovery-universe');
const OUT_JSON = path.join(ROOT, 'tmp/asset-discovery/scrubbed-queues.json');
const OUT_MD = path.join(ROOT, 'tmp/asset-discovery/scrubbed-queues.md');

const WEAK_KNOWN = new Set(['kids', 'parents', 'hug', 'circle']);

function loadDomainLabels() {
  const map = new Map();
  if (!fs.existsSync(UNIVERSE)) return map;
  for (const f of fs.readdirSync(UNIVERSE)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(UNIVERSE, f), 'utf8'));
    if (!raw.id) continue;
    map.set(raw.id, [...(raw.labels || []), raw.id]);
  }
  return map;
}

function formatRow(row, source) {
  return {
    concept: row.word,
    finalPriorityScore: row.score,
    scoreBeforeSaturation: row.scoreBeforeSaturation ?? row.score,
    validTopicCount: row.topicCount,
    validExampleTopics: (row.validTopics || row.topics || []).slice(0, 5),
    broadCategory: row.broadCategory || 'misc',
    source,
    domainIds: row.domainIds || [],
    clusterSaturationPenalty: row.clusterSaturationPenalty || 0,
  };
}

function main() {
  if (!fs.existsSync(DISC)) {
    console.error('Missing tmp/asset-discovery/latest.json — run npm run discovery first');
    process.exit(1);
  }
  if (!fs.existsSync(COV)) {
    console.error('Missing tmp/asset-coverage/latest.json — run npm run coverageloop first');
    process.exit(1);
  }

  const d = JSON.parse(fs.readFileSync(DISC, 'utf8'));
  const c = JSON.parse(fs.readFileSync(COV, 'utf8'));
  const domainLabelMap = loadDomainLabels();

  // Pre-scrub snapshot for delta report (from history of ranked gaps before this run
  // is already scrubbed in latest.json). Compare topicCountBeforeScrub when present.
  const substantialChanges = [];
  for (const g of d.rankedDiscoveryGaps || []) {
    const before = g.topicCountBeforeScrub;
    const after = g.topicCount;
    if (before == null) continue;
    if (before !== after || Math.abs((g.score || 0) - 50) > 0) {
      // Prefer explicit provenance scrub deltas from report
    }
  }
  for (const delta of d.provenance?.scrubDeltas || []) {
    substantialChanges.push({
      concept: delta.word,
      topicCountBefore: delta.topicCountBefore,
      topicCountAfter: delta.topicCountAfter,
      droppedTopics: delta.droppedTopics,
      change: 'topicCount',
    });
  }

  // Discovery gaps already scrubbed in latest.json — split broad vs specialized
  let discoveryRows = (d.rankedDiscoveryGaps || []).map((g) => ({
    ...g,
    broadCategory: g.broadCategory || pickBroadCategory(g.domainIds || []),
    source: 'discovery',
  }));

  // Known gaps from coverageloop — exclude weak social/shape lemmas
  const knownIncluded = [];
  const knownExcluded = [];
  for (const g of c.rankedGaps || []) {
    if (WEAK_KNOWN.has(g.word)) {
      knownExcluded.push({
        concept: g.word,
        coverageloopScore: g.score,
        reason: 'weak-known-gap: social/shape lemma not worth dedicated Manus art',
      });
      continue;
    }
    const row = {
      word: g.word,
      topicCount: Math.max(1, g.freq || 1),
      domainCount: 1,
      topics: [],
      validTopics: [],
      usefulness: g.usefulness ?? 0.7,
      picturable: g.picturable ?? 1,
      hardToSubstitute: 0.5,
      tags: [],
      domainIds: [],
      broadCategory: 'known-dict',
      source: 'known',
    };
    knownIncluded.push(row);
  }

  const maxTopic = Math.max(
    1,
    ...discoveryRows.map((r) => r.topicCount || 1),
    ...knownIncluded.map((r) => r.topicCount || 1)
  );
  const maxDomain = Math.max(
    1,
    ...discoveryRows.map((r) => r.domainCount || 1),
    1
  );

  const scoredKnown = knownIncluded.map((g) => {
    const meta = scoreScrubbedGap(g, maxTopic, maxDomain);
    // modest known-gap placement — must not beat multi-topic broad discovery
    const score = Math.round((meta.score * 0.85 + 8) * 100) / 100;
    return { ...g, ...meta, score };
  });

  let combined = applyClusterSaturation(
    [...discoveryRows, ...scoredKnown].sort((a, b) => b.score - a.score)
  ).sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  const highConfidenceBroad = [];
  const highConfidenceSpecialized = [];
  for (const row of combined) {
    const formatted = formatRow(row, row.source || 'discovery');
    const nicheCats = new Set([
      'history-castle',
      'earth-geology',
      'lab-school',
      'transport-industry',
      'emergency-safety',
      'arts-stage',
    ]);
    const broadCats = new Set([
      'animals-nature',
      'food-kitchen',
      'body-health',
      'clothing-craft',
      'tools-trades',
      'travel-transport',
      'nature-weather',
      'multi-domain',
      'known-dict',
    ]);
    if (row.source === 'known') {
      highConfidenceBroad.push(formatted);
    } else if (broadCats.has(row.broadCategory) && !isSpecialized(row)) {
      highConfidenceBroad.push(formatted);
    } else if (nicheCats.has(row.broadCategory) || isSpecialized(row)) {
      highConfidenceSpecialized.push(formatted);
    } else if ((row.topicCount || 0) >= 2) {
      highConfidenceBroad.push(formatted);
    } else {
      highConfidenceSpecialized.push(formatted);
    }
  }

  // needsReview: discovery bucket + provenance invalids already there
  const needsReview = (d.buckets?.needsReview || []).map((r) => ({
    concept: r.word,
    why: r.why,
    topics: r.topics || [],
    invalidOrWeakTopics: r.invalidOrWeakTopics || [],
  }));

  // Also flag discovery gaps that still look suspicious (topicCount 0 shouldn't be in ranked)
  for (const g of discoveryRows) {
    if ((g.topicCount || 0) < 1) {
      needsReview.push({
        concept: g.word,
        why: 'zero-valid-topics-after-scrub',
        topics: g.topics || [],
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    note: 'Review only — no Manus sent. Semantic provenance scrub applied.',
    totals: {
      highConfidenceBroad: highConfidenceBroad.length,
      highConfidenceSpecialized: highConfidenceSpecialized.length,
      needsReview: needsReview.length,
      knownGapsIncluded: knownIncluded.map((k) => k.word),
      knownGapsExcluded: knownExcluded.map((k) => k.concept),
    },
    substantialProvenanceChanges: (d.provenance?.scrubDeltas || []).map((delta) => ({
      concept: delta.word,
      topicCountBefore: delta.topicCountBefore,
      topicCountAfter: delta.topicCountAfter,
      dropped: (delta.droppedTopics || []).slice(0, 6),
    })),
    highConfidenceBroad,
    highConfidenceSpecialized,
    needsReview,
    knownGapsExcluded: knownExcluded,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n');

  const lines = [];
  lines.push('# Scrubbed Manus queues (review only)');
  lines.push('');
  lines.push(`_Generated ${report.generatedAt}. No Manus sent._`);
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`- **highConfidenceBroad:** ${highConfidenceBroad.length}`);
  lines.push(`- **highConfidenceSpecialized:** ${highConfidenceSpecialized.length}`);
  lines.push(`- **needsReview:** ${needsReview.length}`);
  lines.push(`- **known included:** ${knownIncluded.map((k) => k.word).join(', ') || '(none)'}`);
  lines.push(`- **known excluded:** ${knownExcluded.map((k) => k.concept).join(', ') || '(none)'}`);
  lines.push('');
  lines.push('## Top 100 broad');
  lines.push('');
  lines.push('| rank | score | concept | validTopics | category | source | example topics |');
  lines.push('|---:|---:|---|---:|---|---|---|');
  highConfidenceBroad.slice(0, 100).forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.finalPriorityScore} | ${r.concept} | ${r.validTopicCount} | ${r.broadCategory} | ${r.source} | ${(r.validExampleTopics || []).join('; ')} |`
    );
  });
  lines.push('');
  lines.push('## Specialized queue');
  lines.push('');
  lines.push('| rank | score | concept | validTopics | category | source | example topics |');
  lines.push('|---:|---:|---|---:|---|---|---|');
  highConfidenceSpecialized.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.finalPriorityScore} | ${r.concept} | ${r.validTopicCount} | ${r.broadCategory} | ${r.source} | ${(r.validExampleTopics || []).join('; ')} |`
    );
  });
  lines.push('');
  lines.push('## Substantial provenance changes (topicCount before → after)');
  lines.push('');
  for (const ch of report.substantialProvenanceChanges.slice(0, 60)) {
    lines.push(
      `- **${ch.concept}**: ${ch.topicCountBefore} → ${ch.topicCountAfter}` +
        (ch.dropped?.length
          ? ` (dropped: ${ch.dropped.map((x) => `${x.topic}:${x.grade}`).join(', ')})`
          : '')
    );
  }
  lines.push('');
  lines.push('## needsReview sample');
  for (const r of needsReview.slice(0, 40)) {
    lines.push(`- ${r.concept} — ${r.why}`);
  }

  fs.writeFileSync(OUT_MD, lines.join('\n') + '\n');
  console.log(JSON.stringify(report.totals, null, 2));
  console.log('substantialChanges', report.substantialProvenanceChanges.length);
  console.log('Wrote', OUT_MD);
  console.log('\nTop 15 broad:');
  highConfidenceBroad.slice(0, 15).forEach((r, i) => {
    console.log(
      String(i + 1).padStart(3),
      String(r.finalPriorityScore).padStart(5),
      r.concept,
      `t=${r.validTopicCount}`,
      r.broadCategory,
      r.source,
      (r.validExampleTopics || []).slice(0, 2).join('; ')
    );
  });
}

main();
