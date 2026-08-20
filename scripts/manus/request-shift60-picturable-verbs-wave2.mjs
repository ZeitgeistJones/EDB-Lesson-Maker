/**
 * Shift60 — picturable ESL ACTION VERBS wave2 (white 3×3, Perfect-11).
 * Continues after wave1; pack-exact missing only; skip hug/kids/parents/circle.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave2.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave2.mjs --send
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
import { exactPackHit, slug } from '../lib/pack-exact-match.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();

const SKIP = new Set(['hug', 'kids', 'parents', 'circle']);
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const WAVE1_KEYS = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave1', 'all-keys.txt');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave2');
const SHEETS_PER_TASK = 11;
const CELLS = 9;

const SHEET_DEFS = [
  {
    title: 'TALK TOUCH',
    cells: [
      ['touch', 'finger touching a button'],
      ['call', 'kid calling on a phone'],
      ['answer', 'kid answering a phone'],
      ['ask', 'kid raising hand to ask'],
      ['wear', 'kid putting on a jacket'],
      ['untie', 'hands untying shoelaces'],
      ['unbutton', 'hand unbuttoning a shirt'],
      ['soak', 'sponge soaking in water'],
      ['tickle', 'hand tickling a foot (playful)'],
    ],
  },
  {
    title: 'MOVE FAST',
    cells: [
      ['wiggle', 'kid wiggling fingers'],
      ['tiptoe', 'kid walking on tiptoes'],
      ['march', 'kid marching'],
      ['jog', 'kid jogging'],
      ['sprint', 'kid sprinting'],
      ['chase', 'kid chasing a ball'],
      ['follow', 'kid following another kid'],
      ['lead', 'kid leading a line'],
      ['gallop', 'horse galloping (friendly)'],
    ],
  },
  {
    title: 'SPORTS PLAY',
    cells: [
      ['pass', 'passing a soccer ball'],
      ['dribble', 'dribbling a basketball'],
      ['shoot', 'shooting a basketball at hoop'],
      ['block', 'blocking a soccer ball'],
      ['serve', 'serving a tennis ball'],
      ['pitch', 'pitching a baseball'],
      ['juggle', 'juggling three balls'],
      ['flip', 'pancake flipping in pan'],
      ['cartwheel', 'kid doing a cartwheel'],
    ],
  },
  {
    title: 'BODY GESTURE',
    cells: [
      ['somersault', 'kid doing a somersault'],
      ['flex', 'kid flexing arm muscle'],
      ['pose', 'kid posing for a photo'],
      ['bow', 'kid bowing'],
      ['salute', 'kid saluting'],
      ['high-five', 'two hands high-fiving'],
      ['fist-bump', 'two fists bumping'],
      ['handshake', 'two hands shaking'],
      ['pat', 'hand patting a dog'],
    ],
  },
  {
    title: 'HANDS CRAFT',
    cells: [
      ['rub', 'hands rubbing together'],
      ['scratch', 'hand scratching an itch on arm'],
      ['unfold', 'hands unfolding a paper'],
      ['crumple', 'hand crumpling paper'],
      ['flatten', 'hand flattening dough'],
      ['unroll', 'unrolling a yoga mat'],
      ['unwrap', 'unwrapping a gift (no logos/text)'],
      ['clip', 'clipping papers with a clip'],
      ['paste', 'pasting paper with glue stick'],
    ],
  },
  {
    title: 'KITCHEN PREP',
    cells: [
      ['scrape', 'scraping a plate'],
      ['mash', 'mashing potatoes'],
      ['blend', 'blender blending fruit'],
      ['beat', 'beating eggs with whisk'],
      ['knead', 'kneading dough'],
      ['spread', 'spreading butter on bread'],
      ['scoop', 'scooping ice cream'],
      ['roast', 'roasting vegetables in oven'],
      ['simmer', 'pot simmering on stove'],
    ],
  },
  {
    title: 'COOK CRUSH',
    cells: [
      ['saute', 'sauteing veggies in pan'],
      ['chill', 'putting juice in fridge'],
      ['thaw', 'frozen food thawing'],
      ['crush', 'crushing a cracker'],
      ['grind', 'grinding pepper'],
      ['smash', 'smashing a sandwich flat'],
      ['crack', 'cracking an egg'],
      ['shred', 'shredding cheese'],
      ['grate', 'grating a carrot'],
    ],
  },
  {
    title: 'WATER OUTDOOR',
    cells: [
      ['surf', 'kid surfing a wave'],
      ['paddle', 'kid paddling a kayak'],
      ['row', 'kid rowing a boat'],
      ['splash', 'kid splashing water'],
      ['float', 'kid floating on back in pool'],
      ['dive', 'kid diving into pool'],
      ['ski', 'kid skiing'],
      ['sled', 'kid on a sled'],
      ['hike', 'kid hiking with backpack'],
    ],
  },
  {
    title: 'CARE FEED',
    cells: [
      ['feed', 'feeding a pet dog'],
      ['pet', 'hand petting a cat'],
      ['water', 'watering a plant with can'],
      ['plant', 'planting a seed in soil'],
      ['dig', 'digging with a shovel'],
      ['rake', 'raking leaves'],
      ['mow', 'mowing grass with mower'],
      ['water-plants', 'watering flowers'],
      ['harvest', 'harvesting apples from tree'],
    ],
  },
  {
    title: 'SCHOOL CLASS',
    cells: [
      ['erase', 'erasing a whiteboard'],
      ['circle', 'circling an answer'], // will skip via SKIP
      ['underline', 'underlining a word'],
      ['highlight', 'highlighting text with marker'],
      ['staple', 'stapling papers'],
      ['hole-punch', 'hole-punching paper'],
      ['sharpen', 'sharpening a pencil'],
      ['color', 'coloring with crayons'],
      ['trace', 'tracing a dotted line'],
    ],
  },
  {
    title: 'MORE ACTIONS',
    cells: [
      ['iron', 'ironing a shirt'],
      ['fold', 'folding laundry'],
      ['hang', 'hanging clothes on line'],
      ['sweep', 'sweeping floor'],
      ['mop', 'mopping floor'],
      ['vacuum', 'vacuuming carpet'],
      ['rinse', 'rinsing dishes'],
      ['scrub', 'scrubbing sink'],
      ['polish', 'polishing a table'],
    ],
  },
];

function loadAlreadySent() {
  const set = new Set();
  if (fs.existsSync(WAVE1_KEYS)) {
    for (const line of fs.readFileSync(WAVE1_KEYS, 'utf8').split(/\r?\n/)) {
      const t = line.trim().toLowerCase();
      if (t) set.add(t);
    }
  }
  return set;
}

function loadMissingSheets() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const already = loadAlreadySent();
  const skippedCovered = [];
  const skippedDeny = [];
  const skippedPrior = [];
  const flat = [];

  for (const def of SHEET_DEFS) {
    for (const [word, label] of def.cells) {
      const w = String(word || '').trim().toLowerCase();
      if (!w || SKIP.has(w)) {
        skippedDeny.push(w);
        continue;
      }
      const key = slug(w);
      if (already.has(key) || already.has(w)) {
        skippedPrior.push(w);
        continue;
      }
      if (exactPackHit(index, w)) {
        skippedCovered.push(w);
        continue;
      }
      flat.push({ key, label, concept: w, theme: slug(def.title), title: def.title });
    }
  }

  const packed = [];
  for (let i = 0; i < flat.length; i += CELLS) {
    const chunk = flat.slice(i, i + CELLS);
    if (!chunk.length) continue;
    packed.push({
      id: `S${packed.length + 1}`,
      theme: chunk[0].theme,
      title: chunk[0].title,
      cells: chunk.map((c) => [c.key, c.label, c.concept]),
    });
  }
  return { sheets: packed, skippedCovered, skippedDeny, skippedPrior, flatCount: flat.length };
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
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ACTION VERB icon sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object doing the verb). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${sheets.length} PNGs.

This is picturable-verbs wave2 task ${taskNo}/${taskCount} (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call).

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
}

function planTasks() {
  const { sheets, skippedCovered, skippedDeny, skippedPrior, flatCount } = loadMissingSheets();
  const tasks = chunk(sheets, SHEETS_PER_TASK).map((sheetGroup, i) => ({
    taskNo: i + 1,
    sheets: sheetGroup,
    keys: sheetGroup.flatMap((s) => s.cells.map((c) => c[0])),
    concepts: sheetGroup.flatMap((s) => s.cells.map((c) => c[2])),
  }));

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const plan = {
    generatedAt: new Date().toISOString(),
    kind: 'picturable-verbs-wave2',
    skip: [...SKIP],
    verbKeyCount: flatCount,
    sheetCount: sheets.length,
    taskCount: tasks.length,
    skippedCovered,
    skippedDeny,
    skippedPrior,
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
        skippedPrior: skippedPrior.length,
      },
      null,
      2
    )
  );
  return { tasks };
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
    kind: 'picturable-verbs-wave2',
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
    title: `ESL white vocab 3×3: Shift60 picturable verbs wave2 task ${task.taskNo}/${taskCount} (${task.sheets.length} sheets)`,
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
const selected = TASK_FILTER ? tasks.filter((t) => t.taskNo === TASK_FILTER) : tasks;
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
