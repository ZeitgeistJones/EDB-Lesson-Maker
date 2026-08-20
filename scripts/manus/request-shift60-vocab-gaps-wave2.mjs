/**
 * Shift60 vocab-gaps wave2 — animals + food + school.
 *   node scripts/manus/request-shift60-vocab-gaps-wave2.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave2');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WILD ANIMALS:
1. lion — lion
2. tiger — tiger
3. elephant — elephant
4. giraffe — giraffe
5. monkey — monkey
6. zebra — zebra
7. panda — panda
8. kangaroo — kangaroo
9. penguin — penguin
Keys: lion,tiger,elephant,giraffe,monkey,zebra,panda,kangaroo,penguin

SHEET 2 — FOOD STAPLES:
1. bread — loaf of bread
2. rice — bowl of rice
3. pasta — pasta / noodles
4. cheese — cheese wedge
5. egg — egg
6. milk — milk carton/bottle (BLANK label)
7. butter — butter stick/pack (BLANK)
8. soup — soup bowl
9. sandwich — sandwich
Keys: bread,rice,pasta,cheese,egg,milk,butter,soup,sandwich

SHEET 3 — SCHOOL OBJECTS:
1. pencil — pencil
2. eraser — eraser
3. ruler — ruler (no readable numbers)
4. scissors — scissors
5. glue — glue stick (BLANK)
6. backpack — backpack
7. notebook — notebook (BLANK cover)
8. crayon — crayon
9. desk — school desk
Keys: pencil,eraser,ruler,scissors,glue,backpack,notebook,crayon,desk

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 2, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave2 (animals/food/school)',
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
  themes: ['wild-animals', 'food-staples', 'school-objects'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
