/**
 * Shift60 vocab-gaps wave17 — sports gear extras + café + zoo.
 *   node scripts/manus/request-shift60-vocab-gaps-wave17.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave17');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPORTS GEAR EXTRAS:
1. whistle — whistle
2. stopwatch — stopwatch (BLANK face, no numbers)
3. skipping-rope — skipping rope
4. dumbbell — dumbbell
5. yoga-mat — rolled yoga mat
6. shin-pad — shin pad
7. mouthguard — mouthguard
8. swimming-goggles — swimming goggles
9. cricket-pads — cricket pads
Keys: whistle,stopwatch,skipping-rope,dumbbell,yoga-mat,shin-pad,mouthguard,swimming-goggles,cricket-pads

SHEET 2 — CAFÉ:
1. coffee-cup — coffee cup
2. saucer — saucer
3. teapot — teapot
4. muffin-tin — muffin tin
5. sugar-bowl — sugar bowl
6. milk-jug — milk jug / creamer
7. straw — drinking straw
8. takeaway-cup — takeaway cup (BLANK sleeve, no logos)
9. pastry — pastry / danish
Keys: coffee-cup,saucer,teapot,muffin-tin,sugar-bowl,milk-jug,straw,takeaway-cup,pastry

SHEET 3 — ZOO:
1. zebra — zebra
2. giraffe — giraffe
3. penguin — penguin
4. kangaroo — kangaroo
5. panda — panda
6. koala — koala
7. peacock — peacock
8. camel — camel
9. hippo — hippo
Keys: zebra,giraffe,penguin,kangaroo,panda,koala,peacock,camel,hippo

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 17, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave17 (sports/café/zoo)',
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
  themes: ['sports-gear-extras', 'cafe', 'zoo'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
