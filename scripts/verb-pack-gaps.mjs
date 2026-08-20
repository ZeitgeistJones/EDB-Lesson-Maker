/**
 * Picturable ESL verb pack gaps.
 *
 * Compares curated base-form verbs (children → intermediate) against the vocab
 * pack with the same strict exact/canonical matching as coverageloop.
 *
 * Source list: scripts/data/picturable-verbs.txt (one base-form verb per line)
 *
 *   node scripts/verb-pack-gaps.mjs
 *
 * Writes under tmp/asset-discovery/:
 *   picturable-verbs-candidates.txt
 *   picturable-verbs-missing.txt
 *   picturable-verbs-summary.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, verifiedPackHit } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const VERBS_PATH = path.join(ROOT, 'scripts/data/picturable-verbs.txt');
const OUT_DIR = path.join(ROOT, 'tmp/asset-discovery');

function loadVerbs(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing verb list: ${filePath}`);
  }
  const set = new Set();
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const raw = line.replace(/#.*$/, '').trim();
    if (!raw) continue;
    const n = normalize(raw);
    if (!n || n.includes(' ')) continue;
    set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Light gerund / agent forms — informational only; never counted as covered. */
function relatedPackForms(index, word) {
  const related = [];
  let gerund;
  if (word.endsWith('ie')) gerund = `${word.slice(0, -2)}ying`;
  else if (word.endsWith('e') && !word.endsWith('ee') && !word.endsWith('ye')) {
    gerund = `${word.slice(0, -1)}ing`;
  } else if (/[^aeiou][aeiou][^aeiou]$/.test(word) && word.length >= 3) {
    gerund = `${word}${word.slice(-1)}ing`;
  } else {
    gerund = `${word}ing`;
  }
  const forms = [gerund, `${word}er`, word.endsWith('e') ? `${word}r` : null, `${word}s`];
  for (const form of forms.filter(Boolean)) {
    if (index[form]?.file) related.push(form);
  }
  return related;
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing pack index: ${INDEX_PATH}`);
  }

  const candidates = loadVerbs(VERBS_PATH);
  if (candidates.length < 300 || candidates.length > 500) {
    console.warn(
      `NOTE: ${candidates.length} unique verbs (guidance 300–500) — proceeding with curated set`
    );
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  let whitelist = {};
  let dictSet = new Set();
  if (fs.existsSync(DICT_PATH)) {
    const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
    whitelist = dict.canonicalWhitelist || {};
    dictSet = new Set((dict.words || []).map((w) => normalize(w)));
  }

  const verified = [];
  const unverified = [];
  const missing = [];
  const inDictButMissingPack = [];
  const relatedFormsInPack = [];

  for (const word of candidates) {
    const hit = verifiedPackHit(index, word, whitelist);
    if (hit?.verified) {
      verified.push({ word, key: hit.key, file: hit.file, kind: hit.kind });
      continue;
    }
    if (hit && hit.verified === false) {
      unverified.push({ word, key: hit.key, file: hit.file, kind: hit.kind });
      continue;
    }
    missing.push(word);
    if (dictSet.has(word)) {
      inDictButMissingPack.push(word);
    }
    const related = relatedPackForms(index, word);
    if (related.length) {
      relatedFormsInPack.push({ word, relatedPackKeys: related });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const candidatesPath = path.join(OUT_DIR, 'picturable-verbs-candidates.txt');
  const missingPath = path.join(OUT_DIR, 'picturable-verbs-missing.txt');
  const summaryPath = path.join(OUT_DIR, 'picturable-verbs-summary.json');

  fs.writeFileSync(candidatesPath, `${candidates.join('\n')}\n`, 'utf8');
  fs.writeFileSync(missingPath, `${missing.join('\n')}\n`, 'utf8');

  const summary = {
    generatedAt: new Date().toISOString(),
    matchRule: 'verifiedPackHit (exact/canonical only; aliases/gerunds/agents not counted)',
    source: 'scripts/data/picturable-verbs.txt',
    totalCandidates: candidates.length,
    verifiedInPack: verified.length,
    unverifiedInPack: unverified.length,
    missingFromPack: missing.length,
    inDictButMissingPackCount: inDictButMissingPack.length,
    relatedFormsNoteCount: relatedFormsInPack.length,
    paths: {
      candidates: 'tmp/asset-discovery/picturable-verbs-candidates.txt',
      missing: 'tmp/asset-discovery/picturable-verbs-missing.txt',
      summary: 'tmp/asset-discovery/picturable-verbs-summary.json',
    },
    verifiedWords: verified.map((r) => r.word),
    inDictButMissingPack,
    relatedFormsInPack,
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        totalCandidates: summary.totalCandidates,
        verifiedInPack: summary.verifiedInPack,
        unverifiedInPack: summary.unverifiedInPack,
        missingFromPack: summary.missingFromPack,
        inDictButMissingPackCount: summary.inDictButMissingPackCount,
        relatedFormsNoteCount: summary.relatedFormsNoteCount,
      },
      null,
      2
    )
  );
}

main();
