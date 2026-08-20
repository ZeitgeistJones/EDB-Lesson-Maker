/**
 * Shift60 — CEFR-J B1 adjectives via Manus.
 * Source: tmp/cefrj-manus/b1/manus-adjectives-b1.txt
 * Exact-dedupe once with verifiedPackHit immediately before send; no re-filter/rank.
 * White 3×3 still-life sheets; Perfect-11; ≤3 createTask in flight (use --fill-slots).
 * Anti-iconey LOOK.
 *
 *   node scripts/manus/request-shift60-cefrj-adjectives-b1.mjs
 *   node scripts/manus/request-shift60-cefrj-adjectives-b1.mjs --send
 *   node scripts/manus/request-shift60-cefrj-adjectives-b1.mjs --send --fill-slots --done-tasks=1,2
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
const FILL_SLOTS = process.argv.includes('--fill-slots');
const MAX_IN_FLIGHT = Number(
  (process.argv.find((a) => a.startsWith('--maxInFlight=')) || '--maxInFlight=3').slice(14)
);
const DONE_TASKS = (() => {
  const a = process.argv.find((x) => x.startsWith('--done-tasks='));
  if (!a) return new Set();
  return new Set(
    a
      .slice(13)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
  );
})();
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();

const QUEUE_PATH = path.join(ROOT, 'tmp', 'cefrj-manus', 'b1', 'manus-adjectives-b1.txt');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-adjectives-b1');
const CELLS = 9;
const SHEETS_PER_TASK = 11;

/** Light sense steers only — not a shortlist filter. */
const STEERS = {
  back: 'back of a person / rear view still-life (not the verb go-back)',
  blank: 'blank empty paper / whiteboard',
  cool: 'cool sunglasses ice-cube vibe (temperature/style, kid-safe)',
  fair: 'fair scales of justice (not carnival)',
  front: 'front of a house / front door facing camera',
  hard: 'hard rock / hard surface (tough material)',
  kind: 'kind helping hands / heart kindness still-life',
  late: 'clock late / running late scene',
  left: 'left-hand side arrow object (no letters)',
  light: 'lightweight feather vs heavy rock contrast',
  mean: 'mean frowning cartoon face (unkind, not average)',
  right: 'right-hand side arrow object (no letters)',
  'left-hand': 'left hand raised clearly',
  'right-hand': 'right hand raised clearly',
  second: 'silver medal second place',
  third: 'bronze medal third place',
  used: 'used worn-out shoes / secondhand item',
  west: 'compass pointing west',
  east: 'compass pointing east',
  north: 'compass pointing north',
  south: 'compass pointing south',
  raw: 'raw uncooked vegetables still-life',
  fried: 'fried egg / fried food plate',
  boiled: 'boiled egg in cup',
  grilled: 'grilled food on grill grate',
  plastic: 'plastic bottle / plastic toy still-life',
  wooden: 'wooden block / wooden toy',
  silver: 'silver coin / silver trophy',
  golden: 'golden trophy / gold coin',
  online: 'laptop with wifi waves (no readable text/logos)',
  pacific: 'calm ocean pacific waves (not brand)',
};

function loadWhitelist() {
  if (!fs.existsSync(DICT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')).canonicalWhitelist || {};
  } catch {
    return {};
  }
}

function labelFor(word) {
  const c = String(word || '').trim().toLowerCase();
  if (STEERS[c]) return STEERS[c];
  return `${c} — clear picturable kid-safe scene or prop showing this quality`;
}

function loadAndDedupe() {
  if (!fs.existsSync(QUEUE_PATH)) {
    throw new Error(`Missing ${QUEUE_PATH}`);
  }
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const whitelist = loadWhitelist();
  const raw = [];
  const seen = new Set();
  for (const line of fs.readFileSync(QUEUE_PATH, 'utf8').split(/\r?\n/)) {
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
      label: labelFor(row.word),
    });
  }
  return { rawCount: raw.length, kept, dropped };
}

function buildSheets(rows) {
  const sheets = [];
  for (let i = 0; i < rows.length; i += CELLS) {
    const chunk = rows.slice(i, i + CELLS);
    const n = sheets.length + 1;
    sheets.push({
      id: `S${n}`,
      theme: `cefrj-adjectives-b1-${String(n).padStart(2, '0')}`,
      title: `CEFRJ ADJECTIVES B1 ${n}`,
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
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ADJECTIVE sheets. Each cell = one clear picturable QUALITY (kid-safe scene, figure+prop, or concrete still-life that shows the meaning). Skip abstracts / logos / text when a physical prop or scene works.

HARD STYLE: #FFFFFF; even 3×3; ZERO text/logos/numbers/labels on the art; quality: default. Deliver ${n} PNGs.
LOOK: rich ESL kid-illustration cutouts with soft shading and material cues — NOT emoji-flat sticker glyphs, NOT featureless silhouettes, NOT UI symbol metaphors (arrows, broken hearts, browser chrome) when a clear scene or prop works. Anti-iconey: soft depth, colorful objects on pure white — not grey cards / app-icon two-tone sets.

This is CEFR-J B1 adjectives task ${taskNo}/${taskCount} (Shift60; kind cefrj-adjectives-b1). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call — one image call per sheet, all in THIS task).

Filename each PNG with the theme slug in the name (e.g. esl_cefrj_adjectives_b1_sheet_01_cefrj-adjectives-b1-01.png). Prefer one zip of all PNGs plus CDN links in chat.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${n} PNGs + short legends. No essay.`);
}

function planTasks(sheets) {
  return chunk(sheets, SHEETS_PER_TASK).map((sheetGroup, i) => ({
    taskNo: i + 1,
    sheets: sheetGroup,
    keys: sheetGroup.flatMap((s) => s.cells.map((c) => c[0])),
    concepts: sheetGroup.flatMap((s) => s.cells.map((c) => c[2])),
  }));
}

function isAlreadySent(taskNo) {
  const outJson = path.join(OUT_ROOT, `task${taskNo}`, 'run.json');
  if (!fs.existsSync(outJson)) return false;
  try {
    const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    return !!(prev.task_id && !prev.dry_run);
  } catch {
    return false;
  }
}

function selectTasksToFire(tasks) {
  if (TASK_FILTER) return tasks.filter((t) => t.taskNo === TASK_FILTER);
  if (!FILL_SLOTS && !SEND) return tasks;
  if (!FILL_SLOTS) {
    const unsent = tasks.filter((t) => !isAlreadySent(t.taskNo));
    return unsent.slice(0, MAX_IN_FLIGHT);
  }
  const inFlight = tasks.filter(
    (t) => isAlreadySent(t.taskNo) && !DONE_TASKS.has(t.taskNo)
  ).length;
  const slots = Math.max(0, MAX_IN_FLIGHT - inFlight);
  const unsent = tasks.filter((t) => !isAlreadySent(t.taskNo));
  return unsent.slice(0, slots);
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

  const brief = task.frozenBrief || buildBrief(task.sheets, task.taskNo, taskCount);
  const profile = resolveAgentProfile();
  const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
  const dumpBase = {
    started_at: new Date().toISOString(),
    agent_profile: profile,
    force_skills: force,
    quality: 'default',
    shift: 60,
    kind: 'cefrj-adjectives-b1',
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
    title: `ESL white vocab 3×3: Shift60 CEFR-J B1 adjectives t${task.taskNo}/${taskCount} (${task.sheets.length} sheets)`,
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

/**
 * Fill-slots must NEVER re-dedupe/replan — that renumbers themes and orphans
 * already-sent tasks. Load frozen sheets from taskN/run.json or dry-run.json.
 */
function loadFrozenTasksFromDisk() {
  if (!fs.existsSync(OUT_ROOT)) return [];
  const out = [];
  for (const ent of fs.readdirSync(OUT_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || !/^task\d+$/i.test(ent.name)) continue;
    const taskNo = Number(ent.name.replace(/\D/g, ''));
    const runPath = path.join(OUT_ROOT, ent.name, 'run.json');
    const dryPath = path.join(OUT_ROOT, ent.name, 'dry-run.json');
    const src = fs.existsSync(runPath) ? runPath : dryPath;
    if (!fs.existsSync(src)) continue;
    const j = JSON.parse(fs.readFileSync(src, 'utf8'));
    const sheets = (j.sheets || []).map((s) => ({
      id: s.id,
      theme: s.theme,
      title: s.title || s.theme,
      cells: (s.keys || []).map((k) => [k, `${k} — picturable`, k]),
      incomplete: !!s.incomplete,
      _brief: j.brief || null,
      _keys: j.keys || s.keys || [],
      _concepts: j.concepts || [],
    }));
    // Prefer full cells from dry brief dump when present on sheet objects
    const normalized = (j.sheets || []).map((s) => {
      if (Array.isArray(s.cells) && s.cells.length) {
        return {
          id: s.id,
          theme: s.theme,
          title: s.title || s.theme,
          cells: s.cells,
          incomplete: !!s.incomplete,
        };
      }
      const keys = s.keys || [];
      return {
        id: s.id,
        theme: s.theme,
        title: s.title || s.theme,
        cells: keys.map((k) => [k, labelFor(k), k]),
        incomplete: !!s.incomplete,
      };
    });
    out.push({
      taskNo,
      sheets: normalized,
      keys: j.keys || normalized.flatMap((s) => s.cells.map((c) => c[0])),
      concepts: j.concepts || [],
      frozenBrief: j.brief || null,
    });
  }
  return out.sort((a, b) => a.taskNo - b.taskNo);
}

let rawCount;
let kept;
let dropped;
let sheets;
let tasks;

if (FILL_SLOTS) {
  tasks = loadFrozenTasksFromDisk();
  rawCount = tasks.reduce((a, t) => a + t.keys.length, 0);
  kept = tasks.flatMap((t) => t.keys.map((k) => ({ key: k, word: k })));
  dropped = [];
  sheets = tasks.flatMap((t) => t.sheets);
  console.log(
    JSON.stringify({
      phase: 'frozen-plan',
      tasks: tasks.length,
      keys: rawCount,
      taskNos: tasks.map((t) => t.taskNo),
    })
  );
} else {
  ({ rawCount, kept, dropped } = loadAndDedupe());
  sheets = buildSheets(kept);
  tasks = planTasks(sheets);

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_ROOT, 'dedupe-dropped.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        source: 'tmp/cefrj-manus/b1/manus-adjectives-b1.txt',
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
        kind: 'cefrj-adjectives-b1',
        source: 'tmp/cefrj-manus/b1/manus-adjectives-b1.txt',
        frozen: true,
        rawCount,
        adjKeyCount: kept.length,
        dedupeDropped: dropped.length,
        sheetCount: sheets.length,
        taskCount: tasks.length,
        sheetsPerTask: SHEETS_PER_TASK,
        maxInFlight: MAX_IN_FLIGHT,
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
}

const selected = selectTasksToFire(tasks);
if (!selected.length) {
  console.log(
    JSON.stringify({
      phase: SEND ? 'nothing-to-send' : 'dry-planned-only',
      reason: FILL_SLOTS ? 'slots-full-or-all-sent' : 'no-tasks',
      doneTasks: [...DONE_TASKS],
    })
  );
  process.exit(0);
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
      fillSlots: FILL_SLOTS,
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
      dedupeDropped: dropped.length,
      results,
    },
    null,
    2
  )
);
