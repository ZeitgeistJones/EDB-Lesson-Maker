/**
 * Shift60 vocab-gaps wave65 — cheese types + african animals + school bag.
 *   node scripts/manus/request-shift60-vocab-gaps-wave65.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave65');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CHEESE TYPES:
1. brie — brie wheel
2. blue-cheese — blue cheese wedge
3. gouda — gouda wheel
4. swiss-cheese — swiss cheese slice with holes
5. cream-cheese — cream cheese tub (BLANK)
6. cottage-cheese — cottage cheese bowl
7. string-cheese — string cheese
8. cheese-grater — cheese grater
9. cheese-knife — cheese knife
Keys: brie,blue-cheese,gouda,swiss-cheese,cream-cheese,cottage-cheese,string-cheese,cheese-grater,cheese-knife

SHEET 2 — AFRICAN ANIMALS:
1. lioness — lioness
2. cheetah — cheetah
3. leopard — leopard
4. hyena — hyena
5. baboon — baboon
6. gorilla — gorilla
7. chimpanzee — chimpanzee
8. warthog — warthog
9. wildebeest — wildebeest
Keys: lioness,cheetah,leopard,hyena,baboon,gorilla,chimpanzee,warthog,wildebeest

SHEET 3 — SCHOOL BAG CONTENTS:
1. pencil-case — pencil case
2. calculator — calculator (BLANK screen)
3. water-bottle — water bottle
4. textbook — textbook (BLANK cover)
5. homework-folder — homework folder
6. lunch-bag — lunch bag
7. gym-bag — gym bag
8. library-card — library card (BLANK)
9. schedule — blank schedule card (BLANK)
Keys: pencil-case,calculator,water-bottle,textbook,homework-folder,lunch-bag,gym-bag,library-card,schedule

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 65, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave65 (cheese/africa/schoolbag)',
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
  themes: ['cheese-types', 'african-animals', 'school-bag'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
