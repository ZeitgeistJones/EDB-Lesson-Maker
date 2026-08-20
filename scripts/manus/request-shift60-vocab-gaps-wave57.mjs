/**
 * Shift60 vocab-gaps wave57 — sandwiches deli + farm mammals + orchestra.
 *   node scripts/manus/request-shift60-vocab-gaps-wave57.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave57');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — DELI SANDWICHES:
1. club-sandwich — club sandwich
2. grilled-cheese — grilled cheese sandwich
3. blt — BLT sandwich
4. panini — panini
5. bagel-sandwich — bagel sandwich
6. hot-dog-mustard — hot dog with mustard
7. pretzel-bun — pretzel bun
8. pickle — pickle spear
9. chips-bag — chips bag (BLANK)
Keys: club-sandwich,grilled-cheese,blt,panini,bagel-sandwich,hot-dog-mustard,pretzel-bun,pickle,chips-bag

SHEET 2 — FARM MAMMALS:
1. cow — cow
2. pig — pig
3. sheep — sheep
4. goat — goat
5. horse — horse
6. donkey — donkey
7. llama — llama
8. alpaca — alpaca
9. pony — pony
Keys: cow,pig,sheep,goat,horse,donkey,llama,alpaca,pony

SHEET 3 — ORCHESTRA:
1. cello — cello
2. double-bass — double bass
3. harp — harp
4. trombone — trombone
5. french-horn — french horn
6. tuba — tuba
7. oboe — oboe
8. bassoon — bassoon
9. timpani — timpani drum
Keys: cello,double-bass,harp,trombone,french-horn,tuba,oboe,bassoon,timpani

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 57, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave57 (deli/farm/orchestra)',
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
  themes: ['deli-sandwiches', 'farm-mammals', 'orchestra'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
