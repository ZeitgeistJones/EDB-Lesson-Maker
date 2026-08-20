/**
 * Fire EDB setting-drop batch N concurrently (see edb-settings-stockpile-keys.mjs BATCH_SETTINGS).
 *
 *   node scripts/manus/fire-edb-settings-batch.mjs --batch=2
 *   node scripts/manus/fire-edb-settings-batch.mjs --batch=5
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { BATCH_SETTINGS } from './edb-settings-stockpile-keys.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
}

const batchNum = Number(arg('batch'));
if (!batchNum || !BATCH_SETTINGS[batchNum]) {
  console.error(`Need --batch=1..${Object.keys(BATCH_SETTINGS).length}`);
  process.exit(1);
}

const settings = BATCH_SETTINGS[batchNum];

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
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
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
console.log(JSON.stringify({ phase: `batch${batchNum}-fired`, count: results.length, results }, null, 2));
