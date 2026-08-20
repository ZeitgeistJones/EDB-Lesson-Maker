/**
 * familyFor: food/market win matte over bare "trip"; trip alone is not glossy.
 *   node scripts/test-family-fruit-trip.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

function fileFetch(url) {
  const u = String(url);
  let rel = null;
  if (u.includes('propPolicy')) rel = path.join(PUBLIC, 'lib/propPolicy.json');
  else if (u.includes('09_props/manifest')) rel = path.join(PUBLIC, 'assets/09_props/manifest.json');
  if (!rel || !fs.existsSync(rel)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(fs.readFileSync(rel, 'utf8')),
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

const sandbox = { window: {}, console, fetch: fileFetch, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'public/lib/propBank.js'), 'utf8'),
  sandbox,
  { filename: 'propBank.js' }
);
await sandbox.window.PropBank.ready();
const PB = sandbox.window.PropBank;
const HOUSE = PB.HOUSE_FAMILY;

assert(
  PB.familyFor({
    title: 'Fruit Market Bus Trip',
    vocabulary: [{ word: 'apple' }, { word: 'bus' }],
  }) === HOUSE,
  'Fruit Market Bus Trip → matte'
);
assert(
  PB.familyFor({ title: 'Pirate Treasure Adventure', vocabulary: [{ word: 'map' }] })
    === 'glossy-adventure',
  'Pirate Treasure Adventure → glossy'
);
assert(
  PB.familyFor({ title: 'School Field Trip', vocabulary: [{ word: 'bus' }] }) === HOUSE,
  'School Field Trip (bare trip) → matte, not glossy'
);

console.log('OK familyFor fruit/trip matte lock');
