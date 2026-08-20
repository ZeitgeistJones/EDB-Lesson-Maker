/**
 * MASS STOCKPILE Wave 3 — extra story cast roles (core poses × neutral+happy).
 * 16 roles × 7 poses × 2 emotions = 224 → split into multiple Manus tasks if needed.
 * This request: batch A = 8 roles (kids/adults common) as 8 sheets of 4×4 (14 used).
 *
 *   node scripts/manus/request-story-cast-roles-wave1.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-cast-roles-wave1');
const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;

const ROLES = [
  { who: 'kid3', label: 'third kid (boy ~6, distinct from Mia/Leo)', brief: 'short brown hair, green tee, khaki shorts, sneakers' },
  { who: 'parent', label: 'parent (mom ~30)', brief: 'simple blouse + jeans, long hair, sneakers' },
  { who: 'teacher', label: 'teacher (adult)', brief: 'cardigan + blouse, glasses optional, friendly' },
  { who: 'doctor', label: 'doctor/helper', brief: 'white coat silhouette, stethoscope subtle, NO logos/text' },
  { who: 'chef', label: 'chef', brief: 'white chef coat + hat, NO logos' },
  { who: 'worker', label: 'worker', brief: 'hi-vis vest + hard hat simple, NO logos' },
  { who: 'waiter', label: 'waiter', brief: 'simple apron + shirt, NO tray prop in idle' },
  { who: 'cashier', label: 'cashier', brief: 'store apron, friendly adult' },
];

const POSES = ['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach'];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **8 black-field 4×4 sheets** — one role per sheet — ESL story cast cutouts.

Each sheet: pure #000000, true 4×4 grid, soft matte educational style, full body, bottom foot anchor, viewer-RIGHT bias.
NO scenery, NO text/logos, NO props in hands (hold = empty holding gesture).
quality: default only.

Per sheet cells 1–7 = NEUTRAL emotion poses; cells 8–14 = HAPPY emotion same poses; cells 15–16 EMPTY black.

POSE ORDER (within each emotion block):
1 idle · 2 hold · 3 walk · 4 talk · 5 sit · 6 listen · 7 reach

SHEETS (role identity locked per sheet):
${ROLES.map((r, i) => `${i + 1}. who=${r.who} — ${r.label}. Look: ${r.brief}`).join('\n')}

Keys: cast-{who}-{pose}-{neutral|happy}
Return exactly 8 PNG sheets. Legend in chat only.`);

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
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ roles: ROLES, poses: POSES, emotions: ['neutral', 'happy'] }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'story-cast-roles-wave1' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL cast ROLES wave1 — 8 roles ×7 poses ×2 emotions',
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
} else if (!taskId) throw new Error('--task required');

const done = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status };
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
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  saved.push(dest);
}
dump.saved = saved;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length }, null, 2));
if (!saved.length) process.exit(2);
