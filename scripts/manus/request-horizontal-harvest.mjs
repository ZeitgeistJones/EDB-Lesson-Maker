/**
 * Horizontal harvest manufacturing.
 * Stockpile only: no PropBank merge, producer wiring, renderer changes, or CEFR expansion.
 *
 *   node scripts/manus/request-horizontal-harvest.mjs --wave=interactions --fire
 *   node scripts/manus/request-horizontal-harvest.mjs --wave=interactions --poll-only
 *   node scripts/manus/request-horizontal-harvest.mjs --all --fire
 *
 * Sheets: harvested/manus-horizontal-stockpile/<wave-id>/sheets/
 * Inventory: docs/horizontal-harvest-inventory.json
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

const STOCKPILE_REL = 'harvested/manus-horizontal-stockpile';
const TRACKED_INV_REL = 'docs/horizontal-harvest-inventory.json';
const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const TRACKED_INV = path.join(ROOT, TRACKED_INV_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;

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

const STYLE = `STYLE LOCK: child-friendly ClassIn ESL board art, clean sparse vector / soft-matte educational illustration, consistent family style across all sheets, no logos, no watermarks, no photorealism.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, menu text, UI text, readable signs, or fake readable text into the art.
BLACK FIELD LOCK: every contact sheet must be pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black.
STOCKPILE LOCK: raw Manus sheets only for future producer use. Do not wire, import to PropBank, modify renderer, run viability tests, create C1/C2, or broaden this list.
QUALITY: default only.`;

function c(key, brief, family) {
  return {
    key,
    concept: key,
    brief,
    family,
    classification: 'MANUS_WORTHY',
    status: 'pending',
    qa_status: null,
    recovered_locally: false,
    regenerated: false,
  };
}

function sh(id, title, format, cells, extra = '') {
  return { id, title, format, cells, extra };
}

export const WAVES = {
  interactions: {
    id: 'h1-interaction-poses',
    title: 'Horizontal Harvest H1 interaction poses',
    family: 'interaction-poses',
    style: `${STYLE}
FAMILY: composable young-learner interaction poses / mini-scenes. Use the same child proportions, palette, and line weight across all cells. These are not worksheets, not speech exercises, and not full backgrounds.
POSE LOCK: show child-friendly body language clearly; blank speech bubbles are allowed only when needed and must contain no text.
PEOPLE BLACK-FIELD FAILURE LOCK: draw the people directly on pure #000000 black. Do not place them on white cards, white panels, white room backgrounds, grey rectangles, or white cell backgrounds. Avoid white/light-grey clothing areas that merge into the background-removal edge; use colored clothes with clear outlines.`,
    sheets: [
      sh('S1', 'interaction 3x3', 'black-contact-3x3', [
        c('interaction-kneel-pick-up-item', 'child kneels or bends to pick up one dropped classroom object; clear kindness/cleanup pose; no text', 'interaction-poses'),
        c('interaction-search-under-table', 'child looks under or behind a simple table for a lost object; mystery/preposition friendly; no text', 'interaction-poses'),
        c('interaction-knock-and-enter', 'child knocks at a partly open doorway while another child is visible inside; no room labels or signs', 'interaction-poses'),
        c('interaction-comfort-friend', 'one child gently comforts a worried friend with kind posture; no tears as danger, no words', 'interaction-poses'),
        c('interaction-apologize-to-friend', 'child apologizes to a friend with humble gesture and optional blank bubble; no written sorry', 'interaction-poses'),
        c('interaction-invite-friend', 'child beckons or offers an invitation toward an activity, friend nearby; blank bubble only, no text', 'interaction-poses'),
        c('interaction-ask-permission', 'child politely asks an adult or peer with raised hand / blank bubble; classroom-safe, no words', 'interaction-poses'),
        c('interaction-wait-in-line', 'two or three children queue politely, reusable for bus/cafeteria/shop; no signs, numbers, or labels', 'interaction-poses'),
        c('interaction-peer-check-together', 'two children compare one picture/object and agree or check together; pair-work wrap cue, no text', 'interaction-poses'),
      ]),
    ],
  },
  stages: {
    id: 'h2-stage-surfaces',
    title: 'Horizontal Harvest H2 stage surfaces',
    family: 'stage-surfaces',
    style: `${STYLE}
FAMILY: large reusable hero stage surfaces. Each cell is a black-field cutout-ready surface, not a full room background.
FUNCTIONAL SPACE LOCK: each stage must have obvious empty drop/packing/sorting/build space for draggable objects. Do not fill the usable areas with decoration.`,
    sheets: [
      sh('S1', 'stage surfaces 2x2', 'black-contact-2x2', [
        c('stage-kitchen-workbench-mixing-bowl', 'large friendly kitchen counter / workbench with mixing bowl and wide empty areas for ingredients/tools; no text', 'stage-surfaces'),
        c('stage-wardrobe-costume-closet-open', 'open wardrobe / costume closet stage with empty hanging/shelf space for clothing and costume pieces; no labels', 'stage-surfaces'),
        c('stage-lost-and-found-shelf-box', 'friendly lost-and-found shelf plus open box surface for sorting found items; no sign text or labels', 'stage-surfaces'),
        c('stage-packing-suitcase-open', 'open suitcase stage with empty compartments and clear packing space; travel prep friendly; no tags or writing', 'stage-surfaces'),
      ]),
    ],
  },
  overlays: {
    id: 'h3-state-overlays',
    title: 'Horizontal Harvest H3 state overlays',
    family: 'state-overlays',
    style: `${STYLE}
FAMILY: transparent-capable reusable story/environment overlays. Draw compact overlay atoms on black field, not full backgrounds.
OVERLAY LOCK: leave edges clean for alpha keying; use shapes that can sit over any scene. No readable signs or warning text.`,
    sheets: [
      sh('S1', 'state overlays 4x2', 'black-contact-4x2', [
        c('overlay-rain-cloud-puddle', 'rain cloud with falling rain and small puddle complication overlay; transparent-capable, no full background', 'state-overlays'),
        c('overlay-snow-cold-wind', 'snowflakes plus cold wind swirl overlay for winter/weather; transparent-capable, no text', 'state-overlays'),
        c('overlay-night-dim-window', 'night/darkness cue with dim window/moon shadow; overlay atom, not full room, no words', 'state-overlays'),
        c('overlay-busy-crowd-small', 'small crowd or queue cluster that reads busy/crowded; no signs, no labels', 'state-overlays'),
        c('overlay-celebration-bunting-confetti', 'celebration bunting and confetti overlay for party/reward ending; no letters or numbers', 'state-overlays'),
        c('overlay-closed-door-barrier', 'closed/unavailable place cue using closed door/barrier only; no CLOSED sign or readable marks', 'state-overlays'),
        c('overlay-lost-item-spotlight', 'empty spot/search glow cue for missing item mechanics; no question-mark text, no words', 'state-overlays'),
        c('overlay-found-item-sparkle', 'found/resolved item sparkle cue; generic success overlay, no labels or text', 'state-overlays'),
      ]),
    ],
  },
  roles: {
    id: 'h4-child-world-roles',
    title: 'Horizontal Harvest H4 child-world roles',
    family: 'child-world-roles',
    style: `${STYLE}
FAMILY: everyday child-world cast role portraits. Same house style, neutral happy posture, reusable story cast identity. These are cast assets, not vocab icons.
ROLE LOCK: one clear full-body or three-quarter character per cell, friendly and non-stereotyped, no name tags, badges with text, logos, or clinic/school labels.
PEOPLE BLACK-FIELD FAILURE LOCK: draw each role directly on pure #000000 black. Do not place characters on white cards, white panels, white studio backgrounds, grey rectangles, or white cell backgrounds. Nurse/dentist uniforms should be pastel blue/green with colored trim, not white coats/pants that disappear during black-field keying.`,
    sheets: [
      sh('S1', 'child-world roles 2x3', 'black-contact-2x3', [
        c('cast-nurse-neutral-happy', 'friendly school nurse / clinic helper character, neutral happy pose; no medical text or red-cross logo', 'child-world-roles'),
        c('cast-dentist-neutral-happy', 'friendly dentist character, neutral happy pose with simple dental cue; no text or logo', 'child-world-roles'),
        c('cast-librarian-neutral-happy', 'friendly librarian character, neutral happy pose with book cue; no readable book text', 'child-world-roles'),
        c('cast-bus-driver-neutral-happy', 'friendly bus driver character, neutral happy pose with simple driver cue; no route numbers or badge text', 'child-world-roles'),
        c('cast-grandparent-neutral-happy', 'friendly grandparent character for family/home stories, neutral happy pose; no text', 'child-world-roles'),
        c('cast-classmate-neutral-happy', 'generic friendly classmate / peer beyond named Mia/Leo, neutral happy pose; no uniform labels', 'child-world-roles'),
      ]),
    ],
  },
  states: {
    id: 'h5-state-pairs',
    title: 'Horizontal Harvest H5 state pairs',
    family: 'state-pairs',
    style: `${STYLE}
FAMILY: compact object state-pair visuals. Each cell may show the matched pair side by side as one reusable state concept.
PAIR LOCK: matched viewpoint, scale, object identity, and framing. Show the contrast visually without words, symbols, letters, or labels.`,
    sheets: [
      sh('S1', 'state pairs 1x3', 'black-contact-1x3', [
        c('state-light-on-off-lamp', 'same child-safe lamp shown on and off as a matched pair; no labels or letters', 'state-pairs'),
        c('state-packed-unpacked-bag', 'same school/travel bag shown packed and unpacked as a matched pair; no labels', 'state-pairs'),
        c('state-plugged-unplugged-device', 'same child-safe classroom/home device shown plugged and unplugged; no brand, no screen text', 'state-pairs'),
      ]),
    ],
  },
  demand: {
    id: 'h6-demand-top-ups',
    title: 'Horizontal Harvest H6 demand top-ups',
    family: 'demand-top-ups',
    style: `${STYLE}
FAMILY: tiny lesson-demand top-up props/vocab tokens. Simple instantly readable still-life or compact scene token, not broad vocab harvesting.
DEMAND LOCK: only the listed concepts. Do not add recommendation/nonfiction/driver-seat/roller-coaster or any extra vocab.`,
    sheets: [
      sh('S1', 'demand top-ups 1x3', 'black-contact-1x3', [
        c('vocab-crust', 'simple bread or pizza crust still-life, clearly the crust, child-friendly food token; no plate text', 'demand-top-ups'),
        c('vocab-tentacle', 'single friendly octopus tentacle still-life, clearly a tentacle; no full monster, no danger', 'demand-top-ups'),
        c('vocab-check-up', 'doctor check-up scene token with child-safe stethoscope/clipboard cue; no readable form text', 'demand-top-ups'),
      ]),
    ],
  },
};

const WAVE_ORDER = ['interactions', 'stages', 'overlays', 'roles', 'states', 'demand'];
const ORIGINAL_MANUS_WORTHY = WAVE_ORDER.flatMap((k) => WAVES[k].sheets.flatMap((s) => s.cells));

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((cell, i) => `${i + 1}. ${cell.key} — ${cell.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format}, one concept per cell):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}${sheet.extra ? `\n${sheet.extra}` : ''}`;
}

function buildBrief(wave, sheets) {
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} horizontal-harvest black-field PNG contact sheet(s)** for ClassIn ESL.

SOURCE OF TRUTH: docs/horizontal-harvest-shortlist.md, approved MANUS_WORTHY only.

${wave.style}

HARD RULES:
- Generate ONLY the listed cells. Do not review, dedupe, research, broaden, or add concepts.
- Do NOT generate REUSE/CODE_LATER/LOW_VALUE concepts.
- Reading order left to right, top to bottom for every contact sheet.
- One concept per cell, pure #000000 black field, clear gutters, nothing crossing cell boundaries.
- NO baked readable text, fake writing, labels, connector words, letters, numbers, prices, times, dates, dialogue, signs, badges, logos, UI text, or watermarks.
- Overlays must be transparent-capable after black keying.
- Boards/surfaces must keep empty functional space when that is the asset type.
- Consistent family style inside this wave.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG contact sheet exists.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return PNGs, preferably one zip plus CDN links. No essay.`);
}

function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const hay = [cell.key, cell.concept, cell.brief].join(' ').toLowerCase();
    const hit = [...SAFETY_SKIP_KEYS].find((deny) => hay.includes(deny));
    if (hit) skipped.push({ key: cell.key, reason: `MANUS_SAFETY_DENY:${hit}` });
    else kept.push(cell);
  }
  return { kept, skipped };
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

function emptyInv() {
  return {
    spec: 'horizontal-harvest-manufacturing',
    updated_at: null,
    source_of_truth: 'docs/horizontal-harvest-shortlist.md',
    checkpoint: 'eae83d50',
    durable_root: STOCKPILE_REL,
    no_wiring: true,
    no_renderer_changes: true,
    no_cefr_expansion: true,
    original_manus_worthy: ORIGINAL_MANUS_WORTHY.length,
    running_total: {
      original_manus_worthy: ORIGINAL_MANUS_WORTHY.length,
      pass: 0,
      hold: 0,
      locally_recovered: 0,
      regenerated: 0,
      safety_skipped: 0,
      sheets_downloaded: 0,
      tasks_used: 0,
    },
    waves: {},
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    original_manus_worthy: ORIGINAL_MANUS_WORTHY.length,
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

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  recomputeTotals(inv);
  const json = JSON.stringify(inv, null, 2);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), json);
  fs.mkdirSync(path.dirname(TRACKED_INV), { recursive: true });
  fs.writeFileSync(TRACKED_INV, json);
  return TRACKED_INV;
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

  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((s) => s.cells.map((cell) => ({
    ...cell,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: null,
    qa_note: haveLarge
      ? 'Raw sheet downloaded; visual QA/recovery must record PASS or HOLD before close.'
      : null,
    path: dump.sheet_dir || null,
    sheet_id: s.id,
    manus_task_id: dump.task_id || null,
  })));

  inv.waves[wave.id] = {
    family: wave.family,
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

async function upsertInventoryLocked(wave, sheets, dump) {
  return withInvLock(() => upsertInventory(wave, sheets, dump));
}

async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --all`);

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
        source_of_truth: 'docs/horizontal-harvest-shortlist.md',
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
    kind: 'horizontal-harvest-manufacturing',
    source_of_truth: 'docs/horizontal-harvest-shortlist.md',
    checkpoint: 'eae83d50',
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
    await upsertInventoryLocked(wave, sheets, dump);
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly && !process.argv.includes('--all')) return;
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
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} horizontal-harvest black-field sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Generate only the original MANUS_WORTHY concepts.`,
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
      },
      null,
      2,
    ),
  );
  if (largeCount < NEED_SHEETS) process.exit(2);
}

apiKey();
if (ORIGINAL_MANUS_WORTHY.length !== 33) {
  throw new Error(`Horizontal harvest must contain exactly 33 original MANUS_WORTHY concepts, got ${ORIGINAL_MANUS_WORTHY.length}`);
}

if (process.argv.includes('--all')) {
  for (const w of WAVE_ORDER) {
    await runWave(w);
  }
} else {
  await runWave(arg('wave', ''));
}
