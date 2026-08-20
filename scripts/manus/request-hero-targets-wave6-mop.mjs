/**
 * Tiny mop for ONE wave6 glance-fail pair only: popcorn-popper.
 * Do not redo anything else from wave6.
 *
 *   node scripts/manus/request-hero-targets-wave6-mop.mjs --fire
 *   node scripts/manus/request-hero-targets-wave6-mop.mjs --poll-only
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

const POLL_MS = 20_000;
const TIMEOUT_MS = 35 * 60 * 1000;
const NEED_SHEETS = 1;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-hero-stockpile');
const OUT_DIR = path.join(STOCKPILE, 'wave6-mop');
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const WAVE_ID = 'wave6-mop';

const PAIRS = [
  {
    slug: 'popcorn-popper',
    closed:
      'stovetop popcorn popper, 3/4 view. Cherry-red kettle body + a TALL OPAQUE cherry-red DOME LID fully ON with a big gold knob. The dome completely hides the kettle mouth — reads as a sealed unpopped pot. NO popcorn visible. NO brand text. NOT a theater machine with a tiny clear flap.',
    open:
      'SAME popper, SAME viewpoint/scale/colors: dome lid hinged ALL THE WAY BACK (or sitting beside the kettle). Wide empty olive kettle bowl clearly visible — a popped-open cavity. NO popcorn. Closed vs open must be UNMISSABLE at a glance: sealed red dome vs wide-open empty kettle.',
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE black-field 1×2 contact sheet** (1 row × 2 columns = 2 cells) of MEDIUM HERO play-surface props.

This replaces ONE failed wave6 pair only: popcorn-popper. Do not invent extra objects.

SIZE (locked):
- Each object fills about **70–80% of its cell** (medium hero). Bottom-resting. Clear black margin.

HARD FIELD RULES:
- Pure #000000 black edge to edge. No white plates, no grey cards, no labels on the art.
- Soft matte educational cutouts. quality: default only.
- NO readable text, NO logos, NO watermarks. NO people. NO faces.
- Object bodies clearly colored so they survive a black-key.
- Open interiors mid-tone (walnut / teal / olive) — NEVER white, cream, or pure black.

PAIR SWAP (critical — previous run failed this):
- SAME object, SAME viewpoint, SAME scale, SAME ground line, SAME colors.
- Only the opening changes. Closed vs open must be UNMISSABLE at a glance.
- Previous fail: a theater popper with a tiny clear flap — closed and open looked identical.
- This time: OPAQUE dome lid ON vs lid OFF / hinged fully back showing a wide empty kettle.

READING ORDER left→right:
1. hero-popcorn-popper-closed — ${PAIRS[0].closed}
2. hero-popcorn-popper-open — ${PAIRS[0].open}

Return exactly 1 PNG.`);

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
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

function upsertInventory(dump) {
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
  const items = PAIRS.map((p) => ({
    concept: p.slug,
    kind: 'pair',
    variants_generated: ['closed', 'open'],
    manus_task_id: dump.task_id || null,
    sheet_file: (dump.saved && dump.saved[0] && dump.saved[0].file) || '01.png',
    sheet_id: 'sheet1-1x2-mop',
    obvious_failure: false,
    replaces_wave: 'wave6',
  }));
  inv.waves[WAVE_ID] = {
    kind: 'hero-targets-wave6-mop',
    title: 'ESL hero targets wave6 mop — popcorn-popper only',
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || SHEET_DIR,
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    large_sheet_count: (dump.saved || []).filter((s) => s.bytes > 80_000).length,
    asset_count: PAIRS.length * 2,
    items,
    finished_at: dump.finished_at || null,
  };
  const w6 = inv.waves.wave6;
  if (w6 && Array.isArray(w6.items)) {
    for (const item of w6.items) {
      if (item.concept !== 'popcorn-popper') continue;
      item.obvious_failure = true;
      item.mop_task_id = dump.task_id || null;
      item.mop_sheet_file = (dump.saved && dump.saved[0] && dump.saved[0].file) || null;
      item.mop_wave = WAVE_ID;
    }
  }
  inv.updated_at = new Date().toISOString();
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  return invPath;
}

const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
const pollOnly = process.argv.includes('--poll-only');

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify({ wave: WAVE_ID, pairs: PAIRS.map((p) => p.slug), grid: '1x2' }, null, 2),
);

let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'hero-targets-wave6-mop',
  wave: WAVE_ID,
  sheet_dir: SHEET_DIR,
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
    title: 'ESL hero targets wave6 mop — popcorn-popper',
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
  upsertInventory(dump);
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
let msgs = await listMessages(taskId, { order: 'asc', limit: 80 });
let saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
const large = saved.filter((s) => s.bytes > 80_000);

if (large.length < NEED_SHEETS) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly 1 black-field 1×2 sheet (popcorn-popper closed/open — opaque dome lid vs wide-open empty kettle). Fire generate_image now. Do not restart. Do not add extra objects.`,
    ),
  });
  result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  msgs = await listMessages(taskId, { order: 'asc', limit: 80 });
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
const invPath = upsertInventory(dump);
const largeCount = saved.filter((s) => s.bytes > 80_000).length;
console.log(
  JSON.stringify(
    {
      phase: 'downloaded',
      wave: WAVE_ID,
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
