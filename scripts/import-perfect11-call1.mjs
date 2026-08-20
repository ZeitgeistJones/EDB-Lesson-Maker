/**
 * Stage + merge Perfect11 Call 1 black-field sheets (2 × 6×6 / import --grid=6x6).
 * Manus delivered 2048×2048 square 6×6 grids, not portrait 4×8.
 * Skips carnival / library / airport (white-field + labels).
 *
 *   node scripts/import-perfect11-call1.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/perfect11-call1-names.json'), 'utf8'),
);

const GRID = '6x6';
const EXPECTED_CELLS = 36;

/** Black-field sheets only — import-safe. */
const IMPORT_SHEETS = [
  {
    file: '01-esl_sheet_1_circus.png',
    pack: 'circus',
    prefix: 'circus-',
    namesKey: 'circus',
  },
  {
    file: '04-esl_sheet_4_post_office.png',
    pack: 'post-office',
    prefix: 'post-',
    namesKey: 'post-office',
  },
];

/** White-field / labeled sheets — log skip, do not import. */
const BLOCKED_SHEETS = [
  {
    file: '02-esl_sheet_2_carnival.png',
    pack: 'carnival',
    namesKey: 'carnival',
  },
  {
    file: '03-esl_sheet_3_library.png',
    pack: 'library',
    namesKey: 'library',
  },
  {
    file: '05-esl_sheet_5_airport.png',
    pack: 'airport',
    namesKey: 'airport',
  },
];

const SRC_DIR = path.join(ROOT, 'tmp', 'manus-perfect11-call1');
const STAGE_ROOT = path.join(ROOT, 'tmp', 'manus-import-perfect11-call1');
const summary = { imported: [], blocked: [], errors: [] };

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.error) throw r.error;
  return r;
}

function blockedReason(namesKey) {
  const entry = NAMES[namesKey];
  if (entry && typeof entry === 'object' && entry.blocked) return entry.reason;
  return 'white-field / labeled sheet — not black-field cutout-safe';
}

for (const sheet of BLOCKED_SHEETS) {
  const src = path.join(SRC_DIR, sheet.file);
  const reason = blockedReason(sheet.namesKey);
  const exists = fs.existsSync(src);
  console.error(`\n=== SKIP ${sheet.pack} ===`);
  console.error(`  file: ${sheet.file}`);
  console.error(`  reason: ${reason}`);
  summary.blocked.push({
    pack: sheet.pack,
    file: sheet.file,
    reason,
    sourceExists: exists,
  });
}

for (const sheet of IMPORT_SHEETS) {
  const src = path.join(SRC_DIR, sheet.file);
  if (!fs.existsSync(src)) {
    summary.errors.push({ pack: sheet.pack, error: `missing ${src}` });
    throw new Error(`missing ${src}`);
  }
  const names = NAMES[sheet.namesKey];
  if (!Array.isArray(names) || names.length !== EXPECTED_CELLS) {
    throw new Error(`${sheet.namesKey} needs ${EXPECTED_CELLS} names, got ${names && names.length}`);
  }
  const stage = path.join(STAGE_ROOT, sheet.pack);
  fs.mkdirSync(stage, { recursive: true });

  console.error(`\n=== STAGE ${sheet.pack} (${GRID}) ===`);
  const imp = run(process.execPath, [
    path.join(ROOT, 'scripts/import-sheet.mjs'),
    src,
    `--grid=${GRID}`,
    `--prefix=${sheet.prefix}`,
    `--names=${names.join(',')}`,
    '--roles=object',
    '--scales=0.35',
    '--anchors=bottom',
    `--pack=${sheet.pack}`,
    `--stage=${stage}`,
  ]);

  const rowsPath = path.join(stage, `${sheet.prefix.replace(/-$/, '')}-rows.json`);
  const altRows = fs
    .readdirSync(stage)
    .filter((f) => f.endsWith('-rows.json'))
    .map((f) => path.join(stage, f));
  const rowsFile = fs.existsSync(rowsPath) ? rowsPath : altRows[0];
  if (!rowsFile) throw new Error(`no rows.json for ${sheet.pack}`);

  const rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));

  // Cull obvious junk: dup slugs, hard-blocked gate failures
  const CULL_KEYS = new Set([
    `${sheet.prefix}star-wand-dup`.replace(/-$/, '-'),
    `${sheet.prefix}clipboard-empty`.replace(/-$/, '-'),
  ]);
  for (const e of rows) {
    if (e.blocked) e.skip = true;
    if (CULL_KEYS.has(e.key)) {
      e.skip = true;
      e.culled = true;
      e.cullReason = 'duplicate tile on sheet';
    }
  }
  fs.writeFileSync(rowsFile, JSON.stringify(rows, null, 2));

  const mergeReady = rows.filter((e) => e.row && e.stagedPath && !e.blocked && !e.skip);
  const hardBlocked = rows.filter((e) => e.blocked || (e.dedup === 'skip' && !e.row));
  const dedupSkip = rows.filter((e) => e.dedup === 'skip');
  const culled = rows.filter((e) => e.skip && !e.blocked);
  const soft = rows.filter((e) => e.forced && e.row && !e.blocked && !e.skip);

  // --force replaces prior mis-slices (Call1 first landed under wrong --grid=8x4).
  console.error(`\n=== MERGE ${sheet.pack} (${mergeReady.length} ready, --force) ===`);
  const merge = run('node', [
    'scripts/merge-staged-props.mjs',
    path.relative(ROOT, rowsFile).replace(/\\/g, '/'),
    '--force',
    '--skip=circus-star-wand-dup,post-clipboard-empty',
  ]);

  summary.imported.push({
    pack: sheet.pack,
    file: sheet.file,
    grid: GRID,
    staged: rows.length,
    mergeReady: mergeReady.length,
    softForced: soft.length,
    hardBlocked: hardBlocked.length,
    culled: culled.length,
    dedupSkip: dedupSkip.length,
    importExit: imp.status,
    mergeExit: merge.status,
    mergeStdout: (merge.stdout || '').split('\n').filter((l) => /Merged|skipped/.test(l)).join(' | '),
  });
}

const out = path.join(STAGE_ROOT, 'import-summary.json');
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log('\n=== CALL1 IMPORT SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
