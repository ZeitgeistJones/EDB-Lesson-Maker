/**
 * MASS STOCKPILE Wave 3b — remaining cast roles (batch B).
 *   node scripts/manus/request-story-cast-roles-wave1b.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-cast-roles-wave1b');
const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;

const ROLES = [
  { who: 'vendor', label: 'market vendor', brief: 'simple stall apron, adult' },
  { who: 'clerk', label: 'office/shop clerk', brief: 'button shirt, adult' },
  { who: 'customer', label: 'customer', brief: 'casual adult with shopping-ready stance' },
  { who: 'farmer', label: 'farmer', brief: 'overalls + straw hat simple' },
  { who: 'officer', label: 'officer', brief: 'simple uniform silhouette, NO badges/text' },
  { who: 'referee', label: 'referee', brief: 'striped shirt silhouette, whistle optional tiny' },
  { who: 'shopper', label: 'shopper', brief: 'casual adult, empty hands' },
  { who: 'zookeeper', label: 'zookeeper', brief: 'khaki shirt + safari hat simple' },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **8 black-field 4×4 sheets** — one role per sheet — ESL story cast.

Pure #000000, 4×4 grid, soft matte educational, full body, bottom anchor, viewer-RIGHT bias.
NO scenery, NO text/logos, hold pose = empty hands. quality: default only.

Cells 1–7 NEUTRAL poses (idle hold walk talk sit listen reach); cells 8–14 HAPPY same poses; 15–16 EMPTY.

SHEETS:
${ROLES.map((r, i) => `${i + 1}. who=${r.who} — ${r.label}. ${r.brief}`).join('\n')}

Keys: cast-{who}-{pose}-{neutral|happy}
Return 8 PNG sheets.`);

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
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ roles: ROLES }, null, 2));

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'story-cast-roles-wave1b' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL cast ROLES wave1b — 8 more roles ×7×2',
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
const msgs = await listMessages(taskId, { order: 'asc', limit: 150 });
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
