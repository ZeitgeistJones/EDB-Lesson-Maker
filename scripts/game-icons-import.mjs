/**
 * Fetch a curated game-icons.net CC-BY 3.0 tool shelf into PropBank.
 * Black-on-transparent CDN PNGs already have real alpha — pad to 512 and
 * merge as gicon-* (styleFamily: game-icons). Do not black-key (would erase
 * the silhouette).
 *
 *   node scripts/game-icons-import.mjs
 *   node scripts/game-icons-import.mjs --force
 *   node scripts/game-icons-import.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANK = path.join(ROOT, 'tmp', 'asset-banks', 'game-icons');
const RAW = path.join(BANK, 'raw');
const NORM = path.join(BANK, 'norm');
const OUT_DIR = path.join(ROOT, 'public', 'assets', '09_props', 'img');
const MANIFEST = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');
const ATTRIBUTION = path.join(BANK, 'ATTRIBUTION.md');
const SIZE = 512;
const MARGIN = 0.08;
/** CDN icons are already 512; set --pad to re-margin via Playwright. */
const DO_PAD = process.argv.includes('--pad');

const AUTHORS = {
  lorc: { name: 'Lorc', url: 'https://lorcblog.blogspot.com' },
  delapouite: { name: 'Delapouite', url: 'https://delapouite.com' },
  'caro-asercion': { name: 'Caro Asercion', url: 'https://game-icons.net/about.html' },
  skoll: { name: 'Skoll', url: 'https://game-icons.net/about.html' },
};

/**
 * Curated mid-obscure tools for thin ESL themes. Avoid pirate/fire/dino Manus
 * overlap; prefer nouns from the Shift20 track B wishlist.
 */
const ICONS = [
  { author: 'delapouite', slug: 'trowel', key: 'gicon-trowel', tags: ['trowel', 'masonry', 'brick', 'garden'], scale: 0.22 },
  { author: 'lorc', slug: 'magnifying-glass', key: 'gicon-loupe', tags: ['loupe', 'magnifying-glass', 'search', 'inspect'], scale: 0.2 },
  { author: 'lorc', slug: 'cog', key: 'gicon-cog', tags: ['cog', 'gear', 'machine', 'mechanic'], scale: 0.22 },
  { author: 'lorc', slug: 'gears', key: 'gicon-gears', tags: ['gears', 'gear', 'cog', 'machine'], scale: 0.28 },
  { author: 'lorc', slug: 'spanner', key: 'gicon-wrench', tags: ['wrench', 'spanner', 'tool', 'mechanic'], scale: 0.22 },
  { author: 'lorc', slug: 'sewing-needle', key: 'gicon-sewing-needle', tags: ['sewing-needle', 'needle', 'sew', 'tailor'], scale: 0.14 },
  { author: 'delapouite', slug: 'yarn', key: 'gicon-thread-spool', tags: ['thread-spool', 'yarn', 'thread', 'spool', 'knit'], scale: 0.2 },
  { author: 'lorc', slug: 'compass', key: 'gicon-compass', tags: ['compass', 'navigate', 'direction', 'scout'], scale: 0.22 },
  { author: 'delapouite', slug: 'sextant', key: 'gicon-sextant', tags: ['sextant', 'navigate', 'navigation', 'marine'], scale: 0.24 },
  { author: 'delapouite', slug: 'binoculars', key: 'gicon-binoculars', tags: ['binoculars', 'look', 'scout', 'birdwatch'], scale: 0.24 },
  { author: 'delapouite', slug: 'flashlight', key: 'gicon-flashlight', tags: ['flashlight', 'torch', 'light', 'camp'], scale: 0.2 },
  { author: 'delapouite', slug: 'torch', key: 'gicon-torch', tags: ['torch', 'flashlight', 'light', 'camp'], scale: 0.22 },
  { author: 'delapouite', slug: 'backpack', key: 'gicon-backpack', tags: ['backpack', 'bag', 'hike', 'school'], scale: 0.35 },
  { author: 'delapouite', slug: 'camping-tent', key: 'gicon-tent', tags: ['tent', 'camp', 'camping', 'outdoor'], scale: 0.45 },
  { author: 'delapouite', slug: 'sleeping-bag', key: 'gicon-sleeping-bag', tags: ['sleeping-bag', 'camp', 'sleep', 'outdoor'], scale: 0.35 },
  { author: 'lorc', slug: 'fossil', key: 'gicon-fossil', tags: ['fossil', 'dig', 'paleontology', 'bone'], scale: 0.28 },
  { author: 'lorc', slug: 'trilobite', key: 'gicon-trilobite', tags: ['trilobite', 'fossil', 'dig', 'paleontology'], scale: 0.22 },
  { author: 'delapouite', slug: 'amphora', key: 'gicon-pottery', tags: ['pottery', 'amphora', 'clay', 'vase'], scale: 0.35 },
  { author: 'delapouite', slug: 'broken-pottery', key: 'gicon-broken-pottery', tags: ['pottery', 'broken', 'shard', 'clay', 'archaeology'], scale: 0.28 },
  { author: 'delapouite', slug: 'jug', key: 'gicon-jug', tags: ['jug', 'pottery', 'clay', 'vessel'], scale: 0.3 },
  { author: 'lorc', slug: 'folded-paper', key: 'gicon-bone-folder', tags: ['bone-folder', 'folded-paper', 'bookbind', 'craft'], scale: 0.18 },
  { author: 'delapouite', slug: 'chisel', key: 'gicon-chisel', tags: ['chisel', 'awl', 'carve', 'wood', 'stone'], scale: 0.2 },
  { author: 'delapouite', slug: 'clamp', key: 'gicon-clamp', tags: ['clamp', 'tweezers', 'grip', 'workshop'], scale: 0.22 },
  { author: 'lorc', slug: 'screwdriver', key: 'gicon-screwdriver', tags: ['screwdriver', 'screw', 'mechanic', 'workshop'], scale: 0.18 },
  { author: 'delapouite', slug: 'hand-saw', key: 'gicon-hand-saw', tags: ['hand-saw', 'saw', 'wood', 'carpenter'], scale: 0.28 },
  { author: 'lorc', slug: 'scissors', key: 'gicon-scissors', tags: ['scissors', 'cut', 'craft', 'tailor'], scale: 0.22 },
  { author: 'delapouite', slug: 'drill', key: 'gicon-drill', tags: ['drill', 'mandrel', 'power-tool', 'workshop'], scale: 0.24 },
  { author: 'delapouite', slug: 'toolbox', key: 'gicon-toolbox', tags: ['toolbox', 'tools', 'workshop', 'mechanic'], scale: 0.35 },
  { author: 'delapouite', slug: 'crowbar', key: 'gicon-crowbar', tags: ['crowbar', 'pry', 'tool', 'workshop'], scale: 0.28 },
  { author: 'lorc', slug: 'hammer-nails', key: 'gicon-hammer', tags: ['hammer', 'nails', 'carpenter', 'workshop'], scale: 0.24 },
  { author: 'delapouite', slug: 'toy-mallet', key: 'gicon-mallet', tags: ['mallet', 'hammer', 'wood', 'craft'], scale: 0.22 },
  { author: 'delapouite', slug: 'paint-brush', key: 'gicon-paint-brush', tags: ['paint-brush', 'brush', 'paint', 'art'], scale: 0.2 },
  { author: 'delapouite', slug: 'palette', key: 'gicon-palette', tags: ['palette', 'paint', 'art', 'color'], scale: 0.24 },
  { author: 'lorc', slug: 'spyglass', key: 'gicon-spyglass', tags: ['spyglass', 'telescope', 'look', 'scout'], scale: 0.22 },
  { author: 'delapouite', slug: 'telescope', key: 'gicon-telescope', tags: ['telescope', 'spyglass', 'astronomy', 'look'], scale: 0.35 },
  { author: 'delapouite', slug: 'rope-coil', key: 'gicon-rope-coil', tags: ['rope', 'coil', 'camp', 'climb'], scale: 0.24 },
  { author: 'delapouite', slug: 'carabiner', key: 'gicon-carabiner', tags: ['carabiner', 'climb', 'clip', 'hike'], scale: 0.16 },
  { author: 'caro-asercion', slug: 'sewing-machine', key: 'gicon-sewing-machine', tags: ['sewing-machine', 'sew', 'tailor', 'craft'], scale: 0.35 },
  { author: 'delapouite', slug: 'swiss-army-knife', key: 'gicon-swiss-army-knife', tags: ['swiss-army-knife', 'knife', 'multi-tool', 'camp'], scale: 0.2 },
  { author: 'delapouite', slug: 'box-cutter', key: 'gicon-box-cutter', tags: ['box-cutter', 'cutter', 'blade', 'craft'], scale: 0.18 },
  { author: 'lorc', slug: 'anvil', key: 'gicon-anvil', tags: ['anvil', 'blacksmith', 'forge', 'metal'], scale: 0.35 },
  { author: 'delapouite', slug: 'mortar', key: 'gicon-mortar', tags: ['mortar', 'pestle', 'grind', 'kitchen', 'lab'], scale: 0.24 },
  { author: 'delapouite', slug: 'clay-brick', key: 'gicon-clay-brick', tags: ['brick', 'clay', 'masonry', 'build'], scale: 0.22 },
  { author: 'lorc', slug: 'lantern', key: 'gicon-lantern', tags: ['lantern', 'light', 'camp', 'outdoor'], scale: 0.24 },
  { author: 'lorc', slug: 'screw', key: 'gicon-screw', tags: ['screw', 'bolt', 'hardware', 'workshop'], scale: 0.12 },
  { author: 'delapouite', slug: 'hexagonal-nut', key: 'gicon-nut', tags: ['nut', 'bolt', 'hardware', 'workshop'], scale: 0.12 },
];

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

function pngSize(buf) {
  if (!buf || buf[0] !== 0x89) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function cdnUrl(author, slug) {
  return `https://game-icons.net/icons/000000/transparent/1x1/${author}/${slug}.png`;
}

function pageUrl(author, slug) {
  return `https://game-icons.net/1x1/${author}/${slug}.html`;
}

function writeManifest(manifest) {
  const ordered = {};
  for (const k of Object.keys(manifest.props).sort()) ordered[k] = manifest.props[k];
  manifest.props = ordered;
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

function writeAttribution(icons) {
  const lines = [
    '# game-icons.net attribution',
    '',
    'Icons from [game-icons.net](https://game-icons.net/), licensed under',
    '[Creative Commons Attribution 3.0 Unported (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/).',
    '',
    'Commercial use is allowed with attribution. Credit form used here:',
    '`Icons made by {author}. Available on https://game-icons.net`',
    '',
    '| PropBank key | Icon | Author | Page |',
    '|---|---|---|---|',
  ];
  for (const ic of icons) {
    const a = AUTHORS[ic.author] || { name: ic.author, url: pageUrl(ic.author, ic.slug) };
    lines.push(
      `| \`${ic.key}\` | ${ic.slug} | [${a.name}](${a.url}) | [${ic.slug}](${pageUrl(ic.author, ic.slug)}) |`
    );
  }
  lines.push(
    '',
    '## Authors (this shelf)',
    '',
    ...[...new Set(icons.map((i) => i.author))].map((id) => {
      const a = AUTHORS[id];
      return `- **${a.name}** — ${a.url}`;
    }),
    '',
    `Imported ${new Date().toISOString().slice(0, 10)} into \`public/assets/09_props/\` as \`gicon-*\` (styleFamily: game-icons).`,
    ''
  );
  fs.writeFileSync(ATTRIBUTION, `${lines.join('\n')}\n`);
}

async function download(icon) {
  const dest = path.join(RAW, `${icon.key}.png`);
  if (fs.existsSync(dest) && !flag('force')) {
    return dest;
  }
  const url = cdnUrl(icon.author, icon.slug);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

async function normalizeAll(paths) {
  fs.mkdirSync(NORM, { recursive: true });
  if (!DO_PAD) {
    for (const src of paths) {
      fs.copyFileSync(src, path.join(NORM, path.basename(src)));
    }
    return;
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
    for (const src of paths) {
      const key = path.basename(src, '.png');
      const dest = path.join(NORM, `${key}.png`);
      // Re-render via canvas with margin — data URL avoids file:// quirks on Windows.
      const b64 = fs.readFileSync(src).toString('base64');
      await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script>
const img = new Image();
img.onload = () => {
  const c = document.getElementById('c');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,${SIZE},${SIZE});
  const m = ${MARGIN};
  const box = ${SIZE} * (1 - 2 * m);
  const scale = Math.min(box / img.width, box / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (${SIZE} - w) / 2;
  const y = (${SIZE} - h) / 2;
  ctx.drawImage(img, x, y, w, h);
  window.__done = true;
};
img.onerror = () => { window.__err = 'load failed'; window.__done = true; };
img.src = 'data:image/png;base64,${b64}';
</script></body></html>`);
      await page.waitForFunction(() => window.__done === true, null, { timeout: 15000 });
      const err = await page.evaluate(() => window.__err || null);
      if (err) throw new Error(`${key}: ${err}`);
      const png = await page.evaluate(async () => {
        const c = document.getElementById('c');
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        const ab = await blob.arrayBuffer();
        return Array.from(new Uint8Array(ab));
      });
      fs.writeFileSync(dest, Buffer.from(png));
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const dry = flag('dry-run');
  const force = flag('force');
  fs.mkdirSync(RAW, { recursive: true });
  fs.mkdirSync(NORM, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (!manifest.props || typeof manifest.props !== 'object') {
    console.error('manifest.json missing props map');
    process.exit(1);
  }

  const downloaded = [];
  for (const ic of ICONS) {
    process.stdout.write(`GET  ${ic.author}/${ic.slug} … `);
    try {
      const p = await download(ic);
      const size = pngSize(fs.readFileSync(p));
      console.log(size ? `${size.w}x${size.h}` : 'ok');
      downloaded.push({ ...ic, raw: p });
    } catch (e) {
      console.log(`FAIL ${e.message}`);
    }
  }

  if (!downloaded.length) {
    console.error('No icons downloaded.');
    process.exit(1);
  }

  if (!dry) {
    console.log(`\nNormalizing ${downloaded.length} icons → ${SIZE}px…`);
    await normalizeAll(downloaded.map((d) => d.raw));
  }

  let merged = 0;
  let skipped = 0;
  const mergedKeys = [];

  for (const ic of downloaded) {
    if (manifest.props[ic.key] && !force) {
      skipped++;
      continue;
    }
    const src = path.join(NORM, `${ic.key}.png`);
    const buf = dry ? fs.readFileSync(ic.raw) : fs.readFileSync(src);
    const size = pngSize(buf);
    if (!size) {
      skipped++;
      continue;
    }
    const tags = [...new Set(['cc-by', 'tool', 'gicon', 'dock', ...ic.tags])];
    const row = {
      file: `${ic.key}.png`,
      role: 'object',
      tags,
      relativeScale: ic.scale,
      anchor: 'center',
      alpha: true,
      aspect: Math.round((size.w / size.h) * 100) / 100,
      srcW: size.w,
      srcH: size.h,
      pack: 'gicon',
      styleFamily: 'game-icons',
    };
    if (dry) {
      console.log(`DRY  ${ic.key} ← ${ic.author}/${ic.slug}`);
    } else {
      fs.copyFileSync(src, path.join(OUT_DIR, `${ic.key}.png`));
      manifest.props[ic.key] = row;
      console.log(`OK   ${ic.key}`);
    }
    merged++;
    mergedKeys.push(ic.key);
  }

  if (!dry) {
    writeAttribution(downloaded);
    if (merged > 0) writeManifest(manifest);
  }

  console.log('\n=== game-icons-import ===');
  console.log(`merged=${merged} skippedExisting=${skipped}${dry ? ' (dry-run)' : ''}`);
  console.log(`attribution → ${path.relative(ROOT, ATTRIBUTION)}`);
  if (mergedKeys.length) {
    console.log(`Keys (${mergedKeys.length}): ${mergedKeys.join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
