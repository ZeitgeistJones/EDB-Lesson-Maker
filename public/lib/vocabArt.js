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
 * ── boardCount policy (updated 2026-08-13) ──────────────────────────────────
 * Let `pictured` = words that resolve to tier prop / pack / curated glyph.
 * Pack white-plates are gated out of board bake; curated glyphs are the honest
 * stand-in (better than theme-bank orphans with no New Words art).
 * Prefer prop/pack via TIER_RANK sort; glyphs fill remaining pictured slots.
 *
 *   pictured ≥ 6 → boardCount 6
 *   pictured = 4..5 → boardCount = pictured (honest short board)
 *   pictured = 1..3 → boardCount = pictured (honest short; Ready Drafts on
 *                     art floor / thin board — NEVER pad with blank icon cards)
 *   pictured = 0 → boardCount MIN_BOARD_VOCAB fillers (still Draft)
 *
 * Theme-bank fill (same topic, no theme drift): when pictured < MIN_BOARD_VOCAB,
 * adapt injects concrete teach-words from resolveTheme packs + title tokens that
 * already have pack/prop art (e.g. circus tent / trapeze / dino-egg), then
 * re-scores. Abstracts like "spectacular" stay on the lesson for story/speaking
 * but leave the New Words slice when they have no art.
 *
 * boardCount never exceeds pictured (except the pictured=0 Draft path).
 * Every surface renders exactly boardCount cells — no ghost empty art slots.
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
   * When TopicBrief has a full core set, the board must teach that many words —
   * never shrink to 2–3 pictured parent fillers (farm/comb) to fake coverage.
   */
  function coreCompleteTarget(lesson, brief, opts) {
    opts = opts || {};
    if (opts.forceCoreComplete === false) return null;
    const PQ = window.ProducerQuality;
    if (PQ && typeof PQ.targetPrimaryCount === 'function') {
      const n = PQ.targetPrimaryCount(lesson, opts);
      if (n >= 5) return n;
    }
    const cores = (brief && brief.coreConcepts) || [];
    const uniq = new Set(cores.map((c) => String(c || '').toLowerCase()).filter(Boolean));
    if (uniq.size >= 5) return Math.min(MAX_BOARD_VOCAB, Math.max(5, uniq.size));
    return null;
  }

  /**
   * Prefer a longer brief concept that contains this word as a stem and has
   * pack art (comb → honeycomb on a beekeeping brief). General polysemy fix —
   * not a per-topic if.
   */
  function briefPreferredWord(word, brief) {
    const VI = window.VocabIcons;
    const w = String(word || '').toLowerCase().trim().replace(/\s+/g, ' ');
    if (!w || !brief) return null;
    // If the short form is itself a listed core, keep it (ball on a basketball
    // lesson stays "ball" so the sport-ball pin can fire).
    const coresExact = new Set(
      (brief.coreConcepts || []).map((c) => String(c || '').toLowerCase().trim()).filter(Boolean)
    );
    if (coresExact.has(w)) return null;
    // Sport "ball" must stay short so sportBallPinKey can pin basketball art —
    // never remap to basketball / football compounds.
    if (w === 'ball') return null;
    const pool = []
      .concat(brief.coreConcepts || [])
      .concat(brief.primaryMotifs || [])
      .concat(brief.supportingConcepts || []);
    let best = null;
    for (const c of pool) {
      const cn = String(c || '').toLowerCase().trim();
      if (!cn || cn === w) continue;
      // Polysemy is single-token only (comb → honeycomb). Multi-word cores
      // like "playing basketball friend" must never swallow short forms.
      const tokens = cn.split(/[\s-]+/).filter(Boolean);
      if (tokens.length !== 1) continue;
      const cc = cn.replace(/\s+/g, '');
      const ww = w.replace(/\s+/g, '');
      if (ww.length < 3) continue;
      if (!(cc.includes(ww) && cc.length >= ww.length + 2)) continue;
      const hasArt = VI && typeof VI.pathForSync === 'function' && !!VI.pathForSync(cn);
      const score = (hasArt ? 100 : 0) + cc.length;
      if (!best || score > best.score) best = { word: String(c).trim(), score, hasArt };
    }
    return best && (best.hasArt || best.score >= 2) ? best.word : null;
  }

  function remapVocabEntriesToBrief(lesson, brief) {
    if (!lesson || !Array.isArray(lesson.vocabulary) || !brief) return 0;
    const next = [];
    const seen = new Set();
    let n = 0;
    for (let i = 0; i < lesson.vocabulary.length; i++) {
      const entry = lesson.vocabulary[i];
      const w = entryWord(entry);
      const pref = briefPreferredWord(w, brief);
      const use = pref && String(pref).toLowerCase() !== String(w).toLowerCase() ? pref : w;
      const key = String(use || '').toLowerCase().trim();
      if (!key || seen.has(key)) {
        if (pref) n++;
        continue; // drop short-form duplicate (comb when honeycomb already present)
      }
      seen.add(key);
      if (pref && String(pref).toLowerCase() !== String(w).toLowerCase()) {
        n++;
        if (typeof entry === 'string') next.push(pref);
        else next.push(Object.assign({}, entry, { word: pref }));
      } else {
        next.push(entry);
      }
    }
    lesson.vocabulary = next;
    return n;
  }

  /** Reject pack/prop keys that are brief weak/forbidden substitutes. */
  function artKeyBlockedByBrief(brief, word, artKey) {
    if (!brief || !artKey) return false;
    const TI = window.TopicIdentity;
    const key = String(artKey).toLowerCase().replace(/\.png$/i, '').replace(/-/g, ' ');
    if (TI && typeof TI.scoreAsset === 'function') {
      const scored = TI.scoreAsset(brief, {
        kind: 'vocab',
        word: word,
        key: artKey,
        pageTags: ['vocabulary'],
      });
      if (scored.role === 'forbidden' || scored.role === 'weak') return true;
    }
    const weak = [].concat(brief.weakSubstitutes || [], brief.forbiddenSubstitutes || []);
    for (const w of weak) {
      const n = String(w || '').toLowerCase().trim();
      if (!n || n.length < 3) continue;
      if (key === n || key.includes(n)) return true;
    }
    return false;
  }

  /**
   * Decide the board size from how many words we can actually picture.
   * See the boardCount policy block at the top of this file.
   *
   * @param {number} pictured count of tier prop/pack words in the full list
   * @param {number} available total words the lesson has
   * @param {number|null} completeTarget when set, never shrink below this floor
   */
  function plannedBoardCount(pictured, available, completeTarget) {
    const cap = Math.min(MAX_BOARD_VOCAB, Math.max(1, available));
    if (completeTarget != null && completeTarget > 0) {
      // Core-complete lessons: keep the teach set full even if some cards lack art.
      return Math.min(cap, Math.max(completeTarget, Math.min(MIN_BOARD_VOCAB, cap)));
    }
    if (pictured <= 0) {
      // Nothing pictureable — keep a Draft-sized floor; cards will still fail art.
      return Math.min(MIN_BOARD_VOCAB, cap);
    }
    // Legacy honest board: never pad with blank-icon none-tier words.
    return Math.min(pictured, cap);
  }

  /** Human teach-word from a themed prop key (circus-tent → "tent"). */
  function teachWordFromProp(prop) {
    if (!prop || !prop.key) return '';
    if (prop.identity && prop.identity.length) {
      return String(prop.identity[0]).replace(/-/g, ' ').trim();
    }
    let rest = String(prop.key);
    const pack = prop.pack || (prop.packs && prop.packs[0]) || '';
    if (pack && rest.toLowerCase().startsWith(pack.toLowerCase() + '-')) {
      rest = rest.slice(pack.length + 1);
    }
    rest = rest.replace(/-v\d+$/i, '').replace(/-(gray|grey|blue|red|green|soft)$/i, '');
    return rest.replace(/-/g, ' ').trim();
  }

  function wordAlreadyListed(entries, word) {
    const want = String(word || '').toLowerCase();
    return entries.some((e) => entryWord(e).toLowerCase() === want);
  }

  /**
   * Curated white-pack teach-words per theme id when PropBank packs are empty
   * (museum) or thin. Only keys that resolve in VocabIcons are pushed.
   */
  const THEME_VOCAB_FILLS = Object.freeze({
    museum: Object.freeze([
      'museum', 'ticket', 'map', 'camera', 'vase', 'pottery', 'crown', 'mask',
      'coins', 'art', 'security', 'paintbrush', 'ticket-stub', 'paint-palette',
    ]),
  });

  /**
   * Concrete bank words for this lesson's place theme + title tokens.
   * Same topic only — never injects off-theme packs.
   */
  function themeBankFillWords(lesson, excludeWords, limit) {
    const out = [];
    const seen = new Set(
      (excludeWords || []).map((w) => String(w || '').toLowerCase()).filter(Boolean)
    );
    const push = (raw) => {
      if (out.length >= limit) return;
      const w = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!w || w.length < 2 || seen.has(w)) return;
      if (/^(spectacular|amusing|gigantic|clumsy|beautiful|amazing|wonderful|interesting|important|difficult|easy|happy|sad|angry|worried|confused|shy|proud|surprised)$/.test(w)) {
        return;
      }
      // Hypernym fills next to a hyponym already on the board (fruit + apple).
      if (w === 'fruit' && [...seen].some((x) => /^(apple|banana|lemon|orange|grape|mango|pear)$/.test(x))) {
        return;
      }
      if (w === 'animal' && [...seen].some((x) => /^(dog|cat|bird|fish|horse)$/.test(x))) {
        return;
      }
      // Title token "pets" / "pet" next to dog+cat is the same hypernym trap.
      if (/^(pet|pets)$/.test(w) && [...seen].some((x) => /^(dog|cat|bird|fish|horse|pet|pets)$/.test(x))) {
        return;
      }
      seen.add(w);
      out.push(w);
    };

    const VI = window.VocabIcons;
    const PB = window.PropBank;
    const LT = window.LessonTraits;
    const theme = LT && typeof LT.resolveTheme === 'function' ? LT.resolveTheme(lesson) : null;
    const packs = (theme && theme.packs && theme.packs.length) ? theme.packs : [];

    // Title / activity tokens that already have pack art (cheap sync lookup only).
    const blob = [
      lesson && lesson.title,
      lesson && lesson.activity && lesson.activity.title,
      lesson && lesson.story && lesson.story.title,
    ].filter(Boolean).join(' ').toLowerCase();
    const tokens = blob.match(/[a-z][a-z'-]{2,}/g) || [];
    for (const t of tokens) {
      if (out.length >= limit) break;
      const clean = t.replace(/'/g, '');
      if (/^(the|and|for|with|from|that|this|your|our|into|over|about|most|more|very|just|like|have|will|would|could|should|their|them|they|what|when|where|which|while|after|before|under|quiet|study|afternoon|morning|evening|today|picture|ready|floor|word|thin|art|class|lesson|going)$/.test(clean)) {
        continue;
      }
      if (VI && typeof VI.pathForSync === 'function' && VI.pathForSync(clean)) push(clean);
      if (clean === 'dinosaur' || clean === 'dinosaurs') {
        if (VI && VI.pathForSync('dino-egg')) push('dino-egg');
        if (VI && VI.pathForSync('dinosaur')) push('dinosaur');
      }
    }

    if (PB && typeof PB.all === 'function' && packs.length && out.length < limit) {
      const packSet = new Set(packs.map((p) => String(p).toLowerCase()));
      const props = PB.all().filter((p) => {
        if (!p || p.decorative) return false;
        const ps = (p.packs && p.packs.length) ? p.packs : (p.pack ? [p.pack] : []);
        return ps.some((pk) => packSet.has(String(pk).toLowerCase()));
      });
      props.sort((a, b) => String(a.key).localeCompare(String(b.key)));
      for (const p of props) {
        if (out.length >= limit) break;
        // Skip king/stage giants as New Words cards.
        if (theme && theme.heroKey && p.key === theme.heroKey) continue;
        if (/stage|hero|backdrop|wall-gate/i.test(p.key || '')) continue;
        if (p.relativeScale != null && Number(p.relativeScale) >= 0.55) continue;
        // Sports-ball lessons must not fill with gym-machine nouns
        // (gym-aerobic-step → "gym aerobic step" on a basketball board).
        if (theme && theme.id === 'sports' && /^gym-/i.test(p.key || '')) continue;
        // Sheet-prefix props (s60-snowboard) are not A1 teach-words.
        if (/^s\d+-/i.test(p.key || '')) continue;
        const label = teachWordFromProp(p);
        if (!label) continue;
        // A1/A2 board words: 1–2 tokens, no equipment jargon.
        const tokens = label.split(/\s+/).filter(Boolean);
        if (tokens.length > 2) continue;
        if (/aerobic|elliptical|treadmill|kettlebell|barbell|medicine|battle|resistance|stationary|bench|punching|foam.?roller|snowboard|skateboard/i.test(label)) {
          continue;
        }
        push(label);
      }
    }

    // Vocab-pack fill for themes with no / thin prop packs (museum).
    const curated = (theme && theme.id && THEME_VOCAB_FILLS[theme.id]) || [];
    if (VI && typeof VI.pathForSync === 'function' && curated.length && out.length < limit) {
      for (const key of curated) {
        if (out.length >= limit) break;
        if (!VI.pathForSync(key)) continue;
        const teach = String(key).includes('-') ? String(key).replace(/-/g, ' ') : key;
        if (VI.pathForSync(teach) || VI.pathForSync(key)) push(teach);
      }
    }

    return out.slice(0, limit);
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

    const TI = window.TopicIdentity;
    const brief = opts.topicBrief
      || (lesson && lesson._topicBrief)
      || (TI && typeof TI.ensureBrief === 'function' ? TI.ensureBrief(lesson) : null);

    // Polysemy: remaps comb→honeycomb when brief prefers the longer core form.
    if (brief) remapVocabEntriesToBrief(lesson, brief);
    let entries = allVocabEntries(lesson);

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
    let planned = planFor(lesson, {
      family: opts.family,
      seed: opts.seed != null ? opts.seed : ((lesson && lesson.title) || ''),
      allWords: true,
      independent: true,
      // Coverage ranking and board bake both use allowPackFallback so pack
      // icons count as pictured AND paint on New Words.
      allowPackFallback: true,
      topicBrief: brief,
    });

    let byWord = new Map();
    for (const row of planned.rows || []) {
      byWord.set(String(row.word).toLowerCase(), row);
    }

    let ranked = entries.map((entry, index) => {
      const w = entryWord(entry);
      const row = byWord.get(w.toLowerCase()) || { tier: 'none', matchable: false };
      const identityBoost = brief && TI && typeof TI.conceptBoost === 'function'
        ? TI.conceptBoost(brief, w)
        : 0;
      const forbidden = brief && TI && typeof TI.isForbiddenWord === 'function'
        ? TI.isForbiddenWord(brief, w)
        : false;
      return {
        entry,
        index,
        word: w,
        tier: row.tier || 'none',
        rank: TIER_RANK[row.tier] || 0,
        matchable: !!row.matchable,
        identityBoost,
        forbidden,
      };
    });

    // Prefer non-forbidden words on the teach slice; forbidden parent-substitutes
    // stay in overflow (same topic list — not deleted from the lesson).
    const forbiddenDropped = ranked.filter((r) => r.forbidden);

    // Theme-bank fill: when too few pictured words (prop/pack/glyph), inject
    // concrete bank nouns for this place theme. Same topic — no drift.
    const isPicturedTier = (tier) => tier === 'prop' || tier === 'pack' || tier === 'glyph';
    let picturedList = ranked.filter((r) => isPicturedTier(r.tier) && !r.forbidden);
    const injected = [];
    const completeTarget = coreCompleteTarget(lesson, brief, opts);
    if (picturedList.length < MIN_BOARD_VOCAB || (completeTarget && picturedList.length < completeTarget)) {
      const need = MAX_BOARD_VOCAB - picturedList.length;
      // Niche briefs: do not inject parent theme bank (farm props on beekeeping).
      // Still allow theme fills for passthrough place themes (museum) so thin
      // abstract vocab can reach a pictured board.
      const nicheBrief = !!(brief && (brief.forbiddenSubstitutes || []).length);
      let fills = nicheBrief
        ? []
        : themeBankFillWords(
          lesson,
          ranked.map((r) => r.word),
          Math.max(need, MIN_BOARD_VOCAB - picturedList.length)
        );
      // Prefer brief coreConcepts when theme bank is thin / wrong parent.
      // Inject art-backed cores before abstract title peels so museum/place
      // boards still reach pictured≥4 (ticket/map before "interesting").
      if (brief && Array.isArray(brief.coreConcepts)) {
        const have = new Set(ranked.map((r) => String(r.word).toLowerCase()));
        const VI = window.VocabIcons;
        const fromBrief = brief.coreConcepts.filter((w) => {
          const k = String(w).toLowerCase();
          if (have.has(k)) return false;
          if (TI && TI.isForbiddenWord && TI.isForbiddenWord(brief, w)) return false;
          return true;
        });
        const withArt = fromBrief.filter(
          (w) => VI && typeof VI.pathForSync === 'function' && VI.pathForSync(w)
        );
        const noArt = fromBrief.filter((w) => !withArt.includes(w));
        fills = nicheBrief
          ? withArt.concat(noArt).concat(fills)
          : withArt.concat(fills).concat(noArt);
      }
      if (fills.length) {
        for (const w of fills) {
          if (wordAlreadyListed(entries, w)) continue;
          if (brief && TI && TI.isForbiddenWord && TI.isForbiddenWord(brief, w)) continue;
          const entry = { word: w, _themeBankFill: true };
          entries.push(entry);
          injected.push(w);
        }
        if (injected.length) {
          lesson.vocabulary = entries.slice();
          planned = planFor(lesson, {
            family: opts.family,
            seed: opts.seed != null ? opts.seed : ((lesson && lesson.title) || ''),
            allWords: true,
            independent: true,
            allowPackFallback: true,
            topicBrief: brief,
          });
          byWord = new Map();
          for (const row of planned.rows || []) {
            byWord.set(String(row.word).toLowerCase(), row);
          }
          ranked = entries.map((entry, index) => {
            const w = entryWord(entry);
            const row = byWord.get(w.toLowerCase()) || { tier: 'none', matchable: false };
            const identityBoost = brief && TI && typeof TI.conceptBoost === 'function'
              ? TI.conceptBoost(brief, w)
              : 0;
            const forbidden = brief && TI && typeof TI.isForbiddenWord === 'function'
              ? TI.isForbiddenWord(brief, w)
              : false;
            return {
              entry,
              index,
              word: w,
              tier: row.tier || 'none',
              rank: TIER_RANK[row.tier] || 0,
              matchable: !!row.matchable,
              identityBoost,
              forbidden,
            };
          });
          picturedList = ranked.filter((r) => isPicturedTier(r.tier) && !r.forbidden);
        }
      }
    }

    ranked.sort((a, b) => {
      if ((b.identityBoost || 0) !== (a.identityBoost || 0)) {
        return (b.identityBoost || 0) - (a.identityBoost || 0);
      }
      if (b.rank !== a.rank) return b.rank - a.rank;
      return a.index - b.index;
    });

    // Prop/pack/glyph count as pictured for the board slice (glyphs after the
    // white-plate pack gate). Visual twins (ball+basketball) must not both
    // occupy the board — the second becomes an orphan word card with no pad.
    let pictured = ranked.filter((r) => isPicturedTier(r.tier) && !r.forbidden);
    const twinSeen = new Set();
    const twinOverflow = [];
    pictured = pictured.filter((r) => {
      const row = byWord.get(String(r.word).toLowerCase()) || {
        word: r.word, artSrc: null, propKey: null,
      };
      const key = visualTwinKey(row);
      // ball-family collapsed below — prefer bare "ball" for sport pins.
      if (key === 'ball-family') return true;
      if (key && key !== 'unknown' && twinSeen.has(key)) {
        twinOverflow.push(r);
        return false;
      }
      if (key && key !== 'unknown') twinSeen.add(key);
      return true;
    });
    {
      const ballFamily = pictured.filter((r) => {
        const row = byWord.get(String(r.word).toLowerCase()) || { word: r.word };
        return visualTwinKey(row) === 'ball-family';
      });
      if (ballFamily.length > 1) {
        const keep = ballFamily.find((r) => String(r.word).toLowerCase() === 'ball')
          || ballFamily[0];
        pictured = pictured.filter((r) => {
          const row = byWord.get(String(r.word).toLowerCase()) || { word: r.word };
          if (visualTwinKey(row) !== 'ball-family') return true;
          if (r === keep) return true;
          twinOverflow.push(r);
          return false;
        });
      }
    }
    const pool = ranked.filter((r) => !r.forbidden && (r.identityBoost || 0) >= 0);
    const target = plannedBoardCount(
      pictured.length,
      Math.max(ranked.length, pool.length),
      completeTarget
    );
    // Core-complete: keep teach-set size even when some cores lack art.
    // Legacy: prefer pictured only (honest short board).
    let boardItems;
    if (completeTarget != null) {
      boardItems = [];
      const used = new Set();
      const take = (list) => {
        for (const r of list) {
          if (boardItems.length >= target) break;
          if (used.has(r.index)) continue;
          used.add(r.index);
          boardItems.push(r);
        }
      };
      // 1) pictured positive-identity  2) any positive-identity  3) remaining non-forbidden
      take(pictured.filter((r) => (r.identityBoost || 0) > 0));
      take(pool.filter((r) => (r.identityBoost || 0) > 0));
      take(pictured);
      take(pool);
      take(ranked.filter((r) => !r.forbidden));
    } else {
      boardItems = pictured.length > 0
        ? pictured.slice(0, target)
        : ranked.filter((r) => !r.forbidden).slice(0, target);
    }

    const boardKeys = new Set(boardItems.map((r) => r.index));
    const overflowItems = ranked
      .filter((r) => !boardKeys.has(r.index))
      .sort((a, b) => a.index - b.index);
    // Keep overflow in original relative order after the board slice.
    const next = boardItems.map((r) => r.entry).concat(overflowItems.map((r) => r.entry));

    const before = entries.map(entryWord).filter(Boolean).slice(0, MAX_BOARD_VOCAB);
    const after = boardItems.map((r) => r.word).filter(Boolean);
    const beforeLower = before.map((w) => String(w).toLowerCase());
    const changed = beforeLower.join('|') !== after.map((w) => String(w).toLowerCase()).join('|')
      || injected.length > 0;
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
      injected,
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
      injected,
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
   * Exact key / last kebab segment / identity[] only — NOT propPolicy alias alone
   * and NOT compound suffixes (*-paintbrush must not steal dental "brush").
   */
  function identityTight(word, prop) {
    if (!prop || !word) return false;
    const key = slug(word);
    if (!key) return false;
    const tokens = [key];
    if (key.length > 3 && key.endsWith('s') && !key.endsWith('ss')) {
      tokens.push(key.slice(0, -1));
    }
    const lastSeg = String(prop.key || '').split('-').pop();
    for (const t of tokens) {
      if (prop.key === t || lastSeg === t) return true;
      // A complete multi-word slug is still an exact identity suffix:
      // ring-light → ki-creator-ring-light. Keep single-token compound
      // protection intact so brush still cannot match tool-paintbrush.
      if (t.includes('-') && prop.key && prop.key.endsWith('-' + t)) return true;
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
   * Sport / gym lessons where bare "ball" means a sport ball (pack ball.png is a
   * volleyball stand-in — prefer a sport cutout instead of poisoning New Words).
   */
  function isSportBallLesson(lesson, seed) {
    const blob = sportBallBlob(lesson, seed);
    return /\b(soccer|football|sports?|sporty|gym|athletic|basketball|tennis|baseball|volleyball|coach|whistle|goalkeeper|teamwork|kickoff|pitch|court|hoop)\b/.test(blob)
      || /\bon the field\b/.test(blob);
  }

  /** Title + vocab + story cues used by sport-ball pinning. */
  function sportBallBlob(lesson, seed) {
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
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  /**
   * Which sport-ball prop to pin for New Words "ball".
   * Basketball lessons must NOT get soccer-ball (basketball analyze).
   */
  function sportBallPinKey(lesson, seed) {
    const blob = sportBallBlob(lesson, seed);
    if (/\bbasketball\b/.test(blob) || (/\bhoop\b/.test(blob) && /\bcourt\b/.test(blob))) {
      return 'sport-basketball';
    }
    if (/\b(tennis)\b/.test(blob)) return 'sport-tennis-ball';
    if (/\b(baseball)\b/.test(blob)) return 'sport-baseball';
    // Prefer sport-soccer / soccer-ball (navy C10 remake) over soft residuals
    // that used to force 07_vocab-pack ball.png white squares onto New Words.
    if (/\b(soccer|football|goalkeeper|pitch|kickoff)\b/.test(blob)) return 'sport-soccer';
    if (isSportBallLesson(lesson, seed)) return 'sport-soccer';
    return null;
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
    const TI = window.TopicIdentity;
    const independent = !!opts.independent;
    const brief = opts.topicBrief
      || (lesson && lesson._topicBrief)
      || (TI && typeof TI.ensureBrief === 'function' ? TI.ensureBrief(lesson) : null);
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
    const sportBallPin = sportBallPinKey(lesson, seed);
    // Theme lock packs — PropBank ranks identity peers into the lesson kit
    // (tent→circus-tent) and we prefer those cutouts over generic pack PNGs.
    const LT = window.LessonTraits;
    const theme = LT && typeof LT.resolveTheme === 'function' ? LT.resolveTheme(lesson) : null;
    const preferredPacks = (theme && theme.packs && theme.packs.length) ? theme.packs.slice() : [];
    const propInThemePack = (p) => {
      if (!p || !preferredPacks.length) return false;
      const packs = Array.isArray(p.packs) && p.packs.length
        ? p.packs
        : (p.pack ? [p.pack] : []);
      return packs.some((pk) => preferredPacks.includes(pk));
    };

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
      // Polysemous word whose banked picture shows the other sense — never ship
      // pack/prop for the wrong sense. Curated glyph is still OK (not the banked
      // wrong picture). Empty beats wrong art; glyph beats empty when available.
      const senseBlocked = !!(PB && typeof PB.senseCorroborated === 'function'
        && !PB.senseCorroborated(word, senseContext));
      // Pack ball.png reads as volleyball — skip tier-1 under sport lessons so
      // a sport cutout (basketball / soccer / …) can win at prop tier without
      // replacing the pack file (park / generic "ball" lessons keep the pack row).
      const skipPackForSportBall = sportBallLesson && (key === 'ball' || key === 'balls');
      const packIsStandIn =
        typeof VI.isStandInPack === 'function' ? VI.isStandInPack(word) : false;

      // Tier 1 — curated VocabIcons pack PNG (exact/plural dedicated rows win;
      // stand-ins may yield to a tighter prop below).
      // Brief-preferred form first (comb→honeycomb) so hair-comb art never wins
      // a beekeeping board.
      let packPath = null;
      const packLookupWord = (brief && briefPreferredWord(word, brief)) || word;
      if (!senseBlocked && !skipPackForSportBall) {
        packPath = typeof VI.pathForSync === 'function' ? VI.pathForSync(packLookupWord) : null;
        if (!packPath && packLookupWord !== word) {
          packPath = typeof VI.pathForSync === 'function' ? VI.pathForSync(word) : null;
        }
        if (packPath && !independent && usedSrc.has(packPath)) packPath = null;
        if (packPath && artKeyBlockedByBrief(brief, word, packPath)) packPath = null;
      }

      // Tier 2 — PropBank identity resolve + headNounOk (defense-in-depth).
      // Match picture bin uses the same sharp + decorative rules as roleplay
      // docks (MIN_DOCK_SRC / isDockSharp; decorativePacksFor). Soft blob
      // splices (e.g. gashapon-robot ~71px) must not ship enlarged on New Words.
      // Always resolve when the bank is warm so stand-in packs can yield to a
      // sharper cutout, and so no-pack words fill from 09_props aggressively.
      // When brief prefers a longer form (honeycomb), resolve THAT word — never
      // bath-comb for a beekeeping "comb" stem.
      const propWord = packLookupWord;
      let prop = null;
      let propOk = false;
      if (!senseBlocked && PB && typeof PB.loaded === 'function' && PB.loaded()) {
        const decoOK =
          typeof PB.decorativePacksFor === 'function'
            ? PB.decorativePacksFor(lesson)
            : new Set();
        const propOkForMatch = (p) => {
          if (!p || !p.path || !headNounOk(propWord, p)) return false;
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
        if (skipPackForSportBall && sportBallPin) {
          // Pin the sport named by the lesson. Explicit pins skip headNounOk —
          // sport-soccer does not end in "-ball" (sport-basketball does, and
          // wrongly stole generic sports "ball" via endsWith('-ball')).
          const pinCandidates = [sportBallPin];
          if (sportBallPin === 'sport-soccer') {
            pinCandidates.push('soccer-ball', 'life-soccer-ball', 'sports-soccer-ball');
          } else if (sportBallPin === 'sport-basketball') {
            pinCandidates.push('basketball', 'sports-basketball');
          } else if (sportBallPin === 'sport-tennis-ball') {
            pinCandidates.push('sports-tennis-ball');
          } else if (sportBallPin === 'sport-baseball') {
            pinCandidates.push('sports-baseball');
          }
          const pinExclude = excludeNow.concat(['soccer-ball-orange']);
          const pinOk = (p) => {
            if (!p || !p.path) return false;
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
          prop = null;
          for (const pin of pinCandidates) {
            const cand = typeof PB.get === 'function' ? PB.get(pin) : null;
            if (cand && family && cand.family && cand.family !== family) continue;
            if (pinOk(cand)) {
              prop = cand;
              break;
            }
          }
          if (!pinOk(prop)) {
            prop = PB.resolve({
              word: sportBallPin,
              family,
              seed,
              exclude: pinExclude,
              minScore,
              allowUnthemedIdentity: true,
              preferredPacks,
            });
          }
          if (!propOkForMatch(prop) && !pinOk(prop)) {
            prop = PB.resolve({
              word,
              family,
              seed,
              exclude: pinExclude,
              minScore,
              allowUnthemedIdentity: true,
              preferredPacks,
            });
          }
          // Pinned sport balls are allowed even when headNounOk would fail.
          if (pinOk(prop)) {
            propOk = true;
          } else {
            propOk = propOkForMatch(prop);
          }
        } else {
          // A semantically correct first hit can still be too small for the
          // board (for example sports-surfboard at 110px short-side). Retry
          // identity peers before declaring the word unpictured.
          const rejectedKeys = [];
          for (let attempt = 0; attempt < 4; attempt++) {
            prop = PB.resolve({
              word: propWord,
              family,
              seed,
              exclude: excludeNow.concat(rejectedKeys),
              minScore,
              allowUnthemedIdentity: true,
              preferredPacks,
            });
            propOk = propOkForMatch(prop);
            if (propOk || !prop || !prop.key) break;
            rejectedKeys.push(prop.key);
          }
          // Fallback to original word only when preferred form found nothing
          if (!propOk && propWord !== word) {
            prop = PB.resolve({
              word,
              family,
              seed,
              exclude: excludeNow,
              minScore,
              allowUnthemedIdentity: true,
              preferredPacks,
            });
            propOk = propOkForMatch(prop);
          }
        }
        if (propOk && prop && artKeyBlockedByBrief(brief, word, prop.key || prop.path)) {
          prop = null;
          propOk = false;
        }
        // Identity match art: if the lesson family (e.g. glossy from a stray
        // "trip" title token) empties the pool, retry matte house cutouts so
        // New Words / oddOneOut still get pictured pads. Dressing stays family-locked.
        if (
          !propOk
          && family
          && PB.HOUSE_FAMILY
          && family !== PB.HOUSE_FAMILY
        ) {
          const houseProp = PB.resolve({
            word,
            family: PB.HOUSE_FAMILY,
            seed,
            exclude: excludeNow,
            minScore,
            allowUnthemedIdentity: true,
            preferredPacks,
          });
          if (propOkForMatch(houseProp)) {
            prop = houseProp;
            propOk = true;
          }
        }
      }

      // Prefer keyed PropBank alpha over 07_vocab-pack when the prop clears
      // dock-sharp — except exact/plural pack rows beat loose alias props
      // (brush→tool-paintbrush must not steal toothbrush pack on dental).
      let preferProp = false;
      if (propOk) {
        if (!packPath) {
          preferProp = true;
        } else if (packIsStandIn) {
          // Stand-in pack (gym→basketball) yields only to a tight identity prop.
          preferProp = identityTight(word, prop);
        } else {
          // Dedicated pack art wins unless prop is an exact identity match.
          preferProp = identityTight(word, prop);
        }
      }

      if (preferProp) {
        tier = 'prop';
        artSrc = prop.path;
        propKey = prop.key;
      }

      // Board bake: curated glyph, never white-plate pack.
      // Adapt coverage (allowPackFallback): pack before glyph so "pictured"
      // still ranks overflow words that only have pack art.
      if (opts.allowPackFallback) {
        if (tier === 'none' && packPath) {
          tier = 'pack';
          artSrc = packPath;
        }
      }
      if (tier === 'none' && typeof VI.curatedGlyph === 'function') {
        let g = null;
        // Sense-blocked words must not fall through to a curated glyph that
        // still shows the wrong sense (Sports "game" → 🎮 controller).
        if (senseBlocked) {
          if ((key === 'game' || key === 'games') && sportBallLesson) {
            // Not 🏅 — that twins sport-gold-medal used for "score".
            g = '🎯';
          }
        } else {
          g = VI.curatedGlyph(word);
        }
        if (g && g !== '•' && (independent || !usedGlyph.has(g))) {
          tier = 'glyph';
          glyph = g;
        }
      }
      if (opts.allowPackFallback && tier === 'none' && packPath) {
        tier = 'pack';
        artSrc = packPath;
      }

      if (!independent) {
        if (tier === 'pack' || tier === 'prop') {
          usedSrc.add(artSrc);
          if (propKey) exclude.push(propKey);
        } else if (tier === 'glyph') {
          usedGlyph.add(glyph);
        }
      }

      const noneReason = senseBlocked && tier === 'none'
        ? 'sense-mismatch'
        : (tier === 'none' ? 'resolver-returned-null' : undefined);
      if (tier === 'none') {
        console.warn(
          '[VocabArt] no image for vocab word:',
          word,
          '| slug:',
          key,
          '| reason:',
          noneReason || 'none',
          '| packPath:',
          packPath || 'null',
          '| senseBlocked:',
          !!senseBlocked
        );
      }
      rows.push({
        word,
        tier,
        artSrc,
        glyph,
        propKey,
        matchable: tier !== 'none',
        reason: noneReason,
      });
    }

    // Match dock honesty: never ship two pads that look like the same picture
    // (ball + basketball → two basketballs; apple + fruit → same pack PNG).
    demoteVisualTwinMatchables(rows);

    const matchable = rows.filter((r) => r.matchable);
    const dropped = rows.filter((r) => !r.matchable);
    return { rows, matchable, dropped };
  }

  /**
   * Fingerprint so matchDock / readiness never count twin art as two pads.
   * Keep first matchable row per key; later twins stay on the board as
   * non-matchable labels (still teachable, not a second identical drag).
   */
  function visualTwinKey(row) {
    const w = String((row && row.word) || '').trim().toLowerCase();
    // Word sense: only pure ball nouns — not hoop / court / player.
    if (w === 'ball' || w === 'basketball' || w === 'football'
      || w === 'soccer ball' || w === 'soccer-ball' || w === 'tennis ball' || w === 'tennis-ball') {
      return 'ball-family';
    }
    const art = String((row && (row.artSrc || row.propKey || '')) || '')
      .toLowerCase()
      .split(/[/\\]/)
      .pop()
      .replace(/\.(png|jpe?g|webp|gif)$/, '')
      .replace(/^sport-/, '');
    // Exact ball art only — never substring-match basketball-hoop / ball-bag.
    if (art === 'ball' || art === 'basketball' || art === 'football'
      || art === 'soccer-ball' || art === 'soccerball' || art === 'tennis-ball') {
      return 'ball-family';
    }
    return art || w || 'unknown';
  }

  function demoteVisualTwinMatchables(rows) {
    const seen = new Set();
    (rows || []).forEach((row) => {
      if (!row || !row.matchable) return;
      const key = visualTwinKey(row);
      if (!key || key === 'unknown') return;
      if (seen.has(key)) {
        row.matchable = false;
        row.twinOf = key;
        row.reason = (row.reason ? row.reason + ';' : '') + 'visual-twin';
        return;
      }
      seen.add(key);
    });
  }

  window.VocabArt = {
    MAX_BOARD_VOCAB,
    MIN_BOARD_VOCAB,
    planFor,
    adaptBoardVocabulary,
    plannedBoardCount,
    briefPreferredWord,
    coreCompleteTarget,
    remapVocabEntriesToBrief,
    headNounOk,
    identityTight,
    isSportBallLesson,
    sportBallPinKey,
    vocabWords,
    boardVocabulary,
    boardCount,
    slug,
    visualTwinKey,
    demoteVisualTwinMatchables,
  };
})();
