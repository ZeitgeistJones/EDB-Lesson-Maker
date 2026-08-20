/**
 * Pre-A1 visual-language harvest (waves 1–8). Stockpile only — no import / keying / wiring.
 *
 *   node scripts/manus/request-prea1-harvest.mjs --wave=1 --fire
 *   node scripts/manus/request-prea1-harvest.mjs --wave=1 --poll-only
 *
 * Wrappers: request-prea1-wave1.mjs … wave8.mjs
 *
 * Sheets: tmp/manus-prea1-stockpile/<wave-id>/sheets/
 * Inventory: tmp/manus-prea1-stockpile/inventory.json
 * Tracked copy: docs/prea1-stockpile-inventory.json
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
import {
  STOCKPILE_REL,
  TRACKED_INV_REL,
  resolveWave,
  sheetsFor,
  conceptCount,
  filterSafety,
  loadMnemonicMap,
} from './prea1-stockpile-keys.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const TRACKED_INV = path.join(ROOT, TRACKED_INV_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function gridSize(grid) {
  const [r, c] = String(grid)
    .toLowerCase()
    .split('x')
    .map((n) => Number(n));
  return { rows: r, cols: c, total: r * c };
}

function sheetBlock(sheet, index) {
  const { total } = gridSize(sheet.grid);
  const lines = sheet.cells.map((cell, i) => `${i + 1}. ${cell.key} — ${cell.brief}`);
  const empty =
    sheet.cells.length < total
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length} have art. Leave cells ${sheet.cells.length + 1}-${total} EMPTY pure black (no fillers, no duplicates).`
      : '';
  return `SHEET ${index} — ${sheet.title} (grid ${sheet.grid} = ${total} cells):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}${empty}`;
}

function buildBrief(wave, sheets) {
  const n = sheets.length;
  const mnemonicNote =
    wave.kind === 'mnemonic-az'
      ? `\nLOCKED PHONICS MAP (do not swap):\n${JSON.stringify(loadMnemonicMap().letters, null, 0)}`
      : '';
  return withEslAssetGeneratorBrief(`TASK: Produce **${n} black-field contact sheets** for ClassIn Pre-A1 ESL visual language.

This is NOT vocab-noun flashcards. Pre-A1 needs instruction, action, relation, sound-work, early-literacy, and interaction pieces.

${wave.style}

HARD RULES:
- Reading order left→right, top→bottom on every sheet.
- One concept per cell. Generous margin inside the cell. Nothing crossing gutters.
- NO readable text painted on the art.
- quality: default ONLY.
- Keep generating inside THIS task until all ${n} PNG sheets exist (5-image cap is per generate_image call, not per task).
${mnemonicNote}

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return exactly ${n} PNG sheets. Filename with the sheet theme slug. Prefer one zip of all PNGs plus CDN links in chat.`);
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
  const sorted = [...byName.values()].sort((a, b) =>
    path.basename(a).localeCompare(path.basename(b), 'en'),
  );
  clearNumberedSheets(sheetDir);
  const saved = [];
  sorted.forEach((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    saved.push({
      dest,
      bytes: fs.statSync(dest).size,
      name: path.basename(src),
      file,
    });
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

function sheetForKey(sheets, key) {
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].cells.some((c) => c.key === key)) {
      return { sheet_index: i + 1, sheet_id: sheets[i].id, sheet_file: `${String(i + 1).padStart(2, '0')}.png` };
    }
  }
  return { sheet_index: null, sheet_id: null, sheet_file: null };
}

function emptyInv() {
  return {
    spec: 'prea1-visual-language',
    updated_at: null,
    running_total: {
      waves_fired: 0,
      waves_downloaded: 0,
      sheets_downloaded: 0,
      sheets_large: 0,
      concepts_planned: 0,
      concepts_banked_raw: 0,
    },
    waves: {},
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  inv.running_total = {
    waves_fired: waves.filter((w) => w.task_id).length,
    waves_downloaded: waves.filter((w) => (w.sheets || []).length).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    sheets_large: waves.reduce((n, w) => n + (w.large_sheet_count || 0), 0),
    concepts_planned: waves.reduce((n, w) => n + (w.concept_count || 0), 0),
    concepts_banked_raw: waves.reduce((n, w) => n + (w.banked_raw || 0), 0),
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
    if (i === 79) {
      try {
        fs.unlinkSync(LOCK);
      } catch {
        /* ignore */
      }
    }
  }
  try {
    return fn();
  } finally {
    try {
      fs.unlinkSync(LOCK);
    } catch {
      /* ignore */
    }
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

function upsertInventory(wave, sheets, dump) {
  const invPath = path.join(STOCKPILE, 'inventory.json');
  let inv = emptyInv();
  if (fs.existsSync(invPath)) {
    try {
      inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    } catch {
      inv = emptyInv();
    }
  }
  if (!inv.waves) inv.waves = {};

  const items = [];
  for (const s of sheets) {
    for (const cell of s.cells) {
      const loc = sheetForKey(sheets, cell.key);
      items.push({
        concept: cell.key.replace(/^prea1-[a-z]+-/, ''),
        key: cell.key,
        family: wave.family,
        manus_task_id: dump.task_id || null,
        sheet_file: loc.sheet_file,
        sheet_id: loc.sheet_id,
        obvious_fail: false,
      });
    }
  }

  const largeCount = (dump.saved || []).filter((s) => s.bytes > 80_000).length;
  inv.waves[wave.id] = {
    kind: wave.kind,
    family: wave.family,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    safety_skipped_at_fire: dump.safety_skipped || [],
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    large_sheet_count: largeCount,
    concept_count: items.length,
    banked_raw: largeCount ? items.length : 0,
    items,
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

async function upsertInventoryLocked(wave, sheets, dump) {
  return withInvLock(() => upsertInventory(wave, sheets, dump));
}

const wave = resolveWave(arg('wave', ''));
const OUT_DIR = path.join(STOCKPILE, wave.id);
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
const pollOnly = process.argv.includes('--poll-only');

const rawSheets = sheetsFor(wave);
const safetyAll = { keptSheets: [], skipped: [] };
for (const s of rawSheets) {
  const { kept, skipped } = filterSafety(s.cells);
  safetyAll.skipped.push(...skipped);
  safetyAll.keptSheets.push({ ...s, cells: kept });
}
const sheets = safetyAll.keptSheets.filter((s) => s.cells.length);
const NEED_SHEETS = sheets.length;

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SHEET_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      wave: wave.id,
      family: wave.family,
      concept_count: conceptCount(wave),
      safety_skipped: safetyAll.skipped,
      sheets: sheets.map((s) => ({ id: s.id, title: s.title, grid: s.grid, keys: s.cells.map((c) => c.key) })),
    },
    null,
    2,
  ),
);
if (wave.kind === 'mnemonic-az') {
  fs.writeFileSync(path.join(STOCKPILE, 'mnemonic-az-map.json'), JSON.stringify(loadMnemonicMap(), null, 2));
}

const BRIEF = buildBrief(wave, sheets);
let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: wave.kind,
  wave: wave.id,
  family: wave.family,
  sheet_dir: SHEET_DIR,
  safety_skipped: safetyAll.skipped,
  concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
};

if (!sheets.length) {
  console.log(JSON.stringify({ phase: 'nothing-to-send', wave: wave.id }, null, 2));
  process.exit(0);
}

if (!pollOnly) {
  if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: wave.title,
    agent_profile: resolveAgentProfile(),
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    interactive_mode: false,
    message: BRIEF,
  });
  taskId = created.task_id || created.id;
  dump.task_id = taskId;
  dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
  dump.created_at = new Date().toISOString();
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  await upsertInventoryLocked(wave, sheets, dump);
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

if (large.length < NEED_SHEETS) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} black-field sheets listed in the original brief (Sheet 1–${NEED_SHEETS}). Fire remaining generate_image calls now. Do not restart. Do not change the cell lists.`,
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
const invPath = await upsertInventoryLocked(wave, sheets, dump);
const largeCount = saved.filter((s) => s.bytes > 80_000).length;
console.log(
  JSON.stringify(
    {
      phase: 'downloaded',
      wave: wave.id,
      family: wave.family,
      task_id: taskId,
      task_url: dump.task_url,
      count: saved.length,
      large: largeCount,
      sheet_dir: SHEET_DIR,
      inventory: invPath,
    },
    null,
    2,
  ),
);
if (largeCount < NEED_SHEETS) process.exit(2);
