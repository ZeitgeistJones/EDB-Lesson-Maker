/**
 * Importer for CEFR-J B1 adjectives Manus drops (white 3×3 vocab).
 * Discovers all taskN/run.json under tmp/manus-shift60-cefrj-adjectives-b1/.
 *
 *   node scripts/manus/import-cefrj-adjectives-b1.mjs
 *   node scripts/manus/import-cefrj-adjectives-b1.mjs --task=1
 *   node scripts/manus/import-cefrj-adjectives-b1.mjs --inbox=assets-inbox/manus-cefrj-adjectives-b1
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLAN_ROOT = path.join(ROOT, 'tmp', 'manus-shift60-cefrj-adjectives-b1');
const DEFAULT_INBOX = path.join(ROOT, 'assets-inbox', 'manus-cefrj-adjectives-b1');

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
  return rel ? (path.isAbsolute(rel) ? rel : path.join(ROOT, rel)) : DEFAULT_INBOX;
})();

function discoverTaskNos() {
  if (!fs.existsSync(PLAN_ROOT)) return [];
  return fs
    .readdirSync(PLAN_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^task\d+$/i.test(e.name))
    .map((e) => Number(e.name.replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(dir, f));
}

function scorePngForTheme(pngPath, theme, sheetId) {
  const base = slugify(path.basename(pngPath, path.extname(pngPath)));
  const themeSlug = slugify(theme);
  let score = 0;
  if (themeSlug && base.includes(themeSlug)) score += 100;
  const numbered = themeSlug.match(/^(cefrj-adjectives(?:-b1)?-)(\d+)$/);
  if (numbered) {
    const n = numbered[2];
    const padded = n.padStart(2, '0');
    if (
      base.includes(`${numbered[1]}${padded}`) ||
      base.includes(`${numbered[1]}${n}`) ||
      base.includes(themeSlug)
    ) {
      score += 100;
    }
  }
  const tokens = themeSlug.split('-').filter(Boolean);
  if (tokens.length) {
    const hit = tokens.filter((t) => base.includes(t)).length;
    score += hit * 10;
    if (hit === tokens.length) score += 20;
  }
  const m = String(sheetId || '')
    .toLowerCase()
    .match(/^s(\d+)$/);
  if (m) {
    const n = m[1];
    if (new RegExp(`(?:^|[_-])0?${n}(?:[_-]|$)`).test(base)) score += 5;
    if (base.includes(`sheet-${n}`) || base.includes(`sheet_${n}`)) score += 15;
  }
  return score;
}

function pickPng(pngs, sheet, used) {
  let best = null;
  let bestScore = 0;
  for (const png of pngs) {
    if (used.has(png)) continue;
    const score = scorePngForTheme(png, sheet.theme || sheet.title || '', sheet.id);
    if (score > bestScore) {
      bestScore = score;
      best = png;
    }
  }
  if (best && bestScore >= 15) {
    used.add(best);
    return best;
  }
  return null;
}

function loadJobs() {
  const jobs = [];
  const unmatched = [];
  for (const taskNo of discoverTaskNos()) {
    if (TASK_FILTER != null && TASK_FILTER !== taskNo) continue;
    const runPath = path.join(PLAN_ROOT, `task${taskNo}`, 'run.json');
    if (!fs.existsSync(runPath)) {
      unmatched.push({ taskNo, id: 'MISSING-RUN', theme: runPath, keys: 0 });
      continue;
    }
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    if (run.dry_run && !run.task_id) continue;
    const sheets = run.sheets || [];
    const taskInbox = path.join(INBOX, `task${taskNo}`);
    let pngs = listPngs(taskInbox);
    if (!pngs.length) pngs = listPngs(INBOX);
    const used = new Set();
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const id = String(sheet.id || `S${i + 1}`).toUpperCase();
      if (SHEET_FILTER && id !== SHEET_FILTER) continue;
      const keys = (sheet.keys || []).map((k) =>
        String(k).trim().toLowerCase().replace(/\s+/g, '-')
      );
      const png = pickPng(pngs, { ...sheet, id }, used);
      if (!png) {
        unmatched.push({ taskNo, id, theme: sheet.theme, keys: keys.length });
        continue;
      }
      jobs.push({
        taskNo,
        id,
        theme: sheet.theme || '',
        keys,
        png,
        task_url: run.task_url || null,
      });
    }
  }
  return { jobs, unmatched };
}

function padNames(keys, cells = 9) {
  const out = [...keys];
  let i = 1;
  while (out.length < cells) out.push(`__cefrj-empty-${i++}`);
  return out.slice(0, cells);
}

function scrubEmptyPlaceholders(padKeys) {
  const empties = padKeys.filter((k) => k.startsWith('__cefrj-empty-'));
  if (!empties.length) return 0;
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
  return removed;
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
    `\n=== task${job.taskNo} ${job.id} ${job.theme} (${job.keys.length} keys) ===\n${relPng}`
  );
  if (DRY) {
    console.log('DRY', args.join(' '));
    return { ok: true, dry: true, id: job.id, taskNo: job.taskNo, keys: job.keys.length };
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
      taskNo: job.taskNo,
      status: r.status,
      error: (r.stderr || r.stdout || '').slice(-400),
    };
  }
  const scrubbed = scrubEmptyPlaceholders(padKeys);
  return { ok: true, id: job.id, taskNo: job.taskNo, keys: job.keys.length, scrubbed, png: relPng };
}

function main() {
  const { jobs, unmatched } = loadJobs();
  if (!jobs.length) {
    console.error('No import jobs matched. Unmatched:');
    console.error(JSON.stringify(unmatched, null, 2));
    process.exit(1);
  }

  const summary = {
    at: new Date().toISOString(),
    dry: DRY,
    jobs: jobs.length,
    imported: [],
    failed: [],
    unmatched,
  };

  for (const job of jobs) {
    const result = importOne(job);
    if (result.ok) summary.imported.push(result);
    else summary.failed.push(result);
  }

  fs.mkdirSync(PLAN_ROOT, { recursive: true });
  const out = path.join(PLAN_ROOT, 'import-summary.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
  console.log(
    `\nDone: ${summary.imported.length} ok / ${summary.failed.length} failed / ${jobs.length} jobs`
  );
  console.log(`Unmatched sheets/orphans: ${unmatched.length}`);
  console.log('Summary →', path.relative(ROOT, out).replace(/\\/g, '/'));
  if (summary.failed.length) process.exit(1);
}

main();
