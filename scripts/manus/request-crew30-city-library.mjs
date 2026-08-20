/**
 * Manus white-bg vocab 3×3s — library + city/hospital + misc object gaps (crew30).
 * Flat vector OBJECTS / still-life only — people cells only if unavoidable.
 *
 *   node scripts/manus/request-crew30-city-library.mjs
 *   node scripts/manus/request-crew30-city-library.mjs --dry-run
 *
 * Collect: open task_url, or later:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-city-library
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-city-library');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'CL-S1',
    theme: 'library-objects',
    keys: [
      'bookmark',
      'magazine',
      'dictionary',
      'page',
      'cover',
      'whisper',
      'fairy-tale',
      'return',
      'borrow',
    ],
  },
  {
    id: 'CL-S2',
    theme: 'city-hospital-objects',
    keys: [
      'street',
      'restaurant',
      'waiting-room',
      'x-ray',
      'cast',
      'pole',
      'rescue',
      'dalmatian',
      'playground',
    ],
  },
  {
    id: 'CL-S3',
    theme: 'misc-party-pets-objects',
    keys: [
      'race',
      'screw',
      'tie',
      'streamer',
      'party-hat',
      'birthday-cake',
      'wish',
      'collect',
      'feather',
    ],
    deferred: ['leash', 'pet-food-bowl', 'toy-ball'],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

STILL-LIFE OBJECTS ONLY: every cell is a flat vector OBJECT / prop / building cue on white. Prefer object still-lifes over people (librarian → desk+stamp+books; baker → loaf+hat on hook; teammate → two blank jerseys). People / faces only if a cell is truly unavoidable — and even then keep it objectified / icon-like.
DO NOT paint any text, letters, numbers, logos, or brand marks in the art.
Skip shampoo (already covered). Sheet 3 uses **tie** in that slot.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (3 images total — under the ~5 images/call cap).

SHEET 1 — LIBRARY OBJECTS (3×3)
Reading order L→R, top→bottom:
1. bookmark — ribbon bookmark tucked in a closed book (no cover text)
2. magazine — stacked magazine with blank cover (no title, no letters)
3. dictionary — thick reference book, blank spine/cover (no letters)
4. page — open book showing blank pages (no writing)
5. cover — blank book cover standing / face-on (NO title text)
6. whisper — objectified finger-to-lips hush icon (hand cue OK; not a full person portrait)
7. fairy-tale — castle-in-an-open-book still life (storybook prop, no people)
8. return — book sliding into a library return slot / drop box
9. borrow — blank library card (NO text/numbers/barcode digits readable)
Keys: bookmark, magazine, dictionary, page, cover, whisper, fairy-tale, return, borrow

SHEET 2 — CITY / HOSPITAL OBJECTS (3×3)
Reading order L→R, top→bottom:
1. street — simple street / road with sidewalk cue (still-life, no crowds)
2. restaurant — storefront facade with awning (blank sign — no letters)
3. waiting-room — row of empty waiting-room chairs
4. x-ray — bone film / x-ray lightbox (silhouette bones OK; no labels)
5. cast — arm cast prop alone (no full patient body required)
6. pole — fire-station sliding pole
7. rescue — life ring / rescue buoy
8. dalmatian — dalmatian dog head (animal OK; not a firefighter person)
9. playground — slide silhouette as object (playground equipment still-life)
Keys: street, restaurant, waiting-room, x-ray, cast, pole, rescue, dalmatian, playground

SHEET 3 — MISC GAPS (party / tools / collect) (3×3)
Reading order L→R, top→bottom:
1. race — checkered racing flag
2. screw — hardware screw / bolt still-life
3. tie — necktie (necktie garment — NOT shampoo; shampoo already covered)
4. streamer — party streamer / ribbon coil
5. party-hat — cone party hat (blank, no text)
6. birthday-cake — birthday cake with candles (no writing on cake)
7. wish — single birthday candle / wish candle
8. collect — open stamp album (stamps as blank colored rectangles — NO letters)
9. feather — single feather
Keys: race, screw, tie, streamer, party-hat, birthday-cake, wish, collect, feather
(Deferred / do NOT generate this call: leash, pet-food bowl, toy ball.)

When done, return the 3 PNG sheets + a short chat legend per sheet (names only, not painted on art). No long essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  sheets: SHEETS,
  skip: {
    shampoo: 'already covered — sheet 3 slot uses tie',
  },
  deferred: {
    sheet3_overflow: ['leash', 'pet-food-bowl', 'toy-ball'],
  },
  import_hint: {
    library:
      'npm run assets:vocab-sheet -- <sheet1.png> --sheet --grid=3x3 --names=bookmark,magazine,dictionary,page,cover,whisper,fairy-tale,return,borrow',
    city_hospital:
      'npm run assets:vocab-sheet -- <sheet2.png> --sheet --grid=3x3 --names=street,restaurant,waiting-room,x-ray,cast,pole,rescue,dalmatian,playground',
    misc:
      'npm run assets:vocab-sheet -- <sheet3.png> --sheet --grid=3x3 --names=race,screw,tie,streamer,party-hat,birthday-cake,wish,collect,feather',
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

let created;
let errors = [];
try {
  created = await createTask({
    title: 'ESL white vocab 3×3: library + city/hospital + misc (crew30)',
    message: BRIEF,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
} catch (err) {
  errors.push(String(err && err.message ? err.message : err));
  const dumpErr = {
    ...dumpBase,
    task_id: null,
    task_url: null,
    errors,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(dumpErr, null, 2));
  console.error(JSON.stringify({ phase: 'error', errors }, null, 2));
  process.exit(1);
}

const taskId = created.task_id || created.id || null;
const dump = {
  ...dumpBase,
  task_id: taskId,
  task_url: created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null),
  task_url_alt: taskId ? `https://manus.im/app?taskId=${taskId}` : null,
  created,
  errors,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'IMPORT-NOTES.md'),
  [
    '# White vocab library + city/hospital + misc (Manus crew30)',
    '',
    `- task: ${dump.task_url || '(none)'}`,
    `- folder: tmp/manus-crew30-city-library/`,
    '',
    '## Collect',
    '',
    '1. Open the Manus task URL and download the 3 PNG sheets, **or**',
    '2. `node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-city-library`',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.library,
    dump.import_hint.city_hospital,
    dump.import_hint.misc,
    '```',
    '',
    'Deferred (not in this call): leash, pet-food-bowl, toy-ball.',
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
      sheets: SHEETS.map((s) => ({ id: s.id, theme: s.theme, keys: s.keys })),
      out_dir: OUT_DIR,
      run_json: OUT_JSON,
      errors,
    },
    null,
    2,
  ),
);
