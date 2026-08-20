/**
 * Import hero-targets held mop (fridge / washer / safe / animal-mouth).
 *   node scripts/manus/finish-hero-targets-held-mop.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tmp', 'manus-hero-targets-held-mop');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const PACK = 'hero-targets';
const RELATIVE_SCALE = 0.85;
const NAMES = [
  'fridge-closed',
  'fridge-open',
  'washing-machine-closed',
  'washing-machine-open',
  'safe-closed',
  'safe-open',
  'animal-mouth',
  'empty7',
];

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status) throw new Error(`exit ${r.status}`);
}

function tagsFor(key) {
  const m = key.match(/^hero-(.+)-(closed|open)$/);
  if (m) return ['hero', 'playSurface', 'interactive', 'heroTargets', `hide:${m[1]}`, `state:${m[2]}`, m[1], m[2]];
  return ['hero', 'playSurface', 'interactive', 'heroTargets', key.replace(/^hero-/, '')];
}

async function alignPair(closedPath, openPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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
      let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (data[(y * c.width + x) * 4 + 3] < 16) continue;
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
      ctx.drawImage(img, Math.round((W - box.w) / 2 - box.minX), Math.round(H - pad - box.maxY - 1));
      return c.toDataURL('image/png');
    };
    return { closed: stamp(a, ba), open: stamp(b, bb) };
  }, {
    closedUrl: `data:image/png;base64,${fs.readFileSync(closedPath).toString('base64')}`,
    openUrl: `data:image/png;base64,${fs.readFileSync(openPath).toString('base64')}`,
  });
  await browser.close();
  const write = (p, dataUrl) => fs.writeFileSync(p, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
  write(closedPath, out.closed);
  write(openPath, out.open);
}

const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f)).sort();
if (!sheets.length) throw new Error('no mop sheets');
const sheet = path.join(OUT, 'sheets', sheets[0]);
run(['scripts/sheet-cell-plates-to-blackfield.mjs', '--in-place', '--grid=2x4', '--white-min=248', sheet]);

const stage = path.join(OUT, 'stage');
fs.mkdirSync(stage, { recursive: true });
run([
  'scripts/import-sheet.mjs',
  sheet,
  '--grid=2x4',
  `--names=${NAMES.join(',')}`,
  `--pack=${PACK}`,
  `--stage=${stage}`,
  '--prefix=hero-',
  '--roles=' + Array(8).fill('hero').join(','),
  '--scales=' + Array(8).fill(String(RELATIVE_SCALE)).join(','),
  '--anchors=' + Array(8).fill('bottom').join(','),
  '--stage-all',
]);

const rowsPath = path.join(stage, fs.readdirSync(stage).find((f) => f.endsWith('-rows.json')));
const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
const held = [];
const kept = [];
for (const e of rows) {
  if (!e.row || !e.key || /empty/i.test(e.key)) {
    e.skip = true;
    continue;
  }
  if (e.blocked) {
    held.push(e.key);
    e.skip = true;
    continue;
  }
  e.dedup = 'new';
  e.skip = false;
  e.row.pack = PACK;
  e.row.role = 'hero';
  e.row.relativeScale = RELATIVE_SCALE;
  e.row.anchor = 'bottom';
  e.row.stageFit = 'fit';
  e.row.tags = tagsFor(e.key);
  kept.push(e.key);
}
fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
run(['scripts/merge-staged-props.mjs', rowsPath, '--force']);

// Tag patch under the manifest lock, against a fresh read — an unlocked
// whole-file write here can erase keys another importer merged meanwhile.
await mutateManifest(MANIFEST, (manifest) => {
  for (const key of kept) {
    const row = manifest.props[key];
    if (!row) continue;
    row.role = 'hero';
    row.relativeScale = RELATIVE_SCALE;
    row.anchor = 'bottom';
    row.stageFit = 'fit';
    row.pack = PACK;
    row.tags = tagsFor(key);
  }
});

for (const slug of ['fridge', 'washing-machine', 'safe']) {
  const closed = path.join(IMG, `hero-${slug}-closed.png`);
  const open = path.join(IMG, `hero-${slug}-open.png`);
  if (fs.existsSync(closed) && fs.existsSync(open)) await alignPair(closed, open);
}

console.log(JSON.stringify({ kept, held }, null, 2));
