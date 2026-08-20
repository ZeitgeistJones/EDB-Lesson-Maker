/**
 * Redo Leo neutral + happy sheets on pure black only (no white→black convert).
 * Worried sheet from the first pass was already black-field OK.
 *
 *   node scripts/manus/request-story-cast-leo-neutral-happy-redo.mjs
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
  fileContentPart,
  apiKey,
} from './client.mjs';

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-cast-leo-pilot', 'redo-neutral-happy');
const REFS = [
  path.join(ROOT, 'public/assets/09_props/img/family-boy.png'),
  path.join(ROOT, 'tmp/manus-story-cast-leo-pilot/sheets/03-leo_worried.png'),
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Re-do ONLY two Leo contact sheets that were wrongly drawn on WHITE. Output must be PURE BLACK field from the start.

ATTACHED:
1. family-boy.png — Leo identity lock (copy exactly)
2. leo_worried.png — CORRECT format example: pure #000000 black field 3×3 with Leo cutouts (match THIS field style, not white)

FAILURE TO AVOID: Do NOT put Leo on white / cream / light panels. The previous neutral+happy sheets were rejected for white fields.

IDENTITY LOCK (Leo — identical every cell):
- Boy ~5–7; warm tan skin; large dark brown eyes; messy dark brown hair with soft forward spikes.
- Medium-blue short-sleeve tee with small left-chest pocket (viewer’s right).
- Khaki/beige cargo shorts; white socks; dark blue sneakers with white laces/toe/soles.
- Soft matte educational style; soft upper-left light; no thick outlines; not photoreal.
- Full body; feet on clear bottom line; viewer-RIGHT bias.
- HOLD: empty hands around empty holding space — NO object/placeholder.

PURE BLACK (non-negotiable):
- Whole sheet + every cell interior = solid #000000 black.
- No white plates, cards, or light backdrops behind Leo.
- True even 3×3; cells 8–9 empty solid black; no labels on art.
- quality: default only.

SHEETS (exactly 2 PNGs), pose order cells 1–7:
idle, hold (empty hands), walk, talk, sit (no chair), listen, reach; 8–9 empty black.

SHEET 1 — NEUTRAL face — all 7 poses — filename leo_neutral_black
SHEET 2 — HAPPY face (bright smile) — same 7 poses — filename leo_happy_black — STILL PURE BLACK

Return 2 PNGs only.`);

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
const profile = resolveAgentProfile();
const content = [{ type: 'text', text: BRIEF }];
for (const ref of REFS) {
  if (!fs.existsSync(ref)) throw new Error(`missing ${ref}`);
  const part = await fileContentPart(ref);
  content.push({
    type: 'file',
    filename: part.filename,
    ...(part.file_data ? { file_data: part.file_data } : { file_id: part.file_id }),
  });
}

const created = await createTask({
  title: 'ESL Leo cast redo — neutral+happy BLACK field only',
  agent_profile: profile,
  force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
  interactive_mode: false,
  message: { content },
});

const dump = {
  started_at: new Date().toISOString(),
  task_id: created.task_id,
  task_url: created.task_url || `https://manus.im/app/${created.task_id}`,
  note: 'redo white-field neutral+happy; no convert',
};
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.error(`Task ${dump.task_id}\n${dump.task_url}`);

const done = await pollUntilDone(created.task_id, { intervalMs: 15_000, timeoutMs: 30 * 60 * 1000 });
dump.poll = { agent_status: done.agent_status || done.status };
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 100 });
const images = collectImageAtts(msgs.messages || []);
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
const saved = [];
let i = 0;
for (const img of images) {
  i += 1;
  const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}-${path.basename(img.name)}`);
  const bytes = await download(img.url, dest);
  saved.push({ dest: path.relative(ROOT, dest), bytes, name: img.name });
  console.error(`saved ${dest}`);
}
dump.saved = saved;
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', ...dump }, null, 2));
if (saved.length < 2) process.exit(2);
