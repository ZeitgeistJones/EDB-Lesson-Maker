/**
 * B1 held-wave mop runner.
 *
 * Regenerates only held GENERATE concepts from waves 2-4 and keeps failed
 * originals intact. Stockpile only: no import, keying, wiring, B2, or reclass.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';
import { STOCKPILE_REL, GENERATE, classificationCounts } from './b1-stockpile-keys.mjs';

const POLL_MS = 25_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const DRY = process.argv.includes('--dry-run');
const POLL_ONLY = process.argv.includes('--poll-only');
const ONLY = arg('only', '');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const MOP_ROOT = path.join(ROOT, STOCKPILE_REL, 'held-wave-mop');
const RUN_DIR = path.join(MOP_ROOT, RUN_ID);
const RUN_JSON = path.join(RUN_DIR, 'run.json');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function byKey(key) {
  const item = GENERATE.find((x) => x.key === key);
  if (!item) throw new Error(`Missing GENERATE key: ${key}`);
  return item;
}

const SHEETS = [
  {
    id: 'wave2-narrative-complication-mop',
    wave: 'wave2-p0-narrative-complication',
    title: 'B1 Wave 2 P0 narrative complication mop',
    format: 'black-contact-4x4',
    failure: 'A: Manus raw art used white worksheet/page cells. This is not a local slicing issue; regenerate clean black-field art.',
    lock: [
      'Pure #000000 black canvas and gutters behind every cell; no white page panels or worksheet backgrounds.',
      'No white rounded cards, no white square frames, no white cell backplates, no paper-like panels behind the art.',
      'The black field must touch the artwork margins directly; white may appear only inside real objects such as clouds, blank bubbles, or blank cards held by a child.',
      'One concrete complication/action/outcome per cell. Do not combine multiple problems.',
      'Draw reusable cutout-like mini-scenes, not classroom worksheets.',
    ],
    keys: [
      'b1-complication-rain-starts',
      'b1-complication-place-closed',
      'b1-complication-item-missing',
      'b1-complication-short-delay',
      'b1-complication-path-blocked',
      'b1-complication-item-unavailable',
      'b1-reaction-notice-problem',
      'b1-reaction-worried-to-ready',
      'b1-action-ask-help',
      'b1-action-change-plan',
      'b1-action-try-again',
      'b1-action-choose-backup',
      'b1-outcome-problem-solved',
      'b1-outcome-plan-restored',
    ],
  },
  {
    id: 'wave3-information-tracking-mop',
    wave: 'wave3-p1-information-tracking',
    title: 'B1 Wave 3 P1 information tracking mop',
    format: 'black-contact-4x4',
    failure: 'Prior art leaked baked environmental text on books, signs, screens, papers, or boards.',
    lock: [
      'NO words, letters, numbers, captions, labels, signs, fake UI, fake handwriting, book titles, screen text, board text, paper text, or timetable text.',
      'Use blank cards, icons, dots, stars, arrows, and simple picture clues only.',
      'Show practical information flow, main/supporting/local clues, viewpoints, prediction changes, and outcomes visually.',
    ],
    keys: [
      'b1-info-source-to-key-facts-to-recipient',
      'b1-info-practical-relay-chain',
      'b1-info-two-key-facts-bundle',
      'b1-info-update-changes-plan',
      'b1-track-main-point-support-local-clue',
      'b1-track-local-inference-clue-to-answer',
      'b1-track-supporting-detail-pin-cluster',
      'b1-viewpoint-predict-outcome-check',
      'b1-viewpoint-opinion-reason-outcome',
      'b1-viewpoint-two-familiar-perspectives',
      'b1-viewpoint-prediction-changed-by-new-fact',
    ],
  },
  {
    id: 'wave4-semantic-relations-mop',
    wave: 'wave4-p2-grammar-self-repair',
    title: 'B1 Wave 4 P2 semantic grammar and self-repair mop',
    format: 'black-contact-3x3',
    failure: 'Prior art became generic decorative vocabulary objects instead of B1 relation mini-scenes.',
    lock: [
      'Each cell must show a semantic relation: problem, constraint, consequence, reaction, follow-up, confirmation, evidence, viewpoint, choice, changed plan, outcome, source/recipient, or explanation.',
      'Do NOT draw generic isolated objects, vocabulary icons, posters, grammar charts, tense tables, UI screens, labels, letters, numbers, or word bubbles.',
      'Use child/family/school mini-scenes with before/after, cause/result, background/foreground, relayed message, pause/continue, and correction-swap relations.',
    ],
    prompts: {
      'b1-grammar-background-event-overlay':
        'background activity continues faintly while one new foreground event card changes what the child notices; relation = background situation vs main event, no tense labels',
      'b1-grammar-experience-now-bridge':
        'small memory bubble of a child practicing connects by a bridge to present skill/result card where the child can do it now; relation = past experience affects now, no text',
      'b1-grammar-condition-result-path':
        'child sees a simple condition gate, such as rain cloud over a picnic path, then follows a path to one practical result tile under shelter; relation = condition causes result, no words',
      'b1-grammar-plan-changed-overlay':
        'original plan route/card is gently replaced by a new route/card after a visible constraint appears; relation = changed plan, no labels',
      'b1-grammar-speaker-relayed-message':
        'one child receives a blank picture message card from a source and passes the same blank card to another child; relation = speaker to recipient relayed message, no text',
      'b1-turn-thought-group-beads':
        'three small idea picture beads are grouped into one spoken turn path from a child, showing one longer thought made of parts; relation = grouped ideas, no words',
      'b1-turn-pause-and-continue':
        'child pauses calmly at a small bead marker, then continues to the next picture idea card on the same speaking path; relation = pause then continue, no text',
      'b1-turn-self-correction-swap':
        'speaker notices one wrong picture card in their turn and swaps it for a better picture card while continuing; relation = self-correction swap, no labels',
      'b1-turn-keep-going-path':
        'speaking path from a child bends around a small pause marker and continues toward the next idea card; relation = keep going after hesitation, no written script',
    },
    keys: [
      'b1-grammar-background-event-overlay',
      'b1-grammar-experience-now-bridge',
      'b1-grammar-condition-result-path',
      'b1-grammar-plan-changed-overlay',
      'b1-grammar-speaker-relayed-message',
      'b1-turn-thought-group-beads',
      'b1-turn-pause-and-continue',
      'b1-turn-self-correction-swap',
      'b1-turn-keep-going-path',
    ],
  },
];

const ACTIVE_SHEETS = ONLY ? SHEETS.filter((sheet) => sheet.id === ONLY || sheet.wave === ONLY) : SHEETS;
if (ONLY && !ACTIVE_SHEETS.length) {
  throw new Error(`Unknown --only target: ${ONLY}`);
}

function sheetBlock(sheet, index) {
  const lines = sheet.keys.map((key, i) => {
    const item = byKey(key);
    const prompt = sheet.prompts && sheet.prompts[key] ? sheet.prompts[key] : item.brief;
    return `${i + 1}. ${item.key} — ${prompt} [family: ${item.family}]`;
  });
  return `SHEET ${index}: ${sheet.title} (${sheet.format}; one concept per cell)
Failure being corrected: ${sheet.failure}
Sheet lock:
- ${sheet.lock.join('\n- ')}
Cells:
${lines.join('\n')}
Keys: ${sheet.keys.join(',')}`;
}

function buildBrief() {
  const total = ACTIVE_SHEETS.reduce((n, sheet) => n + sheet.keys.length, 0);
  return withEslAssetGeneratorBrief(`TASK: B1 HELD-WAVE MOP ONLY. Produce exactly ${ACTIVE_SHEETS.length} replacement black-field PNG contact sheet(s) for the ${total} held B1 GENERATE concepts below.

DO NOT research B1. DO NOT reclassify. DO NOT create CODE_LATER, DEFER_B2, B2, A2, A1, or Pre-A1 assets. DO NOT wire/import/key anything. This is replacement raw stockpile art only.

GLOBAL STYLE LOCK:
- Child-friendly ClassIn ESL board art, clean sparse vector / soft-matte educational illustration.
- Familiar school, friends, games, trips, weather, family-safe contexts.
- Pure #000000 black contact-sheet field edge-to-edge. Clear black gutters. Empty unused cells stay black.
- One concept per cell in reading order, left to right then top to bottom.
- NO readable text. NO words, letters, numbers, captions, labels, signs, fake UI, fake handwriting, book titles, screen text, board text, paper text, times, dates, prices, source names, or watermarks.
- Symbolic quantities are okay only as non-readable dots/tokens.
- quality: default ONLY.

B1 FIREWALL:
- Connected familiar meaning: brief explanation, one concrete complication, practical choice/adaptation/follow-up, simple outcome.
- One concrete problem at a time. Avoid B2 debate, persuasion, credibility, academic synthesis, negotiation, irony, bias, long essays, or abstract societal issues.

QA PASS TARGET:
- Correct concept, no catastrophic crop, no blank/white cell, no readable baked text, no off-brief substitute, state visually understandable, family-consistent.

${ACTIVE_SHEETS.map((sheet, i) => sheetBlock(sheet, i + 1)).join('\n\n')}

Return PNGs, preferably one zip plus direct CDN links. No essay.`);
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      if (url) hits.push({ url, name: a.file_name || a.filename || a.name || 'sheet.png' });
    }
  }
  return hits;
}

function sniffKind(buf, name = '') {
  const n = String(name).toLowerCase();
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (n.endsWith('.zip')) return 'zip';
  if (n.endsWith('.png')) return 'png';
  return 'other';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback).replace(/\\/g, '/'));
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-') || fallback;
}

function walkPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPngs(p));
    else if (/\.png$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  execFileSync('tar', ['-xf', zipPath, '-C', outDir], { stdio: 'ignore' });
}

function materializePngs(sheetDir) {
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  const byName = new Map();
  for (const p of [...walkPngs(unzipRoot), ...walkPngs(rawDir)]) {
    const key = path.basename(p).toLowerCase();
    if (!byName.has(key)) byName.set(key, p);
  }
  const sorted = [...byName.values()].sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en'));
  const saved = [];
  sorted.forEach((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    saved.push({ dest, bytes: fs.statSync(dest).size, name: path.basename(src), file });
  });
  return saved;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(unzipRoot, { recursive: true });

  const seen = new Set();
  let i = 0;
  let zipN = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const kind = sniffKind(buf, img.name);
    const fallback = `${String(i).padStart(2, '0')}.${kind === 'zip' ? 'zip' : kind === 'jpg' ? 'jpg' : 'png'}`;
    const dest = path.join(rawDir, safeName(img.name, fallback));
    fs.writeFileSync(dest, buf);
    if (kind === 'zip') {
      zipN += 1;
      extractZip(dest, path.join(unzipRoot, `z${zipN}`));
    }
  }
  return materializePngs(sheetDir);
}

async function main() {
  apiKey();
  fs.mkdirSync(RUN_DIR, { recursive: true });

  const expectedSheets = ACTIVE_SHEETS.length;
  const expectedConcepts = ACTIVE_SHEETS.reduce((n, sheet) => n + sheet.keys.length, 0);
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'b1-held-wave-mop',
    checkpoint: '8a5f0ed8',
    original_generate: GENERATE.length,
    previous_clean: 19,
    mop_candidates: expectedConcepts,
    expected_sheets: expectedSheets,
    safety_skipped: [],
    classification_counts: classificationCounts(),
    only: ONLY || null,
    sheets: ACTIVE_SHEETS.map((sheet) => ({
      id: sheet.id,
      wave: sheet.wave,
      title: sheet.title,
      format: sheet.format,
      keys: sheet.keys,
      failure: sheet.failure,
    })),
    disposition: {
      wave2_white_cells: 'A: Manus raw art white/blank cells; local slicing not blamed.',
      wave3_baked_text: 'Regenerate all 11 held concepts clean, text-free.',
      wave4_off_brief: 'Regenerate all 9 held concepts with semantic-relation prompts.',
    },
  };

  const brief = buildBrief();
  let taskId = arg('task');

  if (!POLL_ONLY) {
    const created = DRY
      ? { task_id: null, task_url: null, dry_run: true }
      : await createTask({
          title: 'B1 held-wave mop: narrative/info/semantic replacements',
          agent_profile: resolveAgentProfile(),
          force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
          interactive_mode: false,
          message: brief,
        });
    taskId = created.task_id || created.id || taskId || null;
    Object.assign(dump, {
      task_id: taskId,
      task_url: created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null),
      created_at: new Date().toISOString(),
      brief,
    });
    fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
    console.log(JSON.stringify({ phase: DRY ? 'dry-run' : 'created', run_dir: RUN_DIR, task_id: taskId, task_url: dump.task_url }, null, 2));
    if (DRY) return;
  } else {
    const runPath = arg('run', RUN_JSON);
    const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    Object.assign(dump, prev);
    taskId = arg('task', prev.task_id);
    if (!taskId) throw new Error('--poll-only needs --task= or --run= with task_id');
  }

  let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || [], RUN_DIR);
  let large = saved.filter((s) => s.bytes > 80_000);

  if (large.length < expectedSheets) {
    await sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS B1 held-wave mop task. You returned ${large.length}/${expectedSheets} usable PNG sheets. Produce the missing replacement sheet(s) only. Keep the same keys, same order, pure black contact fields, zero readable text, and no off-brief decorative objects.`,
      ),
    });
    result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || [], RUN_DIR);
    large = saved.filter((s) => s.bytes > 80_000);
  }

  Object.assign(dump, {
    task_id: taskId,
    task_url: dump.task_url || `https://manus.im/app/${taskId}`,
    agent_status: result && result.agent_status,
    finished_at: new Date().toISOString(),
    saved,
    large_sheet_count: large.length,
    replacement_dir: RUN_DIR,
  });
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  console.log(
    JSON.stringify(
      {
        phase: 'downloaded',
        task_id: taskId,
        task_url: dump.task_url,
        run_dir: RUN_DIR,
        saved: saved.length,
        large: large.length,
        expected_sheets: expectedSheets,
      },
      null,
      2,
    ),
  );
  if (large.length < expectedSheets) process.exit(2);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
