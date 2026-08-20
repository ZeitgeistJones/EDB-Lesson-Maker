/**
 * Story cast pilot — Leo (family-boy identity) × 7 poses × 3 emotions = 21.
 * Pure black-field 3×3 sheets from the start (no white→black convert).
 *
 *   node scripts/manus/request-story-cast-leo-pilot.mjs
 *   node scripts/manus/request-story-cast-leo-pilot.mjs --poll-only --task=<id>
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-cast-leo-pilot');
const REF = path.join(ROOT, 'public', 'assets', '09_props', 'img', 'family-boy.png');
const POLL_MS = 20_000;
const TIMEOUT_MS = 45 * 60 * 1000;

const POSES = ['idle', 'hold', 'walk', 'talk', 'sit', 'listen', 'reach'];
const EMOTIONS = ['neutral', 'happy', 'worried'];

function poseLine(pose) {
  switch (pose) {
    case 'idle':
      return 'standing relaxed, arms soft at sides (or one hand casually near shorts — NO objects), feet planted';
    case 'hold':
      return 'standing; BOTH hands/arms shaped naturally around an EMPTY holding space at torso height (cupped/ready to hold) — NO object, NO grey block, NO prop, nothing in hands';
    case 'walk':
      return 'mid-stride walking toward viewer-right, natural arm swing, both feet readable';
    case 'talk':
      return 'standing, one hand in a small talk gesture, mouth mid-speech';
    case 'sit':
      return 'sitting on invisible seat (no chair drawn), knees forward, feet on ground line';
    case 'listen':
      return 'standing/slight lean-in, attentive eyes, closed mouth, hands soft';
    case 'reach':
      return 'standing, one arm reaching forward-right, fingers open, other arm balanced';
    default:
      return pose;
  }
}

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **3 black-field 3×3 contact sheets** of ONE locked ESL story boy for ClassIn PropBank cutouts.

ATTACHED REFERENCE (mandatory): family-boy.png — this IS Leo. Copy his identity exactly in every cell.

IDENTITY LOCK (identical in all 21 cells):
- Same boy ~5–7 years old; warm tan / light-brown skin; large dark brown eyes; small nose.
- Thick messy textured dark brown hair (soft forward spikes), same length/shape every cell.
- Medium-blue short-sleeve crew-neck tee with a small left-chest pocket (viewer’s right).
- Khaki / beige cargo shorts above the knee with side flap pockets.
- Short white socks + dark blue sneakers with white laces, white toe caps, white soles.
- Soft matte educational illustration (house prop style): gentle shading, soft upper-left light, NO thick comic outlines, NOT photoreal, NOT glossy 3D.
- Full body head-to-toe; clear bottom foot contact line; predictable feet/bottom anchor.
- Slight three-quarter / viewer-RIGHT bias (we will mirror later — do NOT draw left-facing variants).

CRITICAL — PURE BLACK FIELD FROM THE START (every sheet, every cell):
- Background MUST be solid pure #000000 black edge-to-edge on the WHOLE sheet.
- Each cell’s interior field MUST be pure black — NOT white, NOT grey, NOT cream, NOT light panels.
- Do NOT draw white plates, white cards, or light backdrops behind Leo.
- True even 3×3 grid; one full-body Leo per filled cell; margins inside each cell; NOTHING crossing gutters.
- NO scenery, furniture, pets, second characters, text, logos, cell labels on the art.
- quality: default ONLY (never high).

HOLD POSE SPECIAL RULE:
- Hands/arms posed around an EMPTY holding area only.
- Do NOT draw any object, block, ball, bag, or placeholder in his hands.

SHEETS (exactly 3 PNGs) — one emotion per sheet; fixed pose order in cells 1–7; cells 8–9 solid black empty:

POSE ORDER (cells 1→7 left-to-right, top-to-bottom):
1. idle — ${poseLine('idle')}
2. hold — ${poseLine('hold')}
3. walk — ${poseLine('walk')}
4. talk — ${poseLine('talk')}
5. sit — ${poseLine('sit')}
6. listen — ${poseLine('listen')}
7. reach — ${poseLine('reach')}
8. EMPTY black
9. EMPTY black

SHEET 1 — NEUTRAL face (calm/closed or soft neutral mouth) — all 7 poses — filename hint: leo_neutral
SHEET 2 — HAPPY face (bright smile) — same 7 poses — filename hint: leo_happy — STILL PURE BLACK FIELD (never white)
SHEET 3 — WORRIED face (brows up/together, unsure mouth) — same 7 poses — filename hint: leo_worried

Return the 3 sheet PNGs. Short cell legend in chat text only (not painted on art).`);

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

const matrix = [];
for (const emotion of EMOTIONS) {
  for (const pose of POSES) {
    matrix.push({ key: `cast-leo-${pose}-${emotion}`, pose, emotion });
  }
}
fs.writeFileSync(
  path.join(OUT_DIR, 'matrix.json'),
  JSON.stringify({ who: 'leo', base: 'family-boy', count: matrix.length, matrix, sheets: EMOTIONS }, null, 2)
);

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = {
  started_at: new Date().toISOString(),
  who: 'leo',
  base_ref: 'family-boy.png',
  matrix_count: 21,
  hold_rule: 'empty hands — no placeholder object',
  black_field: 'required from start — no convert',
};

if (!pollOnly) {
  if (!fs.existsSync(REF)) throw new Error(`missing reference ${REF}`);
  const profile = resolveAgentProfile();
  const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
  console.error(`Uploading reference + creating Leo cast pilot… profile=${profile}`);
  const refPart = await fileContentPart(REF);
  const created = await createTask({
    title: 'ESL story cast pilot — Leo 7×3 (black-field only)',
    agent_profile: profile,
    force_skills: force,
    interactive_mode: false,
    message: {
      content: [
        { type: 'text', text: BRIEF },
        {
          type: 'file',
          filename: refPart.filename,
          ...(refPart.file_data ? { file_data: refPart.file_data } : { file_id: refPart.file_id }),
        },
      ],
    },
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
if (saved.length < 3) {
  console.error(`Expected 3 sheets, got ${saved.length}`);
  process.exit(2);
}
