/**
 * Shift60 vocab-gaps wave39 — seafood + farm machines + bedroom extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave39.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave39');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SEAFOOD:
1. shrimp — shrimp / prawn
2. salmon — salmon fillet
3. tuna — tuna steak
4. oyster — oyster
5. mussel — mussel
6. squid — squid
7. octopus — octopus
8. scallop — scallop
9. fish-and-chips — fish and chips plate
Keys: shrimp,salmon,tuna,oyster,mussel,squid,octopus,scallop,fish-and-chips

SHEET 2 — FARM MACHINES:
1. combine-harvester — combine harvester
2. plow — plow
3. baler — hay baler
4. milking-machine — milking machine
5. silo — grain silo
6. hay-bale — hay bale
7. chicken-coop — chicken coop
8. trough — animal trough
9. pitchfork — pitchfork
Keys: combine-harvester,plow,baler,milking-machine,silo,hay-bale,chicken-coop,trough,pitchfork

SHEET 3 — BEDROOM EXTRAS:
1. pillow — pillow
2. duvet — duvet / comforter
3. blanket — blanket
4. alarm-clock — alarm clock (BLANK face)
5. bed — bed
6. wardrobe-hangers — clothes hangers
7. laundry-basket — laundry basket
8. slippers — slippers
9. reading-lamp — bedside reading lamp
Keys: pillow,duvet,blanket,alarm-clock,bed,wardrobe-hangers,laundry-basket,slippers,reading-lamp

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 39, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave39 (seafood/farm/bedroom)',
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
  themes: ['seafood', 'farm-machines', 'bedroom-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
