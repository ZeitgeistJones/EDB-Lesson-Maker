/**
 * Manus white-bg vocab 3×3s — B1 still-life object sheets (crew30).
 * Flat vector OBJECTS only — no kid-action scenes, no abstract metaphors.
 *
 *   node scripts/manus/request-crew30-b1-stilllife.mjs
 *   node scripts/manus/request-crew30-b1-stilllife.mjs --dry-run
 *
 * Collect: open task_url, or later:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-b1-stilllife
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-b1-stilllife');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'B1-S1',
    theme: 'b1-environment-school-stilllife',
    keys: [
      'assignment',
      'container',
      'gear',
      'hike',
      'landfill',
      'litter',
      'pollution',
      'presentation',
      'recycle',
    ],
  },
  {
    id: 'B1-S2',
    theme: 'b1-nature-desk-stilllife',
    keys: [
      'scenery',
      'snooze',
      'sunrise',
      'wilderness',
      'lamp',
      'bookmark',
      'paintbrush',
      'steam',
      'sugar',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

STILL-LIFE ONLY: every cell is a flat vector OBJECT / prop arrangement on white. NO kid-action scenes, NO people doing things, NO facial portraits. Metaphors must be drawable still-life props.

DO NOT commission abstract / non-picturable words (worth, prioritize, commute, etc.). Only the keys listed below.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (2 images total — well under the ~5 images/call cap).

SHEET 1 — ENVIRONMENT / SCHOOL STILL-LIFE (3×3)
Reading order L→R, top→bottom:
1. assignment — clipboard with blank papers stacked (no writing)
2. container — recycle bin OR simple storage box (blank, no labels)
3. gear — packed outdoor kit laid out flat (boots/bottle/rope cues as still-life)
4. hike — hiking boots + trail marker post (no text on marker)
5. landfill — trash mound behind a simple fence (still-life, no people)
6. litter — scattered wrappers / cans on ground as still-life (no people)
7. pollution — smokestack plume OR dirty water jug — one clear icon, not a city scene
8. presentation — blank projector screen + clicker (no slides text)
9. recycle — recycle bin + circular arrows symbol WITHOUT any letters
Keys: assignment, container, gear, hike, landfill, litter, pollution, presentation, recycle

SHEET 2 — NATURE / DESK STILL-LIFE (3×3)
Reading order L→R, top→bottom:
1. scenery — full-bleed landscape postcard VIEW only (NO picture-frame / ornate border)
2. snooze — alarm clock with Zzz cue as abstract shapes only — NO letters/characters
3. sunrise — sun rising over a simple horizon (no frame border)
4. wilderness — pine tree + mountain still-life arrangement
5. lamp — generic household table lamp OR ceiling pendant (NOT dental lamp, NOT exam light)
6. bookmark — ribbon bookmark in a closed book (no cover text)
7. paintbrush — single paintbrush with a dab of color (no palette text)
8. steam — takeout / steam box with rising steam wisps (no brand marks, no letters)
9. sugar — sugar jar with spoon (jar blank — NO label text)
Keys: scenery, snooze, sunrise, wilderness, lamp, bookmark, paintbrush, steam, sugar

When done, return the 2 PNG sheets + a short chat legend per sheet (names only, not painted on art). No long essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  sheets: SHEETS,
  import_hint: {
    sheet1:
      'npm run assets:vocab-sheet -- <sheet1.png> --sheet --grid=3x3 --names=assignment,container,gear,hike,landfill,litter,pollution,presentation,recycle',
    sheet2:
      'npm run assets:vocab-sheet -- <sheet2.png> --sheet --grid=3x3 --names=scenery,snooze,sunrise,wilderness,lamp,bookmark,paintbrush,steam,sugar',
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
  title: 'ESL white vocab 3×3: B1 still-life (env + nature/desk)',
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
    '# White vocab B1 still-life (Manus crew30)',
    '',
    `- task: ${dump.task_url || '(none)'}`,
    `- folder: tmp/manus-crew30-b1-stilllife/`,
    '',
    '## Collect',
    '',
    '1. Open the Manus task URL and download the 2 PNG sheets, **or**',
    '2. `node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-b1-stilllife`',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.sheet1,
    dump.import_hint.sheet2,
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
    },
    null,
    2,
  ),
);
