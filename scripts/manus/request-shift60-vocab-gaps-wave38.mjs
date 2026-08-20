/**
 * Shift60 vocab-gaps wave38 — BBQ picnic + weather gear + castle extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave38.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave38');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BBQ / PICNIC:
1. grill — barbecue grill
2. tongs — grilling tongs
3. spatula — BBQ spatula
4. hot-dog — hot dog in bun
5. burger — hamburger
6. corn-cob — corn on the cob
7. picnic-basket — picnic basket
8. picnic-blanket — picnic blanket
9. cooler-bag — soft cooler bag
Keys: grill,tongs,spatula,hot-dog,burger,corn-cob,picnic-basket,picnic-blanket,cooler-bag

SHEET 2 — WEATHER GEAR:
1. raincoat — raincoat
2. rain-boots — rain boots / wellingtons
3. poncho — rain poncho
4. sunglasses — sunglasses
5. sun-hat — sun hat
6. scarf — scarf
7. mittens — mittens
8. earmuffs — earmuffs
9. windbreaker — windbreaker jacket
Keys: raincoat,rain-boots,poncho,sunglasses,sun-hat,scarf,mittens,earmuffs,windbreaker

SHEET 3 — CASTLE / MEDIEVAL EXTRAS:
1. crown — crown
2. shield — shield (BLANK, no crest text)
3. sword — sword
4. helmet-knight — knight helmet
5. goblet — goblet
6. torch-wall — wall torch
7. drawbridge — drawbridge section
8. banner — blank banner flag
9. treasure-chest — treasure chest
Keys: crown,shield,sword,helmet-knight,goblet,torch-wall,drawbridge,banner,treasure-chest

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 38, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave38 (bbq/weather/castle)',
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
  themes: ['bbq-picnic', 'weather-gear', 'castle-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
