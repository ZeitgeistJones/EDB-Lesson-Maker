/**
 * Split Wave2 verbs into Group1 (kept168 + approved60) and Group2 (other review).
 * Exact pack dedupe only. No re-filter. No Manus send.
 *
 *   node scripts/cefrj-verb-wave2-batches.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize, verifiedPackHit, slug } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tmp/cefrj-manus');
const WAVE = path.join(OUT, 'verbs-wave2-expanded');
const BATCH = path.join(OUT, 'verbs-wave2-batches');

const APPROVED60 = `
accompany advance aid announce annoy apologize approach arrange assist attract
avoid babysit bless browse bully cancel capture cheat clear commute compete
conceal confront disturb donate download earn edit enclose equip exhibit extend
forbid illustrate install interrupt introduce investigate launch locate
manufacture merge operate organize praise prevent produce protect protest
rebuild replace restore teach thank threaten transfer transform transport
withdraw witness
`
  .split(/\s+/)
  .map(normalize)
  .filter(Boolean);

function loadLines(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => normalize(l))
    .filter(Boolean);
}

function main() {
  const index = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/assets/07_vocab-pack/index.json'), 'utf8')
  );
  let whitelist = {};
  const dictPath = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
  if (fs.existsSync(dictPath)) {
    whitelist = JSON.parse(fs.readFileSync(dictPath, 'utf8')).canonicalWhitelist || {};
  }

  const kept168 = loadLines(path.join(OUT, 'manus-verbs-wave2.txt'));
  const review103 = loadLines(path.join(WAVE, 'manus-verbs-review.txt'));

  // Levels from CEFR-J gaps CSV only (avoid loading huge companion.json)
  const levelByWord = new Map();
  const gapsCsv = path.join(ROOT, 'scripts/data/cefrj/cefrj-verb-gaps.csv');
  for (const line of fs.readFileSync(gapsCsv, 'utf8').split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [word, , level] = line.split(',');
    const w = normalize(word);
    const lv = String(level || '').trim().toUpperCase();
    if (w && lv) levelByWord.set(w, lv);
  }

  const approvedSet = new Set(APPROVED60);
  const reviewSet = new Set(review103);
  const approvedNotInReview = APPROVED60.filter((w) => !reviewSet.has(w));
  const otherReview = review103.filter((w) => !approvedSet.has(w));

  const g1Origins = new Map();
  const g1Words = [];
  const skippedMerge = [];
  for (const w of kept168) {
    if (!g1Origins.has(w)) {
      g1Origins.set(w, 'kept168');
      g1Words.push(w);
    } else {
      skippedMerge.push({ word: w, reason: 'duplicate_in_kept168', origin: 'kept168' });
    }
  }
  for (const w of APPROVED60) {
    if (g1Origins.has(w)) {
      skippedMerge.push({ word: w, reason: 'already_in_kept168', origin: 'approved60' });
      continue;
    }
    g1Origins.set(w, 'approved60');
    g1Words.push(w);
  }

  function packDedupe(words, originFn) {
    const out = [];
    const skipped = [];
    const seen = new Set();
    for (const w of words) {
      const origin = typeof originFn === 'function' ? originFn(w) : originFn;
      if (seen.has(w)) {
        skipped.push({ word: w, reason: 'duplicate_in_queue', origin });
        continue;
      }
      seen.add(w);
      const hit = verifiedPackHit(index, w, whitelist);
      if (hit?.verified) {
        skipped.push({ word: w, reason: 'already_in_pack', origin, key: hit.key });
        continue;
      }
      out.push({
        word: w,
        key: slug(w),
        cefr: levelByWord.get(w) || '',
        origin,
      });
    }
    return { out, skipped };
  }

  const g1 = packDedupe(g1Words, (w) => g1Origins.get(w));
  g1.skipped = [...skippedMerge, ...g1.skipped];
  const g2 = packDedupe(otherReview, () => 'review_other');

  fs.mkdirSync(BATCH, { recursive: true });
  fs.writeFileSync(
    path.join(BATCH, 'group1-primary.txt'),
    g1.out.map((r) => r.word).join('\n') + '\n'
  );
  fs.writeFileSync(
    path.join(BATCH, 'group2-other.txt'),
    g2.out.map((r) => r.word).join('\n') + (g2.out.length ? '\n' : '')
  );
  fs.writeFileSync(
    path.join(BATCH, 'wave-2-other.txt'),
    g2.out.map((r) => r.word).join('\n') + (g2.out.length ? '\n' : '')
  );
  fs.writeFileSync(
    path.join(OUT, 'manus-verbs-wave2-primary.txt'),
    g1.out.map((r) => r.word).join('\n') + '\n'
  );
  fs.writeFileSync(
    path.join(OUT, 'manus-verbs-wave2-other.txt'),
    g2.out.map((r) => r.word).join('\n') + (g2.out.length ? '\n' : '')
  );

  const meta = {
    generatedAt: new Date().toISOString(),
    note: 'No re-filter. Group1 = kept168 + approved60. Group2 = remaining review. Exact pack dedupe only. Manus not sent.',
    inputs: {
      kept168: kept168.length,
      approved60: APPROVED60.length,
      review103: review103.length,
      otherReview: otherReview.length,
      approvedNotInReview,
    },
    group1: {
      count: g1.out.length,
      byOrigin: {
        kept168: g1.out.filter((r) => r.origin === 'kept168').length,
        approved60: g1.out.filter((r) => r.origin === 'approved60').length,
      },
      skipped: g1.skipped,
      rows: g1.out,
    },
    group2: {
      count: g2.out.length,
      origin: 'review_other',
      skipped: g2.skipped,
      rows: g2.out,
    },
  };

  fs.writeFileSync(path.join(BATCH, 'batches-meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(BATCH, 'summary.md'),
    [
      '# Verb Wave 2 batches',
      '',
      `- **Group 1 (primary):** **${g1.out.length}** (kept168: ${meta.group1.byOrigin.kept168}, approved60: ${meta.group1.byOrigin.approved60})`,
      `- **Group 2 (other / wave-2-other):** **${g2.out.length}**`,
      `- Skipped Group1: ${g1.skipped.length}`,
      `- Skipped Group2: ${g2.skipped.length}`,
      '',
      'Files:',
      '- `tmp/cefrj-manus/manus-verbs-wave2-primary.txt`',
      '- `tmp/cefrj-manus/manus-verbs-wave2-other.txt`',
      '- `tmp/cefrj-manus/verbs-wave2-batches/`',
      '',
      'Manus: **not sent**',
      '',
    ].join('\n')
  );

  console.log(
    JSON.stringify(
      {
        group1: meta.group1.count,
        group1_kept168: meta.group1.byOrigin.kept168,
        group1_approved60: meta.group1.byOrigin.approved60,
        group2: meta.group2.count,
        skippedG1: g1.skipped,
        skippedG2: g2.skipped,
        approvedNotInReview,
      },
      null,
      2
    )
  );
}

main();
