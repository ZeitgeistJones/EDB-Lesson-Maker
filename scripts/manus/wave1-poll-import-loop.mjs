/**
 * CEFR-J wave1: poll Manus tasks, CDN-pull PNGs, stage into inboxes, import as ready.
 *   node scripts/manus/wave1-poll-import-loop.mjs
 *   node scripts/manus/wave1-poll-import-loop.mjs --once
 *   node scripts/manus/wave1-poll-import-loop.mjs --maxMinutes=40
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ROOT, apiKey, listMessages, latestAgentStatus } from './client.mjs';

const ONCE = process.argv.includes('--once');
const maxMinutes = Number(
  (process.argv.find((a) => a.startsWith('--maxMinutes=')) || '--maxMinutes=40').slice(13)
);
const intervalMs = Number(
  (process.argv.find((a) => a.startsWith('--intervalMs=')) || '--intervalMs=90000').slice(13)
);

// Canonical IDs after blast audit (2026-08-16). Superseded / also-ok IDs live on each taskN/run.json.
const TASKS = [
  {
    label: 'n1',
    taskNo: 1,
    id: 'fC9oognx5iTEkcFLY9pMZn', // superseded: YWnz39PPMpSWqMzCjXCXoq (empty)
    kind: 'nouns',
    fetchOut: 'tmp/cefrj-manus/fetch-nouns-w1-t1',
    inboxTask: 'assets-inbox/manus-cefrj-nouns-w1/task1',
    expectSheets: 11,
  },
  {
    label: 'n2',
    taskNo: 2,
    id: 'fEuja8Kt2TR2Mnkodn7n2W', // also-ok: m2MXrPd63XSpAisndwBJsG
    kind: 'nouns',
    fetchOut: 'tmp/cefrj-manus/fetch-nouns-w1-t2',
    inboxTask: 'assets-inbox/manus-cefrj-nouns-w1/task2',
    expectSheets: 11,
  },
  {
    label: 'n3',
    taskNo: 3,
    id: 'YSB3NyimFhC9yDEdbWosYJ', // continue-in-task; superseded empty: WGc6Fc8Nvg7NeLyahRj4H6
    kind: 'nouns',
    fetchOut: 'tmp/cefrj-manus/fetch-nouns-w1-t3',
    inboxTask: 'assets-inbox/manus-cefrj-nouns-w1/task3',
    expectSheets: 11,
  },
  {
    label: 'n4',
    taskNo: 4,
    id: 'eVegWP4zwWEZkQdzXW5ez5', // superseded: VprmqRsPxmj7SiYY34K5JH (empty), XGKEgAG4ch9nFUgz5TUEcY (accidental)
    kind: 'nouns',
    fetchOut: 'tmp/cefrj-manus/fetch-nouns-w1-t4',
    inboxTask: 'assets-inbox/manus-cefrj-nouns-w1/task4',
    expectSheets: 11,
  },
  {
    label: 'n5',
    taskNo: 5,
    id: 'Bgc4k7SMJxSK6dF5w86Nbo', // also-ok: cVkwdaeanyAA8DtCQZ2Eyf
    kind: 'nouns',
    fetchOut: 'tmp/cefrj-manus/fetch-nouns-w1-t5',
    inboxTask: 'assets-inbox/manus-cefrj-nouns-w1/task5',
    expectSheets: 11,
  },
  {
    label: 'n6',
    taskNo: 6,
    id: 'Ww6HXKqY9RSxFuPtgtz3TX', // also-ok: ckTHW4o6mUXgUaAx9miRSb
    kind: 'nouns',
    fetchOut: 'tmp/cefrj-manus/fetch-nouns-w1-t6',
    inboxTask: 'assets-inbox/manus-cefrj-nouns-w1/task6',
    expectSheets: 3,
  },
  {
    label: 'v1',
    taskNo: 10,
    id: '8kn5SdG2HRbUkAmsGdPeGw', // also-ok: 4zhL6Mni6QMSdQEpKVnjFq
    kind: 'verbs',
    fetchOut: 'tmp/cefrj-manus/fetch-verbs-w1',
    inboxTask: 'assets-inbox/manus-cefrj-verbs-w1',
    expectSheets: 4,
  },
];

const importedNounTasks = new Set();
const importedVerbs = { done: false };
const statePath = path.join(ROOT, 'tmp', 'cefrj-manus', 'wave1-loop-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { importedNounTasks: [], verbsImported: false };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
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

function themeFromName(name) {
  const m = String(name).match(/cefrj-(?:nouns|verbs)-\d+/i);
  return m ? m[0].toLowerCase() : null;
}

function stageUnique(fetchDir, inboxDir) {
  fs.mkdirSync(inboxDir, { recursive: true });
  const byTheme = new Map();
  for (const f of fs.readdirSync(fetchDir)) {
    if (!/\.png$/i.test(f)) continue;
    const theme = themeFromName(f);
    if (!theme) continue;
    byTheme.set(theme, path.join(fetchDir, f));
  }
  const staged = [];
  for (const [theme, src] of [...byTheme.entries()].sort()) {
    const dest = path.join(inboxDir, `esl_${theme}.png`);
    fs.copyFileSync(src, dest);
    staged.push({ theme, dest });
  }
  return staged;
}

async function pullTask(task) {
  const page = await listMessages(task.id, { order: 'asc', limit: 100, allowMissing: true });
  const messages = page.messages || [];
  const st = latestAgentStatus([...messages].reverse());
  const status = (st && st.agent_status) || null;
  const images = collectImages(messages);
  const outDir = path.join(ROOT, task.fetchOut);
  fs.mkdirSync(outDir, { recursive: true });

  // Dedupe by filename (Manus often re-attaches)
  const seen = new Map();
  for (const img of images) {
    seen.set(img.name, img.url);
  }
  let downloaded = 0;
  let i = 0;
  for (const [name, url] of seen.entries()) {
    i += 1;
    const safe = String(name).replace(/[^\w.\-]+/g, '_').slice(0, 80) || `sheet-${i}.png`;
    const dest = path.join(outDir, `${String(i).padStart(2, '0')}-${safe}`);
    try {
      await download(url, dest);
      downloaded += 1;
    } catch (err) {
      console.error(`FAIL ${task.label} ${safe}:`, err.message || err);
    }
  }
  const uniqueThemes = new Set(
    [...seen.keys()].map(themeFromName).filter(Boolean)
  );
  return {
    label: task.label,
    status,
    imageAtts: images.length,
    uniqueThemes: uniqueThemes.size,
    downloaded,
    // stopped/error with ZERO themes = failed Perfect-N — do not import / do not mark ready
    ready:
      uniqueThemes.size >= task.expectSheets ||
      ((status === 'stopped' || status === 'error') && uniqueThemes.size > 0),
  };
}

function importNouns(taskNo) {
  const r = spawnSync(
    process.execPath,
    ['scripts/manus/import-cefrj-nouns-wave1.mjs', `--task=${taskNo}`],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

function importVerbs() {
  const r = spawnSync(
    process.execPath,
    [
      'scripts/manus/import-picturable-verbs.mjs',
      '--wave=10',
      '--inbox=assets-inbox/manus-cefrj-verbs-w1',
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

async function tick(state) {
  apiKey();
  const rows = [];
  for (const task of TASKS) {
    const pulled = await pullTask(task);
    rows.push(pulled);
    console.log(JSON.stringify(pulled));

    if (task.kind === 'nouns') {
      if (state.importedNounTasks.includes(task.taskNo)) continue;
      if (!pulled.ready && pulled.uniqueThemes === 0) continue;
      // Stage whatever we have; importer matches by theme and skips unmatched.
      if (pulled.uniqueThemes > 0) {
        const staged = stageUnique(
          path.join(ROOT, task.fetchOut),
          path.join(ROOT, task.inboxTask)
        );
        console.log(
          JSON.stringify({
            phase: 'staged',
            label: task.label,
            count: staged.length,
            themes: staged.map((s) => s.theme),
          })
        );
      }
      if (pulled.ready) {
        console.log(`Importing nouns task ${task.taskNo}…`);
        const ok = importNouns(task.taskNo);
        if (ok) {
          state.importedNounTasks.push(task.taskNo);
          saveState(state);
        }
      }
    } else if (task.kind === 'verbs') {
      if (state.verbsImported) continue;
      if (pulled.uniqueThemes > 0) {
        const staged = stageUnique(
          path.join(ROOT, task.fetchOut),
          path.join(ROOT, task.inboxTask)
        );
        console.log(
          JSON.stringify({
            phase: 'staged',
            label: task.label,
            count: staged.length,
            themes: staged.map((s) => s.theme),
          })
        );
      }
      if (pulled.ready) {
        console.log('Importing verbs wave 10…');
        const ok = importVerbs();
        if (ok) {
          state.verbsImported = true;
          saveState(state);
        }
      }
    }
  }

  const cooking = rows.filter((r) => !r.ready).map((r) => r.label);
  const allDone =
    state.importedNounTasks.length >= 6 && state.verbsImported === true;
  fs.writeFileSync(
    path.join(ROOT, 'tmp', 'cefrj-manus', 'wave1-poll-snapshot.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        cooking,
        importedNounTasks: state.importedNounTasks,
        verbsImported: state.verbsImported,
        rows,
      },
      null,
      2
    ) + '\n'
  );
  return { cooking, allDone, rows };
}

const state = loadState();
// Seed known-imported tasks from pack keys when possible (tolerant of concurrent index writes).
function tryLoadIndex() {
  const idx = path.join(ROOT, 'public', 'assets', '07_vocab-pack', 'index.json');
  if (!fs.existsSync(idx)) return null;
  try {
    return JSON.parse(fs.readFileSync(idx, 'utf8'));
  } catch {
    return null;
  }
}
const indexSeed = tryLoadIndex();
if (indexSeed) {
  if (!state.importedNounTasks.includes(6) && indexSeed['tour-guide'] && indexSeed.zone) {
    state.importedNounTasks.push(6);
  }
  if (!state.importedNounTasks.includes(3) && indexSeed.countryside && indexSeed.drawing) {
    state.importedNounTasks.push(3);
  }
  if (!state.importedNounTasks.includes(5) && indexSeed['cefrj-seed-skip'] !== true) {
    // task5 ends around sheets 45–55; probe a mid key from plan when present
  }
  if (!state.verbsImported) {
    const verbs = ['add', 'beg', 'spell', 'work', 'perform'];
    if (verbs.every((k) => indexSeed[k])) state.verbsImported = true;
  }
  saveState(state);
}

const started = Date.now();
while (true) {
  console.log(`\n=== tick ${new Date().toISOString()} ===`);
  const { cooking, allDone } = await tick(state);
  if (allDone) {
    console.log(JSON.stringify({ phase: 'all-imported' }));
    process.exit(0);
  }
  if (ONCE) {
    console.log(JSON.stringify({ phase: 'once-done', cooking }));
    process.exit(0);
  }
  if ((Date.now() - started) / 60000 >= maxMinutes) {
    console.log(JSON.stringify({ phase: 'timeout', cooking }));
    process.exit(2);
  }
  console.log(`cooking=${cooking.join(',') || 'none'}; sleep ${intervalMs}ms`);
  await new Promise((r) => setTimeout(r, intervalMs));
}
