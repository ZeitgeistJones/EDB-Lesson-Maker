/**
 * Shift60 vocab-gaps wave49 — ice cream parlor + farm produce + firefighter extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave49.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave49');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — ICE CREAM PARLOR:
1. sundae — ice cream sundae
2. waffle-cone — waffle cone empty
3. ice-cream-scoop — ice cream scoop tool
4. milkshake-glass — milkshake glass
5. topping-jar — topping jar (BLANK)
6. sprinkles — sprinkles pile
7. whipped-cream — whipped cream swirl
8. banana-split — banana split
9. soft-serve — soft serve cone
Keys: sundae,waffle-cone,ice-cream-scoop,milkshake-glass,topping-jar,sprinkles,whipped-cream,banana-split,soft-serve

SHEET 2 — FARM PRODUCE:
1. pumpkin-farm — pumpkin
2. corn — corn ear
3. wheat — wheat sheaf
4. potato — potato
5. carrot — carrot
6. onion — onion
7. tomato — tomato
8. cucumber — cucumber
9. lettuce — lettuce head
Keys: pumpkin-farm,corn,wheat,potato,carrot,onion,tomato,cucumber,lettuce

SHEET 3 — FIREFIGHTER EXTRAS:
1. fire-hose — fire hose
2. hydrant — fire hydrant
3. axe — fire axe
4. extinguisher — fire extinguisher (BLANK)
5. smoke-alarm — smoke alarm (BLANK)
6. firefighter-helmet — firefighter helmet
7. oxygen-mask — oxygen mask
8. ladder — extension ladder
9. siren — siren light
Keys: fire-hose,hydrant,axe,extinguisher,smoke-alarm,firefighter-helmet,oxygen-mask,ladder,siren

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 49, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave49 (icecream/farm/fire)',
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
  themes: ['ice-cream-parlor', 'farm-produce', 'firefighter-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
