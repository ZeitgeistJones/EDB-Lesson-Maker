/**
 * Shift120 wave9 — picturable still-lifes (skip abstracts).
 *   node scripts/manus/request-shift120-picturable-wave9.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave9');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — RESTAURANT / CAFE OBJECTS:
1. menu-board — blank menu board
2. coffee-cup — coffee cup + saucer
3. teapot — teapot
4. napkin-ring — napkin in ring
5. salt-pepper — salt and pepper shakers
6. tip-jar — blank tip jar
7. takeout-box — takeout box
8. straw-cup — cup with straw
9. dessert-plate — dessert plate with cake slice
Keys: menu-board,coffee-cup,teapot,napkin-ring,salt-pepper,tip-jar,takeout-box,straw-cup,dessert-plate

SHEET 2 — LIBRARY / READING OBJECTS:
1. bookshelf — bookshelf
2. bookmark-ribbon — bookmark ribbon in book
3. reading-lamp — reading lamp
4. library-card-blank — blank library card
5. magazine — blank magazine
6. dictionary — thick dictionary
7. audiobook — headphones on book
8. study-desk — small study desk
9. quiet-sign — blank quiet plaque (no letters — use finger-to-lips icon shape only)
Keys: bookshelf,bookmark-ribbon,reading-lamp,library-card-blank,magazine,dictionary,audiobook,study-desk,quiet-sign

SHEET 3 — TOOLS / FIX-IT OBJECTS:
1. hammer — hammer
2. screwdriver — screwdriver
3. wrench — wrench
4. pliers — pliers
5. measuring-tape — measuring tape
6. toolbox — toolbox
7. paintbrush-tool — paintbrush
8. drill — power drill
9. safety-goggles — safety goggles
Keys: hammer,screwdriver,wrench,pliers,measuring-tape,toolbox,paintbrush-tool,drill,safety-goggles

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 9 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave9 (cafe/library/tools)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
