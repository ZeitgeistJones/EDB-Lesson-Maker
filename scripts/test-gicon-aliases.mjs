/**
 * Verify Shift30 alias targets (gicon-* and kenney-*) exist in manifest.
 *   node scripts/test-gicon-aliases.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8')
);
const policy = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/lib/propPolicy.json'), 'utf8')
);

const SHELF_ALIASES = Object.fromEntries(
  Object.entries(policy.aliases).filter(
    ([, v]) => String(v).startsWith('gicon-') || String(v).startsWith('kenney-')
  )
);

let fail = false;
for (const [word, key] of Object.entries(SHELF_ALIASES)) {
  const ok = !!(manifest.props && manifest.props[key]);
  if (!ok) {
    console.error(`MISSING manifest key: ${word} → ${key}`);
    fail = true;
  } else {
    console.log(`OK ${word} → ${key}`);
  }
}

if (fail) process.exit(1);
console.log(`\n${Object.keys(SHELF_ALIASES).length} gicon/kenney alias targets verified.`);
