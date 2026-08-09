/**
 * Dump PropBank.resolve outcomes for common topic/word pairs.
 * Writes tmp/prop-resolutions.jsonl + tmp/prop-null-coverage.json + stdout summary.
 *
 *   PROP_RESOLVE_LOG=1 node scripts/dump-prop-resolutions.mjs
 *
 * Phase-1 check: deny/null beats wrong (coach↛whistle, effort→null, doctor↛swing).
 * Phase-2 check: ambiguous/never/subjectLock from propPolicy.json (patient/clinic→null).
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, 'tmp');
const outFile = path.join(outDir, 'prop-resolutions.jsonl');
const coverageFile = path.join(outDir, 'prop-null-coverage.json');

process.env.PROP_RESOLVE_LOG = process.env.PROP_RESOLVE_LOG || '1';

function fileFetch(url) {
  const rel = String(url).replace(/^\.?\//, '');
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  const body = fs.readFileSync(filePath);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

const sandbox = {
  window: { __PROP_RESOLVE_LOG__: true, __PROP_RESOLVE_LOG_LINES__: [] },
  fetch: fileFetch,
  console,
  process,
  setTimeout,
  clearTimeout,
};
sandbox.self = sandbox;
vm.createContext(sandbox);
for (const name of ['sceneBackgrounds.js', 'propBank.js']) {
  const code = fs.readFileSync(path.join(publicDir, 'lib', name), 'utf8');
  vm.runInContext(code, sandbox, { filename: name });
}
const PB = sandbox.window.PropBank;
if (!PB || !PB.resolve) throw new Error('PropBank failed to load');
await PB.ready();

/** topic → words that used to metonymy-leak, soft nouns, or phase-2 policy cases */
const CASES = [
  { topic: 'soccer', words: ['coach', 'practice', 'effort', 'teammate', 'stadium', 'whistle', 'teamwork', 'luck', 'ball', 'goal'] },
  { topic: 'tennis lesson', words: ['ball', 'racket', 'net'] },
  { topic: 'doctor clinic', words: ['doctor', 'nurse', 'patient', 'clinic', 'stethoscope', 'help', 'safety', 'bandage', 'thermometer'] },
  { topic: 'school', words: ['teacher', 'student', 'homework', 'idea', 'success', 'time', 'fun', 'pencil', 'backpack', 'globe'] },
  { topic: 'dentist', words: ['dentist', 'toothbrush', 'floss', 'cavity', 'patient', 'tooth', 'smile'] },
  { topic: 'castle', words: ['castle', 'knight', 'dragon', 'gate', 'crown', 'tower', 'king', 'bridge'] },
  { topic: 'feelings', words: ['worried', 'happy', 'sad', 'angry', 'proud', 'scared', 'shy'] },
  { topic: 'sports day', words: ['coach', 'whistle', 'trophy', 'medal', 'fair', 'together', 'race', 'run'] },
  { topic: 'beach', words: ['towel', 'umbrella', 'shell', 'ball', 'sunscreen', 'bucket', 'sandcastle', 'swim'] },
  { topic: 'fruit market', words: ['apple', 'banana', 'orange', 'grape', 'carrot', 'tomato', 'lemon'] },
  { topic: 'first aid', words: ['bandage', 'ice pack', 'crutches', 'sling', 'medicine', 'gloves', 'mask'] },
  { topic: 'kitchen', words: ['chef', 'pan', 'spatula', 'oven', 'plate', 'knife', 'coffee', 'table'] },
  { topic: 'farm', words: ['farmer', 'tractor', 'barn', 'cow', 'chicken', 'hay'] },
  { topic: 'family', words: ['grandfather', 'grandmother', 'father', 'mother'] },
  { topic: 'hearing', words: ['ear', 'hear', 'loud'] },
];

const PHASE2_EXPECT = [
  { topic: 'doctor clinic', word: 'patient', picked: null },
  { topic: 'dentist', word: 'patient', picked: 'dental-kid-open-mouth' },
  // Pharmacy is not a clinic — empty beats wrong building.
  { topic: 'doctor clinic', word: 'clinic', picked: null },
  { topic: 'school', word: 'student', picked: null },
  { topic: 'soccer', word: 'coach', picked: null },
  { topic: 'soccer', word: 'effort', picked: null },
  { topic: 'kitchen', word: 'oven', picked: null },
  { topic: 'soccer', word: 'ball', picked: 'soccer-ball' },
  { topic: 'tennis lesson', word: 'ball', picked: 'sport-tennis-ball' },
  { topic: 'fruit market', word: 'grape', picked: 'food-grapes' },
  // Head-noun gate: modifier tokens in compounds must not qualify.
  { topic: 'family', word: 'grandfather', picked: null },
  { topic: 'hearing', word: 'ear', picked: null },
  { topic: 'kitchen', word: 'coffee', picked: 'cafe-coffee-cup' },
  // Exact key "table" is honest identity; compound coffee-table is head-"table" only.
  { topic: 'kitchen', word: 'table', picked: 'table' },
];

const lines = [];
const summary = {
  total: 0,
  byWord: 0,
  deny: 0,
  ambiguous: 0,
  policyBlock: 0,
  nulls: 0,
  picked: 0,
  suspectedFormerMetonymy: [],
};
const METONYMY_WATCH = new Set(['coach', 'doctor', 'teacher', 'nurse', 'patient', 'clinic', 'chef']);

for (const c of CASES) {
  const family = PB.familyFor({ title: c.topic, vocabulary: c.words.map((w) => ({ word: w })) });
  for (const word of c.words) {
    summary.total++;
    sandbox.window.__PROP_RESOLVE_LOG_LINES__ = [];
    const prop = PB.resolve({ word, seed: c.topic, family, minScore: PB.DEFAULT_MIN_SCORE });
    const denied = PB.isDeniedWord && PB.isDeniedWord(word);
    const ambiguous = PB.isAmbiguousWord && PB.isAmbiguousWord(word);
    const row = {
      topic: c.topic,
      word,
      family,
      picked: prop ? prop.key : null,
      denied: !!denied,
      ambiguous: !!ambiguous,
      score: null,
      reason: denied ? 'deny' : ambiguous ? 'ambiguous' : (prop ? 'hit' : 'null'),
    };
    const tel = sandbox.window.__PROP_RESOLVE_LOG_LINES__ || [];
    if (tel.length) {
      try {
        const last = JSON.parse(tel[tel.length - 1]);
        if (last.reason) row.reason = last.reason;
        if (last.score != null) row.score = last.score;
        if (last.runnerUp) row.runnerUp = last.runnerUp;
      } catch (_) { /* ignore */ }
    }
    lines.push(row);
    if (row.reason === 'deny' || denied) summary.deny++;
    if (row.reason === 'ambiguous' || ambiguous) summary.ambiguous++;
    if (row.reason === 'policy-block') summary.policyBlock++;
    if (!prop) summary.nulls++;
    else summary.picked++;
    if (row.reason === 'byWord') summary.byWord++;
    if (METONYMY_WATCH.has(word) && prop) {
      const key = prop.key;
      const looksWrong =
        (word === 'coach' && /whistle|clipboard|megaphone/.test(key) && !/coach/.test(key)) ||
        (word === 'doctor' && /swing|volcano|park|bench|stethoscope/.test(key) && !/doctor/.test(key)) ||
        (word === 'teacher' && !/teacher|job-teacher/.test(key)) ||
        // patient→dental-kid is allowed only on dentist topics (subjectLock).
        (word === 'patient' && /dental-kid/.test(key) && !/dentist|dental|tooth|teeth|cavity|floss|toothbrush/.test(c.topic)) ||
        (word === 'patient' && /clipboard/.test(key)) ||
        (word === 'clinic' && /clipboard/.test(key)) ||
        (word === 'chef' && /hat|pan|spatula/.test(key) && key !== 'job-chef');
      if (looksWrong) {
        summary.suspectedFormerMetonymy.push({ topic: c.topic, word, picked: key, reason: row.reason });
      }
    }
  }
}

const phase2Fails = [];
for (const exp of PHASE2_EXPECT) {
  const row = lines.find((r) => r.topic === exp.topic && r.word === exp.word);
  if (!row) {
    phase2Fails.push({ ...exp, actual: '(missing row)' });
    continue;
  }
  const ok = exp.picked == null ? row.picked == null : row.picked === exp.picked;
  if (!ok) phase2Fails.push({ ...exp, actual: row.picked, reason: row.reason });
}
summary.phase2Fails = phase2Fails;

const nullsByWord = {};
for (const r of lines) {
  if (r.picked) continue;
  if (!nullsByWord[r.word]) nullsByWord[r.word] = { word: r.word, reasons: {}, topics: [] };
  nullsByWord[r.word].reasons[r.reason] = (nullsByWord[r.word].reasons[r.reason] || 0) + 1;
  if (!nullsByWord[r.word].topics.includes(r.topic)) nullsByWord[r.word].topics.push(r.topic);
}
const coverage = {
  generatedAt: new Date().toISOString(),
  summary,
  nullWords: Object.values(nullsByWord).sort((a, b) => a.word.localeCompare(b.word)),
  policyHits: lines.filter((r) => r.reason === 'ambiguous' || r.reason === 'policy-block' || r.denied),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, lines.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
fs.writeFileSync(coverageFile, JSON.stringify(coverage, null, 2) + '\n', 'utf8');

const highlight = (w) => lines.filter((r) => r.word === w);
console.log('PropBank resolution dump');
console.log(`  wrote ${lines.length} rows → ${path.relative(root, outFile)}`);
console.log(`  coverage → ${path.relative(root, coverageFile)}`);
console.log(
  `  total=${summary.total} picked=${summary.picked} nulls=${summary.nulls} deny=${summary.deny} ambiguous=${summary.ambiguous} policyBlock=${summary.policyBlock}`
);
for (const w of ['coach', 'doctor', 'teacher', 'patient', 'clinic', 'effort', 'practice', 'whistle', 'dentist', 'chef', 'nurse', 'oven']) {
  const rows = highlight(w);
  if (!rows.length) continue;
  console.log(`  ${w}:`);
  for (const r of rows) {
    console.log(`    [${r.topic}] → ${r.picked || '(null)'} (${r.reason}${r.denied ? ', denied' : ''}${r.ambiguous ? ', ambiguous' : ''})`);
  }
}
if (summary.suspectedFormerMetonymy.length) {
  console.log('\n  SUSPECTED former metonymy still shipping:');
  for (const s of summary.suspectedFormerMetonymy) {
    console.log(`    ${s.word} → ${s.picked} (${s.reason}) @ ${s.topic}`);
  }
  process.exitCode = 1;
} else {
  console.log('\n  No suspected former metonymy in watch list. OK.');
}
if (phase2Fails.length) {
  console.log('\n  PHASE-2 expectation fails:');
  for (const f of phase2Fails) {
    console.log(
      `    [${f.topic}] ${f.word}: expected ${f.picked == null ? '(null)' : f.picked}` +
        ` got ${f.actual == null ? '(null)' : f.actual}`
    );
  }
  process.exitCode = 1;
} else {
  console.log('  Phase-2 expectations OK.');
}
