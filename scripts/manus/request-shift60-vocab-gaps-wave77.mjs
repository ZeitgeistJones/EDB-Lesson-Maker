/**
 * Shift60 vocab-gaps wave77 — soup/zoo-babies/bike.
 *   node scripts/manus/request-shift60-vocab-gaps-wave77.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave77');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SOUP EXTRAS:
1. clam-chowder — clam chowder
2. minestrone — minestrone
3. french-onion — french onion soup
4. gazpacho — gazpacho
5. bisque — bisque
6. wonton-broth — wonton broth
7. soup-crouton — croutons
8. soup-cracker — soup crackers
9. breadstick — breadstick
Keys: clam-chowder,minestrone,french-onion,gazpacho,bisque,wonton-broth,soup-crouton,soup-cracker,breadstick

SHEET 2 — ZOO BABIES:
1. lion-cub — lion cub
2. tiger-cub — tiger cub
3. baby-elephant — baby elephant
4. baby-giraffe — baby giraffe
5. baby-panda — baby panda
6. baby-monkey — baby monkey
7. foal — foal
8. calf — calf
9. puppy-zoo — puppy
Keys: lion-cub,tiger-cub,baby-elephant,baby-giraffe,baby-panda,baby-monkey,foal,calf,puppy-zoo

SHEET 3 — BIKE REPAIR:
1. allen-key — allen key
2. bike-wrench — bike wrench
3. tire-lever — tire lever
4. patch-kit — patch kit
5. chain-lube — chain lube bottle (BLANK)
6. bike-stand — bike stand
7. spoke — bike spoke
8. bike-pedal — bike pedal
9. bike-saddle — bike saddle
Keys: allen-key,bike-wrench,tire-lever,patch-kit,chain-lube,bike-stand,spoke,bike-pedal,bike-saddle

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 77, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave77 (soup/zoo-babies/bike)',
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
  themes: ["soup-extras","zoo-babies","bike-repair"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
