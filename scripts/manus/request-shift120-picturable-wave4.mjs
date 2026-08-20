/**
 * Shift120 wave4 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave4.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave4');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HEALTH / BODY CARE OBJECTS:
1. bandage — adhesive bandage
2. ice-pack — ice pack
3. tissues — tissue box (blank)
4. thermometer-body — oral thermometer (blank)
5. medicine-bottle — blank medicine bottle
6. crutches — crutches pair
7. wheelchair — wheelchair
8. first-aid-cross — first-aid kit (cross symbol ok, no letters)
9. cotton-ball — cotton balls jar
Keys: bandage,ice-pack,tissues,thermometer-body,medicine-bottle,crutches,wheelchair,first-aid-cross,cotton-ball

SHEET 2 — CITY / STREET OBJECTS:
1. bus-stop — bus stop sign post (blank face)
2. streetlight — street lamp
3. bench-city — park/city bench
4. trash-can — trash can
5. crosswalk — zebra crosswalk section
6. bike-rack — bicycle rack
7. mailbox-city — mailbox
8. newsstand — blank newsstand kiosk
9. taxi — taxi car side view
Keys: bus-stop,streetlight,bench-city,trash-can,crosswalk,bike-rack,mailbox-city,newsstand,taxi

SHEET 3 — HOBBY / CRAFT OBJECTS:
1. knitting-needles — knitting needles + yarn ball
2. paint-palette — paint palette (no brand)
3. camera — camera
4. puzzle-box — blank puzzle box
5. board-game — blank board game box
6. kite — kite
7. skateboard — skateboard
8. fishing-rod — fishing rod
9. binoculars-hobby — binoculars
Keys: knitting-needles,paint-palette,camera,puzzle-box,board-game,kite,skateboard,fishing-rod,binoculars-hobby

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 4 };
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave4 (health/city/hobby)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
