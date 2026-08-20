/**
 * Shift60 vocab-gaps wave41 — Mexican/Asian sides + zoo extras + bathroom extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave41.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave41');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WORLD SIDES / STAPLES:
1. tortilla — tortilla
2. nachos — nachos plate
3. guacamole — guacamole bowl
4. hummus — hummus bowl
5. pita — pita bread
6. falafel — falafel balls
7. rice-bowl — rice bowl
8. naan — naan bread
9. curry — curry bowl (no text)
Keys: tortilla,nachos,guacamole,hummus,pita,falafel,rice-bowl,naan,curry

SHEET 2 — ZOO EXTRAS:
1. elephant — elephant
2. giraffe — giraffe
3. zebra — zebra
4. lion — lion
5. tiger — tiger
6. hippo — hippo
7. rhino — rhino
8. camel — camel
9. meerkat — meerkat
Keys: elephant,giraffe,zebra,lion,tiger,hippo,rhino,camel,meerkat

SHEET 3 — BATHROOM EXTRAS:
1. toothbrush — toothbrush
2. toothpaste — toothpaste tube (BLANK)
3. soap — soap bar
4. shampoo — shampoo bottle (BLANK)
5. towel — folded towel
6. hairbrush — hairbrush
7. comb — comb
8. toilet-paper — toilet paper roll
9. bath-mat — bath mat
Keys: toothbrush,toothpaste,soap,shampoo,towel,hairbrush,comb,toilet-paper,bath-mat

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 41, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave41 (sides/zoo/bathroom)',
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
  themes: ['world-sides', 'zoo-extras', 'bathroom-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
