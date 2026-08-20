/**
 * Story-env Manus wave — 20 reusable stage/environment cutouts from stress-test demand.
 * Black-field PropBank pieces (no cast, no action poses). Behind/under actors.
 *
 *   node scripts/manus/request-story-env-wave1.mjs
 *   node scripts/manus/request-story-env-wave1.mjs --poll-only --task=<id>
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-env-wave1');
const POLL_MS = 20_000;
const TIMEOUT_MS = 50 * 60 * 1000;

/** Final PropBank keys — one strong reusable piece each. */
const ENV_KEYS = [
  // Sheet 1 — 4×3
  {
    key: 'story-env-classroom',
    label: 'classroom zone',
    brief: 'wide low classroom strip: blank chalkboard + teacher desk silhouette only, empty floor band, no kids no text',
  },
  {
    key: 'story-env-home',
    label: 'home / living-room zone',
    brief: 'wide living-room strip: sofa + low table silhouette, empty floor, no people no TV logos',
  },
  {
    key: 'story-env-bedroom',
    label: 'bedroom zone',
    brief: 'wide bedroom strip: bed + nightstand silhouette, empty floor, no people no posters text',
  },
  {
    key: 'story-env-closet',
    label: 'closet / wardrobe zone',
    brief: 'open wardrobe/closet strip with hanging empty clothes shapes + shelf, no people',
  },
  {
    key: 'story-env-basketball-court',
    label: 'basketball court strip',
    brief: 'short basketball court floor strip with painted lines + half hoop silhouette at back — no players no scoreboard numbers',
  },
  {
    key: 'story-env-soccer-field',
    label: 'soccer field strip',
    brief: 'short soccer turf strip with goal frame silhouette — no players no ball no text',
  },
  {
    key: 'story-env-grass-field',
    label: 'generic grass field strip',
    brief: 'simple green grass / meadow ground strip with soft horizon, no buildings no animals',
  },
  {
    key: 'story-env-pool-edge',
    label: 'swimming pool edge / lane zone',
    brief: 'pool edge + blue water lane strip with lane ropes, no swimmers no text',
  },
  {
    key: 'story-env-construction',
    label: 'construction site zone',
    brief: 'construction site strip: barrier cones + unfinished wall / scaffolding silhouette, no workers',
  },
  {
    key: 'story-env-zoo',
    label: 'zoo enclosure / habitat zone',
    brief: 'zoo enclosure strip: fence + rocks/plants habitat backdrop, no animals no people',
  },
  {
    key: 'story-env-clinic',
    label: 'dentist / clinic zone',
    brief: 'clinic/dentist room strip: exam chair + cabinet silhouette, no people no tools logos',
  },
  {
    key: 'story-env-woods',
    label: 'woods / forest strip',
    brief: 'forest/woods strip: tree trunks + foliage silhouette band, empty path, no animals no people',
  },
  // Sheet 2 — 4×2
  {
    key: 'story-env-airport-counter',
    label: 'airport counter',
    brief: 'airport check-in counter strip (desk + blank screens/panels), no people no logos text',
  },
  {
    key: 'story-env-hotel-lobby',
    label: 'hotel lobby / reception desk',
    brief: 'hotel reception desk strip with blank counter, no people no brand text',
  },
  {
    key: 'story-env-train-platform',
    label: 'train platform',
    brief: 'train platform strip: platform edge + tracks/shelter silhouette, no train cars optional tiny, no people',
  },
  {
    key: 'story-env-train-interior',
    label: 'train interior',
    brief: 'train cabin interior strip: seats row + window band, empty, no people',
  },
  {
    key: 'story-env-bus-interior',
    label: 'bus interior',
    brief: 'bus cabin interior strip: seats + poles, empty, no people',
  },
  {
    key: 'story-env-bus-stop',
    label: 'bus terminal / stop',
    brief: 'bus stop shelter + curb strip, blank sign panel (no letters), no bus required, no people',
  },
  {
    key: 'story-env-ocean',
    label: 'ocean / beach-water strip',
    brief: 'beach/ocean strip: sand band + water waves horizon, no people no boats logos',
  },
  {
    key: 'story-env-pasture',
    label: 'pasture / farm-field strip',
    brief: 'farm pasture strip: grass + fence line + soft hills, no animals no people',
  },
];

const SHEET1 = ENV_KEYS.slice(0, 12);
const SHEET2 = ENV_KEYS.slice(12, 20);

function sheetList(items) {
  return items.map((it, i) => `${i + 1}. ${it.key} — ${it.brief}`).join('\n');
}

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **2 black-field contact sheets** of reusable ESL **story environment / stage strips** for ClassIn PropBank cutouts (09_props).

These are MID-GROUND stage pieces that sit BEHIND kid cast cutouts — NOT full-page backgrounds, NOT story stills, NOT vocab icons.

HARD RULES (every cell):
- Pure #000000 black background edge to edge (no grey cards, no frames, no cell borders, no labels painted on art).
- Soft matte educational illustration (house prop style): muted palette, gentle shading, soft upper-left light — NOT photoreal, NOT glossy 3D, NOT thick comic outlines.
- NO characters, people, animals, faces, hands.
- NO text, letters, numbers, logos, brands, scoreboards with digits.
- NO story-specific props kids would drag (no soccer ball, no suitcase, no toothbrush) — only the place/furniture strip itself.
- Each cell = ONE environment piece, wide LOW silhouette (fills most of cell WIDTH, sits on the BOTTOM of the cell like a stage strip, generous black margin above).
- Clear silhouette readable at small size; simple enough to combine with cast + handheld props later.
- quality: default ONLY (never high).

SHEET 1 — exact **4×3** grid (12 cells), reading order left→right, top→bottom:
${sheetList(SHEET1)}

SHEET 2 — exact **4×2** grid (8 cells), reading order left→right, top→bottom:
${sheetList(SHEET2)}

Return exactly 2 PNG sheets. Short cell legend in chat text only (keys), not painted on the art.`);

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
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify({ count: ENV_KEYS.length, sheet1: SHEET1.map((x) => x.key), sheet2: SHEET2.map((x) => x.key), keys: ENV_KEYS }, null, 2)
);

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  kind: 'story-env-wave1',
  key_count: ENV_KEYS.length,
};

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate — set MANUS_FORCE_RERUN=1 or use --poll-only --task=', prev.task_id);
      process.exit(2);
    }
  }
  const profile = resolveAgentProfile();
  const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
  console.error(`Creating story-env wave1… profile=${profile}`);
  const created = await createTask({
    title: 'ESL story-env wave1 — 20 stage strips (black-field)',
    agent_profile: profile,
    force_skills: force,
    interactive_mode: false,
    message: BRIEF,
  });
  taskId = created.task_id;
  dump.task_id = taskId;
  dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
  dump.agent_profile = profile;
  fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
  console.error(`Task ${taskId}\n${dump.task_url}`);
  console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
} else {
  if (!taskId) throw new Error('--poll-only requires --task=');
  dump.task_id = taskId;
  dump.task_url = `https://manus.im/app/${taskId}`;
}

console.error(`Polling ${taskId}…`);
const done = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status };
dump.finished_at = new Date().toISOString();

const msgs = await listMessages(taskId, { order: 'asc', limit: 100 });
const images = collectImageAtts(msgs.messages || []);
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);

const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
const saved = [];
let i = 0;
for (const img of images) {
  i += 1;
  const ext = /\.jpe?g$/i.test(img.name) ? '.jpg' : '.png';
  const dest = path.join(
    sheetDir,
    `${String(i).padStart(2, '0')}-${path.basename(img.name, path.extname(img.name))}${ext}`
  );
  const bytes = await download(img.url, dest);
  saved.push({ dest: path.relative(ROOT, dest), bytes, name: img.name });
  console.error(`saved ${dest} (${bytes} bytes)`);
}
dump.saved = saved;
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', ...dump }, null, 2));

if (saved.length < 2) {
  console.error(`Expected ≥2 sheets, got ${saved.length} — fix in Manus then --poll-only`);
  process.exit(2);
}
