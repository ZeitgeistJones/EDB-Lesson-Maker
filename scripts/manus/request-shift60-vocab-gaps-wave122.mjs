/**
 * Shift60 vocab-gaps wave122 — treats / outdoor kit leftovers (rankedGaps 316–end).
 *   node scripts/manus/request-shift60-vocab-gaps-wave122.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift60-vocab-gaps-wave122');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheet. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 1 PNG.

SHEET 1 — TREATS / OUTDOOR KIT:
1. doughnut — doughnut (no icing letters)
2. hot-cocoa — hot cocoa mug
3. guidebook — guidebook (BLANK cover)
4. newspaper — newspaper (BLANK)
5. handkerchief — folded handkerchief
6. picnic-table — picnic table
7. pack-bag — pack bag / duffel
8. treasure — treasure chest
9. firework — firework rocket (no text)
Keys: doughnut,hot-cocoa,guidebook,newspaper,handkerchief,picnic-table,pack-bag,treasure,firework

Return 1 PNG + short legend. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 122, shift: 60 };
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
  title: 'ESL white vocab 3×3: Shift60 vocab-gaps wave122 (treats/outdoor kit)',
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
  themes: ['treats-outdoor-kit'],
  gap_slice: '316-end',
  deferred_lt9: ['recorder', 'trombone', 'swimsuit', 'sunblock'],
  skipped_dup: ['dinosaurs'],
  created,
}, null, 2));
console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: created.task_url }, null, 2));
