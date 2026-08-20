/**
 * Redo only the hide/reveal pairs that failed pair QA (not white-plate mop).
 * drawer (both open), table (identical), bed (identity drift).
 *
 *   node scripts/manus/request-hide-reveal-broken-pairs.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-hide-reveal-broken-pairs');
const POLL_MS = 20_000;
const TIMEOUT_MS = 35 * 60 * 1000;

const ITEMS = [
  {
    key: 'drawer',
    closed: 'CLOSED dresser: a small chest of drawers with ALL drawer fronts flush. Handle visible. NO interior, NO pulled drawer.',
    open: 'SAME dresser identity: ONE drawer pulled out showing empty hollow interior. Rest of the dresser stays closed.',
  },
  {
    key: 'table',
    closed: 'CLOSED hide-table: four-leg wooden table with a long tablecloth hanging to the floor so nothing is visible underneath.',
    open: 'SAME table identity: tablecloth lifted/parted on one side so the empty hide-space under the table is clearly visible.',
  },
  {
    key: 'bed',
    closed: 'CLOSED bed: arched wooden headboard + checkered quilt fully covering the mattress. Same bed every cell.',
    open: 'SAME bed identity: quilt lifted at the foot so the empty under-bed hide-space is visible. Not a missing mattress.',
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE black-field 2×3 contact sheet** (2 rows × 3 columns = 6 cells) of HIDE/REVEAL props. These replace failed pairs only.

HARD RULES:
- Pure #000000 black edge to edge. No white plates, no grey cards, no labels on art.
- Soft matte educational cutouts. NO people. NO text/logos.
- One object per cell, bottom-resting, generous black margin.
- CLOSED then OPEN must be the SAME object identity. OPEN must show empty hide-space.
- quality: default only.

READING ORDER left→right, top→bottom:
1. hide-drawer-closed — ${ITEMS[0].closed}
2. hide-drawer-open — ${ITEMS[0].open}
3. hide-table-closed — ${ITEMS[1].closed}
4. hide-table-open — ${ITEMS[1].open}
5. hide-bed-closed — ${ITEMS[2].closed}
6. hide-bed-open — ${ITEMS[2].open}

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
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ items: ITEMS.map((i) => i.key) }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'hide-reveal-broken-pairs' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL hide/reveal redo — drawer + table + bed pairs',
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
const images = collectImageAtts(msgs.messages || []);
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
const saved = [];
let i = 0;
for (const img of images) {
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
