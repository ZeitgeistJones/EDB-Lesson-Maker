/**
 * Shift60 vocab-gaps wave20 — shoes + bags + jewellery.
 *   node scripts/manus/request-shift60-vocab-gaps-wave20.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave20');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SHOES:
1. trainers — trainers / sneakers
2. boots — boots
3. sandals — sandals
4. slippers — slippers
5. heels — high heels
6. wellingtons — wellington boots
7. flip-flops — flip-flops
8. football-boots — football boots / cleats
9. ice-skates — ice skates
Keys: trainers,boots,sandals,slippers,heels,wellingtons,flip-flops,football-boots,ice-skates

SHEET 2 — BAGS:
1. handbag — handbag
2. backpack — backpack
3. suitcase — suitcase
4. briefcase — briefcase
5. shopping-bag — shopping bag (BLANK)
6. purse — purse / wallet
7. tote-bag — tote bag (BLANK)
8. duffel-bag — duffel bag
9. rucksack — rucksack
Keys: handbag,backpack,suitcase,briefcase,shopping-bag,purse,tote-bag,duffel-bag,rucksack

SHEET 3 — JEWELLERY / WEARABLES:
1. necklace — necklace
2. watch — wristwatch (BLANK face)
3. ring — ring
4. brooch — brooch
5. cufflinks — cufflinks
6. hairclip — hair clip
7. hairband — hairband / headband
8. sunglasses — sunglasses
9. glasses — eyeglasses
Keys: necklace,watch,ring,brooch,cufflinks,hairclip,hairband,sunglasses,glasses

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 20, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave20 (shoes/bags/jewellery)',
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
  themes: ['shoes', 'bags', 'jewellery'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
