/**
 * Shift60 vocab-gaps wave78 — kebab/wetlands/makeup.
 *   node scripts/manus/request-shift60-vocab-gaps-wave78.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave78');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — KEBAB / GRILL:
1. shish-kebab — shish kebab
2. pita-wrap — pita wrap
3. hummus-plate — hummus plate
4. tzatziki — tzatziki
5. grilled-halloumi — grilled halloumi
6. flatbread — flatbread
7. chili-sauce — chili sauce (BLANK)
8. onion-rings — onion rings
9. skewer-stick — empty skewer
Keys: shish-kebab,pita-wrap,hummus-plate,tzatziki,grilled-halloumi,flatbread,chili-sauce,onion-rings,skewer-stick

SHEET 2 — WETLANDS:
1. heron — heron
2. egret — egret
3. flamingo-wet — flamingo
4. alligator-wet — alligator
5. beaver-dam — beaver
6. frog-wet — frog
7. dragonfly-wet — dragonfly
8. reed — reed
9. lily-pad — lily pad
Keys: heron,egret,flamingo-wet,alligator-wet,beaver-dam,frog-wet,dragonfly-wet,reed,lily-pad

SHEET 3 — MAKEUP KIT:
1. lipstick — lipstick
2. mascara — mascara
3. blush — blush compact (BLANK)
4. powder-puff — powder puff
5. makeup-brush — makeup brush
6. nail-polish — nail polish (BLANK)
7. mirror-compact — compact mirror
8. eyeliner — eyeliner
9. makeup-bag — makeup bag
Keys: lipstick,mascara,blush,powder-puff,makeup-brush,nail-polish,mirror-compact,eyeliner,makeup-bag

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 78, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave78 (kebab/wetlands/makeup)',
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
  themes: ["kebab-grill","wetlands","makeup-kit"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
