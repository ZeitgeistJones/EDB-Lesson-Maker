/**
 * Finish import for cast ACTIONS wave1 (4 sheets: mia-n, mia-h, leo-n, leo-h).
 *   node scripts/manus/finish-story-cast-actions-wave1.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-story-cast-actions-wave1');
const ACTIONS = JSON.parse(fs.readFileSync(path.join(OUT, 'keys.json'), 'utf8')).actions;
const SHEETS = [
  { file: '01.png', who: 'mia', emotion: 'neutral' },
  { file: '02.png', who: 'mia', emotion: 'happy' },
  { file: '03.png', who: 'leo', emotion: 'neutral' },
  { file: '04.png', who: 'leo', emotion: 'happy' },
];

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

const names16 = [...ACTIONS, 'empty14', 'empty15', 'empty16'];
for (const s of SHEETS) {
  const sheet = path.join(OUT, 'sheets', s.file);
  if (!fs.existsSync(sheet)) {
    // try any matching
    const alt = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f)).sort();
    console.error('missing', s.file, 'have', alt);
    continue;
  }
  const stage = path.join(OUT, 'stage', `${s.who}-${s.emotion}`);
  fs.mkdirSync(stage, { recursive: true });
  const prefixNames = ACTIONS.map((a) => `${s.who}-${a}-${s.emotion}`).concat(['empty14', 'empty15', 'empty16']);
  run([
    'scripts/import-sheet.mjs',
    sheet,
    '--grid=4x4',
    `--names=${prefixNames.join(',')}`,
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
    const m = e.key.match(/^cast-(mia|leo)-([a-z]+)-(neutral|happy)$/);
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
      'actionPose',
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
console.log('done actions import');
