/**
 * Runtime evidence for bg picker + house flat creaminess.
 *   node scripts/debug-bg-picker.mjs
 * Writes NDJSON to debug-3c9697.log
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const LOG = path.join(root, 'debug-3c9697.log');

function log(hypothesisId, message, data) {
  const line = JSON.stringify({
    sessionId: '3c9697',
    runId: 'picker-post',
    hypothesisId,
    location: 'debug-bg-picker.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  fs.appendFileSync(LOG, line + '\n');
  try {
    fetch('http://127.0.0.1:7298/ingest/2c7b9048-535d-4975-be12-acca9b0197ba', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3c9697' },
      body: line,
    }).catch(() => {});
  } catch (_) {}
}

function fileFetch(url) {
  const rel = String(url).replace(/^\.?\//, '');
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  const body = fs.readFileSync(filePath);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

function loadSB() {
  const code = fs.readFileSync(path.join(publicDir, 'lib', 'sceneBackgrounds.js'), 'utf8');
  const sandbox = { window: {}, fetch: fileFetch, console, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox, { filename: 'sceneBackgrounds.js' });
  return sandbox.window.SceneBackgrounds;
}

function spine(topic, vocab) {
  return [
    { title: topic, tags: ['title', topic], vocabulary: vocab, preferFlat: true },
    { title: 'Warm Up', tags: ['warmup'], vocabulary: [], preferFlat: true },
    { title: 'New Words', tags: ['vocabulary'], vocabulary: [], preferFlat: true },
    { title: 'Story', tags: ['story', topic], vocabulary: vocab, preferFlat: true },
    { title: 'Activity', tags: ['activity', topic], vocabulary: vocab, preferFlat: true },
    { title: 'Wrap Up', tags: ['wrap'], vocabulary: [], preferFlat: true },
  ];
}

async function midBandStats(fileAbs) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dataUrl = `data:image/png;base64,${fs.readFileSync(fileAbs).toString('base64')}`;
  const stats = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = img.width;
    const h = img.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;
    const y0 = Math.round(h * 0.3);
    const y1 = Math.round(h * 0.7);
    const x0 = Math.round(w * 0.2);
    const x1 = Math.round(w * 0.8);
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
        n++;
      }
    }
    r /= n; g /= n; b /= n;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // cream heuristic: high lum, low chroma, warm (r>=g>=b-ish)
    const creamLike = lum > 210 && chroma < 28 && r >= g - 5;
    const coolTinted = (b > r + 8 || g > r + 8) && chroma >= 18;
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      lum: Math.round(lum),
      chroma: Math.round(chroma),
      creamLike,
      coolTinted,
    };
  }, dataUrl);
  await browser.close();
  return stats;
}

const SB = loadSB();
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/cases.json'), 'utf8'));
const manifest = JSON.parse(
  fs.readFileSync(path.join(publicDir, 'assets/08_backgrounds/manifest.json'), 'utf8')
);

log('H5', 'debug run start', { cases: (cases.cases || []).length });

for (const c of cases.cases || []) {
  const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', c.fixture), 'utf8'));
  const vocab = (lesson.vocabulary || []).map((v) => v.word).filter(Boolean);
  const topicWords = [lesson.title, ...vocab].join(' ');
  const picks = await SB.planFor(spine(lesson.title, vocab), {
    seed: lesson.title || '',
    topicWords,
  });
  const sets = [...new Set(picks.map((p) => p.set).filter(Boolean))];
  const names = picks.map((p) => p.name);
  const reasons = picks.map((p) => p.reason);
  const titlePin = (reasons[0] || '').includes('pin:open');
  const wrapPin = (reasons[reasons.length - 1] || '').includes('pin:close');
  log('H3', 'case plan', {
    id: c.id,
    title: lesson.title,
    sets,
    names,
    titleName: names[0],
    wrapName: names[names.length - 1],
    titlePin,
    wrapPin,
    distinct: new Set(names).size,
  });
}

const probeKeys = ['house-a', 'house-b', 'house-c', 'house-d', 'clinic-a', 'school-a', 'peach-blush'];
for (const key of probeKeys) {
  const entry = manifest.flats[key];
  if (!entry) {
    log('H1', 'missing flat', { key });
    continue;
  }
  const abs = path.join(publicDir, 'assets/08_backgrounds/img', entry.file);
  const stats = await midBandStats(abs);
  log('H1', 'mid-band color', { key, set: entry.set || null, ...stats });
}

log('H5', 'debug run end', { log: LOG });
console.log('Wrote', LOG);
