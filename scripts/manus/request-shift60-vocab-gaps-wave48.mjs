/**
 * Shift60 vocab-gaps wave48 — cheese board + garden flowers + electrician tools.
 *   node scripts/manus/request-shift60-vocab-gaps-wave48.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave48');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CHEESE BOARD / APPETIZERS:
1. cheese-board — cheese board
2. crackers — crackers
3. grapes-bunch — grapes
4. fig — fig
5. prosciutto — prosciutto slice
6. bruschetta — bruschetta
7. dip — dip bowl
8. olive-bowl — olives bowl
9. baguette-slice — baguette slices
Keys: cheese-board,crackers,grapes-bunch,fig,prosciutto,bruschetta,dip,olive-bowl,baguette-slice

SHEET 2 — GARDEN FLOWERS:
1. rose — rose
2. tulip — tulip
3. sunflower — sunflower
4. daisy — daisy
5. lily — lily
6. orchid — orchid
7. lavender — lavender sprig
8. bouquet — flower bouquet
9. watering-wand — watering wand / spray nozzle
Keys: rose,tulip,sunflower,daisy,lily,orchid,lavender,bouquet,watering-wand

SHEET 3 — ELECTRICIAN / UTILITY TOOLS:
1. screwdriver — screwdriver
2. pliers — pliers
3. wire-cutters — wire cutters
4. multimeter — multimeter (BLANK screen)
5. extension-cord — extension cord coil
6. lightbulb — lightbulb
7. switch — wall light switch
8. outlet — electrical outlet
9. fuse — fuse
Keys: screwdriver,pliers,wire-cutters,multimeter,extension-cord,lightbulb,switch,outlet,fuse

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 48, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave48 (cheese/flowers/electrician)',
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
  themes: ['cheese-board', 'garden-flowers', 'electrician-tools'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
