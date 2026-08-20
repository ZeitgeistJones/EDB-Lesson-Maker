/**
 * Concurrency test for the manifest single-writer guarantee
 * (scripts/lib/manifest-lock.mjs). Reproduces the wave9 failure shape on a
 * sandbox manifest and proves it cannot happen any more:
 *
 *   1. single-process merge still works (sanity)
 *   2. four REAL merge-staged-props.mjs processes + one tag-patcher run at
 *      once → every key survives, no seed key lost, no duplicate entries,
 *      valid JSON, no lock/tmp leftovers
 *   3. a lock left by a dead (crashed) process is stolen and cleaned up
 *   4. a lock held by a LIVE process is respected (writer waits, no steal)
 *
 * Uses PROPS_MANIFEST / PROPS_IMG_DIR env overrides so the real merge script
 * runs against tmp/manifest-lock-test/ and never touches the live bank.
 *
 *   npm run test:manifest-lock
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serializeManifest, lockPathFor } from './lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAND = path.join(ROOT, 'tmp', 'manifest-lock-test');
const MANIFEST = path.join(SAND, 'manifest.json');
const IMG = path.join(SAND, 'img');
const LIB_URL = pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'manifest-lock.mjs')).href;

// 1x1 transparent PNG — a real file so merge-staged-props' existsSync passes.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}

const SEED_COUNT = 30;
function reset() {
  fs.rmSync(SAND, { recursive: true, force: true });
  fs.mkdirSync(IMG, { recursive: true });
  const props = {};
  for (let i = 0; i < SEED_COUNT; i++) {
    const key = `seed-${String(i).padStart(2, '0')}`;
    props[key] = { file: `${key}.png`, role: 'object', tags: ['seed'], relativeScale: 0.2, anchor: 'center', alpha: true };
  }
  fs.writeFileSync(MANIFEST, serializeManifest({ boardPieces: true, props }));
}

function rowsFile(prefix, n) {
  const png = path.join(SAND, `${prefix}.png`);
  fs.writeFileSync(png, PNG);
  const entries = [];
  for (let i = 0; i < n; i++) {
    const key = `${prefix}-${String(i).padStart(2, '0')}`;
    entries.push({
      key,
      stagedPath: path.relative(ROOT, png).replaceAll('\\', '/'),
      dedup: 'new',
      row: {
        file: `${key}.png`, role: 'object', tags: ['conc'], relativeScale: 0.2,
        anchor: 'center', alpha: true, aspect: 1, srcW: 1, srcH: 1, pack: 'conc',
      },
    });
  }
  const p = path.join(SAND, `${prefix}-rows.json`);
  fs.writeFileSync(p, JSON.stringify(entries, null, 2));
  return p;
}

const ENV = {
  ...process.env,
  PROPS_MANIFEST: path.relative(ROOT, MANIFEST),
  PROPS_IMG_DIR: path.relative(ROOT, IMG),
};

function spawnP(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => resolve({ code, out, err, pid: child.pid }));
  });
}

const mergeArgs = (rowsPath) => ['scripts/merge-staged-props.mjs', rowsPath];

function keyCountInRaw(raw, key) {
  return raw.split(`"${key}": {`).length - 1;
}

function noLeftovers() {
  const files = fs.readdirSync(SAND);
  return !files.some((f) => f.endsWith('.lock') || f.endsWith('.tmp'));
}

// ---------------------------------------------------------------- test 1
console.log('\n--- test 1: single-process merge sanity ---');
reset();
{
  const rows = rowsFile('solo', 5);
  const r = await spawnP(mergeArgs(rows));
  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  check(r.code === 0, `merge exits 0 (got ${r.code}) ${r.err.slice(0, 200)}`);
  check(/Merged 5 prop\(s\)/.test(r.out), 'reports Merged 5');
  check(Object.keys(man.props).length === SEED_COUNT + 5, 'seed + 5 keys present');
  check(fs.existsSync(path.join(IMG, 'solo-00.png')), 'PNG copied to img dir');
  check(noLeftovers(), 'no lock/tmp leftovers');
}

// ---------------------------------------------------------------- test 2
console.log('\n--- test 2: 4 concurrent merges + 1 concurrent tag patch ---');
reset();
{
  const prefixes = ['conc-a', 'conc-b', 'conc-c', 'conc-d'];
  const rows = prefixes.map((p) => rowsFile(p, 25));

  // Standalone patcher process = the finish-wave tag-patch step (the write
  // that erased wave9's 32 keys when it ran unlocked next to merges).
  const patcherPath = path.join(SAND, 'patcher.mjs');
  fs.writeFileSync(
    patcherPath,
    `import { mutateManifest } from ${JSON.stringify(LIB_URL)};
await mutateManifest(${JSON.stringify(MANIFEST)}, (m) => {
  for (const k of Object.keys(m.props)) {
    if (k.startsWith('seed-')) m.props[k].tags = ['seed', 'patched'];
  }
});
console.log('patched');
`
  );

  const results = await Promise.all([
    ...rows.map((p) => spawnP(mergeArgs(p))),
    spawnP([patcherPath]),
  ]);
  for (const [i, r] of results.entries()) {
    check(r.code === 0, `process ${i} exits 0 (got ${r.code}) ${r.err.slice(0, 200)}`);
  }

  const raw = fs.readFileSync(MANIFEST, 'utf8');
  let man = null;
  try {
    man = JSON.parse(raw);
  } catch {}
  check(Boolean(man), 'manifest is valid JSON');

  const expected = SEED_COUNT + prefixes.length * 25;
  check(
    Object.keys(man.props).length === expected,
    `all ${expected} keys survive (got ${Object.keys(man.props).length})`
  );
  const lostSeeds = Object.keys(man.props).filter((k) => k.startsWith('seed-')).length;
  check(lostSeeds === SEED_COUNT, `no pre-existing key disappeared (${lostSeeds}/${SEED_COUNT})`);
  const unpatched = Object.entries(man.props).filter(
    ([k, v]) => k.startsWith('seed-') && !(v.tags || []).includes('patched')
  );
  check(unpatched.length === 0, 'concurrent tag patch landed on every seed key');

  let dupes = 0;
  for (const key of Object.keys(man.props)) {
    if (keyCountInRaw(raw, key) !== 1) dupes++;
  }
  check(dupes === 0, `no duplicate/corrupt entries in raw text (${dupes} dupes)`);
  check(noLeftovers(), 'lock released, no tmp leftovers');
}

// ---------------------------------------------------------------- test 3
console.log('\n--- test 3: stale lock from a dead process is stolen ---');
reset();
{
  // Guaranteed-dead pid: spawn a process that exits immediately.
  const dead = await spawnP(['-e', 'process.exit(0)']);
  fs.writeFileSync(
    lockPathFor(MANIFEST),
    JSON.stringify({ pid: dead.pid, script: 'crashed-import.mjs', at: new Date().toISOString() })
  );

  const rows = rowsFile('stale', 5);
  const started = Date.now();
  const r = await spawnP(mergeArgs(rows));
  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  check(r.code === 0, `merge exits 0 despite orphan lock (got ${r.code}) ${r.err.slice(0, 200)}`);
  check(Object.keys(man.props).length === SEED_COUNT + 5, 'keys merged after steal');
  check(Date.now() - started < 60_000, 'steal was prompt (no stale-timeout wait)');
  check(noLeftovers(), 'orphan lock cleaned up');
}

// ---------------------------------------------------------------- test 4
console.log('\n--- test 4: live lock is respected (wait, not steal) ---');
reset();
{
  const HOLD_MS = 2500;
  const holderPath = path.join(SAND, 'holder.mjs');
  fs.writeFileSync(
    holderPath,
    `import { acquireFileLock, releaseFileLock } from ${JSON.stringify(LIB_URL)};
await acquireFileLock(${JSON.stringify(MANIFEST)});
console.log('HOLDING');
await new Promise((r) => setTimeout(r, ${HOLD_MS}));
releaseFileLock(${JSON.stringify(MANIFEST)});
console.log('RELEASED');
`
  );

  const holder = spawnP([holderPath]);
  // Give the holder time to actually take the lock before the merge starts.
  await new Promise((r) => setTimeout(r, 600));
  const rows = rowsFile('waited', 5);
  const started = Date.now();
  const r = await spawnP(mergeArgs(rows));
  const elapsed = Date.now() - started;
  const h = await holder;

  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  check(h.out.includes('HOLDING') && h.out.includes('RELEASED'), 'holder took and released the lock');
  check(r.code === 0, `merge exits 0 after waiting (got ${r.code}) ${r.err.slice(0, 200)}`);
  check(elapsed >= 1000, `merge waited for the live lock (~${elapsed}ms) instead of stealing`);
  check(Object.keys(man.props).length === SEED_COUNT + 5, 'keys merged after wait');
  check(noLeftovers(), 'no lock/tmp leftovers');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll manifest-lock tests passed.');
process.exitCode = failures ? 1 : 0;
