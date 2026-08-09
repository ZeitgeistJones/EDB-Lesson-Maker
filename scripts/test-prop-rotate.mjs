/**
 * F2: word resolve rotates only within variantBand (same base object).
 * Equal-score distinct objects (ball / yarn-ball / cotton-ball) must not swap.
 *
 *   node scripts/test-prop-rotate.mjs
 *   npm run test:prop-rotate
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8')
);
const policy = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/lib/propPolicy.json'), 'utf8')
);

const sandbox = {
  window: {
    // propBank.rotatePick reads this at call time; stub a real rotator so
    // seed variety can exercise variantBand (byWord passes index 0).
    SceneBackgrounds: {
      rotate(seed, n) {
        if (!n) return 0;
        let h = 2166136261;
        const s = String(seed || '');
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return (h >>> 0) % n;
      },
    },
  },
  console,
  fetch: (url) => {
    const u = String(url);
    if (u.includes('propPolicy')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(policy) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) });
  },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/lib/propBank.js'), 'utf8'), sandbox);

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

function baseKey(prop) {
  if (!prop) return null;
  if (prop.variantOf) return prop.variantOf;
  const m = /^(.+)-v\d+$/.exec(prop.key);
  return m ? m[1] : prop.key;
}

await sandbox.window.PropBank.ready();

// Unthemed "ball" hits many equal-score *-ball props via identity-score.
// Across seeds/indices, every pick must share one base — never yarn/cotton swap.
const bases = new Set();
const keys = new Set();
for (let i = 0; i < 40; i++) {
  const p = sandbox.window.PropBank.resolve({
    word: 'ball',
    seed: 'Quiet Lesson ' + i,
    index: i,
  });
  assert(p, `ball resolve null at i=${i}`);
  bases.add(baseKey(p));
  keys.add(p.key);
}
assert(
  bases.size === 1,
  `F2 ball must stay on one base, got ${[...bases].join(', ')}`
);

// Variant rotation still works: cleaning-sponge ↔ cleaning-sponge-v2 (same base).
const spongeKeys = new Set();
for (let i = 0; i < 24; i++) {
  const p = sandbox.window.PropBank.resolve({
    word: 'sponge',
    seed: 'Chores ' + i,
    index: 0,
  });
  assert(p, `sponge resolve null at i=${i}`);
  assert(baseKey(p) === 'cleaning-sponge', `sponge base ${baseKey(p)}`);
  spongeKeys.add(p.key);
}
assert(
  spongeKeys.has('cleaning-sponge') && spongeKeys.has('cleaning-sponge-v2'),
  `variant rotate expected both sponges, got ${[...spongeKeys].join(', ')}`
);

console.log('OK F2 rotate within variantBand', {
  ballBase: [...bases][0],
  ballKeys: [...keys],
  spongeKeys: [...spongeKeys],
});
