/**
 * Import held env mop only (hotel / bus interior / train interior).
 * Does not retouch other story-env keys.
 *
 *   node scripts/manus/finish-story-env-held-mop.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-story-env-held-mop');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');

const KEYS = [
  { key: 'story-env-hotel-lobby', mode: 'midground' },
  { key: 'story-env-bus-interior', mode: 'backdrop' },
  { key: 'story-env-train-interior', mode: 'backdrop' },
];

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
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
  '--grid=1x3',
  `--names=${KEYS.map((k) => k.key.replace(/^story-env-/, '')).join(',')}`,
  '--pack=story-env',
  `--stage=${stage}`,
  '--prefix=story-env-',
  '--roles=' + Array(3).fill('environment').join(','),
  '--scales=' + Array(3).fill('0.85').join(','),
  '--anchors=' + Array(3).fill('bottom').join(','),
  '--stage-all',
]);

const rowsPath = path.join(stage, fs.readdirSync(stage).find((f) => f.endsWith('-rows.json')));
const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
let ki = 0;
for (const e of rows) {
  const spec = KEYS[ki++];
  if (!e.row || !spec) {
    e.skip = true;
    continue;
  }
  e.key = spec.key;
  e.dedup = 'new';
  e.skip = false;
  e.blocked = false;
  e.row.key = spec.key;
  e.row.pack = 'story-env';
  e.row.role = 'environment';
  e.row.relativeScale = 0.85;
  e.row.anchor = 'bottom';
  e.row.tags = [
    'story',
    'storyEnv',
    'environment',
    'story-env',
    'dock',
    `envMode:${spec.mode}`,
    `env:${spec.key.replace(/^story-env-/, '')}`,
  ];
}
fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);

// Tag patch under the manifest lock, against a fresh read (see manifest-lock.mjs).
const allEnv = await mutateManifest(MANIFEST, (man) => {
  for (const spec of KEYS) {
    const row = man.props?.[spec.key];
    if (!row) continue;
    const tags = new Set(row.tags || []);
    tags.delete('furniture');
    tags.add('story');
    tags.add('storyEnv');
    tags.add('environment');
    tags.add('story-env');
    tags.add('dock');
    [...tags].filter((t) => t.startsWith('envMode:')).forEach((t) => tags.delete(t));
    tags.add(`envMode:${spec.mode}`);
    tags.add(`env:${spec.key.replace(/^story-env-/, '')}`);
    row.tags = [...tags];
    row.pack = 'story-env';
    row.role = 'environment';
    row.anchor = 'bottom';
  }
  return Object.keys(man.props || {}).filter((k) => k.startsWith('story-env-')).sort();
});
console.log(JSON.stringify({ imported: KEYS.map((k) => k.key), envCount: allEnv.length }, null, 2));
