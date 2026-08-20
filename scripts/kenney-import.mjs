/**
 * Merge curated Kenney CC0 sprites into PropBank (09_props).
 * Expects tmp/asset-banks/kenney/curated/<topic>/ from kenney-curate.mjs.
 * Kenney PNGs already have real alpha — copy as-is (no black-field keying).
 *
 *   node scripts/kenney-curate.mjs
 *   node scripts/kenney-import.mjs
 *   node scripts/kenney-import.mjs --topics=aquarium-fish,space-planets --force
 *   node scripts/kenney-import.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURATED = path.join(ROOT, 'tmp', 'asset-banks', 'kenney', 'curated');
const OUT_DIR = path.join(ROOT, 'public', 'assets', '09_props', 'img');
const MANIFEST = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

function pngSize(buf) {
  if (!buf || buf[0] !== 0x89) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function slugStem(file) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Worth-keeping filters + PropBank metadata per curated topic. */
const TOPICS = {
  'zoo-animals': {
    pack: 'animals',
    tags: ['animals', 'zoo', 'farm', 'kenney'],
    relativeScale: 0.45,
    anchor: 'bottom',
    keep(stem) {
      return Boolean(stem);
    },
    key(stem) {
      return `kenney-${stem}`;
    },
  },
  'aquarium-fish': {
    pack: 'aquarium',
    tags: ['animals', 'aquarium', 'ocean', 'fish', 'kenney'],
    relativeScale: 0.22,
    anchor: 'center',
    keep(stem) {
      if (/outline|skeleton/.test(stem)) return false;
      if (/^fish-/.test(stem)) return true;
      if (/^background-seaweed-/.test(stem)) return true;
      return false;
    },
    key(stem) {
      if (stem.startsWith('background-seaweed-')) {
        return `kenney-seaweed-${stem.replace(/^background-seaweed-/, '')}`;
      }
      return `kenney-${stem}`;
    },
  },
  'space-planets': {
    pack: 'space',
    tags: ['space', 'planet', 'kenney'],
    relativeScale: 0.55,
    anchor: 'center',
    keep(stem) {
      return /^planet\d+/.test(stem);
    },
    key(stem) {
      const m = stem.match(/^planet(\d+)$/);
      return m ? `kenney-planet-${m[1]}` : `kenney-${stem}`;
    },
  },
  'space-simple': {
    pack: 'space',
    tags: ['space', 'kenney'],
    relativeScale: 0.28,
    anchor: 'center',
    keep(stem) {
      if (/^(effect|icon)-/.test(stem)) return false;
      if (/^ship-sides/.test(stem)) return false;
      if (/^star-(small|tiny)$/.test(stem)) return false;
      if (/meteor-.*small$/.test(stem)) return false;
      if (/^(ship|satellite|station|enemy|meteor|star)-/.test(stem)) return true;
      return false;
    },
    key(stem) {
      return `kenney-${stem}`;
    },
    scaleFor(stem) {
      if (/^star-/.test(stem)) return 0.12;
      if (/^meteor-/.test(stem)) return 0.2;
      if (/^enemy-/.test(stem)) return 0.25;
      if (/^station-/.test(stem)) return 0.4;
      if (/^satellite-/.test(stem)) return 0.22;
      return 0.3;
    },
  },
  'nature-foliage': {
    pack: 'nature',
    tags: ['nature', 'foliage', 'tree', 'plant', 'kenney'],
    relativeScale: 0.55,
    anchor: 'bottom',
    keep(stem) {
      return /^sprite-\d+$/.test(stem);
    },
    key(stem) {
      const m = stem.match(/^sprite-(\d+)$/);
      return m ? `kenney-foliage-${m[1]}` : `kenney-${stem}`;
    },
  },
  // Sports pack Blue characters are ~21px — never dock-ready. Curate keeps 0.
  'sports-gym': {
    pack: 'sports',
    tags: ['sports', 'kenney'],
    relativeScale: 0.2,
    anchor: 'bottom',
    keep() {
      return false;
    },
    key(stem) {
      return `kenney-${stem}`;
    },
  },
  'nature-foliage-pack': {
    pack: 'nature',
    tags: ['nature', 'foliage', 'tree', 'plant', 'kenney'],
    relativeScale: 0.55,
    anchor: 'bottom',
    keep(stem) {
      // Retina singles: foliagePack_NNN — skip leaves/ tilesheets via walk filters.
      return /^foliagepack-\d+$/.test(stem);
    },
    key(stem) {
      const m = stem.match(/^foliagepack-(\d+)$/);
      return m ? `kenney-tree-${m[1]}` : `kenney-${stem}`;
    },
  },
  'board-icons': {
    pack: 'games',
    tags: ['games', 'boardgame', 'kenney'],
    relativeScale: 0.22,
    anchor: 'center',
    keep(stem) {
      // Object nouns only — no UI arrows/hands/card-actions/people/chrome.
      const exact = new Set([
        'award',
        'bow',
        'campfire',
        'dice',
        'dice-1',
        'dice-2',
        'dice-3',
        'dice-4',
        'dice-5',
        'dice-6',
        'dollar',
        'fire',
        'hourglass',
        'notepad',
        'pouch',
        'puzzle',
        'shield',
        'spinner',
        'd6',
        'd20',
      ]);
      if (exact.has(stem)) return true;
      if (/^book-(closed|open)$/.test(stem)) return true;
      if (/^chess-(bishop|king|knight|pawn|queen|rook)$/.test(stem)) return true;
      if (/^crown-[ab]$/.test(stem)) return true;
      if (/^flag-(square|triangle)$/.test(stem)) return true;
      if (/^flask-(empty|full|half)$/.test(stem)) return true;
      if (/^lock-(closed|open)$/.test(stem)) return true;
      if (/^resource-(apple|iron|lumber|planks|wheat|wood)$/.test(stem)) return true;
      if (/^structure-(church|farm|gate|house|tower|wall|watchtower)$/.test(stem)) return true;
      if (/^suit-(clubs|diamonds|hearts|spades)$/.test(stem)) return true;
      return false;
    },
    key(stem) {
      return `kenney-bg-${stem}`;
    },
    scaleFor(stem) {
      if (/^structure-/.test(stem)) return 0.35;
      if (/^chess-/.test(stem)) return 0.2;
      if (/^resource-/.test(stem)) return 0.2;
      return 0.22;
    },
  },
  'games-domino': {
    pack: 'games',
    tags: ['games', 'domino', 'kenney'],
    relativeScale: 0.28,
    anchor: 'center',
    keep(stem) {
      return /^tile-\d+-\d+$/.test(stem);
    },
    key(stem) {
      const m = stem.match(/^tile-(\d+)-(\d+)$/);
      return m ? `kenney-domino-${m[1]}-${m[2]}` : `kenney-${stem}`;
    },
  },
  'town-blocks': {
    pack: 'places',
    tags: ['places', 'town', 'farm', 'kenney'],
    relativeScale: 0.4,
    anchor: 'bottom',
    keep(stem) {
      // slugStem: foliageBush_large → foliagebush-large, tileCastle → tilecastle
      if (/^character/.test(stem)) return false;
      if (/^(detail|gravel)/.test(stem)) return false;
      if (/^tile(dirt|goo|grass|lava|sand|snow|stone|water|wood)/.test(stem)) return false;
      if (/^(box|cart|door|fence|foliage|ladder|market)/.test(stem)) return true;
      if (/^tile(bridge|building|castle)/.test(stem)) return true;
      return false;
    },
    key(stem) {
      return `kenney-block-${stem}`;
    },
    scaleFor(stem) {
      if (/^foliage/.test(stem)) return 0.5;
      if (/^tilecastle/.test(stem)) return 0.45;
      if (/^tilebuilding/.test(stem)) return 0.4;
      if (/^market/.test(stem)) return 0.42;
      if (/^box/.test(stem)) return 0.28;
      return 0.38;
    },
  },
  'bg-elements': {
    pack: 'places',
    tags: ['places', 'nature', 'weather', 'kenney'],
    relativeScale: 0.45,
    anchor: 'bottom',
    keep(stem) {
      if (/^(castle|cloud|tree|temple|piramid|pyramid)/.test(stem)) return true;
      if (/^house-grey-side$/.test(stem)) return true;
      return false;
    },
    key(stem) {
      const fixed = stem === 'piramid' ? 'pyramid' : stem;
      return `kenney-bgel-${fixed}`;
    },
    scaleFor(stem) {
      if (/^cloud/.test(stem)) return 0.35;
      if (/^tree/.test(stem)) return 0.5;
      if (/^castle/.test(stem)) return 0.55;
      return 0.45;
    },
  },
  'games-cards': {
    pack: 'games',
    tags: ['games', 'cards', 'kenney'],
    relativeScale: 0.32,
    anchor: 'center',
    keep(stem) {
      // cardClubsJ → cardclubsj; cardBack_blue1 → cardback-blue1
      if (/joker/.test(stem)) return false;
      if (/(clubs|diamonds|hearts|spades)(j|q|k)$/.test(stem)) return false;
      if (/^cardback/.test(stem)) return true;
      if (/(clubs|diamonds|hearts|spades)(\d+|a)$/.test(stem)) return true;
      return false;
    },
    key(stem) {
      return `kenney-card-${stem.replace(/^card-?/, '')}`;
    },
  },
  'bg-elements-remaster': {
    pack: 'places',
    tags: ['places', 'nature', 'weather', 'kenney'],
    relativeScale: 0.45,
    anchor: 'bottom',
    keep(stem) {
      // Retina nouns only — no people; size gate already applied in curate.
      if (/^(bush|cactus|castle|cloud|fence|house|moon|pyramid|sun|tower|tree)/.test(stem)) {
        return true;
      }
      return false;
    },
    key(stem) {
      return `kenney-bgr-${stem}`;
    },
    scaleFor(stem) {
      if (/^cloud/.test(stem)) return 0.35;
      if (/^tree/.test(stem)) return 0.5;
      if (/^house/.test(stem)) return 0.5;
      if (/^tower/.test(stem)) return 0.48;
      if (/^bush|^cactus/.test(stem)) return 0.28;
      return 0.45;
    },
  },
  'space-ufo': {
    pack: 'space',
    tags: ['space', 'ufo', 'kenney'],
    relativeScale: 0.35,
    anchor: 'center',
    keep(stem) {
      // Unmanned ships are <120 short-side. Manned = faces; laser bursts = chrome.
      if (/manned|laser|burst|damage|alien|character|face/.test(stem)) return false;
      if (/^ship/.test(stem)) return true;
      return false;
    },
    key(stem) {
      return `kenney-ufo-${stem}`;
    },
  },
  'letter-tiles': {
    pack: 'phonics',
    tags: ['phonics', 'letters', 'alphabet', 'kenney'],
    relativeScale: 0.22,
    anchor: 'center',
    keep(stem) {
      // Blue A–Z tiles only — skip blank letter.png tile.
      return /^letter-[a-z]$/.test(stem);
    },
    key(stem) {
      const m = stem.match(/^letter-([a-z])$/);
      return m ? `kenney-letter-${m[1]}` : `kenney-${stem}`;
    },
  },
};

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

function main() {
  const dry = flag('dry-run');
  const force = flag('force');
  const only = (arg('topics', '') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const topics = only.length ? only : Object.keys(TOPICS);

  if (!fs.existsSync(CURATED)) {
    console.error(`Missing curated bank at ${path.relative(ROOT, CURATED)} — run kenney-curate first.`);
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
  const byTopic = {};
  const mergedKeys = [];

  for (const topic of topics) {
    const rule = TOPICS[topic];
    if (!rule) {
      console.log(`SKIP  ${topic} — unknown topic`);
      continue;
    }
    const dir = path.join(CURATED, topic);
    if (!fs.existsSync(dir)) {
      console.log(`SKIP  ${topic} — missing curated folder`);
      continue;
    }
    byTopic[topic] = { merged: 0, skipped: 0, culled: 0 };
    const pngs = fs
      .readdirSync(dir)
      .filter((f) => /\.png$/i.test(f))
      .sort();

    for (const file of pngs) {
      const stem = slugStem(file);
      if (!rule.keep(stem)) {
        byTopic[topic].culled++;
        continue;
      }
      const key = rule.key(stem);
      if (manifest.props[key] && !force) {
        skipped++;
        byTopic[topic].skipped++;
        continue;
      }
      const src = path.join(dir, file);
      const buf = fs.readFileSync(src);
      const size = pngSize(buf);
      if (!size) {
        skipped++;
        byTopic[topic].skipped++;
        continue;
      }
      const outFile = `${key}.png`;
      const scale =
        typeof rule.scaleFor === 'function' ? rule.scaleFor(stem) : rule.relativeScale;
      const tags = [...new Set([...rule.tags, ...stem.split('-').filter((t) => t.length > 1), 'dock'])];
      const row = {
        file: outFile,
        role: 'object',
        tags,
        relativeScale: scale,
        anchor: rule.anchor,
        alpha: true,
        aspect: Math.round((size.w / size.h) * 100) / 100,
        srcW: size.w,
        srcH: size.h,
        pack: rule.pack,
        styleFamily: 'kenney-flat',
      };

      if (dry) {
        console.log(`DRY  ${key} ← ${topic}/${file}  ${size.w}x${size.h}`);
      } else {
        fs.copyFileSync(src, path.join(OUT_DIR, outFile));
        manifest.props[key] = row;
        console.log(`OK   ${key}  pack=${rule.pack}  ${size.w}x${size.h}`);
      }
      merged++;
      byTopic[topic].merged++;
      mergedKeys.push(key);
    }
  }

  if (!dry && merged > 0) writeManifest(manifest);

  console.log('\n=== kenney-import ===');
  for (const [topic, s] of Object.entries(byTopic)) {
    console.log(
      `${topic}: merged=${s.merged} skipped=${s.skipped} culled=${s.culled}`
    );
  }
  console.log(`Total merged=${merged} skippedExisting=${skipped}${dry ? ' (dry-run)' : ''}`);
  if (mergedKeys.length) {
    const preview = mergedKeys.slice(0, 40).join(', ');
    console.log(`Keys (${mergedKeys.length}): ${preview}${mergedKeys.length > 40 ? ', …' : ''}`);
  }
}

main();
