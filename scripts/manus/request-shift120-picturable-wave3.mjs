/**
 * Shift120 wave3 — picturable object still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave3.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave3');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts (habit, afford, climate, commute, concentrate…).

HARD STYLE: #FFFFFF field; even 3×3; flat educational vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WEATHER / SEASON OBJECTS:
1. umbrella — open umbrella
2. raincoat — yellow raincoat
3. boots-rain — rain boots
4. snowflake — single snowflake crystal
5. snowman — snowman still-life
6. scarf-winter — knitted scarf
7. sunglasses-sun — sunglasses
8. sunhat — sun hat
9. thermometer-weather — outdoor thermometer (blank scale, no numbers)
Keys: umbrella,raincoat,boots-rain,snowflake,snowman,scarf-winter,sunglasses-sun,sunhat,thermometer-weather

SHEET 2 — FOOD PREP OBJECTS:
1. chopping-board — cutting board with veg silhouette
2. mixing-spoon — wooden mixing spoon
3. measuring-cup — measuring cup
4. frying-pan — frying pan
5. pot-lid — pot with lid
6. oven-mitt — oven mitt
7. recipe-card — blank recipe card (no writing)
8. apron-cook — cook apron
9. whisk-icon — kitchen whisk
Keys: chopping-board,mixing-spoon,measuring-cup,frying-pan,pot-lid,oven-mitt,recipe-card,apron-cook,whisk-icon

SHEET 3 — SCHOOL / STUDY OBJECTS (fresh densify, distinct from prior):
1. timetable — blank weekly grid card (no letters/numbers readable)
2. locker — school locker
3. lunchbox — lunchbox
4. water-fountain — drinking fountain
5. playground-ball — playground ball
6. chalk-piece — stick of chalk
7. glue-stick — glue stick
8. hole-punch — hole punch
9. stapler-icon — stapler
Keys: timetable,locker,lunchbox,water-fountain,playground-ball,chalk-piece,glue-stick,hole-punch,stapler-icon

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 3 };
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave3 (weather/food/school)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
