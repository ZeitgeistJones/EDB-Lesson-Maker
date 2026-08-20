/**
 * Shift60 â€” picturable ESL ACTION VERBS wave9 (white 3x3, Perfect-11).
 * Bank expansion (~99 new verbs) + residual expand after wave1-8.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave9.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave9.mjs --send
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
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave8', 'all-keys.txt'),
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave9');
const CELLS = 9;

/**
 * Wave9 Perfect-11 bank expansion (pack-filtered at runtime).
 */
const SHEET_DEFS = [
  {
    title: 'CLASS SPORT',
    cells: [
      ['raisehand', 'kid raising a hand'],
      ['eraseboard', 'erasing a whiteboard'],
      ['holepunch', 'hole-punching paper'],
      ['thumbtack', 'pushing a thumbtack into a board'],
      ['freethrow', 'kid shooting a free throw'],
      ['layup', 'kid doing a basketball layup'],
      ['slamdunk', 'player slam-dunking'],
      ['header', 'soccer player heading a ball'],
      ['goalie', 'goalie catching a soccer ball'],
    ],
  },
  {
    title: 'WINTER YARD',
    cells: [
      ['snowangel', 'kid making a snow angel'],
      ['hoverboard', 'kid on a hoverboard'],
      ['icescoop', 'scooping ice cream'],
      ['rakeleaf', 'raking autumn leaves'],
      ['bagleaf', 'bagging leaves'],
      ['mowlawn', 'mowing a lawn'],
      ['hedgetrim', 'trimming a hedge'],
      ['watercan', 'watering plants with a can'],
      ['seedplant', 'planting seeds in soil'],
    ],
  },
  {
    title: 'CAMP CRAFT',
    cells: [
      ['pitchtent', 'pitching a tent'],
      ['roastmarsh', 'roasting a marshmallow'],
      ['trailwalk', 'hiking on a trail'],
      ['binocular', 'looking through binoculars'],
      ['needlepoint', 'doing needlepoint'],
      ['crossstitch', 'cross-stitching fabric'],
      ['beadstring', 'stringing beads'],
      ['lanyard', 'weaving a plastic lanyard'],
      ['friendship', 'tying a friendship bracelet'],
    ],
  },
  {
    title: 'WATER FUN3',
    cells: [
      ['tubing', 'kids tubing on water'],
      ['diveboard', 'kid diving from a board'],
      ['crabkick', 'kid crab-kick in water'],
      ['eggbeater', 'swimmer eggbeater kick'],
      ['submerge', 'toy boat submerging'],
      ['watergun', 'kid squirting a water gun'],
      ['soapbubble', 'giant soap bubble'],
      ['bubblewand', 'blowing bubbles with a wand'],
      ['sanddig', 'digging in sand'],
    ],
  },
  {
    title: 'HOUSE FIX',
    cells: [
      ['mopfloor', 'mopping a floor'],
      ['dustshelf', 'dusting a shelf'],
      ['makebed', 'making a bed'],
      ['foldlaundry', 'folding laundry'],
      ['hangdry', 'hanging clothes to dry'],
      ['sweepfloor', 'sweeping a floor'],
      ['sawwood', 'sawing a wood board'],
      ['drillhole', 'drilling a hole'],
      ['sandwood', 'sanding wood'],
    ],
  },
  {
    title: 'PARTY BODY',
    cells: [
      ['blowcandle', 'blowing out birthday candles'],
      ['partyhat', 'putting on a party hat'],
      ['balloonpop', 'popping a balloon'],
      ['wishbone', 'pulling a wishbone'],
      ['highfive', 'kids high-fiving'],
      ['fistbump', 'kids fist-bumping'],
      ['wavehello', 'kid waving hello'],
      ['thumbs-up', 'kid giving a thumbs-up'],
      ['shakehead', 'kid shaking head no'],
    ],
  },
  {
    title: 'ART CLAY',
    cells: [
      ['fingerpaint', 'kid finger-painting'],
      ['stamppad', 'stamping with an ink pad'],
      ['playdough', 'rolling playdough'],
      ['claycoil', 'coiling clay into a pot'],
      ['pinchpot', 'making a clay pinch pot'],
      ['slabroll', 'rolling a clay slab'],
      ['wheelthrow', 'throwing clay on a wheel'],
      ['balloonanimal', 'twisting a balloon animal'],
      ['facepaint', 'painting a face design'],
    ],
  },
  {
    title: 'PLAYGROUND2',
    cells: [
      ['ropeswing', 'kid on a rope swing'],
      ['tireswing', 'kid on a tire swing'],
      ['merrygo', 'kids on a merry-go-round'],
      ['treeclimb', 'kid climbing a tree'],
      ['rockclimb', 'kid rock climbing with harness'],
      ['bouldering', 'kid bouldering on a wall'],
      ['slackline', 'kid balancing on a slackline'],
      ['rollerskate', 'kid roller skating'],
      ['jumpjack', 'kid doing jumping jacks'],
    ],
  },
  {
    title: 'TRACK FIELD',
    cells: [
      ['longjump', 'kid doing a long jump'],
      ['highjump', 'kid doing a high jump'],
      ['shotput', 'athlete throwing shot put'],
      ['javelin', 'athlete throwing javelin'],
      ['polevault', 'athlete pole vaulting'],
      ['triplejump', 'athlete triple jumping'],
      ['joginplace', 'kids jogging in place'],
      ['plankhold', 'kid holding a plank'],
      ['chinup', 'kid doing a chin-up'],
    ],
  },
  {
    title: 'KITCHEN FUN2',
    cells: [
      ['crackegg', 'cracking an egg'],
      ['peelbanana', 'peeling a banana'],
      ['gratecheese', 'grating cheese'],
      ['buttertoast', 'buttering toast'],
      ['jamtoast', 'spreading jam on toast'],
      ['packlunch', 'packing a lunchbox'],
      ['strawdrink', 'drinking with a straw'],
      ['cerealpour', 'pouring cereal'],
      ['grillflip', 'flipping food on a grill'],
    ],
  },
  {
    title: 'GAME PLAY',
    cells: [
      ['hotpotato', 'kids playing hot potato'],
      ['musicalchairs', 'kids musical chairs'],
      ['duckgoose', 'kids playing duck duck goose'],
      ['hidenseek', 'kid hiding for hide and seek'],
      ['charades', 'acting out charades'],
      ['marionette', 'working a marionette'],
      ['shadowpup', 'making a shadow puppet'],
      ['rolldice', 'rolling dice'],
      ['blocktower', 'stacking a block tower'],
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
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} â€” ${label}`);
  return `SHEET ${index} â€” ${sheet.title}:\n${lines.join('\n')}\nKeys: ${sheet.cells.map(([k]) => k).join(',')}`;
}

function buildBrief(sheets) {
  const n = sheets.length;
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3x3 ACTION VERB icon sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3x3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${n} PNGs.

This is picturable-verbs wave9 (Shift60 bank expansion). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call).

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
      kind: 'picturable-verbs-wave9',
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
  kind: 'picturable-verbs-wave9',
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
  console.log(JSON.stringify({ phase: 'empty', message: 'no missing picturable verbs left for wave9' }));
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
  title: `ESL white vocab 3x3: Shift60 picturable verbs wave9 (${sheets.length} sheets)`,
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

