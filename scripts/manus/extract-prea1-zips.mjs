/**
 * One-shot: sniff + extract mislabeled Manus zip attachments in Pre-A1 sheets dirs.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stock = path.join(ROOT, 'tmp/manus-prea1-stockpile');

function sniff(buf) {
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return 'unknown';
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const tmpZip = `${zipPath}.real.zip`;
  fs.copyFileSync(zipPath, tmpZip);
  execFileSync('tar', ['-xf', tmpZip, '-C', outDir], { stdio: 'inherit' });
}

for (const wave of fs.readdirSync(stock)) {
  const sheetDir = path.join(stock, wave, 'sheets');
  if (!fs.existsSync(sheetDir)) continue;
  for (const f of fs.readdirSync(sheetDir)) {
    const p = path.join(sheetDir, f);
    if (!fs.statSync(p).isFile()) continue;
    const buf = fs.readFileSync(p).subarray(0, 16);
    const kind = sniff(buf);
    console.log(wave, f, kind, fs.statSync(p).size);
    if (kind === 'zip') {
      const out = path.join(stock, wave, 'zip-extract');
      extractZip(p, out);
      console.log(' extracted', wave, fs.readdirSync(out, { recursive: true }));
    }
  }
}
