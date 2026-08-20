/**
 * Finish hide/reveal wave1 import.
 *   node scripts/manus/finish-hide-reveal-wave1.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-hide-reveal-wave1');
const ITEMS = JSON.parse(fs.readFileSync(path.join(OUT, 'keys.json'), 'utf8')).items;

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

function namesForSheet(slice) {
  const names = [];
  for (const n of slice) {
    names.push(`${n}-closed`, `${n}-open`);
  }
  while (names.length < 16) names.push(`empty${names.length}`);
  return names;
}

const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f)).sort();
const slices = [ITEMS.slice(0, 8), ITEMS.slice(8, 16), ITEMS.slice(16)];
for (let si = 0; si < sheets.length && si < 3; si++) {
  const sheet = path.join(OUT, 'sheets', sheets[si]);
  const stage = path.join(OUT, 'stage', `sheet${si + 1}`);
  fs.mkdirSync(stage, { recursive: true });
  const names = namesForSheet(slices[si]);
  run([
    'scripts/import-sheet.mjs',
    sheet,
    '--grid=4x4',
    `--names=${names.join(',')}`,
    '--pack=hide-reveal',
    `--stage=${stage}`,
    '--prefix=hide-',
    '--roles=' + Array(16).fill('prop').join(','),
    '--scales=' + Array(16).fill('0.55').join(','),
    '--anchors=' + Array(16).fill('bottom').join(','),
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
    e.row.tags = [
      'hideReveal',
      'interactive',
      'dock',
      `hide:${m[1]}`,
      `state:${m[2]}`,
    ];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}
console.log('hide-reveal import done');
