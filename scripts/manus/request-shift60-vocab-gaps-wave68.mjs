/**
 * Shift60 vocab-gaps wave68 — bakery cakes + farm equipment + swimming pool.
 *   node scripts/manus/request-shift60-vocab-gaps-wave68.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave68');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CAKES / PASTRY:
1. layer-cake — layer cake (BLANK, no text)
2. carrot-cake — carrot cake slice
3. lemon-tart — lemon tart
4. cream-puff — cream puff
5. profiterole — profiterole
6. madeleine — madeleine
7. shortbread — shortbread
8. gingerbread — gingerbread person (no face text)
9. bundt-cake — bundt cake
Keys: layer-cake,carrot-cake,lemon-tart,cream-puff,profiterole,madeleine,shortbread,gingerbread,bundt-cake

SHEET 2 — FARM EQUIPMENT MORE:
1. tractor-small — small tractor
2. plow-blade — plow blade
3. seed-drill — seed drill
4. irrigation — irrigation sprinkler
5. fence-post — fence post with wire
6. gate — farm gate
7. grain-sack — grain sack (BLANK)
8. milk-can — milk can
9. egg-basket — egg basket
Keys: tractor-small,plow-blade,seed-drill,irrigation,fence-post,gate,grain-sack,milk-can,egg-basket

SHEET 3 — SWIMMING POOL:
1. swim-goggles — swim goggles
2. swim-cap — swim cap
3. kickboard — kickboard
4. pool-noodle — pool noodle
5. floaties — arm floaties
6. diving-board — diving board
7. pool-ladder — pool ladder
8. towel-pool — pool towel
9. whistle-lifeguard — lifeguard whistle
Keys: swim-goggles,swim-cap,kickboard,pool-noodle,floaties,diving-board,pool-ladder,towel-pool,whistle-lifeguard

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 68, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave68 (cakes/farm/pool)',
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
  themes: ['cakes-pastry', 'farm-equipment-more', 'swimming-pool'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
