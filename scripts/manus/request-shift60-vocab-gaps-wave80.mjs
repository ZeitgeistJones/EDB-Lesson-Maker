/**
 * Shift60 vocab-gaps wave80 — burrito/night/airport.
 *   node scripts/manus/request-shift60-vocab-gaps-wave80.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave80');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — BURRITO BOWL:
1. burrito-bowl — burrito bowl
2. cilantro-lime-rice — rice
3. black-beans — black beans
4. corn-salsa — corn salsa
5. pico-de-gallo — pico de gallo
6. shredded-cheese — shredded cheese
7. tortilla-strips — tortilla strips
8. lime-half — lime half
9. hot-sauce — hot sauce bottle (BLANK)
Keys: burrito-bowl,cilantro-lime-rice,black-beans,corn-salsa,pico-de-gallo,shredded-cheese,tortilla-strips,lime-half,hot-sauce

SHEET 2 — NIGHT INSECTS:
1. moth-night — moth
2. firefly-night — firefly
3. cricket-night — cricket
4. mosquito-night — mosquito
5. beetle-night — beetle
6. owl-butterfly — owl
7. bat — bat
8. spider-web — spider web
9. lantern-bug — lantern
Keys: moth-night,firefly-night,cricket-night,mosquito-night,beetle-night,owl-butterfly,bat,spider-web,lantern-bug

SHEET 3 — AIRPORT SECURITY:
1. tray-security — security tray
2. laptop-bin — laptop in bin
3. boarding-pass-scan — boarding pass (BLANK)
4. passport-open — passport (BLANK)
5. belt — belt
6. shoes-security — shoes
7. water-bottle-empty — empty water bottle
8. metal-detector — metal detector arch
9. luggage-scan — luggage
Keys: tray-security,laptop-bin,boarding-pass-scan,passport-open,belt,shoes-security,water-bottle-empty,metal-detector,luggage-scan

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 80, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave80 (burrito/night/airport)',
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
  themes: ["burrito-bowl","insects-night","airport-security"],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
