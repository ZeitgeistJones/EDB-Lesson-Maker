/**
 * Verify Shift30 Track B gicon alias targets exist in manifest.
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

const GICON_ALIASES = Object.fromEntries(
  Object.entries(policy.aliases).filter(([, v]) => String(v).startsWith('gicon-'))
);

let fail = false;
for (const [word, key] of Object.entries(GICON_ALIASES)) {
  const ok = !!(manifest.props && manifest.props[key]);
  if (!ok) {
    console.error(`MISSING manifest key: ${word} → ${key}`);
    fail = true;
  } else {
    console.log(`OK ${word} → ${key}`);
  }
}

if (fail) process.exit(1);
console.log(`\n${Object.keys(GICON_ALIASES).length} gicon alias targets verified.`);
