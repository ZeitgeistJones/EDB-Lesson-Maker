#!/usr/bin/env node
/**
 * Scaffold a manus-passoff.json for a verify dir (does not overwrite unless --force).
 *
 *   npm run manus:passoff -- tmp/board-bg-verify/classical-compose --title="…"
 *   npm run manus:passoff -- tmp/board-bg-verify/foo --from=scripts/manus/passoffs/classical-compose.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const dirArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!dirArg) {
  console.error('Usage: npm run manus:passoff -- <verify-dir> [--title=…] [--from=…] [--force]');
  process.exit(1);
}

const dir = path.isAbsolute(dirArg) ? dirArg : path.join(ROOT, dirArg);
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'manus-passoff.json');
const force = process.argv.includes('--force');
if (fs.existsSync(out) && !force) {
  console.log(JSON.stringify({ ok: true, skipped: true, path: path.relative(ROOT, out).replace(/\\/g, '/') }, null, 2));
  process.exit(0);
}

const fromArg = arg('from', 'scripts/manus/passoff.example.json');
const fromPath = path.isAbsolute(fromArg) ? fromArg : path.join(ROOT, fromArg);
const base = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
base.title = arg('title', base.title || path.basename(dir));
base.level = arg('level', base.level || 'B1');
base.duration = arg('duration', base.duration || '60');
fs.writeFileSync(out, JSON.stringify(base, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  path: path.relative(ROOT, out).replace(/\\/g, '/'),
  from: path.relative(ROOT, fromPath).replace(/\\/g, '/'),
  title: base.title,
}, null, 2));
