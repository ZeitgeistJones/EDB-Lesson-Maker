/**
 * B1 visual operating-system harvest.
 * Stockpile only — no import / keying / wiring.
 *
 *   node scripts/manus/request-b1-harvest.mjs --write-ledgers
 *   node scripts/manus/request-b1-harvest.mjs --wave=1 --fire
 *   node scripts/manus/request-b1-harvest.mjs --wave=1 --poll-only
 *
 * Sheets: harvested/manus-b1-stockpile/<wave-id>/sheets/
 * Inventory: harvested/manus-b1-stockpile/inventory.json
 * Tracked copy: docs/b1-stockpile-inventory.json
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
  TRACKED_SPEC_REL,
  CODE_LATER_REL,
  CODE_LATER,
  GENERATE,
  REUSE_EXISTING,
  DEFER_B2,
  WAVES,
  resolveWave,
  sheetsFor,
  conceptCount,
  filterSafety,
  classificationCounts,
  writeLedgers,
} from './b1-stockpile-keys.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const TRACKED_INV = path.join(ROOT, TRACKED_INV_REL);
const TRACKED_SPEC = path.join(ROOT, TRACKED_SPEC_REL);
const CODE_LATER_PATH = path.join(ROOT, CODE_LATER_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((cell, i) => `${i + 1}. ${cell.key} — ${cell.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format} black-field contact sheet, one concept per cell):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function waveFailureLock(wave) {
  if (wave.id === 'wave2-p0-narrative-complication') {
    return `WAVE 2 FAILURE LOCK:
- These are cutout-ready narrative complication overlays, not worksheet panels.
- The cell background behind every object must stay pure #000000 black; do not draw white square cards or white page-like cells as the outer background.
- Prefer one central prop/mini-scene per cell with natural transparent-cutout edges: rain over trip plan, closed gate, missing item, blocked path, delayed bus.`;
  }
  if (wave.id === 'wave3-p1-information-tracking') {
    return `WAVE 3 FAILURE LOCK:
- Do not write environmental labels on books, papers, signs, screens, boards, timetables, diaries, envelopes, boxes, or devices.
- If a sign, paper, screen, or book is needed, make it blank with icons/shapes only.
- Information flow must be visual: object/source -> simple clue/fact icon -> child recipient, with zero text.`;
  }
  if (wave.id === 'wave4-p2-grammar-self-repair') {
    return `WAVE 4 FAILURE LOCK:
- Do not draw generic vocabulary objects. Each cell must be a relation mini-scene showing time/change/condition/speech/self-repair.
- Show the relation with simple visual contrast: before/after, background event vs main event, plan changed, condition causes result, speaker message relayed, pause then continue.
- No grammar charts, tense tables, word bubbles, labels, letters, arrows made of text, or random unrelated objects.`;
  }
  return `GENERAL FAILURE LOCK:
- Contact sheets must be black-field asset sheets, not worksheets, posters, UI mockups, or classroom handouts.
- Every concept must be a pictorial B1 relation/state, not a renamed A2 connector token.`;
}

function buildBrief(wave, sheets) {
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} B1 visual operating-system black-field PNG contact sheet(s)** for ClassIn ESL.

This is B1 CONNECTED FAMILIAR MEANING: brief explanation, one concrete complication, 2-3 practical options, a chosen adaptation/follow-up, and a simple outcome.

${wave.style}

${waveFailureLock(wave)}

HARD RULES:
- Reading order left to right, top to bottom for every contact sheet.
- One concept per cell, pure #000000 black field, clear gutters, nothing crossing cell boundaries.
- NO readable text, fake writing, labels, connector words, letters, numbers, prices, times, dates, source names, paragraphs, reasons/opinions/checklists, or dialogue.
- BLACK FIELD MEANS THE WHOLE PNG CANVAS: no white worksheet/page backgrounds, no grey table backgrounds, no labeled classroom worksheet look. Empty cells must be pure black.
- BAN THESE WORDS IN THE ART: source, fact, clue, answer, main point, outcome, plan, update, preference, reason, because, if, result, support, detail.
- ONE-COMPLICATION RULE: one concrete problem only. Do not combine rain + missing item + delay; pick exactly the listed concept.
- Keep child contexts concrete and familiar: school, friends, games, trips, weather.
- Do not create A2 link tokens already covered by the lower stockpile unless the B1 brief clearly asks for a new composite structure.
- Do not create B2 material: no debate, persuasion, rebuttal, source credibility, academic synthesis, negotiation, irony, tone, bias, long essays, or abstract societal issues.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG contact sheet exists.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return PNGs, preferably one zip plus CDN links. No essay.`);
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
    spec: 'b1-visual-operating-system',
    updated_at: null,
    running_total: {
      proposals_reviewed: GENERATE.length + REUSE_EXISTING.length + CODE_LATER.length + DEFER_B2.length,
      generate: GENERATE.length,
      reuse_existing: REUSE_EXISTING.length,
      code_later: CODE_LATER.length,
      defer_b2: DEFER_B2.length,
      waves_fired: 0,
      waves_downloaded: 0,
      sheets_downloaded: 0,
      sheets_large: 0,
      concepts_banked_raw: 0,
      failed: 0,
      held: 0,
      safety_skipped: 0,
    },
    waves: {},
    durable_root: STOCKPILE_REL,
    no_wiring: true,
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  inv.running_total = {
    proposals_reviewed: GENERATE.length + REUSE_EXISTING.length + CODE_LATER.length + DEFER_B2.length,
    generate: GENERATE.length,
    reuse_existing: REUSE_EXISTING.length,
    code_later: CODE_LATER.length,
    defer_b2: DEFER_B2.length,
    waves_fired: waves.filter((w) => w.task_id).length,
    waves_downloaded: waves.filter((w) => (w.sheets || []).length).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    sheets_large: waves.reduce((n, w) => n + (w.large_sheet_count || 0), 0),
    concepts_banked_raw: waves.reduce((n, w) => n + (w.banked_raw || 0), 0),
    failed: waves.reduce((n, w) => n + (w.failed || 0), 0),
    held: waves.reduce((n, w) => n + (w.held || 0), 0),
    safety_skipped: waves.reduce((n, w) => n + (w.safety_skipped_at_fire || []).length, 0),
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

function writeSpec() {
  writeLedgers(ROOT);
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  inv.durable_root = STOCKPILE_REL;
  recomputeTotals(inv);
  const json = JSON.stringify(inv, null, 2);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), json);
  fs.mkdirSync(path.dirname(TRACKED_INV), { recursive: true });
  fs.writeFileSync(TRACKED_INV, json);
  writeSpec();
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
      items.push({
        key: cell.key,
        concept: cell.concept,
        brief: cell.brief,
        family: cell.family,
        phase: cell.phase,
        task: wave.id,
        classification: 'GENERATE',
        status: (dump.saved || []).some((x) => x.bytes > 80_000) ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
        path: dump.sheet_dir || null,
        manus_task_id: dump.task_id || null,
        obvious_fail: false,
      });
    }
  }

  const largeCount = (dump.saved || []).filter((s) => s.bytes > 80_000).length;
  const expectedSheets = sheets.length;
  inv.waves[wave.id] = {
    phase: wave.phase,
    family: wave.family,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    safety_skipped_at_fire: dump.safety_skipped || [],
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    large_sheet_count: largeCount,
    expected_sheets: expectedSheets,
    concept_count: items.length,
    banked_raw: largeCount ? items.length : 0,
    failed: largeCount < expectedSheets && dump.finished_at ? expectedSheets - largeCount : 0,
    held: (dump.holds || []).length,
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

async function upsertInventoryLocked(wave, sheets, dump) {
  return withInvLock(() => upsertInventory(wave, sheets, dump));
}

if (process.argv.includes('--write-ledgers')) {
  const written = writeLedgers(ROOT);
  const invPath = writeInv(emptyInv());
  console.log(
    JSON.stringify(
      {
        phase: 'b1-ledgers-written',
        counts: classificationCounts(),
        spec: path.relative(ROOT, TRACKED_SPEC),
        code_later: path.relative(ROOT, CODE_LATER_PATH),
        inventory: path.relative(ROOT, invPath),
        generate_by_wave: Object.fromEntries(Object.entries(WAVES).map(([k, w]) => [k, conceptCount(w)])),
        proposal_source: written.spec.source,
      },
      null,
      2,
    ),
  );
  process.exit(0);
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
if (process.env.MANUS_FORCE_RERUN && !pollOnly) {
  for (const dir of ['raw', 'zip-extract']) {
    fs.rmSync(path.join(SHEET_DIR, dir), { recursive: true, force: true });
  }
  clearNumberedSheets(SHEET_DIR);
}
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      wave: wave.id,
      phase: wave.phase,
      family: wave.family,
      concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
      expected_sheets: NEED_SHEETS,
      safety_skipped: safetyAll.skipped,
      classification_counts: classificationCounts(),
      sheets: sheets.map((s) => ({ id: s.id, title: s.title, format: s.format, keys: s.cells.map((c) => c.key) })),
    },
    null,
    2,
  ),
);
writeSpec();

const BRIEF = buildBrief(wave, sheets);
let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'b1-visual-operating-system',
  wave: wave.id,
  phase: wave.phase,
  family: wave.family,
  sheet_dir: SHEET_DIR,
  safety_skipped: safetyAll.skipped,
  concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
  expected_sheets: NEED_SHEETS,
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
  fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
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
let large = saved.filter((s) => s.bytes > 80_000);

if (large.length < NEED_SHEETS) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} B1 black-field sheets listed in the original brief. Do not restart. Do not add text. Do not change the key list. Preserve the one-complication rule.`,
    ),
  });
  result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
  large = saved.filter((s) => s.bytes > 80_000);
}

dump.saved = saved;
dump.agent_status = result && result.agent_status;
dump.finished_at = new Date().toISOString();
if (large.length < NEED_SHEETS) {
  dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNG sheets; keep raw and mop later if needed.`];
}
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
      expected_sheets: NEED_SHEETS,
      sheet_dir: SHEET_DIR,
      inventory: invPath,
      counts: classificationCounts(),
    },
    null,
    2,
  ),
);
if (largeCount < NEED_SHEETS) process.exit(2);
