/**
 * Shift60 vocab-gaps wave76 — pizza night + insects garden + car parts.
 *   node scripts/manus/request-shift60-vocab-gaps-wave76.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave76');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PIZZA NIGHT:
1. pizza-dough — pizza dough ball
2. tomato-sauce — tomato sauce bowl
3. mozzarella-ball — mozzarella ball
4. basil-fresh — fresh basil
5. pizza-stone — pizza stone
6. pizza-peel — pizza peel
7. garlic-knot — garlic knot
8. salad-side — side salad
9. soda-can — soda can (BLANK)
Keys: pizza-dough,tomato-sauce,mozzarella-ball,basil-fresh,pizza-stone,pizza-peel,garlic-knot,salad-side,soda-can

SHEET 2 — GARDEN HELPERS:
1. ladybug-helper — ladybug
2. earthworm-helper — earthworm
3. bee-helper — bee
4. butterfly-helper — butterfly
5. praying-mantis-helper — praying mantis
6. spider-helper — garden spider
7. toad-helper — toad
8. hedgehog-helper — hedgehog
9. bird-feeder — bird feeder
Keys: ladybug-helper,earthworm-helper,bee-helper,butterfly-helper,praying-mantis-helper,spider-helper,toad-helper,hedgehog-helper,bird-feeder

SHEET 3 — CAR PARTS:
1. steering-wheel — steering wheel
2. car-key — car key fob (BLANK)
3. seatbelt-car — seatbelt
4. side-mirror — side mirror
5. windshield-wiper — windshield wiper
6. headlight — headlight
7. spare-tire — spare tire
8. gas-pump — gas pump nozzle
9. license-plate — license plate (BLANK)
Keys: steering-wheel,car-key,seatbelt-car,side-mirror,windshield-wiper,headlight,spare-tire,gas-pump,license-plate

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 76, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave76 (pizza/helpers/car)',
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
  themes: ['pizza-night', 'garden-helpers', 'car-parts'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
