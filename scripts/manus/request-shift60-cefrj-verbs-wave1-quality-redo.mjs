/**
 * Shift60 — CEFR-J verbs wave1 QUALITY REDO (selected sheets).
 * Import target: picturable-verbs wave=10, themes cefrj-verbs-NN.
 *
 * Each --sheets= send lands in its own OUT_ROOT/task-<sheets>/ so V01
 * does not overwrite a prior V03 run.json (poll discovers all task-* dirs).
 *
 *   node scripts/manus/request-shift60-cefrj-verbs-wave1-quality-redo.mjs --send --sheets=V03
 *   node scripts/manus/request-shift60-cefrj-verbs-wave1-quality-redo.mjs --send --sheets=V01
 *   node scripts/manus/request-shift60-cefrj-verbs-wave1-quality-redo.mjs --send --sheets=V01,V03
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const SHEETS_ARG = (() => {
  const a = process.argv.find((x) => x.startsWith('--sheets='));
  return a ? a.slice(9).toUpperCase().split(',').map((s) => s.trim()).filter(Boolean) : ['V03'];
})();

const WAVE1_RUN = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave10', 'task1', 'run.json');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave10-quality-redo');
const CELLS = 9;
const TASK_SLUG = `task-${SHEETS_ARG.join('-').toLowerCase()}`;
const OUT_DIR = path.join(OUT_ROOT, TASK_SLUG);

const RICH_STEERS = {
  perform: 'kid performing on a small stage with mic and spotlight',
  play: 'kids playing catch with a colorful ball outdoors',
  pollute: 'factory smokestacks dirtying blue sky above a sad tree (cause/effect scene — NOT arrow glyphs)',
  pray: 'respectful figure praying with folded hands, soft warm light',
  prepare: 'kid preparing sandwich ingredients on a kitchen counter',
  pretend: 'kid pretending with toy crown and cape dress-up',
  receive: 'kid receiving a wrapped birthday present with bow',
  relax: 'kid relaxing in a hammock under a tree',
  shut: 'hand shutting a colorful bedroom door',
  add: 'kid adding more blocks to a tower',
  beg: 'kid politely begging with clasped hands',
  chat: 'two kids chatting on a bench',
  check: 'kid checking a blank checklist with pencil',
  create: 'kid creating a crayon drawing at a desk',
  disappear: 'magician cape swirl with figure half-hidden behind curtain (NOT silhouette+puff emoji)',
  divide: 'kid dividing a pizza into equal slices',
  exercise: 'kid doing jumping-jacks with water bottle nearby',
  finish: 'kid breaking a finish-line ribbon',
};

function loadSheet(sheetId) {
  // V01 → S1 in verbs run.json
  const n = Number(String(sheetId).replace(/^V/i, ''));
  const id = `S${n}`;
  if (!fs.existsSync(WAVE1_RUN)) throw new Error(`Missing ${WAVE1_RUN}`);
  const run = JSON.parse(fs.readFileSync(WAVE1_RUN, 'utf8'));
  const sheet = (run.sheets || []).find((s) => s.id === id);
  if (!sheet) throw new Error(`${id} not in verbs run.json`);
  const keys = sheet.keys || [];
  return {
    id: sheetId,
    theme: sheet.theme,
    title: sheet.title || `CEFRJ VERBS ${n}`,
    cells: keys.map((key) => [key, RICH_STEERS[key] || `${key} action`, key]),
    incomplete: keys.length < CELLS || !!sheet.incomplete,
  };
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  const incompleteNote =
    sheet.cells.length < CELLS
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length}. Leave cells ${sheet.cells.length + 1}-${CELLS} blank white.`
      : '';
  return `SHEET ${index} — ${sheet.title} (${sheet.theme}):\n${lines.join('\n')}\nKeys: ${keys}${incompleteNote}`;
}

const sheets = SHEETS_ARG.map(loadSheet);
const brief = withEslAssetGeneratorBrief(`TASK: QUALITY REDO — White-background ESL ACTION VERB 3×3 sheets. Prior drop was too flat/sticker/iconey. Re-draw as rich kid-illustration ACTION scenes with props.

HARD STYLE: #FFFFFF; even 3×3; ZERO text/logos/numbers; quality: default. Deliver ${sheets.length} PNGs.
LOOK: soft shading, clear actions, material cues. NOT emoji-flat sticker glyphs, NOT mono silhouettes, NOT UI arrows.

Filename with theme slug (e.g. esl_cefrj_verbs_03_cefrj-verbs-03.png).

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const outJson = path.join(OUT_DIR, 'run.json');
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  kind: 'cefrj-verbs-wave1-quality-redo',
  task_slug: TASK_SLUG,
  sheets: sheets.map((s) => ({
    id: s.id,
    theme: s.theme,
    keys: s.cells.map(([k]) => k),
    incomplete: !!s.incomplete,
  })),
  keys: sheets.flatMap((s) => s.cells.map((c) => c[0])),
};

if (fs.existsSync(outJson) && SEND && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  if (prev.task_id && !prev.dry_run) {
    console.error('REFUSING already sent:', prev.task_id);
    process.exit(2);
  }
}

if (DRY) {
  fs.writeFileSync(
    path.join(OUT_DIR, 'dry-run.json'),
    JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2)
  );
  console.log(
    JSON.stringify({
      phase: 'dry-run',
      sheets: SHEETS_ARG,
      keys: dumpBase.keys.length,
      outDir: OUT_DIR,
    })
  );
  process.exit(0);
}

apiKey();
const created = await createTask({
  title: `ESL white vocab 3×3: CEFR-J verbs wave1 QUALITY REDO ${SHEETS_ARG.join('+')}`,
  message: brief,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
const taskUrl = created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null);
fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: taskUrl, created }, null, 2));
// Mirror latest send at OUT_ROOT/run.json for older tooling; poll discovers task-* dirs.
fs.writeFileSync(path.join(OUT_ROOT, 'run.json'), JSON.stringify({ ...dumpBase, task_id: taskId, task_url: taskUrl, created }, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: taskUrl, sheets: SHEETS_ARG, outDir: OUT_DIR }));
