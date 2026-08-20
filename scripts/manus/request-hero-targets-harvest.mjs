/**
 * Repeatable Manus hero-target harvest (waves 2+).
 * Stockpile only — no import / keying / wiring.
 *
 *   node scripts/manus/request-hero-targets-harvest.mjs --wave=2 --fire
 *   node scripts/manus/request-hero-targets-harvest.mjs --wave=2 --poll-only
 *   node scripts/manus/request-hero-targets-harvest.mjs --wave=2
 *
 * Wrappers: request-hero-targets-wave2.mjs … wave12.mjs … wave10.mjs
 *
 * Sheets land in tmp/manus-hero-stockpile/waveN/sheets/
 * Inventory: tmp/manus-hero-stockpile/inventory.json
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
import { WAVES, sheetsFor } from './hero-targets-harvest-keys.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const NEED_SHEETS = 4;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-hero-stockpile');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function resolveWave() {
  const raw = arg('wave', '');
  const wave = WAVES[raw];
  if (!wave) {
    throw new Error('Need --wave=2..12 (or use request-hero-targets-waveN.mjs)');
  }
  return wave;
}

function pairLines(slice, startIndex) {
  const lines = [];
  let n = startIndex;
  for (const p of slice) {
    lines.push(`${n}. hero-${p.slug}-closed — ${p.closed}`);
    n += 1;
    lines.push(`${n}. hero-${p.slug}-open — ${p.open}`);
    n += 1;
  }
  return lines.join('\n');
}

function singleLines(slice, startIndex) {
  return slice.map((s, i) => `${startIndex + i}. hero-${s.slug} — ${s.brief}`).join('\n');
}

function buildBrief(wave) {
  const { pairs, singles } = wave;
  return withEslAssetGeneratorBrief(`TASK: Produce **4 black-field 4×4 contact sheets** of MEDIUM HERO play-surface props for ClassIn ESL boards.

These are LARGE interactive targets kids drag toys onto/into — not postage-stamp dock icons.
Do NOT copy the existing small hide-reveal pack. Draw them as hero-stage cutouts.

SIZE (locked — do not invent another %):
- Each object fills about **70–80% of its cell** (medium hero). Generous but not edge-to-edge.
- Bottom-resting. Clear black margin. One object per cell. Nothing crossing gutters.

HARD FIELD RULES:
- Pure #000000 black edge to edge. No white plates, no grey cards, no labels on the art.
- Soft matte educational cutouts. quality: default only.
- NO readable text, NO logos, NO watermarks.
- Object bodies must be clearly colored (not near-black, not ghost-gray, not stainless/white appliances) so they survive a black-key.

OPEN / EMPTY INTERIORS (critical):
- Cavities must be **mid-tone**: walnut brown, teal, charcoal, kraft — NEVER white, cream, pale gray, or pure black.
- White interiors get deleted. Black interiors punch a hole. Mid-tone hollows stay.

PAIR SWAP RULE (cells come in closed then open):
- SAME object, SAME viewpoint, SAME scale, SAME ground line, SAME colors.
- Only the opening mechanism changes (lid / door / zipper / curtain / flap).
- Open state is EMPTY — a play cavity, not a cluttered interior.

NO people. NO faces.

READING ORDER left→right, top→bottom on every sheet.

SHEET 1 (16 cells) — pairs 1–8:
${pairLines(pairs.slice(0, 8), 1)}

SHEET 2 (16 cells) — pairs 9–16:
${pairLines(pairs.slice(8, 16), 1)}

SHEET 3 (16 cells) — pairs 17–20 then singles 1–8:
${pairLines(pairs.slice(16, 20), 1)}
${singleLines(singles.slice(0, 8), 9)}

SHEET 4 (16 cells) — last 2 singles in cells 1–2; cells 3–16 EMPTY black:
${singleLines(singles.slice(8, 10), 1)}

Return exactly 4 PNG sheets. Keep generating inside THIS task until all 4 exist (5-image cap is per generate_image call, not per task).`);
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

function sheetForConcept(wave, slug, variant) {
  const sheets = sheetsFor(wave);
  const key = variant ? `${slug}-${variant}` : slug;
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].names.includes(key)) {
      return { sheet_index: i + 1, sheet_id: sheets[i].id, sheet_file: `${String(i + 1).padStart(2, '0')}.png` };
    }
  }
  return { sheet_index: null, sheet_id: null, sheet_file: null };
}

function inventoryItems(wave, taskId, saved) {
  const items = [];
  for (const p of wave.pairs) {
    const loc = sheetForConcept(wave, p.slug, 'closed');
    items.push({
      concept: p.slug,
      kind: 'pair',
      variants_generated: ['closed', 'open'],
      manus_task_id: taskId,
      sheet_file: loc.sheet_file,
      sheet_id: loc.sheet_id,
      obvious_failure: false,
    });
  }
  for (const s of wave.singles) {
    const loc = sheetForConcept(wave, s.slug, '');
    items.push({
      concept: s.slug,
      kind: 'single',
      variants_generated: ['single'],
      manus_task_id: taskId,
      sheet_file: loc.sheet_file,
      sheet_id: loc.sheet_id,
      obvious_failure: false,
    });
  }
  return { items, saved };
}

function upsertInventory(wave, dump) {
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
  const built = inventoryItems(wave, dump.task_id, dump.saved || []);
  inv.waves[wave.id] = {
    kind: wave.kind,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    large_sheet_count: (dump.saved || []).filter((s) => s.bytes > 80_000).length,
    asset_count: wave.pairs.length * 2 + wave.singles.length,
    items: built.items,
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
const BRIEF = buildBrief(wave);

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      wave: wave.id,
      pairs: wave.pairs.map((p) => p.slug),
      singles: wave.singles.map((s) => s.slug),
      sheets: sheetsFor(wave),
    },
    null,
    2,
  ),
);

let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: wave.kind,
  wave: wave.id,
  sheet_dir: SHEET_DIR,
};

if (!pollOnly) {
  if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    if (prev.task_id && !fireOnly) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
    if (prev.task_id && fireOnly) {
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
  dump.task_url_alt = taskId ? `https://manus.im/app?taskId=${taskId}` : null;
  dump.created_at = new Date().toISOString();
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  upsertInventory(wave, dump);
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
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} black-field 4×4 sheets listed in the original brief (Sheet 1–4). Fire remaining generate_image calls now. Do not restart. Do not change the cell lists.`,
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
const invPath = upsertInventory(wave, dump);
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
      sheet_dir: SHEET_DIR,
      inventory: invPath,
    },
    null,
    2,
  ),
);
if (largeCount < NEED_SHEETS) process.exit(2);
