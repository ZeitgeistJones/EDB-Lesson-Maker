/**
 * Shift60 vocab-gaps wave43 — sandwiches + woodland animals + musical extras 2.
 *   node scripts/manus/request-shift60-vocab-gaps-wave43.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave43');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SANDWICHES / LUNCH:
1. sandwich — sandwich
2. wrap — wrap / burrito wrap
3. salad — salad bowl
4. soup — soup bowl
5. quiche — quiche slice
6. sausage-roll — sausage roll
7. chicken-nugget — chicken nuggets
8. fries — french fries
9. apple-pie — apple pie slice
Keys: sandwich,wrap,salad,soup,quiche,sausage-roll,chicken-nugget,fries,apple-pie

SHEET 2 — WOODLAND ANIMALS:
1. deer — deer
2. moose — moose
3. beaver — beaver
4. raccoon — raccoon
5. badger — badger
6. wolf — wolf
7. bear — bear
8. wild-boar — wild boar
9. chipmunk — chipmunk
Keys: deer,moose,beaver,raccoon,badger,wolf,bear,wild-boar,chipmunk

SHEET 3 — MUSIC EXTRAS 2:
1. xylophone — xylophone
2. triangle — triangle instrument
3. maracas — maracas
4. bongo — bongo drums
5. accordion — accordion
6. flute — flute
7. clarinet — clarinet
8. trumpet — trumpet
9. violin — violin
Keys: xylophone,triangle,maracas,bongo,accordion,flute,clarinet,trumpet,violin

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 43, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave43 (lunch/woodland/music2)',
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
  themes: ['lunch-food', 'woodland-animals', 'music-extras-2'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
