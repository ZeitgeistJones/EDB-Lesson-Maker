/**
 * Shift120 wave12 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave12.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave12');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WEATHER GEAR EXTRA:
1. windbreaker — windbreaker jacket
2. earmuffs — earmuffs
3. mittens — mittens
4. galoshes — rain boots / galoshes
5. parasol — parasol
6. weather-vane — weather vane
7. rain-gauge — rain gauge (blank scale)
8. snow-shovel — snow shovel
9. ice-skates — ice skates
Keys: windbreaker,earmuffs,mittens,galoshes,parasol,weather-vane,rain-gauge,snow-shovel,ice-skates

SHEET 2 — FOOD / PRODUCE OBJECTS:
1. loaf-bread — loaf of bread
2. cheese-wedge — cheese wedge
3. egg-carton — egg carton
4. yogurt-cup — yogurt cup (blank)
5. cereal-bowl — cereal bowl + spoon
6. fruit-bowl — fruit bowl
7. vegetable-basket — vegetable basket
8. honey-jar — honey jar (blank)
9. jam-jar — jam jar (blank)
Keys: loaf-bread,cheese-wedge,egg-carton,yogurt-cup,cereal-bowl,fruit-bowl,vegetable-basket,honey-jar,jam-jar

SHEET 3 — SCHOOL ROOM OBJECTS:
1. whiteboard — whiteboard (blank)
2. projector — classroom projector
3. podium — podium
4. flagpole — classroom flagpole (blank flag)
5. recess-bell — recess bell
6. attendance-clipboard — blank clipboard
7. pencil-sharpener — pencil sharpener
8. name-tag-blank — blank name tag
9. hall-pass — blank hall pass card
Keys: whiteboard,projector,podium,flagpole,recess-bell,attendance-clipboard,pencil-sharpener,name-tag-blank,hall-pass

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 12 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave12 (weather/food/school)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
