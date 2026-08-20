/**
 * Stage a Manus Shift60 picturable-verb zip into assets-inbox â€” no pack import.
 *
 * Safe to run while Import track writes public/assets/07_vocab-pack/**.
 *
 *   node scripts/manus/stage-verb-zip.mjs "C:\Users\...\Downloads\sheet.zip"
 *   node scripts/manus/stage-verb-zip.mjs "%USERPROFILE%\Downloads\w5.zip" --wave=5
 *   npm run assets:stage-picturable-verbs -- "%USERPROFILE%\Downloads\w5.zip" --wave=5
 *
 * Hash-skip: if any manus-shift60-verbs-wN/.source-hash.txt matches this zip's
 * sha256, exits 0 without re-copying (use --force to overwrite).
 *
 * After staging, Import track (or you) runs:
 *   npm run assets:import-picturable-verbs -- --wave=5
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
const WAVE_OVERRIDE = (() => {
  const a = process.argv.find((x) => x.startsWith('--wave='));
  return a ? Number(a.slice(7)) : null;
})();

const WAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function usage() {
  console.error(
    'Usage: node scripts/manus/stage-verb-zip.mjs <zip-path> [--wave=N] [--force] [--dry-run]'
  );
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function waveInbox(wave) {
  return path.join(ROOT, 'assets-inbox', `manus-shift60-verbs-w${wave}`);
}

function wavePlan(wave) {
  return path.join(ROOT, 'tmp', `manus-shift60-picturable-verbs-wave${wave}`, 'task1', 'run.json');
}

function readSourceHash(inboxDir) {
  const p = path.join(inboxDir, '.source-hash.txt');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').trim().split(/\s+/)[0] || null;
}

function findHashSkip(hash) {
  for (const wave of WAVES) {
    const inbox = waveInbox(wave);
    const existing = readSourceHash(inbox);
    if (existing && existing === hash) {
      return { wave, inbox };
    }
  }
  return null;
}

function loadWaveThemes(wave) {
  const planPath = wavePlan(wave);
  if (!fs.existsSync(planPath)) return [];
  try {
    const run = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    if (Array.isArray(run.sheets) && run.sheets.length) {
      return run.sheets.map((s) => slugify(s.theme || s.title || ''));
    }
  } catch {
    /* ignore bad plan */
  }
  return [];
}

function scorePngAgainstThemes(pngBase, themes) {
  const base = slugify(path.basename(pngBase, path.extname(pngBase)));
  let score = 0;
  for (const theme of themes) {
    if (!theme) continue;
    if (base.includes(theme)) score += 100;
    const tokens = theme.split('-').filter(Boolean);
    const hit = tokens.filter((t) => base.includes(t)).length;
    score += hit * 10;
    if (tokens.length && hit === tokens.length) score += 20;
  }
  return score;
}

function suggestWave(pngPaths) {
  const scores = [];
  for (const wave of WAVES) {
    const themes = loadWaveThemes(wave);
    if (!themes.length) {
      scores.push({ wave, score: 0, themes: 0, hasPlan: false });
      continue;
    }
    let score = 0;
    for (const png of pngPaths) {
      score += scorePngAgainstThemes(png, themes);
    }
    scores.push({ wave, score, themes: themes.length, hasPlan: true });
  }
  scores.sort((a, b) => b.score - a.score || a.wave - b.wave);
  return scores;
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
  // Windows 10+ tar handles .zip; keep argv simple (no shell).
  const r = spawnSync('tar', ['-xf', zipPath, '-C', destDir], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status === 0) return;
  // Fallback: PowerShell Expand-Archive
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
  // Expand common env-style shortcuts for Downloads.
  p = p.replace(/%USERPROFILE%/gi, os.homedir()).replace(/\$HOME|~(?=\/|\\|$)/, os.homedir());
  return path.resolve(p);
}

function main() {
  const zipPath = resolveZipArg();
  if (!zipPath) {
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
  console.log(`zip: ${zipPath}`);
  console.log(`sha256: ${hash}`);

  const skip = findHashSkip(hash);
  if (skip && !FORCE) {
    console.log(
      `hash-skip: already staged in ${path.relative(ROOT, skip.inbox).replace(/\\/g, '/')} (wave ${skip.wave})`
    );
    console.log(`Re-stage with --force, or import with:`);
    console.log(`  npm run assets:import-picturable-verbs -- --wave=${skip.wave}`);
    process.exit(0);
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-verb-zip-'));
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

    const ranked = suggestWave(pngs);
    console.log('wave theme scores (higher = better match):');
    for (const row of ranked.filter((r) => r.hasPlan || r.score > 0)) {
      console.log(`  w${row.wave}: score=${row.score} themes=${row.themes}`);
    }

    let wave = WAVE_OVERRIDE;
    if (wave == null) {
      const best = ranked.find((r) => r.hasPlan && r.score > 0) || ranked.find((r) => r.hasPlan);
      if (!best) {
        console.error('No wave plans found under tmp/manus-shift60-picturable-verbs-waveN/ â€” pass --wave=N');
        process.exit(1);
      }
      if (best.score < 15) {
        console.error(
          `Weak theme match (best w${best.wave} score=${best.score}). Pass --wave=N explicitly.`
        );
        process.exit(1);
      }
      wave = best.wave;
      console.log(`suggested wave: ${wave}`);
    } else {
      console.log(`wave override: ${wave}`);
    }

    if (!Number.isFinite(wave) || wave < 1) {
      console.error(`Invalid --wave=${wave}`);
      process.exit(1);
    }

    const inbox = waveInbox(wave);
    const relInbox = path.relative(ROOT, inbox).replace(/\\/g, '/');

    if (DRY) {
      console.log(`DRY would copy ${pngs.length} PNGs â†’ ${relInbox}`);
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

    console.log(`staged ${copied.length} PNG(s) â†’ ${relInbox}`);
    console.log('Next (Import track / pack write â€” do not double-run):');
    console.log(`  npm run assets:import-picturable-verbs -- --wave=${wave}`);
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}

main();

