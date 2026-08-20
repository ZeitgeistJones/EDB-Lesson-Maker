/**
 * Flag PropBank rows whose cutout is mostly a white plate (failed densify key).
 * Sets dockSafe:false so docks skip them. Uses Python/Pillow (available here).
 *
 *   node scripts/flag-white-plate-props.mjs
 *   node scripts/flag-white-plate-props.mjs --dry-run
 *   node scripts/flag-white-plate-props.mjs --threshold=0.15
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const DRY = process.argv.includes('--dry-run');
const thrArg = process.argv.find((a) => a.startsWith('--threshold='));
const THRESHOLD = thrArg ? Number(thrArg.split('=')[1]) : 0.15;

const py = `
import json, sys
from pathlib import Path
from PIL import Image
manifest, img_dir, thr = sys.argv[1], Path(sys.argv[2]), float(sys.argv[3])
raw = json.load(open(manifest, encoding='utf-8'))
props = raw.get('props') or {}
out = []
for key, row in props.items():
    if not row or not row.get('file') or row.get('alpha') is not True:
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
    opaque = white = 0
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r,g,b,a = px[x,y]
            if a < 200: continue
            opaque += 1
            if r+g+b >= 720: white += 1
    ratio = (white / opaque) if opaque else 0.0
    out.append({'key': key, 'ratio': round(ratio, 4), 'file': row['file']})
print(json.dumps(out))
`;

const scan = spawnSync('python', ['-c', py, MANIFEST, IMG, String(THRESHOLD)], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (scan.status !== 0) {
  console.error(scan.stderr || scan.stdout);
  process.exit(1);
}
const measured = JSON.parse(scan.stdout.trim());
const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const flagged = [];
for (const row of measured) {
  if (row.ratio < THRESHOLD) continue;
  const prop = raw.props[row.key];
  if (!prop) continue;
  if (prop.dockSafe === false) continue;
  prop.dockSafe = false;
  flagged.push(row);
}
flagged.sort((a, b) => b.ratio - a.ratio);
console.log(JSON.stringify({
  threshold: THRESHOLD,
  scanned: measured.length,
  newlyFlagged: flagged.length,
  dryRun: DRY,
  sample: flagged.slice(0, 25),
}, null, 2));
if (!DRY) {
  fs.writeFileSync(MANIFEST, JSON.stringify(raw) + '\n');
  console.log('Wrote dockSafe:false on', flagged.length, 'props →', MANIFEST);
}
