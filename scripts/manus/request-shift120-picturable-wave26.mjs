/**
 * Shift120 wave26 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave26.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave26');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — ZOO / WILD EXTRA:
1. penguin — penguin
2. kangaroo — kangaroo
3. giraffe — giraffe
4. zebra — zebra
5. hippo — hippo
6. crocodile — crocodile
7. peacock — peacock
8. flamingo — flamingo
9. koala — koala
Keys: penguin,kangaroo,giraffe,zebra,hippo,crocodile,peacock,flamingo,koala

SHEET 2 — PARK / PLAYGROUND OBJECTS:
1. swing-set — swing
2. slide — playground slide
3. seesaw — seesaw
4. sandbox — sandbox
5. picnic-basket — picnic basket
6. kite — kite
7. frisbee — frisbee
8. jump-rope — jump rope
9. bench-park — park bench
Keys: swing-set,slide,seesaw,sandbox,picnic-basket,kite,frisbee,jump-rope,bench-park

SHEET 3 — KITCHEN COOKWARE EXTRA:
1. frying-pan — frying pan
2. saucepan — saucepan
3. mixing-bowl — mixing bowl
4. whisk — whisk
5. spatula — spatula
6. measuring-cup — measuring cup
7. cutting-board — cutting board
8. oven-mitt — oven mitt
9. blender — blender
Keys: frying-pan,saucepan,mixing-bowl,whisk,spatula,measuring-cup,cutting-board,oven-mitt,blender

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 26 };
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
  title: 'ESL white vocab 3×3: Shift120 picturable wave26 (zoo/park/cookware)',
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
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
