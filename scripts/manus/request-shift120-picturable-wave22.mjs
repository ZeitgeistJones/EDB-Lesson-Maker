/**
 * Shift120 wave22 — picturable still-lifes (skip abstracts). Fired while wave21 cooks.
 *   node scripts/manus/request-shift120-picturable-wave22.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, createTask, MANUS_SKILLS, resolveAgentProfile, withEslAssetGeneratorBrief, apiKey,
} from './client.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'tmp', 'manus-shift120-picturable-wave22');
const OUT_JSON = path.join(OUT_DIR, 'run.json');

const BRIEF = withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life icon sheets. OBJECTS only — skip abstracts.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver 3 PNGs.

SHEET 1 — PETS EXTRA OBJECTS:
1. goldfish-bowl — goldfish in bowl
2. parrot — parrot
3. rabbit — rabbit
4. hamster — hamster
5. turtle-pet — turtle
6. guinea-pig — guinea pig
7. puppy — puppy
8. kitten — kitten
9. pet-carrier-icon — pet carrier
Keys: goldfish-bowl,parrot,rabbit,hamster,turtle-pet,guinea-pig,puppy,kitten,pet-carrier-icon

SHEET 2 — SPORTS EXTRA OBJECTS:
1. volleyball — volleyball
2. rugby-ball — rugby ball
3. cricket-bat — cricket bat
4. badminton-racket — badminton racket
5. ping-pong-paddle — ping pong paddle
6. ice-hockey-puck — hockey puck
7. archery-bow — archery bow
8. fencing-foil — fencing foil
9. stopwatch-icon — stopwatch (blank)
Keys: volleyball,rugby-ball,cricket-bat,badminton-racket,ping-pong-paddle,ice-hockey-puck,archery-bow,fencing-foil,stopwatch-icon

SHEET 3 — HOLIDAY / SEASON EXTRA:
1. halloween-pumpkin — pumpkin
2. easter-egg — decorated easter egg (no text)
3. valentine-heart — heart candy box (blank)
4. new-year-hat — new year party hat
5. thanksgiving-turkey — roast turkey platter
6. menorah — menorah (no letters)
7. christmas-stocking — christmas stocking
8. firework-rocket — firework rocket
9. parade-float — small parade float toy
Keys: halloween-pumpkin,easter-egg,valentine-heart,new-year-hat,thanksgiving-turkey,menorah,christmas-stocking,firework-rocket,parade-float

Return 3 PNGs + short legends. No essay.`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
const dumpBase = { started_at: new Date().toISOString(), agent_profile: profile, force_skills: force, quality: 'default', wave: 22 };
if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON,'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) { console.error('REFUSING', prev.task_id); process.exit(2); }
}
if (DRY) { fs.writeFileSync(OUT_JSON, JSON.stringify({...dumpBase,dry_run:true,brief:BRIEF},null,2)); process.exit(0); }
apiKey();
const created = await createTask({
  title: 'ESL white vocab 3×3: Shift120 picturable wave22 (pets/sports/holiday)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});
const taskId = created.task_id || created.id || null;
fs.writeFileSync(OUT_JSON, JSON.stringify({ ...dumpBase, task_id: taskId, task_url: created.task_url || (taskId ? 'https://manus.im/app/'+taskId : null), created }, null, 2));
console.log(JSON.stringify({ phase:'created', task_id: taskId, task_url: created.task_url }, null, 2));
