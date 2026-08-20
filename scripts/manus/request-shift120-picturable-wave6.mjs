/**
 * Shift120 wave6 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave6.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave6');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FARM / FOOD GROW OBJECTS:
1. tractor-toy — small tractor
2. scarecrow — scarecrow
3. chicken-coop — chicken coop
4. watering-can-farm — watering can
5. corn-cob — corn cob
6. milk-can — milk can
7. hay-bale-icon — hay bale
8. fence-gate — farm fence gate
9. wheelbarrow-farm — wheelbarrow
Keys: tractor-toy,scarecrow,chicken-coop,watering-can-farm,corn-cob,milk-can,hay-bale-icon,fence-gate,wheelbarrow-farm

SHEET 2 — HOUSEHOLD CHORES OBJECTS:
1. broom — broom
2. dustpan — dustpan
3. mop — mop and bucket
4. vacuum — vacuum cleaner
5. laundry-basket — laundry basket
6. iron — clothes iron
7. clothes-hanger — clothes hanger
8. sponge-clean — cleaning sponge
9. spray-bottle — blank spray bottle
Keys: broom,dustpan,mop,vacuum,laundry-basket,iron,clothes-hanger,sponge-clean,spray-bottle

SHEET 3 — CELEBRATION / HOLIDAY OBJECTS:
1. birthday-cake — birthday cake (no text/candles numbers)
2. wrapping-paper — rolled wrapping paper (blank pattern)
3. party-hat — party hat
4. fireworks — fireworks burst (no text)
5. pumpkin-lantern — jack-o-lantern (friendly, no letters)
6. christmas-tree — small christmas tree
7. gift-ribbon — gift with ribbon
8. champagne-flute — empty flute glass (kid-safe sparkle drink cue)
9. confetti-popper — confetti popper
Keys: birthday-cake,wrapping-paper,party-hat,fireworks,pumpkin-lantern,christmas-tree,gift-ribbon,champagne-flute,confetti-popper

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 6 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave6 (farm/chores/party)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
