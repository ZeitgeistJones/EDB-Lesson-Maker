/**
 * Manus white-bg vocab 3×3 — deferred volcano abstracts (Sheet V12b).
 * remnant / vulnerable / trauma + related still-life companions.
 *
 *   node scripts/manus/request-white-vocab-volcano-deferred.mjs
 *   node scripts/manus/request-white-vocab-volcano-deferred.mjs --dry-run
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-white-vocab-volcano-deferred');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'V12b',
    theme: 'volcano-deferred',
    keys: [
      'remnant',
      'vulnerable',
      'trauma',
      'crater',
      'magma',
      'fault',
      'aftershock',
      'plume',
      'lava',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **one** white-background ESL vocabulary icon contact sheet (3×3) for ClassIn match docks (\`07_vocab-pack\`). NOT black-field props.

These are the deferred volcano-unit words plus companions. Prefer **OBJECT / still-life** icons — no kid-action scenes, no people faces.

DON'T HYPERFIXATE: if one tile won't come clean, SKIP and deliver the rest. Never pad with duplicates.

HARD STYLE:
- Pure solid **#FFFFFF** field edge to edge.
- True even **3×3** grid. ONE subject per cell, centered, ~10% margin.
- Flat educational vector, soft muted palette. NOT photo, NOT glossy 3D.
- ZERO text/letters/numbers/logos in the art.
- Readable at ~96px dock size.
- quality: default only (never high).
- Deliver **1 PNG** sheet.

SHEET — VOLCANO DEFERRED + COMPANIONS (3×3)
Reading order L→R, top→bottom:
1. remnant — broken stone column / ruin stump alone (clear leftover, no people)
2. vulnerable — cracked clay pot or thin glass vase (fragile object, no faces)
3. trauma — small red heart with a simple bandage wrap (no blood, kid-safe; no text)
4. crater — top-down empty volcanic crater bowl (no lava required)
5. magma — glowing orange molten rock pool in a simple cutaway (no people)
6. fault — cracked ground with a clear offset line (still-life earth crack)
7. aftershock — two small cups rattling on a shelf with ripple lines (like tremors, distinct colors)
8. plume — tall grey ash/smoke plume column alone (no mountain base required)
9. lava — bright orange lava river tongue on dark rock (no people)
Keys: remnant, vulnerable, trauma, crater, magma, fault, aftershock, plume, lava

When done, return the 1 PNG + short chat legend (names only).`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  sheets: SHEETS,
  import_hint:
    'npm run assets:vocab-sheet -- <sheet.png> --sheet --grid=3x3 --names=remnant,vulnerable,trauma,crater,magma,fault,aftershock,plume,lava',
  brief_starts_with: BRIEF.slice(0, 200),
};

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run', out_dir: OUT_DIR }, null, 2));
  process.exit(0);
}

apiKey();
console.error(`Creating white vocab Manus task… profile=${profile}`);

const created = await createTask({
  title: 'ESL white vocab 3×3: volcano deferred (remnant/vulnerable/trauma)',
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
  created,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: dump.task_url,
      sheet_count: 1,
      out_dir: OUT_DIR,
    },
    null,
    2,
  ),
);
