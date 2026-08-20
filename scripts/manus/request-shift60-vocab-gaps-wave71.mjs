/**
 * Shift60 vocab-gaps wave71 — dim sum + rainforest bugs + kitchen utensils.
 *   node scripts/manus/request-shift60-vocab-gaps-wave71.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave71');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DIM SUM:
1. siu-mai — siu mai dumpling
2. har-gow — har gow dumpling
3. char-siu-bao — char siu bao
4. spring-roll-fried — fried spring roll
5. egg-tart — egg tart
6. rice-noodle-roll — rice noodle roll
7. sesame-ball — sesame ball
8. tea-cup — chinese tea cup
9. bamboo-steamer — bamboo steamer
Keys: siu-mai,har-gow,char-siu-bao,spring-roll-fried,egg-tart,rice-noodle-roll,sesame-ball,tea-cup,bamboo-steamer

SHEET 2 — RAINFOREST BUGS:
1. morpho — blue morpho butterfly
2. leafcutter-ant — leafcutter ant
3. tarantula — tarantula
4. stick-insect — stick insect
5. orchid-bee — orchid bee
6. rhinoceros-beetle — rhinoceros beetle
7. lanternfly — lanternfly
8. bullet-ant — bullet ant
9. glasswing — glasswing butterfly
Keys: morpho,leafcutter-ant,tarantula,stick-insect,orchid-bee,rhinoceros-beetle,lanternfly,bullet-ant,glasswing

SHEET 3 — KITCHEN UTENSILS MORE:
1. colander — colander
2. peeler — vegetable peeler
3. grater — grater
4. garlic-press — garlic press
5. can-opener — can opener
6. corkscrew — corkscrew
7. tongs-kitchen — kitchen tongs
8. ladle-soup — soup ladle
9. spatula-silicone — silicone spatula
Keys: colander,peeler,grater,garlic-press,can-opener,corkscrew,tongs-kitchen,ladle-soup,spatula-silicone

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 71, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave71 (dimsum/bugs/utensils)',
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
  themes: ['dim-sum', 'rainforest-bugs', 'kitchen-utensils'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
