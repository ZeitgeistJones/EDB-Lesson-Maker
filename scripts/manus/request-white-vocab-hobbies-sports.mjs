/**
 * Manus white-bg vocab 3×3s — next Desktop queue sheets after clubs (DONE).
 * Prefers Manus esl-asset-generator over ChatGPT for batch white vocab icons.
 *
 *   node scripts/manus/request-white-vocab-hobbies-sports.mjs
 *   node scripts/manus/request-white-vocab-hobbies-sports.mjs --dry-run
 *
 * Collect: open task_url, or later:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-white-vocab-hobbies-sports
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-white-vocab-hobbies-sports');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'V10',
    theme: 'hobbies-after-school',
    keys: [
      'hobby',
      'club',
      'join',
      'practice',
      'team',
      'coach',
      'member',
      'meeting',
      'after-school',
    ],
  },
  {
    id: 'V11',
    theme: 'sports-abstract',
    keys: [
      'practice',
      'effort',
      'teamwork',
      'win',
      'lose',
      'score',
      'goalkeeper',
      'whistle',
      'uniform',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

DO NOT regenerate the already-imported school-clubs sheet (art, chess, sports, music, science, drama, robot, choir, math).

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (2 images total — well under the ~5 images/call cap).

SHEET 1 — HOBBIES / AFTER-SCHOOL (3×3)
Reading order L→R, top→bottom:
1. hobby — knitting yarn ball + needles OR stamp collection cue (clear “hobby”, no text)
2. club — simple membership badge/pin shape (blank, no letters)
3. join — two puzzle pieces almost connecting
4. practice — metronome OR simple target with arrows (no numbers)
5. team — three plain kid silhouettes standing together (from behind OK)
6. coach — whistle + clipboard (blank clipboard, no writing) — accessory still-life OK; not a full soft-3D person portrait sheet
7. member — simple ID card shape (blank, no text)
8. meeting — round table with 3–4 empty chairs (top-down simple)
9. after-school — backpack + clock face with NO numbers (hands only)
Keys: hobby, club, join, practice, team, coach, member, meeting, after-school

SHEET 2 — SPORTS ABSTRACT (3×3) — metaphors must be unmistakable
Reading order L→R, top→bottom:
1. practice — player kicking toward a cone (training cue)
2. effort — person pushing a sled or climbing a small hill (strain clear, kid-safe)
3. teamwork — two kids passing a ball to each other
4. win — simple gold trophy (no engraving text)
5. lose — simple silver medal OR broken ribbon (no text)
6. score — blank scoreboard shape with two empty boxes (NO digits)
7. goalkeeper — gloves + goal silhouette
8. whistle — metal whistle alone
9. uniform — folded sports jersey (blank, no numbers/letters)
Keys: practice, effort, teamwork, win, lose, score, goalkeeper, whistle, uniform

When done, return the 2 PNG sheets + a short chat legend per sheet (names only, not painted on art). No long essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  sheets: SHEETS,
  skip: {
    clubs_vocab_3x3: [
      'art',
      'chess',
      'sports',
      'music',
      'science',
      'drama',
      'robot',
      'choir',
      'math',
    ],
  },
  import_hint: {
    hobbies:
      'npm run assets:vocab-sheet -- <sheet1.png> --sheet --grid=3x3 --names=hobby,club,join,practice,team,coach,member,meeting,after-school',
    sports:
      'npm run assets:vocab-sheet -- <sheet2.png> --sheet --grid=3x3 --names=practice,effort,teamwork,win,lose,score,goalkeeper,whistle,uniform',
    note: 'Import sports after hobbies if both land — sports `practice` overwrites hobbies `practice`.',
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
  title: 'ESL white vocab 3×3: hobbies/after-school + sports abstract',
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
    '# White vocab hobbies + sports (Manus)',
    '',
    `- task: ${dump.task_url || '(none)'}`,
    `- folder: tmp/manus-white-vocab-hobbies-sports/`,
    '',
    '## Collect',
    '',
    '1. Open the Manus task URL and download the 2 PNG sheets, **or**',
    '2. `node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-white-vocab-hobbies-sports`',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.hobbies,
    dump.import_hint.sports,
    '```',
    '',
    dump.import_hint.note,
    '',
    'Do **not** re-request clubs vocab (already wired).',
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
