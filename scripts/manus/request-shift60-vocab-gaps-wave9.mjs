/**
 * Shift60 vocab-gaps wave9 — winter + hospital + party.
 *   node scripts/manus/request-shift60-vocab-gaps-wave9.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave9');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — WINTER OBJECTS:
1. snowman — snowman
2. scarf — scarf
3. mittens — mittens
4. boots — winter boots
5. sled — sled / sledge
6. skis — skis
7. ice-skate — ice skate
8. hot-chocolate — mug of hot chocolate (BLANK mug)
9. fireplace — fireplace
Keys: snowman,scarf,mittens,boots,sled,skis,ice-skate,hot-chocolate,fireplace

SHEET 2 — HOSPITAL OBJECTS:
1. bandage — bandage
2. syringe — syringe (friendly icon)
3. pills — pills / medicine (BLANK)
4. wheelchair — wheelchair
5. crutches — crutches
6. xray — x-ray film (blank silhouette, no text)
7. thermometer-med — medical thermometer
8. first-aid-kit — first aid kit (cross OK, no letters)
9. hospital-bed — hospital bed
Keys: bandage,syringe,pills,wheelchair,crutches,xray,thermometer-med,first-aid-kit,hospital-bed

SHEET 3 — PARTY / CELEBRATION:
1. cake — cake (no candles/numbers/text)
2. candle-party — birthday candle
3. gift — gift box
4. balloon-party — balloon
5. party-hat — party hat
6. streamer — streamer
7. invitation — blank invitation card (NO text)
8. piñata — pinata
9. confetti — confetti burst
Keys: cake,candle-party,gift,balloon-party,party-hat,streamer,invitation,pinata,confetti

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 9, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave9 (winter/hospital/party)',
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
  themes: ['winter', 'hospital', 'party'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
