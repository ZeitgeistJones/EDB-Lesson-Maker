/**
 * Letter teaching wave2 — full A–Z / a–z × 4 instructional versions.
 * Windows-safe keys: letter-upper-a not letter-A (NTFS is case-insensitive).
 *
 * 8 sheets × 4×7 (26 letters + 2 empty):
 *   1 upper plain · 2 lower plain · 3 upper trace · 4 lower trace
 *   5 upper stroke · 6 lower stroke · 7 upper arrow · 8 lower arrow
 *
 *   node scripts/manus/request-letters-wave2.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-letters-wave2');
const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **8 black-field 4×7 contact sheets** of ESL handwriting teaching glyphs.

These are INSTRUCTIONAL letter assets for teaching formation — not decorative alphabet art.
Pure #000000 black. Cream/off-white ink. Rounded kid-friendly sans, SAME formation family on every sheet.
ONE letter per cell, centered, generous black margin, nothing crossing gutters.
quality: default only. NO characters, NO decorations, NO logos, NO lined paper.

Grid: exact **4×7** = 28 cells. Cells 1–26 = A–Z or a–z in order. Cells 27–28 EMPTY black.

SHEET 1 — UPPERCASE PLAIN exemplars A–Z (solid cream letter)
SHEET 2 — LOWERCASE PLAIN exemplars a–z (solid cream letter, same family)
SHEET 3 — UPPERCASE TRACE: dashed double-outline hollow letters A–Z (trace inside the dashes)
SHEET 4 — LOWERCASE TRACE: dashed double-outline a–z
SHEET 5 — UPPERCASE STROKE-ORDER: numbered stroke sequence on the letter (small 1,2,3 at stroke starts). Keep numbers tiny and inside the glyph area.
SHEET 6 — LOWERCASE STROKE-ORDER: same numbered strokes a–z
SHEET 7 — UPPERCASE START-DOT + ARROW: a filled start dot at the first stroke plus a short directional arrow showing the first stroke direction. No extra decoration.
SHEET 8 — LOWERCASE START-DOT + ARROW: same for a–z

Formation must stay consistent across all 8 sheets (same A shape, same a shape).
Return exactly 8 PNG sheets. Legend in chat text only.`);

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
      if (url) hits.push({ url, name: a.file_name || a.filename || a.name || 'sheet.png' });
    }
  }
  return hits;
}

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify(
    {
      versions: ['plain', 'trace', 'stroke', 'arrow'],
      cases: ['upper', 'lower'],
      note: 'keys are letter-{version}-{case}-{a-z} for NTFS safety',
    },
    null,
    2
  )
);

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'letters-wave2' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL letters wave2 — A-Z 4 versions upper+lower (case-safe keys)',
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
const msgs = await listMessages(taskId, { order: 'asc', limit: 150 });
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
