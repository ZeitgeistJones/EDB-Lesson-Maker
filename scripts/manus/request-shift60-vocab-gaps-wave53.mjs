/**
 * Shift60 vocab-gaps wave53 — soup stew + marine mammals + craft room.
 *   node scripts/manus/request-shift60-vocab-gaps-wave53.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave53');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SOUP / STEW:
1. tomato-soup — tomato soup bowl
2. chicken-soup — chicken soup bowl
3. stew — stew pot
4. chili-bowl — chili bowl
5. broth — broth pot
6. dumpling-soup — dumpling soup
7. bread-roll — bread roll
8. soup-spoon — soup spoon
9. thermos-soup — soup thermos
Keys: tomato-soup,chicken-soup,stew,chili-bowl,broth,dumpling-soup,bread-roll,soup-spoon,thermos-soup

SHEET 2 — MARINE MAMMALS:
1. dolphin — dolphin
2. whale — whale
3. sealion — sea lion
4. manatee — manatee
5. otter — otter
6. porpoise — porpoise
7. beluga — beluga whale
8. dugong — dugong
9. sea-otter — sea otter
Keys: dolphin,whale,sealion,manatee,otter,porpoise,beluga,dugong,sea-otter

SHEET 3 — CRAFT ROOM:
1. beads — beads pile
2. yarn — yarn ball
3. loom — small loom
4. stamp-pad — stamp pad (BLANK)
5. stencil — stencil sheet (BLANK shape)
6. glitter-glue — glitter glue (BLANK)
7. craft-scissors — craft scissors
8. foam-sheet — craft foam sheet
9. pipe-cleaner — pipe cleaners
Keys: beads,yarn,loom,stamp-pad,stencil,glitter-glue,craft-scissors,foam-sheet,pipe-cleaner

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 53, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave53 (soup/marine/craft)',
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
  themes: ['soup-stew', 'marine-mammals', 'craft-room'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
