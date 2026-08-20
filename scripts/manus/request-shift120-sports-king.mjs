/**
 * Shift120 — sports king hero + sharp dock objects (black-field).
 * Fills wishlist: sports/gym king stage (court/hoop).
 *   node scripts/manus/request-shift120-sports-king.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-sports-king');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: Black-field ESL PROP cutouts for ClassIn king-stage sports lessons (09_props). NOT white vocab icons.

DON'T HYPERFIXATE: skip stubborn tiles after 1–2 tries; never pad duplicates.

HARD STYLE:
- Pure #000000 field edge-to-edge
- Flat educational matte 2-tone vector (NOT photo, NOT glossy emoji, NOT grey cards)
- ZERO text/letters/numbers/logos
- quality: default only (never high)
- OBJECTS only — NO people figures

DELIVER 2 PNGs:

SHEET 1 — KING HEROES (prefer 2×2 or 3×3, LARGE silhouettes for stage scale ≥0.75):
1. basketball-hoop-stage — full basketball hoop + backboard + short court floor strip as ONE connected groundable hero (reads as a stage kids dress, not a tiny dock icon)
2. soccer-goal-stage — full soccer goal frame+net on a short turf strip as ONE groundable hero
3. tennis-court-net-stage — tennis net across a short court strip as ONE groundable hero (optional if grid is 2×2 — prefer basketball+soccer first)
4. gym-floor-stage — empty indoor court floor plate with boundary lines only (no numbers/text) as a flat stage pad
If only 2 clean heroes will come, deliver a 1×2 or 2×1 sheet of basketball-hoop-stage + soccer-goal-stage. Heroes must be LARGE in-frame.

SHEET 2 — SHARP DOCK TOOLS (4×4 = 16) for roleplay onto the hero:
basketball, soccer-ball, tennis-ball, whistle, cone, water-bottle, towel, stopwatch, medal, trophy, jump-rope, dumbbell, knee-pad, shin-guard, coach-clipboard (blank), scorecard-blank (no numbers/text)

Return 2 PNGs + short chat legends (names only, not painted). No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  quality: 'default',
  kind: 'sports-king-hero-plus-docks',
  import_hint: {
    heroes: 'npm run assets:prop -- <heroes.png> --sheet --grid=2x2 --names=... --pack=sports --write (or import-sheet then merge)',
    docks: 'npm run assets:import-sheet -- <docks.png> --grid=4x4 --prefix=sport- --names=... --pack=sports',
  },
};

if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  console.log(JSON.stringify({ phase: 'dry-run' }, null, 2));
  process.exit(0);
}
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING duplicate', prev.task_id);
    process.exit(2);
  }
}
apiKey();
const created = await createTask({
  title: 'ESL black props: sports king heroes + dock tools',
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
  task_url: created.task_url || (taskId ? 'https://manus.im/app/' + taskId : null),
  created,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: dump.task_url }, null, 2));
