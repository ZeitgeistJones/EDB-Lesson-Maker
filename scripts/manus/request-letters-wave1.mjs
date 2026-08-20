/**
 * MASS STOCKPILE Wave 6 — letter teaching sheets (A–Z upper+lower exemplars + trace).
 * Two 6×9-ish grids as 3 sheets of 6×6? Prefer 4 sheets: upper plain, lower plain, upper trace, lower trace.
 *
 *   node scripts/manus/request-letters-wave1.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-letters-wave1');
const POLL_MS = 25_000;
const TIMEOUT_MS = 50 * 60 * 1000;

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **4 black-field contact sheets** for ESL letter teaching cutouts.

Pure #000000 background. Clean instructional typography (rounded sans, kid-friendly). NO characters, NO decorations, NO logos.
quality: default only.

SHEET 1 — Uppercase PLAIN exemplars: 6×5 grid? Use **4×7** with cells 1–26 = A–Z, cells 27–28 EMPTY.
SHEET 2 — Lowercase PLAIN exemplars: same 4×7, a–z.
SHEET 3 — Uppercase TRACE (dashed outline letters) A–Z, same grid.
SHEET 4 — Lowercase TRACE dashed a–z, same grid.

Each letter: single centered glyph, high contrast light/cream ink on black, consistent size, clear silhouette for PropBank keying.
Keys will be: letter-A, letter-a, letter-trace-A, letter-trace-a, etc.

Return exactly 4 PNG sheets. Legend in chat only.`);

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

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'letters-wave1' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL letters wave1 — A-Z plain + trace upper/lower',
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
} else if (!taskId) throw new Error('--task');

await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
const msgs = await listMessages(taskId, { order: 'asc', limit: 100 });
const images = collectImageAtts(msgs.messages || []);
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
let i = 0;
const saved = [];
for (const img of images) {
  i += 1;
  const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
  const res = await fetch(img.url);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  saved.push(dest);
}
dump.saved = saved;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length }, null, 2));
if (!saved.length) process.exit(2);
