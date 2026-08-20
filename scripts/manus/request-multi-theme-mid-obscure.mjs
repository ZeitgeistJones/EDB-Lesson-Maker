/**
 * ONE multi-theme mid-obscure 8×4 (4 cols × 8 rows = 32) contact sheet.
 * Different topic per row — not mono-theme. Do NOT re-run.
 *
 *   node scripts/manus/request-multi-theme-mid-obscure.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-multi-theme-mid-obscure');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 20_000;
const TIMEOUT_MS = 40 * 60 * 1000;

/** One topic per row (4 cells each) — mid-obscure / untouched vs prior sports/food/jobs batches. */
const ROW_TOPICS = [
  'circus',
  'pirates',
  'castle-knights',
  'post-office',
  'airport',
  'recycling',
  'carnival',
  'fire-station',
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce ONE flat-vector ESL teaching contact sheet for ClassIn board props.

GRID (mandatory): **4 columns × 8 rows = 32 cells** (portrait pack). True even grid. One subject per cell, ~8% margin, nothing crossing borders. Import layout is 8×4 (rows×cols).

MULTI-THEME (mandatory — NOT one theme for the whole sheet):
Assign a DIFFERENT mid-obscure topic to each ROW (4 cells per topic). Fill each row with distinct kid-safe OBJECT / creature / place props for that topic only — no people figures, no face icons, no text on art.

Row topics (top → bottom):
1. circus
2. pirates
3. castle / knights (objects, armor pieces, castle bits — no people)
4. post office
5. airport
6. recycling
7. carnival / fair
8. fire station (objects / vehicles / tools — no firefighter people)

HARD STYLE:
- Pure solid #000000 field edge-to-edge. Flat educational / matte 2-tone vector (base + one shade). NOT glossy emoji, NOT photo, NOT grey cards.
- ZERO text/letters/numbers/logos/brand marks. Kid-safe.
- Use quality: default only (never high).
- Never pad with duplicates or off-theme fillers. Skip a weak cell rather than invent commons (no family/pets/weather filler).

Deliver the PNG sheet plus a short cell-name legend in chat by row/topic (names only — not painted on art). No long essay.`);

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

if (fs.existsSync(OUT_JSON)) {
  const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  if (prev.task_id && !process.env.MANUS_FORCE_RERUN) {
    console.error(`REFUSING second run — already have task ${prev.task_id}`);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
console.error(`Creating multi-theme mid-obscure 8×4 (ONE task)… profile=${profile}`);

const created = await createTask({
  title: 'ESL asset: multi-theme mid-obscure 8x4 (circus→fire-station)',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
});

const dump = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  task_id: created.task_id,
  task_url: created.task_url || (created.task_id ? `https://manus.im/app/${created.task_id}` : null),
  grid: '4 cols × 8 rows = 32 (import --grid=8x4)',
  quality: 'default',
  row_topics: ROW_TOPICS,
  note: 'ONE multi-theme sheet — do not fire a third Manus call after this',
  brief_starts_with: BRIEF.slice(0, 220),
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({
  phase: 'created',
  task_id: created.task_id,
  task_url: dump.task_url,
  row_topics: ROW_TOPICS,
  out_dir: OUT_DIR,
}, null, 2));

console.error(`Polling every ${POLL_MS / 1000}s…`);
const done = await pollUntilDone(created.task_id, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = {
  agent_status: done.agent_status || done.status,
  credit_usage: done.credit_usage ?? done.credits ?? null,
};
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 100 });
const list = msgs.messages || msgs.data || msgs.items || [];
const images = collectImageAtts(list);
dump.message_count = list.length;
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);

const assistant = (list || [])
  .filter((m) => m.assistant_message || m.type === 'assistant_message')
  .map((m) => (m.assistant_message && m.assistant_message.content) || '')
  .filter(Boolean);
dump.assistant_excerpts = assistant.map((t) => String(t).slice(0, 1200));

const sheetPaths = [];
for (let i = 0; i < images.length; i++) {
  const img = images[i];
  const safe = String(img.name || `sheet-${i + 1}.png`).replace(/[^\w.\-]+/g, '_');
  const dest = path.join(OUT_DIR, `${String(i + 1).padStart(2, '0')}-${safe.endsWith('.png') || /\.jpe?g$/i.test(safe) ? safe : `${safe}.png`}`);
  try {
    const bytes = await download(img.url, dest);
    sheetPaths.push({ path: dest, bytes, name: img.name });
    console.error(`Downloaded ${dest} (${bytes} bytes)`);
  } catch (e) {
    console.error(`Download failed ${img.name}: ${e.message}`);
  }
}
dump.sheets = sheetPaths;
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));

console.log(JSON.stringify({
  phase: 'done',
  task_id: created.task_id,
  task_url: dump.task_url,
  credit_usage: dump.poll.credit_usage,
  agent_status: dump.poll.agent_status,
  image_count: images.length,
  sheets: sheetPaths,
  row_topics: ROW_TOPICS,
  out_dir: OUT_DIR,
}, null, 2));
