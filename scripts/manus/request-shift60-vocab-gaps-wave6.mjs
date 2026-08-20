/**
 * Shift60 vocab-gaps wave6 — sea life + camping + music.
 *   node scripts/manus/request-shift60-vocab-gaps-wave6.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave6');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SEA LIFE:
1. fish — fish
2. shark — shark
3. whale — whale
4. dolphin — dolphin
5. octopus — octopus
6. crab — crab
7. starfish — starfish
8. seahorse — seahorse
9. turtle — sea turtle
Keys: fish,shark,whale,dolphin,octopus,crab,starfish,seahorse,turtle

SHEET 2 — CAMPING:
1. tent — tent
2. sleeping-bag — sleeping bag
3. flashlight — flashlight
4. campfire — campfire
5. backpack-camp — hiking backpack
6. compass — compass (no letters)
7. map — blank map folds (no readable text)
8. canteen — water canteen
9. rope — coiled rope
Keys: tent,sleeping-bag,flashlight,campfire,backpack-camp,compass,map,canteen,rope

SHEET 3 — MUSIC:
1. guitar — guitar
2. piano — piano / keyboard
3. drum — drum
4. violin — violin
5. flute — flute
6. trumpet — trumpet
7. xylophone — xylophone (no letters)
8. headphones — headphones
9. music-note — music note symbol (glyph OK, no text)
Keys: guitar,piano,drum,violin,flute,trumpet,xylophone,headphones,music-note

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 6, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave6 (sea/camping/music)',
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
  themes: ['sea-life', 'camping', 'music'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
