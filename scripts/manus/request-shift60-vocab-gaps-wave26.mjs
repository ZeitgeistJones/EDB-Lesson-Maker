/**
 * Shift60 vocab-gaps wave26 — vehicles extras + house rooms + nature.
 *   node scripts/manus/request-shift60-vocab-gaps-wave26.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave26');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — VEHICLES EXTRAS:
1. scooter — kick scooter
2. motorcycle — motorcycle
3. tractor — tractor
4. bulldozer — bulldozer
5. ambulance — ambulance (BLANK, no text/cross letters)
6. fire-engine — fire engine (BLANK)
7. ferry — ferry boat
8. hot-air-balloon — hot air balloon (BLANK)
9. cable-car — cable car gondola
Keys: scooter,motorcycle,tractor,bulldozer,ambulance,fire-engine,ferry,hot-air-balloon,cable-car

SHEET 2 — HOUSE ROOMS EXTRAS:
1. wardrobe — wardrobe / closet
2. bookshelf — bookshelf
3. bathtub — bathtub
4. shower-head — shower head
5. kitchen-sink — kitchen sink
6. fireplace — fireplace
7. ceiling-fan — ceiling fan
8. radiator — radiator
9. mirror — wall mirror
Keys: wardrobe,bookshelf,bathtub,shower-head,kitchen-sink,fireplace,ceiling-fan,radiator,mirror

SHEET 3 — NATURE:
1. waterfall — waterfall
2. volcano — volcano
3. cactus — cactus
4. pinecone — pinecone
5. mushroom — mushroom
6. nest — bird nest with eggs
7. honeycomb — honeycomb piece
8. acorn — acorn
9. fern — fern frond
Keys: waterfall,volcano,cactus,pinecone,mushroom,nest,honeycomb,acorn,fern

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 26, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave26 (vehicles/rooms/nature)',
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
  themes: ['vehicles-extras', 'house-rooms', 'nature'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
