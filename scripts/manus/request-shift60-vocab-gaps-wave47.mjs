/**
 * Shift60 vocab-gaps wave47 — Chinese hotpot + Arctic animals + school PE.
 *   node scripts/manus/request-shift60-vocab-gaps-wave47.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave47');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — ASIAN HOTPOT / NOODLES:
1. hotpot — hotpot bowl
2. ladle — ladle
3. chopsticks-rest — chopstick rest
4. wonton — wonton
5. bao — bao bun
6. egg-roll — egg roll
7. fried-rice — fried rice plate
8. soy-sauce — soy sauce bottle (BLANK)
9. tea-pot — teapot
Keys: hotpot,ladle,chopsticks-rest,wonton,bao,egg-roll,fried-rice,soy-sauce,tea-pot

SHEET 2 — ARCTIC ANIMALS:
1. polar-bear — polar bear
2. seal — seal
3. walrus — walrus
4. arctic-fox — arctic fox
5. reindeer — reindeer
6. orca — orca / killer whale
7. narwhal — narwhal
8. puffin — puffin
9. snowy-owl — snowy owl
Keys: polar-bear,seal,walrus,arctic-fox,reindeer,orca,narwhal,puffin,snowy-owl

SHEET 3 — SCHOOL PE:
1. cone-marker — sports cone marker
2. whistle-pe — PE whistle
3. stopwatch — stopwatch (BLANK face)
4. bib-pinny — sports bib / pinny (BLANK)
5. beanbag — beanbag
6. hula-hoop — hula hoop
7. relay-baton — relay baton
8. gym-mat — gym mat
9. basketball — basketball
Keys: cone-marker,whistle-pe,stopwatch,bib-pinny,beanbag,hula-hoop,relay-baton,gym-mat,basketball

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 47, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave47 (asian/arctic/pe)',
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
  themes: ['asian-hotpot', 'arctic-animals', 'school-pe'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
