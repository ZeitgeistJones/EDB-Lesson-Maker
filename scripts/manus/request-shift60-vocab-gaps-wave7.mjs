/**
 * Shift60 vocab-gaps wave7 — fruit/veg extra + toys + city.
 *   node scripts/manus/request-shift60-vocab-gaps-wave7.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave7');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — MORE FRUIT:
1. apple — apple
2. banana — banana
3. orange — orange
4. strawberry — strawberry
5. pear — pear
6. plum — plum
7. blueberry — blueberries
8. raspberry — raspberry
9. avocado — avocado
Keys: apple,banana,orange,strawberry,pear,plum,blueberry,raspberry,avocado

SHEET 2 — TOYS:
1. doll — doll
2. teddy-bear — teddy bear
3. robot-toy — toy robot
4. puzzle — puzzle piece / small puzzle
5. kite — kite
6. yo-yo — yo-yo
7. blocks — building blocks
8. train-toy — toy train
9. ball-toy — play ball
Keys: doll,teddy-bear,robot-toy,puzzle,kite,yo-yo,blocks,train-toy,ball-toy

SHEET 3 — CITY PLACES (building icons, no text signs):
1. school-building — school building
2. hospital-building — hospital building (cross symbol OK, no letters)
3. shop — shop storefront (BLANK sign)
4. park — park / trees + bench
5. library-building — library building
6. bank — bank building (BLANK)
7. cinema — cinema / movie theater
8. restaurant — restaurant building
9. post-office — post office building (BLANK)
Keys: school-building,hospital-building,shop,park,library-building,bank,cinema,restaurant,post-office

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 7, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave7 (fruit/toys/city)',
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
  themes: ['fruit', 'toys', 'city-places'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
