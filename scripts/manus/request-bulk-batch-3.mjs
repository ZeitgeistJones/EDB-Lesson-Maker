/**
 * Bulk Manus asset batch 3 — object leftover gaps + denser jobs people (coach).
 * Pattern: tmp/manus-asset-batch-api*-run.mjs
 *
 *   node scripts/manus/request-bulk-batch-3.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-asset-batch-api-3');
const OUT_JSON = path.join(OUT_DIR, 'run.json');
const POLL_MS = 30_000;
const TIMEOUT_MS = 45 * 60 * 1000;

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce flat-vector ESL teaching assets as black-field contact sheets. I cut each object/person out for ClassIn lesson boards.

DON'T HYPERFIXATE: self-check tiles against the rules, but if one or two won't come out clean after a try or two, SKIP them and deliver the rest. Never pad with duplicates or off-theme fillers. A short sheet of distinct props is fine.

HARD STYLE (all sheets):
- Pure solid #000000 field edge-to-edge. True even grid. One subject per cell, ~8% margin, nothing crossing borders.
- Flat educational / matte 2-tone vector (base + one shade). NOT glossy emoji, NOT photo, NOT grey cards behind objects.
- ZERO text/letters/numbers/logos/brand marks on any tile. Kid-safe.
- Use quality: default only (never high). Prefer 4×8 when default still keys; else 4×4. Cost ceiling: ≤3 generate_image calls for this 11-sheet pack (5+5+1).

SHEETS (11 total — deliver each as its own PNG):

SHEET A — JOBS / COMMUNITY HELPERS PEOPLE (denser cells; NOT tiny stamps)
- Grid: **4×4 (16)** or **3×4 (12)** max — bigger cells so faces/bodies read.
- Every cell is a standing PERSON figure in uniform (full body or 3/4). Never tools alone.
- MUST include a distinct **coach** (sports coach with cap; whistle may hang on lanyard as accessory — NOT classroom teacher, NOT whistle/clipboard alone).
- Also include high-value people as natural: teacher, doctor, nurse, firefighter, pilot, chef, police officer, construction worker, scientist, mail carrier, vet, dentist, bus driver, librarian (pick ≤16 distinct).
- Aim flat educational matching house job-* cutouts, but accept soft-3D drift on people — do NOT repair/regen this sheet for flatness.

SHEETS B–K — OBJECT leftover / gap fills (default **4 columns × 8 rows = 32** when you have 32 DISTINCT props; otherwise **4×4 = 16** — never pad):
B. bathroom toiletries LEFTOVERS — thicker/cleaner shampoo bottle, toilet brush, dental-floss box, mouthwash, loofah, bathrobe, scale, plunger, soap dispenser, trash can, towel rack, etc. (kid-safe, non-gross; objects only)
C. bags & accessories LEFTOVERS — tote, satchel, luggage tag, umbrella, coin purse, passport holder, lunch tote, rolling suitcase, drawstring bag, shopping tote, etc. (no brand logos; objects only)
D. office stationery LEFTOVERS — binder, hole punch, desk organizer, shredder, whiteboard eraser (blank), name-badge blank, inbox tray, push-pin cluster as ONE object, stamp pad, fountain pen, etc. (no readable text)
E. art & craft LEFTOVERS — hole punch craft, brayer, cutting mat (blank), washi tape roll (no patterns/text), pipe cleaners bundle, pom-poms bowl, googly-eyes pack (no text), craft knife SAFETY kid scissors only, hot-glue gun unplugged, sequin jar (opaque), etc.
F. clinic / community place exteriors — matte clinic/medical-office building (NOT pharmacy), post office, bus stop shelter, market stall, fire station, police station, library exterior, school exterior (buildings/places only; no people; no readable signs)
G. soccer / sports dock props — soccer goal (post+net), corner flag, coach clipboard blank, cones, pinnies/bibs, water bottle, medal, trophy, stopwatch blank face, etc. (objects; NO people on this sheet)
H. kid-safe drinks ONLY — mug, juice box, water bottle, smoothie cup, milk carton, thermos, soda can (generic), straw, pitcher, teacup — NO wine/beer/martini/champagne/alcohol silhouettes
I. dental / sweets roleplay objects — toothbrush, toothpaste, floss, oversized tooth model, lollipop, cookie, candy cane, apple, milk carton, dental mirror tool (kid-safe; objects only)
J. feelings face extras (flat vocab style) — excited, tired, proud, shy, confused, bored, surprised, calm, brave, worried, silly, grateful (simple face icons OR face cards; no body; no text labels on art). Accept soft-3D drift — do NOT repair/regen face sheets for flatness.
K. white-key health / first-aid extras (objects, not people) — bandage roll, ice pack, thermometer, crutches, sling, first-aid kit, wheelchair, clinic clipboard blank, medicine bottle opaque generic, tissue box plain (no brands; no gore)

When done, return the PNG sheets with a short legend per sheet in chat (cell names only — not painted on art). No long essay.`);

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
console.error(`Creating asset batch 3… profile=${profile}`);

const created = await createTask({
  title: 'ESL asset batch 3: leftovers + jobs people/coach',
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
    { id: 'A', theme: 'jobs-people', grid: '4x4 (or 3x4)', notes: 'MUST coach person; accept soft-3D; no people regen' },
    { id: 'B', theme: 'bathroom-leftovers', grid: '4x8 or 4x4' },
    { id: 'C', theme: 'bags-leftovers', grid: '4x8 or 4x4' },
    { id: 'D', theme: 'office-leftovers', grid: '4x8 or 4x4' },
    { id: 'E', theme: 'art-craft-leftovers', grid: '4x8 or 4x4' },
    { id: 'F', theme: 'clinic-community-places', grid: '4x8 or 4x4' },
    { id: 'G', theme: 'soccer-sports-dock', grid: '4x8 or 4x4' },
    { id: 'H', theme: 'kid-safe-drinks', grid: '4x8 or 4x4' },
    { id: 'I', theme: 'dental-sweets', grid: '4x8 or 4x4' },
    { id: 'J', theme: 'feelings-face-extras', grid: '4x8 or 4x4' },
    { id: 'K', theme: 'health-first-aid-extras', grid: '4x8 or 4x4' },
  ],
  brief_starts_with: BRIEF.slice(0, 160),
  prior_related: {
    coach_only_task: 'hnGqvrq38ZJV3287uWRRbh',
    batch1: 'maRhLcQHcBSoULpRBzpHM4',
    batch2: 'Mmx2VFmqpebVkNMr9cnPz7',
  },
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url || ''}`);
console.log(JSON.stringify({
  phase: 'created',
  task_id: created.task_id,
  task_url: dump.task_url,
  agent_profile: profile,
  theme_count: dump.themes.length,
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

const notes = [
  '# Batch 3 staging notes',
  '',
  '**Do not half-wire manifest without keyed PNGs + QA.**',
  '',
  `- task_id: \`${created.task_id}\``,
  `- url: ${dump.task_url}`,
  `- folder: \`tmp/manus-asset-batch-api-3/\``,
  '',
  'Prior coach-only sheet (soft-3D): `tmp/manus/jobs-coach/community_helpers_props.png`',
  'Manifest currently has hollow `job-coach` row without PNG — wait for flatter Sheet A before wiring.',
  '',
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'IMPORT-NOTES.md'), notes);
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
