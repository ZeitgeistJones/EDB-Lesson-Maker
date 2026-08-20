/**
 * Shift60 vocab-gaps wave33 — dairy/deli + farm birds + airport travel.
 *   node scripts/manus/request-shift60-vocab-gaps-wave33.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave33');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DAIRY / DELI:
1. cheese-wedge — cheese wedge
2. cheddar-block — cheddar block
3. mozzarella — mozzarella ball
4. butter — stick of butter
5. cream — cream jug
6. milk-carton — milk carton (BLANK)
7. salami — salami sausage
8. ham — ham slice
9. olives — olives in bowl
Keys: cheese-wedge,cheddar-block,mozzarella,butter,cream,milk-carton,salami,ham,olives

SHEET 2 — FARM BIRDS / POULTRY:
1. chicken — chicken
2. rooster — rooster
3. duck — duck
4. goose — goose
5. turkey — turkey
6. chick — baby chick
7. hen — hen
8. peacock-feather — peacock feather
9. egg — egg
Keys: chicken,rooster,duck,goose,turkey,chick,hen,peacock-feather,egg

SHEET 3 — AIRPORT / TRAVEL:
1. boarding-pass — boarding pass (BLANK)
2. luggage-tag — luggage tag (BLANK)
3. trolley — airport luggage trolley
4. seatbelt — airplane seatbelt
5. life-vest — airplane life vest
6. headset — airline headset
7. tray-table — airplane tray table
8. passport-stamp — passport stamp pad (BLANK)
9. duty-free-bag — shopping bag (BLANK)
Keys: boarding-pass,luggage-tag,trolley,seatbelt,life-vest,headset,tray-table,passport-stamp,duty-free-bag

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 33, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave33 (dairy/birds/airport)',
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
  themes: ['dairy-deli', 'farm-birds', 'airport-travel'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
