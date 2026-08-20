/**
 * EDB setting-drop stockpile — real lesson-stage environments via Manus.
 * Replaces deprecated request-bg-cards-harvest.mjs (quiet flat washes = WRONG spec).
 *
 *   node scripts/manus/request-edb-settings-harvest.mjs --setting=classroom --fire
 *   node scripts/manus/request-edb-settings-harvest.mjs --setting=classroom --poll-only
 *
 * Wrappers: request-edb-settings-wave1-classroom.mjs, …
 * Batch fire: fire-edb-settings-batch1.mjs
 *
 * Sheets: tmp/manus-edb-settings-stockpile/wave1-classroom/sheets/
 * Inventory: tmp/manus-edb-settings-stockpile/inventory.json
 *
 * Sizing hints only from public/lib/sceneBackgrounds.js + 08_backgrounds manifest —
 * do NOT generate in-house; Manus only.
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
import { BOARD, GROUND_Y_RANGE, resolveSetting } from './edb-settings-stockpile-keys.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-edb-settings-stockpile');
const NEED_SHEETS = 1;

const STYLE_LOCK = `EDB SETTING DROP — real lesson-stage environment (NOT quiet flat wash):

WHAT WE WANT:
- Real recognizable place with walls/floor/sky and key furniture silhouettes at EDGES only
- Open center floor band (horizontal ~20%–80%, lower third) for dragging props/characters/vocab
- Clear ground plane / standing surface (groundY ${GROUND_Y_RANGE} px on ${BOARD.width}×${BOARD.height} board)
- Soft children's-book illustration — readable at a glance, not photoreal, not wallpaper
- Composable teachable stage — suitable for layering movable assets later
- Generic empty setting — NOT story-specific (no named teacher, no lesson plot)

HARD FAIL — reject / do NOT ship:
- Abstract color wash + tiny corner glyph (periwinkle flat + chalkboard corner = WRONG)
- Decorative scenic poster / dense collage / wallpaper with no usable floor
- Busy cluttered mid-frame blocking lesson content
- People, faces, animals, readable text, letters, numbers, logos, watermarks
- Black-field prop cutouts — these are FULL-BLEED panoramic backgrounds (~16:9)
- Copying docs/bg-theme-sets.md quiet-flat anti-room style — that route is deprecated for EDB settings

SIZING (reference only — sceneBackgrounds.js / 08_backgrounds manifest):
- Target board canvas: ${BOARD.width}×${BOARD.height} px landscape
- groundY: pixel row where standing surface begins (${GROUND_Y_RANGE} typical)
- clearCentre: x 20%–80% deliberately open for draggable pieces
- Scenery confined to outer thirds and upper walls; floor band readable

quality: default ONLY (never high).`;

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function resolveWaveKey() {
  const key = arg('setting', '') || arg('wave', '');
  if (!key) throw new Error('Need --setting=classroom|bedroom|… (see edb-settings-stockpile-keys.mjs)');
  return key;
}

function buildBrief(setting) {
  const cells = setting.variants.map((v, i) => `${i + 1}. ${v.slug} — ${v.brief}`);
  return withEslAssetGeneratorBrief(`TASK: Produce **1 contact sheet** of reusable ESL **EDB setting-drop** landscape backgrounds for ClassIn interactive boards.

These are FULL-BLEED lesson-stage environments (NOT black-field props, NOT vocab icons, NOT quiet flat washes).

${STYLE_LOCK}

HARD RULES:
- Sheet layout: **1×2 grid** (2 landscape panels side by side), reading order left→right.
- Each cell = ONE ~16:9 landscape setting drop inside the cell.
- Category: **${setting.category}** — both variants must read as the same place type.
- NO readable text painted on art.
- Deliver 1 PNG sheet (Perfect-1 — keep generating inside THIS task until it exists).

${cells.join('\n')}

Return 1 PNG sheet + short slug legend in chat only.`);
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

function upsertInventory(wave, setting, dump) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  const invPath = path.join(STOCKPILE, 'inventory.json');
  let inv = { updated_at: null, spec: 'edb-setting-drops', waves: {}, legacy_bg_cards: {} };
  if (fs.existsSync(invPath)) {
    try {
      inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    } catch {
      inv = { updated_at: null, spec: 'edb-setting-drops', waves: {}, legacy_bg_cards: {} };
    }
  }
  if (!inv.waves) inv.waves = {};

  const items = setting.variants.map((v, i) => ({
    setting_category: setting.category,
    slug: v.slug,
    manus_task_id: dump.task_id || null,
    sheet_file: '01.png',
    cell_in_sheet: i + 1,
    obvious_fail: false,
  }));

  inv.waves[wave.id] = {
    kind: 'edb-setting-drop',
    setting: setting.slug,
    category: setting.category,
    title: setting.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    variant_count: setting.variants.length,
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    items,
    finished_at: dump.finished_at || null,
  };
  inv.updated_at = new Date().toISOString();
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  return invPath;
}

const waveKey = resolveWaveKey();
const { wave, setting } = resolveSetting(waveKey);
const OUT_DIR = path.join(STOCKPILE, wave.id);
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
const pollOnly = process.argv.includes('--poll-only');
const BRIEF = buildBrief(setting);

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      wave: wave.id,
      setting: setting.slug,
      category: setting.category,
      variants: setting.variants,
    },
    null,
    2,
  ),
);

let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'edb-setting-drop',
  wave: wave.id,
  setting: setting.slug,
  sheet_dir: SHEET_DIR,
  variant_count: setting.variants.length,
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
    title: setting.title,
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
  upsertInventory(wave, setting, dump);
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
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need ${NEED_SHEETS} EDB setting-drop 1×2 sheet. Fire remaining generate_image calls now.`,
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
const invPath = upsertInventory(wave, setting, dump);
const largeCount = saved.filter((s) => s.bytes > 50_000).length;
console.log(
  JSON.stringify(
    {
      phase: 'downloaded',
      wave: wave.id,
      setting: setting.slug,
      task_id: taskId,
      task_url: dump.task_url,
      variants: setting.variants.length,
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
