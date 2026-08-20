/**
 * Shift60 vocab-gaps wave74 — pancakes toppings + pets rodents + soccer kit.
 *   node scripts/manus/request-shift60-vocab-gaps-wave74.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave74');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PANCAKE / WAFFLE TOPPINGS:
1. syrup-pour — syrup pour
2. butter-pat — butter pat
3. berry-compote — berry compote
4. whipped-cream-top — whipped cream
5. chocolate-chips — chocolate chips
6. banana-pancake — banana slices
7. powdered-sugar — powdered sugar dusting
8. nutella-jar — chocolate spread jar (BLANK)
9. crepe — crepe folded
Keys: syrup-pour,butter-pat,berry-compote,whipped-cream-top,chocolate-chips,banana-pancake,powdered-sugar,nutella-jar,crepe

SHEET 2 — PET RODENTS:
1. hamster-cute — hamster
2. guinea-pig-pet — guinea pig
3. gerbil — gerbil
4. mouse-pet — pet mouse
5. rat-pet — pet rat
6. chinchilla — chinchilla
7. rabbit-lop — lop rabbit
8. ferret — ferret
9. hamster-cage — hamster cage
Keys: hamster-cute,guinea-pig-pet,gerbil,mouse-pet,rat-pet,chinchilla,rabbit-lop,ferret,hamster-cage

SHEET 3 — SOCCER / FOOTBALL KIT:
1. soccer-ball — soccer ball
2. soccer-cleats — soccer cleats
3. shin-guards — shin guards
4. goalkeeper-gloves — goalkeeper gloves
5. soccer-jersey — soccer jersey (BLANK, no numbers)
6. corner-flag — corner flag (BLANK)
7. captain-armband — captain armband (BLANK)
8. water-bottle-sport — sports water bottle
9. cone-training — training cone
Keys: soccer-ball,soccer-cleats,shin-guards,goalkeeper-gloves,soccer-jersey,corner-flag,captain-armband,water-bottle-sport,cone-training

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 74, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave74 (pancakes/rodents/soccer)',
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
  themes: ['pancake-toppings', 'pet-rodents', 'soccer-kit'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
