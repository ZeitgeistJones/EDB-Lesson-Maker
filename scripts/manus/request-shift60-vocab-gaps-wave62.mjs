/**
 * Shift60 vocab-gaps wave62 — brunch + Australian animals + board games.
 *   node scripts/manus/request-shift60-vocab-gaps-wave62.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave62');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BRUNCH:
1. eggs-benedict — eggs benedict
2. avocado-toast — avocado toast
3. french-toast — french toast
4. waffle-syrup — waffle with syrup
5. mimosa — mimosa glass
6. smoothie-bowl — smoothie bowl
7. quiche-slice — quiche slice
8. smoked-salmon — smoked salmon
9. hashbrowns — hash browns
Keys: eggs-benedict,avocado-toast,french-toast,waffle-syrup,mimosa,smoothie-bowl,quiche-slice,smoked-salmon,hashbrowns

SHEET 2 — AUSTRALIAN ANIMALS:
1. koala — koala
2. kangaroo-joey — kangaroo
3. platypus — platypus
4. wombat — wombat
5. tasmanian-devil — tasmanian devil
6. emu-bird — emu
7. cassowary — cassowary
8. dingo — dingo
9. wallaby — wallaby
Keys: koala,kangaroo-joey,platypus,wombat,tasmanian-devil,emu-bird,cassowary,dingo,wallaby

SHEET 3 — BOARD GAMES:
1. chessboard — chessboard (BLANK, no letters)
2. dice — dice
3. playing-cards — playing cards (BLANK backs)
4. jigsaw-piece — jigsaw puzzle piece
5. checkers — checkers piece
6. game-box — game box (BLANK)
7. marble — marble
8. domino — domino tile (BLANK pips as dots ok)
9. spinner — game spinner (BLANK)
Keys: chessboard,dice,playing-cards,jigsaw-piece,checkers,game-box,marble,domino,spinner

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 62, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave62 (brunch/aussie/games)',
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
  themes: ['brunch', 'australian-animals', 'board-games'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
