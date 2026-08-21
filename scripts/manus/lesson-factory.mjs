/**
 * Overnight Manus finished-lesson factory (default A1; --cefr=A2 for A2).
 *
 * One Manus task = one UNIT (5 lessons × 10 pages).
 * Multiple units run in parallel; within each unit lessons stay in ONE session.
 *
 *   node scripts/manus/lesson-factory.mjs --init
 *   node scripts/manus/lesson-factory.mjs --run
 *   node scripts/manus/lesson-factory.mjs --status
 *   node scripts/manus/lesson-factory.mjs --poll-once
 *
 * Env:
 *   MANUS_API_KEY (required)
 *   LESSON_FACTORY_MAX_CONCURRENT (default 5)
 *   LESSON_FACTORY_AGENT_PROFILE (default manus-1.6)
 */
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import {
  ROOT,
  createTask,
  listMessages,
  pollUntilDone,
  confirmAction,
  latestAgentStatus,
  apiKey,
} from './client.mjs';


function parseArgValue(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}

const CEFR = (parseArgValue("cefr", process.env.LESSON_FACTORY_CEFR || "A1") || "A1").toUpperCase();

const BRIEFS_PATH = parseArgValue(
  "briefs",
  path.join(ROOT, "manus-lessons", CEFR, "unit-briefs.json"),
);
const LIB_ROOT = parseArgValue("lib", path.join(ROOT, "manus-lessons", CEFR));
const STATUS_JSON = path.join(LIB_ROOT, "factory-status.json");
const STATUS_MD = path.join(ROOT, "docs", `manus-lesson-factory-status-${CEFR}.md`);
const STATUS_MD_COMBINED = path.join(ROOT, "docs", "manus-lesson-factory-status.md");
const PAUSE_FLAG = path.join(ROOT, 'tmp', 'manus-board-loops', 'FACTORY_PAUSE.json');

const MAX_CONCURRENT = Math.max(
  1,
  Number(process.env.LESSON_FACTORY_MAX_CONCURRENT || 5) || 5,
);
const AGENT_PROFILE = (process.env.LESSON_FACTORY_AGENT_PROFILE || 'manus-1.6').trim();
const POLL_MS = 20_000;
const UNIT_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6h per unit session
const LOOP_SLEEP_MS = 30_000;

const FACTORY_LOCK_DIR = path.join(ROOT, 'tmp', 'manus-lesson-factory');
const FACTORY_RUN_LOCK = path.join(FACTORY_LOCK_DIR, 'factory-run.lock');

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readFactoryRunLock() {
  if (!fs.existsSync(FACTORY_RUN_LOCK)) return null;
  try {
    return JSON.parse(fs.readFileSync(FACTORY_RUN_LOCK, 'utf8'));
  } catch {
    return null;
  }
}

function acquireFactoryRunLock() {
  fs.mkdirSync(FACTORY_LOCK_DIR, { recursive: true });
  const existing = readFactoryRunLock();
  if (existing && existing.pid !== process.pid && isPidAlive(existing.pid)) {
    console.error(
      '[run] Another lesson-factory is already running (pid=' + existing.pid + ', started=' + (existing.started_at || '?') + '). Exiting.',
    );
    process.exit(0);
  }
  const payload = { pid: process.pid, started_at: nowIso(), argv: process.argv.slice(2) };
  fs.writeFileSync(FACTORY_RUN_LOCK, JSON.stringify(payload, null, 2));
  const release = () => {
    try {
      const cur = readFactoryRunLock();
      if (cur && cur.pid === process.pid) fs.unlinkSync(FACTORY_RUN_LOCK);
    } catch {}
  };
  process.on('exit', release);
  process.on('SIGINT', () => {
    release();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    release();
    process.exit(143);
  });
}

async function manusTaskPhase(taskId) {
  if (!taskId) return 'missing';
  try {
    const snap = await listMessages(taskId, { order: 'desc', limit: 30, allowMissing: true });
    const st = latestAgentStatus(snap.messages || []);
    return st?.agent_status || 'unknown';
  } catch (err) {
    if (err.code === 'WAITING') return 'waiting';
    return 'unknown';
  }
}

function unitHasUsableDeliverables(unitNum) {
  const root = unitDir(unitNum);
  if (!fs.existsSync(root)) return false;
  for (let n = 1; n <= 5; n += 1) {
    const lessonPath = path.join(root, 'lesson-' + String(n).padStart(2, '0'));
    const pdf = path.join(lessonPath, 'lesson.pdf');
    if (fs.existsSync(pdf) && fs.statSync(pdf).size > 5000) return true;
    const pagesDir = path.join(lessonPath, 'pages');
    if (fs.existsSync(pagesDir)) {
      const imgs = fs.readdirSync(pagesDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
      if (imgs.length >= 8) return true;
    }
  }
  const rawDir = path.join(root, 'raw-downloads');
  if (fs.existsSync(rawDir)) {
    const any = walkFiles(rawDir).some(
      (f) =>
        (/lesson[-_ ]?0?[1-5].*\.pdf$/i.test(path.basename(f)) && fs.statSync(f).size > 5000) ||
        (/page/i.test(path.basename(f)) && /\.(png|jpe?g|webp)$/i.test(f)),
    );
    if (any) return true;
  }
  return false;
}

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

function nowIso() {
  return new Date().toISOString();
}

function unitDir(unitNum) {
  return path.join(LIB_ROOT, `unit-${String(unitNum).padStart(2, '0')}`);
}

function loadBriefs() {
  return JSON.parse(fs.readFileSync(BRIEFS_PATH, 'utf8'));
}

function emptyStatus(briefs) {
  return {
    updated_at: nowIso(),
    cefr: CEFR,
    pages_per_lesson: briefs.pages_per_lesson || 10,
    lessons_per_unit: briefs.lessons_per_unit || 5,
    quality_benchmark: briefs.quality_benchmark,
    max_concurrent: MAX_CONCURRENT,
    agent_profile: AGENT_PROFILE,
    board_loops_paused: true,
    totals: {
      units_planned: briefs.units.length,
      units_queued: briefs.units.length,
      units_running: 0,
      units_complete: 0,
      units_failed: 0,
      lessons_complete: 0,
      total_pages_complete: 0,
    },
    units: briefs.units.map((u) => ({
      unit: u.unit,
      slug: u.slug,
      title: u.title,
      world: u.world,
      status: 'QUEUED',
      manus_task_id: null,
      manus_task_url: null,
      launched_at: null,
      finished_at: null,
      lessons_complete: 0,
      page_count: 0,
      quality_self_ratings: [],
      master_path: `manus-lessons/${CEFR}/unit-${String(u.unit).padStart(2, '0')}/`,
      error: null,
      retries: 0,
    })),
  };
}

function loadStatus() {
  if (!fs.existsSync(STATUS_JSON)) return null;
  return JSON.parse(fs.readFileSync(STATUS_JSON, 'utf8'));
}

function saveStatus(status) {
  status.updated_at = nowIso();
  const running = status.units.filter((u) => u.status === 'RUNNING').length;
  const queued = status.units.filter((u) => u.status === 'QUEUED' || u.status === 'RETRY_NEEDED').length;
  const complete = status.units.filter((u) => u.status === 'COMPLETE').length;
  const failed = status.units.filter((u) => u.status === 'FAILED').length;
  const lessons = status.units.reduce((n, u) => n + (u.lessons_complete || 0), 0);
  const pages = status.units.reduce((n, u) => n + (u.page_count || 0), 0);
  status.totals = {
    units_planned: status.units.length,
    units_queued: queued,
    units_running: running,
    units_complete: complete,
    units_failed: failed,
    lessons_complete: lessons,
    total_pages_complete: pages,
  };
  fs.mkdirSync(path.dirname(STATUS_JSON), { recursive: true });
  const payload = JSON.stringify(status, null, 2);
  const tmpPath = `${STATUS_JSON}.${process.pid}.tmp`;
  let lastErr = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(tmpPath, payload);
      try {
        fs.renameSync(tmpPath, STATUS_JSON);
      } catch {
        fs.copyFileSync(tmpPath, STATUS_JSON);
        fs.unlinkSync(tmpPath);
      }
      writeStatusMd(status);
      return;
    } catch (err) {
      lastErr = err;
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 * (attempt + 1));
    }
  }
  throw lastErr || new Error(`Failed to write ${STATUS_JSON}`);
}

function writeStatusMd(status) {
  const t = status.totals;
  const lines = [
    '# Manus Lesson Factory — Overnight Status',
    '',
    `Updated: ${status.updated_at}`,
    '',
    '## Totals',
    '',
    `| Metric | Value |`,
    `|---|---|`,
    `| Units planned | ${t.units_planned} |`,
    `| Queued / retry | ${t.units_queued} |`,
    `| Running | ${t.units_running} |`,
    `| Complete | ${t.units_complete} |`,
    `| Failed | ${t.units_failed} |`,
    `| Lessons complete | ${t.lessons_complete} |`,
    `| Pages complete | ${t.total_pages_complete} |`,
    `| Max concurrent | ${status.max_concurrent} |`,
    `| Agent profile | ${status.agent_profile} |`,
    `| Board loops paused | ${status.board_loops_paused} |`,
    '',
    '## Units',
    '',
    '| Unit | Title | Status | Task | Lessons | Pages | Qualities | Master |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const u of status.units) {
    const q = (u.quality_self_ratings || []).join(', ') || '—';
    const task = u.manus_task_id
      ? `[${u.manus_task_id.slice(0, 8)}](${u.manus_task_url || '#'})`
      : '—';
    lines.push(
      `| ${String(u.unit).padStart(2, '0')} | ${u.title} | ${u.status} | ${task} | ${u.lessons_complete || 0}/5 | ${u.page_count || 0} | ${q} | \`${u.master_path}\` |`,
    );
  }
  lines.push('', '## Notes', '', '- One Manus session per unit (5 lessons sequential).', '- Do not resume board-grammar loops while factory is active.', '');
  fs.mkdirSync(path.dirname(STATUS_MD), { recursive: true });
  fs.writeFileSync(STATUS_MD, lines.join('\n'));
  writeCombinedStatusMd();
}

function writeCombinedStatusMd() {
  const levels = ["A1", "A2"];
  const parts = [
    "# Manus Lesson Factory — Combined Status",
    "",
    `Updated: ${nowIso()}`,
    "",
  ];
  for (const level of levels) {
    const p = path.join(ROOT, "manus-lessons", level, "factory-status.json");
    if (!fs.existsSync(p)) continue;
    const st = JSON.parse(fs.readFileSync(p, "utf8"));
    const t = st.totals || {};
    parts.push(`## ${level}`, "");
    parts.push(
      "| Metric | Value |",
      "|---|---|",
      `| Units planned | ${t.units_planned ?? "?"} |`,
      `| Queued / retry | ${t.units_queued ?? "?"} |`,
      `| Running | ${t.units_running ?? "?"} |`,
      `| Complete | ${t.units_complete ?? "?"} |`,
      `| Failed | ${t.units_failed ?? "?"} |`,
      `| Lessons complete | ${t.lessons_complete ?? "?"} |`,
      `| Pages complete | ${t.total_pages_complete ?? "?"} |`,
      "",
      `Detail: [manus-lesson-factory-status-${level}.md](./manus-lesson-factory-status-${level}.md)`,
      "",
    );
  }
  parts.push("## Notes", "", "- One Manus session per unit (5 lessons sequential).", "- Do not resume board-grammar loops while factory is active.", "");
  fs.mkdirSync(path.dirname(STATUS_MD_COMBINED), { recursive: true });
  fs.writeFileSync(STATUS_MD_COMBINED, parts.join("\n"));
}

function ensurePauseFlag() {
  fs.mkdirSync(path.dirname(PAUSE_FLAG), { recursive: true });
  if (!fs.existsSync(PAUSE_FLAG)) {
    fs.writeFileSync(
      PAUSE_FLAG,
      JSON.stringify(
        {
          paused: true,
          paused_at: nowIso(),
          reason: 'Overnight Manus finished-lesson factory',
          no_further_manus_calls_from_board_loops: true,
        },
        null,
        2,
      ),
    );
  }
}

function buildManufacturingInstruction(unitBrief, pagesPerLesson) {
  const lessonBlocks = unitBrief.lessons
    .map(
      (l) => `LESSON ${l.n}
- topic: ${l.topic}
- target vocabulary: ${(l.vocab || []).join(', ')}
- target language: ${l.target_language}
- communicative objective: ${l.objective}`,
    )
    .join('\n\n');

  return `You are manufacturing ONE COMPLETE ${CEFR} ESL UNIT.

This unit contains:

5 LESSONS

Each lesson must contain:

${pagesPerLesson} FINISHED BOARDS/PAGES.

You already have the high-quality "A Day at the Beach" lesson as the approximate 9/10 product-quality benchmark.

Your job is to manufacture all five lessons sequentially in THIS SAME SESSION.

========================================
UNIT BRIEF
========================================

CEFR: ${CEFR}
UNIT NUMBER: ${String(unitBrief.unit).padStart(2, '0')}
UNIT TITLE / WORLD: ${unitBrief.title} — ${unitBrief.world}
UNIT COMMUNICATIVE GOAL: ${unitBrief.communicative_goal}

RECYCLED LANGUAGE: ${(unitBrief.recycled_language || []).join(', ') || '(none — early unit)'}
NEW LANGUAGE: ${(unitBrief.new_language_focus || []).join(', ')}
UNIT-END CAPABILITY: ${unitBrief.unit_end_capability}

${lessonBlocks}

========================================
QUALITY
========================================

Target approximately 9/10 or better for:

- visual/product polish
- ESL pedagogy
- child appeal
- illustration quality
- activity design
- lesson coherence
- professional finish

These should feel like authored children's educational products.

NOT automatically populated slide decks.

========================================
UNIT CONTINUITY
========================================

The five lessons belong together.

Recycle language intelligently.

Build gradually.

Allow vocabulary and sentence patterns from earlier lessons to return naturally.

Increase learner independence across the unit.

Lesson 5 should feel meaningfully more integrated than Lesson 1.

========================================
EVERY LESSON = ${pagesPerLesson} PAGES
========================================

Do not shorten later lessons for efficiency.

Every lesson should contain exactly ${pagesPerLesson} finished pages.

Each lesson needs a deliberate:

OPENING
and
CLOSING.

The middle pages should form the strongest sequence for that specific lesson.

Do NOT mechanically reproduce one ten-page template.

========================================
DO NOT COPY THE BEACH SEQUENCE
========================================

The Beach lesson establishes QUALITY.

It does NOT establish a mandatory activity sequence.

Do not produce:

same lesson
+ different nouns.

Choose activity structures based on the actual language and topic.

========================================
VISUAL / PRODUCT POLISH
========================================

Every page should feel intentionally art-directed.

Be demanding about:

- scene composition
- illustration quality
- hierarchy
- spacing
- scale
- typography
- character staging
- prop placement
- visual consistency
- interaction affordances
- background/world use
- dead space
- visual payoff

Avoid:

- excessive white cards
- generic flashcard grids
- worksheet smell
- pasted-together assets
- repetitive layouts
- tiny manipulatives
- generic title slides
- filler endings

========================================
CHILD ENGAGEMENT
========================================

Ask:

"Would a child actually care what happens on this page?"

Use when appropriate:

- discovery
- search
- stories
- humor
- building
- fixing
- choosing
- packing
- collecting
- routes
- mysteries
- roleplay
- transformations
- visual consequences
- creation
- meaningful interaction

Not every page needs to be game-like.

Variety matters.

========================================
ESL QUALITY
========================================

Maintain clear:

- ${CEFR}-level target language
- vocabulary load
- modeling
- visual scaffolding
- meaningful practice
- speaking opportunities
- comprehension
- recycling
- learner production

Do not allow beautiful art to hide weak language teaching.

========================================
EFFICIENCY LEARNING
========================================

A major goal is to become FASTER over the five lessons WITHOUT reducing quality.

Lesson 1: establish production method.
Lesson 2: reuse successful production patterns.
Lesson 3: reduce unnecessary rework.
Lesson 4: operate from a more mature workflow.
Lesson 5: aim for materially improved efficiency while maintaining the same quality standard.

Efficiency may come from reusable art-direction methods, better composition planning, recurring character handling, QA routines, interaction construction, opening/closing methods, production sequencing.

Efficiency may NOT come from fewer pages, lower-quality artwork, generic layouts, less QA, repetitive lessons, or weaker pedagogy.

REUSABLE PRODUCTION PROCESS
NOT
REPETITIVE LESSON TEMPLATE.

========================================
DO NOT STOP BETWEEN LESSONS
========================================

Complete Lesson 1, Lesson 2, Lesson 3, Lesson 4, Lesson 5 without waiting for approval.

Carry production learning forward.

========================================
OUTPUT (MANDATORY)
========================================

For EACH lesson, deliver:

1. Exactly ${pagesPerLesson} full-resolution board/page images (PNG or JPG), clearly named:
   lesson-0N-page-01 ... lesson-0N-page-10
2. An assembled lesson PDF if you can produce one:
   lesson-0N.pdf
3. A tiny production note (plain text) including:
   QUALITY SELF-RATING:
   WHAT WAS REUSED:
   WHAT REQUIRED CUSTOM WORK:
   WHAT BECAME FASTER:

Also provide a short unit summary at the end.

Do not provide only contact-sheet previews.
Do not stop after Lesson 1.

========================================
FINAL UNIT CHECK
========================================

Before completing the unit verify:

5 lessons exist.
${5 * pagesPerLesson} total lesson boards exist.
All lessons are approximately 9/10 quality.
The five lessons feel related but not repetitive.
Production became more efficient without visible quality loss.

Then return the completed unit.

Begin Lesson 1 now.`;
}

function writeUnitBriefFile(unitBrief) {
  const dir = unitDir(unitBrief.unit);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'unit-brief.json');
  fs.writeFileSync(out, JSON.stringify(unitBrief, null, 2));
  return out;
}

async function launchUnit(status, briefs, unitRec) {
  const unitBrief = briefs.units.find((u) => u.unit === unitRec.unit);
  if (!unitBrief) throw new Error(`Missing brief for unit ${unitRec.unit}`);
  writeUnitBriefFile(unitBrief);
  const pages = briefs.pages_per_lesson || 10;
  const message = buildManufacturingInstruction(unitBrief, pages);
  const title = `${CEFR} Unit ${String(unitBrief.unit).padStart(2, '0')}: ${unitBrief.title} — 5 lessons × ${pages} pages`;

  console.log(`[fire] Unit ${unitBrief.unit} — ${unitBrief.title}`);
  const created = await createTask({
    title,
    message,
    agent_profile: AGENT_PROFILE,
    // Finished lessons need full creative capacity, not asset-sheet skill lock.
  });
  const taskId = created.task_id || created.id || (created.task && created.task.id);
  if (!taskId) {
    throw new Error(`createTask returned no task id: ${JSON.stringify(created).slice(0, 300)}`);
  }
  unitRec.status = 'RUNNING';
  unitRec.manus_task_id = taskId;
  unitRec.manus_task_url = `https://manus.im/app/${taskId}`;
  unitRec.launched_at = nowIso();
  unitRec.error = null;
  unitRec.create_response = {
    task_id: taskId,
    agent_profile: AGENT_PROFILE,
  };
  fs.writeFileSync(
    path.join(unitDir(unitBrief.unit), 'manus-session.json'),
    JSON.stringify(
      {
        task_id: taskId,
        task_url: unitRec.manus_task_url,
        launched_at: unitRec.launched_at,
        agent_profile: AGENT_PROFILE,
        title,
      },
      null,
      2,
    ),
  );
  saveStatus(status);
  console.log(`[fire] Unit ${unitBrief.unit} task=${taskId}`);
  return unitRec;
}

function collectDownloadables(messages) {
  const hits = [];
  const seen = new Set();
  const push = (filename, url, kind) => {
    if (!filename || !url) return;
    const key = `${filename}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ filename, url, kind });
  };

  for (const msg of messages || []) {
    const am = msg.assistant_message || (msg.type === 'assistant_message' ? msg : null);
    const body = am && (am.content != null ? am : am);
    // attachments on assistant_message
    const attachments =
      (am && am.attachments) ||
      msg.attachments ||
      (body && body.attachments) ||
      [];
    for (const a of attachments) {
      const filename = a.filename || a.name || a.file_name;
      const url = a.url || a.download_url || a.file_url;
      const kind = guessKind(filename, a.type);
      push(filename, url, kind);
    }
    // file blocks in content arrays
    const content = (am && am.content) || msg.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (!part) continue;
        if (part.type === 'file' || part.type === 'image' || part.file) {
          const file = part.file || part;
          push(
            file.filename || file.name || part.filename,
            file.url || file.download_url || file.file_url || part.url,
            guessKind(file.filename || part.filename, part.type),
          );
        }
      }
    }
  }
  return hits;
}

function guessKind(filename, typeHint) {
  const n = String(filename || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp|gif)$/i.test(n)) return 'image';
  if (/\.(md|txt|json)$/i.test(n)) return 'note';
  if (typeHint === 'image') return 'image';
  return 'other';
}



function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function extractZipDownloads(rawDir) {
  if (!fs.existsSync(rawDir)) return;
  for (const name of fs.readdirSync(rawDir)) {
    if (!name.toLowerCase().endsWith('.zip')) continue;
    const zipPath = path.join(rawDir, name);
    const outDir = path.join(rawDir, `${path.basename(name, '.zip')}-extracted`);
    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length) continue;
    fs.mkdirSync(outDir, { recursive: true });
    try {
      try {
      execSync(`tar -xf "${zipPath.replace(/"/g, '')}" -C "${outDir.replace(/"/g, '')}"`, {
        stdio: 'ignore',
      });
    } catch (tarErr) {
      if (process.platform === 'win32') {
        const z = zipPath.replace(/'/g, "''");
        const d = outDir.replace(/'/g, "''");
        execSync(
          `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${z}' -DestinationPath '${d}' -Force"`,
          { stdio: 'ignore' },
        );
      } else {
        throw tarErr;
      }
    }
    } catch (err) {
      console.error(`[zip] extract failed ${name}: ${err.message}`);
    }
  }
}

function expandSavedFromRaw(destRoot, saved) {
  const rawDir = path.join(destRoot, 'raw-downloads');
  extractZipDownloads(rawDir);
  const expanded = [...saved];
  const seen = new Set(saved.map((x) => x.path));
  for (const filePath of walkFiles(rawDir)) {
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    expanded.push({
      filename: path.basename(filePath),
      path: filePath,
      url: null,
      kind: guessKind(path.basename(filePath)),
      bytes: fs.statSync(filePath).size,
    });
  }
  return expanded;
}

async function downloadAll(messages, destRoot) {
  fs.mkdirSync(destRoot, { recursive: true });
  const rawDir = path.join(destRoot, 'raw-downloads');
  fs.mkdirSync(rawDir, { recursive: true });
  const hits = collectDownloadables(messages);
  const saved = [];
  for (const hit of hits) {
    const safe = String(hit.filename || `file-${saved.length + 1}`)
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .slice(0, 180);
    const savePath = path.join(rawDir, safe);
    try {
      if (!fs.existsSync(savePath)) {
        const res = await fetch(hit.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(savePath, buf);
      }
      saved.push({ ...hit, path: savePath, bytes: fs.statSync(savePath).size });
    } catch (err) {
      console.error(`[dl] fail ${safe}: ${err.message}`);
    }
  }
  return saved;
}

function organizeLessonFiles(unitNum, saved) {
  const root = unitDir(unitNum);
  let pageCount = 0;
  const lessonPages = {};
  for (let n = 1; n <= 5; n++) {
    const lessonPath = path.join(root, `lesson-${String(n).padStart(2, '0')}`);
    const pagesDir = path.join(lessonPath, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    lessonPages[n] = { dir: lessonPath, pages: 0 };
  }

  for (const s of saved) {
    const name = path.basename(s.path);
    const m =
      name.match(/lesson[-_ ]?0?([1-5]).*page[-_ ]?0?(\d{1,2})/i) ||
      name.match(/l0?([1-5])[-_]?p0?(\d{1,2})/i) ||
      name.match(/u\d+[-_]?l0?([1-5])[-_]?(\d{1,2})/i);
    if (m) {
      const ln = Number(m[1]);
      const pn = Number(m[2]);
      const dest = path.join(
        root,
        `lesson-${String(ln).padStart(2, '0')}`,
        'pages',
        `page-${String(pn).padStart(2, '0')}${path.extname(name) || '.png'}`,
      );
      fs.copyFileSync(s.path, dest);
      lessonPages[ln].pages += 1;
      pageCount += 1;
      continue;
    }
    const pdfM = name.match(/lesson[-_ ]?0?([1-5]).*\.pdf$/i);
    if (pdfM) {
      const ln = Number(pdfM[1]);
      const dest = path.join(root, `lesson-${String(ln).padStart(2, '0')}`, 'lesson.pdf');
      fs.copyFileSync(s.path, dest);
      continue;
    }
    if (/\.(md|txt)$/i.test(name)) {
      const noteDest = path.join(root, name);
      fs.copyFileSync(s.path, noteDest);
    }
  }

  // Fallback: if naming didn't parse, dump images evenly is wrong — keep in raw only
  // Count any pages already in lesson folders
  for (let n = 1; n <= 5; n++) {
    const pagesDir = path.join(root, `lesson-${String(n).padStart(2, '0')}`, 'pages');
    if (fs.existsSync(pagesDir)) {
      const imgs = fs.readdirSync(pagesDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
      lessonPages[n].pages = imgs.length;
    }
  }
  pageCount = Object.values(lessonPages).reduce((a, b) => a + b.pages, 0);
  const lessonsComplete = Object.values(lessonPages).filter((l) => l.pages >= 8).length; // soft: ≥8 of 10
  return { pageCount, lessonsComplete, lessonPages, savedCount: saved.length };
}

function extractQualityRatings(messages) {
  const text = (messages || [])
    .map((m) => {
      const am = m.assistant_message;
      if (!am) return '';
      if (typeof am.content === 'string') return am.content;
      if (Array.isArray(am.content)) {
        return am.content.map((p) => (p && p.text) || '').join('\n');
      }
      return '';
    })
    .join('\n');
  const ratings = [];
  const re = /QUALITY SELF-RATING\s*:\s*([0-9]+(?:\.[0-9]+)?\s*\/\s*10|[0-9]+(?:\.[0-9]+)?)/gi;
  let m;
  while ((m = re.exec(text)) && ratings.length < 5) {
    ratings.push(m[1].replace(/\s+/g, ''));
  }
  return ratings;
}

function writeLessonMetadata(unitBrief, unitRec, org) {
  for (const lesson of unitBrief.lessons) {
    const lessonPath = path.join(
      unitDir(unitBrief.unit),
      `lesson-${String(lesson.n).padStart(2, '0')}`,
    );
    fs.mkdirSync(lessonPath, { recursive: true });
    const meta = {
      cefr: CEFR,
      unit: unitBrief.unit,
      lesson: lesson.n,
      curriculum_position: `A1-U${String(unitBrief.unit).padStart(2, '0')}-L${String(lesson.n).padStart(2, '0')}`,
      unit_title: unitBrief.title,
      topic: lesson.topic,
      target_vocabulary: lesson.vocab,
      target_language: lesson.target_language,
      objective: lesson.objective,
      page_count_expected: 10,
      page_count_found: org.lessonPages[lesson.n]?.pages || 0,
      manus_task_id: unitRec.manus_task_id,
      manus_task_url: unitRec.manus_task_url,
      preserved_at: nowIso(),
    };
    fs.writeFileSync(path.join(lessonPath, 'metadata.json'), JSON.stringify(meta, null, 2));
  }
}

async function handleWaiting(taskId, messages) {
  const st = latestAgentStatus(messages);
  if (!st || st.agent_status !== 'waiting') return false;
  const detail = st.status_detail || {};
  const typ = detail.waiting_for_event_type || '';
  const eventId = detail.waiting_for_event_id;
  if (typ === 'apiHighCreditNotice' && eventId) {
    console.log(`[confirm] ${taskId} apiHighCreditNotice`);
    await confirmAction(taskId, eventId, { action: 'accept' });
    return true;
  }
  return false;
}

async function pollUnit(status, briefs, unitRec) {
  const taskId = unitRec.manus_task_id;
  if (!taskId) return;
  console.log(`[poll] Unit ${unitRec.unit} ${taskId}`);
  try {
    // Light snapshot first for waiting/credit
    const snap = await listMessages(taskId, { order: 'desc', limit: 80, allowMissing: true });
    if (snap && snap._http_status === 404) {
      console.log(`[poll] Unit ${unitRec.unit} not visible yet`);
      return;
    }
    const confirmed = await handleWaiting(taskId, snap.messages || []);
    if (confirmed) return;

    const st = latestAgentStatus(snap.messages || []);
    if (st && (st.agent_status === 'running' || st.agent_status === 'pending')) {
      // Incremental download while running (preserve partials)
      const partialSaved = await downloadAll(snap.messages || [], unitDir(unitRec.unit));
      const partialExpanded = expandSavedFromRaw(unitDir(unitRec.unit), partialSaved);
      if (partialExpanded.length) {
        const org = organizeLessonFiles(unitRec.unit, partialExpanded);
        unitRec.page_count = Math.max(unitRec.page_count || 0, org.pageCount);
        unitRec.lessons_complete = Math.max(unitRec.lessons_complete || 0, org.lessonsComplete);
        saveStatus(status);
      }
      console.log(`[poll] Unit ${unitRec.unit} still ${st.agent_status}`);
      return;
    }

    if (st && (st.agent_status === 'stopped' || st.agent_status === 'error')) {
      const recheck = await listMessages(taskId, { order: 'desc', limit: 30, allowMissing: true });
      const stRecheck = latestAgentStatus(recheck.messages || []);
      if (stRecheck && (stRecheck.agent_status === 'running' || stRecheck.agent_status === 'pending')) {
        console.log(`[poll] Unit ${unitRec.unit} transient stopped; still active`);
        const partialSaved = await downloadAll(recheck.messages || [], unitDir(unitRec.unit));
        const partialExpanded = expandSavedFromRaw(unitDir(unitRec.unit), partialSaved);
        if (partialExpanded.length) {
          const org = organizeLessonFiles(unitRec.unit, partialExpanded);
          unitRec.page_count = Math.max(unitRec.page_count || 0, org.pageCount);
          unitRec.lessons_complete = Math.max(unitRec.lessons_complete || 0, org.lessonsComplete);
          saveStatus(status);
        }
        return;
      }
      const result = await pollUntilDone(taskId, {
        intervalMs: POLL_MS,
        timeoutMs: 120_000,
      });
      const messages = result.messages || snap.messages || [];
      const saved = await downloadAll(messages, unitDir(unitRec.unit));
      const savedExpanded = expandSavedFromRaw(unitDir(unitRec.unit), saved);
      const org = organizeLessonFiles(unitRec.unit, savedExpanded);
      const unitBrief = briefs.units.find((u) => u.unit === unitRec.unit);
      if (unitBrief) writeLessonMetadata(unitBrief, unitRec, org);

      fs.writeFileSync(
        path.join(unitDir(unitRec.unit), 'production-notes.md'),
        [
          `# Unit ${unitRec.unit} production`,
          '',
          `Task: ${taskId}`,
          `URL: ${unitRec.manus_task_url}`,
          `Agent status: ${result.agent_status}`,
          `Downloaded files: ${savedExpanded.length}`,
          `Organized pages: ${org.pageCount}`,
          `Lessons with ≥8 pages: ${org.lessonsComplete}`,
          '',
          '## Assistant excerpts',
          '',
          ...(result.assistant_messages || []).slice(0, 3).map((t) => String(t).slice(0, 2000)),
          '',
        ].join('\n'),
      );

      unitRec.page_count = org.pageCount;
      unitRec.lessons_complete = org.lessonsComplete;
      unitRec.quality_self_ratings = extractQualityRatings(messages);
      unitRec.finished_at = nowIso();

      if (result.agent_status === 'error') {
        unitRec.status = org.lessonsComplete >= 4 ? 'RETRY_NEEDED' : 'FAILED';
        unitRec.error = 'Manus agent_status=error';
      } else if (org.lessonsComplete >= 5 && org.pageCount >= 45) {
        unitRec.status = 'COMPLETE';
      } else if (org.lessonsComplete >= 1 || org.pageCount >= 10) {
        unitRec.status = 'RETRY_NEEDED';
        unitRec.error = `Incomplete harvest: ${org.lessonsComplete} lessons, ${org.pageCount} pages`;
      } else if (savedExpanded.some((f) => /\.zip$|lesson-0[1-5]\.pdf/i.test(f.filename || f.path || ''))) {
        unitRec.status = 'RETRY_NEEDED';
        unitRec.error = `Deliverables present but pages not harvested (${savedExpanded.length} files)`;
      } else {
        unitRec.status = 'FAILED';
        unitRec.error = `No usable pages downloaded (${savedExpanded.length} files)`;
      }
      saveStatus(status);
      console.log(`[done] Unit ${unitRec.unit} → ${unitRec.status} pages=${org.pageCount}`);
      return;
    }

    console.log(`[poll] Unit ${unitRec.unit} status=${(st && st.agent_status) || 'unknown'}`);
  } catch (err) {
    console.error(`[poll] Unit ${unitRec.unit} error: ${err.message}`);
    if (err.code === 'WAITING') {
      unitRec.error = err.message;
      saveStatus(status);
      return;
    }
    // Don't fail the unit on transient poll errors
  }
}

async function fillCapacity(status, briefs) {
  const running = status.units.filter((u) => u.status === 'RUNNING');
  let slots = MAX_CONCURRENT - running.length;
  if (slots <= 0) return 0;
  const queue = status.units.filter((u) => u.status === 'QUEUED' || u.status === 'RETRY_NEEDED');
  let launched = 0;
  for (const unitRec of queue) {
    if (slots <= 0) break;

    if (unitRec.manus_task_id && unitRec.status === 'RUNNING') {
      console.log(`[fire] Unit ${unitRec.unit} already RUNNING task=${unitRec.manus_task_id}; skip createTask`);
      continue;
    }

    if (unitRec.status === 'RETRY_NEEDED' && unitRec.manus_task_id) {
      const phase = await manusTaskPhase(unitRec.manus_task_id);
      if (phase === 'running' || phase === 'pending' || phase === 'waiting') {
        console.log(
          `[fire] Unit ${unitRec.unit} RETRY_NEEDED but task ${unitRec.manus_task_id} still ${phase}; resume poll`,
        );
        unitRec.status = 'RUNNING';
        unitRec.error = unitRec.error || `Resuming existing Manus task (${phase})`;
        saveStatus(status);
        continue;
      }
      if (unitHasUsableDeliverables(unitRec.unit)) {
        console.log(
          `[fire] Unit ${unitRec.unit} RETRY_NEEDED but local deliverables exist; skip new task (harvest via poll)`,
        );
        unitRec.status = 'RUNNING';
        saveStatus(status);
        continue;
      }
      unitRec.retries = (unitRec.retries || 0) + 1;
      if (unitRec.retries > 2) {
        unitRec.status = 'FAILED';
        saveStatus(status);
        continue;
      }
      console.log(
        `[fire] Unit ${unitRec.unit} prior task ${unitRec.manus_task_id} inactive (${phase}); new Manus session`,
      );
      unitRec.manus_task_id = null;
      unitRec.manus_task_url = null;
    } else if (unitRec.status === 'RETRY_NEEDED') {
      unitRec.retries = (unitRec.retries || 0) + 1;
      if (unitRec.retries > 2) {
        unitRec.status = 'FAILED';
        saveStatus(status);
        continue;
      }
    }
    try {
      await launchUnit(status, briefs, unitRec);
      launched += 1;
      slots -= 1;
      await new Promise((r) => setTimeout(r, 4000));
    } catch (err) {
      console.error(`[fire] Unit ${unitRec.unit} failed: ${err.message}`);
      unitRec.status = 'FAILED';
      unitRec.error = err.message;
      saveStatus(status);
    }
  }
  return launched;
}

function initFactory() {
  ensurePauseFlag();
  apiKey(); // fail fast if missing
  const briefs = loadBriefs();
  for (const u of briefs.units) writeUnitBriefFile(u);
  let status = loadStatus();
  if (!status) {
    status = emptyStatus(briefs);
  } else {
    // Preserve existing RUNNING/COMPLETE; only ensure all planned units exist
    const byNum = new Map(status.units.map((u) => [u.unit, u]));
    for (const u of briefs.units) {
      if (!byNum.has(u.unit)) {
        status.units.push({
          unit: u.unit,
          slug: u.slug,
          title: u.title,
          world: u.world,
          status: 'QUEUED',
          manus_task_id: null,
          manus_task_url: null,
          launched_at: null,
          finished_at: null,
          lessons_complete: 0,
          page_count: 0,
          quality_self_ratings: [],
          master_path: `manus-lessons/${CEFR}/unit-${String(u.unit).padStart(2, '0')}/`,
          error: null,
          retries: 0,
        });
      }
    }
    status.max_concurrent = MAX_CONCURRENT;
    status.agent_profile = AGENT_PROFILE;
    status.board_loops_paused = true;
  }
  saveStatus(status);
  console.log(`[init] ${status.totals.units_planned} units planned; pause flag set; ledger written`);
  return status;
}

async function runFactory() {
  acquireFactoryRunLock();
  const briefs = loadBriefs();
  let status = initFactory();
  console.log(`[run] max_concurrent=${MAX_CONCURRENT} profile=${AGENT_PROFILE}`);

  while (true) {
    status = loadStatus() || status;
    await fillCapacity(status, briefs);
    status = loadStatus() || status;

    const running = status.units.filter((u) => u.status === 'RUNNING');
    for (const unitRec of running) {
      await pollUnit(status, briefs, unitRec);
      status = loadStatus() || status;
    }

    status = loadStatus() || status;
    const pending = status.units.some(
      (u) => u.status === 'QUEUED' || u.status === 'RUNNING' || u.status === 'RETRY_NEEDED',
    );
    if (!pending) {
      console.log('[run] Queue exhausted. Factory idle.');
      saveStatus(status);
      break;
    }

    // Safety: abandon units running longer than UNIT_TIMEOUT_MS
    const now = Date.now();
    for (const u of status.units.filter((x) => x.status === 'RUNNING' && x.launched_at)) {
      if (now - Date.parse(u.launched_at) > UNIT_TIMEOUT_MS) {
        console.error(`[timeout] Unit ${u.unit} exceeded ${UNIT_TIMEOUT_MS}ms`);
        u.status = 'RETRY_NEEDED';
        u.error = 'unit timeout';
        saveStatus(status);
      }
    }

    console.log(
      `[loop] running=${status.totals.units_running} queued=${status.totals.units_queued} complete=${status.totals.units_complete} pages=${status.totals.total_pages_complete}`,
    );
    await new Promise((r) => setTimeout(r, LOOP_SLEEP_MS));
  }
}

async function pollOnce() {
  const briefs = loadBriefs();
  const status = loadStatus() || initFactory();
  for (const unitRec of status.units.filter((u) => u.status === 'RUNNING')) {
    await pollUnit(status, briefs, unitRec);
  }
  await fillCapacity(loadStatus() || status, briefs);
}

function printStatus() {
  const status = loadStatus();
  if (!status) {
    console.log('No factory status yet. Run --init or --run');
    return;
  }
  console.log(JSON.stringify(status.totals, null, 2));
  for (const u of status.units) {
    console.log(
      `U${String(u.unit).padStart(2, '0')} ${u.status.padEnd(12)} lessons=${u.lessons_complete || 0} pages=${u.page_count || 0} ${u.title}`,
    );
  }
}

async function main() {
  if (argFlag('status')) {
    printStatus();
    return;
  }
  if (argFlag('init')) {
    initFactory();
    return;
  }
  if (argFlag('poll-once')) {
    await pollOnce();
    return;
  }
  if (argFlag('run') || process.argv.length <= 2) {
    await runFactory();
    return;
  }
  console.log('Usage: node scripts/manus/lesson-factory.mjs [--cefr=A1|A2] [--briefs=...] [--lib=...] --init|--run|--poll-once|--status');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
