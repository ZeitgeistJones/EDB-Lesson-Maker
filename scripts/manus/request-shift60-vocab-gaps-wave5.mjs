/**
 * Shift60 vocab-gaps wave5 — jobs tools + kitchen + bathroom.
 *   node scripts/manus/request-shift60-vocab-gaps-wave5.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave5');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts. NO people portraits — tools/objects that imply jobs.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — JOB TOOLS:
1. stethoscope — stethoscope
2. hammer — hammer
3. paintbrush — paintbrush
4. chef-hat — chef hat
5. police-badge — police badge (no text/numbers)
6. fire-hose — fire hose / nozzle
7. camera — camera
8. microphone — microphone
9. wrench — wrench
Keys: stethoscope,hammer,paintbrush,chef-hat,police-badge,fire-hose,camera,microphone,wrench

SHEET 2 — KITCHEN TOOLS:
1. pan — frying pan
2. pot-cook — cooking pot
3. knife — kitchen knife
4. fork — fork
5. spoon — spoon
6. plate — plate
7. cup — cup
8. bowl — bowl
9. chopping-board — chopping board
Keys: pan,pot-cook,knife,fork,spoon,plate,cup,bowl,chopping-board

SHEET 3 — BATHROOM OBJECTS:
1. toothbrush — toothbrush
2. toothpaste — toothpaste tube (BLANK)
3. soap — soap bar
4. towel — towel
5. shampoo — shampoo bottle (BLANK)
6. bathtub — bathtub
7. toilet — toilet
8. sink — sink
9. comb — hair comb
Keys: toothbrush,toothpaste,soap,towel,shampoo,bathtub,toilet,sink,comb

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 5, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave5 (jobs/kitchen/bathroom)',
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
  themes: ['job-tools', 'kitchen-tools', 'bathroom'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
