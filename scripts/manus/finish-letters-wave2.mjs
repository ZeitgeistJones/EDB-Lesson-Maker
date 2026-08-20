/**
 * Import letters wave2 with NTFS-safe keys:
 *   letter-{plain|trace|stroke|arrow}-{upper|lower}-{a-z}
 *
 * Drops the broken wave1 letter-* / letter-trace-* keys (case-collapsed).
 *
 *   node scripts/manus/finish-letters-wave2.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-letters-wave2');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const AZ = 'abcdefghijklmnopqrstuvwxyz'.split('');

const SHEETS = [
  { version: 'plain', caseName: 'upper' },
  { version: 'plain', caseName: 'lower' },
  { version: 'trace', caseName: 'upper' },
  { version: 'trace', caseName: 'lower' },
  { version: 'stroke', caseName: 'upper' },
  { version: 'stroke', caseName: 'lower' },
  { version: 'arrow', caseName: 'upper' },
  { version: 'arrow', caseName: 'lower' },
];

function run(args) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    last = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
    if (last.stdout) process.stdout.write(last.stdout);
    if (last.stderr) process.stderr.write(last.stderr);
    if (!last.status) return;
    const err = `${last.stderr || ''} ${last.stdout || ''}`;
    if (!/UNKNOWN: unknown error, open .*manifest\.json/i.test(err) || attempt === 4) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750 * attempt);
  }
  throw new Error(`exit ${last.status}`);
}

function pad28(names) {
  const out = [...names];
  while (out.length < 28) out.push(`empty${out.length}`);
  return out;
}

const sheets = fs
  .readdirSync(path.join(OUT, 'sheets'))
  .filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f))
  .sort();
if (sheets.length < 8) throw new Error(`need 8 letter sheets, have ${sheets.length}`);

for (let i = 0; i < 8; i++) {
  const cfg = SHEETS[i];
  const sheet = path.join(OUT, 'sheets', sheets[i]);
  const stage = path.join(OUT, 'stage', `${cfg.version}-${cfg.caseName}`);
  fs.mkdirSync(stage, { recursive: true });
  const names = pad28(AZ.map((ch) => `${cfg.version}-${cfg.caseName}-${ch}`));
  run([
    'scripts/import-sheet.mjs',
    sheet,
    '--grid=7x4',
    `--names=${names.join(',')}`,
    '--pack=letters',
    `--stage=${stage}`,
    '--prefix=letter-',
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
    const m = e.key.match(/^letter-(plain|trace|stroke|arrow)-(upper|lower)-([a-z])$/);
    if (!m) {
      e.skip = true;
      continue;
    }
    e.dedup = 'new';
    e.skip = false;
    e.blocked = false;
    e.row.pack = 'letters';
    e.row.relativeScale = 0.4;
    e.row.anchor = 'center';
    e.row.tags = [
      'letter',
      'letters',
      'literacy',
      'dock',
      `version:${m[1]}`,
      m[1] === 'plain' ? 'exemplar' : m[1],
      m[2] === 'upper' ? 'uppercase' : 'lowercase',
      `char:${m[3]}`,
    ];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}

const dropped = [];
// Drop-keys pass under the manifest lock, against a fresh read (see manifest-lock.mjs).
const letterKeys = await mutateManifest(MANIFEST, (man) => {
  for (const key of Object.keys(man.props || {})) {
    // Wave1 leftovers only: letter-a / letter-trace-a. Keep letter-trace-upper-a.
    if (!/^letter-(trace-)?[a-z]$/i.test(key)) continue;
    dropped.push(key);
    const file = man.props[key]?.file;
    delete man.props[key];
    if (file) {
      const fp = path.join(IMG, file);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  }
  return Object.keys(man.props || {}).filter((k) => k.startsWith('letter-')).sort();
});
console.log(JSON.stringify({ letterCount: letterKeys.length, dropped: dropped.length }, null, 2));
