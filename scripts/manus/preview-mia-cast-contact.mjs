/**
 * Build a single contact-sheet preview of all 21 Mia cast cutouts.
 * Rows = emotions (neutral, happy, worried); cols = poses (idle…reach).
 *
 *   node scripts/manus/preview-mia-cast-contact.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const OUT = path.join(ROOT, 'tmp/manus-story-cast-mia-pilot/mia-cast-21-preview.jpg');
const POSES = ['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach'];
const EMOTIONS = ['neutral', 'happy', 'worried'];

const cells = [];
for (const emotion of EMOTIONS) {
  for (const pose of POSES) {
    const key = `cast-mia-${pose}-${emotion}`;
    const file = path.join(IMG, `${key}.png`);
    if (!fs.existsSync(file)) throw new Error(`missing ${key}`);
    cells.push({
      key,
      pose,
      emotion,
      dataUrl: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`,
    });
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#1a1a1a;font-family:system-ui,sans-serif;color:#eee">
<canvas id="c"></canvas>
<script>
window.CELLS = ${JSON.stringify(cells)};
window.POSES = ${JSON.stringify(POSES)};
window.EMOTIONS = ${JSON.stringify(EMOTIONS)};
</script></body></html>`);

const dataUrl = await page.evaluate(async () => {
  const cellW = 200;
  const cellH = 260;
  const labelH = 28;
  const headerH = 56;
  const leftLabel = 88;
  const cols = window.POSES.length;
  const rows = window.EMOTIONS.length;
  const w = leftLabel + cols * cellW + 24;
  const h = headerH + rows * (cellH + labelH) + 24;
  const canvas = document.getElementById('c');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = '600 22px system-ui';
  ctx.fillText('Mia story cast pilot — 7 poses × 3 emotions (who:mia)', 16, 34);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#aaa';
  ctx.fillText('base: family-girl · pack: story-cast · hold = empty hands · viewer-right', 16, 50);

  for (let c = 0; c < cols; c++) {
    ctx.fillStyle = '#ddd';
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(window.POSES[c], leftLabel + c * cellW + cellW / 2, headerH - 6);
  }
  ctx.textAlign = 'left';

  const load = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

  let i = 0;
  for (let r = 0; r < rows; r++) {
    const y0 = headerH + r * (cellH + labelH);
    ctx.fillStyle = '#ddd';
    ctx.font = '600 13px system-ui';
    ctx.fillText(window.EMOTIONS[r], 12, y0 + cellH / 2);
    for (let c = 0; c < cols; c++) {
      const cell = window.CELLS[i++];
      const x = leftLabel + c * cellW;
      const y = y0;
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
      const img = await load(cell.dataUrl);
      const pad = 10;
      const maxW = cellW - 8 - pad * 2;
      const maxH = cellH - 8 - pad * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = x + 4 + (cellW - 8 - dw) / 2;
      const dy = y + 4 + (cellH - 8 - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.fillStyle = '#888';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(cell.key.replace('cast-mia-', ''), x + cellW / 2, y + cellH + 14);
      ctx.textAlign = 'left';
    }
  }
  return canvas.toDataURL('image/jpeg', 0.92);
});

const m = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(m[1], 'base64'));
await browser.close();
console.log(OUT);
