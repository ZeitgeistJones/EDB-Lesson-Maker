/**
 * BG wave4 autumn sheet mop — nudge existing task for missing sheet 4 only.
 * weather-autumn-a / weather-autumn-b panels were never delivered.
 *
 *   node scripts/manus/request-bg-cards-wave4-autumn-nudge.mjs --nudge
 *   node scripts/manus/request-bg-cards-wave4-autumn-nudge.mjs --poll-only
 *   node scripts/manus/request-bg-cards-wave4-autumn-nudge.mjs --nudge --poll-only
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 35 * 60 * 1000;
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-bg-stockpile');
const WAVE_ID = 'wave4';
const OUT_DIR = path.join(STOCKPILE, WAVE_ID);
const SHEET_DIR = path.join(OUT_DIR, 'sheets');
const RUN_JSON = path.join(OUT_DIR, 'run.json');

const NUDGE = withEslAssetGeneratorBrief(`Continue THIS BG wave4 task. Sheets 1–3 are done.

You still owe **SHEET 4 ONLY** — exact 2×2 grid (4 landscape panels), reading order left→right, top→bottom:
1. weather-autumn-a — orange autumn wash, tiny leaf corner, centre empty
2. weather-autumn-b — same hue, tiny acorn corner glyph, centre empty
INCOMPLETE SHEET: only cells 1-2 have panels. Leave cells 3-4 blank white empty (no art, no fillers).

Quiet ESL lesson flat style (same as prior sheets). quality: default only.
Fire generate_image for sheet 4 now. Return 1 PNG.`);

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

async function downloadNewSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const existing = new Set(fs.readdirSync(sheetDir).filter((n) => /\.png$/i.test(n)));
  const seen = new Set();
  const saved = [];
  let i = existing.size;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
    if (fs.existsSync(dest)) continue;
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    saved.push({ dest, bytes: buf.length, name: img.name, file: path.basename(dest) });
  }
  return saved;
}

apiKey();
if (!fs.existsSync(RUN_JSON)) throw new Error(`Missing ${RUN_JSON}`);
const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
const taskId = arg('task') || prev.task_id;
if (!taskId) throw new Error('No task_id in run.json');

const nudgeOnly = process.argv.includes('--nudge');
const pollOnly = process.argv.includes('--poll-only');

if (nudgeOnly) {
  await sendMessage(taskId, { force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR], message: NUDGE });
  console.log(JSON.stringify({ phase: 'nudged', task_id: taskId, task_url: prev.task_url }, null, 2));
  if (!pollOnly) process.exit(0);
}

const result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
const msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
const saved = await downloadNewSheets(msgs.messages || [], SHEET_DIR);
const sheetCount = fs.readdirSync(SHEET_DIR).filter((n) => /\.png$/i.test(n)).length;

prev.saved = [...(prev.saved || []), ...saved];
prev.agent_status = result && result.agent_status;
prev.finished_at = sheetCount >= 4 ? new Date().toISOString() : prev.finished_at;
fs.writeFileSync(RUN_JSON, JSON.stringify(prev, null, 2));

console.log(
  JSON.stringify(
    {
      phase: sheetCount >= 4 ? 'downloaded' : 'partial',
      wave: WAVE_ID,
      task_id: taskId,
      task_url: prev.task_url,
      new_sheets: saved.length,
      total_sheets: sheetCount,
      need: 4,
    },
    null,
    2,
  ),
);
if (sheetCount < 4) process.exit(2);
