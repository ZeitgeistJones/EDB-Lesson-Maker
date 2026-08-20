/**
 * Shift60 vocab-gaps wave79 — cookies/polar/garden.
 *   node scripts/manus/request-shift60-vocab-gaps-wave79.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave79');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — COOKIES:
1. chocolate-chip-cookie — chocolate chip cookie
2. oatmeal-cookie — oatmeal cookie
3. sugar-cookie — sugar cookie (BLANK)
4. biscotti — biscotti
5. macaron-pink — macaron
6. fortune-cookie — fortune cookie (BLANK strip)
7. cookie-cutter-star — star cookie cutter
8. cookie-jar — cookie jar (BLANK)
9. milk-glass — glass of milk
Keys: chocolate-chip-cookie,oatmeal-cookie,sugar-cookie,biscotti,macaron-pink,fortune-cookie,cookie-cutter-star,cookie-jar,milk-glass

SHEET 2 — POLAR ANIMALS:
1. polar-bear-cub — polar bear cub
2. penguin-emperor — emperor penguin
3. seal-pup — seal pup
4. arctic-hare — arctic hare
5. musk-ox — musk ox
6. snowy-owl-polar — snowy owl
7. beluga-whale — beluga
8. walrus-tusk — walrus
9. caribou — caribou
Keys: polar-bear-cub,penguin-emperor,seal-pup,arctic-hare,musk-ox,snowy-owl-polar,beluga-whale,walrus-tusk,caribou

SHEET 3 — GARDEN TOOLS MORE:
1. pruning-shears — pruning shears
2. hoe — hoe
3. spade — spade
4. garden-fork — garden fork
5. wheelbarrow-full — wheelbarrow
6. garden-gloves — garden gloves
7. knee-pad — garden knee pad
8. plant-pot — plant pot
9. trellis — garden trellis
Keys: pruning-shears,hoe,spade,garden-fork,wheelbarrow-full,garden-gloves,knee-pad,plant-pot,trellis

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 79, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave79 (cookies/polar/garden)',
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
  themes: ["cookies","polar-animals","garden-tools-more"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
