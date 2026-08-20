/**
 * Crew30 white CLEANUP wave2 — ONE small createTask (1 sheet), NOT Perfect-11.
 * Gap crew: only ~9 drawable leftovers; do not pad to 11.
 *
 * List A (gap-plan-wave2.md): deferred leash/pet-food/toy + remaining still-life gaps.
 *
 *   node scripts/manus/request-crew30-white-cleanup-wave2.mjs
 *   node scripts/manus/request-crew30-white-cleanup-wave2.mjs --dry-run
 *
 * NOTE: A padded white Perfect-11 (3to8ZmFvuFmbbDgNwtVg69) already fired by mistake —
 * do not re-fire Perfect-11 white. This cleanup is the intentional List A pass.
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-white-cleanup-wave2');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const SHEETS = [
  {
    id: 'W2-S1',
    theme: 'pets-jobs-stilllife',
    keys: [
      'leash',
      'pet-food',
      'toy',
      'dinner',
      'librarian',
      'baker',
      'teammate',
      'birthday',
      'party',
    ],
  },
];

const BRIEF = withEslAssetGeneratorBrief(`WHITE VOCAB CLEANUP — 1 SHEET ONLY (NOT Perfect-11)

Use your esl-asset-generator skill for this whole task. This is a small cleanup, not an 11-sheet run.

HARD STYLE:
- Pure solid #FFFFFF field edge to edge
- True even 3×3 grid; one subject per cell; ~10% margin
- Flat educational vector; NOT photo; NOT glossy emoji
- ZERO text/letters/numbers/logos/brand marks in the art
- quality: default only (never high)
- STILL-LIFE OBJECTS / objectified metonyms only — no facial portraits, no full kid-action scenes

SHEET 1 — PETS / JOBS / PARTY STILL-LIFE (3×3) — List A
Reading order L→R, top→bottom:
1. leash — coiled dog leash
2. pet-food — pet food bag or kibble bowl (blank bag — no brand/letters)
3. toy — pet toy ball / chew toy
4. dinner — plated dinner still-life (no people)
5. librarian — objectify as library desk stamp + blank library card (NOT a person portrait)
6. baker — objectify as rolling pin + flour sack (blank) / baker's hat as prop (no person body)
7. teammate — objectify as two matching blank jerseys side-by-side (no players)
8. birthday — birthday cake with candles (no writing on cake)
9. party — party hat + balloon cluster still-life
Keys: leash, pet-food, toy, dinner, librarian, baker, teammate, birthday, party

Deliver this 1 PNG + a short chat legend (names only). Execute now.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  kind: 'white-cleanup-list-a',
  note:
    'NOT Perfect-11. Padded white Perfect-11 3to8ZmFvuFmbbDgNwtVg69 already covers deferred pets; this List A sheet also covers librarian/baker/teammate/birthday/party.',
  deferred_covered: ['leash', 'pet-food', 'toy'],
  sheets: SHEETS,
  import_hint: {
    'pets-jobs-stilllife':
      'npm run assets:vocab-sheet -- <pets-jobs-stilllife.png> --sheet --grid=3x3 --names=leash,pet-food,toy,dinner,librarian,baker,teammate,birthday,party',
  },
  brief_starts_with: BRIEF.slice(0, 240),
};

if (fs.existsSync(OUT_JSON) && !DRY && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id) {
    console.error(`REFUSING duplicate white cleanup — already have task ${prev.task_id}`);
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
console.error(`Creating white List A cleanup (1 sheet)… profile=${profile}`);

const created = await createTask({
  title: 'ESL white cleanup List A: pets deferred + jobs/party still-life',
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
