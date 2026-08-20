/**
 * Shift60 — picturable ESL ACTION VERBS wave7 (white 3×3, Perfect-11).
 * Bank expansion after wave1-6: new picturable verbs beyond prior commissions.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave7.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave7.mjs --send
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
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave7');
const CELLS = 9;

/**
 * Themed bank-expansion leftovers (pack-filtered at runtime).
 */
const SHEET_DEFS = [
  {
    title: 'ANIMAL MOVE',
    cells: [
      ['wag', 'dog wagging its tail'],
      ['pounce', 'cat pouncing on a toy'],
      ['perch', 'bird perching on a branch'],
      ['soar', 'eagle soaring in the sky'],
      ['roost', 'chickens roosting on a perch'],
      ['graze', 'cow grazing in a field'],
      ['hibernate', 'bear hibernating in a den'],
      ['waddle', 'penguin waddling on ice'],
      ['nuzzle', 'horse nuzzling a kid hand'],
    ],
  },
  {
    title: 'WINTER PLAY',
    cells: [
      ['toboggan', 'kid tobogganing down a hill'],
      ['iceskate', 'kid ice-skating on a rink'],
      ['rollerblade', 'kid rollerblading on a path'],
      ['luge', 'kid on a luge sled'],
      ['bobsled', 'kids in a bobsled'],
      ['crunch', 'boot crunching in snow'],
      ['scuff', 'shoe scuffing along snow'],
      ['shiver', 'kid shivering in cold'],
      ['tremble', 'kid trembling from cold'],
    ],
  },
  {
    title: 'WATER ADVENTURE',
    cells: [
      ['scuba', 'diver scuba diving underwater'],
      ['rappel', 'kid rappelling down a rock wall'],
      ['belay', 'adult belaying a climber'],
      ['zipline', 'kid ziplining through trees'],
      ['bungee', 'soft cartoon bungee jump'],
      ['parasail', 'kid parasailing over water'],
      ['paraglide', 'paragliding over hills'],
      ['waterski', 'kid waterskiing behind a boat'],
      ['jetski', 'kid riding a jet ski'],
    ],
  },
  {
    title: 'GYM FITNESS',
    cells: [
      ['plank', 'kid holding a plank pose'],
      ['burpee', 'kid doing a burpee'],
      ['pushup', 'kid doing a push-up'],
      ['pullup', 'kid doing a pull-up on a bar'],
      ['situp', 'kid doing a sit-up'],
      ['leapfrog', 'kids playing leapfrog'],
      ['handspring', 'kid doing a handspring'],
      ['frontflip', 'kid doing a front flip'],
      ['pirouette', 'dancer doing a pirouette'],
    ],
  },
  {
    title: 'MUSIC SOUND',
    cells: [
      ['jingle', 'bells jingling'],
      ['ding', 'desk bell dinging'],
      ['buzz', 'bee buzzing near a flower'],
      ['beep', 'alarm clock beeping'],
      ['creak', 'door creaking open'],
      ['clang', 'cymbals clanging'],
      ['rumble', 'thunder rumbling'],
      ['boom', 'drum booming'],
      ['tweet', 'bird tweeting on a branch'],
    ],
  },
  {
    title: 'FARM CARE2',
    cells: [
      ['churn', 'churning butter in a churn'],
      ['bridle', 'putting a bridle on a horse'],
      ['shepherd', 'shepherd guiding sheep'],
      ['brood', 'hen brooding eggs'],
      ['pollinate', 'bee pollinating a flower'],
      ['thresh', 'threshing grain'],
      ['winnow', 'winnowing grain in a basket'],
      ['graft', 'grafting a plant stem'],
      ['repot', 'repotting a plant'],
    ],
  },
  {
    title: 'COOK MORE2',
    cells: [
      ['braise', 'braising meat in a pot'],
      ['blanch', 'blanching vegetables in boiling water'],
      ['puree', 'pureeing soup with a blender'],
      ['steep', 'steeping tea in a cup'],
      ['baste', 'basting a roast with a brush'],
      ['fillet', 'filleting a fish'],
      ['julienne', 'julienning a carrot'],
      ['ferment', 'fermenting jars of pickles'],
      ['uncork', 'uncorking a bottle'],
    ],
  },
  {
    title: 'CRAFT WOOD',
    cells: [
      ['whittle', 'whittling wood with a small knife'],
      ['engrave', 'engraving a wood plaque'],
      ['etch', 'etching a design on glass'],
      ['varnish', 'varnishing a wooden toy'],
      ['stain', 'staining a wood board'],
      ['rivet', 'riveting two metal pieces'],
      ['emboss', 'embossing a paper card'],
      ['laminate', 'laminating a paper sheet'],
      ['macrame', 'making a macrame plant hanger'],
    ],
  },
  {
    title: 'SPORT COURT',
    cells: [
      ['lob', 'lobbing a tennis ball'],
      ['intercept', 'player intercepting a pass'],
      ['rally', 'tennis rally over a net'],
      ['foul', 'referee calling a foul'],
      ['umpire', 'umpire signaling safe'],
      ['referee', 'referee holding a whistle'],
      ['ace', 'serving an ace in tennis'],
      ['punch', 'soft cartoon punching a bag'],
      ['dodge', 'kid dodging a soft ball'],
    ],
  },
  {
    title: 'QUICK MOVE',
    cells: [
      ['swerve', 'scooter swerving around a cone'],
      ['pivot', 'basketball player pivoting'],
      ['zigzag', 'kid zigzagging through cones'],
      ['sidestep', 'kid sidestepping'],
      ['flee', 'kid fleeing playfully'],
      ['dash', 'kid dashing to a finish line'],
      ['scamper', 'squirrel scampering up a tree'],
      ['scurry', 'mouse scurrying across floor'],
      ['scuttle', 'crab scuttling on sand'],
    ],
  },
  {
    title: 'KID EXPRESS',
    cells: [
      ['yell', 'kid yelling happily at a game'],
      ['scream', 'kid screaming on a fun ride'],
      ['kneel', 'kid kneeling to tie a shoe'],
      ['curtsy', 'kid curtsying on a stage'],
      ['shimmy', 'kid shimmying in a dance'],
      ['boogie', 'kid boogie dancing'],
      ['yodel', 'kid yodeling in mountains'],
      ['hula', 'kid hula dancing with a hoop'],
      ['yoga', 'kid doing a yoga pose'],
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
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ACTION VERB icon sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${n} PNGs.

This is picturable-verbs wave7 (Shift60 bank expansion). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call).

Filename each PNG with the theme slug in the name (e.g. esl_action_verbs_sheet_01_animal_move.png) so import can match.

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
      kind: 'picturable-verbs-wave7',
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
  kind: 'picturable-verbs-wave7',
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
  console.log(JSON.stringify({ phase: 'empty', message: 'no missing picturable verbs left for wave7' }));
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
  title: `ESL white vocab 3×3: Shift60 picturable verbs wave7 (${sheets.length} sheets)`,
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
