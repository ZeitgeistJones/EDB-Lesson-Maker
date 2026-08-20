/**
 * Shift120 wave20 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave20.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave20');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WEATHER / NATURE EXTRA:
1. rainbow — rainbow arc
2. cloud — cloud
3. lightning — lightning bolt
4. tornado — tornado funnel
5. volcano-icon — volcano
6. waterfall — waterfall
7. cave — cave entrance
8. desert-cactus — cactus
9. iceberg — iceberg
Keys: rainbow,cloud,lightning,tornado,volcano-icon,waterfall,cave,desert-cactus,iceberg

SHEET 2 — JOBS / UNIFORM OBJECTS:
1. chef-hat — chef hat
2. nurse-cap — nurse cap
3. police-badge — blank police badge
4. firefighter-helmet — firefighter helmet
5. construction-vest — safety vest
6. lab-coat — lab coat
7. pilot-hat — pilot cap
8. judge-gavel — gavel
9. diploma — blank diploma scroll
Keys: chef-hat,nurse-cap,police-badge,firefighter-helmet,construction-vest,lab-coat,pilot-hat,judge-gavel,diploma

SHEET 3 — HOBBY / OUTDOOR EXTRA:
1. tent-camp — camping tent
2. fishing-hook — fishing hook + line
3. chess-piece — chess king piece
4. playing-cards — blank playing cards stack
5. dice-pair — pair of dice
6. bowling-ball — bowling ball + pin
7. frisbee — frisbee
8. hula-hoop-icon — hula hoop
9. trampoline-icon — mini trampoline
Keys: tent-camp,fishing-hook,chess-piece,playing-cards,dice-pair,bowling-ball,frisbee,hula-hoop-icon,trampoline-icon

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 20 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave20 (nature/jobs/hobby)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
