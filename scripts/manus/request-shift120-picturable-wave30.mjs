/**
 * Shift120 wave30 — highest-leverage WHITE vocab 3×3 still-lifes (coverage gaps + kitchen densify).
 * Kitchen Helpers core (whisk/spatula/blender/timer/apron/bowl/knife/spoon) already banked — skipped.
 * grater exists as grater-icon (wire alias; do not remake).
 *
 *   node scripts/manus/request-shift120-picturable-wave30.mjs
 *   node scripts/manus/request-shift120-picturable-wave30.mjs --dry-run
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
  fileContentPart,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave30');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const DENY_MD = path.join(ROOT, 'tmp', 'bank-denylist', 'ALREADY_IN_BANK.md');
const PROMPT_FALLBACK = path.join(OUT_DIR, 'PROMPT.md');

const SHEETS = [
  {
    id: 'W1',
    theme: 'coverage-party-cafe-camp-winter',
    keys: [
      'birthday-card',
      'wrapped-present',
      'party-bag',
      'candle-cake',
      'birthday-balloon',
      'whipped-cream',
      'cream-carton',
      'snowball',
      'marshmallow',
    ],
  },
  {
    id: 'W2',
    theme: 'coverage-places-travel-jewelry',
    keys: [
      'boarding-gate',
      'hotel-room',
      'classroom',
      'clinic-building',
      'planetarium-dome',
      'jewelry',
      'bracelet',
      'earrings',
      'hotel-key',
    ],
  },
  {
    id: 'W3',
    theme: 'kitchen-densify-exact-keys',
    keys: [
      'wooden-spoon',
      'can-opener',
      'salt-shaker',
      'pepper-shaker',
      'spice-jar',
      'oil-bottle',
      'microwave',
      'refrigerator',
      'wok',
    ],
  },
];

const BRIEF_BODY = `TASK: White-background ESL vocab 3×3 still-life icon sheets (07_vocab-pack). OBJECTS only.

HARD RULES:
- Attach ALREADY_IN_BANK.md is the denylist — SKIP / DO NOT GENERATE any key already listed there.
- Kitchen Helpers core already banked: whisk, spatula, blender, timer, apron, bowl, knife, spoon — do NOT remake.
- grater already exists as grater-icon — do NOT remake grater.
- STILL-LIFE objects only. NO kid-action scenes, NO people doing things, NO frames-around-art, ZERO text/letters/numbers/logos.
- solid #FFFFFF field; true even 3×3; one subject per cell; flat educational vector; quality: default ONLY (never high).
- Deliver exactly 3 PNG sheets (5+5+1 generate_image budget is irrelevant here — 3 sheets fits one batch, but if you must split calls keep them inside THIS task).

SHEET 1 — PARTY / CAFE / CAMP / WINTER (coverage object gaps) L→R top→bottom:
1. birthday-card — blank greeting card with bow (no writing)
2. wrapped-present — wrapped gift box with ribbon
3. party-bag — party favor / goody bag
4. candle-cake — small cake with candles (no numbers/letters on cake)
5. birthday-balloon — single balloon with string
6. whipped-cream — whipped cream swirl / dollop in bowl
7. cream-carton — cream carton blank (no brand/text)
8. snowball — round snowball
9. marshmallow — marshmallow(s) still-life
Keys: birthday-card,wrapped-present,party-bag,candle-cake,birthday-balloon,whipped-cream,cream-carton,snowball,marshmallow

SHEET 2 — PLACES / TRAVEL / JEWELRY (coverage object gaps):
1. boarding-gate — airport boarding gate desk/jetway cue (no text/flight numbers)
2. hotel-room — simple hotel room still-life (bed + lamp arrangement as ONE icon)
3. classroom — classroom still-life (desks + board arrangement, blank board, no writing)
4. clinic-building — small clinic building exterior (cross symbol OK if not text)
5. planetarium-dome — planetarium dome building
6. jewelry — jewelry tray still-life (mixed small pieces, no gem labels)
7. bracelet — bracelet
8. earrings — pair of earrings
9. hotel-key — hotel key / keycard blank (no text/numbers)
Keys: boarding-gate,hotel-room,classroom,clinic-building,planetarium-dome,jewelry,bracelet,earrings,hotel-key

SHEET 3 — KITCHEN DENSIFY (exact-key white icons still missing; NOT Helpers core remakes):
1. wooden-spoon — wooden spoon
2. can-opener — manual can opener
3. salt-shaker — salt shaker (no S / no text)
4. pepper-shaker — pepper shaker (no P / no text)
5. spice-jar — spice jar blank label
6. oil-bottle — cooking oil bottle blank
7. microwave — microwave oven (blank display, no digits)
8. refrigerator — refrigerator
9. wok — wok pan
Keys: wooden-spoon,can-opener,salt-shaker,pepper-shaker,spice-jar,oil-bottle,microwave,refrigerator,wok

Return 3 PNGs + short legends. No essay.`;

const BRIEF = withEslAssetGeneratorBrief(BRIEF_BODY);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  wave: 30,
  sheets: SHEETS,
  denylist: 'tmp/bank-denylist/ALREADY_IN_BANK.md',
  kitchen_helpers_note:
    'whisk/spatula/blender/timer/apron/bowl/knife/spoon banked; grater→grater-icon exists (alias, do not remake)',
};

if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING — already created', prev.task_id, prev.task_url || '');
    process.exit(2);
  }
}

fs.writeFileSync(
  PROMPT_FALLBACK,
  [
    '# Wave30 white vocab prompt (fallback if API missing)',
    '',
    dumpBase.kitchen_helpers_note,
    '',
    'Sheets:',
    ...SHEETS.map((s) => `- ${s.id} ${s.theme}: ${s.keys.join(', ')}`),
    '',
    '--- BRIEF ---',
    '',
    BRIEF,
    '',
  ].join('\n'),
);

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry_run', out: OUT_JSON, prompt: PROMPT_FALLBACK }, null, 2));
  process.exit(0);
}

if (!fs.existsSync(DENY_MD)) {
  console.error('Missing denylist. Run: node scripts/export-bank-denylist.mjs');
  process.exit(1);
}

try {
  apiKey();
} catch (err) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ ...dumpBase, wall: 'MANUS_API_KEY missing', brief: BRIEF, prompt: PROMPT_FALLBACK }, null, 2),
  );
  console.error('WALL: MANUS_API_KEY missing — wrote', PROMPT_FALLBACK);
  console.error(String(err && err.message ? err.message : err));
  process.exit(3);
}

const denyPart = await fileContentPart(DENY_MD);
const { via, bytes, ...denyContent } = denyPart;
void via;
void bytes;

const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 wave30 (coverage gaps + kitchen densify)',
  message: {
    content: [
      { type: 'text', text: BRIEF },
      denyContent,
    ],
  },
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});

const taskId = created.task_id || created.id || null;
const taskUrl = created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null);
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    {
      ...dumpBase,
      task_id: taskId,
      task_url: taskUrl,
      deny_attach: { filename: denyPart.filename, via: denyPart.via, bytes: denyPart.bytes },
      created,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: taskUrl,
      sheets: SHEETS.length,
      keys: SHEETS.flatMap((s) => s.keys),
      denylist: 'ALREADY_IN_BANK.md attached',
    },
    null,
    2,
  ),
);
