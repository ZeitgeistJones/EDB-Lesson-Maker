/**
 * Shift60 vocab-gaps wave100 — food + home + household (rankedGaps 158–315).
 *   node scripts/manus/request-shift60-vocab-gaps-wave100.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave100');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FOOD / PRODUCE:
1. melon — melon
2. olive — olives
3. prawn — prawn
4. celery — celery stalks
5. hotdog — hotdog
6. pepper — bell pepper
7. turnip — turnip
8. parsley — parsley bunch
9. dessert — dessert plate (BLANK, no text)
Keys: melon,olive,prawn,celery,hotdog,pepper,turnip,parsley,dessert

SHEET 2 — HOME INTERIOR:
1. patio — patio
2. porch — porch
3. stool — stool
4. stove — stove
5. closet — closet
6. balcony — balcony
7. chimney — chimney
8. cottage — cottage
9. freezer — freezer
Keys: patio,porch,stool,stove,closet,balcony,chimney,cottage,freezer

SHEET 3 — SMALL HOUSEHOLD:
1. match — matchstick
2. paper — paper sheet
3. pearl — pearl
4. photo — photo frame (BLANK)
5. pouch — pouch
6. quilt — quilt
7. spray — spray bottle (BLANK)
8. stick — stick
9. carton — carton (BLANK)
Keys: match,paper,pearl,photo,pouch,quilt,spray,stick,carton

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 100, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave100 (food/home/household)',
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
  themes: ['food-produce', 'home-interior', 'small-household'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
