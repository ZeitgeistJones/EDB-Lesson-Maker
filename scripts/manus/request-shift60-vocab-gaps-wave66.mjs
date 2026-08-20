/**
 * Shift60 vocab-gaps wave66 — smoothie toppings + pond life + hair salon.
 *   node scripts/manus/request-shift60-vocab-gaps-wave66.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave66');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SMOOTHIE TOPPINGS:
1. chia-seeds — chia seeds pile
2. granola-topping — granola
3. coconut-flakes — coconut flakes
4. berry-mix — mixed berries
5. banana-slice — banana slices
6. honey-drizzle — honey drizzle
7. peanut-butter — peanut butter jar (BLANK)
8. protein-powder — protein powder scoop (BLANK jar)
9. smoothie-cup — takeaway smoothie cup (BLANK)
Keys: chia-seeds,granola-topping,coconut-flakes,berry-mix,banana-slice,honey-drizzle,peanut-butter,protein-powder,smoothie-cup

SHEET 2 — POND LIFE:
1. frog-pond — frog
2. tadpole — tadpole
3. dragonfly-nymph — dragonfly
4. water-lily — water lily
5. cattail — cattail reed
6. duckling — duckling
7. newt-pond — newt
8. pond-snail — pond snail
9. dragonfly-pond — dragonfly over water
Keys: frog-pond,tadpole,dragonfly-nymph,water-lily,cattail,duckling,newt-pond,pond-snail,dragonfly-pond

SHEET 3 — HAIR SALON:
1. scissors-hair — hair scissors
2. comb-salon — comb
3. hair-dryer — hair dryer
4. hairbrush-round — round hairbrush
5. hair-clip — hair clip
6. shampoo-salon — shampoo bottle (BLANK)
7. cape — salon cape
8. mirror-salon — hand mirror
9. curling-iron — curling iron
Keys: scissors-hair,comb-salon,hair-dryer,hairbrush-round,hair-clip,shampoo-salon,cape,mirror-salon,curling-iron

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 66, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave66 (smoothie/pond/salon)',
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
  themes: ['smoothie-toppings', 'pond-life', 'hair-salon'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
