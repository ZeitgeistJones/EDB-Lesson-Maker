/**
 * Shift60 vocab-gaps wave24 — sports field + marina + camping extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave24.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave24');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — SPORTS FIELD EXTRAS:
1. scoreboard — scoreboard (BLANK, no numbers/text)
2. goalpost — football / soccer goalpost
3. baton — relay baton
4. starting-block — starting block
5. finish-tape — finish-line tape / ribbon (BLANK)
6. discus — discus
7. shot-put — shot put ball
8. vaulting-pole — vaulting pole
9. hurdles-set — single hurdle
Keys: scoreboard,goalpost,baton,starting-block,finish-tape,discus,shot-put,vaulting-pole,hurdles-set

SHEET 2 — MARINA / BOATING:
1. lifejacket — life jacket / life vest
2. paddle — kayak / canoe paddle
3. helm — boat helm / ship's wheel
4. sail — sail
5. mooring — mooring cleat / bollard
6. kayak — kayak
7. boat-hook — boat hook
8. fender — boat fender / bumper
9. winch — boat winch
Keys: lifejacket,paddle,helm,sail,mooring,kayak,boat-hook,fender,winch

SHEET 3 — CAMPING EXTRAS:
1. camp-stove — portable camp stove
2. tent-peg — tent peg / stake
3. mosquito-net — mosquito net
4. mallet — camping mallet
5. guy-rope — guy rope / tent rope coil
6. camp-chair — folding camp chair
7. ice-pack — ice pack
8. first-aid-kit — first aid kit box (BLANK, no cross text)
9. water-filter — portable water filter bottle
Keys: camp-stove,tent-peg,mosquito-net,mallet,guy-rope,camp-chair,ice-pack,first-aid-kit,water-filter

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 24, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave24 (field/marina/camping)',
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
  themes: ['sports-field', 'marina', 'camping-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
