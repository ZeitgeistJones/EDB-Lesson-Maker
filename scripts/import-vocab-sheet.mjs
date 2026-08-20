/**
 * Import a ChatGPT 3x3 vocab-icon contact sheet into 07_vocab-pack.
 *
 * Vocab icons sit on white (not black). This keys near-white to alpha, trims,
 * and fits each cell into a 256x256 PNG so dock art matches the Twemoji pack
 * size. Entries are marked source:"generated" so assets:icons won't delete them.
 *
 *   node scripts/import-vocab-sheet.mjs sheet.png --sheet --grid=3x3 \
 *     --names=doctor,nurse,patient,diagnosis,clumsy,table,appointment,sick,stethoscope
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'public', 'assets', '07_vocab-pack');
const IMG = path.join(PACK, 'img');
const INDEX = path.join(PACK, 'index.json');
const SIZE = 256;

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

function parseGrid(s) {
  const m = String(s || '3x3').match(/^(\d+)x(\d+)$/i);
  if (!m) throw new Error(`bad --grid=${s}`);
  return { rows: Number(m[1]), cols: Number(m[2]) };
}

async function main() {
  const srcArg = process.argv[2];
  if (!srcArg || srcArg.startsWith('--')) {
    console.error('Usage: node scripts/import-vocab-sheet.mjs <sheet.png> --sheet --grid=3x3 --names=a,b,...');
    process.exit(1);
  }
  const src = path.isAbsolute(srcArg) ? srcArg : path.join(ROOT, srcArg);
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }
  if (!flag('sheet')) {
    console.error('Only --sheet mode is supported for now.');
    process.exit(1);
  }

  const { rows, cols } = parseGrid(arg('grid', '3x3'));
  const names = arg('names', '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);
  if (names.length !== rows * cols) {
    console.error(`--names needs exactly ${rows * cols} slugs, got ${names.length}`);
    process.exit(1);
  }
  // Manus grey gutters often sit ~200–230; 235 was too strict and left full-cell white.
  const whiteMin = Number(arg('white-min', '210'));
  const whiteChroma = Number(arg('white-chroma', '28'));
  const gutterInset = Number(arg('gutter-inset', '4'));

  fs.mkdirSync(IMG, { recursive: true });
  const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : {};
  const buf = fs.readFileSync(src);
  const b64 = buf.toString('base64');
  const ext = path.extname(src).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

  const results = await page.evaluate(
    async ({ b64, mime, rows, cols, size, whiteMin, whiteChroma, gutterInset }) => {
      const img = new Image();
      img.src = `data:${mime};base64,${b64}`;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('image load failed'));
      });

      const cellW = Math.floor(img.naturalWidth / cols);
      const cellH = Math.floor(img.naturalHeight / rows);
      const out = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = c * cellW;
          const sy = r * cellH;
          // Drop grey grid gutters before keying — equal split alone leaves divider
          // ink that seals flood-fill and yields 100% opaque cells.
          const insetX = Math.max(0, Math.round(cellW * 0.02));
          const insetY = Math.max(0, Math.round(cellH * 0.02));
          const cropW = Math.max(8, cellW - insetX * 2);
          const cropH = Math.max(8, cellH - insetY * 2);
          const slice = document.createElement('canvas');
          slice.width = cropW;
          slice.height = cropH;
          const sctx = slice.getContext('2d');
          sctx.drawImage(
            img,
            sx + insetX,
            sy + insetY,
            cropW,
            cropH,
            0,
            0,
            cropW,
            cropH
          );
          const data = sctx.getImageData(0, 0, cropW, cropH);
          const px = data.data;

          // Flood-fill near-white from the cell border (+ inset ring past grey gutters).
          // Interior whites (lab coats, plates, napkins) must stay opaque.
          const nearWhite = (i) => {
            const r = px[i];
            const g = px[i + 1];
            const b = px[i + 2];
            return (
              Math.min(r, g, b) >= whiteMin &&
              Math.max(r, g, b) - Math.min(r, g, b) <= whiteChroma
            );
          };
          const idx = (x, y) => (y * cropW + x) * 4;
          const seen = new Uint8Array(cropW * cropH);
          const stack = [];
          const push = (x, y) => {
            if (x < 0 || y < 0 || x >= cropW || y >= cropH) return;
            const p = y * cropW + x;
            if (seen[p]) return;
            if (!nearWhite(idx(x, y))) return;
            seen[p] = 1;
            stack.push(p);
          };
          const seedRing = (inset) => {
            for (let x = inset; x < cropW - inset; x++) {
              push(x, inset);
              push(x, cropH - 1 - inset);
            }
            for (let y = inset; y < cropH - inset; y++) {
              push(inset, y);
              push(cropW - 1 - inset, y);
            }
          };
          seedRing(0);
          for (let g = 1; g <= gutterInset; g++) seedRing(g);
          while (stack.length) {
            const p = stack.pop();
            const x = p % cropW;
            const y = (p - x) / cropW;
            px[p * 4 + 3] = 0;
            push(x + 1, y);
            push(x - 1, y);
            push(x, y + 1);
            push(x, y - 1);
          }
          sctx.putImageData(data, 0, 0);

          // Trim to opaque bbox
          let minX = cropW;
          let minY = cropH;
          let maxX = 0;
          let maxY = 0;
          for (let y = 0; y < cropH; y++) {
            for (let x = 0; x < cropW; x++) {
              if (px[(y * cropW + x) * 4 + 3] < 16) continue;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
          if (maxX < minX) {
            out.push({ empty: true });
            continue;
          }

          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          const pad = Math.round(size * 0.08);
          const fit = Math.min((size - pad * 2) / bw, (size - pad * 2) / bh);
          const dw = Math.max(1, Math.round(bw * fit));
          const dh = Math.max(1, Math.round(bh * fit));
          const dx = Math.round((size - dw) / 2);
          const dy = Math.round((size - dh) / 2);

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(slice, minX, minY, bw, bh, dx, dy, dw, dh);
          out.push({
            empty: false,
            png: canvas.toDataURL('image/png'),
            coverage: Number((((bw * bh) / (cellW * cellH)) * 100).toFixed(1)),
          });
        }
      }
      return out;
    },
    { b64, mime, rows, cols, size: SIZE, whiteMin, whiteChroma, gutterInset }
  );

  await browser.close();

  let ok = 0;
  function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* spin — Windows sometimes locks PNGs briefly while indexing */
    }
  }
  function writeRetry(dest, buf, tries = 8) {
    let last;
    for (let i = 0; i < tries; i++) {
      try {
        fs.writeFileSync(dest, buf);
        return;
      } catch (err) {
        last = err;
        sleepSync(150 * (i + 1));
      }
    }
    throw last;
  }

  names.forEach((name, i) => {
    const cell = results[i];
    if (!cell || cell.empty) {
      console.log(`SKIP  ${name} — empty cell`);
      return;
    }
    const file = `${name}.png`;
    const dest = path.join(IMG, file);
    writeRetry(dest, Buffer.from(cell.png.split(',')[1], 'base64'));
    index[name] = {
      file,
      emoji: index[name]?.emoji || '',
      source: 'generated',
    };
    ok += 1;
    console.log(`OK    ${name}  coverage ${cell.coverage}% → ${file}`);
  });

  // Stable key order
  const ordered = {};
  for (const k of Object.keys(index).sort()) ordered[k] = index[k];
  writeRetry(INDEX, Buffer.from(`${JSON.stringify(ordered, null, 1)}\n`, 'utf8'));
  console.log(`\n${ok}/${names.length} icons written. index.json now ${Object.keys(ordered).length} words.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
