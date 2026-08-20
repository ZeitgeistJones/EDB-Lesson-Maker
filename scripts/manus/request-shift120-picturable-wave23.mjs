/**
 * Shift120 wave23 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave23.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave23');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPACE EXTRA OBJECTS:
1. rocket-ship — rocket
2. astronaut — astronaut figure
3. planet-earth — earth globe
4. moon-icon — moon
5. satellite-icon — satellite
6. alien — friendly alien
7. telescope-icon — telescope
8. space-station — space station
9. comet-icon — comet
Keys: rocket-ship,astronaut,planet-earth,moon-icon,satellite-icon,alien,telescope-icon,space-station,comet-icon

SHEET 2 — MUSIC INSTRUMENTS EXTRA:
1. drum-set — drum set
2. saxophone-icon — saxophone
3. harmonica-icon — harmonica
4. accordion — accordion
5. harp — harp
6. cello-icon — cello
7. trombone-icon — trombone
8. clarinet-icon — clarinet
9. electric-guitar — electric guitar
Keys: drum-set,saxophone-icon,harmonica-icon,accordion,harp,cello-icon,trombone-icon,clarinet-icon,electric-guitar

SHEET 3 — CLOTHES EXTRA OBJECTS:
1. t-shirt — t-shirt
2. jeans — jeans
3. dress — dress
4. skirt — skirt
5. sweater — sweater
6. tie — necktie
7. bow-tie — bow tie
8. baseball-cap — baseball cap
9. scarf-icon — scarf
Keys: t-shirt,jeans,dress,skirt,sweater,tie,bow-tie,baseball-cap,scarf-icon

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 23 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave23 (space/music/clothes)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
