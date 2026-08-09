/**
 * Beach hero must be sandcastle — never landmark-marina-bay-sands via sand→sands.
 *   node scripts/test-beach-hero.mjs
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
for (const rel of ['public/lib/propBank.js', 'public/lib/lessonTraits.js', 'public/lib/edbActivities.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

await sandbox.window.PropBank.ready();

const sand = sandbox.window.PropBank.resolve({
  word: 'sand',
  seed: 'Sunny Beach Day',
});
assert(!sand || sand.key !== 'landmark-marina-bay-sands', `sand must not resolve marina, got ${sand && sand.key}`);

const lesson = {
  title: 'Sunny Beach Day',
  vocabulary: [
    { word: 'beach' },
    { word: 'sand' },
    { word: 'shell' },
    { word: 'wave' },
    { word: 'sun' },
    { word: 'towel' },
  ],
  activity: { title: 'Beach Find' },
};
const hero = sandbox.window.EdbActivities.findHeroProp(lesson);
assert(hero, 'beach lesson needs a hero');
assert(
  hero.key === 'beach-sandcastle',
  `beach hero must be beach-sandcastle, got ${hero.key}`
);

const kit = sandbox.window.PropBank.assessKit(lesson);
assert(kit && kit.ready, `beach kit should be ready, got ${JSON.stringify(kit && { pack: kit.pack, ready: kit.ready, hero: kit.hero && kit.hero.key })}`);
assert(kit.hero && kit.hero.key === 'beach-sandcastle', `kit hero ${kit.hero && kit.hero.key}`);

console.log('OK beach hero', { hero: hero.key, kitPack: kit.pack, docks: kit.dockCount });
