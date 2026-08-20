/**
 * Shift60 vocab-gaps wave19 — park + circus + laundry.
 *   node scripts/manus/request-shift60-vocab-gaps-wave19.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave19');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PARK / OUTDOORS:
1. bench — park bench
2. fountain — fountain
3. picnic-basket — picnic basket
4. picnic-blanket — picnic blanket
5. kite — kite
6. frisbee — frisbee
7. binoculars — binoculars
8. bird-feeder — bird feeder
9. lamppost — lamppost
Keys: bench,fountain,picnic-basket,picnic-blanket,kite,frisbee,binoculars,bird-feeder,lamppost

SHEET 2 — CIRCUS / FAIR:
1. clown-hat — clown hat
2. juggling-balls — juggling balls
3. unicycle — unicycle
4. trapeze — trapeze bar
5. circus-tent — circus tent (no text)
6. popcorn-cart — popcorn cart (BLANK signs)
7. carousel-horse — carousel horse
8. cotton-candy — cotton candy / candy floss
9. ticket-stub — ticket stub (BLANK, no numbers)
Keys: clown-hat,juggling-balls,unicycle,trapeze,circus-tent,popcorn-cart,carousel-horse,cotton-candy,ticket-stub

SHEET 3 — LAUNDRY:
1. washing-machine — washing machine
2. clothes-peg — clothes peg / clothespin
3. laundry-basket — laundry basket
4. iron — clothes iron
5. ironing-board — ironing board
6. detergent — detergent bottle (BLANK label)
7. dryer — tumble dryer
8. hanger — clothes hanger
9. sewing-kit — sewing kit / needle + thread
Keys: washing-machine,clothes-peg,laundry-basket,iron,ironing-board,detergent,dryer,hanger,sewing-kit

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 19, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave19 (park/circus/laundry)',
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
  themes: ['park', 'circus', 'laundry'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
