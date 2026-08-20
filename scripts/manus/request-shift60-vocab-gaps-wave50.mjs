/**
 * Shift60 vocab-gaps wave50 — bakery tools + safari birds + living room extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave50.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave50');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BAKERY TOOLS:
1. rolling-pin — rolling pin
2. whisk — whisk
3. mixing-bowl — mixing bowl
4. measuring-cup — measuring cup
5. cookie-cutter — cookie cutter
6. muffin-tin — muffin tin
7. piping-bag — piping bag
8. oven-mitt — oven mitt
9. cooling-rack — cooling rack
Keys: rolling-pin,whisk,mixing-bowl,measuring-cup,cookie-cutter,muffin-tin,piping-bag,oven-mitt,cooling-rack

SHEET 2 — SAFARI BIRDS:
1. ostrich — ostrich
2. emu — emu
3. eagle — eagle
4. hawk — hawk
5. vulture — vulture
6. pelican — pelican
7. swan — swan
8. crane-bird — crane bird
9. hummingbird — hummingbird
Keys: ostrich,emu,eagle,hawk,vulture,pelican,swan,crane-bird,hummingbird

SHEET 3 — LIVING ROOM EXTRAS:
1. sofa — sofa / couch
2. armchair — armchair
3. coffee-table — coffee table
4. tv — television (BLANK screen)
5. remote — remote control (BLANK)
6. rug — rug
7. cushion — cushion / throw pillow
8. bookshelf-tall — tall bookshelf
9. plant-pot — houseplant in pot
Keys: sofa,armchair,coffee-table,tv,remote,rug,cushion,bookshelf-tall,plant-pot

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 50, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave50 (bakery-tools/birds/livingroom)',
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
  themes: ['bakery-tools', 'safari-birds', 'living-room'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
