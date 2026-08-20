/**
 * Shift60 — CEFR-J verbs wave2 PRIMARY (Group1) via Manus.
 * Source: tmp/cefrj-manus/manus-verbs-wave2-primary.txt (kept168 + approved60).
 * Exact-dedupe once with verifiedPackHit immediately before send; no re-filter/rank.
 * White 3×3 action-verb sheets; Perfect-11 (≤11 sheets/task); ≤3 createTask in flight.
 * Import as picturable-verbs wave=11.
 *
 *   node scripts/manus/request-shift60-cefrj-verbs-wave2-primary.mjs           # dry-run
 *   node scripts/manus/request-shift60-cefrj-verbs-wave2-primary.mjs --send
 *   node scripts/manus/request-shift60-cefrj-verbs-wave2-primary.mjs --send --task=1
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
import { normalize, slug, verifiedPackHit } from '../lib/pack-exact-match.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();

const PRIMARY_PATH = path.join(ROOT, 'tmp', 'cefrj-manus', 'manus-verbs-wave2-primary.txt');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave11');
const CELLS = 9;
const SHEETS_PER_TASK = 11;
const MAX_TASKS = 3;
const WAVE = 11;
/** Continue theme numbering after wave1 sheets cefrj-verbs-01..04 */
const THEME_START = 5;

function loadWhitelist() {
  if (!fs.existsSync(DICT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')).canonicalWhitelist || {};
  } catch {
    return {};
  }
}

/**
 * Read primary queue in order. Exact-dedupe vs current pack only — drop verified hits.
 * No re-filter / re-rank / SKIP list.
 */
function loadAndDedupe() {
  if (!fs.existsSync(PRIMARY_PATH)) {
    throw new Error(`Missing ${PRIMARY_PATH}`);
  }
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const whitelist = loadWhitelist();
  const raw = [];
  const seen = new Set();
  for (const line of fs.readFileSync(PRIMARY_PATH, 'utf8').split(/\r?\n/)) {
    const w = normalize(line);
    if (!w) continue;
    const key = slug(w);
    if (seen.has(key)) continue;
    seen.add(key);
    raw.push({ word: w, key });
  }

  const kept = [];
  const dropped = [];
  for (const row of raw) {
    const hit = verifiedPackHit(index, row.word, whitelist);
    if (hit?.verified) {
      dropped.push({ word: row.word, key: hit.key, file: hit.file });
      continue;
    }
    kept.push({
      key: row.key,
      concept: row.word,
      label: `${row.word} action — kid-friendly figure and/or hands+object`,
    });
  }
  return { rawCount: raw.length, kept, dropped };
}

function buildSheets(rows) {
  const sheets = [];
  for (let i = 0; i < rows.length; i += CELLS) {
    const chunk = rows.slice(i, i + CELLS);
    const n = THEME_START + sheets.length;
    sheets.push({
      id: `S${sheets.length + 1}`,
      theme: `cefrj-verbs-${String(n).padStart(2, '0')}`,
      title: `CEFRJ VERBS ${n}`,
      cells: chunk.map((c) => [c.key, c.label, c.concept]),
      incomplete: chunk.length < CELLS,
    });
  }
  return sheets;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const incompleteNote =
    sheet.cells.length < CELLS
      ? `\nINCOMPLETE SHEET: only cells 1-${sheet.cells.length} have icons. Leave cells ${sheet.cells.length + 1}-${CELLS} blank white empty (no icons, no fillers, no duplicates).`
      : '';
  return `SHEET ${index} — ${sheet.title} (${sheet.theme}):\n${lines.join('\n')}\nKeys: ${sheet.cells.map(([k]) => k).join(',')}${incompleteNote}`;
}

function buildBrief(sheets, taskNo, taskCount) {
  const n = sheets.length;
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ACTION VERB sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3×3; ZERO text/logos/numbers/labels on the art; quality: default. Deliver ${n} PNGs.
LOOK: rich ESL kid-illustration cutouts with soft shading — NOT emoji-flat sticker glyphs, NOT featureless silhouettes, NOT UI symbol metaphors when a clear action scene or prop works.

This is CEFR-J A1/A2 verbs wave2 primary Group1 task ${taskNo}/${taskCount} (Shift60; import wave ${WAVE}). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call — one image call per sheet, all in THIS task).

Filename each PNG with the theme slug in the name (e.g. esl_cefrj_verbs_sheet_05_cefrj-verbs-05.png). Prefer one zip of all PNGs plus CDN links in chat.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${n} PNGs + short legends. No essay.`);
}

function planTasks(sheets) {
  const groups = chunk(sheets, SHEETS_PER_TASK);
  if (groups.length > MAX_TASKS) {
    throw new Error(
      `Need ${groups.length} tasks but MAX_TASKS=${MAX_TASKS} (sheets=${sheets.length}). Split or raise cap.`
    );
  }
  return groups.map((sheetGroup, i) => ({
    taskNo: i + 1,
    sheets: sheetGroup,
    keys: sheetGroup.flatMap((s) => s.cells.map((c) => c[0])),
    concepts: sheetGroup.flatMap((s) => s.cells.map((c) => c[2])),
  }));
}

async function fireTask(task, taskCount, meta) {
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
    kind: 'cefrj-verbs-wave2-primary',
    importWave: WAVE,
    taskNo: task.taskNo,
    sheet_count: task.sheets.length,
    keys: task.keys,
    concepts: task.concepts,
    dedupeDropped: meta.droppedCount,
    sheets: task.sheets.map((s) => ({
      id: s.id,
      theme: s.theme,
      title: s.title,
      keys: s.cells.map(([k]) => k),
      incomplete: !!s.incomplete,
    })),
  };

  if (DRY) {
    const dryPath = path.join(outDir, 'dry-run.json');
    fs.writeFileSync(dryPath, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
    console.log(
      JSON.stringify({
        phase: 'dry-run',
        taskNo: task.taskNo,
        sheets: task.sheets.length,
        keys: task.keys.length,
        themes: task.sheets.map((s) => s.theme),
        dryPath,
      })
    );
    return { dry_run: true, taskNo: task.taskNo, keys: task.keys.length, sheets: task.sheets.length };
  }

  apiKey();
  const created = await createTask({
    title: `ESL white vocab 3×3: Shift60 CEFR-J verbs wave2 primary t${task.taskNo}/${taskCount} (${task.sheets.length} sheets)`,
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
      themes: task.sheets.map((s) => s.theme),
    })
  );
  return {
    taskNo: task.taskNo,
    task_id: taskId,
    task_url: taskUrl,
    keys: task.keys.length,
    sheets: task.sheets.length,
  };
}

const { rawCount, kept, dropped } = loadAndDedupe();
const sheets = buildSheets(kept);
const tasks = planTasks(sheets);

fs.mkdirSync(OUT_ROOT, { recursive: true });
fs.writeFileSync(
  path.join(OUT_ROOT, 'dedupe-dropped.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      source: 'tmp/cefrj-manus/manus-verbs-wave2-primary.txt',
      rawCount,
      keptCount: kept.length,
      droppedCount: dropped.length,
      dropped,
    },
    null,
    2
  ) + '\n'
);
fs.writeFileSync(
  path.join(OUT_ROOT, 'plan.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      kind: 'cefrj-verbs-wave2-primary',
      importWave: WAVE,
      source: 'tmp/cefrj-manus/manus-verbs-wave2-primary.txt',
      rawCount,
      verbKeyCount: kept.length,
      dedupeDropped: dropped.length,
      sheetCount: sheets.length,
      taskCount: tasks.length,
      sheetsPerTask: SHEETS_PER_TASK,
      maxTasks: MAX_TASKS,
      tasks: tasks.map((t) => ({
        taskNo: t.taskNo,
        sheetCount: t.sheets.length,
        keyCount: t.keys.length,
        keys: t.keys,
        themes: t.sheets.map((s) => s.theme),
      })),
    },
    null,
    2
  ) + '\n'
);
fs.writeFileSync(
  path.join(OUT_ROOT, 'all-keys.txt'),
  kept.map((r) => r.key).join('\n') + '\n'
);

console.log(
  JSON.stringify(
    {
      phase: 'planned',
      rawCount,
      kept: kept.length,
      dedupeDropped: dropped.length,
      sheets: sheets.length,
      tasks: tasks.length,
      taskSheetCounts: tasks.map((t) => t.sheets.length),
    },
    null,
    2
  )
);

const selected = TASK_FILTER ? tasks.filter((t) => t.taskNo === TASK_FILTER) : tasks;
if (!selected.length) {
  console.error('No tasks to run');
  process.exit(1);
}
if (selected.length > MAX_TASKS) {
  console.error(`Refusing: ${selected.length} tasks exceeds in-flight cap ${MAX_TASKS}`);
  process.exit(2);
}

const results = [];
for (const task of selected) {
  results.push(await fireTask(task, tasks.length, { droppedCount: dropped.length }));
}

fs.writeFileSync(
  path.join(OUT_ROOT, SEND ? 'send-summary.json' : 'dry-summary.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      send: SEND,
      importWave: WAVE,
      rawCount,
      kept: kept.length,
      dedupeDropped: dropped.length,
      results,
    },
    null,
    2
  ) + '\n'
);
console.log(
  JSON.stringify(
    {
      phase: SEND ? 'sent' : 'dry-done',
      importWave: WAVE,
      dedupeDropped: dropped.length,
      results,
    },
    null,
    2
  )
);
