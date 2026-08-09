/**
 * Curate Kenney 2D sprites into tmp/asset-banks/kenney/curated/<topic>/.
 * Keeps files with short side >= MIN (default 120); drops sheets/previews.
 *
 *   node scripts/kenney-curate.mjs
 *   node scripts/kenney-curate.mjs --min=160 --topics=zoo-animals,aquarium-fish
 *
 * Then merge dock-ready picks into PropBank:
 *   node scripts/kenney-import.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANK = path.join(ROOT, 'tmp', 'asset-banks', 'kenney');
const OUT = path.join(BANK, 'curated');

const SKIP_NAME = /^(preview|sample|spritesheet|tilesheet|round|square|default|double|@2x)/i;
const SKIP_PATH = /spritesheet|tilesheet|preview|sample/i;

const SOURCES = {
  // Remastered Round (~128–180px) supersedes original animal-pack Round.
  'zoo-animals': path.join(BANK, 'by-pack', 'animal-pack-remastered', 'PNG', 'Round'),
  // Default is 64px; Double is 128px (clears MIN_DOCK_SRC).
  'aquarium-fish': path.join(BANK, 'by-pack', 'fish-pack', 'PNG', 'Double'),
  // Finished planet discs only — Parts/ is noise/light assembly textures.
  'space-planets': path.join(BANK, 'by-pack', 'planets', 'Planets'),
  'space-simple': path.join(BANK, 'by-pack', 'simple-space', 'PNG', 'Retina'),
  'nature-foliage': path.join(BANK, 'by-pack', 'foliage-sprites', 'PNG'),
  // Foliage Pack Retina trees/bushes (separate from foliage-sprites billboards).
  'nature-foliage-pack': path.join(BANK, 'by-pack', 'foliage-pack', 'PNG', 'Retina'),
  'sports-gym': path.join(BANK, 'by-pack', 'sports-pack', 'PNG', 'Blue'),
  // Board-game object icons at 128px (Double). UI arrows culled at import.
  'board-icons': path.join(BANK, 'by-pack', 'board-game-icons', 'PNG', 'Double (128px)'),
  // Domino faces — one color set (Dark); ESL game props.
  'games-domino': path.join(BANK, 'by-pack', 'domino-pack', 'PNG', 'Dark'),
};

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function pngSize(buf) {
  if (!buf || buf[0] !== 0x89) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function walkPngs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_PATH.test(e.name)) continue;
      walkPngs(p, acc);
    } else if (/\.png$/i.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function main() {
  const min = Number(arg('min', '120')) || 120;
  const only = (arg('topics', '') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const topics = only.length ? only : Object.keys(SOURCES);

  const catalog = { min, generatedAt: new Date().toISOString(), topics: {} };

  for (const topic of topics) {
    const src = SOURCES[topic];
    if (!src || !fs.existsSync(src)) {
      console.log(`SKIP  ${topic} — missing ${src || '(unknown)'}`);
      continue;
    }
    const dest = path.join(OUT, topic);
    fs.mkdirSync(dest, { recursive: true });
    // Clear prior curated copies so removed sources don't linger.
    for (const old of fs.readdirSync(dest)) {
      if (/\.png$/i.test(old) || old === 'manifest.json') {
        fs.unlinkSync(path.join(dest, old));
      }
    }
    const kept = [];
    for (const file of walkPngs(src)) {
      const base = path.basename(file);
      if (SKIP_NAME.test(base.replace(/\.png$/i, ''))) continue;
      if (SKIP_PATH.test(file)) continue;
      const buf = fs.readFileSync(file);
      const size = pngSize(buf);
      if (!size || Math.min(size.w, size.h) < min) continue;
      const outName = base.toLowerCase().replace(/\s+/g, '-');
      const outPath = path.join(dest, outName);
      fs.copyFileSync(file, outPath);
      kept.push({ file: outName, srcW: size.w, srcH: size.h, min: Math.min(size.w, size.h) });
    }
    kept.sort((a, b) => a.file.localeCompare(b.file));
    catalog.topics[topic] = { count: kept.length, files: kept };
    fs.writeFileSync(path.join(dest, 'manifest.json'), `${JSON.stringify({ topic, min, files: kept }, null, 2)}\n`);
    console.log(`OK    ${topic}: ${kept.length} files (>=${min}px) → ${path.relative(ROOT, dest)}`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`\nCatalog: ${path.relative(ROOT, path.join(OUT, 'catalog.json'))}`);
}

main();
