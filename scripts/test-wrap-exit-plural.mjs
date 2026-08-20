/**
 * Wrap exit recycle: "score" matches "scores" in review lines.
 *   node scripts/test-wrap-exit-plural.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'public/lib/renderLessonPages.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

assert(src.includes('(s|es)?'), 'wrap exitMissing must allow plural stems (s|es)?');
assert(src.includes('exitMissing'), 'exitMissing still present');

console.log('OK wrap exit plural stem recycle');
