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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', '09_props', 'img');
const MANIFEST = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');

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

function main() {
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

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (!manifest.props || typeof manifest.props !== 'object') {
    console.error('manifest.json missing props map');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

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

    const dest = path.join(OUT_DIR, outRow.file);
    if (dry) {
      console.log(`DRY  ${key} → ${path.relative(ROOT, dest)} scale=${relativeScale} pack=${pack || '—'}`);
      merged++;
      mergedKeys.push(key);
      continue;
    }

    fs.copyFileSync(src, dest);
    manifest.props[key] = outRow;
    merged++;
    mergedKeys.push(key);
    console.log(`OK   ${key}  scale=${relativeScale}  pack=${pack || '—'}`);
  }

  if (!dry && merged > 0) {
    const ordered = {};
    for (const k of Object.keys(manifest.props).sort()) ordered[k] = manifest.props[k];
    manifest.props = ordered;
    // House inline serializer (matches import-prop.mjs) — never pretty-print the bank.
    const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
    const pair = ([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`;
    const entryLine = (key, entry) =>
      `    ${JSON.stringify(key)}: { ${Object.entries(entry).map(pair).join(', ')} }`;
    const { props, ...head } = manifest;
    const headLines = Object.entries(head).map((e) => `  ${pair(e)}`);
    const propLines = Object.entries(props).map(([key, entry]) => entryLine(key, entry));
    fs.writeFileSync(
      MANIFEST,
      `{\n${headLines.join(',\n')},\n  "props": {\n${propLines.join(',\n')}\n  }\n}\n`
    );
  }

  console.log(`\nMerged ${merged} prop(s), skipped ${skipped}.`);
  if (mergedKeys.length) console.log(`Keys: ${mergedKeys.join(', ')}`);
  if (skipReasons.length && flag('verbose')) {
    console.log('Skip detail:');
    for (const r of skipReasons) console.log(`  ${r}`);
  }
}

main();
