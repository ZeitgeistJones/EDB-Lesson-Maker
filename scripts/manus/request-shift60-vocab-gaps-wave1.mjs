/**
 * Shift60 vocab-gaps wave1 — beekeeping + farm + garden (picturable).
 *   node scripts/manus/request-shift60-vocab-gaps-wave1.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave1');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BEEKEEPING CORE:
1. bee — honeybee
2. hive — beehive box / skep
3. honeycomb — honeycomb hex cells
4. beekeeper — beekeeper in white suit + hat (full figure OK, simple icon)
5. nectar — nectar drop / flower with nectar cue
6. honey — honey jar (BLANK label)
7. smoker — bee smoker tool
8. queen-bee — queen bee (slightly larger/marked, still readable)
9. pollen — pollen grains / pollen on flower
Keys: bee,hive,honeycomb,beekeeper,nectar,honey,smoker,queen-bee,pollen

SHEET 2 — FARM ANIMALS:
1. cow — cow
2. pig — pig
3. sheep — sheep
4. horse — horse
5. chicken — chicken
6. duck — duck
7. goat — goat
8. rooster — rooster
9. donkey — donkey
Keys: cow,pig,sheep,horse,chicken,duck,goat,rooster,donkey

SHEET 3 — GARDEN / NATURE OBJECTS:
1. flower — flower
2. tree — tree
3. leaf — leaf
4. seed — seeds
5. watering-can — watering can
6. rake — rake
7. shovel — shovel
8. pot — flower pot
9. butterfly — butterfly
Keys: flower,tree,leaf,seed,watering-can,rake,shovel,pot,butterfly

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 1, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave1 (beekeeping/farm/garden)',
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
  themes: ['beekeeping', 'farm-animals', 'garden-nature'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
