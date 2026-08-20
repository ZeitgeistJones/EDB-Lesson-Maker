/**
 * Fire batch 1 EDB setting drops concurrently (4 Manus tasks):
 * classroom, bedroom, kitchen, bathroom.
 *
 *   node scripts/manus/fire-edb-settings-batch1.mjs
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { BATCH_SETTINGS } from './edb-settings-stockpile-keys.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const settings = BATCH_SETTINGS[1];

function fireOne(setting) {
  return new Promise((resolve, reject) => {
    const script = path.join(ROOT, 'scripts/manus/request-edb-settings-harvest.mjs');
    const child = spawn(process.execPath, [script, `--setting=${setting}`, '--fire'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code === 0 || code === 2) {
        try {
          resolve({ setting, code, result: JSON.parse(out.trim().split('\n').pop()) });
        } catch {
          resolve({ setting, code, out, err });
        }
      } else {
        reject(new Error(`fire ${setting} exit ${code}: ${err || out}`));
      }
    });
  });
}

const results = await Promise.all(settings.map(fireOne));
console.log(JSON.stringify({ phase: 'batch1-fired', count: results.length, results }, null, 2));
