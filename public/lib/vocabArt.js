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
 *
 * Coverage adapt (same topic, no silent topic drift): before planning art for
 * the board, reorder vocabulary so the teachable slice prefers words with real
 * pack/prop/glyph art. Overflow stays on the lesson for story/speaking; Ready
 * still requires the adapted slice to clear the art floor.
 *
 * ── boardCount policy (locked 2026-08-11) ───────────────────────────────────
 * Let `pictured` = words in the FULL vocabulary list that resolve to tier
 * prop / pack when each word is scored independently. Glyph (curated emoji)
 * stays matchable on the dock but does NOT count toward the 4/5 shorten
 * decision — an emoji board is not a dense professional board.
 *
 *   pictured ≥ 6 → boardCount 6   (2×3 grid, unchanged)
 *   pictured = 5 → boardCount 5   honest short board
 *   pictured = 4 → boardCount 4   honest short board
 *   pictured ≤ 3 → boardCount MIN_BOARD_VOCAB (4): the pictured words first,
 *                  then the best-ranked remaining words as fillers. The art
 *                  floor then fails and BoardReadiness returns Draft. We do
 *                  NOT ship a 3-card page dressed as a finished board.
 *
 * boardCount never exceeds the number of words the lesson actually has.
 * Every downstream surface (New Words cards, match dock, title aims, sentence
 * frame word bank, wrap exit, teacher PDF vocab page) must render exactly
 * boardCount cells — no ghost sixth slot.
 *
 * Two changes from the first adapt pass, both deliberate:
 *  1. Adapt now runs for 6-word lessons too. Previously it early-returned when
 *     the list was ≤ MAX_BOARD_VOCAB, so the common 6-word lesson could never
 *     shorten and sat at Draft forever on a 3/6 art ratio.
 *  2. The adapt scan scores each word independently (no cross-word art dedupe).
 *     The old scan reused planFor's usedSrc/exclude sets across the whole list,
 *     so a word could be scored tier:none only because an OVERFLOW word ahead
 *     of it consumed the same PNG — then it got demoted off the board for a
 *     collision that would never have happened on the real six.
 * ───────────────────────────────────────────────────────────────────────────
 */
(function () {
  /** Board + PDF teach at most this many vocab items (2×3 card grid / dock). */
  const MAX_BOARD_VOCAB = 6;

  /** Never shorten the board below this. 3-card layouts are out of scope. */
  const MIN_BOARD_VOCAB = 4;

  /** Tier rank for adapt sort — higher = prefer on the board slice. */
  const TIER_RANK = { prop: 3, pack: 3, glyph: 2, none: 0 };

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

  function entryWord(v) {
    if (typeof v === 'string') return String(v);
    if (v && v.word) return String(v.word);
    return '';
  }

  /**
   * Raw vocabulary array capped to the board ceiling (objects or strings).
   * Call adaptBoardVocabulary(lesson) once in plan/bake so this slice is the
   * art-preferred order — not blindly generate's first six. When adapt shortens
   * the board, boardCount shrinks the slice (never below MIN_BOARD_VOCAB
   * unless the lesson itself has fewer words).
   */
  function boardVocabulary(lesson) {
    const all = (lesson && lesson.vocabulary) || [];
    const adapted = lesson && lesson._vocabAdapted;
    const raw = Number(adapted && adapted.boardCount);
    const n = Math.min(
      MAX_BOARD_VOCAB,
      all.length || MAX_BOARD_VOCAB,
      Math.max(1, raw || MAX_BOARD_VOCAB)
    );
    return all.slice(0, n);
  }

  /** How many cells every board/PDF surface should draw. Single source of truth. */
  function boardCount(lesson) {
    return boardVocabulary(lesson).length;
  }

  function vocabWords(lesson) {
    return boardVocabulary(lesson)
      .map((v) => entryWord(v))
      .filter(Boolean);
  }

  function allVocabEntries(lesson) {
    return ((lesson && lesson.vocabulary) || []).slice();
  }

  /**
   * Decide the board size from how many words we can actually picture.
   * See the boardCount policy block at the top of this file.
   *
   * @param {number} pictured count of tier prop/pack/glyph words in the full list
   * @param {number} available total words the lesson has
   */
  function plannedBoardCount(pictured, available) {
    const cap = Math.min(MAX_BOARD_VOCAB, Math.max(1, available));
    if (pictured >= MAX_BOARD_VOCAB) return cap;
    if (pictured >= MIN_BOARD_VOCAB) return Math.min(pictured, cap);
    // Too few pictured words to be honest about — hold the floor at 4 and let
    // the art ratio fail so BoardReadiness ships Draft with a real reason.
    return Math.min(MIN_BOARD_VOCAB, cap);
  }

  /**
   * Reorder lesson.vocabulary in place: best-art words first (stable), so the
   * board/PDF ceiling teaches what we can picture. Same topic — never swaps
   * the lesson theme. Idempotent via lesson._vocabAdapted.
   *
   * @returns {{ adapted: boolean, board: string[], overflow: string[],
   *             promoted: string[], boardCount: number, pictured: number }}
   */
  function adaptBoardVocabulary(lesson, opts) {
    opts = opts || {};
    const empty = {
      adapted: false, board: [], overflow: [], promoted: [], boardCount: 0, pictured: 0,
    };
    if (!lesson || !Array.isArray(lesson.vocabulary) || !lesson.vocabulary.length) {
      return empty;
    }

    // Already adapted — replay the stored decision, never rescore.
    if (lesson._vocabAdapted && lesson._vocabAdapted.done) {
      const meta = lesson._vocabAdapted;
      const words = vocabWords(lesson);
      const all = allVocabEntries(lesson).map(entryWord).filter(Boolean);
      return {
        adapted: !!meta.changed,
        board: words,
        overflow: all.slice(words.length),
        promoted: meta.promoted || [],
        boardCount: words.length,
        pictured: Number(meta.pictured) || 0,
      };
    }

    const entries = allVocabEntries(lesson);

    // A single-word lesson has nothing to reorder — settle it without touching
    // VocabIcons so a cold index can't throw on a list that needs no scoring.
    if (entries.length <= 1) {
      lesson._vocabAdapted = {
        done: true,
        changed: false,
        promoted: [],
        boardCount: entries.length,
        pictured: 0,
        shortened: false,
      };
      return {
        adapted: false,
        board: entries.map(entryWord).filter(Boolean),
        overflow: [],
        promoted: [],
        boardCount: entries.length,
        pictured: 0,
      };
    }

    assertIconsWarm();

    // Score the FULL list, each word independently (no cross-word dedupe) —
    // same topic, we are only asking "can this word be pictured at all?".
    const planned = planFor(lesson, {
      family: opts.family,
      seed: opts.seed != null ? opts.seed : ((lesson && lesson.title) || ''),
      allWords: true,
      independent: true,
    });

    const byWord = new Map();
    for (const row of planned.rows || []) {
      byWord.set(String(row.word).toLowerCase(), row);
    }

    const ranked = entries.map((entry, index) => {
      const w = entryWord(entry);
      const row = byWord.get(w.toLowerCase()) || { tier: 'none', matchable: false };
      return {
        entry,
        index,
        word: w,
        tier: row.tier || 'none',
        rank: TIER_RANK[row.tier] || 0,
        matchable: !!row.matchable,
      };
    });
    ranked.sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return a.index - b.index;
    });

    // Pack/prop only — glyph ranks for sort preference but not for "pictured".
    const pictured = ranked.filter((r) => r.tier === 'prop' || r.tier === 'pack');
    const target = plannedBoardCount(pictured.length, ranked.length);
    // ranked is already best-art-first, so the top `target` rows are the
    // pictured words plus (only when pictured < 4) the best available fillers.
    const boardItems = ranked.slice(0, target);

    const boardKeys = new Set(boardItems.map((r) => r.index));
    const overflowItems = ranked
      .filter((r) => !boardKeys.has(r.index))
      .sort((a, b) => a.index - b.index);
    // Keep overflow in original relative order after the board slice.
    const next = boardItems.map((r) => r.entry).concat(overflowItems.map((r) => r.entry));

    const before = entries.map(entryWord).filter(Boolean).slice(0, MAX_BOARD_VOCAB);
    const after = boardItems.map((r) => r.word).filter(Boolean);
    const beforeLower = before.map((w) => String(w).toLowerCase());
    const changed = beforeLower.join('|') !== after.map((w) => String(w).toLowerCase()).join('|');
    const promoted = after.filter((w) => !beforeLower.includes(String(w).toLowerCase()));

    lesson.vocabulary = next;
    lesson._vocabAdapted = {
      done: true,
      changed,
      promoted,
      before,
      after,
      boardCount: boardItems.length,
      pictured: pictured.length,
      generated: entries.length,
      shortened: boardItems.length < MAX_BOARD_VOCAB,
      // Cached scan so plan()/BoardReadiness can skip a second full-list
      // planFor if they want it. Board-slice planning still runs normally.
      scan: (planned.rows || []).map((r) => ({ word: r.word, tier: r.tier })),
    };
    return {
      adapted: changed,
      board: after,
      overflow: overflowItems.map((r) => r.word).filter(Boolean),
      promoted,
      boardCount: boardItems.length,
      pictured: pictured.length,
    };
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
    for (const w of ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)) {
      bits.push(w);
    }
    const blob = bits.filter(Boolean).join(' ').toLowerCase();
    return /\b(soccer|football|sports?|sporty|gym|athletic|basketball|tennis|baseball|coach|whistle|goalkeeper|teamwork|kickoff|pitch)\b/.test(blob)
      || /\bon the field\b/.test(blob);
  }

  /**
   * Plan art for each vocab word.
   * @param {object} [opts.allWords] when true, score the full vocabulary list
   *   (adapt scan) instead of the board ceiling slice.
   * @param {object} [opts.independent] when true, score each word on its own —
   *   no usedSrc / usedGlyph / exclude carry-over between words. Used by the
   *   adapt scan so an overflow word cannot steal art from a board word and
   *   fake a tier:none. Never use for the real bake — the board still needs
   *   one-picture-per-word dedupe.
   * @returns {{ rows: object[], matchable: object[], dropped: object[] }}
   */
  function planFor(lesson, opts) {
    opts = opts || {};
    assertIconsWarm();

    const VI = window.VocabIcons;
    const PB = window.PropBank;
    const independent = !!opts.independent;
    const words = opts.allWords
      ? allVocabEntries(lesson).map(entryWord).filter(Boolean)
      : vocabWords(lesson);
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

    // Sense corroboration reads the WHOLE lesson, not the board slice: the
    // title and the sibling vocab are what say whether "bat" is the animal or
    // the baseball bat. Built once — every word checks against the same context.
    const senseContext = [
      (lesson && lesson.title) || '',
      ...allVocabEntries(lesson).map(entryWord).filter(Boolean),
    ];

    for (const word of words) {
      let tier = 'none';
      let artSrc = null;
      let glyph = null;
      let propKey = null;
      const key = slug(word);
      // Polysemous word whose banked picture shows the other sense — ship no
      // picture rather than teach the wrong one (propPolicy.senses).
      if (PB && typeof PB.senseCorroborated === 'function'
        && !PB.senseCorroborated(word, senseContext)) {
        rows.push({
          word, tier: 'none', artSrc: null, glyph: null, propKey: null,
          matchable: false, reason: 'sense-mismatch',
        });
        continue;
      }
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
        if (packPath && !independent && usedSrc.has(packPath)) packPath = null;
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
          if (!p || !p.path || !headNounOk(word, p)) return false;
          if (!independent && usedSrc.has(p.path)) return false;
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
        const excludeNow = independent ? [] : exclude.slice();
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
              exclude: excludeNow.concat(['soccer-ball-orange']),
              minScore,
              allowUnthemedIdentity: true,
            });
          }
          if (!propOkForMatch(prop)) {
            prop = PB.resolve({
              word,
              family,
              seed,
              exclude: excludeNow.concat(['soccer-ball-orange']),
              minScore,
              allowUnthemedIdentity: true,
            });
          }
        } else {
          prop = PB.resolve({
            word,
            family,
            seed,
            exclude: excludeNow,
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
        PB && typeof PB.subjectLockEntry === 'function' ? PB.subjectLockEntry(word) : null;
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
        if (g && g !== '•' && (independent || !usedGlyph.has(g))) {
          tier = 'glyph';
          glyph = g;
        }
      }

      if (!independent) {
        if (tier === 'pack' || tier === 'prop') {
          usedSrc.add(artSrc);
          if (propKey) exclude.push(propKey);
        } else if (tier === 'glyph') {
          usedGlyph.add(glyph);
        }
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
    MIN_BOARD_VOCAB,
    planFor,
    adaptBoardVocabulary,
    plannedBoardCount,
    headNounOk,
    identityTight,
    isSportBallLesson,
    vocabWords,
    boardVocabulary,
    boardCount,
    slug,
  };
})();
