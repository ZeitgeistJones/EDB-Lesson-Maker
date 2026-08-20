/**
 * Shift60 vocab-gaps wave11 — office + beach + dinosaurs.
 *   node scripts/manus/request-shift60-vocab-gaps-wave11.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave11');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — OFFICE:
1. computer — computer / laptop
2. keyboard — keyboard
3. mouse — computer mouse
4. printer — printer
5. phone — office phone
6. pen — pen
7. stapler-office — stapler
8. binder — binder
9. desk-lamp — desk lamp
Keys: computer,keyboard,mouse,printer,phone,pen,stapler-office,binder,desk-lamp

SHEET 2 — BEACH:
1. sandcastle — sandcastle
2. bucket — beach bucket
3. spade — beach spade
4. seashell — seashell
5. beach-ball — beach ball
6. sunscreen — sunscreen bottle (BLANK)
7. towel-beach — beach towel
8. sunglasses — sunglasses
9. snorkel — snorkel mask
Keys: sandcastle,bucket,spade,seashell,beach-ball,sunscreen,towel-beach,sunglasses,snorkel

SHEET 3 — DINOSAURS:
1. t-rex — T-rex
2. triceratops — triceratops
3. stegosaurus — stegosaurus
4. brachiosaurus — brachiosaurus / long-neck
5. pterodactyl — pterodactyl
6. dinosaur-egg — dinosaur egg
7. fossil — fossil bone
8. volcano — volcano
9. dinosaur-footprint — dinosaur footprint
Keys: t-rex,triceratops,stegosaurus,brachiosaurus,pterodactyl,dinosaur-egg,fossil,volcano,dinosaur-footprint

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 11, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave11 (office/beach/dinos)',
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
  themes: ['office', 'beach', 'dinosaurs'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
