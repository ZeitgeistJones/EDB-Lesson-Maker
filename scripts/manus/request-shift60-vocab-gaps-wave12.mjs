/**
 * Shift60 vocab-gaps wave12 — feelings objects + money objects + recycling.
 *   node scripts/manus/request-shift60-vocab-gaps-wave12.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave12');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts. For feelings use face-icon OBJECTS (simple emoji-like faces), not scenes.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FEELING FACES (simple face icons):
1. happy — happy face
2. sad — sad face
3. angry — angry face
4. scared — scared face
5. surprised — surprised face
6. tired — tired/sleepy face
7. sick — sick face
8. proud — proud/smiling face
9. shy — shy face
Keys: happy,sad,angry,scared,surprised,tired,sick,proud,shy

SHEET 2 — MONEY OBJECTS (no readable numbers/currency symbols as text):
1. coin — coin
2. wallet — wallet
3. piggy-bank — piggy bank
4. cash — cash bills (BLANK, no numbers)
5. credit-card — credit card (BLANK)
6. receipt — blank receipt (lines only, no text)
7. price-tag — blank price tag (no numbers)
8. safe — safe / lockbox
9. ATM — ATM machine (BLANK screen)
Keys: coin,wallet,piggy-bank,cash,credit-card,receipt,price-tag,safe,atm

SHEET 3 — RECYCLING / NATURE CARE OBJECTS:
1. recycle-bin — recycling bin (arrows symbol OK, no letters)
2. trash-can — trash can
3. plastic-bottle — plastic bottle
4. paper-stack — stack of paper
5. plant — potted plant
6. solar-panel — solar panel
7. wind-turbine — wind turbine
8. earth — earth globe
9. reusable-bag — reusable shopping bag
Keys: recycle-bin,trash-can,plastic-bottle,paper-stack,plant,solar-panel,wind-turbine,earth,reusable-bag

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 12, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave12 (feelings/money/recycle)',
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
  themes: ['feeling-faces', 'money-objects', 'recycling'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
