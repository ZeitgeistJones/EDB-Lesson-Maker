/**
 * Merge tmp/asset-coverage/shard-*.json → latest.json + history.jsonl line.
 *
 *   npm run coverageloop:merge
 *   node scripts/merge-asset-coverage.mjs --glob=tmp/asset-coverage/shard-*.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'asset-coverage');

function parseArgs(argv) {
  let globDir = OUT_DIR;
  for (const a of argv) {
    if (a.startsWith('--dir=')) globDir = path.resolve(ROOT, a.slice(6));
  }
  return { globDir };
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  return `${(n * 100).toFixed(1)}%`;
}

function coverageRatio(counts) {
  const denom = counts.words - counts.deny;
  if (denom <= 0) return null;
  return (counts.strong + counts.ok) / denom;
}

function main() {
  const { globDir } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(globDir)) {
    console.error('No dir:', path.relative(ROOT, globDir));
    process.exit(1);
  }
  const files = fs
    .readdirSync(globDir)
    .filter((f) => /^shard-\d+\.json$/i.test(f))
    .sort((a, b) => {
      const na = Number(/^shard-(\d+)/i.exec(a)[1]);
      const nb = Number(/^shard-(\d+)/i.exec(b)[1]);
      return na - nb;
    })
    .map((f) => path.join(globDir, f));

  if (!files.length) {
    console.error('No shard-*.json in', path.relative(ROOT, globDir));
    process.exit(1);
  }

  const shards = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const topicMap = new Map();
  const gapMap = new Map();
  const global = { words: 0, strong: 0, ok: 0, gap: 0, deny: 0 };
  const shardMeta = [];

  for (let i = 0; i < shards.length; i++) {
    const s = shards[i];
    shardMeta.push({
      file: path.basename(files[i]),
      shard: s.shard,
      topicIds: s.topicIds,
      coverageAtDemand: s.global && s.global.coverageAtDemand,
    });
    if (s.global) {
      for (const k of ['words', 'strong', 'ok', 'gap', 'deny']) {
        global[k] += Number(s.global[k] || 0);
      }
    }
    for (const t of s.topics || []) {
      if (!topicMap.has(t.id)) topicMap.set(t.id, t);
    }
    for (const g of s.rankedGaps || []) {
      const prev = gapMap.get(g.word);
      if (!prev) {
        gapMap.set(g.word, { ...g, topics: [...(g.topics || [])], hits: g.hits || 1 });
      } else {
        prev.hits = (prev.hits || 1) + (g.hits || 1);
        for (const t of g.topics || []) {
          if (!prev.topics.includes(t)) prev.topics.push(t);
        }
      }
    }
  }

  const rankedGaps = [...gapMap.values()].sort(
    (a, b) => (b.hits || 0) - (a.hits || 0) || a.word.localeCompare(b.word)
  );
  const topics = [...topicMap.values()];
  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    method: 'Merged coverageloop shards (VocabArt.planFor / PropBank). Identify-only.',
    mergedFrom: shardMeta,
    shard: null,
    topicIds: topics.map((t) => t.id),
    global: { ...global, coverageAtDemand: coverageRatio(global) },
    topics,
    rankedGaps,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const latest = path.join(OUT_DIR, 'latest.json');
  fs.writeFileSync(latest, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.appendFileSync(
    path.join(OUT_DIR, 'history.jsonl'),
    JSON.stringify({
      generatedAt,
      merged: true,
      shardFiles: shardMeta.map((m) => m.file),
      global: report.global,
      topicCoverage: Object.fromEntries(
        topics.map((t) => [t.id, t.coverageAtDemand])
      ),
      gapCount: rankedGaps.length,
      out: 'tmp/asset-coverage/latest.json',
    }) + '\n',
    'utf8'
  );

  console.log('coverageloop merge');
  console.log(`  shards: ${files.map((f) => path.basename(f)).join(', ')}`);
  console.log(`  wrote ${path.relative(ROOT, latest)}`);
  console.log(
    `  Coverage@Demand global: ${pct(report.global.coverageAtDemand)}` +
      `  (strong=${global.strong} ok=${global.ok} gap=${global.gap} deny=${global.deny})`
  );
  console.log(`  topics=${topics.length} rankedGaps=${rankedGaps.length}`);
}

main();
