/**
 * Shift120 wave13 — picturable still-lifes (skip abstracts). Keep loop warm.
 *   node scripts/manus/request-shift120-picturable-wave13.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave13');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOSPITAL / CLINIC OBJECTS:
1. hospital-bed — hospital bed
2. iv-stand — IV stand (bag blank)
3. wheelchair-clinic — wheelchair
4. xray-film — blank x-ray film
5. syringe — syringe (no needle tip gore — capped)
6. pill-bottle — blank pill bottle
7. blood-pressure-cuff — BP cuff
8. otoscope — ear otoscope
9. waiting-chair — waiting room chair
Keys: hospital-bed,iv-stand,wheelchair-clinic,xray-film,syringe,pill-bottle,blood-pressure-cuff,otoscope,waiting-chair

SHEET 2 — GARDEN / PLANT OBJECTS:
1. flower-pot — flower pot
2. seedling — seedling in pot
3. garden-gloves — garden gloves
4. pruning-shears — pruning shears
5. wheelbarrow-garden — wheelbarrow with soil
6. birdbath — birdbath
7. greenhouse — small greenhouse
8. tomato-plant — tomato plant
9. sunflower-tall — tall sunflower
Keys: flower-pot,seedling,garden-gloves,pruning-shears,wheelbarrow-garden,birdbath,greenhouse,tomato-plant,sunflower-tall

SHEET 3 — MEDIA / TECH OBJECTS:
1. tablet — tablet device (blank screen)
2. headphones-tech — headphones
3. speaker — speaker
4. game-controller — game controller
5. remote-control — TV remote (blank)
6. charger — phone charger
7. usb-stick — USB stick
8. printer — printer
9. webcam — webcam
Keys: tablet,headphones-tech,speaker,game-controller,remote-control,charger,usb-stick,printer,webcam

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 13 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave13 (clinic/garden/tech)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
