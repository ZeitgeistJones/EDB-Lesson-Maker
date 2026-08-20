/**
 * SUPERSEDED — do not re-run. Gap crew: only ~9 drawable white gaps; Perfect-11 white was padding.
 * Already fired (padded): task 3to8ZmFvuFmbbDgNwtVg69
 * Use instead: scripts/manus/request-crew30-white-cleanup-wave2.mjs (List A, 1 sheet).
 *
 * Historical: Crew30 Perfect-11 WHITE vocab wave2 — 11× 3×3 still-lifes (deferred pets on sheet 1).
 *
 *   node scripts/manus/request-crew30-perfect11-white-wave2.mjs
 *   node scripts/manus/request-crew30-perfect11-white-wave2.mjs --dry-run
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

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-perfect11-white-wave2');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'W1',
    theme: 'pets-care-deferred',
    keys: [
      'leash',
      'pet-food',
      'toy',
      'collar',
      'litter-box',
      'pet-bed',
      'water-bowl',
      'pet-carrier',
      'scratching-post',
    ],
  },
  {
    id: 'W2',
    theme: 'family-home-objects',
    keys: [
      'home',
      'dinner',
      'family-photo',
      'sofa',
      'front-door',
      'house-key',
      'dining-table',
      'welcome-mat',
      'picture-frame',
    ],
  },
  {
    id: 'W3',
    theme: 'school-classroom-dense',
    keys: [
      'blackboard',
      'chalk',
      'desk',
      'globe',
      'ruler',
      'pencil-case',
      'backpack',
      'notebook',
      'eraser',
    ],
  },
  {
    id: 'W4',
    theme: 'kitchen-utensils-dense',
    keys: [
      'oven',
      'fridge',
      'kettle',
      'toaster',
      'blender',
      'mixing-bowl',
      'kitchen-knife',
      'cutting-board',
      'whisk',
    ],
  },
  {
    id: 'W5',
    theme: 'dino-museum-leftovers',
    keys: [
      'dino-egg',
      'footprint',
      'amber',
      'fern',
      'volcano',
      'fossil-brush',
      'dig-site-tent',
      'museum-display',
      'bone-fragment',
    ],
  },
  {
    id: 'W6',
    theme: 'clothes-accessories',
    keys: [
      'scarf',
      'belt',
      'gloves',
      'socks',
      'hat',
      'jacket',
      'boots',
      'umbrella',
      'sunglasses',
    ],
  },
  {
    id: 'W7',
    theme: 'birthday-party-extras',
    keys: [
      'balloon',
      'gift-box',
      'candle',
      'piñata',
      'party-plate',
      'confetti',
      'invitation-card',
      'party-cup',
      'ribbon-bow',
    ],
  },
  {
    id: 'W8',
    theme: 'b1-school-picturable',
    keys: [
      'deadline-calendar',
      'highlighter',
      'grade-report',
      'research-books',
      'feedback-sticky',
      'progress-chart',
      'study-lamp',
      'timer',
      'blank-quiz',
    ],
  },
  {
    id: 'W9',
    theme: 'money-shopping-objects',
    keys: [
      'wallet',
      'coins',
      'price-tag',
      'receipt',
      'shopping-bag',
      'cash-register',
      'piggy-bank',
      'barcode-scanner',
      'loyalty-card',
    ],
  },
  {
    id: 'W10',
    theme: 'farm-produce-objects',
    keys: [
      'carrot',
      'corn',
      'pumpkin',
      'wheat',
      'milk-pail',
      'pitchfork',
      'barn',
      'wheelbarrow',
      'hay-bale',
    ],
  },
  {
    id: 'W11',
    theme: 'sports-equipment-objects',
    keys: [
      'soccer-ball',
      'tennis-racket',
      'basketball',
      'whistle',
      'finish-line-flag',
      'relay-baton',
      'goal-net',
      'water-bottle',
      'sports-cone',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`PERFECT-11 WHITE VOCAB WAVE2 — ONE TASK, FULL LIST

Use esl-asset-generator to finish the WHOLE list in 3 batches (5+5+1). Do not stop after batch 1.

SOURCE OF TRUTH: Read /home/ubuntu/skills/esl-asset-generator/SKILL.md immediately. If this prompt conflicts with the skill, follow the skill.

MODE: White-background ESL vocabulary icon contact sheets for ClassIn match docks (07_vocab-pack). These are NOT black-field prop cutouts.

BATCHING (CRITICAL):
- This is ONE Manus task containing ALL 11 sheets below.
- The 5-image limit is PER generate_image CALL, NOT per task.
- Fire generate_image in 3 batches inside THIS task: sheets 1–5, then 6–10, then sheet 11.
- Keep working until every listed sheet PNG exists. Do not open a second Manus task.

HARD STYLE (all sheets — white vocab):
- Pure solid #FFFFFF field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even 3×3 grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- STILL-LIFE OBJECTS only — no kid-action scenes, no facial portraits, no full people figures.
- Must read clearly at small dock size (~96px).
- quality: default only (never high).
- Never pad with duplicates or off-theme fillers. Skip a weak cell rather than invent junk.

SHEET 1 — PETS CARE (DEFERRED GAPS — MUST INCLUDE) (3×3)
Reading order L→R, top→bottom:
1. leash — dog leash coiled / clipped
2. pet-food — pet food bag or kibble bowl (blank bag — no brand/letters)
3. toy — pet toy ball (or chew toy)
4. collar — pet collar with blank tag (no letters)
5. litter-box — cat litter box (empty-ish, no text)
6. pet-bed — round pet bed / cushion
7. water-bowl — pet water bowl
8. pet-carrier — plastic pet carrier crate
9. scratching-post — cat scratching post
Keys: leash, pet-food, toy, collar, litter-box, pet-bed, water-bowl, pet-carrier, scratching-post

SHEET 2 — FAMILY / HOME OBJECTS (3×3)
1. home — simple house exterior icon
2. dinner — plated dinner still-life (no people)
3. family-photo — blank picture frame with abstract silhouettes only (no faces detail)
4. sofa — living-room sofa
5. front-door — front door with doorknob
6. house-key — house key on a blank keyring
7. dining-table — empty dining table with chairs cue
8. welcome-mat — doormat (NO letters)
9. picture-frame — empty ornate frame
Keys: home, dinner, family-photo, sofa, front-door, house-key, dining-table, welcome-mat, picture-frame

SHEET 3 — SCHOOL CLASSROOM DENSE (3×3)
1. blackboard 2. chalk 3. desk 4. globe 5. ruler 6. pencil-case 7. backpack 8. notebook 9. eraser
Keys: blackboard, chalk, desk, globe, ruler, pencil-case, backpack, notebook, eraser

SHEET 4 — KITCHEN UTENSILS DENSE (3×3)
1. oven — real oven appliance (NOT oven mitt)
2. fridge 3. kettle 4. toaster 5. blender 6. mixing-bowl 7. kitchen-knife 8. cutting-board 9. whisk
Keys: oven, fridge, kettle, toaster, blender, mixing-bowl, kitchen-knife, cutting-board, whisk

SHEET 5 — DINO MUSEUM LEFTOVERS (3×3)
1. dino-egg 2. footprint 3. amber 4. fern 5. volcano 6. fossil-brush 7. dig-site-tent 8. museum-display 9. bone-fragment
Keys: dino-egg, footprint, amber, fern, volcano, fossil-brush, dig-site-tent, museum-display, bone-fragment

SHEET 6 — CLOTHES ACCESSORIES (3×3)
1. scarf 2. belt 3. gloves 4. socks 5. hat 6. jacket 7. boots 8. umbrella 9. sunglasses
Keys: scarf, belt, gloves, socks, hat, jacket, boots, umbrella, sunglasses

SHEET 7 — BIRTHDAY PARTY EXTRAS (3×3)
1. balloon 2. gift-box 3. candle 4. piñata 5. party-plate 6. confetti 7. invitation-card (blank, no text) 8. party-cup 9. ribbon-bow
Keys: balloon, gift-box, candle, piñata, party-plate, confetti, invitation-card, party-cup, ribbon-bow

SHEET 8 — B1 SCHOOL PICTURABLE STILL-LIFE (3×3)
Metaphors as objects only:
1. deadline-calendar — wall calendar with circled date (no readable numbers/letters if possible; abstract marks OK)
2. highlighter — highlighter pen
3. grade-report — folded blank report card (no letters/numbers)
4. research-books — stack of blank books
5. feedback-sticky — sticky notes pad (blank)
6. progress-chart — blank progress bars chart (no axis text)
7. study-lamp — desk study lamp
8. timer — kitchen/study timer
9. blank-quiz — blank quiz paper with empty bubbles (no letters)
Keys: deadline-calendar, highlighter, grade-report, research-books, feedback-sticky, progress-chart, study-lamp, timer, blank-quiz

SHEET 9 — MONEY / SHOPPING OBJECTS (3×3)
1. wallet 2. coins 3. price-tag (blank) 4. receipt (blank scribbles only) 5. shopping-bag 6. cash-register 7. piggy-bank 8. barcode-scanner 9. loyalty-card (blank)
Keys: wallet, coins, price-tag, receipt, shopping-bag, cash-register, piggy-bank, barcode-scanner, loyalty-card

SHEET 10 — FARM / PRODUCE OBJECTS (3×3)
1. carrot 2. corn 3. pumpkin 4. wheat 5. milk-pail 6. pitchfork 7. barn 8. wheelbarrow 9. hay-bale
Keys: carrot, corn, pumpkin, wheat, milk-pail, pitchfork, barn, wheelbarrow, hay-bale

SHEET 11 — SPORTS EQUIPMENT OBJECTS (3×3)
1. soccer-ball 2. tennis-racket 3. basketball 4. whistle 5. finish-line-flag 6. relay-baton 7. goal-net 8. water-bottle 9. sports-cone
Keys: soccer-ball, tennis-racket, basketball, whistle, finish-line-flag, relay-baton, goal-net, water-bottle, sports-cone

Deliver all 11 PNG sheets + a short chat legend per sheet (names only, not painted on art). Execute now.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  batch: '5+5+1 inside one createTask',
  deferred_covered: ['leash', 'pet-food', 'toy'],
  sheets: SHEETS,
  import_hint: Object.fromEntries(
    SHEETS.map((s) => [
      s.theme,
      `npm run assets:vocab-sheet -- <${s.theme}.png> --sheet --grid=3x3 --names=${s.keys.join(',')}`,
    ]),
  ),
  brief_starts_with: BRIEF.slice(0, 240),
};

if (fs.existsSync(OUT_JSON) && !DRY && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id) {
    console.error(`REFUSING duplicate white Perfect-11 — already have task ${prev.task_id}`);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run', out_dir: OUT_DIR, sheet_count: SHEETS.length }, null, 2));
  process.exit(0);
}

apiKey();
console.error(`Creating white Perfect-11 (ONE task, 5+5+1 inside)… profile=${profile}`);

const created = await createTask({
  title: 'ESL Perfect-11 white vocab wave2 (pets deferred + denser themes)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});

const taskId = created.task_id || created.id || null;
const dump = {
  ...dumpBase,
  task_id: taskId,
  task_url: created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null),
  task_url_alt: taskId ? `https://manus.im/app?taskId=${taskId}` : null,
  created,
  errors: [],
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));

console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: dump.task_url,
      sheet_count: SHEETS.length,
      deferred_covered: dump.deferred_covered,
      themes: SHEETS.map((s) => s.theme),
      out_dir: OUT_DIR,
    },
    null,
    2,
  ),
);
