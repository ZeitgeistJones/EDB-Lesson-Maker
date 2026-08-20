/**
 * Shift60 vocab-gaps wave64 — noodles bowls + sea birds + camping sleep.
 *   node scripts/manus/request-shift60-vocab-gaps-wave64.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave64');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — NOODLE BOWLS:
1. pho — pho bowl
2. udon — udon bowl
3. soba — soba noodles
4. pad-thai — pad thai plate
5. laksa — laksa bowl
6. wonton-soup — wonton soup
7. noodles-chopsticks — noodles with chopsticks
8. chili-oil — chili oil bottle (BLANK)
9. nori — nori sheet
Keys: pho,udon,soba,pad-thai,laksa,wonton-soup,noodles-chopsticks,chili-oil,nori

SHEET 2 — SEA BIRDS:
1. seagull — seagull
2. pelican-bird — pelican
3. albatross — albatross
4. puffin-bird — puffin
5. penguin-chick — penguin chick
6. tern — tern
7. cormorant — cormorant
8. frigatebird — frigatebird
9. sandpiper — sandpiper
Keys: seagull,pelican-bird,albatross,puffin-bird,penguin-chick,tern,cormorant,frigatebird,sandpiper

SHEET 3 — CAMPING SLEEP:
1. sleeping-bag — sleeping bag
2. sleeping-pad — sleeping pad
3. pillow-camp — camp pillow
4. tent — tent
5. hammock — hammock
6. bivy — bivy sack
7. headlamp — headlamp
8. earplugs — earplugs
9. eye-mask — sleep eye mask
Keys: sleeping-bag,sleeping-pad,pillow-camp,tent,hammock,bivy,headlamp,earplugs,eye-mask

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 64, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave64 (noodles/seabirds/camp-sleep)',
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
  themes: ['noodle-bowls', 'sea-birds', 'camping-sleep'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
