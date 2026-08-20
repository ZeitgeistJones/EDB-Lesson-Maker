/**
 * Shift60 vocab-gaps wave67 — roast dinner + farm insects pests + train travel.
 *   node scripts/manus/request-shift60-vocab-gaps-wave67.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave67');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — ROAST DINNER:
1. roast-beef — roast beef
2. yorkshire-pudding — yorkshire pudding
3. roast-potato — roast potatoes
4. brussels-sprouts — brussels sprouts
5. stuffing — stuffing scoop
6. cranberry-sauce — cranberry sauce bowl
7. mint-sauce — mint sauce (BLANK jar)
8. gravy-jug — gravy jug
9. pudding — dessert pudding bowl
Keys: roast-beef,yorkshire-pudding,roast-potato,brussels-sprouts,stuffing,cranberry-sauce,mint-sauce,gravy-jug,pudding

SHEET 2 — GARDEN PESTS:
1. aphid — aphid
2. slug-pest — slug
3. caterpillar-pest — caterpillar
4. whitefly — whitefly
5. weevil — weevil
6. earwig — earwig
7. mite — mite
8. leafhopper — leafhopper
9. cutworm — cutworm
Keys: aphid,slug-pest,caterpillar-pest,whitefly,weevil,earwig,mite,leafhopper,cutworm

SHEET 3 — TRAIN TRAVEL:
1. train — passenger train
2. train-ticket — train ticket (BLANK)
3. platform — platform sign silhouette (BLANK)
4. suitcase-train — suitcase
5. backpack-travel — travel backpack
6. coffee-cup-travel — takeaway coffee (BLANK)
7. magazine — magazine (BLANK cover)
8. seat — train seat
9. whistle-train — train whistle
Keys: train,train-ticket,platform,suitcase-train,backpack-travel,coffee-cup-travel,magazine,seat,whistle-train

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 67, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave67 (roast/pests/train)',
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
  themes: ['roast-dinner', 'garden-pests', 'train-travel'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
