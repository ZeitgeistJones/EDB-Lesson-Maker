/**
 * Shift60 — picturable ESL ACTION VERBS wave1 (white 3×3, Perfect-11).
 * Pack-exact missing only; skip abstracts + hug/kids/parents/circle.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave1.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave1.mjs --send    # spend credits
 *   node scripts/manus/request-shift60-picturable-verbs-wave1.mjs --send --task=1
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
import { exactPackHit, isCanonical, slug } from '../lib/pack-exact-match.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();

const SKIP = new Set(['hug', 'kids', 'parents', 'circle']);
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave1');
const SHEETS_PER_TASK = 11;
const CELLS = 9;

/**
 * High-value kid→intermediate picturable ACTION verbs, themed sheets.
 * Labels steer Manus to a clear single action still (not abstract icons).
 */
const SHEET_DEFS = [
  {
    title: 'MOVE / BODY',
    cells: [
      ['hop', 'kid hopping on one foot'],
      ['skip', 'kid skipping happily'],
      ['crawl', 'kid crawling on hands and knees'],
      ['fall', 'kid falling / tumbling (soft, not scary)'],
      ['stand', 'kid standing up straight'],
      ['sit', 'kid sitting on a chair'],
      ['bend', 'kid bending to touch toes'],
      ['reach', 'kid reaching arm up high'],
      ['spin', 'kid spinning / twirling'],
    ],
  },
  {
    title: 'GESTURES',
    cells: [
      ['point', 'hand pointing with finger'],
      ['nod', 'head nodding yes'],
      ['shake', 'hands shaking / shaking an object'],
      ['turn', 'kid turning around'],
      ['twist', 'hands twisting a jar lid'],
      ['clap', 'hands clapping'],
      ['wave', 'hand waving hello'], // may already exist — filtered at runtime
      ['squeeze', 'hand squeezing a sponge'],
      ['pinch', 'fingers pinching'],
    ],
  },
  {
    title: 'HANDS / FORCE',
    cells: [
      ['carry', 'kid carrying a box'],
      ['hold', 'hands holding a ball'],
      ['drop', 'hand dropping a ball'],
      ['grab', 'hand grabbing an apple'],
      ['catch', 'hands catching a ball'],
      ['throw', 'kid throwing a ball'],
      ['kick', 'foot kicking a soccer ball'],
      ['hit', 'hand hitting a drum'],
      ['knock', 'hand knocking on a door'],
    ],
  },
  {
    title: 'PUSH PULL OPEN',
    cells: [
      ['push', 'hands pushing a door'],
      ['pull', 'hands pulling a rope'],
      ['lift', 'kid lifting a box'],
      ['open', 'hands opening a box lid'],
      ['close', 'hands closing a box lid'],
      ['unlock', 'key unlocking a padlock'],
      ['zip', 'hand zipping a zipper'],
      ['unzip', 'hand unzipping a zipper'],
      ['fold', 'hands folding a shirt'],
    ],
  },
  {
    title: 'FIND HIDE BUILD',
    cells: [
      ['show', 'hand showing a toy'],
      ['hide', 'kid hiding behind a curtain'],
      ['find', 'kid finding a coin'],
      ['share', 'two kids sharing cookies'],
      ['break', 'broken cookie snapping'],
      ['fix', 'hands fixing a toy with screwdriver'],
      ['build', 'kid building with blocks'],
      ['draw', 'hand drawing with crayon'],
      ['count', 'fingers counting to three'],
    ],
  },
  {
    title: 'CUT PACK MIX',
    cells: [
      ['cut', 'scissors cutting paper'],
      ['tear', 'hands tearing paper'],
      ['pack', 'hands packing a suitcase'],
      ['unpack', 'hands unpacking a suitcase'],
      ['mix', 'spoon mixing in a bowl'],
      ['pour', 'pouring juice into a glass'],
      ['fill', 'filling a cup with water'],
      ['spill', 'spilling milk from a cup'],
      ['wipe', 'hand wiping a table'],
    ],
  },
  {
    title: 'CLEAN WASH',
    cells: [
      ['wash', 'hands washing under faucet'],
      ['dry', 'hands drying with a towel'],
      ['rinse', 'rinsing a plate under water'],
      ['scrub', 'scrubbing a pan'],
      ['sweep', 'broom sweeping floor'],
      ['dust', 'dusting a shelf with cloth'],
      ['polish', 'polishing a shoe'],
      ['sort', 'sorting colored blocks into piles'],
      ['stack', 'stacking cups'],
    ],
  },
  {
    title: 'CRAFT COOK',
    cells: [
      ['hang', 'hanging a coat on a hook'],
      ['sew', 'needle sewing fabric'],
      ['knit', 'knitting with yarn needles'],
      ['trace', 'hand tracing a shape'],
      ['stir', 'spoon stirring a pot'],
      ['bake', 'baking a cake in oven (no text)'],
      ['fry', 'frying pan with egg'],
      ['peel', 'peeling a banana'],
      ['slice', 'slicing bread with knife'],
    ],
  },
  {
    title: 'EAT DRINK',
    cells: [
      ['taste', 'kid tasting with spoon'],
      ['bite', 'biting an apple'],
      ['chew', 'kid chewing food'],
      ['swallow', 'kid swallowing a drink'],
      ['drink', 'kid drinking from a cup'],
      ['eat', 'kid eating with fork'],
      ['cook', 'stirring food on stove'],
      ['boil', 'pot boiling with steam'],
      ['melt', 'ice cream melting'],
    ],
  },
  {
    title: 'BREATH SOUND',
    cells: [
      ['blow', 'kid blowing out candles (no text on cake)'],
      ['whistle', 'kid whistling'],
      ['sing', 'kid singing'],
      ['dance', 'kid dancing'],
      ['smile', 'smiling face'],
      ['laugh', 'kid laughing'],
      ['cry', 'kid crying (gentle)'],
      ['sleep', 'kid sleeping in bed'],
      ['wake', 'kid waking up stretching'],
    ],
  },
  {
    title: 'SENSES TALK',
    cells: [
      ['yawn', 'kid yawning'],
      ['sneeze', 'kid sneezing'],
      ['cough', 'kid coughing'],
      ['listen', 'kid listening with hand to ear'],
      ['speak', 'kid speaking'],
      ['shout', 'kid shouting (not angry scary)'],
      ['whisper', 'kid whispering'],
      ['look', 'kid looking through binoculars'],
      ['smell', 'kid smelling a flower'],
    ],
  },
  {
    title: 'PLAY RIDE',
    cells: [
      ['ride', 'kid riding a bicycle'],
      ['fly', 'bird flying / paper airplane flying'],
      ['drive', 'hands on steering wheel driving'],
      ['sail', 'sailboat sailing'],
      ['skate', 'kid ice skating'],
      ['slide', 'kid on playground slide'],
      ['bounce', 'ball bouncing'],
      ['dig', 'kid digging with shovel'],
      ['plant', 'hands planting a seedling'],
    ],
  },
  {
    title: 'WATER PLAY',
    cells: [
      ['splash', 'kid splashing in puddle'],
      ['float', 'toy boat floating'],
      ['freeze', 'water freezing into ice cube'],
      ['row', 'kid rowing a boat'],
      ['paddle', 'paddle boarding / kayak paddle'],
      ['roll', 'ball rolling'],
      ['climb', 'kid climbing a ladder'], // pack-filtered if covered
      ['swing', 'kid on a swing'], // pack-filtered if covered
      ['balance', 'kid balancing on a beam'], // pack-filtered if covered
    ],
  },
];

function loadMissingSheets() {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing pack index: ${INDEX_PATH}`);
  }
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const sheets = [];
  const skippedCovered = [];
  const skippedDeny = [];
  let sheetIdx = 0;

  for (const def of SHEET_DEFS) {
    const cells = [];
    for (const [word, label] of def.cells) {
      const w = String(word || '').trim().toLowerCase();
      if (!w || SKIP.has(w)) {
        skippedDeny.push(w);
        continue;
      }
      const hit = exactPackHit(index, w);
      if (hit) {
        skippedCovered.push(w);
        continue;
      }
      cells.push({ key: slug(w), label, concept: w });
    }
    if (!cells.length) continue;
    sheetIdx += 1;
    sheets.push({
      id: `S${sheetIdx}`,
      theme: slug(def.title),
      title: def.title,
      cells,
    });
  }

  // Pad incomplete sheets by pulling from later sheets (keep ≤9; drop empties)
  // Re-pack into full 9-cell sheets for Manus
  const flat = sheets.flatMap((s) =>
    s.cells.map((c) => ({ ...c, theme: s.theme, title: s.title }))
  );
  const packed = [];
  for (let i = 0; i < flat.length; i += CELLS) {
    const chunk = flat.slice(i, i + CELLS);
    if (chunk.length < CELLS) {
      // leave short last sheet — better than inventing verbs
    }
    if (!chunk.length) continue;
    packed.push({
      id: `S${packed.length + 1}`,
      theme: chunk[0].theme,
      title: chunk[0].title,
      cells: chunk.map((c) => [c.key, c.label, c.concept]),
    });
  }

  return { sheets: packed, skippedCovered, skippedDeny, flatCount: flat.length };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  const keys = sheet.cells.map(([k]) => k).join(',');
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${keys}`;
}

function buildBrief(sheets, taskNo, taskCount) {
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ACTION VERB icon sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object doing the verb). Base-form verbs only. Skip abstracts / feelings words / logos / text.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${sheets.length} PNGs.

This is picturable-verbs wave1 task ${taskNo}/${taskCount} (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call).

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
}

function planTasks() {
  const { sheets, skippedCovered, skippedDeny, flatCount } = loadMissingSheets();
  const tasks = chunk(sheets, SHEETS_PER_TASK).map((sheetGroup, i) => ({
    taskNo: i + 1,
    sheets: sheetGroup,
    keys: sheetGroup.flatMap((s) => s.cells.map((c) => c[0])),
    concepts: sheetGroup.flatMap((s) => s.cells.map((c) => c[2])),
  }));

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const plan = {
    generatedAt: new Date().toISOString(),
    kind: 'picturable-verbs-wave1',
    skip: [...SKIP],
    verbKeyCount: flatCount,
    sheetCount: sheets.length,
    taskCount: tasks.length,
    sheetsPerTask: SHEETS_PER_TASK,
    cellsPerSheet: CELLS,
    skippedCovered,
    skippedDeny,
    tasks: tasks.map((t) => ({
      taskNo: t.taskNo,
      sheetCount: t.sheets.length,
      keyCount: t.keys.length,
      keys: t.keys,
      themes: t.sheets.map((s) => s.theme),
    })),
  };
  fs.writeFileSync(path.join(OUT_ROOT, 'plan.json'), JSON.stringify(plan, null, 2));
  fs.writeFileSync(
    path.join(OUT_ROOT, 'all-keys.txt'),
    tasks.flatMap((t) => t.keys).join('\n') + '\n'
  );
  console.log(
    JSON.stringify(
      {
        phase: 'planned',
        verbs: flatCount,
        sheets: sheets.length,
        tasks: tasks.length,
        skippedCovered: skippedCovered.length,
      },
      null,
      2
    )
  );
  return { tasks, plan };
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
    kind: 'picturable-verbs-wave1',
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
    fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
    console.log(
      JSON.stringify({
        phase: 'dry-run',
        taskNo: task.taskNo,
        sheets: task.sheets.length,
        keys: task.keys.length,
      })
    );
    return { dry_run: true, taskNo: task.taskNo, keys: task.keys.length };
  }

  apiKey();
  const created = await createTask({
    title: `ESL white vocab 3×3: Shift60 picturable verbs wave1 task ${task.taskNo}/${taskCount} (${task.sheets.length} sheets)`,
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
  return { taskNo: task.taskNo, task_id: taskId, task_url: taskUrl, keys: task.keys.length };
}

const { tasks } = planTasks();
const selected = TASK_FILTER
  ? tasks.filter((t) => t.taskNo === TASK_FILTER)
  : tasks;
if (!selected.length) {
  console.error('No tasks to run');
  process.exit(1);
}

const results = [];
for (const task of selected) {
  results.push(await fireTask(task, tasks.length));
}
fs.writeFileSync(
  path.join(OUT_ROOT, SEND ? 'send-summary.json' : 'dry-summary.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      send: SEND,
      results,
      totalKeys: selected.reduce((n, t) => n + t.keys.length, 0),
    },
    null,
    2
  )
);
