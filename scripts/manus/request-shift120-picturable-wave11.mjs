/**
 * Shift120 wave11 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave11.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave11');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — KITCHEN APPLIANCE OBJECTS:
1. microwave-icon — microwave
2. dishwasher-icon — dishwasher
3. blender-icon — blender
4. toaster-icon — toaster
5. coffee-maker — coffee maker
6. rice-cooker — rice cooker
7. food-processor — food processor
8. electric-kettle — electric kettle
9. juicer — juicer
Keys: microwave-icon,dishwasher-icon,blender-icon,toaster-icon,coffee-maker,rice-cooker,food-processor,electric-kettle,juicer

SHEET 2 — EMERGENCY / SAFETY OBJECTS:
1. fire-extinguisher — fire extinguisher
2. smoke-alarm — smoke alarm
3. first-aid-cross-box — first-aid box
4. life-jacket — life jacket
5. emergency-flashlight — emergency flashlight
6. whistle-safety — safety whistle
7. hard-hat-safety — hard hat
8. caution-cone — caution cone
9. exit-door — exit door (no text — green door with arrow shape only)
Keys: fire-extinguisher,smoke-alarm,first-aid-cross-box,life-jacket,emergency-flashlight,whistle-safety,hard-hat-safety,caution-cone,exit-door

SHEET 3 — TOYS / PLAY OBJECTS:
1. building-blocks — building blocks
2. teddy-bear — teddy bear
3. toy-train — toy train
4. dollhouse-mini — dollhouse
5. puzzle-pieces — puzzle pieces
6. jump-rope-toy — jump rope
7. bubble-wand-toy — bubble wand
8. yo-yo-toy — yo-yo
9. remote-car — remote control car
Keys: building-blocks,teddy-bear,toy-train,dollhouse-mini,puzzle-pieces,jump-rope-toy,bubble-wand-toy,yo-yo-toy,remote-car

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 11 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave11 (kitchen/safety/toys)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
