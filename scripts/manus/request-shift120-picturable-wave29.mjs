/**
 * Shift120 wave29 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave29.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave29');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — INSECTS / BUGS EXTRA:
1. butterfly — butterfly
2. bee — bee
3. ladybug — ladybug
4. ant — ant
5. grasshopper — grasshopper
6. dragonfly — dragonfly
7. caterpillar — caterpillar
8. snail — snail
9. spider — spider (friendly, not scary)
Keys: butterfly,bee,ladybug,ant,grasshopper,dragonfly,caterpillar,snail,spider

SHEET 2 — SPORTS GEAR EXTRA:
1. tennis-ball — tennis ball
2. soccer-ball — soccer ball
3. baseball — baseball
4. football-american — American football
5. basketball — basketball
6. golf-club — golf club
7. tennis-racket — tennis racket
8. baseball-glove — baseball glove
9. whistle — whistle
Keys: tennis-ball,soccer-ball,baseball,football-american,basketball,golf-club,tennis-racket,baseball-glove,whistle

SHEET 3 — HOUSEHOLD FURNITURE EXTRA:
1. sofa — sofa
2. armchair — armchair
3. coffee-table — coffee table
4. bookshelf — bookshelf
5. wardrobe — wardrobe
6. dresser — dresser
7. dining-table — dining table
8. stool — stool
9. rug — rug
Keys: sofa,armchair,coffee-table,bookshelf,wardrobe,dresser,dining-table,stool,rug

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 29 };
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
  title: 'ESL white vocab 3×3: Shift120 picturable wave29 (bugs/sports/furniture)',
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
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
