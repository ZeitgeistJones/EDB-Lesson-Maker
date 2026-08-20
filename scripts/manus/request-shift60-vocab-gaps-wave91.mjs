/**
 * Shift60 vocab-gaps wave91 — leftover dict mop + Fire B leftovers + ranked object gaps.
 *   node scripts/manus/request-shift60-vocab-gaps-wave91.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave91');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3A-3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3A-3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PEOPLE / PLACES / BODY:
1. vet — veterinarian (person + stethoscope cue, no text)
2. king — king crown / royal figure (simple)
3. clown — clown
4. fairy — fairy
5. lips — lips
6. city — city skyline (simple buildings)
7. court — tennis court (BLANK lines ok as court markings only)
8. wall — wall
9. floor — floorboards
Keys: vet,king,clown,fairy,lips,city,court,wall,floor

SHEET 2 — MUSIC / SWIM / SPORT / NATURE:
1. tuba — tuba
2. recorder — recorder flute
3. trombone — trombone
4. swimsuit — swimsuit
5. sunblock — sunscreen bottle (BLANK label)
6. hockey — hockey stick + puck
7. panther — panther
8. coal — lump of coal
9. hole — hole in ground
Keys: tuba,recorder,trombone,swimsuit,sunblock,hockey,panther,coal,hole

SHEET 3 — STRUCTURES / PATH / FILL:
1. barrier — barrier / road barrier
2. caravan — caravan / camper trailer
3. ceiling — ceiling
4. cockpit — airplane cockpit (simple, no text)
5. pathway — pathway / garden path
6. melon — melon
7. olive — olive
8. paper — sheet of paper (BLANK)
9. pearl — pearl
Keys: barrier,caravan,ceiling,cockpit,pathway,melon,olive,paper,pearl

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 91, shift: 60 };
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
  title: 'ESL white vocab 3A-3: Shift60 vocab-gaps wave91 (people-places/music-sport/structures-fill)',
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
  themes: ["people-places-body","music-swim-sport","structures-path-fill"],
  keys: [
    "vet","king","clown","fairy","lips","city","court","wall","floor",
    "tuba","recorder","trombone","swimsuit","sunblock","hockey","panther","coal","hole",
    "barrier","caravan","ceiling","cockpit","pathway","melon","olive","paper","pearl"
  ],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
