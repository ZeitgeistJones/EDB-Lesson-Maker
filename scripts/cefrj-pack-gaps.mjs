/**
 * Fast CEFR-J vocabulary extract + strict pack gap report.
 * No scoring / picturability filtering / Manus.
 *
 *   node scripts/cefrj-pack-gaps.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalize, slug, verifiedPackHit } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV = path.join(ROOT, 'scripts/data/cefrj/cefrj-vocabulary-profile-1.5.csv');
const SOURCE_NOTE = path.join(ROOT, 'scripts/data/cefrj/SOURCE.md');
const INDEX = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const DISCOVERY = path.join(ROOT, 'tmp/asset-discovery/latest.json');
const OUT_DIR = path.join(ROOT, 'tmp/cefrj');

const VERB_INFLECT = [
  [/ies$/i, 'y'],
  [/ves$/i, 'f'],
  [/sses$/i, 'ss'],
  [/xes$/i, 'x'],
  [/zes$/i, 'z'],
  [/ches$/i, 'ch'],
  [/shes$/i, 'sh'],
  [/s$/i, ''],
  [/ied$/i, 'y'],
  [/ed$/i, ''],
  [/ing$/i, ''],
];

function parseCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      cols.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

function cleanHeadword(raw) {
  let w = String(raw || '').trim();
  if (!w) return null;
  // Multi-alt forms like a.m./A.M./am/AM — take first sensible token
  if (w.includes('/')) {
    w = w.split('/')[0].trim();
  }
  // Drop entries that are only punctuation / empty after normalize
  const n = normalize(w);
  if (!n || n.length < 1) return null;
  // Skip obvious metadata/garbage
  if (/^cef/i.test(n)) return null;
  if (n === 'headword' || n === 'pos') return null;
  // Extremely malformed: digits-only codes
  if (/^\d+$/.test(n)) return null;
  return n;
}

function baseVerbCandidates(word) {
  const n = normalize(word);
  const out = new Set([n, slug(n)]);
  // Safe ordinary inflections → try base
  for (const [re, rep] of VERB_INFLECT) {
    if (re.test(n) && n.length > 3) {
      const base = n.replace(re, rep);
      if (base.length >= 2) {
        out.add(base);
        out.add(slug(base));
      }
    }
  }
  // doubled consonant + ing/ed: running → run, stopped → stop
  const mIng = n.match(/^(.+)\1ing$/);
  if (mIng) {
    out.add(mIng[1]);
    out.add(slug(mIng[1]));
  }
  const mEd = n.match(/^(.+)\1ed$/);
  if (mEd) {
    out.add(mEd[1]);
    out.add(slug(mEd[1]));
  }
  return [...out];
}

function packHitFor(index, whitelist, word, pos) {
  if (pos === 'verb') {
    for (const cand of baseVerbCandidates(word)) {
      const hit = verifiedPackHit(index, cand, whitelist);
      if (hit?.verified) return { hit, matchedAs: cand };
    }
    return { hit: null, matchedAs: null };
  }
  const hit = verifiedPackHit(index, word, whitelist);
  return { hit: hit?.verified ? hit : null, matchedAs: hit?.verified ? word : null };
}

function loadDiscoveryWords() {
  const set = new Set();
  if (!fs.existsSync(DISCOVERY)) return set;
  const d = JSON.parse(fs.readFileSync(DISCOVERY, 'utf8'));
  const buckets = d.buckets || {};
  for (const key of Object.keys(buckets)) {
    for (const row of buckets[key] || []) {
      const w = normalize(row.word || row);
      if (w) set.add(w);
    }
  }
  for (const g of d.rankedDiscoveryGaps || []) {
    const w = normalize(g.word);
    if (w) set.add(w);
  }
  return set;
}

function main() {
  if (!fs.existsSync(CSV)) throw new Error(`Missing ${CSV}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(
    SOURCE_NOTE,
    `# CEFR-J Vocabulary Profile

- File: \`cefrj-vocabulary-profile-1.5.csv\`
- Upstream: https://github.com/openlanguageprofiles/olp-en-cefrj
- Raw CSV: https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv
- Version: 1.5
- Downloaded for local ESL vocab-pack gap scans. Attribution to CEFR-J / Open Language Profiles project.
`
  );

  const raw = fs.readFileSync(CSV, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const iHead = header.indexOf('headword');
  const iPos = header.indexOf('pos');
  const iCefr = header.indexOf('CEFR');
  if (iHead < 0 || iPos < 0 || iCefr < 0) {
    throw new Error(`Unexpected columns: ${header.join('|')}`);
  }

  const wantedPos = new Set(['noun', 'verb', 'adjective']);
  // Dedupe by word|pos — keep lowest CEFR level if duplicates
  const levelRank = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const byKey = new Map();

  let skippedGarbage = 0;
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    const pos = String(cols[iPos] || '')
      .trim()
      .toLowerCase();
    if (!wantedPos.has(pos)) continue;
    const word = cleanHeadword(cols[iHead]);
    if (!word) {
      skippedGarbage++;
      continue;
    }
    const level = String(cols[iCefr] || '')
      .trim()
      .toUpperCase();
    if (!levelRank[level]) {
      skippedGarbage++;
      continue;
    }
    const key = `${word}|${pos}`;
    const prev = byKey.get(key);
    if (!prev || levelRank[level] < levelRank[prev.level]) {
      byKey.set(key, { word, pos, level });
    }
  }

  const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const dict = fs.existsSync(DICT)
    ? JSON.parse(fs.readFileSync(DICT, 'utf8'))
    : { words: [], canonicalWhitelist: {} };
  const whitelist = dict.canonicalWhitelist || {};
  const dictSet = new Set((dict.words || []).map((w) => normalize(w)));
  const discoverySet = loadDiscoveryWords();

  // Prior discovery / verb bank missing sets for "completely new" noun/verb gaps
  const priorKnownGaps = new Set();
  const verbMissingPath = path.join(ROOT, 'tmp/asset-discovery/picturable-verbs-missing.txt');
  const discGapsPath = path.join(ROOT, 'tmp/asset-discovery/ranked-gaps.txt');
  for (const p of [verbMissingPath, discGapsPath]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const w = normalize(line);
      if (w) priorKnownGaps.add(w);
    }
  }
  // Also prior scrubbed queues
  const scrub = path.join(ROOT, 'tmp/asset-discovery/scrubbed-queues.json');
  if (fs.existsSync(scrub)) {
    const s = JSON.parse(fs.readFileSync(scrub, 'utf8'));
    for (const row of [
      ...(s.highConfidenceBroad || []),
      ...(s.highConfidenceSpecialized || []),
      ...(s.needsReview || []),
    ]) {
      const w = normalize(row.concept || row.word || row);
      if (w) priorKnownGaps.add(w);
    }
  }

  const buckets = { noun: [], verb: [], adjective: [] };
  for (const row of byKey.values()) {
    const { hit } = packHitFor(index, whitelist, row.word, row.pos);
    const inPack = !!hit;
    const inDict = dictSet.has(row.word) || dictSet.has(slug(row.word));
    const inDiscovery = discoverySet.has(row.word) || discoverySet.has(slug(row.word));
    buckets[row.pos].push({
      word: row.word,
      pos: row.pos,
      level: row.level,
      exactAssetExists: inPack ? 'yes' : 'no',
      inCuratedDictionary: inDict ? 'yes' : 'no',
      inOpenWorldDiscovery: inDiscovery ? 'yes' : 'no',
    });
  }

  for (const pos of Object.keys(buckets)) {
    buckets[pos].sort((a, b) => {
      const lr = (levelRank[a.level] || 9) - (levelRank[b.level] || 9);
      if (lr) return lr;
      return a.word.localeCompare(b.word);
    });
  }

  function writePos(pos) {
    const rows = buckets[pos];
    const csvName = `cefrj-${pos}-gaps.csv`;
    // User asked for gap CSVs — include ALL rows with yes/no so they can filter;
    // also missing-only txt.
    const csvPath = path.join(OUT_DIR, csvName);
    const headerLine =
      'word,pos,CEFR-J level,exact asset exists,already in curated dictionary,already found by open-world discovery';
    const body = rows
      .map(
        (r) =>
          `${r.word},${r.pos},${r.level},${r.exactAssetExists},${r.inCuratedDictionary},${r.inOpenWorldDiscovery}`
      )
      .join('\n');
    fs.writeFileSync(csvPath, headerLine + '\n' + body + '\n');

    const missing = rows.filter((r) => r.exactAssetExists === 'no');
    const txtPath = path.join(OUT_DIR, `cefrj-${pos}-missing.txt`);
    fs.writeFileSync(txtPath, missing.map((r) => r.word).join('\n') + (missing.length ? '\n' : ''));

    const present = rows.length - missing.length;
    const completelyNew = missing.filter((r) => !priorKnownGaps.has(r.word)).length;
    return {
      total: rows.length,
      present,
      missing: missing.length,
      completelyNew,
      missingRows: missing,
      allRows: rows,
    };
  }

  const noun = writePos('noun');
  const verb = writePos('verb');
  const adjective = writePos('adjective');

  // Adjectives grouped by CEFR level (entire list)
  const adjByLevel = {};
  for (const r of buckets.adjective) {
    if (!adjByLevel[r.level]) adjByLevel[r.level] = [];
    adjByLevel[r.level].push(r.word);
  }
  const adjGroupedPath = path.join(OUT_DIR, 'cefrj-adjectives-by-level.txt');
  const adjGrouped = [];
  for (const lvl of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    const list = adjByLevel[lvl] || [];
    adjGrouped.push(`## ${lvl} (${list.length})`);
    adjGrouped.push(...list);
    adjGrouped.push('');
  }
  fs.writeFileSync(adjGroupedPath, adjGrouped.join('\n'));

  const summary = {
    generatedAt: new Date().toISOString(),
    source: 'scripts/data/cefrj/cefrj-vocabulary-profile-1.5.csv',
    attribution: 'CEFR-J Vocabulary Profile 1.5 / openlanguageprofiles/olp-en-cefrj',
    columns: header,
    skippedGarbage,
    packKeys: Object.keys(index).length,
    dictionaryWords: dictSet.size,
    discoveryWordsSeen: discoverySet.size,
    nouns: {
      total: noun.total,
      exactPresent: noun.present,
      missing: noun.missing,
      completelyNewGaps: noun.completelyNew,
    },
    verbs: {
      total: verb.total,
      exactPresent: verb.present,
      missing: verb.missing,
      completelyNewGaps: verb.completelyNew,
    },
    adjectives: {
      total: adjective.total,
      exactPresent: adjective.present,
      missing: adjective.missing,
      byLevel: Object.fromEntries(
        ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => [
          l,
          (adjByLevel[l] || []).length,
        ])
      ),
    },
    outputs: {
      dir: 'tmp/cefrj/',
      csv: [
        'cefrj-noun-gaps.csv',
        'cefrj-verb-gaps.csv',
        'cefrj-adjective-gaps.csv',
      ],
      missingTxt: [
        'cefrj-noun-missing.txt',
        'cefrj-verb-missing.txt',
        'cefrj-adjective-missing.txt',
      ],
      adjectivesByLevel: 'cefrj-adjectives-by-level.txt',
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  // Console report payloads for parent
  console.log(JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, 'report-snippets.json'),
    JSON.stringify(
      {
        missingVerbs: verb.missingRows.map((r) => r.word),
        missingAdjectives: adjective.missingRows.map((r) => `${r.word}\t${r.level}`),
        missingNounsFirst300: noun.missingRows.slice(0, 300).map((r) => `${r.word}\t${r.level}`),
        adjectivesAllByLevel: adjByLevel,
      },
      null,
      2
    )
  );
}

main();
