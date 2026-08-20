/**
 * Shift120 wave21 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave21.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave21');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CITY BUILDINGS OBJECTS:
1. skyscraper — skyscraper
2. apartment — apartment building
3. school-building — school building
4. hospital-building — hospital building
5. museum — museum building
6. theater — theater building
7. stadium — stadium
8. bridge — bridge
9. fountain-city — city fountain
Keys: skyscraper,apartment,school-building,hospital-building,museum,theater,stadium,bridge,fountain-city

SHEET 2 — KITCHEN FOOD PREP EXTRA:
1. rolling-pin — rolling pin
2. cookie-cutter — cookie cutter
3. muffin-tin — muffin tin
4. pie-dish — pie dish
5. colander-icon — colander
6. ladle-icon — ladle
7. tongs-icon — tongs
8. peeler-icon — peeler
9. grater-icon — grater
Keys: rolling-pin,cookie-cutter,muffin-tin,pie-dish,colander-icon,ladle-icon,tongs-icon,peeler-icon,grater-icon

SHEET 3 — BEDROOM / SLEEP OBJECTS:
1. bed — bed
2. pillow — pillow
3. blanket — blanket
4. alarm-clock — alarm clock (blank face)
5. nightstand-lamp — nightstand lamp
6. pajamas — pajamas folded
7. slippers — slippers
8. eye-mask-sleep — sleep eye mask
9. stuffed-animal — stuffed animal
Keys: bed,pillow,blanket,alarm-clock,nightstand-lamp,pajamas,slippers,eye-mask-sleep,stuffed-animal

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 21 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave21 (city/kitchen/bedroom)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
