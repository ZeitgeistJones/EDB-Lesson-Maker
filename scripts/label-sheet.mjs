/**
 * Pre-pass: vision-label a Manus / ChatGPT contact sheet so import-sheet does
 * not need hand-typed --names/--roles/--scales/--anchors CSVs.
 *
 * Flow:
 *   1. Slice the sheet with equal-pitch cell math (same rows×cols pitch as
 *      import-sheet gutter clean / reading order) — no keying yet.
 *   2. Build a numbered contact sheet (index in each cell corner).
 *   3. One Anthropic vision call on that image + JSON schema.
 *   4. Write labels.json (index→fields). Mapping is by cell index `i`, never
 *      by guessing position — kills off-by-one shifts of a whole 32-pack.
 *
 * Low-confidence cells stay in labels.json under `review` and are NOT offered
 * for PropBank merge when import-sheet --labels=… runs (see import-sheet header).
 *
 *   node scripts/label-sheet.mjs --sheet=<png> --grid=8x4 --out=tmp/labels.json
 *   node scripts/label-sheet.mjs --sheet=<png> --grid=2x2 --composite-only --out=tmp/labels-smoke.json
 *   npm run assets:label-sheet -- --sheet=<png> --grid=8x4
 *
 * --grid is rows×cols. A 4-column × 8-row Manus portrait pack is --grid=8x4.
 *
 * Env: ANTHROPIC_API_KEY (required unless --composite-only). Optional
 * ANTHROPIC_MODEL (default claude-haiku-4-5 — cheap vision).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const ANCHORS = new Set(['bottom', 'top', 'center']);
const CONF = new Set(['high', 'medium', 'low']);

function readPngSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function warnGridAspect(sheetPath, rows, cols) {
  try {
    const size = readPngSize(sheetPath);
    if (!size || !size.w || !size.h) return;
    const imgAspect = size.w / size.h;
    const gridAspect = cols / rows;
    if (Math.abs(imgAspect - gridAspect) > 0.35) {
      console.warn(
        `\nWARNING: --grid=${rows}x${cols} (cols/rows=${gridAspect.toFixed(2)}) does not match sheet ${size.w}x${size.h} (aspect ${imgAspect.toFixed(2)}).`
      );
      console.warn(
        '  --grid is rows×cols. A 4-column × 8-row Manus portrait pack is --grid=8x4, not 4x8.\n'
      );
    }
  } catch (_) {
    /* advisory */
  }
}

/** Equal-pitch cells + corner index — same reading order as import-sheet. */
async function buildNumberedComposite(sheetPath, rows, cols, outPng) {
  const dataUrl = `data:image/png;base64,${fs.readFileSync(sheetPath).toString('base64')}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const b64 = await page.evaluate(
      async ({ url, gr, gc }) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const W = img.width;
        const H = img.height;
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const cw = W / gc;
        const ch = H / gr;
        const fontPx = Math.max(18, Math.round(Math.min(cw, ch) * 0.18));
        ctx.font = `bold ${fontPx}px sans-serif`;
        ctx.textBaseline = 'top';

        for (let r = 0; r < gr; r++) {
          for (let col = 0; col < gc; col++) {
            const i = r * gc + col;
            const x = Math.round(col * cw);
            const y = Math.round(r * ch);
            const label = String(i);
            const pad = Math.max(4, Math.round(fontPx * 0.2));
            const tw = ctx.measureText(label).width + pad * 2;
            const th = fontPx + pad * 2;
            ctx.fillStyle = 'rgba(250, 204, 21, 0.92)';
            ctx.fillRect(x + 4, y + 4, tw, th);
            ctx.fillStyle = '#0f172a';
            ctx.fillText(label, x + 4 + pad, y + 4 + pad);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
            ctx.lineWidth = Math.max(1, Math.round(Math.min(cw, ch) * 0.01));
            ctx.strokeRect(x + 1, y + 1, Math.round(cw) - 2, Math.round(ch) - 2);
          }
        }
        return c.toDataURL('image/png').split(',')[1];
      },
      { url: dataUrl, gr: rows, gc: cols }
    );
    fs.mkdirSync(path.dirname(outPng), { recursive: true });
    fs.writeFileSync(outPng, Buffer.from(b64, 'base64'));
    return outPng;
  } finally {
    await browser.close();
  }
}

function loadManifestKeys() {
  const manifestPath = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return Object.keys(manifest.props || {}).sort();
  } catch (err) {
    console.warn(`Note: could not read manifest keys (${err.message}); existingMatch will be weaker.`);
    return [];
  }
}

function buildPrompt({ rows, cols, cellCount, manifestKeys, packHint }) {
  const keysSample =
    manifestKeys.length > 400
      ? `${manifestKeys.slice(0, 400).join(', ')} … (${manifestKeys.length} total)`
      : manifestKeys.join(', ');
  return `You are labeling a ClassIn ESL prop contact sheet for PropBank import.

The image is a NUMBERED grid: ${rows} rows × ${cols} cols = ${cellCount} cells.
Each cell has its reading-order index printed in the top-left corner (0 … ${cellCount - 1}).
Reading order is left→right, then top→bottom. Cell index i = row * ${cols} + col.

Return ONLY valid JSON (no markdown) shaped as:
{
  "cells": [
    {
      "i": 22,
      "key": "ship-wheel",
      "role": "object",
      "relativeScale": 0.45,
      "anchor": "center",
      "tags": ["nautical","steering","wood"],
      "subject": "object",
      "variantOf": null,
      "existingMatch": null,
      "confidence": "high"
    }
  ]
}

Rules:
- Include exactly one object per cell index 0…${cellCount - 1}. Every i must appear once.
- key: kebab-case slug, noun-like, unique within this sheet. Distinguish siblings
  (ship-wheel-wood vs ship-wheel-steel) via key and/or variantOf.
- role: furniture | container | tool | object | hero | playPart | timer | cover | tray (best fit).
- relativeScale: real-world size vs biggest props (door≈1.0, chair≈0.6, backpack≈0.35, pencil≈0.1).
  Judge from the object, not a default 0.45 for everything.
- anchor: bottom (rests on floor), top (hangs), center (floats).
- tags: 2–6 short lowercase tags.
- subject: usually "object"; use "person" only for people/character cutouts.
- variantOf: kebab key of a sibling on THIS sheet or null.
- existingMatch: if this is the same or a near-twin of an EXISTING PropBank key below, set that key; else null.
- confidence: "high" | "medium" | "low". Use "low" when the cell is empty, unreadable, duplicate mush, or you are guessing the name.
${packHint ? `- Theme / pack hint: ${packHint}. Prefer tags/keys that fit this theme.\n` : ''}
EXISTING PropBank keys (for existingMatch):
${keysSample || '(none loaded)'}
`;
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('empty model response');
  try {
    return JSON.parse(raw);
  } catch (_) {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) return JSON.parse(fence[1].trim());
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('could not parse JSON from model response');
  }
}

function normalizeCells(parsed, cellCount) {
  const list = Array.isArray(parsed) ? parsed : parsed.cells;
  if (!Array.isArray(list) || !list.length) {
    throw new Error('model JSON missing cells[]');
  }
  const byI = new Map();
  for (const raw of list) {
    if (raw == null || typeof raw !== 'object') continue;
    const i = Number(raw.i);
    if (!Number.isInteger(i) || i < 0 || i >= cellCount) {
      console.warn(`Skipping out-of-range cell i=${raw.i}`);
      continue;
    }
    const key = String(raw.key || '')
      .replace(/[^a-z0-9-]+/gi, '-')
      .toLowerCase()
      .replace(/^-+|-+$/g, '');
    if (!key) {
      console.warn(`Skipping cell i=${i} — empty key`);
      continue;
    }
    let anchor = String(raw.anchor || 'center').toLowerCase();
    if (!ANCHORS.has(anchor)) anchor = 'center';
    let confidence = String(raw.confidence || 'medium').toLowerCase();
    if (!CONF.has(confidence)) confidence = 'medium';
    let relativeScale = Number(raw.relativeScale);
    if (!Number.isFinite(relativeScale) || relativeScale <= 0 || relativeScale > 1.5) {
      relativeScale = 0.35;
      if (confidence === 'high') confidence = 'medium';
    }
    const tags = Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 8)
      : [];
    const subject = raw.subject != null ? String(raw.subject).trim().toLowerCase() : 'object';
    const variantOf =
      raw.variantOf != null && String(raw.variantOf).trim()
        ? String(raw.variantOf)
            .replace(/[^a-z0-9-]+/gi, '-')
            .toLowerCase()
            .replace(/^-+|-+$/g, '')
        : null;
    const existingMatch =
      raw.existingMatch != null && String(raw.existingMatch).trim()
        ? String(raw.existingMatch)
            .replace(/[^a-z0-9-]+/gi, '-')
            .toLowerCase()
            .replace(/^-+|-+$/g, '')
        : null;
    byI.set(i, {
      i,
      key,
      role: String(raw.role || 'object').trim() || 'object',
      relativeScale: Number(relativeScale.toFixed(3)),
      anchor,
      tags,
      subject: subject || 'object',
      variantOf,
      existingMatch,
      confidence,
    });
  }

  const missing = [];
  for (let i = 0; i < cellCount; i++) {
    if (!byI.has(i)) missing.push(i);
  }
  if (missing.length) {
    throw new Error(
      `labels missing ${missing.length} cell index(es): ${missing.slice(0, 12).join(',')}` +
        (missing.length > 12 ? '…' : '')
    );
  }

  const cells = [];
  for (let i = 0; i < cellCount; i++) cells.push(byI.get(i));

  // Unique keys within the sheet (suffix -b, -c… on collisions).
  const seen = new Map();
  for (const cell of cells) {
    const base = cell.key;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    if (n > 1) {
      cell.key = `${base}-${String.fromCharCode(96 + n)}`;
      if (cell.confidence === 'high') cell.confidence = 'medium';
    }
  }

  return cells;
}

async function callAnthropicVision({ imageB64, prompt, model }) {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY missing. Add it to repo .env or the environment, or pass --composite-only to skip the API.'
    );
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: imageB64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error?.message || `Anthropic HTTP ${resp.status}`;
    throw new Error(msg);
  }
  const text = (data.content || [])
    .filter((b) => b && b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { text, model: data.model || model, usage: data.usage || null };
}

async function main() {
  const sheetArg = arg('sheet', '') || (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '');
  if (!sheetArg) {
    console.error(
      'usage: node scripts/label-sheet.mjs --sheet=<png> --grid=8x4 [--out=tmp/labels.json] [--composite-only] [--pack=theme]'
    );
    process.exit(1);
  }
  const sheetPath = path.resolve(ROOT, sheetArg);
  if (!fs.existsSync(sheetPath)) {
    console.error(`No sheet at ${sheetPath}`);
    process.exit(1);
  }

  const [rows, cols] = arg('grid', '').split('x').map(Number);
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    console.error('--grid must be rows×cols in whole numbers, e.g. --grid=8x4 for 8 rows of 4 (Manus portrait packs)');
    process.exit(1);
  }
  const cellCount = rows * cols;
  warnGridAspect(sheetPath, rows, cols);

  const outPath = path.resolve(
    ROOT,
    arg(
      'out',
      path.join(
        'tmp',
        'labels',
        `${path.basename(sheetPath, path.extname(sheetPath))}-labels.json`
      )
    )
  );
  const numberedPath = path.resolve(
    ROOT,
    arg('numbered', path.join(path.dirname(outPath), `${path.basename(outPath, '.json')}-numbered.png`))
  );

  console.log(`Building numbered ${rows}x${cols} composite (${cellCount} cells)…`);
  await buildNumberedComposite(sheetPath, rows, cols, numberedPath);
  console.log(`Numbered sheet: ${path.relative(ROOT, numberedPath)}`);

  if (flag('composite-only')) {
    const stub = {
      version: 1,
      sheet: path.relative(ROOT, sheetPath).replace(/\\/g, '/'),
      grid: { rows, cols },
      numberedSheet: path.relative(ROOT, numberedPath).replace(/\\/g, '/'),
      compositeOnly: true,
      cells: [],
      ready: [],
      review: [],
    };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(stub, null, 2));
    console.log(`--composite-only: wrote stub ${path.relative(ROOT, outPath)} (no API call).`);
    return;
  }

  const model = (process.env.ANTHROPIC_MODEL || arg('model', 'claude-haiku-4-5')).trim();
  const manifestKeys = loadManifestKeys();
  const prompt = buildPrompt({
    rows,
    cols,
    cellCount,
    manifestKeys,
    packHint: arg('pack', ''),
  });
  const imageB64 = fs.readFileSync(numberedPath).toString('base64');

  console.log(`Calling Anthropic (${model}) on whole numbered sheet…`);
  const { text, model: usedModel, usage } = await callAnthropicVision({ imageB64, prompt, model });
  const parsed = extractJson(text);
  const cells = normalizeCells(parsed, cellCount);
  const review = cells.filter((c) => c.confidence === 'low');
  const ready = cells.filter((c) => c.confidence !== 'low');

  const out = {
    version: 1,
    sheet: path.relative(ROOT, sheetPath).replace(/\\/g, '/'),
    grid: { rows, cols },
    numberedSheet: path.relative(ROOT, numberedPath).replace(/\\/g, '/'),
    model: usedModel,
    usage,
    cells,
    ready: ready.map((c) => c.i),
    review: review.map((c) => c.i),
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`\nWrote ${path.relative(ROOT, outPath)}`);
  console.log(`Ready for import-sheet merge path: ${ready.length}  |  review (low confidence): ${review.length}`);
  if (review.length) {
    console.log(
      `Review indices (not merged by import-sheet --labels): ${review.map((c) => `${c.i}:${c.key}`).join(', ')}`
    );
  }
  console.log(`\nNext:\n  npm run assets:import-sheet -- ${path.relative(ROOT, sheetPath)} --grid=${rows}x${cols} --labels=${path.relative(ROOT, outPath)} --prefix=<theme-> --pack=<theme>`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
