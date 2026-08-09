/**
 * First-class bulk verb: turn one contact sheet into a folder of staged,
 * manifest-safe prop cutouts in a single command.
 *
 * This wraps scripts/import-prop.mjs (the deterministic keyer, unchanged) so no
 * agent has to fork it again to do a staged bulk run. It:
 *   1. Slices + keys every cell of --grid in one browser (import-prop --sheet).
 *   2. Auto-forces the soft gates and hard-blocks only C1/C6/C7 tiles, listing
 *      the handful to regenerate (import-prop's SHEET_BLOCKING does this).
 *   3. Applies --prefix so --names can be bare nouns (sci- + beaker → sci-beaker).
 *   4. Writes staged PNGs + a <prefix>rows.json (manifest-shape rows with a
 *      stagedPath) to the output dir — never the live manifest or img dir.
 *   5. Emits ONE QA composite (light / dark / scene / 96px dock) for the sheet.
 *
 * The agent's only remaining jobs are naming, reviewing the one QA sheet, and
 * eyeballing the flagged tiles — the parts that genuinely need eyes.
 *
 *   node scripts/import-sheet.mjs sheet.png --grid=4x4 --prefix=sci- \
 *     --names=beaker,flask,test-tube,... \
 *     --roles=tool,tool,tool,... --scales=0.2,0.2,... --anchors=bottom,... \
 *     --pack=science --stage=tmp/import/science
 *
 * Fast path (vision labels instead of four CSVs):
 *   node scripts/label-sheet.mjs --sheet=sheet.png --grid=8x4 --out=tmp/labels.json
 *   node scripts/import-sheet.mjs sheet.png --grid=8x4 --labels=tmp/labels.json \
 *     --prefix=nau- --pack=nautical
 *
 * Options:
 *   --grid       RxC of the sheet (required), e.g. --grid=8x4 (rows×cols;
 *                Manus 4-col×8-row portrait packs are 8x4, not 4x8)
 *   --names      bare nouns, one per cell in reading order (required unless --labels)
 *   --labels     path to labels.json from scripts/label-sheet.mjs — supplies
 *                names/roles/scales/anchors (+ tags/subject/variantOf). When set,
 *                the four CSVs are optional. Cells with confidence:"low" are
 *                keyed for eyeballing but staged into a review bucket
 *                (review:true + skip:true) and are NOT offered for PropBank merge.
 *   --prefix     theme prefix prepended to every name for the key/filename
 *   --roles      parallel to --names; short lists fall back per import-prop
 *   --scales     parallel to --names
 *   --anchors    parallel to --names
 *   --pack       theme pack tag recorded on each staged row
 *   --stage      output dir for staged PNGs + rows.json + QA (default
 *                tmp/import-sheet/<prefix-or-sheet-name>)
 *   --stage-all  keep every non-empty tile, even hard-blocked ones, for review
 *   --no-qa      skip the QA composite
 *   --no-edge-clean  skip the gutter-cuff pre-clean (key the raw sheet as-is)
 *   --edge-inset paint band width in px for the pre-clean (default 24)
 *   --threshold --size --margin --white --white-tol   forwarded to the keyer
 *
 * Manus 4x8 sheets bloom bright pixels into the outer frame and the inter-tile
 * gutters while the composed props sit safely inside each cell. That bloom is a
 * dirty field that hard-blocks C1 on roughly half a sheet, so before slicing we
 * paint pure black (#000000) over the outer frame band and the gutters at the
 * grid pitch — killing the contamination without touching object bodies. This
 * is on by default; --no-edge-clean keys the raw sheet, --edge-inset sets the
 * band width. Folded in from tmp/manus-import/batch-run6/_src/clean-sheet.ps1.
 *
 * Decorative/character packs: before merge, set decorative:true on staged
 * *-rows.json rows and extend manifest decorativeHints — importer does not.
 * See docs/prop-style-lock.md (Decorative packs) + docs/import-sheet-usage.md.
 *
 * Dedup for this shift is a simple read-only manifest key-scan: an existing key
 * is marked "skip" in rows.json (the tile is still keyed into the scratch dir,
 * it is just not offered for merge). It does NOT modify the manifest.
 * TODO(dedup-helper): route new/skip/overlap through the shared propBank.js
 * resolver so every importer gives identical answers and tag/word overlaps are
 * caught too — deferred here because propBank.js is owned by another worker.
 * See tmp/manus-import/pipeline-audit.md item 4.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);
const slug = (s) => s.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
const csv = (name) =>
  arg(name, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// --- Guard clauses on inputs ------------------------------------------------

const sheetArg = process.argv[2];
if (!sheetArg || sheetArg.startsWith('--')) {
  console.error('Pass the sheet PNG as the first argument, e.g. node scripts/import-sheet.mjs sheet.png --grid=4x4 --names=...');
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

// Guard: swapped RxC paints gutters through prop bodies → tall thin cutoffs.
// Portrait Manus sheets (≈9:16) with 4-col×8-row art need --grid=8x4, not 4x8.
// Reminder is intentional noise — a wrong axis ruins an entire 32-pack.
try {
  // Lazy size read via PNG IHDR (bytes 16–23) — no native deps.
  const fd = fs.openSync(sheetPath, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    const imgW = buf.readUInt32BE(16);
    const imgH = buf.readUInt32BE(20);
    if (imgW > 0 && imgH > 0) {
      const imgAspect = imgW / imgH;
      const gridAspect = cols / rows;
      if (Math.abs(imgAspect - gridAspect) > 0.35) {
        console.warn(
          `\nWARNING: --grid=${rows}x${cols} (cols/rows=${gridAspect.toFixed(2)}) does not match sheet ${imgW}x${imgH} (aspect ${imgAspect.toFixed(2)}).`
        );
        console.warn(
          '  --grid is rows×cols (NOT cols×rows). A Manus portrait pack with 4 columns and 8 rows is --grid=8x4.'
        );
        console.warn(
          '  Swapping to 4x8 paints gutters through prop bodies and yields tall thin cutoffs. Fix --grid before keying.\n'
        );
      }
    }
  }
} catch (_) {
  /* size probe is advisory only */
}

const prefix = arg('prefix', '');
const labelsPath = arg('labels', '');
/** @type {Map<number, object>} */
const labelByIndex = new Map();
/** @type {Set<string>} keys staged for review only (low-confidence labels) */
const reviewKeys = new Set();

if (labelsPath) {
  const absLabels = path.resolve(ROOT, labelsPath);
  if (!fs.existsSync(absLabels)) {
    console.error(`No labels file at ${absLabels}`);
    process.exit(1);
  }
  const labelsDoc = JSON.parse(fs.readFileSync(absLabels, 'utf8'));
  const labelCells = Array.isArray(labelsDoc) ? labelsDoc : labelsDoc.cells;
  if (!Array.isArray(labelCells) || !labelCells.length) {
    console.error(`labels file has no cells[] — run label-sheet without --composite-only first: ${absLabels}`);
    process.exit(1);
  }
  for (const cell of labelCells) {
    const i = Number(cell?.i);
    if (!Number.isInteger(i) || i < 0 || i >= cellCount) {
      console.error(`labels cell i=${cell?.i} out of range for --grid=${rows}x${cols}`);
      process.exit(1);
    }
    if (labelByIndex.has(i)) {
      console.error(`labels file has duplicate index i=${i}`);
      process.exit(1);
    }
    labelByIndex.set(i, cell);
  }
  for (let i = 0; i < cellCount; i++) {
    if (!labelByIndex.has(i)) {
      console.error(`labels file missing cell index i=${i} (need 0…${cellCount - 1})`);
      process.exit(1);
    }
  }
  console.log(`Using labels from ${path.relative(ROOT, absLabels)} (${cellCount} cells by index).\n`);
}

const bareNames = labelsPath
  ? Array.from({ length: cellCount }, (_, i) => String(labelByIndex.get(i).key || '').trim())
  : csv('names');
if (bareNames.length !== cellCount) {
  console.error(
    labelsPath
      ? `labels produced ${bareNames.length} name(s) but --grid=${rows}x${cols} has ${cellCount} cells.`
      : `--names lists ${bareNames.length} name(s) but --grid=${rows}x${cols} has ${cellCount} cells. Name every cell in reading order (or pass --labels= from label-sheet).`
  );
  process.exit(1);
}
if (bareNames.some((n) => !n)) {
  console.error('Every cell needs a non-empty key/name (labels.key or --names).');
  process.exit(1);
}
// A bare noun gets the prefix; a name already carrying it is left alone so the
// same --names list works whether or not the caller pre-prefixed it.
const keys = bareNames.map((n) => slug(prefix && !slug(n).startsWith(slug(prefix)) ? prefix + n : n));

// Resolve parallel CSVs; --labels fills gaps (and wins when CSV omitted).
const rolesFromLabels = labelsPath
  ? Array.from({ length: cellCount }, (_, i) => labelByIndex.get(i).role || 'object')
  : null;
const scalesFromLabels = labelsPath
  ? Array.from({ length: cellCount }, (_, i) => {
      const s = Number(labelByIndex.get(i).relativeScale);
      return Number.isFinite(s) ? String(s) : '';
    })
  : null;
const anchorsFromLabels = labelsPath
  ? Array.from({ length: cellCount }, (_, i) => labelByIndex.get(i).anchor || 'center')
  : null;

const rolesCsv = csv('roles');
const scalesCsv = csv('scales');
const anchorsCsv = csv('anchors');
const rolesList = rolesCsv.length ? rolesCsv : rolesFromLabels || [];
const scalesList = scalesCsv.length ? scalesCsv : scalesFromLabels || [];
const anchorsList = anchorsCsv.length ? anchorsCsv : anchorsFromLabels || [];

if (labelsPath) {
  for (let i = 0; i < cellCount; i++) {
    const cell = labelByIndex.get(i);
    if (String(cell.confidence || '').toLowerCase() === 'low') {
      reviewKeys.add(keys[i]);
    }
  }
  if (reviewKeys.size) {
    console.log(
      `Low-confidence labels → review bucket (no PropBank merge): ${[...reviewKeys].join(', ')}\n`
    );
  }
}

const stageDir = path.resolve(ROOT, arg('stage', path.join('tmp', 'import-sheet', slug(prefix || path.basename(sheetPath, path.extname(sheetPath))).replace(/-$/, ''))));
const rawDir = path.join(stageDir, 'raw');
const resultsPath = path.join(stageDir, '_results.json');
const rowsName = `${slug(prefix || 'sheet').replace(/-$/, '')}-rows.json`;
const rowsPath = path.join(stageDir, rowsName);
const qaPath = path.join(stageDir, `${slug(prefix || 'sheet').replace(/-$/, '')}-qa.jpg`);

fs.mkdirSync(stageDir, { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });

// --- Read-only manifest key-scan for dedup ---------------------------------

const manifestPath = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');
let manifestKeys = new Set();
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifestKeys = new Set(Object.keys(manifest.props || {}));
} catch (err) {
  console.log(`Note: could not read manifest for dedup (${err.message}); treating every key as new.`);
}

// --- Gutter-cuff pre-clean --------------------------------------------------
// Paint pure black over the outer frame band + the inter-tile gutters so the
// keyer sees a clean black field per cell. On by default; --no-edge-clean keys
// the raw sheet, --edge-inset sets the band width. The gutters are painted at
// the grid pitch (2*inset wide, centred on each cut line) so props inside a
// cell are never touched — only the contaminated border/gutter band is.
async function preCleanSheet(srcPath, gr, gc, inset) {
  const dataUrl = `data:image/png;base64,${fs.readFileSync(srcPath).toString('base64')}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const b64 = await page.evaluate(
      async ({ url, gr, gc, inset }) => {
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
        ctx.fillStyle = '#000000';
        // Outer frame band.
        ctx.fillRect(0, 0, W, inset);
        ctx.fillRect(0, H - inset, W, inset);
        ctx.fillRect(0, 0, inset, H);
        ctx.fillRect(W - inset, 0, inset, H);
        // Internal gutters at the grid pitch.
        const cw = W / gc;
        const ch = H / gr;
        for (let cx = 1; cx < gc; cx++) {
          const x = Math.round(cx * cw);
          ctx.fillRect(x - inset, 0, 2 * inset, H);
        }
        for (let ry = 1; ry < gr; ry++) {
          const y = Math.round(ry * ch);
          ctx.fillRect(0, y - inset, W, 2 * inset);
        }
        return c.toDataURL('image/png').split(',')[1];
      },
      { url: dataUrl, gr, gc, inset }
    );
    const cleanedPath = path.join(stageDir, `_edge-clean-${path.basename(srcPath)}`);
    fs.writeFileSync(cleanedPath, Buffer.from(b64, 'base64'));
    return cleanedPath;
  } finally {
    await browser.close();
  }
}

const edgeClean = !flag('no-edge-clean');
const edgeInset = Math.max(0, Math.round(Number(arg('edge-inset', '24'))));
let keySheetPath = sheetPath;
if (edgeClean && edgeInset > 0) {
  console.log(`Pre-cleaning gutter/frame band (${edgeInset}px cuff) before slicing...`);
  keySheetPath = await preCleanSheet(sheetPath, rows, cols, edgeInset);
  console.log(`Cleaned sheet written to ${path.relative(ROOT, keySheetPath)}\n`);
} else {
  console.log('Edge-clean disabled (--no-edge-clean) — keying the raw sheet.\n');
}

// --- Run the real keyer in staging mode ------------------------------------

const importArgs = [
  path.join('scripts', 'import-prop.mjs'),
  keySheetPath,
  '--sheet',
  `--grid=${rows}x${cols}`,
  '--stage',
  `--outdir=${stageDir}`,
  `--rawdir=${rawDir}`,
  `--results=${resultsPath}`,
  `--names=${keys.join(',')}`,
];
if (flag('stage-all')) importArgs.push('--stage-all');
if (rolesList.length) importArgs.push(`--roles=${rolesList.join(',')}`);
if (scalesList.length) importArgs.push(`--scales=${scalesList.join(',')}`);
if (anchorsList.length) importArgs.push(`--anchors=${anchorsList.join(',')}`);
for (const pass of ['pack', 'threshold', 'size', 'margin', 'white-tol']) {
  const v = arg(pass);
  if (v != null) importArgs.push(`--${pass}=${v}`);
}
if (flag('white')) importArgs.push('--white');

console.log(`Keying ${cellCount} tile(s) from ${path.relative(ROOT, sheetPath)} into ${path.relative(ROOT, stageDir)} (staged, no manifest writes)\n`);
const run = spawnSync('node', importArgs, { cwd: ROOT, stdio: 'inherit' });
if (run.status !== 0) {
  // A non-zero exit here means at least one tile was hard-blocked; that is
  // expected on a real sheet and not a wrapper failure. Keep going so the
  // rows.json and QA still reflect what landed.
  console.log('\n(import-prop exited non-zero — one or more tiles hard-blocked; continuing to build rows + QA.)');
}

if (!fs.existsSync(resultsPath)) {
  console.error(`\nNo results at ${resultsPath} — the keyer produced nothing. Check the sheet and grid.`);
  process.exit(1);
}
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// --- Build rows.json + a plain-language summary ----------------------------

const rowsOut = [];
const cleanKeyed = [];
const softForced = [];
const hardBlocked = [];
const dedupSkips = [];
const reviewBucket = [];
const reviewDir = path.join(stageDir, 'review');
const keyToLabel = new Map();
if (labelsPath) {
  for (let i = 0; i < cellCount; i++) {
    keyToLabel.set(keys[i], labelByIndex.get(i));
  }
}

for (const r of results) {
  const label = keyToLabel.get(r.name) || null;
  const isReview = reviewKeys.has(r.name);
  let dedup = manifestKeys.has(r.name) ? 'skip' : 'new';
  if (isReview) dedup = 'review';
  else if (label?.existingMatch && manifestKeys.has(slug(label.existingMatch))) {
    // Near-twin called out by the labeler — still staged, not merge-offered.
    dedup = 'skip';
  }
  if (dedup === 'skip') dedupSkips.push(r.name);
  if (isReview) reviewBucket.push(r.name);

  let row = r.landed ? { ...r.row } : null;
  if (row && label) {
    if (Array.isArray(label.tags) && label.tags.length) row.tags = label.tags;
    if (label.subject) row.subject = label.subject;
    if (label.variantOf) {
      const v = slug(
        prefix && !slug(label.variantOf).startsWith(slug(prefix)) ? prefix + label.variantOf : label.variantOf
      );
      row.variantOf = v;
    }
    if (Number.isFinite(Number(label.relativeScale))) {
      row.relativeScale = Number(label.relativeScale);
    }
    if (label.role) row.role = label.role;
    if (label.anchor) row.anchor = label.anchor;
    if (label.existingMatch) row.existingMatch = slug(label.existingMatch);
    row.labelConfidence = label.confidence || null;
  }

  const entry = {
    key: r.name,
    dedup,
    blocked: !r.landed,
    forced: !!r.forced,
    reason: isReview ? 'low-confidence label (review bucket)' : r.reason || null,
    stagedPath: r.dest || null,
    gates: r.gates || [],
    failed: r.failed || [],
    row: isReview ? null : row,
    review: isReview,
    label: label
      ? {
          i: label.i,
          confidence: label.confidence || null,
          existingMatch: label.existingMatch || null,
        }
      : null,
  };

  // Keep a copy of the keyed PNG + label meta under review/ for eyeballing;
  // merge-staged skips these because row is null / skip is set.
  if (isReview) {
    entry.skip = true;
    if (r.landed && r.dest) {
      fs.mkdirSync(reviewDir, { recursive: true });
      const srcPng = path.resolve(ROOT, r.dest);
      if (fs.existsSync(srcPng)) {
        const destPng = path.join(reviewDir, path.basename(srcPng));
        fs.copyFileSync(srcPng, destPng);
        entry.reviewPath = path.relative(ROOT, destPng).replace(/\\/g, '/');
      }
      entry.reviewRow = row;
    }
  }

  rowsOut.push(entry);

  if (!r.landed) {
    hardBlocked.push(`${r.name} (${r.reason || 'blocked'})`);
    continue;
  }
  if (isReview) continue;
  const softIds = (r.failed || []).filter((g) => !['C1', 'C6', 'C7'].includes(g));
  if (softIds.length) softForced.push(`${r.name} [${softIds.join(',')}]`);
  else cleanKeyed.push(r.name);
}

fs.writeFileSync(rowsPath, JSON.stringify(rowsOut, null, 2));
if (reviewBucket.length) {
  const reviewJson = path.join(reviewDir, 'review-labels.json');
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(
    reviewJson,
    JSON.stringify(
      rowsOut.filter((e) => e.review),
      null,
      2
    )
  );
}

console.log(`\n=== import-sheet summary ===`);
console.log(`Staged dir : ${path.relative(ROOT, stageDir)}`);
console.log(`Rows file  : ${path.relative(ROOT, rowsPath)}  (${rowsOut.filter((e) => e.row).length} merge-ready row(s))`);
console.log(`Clean auto-keyed (${cleanKeyed.length}): ${cleanKeyed.join(', ') || '—'}`);
console.log(`Soft-forced, look but kept (${softForced.length}): ${softForced.join(', ') || '—'}`);
console.log(`HARD-BLOCKED, regenerate these (${hardBlocked.length}): ${hardBlocked.join(', ') || '—'}`);
console.log(`Dedup skips, key already in manifest (${dedupSkips.length}): ${dedupSkips.join(', ') || '—'}`);
console.log(`Review bucket, low-confidence labels (${reviewBucket.length}): ${reviewBucket.join(', ') || '—'}`);

// --- One QA composite for the whole sheet ----------------------------------

if (flag('no-qa')) {
  console.log(`\nQA skipped (--no-qa). Staged PNGs are in ${path.relative(ROOT, stageDir)}.`);
  process.exit(0);
}

// Build the QA tile set from the explicit staged paths we just produced, NOT by
// re-globbing stageDir. The gutter-cuff pre-clean drops an _edge-clean-*.png
// intermediate (the whole pre-cleaned sheet) in this same dir, and a directory
// glob would show it as a bogus extra "tile". Every real staged tile PNG has a
// stagedPath (r.dest) in rowsOut; blocked/non-staged tiles have none and no PNG
// on disk — so this list is exactly the real tiles and nothing else.
const tileFiles = rowsOut
  .map((e) => e.stagedPath)
  .filter((p) => p && p.toLowerCase().endsWith('.png'))
  .map((p) => path.resolve(ROOT, p))
  .filter((p) => fs.existsSync(p));
tileFiles.sort((a, b) => {
  const fa = path.basename(a);
  const fb = path.basename(b);
  return fa < fb ? -1 : fa > fb ? 1 : 0;
});
if (!tileFiles.length) {
  console.log(`\nNo staged PNGs to QA (every tile was blocked). Skipping composite.`);
  process.exit(0);
}

const cells = tileFiles.map((p) => ({
  name: path.basename(p).replace(/\.png$/i, ''),
  url: `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`,
}));

// Same four surfaces qa-props uses — light flat, dark flat, a scene tint, and a
// true 96px dock chip — so rims, vanish, baked text and mush are all visible in
// one pass. Self-contained (no manifest read) because staged PNGs are not
// registered yet.
const html = `<!doctype html><html><head><meta charset="utf8"><style>
  body{margin:0;font:13px/1.3 system-ui;background:#111;color:#eee}
  .row{display:flex;align-items:center;border-bottom:1px solid #000}
  .name{width:210px;padding:8px;font-weight:600}
  .bg{width:190px;height:190px;display:flex;align-items:center;justify-content:center}
  .light{background:#f4f1ea}.dark{background:#12202e}
  .scene{background:linear-gradient(#bfe3f5 58%,#cdeec9 58%)}
  .dock{width:120px;height:120px;background:#e9e9e9;display:flex;align-items:center;justify-content:center}
  img.full{max-width:172px;max-height:172px}
  img.chip{width:96px;height:96px;object-fit:contain}
</style></head><body>
${cells
  .map(
    (c) => `<div class="row">
  <div class="name">${c.name}</div>
  <div class="bg light"><img class="full" src="${c.url}"></div>
  <div class="bg dark"><img class="full" src="${c.url}"></div>
  <div class="bg scene"><img class="full" src="${c.url}"></div>
  <div class="dock"><img class="chip" src="${c.url}"></div>
</div>`
  )
  .join('\n')}
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 700, height: Math.max(200, cells.length * 191 + 4) } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: qaPath, type: 'jpeg', quality: 90, fullPage: true });
} finally {
  await browser.close();
}

console.log(`\nQA composite: ${path.relative(ROOT, qaPath)} (${cells.length} tile(s))`);
console.log('Look for: dark rim on the light flat, prop vanishing on the dark flat, mush at dock size.');
