/**
 * MASS STOCKPILE Wave 2 — Mia + Leo dedicated action poses (happy + neutral).
 * 13 actions × 2 emotions × 2 kids = 52 plates → four 4×4 sheets (16 each, last cells empty).
 *
 *   node scripts/manus/request-story-cast-actions-wave1.mjs
 *   node scripts/manus/request-story-cast-actions-wave1.mjs --poll-only --task=<id>
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-story-cast-actions-wave1');
const REF_MIA = path.join(ROOT, 'public/assets/09_props/img/cast-mia-idle-happy.png');
const REF_LEO = path.join(ROOT, 'public/assets/09_props/img/cast-leo-idle-happy.png');
const POLL_MS = 25_000;
const TIMEOUT_MS = 50 * 60 * 1000;

const ACTIONS = [
  'jump',
  'climb',
  'eat',
  'drink',
  'kick',
  'run',
  'throw',
  'catch',
  'wave',
  'push',
  'swim',
  'draw',
  'brush',
];

function poseLine(a) {
  const map = {
    jump: 'both feet off ground mid-jump, knees bent, arms up for balance',
    climb: 'climbing motion (ladder/rope invisible), one arm reaching up, one foot higher',
    eat: 'bringing food-shaped EMPTY hand gesture to mouth — NO food drawn',
    drink: 'tilting imaginary cup to mouth — NO cup drawn',
    kick: 'one leg extended forward kicking, other planted',
    run: 'full run stride faster than walk, leaning forward',
    throw: 'arm back/forward throwing motion, empty hand — NO ball',
    catch: 'both hands up ready to catch — NO ball',
    wave: 'one arm raised waving hello',
    push: 'both hands forward pushing — NO object',
    swim: 'swimming stroke pose standing (not submerged scenery)',
    draw: 'one hand drawing on invisible surface — NO paper/pencil props',
    brush: 'brushing teeth/hair motion — NO brush prop drawn',
  };
  return map[a] || a;
}

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **4 black-field contact sheets** of locked ESL story kids for dedicated ACTION poses.

ATTACHED REFS (mandatory identity):
1) cast-mia-idle-happy.png = MIA
2) cast-leo-idle-happy.png = LEO

SHEETS (exactly 4 PNGs), each a true **4×4** grid (16 cells). Pure #000000 black field. No labels on art. quality: default only.
NO scenery, NO props/objects in hands, NO text. Full body, bottom foot anchor, soft matte educational style.

CELL ORDER left→right, top→bottom for each sheet — first 13 cells = actions, cells 14–16 EMPTY black:

ACTIONS (same order every sheet):
${ACTIONS.map((a, i) => `${i + 1}. ${a} — ${poseLine(a)}`).join('\n')}
14–16. EMPTY black

SHEET 1 — MIA · NEUTRAL face · all 13 actions
SHEET 2 — MIA · HAPPY face · all 13 actions
SHEET 3 — LEO · NEUTRAL face · all 13 actions
SHEET 4 — LEO · HAPPY face · all 13 actions

Keys will be: cast-{mia|leo}-{action}-{neutral|happy}

Return 4 PNG sheets. Legend in chat text only.`);

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
      if (url) hits.push({ name, url });
    }
  }
  return hits;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'keys.json'),
  JSON.stringify({ actions: ACTIONS, kids: ['mia', 'leo'], emotions: ['neutral', 'happy'] }, null, 2)
);

const pollOnly = process.argv.includes('--poll-only');
let taskId = arg('task');
const dump = { started_at: new Date().toISOString(), kind: 'story-cast-actions-wave1' };

if (!pollOnly) {
  if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING duplicate', prev.task_id);
      process.exit(2);
    }
  }
  const miaPart = await fileContentPart(REF_MIA);
  const leoPart = await fileContentPart(REF_LEO);
  const created = await createTask({
    title: 'ESL cast ACTIONS wave1 — Mia+Leo ×13 ×2 emotions',
    agent_profile: resolveAgentProfile(),
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    interactive_mode: false,
    message: {
      content: [
        { type: 'text', text: BRIEF },
        {
          type: 'file',
          filename: miaPart.filename,
          ...(miaPart.file_data ? { file_data: miaPart.file_data } : { file_id: miaPart.file_id }),
        },
        {
          type: 'file',
          filename: leoPart.filename,
          ...(leoPart.file_data ? { file_data: leoPart.file_data } : { file_id: leoPart.file_id }),
        },
      ],
    },
  });
  taskId = created.task_id;
  dump.task_id = taskId;
  dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
  fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
  console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
} else if (!taskId) throw new Error('--poll-only needs --task=');

const done = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
dump.poll = { agent_status: done.agent_status || done.status };
const msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
const images = collectImageAtts(msgs.messages || []);
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
const saved = [];
let i = 0;
for (const img of images) {
  i += 1;
  const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
  await download(img.url, dest);
  saved.push(dest);
}
dump.saved = saved;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length, ...dump }, null, 2));
if (!saved.length) process.exit(2);
