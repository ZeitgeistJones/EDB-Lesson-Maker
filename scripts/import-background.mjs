/**
 * Turn a generated image into a board-ready background.
 *
 * ChatGPT hands back 1536x1024; the board is 1280x590. This crops to the board
 * aspect, keeping the lower part of the frame so the floor survives, resizes,
 * and prints the manifest entry to paste into 08_backgrounds/manifest.json.
 *
 *   node scripts/import-background.mjs assets-inbox/hotel.png --name=hotel-lobby \
 *     --category=commercial --tags=hotel,reception,travel --ground=250
 *
 * Options:
 *   --name      manifest key and output filename (default: input filename)
 *   --ground    y pixel where a standing piece's base belongs (default: guessed)
 *   --top       0..1, how far down the source to take the crop (default 0.55)
 *   --category  manifest category
 *   --tags      comma-separated manifest tags
 *   --preview   also write tmp/import-preview.png with the ground line drawn
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
  const dataUrl = `data:${MIME[ext]};base64,${fs.readFileSync(src).toString('base64')}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ dataUrl: url, w, h, bias }) => {
      const img = new Image();
      img.src = url;
      await img.decode();

      // Widest crop the source allows at board aspect, taken low in the frame so
      // the floor stays in shot; ceilings are the expendable part.
      const aspect = w / h;
      let cw = img.width;
      let ch = Math.round(cw / aspect);
      if (ch > img.height) {
        ch = img.height;
        cw = Math.round(ch * aspect);
      }
      const cx = Math.round((img.width - cw) / 2);
      const cy = Math.round((img.height - ch) * Math.min(1, Math.max(0, bias)));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, w, h);

      // Guess the ground line: the row in the lower half where colour changes
      // most sharply from the row above is usually the wall/floor junction.
      const rows = ctx.getImageData(0, 0, w, h).data;
      let bestY = Math.round(h * 0.55);
      let bestDelta = -1;
      for (let y = Math.round(h * 0.25); y < Math.round(h * 0.85); y++) {
        let delta = 0;
        for (let x = 0; x < w; x += 8) {
          const a = (y * w + x) * 4;
          const b = ((y - 1) * w + x) * 4;
          delta += Math.abs(rows[a] - rows[b]) + Math.abs(rows[a + 1] - rows[b + 1]) +
            Math.abs(rows[a + 2] - rows[b + 2]);
        }
        if (delta > bestDelta) {
          bestDelta = delta;
          bestY = y;
        }
      }
      return {
        png: canvas.toDataURL('image/png'),
        source: { width: img.width, height: img.height },
        crop: { x: cx, y: cy, width: cw, height: ch },
        guessedGround: bestY,
      };
    },
    { dataUrl, w: BOARD_W, h: BOARD_H, bias: topBias }
  );
  await browser.close();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = `${name}.png`;
  fs.writeFileSync(
    path.join(OUT_DIR, file),
    Buffer.from(result.png.split(',')[1], 'base64')
  );

  const ground = Number(arg('ground', String(result.guessedGround)));
  const tags = arg('tags', '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, file))} (${BOARD_W}x${BOARD_H})`);
  console.log(
    `Source ${result.source.width}x${result.source.height}, cropped ${result.crop.width}x${result.crop.height} at y=${result.crop.y}`
  );
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
