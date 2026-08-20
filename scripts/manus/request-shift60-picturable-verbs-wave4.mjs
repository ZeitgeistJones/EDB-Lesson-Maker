/**
 * Shift60 — picturable ESL ACTION VERBS wave4 (white 3×3, Perfect-11).
 * Remaining kid→intermediate actions after wave1–3 pack import.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave4.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave4.mjs --send
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
  // hug-adjacent / soft romance — skip for kid sheets
  'cuddle',
  'embrace',
  'snuggle',
  'kiss',
]);
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const PRIOR = [
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave1', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave2', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave3', 'all-keys.txt'),
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave4');
const CELLS = 9;

/**
 * Themed leftovers from picturable-verbs-missing after wave1–3.
 * Pack-filtered at runtime — already-hit keys drop out.
 */
const SHEET_DEFS = [
  {
    title: 'ANIMAL SOUNDS',
    cells: [
      ['bark', 'dog barking'],
      ['meow', 'cat meowing'],
      ['purr', 'cat purring'],
      ['chirp', 'bird chirping'],
      ['hiss', 'snake hissing (friendly cartoon)'],
      ['growl', 'dog growling softly'],
      ['howl', 'wolf howling'],
      ['hoot', 'owl hooting'],
      ['honk', 'goose honking'],
    ],
  },
  {
    title: 'BRING HAUL',
    cells: [
      ['bring', 'kid bringing a gift box'],
      ['fetch', 'dog fetching a stick'],
      ['haul', 'kid hauling a wagon'],
      ['drag', 'kid dragging a heavy bag'],
      ['tug', 'kid tugging a rope'],
      ['yank', 'hand yanking a weed'],
      ['shove', 'hands shoving a box'],
      ['dump', 'dumping toys into a bin'],
      ['load', 'loading boxes into a truck'],
    ],
  },
  {
    title: 'GIVE SEND',
    cells: [
      ['give', 'hand giving an apple'],
      ['take', 'hand taking a cookie'],
      ['send', 'sending a letter in mailbox'],
      ['deliver', 'delivering a package to door'],
      ['lend', 'lending a pencil'],
      ['greet', 'kid waving hello to friend'],
      ['cheer', 'kid cheering with pompoms'],
      ['invite', 'hand holding invitation card (no text)'],
      ['gather', 'gathering fallen leaves'],
    ],
  },
  {
    title: 'CONNECT FIX',
    cells: [
      ['attach', 'attaching a clip to paper'],
      ['connect', 'connecting two puzzle pieces'],
      ['insert', 'inserting a plug into outlet'],
      ['unplug', 'unplugging a cord'],
      ['unscrew', 'unscrewing a jar lid'],
      ['mend', 'mending a sock with needle'],
      ['repair', 'repairing a toy with screwdriver'],
      ['knot', 'tying a knot in rope'],
      ['loop', 'looping a yarn loop'],
    ],
  },
  {
    title: 'CRAFT MARK',
    cells: [
      ['carve', 'carving wood with tool'],
      ['crochet', 'crocheting with hook'],
      ['sketch', 'sketching on paper'],
      ['outline', 'outlining a shape with pencil'],
      ['smudge', 'smudging charcoal on paper'],
      ['dab', 'dabbing paint with sponge'],
      ['dot', 'dotting paint with brush tip'],
      ['bead', 'stringing a bead'],
      ['weave', 'weaving on a small loom'],
    ],
  },
  {
    title: 'GARDEN NATURE',
    cells: [
      ['sow', 'sowing seeds in soil'],
      ['mulch', 'spreading mulch in garden'],
      ['prune', 'pruning a bush with shears'],
      ['till', 'tilling soil with hand tool'],
      ['unearth', 'unearthing a potato'],
      ['scatter', 'scattering birdseed'],
      ['shade', 'holding umbrella for shade'],
      ['flap', 'bird flapping wings'],
      ['flutter', 'butterfly fluttering'],
    ],
  },
  {
    title: 'AIR WATER',
    cells: [
      ['inflate', 'inflating a balloon'],
      ['deflate', 'deflating a balloon'],
      ['drip', 'water dripping from faucet'],
      ['leak', 'pipe leaking water drops'],
      ['squirt', 'squirting water from bottle'],
      ['pump', 'pumping a bike tire'],
      ['plunge', 'plunger plunging a sink'],
      ['wade', 'kid wading in shallow water'],
      ['breathe', 'kid taking a deep breath'],
    ],
  },
  {
    title: 'TRAVEL MOVE',
    cells: [
      ['board', 'boarding a bus'],
      ['land', 'plane landing (simple)'],
      ['steer', 'hands steering a wheel'],
      ['tow', 'tow truck towing a car'],
      ['trek', 'kid trekking with backpack'],
      ['cross', 'crossing a street at crosswalk'],
      ['enter', 'entering through a doorway'],
      ['arrive', 'arriving with suitcase'],
      ['leave', 'leaving through a door waving'],
    ],
  },
  {
    title: 'OFFICE HANDS',
    cells: [
      ['click', 'clicking a computer mouse'],
      ['type', 'typing on a keyboard'],
      ['print', 'printer printing paper'],
      ['scan', 'scanning a document'],
      ['file', 'filing papers in folder'],
      ['label', 'sticking a blank label on jar'],
      ['mark', 'marking a checkbox with pen'],
      ['copy', 'copying on a photocopier'],
      ['record', 'recording with a microphone'],
    ],
  },
  {
    title: 'SPORT PRESS',
    cells: [
      ['tackle', 'soft cartoon football tackle'],
      ['vault', 'kid vaulting over a bar'],
      ['trot', 'horse trotting'],
      ['stumble', 'kid stumbling (soft, not scary)'],
      ['raise', 'raising a flag on pole'],
      ['lower', 'lowering a blind'],
      ['press', 'pressing a big red button'],
      ['pop', 'popping a bubble'],
      ['burst', 'balloon bursting (soft cartoon)'],
    ],
  },
  {
    title: 'MORE ACTIONS',
    cells: [
      ['buy', 'buying fruit at a stall (no text/logos)'],
      ['mail', 'mailing a letter'],
      ['film', 'filming with a camera'],
      ['photograph', 'taking a photo with camera'],
      ['shave', 'shaving cream on face (playful)'],
      ['stroke', 'stroking a cat gently'],
      ['peck', 'bird pecking seeds'],
      ['gnaw', 'beaver gnawing wood'],
      ['track', 'tracking footprints'],
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
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 ACTION VERB icon sheets. Each cell = one clear picturable ACTION (simple kid-friendly figure and/or hands+object). Base-form verbs only. Skip abstracts / logos / text.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${sheets.length} PNGs.

This is picturable-verbs wave4 (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call).

Filename each PNG with the theme slug in the name (e.g. esl_action_verbs_sheet_01_animal_sounds.png) so import can match.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
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
      kind: 'picturable-verbs-wave4',
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
  kind: 'picturable-verbs-wave4',
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

if (DRY) {
  fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run', sheets: sheets.length, keys: keys.length, themes: sheets.map((s) => s.theme) }));
  process.exit(0);
}

if (fs.existsSync(outJson) && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  if (prev.task_id) {
    console.error('REFUSING already sent', prev.task_id);
    process.exit(2);
  }
}

apiKey();
const created = await createTask({
  title: `ESL white vocab 3×3: Shift60 picturable verbs wave4 (${sheets.length} sheets)`,
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
    { generatedAt: new Date().toISOString(), task_id: taskId, task_url: taskUrl, keys: keys.length, sheets: sheets.length },
    null,
    2
  )
);
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: taskUrl, keys: keys.length, sheets: sheets.length }, null, 2));
