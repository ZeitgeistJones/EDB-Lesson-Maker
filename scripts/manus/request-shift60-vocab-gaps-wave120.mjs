/**
 * Shift60 vocab-gaps wave120 — homes/buildings + places + nature/food (rankedGaps 316–end).
 *   node scripts/manus/request-shift60-vocab-gaps-wave120.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave120');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOMES / BUILDINGS:
1. shelter — simple hut shelter
2. bungalow — bungalow house
3. basement — basement stairs / cellar entrance
4. building — multi-story building
5. village — small village cluster
6. terrace — outdoor terrace patio
7. corridor — hallway corridor
8. cupboard — cupboard
9. doorknob — doorknob
Keys: shelter,bungalow,basement,building,village,terrace,corridor,cupboard,doorknob

SHEET 2 — PLACES / STRUCTURES:
1. station — train station building
2. campsite — tent campsite
3. pharmacy — pharmacy storefront (BLANK sign)
4. workshop — workshop shed
5. warehouse — warehouse
6. supermarket — supermarket building
7. planetarium — planetarium dome
8. underground — subway entrance
9. waterpark — waterpark with slide
Keys: station,campsite,pharmacy,workshop,warehouse,supermarket,planetarium,underground,waterpark

SHEET 3 — NATURE / FOOD:
1. thistle — thistle flower
2. barnacle — barnacle
3. aquarium — fish aquarium tank
4. porcupine — porcupine
5. dinosaur — dinosaur
6. vegetable — mixed vegetable
7. grapefruit — grapefruit
8. vinegar — vinegar bottle (BLANK)
9. cinnamon — cinnamon sticks
Keys: thistle,barnacle,aquarium,porcupine,dinosaur,vegetable,grapefruit,vinegar,cinnamon

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 120, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave120 (homes/places/nature)',
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
  themes: ['homes-buildings', 'places-structures', 'nature-food'],
  gap_slice: '316-end',
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
