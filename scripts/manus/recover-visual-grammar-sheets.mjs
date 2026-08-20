/**
 * Local recovery for visual-grammar harvest sheets.
 * Preserves *.orig.png. Does not regenerate Manus art.
 *
 *   node scripts/manus/recover-visual-grammar-sheets.mjs
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { ROOT } from './client.mjs';

const STOCKPILE = path.join(ROOT, 'harvested/manus-visual-grammar-stockpile');
const WHITE_MIN = 228;

const WHITE_TO_BLACK = [
  ['vg1-p0-core', '02.png'],
  ['vg1-p0-core', '03.png'],
  ['vg2-p0-stagecraft', '03.png'],
  ['vg2-p0-stagecraft', '05.png'],
  ['vg2-p0-stagecraft', '06.png'],
  ['vg2-p0-stagecraft', '07.png'],
];

function origPath(file) {
  return file.replace(/(\.png)$/i, '.orig.png');
}

function preserve(file) {
  const orig = origPath(file);
  if (!fs.existsSync(orig)) fs.copyFileSync(file, orig);
  return orig;
}

function bufFromDataUrl(dataUrl) {
  const m = String(dataUrl).match(/^data:image\/png;base64,(.+)$/);
  if (!m) throw new Error('no png data url');
  return Buffer.from(m[1], 'base64');
}

async function whiteToBlack(page, file) {
  const src = preserve(file);
  const b64 = fs.readFileSync(src).toString('base64');
  const result = await page.evaluate(async ({ dataUrl, WHITE_MIN }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const seen = new Uint8Array(w * h);
    const queue = [];
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
      const greyGutter = chroma < 14 && r >= 40 && r <= 230;
      if (!whitePlate && !black && !greyGutter) return;
      seen[p] = 1;
      queue.push(p);
    };
    for (let x = 0; x < w; x += 1) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y += 1) { push(0, y); push(w - 1, y); }
    let qi = 0;
    while (qi < queue.length) {
      const p = queue[qi++];
      const x = p % w;
      const y = (p / w) | 0;
      const i = p * 4;
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    ctx.putImageData(imageData, 0, 0);
    return { filled: queue.length, png: canvas.toDataURL('image/png') };
  }, { dataUrl: `data:image/png;base64,${b64}`, WHITE_MIN });
  fs.writeFileSync(file, bufFromDataUrl(result.png));
  return result.filled;
}

async function cropLabeledComics(page, file) {
  const src = preserve(file);
  const b64 = fs.readFileSync(src).toString('base64');
  const result = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const cols = 3;
    const rows = 4;
    const cellW = img.naturalWidth / cols;
    const cellH = img.naturalHeight / rows;
    const keepH = cellH * 0.72;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = Math.round(rows * keepH);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        ctx.drawImage(
          img,
          c * cellW, r * cellH, cellW, keepH,
          c * cellW, r * keepH, cellW, keepH,
        );
      }
    }
    return canvas.toDataURL('image/png');
  }, `data:image/png;base64,${b64}`);
  fs.writeFileSync(file, bufFromDataUrl(result));
}

async function composeMop(page) {
  const file = path.join(STOCKPILE, 'vg-mop-false-safety/sheets/01.png');
  const src = preserve(file);
  const b64 = fs.readFileSync(src).toString('base64');
  const result = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const cell = 512;
    const canvas = document.createElement('canvas');
    canvas.width = cell * 2;
    canvas.height = cell;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const crops = [
      { x: 0.04, y: 0.03, ww: 0.42, hh: 0.30 },
      { x: 0.54, y: 0.03, ww: 0.42, hh: 0.30 },
    ];
    for (let i = 0; i < 2; i += 1) {
      const crop = crops[i];
      const sx = Math.round(crop.x * w);
      const sy = Math.round(crop.y * h);
      const sw = Math.round(crop.ww * w);
      const sh = Math.round(crop.hh * h);
      const pad = 36;
      const scale = Math.min((cell - pad * 2) / sw, (cell - pad * 2) / sh);
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);
      const dx = i * cell + Math.round((cell - dw) / 2);
      const dy = Math.round((cell - dh) / 2);
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      const imageData = ctx.getImageData(i * cell, 0, cell, cell);
      const data = imageData.data;
      const seen = new Uint8Array(cell * cell);
      const queue = [];
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= cell || y >= cell) return;
        const p = y * cell + x;
        if (seen[p]) return;
        const o = p * 4;
        const r = data[o]; const g = data[o + 1]; const b = data[o + 2];
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        if (!((r >= 232 && g >= 232 && b >= 232) || (chroma < 14 && r >= 150))) return;
        seen[p] = 1;
        queue.push(p);
      };
      for (let x = 0; x < cell; x += 1) { push(x, 0); push(x, cell - 1); }
      for (let y = 0; y < cell; y += 1) { push(0, y); push(cell - 1, y); }
      let qi = 0;
      while (qi < queue.length) {
        const p = queue[qi++];
        const x = p % cell;
        const y = (p / cell) | 0;
        const o = p * 4;
        data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 255;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
      }
      ctx.putImageData(imageData, i * cell, 0);
      const imageData2 = ctx.getImageData(i * cell, 0, cell, cell);
      const d2 = imageData2.data;
      for (let p = 0; p < d2.length; p += 4) {
        if (d2[p] >= 246 && d2[p + 1] >= 246 && d2[p + 2] >= 246) {
          d2[p] = 0; d2[p + 1] = 0; d2[p + 2] = 0; d2[p + 3] = 255;
        }
      }
      ctx.putImageData(imageData2, i * cell, 0);
    }
    return canvas.toDataURL('image/png');
  }, `data:image/png;base64,${b64}`);
  fs.writeFileSync(file, bufFromDataUrl(result));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const report = [];
  for (const [wave, name] of WHITE_TO_BLACK) {
    const file = path.join(STOCKPILE, wave, 'sheets', name);
    const filled = await whiteToBlack(page, file);
    report.push({ wave, name, action: 'white-to-black', filled });
  }
  const comicsC = path.join(STOCKPILE, 'vg1-p0-core/sheets/06.png');
  await cropLabeledComics(page, comicsC);
  report.push({ wave: 'vg1-p0-core', name: '06.png', action: 'crop-baked-labels' });
  await composeMop(page);
  report.push({ wave: 'vg-mop-false-safety', name: '01.png', action: 'compose-1x2-black' });
  await browser.close();
  const out = path.join(STOCKPILE, 'local-recovery.json');
  fs.writeFileSync(out, JSON.stringify({ updated_at: new Date().toISOString(), report }, null, 2));
  console.log(JSON.stringify({ recovered: report.length, out }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
