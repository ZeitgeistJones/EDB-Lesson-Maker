/**
 * Dump PropBank.resolve outcomes for common topic/word pairs.
 * Writes tmp/prop-resolutions.jsonl + a brief stdout summary.
 *
 *   PROP_RESOLVE_LOG=1 node scripts/dump-prop-resolutions.mjs
 *
 * Phase-1 check: deny/null beats wrong (coach↛whistle, effort→null, doctor↛swing).
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

/** topic → words that used to metonymy-leak or are soft nouns */
const CASES = [
  { topic: 'soccer', words: ['coach', 'practice', 'effort', 'teammate', 'stadium', 'whistle', 'teamwork', 'luck'] },
  { topic: 'doctor clinic', words: ['doctor', 'nurse', 'patient', 'clinic', 'stethoscope', 'help', 'safety'] },
  { topic: 'school', words: ['teacher', 'student', 'homework', 'idea', 'success', 'time', 'fun'] },
  { topic: 'dentist', words: ['dentist', 'toothbrush', 'floss', 'cavity', 'patient'] },
  { topic: 'castle', words: ['castle', 'knight', 'dragon', 'gate', 'crown', 'tower'] },
  { topic: 'feelings', words: ['worried', 'happy', 'sad', 'angry', 'proud'] },
  { topic: 'sports day', words: ['coach', 'whistle', 'trophy', 'medal', 'fair', 'together'] },
];

const lines = [];
const summary = {
  total: 0,
  byWord: 0,
  deny: 0,
  nulls: 0,
  picked: 0,
  suspectedFormerMetonymy: [],
};
const METONYMY_WATCH = new Set(['coach', 'doctor', 'teacher', 'nurse', 'patient']);

for (const c of CASES) {
  const family = PB.familyFor({ title: c.topic, vocabulary: c.words.map((w) => ({ word: w })) });
  for (const word of c.words) {
    summary.total++;
    // Clear per-call log buffer noise — we record our own row.
    sandbox.window.__PROP_RESOLVE_LOG_LINES__ = [];
    const prop = PB.resolve({ word, seed: c.topic, family, minScore: PB.DEFAULT_MIN_SCORE });
    const denied = PB.isDeniedWord && PB.isDeniedWord(word);
    const row = {
      topic: c.topic,
      word,
      family,
      picked: prop ? prop.key : null,
      denied: !!denied,
      score: null,
      reason: denied ? 'deny' : (prop ? 'hit' : 'null'),
    };
    // Pull last telemetry line if present for reason/score.
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
    if (!prop) summary.nulls++;
    else summary.picked++;
    if (row.reason === 'byWord') summary.byWord++;
    if (METONYMY_WATCH.has(word) && prop) {
      const key = prop.key;
      const looksWrong =
        (word === 'coach' && /whistle|clipboard|megaphone/.test(key) && !/coach/.test(key)) ||
        (word === 'doctor' && /swing|volcano|park|bench/.test(key)) ||
        (word === 'teacher' && !/teacher|job-teacher/.test(key));
      if (looksWrong) {
        summary.suspectedFormerMetonymy.push({ topic: c.topic, word, picked: key, reason: row.reason });
      }
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, lines.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');

const highlight = (w) => lines.filter((r) => r.word === w);
console.log('PropBank resolution dump');
console.log(`  wrote ${lines.length} rows → ${path.relative(root, outFile)}`);
console.log(`  total=${summary.total} picked=${summary.picked} nulls=${summary.nulls} deny=${summary.deny}`);
for (const w of ['coach', 'doctor', 'teacher', 'effort', 'practice', 'whistle', 'dentist']) {
  const rows = highlight(w);
  if (!rows.length) continue;
  console.log(`  ${w}:`);
  for (const r of rows) {
    console.log(`    [${r.topic}] → ${r.picked || '(null)'} (${r.reason}${r.denied ? ', denied' : ''})`);
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
