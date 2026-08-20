/**
 * Shift60 vocab-gaps wave124 — dress-up + places + water (post-import mop).
 *   node scripts/manus/request-shift60-vocab-gaps-wave124.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave124');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DRESS / BODY PROPS:
1. gem — gemstone
2. fur — fur coat
3. gum — chewing gum pack (BLANK)
4. bone — bone
5. wig — wig
6. lips — lips
7. veil — veil
8. gown — gown
9. vest — vest
Keys: gem,fur,gum,bone,wig,lips,veil,gown,vest

SHEET 2 — PLACES / STRUCTURES:
1. gym — gym building exterior
2. city — city skyline
3. fort — fort
4. mall — shopping mall exterior
5. mill — windmill
6. path — path
7. road — road
8. roof — roof
9. wall — wall
Keys: gym,city,fort,mall,mill,path,road,roof,wall

SHEET 3 — WATER / SHORE:
1. lake — lake
2. pier — pier
3. pond — pond
4. pool — swimming pool
5. port — port / harbour
6. raft — raft
7. dock — dock
8. well — water well
9. dune — sand dune
Keys: lake,pier,pond,pool,port,raft,dock,well,dune

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 124, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave124 (dress/places/water)',
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
  themes: ['dress-body', 'places-structures', 'water-shore'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
