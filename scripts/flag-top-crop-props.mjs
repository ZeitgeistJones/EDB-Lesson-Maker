/**
 * Flag person/figure head crops + always write a Manus replace queue.
 *
 *   node scripts/flag-top-crop-props.mjs
 *   node scripts/flag-top-crop-props.mjs --dry-run
 *   node scripts/flag-top-crop-props.mjs --top=0.03
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const QUEUE_DIR = path.join(ROOT, 'tmp', 'person-crop-replace');
const QUEUE_JSON = path.join(QUEUE_DIR, 'queue.json');
const QUEUE_MD = path.join(QUEUE_DIR, 'QUEUE.md');
const DRY = process.argv.includes('--dry-run');
const topArg = process.argv.find((a) => a.startsWith('--top='));
const TOP = topArg ? Number(topArg.split('=')[1]) : 0.03;

function looksLikePersonKey(key, row) {
  const k = String(key || '').toLowerCase();
  if (!k) return false;
  if (row && String(row.role || '') === 'dressPart') return false;
  if (
    /(^|-)(hat|helmet|boot|glove|apron|mask|armband|jersey|cleat|toque)s?(-|$)/.test(k) &&
    !/astronaut|spacesuit|person|kid|boy|girl|family|patient/.test(k)
  ) {
    return false;
  }
  if (row && String(row.subject || '').toLowerCase() === 'person') return true;
  if (/^job-/.test(k) || /^family-/.test(k)) return true;
  return /astronaut|spacesuit|space-suit|dental-kid|face-blank|dentist-character|patient|policeman|firefighter|scientist|farmer|librarian|-kid-|-boy-|-girl-|teacher|chef|pilot|nurse|doctor|baker|\bclown\b|acrobat/.test(k);
}

/** Hats / dress parts matched by /^job-/ — remake as OBJECTS, not full figures. */
function isDressOrHatKey(key, row) {
  const k = String(key || '').toLowerCase();
  if (row && String(row.role || '') === 'dressPart') return true;
  return /hat|helmet|boot|glove|apron|mask|armband|jersey|pinnie|cleat/.test(k) && !/astronaut|spacesuit|person|kid|boy|girl/.test(k);
}

const py = `
import json, sys
from pathlib import Path
from PIL import Image
manifest, img_dir, top_thr = sys.argv[1], Path(sys.argv[2]), float(sys.argv[3])
raw = json.load(open(manifest, encoding='utf-8'))
props = raw.get('props') or {}
keys = json.load(sys.stdin)
out = []
for key in keys:
    row = props.get(key) or {}
    if not row.get('file') or row.get('alpha') is not True:
        continue
    if row.get('dockSafe') is False:
        continue
    fp = img_dir / row['file']
    if not fp.exists():
        continue
    try:
        im = Image.open(fp).convert('RGBA')
    except Exception:
        continue
    w, h = im.size
    px = im.load()
    y0 = None
    for y in range(h):
        for x in range(0, w, 2):
            if px[x, y][3] >= 200:
                y0 = y
                break
        if y0 is not None:
            break
    if y0 is None:
        continue
    top_m = y0 / h if h else 1.0
    if top_m >= top_thr:
        continue
    out.append({
        'key': key,
        'top': round(top_m, 4),
        'short': min(w, h),
        'file': row['file'],
    })
print(json.dumps(out))
`;

const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const personKeys = Object.keys(raw.props || {}).filter((k) => looksLikePersonKey(k, raw.props[k]));
const alreadyUnsafe = personKeys.filter((k) => raw.props[k] && raw.props[k].dockSafe === false);

const scan = spawnSync('python', ['-c', py, MANIFEST, IMG, String(TOP)], {
  encoding: 'utf8',
  input: JSON.stringify(personKeys),
  maxBuffer: 64 * 1024 * 1024,
});
if (scan.status !== 0) {
  console.error(scan.stderr || scan.stdout);
  process.exit(1);
}
const measured = JSON.parse(scan.stdout.trim() || '[]');
const flagged = [];
for (const row of measured) {
  const prop = raw.props[row.key];
  if (!prop || prop.dockSafe === false) continue;
  prop.dockSafe = false;
  flagged.push(row);
}
flagged.sort((a, b) => a.top - b.top);

const replaceKeys = [...new Set([...alreadyUnsafe, ...flagged.map((r) => r.key)])].sort();
const figures = [];
const objects = [];
for (const key of replaceKeys) {
  const row = raw.props[key] || {};
  const entry = {
    key,
    file: row.file || null,
    role: row.role || null,
    subject: row.subject || null,
    tags: Array.isArray(row.tags) ? row.tags.slice(0, 8) : [],
  };
  if (isDressOrHatKey(key, row) && !/astronaut/.test(key)) objects.push(entry);
  else figures.push(entry);
}

fs.mkdirSync(QUEUE_DIR, { recursive: true });
const queue = {
  written_at: new Date().toISOString(),
  topThreshold: TOP,
  personKeysConsidered: personKeys.length,
  alreadyDockUnsafe: alreadyUnsafe.length,
  newlyFlagged: flagged.length,
  dryRun: DRY,
  figures,
  objects,
  manus_hint: {
    figures: 'scripts/manus/request-shift120-person-crop-replace.mjs — black-field FULL figures, ≥3% top margin (C10); soft-3D OK; do not iterate for flatness',
    objects: 'scripts/manus/request-shift120-dock-unsafe-objects.mjs — hats/helmets/balls/tools as OBJECTS',
  },
};
fs.writeFileSync(QUEUE_JSON, JSON.stringify(queue, null, 2));
fs.writeFileSync(
  QUEUE_MD,
  [
    '# Person-crop replace queue',
    '',
    `Top threshold: ${TOP}`,
    `Person keys scanned: ${personKeys.length}`,
    `Already dockSafe:false: ${alreadyUnsafe.length}`,
    `Newly flagged this run: ${flagged.length}`,
    '',
    '## Figures (full body / person — Manus C10 remakes)',
    ...figures.map((e) => `- \`${e.key}\``),
    '',
    '## Objects / dress parts (not full figures)',
    ...objects.map((e) => `- \`${e.key}\``),
    '',
    'Fire: `node scripts/manus/request-shift120-person-crop-replace.mjs`',
    'Fire: `node scripts/manus/request-shift120-dock-unsafe-objects.mjs`',
    '',
  ].join('\n'),
);

console.log(JSON.stringify({
  topThreshold: TOP,
  personKeysConsidered: personKeys.length,
  alreadyDockUnsafe: alreadyUnsafe.length,
  newlyFlagged: flagged.length,
  dryRun: DRY,
  queue: QUEUE_JSON,
  figures: figures.map((e) => e.key),
  objects: objects.map((e) => e.key),
  sampleNew: flagged.slice(0, 20),
}, null, 2));

if (!DRY && flagged.length) {
  const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
  const pair = ([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`;
  const entryLine = (key, entry) =>
    `    ${JSON.stringify(key)}: { ${Object.entries(entry).map(pair).join(', ')} }`;
  const { props, ...head } = raw;
  const headLines = Object.entries(head).map((e) => `  ${pair(e)}`);
  const propLines = Object.entries(props).map(([key, entry]) => entryLine(key, entry));
  const out = `{\n${headLines.join(',\n')},\n  "props": {\n${propLines.join(',\n')}\n  }\n}\n`;
  fs.writeFileSync(MANIFEST, out);
  console.log('Wrote dockSafe:false on', flagged.length, 'person top-crops →', MANIFEST);
}
