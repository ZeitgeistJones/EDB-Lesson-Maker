/**
 * Perfect 11-sheet run — CALL 1 ONLY (5 mid-obscure 4×8 sheets).
 * One theme per sheet. quality: default. Do NOT re-run; do NOT fire call 2/3 here.
 *
 * Plan (dino probe already imported = sheet 1 of 11 supply):
 *   Done: dinosaurs
 *   Call 1 (this): circus, carnival, library, post-office, airport
 *   Call 2 (later): pirates, fire-station, volcano-geology, recycling, planetarium
 *
 *   node scripts/manus/request-perfect11-call1-mid-obscure.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-perfect11-call1');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 20_000;
const TIMEOUT_MS = 45 * 60 * 1000;

const CALL1_SHEETS = [
  { id: '1', theme: 'circus', grid: '4x8' },
  { id: '2', theme: 'carnival-fair', grid: '4x8' },
  { id: '3', theme: 'library', grid: '4x8' },
  { id: '4', theme: 'post-office', grid: '4x8' },
  { id: '5', theme: 'airport', grid: '4x8' },
];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce flat-vector ESL teaching assets as black-field contact sheets. I cut each object out for ClassIn lesson boards.

DON'T HYPERFIXATE: self-check tiles against the rules, but if one or two won't come out clean after a try or two, SKIP them and deliver the rest. Never pad with duplicates or off-theme fillers. A short sheet of distinct props is fine.

HARD STYLE (all sheets):
- Pure solid #000000 field edge-to-edge. True even grid. One subject per cell, ~8% margin, nothing crossing borders.
- Flat educational / matte 2-tone vector (base + one shade). NOT glossy emoji, NOT photo, NOT grey cards behind objects.
- ZERO text/letters/numbers/logos/brand marks on any tile. Kid-safe.
- OBJECTS / creatures / place pieces only — NO people figures, NO face-icon sheets, NO people regen.
- Use quality: default only (never high).
- Grid for EVERY sheet in this call: **4 columns × 8 rows = 32** distinct props when you can fill them cleanly; else **4×4 = 16**. Never pad.
- ONE THEME PER SHEET — do not mix topics across cells on the same PNG.
- Deliver each sheet as its own PNG. Cost: this call is exactly 5 sheets (one generate_image batch).

SHEETS (5 total — mid-obscure themes; theme + style + grid only):

SHEET 1 — CIRCUS (4×8)
Kid-safe circus / big-top OBJECT props and set pieces (tent, rings, podium, unicycle, juggling clubs, cannon, etc.). Objects only; no clowns/people.

SHEET 2 — CARNIVAL / FAIR (4×8)
Carnival / fairground OBJECT props (ferris wheel, bumper car, ticket booth blank, popcorn, cotton candy, prize booth pieces, etc.). Objects only; no people.

SHEET 3 — LIBRARY (4×8)
Library OBJECT props (bookshelf, books, bookmark, library card blank, reading lamp, cart, stamp, globe, magazine stack blank covers, etc.). Objects only; no librarian people; no readable text/titles on spines.

SHEET 4 — POST OFFICE (4×8)
Post-office OBJECT props (mailbox, envelopes blank, parcels, stamp pad, scale, mail bag, postbox, labels blank, tape, etc.). Objects only; no mail-carrier people; no readable addresses/logos.

SHEET 5 — AIRPORT (4×8)
Airport OBJECT props (airplane, control tower, suitcase, luggage cart, boarding pass blank, runway cone, jet bridge piece, passport blank no text, etc.). Objects only; no pilot/passenger people; no readable airline brands.

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
    console.error(`REFUSING second Call-1 run — already have task ${prev.task_id}`);
    console.log(JSON.stringify({ phase: 'refused_duplicate', ...prev }, null, 2));
    process.exit(2);
  }
}

const profile = resolveAgentProfile();
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
console.error(`Creating Perfect11 Call 1 (5 mid-obscure sheets)… profile=${profile}`);

const created = await createTask({
  title: 'ESL Perfect11 Call1: circus carnival library post airport',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  hide_in_task_list: false,
  interactive_mode: false,
},);

const dump = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  task_id: created.task_id,
  task_url: created.task_url || (created.task_id ? `https://manus.im/app/${created.task_id}` : null),
  call: 1,
  quality: 'default',
  sheets: CALL1_SHEETS,
  plan_11: [
    { theme: 'dinosaurs', status: 'done-probe-imported', grid: '4x8' },
    ...CALL1_SHEETS.map((s) => ({ ...s, status: 'call1' })),
    { theme: 'pirates', status: 'call2-later', grid: '4x8' },
    { theme: 'fire-station', status: 'call2-later', grid: '4x8' },
    { theme: 'volcano-geology', status: 'call2-later', grid: '4x8' },
    { theme: 'recycling', status: 'call2-later', grid: '4x8' },
    { theme: 'planetarium', status: 'call2-later', grid: '4x8', note: 'swapped for castle (propBank already fat)' },
  ],
  cancelled_patterns: [
    'multi-theme single sheet (jZ7ME45f4o6TW2UCYqdx9x) — wrong pattern, do not import',
    'Jobs/Bathroom/Bags Perfect11 example list — not used',
  ],
  note: 'CALL 1 ONLY — stop for credit OK before call 2',
  brief_starts_with: BRIEF.slice(0, 200),
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({
  phase: 'created',
  task_id: created.task_id,
  task_url: dump.task_url,
  sheets: CALL1_SHEETS,
  out_dir: OUT_DIR,
}, null, 2));

console.error(`Polling every ${POLL_MS / 1000}s…`);
const done = await pollUntilDone(created.task_id, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = {
  agent_status: done.agent_status || done.status,
  credit_usage: done.credit_usage ?? done.credits ?? null,
};
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 120 });
const list = msgs.messages || msgs.data || msgs.items || [];
const images = collectImageAtts(list);
dump.message_count = list.length;
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);
dump.assistant_excerpts = (list || [])
  .filter((m) => m.assistant_message || m.type === 'assistant_message')
  .map((m) => (m.assistant_message && m.assistant_message.content) || '')
  .filter(Boolean)
  .map((t) => String(t).slice(0, 1500));

const sheetPaths = [];
for (let i = 0; i < images.length; i++) {
  const img = images[i];
  const safe = String(img.name || `sheet-${i + 1}.png`).replace(/[^\w.\-]+/g, '_');
  const dest = path.join(
    OUT_DIR,
    `${String(i + 1).padStart(2, '0')}-${safe.endsWith('.png') || /\.jpe?g$/i.test(safe) ? safe : `${safe}.png`}`,
  );
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
  agent_status: dump.poll.agent_status,
  image_count: images.length,
  sheets: sheetPaths,
  call1_themes: CALL1_SHEETS.map((s) => s.theme),
  out_dir: OUT_DIR,
  STOP: 'Await user credit OK before Call 2',
}, null, 2));
