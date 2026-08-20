/**
 * Shift60 — commission scrubbed high-confidence queues via Manus.
 *
 * Source: tmp/asset-discovery/scrubbed-queues.json
 *   - all highConfidenceBroad
 *   - all highConfidenceSpecialized
 *   - skip needsReview
 *   - skip hug/kids/parents/circle (already excluded from scrub worthwhile set)
 *
 * Packs into white 3×3 vocab sheets, ≤11 sheets per Manus task (Perfect-11).
 *
 *   node scripts/manus/request-shift60-scrubbed-queues.mjs           # dry-run
 *   node scripts/manus/request-shift60-scrubbed-queues.mjs --send    # spend credits
 *   node scripts/manus/request-shift60-scrubbed-queues.mjs --send --task=1
 *   node scripts/manus/request-shift60-scrubbed-queues.mjs --send --task=2
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

const SKIP = new Set(['hug', 'kids', 'parents', 'circle']);
const SCRUB = path.join(ROOT, 'tmp', 'asset-discovery', 'scrubbed-queues.json');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-scrubbed-queues');
const SHEETS_PER_TASK = 11;
const CELLS = 9;

function labelFor(concept) {
  const c = String(concept || '').trim();
  // Light steer for ambiguous / role / body stills
  const steers = {
    locksmith: 'locksmith key ring and padlock tools (no full face)',
    forehead: 'close-up forehead / brow crop (body part)',
    cavity: 'tooth with dental cavity',
    glaze: 'pottery glaze jar with dripping glaze',
    kiln: 'pottery kiln oven',
    lava: 'bright lava flow',
    stitch: 'fabric stitch / sewing stitch close-up',
    package: 'wrapped package / parcel',
    artifact: 'museum artifact object',
    beacon: 'lighthouse beacon light',
    crater: 'volcano crater',
    'pottery wheel': 'pottery wheel',
    'carry-on': 'carry-on suitcase',
    'smoke detector': 'smoke detector',
    'control tower': 'airport control tower',
    'freight car': 'train freight car',
    'conveyor belt': 'factory conveyor belt',
    'balance scale': 'balance scale',
    'patrol car': 'police patrol car',
    quill: 'writing quill pen',
    vise: 'workshop bench vise',
    mortar: 'kitchen mortar bowl (with pestle optional)',
  };
  if (steers[c]) return steers[c];
  return c;
}

function loadQueue() {
  if (!fs.existsSync(SCRUB)) {
    throw new Error(`Missing ${SCRUB} — run npm run discovery && npm run discovery:scrub`);
  }
  const data = JSON.parse(fs.readFileSync(SCRUB, 'utf8'));
  const broad = (data.highConfidenceBroad || []).filter((r) => !SKIP.has(r.concept));
  const specialized = (data.highConfidenceSpecialized || []).filter(
    (r) => !SKIP.has(r.concept)
  );
  const broadSet = new Set(broad.map((r) => r.concept));
  // Broad first (teaching-value wave), then specialized
  const seen = new Set();
  const combined = [];
  for (const row of [...broad, ...specialized]) {
    const w = String(row.concept || '').trim();
    if (!w || SKIP.has(w) || seen.has(w)) continue;
    seen.add(w);
    combined.push({
      concept: w,
      key: slug(w),
      label: labelFor(w),
      source: row.source || 'discovery',
      broadCategory: row.broadCategory || 'misc',
      queue: broadSet.has(w) ? 'broad' : 'specialized',
      score: row.finalPriorityScore,
    });
  }
  return { broad, specialized, combined, totals: data.totals };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildSheets(combined) {
  // Prefer grouping by category so a sheet stays thematically coherent
  const byCat = new Map();
  for (const row of combined) {
    const cat = row.broadCategory || 'misc';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(row);
  }
  // Flatten categories in stable order: keep overall ranking by walking combined order
  // but fill sheets from same category when possible.
  const remaining = [...combined];
  const sheets = [];
  let sheetIdx = 0;
  while (remaining.length) {
    const seed = remaining[0];
    const same = remaining.filter((r) => r.broadCategory === seed.broadCategory);
    const pick = (same.length >= CELLS ? same : remaining).slice(0, CELLS);
    const pickSet = new Set(pick.map((p) => p.concept));
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (pickSet.has(remaining[i].concept)) remaining.splice(i, 1);
    }
    // Pad last sheet by pulling next remaining (better than empty cells)
    while (pick.length < CELLS && remaining.length) {
      pick.push(remaining.shift());
    }
    sheetIdx += 1;
    const theme = slug(seed.broadCategory || 'mixed').slice(0, 40);
    sheets.push({
      id: `S${sheetIdx}`,
      theme,
      title: String(seed.broadCategory || 'mixed').toUpperCase(),
      cells: pick.map((r) => [r.key, r.label, r.concept, r.queue]),
    });
  }
  return sheets;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${keys}`;
}

function buildBrief(sheets, taskNo, taskCount) {
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS / clear picturable stills only — skip abstracts and logos.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${sheets.length} PNGs.

This is scrubbed-queue task ${taskNo}/${taskCount} (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call).

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
}

function mainDryOrSend() {
  const { combined, totals } = loadQueue();
  const sheets = buildSheets(combined);
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
    source: 'tmp/asset-discovery/scrubbed-queues.json',
    skip: [...SKIP],
    totalsFromScrub: totals,
    combinedCount: combined.length,
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
    })),
  };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(OUT_ROOT, 'all-keys.txt'),
    combined.map((c) => c.key).join('\n') + '\n'
  );

  console.log(
    JSON.stringify(
      {
        phase: 'planned',
        combined: combined.length,
        sheets: sheets.length,
        tasks: tasks.length,
        plan: planPath,
      },
      null,
      2
    )
  );

  return { tasks, combined, plan };
}

async function fireTask(task, taskCount) {
  const outDir = path.join(OUT_ROOT, `task${task.taskNo}`);
  const outJson = path.join(outDir, 'run.json');
  fs.mkdirSync(outDir, { recursive: true });

  if (fs.existsSync(outJson) && SEND && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    if (prev.task_id) {
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
    kind: 'scrubbed-queues',
    taskNo: task.taskNo,
    sheet_count: task.sheets.length,
    keys: task.keys,
    concepts: task.concepts,
    sheets: task.sheets.map((s) => ({
      id: s.id,
      theme: s.theme,
      keys: s.cells.map(([k]) => k),
    })),
  };

  if (DRY) {
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
    title: `ESL white vocab 3×3: Shift60 scrubbed queues task ${task.taskNo}/${taskCount} (${task.sheets.length} sheets)`,
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
