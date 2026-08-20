/**
 * Manus white-bg vocab 3×3s — crew30 cafe / bathroom / routines OBJECT gaps.
 * Prefers Manus esl-asset-generator over ChatGPT for batch white vocab icons.
 *
 *   node scripts/manus/request-crew30-cafe-routines.mjs
 *   node scripts/manus/request-crew30-cafe-routines.mjs --dry-run
 *
 * Collect: open task_url, or later:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-cafe-routines
 * Import each sheet:
 *   npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=...
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-cafe-routines');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'CR1',
    theme: 'cafe-kitchen-objects',
    keys: [
      'espresso',
      'pastry',
      'sugar',
      'order',
      'takeout',
      'salt',
      'cup',
      'napkin',
      'menu',
    ],
  },
  {
    id: 'CR2',
    theme: 'bathroom-leftovers',
    keys: [
      'shampoo',
      'scale',
      'brush-teeth',
      'soap-dispenser',
      'comb',
      'hairbrush',
      'razor',
      'mouthwash',
      'loofah',
    ],
  },
  {
    id: 'CR3',
    theme: 'routines-cafe-fill',
    keys: [
      'wake-up',
      'get-up',
      'get-dressed',
      'eat-breakfast',
      'have-dinner',
      'croissant',
      'latte',
      'sugar-packet',
      'wash-face',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

Cafe / kitchen / bathroom / morning-routines **OBJECT** gaps. Prefer unmistakable still-life icons. NO kids doing actions. Busy people scenes mush at ~96px dock size.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Still-life / object metaphors ONLY — no kids brushing teeth, waking up, getting dressed, eating, or washing.
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (3 images total — well under the ~5 images/call cap).

SHEET 1 — CAFE / KITCHEN OBJECTS (3×3)
Reading order L→R, top→bottom:
1. espresso — small espresso cup with crema foam (no brand, no letters)
2. pastry — danish / turnover pastry (distinct from a plain croissant)
3. sugar — sugar jar OR sugar cubes in a dish (no writing on jar)
4. order — blank order-ticket spike / ticket stand (tickets blank — NO letters/numbers)
5. takeout — takeout bag OR takeout box (blank, no logos)
6. salt — classic salt shaker
7. cup — simple empty drinking cup / mug (distinct from espresso)
8. napkin — neat napkin stack
9. menu — blank closed menu card / folder (NO letters, NO prices)
Keys: espresso, pastry, sugar, order, takeout, salt, cup, napkin, menu

SHEET 2 — BATHROOM LEFTOVERS (3×3) — objects only
Reading order L→R, top→bottom:
1. shampoo — shampoo bottle (blank label, no brand text)
2. scale — bathroom floor scale (NO digits on display)
3. brush-teeth — toothbrush + toothpaste tube together as ONE still-life (conceptual "brush teeth"; NO kid brushing)
4. soap-dispenser — pump soap dispenser (blank, no brand)
5. comb — hair comb alone
6. hairbrush — hairbrush alone (distinct from comb)
7. razor — simple safety razor (kid-safe toy-like, not bloody / not scary)
8. mouthwash — mouthwash bottle (blank label, no brand text)
9. loofah — bath loofah / sponge
Keys: shampoo, scale, brush-teeth, soap-dispenser, comb, hairbrush, razor, mouthwash, loofah

SHEET 3 — ROUTINES STILL-LIFES + CAFE FILL (3×3) — NO kids / NO action scenes
Reading order L→R, top→bottom:
1. wake-up — alarm clock (NO numbers on face — hands only)
2. get-up — rumpled bed + slippers beside it (empty bed; no person)
3. get-dressed — folded clothes pile + hanger (no person dressing)
4. eat-breakfast — toast + juice glass still life (no person eating)
5. have-dinner — plate + fork still life (no person eating)
6. croissant — croissant pastry (distinct from Sheet 1 pastry)
7. latte — cup with latte-art foam swirl (no text on cup)
8. sugar-packet — blank sugar packet (NO letters)
9. wash-face — washcloth + small basin / face-cream jar still life (no person washing)
Keys: wake-up, get-up, get-dressed, eat-breakfast, have-dinner, croissant, latte, sugar-packet, wash-face

When done, return the 3 PNG sheets + a short chat legend per sheet (names only, not painted on art). No long essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  sheets: SHEETS,
  import_hint: {
    cafe:
      'npm run assets:vocab-sheet -- <sheet1.png> --sheet --grid=3x3 --names=espresso,pastry,sugar,order,takeout,salt,cup,napkin,menu',
    bathroom:
      'npm run assets:vocab-sheet -- <sheet2.png> --sheet --grid=3x3 --names=shampoo,scale,brush-teeth,soap-dispenser,comb,hairbrush,razor,mouthwash,loofah',
    routines:
      'npm run assets:vocab-sheet -- <sheet3.png> --sheet --grid=3x3 --names=wake-up,get-up,get-dressed,eat-breakfast,have-dinner,croissant,latte,sugar-packet,wash-face',
    note: 'Sheet 2 fill cells (comb/hairbrush/razor/mouthwash/loofah) are bathroom leftover objects to complete the 3×3. Sheet 3 wash-face is routines still-life fill.',
  },
  brief_starts_with: BRIEF.slice(0, 200),
};

if (DRY) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2),
  );
  console.log(
    JSON.stringify(
      { phase: 'dry-run', out_dir: OUT_DIR, sheet_count: SHEETS.length },
      null,
      2,
    ),
  );
  process.exit(0);
}

apiKey();
console.error(`Creating white vocab Manus task… profile=${profile}`);

const created = await createTask({
  title: 'ESL white vocab 3×3: cafe + bathroom + routines objects',
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
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'IMPORT-NOTES.md'),
  [
    '# White vocab cafe + bathroom + routines (Manus crew30)',
    '',
    `- task: ${dump.task_url || '(none)'}`,
    `- folder: tmp/manus-crew30-cafe-routines/`,
    '',
    '## Collect',
    '',
    '1. Open the Manus task URL and download the 3 PNG sheets, **or**',
    '2. `node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-cafe-routines`',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.cafe,
    dump.import_hint.bathroom,
    dump.import_hint.routines,
    '```',
    '',
    dump.import_hint.note,
    '',
  ].join('\n'),
);

console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: dump.task_url,
      sheet_count: SHEETS.length,
      out_dir: OUT_DIR,
    },
    null,
    2,
  ),
);
