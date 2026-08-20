/**
 * Shift60 vocab-gaps wave14b — RETRY bakery + tools + playground (wave14 rate-limited, 0 PNGs).
 *   node scripts/manus/request-shift60-vocab-gaps-wave14b.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave14b');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BAKERY / SWEETS:
1. croissant — croissant
2. muffin — muffin
3. donut — donut (no icing letters)
4. cookie — cookie
5. pie — pie
6. ice-cream — ice cream cone
7. chocolate — chocolate bar (BLANK wrapper)
8. candy — candy
9. cupcake — cupcake
Keys: croissant,muffin,donut,cookie,pie,ice-cream,chocolate,candy,cupcake

SHEET 2 — HAND TOOLS:
1. screwdriver — screwdriver
2. pliers — pliers
3. saw — saw
4. drill — power drill
5. nail — nail
6. screw — screw
7. tape-measure — tape measure (no readable numbers)
8. toolbox — toolbox
9. ladder — ladder
Keys: screwdriver,pliers,saw,drill,nail,screw,tape-measure,toolbox,ladder

SHEET 3 — PLAYGROUND:
1. slide — slide
2. swing — swing
3. seesaw — seesaw
4. monkey-bars — monkey bars
5. sandbox — sandbox
6. trampoline — trampoline
7. merry-go-round — merry-go-round
8. climbing-frame — climbing frame
9. hopscotch — hopscotch grid (blank squares, no numbers)
Keys: slide,swing,seesaw,monkey-bars,sandbox,trampoline,merry-go-round,climbing-frame,hopscotch

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: '14b', shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave14b RETRY (bakery/tools/playground)',
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
  themes: ['bakery', 'hand-tools', 'playground'],
  retry_of: 'wave14',
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
