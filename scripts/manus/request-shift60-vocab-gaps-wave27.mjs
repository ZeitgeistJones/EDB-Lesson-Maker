/**
 * Shift60 vocab-gaps wave27 — street food + more animals + occupation tools.
 *   node scripts/manus/request-shift60-vocab-gaps-wave27.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave27');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — STREET / WORLD FOOD:
1. taco — taco
2. sushi — sushi roll
3. dumpling — dumpling / gyoza
4. pretzel — pretzel
5. waffle — waffle
6. kebab — kebab skewer
7. burrito — burrito
8. spring-roll — spring roll
9. ramen-bowl — ramen bowl (no text)
Keys: taco,sushi,dumpling,pretzel,waffle,kebab,burrito,spring-roll,ramen-bowl

SHEET 2 — MORE ANIMALS:
1. penguin — penguin
2. kangaroo — kangaroo
3. panda — panda
4. flamingo — flamingo
5. hedgehog — hedgehog
6. owl — owl
7. fox — fox
8. squirrel — squirrel
9. peacock — peacock
Keys: penguin,kangaroo,panda,flamingo,hedgehog,owl,fox,squirrel,peacock

SHEET 3 — OCCUPATION TOOLS:
1. chef-hat — chef hat
2. paint-roller — paint roller
3. welding-mask — welding mask
4. cash-register — cash register (BLANK, no numbers)
5. clipboard — clipboard (BLANK)
6. megaphone — megaphone
7. hard-hat — hard hat / safety helmet
8. toolbox — toolbox
9. badge — blank ID badge (no text/photo)
Keys: chef-hat,paint-roller,welding-mask,cash-register,clipboard,megaphone,hard-hat,toolbox,badge

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 27, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave27 (food/animals/jobs)',
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
  themes: ['street-food', 'more-animals', 'occupation-tools'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
