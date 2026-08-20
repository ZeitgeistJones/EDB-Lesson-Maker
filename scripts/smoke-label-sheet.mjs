/**
 * Smoke: build a tiny 2×2 sheet, run label-sheet --composite-only (no API),
 * assert the numbered PNG + stub labels.json land. Does not call Anthropic.
 *
 *   node scripts/smoke-label-sheet.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(ROOT, 'tmp', 'label-smoke');
const sheetPath = path.join(outDir, 'sheet-2x2.png');
const labelsPath = path.join(outDir, 'labels.json');
const numberedPath = path.join(outDir, 'labels-numbered.png');

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const b64 = await page.evaluate(async () => {
    const W = 400;
    const H = 400;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    const colors = ['#e11d48', '#2563eb', '#16a34a', '#ca8a04'];
    let i = 0;
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = colors[i++];
        const x = col * 200 + 40;
        const y = r * 200 + 40;
        ctx.fillRect(x, y, 120, 120);
      }
    }
    return c.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync(sheetPath, Buffer.from(b64, 'base64'));
} finally {
  await browser.close();
}

const run = spawnSync(
  'node',
  [
    path.join('scripts', 'label-sheet.mjs'),
    `--sheet=${path.relative(ROOT, sheetPath)}`,
    '--grid=2x2',
    `--out=${path.relative(ROOT, labelsPath)}`,
    `--numbered=${path.relative(ROOT, numberedPath)}`,
    '--composite-only',
  ],
  { cwd: ROOT, encoding: 'utf8' }
);
if (run.status !== 0) {
  console.error(run.stdout);
  console.error(run.stderr);
  process.exit(run.status || 1);
}

if (!fs.existsSync(numberedPath) || fs.statSync(numberedPath).size < 100) {
  console.error('FAIL: numbered composite missing or tiny');
  process.exit(1);
}
const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
if (!labels.compositeOnly || !labels.grid || labels.grid.rows !== 2 || labels.grid.cols !== 2) {
  console.error('FAIL: stub labels.json shape wrong', labels);
  process.exit(1);
}

// Syntax/load check of import-sheet --helpish path (missing sheet exits 1 with usage).
const load = spawnSync('node', ['--check', path.join('scripts', 'label-sheet.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (load.status !== 0) {
  console.error(load.stderr);
  process.exit(1);
}
const checkImport = spawnSync('node', ['--check', path.join('scripts', 'import-sheet.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (checkImport.status !== 0) {
  console.error(checkImport.stderr);
  process.exit(1);
}
const checkProp = spawnSync('node', ['--check', path.join('scripts', 'import-prop.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (checkProp.status !== 0) {
  console.error(checkProp.stderr);
  process.exit(1);
}

console.log('OK smoke-label-sheet: numbered composite + syntax checks passed.');
console.log(`  sheet     ${path.relative(ROOT, sheetPath)}`);
console.log(`  numbered  ${path.relative(ROOT, numberedPath)}`);
console.log(`  labels    ${path.relative(ROOT, labelsPath)}`);
