/**
 * Shift60 vocab-gaps wave54 — pizza toppings + farm insects + garage tools.
 *   node scripts/manus/request-shift60-vocab-gaps-wave54.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave54');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PIZZA TOPPINGS:
1. pizza-whole — whole pizza (BLANK, no text)
2. pepperoni — pepperoni slices
3. mushroom-slice — mushroom slices
4. olive-slice — olive slices
5. bell-pepper — bell pepper
6. pineapple-ring — pineapple ring
7. mozzarella-shred — shredded mozzarella
8. pizza-cutter — pizza cutter
9. pizza-box — pizza box (BLANK)
Keys: pizza-whole,pepperoni,mushroom-slice,olive-slice,bell-pepper,pineapple-ring,mozzarella-shred,pizza-cutter,pizza-box

SHEET 2 — GARDEN CRITTERS:
1. earthworm — earthworm
2. ladybird — ladybird
3. butterfly-monarch — monarch butterfly
4. bumblebee — bumblebee
5. praying-mantis — praying mantis
6. beetle-stag — stag beetle
7. dragonfly-blue — dragonfly
8. caterpillar-green — caterpillar
9. snail-shell — snail with shell
Keys: earthworm,ladybird,butterfly-monarch,bumblebee,praying-mantis,beetle-stag,dragonfly-blue,caterpillar-green,snail-shell

SHEET 3 — GARAGE TOOLS:
1. wrench — wrench
2. hammer — hammer
3. drill — power drill
4. saw — handsaw
5. level — spirit level
6. tape-measure — tape measure
7. oil-can — oil can
8. jack — car jack
9. tire — car tire
Keys: wrench,hammer,drill,saw,level,tape-measure,oil-can,jack,tire

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 54, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave54 (pizza/critters/garage)',
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
  themes: ['pizza-toppings', 'garden-critters', 'garage-tools'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
