/**
 * Convert Mia happy sheet (white cells + black gutters) to black-field via Playwright canvas.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = path.join(ROOT, 'tmp/manus-story-cast-mia-pilot/sheets/02-mia_happy_3x3.png');
const dest = path.join(ROOT, 'tmp/manus-story-cast-mia-pilot/sheets/02-mia_happy_3x3-blackfield.png');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const b64 = fs.readFileSync(src).toString('base64');
const result = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = dataUrl;
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const seen = new Uint8Array(w * h);
  const q = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const white = r > 228 && g > 228 && b > 228;
    const black = r < 40 && g < 40 && b < 40;
    if (!white && !black) return;
    seen[p] = 1;
    q.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  let qi = 0;
  while (qi < q.length) {
    const p = q[qi++];
    const x = p % w;
    const y = (p / w) | 0;
    const i = p * 4;
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(imageData, 0, 0);
  return { filled: q.length, w, h, png: c.toDataURL('image/png') };
}, `data:image/png;base64,${b64}`);

const m = result.png.match(/^data:image\/png;base64,(.+)$/);
fs.writeFileSync(dest, Buffer.from(m[1], 'base64'));
await browser.close();
console.log(JSON.stringify({ dest, filled: result.filled, w: result.w, h: result.h }));
