/**
 * Shift60 vocab-gaps wave37 — pasta/Italian + pets extras + office extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave37.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave37');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PASTA / ITALIAN FOOD:
1. spaghetti — spaghetti nest
2. lasagna — lasagna slice
3. ravioli — ravioli
4. pizza-slice — pizza slice
5. garlic-bread — garlic bread
6. pesto-jar — pesto jar (BLANK)
7. olive-oil — olive oil bottle (BLANK)
8. parmesan — parmesan wedge
9. meatball — meatball
Keys: spaghetti,lasagna,ravioli,pizza-slice,garlic-bread,pesto-jar,olive-oil,parmesan,meatball

SHEET 2 — PETS EXTRAS:
1. goldfish — goldfish
2. hamster — hamster
3. guinea-pig — guinea pig
4. rabbit — rabbit
5. parrot-pet — pet parrot
6. turtle-pet — pet turtle
7. dog-bowl — dog food bowl
8. cat-tree — cat tree / scratching post
9. leash — dog leash
Keys: goldfish,hamster,guinea-pig,rabbit,parrot-pet,turtle-pet,dog-bowl,cat-tree,leash

SHEET 3 — OFFICE EXTRAS:
1. desk-lamp — desk lamp
2. monitor — computer monitor (BLANK screen)
3. keyboard — keyboard
4. mouse — computer mouse
5. stapler-remover — staple remover
6. paper-tray — paper tray
7. shredder — paper shredder
8. whiteboard — whiteboard (BLANK)
9. filing-cabinet — filing cabinet
Keys: desk-lamp,monitor,keyboard,mouse,stapler-remover,paper-tray,shredder,whiteboard,filing-cabinet

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 37, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave37 (pasta/pets/office)',
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
  themes: ['pasta-italian', 'pets-extras', 'office-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
