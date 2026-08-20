/**
 * Local silhouette + line-art derivatives from high-demand existing art.
 * Does NOT write live PropBank manifests. Durable only:
 *   harvested/derived-visual-variants/
 *
 *   node scripts/derive-visual-variants.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { ROOT } from './manus/client.mjs';
import { DERIVED_REL } from './manus/visual-grammar-keys.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, DERIVED_REL);
const TARGET = 100;
const SAMPLE_N = 12;

const SKIP_PREFIX = /^(cast-|letter-|hero-|hide-|gicon-|sound-box)/;
const SKIP_ROLE = new Set(['hero', 'speech', 'soundBoxes', 'cover']);

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function demandScores() {
  const scores = new Map();
  const bump = (word, n) => {
    const k = slug(word);
    if (!k || k.length < 2) return;
    scores.set(k, (scores.get(k) || 0) + n);
  };

  const audit = loadJson(path.join(ROOT, 'tmp/vocab-image-audit/latest.json'), null);
  if (audit && Array.isArray(audit.lessons)) {
    for (const lesson of audit.lessons) {
      for (const w of lesson.adaptedBoard || []) bump(w, 10);
      for (const row of lesson.words || []) {
        if (row.success || row.onBoard) bump(row.normalizedKey || row.word, 4);
      }
    }
  } else if (audit && Array.isArray(audit.results)) {
    for (const row of audit.results) {
      if (row.onBoard || row.outcome === 'success') bump(row.normalizedKey || row.word, 6);
    }
  }

  const fixturesDir = path.join(ROOT, 'scripts/fixtures');
  if (fs.existsSync(fixturesDir)) {
    for (const f of fs.readdirSync(fixturesDir).filter((n) => n.endsWith('-lesson.json'))) {
      const data = loadJson(path.join(fixturesDir, f), null);
      const L = data && (data.lesson || data);
      if (!L) continue;
      for (const v of L.vocabulary || []) bump(typeof v === 'string' ? v : v && v.word, 8);
    }
  }

  const coloring = loadJson(path.join(ROOT, 'public/assets/10_coloring/manifest.json'), { outlines: {} });
  for (const k of Object.keys(coloring.outlines || {})) bump(k, 6);

  return scores;
}

function resolveSource(key, props, vocab) {
  const propMap = props.props || props;
  if (propMap[key] && propMap[key].file && propMap[key].alpha) {
    const file = path.join(ROOT, 'public/assets/09_props/img', propMap[key].file);
    if (fs.existsSync(file) && !SKIP_PREFIX.test(key) && !SKIP_ROLE.has(propMap[key].role)) {
      return { kind: 'prop', key, file, meta: propMap[key] };
    }
  }
  const vocabHit = vocab[key];
  if (vocabHit && vocabHit.file) {
    const file = path.join(ROOT, 'public/assets/07_vocab-pack/img', vocabHit.file);
    if (fs.existsSync(file)) return { kind: 'vocab', key, file, meta: vocabHit };
  }
  return null;
}

function pickSources() {
  const props = loadJson(path.join(ROOT, 'public/assets/09_props/manifest.json'), {});
  const vocab = loadJson(path.join(ROOT, 'public/assets/07_vocab-pack/index.json'), {});
  const coloring = loadJson(path.join(ROOT, 'public/assets/10_coloring/manifest.json'), { outlines: {} });
  const scores = demandScores();
  const audit = loadJson(path.join(ROOT, 'tmp/vocab-image-audit/latest.json'), null);
  const picked = [];
  const seen = new Set();
  const fileScores = new Map();

  if (audit && Array.isArray(audit.lessons)) {
    for (const lesson of audit.lessons) {
      for (const row of lesson.words || []) {
        if (!row.success || !row.onBoard || !row.artSrc) continue;
        const rel = String(row.artSrc).replace(/\\/g, '/');
        if (/\/(cast-|letter-|gicon-|hero-|hide-)/.test(rel)) continue;
        const abs = path.join(ROOT, 'public', rel);
        if (!fs.existsSync(abs)) continue;
        const key = slug(row.normalizedKey || row.indexKey || path.basename(rel, '.png'));
        const prev = fileScores.get(rel) || { key, file: abs, score: 0, kind: rel.includes('09_props') ? 'prop' : 'vocab' };
        prev.score += 12;
        fileScores.set(rel, prev);
      }
    }
  }

  const fromBoard = [...fileScores.values()].sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  for (const hit of fromBoard) {
    if (picked.length >= TARGET) break;
    if (seen.has(hit.key)) continue;
    seen.add(hit.key);
    picked.push({
      key: hit.key,
      score: hit.score + (scores.get(hit.key) || 0),
      kind: hit.kind,
      file: hit.file,
      hasColoring: Boolean(coloring.outlines && coloring.outlines[hit.key]),
    });
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [key, score] of ranked) {
    if (picked.length >= TARGET) break;
    if (seen.has(key) || SKIP_PREFIX.test(key)) continue;
    const src = resolveSource(key, props, vocab);
    if (!src) continue;
    seen.add(key);
    picked.push({
      key,
      score,
      ...src,
      hasColoring: Boolean(coloring.outlines && coloring.outlines[key]),
    });
  }
  return picked;
}

async function transformInPage(page, dataUrl, mode) {
  return page.evaluate(async ({ src, mode: kind }) => {
    const img = new Image();
    img.src = src;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const mask = new Uint8Array(w * h);
    let opaque = 0;
    let edge = 0;
    for (let i = 0, p = 0; i < px.length; i += 4, p += 1) {
      const a = px[i + 3];
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const mx = Math.max(r, g, b);
      const isWhite = a > 8 && r > 232 && g > 232 && b > 232 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
      const on = a > 40 && !isWhite && mx > 18;
      mask[p] = on ? 1 : 0;
      if (on) opaque += 1;
    }
    const fillRatio = opaque / (w * h);
    if (opaque < 80 || fillRatio < 0.02 || fillRatio > 0.92) {
      return { ok: false, reason: 'silhouette-unusable', opaque, fillRatio, w, h };
    }
    const isEdge = (x, y) => {
      const p = y * w + x;
      if (!mask[p]) return false;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
      return !mask[p - 1] || !mask[p + 1] || !mask[p - w] || !mask[p + w];
    };
    const out = ctx.createImageData(w, h);
    const o = out.data;
    if (kind === 'silhouette') {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const p = y * w + x;
          const i = p * 4;
          if (mask[p]) {
            o[i] = 28; o[i + 1] = 24; o[i + 2] = 36; o[i + 3] = 255;
          } else {
            o[i + 3] = 0;
          }
        }
      }
    } else {
      const stroke = new Uint8Array(w * h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (isEdge(x, y)) {
            stroke[y * w + x] = 1;
            edge += 1;
          }
        }
      }
      const dil = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const p = y * w + x;
          if (
            stroke[p] || stroke[p - 1] || stroke[p + 1] || stroke[p - w] || stroke[p + w] ||
            stroke[p - w - 1] || stroke[p - w + 1] || stroke[p + w - 1] || stroke[p + w + 1]
          ) dil[p] = 1;
        }
      }
      const edgeRatio = edge / opaque;
      if (edgeRatio > 0.62 || edgeRatio < 0.02) {
        return { ok: false, reason: 'lineart-noisy', opaque, edge, edgeRatio, fillRatio, w, h };
      }
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const p = y * w + x;
          const i = p * 4;
          if (dil[p]) {
            o[i] = 22; o[i + 1] = 22; o[i + 2] = 22; o[i + 3] = 255;
          } else if (mask[p]) {
            o[i] = 255; o[i + 1] = 255; o[i + 2] = 255; o[i + 3] = 255;
          } else {
            o[i + 3] = 0;
          }
        }
      }
    }
    ctx.putImageData(out, 0, 0);
    return { ok: true, png: c.toDataURL('image/png'), opaque, fillRatio, w, h, edge };
  }, { src: dataUrl, mode });
}

function writeDataUrl(dest, dataUrl) {
  const b64 = String(dataUrl).split(',')[1];
  fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
}

async function main() {
  fs.mkdirSync(path.join(OUT, 'silhouette'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'lineart'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'qa'), { recursive: true });
  const sources = pickSources();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const results = [];
  for (const src of sources) {
    const dataUrl = `data:image/png;base64,${fs.readFileSync(src.file).toString('base64')}`;
    const sil = await transformInPage(page, dataUrl, 'silhouette');
    let line = { ok: false, reason: 'skipped-existing-coloring' };
    if (!src.hasColoring) {
      line = await transformInPage(page, dataUrl, 'lineart');
    }
    const row = {
      key: src.key,
      score: src.score,
      sourceKind: src.kind,
      sourcePath: path.relative(ROOT, src.file).replace(/\\/g, '/'),
      hasExistingColoring: src.hasColoring,
      silhouette: null,
      lineart: null,
      manual_art_needed: false,
    };
    if (sil.ok) {
      const dest = path.join(OUT, 'silhouette', `${src.key}.png`);
      writeDataUrl(dest, sil.png);
      row.silhouette = path.relative(ROOT, dest).replace(/\\/g, '/');
    } else {
      row.manual_art_needed = true;
      row.silhouetteFail = sil.reason;
    }
    if (src.hasColoring) {
      row.lineart = 'HAVE_EXISTING_COLORING';
    } else if (line.ok) {
      const dest = path.join(OUT, 'lineart', `${src.key}.png`);
      writeDataUrl(dest, line.png);
      row.lineart = path.relative(ROOT, dest).replace(/\\/g, '/');
    } else {
      row.manual_art_needed = true;
      row.lineartFail = line.reason;
    }
    results.push(row);
  }
  await browser.close();

  const silOk = results.filter((r) => r.silhouette).length;
  const lineOk = results.filter((r) => r.lineart && r.lineart !== 'HAVE_EXISTING_COLORING').length;
  const existingLine = results.filter((r) => r.lineart === 'HAVE_EXISTING_COLORING').length;
  const manual = results.filter((r) => r.manual_art_needed).length;

  const sample = results.filter((r) => r.silhouette).slice(0, SAMPLE_N);
  const qaNotes = sample.map((r) => r.key);
  const manifest = {
    spec: 'derived-visual-variants',
    updated_at: new Date().toISOString(),
    source_canonical: true,
    no_live_manifest_write: true,
    requested: TARGET,
    selected: results.length,
    silhouette_created: silOk,
    lineart_created: lineOk,
    existing_coloring_skipped: existingLine,
    manual_art_needed: manual,
    qa_sample_keys: qaNotes,
    items: results,
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({
    selected: results.length,
    silhouette_created: silOk,
    lineart_created: lineOk,
    existing_coloring_skipped: existingLine,
    manual_art_needed: manual,
    out: DERIVED_REL,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
