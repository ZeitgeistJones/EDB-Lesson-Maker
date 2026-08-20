/**
 * Tag king-stage heroes + dock mates into real packs (surgical — keeps the
 * single-line prop rows in manifest.json so the diff stays reviewable).
 *
 *   node scripts/tag-king-hero-packs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/assets/09_props/manifest.json');

let text = fs.readFileSync(MANIFEST, 'utf8');
const raw = JSON.parse(text);
const props = raw.props;

function patchKey(key, mutate) {
  const row = props[key];
  if (!row) {
    console.log(`SKIP missing ${key}`);
    return;
  }
  const before = JSON.stringify(row);
  mutate(row);
  const after = JSON.stringify(row);
  if (before === after) {
    console.log(`OK  ${key} (unchanged)`);
    return;
  }
  // Manifest stores each prop as one indented line: "key": { ... },
  const re = new RegExp(
    `^(\\s*"${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}":\\s*)\\{.*\\}(,?)\\s*$`,
    'm',
  );
  if (!re.test(text)) {
    console.log(`FAIL regex ${key}`);
    process.exitCode = 1;
    return;
  }
  text = text.replace(re, (_, pre, comma) => `${pre}${after}${comma || ''}`);
  console.log(`OK  ${key}`);
}

function setPack(key, pack) {
  patchKey(key, (row) => {
    row.pack = String(pack).toLowerCase();
    delete row.packs;
  });
}

function setPacks(key, packs) {
  patchKey(key, (row) => {
    const list = [...new Set(packs.map((p) => String(p).toLowerCase()).filter(Boolean))];
    row.packs = list;
    row.pack = list[0];
  });
}

function addTags(key, tagsAdd) {
  patchKey(key, (row) => {
    row.tags = [...new Set([...(row.tags || []), ...tagsAdd])];
  });
}

// --- dental ---
setPack('dental-kid-open-mouth', 'dental');
for (const k of [
  'toothbrush-prop', 'toothpaste-tube', 'floss-pick', 'dental-mirror',
  'cavity-tooth', 'healthy-tooth', 'reward-star-dental', 'dental-bib',
  'dental-bin', 'dental-tissues',
]) setPack(k, 'dental');

// --- face ---
setPack('face-blank', 'face');
for (const k of [
  'face-eyes-brown', 'face-mouth-smile', 'face-nose-button', 'hair-messy-brown',
  'face-eyes-blue', 'face-mouth-open', 'face-nose-round', 'hair-pony-blonde',
  'face-eyes-green', 'face-nose-point', 'hair-afro-dark', 'face-eyes-dark',
  'face-nose-long', 'hair-bob-red', 'face-ears-round', 'hair-spiky-blonde',
  'face-ears-oval', 'hair-double-bun', 'face-ears-large', 'hair-braids-brown',
  'hair-wavy-brown', 'hair-slick-black', 'face-hair-curly', 'face-hair-pigtails',
  'face-hair-shaggy', 'face-glasses-round', 'face-mouth-frown', 'face-mouth-line',
  'face-brows-dark',
]) setPack(k, 'face');

// --- trampoline ---
setPack('trampoline', 'trampoline');
for (const k of ['jump-rope', 'whistle', 'sports-cone', 'water-bottle', 'stopwatch', 'gym-mat']) {
  setPacks(k, ['trampoline']);
}
for (const k of ['gym-yoga-mat', 'sport-cone-marker', 'sport-rolled-gym-mat']) {
  const row = props[k];
  if (!row) continue;
  setPacks(k, [row.pack, 'trampoline'].filter(Boolean));
}

// --- kitchen wash-up tags ---
for (const k of ['bath-sink', 'bath-sponge', 'bath-sink-v2', 'bath-sponge-v2', 'bathroom-bath-sponge']) {
  addTags(k, ['kitchen', 'dishes', 'washing-up']);
}

fs.writeFileSync(MANIFEST, text);
console.log('\nWrote', MANIFEST);
