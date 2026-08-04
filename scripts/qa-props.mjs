/**
 * Show every prop cutout on the boards it will actually sit on.
 *
 * A prop looks fine on the black field it was generated against and still be
 * wrong in use: a dark rim only appears over a pale background, a pale prop
 * disappears over a pale one, and art that reads beautifully at full size can
 * turn to mush at the 96px a dock piece is really drawn at. So each prop is
 * composited over a light flat, a dark flat and a scene, at display size and
 * again at true dock size.
 *
 *   node scripts/qa-props.mjs [--only=name,name] [--all]
 *
 * Options:
 *   --only   comma-separated prop keys instead of the whole pack
 *   --all    include props that have not been keyed to alpha yet
 *   --light / --dark / --scene   override the background keys used
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'public', 'assets');
const OUT = path.join(ROOT, 'tmp', 'prop-qa.jpg');
const CELL = 240;
const BIG = 190;
const DOCK = 96;
const LABEL_H = 24;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const props = JSON.parse(fs.readFileSync(path.join(ASSETS, '09_props', 'manifest.json'), 'utf8'));
const bg = JSON.parse(fs.readFileSync(path.join(ASSETS, '08_backgrounds', 'manifest.json'), 'utf8'));

const lightKey = arg('light', 'peach-blush');
const darkKey = arg('dark', 'starry-night');
const sceneKey = arg('scene', Object.keys(bg.scenes)[0]);

const surface = (key) => {
  const flat = bg.flats[key];
  if (flat) return `08_backgrounds/img/${flat.file}`;
  const scene = bg.scenes[key];
  if (scene) return `08_backgrounds/img/${scene.file}`;
  console.error(`No background named "${key}" in the manifest`);
  process.exit(1);
};

const light = surface(lightKey);
const dark = surface(darkKey);
const scene = surface(sceneKey);

const only = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const all = process.argv.includes('--all');
let entries = Object.entries(props.props).filter(([name, p]) => {
  if (only.length) return only.includes(name);
  return all || p.alpha;
});

// A prop is worth looking at before it earns a manifest row — that is the whole
// point of the review step — so named props fall back to the image folder.
if (only.length) {
  const have = new Set(entries.map(([name]) => name));
  for (const name of only) {
    if (have.has(name)) continue;
    const file = `${name}.png`;
    if (fs.existsSync(path.join(ASSETS, '09_props', 'img', file))) {
      entries.push([name, { file, role: 'unregistered', alpha: true }]);
    } else {
      console.error(`No prop "${name}" in the manifest or in 09_props/img`);
      process.exit(1);
    }
  }
  entries = only.map((name) => entries.find(([n]) => n === name));
}

if (!entries.length) {
  console.error('No alpha-keyed props yet. Run npm run assets:prop first, or pass --all.');
  process.exit(1);
}

const cell = (src, bgSrc, size, note) => `<div class="cell" style="background-image:url('${bgSrc}')">
    <img src="09_props/img/${src}" style="max-width:${size}px;max-height:${size}px">
    <span class="note">${note}</span>
  </div>`;

const rows = entries
  .map(
    ([name, p]) => `<div class="row">
      <div class="label">${name} — ${p.role || 'no role'}${p.alpha ? '' : ' (not keyed)'}</div>
      <div class="cells">
        ${cell(p.file, light, BIG, 'light flat')}
        ${cell(p.file, dark, BIG, 'dark flat')}
        ${cell(p.file, scene, BIG, 'scene')}
        ${cell(p.file, light, DOCK, `${DOCK}px dock`)}
      </div>
    </div>`
  )
  .join('');

const html = `<style>
  html,body{margin:0;background:#0f172a;font:600 13px/1 system-ui,sans-serif}
  .row{width:${CELL * 4}px}
  .label{height:${LABEL_H}px;display:flex;align-items:center;padding:0 10px;color:#e2e8f0;background:#1e293b}
  .cells{display:grid;grid-template-columns:repeat(4,${CELL}px)}
  .cell{position:relative;width:${CELL}px;height:${CELL}px;display:flex;align-items:center;
        justify-content:center;background-size:cover;background-position:center}
  .note{position:absolute;left:0;bottom:0;padding:2px 6px;font-size:10px;color:#f8fafc;
        background:rgba(15,23,42,.72)}
</style>${rows}`;

// Served from inside public/assets so the relative 08_/09_ paths resolve; a
// page on about:blank cannot read its file:// siblings.
const pagePath = path.join(ASSETS, '_prop-qa.html');
fs.writeFileSync(pagePath, html);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: CELL * 4, height: entries.length * (CELL + LABEL_H) },
});
try {
  await page.goto(`file:///${pagePath.replace(/\\/g, '/')}`);
  await page.waitForLoadState('load');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, quality: 90, type: 'jpeg' });
} finally {
  await browser.close();
  fs.rmSync(pagePath, { force: true });
}

console.log(`${entries.length} prop(s) → ${path.relative(ROOT, OUT)}`);
console.log(`Backgrounds: ${lightKey} / ${darkKey} / ${sceneKey}`);
console.log('Look for: dark rim on the light flat, prop vanishing on the dark flat, mush at dock size.');
