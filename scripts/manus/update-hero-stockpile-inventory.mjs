/**
 * Mark hero stockpile inventory items as banked after import.
 *
 *   node scripts/manus/update-hero-stockpile-inventory.mjs
 *   node scripts/manus/update-hero-stockpile-inventory.mjs --wave=wave2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WAVES } from './hero-targets-harvest-keys.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STOCKPILE = path.join(ROOT, 'tmp', 'manus-hero-stockpile');
const INV_PATH = path.join(STOCKPILE, 'inventory.json');
const IMG = path.join(ROOT, 'public/assets/09_props/img');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function keysForConcept(concept, kind) {
  if (kind === 'pair') return [`hero-${concept}-closed`, `hero-${concept}-open`];
  return [`hero-${concept}`];
}

function bankedStatus(concept, kind, manifest) {
  const keys = keysForConcept(concept, kind);
  const pngOk = keys.every((k) => fs.existsSync(path.join(IMG, `${k}.png`)));
  const manifestOk = keys.every((k) => manifest.props[k]);
  return { banked: pngOk && manifestOk, manifest_keys: keys.filter((k) => manifest.props[k]) };
}

const onlyWave = arg('wave', '');
const inv = JSON.parse(fs.readFileSync(INV_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const summary = {};

for (const [waveId, wave] of Object.entries(inv.waves || {})) {
  if (onlyWave && waveId !== onlyWave) continue;
  let banked = 0;
  let held = 0;
  for (const item of wave.items || []) {
    const st = bankedStatus(item.concept, item.kind, manifest);
    item.banked = st.banked;
    item.manifest_keys = st.manifest_keys;
    if (st.banked) banked += 1;
    else held += 1;
  }
  wave.import_summary = {
    banked,
    held,
    total: (wave.items || []).length,
    import_report: fs.existsSync(path.join(STOCKPILE, waveId, 'import-report.json'))
      ? path.join(STOCKPILE, waveId, 'import-report.json')
      : null,
  };
  summary[waveId] = wave.import_summary;
}

inv.updated_at = new Date().toISOString();
fs.writeFileSync(INV_PATH, JSON.stringify(inv, null, 2));
console.log(JSON.stringify({ updated_at: inv.updated_at, summary }, null, 2));
