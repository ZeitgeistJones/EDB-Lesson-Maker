/* vocabArt.js — single ladder for vocab picture planning (pack → prop → glyph → none).
 *
 * Match dock and readiness both call VocabArt.planFor so bake never invents a
 * Gemini emoji / bullet / wrong compound when tier-1 is missing.
 * Classic script → window.VocabArt
 *
 * Black-field 09_props cutouts are first-class for New Words when dock-sharp +
 * identity-clear (not soft blobs / off-topic decorative). Dedicated white
 * 07_vocab-pack rows still win on exact/plural hits; stand-in pack aliases
 * yield to a tighter prop when one resolves. White Manus sheets fill remaining
 * gaps.
 *
 * MAX_BOARD_VOCAB is the single ceiling for board cards, match dock, wrap aims,
 * and teacher PDF word lists. Generate may return more (30→7 / 60→12); overflow
 * is a BoardReadiness draft reason, not silent truncation.
 */
(function () {
  /** Board + PDF teach at most this many vocab items (2×3 card grid / dock). */
  const MAX_BOARD_VOCAB = 6;

  function slug(word) {
    return String(word || '')
      .trim()
      .toLowerCase()
      // Strip apostrophes so "don't" → "dont" and can identityHit tier-2 props.
      .replace(/['\u2019]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');
  }

  /** Raw vocabulary array capped to the board ceiling (objects or strings). */
  function boardVocabulary(lesson) {
    return ((lesson && lesson.vocabulary) || []).slice(0, MAX_BOARD_VOCAB);
  }

  function vocabWords(lesson) {
    return boardVocabulary(lesson)
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .map((w) => String(w));
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

  /**
   * Tight identity for preferring a prop over a pack stand-in.
   * Exact key / *-word suffix / identity[] only — NOT propPolicy alias alone
   * (alias-only would let brush→paintbrush steal dental toothbrush pack art).
   */
  function identityTight(word, prop) {
    if (!prop || !word) return false;
    const key = slug(word);
    if (!key) return false;
    const tokens = [key];
    if (key.length > 3 && key.endsWith('s') && !key.endsWith('ss')) {
      tokens.push(key.slice(0, -1));
    }
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
   * Sport / gym lessons where bare "ball" means soccer (pack ball.png is a
   * volleyball stand-in — prefer soccer-ball prop instead of poisoning New Words).
   */
  function isSportBallLesson(lesson, seed) {
    const bits = [
      seed,
      lesson && lesson.title,
      lesson && lesson.activity && lesson.activity.title,
      lesson && lesson.story && lesson.story.title,
    ];
    const pages = (lesson && lesson.story && lesson.story.pages) || [];
    for (const p of pages) {
      if (p && p.visualTheme) bits.push(p.visualTheme);
      if (p && p.visualCaption) bits.push(p.visualCaption);
    }
    for (const w of vocabWords(lesson)) bits.push(w);
    const blob = bits.filter(Boolean).join(' ').toLowerCase();
    return /\b(soccer|football|sports?|sporty|gym|athletic|basketball|tennis|baseball|coach|whistle|goalkeeper|teamwork|kickoff|pitch)\b/.test(blob)
      || /\bon the field\b/.test(blob);
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
    const sportBallLesson = isSportBallLesson(lesson, seed);

    const usedSrc = new Set();
    const usedGlyph = new Set();
    const exclude = [];
    const rows = [];

    for (const word of words) {
      let tier = 'none';
      let artSrc = null;
      let glyph = null;
      let propKey = null;
      const key = slug(word);
      // Pack ball.png reads as volleyball — skip tier-1 under sport lessons so
      // soccer-ball (or identity ball) can win at prop tier without replacing
      // the pack file (park / generic "ball" lessons keep the pack row).
      const skipPackForSportBall = sportBallLesson && (key === 'ball' || key === 'balls');
      const packIsStandIn =
        typeof VI.isStandInPack === 'function' ? VI.isStandInPack(word) : false;

      // Tier 1 — curated VocabIcons pack PNG (exact/plural dedicated rows win;
      // stand-ins may yield to a tighter prop below).
      let packPath = null;
      if (!skipPackForSportBall) {
        packPath = typeof VI.pathForSync === 'function' ? VI.pathForSync(word) : null;
        if (packPath && usedSrc.has(packPath)) packPath = null;
      }

      // Tier 2 — PropBank identity resolve + headNounOk (defense-in-depth).
      // Match picture bin uses the same sharp + decorative rules as roleplay
      // docks (MIN_DOCK_SRC / isDockSharp; decorativePacksFor). Soft blob
      // splices (e.g. gashapon-robot ~71px) must not ship enlarged on New Words.
      // Always resolve when the bank is warm so stand-in packs can yield to a
      // sharper cutout, and so no-pack words fill from 09_props aggressively.
      let prop = null;
      let propOk = false;
      if (PB && typeof PB.loaded === 'function' && PB.loaded()) {
        const decoOK =
          typeof PB.decorativePacksFor === 'function'
            ? PB.decorativePacksFor(lesson)
            : new Set();
        const propOkForMatch = (p) => {
          if (!p || !p.path || usedSrc.has(p.path) || !headNounOk(word, p)) return false;
          if (typeof PB.isDockSharp === 'function' && !PB.isDockSharp(p)) return false;
          if (
            typeof PB.isDecorativeProp === 'function'
            && PB.isDecorativeProp(p)
            && !decoOK.has(p.pack)
          ) {
            return false;
          }
          return true;
        };
        if (skipPackForSportBall) {
          // Pin canonical soccer-ball. resolve() can rotate to soccer-ball-orange
          // via SceneBackgrounds.rotate in browser bakes; orange fails headNounOk
          // for word "ball" and the New Words pad disappears.
          prop = typeof PB.get === 'function' ? PB.get('soccer-ball') : null;
          if (prop && family && prop.family && prop.family !== family) prop = null;
          if (!propOkForMatch(prop)) {
            prop = PB.resolve({
              word: 'soccer-ball',
              family,
              seed,
              exclude: exclude.concat(['soccer-ball-orange']),
              minScore,
              allowUnthemedIdentity: true,
            });
          }
          if (!propOkForMatch(prop)) {
            prop = PB.resolve({
              word,
              family,
              seed,
              exclude: exclude.concat(['soccer-ball-orange']),
              minScore,
              allowUnthemedIdentity: true,
            });
          }
        } else {
          prop = PB.resolve({
            word,
            family,
            seed,
            exclude: exclude.slice(),
            minScore,
            allowUnthemedIdentity: true,
          });
        }
        propOk = propOkForMatch(prop);
      }

      // Prefer viable black prop when: no pack, sport-ball skip, pack is a
      // stand-in with tight head-noun cutout, or subjectLock:person with a
      // matching person cutout (job-coach beats flat coach.png).
      const lock =
        typeof PB.subjectLockEntry === 'function' ? PB.subjectLockEntry(word) : null;
      const preferPersonProp =
        propOk
        && typeof lock === 'string'
        && lock === 'person'
        && prop.subject === 'person'
        && identityTight(word, prop);
      const preferProp =
        propOk
        && (
          !packPath
          || skipPackForSportBall
          || preferPersonProp
          || (packIsStandIn && identityTight(word, prop))
        );

      if (preferProp) {
        tier = 'prop';
        artSrc = prop.path;
        propKey = prop.key;
      } else if (packPath) {
        tier = 'pack';
        artSrc = packPath;
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
    MAX_BOARD_VOCAB,
    planFor,
    headNounOk,
    identityTight,
    isSportBallLesson,
    vocabWords,
    boardVocabulary,
    slug,
  };
})();
