/**
 * Shift60 — picturable ESL ACTION VERBS wave6 (white 3×3, Perfect-11).
 * Bank expansion after wave1–5: new picturable verbs beyond prior commissions.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave6.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave6.mjs --send
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
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave6');
const CELLS = 9;

/**
 * Themed bank-expansion leftovers (pack-filtered at runtime).
 */
const SHEET_DEFS = [
  {
    title: 'FARM SOUNDS',
    cells: [
      ['moo', 'cow mooing'],
      ['neigh', 'horse neighing'],
      ['oink', 'pig oinking'],
      ['quack', 'duck quacking'],
      ['cluck', 'hen clucking'],
      ['gobble', 'turkey gobbling'],
      ['bleat', 'sheep bleating'],
      ['caw', 'crow cawing'],
      ['coo', 'dove cooing'],
    ],
  },
  {
    title: 'FACE BREATH',
    cells: [
      ['gasp', 'kid gasping in surprise'],
      ['gulp', 'kid gulping a drink'],
      ['pant', 'kid panting after running'],
      ['puff', 'kid puffing cheeks'],
      ['sigh', 'kid sighing'],
      ['sniff', 'kid sniffing a flower'],
      ['snort', 'kid snorting a laugh'],
      ['giggle', 'kid giggling'],
      ['chuckle', 'kid chuckling'],
    ],
  },
  {
    title: 'LOOK PEEK',
    cells: [
      ['peek', 'kid peeking around a door'],
      ['peer', 'kid peering through binoculars'],
      ['squint', 'kid squinting at sun'],
      ['stare', 'kid staring at a fish tank'],
      ['gaze', 'kid gazing at stars'],
      ['glance', 'kid glancing sideways'],
      ['flinch', 'kid flinching from a splash'],
      ['wince', 'kid wincing at a loud sound'],
      ['yelp', 'kid yelping in surprise'],
    ],
  },
  {
    title: 'WOBBLE MOVE',
    cells: [
      ['wobble', 'jelly wobbling on a plate'],
      ['teeter', 'kid teetering on a balance beam'],
      ['scoot', 'kid scooting on a scooter'],
      ['dangle', 'key dangling from a hook'],
      ['drift', 'leaf drifting on water'],
      ['skim', 'stone skimming on a pond'],
      ['bob', 'apple bobbing in water'],
      ['tread', 'kid treading water'],
      ['handstand', 'kid doing a handstand'],
    ],
  },
  {
    title: 'KITCHEN EXTRA',
    cells: [
      ['season', 'hand seasoning soup with salt'],
      ['scramble', 'scrambling eggs in a pan'],
      ['toss', 'tossing a salad in a bowl'],
      ['whip', 'whipping cream with a whisk'],
      ['zest', 'zesting a lemon'],
      ['broil', 'broiling food under oven flame'],
      ['shuck', 'shucking corn'],
      ['marinate', 'marinating meat in a bowl'],
      ['griddle', 'cooking on a griddle'],
    ],
  },
  {
    title: 'HIT FORCE',
    cells: [
      ['pound', 'pounding dough with fists'],
      ['slam', 'slamming a door (soft cartoon)'],
      ['bang', 'banging a drum'],
      ['rip', 'ripping paper'],
      ['split', 'splitting a log with axe'],
      ['squash', 'squashing a soft tomato'],
      ['thump', 'thumping a watermelon'],
      ['rap', 'rapping knuckles on a door'],
      ['tack', 'tacking a note with a thumbtack'],
    ],
  },
  {
    title: 'CRAFT ART',
    cells: [
      ['mold', 'molding clay with hands'],
      ['sculpt', 'sculpting a clay animal'],
      ['doodle', 'doodling on paper'],
      ['collage', 'making a paper collage'],
      ['embroider', 'embroidering cloth with needle'],
      ['weld', 'welding two metal pieces (sparks soft)'],
      ['assemble', 'assembling toy blocks'],
      ['decorate', 'decorating a cake'],
      ['mime', 'mime artist posing in a box'],
    ],
  },
  {
    title: 'SPORT HIT',
    cells: [
      ['dunk', 'dunking a basketball'],
      ['volley', 'volleying a soccer ball'],
      ['putt', 'putting a golf ball'],
      ['chip', 'chipping a golf ball'],
      ['bunt', 'bunting a baseball'],
      ['guard', 'guarding a goal'],
      ['joust', 'kids foam-jousting on pool floats'],
      ['swipe', 'swiping a phone screen'],
      ['zoom', 'zooming a camera lens'],
    ],
  },
  {
    title: 'TRAVEL LOAD',
    cells: [
      ['depart', 'train departing a station'],
      ['hitch', 'hitching a trailer to a car'],
      ['moor', 'mooring a small boat'],
      ['unload', 'unloading boxes from a truck'],
      ['alight', 'passenger alighting from a bus'],
      ['unbuckle', 'unbuckling a seatbelt'],
      ['unhook', 'unhooking a coat from a hook'],
      ['unlatch', 'unlatching a gate'],
      ['unbolt', 'unbolting a door bolt'],
    ],
  },
  {
    title: 'SOCIAL GAME',
    cells: [
      ['welcome', 'welcoming a guest at a door'],
      ['deal', 'dealing playing cards'],
      ['shuffle', 'shuffling a deck of cards'],
      ['trade', 'kids trading stickers'],
      ['guess', 'kid guessing behind hands'],
      ['seek', 'kid seeking in hide-and-seek'],
      ['search', 'kid searching with a flashlight'],
      ['act', 'kid acting on a small stage'],
      ['toot', 'tooting a party horn'],
    ],
  },
  {
    title: 'FARM CARE',
    cells: [
      ['shear', 'shearing a sheep'],
      ['groom', 'grooming a horse'],
      ['herd', 'herding sheep with a dog'],
      ['forage', 'kid foraging berries'],
      ['reap', 'reaping wheat with a sickle'],
      ['corral', 'corralling horses into a pen'],
      ['align', 'aligning books on a shelf'],
      ['pair', 'pairing matching socks'],
      ['mount', 'mounting a photo in a frame'],
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

This is picturable-verbs wave6 (Shift60 bank expansion). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call).

Filename each PNG with the theme slug in the name (e.g. esl_action_verbs_sheet_01_farm_sounds.png) so import can match.

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
      kind: 'picturable-verbs-wave6',
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
  kind: 'picturable-verbs-wave6',
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
  console.log(JSON.stringify({ phase: 'empty', message: 'no missing picturable verbs left for wave6' }));
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
  title: `ESL white vocab 3×3: Shift60 picturable verbs wave6 (${sheets.length} sheets)`,
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
