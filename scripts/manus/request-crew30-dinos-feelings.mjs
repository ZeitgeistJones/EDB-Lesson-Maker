/**
 * Manus white-bg vocab — crew30 dinos/objects + B1 feelings face sheet (2 createTask calls).
 *
 * Task 1: dinosaur / object still-lifes (2× 3×3)
 * Task 2: ONLY 4–5 distinct emotions (NOT a full emotions re-bank)
 *
 *   node scripts/manus/request-crew30-dinos-feelings.mjs
 *   node scripts/manus/request-crew30-dinos-feelings.mjs --dry-run
 *
 * Collect:
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/manus-crew30-dinos-feelings
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-crew30-dinos-feelings');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

/** Task 1 — 2× 3×3 object still-lifes (18 cells). Prefer objects; family silhouettes last-resort only. */
const DINOS_SHEETS = [
  {
    id: 'D1',
    theme: 'dinosaur-objects',
    keys: [
      'claw',
      'tail',
      'jungle',
      'skeleton',
      'roar',
      'spike',
      'nest',
      'herbivore',
      'carnivore',
    ],
  },
  {
    id: 'D2',
    theme: 'extinct-adventure-objects',
    keys: [
      'extinct',
      'depth',
      'sonar',
      'captain-hat',
      'crew-badge',
      'engine',
      'surface',
      'astronomy',
      'dome',
    ],
  },
];

/** Object fillers if a primary cell must skip — never aunt/uncle/cousin first. */
const DINOS_OBJECT_FILLERS = [
  'guide',
  'night-sky',
  'planetarium',
  'pet',
  'home',
  'hug',
];

/** Task 2 — distinct emotions only (existing feelings pack already has proud/worried). */
const FEELINGS_SHEET = {
  id: 'F1',
  theme: 'b1-feelings-distinct-faces',
  keys: ['embarrassed', 'nervous', 'anxious', 'confident', 'frustrated'],
  optional_fill_only_if_distinct: ['proud', 'worried'],
  never_commission: [
    'grateful',
    'homesick',
    'lonely',
    'relieved',
    'overwhelmed',
    'disappointed',
    'calm',
    'jealous',
  ],
};

const DINOS_BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **white-background** ESL vocabulary icon contact sheets for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

THEME: dinosaur / adventure OBJECT still-lifes — kid-safe, drawable icons. Prefer OBJECTS over people. Family silhouettes (aunt/uncle/cousin) only as last-resort fill; prefer leaving a cell empty over a mushy face.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers. Optional object fillers if needed: guide (blank map), night-sky, planetarium building, pet (simple silhouette), home (house), hug (two hearts OR teddy still-life). Do NOT invent aunt/uncle/cousin cells unless you truly need a fill and objects failed.

HARD STYLE (all sheets — white vocab):
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards behind icons, NOT graph paper).
- True even **3×3** grid. Exactly ONE subject per cell, centered, ~10% margin, nothing crossing cell borders.
- Flat educational vector, soft muted palette, restrained shading. NOT photo, NOT glossy 3D emoji product renders.
- ZERO text/letters/numbers/logos/brand marks painted in the art.
- Must read clearly at small dock size (~96px).
- Use quality: default only (never high).
- Deliver **each sheet as its own PNG** (2 images total — well under the ~5 images/call cap).

SHEET 1 — DINOSAUR OBJECTS (3×3)
Reading order L→R, top→bottom:
1. claw — single large dinosaur claw / talon still-life
2. tail — dinosaur tail (spiked or clubbed) as a clear object
3. jungle — dense green ferns / jungle fronds still-life (no people)
4. skeleton — dinosaur bone / ribcage fossil still-life
5. roar — open dinosaur mouth icon (teeth visible, kid-safe, no gore)
6. spike — single dino back spike / osteoderm plate
7. nest — nest with eggs (still-life)
8. herbivore — leaf + gentle dinosaur head cue (leaf-eater still-life)
9. carnivore — tooth + meat still-life (careful, kid-safe, no blood spray)
Keys: claw, tail, jungle, skeleton, roar, spike, nest, herbivore, carnivore

SHEET 2 — EXTINCT / ADVENTURE OBJECTS (3×3)
Reading order L→R, top→bottom:
1. extinct — museum fossil bone / fossil display still-life
2. depth — blank depth gauge dial (NO digits, NO letters)
3. sonar — sonar dish / ping cone icon (no text)
4. captain-hat — simple captain hat still-life
5. crew-badge — blank crew badge / pin shape (NO letters)
6. engine — simple engine / motor block still-life
7. surface — periscope + waves still-life
8. astronomy — telescope still-life
9. dome — observatory / glass dome building
Keys: extinct, depth, sonar, captain-hat, crew-badge, engine, surface, astronomy, dome

When done, return the 2 PNG sheets + a short chat legend per sheet (names only, not painted on art). No long essay.`);

const FEELINGS_BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE white-background** ESL feelings FACE contact sheet for ClassIn match docks (\`07_vocab-pack\`). These are NOT black-field prop cutouts.

SCOPE LOCK — ONLY these distinct emotions (NOT a full emotions re-bank):
- embarrassed (clear blush cheeks)
- nervous
- anxious (prefer DISTINCT from nervous; if you cannot make them visually different, share ONE nervous cell and leave anxious empty)
- confident
- frustrated (must read DISTINCT from plain angry — e.g. clenched teeth / furrowed brow / steam, not a generic rage face)

OPTIONAL FILL: proud / worried ONLY if you can make them clearly distinct from the existing feelings pack faces we already bank. Prefer leaving empty cells / skip over duplicate smiles. Do NOT pad.

NEVER COMMISSION (undrawable duplicates — same smile / same downturned face):
grateful, homesick, lonely, relieved, overwhelmed, disappointed, calm, jealous

FACE RULES:
- Same character face across cells so students read the EMOTION, not a new character.
- Soft-3D / slight dimensional drift is ACCEPTABLE for faces. Do NOT repair, regenerate, or hyperfix for flatness. Deliver once and stop.
- Kid-safe. ZERO text/letters/numbers/logos on tiles.

HARD STYLE:
- Pure solid **#FFFFFF** field edge to edge (NOT black, NOT grey cards).
- Grid: prefer **2×3** (6 cells) with the 5 emotions + one intentional empty/skip cell; OR **3×3** with empty cells left blank (do not invent filler emotions).
- Exactly ONE face per filled cell, centered, ~10% margin, nothing crossing borders.
- Use quality: default only (never high).
- Deliver **1 PNG** only.

Keys (filled): embarrassed, nervous, anxious, confident, frustrated

When done, return the 1 PNG sheet + a short chat legend (names only, not painted on art). No long essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];

const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  tasks: {
    dinos: {
      title: 'ESL white vocab 3×3: dinosaur/object still-lifes (crew30)',
      sheets: DINOS_SHEETS,
      object_fillers: DINOS_OBJECT_FILLERS,
      brief_starts_with: DINOS_BRIEF.slice(0, 200),
    },
    feelings: {
      title: 'ESL white vocab faces: B1 distinct emotions only (crew30)',
      sheets: [FEELINGS_SHEET],
      brief_starts_with: FEELINGS_BRIEF.slice(0, 200),
    },
  },
  import_hint: {
    dinos_sheet1:
      'npm run assets:vocab-sheet -- <d1.png> --sheet --grid=3x3 --names=claw,tail,jungle,skeleton,roar,spike,nest,herbivore,carnivore',
    dinos_sheet2:
      'npm run assets:vocab-sheet -- <d2.png> --sheet --grid=3x3 --names=extinct,depth,sonar,captain-hat,crew-badge,engine,surface,astronomy,dome',
    feelings:
      'npm run assets:vocab-sheet -- <f1.png> --sheet --grid=2x3 --names=embarrassed,nervous,anxious,confident,frustrated',
    note: 'Feelings: accept soft-3D; do not ask Manus to regen for flatness. Do not import proud/worried unless Manus delivered truly distinct new art.',
  },
};

if (DRY) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        ...dumpBase,
        dry_run: true,
        briefs: { dinos: DINOS_BRIEF, feelings: FEELINGS_BRIEF },
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        phase: 'dry-run',
        out_dir: OUT_DIR,
        dinos_sheets: DINOS_SHEETS.length,
        feelings_keys: FEELINGS_SHEET.keys,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

apiKey();

if (fs.existsSync(OUT_JSON)) {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const prevIds = [
      prev.tasks?.dinos?.task_id,
      prev.tasks?.feelings?.task_id,
      prev.task_ids?.[0],
      prev.task_ids?.[1],
    ].filter(Boolean);
    if (prevIds.length && !process.env.MANUS_FORCE_RERUN) {
      console.error(
        `REFUSING second run — already have task(s): ${prevIds.join(', ')}`,
      );
      console.error(
        'Set MANUS_FORCE_RERUN=1 only if you intentionally want another call.',
      );
      console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
      process.exit(2);
    }
  } catch {
    /* corrupt prior run.json — proceed */
  }
}

const errors = [];
const results = { dinos: null, feelings: null };

async function fire(label, title, brief) {
  console.error(`Creating ${label} Manus task… profile=${profile}`);
  const created = await createTask({
    title,
    message: brief,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
  const taskId = created.task_id || created.id || null;
  return {
    task_id: taskId,
    task_url: created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null),
    task_url_alt: taskId ? `https://manus.im/app?taskId=${taskId}` : null,
    created,
  };
}

try {
  results.dinos = await fire(
    'dinos/objects',
    dumpBase.tasks.dinos.title,
    DINOS_BRIEF,
  );
  console.error(`Dinos task ${results.dinos.task_id}\n${results.dinos.task_url || ''}`);
} catch (e) {
  errors.push({ task: 'dinos', message: e.message || String(e) });
  console.error(`Dinos createTask FAILED: ${e.message || e}`);
}

try {
  results.feelings = await fire(
    'feelings faces',
    dumpBase.tasks.feelings.title,
    FEELINGS_BRIEF,
  );
  console.error(
    `Feelings task ${results.feelings.task_id}\n${results.feelings.task_url || ''}`,
  );
} catch (e) {
  errors.push({ task: 'feelings', message: e.message || String(e) });
  console.error(`Feelings createTask FAILED: ${e.message || e}`);
}

const taskIds = [results.dinos?.task_id, results.feelings?.task_id].filter(Boolean);

const dump = {
  ...dumpBase,
  finished_create_at: new Date().toISOString(),
  task_ids: taskIds,
  tasks: {
    dinos: {
      ...dumpBase.tasks.dinos,
      ...(results.dinos || {}),
      error: errors.find((e) => e.task === 'dinos') || null,
    },
    feelings: {
      ...dumpBase.tasks.feelings,
      ...(results.feelings || {}),
      error: errors.find((e) => e.task === 'feelings') || null,
    },
  },
  errors,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'IMPORT-NOTES.md'),
  [
    '# Crew30 — dinos/objects + distinct feelings (Manus)',
    '',
    `## Task 1 — dinos/objects`,
    `- task: ${dump.tasks.dinos.task_url || '(none)'}`,
    `- id: ${dump.tasks.dinos.task_id || '(none)'}`,
    '',
    `## Task 2 — feelings (distinct only)`,
    `- task: ${dump.tasks.feelings.task_url || '(none)'}`,
    `- id: ${dump.tasks.feelings.task_id || '(none)'}`,
    '',
    `- folder: tmp/manus-crew30-dinos-feelings/`,
    '',
    '## Collect',
    '',
    '```bash',
    'node scripts/manus/fetch-task-assets.mjs --task=<dinos-id> --out=tmp/manus-crew30-dinos-feelings',
    'node scripts/manus/fetch-task-assets.mjs --task=<feelings-id> --out=tmp/manus-crew30-dinos-feelings',
    '```',
    '',
    '## Import',
    '',
    '```bash',
    dump.import_hint.dinos_sheet1,
    dump.import_hint.dinos_sheet2,
    dump.import_hint.feelings,
    '```',
    '',
    dump.import_hint.note,
    '',
  ].join('\n'),
);

console.log(
  JSON.stringify(
    {
      phase: errors.length && !taskIds.length ? 'failed' : 'created',
      task_ids: taskIds,
      dinos: {
        task_id: results.dinos?.task_id || null,
        task_url: results.dinos?.task_url || null,
        sheets: DINOS_SHEETS,
      },
      feelings: {
        task_id: results.feelings?.task_id || null,
        task_url: results.feelings?.task_url || null,
        sheets: [FEELINGS_SHEET],
      },
      errors,
      out_dir: OUT_DIR,
      run_json: OUT_JSON,
    },
    null,
    2,
  ),
);

if (errors.length && !taskIds.length) process.exit(1);
