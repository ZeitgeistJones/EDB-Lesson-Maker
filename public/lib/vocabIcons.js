/* vocabIcons.js — resolve lesson vocabulary words to Twemoji pack PNGs.
 * Classic script → window.VocabIcons
 */
(function () {
  const INDEX_URL = 'assets/07_vocab-pack/index.json';
  const IMG_BASE = 'assets/07_vocab-pack/img/';

  let indexPromise = null;
  let indexCache = null;

  function normalize(word) {
    return String(word || '')
      .trim()
      .toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL)
        .then((r) => {
          if (!r.ok) throw new Error('Vocab icon index failed to load');
          return r.json();
        })
        .then((data) => {
          indexCache = data || {};
          return indexCache;
        })
        .catch((err) => {
          indexPromise = null;
          console.warn(err);
          indexCache = {};
          return indexCache;
        });
    }
    return indexPromise;
  }

  function lookupKey(index, key) {
    if (!key) return null;
    if (index[key] && index[key].file) return key;
    return null;
  }

  function resolveKey(index, word) {
    const raw = normalize(word);
    if (!raw) return null;

    let hit = lookupKey(index, raw);
    if (hit) return hit;

    // plural → singular (simple trailing s)
    if (raw.length > 2 && raw.endsWith('s') && !raw.endsWith('ss')) {
      hit = lookupKey(index, raw.slice(0, -1));
      if (hit) return hit;
    }

    // multi-token → last token
    if (raw.includes(' ')) {
      const parts = raw.split(' ');
      hit = lookupKey(index, parts[parts.length - 1]);
      if (hit) return hit;
    }

    return null;
  }

  async function pathFor(word) {
    const index = await loadIndex();
    const key = resolveKey(index, word);
    if (!key) return null;
    const file = index[key].file;
    return IMG_BASE + file;
  }

  async function has(word) {
    return (await pathFor(word)) != null;
  }

  async function loadPng(word) {
    const path = await pathFor(word);
    if (!path) return null;
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch (_) {
      return null;
    }
  }

  window.VocabIcons = {
    pathFor,
    has,
    loadPng,
    ready: loadIndex,
    CREDIT: 'Twemoji by Twitter, Inc and other contributors',
  };
})();
