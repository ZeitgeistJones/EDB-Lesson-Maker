/**
 * Shift60 vocab-gaps wave121 — transport + infra + home objects (rankedGaps 316–end).
 *   node scripts/manus/request-shift60-vocab-gaps-wave121.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave121');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TRANSPORT / MACHINES:
1. carriage — horse carriage
2. tricycle — tricycle
3. locomotive — steam locomotive
4. hovercraft — hovercraft
5. torpedo — torpedo
6. propeller — airplane propeller
7. parachute — parachute
8. carousel — carousel / merry-go-round
9. dashboard — car dashboard (BLANK gauges, no readable numbers)
Keys: carriage,tricycle,locomotive,hovercraft,torpedo,propeller,parachute,carousel,dashboard

SHEET 2 — INFRA / GEAR:
1. overpass — highway overpass
2. underpass — underpass tunnel
3. traffic-light — traffic light
4. generator — portable generator
5. cylinder — metal cylinder tank
6. cauldron — cauldron
7. avalanche — snow avalanche slope icon
8. limestone — limestone rock
9. raindrop — raindrop
Keys: overpass,underpass,traffic-light,generator,cylinder,cauldron,avalanche,limestone,raindrop

SHEET 3 — HOME / PERSONAL OBJECTS:
1. mattress — mattress
2. chandelier — chandelier
3. television — television set
4. painting — framed painting (BLANK art)
5. sticker — blank sticker
6. joystick — game joystick
7. knitting — knitting needles with yarn
8. hourglass — hourglass
9. bathroom-scale — bathroom scale (no readable numbers)
Keys: mattress,chandelier,television,painting,sticker,joystick,knitting,hourglass,bathroom-scale

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 121, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave121 (transport/infra/home)',
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
  themes: ['transport-machines', 'infra-gear', 'home-personal'],
  gap_slice: '316-end',
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
