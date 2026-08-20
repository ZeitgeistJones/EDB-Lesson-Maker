/**
 * Finish Pre-A1 gaps import (verbs sheet + adjs sheet).
 *   node scripts/manus/finish-prea1-gaps-wave1.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-prea1-gaps-wave1');
const keys = JSON.parse(fs.readFileSync(path.join(OUT, 'keys.json'), 'utf8'));

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f)).sort();
if (sheets[0]) {
  const verbs = [...keys.VERBS];
  while (verbs.length < 9) verbs.push(`empty${verbs.length}`);
  const stage = path.join(OUT, 'stage', 'verbs');
  fs.mkdirSync(stage, { recursive: true });
  run([
    'scripts/import-sheet.mjs',
    path.join(OUT, 'sheets', sheets[0]),
    '--grid=3x3',
    `--names=${verbs.join(',')}`,
    '--pack=prea1',
    `--stage=${stage}`,
    '--prefix=prea1-verb-',
    '--roles=' + Array(9).fill('prop').join(','),
    '--scales=' + Array(9).fill('0.5').join(','),
    '--anchors=' + Array(9).fill('bottom').join(','),
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
    e.row.pack = 'prea1';
    e.row.tags = ['prea1', 'verb', 'picturable', e.key.replace(/^prea1-verb-/, '')];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}
if (sheets[1]) {
  const adjs = [...keys.ADJS];
  while (adjs.length < 9) adjs.push(`empty${adjs.length}`);
  const stage = path.join(OUT, 'stage', 'adjs');
  fs.mkdirSync(stage, { recursive: true });
  run([
    'scripts/import-sheet.mjs',
    path.join(OUT, 'sheets', sheets[1]),
    '--grid=3x3',
    `--names=${adjs.join(',')}`,
    '--pack=prea1',
    `--stage=${stage}`,
    '--prefix=prea1-adj-',
    '--roles=' + Array(9).fill('prop').join(','),
    '--scales=' + Array(9).fill('0.5').join(','),
    '--anchors=' + Array(9).fill('center').join(','),
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
    e.row.pack = 'prea1';
    e.row.tags = ['prea1', 'adjective', 'picturable', e.key.replace(/^prea1-adj-/, '')];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}
console.log('prea1 gaps import done');
