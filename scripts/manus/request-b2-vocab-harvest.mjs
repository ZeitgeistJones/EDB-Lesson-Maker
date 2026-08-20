/**
 * B2 vocab stockpile harvest — white 3×3 sheets via Manus (Shift60 pattern).
 * Stockpile only — no import / keying / wiring.
 *
 *   node scripts/manus/request-b2-vocab-harvest.mjs --wave=1 --fire
 *   node scripts/manus/request-b2-vocab-harvest.mjs --wave=1 --poll-only
 *
 * Wrappers: request-b2-vocab-wave1.mjs, wave2.mjs, …
 *
 * Sheets: tmp/manus-b2-stockpile/waveN/sheets/
 * Inventory: tmp/manus-b2-stockpile/inventory.json
 */
import fs from 'fs';
import path from 'path';
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
import { normalize, slug, verifiedPackHit } from '../lib/pack-exact-match.mjs';
import {
  WAVES,
  CELLS,
  SHEETS_PER_TASK,
  SAFETY_SKIP_KEYS,
  queuePath,
  sliceWords,
} from './b2-vocab-stockpile-keys.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-b2-stockpile');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function resolveWave() {
  const raw = arg('wave', '');
  const wave = WAVES[Number(raw)];
  if (!wave) {
    throw new Error('Need --wave=1..18 (or use request-b2-vocab-waveN.mjs)');
  }
  return wave;
}

function loadWhitelist() {
  if (!fs.existsSync(DICT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')).canonicalWhitelist || {};
  } catch {
    return {};
  }
}

function loadQueueWords(pos) {
  const file = path.join(ROOT, queuePath(pos));
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file} — run node scripts/cefrj-manus-shortlist-b2.mjs first`);
  }
  const seen = new Set();
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const w = normalize(line);
    if (!w) continue;
    const key = slug(w);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word: w, key });
  }
  return out;
}

function dedupeAtFire(words) {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const whitelist = loadWhitelist();
  const kept = [];
  const dropped = [];
  const safetySkipped = [];
  for (const row of words) {
    if (SAFETY_SKIP_KEYS.has(row.key) || SAFETY_SKIP_KEYS.has(normalize(row.word))) {
      safetySkipped.push({ word: row.word, key: row.key, reason: 'manus-safety' });
      continue;
    }
    const hit = verifiedPackHit(index, row.word, whitelist);
    if (hit?.verified) {
      dropped.push({ word: row.word, key: hit.key, file: hit.file });
      continue;
    }
    kept.push(row);
  }
  return { kept, dropped, safetySkipped };
}

function buildSheets(rows, pos) {
  const sheets = [];
  for (let i = 0; i < rows.length; i += CELLS) {
    const chunk = rows.slice(i, i + CELLS);
    const n = sheets.length + 1;
    sheets.push({
      id: `S${n}`,
      theme: `b2-${pos}-${String(n).padStart(2, '0')}`,
      title: `B2 ${pos.toUpperCase()} ${n}`,
      cells: chunk.map((c) => [c.key, c.word, c.word]),
      incomplete: chunk.length < CELLS,
    });
  }
  return sheets;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const incompleteNote =
    sheet.cells.length < CELLS
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length} have icons. Leave cells ${sheet.cells.length + 1}-${CELLS} blank white empty (no icons, no fillers, no duplicates).`
      : '';
  return `SHEET ${index} — ${sheet.title} (${sheet.theme}):\n${lines.join('\n')}\nKeys: ${sheet.cells.map(([k]) => k).join(',')}${incompleteNote}`;
}

function buildBrief(sheets, wave, taskNo, taskCount) {
  const n = sheets.length;
  const posLabel = wave.pos.toUpperCase();
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ${posLabel} sheets. Each cell = one clear picturable ${wave.pos === 'verb' ? 'ACTION (simple figure doing the verb)' : wave.pos === 'adjective' ? 'VISIBLE QUALITY (still-life or simple scene that shows the adjective)' : 'OBJECT / still-life'}. Skip abstracts / logos / text when a physical prop works.

HARD STYLE: #FFFFFF; even 3×3; ZERO text/logos/numbers/labels on the art; quality: default. Deliver ${n} PNGs.
LOOK: rich ESL kid-illustration cutouts with soft shading — NOT emoji-flat sticker glyphs, NOT featureless silhouettes. Anti-iconey: colorful objects on pure white.

This is CEFR-J B2 ${wave.pos} stockpile ${wave.id} task ${taskNo}/${taskCount}. Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call — one image call per sheet, all in THIS task).

Filename each PNG with the theme slug (e.g. esl_b2_${wave.pos}_sheet_01_${sheets[0]?.theme || 'b2'}.png). Prefer one zip of all PNGs plus CDN links in chat.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${n} PNGs + short legends. No essay.`);
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

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  for (const f of fs.readdirSync(sheetDir).filter((n) => /\.png$/i.test(n))) {
    fs.unlinkSync(path.join(sheetDir, f));
  }
  const seen = new Set();
  const saved = [];
  let i = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    saved.push({ dest, bytes: buf.length, name: img.name, file: path.basename(dest) });
  }
  return saved;
}

function sheetForKey(sheets, key) {
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].cells.some(([k]) => k === key)) {
      return { sheet_index: i + 1, sheet_id: sheets[i].id, sheet_file: `${String(i + 1).padStart(2, '0')}.png` };
    }
  }
  return { sheet_index: null, sheet_id: null, sheet_file: null };
}

function upsertInventory(wave, sheets, dump) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  const invPath = path.join(STOCKPILE, 'inventory.json');
  let inv = { updated_at: null, waves: {} };
  if (fs.existsSync(invPath)) {
    try {
      inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    } catch {
      inv = { updated_at: null, waves: {} };
    }
  }
  if (!inv.waves) inv.waves = {};

  const items = [];
  for (const s of sheets) {
    for (const [key, , concept] of s.cells) {
      const loc = sheetForKey(sheets, key);
      items.push({
        concept,
        pos: wave.pos,
        key,
        source_batch: wave.id,
        manus_task_id: dump.task_id || null,
        sheet_file: loc.sheet_file,
        sheet_id: loc.sheet_id,
        obvious_fail: false,
      });
    }
  }

  inv.waves[wave.id] = {
    kind: 'b2-vocab',
    pos: wave.pos,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    dedupe_dropped_at_fire: dump.dedupe_dropped || [],
    safety_skipped_at_fire: dump.safety_skipped || [],
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    concept_count: items.length,
    items,
    finished_at: dump.finished_at || null,
  };
  inv.updated_at = new Date().toISOString();
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  return invPath;
}

const wave = resolveWave();
const OUT_DIR = path.join(STOCKPILE, wave.id);
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
const pollOnly = process.argv.includes('--poll-only');

const allQueue = loadQueueWords(wave.pos);
const slice = sliceWords(allQueue, wave.slice);
const { kept, dropped, safetySkipped } = dedupeAtFire(slice);
const sheets = buildSheets(kept, wave.pos);
const NEED_SHEETS = sheets.length;

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      wave: wave.id,
      pos: wave.pos,
      slice: wave.slice,
      queued: slice.length,
      kept: kept.length,
      dedupe_dropped: dropped,
      safety_skipped: safetySkipped,
      keys: kept.map((k) => k.key),
      sheets: sheets.map((s) => ({ id: s.id, theme: s.theme, keys: s.cells.map(([k]) => k) })),
    },
    null,
    2,
  ),
);

const BRIEF = buildBrief(sheets, wave, 1, 1);
let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'b2-vocab',
  wave: wave.id,
  pos: wave.pos,
  sheet_dir: SHEET_DIR,
  dedupe_dropped: dropped,
  safety_skipped: safetySkipped,
  concept_count: kept.length,
};

if (!kept.length) {
  console.log(JSON.stringify({ phase: 'nothing-to-send', wave: wave.id, dropped: dropped.length }, null, 2));
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
  upsertInventory(wave, sheets, dump);
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
const large = saved.filter((s) => s.bytes > 50_000);

if (large.length < NEED_SHEETS) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need ${NEED_SHEETS} white 3×3 sheets listed in the original brief. Fire remaining generate_image calls now. Do not restart.`,
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
const invPath = upsertInventory(wave, sheets, dump);
const largeCount = saved.filter((s) => s.bytes > 50_000).length;
console.log(
  JSON.stringify(
    {
      phase: 'downloaded',
      wave: wave.id,
      task_id: taskId,
      task_url: dump.task_url,
      concepts: kept.length,
      count: saved.length,
      large: largeCount,
      sheet_dir: SHEET_DIR,
      inventory: invPath,
    },
    null,
    2,
  ),
);
if (largeCount < Math.min(NEED_SHEETS, 1)) process.exit(2);
