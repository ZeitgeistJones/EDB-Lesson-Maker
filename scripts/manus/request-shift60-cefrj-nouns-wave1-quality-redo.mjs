/**
 * Shift60 — CEFR-J wave1 QUALITY REDO (iconey → rich ESL still-life).
 *
 * Source of truth: tmp/cefrj-manus/wave1-redo-list.md
 * Keys pulled from tmp/manus-shift60-cefrj-nouns-wave1/taskN/run.json
 *
 * Concurrency: fire at most 3 createTask in flight across this shift.
 * Prefer grouped Perfect-N (≤6 sheets/task), never 1 task per sheet.
 *
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1-quality-redo.mjs
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1-quality-redo.mjs --send --batch=p0
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1-quality-redo.mjs --send --task=1
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1-quality-redo.mjs --send --batch=p1a
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
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();
const BATCH = (() => {
  const a = process.argv.find((x) => x.startsWith('--batch='));
  return a ? a.slice(8).toLowerCase() : null;
})();

const WAVE1_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-nouns-wave1');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-nouns-wave1-quality-redo');
const CELLS = 9;

/**
 * Rich still-life steers — push concrete props, kill emoji/UI-glyph defaults.
 * Especially for cells that collapsed to silhouettes / mood faces / browser chrome.
 */
const RICH_STEERS = {
  meter: 'wooden meter stick / folding carpenter ruler still-life',
  middle: 'middle chair highlighted in a row of three wooden chairs (object still-life)',
  'mineral-water': 'clear mineral-water bottle with blue cap (no brand text)',
  mistake: 'crossed-out homework paper with eraser and red pencil (no readable words, no red-X glyph alone)',
  model: 'plastic model airplane kit on a desk (not a fashion silhouette)',
  mood: 'sunny window + rainy window diorama props (NOT sun/cloud face emojis)',
  mosque: 'mosque building with dome and minaret exterior still-life',
  'mp3-player': 'pocket MP3 player with earbuds still-life (no brand logos)',
  murder: 'detective mystery still-life: magnifying glass + footprint + closed case folder (kid-safe, no violence/blood)',
  policewoman: 'friendly policewoman figure in uniform with badge (full body, not blank face blob)',
  portrait: 'framed painted portrait on easel (face soft, not blank oval)',
  pride: 'kid holding a small handmade pride flag banner still-life (NOT floating rainbow heart icon)',
  pro: 'pro athlete trophy + jersey still-life (no text on jersey)',
  promise: 'pinky-promise hands close-up still-life (kid-safe)',
  psychologist: 'psychologist office: sofa + notebook + calm plant still-life',
  public: 'public park bench with notice board still-life (NOT silhouette crowd glyph)',
  quiz: 'quiz clipboard with blank multiple-choice bubbles (no readable words)',
  rating: 'five gold stars on a wooden rating plaque (NOT flat star-row UI widget)',
  receptionist: 'receptionist desk with computer, phone, nameplate blank, visitor chair',
  release: 'bird released from open cage still-life (gentle, kid-safe)',
  rent: 'house keys on rental lease folder (blank paper, no text)',
  reply: 'handwritten reply letter with pen and envelope (no readable words)',
  report: 'school report folder with charts peeking (blank / no readable text)',
  request: 'request form on clipboard with pen (blank fields)',
  research: 'microscope + open research notebook still-life',
  response: 'teacher answering with raised hand + speech-bubble prop object (no letters inside)',
  reunion: 'family reunion picnic table with balloons still-life',
  thief: 'cartoon burglar with striped shirt and loot bag (kid-safe comedy, not scary)',
  thunderstorm: 'stormy sky with lightning over trees landscape still-life',
  tights: 'folded colorful tights / ballet tights still-life on white',
  tip: 'restaurant tip jar with coins still-life',
  title: 'book cover with blank gold title plate (no readable words)',
  tone: 'tuning fork + music notes prop still-life (not abstract waveform glyph)',
  tonight: 'night window with moon and bedside lamp still-life',
  toothache: 'kid holding cheek beside giant tooth prop + ice pack (gentle comedy)',
  tour: 'tour bus + camera + guidebook still-life',
  'video-game': 'handheld video-game console with controller still-life (no brand logos/text)',
  visitor: 'visitor badge on lanyard + welcome flowers still-life',
  vocabulary: 'vocabulary flashcard stack + dictionary book still-life (cards blank)',
  walking: 'walking shoes + path pebbles still-life (or simple kid walking side-view)',
  'washing-up': 'sink with soapy dishes and sponge washing-up still-life',
  'web-page': 'printed webpage mockup on desk with mouse (page blank, NO browser chrome/URL bar icons)',
  website: 'desktop computer showing a colorful site layout mockup (NO browser UI glyphs / wireframes as the art)',
  wedding: 'wedding cake + rings + flowers still-life',
  weep: 'weeping willow tree with soft rain (NOT emoji cry face)',
  weight: 'iron kettlebell / weight plate still-life',
  west: 'compass with needle pointing west beside a small desert cactus (not a lone W arrow glyph)',
  winner: 'winner podium with gold trophy and ribbon still-life',
  wisdom: 'owl on a stack of old books still-life',
  writing: 'fountain pen writing in an open notebook (blank lines, no words)',
  youth: 'youthful kid with backpack and skateboard still-life',
  zone: 'colorful play-zone floor mat with cones (no readable ZONE letters)',
  // P1 extras if batch expands
  dislike: 'thumbs-down hand with unhappy but soft kid face (not flat dislike icon)',
  director: 'film director chair + clapperboard still-life',
  doubt: 'puzzled kid with question-mark prop object (not floating ? glyph alone)',
  disco: 'disco ball + dance floor lights still-life',
  east: 'compass pointing east with sunrise (not lone arrow)',
  envy: 'two gift boxes — one bigger — envy still-life (not green gem glyph)',
  ending: 'closed storybook with "fin" ribbon prop (no readable text)',
  "driver's-license": 'driver license card blank in a wallet still-life',
  'drivers-license': 'driver license card blank in a wallet still-life',
  'first-name': 'name tag sticker blank on a shirt still-life',
  final: 'final exam booklet closed with pencil still-life',
  fiction: 'fiction novel with imaginative cover art (no readable title)',
  feel: 'kid touching soft fabric swatches (texture feel still-life)',
  headteacher: 'headteacher office desk with apple + glasses still-life (friendly figure OK)',
  horror: 'friendly cartoon ghost book / mild spooky mask still-life (kid-safe)',
  honor: 'honor medal on a ribbon still-life (not stock UI badge)',
  help: 'helping hands lifting a box together still-life',
  left: 'left turn road sign blank + path turning left (not a lone nav arrow glyph)',
  lane: 'swimming lane ropes in a pool still-life',
  lawyer: 'lawyer briefcase + law books still-life',
  lack: 'nearly empty jar with one marble left (lack still-life)',
  traffic: 'busy street with cars and traffic light still-life (not schematic diagram)',
  truth: 'mirror + candle truth still-life (not abstract glyph)',
  unit: 'numbered building-block unit cubes stack (no readable numbers if possible)',
  verb: 'action flashcards showing run/jump props (blank cards)',
  training: 'training cones + whistle + stopwatch still-life',
  'sitting-room': 'cozy sitting-room sofa, lamp, rug still-life (full scene, not white silhouette)',
  skateboarding: 'skateboard with helmet still-life (or kid skateboarding side-view)',
  skating: 'ice skates still-life',
  skiing: 'skis and poles in snow still-life',
  slave: 'SKIP-SENSITIVE — broken chain + freedom bird still-life (historical teaching prop, kid-safe, no people in chains)',
  snack: 'snack plate with fruit and crackers still-life',
  snowboarding: 'snowboard in snow still-life',
  soda: 'soda can with bubbles (no brand)',
  'soft-drink': 'soft-drink glass with ice and straw still-life',
};

/** Sheet id → which wave1 taskN/run.json holds it */
const SHEET_HOME = {
  S27: 3, S28: 3, S31: 3,
  S34: 4, S37: 4, S40: 4, S44: 4,
  S45: 5, S50: 5, S55: 5,
  S56: 6, S57: 6, S58: 6,
};

/**
 * Batches — keep createTask count low; ≤6 sheets per task.
 * p0 = user priority (S50 held for p1 per shift lead call)
 */
const BATCHES = {
  p0: [
    { taskNo: 1, sheets: ['S40', 'S44', 'S45'], label: 'P0a S40+S44+S45' },
    { taskNo: 2, sheets: ['S55', 'S57', 'S58'], label: 'P0b S55+S57+S58' },
  ],
  p0a: [{ taskNo: 1, sheets: ['S40', 'S44', 'S45'], label: 'P0a S40+S44+S45' }],
  p0b: [{ taskNo: 2, sheets: ['S55', 'S57', 'S58'], label: 'P0b S55+S57+S58' }],
  p1a: [
    {
      taskNo: 3,
      sheets: ['S27', 'S28', 'S31'],
      label: 'P1a S27+S28+S31',
    },
  ],
  // S50 (P0 leftover) rides with P1; S56 folded here so one createTask covers remainder under cap-3
  p1b: [
    {
      taskNo: 4,
      sheets: ['S34', 'S37', 'S50', 'S56'],
      label: 'P1b S34+S37+S50+S56',
    },
  ],
  p1c: [
    {
      taskNo: 5,
      sheets: ['S56'],
      label: 'P1c S56',
    },
  ],
};

function loadSheetFromWave1(sheetId) {
  const home = SHEET_HOME[sheetId];
  if (!home) throw new Error(`No SHEET_HOME for ${sheetId}`);
  const runPath = path.join(WAVE1_ROOT, `task${home}`, 'run.json');
  if (!fs.existsSync(runPath)) throw new Error(`Missing ${runPath}`);
  const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const sheet = (run.sheets || []).find((s) => s.id === sheetId);
  if (!sheet) throw new Error(`${sheetId} not in ${runPath}`);
  const keys = sheet.keys || [];
  const cells = keys.map((key) => {
    const concept = key.replace(/-/g, ' ');
    const label = RICH_STEERS[key] || concept;
    return [key, label, concept];
  });
  return {
    id: sheet.id,
    theme: sheet.theme,
    title: sheet.title || `CEFRJ NOUNS ${sheetId.slice(1)}`,
    cells,
    incomplete: keys.length < CELLS || !!sheet.incomplete,
    wave1TaskNo: home,
  };
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  const incompleteNote =
    sheet.cells.length < CELLS
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length} have icons. Leave cells ${sheet.cells.length + 1}-${CELLS} blank white empty (no icons, no fillers, no duplicates).`
      : '';
  return `SHEET ${index} — ${sheet.title} (${sheet.theme}):\n${lines.join('\n')}\nKeys: ${keys}${incompleteNote}`;
}

function buildBrief(sheets, taskMeta) {
  return withEslAssetGeneratorBrief(`TASK: QUALITY REDO — White-background ESL vocab 3×3 sheets. Prior drop was too ICONEY (emoji-flat / UI-glyph / mono silhouette on grey). Re-draw as RICH ESL ILLUSTRATION / CONCRETE STILL-LIFE cutouts.

HARD STYLE: #FFFFFF pure white field (NOT grey cards); even 3×3; ZERO text/logos/numbers/labels on the art; quality: default. Deliver ${sheets.length} PNGs.

LOOK (mandatory):
- Soft shading, material cues, slight depth — kid-book illustration / toy-prop still-life
- Full colorful objects on white — NOT white silhouettes on grey panels
- NOT emoji faces, NOT app-icon two-tone sets, NOT wireframe/browser chrome, NOT symbolic arrows/hearts/stars-as-UI when a physical prop exists
- People cells: friendly simple figures with clothes + props (not blank-face blobs or mono charcoal glyphs)

This is CEFR-J wave1 iconey quality-redo ${taskMeta.label} (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-N multi-call — one image call per sheet, all in THIS task).

Filename each PNG with the theme slug (e.g. esl_cefrj_nouns_sheet_40_cefrj-nouns-40.png). Prefer zip + CDN links.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
}

function resolveBatchDefs() {
  if (TASK_FILTER) {
    const all = Object.values(BATCHES).flat();
    const hit = all.find((t) => t.taskNo === TASK_FILTER);
    if (!hit) throw new Error(`Unknown --task=${TASK_FILTER}`);
    return [hit];
  }
  const key = BATCH || 'p0';
  if (!BATCHES[key]) throw new Error(`Unknown --batch=${key}; use ${Object.keys(BATCHES).join('|')}`);
  return BATCHES[key];
}

async function fireTask(def, taskCount) {
  const sheets = def.sheets.map(loadSheetFromWave1);
  const outDir = path.join(OUT_ROOT, `task${def.taskNo}`);
  const outJson = path.join(outDir, 'run.json');
  fs.mkdirSync(outDir, { recursive: true });

  if (fs.existsSync(outJson) && SEND && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    if (prev.task_id && !prev.dry_run) {
      console.error(`REFUSING task${def.taskNo} already sent:`, prev.task_id);
      return { skipped: true, task_id: prev.task_id, taskNo: def.taskNo };
    }
  }

  const keys = sheets.flatMap((s) => s.cells.map((c) => c[0]));
  const brief = buildBrief(sheets, def);
  const profile = resolveAgentProfile();
  const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
  const dumpBase = {
    started_at: new Date().toISOString(),
    agent_profile: profile,
    force_skills: force,
    quality: 'default',
    shift: 60,
    kind: 'cefrj-nouns-wave1-quality-redo',
    batch_label: def.label,
    taskNo: def.taskNo,
    sheet_count: sheets.length,
    keys,
    sheets: sheets.map((s) => ({
      id: s.id,
      theme: s.theme,
      title: s.title,
      keys: s.cells.map(([k]) => k),
      incomplete: !!s.incomplete,
      wave1TaskNo: s.wave1TaskNo,
    })),
  };

  // Dry-run: write beside run.json so we never wipe a real send
  if (DRY) {
    const dryPath = path.join(outDir, 'dry-run.json');
    fs.writeFileSync(dryPath, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
    console.log(
      JSON.stringify({
        phase: 'dry-run',
        taskNo: def.taskNo,
        label: def.label,
        sheets: sheets.map((s) => s.id),
        keys: keys.length,
        dryPath,
      })
    );
    return { dry_run: true, taskNo: def.taskNo };
  }

  apiKey();
  const created = await createTask({
    title: `ESL white vocab 3×3: CEFR-J wave1 QUALITY REDO ${def.label} (${sheets.length} sheets)`,
    message: brief,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
  const taskId = created.task_id || created.id || null;
  const taskUrl = created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null);
  fs.writeFileSync(
    outJson,
    JSON.stringify({ ...dumpBase, task_id: taskId, task_url: taskUrl, created }, null, 2)
  );
  console.log(
    JSON.stringify({
      phase: 'created',
      taskNo: def.taskNo,
      label: def.label,
      task_id: taskId,
      task_url: taskUrl,
      sheets: sheets.map((s) => s.id),
      keys: keys.length,
    })
  );
  return { taskNo: def.taskNo, task_id: taskId, task_url: taskUrl, sheets: sheets.map((s) => s.id) };
}

fs.mkdirSync(OUT_ROOT, { recursive: true });
const defs = resolveBatchDefs();
const plan = {
  generatedAt: new Date().toISOString(),
  source: 'tmp/cefrj-manus/wave1-redo-list.md',
  batch: BATCH || (TASK_FILTER ? `task=${TASK_FILTER}` : 'p0'),
  tasks: defs.map((d) => ({
    taskNo: d.taskNo,
    label: d.label,
    sheetIds: d.sheets,
    themes: d.sheets.map((id) => loadSheetFromWave1(id).theme),
  })),
};
fs.writeFileSync(path.join(OUT_ROOT, 'plan.json'), JSON.stringify(plan, null, 2));
console.log(JSON.stringify({ phase: 'planned', ...plan }, null, 2));

const results = [];
for (const def of defs) {
  results.push(await fireTask(def, defs.length));
}
fs.writeFileSync(
  path.join(OUT_ROOT, 'send-summary.json'),
  JSON.stringify({ at: new Date().toISOString(), send: SEND, dry: DRY, results }, null, 2)
);
console.log(JSON.stringify({ phase: 'done', send: SEND, results }, null, 2));
