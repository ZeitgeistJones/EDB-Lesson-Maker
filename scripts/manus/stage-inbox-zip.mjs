/**
 * Stage a Downloads/CDN zip into any assets-inbox folder — no pack import.
 *
 * Safe while Import track writes public/assets/07_vocab-pack/**.
 * Hash-skip via <inbox>/.source-hash.txt (use --force to overwrite).
 *
 *   node scripts/manus/stage-inbox-zip.mjs "<zip>" --inbox=assets-inbox/manus-cefrj-nouns-w1
 *   npm run assets:stage-inbox-zip -- "%USERPROFILE%\Downloads\cefrj-nouns.zip" --inbox=assets-inbox/manus-cefrj-verbs-w1
 *   npm run assets:stage-inbox-zip -- "...\verbs.zip" --inbox=assets-inbox/manus-cefrj-verbs-w1 --force
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');

function usage() {
  console.error(
    'Usage: node scripts/manus/stage-inbox-zip.mjs <zip-path> --inbox=<rel-or-abs> [--force] [--dry-run]'
  );
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function resolveInbox() {
  const a = process.argv.find((x) => x.startsWith('--inbox='));
  if (!a) return null;
  const rel = a.slice(8);
  return path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
}

function readSourceHash(inboxDir) {
  const p = path.join(inboxDir, '.source-hash.txt');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').trim().split(/\s+/)[0] || null;
}

function walkPngs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkPngs(full, out);
    else if (/\.png$/i.test(name)) out.push(full);
  }
  return out;
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const r = spawnSync('tar', ['-xf', zipPath, '-C', destDir], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(destDir)} -Force`,
    ],
    { encoding: 'utf8', windowsHide: true }
  );
  if (ps.status !== 0) {
    throw new Error(
      `Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`
    );
  }
}

function resolveZipArg() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!args.length) return null;
  let p = args[0];
  p = p.replace(/%USERPROFILE%/gi, os.homedir()).replace(/\$HOME|~(?=\/|\\|$)/, os.homedir());
  return path.resolve(p);
}

function main() {
  const zipPath = resolveZipArg();
  const inbox = resolveInbox();
  if (!zipPath || !inbox) {
    usage();
    process.exit(2);
  }
  if (!fs.existsSync(zipPath)) {
    console.error(`Zip not found: ${zipPath}`);
    process.exit(1);
  }
  if (!/\.zip$/i.test(zipPath)) {
    console.error(`Expected a .zip file: ${zipPath}`);
    process.exit(1);
  }

  const hash = sha256File(zipPath);
  const relInbox = path.relative(ROOT, inbox).replace(/\\/g, '/');
  console.log(`zip: ${zipPath}`);
  console.log(`sha256: ${hash}`);
  console.log(`inbox: ${relInbox}`);

  const existing = readSourceHash(inbox);
  if (existing && existing === hash && !FORCE) {
    console.log(`hash-skip: already staged in ${relInbox}`);
    console.log('Re-stage with --force, or proceed to import.');
    process.exit(0);
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-inbox-zip-'));
  try {
    extractZip(zipPath, tmpRoot);
    const pngs = walkPngs(tmpRoot).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    if (!pngs.length) {
      console.error('No PNGs found inside zip.');
      process.exit(1);
    }
    console.log(`pngs in zip: ${pngs.length}`);

    if (DRY) {
      console.log(`DRY would copy ${pngs.length} PNGs → ${relInbox}`);
      console.log(`DRY would write ${relInbox}/.source-hash.txt`);
      process.exit(0);
    }

    fs.mkdirSync(inbox, { recursive: true });
    const copied = [];
    for (const png of pngs) {
      const dest = path.join(inbox, path.basename(png));
      fs.copyFileSync(png, dest);
      copied.push(path.basename(png));
    }
    const hashNote = `${hash}  ${path.basename(zipPath)}\nstagedAt=${new Date().toISOString()}\nsource=${zipPath}\n`;
    fs.writeFileSync(path.join(inbox, '.source-hash.txt'), hashNote);

    console.log(`staged ${copied.length} PNG(s) → ${relInbox}`);
    console.log('Next: Import track runs pack write (do not double-run).');
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}

main();
