/**
 * Shift60 vocab-gaps wave86 — nature-weather + animals-critters + body-animal-parts.
 *   node scripts/manus/request-shift60-vocab-gaps-wave86.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave86');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — NATURE / WEATHER:
1. dew — dew drop
2. fog — fog bank
3. sky — sky with cloud
4. hail — hailstones
5. frost — frost crystals
6. flame — flame
7. soil — soil pile
8. weed — weed plant
9. stem — plant stem
Keys: dew,fog,sky,hail,frost,flame,soil,weed,stem

SHEET 2 — ANIMALS / CRITTERS:
1. ox — ox
2. yak — yak
3. rat — rat
4. mole — mole
5. gull — seagull
6. fly — fly insect
7. cobra — cobra
8. web — spider web
9. paw — animal paw
Keys: ox,yak,rat,mole,gull,fly,cobra,web,paw

SHEET 3 — BODY / ANIMAL PARTS:
1. jaw — jaw
2. fang — fang
3. tusk — tusk
4. horn — animal horn
5. wing — bird wing
6. beak — bird beak
7. heel — heel
8. knee — knee
9. cheek — cheek
Keys: jaw,fang,tusk,horn,wing,beak,heel,knee,cheek

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 86, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave86 (nature-weather/animals-critters/body-animal-parts)',
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
  themes: ["nature-weather","animals-critters","body-animal-parts"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
