/**
 * Render every scene in the background manifest with its groundY drawn on it.
 *
 * groundY is the row a standing piece's feet land on. Get it wrong and props
 * float in the air or sink through the floor, and nothing else in the harness
 * can see that — it only shows up to a human looking at the board. This makes
 * all of them checkable in one image.
 *
 *   node scripts/qa-scene-ground.mjs [--only=name,name]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BG = path.join(ROOT, 'public', 'assets', '08_backgrounds');
const OUT = path.join(ROOT, 'tmp', 'scene-ground-qa.jpg');
const COLS = 2;
const TILE_W = 640;
const TILE_H = 295;
const LABEL_H = 22;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const manifest = JSON.parse(fs.readFileSync(path.join(BG, 'manifest.json'), 'utf8'));
const only = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const scenes = Object.entries(manifest.scenes)
  .filter(([name]) => !only.length || only.includes(name))
  .map(([name, s]) => ({ name, ...s }));

const rows = Math.ceil(scenes.length / COLS);
const boardH = manifest.board.height;

const cells = scenes
  .map((s) => {
    const src = `img/${s.file}`;
    const linePct = (s.groundY / boardH) * 100;
    return `<div class="cell">
      <div class="label">${s.name} — groundY ${s.groundY}</div>
      <div class="shot" style="background-image:url('${src}')">
        <div class="line" style="top:${linePct}%"></div>
        <div class="foot" style="top:${linePct}%"></div>
      </div>
    </div>`;
  })
  .join('');

const html = `<style>
  html,body{margin:0;background:#0f172a;font:600 13px/1 system-ui,sans-serif}
  .grid{display:grid;grid-template-columns:repeat(${COLS},${TILE_W}px)}
  .cell{width:${TILE_W}px}
  .label{height:${LABEL_H}px;display:flex;align-items:center;padding:0 8px;color:#e2e8f0;background:#1e293b}
  .shot{position:relative;width:${TILE_W}px;height:${TILE_H}px;background-size:100% 100%}
  .line{position:absolute;left:0;right:0;height:2px;background:#ef4444;box-shadow:0 0 0 1px rgba(255,255,255,.6)}
  /* a 96px piece standing on the line, to scale, so "does this look planted" is answerable */
  .foot{position:absolute;left:50%;width:48px;height:48px;margin-left:-24px;margin-top:-48px;
        border:2px solid #22d3ee;background:rgba(34,211,238,.25)}
</style><div class="grid">${cells}</div>`;

// Served from inside the asset folder: a page loaded from about:blank cannot
// read file:// siblings, so the relative img/ paths would come up empty.
const pagePath = path.join(BG, '_ground-qa.html');
fs.writeFileSync(pagePath, html);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: TILE_W * COLS, height: rows * (TILE_H + LABEL_H) },
});
try {
  await page.goto(`file:///${pagePath.replace(/\\/g, '/')}`);
  await page.waitForLoadState('load');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, quality: 88, type: 'jpeg' });
} finally {
  await browser.close();
  fs.rmSync(pagePath, { force: true });
}

console.log(`${scenes.length} scenes → ${path.relative(ROOT, OUT)}`);
console.log('Red line = groundY. Cyan box = a piece standing on it, to scale.');
