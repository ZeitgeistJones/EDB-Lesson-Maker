/**
 * Perfect 11-sheet run — CALL 3 (1 mid-obscure 4×8 sheet). Final call of 5+5+1.
 *   node scripts/manus/request-perfect11-call3-mid-obscure.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-perfect11-call3');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 15_000;
const TIMEOUT_MS = 40 * 60 * 1000;

const THEME = 'submarine';

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce ONE flat-vector ESL teaching contact sheet for ClassIn board props.

THEME: submarine / undersea vessel (kid-safe OBJECT props — submarine, periscope, hatch, porthole, propeller, sonar dish, depth gauge blank, bubble cluster as one object, coral piece, octopus, whale, map blank, compass, etc.).

HARD STYLE:
- Pure solid #000000 field edge-to-edge. True even grid. One subject per cell, ~8% margin, nothing crossing borders.
- Flat educational / matte 2-tone vector. NOT glossy emoji, NOT photo, NOT grey cards.
- ZERO text/letters/numbers/logos. Kid-safe. OBJECTS only — NO people / NO crew faces.
- Use quality: default only (never high).
- ONE THEME for the whole sheet.

GRID: **4 columns × 8 rows = 32** distinct props when fillable; else **4×4 = 16**. Never pad.

Deliver the PNG sheet plus a short cell-name legend in chat (names only — not painted on art). No long essay.`);

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
    console.error(`REFUSING second Call-3 run — already have task ${prev.task_id}`);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
console.error(`Creating Perfect11 Call 3 (1 sheet: ${THEME})… profile=${profile}`);

const created = await createTask({
  title: 'ESL Perfect11 Call3: submarine 4x8',
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
  call: 3,
  quality: 'default',
  theme: THEME,
  grid: '4x8',
  note: 'Final call of Perfect-11 5+5+1',
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({ phase: 'created', task_id: created.task_id, task_url: dump.task_url, theme: THEME }, null, 2));

const done = await pollUntilDone(created.task_id, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status, credit_usage: done.credit_usage ?? done.credits ?? null };
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 80 });
const list = msgs.messages || [];
const images = collectImageAtts(list);
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);
dump.assistant_excerpts = list
  .filter((m) => m.assistant_message || m.type === 'assistant_message')
  .map((m) => (m.assistant_message && m.assistant_message.content) || '')
  .filter(Boolean)
  .map((t) => String(t).slice(0, 4000));

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
dump.sheets_downloaded = sheetPaths;
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.log(JSON.stringify({
  phase: 'done',
  task_id: created.task_id,
  task_url: dump.task_url,
  credit_usage: dump.poll.credit_usage,
  image_count: images.length,
  sheets: sheetPaths,
}, null, 2));
