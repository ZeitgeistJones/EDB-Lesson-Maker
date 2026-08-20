/**
 * Finish letters wave1 — 4 sheets: upper plain, lower plain, upper trace, lower trace.
 *   node scripts/manus/finish-letters-wave1.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-letters-wave1');
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

function pad28(names) {
  const out = [...names];
  while (out.length < 28) out.push(`empty${out.length}`);
  return out;
}

const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f)).sort();
const configs = [
  { prefix: 'letter-', letters: UPPER, tag: 'plain-upper' },
  { prefix: 'letter-', letters: LOWER, tag: 'plain-lower' },
  { prefix: 'letter-trace-', letters: UPPER, tag: 'trace-upper' },
  { prefix: 'letter-trace-', letters: LOWER, tag: 'trace-lower' },
];

for (let i = 0; i < Math.min(sheets.length, 4); i++) {
  const cfg = configs[i];
  const sheet = path.join(OUT, 'sheets', sheets[i]);
  const stage = path.join(OUT, 'stage', cfg.tag);
  fs.mkdirSync(stage, { recursive: true });
  const names = pad28(cfg.letters.map((L) => `${cfg.prefix.replace(/-$/, '') === 'letter' ? '' : ''}${L}`));
  // names like letter-A via prefix
  const bare = pad28(cfg.letters);
  run([
    'scripts/import-sheet.mjs',
    sheet,
    '--grid=4x7',
    `--names=${bare.join(',')}`,
    '--pack=letters',
    `--stage=${stage}`,
    `--prefix=${cfg.prefix}`,
    '--roles=' + Array(28).fill('glyph').join(','),
    '--scales=' + Array(28).fill('0.4').join(','),
    '--anchors=' + Array(28).fill('center').join(','),
    '--stage-all',
  ]);
  const rowsPath = path.join(stage, fs.readdirSync(stage).find((f) => f.endsWith('-rows.json')));
  const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
  for (const e of rows) {
    if (!e.row || !e.key || /empty/i.test(e.key)) {
      e.skip = true;
      continue;
    }
    e.dedup = 'new';
    e.skip = false;
    e.blocked = false;
    e.row.pack = 'letters';
    e.row.relativeScale = 0.4;
    e.row.anchor = 'center';
    const isTrace = e.key.includes('trace');
    const ch = e.key.replace(/^letter-(trace-)?/, '');
    e.row.tags = [
      'letter',
      'literacy',
      isTrace ? 'trace' : 'exemplar',
      /[A-Z]/.test(ch) ? 'uppercase' : 'lowercase',
      `char:${ch}`,
    ];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}
console.log('letters import done');
