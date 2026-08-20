/**
 * Closed-baseline ART_REDO + SOURCE_CORRUPT replacement harvest.
 * Stockpile only — no import / keying / wiring and no live asset overwrite.
 *
 *   node scripts/manus/request-art-redo-harvest.mjs --wave=1 --fire
 *   node scripts/manus/request-art-redo-harvest.mjs --wave=1 --poll-only
 *   node scripts/manus/request-art-redo-harvest.mjs --source-corrupt --fire
 *
 * Source queues:
 * - audit/visual-assets/queues/art-redo-regeneration-queue.jsonl
 * - audit/visual-assets/queues/source-corrupt-queue.jsonl
 *
 * Sheets: tmp/manus-art-replacements/<wave-id>/sheets/
 * Inventory: tmp/manus-art-replacements/inventory.json
 * Tracked copy: docs/art-replacements-stockpile-inventory.json
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const CELLS = 9;
const SHEETS_PER_WAVE = 5;
const WAVE_SIZE = CELLS * SHEETS_PER_WAVE;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-art-replacements');
const TRACKED_INV = path.join(ROOT, 'docs', 'art-replacements-stockpile-inventory.json');
const LOCK = path.join(STOCKPILE, '.inv.lock');
const ART_QUEUE = path.join(ROOT, 'audit', 'visual-assets', 'queues', 'art-redo-regeneration-queue.jsonl');
const CORRUPT_QUEUE = path.join(ROOT, 'audit', 'visual-assets', 'queues', 'source-corrupt-queue.jsonl');

const SAFETY_SKIP_KEYS = new Set([
  'rape',
  'massacre',
  'murder',
  'suicide',
  'torture',
  'missile',
  'bomb',
  'gun',
]);

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function slug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function readJsonl(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function safetyHit(row) {
  const blob = [row.key, row.concept, row.notes, row.major_family, ...(row.final_reason_codes || []), ...(row.reason_codes || [])]
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return [...SAFETY_SKIP_KEYS].find((bad) => blob.includes(bad)) || null;
}

function intendedConcept(row) {
  const concept = String(row.concept || row.source_provenance?.expected_concept_word || row.key || '').trim();
  return concept || String(row.key || row.asset_id || '').trim();
}

function replacementKey(row) {
  const base = slug(row.key || intendedConcept(row) || row.asset_id);
  return `redo-${base || 'asset'}`;
}

function styleFor(row) {
  const family = String(row.major_family || '').toLowerCase();
  if (family.includes('vocab')) {
    return 'white-background ESL vocab icon: clear picturable object/action/visible quality, soft matte kid illustration, no label text, no border frame.';
  }
  if (family.includes('story')) {
    return 'story cast/action/environment stock: warm child-friendly illustration, clear pose or role, simple composition, no text.';
  }
  if (family.includes('hide') || family.includes('reveal')) {
    return 'hide/reveal game asset: simple readable classroom-friendly shape with clear cavity/cover state, no text.';
  }
  if (family.includes('letters') || family.includes('literacy')) {
    return 'literacy support art: clean classroom visual, no unintended fake letters or labels unless the concept itself is a letterform.';
  }
  if (family.includes('pre-a1')) {
    return 'black-field Pre-A1 functional replacement sheet style: one clear reusable classroom visual per cell, no text.';
  }
  return 'clean ClassIn ESL educational asset, sparse child-friendly illustration, no text, no logos, no frame artifact.';
}

function repairGuidance(row) {
  const codes = new Set([...(row.final_reason_codes || []), ...(row.reason_codes || [])]);
  const tips = [];
  if (codes.has('text_artifact')) tips.push('Do not render the word, labels, letters, captions, signs, or fake handwriting.');
  if (codes.has('wrong_concept')) tips.push('Prioritize the intended concept exactly; avoid the prior wrong idea described in notes.');
  if (codes.has('ambiguous_concept')) tips.push('Make the concept concrete and instantly readable for young ESL learners.');
  if (codes.has('generation_artifact')) tips.push('Avoid box borders, stray lines, smears, duplicated fragments, malformed parts, and AI artifacts.');
  if (codes.has('weak_contrast')) tips.push('Use strong readable contrast against the requested background.');
  if (codes.has('poor_cavity') || codes.has('bad_alpha')) tips.push('Keep openings/interiors mid-tone and readable; avoid hollow alpha holes or near-black cavities.');
  if (codes.has('identity_drift')) tips.push('Preserve the named identity/role; do not drift into a generic person/object.');
  if (codes.has('source_corrupt') || codes.has('corrupt')) tips.push('Regenerate the intended raw source/provenance sheet; corruption was mechanical, not a concept rejection.');
  return tips.join(' ');
}

function sourceCorruptRows() {
  return readJsonl(CORRUPT_QUEUE).map((row, i) => ({
    ...row,
    replacement_mode: 'SOURCE_CORRUPT',
    queue_index: i,
    replacement_key: `source-corrupt-${slug(row.major_family || row.source_bank || 'raw')}-${String(i + 1).padStart(2, '0')}`,
  }));
}

function artRedoRows() {
  return readJsonl(ART_QUEUE).map((row, i) => ({
    ...row,
    replacement_mode: 'ART_REDO',
    queue_index: i,
    replacement_key: replacementKey(row),
  }));
}

function resolveBatch() {
  const sourceCorrupt = process.argv.includes('--source-corrupt');
  const all = sourceCorrupt ? sourceCorruptRows() : artRedoRows();
  const skipped = [];
  const safe = [];
  for (const row of all) {
    const hit = safetyHit(row);
    if (hit) skipped.push({ key: row.key, concept: row.concept, reason: hit });
    else safe.push(row);
  }
  if (sourceCorrupt) {
    return { id: 'source-corrupt', title: 'SOURCE_CORRUPT raw replacements', rows: safe, skipped, sourceCorrupt };
  }
  const waveN = Number(arg('wave', '1'));
  if (!Number.isInteger(waveN) || waveN < 1) throw new Error('Need --wave=N');
  const start = (waveN - 1) * WAVE_SIZE;
  return {
    id: `art-redo-wave${waveN}`,
    title: `ART_REDO replacement wave ${waveN}`,
    rows: safe.slice(start, start + WAVE_SIZE),
    skipped,
    sourceCorrupt,
    waveN,
    totalSafe: safe.length,
  };
}

function buildSheets(rows) {
  const sheets = [];
  for (let i = 0; i < rows.length; i += CELLS) {
    const chunk = rows.slice(i, i + CELLS);
    const n = sheets.length + 1;
    sheets.push({
      id: `S${n}`,
      title: `replacement sheet ${n}`,
      cells: chunk,
      incomplete: chunk.length < CELLS,
    });
  }
  return sheets;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((row, i) => {
    const concept = intendedConcept(row);
    const codes = [...new Set([...(row.final_reason_codes || []), ...(row.reason_codes || [])])].join(',') || 'redo';
    const note = String(row.notes || 'closed visual QA redo').replace(/\s+/g, ' ').slice(0, 72);
    const fix = repairGuidance(row).slice(0, 110);
    return `${i + 1}. ${row.replacement_key} — ${concept}; ${row.major_family}; ${codes}; issue: ${note}; fix: ${fix}`;
  });
  const empty =
    sheet.cells.length < CELLS
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length} have art. Leave cells ${sheet.cells.length + 1}-${CELLS} EMPTY with the same background (no fillers, no duplicates).`
      : '';
  return `SHEET ${index} — ${sheet.title} (3x3 = ${CELLS} cells):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((r) => r.replacement_key).join(',')}${empty}`;
}

function buildBrief(batch, sheets) {
  const sourceNote = batch.sourceCorrupt
    ? 'SOURCE_CORRUPT mode: preserve provenance in filenames/legends; regenerate the intended raw source sheets/assets because the old file was unreadable. Known B2 corrupt sheet tmp/manus-b2-stockpile/wave1/sheets/01.png must not block.'
    : 'ART_REDO mode: these are true visual replacements only. Do not include PASS, REVIEW, or PIPELINE_REBUILD assets.';
  const styleLines = [...new Set(batch.rows.map(styleFor))].map((s) => `- ${s}`).join('\n');
  return withEslAssetGeneratorBrief(`TASK: Produce replacement stockpile PNGs for closed visual QA at commit 4d22f6e4.

${sourceNote}

STYLE BY FAMILY:
${styleLines}

HARD RULES:
- 3x3 sheet(s), reading order left to right, top to bottom.
- One replacement per cell. Preserve the intended concept/key/family.
- ZERO readable text, labels, logos, watermarks, or border/frame artifacts unless the concept is explicitly a blank text-ready shell.
- Use the audit reason notes to avoid the prior failure.
- quality: default ONLY.
- Keep generating inside THIS task until all ${sheets.length} PNG sheets exist.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return exactly ${sheets.length} PNG sheet(s), preferably one zip plus CDN links. Include a short legend mapping keys to cells.`);
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      if (url) hits.push({ url, name: a.file_name || a.filename || a.name || 'sheet.png' });
    }
  }
  return hits;
}

function sniffKind(buf, name = '') {
  const n = String(name).toLowerCase();
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (n.endsWith('.zip')) return 'zip';
  if (n.endsWith('.png')) return 'png';
  return 'other';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback).replace(/\\/g, '/'));
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-') || fallback;
}

function walkPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPngs(p));
    else if (/\.png$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  execFileSync('tar', ['-xf', zipPath, '-C', outDir], { stdio: 'ignore' });
}

function clearNumberedSheets(sheetDir) {
  if (!fs.existsSync(sheetDir)) return;
  for (const f of fs.readdirSync(sheetDir)) {
    if (/^\d{2}\.(png|jpg|jpeg|webp)$/i.test(f)) fs.unlinkSync(path.join(sheetDir, f));
  }
}

function materializePngs(sheetDir) {
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  const byName = new Map();
  for (const p of [...walkPngs(unzipRoot), ...walkPngs(rawDir)]) {
    const key = path.basename(p).toLowerCase();
    if (!byName.has(key)) byName.set(key, p);
  }
  const sorted = [...byName.values()].sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en'));
  clearNumberedSheets(sheetDir);
  const saved = [];
  sorted.forEach((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    saved.push({ dest, bytes: fs.statSync(dest).size, name: path.basename(src), file });
  });
  return saved;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  fs.mkdirSync(rawDir, { recursive: true });
  if (fs.existsSync(unzipRoot)) fs.rmSync(unzipRoot, { recursive: true, force: true });
  fs.mkdirSync(unzipRoot, { recursive: true });

  const seen = new Set();
  let i = 0;
  let zipN = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const kind = sniffKind(buf, img.name);
    const fallback = `${String(i).padStart(2, '0')}.${kind === 'zip' ? 'zip' : kind === 'jpg' ? 'jpg' : 'png'}`;
    const dest = path.join(rawDir, safeName(img.name, fallback));
    fs.writeFileSync(dest, buf);
    if (kind === 'zip') {
      zipN += 1;
      extractZip(dest, path.join(unzipRoot, `z${zipN}`));
    }
  }
  return materializePngs(sheetDir);
}

function emptyInv() {
  return {
    spec: 'closed-baseline-art-replacements',
    baseline_commit: '4d22f6e4',
    updated_at: null,
    running_total: {
      batches_fired: 0,
      batches_downloaded: 0,
      sheets_downloaded: 0,
      sheets_large: 0,
      items_queued: 0,
      items_banked_raw: 0,
    },
    batches: {},
  };
}

function recomputeTotals(inv) {
  const batches = Object.values(inv.batches || {});
  inv.running_total = {
    batches_fired: batches.filter((b) => b.task_id).length,
    batches_downloaded: batches.filter((b) => (b.sheets || []).length).length,
    sheets_downloaded: batches.reduce((n, b) => n + (b.sheets || []).length, 0),
    sheets_large: batches.reduce((n, b) => n + (b.large_sheet_count || 0), 0),
    items_queued: batches.reduce((n, b) => n + (b.item_count || 0), 0),
    items_banked_raw: batches.reduce((n, b) => n + (b.banked_raw || 0), 0),
  };
}

async function withInvLock(fn) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  for (let i = 0; i < 80; i += 1) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 80));
    }
    if (i === 79) fs.rmSync(LOCK, { force: true });
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  recomputeTotals(inv);
  const json = JSON.stringify(inv, null, 2);
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), json);
  fs.mkdirSync(path.dirname(TRACKED_INV), { recursive: true });
  fs.writeFileSync(TRACKED_INV, json);
  return path.join(STOCKPILE, 'inventory.json');
}

function upsertInventory(batch, sheets, dump) {
  const invPath = path.join(STOCKPILE, 'inventory.json');
  let inv = emptyInv();
  if (fs.existsSync(invPath)) {
    try {
      inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    } catch {
      inv = emptyInv();
    }
  }
  if (!inv.batches) inv.batches = {};

  const items = batch.rows.map((row) => ({
    replacement_key: row.replacement_key,
    original_key: row.key || null,
    concept: intendedConcept(row),
    asset_id: row.asset_id || null,
    major_family: row.major_family || null,
    mode: row.replacement_mode,
    original_path: row.path || row.source_provenance?.source_path || null,
    reason_codes: [...new Set([...(row.final_reason_codes || []), ...(row.reason_codes || [])])],
    notes: row.notes || '',
    source_task_id: row.source_provenance?.source_task_id || null,
    source_task_url: row.source_provenance?.source_task_url || null,
    manus_task_id: dump.task_id || null,
    obvious_fail: false,
  }));

  const largeCount = (dump.saved || []).filter((s) => s.bytes > 80_000).length;
  inv.batches[batch.id] = {
    title: batch.title,
    mode: batch.sourceCorrupt ? 'SOURCE_CORRUPT' : 'ART_REDO',
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    safety_skipped_at_fire: batch.skipped || [],
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    large_sheet_count: largeCount,
    item_count: items.length,
    banked_raw: largeCount ? items.length : 0,
    items,
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

async function upsertInventoryLocked(batch, sheets, dump) {
  return withInvLock(() => upsertInventory(batch, sheets, dump));
}

const batch = resolveBatch();
const sheets = buildSheets(batch.rows);
const OUT_DIR = path.join(STOCKPILE, batch.id);
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
const pollOnly = process.argv.includes('--poll-only');

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SHEET_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      batch: batch.id,
      title: batch.title,
      mode: batch.sourceCorrupt ? 'SOURCE_CORRUPT' : 'ART_REDO',
      queued: batch.rows.length,
      total_safe_art_redo: batch.totalSafe || null,
      safety_skipped_global: batch.skipped,
      sheets: sheets.map((s) => ({ id: s.id, title: s.title, keys: s.cells.map((r) => r.replacement_key) })),
    },
    null,
    2,
  ),
);

if (!batch.rows.length) {
  await upsertInventoryLocked(batch, sheets, {
    kind: 'closed-baseline-art-replacements',
    batch: batch.id,
    sheet_dir: SHEET_DIR,
    safety_skipped: batch.skipped,
    saved: [],
  });
  console.log(JSON.stringify({ phase: 'nothing-to-send', batch: batch.id }, null, 2));
  process.exit(0);
}

const BRIEF = buildBrief(batch, sheets);
let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'closed-baseline-art-replacements',
  batch: batch.id,
  sheet_dir: SHEET_DIR,
  item_count: batch.rows.length,
};

if (!pollOnly) {
  if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: batch.title,
    agent_profile: resolveAgentProfile(),
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    interactive_mode: false,
    message: BRIEF,
  });
  taskId = created.task_id || created.id;
  dump.task_id = taskId;
  dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
  dump.created_at = new Date().toISOString();
  fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
  await upsertInventoryLocked(batch, sheets, dump);
  console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
  if (fireOnly) process.exit(0);
} else {
  if (!taskId && fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    taskId = prev.task_id;
    dump.started_at = prev.started_at || dump.started_at;
    dump.task_url = prev.task_url;
  }
  if (!taskId) throw new Error('--poll-only needs --task= or an existing run.json');
  dump.task_id = taskId;
  dump.task_url = dump.task_url || `https://manus.im/app/${taskId}`;
}

let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
let saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
const large = saved.filter((s) => s.bytes > 80_000);

if (large.length < sheets.length) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: sheets.length }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${sheets.length} replacement sheet(s) from the original brief. Fire remaining generate_image calls now. Do not restart. Do not change the key list.`,
    ),
  });
  result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
}

dump.saved = saved;
dump.agent_status = result && result.agent_status;
dump.finished_at = new Date().toISOString();
if (fs.existsSync(RUN_JSON)) {
  const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
  dump.started_at = prev.started_at || dump.started_at;
  dump.created_at = prev.created_at || dump.created_at;
  dump.task_url = dump.task_url || prev.task_url;
}
fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
const invPath = await upsertInventoryLocked(batch, sheets, dump);
const largeCount = saved.filter((s) => s.bytes > 80_000).length;
console.log(
  JSON.stringify(
    {
      phase: 'downloaded',
      batch: batch.id,
      task_id: taskId,
      task_url: dump.task_url,
      queued: batch.rows.length,
      count: saved.length,
      large: largeCount,
      sheet_dir: SHEET_DIR,
      inventory: invPath,
    },
    null,
    2,
  ),
);
if (largeCount < Math.min(1, sheets.length)) process.exit(2);

