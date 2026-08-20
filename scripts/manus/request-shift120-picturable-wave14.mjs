/**
 * Shift120 wave14 — picturable still-lifes (skip abstracts). Keep loop warm.
 *   node scripts/manus/request-shift120-picturable-wave14.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave14');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — ZOO / WILDLIFE OBJECTS (still-life props, not full scenes):
1. zoo-map — blank zoo map pamphlet
2. binoculars-zoo — binoculars
3. safari-hat — safari hat
4. water-trough — animal water trough
5. hay-net — hay net
6. animal-enclosure-gate — enclosure gate
7. feeding-bucket — feeding bucket
8. zoo-ticket — blank ticket stub
9. souvenir-plush — small animal plush
Keys: zoo-map,binoculars-zoo,safari-hat,water-trough,hay-net,animal-enclosure-gate,feeding-bucket,zoo-ticket,souvenir-plush

SHEET 2 — POST / MAIL OBJECTS:
1. envelope — envelope
2. stamp-mail — blank postage stamp
3. parcel — parcel box
4. mailbox-flag — mailbox with flag
5. packing-tape — packing tape roll
6. address-label — blank address label
7. mail-bag — mail bag
8. postage-scale — postage scale (blank)
9. bubble-wrap — bubble wrap roll
Keys: envelope,stamp-mail,parcel,mailbox-flag,packing-tape,address-label,mail-bag,postage-scale,bubble-wrap

SHEET 3 — BATH / WASH OBJECTS:
1. bath-towel-roll — rolled bath towel
2. shower-puff — shower puff
3. rubber-duck-bath — rubber duck
4. bath-mat-icon — bath mat
5. soap-dish — soap dish
6. toothbrush-cup — toothbrush cup
7. shampoo-bottle-blank — blank shampoo bottle
8. hairbrush-bath — hairbrush
9. mirror-hand — hand mirror
Keys: bath-towel-roll,shower-puff,rubber-duck-bath,bath-mat-icon,soap-dish,toothbrush-cup,shampoo-bottle-blank,hairbrush-bath,mirror-hand

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 14 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave14 (zoo/mail/bath)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
