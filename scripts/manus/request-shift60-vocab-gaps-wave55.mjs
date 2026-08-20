/**
 * Shift60 vocab-gaps wave55 — cafe drinks + rainforest plants + nurse kit.
 *   node scripts/manus/request-shift60-vocab-gaps-wave55.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave55');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CAFE DRINKS MORE:
1. cappuccino — cappuccino cup
2. latte — latte glass
3. mocha — mocha cup
4. flat-white — flat white cup
5. iced-coffee — iced coffee
6. matcha — matcha latte
7. chai — chai tea cup
8. pastry-croissant — croissant on plate
9. muffin-cafe — cafe muffin
Keys: cappuccino,latte,mocha,flat-white,iced-coffee,matcha,chai,pastry-croissant,muffin-cafe

SHEET 2 — RAINFOREST PLANTS:
1. palm-leaf — palm leaf
2. banana-leaf — banana leaf
3. vine — vine
4. orchid-wild — wild orchid
5. bromeliad — bromeliad
6. fern-leaf — fern leaf
7. bamboo — bamboo stalks
8. cocoa-pod — cocoa pod
9. passionfruit — passionfruit
Keys: palm-leaf,banana-leaf,vine,orchid-wild,bromeliad,fern-leaf,bamboo,cocoa-pod,passionfruit

SHEET 3 — NURSE KIT:
1. nurse-cap — nurse cap
2. clipboard-nurse — clipboard (BLANK)
3. thermometer-ear — ear thermometer
4. bandage-strip — adhesive bandage
5. antiseptic — antiseptic bottle (BLANK)
6. gauze — gauze pad
7. tweezers — tweezers
8. scissors-medical — medical scissors
9. pulse-oximeter — pulse oximeter (BLANK)
Keys: nurse-cap,clipboard-nurse,thermometer-ear,bandage-strip,antiseptic,gauze,tweezers,scissors-medical,pulse-oximeter

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 55, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave55 (cafe/plants/nurse)',
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
  themes: ['cafe-drinks-more', 'rainforest-plants', 'nurse-kit'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
