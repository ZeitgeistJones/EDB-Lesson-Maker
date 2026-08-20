/**
 * Shift60 vocab-gaps wave36 — Asian veggies + insects more + camping cookware.
 *   node scripts/manus/request-shift60-vocab-gaps-wave36.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave36');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — MORE VEG / PRODUCE:
1. avocado — avocado
2. mango — mango
3. pineapple — pineapple
4. coconut — coconut
5. kiwi — kiwi fruit
6. pomegranate — pomegranate
7. asparagus — asparagus spears
8. broccoli — broccoli
9. cauliflower — cauliflower
Keys: avocado,mango,pineapple,coconut,kiwi,pomegranate,asparagus,broccoli,cauliflower

SHEET 2 — INSECTS MORE:
1. ladybug — ladybug / ladybird
2. firefly — firefly
3. grasshopper — grasshopper
4. cricket — cricket insect
5. dragonfly — dragonfly
6. beetle — beetle
7. moth — moth
8. wasp — wasp
9. caterpillar — caterpillar
Keys: ladybug,firefly,grasshopper,cricket,dragonfly,beetle,moth,wasp,caterpillar

SHEET 3 — CAMP COOKWARE:
1. dutch-oven — camp dutch oven
2. skillet — cast-iron skillet
3. kettle — camping kettle
4. mess-kit — mess kit plate/bowl stack
5. spork — spork
6. canteen — canteen bottle
7. cooler — cooler box (BLANK)
8. lantern-lamp — camping lantern
9. fire-starter — fire starter / ferro rod
Keys: dutch-oven,skillet,kettle,mess-kit,spork,canteen,cooler,lantern-lamp,fire-starter

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 36, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave36 (produce/insects/camp-cook)',
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
  themes: ['produce-more', 'insects-more', 'camp-cookware'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
