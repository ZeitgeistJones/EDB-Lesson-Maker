/**
 * Shift120 — remake dockSafe:false OBJECT props that block New Words / title charms
 * (kitchen tools on white plates, soccer balls with white fringe, chef hat).
 *
 *   node scripts/manus/request-shift120-dock-unsafe-objects.mjs
 *   node scripts/manus/request-shift120-dock-unsafe-objects.mjs --dry-run
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
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-dock-unsafe-objects');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const PROMPT_FALLBACK = path.join(OUT_DIR, 'PROMPT.md');

const SHEETS = [
  {
    id: 'K1',
    theme: 'kitchen-wire-tools-no-plate',
    // Skip kitchen-timer / job-chef-hat / soccer — already remade in-house (C10 pass).
    keys: [
      'kitchen-whisk',
      'kitchen-spatula',
      'kitchen-blender',
      'kitchen-apron',
      'kit-whisk',
      'kit-spatula',
      'kit-blender',
      'kit-apron',
      'rolling-pin',
    ],
  },
  {
    id: 'S1',
    theme: 'soccer-gear-leftovers',
    keys: [
      'soccer-duffel-bag',
      'soccer-pinnies',
      'soccer-tactics-board',
      'life-soccer-ball',
      'soccer-ball-orange',
      'whistle',
      'sport-whistle',
      'kit-timer',
      'water-bottle',
    ],
  },
];

const BRIEF_BODY = `TASK: Black-field ESL PROP cutouts for ClassIn PropBank (09_props). Remake remaining dock-unsafe OBJECTS (kitchen wire tools that fail C6 near-black holes + soccer gear). OBJECTS only — NO people figures.

ALREADY BANKED IN-HOUSE (do NOT remake): kitchen-timer, wooden-spoon, mixing-bowl, job-chef-hat, soccer-ball / sport-soccer, soccer-cleat, soccer-shin-guards, soccer-jersey, soccer-captain-armband, training-cone / soccer-training-cones, sport-water-bottle, astronaut figures.

HARD RULES:
- Pure #000000 field edge-to-edge
- True even 3×3 per sheet; ONE object per cell; ≥3% black margin all sides inside each cell
- Object sits DIRECTLY on black — NO white card/plate/shadow-card behind the object (C9 fail)
- For wire tools (whisk): use LIGHT SILVER wires clearly brighter than black (C6 fail if wires key out)
- Flat educational matte vector
- ZERO text/letters/numbers/logos
- quality: default ONLY (never high)
- Deliver exactly 2 PNGs + short legends

SHEET 1 — KITCHEN WIRE / SOFT TOOLS (no plates; light materials) L→R top→bottom:
1. kitchen-whisk — wire whisk, LIGHT silver loops
2. kitchen-spatula — flat spatula, light wood/plastic
3. kitchen-blender — counter blender, light pitcher (not near-black)
4. kitchen-apron — apron object, light fabric
5. kit-whisk — second whisk variant (light wires)
6. kit-spatula — second spatula variant
7. kit-blender — second blender variant
8. kit-apron — second apron variant
9. rolling-pin — light wood rolling pin with margin (not edge-to-edge thin)
Keys: kitchen-whisk,kitchen-spatula,kitchen-blender,kitchen-apron,kit-whisk,kit-spatula,kit-blender,kit-apron,rolling-pin

SHEET 2 — LEFTOVER SOCCER / WHISTLE (clean alpha) L→R top→bottom:
1. soccer-duffel-bag — sports duffel
2. soccer-pinnies — training pinnies / bibs (blank, no numbers)
3. soccer-tactics-board — blank tactics board (no letters/numbers)
4. life-soccer-ball — navy/blue panel soccer ball (NOT bright white panels — C9)
5. soccer-ball-orange — orange soccer ball
6. whistle — bright silver coach whistle (LIGHT metal, not near-black)
7. sport-whistle — second whistle variant (light metal)
8. kit-timer — kitchen/sports timer blank face (no digits)
9. water-bottle — sports bottle blank
Keys: soccer-duffel-bag,soccer-pinnies,soccer-tactics-board,life-soccer-ball,soccer-ball-orange,whistle,sport-whistle,kit-timer,water-bottle

Return 2 PNGs + legends. No essay.`;

const BRIEF = withEslAssetGeneratorBrief(BRIEF_BODY);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  kind: 'dock-unsafe-object-replace',
  sheets: SHEETS,
  import_hint:
    'npm run assets:import-sheet -- <png> --grid=3x3 --prefix= — replace same keys after C9/C10 pass; keep old dockSafe:false until verified',
};

if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING — already created', prev.task_id, prev.task_url || '');
    process.exit(2);
  }
}

fs.writeFileSync(PROMPT_FALLBACK, ['# Dock-unsafe object replace', '', BRIEF, ''].join('\n'));

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry_run', out: OUT_JSON }, null, 2));
  process.exit(0);
}

try {
  apiKey();
} catch (err) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ ...dumpBase, wall: 'MANUS_API_KEY missing', brief: BRIEF, prompt: PROMPT_FALLBACK }, null, 2),
  );
  console.error('WALL: MANUS_API_KEY missing — wrote', PROMPT_FALLBACK);
  console.error(String(err && err.message ? err.message : err));
  process.exit(3);
}

let created;
try {
  created = await createTask({
    title: 'ESL black props: kitchen (no plate) + soccer clean alpha remakes',
    message: BRIEF,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
} catch (err) {
  const msg = String(err && err.message ? err.message : err);
  const wall = /401|expired|unauthenticated|deleted or does not exist/i.test(msg)
    ? 'MANUS_API_KEY rejected — update repo .env MANUS_API_KEY then re-run'
    : 'task.create failed';
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ ...dumpBase, wall, error: msg, brief: BRIEF, prompt: PROMPT_FALLBACK }, null, 2),
  );
  console.error('WALL:', wall, '— wrote', PROMPT_FALLBACK);
  console.error(msg);
  process.exit(3);
}

const taskId = created.task_id || created.id || null;
const taskUrl = created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null);
fs.writeFileSync(
  OUT_JSON,
  JSON.stringify({ ...dumpBase, task_id: taskId, task_url: taskUrl, created }, null, 2),
);
console.log(
  JSON.stringify(
    {
      phase: 'created',
      task_id: taskId,
      task_url: taskUrl,
      sheets: SHEETS,
    },
    null,
    2,
  ),
);
