/**
 * Shift60 vocab-gaps wave63 — taco toppings + garden birds + first aid.
 *   node scripts/manus/request-shift60-vocab-gaps-wave63.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave63');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TACO / MEXICAN TOPPINGS:
1. tortilla-chip — tortilla chip
2. salsa — salsa bowl
3. guacamole-bowl — guacamole
4. sour-cream — sour cream dollop
5. jalapeno — jalapeño
6. cilantro — cilantro bunch
7. lime-wedge — lime wedge
8. refried-beans — refried beans bowl
9. quesadilla — quesadilla
Keys: tortilla-chip,salsa,guacamole-bowl,sour-cream,jalapeno,cilantro,lime-wedge,refried-beans,quesadilla

SHEET 2 — GARDEN BIRDS:
1. robin — robin
2. sparrow — sparrow
3. bluebird — bluebird
4. cardinal — cardinal
5. chickadee — chickadee
6. finch — finch
7. woodpecker — woodpecker
8. dove — dove
9. swallow — swallow
Keys: robin,sparrow,bluebird,cardinal,chickadee,finch,woodpecker,dove,swallow

SHEET 3 — FIRST AID:
1. first-aid-box — first aid box (BLANK, no cross text)
2. adhesive-bandage — adhesive bandage
3. gauze-roll — gauze roll
4. antiseptic-wipe — antiseptic wipe packet (BLANK)
5. ice-pack-aid — ice pack
6. sling-arm — arm sling
7. tweezers-aid — tweezers
8. gloves-latex — latex gloves
9. flashlight-aid — flashlight
Keys: first-aid-box,adhesive-bandage,gauze-roll,antiseptic-wipe,ice-pack-aid,sling-arm,tweezers-aid,gloves-latex,flashlight-aid

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 63, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave63 (taco/birds/firstaid)',
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
  themes: ['taco-toppings', 'garden-birds', 'first-aid'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
