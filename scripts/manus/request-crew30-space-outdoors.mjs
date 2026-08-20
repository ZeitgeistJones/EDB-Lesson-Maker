/**
 * Manus white-bg vocab 3×3s — crew30 space / camping-beach / weather OBJECT gaps.
 * Prefers Manus esl-asset-generator over ChatGPT for batch white vocab icons.
 *
 *   node scripts/manus/request-crew30-space-outdoors.mjs
 *   node scripts/manus/request-crew30-space-outdoors.mjs --dry-run
 *
 * Collect: open task_url, or later:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-space-outdoors
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-space-outdoors');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'C30-SO-1',
    theme: 'space-planetarium',
    keys: [
      'alien',
      'spaceship',
      'asteroid',
      'spacesuit',
      'orbit',
      'bubble',
      'constellation',
      'nebula',
      'solar-system',
    ],
  },
  {
    id: 'C30-SO-2',
    theme: 'camping-beach-transit',
    keys: [
      'camp',
      'canoe',
      'deckchair',
      'life-jacket',
      'ferry',
      'subway',
      'airport',
      'crosswalk',
      'sidewalk',
    ],
  },
  {
    id: 'C30-SO-3',
    theme: 'weather-winter',
    keys: [
      'thunder',
      'drizzle',
      'breeze',
      'sunny-day',
      'ice',
      'icicle',
      'forecast',
      'temperature',
      'winter',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

Crew30 OBJECT gaps — space / planetarium, camping / beach / transit, weather / winter. Prefer **OBJECT / still-life** icons over kid-activity / character-action scenes. Busy people scenes mush at ~96px dock size.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Prefer still-life / object metaphors; avoid multi-figure action scenes when a single object works.
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (3 images total — well under the ~5 images/call cap).

SHEET 1 — SPACE / PLANETARIUM (3×3) — still-life objects
Reading order L→R, top→bottom:
1. alien — simple cute alien creature icon (single figure OK as icon object; no scene)
2. spaceship — classic rocket / saucer still-life, alone
3. asteroid — rock with craters, alone
4. spacesuit — empty spacesuit / helmet+gloves still-life (no wearer face required)
5. orbit — planet with a clear elliptical ring path around it (orbit cue)
6. bubble — soap / air bubble (transparent sphere with highlight)
7. constellation — star pattern connected by thin lines (NO letters, NO constellation names)
8. nebula — soft colorful gas cloud / swirl
9. solar-system — simple small planets in a clear system arrangement (NO labels)
Keys: alien, spaceship, asteroid, spacesuit, orbit, bubble, constellation, nebula, solar-system

SHEET 2 — CAMPING / BEACH / TRANSIT (3×3) — still-life objects
Reading order L→R, top→bottom:
1. camp — tent icon (pitched tent still-life)
2. canoe — canoe / kayak hull alone
3. deckchair — folding beach / deck chair alone
4. life-jacket — orange life vest / PFD still-life
5. ferry — ferry boat silhouette / side view (no text on hull)
6. subway — subway / metro car icon (side or front, NO route letters/numbers)
7. airport — plane + terminal building silhouette (NO text / airline marks)
8. crosswalk — zebra-stripe crosswalk pavement still-life
9. sidewalk — sidewalk curb / pavement edge still-life
Keys: camp, canoe, deckchair, life-jacket, ferry, subway, airport, crosswalk, sidewalk

SHEET 3 — WEATHER / WINTER (3×3) — still-life objects
Reading order L→R, top→bottom:
1. thunder — lightning bolt + cloud (no text)
2. drizzle — light rain drops from a small cloud
3. breeze — leaf + wind motion lines (no people)
4. sunny-day — clear sun icon
5. ice — ice cube / ice block still-life
6. icicle — hanging icicle(s)
7. forecast — simple weather dial / gauge with blank face (NO letters, NO digits)
8. temperature — thermometer still-life (NO degree numbers / letters)
9. winter — snowflake + mitten still-life pair
Keys: thunder, drizzle, breeze, sunny-day, ice, icicle, forecast, temperature, winter

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
    space:
      'npm run assets:vocab-sheet -- <sheet1.png> --sheet --grid=3x3 --names=alien,spaceship,asteroid,spacesuit,orbit,bubble,constellation,nebula,solar-system',
    camping_beach:
      'npm run assets:vocab-sheet -- <sheet2.png> --sheet --grid=3x3 --names=camp,canoe,deckchair,life-jacket,ferry,subway,airport,crosswalk,sidewalk',
    weather:
      'npm run assets:vocab-sheet -- <sheet3.png> --sheet --grid=3x3 --names=thunder,drizzle,breeze,sunny-day,ice,icicle,forecast,temperature,winter',
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
let error = null;
try {
  created = await createTask({
    title: 'ESL white vocab 3×3: space + camping/beach + weather (crew30)',
    message: BRIEF,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
} catch (e) {
  error = {
    message: e?.message || String(e),
    stack: e?.stack || null,
  };
  const dumpFail = {
    ...dumpBase,
    error,
    task_id: null,
    task_url: null,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(dumpFail, null, 2));
  console.error(JSON.stringify({ phase: 'error', error: error.message }, null, 2));
  process.exit(1);
}

const taskId = created.task_id || created.id || null;
const dump = {
  ...dumpBase,
  task_id: taskId,
  task_url: created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null),
  task_url_alt: taskId ? `https://manus.im/app?taskId=${taskId}` : null,
  created,
  error: null,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'IMPORT-NOTES.md'),
  [
    '# White vocab space / outdoors / weather (Manus crew30)',
    '',
    `- task: ${dump.task_url || '(none)'}`,
    `- folder: tmp/manus-crew30-space-outdoors/`,
    '',
    '## Collect',
    '',
    '1. Open the Manus task URL and download the 3 PNG sheets, **or**',
    '2. `node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-space-outdoors`',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.space,
    dump.import_hint.camping_beach,
    dump.import_hint.weather,
    '```',
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
      out_json: OUT_JSON,
    },
    null,
    2,
  ),
);
