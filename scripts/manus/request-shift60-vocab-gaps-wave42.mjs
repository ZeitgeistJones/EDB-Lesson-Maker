/**
 * Shift60 vocab-gaps wave42 — berries nuts + water sports + kitchen appliances.
 *   node scripts/manus/request-shift60-vocab-gaps-wave42.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave42');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BERRIES / NUTS:
1. strawberry — strawberry
2. blueberry — blueberry
3. raspberry — raspberry
4. blackberry — blackberry
5. cherry — cherry
6. grape — grapes bunch
7. walnut — walnut
8. almond — almond
9. peanut — peanut
Keys: strawberry,blueberry,raspberry,blackberry,cherry,grape,walnut,almond,peanut

SHEET 2 — WATER SPORTS:
1. surfboard — surfboard
2. snorkel — snorkel mask
3. flippers — swim flippers
4. life-ring — life ring / buoy
5. water-ski — water ski
6. wakeboard — wakeboard
7. paddleboard — paddleboard
8. diving-tank — scuba tank
9. beach-ball — beach ball
Keys: surfboard,snorkel,flippers,life-ring,water-ski,wakeboard,paddleboard,diving-tank,beach-ball

SHEET 3 — KITCHEN APPLIANCES:
1. blender — blender
2. toaster — toaster
3. microwave — microwave (BLANK)
4. coffee-maker — coffee maker
5. kettle-electric — electric kettle
6. mixer — hand mixer
7. food-processor — food processor
8. rice-cooker — rice cooker (BLANK)
9. air-fryer — air fryer (BLANK)
Keys: blender,toaster,microwave,coffee-maker,kettle-electric,mixer,food-processor,rice-cooker,air-fryer

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 42, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave42 (berries/water/appliances)',
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
  themes: ['berries-nuts', 'water-sports', 'kitchen-appliances'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
