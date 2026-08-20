/**
 * Shift60 vocab-gaps wave23 — table condiments + gadgets + furniture extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave23.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave23');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TABLE / CONDIMENTS:
1. placemat — placemat
2. ketchup — ketchup bottle (BLANK label)
3. mustard — mustard bottle (BLANK label)
4. butter-dish — butter dish
5. syrup-bottle — syrup bottle (BLANK)
6. gravy-boat — gravy boat
7. coaster — drink coaster
8. toothpick-holder — toothpick holder
9. napkin-ring — napkin ring
Keys: placemat,ketchup,mustard,butter-dish,syrup-bottle,gravy-boat,coaster,toothpick-holder,napkin-ring

SHEET 2 — GADGETS / ELECTRONICS EXTRAS:
1. game-console — game console (BLANK)
2. controller — game controller
3. power-bank — power bank / portable charger
4. earbuds — wireless earbuds case + buds
5. smartwatch — smartwatch (BLANK face)
6. docking-station — laptop docking station
7. sd-card — SD memory card (BLANK)
8. cable-adapter — USB / cable adapter
9. webcam — webcam
Keys: game-console,controller,power-bank,earbuds,smartwatch,docking-station,sd-card,cable-adapter,webcam

SHEET 3 — FURNITURE EXTRAS:
1. curtain — curtain / drapes
2. nightstand — nightstand / bedside table
3. dresser — dresser / chest of drawers
4. ottoman — ottoman / footstool
5. floor-lamp — floor lamp
6. coat-rack — coat rack
7. doormat — doormat (BLANK, no text)
8. shoe-rack — shoe rack
9. folding-chair — folding chair
Keys: curtain,nightstand,dresser,ottoman,floor-lamp,coat-rack,doormat,shoe-rack,folding-chair

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 23, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave23 (table/gadgets/furniture)',
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
  themes: ['table-condiments', 'gadgets', 'furniture-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
