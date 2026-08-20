/**
 * Shift60 — picturable ESL ACTION VERBS wave5 (white 3×3, Perfect-N).
 * Residual missing after wave1–4 pack import.
 *
 *   node scripts/manus/request-shift60-picturable-verbs-wave5.mjs           # dry-run
 *   node scripts/manus/request-shift60-picturable-verbs-wave5.mjs --send
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
];
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave5');
const CELLS = 9;

/**
 * Themed leftovers from picturable-verbs-missing after wave1–4.
 * Pack-filtered at runtime — already-hit keys drop out.
 */
const SHEET_DEFS = [
  {
    title: 'HUNT HIDE',
    cells: [
      ['hunt', 'kid with binoculars hunting (soft cartoon)'],
      ['bury', 'dog burying a bone'],
      ['camouflage', 'chameleon camouflaging on leaf'],
      ['disguise', 'kid in simple disguise glasses+hat'],
      ['slither', 'snake slithering'],
      ['spot', 'kid spotting a bird with finger'],
      ['explore', 'kid exploring with flashlight'],
      ['squeak', 'mouse squeaking'],
      ['pluck', 'hand plucking a flower'],
    ],
  },
  {
    title: 'FOOD TRIM',
    cells: [
      ['garnish', 'garnishing a plate with herb'],
      ['pit', 'pitting a cherry'],
      ['core', 'coring an apple'],
      ['trim', 'trimming hedges with shears'],
      ['remove', 'removing a sticker from paper'],
      ['shatter', 'glass jar shattering (soft cartoon)'],
      ['drape', 'draping a cloth over a table'],
      ['put', 'putting a book on a shelf'],
      ['make', 'making a sandwich'],
    ],
  },
  {
    title: 'MONEY TRADE',
    cells: [
      ['pay', 'paying with coins at a stall (no text)'],
      ['sell', 'selling fruit at a stall (no logos)'],
      ['spend', 'spending coins from a purse'],
      ['save', 'saving coins in a piggy bank'],
      ['relay', 'kids doing a relay baton pass'],
      ['aim', 'kid aiming a bow at target'],
      ['charge', 'charging a phone with cable'],
      ['mute', 'pressing mute on a remote'],
      ['tune', 'tuning a guitar peg'],
    ],
  },
  {
    title: 'SOCIAL WAIT',
    cells: [
      ['celebrate', 'kids celebrating with party hats'],
      ['meet', 'two kids meeting with handshake'],
      ['visit', 'kid visiting a house door'],
      ['talk', 'two kids talking'],
      ['choose', 'kid choosing between two toys'],
      ['curtsey', 'girl curtseying'],
      ['wait', 'kid waiting on a bench'],
      ['pause', 'hand pressing pause on a player'],
      ['start', 'kid starting a race at a line'],
    ],
  },
  {
    title: 'STOP SOUND',
    cells: [
      ['stop', 'hand stop gesture'],
      ['chime', 'wind chime chiming'],
      ['conduct', 'conductor conducting with baton'],
      ['lie', 'kid lying down on a mat (rest)'],
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

This is picturable-verbs wave5 (Shift60 residual). Keep working until EVERY listed sheet PNG exists (Perfect-${n} multi-call).

Filename each PNG with the theme slug in the name (e.g. esl_action_verbs_sheet_01_hunt_hide.png) so import can match.

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
      kind: 'picturable-verbs-wave5',
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
  kind: 'picturable-verbs-wave5',
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
  console.log(JSON.stringify({ phase: 'empty', message: 'no missing picturable verbs left for wave5' }));
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
  if (prev.task_id) {
    console.error('REFUSING already sent', prev.task_id);
    process.exit(2);
  }
}

apiKey();
const created = await createTask({
  title: `ESL white vocab 3×3: Shift60 picturable verbs wave5 (${sheets.length} sheets)`,
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
