/**
 * Smoke: pack-exact-match stays strict + accent-fold honest.
 *   node scripts/smoke-pack-exact-match.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, verifiedPackHit, exactPackHit } from './lib/pack-exact-match.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    failed++;
  } else {
    console.log('OK  ', msg);
  }
}

assert(normalize('piñata') === 'pinata', 'piñata folds to pinata');
assert(normalize('café') === 'cafe', 'café folds to cafe');
assert(normalize('PINATA') === 'pinata', 'case fold');
assert(verifiedPackHit(index, 'piñata')?.verified === true, 'piñata verifies via pinata.png');
assert(verifiedPackHit(index, 'pinata')?.verified === true, 'pinata verifies');
assert(exactPackHit(index, 'soccer')?.key === 'soccer' || exactPackHit(index, 'ball'), 'baseline exact still works');
// Must NOT invent aliases
assert(exactPackHit(index, 'dustbin')?.key !== 'bin', 'no alias: dustbin is not bin');
assert(!exactPackHit(index, 'fabric') || exactPackHit(index, 'fabric').key === 'fabric', 'fabric alone stays exact-only');

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nsmoke-pack-exact-match: all passed');
