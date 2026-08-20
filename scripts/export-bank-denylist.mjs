/**
 * Export live bank keys so you can tell Manus: do not remake these.
 *   node scripts/export-bank-denylist.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/07_vocab-pack/index.json'), 'utf8'));
const propsManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8'));

const vKeys = Object.keys(vocab)
  .filter((k) => !k.startsWith('_'))
  .sort((a, b) => a.localeCompare(b));

let propIds = [];
if (Array.isArray(propsManifest.props)) {
  propIds = propsManifest.props.map((p) => p.id || p.key).filter(Boolean);
} else if (propsManifest.props && typeof propsManifest.props === 'object') {
  propIds = Object.keys(propsManifest.props);
} else {
  propIds = Object.keys(propsManifest).filter((k) => !['version', 'updated', 'meta'].includes(k));
}
propIds = [...new Set(propIds)].sort((a, b) => a.localeCompare(b));

const outDir = path.join(ROOT, 'tmp', 'bank-denylist');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString();
const md = [
  '# Bank denylist for Manus — do NOT remake these',
  `Generated ${stamp}`,
  `Vocab: ${vKeys.length} | Props: ${propIds.length}`,
  '',
  'Paste into your Manus brief:',
  '',
  '> SKIP / DO NOT GENERATE any key already listed below. Prefer new picturable objects not on this list.',
  '',
  `## Vocab pack (white icons) — ${vKeys.length}`,
  vKeys.join(', '),
  '',
  `## PropBank (black cutouts) — ${propIds.length}`,
  propIds.join(', '),
  '',
].join('\n');

fs.writeFileSync(path.join(outDir, 'ALREADY_IN_BANK.md'), md);
fs.writeFileSync(path.join(outDir, 'vocab-keys.txt'), vKeys.join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'prop-keys.txt'), propIds.join('\n') + '\n');
fs.writeFileSync(
  path.join(outDir, 'ALL-KEYS-one-line.txt'),
  [...new Set([...vKeys, ...propIds])].sort((a, b) => a.localeCompare(b)).join(', ') + '\n',
);

console.log(JSON.stringify({
  vocab: vKeys.length,
  props: propIds.length,
  dir: outDir,
  paste: path.join(outDir, 'ALREADY_IN_BANK.md'),
}, null, 2));
