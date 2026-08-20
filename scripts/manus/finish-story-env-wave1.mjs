/**
 * Import Manus story-env wave1 sheets → PropBank, tag for story use, contact preview.
 *
 *   node scripts/manus/finish-story-env-wave1.mjs
 *   node scripts/manus/finish-story-env-wave1.mjs --preview-only
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-story-env-wave1');
const SHEETS = path.join(OUT, 'sheets');
const IMG = path.join(ROOT, 'public/assets/09_props/img');

const KEYS = JSON.parse(fs.readFileSync(path.join(OUT, 'keys.json'), 'utf8'));
const SHEET1 = KEYS.sheet1;
const SHEET2 = KEYS.sheet2;

function pickSheets() {
  const files = fs
    .readdirSync(SHEETS)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .map((f) => path.join(SHEETS, f))
    .sort(); // 01- then 02- by filename — never sort by size
  if (files.length < 2) throw new Error(`need ≥2 sheets in ${SHEETS}`);
  return { sheet1: files[0], sheet2: files[1], all: files };
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}: ${cmd} ${args.join(' ')}`);
  return r;
}

function patchRows(rowsPath, keys, packTags) {
  const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
  let ki = 0;
  for (const e of rows) {
    if (!e.row) {
      e.skip = true;
      continue;
    }
    const key = keys[ki];
    ki += 1;
    if (!key || /-b$|-extra/.test(key)) {
      e.skip = true;
      continue;
    }
    e.key = key;
    e.dedup = 'new';
    e.skip = false;
    e.blocked = false; // keep soft/hard for env strips after visual OK
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
      'furniture',
      'dock',
      ...packTags,
      `env:${key.replace(/^story-env-/, '')}`,
    ];
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  return rows;
}

async function buildPreview(keys) {
  const cells = [];
  for (const key of keys) {
    const file = path.join(IMG, `${key}.png`);
    if (!fs.existsSync(file)) {
      cells.push({ key, missing: true });
      continue;
    }
    cells.push({
      key,
      dataUrl: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`,
    });
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  await page.setContent('<!doctype html><canvas id="c"></canvas>');
  const dataUrl = await page.evaluate(async (CELLS) => {
    const cols = 5;
    const cellW = 280;
    const cellH = 200;
    const labelH = 28;
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
    ctx.fillText('Story-env wave1 — 20 reusable stage strips', 16, 32);
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#aaa';
    ctx.fillText('pack: story-env · black-field · behind cast · no characters', 16, 50);

    for (let i = 0; i < CELLS.length; i++) {
      const c = CELLS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 12 + col * cellW;
      const y = headerH + row * (cellH + labelH);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x, y, cellW - 8, cellH);
      if (c.missing) {
        ctx.fillStyle = '#f87171';
        ctx.font = '14px system-ui';
        ctx.fillText('MISSING', x + 16, y + cellH / 2);
      } else {
        const im = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = c.dataUrl;
        });
        const pad = 10;
        const maxW = cellW - 8 - pad * 2;
        const maxH = cellH - pad * 2;
        const scale = Math.min(maxW / im.width, maxH / im.height);
        const dw = im.width * scale;
        const dh = im.height * scale;
        ctx.drawImage(im, x + pad + (maxW - dw) / 2, y + pad + (maxH - dh) / 2, dw, dh);
      }
      ctx.fillStyle = '#ddd';
      ctx.font = '11px system-ui';
      ctx.fillText(c.key, x + 4, y + cellH + 18);
    }
    return canvas.toDataURL('image/jpeg', 0.92);
  }, cells);
  await browser.close();
  const dest = path.join(OUT, 'story-env-wave1-preview.jpg');
  fs.writeFileSync(dest, Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
  return dest;
}

const previewOnly = process.argv.includes('--preview-only');

if (!previewOnly) {
  const { sheet1, sheet2 } = pickSheets();
  console.log('sheet1', sheet1);
  console.log('sheet2', sheet2);

  const stage1 = path.join(OUT, 'stage', 'sheet1');
  const stage2 = path.join(OUT, 'stage', 'sheet2');
  fs.mkdirSync(stage1, { recursive: true });
  fs.mkdirSync(stage2, { recursive: true });

  // Sheet 2 arrived as another 3×4 (12 cells) with a few near-duplicate strips.
  // Import all 12, keep the best cell per target key, skip extras.
  const SHEET2_CELLS = [
    'story-env-airport-counter',
    'story-env-hotel-lobby',
    'story-env-train-platform',
    'story-env-train-platform-b', // skip duplicate
    'story-env-train-interior',
    'story-env-bus-interior',
    'story-env-bus-stop',
    'story-env-ocean',
    'story-env-pasture',
    'story-env-ocean-b', // skip duplicate
    'story-env-pasture-b', // skip
    'story-env-extra-b', // skip
  ];

  run(process.execPath, [
    'scripts/import-sheet.mjs',
    sheet1,
    '--grid=3x4',
    `--names=${SHEET1.map((k) => k.replace(/^story-env-/, '')).join(',')}`,
    '--pack=story-env',
    `--stage=${stage1}`,
    '--prefix=story-env-',
    '--roles=' + Array(12).fill('environment').join(','),
    '--scales=' + Array(12).fill('0.85').join(','),
    '--anchors=' + Array(12).fill('bottom').join(','),
    '--stage-all',
  ]);
  run(process.execPath, [
    'scripts/import-sheet.mjs',
    sheet2,
    '--grid=3x4',
    `--names=${SHEET2_CELLS.map((k) => k.replace(/^story-env-/, '')).join(',')}`,
    '--pack=story-env',
    `--stage=${stage2}`,
    '--prefix=story-env-',
    '--roles=' + Array(12).fill('environment').join(','),
    '--scales=' + Array(12).fill('0.85').join(','),
    '--anchors=' + Array(12).fill('bottom').join(','),
    '--stage-all',
  ]);

  const rows1 = path.join(stage1, 'sheet-rows.json');
  const rows2 = path.join(stage2, 'sheet-rows.json');
  // import-sheet may name rows differently — find *-rows.json
  function findRows(dir) {
    const hit = fs.readdirSync(dir).find((f) => f.endsWith('-rows.json') || f === 'sheet-rows.json');
    if (!hit) throw new Error(`no rows json in ${dir}`);
    return path.join(dir, hit);
  }
  const r1 = findRows(stage1);
  const r2 = findRows(stage2);
  patchRows(r1, SHEET1, ['indoor']);
  patchRows(r2, SHEET2_CELLS, ['travel', 'outdoor']);

  run(process.execPath, ['scripts/merge-staged-props.mjs', r1, '--force']);
  run(process.execPath, ['scripts/merge-staged-props.mjs', r2, '--force']);
}

const allKeys = [...SHEET1, ...SHEET2];
const present = allKeys.filter((k) => fs.existsSync(path.join(IMG, `${k}.png`)));
const missing = allKeys.filter((k) => !fs.existsSync(path.join(IMG, `${k}.png`)));
console.log(JSON.stringify({ present: present.length, missing }, null, 2));

const preview = await buildPreview(allKeys);
console.log('preview', preview);

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8'));
const props = manifest.props || {};
const listed = allKeys.map((k) => ({
  key: k,
  inManifest: !!props[k],
  file: fs.existsSync(path.join(IMG, `${k}.png`)),
  tags: props[k] && props[k].tags,
}));
fs.writeFileSync(path.join(OUT, 'import-summary.json'), JSON.stringify({ listed, preview }, null, 2));
console.log(JSON.stringify({ phase: 'done', keys: listed.filter((x) => x.file).map((x) => x.key) }, null, 2));
if (missing.length) process.exit(2);
