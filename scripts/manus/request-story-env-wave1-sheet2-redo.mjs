/**
 * Story-env wave1 sheet2 REDO — clean 2×4 transit/outdoor strips only.
 * Keeps sheet1's 12 indoor/sports/nature pieces.
 *
 *   node scripts/manus/request-story-env-wave1-sheet2-redo.mjs
 *   node scripts/manus/request-story-env-wave1-sheet2-redo.mjs --poll-only --task=<id>
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-env-wave1-sheet2-redo');
const POLL_MS = 20_000;
const TIMEOUT_MS = 40 * 60 * 1000;

const KEYS = [
  {
    key: 'story-env-train-platform',
    brief: 'ONE piece: train platform strip with yellow edge line + tracks + simple shelter — no people, no second floating objects',
  },
  {
    key: 'story-env-train-interior',
    brief: 'ONE piece: train cabin seats + windows band (side view or aisle), empty — no people, no luggage pile as a second object',
  },
  {
    key: 'story-env-bus-interior',
    brief: 'ONE piece: bus cabin aisle with seats + poles, empty — no people',
  },
  {
    key: 'story-env-bus-stop',
    brief: 'ONE piece: bus stop shelter + curb/sidewalk strip, blank ad panel (no letters) — no people, no bus required',
  },
  {
    key: 'story-env-ocean',
    brief: 'ONE piece: beach sand + ocean water horizon strip — no people, no boats',
  },
  {
    key: 'story-env-pasture',
    brief: 'ONE piece: grass pasture + simple fence + soft hills strip — no animals, no people',
  },
  {
    key: 'story-env-hotel-lobby',
    brief: 'ONE piece: hotel reception desk strip (warm wood desk, blank guest book/lamp ok) — NO airport conveyor, no people',
  },
  {
    key: 'story-env-airport-counter',
    brief: 'ONE piece: airport check-in counter + bag belt strip — blank screens, no logos/text, no people',
  },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE black-field contact sheet** — exact **2×4** grid (2 rows × 4 columns = 8 cells) of reusable ESL story environment strips.

HARD RULES:
- Pure #000000 black edge to edge. No grey cards, no cell borders, no labels on art.
- Soft matte educational style. NOT photo, NOT glossy 3D.
- NO characters/people/animals. NO text/letters/numbers/logos.
- Exactly ONE connected silhouette per cell (do NOT stack two strips in one cell).
- Wide LOW stage strip sitting on the BOTTOM of each cell, black margin above.
- quality: default only.

READING ORDER left→right, top→bottom:
${KEYS.map((k, i) => `${i + 1}. ${k.key} — ${k.brief}`).join('\n')}

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
      const mime = String(a.mime_type || a.content_type || '');
      if (url && (/png|jpeg|jpg|webp/i.test(mime) || /\.(png|jpe?g|webp)$/i.test(name) || !mime)) {
        hits.push({ name, url, mime });
      }
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
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ keys: KEYS.map((k) => k.key) }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'story-env-wave1-sheet2-redo' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const profile = resolveAgentProfile();
  const created = await createTask({
    title: 'ESL story-env wave1 sheet2 REDO — 8 transit strips 2×4',
    agent_profile: profile,
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    interactive_mode: false,
    message: BRIEF,
  });
  taskId = created.task_id;
  dump.task_id = taskId;
  dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
  fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
  console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
} else {
  if (!taskId) throw new Error('--poll-only needs --task=');
  dump.task_id = taskId;
}

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
console.log(JSON.stringify({ phase: 'downloaded', ...dump }, null, 2));
if (!saved.length) process.exit(2);
