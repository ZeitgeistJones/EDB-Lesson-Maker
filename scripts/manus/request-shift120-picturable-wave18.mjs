/**
 * Shift120 wave18 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave18.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave18');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WILD ANIMALS OBJECTS:
1. lion — lion
2. tiger — tiger
3. elephant — elephant
4. giraffe — giraffe
5. zebra — zebra
6. monkey — monkey
7. penguin — penguin
8. panda — panda
9. kangaroo — kangaroo
Keys: lion,tiger,elephant,giraffe,zebra,monkey,penguin,panda,kangaroo

SHEET 2 — VEHICLES EXTRA OBJECTS:
1. motorcycle — motorcycle
2. van — van
3. truck — truck
4. police-car — police car
5. fire-engine — fire engine
6. bulldozer — bulldozer
7. forklift — forklift
8. sailboat — sailboat
9. canoe — canoe
Keys: motorcycle,van,truck,police-car,fire-engine,bulldozer,forklift,sailboat,canoe

SHEET 3 — BODY / HEALTH OBJECTS:
1. toothbrush-icon — toothbrush
2. toothpaste-tube — toothpaste tube (blank)
3. soap-bar — bar of soap
4. towel-icon — towel
5. bandage-roll — bandage roll
6. thermometer-icon — thermometer
7. vitamins — vitamin bottle (blank)
8. water-glass — glass of water
9. apple-health — apple
Keys: toothbrush-icon,toothpaste-tube,soap-bar,towel-icon,bandage-roll,thermometer-icon,vitamins,water-glass,apple-health

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 18 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave18 (wild/vehicles/health)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
