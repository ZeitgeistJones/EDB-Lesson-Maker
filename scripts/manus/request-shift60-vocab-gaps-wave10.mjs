/**
 * Shift60 vocab-gaps wave10 — vegetables + pets + classroom extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave10.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave10');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — VEGETABLES:
1. carrot — carrot
2. potato — potato
3. tomato — tomato
4. lettuce — lettuce
5. cabbage — cabbage
6. pea — peas in pod
7. bean — beans
8. radish — radish
9. spinach — spinach leaves
Keys: carrot,potato,tomato,lettuce,cabbage,pea,bean,radish,spinach

SHEET 2 — PETS:
1. dog — dog
2. cat — cat
3. rabbit — rabbit
4. hamster — hamster
5. goldfish — goldfish
6. parrot-pet — pet parrot
7. guinea-pig — guinea pig
8. turtle-pet — pet turtle
9. puppy — puppy
Keys: dog,cat,rabbit,hamster,goldfish,parrot-pet,guinea-pig,turtle-pet,puppy

SHEET 3 — CLASSROOM EXTRAS:
1. blackboard — blackboard (BLANK, no chalk text)
2. chalk — chalk
3. globe — globe
4. calculator — calculator (blank keys, no readable digits painted)
5. highlighter — highlighter
6. stapler — stapler
7. paperclip — paperclip
8. folder — folder
9. calendar — calendar (BLANK grid, no numbers/text)
Keys: blackboard,chalk,globe,calculator,highlighter,stapler,paperclip,folder,calendar

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 10, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave10 (veg/pets/classroom)',
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
  themes: ['vegetables', 'pets', 'classroom'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
