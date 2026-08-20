/**
 * Bulk-import stockpile art from harvested/ into live PropBank / backgrounds.
 *
 * Kid-interest black 3×3 sheets → staged import-sheet → merge-staged-props
 * Overview FULL-PAGE PNGs → import-background (scenes)
 *
 * Cell names come from scripts/manus/request-kid-interest-shift60.mjs WAVES.
 * Sheet↔spec matching uses inventory sheet names + wave sheet titles (Manus
 * zip order is unreliable).
 *
 *   node scripts/import-harvest-stockpile.mjs
 *   node scripts/import-harvest-stockpile.mjs --only=ki
 *   node scripts/import-harvest-stockpile.mjs --only=ow
 *   node scripts/import-harvest-stockpile.mjs --dry-run
 *   node scripts/import-harvest-stockpile.mjs --limit=5
 *   node scripts/import-harvest-stockpile.mjs --also=builder,be,cw
 *   node scripts/import-harvest-stockpile.mjs --only=also --also=builder,be,cw
 *   node scripts/import-harvest-stockpile.mjs --audit
 *   node scripts/import-harvest-stockpile.mjs --proof
 *
 * Does NOT git-add harvested PNGs. Writes public/assets only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WAVES as KI_WAVES } from './manus/request-kid-interest-shift60.mjs';
import { shouldSkipLooseHarvestPath } from './lib/asset-wiring-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KI_INV = path.join(ROOT, 'docs/kid-interest-shift60-inventory.json');
const OW_INV = path.join(ROOT, 'docs/overview-worlds-inventory.json');
const STAGE_ROOT = path.join(ROOT, 'tmp/import-harvest');
const LOG_PATH = path.join(ROOT, 'tmp/import-harvest/import-log.jsonl');

const DRY = process.argv.includes('--dry-run');
const ONLY = (() => {
  const a = process.argv.find((x) => x.startsWith('--only='));
  return a ? a.slice(7) : 'all';
})();
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith('--limit='));
  return a ? Number(a.slice(8)) : Infinity;
})();
const ALSO = (() => {
  const a = process.argv.find((x) => x.startsWith('--also='));
  return a
    ? a
        .slice(7)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
})();
const LANES = (() => {
  const a = process.argv.find((x) => x.startsWith('--lanes='));
  return a
    ? new Set(
        a
          .slice(8)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;
})();
const FAMILIES = (() => {
  const a = process.argv.find((x) => x.startsWith('--families='));
  return a
    ? new Set(
        a
          .slice(11)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;
})();
// Existing keys are immutable by default at stockpile scale. A deliberate
// replacement requires --replace-existing; --skip-existing remains accepted.
const REPLACE_EXISTING = process.argv.includes('--replace-existing');
const SKIP_EXISTING = !REPLACE_EXISTING || process.argv.includes('--skip-existing');
const WORKER = (() => {
  const a = process.argv.find((x) => x.startsWith('--worker='));
  return a ? a.slice(9) : 'main';
})();

function propsManifestKeys() {
  try {
    const m = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8')
    );
    return new Set(Object.keys(m.props || m));
  } catch {
    return new Set();
  }
}

function sceneManifestKeys() {
  try {
    const m = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/assets/08_backgrounds/manifest.json'), 'utf8')
    );
    return new Set(Object.keys(m.scenes || {}));
  } catch {
    return new Set();
  }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function logLine(obj) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), worker: WORKER, ...obj });
  fs.appendFileSync(LOG_PATH, `${line}\n`);
  console.log(line);
}

function runNode(args, label) {
  if (DRY) {
    logLine({ dry: true, label, args: args.slice(0, 6) });
    return { status: 0 };
  }
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) {
    logLine({
      fail: label,
      status: r.status,
      stderr: (r.stderr || '').slice(-2000),
      stdout: (r.stdout || '').slice(-1000),
    });
  }
  return r;
}

function scoreMatch(fileLabel, sheetSpec) {
  const n = slugify(fileLabel);
  const title = slugify(sheetSpec.title || '');
  const id = slugify(sheetSpec.id || '');
  let s = 0;
  for (const tok of title.split('-')) {
    if (tok.length > 2 && n.includes(tok)) s += 2;
  }
  if (id && n.includes(id.toLowerCase())) s += 3;
  // cell family hints
  const fams = new Set((sheetSpec.cells || []).map((c) => String(c.key || c.concept || '').split('-')[1]).filter(Boolean));
  for (const f of fams) {
    if (f.length > 2 && n.includes(f)) s += 1;
  }
  return s;
}

function matchSheetSpec(fileMeta, waveSheets) {
  const label = fileMeta.name || fileMeta.file || '';
  let best = null;
  let bestScore = -1;
  for (const sh of waveSheets) {
    const sc = scoreMatch(label, sh);
    if (sc > bestScore) {
      bestScore = sc;
      best = sh;
    }
  }
  // fallback: index order if unique unused — caller handles
  return bestScore >= 2 ? best : null;
}

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function listSheetPngs(sheetDir) {
  if (!fs.existsSync(sheetDir)) return [];
  return fs
    .readdirSync(sheetDir)
    .filter((f) => /^(\d+|s\d+)\.png$/i.test(f) || /\.png$/i.test(f))
    .filter((f) => !/qa|raw|thumb/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(sheetDir, f));
}

function importKiSheet(waveId, lane, sheetPath, sheetSpec, usedSpecs) {
  const names = (sheetSpec.cells || []).map((c) => c.key.replace(/^ki-/, '')).join(',');
  // keys in WAVES are already ki-family-slug; import-sheet --prefix=ki- would double.
  // Use full keys as --names and empty prefix.
  const fullNames = (sheetSpec.cells || []).map((c) => c.key).join(',');
  if (!fullNames || (sheetSpec.cells || []).length !== 9) {
    logLine({ skip: 'bad-cell-count', waveId, sheetPath, n: (sheetSpec.cells || []).length });
    return false;
  }
  const stage = path.join(STAGE_ROOT, 'ki', waveId, sheetSpec.id || path.basename(sheetPath, '.png'));
  fs.mkdirSync(stage, { recursive: true });
  const pack = `kid-interest,${lane || 'misc'}`;
  const args = [
    path.join(ROOT, 'scripts/import-sheet.mjs'),
    sheetPath,
    '--grid=3x3',
    `--names=${fullNames}`,
    `--pack=${pack}`,
    `--stage=${stage}`,
    '--stage-all',
  ];
  const r = runNode(args, `ki-sheet:${waveId}/${sheetSpec.id}`);
  if (r.status !== 0) return false;
  usedSpecs.add(sheetSpec.id);
  // merge rows.json
  const rows = fs.existsSync(stage)
    ? fs.readdirSync(stage).filter((f) => f.endsWith('-rows.json') || f.endsWith('rows.json'))
    : [];
  // import-sheet writes <prefix>rows.json — find any *rows.json
  const allRows = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/rows\.json$/i.test(ent.name)) allRows.push(p);
    }
  }
  walk(stage);
  for (const rowsPath of allRows) {
    const mr = runNode(
      [path.join(ROOT, 'scripts/merge-staged-props.mjs'), rowsPath],
      `ki-merge:${path.basename(rowsPath)}`
    );
    if (mr.status !== 0) return false;
  }
  return true;
}

function importOwSheet(familyId, bucket, sheetPath, nameHint) {
  const base = slugify(nameHint || path.basename(sheetPath, path.extname(sheetPath)));
  const name = base.startsWith('ow-') ? base : `ow-${base}`;
  const tags = ['overview-world', bucket || 'overview', 'stockpile'].join(',');
  const args = [
    path.join(ROOT, 'scripts/import-background.mjs'),
    sheetPath,
    `--name=${name}`,
    `--category=${bucket || 'overview'}`,
    `--tags=${tags}`,
  ];
  if (REPLACE_EXISTING) args.push('--force');
  const r = runNode(args, `ow:${name}`);
  return r.status === 0;
}

async function importKidInterest() {
  const inv = loadJson(KI_INV);
  if (!inv?.waves) {
    logLine({ skip: 'no-ki-inventory' });
    return { done: 0, fail: 0, skipped: 0 };
  }
  let done = 0;
  let fail = 0;
  let skipped = 0;
  const existing = SKIP_EXISTING ? propsManifestKeys() : null;
  const waves = Object.values(inv.waves).filter((w) => {
    const id = String(w.family_id || '');
    if (id.startsWith('ow-') || w.stockpile === 'overview-worlds') return false;
    if (FAMILIES && !FAMILIES.has(id)) return false;
    if (!( (w.qa || '').toUpperCase() === 'PASS' || !(w.holds || []).length )) return false;
    if (LANES && !LANES.has(w.lane) && !LANES.has(w.bucket)) return false;
    return true;
  });
  for (const w of waves) {
    if (done + fail >= LIMIT) break;
    const waveDef = KI_WAVES[w.family_id];
    if (!waveDef?.sheets?.length) {
      logLine({ skip: 'no-wave-def', family_id: w.family_id });
      skipped++;
      continue;
    }
    const sheetDir = w.sheet_dir;
    const metaSheets = w.sheets || [];
    const pngs = listSheetPngs(sheetDir).filter((p) => {
      const b = path.basename(p);
      return /^\d+\.png$/i.test(b);
    });
    const used = new Set();
    const remaining = [...waveDef.sheets];
    for (let i = 0; i < pngs.length; i++) {
      if (done + fail >= LIMIT) break;
      const png = pngs[i];
      const meta = metaSheets.find((s) => s.file === path.basename(png)) || {
        file: path.basename(png),
        name: path.basename(png),
      };
      let spec = matchSheetSpec(meta, remaining);
      if (!spec && remaining[i]) spec = remaining[i];
      if (!spec) {
        logLine({ skip: 'no-spec-match', png, family_id: w.family_id });
        fail++;
        continue;
      }
      if (existing) {
        const keys = (spec.cells || []).map((c) => c.key);
        if (keys.length && keys.every((k) => existing.has(k))) {
          logLine({ skip: 'already-imported', family_id: w.family_id, sheet: spec.id });
          skipped++;
          const idx0 = remaining.indexOf(spec);
          if (idx0 >= 0) remaining.splice(idx0, 1);
          continue;
        }
      }
      const idx = remaining.indexOf(spec);
      if (idx >= 0) remaining.splice(idx, 1);
      const ok = importKiSheet(w.family_id, w.lane || waveDef.lane, png, spec, used);
      if (ok) {
        done++;
        logLine({ ok: 'ki-sheet', family_id: w.family_id, sheet: spec.id });
        if (existing) for (const c of spec.cells || []) existing.add(c.key);
      } else fail++;
    }
  }
  return { done, fail, skipped };
}

async function importOverviewWorlds() {
  const inv = loadJson(OW_INV);
  // Also scan KI inventory for ow-* waves + filesystem
  const families = [];
  if (inv?.waves) families.push(...Object.values(inv.waves));
  const kiInv = loadJson(KI_INV);
  if (kiInv?.waves) {
    for (const w of Object.values(kiInv.waves)) {
      if (String(w.family_id || '').startsWith('ow-') || w.stockpile === 'overview-worlds') {
        families.push(w);
      }
    }
  }
  // filesystem sweep for any sheet dirs under harvested/overview-worlds
  const owRoot = path.join(ROOT, 'harvested/overview-worlds');
  function findSheetDirs(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (!ent.isDirectory()) continue;
      if (ent.name === 'sheets') acc.push(p);
      else findSheetDirs(p, acc);
    }
    return acc;
  }
  const sheetDirs = findSheetDirs(owRoot);
  let done = 0;
  let fail = 0;
  let skipped = 0;
  const existingScenes = SKIP_EXISTING ? sceneManifestKeys() : null;

  const seen = new Set();
  for (const w of families) {
    if (done + fail >= LIMIT) break;
    if ((w.qa && String(w.qa).toUpperCase() === 'JUNK') || (w.holds || []).length > 3) continue;
    if (FAMILIES && !FAMILIES.has(String(w.family_id || ''))) continue;
    if (LANES && !LANES.has(w.bucket) && !LANES.has(w.lane)) continue;
    const sheetDir = w.sheet_dir;
    if (!sheetDir || !fs.existsSync(sheetDir)) continue;
    seen.add(path.resolve(sheetDir));
    const metaSheets = w.sheets || [];
    const pngs = listSheetPngs(sheetDir).filter((p) => /^\d+\.png$/i.test(path.basename(p)));
    for (let i = 0; i < pngs.length; i++) {
      if (done + fail >= LIMIT) break;
      const png = pngs[i];
      const meta = metaSheets[i] || metaSheets.find((s) => s.file === path.basename(png));
      const hint = meta?.name || `${w.family_id}-${path.basename(png, '.png')}`;
      const base = slugify(hint.replace(/\.png$/i, ''));
      const name = base.startsWith('ow-') ? base : `ow-${base}`;
      if (existingScenes?.has(name)) {
        logLine({ skip: 'ow-already', name });
        skipped++;
        continue;
      }
      const ok = importOwSheet(w.family_id, w.bucket || w.lane, png, hint.replace(/\.png$/i, ''));
      if (ok) {
        done++;
        logLine({ ok: 'ow', name });
        existingScenes?.add(name);
      } else fail++;
    }
  }

  // leftover dirs not in inventory
  for (const sd of sheetDirs) {
    if (done + fail >= LIMIT) break;
    if (seen.has(path.resolve(sd))) continue;
    const bucket = path.basename(path.dirname(path.dirname(sd)));
    const family = path.basename(path.dirname(sd));
    for (const png of listSheetPngs(sd).filter((p) => /^\d+\.png$/i.test(path.basename(p)))) {
      if (done + fail >= LIMIT) break;
      const hint = `${family}-${path.basename(png, '.png')}`;
      const ok = importOwSheet(family, bucket, png, hint);
      if (ok) done++;
      else fail++;
    }
  }
  return { done, fail, skipped };
}

/** Best-effort: builder/be/cw full-page landscapes → backgrounds (names from path). */
function importLooseContactDir(rootRel, pack, prefix) {
  const root = path.join(ROOT, rootRel);
  if (!fs.existsSync(root)) return { done: 0, fail: 0, skipped: 0, skip: 'missing' };
  // Without cell catalogs, only import obvious single full-page PNGs as backgrounds
  // (not black contact sheets — those need names).
  let done = 0;
  let fail = 0;
  let skipped = 0;
  const existingScenes = SKIP_EXISTING ? sceneManifestKeys() : null;
  const skipDirNames = new Set([
    '_harvested_aside_during_filter',
    '_harvested_aside',
    'remop',
    'qa',
    'raw',
    'thumbs',
  ]);
  function walk(dir) {
    if (done + fail >= LIMIT) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (skipDirNames.has(ent.name)) continue;
        walk(p);
        continue;
      }
      if (!/\.png$/i.test(ent.name)) continue;
      if (!/^\d+\.png$/i.test(ent.name) && !/^ow-/i.test(ent.name)) continue;
      // Family rules fail closed for multi-view, registered-state, and other
      // specialized board assets. A landscape contact sheet is not one scene.
      if (shouldSkipLooseHarvestPath(p)) {
        logLine({ skip: 'specialized-family', path: p });
        skipped++;
        continue;
      }
      // Heuristic: large landscape → background
      try {
        const fd = fs.openSync(p, 'r');
        const buf = Buffer.alloc(24);
        fs.readSync(fd, buf, 0, 24, 0);
        fs.closeSync(fd);
        if (buf.toString('ascii', 1, 4) !== 'PNG') continue;
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        if (w < 800 || h < 400 || w / h < 1.2) continue; // skip contact grids
        const rel = path.relative(root, p).replace(/\\/g, '/');
        const stem = rel
          .replace(/\/sheets\//gi, '-')
          .replace(/\.png$/i, '')
          .replace(/\//g, '-');
        const base = slugify(`${prefix}-${stem}`);
        // importOwSheet prefixes ow- unless already present — use final key for skip + import
        const name = base.startsWith('ow-') ? base : `ow-${base}`;
        if (existingScenes?.has(name)) {
          logLine({ skip: 'loose-already', name, path: p });
          skipped++;
          continue;
        }
        const ok = importOwSheet(name, pack, p, name);
        if (ok) {
          done++;
          existingScenes?.add(name);
          logLine({ ok: 'loose', name, path: p });
        } else fail++;
      } catch {
        fail++;
      }
      if (done + fail >= LIMIT) return;
    }
  }
  walk(root);
  return { done, fail, skipped };
}

async function main() {
  if (process.argv.includes('--audit') || process.argv.includes('--proof')) {
    const auditArgs = [path.join(ROOT, 'scripts/audit-asset-wiring.mjs')];
    if (process.argv.includes('--proof')) auditArgs.push('--proof');
    const outputArg = process.argv.find((value) => value.startsWith('--output='));
    if (outputArg) auditArgs.push(outputArg);
    const result = spawnSync(process.execPath, auditArgs, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    process.exitCode = result.status == null ? 1 : result.status;
    return;
  }

  fs.mkdirSync(STAGE_ROOT, { recursive: true });
  logLine({
    start: true,
    only: ONLY,
    limit: Number.isFinite(LIMIT) ? LIMIT : 'inf',
    dry: DRY,
    also: ALSO,
    lanes: LANES ? [...LANES] : null,
    families: FAMILIES ? [...FAMILIES] : null,
    skipExisting: SKIP_EXISTING,
    replaceExisting: REPLACE_EXISTING,
  });

  const summary = {};
  if (ONLY !== 'also') {
    if (ONLY === 'all' || ONLY === 'ki') {
      summary.ki = await importKidInterest();
    }
    if (ONLY === 'all' || ONLY === 'ow') {
      summary.ow = await importOverviewWorlds();
    }
  }
  // --only=also skips ki/ow. With no --also list, default all three loose packs.
  const alsoList =
    ONLY === 'also' ? (ALSO.length ? ALSO : ['builder', 'be', 'cw']) : ALSO;
  if (alsoList.includes('builder')) {
    summary.builder = importLooseContactDir('harvested/builder-worlds', 'builder-world', 'bw');
  }
  if (alsoList.includes('be')) {
    summary.be = importLooseContactDir('harvested/board-enabling', 'board-enabling', 'be');
  }
  if (alsoList.includes('cw')) {
    summary.cw = importLooseContactDir('harvested/content-worlds', 'content-world', 'cw');
  }

  logLine({ done: true, summary });
  console.log('\n=== IMPORT SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
