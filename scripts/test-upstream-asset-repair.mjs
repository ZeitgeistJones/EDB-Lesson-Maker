import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.join(ROOT, 'tmp', 'upstream-asset-repair-tests');

function runNode(args, expect = 0) {
  const result = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== expect) {
    throw new Error(
      `Expected exit ${expect} for node ${args.join(' ')}; got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }
  return result;
}

async function writePng(file, drawScript) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const dataUrl = await page.evaluate(async (script) => {
      const fn = new Function('ctx', 'canvas', script);
      const canvas = document.createElement('canvas');
      canvas.width = 820;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      fn(ctx, canvas);
      return canvas.toDataURL('image/png');
    }, drawScript);
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  } finally {
    await browser.close();
  }
}

async function imageStats(file) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, img.width, img.height).data;
      let opaque = 0;
      let whiteOpaque = 0;
      let cornerAlpha = 0;
      const cornerPoints = [
        [0, 0],
        [img.width - 1, 0],
        [0, img.height - 1],
        [img.width - 1, img.height - 1],
      ];
      for (const [x, y] of cornerPoints) cornerAlpha += px[(y * img.width + x) * 4 + 3];
      for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3];
        if (a < 200) continue;
        opaque++;
        if (px[i] > 225 && px[i + 1] > 225 && px[i + 2] > 225) whiteOpaque++;
      }
      return { width: img.width, height: img.height, opaque, whiteOpaque, cornerAlpha };
    }, `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });

  const offsetSheet = path.join(WORK, 'offset-grid.png');
  await writePng(
    offsetSheet,
    `
      const colors = ['#ff3b30','#34c759','#007aff','#ffcc00','#af52de','#ff9500','#5ac8fa','#ff2d55','#8e8e93'];
      const x0 = 82, y0 = 47, cw = 190, ch = 175, gx = 26, gy = 31;
      ctx.font = '80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3), c = i % 3;
        const x = x0 + c * (cw + gx), y = y0 + r * (ch + gy);
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.roundRect(x + 22, y + 18, cw - 44, ch - 36, 28);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(i + 1), x + cw / 2, y + ch / 2);
      }
    `
  );
  const names = Array.from({ length: 9 }, (_, i) => `repair-offset-${i + 1}`).join(',');
  const offsetStage = path.join('tmp', 'upstream-asset-repair-tests', 'offset-stage');
  runNode([
    'scripts/import-prop.mjs',
    offsetSheet,
    '--sheet',
    '--grid=3x3',
    `--names=${names}`,
    '--stage-all',
    `--outdir=${offsetStage}`,
    `--rawdir=${path.join(offsetStage, 'raw')}`,
    `--results=${path.join(offsetStage, '_results.json')}`,
    '--min-filled-cells=9',
  ]);
  const offsetResults = JSON.parse(fs.readFileSync(path.join(ROOT, offsetStage, '_results.json'), 'utf8'));
  assert.equal(offsetResults.length, 9, 'offset grid expected nine cells');
  assert.equal(offsetResults.filter((r) => r.landed).length, 9, 'offset grid should land every cell');

  const missingSheet = path.join(WORK, 'missing-cell-grid.png');
  fs.copyFileSync(offsetSheet, missingSheet);
  await writePng(
    missingSheet,
    `
      const colors = ['#ff3b30','#34c759','#007aff','#ffcc00','#af52de','#ff9500','#5ac8fa','#ff2d55'];
      const x0 = 82, y0 = 47, cw = 190, ch = 175, gx = 26, gy = 31;
      for (let i = 0; i < 8; i++) {
        const r = Math.floor(i / 3), c = i % 3;
        const x = x0 + c * (cw + gx), y = y0 + r * (ch + gy);
        ctx.fillStyle = colors[i];
        ctx.fillRect(x + 30, y + 24, cw - 60, ch - 48);
      }
    `
  );
  runNode([
    'scripts/import-prop.mjs',
    missingSheet,
    '--sheet',
    '--grid=3x3',
    `--names=${names}`,
    '--stage-all',
    `--outdir=${path.join('tmp', 'upstream-asset-repair-tests', 'missing-stage')}`,
    `--rawdir=${path.join('tmp', 'upstream-asset-repair-tests', 'missing-stage', 'raw')}`,
    `--results=${path.join('tmp', 'upstream-asset-repair-tests', 'missing-stage', '_results.json')}`,
    '--min-filled-cells=9',
  ], 1);

  const lightFixtures = {
    doctor: `ctx.fillStyle='#ffffff'; ctx.fillRect(330,170,160,330); ctx.fillStyle='#cfe9ff'; ctx.fillRect(374,160,72,70); ctx.strokeStyle='#777'; ctx.lineWidth=10; ctx.strokeRect(330,170,160,330);`,
    chef: `ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(410,160,62,0,Math.PI*2); ctx.fill(); ctx.fillRect(335,220,150,260); ctx.strokeStyle='#777'; ctx.lineWidth=9; ctx.strokeRect(335,220,150,260);`,
    snowman: `ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(410,220,70,0,Math.PI*2); ctx.arc(410,350,95,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#7aa'; ctx.lineWidth=8; ctx.stroke();`,
    'goal-net': `ctx.strokeStyle='#8aa'; ctx.lineWidth=24; ctx.strokeRect(250,190,320,230); for(let x=280;x<560;x+=46){ctx.beginPath();ctx.moveTo(x,190);ctx.lineTo(x,420);ctx.stroke();} for(let y=225;y<420;y+=40){ctx.beginPath();ctx.moveTo(250,y);ctx.lineTo(570,y);ctx.stroke();} ctx.strokeStyle='#ffffff'; ctx.lineWidth=12; ctx.strokeRect(250,190,320,230); for(let x=280;x<560;x+=46){ctx.beginPath();ctx.moveTo(x,190);ctx.lineTo(x,420);ctx.stroke();} for(let y=225;y<420;y+=40){ctx.beginPath();ctx.moveTo(250,y);ctx.lineTo(570,y);ctx.stroke();}`,
    bowl: `ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.ellipse(410,330,145,85,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#777'; ctx.lineWidth=8; ctx.stroke();`,
  };
  for (const [key, script] of Object.entries(lightFixtures)) {
    const src = path.join(WORK, `${key}.png`);
    await writePng(src, `ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);${script}`);
    const outdir = path.join('tmp', 'upstream-asset-repair-tests', 'white-stage');
    runNode([
      'scripts/import-prop.mjs',
      src,
      `--name=repair-${key}`,
      '--white',
      '--force',
      `--outdir=${outdir}`,
      `--rawdir=${path.join(outdir, 'raw')}`,
    ]);
    const stats = await imageStats(path.join(ROOT, outdir, `repair-${key}.png`));
    assert(stats.opaque > 1000, `${key} should keep opaque subject pixels`);
    assert(stats.whiteOpaque > 200, `${key} should preserve legitimate white/light pixels`);
    assert.equal(stats.cornerAlpha, 0, `${key} white background corners should be transparent`);
  }

  const blackBlock = path.join(WORK, 'black-block.png');
  await writePng(blackBlock, `ctx.fillStyle='#ff9500';ctx.beginPath();ctx.arc(410,350,120,0,Math.PI*2);ctx.fill();`);
  runNode([
    'scripts/import-prop.mjs',
    blackBlock,
    '--name=repair-black-block',
    '--force',
    `--outdir=${path.join('tmp', 'upstream-asset-repair-tests', 'black-stage')}`,
    `--rawdir=${path.join('tmp', 'upstream-asset-repair-tests', 'black-stage', 'raw')}`,
  ]);
  const blackStats = await imageStats(path.join(ROOT, 'tmp', 'upstream-asset-repair-tests', 'black-stage', 'repair-black-block.png'));
  assert.equal(blackStats.cornerAlpha, 0, 'black-field background must not remain opaque');

  console.log('upstream asset repair tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
