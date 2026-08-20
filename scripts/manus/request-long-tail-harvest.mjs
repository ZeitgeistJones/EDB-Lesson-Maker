/**
 * Long-tail stockpile manufacturing.
 * Stockpile only: no PropBank merge, producer wiring, renderer changes.
 *
 *   node scripts/manus/long-tail-keys.mjs
 *   node scripts/manus/request-long-tail-harvest.mjs --wave=lt1 --fire
 *   node scripts/manus/request-long-tail-harvest.mjs --wave=lt2 --fire
 *   node scripts/manus/request-long-tail-harvest.mjs --wave=lt3 --fire
 *   node scripts/manus/request-long-tail-harvest.mjs --wave=lt1 --poll-only
 *
 * Sheets: harvested/manus-long-tail-stockpile/<wave-id>/sheets/
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
  WAVES,
  WAVE_ORDER,
  MANUS_WORTHY,
  filterSafety,
  writeClassificationLedger,
  assertWaveIntegrity,
} from './long-tail-keys.mjs';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const TRACKED_INV = path.join(ROOT, TRACKED_INV_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((cell, i) => `${i + 1}. ${cell.key} — ${cell.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format}, one concept per cell):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}${sheet.extra ? `\n${sheet.extra}` : ''}`;
}

function buildBrief(wave, sheets) {
  const allLandscape = sheets.every((s) => String(s.format).startsWith('landscape'));
  const mixed = !allLandscape && sheets.some((s) => String(s.format).startsWith('landscape'));
  const fieldRules = allLandscape
    ? `- Each sheet is a 1×2 landscape contact of FULL-BLEED lesson-stage environments (NOT black-field props).
- Open center floor band for dragging props. Scenery at edges only. No people.`
    : mixed
      ? `- Sheets whose format starts with black-contact: pure #000000 black field, one concept per cell, clear gutters.
- Sheets whose format starts with landscape: FULL-BLEED 1×2 lesson-stage environments with open center floor, scenery at edges, no people.`
      : `- One concept per cell, pure #000000 black field, clear gutters, nothing crossing cell boundaries.
- Overlay/dressing atoms must stay compact and keyable. Surfaces keep empty functional space.
- State variants must preserve object identity, viewpoint, scale, and baseline.`;
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} long-tail reusable PNG contact sheet(s)** for ClassIn ESL.

SOURCE OF TRUTH: scripts/manus/long-tail-keys.mjs, approved MANUS_WORTHY only. Long-tail vocab / variants / states / dressing / obscure systems / thin settings. Do NOT regenerate visual-grammar harvest cells.

${wave.style}

HARD RULES:
- Generate ONLY the listed cells. Do not review, dedupe, research, broaden, or add concepts.
- Do NOT generate HAVE_ENOUGH / CODE_LATER / LOW_VALUE / P1 items.
- Reading order left to right, top to bottom for every contact sheet.
${fieldRules}
- NO baked readable text, fake writing, labels, letters, numbers, prices, times, dates, dialogue, signs, badges, logos, UI text, or watermarks.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG contact sheet exists. The 5-image cap is per generate_image call, not per task. This wave has ${sheets.length} sheets: fire 5+remainder inside THIS task.

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

function expectedSheets(wave) {
  return wave.sheets.length;
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    ...(inv.counts || {}),
    original_manus_worthy: MANUS_WORTHY.length,
    pass: items.filter((it) => it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.qa_status === 'HOLD').length,
    locally_recovered: items.filter((it) => it.recovered_locally).length,
    regenerated: items.filter((it) => it.regenerated).length,
    safety_skipped: waves.reduce((n, w) => n + (w.safety_skipped_at_fire || []).length, 0),
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    tasks_used: waves.filter((w) => w.task_id).length,
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

function loadInv() {
  const invPath = path.join(STOCKPILE, 'inventory.json');
  if (!fs.existsSync(invPath)) return JSON.parse(fs.readFileSync(TRACKED_INV, 'utf8'));
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  const json = JSON.stringify(inv, null, 2);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), json);
  fs.mkdirSync(path.dirname(TRACKED_INV), { recursive: true });
  fs.writeFileSync(TRACKED_INV, json);
  return TRACKED_INV;
}

function upsertInventory(wave, sheets, dump) {
  const inv = loadInv();
  if (!inv.waves) inv.waves = {};
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((s) => s.cells.map((cell) => ({
    ...cell,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: cell.qa_status || null,
    recovered_locally: false,
    regenerated: false,
    qa_note: haveLarge
      ? 'Raw sheet downloaded; visual QA/recovery must record PASS or HOLD before close.'
      : null,
    path: dump.sheet_dir || null,
    sheet_id: s.id,
    manus_task_id: dump.task_id || null,
  })));
  inv.waves[wave.id] = {
    family: wave.family,
    families: wave.families,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    safety_skipped_at_fire: dump.safety_skipped || [],
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  const OUT_DIR = path.join(STOCKPILE, wave.id);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
  const pollOnly = process.argv.includes('--poll-only');

  const safetyAll = { keptSheets: [], skipped: [] };
  for (const s of wave.sheets) {
    const { kept, skipped } = filterSafety(s.cells);
    safetyAll.skipped.push(...skipped);
    safetyAll.keptSheets.push({ ...s, cells: kept });
  }
  const sheets = safetyAll.keptSheets.filter((s) => s.cells.length);
  const NEED_SHEETS = expectedSheets(wave);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  if (process.env.MANUS_FORCE_RERUN && !pollOnly && fs.existsSync(RUN_JSON)) {
    const preserveDir = `${OUT_DIR}-failed-source-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.cpSync(OUT_DIR, preserveDir, { recursive: true });
    fs.rmSync(path.join(SHEET_DIR, 'raw'), { recursive: true, force: true });
    fs.rmSync(path.join(SHEET_DIR, 'zip-extract'), { recursive: true, force: true });
    clearNumberedSheets(SHEET_DIR);
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        family: wave.family,
        families: wave.families,
        concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        safety_skipped: safetyAll.skipped,
        sheets: sheets.map((s) => ({ id: s.id, title: s.title, format: s.format, keys: s.cells.map((c) => c.key) })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave, sheets);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'long-tail-stockpile',
    wave: wave.id,
    family: wave.family,
    sheet_dir: SHEET_DIR,
    safety_skipped: safetyAll.skipped,
    concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
    expected_sheets: NEED_SHEETS,
  };

  if (!sheets.length) {
    console.log(JSON.stringify({ phase: 'nothing-to-send', wave: wave.id }, null, 2));
    return;
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
    await withInvLock(() => upsertInventory(wave, sheets, dump));
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return;
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
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} long-tail sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Generate only the original MANUS_WORTHY concepts. Keep firing generate_image until every listed sheet exists.`,
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
    dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNG sheets; raw kept for mop.`];
  }
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at || prev.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, sheets, dump));
  const largeCount = saved.filter((s) => s.bytes > 80_000).length;
  console.log(
    JSON.stringify(
      {
        phase: 'downloaded',
        wave: wave.id,
        task_id: taskId,
        task_url: dump.task_url,
        count: saved.length,
        large: largeCount,
        expected_sheets: NEED_SHEETS,
        sheet_dir: SHEET_DIR,
        inventory: invPath,
      },
      null,
      2,
    ),
  );
  if (largeCount < NEED_SHEETS) process.exit(2);
}

assertWaveIntegrity();
if (!process.argv.includes('--poll-only')) writeClassificationLedger();
apiKey();

if (process.argv.includes('--all')) {
  for (const w of WAVE_ORDER) {
    await runWave(w);
  }
} else {
  await runWave(arg('wave', ''));
}
