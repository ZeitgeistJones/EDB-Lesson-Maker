/**
 * Shift60 vocab-gaps wave61 — fruit salad + insects helpful + plumber extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave61.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave61');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — MORE FRUIT:
1. peach — peach
2. plum — plum
3. apricot — apricot
4. pear — pear
5. fig-fruit — fig
6. date — date fruit
7. papaya — papaya
8. guava — guava
9. lychee — lychee
Keys: peach,plum,apricot,pear,fig-fruit,date,papaya,guava,lychee

SHEET 2 — HELPFUL INSECTS:
1. honeybee — honeybee
2. ladybug-red — ladybug
3. butterfly-blue — blue butterfly
4. earthworm-soil — earthworm
5. dragonfly-green — dragonfly
6. firefly-glow — firefly
7. bumblebee-fat — bumblebee
8. lacewing — lacewing
9. hoverfly — hoverfly
Keys: honeybee,ladybug-red,butterfly-blue,earthworm-soil,dragonfly-green,firefly-glow,bumblebee-fat,lacewing,hoverfly

SHEET 3 — PLUMBER EXTRAS:
1. pipe-wrench — pipe wrench
2. plunger — plunger
3. pipe — metal pipe section
4. faucet — faucet / tap
5. drain — drain grate
6. toilet — toilet
7. water-heater — water heater tank
8. shutoff-valve — shutoff valve
9. snake-auger — drain snake / auger
Keys: pipe-wrench,plunger,pipe,faucet,drain,toilet,water-heater,shutoff-valve,snake-auger

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 61, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave61 (fruit/insects/plumber)',
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
  themes: ['more-fruit', 'helpful-insects', 'plumber-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
