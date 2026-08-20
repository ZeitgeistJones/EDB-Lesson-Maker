/**
 * Poll/import CEFR-J wave1 QUALITY REDO Manus tasks.
 * Cap: only watches redo OUT_ROOT tasks (not the original blast).
 *
 *   node scripts/manus/wave1-quality-redo-poll-import.mjs
 *   node scripts/manus/wave1-quality-redo-poll-import.mjs --once
 *   node scripts/manus/wave1-quality-redo-poll-import.mjs --maxMinutes=25
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ROOT, apiKey, listMessages, latestAgentStatus } from './client.mjs';

const ONCE = process.argv.includes('--once');
const maxMinutes = Number(
  (process.argv.find((a) => a.startsWith('--maxMinutes=')) || '--maxMinutes=25').slice(13)
);
const intervalMs = Number(
  (process.argv.find((a) => a.startsWith('--intervalMs=')) || '--intervalMs=60000').slice(13)
);

const NOUN_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-nouns-wave1-quality-redo');
const VERB_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-wave10-quality-redo');
const STATE_PATH = path.join(ROOT, 'tmp', 'cefrj-manus', 'wave1-quality-redo-loop-state.json');

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    // Migrate legacy single-flag → per-slug list (V03 already imported last shift).
    if (!Array.isArray(raw.importedVerbSlugs)) {
      raw.importedVerbSlugs = raw.verbsImported ? ['task-v03'] : [];
    }
    return raw;
  } catch {
    return { importedNounTasks: [], importedVerbSlugs: [], verbsImported: false };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
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

function discoverNounTasks() {
  if (!fs.existsSync(NOUN_ROOT)) return [];
  const out = [];
  for (const ent of fs.readdirSync(NOUN_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || !/^task\d+$/i.test(ent.name)) continue;
    const runPath = path.join(NOUN_ROOT, ent.name, 'run.json');
    if (!fs.existsSync(runPath)) continue;
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    if (!run.task_id || run.dry_run) continue;
    const taskNo = Number(ent.name.replace(/\D/g, ''));
    const expectSheets = (run.sheets || []).length || run.sheet_count || 1;
    // Stage into original wave1 inbox folders by wave1TaskNo when present
    const wave1Nos = [
      ...new Set((run.sheets || []).map((s) => s.wave1TaskNo).filter(Boolean)),
    ];
    out.push({
      kind: 'nouns',
      label: `qr-n${taskNo}`,
      taskNo,
      id: run.task_id,
      expectSheets,
      fetchOut: path.join(NOUN_ROOT, ent.name, 'fetch'),
      runSheets: run.sheets || [],
      wave1Nos,
      sheetIds: (run.sheets || []).map((s) => s.id),
      themes: (run.sheets || []).map((s) => s.theme),
    });
  }
  return out.sort((a, b) => a.taskNo - b.taskNo);
}

function discoverVerbTasks() {
  if (!fs.existsSync(VERB_ROOT)) return [];
  const out = [];
  const seenIds = new Set();

  // Prefer task-* subdirs (V01 / V03 sent separately without overwrite).
  for (const ent of fs.readdirSync(VERB_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || !/^task-/i.test(ent.name)) continue;
    const runPath = path.join(VERB_ROOT, ent.name, 'run.json');
    if (!fs.existsSync(runPath)) continue;
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    if (!run.task_id || run.dry_run) continue;
    seenIds.add(run.task_id);
    out.push({
      kind: 'verbs',
      label: `qr-v-${ent.name.replace(/^task-/i, '')}`,
      slug: ent.name,
      taskNo: 10,
      id: run.task_id,
      expectSheets: (run.sheets || []).length || 1,
      fetchOut: path.join(VERB_ROOT, ent.name, 'fetch'),
      inboxTask: path.join(ROOT, 'assets-inbox', 'manus-cefrj-verbs-w1'),
      themes: (run.sheets || []).map((s) => s.theme),
    });
  }

  // Legacy single OUT_ROOT/run.json (pre multi-task layout).
  const legacyPath = path.join(VERB_ROOT, 'run.json');
  if (fs.existsSync(legacyPath)) {
    const run = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    if (run.task_id && !run.dry_run && !seenIds.has(run.task_id)) {
      const sheetIds = (run.sheets || []).map((s) => String(s.id || '').toLowerCase()).filter(Boolean);
      const slug = run.task_slug || `task-${sheetIds.join('-') || 'legacy'}`;
      out.push({
        kind: 'verbs',
        label: `qr-v-${slug.replace(/^task-/i, '')}`,
        slug,
        taskNo: 10,
        id: run.task_id,
        expectSheets: (run.sheets || []).length || 1,
        fetchOut: path.join(VERB_ROOT, 'fetch'),
        inboxTask: path.join(ROOT, 'assets-inbox', 'manus-cefrj-verbs-w1'),
        themes: (run.sheets || []).map((s) => s.theme),
      });
    }
  }
  return out;
}

function stageByWave1Task(fetchDir, runSheets) {
  if (!fs.existsSync(fetchDir)) return [];
  const byTheme = new Map();
  for (const f of fs.readdirSync(fetchDir)) {
    if (!/\.png$/i.test(f)) continue;
    const theme = themeFromName(f);
    if (!theme) continue;
    byTheme.set(theme, path.join(fetchDir, f));
  }
  const staged = [];
  for (const sheet of runSheets || []) {
    const theme = String(sheet.theme || '').toLowerCase();
    const src = byTheme.get(theme);
    if (!src) continue;
    const wave1 = sheet.wave1TaskNo;
    if (!wave1) continue;
    const inboxDir = path.join(ROOT, 'assets-inbox', 'manus-cefrj-nouns-w1', `task${wave1}`);
    fs.mkdirSync(inboxDir, { recursive: true });
    // Drop old blast / prior stage copies of this theme so the importer can't pick them.
    for (const f of fs.readdirSync(inboxDir)) {
      if (!/\.png$/i.test(f)) continue;
      if (themeFromName(f) === theme || String(f).toLowerCase().includes(theme)) {
        fs.unlinkSync(path.join(inboxDir, f));
      }
    }
    const dest = path.join(inboxDir, `esl_${theme}.png`);
    fs.copyFileSync(src, dest);
    staged.push({ theme, dest, wave1TaskNo: wave1, sheetId: sheet.id });
  }
  return staged;
}

function stageUnique(fetchDir, inboxDir) {
  fs.mkdirSync(inboxDir, { recursive: true });
  if (!fs.existsSync(fetchDir)) return [];
  const byTheme = new Map();
  for (const f of fs.readdirSync(fetchDir)) {
    if (!/\.png$/i.test(f)) continue;
    const theme = themeFromName(f);
    if (!theme) continue;
    byTheme.set(theme, path.join(fetchDir, f));
  }
  const staged = [];
  for (const [theme, src] of [...byTheme.entries()].sort()) {
    // Drop old blast copies of this theme so importer can't prefer them.
    for (const f of fs.readdirSync(inboxDir)) {
      if (!/\.png$/i.test(f)) continue;
      if (themeFromName(f) === theme || String(f).toLowerCase().includes(theme)) {
        fs.unlinkSync(path.join(inboxDir, f));
      }
    }
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
  const uniqueThemes = new Set([...seen.keys()].map(themeFromName).filter(Boolean));
  return {
    label: task.label,
    status,
    imageAtts: images.length,
    uniqueThemes: uniqueThemes.size,
    downloaded,
    themes: [...uniqueThemes].sort(),
    ready: uniqueThemes.size >= task.expectSheets,
  };
}

function importNounSheets(task) {
  // Import ONLY the redo sheet IDs (not the whole wave1 task inbox).
  let ok = true;
  for (const sheet of task.runSheets || []) {
    const n = sheet.wave1TaskNo;
    const sheetId = sheet.id;
    if (!n || !sheetId) continue;
    const args = [
      'scripts/manus/import-cefrj-nouns-wave1.mjs',
      `--task=${n}`,
      `--sheet=${sheetId}`,
    ];
    console.log(`Import ${sheetId} via wave1 task${n}…`);
    const r = spawnSync(process.execPath, args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.status !== 0) ok = false;
  }
  return ok;
}

function importVerbs(task) {
  // Import only redo sheet IDs (S1/S2/S3…), not the whole wave10 inbox.
  const sheets = task.themes || [];
  let ok = true;
  // Map theme cefrj-verbs-03 → S3
  const ids = (task.themes || [])
    .map((t) => {
      const m = String(t).match(/cefrj-verbs-(\d+)/i);
      return m ? `S${Number(m[1])}` : null;
    })
    .filter(Boolean);
  const targets = ids.length ? ids : ['S3'];
  for (const sheetId of targets) {
    console.log(`Import verbs ${sheetId}…`);
    const r = spawnSync(
      process.execPath,
      [
        'scripts/manus/import-picturable-verbs.mjs',
        '--wave=10',
        '--inbox=assets-inbox/manus-cefrj-verbs-w1',
        `--sheet=${sheetId}`,
      ],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    );
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.status !== 0) ok = false;
  }
  return ok;
}

async function tick(state) {
  apiKey();
  if (!Array.isArray(state.importedVerbSlugs)) state.importedVerbSlugs = [];
  const tasks = [...discoverNounTasks(), ...discoverVerbTasks()];
  const rows = [];
  for (const task of tasks) {
    const pulled = await pullTask(task);
    rows.push({
      ...pulled,
      kind: task.kind,
      taskNo: task.taskNo,
      slug: task.slug || null,
      expect: task.expectSheets,
    });
    console.log(JSON.stringify({ ...pulled, kind: task.kind, id: task.id, slug: task.slug || null }));

    if (pulled.uniqueThemes > 0) {
      let staged;
      if (task.kind === 'nouns') {
        staged = stageByWave1Task(task.fetchOut, task.runSheets);
      } else {
        staged = stageUnique(task.fetchOut, task.inboxTask);
      }
      console.log(
        JSON.stringify({
          phase: 'staged',
          label: task.label,
          count: staged.length,
          themes: staged.map((s) => s.theme),
        })
      );
    }

    if (task.kind === 'nouns') {
      if (state.importedNounTasks.includes(task.taskNo)) continue;
      if (pulled.ready) {
        console.log(`Importing quality-redo nouns task ${task.taskNo}…`);
        if (importNounSheets(task)) {
          state.importedNounTasks.push(task.taskNo);
          saveState(state);
        }
      }
    } else if (task.kind === 'verbs') {
      const slug = task.slug || 'task-legacy';
      if (state.importedVerbSlugs.includes(slug)) continue;
      if (pulled.ready) {
        console.log(`Importing quality-redo verbs ${slug}…`);
        if (importVerbs(task)) {
          state.importedVerbSlugs.push(slug);
          // Keep legacy flag true only when every discovered verb task is imported.
          const allSlugs = discoverVerbTasks().map((t) => t.slug);
          state.verbsImported = allSlugs.every((s) => state.importedVerbSlugs.includes(s));
          saveState(state);
        }
      }
    }
  }

  const cooking = rows.filter((r) => !r.ready).map((r) => r.label);
  fs.writeFileSync(
    path.join(ROOT, 'tmp', 'cefrj-manus', 'wave1-quality-redo-poll-snapshot.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        cooking,
        importedNounTasks: state.importedNounTasks,
        importedVerbSlugs: state.importedVerbSlugs,
        verbsImported: state.verbsImported,
        rows,
      },
      null,
      2
    ) + '\n'
  );
  return { cooking, rows, allReady: cooking.length === 0 && rows.length > 0 };
}

const state = loadState();
const started = Date.now();
console.log(
  JSON.stringify({
    phase: 'start',
    once: ONCE,
    maxMinutes,
    nounTasks: discoverNounTasks().map((t) => ({
      taskNo: t.taskNo,
      id: t.id,
      sheets: t.sheetIds,
    })),
    verbs: discoverVerbTasks().map((t) => ({ slug: t.slug, id: t.id, themes: t.themes })),
  })
);

if (ONCE) {
  const r = await tick(state);
  console.log(JSON.stringify({ phase: 'done-once', ...r }, null, 2));
  process.exit(0);
}

while (true) {
  const r = await tick(state);
  if (r.allReady) {
    console.log(JSON.stringify({ phase: 'all-ready', ...r }, null, 2));
    break;
  }
  const elapsedMin = (Date.now() - started) / 60000;
  if (elapsedMin >= maxMinutes) {
    console.log(
      JSON.stringify({
        phase: 'park-timeout',
        elapsedMin: Math.round(elapsedMin * 10) / 10,
        cooking: r.cooking,
      })
    );
    break;
  }
  console.log(
    JSON.stringify({
      phase: 'sleep',
      cooking: r.cooking,
      nextMs: intervalMs,
      elapsedMin: Math.round(elapsedMin * 10) / 10,
    })
  );
  await new Promise((res) => setTimeout(res, intervalMs));
}
