/**
 * Turn a generated image into a board-ready background.
 *
 * Generated art comes back near 3:2; the board is 1280x590. The existing 40
 * scenes were made by stretching the whole frame to board size rather than
 * cropping it, so that is the default here too — it keeps the ceiling and the
 * floor the generator composed, and a new scene that was cropped instead sits
 * visibly differently next to the rest.
 *
 *   node scripts/import-background.mjs assets-inbox/hotel.png --name=hotel-lobby \
 *     --category=commercial --tags=hotel,reception,travel --ground=250
 *
 * Options:
 *   --name      manifest key and output filename (default: input filename)
 *   --ground    y pixel where a standing piece's base belongs (default: guessed)
 *   --fit       stretch (default, matches the existing bank) or crop
 *   --top       0..1, where to take a crop from, only used with --fit=crop
 *   --grid      RxC when the image is a contact sheet of several scenes
 *   --cell      row,col (0-indexed) of the panel to take from that grid
 *   --category  manifest category
 *   --tags      comma-separated manifest tags
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', '08_backgrounds', 'img');
const BOARD_W = 1280;
const BOARD_H = 590;

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function main() {
  const input = process.argv[2];
  if (!input || input.startsWith('--')) {
    console.error('usage: node scripts/import-background.mjs <image> [--name=key] [--ground=250]');
    process.exit(1);
  }
  const src = path.resolve(ROOT, input);
  if (!fs.existsSync(src)) {
    console.error(`No such file: ${src}`);
    process.exit(1);
  }
  const ext = path.extname(src).toLowerCase();
  if (!MIME[ext]) {
    console.error(`Unsupported type ${ext} — use png, jpg or webp`);
    process.exit(1);
  }

  const name = arg('name', path.basename(src, ext)).replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const topBias = Number(arg('top', '0.55'));
  const [gridRows, gridCols] = arg('grid', '1x1').split('x').map(Number);
  const [cellRow, cellCol] = arg('cell', '0,0').split(',').map(Number);
  const dataUrl = `data:${MIME[ext]};base64,${fs.readFileSync(src).toString('base64')}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ dataUrl: url, w, h, bias, rows: gr, cols: gc, row, col, fit }) => {
      const img = new Image();
      img.src = url;
      await img.decode();

      // A contact sheet is treated as its own little image: take the panel
      // first, then everything below works on the panel's own pixels.
      const panelW = Math.floor(img.width / gc);
      const panelH = Math.floor(img.height / gr);
      const panelX = col * panelW;
      const panelY = row * panelH;

      let cx = panelX;
      let cy = panelY;
      let cw = panelW;
      let ch = panelH;
      if (fit === 'crop') {
        const aspect = w / h;
        ch = Math.round(cw / aspect);
        if (ch > panelH) {
          ch = panelH;
          cw = Math.round(ch * aspect);
        }
        cx = panelX + Math.round((panelW - cw) / 2);
        cy = panelY + Math.round((panelH - ch) * Math.min(1, Math.max(0, bias)));
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, w, h);

      // Ground line: walking down from just above the middle, the first row
      // whose average brightness jumps is the wall/floor junction. Taking the
      // FIRST jump rather than the biggest matters — the biggest is often
      // furniture or a skyline further down the frame.
      const px = ctx.getImageData(0, 0, w, h).data;
      const lum = new Float64Array(h);
      for (let y = 0; y < h; y++) {
        let sum = 0;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        }
        lum[y] = sum / w;
      }
      const from = Math.round(h * 0.35);
      let groundY = null;
      for (let y = from + 1; y < h; y++) {
        if (Math.abs(lum[y] - lum[y - 1]) > 2.5) {
          groundY = y;
          break;
        }
      }
      return {
        png: canvas.toDataURL('image/png'),
        source: { width: img.width, height: img.height },
        panel: { width: panelW, height: panelH },
        crop: { x: cx, y: cy, width: cw, height: ch },
        guessedGround: groundY,
      };
    },
    {
      dataUrl,
      w: BOARD_W,
      h: BOARD_H,
      bias: topBias,
      rows: gridRows,
      cols: gridCols,
      row: cellRow,
      col: cellCol,
      fit: arg('fit', 'stretch'),
    }
  );
  await browser.close();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = `${name}.png`;
  fs.writeFileSync(
    path.join(OUT_DIR, file),
    Buffer.from(result.png.split(',')[1], 'base64')
  );

  const ground = Number(arg('ground', String(result.guessedGround ?? Math.round(BOARD_H * 0.62))));
  const tags = arg('tags', '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const upscale = (BOARD_W / result.crop.width).toFixed(2);
  console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, file))} (${BOARD_W}x${BOARD_H})`);
  console.log(
    `Source ${result.source.width}x${result.source.height}, panel ${result.panel.width}x${result.panel.height}, ` +
      `took ${result.crop.width}x${result.crop.height} at y=${result.crop.y}, scaled ${upscale}x`
  );
  if (Number(upscale) > 1.35) {
    console.log(
      `  NOTE ${upscale}x upscale — flat art survives this better than photos, but check edges for softness`
    );
  }
  if (result.guessedGround == null && !arg('ground')) {
    console.log('  NOTE no ground line found — pass --ground= after looking at the image');
  }
  console.log(`Ground line guessed at y=${result.guessedGround}${arg('ground') ? ` (overridden to ${ground})` : ''}`);
  console.log('\nPaste into public/assets/08_backgrounds/manifest.json under "scenes":\n');
  console.log(
    `${JSON.stringify(
      {
        [name]: {
          file,
          groundY: ground,
          category: arg('category', 'TODO'),
          tags: tags.length ? tags : ['TODO'],
        },
      },
      null,
      2
    )}`
  );
  console.log(
    '\nThen: npm run test:bg-picks  (picker sanity)  and  npm run quality:full  (board bake)'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
