/**
 * Shift60 vocab-gaps wave70 — tapas + arctic gear + playground more.
 *   node scripts/manus/request-shift60-vocab-gaps-wave70.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave70');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — TAPAS / SMALL PLATES:
1. olives-tapas — olives plate
2. patatas — patatas bravas
3. shrimp-skewer — shrimp skewer
4. croquette — croquette
5. chorizo — chorizo
6. bread-oil — bread with oil
7. stuffed-pepper — stuffed pepper
8. meatball-tapas — meatball
9. sangria-glass — sangria glass (BLANK)
Keys: olives-tapas,patatas,shrimp-skewer,croquette,chorizo,bread-oil,stuffed-pepper,meatball-tapas,sangria-glass

SHEET 2 — ARCTIC GEAR:
1. parka — parka
2. snowshoes-pair — snowshoes
3. ice-axe — ice axe
4. crampons — crampons
5. thermos-arctic — thermos
6. sled-dog — sled
7. fur-hat — fur hat
8. balaclava — balaclava
9. ice-pick — ice pick
Keys: parka,snowshoes-pair,ice-axe,crampons,thermos-arctic,sled-dog,fur-hat,balaclava,ice-pick

SHEET 3 — PLAYGROUND MORE:
1. roundabout — playground roundabout
2. climbing-frame — climbing frame
3. spring-rider — spring rider toy
4. zip-line — zip line seat
5. trampoline — trampoline
6. basketball-hoop — basketball hoop
7. chalk-draw — sidewalk chalk
8. skip-rope — skip rope
9. water-fountain-park — drinking fountain
Keys: roundabout,climbing-frame,spring-rider,zip-line,trampoline,basketball-hoop,chalk-draw,skip-rope,water-fountain-park

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 70, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave70 (tapas/arctic/playground)',
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
  themes: ['tapas', 'arctic-gear', 'playground-more'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
