/**
 * Dictionary ∩ pack coverage — honest Manus queue.
 *
 * Exact/hyphen/simple-inflection only. No PACK_ALIASES / PropBank / VocabArt.
 * Canonical file stem must match pack key (or whitelist) for verifiedCovered.
 *
 *   node scripts/dict-pack-coverage.mjs
 *   npm run coverageloop          (defaults here)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  exactPackHit,
  isCanonical,
} from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const OUT_DIR = path.join(ROOT, 'tmp/asset-coverage');

/**
 * score = 40*freqNorm + 25*reuseNorm + 20*usefulness + 10*picturable + 5*simplicity
 */
function gapScore(word, dict) {
  const topicCount = Math.max(1, dict.topicCount || 1);
  const freq = Number(dict.frequency?.[word] || 0);
  const freqNorm = Math.min(1, freq / topicCount);
  const reuseNorm = freq >= 2 ? Math.min(1, freq / Math.max(3, topicCount * 0.15)) : 0;
  const usefulness = Number(dict.usefulness?.[word] ?? (freq > 0 ? 0.7 : 0.5));
  const picturable = Number(dict.picturable?.[word] ?? 1);
  const len = Math.max(1, String(word).length);
  const simplicity = Math.max(0, 1 - (len - 3) / 12);
  const score =
    40 * freqNorm + 25 * reuseNorm + 20 * usefulness + 10 * picturable + 5 * simplicity;
  return {
    score: Math.round(score * 100) / 100,
    freq,
    freqNorm: Math.round(freqNorm * 1000) / 1000,
    reuseNorm: Math.round(reuseNorm * 1000) / 1000,
    usefulness,
    picturable,
    simplicity: Math.round(simplicity * 1000) / 1000,
  };
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  return `${(n * 100).toFixed(1)}%`;
}

export function runDictCoverage({ noHistory = false, out = null } = {}) {
  if (!fs.existsSync(DICT_PATH)) {
    throw new Error(
      `Missing dictionary: ${DICT_PATH} (run node scripts/build-picturable-dictionary.mjs)`
    );
  }
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing pack index: ${INDEX_PATH}`);
  }

  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const words = Array.isArray(dict.words) ? dict.words : [];
  const whitelist = dict.canonicalWhitelist || {};

  const verifiedCovered = [];
  const unverifiedCovered = [];
  const gaps = [];

  for (const word of words) {
    const hit = exactPackHit(index, word);
    if (!hit) {
      const meta = gapScore(word, dict);
      gaps.push({
        word,
        why: 'no-exact-pack',
        artTypeGuess: (dict.picturable?.[word] ?? 1) < 0.5 ? 'person' : 'object',
        ...meta,
      });
      continue;
    }
    const row = {
      word,
      key: hit.key,
      kind: hit.kind,
      file: hit.file,
    };
    if (isCanonical(word, hit, whitelist)) verifiedCovered.push(row);
    else unverifiedCovered.push({ ...row, why: 'non-canonical-file' });
  }

  const total = words.length;
  const verified = verifiedCovered.length;
  const unverified = unverifiedCovered.length;
  const gap = gaps.length;
  const coverageAtDemand = total ? verified / total : null;
  const coverageIncludingUnverified = total ? (verified + unverified) / total : null;

  const rankedGaps = gaps.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    method:
      'Dictionary ∩ pack exact/plural + canonical file stem. Aliases do not count. ' +
      'Headline Coverage@Demand = verifiedCovered / dict size. ' +
      'Source: scripts/data/esl-picturable-dictionary.json (from esl-picturable-source.json).',
    mode: 'dictionary',
    dictionary: {
      path: 'scripts/data/esl-picturable-dictionary.json',
      version: dict.version || 2,
      wordCount: total,
      topicCount: dict.topicCount || null,
    },
    packIndexKeys: Object.keys(index).length,
    global: {
      words: total,
      strong: verified,
      verified,
      unverified,
      ok: unverified,
      gap,
      deny: 0,
      coverageAtDemand,
      coverageIncludingUnverified,
      manusQueueCount: rankedGaps.length,
      manusPicturableCount: rankedGaps.filter((g) => g.artTypeGuess === 'object').length,
    },
    verifiedCovered,
    unverifiedCovered,
    rankedGaps,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = out || path.join(OUT_DIR, 'latest.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

  if (!noHistory) {
    const histLine = JSON.stringify({
      generatedAt,
      mode: 'dictionary',
      global: report.global,
      gapCount: rankedGaps.length,
      out: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    });
    fs.appendFileSync(path.join(OUT_DIR, 'history.jsonl'), histLine + '\n');
  }

  console.log('coverageloop (dictionary ∩ pack, canonical)');
  console.log(`  wrote ${path.relative(ROOT, outPath)}`);
  console.log(
    `  Coverage@Demand (verified): ${pct(coverageAtDemand)}` +
      `  (verified=${verified} unverified=${unverified} gap=${gap} dict=${total} packKeys=${report.packIndexKeys})`
  );
  console.log(`  coverageIncludingUnverified: ${pct(coverageIncludingUnverified)}`);
  console.log(`  Top 100 ranked gaps (priority score):`);
  for (const g of rankedGaps.slice(0, 100)) {
    console.log(
      `    ${g.word}  score=${g.score}  freq=${g.freq}  art=${g.artTypeGuess}`
    );
  }
  if (rankedGaps.length > 100) {
    console.log(`    … +${rankedGaps.length - 100} more in ${path.relative(ROOT, outPath)}`);
  }
  if (unverifiedCovered.length) {
    console.log(`  Unverified covered (${unverifiedCovered.length}):`);
    for (const u of unverifiedCovered.slice(0, 20)) {
      console.log(`    ${u.word} → ${u.key} file=${u.file}`);
    }
  }

  return report;
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    runDictCoverage({ noHistory: process.argv.includes('--no-history') });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
