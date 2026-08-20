/**
 * Shift60 — fire parallel Manus asset tasks for TRUE YLE/B1 drawable misses.
 *
 *   node scripts/manus/request-shift60-yle-b1-gaps.mjs
 *   node scripts/manus/request-shift60-yle-b1-gaps.mjs --dry-run
 *
 * Ledger: tmp/manus-shift60/tasks.json
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60');
const OUT_JSON = path.join(OUT_DIR, 'tasks.json');

/**
 * Quality vs quantity:
 * - Thin themes → full 3×3 white nets
 * - Kitchen/sports already dense in PropBank → smaller black sheet only for true misses
 * - No abstracts (achieve/afford/budget/…)
 */
const TASKS = [
  {
    id: 'S60-W1',
    kind: 'white-vocab',
    title: 'ESL white vocab 3×3: YLE animal/bug misses',
    sheets: [
      {
        id: 'W1',
        theme: 'yle-animals-bugs',
        grid: '3x3',
        keys: [
          'beetle',
          'lizard',
          'snail',
          'eagle',
          'swan',
          'tortoise',
          'mosquito',
          'grasshopper',
          'ladybird',
        ],
      },
    ],
    briefBody: `TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

STILL-LIFE / OBJECT ONLY: flat vector animals on white. ONE animal per cell. NO people, NO scenes with landscape clutter, NO text in art.

DON'T HYPERFIXATE: if one cell won't come clean, SKIP it and deliver the rest. Never pad with duplicates.

HARD STYLE:
- Pure solid **#FFFFFF** field edge to edge
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji
- ZERO text/letters/numbers/logos/brand marks
- Must read clearly at ~96px dock size
- quality: default only (never high)
- Deliver **1 PNG** + chat legend (names only)

SHEET — YLE ANIMAL / BUG MISSES (3×3) L→R, top→bottom:
1. beetle — recognizable beetle insect, top view or 3/4
2. lizard — small lizard / gecko silhouette, clear legs+tail
3. snail — snail with shell
4. eagle — eagle bird (not generic songbird) — hooked beak / broad wings cue
5. swan — white swan with curved neck
6. tortoise — tortoise (domed shell, not sea turtle flippers)
7. mosquito — mosquito insect with long legs/proboscis (still readable small)
8. grasshopper — grasshopper / cricket-like insect with long hind legs
9. ladybird — ladybug / ladybird with spots (no numbers on spots)
Keys: beetle, lizard, snail, eagle, swan, tortoise, mosquito, grasshopper, ladybird`,
  },
  {
    id: 'S60-W2',
    kind: 'white-vocab',
    title: 'ESL white vocab 3×3: YLE food + school misses',
    sheets: [
      {
        id: 'W2',
        theme: 'yle-food-school',
        grid: '3x3',
        keys: [
          'biscuit',
          'chopsticks',
          'sausage',
          'yoghurt',
          'spice',
          'cartoon',
          'diary',
          'comic',
          'night-sky',
        ],
      },
    ],
    briefBody: `TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). NOT black-field props.

STILL-LIFE OBJECTS only on white. NO people. NO text/letters/numbers/logos in the art (blank covers / blank jars).

HARD STYLE: #FFFFFF field, even 3×3, one subject/cell, flat educational vector, quality: default only. Deliver 1 PNG + chat legend.

SHEET — YLE FOOD + SCHOOL MISSES (3×3):
1. biscuit — round biscuit / cookie (UK biscuit), plain, no brand
2. chopsticks — pair of chopsticks (object only)
3. sausage — linked sausages or single sausage still-life
4. yoghurt — yoghurt pot / cup with spoon (BLANK label — no letters)
5. spice — spice jar + scattered spice (BLANK jar label)
6. cartoon — TV screen showing simple cartoon shapes ONLY (no letters, no logos, no readable speech bubbles)
7. diary — closed diary / journal with blank cover + maybe a bookmark ribbon (NO writing)
8. comic — comic book / magazine closed, blank cover art shapes only (NO text, NO speech bubbles with letters)
9. night-sky — night sky still-life: dark sky with moon + stars (no frame border, no text)
Keys: biscuit, chopsticks, sausage, yoghurt, spice, cartoon, diary, comic, night-sky`,
  },
  {
    id: 'S60-W3',
    kind: 'white-vocab',
    title: 'ESL white vocab 3×3: YLE body + clothes misses',
    sheets: [
      {
        id: 'W3',
        theme: 'yle-body-clothes',
        grid: '3x3',
        keys: [
          'elbow',
          'ankle',
          'toe',
          'wrist',
          'moustache',
          'beard',
          'pyjamas',
          'earring',
          'fingernail',
        ],
      },
    ],
    briefBody: `TASK: Produce **white-background** ESL vocabulary icons for ClassIn (\`07_vocab-pack\`). NOT black props.

BODY-PART / CLOTHES still-life icons on white. Prefer isolated body-part diagrams or clothing objects — NOT full people portraits. NO text in art.

HARD STYLE: #FFFFFF, even 3×3, flat vector, quality: default only. Deliver 1 PNG + chat legend.

SHEET — YLE BODY + CLOTHES MISSES (3×3):
1. elbow — bent arm highlighting elbow joint (crop, not full person)
2. ankle — foot/lower-leg crop highlighting ankle
3. toe — foot crop focusing on toes
4. wrist — hand/forearm crop highlighting wrist (+ optional blank watch)
5. moustache — standalone moustache prop (no full face)
6. beard — standalone beard prop (no full face)
7. pyjamas — folded pyjama set / PJs (blank fabric patterns, no logos/text)
8. earring — single earring jewellery object
9. fingernail — hand crop focusing on fingernail / nail
Keys: elbow, ankle, toe, wrist, moustache, beard, pyjamas, earring, fingernail`,
  },
  {
    id: 'S60-W4',
    kind: 'white-vocab',
    title: 'ESL white vocab 2×3×3: YLE travel/winter + B1 objects',
    sheets: [
      {
        id: 'W4a',
        theme: 'yle-travel-winter',
        grid: '3x3',
        keys: [
          'lorry',
          'yacht',
          'festival',
          'exit',
          'entrance',
          'roundabout',
          'skis',
          'sledge',
          'palace',
        ],
      },
      {
        id: 'W4b',
        theme: 'b1-home-objects',
        grid: '3x3',
        keys: [
          'brochure',
          'carpet',
          'cheque',
          'cushion',
          'dishwasher',
          'drawer',
          'grill',
          'hairdryer',
          'saucepan',
        ],
      },
    ],
    briefBody: `TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn (\`07_vocab-pack\`). NOT black-field props.

STILL-LIFE OBJECTS only. NO people. ZERO text/letters/numbers/logos painted in art (exit/entrance may use a door/archway icon WITHOUT the word EXIT; cheque is a blank slip with lines only — no currency numbers or bank names).

HARD STYLE: #FFFFFF, even 3×3 each sheet, flat educational vector, quality: default only.
Deliver **2 PNGs** (well under ~5 images/call) + chat legends.

SHEET 1 — YLE TRAVEL / WINTER (3×3):
1. lorry — UK lorry / box truck (not a small car)
2. yacht — yacht / sailboat
3. festival — festival still-life: bunting flags + blank stage/tent cue (no text on banners)
4. exit — doorway with exit arrow SYMBOL only (chevron/arrow shape — NO letters)
5. entrance — arched entrance / gate (no letters)
6. roundabout — road roundabout / traffic circle icon (blank road, no text signs)
7. skis — pair of skis (+ optional poles), object still-life
8. sledge — sled / sledge
9. palace — palace / ornate building icon (distinct from generic house)
Keys: lorry, yacht, festival, exit, entrance, roundabout, skis, sledge, palace

SHEET 2 — B1 HOME / DAILY OBJECTS (3×3) — drawable subset only:
1. brochure — folded brochure / leaflet (BLANK panels — no text)
2. carpet — rolled or rectangular carpet / rug
3. cheque — blank cheque / check slip (lines only; NO numbers, NO bank name, NO signature text)
4. cushion — throw cushion / pillow
5. dishwasher — dishwasher appliance (blank panel, no brand)
6. drawer — open drawer / dresser drawer
7. grill — barbecue grill / BBQ
8. hairdryer — hair dryer appliance
9. saucepan — saucepan with lid
Keys: brochure, carpet, cheque, cushion, dishwasher, drawer, grill, hairdryer, saucepan`,
  },
  {
    id: 'S60-W5',
    kind: 'white-vocab',
    title: 'ESL white vocab 3×3: B1 leftovers + place bits',
    sheets: [
      {
        id: 'W5',
        theme: 'b1-yle-leftovers',
        grid: '3x3',
        keys: [
          'perfume',
          'switch',
          'telephone',
          'tap',
          'toast',
          'petrol',
          'garage',
          'motorway',
          'crossroads',
          // 9th — timetable (still-life blank schedule board WITHOUT readable text)
        ],
      },
    ],
    briefBody: `TASK: Produce **white-background** ESL vocabulary icons for ClassIn (\`07_vocab-pack\`).

STILL-LIFE only. NO people. ZERO readable text/letters/numbers/logos in art.

HARD STYLE: #FFFFFF, even 3×3, flat vector, quality: default only. Deliver 1 PNG + chat legend.

SHEET — B1 / YLE LEFTOVER OBJECTS (3×3):
1. perfume — perfume bottle (blank label)
2. switch — light switch on wall plate
3. telephone — classic telephone OR modern handset (no brand, no keypad numbers painted as readable digits — blank keypad bumps OK)
4. tap — water tap / faucet (kitchen/bath)
5. toast — slice(s) of toast on a plate (NOT a toaster appliance)
6. petrol — petrol pump / fuel pump (blank display, no prices/letters)
7. garage — garage building with door
8. motorway — multi-lane motorway / highway icon (no text signs)
9. crossroads — road crossroads / intersection icon (no text)
Keys: perfume, switch, telephone, tap, toast, petrol, garage, motorway, crossroads

NOTE: Do NOT draw abstract B1 words (achieve, afford, budget, worth, prioritize, etc.).`,
  },
  {
    id: 'S60-B1',
    kind: 'black-props',
    title: 'ESL black props 4×4: winter sports + tableware + insects (true misses)',
    sheets: [
      {
        id: 'B1',
        theme: 'winter-tableware-insects',
        grid: '4x4',
        keys: [
          'chopsticks',
          'skis',
          'ski-pole',
          'sledge',
          'snowboard',
          'yacht',
          'beetle',
          'snail',
          'lizard',
          'eagle',
          'diary',
          'comic-book',
          'exit-sign-symbol',
          'roundabout',
          'lorry',
          'palace-tower',
        ],
      },
    ],
    briefBody: `TASK: Produce **ONE black-field** prop contact sheet for ClassIn PropBank docks (\`09_props\`).

Mode: black cutout pack. NOT white vocab icons.

SCOPE IS SMALL ON PURPOSE — kitchen/sports packs are already dense. Only these TRUE misses. Do not pad with duplicates of common kitchen tools or soccer gear.

HARD RULES:
- quality: default only (never high)
- VOID BLACK (#000000) background edge to edge
- True even **4×4** grid (16 cells). ONE object per cell, centered, margin inside cell
- No grey grid/graph paper/labels painted on the sheet
- Flat matte educational vector. NOT photo, NOT glossy emoji
- OBJECTS only — NO people
- ZERO text/letters/numbers/logos/brand marks (exit is arrow/chevron symbol only)
- Deliver **1 PNG** + chat legend

SHEET — WINTER / TABLEWARE / INSECTS / TRAVEL MISSES (4×4) L→R top→bottom:
1. chopsticks
2. skis (pair)
3. ski-pole
4. sledge
5. snowboard
6. yacht
7. beetle
8. snail
9. lizard
10. eagle
11. diary (blank cover)
12. comic-book (blank cover shapes, no letters)
13. exit-sign-symbol (arrow/door glyph, NO letters)
14. roundabout (traffic circle object/icon)
15. lorry
16. palace-tower (tower/palace chunk as dock prop)
Keys: chopsticks, skis, ski-pole, sledge, snowboard, yacht, beetle, snail, lizard, eagle, diary, comic-book, exit-sign-symbol, roundabout, lorry, palace-tower`,
  },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];

const ledger = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  goal: 'Seize Manus free window — true YLE/B1 drawable misses only',
  skip_abstracts: true,
  tasks: [],
  errors: [],
};

if (DRY) {
  for (const t of TASKS) {
    ledger.tasks.push({
      id: t.id,
      kind: t.kind,
      title: t.title,
      sheets: t.sheets,
      dry_run: true,
      brief_preview: withEslAssetGeneratorBrief(t.briefBody).slice(0, 240),
    });
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(ledger, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, 'briefs-dry.json'),
    JSON.stringify(
      TASKS.map((t) => ({
        id: t.id,
        brief: withEslAssetGeneratorBrief(t.briefBody),
      })),
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { phase: 'dry-run', out: OUT_JSON, task_count: TASKS.length },
      null,
      2,
    ),
  );
  process.exit(0);
}

apiKey();
console.error(`Firing ${TASKS.length} parallel Manus asset tasks… profile=${profile}`);

const results = await Promise.all(
  TASKS.map(async (t) => {
    try {
      const brief = withEslAssetGeneratorBrief(t.briefBody);
      const created = await createTask({
        title: t.title,
        message: brief,
        agent_profile: profile,
        force_skills: force,
        hide_in_task_list: false,
        interactive_mode: false,
      });
      const row = {
        id: t.id,
        kind: t.kind,
        title: t.title,
        sheets: t.sheets,
        task_id: created.task_id,
        task_url: created.task_url || `https://manus.im/app/${created.task_id}`,
        created,
      };
      console.error(`OK ${t.id} → ${row.task_id}`);
      return { ok: true, row };
    } catch (err) {
      console.error(`FAIL ${t.id}: ${err.message}`);
      return { ok: false, id: t.id, error: String(err.message || err) };
    }
  }),
);

for (const r of results) {
  if (r.ok) ledger.tasks.push(r.row);
  else ledger.errors.push({ id: r.id, error: r.error });
}

fs.writeFileSync(OUT_JSON, JSON.stringify(ledger, null, 2));

const readme = `# Manus Shift60 — YLE/B1 drawable gaps

Started: ${ledger.started_at}
Profile: ${profile}
Quality: default only

## Goal
Seize Manus free asset window for **true misses** (YLE leftovers + B1 object-only).
No abstract B1 (achieve/afford/budget/…).

## Tasks
${ledger.tasks
  .map(
    (t) =>
      `- **${t.id}** (${t.kind}) \`${t.task_id}\` — ${t.task_url}\\n  sheets: ${(t.sheets || [])
        .map((s) => s.theme + '[' + s.keys.join(',') + ']')
        .join(' | ')}`,
  )
  .join('\n')}

${
  ledger.errors.length
    ? `## Errors\n${ledger.errors.map((e) => `- ${e.id}: ${e.error}`).join('\n')}`
    : ''
}

## Collect
\`\`\`
node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-shift60/fetch/<id>
\`\`\`
White → \`npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=...\`
Black → label + \`assets:import-sheet\` with \`--grid=4x4\`
`;

fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme);
console.log(
  JSON.stringify(
    {
      phase: 'fired',
      ok: ledger.tasks.length,
      fail: ledger.errors.length,
      tasks: ledger.tasks.map((t) => ({
        id: t.id,
        task_id: t.task_id,
        url: t.task_url,
      })),
      out: OUT_JSON,
    },
    null,
    2,
  ),
);
