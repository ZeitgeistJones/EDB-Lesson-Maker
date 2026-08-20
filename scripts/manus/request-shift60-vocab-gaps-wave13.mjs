/**
 * Shift60 vocab-gaps wave13 — castle + hotel + aquarium extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave13.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave13');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — CASTLE / KNIGHTS:
1. castle — castle
2. crown — crown
3. sword — sword
4. shield — shield
5. knight-helmet — knight helmet
6. dragon — dragon
7. flag — blank flag (no text/symbols)
8. tower — tower
9. throne — throne
Keys: castle,crown,sword,shield,knight-helmet,dragon,flag,tower,throne

SHEET 2 — HOTEL:
1. suitcase — suitcase
2. key-card — key card (BLANK)
3. bed-hotel — hotel bed
4. reception-bell — reception bell
5. luggage-cart — luggage cart
6. pillow — pillow
7. room-key — room key
8. elevator — elevator doors
9. swimming-pool — swimming pool
Keys: suitcase,key-card,bed-hotel,reception-bell,luggage-cart,pillow,room-key,elevator,swimming-pool

SHEET 3 — AQUARIUM EXTRAS:
1. jellyfish — jellyfish
2. coral — coral
3. clam — clam / shell
4. lobster — lobster
5. eel — eel
6. aquarium-tank — aquarium tank
7. seaweed — seaweed
8. scuba-tank — scuba tank
9. anchor — anchor
Keys: jellyfish,coral,clam,lobster,eel,aquarium-tank,seaweed,scuba-tank,anchor

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 13, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave13 (castle/hotel/aquarium)',
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
  themes: ['castle', 'hotel', 'aquarium'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
