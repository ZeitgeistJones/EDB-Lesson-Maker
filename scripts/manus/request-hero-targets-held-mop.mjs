/**
 * Redo only keyed-dead hero targets from wave1 (white/charcoal bodies).
 * 1 sheet, 2×4: fridge pair, washer pair, safe pair, animal-mouth.
 *
 *   node scripts/manus/request-hero-targets-held-mop.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-hero-targets-held-mop');
const POLL_MS = 20_000;
const TIMEOUT_MS = 35 * 60 * 1000;

const NAMES = [
  'fridge-closed',
  'fridge-open',
  'washing-machine-closed',
  'washing-machine-open',
  'safe-closed',
  'safe-open',
  'animal-mouth',
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE black-field 2×4 contact sheet** (2 rows × 4 columns = 8 cells) of MEDIUM HERO play-surface props. These replace keyed-dead wave1 cells only.

HARD RULES:
- Pure #000000 black edge to edge. No white plates, no grey cards, no labels on art.
- Soft matte educational cutouts. quality: default only.
- One object per cell, bottom-resting, fills ~70–80% of the cell.
- Object bodies must be clearly COLORED — never white, cream, stainless, charcoal, or near-black. Those get deleted by our keyer.
- Open interiors are mid-tone walnut / teal / olive — NEVER white and NEVER pure black.

READING ORDER left→right, top→bottom:
1. hero-fridge-closed — sky-blue refrigerator, door closed, front view. Body is BLUE not white/steel.
2. hero-fridge-open — SAME blue fridge, door open, empty olive-green shelves, no food.
3. hero-washing-machine-closed — pale-blue front-load washer (NOT white), round dark window closed, front view.
4. hero-washing-machine-open — SAME pale-blue washer, round door open, empty teal drum (not black hole).
5. hero-safe-closed — olive-green metal safe with gold dial, door closed, 3/4 view. NOT grey/black.
6. hero-safe-open — SAME olive safe, door open, empty walnut interior, no money.
7. hero-animal-mouth — cute lilac hippo head, huge open mouth feed target. Mouth cavity is dark BROWN not black. Clean silhouette, no holes in the face.
8. EMPTY black cell.

PAIR SWAP: closed/open are the SAME object, viewpoint, scale, ground line.
Return exactly 1 PNG.`);

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      if (url) hits.push({ url });
    }
  }
  return hits;
}

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ names: NAMES }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'hero-targets-held-mop' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL hero targets mop — fridge, washer, safe, hippo mouth',
    agent_profile: resolveAgentProfile(),
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    interactive_mode: false,
    message: BRIEF,
  });
  taskId = created.task_id;
  dump.task_id = taskId;
  dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
  fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
  console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
} else if (!taskId) throw new Error('--poll-only needs --task=');

await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
const msgs = await listMessages(taskId, { order: 'asc', limit: 80 });
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
const saved = [];
let i = 0;
for (const img of collectImageAtts(msgs.messages || [])) {
  i += 1;
  const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
  const res = await fetch(img.url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  saved.push(dest);
}
dump.saved = saved;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length }, null, 2));
if (!saved.length) process.exit(2);
