/**
 * Shift120 wave8 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave8.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave8');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPORTS GEAR OBJECTS:
1. tennis-ball — tennis ball
2. baseball-glove — baseball glove
3. hockey-stick — hockey stick
4. golf-club — golf club
5. swim-goggles — swim goggles
6. yoga-mat-roll — rolled yoga mat
7. boxing-gloves — boxing gloves
8. cheer-pom — cheer pom-pom
9. finish-medal — blank medal on ribbon
Keys: tennis-ball,baseball-glove,hockey-stick,golf-club,swim-goggles,yoga-mat-roll,boxing-gloves,cheer-pom,finish-medal

SHEET 2 — OFFICE / WORK OBJECTS:
1. desk-lamp — desk lamp
2. filing-cabinet — filing cabinet
3. stapler-work — stapler
4. paperclip — paperclip
5. sticky-notes — sticky notes pad (blank)
6. headset-call — call center headset
7. badge-lanyard — blank badge on lanyard
8. coffee-mug — coffee mug (blank)
9. laptop — closed laptop
Keys: desk-lamp,filing-cabinet,stapler-work,paperclip,sticky-notes,headset-call,badge-lanyard,coffee-mug,laptop

SHEET 3 — NATURE / PARK OBJECTS:
1. picnic-basket — picnic basket
2. park-bench — park bench
3. fountain — water fountain
4. flowerbed — flower bed
5. bird-feeder — bird feeder
6. stepping-stones — garden stepping stones
7. garden-hose — coiled garden hose
8. compost-bin — compost bin
9. butterfly-net — butterfly net
Keys: picnic-basket,park-bench,fountain,flowerbed,bird-feeder,stepping-stones,garden-hose,compost-bin,butterfly-net

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 8 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave8 (sports/office/park)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
