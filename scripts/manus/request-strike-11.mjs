/**
 * ESL Production Strike: 11 themed 4×8 sheets in ONE Manus task.
 * Manus must fire 3 generate_image calls (5+5+1) inside that task.
 *
 *   node scripts/manus/request-strike-11.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-strike-11');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 20_000;
const TIMEOUT_MS = 120 * 60 * 1000;

const SHEETS = [
  { id: '1', theme: 'hiking-trekking', grid: '4x8' },
  { id: '2', theme: 'postal-service', grid: '4x8' },
  { id: '3', theme: 'hair-salon-barber', grid: '4x8' },
  { id: '4', theme: 'photography', grid: '4x8' },
  { id: '5', theme: 'archaeology', grid: '4x8' },
  { id: '6', theme: 'tailor-sewing', grid: '4x8' },
  { id: '7', theme: 'bakery-backroom', grid: '4x8' },
  { id: '8', theme: 'car-repair-shop', grid: '4x8' },
  { id: '9', theme: 'garden-center', grid: '4x8' },
  { id: '10', theme: 'optician-eye-clinic', grid: '4x8' },
  { id: '11', theme: 'recycling-center', grid: '4x8' },
];

const BRIEF = withEslAssetGeneratorBrief(`ESL PRODUCTION STRIKE: 11-SHEET BATCH

SOURCE OF TRUTH: Read /home/ubuntu/skills/esl-asset-generator/SKILL.md immediately. This skill file is the absolute authority on style, batching, and cost-efficiency. If this prompt conflicts with the skill, follow the skill.

EXECUTION: Execute Mode 2 (4x8 grid) for the 11 themes below.

THE 5+5+1 BATCH RULE (CRITICAL — ONE MANUS TASK):
You MUST fire exactly 3 generate_image tool calls inside THIS single task:
  Call 1 → sheets 1–5
  Call 2 → sheets 6–10
  Call 3 → sheet 11
Do not stop after the first call. Do not open a second Manus task. Finish all 11 PNGs here.

CLARIFY vs any "max 5 sheets per call" note: that cap is per generate_image tool call, NOT per Manus task. This task owns all 11 sheets via 5+5+1.

HARD RULES:
- quality: default only (never high)
- model: nano-banana-pro
- 100% text-free (no letters, numbers, logos, brand marks on any tile)
- No grid lines / graph paper / grey gutters painted on the sheet
- VOID BLACK (#000000) background edge-to-edge
- Flat educational / matte 2-tone vector (base + one shade). NOT glossy emoji, NOT photo, NOT grey cards behind objects
- OBJECTS only — NO people figures, NO face-icon sheets
- ONE THEME PER SHEET — do not mix topics across cells on the same PNG
- Grid: **4 columns × 8 rows = 32** distinct props when you can fill them cleanly; else **4×4 = 16**. Never pad with duplicates or off-theme fillers
- Portrait pack preferred (import uses --grid=8x4 for 8 rows × 4 cols)

THEMES (32 atomic objects each when fillable):
SHEET 1: HIKING & TREKKING
SHEET 2: POSTAL SERVICE
SHEET 3: HAIR SALON / BARBER SHOP
SHEET 4: PHOTOGRAPHY
SHEET 5: ARCHAEOLOGY
SHEET 6: TAILOR & SEWING
SHEET 7: BAKERY BACKROOM
SHEET 8: CAR REPAIR SHOP
SHEET 9: GARDEN CENTER
SHEET 10: OPTICIAN/EYE CLINIC
SHEET 11: RECYCLING CENTER

Generate all 11 sheets before delivering. Deliver as 11 separate PNGs with a text legend (cell names in chat only — not painted on art). Execute now.`);

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
    console.error(`REFUSING second Strike-11 run — already have task ${prev.task_id}`);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
console.error(`Creating Strike-11 (ONE task, 5+5+1 inside)… profile=${profile}`);

const created = await createTask({
  title: 'ESL Strike-11: hiking→recycling (5+5+1 one task)',
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
  quality: 'default',
  batch: '5+5+1 inside one createTask',
  sheets: SHEETS,
  brief_starts_with: BRIEF.slice(0, 240),
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({
  phase: 'created',
  task_id: created.task_id,
  task_url: dump.task_url,
  sheets: SHEETS,
  out_dir: OUT_DIR,
}, null, 2));

console.error(`Polling every ${POLL_MS / 1000}s (timeout ${TIMEOUT_MS / 60000}m)…`);
const done = await pollUntilDone(created.task_id, {
  intervalMs: POLL_MS,
  timeoutMs: TIMEOUT_MS,
  onTick: ({ agent_status }) => {
    if (agent_status) console.error(`  status=${agent_status}`);
  },
});
dump.poll = {
  agent_status: done.agent_status || done.status,
  credit_usage: done.credit_usage ?? done.credits ?? null,
};
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 200 });
const list = msgs.messages || msgs.data || msgs.items || [];
const images = collectImageAtts(list);
dump.message_count = list.length;
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);
dump.assistant_excerpts = (list || [])
  .filter((m) => m.assistant_message || m.type === 'assistant_message')
  .map((m) => (m.assistant_message && m.assistant_message.content) || '')
  .filter(Boolean)
  .map((t) => String(t).slice(0, 2000));

const THEME_SLUGS = SHEETS.map((s) => s.theme);
const sheetPaths = [];
for (let i = 0; i < images.length; i++) {
  const img = images[i];
  const themeHint = THEME_SLUGS[i] || `sheet-${i + 1}`;
  const rawName = String(img.name || `${themeHint}.png`);
  const safe = rawName.replace(/[^\w.\-]+/g, '_');
  const destName = `${String(i + 1).padStart(2, '0')}-${themeHint}-${safe.endsWith('.png') || /\.jpe?g$/i.test(safe) ? safe : `${safe}.png`}`;
  const dest = path.join(OUT_DIR, destName);
  try {
    const bytes = await download(img.url, dest);
    sheetPaths.push({ path: dest, bytes, name: img.name, theme: themeHint });
    console.error(`Downloaded ${dest} (${bytes} bytes)`);
  } catch (e) {
    console.error(`Download failed ${img.name}: ${e.message}`);
  }
}
dump.sheets_downloaded = sheetPaths;
dump.png_count = sheetPaths.filter((s) => /\.png$/i.test(s.path)).length;
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));

if (dump.png_count < 11) {
  console.error(`INCOMPLETE: only ${dump.png_count}/11 PNGs — will need re-fetch or follow-up`);
}

console.log(JSON.stringify({
  phase: 'done',
  task_id: created.task_id,
  task_url: dump.task_url,
  credit_usage: dump.poll.credit_usage,
  agent_status: dump.poll.agent_status,
  image_count: images.length,
  png_count: dump.png_count,
  sheets: sheetPaths,
  out_dir: OUT_DIR,
  complete: dump.png_count >= 11,
}, null, 2));
