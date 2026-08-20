/**
 * Shift60 vocab-gaps wave51 — juice bar + insects tiny + hotel extras.
 *   node scripts/manus/request-shift60-vocab-gaps-wave51.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave51');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — JUICE / SMOOTHIE BAR:
1. juicer — juicer
2. blender-bottle — blender bottle
3. straw — drinking straw
4. lemon — lemon
5. lime — lime
6. watermelon — watermelon slice
7. mint — mint leaves
8. ice-cubes — ice cubes
9. juice-carton — juice carton (BLANK)
Keys: juicer,blender-bottle,straw,lemon,lime,watermelon,mint,ice-cubes,juice-carton

SHEET 2 — TINY CREATURES:
1. ant — ant
2. spider — spider
3. snail — snail
4. worm — earthworm
5. slug — slug
6. centipede — centipede
7. scorpion — scorpion
8. bee — bee
9. mosquito — mosquito
Keys: ant,spider,snail,worm,slug,centipede,scorpion,bee,mosquito

SHEET 3 — HOTEL EXTRAS:
1. keycard — hotel keycard (BLANK)
2. luggage-cart — luggage cart
3. minibar — minibar fridge (BLANK)
4. safe — hotel safe (BLANK)
5. robe — bathrobe
6. slippers-hotel — hotel slippers
7. do-not-disturb — door hanger (BLANK, no text)
8. room-service-tray — room service tray
9. pillow-mint — pillow mint
Keys: keycard,luggage-cart,minibar,safe,robe,slippers-hotel,do-not-disturb,room-service-tray,pillow-mint

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 51, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave51 (juice/creatures/hotel)',
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
  themes: ['juice-bar', 'tiny-creatures', 'hotel-extras'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
