/**
 * Import hero-targets mop sheet (wave3-mop, wave6-mop, wave78-mop).
 * Stockpile import only — no producer wiring.
 *
 *   node scripts/manus/finish-hero-targets-mop.mjs --wave=wave3-mop
 *   node scripts/manus/finish-hero-targets-mop.mjs --wave=wave7-mop
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-hero-stockpile');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const PACK = 'hero-targets';
const RELATIVE_SCALE = 0.85;
const ROLE = 'hero';

const MOPS = {
  'wave3-mop': {
    grid: '2x2',
    names: ['doll-cradle-closed', 'doll-cradle-open', 'mason-jar-closed', 'mason-jar-open'],
    pairs: ['doll-cradle', 'mason-jar'],
    singles: [],
  },
  'wave6-mop': {
    grid: '1x2',
    names: ['popcorn-popper-closed', 'popcorn-popper-open'],
    pairs: ['popcorn-popper'],
    singles: [],
  },
  'wave7-mop': {
    grid: '1x2',
    names: ['kitchen-counter', 'bucket'],
    pairs: [],
    singles: ['kitchen-counter', 'bucket'],
  },
  'wave78-mop': {
    grid: '3x3',
    names: [
      'terrarium-closed', 'terrarium-open',
      'saxophone-case-closed', 'saxophone-case-open',
      'ukulele-case-closed', 'ukulele-case-open',
      'crib-closed', 'crib-open',
      'lily-pad',
    ],
    pairs: ['terrarium', 'saxophone-case', 'ukulele-case', 'crib'],
    singles: ['lily-pad'],
  },
};

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

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

const waveId = arg('wave', '');
const cfg = MOPS[waveId];
if (!cfg) throw new Error(`Need --wave=wave3-mop|wave6-mop|wave7-mop|wave78-mop`);

const OUT = path.join(STOCKPILE, waveId);
const sheets = fs.readdirSync(path.join(OUT, 'sheets')).filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f)).sort();
if (!sheets.length) throw new Error(`no mop sheets in ${OUT}/sheets`);
const sheet = path.join(OUT, 'sheets', sheets[0]);

run(['scripts/sheet-cell-plates-to-blackfield.mjs', '--in-place', `--grid=${cfg.grid}`, '--white-min=248', sheet]);

const stage = path.join(OUT, 'stage');
fs.mkdirSync(stage, { recursive: true });
const cellCount = cfg.names.length;
run([
  'scripts/import-sheet.mjs',
  sheet,
  `--grid=${cfg.grid}`,
  `--names=${cfg.names.join(',')}`,
  `--pack=${PACK}`,
  `--stage=${stage}`,
  '--prefix=hero-',
  '--roles=' + Array(cellCount).fill(ROLE).join(','),
  '--scales=' + Array(cellCount).fill(String(RELATIVE_SCALE)).join(','),
  '--anchors=' + Array(cellCount).fill('bottom').join(','),
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
    held.push({ key: e.key, reason: 'import-blocked' });
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
    row.role = ROLE;
    row.relativeScale = RELATIVE_SCALE;
    row.anchor = 'bottom';
    row.stageFit = 'fit';
    row.pack = PACK;
    row.tags = tagsFor(key);
  }
});

for (const slug of cfg.pairs) {
  const closed = path.join(IMG, `hero-${slug}-closed.png`);
  const open = path.join(IMG, `hero-${slug}-open.png`);
  if (fs.existsSync(closed) && fs.existsSync(open)) await alignPair(closed, open);
}

const report = { wave: waveId, kept, held, finished_at: new Date().toISOString() };
fs.writeFileSync(path.join(OUT, 'import-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
