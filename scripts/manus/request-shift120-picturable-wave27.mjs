/**
 * Shift120 wave27 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave27.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave27');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — FARM ANIMALS EXTRA:
1. chick — baby chick
2. duckling — duckling
3. goat-kid — young goat
4. lamb — lamb
5. calf — calf
6. foal — foal
7. rooster — rooster
8. turkey-farm — turkey
9. goose — goose
Keys: chick,duckling,goat-kid,lamb,calf,foal,rooster,turkey-farm,goose

SHEET 2 — BEACH / WATER OBJECTS:
1. beach-ball — beach ball
2. snorkel-mask — snorkel mask
3. flippers — swim flippers
4. life-ring — life ring
5. sandcastle — sandcastle
6. seashell — seashell
7. starfish — starfish
8. surfboard — surfboard
9. beach-umbrella — beach umbrella
Keys: beach-ball,snorkel-mask,flippers,life-ring,sandcastle,seashell,starfish,surfboard,beach-umbrella

SHEET 3 — OFFICE / DESK OBJECTS:
1. desk-lamp — desk lamp
2. computer-monitor — computer monitor (blank screen)
3. keyboard — keyboard (no letters)
4. mouse-computer — computer mouse
5. printer — printer
6. desk-chair — office chair
7. filing-cabinet — filing cabinet
8. whiteboard — whiteboard (blank)
9. sticky-notes — sticky notes pad
Keys: desk-lamp,computer-monitor,keyboard,mouse-computer,printer,desk-chair,filing-cabinet,whiteboard,sticky-notes

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 27 };
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
  title: 'ESL white vocab 3×3: Shift120 picturable wave27 (farm/beach/office)',
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
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
