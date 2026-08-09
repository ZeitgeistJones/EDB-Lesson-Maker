/**
 * Bulk Manus batch 3b — gap-scan A sports objects + gap-scan B cafe/food art.
 * Companion to batch 3 (MLemm…); does not redo bathroom/office leftovers.
 *
 *   node scripts/manus/request-bulk-batch-3b.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-asset-batch-api-3b');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 30_000;
const TIMEOUT_MS = 45 * 60 * 1000;

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce flat-vector ESL teaching assets as black-field contact sheets. I cut each object/person out for ClassIn lesson boards.

DON'T HYPERFIXATE: self-check tiles; if one or two won't come clean after a try or two, SKIP and deliver the rest. Never pad with duplicates or off-theme fillers.

HARD STYLE (all sheets):
- Pure solid #000000 field. True even grid. One subject per cell, ~8% margin, nothing crossing borders.
- Flat educational / matte 2-tone vector (base + one shade). NOT soft-3D, NOT glossy emoji, NOT photo, NOT grey cards behind objects.
- ZERO text/letters/numbers/logos/brand marks. Kid-safe.
- Prefer quality="high" + nano-banana-pro/2 on tall 9:16 (long side ≥4096) for 4×8 so tiles stay ~512px+.
- Default grid: **4 columns × 8 rows (32)** when you have 32 DISTINCT props; else **4×4 (16)**. People sheets use denser cells (4×4 / 3×4).

SHEETS (deliver each as its own PNG):

SHEET 1 — CAFE / RESTAURANT PEOPLE (denser cells)
- Grid: **4×4 or 3×4** (bigger cells so faces/bodies read).
- Every cell is a standing PERSON in uniform (full body or 3/4). Not tools alone.
- MUST include distinct: **waiter**, **waitress**, **barista** (apron + coffee cup/portafilter OK as accessories — person must dominate).
- Fill remaining cells with high-value food-service people if natural: chef (if distinct from our house job-chef), host/hostess, baker, server with tray, sommelier SKIP (alcohol), busboy/runner, ice-cream scooper, pizza maker, sushi chef kid-safe, etc. (≤16; no alcohol props).

SHEET 2 — JOBS PEOPLE TOP-UP (denser; includes coach)
- Grid: **4×4**.
- Standing PERSON figures only. Flat educational (reject soft-3D).
- MUST include distinct **coach** (sports coach with cap; whistle-on-lanyard OK as accessory — NOT teacher, NOT whistle alone).
- Also: teacher, doctor, nurse, firefighter, pilot, chef, police, construction worker, scientist, mail carrier, vet, dentist, bus driver, librarian as fit (≤16).

SHEET 3 — CAFE / BAKERY FOOD OBJECTS (4×8 preferred)
MUST include as clear single props: **croissant**, **pastry** (danish/turnover distinct from croissant), **latte** (cup with latte art foam — no text), **fridge** (closed kitchen refrigerator).
Also fill with DISTINCT cafe objects (no alcohol): muffin, bagel, sandwich, cake slice, cookie, sugar jar (no text), takeout cup+lid, takeout bag, cafe counter segment as ONE object, menu board blank (no readable text), spoon, teaspoon, napkin dispenser, pastry tongs, cake stand, milk pitcher, syrup bottle opaque generic, biscotti, donut, tart, éclair, scone, butter packet, jam jar, etc.
SKIP commissioning abstract service words as props: order, tip, reservation, appetizer (do not invent tokens/glyphs for those).

SHEET 4 — SPORTS / PLAYGROUND OBJECT GAPS (4×8 preferred)
MUST include as single readable props (not abstract icons):
- **climb** → climbable frame / jungle-gym climbing frame (one structure)
- **net** → soccer net / goal-with-net (post+net as ONE prop) — distinct from basketball hoop if both appear
- **playground** → playground structure (slide+frame or multi-play unit as ONE prop silhouette)
- **race** → finish-line tape between two posts OR checkered race flag on pole (concrete, not abstract "speed" lines)
Also fill: corner flag, cones, pinnies, water bottle, medal, trophy, stopwatch blank, basketball hoop, baseball glove, jump rope, gym mat rolled, balance beam segment, etc. OBJECTS only — no people on this sheet.
Do NOT make props for deny/abstract coaching words: practice, effort, teamwork.

SHEET 5 — KITCHEN APPLIANCES / CAFE HARDWARE leftovers (4×8 or 4×4)
Closed fridge (if not already strong on Sheet 3 — prefer variety: mini-fridge, display fridge), espresso machine (generic, no brand), blender, toaster, microwave, oven mitt, mixing bowl, whisk, rolling pin, cutting board, etc. Objects only. No brand logos. No knives that look like art palette knives.

When done, return PNG sheets + short chat legend per sheet (names only, not painted on art). No long essay.`);

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
const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
console.error(`Creating asset batch 3b… profile=${profile}`);

const created = await createTask({
  title: 'ESL asset batch 3b: food people/objects + sports gaps + coach',
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
  themes: [
    { id: '1', theme: 'cafe-restaurant-people', grid: '4x4/3x4', must: ['waiter', 'waitress', 'barista'] },
    { id: '2', theme: 'jobs-people-coach', grid: '4x4', must: ['coach'] },
    { id: '3', theme: 'cafe-bakery-food-objects', grid: '4x8', must: ['croissant', 'pastry', 'latte', 'fridge'] },
    { id: '4', theme: 'sports-playground-object-gaps', grid: '4x8', must: ['climb', 'net', 'playground', 'race'] },
    { id: '5', theme: 'kitchen-cafe-hardware', grid: '4x8 or 4x4' },
  ],
  skip_reason: {
    abstracts: ['order', 'tip', 'reservation', 'appetizer', 'practice', 'effort', 'teamwork'],
    alias_only: ['espresso', 'soda', 'salt'],
    producer_not_manus: ['cream→tile', 'knife→palette', 'athletic/gym→basketball'],
  },
  companion_to: 'MLemmPsjEFj4kwwt4H6h2f',
  brief_starts_with: BRIEF.slice(0, 160),
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({
  phase: 'created',
  task_id: created.task_id,
  task_url: dump.task_url,
  theme_count: dump.themes.length,
  out_dir: OUT_DIR,
}, null, 2));

console.error(`Polling every ${POLL_MS / 1000}s…`);
const done = await pollUntilDone(created.task_id, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status };
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 100 });
const list = msgs.messages || [];
const images = collectImageAtts(list);
dump.message_count = list.length;
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);

const downloaded = [];
for (let i = 0; i < images.length; i++) {
  const safe = String(images[i].name).replace(/[^\w.\-]+/g, '_').slice(0, 80) || `sheet-${i}.png`;
  const dest = path.join(OUT_DIR, `${String(i + 1).padStart(2, '0')}-${safe}`);
  try {
    const bytes = await download(images[i].url, dest);
    downloaded.push({ name: safe, bytes, path: dest });
    console.error(`Downloaded ${safe} (${bytes} bytes)`);
  } catch (err) {
    downloaded.push({ name: safe, error: String(err.message || err) });
  }
}
dump.downloaded = downloaded;
fs.writeFileSync(path.join(OUT_DIR, 'IMPORT-NOTES.md'), [
  '# Batch 3b staging',
  '',
  '**Do not half-wire manifest without keyed PNGs + QA.**',
  '',
  `- task: ${dump.task_url}`,
  `- folder: tmp/manus-asset-batch-api-3b/`,
  `- companion batch-3: https://manus.im/app/MLemmPsjEFj4kwwt4H6h2f`,
  '',
].join('\n'));
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.log(JSON.stringify({
  ok: true,
  task_id: created.task_id,
  task_url: dump.task_url,
  status: dump.poll.agent_status,
  image_count: images.length,
  downloaded: downloaded.length,
  out_dir: OUT_DIR,
}, null, 2));
