/**
 * Fire up to 4 Pre-A1 harvest waves concurrently (--fire only).
 *   node scripts/manus/fire-prea1-batch.mjs 1,2,3,4
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const raw = process.argv[2] || '1,2,3,4';
const waves = raw.split(',').map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 8);
if (!waves.length) throw new Error('Need waves like 1,2,3,4');
if (waves.length > 4) throw new Error('Max 4 concurrent Manus fires');

function fireOne(n) {
  return new Promise((resolve, reject) => {
    const script = path.join(ROOT, 'scripts/manus/request-prea1-harvest.mjs');
    const child = spawn(process.execPath, [script, `--wave=${n}`, '--fire'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('close', (code) => {
      const last = out.trim().split('\n').pop() || '';
      let result = null;
      try {
        result = JSON.parse(last);
      } catch {
        result = { out, err };
      }
      if (code === 0 || code === 2) resolve({ wave: n, code, result, err: err.trim() || undefined });
      else reject(new Error(`fire wave ${n} exit ${code}: ${err || out}`));
    });
  });
}

const results = await Promise.all(waves.map(fireOne));
console.log(JSON.stringify({ phase: 'batch-fired', count: results.length, results }, null, 2));
