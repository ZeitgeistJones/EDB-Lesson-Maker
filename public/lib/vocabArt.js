/* vocabArt.js — single ladder for vocab picture planning (pack → prop → glyph → none).
 *
 * Match dock and readiness both call VocabArt.planFor so bake never invents a
 * Gemini emoji / bullet / wrong compound when tier-1 is missing.
 * Classic script → window.VocabArt
 */
(function () {
  function slug(word) {
    return String(word || '')
      .trim()
      .toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');
  }

  function vocabWords(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .map((w) => String(w))
      .slice(0, 6);
  }

  /**
   * Defense-in-depth on top of PropBank head-noun identity (f2db9af).
   * Rejects a resolved prop whose key/identity does not head-match the word.
   */
  function headNounOk(word, prop) {
    if (!prop || !word) return false;
    const PB = window.PropBank;
    const key = slug(word);
    if (!key) return false;
    const tokens = new Set([key]);
    if (key.length > 3 && key.endsWith('s') && !key.endsWith('ss')) {
      tokens.add(key.slice(0, -1));
    }
    if (PB && typeof PB.identityHit === 'function') {
      for (const t of tokens) {
        if (PB.identityHit(prop, t)) return true;
      }
      return false;
    }
    // Local mirror if PropBank export missing
    for (const t of tokens) {
      if (prop.key === t || (prop.key && prop.key.endsWith('-' + t))) return true;
      if (prop.identity && prop.identity.includes(t)) return true;
    }
    return false;
  }

  function assertIconsWarm() {
    const VI = window.VocabIcons;
    if (!VI) {
      throw new Error('VocabArt.planFor: VocabIcons not loaded');
    }
    if (typeof VI.indexReady === 'function' && !VI.indexReady()) {
      throw new Error('VocabArt.planFor: VocabIcons index cold — await VocabIcons.ready() first');
    }
    if (typeof VI.loadError === 'function') {
      const err = VI.loadError();
      if (err) {
        throw new Error('VocabArt.planFor: VocabIcons index failed — ' + (err.message || String(err)));
      }
    }
  }

  /**
   * Plan art for each vocab word.
   * @returns {{ rows: object[], matchable: object[], dropped: object[] }}
   */
  function planFor(lesson, opts) {
    opts = opts || {};
    assertIconsWarm();

    const VI = window.VocabIcons;
    const PB = window.PropBank;
    const words = vocabWords(lesson);
    const family = opts.family
      || (PB && PB.familyFor ? PB.familyFor(lesson) : null)
      || (PB && PB.HOUSE_FAMILY)
      || null;
    const seed = opts.seed != null ? opts.seed : ((lesson && lesson.title) || '');
    const minScore = (PB && PB.DEFAULT_MIN_SCORE) || 4;

    const usedSrc = new Set();
    const usedGlyph = new Set();
    const exclude = [];
    const rows = [];

    for (const word of words) {
      let tier = 'none';
      let artSrc = null;
      let glyph = null;
      let propKey = null;

      // Tier 1 — curated VocabIcons pack PNG
      const packPath = typeof VI.pathForSync === 'function' ? VI.pathForSync(word) : null;
      if (packPath && !usedSrc.has(packPath)) {
        tier = 'pack';
        artSrc = packPath;
      }

      // Tier 2 — PropBank identity resolve + headNounOk (defense-in-depth)
      if (tier === 'none' && PB && typeof PB.loaded === 'function' && PB.loaded()) {
        const prop = PB.resolve({
          word,
          family,
          seed,
          exclude: exclude.slice(),
          minScore,
        });
        if (prop && prop.path && headNounOk(word, prop) && !usedSrc.has(prop.path)) {
          tier = 'prop';
          artSrc = prop.path;
          propKey = prop.key;
        }
      }

      // Tier 3 — curated glyph only (SAFE_EMOJI / EMOJI_OVERRIDES) — never Gemini
      if (tier === 'none' && typeof VI.curatedGlyph === 'function') {
        const g = VI.curatedGlyph(word);
        if (g && g !== '•' && !usedGlyph.has(g)) {
          tier = 'glyph';
          glyph = g;
        }
      }

      if (tier === 'pack' || tier === 'prop') {
        usedSrc.add(artSrc);
        if (propKey) exclude.push(propKey);
      } else if (tier === 'glyph') {
        usedGlyph.add(glyph);
      }

      rows.push({
        word,
        tier,
        artSrc,
        glyph,
        propKey,
        matchable: tier !== 'none',
      });
    }

    const matchable = rows.filter((r) => r.matchable);
    const dropped = rows.filter((r) => !r.matchable);
    return { rows, matchable, dropped };
  }

  window.VocabArt = {
    planFor,
    headNounOk,
    vocabWords,
  };
})();
