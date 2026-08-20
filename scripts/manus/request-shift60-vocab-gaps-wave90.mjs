/**
 * Shift60 vocab-gaps wave90 — treasure-food + misc-objects-a + misc-objects-b.
 *   node scripts/manus/request-shift60-vocab-gaps-wave90.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave90');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TREASURE / FOOD:
1. gem — gem
2. jewel — jewel
3. jelly — jelly
4. fruit — fruit
5. wine — wine bottle
6. holly — holly
7. gum — chewing gum
8. card — playing card (BLANK)
9. sign — signboard (BLANK)
Keys: gem,jewel,jelly,fruit,wine,holly,gum,card,sign

SHEET 2 — MISC OBJECTS A:
1. bone — bone
2. foil — foil sheet
3. hose — hose
4. wand — wand
5. arrow — arrow
6. chain — chain
7. crate — crate
8. frame — picture frame
9. alarm — alarm clock
Keys: bone,foil,hose,wand,arrow,chain,crate,frame,alarm

SHEET 3 — MISC OBJECTS B:
1. palm — palm tree
2. rock — rock
3. roof — roof
4. well — water well
5. wood — wood plank
6. wool — wool skein
7. cargo — cargo crate
8. fence — fence
9. hedge — hedge
Keys: palm,rock,roof,well,wood,wool,cargo,fence,hedge

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 90, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave90 (treasure-food/misc-objects-a/misc-objects-b)',
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
  themes: ["treasure-food","misc-objects-a","misc-objects-b"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
