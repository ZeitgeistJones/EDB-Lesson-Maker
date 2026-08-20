/**
 * Mop for wave7+8 glance-fails only: terrarium, saxophone-case, ukulele-case, crib, lily-pad.
 * Do not redo anything else from wave7 or wave8.
 *
 *   node scripts/manus/request-hero-targets-wave78-mop.mjs --fire
 *   node scripts/manus/request-hero-targets-wave78-mop.mjs --poll-only
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
const OUT_DIR = path.join(STOCKPILE, 'wave78-mop');
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const WAVE_ID = 'wave78-mop';

const PAIRS = [
  {
    slug: 'terrarium',
    closed:
      'SQUARE glass terrarium cube, 3/4 view. Mint metal frame + clear glass panels. A flat GLASS CLoche LID fully ON covering the top — reads as sealed. Small pebbles inside only, no plants. MUST be the same cube shape as open state.',
    open:
      'SAME square glass terrarium cube, SAME viewpoint/scale/colors: cloche lid COMPLETELY REMOVED (beside cube or gone). Open top showing same pebble floor. Still no plants. Closed vs open = lid-on cube vs open-top cube. NOT a different shape (no cylinder).',
  },
  {
    slug: 'saxophone-case',
    closed:
      'hard SAXOPHONE case, latches closed, 3/4 view. WIDE curved bell end + narrower neck end — unmistakable sax silhouette. Deep gold-brass body. NOT a slim straight flute case.',
    open:
      'SAME sax case, SAME viewpoint/scale/colors: lid open, empty velvet-plum interior with a sax-shaped foam cutout. No saxophone. Must read as sax case not flute/violin.',
  },
  {
    slug: 'ukulele-case',
    closed:
      'hard UKULELE case, latches closed, 3/4 view. Small guitar/uke TEARDROP body silhouette. Pineapple-yellow body. NO violin f-holes, NO bow slot.',
    open:
      'SAME uke case, SAME viewpoint/scale/colors: lid open, empty teal interior shaped for a ukulele. No ukulele. Must NOT look like a violin case.',
  },
  {
    slug: 'crib',
    closed:
      'baby crib, 3/4 view. Drop-side RAILS UP / high side raised. Canopy/hood fully DOWN covering the mattress so the bed hollow is HIDDEN. White-wood OK if not white-hot + teal accents. No baby.',
    open:
      'SAME crib, SAME viewpoint/scale/colors: drop-side DOWN / rails lowered. Canopy flipped UP/away. Empty mid-tone walnut mattress hollow clearly visible. Still no baby. Closed vs open must be obvious: rails up + covered vs rails down + empty well.',
  },
];

const SINGLES = [
  {
    slug: 'lily-pad',
    brief:
      'ONE round lily pad floating on water as a put-on target. Fits **70–80% of ONE cell only** — clear black margin on all sides. 3/4 from above-front. Bright green pad, tiny water ripple OK but pad must NOT cross gutters or bleed into neighboring cells. No frog.',
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE black-field 3×3 contact sheet** (3 rows × 3 columns = 9 cells) of MEDIUM HERO play-surface props.

This replaces FIVE failed wave7/wave8 assets only. Do not invent extra objects. Cells 9 is the only single; cells 1–8 are four pairs.

SIZE (locked):
- Each object fills about **70–80% of its cell** (medium hero). Bottom-resting. Clear black margin. ONE object per cell — lily-pad must NOT overflow.

HARD FIELD RULES:
- Pure #000000 black edge to edge. No white plates, no grey cards, no labels on the art.
- Soft matte educational cutouts. quality: default only.
- NO readable text, NO logos, NO watermarks. NO people. NO faces.
- Object bodies clearly colored so they survive a black-key.
- Open interiors mid-tone (walnut / teal / olive) — NEVER white, cream, or pure black.

PAIR SWAP (critical — previous runs failed these):
- SAME object, SAME viewpoint, SAME scale, SAME ground line, SAME colors.
- Only the opening changes. Closed vs open must be UNMISSABLE at a glance.

READING ORDER left→right, top→bottom:
1. hero-terrarium-closed — ${PAIRS[0].closed}
2. hero-terrarium-open — ${PAIRS[0].open}
3. hero-saxophone-case-closed — ${PAIRS[1].closed}
4. hero-saxophone-case-open — ${PAIRS[1].open}
5. hero-ukulele-case-closed — ${PAIRS[2].closed}
6. hero-ukulele-case-open — ${PAIRS[2].open}
7. hero-crib-closed — ${PAIRS[3].closed}
8. hero-crib-open — ${PAIRS[3].open}
9. hero-lily-pad — ${SINGLES[0].brief}

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
  const pairItems = PAIRS.map((p) => ({
    concept: p.slug,
    kind: 'pair',
    variants_generated: ['closed', 'open'],
    manus_task_id: dump.task_id || null,
    sheet_file: (dump.saved && dump.saved[0] && dump.saved[0].file) || '01.png',
    sheet_id: 'sheet1-3x3-mop',
    obvious_failure: false,
    replaces_wave: p.slug === 'terrarium' ? 'wave7' : 'wave8',
  }));
  const singleItems = SINGLES.map((s) => ({
    concept: s.slug,
    kind: 'single',
    variants_generated: ['single'],
    manus_task_id: dump.task_id || null,
    sheet_file: (dump.saved && dump.saved[0] && dump.saved[0].file) || '01.png',
    sheet_id: 'sheet1-3x3-mop',
    obvious_failure: false,
    replaces_wave: 'wave8',
  }));
  inv.waves[WAVE_ID] = {
    kind: 'hero-targets-wave78-mop',
    title: 'ESL hero targets wave78 mop — terrarium + sax/uke cases + crib + lily-pad',
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
    asset_count: PAIRS.length * 2 + SINGLES.length,
    items: [...pairItems, ...singleItems],
    finished_at: dump.finished_at || null,
  };
  const markFail = (waveKey, concept) => {
    const w = inv.waves[waveKey];
    if (!w || !Array.isArray(w.items)) return;
    for (const item of w.items) {
      if (item.concept !== concept) continue;
      item.obvious_failure = true;
      item.mop_task_id = dump.task_id || null;
      item.mop_sheet_file = (dump.saved && dump.saved[0] && dump.saved[0].file) || null;
      item.mop_wave = WAVE_ID;
    }
  };
  markFail('wave7', 'terrarium');
  for (const c of ['saxophone-case', 'ukulele-case', 'crib', 'lily-pad']) markFail('wave8', c);
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
  JSON.stringify(
    {
      wave: WAVE_ID,
      pairs: PAIRS.map((p) => p.slug),
      singles: SINGLES.map((s) => s.slug),
      grid: '3x3',
    },
    null,
    2,
  ),
);

let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'hero-targets-wave78-mop',
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
    title: 'ESL hero targets wave78 mop — terrarium + sax/uke + crib + lily-pad',
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
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly 1 black-field 3×3 sheet (terrarium, sax-case, uke-case, crib pairs + lily-pad single). Fire generate_image now. Do not restart. Do not add extra objects.`,
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
