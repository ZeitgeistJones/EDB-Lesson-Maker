/**
 * Shift60 vocab-gaps wave125 — home gear + transport + food/misc (post-import mop).
 *   node scripts/manus/request-shift60-vocab-gaps-wave125.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave125');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOME GEAR:
1. rug — rug
2. bunk — bunk bed
3. card — playing card (BLANK face)
4. dish — dish
5. tile — tile
6. note — sticky note (BLANK)
7. sock — sock
8. tank — fish tank
9. sign — blank sign board
Keys: rug,bunk,card,dish,tile,note,sock,tank,sign

SHEET 2 — TRANSPORT / GEAR:
1. jeep — jeep
2. tyre — tyre
3. rail — train rail
4. tuba — tuba
5. wand — magic wand
6. dart — dart
7. hoop — hoop
8. hood — hoodie / hood
9. palm — palm tree
Keys: jeep,tyre,rail,tuba,wand,dart,hoop,hood,palm

SHEET 3 — FOOD / NATURE EXTRAS:
1. leek — leek
2. wine — wine bottle (BLANK)
3. coal — coal lump
4. hill — hill
5. hole — hole in ground
6. rock — rock
7. bulb — light bulb
8. vet — vet clinic building
9. king — king crown (object, not person face)
Keys: leek,wine,coal,hill,hole,rock,bulb,vet,king

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 125, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave125 (home/transport/food)',
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
  themes: ['home-gear', 'transport-gear', 'food-nature'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
