/**
 * Key ragged-sheet blob crops into the **main** PropBank (`09_props`).
 *
 * Theme kits are not a side silo. Every piece gets:
 *   - pack tag(s) so a lesson can pull the whole group (e.g. castle, medieval)
 *   - part tags / a stable key so other lessons can still resolve that prop alone
 *
 *   node scripts/import-blob-props.mjs tmp/blob-slice/castle-medieval-sheet/blobs.json \
 *     --pack=castle,medieval --skip=1,7,8 --force
 *
 * Names: --name-map=file.json  {"2":"castle-wall-gate",...}
 *     or --names=a,b,c… in keeper order
 *     or default <pack>-<index>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', '09_props', 'img');
const MANIFEST = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

function slug(s) {
  return String(s || 'prop')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'prop';
}

function csv(name) {
  return arg(name, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const blobsPath = process.argv[2];
  if (!blobsPath || blobsPath.startsWith('--')) {
    console.error(
      'usage: node scripts/import-blob-props.mjs <blobs.json> --pack=castle,medieval [--skip=1,7,8] [--force]'
    );
    process.exit(1);
  }
  const absBlobs = path.resolve(ROOT, blobsPath);
  const summary = JSON.parse(fs.readFileSync(absBlobs, 'utf8'));
  const cropsDir = path.resolve(ROOT, summary.outputs.cropsDir);
  const packTags = csv('pack');
  if (!packTags.length) {
    console.error('Need --pack=tag (comma list OK). Pack tags go on every prop in the main bank.');
    process.exit(1);
  }
  const packSlug = slug(packTags[0]);
  const skip = new Set(csv('skip').map(Number));
  const force = flag('force');
  const nameMapPath = arg('name-map');
  const nameMap = nameMapPath
    ? JSON.parse(fs.readFileSync(path.resolve(ROOT, nameMapPath), 'utf8'))
    : {};
  const namesCsv = csv('names');

  const keepers = summary.blobs.filter((b) => !skip.has(b.index));
  if (namesCsv.length && namesCsv.length !== keepers.length) {
    console.error(`--names has ${namesCsv.length} entries but ${keepers.length} keepers after --skip`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  let ok = 0;
  let skipped = 0;

  for (let i = 0; i < keepers.length; i++) {
    const b = keepers[i];
    const cropFile = path.join(cropsDir, `${String(b.index).padStart(3, '0')}.png`);
    if (!fs.existsSync(cropFile)) {
      console.log(`SKIP  #${b.index} — missing crop`);
      skipped++;
      continue;
    }
    const name = slug(
      nameMap[String(b.index)]
        || nameMap[b.index]
        || namesCsv[i]
        || `${packSlug}-${String(b.index).padStart(2, '0')}`
    );
    const isHero = b.w * b.h >= summary.medianArea * 8 || b.w >= 400 || b.h >= 300;
    const MIN_DOCK_SRC = 120;
    if (!isHero && Math.min(b.w, b.h) < MIN_DOCK_SRC) {
      console.log(
        `SKIP  #${b.index} — soft splice ${b.w}x${b.h} (short side < ${MIN_DOCK_SRC}; re-prompt larger sheet cells)`
      );
      skipped++;
      continue;
    }
    const role = isHero ? 'hero' : 'object';
    const scale = isHero ? '0.9' : b.w * b.h > summary.medianArea * 2 ? '0.45' : '0.25';
    const anchor = isHero ? 'bottom' : 'center';
    const tags = [...new Set([
      ...packTags,
      isHero ? 'stage' : 'dock',
      'build',
    ])];

    const args = [
      path.join(ROOT, 'scripts', 'import-prop.mjs'),
      cropFile,
      `--name=${name}`,
      `--role=${role}`,
      `--tags=${tags.join(',')}`,
      `--scale=${scale}`,
      `--anchor=${anchor}`,
      `--threshold=${summary.opts?.threshold || 28}`,
    ];
    if (force) args.push('--force');

    console.log(`\n### #${b.index} → ${name} (${role})`);
    const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(run.stdout || '');
    process.stderr.write(run.stderr || '');

    const dest = path.join(OUT_DIR, `${name}.png`);
    if (!fs.existsSync(dest)) {
      console.log(`SKIP  ${name} — no PNG written`);
      skipped++;
      continue;
    }

    // Prefer keyed output size (after trim) over raw blob bbox.
    let srcW = b.w;
    let srcH = b.h;
    try {
      const png = fs.readFileSync(dest);
      if (png[0] === 0x89) {
        srcW = png.readUInt32BE(16);
        srcH = png.readUInt32BE(20);
      }
    } catch (_) { /* keep bbox */ }

    if (!isHero && Math.min(srcW, srcH) < MIN_DOCK_SRC) {
      console.log(`SKIP  ${name} — keyed short side ${Math.min(srcW, srcH)} < ${MIN_DOCK_SRC}`);
      try { fs.unlinkSync(dest); } catch (_) { /* ignore */ }
      skipped++;
      continue;
    }

    manifest.props[name] = {
      file: `${name}.png`,
      role,
      tags,
      relativeScale: Number(scale),
      anchor,
      alpha: true,
      aspect: Number((srcW / Math.max(1, srcH)).toFixed(2)),
      srcW,
      srcH,
      pack: packTags[0],
      ...(isHero ? { stageFit: 'fit' } : {}),
    };
    ok++;
  }

  const ordered = {};
  for (const k of Object.keys(manifest.props).sort()) ordered[k] = manifest.props[k];
  manifest.props = ordered;
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`\nMain bank: ${ok} props (pack=[${packTags.join(', ')}]), ${skipped} skipped.`);
  console.log('Same PropBank as everything else — pull by pack tag or by individual key/tags.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
