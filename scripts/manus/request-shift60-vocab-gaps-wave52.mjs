/**
 * Shift60 vocab-gaps wave52 — BBQ meats + desert animals + stationery more.
 *   node scripts/manus/request-shift60-vocab-gaps-wave52.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave52');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BBQ MEATS / SIDES:
1. steak — steak
2. ribs — ribs
3. chicken-wing — chicken wing
4. kebab-skewer — kebab skewer
5. coleslaw — coleslaw bowl
6. baked-potato — baked potato
7. grilled-veg — grilled vegetables
8. sauce-bottle — BBQ sauce bottle (BLANK)
9. charcoal — charcoal bag (BLANK)
Keys: steak,ribs,chicken-wing,kebab-skewer,coleslaw,baked-potato,grilled-veg,sauce-bottle,charcoal

SHEET 2 — DESERT ANIMALS:
1. camel-dromedary — dromedary camel
2. desert-fox — fennec fox
3. lizard-desert — desert lizard
4. rattlesnake — rattlesnake
5. scorpion-desert — desert scorpion
6. roadrunner — roadrunner bird
7. coyote — coyote
8. armadillo — armadillo
9. tortoise-desert — desert tortoise
Keys: camel-dromedary,desert-fox,lizard-desert,rattlesnake,scorpion-desert,roadrunner,coyote,armadillo,tortoise-desert

SHEET 3 — STATIONERY MORE:
1. eraser — eraser
2. pencil-sharpener — pencil sharpener
3. ruler — ruler (BLANK, tick marks ok)
4. glue — glue bottle (BLANK)
5. tape — tape dispenser
6. highlighter — highlighter
7. pen — pen
8. notebook — notebook (BLANK cover)
9. folder — folder
Keys: eraser,pencil-sharpener,ruler,glue,tape,highlighter,pen,notebook,folder

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 52, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave52 (bbq/desert/stationery)',
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
  themes: ['bbq-meats', 'desert-animals', 'stationery-more'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
