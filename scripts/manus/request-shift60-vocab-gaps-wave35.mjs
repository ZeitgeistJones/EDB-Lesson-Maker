/**
 * Shift60 vocab-gaps wave35 — drinks + ocean extras + art supplies.
 *   node scripts/manus/request-shift60-vocab-gaps-wave35.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave35');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DRINKS:
1. smoothie — smoothie glass
2. milkshake — milkshake with straw
3. lemonade — lemonade glass
4. hot-chocolate — hot chocolate mug
5. bubble-tea — bubble tea cup (BLANK)
6. espresso — espresso cup
7. iced-tea — iced tea glass
8. coconut-drink — coconut drink with straw
9. energy-drink — energy drink can (BLANK)
Keys: smoothie,milkshake,lemonade,hot-chocolate,bubble-tea,espresso,iced-tea,coconut-drink,energy-drink

SHEET 2 — OCEAN EXTRAS:
1. coral — coral
2. jellyfish — jellyfish
3. seahorse — seahorse
4. starfish — starfish
5. crab — crab
6. lobster — lobster
7. clam — clam / clam shell
8. seaweed — seaweed
9. sand-dollar — sand dollar
Keys: coral,jellyfish,seahorse,starfish,crab,lobster,clam,seaweed,sand-dollar

SHEET 3 — ART SUPPLIES:
1. paintbrush — paintbrush
2. palette — artist palette
3. easel — easel
4. watercolor-set — watercolor set (BLANK)
5. crayon — crayon
6. colored-pencil — colored pencil
7. glue-stick — glue stick (BLANK)
8. glitter — glitter jar (BLANK)
9. clay — modeling clay lump
Keys: paintbrush,palette,easel,watercolor-set,crayon,colored-pencil,glue-stick,glitter,clay

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 35, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave35 (drinks/ocean/art)',
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
  themes: ['drinks', 'ocean-extras', 'art-supplies'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
