/**
 * Pre-A1 genuine gaps — verbs + adjectives not already in PropBank.
 *   node scripts/manus/request-prea1-gaps-wave1.mjs
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

const OUT_DIR = path.join(ROOT, 'tmp', 'manus-prea1-gaps-wave1');
const gaps = JSON.parse(fs.readFileSync(path.join(ROOT, 'tmp/stockpile-prea1-gaps.json'), 'utf8'));
const VERBS = gaps.verbs.gaps || [];
const ADJS = gaps.adjs.gaps || [];

const BRIEF = withEslAssetGeneratorBrief(`TASK: Produce **2 black-field sheets** for Pre-A1 ESL gaps.

Sheet 1 — VERBS as simple picturable scenes/icons (ONE clear verb concept per cell, no text):
Grid **3×3** with cells: ${VERBS.join(', ')}${VERBS.length < 9 ? ', then EMPTY black' : ''}
Keys: prea1-verb-{word}

Sheet 2 — ADJECTIVES as clear opposite-friendly object states (no text):
Grid **2×2** or **3×3**: ${ADJS.join(', ')}
Keys: prea1-adj-{word}

Pure #000000, soft matte educational, NO characters preferred (objects/animals OK for verbs like sleep/eat if needed), NO letters on art.
quality: default only.
Return 2 PNG sheets.`);

apiKey();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'keys.json'), JSON.stringify({ VERBS, ADJS }, null, 2));

if (fs.existsSync(path.join(OUT_DIR, 'run.json')) && !process.env.MANUS_FORCE_RERUN) {
  const prev = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'run.json'), 'utf8'));
  if (prev.task_id) {
    console.error('REFUSING', prev.task_id);
    process.exit(2);
  }
}

const created = await createTask({
  title: 'ESL Pre-A1 gaps — verbs+adjs missing from PropBank',
  agent_profile: resolveAgentProfile(),
  force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
  interactive_mode: false,
  message: BRIEF,
});
const dump = {
  started_at: new Date().toISOString(),
  task_id: created.task_id,
  task_url: created.task_url || `https://manus.im/app/${created.task_id}`,
};
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));

await pollUntilDone(created.task_id, { intervalMs: 25000, timeoutMs: 45 * 60 * 1000 });
const msgs = await listMessages(created.task_id, { order: 'asc', limit: 80 });
const sheetDir = path.join(OUT_DIR, 'sheets');
fs.mkdirSync(sheetDir, { recursive: true });
let i = 0;
const saved = [];
for (const m of msgs.messages || []) {
  const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
  if (!b) continue;
  for (const a of b.attachments || []) {
    const url = a.url || a.download_url || a.file_url;
    if (!url) continue;
    i += 1;
    const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
    const res = await fetch(url);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    saved.push(dest);
  }
}
dump.saved = saved;
dump.finished_at = new Date().toISOString();
fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({ phase: 'downloaded', count: saved.length }, null, 2));
if (!saved.length) process.exit(2);
