/**
 * Shift60 vocab-gaps wave127 — weather + materials + job props (post coverageloop ~89%).
 *   node scripts/manus/request-shift60-vocab-gaps-wave127.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave127');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WEATHER / MATERIALS:
1. rainy — rain cloud with drops
2. snowy — snow cloud with flakes
3. sunny — bright sun
4. windy — wind swirl with leaf
5. cloudy — fluffy cloud
6. spring — metal coil spring
7. powder — powder pile
8. rubber — rubber eraser
9. leather — leather wallet (BLANK)
Keys: rainy,snowy,sunny,windy,cloudy,spring,powder,rubber,leather

SHEET 2 — HARD MATERIALS / GEAR:
1. steel — steel bar
2. waste — tied trash bag
3. cement — cement bag (BLANK)
4. cotton — cotton ball
5. gravel — gravel pile
6. golf — golf ball on tee
7. guide — guidebook (BLANK cover)
8. queen — royal crown
9. travel — suitcase (BLANK)
Keys: steel,waste,cement,cotton,gravel,golf,guide,queen,travel

SHEET 3 — JOB PROPS (handheld / still-life — NO full people faces):
1. waiter — serving tray with plate
2. barista — coffee portafilter
3. captain — captain hat
4. cashier — cash register
5. dentist — dental mirror tool
6. hostess — menu stand (BLANK)
7. officer — police badge
8. soldier — military helmet
9. cowboy — cowboy hat
Keys: waiter,barista,captain,cashier,dentist,hostess,officer,soldier,cowboy

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 127, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave127 (weather/materials/job-props)',
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
  themes: ['weather-materials', 'hard-materials-gear', 'job-props'],
  skipped_abstract: ['hug', 'love', 'note', 'draw', 'energy', 'public', 'circle', 'feelings', 'routines', 'dict', 'kids', 'parents'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
