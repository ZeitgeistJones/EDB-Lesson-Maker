/**
 * Shift60 vocab-gaps wave45 — spices jars + insects tools + playground extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave45.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave45');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPICES / CONDIMENTS MORE:
1. pepper-mill — pepper mill
2. salt-cellar — salt cellar
3. cinnamon-stick — cinnamon sticks
4. vanilla-pod — vanilla pod
5. chili — chili pepper
6. garlic — garlic bulb
7. ginger — ginger root
8. herb-pot — potted herb
9. spice-jar — spice jar (BLANK)
Keys: pepper-mill,salt-cellar,cinnamon-stick,vanilla-pod,chili,garlic,ginger,herb-pot,spice-jar

SHEET 2 — BUG CATCHING / NATURE TOOLS:
1. butterfly-net — butterfly net
2. bug-jar — bug jar
3. binoculars — binoculars
4. compass-nav — navigation compass
5. walking-stick — walking stick
6. backpack — backpack
7. canteen-hike — hiking canteen
8. trail-map — trail map (BLANK)
9. whistle — whistle
Keys: butterfly-net,bug-jar,binoculars,compass-nav,walking-stick,backpack,canteen-hike,trail-map,whistle

SHEET 3 — PLAYGROUND EXTRAS:
1. swing — swing seat
2. slide — playground slide
3. see-saw — see-saw / teeter-totter
4. monkey-bars — monkey bars
5. sandbox — sandbox
6. hopscotch — hopscotch grid (BLANK, no numbers)
7. jump-rope-play — jump rope
8. frisbee — frisbee
9. scooter-kid — kids scooter
Keys: swing,slide,see-saw,monkey-bars,sandbox,hopscotch,jump-rope-play,frisbee,scooter-kid

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 45, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave45 (spices/nature-tools/playground)',
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
  themes: ['spices', 'nature-tools', 'playground-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
