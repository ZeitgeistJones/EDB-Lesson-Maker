/**
 * Manus white-bg vocab 3×3 — volcano abstract icons (Sheet V12).
 * Prefers Manus esl-asset-generator over ChatGPT for batch white vocab icons.
 *
 *   node scripts/manus/request-white-vocab-volcano-abstracts.mjs
 *   node scripts/manus/request-white-vocab-volcano-abstracts.mjs --dry-run
 *
 * Collect: open task_url, or later:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-white-vocab-volcano-abstracts
 * Import each sheet:
 *   npm run assets:vocab-sheet -- <png> --sheet --grid=3x3 --names=...
 *
 * Still deferred (no honest still-life yet): remnant, vulnerable, trauma.
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-white-vocab-volcano-abstracts');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'V12',
    theme: 'volcano-abstracts',
    keys: [
      'eruption',
      'ash',
      'seismic',
      'abundant',
      'dormant',
      'evacuation',
      'geothermal',
      'subterranean',
      'tremors',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

Volcano lesson abstracts — none of these keys are in the pack yet. Prefer **OBJECT / still-life** icons (tools, landforms, signs, piles) over kid-activity / character-action scenes. Busy people scenes mush at ~96px dock size.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Prefer still-life / object metaphors; avoid multi-figure action scenes when a single object works.
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (1 image total — well under the ~5 images/call cap).

SHEET 1 — VOLCANO ABSTRACTS (3×3) — metaphors must be unmistakable still-lifes
Reading order L→R, top→bottom:
1. eruption — simple volcano cone with a clear lava / ash plume (landform still-life; NO fleeing people)
2. ash — grey ash pile OR ash drifting onto a simple rooftop silhouette (no faces)
3. seismic — seismograph drum with a wavy needle line OR cracked ground ripples (NO digits, NO letters on dial)
4. abundant — overflowing crate / basket piled high (fullness clear; no text on crate)
5. dormant — quiet snow-capped volcano with a closed crater, no smoke / no lava
6. evacuation — plain EXIT-arrow road sign shape + empty backpack still-life (arrows only, NO letters/words)
7. geothermal — hot-spring pool with steam wisps OR a simple geyser plume
8. subterranean — simple cutaway tunnel / cave mouth going underground (cross-section OK)
9. tremors — two cups / jars rattling on a table with ripple lines (still-life shake cue; no people)
Keys: eruption, ash, seismic, abundant, dormant, evacuation, geothermal, subterranean, tremors

Do NOT invent tiles for remnant / vulnerable / trauma on this sheet — those stay deferred.

When done, return the 1 PNG sheet + a short chat legend (names only, not painted on art). No long essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  sheets: SHEETS,
  skip: {
    deferred_until_honest_still_life: ['remnant', 'vulnerable', 'trauma'],
  },
  import_hint: {
    volcano:
      'npm run assets:vocab-sheet -- <sheet1.png> --sheet --grid=3x3 --names=eruption,ash,seismic,abundant,dormant,evacuation,geothermal,subterranean,tremors',
    note: 'Deferred keys (remnant, vulnerable, trauma) stay text-only until a later sheet.',
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
  title: 'ESL white vocab 3×3: volcano abstracts',
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
    '# White vocab volcano abstracts (Manus)',
    '',
    `- task: ${dump.task_url || '(none)'}`,
    `- folder: tmp/manus-white-vocab-volcano-abstracts/`,
    '',
    '## Collect',
    '',
    '1. Open the Manus task URL and download the PNG sheet, **or**',
    '2. `node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-white-vocab-volcano-abstracts`',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.volcano,
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
