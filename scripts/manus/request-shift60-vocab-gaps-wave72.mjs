/**
 * Shift60 vocab-gaps wave72 — gelato + farmyard birds + office supplies.
 *   node scripts/manus/request-shift60-vocab-gaps-wave72.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave72');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — GELATO / FROZEN:
1. gelato-cup — gelato cup
2. gelato-scoop — gelato scoop
3. affogato — affogato
4. granita — granita glass
5. frozen-yogurt — frozen yogurt cup
6. ice-cream-sandwich — ice cream sandwich
7. popsicle-mold — popsicle mold
8. waffle-bowl — waffle bowl
9. topping-cherry — cherry topping
Keys: gelato-cup,gelato-scoop,affogato,granita,frozen-yogurt,ice-cream-sandwich,popsicle-mold,waffle-bowl,topping-cherry

SHEET 2 — FARMYARD BIRDS MORE:
1. chick-yellow — yellow chick
2. hen-nest — hen on nest
3. rooster-crowing — rooster
4. duckling-yellow — duckling
5. goose-white — white goose
6. turkey-farm — turkey
7. peacock-display — peacock
8. guinea-fowl — guinea fowl
9. quail — quail
Keys: chick-yellow,hen-nest,rooster-crowing,duckling-yellow,goose-white,turkey-farm,peacock-display,guinea-fowl,quail

SHEET 3 — OFFICE SUPPLIES MORE:
1. binder-clip — binder clip
2. paperclip — paperclip
3. sticky-tab — sticky tab
4. index-card — index card (BLANK)
5. rubber-band — rubber band
6. push-pin — push pin
7. correction-tape — correction tape
8. label-maker — label maker (BLANK)
9. desk-organizer — desk organizer
Keys: binder-clip,paperclip,sticky-tab,index-card,rubber-band,push-pin,correction-tape,label-maker,desk-organizer

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 72, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave72 (gelato/birds/office)',
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
  themes: ['gelato', 'farmyard-birds', 'office-supplies'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
