/**
 * Shift60 vocab-gaps wave87 — farm-plants + jars-containers + small-hardware.
 *   node scripts/manus/request-shift60-vocab-gaps-wave87.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave87');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FARM / PLANTS:
1. hay — hay bale
2. oak — oak tree
3. log — log
4. nut — nut
5. pod — seed pod
6. herb — herb sprig
7. leek — leek
8. maple — maple leaf
9. yolk — egg yolk
Keys: hay,oak,log,nut,pod,herb,leek,maple,yolk

SHEET 2 — JARS / CONTAINERS:
1. jar — jar
2. jug — jug
3. lid — lid
4. dish — dish
5. pail — pail
6. tote — tote bag
7. cork — cork
8. oil — oil bottle
9. wax — wax block
Keys: jar,jug,lid,dish,pail,tote,cork,oil,wax

SHEET 3 — SMALL HARDWARE:
1. bolt — bolt
2. pin — pin
3. rod — rod
4. coil — coil
5. plug — electrical plug
6. hook — hook
7. latch — latch
8. lever — lever
9. wire — wire coil
Keys: bolt,pin,rod,coil,plug,hook,latch,lever,wire

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 87, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave87 (farm-plants/jars-containers/small-hardware)',
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
  themes: ["farm-plants","jars-containers","small-hardware"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
