/**
 * Perfect 11-sheet run — CALL 2 (5 mid-obscure 4×8 sheets).
 * One theme per sheet. quality: default. Do NOT re-run.
 *
 *   node scripts/manus/request-perfect11-call2-mid-obscure.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-perfect11-call2');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 20_000;
const TIMEOUT_MS = 45 * 60 * 1000;

const CALL2_SHEETS = [
  { id: '6', theme: 'pirates', grid: '4x8' },
  { id: '7', theme: 'fire-station', grid: '4x8' },
  { id: '8', theme: 'volcano-geology', grid: '4x8' },
  { id: '9', theme: 'recycling-eco', grid: '4x8' },
  { id: '10', theme: 'planetarium', grid: '4x8' },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce flat-vector ESL teaching assets as black-field contact sheets. I cut each object out for ClassIn lesson boards.

DON'T HYPERFIXATE: self-check tiles against the rules, but if one or two won't come out clean after a try or two, SKIP them and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets) — Call 1 FAILED these; do not repeat:
- Canvas MUST be PORTRAIT (~9:16), NOT square. Target ~1536×2752 (or similar tall). Square 2048×2048 / 6×6 grids are REJECTED.
- Pure solid #000000 field edge-to-edge (NOT white cells, NOT grey cards). True even grid. One subject per cell, ~8% margin, nothing crossing borders.
- Flat educational / matte 2-tone vector (base + one shade). NOT glossy emoji, NOT photo.
- ZERO text/letters/numbers/logos/brand marks painted on any tile (legends go in chat only). Kid-safe.
- OBJECTS / creatures / place pieces only — NO people figures, NO face-icon sheets, NO people regen.
- Use quality: default only (never high).
- Grid for EVERY sheet: **4 columns × 8 rows = 32** (import uses --grid=8x4). Else **4×4 = 16**. Never pad; never 6×6.
- ONE THEME PER SHEET — do not mix topics on the same PNG.
- This call is exactly 5 sheets (one generate_image batch). Deliver each as its own PNG.

SHEETS (5 — mid-obscure; theme + style + grid only):

SHEET 6 — PIRATES (4×8)
Pirate / treasure-island OBJECT props (ship wheel, treasure chest, pirate hat, hook, spyglass, anchor, map blank, flag blank, cannon, compass, etc.). Objects only; no pirate people.

SHEET 7 — FIRE STATION (4×8)
Fire-station OBJECT / vehicle / tool props (fire truck, hydrant, hose, extinguisher, ladder, helmet object alone OK, axe, boots, alarm bell, pole, etc.). Objects only; no firefighter people.

SHEET 8 — VOLCANO / GEOLOGY (4×8)
Volcano / geology OBJECT props (volcano, lava rock, crystal, fossil, geode, magma chunk, mountain peak, ash cloud blob, pickaxe, sample bag, etc.). Objects only; no people.

SHEET 9 — RECYCLING / ECO (4×8)
Recycling / eco OBJECT props (recycle bins by color, bottles, cans, newspaper bundle, compost bin, recycling symbol as object, cardboard stack, sorting crate, etc.). Objects only; no people; no readable brand labels.

SHEET 10 — PLANETARIUM (4×8)
Planetarium / space-show OBJECT props (dome exterior/interior piece, projector, constellation card blank, telescope, planet models, comet, moon, seat, ticket blank, solar-system mobile piece, etc.). Objects only; no people; no readable text.

When done, return the 5 PNG sheets with a short legend per sheet in chat (cell names only — not painted on art). No long essay. Do NOT regenerate whole sheets for minor tile flaws.`);

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
    console.error(`REFUSING second Call-2 run — already have task ${prev.task_id}`);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
console.error(`Creating Perfect11 Call 2 (5 sheets)… profile=${profile}`);

const created = await createTask({
  title: 'ESL Perfect11 Call2: pirates fire volcano recycling planetarium',
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
  call: 2,
  quality: 'default',
  sheets: CALL2_SHEETS,
  note: 'Call 2 of 5+5+1 — Call 3 still required before done',
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({ phase: 'created', task_id: created.task_id, task_url: dump.task_url, sheets: CALL2_SHEETS }, null, 2));

const done = await pollUntilDone(created.task_id, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status, credit_usage: done.credit_usage ?? done.credits ?? null };
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 120 });
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
  NEXT: 'Call 3 required (1 sheet) — do not mark Perfect-11 done yet',
}, null, 2));
