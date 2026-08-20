/**
 * Shift120 wave24 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave24.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave24');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BODY / HEALTH OBJECTS:
1. toothbrush — toothbrush
2. toothpaste-tube — toothpaste tube
3. soap-bar — bar of soap
4. towel — folded towel
5. bandage — adhesive bandage
6. thermometer-icon — thermometer
7. medicine-bottle — medicine bottle
8. tissues-box — box of tissues
9. hairbrush — hairbrush
Keys: toothbrush,toothpaste-tube,soap-bar,towel,bandage,thermometer-icon,medicine-bottle,tissues-box,hairbrush

SHEET 2 — FOOD / MEAL OBJECTS:
1. sandwich — sandwich
2. pizza-slice — pizza slice
3. hamburger — hamburger
4. hot-dog — hot dog
5. taco — taco
6. salad-bowl — salad bowl
7. soup-bowl — soup bowl
8. ice-cream-cone — ice cream cone
9. cupcake — cupcake
Keys: sandwich,pizza-slice,hamburger,hot-dog,taco,salad-bowl,soup-bowl,ice-cream-cone,cupcake

SHEET 3 — TOOLS / HOUSEHOLD OBJECTS:
1. hammer — hammer
2. screwdriver — screwdriver
3. wrench — wrench
4. pliers — pliers
5. tape-measure — tape measure
6. flashlight — flashlight
7. broom — broom
8. dustpan — dustpan
9. vacuum-cleaner — vacuum cleaner
Keys: hammer,screwdriver,wrench,pliers,tape-measure,flashlight,broom,dustpan,vacuum-cleaner

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 24 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error('REFUSING', prev.task_id);
    process.exit(2);
  }
}
if (DRY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, dry_run: true, brief: BRIEF }, null, 2));
  process.exit(0);
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave24 (health/food/tools)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({
  ...dumpBase,
  task_id: taskId,
  task_url: created.task_url || (taskId ? 'https://manus.im/app/' + taskId : null),
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
