/**
 * Patch tags, merge Leo staged rows, white-plate QA, preview.
 *   node scripts/manus/finish-leo-cast-import.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const POSES = ['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach'];
const EMOS = ['neutral', 'happy', 'worried'];

for (const emo of EMOS) {
  const p = path.join(ROOT, 'tmp/manus-story-cast-leo-pilot/stage', emo, 'sheet-rows.json');
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const e of rows) {
    if (!e.key?.startsWith('cast-leo-') || !e.row) {
      if (e.key && /empty/i.test(e.key)) e.skip = true;
      continue;
    }
    const m = e.key.match(/^cast-leo-([a-z]+)-([a-z]+)$/);
    if (!m) continue;
    e.dedup = 'new';
    e.skip = false;
    e.blocked = false;
    e.row.pack = 'story-cast';
    e.row.relativeScale = 0.55;
    e.row.anchor = 'bottom';
    e.row.tags = [
      'story',
      'storyCast',
      'character',
      'story-cast',
      'dock',
      `who:leo`,
      `pose:${m[1]}`,
      `emotion:${m[2]}`,
      'facing:right',
    ];
  }
  fs.writeFileSync(p, JSON.stringify(rows, null, 2));
  const r = spawnSync(process.execPath, ['scripts/merge-staged-props.mjs', p, '--force'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  console.log(r.stdout);
  if (r.status) console.error(r.stderr);
}

const props = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8')).props;
const keys = Object.keys(props).filter((k) => k.startsWith('cast-leo-')).sort();
console.log('manifest cast-leo', keys.length);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const qa = [];
for (const emotion of EMOS) {
  for (const pose of POSES) {
    const key = `cast-leo-${pose}-${emotion}`;
    const file = path.join(ROOT, 'public/assets/09_props/img', `${key}.png`);
    if (!fs.existsSync(file)) {
      qa.push({ key, missing: true, fail: true });
      continue;
    }
    const b64 = fs.readFileSync(file).toString('base64');
    const stats = await page.evaluate(async (dataUrl) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = dataUrl;
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let opaque = 0;
      let nearWhite = 0;
      let edgeWhite = 0;
      let edgeN = 0;
      const w = c.width;
      const h = c.height;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (d[i + 3] < 8) continue;
          opaque++;
          const nw = d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240;
          if (nw) nearWhite++;
          if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) {
            edgeN++;
            if (nw) edgeWhite++;
          }
        }
      }
      return {
        whitePlate: opaque ? nearWhite / opaque : 0,
        edgeWhiteFrac: edgeN ? edgeWhite / edgeN : 0,
      };
    }, `data:image/png;base64,${b64}`);
    const fail = stats.whitePlate >= 0.12 || stats.edgeWhiteFrac > 0.05;
    qa.push({ key, ...stats, fail });
  }
}
await browser.close();
const fails = qa.filter((q) => q.fail);
fs.writeFileSync(
  path.join(ROOT, 'tmp/manus-story-cast-leo-pilot/white-plate-qa.json'),
  JSON.stringify({ count: qa.length, fails: fails.length, qa }, null, 2)
);
console.log('QA fails', fails.length);
for (const q of qa) {
  console.log(
    q.key,
    q.missing ? 'MISSING' : `${(q.whitePlate * 100).toFixed(3)}%${q.fail ? ' FAIL' : ' ok'}`
  );
}

const prev = spawnSync(process.execPath, ['scripts/manus/preview-story-cast-contact.mjs', '--who=leo'], {
  cwd: ROOT,
  encoding: 'utf8',
});
console.log(prev.stdout || prev.stderr);
if (fails.length) process.exit(2);
