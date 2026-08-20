/**
 * Shift60 vocab-gaps wave88 — clothing-wear + home-objects + water-places.
 *   node scripts/manus/request-shift60-vocab-gaps-wave88.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave88');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CLOTHING / WEAR:
1. fur — fur pelt
2. wig — wig
3. gown — gown
4. hood — hood
5. sock — sock
6. veil — veil
7. vest — vest
8. cloak — cloak
9. mitt — mitt
Keys: fur,wig,gown,hood,sock,veil,vest,cloak,mitt

SHEET 2 — HOME OBJECTS:
1. rug — rug
2. bunk — bunk bed
3. bulb — light bulb
4. tile — tile
5. couch — couch
6. chest — chest
7. brush — brush
8. cloth — cloth
9. glass — drinking glass
Keys: rug,bunk,bulb,tile,couch,chest,brush,cloth,glass

SHEET 3 — WATER / SHORE:
1. dam — dam
2. lake — lake
3. pond — pond
4. pool — swimming pool
5. dock — dock
6. pier — pier
7. port — port harbor
8. canal — canal
9. creek — creek
Keys: dam,lake,pond,pool,dock,pier,port,canal,creek

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 88, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave88 (clothing-wear/home-objects/water-places)',
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
  themes: ["clothing-wear","home-objects","water-places"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
