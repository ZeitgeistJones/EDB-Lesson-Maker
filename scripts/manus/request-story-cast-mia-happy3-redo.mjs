/**
 * Redo only cast-mia-{idle,hold,walk}-happy on pure black field (no white→black convert).
 *
 *   node scripts/manus/request-story-cast-mia-happy3-redo.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-cast-mia-happy3-redo');
const REFS = [
  path.join(ROOT, 'public/assets/09_props/img/family-girl.png'),
  path.join(ROOT, 'public/assets/09_props/img/cast-mia-talk-happy.png'),
  path.join(ROOT, 'public/assets/09_props/img/cast-mia-idle-neutral.png'),
];
const KEYS = ['cast-mia-idle-happy', 'cast-mia-hold-happy', 'cast-mia-walk-happy'];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **ONE** pure black-field contact sheet to REPLACE three contaminated Mia cutouts.

ATTACHED REFERENCES (mandatory identity lock):
1. family-girl.png — original Mia base
2. cast-mia-talk-happy.png — CORRECT happy face + outfit from the same pilot (match this mood/style)
3. cast-mia-idle-neutral.png — correct idle body proportions / clothing from the same pilot

HARD REQUIREMENT — PURE BLACK FROM THE START:
- Background must be solid pure #000000 black edge-to-edge on the WHOLE sheet.
- Each cell’s interior field must also be pure black (NOT white, NOT grey, NOT cream).
- Do NOT draw white plates, white cards, or light panels behind Mia.
- True even grid; one full-body Mia per filled cell; margins inside cells; nothing crossing gutters.
- quality: default ONLY.

IDENTITY LOCK (identical to successful pilot):
- Same Mia ~5–7: warm light-brown skin, large brown eyes, rosy cheeks.
- Medium wavy brown hair to shoulders, side-swept bangs.
- Thin PINK headband + small PINK flower on her left (viewer’s right).
- Mustard-yellow tee under blue denim overall dress (chest pocket, strap buttons).
- White ankle socks + pink sneakers with white laces/soles.
- Soft matte educational illustration; gentle shading; soft upper-left light; no thick outlines; not photoreal; not glossy 3D.
- Full body head-to-toe; clear bottom foot line; slight viewer-RIGHT bias.

EMOTION: HAPPY only (bright smile) on all three cells.

SHEET: **2×2** black-field PNG
Cell 1 (top-left): IDLE happy — standing relaxed, arms soft at sides, feet planted, bright smile
Cell 2 (top-right): HOLD happy — standing; BOTH hands/arms around EMPTY holding space at torso (cupped) — NO object/block/prop in hands; bright smile
Cell 3 (bottom-left): WALK happy — mid-stride toward viewer-right, natural arm swing; bright smile
Cell 4 (bottom-right): EMPTY solid black only

Return the one sheet PNG. No labels painted on the art.`);

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
console.error(`Creating Mia happy-3 redo… profile=${profile}`);

const content = [{ type: 'text', text: BRIEF }];
for (const ref of REFS) {
  if (!fs.existsSync(ref)) throw new Error(`missing ref ${ref}`);
  const part = await fileContentPart(ref);
  content.push({
    type: 'file',
    filename: part.filename,
    ...(part.file_data ? { file_data: part.file_data } : { file_id: part.file_id }),
  });
}

const created = await createTask({
  title: 'ESL Mia cast redo — idle/hold/walk happy (black-field only)',
  agent_profile: profile,
  force_skills: force,
  interactive_mode: false,
  message: { content },
});

const dump = {
  started_at: new Date().toISOString(),
  task_id: created.task_id,
  task_url: created.task_url || `https://manus.im/app/${created.task_id}`,
  keys: KEYS,
  note: 'pure black from start — no white-field convert',
};
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.error(`Task ${dump.task_id}\n${dump.task_url}`);
console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));

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
  console.error(`saved ${dest} (${bytes})`);
}
dump.saved = saved;
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length, ...dump }, null, 2));
if (!saved.length) process.exit(2);
