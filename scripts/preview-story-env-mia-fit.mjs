/**
 * Mia-on-environment fit test — direct StoryScene.compose (no board story-page cap).
 * Does NOT import new Manus art.
 *
 *   node scripts/preview-story-env-mia-fit.mjs
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { ROOT, loadEnv, startPublicServer, openBoardPage } from './lib/verify-harness.mjs';

const OUT = path.join(ROOT, 'tmp', 'story-env-mia-fit');
const FIXTURE = path.join(ROOT, 'scripts/fixtures/story-env-mia-fit-test.json');

/** Story stage size used on multi-page A1 side art (~520×~400). */
const STAGE_W = 520;
const STAGE_H = 400;

loadEnv();
const lesson = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const scenes = (lesson.story.pages || []).map((p) => ({
  heading: p.heading,
  envKey: p.storyScene.slots.backdrop.propKey,
  scene: p.storyScene,
}));

fs.mkdirSync(OUT, { recursive: true });

const { port, close } = await startPublicServer();
const { browser, page } = await openBoardPage(port);

const result = await page.evaluate(
  async ({ scenes, STAGE_W, STAGE_H }) => {
    await window.PropBank.ready();
    if (!window.StoryScene) return { error: 'StoryScene missing' };

    function drawCover(ctx, img, dx, dy, dw, dh, flip) {
      const ir = img.width / img.height;
      const fr = dw / dh;
      let sw = img.width;
      let sh = img.height;
      let sx = 0;
      let sy = 0;
      if (ir > fr) {
        sw = img.height * fr;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / fr;
        // bottom-biased crop (shared ground)
        sy = img.height - sh;
      }
      ctx.save();
      if (flip) {
        ctx.translate(dx + dw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      } else {
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      }
      ctx.restore();
    }

    function drawContain(ctx, img, dx, dy, dw, dh, flip) {
      ctx.save();
      if (flip) {
        ctx.translate(dx + dw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, dw, dh);
      } else {
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      ctx.restore();
    }

    const propGet = (k) => window.PropBank.get(k);
    const propSrc = (k, prop) => {
      if (prop && prop.path) return prop.path;
      const p = window.PropBank.get(k);
      return p && p.path ? p.path : null;
    };

    const cells = [];
    for (let i = 0; i < scenes.length; i++) {
      const { heading, envKey, scene } = scenes[i];
      const composed = window.StoryScene.compose(scene, {
        stageW: STAGE_W,
        stageH: STAGE_H,
        propGet,
        propSrc,
      });
      const layers = (composed && composed.layers) || [];
      const warnings = (composed && composed.warnings) || null;
      const envMode =
        (window.StoryScene.inferEnvMode && window.StoryScene.inferEnvMode(envKey, null)) || null;

      const canvas = document.createElement('canvas');
      canvas.width = STAGE_W;
      canvas.height = STAGE_H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f4efe4';
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, STAGE_H * 0.82, STAGE_W, STAGE_H * 0.18);

      const drawn = [];
      for (const L of layers) {
        if (!L || !L.src) continue;
        const img = await new Promise((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => res(null);
          im.src =
            L.src.startsWith('http') || L.src.startsWith('data:') || L.src.startsWith('/')
              ? L.src
              : '/' + String(L.src).replace(/^\//, '');
        });
        if (!img) {
          drawn.push({ ...L, missingImg: true });
          continue;
        }
        if (L.objectFit === 'cover') drawCover(ctx, img, L.x, L.y, L.w, L.h, L.flip);
        else drawContain(ctx, img, L.x, L.y, L.w, L.h, L.flip);
        drawn.push({
          slot: L.slot,
          key: L.key,
          scaleClass: L.scaleClass,
          envMode: L.envMode || null,
          objectFit: L.objectFit || 'contain',
          x: Math.round(L.x),
          y: Math.round(L.y),
          w: Math.round(L.w),
          h: Math.round(L.h),
        });
      }

      cells.push({
        i,
        heading,
        envKey,
        envMode,
        sideW: STAGE_W,
        sideH: STAGE_H,
        layers: drawn,
        warnings,
        stageDataUrl: canvas.toDataURL('image/jpeg', 0.92),
        propPresent: !!window.PropBank.get(envKey),
      });
    }
    return { cells };
  },
  { scenes, STAGE_W, STAGE_H }
);

await browser.close();
close();

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

for (const c of result.cells) {
  const slug = (c.envKey || 'x').replace(/^story-env-/, '');
  fs.writeFileSync(
    path.join(OUT, `stage-${String(c.i).padStart(2, '0')}-${slug}.jpg`),
    Buffer.from(c.stageDataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64')
  );
}

const browser2 = await chromium.launch({ headless: true });
const page2 = await browser2.newPage({ viewport: { width: 1400, height: 2000 } });
await page2.setContent('<!doctype html><canvas id="c"></canvas>');
const contactDataUrl = await page2.evaluate(async (CELLS) => {
  const cols = 2;
  const cellW = 560;
  const cellH = 400;
  const labelH = 52;
  const headerH = 72;
  const pad = 16;
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
  ctx.font = '600 22px system-ui';
  ctx.fillText('Mia × story-env fit v3 — inside-scene + larger midground', pad, 30);
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#9aa';
  ctx.fillText(
    'envFg ankle apron · shared floor y≈0.94 · midground ~82% · no new art',
    pad,
    52
  );

  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * cellW;
    const y = headerH + row * (cellH + labelH);
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, cellW - 12, cellH);
    if (c.stageDataUrl) {
      const im = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = c.stageDataUrl;
      });
      const scale = Math.min((cellW - 20) / im.width, (cellH - 12) / im.height);
      ctx.drawImage(im, x + 6, y + 6, im.width * scale, im.height * scale);
    }
    const env = (c.envKey || '').replace(/^story-env-/, '');
    const mia = (c.layers || []).find((l) => l.slot === 'actor');
    const bd = (c.layers || []).find((l) => l.slot === 'backdrop');
    const mode = c.envMode || (bd && bd.envMode) || '?';
    ctx.fillStyle = '#eee';
    ctx.font = '600 13px system-ui';
    ctx.fillText(
      `${i + 1}. ${env}  [${mode}]${c.propPresent ? '' : ' (MISSING)'}`,
      x + 6,
      y + cellH + 18
    );
    ctx.fillStyle = '#8ab';
    ctx.font = '11px system-ui';
    const m = mia ? `Mia ${mia.w}×${mia.h}` : 'Mia missing';
    const b = bd ? `env ${bd.w}×${bd.h} (${bd.scaleClass || ''})` : 'env missing';
    const wf = bd ? `w=${((bd.w / c.sideW) * 100).toFixed(0)}%` : '';
    ctx.fillText(`${m}  ·  ${b}  ·  ${wf}`, x + 6, y + cellH + 38);
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}, result.cells);

await browser2.close();
const contactPath = path.join(OUT, 'mia-env-fit-contact.jpg');
fs.writeFileSync(
  contactPath,
  Buffer.from(contactDataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64')
);

const metrics = result.cells.map((c) => {
  const mia = (c.layers || []).find((l) => l.slot === 'actor');
  const bd = (c.layers || []).find((l) => l.slot === 'backdrop');
  return {
    env: c.envKey,
    heading: c.heading,
    envMode: c.envMode,
    propPresent: c.propPresent,
    mia: mia || null,
    backdrop: bd || null,
    miaHFrac: mia ? +(mia.h / STAGE_H).toFixed(3) : null,
    envHFrac: bd ? +(bd.h / STAGE_H).toFixed(3) : null,
    envWFrac: bd ? +(bd.w / STAGE_W).toFixed(3) : null,
  };
});
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify({ contact: contactPath, metrics }, null, 2));
