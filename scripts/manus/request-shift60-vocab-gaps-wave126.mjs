/**
 * Shift60 vocab-gaps wave126 — next rankedGaps mop (post 123–125).
 *   node scripts/manus/request-shift60-vocab-gaps-wave126.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave126');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — MATERIALS / YARD:
1. wire — wire coil
2. wood — wood plank
3. wool — wool ball
4. yard — backyard scene
5. yolk — egg yolk
6. brush — paint brush
7. fence — fence
8. field — green field
9. floor — wood floor board
Keys: wire,wood,wool,yard,yolk,brush,fence,field,floor

SHEET 2 — BUILDINGS / PATHS:
1. alarm — alarm clock
2. arrow — arrow
3. attic — attic interior
4. booth — phone booth
5. brake — car brake disc
6. cabin — cabin
7. canal — canal
8. cargo — cargo crate
9. chain — chain
Keys: alarm,arrow,attic,booth,brake,cabin,canal,cargo,chain

SHEET 3 — MORE STILL-LIFE:
1. chest — treasure chest
2. cliff — cliff
3. cloak — cloak
4. cloth — folded cloth
5. clown — clown hat (prop, not face close-up)
6. coast — coastline
7. couch — couch
8. court — tennis court
9. crate — wooden crate
Keys: chest,cliff,cloak,cloth,clown,coast,couch,court,crate

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 126, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave126 (materials/buildings/still-life)',
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
  themes: ['materials-yard', 'buildings-paths', 'more-still-life'],
  skipped_abstract: ['hug', 'crew', 'dict', 'dive', 'draw', 'golf', 'host', 'kids', 'love'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
