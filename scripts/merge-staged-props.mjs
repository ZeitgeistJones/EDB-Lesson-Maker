/**
 * Merge staged import-sheet rows into the live PropBank (09_props).
 *
 * Stage never writes public/; this is the intentional second step. Reads a
 * *-rows.json from assets:import-sheet, copies kept PNGs into
 * public/assets/09_props/img/, and inserts manifest rows (sorted keys).
 *
 *   node scripts/merge-staged-props.mjs tmp/manus-import-batch2/first-aid/aid-rows.json
 *   node scripts/merge-staged-props.mjs <rows.json> --dry-run
 *   node scripts/merge-staged-props.mjs <rows.json> --force   # replace existing keys
 *   node scripts/merge-staged-props.mjs <rows.json> --skip=aid-flashlight,aid-whistle
 *   node scripts/merge-staged-props.mjs <rows.json> --scales=aid-pill:0.12,aid-wheelchair:0.5
 *
 * Cull before merge by either:
 *   - editing rows.json: set "skip": true (or "dedup": "skip") on a cell, or
 *   - passing --skip=key1,key2
 *
 * Pack strings that arrived as "a,b,c" are split: first token → pack, all tokens
 * → tags (plus stem words from the key + "dock"). Placeholder relativeScale 0.5
 * is replaced when --scales lists the key; otherwise a small heuristic from the
 * key stem is applied so pencils aren't bookshelf-sized.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutateManifest } from './lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// PROPS_MANIFEST / PROPS_IMG_DIR are test-only overrides so the concurrency
// test (scripts/test-manifest-lock.mjs) can run real merges against a sandbox.
const OUT_DIR = process.env.PROPS_IMG_DIR
  ? path.resolve(ROOT, process.env.PROPS_IMG_DIR)
  : path.join(ROOT, 'public', 'assets', '09_props', 'img');
const MANIFEST = process.env.PROPS_MANIFEST
  ? path.resolve(ROOT, process.env.PROPS_MANIFEST)
  : path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);
const csv = (name) =>
  arg(name, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function retryFs(fn) {
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      const code = err && err.code;
      if (code !== 'UNKNOWN' && code !== 'EBUSY' && code !== 'EPERM') throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350 * attempt);
    }
  }
  throw lastErr;
}

/** Heuristic dock scale when rows still carry the importer placeholder 0.5. */
function heuristicScale(key) {
  const k = String(key || '').toLowerCase();
  const furniture =
    /wheelchair|stretcher|desk|chalkboard|deck-chair|cooler|umbrella|surfboard|palm-tree|backpack|globe|microscope|calendar|world-map/.test(
      k
    );
  if (furniture) return 0.45;
  const medium =
    /kit|box|bottle|monitor|crutches|sling|backpack|lunchbox|bucket|spade|life-vest|sandcastle|beach-bag|towel|chair|binder|notebook|clock|map|book|folder|blanket/.test(
      k
    );
  if (medium) return 0.28;
  const tiny =
    /pill|capsule|pin|clip|paperclip|eraser|crayon|pen$|pencil$|swab|ball$|bandaid$|bandage$|tweezers|drop|tape|gauze|mask|glove|syringe|inhaler|whistle|shell|starfish|frisbee|kite|popsicle|sandal|flip|sunglass|hat$/.test(
      k
    );
  if (tiny) return 0.15;
  const produce =
    /carrot|tomato|potato|broccoli|corn|apple|banana|orange|strawberr|grape|pear|pineapple|watermelon|cherries|blueberr|lemon|lime|peach|plum|kiwi|mango|onion|garlic|pepper|cucumber|eggplant|lettuce|spinach|cabbage|pumpkin|radish|mushroom/.test(
      k
    );
  if (produce) return 0.2;
  return 0.22;
}

function packTokens(packField) {
  if (!packField) return [];
  return String(packField)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function stemTags(key) {
  return String(key || '')
    .toLowerCase()
    .split('-')
    .filter((t) => t && t.length > 1 && !['aid', 'sch', 'food', 'beach', 'produce', 'school'].includes(t));
}

function buildTags(key, packField, existingTags) {
  const packs = packTokens(packField);
  const fromRow = (existingTags || []).filter((t) => t && t !== 'TODO');
  const tags = [...new Set([...packs, ...fromRow, ...stemTags(key), 'dock'])];
  return tags;
}

function parseScales(raw) {
  const map = new Map();
  for (const part of csv('scales')) {
    const colon = part.lastIndexOf(':');
    if (colon < 1) continue;
    const k = part.slice(0, colon).trim();
    const v = Number(part.slice(colon + 1));
    if (k && Number.isFinite(v) && v > 0) map.set(k, v);
  }
  // Also allow a JSON file: --scales-json=path
  const jsonPath = arg('scales-json', '');
  if (jsonPath) {
    const abs = path.resolve(ROOT, jsonPath);
    const obj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    for (const [k, v] of Object.entries(obj)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) map.set(k, n);
    }
  }
  return map;
}

async function main() {
  const rowsArg = process.argv[2];
  if (!rowsArg || rowsArg.startsWith('--')) {
    console.error(
      'usage: node scripts/merge-staged-props.mjs <*-rows.json> [--dry-run] [--force] [--skip=k1,k2] [--scales=k:0.2,...]'
    );
    process.exit(1);
  }

  const rowsPath = path.resolve(ROOT, rowsArg);
  if (!fs.existsSync(rowsPath)) {
    console.error(`No rows file at ${rowsPath}`);
    process.exit(1);
  }

  const dry = flag('dry-run');
  const force = flag('force');
  const skipSet = new Set(csv('skip'));
  const scaleMap = parseScales();

  const entries = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
  if (!Array.isArray(entries)) {
    console.error('rows.json must be an array of staged entries');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // The whole check-copy-insert pass runs against the manifest handed in.
  // For real runs that manifest is a FRESH read taken inside the manifest
  // lock (mutateManifest), so dedupe checks and inserts always apply to the
  // current bank — never a stale startup copy another importer has outrun.
  const runMerge = (manifest) => {
    if (!manifest.props || typeof manifest.props !== 'object') {
      throw new Error('manifest.json missing props map');
    }
    let merged = 0;
    let skipped = 0;
    const mergedKeys = [];
    const skipReasons = [];

    for (const entry of entries) {
    const key = entry.key;
    if (!key) {
      skipped++;
      skipReasons.push('(no-key)');
      continue;
    }
    if (entry.skip === true || entry.culled === true) {
      skipped++;
      skipReasons.push(`${key} (marked skip in rows)`);
      continue;
    }
    if (skipSet.has(key)) {
      skipped++;
      skipReasons.push(`${key} (--skip)`);
      continue;
    }
    if (entry.blocked || !entry.row || !entry.stagedPath) {
      skipped++;
      skipReasons.push(`${key} (blocked/no row)`);
      continue;
    }
    if (entry.dedup === 'skip' && !force) {
      skipped++;
      skipReasons.push(`${key} (dedup skip)`);
      continue;
    }
    if (manifest.props[key] && !force) {
      skipped++;
      skipReasons.push(`${key} (already in manifest)`);
      continue;
    }

    const src = path.resolve(ROOT, entry.stagedPath);
    if (!fs.existsSync(src)) {
      skipped++;
      skipReasons.push(`${key} (missing PNG ${entry.stagedPath})`);
      continue;
    }

    const rowIn = entry.row;
    const packs = packTokens(rowIn.pack);
    const pack = packs[0] || undefined;
    let relativeScale = Number(rowIn.relativeScale);
    if (scaleMap.has(key)) relativeScale = scaleMap.get(key);
    else if (!Number.isFinite(relativeScale) || relativeScale === 0.5) {
      relativeScale = heuristicScale(key);
    }

    // import-prop can leave role as TODO when --roles broadcast is incomplete;
    // never ship that into the live bank.
    const role =
      rowIn.role && rowIn.role !== 'TODO' ? rowIn.role : 'object';

    const outRow = {
      file: rowIn.file || `${key}.png`,
      role,
      tags: buildTags(key, rowIn.pack, rowIn.tags),
      relativeScale,
      anchor: rowIn.anchor || 'center',
      alpha: rowIn.alpha !== false,
      aspect: rowIn.aspect,
      srcW: rowIn.srcW,
      srcH: rowIn.srcH,
    };
    if (rowIn.bodyHue != null) outRow.bodyHue = rowIn.bodyHue;
    if (rowIn.components != null) outRow.components = rowIn.components;
    if (pack) outRow.pack = pack;
    if (rowIn.decorative === true) outRow.decorative = true;
    if (rowIn.stageFit) outRow.stageFit = rowIn.stageFit;
    if (rowIn.subject) outRow.subject = rowIn.subject;
    if (rowIn.variantOf) outRow.variantOf = rowIn.variantOf;
    // Semantic relationships are not visual variants. Preserve the named
    // family and edge metadata so K/K2/state packs can be retrieved without
    // flattening a view, state, counterpart, or atomic two-shot into "-v2".
    if (rowIn.relationshipId) outRow.relationshipId = rowIn.relationshipId;
    if (rowIn.parentKey) outRow.parentKey = rowIn.parentKey;
    if (rowIn.relationType) outRow.relationType = rowIn.relationType;
    if (rowIn.view) outRow.view = rowIn.view;
    if (rowIn.state) outRow.state = rowIn.state;
    if (rowIn.counterpartKey) outRow.counterpartKey = rowIn.counterpartKey;
    if (rowIn.atomicGroup) outRow.atomicGroup = rowIn.atomicGroup;

    const dest = path.join(OUT_DIR, outRow.file);
    if (dry) {
      console.log(`DRY  ${key} → ${path.relative(ROOT, dest)} scale=${relativeScale} pack=${pack || '—'}`);
      merged++;
      mergedKeys.push(key);
      continue;
    }

    retryFs(() => fs.copyFileSync(src, dest));
    manifest.props[key] = outRow;
    merged++;
    mergedKeys.push(key);
    console.log(`OK   ${key}  scale=${relativeScale}  pack=${pack || '—'}`);
    }

    return { merged, skipped, mergedKeys, skipReasons };
  };

  let out;
  if (dry) {
    // Dry runs never write, so they can read without taking the lock.
    out = runMerge(JSON.parse(fs.readFileSync(MANIFEST, 'utf8')));
  } else {
    // Lock → fresh read → merge (copies + inserts) → sorted atomic write.
    // Sorting and serialization (house inline format) live in mutateManifest.
    out = await mutateManifest(MANIFEST, runMerge);
  }

  const { merged, skipped, mergedKeys, skipReasons } = out;
  console.log(`\nMerged ${merged} prop(s), skipped ${skipped}.`);
  if (mergedKeys.length) console.log(`Keys: ${mergedKeys.join(', ')}`);
  if (skipReasons.length && flag('verbose')) {
    console.log('Skip detail:');
    for (const r of skipReasons) console.log(`  ${r}`);
  }
}

await main();
