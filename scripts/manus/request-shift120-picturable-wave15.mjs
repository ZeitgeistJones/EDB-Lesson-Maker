/**
 * Shift120 wave15 — picturable still-lifes (skip abstracts). Keep loop warm.
 *   node scripts/manus/request-shift120-picturable-wave15.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave15');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — AIRPORT / TRAVEL OBJECTS:
1. suitcase-roll — rolling suitcase
2. boarding-pass-blank — blank boarding pass (no text)
3. passport-blank — blank passport
4. luggage-tag — blank luggage tag
5. airport-cart — luggage cart
6. seatbelt — seatbelt buckle
7. travel-pillow — neck travel pillow
8. eye-mask — sleep eye mask
9. duty-free-bag — blank shopping bag
Keys: suitcase-roll,boarding-pass-blank,passport-blank,luggage-tag,airport-cart,seatbelt,travel-pillow,eye-mask,duty-free-bag

SHEET 2 — CONSTRUCTION OBJECTS:
1. hard-hat-build — hard hat
2. blueprint — blank blueprint roll
3. cement-mixer — cement mixer truck
4. wheelbarrow-build — construction wheelbarrow
5. caution-tape — caution tape roll (no letters — striped only)
6. brick-stack — brick stack
7. crane-hook — crane hook
8. tool-belt — tool belt
9. spirit-level — spirit level
Keys: hard-hat-build,blueprint,cement-mixer,wheelbarrow-build,caution-tape,brick-stack,crane-hook,tool-belt,spirit-level

SHEET 3 — SPORTS FIELD OBJECTS:
1. goal-post — soccer goal post
2. basketball-hoop-icon — basketball hoop
3. tennis-net — tennis net section
4. starting-blocks — starting blocks
5. relay-baton-icon — relay baton
6. scoreboard-blank — blank scoreboard
7. coach-whistle — whistle
8. team-bib — blank sports bib
9. water-cooler — sports water cooler
Keys: goal-post,basketball-hoop-icon,tennis-net,starting-blocks,relay-baton-icon,scoreboard-blank,coach-whistle,team-bib,water-cooler

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 15 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave15 (airport/build/sports)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
