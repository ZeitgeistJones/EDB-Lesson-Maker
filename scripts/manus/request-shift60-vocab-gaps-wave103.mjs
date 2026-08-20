/**
 * Shift60 vocab-gaps wave103 — cloth + nature extras + gems (rankedGaps 158–315).
 *   node scripts/manus/request-shift60-vocab-gaps-wave103.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave103');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CLOTH & CRAFT:
1. buckle — buckle
2. jumper — jumper sweater
3. pocket — pocket
4. ribbon — ribbon
5. sandal — sandal
6. sleeve — sleeve
7. string — string ball
8. thread — thread spool
9. laundry — laundry basket
Keys: buckle,jumper,pocket,ribbon,sandal,sleeve,string,thread,laundry

SHEET 2 — NATURE EXTRAS:
1. trail — trail path
2. canopy — tree canopy
3. clover — clover
4. cocoon — cocoon
5. boulder — boulder
6. glacier — glacier
7. beehive — beehive
8. thorn — thorn
9. meteor — meteor
Keys: trail,canopy,clover,cocoon,boulder,glacier,beehive,thorn,meteor

SHEET 3 — GEMS & GIFTS:
1. crystal — crystal
2. diamond — diamond gem
3. emerald — emerald gem
4. capsule — capsule
5. present — wrapped gift (BLANK)
6. picture — picture frame (BLANK)
7. plaster — plaster cast
8. puppet — puppet
9. scroll — scroll (BLANK, no text)
Keys: crystal,diamond,emerald,capsule,present,picture,plaster,puppet,scroll

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 103, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave103 (cloth/nature/gems)',
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
  themes: ['cloth-craft', 'nature-extras', 'gems-gifts'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
