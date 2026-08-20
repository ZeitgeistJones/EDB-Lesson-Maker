/**
 * Shift60 vocab-gaps wave18 — farm tools + stationery extras + kitchen extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave18.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave18');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FARM TOOLS:
1. pitchfork — pitchfork
2. hoe — garden hoe
3. wheelbarrow — wheelbarrow
4. tractor — tractor
5. scarecrow — scarecrow
6. hay-bale — hay bale
7. milking-stool — milking stool
8. chicken-coop — chicken coop
9. trough — animal trough
Keys: pitchfork,hoe,wheelbarrow,tractor,scarecrow,hay-bale,milking-stool,chicken-coop,trough

SHEET 2 — STATIONERY EXTRAS:
1. stapler — stapler
2. paperclip — paperclip
3. highlighter — highlighter
4. calculator — calculator (BLANK screen, no numbers)
5. hole-punch — hole punch
6. binder — ring binder (BLANK cover)
7. sticky-notes — sticky notes pad (BLANK)
8. correction-tape — correction tape
9. protractor — protractor (no degree numbers)
Keys: stapler,paperclip,highlighter,calculator,hole-punch,binder,sticky-notes,correction-tape,protractor

SHEET 3 — KITCHEN EXTRAS:
1. colander — colander
2. peeler — vegetable peeler
3. grater — grater
4. whisk — whisk
5. rolling-pin — rolling pin
6. chopping-board — chopping board
7. oven-mitt — oven mitt
8. ladle — ladle
9. tongs — kitchen tongs
Keys: colander,peeler,grater,whisk,rolling-pin,chopping-board,oven-mitt,ladle,tongs

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 18, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave18 (farm/stationery/kitchen)',
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
  themes: ['farm-tools', 'stationery-extras', 'kitchen-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
