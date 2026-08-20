/**
 * Strict vocab-pack exact match helpers shared by coverageloop + discovery.
 * No PACK_ALIASES / PropBank / VocabArt / token hitchhiking.
 */
export const IRREGULAR = {
  benches: 'bench',
  leaves: 'leaf',
  knives: 'knife',
  wolves: 'wolf',
  mice: 'mouse',
  geese: 'goose',
  children: 'child',
  feet: 'foot',
  teeth: 'tooth',
  men: 'man',
  women: 'woman',
};

/**
 * ASCII-fold accents (piñata → pinata) then strip leftover punctuation.
 * This is exact-key honesty, not aliasing: ñ/é fold to base letters only.
 */
export function normalize(word) {
  return String(word || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slug(word) {
  return normalize(word).replace(/\s+/g, '-');
}

export function fileStem(file) {
  return String(file || '')
    .replace(/\.png$/i, '')
    .toLowerCase()
    .trim();
}

/** Exact / hyphen / simple plural / irregular — no aliases. */
export function exactPackHit(index, word) {
  const raw = normalize(word);
  if (!raw) return null;
  const candidates = new Set([raw, slug(raw)]);
  if (IRREGULAR[raw]) candidates.add(IRREGULAR[raw]);
  if (IRREGULAR[slug(raw)]) candidates.add(IRREGULAR[slug(raw)]);
  if (raw.length > 3 && raw.endsWith('s') && !raw.endsWith('ss') && !raw.endsWith('ous')) {
    candidates.add(raw.slice(0, -1));
    candidates.add(slug(raw).slice(0, -1));
  }
  if (raw.endsWith('ies') && raw.length > 4) {
    candidates.add(`${raw.slice(0, -3)}y`);
  }
  for (const c of candidates) {
    if (index[c] && index[c].file) {
      return {
        key: c,
        kind: c === raw || c === slug(raw) ? 'exact' : 'plural',
        file: index[c].file,
      };
    }
  }
  return null;
}

export function isCanonical(word, hit, whitelist = {}) {
  if (!hit) return false;
  const stem = fileStem(hit.file);
  if (stem === hit.key || stem === slug(hit.key) || stem === slug(word)) return true;
  const wl = whitelist[normalize(word)] || whitelist[slug(word)];
  if (wl && fileStem(wl) === stem) return true;
  return false;
}

/** Verified = exact hit AND canonical file. */
export function verifiedPackHit(index, word, whitelist = {}) {
  const hit = exactPackHit(index, word);
  if (!hit) return null;
  if (!isCanonical(word, hit, whitelist)) return { ...hit, verified: false };
  return { ...hit, verified: true };
}
