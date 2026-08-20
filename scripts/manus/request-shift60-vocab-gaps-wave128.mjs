/**
 * Shift60 vocab-gaps wave128 — remaining picturable rankedGaps (roles + places + gear).
 *   node scripts/manus/request-shift60-vocab-gaps-wave128.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave128');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 2 PNGs.

SHEET 1 — ROLES / GEAR PROPS (NO full people faces — hats/tools only):
1. pirate — pirate hat
2. jogger — running shoe
3. hiking — hiking boot
4. clothes — folded clothes pile
5. fixtures — sink faucet
6. fire-station — fire station building
7. fruit-market — fruit market stall
8. soccer-coach — coach whistle
9. veterinarian — vet medical bag
Keys: pirate,jogger,hiking,clothes,fixtures,fire-station,fruit-market,soccer-coach,veterinarian

SHEET 2 — MORE ROLE / PLACE PROPS:
1. birthday-party — birthday cake (BLANK, no text)
2. customer — shopping bag
3. engineer — blueprint roll + hard hat
4. waitress — serving tray
5. conductor — orchestra baton
6. lifeguard — lifebuoy ring
7. dive — scuba mask
8. crew — crew badge (BLANK)
9. host — host nameplate stand (BLANK)
Keys: birthday-party,customer,engineer,waitress,conductor,lifeguard,dive,crew,host

Return 2 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 128, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave128 (roles/places/gear)',
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
  themes: ['roles-gear', 'more-role-place-props'],
  skipped_abstract: ['hug', 'love', 'note', 'draw', 'energy', 'public', 'circle', 'feelings', 'routines', 'dict', 'kids', 'parents', 'forehead'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
