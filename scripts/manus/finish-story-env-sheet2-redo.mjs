/**
 * Import sheet2 redo (8 transit envs) + retag all story-env with envMode.
 *   node scripts/manus/finish-story-env-sheet2-redo.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-story-env-wave1-sheet2-redo');
const SHEET = path.join(OUT, 'sheets', '01.png');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');

const KEYS = [
  'story-env-train-platform',
  'story-env-train-interior',
  'story-env-bus-interior',
  'story-env-bus-stop',
  'story-env-ocean',
  'story-env-pasture',
  'story-env-hotel-lobby',
  'story-env-airport-counter',
];

const ENV_MODE = {
  'story-env-pool-edge': 'backdrop',
  'story-env-soccer-field': 'backdrop',
  'story-env-basketball-court': 'backdrop',
  'story-env-woods': 'backdrop',
  'story-env-zoo': 'backdrop',
  'story-env-ocean': 'backdrop',
  'story-env-pasture': 'backdrop',
  'story-env-train-interior': 'backdrop',
  'story-env-bus-interior': 'backdrop',
  'story-env-construction': 'backdrop',
  'story-env-classroom': 'midground',
  'story-env-home': 'midground',
  'story-env-bedroom': 'midground',
  'story-env-closet': 'midground',
  'story-env-hotel-lobby': 'midground',
  'story-env-airport-counter': 'midground',
  'story-env-clinic': 'midground',
  'story-env-grass-field': 'strip',
  'story-env-bus-stop': 'strip',
  'story-env-train-platform': 'strip',
  'story-env-train-platform-b': 'strip',
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

if (!fs.existsSync(SHEET)) throw new Error(`missing ${SHEET}`);

const stage = path.join(OUT, 'stage');
fs.mkdirSync(stage, { recursive: true });

run(process.execPath, [
  'scripts/import-sheet.mjs',
  SHEET,
  '--grid=2x4',
  `--names=${KEYS.map((k) => k.replace(/^story-env-/, '')).join(',')}`,
  '--pack=story-env',
  `--stage=${stage}`,
  '--prefix=story-env-',
  '--roles=' + Array(8).fill('environment').join(','),
  '--scales=' + Array(8).fill('0.85').join(','),
  '--anchors=' + Array(8).fill('bottom').join(','),
  '--stage-all',
]);

const rowsPath = path.join(stage, fs.readdirSync(stage).find((f) => f.endsWith('-rows.json')));
const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
let ki = 0;
for (const e of rows) {
  if (!e.row) {
    e.skip = true;
    continue;
  }
  const key = KEYS[ki++];
  if (!key) {
    e.skip = true;
    continue;
  }
  const mode = ENV_MODE[key] || 'backdrop';
  e.key = key;
  e.dedup = 'new';
  e.skip = false;
  e.blocked = false;
  e.row.key = key;
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
    `envMode:${mode}`,
    `env:${key.replace(/^story-env-/, '')}`,
  ];
}
fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
run(process.execPath, ['scripts/merge-staged-props.mjs', rowsPath, '--force']);

// Retag ALL story-env keys with envMode — under the manifest lock, against a
// fresh read (see manifest-lock.mjs).
const allEnv = await mutateManifest(MANIFEST, (man) => {
  for (const [key, row] of Object.entries(man.props || {})) {
    if (!key.startsWith('story-env-')) continue;
    const mode = ENV_MODE[key] || 'backdrop';
    const tags = new Set(row.tags || []);
    tags.delete('furniture');
    tags.add('story');
    tags.add('storyEnv');
    tags.add('environment');
    tags.add('story-env');
    tags.add('dock');
    tags.add(`envMode:${mode}`);
    tags.add(`env:${key.replace(/^story-env-/, '')}`);
    row.tags = [...tags];
    row.pack = row.pack || 'story-env';
    row.role = 'environment';
    row.anchor = row.anchor || 'bottom';
  }
  return Object.keys(man.props).filter((k) => k.startsWith('story-env-')).sort();
});
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent('<!doctype html><canvas id="c"></canvas>');
const cells = allEnv.map((key) => {
  const file = path.join(IMG, `${key}.png`);
  return {
    key,
    mode: ENV_MODE[key] || '?',
    dataUrl: fs.existsSync(file)
      ? `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`
      : null,
  };
});
const dataUrl = await page.evaluate(async (CELLS) => {
  const cols = 5;
  const cellW = 280;
  const cellH = 200;
  const labelH = 32;
  const headerH = 56;
  const rows = Math.ceil(CELLS.length / cols);
  const w = cols * cellW + 24;
  const h = headerH + rows * (cellH + labelH) + 24;
  const canvas = document.getElementById('c');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '600 20px system-ui';
  ctx.fillText('Story-env stockpile — tagged envMode', 16, 32);
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 12 + col * cellW;
    const y = headerH + row * (cellH + labelH);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, cellW - 8, cellH);
    if (c.dataUrl) {
      const im = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = c.dataUrl;
      });
      const scale = Math.min(240 / im.width, 160 / im.height);
      ctx.drawImage(im, x + 20, y + 20, im.width * scale, im.height * scale);
    }
    ctx.fillStyle = '#ddd';
    ctx.font = '11px system-ui';
    ctx.fillText(`${c.key.replace('story-env-', '')} [${c.mode}]`, x + 4, y + cellH + 18);
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}, cells);
await browser.close();
const preview = path.join(OUT, 'story-env-stockpile-preview.jpg');
fs.writeFileSync(preview, Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));

const approved = [];
const held = [];
for (const k of allEnv) {
  const mode = ENV_MODE[k];
  if (/(bus-interior|train-interior|hotel-lobby|train-platform-b)/.test(k)) held.push({ key: k, mode, reason: 'visual QA / padding' });
  else approved.push({ key: k, mode });
}

fs.writeFileSync(
  path.join(OUT, 'wave1-report.json'),
  JSON.stringify({ imported: KEYS, allEnv, approved, held, preview }, null, 2)
);
console.log(JSON.stringify({ phase: 'done', count: allEnv.length, preview, approved: approved.length, held }, null, 2));
