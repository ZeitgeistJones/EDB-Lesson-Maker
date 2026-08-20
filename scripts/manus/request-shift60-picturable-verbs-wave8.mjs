/**
 * Shift60 — picturable ESL ACTION VERBS wave8 (white 3x3, Perfect-11).
 * Bank expansion (~99 new verbs) + residual expand after wave1-7.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave8.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave8.mjs --send
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
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const PRIOR = [
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave1', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave2', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave3', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave4', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave5', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave6', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave7', 'all-keys.txt'),
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave8');
const CELLS = 9;

/**
 * Wave8 Perfect-11 bank expansion (pack-filtered at runtime).
 */
const SHEET_DEFS = [
  {
    title: 'PLAYGROUND FUN',
    cells: [
      ['expand', 'balloon expanding as it inflates'],
      ['monkeybar', 'kid swinging on monkey bars'],
      ['tetherball', 'kid hitting a tetherball'],
      ['fourquare', 'kids playing four square'],
      ['dodgeball', 'kid dodging a soft dodgeball'],
      ['kickball', 'kid kicking a kickball'],
      ['gaga', 'kids playing gaga ball'],
      ['tugowar', 'kids in a tug-of-war'],
      ['ollie', 'skateboarder doing an ollie'],
    ],
  },
  {
    title: 'SKATE TRICK',
    cells: [
      ['kickflip', 'skateboarder doing a kickflip'],
      ['heelflip', 'skateboarder doing a heelflip'],
      ['nosegrind', 'skateboard grinding a rail'],
      ['boardslide', 'skateboard sliding along a rail'],
      ['manual', 'skateboarder balancing a manual'],
      ['wallride', 'skateboarder wall-riding'],
      ['fakie', 'skateboarder riding fakie'],
      ['nollie', 'skateboarder doing a nollie'],
      ['shuvit', 'skateboard shuvit spin'],
    ],
  },
  {
    title: 'GYM MOVE2',
    cells: [
      ['headstand', 'kid holding a headstand'],
      ['roundoff', 'gymnast doing a roundoff'],
      ['backbend', 'kid in a backbend'],
      ['crabwalk', 'kid crab-walking'],
      ['bearwalk', 'kid bear-walking'],
      ['logroll', 'kid log-rolling on a mat'],
      ['tuckjump', 'kid doing a tuck jump'],
      ['starjump', 'kid doing a star jump'],
      ['wallsit', 'kid holding a wall sit'],
    ],
  },
  {
    title: 'CARDIO DRILL',
    cells: [
      ['highknee', 'kid running high knees'],
      ['buttkick', 'kid doing butt kicks'],
      ['sidelunge', 'kid doing a side lunge'],
      ['calfraise', 'kid doing calf raises'],
      ['shadowbox', 'kid shadowboxing'],
      ['jab', 'boxer throwing a soft jab'],
      ['uppercut', 'boxer throwing a soft uppercut'],
      ['hookpunch', 'boxer throwing a soft hook'],
      ['skiprope', 'kid skipping rope'],
    ],
  },
  {
    title: 'TOY PLAY',
    cells: [
      ['jumprope', 'kid jumping rope'],
      ['yoyo', 'kid playing with a yo-yo'],
      ['boomerang', 'kid throwing a boomerang'],
      ['lasso', 'kid swinging a soft lasso'],
      ['hackysack', 'kid kicking a hacky sack'],
      ['jenga', 'kid pulling a Jenga block'],
      ['slinky', 'slinky walking down stairs'],
      ['kaleidoscope', 'kid looking in a kaleidoscope'],
      ['origami', 'hands folding origami crane'],
    ],
  },
  {
    title: 'PAPER CRAFT',
    cells: [
      ['fanfold', 'fan-folding a paper strip'],
      ['pleat', 'pleating a paper fan'],
      ['uncrumple', 'hand uncrumpling paper'],
      ['perforate', 'perforating paper with a punch'],
      ['deboss', 'debossing a leather stamp'],
      ['decoupage', 'decoupaging a box with paper'],
      ['contract', 'balloon contracting as air leaves'],
      ['dissolve', 'sugar dissolving in water'],
      ['evaporate', 'puddle evaporating in sun'],
    ],
  },
  {
    title: 'SCIENCE DEMO',
    cells: [
      ['condense', 'steam condensing on a cold glass'],
      ['crystallize', 'crystals forming in a jar'],
      ['magnetize', 'magnet attracting paperclips'],
      ['repel', 'two magnets repelling'],
      ['revolve', 'globe revolving on a stand'],
      ['deseed', 'deseeding a pepper'],
      ['cube', 'cubing a potato'],
      ['wedge', 'wedging an orange'],
      ['leafblow', 'adult using a leaf blower'],
    ],
  },
  {
    title: 'KITCHEN OUTDOOR',
    cells: [
      ['edge', 'edging a lawn border'],
      ['aerate', 'aerating a lawn'],
      ['transplant', 'transplanting a seedling'],
      ['stake', 'staking a tomato plant'],
      ['compostturn', 'turning a compost pile'],
      ['birdfeed', 'filling a bird feeder'],
      ['airguitar', 'kid playing air guitar'],
      ['airdrum', 'kid playing air drums'],
      ['tapdance', 'kid tap dancing'],
    ],
  },
  {
    title: 'MUSIC MOVE',
    cells: [
      ['clogdance', 'kid clog dancing'],
      ['moonwalk', 'kid moonwalking'],
      ['robotdance', 'kid doing the robot dance'],
      ['flossdance', 'kid doing the floss dance'],
      ['breakdance', 'kid breakdancing'],
      ['limbo', 'kid limbo dancing under a bar'],
      ['cannonball', 'kid cannonballing into a pool'],
      ['bellyflop', 'soft cartoon belly flop'],
      ['doggypaddle', 'kid doggy-paddling'],
    ],
  },
  {
    title: 'WATER PLAY2',
    cells: [
      ['backstroke', 'kid swimming backstroke'],
      ['breaststroke', 'kid swimming breaststroke'],
      ['sidestroke', 'kid swimming sidestroke'],
      ['flutterkick', 'kid doing flutter kicks'],
      ['dolphin-kick', 'kid doing a dolphin kick'],
      ['boogieboard', 'kid riding a boogie board'],
      ['unstack', 'hands unstacking blocks'],
      ['rearrange', 'rearranging toy furniture'],
      ['calibrate', 'calibrating a kitchen scale'],
    ],
  },
  {
    title: 'FIX BUILD',
    cells: [
      ['torque', 'tightening a bolt with a wrench'],
      ['lubricate', 'oiling a bicycle chain'],
      ['chock', 'chocking a wheel with a block'],
      ['reinforce', 'reinforcing a cardboard bridge'],
      ['hoist', 'hoisting a flag on a pole'],
      ['foursquare', 'kids playing four square'],
      ['tugofwar', 'kids in tug-of-war'],
      ['monkeybars', 'kid on monkey bars'],
      ['pogo', 'kid bouncing on a pogo stick'],
    ],
  },
];

function alreadySent() {
  const set = new Set();
  for (const p of PRIOR) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim().toLowerCase();
      if (t) set.add(t);
    }
  }
  return set;
}

function loadSheets() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const prior = alreadySent();
  const flat = [];
  for (const def of SHEET_DEFS) {
    for (const [word, label] of def.cells) {
      const w = word.trim().toLowerCase();
      if (!w || SKIP.has(w) || prior.has(w) || prior.has(slug(w))) continue;
      if (exactPackHit(index, w)) continue;
      flat.push({ key: slug(w), label, concept: w, title: def.title, theme: slug(def.title) });
    }
  }
  const sheets = [];
  for (let i = 0; i < flat.length; i += CELLS) {
    const chunk = flat.slice(i, i + CELLS);
    if (!chunk.length) continue;
    sheets.push({
      id: `S${sheets.length + 1}`,
      theme: chunk[0].theme,
      title: chunk[0].title,
      cells: chunk.map((c) => [c.key, c.label, c.concept]),
    });
  }
  return { sheets, flatCount: flat.length };
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${sheet.cells.map(([k]) => k).join(',')}`;
}

function buildBrief(sheets) {
  const n = sheets.length;
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3x3 ACTION VERB icon sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3x3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${n} PNGs.

This is picturable-verbs wave8 (Shift60 bank expansion). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call).

Filename each PNG with the theme slug in the name (e.g. esl_action_verbs_sheet_01_playground_fun.png) so import can match.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${n} PNGs + short legends. No essay.`);
}

const { sheets, flatCount } = loadSheets();
fs.mkdirSync(OUT_ROOT, { recursive: true });
const keys = sheets.flatMap((s) => s.cells.map((c) => c[0]));
const concepts = sheets.flatMap((s) => s.cells.map((c) => c[2]));
fs.writeFileSync(
  path.join(OUT_ROOT, 'plan.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      kind: 'picturable-verbs-wave8',
      verbKeyCount: flatCount,
      sheetCount: sheets.length,
      keys,
    },
    null,
    2
  )
);
fs.writeFileSync(path.join(OUT_ROOT, 'all-keys.txt'), keys.join('\n') + '\n');
console.log(JSON.stringify({ phase: 'planned', verbs: flatCount, sheets: sheets.length }, null, 2));

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
  kind: 'picturable-verbs-wave8',
  sheet_count: sheets.length,
  keys,
  concepts,
  sheets: sheets.map((s) => ({
    id: s.id,
    theme: s.theme,
    title: s.title,
    keys: s.cells.map((c) => c[0]),
  })),
};

if (!sheets.length) {
  fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, empty: true }, null, 2));
  console.log(JSON.stringify({ phase: 'empty', message: 'no missing picturable verbs left for wave8' }));
  process.exit(0);
}

if (DRY) {
  fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
  console.log(
    JSON.stringify({
      phase: 'dry-run',
      sheets: sheets.length,
      keys: keys.length,
      themes: sheets.map((s) => s.theme),
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
  title: `ESL white vocab 3x3: Shift60 picturable verbs wave8 (${sheets.length} sheets)`,
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
    },
    null,
    2
  )
);
console.log(
  JSON.stringify(
    { phase: 'created', task_id: taskId, task_url: taskUrl, keys: keys.length, sheets: sheets.length },
    null,
    2
  )
);
