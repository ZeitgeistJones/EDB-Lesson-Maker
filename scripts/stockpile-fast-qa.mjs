/**
 * Fast contact sheets for mass-stockpile QA (actions / roles / hide-reveal).
 *
 *   node scripts/stockpile-fast-qa.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const OUT = path.join(ROOT, 'tmp', 'stockpile-fast-qa');
fs.mkdirSync(OUT, { recursive: true });

const ACTIONS = [
  'jump', 'climb', 'eat', 'drink', 'kick', 'run', 'throw',
  'catch', 'wave', 'push', 'swim', 'draw', 'brush',
];
const CORE = ['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach'];
const EMOS = ['neutral', 'happy'];
const ROLES = [
  'kid3', 'parent', 'teacher', 'doctor', 'chef', 'worker', 'waiter', 'cashier',
  'vendor', 'clerk', 'customer', 'farmer', 'officer', 'referee', 'shopper', 'zookeeper',
];

function listHidePairs() {
  const files = fs.readdirSync(IMG).filter((f) => f.startsWith('hide-') && f.endsWith('.png'));
  const stems = new Set();
  for (const f of files) {
    const m = f.match(/^hide-(.+)-(closed|open)\.png$/);
    if (m) stems.add(m[1]);
  }
  return [...stems].sort();
}

async function sheet(title, cells, dest, cols = 8, cellW = 140, cellH = 160) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.setContent('<!doctype html><canvas id="c"></canvas>');
  const dataUrl = await page.evaluate(
    async ({ title, CELLS, cols, cellW, cellH }) => {
      const labelH = 28;
      const headerH = 52;
      const pad = 12;
      const rows = Math.ceil(CELLS.length / cols);
      const w = cols * cellW + pad * 2;
      const h = headerH + rows * (cellH + labelH) + pad;
      const canvas = document.getElementById('c');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#161616';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f2f2f2';
      ctx.font = '600 18px system-ui';
      ctx.fillText(title, pad, 28);
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#9aa';
      ctx.fillText('fast QA — flag identity / wrong action / white plate / broken pair only', pad, 44);
      for (let i = 0; i < CELLS.length; i++) {
        const c = CELLS[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * cellW;
        const y = headerH + row * (cellH + labelH);
        ctx.fillStyle = '#0c0c0c';
        ctx.fillRect(x, y, cellW - 6, cellH);
        if (c.fail) {
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(x, y, cellW - 6, cellH);
        }
        if (c.dataUrl) {
          const im = await new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = c.dataUrl;
          });
          const scale = Math.min((cellW - 16) / im.width, (cellH - 12) / im.height);
          ctx.drawImage(
            im,
            x + 6,
            y + 6,
            im.width * scale,
            im.height * scale
          );
        } else {
          ctx.fillStyle = '#f87171';
          ctx.font = '12px system-ui';
          ctx.fillText('MISSING', x + 10, y + cellH / 2);
        }
        ctx.fillStyle = c.fail ? '#fca5a5' : '#ddd';
        ctx.font = '10px system-ui';
        ctx.fillText(c.label, x + 2, y + cellH + 16);
      }
      return canvas.toDataURL('image/jpeg', 0.88);
    },
    { title, CELLS: cells, cols, cellW, cellH }
  );
  await browser.close();
  fs.writeFileSync(dest, Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
  return dest;
}

function cell(key, label) {
  const file = path.join(IMG, `${key}.png`);
  return {
    key,
    label: label || key,
    fail: !fs.existsSync(file),
    dataUrl: fs.existsSync(file)
      ? `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`
      : null,
  };
}

const actionCells = [];
for (const who of ['mia', 'leo']) {
  for (const emo of EMOS) {
    for (const pose of ACTIONS) {
      actionCells.push(cell(`cast-${who}-${pose}-${emo}`, `${who[0]} ${pose} ${emo[0]}`));
    }
  }
}

const roleCells = [];
for (const who of ROLES) {
  for (const emo of EMOS) {
    roleCells.push(cell(`cast-${who}-idle-${emo}`, `${who} idle ${emo[0]}`));
    roleCells.push(cell(`cast-${who}-talk-${emo}`, `${who} talk ${emo[0]}`));
  }
}

const hideCells = [];
for (const stem of listHidePairs()) {
  hideCells.push(cell(`hide-${stem}-closed`, `${stem} C`));
  hideCells.push(cell(`hide-${stem}-open`, `${stem} O`));
}

const missing = [...actionCells, ...roleCells, ...hideCells].filter((c) => c.fail).map((c) => c.key);

const contacts = {
  actions: await sheet('Mia/Leo action plates — 13 poses × 2 emotions', actionCells, path.join(OUT, 'actions-contact.jpg'), 13, 118, 150),
  roles: await sheet('Role cast — idle+talk × 2 emotions (spot check)', roleCells, path.join(OUT, 'roles-contact.jpg'), 8, 150, 170),
  hide: await sheet('Hide/reveal pairs — closed then open', hideCells, path.join(OUT, 'hide-contact.jpg'), 8, 150, 150),
};

fs.writeFileSync(
  path.join(OUT, 'missing.json'),
  JSON.stringify({ missing, actionCount: actionCells.length, roleSpot: roleCells.length, hide: hideCells.length / 2 }, null, 2)
);
console.log(JSON.stringify({ out: OUT, contacts, missing }, null, 2));
