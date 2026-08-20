/**
 * Shift60 vocab-gaps wave58 — candy shop + beach gear + classroom tech.
 *   node scripts/manus/request-shift60-vocab-gaps-wave58.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave58');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CANDY SHOP:
1. candy-jar — candy jar (BLANK)
2. chocolate-box — chocolate box (BLANK)
3. fudge — fudge square
4. toffee — toffee
5. rock-candy — rock candy stick
6. gumball — gumball
7. licorice — licorice twist
8. caramel — caramel
9. peppermint — peppermint candy
Keys: candy-jar,chocolate-box,fudge,toffee,rock-candy,gumball,licorice,caramel,peppermint

SHEET 2 — BEACH GEAR:
1. beach-towel — beach towel (BLANK)
2. beach-umbrella — beach umbrella
3. cooler-beach — beach cooler
4. sandcastle-bucket — sandcastle bucket
5. shovel-beach — beach shovel
6. snorkel-set — snorkel set
7. bodyboard — bodyboard
8. sunscreen — sunscreen bottle (BLANK)
9. beach-chair — beach chair
Keys: beach-towel,beach-umbrella,cooler-beach,sandcastle-bucket,shovel-beach,snorkel-set,bodyboard,sunscreen,beach-chair

SHEET 3 — CLASSROOM TECH:
1. projector — projector
2. interactive-board — interactive whiteboard (BLANK)
3. tablet — tablet (BLANK screen)
4. headphones — headphones
5. document-camera — document camera
6. speaker — classroom speaker
7. usb-drive — USB drive
8. charging-station — charging station
9. laptop — laptop (BLANK)
Keys: projector,interactive-board,tablet,headphones,document-camera,speaker,usb-drive,charging-station,laptop

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 58, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave58 (candy/beach/tech)',
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
  themes: ['candy-shop', 'beach-gear', 'classroom-tech'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
