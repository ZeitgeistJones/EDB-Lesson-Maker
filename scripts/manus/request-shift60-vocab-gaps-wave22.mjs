/**
 * Shift60 vocab-gaps wave22 — DIY workshop + plumbing + home climate.
 *   node scripts/manus/request-shift60-vocab-gaps-wave22.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave22');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DIY / WORKSHOP:
1. paint-can — paint can (BLANK label)
2. sandpaper — sandpaper sheet
3. chisel — wood chisel
4. clamp — C-clamp / bar clamp
5. light-bulb — light bulb
6. putty-knife — putty knife
7. nail-gun — nail gun
8. masking-tape — masking tape roll (BLANK)
9. utility-knife — utility / box cutter knife
Keys: paint-can,sandpaper,chisel,clamp,light-bulb,putty-knife,nail-gun,masking-tape,utility-knife

SHEET 2 — PLUMBING FIXTURES:
1. faucet — faucet / tap
2. pipe — metal pipe section
3. plunger — toilet plunger
4. shower-head — shower head
5. drain — floor / sink drain
6. valve — pipe valve / stopcock
7. wrench-pipe — pipe wrench
8. pipe-cutter — pipe cutter
9. sealant-tube — sealant / silicone tube (BLANK)
Keys: faucet,pipe,plunger,shower-head,drain,valve,wrench-pipe,pipe-cutter,sealant-tube

SHEET 3 — HOME CLIMATE / HEATING:
1. water-heater — water heater tank
2. radiator — radiator
3. thermostat — thermostat (BLANK face, no numbers)
4. space-heater — portable space heater
5. fan — standing / desk fan
6. air-conditioner — AC unit
7. humidifier — humidifier
8. dehumidifier — dehumidifier
9. furnace — furnace / boiler unit
Keys: water-heater,radiator,thermostat,space-heater,fan,air-conditioner,humidifier,dehumidifier,furnace

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 22, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave22 (DIY/plumbing/climate)',
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
  themes: ['diy-workshop', 'plumbing', 'home-climate'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
