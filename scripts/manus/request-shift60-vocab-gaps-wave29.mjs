/**
 * Shift60 vocab-gaps wave29 — desserts + baby nursery + garden extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave29.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave29');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DESSERTS / SWEETS MORE:
1. ice-cream-cone — ice cream cone
2. popsicle — popsicle / ice lolly
3. cupcake — cupcake
4. brownie — brownie square
5. cheesecake — cheesecake slice
6. macaron — macaron
7. cotton-candy — cotton candy / candy floss
8. lollipop — lollipop
9. chocolate-bar — chocolate bar (BLANK wrap)
Keys: ice-cream-cone,popsicle,cupcake,brownie,cheesecake,macaron,cotton-candy,lollipop,chocolate-bar

SHEET 2 — BABY / NURSERY:
1. baby-bottle — baby bottle
2. pacifier — pacifier / dummy
3. rattle — baby rattle
4. bib — baby bib (BLANK)
5. crib — crib / cot
6. stroller — stroller / pushchair
7. diaper — diaper / nappy (folded, blank)
8. high-chair — high chair
9. mobile — crib mobile (no text)
Keys: baby-bottle,pacifier,rattle,bib,crib,stroller,diaper,high-chair,mobile

SHEET 3 — GARDEN EXTRAS:
1. watering-can — watering can
2. trowel — garden trowel
3. rake — rake
4. wheelbarrow — wheelbarrow
5. garden-hose — garden hose coil
6. seed-packet — seed packet (BLANK)
7. birdhouse — birdhouse
8. scarecrow — scarecrow
9. compost-bin — compost bin (BLANK)
Keys: watering-can,trowel,rake,wheelbarrow,garden-hose,seed-packet,birdhouse,scarecrow,compost-bin

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 29, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave29 (desserts/baby/garden)',
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
  themes: ['desserts', 'baby-nursery', 'garden-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
