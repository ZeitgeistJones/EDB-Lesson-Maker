/**
 * Shift120 wave5 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave5.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave5');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — ANIMALS / PET CARE OBJECTS:
1. dog-bowl — pet food bowl
2. cat-tree — cat climbing tree
3. birdcage — birdcage (empty/simple)
4. hamster-wheel — hamster wheel
5. fish-tank — small fish tank
6. leash-hook — wall leash hook with leash
7. pet-brush — pet grooming brush
8. treat-bag — blank treat bag
9. vet-kit — blank vet first-aid pouch
Keys: dog-bowl,cat-tree,birdcage,hamster-wheel,fish-tank,leash-hook,pet-brush,treat-bag,vet-kit

SHEET 2 — MUSIC / PERFORMANCE OBJECTS:
1. music-stand — music stand (blank sheet)
2. metronome — metronome
3. headphones — headphones
4. microphone — microphone
5. drumsticks — drumsticks
6. guitar-pick — guitar pick
7. violin-bow — violin bow
8. stage-curtain — stage curtain swag
9. spotlight — stage spotlight
Keys: music-stand,metronome,headphones,microphone,drumsticks,guitar-pick,violin-bow,stage-curtain,spotlight

SHEET 3 — BEACH / WATER OBJECTS:
1. beach-ball — beach ball
2. sand-bucket — sand bucket + shovel
3. snorkel-set — snorkel + mask
4. life-preserver — life ring
5. surfboard — surfboard
6. cooler — picnic cooler
7. beach-umbrella — beach umbrella
8. seashell-pile — seashells
9. towel-roll — rolled beach towel
Keys: beach-ball,sand-bucket,snorkel-set,life-preserver,surfboard,cooler,beach-umbrella,seashell-pile,towel-roll

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 5 };
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave5 (pets/music/beach)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
