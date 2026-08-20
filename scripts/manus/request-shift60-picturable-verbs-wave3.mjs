/**
 * Shift60 — picturable ESL ACTION VERBS wave3 (white 3×3).
 * Leftovers after wave1+2; pack-exact missing; skip hug/kids/parents/circle.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave3.mjs
 *   node scripts/manus/request-shift60-picturable-verbs-wave3.mjs --send
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
const SKIP = new Set(['hug', 'kids', 'parents', 'circle']);
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const PRIOR = [
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave1', 'all-keys.txt'),
  path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave2', 'all-keys.txt'),
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave3');
const CELLS = 9;

const SHEET_DEFS = [
  {
    title: 'FACE BODY',
    cells: [
      ['blink', 'eye blinking'],
      ['wink', 'eye winking'],
      ['frown', 'kid frowning'],
      ['hiccup', 'kid hiccuping'],
      ['hum', 'kid humming'],
      ['shrug', 'kid shrugging shoulders'],
      ['nudge', 'elbow nudging a friend'],
      ['poke', 'finger poking gently'],
      ['stomp', 'foot stomping'],
    ],
  },
  {
    title: 'MOVE FALL',
    cells: [
      ['limp', 'kid limping'],
      ['lean', 'kid leaning on a wall'],
      ['tilt', 'tilting head'],
      ['leap', 'kid leaping over a puddle'],
      ['tumble', 'kid tumbling on mat'],
      ['trip', 'kid tripping (soft cartoon)'],
      ['slip', 'kid slipping on banana peel (soft)'],
      ['skid', 'shoes skidding'],
      ['glide', 'kid gliding on ice'],
    ],
  },
  {
    title: 'SPORT STRETCH',
    cells: [
      ['lunge', 'kid doing a lunge stretch'],
      ['squat', 'kid squatting'],
      ['sway', 'kid swaying side to side'],
      ['twirl', 'kid twirling'],
      ['sneak', 'kid sneaking on tiptoes'],
      ['creep', 'kid creeping quietly'],
      ['squirm', 'kid squirming in a chair'],
      ['beckon', 'hand beckoning come here'],
      ['fasten', 'fastening a seatbelt'],
    ],
  },
  {
    title: 'EAT BREATH',
    cells: [
      ['sip', 'sipping from a cup'],
      ['lick', 'licking an ice cream'],
      ['nibble', 'nibbling a cracker'],
      ['inhale', 'kid inhaling deeply'],
      ['exhale', 'kid exhaling'],
      ['snore', 'kid snoring in bed'],
      ['nap', 'kid napping'],
      ['rest', 'kid resting on a couch'],
      ['gargle', 'kid gargling water'],
    ],
  },
  {
    title: 'KITCHEN MORE',
    cells: [
      ['strain', 'straining pasta'],
      ['sift', 'sifting flour'],
      ['sprinkle', 'sprinkling cheese'],
      ['ladle', 'ladling soup'],
      ['poach', 'poaching an egg'],
      ['heat', 'heating soup on stove'],
      ['mince', 'mincing garlic'],
      ['weigh', 'weighing fruit on scale'],
      ['measure', 'measuring flour in cup'],
    ],
  },
  {
    title: 'CLEAN CARE',
    cells: [
      ['wring', 'wringing a wet cloth'],
      ['fluff', 'fluffing a pillow'],
      ['buff', 'buffing a shoe'],
      ['shine', 'shining a shoe'],
      ['braid', 'braiding hair'],
      ['lace', 'lacing a shoe'],
      ['buckle', 'buckling a belt'],
      ['pin', 'pinning a badge'],
      ['shell', 'shelling a peanut'],
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

This is picturable-verbs wave3 (Shift60). Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call).

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
      kind: 'picturable-verbs-wave3',
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
  kind: 'picturable-verbs-wave3',
  sheet_count: sheets.length,
  keys,
  concepts,
  // Theme-tagged sheets so import-picturable-verbs can match PNG filenames.
  sheets: sheets.map((s) => ({
    id: s.id,
    theme: s.theme,
    title: s.title,
    keys: s.cells.map((c) => c[0]),
  })),
};

if (DRY) {
  fs.writeFileSync(outJson, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run', sheets: sheets.length, keys: keys.length }));
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
  title: `ESL white vocab 3×3: Shift60 picturable verbs wave3 (${sheets.length} sheets)`,
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
  JSON.stringify({ generatedAt: new Date().toISOString(), task_id: taskId, task_url: taskUrl, keys: keys.length }, null, 2)
);
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: taskUrl, keys: keys.length }, null, 2));
