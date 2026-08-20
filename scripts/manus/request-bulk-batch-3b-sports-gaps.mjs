/**
 * Follow-up to batch-3: gap-scan-A sports/playground OBJECT props
 * (climb / net / playground structure / race). Coach people already in batch-3 Sheet A.
 *
 *   node scripts/manus/request-bulk-batch-3b-sports-gaps.mjs
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
const POLL_MS = 20_000;
const TIMEOUT_MS = 30 * 60 * 1000;

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce flat-vector ESL teaching assets as black-field contact sheets. I cut each object out for ClassIn boards.

DON'T HYPERFIXATE: skip stubborn tiles after 1–2 tries; never pad with duplicates or off-theme fillers.

HARD STYLE: pure #000000 field; true even grid; one subject per cell; flat educational 2-tone matte vector (NOT photo, NOT grey cards); ZERO text/logos; kid-safe. Use quality: default only (never high). Prefer 4×8 when default still keys; else 4×4.

CONTEXT: A separate task already covers jobs PEOPLE (incl. coach) + bathroom/bags/office/art leftovers. This task is OBJECT gaps only from a sports/playground scan.

SHEETS (2 PNGs):

SHEET 1 — sports / playground OBJECTS (prefer **4×8 = 32** distinct; else 4×4=16 — never pad)
MUST include these as clear single props (not abstract icons, not people):
1. climb / climbing frame — kid jungle-gym or wall-bars climbable frame (one connected structure)
2. net — soccer goal net OR sports ball net as a readable dock prop (prefer goal with net if distinct from #3)
3. playground structure — compact playground unit (slide+climb frame as ONE prop silhouette, or standalone play structure)
4. race — finish-line banner/tape between two posts OR checkered race flag (concrete object, not abstract "speed")

Also fill remaining cells with high-value related OBJECTS (no people, no deny-metonymy-only tiles):
soccer goal post+net, basketball hoop, tennis net section, cone marker, corner flag, baton/relay stick, starting block, medal, trophy, stopwatch (blank face), whistle (object OK here), water bottle, jump rope, gym mat rolled, balance beam short, seesaw, swing seat, sandbox, spring rider, monkey bars, tunnel tube, trampoline top-down or side, skateboard, scooter, bicycle helmet, knee pads, sports bib/pinnie, scoreboard blank (no numbers/text), ball pump, etc.
Skip practice/effort/teamwork as tiles — those are abstract deny words, not art asks.

SHEET 2 — optional thin top-up if Sheet 1 cannot fit without crowding: gym equipment OBJECTS 4×4 (dumbbell, kettlebell, resistance band, yoga mat, medicine ball, bench, etc.) — only if distinct from Sheet 1; otherwise skip Sheet 2 entirely.

Return PNGs + short cell legends in chat (not painted on art). No long essay.`);

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
console.error(`Creating sports-gap batch 3b… profile=${profile}`);

const created = await createTask({
  title: 'ESL batch 3b: sports/playground object gaps',
  message: BRIEF,
  agent_profile: profile,
  force_skills: force,
  interactive_mode: false,
});

const dump = {
  started_at: new Date().toISOString(),
  agent_profile: profile,
  force_skills: force,
  task_id: created.task_id,
  task_url: created.task_url || (created.task_id ? `https://manus.im/app/${created.task_id}` : null),
  themes: [
    { id: '1', theme: 'sports-playground-objects', grid: '4x8 (or 4x4)', must: ['climb', 'net', 'playground', 'race'] },
    { id: '2', theme: 'gym-equipment-optional', grid: '4x4', optional: true },
  ],
  related: {
    batch3_jobs_coach_and_leftovers: 'MLemmPsjEFj4kwwt4H6h2f',
    gap_scan: 'tmp/gap-scan-A-sports-jobs.json',
  },
  note: 'Coach PERSON is in batch-3 Sheet A — not re-requested here.',
};
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
console.error(`Task ${created.task_id}\n${dump.task_url}`);
console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));

const done = await pollUntilDone(created.task_id, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status };
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(created.task_id, { order: 'asc', limit: 100 });
const list = msgs.messages || [];
const images = collectImageAtts(list);
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
fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, 'IMPORT-NOTES.md'),
  [
    '# Batch 3b sports/playground gaps',
    '',
    '**Do not half-wire manifest.**',
    '',
    `- task: ${dump.task_url}`,
    '- must art: climb frame, net, playground structure, race finish-line/flag',
    '- coach person: see batch-3 MLemmPsjEFj4kwwt4H6h2f Sheet A',
    '',
  ].join('\n'),
);

console.log(JSON.stringify({
  ok: true,
  task_id: created.task_id,
  task_url: dump.task_url,
  status: dump.poll.agent_status,
  image_count: images.length,
  downloaded: downloaded.length,
  out_dir: OUT_DIR,
}, null, 2));
