/**
 * Flood white/near-white plates (and existing black gutters) from the sheet
 * edge to pure #000000 so import-sheet can key a real cutout.
 *
 *   node scripts/sheet-white-to-blackfield.mjs sheet.png
 *   node scripts/sheet-white-to-blackfield.mjs --in-place a.png b.png
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const inPlace = process.argv.includes('--in-place');
const whiteArg = process.argv.find((a) => a.startsWith('--white-min='));
const WHITE_MIN = whiteArg ? Number(whiteArg.split('=')[1]) : 228;
const files = process.argv.slice(2).filter((a) => a && !a.startsWith('--'));
if (!files.length) {
  console.error('usage: node scripts/sheet-white-to-blackfield.mjs [--in-place] [--white-min=228] sheet.png [more.png]');
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

for (const raw of files) {
  const src = path.resolve(raw);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  const dest = inPlace
    ? src
    : src.replace(/(\.png)$/i, '-blackfield$1');
  if (inPlace) {
    const orig = src.replace(/(\.png)$/i, '.orig.png');
    if (!fs.existsSync(orig)) fs.copyFileSync(src, orig);
  }
  const b64 = fs.readFileSync(inPlace && fs.existsSync(src.replace(/(\.png)$/i, '.orig.png'))
    ? src.replace(/(\.png)$/i, '.orig.png')
    : src).toString('base64');
  const result = await page.evaluate(async ({ dataUrl, WHITE_MIN }) => {
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
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const whitePlate = r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN;
      const black = r < 40 && g < 40 && b < 40;
      const greyGutter = chroma < 14 && r >= 40 && r <= 210 && g >= 40 && g <= 210 && b >= 40 && b <= 210;
      if (!whitePlate && !black && !greyGutter) return;
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
  }, { dataUrl: `data:image/png;base64,${b64}`, WHITE_MIN });
  const m = result.png.match(/^data:image\/png;base64,(.+)$/);
  fs.writeFileSync(dest, Buffer.from(m[1], 'base64'));
  results.push({ dest, filled: result.filled, w: result.w, h: result.h });
  console.log(JSON.stringify(results[results.length - 1]));
}

await browser.close();
console.log(JSON.stringify({ count: results.length }, null, 2));
