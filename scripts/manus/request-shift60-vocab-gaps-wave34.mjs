/**
 * Shift60 vocab-gaps wave34 — bakery extras + reptiles + gym equipment.
 *   node scripts/manus/request-shift60-vocab-gaps-wave34.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave34');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BAKERY EXTRAS:
1. baguette — baguette
2. sourdough — sourdough loaf
3. brioche — brioche bun
4. danish — danish pastry
5. eclair — eclair
6. tart — fruit tart
7. scone — scone
8. muffin — muffin
9. cinnamon-roll — cinnamon roll
Keys: baguette,sourdough,brioche,danish,eclair,tart,scone,muffin,cinnamon-roll

SHEET 2 — REPTILES / AMPHIBIANS:
1. lizard — lizard
2. gecko — gecko
3. turtle — turtle
4. tortoise — tortoise
5. iguana — iguana
6. crocodile — crocodile
7. alligator — alligator
8. newt — newt
9. toad — toad
Keys: lizard,gecko,turtle,tortoise,iguana,crocodile,alligator,newt,toad

SHEET 3 — GYM EQUIPMENT:
1. dumbbell — dumbbell
2. kettlebell — kettlebell
3. yoga-mat — yoga mat
4. resistance-band — resistance band
5. jump-rope — jump rope / skipping rope
6. medicine-ball — medicine ball
7. treadmill — treadmill
8. weight-bench — weight bench
9. foam-roller — foam roller
Keys: dumbbell,kettlebell,yoga-mat,resistance-band,jump-rope,medicine-ball,treadmill,weight-bench,foam-roller

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 34, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave34 (bakery/reptiles/gym)',
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
  themes: ['bakery-extras', 'reptiles', 'gym-equipment'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
