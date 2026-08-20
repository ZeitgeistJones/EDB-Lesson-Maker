/**
 * Shift120 wave25 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave25.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave25');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SCHOOL SUPPLIES EXTRA:
1. notebook — notebook
2. pencil-case — pencil case
3. highlighter — highlighter marker
4. glue-stick — glue stick
5. stapler — stapler
6. paperclip — paperclip
7. binder — ring binder
8. calculator — calculator (blank screen, no numbers)
9. backpack-school — school backpack
Keys: notebook,pencil-case,highlighter,glue-stick,stapler,paperclip,binder,calculator,backpack-school

SHEET 2 — WEATHER / NATURE OBJECTS:
1. umbrella — umbrella
2. raincoat — raincoat
3. snowflake-icon — snowflake
4. sun-icon — sun
5. cloud-icon — cloud
6. rainbow-icon — rainbow
7. leaf-autumn — autumn leaf
8. pinecone — pinecone
9. puddle — puddle
Keys: umbrella,raincoat,snowflake-icon,sun-icon,cloud-icon,rainbow-icon,leaf-autumn,pinecone,puddle

SHEET 3 — TRANSPORT EXTRA OBJECTS:
1. scooter — kick scooter
2. skateboard — skateboard
3. helicopter — helicopter
4. subway-train — subway train car
5. ferry — ferry boat
6. taxi — taxi car
7. ambulance — ambulance
8. fire-truck — fire truck
9. tractor — tractor
Keys: scooter,skateboard,helicopter,subway-train,ferry,taxi,ambulance,fire-truck,tractor

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 25 };
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
  title: 'ESL white vocab 3×3: Shift120 picturable wave25 (school/weather/transport)',
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
