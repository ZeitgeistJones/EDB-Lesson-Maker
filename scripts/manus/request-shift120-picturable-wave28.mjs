/**
 * Shift120 wave28 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave28.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave28');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FRUIT EXTRA OBJECTS:
1. watermelon — watermelon slice
2. pineapple — pineapple
3. mango — mango
4. peach — peach
5. cherry — cherries
6. grape-bunch — grape bunch
7. kiwi — kiwi fruit
8. coconut — coconut
9. lemon — lemon
Keys: watermelon,pineapple,mango,peach,cherry,grape-bunch,kiwi,coconut,lemon

SHEET 2 — VEGGIES EXTRA OBJECTS:
1. broccoli — broccoli
2. cauliflower — cauliflower
3. cucumber — cucumber
4. mushroom — mushroom
5. onion — onion
6. garlic — garlic bulb
7. pepper-bell — bell pepper
8. eggplant — eggplant
9. corn-cob — corn cob
Keys: broccoli,cauliflower,cucumber,mushroom,onion,garlic,pepper-bell,eggplant,corn-cob

SHEET 3 — BIRTHDAY / PARTY OBJECTS:
1. birthday-cake — birthday cake (no text/numbers)
2. party-hat — party hat
3. balloon — balloon
4. gift-box — wrapped gift box
5. confetti-popper — confetti popper
6. candle — candle
7. streamers — party streamers
8. pinata — pinata
9. party-plate — party plate
Keys: birthday-cake,party-hat,balloon,gift-box,confetti-popper,candle,streamers,pinata,party-plate

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 28 };
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
  title: 'ESL white vocab 3×3: Shift120 picturable wave28 (fruit/veggie/party)',
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
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
