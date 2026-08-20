/**
 * Watch .env for MANUS_API_KEY update, then fire replace tasks.
 *   node scripts/manus/watch-key-and-fire-replace.mjs
 *   node scripts/manus/watch-key-and-fire-replace.mjs --minutes=90
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENV = path.join(ROOT, '.env');
const minutesArg = process.argv.find((a) => a.startsWith('--minutes='));
const MINUTES = minutesArg ? Number(minutesArg.split('=')[1]) : 90;
const POLL_MS = 8000;

function keyMeta() {
  dotenv.config({ path: ENV, override: true });
  const k = (process.env.MANUS_API_KEY || '').trim();
  return { len: k.length, prefix: k ? k.slice(0, 8) + '…' : null, mtime: fs.statSync(ENV).mtimeMs };
}

function clearRun(dir) {
  const p = path.join(ROOT, dir, 'run.json');
  try {
    fs.unlinkSync(p);
  } catch {
    /* ok */
  }
}

function fire(script) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script)], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env },
  });
  return {
    script,
    status: r.status,
    out: String(r.stdout || '').slice(0, 800),
    err: String(r.stderr || '').slice(0, 800),
  };
}

const start = keyMeta();
console.log(JSON.stringify({ phase: 'watch', minutes: MINUTES, start }, null, 2));
const deadline = Date.now() + MINUTES * 60 * 1000;
let lastLog = 0;

while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, POLL_MS));
  const now = keyMeta();
  if (now.mtime !== start.mtime || now.prefix !== start.prefix) {
    console.log(JSON.stringify({ phase: 'env_changed', now }, null, 2));
    clearRun('tmp/manus-shift120-person-crop-replace');
    clearRun('tmp/manus-shift120-dock-unsafe-objects');
    // Reload env into this process for children
    dotenv.config({ path: ENV, override: true });
    const results = [
      fire('scripts/manus/request-shift120-person-crop-replace.mjs'),
      fire('scripts/manus/request-shift120-dock-unsafe-objects.mjs'),
    ];
    console.log(JSON.stringify({ phase: 'fired', results }, null, 2));
    const ok = results.every((r) => r.status === 0);
    process.exit(ok ? 0 : 3);
  }
  if (Date.now() - lastLog > 60000) {
    lastLog = Date.now();
    console.log(JSON.stringify({ phase: 'waiting', remaining_min: Math.round((deadline - Date.now()) / 60000) }));
  }
}
console.log(JSON.stringify({ phase: 'timeout_no_env_change' }));
process.exit(2);
