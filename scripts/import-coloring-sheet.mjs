/**
 * Import a ChatGPT NxN coloring-page contact sheet (white bg, black outlines).
 * Crops cells with a small inset (drops hairline gutters). Does NOT chroma-key —
 * coloring pages need the white fill for crayon work.
 *
 *   node scripts/import-coloring-sheet.mjs assets-inbox/foo.png --grid=2x2 \
 *     --names=castle,helmet,dragon,gate [--pack=castle]
 *
 * Writes PNGs to public/assets/10_coloring/img/ and merges manifest.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'public', 'assets', '10_coloring');
const IMG = path.join(PACK, 'img');
const MANIFEST = path.join(PACK, 'manifest.json');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function parseGrid(s) {
  const m = String(s || '2x2').match(/^(\d+)x(\d+)$/i);
  if (!m) throw new Error(`bad --grid=${s}`);
  return { rows: Number(m[1]), cols: Number(m[2]) };
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) {
    return { version: 1, outlines: {} };
  }
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

async function main() {
  const srcArg = process.argv[2];
  if (!srcArg || srcArg.startsWith('--')) {
    console.error(
      'Usage: node scripts/import-coloring-sheet.mjs <sheet.png> --grid=2x2 --names=a,b,c,d [--pack=theme] [--skip=1,3]'
    );
    process.exit(1);
  }
  const src = path.isAbsolute(srcArg) ? srcArg : path.join(ROOT, srcArg);
  if (!fs.existsSync(src)) {
    console.error('Missing', src);
    process.exit(1);
  }

  const { rows, cols } = parseGrid(arg('grid', '2x2'));
  const cellCount = rows * cols;
  const names = arg('names', '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);
  if (names.length !== cellCount) {
    console.error(`--names needs exactly ${cellCount} slugs, got ${names.length}`);
    process.exit(1);
  }
  const skip = new Set(
    arg('skip', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
  );
  const pack = arg('pack', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const insetFrac = Number(arg('inset', '0.04'));

  fs.mkdirSync(IMG, { recursive: true });
  const manifest = loadManifest();
  if (!manifest.outlines) manifest.outlines = {};

  const buf = fs.readFileSync(src);
  const b64 = buf.toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

  const crops = await page.evaluate(
    async ({ b64, rows, cols, insetFrac }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('image load failed'));
      });
      const cellW = Math.floor(img.naturalWidth / cols);
      const cellH = Math.floor(img.naturalHeight / rows);
      const insetX = Math.round(cellW * insetFrac);
      const insetY = Math.round(cellH * insetFrac);
      const out = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sx = c * cellW + insetX;
          const sy = r * cellH + insetY;
          const sw = cellW - insetX * 2;
          const sh = cellH - insetY * 2;
          const canvas = document.createElement('canvas');
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sw, sh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          out.push({
            index: r * cols + c + 1,
            r,
            c,
            w: sw,
            h: sh,
            dataUrl: canvas.toDataURL('image/png'),
          });
        }
      }
      return { sheetW: img.naturalWidth, sheetH: img.naturalHeight, cellW, cellH, out };
    },
    { b64, rows, cols, insetFrac }
  );

  await browser.close();

  console.log(
    `Sheet ${crops.sheetW}x${crops.sheetH} → cells ~${crops.cellW}x${crops.cellH} (inset ${(insetFrac * 100).toFixed(0)}%)`
  );

  for (let i = 0; i < crops.out.length; i++) {
    const cell = crops.out[i];
    const name = names[i];
    if (skip.has(cell.index) || skip.has(i + 1)) {
      console.log(`  skip #${cell.index} ${name}`);
      continue;
    }
    const file = `${name}.png`;
    const dest = path.join(IMG, file);
    fs.writeFileSync(dest, Buffer.from(cell.dataUrl.split(',')[1], 'base64'));
    manifest.outlines[name] = {
      file,
      path: `assets/10_coloring/img/${file}`,
      w: cell.w,
      h: cell.h,
      pack,
      source: path.basename(src),
    };
    console.log(`  #${cell.index} ${name} ${cell.w}x${cell.h} → ${file}`);
  }

  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Wrote', path.relative(ROOT, MANIFEST));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
