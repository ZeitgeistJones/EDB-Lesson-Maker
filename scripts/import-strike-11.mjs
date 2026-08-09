/**
 * Stage + merge Strike-11 black-field sheets (11 × 4×8 / import --grid=8x4).
 *
 *   node scripts/import-strike-11.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/strike-11-names.json'), 'utf8'),
);

const GRID = '8x4';
const EXPECTED_CELLS = 32;
const SRC_DIR = path.join(ROOT, 'tmp', 'manus-strike-11');
const STAGE_ROOT = path.join(ROOT, 'tmp', 'manus-import-strike-11');

const PACK_META = [
  { theme: 'hiking-trekking', pack: 'hiking', prefix: 'hike-', fileRe: /sheet_1_hiking/i },
  { theme: 'postal-service', pack: 'postal-service', prefix: 'postal-', fileRe: /sheet_2_postal/i },
  { theme: 'hair-salon-barber', pack: 'hair-salon', prefix: 'salon-', fileRe: /sheet_3_hair/i },
  { theme: 'photography', pack: 'photography', prefix: 'photo-', fileRe: /sheet_4_photo/i },
  { theme: 'archaeology', pack: 'archaeology', prefix: 'arch-', fileRe: /sheet_5_archae/i },
  { theme: 'tailor-sewing', pack: 'tailor-sewing', prefix: 'sew-', fileRe: /sheet_6_tailor/i },
  { theme: 'bakery-backroom', pack: 'bakery', prefix: 'bake-', fileRe: /sheet_7_bakery/i },
  { theme: 'car-repair-shop', pack: 'car-repair', prefix: 'auto-', fileRe: /sheet_8_car/i },
  { theme: 'garden-center', pack: 'garden-center', prefix: 'garden-', fileRe: /sheet_9_garden/i },
  { theme: 'optician-eye-clinic', pack: 'optician', prefix: 'optic-', fileRe: /sheet_10_optic/i },
  { theme: 'recycling-center', pack: 'recycling-center', prefix: 'recycle-', fileRe: /sheet_11_recycl/i },
];

/** Known text / brand / junk cells to cull before merge (0-based cell index optional via name). */
const CULL_BY_PACK = {
  hiking: ['energy-bar'], // painted ENERGY text
  'postal-service': ['postage-stamp', 'fragile-sticker', 'shipping-label-blank', 'postmark', 'registered-mail-tag'],
  'hair-salon': ['appointment-book-blank'],
  photography: [],
  archaeology: ['scroll-blank', 'clay-tablet-blank'],
  'tailor-sewing': ['pattern-paper-blank'],
  bakery: [],
  'car-repair': [],
  'garden-center': ['seed-packet-blank', 'plant-label-blank'],
  optician: ['eye-chart', 'appointment-card-blank'], // Snellen letters / card text
  'recycling-center': ['hazard-sign', 'magazine-blank'],
};

const summary = { imported: [], errors: [], files: [] };

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

function listPngs() {
  if (!fs.existsSync(SRC_DIR)) return [];
  return fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.png$/i.test(f))
    .sort()
    .map((f) => path.join(SRC_DIR, f));
}

const pngs = listPngs();
summary.files = pngs.map((p) => path.basename(p));
if (pngs.length < 11) {
  console.error(`Need 11 PNGs in ${SRC_DIR}, found ${pngs.length}`);
  process.exit(2);
}

/** Match each pack to a PNG by filename hint; fall back to sorted index order. */
const used = new Set();
const assignments = [];
for (const meta of PACK_META) {
  let hit = pngs.find((p) => !used.has(p) && meta.fileRe.test(path.basename(p)));
  if (!hit) {
    hit = pngs.find((p) => !used.has(p));
  }
  if (!hit) throw new Error(`no PNG left for ${meta.theme}`);
  used.add(hit);
  assignments.push({ ...meta, file: hit });
}

for (const sheet of assignments) {
  const names = NAMES[sheet.theme];
  if (!Array.isArray(names) || names.length !== EXPECTED_CELLS) {
    throw new Error(`${sheet.theme} needs ${EXPECTED_CELLS} names, got ${names && names.length}`);
  }
  const stage = path.join(STAGE_ROOT, sheet.pack);
  fs.mkdirSync(stage, { recursive: true });

  console.error(`\n=== STAGE ${sheet.pack} (${GRID}) ← ${path.basename(sheet.file)} ===`);
  const imp = run(process.execPath, [
    path.join(ROOT, 'scripts/import-sheet.mjs'),
    sheet.file,
    `--grid=${GRID}`,
    `--prefix=${sheet.prefix}`,
    `--names=${names.join(',')}`,
    '--roles=object',
    '--scales=0.35',
    '--anchors=bottom',
    `--pack=${sheet.pack}`,
    `--stage=${stage}`,
  ]);

  const rowsFile = fs
    .readdirSync(stage)
    .filter((f) => f.endsWith('-rows.json'))
    .map((f) => path.join(stage, f))[0];
  if (!rowsFile) throw new Error(`no rows.json for ${sheet.pack}`);

  const rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));
  const cullKeys = new Set(
    (CULL_BY_PACK[sheet.pack] || []).map((n) => `${sheet.prefix}${n}`),
  );
  for (const e of rows) {
    if (e.blocked) e.skip = true;
    if (cullKeys.has(e.key) || (e.row && cullKeys.has(e.row.key))) {
      e.skip = true;
      e.culled = true;
      e.cullReason = 'manual cull (text/label risk)';
    }
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

  console.error(`\n=== MERGE ${sheet.pack} (${mergeReady.length} ready) ===`);
  const merge = run(process.execPath, [
    path.join(ROOT, 'scripts/merge-staged-props.mjs'),
    path.relative(ROOT, rowsFile).replace(/\\/g, '/'),
  ]);

  summary.imported.push({
    pack: sheet.pack,
    theme: sheet.theme,
    file: path.basename(sheet.file),
    grid: GRID,
    staged: rows.length,
    mergeReady: mergeReady.length,
    hardBlocked: hardBlocked.length,
    culled: culled.length,
    dedupSkip: dedupSkip.length,
    importExit: imp.status,
    mergeExit: merge.status,
  });
}

const out = path.join(STAGE_ROOT, 'import-summary.json');
fs.mkdirSync(STAGE_ROOT, { recursive: true });
fs.writeFileSync(out, JSON.stringify(summary, null, 2));
console.log('\n=== STRIKE-11 IMPORT SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
console.log(
  'kept_total=',
  summary.imported.reduce((n, s) => n + s.mergeReady, 0),
);
