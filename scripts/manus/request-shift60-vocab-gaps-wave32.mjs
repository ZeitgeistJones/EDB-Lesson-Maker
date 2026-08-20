/**
 * Shift60 vocab-gaps wave32 — cleaning + sewing craft + fishing.
 *   node scripts/manus/request-shift60-vocab-gaps-wave32.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave32');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CLEANING SUPPLIES:
1. broom — broom
2. dustpan — dustpan
3. mop — mop
4. bucket — bucket
5. sponge — sponge
6. spray-bottle — spray bottle (BLANK)
7. vacuum — vacuum cleaner
8. duster — feather duster
9. rubber-gloves — rubber cleaning gloves
Keys: broom,dustpan,mop,bucket,sponge,spray-bottle,vacuum,duster,rubber-gloves

SHEET 2 — SEWING / CRAFT:
1. needle — sewing needle
2. thread-spool — thread spool
3. thimble — thimble
4. measuring-tape — measuring tape (BLANK marks ok as ticks only)
5. scissors — craft scissors
6. button — button
7. zipper — zipper
8. knitting-needles — knitting needles with yarn
9. embroidery-hoop — embroidery hoop
Keys: needle,thread-spool,thimble,measuring-tape,scissors,button,zipper,knitting-needles,embroidery-hoop

SHEET 3 — FISHING:
1. fishing-rod — fishing rod
2. fishing-hook — fishing hook
3. lure — fishing lure
4. bobber — bobber / float
5. tackle-box — tackle box
6. net — fishing net
7. fish — fish
8. bait — worm bait on hook
9. reel — fishing reel
Keys: fishing-rod,fishing-hook,lure,bobber,tackle-box,net,fish,bait,reel

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 32, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave32 (cleaning/sewing/fishing)',
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
  themes: ['cleaning', 'sewing-craft', 'fishing'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
