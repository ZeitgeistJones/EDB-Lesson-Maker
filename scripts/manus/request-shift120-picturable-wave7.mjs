/**
 * Shift120 wave7 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave7.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave7');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TRANSPORT OBJECTS:
1. bicycle — bicycle
2. scooter — kick scooter
3. skateboard-ride — skateboard
4. helicopter — helicopter
5. train-car — train carriage
6. ferry — ferry boat
7. hot-air-balloon — hot air balloon
8. subway-car — subway train car
9. ambulance — ambulance
Keys: bicycle,scooter,skateboard-ride,helicopter,train-car,ferry,hot-air-balloon,subway-car,ambulance

SHEET 2 — SCIENCE / LAB OBJECTS:
1. microscope — microscope
2. test-tube — test tube in rack
3. beaker — beaker
4. magnet — horseshoe magnet
5. globe-desk — classroom globe
6. telescope-desk — small telescope
7. battery — battery (blank, no brand)
8. lightbulb — lightbulb
9. robot-toy — simple robot toy
Keys: microscope,test-tube,beaker,magnet,globe-desk,telescope-desk,battery,lightbulb,robot-toy

SHEET 3 — CLOTHES / ACCESSORIES OBJECTS:
1. raincoat-hood — hooded raincoat
2. winter-coat — winter coat
3. sneakers — sneakers
4. sandals — sandals
5. backpack-school — school backpack
6. wallet-icon — wallet
7. watch — wristwatch (blank face)
8. necklace — simple necklace
9. belt-icon — belt
Keys: raincoat-hood,winter-coat,sneakers,sandals,backpack-school,wallet-icon,watch,necklace,belt-icon

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 7 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave7 (transport/science/clothes)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
