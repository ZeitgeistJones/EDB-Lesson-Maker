/**
 * Shift60 vocab-gaps wave56 — breakfast bakery + pets accessories + cycling.
 *   node scripts/manus/request-shift60-vocab-gaps-wave56.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave56');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BREAKFAST BAKERY:
1. english-muffin — english muffin
2. toast-rack — toast rack
3. jam-toast — toast with jam
4. buttered-toast — buttered toast
5. danish-pastry — danish pastry
6. pain-au-chocolat — pain au chocolat
7. scone-cream — scone with cream
8. crumpet — crumpet
9. bagel-cream-cheese — bagel with cream cheese
Keys: english-muffin,toast-rack,jam-toast,buttered-toast,danish-pastry,pain-au-chocolat,scone-cream,crumpet,bagel-cream-cheese

SHEET 2 — PET ACCESSORIES:
1. fish-tank — fish tank
2. hamster-wheel — hamster wheel
3. birdcage — birdcage
4. cat-bed — cat bed
5. dog-bed — dog bed
6. water-fountain-pet — pet water fountain
7. chew-toy — dog chew toy
8. laser-pointer — cat laser pointer
9. litter-scoop — litter scoop
Keys: fish-tank,hamster-wheel,birdcage,cat-bed,dog-bed,water-fountain-pet,chew-toy,laser-pointer,litter-scoop

SHEET 3 — CYCLING:
1. bicycle — bicycle
2. bike-helmet — bike helmet
3. bike-lock — bike lock
4. bike-pump — bike pump
5. water-bottle-cage — bike water bottle
6. bike-bell — bike bell
7. bike-light — bike light
8. pannier — pannier bag
9. bike-chain — bike chain
Keys: bicycle,bike-helmet,bike-lock,bike-pump,water-bottle-cage,bike-bell,bike-light,pannier,bike-chain

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 56, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave56 (bakery/pets/cycling)',
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
  themes: ['breakfast-bakery', 'pet-accessories', 'cycling'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
