/**
 * Shift60 vocab-gaps wave89 — buildings-places + land-paths + gear-transport.
 *   node scripts/manus/request-shift60-vocab-gaps-wave89.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave89');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BUILDINGS / PLACES:
1. hut — hut
2. fort — fort
3. mill — windmill
4. mall — mall building
5. gym — gym building
6. cabin — cabin
7. attic — attic
8. booth — booth
9. igloo — igloo
Keys: hut,fort,mill,mall,gym,cabin,attic,booth,igloo

SHEET 2 — LAND / PATHS:
1. hill — hill
2. dune — sand dune
3. lawn — lawn
4. path — path
5. road — road
6. yard — yard
7. cliff — cliff
8. coast — coast
9. field — field
Keys: hill,dune,lawn,path,road,yard,cliff,coast,field

SHEET 3 — GEAR / TRANSPORT:
1. jeep — jeep
2. raft — raft
3. tyre — tyre
4. brake — brake
5. rail — rail
6. tank — tank vehicle
7. hoop — hoop
8. dart — dart
9. trap — trap
Keys: jeep,raft,tyre,brake,rail,tank,hoop,dart,trap

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 89, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave89 (buildings-places/land-paths/gear-transport)',
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
  themes: ["buildings-places","land-paths","gear-transport"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
