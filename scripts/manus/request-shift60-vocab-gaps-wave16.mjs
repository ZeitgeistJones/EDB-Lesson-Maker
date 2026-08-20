/**
 * Shift60 vocab-gaps wave16 — transport extras + YLE leftovers + family objects.
 *   node scripts/manus/request-shift60-vocab-gaps-wave16.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave16');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TRANSPORT EXTRAS:
1. lorry — lorry / truck
2. yacht — yacht
3. ferry — ferry
4. tram — tram
5. scooter — kick scooter
6. skateboard — skateboard
7. van — van
8. submarine — submarine
9. hot-air-balloon — hot air balloon
Keys: lorry,yacht,ferry,tram,scooter,skateboard,van,submarine,hot-air-balloon

SHEET 2 — YLE LEFTOVERS / FOOD EXTRAS:
1. biscuit — biscuit / cookie round
2. chopsticks — chopsticks
3. lemonade — lemonade glass (BLANK, no text)
4. popcorn — popcorn
5. pancake — pancake stack
6. sausage — sausage
7. cereal — cereal bowl (BLANK box nearby OK without text)
8. yoghurt — yoghurt pot (BLANK lid)
9. jam — jam jar (BLANK label)
Keys: biscuit,chopsticks,lemonade,popcorn,pancake,sausage,cereal,yoghurt,jam

SHEET 3 — FAMILY PICTURABLE OBJECTS:
1. photo-frame — photo frame (BLANK photo / solid color inside)
2. wedding-ring — wedding ring
3. baby-bottle — baby bottle
4. cradle — cradle / crib
5. high-chair — high chair
6. pram — pram / stroller
7. family-photo — simple framed family silhouette (no faces detail, no text)
8. house-key — house key
9. mailbox — mailbox (no numbers/text)
Keys: photo-frame,wedding-ring,baby-bottle,cradle,high-chair,pram,family-photo,house-key,mailbox

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 16, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave16 (transport/YLE/family)',
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
  themes: ['transport-extras', 'yle-leftovers', 'family-objects'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
