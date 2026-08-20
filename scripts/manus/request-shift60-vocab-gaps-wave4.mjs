/**
 * Shift60 vocab-gaps wave4 — transport + sports + weather.
 *   node scripts/manus/request-shift60-vocab-gaps-wave4.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave4');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TRANSPORT:
1. car — car
2. bus — bus
3. train — train
4. plane — airplane
5. bike — bicycle
6. boat — boat
7. taxi — taxi (BLANK door, no text)
8. motorcycle — motorcycle
9. helicopter — helicopter
Keys: car,bus,train,plane,bike,boat,taxi,motorcycle,helicopter

SHEET 2 — SPORTS GEAR:
1. ball — generic ball
2. bat — baseball/cricket bat
3. racket — tennis racket
4. helmet — sports helmet
5. net — sports net
6. goal — soccer goal
7. medal — medal (no text)
8. trophy — trophy (no text)
9. jersey — sports jersey (BLANK, no numbers)
Keys: ball,bat,racket,helmet,net,goal,medal,trophy,jersey

SHEET 3 — WEATHER ICONS:
1. sun — sun
2. cloud — cloud
3. rain — rain cloud / raindrops
4. snow — snowflake
5. wind — wind swirl / wind icon
6. umbrella — umbrella
7. rainbow — rainbow
8. lightning — lightning bolt
9. thermometer — thermometer (no numbers)
Keys: sun,cloud,rain,snow,wind,umbrella,rainbow,lightning,thermometer

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 4, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave4 (transport/sports/weather)',
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
  themes: ['transport', 'sports-gear', 'weather'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
