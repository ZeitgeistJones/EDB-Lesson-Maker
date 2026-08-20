/**
 * Shift60 vocab-gaps wave25 — holidays + medical extras + music extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave25.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave25');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — HOLIDAYS / CELEBRATIONS:
1. christmas-tree — christmas tree (no text ornaments)
2. pumpkin — halloween pumpkin
3. easter-egg — decorated easter egg (no text)
4. fireworks — fireworks burst (no text)
5. advent-candle — advent candle
6. mistletoe — mistletoe sprig
7. gift-bow — gift with bow (BLANK wrap, no text)
8. menorah — menorah (no text)
9. lantern — paper festival lantern
Keys: christmas-tree,pumpkin,easter-egg,fireworks,advent-candle,mistletoe,gift-bow,menorah,lantern

SHEET 2 — MEDICAL EXTRAS:
1. stethoscope — stethoscope
2. syringe — syringe (no needle gore)
3. thermometer — medical thermometer
4. bandage-roll — bandage roll
5. crutches — crutches
6. wheelchair — wheelchair
7. xray-film — x-ray film sheet (BLANK, no text)
8. pill-bottle — pill bottle (BLANK label)
9. cotton-swab — cotton swab / cotton bud
Keys: stethoscope,syringe,thermometer,bandage-roll,crutches,wheelchair,xray-film,pill-bottle,cotton-swab

SHEET 3 — MUSIC EXTRAS:
1. drumsticks — drumsticks
2. metronome — metronome
3. music-stand — music stand (BLANK sheet)
4. capo — guitar capo
5. pick — guitar pick
6. tuning-fork — tuning fork
7. tambourine — tambourine
8. cymbal — cymbal
9. harmonica — harmonica
Keys: drumsticks,metronome,music-stand,capo,pick,tuning-fork,tambourine,cymbal,harmonica

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 25, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave25 (holidays/medical/music)',
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
  themes: ['holidays', 'medical-extras', 'music-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
