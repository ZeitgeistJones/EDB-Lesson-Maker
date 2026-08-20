/**
 * Shift60 vocab-gaps wave59 — salad bar + reptiles pets + winter clothes.
 *   node scripts/manus/request-shift60-vocab-gaps-wave59.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave59');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SALAD BAR:
1. salad-bowl — mixed salad bowl
2. croutons — croutons
3. dressing — dressing bottle (BLANK)
4. cherry-tomato — cherry tomatoes
5. cucumber-slice — cucumber slices
6. spinach — spinach leaves
7. avocado-half — avocado half
8. feta — feta cheese cubes
9. salad-tongs — salad tongs
Keys: salad-bowl,croutons,dressing,cherry-tomato,cucumber-slice,spinach,avocado-half,feta,salad-tongs

SHEET 2 — PET REPTILES:
1. gecko-pet — pet gecko
2. snake-pet — pet snake
3. turtle-tank — turtle in tank
4. chameleon-pet — pet chameleon
5. iguana-pet — pet iguana
6. terrarium — terrarium
7. heat-lamp — reptile heat lamp
8. cricket-feeder — cricket feeder box
9. reptile-hide — reptile hide cave
Keys: gecko-pet,snake-pet,turtle-tank,chameleon-pet,iguana-pet,terrarium,heat-lamp,cricket-feeder,reptile-hide

SHEET 3 — WINTER CLOTHES:
1. coat — winter coat
2. snow-boots — snow boots
3. beanie — beanie hat
4. gloves — winter gloves
5. thermal — thermal undershirt
6. snow-pants — snow pants
7. scarf-wool — wool scarf
8. earmuffs-winter — earmuffs
9. neck-gaiter — neck gaiter
Keys: coat,snow-boots,beanie,gloves,thermal,snow-pants,scarf-wool,earmuffs-winter,neck-gaiter

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 59, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave59 (salad/reptiles/winter)',
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
  themes: ['salad-bar', 'pet-reptiles', 'winter-clothes'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
