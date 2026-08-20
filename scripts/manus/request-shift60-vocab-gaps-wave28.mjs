/**
 * Shift60 vocab-gaps wave28 — sports kit + school supplies + YLE leftovers.
 *   node scripts/manus/request-shift60-vocab-gaps-wave28.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave28');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPORTS EQUIPMENT MORE:
1. badminton-racket — badminton racket
2. shuttlecock — shuttlecock / birdie
3. cricket-bat — cricket bat
4. cricket-ball — cricket ball
5. rugby-ball — rugby ball
6. hockey-stick — hockey stick
7. ice-skate — ice skate
8. ski — ski
9. snowboard — snowboard
Keys: badminton-racket,shuttlecock,cricket-bat,cricket-ball,rugby-ball,hockey-stick,ice-skate,ski,snowboard

SHEET 2 — SCHOOL SUPPLIES EXTRAS:
1. protractor — protractor
2. compass — drawing compass
3. hole-punch — hole punch
4. stapler — stapler
5. sticky-notes — sticky notes pad (BLANK)
6. binder — ring binder
7. whiteboard-marker — whiteboard marker
8. chalk — chalk stick
9. lunchbox — lunchbox
Keys: protractor,compass,hole-punch,stapler,sticky-notes,binder,whiteboard-marker,chalk,lunchbox

SHEET 3 — YLE LEFTOVER NOUNS:
1. envelope — envelope (BLANK)
2. stamp — postage stamp (BLANK art, no text)
3. postcard — postcard (BLANK)
4. suitcase — suitcase
5. passport — passport booklet (BLANK cover)
6. map — folded map (BLANK, no readable labels)
7. umbrella — umbrella
8. torch — flashlight / torch
9. key — house key
Keys: envelope,stamp,postcard,suitcase,passport,map,umbrella,torch,key

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 28, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave28 (sports/school/yle)',
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
  themes: ['sports-equipment-more', 'school-supplies-extras', 'yle-leftovers-2'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
