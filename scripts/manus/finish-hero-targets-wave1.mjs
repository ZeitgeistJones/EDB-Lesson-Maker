/**
 * Import hero-targets wave1, align closed/open pairs onto a shared canvas, merge.
 *
 *   node scripts/manus/finish-hero-targets-wave1.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { PACK, PREFIX, RELATIVE_SCALE, ROLE, PAIRS, SINGLES, SHEETS } from './hero-targets-wave1-keys.mjs';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-hero-targets-wave1');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const QA = path.join(OUT, 'qa');

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

function sheetFiles() {
  const dir = path.join(OUT, 'sheets');
  const all = fs
    .readdirSync(dir)
    .filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f))
    .map((f) => {
      const p = path.join(dir, f);
      return { f, p, bytes: fs.statSync(p).size };
    })
    .sort((a, b) => a.f.localeCompare(b.f));
  const large = all.filter((s) => s.bytes > 80_000);
  if (large.length < 4) throw new Error(`need 4 large sheets, have ${large.length}`);
  return large.slice(0, 4);
}

function tagsFor(key) {
  const m = key.match(/^hero-(.+)-(closed|open)$/);
  if (m) {
    return [
      'hero',
      'playSurface',
      'interactive',
      'heroTargets',
      `hide:${m[1]}`,
      `state:${m[2]}`,
      m[1],
      m[2],
    ];
  }
  const stem = key.replace(/^hero-/, '');
  return ['hero', 'playSurface', 'interactive', 'heroTargets', stem];
}

async function alignPair(closedPath, openPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const closedB64 = fs.readFileSync(closedPath).toString('base64');
  const openB64 = fs.readFileSync(openPath).toString('base64');
  const out = await page.evaluate(async ({ closedUrl, openUrl }) => {
    const load = (src) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    const a = await load(closedUrl);
    const b = await load(openUrl);
    const bbox = (img) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let minX = c.width;
      let minY = c.height;
      let maxX = 0;
      let maxY = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          if (data[i + 3] < 16) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < minX) return { minX: 0, minY: 0, maxX: c.width - 1, maxY: c.height - 1, w: c.width, h: c.height };
      return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
    };
    const ba = bbox(a);
    const bb = bbox(b);
    const pad = 8;
    const W = Math.max(ba.w, bb.w) + pad * 2;
    const H = Math.max(ba.h, bb.h) + pad * 2;
    const stamp = (img, box) => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      const dx = Math.round((W - box.w) / 2 - box.minX);
      const dy = Math.round(H - pad - box.maxY - 1);
      ctx.drawImage(img, dx, dy);
      return c.toDataURL('image/png');
    };
    return { closed: stamp(a, ba), open: stamp(b, bb), W, H };
  }, {
    closedUrl: `data:image/png;base64,${closedB64}`,
    openUrl: `data:image/png;base64,${openB64}`,
  });
  await browser.close();
  const write = (p, dataUrl) => {
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  };
  write(closedPath, out.closed);
  write(openPath, out.open);
  return { w: out.W, h: out.H };
}

async function qaContact(keys, dest, title) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const cells = keys.map((key) => {
    const p = path.join(IMG, `${key}.png`);
    return {
      key,
      dataUrl: fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p).toString('base64')}` : '',
      missing: !fs.existsSync(p),
    };
  });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.setContent('<!doctype html><canvas id="c"></canvas>');
  const dataUrl = await page.evaluate(async ({ title, CELLS }) => {
    const cols = 8;
    const cellW = 160;
    const cellH = 180;
    const labelH = 28;
    const headerH = 52;
    const pad = 12;
    const rows = Math.ceil(CELLS.length / cols);
    const w = cols * cellW + pad * 2;
    const h = headerH + rows * (cellH + labelH) + pad;
    const canvas = document.getElementById('c');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#161616';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2f2f2';
    ctx.font = '600 18px system-ui';
    ctx.fillText(title, pad, 28);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#9aa';
    ctx.fillText('medium hero stockpile — flag identity drift / keyed-dead cavity / white plate', pad, 44);
    for (let i = 0; i < CELLS.length; i++) {
      const c = CELLS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * cellW;
      const y = headerH + row * (cellH + labelH);
      ctx.fillStyle = c.missing ? '#7f1d1d' : '#0c0c0c';
      ctx.fillRect(x, y, cellW - 6, cellH);
      if (c.dataUrl) {
        const im = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = c.dataUrl;
        });
        const scale = Math.min((cellW - 16) / im.width, (cellH - 12) / im.height);
        const dw = im.width * scale;
        const dh = im.height * scale;
        ctx.drawImage(im, x + (cellW - 6 - dw) / 2, y + cellH - 8 - dh, dw, dh);
      }
      ctx.fillStyle = '#ddd';
      ctx.font = '10px system-ui';
      ctx.fillText(c.key.replace(/^hero-/, ''), x + 4, y + cellH + 16);
    }
    return canvas.toDataURL('image/jpeg', 0.88);
  }, { title, CELLS: cells });
  await browser.close();
  fs.writeFileSync(dest, Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
}

const sheets = sheetFiles();
const imported = [];
const held = [];

for (const s of sheets) {
  run([
    'scripts/sheet-cell-plates-to-blackfield.mjs',
    '--in-place',
    '--grid=4x4',
    '--white-min=248',
    s.p,
  ]);
}

for (let si = 0; si < 4; si++) {
  const cfg = SHEETS[si];
  const sheet = sheets[si].p;
  const stage = path.join(OUT, 'stage', cfg.id);
  fs.mkdirSync(stage, { recursive: true });
  run([
    'scripts/import-sheet.mjs',
    sheet,
    `--grid=${cfg.grid}`,
    `--names=${cfg.names.join(',')}`,
    `--pack=${PACK}`,
    `--stage=${stage}`,
    `--prefix=${PREFIX}`,
    '--roles=' + Array(16).fill(ROLE).join(','),
    '--scales=' + Array(16).fill(String(RELATIVE_SCALE)).join(','),
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
    if (e.blocked) {
      held.push({ key: e.key, reason: 'import-blocked', sheet: cfg.id });
      e.skip = true;
      continue;
    }
    e.dedup = 'new';
    e.skip = false;
    e.row.pack = PACK;
    e.row.role = ROLE;
    e.row.relativeScale = RELATIVE_SCALE;
    e.row.anchor = 'bottom';
    e.row.stageFit = 'fit';
    e.row.tags = tagsFor(e.key);
    imported.push(e.key);
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
  run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);
}

// Tag patch under the manifest lock, against a fresh read (see manifest-lock.mjs).
await mutateManifest(MANIFEST, (manifest) => {
  for (const key of imported) {
    const row = manifest.props[key];
    if (!row) {
      held.push({ key, reason: 'missing-after-merge' });
      continue;
    }
    row.role = ROLE;
    row.relativeScale = RELATIVE_SCALE;
    row.anchor = 'bottom';
    row.stageFit = 'fit';
    row.pack = PACK;
    row.tags = tagsFor(key);
  }
});

for (const p of PAIRS) {
  const closed = path.join(IMG, `hero-${p.slug}-closed.png`);
  const open = path.join(IMG, `hero-${p.slug}-open.png`);
  if (!fs.existsSync(closed) || !fs.existsSync(open)) {
    held.push({ key: `hero-${p.slug}`, reason: 'pair-incomplete' });
    continue;
  }
  await alignPair(closed, open);
}

const allKeys = [
  ...PAIRS.flatMap((p) => [`hero-${p.slug}-closed`, `hero-${p.slug}-open`]),
  ...SINGLES.map((s) => `hero-${s.slug}`),
];
fs.mkdirSync(QA, { recursive: true });
await qaContact(
  PAIRS.flatMap((p) => [`hero-${p.slug}-closed`, `hero-${p.slug}-open`]),
  path.join(QA, 'pairs.jpg'),
  'Hero targets — 20 closed/open pairs'
);
await qaContact(
  SINGLES.map((s) => `hero-${s.slug}`),
  path.join(QA, 'singles.jpg'),
  'Hero targets — 10 play surfaces'
);

const present = allKeys.filter((k) => fs.existsSync(path.join(IMG, `${k}.png`)));
const missing = allKeys.filter((k) => !present.includes(k));
const report = {
  target: 50,
  imported: present.length,
  missing,
  held,
  qa: { pairs: path.join(QA, 'pairs.jpg'), singles: path.join(QA, 'singles.jpg') },
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
