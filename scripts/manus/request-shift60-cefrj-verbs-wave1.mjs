/**
 * Shift60 — CEFR-J A1/A2 verbs wave1 (human-approved 32) via Manus.
 * White 3×3 action-verb sheets; last sheet may be incomplete (5 cells).
 * Import as picturable-verbs wave=10.
 *
 * STYLE (future sends): kid-illustration action cutouts with props/context — not emoji-flat
 * sticker glyphs. See tmp/cefrj-manus/wave1-redo-list.md Quality redo (iconey).
 *
 *   node scripts/manus/request-shift60-cefrj-verbs-wave1.mjs           # dry-run
 *   node scripts/manus/request-shift60-cefrj-verbs-wave1.mjs --send
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

const SKIP = new Set([
  'hug',
  'kids',
  'parents',
  'circle',
  'cuddle',
  'embrace',
  'snuggle',
  'kiss',
  'undress',
  'spit',
]);

const APPROVED_PATH = path.join(
  ROOT,
  'tmp',
  'cefrj-manus',
  'manus-verbs-wave1-approved.txt'
);
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave10');
const CELLS = 9;
const WAVE = 10;

/** Kid-safe action steers for the 32 approved verbs. */
const LABELS = {
  add: 'kid adding blocks / stacking more toys',
  beg: 'kid begging with clasped hands (polite ask, not scary)',
  chat: 'two kids chatting face to face',
  check: 'kid checking a checklist with a pencil',
  create: 'kid creating art with crayons',
  disappear: 'figure disappearing behind a curtain / vanishing puff',
  divide: 'kid dividing a pizza into slices',
  exercise: 'kid doing jumping-jack exercise',
  finish: 'kid finishing a race at finish line',
  frighten: 'friendly ghost playfully frightening (mild, cartoon)',
  graduate: 'kid in graduation cap receiving diploma',
  grow: 'plant growing taller in a pot',
  help: 'kid helping carry a box',
  hurry: 'kid hurrying / running with backpack',
  invent: 'kid inventing with lightbulb and tools',
  marry: 'wedding rings / cake topper couple (kid-safe, clothed)',
  move: 'family moving boxes into a house',
  offer: 'kid offering a gift box to a friend',
  perform: 'kid performing on a stage with mic',
  play: 'kids playing with a ball',
  pollute: 'factory smoke polluting sky (clear cause/effect icon)',
  pray: 'figure praying with folded hands (respectful, simple)',
  prepare: 'kid preparing ingredients on a kitchen counter',
  pretend: 'kid pretending with a toy crown / dress-up',
  receive: 'kid receiving a wrapped present',
  relax: 'kid relaxing in a hammock',
  shut: 'hand shutting a door',
  spell: 'kid spelling with letter blocks (blocks blank/no readable word)',
  step: 'kid stepping up stairs',
  sweat: 'kid sweating after sports with water bottle',
  wander: 'kid wandering on a path exploring',
  work: 'kid working at a desk with papers',
};

function loadVerbs() {
  if (!fs.existsSync(APPROVED_PATH)) {
    throw new Error(`Missing ${APPROVED_PATH}`);
  }
  const rows = [];
  const seen = new Set();
  for (const line of fs.readFileSync(APPROVED_PATH, 'utf8').split(/\r?\n/)) {
    const w = line.trim().toLowerCase();
    if (!w || SKIP.has(w)) continue;
    const key = slug(w);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      key,
      concept: w,
      label: LABELS[w] || `${w} action`,
    });
  }
  return rows;
}

function buildSheets(rows) {
  const sheets = [];
  for (let i = 0; i < rows.length; i += CELLS) {
    const chunk = rows.slice(i, i + CELLS);
    const n = sheets.length + 1;
    sheets.push({
      id: `S${n}`,
      theme: `cefrj-verbs-${String(n).padStart(2, '0')}`,
      title: `CEFRJ VERBS ${n}`,
      cells: chunk.map((c) => [c.key, c.label, c.concept]),
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
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${sheet.cells.map(([k]) => k).join(',')}${incompleteNote}`;
}

function buildBrief(sheets) {
  const n = sheets.length;
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ACTION VERB sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3×3; ZERO text/logos/numbers/labels on the art; quality: default. Deliver ${n} PNGs.
LOOK: rich ESL kid-illustration cutouts with soft shading — NOT emoji-flat sticker glyphs, NOT featureless silhouettes, NOT UI symbol metaphors when a clear action scene or prop works.

This is CEFR-J A1/A2 verbs wave1 (Shift60; import wave ${WAVE}). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call).

Filename each PNG with the theme slug in the name (e.g. esl_cefrj_verbs_sheet_01_cefrj-verbs-01.png). Prefer one zip of all PNGs plus CDN links in chat.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${n} PNGs + short legends. No essay.`);
}

const rows = loadVerbs();
const sheets = buildSheets(rows);
fs.mkdirSync(OUT_ROOT, { recursive: true });
const keys = sheets.flatMap((s) => s.cells.map((c) => c[0]));
const concepts = sheets.flatMap((s) => s.cells.map((c) => c[2]));
fs.writeFileSync(
  path.join(OUT_ROOT, 'plan.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      kind: 'cefrj-verbs-wave1',
      importWave: WAVE,
      source: 'tmp/cefrj-manus/manus-verbs-wave1-approved.txt',
      verbKeyCount: rows.length,
      sheetCount: sheets.length,
      keys,
      incompleteSheets: sheets.filter((s) => s.incomplete).map((s) => ({
        id: s.id,
        cells: s.cells.length,
      })),
    },
    null,
    2
  )
);
fs.writeFileSync(path.join(OUT_ROOT, 'all-keys.txt'), keys.join('\n') + '\n');
console.log(
  JSON.stringify({ phase: 'planned', verbs: rows.length, sheets: sheets.length }, null, 2)
);

const outJson = path.join(OUT_ROOT, 'task1', 'run.json');
fs.mkdirSync(path.dirname(outJson), { recursive: true });
const brief = buildBrief(sheets);
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  shift: 60,
  kind: 'cefrj-verbs-wave1',
  importWave: WAVE,
  sheet_count: sheets.length,
  keys,
  concepts,
  sheets: sheets.map((s) => ({
    id: s.id,
    theme: s.theme,
    title: s.title,
    keys: s.cells.map((c) => c[0]),
    incomplete: !!s.incomplete,
  })),
};

if (!sheets.length) {
  fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, empty: true }, null, 2));
  console.log(JSON.stringify({ phase: 'empty' }));
  process.exit(0);
}

if (DRY) {
  // Never overwrite a real send's run.json (wipes task_id).
  if (fs.existsSync(outJson)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
      if (prev.task_id && !prev.dry_run) {
        const dryPath = path.join(OUT_ROOT, 'dry-run.json');
        fs.writeFileSync(dryPath, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
        console.log(
          JSON.stringify({
            phase: 'dry-run',
            sheets: sheets.length,
            keys: keys.length,
            themes: sheets.map((s) => s.theme),
            preserved_run: outJson,
            dryPath,
          })
        );
        process.exit(0);
      }
    } catch {
      /* fall through */
    }
  }
  fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
  console.log(
    JSON.stringify({
      phase: 'dry-run',
      sheets: sheets.length,
      keys: keys.length,
      themes: sheets.map((s) => s.theme),
      lastSheetCells: sheets[sheets.length - 1].cells.length,
    })
  );
  process.exit(0);
}

if (fs.existsSync(outJson) && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  if (prev.task_id && !prev.dry_run) {
    console.error('REFUSING already sent', prev.task_id);
    process.exit(2);
  }
}

apiKey();
const created = await createTask({
  title: `ESL white vocab 3×3: Shift60 CEFR-J A1/A2 verbs wave1 (${sheets.length} sheets)`,
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
fs.writeFileSync(
  path.join(OUT_ROOT, 'send-summary.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      task_id: taskId,
      task_url: taskUrl,
      keys: keys.length,
      sheets: sheets.length,
      importWave: WAVE,
    },
    null,
    2
  )
);
console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: taskUrl,
      keys: keys.length,
      sheets: sheets.length,
      importWave: WAVE,
    },
    null,
    2
  )
);
