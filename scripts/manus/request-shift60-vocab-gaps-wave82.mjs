/**
 * Shift60 vocab-gaps wave82 — breakfast + doctor kit + birthday extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave82.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave82');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BREAKFAST FOODS:
1. toast — toast slice
2. cereal-bowl — cereal bowl with flakes
3. pancake — pancake stack
4. omelette — omelette
5. yogurt — yogurt cup (BLANK)
6. croissant — croissant
7. bagel — bagel
8. jam-jar — jam jar (BLANK)
9. orange-juice — glass of orange juice
Keys: toast,cereal-bowl,pancake,omelette,yogurt,croissant,bagel,jam-jar,orange-juice

SHEET 2 — DOCTOR KIT EXTRAS:
1. otoscope — otoscope
2. blood-pressure-cuff — blood pressure cuff
3. gloves — medical gloves pair
4. face-mask — surgical face mask
5. ice-bag — ice bag
6. hot-water-bottle — hot water bottle
7. eye-patch — eye patch
8. sling — arm sling
9. medicine-cup — medicine measuring cup
Keys: otoscope,blood-pressure-cuff,gloves,face-mask,ice-bag,hot-water-bottle,eye-patch,sling,medicine-cup

SHEET 3 — BIRTHDAY EXTRAS:
1. birthday-cake — birthday cake (BLANK, no text/numbers)
2. candle — birthday candle
3. party-hat — party hat
4. balloon — balloon
5. confetti — confetti pile
6. streamer — party streamer roll
7. piñata — piñata
8. invitation — invitation card (BLANK)
9. gift-bag — gift bag (BLANK)
Keys: birthday-cake,candle,party-hat,balloon,confetti,streamer,pinata,invitation,gift-bag

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 82, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave82 RETRY of wave31 (breakfast/doctor/birthday)',
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
  themes: ['breakfast', 'doctor-kit', 'birthday-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
