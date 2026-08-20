/**
 * Shift120 wave2 — more picturable object gaps (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave2.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave2');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip pure abstracts (habit, afford, budget as words).

HARD STYLE: #FFFFFF field; even 3×3; flat vector; ZERO text/logos; quality: default. Deliver 3 PNGs.

SHEET 1 — FEELINGS AS OBJECT CUES (not face portraits):
1. calm — zen garden tray / smooth stones
2. cheerful — sunny flower bouquet
3. disappointed — deflated balloon
4. proud — blank trophy + ribbon (no text)
5. worried — chewed pencil stub
6. excited — party popper (no letters)
7. bored — blank clock face
8. surprised — open gift box
9. shy — peeking behind curtain
Keys: calm,cheerful,disappointed,proud-cue,worried-cue,excited,bored,surprised,shy

SHEET 2 — OUTDOORS / TRAVEL OBJECTS:
1. compass — orienteering compass
2. binoculars — binoculars
3. backpack-hike — hiking backpack
4. trail-map — blank folded map
5. canteen — metal canteen
6. lantern-camp — camping lantern
7. passport — blank passport booklet (no text/numbers)
8. suitcase — suitcase
9. ticket-stub — blank ticket stub (no text)
Keys: compass,binoculars,backpack-hike,trail-map,canteen,lantern-camp,passport,suitcase,ticket-stub

SHEET 3 — COMMUNITY / JOBS OBJECTS:
1. postbox — mailbox / post box
2. stamp — blank postage stamp
3. fire-hydrant — fire hydrant
4. traffic-cone — traffic cone
5. stethoscope — stethoscope
6. clipboard-job — blank clipboard
7. hard-hat — construction hard hat
8. apron-baker — baker apron
9. library-card — blank library card (no text)
Keys: postbox,stamp,fire-hydrant,traffic-cone,stethoscope,clipboard-job,hard-hat,apron-baker,library-card

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default' };
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave2 (feel/outdoors/jobs)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
