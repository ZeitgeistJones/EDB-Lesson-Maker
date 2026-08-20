/**
 * Import the 2×3 drawer/table/bed hide-reveal redo.
 *   node scripts/manus/finish-hide-reveal-broken-pairs.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-hide-reveal-broken-pairs');
const NAMES = [
  'drawer-closed',
  'drawer-open',
  'table-closed',
  'table-open',
  'bed-closed',
  'bed-open',
];

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f)).sort();
if (!sheets.length) throw new Error(`no sheets in ${OUT}/sheets`);
const sheet = path.join(OUT, 'sheets', sheets[0]);
const stage = path.join(OUT, 'stage');
fs.mkdirSync(stage, { recursive: true });

run([
  'scripts/import-sheet.mjs',
  sheet,
  '--grid=2x3',
  `--names=${NAMES.join(',')}`,
  '--pack=hide-reveal',
  `--stage=${stage}`,
  '--prefix=hide-',
  '--roles=' + Array(6).fill('prop').join(','),
  '--scales=' + Array(6).fill('0.55').join(','),
  '--anchors=' + Array(6).fill('bottom').join(','),
  '--stage-all',
]);

const rowsPath = path.join(stage, fs.readdirSync(stage).find((f) => f.endsWith('-rows.json')));
const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
for (const e of rows) {
  if (!e.row || !e.key || /empty/i.test(e.key)) {
    e.skip = true;
    continue;
  }
  const m = e.key.match(/^hide-(.+)-(closed|open)$/);
  if (!m) {
    e.skip = true;
    continue;
  }
  e.dedup = 'new';
  e.skip = false;
  e.blocked = false;
  e.row.pack = 'hide-reveal';
  e.row.relativeScale = 0.55;
  e.row.anchor = 'bottom';
  e.row.tags = ['hideReveal', 'interactive', 'dock', `hide:${m[1]}`, `state:${m[2]}`];
}
fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
console.log('hide-reveal broken pairs imported');
