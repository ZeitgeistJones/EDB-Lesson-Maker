/**
 * MASS STOCKPILE Wave 4 — hide/reveal interactive props (closed + open pairs).
 * 20 nouns × 2 states = 40 → three 4×4 sheets (16+16+8).
 *
 *   node scripts/manus/request-hide-reveal-wave1.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-hide-reveal-wave1');
const POLL_MS = 25_000;
const TIMEOUT_MS = 50 * 60 * 1000;

const ITEMS = [
  'chest', 'box', 'basket', 'backpack', 'cupboard',
  'drawer', 'door', 'curtain', 'barrel', 'bush',
  'bed', 'table', 'sofa', 'shelf', 'tent',
  'locker', 'bin', 'crate', 'envelope', 'gift-box',
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **3 black-field 4×4 sheets** of reusable HIDE/REVEAL board props for ClassIn.

Pure #000000 black. Soft matte educational cutouts. NO characters, NO text/logos, NO story-specific branding.
quality: default only. One object per cell, clear silhouette, bottom-resting.

PAIR RULE: for each noun make CLOSED/covered then OPEN/revealed (empty interior visible when open).

READING ORDER across sheets left→right top→bottom continuous:

Sheet 1 (16 cells): for items 1–8, two cells each = closed then open
${ITEMS.slice(0, 8).map((n, i) => `${i * 2 + 1}. hide-${n}-closed  ${i * 2 + 2}. hide-${n}-open`).join('\n')}

Sheet 2 (16 cells): items 9–16 closed/open
${ITEMS.slice(8, 16).map((n, i) => `${i * 2 + 1}. hide-${n}-closed  ${i * 2 + 2}. hide-${n}-open`).join('\n')}

Sheet 3 (16 cells): items 17–20 closed/open in cells 1–8; cells 9–16 EMPTY black
${ITEMS.slice(16).map((n, i) => `${i * 2 + 1}. hide-${n}-closed  ${i * 2 + 2}. hide-${n}-open`).join('\n')}

Topic-neutral colors. OPEN versions show hollow/empty space kids can "find" things in — not cluttered interiors.

Return exactly 3 PNG sheets.`);

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
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ items: ITEMS }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'hide-reveal-wave1' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL hide/reveal props wave1 — 20 closed+open pairs',
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

await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
const msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
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
