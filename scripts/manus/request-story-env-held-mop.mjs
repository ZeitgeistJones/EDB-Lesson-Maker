/**
 * Mop held story-env keys only: hotel, bus interior, train interior.
 * One connected piece per cell. Do not redo passed envs.
 *
 *   node scripts/manus/request-story-env-held-mop.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-env-held-mop');
const POLL_MS = 20_000;
const TIMEOUT_MS = 40 * 60 * 1000;

const KEYS = [
  {
    key: 'story-env-hotel-lobby',
    mode: 'midground',
    brief:
      'ONE hotel reception desk zone: warm wood desk + blank guest book/lamp, soft empty wall. Fill most of the cell as a room zone sitting on the BOTTOM. No airport conveyor. No people. No stacked second strip.',
  },
  {
    key: 'story-env-bus-interior',
    mode: 'backdrop',
    brief:
      'ONE bus cabin aisle: seats both sides + poles + windows, looking down the aisle. Empty. Fill most of the cell as a place behind actors. No people. No second stacked scene. No white card.',
  },
  {
    key: 'story-env-train-interior',
    mode: 'backdrop',
    brief:
      'ONE train cabin: seats + window band (aisle or side view), empty. Distinct from bus (train windows/seats, not bus poles/straps). Fill most of the cell. No people. No stacked second strip. No white card.',
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE black-field contact sheet** — exact **1×3** grid (1 row × 3 columns = 3 cells) of reusable ESL story environment pieces.

HARD RULES:
- Pure #000000 black edge to edge. No grey cards, no white plates, no cell borders, no labels on art.
- Soft matte educational style. NOT photo, NOT glossy 3D.
- NO characters/people/animals. NO text/letters/numbers/logos.
- Exactly ONE connected silhouette per cell. NEVER stack two scenes in one cell.
- Each piece sits on the BOTTOM of its cell with black margin above.
- quality: default only.

These replace failed imports. Each must be a single usable stage piece.

READING ORDER left→right:
${KEYS.map((k, i) => `${i + 1}. ${k.key} [${k.mode}] — ${k.brief}`).join('\n')}

Return exactly 1 PNG. Legend in chat text only.`);

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
      const name = a.file_name || a.filename || a.name || 'sheet.png';
      if (url) hits.push({ name, url });
    }
  }
  return hits;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ keys: KEYS }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'story-env-held-mop' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL story-env HELD mop — hotel + bus interior + train interior',
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

const done = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status };
const msgs = await listMessages(taskId, { order: 'asc', limit: 100 });
const images = collectImageAtts(msgs.messages || []);
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
const saved = [];
let i = 0;
for (const img of images) {
  i += 1;
  const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
  const bytes = await download(img.url, dest);
  saved.push({ dest, bytes });
}
dump.saved = saved;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length, ...dump }, null, 2));
if (!saved.length) process.exit(2);
