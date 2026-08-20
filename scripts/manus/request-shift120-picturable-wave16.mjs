/**
 * Shift120 wave16 — picturable still-lifes (skip abstracts). Leave warm.
 *   node scripts/manus/request-shift120-picturable-wave16.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave16');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — MARKET / GROCERY OBJECTS:
1. shopping-basket — shopping basket
2. produce-scale — produce scale (blank)
3. grocery-bag — grocery bag
4. milk-carton — milk carton (blank)
5. bread-bag — bread bag (blank)
6. deli-counter — deli counter slice
7. freezer-door — freezer door section
8. coupon — blank coupon
9. loyalty-card-blank — blank loyalty card
Keys: shopping-basket,produce-scale,grocery-bag,milk-carton,bread-bag,deli-counter,freezer-door,coupon,loyalty-card-blank

SHEET 2 — BIRTHDAY / PARTY EXTRA:
1. party-balloon — balloon
2. gift-bag — gift bag
3. cake-slice — cake slice on plate
4. candle-blow — birthday candle
5. streamers — party streamers
6. pinata-stick — pinata stick
7. goody-bag — blank goody bag
8. photo-booth-prop — blank photo booth prop
9. invitation-blank — blank invitation card
Keys: party-balloon,gift-bag,cake-slice,candle-blow,streamers,pinata-stick,goody-bag,photo-booth-prop,invitation-blank

SHEET 3 — MUSIC ROOM EXTRA:
1. grand-piano-icon — grand piano
2. violin-case — violin case
3. sheet-music-blank — blank sheet music stand
4. tuning-fork — tuning fork
5. tambourine-icon — tambourine
6. xylophone-icon — xylophone
7. flute-icon — flute
8. trumpet-icon — trumpet
9. conductor-baton — conductor baton
Keys: grand-piano-icon,violin-case,sheet-music-blank,tuning-fork,tambourine-icon,xylophone-icon,flute-icon,trumpet-icon,conductor-baton

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 16 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave16 (market/party/music)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
