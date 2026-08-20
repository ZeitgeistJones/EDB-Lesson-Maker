/**
 * Per-cell white-plate → #000000. Unlike sheet-white-to-blackfield (edge-only),
 * this seeds every cell border so white islands inside a black grid still convert.
 * Labels on white plates go away after the later black-key.
 *
 *   node scripts/sheet-cell-plates-to-blackfield.mjs [--grid=4x4] [--white-min=252] [--in-place] a.png
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const inPlace = process.argv.includes('--in-place');
const gridArg = (process.argv.find((a) => a.startsWith('--grid=')) || '--grid=4x4').slice(7);
const [rows, cols] = gridArg.split('x').map(Number);
const whiteArg = process.argv.find((a) => a.startsWith('--white-min='));
const WHITE_MIN = whiteArg ? Number(whiteArg.split('=')[1]) : 252;
const files = process.argv.slice(2).filter((a) => a && !a.startsWith('--'));
if (!files.length || !rows || !cols) {
  console.error('usage: node scripts/sheet-cell-plates-to-blackfield.mjs [--grid=4x4] [--white-min=252] [--in-place] sheet.png');
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const raw of files) {
  const src = path.resolve(raw);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  const orig = src.replace(/(\.png)$/i, '.orig.png');
  if (inPlace && !fs.existsSync(orig)) fs.copyFileSync(src, orig);
  const readFrom = inPlace && fs.existsSync(orig) ? orig : src;
  const dest = inPlace ? src : src.replace(/(\.png)$/i, '-blackfield$1');
  const b64 = fs.readFileSync(readFrom).toString('base64');
  const result = await page.evaluate(
    async ({ dataUrl, WHITE_MIN, rows, cols }) => {
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
      const fillable = (i) => {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const whitePlate = r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN;
        const nearWhiteHalo = Math.min(r, g, b) >= 220 && chroma < 22;
        const black = r < 40 && g < 40 && b < 40;
        const greyGutter = chroma < 16 && r >= 40 && r <= 230;
        return whitePlate || nearWhiteHalo || black || greyGutter;
      };
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const p = y * w + x;
        if (seen[p]) return;
        if (!fillable(p * 4)) return;
        seen[p] = 1;
        q.push(p);
      };
      const cw = w / cols;
      const ch = h / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x0 = Math.floor(col * cw);
          const y0 = Math.floor(row * ch);
          const x1 = Math.floor((col + 1) * cw) - 1;
          const y1 = Math.floor((row + 1) * ch) - 1;
          for (let x = x0; x <= x1; x++) {
            push(x, y0);
            push(x, y1);
          }
          for (let y = y0; y <= y1; y++) {
            push(x0, y);
            push(x1, y);
          }
        }
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
    },
    { dataUrl: `data:image/png;base64,${b64}`, WHITE_MIN, rows, cols }
  );
  const m = result.png.match(/^data:image\/png;base64,(.+)$/);
  fs.writeFileSync(dest, Buffer.from(m[1], 'base64'));
  console.log(JSON.stringify({ dest, filled: result.filled, w: result.w, h: result.h }));
}

await browser.close();
