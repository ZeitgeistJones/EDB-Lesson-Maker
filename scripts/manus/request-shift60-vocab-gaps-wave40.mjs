/**
 * Shift60 vocab-gaps wave40 — candy snacks + space extras + lab science.
 *   node scripts/manus/request-shift60-vocab-gaps-wave40.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave40');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CANDY / SNACKS:
1. gummy-bear — gummy bear
2. jellybean — jelly bean
3. candy-cane — candy cane
4. marshmallow — marshmallow
5. popcorn — popcorn box (BLANK)
6. pretzel-stick — pretzel stick
7. chips — potato chips bag (BLANK)
8. cookie — cookie
9. donut — donut / doughnut
Keys: gummy-bear,jellybean,candy-cane,marshmallow,popcorn,pretzel-stick,chips,cookie,donut

SHEET 2 — SPACE EXTRAS:
1. rocket — rocket
2. satellite — satellite
3. astronaut-helmet — astronaut helmet
4. moon — moon
5. planet — ringed planet
6. comet — comet
7. telescope — telescope
8. spacesuit — spacesuit
9. space-station — space station module
Keys: rocket,satellite,astronaut-helmet,moon,planet,comet,telescope,spacesuit,space-station

SHEET 3 — LAB / SCIENCE:
1. test-tube — test tube
2. beaker — beaker
3. flask — erlenmeyer flask
4. microscope — microscope
5. magnifying-glass — magnifying glass
6. petri-dish — petri dish
7. bunsen-burner — bunsen burner
8. goggles — safety goggles
9. pipette — pipette
Keys: test-tube,beaker,flask,microscope,magnifying-glass,petri-dish,bunsen-burner,goggles,pipette

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 40, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave40 (candy/space/lab)',
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
  themes: ['candy-snacks', 'space-extras', 'lab-science'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
