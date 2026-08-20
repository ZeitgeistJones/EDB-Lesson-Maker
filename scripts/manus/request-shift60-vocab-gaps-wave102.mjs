/**
 * Shift60 vocab-gaps wave102 — places + body/care + tools (rankedGaps 158–315).
 *   node scripts/manus/request-shift60-vocab-gaps-wave102.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave102');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PLACES / BUILDINGS:
1. stage — stage
2. harbor — harbor
3. office — office desk
4. circus — circus tent
5. clinic — clinic building
6. prison — prison building
7. shrine — shrine
8. tunnel — tunnel
9. railway — railway tracks
Keys: stage,harbor,office,circus,clinic,prison,shrine,tunnel,railway

SHEET 2 — BODY / CARE:
1. skull — skull
2. thumb — thumb
3. finger — finger
4. tongue — tongue
5. crutch — crutch
6. bandaid — bandaid
7. mitten — mitten
8. shorts — shorts
9. costume — costume
Keys: skull,thumb,finger,tongue,crutch,bandaid,mitten,shorts,costume

SHEET 3 — TOOLS / WORK:
1. radar — radar dish
2. radio — radio
3. nozzle — nozzle
4. marker — marker pen (BLANK)
5. target — target (BLANK, no numbers)
6. pickaxe — pickaxe
7. hatchet — hatchet
8. hardhat — hard hat
9. keyhole — keyhole
Keys: radar,radio,nozzle,marker,target,pickaxe,hatchet,hardhat,keyhole

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 102, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave102 (places/body/tools)',
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
  themes: ['places-buildings', 'body-care', 'tools-work'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
