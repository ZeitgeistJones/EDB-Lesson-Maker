/**
 * Shift60 vocab-gaps wave101 — wheels + nature + animals (rankedGaps 158–315).
 *   node scripts/manus/request-shift60-vocab-gaps-wave101.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave101');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WHEELS & GEAR:
1. pedal — bicycle pedal
2. skate — ice skate
3. wagon — wagon
4. wheel — wheel
5. barrel — barrel
6. bumper — car bumper
7. duffel — duffel bag
8. saddle — saddle
9. rowboat — rowboat
Keys: pedal,skate,wagon,wheel,barrel,bumper,duffel,saddle,rowboat

SHEET 2 — NATURE SCENES:
1. petal — flower petal
2. river — river
3. shore — shore
4. slope — grassy slope
5. branch — tree branch
6. meadow — meadow
7. valley — valley
8. willow — willow tree
9. orchard — orchard
Keys: petal,river,shore,slope,branch,meadow,valley,willow,orchard

SHEET 3 — ANIMALS:
1. skunk — skunk
2. stork — stork
3. cattle — cow
4. falcon — falcon
5. insect — insect
6. pigeon — pigeon
7. weasel — weasel
8. buffalo — buffalo
9. gazelle — gazelle
Keys: skunk,stork,cattle,falcon,insect,pigeon,weasel,buffalo,gazelle

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 101, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave101 (wheels/nature/animals)',
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
  themes: ['wheels-gear', 'nature-scenes', 'animals'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
