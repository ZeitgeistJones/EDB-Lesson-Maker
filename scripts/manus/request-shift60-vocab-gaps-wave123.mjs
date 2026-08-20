/**
 * Shift60 vocab-gaps wave123 — nature/farm + jars + small tools (post-import mop).
 *   node scripts/manus/request-shift60-vocab-gaps-wave123.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave123');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — NATURE / FARM:
1. dam — dam wall
2. hay — hay bale
3. hut — small hut
4. log — log
5. oak — oak tree
6. nut — nut (in shell)
7. pod — seed pod
8. herb — herb bunch
9. lawn — patch of lawn
Keys: dam,hay,hut,log,oak,nut,pod,herb,lawn

SHEET 2 — JARS / CONTAINERS:
1. jar — glass jar (BLANK)
2. jug — jug
3. lid — jar lid
4. cork — cork stopper
5. oil — oil bottle (BLANK)
6. wax — wax block
7. foil — foil roll
8. pail — pail
9. tote — tote bag (BLANK)
Keys: jar,jug,lid,cork,oil,wax,foil,pail,tote

SHEET 3 — SMALL HARDWARE:
1. bolt — metal bolt
2. coil — metal coil
3. pin — pin
4. rod — rod
5. hook — hook
6. hose — garden hose
7. plug — electrical plug
8. trap — animal trap
9. mitt — oven mitt
Keys: bolt,coil,pin,rod,hook,hose,plug,trap,mitt

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 123, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave123 (nature/jars/hardware)',
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
  themes: ['nature-farm', 'jars-containers', 'small-hardware'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
