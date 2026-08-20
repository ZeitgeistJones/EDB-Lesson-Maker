/**
 * Shift60 vocab-gaps wave75 — spice rack + coral reef + classroom furniture.
 *   node scripts/manus/request-shift60-vocab-gaps-wave75.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave75');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPICE RACK:
1. paprika — paprika jar (BLANK)
2. cumin — cumin jar (BLANK)
3. turmeric — turmeric jar (BLANK)
4. oregano — oregano jar (BLANK)
5. basil-dried — dried basil jar (BLANK)
6. thyme — thyme jar (BLANK)
7. bay-leaf — bay leaves
8. star-anise — star anise
9. cloves — cloves
Keys: paprika,cumin,turmeric,oregano,basil-dried,thyme,bay-leaf,star-anise,cloves

SHEET 2 — CORAL REEF:
1. clownfish — clownfish
2. angelfish — angelfish
3. seahorse-reef — seahorse
4. sea-turtle — sea turtle
5. stingray — stingray
6. coral-brain — brain coral
7. anemone — sea anemone
8. moray-eel — moray eel
9. reef-shark — reef shark
Keys: clownfish,angelfish,seahorse-reef,sea-turtle,stingray,coral-brain,anemone,moray-eel,reef-shark

SHEET 3 — CLASSROOM FURNITURE:
1. student-desk — student desk
2. teacher-desk — teacher desk
3. chalkboard — chalkboard (BLANK)
4. bookshelf-class — classroom bookshelf
5. cubby — cubby shelf
6. beanbag-chair — beanbag chair
7. round-table — round table
8. easel-class — classroom easel
9. clock-wall — wall clock (BLANK face)
Keys: student-desk,teacher-desk,chalkboard,bookshelf-class,cubby,beanbag-chair,round-table,easel-class,clock-wall

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 75, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave75 (spices/reef/classroom)',
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
  themes: ['spice-rack', 'coral-reef', 'classroom-furniture'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
