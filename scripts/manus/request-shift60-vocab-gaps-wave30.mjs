/**
 * Shift60 vocab-gaps wave30 — restaurant + winter sports + rainforest animals.
 *   node scripts/manus/request-shift60-vocab-gaps-wave30.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave30');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — RESTAURANT SERVICE:
1. menu — closed menu (BLANK cover)
2. tray — serving tray
3. napkin — folded napkin
4. salt-shaker — salt shaker
5. pepper-shaker — pepper shaker
6. wine-glass — wine glass
7. chopsticks — chopsticks
8. toothpick — toothpick
9. tip-jar — tip jar (BLANK, no text/$ )
Keys: menu,tray,napkin,salt-shaker,pepper-shaker,wine-glass,chopsticks,toothpick,tip-jar

SHEET 2 — WINTER SPORTS GEAR:
1. ski-pole — ski pole
2. ski-goggles — ski goggles
3. helmet — sports helmet
4. sled — sled / sledge
5. ice-hockey-puck — ice hockey puck
6. curling-stone — curling stone
7. snowshoe — snowshoe
8. thermos — thermos flask
9. hand-warmer — hand warmer pack (BLANK)
Keys: ski-pole,ski-goggles,helmet,sled,ice-hockey-puck,curling-stone,snowshoe,thermos,hand-warmer

SHEET 3 — RAINFOREST ANIMALS:
1. toucan — toucan
2. sloth — sloth
3. jaguar — jaguar
4. parrot — parrot
5. monkey — monkey
6. frog — tree frog
7. snake — snake
8. chameleon — chameleon
9. butterfly — butterfly
Keys: toucan,sloth,jaguar,parrot,monkey,frog,snake,chameleon,butterfly

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 30, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave30 (restaurant/winter/rainforest)',
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
  themes: ['restaurant', 'winter-sports', 'rainforest-animals'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
