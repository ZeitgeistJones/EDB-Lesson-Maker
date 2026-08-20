/**
 * Shift120 wave19 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave19.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave19');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — INSECTS / BUGS OBJECTS:
1. butterfly-icon — butterfly
2. bee-icon — bee
3. ant — ant
4. ladybug — ladybug
5. spider — spider
6. caterpillar — caterpillar
7. dragonfly — dragonfly
8. grasshopper — grasshopper
9. beetle-icon — beetle
Keys: butterfly-icon,bee-icon,ant,ladybug,spider,caterpillar,dragonfly,grasshopper,beetle-icon

SHEET 2 — FRUIT / VEG EXTRA:
1. strawberry — strawberry
2. watermelon — watermelon slice
3. pineapple — pineapple
4. mango — mango
5. peach — peach
6. broccoli — broccoli
7. cucumber — cucumber
8. onion — onion
9. potato — potato
Keys: strawberry,watermelon,pineapple,mango,peach,broccoli,cucumber,onion,potato

SHEET 3 — CLASSROOM SUPPLIES EXTRA:
1. chalk-board-eraser — chalkboard eraser
2. protractor-icon — protractor
3. compass-drawing — drawing compass
4. hole-puncher — hole puncher
5. binder-clip — binder clip
6. index-cards — blank index cards
7. highlighter-pen — highlighter
8. correction-tape — correction tape
9. desk-calendar — blank desk calendar
Keys: chalk-board-eraser,protractor-icon,compass-drawing,hole-puncher,binder-clip,index-cards,highlighter-pen,correction-tape,desk-calendar

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 19 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave19 (bugs/produce/school)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
