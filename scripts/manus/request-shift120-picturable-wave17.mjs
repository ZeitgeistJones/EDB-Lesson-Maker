/**
 * Shift120 wave17 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave17.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave17');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FARM ANIMALS / BARN OBJECTS:
1. cow — cow still-life
2. pig — pig still-life
3. chicken — chicken still-life
4. horse — horse still-life
5. sheep — sheep still-life
6. goat — goat still-life
7. duck — duck still-life
8. tractor-farm — farm tractor
9. barn-door — barn door
Keys: cow,pig,chicken,horse,sheep,goat,duck,tractor-farm,barn-door

SHEET 2 — SEA / AQUARIUM OBJECTS:
1. dolphin — dolphin
2. whale — whale
3. shark — shark
4. octopus-icon — octopus
5. crab-icon — crab
6. lobster — lobster
7. seaweed-icon — seaweed
8. coral-icon — coral
9. diving-helmet — old diving helmet
Keys: dolphin,whale,shark,octopus-icon,crab-icon,lobster,seaweed-icon,coral-icon,diving-helmet

SHEET 3 — HOUSEHOLD FURNITURE OBJECTS:
1. armchair — armchair
2. bookshelf-home — home bookshelf
3. coffee-table — coffee table
4. floor-lamp — floor lamp
5. wardrobe-drawer — chest of drawers
6. wardrobe — wardrobe
7. bedside-table — bedside table
8. dining-chair — dining chair
9. rug-icon — rug
Keys: armchair,bookshelf-home,coffee-table,floor-lamp,dresser-drawer,wardrobe,bedside-table,dining-chair,rug-icon

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 17 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave17 (farm/sea/furniture)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
