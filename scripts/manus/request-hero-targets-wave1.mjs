/**
 * Hero / interactive-target stockpile wave 1 — medium size (calibration lock).
 * 4 black-field 4×4 sheets → 50 assets (20 pairs + 10 singles).
 *
 *   node scripts/manus/request-hero-targets-wave1.mjs
 *   node scripts/manus/request-hero-targets-wave1.mjs --poll-only --task=<id>
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';
import { PAIRS, SINGLES, SHEETS } from './hero-targets-wave1-keys.mjs';

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-hero-targets-wave1');
const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const NEED_SHEETS = 4;

function pairLines(slice, startIndex) {
  const lines = [];
  let n = startIndex;
  for (const p of slice) {
    lines.push(`${n}. hero-${p.slug}-closed — ${p.closed}`);
    n += 1;
    lines.push(`${n}. hero-${p.slug}-open — ${p.open}`);
    n += 1;
  }
  return lines.join('\n');
}

function singleLines(slice, startIndex) {
  return slice.map((s, i) => `${startIndex + i}. hero-${s.slug} — ${s.brief}`).join('\n');
}

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **4 black-field 4×4 contact sheets** of MEDIUM HERO play-surface props for ClassIn ESL boards.

These are LARGE interactive targets kids drag toys onto/into — not postage-stamp dock icons.
Do NOT copy the existing small hide-reveal pack. Draw them as hero-stage cutouts.

SIZE (locked — do not invent another %):
- Each object fills about **70–80% of its cell** (medium hero). Generous but not edge-to-edge.
- Bottom-resting. Clear black margin. One object per cell. Nothing crossing gutters.

HARD FIELD RULES:
- Pure #000000 black edge to edge. No white plates, no grey cards, no labels on the art.
- Soft matte educational cutouts. quality: default only.
- NO readable text, NO logos, NO watermarks.
- Object bodies must be clearly colored (not near-black, not ghost-gray) so they survive a black-key.

OPEN / EMPTY INTERIORS (critical):
- Cavities must be **mid-tone**: walnut brown, teal, charcoal, kraft — NEVER white, cream, pale gray, or pure black.
- White interiors get deleted. Black interiors punch a hole. Mid-tone hollows stay.

PAIR SWAP RULE (cells come in closed then open):
- SAME object, SAME viewpoint, SAME scale, SAME ground line, SAME colors.
- Only the opening mechanism changes (lid / door / zipper / curtain / flap).
- Open state is EMPTY — a play cavity, not a cluttered interior.

NO people on sheets 1–3 except the listed monster/animal mouths (cute, not scary).
Sheet 4 is the blank face + dress-up body only.

READING ORDER left→right, top→bottom on every sheet.

SHEET 1 (16 cells) — pairs 1–8:
${pairLines(PAIRS.slice(0, 8), 1)}

SHEET 2 (16 cells) — pairs 9–16:
${pairLines(PAIRS.slice(8, 16), 1)}

SHEET 3 (16 cells) — pairs 17–20 then singles 1–8:
${pairLines(PAIRS.slice(16, 20), 1)}
${singleLines(SINGLES.slice(0, 8), 9)}

SHEET 4 (16 cells) — last 2 singles in cells 1–2; cells 3–16 EMPTY black:
${singleLines(SINGLES.slice(8, 10), 1)}

Return exactly 4 PNG sheets. Keep generating inside THIS task until all 4 exist (5-image cap is per generate_image call, not per task).`);

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

async function downloadSheets(messages) {
  const sheetDir = path.join(OUT_DIR, 'sheets');
  fs.mkdirSync(sheetDir, { recursive: true });
  for (const f of fs.readdirSync(sheetDir).filter((n) => /\.png$/i.test(n))) {
    fs.unlinkSync(path.join(sheetDir, f));
  }
  const seen = new Set();
  const saved = [];
  let i = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    saved.push({ dest, bytes: buf.length, name: img.name });
  }
  return saved;
}

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify({ pairs: PAIRS.map((p) => p.slug), singles: SINGLES.map((s) => s.slug), sheets: SHEETS }, null, 2)
);

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'hero-targets-wave1' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const created = await createTask({
    title: 'ESL hero targets wave1 — 20 pairs + 10 play surfaces (medium)',
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
} else if (!taskId) {
  throw new Error('--poll-only needs --task=');
}

let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
let saved = await downloadSheets(msgs.messages || []);
const large = saved.filter((s) => s.bytes > 80_000);

if (large.length < NEED_SHEETS) {
  console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
  await sendMessage(taskId, {
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    message: withEslAssetGeneratorBrief(
      `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} black-field 4×4 sheets listed in the original brief (Sheet 1–4). Fire remaining generate_image calls now. Do not restart. Do not change the cell lists.`
    ),
  });
  result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  saved = await downloadSheets(msgs.messages || []);
}

dump.saved = saved;
dump.agent_status = result && result.agent_status;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length, large: saved.filter((s) => s.bytes > 80_000).length }, null, 2));
if (saved.filter((s) => s.bytes > 80_000).length < NEED_SHEETS) process.exit(2);
