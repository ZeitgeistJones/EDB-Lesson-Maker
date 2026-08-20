/**
 * Build scripts/data/esl-picturable-dictionary.json from curated source only.
 * No quote-harvest from .mjs files.
 *
 *   node scripts/build-picturable-dictionary.mjs
 *   (source: scripts/data/esl-picturable-source.json — seed via seed-picturable-source.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(ROOT, 'scripts/data/esl-picturable-source.json');
const OUT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(
      `Missing ${SOURCE_PATH}. Run: node scripts/seed-picturable-source.mjs`
    );
  }
  const source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const deny = new Set((source.deny || []).map((w) => String(w).toLowerCase().trim()));
  const topics = Array.isArray(source.topics) ? source.topics : [];
  const extras = Array.isArray(source.extras) ? source.extras : [];

  /** @type {Map<string, { topics: Set<string>, fromExtra: boolean }>} */
  const map = new Map();

  function touch(word, topicId, fromExtra) {
    const w = String(word || '')
      .toLowerCase()
      .trim();
    if (!w || deny.has(w)) return;
    // Reject metadata-shaped strings
    if (w.includes('demand') || w.startsWith('a day at') || w.includes('asset-coverage')) return;
    let row = map.get(w);
    if (!row) {
      row = { topics: new Set(), fromExtra: false };
      map.set(w, row);
    }
    if (topicId) row.topics.add(topicId);
    if (fromExtra) row.fromExtra = true;
  }

  for (const t of topics) {
    const id = String(t.id || 'topic');
    for (const w of t.words || []) touch(w, id, false);
  }
  for (const w of extras) touch(w, null, true);

  const topicCount = Math.max(1, topics.length);
  const words = [...map.keys()].sort((a, b) => a.localeCompare(b));
  const frequency = {};
  const usefulness = { ...(source.usefulness || {}) };
  const picturable = { ...(source.picturable || {}) };

  for (const w of words) {
    const row = map.get(w);
    const hits = row.topics.size;
    frequency[w] = hits;
    if (usefulness[w] == null) {
      usefulness[w] = hits > 0 ? 0.7 : 0.5;
    }
    if (picturable[w] == null) {
      picturable[w] = 1.0;
    }
  }

  const out = {
    name: 'esl-picturable-dictionary',
    version: 2,
    note:
      'Built from scripts/data/esl-picturable-source.json only. Exact pack key required for coverage; aliases do not count.',
    sourcePath: 'scripts/data/esl-picturable-source.json',
    sourceVersion: source.version || 1,
    topicCount,
    wordCount: words.length,
    words,
    frequency,
    usefulness,
    picturable,
    canonicalWhitelist: source.canonicalWhitelist || {},
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `wrote ${path.relative(ROOT, OUT_PATH)} — ${words.length} words from ${topicCount} topics (+ extras)`
  );
}

main();
