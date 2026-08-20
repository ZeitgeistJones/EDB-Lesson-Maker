/**
 * One-command importer for Shift60 scrubbed-queue Manus drops (white 3×3 vocab).
 *
 * Reads expected keys from tmp/manus-shift60-scrubbed-queues/taskN/run.json,
 * matches inbox PNGs by sheet order, imports via assets:vocab-sheet into
 * public/assets/07_vocab-pack/.
 *
 *   node scripts/manus/import-scrubbed-queues.mjs
 *   node scripts/manus/import-scrubbed-queues.mjs --dry-run
 *   node scripts/manus/import-scrubbed-queues.mjs --task=1
 *   node scripts/manus/import-scrubbed-queues.mjs --sheet=S1
 *   node scripts/manus/import-scrubbed-queues.mjs --inbox=assets-inbox/manus-shift60-scrub
 *
 * Skip: hug/kids/parents/circle + needsReview (already excluded at commission).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLAN_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-scrubbed-queues');
const DEFAULT_INBOX = path.join(ROOT, 'assets-inbox', 'manus-shift60-scrub');

const DRY = process.argv.includes('--dry-run');
const TASK_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--task='));
  return a ? Number(a.slice(7)) : null;
})();
const SHEET_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--sheet='));
  return a ? a.slice(8).toUpperCase() : null;
})();
const INBOX = (() => {
  const a = process.argv.find((x) => x.startsWith('--inbox='));
  const rel = a ? a.slice(8) : null;
  return rel
    ? path.isAbsolute(rel)
      ? rel
      : path.join(ROOT, rel)
    : DEFAULT_INBOX;
})();

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(dir, f));
}

function loadJobs() {
  const jobs = [];
  for (const taskNo of [1, 2]) {
    if (TASK_FILTER != null && TASK_FILTER !== taskNo) continue;
    const runPath = path.join(PLAN_ROOT, `task${taskNo}`, 'run.json');
    if (!fs.existsSync(runPath)) {
      throw new Error(`Missing ${runPath}`);
    }
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const sheets = run.sheets || [];
    const pngs = listPngs(path.join(INBOX, `task${taskNo}`));
    if (pngs.length !== sheets.length) {
      console.error(
        `WARN task${taskNo}: expected ${sheets.length} sheets, found ${pngs.length} PNGs in ${path.join(INBOX, `task${taskNo}`)}`
      );
    }
    const n = Math.min(sheets.length, pngs.length);
    for (let i = 0; i < n; i++) {
      const sheet = sheets[i];
      const id = String(sheet.id || `S${i + 1}`).toUpperCase();
      if (SHEET_FILTER && id !== SHEET_FILTER) continue;
      const keys = (sheet.keys || []).map((k) =>
        String(k).trim().toLowerCase().replace(/\s+/g, '-')
      );
      if (keys.length !== 9) {
        console.error(`WARN ${id}: expected 9 keys, got ${keys.length}`);
      }
      jobs.push({
        taskNo,
        id,
        theme: sheet.theme || '',
        keys,
        png: pngs[i],
        task_url: run.task_url || null,
      });
    }
  }
  return jobs;
}

function rewriteExpectedSheets(jobs) {
  // Fix literal-\n txt artifacts left by earlier writers; keep run.json as source of truth.
  for (const job of jobs) {
    const dir = path.join(PLAN_ROOT, `task${job.taskNo}`, 'expected-sheets');
    fs.mkdirSync(dir, { recursive: true });
    const slug = `${job.id}-${job.theme || 'sheet'}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
    const dest = path.join(dir, `${slug}.txt`);
    fs.writeFileSync(dest, job.keys.join('\n') + '\n', 'utf8');
  }
}

function padNames(keys, cells = 9) {
  const out = [...keys];
  let i = 1;
  while (out.length < cells) {
    out.push(`__scrub-empty-${i++}`);
  }
  return out.slice(0, cells);
}

function scrubEmptyPlaceholders(padKeys) {
  const empties = padKeys.filter((k) => k.startsWith('__scrub-empty-'));
  if (!empties.length) return;
  const indexPath = path.join(ROOT, 'public', 'assets', '07_vocab-pack', 'index.json');
  const imgDir = path.join(ROOT, 'public', 'assets', '07_vocab-pack', 'img');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  let removed = 0;
  for (const k of empties) {
    if (index[k]) {
      delete index[k];
      removed += 1;
    }
    const img = path.join(imgDir, `${k}.png`);
    if (fs.existsSync(img)) fs.unlinkSync(img);
  }
  if (removed) {
    const ordered = {};
    for (const key of Object.keys(index).sort()) ordered[key] = index[key];
    fs.writeFileSync(indexPath, `${JSON.stringify(ordered, null, 1)}\n`);
    console.log(`scrubbed ${removed} empty placeholder keys from index`);
  }
}

function importOne(job) {
  const padKeys = padNames(job.keys, 9);
  const names = padKeys.join(',');
  const relPng = path.relative(ROOT, job.png).replace(/\\/g, '/');
  const args = [
    'scripts/import-vocab-sheet.mjs',
    relPng,
    '--sheet',
    '--grid=3x3',
    `--names=${names}`,
    '--white-min=200',
    '--white-chroma=32',
    '--gutter-inset=8',
  ];
  console.log(
    `\n=== ${job.id} task${job.taskNo} ${job.theme} (${job.keys.length} keys) ===\n${relPng}`
  );
  if (DRY) {
    console.log('DRY', args.join(' '));
    return { ok: true, dry: true, id: job.id, keys: job.keys.length };
  }
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    return {
      ok: false,
      id: job.id,
      status: r.status,
      error: (r.stderr || r.stdout || '').slice(-400),
    };
  }
  scrubEmptyPlaceholders(padKeys);
  return { ok: true, id: job.id, keys: job.keys.length };
}

function main() {
  if (!fs.existsSync(INBOX)) {
    console.error(`Missing inbox: ${INBOX}`);
    process.exit(1);
  }
  const jobs = loadJobs();
  if (!jobs.length) {
    console.error('No import jobs matched filters.');
    process.exit(1);
  }
  rewriteExpectedSheets(jobs);

  const summary = {
    at: new Date().toISOString(),
    inbox: path.relative(ROOT, INBOX).replace(/\\/g, '/'),
    dry: DRY,
    jobs: jobs.length,
    imported: [],
    failed: [],
  };

  for (const job of jobs) {
    const result = importOne(job);
    if (result.ok) summary.imported.push(result);
    else summary.failed.push(result);
  }

  const out = path.join(PLAN_ROOT, 'import-summary.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
  console.log(
    `\nDone: ${summary.imported.length} ok / ${summary.failed.length} failed / ${jobs.length} jobs`
  );
  console.log('Summary →', path.relative(ROOT, out).replace(/\\/g, '/'));
  if (summary.failed.length) process.exit(1);
}

main();
