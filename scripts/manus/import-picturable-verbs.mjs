/**
 * One-command importer for Shift60 picturable-verb Manus drops (white 3Ãƒâ€”3 vocab).
 *
 * Matches inbox PNGs to run.json sheets by theme slug in the filename
 * (order is unreliable Ã¢â‚¬â€ Manus zip names Ã¢â€°Â  commission wave order).
 *
 * Stage a Downloads zip first (hash-skip, no pack write):
 *   npm run assets:stage-picturable-verbs -- "%USERPROFILE%\Downloads\wave5.zip" --wave=5
 *   node scripts/manus/stage-verb-zip.mjs "C:\Users\...\Downloads\wave5.zip" --wave=5
 *
 * Then import (writes public/assets/07_vocab-pack Ã¢â‚¬â€ Import track owns this):
 *   npm run assets:import-picturable-verbs
 *   npm run assets:import-picturable-verbs -- --dry-run
 *   npm run assets:import-picturable-verbs -- --wave=5
 *   npm run assets:import-picturable-verbs -- --wave=6
 *   npm run assets:import-picturable-verbs-w5
 *   npm run assets:import-picturable-verbs-w6
 *   node scripts/manus/import-picturable-verbs.mjs --wave=2 --sheet=S6
 *   node scripts/manus/import-picturable-verbs.mjs --inbox=assets-inbox/manus-shift60-verbs-w5
 *
 * Default inboxes:
 *   assets-inbox/manus-shift60-verbs-w1|w2|w3|w4|w5|w6  (+ w7 when plan exists)
 * Plans:
 *   tmp/manus-shift60-picturable-verbs-wave{N}/task1/run.json
 *
 * Hash-skip lives in stage-verb-zip.mjs (.source-hash.txt per inbox) Ã¢â‚¬â€ this
 * importer does not re-hash zips; avoid re-staging identical drops.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DRY = process.argv.includes('--dry-run');
const WAVE_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--wave='));
  return a ? Number(a.slice(7)) : null;
})();
const SHEET_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--sheet='));
  return a ? a.slice(8).toUpperCase() : null;
})();
const INBOX_OVERRIDE = (() => {
  const a = process.argv.find((x) => x.startsWith('--inbox='));
  if (!a) return null;
  const rel = a.slice(8);
  return path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
})();

const WAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

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

/** Infer sheets[] when an older run.json only stored flat keys. */
function sheetsFromFlatKeys(keys, cells = 9) {
  const out = [];
  for (let i = 0; i < keys.length; i += cells) {
    const chunk = keys.slice(i, i + cells);
    out.push({
      id: `S${out.length + 1}`,
      theme: `sheet-${out.length + 1}`,
      keys: chunk,
    });
  }
  return out;
}

function themeTokens(theme) {
  const s = slugify(theme);
  if (!s) return [];
  return s.split('-').filter(Boolean);
}

/**
 * Score how well a PNG filename matches a sheet theme.
 * Prefer explicit theme tokens (talk-touch, face-body, cut-pack-mix).
 */
function scorePngForTheme(pngPath, theme, sheetId) {
  const base = slugify(path.basename(pngPath, path.extname(pngPath)));
  const themeSlug = slugify(theme);
  let score = 0;
  if (themeSlug && base.includes(themeSlug)) score += 100;
  const tokens = themeTokens(theme);
  if (tokens.length) {
    const hit = tokens.filter((t) => base.includes(t)).length;
    score += hit * 10;
    if (hit === tokens.length) score += 20;
  }
  const id = String(sheetId || '').toLowerCase();
  const m = id.match(/^s(\d+)$/);
  if (m) {
    const n = m[1];
    if (new RegExp(`(?:^|[_-])0?${n}(?:[_-]|$)`).test(base)) score += 5;
    if (base.includes(`sheet-${n}`) || base.includes(`sheet_${n}`)) score += 15;
  }
  // Common Manus leftovers
  if (themeSlug === 'cut-pack-mix' && base.includes('cut_pack_mix')) score += 80;
  if (themeSlug === 'cut-pack-mix' && base.includes('cut-pack-mix')) score += 80;
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
  // Require a real theme signal Ã¢â‚¬â€ never assign leftover PNGs by sheet order alone.
  if (!best || bestScore < 15) return null;
  used.add(best);
  return best;
}

function ensureSheets(run) {
  if (Array.isArray(run.sheets) && run.sheets.length) {
    return run.sheets.map((s, i) => ({
      id: String(s.id || `S${i + 1}`).toUpperCase(),
      theme: s.theme || s.title || `sheet-${i + 1}`,
      keys: (s.keys || (s.cells || []).map((c) => (Array.isArray(c) ? c[0] : c))).map((k) =>
        String(k).trim().toLowerCase().replace(/\s+/g, '-')
      ),
    }));
  }
  const keys = (run.keys || []).map((k) =>
    String(k).trim().toLowerCase().replace(/\s+/g, '-')
  );
  return sheetsFromFlatKeys(keys, 9);
}

function waveInbox(wave) {
  if (INBOX_OVERRIDE) return INBOX_OVERRIDE;
  // Wave 10 = CEFR-J verbs wave1; wave 11 = wave2 primary; wave 12 = wave2 other; 13 = B1.
  if (wave === 10) {
    return path.join(ROOT, 'assets-inbox', 'manus-cefrj-verbs-w1');
  }
  if (wave === 11) {
    return path.join(ROOT, 'assets-inbox', 'manus-cefrj-verbs-w2');
  }
  if (wave === 12) {
    return path.join(ROOT, 'assets-inbox', 'manus-cefrj-verbs-w2-other');
  }
  if (wave === 13) {
    return path.join(ROOT, 'assets-inbox', 'manus-cefrj-verbs-b1');
  }
  return path.join(ROOT, 'assets-inbox', `manus-shift60-verbs-w${wave}`);
}

function waveRoot(wave) {
  return path.join(ROOT, 'tmp', `manus-shift60-picturable-verbs-wave${wave}`);
}

function wavePlan(wave) {
  return path.join(waveRoot(wave), 'task1', 'run.json');
}

/** Collect sheets from every taskN/run.json (multi-task Perfect-11 waves). */
function loadWaveRuns(wave) {
  const root = waveRoot(wave);
  const runs = [];
  if (!fs.existsSync(root)) return runs;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || !/^task\d+$/i.test(ent.name)) continue;
    const runPath = path.join(root, ent.name, 'run.json');
    if (!fs.existsSync(runPath)) continue;
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    if (run.dry_run && !Array.isArray(run.sheets)) continue;
    runs.push({ runPath, run, taskDir: ent.name });
  }
  // Fallback: older single-file layout
  if (!runs.length) {
    const runPath = wavePlan(wave);
    if (fs.existsSync(runPath)) {
      runs.push({ runPath, run: JSON.parse(fs.readFileSync(runPath, 'utf8')), taskDir: 'task1' });
    }
  }
  return runs.sort((a, b) => a.taskDir.localeCompare(b.taskDir, undefined, { numeric: true }));
}

function loadJobs() {
  const jobs = [];
  const unmatched = [];
  for (const wave of WAVES) {
    if (WAVE_FILTER != null && WAVE_FILTER !== wave) continue;
    const waveRuns = loadWaveRuns(wave);
    if (!waveRuns.length) {
      console.error(`WARN missing plan: ${wavePlan(wave)}`);
      continue;
    }
    const inbox = waveInbox(wave);
    const pngs = listPngs(inbox);
    const used = new Set();
    for (const { runPath, run } of waveRuns) {
      const sheets = ensureSheets(run);
      if (!Array.isArray(run.sheets) || !run.sheets.length) {
        run.sheets = sheets;
        fs.writeFileSync(runPath, JSON.stringify(run, null, 2) + '\n');
        console.log(`wrote sheets[] into ${path.relative(ROOT, runPath)}`);
      }
      for (const sheet of sheets) {
        if (SHEET_FILTER && sheet.id !== SHEET_FILTER) continue;
        // Disambiguate S1 across multi-task runs via theme (unique per wave).
        const png = pickPng(pngs, sheet, used);
        if (!png) {
          unmatched.push({ wave, id: sheet.id, theme: sheet.theme, keys: sheet.keys.length });
          continue;
        }
        jobs.push({
          wave,
          id: sheet.id,
          theme: sheet.theme,
          keys: sheet.keys,
          png,
          task_url: run.task_url || null,
        });
      }
    }
    for (const png of pngs) {
      if (!used.has(png)) {
        unmatched.push({
          wave,
          id: 'ORPHAN-PNG',
          theme: path.basename(png),
          keys: 0,
        });
      }
    }
  }
  return { jobs, unmatched };
}

function padNames(keys, cells = 9) {
  const out = [...keys];
  let i = 1;
  while (out.length < cells) {
    out.push(`__verb-empty-${i++}`);
  }
  return out.slice(0, cells);
}

function scrubEmptyPlaceholders(padKeys) {
  const empties = padKeys.filter((k) => k.startsWith('__verb-empty-'));
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
  // Orphan files from a prior partial import (index scrubbed, PNG left behind).
  if (fs.existsSync(imgDir)) {
    for (const f of fs.readdirSync(imgDir)) {
      if (!/^__verb-empty-\d+\.png$/i.test(f)) continue;
      fs.unlinkSync(path.join(imgDir, f));
      removed += 1;
      console.log(`scrubbed orphan empty PNG ${f}`);
    }
  }
  if (removed) {
    const ordered = {};
    for (const key of Object.keys(index).sort()) ordered[key] = index[key];
    fs.writeFileSync(indexPath, `${JSON.stringify(ordered, null, 1)}\n`);
    console.log(`scrubbed ${removed} empty placeholder keys/files`);
  }
  return removed;
}

/** Drop near-empty keyed cells (Manus left blank grid slots). */
function cullBlankCells(keys) {
  const indexPath = path.join(ROOT, 'public', 'assets', '07_vocab-pack', 'index.json');
  const imgDir = path.join(ROOT, 'public', 'assets', '07_vocab-pack', 'img');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  let culled = 0;
  for (const key of keys) {
    const img = path.join(imgDir, `${key}.png`);
    if (!fs.existsSync(img)) continue;
    const stat = fs.statSync(img);
    // Fully blank white 256Ãƒâ€”256 PNGs after keying are tiny; real icons are larger.
    // Also drop if index marks zero content via missing file later Ã¢â‚¬â€ size heuristic only.
    if (stat.size < 1800) {
      delete index[key];
      fs.unlinkSync(img);
      culled += 1;
      console.log(`cull blank-ish ${key} (${stat.size}b)`);
    }
  }
  if (culled) {
    const ordered = {};
    for (const key of Object.keys(index).sort()) ordered[key] = index[key];
    fs.writeFileSync(indexPath, `${JSON.stringify(ordered, null, 1)}\n`);
  }
  return culled;
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
    `\n=== wave${job.wave} ${job.id} ${job.theme} (${job.keys.length} keys) ===\n${relPng}`
  );
  if (DRY) {
    console.log('DRY', args.join(' '));
    return { ok: true, dry: true, id: job.id, wave: job.wave, keys: job.keys.length };
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
      wave: job.wave,
      status: r.status,
      error: (r.stderr || r.stdout || '').slice(-400),
    };
  }
  const scrubbed = scrubEmptyPlaceholders(padKeys);
  const culled = cullBlankCells(job.keys);
  return {
    ok: true,
    id: job.id,
    wave: job.wave,
    keys: job.keys.length,
    scrubbed,
    culled,
    png: relPng,
  };
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

  const outDir = path.join(ROOT, 'tmp', 'manus-shift60-picturable-verbs-import');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'import-summary.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
  console.log(
    `\nDone: ${summary.imported.length} ok / ${summary.failed.length} failed / ${jobs.length} jobs`
  );
  console.log(`Unmatched sheets/orphans: ${unmatched.length}`);
  console.log('Summary Ã¢â€ â€™', path.relative(ROOT, out).replace(/\\/g, '/'));
  if (summary.failed.length) process.exit(1);
}

main();

