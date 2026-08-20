/**
 * Finish cast roles wave1 / wave1b imports (8 sheets each, 4×4).
 *   node scripts/manus/finish-story-cast-roles-wave1.mjs
 *   node scripts/manus/finish-story-cast-roles-wave1.mjs --batch=b
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const batch = process.argv.includes('--batch=b') ? 'b' : '';
const OUT = path.join(ROOT, 'tmp', batch === 'b' ? 'manus-story-cast-roles-wave1b' : 'manus-story-cast-roles-wave1');
const POSES = ['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach'];
const roles = JSON.parse(fs.readFileSync(path.join(OUT, 'keys.json'), 'utf8')).roles.map((r) => r.who);

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

const onlyWho = (() => {
  const hit = process.argv.find((a) => a.startsWith('--who='));
  return hit ? hit.slice('--who='.length) : '';
})();
const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f)).sort();
for (let i = 0; i < Math.min(sheets.length, roles.length); i++) {
  const who = roles[i];
  if (onlyWho && who !== onlyWho) continue;
  const sheet = path.join(OUT, 'sheets', sheets[i]);
  const stage = path.join(OUT, 'stage', who);
  fs.mkdirSync(stage, { recursive: true });
  // Parent sheet left cell 8 empty (end of neutral row). Others packed 14+2.
  const names =
    who === 'parent'
      ? [
          ...POSES.map((p) => `${who}-${p}-neutral`),
          'empty8',
          ...POSES.map((p) => `${who}-${p}-happy`),
          'empty16',
        ]
      : [
          ...POSES.map((p) => `${who}-${p}-neutral`),
          ...POSES.map((p) => `${who}-${p}-happy`),
          'empty15',
          'empty16',
        ];
  run([
    'scripts/import-sheet.mjs',
    sheet,
    '--grid=4x4',
    `--names=${names.join(',')}`,
    '--pack=story-cast',
    `--stage=${stage}`,
    '--prefix=cast-',
    '--roles=' + Array(16).fill('character').join(','),
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
    const m = e.key.match(/^cast-([a-z0-9]+)-([a-z]+)-(neutral|happy)$/);
    if (!m) {
      e.skip = true;
      continue;
    }
    e.dedup = 'new';
    e.skip = false;
    e.blocked = false;
    e.row.pack = 'story-cast';
    e.row.relativeScale = 0.55;
    e.row.anchor = 'bottom';
    e.row.tags = [
      'story',
      'storyCast',
      'character',
      'story-cast',
      'dock',
      `who:${m[1]}`,
      `pose:${m[2]}`,
      `emotion:${m[3]}`,
      'facing:right',
    ];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}
console.log('roles import done', OUT);
