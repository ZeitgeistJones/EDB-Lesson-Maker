/**
 * Hero-size calibration — visual test only. Do NOT mass-generate heroes from this.
 *
 * Renders a 3×3 grid: representative play-surface heroes × three frame-height bands.
 * Dock props are composited ONTO the hero so we can judge usable play area.
 *
 * Bands (% of ClassIn board height H=590):
 *   small  ~52%  (50–55)
 *   medium ~62%  (60–65)  ← current bias
 *   large  ~72%  (70–75)
 *
 * Today’s fit kings use ~0.92 of stageH(~430) ≈ 67% of board — between medium and large.
 *
 *   node scripts/preview-hero-size-calibration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const OUT_DIR = path.join(ROOT, 'tmp', 'hero-size-calibration');
const BOARD_W = 1280;
const BOARD_H = 590;

const BANDS = [
  { id: 'small', label: 'small · 50–55%', pct: 0.525 },
  { id: 'medium', label: 'medium · 60–65%', pct: 0.625 },
  { id: 'large', label: 'large · 70–75%', pct: 0.725 },
];

/** Stand-ins for the three interactive-target shapes (existing bank art only). */
const HEROES = [
  {
    id: 'chest',
    label: 'treasure chest (open)',
    key: 'hide-chest-open',
    docks: ['cas-coin-stack', 'cas-gem', 'castle-key', 'cas-crown'],
  },
  {
    id: 'pack',
    label: 'open container (box stand-in; backpack open is keyed-dead)',
    key: 'hide-box-open',
    docks: ['apple', 'pencil', 'bind-open-book', 'cafe-takeout-cup'],
  },
  {
    id: 'mouth',
    label: 'feed / open-mouth target',
    key: 'dental-kid-open-mouth',
    docks: ['apple', 'bathroom-toothbrush', 'cafe-coffee-cup', 'circus-cotton-candy'],
  },
];

function resolveFile(key) {
  const p = path.join(IMG, `${key}.png`);
  if (!fs.existsSync(p)) throw new Error(`missing prop ${key}`);
  return p;
}

function dataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent('<!doctype html><canvas id="c"></canvas>');

const payload = {
  BOARD_W,
  BOARD_H,
  BANDS,
  HEROES: HEROES.map((h) => ({
    ...h,
    heroUrl: dataUrl(resolveFile(h.key)),
    dockUrls: h.docks.map((k) => ({ key: k, url: dataUrl(resolveFile(k)) })),
  })),
};

const result = await page.evaluate(async (P) => {
  const load = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('img fail'));
      img.src = src;
    });

  /** Quiet clinic-cool wash — painted, so calibration does not depend on BG pack checkout. */
  function paintQuietBg(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#d9e8ef');
    g.addColorStop(0.55, '#e8f1f4');
    g.addColorStop(1, '#cfe0e6');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  const cellPad = 10;
  const labelH = 36;
  const cols = P.BANDS.length;
  const rows = P.HEROES.length;
  const cellW = P.BOARD_W + cellPad * 2;
  const cellH = P.BOARD_H + labelH + cellPad * 2;
  const headerH = 72;
  const outW = cols * cellW + 24;
  const outH = headerH + rows * cellH + 24;
  const canvas = document.getElementById('c');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, outW, outH);
  ctx.fillStyle = '#f5f5f5';
  ctx.font = '600 22px system-ui';
  ctx.fillText('Hero-size calibration — pick a band before mass-generating kings', 16, 28);
  ctx.font = '13px system-ui';
  ctx.fillStyle = '#aaa';
  ctx.fillText(
    `Board ${P.BOARD_W}×${P.BOARD_H}. Bands = % of board height. Dock toys fixed ~96px, placed ON the hero play surface. Current fit kings ≈67% board.`,
    16,
    50
  );

  const cells = [];
  for (let r = 0; r < rows; r++) {
    const heroSpec = P.HEROES[r];
    const heroImg = await load(heroSpec.heroUrl);
    const dockImgs = [];
    for (const d of heroSpec.dockUrls) {
      dockImgs.push({ key: d.key, img: await load(d.url) });
    }
    for (let c = 0; c < cols; c++) {
      const band = P.BANDS[c];
      const ox = 12 + c * cellW;
      const oy = headerH + r * cellH;
      // board frame
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(ox, oy, cellW - 4, cellH - 4);
      paintQuietBg(ctx, ox + cellPad, oy + cellPad, P.BOARD_W, P.BOARD_H);

      // hero sized to band % of board height (fit mode — no flush crop)
      const targetH = Math.round(P.BOARD_H * band.pct);
      const aspect = heroImg.naturalWidth / heroImg.naturalHeight;
      let hw = Math.round(targetH * aspect);
      let hh = targetH;
      if (hw > P.BOARD_W * 0.92) {
        hw = Math.round(P.BOARD_W * 0.92);
        hh = Math.round(hw / aspect);
      }
      const hx = ox + cellPad + Math.round((P.BOARD_W - hw) / 2);
      // leave a thin top chrome strip; sit above dock strip (~160px)
      const dockStrip = 150;
      const stageBottom = oy + cellPad + P.BOARD_H - dockStrip;
      let hy = stageBottom - hh;
      const minY = oy + cellPad + 48;
      if (hy < minY) hy = minY;

      ctx.drawImage(heroImg, hx, hy, hw, hh);

      // dim dock strip so hero/play area reads clearly
      ctx.fillStyle = 'rgba(20,20,20,0.35)';
      ctx.fillRect(ox + cellPad, stageBottom, P.BOARD_W, dockStrip);

      // place 4 dock toys ON the hero (play-surface read), not only in the strip
      const toyMax = 96;
      const slots = [
        { fx: 0.28, fy: 0.42 },
        { fx: 0.5, fy: 0.55 },
        { fx: 0.72, fy: 0.4 },
        { fx: 0.45, fy: 0.72 },
      ];
      for (let i = 0; i < dockImgs.length && i < slots.length; i++) {
        const d = dockImgs[i];
        const da = d.img.naturalWidth / d.img.naturalHeight;
        // Cover-fit into a 96×96 box so thin pencils don't dominate.
        let tw;
        let th;
        if (da >= 1) {
          tw = 96;
          th = Math.round(96 / da);
        } else {
          th = 96;
          tw = Math.round(96 * da);
        }
        const tx = hx + Math.round(hw * slots[i].fx) - Math.round(tw / 2);
        const ty = hy + Math.round(hh * slots[i].fy) - Math.round(th / 2);
        ctx.drawImage(d.img, tx, ty, tw, th);
      }

      // also show same toys small in dock strip (grabability reference)
      let dx = ox + cellPad + 24;
      const dy = stageBottom + 28;
      for (const d of dockImgs) {
        const da = d.img.naturalWidth / d.img.naturalHeight;
        let tw;
        let th;
        if (da >= 1) {
          tw = 72;
          th = Math.round(72 / da);
        } else {
          th = 72;
          tw = Math.round(72 * da);
        }
        ctx.drawImage(d.img, dx, dy + Math.round((72 - th) / 2), tw, th);
        dx += 72 + 18;
      }

      // size readout
      const pctBoard = Math.round((hh / P.BOARD_H) * 100);
      const pctStage = Math.round((hh / (P.BOARD_H - dockStrip)) * 100);
      ctx.fillStyle = '#f8f8f8';
      ctx.font = '600 13px system-ui';
      ctx.fillText(
        `${heroSpec.label}  ·  ${band.label}  ·  ${hh}px = ${pctBoard}% board / ${pctStage}% stage`,
        ox + cellPad + 8,
        oy + cellPad + P.BOARD_H + 24
      );

      cells.push({
        hero: heroSpec.id,
        band: band.id,
        heroH: hh,
        heroW: hw,
        pctBoard,
        pctStage,
      });
    }
  }

  return {
    cells,
    jpeg: canvas.toDataURL('image/jpeg', 0.9),
  };
}, payload);

await browser.close();

const contact = path.join(OUT_DIR, 'hero-size-bands-contact.jpg');
fs.writeFileSync(contact, Buffer.from(result.jpeg.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
fs.writeFileSync(
  path.join(OUT_DIR, 'report.json'),
  JSON.stringify(
    {
      board: { w: BOARD_W, h: BOARD_H },
      note:
        'Calibration only. Bands are % of board height. Current fit king recipe uses ~0.92×stageH ≈ 67% board. Do not mass-gen until a band is picked.',
      bands: BANDS,
      heroes: HEROES.map((h) => ({ id: h.id, key: h.key, docks: h.docks })),
      cells: result.cells,
      contact,
      bias: 'medium (~60–65%) — awaiting visual pick',
    },
    null,
    2
  )
);

console.log(JSON.stringify({ contact, cells: result.cells }, null, 2));
