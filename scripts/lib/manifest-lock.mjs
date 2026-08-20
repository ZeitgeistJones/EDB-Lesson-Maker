/**
 * Single-writer lock + atomic replace for the shared prop bank manifest
 * (public/assets/09_props/manifest.json) — or any JSON bank file.
 *
 * Root cause this fixes: importers did read → mutate in memory → writeFileSync.
 * Two processes that read the same base each wrote their own full copy, and the
 * last writer erased the other's keys (wave9: 32 keys "missing-after-merge").
 * The old retry loops only papered over Windows EBUSY-style errors — they never
 * made the read-modify-write cycle exclusive.
 *
 * The rule now: every manifest mutation goes through mutateManifest(), which
 *   1. takes a cross-process lock (<target>.lock, atomic O_CREAT|O_EXCL),
 *   2. reads the CURRENT file inside the lock,
 *   3. applies the caller's mutator to that fresh copy,
 *   4. writes tmp + rename (readers never see a partial file),
 *   5. releases the lock in finally.
 *
 * Crash safety: a lock left behind by a dead process is stolen once its pid is
 * no longer alive (or the lock is older than staleMs). Stealing goes through a
 * rename-to-tombstone so two waiters cannot both "clean up" and then both hold.
 */
import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const lockPathFor = (target) => `${target}.lock`;

function pidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM = alive but not ours; ESRCH (or anything else) = gone.
    return Boolean(err && err.code === 'EPERM');
  }
}

/**
 * Block until we own <target>.lock. Poll-based; steals only provably dead or
 * ancient locks. Throws after timeoutMs so a wedged import fails loudly
 * instead of hanging a whole wave.
 */
export async function acquireFileLock(target, opts = {}) {
  const lockPath = lockPathFor(target);
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const staleMs = opts.staleMs ?? 10 * 60 * 1000;
  const pollMs = opts.pollMs ?? 200;
  const started = Date.now();

  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(
        fd,
        JSON.stringify({
          pid: process.pid,
          script: path.basename(process.argv[1] || 'node'),
          at: new Date().toISOString(),
        })
      );
      fs.closeSync(fd);
      return lockPath;
    } catch (err) {
      if (!err || err.code !== 'EEXIST') throw err;
    }

    // Somebody holds it. Read who, decide dead-or-alive.
    let holder = null;
    try {
      holder = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch {
      // Mid-write or vanished — loop and re-attempt.
    }
    let ageMs = 0;
    try {
      ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
    } catch {
      continue; // vanished between attempts — retry create immediately
    }

    const holderPid = holder ? Number(holder.pid) : NaN;
    const holderDead = holder ? !pidAlive(holderPid) : false;
    if (holderDead || ageMs > staleMs) {
      // Steal via rename-to-tombstone: rename is atomic, so exactly one waiter
      // wins the steal even if several judged the lock stale at once. Re-read
      // right before renaming so we never kill a fresh lock that replaced the
      // dead one in the meantime.
      try {
        const current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        const sameHolder = holder && Number(current.pid) === holderPid;
        if (sameHolder || ageMs > staleMs) {
          const tomb = `${lockPath}.stale-${process.pid}-${Date.now()}`;
          fs.renameSync(lockPath, tomb);
          fs.unlinkSync(tomb);
        }
      } catch {
        // Lost the steal race or the holder released — either way, retry.
      }
      continue;
    }

    if (Date.now() - started > timeoutMs) {
      throw new Error(
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${path.basename(lockPath)} ` +
          `(held by pid ${holder ? holder.pid : '?'} / ${holder ? holder.script : '?'} since ${holder ? holder.at : '?'})`
      );
    }
    await sleep(pollMs);
  }
}

export function releaseFileLock(target) {
  try {
    fs.unlinkSync(lockPathFor(target));
  } catch {
    // Already gone (stolen as stale after a very long hold) — nothing to do.
  }
}

export async function withFileLock(target, fn, opts) {
  await acquireFileLock(target, opts);
  try {
    return await fn();
  } finally {
    releaseFileLock(target);
  }
}

/**
 * Write tmp file in the same directory, then rename over the target. Rename is
 * an atomic replace on win32 (MOVEFILE_REPLACE_EXISTING) and POSIX, so readers
 * either see the old file or the new one — never a truncated half-write.
 * Retries the rename because a watcher/scanner briefly holding the target open
 * on Windows surfaces as EPERM/EBUSY/UNKNOWN.
 */
export function writeFileAtomic(target, text) {
  const tmp = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`
  );
  fs.writeFileSync(tmp, text);
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(tmp, target);
      return;
    } catch (err) {
      const code = err && err.code;
      const transient = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES' || code === 'UNKNOWN';
      if (!transient || attempt >= 8) {
        try {
          fs.unlinkSync(tmp);
        } catch {}
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200 * attempt);
    }
  }
}

/**
 * House manifest format: one prop per line, never pretty-printed (a plain
 * indented stringify spreads every prop over eight lines and turns a one-field
 * change into a whole-file rewrite in review). Single source of truth — the
 * copies that used to live in import-prop.mjs / merge-staged-props.mjs now
 * import from here, and the finish-wave scripts stop writing indented JSON.
 */
export function serializeManifest(manifest) {
  const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
  const pair = ([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`;
  const entryLine = (key, entry) =>
    `    ${JSON.stringify(key)}: { ${Object.entries(entry).map(pair).join(', ')} }`;
  const { props, ...head } = manifest;
  const headLines = Object.entries(head).map((e) => `  ${pair(e)}`);
  const propLines = Object.entries(props).map(([key, entry]) => entryLine(key, entry));
  return `{\n${headLines.join(',\n')},\n  "props": {\n${propLines.join(',\n')}\n  }\n}\n`;
}

/**
 * The one true way to change a manifest: lock → fresh read → mutate → sorted
 * atomic write → unlock. The mutator receives the CURRENT on-disk manifest
 * (not whatever stale copy the caller loaded at startup) and may return a
 * value, which is passed through. Mutator may be async.
 */
export async function mutateManifest(manifestPath, mutator, opts) {
  return withFileLock(
    manifestPath,
    async () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!manifest.props || typeof manifest.props !== 'object') {
        throw new Error(`${manifestPath} has no props map — refusing to write`);
      }
      const result = await mutator(manifest);
      const ordered = {};
      for (const k of Object.keys(manifest.props).sort()) ordered[k] = manifest.props[k];
      manifest.props = ordered;
      writeFileAtomic(manifestPath, serializeManifest(manifest));
      return result;
    },
    opts
  );
}
