/**
 * Stamp srcW/srcH on every 09_props manifest row from the keyed PNG.
 * Dock pickers refuse pieces whose min side is under PropBank.MIN_DOCK_SRC.
 *
 *   node scripts/backfill-prop-src-size.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');
const IMG = path.join(ROOT, 'public', 'assets', '09_props', 'img');

function pngSize(buf) {
  if (!buf || buf.length < 24 || buf[0] !== 0x89) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let updated = 0;
let missing = 0;
const soft = [];

for (const [key, row] of Object.entries(manifest.props || {})) {
  const file = path.join(IMG, row.file || `${key}.png`);
  if (!fs.existsSync(file)) {
    missing++;
    continue;
  }
  const size = pngSize(fs.readFileSync(file));
  if (!size) continue;
  row.srcW = size.w;
  row.srcH = size.h;
  updated++;
  if (Math.min(size.w, size.h) < 120) soft.push({ key, min: Math.min(size.w, size.h) });
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`srcW/srcH stamped on ${updated} props (${missing} missing files).`);
console.log(`soft for dock (<120 min): ${soft.length}`);
soft
  .sort((a, b) => a.min - b.min)
  .slice(0, 25)
  .forEach((s) => console.log(`  ${String(s.min).padStart(3)}  ${s.key}`));
if (soft.length > 25) console.log(`  … +${soft.length - 25} more`);
