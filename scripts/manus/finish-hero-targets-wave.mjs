/**
 * Import hero-targets stockpile wave (2–12) into prop bank.
 * Stockpile import only — no producer wiring.
 *
 *   node scripts/manus/finish-hero-targets-wave.mjs --wave=2
 *   node scripts/manus/finish-hero-targets-wave.mjs --wave=wave15
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import {
  PACK,
  PREFIX,
  RELATIVE_SCALE,
  ROLE,
  WAVES,
  sheetsFor,
} from './hero-targets-harvest-keys.mjs';
import { mutateManifest } from '../lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-hero-stockpile');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function resolveWave() {
  const raw = arg('wave', '');
  const wave = WAVES[raw] || WAVES[Number(raw)];
  if (!wave) throw new Error('Need --wave=2..15 (or wave2..wave15)');
  return wave;
}

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

function tagsFor(key) {
  const m = key.match(/^hero-(.+)-(closed|open)$/);
  if (m) {
    return ['hero', 'playSurface', 'interactive', 'heroTargets', `hide:${m[1]}`, `state:${m[2]}`, m[1], m[2]];
  }
  return ['hero', 'playSurface', 'interactive', 'heroTargets', key.replace(/^hero-/, '')];
}

function sheetFiles(outDir) {
  const dir = path.join(outDir, 'sheets');
  if (!fs.existsSync(dir)) throw new Error(`missing sheets dir ${dir}`);
  const all = fs
    .readdirSync(dir)
    .filter((f) => /\.png$/i.test(f) && !/\.orig\.png$/i.test(f))
    .map((f) => {
      const p = path.join(dir, f);
      return { f, p, bytes: fs.statSync(p).size };
    })
    .sort((a, b) => a.f.localeCompare(b.f));
  const large = all.filter((s) => s.bytes > 80_000);
  if (large.length < 4) throw new Error(`need 4 large sheets in ${dir}, have ${large.length}`);
  return large.slice(0, 4);
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
      ctx.drawImage(img, Math.round((W - box.w) / 2 - box.minX), Math.round(H - pad - box.maxY - 1));
      return c.toDataURL('image/png');
    };
    return { closed: stamp(a, ba), open: stamp(b, bb) };
  }, {
    closedUrl: `data:image/png;base64,${closedB64}`,
    openUrl: `data:image/png;base64,${openB64}`,
  });
  await browser.close();
  const write = (p, dataUrl) => {
    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    let last;
    for (let i = 0; i < 8; i++) {
      try {
        fs.writeFileSync(p, buf);
        return;
      } catch (err) {
        last = err;
        const retryable = err && (err.code === 'UNKNOWN' || err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES');
        if (!retryable || i === 7) throw err;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 * (i + 1));
      }
    }
    throw last;
  };
  write(closedPath, out.closed);
  write(openPath, out.open);
}

const wave = resolveWave();
const waveId = wave.id || `wave${wave}`;
const OUT = path.join(STOCKPILE, waveId);
const SHEETS = sheetsFor(wave);
const sheets = sheetFiles(OUT);
const imported = [];
const held = [];

for (const s of sheets) {
  run(['scripts/sheet-cell-plates-to-blackfield.mjs', '--in-place', '--grid=4x4', '--white-min=248', s.p]);
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

// Tag patch under the manifest lock, against a fresh read — the unlocked
// version of this write is what erased other waves' merges (wave9 lost 32
// keys to exactly this read-before-their-merge / write-after race).
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

for (const p of wave.pairs) {
  const closed = path.join(IMG, `hero-${p.slug}-closed.png`);
  const open = path.join(IMG, `hero-${p.slug}-open.png`);
  if (!fs.existsSync(closed) || !fs.existsSync(open)) {
    held.push({ key: `hero-${p.slug}`, reason: 'pair-incomplete' });
    continue;
  }
  await alignPair(closed, open);
}

const allKeys = [
  ...wave.pairs.flatMap((p) => [`hero-${p.slug}-closed`, `hero-${p.slug}-open`]),
  ...wave.singles.map((s) => `hero-${s.slug}`),
];
const present = allKeys.filter((k) => fs.existsSync(path.join(IMG, `${k}.png`)));
const missing = allKeys.filter((k) => !present.includes(k));
const report = {
  wave: waveId,
  target: allKeys.length,
  imported: present.length,
  missing,
  held,
  finished_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(OUT, 'import-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
