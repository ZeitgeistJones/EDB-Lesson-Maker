/**
 * Stage + merge Perfect11 Call 3 black-field sheet (1 × 4×8 / import --grid=8x4).
 *
 *   node scripts/import-perfect11-call3.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/perfect11-call3-names.json'), 'utf8'),
);

const GRID = '8x4';
const EXPECTED_CELLS = 32;

const IMPORT_SHEETS = [
  {
    file: '01-submarine_props_sheet.png',
    pack: 'submarine',
    prefix: 'sub-',
    namesKey: 'submarine',
  },
];

/** Obvious junk / near-identical sheet dups to skip before merge. */
const CULL_BY_PACK = {
  submarine: [],
};

const SRC_DIR = path.join(ROOT, 'tmp', 'manus-perfect11-call3');
const STAGE_ROOT = path.join(ROOT, 'tmp', 'manus-import-perfect11-call3');
const summary = { imported: [], errors: [] };

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

  const altRows = fs
    .readdirSync(stage)
    .filter((f) => f.endsWith('-rows.json'))
    .map((f) => path.join(stage, f));
  const rowsFile = altRows[0];
  if (!rowsFile) throw new Error(`no rows.json for ${sheet.pack}`);

  const rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));
  const cullKeys = new Set(
    (CULL_BY_PACK[sheet.pack] || []).map((n) => `${sheet.prefix}${n}`),
  );

  for (const e of rows) {
    if (e.blocked) e.skip = true;
    if (cullKeys.has(e.key)) {
      e.skip = true;
      e.culled = true;
      e.cullReason = 'manual cull';
    }
    // Cull empty / shred tiles the keyer marked with no usable row
    if (!e.row && !e.blocked && e.dedup !== 'skip') {
      e.skip = true;
      e.culled = true;
      e.cullReason = e.cullReason || 'no row after key';
    }
  }
  fs.writeFileSync(rowsFile, JSON.stringify(rows, null, 2));

  const mergeReady = rows.filter((e) => e.row && e.stagedPath && !e.blocked && !e.skip && e.dedup !== 'skip');
  const hardBlocked = rows.filter((e) => e.blocked);
  const dedupSkip = rows.filter((e) => e.dedup === 'skip');
  const culled = rows.filter((e) => e.skip && !e.blocked);
  const soft = rows.filter((e) => e.forced && e.row && !e.blocked && !e.skip);

  console.error(`\n=== MERGE ${sheet.pack} (${mergeReady.length} ready) ===`);
  const merge = run(process.execPath, [
    path.join(ROOT, 'scripts/merge-staged-props.mjs'),
    path.relative(ROOT, rowsFile).replace(/\\/g, '/'),
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
    mergeStdout: (merge.stdout || '')
      .split('\n')
      .filter((l) => /Merged|skipped/.test(l))
      .join(' | '),
  });
}

const out = path.join(STAGE_ROOT, 'import-summary.json');
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log('\n=== CALL3 IMPORT SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
