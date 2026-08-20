/**
 * Shift60 vocab-gaps wave83 — breakfast extras + vet clinic + photography.
 *   node scripts/manus/request-shift60-vocab-gaps-wave83.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave83');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BREAKFAST EXTRAS:
1. porridge — porridge bowl
2. granola — granola pile
3. honey — honey jar (BLANK)
4. maple-syrup — maple syrup bottle (BLANK)
5. scrambled-eggs — scrambled eggs plate
6. bacon — bacon strips
7. sausage — breakfast sausage
8. hash-brown — hash brown
9. fruit-salad — fruit salad bowl
Keys: porridge,granola,honey,maple-syrup,scrambled-eggs,bacon,sausage,hash-brown,fruit-salad

SHEET 2 — VET CLINIC:
1. pet-carrier — pet carrier
2. dog-collar — dog collar
3. cat-litter — litter box
4. flea-comb — flea comb
5. pet-brush — pet brush
6. cone-collar — elizabethan collar / cone
7. syringe-vet — vet syringe (no gore)
8. scale-pet — pet scale
9. treat — dog treat biscuit
Keys: pet-carrier,dog-collar,cat-litter,flea-comb,pet-brush,cone-collar,syringe-vet,scale-pet,treat

SHEET 3 — PHOTOGRAPHY:
1. camera — camera
2. lens — camera lens
3. tripod — tripod
4. flash — camera flash
5. memory-card — memory card (BLANK)
6. photo-frame — photo frame (BLANK)
7. polaroid — instant photo (BLANK)
8. selfie-stick — selfie stick
9. light-reflector — light reflector disc
Keys: camera,lens,tripod,flash,memory-card,photo-frame,polaroid,selfie-stick,light-reflector

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 83, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave83 RETRY of wave46 (breakfast/vet/photo)',
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
  themes: ['breakfast-extras', 'vet-clinic', 'photography'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
