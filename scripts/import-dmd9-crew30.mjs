/**
 * Stage + merge Black Perfect-11 DMD9rZWxguhKeiB5e4SEp4 (11 × portrait 8×4).
 *
 * Soft 01–05 → pack tags gashapon/castle/aquarium/tree+nature/space
 * Dense 06–11 → kitchen/sports/bathroom/school/farm/music
 *
 * Soft collisions become -vN variants (regen under-dock packs).
 * Gashapon rows get decorative:true before merge.
 *
 *   node scripts/import-dmd9-crew30.mjs
 *   node scripts/import-dmd9-crew30.mjs --stage-only
 *   node scripts/import-dmd9-crew30.mjs --pack=kitchen
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/dmd9-crew30-names.json'), 'utf8'),
);

const GRID = '8x4';
const EXPECTED_CELLS = 32;
const STAGE_ONLY = process.argv.includes('--stage-only');
const ONLY_PACK = (process.argv.find((a) => a.startsWith('--pack=')) || '').slice(7);

const IMPORT_SHEETS = [
  {
    file: '01-sheet_01_soft_gashapon.png',
    pack: 'gashapon',
    prefix: 'gashapon-',
    namesKey: 'gashapon',
    soft: true,
    decorative: true,
  },
  {
    file: '02-sheet_02_castle_soft_props.png',
    pack: 'castle,medieval',
    prefix: 'castle-',
    namesKey: 'castle',
    soft: true,
  },
  {
    file: '03-sheet_03_aquarium_soft.png',
    pack: 'aquarium',
    prefix: 'aquarium-',
    namesKey: 'aquarium',
    soft: true,
  },
  {
    file: '04-sheet_04_tree_nature_soft.png',
    pack: 'tree,nature',
    prefix: 'tree-',
    namesKey: 'tree',
    soft: true,
  },
  {
    file: '05-sheet_05_space_soft_leftovers.png',
    pack: 'space',
    prefix: 'space-',
    namesKey: 'space',
    soft: true,
  },
  {
    file: '06-sheet_06_kitchen_objects_dense.png',
    pack: 'kitchen',
    prefix: 'kitchen-',
    namesKey: 'kitchen',
  },
  {
    file: '07-sheet_07_sports_equipment_dense.png',
    pack: 'sports',
    prefix: 'sports-',
    namesKey: 'sports',
    // Every cell has a baked-in English caption under the icon — text-in-art.
    skipSheet: true,
    skipReason: 'text-in-art labels under every icon (same class as culled camp.png)',
  },
  {
    file: '08-sheet_08_bathroom_objects_dense.png',
    pack: 'bathroom',
    prefix: 'bath-',
    namesKey: 'bathroom',
  },
  {
    file: '09-sheet_09_school_supplies_dense.png',
    pack: 'school',
    prefix: 'sch-',
    namesKey: 'school',
  },
  {
    file: '10-sheet_10_farm_tools_dense.png',
    pack: 'farm',
    prefix: 'farm-',
    namesKey: 'farm',
  },
  {
    file: '11-sheet_11_music_instruments_dense.png',
    pack: 'music',
    prefix: 'music-',
    namesKey: 'music',
  },
];

/** Manual cull keys (full prefixed key) — shreds / ghosts / junk after QA. */
const CULL_KEYS = new Set([
  'music-empty-cell',
]);

const SRC_DIR = path.join(ROOT, 'tmp', 'manus-crew30', 'fetch', 'DMD9rZWxguhKeiB5e4SEp4');
const STAGE_ROOT = path.join(ROOT, 'tmp', 'manus-crew30', 'import', 'dmd9');
const summary = { imported: [], errors: [], propCountBefore: null, propCountAfter: null };

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

function nextVariantKey(base, manifestKeys) {
  let n = 2;
  while (manifestKeys.has(`${base}-v${n}`)) n += 1;
  return `${base}-v${n}`;
}

function loadManifestKeys() {
  const m = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json'), 'utf8'),
  );
  return { manifest: m, keys: new Set(Object.keys(m.props || {})) };
}

{
  const { keys } = loadManifestKeys();
  summary.propCountBefore = keys.size;
}

const sheets = ONLY_PACK
  ? IMPORT_SHEETS.filter((s) => s.namesKey === ONLY_PACK || s.pack.split(',')[0] === ONLY_PACK)
  : IMPORT_SHEETS;

for (const sheet of sheets) {
  if (sheet.skipSheet) {
    summary.imported.push({
      pack: sheet.pack,
      namesKey: sheet.namesKey,
      file: sheet.file,
      skipped: true,
      skipReason: sheet.skipReason || 'skipped',
      mergeReady: 0,
    });
    console.error(`\n=== SKIP ${sheet.namesKey}: ${sheet.skipReason} ===`);
    continue;
  }
  const src = path.join(SRC_DIR, sheet.file);
  if (!fs.existsSync(src)) {
    summary.errors.push({ pack: sheet.pack, error: `missing ${src}` });
    throw new Error(`missing ${src}`);
  }
  const names = NAMES[sheet.namesKey];
  if (!Array.isArray(names) || names.length !== EXPECTED_CELLS) {
    throw new Error(`${sheet.namesKey} needs ${EXPECTED_CELLS} names, got ${names && names.length}`);
  }
  const stage = path.join(STAGE_ROOT, sheet.namesKey);
  fs.mkdirSync(stage, { recursive: true });

  console.error(`\n=== STAGE ${sheet.namesKey} (${GRID}) pack=${sheet.pack} ===`);
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
  if (!rowsFile) throw new Error(`no rows.json for ${sheet.namesKey}`);

  const rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));
  const { keys: manifestKeys } = loadManifestKeys();
  const usedKeys = new Set(manifestKeys);

  for (const e of rows) {
    if (e.blocked) e.skip = true;
    if (CULL_KEYS.has(e.key)) {
      e.skip = true;
      e.culled = true;
      e.cullReason = 'manual cull';
    }
    if (!e.row && !e.blocked && e.dedup !== 'skip') {
      e.skip = true;
      e.culled = true;
      e.cullReason = e.cullReason || 'no row after key';
    }

    // Soft regen + dense collisions: keep gate-clean dups as variants.
    if (e.dedup === 'skip' && e.row && e.stagedPath && !e.blocked && !e.skip) {
      const base = e.key;
      const vKey = nextVariantKey(base, usedKeys);
      usedKeys.add(vKey);
      e.variantOfBase = base;
      e.key = vKey;
      e.dedup = 'new';
      e.row = {
        ...e.row,
        file: `${vKey}.png`,
        variantOf: base,
      };
      const oldPath = path.resolve(ROOT, e.stagedPath);
      const newPath = path.join(path.dirname(oldPath), `${vKey}.png`);
      if (fs.existsSync(oldPath) && oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        e.stagedPath = path.relative(ROOT, newPath).replace(/\\/g, '/');
      }
    }

    if (sheet.decorative && e.row) {
      e.row.decorative = true;
    }
  }
  fs.writeFileSync(rowsFile, JSON.stringify(rows, null, 2));

  const mergeReady = rows.filter(
    (e) => e.row && e.stagedPath && !e.blocked && !e.skip && e.dedup !== 'skip',
  );
  const hardBlocked = rows.filter((e) => e.blocked);
  const dedupSkip = rows.filter((e) => e.dedup === 'skip');
  const culled = rows.filter((e) => e.skip && !e.blocked);
  const soft = rows.filter((e) => e.forced && e.row && !e.blocked && !e.skip);
  const variants = rows.filter((e) => e.variantOfBase);

  const entry = {
    pack: sheet.pack,
    namesKey: sheet.namesKey,
    file: sheet.file,
    grid: GRID,
    soft: !!sheet.soft,
    decorative: !!sheet.decorative,
    staged: rows.length,
    mergeReady: mergeReady.length,
    softForced: soft.length,
    hardBlocked: hardBlocked.length,
    hardBlockedKeys: hardBlocked.map((e) => ({
      key: e.key,
      reason: e.reason || (e.gates || []).filter((g) => !g.ok).map((g) => g.id).join(','),
    })),
    culled: culled.length,
    dedupSkip: dedupSkip.length,
    variants: variants.length,
    variantKeys: variants.map((e) => `${e.key}→${e.variantOfBase}`),
    importExit: imp.status,
    rowsFile: path.relative(ROOT, rowsFile).replace(/\\/g, '/'),
  };

  if (STAGE_ONLY) {
    entry.mergeExit = null;
    entry.mergeStdout = 'stage-only';
    summary.imported.push(entry);
    continue;
  }

  console.error(`\n=== MERGE ${sheet.namesKey} (${mergeReady.length} ready) ===`);
  const merge = run(process.execPath, [
    path.join(ROOT, 'scripts/merge-staged-props.mjs'),
    path.relative(ROOT, rowsFile).replace(/\\/g, '/'),
  ]);

  entry.mergeExit = merge.status;
  entry.mergeStdout = (merge.stdout || '')
    .split('\n')
    .filter((l) => /Merged|skipped|OK /.test(l))
    .slice(0, 5)
    .join(' | ');
  summary.imported.push(entry);
}

{
  const { keys } = loadManifestKeys();
  summary.propCountAfter = keys.size;
}

const out = path.join(STAGE_ROOT, 'import-summary.json');
fs.mkdirSync(STAGE_ROOT, { recursive: true });
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log('\n=== DMD9 CREW30 IMPORT SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
