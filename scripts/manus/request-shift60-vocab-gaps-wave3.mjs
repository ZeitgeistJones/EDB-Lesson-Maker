/**
 * Shift60 vocab-gaps wave3 — home + clothes + body.
 *   node scripts/manus/request-shift60-vocab-gaps-wave3.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave3');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOME OBJECTS:
1. bed — bed
2. lamp — lamp
3. mirror — mirror
4. clock — clock (blank face, no numbers)
5. window — window
6. door — door
7. chair — chair
8. table — table
9. fridge — refrigerator (BLANK)
Keys: bed,lamp,mirror,clock,window,door,chair,table,fridge

SHEET 2 — CLOTHES:
1. shirt — shirt
2. trousers — trousers / pants
3. dress — dress
4. skirt — skirt
5. jacket — jacket
6. coat — coat
7. socks — socks
8. shoes — shoes
9. hat — hat
Keys: shirt,trousers,dress,skirt,jacket,coat,socks,shoes,hat

SHEET 3 — BODY PARTS (crops / icons, not full portraits):
1. hand — hand
2. foot — foot
3. eye — eye
4. ear — ear
5. nose — nose
6. mouth — mouth
7. arm — arm
8. leg — leg
9. head — simple head silhouette (no face detail needed)
Keys: hand,foot,eye,ear,nose,mouth,arm,leg,head

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 3, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave3 (home/clothes/body)',
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
  themes: ['home-objects', 'clothes', 'body-parts'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
