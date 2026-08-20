/**
 * Shift120 wave10 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave10.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave10');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CAMPING / OUTDOORS GEAR:
1. sleeping-bag — sleeping bag rolled
2. camping-stove — camping stove
3. flashlight — flashlight
4. canteen-hike — hiking canteen
5. trail-boots — hiking boots
6. map-case — blank map in case
7. insect-repellent — blank spray bottle (bug spray cue)
8. first-aid-pouch — first-aid pouch
9. camp-chair — folding camp chair
Keys: sleeping-bag,camping-stove,flashlight,canteen-hike,trail-boots,map-case,insect-repellent,first-aid-pouch,camp-chair

SHEET 2 — ART / CRAFT SUPPLIES:
1. crayon-box — crayon box (blank)
2. colored-pencils — colored pencils cup
3. scissors-craft — craft scissors
4. glue-bottle — glue bottle (blank)
5. construction-paper — paper stack
6. clay-lump — modeling clay lump
7. stamp-pad — ink stamp pad
8. glitter-glue — glitter glue bottle (blank)
9. craft-stick — craft sticks bundle
Keys: crayon-box,colored-pencils,scissors-craft,glue-bottle,construction-paper,clay-lump,stamp-pad,glitter-glue,craft-stick

SHEET 3 — MONEY / SHOPPING OBJECTS:
1. credit-card — blank credit card
2. coin-purse — coin purse
3. shopping-cart — shopping cart
4. barcode — blank barcode tag
5. gift-card — blank gift card
6. cash-register-icon — cash register
7. price-gun — price label gun
8. receipt-roll — receipt roll
9. change-tray — change tray with coins
Keys: credit-card,coin-purse,shopping-cart,barcode,gift-card,cash-register-icon,price-gun,receipt-roll,change-tray

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 10 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave10 (camp/art/money)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
