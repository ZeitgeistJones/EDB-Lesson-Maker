/**
 * Stage + merge Perfect11 Call 1 sheets (5 × 4×8 / import --grid=8x4).
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

const SHEETS = [
  {
    file: '01-esl_sheet_1_circus.png',
    pack: 'circus',
    prefix: 'circus-',
    namesKey: 'circus',
  },
  {
    file: '02-esl_sheet_2_carnival.png',
    pack: 'carnival',
    prefix: 'carnival-',
    namesKey: 'carnival',
  },
  {
    file: '03-esl_sheet_3_library.png',
    pack: 'library',
    prefix: 'lib-',
    namesKey: 'library',
  },
  {
    file: '04-esl_sheet_4_post_office.png',
    pack: 'post-office',
    prefix: 'post-',
    namesKey: 'post-office',
  },
  {
    file: '05-esl_sheet_5_airport.png',
    pack: 'airport',
    prefix: 'air-',
    namesKey: 'airport',
  },
];

const SRC_DIR = path.join(ROOT, 'tmp', 'manus-perfect11-call1');
const STAGE_ROOT = path.join(ROOT, 'tmp', 'manus-import-perfect11-call1');
const summary = [];

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

for (const sheet of SHEETS) {
  const src = path.join(SRC_DIR, sheet.file);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  const names = NAMES[sheet.namesKey];
  if (!names || names.length !== 32) {
    throw new Error(`${sheet.namesKey} needs 32 names, got ${names && names.length}`);
  }
  const stage = path.join(STAGE_ROOT, sheet.pack);
  fs.mkdirSync(stage, { recursive: true });

  console.error(`\n=== STAGE ${sheet.pack} ===`);
  const imp = run(process.execPath, [
    path.join(ROOT, 'scripts/import-sheet.mjs'),
    src,
    '--grid=8x4',
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
  const mergeReady = rows.filter((e) => e.row && e.stagedPath && !e.blocked);
  const hardBlocked = rows.filter((e) => e.blocked || (e.dedup === 'skip' && !e.row));
  const dedupSkip = rows.filter((e) => e.dedup === 'skip');
  const soft = rows.filter((e) => e.forced && e.row && !e.blocked);

  // Cull obvious junk: hard-blocked already excluded; mark soft C1-like failures if any
  // Also skip cells that failed C1/C6/C7 (blocked flag)
  for (const e of rows) {
    if (e.blocked) e.skip = true;
  }
  fs.writeFileSync(rowsFile, JSON.stringify(rows, null, 2));

  console.error(`\n=== MERGE ${sheet.pack} (${mergeReady.length} ready) ===`);
  const merge = run('node', [
    'scripts/merge-staged-props.mjs',
    path.relative(ROOT, rowsFile).replace(/\\/g, '/'),
  ]);

  summary.push({
    pack: sheet.pack,
    file: sheet.file,
    staged: rows.length,
    mergeReady: mergeReady.length,
    softForced: soft.length,
    hardBlocked: hardBlocked.length,
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
