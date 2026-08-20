/**
 * DEPRECATED — quiet flat washes are WRONG spec for EDB lesson stages.
 * Use request-edb-settings-harvest.mjs → tmp/manus-edb-settings-stockpile/ instead.
 *
 * Legacy bg-cards stockpile — periwinkle flat + corner glyph panels via Manus.
 * Wave1-2 downloads (bFeKYTxn, iQEMeAt): flat wash — wrong spec, low priority, do NOT wire.
 * Wave3-4 (FTAWasAq, HJvLv3c): same wrong style — mark obvious_fail, do NOT import as EDB settings.
 *
 *   node scripts/manus/request-bg-cards-harvest.mjs --wave=1 --fire
 *   node scripts/manus/request-bg-cards-harvest.mjs --wave=1 --poll-only
 *
 * Sheets: tmp/manus-bg-stockpile/waveN/sheets/
 * Inventory: tmp/manus-bg-stockpile/inventory.json
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

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-bg-stockpile');

/** 4 landscape panels per 2×2 sheet; 3 sheets = 12 categories per wave. */
export const WAVES = {
  1: {
    id: 'wave1',
    title: 'BG stockpile wave1 — classroom/home/playground (12 panels)',
    panels: [
      { slug: 'classroom-cool-a', category: 'classroom', brief: 'soft periwinkle classroom wash, tiny chalkboard corner glyph only, centre empty' },
      { slug: 'classroom-cool-b', category: 'classroom', brief: 'same hue family, tiny desk corner silhouette thumbnail, centre empty' },
      { slug: 'classroom-cool-c', category: 'classroom', brief: 'same hue, tiny globe corner glyph, centre empty' },
      { slug: 'classroom-cool-d', category: 'classroom', brief: 'same hue, blank bulletin corner shape (no letters), centre empty' },
      { slug: 'home-living-a', category: 'home/living room', brief: 'warm peach-cream living-room wash, tiny curtain fold corner, centre empty' },
      { slug: 'home-living-b', category: 'home/living room', brief: 'same hue, tiny lamp-glow blob corner, centre empty' },
      { slug: 'bedroom-calm-a', category: 'bedroom', brief: 'lavender bedroom wash, tiny pillow corner glyph, centre empty' },
      { slug: 'bedroom-calm-b', category: 'bedroom', brief: 'same hue, tiny moon window corner (no face), centre empty' },
      { slug: 'kitchen-warm-a', category: 'kitchen', brief: 'soft butter-yellow kitchen wash, tiny pot corner glyph, centre empty' },
      { slug: 'kitchen-warm-b', category: 'kitchen', brief: 'same hue, tiny spoon/fork corner thumbnail, centre empty' },
      { slug: 'bathroom-fresh-a', category: 'bathroom', brief: 'mint-teal bathroom wash, tiny soap bubble corner, centre empty' },
      { slug: 'bathroom-fresh-b', category: 'bathroom', brief: 'same hue, tiny towel corner fold, centre empty' },
    ],
    sheetGroups: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]],
  },
  2: {
    id: 'wave2',
    title: 'BG stockpile wave2 — outdoor/shop/clinic (12 panels)',
    panels: [
      { slug: 'playground-bright-a', category: 'playground', brief: 'sky-blue playground wash, tiny slide corner silhouette, centre empty' },
      { slug: 'playground-bright-b', category: 'playground', brief: 'same hue, tiny swing corner glyph, centre empty' },
      { slug: 'park-fresh-a', category: 'park', brief: 'leaf-green park wash, grass fringe bottom corner only, centre empty' },
      { slug: 'park-fresh-b', category: 'park', brief: 'same hue, tiny bench corner thumbnail, centre empty' },
      { slug: 'street-town-a', category: 'street/town', brief: 'soft gray-blue town wash, tiny building corner silhouette, centre empty' },
      { slug: 'street-town-b', category: 'street/town', brief: 'same hue, tiny crosswalk stripe corner, centre empty' },
      { slug: 'shop-market-a', category: 'shop/market', brief: 'warm market wash, tiny fruit crate corner glyph, centre empty' },
      { slug: 'shop-market-b', category: 'shop/market', brief: 'same hue, tiny shopping bag corner, centre empty' },
      { slug: 'restaurant-cafe-a', category: 'restaurant/cafe', brief: 'cream cafe wash, tiny coffee cup corner glyph, centre empty' },
      { slug: 'restaurant-cafe-b', category: 'restaurant/cafe', brief: 'same hue, tiny plate corner thumbnail, centre empty' },
      { slug: 'clinic-cool-a', category: 'clinic/dentist', brief: 'pale teal clinic wash, tiny tooth outline corner, centre empty' },
      { slug: 'clinic-cool-b', category: 'clinic/dentist', brief: 'same hue, tiny sparkle cross corner, centre empty' },
    ],
    sheetGroups: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]],
  },
  3: {
    id: 'wave3',
    title: 'BG stockpile wave3 — library/farm/zoo/beach/forest (10 panels)',
    panels: [
      { slug: 'library-quiet-a', category: 'library', brief: 'dusty blue library wash, tiny book stack corner, centre empty' },
      { slug: 'library-quiet-b', category: 'library', brief: 'same hue, tiny lamp corner glyph, centre empty' },
      { slug: 'farm-pasture-a', category: 'farm', brief: 'grass-green farm wash, tiny fence corner, centre empty' },
      { slug: 'farm-pasture-b', category: 'farm', brief: 'same hue, tiny barn corner silhouette, centre empty' },
      { slug: 'zoo-gate-a', category: 'zoo', brief: 'sage zoo wash, tiny gate/rail corner watermark, centre empty' },
      { slug: 'zoo-gate-b', category: 'zoo', brief: 'same hue, tiny paw-print corner glyph, centre empty' },
      { slug: 'beach-sunny-a', category: 'beach', brief: 'sand-teal beach wash, tiny shell corner, centre empty' },
      { slug: 'beach-sunny-b', category: 'beach', brief: 'same hue, tiny wave fringe bottom corner, centre empty' },
      { slug: 'forest-nature-a', category: 'forest/nature', brief: 'deep green forest wash, tree trunk corner thumbnail, centre empty' },
      { slug: 'forest-nature-b', category: 'forest/nature', brief: 'same hue, leaf corner fringe, centre empty' },
    ],
    sheetGroups: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]],
  },
  4: {
    id: 'wave4',
    title: 'BG stockpile wave4 — airport/sports/pool/weather seasonal (14 panels)',
    panels: [
      { slug: 'airport-travel-a', category: 'airport/travel', brief: 'sky travel wash, tiny paper-plane corner, centre empty' },
      { slug: 'airport-travel-b', category: 'airport/travel', brief: 'same hue, tiny suitcase corner glyph, centre empty' },
      { slug: 'sports-gym-a', category: 'sports field/gym', brief: 'court-green gym wash, tiny basketball corner, centre empty' },
      { slug: 'sports-gym-b', category: 'sports field/gym', brief: 'same hue, tiny mat corner fringe, centre empty' },
      { slug: 'pool-aqua-a', category: 'pool', brief: 'aqua pool wash, tiny lane-rope corner, centre empty' },
      { slug: 'pool-aqua-b', category: 'pool', brief: 'same hue, tiny kickboard corner glyph, centre empty' },
      { slug: 'weather-rain-a', category: 'weather/seasonal', brief: 'gray-blue rainy wash, tiny raindrop corner fringe, centre empty' },
      { slug: 'weather-rain-b', category: 'weather/seasonal', brief: 'same hue, tiny umbrella corner silhouette, centre empty' },
      { slug: 'weather-snow-a', category: 'weather/seasonal', brief: 'icy snow wash, tiny snowflake corner, centre empty' },
      { slug: 'weather-snow-b', category: 'weather/seasonal', brief: 'same hue, tiny mitten corner glyph, centre empty' },
      { slug: 'weather-sunny-a', category: 'weather/seasonal', brief: 'golden sunny wash, tiny sun corner (simple, not scary), centre empty' },
      { slug: 'weather-sunny-b', category: 'weather/seasonal', brief: 'same hue, tiny cloud corner puff, centre empty' },
      { slug: 'weather-autumn-a', category: 'weather/seasonal', brief: 'orange autumn wash, tiny leaf corner, centre empty' },
      { slug: 'weather-autumn-b', category: 'weather/seasonal', brief: 'same hue, tiny acorn corner glyph, centre empty' },
    ],
    sheetGroups: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13]],
  },
};

const STYLE_LOCK = `STYLE LOCK (quiet ESL lesson flats — docs/bg-theme-sets.md):
- Soft pastel WASH background for an ESL lesson slide. Wide panoramic banner (~16:9).
- Same flat-vector children's book endpaper feel: gentle gradients, muted colours, no harsh outlines.
- Centre 70%+ MUST stay empty and low-texture — soft colour only — so white cards sit on top.
- Motifs are thumbnail-sized and ONLY in far corners or thin bottom fringe.
- NO people, faces, animals, furniture layouts, bookshelves, windows with props, text, letters, numbers, logos.
- Anti-room HARD FAIL: do NOT ship a furnished room with empty middle strip. Near-empty wash + tiny corner glyph only.
- Never flesh/skin/peach-as-body washes. Prefer cool tinted wall washes.
- Each panel in a sheet shares the same hue family; only value / small motif changes.
- quality: default ONLY (never high).`;

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function resolveWave() {
  const raw = Number(arg('wave', ''));
  const wave = WAVES[raw];
  if (!wave) throw new Error('Need --wave=1|2|3|4');
  return wave;
}

function buildBrief(wave) {
  const sheetBlocks = wave.sheetGroups.map((idxs, si) => {
    const cells = idxs.map((i, ci) => {
      const p = wave.panels[i];
      return `${ci + 1}. ${p.slug} — ${p.brief}`;
    });
    const incompleteNote =
      idxs.length < 4
        ? `\nINCOMPLETE SHEET: only cells 1-${idxs.length} have panels. Leave cells ${idxs.length + 1}-4 blank white empty (no art, no fillers).`
        : '';
    return `SHEET ${si + 1} — exact 2×2 grid (4 landscape panels), reading order left→right, top→bottom:\n${cells.join('\n')}${incompleteNote}`;
  });

  return withEslAssetGeneratorBrief(`TASK: Produce **${wave.sheetGroups.length} contact sheets** of reusable ESL **lesson background / quiet flat** landscape panels for ClassIn boards.

These are FULL-BLEED lesson backdrops (NOT black-field props, NOT vocab icons, NOT story stills with characters).

${STYLE_LOCK}

HARD RULES:
- Each cell = ONE landscape panel (~16:9 inside the cell).
- Panels must be place-true from corner motifs — not generic warm wash + random leaf.
- NO readable text painted on art.
- Deliver ${wave.sheetGroups.length} PNG sheets (Perfect-${wave.sheetGroups.length} — keep generating inside THIS task until all exist).

${sheetBlocks.join('\n\n')}

Return ${wave.sheetGroups.length} PNG sheets + short slug legend in chat only.`);
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

  const items = wave.panels.map((p, i) => {
    const sheetIdx = wave.sheetGroups.findIndex((g) => g.includes(i));
    return {
      scene_category: p.category,
      slug: p.slug,
      manus_task_id: dump.task_id || null,
      sheet_file: sheetIdx >= 0 ? `${String(sheetIdx + 1).padStart(2, '0')}.png` : null,
      cell_in_sheet: sheetIdx >= 0 ? wave.sheetGroups[sheetIdx].indexOf(i) + 1 : null,
      obvious_fail: false,
    };
  });

  inv.waves[wave.id] = {
    kind: 'bg-cards',
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    panel_count: wave.panels.length,
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

const wave = resolveWave();
const OUT_DIR = path.join(STOCKPILE, wave.id);
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');
const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
const pollOnly = process.argv.includes('--poll-only');
const NEED_SHEETS = wave.sheetGroups.length;
const BRIEF = buildBrief(wave);

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      wave: wave.id,
      panels: wave.panels,
      sheetGroups: wave.sheetGroups,
    },
    null,
    2,
  ),
);

let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'bg-cards',
  wave: wave.id,
  sheet_dir: SHEET_DIR,
  panel_count: wave.panels.length,
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
const large = saved.filter((s) => s.bytes > 50_000);

if (large.length < NEED_SHEETS) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need ${NEED_SHEETS} quiet-flat 2×2 sheets. Fire remaining generate_image calls now.`,
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
const largeCount = saved.filter((s) => s.bytes > 50_000).length;
console.log(
  JSON.stringify(
    {
      phase: 'downloaded',
      wave: wave.id,
      task_id: taskId,
      task_url: dump.task_url,
      panels: wave.panels.length,
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
