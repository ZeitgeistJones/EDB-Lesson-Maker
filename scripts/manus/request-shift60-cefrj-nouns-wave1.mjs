/**
 * Shift60 — CEFR-J A1/A2 nouns wave1 via Manus (white 3×3, Perfect-11).
 *
 * Source: tmp/cefrj-manus/manus-nouns-a1-a2.txt (commission all; policy skips only)
 * Packs into white 3×3 vocab sheets, ≤11 sheets per Manus task.
 *
 * STYLE (future sends): concrete still-life / kid-illustration cutouts — soft shading,
 * material cues. Avoid emoji-flat UI glyphs, mono silhouettes on grey cards, app-icon sets.
 * Wave1 blast produced many "iconey" sheets — see tmp/cefrj-manus/wave1-redo-list.md.
 *
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1.mjs           # dry-run
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1.mjs --send
 *   node scripts/manus/request-shift60-cefrj-nouns-wave1.mjs --send --task=1
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
import { slug } from '../lib/pack-exact-match.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();

const SKIP = new Set([
  'hug',
  'kids',
  'parents',
  'circle',
  'kiss',
  'undress',
  'spit',
  'cuddle',
  'embrace',
  'snuggle',
]);
const NOUNS_PATH = path.join(ROOT, 'tmp', 'cefrj-manus', 'manus-nouns-a1-a2.txt');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-nouns-wave1');
const SHEETS_PER_TASK = 11;
const CELLS = 9;

/** Light steers for ambiguous / multi-word nouns. */
const STEERS = {
  address: 'street address on envelope / mailbox (no readable text)',
  album: 'photo album book',
  band: 'music band instruments cluster (no faces)',
  bar: 'cafe bar counter',
  birth: 'newborn baby blanket / birth celebration cake topper still-life',
  bottom: 'bottom of a bottle / jar base',
  boy: 'simple kid-boy figure (full body, not face close-up)',
  boyfriend: 'two simple figures holding hands (kid-safe, clothed)',
  cd: 'compact disc',
  'cd player': 'portable CD player',
  child: 'simple child figure',
  classmate: 'two school kids with backpacks',
  coke: 'cola soda can (no brand logo/text)',
  corner: 'room corner with walls meeting',
  daughter: 'simple girl child figure',
  day: 'sunny day sky with sun',
  'dining room': 'dining room table and chairs',
  dream: 'sleeping figure with dream bubble (object props inside, no text)',
  driver: 'car driver hands on wheel (no full face)',
  dvd: 'DVD disc',
  email: 'email envelope with @ mark stylized (no readable words)',
  event: 'event ticket stub still-life (blank)',
  favorite: 'gold star favorite badge (no text)',
  fever: 'thermometer showing fever',
  fight: 'boxing gloves still-life (no violence scene)',
  finish: 'finish-line ribbon / checkered flag',
  flat: 'apartment flat building exterior',
  foreigner: 'passport and suitcase traveler still-life',
  ghost: 'friendly cartoon ghost',
  grade: 'school report card blank',
  guy: 'simple boy/young man figure',
  habit: 'toothbrush habit still-life',
  homework: 'homework notebook and pencil',
  husband: 'simple adult man figure',
  interest: 'hobby interest icons cluster',
  kid: 'simple kid figure',
  kind: 'kindness heart + helping hands still-life',
  last: 'last piece of puzzle',
  left: 'left arrow direction (icon only, no letters)',
  life: 'plant growing / life cycle seed-to-sprout',
  line: 'queue line of people silhouettes',
  living: 'living room sofa and lamp',
  'living room': 'living room sofa and lamp',
  man: 'simple adult man figure',
  mean: 'mean face emoji-style (cartoon, not scary)',
  middle: 'middle seat in a row of chairs',
  mind: 'brain icon',
  minute: 'clock face showing minutes',
  moment: 'camera shutter / snapshot moment',
  month: 'calendar page (blank, no numbers readable)',
  morning: 'sunrise morning scene',
  movie: 'movie clapperboard',
  nature: 'nature trees and mountain',
  news: 'newspaper (blank columns, no readable text)',
  night: 'night sky with moon',
  noise: 'speaker with sound waves',
  north: 'compass pointing north',
  opinion: 'thought bubble with question mark object',
  order: 'restaurant order ticket blank',
  own: 'house with sold key (ownership)',
  parent: 'simple parent figure with child (side view)',
  part: 'puzzle piece',
  past: 'hourglass / past clock',
  people: 'group of simple people figures',
  person: 'simple person figure',
  place: 'map pin location marker',
  plan: 'blueprint plan paper (blank)',
  point: 'pointing finger hand',
  problem: 'tangled knot problem icon',
  program: 'TV remote / program guide blank',
  question: 'question mark icon object',
  reason: 'lightbulb reason idea',
  rest: 'pillow rest / nap',
  right: 'right arrow direction (icon only)',
  room: 'empty room interior',
  rule: 'ruler measuring stick (not rule-text)',
  same: 'two identical matching objects',
  second: 'stopwatch second hand',
  side: 'side of a box',
  sign: 'blank street sign post (no letters)',
  something: 'mystery gift box',
  sound: 'musical note sound waves',
  south: 'compass pointing south',
  space: 'outer space planet and stars',
  state: 'US state outline map abstract',
  story: 'storybook open',
  stuff: 'stuffed toy pile',
  subject: 'school subject books stack',
  success: 'trophy success',
  system: 'gears system',
  thing: 'assorted small things pile',
  thought: 'thought bubble cloud',
  time: 'wall clock',
  today: 'calendar today page blank',
  top: 'mountain top / summit',
  trouble: 'warning cone trouble',
  turn: 'turn signal arrow / rotating arrow',
  type: 'keyboard typing hands',
  use: 'tool in use (hammer hitting nail)',
  view: 'scenic viewpoint binoculars',
  way: 'forked path / road way',
  week: 'calendar week strip blank',
  west: 'compass pointing west',
  wife: 'simple adult woman figure',
  woman: 'simple adult woman figure',
  word: 'alphabet letter blocks (no readable word)',
  world: 'globe world',
  year: 'calendar year blank',
};

function labelFor(concept) {
  const c = String(concept || '').trim().toLowerCase();
  if (STEERS[c]) return STEERS[c];
  return c;
}

function loadNouns() {
  if (!fs.existsSync(NOUNS_PATH)) {
    throw new Error(`Missing ${NOUNS_PATH}`);
  }
  const seen = new Set();
  const skipped = [];
  const rows = [];
  for (const line of fs.readFileSync(NOUNS_PATH, 'utf8').split(/\r?\n/)) {
    const w = line.trim().toLowerCase();
    if (!w) continue;
    if (SKIP.has(w)) {
      skipped.push(w);
      continue;
    }
    const key = slug(w);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ concept: w, key, label: labelFor(w) });
  }
  return { rows, skipped };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildSheets(rows) {
  const sheets = [];
  for (let i = 0; i < rows.length; i += CELLS) {
    const pick = rows.slice(i, i + CELLS);
    const sheetIdx = sheets.length + 1;
    sheets.push({
      id: `S${sheetIdx}`,
      theme: `cefrj-nouns-${String(sheetIdx).padStart(2, '0')}`,
      title: `CEFRJ NOUNS ${sheetIdx}`,
      cells: pick.map((r) => [r.key, r.label, r.concept]),
      incomplete: pick.length < CELLS,
    });
  }
  return sheets;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  const incompleteNote =
    sheet.cells.length < CELLS
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length} have icons. Leave cells ${sheet.cells.length + 1}-${CELLS} blank white empty (no icons, no fillers, no duplicates).`
      : '';
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${keys}${incompleteNote}`;
}

function buildBrief(sheets, taskNo, taskCount) {
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life sheets. OBJECTS / clear picturable stills only — skip abstracts and logos when a concrete prop exists; for abstract nouns use a clear kid-safe prop still-life (not a UI symbol).

HARD STYLE: #FFFFFF; even 3×3; ZERO text/logos/numbers/labels on the art; quality: default. Deliver ${sheets.length} PNGs.
LOOK: rich ESL still-life / kid-illustration cutouts with soft shading and material cues. NOT emoji-flat icons, NOT monochrome silhouettes on grey cards, NOT generic app-icon two-tone sets, NOT symbolic UI metaphors (arrows, broken hearts, browser chrome) when a physical prop exists.

This is CEFR-J A1/A2 nouns wave1 task ${taskNo}/${taskCount} (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call — one image call per sheet, all in this task).

Filename each PNG with the theme slug (e.g. esl_cefrj_nouns_sheet_01_cefrj-nouns-01.png). Prefer delivering all PNGs in one zip plus CDN links in the chat.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
}

function mainDryOrSend() {
  const { rows, skipped } = loadNouns();
  const sheets = buildSheets(rows);
  const tasks = chunk(sheets, SHEETS_PER_TASK).map((sheetGroup, i) => ({
    taskNo: i + 1,
    sheets: sheetGroup,
    keys: sheetGroup.flatMap((s) => s.cells.map((c) => c[0])),
    concepts: sheetGroup.flatMap((s) => s.cells.map((c) => c[2])),
  }));

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const planPath = path.join(OUT_ROOT, 'plan.json');
  const plan = {
    generatedAt: new Date().toISOString(),
    source: 'tmp/cefrj-manus/manus-nouns-a1-a2.txt',
    skip: [...SKIP],
    skipped,
    combinedCount: rows.length,
    sheetCount: sheets.length,
    taskCount: tasks.length,
    sheetsPerTask: SHEETS_PER_TASK,
    cellsPerSheet: CELLS,
    tasks: tasks.map((t) => ({
      taskNo: t.taskNo,
      sheetCount: t.sheets.length,
      keyCount: t.keys.length,
      keys: t.keys,
      themes: t.sheets.map((s) => s.theme),
      incompleteSheets: t.sheets.filter((s) => s.incomplete).map((s) => s.id),
    })),
  };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(OUT_ROOT, 'all-keys.txt'),
    rows.map((c) => c.key).join('\n') + '\n'
  );

  console.log(
    JSON.stringify(
      {
        phase: 'planned',
        combined: rows.length,
        skipped,
        sheets: sheets.length,
        tasks: tasks.length,
        plan: planPath,
      },
      null,
      2
    )
  );

  return { tasks, rows, plan };
}

async function fireTask(task, taskCount) {
  const outDir = path.join(OUT_ROOT, `task${task.taskNo}`);
  const outJson = path.join(outDir, 'run.json');
  fs.mkdirSync(outDir, { recursive: true });

  if (fs.existsSync(outJson) && SEND && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    if (prev.task_id && !prev.dry_run) {
      console.error(`REFUSING task${task.taskNo} already sent:`, prev.task_id);
      return { skipped: true, task_id: prev.task_id, taskNo: task.taskNo };
    }
  }

  const brief = buildBrief(task.sheets, task.taskNo, taskCount);
  const profile = resolveAgentProfile();
  const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
  const dumpBase = {
    started_at: new Date().toISOString(),
    agent_profile: profile,
    force_skills: force,
    quality: 'default',
    shift: 60,
    kind: 'cefrj-nouns-wave1',
    taskNo: task.taskNo,
    sheet_count: task.sheets.length,
    keys: task.keys,
    concepts: task.concepts,
    sheets: task.sheets.map((s) => ({
      id: s.id,
      theme: s.theme,
      title: s.title,
      keys: s.cells.map(([k]) => k),
      incomplete: !!s.incomplete,
    })),
  };

  if (DRY) {
    // Never overwrite a real send's run.json (wipes task_id).
    const dryPath = path.join(outDir, 'dry-run.json');
    if (fs.existsSync(outJson)) {
      try {
        const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
        if (prev.task_id && !prev.dry_run) {
          fs.writeFileSync(
            dryPath,
            JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2)
          );
          console.log(
            JSON.stringify({
              phase: 'dry-run',
              taskNo: task.taskNo,
              sheets: task.sheets.length,
              keys: task.keys.length,
              preserved_run: outJson,
              dryPath,
            })
          );
          return { dry_run: true, taskNo: task.taskNo, preserved: true };
        }
      } catch {
        /* fall through */
      }
    }
    fs.writeFileSync(
      outJson,
      JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2)
    );
    console.log(
      JSON.stringify({
        phase: 'dry-run',
        taskNo: task.taskNo,
        sheets: task.sheets.length,
        keys: task.keys.length,
      })
    );
    return { dry_run: true, taskNo: task.taskNo };
  }

  apiKey();
  const created = await createTask({
    title: `ESL white vocab 3×3: Shift60 CEFR-J A1/A2 nouns wave1 task ${task.taskNo}/${taskCount}`,
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
      taskNo: task.taskNo,
      task_id: taskId,
      task_url: taskUrl,
      sheets: task.sheets.length,
      keys: task.keys.length,
    })
  );
  return { taskNo: task.taskNo, task_id: taskId, task_url: taskUrl };
}

const { tasks } = mainDryOrSend();
const selected = TASK_FILTER
  ? tasks.filter((t) => t.taskNo === TASK_FILTER)
  : tasks;

if (!selected.length) {
  console.error('No tasks selected');
  process.exit(1);
}

const results = [];
for (const t of selected) {
  results.push(await fireTask(t, tasks.length));
}
fs.writeFileSync(
  path.join(OUT_ROOT, 'send-summary.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      send: SEND,
      dry: DRY,
      results,
    },
    null,
    2
  )
);
console.log(JSON.stringify({ phase: 'done', send: SEND, results }, null, 2));
