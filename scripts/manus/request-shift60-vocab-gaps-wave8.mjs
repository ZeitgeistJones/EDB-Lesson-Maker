/**
 * Shift60 vocab-gaps wave8 — insects + birds + space.
 *   node scripts/manus/request-shift60-vocab-gaps-wave8.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave8');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — INSECTS:
1. ant — ant
2. beetle — beetle
3. ladybug — ladybug
4. grasshopper — grasshopper
5. dragonfly — dragonfly
6. caterpillar — caterpillar
7. snail — snail
8. spider — friendly spider
9. mosquito — mosquito
Keys: ant,beetle,ladybug,grasshopper,dragonfly,caterpillar,snail,spider,mosquito

SHEET 2 — BIRDS:
1. owl — owl
2. eagle — eagle
3. swan — swan
4. parrot — parrot
5. flamingo — flamingo
6. peacock — peacock
7. crow — crow
8. robin — robin
9. ostrich — ostrich
Keys: owl,eagle,swan,parrot,flamingo,peacock,crow,robin,ostrich

SHEET 3 — SPACE:
1. rocket — rocket
2. planet — planet
3. moon — moon
4. star — star
5. astronaut-helmet — astronaut helmet (object, not full person)
6. satellite — satellite
7. telescope — telescope
8. alien — friendly simple alien (icon)
9. comet — comet
Keys: rocket,planet,moon,star,astronaut-helmet,satellite,telescope,alien,comet

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 8, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave8 (insects/birds/space)',
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
  themes: ['insects', 'birds', 'space'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
