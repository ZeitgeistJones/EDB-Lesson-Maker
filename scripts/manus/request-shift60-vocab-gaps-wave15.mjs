/**
 * Shift60 vocab-gaps wave15 — hobbies + instruments + clothes accessories.
 *   node scripts/manus/request-shift60-vocab-gaps-wave15.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave15');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOBBIES / CRAFTS:
1. paintbrush — paintbrush
2. palette — artist palette (no text)
3. camera — camera
4. knitting-needles — knitting needles + yarn ball
5. sewing-machine — sewing machine
6. chessboard — chessboard (no readable letters)
7. jigsaw-puzzle — jigsaw puzzle piece / small puzzle
8. stamp-album — stamp album (BLANK cover)
9. telescope — telescope
Keys: paintbrush,palette,camera,knitting-needles,sewing-machine,chessboard,jigsaw-puzzle,stamp-album,telescope

SHEET 2 — INSTRUMENTS (extras):
1. violin — violin
2. flute — flute
3. trumpet — trumpet
4. saxophone — saxophone
5. clarinet — clarinet
6. harmonica — harmonica
7. accordion — accordion
8. xylophone — xylophone (no note letters)
9. tambourine — tambourine
Keys: violin,flute,trumpet,saxophone,clarinet,harmonica,accordion,xylophone,tambourine

SHEET 3 — CLOTHES ACCESSORIES:
1. belt — belt
2. scarf — scarf
3. gloves — gloves
4. mittens — mittens
5. tie — necktie
6. bow-tie — bow tie
7. suspenders — suspenders
8. earring — earring
9. bracelet — bracelet
Keys: belt,scarf,gloves,mittens,tie,bow-tie,suspenders,earring,bracelet

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 15, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave15 (hobbies/instruments/accessories)',
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
  themes: ['hobbies', 'instruments', 'clothes-accessories'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
