/**
 * Shift60 vocab-gaps wave60 — dinner plates + construction vehicles + laundry extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave60.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave60');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DINNER PLATES:
1. roast-chicken — roast chicken
2. mashed-potato — mashed potatoes
3. gravy-pour — gravy boat pouring
4. green-beans — green beans
5. dinner-roll — dinner roll
6. steak-plate — steak on plate
7. pasta-plate — pasta plate
8. fish-plate — fish fillet plate
9. vegetable-medley — vegetable medley
Keys: roast-chicken,mashed-potato,gravy-pour,green-beans,dinner-roll,steak-plate,pasta-plate,fish-plate,vegetable-medley

SHEET 2 — CONSTRUCTION VEHICLES:
1. excavator — excavator
2. crane — construction crane
3. dump-truck — dump truck
4. cement-mixer — cement mixer
5. forklift — forklift
6. steamroller — steamroller
7. digger — digger
8. cherry-picker — cherry picker lift
9. wheel-loader — wheel loader
Keys: excavator,crane,dump-truck,cement-mixer,forklift,steamroller,digger,cherry-picker,wheel-loader

SHEET 3 — LAUNDRY EXTRAS:
1. washing-machine — washing machine (BLANK)
2. dryer — clothes dryer (BLANK)
3. clothesline — clothesline with pegs
4. iron — iron
5. ironing-board — ironing board
6. detergent — detergent bottle (BLANK)
7. fabric-softener — fabric softener bottle (BLANK)
8. laundry-basket-full — laundry basket
9. clothespin — clothespin / peg
Keys: washing-machine,dryer,clothesline,iron,ironing-board,detergent,fabric-softener,laundry-basket-full,clothespin

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 60, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave60 (dinner/construction/laundry)',
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
  themes: ['dinner-plates', 'construction-vehicles', 'laundry-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
