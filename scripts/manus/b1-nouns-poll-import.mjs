/**
 * Poll/import CEFR-J B1 nouns.
 * Per-task import as soon as a task is ready. Optionally fill ≤3 createTask slots.
 *
 *   node scripts/manus/b1-nouns-poll-import.mjs
 *   node scripts/manus/b1-nouns-poll-import.mjs --once
 *   node scripts/manus/b1-nouns-poll-import.mjs --orchestrate --maxMinutes=180
 *   node scripts/manus/b1-nouns-poll-import.mjs --task=1
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT, apiKey, listMessages, latestAgentStatus } from './client.mjs';

const ONCE = process.argv.includes('--once');
const ORCHESTRATE = process.argv.includes('--orchestrate');
const maxMinutes = Number(
  (process.argv.find((a) => a.startsWith('--maxMinutes=')) || '--maxMinutes=180').slice(13)
);
const intervalMs = Number(
  (process.argv.find((a) => a.startsWith('--intervalMs=')) || '--intervalMs=60000').slice(13)
);
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();

const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-nouns-b1');
const INBOX = path.join(ROOT, 'assets-inbox', 'manus-cefrj-nouns-b1');
const STATE_PATH = path.join(ROOT, 'tmp', 'cefrj-manus', 'b1-nouns-loop-state.json');
const LOCK_PATH = path.join(ROOT, 'tmp', 'cefrj-manus', 'b1-nouns-import.lock');
const PLAN_PATH = path.join(OUT_ROOT, 'plan.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { importedTasks: [], importedThemes: [], allImported: false, failedTasks: [] };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function acquireLock() {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  try {
    if (fs.existsSync(LOCK_PATH)) {
      const raw = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
      const age = Date.now() - new Date(raw.at || 0).getTime();
      if (age < 10 * 60 * 1000 && raw.pid && raw.pid !== process.pid) {
        try {
          process.kill(raw.pid, 0);
          return false;
        } catch {
          /* stale */
        }
      }
    }
    fs.writeFileSync(
      LOCK_PATH,
      JSON.stringify({ at: new Date().toISOString(), pid: process.pid, owner: 'b1-nouns-poll-import' }, null, 2)
    );
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      const raw = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
      if (raw.pid === process.pid) fs.unlinkSync(LOCK_PATH);
    }
  } catch {
    /* ignore */
  }
}

function collectImages(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      const name = a.file_name || a.filename || a.name || 'sheet.png';
      const mime = String(a.mime_type || a.content_type || '');
      if (url && (/png|jpeg|jpg|webp/i.test(mime) || /\.(png|jpe?g|webp)$/i.test(name) || !mime)) {
        hits.push({ name, url });
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

function discoverTasks() {
  if (!fs.existsSync(OUT_ROOT)) return [];
  const out = [];
  for (const ent of fs.readdirSync(OUT_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || !/^task\d+$/i.test(ent.name)) continue;
    const runPath = path.join(OUT_ROOT, ent.name, 'run.json');
    if (!fs.existsSync(runPath)) continue;
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    if (!run.task_id || run.dry_run) continue;
    const taskNo = Number(ent.name.replace(/\D/g, ''));
    const sheets = run.sheets || [];
    out.push({
      label: `b1n-t${taskNo}`,
      taskNo,
      id: run.task_id,
      expectSheets: sheets.length || run.sheet_count || 1,
      fetchOut: path.join(OUT_ROOT, ent.name, 'fetch'),
      runPath,
      sheets,
      keys: run.keys || [],
    });
  }
  return out.sort((a, b) => a.taskNo - b.taskNo);
}

function plannedTaskCount() {
  try {
    return Number(JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8')).taskCount) || 0;
  } catch {
    return 0;
  }
}

function listFetchPngsOrdered(fetchDir) {
  if (!fs.existsSync(fetchDir)) return [];
  return fs
    .readdirSync(fetchDir)
    .filter((f) => /\.png$/i.test(f))
    .map((f) => {
      const full = path.join(fetchDir, f);
      let ord = 9999;
      const m1 = f.match(/^(\d+)-/);
      const m2 = f.match(/sheet[_-]?(\d+)/i);
      if (m1) ord = Number(m1[1]);
      else if (m2) ord = Number(m2[1]);
      return { f, full, ord };
    })
    .sort((a, b) => a.ord - b.ord || a.f.localeCompare(b.f));
}

function stageByPlanOrder(task) {
  fs.mkdirSync(INBOX, { recursive: true });
  const pngs = listFetchPngsOrdered(task.fetchOut);
  const sheets = task.sheets || [];
  if (!sheets.length) return [];
  if (pngs.length < sheets.length) {
    console.error(
      JSON.stringify({
        phase: 'stage-short',
        label: task.label,
        pngs: pngs.length,
        need: sheets.length,
      })
    );
  }
  const staged = [];
  const n = Math.min(pngs.length, sheets.length);
  for (let i = 0; i < n; i++) {
    const theme = String(sheets[i].theme).toLowerCase();
    const dest = path.join(INBOX, `esl_${theme}.png`);
    fs.copyFileSync(pngs[i].full, dest);
    staged.push({ theme, from: pngs[i].f, keys: (sheets[i].keys || []).length });
  }
  return staged;
}

async function pullTask(task) {
  const page = await listMessages(task.id, { order: 'asc', limit: 100, allowMissing: true });
  const messages = page.messages || [];
  const st = latestAgentStatus([...messages].reverse());
  const status = (st && st.agent_status) || null;
  const images = collectImages(messages);
  fs.mkdirSync(task.fetchOut, { recursive: true });

  const seen = new Map();
  for (const img of images) seen.set(img.name, img.url);

  let downloaded = 0;
  let i = 0;
  for (const [name, url] of seen.entries()) {
    i += 1;
    const safe = String(name).replace(/[^\w.\-]+/g, '_').slice(0, 80) || `sheet-${i}.png`;
    const dest = path.join(task.fetchOut, `${String(i).padStart(2, '0')}-${safe}`);
    try {
      await download(url, dest);
      downloaded += 1;
    } catch (err) {
      console.error(`FAIL ${task.label} ${safe}:`, err.message || err);
    }
  }
  const ordered = listFetchPngsOrdered(task.fetchOut);
  return {
    label: task.label,
    taskNo: task.taskNo,
    status,
    imageAtts: images.length,
    fetchPngs: ordered.length,
    downloaded,
    ready:
      ordered.length >= task.expectSheets ||
      ((status === 'stopped' || status === 'error') && ordered.length > 0),
    failed: (status === 'stopped' || status === 'error') && ordered.length === 0,
  };
}

function importTaskThemes(task, themes) {
  const r = spawnSync(
    process.execPath,
    [
      'scripts/manus/import-cefrj-nouns-b1.mjs',
      `--task=${task.taskNo}`,
      `--inbox=${path.relative(ROOT, INBOX).replace(/\\/g, '/')}`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return { ok: r.status === 0, themes, status: r.status };
}

function fillSlots(state) {
  if (!ORCHESTRATE) return { filled: 0 };
  const done = [...new Set([...(state.importedTasks || []), ...(state.failedTasks || [])])];
  const args = [
    'scripts/manus/request-shift60-cefrj-nouns-b1.mjs',
    '--send',
    '--fill-slots',
    '--maxInFlight=3',
  ];
  if (done.length) args.push(`--done-tasks=${done.join(',')}`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return { filled: r.status === 0 ? 1 : 0, status: r.status };
}

async function tick(state) {
  if (ORCHESTRATE) fillSlots(state);

  apiKey();
  let tasks = discoverTasks();
  if (TASK_FILTER) tasks = tasks.filter((t) => t.taskNo === TASK_FILTER);
  if (!tasks.length) {
    console.error('No sent tasks found under', OUT_ROOT);
    return { cooking: [], allDone: false, rows: [], failed: [] };
  }

  const rows = [];
  for (const task of tasks) {
    const pulled = await pullTask(task);
    rows.push(pulled);
    console.log(JSON.stringify(pulled));

    if (pulled.failed && !state.failedTasks.includes(task.taskNo)) {
      state.failedTasks.push(task.taskNo);
      saveState(state);
    }

    if (state.importedTasks.includes(task.taskNo)) continue;
    if (!pulled.ready) continue;

    const staged = stageByPlanOrder(task);
    console.log(
      JSON.stringify({
        phase: 'staged-by-plan',
        label: task.label,
        count: staged.length,
        themes: staged.map((s) => s.theme),
      })
    );

    if (!staged.length) continue;
    if (!acquireLock()) {
      console.log(JSON.stringify({ phase: 'import-skipped-lock', label: task.label }));
      continue;
    }
    try {
      console.log(`Importing nouns B1 (task ${task.taskNo})…`);
      const result = importTaskThemes(
        task,
        staged.map((s) => s.theme)
      );
      if (result.ok) {
        state.importedTasks.push(task.taskNo);
        state.importedThemes = [
          ...new Set([...(state.importedThemes || []), ...staged.map((s) => s.theme)]),
        ];
        const planCount = plannedTaskCount();
        const allNos = planCount
          ? Array.from({ length: planCount }, (_, i) => i + 1)
          : discoverTasks().map((t) => t.taskNo);
        state.allImported = allNos.every((n) => state.importedTasks.includes(n));
        saveState(state);
        console.log(
          JSON.stringify({
            phase: 'imported-task',
            taskNo: task.taskNo,
            themes: staged.map((s) => s.theme),
            allImported: state.allImported,
          })
        );
      } else {
        console.error(JSON.stringify({ phase: 'import-failed', taskNo: task.taskNo, status: result.status }));
      }
    } finally {
      releaseLock();
    }
  }

  if (ORCHESTRATE) fillSlots(state);

  const failed = rows.filter((r) => r.failed).map((r) => r.label);
  const cooking = rows.filter((r) => !r.ready && !r.failed).map((r) => r.label);

  fs.writeFileSync(
    path.join(ROOT, 'tmp', 'cefrj-manus', 'b1-nouns-poll-snapshot.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        cooking,
        failed,
        importedTasks: state.importedTasks,
        importedThemes: state.importedThemes,
        allImported: state.allImported,
        rows,
      },
      null,
      2
    ) + '\n'
  );

  return {
    cooking,
    failed,
    allDone: state.allImported === true,
    rows,
  };
}

const state = loadState();
const started = Date.now();
while (true) {
  console.log(`\n=== tick ${new Date().toISOString()} ===`);
  const { cooking, failed, allDone, rows } = await tick(state);
  if (allDone) {
    console.log(JSON.stringify({ phase: 'all-imported', rows, importedThemes: state.importedThemes }));
    process.exit(0);
  }
  if (ONCE) {
    console.log(JSON.stringify({ phase: 'once-done', cooking, failed, importedTasks: state.importedTasks }));
    process.exit(0);
  }
  if (failed.length && !cooking.length) {
    const planCount = plannedTaskCount();
    const sent = discoverTasks().length;
    if (planCount && sent < planCount && ORCHESTRATE) {
      // keep filling
    } else if (!ORCHESTRATE || sent >= planCount) {
      console.log(JSON.stringify({ phase: 'all-failed', failed }));
      process.exit(2);
    }
  }
  if ((Date.now() - started) / 60000 >= maxMinutes) {
    console.log(JSON.stringify({ phase: 'timeout', cooking, failed, importedTasks: state.importedTasks }));
    process.exit(2);
  }
  console.log(
    `cooking=${cooking.join(',') || 'none'}; failed=${failed.join(',') || 'none'}; imported=${state.importedTasks.join(',') || 'none'}; sleep ${intervalMs}ms`
  );
  await new Promise((r) => setTimeout(r, intervalMs));
}
