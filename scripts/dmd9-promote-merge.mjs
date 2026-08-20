/**
 * Promote dedup-skip staged rows to -vN variants, then merge.
 * Also applies decorative + cull keys.
 *
 *   node scripts/dmd9-promote-merge.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE_ROOT = path.join(ROOT, 'tmp', 'manus-crew30', 'import', 'dmd9');
const MANIFEST = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');

const PACKS = [
  { dir: 'gashapon', decorative: true },
  { dir: 'castle' },
  { dir: 'aquarium' },
  { dir: 'tree' },
  { dir: 'space' },
  { dir: 'kitchen' },
  // sports skipped — text-in-art
  { dir: 'bathroom' },
  { dir: 'school' },
  { dir: 'farm' },
  { dir: 'music' },
];

const CULL = new Set(['music-empty-cell']);

function nextVariantKey(base, used) {
  let n = 2;
  while (used.has(`${base}-v${n}`)) n += 1;
  return `${base}-v${n}`;
}

function loadKeys() {
  const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  return new Set(Object.keys(m.props || {}));
}

function runMerge(rowsFile) {
  return spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/merge-staged-props.mjs'), path.relative(ROOT, rowsFile).replace(/\\/g, '/')],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
}

const before = loadKeys().size;
const summary = { before, packs: [], after: null };

for (const pack of PACKS) {
  const dir = path.join(STAGE_ROOT, pack.dir);
  if (!fs.existsSync(dir)) {
    summary.packs.push({ dir: pack.dir, error: 'missing stage dir' });
    continue;
  }
  const rowsFile = fs.readdirSync(dir).find((f) => f.endsWith('-rows.json'));
  if (!rowsFile) {
    summary.packs.push({ dir: pack.dir, error: 'no rows' });
    continue;
  }
  const rowsPath = path.join(dir, rowsFile);
  const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
  const used = loadKeys();
  for (const e of rows) {
    if (e.key) used.add(e.key);
  }

  let promoted = 0;
  for (const e of rows) {
    if (CULL.has(e.key) || (e.key && e.key.endsWith('-empty-cell'))) {
      e.skip = true;
      e.culled = true;
      e.cullReason = 'empty / manual cull';
    }
    if (e.blocked) e.skip = true;
    if (!e.row && !e.blocked) {
      e.skip = true;
      e.culled = true;
      e.cullReason = e.cullReason || 'no row';
    }
    if (e.dedup === 'skip' && e.row && e.stagedPath && !e.blocked && !e.skip) {
      const base = e.key;
      const vKey = nextVariantKey(base, used);
      used.add(vKey);
      e.variantOfBase = base;
      e.key = vKey;
      e.dedup = 'new';
      e.row = { ...e.row, file: `${vKey}.png`, variantOf: base };
      const oldPath = path.resolve(ROOT, e.stagedPath);
      const newPath = path.join(path.dirname(oldPath), `${vKey}.png`);
      if (fs.existsSync(oldPath) && oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        e.stagedPath = path.relative(ROOT, newPath).replace(/\\/g, '/');
      }
      promoted++;
    }
    if (pack.decorative && e.row) e.row.decorative = true;
  }
  fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));

  const ready = rows.filter(
    (e) => e.row && e.stagedPath && !e.blocked && !e.skip && e.dedup !== 'skip',
  );
  const hard = rows.filter((e) => e.blocked);

  console.error(`\n=== MERGE ${pack.dir} ready=${ready.length} promoted=${promoted} blocked=${hard.length} ===`);
  const merge = runMerge(rowsPath);
  if (merge.stdout) process.stdout.write(merge.stdout);
  if (merge.stderr) process.stderr.write(merge.stderr);

  const mergedLine = (merge.stdout || '').split('\n').find((l) => l.startsWith('Merged'));
  summary.packs.push({
    dir: pack.dir,
    ready: ready.length,
    promoted,
    hardBlocked: hard.length,
    hardKeys: hard.map((h) => h.key),
    mergeExit: merge.status,
    mergedLine: mergedLine || null,
  });
}

summary.after = loadKeys().size;
summary.delta = summary.after - summary.before;
fs.writeFileSync(path.join(STAGE_ROOT, 'promote-merge-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
