/**
 * grammarAimLine honesty — sports "Pass the ___." is not a polite request.
 *   node scripts/test-grammar-aim.mjs
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

const fn = src.match(/function grammarAimLine\([\s\S]*?\n  \}/);
assert(fn, 'grammarAimLine function found');
const body = fn[0];
assert(!/\\bpass the\\b/.test(body), 'bare \\bpass the\\b must not flag polite requests');
assert(/\\bplease\\b/.test(body), 'please still counts as request');
assert(/pass me\\b/.test(body) || /can you \(pass/.test(body), 'pass me / can you pass still count');
assert(/can i \(have\|get\)/.test(body), 'can I have/get still counts');

console.log('OK grammarAim request patterns (no bare pass the)');
