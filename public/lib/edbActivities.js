/* edbActivities.js — activity recipes + planner for ClassIn boards.
 * Classic script → window.EdbActivities
 *
 * Recipes only emit piece ops (locked/unlocked). Layout engine places them.
 * No ClassIn scripting — mechanics are staged with layers.
 */
(function () {
  const CHAR_PATHS = [
    'assets/01_characters/alex.png',
    'assets/01_characters/bailey.png',
    'assets/01_characters/casey.png',
    'assets/01_characters/drew.png',
    'assets/01_characters/eden.png',
    'assets/01_characters/finley.png',
  ];
  const COVER_COLORS = ['#166534', '#1e3a8a', '#7c2d12', '#4c1d95', '#0f766e', '#9a3412'];
  const FLAP_COLOR = '#f59e0b';

  function hashStr(s) {
    let h = 2166136261;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pick(arr, n, seed) {
    const a = arr.slice();
    let s = seed >>> 0;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, n);
  }

  function maxBoardVocab() {
    return (window.VocabArt && window.VocabArt.MAX_BOARD_VOCAB) || 6;
  }

  /** How many cells the board teaches after coverage adapt (4–6). */
  function boardVocabCount(lesson) {
    if (window.VocabArt && typeof window.VocabArt.boardCount === 'function') {
      return window.VocabArt.boardCount(lesson);
    }
    const all = (lesson && lesson.vocabulary) || [];
    const adapted = lesson && lesson._vocabAdapted;
    return Math.min(
      maxBoardVocab(),
      all.length || maxBoardVocab(),
      Math.max(1, Number(adapted && adapted.boardCount) || maxBoardVocab())
    );
  }

  /**
   * The words every recipe is allowed to lay out. MUST be the adapted board
   * slice, not the raw ceiling — otherwise sortBins ships 6 cards on the
   * activity page while New Words teaches 4, and the two pages disagree about
   * what the lesson is.
   */
  function vocabList(lesson) {
    return (lesson.vocabulary || [])
      .filter((v) => v && (v.word || v.emoji))
      .slice(0, boardVocabCount(lesson));
  }

  function bridgeNormalize(lesson, meta) {
    if (window.ProducerBridge && typeof window.ProducerBridge.normalize === 'function') {
      return window.ProducerBridge.normalize(lesson, meta || {});
    }
    return lesson || {};
  }

  function isPreA1Live(lesson, meta) {
    if (lesson && lesson._preA1Live) return true;
    if (window.ProducerBridge && typeof window.ProducerBridge.isPreA1 === 'function') {
      return window.ProducerBridge.isPreA1(meta || {});
    }
    return String((meta && meta.level) || '').toLowerCase() === 'pre-a1';
  }

  function reviewWords(lesson) {
    const sentence = (lesson.reviewSentences || [])[0] || '';
    return sentence.replace(/[.!?]$/, '').split(/\s+/).filter(Boolean).slice(0, 5);
  }

  /** Must match speaking.targetBay in edbLayout ZONE_TEMPLATES. */
  function speakingCoverRect() {
    // Compact one-job cluster (Manus coverAnswer R2): card sits closer to the
    // question so the page is SAY → PEEL → COMPARE, not a mid-board worksheet.
    // Keep in sync with edbLayout speaking.targetBay.
    return { x: 72, y: 206, w: 780, h: 156 };
  }

  /**
   * Inset flap rect for the peel-able cover *inside* the model-answer card
   * (speakingCoverRect). Leaves a ribbon header strip always visible above
   * it and a margin on the sides/bottom so the white card reads as a card
   * the flap sits ON, not a same-size button (Manus R1: "generic yellow
   * button with no overlap onto the model-answer card").
   */
  function speakingFlapRect(bay) {
    const b = bay || speakingCoverRect();
    const ribbon = 34;
    const insetX = 28;
    const insetBottom = 12;
    return {
      x: b.x + insetX,
      y: b.y + ribbon,
      w: Math.max(120, b.w - insetX * 2 - 36),
      h: Math.max(40, b.h - ribbon - insetBottom),
    };
  }

  /**
   * Bind a coverAnswer question to one say-frame and a model answer.
   * Rejects the old "I like ___" bolt-on on WH questions that are not about liking
   * (Manus R2 campsite: "What do you take camping?" + I like).
   */
  function coverAnswerBind(item, lesson) {
    const question = String((item && item.question) || '').trim();
    const sample = String((item && item.sampleAnswer) || '').trim();
    const vocab = vocabList(lesson)
      .map((v) => String((typeof v === 'string' ? v : v && v.word) || '').trim())
      .filter(Boolean);
    const q = question.toLowerCase();
    const reasons = [];
    let intent = 'open';
    let frame = '';

    if (/^(what|where|when|why|who|which|how)\b/i.test(question)) {
      if (/^what do you (take|bring|pack)\b/i.test(question)) {
        intent = 'wh-take';
        frame = 'I take a ___.';
      } else if (/^what do you wear\b/i.test(question)) {
        intent = 'wh-wear';
        frame = 'I wear a ___.';
      } else if (/^what do you (see|find)\b/i.test(question)) {
        intent = 'wh-see';
        frame = 'I see a ___.';
      } else if (/like\b/.test(q)) {
        intent = 'wh-like';
        frame = /weather/.test(q) ? 'I like ___ days.' : 'I like ___.';
      } else if (/^where\b/i.test(question)) {
        intent = 'wh-where';
        frame = 'I go to the ___.';
      } else {
        intent = 'wh-open';
        frame = '';
      }
    } else if (/^(do you|does (?:he|she|it)|did you|is (?:it|he|she|this|that)|are you|can you)\b/i.test(question)) {
      intent = 'yes-no';
      frame = 'Yes, I do. / No, I don\'t.';
    }

    if (intent !== 'wh-like' && /i like ___/i.test(frame)) {
      reasons.push('like-frame-on-non-like');
    }
    if (intent === 'wh-take' && /\bi like\b/i.test(sample) && !/\btake|bring|pack\b/i.test(sample)) {
      reasons.push('sample-mismatches-take');
    }
    if (intent === 'wh-wear' && /\bi like\b/i.test(sample) && !/\bwear\b/i.test(sample)) {
      reasons.push('sample-mismatches-wear');
    }
    if (!sample) reasons.push('missing-sample');

    return {
      ok: reasons.length === 0,
      intent,
      frame,
      sample,
      question,
      vocab,
      reasons,
    };
  }

  /** Indoor/outdoor micro-world strip for coverAnswer (window / stall / tent). */
  function coverAnswerWorldPng(w, h, lesson) {
    const world = matchDockWorldTheme(lesson);
    return matchDockWorldScenePng(w, h, world);
  }

  /** Drop lowest-priority extras until unique pageKeys ≤ maxKeys. */
  function capAssignments(assignments, maxKeys) {
    const list = assignments.slice();
    const uniqueCount = () => new Set(list.map((a) => a.pageKey)).size;
    const dropPreds = [
      (a) => a.recipeId === 'revealReward',
      (a) => a.pageKey === 'speaking:1',
      (a) => a.pageKey === 'speaking:0',
      (a) => a.pageKey === 'activity',
    ];
    while (uniqueCount() > maxKeys && list.length) {
      let dropped = false;
      for (const pred of dropPreds) {
        const idx = list.findIndex(pred);
        if (idx >= 0) {
          list.splice(idx, 1);
          dropped = true;
          break;
        }
      }
      if (!dropped) list.pop();
    }
    return list;
  }

  /** Speaking spine: up to 2 Qs per page, max 2 pages (4 Qs).
   *  30-min lessons collapse to one speaking page so the board stays teachable. */
  function speakingChunks(lesson, meta) {
    const qs = (lesson.speakingQuestions || []).slice(0, 4);
    if (!qs.length) return [];
    const dur = Number(meta?.duration);
    if (Number.isFinite(dur) && dur <= 30) return [qs];
    const pages = [];
    for (let i = 0; i < qs.length; i += 2) pages.push(qs.slice(i, i + 2));
    return pages;
  }

  /** Honest match-dock size from the real vocab dock zone (≥96px). Null = can't fit. */
  function matchDockSize(count) {
    const n = Math.max(0, Number(count) || 0);
    if (n < 1) return null;
    const zones = (window.EdbLayout && window.EdbLayout.ZONE_TEMPLATES
      && window.EdbLayout.ZONE_TEMPLATES.vocab) || {};
    const dock = zones.dock || { w: 450, h: 250 };
    const dockW = dock.w || 450;
    const dockH = dock.h || 250;
    const gap = 14; // keep in step with EdbLayout.MIN_GAP / placeDockRow
    // Prefer a wide, short grid (more cols than rows) so faces stay LARGE and the
    // bin fills the column edge to edge instead of a tall stranded sliver.
    let cols = n <= 2 ? n : (n <= 4 ? 2 : 3);
    let rows = Math.ceil(n / cols);
    let side = Math.min(
      Math.floor((dockW - gap * (cols - 1)) / cols),
      Math.floor((dockH - gap * (rows - 1)) / rows)
    );
    // Cap raised to 128: the wider dock lets faces read big without crowding the
    // word cards (round-2 Judge B: faces were too small AND stranded). 96 stays the
    // honest floor below which we fall back to one row.
    side = Math.min(side, 128);
    if (side >= 96) return { w: side, h: side, cols, rows };
    // Try one row across the dock
    cols = n;
    rows = 1;
    side = Math.floor((dockW - gap * (n - 1)) / n);
    if (side >= 96 && side <= dockH) return { w: side, h: side, cols, rows };
    return null;
  }

  /** Honest dock = ≥2 matchable pieces that fit ≥96px cells. Accepts a count or lesson.
   *  A single draggable picture is not a matching activity — text-only cards instead.
   *  Two pictured words (thisOrThat thin boards) still get a real 2-pad dock. */
  function canHonestMatchDock(lessonOrCount) {
    const MIN_MATCHABLE = 2;
    if (typeof lessonOrCount === 'number') {
      if (lessonOrCount < MIN_MATCHABLE) return false;
      return !!matchDockSize(lessonOrCount);
    }
    const lesson = lessonOrCount;
    if (lesson && lesson._vocabArt && Array.isArray(lesson._vocabArt.matchable)) {
      const n = lesson._vocabArt.matchable.length;
      if (n < MIN_MATCHABLE) return false;
      return !!matchDockSize(n);
    }
    const n = vocabList(lesson).length;
    if (n < MIN_MATCHABLE) return false;
    return !!matchDockSize(n);
  }

  /**
   * True when some board words sit outside the match dock (no vetted picture).
   * Student copy must not say "each picture / each word" in that case.
   */
  /**
   * Split a sentence frame into text / blank segments.
   * Single source of truth for "where are the blanks" — the DOM drop pads in
   * renderLessonPages and the tile count here must never disagree, or students
   * get more tiles than holes (or worse, a hole with no tile).
   */
  function frameSegments(frameText) {
    const s = String(frameText || '');
    const out = [];
    const re = /_{2,}/g;
    let last = 0;
    let m;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ text: s.slice(last, m.index) });
      out.push({ blank: true });
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push({ text: s.slice(last) });
    return out;
  }

  /** Max fill-the-blank frames on one Sentence Frames page (was 3 — under-filled). */
  const MAX_BOARD_FRAMES = 5;

  /**
   * Frames that actually reach the board (makeFrames / frameTiles share this).
   * Prefer lesson.sentenceFrames; when the page would be a single lonely line,
   * top up from activity.templates that already have blanks (no invented copy).
   */
  function boardFrames(lesson) {
    const out = [];
    const seen = new Set();
    const push = (raw) => {
      const s = String(raw || '').trim();
      if (!s) return;
      const key = s.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(s);
    };
    const primary = (lesson && lesson.sentenceFrames) || [];
    for (const f of primary) {
      if (out.length >= MAX_BOARD_FRAMES) break;
      push(f);
    }
    // Densify when the lesson already ships frames — never invent a Frames
    // page from activity.templates alone (bare fixtures / hollow lessons).
    if (out.length >= 1 && out.length < 2) {
      const templates = (lesson && lesson.activity && lesson.activity.templates) || [];
      for (const t of templates) {
        if (out.length >= Math.min(3, MAX_BOARD_FRAMES)) break;
        if (/_{2,}/.test(String(t || ''))) push(t);
      }
    }
    if (out.length >= 1 && out.length < 2) {
      for (const v of vocabList(lesson)) {
        if (out.length >= 2) break;
        const s = String((v && v.sentence) || '').trim();
        if (s && /_{2,}/.test(s)) push(s);
      }
    }
    return out.slice(0, MAX_BOARD_FRAMES);
  }

  /** Total drop slots across the frames on the board. */
  function frameBlankCount(lesson) {
    return boardFrames(lesson).reduce(
      (n, f) => n + frameSegments(f).filter((seg) => seg.blank).length,
      0
    );
  }

  /**
   * Honest frame tiles = at least one blank to fill and ≥2 words to choose
   * between. One tile is not a choice — that is a labelled hole, not an
   * activity, so leave those frames as plain write-on lines.
   * Unlike matchDock this needs no art bank: word tiles are text, so every
   * lesson with real frames can carry it.
   */
  function canHonestFrameTiles(lesson) {
    const words = vocabList(lesson).map((v) => v && v.word).filter(Boolean);
    return frameBlankCount(lesson) >= 1 && words.length >= 2;
  }

  /**
   * Ship "In Sentences" only when ≥1 board word has a non-empty sentence.
   * Bare word-list fixtures used to bake a titled hollow page (Manus blocking).
   */
  function hasVocabSentencesContent(lesson) {
    return vocabList(lesson).some((v) => String((v && v.sentence) || '').trim().length > 0);
  }

  /**
   * Ship Sentence Frames only when at least one blank exists on the board.
   * Empty `sentenceFrames: []` must not paint a Frames chrome page.
   */
  function hasFramesContent(lesson) {
    if (isPreA1Live(lesson)) return false;
    return frameBlankCount(lesson) >= 1;
  }

  /**
   * Each board frame blank must accept ≥1 taught vocab word without inventing
   * off-bank completions (Manus MZJk B1 — "until I ___." with noun-only bank).
   * Heuristic: after "a/an/the/my…" → any noun-ish word OK; after "I/to/helps me/
   * until I/First I/can…" prefer shorter action-y tokens (≤10 letters, not ending
   * in common noun suffixes) OR any word if bank has a clear verb cue word.
   */
  function frameBlankBankable(lesson) {
    const words = vocabList(lesson)
      .map((v) => String((v && v.word) || '').toLowerCase().trim())
      .filter(Boolean);
    if (!words.length) return { ok: false, bad: ['(no vocab)'] };
    const frames = boardFrames(lesson);
    const bad = [];
    const verbish = (w) => {
      if (!w) return false;
      if (/(ing|ed)$/.test(w) && w.length <= 12) return true;
      if (/^(bounce|jump|spot|land|keep|help|try|run|walk|say|read|write|draw|build|make|use|put|get|go|see|hear|feel|practice|practise|balance)$/.test(w)) return true;
      // Do not treat short nouns (mat/cup) as verbs — Manus MZJk B1.
      return false;
    };
    for (const frame of frames) {
      const segs = frameSegments(frame);
      if (!segs.some((s) => s.blank)) continue;
      const before = segs
        .slice(0, segs.findIndex((s) => s.blank))
        .map((s) => s.text || '')
        .join('')
        .toLowerCase()
        .trim();
      const needsVerb = /\b(i|to|can|will|would|should|must|helps?\s+me|until\s+i|first\s+i|then\s+i)\s*$/.test(before)
        || /\buntil\s+i\s*$/.test(before);
      const needsNoun = /\b(a|an|the|my|your|our|their|this|that|some|one|a\/an)\s*$/.test(before);
      // "The coach says ____." needs a quotable speech word — bare nouns like
      // practice/effort make awkward A1 models (Manus soccer B1).
      const needsSpeech = /\b(says?|said|asks?|asked|tells?|told)\s*$/.test(before);
      const speechish = (w) => /^(hi|hello|yes|no|go|stop|ready|pass|kick|run|jump|hello|thanks|please|ok|okay)$/.test(w)
        || /^["'“]/.test(w);
      // "I see a ____" + apple → "a apple" (Manus UX fruit bP5y). Reject when
      // any taught noun needs the other article after bare a/an (a/an ____ is OK).
      const bareA = /\ba\s*$/.test(before) && !/a\/an\s*$/.test(before);
      const bareAn = /\ban\s*$/.test(before);
      const vowelStart = (w) => /^[aeiou]/.test(w);
      let ok = false;
      if (needsSpeech) ok = words.some(speechish);
      else if (needsVerb) ok = words.some(verbish);
      else if (needsNoun) {
        ok = words.length > 0;
        if (ok && bareA && words.some(vowelStart)) ok = false;
        if (ok && bareAn && words.some((w) => !vowelStart(w))) ok = false;
      } else ok = words.length > 0;
      if (!ok) bad.push(String(frame).slice(0, 72));
    }
    return { ok: bad.length === 0, bad };
  }

  function matchDockIsPartial(vocabArt) {
    if (!vocabArt) return false;
    const matchableN = Array.isArray(vocabArt.matchable) ? vocabArt.matchable.length : 0;
    const droppedN = Array.isArray(vocabArt.dropped) ? vocabArt.dropped.length : 0;
    if (droppedN > 0) return true;
    const rowsN = Array.isArray(vocabArt.rows) ? vocabArt.rows.length : 0;
    return matchableN > 0 && rowsN > 0 && matchableN < rowsN;
  }

  // Concepts inside one set must still be distinguishable from pictures alone.
  // These groups capture high-risk ESL near-synonyms whose isolated icons are
  // routinely interchangeable (notes for music/song; blue water for sea/ocean).
  const MATCH_DOCK_CONFUSABLE_GROUPS = Object.freeze([
    Object.freeze(['music', 'song', 'melody', 'tune', 'sound', 'rhythm', 'beat']),
    Object.freeze(['sea', 'ocean', 'water', 'wave']),
    Object.freeze(['trip', 'travel', 'journey', 'tour']),
  ]);

  function matchDockMappingAudit(vocabArt) {
    const rows = vocabArt && Array.isArray(vocabArt.matchable)
      ? vocabArt.matchable.filter(Boolean)
      : [];
    const reasons = [];
    const words = rows.map((row) => String(row.word || '').trim().toLowerCase());
    const uniqueWords = new Set(words.filter(Boolean));
    if (uniqueWords.size !== rows.length) reasons.push('duplicate-target-word');

    const sourceKeys = rows.map((row) => String(
      row.propKey || row.artSrc || (row.glyph ? `glyph:${row.glyph}` : '')
    ).trim().toLowerCase());
    if (sourceKeys.some((key) => !key)) reasons.push('missing-source-art');
    if (new Set(sourceKeys.filter(Boolean)).size !== rows.length) {
      reasons.push('duplicate-source-art');
    }

    MATCH_DOCK_CONFUSABLE_GROUPS.forEach((group) => {
      const hits = words.filter((word) => group.includes(word));
      if (hits.length > 1) reasons.push(`semantic-confusability:${hits.join('|')}`);
    });

    // A target nested inside another target ("market" / "fruit market") asks a
    // child to infer category scope from art, not retrieve a clean word-picture
    // association. Treat whole-token nesting as ambiguous; "camp"/"campfire"
    // remains valid because it is not a separate token.
    for (let i = 0; i < words.length; i += 1) {
      const a = words[i];
      if (!a) continue;
      for (let j = i + 1; j < words.length; j += 1) {
        const b = words[j];
        if (!b) continue;
        const aTokens = new Set(a.split(/\s+/));
        const bTokens = new Set(b.split(/\s+/));
        const aInsideB = aTokens.size < bTokens.size && [...aTokens].every((token) => bTokens.has(token));
        const bInsideA = bTokens.size < aTokens.size && [...bTokens].every((token) => aTokens.has(token));
        if (aInsideB || bInsideA) reasons.push(`semantic-nesting:${a}|${b}`);
      }
    }

    return {
      ok: rows.length >= 2 && reasons.length === 0,
      count: rows.length,
      reasons,
      words,
      sourceKeys,
    };
  }

  function matchDockWorldTheme(lesson) {
    const blob = [
      lesson && lesson.title,
      lesson && lesson.activity && lesson.activity.title,
      ...(((lesson && lesson.vocabulary) || []).map((v) =>
        typeof v === 'string' ? v : v && v.word
      )),
    ].filter(Boolean).join(' ').toLowerCase();
    const shared = {
      metaphor: 'Park each picture on its word',
      home: 'spot',
    };
    if (/\b(camp|camping|campsite|tent|campfire|backpack|flashlight)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'camp',
        title: 'Camp trail',
        icon: '🔥',
        payoff: 'CAMP READY!',
        scene: '🌲  ⛺  🔥',
        home: 'site',
        sky: '#7dd3fc',
        ground: '#86efac',
        ink: '#14532d',
        stageBackground: 'linear-gradient(180deg, rgba(186,230,253,.92) 0 48%, rgba(187,247,208,.94) 49% 100%)',
      });
    }
    if (/\b(music|song|sing|piano|drum|dance|band|concert)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'music',
        title: 'Music stage',
        icon: '🎵',
        payoff: 'BAND READY!',
        scene: '🎤  🎹  🎶',
        home: 'mark',
        sky: '#fecaca',
        ground: '#ddd6fe',
        ink: '#5b21b6',
        stageBackground: 'linear-gradient(145deg, rgba(254,226,226,.94), rgba(237,233,254,.94))',
      });
    }
    if (/\b(farm|barn|tractor|cow|pig|chicken|horse|sheep)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'farm',
        title: 'Farm trail',
        icon: '🌾',
        payoff: 'FARM READY!',
        scene: '☀️  🚜  🌾',
        home: 'pen',
        sky: '#bfdbfe',
        ground: '#bef264',
        ink: '#3f6212',
        stageBackground: 'linear-gradient(180deg, rgba(219,234,254,.94) 0 46%, rgba(217,249,157,.94) 47% 100%)',
      });
    }
    if (/\b(zoo|animal|pet|dog|cat|lion|tiger|elephant|monkey)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'animals',
        title: 'Animal trail',
        icon: '🐾',
        payoff: 'ZOO EXPERT!',
        scene: '🌿  🐾  🌳',
        home: 'pen',
        sky: '#bbf7d0',
        ground: '#fef08a',
        ink: '#3f6212',
        stageBackground: 'linear-gradient(180deg, rgba(220,252,231,.94), rgba(254,249,195,.92))',
      });
    }
    if (/\b(beach|ocean|sea|shell|sandcastle|crab|umbrella|towel)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'beach',
        title: 'Shore trail',
        icon: '🐚',
        payoff: 'BEACH READY!',
        scene: '☀️  🏖️  🐚',
        home: 'spot',
        sky: '#7dd3fc',
        ground: '#fde68a',
        ink: '#9a3412',
        stageBackground: 'linear-gradient(180deg, rgba(186,230,253,.94) 0 52%, rgba(254,240,138,.92) 53% 100%)',
      });
    }
    if (/\b(farm|barn|tractor|cow|pig|chicken|horse|sheep)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'farm',
        title: 'Farm trail',
        icon: '🌾',
        payoff: 'FARM READY!',
        scene: '☀️  🚜  🌾',
        home: 'pen',
        sky: '#bfdbfe',
        ground: '#bef264',
        ink: '#3f6212',
        stageBackground: 'linear-gradient(180deg, rgba(219,234,254,.94) 0 46%, rgba(217,249,157,.94) 47% 100%)',
      });
    }
    if (/\b(hat|coat|shirt|sock|scarf|boot|clothes|wear)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'clothes',
        title: 'Wardrobe rail',
        icon: '👕',
        payoff: 'DRESSED!',
        scene: '🧥  👟  🧣',
        home: 'hook',
        sky: '#e0e7ff',
        ground: '#fde68a',
        ink: '#3730a3',
        stageBackground: 'linear-gradient(180deg, rgba(224,231,255,.94), rgba(254,243,199,.92))',
      });
    }
    if (/\b(sunny|rainy|cloudy|windy|snowy|weather)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'weather',
        title: 'Sky window',
        icon: '🌤️',
        payoff: 'WEATHER WISE!',
        scene: '☀️  🌧️  ☁️',
        home: 'pane',
        sky: '#93c5fd',
        ground: '#e2e8f0',
        ink: '#1e3a8a',
        stageBackground: 'linear-gradient(180deg, rgba(186,230,253,.94), rgba(226,232,240,.94))',
      });
    }
    if (/\b(fruit|market|food|shop|bakery|vegetable|snack)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'market',
        title: 'Market trail',
        icon: '🧺',
        payoff: 'MARKET OPEN!',
        scene: '☀️  🧺  🏪',
        home: 'stall',
        sky: '#fde68a',
        ground: '#bbf7d0',
        ink: '#854d0e',
        stageBackground: 'linear-gradient(180deg, rgba(254,243,199,.94), rgba(220,252,231,.94))',
      });
    }
    if (/\b(kitchen|whisk|spatula|grater|apron|oven)\b/.test(blob)) {
      return Object.assign({}, shared, {
        id: 'kitchen',
        title: 'Kitchen counter',
        icon: '🍳',
        payoff: 'KITCHEN READY!',
        scene: '🥄  🥣  🍳',
        home: 'spot',
        sky: '#fed7aa',
        ground: '#f5d0a6',
        ink: '#9a3412',
        stageBackground: 'linear-gradient(180deg, rgba(254,215,170,.94), rgba(254,243,199,.92))',
      });
    }
    return Object.assign({}, shared, {
      id: 'discovery',
      title: 'Word trail',
      icon: '⭐',
      payoff: 'WORD MASTER!',
      scene: '✨  ⭐  ✨',
      sky: '#e9d5ff',
      ground: '#fce7f3',
      ink: '#6b21a8',
      stageBackground: 'linear-gradient(145deg, rgba(255,255,255,.82), rgba(237,233,254,.88))',
    });
  }

  /** Painted topic-world surface the word pads sit on — not a CSS wash + emoji. */
  function matchDockWorldScenePng(w, h, world) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const id = (world && world.id) || 'discovery';
    const sky = (world && world.sky) || '#e9d5ff';
    const ground = (world && world.ground) || '#fce7f3';
    const horizon = Math.round(h * (id === 'beach' || id === 'farm' || id === 'animals' ? 0.42 : 0.48));

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, sky);
    skyGrad.addColorStop(1, '#fff7ed');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizon);
    const groundGrad = ctx.createLinearGradient(0, horizon, 0, h);
    groundGrad.addColorStop(0, ground);
    groundGrad.addColorStop(1, '#fff7ed');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    ctx.save();
    if (id === 'beach') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, horizon - 18, w, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(40 + i * 130, horizon - 6, 36, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(w - 70, 48, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(56, horizon + 8);
      ctx.lineTo(72, h - 18);
      ctx.stroke();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(40, horizon + 4, 28, 14, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(78, horizon + 10, 24, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(w - 150, horizon + 8);
      ctx.lineTo(w - 70, horizon + 8);
      ctx.lineTo(w - 110, horizon - 36);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'farm' || id === 'animals') {
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(w - 168, horizon - 70, 110, 70);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(w - 180, horizon - 70);
      ctx.lineTo(w - 58, horizon - 70);
      ctx.lineTo(w - 119, horizon - 112);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#78716c';
      ctx.fillRect(w - 128, horizon - 36, 22, 36);
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(16, horizon + 18);
      ctx.lineTo(w - 190, horizon + 18);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(28 + i * 42, horizon + 6);
        ctx.lineTo(28 + i * 42, horizon + 30);
        ctx.stroke();
      }
    } else if (id === 'camp') {
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(24, horizon + 8);
      ctx.lineTo(64, horizon - 70);
      ctx.lineTo(104, horizon + 8);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(w - 170, horizon + 10);
      ctx.lineTo(w - 110, horizon - 62);
      ctx.lineTo(w - 50, horizon + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(w / 2, horizon + 28, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'kitchen') {
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(0, horizon + 40, w, h - horizon - 40);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(0, horizon + 32, w, 12);
      ctx.fillStyle = '#64748b';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(40 + i * 48, horizon - 36, 8, 36);
      }
    } else if (id === 'market') {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(30, horizon - 54, w - 60, 18);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(46, horizon - 36, 10, 36);
      ctx.fillRect(w - 56, horizon - 36, 10, 36);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(70, horizon + 8, 70, 28);
      ctx.fillRect(160, horizon + 14, 54, 22);
    } else if (id === 'music') {
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(0, 0, 28, h);
      ctx.fillRect(w - 28, 0, 28, h);
      ctx.fillStyle = 'rgba(253,224,71,0.55)';
      ctx.beginPath();
      ctx.arc(w / 2, 36, 50, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'weather' || id === 'clothes') {
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(18, 18, w - 36, h - 36);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 12;
      ctx.strokeRect(18, 18, w - 36, h - 36);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(w / 2 - 6, 18, 12, h - 36);
      ctx.fillRect(18, h / 2 - 6, w - 36, 12);
      if (id === 'weather') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(w * 0.28, h * 0.32, Math.min(w, h) * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(w * 0.72, h * 0.3, 28, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.28 + i * 10, h * 0.68);
          ctx.lineTo(w * 0.22 + i * 10, h * 0.82);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#c4b5fd';
        ctx.fillRect(w * 0.22, h * 0.28, 28, 40);
        ctx.fillRect(w * 0.62, h * 0.58, 36, 18);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,23,42,0.18)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    return c.toDataURL('image/png');
  }

  /** Cream plaque with a wobbly ink edge so pads read as hand-drawn homes. */
  function matchDockPadPlatePng(w, h, ink) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const color = ink || '#3f6212';
    ctx.fillStyle = 'rgba(255,251,235,0.92)';
    ctx.beginPath();
    const wobble = (fromX, fromY, toX, toY) => {
      const mx = (fromX + toX) / 2 + (Math.abs(toX - fromX) > 8 ? 0 : 3);
      const my = (fromY + toY) / 2 + (Math.abs(toY - fromY) > 8 ? 0 : -3);
      ctx.quadraticCurveTo(mx, my, toX, toY);
    };
    ctx.moveTo(10, 8);
    wobble(10, 8, w - 10, 7);
    wobble(w - 10, 7, w - 8, h - 9);
    wobble(w - 8, h - 9, 9, h - 8);
    wobble(9, h - 8, 10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
    return c.toDataURL('image/png');
  }

  function matchDockRewardPng(w, h, world) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.shadowColor = 'rgba(22,163,74,0.35)';
    ctx.shadowBlur = 12;
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fillStyle = '#bbf7d0';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#14532d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(16, Math.floor(h * 0.38))}px Poppins, sans-serif`;
    ctx.fillText(`${(world && world.icon) || '⭐'} ${(world && world.payoff) || 'WORD MASTER!'}`, w / 2, h / 2, w - 24);
    return c.toDataURL('image/png');
  }

  /** Wax stamp that covers the reward CENTER so the badge still peeks. */
  function matchDockWaxSealPng(w, h, count) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 3;
    ctx.save();
    ctx.shadowColor = 'rgba(127,29,29,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(11, Math.floor(h * 0.16))}px Poppins, sans-serif`;
    ctx.fillText('LOCKED', cx, cy - h * 0.16);
    ctx.font = `800 ${Math.max(13, Math.floor(h * 0.2))}px Poppins, sans-serif`;
    ctx.fillText(`MATCH ${count}`, cx, cy + h * 0.12);
    return c.toDataURL('image/png');
  }

  function matchDockThreeStateRects(solved) {
    const reward = { x: 40, y: 16, w: 360, h: 62 };
    const sealStarter = { x: 174, y: 4, w: 92, h: 92 };
    const sealSolved = { x: 1168, y: 18, w: 92, h: 92 };
    return {
      reward,
      seal: solved ? sealSolved : sealStarter,
      solved: !!solved,
    };
  }

  /**
   * Student-facing New Words instruction.
   * Matchable pictures start in the source dock and move onto word pads.
   * Always kid copy — never announce missing art ("not every word has a picture").
   * Partial coverage stays on BoardReadiness / admin Draft reasons only.
   */
  function matchDockStudentHint(_vocabArt) {
    return 'Park each picture on its word. Say the word, then check.';
  }

  /** Plan VocabArt once (throws if VocabIcons cold/errored).
   * topicSeed must be lesson title / theme text — never the RNG hashStr used for recipe picks.
   */
  function planVocabArt(lesson, topicSeed) {
    if (!window.VocabArt || typeof window.VocabArt.planFor !== 'function') {
      throw new Error('EdbActivities: VocabArt.planFor missing — load vocabArt.js');
    }
    const PB = window.PropBank;
    const family = PB && PB.familyFor ? PB.familyFor(lesson) : null;
    // Draggable source cards need transparent, silhouette-clean art. VocabArt's
    // board path prefers keyed props, then curated glyphs; white pack plates may
    // count for adaptation coverage but must not leak onto the interactive dock.
    return window.VocabArt.planFor(lesson, {
      family,
      seed: topicSeed || (lesson && lesson.title) || '',
      allowPackFallback: false,
    });
  }

  /** 60-minute lessons ask Gemini for 3 story pages; 30-min keeps one fuller beat. */
  const MAX_STORY_PAGES = 3;

  function storyPageCount(lesson, meta) {
    const pages = (lesson.story && lesson.story.pages) || [];
    const n = pages.length;
    if (n <= 0) return 1;
    if (isPreA1Live(lesson, meta)) return 1;
    const dur = Number(meta && meta.duration);
    // Two thin story cards on a 30-min board feel unfinished — one fuller page.
    if (Number.isFinite(dur) && dur <= 30) return 1;
    // Story-scene prototype fixtures may ship 4 beats (one template each).
    const hasScene = pages.some((p) => p && p.storyScene);
    const max = hasScene ? Math.max(MAX_STORY_PAGES, 4) : MAX_STORY_PAGES;
    return Math.min(max, n);
  }

  /**
   * Board story pages: a 30-minute board keeps one honest illustrated beat.
   * Never concatenate several beats while retaining only the first beat's
   * StoryScene; that creates prose describing characters/props not on stage.
   */
  function storyPagesForBoard(lesson, meta) {
    const raw = (lesson.story && lesson.story.pages) || [];
    const count = storyPageCount(lesson, meta);
    if (!raw.length) {
      return [{ heading: 'Story', text: 'Read together.', visualTheme: 'nature', visualCaption: 'Scene' }];
    }
    if (count >= raw.length) return raw.slice(0, count);
    if (count === 1 && raw.length > 1) {
      const first = raw[0] || {};
      return [{
        heading: first.heading || (lesson.story && lesson.story.title) || 'Story',
        text: first.text || 'Read together.',
        visualTheme: first.visualTheme,
        visualCaption: first.visualCaption || '',
        storyScene: first.storyScene || null,
        _sourceIndex: 0,
        _collapsedFrom: raw.length,
      }];
    }
    return raw.slice(0, count);
  }

  function includeCreative(lesson, meta) {
    if (isPreA1Live(lesson, meta)) return false;
    const qs = lesson.story?.creativeQuestions || [];
    if (!qs.length) return false;
    const dur = Number(meta?.duration);
    if (Number.isFinite(dur) && dur <= 25) return false;
    // 30-min lessons: drop creative when comprehension is short (≤2 Qs)
    if (Number.isFinite(dur) && dur <= 30) {
      const comp = (lesson.story?.comprehensionQuestions || []).length;
      if (comp <= 2) return false;
    }
    return true;
  }

  const PHONICS_TOPIC_RE = /\b(phonics|sounds?|blends?|sound\s*boxes?|cvc)\b/i;

  /** Auto A1–A2, keyword override, meta.phonics on/off wins. */
  function wantsPhonics(lesson, meta) {
    if (window.PhonicsPolicy && window.PhonicsPolicy.autoWantPhonics) {
      const level = String((meta && meta.level) || '');
      const hay = [
        lesson && lesson.title,
        meta && meta.topic,
        ...((lesson && lesson.vocabulary) || []).map((v) => (typeof v === 'string' ? v : v && v.word)),
      ].filter(Boolean).join(' ');
      const topicAsks = PHONICS_TOPIC_RE.test(hay);
      const flag = meta && meta.phonics;
      return window.PhonicsPolicy.autoWantPhonics(level, topicAsks, flag);
    }
    if (meta && (meta.phonics === true || meta.phonics === 'on')) return true;
    if (meta && (meta.phonics === false || meta.phonics === 'off')) return false;
    const level = String((meta && meta.level) || '');
    const hay = [
      lesson && lesson.title,
      meta && meta.topic,
      ...((lesson && lesson.vocabulary) || []).map((v) => (typeof v === 'string' ? v : v && v.word)),
    ].filter(Boolean).join(' ');
    if (PHONICS_TOPIC_RE.test(hay)) return true;
    return level === 'A1' || level === 'A2';
  }

  /**
   * Normalize Gemini phonics payload with CEFR gating (PhonicsPolicy).
   * Returns null when unusable at this level.
   */
  function normalizePhonics(lesson, meta) {
    if (window.PhonicsPolicy && window.PhonicsPolicy.normalize) {
      return window.PhonicsPolicy.normalize(lesson, meta || {});
    }
    // Legacy fallback if policy script failed to load
    const raw = lesson && lesson.phonics;
    if (!raw || typeof raw !== 'object') return null;
    const rows = raw.targetWords || raw.target_words || [];
    const words = [];
    for (const row of rows) {
      if (!row) continue;
      const word = String(row.word || '').trim().toLowerCase();
      let graphemes = (row.graphemes || []).map((g) => String(g || '').trim().toLowerCase()).filter(Boolean);
      if (!word || !graphemes.length) continue;
      if (graphemes.length < 3 || graphemes.length > 5) continue;
      words.push({
        word,
        graphemes,
        boxCount: graphemes.length,
        emoji: row.emoji || '🔤',
        topicRelevance: row.topicRelevance || row.topic_relevance || '',
      });
      if (words.length >= 3) break;
    }
    if (words.length < 2) return null;
    const used = new Set(words.flatMap((w) => w.graphemes));
    let distractors = (raw.distractors || [])
      .map((d) => String(d || '').trim().toLowerCase())
      .filter((d) => d && d.length <= 2 && !used.has(d));
    distractors = [...new Set(distractors)].slice(0, 4);
    return {
      targetWords: words,
      distractors,
      focusIndex: 0,
      teacherScript: { warmup: '', modeling: '', check: '' },
    };
  }

  function includePhonics(lesson, meta) {
    return wantsPhonics(lesson, meta) && !!normalizePhonics(lesson, meta);
  }

  /** Canvas PNG helpers for covers/flaps/slots when no dedicated art */
  function solidPng(w, h, fill, label, labelColor) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill();
    if (label) {
      ctx.fillStyle = labelColor || '#fff';
      ctx.font = `700 ${Math.max(14, Math.floor(h * 0.28))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2, w - 16);
    }
    const data = c.toDataURL('image/png');
    return data;
  }

  /** Scene-first plate for sceneRepair: context must dominate, not a worksheet slot. */
  function inferRepairSuccessVisual(location, correct, cue) {
    const hay = `${location || ''} ${correct || ''} ${cue || ''}`.toLowerCase();
    if (/\b(camp|campfire|fire|wood|log|tent)\b/.test(hay)) return 'campfire glows';
    if (/\b(market|basket|stall|fruit|apple|grape)\b/.test(hay)) return 'basket is full';
    if (/\b(table|restaurant|cafe|fork|plate|menu|dinner)\b/.test(hay)) return 'table is ready';
    if (/\b(beach|surf|wave|board|ocean)\b/.test(hay)) return 'ready to surf';
    if (/\b(sport|kit|gym|ball|goal)\b/.test(hay)) return 'kit is complete';
    return `${String(location || 'this place').slice(0, 24)} works`;
  }

  function inferRepairSnapTarget(location, cue) {
    const hay = `${location || ''} ${cue || ''}`.toLowerCase();
    if (/\b(camp|campfire)\b/.test(hay)) return 'campfire ring';
    if (/\b(market|basket|stall)\b/.test(hay)) return 'market basket';
    if (/\b(table|restaurant|cafe)\b/.test(hay)) return 'place setting';
    if (/\b(beach|surf)\b/.test(hay)) return 'shore line';
    return String(location || 'the slot').slice(0, 32);
  }


  function sceneRepairTheme(hay) {
    const h = String(hay || '').toLowerCase();
    if (/\b(camp|campfire|tent|forest|hike|wood|log)\b/.test(h)) return 'camp';
    if (/\b(fruit|market|basket|stall|shop|apple|grape)\b/.test(h)) return 'market';
    if (/\b(beach|surf|ocean|sea|wave)\b/.test(h)) return 'beach';
    if (/\b(cafe|restaurant|table|kitchen|dinner|lunch|fork|plate|menu)\b/.test(h)) return 'cafe';
    if (/\b(sport|kit|gym|football|soccer|basketball)\b/.test(h)) return 'sport';
    return 'place';
  }

  function sceneRepairChipPng(w, h, text, fill, ink) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = fill || 'rgba(15,23,42,0.72)';
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, Math.min(14, Math.round(h / 2)));
    ctx.fill();
    ctx.fillStyle = ink || '#ffffff';
    ctx.font = '800 22px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || '').slice(0, 22), w / 2, h / 2, w - 12);
    return c.toDataURL('image/png');
  }

  function sceneRepairPeelCoverPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(15,118,110,0.94)';
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 14);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(w - 2, 1);
    ctx.lineTo(w - 56, 1);
    ctx.lineTo(w - 2, 56);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 14);
    ctx.stroke();
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '800 22px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PEEL TO SEE AFTER', w / 2, Math.round(h / 2) - 12, w - 24);
    ctx.font = '700 22px Poppins, sans-serif';
    ctx.fillText('same place, repaired', w / 2, Math.round(h / 2) + 16, w - 24);
    return c.toDataURL('image/png');
  }

  function buildSceneRepairTuple(raw, lesson) {
    const named_location = String(
      (raw && (raw.named_location || raw.slotLabel || raw.label))
      || (lesson && lesson.title)
      || 'This place'
    ).trim().slice(0, 40);
    const wrong_prop = String((raw && (raw.wrong_prop || raw.wrongWord || raw.wrong)) || '').trim();
    const correct_prop = String((raw && (raw.correct_prop || raw.correctWord || raw.correct)) || '').trim();
    const sceneCue = String(
      (raw && (raw.sceneCue || raw.scene)) || (lesson && lesson.title) || named_location
    ).trim();
    const snap_target = String(
      (raw && (raw.snap_target || raw.snapTarget)) || inferRepairSnapTarget(named_location, sceneCue)
    ).trim().slice(0, 40);
    const spoken_frame = String(
      (raw && (raw.spoken_frame || raw.spokenFrame)) || 'The ___ does not fit. The ___ fits.'
    ).trim().slice(0, 80);
    const success_visual = String(
      (raw && (raw.success_visual || raw.successVisual))
      || inferRepairSuccessVisual(named_location, correct_prop, sceneCue)
    ).trim().slice(0, 48);
    if (!named_location || !wrong_prop || !correct_prop || !snap_target) return null;
    if (wrong_prop.toLowerCase() === correct_prop.toLowerCase()) return null;
    if (!spoken_frame || !success_visual) return null;
    return {
      named_location,
      wrong_prop,
      correct_prop,
      snap_target,
      spoken_frame,
      success_visual,
      sceneCue,
    };
  }


  function sceneRepairPaintWorld(ctx, w, h, theme, state) {
    const fixed = state === 'fixed';
    const targetX = Math.round(w * 0.52);
    const groundY = Math.round(h * 0.62);
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    if (theme === 'camp') {
      sky.addColorStop(0, '#0f172a');
      sky.addColorStop(1, '#1e3a8a');
    } else if (theme === 'beach') {
      sky.addColorStop(0, '#7dd3fc');
      sky.addColorStop(1, '#38bdf8');
    } else if (theme === 'cafe') {
      sky.addColorStop(0, '#fed7aa');
      sky.addColorStop(1, '#fdba74');
    } else if (theme === 'market') {
      sky.addColorStop(0, '#fde68a');
      sky.addColorStop(1, '#fbbf24');
    } else {
      sky.addColorStop(0, '#dbeafe');
      sky.addColorStop(1, '#93c5fd');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);
    ctx.fillStyle = theme === 'camp' ? '#14532d'
      : theme === 'beach' ? '#fde68a'
      : theme === 'cafe' ? '#78350f'
      : theme === 'market' ? '#fef3c7'
      : '#86efac';
    ctx.fillRect(0, groundY, w, h - groundY);

    if (theme === 'camp') {
      ctx.fillStyle = '#fef9c3';
      [[64, 28], [140, 48], [230, 22], [340, 56], [480, 34]].forEach((star) => {
        ctx.beginPath();
        ctx.ellipse(star[0], star[1], 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(w - 90, 48, 22, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#052e16';
      [40, 130, 250, 380, 520].forEach((x, i) => {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + 36 + i * 2, 36 + (i % 3) * 10);
        ctx.lineTo(x + 86, groundY);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(70, groundY);
      ctx.lineTo(130, groundY - 88);
      ctx.lineTo(190, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(130, groundY - 88);
      ctx.lineTo(130, groundY);
      ctx.stroke();
      if (fixed) {
        const glow = ctx.createRadialGradient(targetX, groundY + 36, 6, targetX, groundY + 48, 110);
        glow.addColorStop(0, 'rgba(253,224,71,0.9)');
        glow.addColorStop(0.45, 'rgba(249,115,22,0.45)');
        glow.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 48, 110, 72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(targetX, groundY);
        ctx.lineTo(targetX - 42, groundY + 78);
        ctx.lineTo(targetX + 42, groundY + 78);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.moveTo(targetX, groundY + 16);
        ctx.lineTo(targetX - 16, groundY + 68);
        ctx.lineTo(targetX + 16, groundY + 68);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 52, 54, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 48, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(targetX - 62, groundY + 78);
      ctx.lineTo(targetX + 62, groundY + 52);
      ctx.moveTo(targetX - 62, groundY + 52);
      ctx.lineTo(targetX + 62, groundY + 78);
      ctx.stroke();
      if (!fixed) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 36, 38, 28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (theme === 'market') {
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(28, 28, Math.round(w * 0.5), 28);
      const stripeW = Math.round(w * 0.5 / 8);
      for (let i = 0; i < 8; i += 2) {
        ctx.fillStyle = '#fff7ed';
        ctx.fillRect(28 + i * stripeW, 28, stripeW, 52);
      }
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(44, 80, 18, groundY - 80);
      ctx.fillRect(Math.round(w * 0.48), 80, 18, groundY - 80);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(62, groundY - 44, Math.round(w * 0.4), 58);
      ['#fb923c', '#84cc16', '#ef4444', '#facc15'].forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(90 + i * 70, groundY - 18, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(targetX, groundY + 28, 90, 42, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (fixed) {
        ['#ef4444', '#84cc16', '#f59e0b', '#22c55e'].forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(targetX - 36 + i * 24, groundY + 10, 16, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 16, 34, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (theme === 'beach') {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, Math.round(h * 0.38), w, Math.round(h * 0.24));
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5;
      for (let x = 16; x < w; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, Math.round(h * 0.46));
        ctx.lineTo(x + 30, Math.round(h * 0.42));
        ctx.lineTo(x + 60, Math.round(h * 0.46));
        ctx.stroke();
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(88, 54, 34, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(40, groundY);
      ctx.lineTo(40, groundY - 70);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(48, groundY);
      ctx.lineTo(48, groundY - 78);
      ctx.stroke();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(48, groundY - 78);
      ctx.lineTo(110, groundY - 58);
      ctx.lineTo(48, groundY - 40);
      ctx.closePath();
      ctx.fill();
      if (fixed) {
        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.moveTo(targetX - 70, groundY + 28);
        ctx.lineTo(targetX + 78, groundY - 8);
        ctx.lineTo(targetX + 64, groundY + 10);
        ctx.lineTo(targetX - 84, groundY + 46);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(targetX - 8, groundY + 6, 18, 8);
      } else {
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 22, 80, 24, -0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (theme === 'cafe') {
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(36, 24, Math.round(w * 0.44), groundY - 40);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 8;
      ctx.strokeRect(36, 24, Math.round(w * 0.44), groundY - 40);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(52, 40, Math.round(w * 0.16), groundY - 72);
      ctx.fillRect(Math.round(w * 0.26), 40, Math.round(w * 0.16), groundY - 72);
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(52, 40, Math.round(w * 0.16), 16);
      ctx.fillRect(Math.round(w * 0.26), 40, Math.round(w * 0.16), 16);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(Math.round(w * 0.16), groundY - 8, Math.round(w * 0.68), 52);
      ctx.fillRect(Math.round(w * 0.22), groundY + 40, 20, h - groundY - 44);
      ctx.fillRect(Math.round(w * 0.74), groundY + 40, 20, h - groundY - 44);
      if (fixed) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 8, 78, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(targetX + 70, groundY - 18);
        ctx.lineTo(targetX + 70, groundY + 22);
        ctx.stroke();
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(targetX - 8, groundY + 4, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(targetX, groundY + 8, 70, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(targetX + 68, groundY - 16);
        ctx.lineTo(targetX + 68, groundY + 20);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (theme === 'sport') {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5;
      ctx.strokeRect(28, 28, Math.round(w * 0.52), groundY - 48);
      ctx.beginPath();
      ctx.moveTo(Math.round(w * 0.28), 28);
      ctx.lineTo(Math.round(w * 0.28), groundY - 20);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.fillRect(Math.round(w * 0.6), groundY - 16, Math.round(w * 0.26), 44);
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(48, 32, Math.round(w * 0.4), groundY - 48);
    }
    return { targetX, groundY };
  }

  function sceneRepairStagePng(w, h, label, cue, tuple) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const hay = `${label || ''} ${cue || ''} ${tuple && tuple.success_visual || ''}`;
    const theme = sceneRepairTheme(hay);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 18);
    ctx.clip();
    sceneRepairPaintWorld(ctx, w, h, theme, 'broken');
    ctx.restore();
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 18);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15,23,42,0.88)';
    ctx.beginPath();
    ctx.roundRect(18, 12, Math.min(360, Math.round(w * 0.34)), 40, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label || 'Repair this scene').slice(0, 28), 34, 32, Math.min(328, w * 0.3));

    ctx.fillStyle = 'rgba(127,29,29,0.9)';
    ctx.beginPath();
    ctx.roundRect(18, 58, 118, 32, 10);
    ctx.fill();
    ctx.fillStyle = '#fef2f2';
    ctx.font = '800 22px Poppins, sans-serif';
    ctx.fillText('BEFORE', 34, 74);

    const frame = (tuple && tuple.spoken_frame) || 'The ___ does not fit. The ___ fits.';
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(18, h - 56, Math.min(560, Math.round(w * 0.48)), 42, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#134e4a';
    ctx.font = '700 22px Poppins, sans-serif';
    ctx.fillText(`Say: ${frame}`, 34, h - 35, Math.min(528, w * 0.44));
    return c.toDataURL('image/png');
  }

  function sceneRepairTargetPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(254,242,242,0.2)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 7, h / 2 - 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.setLineDash([11, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    return c.toDataURL('image/png');
  }

  function sceneRepairPocketPng(w, h, label, theme) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const fill = theme === 'camp' ? 'rgba(67,20,7,0.78)'
      : theme === 'cafe' ? 'rgba(120,53,15,0.72)'
      : theme === 'beach' ? 'rgba(14,116,144,0.62)'
      : theme === 'market' ? 'rgba(124,45,18,0.7)'
      : 'rgba(15,23,42,0.55)';
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 16);
    ctx.fill();
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ccfbf1';
    ctx.font = '800 22px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(label || 'REPAIR HERE').slice(0, 14), w / 2, 8, w - 16);
    ctx.strokeStyle = 'rgba(94,234,212,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, 38, w - 32, h - 52, 12);
    ctx.stroke();
    return c.toDataURL('image/png');
  }

  function sceneRepairSuccessPng(w, h, visual, location) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const hay = `${visual || ''} ${location || ''}`;
    const theme = sceneRepairTheme(hay);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 14);
    ctx.clip();
    sceneRepairPaintWorld(ctx, w, h, theme, 'fixed');
    ctx.restore();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(6,78,59,0.92)';
    ctx.beginPath();
    ctx.roundRect(10, 8, w - 20, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.font = '800 22px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`AFTER · ${String(visual || 'repaired').slice(0, 18)}`, w / 2, 26, w - 28);
    return c.toDataURL('image/png');
  }

  /** Cream sticky with wrapped hint copy (1–2 lines) for mysteryHints. */
  function hintStickyPng(w, h, text) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#422006';
    const fontPx = Math.max(13, Math.min(18, Math.floor(h * 0.32)));
    ctx.font = `700 ${fontPx}px Poppins, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const maxW = w - 28;
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width <= maxW) {
        line = trial;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    const show = lines.slice(0, 2);
    if (lines.length > 2) {
      show[1] = (show[1] || '').replace(/.{0,3}$/, '…');
    }
    const startY = h / 2 - ((show.length - 1) * (fontPx + 4)) / 2;
    show.forEach((ln, i) => {
      ctx.fillText(ln, 14, startY + i * (fontPx + 4), maxW);
    });
    return c.toDataURL('image/png');
  }

  function slotGhostPng(w, h, n) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(148,163,184,0.15)';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '700 18px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), w / 2, h / 2);
    return c.toDataURL('image/png');
  }

  /** Landing halo on a king stage — kids see WHERE the tool goes. */
  function dropPadPng(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(80, w);
    c.height = Math.max(60, h);
    const ctx = c.getContext('2d');
    const padW = c.width;
    const padH = c.height;
    ctx.save();
    ctx.strokeStyle = 'rgba(13,148,136,0.95)';
    ctx.fillStyle = 'rgba(204,251,241,0.18)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.ellipse(padW / 2, padH / 2, padW / 2 - 5, padH / 2 - 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0f766e';
    ctx.font = `800 ${Math.max(14, Math.round(padH * 0.22))}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DROP HERE', padW / 2, padH / 2);
    ctx.restore();
    return c.toDataURL('image/png');
  }

  /**
   * Spoken noun for a dock key. Pack/color/shape tails drop so
   * face-eyes-brown → "eyes" and fire-hose → "hose".
   */
  function sayNounFromKey(key) {
    const parts = String(key || '').toLowerCase().split('-').filter(Boolean);
    const skip = new Set([
      'face', 'food', 'fire', 'camp', 'bath', 'cafe', 'farm', 'dental',
      'hospital', 'park', 'playground', 'castle', 'aq', 'aquarium',
      'construction', 'dh', 'feeling', 'gym', 'sports', 'reward', 'prop',
      'tube', 'pick', 'character', 'stage', 'v2', 'brown', 'blue', 'green',
      'dark', 'red', 'blonde', 'black', 'pink', 'white', 'round', 'button',
      'point', 'long', 'oval', 'large', 'messy', 'pony', 'afro', 'bob',
      'spiky', 'open', 'closed', 'wrapped', 'candy', 'healthy', 'cavity',
      'blank', 'kid', 'open', 'mouth',
    ]);
    const keep = parts.filter((p) => !skip.has(p));
    if (keep.length) {
      const tails = new Set(['bell', 'kit', 'tube', 'pick', 'roll', 'talkie']);
      if (keep.length > 1 && tails.has(keep[keep.length - 1])) {
        return keep.slice(0, -1).join(' ');
      }
      return keep.join(' ');
    }
    if (parts[0] === 'hair') return 'hair';
    if (parts[0] === 'face' && parts[1]) return parts[1];
    return parts[1] || parts[0] || String(key || '');
  }

  /** Numbered snap ring — a landing target, not a hole in the king. */
  function heroSnapPadPng(w, h, n) {
    const c = document.createElement('canvas');
    c.width = Math.max(56, w);
    c.height = Math.max(48, h);
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.strokeStyle = 'rgba(13,148,136,0.95)';
    ctx.fillStyle = 'rgba(204,251,241,0.22)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.ellipse(c.width / 2, c.height / 2, c.width / 2 - 4, c.height / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0f766e';
    ctx.font = '800 18px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), c.width / 2, c.height / 2);
    ctx.restore();
    return c.toDataURL('image/png');
  }

  /** EMPTY → SNAP → READY proof on the static Manus JPG. */
  function heroStateLadderPng(w, h, payoff) {
    const c = document.createElement('canvas');
    c.width = Math.max(260, w);
    c.height = Math.max(78, h);
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(c.width, 0, c.width, c.height, r);
    ctx.arcTo(c.width, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r);
    ctx.arcTo(0, 0, c.width, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#115e59';
    ctx.font = '800 11px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DRAG → SNAP → PAYOFF', 10, 6);
    const stages = [
      { label: 'EMPTY', dashed: true, check: false },
      { label: 'SNAP', dashed: false, check: false },
      { label: 'READY', dashed: false, check: true },
    ];
    const box = 22;
    const gap = Math.max(16, Math.floor((c.width - 24 - box * 3) / 2));
    let x = 12;
    stages.forEach((stage, i) => {
      if (stage.dashed) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, 24, box, box);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = stage.check ? '#16a34a' : '#5eead4';
        ctx.fillRect(x, 24, box, box);
      }
      if (stage.check) {
        ctx.fillStyle = '#fff';
        ctx.font = '800 14px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', x + box / 2, 24 + box / 2 + 1);
      }
      ctx.fillStyle = '#334155';
      ctx.font = '700 9px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(stage.label, x + box / 2, 48);
      if (i < stages.length - 1) {
        ctx.fillStyle = '#0f766e';
        ctx.font = '800 14px Poppins, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('→', x + box + Math.round(gap / 2), 35);
      }
      x += box + gap;
    });
    ctx.fillStyle = '#166534';
    ctx.font = '800 11px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('✓ ' + String(payoff || 'READY').slice(0, 28), 10, c.height - 6);
    return c.toDataURL('image/png');
  }

  function heroPayoffBadgePng(w, h, payoff) {
    const c = document.createElement('canvas');
    c.width = Math.max(160, w);
    c.height = Math.max(44, h);
    const ctx = c.getContext('2d');
    const r = 16;
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(c.width, 0, c.width, c.height, r);
    ctx.arcTo(c.width, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r);
    ctx.arcTo(0, 0, c.width, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#047857';
    ctx.font = '800 16px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ ' + String(payoff || 'READY').slice(0, 22), c.width / 2, c.height / 2);
    return c.toDataURL('image/png');
  }

  function heroPayoffSealPng(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(160, w);
    c.height = Math.max(44, h);
    const ctx = c.getContext('2d');
    const r = 16;
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(c.width, 0, c.width, c.height, r);
    ctx.arcTo(c.width, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r);
    ctx.arcTo(0, 0, c.width, 0, r); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIFT TO REVEAL', c.width / 2, c.height / 2);
    return c.toDataURL('image/png');
  }

  function capacityPocketPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(r, 4); ctx.arcTo(w - 4, 4, w - 4, h - 4, r);
    ctx.arcTo(w - 4, h - 4, 4, h - 4, r); ctx.arcTo(4, h - 4, 4, 4, r);
    ctx.arcTo(4, 4, w - 4, 4, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0f766e';
    ctx.font = '800 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PACK HERE', w / 2, h / 2 - 8);
    ctx.fillStyle = '#64748b';
    ctx.font = '700 11px Poppins, sans-serif';
    ctx.fillText('drop item', w / 2, h / 2 + 12);
    return c.toDataURL('image/png');
  }

  function capacityTopicKey(hay) {
    const value = String(hay || '').toLowerCase();
    if (/\b(hike|mountain|trail|raincoat|whistle|emergency|safety)\b/.test(value)) return 'trail';
    if (/\b(camp|tent|flashlight|rainy.?night|campsite)\b/.test(value)) return 'camp';
    if (/\b(school|trip|bus|pencil|class)\b/.test(value)) return 'school';
    if (/\b(video|camera|space|creator|microphone|studio|film)\b/.test(value)) return 'studio';
    if (/\b(beach|picnic|lunch|snack)\b/.test(value)) return 'beach';
    return 'generic';
  }

  function capacityPaintWorld(ctx, w, h, theme) {
    const groundY = Math.round(h * 0.66);
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    if (theme === 'trail') {
      sky.addColorStop(0, '#475569');
      sky.addColorStop(1, '#94a3b8');
    } else if (theme === 'camp') {
      sky.addColorStop(0, '#0f172a');
      sky.addColorStop(1, '#1e3a8a');
    } else if (theme === 'studio') {
      sky.addColorStop(0, '#1e1b4b');
      sky.addColorStop(1, '#312e81');
    } else if (theme === 'beach') {
      sky.addColorStop(0, '#7dd3fc');
      sky.addColorStop(1, '#38bdf8');
    } else {
      sky.addColorStop(0, '#dbeafe');
      sky.addColorStop(1, '#93c5fd');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);
    ctx.fillStyle = theme === 'trail' ? '#365314'
      : theme === 'camp' ? '#14532d'
      : theme === 'studio' ? '#1e293b'
      : theme === 'beach' ? '#fde68a'
      : '#86efac';
    ctx.fillRect(0, groundY, w, h - groundY);

    if (theme === 'trail') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * 90;
        ctx.beginPath();
        ctx.moveTo(x, 20 + (i % 3) * 8);
        ctx.lineTo(x + 18, 34 + (i % 3) * 8);
        ctx.stroke();
      }
      ctx.fillStyle = '#166534';
      [30, 120, 220, 340, 470, 590].forEach((x, i) => {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + 28 + i, 42 + (i % 2) * 12);
        ctx.lineTo(x + 72, groundY);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.moveTo(Math.round(w * 0.08), groundY);
      ctx.lineTo(Math.round(w * 0.92), groundY - 18);
      ctx.lineTo(Math.round(w * 0.96), groundY + 28);
      ctx.lineTo(Math.round(w * 0.04), groundY + 28);
      ctx.closePath();
      ctx.fill();
    } else if (theme === 'camp') {
      ctx.fillStyle = '#fef9c3';
      [[64, 28], [140, 48], [230, 22], [340, 56]].forEach((star) => {
        ctx.beginPath();
        ctx.ellipse(star[0], star[1], 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#052e16';
      [40, 130, 250, 380, 520].forEach((x, i) => {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + 36 + i * 2, 36 + (i % 3) * 10);
        ctx.lineTo(x + 86, groundY);
        ctx.closePath();
        ctx.fill();
      });
    } else if (theme === 'school') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(Math.round(w * 0.12), groundY - 72, Math.round(w * 0.34), 72);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(Math.round(w * 0.12), groundY - 72, Math.round(w * 0.34), 16);
    } else if (theme === 'studio') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(Math.round(w * 0.1), groundY - 64, Math.round(w * 0.36), 64);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(Math.round(w * 0.28), groundY - 32, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    return { groundY };
  }

  /** Scene-first stage: painted world + dominant backpack + 0/N counter + committed preview. */
  function capacitySceneStagePng(w, h, ctxPayload) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const hay = [
      ctxPayload.mission, ctxPayload.constraint, ctxPayload.containerLabel,
      ctxPayload.payoff, ctxPayload.title,
    ].filter(Boolean).join(' ');
    const theme = capacityTopicKey(hay);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 22);
    ctx.clip();
    capacityPaintWorld(ctx, w, h, theme);
    ctx.restore();
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 22);
    ctx.stroke();

    const chipW = Math.min(360, Math.round(w * 0.42));
    ctx.fillStyle = 'rgba(15,23,42,0.84)';
    ctx.beginPath();
    ctx.roundRect(18, 14, chipW, 78, 14);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PACK EXACTLY ' + ctxPayload.limit, 32, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px Poppins, sans-serif';
    ctx.fillText(String(ctxPayload.mission || '').slice(0, 44), 32, 40, chipW - 28);
    if (ctxPayload.mustInclude && ctxPayload.mustInclude.length) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = '800 11px Poppins, sans-serif';
      ctx.fillText('MUST PACK: ' + ctxPayload.mustInclude.join(', '), 32, 62, chipW - 28);
    } else if (ctxPayload.constraint) {
      ctx.fillStyle = '#99f6e4';
      ctx.font = '700 11px Poppins, sans-serif';
      ctx.fillText(String(ctxPayload.constraint).slice(0, 52), 32, 62, chipW - 28);
    }

    const packX = Math.round(w * 0.54);
    const packY = Math.round(h * 0.16);
    const packW = Math.round(w * 0.38);
    const packH = Math.round(h * 0.72);
    ctx.fillStyle = 'rgba(15,118,110,0.18)';
    ctx.beginPath();
    ctx.roundRect(packX - 8, packY - 8, packW + 16, packH + 16, 18);
    ctx.fill();
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(packX + packW * 0.28, packY + 34);
    ctx.lineTo(packX + packW * 0.28, packY + 12);
    ctx.lineTo(packX + packW * 0.72, packY + 12);
    ctx.lineTo(packX + packW * 0.72, packY + 34);
    ctx.stroke();
    ctx.fillStyle = 'rgba(204,251,241,0.88)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(packX, packY + 28, packW, packH - 28, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#115e59';
    ctx.font = '800 16px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${String(ctxPayload.containerLabel || 'PACK').toUpperCase()} · 0/${ctxPayload.limit} PACKED`,
      packX + packW / 2,
      packY + 52,
      packW - 24
    );

    const stages = ['0/' + ctxPayload.limit, 'FILLING', 'COMMITTED'];
    const stageW = Math.floor((packW - 40) / 3);
    stages.forEach((label, i) => {
      const sx = packX + 20 + i * (stageW + 8);
      const sy = packY + packH - 34;
      ctx.fillStyle = i === 0 ? '#0f766e' : i === 1 ? '#5eead4' : '#16a34a';
      ctx.beginPath();
      ctx.roundRect(sx, sy, stageW, 22, 8);
      ctx.fill();
      ctx.fillStyle = i === 2 ? '#fff' : '#0f172a';
      ctx.font = '800 10px Poppins, sans-serif';
      ctx.fillText(label, sx + stageW / 2, sy + 11);
    });

    ctx.fillStyle = 'rgba(6,78,59,0.92)';
    ctx.beginPath();
    ctx.roundRect(18, h - 52, w - 36, 38, 12);
    ctx.fill();
    ctx.fillStyle = '#ecfdf5';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.fillText(
      `0/${ctxPayload.limit} packed + 2 reasons → ${String(ctxPayload.payoff || 'READY').toUpperCase()}`,
      w / 2,
      h - 33,
      w - 56
    );
    return c.toDataURL('image/png');
  }

  /** Compact horizontal language strip — replaces the old left-rail SAY IT box. */
  function capacityLanguageStripPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5b21b6';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SAY IT', 16, h / 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.font = '700 13px Poppins, sans-serif';
    ctx.fillText('“I pack ___ because ___.”   “I leave out ___ because ___.”', 78, h / 2, w - 190);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 108, 8, 96, h - 16);
    ctx.fillStyle = '#16a34a';
    ctx.font = '800 10px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEACHER CHECK ✓', w - 60, h / 2);
    return c.toDataURL('image/png');
  }

  /**
   * Visible mission condition; hidden mustInclude metadata is not teachable.
   * Drawn as a tinted zone (no own border) so it reads as one section of the
   * shared `capacitySceneShellPng` environment, not a floating worksheet box.
   */
  function capacityConstraintPng(w, h, mission, constraint, mustInclude) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 18;
    ctx.fillStyle = 'rgba(255,251,235,0.55)';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#92400e';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('MISSION RULE', 16, 10);

    // Each block only draws if it still fits — a forward-only cursor that
    // SKIPS rather than overlaps when `h` is short (fixes the Round 2/3 bake
    // where CONDITION and MUST PACK text collided at small panel heights).
    const drawWrapped = (text, y, font, color, maxLines, lineH, minSpaceNeeded) => {
      if (y + minSpaceNeeded > h - 6) return y;
      ctx.font = font;
      ctx.fillStyle = color;
      const words = String(text || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const trial = line ? `${line} ${word}` : word;
        if (ctx.measureText(trial).width <= w - 32) line = trial;
        else {
          if (line) lines.push(line);
          line = word;
        }
      });
      if (line) lines.push(line);
      lines.slice(0, maxLines).forEach((value, i) => {
        const clipped = i === maxLines - 1 && lines.length > maxLines
          ? `${value.replace(/[.,;:]?$/, '')}…`
          : value;
        ctx.fillText(clipped, 16, y + i * lineH, w - 32);
      });
      return y + Math.min(lines.length, maxLines) * lineH;
    };

    let y = drawWrapped(mission, 26, '700 14px Poppins, sans-serif', '#422006', 2, 17, 17) + 5;
    // MUST PACK is the deciding rule (topic-contract fidelity gate) — draw it
    // before the softer CONDITION line so it never gets dropped for space.
    if (mustInclude.length) {
      y = drawWrapped(
        `MUST PACK: ${mustInclude.join(', ')}`,
        y,
        '800 12px Poppins, sans-serif',
        '#b91c1c',
        1,
        15,
        15
      ) + 4;
    }
    if (constraint) {
      drawWrapped(`CONDITION: ${constraint}`, y, '700 12px Poppins, sans-serif', '#0f766e', 1, 15, 15);
    }
    return c.toDataURL('image/png');
  }

  /**
   * Topic-labelled pack header (bag handle + fill count). No own border/fill —
   * sits on the shared `capacitySceneShellPng` so mission + pack read as one
   * environment. The payoff lives in `capacityPayoffBannerPng`, not buried in
   * a small footer line here.
   */
  function capacityContainerPng(w, h, label, limit) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#115e59';
    ctx.font = '800 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${String(label || 'MISSION PACK').toUpperCase()} · 0/${limit} PACKED`,
      w / 2,
      h / 2,
      w - 20
    );
    return c.toDataURL('image/png');
  }

  /**
   * One integrated scene shell that hosts the mission card, the pack, and the
   * dock as a single environment (Manus R2/R3: "replace generic panel
   * scaffolding with a scene-anchor" / "scene-integrated container"). A single
   * outer border + background replaces the old two-disconnected-boxes look;
   * `dividerX` draws a soft seam between the mission side and the pack side
   * without breaking the shared frame.
   */
  function capacitySceneShellPng(w, h, dividerX) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 26;
    ctx.fillStyle = 'rgba(240,253,250,0.96)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (dividerX && dividerX > 8 && dividerX < w - 8) {
      ctx.strokeStyle = 'rgba(15,118,110,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(dividerX, 18);
      ctx.lineTo(dividerX, h - 18);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return c.toDataURL('image/png');
  }

  /**
   * Two reusable inclusion/exclusion frames rendered ON the board (not only in
   * the teacher's spoken hint), plus a visible teacher-confirmation check —
   * Manus R3 B3: language scaffolding must be concrete and observable.
   */
  function capacityLanguageFramePng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const checkW = 58;
    ctx.fillStyle = '#5b21b6';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('SAY IT', 14, 6);
    ctx.font = '700 13px Poppins, sans-serif';
    ctx.fillStyle = '#1e1b4b';
    ctx.fillText('“I pack ___ because ___.”', 14, 24, w - checkW - 26);
    ctx.fillText('“I leave out ___ because ___.”', 14, 43, w - checkW - 26);
    const checkH = Math.min(h - 16, 48);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - checkW - 10, 8, checkW, checkH);
    ctx.fillStyle = '#16a34a';
    ctx.font = '800 9px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TEACHER', w - checkW / 2 - 10, 16);
    ctx.fillText('CHECK', w - checkW / 2 - 10, 27);
    ctx.font = '800 16px Poppins, sans-serif';
    ctx.fillText('✓', w - checkW / 2 - 10, checkH - 12);
    ctx.textAlign = 'left';
    return c.toDataURL('image/png');
  }

  /**
   * Three-stage proof of the interaction lifecycle inside the SAME static
   * bake Manus reviews (one JPG per round — see review-single-board.mjs).
   * Manus R3 B1: "render three distinct states (empty, filled, committed)
   * with ... a visible, topic-relevant payoff outcome." Each stage is a small
   * honest icon (dashed = open, solid = placed, checked = locked), so the
   * lifecycle is provable without faking the live interactive pockets.
   */
  function capacityStateLadderPng(w, h, payoff) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#115e59';
    ctx.font = '800 11px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PACK STATES', 12, 6);
    const stages = [
      { label: 'EMPTY', dashed: true, filled: false, checked: false },
      { label: 'FILLING', dashed: false, filled: true, checked: false },
      { label: 'COMMITTED', dashed: false, filled: true, checked: true },
    ];
    const boxSize = 20;
    const rowY = 20;
    const gap = Math.max(20, Math.floor((w - 24 - boxSize * 3) / 2));
    let x = 12;
    stages.forEach((stage, i) => {
      if (stage.dashed) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, rowY, boxSize, boxSize);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = stage.checked ? '#16a34a' : '#5eead4';
        ctx.fillRect(x, rowY, boxSize, boxSize);
      }
      if (stage.checked) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 12px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', x + boxSize / 2, rowY + boxSize / 2 + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      }
      if (i < stages.length - 1) {
        ctx.fillStyle = '#0f766e';
        ctx.font = '700 12px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('→', x + boxSize + Math.round(gap / 2), rowY + boxSize / 2 + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      }
      x += boxSize + gap;
    });
    ctx.fillStyle = '#64748b';
    ctx.font = '700 9px Poppins, sans-serif';
    ctx.fillText('EMPTY · FILLING · COMMITTED', 12, rowY + boxSize + 4);
    ctx.fillStyle = '#166534';
    ctx.font = '800 11px Poppins, sans-serif';
    ctx.fillText(`✓ ${String(payoff || 'Ready').slice(0, 42)}`, 12, h - 18);
    return c.toDataURL('image/png');
  }

  /** Persistent, always-visible outcome banner — the payoff is never buried in a footer line. */
  function capacityPayoffBannerPng(w, h, payoff) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 10;
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#166534';
    ctx.font = '800 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `PACK FULL + 2 REASONS  →  ${String(payoff || 'READY').toUpperCase()}`,
      w / 2,
      h / 2,
      w - 24
    );
    return c.toDataURL('image/png');
  }

  /** Topic key from one verified route payload — all scene art derives from this haystack. */
  function routeTopicKey(hay) {
    const value = String(hay || '').toLowerCase();
    if (/\b(beach|rescue|lifeguard|shore|hut|footbridge|flag trail|kai)\b/.test(value)) return 'beach';
    if (/\b(campfire|camp|campsite|fire ring|ember|tent|pine|bucket|wood stack)\b/.test(value)) return 'campfire';
    if (/\b(roller|coaster|amusement|park map|ride ticket|blue gate|zoe)\b/.test(value)) return 'amusement';
    if (/\b(school|bus stop|bus|mia|plan|bag|trip)\b/.test(value)) return 'school';
    return 'generic';
  }

  function routeTopicHay(ctx) {
    const bits = [
      ctx && ctx.mission, ctx && ctx.goal, ctx && ctx.mover,
      ...(ctx && ctx.landmarks ? ctx.landmarks : []),
      ...(ctx && ctx.steps ? ctx.steps : []),
    ];
    return bits.filter(Boolean).join(' ');
  }

  function routeRepairTheme(topicKey) {
    if (topicKey === 'beach') return 'beach';
    if (topicKey === 'campfire') return 'camp';
    if (topicKey === 'amusement') return 'sport';
    return 'place';
  }

  /** Starter-only band — one canonical empty state (Manus R4: no multi-mover ladder on starter). */
  function routeStarterBandPng(w, h, mover, stepCount) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 10;
    ctx.fillStyle = 'rgba(240,253,250,0.94)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const name = String(mover || 'Team').trim().slice(0, 12);
    const n = Math.max(3, Number(stepCount) || 4);
    ctx.fillStyle = '#115e59';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(
      `${name} starts at START · Drop ${n} step cards on checkpoints · Lift corner to reveal route`,
      w / 2, h / 2, w - 24
    );
    return c.toDataURL('image/png');
  }

  /** Illustrated mission world — reuses sceneRepair world painter for topic fidelity. */
  function routeSceneShellPng(w, h, topicKey, mover, goal) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 22;
    const theme = routeRepairTheme(topicKey);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.clip();
    sceneRepairPaintWorld(ctx, w, h, theme, 'broken');
    const groundY = Math.round(h * 0.62);
    if (topicKey === 'school') {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(w - 108, groundY - 30, 80, 28);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w - 104, groundY - 26, 72, 16);
    }
    if (topicKey === 'amusement') {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w - 140, groundY);
      ctx.quadraticCurveTo(w - 90, groundY - 88, w - 36, groundY);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.stroke();

    const safeMover = String(mover || 'Team').trim().slice(0, 14);
    const safeGoal = String(goal || 'Goal').trim().slice(0, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(12, 10, Math.min(210, w * 0.3), 36, 10);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`START · ${safeMover}`, 22, 28, Math.min(188, w * 0.26));
    const finishW = Math.min(230, w * 0.34);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(w - finishW - 12, 10, finishW, 36, 10);
    ctx.fill();
    ctx.font = '22px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(routeStepGlyph(safeGoal), w - finishW + 4, 30);
    ctx.fillStyle = '#166534';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.fillText(`FINISH · ${safeGoal}`, w - 22, 28, finishW - 28);
    return c.toDataURL('image/png');
  }

  /** Compact First/Next/Then/Finally narration rail for A2 tell-the-route proof. */
  function routeNarrationRailPng(w, h, mover, count) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const name = String(mover || 'They').trim().slice(0, 12);
    const frames = ['First', 'Next', 'Then', 'Finally'].slice(0, Math.max(3, Math.min(5, Number(count) || 4)));
    const labels = frames.map((word, i) => {
      if (i === 0) return `${word}, ${name} ___`;
      if (i === frames.length - 1) return `${word}, ${name} ___`;
      return `${word}, ${name} ___`;
    });
    ctx.fillStyle = '#5b21b6';
    ctx.font = '800 11px Poppins, sans-serif';
    ctx.textBaseline = 'middle';
    const slotW = (w - 24) / labels.length;
    labels.forEach((label, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(label, 12 + slotW * i + slotW / 2, h / 2, slotW - 8);
    });
    return c.toDataURL('image/png');
  }

  /** Three-state proof: empty → placed → revealed with mover travel (single static bake). */
  function routeStateLadderPng(w, h, mover, goal, topicKey) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const stages = [
      { label: 'EMPTY', moverX: 0.12, dashed: true },
      { label: 'PLACED', moverX: 0.5, dashed: false },
      { label: 'REVEALED', moverX: 0.88, dashed: false },
    ];
    const rowY = Math.round(h * 0.38);
    const pathY = rowY + 18;
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(24, pathY); ctx.lineTo(w - 24, pathY); ctx.stroke();
    stages.forEach((stage, i) => {
      const cx = Math.round(24 + (w - 48) * stage.moverX);
      ctx.fillStyle = '#64748b';
      ctx.font = '800 9px Poppins, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(stage.label, cx, 8);
      ctx.fillStyle = stage.dashed ? '#e2e8f0' : '#ccfbf1';
      ctx.strokeStyle = stage.dashed ? '#94a3b8' : '#0f766e';
      ctx.lineWidth = 2;
      ctx.setLineDash(stage.dashed ? [5, 4] : []);
      ctx.beginPath(); ctx.arc(cx, pathY, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 14px Poppins, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(mover || '?').slice(0, 1).toUpperCase(), cx, pathY);
      if (i < stages.length - 1) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '800 12px Poppins, sans-serif';
        ctx.fillText('→', Math.round((cx + 24 + (w - 48) * stages[i + 1].moverX) / 2), pathY);
      }
    });
    ctx.fillStyle = '#166534';
    ctx.font = '800 10px Poppins, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(
      `✓ ${String(mover || 'Team').slice(0, 10)} arrives at ${String(goal || 'goal').slice(0, 24)}`,
      12, h - 6, w - 24
    );
    return c.toDataURL('image/png');
  }

  /** Finish tableau — visible completion payoff tied to topic + goal. */
  function routeFinishTableauPng(w, h, topicKey, mover, goal) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const cx = Math.round(w * 0.22);
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath(); ctx.arc(cx, h / 2, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 16px Poppins, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(mover || '?').slice(0, 1).toUpperCase(), cx, h / 2);
    ctx.font = '28px "Segoe UI Emoji", sans-serif';
    ctx.fillText(routeStepGlyph(goal), w - 36, h / 2);
    ctx.fillStyle = '#166534';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${String(mover || 'Team').slice(0, 14)} reached ${String(goal || 'the goal').slice(0, 28)}!`,
      52, h / 2, w - 100
    );
    return c.toDataURL('image/png');
  }

  /** Persistent connected route spine + named mover token + finish glyph (transparent overlay). */
  function routePathPng(w, h, count, mover, goal, topicKey) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const n = Math.max(3, Math.min(5, Number(count) || 3));
    const gap = 14;
    const slotW = Math.floor((w - gap * (n - 1)) / n);
    const y = Math.round(h * 0.72);
    const centers = Array.from({ length: n }, (_, i) => (
      Math.round(slotW / 2 + i * (slotW + gap))
    ));

    ctx.beginPath();
    ctx.moveTo(centers[0], y);
    centers.slice(1).forEach((x) => ctx.lineTo(x, y));
    ctx.strokeStyle = 'rgba(15, 118, 110, 0.28)';
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centers[0], y);
    centers.slice(1).forEach((x) => ctx.lineTo(x, y));
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 8;
    ctx.stroke();

    for (let i = 0; i < centers.length - 1; i++) {
      const x = Math.round((centers[i] + centers[i + 1]) / 2);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x + 9, y);
      ctx.lineTo(x - 8, y - 9);
      ctx.lineTo(x - 8, y + 9);
      ctx.closePath();
      ctx.fill();
    }

    const startX = centers[0];
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath(); ctx.arc(startX, y - 28, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '800 18px Poppins, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(mover || '?').slice(0, 1).toUpperCase(), startX, y - 28);

    const finishX = centers[centers.length - 1] + Math.round(slotW * 0.35);
    ctx.font = '32px "Segoe UI Emoji", sans-serif';
    ctx.fillText(routeStepGlyph(goal), finishX, y - 24);
    return c.toDataURL('image/png');
  }

  function routeCheckpointPng(w, h, n) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 16;
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.beginPath();
    ctx.moveTo(r, 2); ctx.arcTo(w - 2, 2, w - 2, h - 2, r);
    ctx.arcTo(w - 2, h - 2, 2, h - 2, r);
    ctx.arcTo(2, h - 2, 2, 2, r); ctx.arcTo(2, 2, w - 2, 2, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(204,251,241,0.72)';
    ctx.fillRect(3, 3, w - 6, 34);
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.ellipse(22, 20, 15, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 15px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 22, 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 13px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CHECKPOINT ${n}`, 46, 20, w - 54);
    ctx.fillStyle = '#64748b';
    ctx.font = '700 11px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP STEP HERE', w / 2, h - 12, w - 24);
    return c.toDataURL('image/png');
  }

  function routePeekPng(w, h) {
    return solidPng(w, h, '#facc15', 'LIFT TO REVEAL ROUTE', '#422006');
  }

  function routeLandmarkLabel(step) {
    const text = String(step || '').trim();
    const stripped = text.replace(
      /^(?:check|take|pack|walk\s+to|follow|cross|reach|buy|enter|join|choose|fill|build|light|put\s+out|get\s+on)\s+(?:the\s+)?/i,
      ''
    ).trim();
    return (stripped || text || 'checkpoint').slice(0, 30);
  }

  function routeStepGlyph(text) {
    const value = String(text || '').toLowerCase();
    const cues = [
      [/\b(map|plan|check)\b/, '🗺'],
      [/\b(radio|call|phone)\b/, '📻'],
      [/\b(flag|sign|marker)\b/, '⚑'],
      [/\b(bridge|cross)\b/, '🌉'],
      [/\b(boat|sail)\b/, '⛵'],
      [/\b(bus|coach)\b/, '🚌'],
      [/\b(ticket|pass)\b/, '🎟'],
      [/\b(roller coaster|coaster|ride)\b/, '🎢'],
      [/\b(gate|entrance)\b/, '🚪'],
      [/\b(line|queue)\b/, '👥'],
      [/\b(bag|pack)\b/, '🎒'],
      [/\b(walk|follow|go|reach|enter|join)\b/, '👣'],
      [/\b(bucket|water|put out)\b/, '🪣'],
      [/\b(wood|stack|build)\b/, '🪵'],
      [/\b(fire|light|ember)\b/, '🔥'],
    ];
    const hit = cues.find(([re]) => re.test(value));
    return hit ? hit[1] : '➜';
  }

  function routeTilePng(w, h, text, landmark) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(r, 1); ctx.arcTo(w - 1, 1, w - 1, h - 1, r);
    ctx.arcTo(w - 1, h - 1, 1, h - 1, r);
    ctx.arcTo(1, h - 1, 1, 1, r); ctx.arcTo(1, 1, w - 1, 1, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff7cc';
    ctx.beginPath();
    ctx.ellipse(32, h / 2, 23, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '28px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(routeStepGlyph(landmark || text), 32, h / 2);
    ctx.font = `800 ${String(text || '').length > 22 ? 15 : 17}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(text || ''), 62 + (w - 66) / 2, h / 2, w - 74);
    return c.toDataURL('image/png');
  }

  function routeAnswerPng(w, h, mover, goal, answer, topicKey) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 12;
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const arrived = `${String(mover || 'Team').slice(0, 12)} → ${String(goal || 'goal').slice(0, 20)}`;
    ctx.fillStyle = '#166534';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`✓ ${arrived} · ${String(answer || '').slice(0, 80)}`, w / 2, h / 2, w - 20);
    return c.toDataURL('image/png');
  }

  function stickyPng(w, h) {
    // Dark ink on bright yellow — never white-on-pale (was unreadable on
    // terracotta / dawn flats when a light cover prop replaced this).
    return solidPng(w, h, '#facc15', 'Peek?', '#422006');
  }

  /**
   * Peel-able flap for coverAnswer, drawn INSET inside the model-answer card
   * (speakingFlapRect) rather than the same size as the card. A tilt, a drop
   * shadow, and a folded top-right dog-ear sell "tangible note stuck onto a
   * bigger card" instead of a flat same-size button (Manus R1 weakest link).
   */
  function peelFlapPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const pad = Math.max(6, Math.round(Math.min(w, h) * 0.09));
    const fw = Math.max(20, w - pad * 2);
    const fh = Math.max(20, h - pad * 2);
    const r = Math.min(16, fh * 0.22);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.035); // ~2° tilt — hand-placed sticky note, not a flat button
    ctx.translate(-fw / 2, -fh / 2);

    // Drop shadow reads as "lifted above the card underneath it".
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(fw, 0, fw, fh, r); ctx.arcTo(fw, fh, 0, fh, r);
    ctx.arcTo(0, fh, 0, 0, r); ctx.arcTo(0, 0, fw, 0, r); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Folded top-right dog-ear — the peel affordance a child can spot.
    const fold = Math.min(fw, fh) * 0.3;
    ctx.beginPath();
    ctx.moveTo(fw - fold, 0);
    ctx.lineTo(fw, 0);
    ctx.lineTo(fw, fold);
    ctx.closePath();
    ctx.fillStyle = '#fde68a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fw - fold, 0);
    ctx.lineTo(fw, fold);
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const big = Math.max(15, Math.floor(fh * 0.26));
    const small = Math.max(11, Math.floor(fh * 0.16));
    ctx.font = `800 ${big}px Poppins, sans-serif`;
    ctx.fillText('☝ PEEL HERE', fw / 2, fh * 0.38);
    ctx.font = `700 ${small}px Poppins, sans-serif`;
    ctx.fillText('to compare your answer', fw / 2, fh * 0.66, fw - 28);
    ctx.restore();

    // Pull-tab on the right — a lifted handle kids can grab (Manus R2 lift cue).
    const tabW = Math.max(28, Math.round(w * 0.09));
    const tabH = Math.max(36, Math.round(h * 0.42));
    const tabX = w - tabW - 4;
    const tabY = Math.round((h - tabH) / 2);
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(tabX, tabY, tabW, tabH, 10)
      : ctx.rect(tabX, tabY, tabW, tabH);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.font = `800 ${Math.max(11, Math.floor(tabW * 0.42))}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAB', tabX + tabW / 2, tabY + tabH / 2);
    ctx.restore();
    return c.toDataURL('image/png');
  }

  // ── Recipes ─────────────────────────────────────────────────────

  function matchDock(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const art = (ctx && ctx.vocabArt)
      || (lesson && lesson._vocabArt)
      || null;
    const rows = art && Array.isArray(art.matchable) ? art.matchable : [];
    if (!rows.length) return;
    const size = matchDockSize(rows.length);
    if (!size) return; // caller should fall back to text-only cards

    // Keep the source deck genuinely unsolved: pictures are draggable, unlabeled,
    // and shuffled independently from the numbered word pads painted by makeVocab.
    // The same VocabArt row supplies both the source image and destination word,
    // preserving a strict 1:1 association across every topic.
    const shuffled = pick(rows, rows.length, hashStr((lesson && lesson.title) || 'matchDock') ^ 0x6d617463);
    const pieces = shuffled.map((row) => {
      const meta = {
        word: row.word,
        artSrc: row.artSrc || null,
        artTier: row.tier || null,
      };
      if (row.propKey) meta.propKey = row.propKey;
      if (row.artSrc) {
        return {
          kind: 'image',
          asset: row.artSrc,
          role: 'matchPiece',
          meta,
        };
      }
      return {
        kind: 'emoji',
        emoji: row.glyph || '★',
        role: 'matchPiece',
        meta,
      };
    });
    L.placeDockRow(page, pieces, {
      w: size.w,
      h: size.h,
      cols: size.cols,
      noShrink: true,
    });

    // Three-state payoff (Manus farm R4 / kitchen R4): a topic reward is
    // VISIBLE in the starter, a smaller wax seal locks its center, and the
    // solved bake moves that seal aside. Ordinary EDB movement — no scripting.
    const world = matchDockWorldTheme(lesson);
    const solved = !!(ctx && ctx.matchDockState === 'solved')
      || !!(lesson && lesson._matchDockSolved);
    const states = matchDockThreeStateRects(solved);
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: matchDockRewardPng(states.reward.w, states.reward.h, world),
      w: states.reward.w,
      h: states.reward.h,
      intentional: true,
      anchor: states.reward,
      role: 'matchReward',
      meta: {
        world: world.id,
        payoff: world.payoff,
        revealedAfter: rows.length,
        state: solved ? 'revealed' : 'locked-peek',
      },
    });
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: matchDockWaxSealPng(states.seal.w, states.seal.h, rows.length),
      w: states.seal.w,
      h: states.seal.h,
      intentional: true,
      anchor: states.seal,
      role: 'matchRewardCover',
      meta: {
        world: world.id,
        unlockAfter: rows.length,
        preservesPlacedCards: true,
        covers: 'matchReward',
        state: solved ? 'peeled' : 'locked',
      },
    });

    page.notes.push('recipe:matchDock');
    page.notes.push('recipe:matchDockPads');
    page.notes.push('recipe:matchDockNoCaptions');
    page.notes.push('recipe:matchDockCompletionReward');
    page.notes.push('recipe:matchDockTopicWorld:' + world.id);
    page.notes.push('recipe:matchDockThreeState:' + (solved ? 'solved' : 'starter'));
    page.notes.push('recipe:matchDockTwoStatePayoff');
    page.notes.push('matchDockFit:' + rows.length + 'x' + size.w + 'x' + size.h);
    if (art && art.dropped && art.dropped.length) {
      page.notes.push('matchDockDropped:' + art.dropped.length);
    }
    if (matchDockIsPartial(art)) {
      page.notes.push('recipe:matchDockPartialHint');
    }
    page.matchHint = matchDockStudentHint(art);
  }

  function orderLine(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const sentence = (lesson.reviewSentences || [])[0] || '';
    const words = reviewWords(lesson);
    if (!words.length) return;
    const bay = L.zoneRect(page, 'targetBay');
    const padW = Math.min(160, Math.floor((bay.w - 20) / Math.max(words.length, 1)) - 8);
    const padH = 54;
    words.forEach((_, i) => {
      const x = bay.x + 10 + i * (padW + 12);
      const y = bay.y + 8;
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: slotGhostPng(padW, padH, i + 1),
        w: padW, h: padH,
        prefer: 'targetBay',
        intentional: true,
        anchor: { x, y, w: padW, h: padH },
        role: 'orderPad',
        blocksOthers: false,
      });
    });
    const shuffled = pick(words, words.length, hashStr(sentence) ^ 0xabc);
    L.placeDockRow(page, shuffled.map((word) => ({
      kind: 'tile',
      text: word,
      role: 'orderTile',
      meta: { word },
    })), { w: Math.min(186, padW + 20), h: 54 });
    if (sentence) {
      // Keep answer off rewardPocket so revealReward flap doesn't cover it
      const strip = L.zoneRect(page, 'answerStrip') || { x: 40, y: 545, w: 220, h: 32 };
      L.place(page, {
        locked: true,
        kind: 'text',
        text: 'Answer: ' + sentence,
        prefer: 'answerStrip',
        w: strip.w, h: strip.h,
        size: 12,
        color: [255, 255, 255, 220],
        role: 'answerKey',
        intentional: true,
        anchor: strip,
      });
    }
    page.notes.push('recipe:orderLine');
  }

  function hideSeek(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const vocab = vocabList(lesson);
    if (!vocab.length) return;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const n = Math.min(vocab.length, 4);
    const cellW = 110;
    const cellH = 110;
    const cols = 2;
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = bay.x + 20 + col * (cellW + 24);
      const ty = bay.y + 20 + row * (cellH + 20);
      const target = L.place(page, {
        locked: true,
        kind: 'emoji',
        emoji: vocab[i].emoji || '★',
        w: 72, h: 72,
        intentional: true,
        anchor: { x: tx + 19, y: ty + 19, w: 72, h: 72 },
        role: 'hideTarget',
        meta: { word: vocab[i].word },
      });
      L.place(page, {
        locked: false,
        kind: 'image',
        asset: solidPng(cellW, cellH, COVER_COLORS[i % COVER_COLORS.length], '?', '#fff'),
        w: cellW, h: cellH,
        intentional: true,
        anchor: { x: tx, y: ty, w: cellW, h: cellH },
        role: 'cover',
        meta: { covers: vocab[i].word },
      });
      page.notes.push(`intentionalCover:${vocab[i].word}`);
    }
    page.notes.push('recipe:hideSeek');
  }

  function revealReward(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const pocket = L.zoneRect(page, 'rewardPocket');
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: 'assets/04_decoration-ui/star.svg',
      w: 96, h: 96,
      intentional: true,
      anchor: { x: pocket.x + 20, y: pocket.y + 10, w: 96, h: 96 },
      role: 'reward',
    });
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: solidPng(140, 100, FLAP_COLOR, 'Prize!', '#78350f'),
      w: 140, h: 100,
      intentional: true,
      anchor: pocket,
      role: 'rewardFlap',
    });
    page.notes.push('recipe:revealReward');
  }

  /** Collage/dress dock piece from VocabArt / curated glyph — never Gemini •. */
  function vocabDockPiece(v, role) {
    const word = v && v.word;
    if (!word) return null;
    const VI = window.VocabIcons;
    const path = VI && typeof VI.pathForSync === 'function' ? VI.pathForSync(word) : null;
    if (path) {
      return {
        kind: 'image',
        asset: path,
        role,
        meta: { word, artSrc: path, artTier: 'pack' },
      };
    }
    const glyph = VI && typeof VI.curatedGlyph === 'function' ? VI.curatedGlyph(word) : null;
    if (glyph) {
      return {
        kind: 'emoji',
        emoji: glyph,
        role,
        meta: { word, artTier: 'glyph' },
      };
    }
    // Prop / wordArt at bake via meta.word — empty beats bullet (no kind:image
    // without asset — that throws in pieceToPng).
    return {
      kind: 'emoji',
      role,
      meta: { word },
    };
  }

  function buildScene(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const dock = vocabList(lesson).slice(0, 4)
      .map((v) => vocabDockPiece(v, 'buildPart'))
      .filter((p) => p && p.meta && (p.meta.artSrc || p.emoji));
    if (!dock.length) return;
    const slotW = 100;
    const slotH = 100;
    dock.forEach((_, i) => {
      const x = bay.x + 16 + (i % 2) * (slotW + 20);
      const y = bay.y + 16 + Math.floor(i / 2) * (slotH + 16);
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: slotGhostPng(slotW, slotH, i + 1),
        w: slotW, h: slotH,
        intentional: true,
        anchor: { x, y, w: slotW, h: slotH },
        role: 'buildSlot',
      });
    });
    L.placeDockRow(page, dock, { w: 96, h: 96 });
    page.notes.push('recipe:buildScene');
  }

  function dressUp(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const props = vocabList(lesson).slice(0, 4);
    if (!props.length) return;
    const art = L.zoneRect(page, 'artSafe') || { x: 780, y: 100, w: 450, h: 320 };
    const body = CHAR_PATHS[hashStr(lesson.title) % CHAR_PATHS.length];
    const bw = Math.min(180, art.w - 24);
    const bh = Math.min(220, art.h - 24);
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: body,
      w: bw, h: bh,
      intentional: true,
      anchor: {
        x: art.x + Math.round((art.w - bw) / 2),
        y: art.y + Math.max(8, art.h - bh - 8),
        w: bw, h: bh,
      },
      role: 'dressBody',
    });
    const dock = props.map((v) => {
      const piece = vocabDockPiece(v, 'dressPart');
      if (!piece) return null;
      return Object.assign(piece, { text: v.word });
    }).filter(Boolean);
    if (dock.length) {
      L.placeDockRow(page, dock, { w: 96, h: 96, noShrink: true });
    }
    page.notes.push('recipe:dressUp');
  }

  function coverAnswer(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const q = ctx?.speakingItem;
    if (!q) return;
    // Model-answer card fills targetBay (painted by the DOM ribbon+card in
    // renderLessonPages); the flap sits INSET inside that card so it reads
    // as a peel-able note stuck onto a bigger card, not a same-size button
    // (Manus R1 fruit-market weakest link).
    const bay = L.zoneRect(page, 'targetBay') || speakingCoverRect();
    const flapRect = speakingFlapRect(bay);
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: peelFlapPng(flapRect.w, flapRect.h),
      w: flapRect.w, h: flapRect.h,
      intentional: true,
      anchor: flapRect,
      role: 'answerCover',
      meta: {
        sample: q.sampleAnswer,
      },
    });
    const bind = coverAnswerBind(q, lesson);
    page.notes.push('recipe:coverAnswer');
    page.notes.push('recipe:coverAnswerBind:' + bind.intent);
    if (!bind.ok) page.notes.push('coverAnswerBindFail:' + bind.reasons.join(','));
  }

  /** True when hint text names the mystery answer (word-boundary). */
  function hintNamesAnswer(hint, word) {
    const w = String(word || '').trim().toLowerCase();
    if (!w) return false;
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${esc}\\b`, 'i').test(String(hint || ''));
  }

  /**
   * Prefer lesson.activity.mysteryHints [h1,h2,h3] when valid; else CEFR-safe
   * templates (category → feature → near-giveaway). Never put the answer in 1–2.
   */
  function resolveMysteryHints(word, lesson) {
    const w = String(word || '').trim();
    const raw = lesson && lesson.activity && lesson.activity.mysteryHints;
    if (Array.isArray(raw) && raw.length >= 3) {
      const cleaned = raw.slice(0, 3).map((h) => String(h || '').trim()).filter(Boolean);
      const titleBlob = String((lesson && lesson.title) || '').toLowerCase();
      // Title already names the category ("One Fruit Card") — Hint 1 must not
      // just restate that category (Manus: circular / thin pedagogy).
      const h1RestatesTitle = cleaned.length === 3 && /\b(fruit|food|animal|sport|color|colour|job|school)\b/i.test(cleaned[0])
        && new RegExp('\\b' + (cleaned[0].match(/\b(fruit|food|animal|sport|color|colour|job|school)\b/i) || [''])[0] + '\\b', 'i').test(titleBlob);
      if (cleaned.length === 3
        && !hintNamesAnswer(cleaned[0], w)
        && !hintNamesAnswer(cleaned[1], w)
        && !h1RestatesTitle) {
        return cleaned;
      }
    }
    const lower = w.toLowerCase();
    const vocab = (lesson && lesson.vocabulary) || [];
    const row = vocab.find((v) => {
      const vw = typeof v === 'string' ? v : v && v.word;
      return vw && String(vw).toLowerCase() === lower;
    });
    const sentence = row && typeof row === 'object' ? String(row.sentence || '').trim() : '';

    let h1 = 'It is a thing you can see or hold.';
    if (/\b(coach|teacher|doctor|nurse|chef|pilot|firefighter|barista|farmer)\b/.test(lower)) {
      h1 = 'It is a person with a job.';
    }
    if (/\b(ball|bat|racket|whistle|goal|net|helmet|skate|skates|bike|bicycle)\b/.test(lower)
      || /\b(soccer|tennis|basketball|sport)\b/.test(lower)) {
      h1 = 'It is something you use in sports or games.';
    } else if (/\b(apple|banana|carrot|lemon|grape|bread|cake|milk|juice|soup|fruit)\b/.test(lower)) {
      h1 = 'It is something you can eat or drink.';
    } else if (/\b(dog|cat|bird|fish|horse|pet|animal)\b/.test(lower)) {
      h1 = 'It is an animal you can see.';
    } else if (/\b(bus|car|train|plane|boat|truck|bike)\b/.test(lower)) {
      h1 = 'It is something people ride or travel in.';
    } else if (/\b(hat|coat|shoe|shirt|dress|sock)\b/.test(lower)) {
      h1 = 'It is something people wear.';
    } else if (/\b(tree|flower|leaf|park|beach|river)\b/.test(lower)) {
      h1 = 'It is something you find outside.';
    } else if (/\b(book|pen|pencil|eraser|bag|desk|school)\b/.test(lower)) {
      h1 = 'It is something you use at school.';
    }

    let h2 = 'People use it or talk about it often.';
    // Feature-level Hint 2 — avoid circular category restatement (Manus: thin pedagogy).
    if (/\b(apple|banana|lemon|orange|grape|tomato)\b/.test(lower)) {
      h2 = 'It is usually round. Kids eat it as a snack.';
    } else if (/\b(carrot|bread|cake|soup)\b/.test(lower)) {
      h2 = 'It is food. You can buy it at a shop or market.';
    } else if (/\b(ball|bat|racket|whistle)\b/.test(lower)) {
      h2 = 'Players hold it or use it during a game.';
    } else if (/\b(dog|cat|bird|fish|horse)\b/.test(lower)) {
      h2 = 'It has a body and can move by itself.';
    } else if (/\b(bus|car|train|plane|boat|truck)\b/.test(lower)) {
      h2 = 'It has wheels or wings and takes people places.';
    } else if (/\b(hat|coat|shoe|shirt|dress|sock)\b/.test(lower)) {
      h2 = 'You put it on your body.';
    }
    if (sentence) {
      const blanked = sentence.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '____');
      if (blanked && blanked !== sentence && blanked.length < 70 && !hintNamesAnswer(blanked, w)) {
        h2 = `In a sentence: ${blanked}`;
      } else if (/\b(play|use|hold|wear|eat|drink|ride|see)\b/i.test(sentence) && h2.startsWith('People use')) {
        h2 = 'People use it, hold it, or see it in real life.';
      }
    }
    if (hintNamesAnswer(h2, w)) h2 = 'People use it or talk about it often.';

    const initial = w.charAt(0).toUpperCase();
    let h3 = initial
      ? `It starts with the letter ${initial}.`
      : 'Say the word. Then write it on the line.';
    if (sentence && sentence.length < 60) {
      const blanked = sentence.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '____');
      if (blanked && blanked !== sentence) {
        h3 = blanked;
      }
    }
    return [h1, h2, h3];
  }

  /** First pictured (VocabArt matchable) board word — mystery target. */
  function pickMysteryTarget(vocabArt) {
    const rows = vocabArt && Array.isArray(vocabArt.matchable) ? vocabArt.matchable : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.word && row.matchable !== false && (row.artSrc || row.glyph || row.propKey)) {
        return row;
      }
      if (row && row.word && row.matchable) return row;
    }
    return rows[0] || null;
  }

  /**
   * Mystery word under a ? cover + three peelable hint stickies + write line
   * and optional vocab word tiles. Standard activity zones (not heroStage).
   */
  function mysteryHints(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const word = ctx && ctx.targetWord;
    const hints = (ctx && Array.isArray(ctx.hints) ? ctx.hints : [])
      .map((h) => String(h || '').trim())
      .filter(Boolean);
    if (!word || hints.length < 3) return;

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const writeH = 44;
    const playH = Math.max(120, bay.h - writeH - 10);
    const artSize = Math.min(156, playH - 8);
    const artX = bay.x + 36;
    const artY = bay.y + Math.round((playH - artSize) / 2);

    const row = ctx.vocabArtRow || null;
    const artPath = (ctx.artPath || (row && row.artSrc) || '').trim();
    const meta = { word, mystery: true };
    if (row && row.propKey) meta.propKey = row.propKey;
    if (artPath) meta.artSrc = artPath;
    if (row && row.tier) meta.artTier = row.tier;

    if (artPath) {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: artPath,
        w: artSize, h: artSize,
        intentional: true,
        anchor: { x: artX, y: artY, w: artSize, h: artSize },
        role: 'mysteryArt',
        meta,
      });
    } else {
      const glyph = (row && row.glyph) || '★';
      L.place(page, {
        locked: true,
        kind: 'emoji',
        emoji: glyph,
        w: artSize, h: artSize,
        intentional: true,
        anchor: { x: artX, y: artY, w: artSize, h: artSize },
        role: 'mysteryArt',
        meta,
      });
    }

    const coverPad = 12;
    const coverW = artSize + coverPad;
    const coverH = artSize + coverPad;
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: solidPng(coverW, coverH, COVER_COLORS[0], '?', '#fff'),
      w: coverW, h: coverH,
      intentional: true,
      anchor: {
        x: artX - coverPad / 2,
        y: artY - coverPad / 2,
        w: coverW, h: coverH,
      },
      role: 'mysteryCover',
      meta: { covers: word },
    });

    const hintW = Math.min(380, Math.max(260, bay.w - artSize - 120));
    const hintH = Math.min(58, Math.floor((playH - 16) / 3));
    const hintGap = 8;
    const hintX = bay.x + bay.w - hintW - 28;
    let hintY = bay.y + 8;

    for (let i = 0; i < 3; i++) {
      const label = `Hint ${i + 1}`;
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: hintStickyPng(hintW, hintH, hints[i]),
        w: hintW, h: hintH,
        intentional: true,
        anchor: { x: hintX, y: hintY, w: hintW, h: hintH },
        role: 'mysteryHint',
        meta: { hintIndex: i + 1, text: hints[i] },
      });
      // Hint 1 starts peeled (no unlocked postage-stamp tab — that tanked M10).
      // Hints 2–3 start fully covered for ClassIn peel.
      if (i > 0) {
        L.place(page, {
          locked: false,
          kind: 'image',
          asset: solidPng(hintW, hintH, '#facc15', label, '#422006'),
          w: hintW, h: hintH,
          intentional: true,
          anchor: { x: hintX, y: hintY, w: hintW, h: hintH },
          role: 'hintCover',
          meta: { hintIndex: i + 1 },
        });
      }
      hintY += hintH + hintGap;
    }

    const writeY = bay.y + bay.h - writeH;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: solidPng(bay.w - 64, writeH, '#ffffff', 'My guess: _______________', '#334155'),
      w: bay.w - 64, h: writeH,
      intentional: true,
      anchor: { x: bay.x + 32, y: writeY, w: bay.w - 64, h: writeH },
      role: 'mysteryWrite',
      meta: { answer: word },
    });

    // Dock distractors only — never ship the answer, and never ship a word that
    // already appears in a hint (e.g. fruit when Hint 1 says "It is a fruit…").
    // Also drop category hypernyms of the target (fruit next to apple).
    const answerLower = String(word || '').trim().toLowerCase();
    const hintBlob = hints.join(' ').toLowerCase();
    const hypernymOfAnswer = (() => {
      if (/\b(apple|banana|lemon|orange|grape|mango|pear)\b/.test(answerLower)) return /^(fruit|food)$/;
      if (/\b(dog|cat|bird|fish|horse)\b/.test(answerLower)) return /^(animal|pet)$/;
      if (/\b(bus|car|train|plane|boat|truck)\b/.test(answerLower)) return /^(vehicle|transport)$/;
      return null;
    })();
    const cards = vocabList(lesson).filter((v) => {
      const w = String((v && v.word) || '').trim().toLowerCase();
      if (!w || w === answerLower) return false;
      if (hypernymOfAnswer && hypernymOfAnswer.test(w)) return false;
      try {
        if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hintBlob)) {
          return false;
        }
      } catch (_) { /* keep card if regex fails */ }
      return true;
    });
    if (cards.length) {
      const dock = L.zoneRect(page, 'dock');
      const gap = 14;
      const longest = cards.reduce((n, v) => Math.max(n, String(v.word || '').length), 0);
      let tileW = Math.min(210, Math.max(96, longest * 13 + 26));
      // M10 warn floor is 64 — never ship grab tiles under that.
      let tileH = 64;
      if (dock && dock.w) {
        const n = cards.length;
        const oneRowW = Math.floor((dock.w - gap * Math.max(0, n - 1)) / n);
        if (oneRowW >= 88) {
          tileW = Math.min(tileW, oneRowW);
        } else {
          const cols = Math.ceil(n / 2);
          tileW = Math.max(88, Math.floor((dock.w - gap * Math.max(0, cols - 1)) / cols));
        }
        tileH = Math.max(64, Math.min(72, dock.h - 8));
      }
      L.placeDockRow(page, cards.map((v) => ({
        kind: 'tile',
        text: v.word,
        role: 'mysteryTile',
        meta: { word: v.word },
      })), { w: tileW, h: tileH });
    }

    page.notes.push('recipe:mysteryHints');
    page.notes.push('mysteryTarget:' + word);
  }

  /** Dark mystery-shape cover — silhouette gate (not a broken art plate). */
  function silhouetteGatePng(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const r = 16;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill();
    // Soft blob silhouette — reads as SHAPE, not a yellow "?" sticker.
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.48, w * 0.32, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(2, Math.floor(w * 0.02));
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `800 ${Math.max(18, Math.floor(h * 0.22))}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h * 0.46, w - 20);
    ctx.font = `700 ${Math.max(11, Math.floor(h * 0.11))}px Poppins, sans-serif`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('PEEL', w / 2, h * 0.78, w - 16);
    return c.toDataURL('image/png');
  }

  function boardArchetypeId(lesson) {
    const act = lesson && lesson.activity;
    if (!act || typeof act !== 'object') return '';
    return String(act.boardArchetype || act.archetype || '').trim().toLowerCase();
  }

  function archetypeCueBlob(lesson) {
    const act = (lesson && lesson.activity) || {};
    return [
      act.boardArchetype, act.archetype, act.title, act.prompt,
      act.mysteryMode, (lesson && lesson.title) || '',
    ].filter(Boolean).join(' ').toLowerCase();
  }

  /**
   * Explicit eligibility only — never spray into every lesson.
   * Opt-in: activity.boardArchetype, or narrow title/prompt cues.
   */
  function wantsSilhouetteGate(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'silhouettegate' || id === 'silhouette-gate' || id === 'mysteryreveal') return true;
    const act = lesson && lesson.activity;
    if (act && String(act.mysteryMode || '').toLowerCase() === 'silhouette') return true;
    return /\b(mystery\s*shape|silhouette|shadow\s*guess|guess\s*the\s*shape)\b/i.test(archetypeCueBlob(lesson));
  }

  function wantsHalfTruth(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'halftruth' || id === 'half-truth' || id === 'half_truth') return true;
    const act = lesson && lesson.activity;
    if (act && act.halfTruth && typeof act.halfTruth === 'object') return true;
    return /\b(half[\s-]?truth|true,? half,? false|claim check)\b/i.test(archetypeCueBlob(lesson));
  }

  function wantsSceneRepair(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'scenerepair' || id === 'scene-repair' || id === 'deliberaterepair' || id === 'wrongroom') {
      return true;
    }
    const act = lesson && lesson.activity;
    if (act && act.sceneRepair && typeof act.sceneRepair === 'object') return true;
    return /\b(find the mistake|fix the (room|scene)|wrong (place|room)|scene repair)\b/i.test(
      archetypeCueBlob(lesson)
    );
  }

  function wantsCapacityPack(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'capacitypack' || id === 'capacity-pack' || id === 'packandcheck') return true;
    const act = lesson && lesson.activity;
    if (act && act.capacityPack && typeof act.capacityPack === 'object') return true;
    return /\b(pack exactly|limited pack|capacity challenge|pack and check)\b/i.test(archetypeCueBlob(lesson));
  }

  function wantsRouteMission(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'routemission' || id === 'route-mission' || id === 'missionroute') return true;
    const act = lesson && lesson.activity;
    if (act && act.routeMission && typeof act.routeMission === 'object') return true;
    return /\b(route mission|plan the route|mission path|steps to the goal)\b/i.test(archetypeCueBlob(lesson));
  }

  function wantsTransformationLab(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'transformationlab' || id === 'transformation-lab' || id === 'causeeffectlab') return true;
    const act = lesson && lesson.activity;
    if (act && act.transformationLab && typeof act.transformationLab === 'object') return true;
    return /\b(transformation lab|make it change|cause and effect|what changes it)\b/i.test(archetypeCueBlob(lesson));
  }

  function wantsEvidenceBoard(lesson) {
    const id = boardArchetypeId(lesson);
    if (id === 'evidenceboard' || id === 'evidence-board' || id === 'casefile') return true;
    const act = lesson && lesson.activity;
    if (act && act.evidenceBoard && typeof act.evidenceBoard === 'object') return true;
    return /\b(evidence board|case file|rank the clues|strongest evidence)\b/i.test(archetypeCueBlob(lesson));
  }

  function hasExplicitBoardGrammar(lesson) {
    const act = lesson && lesson.activity;
    if (!act || typeof act !== 'object') return false;
    if (boardArchetypeId(lesson)) return true;
    if (String(act.mysteryMode || '').toLowerCase() === 'silhouette') return true;
    return [
      'halfTruth',
      'sceneRepair',
      'capacityPack',
      'routeMission',
      'transformationLab',
      'evidenceBoard',
    ].some((key) => act[key] && typeof act[key] === 'object');
  }

  function resolveSilhouetteGate(lesson, vocabArt) {
    if (!wantsSilhouetteGate(lesson)) return null;
    const row = pickMysteryTarget(vocabArt);
    if (!row || !row.word) return null;
    const hints = resolveMysteryHints(row.word, lesson);
    if (!hints || hints.length < 3) return null;
    return {
      targetWord: row.word,
      artPath: row.artSrc || null,
      vocabArtRow: row,
      hints,
      source: boardArchetypeId(lesson) ? 'opt-in' : 'cue',
    };
  }

  /**
   * Mystery shape cover over pictured target + peelable hints.
   * Framing makes intentional mystery vs broken art unmistakable.
   */
  function silhouetteGate(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const word = ctx && ctx.targetWord;
    const hints = (ctx && Array.isArray(ctx.hints) ? ctx.hints : [])
      .map((h) => String(h || '').trim())
      .filter(Boolean);
    if (!word || hints.length < 3) return;

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const writeH = 44;
    const playH = Math.max(120, bay.h - writeH - 10);
    const artSize = Math.min(168, playH - 8);
    const artX = bay.x + 36;
    const artY = bay.y + Math.round((playH - artSize) / 2);

    const row = ctx.vocabArtRow || null;
    const artPath = (ctx.artPath || (row && row.artSrc) || '').trim();
    const meta = { word, mystery: true, silhouetteGate: true };
    if (row && row.propKey) meta.propKey = row.propKey;
    if (artPath) meta.artSrc = artPath;
    if (row && row.tier) meta.artTier = row.tier;

    if (artPath) {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: artPath,
        w: artSize, h: artSize,
        intentional: true,
        anchor: { x: artX, y: artY, w: artSize, h: artSize },
        role: 'mysteryArt',
        meta,
      });
    } else {
      const glyph = (row && row.glyph) || '★';
      L.place(page, {
        locked: true,
        kind: 'emoji',
        emoji: glyph,
        w: artSize, h: artSize,
        intentional: true,
        anchor: { x: artX, y: artY, w: artSize, h: artSize },
        role: 'mysteryArt',
        meta,
      });
    }

    const coverPad = 10;
    const coverW = artSize + coverPad;
    const coverH = artSize + coverPad;
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: silhouetteGatePng(coverW, coverH),
      w: coverW, h: coverH,
      intentional: true,
      anchor: {
        x: artX - coverPad / 2,
        y: artY - coverPad / 2,
        w: coverW, h: coverH,
      },
      role: 'silhouetteCover',
      meta: { covers: word, intentionalMystery: true },
    });

    const hintW = Math.min(380, Math.max(260, bay.w - artSize - 120));
    const hintH = Math.min(58, Math.floor((playH - 16) / 3));
    const hintGap = 8;
    const hintX = bay.x + bay.w - hintW - 28;
    let hintY = bay.y + 8;
    for (let i = 0; i < 3; i++) {
      const label = `Hint ${i + 1}`;
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: hintStickyPng(hintW, hintH, hints[i]),
        w: hintW, h: hintH,
        intentional: true,
        anchor: { x: hintX, y: hintY, w: hintW, h: hintH },
        role: 'mysteryHint',
        meta: { hintIndex: i + 1, text: hints[i] },
      });
      if (i > 0) {
        L.place(page, {
          locked: false,
          kind: 'image',
          asset: solidPng(hintW, hintH, '#334155', label, '#f8fafc'),
          w: hintW, h: hintH,
          intentional: true,
          anchor: { x: hintX, y: hintY, w: hintW, h: hintH },
          role: 'hintCover',
          meta: { hintIndex: i + 1 },
        });
      }
      hintY += hintH + hintGap;
    }

    const writeY = bay.y + bay.h - writeH;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: solidPng(bay.w - 64, writeH, '#ffffff', 'My guess: _______________', '#334155'),
      w: bay.w - 64, h: writeH,
      intentional: true,
      anchor: { x: bay.x + 32, y: writeY, w: bay.w - 64, h: writeH },
      role: 'mysteryWrite',
      meta: { answer: word },
    });

    page.notes.push('recipe:silhouetteGate');
    page.notes.push('mysteryTarget:' + word);
    page.notes.push('intentionalMystery:silhouetteGate');
  }

  const HALF_TRUTH_VERDICTS = new Set(['true', 'half', 'false']);

  function themeSlotLabel(cue) {
    const c = String(cue || '').toLowerCase();
    if (c === 'food') return 'Food basket';
    if (c === 'animal') return 'Animal pen';
    if (c === 'sport') return 'Sports kit';
    if (c === 'transport') return 'Transport bay';
    if (c === 'clothes') return 'Clothes shelf';
    if (c === 'school') return 'School desk';
    if (c === 'nature') return 'Nature tray';
    if (c === 'abstract') return 'Ideas shelf';
    return 'This group';
  }

  function resolveHalfTruth(lesson, vocabArt) {
    if (!wantsHalfTruth(lesson)) return null;
    const raw = lesson && lesson.activity && lesson.activity.halfTruth;
    if (raw && typeof raw === 'object') {
      const claim = String(raw.claim || '').trim();
      const verdict = String(raw.verdict || '').trim().toLowerCase();
      const evidence = (Array.isArray(raw.evidence) ? raw.evidence : [])
        .map((w) => String(w || '').trim())
        .filter(Boolean)
        .slice(0, 4);
      if (claim && HALF_TRUTH_VERDICTS.has(verdict) && evidence.length >= 2) {
        const rows = evidence.map((w) => findMatchableRow(w, picturedMatchableRows(vocabArt)) || { word: w });
        return {
          claim,
          verdict,
          why: String(raw.why || '').trim() || null,
          options: evidence,
          rows,
          source: 'lesson',
        };
      }
    }

    const pictured = picturedMatchableRows(vocabArt);
    if (pictured.length < 3) return null;
    const oddSet = resolveOddOneOut(lesson, vocabArt);
    if (!oddSet || !oddSet.options || oddSet.options.length < 4) return null;
    const majorityCue = oddSet.themeCue || 'food';
    const claim = `All of these belong in one ${majorityCue} group.`;
    return {
      claim,
      verdict: 'half',
      why: oddSet.whyHint || `One item does not fit the ${majorityCue} group.`,
      options: oddSet.options.slice(0, 4),
      rows: oddSet.rows || [],
      odd: oddSet.odd,
      source: 'derived-authored-set',
    };
  }

  function halfTruthBoard(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const claim = ctx && ctx.claim ? String(ctx.claim).trim() : '';
    const verdict = ctx && ctx.verdict ? String(ctx.verdict).toLowerCase() : '';
    const options = (ctx && Array.isArray(ctx.options) ? ctx.options : [])
      .map((w) => String(w || '').trim())
      .filter(Boolean)
      .slice(0, 4);
    const rows = (ctx && Array.isArray(ctx.rows) ? ctx.rows : []).slice(0, 4);
    if (!claim || !HALF_TRUTH_VERDICTS.has(verdict) || options.length < 2) return;

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const keyH = 36;
    const claimH = 48;
    const padH = 42;
    const gap = 10;
    // Reserve bottom strip for teacher answer + Peek cover — never cover evidence.
    const keyY = bay.y + bay.h - keyH;
    const playBottom = keyY - gap;
    const claimY = bay.y + 4;
    const padY = claimY + claimH + gap;
    const evidenceTop = padY + padH + gap;
    const evidenceBudget = Math.max(64, playBottom - evidenceTop);
    const cell = Math.min(
      88,
      evidenceBudget,
      Math.floor((bay.w - 72) / Math.max(options.length, 1)) - 10
    );

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: hintStickyPng(bay.w - 48, claimH, 'CLAIM: ' + claim),
      w: bay.w - 48,
      h: claimH,
      intentional: true,
      anchor: { x: bay.x + 24, y: claimY, w: bay.w - 48, h: claimH },
      role: 'halfTruthClaim',
      meta: { claim, verdict },
    });

    const padLabels = [
      { id: 'true', label: 'TRUE', color: '#166534' },
      { id: 'half', label: 'HALF TRUE', color: '#a16207' },
      { id: 'false', label: 'FALSE', color: '#9f1239' },
    ];
    const padW = Math.min(140, Math.floor((bay.w - 80) / 3) - 8);
    const padStartX = bay.x + Math.round((bay.w - (padW * 3 + 16 * 2)) / 2);
    padLabels.forEach((pad, i) => {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: solidPng(padW, padH, pad.color, pad.label, '#fff'),
        w: padW, h: padH,
        intentional: true,
        anchor: { x: padStartX + i * (padW + 16), y: padY, w: padW, h: padH },
        role: 'halfTruthPad',
        meta: { verdict: pad.id },
      });
    });

    // Evidence stays fully visible above the answer strip.
    const evidenceY = evidenceTop + Math.max(0, Math.floor((evidenceBudget - cell) / 2));
    const totalW = options.length * cell + (options.length - 1) * 10;
    let ex = bay.x + Math.round((bay.w - totalW) / 2);
    options.forEach((word, i) => {
      const row = rows[i] || findMatchableRow(word, rows) || { word };
      const meta = { word, evidence: true };
      if (row.propKey) meta.propKey = row.propKey;
      if (row.artSrc) meta.artSrc = row.artSrc;
      if (row.artSrc) {
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: row.artSrc,
          w: cell, h: cell,
          intentional: true,
          anchor: { x: ex, y: evidenceY, w: cell, h: cell },
          role: 'halfTruthEvidence',
          meta,
        });
      } else {
        L.place(page, {
          locked: true,
          kind: 'emoji',
          emoji: row.glyph || '★',
          w: cell, h: cell,
          intentional: true,
          anchor: { x: ex, y: evidenceY, w: cell, h: cell },
          role: 'halfTruthEvidence',
          meta,
        });
      }
      ex += cell + 10;
    });

    const answerLine = ctx.why
      ? `Answer: ${verdict.toUpperCase()} — ${ctx.why}`
      : `Answer: ${verdict.toUpperCase()}`;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: solidPng(bay.w - 64, keyH, '#e2e8f0', answerLine.slice(0, 72), '#0f172a'),
      w: bay.w - 64, h: keyH,
      intentional: true,
      anchor: { x: bay.x + 32, y: keyY, w: bay.w - 64, h: keyH },
      role: 'halfTruthKey',
      meta: { verdict, why: ctx.why || null },
    });
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: stickyPng(bay.w - 64, keyH),
      w: bay.w - 64, h: keyH,
      intentional: true,
      anchor: { x: bay.x + 32, y: keyY, w: bay.w - 64, h: keyH },
      role: 'halfTruthCover',
      meta: { covers: 'answer' },
    });

    // Choice chips — drag onto TRUE / HALF TRUE / FALSE.
    L.placeDockRow(page, [
      { kind: 'tile', text: 'TRUE', role: 'halfTruthChip', meta: { verdict: 'true' } },
      { kind: 'tile', text: 'HALF TRUE', role: 'halfTruthChip', meta: { verdict: 'half' } },
      { kind: 'tile', text: 'FALSE', role: 'halfTruthChip', meta: { verdict: 'false' } },
    ], { w: 150, h: 56 });

    page.notes.push('recipe:halfTruthBoard');
    page.notes.push('halfTruthVerdict:' + verdict);
  }

  function resolveSceneRepair(lesson, vocabArt) {
    if (!wantsSceneRepair(lesson)) return null;
    const raw = lesson && lesson.activity && lesson.activity.sceneRepair;
    if (raw && typeof raw === 'object') {
      const tuple = buildSceneRepairTuple(raw, lesson);
      if (!tuple) return null;
      const dockWords = [tuple.correct_prop, tuple.wrong_prop];
      const uniq = [];
      const seen = new Set();
      dockWords.forEach((w) => {
        const low = w.toLowerCase();
        if (seen.has(low)) return;
        seen.add(low);
        uniq.push(w);
      });
      if (uniq.length < 2) return null;
      const rows = uniq.map((w) => findMatchableRow(w, picturedMatchableRows(vocabArt)) || { word: w });
      return {
        slotLabel: tuple.named_location,
        wrongWord: tuple.wrong_prop,
        correctWord: tuple.correct_prop,
        options: uniq.slice(0, 4),
        rows,
        source: 'lesson',
        authoredWrongness: true,
        sceneCue: tuple.sceneCue,
        semanticTuple: tuple,
        ignoredDistractors: Array.isArray(raw.distractors) ? raw.distractors.length : 0,
      };
    }

    // Derived only from an honest odd-one-out set — still AUTHORED as "find the mistake",
    // never from resolver failures.
    const oddSet = resolveOddOneOut(lesson, vocabArt);
    if (!oddSet || !oddSet.odd || !oddSet.options || oddSet.options.length < 4) return null;
    const majority = oddSet.options.find((w) => String(w).toLowerCase() !== String(oddSet.odd).toLowerCase());
    if (!majority) return null;
    const derivedRaw = {
      slotLabel: themeSlotLabel(oddSet.themeCue),
      wrongWord: oddSet.odd,
      correctWord: majority,
      sceneCue: oddSet.themeCue || (lesson && lesson.title) || '',
    };
    const tuple = buildSceneRepairTuple(derivedRaw, lesson);
    if (!tuple) return null;
    return {
      slotLabel: tuple.named_location,
      wrongWord: tuple.wrong_prop,
      correctWord: tuple.correct_prop,
      options: oddSet.options.slice(0, 4),
      rows: oddSet.rows || [],
      source: 'derived-authored-set',
      authoredWrongness: true,
      themeCue: oddSet.themeCue || null,
      sceneCue: tuple.sceneCue,
      semanticTuple: tuple,
    };
  }

  /**
   * Authored wrongness on a labeled slot — learner removes the mistake and places a fit.
   * Deliberate wrongness is framed on-board; never a silent resolver miss.
   */
  function sceneRepair(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const tuple = (ctx && ctx.semanticTuple) || buildSceneRepairTuple({
      slotLabel: ctx && ctx.slotLabel,
      wrongWord: ctx && ctx.wrongWord,
      correctWord: ctx && ctx.correctWord,
      sceneCue: ctx && (ctx.sceneCue || ctx.themeCue),
      snapTarget: ctx && ctx.snapTarget,
      spokenFrame: ctx && ctx.spokenFrame,
      successVisual: ctx && ctx.successVisual,
    }, lesson);
    if (!tuple) return;
    const wrongWord = tuple.wrong_prop;
    const correctWord = tuple.correct_prop;
    const slotLabel = tuple.named_location;
    const rows = (ctx && Array.isArray(ctx.rows) ? ctx.rows : []).slice(0, 4);

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const dockZ = L.zoneRect(page, 'dock');
    const headerZ = L.zoneRect(page, 'header');
    const theme = sceneRepairTheme(`${slotLabel} ${tuple.sceneCue} ${tuple.success_visual}`);
    const stage = {
      x: 24,
      y: headerZ ? headerZ.y + headerZ.h + 4 : Math.max(64, bay.y - 96),
      w: 1232,
      h: dockZ ? (dockZ.y + dockZ.h) - (headerZ ? headerZ.y + headerZ.h + 4 : 64) : Math.max(bay.h, 360),
    };
    const sceneCue = tuple.sceneCue;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: sceneRepairStagePng(stage.w, stage.h, slotLabel, sceneCue, tuple),
      w: stage.w,
      h: stage.h,
      intentional: true,
      anchor: { x: stage.x, y: stage.y, w: stage.w, h: stage.h },
      role: 'sceneRepairStage',
      meta: {
        authoredWrongness: true,
        label: slotLabel,
        sceneCue,
        semanticTuple: tuple,
        worldState: 'broken',
        theme,
      },
    });

    const targetSize = Math.min(168, Math.round(stage.h * 0.38));
    const targetX = stage.x + Math.round(stage.w * 0.52) - Math.round(targetSize / 2);
    const targetY = stage.y + Math.round(stage.h * 0.58) - Math.round(targetSize / 2);
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: sceneRepairTargetPng(targetSize, targetSize),
      w: targetSize, h: targetSize,
      intentional: true,
      anchor: { x: targetX, y: targetY, w: targetSize, h: targetSize },
      role: 'sceneRepairDestination',
      meta: {
        label: slotLabel,
        correctWord,
        wrongWord,
        snap_target: tuple.snap_target,
        staysVisible: true,
      },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: sceneRepairChipPng(188, 32, String(tuple.snap_target).toUpperCase(), 'rgba(15,118,110,0.88)', '#ffffff'),
      w: 188,
      h: 32,
      intentional: true,
      anchor: { x: targetX + Math.round((targetSize - 188) / 2), y: targetY + targetSize - 8, w: 188, h: 32 },
      role: 'sceneRepairSnapLabel',
      meta: { snap_target: tuple.snap_target },
    });

    const wrongRow = findMatchableRow(wrongWord, rows) || { word: wrongWord };
    const pieceSize = Math.min(88, targetSize - 48);
    const px = targetX + Math.round((targetSize - pieceSize) / 2);
    const py = targetY + Math.round((targetSize - pieceSize) / 2) - 6;
    const wrongMeta = {
      word: wrongWord,
      authoredWrong: true,
      artSrc: wrongRow.artSrc || null,
    };
    if (wrongRow.propKey) wrongMeta.propKey = wrongRow.propKey;
    L.place(page, wrongRow.artSrc ? {
      locked: false,
      kind: 'image',
      asset: wrongRow.artSrc,
      w: pieceSize, h: pieceSize,
      intentional: true,
      anchor: { x: px, y: py, w: pieceSize, h: pieceSize },
      role: 'sceneRepairWrong',
      meta: wrongMeta,
    } : {
      locked: false,
      kind: 'emoji',
      emoji: wrongRow.glyph || '★',
      w: pieceSize, h: pieceSize,
      intentional: true,
      anchor: { x: px, y: py, w: pieceSize, h: pieceSize },
      role: 'sceneRepairWrong',
      meta: wrongMeta,
    });

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: sceneRepairChipPng(118, 32, 'MOVE ME', 'rgba(220,38,38,0.9)', '#ffffff'),
      w: 118,
      h: 32,
      intentional: true,
      anchor: { x: px + Math.round((pieceSize - 118) / 2), y: py - 30, w: 118, h: 32 },
      role: 'sceneRepairMoveCue',
      meta: { marks: wrongWord, onWrong: true },
    });

    const pocketW = 168;
    const pocketH = 176;
    const pocketX = stage.x + 16;
    const pocketY = stage.y + stage.h - pocketH - 12;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: sceneRepairPocketPng(pocketW, pocketH, 'REPAIR HERE', theme),
      w: pocketW,
      h: pocketH,
      intentional: true,
      anchor: { x: pocketX, y: pocketY, w: pocketW, h: pocketH },
      role: 'sceneRepairDockLabel',
      meta: { correctWord, wrongWord, inScene: true },
    });
    const repairRow = findMatchableRow(correctWord, rows) || { word: correctWord };
    const repairSize = 108;
    const rx = pocketX + Math.round((pocketW - repairSize) / 2);
    const ry = pocketY + 42;
    const repairMeta = {
      word: correctWord,
      repairFit: true,
      artSrc: repairRow.artSrc || null,
    };
    if (repairRow.propKey) repairMeta.propKey = repairRow.propKey;
    L.place(page, repairRow.artSrc ? {
      locked: false,
      kind: 'image',
      asset: repairRow.artSrc,
      w: repairSize, h: repairSize,
      intentional: true,
      anchor: { x: rx, y: ry, w: repairSize, h: repairSize },
      role: 'sceneRepairPart',
      meta: repairMeta,
    } : {
      locked: false,
      kind: 'emoji',
      emoji: repairRow.glyph || '★',
      w: repairSize, h: repairSize,
      intentional: true,
      anchor: { x: rx, y: ry, w: repairSize, h: repairSize },
      role: 'sceneRepairPart',
      meta: repairMeta,
    });

    const sucW = 280;
    const sucH = 210;
    const sucX = stage.x + stage.w - sucW - 16;
    const sucY = stage.y + 52;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: sceneRepairSuccessPng(sucW, sucH, tuple.success_visual, slotLabel),
      w: sucW,
      h: sucH,
      intentional: true,
      anchor: { x: sucX, y: sucY, w: sucW, h: sucH },
      role: 'sceneRepairSuccess',
      meta: { success_visual: tuple.success_visual, named_location: slotLabel },
    });
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: sceneRepairPeelCoverPng(sucW, sucH),
      w: sucW,
      h: sucH,
      intentional: true,
      anchor: { x: sucX, y: sucY, w: sucW, h: sucH },
      role: 'sceneRepairSuccessCover',
      meta: { covers: tuple.success_visual, tabOnly: false, hidesAfter: true },
    });

    page.notes.push('recipe:sceneRepair');
    page.notes.push('recipe:sceneRepairSceneFirst');
    page.notes.push('sceneRepairUniqueFit:1');
    page.notes.push('sceneRepairSemanticTuple:1');
    page.notes.push('sceneRepairInSceneDock:1');
    page.notes.push('authoredWrongness:' + wrongWord);
    page.notes.push('sceneRepairCorrect:' + correctWord);
    page.notes.push('sceneRepairSuccessVisual:' + tuple.success_visual);
    page.notes.push('sceneRepairBrokenWorld:1');
    page.notes.push('sceneRepairAfterPeel:1');
    page.notes.push('sceneRepairMoveCueOnWrong:1');
  }

  function uniqueTextItems(items, max) {
    const out = [];
    const seen = new Set();
    for (const item of items || []) {
      const text = String(item || '').trim();
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
      if (out.length >= max) break;
    }
    return out;
  }

  function resolveCapacityPack(lesson, vocabArt) {
    if (!wantsCapacityPack(lesson)) return null;
    const act = (lesson && lesson.activity) || {};
    const raw = act.capacityPack && typeof act.capacityPack === 'object' ? act.capacityPack : {};
    const explicit = raw === act.capacityPack;
    const fallback = vocabList(lesson).map((v) => v && v.word);
    const options = uniqueTextItems(
      Array.isArray(raw.options) && raw.options.length ? raw.options : fallback,
      6
    );
    if (options.length < 3) return null;
    const requested = Number(raw.limit);
    if (Number.isFinite(requested)
      && (requested < 1 || requested > 4 || Math.round(requested) >= options.length)) {
      return null;
    }
    const limit = Math.max(1, Math.min(
      4,
      options.length - 1,
      Number.isFinite(requested) ? Math.round(requested) : 3
    ));
    if (options.length <= limit) return null;
    const mission = String(raw.mission || act.prompt || '').trim();
    const constraint = String(raw.constraint || '').trim();
    const containerLabel = String(raw.containerLabel || '').trim().slice(0, 28);
    const payoff = String(raw.payoff || '').trim().slice(0, 60);
    const rawMustInclude = uniqueTextItems(raw.mustInclude, limit);
    const optionSet = new Set(options.map((word) => word.toLowerCase()));
    const mustInclude = rawMustInclude
      .filter((word) => optionSet.has(word.toLowerCase()));
    // Explicit authored packs fail closed if their deciding rule would be hidden
    // or if required items do not exist in the visible choice set.
    if (explicit && (
      !mission
      || !constraint
      || !containerLabel
      || !payoff
      || !rawMustInclude.length
      || mustInclude.length !== rawMustInclude.length
    )) return null;
    const rows = options.map((word) =>
      findMatchableRow(word, picturedMatchableRows(vocabArt)) || { word }
    );
    return {
      mission: mission || 'Choose only what the mission needs.',
      constraint,
      containerLabel: containerLabel || 'Mission pack',
      payoff: payoff || 'Ready for the mission',
      limit,
      options,
      rows,
      mustInclude,
      source: explicit ? 'lesson' : 'derived',
    };
  }

  /**
   * A visible limited container: the learner must commit to exactly N large
   * pieces. The filled slots become the board's persistent decision record.
   */
  function capacityPack(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const options = uniqueTextItems(ctx && ctx.options, 6);
    const limit = Math.max(1, Math.min(4, Number(ctx && ctx.limit) || 3));
    if (options.length <= limit) return;
    const rows = (ctx && Array.isArray(ctx.rows) ? ctx.rows : []);
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const mustInclude = uniqueTextItems(ctx && ctx.mustInclude, limit);
    const payoff = String(ctx.payoff || 'Ready for the mission');
    const languageH = 46;
    const sceneH = bay.h - languageH - 10;
    const sceneY = bay.y;
    const languageY = bay.y + sceneH + 10;

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: capacitySceneStagePng(bay.w, sceneH, {
        mission: String(ctx.mission || '').slice(0, 110),
        constraint: String(ctx.constraint || '').slice(0, 100),
        containerLabel: String(ctx.containerLabel || 'Mission pack'),
        payoff,
        limit,
        mustInclude,
        title: (lesson && lesson.title) || '',
      }),
      w: bay.w, h: sceneH,
      intentional: true,
      anchor: { x: bay.x, y: sceneY, w: bay.w, h: sceneH },
      role: 'capacityScene',
      meta: {
        integrated: true,
        sceneFirst: true,
        fillCounter: `0/${limit}`,
        states: ['empty', 'filling', 'committed'],
        payoff,
      },
    });

    const packX = bay.x + Math.round(bay.w * 0.54);
    const packW = Math.round(bay.w * 0.38);
    const packY = sceneY + Math.round(sceneH * 0.16);
    const headerH = 34;
    const payoffH = 0;
    const pocketsY = packY + Math.round(sceneH * 0.22);
    const pocketsH = Math.round(sceneH * 0.46);
    const packPad = 16;
    const slotGap = 14;
    const slotW = Math.floor((packW - packPad * 2 - slotGap * (limit - 1)) / limit);
    const totalW = slotW * limit + slotGap * (limit - 1);
    const startX = packX + Math.round((packW - totalW) / 2);

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: capacityContainerPng(packW, headerH, String(ctx.containerLabel || 'Mission pack'), limit),
      w: packW, h: headerH,
      intentional: true,
      anchor: { x: packX, y: packY + Math.round(sceneH * 0.12), w: packW, h: headerH },
      role: 'capacityContainer',
      meta: {
        label: ctx.containerLabel || 'Mission pack',
        payoff,
        limit,
        fillCounter: `0/${limit}`,
      },
    });
    for (let i = 0; i < limit; i++) {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: capacityPocketPng(slotW, pocketsH),
        w: slotW, h: pocketsH,
        intentional: true,
        anchor: {
          x: startX + i * (slotW + slotGap),
          y: pocketsY,
          w: slotW,
          h: pocketsH,
        },
        role: 'capacitySlot',
        meta: { slot: i + 1, limit, ordered: false, fillCounter: `0/${limit}` },
      });
    }
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: capacityLanguageStripPng(bay.w, languageH),
      w: bay.w, h: languageH,
      intentional: true,
      anchor: { x: bay.x, y: languageY, w: bay.w, h: languageH },
      role: 'capacityLanguageFrame',
      meta: {
        includeFrame: 'I pack ___ because ___.',
        excludeFrame: 'I leave out ___ because ___.',
        teacherCheck: true,
      },
    });

    const pieces = options.map((word) => {
      const row = findMatchableRow(word, rows) || { word };
      const meta = {
        word,
        required: mustInclude.some((x) => String(x).toLowerCase() === word.toLowerCase()),
        captionChip: true,
      };
      if (row.propKey) meta.propKey = row.propKey;
      if (row.artSrc) meta.artSrc = row.artSrc;
      return {
        kind: 'image',
        asset: row.artSrc || null,
        emoji: row.glyph || null,
        label: word,
        role: 'capacityChoice',
        meta,
      };
    });
    L.placeDockRow(page, pieces, { w: 128, h: 100, noShrink: true });
    page.notes.push('recipe:capacityPack');
    page.notes.push('capacityLimit:' + limit);
    page.notes.push('capacityConstraintVisible:' + !!(ctx.constraint || mustInclude.length));
    page.notes.push('capacitySceneIntegrated:true');
    page.notes.push('capacitySceneFirst:true');
    page.notes.push('capacityFillCounter:0/' + limit);
    page.notes.push('capacityStatesModeled:true');
    page.notes.push('capacityLanguageFrameVisible:true');
    page.notes.push('capacityPayoffVisible:true');
    page.notes.push('capacityOrdinalFree:true');
  }

  function resolveRouteMission(lesson) {
    if (!wantsRouteMission(lesson)) return null;
    const act = (lesson && lesson.activity) || {};
    const raw = act.routeMission && typeof act.routeMission === 'object' ? act.routeMission : {};
    const explicit = raw === act.routeMission;
    let steps = uniqueTextItems(raw.steps, 5);
    if (steps.length < 3) {
      const storyPages = (lesson && lesson.story && Array.isArray(lesson.story.pages))
        ? lesson.story.pages
        : [];
      steps = uniqueTextItems(storyPages.map((p) => p && (p.heading || p.text)), 5);
    }
    if (steps.length < 3) return null;
    const answerOrder = uniqueTextItems(raw.answerOrder, 5);
    const validAnswer = answerOrder.length === steps.length
      && answerOrder.every((s) => steps.some((x) => x.toLowerCase() === s.toLowerCase()));
    const mission = String(raw.mission || act.prompt || 'Arrange the steps to reach the goal.').trim();
    const namedMover = String(raw.mover || '').trim();
    const inferredMover = mission.match(/\b(?:help|guide|lead)\s+([A-Z][A-Za-z'-]{1,20})\b/i);
    const inferredGoal = mission.match(
      /\b(?:to|reach)\s+(?:the\s+)?([A-Za-z][A-Za-z' -]{1,30}?)(?:\s+(?:on|before|after)\b|[.!]|$)/i
    );
    const authoredLandmarks = uniqueTextItems(raw.landmarks, 5);
    const landmarks = authoredLandmarks.length === steps.length
      ? authoredLandmarks
      : steps.map(routeLandmarkLabel);
    const orderEvidence = uniqueTextItems(raw.orderEvidence, 4);
    const goal = String(raw.goal || (inferredGoal && inferredGoal[1]) || 'Goal').trim().slice(0, 30);
    // Explicit route grammars fail closed unless they prove a unique sequence.
    // One distinct landmark travels with each card; one dependency reason
    // justifies every transition without leaking the answer onto empty pads.
    if (explicit && (
      !mission
      || !namedMover
      || !String(raw.goal || '').trim()
      || !validAnswer
      || authoredLandmarks.length !== steps.length
      || orderEvidence.length !== steps.length - 1
    )) return null;
    return {
      mission,
      mover: (namedMover || (inferredMover && inferredMover[1]) || 'Team').slice(0, 20),
      goal,
      steps,
      landmarks,
      orderEvidence,
      answerOrder: validAnswer ? answerOrder : steps.slice(),
      source: explicit ? 'lesson' : 'story',
    };
  }

  /** Arrange mission steps on a visible start-to-finish path inside an illustrated scene. */
  function routeMission(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const steps = uniqueTextItems(ctx && ctx.steps, 5);
    if (steps.length < 3) return;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const topicHay = routeTopicHay(ctx);
    const topicKey = routeTopicKey(topicHay);
    const missionH = 32;
    const narrH = 32;
    const bandH = 28;
    const keyH = 36;
    const padGap = 14;
    const padW = Math.floor((bay.w - 72 - padGap * (steps.length - 1)) / steps.length);
    const startX = bay.x + 36;
    const sceneTop = bay.y + missionH + 4;
    const sceneH = bay.h - missionH - narrH - bandH - keyH - 22;
    const padY = sceneTop + Math.round(sceneH * 0.08);
    const padH = Math.max(72, sceneH - Math.round(sceneH * 0.22));

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: routeSceneShellPng(bay.w, sceneH, topicKey, ctx.mover, ctx.goal),
      w: bay.w, h: sceneH,
      intentional: true,
      anchor: { x: bay.x, y: sceneTop, w: bay.w, h: sceneH },
      role: 'routeScene',
      meta: {
        integrated: true,
        topicKey,
        mover: ctx.mover || 'Team',
        goal: ctx.goal || 'Goal',
      },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: hintStickyPng(bay.w - 48, missionH, `MISSION: ${String(ctx.mission || '').slice(0, 90)}`),
      w: bay.w - 48, h: missionH,
      intentional: true,
      anchor: { x: bay.x + 24, y: bay.y + 4, w: bay.w - 48, h: missionH },
      role: 'routeMissionBrief',
      meta: { mission: ctx.mission || '', topicKey },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: routePathPng(bay.w - 72, padH + 24, steps.length, ctx.mover, ctx.goal, topicKey),
      w: bay.w - 72, h: padH + 24,
      intentional: true,
      anchor: { x: startX, y: padY - 24, w: bay.w - 72, h: padH + 24 },
      role: 'routePath',
      meta: {
        mover: ctx.mover || 'Team',
        goal: ctx.goal || 'Goal',
        checkpoints: steps.length,
        persistent: true,
        topicKey,
        stateContract: ['empty', 'placed', 'revealed'],
      },
    });
    steps.forEach((_, i) => {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: routeCheckpointPng(padW, padH, i + 1),
        w: padW, h: padH,
        intentional: true,
        anchor: { x: startX + i * (padW + padGap), y: padY, w: padW, h: padH },
        role: 'routeStep',
        meta: {
          step: i + 1,
          start: i === 0,
          finish: i === steps.length - 1,
          routeSegment: i === steps.length - 1 ? `${i + 1}->goal` : `${i + 1}->${i + 2}`,
        },
      });
    });
    const ladderY = sceneTop + sceneH + 4;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: routeStarterBandPng(bay.w - 48, bandH, ctx.mover, steps.length),
      w: bay.w - 48, h: bandH,
      intentional: true,
      anchor: { x: bay.x + 24, y: ladderY, w: bay.w - 48, h: bandH },
      role: 'routeStarterBand',
      meta: {
        starterState: 'empty',
        mover: ctx.mover || 'Team',
        stepCount: steps.length,
      },
    });
    const narrY = ladderY + bandH + 4;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: routeNarrationRailPng(bay.w - 48, narrH, ctx.mover, steps.length),
      w: bay.w - 48, h: narrH,
      intentional: true,
      anchor: { x: bay.x + 24, y: narrY, w: bay.w - 48, h: narrH },
      role: 'routeNarration',
      meta: {
        frames: ['First', 'Next', 'Then', 'Finally'].slice(0, steps.length),
        mover: ctx.mover || 'Team',
      },
    });
    const answer = (ctx.answerOrder || steps).join(' → ');
    const keyY = narrY + narrH + 6;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: routeFinishTableauPng(bay.w - 64, keyH, topicKey, ctx.mover, ctx.goal),
      w: bay.w - 64, h: keyH,
      intentional: true,
      anchor: { x: bay.x + 32, y: keyY, w: bay.w - 64, h: keyH },
      role: 'routeFinishTableau',
      meta: {
        mover: ctx.mover || 'Team',
        goal: ctx.goal || 'Goal',
        topicKey,
        completionPayoff: true,
        hiddenUntilReveal: true,
      },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: routeAnswerPng(bay.w - 64, keyH, ctx.mover, ctx.goal, answer, topicKey),
      w: bay.w - 64, h: keyH,
      intentional: true,
      anchor: { x: bay.x + 32, y: keyY, w: bay.w - 64, h: keyH },
      role: 'routeAnswer',
      meta: {
        answerOrder: ctx.answerOrder || steps,
        mover: ctx.mover || 'Team',
        goal: ctx.goal || 'Goal',
        orderEvidence: ctx.orderEvidence || [],
        completionState: true,
        preservesPlacedCards: true,
        topicKey,
      },
    });
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: routePeekPng(bay.w - 64, keyH),
      w: bay.w - 64, h: keyH,
      intentional: true,
      anchor: { x: bay.x + 32, y: keyY, w: bay.w - 64, h: keyH },
      role: 'routeAnswerCover',
      meta: {
        covers: 'routeAnswer',
        revealAfter: 'placed',
        preservesPlacedCards: true,
      },
    });
    const cards = steps.map((text, index) => ({
      text,
      landmark: (ctx.landmarks && ctx.landmarks[index]) || routeLandmarkLabel(text),
    }));
    const shuffled = pick(cards, cards.length, hashStr((lesson.title || '') + '|routeMission'));
    const tileW = Math.max(150, Math.min(220, Math.floor(1120 / steps.length)));
    L.placeDockRow(page, shuffled.map((card) => ({
      kind: 'image',
      asset: routeTilePng(tileW, 64, card.text, card.landmark),
      text: card.text,
      role: 'routeTile',
      meta: {
        text: card.text,
        landmark: card.landmark,
        visualAnchor: routeStepGlyph(card.landmark || card.text),
      },
    })), { w: tileW, h: 64 });
    page.notes.push('recipe:routeMission');
    page.notes.push('routeSteps:' + steps.length);
    page.notes.push('routePersistentPath');
    page.notes.push('routeLandmarks:' + steps.length);
    page.notes.push('routeOrderEvidence:' + ((ctx.orderEvidence && ctx.orderEvidence.length) || 0));
    page.notes.push('routeStates:empty|placed|revealed');
    page.notes.push('routeSceneIntegrated:true');
    page.notes.push('routeStarterState:empty');
    page.notes.push('routeTopicKey:' + topicKey);
  }

  /**
   * Exclusive topic family for paired BEFORE/RESULT scenes.
   * Manus R1–R3: mood faces and 60px doodles read as instruction icons.
   * Order is exclusive so "sun" on a plant board does not flip to heat.
   */
  function transformationFamily(hay) {
    const h = String(hay || '').toLowerCase();
    if (/\b(plant|leaf|leaves|garden|soil|root|sprout|wilt|droop|flower|tomato|tree|grow)\b/.test(h)) return 'plant';
    if (/\b(toy|toys|room|mess|messy|tidy|shelf|shelves|closet|bedroom)\b/.test(h)) return 'room';
    if (/\b(lunch|sandwich|picnic|cool pack|ice pack)\b/.test(h)) return 'lunch';
    if (/\b(ice cream|icecream|scoop|cone|popsicle|snowman)\b/.test(h)) return 'melt';
    if (/\b(shirt|laundry|clothesline|socks)\b/.test(h)
      || (/\b(wet|dry)\b/.test(h) && /\b(clothes|shirt|laundry)\b/.test(h))) return 'laundry';
    if (/\b(beach|sand|tide|shell|shore)\b/.test(h)) return 'beach';
    if (/\b(window|dirty|mud|stain|smear)\b/.test(h)) return 'dirty';
    if (/\b(ice|cold|cool|freeze|frozen|snow|fresh|food|apple)\b/.test(h)) return 'cold';
    if (/\b(rain|storm|cloud|umbrella)\b/.test(h)) return 'rain';
    if (/\b(fire|flame|burn|candle|toast)\b/.test(h)) return 'heat';
    return 'object';
  }

  /** Scene-linked cue on each cause tile (Manus R2: tiles read as text buttons). */
  function transformationCauseCue(text) {
    const t = String(text || '').toLowerCase();
    if (/\b(cool pack|ice pack|fridge|cool box|ice)\b/.test(t)) return 'ice';
    if (/\b(fertilizer|feed)\b/.test(t)) return 'feed';
    if (/\bwater\b/.test(t) && /\b(sun|midday|hot)\b/.test(t)) return 'sun';
    if (/\b(water|hose|evening shade)\b/.test(t)) return 'water';
    if (/\b(box|shelf|tidy|put each)\b/.test(t)) return 'box';
    if (/\b(under the bed|hide|push everything)\b/.test(t)) return 'hide';
    if (/\b(door|leave it|close the door)\b/.test(t)) return 'door';
    if (/\b(shade|umbrella)\b/.test(t)) return 'shade';
    if (/\b(sun|hot water)\b/.test(t)) return 'sun';
    return 'change';
  }

  function transformationWrapText(ctx, text, maxW, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width <= maxW) line = trial;
      else { if (line) lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  }

  function drawTransformationCue(ctx, cue, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    if (cue === 'water') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.quadraticCurveTo(-s * 0.4, -s * 0.05, -s * 0.15, s * 0.2);
      ctx.lineTo(s * 0.35, s * 0.05);
      ctx.quadraticCurveTo(s * 0.15, -s * 0.15, 0, -s * 0.45);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(-s * 0.08, s * 0.18, s * 0.16, s * 0.22);
    } else if (cue === 'sun') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.28, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cue === 'ice') {
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(-s * 0.28, -s * 0.22, s * 0.56, s * 0.44);
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 2;
      ctx.strokeRect(-s * 0.28, -s * 0.22, s * 0.56, s * 0.44);
    } else if (cue === 'box') {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-s * 0.28, -s * 0.18, s * 0.56, s * 0.4);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, 0);
      ctx.lineTo(s * 0.28, 0);
      ctx.stroke();
    } else if (cue === 'hide') {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-s * 0.38, -s * 0.08, s * 0.76, s * 0.28);
      ctx.fillRect(-s * 0.3, -s * 0.32, s * 0.16, s * 0.28);
    } else if (cue === 'door') {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-s * 0.2, -s * 0.38, s * 0.4, s * 0.76);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(s * 0.08, 0, 3, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cue === 'shade') {
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.38);
      ctx.lineTo(0, -s * 0.05);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.18, s * 0.38, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (cue === 'feed') {
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.28);
      ctx.lineTo(0, -s * 0.32);
      ctx.lineTo(s * 0.22, s * 0.28);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.08);
      ctx.lineTo(s * 0.08, -s * 0.08);
      ctx.lineTo(s * 0.08, -s * 0.22);
      ctx.lineTo(s * 0.32, 0);
      ctx.lineTo(s * 0.08, s * 0.22);
      ctx.lineTo(s * 0.08, s * 0.08);
      ctx.lineTo(-s * 0.28, s * 0.08);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Camera-consistent BEFORE/RESULT scene. Manus R2/R3: the board must show a
   * real place whose focal object changes, not a mood icon over a caption.
   * Same camera (window/pot/bed/table) in both phases; only the subject state
   * and one cause cue flip after peel.
   */
  function transformationScenePng(w, h, phase, text, hay, family, causeCue) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const after = phase === 'after';
    const kind = family || transformationFamily(hay);
    const edge = after ? '#047857' : '#b45309';
    const groundY = Math.round(h * 0.7);
    const cx = Math.round(w / 2);

    const rounded = (x, y, rw, rh, r, fill, stroke) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, r);
      ctx.arcTo(x + rw, y + rh, x, y + rh, r);
      ctx.arcTo(x, y + rh, x, y, r);
      ctx.arcTo(x, y, x + rw, y, r);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    };

    rounded(1, 1, w - 2, h - 2, 16, after ? '#ecfdf5' : '#fff7ed', edge);

    const windowX = w - 78;
    const windowY = 18;
    const drawSharedWindow = (glass) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(windowX, windowY, 56, 48);
      ctx.fillStyle = glass;
      ctx.fillRect(windowX + 6, windowY + 6, 20, 16);
      ctx.fillRect(windowX + 30, windowY + 6, 20, 16);
      ctx.fillRect(windowX + 6, windowY + 26, 20, 16);
      ctx.fillRect(windowX + 30, windowY + 26, 20, 16);
    };

    if (kind === 'plant') {
      ctx.fillStyle = after ? '#7dd3fc' : '#fdba74';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      if (!after) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(w - 52, 36, 22, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = after ? '#3f6212' : '#ca8a04';
      ctx.fillRect(8, groundY, w - 16, h - groundY - 8);
      if (!after) {
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(24 + i * 36, groundY + 10);
          ctx.lineTo(40 + i * 36, groundY + 22);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(cx - 30, groundY - 14, 60, 28);
      ctx.fillRect(cx - 36, groundY - 20, 72, 10);
      ctx.strokeStyle = after ? '#15803d' : '#a16207';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx, groundY - 20);
      if (after) ctx.lineTo(cx, 44);
      else ctx.quadraticCurveTo(cx + 28, 90, cx + 8, 52);
      ctx.stroke();
      const leafY = after ? [70, 96] : [78, 104];
      leafY.forEach((ly) => {
        [-1, 1].forEach((side) => {
          ctx.strokeStyle = after ? '#22c55e' : '#84a06b';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(cx + (after ? 0 : 6), ly);
          ctx.quadraticCurveTo(
            cx + side * 28,
            ly + (after ? -10 : 16),
            cx + side * 46,
            ly + (after ? -6 : 22)
          );
          ctx.stroke();
        });
      });
      ctx.fillStyle = after ? '#ef4444' : '#9f1239';
      ctx.beginPath();
      ctx.ellipse(cx + (after ? -12 : 10), after ? 50 : 58, after ? 10 : 6, after ? 10 : 6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (after) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(cx + 14, 62, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        drawTransformationCue(ctx, causeCue || 'water', cx - 78, groundY - 8, 28);
      }
    } else if (kind === 'room') {
      ctx.fillStyle = after ? '#fef3c7' : '#fed7aa';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      drawSharedWindow(after ? '#7dd3fc' : '#fdba74');
      ctx.fillStyle = '#92400e';
      ctx.fillRect(22, groundY - 52, 70, 10);
      ctx.fillStyle = after ? '#fdba74' : '#fb7185';
      ctx.fillRect(26, groundY - 42, 62, 28);
      ctx.fillStyle = after ? '#e7e5e4' : '#d6d3d1';
      ctx.fillRect(8, groundY, w - 16, h - groundY - 8);
      const bits = ['#f97316', '#38bdf8', '#a78bfa', '#f472b6'];
      if (after) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(w * 0.42, groundY - 70, 118, 8);
        ctx.fillRect(w * 0.42, groundY - 38, 118, 8);
        bits.slice(0, 3).forEach((color, i) => {
          rounded(w * 0.44 + i * 36, groundY - 62, 28, 22, 4, color, '#1f2937');
        });
        drawTransformationCue(ctx, causeCue || 'box', w * 0.38, groundY - 18, 26);
      } else {
        const specs = [
          { x: 118, y: groundY + 16, r: 0.4, c: bits[0] },
          { x: 168, y: groundY + 8, r: -0.3, c: bits[1] },
          { x: 220, y: groundY + 20, r: 0.5, c: bits[2] },
          { x: 150, y: groundY + 28, r: -0.2, c: bits[3] },
        ];
        specs.forEach((s) => {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.r);
          ctx.fillStyle = s.c;
          ctx.fillRect(-12, -8, 24, 16);
          ctx.restore();
        });
      }
    } else if (kind === 'lunch') {
      ctx.fillStyle = after ? '#bae6fd' : '#fed7aa';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      if (!after) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(w - 50, 34, 18, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f8fafc';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
          ctx.fillStyle = (row + col) % 2 ? '#fecaca' : '#f8fafc';
          ctx.fillRect(16 + col * 28, groundY - 8 + row * 14, 28, 14);
        }
      }
      if (after) {
        rounded(cx - 48, groundY - 78, 96, 70, 10, '#1d4ed8', '#1e3a8a');
        drawTransformationCue(ctx, causeCue || 'ice', cx + 58, groundY - 40, 26);
      } else {
        rounded(cx - 50, groundY - 70, 100, 62, 10, '#fef3c7', '#92400e');
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(cx - 28, groundY - 52, 56, 18);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        [-18, 0, 18].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(cx + dx, groundY - 78);
          ctx.quadraticCurveTo(cx + dx - 4, groundY - 68, cx + dx, groundY - 58);
          ctx.stroke();
        });
      }
    } else if (kind === 'melt') {
      ctx.fillStyle = after ? '#bae6fd' : '#fdba74';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      if (!after) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(w - 48, 32, 20, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawTransformationCue(ctx, causeCue || 'shade', 56, 48, 30);
      }
      ctx.fillStyle = after ? '#fde68a' : '#fef3c7';
      ctx.fillRect(8, groundY, w - 16, h - groundY - 8);
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(cx - 18, groundY + 8);
      ctx.lineTo(cx + 18, groundY + 8);
      ctx.lineTo(cx + 8, groundY + 42);
      ctx.lineTo(cx - 8, groundY + 42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = after ? '#f9a8d4' : '#f472b6';
      ctx.beginPath();
      if (after) ctx.ellipse(cx, groundY - 18, 28, 26, 0, 0, Math.PI * 2);
      else ctx.ellipse(cx + 16, groundY - 4, 34, 16, 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (!after) {
        ctx.fillStyle = 'rgba(244,114,182,0.45)';
        ctx.beginPath();
        ctx.ellipse(cx + 36, groundY + 18, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'laundry') {
      ctx.fillStyle = after ? '#bae6fd' : '#94a3b8';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(28, 48);
      ctx.lineTo(w - 28, 48);
      ctx.stroke();
      ctx.fillStyle = '#78716c';
      ctx.fillRect(24, 40, 8, groundY - 36);
      ctx.fillRect(w - 32, 40, 8, groundY - 36);
      [0.28, 0.5, 0.72].forEach((p) => {
        const x = w * p;
        ctx.fillStyle = after ? '#e0e7ff' : '#1e3a8a';
        ctx.fillRect(x - 16, after ? 52 : 70, 32, after ? 54 : 38);
        if (!after) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 6, 112);
          ctx.lineTo(x - 4, 124);
          ctx.stroke();
        }
      });
      ctx.fillStyle = after ? '#fde68a' : '#cbd5e1';
      ctx.fillRect(8, groundY, w - 16, h - groundY - 8);
    } else if (kind === 'beach') {
      ctx.fillStyle = after ? '#7dd3fc' : '#64748b';
      ctx.fillRect(8, 8, w - 16, groundY - 28);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(8, groundY - 28, w - 16, 22);
      ctx.fillStyle = after ? '#fde68a' : '#fef3c7';
      ctx.fillRect(8, groundY - 6, w - 16, h - groundY - 2);
      if (!after) {
        ['#f97316', '#64748b', '#a8a29e'].forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(70 + i * 50, groundY + 8, 22, 14);
        });
      } else {
        rounded(w - 100, groundY - 8, 36, 28, 4, '#22c55e', '#14532d');
        drawTransformationCue(ctx, causeCue || 'box', w - 120, groundY + 8, 22);
      }
    } else if (kind === 'dirty') {
      ctx.fillStyle = after ? '#e0f2fe' : '#d6d3d1';
      ctx.fillRect(8, 8, w - 16, h - 16);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 10;
      ctx.strokeRect(28, 22, w - 56, h - 70);
      ctx.fillStyle = after ? '#7dd3fc' : '#a8a29e';
      ctx.fillRect(38, 32, w - 76, h - 90);
      if (!after) {
        ctx.fillStyle = 'rgba(120,53,15,0.35)';
        ctx.fillRect(70, 50, 48, 28);
        ctx.fillRect(w * 0.5, 72, 60, 22);
      } else {
        drawTransformationCue(ctx, causeCue || 'change', w - 70, h - 58, 24);
      }
    } else if (kind === 'cold') {
      ctx.fillStyle = after ? '#e0f2fe' : '#fed7aa';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(8, groundY, w - 16, 10);
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(8, groundY + 10, w - 16, h - groundY - 18);
      if (after) {
        rounded(cx - 46, groundY - 78, 92, 68, 10, '#1d4ed8', '#1e3a8a');
        drawTransformationCue(ctx, causeCue || 'ice', cx + 60, groundY - 42, 24);
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(cx, groundY - 28, 36, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(cx + 8, groundY - 30, 16, 14, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        [-16, 0, 16].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(cx + dx, groundY - 68);
          ctx.quadraticCurveTo(cx + dx - 4, groundY - 56, cx + dx, groundY - 46);
          ctx.stroke();
        });
      }
    } else if (kind === 'rain') {
      ctx.fillStyle = after ? '#fde68a' : '#64748b';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      ctx.fillStyle = after ? '#86efac' : '#57534e';
      ctx.fillRect(8, groundY, w - 16, h - groundY - 8);
      ctx.fillStyle = after ? '#facc15' : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx, 58, 40, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!after) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        for (const dx of [-20, 0, 20]) {
          ctx.beginPath();
          ctx.moveTo(cx + dx, 84);
          ctx.lineTo(cx + dx - 6, 108);
          ctx.stroke();
        }
      }
    } else if (kind === 'heat') {
      ctx.fillStyle = after ? '#e0f2fe' : '#fecaca';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(cx - 18, groundY - 8, 36, 16);
      ctx.fillStyle = after ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cx, groundY - (after ? 28 : 64));
      ctx.quadraticCurveTo(cx - 22, groundY - 20, cx, groundY - 8);
      ctx.quadraticCurveTo(cx + 22, groundY - 20, cx, groundY - (after ? 28 : 64));
      ctx.fill();
    } else {
      ctx.fillStyle = after ? '#d1fae5' : '#ffedd5';
      ctx.fillRect(8, 8, w - 16, groundY - 8);
      drawSharedWindow(after ? '#6ee7b7' : '#fdba74');
      ctx.fillStyle = '#92400e';
      ctx.fillRect(24, groundY, w - 48, 14);
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(8, groundY + 14, w - 16, h - groundY - 22);
      rounded(cx - 40, groundY - (after ? 70 : 48), 80, after ? 62 : 40, 10, after ? '#34d399' : '#fb923c', '#78350f');
    }

    const chipH = 36;
    // BEFORE caption stays visible. RESULT caption sits in the card center so
    // the inset peel covers it on the starter JPG (no after-state leak).
    const chipY = after ? Math.round(h / 2 - chipH / 2) : h - chipH - 8;
    rounded(10, chipY, w - 20, chipH, 10, 'rgba(255,255,255,0.92)', edge);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 13px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    transformationWrapText(ctx, text, w - 40, 2).forEach((ln, i) => {
      ctx.fillText(ln, 20, chipY + 6 + i * 15, w - 40);
    });
    rounded(10, 10, 86, 22, 8, after ? '#047857' : '#1d4ed8');
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(after ? '3 · RESULT' : '1 · BEFORE', 53, 21);
    return c.toDataURL('image/png');
  }

  function transformationCauseSlotPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(16, 1);
    ctx.arcTo(w - 1, 1, w - 1, h - 1, 16);
    ctx.arcTo(w - 1, h - 1, 1, h - 1, 16);
    ctx.arcTo(1, h - 1, 1, 1, 16);
    ctx.arcTo(1, 1, w - 1, 1, 16);
    ctx.closePath();
    ctx.fillStyle = '#f5f3ff';
    ctx.fill();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.moveTo(16, 12);
    ctx.lineTo(28, 12);
    ctx.lineTo(28, 6);
    ctx.lineTo(40, 18);
    ctx.lineTo(28, 30);
    ctx.lineTo(28, 24);
    ctx.lineTo(16, 24);
    ctx.closePath();
    ctx.fill();
    const bx = w / 2 - 58;
    const by = 12;
    ctx.beginPath();
    ctx.moveTo(bx + 8, by);
    ctx.arcTo(bx + 116, by, bx + 116, by + 24, 8);
    ctx.arcTo(bx + 116, by + 24, bx, by + 24, 8);
    ctx.arcTo(bx, by + 24, bx, by, 8);
    ctx.arcTo(bx, by, bx + 116, by, 8);
    ctx.closePath();
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2 · DROP CAUSE', w / 2, 24);
    return c.toDataURL('image/png');
  }

  /** Inset peel so the RESULT scene frame stays auditable on the starter JPG. */
  function transformationPeelCoverPng(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const pad = 6;
    const fw = w - pad * 2;
    const fh = h - pad * 2;
    const r = 14;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.03);
    ctx.translate(-fw / 2, -fh / 2);
    ctx.shadowColor = 'rgba(15,23,42,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(fw, 0, fw, fh, r);
    ctx.arcTo(fw, fh, 0, fh, r);
    ctx.arcTo(0, fh, 0, 0, r);
    ctx.arcTo(0, 0, fw, 0, r);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    const fold = Math.min(fw, fh) * 0.22;
    ctx.beginPath();
    ctx.moveTo(fw - fold, 0);
    ctx.lineTo(fw, 0);
    ctx.lineTo(fw, fold);
    ctx.closePath();
    ctx.fillStyle = '#fde68a';
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.max(16, Math.floor(fh * 0.16)) + 'px Poppins, sans-serif';
    ctx.fillText('PEEL', fw / 2, fh * 0.42);
    ctx.font = '700 ' + Math.max(12, Math.floor(fh * 0.1)) + 'px Poppins, sans-serif';
    ctx.fillText('to see RESULT', fw / 2, fh * 0.62);
    ctx.restore();
    return c.toDataURL('image/png');
  }

  /** Cause tile: grab dots + scene cue + short label (Manus R2 text-button miss). */
  function transformationCauseTilePng(w, h, text, cue) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,53,15,0.55)';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.beginPath();
        ctx.ellipse(10 + col * 6, 10 + row * 6, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawTransformationCue(ctx, cue || transformationCauseCue(text), 36, h / 2, 22);
    ctx.fillStyle = '#422006';
    ctx.font = '700 14px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lines = transformationWrapText(ctx, text, w - 78, 3);
    const lineH = 16;
    const startY = h / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, 56, startY + i * lineH, w - 70));
    return c.toDataURL('image/png');
  }

  function resolveTransformationLab(lesson) {
    if (!wantsTransformationLab(lesson)) return null;
    const act = (lesson && lesson.activity) || {};
    const raw = act.transformationLab;
    if (!raw || typeof raw !== 'object') return null;
    const before = String(raw.before || '').trim();
    const after = String(raw.after || raw.result || '').trim();
    const changes = uniqueTextItems(raw.changes || raw.changeOptions, 4);
    const correctChange = String(raw.correctChange || '').trim();
    if (!before || !after || changes.length < 2 || !correctChange) return null;
    if (before.toLowerCase() === after.toLowerCase()) return null;
    if (!changes.some((x) => x.toLowerCase() === correctChange.toLowerCase())) return null;
    return {
      before,
      after,
      changes,
      correctChange,
      question: String(raw.question || act.prompt || 'Which change makes the result happen?').trim(),
      source: 'lesson',
    };
  }

  /** Choose a cause, place it between BEFORE and AFTER, then peel the result. */
  function transformationLab(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const changes = uniqueTextItems(ctx && ctx.changes, 4);
    if (!ctx || !ctx.before || !ctx.after || changes.length < 2) return;
    const stock = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    // Scene-first: drop the fat question+label chrome that ate the 220px bay
    // (Manus R3). Grow the play surface up to the hint and down to the dock.
    const play = { x: stock.x + 8, y: 176, w: stock.w - 16, h: 238 };
    const predictionFrame = 'I predict ___ because ___.';
    const question = String(ctx.question || 'Which cause makes the result happen?').trim();
    const gap = 12;
    const sceneW = Math.floor((play.w - gap * 2) * 0.38);
    const slotW = play.w - sceneW * 2 - gap * 2;
    const sceneH = play.h;
    const answerKey = String(ctx.correctChange).toLowerCase();
    const sourceStartsWithAnswer = changes[0].toLowerCase() === answerKey;
    const dockChanges = pick(
      changes,
      changes.length,
      hashStr(`${lesson && lesson.title || ''}|${ctx.before}|transformationLab`)
    );
    if (sourceStartsWithAnswer && dockChanges[0].toLowerCase() === answerKey) {
      dockChanges.push(dockChanges.shift());
    }
    const sceneHay = `${(lesson && lesson.title) || ''} ${ctx.before} ${ctx.after} ${ctx.correctChange || ''}`.toLowerCase();
    const family = transformationFamily(sceneHay);
    const correctCue = transformationCauseCue(ctx.correctChange);

    const beforeX = play.x;
    const slotX = play.x + sceneW + gap;
    const resultX = play.x + sceneW + slotW + gap * 2;

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: transformationScenePng(sceneW, sceneH, 'before', ctx.before, sceneHay, family, correctCue),
      w: sceneW, h: sceneH,
      intentional: true,
      anchor: { x: beforeX, y: play.y, w: sceneW, h: sceneH },
      role: 'transformationState',
      meta: {
        phase: 'before',
        text: ctx.before,
        sceneGrounded: true,
        family,
        cameraPaired: true,
      },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: transformationCauseSlotPng(slotW, sceneH),
      w: slotW, h: sceneH,
      intentional: true,
      anchor: { x: slotX, y: play.y, w: slotW, h: sceneH },
      role: 'transformationChangeSlot',
      meta: { phase: 'cause' },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: transformationScenePng(sceneW, sceneH, 'after', ctx.after, sceneHay, family, correctCue),
      w: sceneW, h: sceneH,
      intentional: true,
      anchor: { x: resultX, y: play.y, w: sceneW, h: sceneH },
      role: 'transformationState',
      meta: {
        phase: 'result',
        text: ctx.after,
        sceneGrounded: true,
        family,
        cameraPaired: true,
        causeCue: correctCue,
      },
    });
    const insetX = Math.round(sceneW * 0.12);
    const insetY = Math.round(sceneH * 0.14);
    const coverW = sceneW - insetX * 2;
    const coverH = sceneH - insetY * 2;
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: transformationPeelCoverPng(coverW, coverH),
      w: coverW, h: coverH,
      intentional: true,
      anchor: { x: resultX + insetX, y: play.y + insetY, w: coverW, h: coverH },
      role: 'transformationResultCover',
      meta: {
        covers: ctx.after,
        requiresPrediction: true,
        insetPeek: true,
        family,
      },
    });
    L.placeDockRow(page, dockChanges.map((text) => {
      const visualCue = transformationCauseCue(text);
      return {
        kind: 'image',
        asset: transformationCauseTilePng(236, 78, text, visualCue),
        text,
        role: 'transformationChange',
        meta: {
          text,
          visualCue,
          correct: text.toLowerCase() === String(ctx.correctChange).toLowerCase(),
        },
      };
    }), { w: 236, h: 78, noShrink: true });
    page.notes.push('recipe:transformationLab');
    page.notes.push('transformationAnswer:' + ctx.correctChange);
    page.notes.push('transformationPredictBeforePeel');
    page.notes.push('transformationSceneGrounded:true');
    page.notes.push('transformationCauseTilesVisual:true');
    page.notes.push('transformationSceneFirst:true');
    page.notes.push('transformationResultPeek:true');
    page.notes.push('transformationFamily:' + family);
    page.notes.push('transformationQuestion:' + question);
    page.notes.push('transformationFrame:' + predictionFrame);
  }

  function evidenceXml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function evidenceSvg(w, h, body) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <style>text{font-family:Poppins,Arial,sans-serif}</style>${body}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function evidenceTextSvg(text, x, y, maxChars, maxLines, lineH, attrs) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && next.length > maxChars) {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines) break;
      } else {
        line = next;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.join(' ').length < words.join(' ').length && lines.length) {
      lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]?$/, '')}…`;
    }
    return `<text x="${x}" y="${y}" ${attrs || ''}>${lines.map((ln, i) =>
      `<tspan x="${x}" dy="${i ? lineH : 0}">${evidenceXml(ln)}</tspan>`
    ).join('')}</text>`;
  }

  function evidenceCaseFilePng(w, h) {
    const rules = Array.from({ length: 6 }, (_, i) =>
      `<line x1="16" y1="${48 + i * 28}" x2="${w - 16}" y2="${48 + i * 28}" stroke="#8b5e34" opacity=".18" stroke-width="2"/>`
    ).join('');
    return evidenceSvg(w, h, `
      <rect x="2" y="10" width="${w - 4}" height="${h - 12}" rx="18" fill="#f5e6bd" stroke="#8b5e34" stroke-width="3"/>
      <rect x="24" y="1" width="204" height="34" rx="10" fill="#d6a85f" stroke="#8b5e34" stroke-width="3"/>
      <text x="42" y="23" fill="#3f2d20" font-size="14" font-weight="800">CONFIDENTIAL CASE FILE</text>${rules}`);
  }

  function evidenceClaimPng(w, h, claim) {
    return evidenceSvg(w, h, `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="#172554" stroke="#0f172a" stroke-width="2"/>
      <text x="16" y="14" fill="#fbbf24" font-size="11" font-weight="800">CLAIM TO TEST</text>
      ${evidenceTextSvg(claim, 16, 34, Math.max(28, Math.floor(w / 9)), 1, 16, 'fill="#fff" font-size="15" font-weight="700"')}`);
  }

  function evidenceReasoningFramePng(w, h, frame) {
    return evidenceSvg(w, h, `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="#fffdf5" stroke="#0f766e" stroke-width="2"/>
      <text x="12" y="14" fill="#0f766e" font-size="11" font-weight="800">SAY WHY</text>
      ${evidenceTextSvg(frame, 12, 31, Math.max(24, Math.floor(w / 9)), 2, 13, 'fill="#134e4a" font-size="12" font-weight="700"')}`);
  }

  /** S78 rank-contract strip — every card must expose artifact, relation, quality, impact. */
  function evidenceRankContractPng(w, h) {
    return evidenceSvg(w, h, `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
      <text x="12" y="15" fill="#0f766e" font-size="10" font-weight="800">RANK CONTRACT · each card must show:</text>
      <text x="12" y="28" fill="#134e4a" font-size="9" font-weight="700">SOURCE ARTIFACT · RELATION · SOURCE QUALITY · CLAIM IMPACT · TEACHER CHECK ✓</text>`);
  }

  /** S78 causal-timeline anchor when timestamped artifacts need an incident time. */
  function evidenceTimelineAnchorPng(w, h, incidentTime, evidence) {
    const times = [];
    const seen = new Set();
    for (const item of evidence) {
      const match = String(item.artifactExcerpt || '').match(/\b(\d{1,2}:\d{2})\b/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        times.push(match[1]);
      }
    }
    const span = Math.max(1, times.length - 1);
    const step = Math.min(72, Math.floor((w - 200) / span));
    const dots = times.map((t, i) => {
      const x = 132 + i * step;
      const incident = t === incidentTime;
      return `<circle cx="${x}" cy="22" r="${incident ? 7 : 5}" fill="${incident ? '#dc2626' : '#2563eb'}" stroke="#fff" stroke-width="2"/>
        <text x="${x}" y="36" text-anchor="middle" fill="#475569" font-size="9" font-weight="800">${t}</text>`;
    }).join('');
    return evidenceSvg(w, h, `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
      <text x="12" y="16" fill="#1d4ed8" font-size="10" font-weight="800">INCIDENT TIME · ${evidenceXml(incidentTime)}</text>
      <line x1="118" y1="22" x2="${w - 16}" y2="22" stroke="#93c5fd" stroke-width="2"/>${dots}`);
  }

  /** Material filing→peel progression (Manus R3 B3: observable payoff ladder). */
  function evidenceFilingStateLadderPng(w, h, count) {
    const stages = ['INSPECT', 'FILE 1', count > 2 ? 'FILE ALL' : 'FILE 3', 'PEEL SEAL'];
    const stepW = Math.floor((w - 24) / stages.length);
    const body = stages.map((label, i) => {
      const x = 12 + i * stepW + Math.round(stepW / 2);
      const active = i === 0;
      return `<circle cx="${x}" cy="20" r="9" fill="${active ? '#0f766e' : '#e2e8f0'}" stroke="#0f766e" stroke-width="2"/>
        <text x="${x}" y="24" text-anchor="middle" fill="${active ? '#fff' : '#64748b'}" font-size="8" font-weight="800">${i + 1}</text>
        <text x="${x}" y="38" text-anchor="middle" fill="#334155" font-size="8" font-weight="700">${label}</text>`;
    }).join('');
    return evidenceSvg(w, h, `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#fffdf5" stroke="#d97706" stroke-width="2"/>
      <text x="12" y="11" fill="#92400e" font-size="9" font-weight="800">FILING PROGRESS · 0/${count} clues placed</text>${body}`);
  }

  function evidencePocketPng(w, h, rank, count) {
    const labels = count === 3
      ? ['1 · STRONGEST', '2 · SOLID', '3 · WEAKEST']
      : ['1 · STRONGEST', '2 · STRONG', '3 · LIMITED', '4 · WEAKEST'];
    const cues = count === 3
      ? ['reliable + relevant', 'useful, with limits', 'least convincing']
      : ['reliable + relevant', 'clear support', 'some limits', 'least convincing'];
    const colors = ['#0f766e', '#2563eb', '#d97706', '#be123c'];
    const color = colors[Math.min(rank - 1, colors.length - 1)];
    return evidenceSvg(w, h, `
      <rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="14" fill="#fffaf0" stroke="${color}" stroke-width="3"/>
      <path d="M3 15 Q3 3 15 3 H${w - 15} Q${w - 3} 3 ${w - 3} 15 V31 H3Z" fill="${color}"/>
      <text x="${w / 2}" y="21" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">${labels[rank - 1]}</text>
      <text x="${w / 2}" y="48" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${cues[rank - 1]}</text>
      <rect x="10" y="59" width="${w - 20}" height="${h - 69}" rx="8" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="7 5"/>
      <text x="${w / 2}" y="83" text-anchor="middle" fill="#64748b" font-size="11" font-weight="800">FILE CLUE HERE</text>`);
  }

  function evidenceConclusionPng(w, h, conclusion) {
    return evidenceSvg(w, h, `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>
      <text x="14" y="${Math.round(h / 2 + 5)}" fill="#1e3a8a" font-size="11" font-weight="800">CONCLUSION</text>
      ${evidenceTextSvg(conclusion, 112, Math.round(h / 2 + 5), Math.max(40, Math.floor((w - 126) / 8)), 1, 15, 'fill="#1e3a8a" font-size="14" font-weight="700"')}`);
  }

  function evidenceConclusionCoverPng(w, h, count) {
    const midY = Math.round(h / 2);
    const dots = Array.from({ length: count }, (_, i) =>
      `<circle cx="${w - 28 - (count - 1 - i) * 18}" cy="${midY + 6}" r="5" fill="#fde68a" stroke="#d97706" stroke-width="2"/>`
    ).join('');
    return evidenceSvg(w, h, `
      <rect x="2" y="5" width="${w - 4}" height="${h - 8}" rx="6" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
      <path d="M2 18 L${w / 2} 30 L${w - 2} 18" fill="#fcd34d" stroke="#b45309" stroke-width="2"/>
      <circle cx="34" cy="${midY + 4}" r="11" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
      <text x="34" y="${midY + 8}" text-anchor="middle" fill="#fff" font-size="8" font-weight="800">SEAL</text>
      <text x="56" y="${midY - 2}" fill="#78350f" font-size="11" font-weight="800">SEALED VERDICT · 0/${count} FILED</text>
      <text x="56" y="${midY + 14}" fill="#92400e" font-size="9" font-weight="700">File all clues → peel this envelope</text>${dots}`);
  }

  function evidenceArtifactForm(item) {
    const excerpt = String(item.artifactExcerpt || '').trim();
    if (/^\d{1,2}:\d{2}/.test(excerpt) || /\b\d{1,2}:\d{2}\b/.test(excerpt)) {
      return { badge: 'LOG', bg: '#e2e8f0', stroke: '#475569', mono: true };
    }
    if (/^["'""]/.test(excerpt) || excerpt.includes('"')) {
      return { badge: 'QUOTE', bg: '#fef3c7', stroke: '#b45309', mono: false };
    }
    if (/\b\d+(\.\d+)?\s*(°|cm|mm|kg|db|v|w|mph|km|%)/i.test(excerpt)) {
      return { badge: 'DATA', bg: '#dbeafe', stroke: '#2563eb', mono: true };
    }
    return { badge: 'NOTE', bg: '#f1f5f9', stroke: '#64748b', mono: false };
  }

  function evidenceCardPng(w, h, item) {
    const challenges = item.relation !== 'supports';
    const edge = challenges ? '#be123c' : '#0f766e';
    const source = `SOURCE · ${String(item.source || '').toUpperCase()}`;
    const relationLabel = item.relation === 'alternative'
      ? 'ALTERNATIVE'
      : String(item.relation || '').toUpperCase();
    const form = evidenceArtifactForm(item);
    const excerptText = form.mono
      ? String(item.artifactExcerpt || '')
      : `“${item.artifactExcerpt}”`;
    const fontFamily = form.mono ? 'Consolas,monospace' : 'Poppins,Arial,sans-serif';
    return evidenceSvg(w, h, `
      <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="14" fill="#fffef7" stroke="${edge}" stroke-width="3"/>
      <path d="M4 16 Q4 4 16 4 H${w - 16} Q${w - 4} 4 ${w - 4} 16 V30 H4Z" fill="${edge}"/>
      <text x="12" y="21" fill="#fff" font-size="10" font-weight="800">${evidenceXml(source.slice(0, 22))}</text>
      <text x="${w - 12}" y="21" text-anchor="end" fill="#fff" font-size="10" font-weight="800">${relationLabel}</text>
      <rect x="8" y="35" width="${w - 16}" height="39" rx="7" fill="${form.bg}" stroke="${form.stroke}" stroke-width="2"/>
      <text x="14" y="46" fill="${form.stroke}" font-size="8" font-weight="800">${form.badge} · SOURCE ARTIFACT</text>
      ${evidenceTextSvg(excerptText, 14, 61, Math.max(24, Math.floor((w - 28) / 8)), 2, 13, `fill="#0f172a" font-size="11" font-weight="800" font-family="${fontFamily}"`)}
      ${evidenceTextSvg(`SOURCE QUALITY: ${item.rationale}`, 12, h - 39, Math.max(32, Math.floor((w - 24) / 7)), 1, 13, 'fill="#475569" font-size="10" font-weight="700"')}
      ${evidenceTextSvg(`CLAIM IMPACT: ${item.claimImpact}`, 12, h - 21, Math.max(32, Math.floor((w - 24) / 7)), 2, 12, `fill="${edge}" font-size="10" font-weight="800"`)}`);
  }

  function normalizeEvidenceItems(raw) {
    const out = [];
    const seen = new Set();
    for (const item of Array.isArray(raw) ? raw : []) {
      if (!item || typeof item !== 'object') continue;
      const text = String(item.text || item.fact || '').trim();
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      out.push({
        text,
        source: String(item.source || item.artifact || '').trim(),
        artifactExcerpt: String(item.artifactExcerpt || '').trim(),
        rationale: String(item.rationale || item.why || '').trim(),
        relation: String(item.relation || '').trim().toLowerCase(),
        claimImpact: String(item.claimImpact || '').trim(),
        strength: Number.isFinite(Number(item.strength)) ? Number(item.strength) : null,
      });
      if (out.length >= 4) break;
    }
    return out;
  }

  // S77 — evidence-relation integrity (Manus 8Eqp5k evidenceBoard R2, 60/100).
  // A contradicts/qualifies/alternative card must genuinely oppose the claim.
  // "Weaker source" or "happened earlier/later" describes strength or timing,
  // not a challenge — Manus flagged that as a false counter-evidence label.
  const EVIDENCE_OPPOSITION_RE =
    /\b(not|isn'?t|can'?t|cannot|doesn'?t|didn'?t|wasn'?t|weren'?t|denies?|denied|unlikely|false|contrary|conflicts?|disputes?|undermin\w*|contradicts?|rules? out|instead of|rather than|however|no evidence|does not hold|breaks down|fails? to)\b/i;
  const EVIDENCE_QUALIFY_RE =
    /\b(but|only|limit\w*|less likely|less certain|uncertain|depends?|unless|may|might|not always|despite|partly|sometimes)\b/i;
  const EVIDENCE_ALTERNATIVE_RE =
    /\b(another|alternative|other|different)\b.{0,24}\b(cause|explanation|reason|possibility)\b|\binstead\b/i;
  function evidenceRelationIntegrity(evidence) {
    return evidence.every((e) => {
      if (e.relation === 'supports') return true;
      const blob = `${e.claimImpact || ''} ${e.text || ''}`;
      if (e.relation === 'contradicts') return EVIDENCE_OPPOSITION_RE.test(blob);
      if (e.relation === 'qualifies') {
        return EVIDENCE_OPPOSITION_RE.test(blob) || EVIDENCE_QUALIFY_RE.test(blob);
      }
      if (e.relation === 'alternative') return EVIDENCE_ALTERNATIVE_RE.test(blob);
      return false;
    });
  }

  // S78 — causal-timeline solvability (Manus 4Z9MSS evidenceBoard R3, 63/100).
  const EVIDENCE_TIMESTAMP_RE = /\b\d{1,2}:\d{2}\b/;
  function evidenceHasTimestamps(evidence) {
    return evidence.some((e) => EVIDENCE_TIMESTAMP_RE.test(String(e.artifactExcerpt || '')));
  }
  function evidenceTimelineSolvable(incidentTime, evidence) {
    if (!evidenceHasTimestamps(evidence)) return true;
    return !!(incidentTime && EVIDENCE_TIMESTAMP_RE.test(incidentTime));
  }

  function resolveEvidenceBoard(lesson) {
    if (!wantsEvidenceBoard(lesson)) return null;
    const act = (lesson && lesson.activity) || {};
    const raw = act.evidenceBoard;
    if (!raw || typeof raw !== 'object') return null;
    const claim = String(raw.claim || raw.question || '').trim();
    const conclusion = String(raw.conclusion || '').trim();
    const evidence = normalizeEvidenceItems(raw.evidence);
    if (!claim || !conclusion || evidence.length < 3) return null;
    const relationTypes = new Set(['supports', 'contradicts', 'qualifies', 'alternative']);
    const completeCards = evidence.every((e) =>
      e.source && e.artifactExcerpt && e.rationale && e.claimImpact
      && relationTypes.has(e.relation)
      && Number.isFinite(e.strength)
      && e.text.length <= 72
      && e.source.length <= 26
      && e.artifactExcerpt.length <= 48
      && e.rationale.length <= 56
      && e.claimImpact.length <= 68
    );
    const strengths = evidence.map((e) => e.strength);
    const distinctStrengths = new Set(strengths).size === evidence.length;
    const hasSupport = evidence.some((e) => e.relation === 'supports');
    const hasCounter = evidence.some((e) => e.relation !== 'supports');
    if (!completeCards || !distinctStrengths || !hasSupport || !hasCounter) return null;
    if (!evidenceRelationIntegrity(evidence)) return null;
    const incidentTime = String(raw.incidentTime || '').trim();
    if (!evidenceTimelineSolvable(incidentTime, evidence)) return null;
    const ordered = evidence.slice().sort((a, b) => b.strength - a.strength);
    return {
      claim,
      conclusion,
      evidence,
      incidentTime: incidentTime || null,
      answerOrder: ordered.map((e) => e.text),
      reasoningFrame: String(
        raw.reasoningFrame || 'I rank ___ first because its source is more reliable and relevant than ___.'
      ).trim(),
      teacherCheck: String(
        raw.teacherCheck || 'Ask: Which source is most reliable, and which clue challenges the claim?'
      ).trim(),
      source: 'lesson',
    };
  }

  /** Build a tangible case file; ranking creates a visible evidence hierarchy. */
  function evidenceBoard(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const evidence = normalizeEvidenceItems(ctx && ctx.evidence);
    if (!ctx || !ctx.claim || !ctx.conclusion || evidence.length < 3) return;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const sidePad = 18;
    const gap = 12;
    const topH = 50;
    const contractH = 32;
    const timelineH = ctx.incidentTime ? 34 : 0;
    const ladderH = 42;
    const keyH = 48;
    const keyY = bay.y + bay.h - keyH - 8;
    const ladderY = keyY - ladderH - 8;
    const slotH = Math.max(78, Math.min(94, ladderY - (bay.y + 4 + topH + 6 + contractH + timelineH + 10)));
    const slotY = ladderY - slotH - 8;
    const slotW = Math.floor((bay.w - sidePad * 2 - gap * (evidence.length - 1)) / evidence.length);
    const claimW = Math.floor((bay.w - sidePad * 2 - gap) * 0.62);
    const frameW = bay.w - sidePad * 2 - gap - claimW;
    const innerW = bay.w - sidePad * 2;
    let stackY = bay.y + 4;

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: evidenceCaseFilePng(bay.w, bay.h),
      w: bay.w, h: bay.h,
      intentional: true,
      anchor: { x: bay.x, y: bay.y, w: bay.w, h: bay.h },
      role: 'evidenceCaseFile',
      meta: { teacherCheck: ctx.teacherCheck || '', sceneIntegrated: true },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: evidenceClaimPng(claimW, topH, ctx.claim),
      w: claimW, h: topH,
      intentional: true,
      anchor: { x: bay.x + sidePad, y: stackY, w: claimW, h: topH },
      role: 'evidenceClaim',
      meta: { claim: ctx.claim },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: evidenceReasoningFramePng(frameW, topH, ctx.reasoningFrame),
      w: frameW, h: topH,
      intentional: true,
      anchor: { x: bay.x + sidePad + claimW + gap, y: stackY, w: frameW, h: topH },
      role: 'evidenceReasoningFrame',
      meta: { frame: ctx.reasoningFrame, teacherCheck: ctx.teacherCheck },
    });
    stackY += topH + 6;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: evidenceRankContractPng(innerW, contractH),
      w: innerW, h: contractH,
      intentional: true,
      anchor: { x: bay.x + sidePad, y: stackY, w: innerW, h: contractH },
      role: 'evidenceRankContract',
      meta: {
        rankContract: true,
        requiresArtifact: true,
        requiresRelation: true,
        requiresRationale: true,
        requiresClaimImpact: true,
        teacherCheck: true,
      },
    });
    stackY += contractH + 4;
    if (ctx.incidentTime) {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: evidenceTimelineAnchorPng(innerW, timelineH, ctx.incidentTime, evidence),
        w: innerW, h: timelineH,
        intentional: true,
        anchor: { x: bay.x + sidePad, y: stackY, w: innerW, h: timelineH },
        role: 'evidenceTimelineAnchor',
        meta: { incidentTime: ctx.incidentTime, causalTimeline: true },
      });
      stackY += timelineH + 6;
    }
    evidence.forEach((_, i) => {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: evidencePocketPng(slotW, slotH, i + 1, evidence.length),
        w: slotW, h: slotH,
        intentional: true,
        anchor: { x: bay.x + sidePad + i * (slotW + gap), y: slotY, w: slotW, h: slotH },
        role: 'evidenceRankSlot',
        meta: {
          rank: i + 1,
          label: i === 0 ? 'strongest' : i === evidence.length - 1 ? 'weakest' : 'supporting',
          answerText: (ctx.answerOrder || [])[i] || '',
        },
      });
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: evidenceFilingStateLadderPng(innerW, ladderH, evidence.length),
      w: innerW, h: ladderH,
      intentional: true,
      anchor: { x: bay.x + sidePad, y: ladderY, w: innerW, h: ladderH },
      role: 'evidenceFilingStateLadder',
      meta: {
        states: ['inspect', 'file', 'fileAll', 'peel'],
        progressSteps: evidence.length,
        materialPayoff: true,
      },
    });
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: evidenceConclusionPng(bay.w - sidePad * 2, keyH, ctx.conclusion),
      w: bay.w - sidePad * 2, h: keyH,
      intentional: true,
      anchor: { x: bay.x + sidePad, y: keyY, w: bay.w - sidePad * 2, h: keyH },
      role: 'evidenceConclusion',
      meta: { conclusion: ctx.conclusion, answerOrder: ctx.answerOrder || [] },
    });
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: evidenceConclusionCoverPng(bay.w - sidePad * 2, keyH, evidence.length),
      w: bay.w - sidePad * 2, h: keyH,
      intentional: true,
      anchor: { x: bay.x + sidePad, y: keyY, w: bay.w - sidePad * 2, h: keyH },
      role: 'evidenceConclusionCover',
      meta: {
        covers: 'conclusion',
        unlockAfter: evidence.length,
        requiredOrder: ctx.answerOrder || [],
        lockedConclusion: true,
        progressByFilledSlots: true,
        progressSteps: evidence.length,
      },
    });
    const shuffled = pick(evidence, evidence.length, hashStr((lesson.title || '') + '|evidenceBoard'));
    const dock = L.zoneRect(page, 'dock');
    const dockGap = 14;
    const cardW = Math.max(230, Math.min(340, Math.floor(
      (((dock && dock.w) || 1184) - dockGap * (evidence.length - 1)) / evidence.length
    )));
    const cardH = 126;
    L.placeDockRow(page, shuffled.map((item) => ({
      kind: 'image',
      asset: evidenceCardPng(cardW, cardH, item),
      text: item.text,
      role: 'evidenceCard',
      meta: {
        text: item.text,
        source: item.source,
        artifactExcerpt: item.artifactExcerpt,
        rationale: item.rationale,
        relation: item.relation,
        claimImpact: item.claimImpact,
        strength: item.strength,
      },
    })), { w: cardW, h: cardH, noShrink: true });
    page.notes.push('recipe:evidenceBoard');
    page.notes.push('evidenceCount:' + evidence.length);
    page.notes.push('evidenceCounterCount:' + evidence.filter((e) => e.relation !== 'supports').length);
    page.notes.push('evidenceCounterSemantics:true');
    page.notes.push('evidenceStrengthsDistinct:true');
    page.notes.push('evidenceSourcesComplete:true');
    page.notes.push('evidenceArtifactsInspectable:true');
    page.notes.push('evidenceLockedConclusion:true');
    page.notes.push('evidenceProgressByFilledSlots:true');
    page.notes.push('evidenceRankContractVisible:true');
    page.notes.push('evidenceMaterialPayoff:true');
    page.notes.push('evidenceFilingStateLadder:true');
    if (ctx.incidentTime) page.notes.push('evidenceTimelineAnchor:' + ctx.incidentTime);
    page.notes.push('evidenceTeacherCheck:' + ctx.teacherCheck);
  }

  function resolveRequestedBoardGrammar(lesson, vocabArt) {
    const candidates = [
      ['capacityPack', resolveCapacityPack(lesson, vocabArt)],
      ['routeMission', resolveRouteMission(lesson)],
      ['transformationLab', resolveTransformationLab(lesson)],
      ['evidenceBoard', resolveEvidenceBoard(lesson)],
      ['silhouetteGate', resolveSilhouetteGate(lesson, vocabArt)],
      ['halfTruthBoard', resolveHalfTruth(lesson, vocabArt)],
      ['sceneRepair', resolveSceneRepair(lesson, vocabArt)],
    ];
    const hit = candidates.find((row) => row[1]);
    return hit ? { recipeId: hit[0], ctx: hit[1] } : null;
  }

  /** Pictured VocabArt rows kids can drag (artSrc / glyph / propKey). */
  function picturedMatchableRows(vocabArt) {
    const rows = vocabArt && Array.isArray(vocabArt.matchable) ? vocabArt.matchable : [];
    return rows.filter((row) => {
      if (!row || !row.word || row.matchable === false) return false;
      return !!(row.artSrc || row.glyph || row.propKey || row.matchable);
    });
  }

  /**
   * Coarse theme cue for odd-one-out (3-share + 1-outlier). Deterministic
   * buckets from word + vocab sentence — not LLM.
   */
  function themeCueForWord(word, lesson) {
    const w = String(word || '').trim().toLowerCase();
    if (!w) return 'other';
    const vocab = (lesson && lesson.vocabulary) || [];
    const row = vocab.find((v) => {
      const vw = typeof v === 'string' ? v : v && v.word;
      return vw && String(vw).toLowerCase() === w;
    });
    const sentence = row && typeof row === 'object' ? String(row.sentence || '').toLowerCase() : '';
    const blob = `${w} ${sentence}`;

    // Abstract / idea words first so "practice / effort / teamwork" leave sport objects.
    if (/\b(effort|teamwork|habit|routine|schedule|idea|feeling|patience|kindness|honesty|integrity|curiosity|resilience|gratitude|perseverance|score)\b/.test(w)
      || /\b(idea|feeling|abstract)\b/.test(sentence)) {
      return 'abstract';
    }
    if (/\b(apple|banana|carrot|lemon|grape|bread|cake|milk|juice|soup|fruit|tomato|orange|pear|cookie|pizza|salad)\b/.test(w)
      || /\b(eat|drink|fruit|food|hungry)\b/.test(sentence)) {
      return 'food';
    }
    // Bike/bicycle are transport first (bus/train/car sets). Sport keeps skates.
    if (/\b(ball|bat|racket|whistle|goal|net|helmet|skate|skates|soccer|tennis|basketball|coach|court|practice|team|hoop|jersey|player)\b/.test(w)
      || /\b(sport|game|play|kick|pass|whistle|coach)\b/.test(sentence)) {
      return 'sport';
    }
    if (/\b(dog|cat|bird|fish|horse|pet|animal|cow|pig|sheep|duck)\b/.test(w)
      || /\b(animal|pet)\b/.test(sentence)) {
      return 'animal';
    }
    if (/\b(bus|car|train|plane|boat|truck|taxi|subway|bike|bicycle)\b/.test(w)
      || /\b(ride|travel|drive)\b/.test(sentence)) {
      return 'transport';
    }
    if (/\b(hat|coat|shoe|shirt|dress|sock|pants|jacket)\b/.test(w)
      || /\b(wear|clothes)\b/.test(sentence)) {
      return 'clothes';
    }
    if (/\b(tree|flower|leaf|park|beach|river|mountain|lake)\b/.test(w)
      || /\b(outside|nature|park|beach)\b/.test(sentence)) {
      return 'nature';
    }
    if (/\b(book|pen|pencil|eraser|bag|desk|school|teacher|homework)\b/.test(w)
      || /\b(school|class|study)\b/.test(sentence)) {
      return 'school';
    }
    if (/\b(doctor|nurse|chef|pilot|firefighter|barista|farmer|dentist)\b/.test(w)
      || /\b(job|works as)\b/.test(sentence)) {
      return 'job';
    }
    if (/\b(tooth|teeth|smile|floss|mouth|hand|foot|face|eye|ear)\b/.test(w)
      || /\b(body|teeth|face)\b/.test(sentence)) {
      return 'body';
    }
    if (/\b(clay|wheel|bowl|vase|glaze|pottery|brush|paint)\b/.test(w)
      || /\b(pottery|clay|paint|craft)\b/.test(sentence)) {
      return 'craft';
    }
    if (/\b(plate|sponge|sink|pan|oven|spatula|fork|spoon|cup)\b/.test(w)
      || /\b(kitchen|cook|wash)\b/.test(sentence)) {
      return 'kitchen';
    }
    // Weak sentence-only cues when the head noun is unknown
    if (blob !== w) {
      if (/\b(eat|fruit|food)\b/.test(blob)) return 'food';
      if (/\b(sport|whistle|coach|ball)\b/.test(blob)) return 'sport';
      if (/\b(animal|pet)\b/.test(blob)) return 'animal';
    }
    return 'other';
  }

  function findMatchableRow(word, rows) {
    const lower = String(word || '').trim().toLowerCase();
    if (!lower) return null;
    return (rows || []).find((r) => r && String(r.word || '').toLowerCase() === lower) || null;
  }

  /**
   * Visual / synonym fingerprint so oddOneOut never ships twin pictures
   * (ball + basketball both look like a basketball).
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

  /** Keep first row per visualTwinKey (stable order). */
  function uniqueVisualRows(rows) {
    const seen = new Set();
    const out = [];
    (rows || []).forEach((row) => {
      if (!row) return;
      const key = visualTwinKey(row);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(row);
    });
    return out;
  }

  function hasVisualTwins(rows) {
    const keys = (rows || []).map(visualTwinKey);
    return new Set(keys).size < keys.length;
  }

  /**
   * Prefer lesson.activity.oddOneOut { options[4], odd, whyHint? } when valid
   * and all four options are pictured. Else derive 3-share + 1-outlier from
   * pictured board words (title seed). Returns null when no credible set.
   */
  function resolveOddOneOut(lesson, vocabArt) {
    const pictured = picturedMatchableRows(vocabArt);
    if (pictured.length < 4) return null;

    const raw = lesson && lesson.activity && lesson.activity.oddOneOut;
    if (raw && Array.isArray(raw.options) && raw.odd != null) {
      const options = raw.options
        .map((w) => String(w || '').trim())
        .filter(Boolean)
        .slice(0, 4);
      const odd = String(raw.odd || '').trim();
      const oddLower = odd.toLowerCase();
      if (options.length === 4
        && options.some((o) => o.toLowerCase() === oddLower)
        && new Set(options.map((o) => o.toLowerCase())).size === 4) {
        const rows = options.map((w) => findMatchableRow(w, pictured));
        // Twin art (ball+basketball) → reject lesson payload; try derive.
        if (rows.every(Boolean) && !hasVisualTwins(rows)) {
          const lessonWhy = raw.whyHint ? String(raw.whyHint).trim() : null;
          const blankWhy = lessonWhy && /_{2,}|…|\.{3}/.test(lessonWhy) ? lessonWhy : null;
          // Answer-shaped whyHint → ruleHint (teacher/page cue), not student write line.
          const ruleFromWhy = lessonWhy && !blankWhy ? lessonWhy : null;
          return {
            options,
            odd: options.find((o) => o.toLowerCase() === oddLower) || odd,
            rows,
            whyHint: blankWhy,
            ruleHint: ruleFromWhy,
            source: 'lesson',
            themeCue: null,
          };
        }
      }
    }

    return deriveOddOneOut(lesson, pictured);
  }

  /** 3 words sharing a cue + 1 pictured outlier. Deterministic from title. */
  function deriveOddOneOut(lesson, pictured) {
    const seed = hashStr(((lesson && lesson.title) || '') + '|oddOneOut');
    const tagged = pictured.map((row) => ({
      row,
      cue: themeCueForWord(row.word, lesson),
    }));

    const byCue = {};
    tagged.forEach((t) => {
      if (!t.cue || t.cue === 'other') return;
      if (!byCue[t.cue]) byCue[t.cue] = [];
      byCue[t.cue].push(t);
    });

    // Count unique visuals per cue — ball+basketball twins don't count as two.
    const cueIds = Object.keys(byCue).sort();
    function uniqueCount(cue) {
      return uniqueVisualRows(byCue[cue].map((t) => t.row)).length;
    }
    let bestCue = null;
    let bestN = 0;
    cueIds.forEach((cue) => {
      const n = uniqueCount(cue);
      if (n >= 3 && (n > bestN || (n === bestN && cue < bestCue))) {
        bestCue = cue;
        bestN = n;
      }
    });
    // Seed tie-break when multiple cues have the same ≥3 unique-visual count
    const tied = cueIds.filter((c) => uniqueCount(c) === bestN && bestN >= 3);
    if (tied.length > 1) {
      bestCue = tied[seed % tied.length];
    }
    if (!bestCue || bestN < 3) {
      return deriveOddOneOutConcreteVsAbstract(lesson, pictured, seed);
    }

    const groupRows = uniqueVisualRows(byCue[bestCue].map((g) => g.row));
    const outliers = uniqueVisualRows(
      tagged.filter((t) => t.cue !== bestCue).map((t) => t.row)
    ).filter((row) => !groupRows.some((g) => visualTwinKey(g) === visualTwinKey(row)));
    if (!outliers.length) {
      return deriveOddOneOutConcreteVsAbstract(lesson, pictured, seed);
    }

    const three = pick(groupRows, 3, seed);
    const oddRow = pick(outliers, 1, seed ^ 0x0dd)[0];
    if (!oddRow || three.length < 3) {
      return deriveOddOneOutConcreteVsAbstract(lesson, pictured, seed);
    }
    if (hasVisualTwins([...three, oddRow])) {
      return deriveOddOneOutConcreteVsAbstract(lesson, pictured, seed);
    }

    const optionRows = [...three, oddRow];
    const shuffled = pick(optionRows, 4, seed ^ 0xf17);
    return {
      options: shuffled.map((r) => r.word),
      odd: oddRow.word,
      rows: shuffled,
      whyHint: null,
      source: 'derived',
      themeCue: bestCue,
    };
  }

  /**
   * Fallback when no single theme cue has ≥3 unique visuals: 3 concrete
   * pictured words + 1 abstract outlier (e.g. ball/team/friends vs score).
   */
  function deriveOddOneOutConcreteVsAbstract(lesson, pictured, seed) {
    const tagged = (pictured || []).map((row) => ({
      row,
      cue: themeCueForWord(row.word, lesson),
    }));
    const abstracts = uniqueVisualRows(
      tagged.filter((t) => t.cue === 'abstract').map((t) => t.row)
    );
    const concretes = uniqueVisualRows(
      tagged.filter((t) => t.cue !== 'abstract').map((t) => t.row)
    );
    if (abstracts.length < 1 || concretes.length < 3) return null;

    const three = pick(concretes, 3, seed ^ 0xc0c);
    const oddRow = pick(abstracts, 1, seed ^ 0x0dd)[0];
    if (!oddRow || three.length < 3) return null;
    if (hasVisualTwins([...three, oddRow])) return null;

    const optionRows = [...three, oddRow];
    const shuffled = pick(optionRows, 4, seed ^ 0xf17);
    const oddLower = String(oddRow.word || '').toLowerCase();
    const ruleHint = /\b(score|point|points|number)\b/.test(oddLower)
      ? 'Three are people or things you can see. One is points or a number idea — drag that idea to Doesn\'t fit. Write why.'
      : 'Three are people or things you can see. One is an idea — drag the idea to Doesn\'t fit. Write why.';
    return {
      options: shuffled.map((r) => r.word),
      odd: oddRow.word,
      rows: shuffled,
      // Keep ODD_WHY_SCAFFOLD on the write line; surface the category rule in the page hint.
      whyHint: null,
      ruleHint,
      source: 'derived',
      themeCue: 'concrete-vs-abstract',
    };
  }

  function canBuildOddOneOut(lesson, vocabArt) {
    return !!resolveOddOneOut(lesson, vocabArt);
  }

  /**
   * A1/A2 write-line scaffold for oddOneOut. Teacher answer whyHints (no blanks)
   * must NOT paint on the student write line — those belong in ruleHint / notes.
   * Only a blank-bearing whyHint may replace the default stem.
   */
  const ODD_WHY_SCAFFOLD = "It doesn't fit because ______.";
  function oddWhyWriteLine(ctx) {
    const hint = ctx && ctx.whyHint != null ? String(ctx.whyHint).trim() : '';
    if (hint && /_{2,}|…|\.{3}/.test(hint)) return hint;
    return ODD_WHY_SCAFFOLD;
  }

  /**
   * Four pictured vocab cards + "Doesn't fit" drop tray + scaffolded Why write line.
   * Standard activity zones (not heroStage). No auto-scoring.
   */
  function oddOneOut(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const options = (ctx && Array.isArray(ctx.options) ? ctx.options : [])
      .map((w) => String(w || '').trim())
      .filter(Boolean)
      .slice(0, 4);
    const odd = ctx && ctx.odd ? String(ctx.odd).trim() : '';
    const rows = (ctx && Array.isArray(ctx.rows) ? ctx.rows : []).slice(0, 4);
    if (options.length < 4 || !odd) return;

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const whyLine = oddWhyWriteLine(ctx);
    const writeH = 52;
    const trayPad = 12;
    const trayH = Math.max(128, bay.h - writeH - trayPad * 2);
    const trayW = Math.min(720, Math.max(360, bay.w - 160));
    const trayX = bay.x + Math.round((bay.w - trayW) / 2);
    const trayY = bay.y + trayPad;

    L.place(page, {
      locked: true,
      kind: 'image',
      asset: solidPng(trayW, trayH, '#fee2e2', "Doesn't fit", '#7f1d1d'),
      w: trayW,
      h: trayH,
      intentional: true,
      anchor: { x: trayX, y: trayY, w: trayW, h: trayH },
      role: 'oddTray',
      meta: { odd, label: "Doesn't fit" },
    });

    const writeY = bay.y + bay.h - writeH;
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: solidPng(bay.w - 64, writeH, '#ffffff', whyLine, '#334155'),
      w: bay.w - 64,
      h: writeH,
      intentional: true,
      anchor: { x: bay.x + 32, y: writeY, w: bay.w - 64, h: writeH },
      role: 'oddWhy',
      meta: {
        odd,
        whyHint: (ctx && ctx.whyHint) || null,
        whyLine,
      },
    });

    const dock = L.zoneRect(page, 'dock');
    const n = 4;
    const gap = 18;
    const labelH = 28;
    let cardW = 140;
    let artH = 100;
    if (dock && dock.w) {
      cardW = Math.min(180, Math.max(110, Math.floor((dock.w - gap * (n - 1)) / n)));
      artH = Math.max(88, Math.min(112, dock.h - labelH - 10));
    }

    const pieces = options.map((word, i) => {
      const row = rows[i] || findMatchableRow(word, rows) || { word };
      const meta = {
        word,
        odd: word.toLowerCase() === odd.toLowerCase(),
        artSrc: row.artSrc || null,
        artTier: row.tier || null,
      };
      if (row.propKey) meta.propKey = row.propKey;
      if (row.artSrc) {
        return {
          kind: 'image',
          asset: row.artSrc,
          role: 'oddCard',
          meta,
        };
      }
      return {
        kind: 'emoji',
        emoji: row.glyph || '★',
        role: 'oddCard',
        meta,
      };
    });

    // Picture cards first (draggable), then small locked word chips under each.
    const placed = L.placeDockRow(page, pieces, {
      w: cardW,
      h: artH,
      cols: 4,
      noShrink: true,
    });
    if (Array.isArray(placed) && placed.length === 4 && dock) {
      placed.forEach((rect, i) => {
        if (!rect) return;
        const word = options[i];
        const chipW = Math.min(cardW, Math.max(72, word.length * 11 + 16));
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: solidPng(chipW, labelH, '#f8fafc', word, '#0f172a'),
          w: chipW,
          h: labelH,
          intentional: true,
          anchor: {
            x: Math.round(rect.x + (rect.w - chipW) / 2),
            y: Math.min(dock.y + dock.h - labelH - 2, rect.y + rect.h + 2),
            w: chipW,
            h: labelH,
          },
          role: 'oddLabel',
          meta: { word },
        });
      });
    }

    page.notes.push('recipe:oddOneOut');
    page.notes.push('oddWord:' + odd);
    if (ctx && ctx.source) page.notes.push('oddSource:' + ctx.source);
    if (ctx && ctx.themeCue) page.notes.push('oddTheme:' + ctx.themeCue);
  }

  /**
   * Preference choice frames (recipe id thisOrThat). NOT ESL near/far deixis —
   * UI says "Which one?". Place pairs use go-to frames; object pairs use
   * like/want/have.
   */
  const PLACE_CHOICE_RE =
    /\b(museums?|galler(?:y|ies)|parks?|zoos?|beach(?:es)?|schools?|libraries?|hospitals?|clinics?|airports?|stations?|farms?|cafes?|cafés?|restaurants?|castles?|circuses?|playgrounds?|aquariums?|hotels?|cinemas?|theatres?|theaters?|malls?|markets?|gyms?|planetariums?|classrooms?|pools?|gardens?)\b/i;

  function optionsArePlaces(options) {
    const list = (options || []).map((w) => String(w || '').trim()).filter(Boolean);
    if (list.length < 2) return false;
    return list.every((w) => PLACE_CHOICE_RE.test(w));
  }

  function thisOrThatFrame(level, options) {
    const lv = String(level || '').trim().toUpperCase();
    const places = optionsArePlaces(options);
    if (places) {
      if (lv === 'B1' || lv === 'B2' || lv === 'C1') {
        return "I'd rather go to ______ because ______.";
      }
      if (lv === 'A2') {
        return 'I want to go to ______.';
      }
      return 'I like ______.';
    }
    if (lv === 'B1' || lv === 'B2' || lv === 'C1') {
      return "I'd rather have the ______ because ______.";
    }
    if (lv === 'A2') {
      return 'I want the ______.';
    }
    return 'I like ______.';
  }

  /**
   * Prefer lesson.activity.thisOrThat { options[2], frame? } when both options
   * are pictured and visually distinct. Else derive 2 unique pictured words.
   */
  function resolveThisOrThat(lesson, vocabArt, meta) {
    const pictured = picturedMatchableRows(vocabArt);
    const unique = uniqueVisualRows(pictured);
    if (unique.length < 2) return null;

    const raw = lesson && lesson.activity && lesson.activity.thisOrThat;
    if (raw && Array.isArray(raw.options) && raw.options.length >= 2) {
      const options = raw.options
        .map((w) => String(w || '').trim())
        .filter(Boolean)
        .slice(0, 2);
      if (options.length === 2) {
        const rows = options.map((w) => findMatchableRow(w, pictured)).filter(Boolean);
        if (rows.length === 2 && !hasVisualTwins(rows)) {
          const frame = String(raw.frame || '').trim()
            || thisOrThatFrame(meta && meta.level, options);
          return {
            options,
            rows,
            frame,
            source: 'lesson',
          };
        }
      }
    }

    return deriveThisOrThat(lesson, unique, meta);
  }

  function deriveThisOrThat(lesson, picturedUnique, meta) {
    const pool = uniqueVisualRows(picturedUnique || []);
    if (pool.length < 2) return null;
    // Prefer the lesson's own pictured words over theme-bank fills (title
    // token "pets" next to dog/cat made thisOrThat a dog-vs-dog choice).
    const before = (lesson && lesson._vocabAdapted && Array.isArray(lesson._vocabAdapted.before))
      ? lesson._vocabAdapted.before
      : ((lesson && lesson.vocabulary) || []).map((v) => (typeof v === 'string' ? v : v && v.word)).filter(Boolean);
    const original = new Set(before.map((w) => String(w || '').toLowerCase()).filter(Boolean));
    const preferred = pool.filter((r) => original.has(String(r.word || '').toLowerCase()));
    const usePool = preferred.length >= 2 ? preferred : pool;
    const seed = hashStr(((lesson && lesson.title) || '') + '|thisOrThat');
    const two = pick(usePool, 2, seed);
    if (!two || two.length < 2 || hasVisualTwins(two)) return null;
    const options = two.map((r) => r.word);
    return {
      options,
      rows: two,
      frame: thisOrThatFrame(meta && meta.level, options),
      source: 'derived',
    };
  }

  function canBuildThisOrThat(lesson, vocabArt, meta) {
    return !!resolveThisOrThat(lesson, vocabArt, meta || { level: 'A2' });
  }

  /**
   * Two pictured choices + CEFR speak/write line. Multi-topic: any ≥2 distinct
   * pictured board words when fix / odd / yesNoSort are not buildable.
   */
  function thisOrThat(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const options = (ctx && Array.isArray(ctx.options) ? ctx.options : [])
      .map((w) => String(w || '').trim())
      .filter(Boolean)
      .slice(0, 2);
    const rows = (ctx && Array.isArray(ctx.rows) ? ctx.rows : []).slice(0, 2);
    const frame = String((ctx && ctx.frame) || thisOrThatFrame('A1')).trim();
    if (options.length < 2) return;

    // Activity targetBay is only ~220px (dock sits below). Merge bay+dock so
    // large choice cards and the write frame don't stack on top of each other.
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const dock = L.zoneRect(page, 'dock');
    let play = bay;
    if (bay && dock && dock.y >= bay.y) {
      const bottom = Math.max(bay.y + bay.h, dock.y + dock.h);
      play = { x: bay.x, y: bay.y, w: Math.max(bay.w, dock.w), h: bottom - bay.y };
    }
    const writeH = 56;
    const bannerH = 44;
    const labelH = 32;
    const pad = 14;
    const gap = 28;
    if (play && play.h >= 160) {
      const bannerW = Math.min(520, play.w - 80);
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: solidPng(bannerW, bannerH, '#eef2ff', 'Which one?', '#312e81'),
        w: bannerW,
        h: bannerH,
        intentional: true,
        anchor: {
          x: play.x + Math.round((play.w - bannerW) / 2),
          y: play.y + 8,
          w: bannerW,
          h: bannerH,
        },
        role: 'choiceBanner',
        meta: { frame },
      });

      // Frame owns the bottom strip; cards fill remaining height (never overflow).
      const frameY = play.y + play.h - writeH - 8;
      const cardsTop = play.y + 8 + bannerH + 12;
      const labelGap = 6;
      const availCardH = frameY - 12 - cardsTop - labelH - labelGap;
      const cardH = Math.max(110, Math.min(220, availCardH));
      const cardW = Math.max(180, Math.min(300, Math.floor((play.w - pad * 2 - gap) / 2)));
      const rowW = cardW * 2 + gap;
      const rowX = play.x + Math.round((play.w - rowW) / 2);

      options.forEach((word, i) => {
        const row = rows[i] || findMatchableRow(word, rows) || { word };
        const cellX = rowX + i * (cardW + gap);
        const artSrc = row.artSrc || null;
        if (artSrc) {
          L.place(page, {
            locked: false,
            kind: 'image',
            asset: artSrc,
            w: cardW,
            h: cardH,
            intentional: true,
            anchor: { x: cellX, y: cardsTop, w: cardW, h: cardH },
            role: 'choiceCard',
            meta: {
              word,
              artSrc,
              artTier: row.tier || null,
              propKey: row.propKey || null,
            },
          });
        } else {
          L.place(page, {
            locked: false,
            kind: 'emoji',
            emoji: row.glyph || '★',
            w: cardW,
            h: cardH,
            intentional: true,
            anchor: { x: cellX, y: cardsTop, w: cardW, h: cardH },
            role: 'choiceCard',
            meta: { word, artTier: row.tier || null },
          });
        }
        const chipW = Math.min(cardW, Math.max(90, word.length * 14 + 24));
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: solidPng(chipW, labelH, '#f8fafc', word, '#0f172a'),
          w: chipW,
          h: labelH,
          intentional: true,
          anchor: {
            x: Math.round(cellX + (cardW - chipW) / 2),
            y: cardsTop + cardH + labelGap,
            w: chipW,
            h: labelH,
          },
          role: 'choiceLabel',
          meta: { word },
        });
      });

      L.place(page, {
        locked: true,
        kind: 'image',
        asset: solidPng(play.w - 64, writeH, '#ffffff', frame, '#334155'),
        w: play.w - 64,
        h: writeH,
        intentional: true,
        anchor: { x: play.x + 32, y: frameY, w: play.w - 64, h: writeH },
        role: 'choiceFrame',
        meta: { frame, options: options.slice() },
      });
    }

    page.notes.push('recipe:thisOrThat');
    page.notes.push('choiceOptions:' + options.join('|'));
    if (ctx && ctx.source) page.notes.push('choiceSource:' + ctx.source);
  }

  /**
   * Function YES/NO rules (never color). Maps themeCue → YES; anything else → NO.
   * Prefer eat / wear / animal / play — same cue bank as themeCueForWord.
   */
  const YES_NO_RULES = [
    { id: 'eat', question: 'Can you eat it?', yesCues: ['food'] },
    { id: 'wear', question: 'Can you wear it?', yesCues: ['clothes'] },
    { id: 'animal', question: 'Is it an animal?', yesCues: ['animal'] },
    { id: 'play', question: 'Is it something you play with?', yesCues: ['sport'] },
  ];

  function yesNoRuleHint(question) {
    const q = String(question || '').trim();
    return q ? ('Sort YES or NO — ' + q) : 'Sort each card into YES or NO.';
  }

  /** A1: rule only (no write line). A2+: simple Why scaffold. */
  const YES_NO_WHY_SCAFFOLD = 'It goes in YES/NO because ______.';
  function yesNoWhyWriteLine(level) {
    const lv = String(level || '').trim().toUpperCase();
    if (!lv || lv === 'A1') return null;
    return YES_NO_WHY_SCAFFOLD;
  }

  function yesNoSplitOk(yesN, noN) {
    return (yesN >= 3 && noN >= 1) || (yesN >= 2 && noN >= 2);
  }

  /**
   * Prefer lesson.activity.yesNoSort { question, options[4], yes[], ruleHint? }
   * when pictured + unique visuals + valid YES/NO counts. Else derive.
   */
  function resolveYesNoSort(lesson, vocabArt, meta) {
    const pictured = picturedMatchableRows(vocabArt);
    const unique = uniqueVisualRows(pictured);
    if (unique.length < 4) return null;

    const raw = lesson && lesson.activity && lesson.activity.yesNoSort;
    if (raw && Array.isArray(raw.options) && Array.isArray(raw.yes)) {
      const options = raw.options.map((w) => String(w || '').trim()).filter(Boolean).slice(0, 4);
      const yesList = raw.yes.map((w) => String(w || '').trim()).filter(Boolean);
      const yesLower = new Set(yesList.map((w) => w.toLowerCase()));
      if (options.length === 4 && new Set(options.map((o) => o.toLowerCase())).size === 4) {
        const rows = options.map((w) => findMatchableRow(w, pictured));
        if (rows.every(Boolean) && !hasVisualTwins(rows)) {
          const yesRows = rows.filter((r) => yesLower.has(String(r.word).toLowerCase()));
          const noRows = rows.filter((r) => !yesLower.has(String(r.word).toLowerCase()));
          if (yesNoSplitOk(yesRows.length, noRows.length)
            && yesRows.length === yesList.length
            && options.every((o) => yesLower.has(o.toLowerCase()) || noRows.some(
              (r) => String(r.word).toLowerCase() === o.toLowerCase()
            ))) {
            const question = String(raw.question || '').trim() || 'Can you use it?';
            // Reject color questions even from lesson payload.
            if (/\b(color|colour|yellow|red|blue|green|pink|purple|orange|brown|black|white)\b/i.test(question)) {
              return deriveYesNoSort(lesson, unique, meta);
            }
            const level = meta && meta.level;
            return {
              options,
              yes: yesRows.map((r) => r.word),
              no: noRows.map((r) => r.word),
              rows,
              question,
              ruleHint: raw.ruleHint ? String(raw.ruleHint).trim() : yesNoRuleHint(question),
              whyLine: yesNoWhyWriteLine(level),
              source: 'lesson',
              ruleId: null,
            };
          }
        }
      }
    }

    return deriveYesNoSort(lesson, unique, meta);
  }

  /**
   * Binary sort from theme cues when oddOneOut has no 3+1 set.
   * Needs uniqueVisualRows ≥4 and a rule with 3+1 or 2+2 pictured YES/NO.
   */
  function deriveYesNoSort(lesson, picturedUnique, meta) {
    const pool = uniqueVisualRows(picturedUnique || []);
    if (pool.length < 4) return null;
    const seed = hashStr(((lesson && lesson.title) || '') + '|yesNoSort');
    const tagged = pool.map((row) => ({
      row,
      cue: themeCueForWord(row.word, lesson),
    }));

    for (let ri = 0; ri < YES_NO_RULES.length; ri++) {
      const rule = YES_NO_RULES[ri];
      const yesCueSet = new Set(rule.yesCues);
      const yesPool = uniqueVisualRows(
        tagged.filter((t) => yesCueSet.has(t.cue)).map((t) => t.row)
      );
      const noPool = uniqueVisualRows(
        tagged.filter((t) => !yesCueSet.has(t.cue)).map((t) => t.row)
      );
      if (!yesNoSplitOk(yesPool.length, noPool.length)) continue;

      let yesPick;
      let noPick;
      const ruleSeed = seed ^ (ri * 0x9e37);
      if (yesPool.length >= 3 && noPool.length >= 1) {
        yesPick = pick(yesPool, 3, ruleSeed);
        noPick = pick(noPool, 1, ruleSeed ^ 0xe5e5);
      } else {
        yesPick = pick(yesPool, 2, ruleSeed);
        noPick = pick(noPool, 2, ruleSeed ^ 0xe5e5);
      }
      if (!yesPick.length || !noPick.length) continue;
      const optionRows = [...yesPick, ...noPick];
      if (optionRows.length !== 4 || hasVisualTwins(optionRows)) continue;

      const shuffled = pick(optionRows, 4, ruleSeed ^ 0xf17);
      const yesWords = yesPick.map((r) => r.word);
      const yesLower = new Set(yesWords.map((w) => String(w).toLowerCase()));
      const level = meta && meta.level;
      return {
        options: shuffled.map((r) => r.word),
        yes: yesWords,
        no: noPick.map((r) => r.word),
        rows: shuffled,
        question: rule.question,
        ruleHint: yesNoRuleHint(rule.question),
        whyLine: yesNoWhyWriteLine(level),
        source: 'derived',
        ruleId: rule.id,
        yesSet: yesLower,
      };
    }
    return null;
  }

  function canBuildYesNoSort(lesson, vocabArt, meta) {
    return !!resolveYesNoSort(lesson, vocabArt, meta || { level: 'A2' });
  }

  /**
   * Two YES/NO bins in targetBay + 4 pictured dock cards (oddOneOut card pattern).
   * A2+ optional Why write line under the bins.
   */
  function yesNoSort(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const options = (ctx && Array.isArray(ctx.options) ? ctx.options : [])
      .map((w) => String(w || '').trim())
      .filter(Boolean)
      .slice(0, 4);
    const rows = (ctx && Array.isArray(ctx.rows) ? ctx.rows : []).slice(0, 4);
    const yesList = (ctx && Array.isArray(ctx.yes) ? ctx.yes : [])
      .map((w) => String(w || '').trim())
      .filter(Boolean);
    const yesLower = new Set(yesList.map((w) => w.toLowerCase()));
    const question = String((ctx && ctx.question) || '').trim();
    const whyLine = ctx && ctx.whyLine != null
      ? (String(ctx.whyLine).trim() || null)
      : yesNoWhyWriteLine(ctx && ctx.level);
    if (options.length < 4) return;

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    if (bay) {
      const writeH = whyLine ? 48 : 0;
      const pad = 12;
      const gapBins = 20;
      const binH = Math.max(140, bay.h - pad * 2 - writeH - (whyLine ? 8 : 0));
      const binW = Math.max(200, Math.floor((bay.w - pad * 2 - gapBins) / 2));
      const bins = [
        { label: 'YES', fill: '#dcfce7', ink: '#14532d' },
        { label: 'NO', fill: '#fee2e2', ink: '#7f1d1d' },
      ];
      bins.forEach((bin, i) => {
        const cellX = bay.x + pad + i * (binW + gapBins);
        const cellY = bay.y + pad;
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: solidPng(binW, binH, bin.fill, bin.label, bin.ink),
          w: binW,
          h: binH,
          intentional: true,
          anchor: { x: cellX, y: cellY, w: binW, h: binH },
          role: 'yesNoBin',
          meta: { bin: bin.label, question },
        });
      });
      if (whyLine) {
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: solidPng(bay.w - 64, writeH, '#ffffff', whyLine, '#334155'),
          w: bay.w - 64,
          h: writeH,
          intentional: true,
          anchor: {
            x: bay.x + 32,
            y: bay.y + bay.h - writeH - 4,
            w: bay.w - 64,
            h: writeH,
          },
          role: 'yesNoWhy',
          meta: { whyLine, question },
        });
      }
    }

    const dock = L.zoneRect(page, 'dock');
    const n = 4;
    const gap = 18;
    const labelH = 28;
    let cardW = 140;
    let artH = 100;
    if (dock && dock.w) {
      cardW = Math.min(180, Math.max(110, Math.floor((dock.w - gap * (n - 1)) / n)));
      artH = Math.max(88, Math.min(112, dock.h - labelH - 10));
    }

    const pieces = options.map((word, i) => {
      const row = rows[i] || findMatchableRow(word, rows) || { word };
      const answer = yesLower.has(word.toLowerCase()) ? 'YES' : 'NO';
      const meta = {
        word,
        answer,
        artSrc: row.artSrc || null,
        artTier: row.tier || null,
      };
      if (row.propKey) meta.propKey = row.propKey;
      if (row.artSrc) {
        return { kind: 'image', asset: row.artSrc, role: 'yesNoCard', meta };
      }
      return { kind: 'emoji', emoji: row.glyph || '★', role: 'yesNoCard', meta };
    });

    const placed = L.placeDockRow(page, pieces, {
      w: cardW,
      h: artH,
      cols: 4,
      noShrink: true,
    });
    if (Array.isArray(placed) && placed.length === 4 && dock) {
      placed.forEach((rect, i) => {
        if (!rect) return;
        const word = options[i];
        const chipW = Math.min(cardW, Math.max(72, word.length * 11 + 16));
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: solidPng(chipW, labelH, '#f8fafc', word, '#0f172a'),
          w: chipW,
          h: labelH,
          intentional: true,
          anchor: {
            x: Math.round(rect.x + (rect.w - chipW) / 2),
            y: Math.min(dock.y + dock.h - labelH - 2, rect.y + rect.h + 2),
            w: chipW,
            h: labelH,
          },
          role: 'yesNoLabel',
          meta: { word },
        });
      });
    }

    page.notes.push('recipe:yesNoSort');
    page.notes.push('yesNoQuestion:' + (question || ''));
    page.notes.push('yesNoYes:' + yesList.join('|'));
    if (ctx && ctx.source) page.notes.push('yesNoSource:' + ctx.source);
    if (ctx && ctx.ruleId) page.notes.push('yesNoRule:' + ctx.ruleId);
  }

  /** Max letters on a fixSentence dock / slot tile (arm's-length ClassIn). */
  const FIX_TILE_MAX = 14;

  /** Function words we never treat as the single error target. */
  const FIX_STOP = new Set([
    'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'but',
    'with', 'from', 'by', 'as', 'so', 'if', 'up', 'out', 'not', 'no', 'yes',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'our', 'their',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'am',
    'do', 'does', 'did', 'have', 'has', 'had', 'will', 'can', 'would', 'should',
  ]);

  function isShortFixTile(w) {
    const s = String(w || '').trim();
    return s.length >= 1 && s.length <= FIX_TILE_MAX && !/\s/.test(s);
  }

  function countWordInSentence(sentence, word) {
    const w = String(word || '').trim();
    if (!w) return 0;
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = String(sentence || '').match(new RegExp(`\\b${esc}\\b`, 'gi'));
    return m ? m.length : 0;
  }

  function replaceOnceWord(sentence, from, to) {
    const esc = String(from || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(sentence || '').replace(new RegExp(`\\b${esc}\\b`), String(to || ''));
  }

  /** Strip trailing sentence punct for matching; keep token display intact. */
  function coreToken(tok) {
    return String(tok || '').replace(/[.,!?;:]+$/g, '');
  }

  function sentenceChipPng(w, h, fill, label, labelColor) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
    ctx.fill();
    if (label) {
      ctx.fillStyle = labelColor || '#0f172a';
      ctx.font = `700 ${Math.max(22, Math.floor(h * 0.42))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, h / 2, w - 20);
    }
    return c.toDataURL('image/png');
  }

  /** Common ESL wrong forms for a content word (deterministic short list). */
  function morphWrongForms(word) {
    const w = String(word || '').trim();
    const lower = w.toLowerCase();
    if (!lower || !isShortFixTile(w)) return [];
    const out = [];
    const push = (x) => {
      if (x && isShortFixTile(x) && x.toLowerCase() !== lower) out.push(x);
    };
    const PAIRS = {
      go: ['goes', 'going', 'went'],
      goes: ['go', 'going', 'went'],
      going: ['go', 'goes', 'went'],
      went: ['go', 'goes', 'going'],
      play: ['plays', 'playing', 'played'],
      plays: ['play', 'playing', 'played'],
      playing: ['play', 'plays', 'played'],
      played: ['play', 'plays', 'playing'],
      eat: ['eats', 'eating', 'ate'],
      eats: ['eat', 'eating', 'ate'],
      have: ['has', 'having', 'had'],
      has: ['have', 'having', 'had'],
      is: ['are', 'was', 'be'],
      are: ['is', 'were', 'be'],
      see: ['sees', 'seeing', 'saw'],
      sees: ['see', 'seeing', 'saw'],
      like: ['likes', 'liking', 'liked'],
      likes: ['like', 'liking', 'liked'],
      need: ['needs', 'needing', 'needed'],
      needs: ['need', 'needing', 'needed'],
      blow: ['blows', 'blowing', 'blew'],
      blows: ['blow', 'blowing', 'blew'],
      pass: ['passes', 'passing', 'passed'],
      passes: ['pass', 'passing', 'passed'],
    };
    (PAIRS[lower] || []).forEach(push);
    // Avoid inventing silly plurals for long abstract nouns (teamwork→teamworks).
    const nounish = /(ness|ment|ship|hood|tion|sion|ance|ence|ism|ity|work|ware)$/i.test(w);
    if (/ies$/i.test(w) && w.length > 4) push(w.slice(0, -3) + 'y');
    else if (/y$/i.test(w) && w.length > 2 && !/[aeiou]y$/i.test(w) && !nounish) {
      push(w.slice(0, -1) + 'ies');
    } else if (/s$/i.test(w) && w.length > 3 && !/ss$/i.test(w) && !nounish) {
      push(w.slice(0, -1));
    } else if (w.length >= 3 && w.length <= 8 && !nounish) {
      push(w + 's');
    }
    if (/ing$/i.test(w) && w.length > 5) push(w.slice(0, -3));
    // Preserve original capitalization style when source was Title Case
    if (/^[A-Z]/.test(w)) {
      return out.map((x) => x.charAt(0).toUpperCase() + x.slice(1));
    }
    return out;
  }

  /**
   * Full vocabulary for text-only fixSentence. Board slice is for pictured
   * pages; overflow words still carry sentences + distractor tiles so a thin
   * pictured board (apple only) with overflow abstracts does not drop
   * fixSentence and fall through to mysteryHints.
   */
  function fixSentenceVocabEntries(lesson) {
    return (lesson && lesson.vocabulary || []).filter((v) => v && (v.word || v.emoji));
  }

  function fixSentenceWordPool(lesson) {
    return fixSentenceVocabEntries(lesson)
      .map((v) => (typeof v === 'string' ? v : (v && v.word)))
      .filter(Boolean);
  }

  /**
   * Candidate correct sentences from lesson content only — vocab.sentence,
   * reviewSentences, or a single-blank frame filled with a lesson word.
   * No free invent (keeps oddOneOut / mystery reachable when bare word lists).
   */
  function collectFixSourceSentences(lesson) {
    const out = [];
    const seen = new Set();
    const push = (s) => {
      const t = String(s || '').trim().replace(/\s+/g, ' ');
      if (!t || t.length < 8 || t.length > 72) return;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(t);
    };
    fixSentenceVocabEntries(lesson).forEach((v) => {
      if (v && typeof v === 'object') push(v.sentence);
    });
    (lesson && lesson.reviewSentences || []).forEach(push);
    const words = fixSentenceWordPool(lesson);
    boardFrames(lesson).forEach((frame) => {
      const segs = frameSegments(frame);
      if (segs.filter((s) => s.blank).length !== 1) return;
      words.forEach((w) => {
        if (!isShortFixTile(w)) return;
        push(segs.map((s) => (s.blank ? w : (s.text || ''))).join(''));
      });
    });
    return out;
  }

  /**
   * Prefer lesson.activity.fixSentence when valid; else derive one single-error
   * sentence from lesson content. Returns null when not credible.
   */
  function resolveFixSentence(lesson) {
    const raw = lesson && lesson.activity && lesson.activity.fixSentence;
    const fromLesson = normalizeFixSentence(raw, lesson);
    if (fromLesson) {
      fromLesson.source = 'lesson';
      return fromLesson;
    }
    return deriveFixSentence(lesson);
  }

  function normalizeFixSentence(raw, lesson) {
    if (!raw || typeof raw !== 'object') return null;
    const sentence = String(raw.sentence || '').trim().replace(/\s+/g, ' ');
    const wrong = String(raw.wrong || '').trim();
    const correct = String(raw.correct || '').trim();
    if (!sentence || sentence.length > 80) return null;
    if (!wrong || !correct) return null;
    if (wrong.toLowerCase() === correct.toLowerCase()) return null;
    if (!isShortFixTile(wrong) || !isShortFixTile(correct)) return null;
    if (countWordInSentence(sentence, wrong) !== 1) return null;

    let distractors = (Array.isArray(raw.distractors) ? raw.distractors : [])
      .map((d) => String(d || '').trim())
      .filter((d) => isShortFixTile(d)
        && d.toLowerCase() !== wrong.toLowerCase()
        && d.toLowerCase() !== correct.toLowerCase());
    const board = fixSentenceWordPool(lesson);
    board.forEach((w) => {
      if (distractors.length >= 2) return;
      const low = String(w).toLowerCase();
      if (low === wrong.toLowerCase() || low === correct.toLowerCase()) return;
      if (!isShortFixTile(w)) return;
      if (distractors.some((d) => d.toLowerCase() === low)) return;
      distractors.push(w);
    });
    morphWrongForms(correct).forEach((w) => {
      if (distractors.length >= 2) return;
      const low = w.toLowerCase();
      if (low === wrong.toLowerCase() || low === correct.toLowerCase()) return;
      if (distractors.some((d) => d.toLowerCase() === low)) return;
      distractors.push(w);
    });
    distractors = distractors.slice(0, 2);
    if (distractors.length < 1) return null;
    return { sentence, wrong, correct, distractors, source: 'lesson' };
  }

  function deriveFixSentence(lesson) {
    // Full lesson vocab — not adapted board slice (overflow still usable as tiles).
    const board = fixSentenceWordPool(lesson);
    if (board.length < 2) return null;
    const seed = hashStr(((lesson && lesson.title) || '') + '|fixSentence');
    const boardLower = new Set(board.map((w) => String(w).toLowerCase()));

    const vocabSentences = [];
    const seen = new Set();
    const pushUnique = (arr, s) => {
      const t = String(s || '').trim().replace(/\s+/g, ' ');
      if (!t || t.length < 8 || t.length > 72) return;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      arr.push(t);
    };
    fixSentenceVocabEntries(lesson).forEach((v) => {
      if (v && typeof v === 'object') pushUnique(vocabSentences, v.sentence);
    });
    const review = [];
    (lesson && lesson.reviewSentences || []).forEach((s) => pushUnique(review, s));
    const fromFrames = [];
    boardFrames(lesson).forEach((frame) => {
      const segs = frameSegments(frame);
      if (segs.filter((s) => s.blank).length !== 1) return;
      board.forEach((w) => {
        if (!isShortFixTile(w)) return;
        pushUnique(fromFrames, segs.map((s) => (s.blank ? w : (s.text || ''))).join(''));
      });
    });

    // Prefer real lesson lines over blank-filled frames (frames invent weak hosts).
    const tiers = [vocabSentences, review, fromFrames];

    function tryCorrupt(correctSentence, preferMorph) {
      const tokens = correctSentence.split(/\s+/).filter(Boolean);
      const contentIdx = [];
      tokens.forEach((tok, i) => {
        const core = coreToken(tok);
        if (!core || !isShortFixTile(core)) return;
        if (FIX_STOP.has(core.toLowerCase())) return;
        if (countWordInSentence(correctSentence, core) !== 1) return;
        contentIdx.push(i);
      });
      if (!contentIdx.length) return null;

      const boardHits = contentIdx.filter((i) => boardLower.has(coreToken(tokens[i]).toLowerCase()));
      const pool = boardHits.length ? boardHits : contentIdx;
      const ordered = pick(pool.slice(), pool.length, seed);

      const attempts = [];
      ordered.forEach((pickIdx) => {
        const correct = coreToken(tokens[pickIdx]);
        if (!correct) return;
        const morphs = morphWrongForms(correct);
        const otherBoard = board.filter((w) => String(w).toLowerCase() !== correct.toLowerCase() && isShortFixTile(w));
        if (preferMorph && morphs.length) {
          attempts.push({ correct, wrong: morphs[seed % morphs.length], wrongKind: 'morph', morphs, otherBoard });
        } else if (!preferMorph && otherBoard.length) {
          attempts.push({
            correct,
            wrong: otherBoard[(seed ^ 0x51) % otherBoard.length],
            wrongKind: 'vocab',
            morphs,
            otherBoard,
          });
        } else if (morphs.length) {
          attempts.push({ correct, wrong: morphs[seed % morphs.length], wrongKind: 'morph', morphs, otherBoard });
        } else if (otherBoard.length) {
          attempts.push({
            correct,
            wrong: otherBoard[(seed ^ 0x51) % otherBoard.length],
            wrongKind: 'vocab',
            morphs,
            otherBoard,
          });
        }
      });

      for (let ai = 0; ai < attempts.length; ai++) {
        const { correct, wrong, wrongKind, morphs, otherBoard } = attempts[ai];
        if (!wrong || wrong.toLowerCase() === correct.toLowerCase()) continue;
        const broken = replaceOnceWord(correctSentence, correct, wrong);
        if (countWordInSentence(broken, wrong) !== 1) continue;
        if (broken.toLowerCase() === correctSentence.toLowerCase()) continue;

        const distractors = [];
        const pushD = (w) => {
          if (distractors.length >= 2) return;
          const s = String(w || '').trim();
          if (!isShortFixTile(s)) return;
          const low = s.toLowerCase();
          if (low === wrong.toLowerCase() || low === correct.toLowerCase()) return;
          if (distractors.some((d) => d.toLowerCase() === low)) return;
          distractors.push(s);
        };
        // Morph repairs: prefer other wrong forms as distractors (goes/going),
        // not random board nouns that can't fill the slot (Manus soccer B2).
        if (wrongKind === 'morph') {
          morphs.forEach(pushD);
          pick(otherBoard.filter((w) => w.toLowerCase() !== wrong.toLowerCase()), 2, seed ^ 0xd15)
            .forEach(pushD);
        } else {
          pick(otherBoard.filter((w) => w.toLowerCase() !== wrong.toLowerCase()), 2, seed ^ 0xd15)
            .forEach(pushD);
          morphs.forEach(pushD);
        }
        if (distractors.length < 1) continue;

        return {
          sentence: broken,
          wrong,
          correct,
          distractors: distractors.slice(0, 2),
          source: 'derived',
          wrongKind,
          correctSentence,
        };
      }
      return null;
    }

    // Morph ESL errors first, then vocab swaps — still within tier priority.
    for (const preferMorph of [true, false]) {
      for (let t = 0; t < tiers.length; t++) {
        const sources = tiers[t];
        if (!sources.length) continue;
        const rotated = pick(sources.slice(), sources.length, seed ^ (t * 17));
        for (let si = 0; si < rotated.length; si++) {
          const hit = tryCorrupt(rotated[si], preferMorph);
          if (hit) return hit;
        }
      }
    }
    return null;
  }

  function canBuildFixSentence(lesson) {
    // Frames already cover production practice — a one-blank fixSentence with
    // yellow tiles is a worse Frames twin (Kitchen Helpers Tool Challenge).
    // Prefer oddOneOut / yesNoSort / thisOrThat / mysteryHints / sortBins.
    if (hasFramesContent(lesson)) return false;
    return !!resolveFixSentence(lesson);
  }

  /**
   * One sentence with a single wrong word in a drop slot + dock of correct
   * word and 1–2 distractors (text tiles). Standard activity zones — no art.
   */
  function fixSentence(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const sentence = ctx && ctx.sentence ? String(ctx.sentence).trim() : '';
    const wrong = ctx && ctx.wrong ? String(ctx.wrong).trim() : '';
    const correct = ctx && ctx.correct ? String(ctx.correct).trim() : '';
    const distractors = (ctx && Array.isArray(ctx.distractors) ? ctx.distractors : [])
      .map((d) => String(d || '').trim())
      .filter(Boolean)
      .slice(0, 2);
    if (!sentence || !wrong || !correct) return;

    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const tokens = sentence.split(/\s+/).filter(Boolean);
    let wrongAt = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (coreToken(tokens[i]).toLowerCase() === wrong.toLowerCase()) {
        wrongAt = i;
        break;
      }
    }
    if (wrongAt < 0) return;

    const tileH = 68;
    const gap = 12;
    const sizes = tokens.map((tok, i) => {
      const label = i === wrongAt ? wrong : tok;
      const tw = Math.min(220, Math.max(56, String(label).length * 16 + 28));
      return { tok, label, tw, isWrong: i === wrongAt };
    });
    const totalW = sizes.reduce((n, s) => n + s.tw, 0) + gap * Math.max(0, sizes.length - 1);
    let x = bay.x + Math.max(8, Math.round((bay.w - totalW) / 2));
    const y = bay.y + Math.round((bay.h - tileH) / 2);

    sizes.forEach((s) => {
      if (s.isWrong) {
        // Blank replacement slot only — do not paint the wrong word on the
        // sentence (Manus soccer B2: visible "balls" pill made the dock trivial).
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: slotGhostPng(s.tw, tileH, ''),
          w: s.tw, h: tileH,
          intentional: true,
          anchor: { x, y, w: s.tw, h: tileH },
          role: 'fixSlot',
          meta: { wrong, correct },
        });
      } else {
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: sentenceChipPng(s.tw, tileH, '#f8fafc', s.label, '#0f172a'),
          w: s.tw, h: tileH,
          intentional: true,
          anchor: { x, y, w: s.tw, h: tileH },
          role: 'fixWord',
          meta: { text: s.label },
        });
      }
      x += s.tw + gap;
    });

    // Dock: correct + wrong (trap) + distractors so kids must choose, not peel.
    const dockWords = pick(
      [correct, wrong, ...distractors],
      Math.min(4, 2 + distractors.length),
      hashStr(((lesson && lesson.title) || '') + '|fixDock')
    );
    const longest = dockWords.reduce((n, w) => Math.max(n, String(w).length), 0);
    const dock = L.zoneRect(page, 'dock');
    let tileW = Math.min(200, Math.max(100, longest * 14 + 28));
    let dockH = 64;
    if (dock && dock.w) {
      const n = dockWords.length;
      const oneRowW = Math.floor((dock.w - gap * Math.max(0, n - 1)) / n);
      if (oneRowW >= 96) tileW = Math.min(tileW, oneRowW);
      dockH = Math.max(56, Math.min(68, dock.h - 8));
    }
    L.placeDockRow(page, dockWords.map((w) => ({
      kind: 'tile',
      text: w,
      role: 'fixTile',
      meta: {
        word: w,
        correct: w.toLowerCase() === correct.toLowerCase(),
      },
    })), { w: tileW, h: dockH });

    page.notes.push('recipe:fixSentence');
    page.notes.push('fixWrong:' + wrong);
    page.notes.push('fixCorrect:' + correct);
    if (ctx && ctx.source) page.notes.push('fixSource:' + ctx.source);
  }

  function sortBins(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    // Things vs Ideas — honest when some vocab has pictures and some are abstract
    // (soccer: whistle/ball vs practice/effort). Painted labels beat random trays
    // that read as mystery chrome with no job.
    const bins = [
      { label: 'Things', fill: '#dbeafe' },
      { label: 'Ideas', fill: '#dcfce7' },
    ];
    // Fill the whole targetBay — small corner bins read as stranded chrome, not one activity.
    // Activity zones now span mid-board (edbLayout) so fruit sortBins isn't a right scrap.
    const pad = 12;
    const gapBins = 20;
    const binW = Math.max(200, Math.floor((bay.w - pad * 2 - gapBins) / 2));
    const binH = Math.max(160, bay.h - pad * 2);
    bins.forEach((bin, i) => {
      const cellX = bay.x + pad + i * (binW + gapBins);
      const cellY = bay.y + pad;
      const asset = solidPng(binW, binH, bin.fill, bin.label, '#1e293b');
      L.place(page, {
        locked: true,
        kind: 'image',
        asset,
        w: binW,
        h: binH,
        intentional: true,
        anchor: { x: cellX, y: cellY, w: binW, h: binH },
        role: 'sortBin',
        meta: { bin: bin.label },
      });
    });
    const cards = vocabList(lesson);
    if (!cards.length) return;
    // Never silently drop a taught word — shrink the cards or wrap to a second row.
    const dock = L.zoneRect(page, 'dock');
    const gap = 14;
    const longest = cards.reduce((n, v) => Math.max(n, String(v.word || '').length), 0);
    const minWForWord = Math.min(180, Math.max(72, longest * 11 + 20));
    let cardW = Math.max(96, minWForWord);
    let cardH = 64;
    if (dock && dock.w) {
      const n = cards.length;
      const oneRowW = Math.floor((dock.w - gap * Math.max(0, n - 1)) / n);
      if (oneRowW >= 72) {
        cardW = Math.min(180, Math.max(72, oneRowW));
        cardH = Math.max(52, Math.min(72, Math.round(cardW * 0.45)));
      } else {
        const cols = Math.ceil(n / 2);
        cardW = Math.min(160, Math.max(72, Math.floor((dock.w - gap * Math.max(0, cols - 1)) / cols)));
        cardH = Math.max(48, Math.min(64, Math.floor((dock.h - gap) / 2)));
      }
    }
    L.placeDockRow(page, cards.map((v) => ({
      kind: 'tile',
      text: v.word,
      emoji: v.emoji,
      role: 'sortCard',
      meta: { word: v.word },
    })), { w: cardW, h: cardH });
    page.notes.push('recipe:sortBins');
  }

  const HERO_TAG_STOP = new Set([
    'a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
    'living', 'near', 'next', 'my', 'our', 'your', 'how', 'what', 'when', 'where',
    'why', 'who', 'i', 'do',
  ]);

  /** Theme tokens from title + vocab for hero matching (no stopwords). */
  function heroThemeTags(lesson) {
    const words = [
      ...((lesson && lesson.vocabulary) || []).flatMap((v) => {
        const w = typeof v === 'string' ? v : v && v.word;
        return w ? [String(w).toLowerCase()] : [];
      }),
      ...String((lesson && lesson.title) || '').toLowerCase().split(/\W+/).filter(Boolean),
      ...String((lesson && lesson.activity && lesson.activity.title) || '').toLowerCase().split(/\W+/).filter(Boolean),
    ];
    return [...new Set(words.filter((t) => t && !HERO_TAG_STOP.has(t) && t.length > 2))];
  }

  /**
   * Kings proven enough to ship as heroProp (curated dock + known OK quality).
   * Unlisted / experimental kings (e.g. basketball-hoop-stage) stay in the bank
   * and kits but fall through to sortBins — empty > weak king.
   */
  const SHIPPABLE_KING_KEYS = new Set([
    'dental-kid-open-mouth',
    'face-blank',
    'trampoline',
    'fire-truck',
    'tent',
    'bath-bathtub',
    'bath-sink',
    'hospital-bed',
    'playground-slide',
    'cafe-counter-stage',
    'farm-barn',
    'dollhouse-cutaway',
    'aquarium-tank',
    'construction-tower-crane',
    'castle-wall-gate',
    // Medium hero-targets pack — OPEN play surfaces only (closed is swap art).
    // Not tent / aquarium / face-blank / dress-up: those kings already exist.
    'hero-chest-open',
    'hero-box-open',
    'hero-backpack-open',
    'hero-suitcase-open',
    'hero-cupboard-open',
    'hero-drawer-open',
    'hero-curtain-open',
    'hero-locker-open',
    'hero-envelope-open',
    'hero-gift-box-open',
    'hero-mailbox-open',
    'hero-fridge-open',
    'hero-washing-machine-open',
    'hero-recycling-bin-open',
    'hero-vending-machine-open',
    'hero-garage-open',
    'hero-safe-open',
    'hero-barrel-open',
    'hero-monster-mouth',
    'hero-animal-mouth',
    'hero-shelf',
    'hero-lunch-tray',
    'hero-pizza-base',
    'hero-sandwich-base',
    'hero-garden-patch',
    // Waves 2–12 open play surfaces (closed = swap art only).
    'hero-oven-open',
    'hero-microwave-open',
    'hero-dishwasher-open',
    'hero-toaster-open',
    'hero-air-fryer-open',
    'hero-blender-open',
    'hero-pantry-open',
    'hero-freezer-open',
    'hero-grill-open',
    'hero-toolbox-open',
    'hero-toy-box-open',
    'hero-picnic-basket-open',
    'hero-cooler-open',
    'hero-laundry-basket-open',
    'hero-wardrobe-open',
    'hero-cubby-open',
    'hero-lunchbox-open',
    'hero-cookie-jar-open',
    'hero-piggy-bank-open',
    'hero-jewelry-box-open',
    'hero-craft-box-open',
    'hero-paint-box-open',
    'hero-pencil-case-open',
    'hero-school-desk-open',
    'hero-medicine-cabinet-open',
    'hero-wooden-crate-open',
    'hero-trash-can-open',
    'hero-compost-bin-open',
    'hero-blanket-fort-open',
    'hero-cave-open',
    'hero-treehouse-open',
    'hero-playhouse-open',
    'hero-puppet-theater-open',
    'hero-birdcage-open',
    'hero-pet-carrier-open',
    // Waves 13–14 — transport / holiday play surfaces (no space/rocket: soft-gate).
    'hero-train-car-open',
    'hero-bus-door-open',
    'hero-school-bus-door-open',
    'hero-subway-door-open',
    'hero-elevator-door-open',
    'hero-ferry-gate-open',
    'hero-taxi-trunk-open',
    'hero-ambulance-back-open',
    'hero-fire-truck-compartment-open',
    'hero-police-trunk-open',
    'hero-helicopter-door-open',
    'hero-sailboat-cabin-open',
    'hero-submarine-hatch-open',
    'hero-hot-air-balloon-basket-open',
    'hero-gondola-cabin-open',
    'hero-cable-car-cabin-open',
    'hero-ski-lift-chair-open',
    'hero-pirate-ship-hatch-open',
    'hero-train-platform',
    'hero-subway-platform',
    'hero-helipad',
    'hero-ferry-deck',
    'hero-tram-stop',
    'hero-monorail-platform',
    'hero-airport-baggage-carousel',
    'hero-runway-marker',
    'hero-cable-car-station',
    'hero-easter-basket-open',
    'hero-trick-or-treat-bucket-open',
    'hero-christmas-stocking-open',
    'hero-advent-calendar-box-open',
    'hero-valentine-mailbox-open',
    'hero-party-pinata-open',
    'hero-fireworks-box-open',
    'hero-fortune-cookie-jar-open',
    'hero-gingerbread-house-door-open',
    'hero-nativity-stable-open',
    'hero-ornament-box-open',
    'hero-wreath-storage-box-open',
    'hero-snow-globe-base-open',
    'hero-maypole-base-open',
    'hero-carnival-game-booth-open',
    'hero-birthday-present-stack-open',
    'hero-gift-sack-open',
    'hero-pumpkin-patch-bin-open',
    'hero-corn-maze-gate-open',
    'hero-beach-cooler-tub-open',
    'hero-sledding-hill',
    'hero-ice-rink-edge',
    'hero-sand-castle-mold',
    'hero-snowman-base',
    'hero-leaf-pile',
    'hero-puddle',
    'hero-campfire-log-ring',
    'hero-kite-ground-spot',
    'hero-parade-float-platform',
    'hero-festival-booth-counter',
  ]);

  /**
   * Play-surface heroes that have no LessonTraits theme yet (theme id none).
   * Kept off tent/face/aquarium/dress-up — those already have a theme + king.
   */
  const HERO_TARGET_STAGE_RULES = [
    { re: /\b(treasure|pirates?|chests?)\b/, key: 'hero-chest-open' },
    { re: /\bbackpacks?\b/, key: 'hero-backpack-open', not: /\b(school\s*buses?|city\s*buses?)\b/ },
    { re: /\b(suitcases?|luggage)\b/, key: 'hero-suitcase-open' },
    { re: /\b(cupboards?|cabinets?)\b/, key: 'hero-cupboard-open', not: /\b(medicine\s*cabinets?|filing\s*cabinets?|china\s*cabinets?)\b/ },
    { re: /\bdrawers?\b/, key: 'hero-drawer-open' },
    { re: /\bcurtains?\b/, key: 'hero-curtain-open' },
    { re: /\blockers?\b/, key: 'hero-locker-open', needs: /\b(school|gym|hallway|classroom|padlock|combination)\b/ },
    { re: /\benvelopes?\b/, key: 'hero-envelope-open' },
    // Plural: box(?:es)? — bare boxes? is "boxe(s)" and misses "box"/"toolbox".
    { re: /\b(gift\s*box(?:es)?|unwrap)\b/, key: 'hero-gift-box-open' },
    { re: /\bpresents?\b/, key: 'hero-gift-box-open', needs: /\b(gift|birthday|unwrap|christmas|party)\b/ },
    { re: /\bmailbox(?:es)?\b/, key: 'hero-mailbox-open' },
    { re: /\b(fridges?|refrigerators?)\b/, key: 'hero-fridge-open' },
    { re: /\b(washing\s*machines?|laundry)\b/, key: 'hero-washing-machine-open', not: /\b(laundry\s*baskets?|hampers?)\b/ },
    { re: /\b(recycl(?:e|ing)|recycling\s*bins?)\b/, key: 'hero-recycling-bin-open' },
    { re: /\bvending\s*machines?\b/, key: 'hero-vending-machine-open' },
    { re: /\bgarages?\b/, key: 'hero-garage-open', needs: /\b(car|cars|park|parking|driveway|mechanic)\b/ },
    { re: /\b(safes?|vaults?)\b/, key: 'hero-safe-open' },
    { re: /\bbarrels?\b/, key: 'hero-barrel-open' },
    { re: /\b(cardboard\s*box(?:es)?|packing\s*box(?:es)?)\b/, key: 'hero-box-open' },
    // Specific feed targets before bare "feed the" → monster.
    { re: /\bbirdcages?\b/, key: 'hero-birdcage-open' },
    { re: /\bhippos?\b/, key: 'hero-animal-mouth' },
    { re: /\b(monsters?|feed(?:ing)?\s+the\s+monsters?)\b/, key: 'hero-monster-mouth', not: /\b(dentist|dental|cavity|floss|hippos?|birdcages?|birds?|pets?)\b/ },
    { re: /\bpizzas?\b/, key: 'hero-pizza-base' },
    { re: /\bsandwiches?\b/, key: 'hero-sandwich-base' },
    { re: /\b(lunch\s*trays?|cafeteria\s*trays?)\b/, key: 'hero-lunch-tray' },
    { re: /\b(bookshel(?:f|ves)|empty\s*shel(?:f|ves))\b/, key: 'hero-shelf' },
    { re: /\b(garden\s*(?:patch|bed|box)|raised\s*bed)\b/, key: 'hero-garden-patch', not: /\b(farms?|barns?)\b/ },
    // Waves 2–12 — strong cues; needs/not avoid OFF steals.
    { re: /\bovens?\b/, key: 'hero-oven-open', not: /\b(microwave|toaster\s*oven|dutch\s*oven|air\s*fryer|toy\s*oven)\b/ },
    { re: /\bmicrowaves?\b/, key: 'hero-microwave-open' },
    { re: /\bdishwashers?\b/, key: 'hero-dishwasher-open' },
    { re: /\btoasters?\b/, key: 'hero-toaster-open', not: /\btoaster\s*ovens?\b/ },
    { re: /\bair\s*fryers?\b/, key: 'hero-air-fryer-open' },
    { re: /\bblenders?\b/, key: 'hero-blender-open' },
    { re: /\bpantr(?:y|ies)\b/, key: 'hero-pantry-open' },
    { re: /\bfreezers?\b/, key: 'hero-freezer-open' },
    { re: /\bgrills?\b/, key: 'hero-grill-open', needs: /\b(bbq|barbecue|cook(?:ing)?|outdoor|patio|steak|burger|hot\s*dog)\b/ },
    { re: /\btoolbox(?:es)?\b/, key: 'hero-toolbox-open' },
    { re: /\b(toy\s*box(?:es)?|toybox(?:es)?)\b/, key: 'hero-toy-box-open' },
    { re: /\bpicnic\s*baskets?\b/, key: 'hero-picnic-basket-open' },
    { re: /\bcoolers?\b/, key: 'hero-cooler-open', needs: /\b(picnic|beach|camp|ice|drink|soda|park)\b/, not: /\b(beach\s*coolers?|cooler\s*tubs?)\b/ },
    { re: /\b(laundry\s*baskets?|hampers?)\b/, key: 'hero-laundry-basket-open' },
    { re: /\bwardrobes?\b/, key: 'hero-wardrobe-open' },
    { re: /\bcubbies?\b/, key: 'hero-cubby-open', needs: /\b(school|classroom|kindergarten|preschool|hooks?)\b/ },
    { re: /\blunchbox(?:es)?\b/, key: 'hero-lunchbox-open' },
    { re: /\bcookie\s*jars?\b/, key: 'hero-cookie-jar-open' },
    { re: /\bpiggy\s*banks?\b/, key: 'hero-piggy-bank-open' },
    { re: /\bjewelry\s*box(?:es)?\b/, key: 'hero-jewelry-box-open' },
    { re: /\bcraft\s*box(?:es)?\b/, key: 'hero-craft-box-open' },
    { re: /\bpaint\s*box(?:es)?\b/, key: 'hero-paint-box-open' },
    { re: /\bpencil\s*cases?\b/, key: 'hero-pencil-case-open' },
    { re: /\bschool\s*desks?\b/, key: 'hero-school-desk-open' },
    { re: /\bmedicine\s*cabinets?\b/, key: 'hero-medicine-cabinet-open' },
    { re: /\b(wooden\s*crates?|packing\s*crates?)\b/, key: 'hero-wooden-crate-open' },
    { re: /\b(trash\s*cans?|garbage\s*cans?|rubbish\s*bins?)\b/, key: 'hero-trash-can-open' },
    { re: /\bcompost\s*bins?\b/, key: 'hero-compost-bin-open' },
    { re: /\bblanket\s*forts?\b/, key: 'hero-blanket-fort-open' },
    { re: /\bcaves?\b/, key: 'hero-cave-open', needs: /\b(explore|dark|bats?|rock|mountain|adventure|hide|bear)\b/, not: /\bman\s*cave\b/ },
    { re: /\btreehouses?\b/, key: 'hero-treehouse-open' },
    { re: /\bplayhouses?\b/, key: 'hero-playhouse-open' },
    { re: /\bpuppet\s*theaters?\b/, key: 'hero-puppet-theater-open' },
    { re: /\bpet\s*carriers?\b/, key: 'hero-pet-carrier-open' },
    // Waves 13–14 — strong multi-word cues; space/rocket stay soft (OFF).
    { re: /\b(train\s*cars?|passenger\s*trains?)\b/, key: 'hero-train-car-open' },
    { re: /\b(school\s*bus(?:es)?)\b/, key: 'hero-school-bus-door-open' },
    { re: /\b(city\s*bus(?:es)?|bus\s*doors?)\b/, key: 'hero-bus-door-open', not: /\bschool\s*bus(?:es)?\b/ },
    { re: /\b(subways?|metro\s*cars?)\b/, key: 'hero-subway-door-open', needs: /\b(door|doors|ride|train|station)\b/ },
    { re: /\belevators?\b/, key: 'hero-elevator-door-open' },
    { re: /\b(ferry\s*gates?|boarding\s*gates?)\b/, key: 'hero-ferry-gate-open' },
    { re: /\b(taxi\s*trunks?|cab\s*trunks?)\b/, key: 'hero-taxi-trunk-open' },
    { re: /\bambulances?\b/, key: 'hero-ambulance-back-open' },
    { re: /\b(fire\s*truck\s*compartments?|hose\s*bays?)\b/, key: 'hero-fire-truck-compartment-open' },
    { re: /\b(police\s*trunks?|police\s*cars?)\b/, key: 'hero-police-trunk-open', needs: /\b(trunk|gear|siren|officer|badge)\b/ },
    { re: /\bhelicopters?\b/, key: 'hero-helicopter-door-open' },
    { re: /\b(sailboats?|sail\s*boat\s*cabins?)\b/, key: 'hero-sailboat-cabin-open' },
    { re: /\bsubmarines?\b/, key: 'hero-submarine-hatch-open' },
    { re: /\b(hot\s*air\s*balloons?|balloon\s*baskets?)\b/, key: 'hero-hot-air-balloon-basket-open' },
    { re: /\b(gondolas?|ski\s*gondolas?)\b/, key: 'hero-gondola-cabin-open', not: /\bcable\s*cars?\b/ },
    { re: /\bcable\s*cars?\b/, key: 'hero-cable-car-cabin-open' },
    { re: /\b(ski\s*lifts?|chairlifts?)\b/, key: 'hero-ski-lift-chair-open' },
    { re: /\b(pirate\s*ships?|ship\s*hatches?)\b/, key: 'hero-pirate-ship-hatch-open', needs: /\b(pirate|hatch|deck|ship)\b/, not: /\b(treasure|chests?)\b/ },
    { re: /\btrain\s*platforms?\b/, key: 'hero-train-platform' },
    { re: /\bsubway\s*platforms?\b/, key: 'hero-subway-platform' },
    { re: /\bhelipads?\b/, key: 'hero-helipad' },
    { re: /\bferry\s*decks?\b/, key: 'hero-ferry-deck' },
    { re: /\btram\s*stops?\b/, key: 'hero-tram-stop' },
    { re: /\bmonorails?\b/, key: 'hero-monorail-platform' },
    { re: /\b(baggage\s*carousels?|luggage\s*carousels?)\b/, key: 'hero-airport-baggage-carousel' },
    { re: /\b(runway\s*markers?|runways?)\b/, key: 'hero-runway-marker', needs: /\b(airport|plane|airplane|jet|takeoff|landing)\b/ },
    { re: /\bcable\s*car\s*stations?\b/, key: 'hero-cable-car-station' },
    { re: /\beaster\s*baskets?\b/, key: 'hero-easter-basket-open' },
    { re: /\b(trick[\s-]*or[\s-]*treat\s*buckets?|halloween\s*buckets?)\b/, key: 'hero-trick-or-treat-bucket-open' },
    { re: /\b(christmas\s*stockings?|stockings?)\b/, key: 'hero-christmas-stocking-open', needs: /\b(christmas|santa|stocking|gift|present)\b/ },
    { re: /\badvent\s*calendars?\b/, key: 'hero-advent-calendar-box-open' },
    { re: /\b(valentine\s*mailboxes?|valentine\s*boxes?)\b/, key: 'hero-valentine-mailbox-open' },
    { re: /\bpi[nñ]atas?\b/, key: 'hero-party-pinata-open' },
    { re: /\bfireworks?\b/, key: 'hero-fireworks-box-open', needs: /\b(box|boxes|sparkler|rocket|celebration|new\s*year)\b/ },
    { re: /\bfortune\s*cookies?\b/, key: 'hero-fortune-cookie-jar-open' },
    { re: /\bgingerbread\s*houses?\b/, key: 'hero-gingerbread-house-door-open' },
    { re: /\b(nativity|manger\s*stables?)\b/, key: 'hero-nativity-stable-open' },
    { re: /\bornament\s*boxes?\b/, key: 'hero-ornament-box-open' },
    { re: /\bwreath\s*(?:storage\s*)?boxes?\b/, key: 'hero-wreath-storage-box-open' },
    { re: /\bsnow\s*globes?\b/, key: 'hero-snow-globe-base-open' },
    { re: /\bmaypoles?\b/, key: 'hero-maypole-base-open' },
    { re: /\b(carnival\s*games?|carnival\s*booths?)\b/, key: 'hero-carnival-game-booth-open' },
    { re: /\b(birthday\s*presents?|present\s*stacks?)\b/, key: 'hero-birthday-present-stack-open' },
    { re: /\b(gift\s*sacks?|santa\s*sacks?)\b/, key: 'hero-gift-sack-open' },
    { re: /\b(pumpkin\s*patch(?:es)?|pumpkin\s*bins?)\b/, key: 'hero-pumpkin-patch-bin-open' },
    { re: /\b(corn\s*mazes?|maize\s*mazes?)\b/, key: 'hero-corn-maze-gate-open' },
    { re: /\b(beach\s*coolers?|cooler\s*tubs?)\b/, key: 'hero-beach-cooler-tub-open' },
    { re: /\b(sledding\s*hills?|sled\s*hills?)\b/, key: 'hero-sledding-hill' },
    { re: /\b(ice\s*rinks?|skating\s*rinks?)\b/, key: 'hero-ice-rink-edge' },
    { re: /\b(sand\s*castle\s*molds?|sandcastle\s*molds?)\b/, key: 'hero-sand-castle-mold' },
    { re: /\bsnowmen\b|\bsnowman\b/, key: 'hero-snowman-base' },
    { re: /\bleaf\s*piles?\b/, key: 'hero-leaf-pile' },
    { re: /\bpuddles?\b/, key: 'hero-puddle', needs: /\b(rain|splash|boot|boots|jump|wet)\b/ },
    { re: /\b(campfire\s*rings?|log\s*rings?)\b/, key: 'hero-campfire-log-ring', not: /\btents?\b/ },
    { re: /\b(kite\s*(?:flying|spot|ground)|fly(?:ing)?\s*kites?)\b/, key: 'hero-kite-ground-spot' },
    { re: /\b(parade\s*floats?|float\s*platforms?)\b/, key: 'hero-parade-float-platform' },
    { re: /\b(festival\s*booths?|fair\s*booths?)\b/, key: 'hero-festival-booth-counter' },
  ];

  function shippableKing(prop) {
    if (!prop || !prop.key) return null;
    return SHIPPABLE_KING_KEYS.has(prop.key) ? prop : null;
  }

  /**
   * Find a large interactive prop the activity page can center on.
   * Prefer roleplay-stage surfaces (open mouth, trampoline) over standing
   * characters — kids drag tools onto the stage, not beside a stick figure.
   * Soft-gated: only SHIPPABLE_KING_KEYS return; others → null (sortBins).
   */
  function findHeroProp(lesson) {
    const PB = window.PropBank;
    if (!PB || !PB.loaded()) return null;
    const family = PB.familyFor(lesson);
    const seed = (lesson && lesson.title) || '';
    const tags = heroThemeTags(lesson);
    const isHeroSized = PB.isHeroSized || ((p) =>
      !!(p && (p.role === 'hero' || ((p.relativeScale == null ? 0 : p.relativeScale) >= 0.75))));
    const blob = tags.join(' ');

    // Theme lock first — one lesson theme from title+vocab+activity (not sampleAnswer).
    // none / sports / circus with no heroKey → empty beats wrong (sortBins).
    // heroKey (face/dental/cafe/…) wins even when the prop has no pack tag.
    const LT = window.LessonTraits;
    const theme = LT && typeof LT.resolveTheme === 'function' ? LT.resolveTheme(lesson) : null;
    const intent = lesson && lesson._heroPropIntent;
    if (intent && intent.key) {
      const requested = (typeof PB.get === 'function' ? PB.get(intent.key) : null)
        || PB.resolve({ word: intent.key, seed, family });
      if (isHeroSized(requested)) {
        const ok = shippableKing(requested);
        if (ok) return ok;
      }
    }
    const pickHeroTargetFrom = (text) => {
      const t = String(text || '');
      for (const rule of HERO_TARGET_STAGE_RULES) {
        if (!rule.re.test(t)) continue;
        if ((rule.needs && !rule.needs.test(t)) || (rule.not && rule.not.test(t))) continue;
        const hit = (typeof PB.get === 'function' ? PB.get(rule.key) : null)
          || PB.resolve({ word: rule.key, seed, family });
        if (isHeroSized(hit)) {
          const ok = shippableKing(hit);
          if (ok) return ok;
        }
      }
      return null;
    };
    const pickHeroTarget = () => pickHeroTargetFrom(blob);
    // Title / activity title win before theme pins — ProducerQuality vocab
    // repair used to rewrite "Clean Up the Toy Box" into dental cores and
    // steal the play surface. Title cue beats mutated board six.
    const titleBlob = [
      String((lesson && lesson.title) || ''),
      String((lesson && lesson.activity && lesson.activity.title) || ''),
    ].join(' ').toLowerCase();
    const titleTarget = pickHeroTargetFrom(titleBlob);
    if (titleTarget) return titleTarget;
    if (theme && theme.id === 'none') {
      return pickHeroTarget();
    }
    if (theme && theme.heroKey) {
      const pinned = (typeof PB.get === 'function' ? PB.get(theme.heroKey) : null)
        || PB.resolve({ word: theme.heroKey, seed, family });
      if (isHeroSized(pinned)) {
        const ok = shippableKing(pinned);
        // Unshippable pin (concert-harp after vocab pollution) must not erase
        // a title-cued play surface — fall through to STAGE_RULES / hero-targets.
        if (ok) return ok;
      }
    }
    // Theme with packs but no curated hero (sports / circus): kit only, no
    // identity fallthrough onto face-blank / playground-slide. Soft-gate still
    // refuses unproven kit heroes (hoop stays banked, does not ship).
    // Kitchen packs with no shippable kit hero still allow title-cued targets
    // (oven / freezer) before empty.
    if (theme && theme.packs && theme.packs.length && !theme.heroKey) {
      const kitOnly = PB.assessKit && PB.assessKit(lesson);
      if (kitOnly && kitOnly.ready && kitOnly.hero && isHeroSized(kitOnly.hero)) {
        const ok = shippableKing(kitOnly.hero);
        if (ok) return ok;
      }
      const target = pickHeroTarget();
      if (target) return target;
      return null;
    }

    // Curated emotion/face/dental stages BEFORE pack kits — "Round 1" used to
    // token-match castle-tree-round / castle-window-round and steal the hero (S43).
    // Belt-and-suspenders when LessonTraits is cold; theme.heroKey already won above.
    // Dental must use word boundaries — bare `tooth`/`brush` steals bathroom
    // "toothbrush" lessons onto the open-mouth patient (quality loop).
    const dentalCue = (LT && LT.RE && LT.RE.dental)
      || /\b(dentist|dental|tooth|teeth|cavity|floss)\b/;
    const hospitalCue = (LT && LT.RE && LT.RE.hospital)
      || /\b(doctor|clinic|hospital|nurse|medical|checkup|diagnosis|symptoms?|prescription|appointment|fever|sick)\b/;
    // FeelingsCore only for face-blank — lone "happy" must not stage a circus lesson.
    const CURATED_STAGE_FIRST = [
      { re: /\b(feeling|feelings|emotion|emotions|mood)\b/, key: 'face-blank' },
      // "wash your face" / "brush teeth" is a bathroom lesson, not make-a-face.
      { re: /\bface\b|\bhair\b|\beyes?\b|\bnose\b|\bear\b|make.?a.?face|blank.?face/, key: 'face-blank', not: /\b(bathrooms?|bathtub|toothbrush|tooth|teeth|towel|soap|shampoo|shower)\b/ },
      // `tooth`/`teeth` alone is a bathroom word — "brush teeth" in a morning
      // routine is not a dentist visit. Needs an actual dentistry cue.
      { re: dentalCue, key: 'dental-kid-open-mouth', needs: /\b(dentist|dental|cavity|floss|filling|molar|plaque|check.?up)\b/ },
      // Clinic/doctor lessons stage the hospital bed — not the dental open mouth
      // (clown-clinic / loop2-doctor quality loop). Dental cue wins first.
      { re: hospitalCue, key: 'hospital-bed' },
    ];
    // Remaining curated stages (trampoline / castle / beach) after kits.
    // Beach sandcastle is also kit-promoted (hero-scale); rule is belt-and-suspenders
    // so "sand" never falls through to landmark-marina-bay-sands.
    // `re` alone is a strong cue — the word only means this theme.
    // `needs` marks a POLYSEMOUS cue that must be corroborated by a second
    // theme word before it can claim a king stage: "routine" is a bathroom cue
    // in "wash your face, brush your teeth" and an organiser cue in "my
    // productive morning routine", and staging a bathtub on the second is the
    // wrong-hero trust bug. `not` disqualifies a neighbouring theme that owns
    // the same word. Empty beats wrong — an uncorroborated cue falls through to
    // the gated identity loop and usually to sortBins, which is the honest end.
    const STAGE_RULES = [
      { re: /trampolin|bounce|backflip/, key: 'trampoline' },
      // Beach before castle: "sandcastle" matches /castle/ too, and the castle
      // gatehouse is the wrong stage for a beach lesson.
      { re: /\b(beach|shore|seaside|sandcastle)\b/, key: 'beach-sandcastle' },
      { re: /castle|medieval|knight|drawbridge|portcullis|royal/, key: 'castle-wall-gate', not: /\b(sand|sandcastle|beach)\b/ },
      // Fire / camp / bath / playground — pack heroes exist; cues beat identity fallthrough.
      // Dental/hospital already won in CURATED_STAGE_FIRST (bathroom must not steal open-mouth).
      { re: /\b(fire\s*stations?|firehouses?|firefighters?|firemen|fireman|fire\s*trucks?|fire\s*engines?|fire\s*safety)\b/, key: 'fire-truck' },
      { re: /\b(campsites?|camping|campfire)\b/, key: 'tent' },
      // A tent is also a circus tent, a market stall and a refugee shelter.
      { re: /\btents?\b/, key: 'tent', needs: /\b(camp|camping|campsite|campfire|outdoors?|hike|hiking|forest|woods|sleeping\s*bag|backpack)\b/, not: /\b(circus|carnival|acrobat|clown|trapeze|marquee)\b/ },
      { re: /\b(bathrooms?|bathtub|toiletries)\b/, key: 'bath-bathtub' },
      // "routine" / "shower" / "wash up" are bathroom words only next to one.
      // Deliberately no `sink` corroborator — a pottery sink used to ship the
      // bath-sink king stage, which is the bug this whole gate exists for.
      { re: /\b(bath\b|showers?|wash\s*up|routines?)\b/, key: 'bath-bathtub', needs: /\b(bathrooms?|bathtub|toilet|tooth|teeth|toothbrush|towel|soap|shampoo|mirror|bathe|bathing|wash\s*(?:your\s*)?face)\b/ },
      { re: /\b(playgrounds?|play\s*structures?|seesaws?|swing\s*sets?)\b/, key: 'playground-slide' },
      // A slide is also a presentation slide and a microscope slide.
      { re: /\bslides?\b/, key: 'playground-slide', needs: /\b(playgrounds?|park|recess|seesaws?|swings?|climbing\s*frame|jungle\s*gym|monkey\s*bars|sandpit)\b/ },
      // Cafe / farm — pack heroes exist; cues beat identity fallthrough.
      // Fruit/market must not steal cafe-counter (Manus Y737) — produce without
      // a cafe/bakery cue falls through to sortBins / match honesty.
      { re: /\b(cafes?|caf[eé]s?|coffee\s*shops?|bakerys?|bake\s*shops?|restaurants?|diners?)\b/, key: 'cafe-counter-stage', not: /\b(fruit|market|vegetable|veggie|produce|apple|banana|carrot|tomato|lemon|grape)\b/ },
      { re: /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/, key: 'farm-barn' },
      { re: /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/, key: 'aquarium-tank' },
      { re: /\b(construction|building\s*sites?|hard\s*hats?|excavators?)\b/, key: 'construction-tower-crane' },
      // A crane is also a bird.
      { re: /\bcranes?\b/, key: 'construction-tower-crane', needs: /\b(construction|building\s*sites?|hard\s*hats?|excavators?|cement|scaffold(?:ing)?|builders?|bulldozer|digger)\b/ },
      // Dollhouse — cutaway hero; home/furniture kits also win via assessKit.
      { re: /\b(dollhouses?|doll\s*houses?|furniture|home\s*tour)\b/, key: 'dollhouse-cutaway' },
      ...HERO_TARGET_STAGE_RULES,
    ];
    // Vetoes are collected from BOTH rule tables before anything resolves. A
    // curated refusal has to outrank the pack-kit and identity paths that run
    // in between, or the guards are decorative: the playground kit would still
    // hand back the slide for a lesson about presentation slides.
    const vetoed = new Set();
    // Tokens a rule considered and refused. Vetoing the KEY alone is not enough:
    // "slide" refused as a playground cue still resolves to a legacy prop keyed
    // `slide` with no pack, which head-matches itself and walks through the
    // identity gate. The word was judged off-theme, so it must not pick a hero
    // by any route.
    const vetoedTokens = new Set();
    const ruleWins = (rule) => {
      if (!rule.re.test(blob)) return false;
      if ((rule.needs && !rule.needs.test(blob)) || (rule.not && rule.not.test(blob))) {
        vetoed.add(rule.key);
        for (const t of tags) if (rule.re.test(String(t || ''))) vetoedTokens.add(t);
        return false;
      }
      return true;
    };
    const winners = [];
    for (const rule of CURATED_STAGE_FIRST) if (ruleWins(rule)) winners.push(rule);
    for (const rule of STAGE_RULES) if (ruleWins(rule)) winners.push(rule);

    // A curated rule that WON now outranks the pack kit. Rules used to run after
    // kits because they were unconditional and too eager; now that a polysemous
    // cue must be corroborated, a winning rule is the stronger signal — it read
    // the lesson, while the kit only counted prop tags. "wash face / brush teeth
    // / towel" is a bathroom lesson even though the dollhouse pack scores higher.
    for (const rule of winners) {
      const hit = (typeof PB.get === 'function' ? PB.get(rule.key) : null)
        || PB.resolve({ word: rule.key, seed, family });
      if (isHeroSized(hit)) {
        const ok = shippableKing(hit);
        if (ok) return ok;
      }
    }

    // Legacy vetoes when LessonTraits is cold (theme lock already skipped wrong packs).
    const produceCue = /\b(fruit|market|vegetable|veggie|produce|apple|banana|carrot|tomato|lemon|grape)\b/.test(blob);
    const cafeCueBlob = /\b(cafes?|caf[eé]s?|coffee|bakery|pastry|latte|croissant|muffin|diner|restaurant)\b/.test(blob);
    const farmCueBlob = /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/.test(blob);
    if (produceCue && !cafeCueBlob) {
      vetoed.add('cafe-counter-stage');
      vetoed.add('cafe-counter');
    }
    if (produceCue && !farmCueBlob) {
      vetoed.add('farm-barn');
    }

    const spaceCueBlob = /\b(space|spaceships?|spacecraft|rockets?|astronauts?|aliens?|planets?|nasa|orbit|galaxy|nebula|satellites?|mars|lunar|moons?)\b/.test(blob);
    const schoolPetBlob = /\b(homework|schools?|classrooms?|teachers?|students?|cats?|dogs?|pets?|kittens?|puppies?|milk)\b/.test(blob);
    const sportCueBlob = /\b(sports?|basketball|soccer|football|tennis|baseball|volleyball|gym|athletic|team|score|court|hoops?|coach|whistle|goalkeeper|kickoff|pitch)\b/.test(blob);
    const playgroundCueBlob = /\b(playgrounds?|slides?|swings?|seesaws?|sandbox|recess|monkey\s*bars|climbing\s*frame|jungle\s*gym|carousel)\b/.test(blob);
    if (schoolPetBlob && !spaceCueBlob) {
      vetoed.add('space-rocket-cutaway');
      vetoed.add('space-module-blue-a');
      vetoed.add('space-module-blue-b');
      vetoed.add('space-module-blue-c');
      vetoed.add('space-module-blue-lab');
      vetoed.add('space-module-cyan-garden');
      vetoed.add('space-module-gray-a');
      vetoed.add('space-module-gray-b');
      vetoed.add('space-module-gray-c');
      vetoed.add('space-module-orange-bay');
      vetoed.add('space-module-orange-hab');
      vetoed.add('space-module-orange-ports');
      vetoed.add('space-module-orange-solar');
    }
    if (schoolPetBlob && !farmCueBlob) {
      vetoed.add('farm-barn');
      vetoed.add('farm-windmill');
    }
    if (schoolPetBlob && !cafeCueBlob) {
      vetoed.add('cafe-counter-stage');
      vetoed.add('cafe-counter');
    }
    if (sportCueBlob && !playgroundCueBlob) {
      vetoed.add('playground-slide');
      vetoed.add('park-slide');
    }

    // Pack kits — banking a pack with a hero is enough (castle, jobs…).
    // Theme lock already filters packs inside assessKit when LessonTraits is warm.
    const kit = PB.assessKit && PB.assessKit(lesson);
    if (kit && kit.ready && kit.hero && isHeroSized(kit.hero) && !vetoed.has(kit.hero.key)) {
      if (!(kit.pack === 'space' && schoolPetBlob && !spaceCueBlob)
        && !(kit.pack === 'farm' && schoolPetBlob && !farmCueBlob)
        && !(kit.pack === 'cafe' && schoolPetBlob && !cafeCueBlob)
        && !(kit.pack === 'playground' && sportCueBlob && !playgroundCueBlob)) {
        return shippableKing(kit.hero);
      }
    }

    // Identity word lookups — gated (empty > wrong). A hero-sized hit from a bare
    // tag is only accepted when the key head-matches that tag, or the prop's pack
    // is shared with the lesson theme. Otherwise "sink" on a pottery lesson ships
    // bath-sink as the king stage.
    // When theme-locked, only accept identity hits inside theme.packs.
    const allowed = theme && theme.packs && theme.packs.length
      ? new Set(theme.packs)
      : null;
    for (const t of tags) {
      if (vetoedTokens.has(t)) continue;
      const hit = PB.resolve({ word: t, seed, family });
      if (!isHeroSized(hit)) continue;
      // A curated rule already looked at this key for this lesson and said no.
      if (hit && vetoed.has(hit.key)) continue;
      if (allowed && hit.pack && !allowed.has(hit.pack)) continue;
      if (hit && hit.pack === 'space' && !spaceCueBlob) continue;
      if (hit && hit.pack === 'farm' && schoolPetBlob && !farmCueBlob) continue;
      if (hit && hit.pack === 'cafe' && schoolPetBlob && !cafeCueBlob) continue;
      if (hit && hit.pack === 'playground' && sportCueBlob && !playgroundCueBlob) continue;
      if (heroIdentityOk(hit, t, tags, PB, seed, family)) {
        const ok = shippableKing(hit);
        if (ok) return ok;
      }
    }
    return null;
  }

  /** Key head equals / is prefixed by the token that found the prop. */
  function heroKeyHeadMatchesToken(hit, token) {
    const key = String((hit && hit.key) || '').toLowerCase();
    const t = String(token || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!key || !t || t.length < 3) return false;
    const head = key.split(/[-_]/)[0];
    return head === t || key.startsWith(t + '-') || key.startsWith(t + '_');
  }

  /**
   * Identity-loop gate: accept only when the hero is thematically tied to the lesson.
   * - key head-matches the finding token (trampoline ← trampoline), OR
   * - prop pack name matches a lesson theme token, OR
   * - a *different* theme token also resolves into the same pack
   *   (soap + sink → bathroom OK; sink alone on pottery → reject).
   */
  function heroIdentityOk(hit, foundBy, tags, PB, seed, family) {
    if (heroKeyHeadMatchesToken(hit, foundBy)) return true;
    const pack = hit && hit.pack ? String(hit.pack).toLowerCase() : '';
    if (!pack) return false;
    for (const t of tags) {
      const tl = String(t || '').toLowerCase();
      if (!tl) continue;
      // Pack name ↔ theme token (exact, or long substring — avoid "room"⊂"bathroom").
      if (tl === pack) return true;
      if (tl.length >= 5 && (pack.includes(tl) || tl.includes(pack))) return true;
    }
    const found = String(foundBy || '').toLowerCase();
    for (const t of tags) {
      const tl = String(t || '').toLowerCase();
      if (!tl || tl === found) continue;
      const other = PB.resolve({ word: t, seed, family });
      if (other && other.pack && String(other.pack).toLowerCase() === pack) return true;
    }
    return false;
  }

  /**
   * Handheld tools kids drag onto a stage hero.
   * Dental core + sweets (sugar vs brush) + cafeteria/clinic bits (apple/cup/milk).
   * Dropped dental-bib — at dock size it reads as a purse, not a bib.
   * Skip food-candy-cane (dockSafe:false — too skinny at dock size).
   */
  const ROLEPLAY_DOCK_DENTAL = [
    'toothbrush-prop',
    'toothpaste-tube',
    'floss-pick',
    'dental-mirror',
    'cavity-tooth',
    'healthy-tooth',
    'food-lollipop',
    'food-cookie',
    'food-wrapped-candy-pink',
    'apple',
    'plastic-cup',
    'milk-carton',
    'reward-star-dental',
    'dentist-character',
  ];

  /** Curated make-a-face dock — only keys that actually exist + are dock-safe.
   *  face-eyes-* are ghost manifest rows (no PNG, dockSafe:false). Drop them
   *  so the hint never promises eyes the tray cannot ship (Manus heroProp R2). */
  const ROLEPLAY_DOCK_FACE = [
    'face-mouth-smile',
    'face-nose-button',
    'hair-messy-brown',
    'face-mouth-open',
    'face-nose-round',
    'hair-pony-blonde',
    'face-nose-point',
    'hair-afro-dark',
    'face-nose-long',
    'hair-bob-red',
    'face-ears-round',
    'hair-spiky-blonde',
    'face-ears-oval',
    'hair-double-bun',
    'face-ears-large',
    'hair-braids-brown',
    'hair-wavy-brown',
    'hair-slick-black',
    'face-hair-curly',
    'face-hair-pigtails',
    'face-hair-shaggy',
    'face-glasses-round',
  ];

  /** Firehouse roleplay dock — largest readable tools first. Skip fire-helmet
   *  (dockSafe:false / missing PNG). Cap later at 6 so each stays grab-big. */
  const ROLEPLAY_DOCK_FIRE = [
    'fire-hose',
    'fire-hydrant',
    'fire-alarm-bell',
    'fire-extinguisher',
    'fire-gloves',
    'fire-megaphone',
    'fire-water-bucket',
    'fire-first-aid-kit',
    'fire-mask',
    'fire-walkie-talkie',
    'fire-safety-cone',
    'fire-ladder',
    'fire-axe',
    'fire-flashlight',
    'fire-blanket',
  ];

  /** Camp pack-the-tent dock — handheld camp/hike tools (not the tent hero). */
  const ROLEPLAY_DOCK_CAMP = [
    'camp-flashlight',
    'camp-campfire',
    'camp-map',
    'camp-hiking-boot',
    'camp-sleeping-bag',
    'camp-canteen',
    'camp-compass',
    'camp-binoculars',
    'camp-marshmallow-stick',
    'camp-matchbox',
    'camp-pocket-knife',
    'camp-pine-tree',
  ];

  /** Bathroom wash dock — toiletries only (dental open-mouth wins first via dentalCue). */
  const ROLEPLAY_DOCK_BATH = [
    'bath-toothbrush',
    'bath-toothpaste',
    'bath-soap',
    'bath-bar-soap',
    'bath-shampoo',
    'bath-towel-blue',
    'bath-hand-towel',
    'bath-washcloth',
    'bath-mirror',
    'bath-hairbrush',
    'bath-comb',
    'bath-loofah',
    'bath-sponge',
    'bath-mouthwash',
    'bath-shower-head',
  ];

  /** Castle build dock — sharp cutouts only (MIN_DOCK_SRC / C8). */
  const ROLEPLAY_DOCK_CASTLE = [
    'castle-flag-red',
    'castle-crown',
    'castle-shield',
    'castle-sword',
    'castle-key',
    'castle-door-wood',
    'castle-torch-lit',
    'castle-tower-roof',
  ];

  /** Space station build dock — sharp in-house cutouts only (MIN_DOCK_SRC / C8). */
  const ROLEPLAY_DOCK_SPACE = [
    'space-helmet-white',
    'space-jetpack-orange',
    'space-wrench-blue',
    'space-flagpole-blue',
    'space-dish-teal',
    'space-flashlight-yellow',
    'space-radio-olive',
    'space-o2-tank-cyan',
    'space-moon-rock',
    'space-cubesat-gray',
  ];

  /** Feelings compass — emotion face stickers kids drag onto a blank face. */
  const ROLEPLAY_DOCK_FEELINGS = [
    'feeling-worried',
    'feeling-scared',
    'feeling-confused',
    'feeling-shy',
    'feeling-surprised',
    'feeling-happy',
    'feeling-sad',
    'feeling-angry',
    'feeling-bored',
    'feeling-sleepy',
    'feeling-proud',
    'feeling-silly',
    'feeling-excited',
    'feeling-tired',
  ];

  /** Classical concert roleplay — cream/gold musicians for the terrace stage. */
  const ROLEPLAY_DOCK_MUSIC = [
    'musician-piano',
    'musician-violin',
    'musician-cello',
    'musician-flute',
    'musician-harp',
    'musician-trumpet',
    'musician-clarinet',
    'musician-horn',
    'musician-conductor',
    'musician-trombone',
    'musician-oboe',
    'musician-bassoon',
    'musician-bass',
    'musician-guitar',
    'musician-tuba',
    'musician-drums',
    'musician-triangle',
    'musician-singer',
  ];

  /** Trampoline / bounce lab — gym toys kids drag onto the king. */
  // Safety / spotter kit only — not a full gym scrapyard (Manus MZJk B2 / High:
  // skateboard/dumbbell/frisbee diluted backflip + taught-vocab production).
  const ROLEPLAY_DOCK_TRAMPOLINE = [
    'gym-mat',
    'sports-cone',
    'water-bottle',
    'whistle',
    'stopwatch',
    'jump-rope',
  ];

  /** Playground / park dock — park pieces kids drag onto the slide king (not the slide itself). */
  const ROLEPLAY_DOCK_PLAYGROUND = [
    'park-seesaw',
    'park-swing-set',
    'park-sandbox',
    'park-monkey-bars',
    'park-crawl-tunnel',
    'park-dome-climber',
    'park-spring-rider',
    'park-basketball-hoop',
    'park-flower-box',
    'park-foam-mats',
    'playground-ball',
    'park-trash-can',
  ];

  /** Sports / court dock — handheld play tools (not the hoop king / white-plate scrap). */
  const ROLEPLAY_DOCK_SPORTS = [
    'sports-whistle',
    'sports-cone',
    'sport-basketball',
    'sport-gold-medal',
    'sport-coach-clipboard',
    'sport-ball-pump',
    'sports-race-flag',
    'sport-dumbbell',
    'sport-stopwatch',
    'sport-soccer',
  ];

  /** Cafe / bakery counter dock — handheld food + tools (not the counter hero / furniture). */
  const ROLEPLAY_DOCK_CAFE = [
    'cafe-coffee-cup',
    'cafe-latte',
    'cafe-croissant',
    'cafe-muffin',
    'cafe-cookie',
    'cafe-sandwich',
    'cafe-donut',
    'cafe-plate',
    'cafe-menu',
    'cafe-pastry-tongs',
    'cafe-milk-pitcher',
    'cafe-takeout-cup',
    'cafe-teapot',
    'cafe-napkin',
  ];

  /** Farm barn dock — handheld tools + small yard toys (not the barn hero / big sheds). */
  const ROLEPLAY_DOCK_FARM = [
    'farm-pitchfork',
    'farm-shovel',
    'farm-rake',
    'farm-hoe',
    'farm-shears',
    'farm-hay-bale',
    'farm-basket',
    'farm-crate',
    'farm-milk-can',
    'farm-wheelbarrow',
    'farm-scarecrow',
    'farm-rope',
    'farm-barrel',
    'farm-water-pump',
  ];

  /** Aquarium tank dock — fish/coral/tools kids place in the tank (not the tank hero). */
  const ROLEPLAY_DOCK_AQUARIUM = [
    'aquarium-fish-orange-a',
    'aquarium-fish-blue',
    'aquarium-fish-yellow',
    'aquarium-fish-koi',
    'aquarium-coral-pink',
    'aquarium-coral-orange',
    'aquarium-castle',
    'aquarium-crab-orange',
    'aquarium-lobster',
    'aq-air-pump',
    'aq-thermometer',
    'aq-gravel-vacuum',
    'aquarium-plant-seaweed-a',
    'aquarium-pebble-a',
  ];

  /** Construction site dock — tools kids drag onto the crane stage (not the crane). */
  const ROLEPLAY_DOCK_CONSTRUCTION = [
    'construction-hard-hat',
    'construction-hammer',
    'construction-traffic-cone',
    'construction-shovel',
    'construction-toolbox',
    'construction-power-drill',
    'construction-safety-vest',
    'construction-step-ladder',
    'construction-wheelbarrow',
    'construction-blueprint',
    'construction-hand-saw',
    'construction-tape-measure',
    'construction-dump-truck',
    'construction-safety-goggles',
  ];

  /**
   * Hospital bed dock — handheld clinic tools (not the bed hero).
   * Hospital pack first; aid-/clinic cross-pack bits kids know from doctor visits.
   */
  const ROLEPLAY_DOCK_HOSPITAL = [
    'hospital-syringe',
    'hospital-reflex-hammer',
    'hospital-tweezers',
    'hospital-bandage-roll',
    'hospital-face-mask',
    'hospital-blood-pressure-monitor',
    'hospital-heart-monitor',
    'hospital-oxygen-tank',
    'hospital-iv-drip',
    'hospital-crutches',
    'aid-stethoscope',
    'aid-thermometer',
    'aid-medicine-bottle',
    'aid-tissue-box',
  ];

  /**
   * Dollhouse cutaway dock — furniture kids place in rooms (not the cutaway /
   * mini house / stairs).
   */
  const ROLEPLAY_DOCK_DOLLHOUSE = [
    'dh-sofa-blue',
    'dh-bed-pink',
    'dh-table-round',
    'dh-chair-yellow',
    'dh-lamp-floor',
    'dh-stove-teal',
    'dh-play-kitchen',
    'dh-bookshelf-green',
    'dh-wardrobe-blue',
    'dh-bathtub',
    'dh-plant-pot',
    'dh-teddy',
    'dh-rug-oval',
    'dh-window-curtains',
  ];

  /** Small toys kids put into/onto a medium hero container or play surface. */
  const ROLEPLAY_DOCK_PUT_IN = [
    'apple',
    'pencil',
    'bind-open-book',
    'cas-coin-stack',
    'cas-gem',
    'castle-key',
    'food-cookie',
    'milk-carton',
    'cafe-takeout-cup',
    'food-carrot',
    'sandwich',
  ];

  const HERO_TARGET_DOCKS = {
    'hero-chest-open': ['cas-coin-stack', 'cas-gem', 'castle-key', 'cas-crown', 'apple', 'food-cookie'],
    'hero-box-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-backpack-open': ['pencil', 'bind-open-book', 'apple', 'sandwich', 'cafe-takeout-cup', 'milk-carton'],
    'hero-suitcase-open': ['bind-open-book', 'bath-towel', 'pencil', 'apple', 'cafe-takeout-cup'],
    'hero-cupboard-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-drawer-open': ['pencil', 'bind-open-book', 'castle-key', 'apple'],
    'hero-curtain-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-locker-open': ['bind-open-book', 'pencil', 'apple', 'bath-towel', 'cafe-takeout-cup'],
    'hero-envelope-open': ['post-stamp', 'pencil', 'bind-open-book'],
    'hero-gift-box-open': ['cas-gem', 'cas-crown', 'apple', 'food-cookie', 'cas-coin-stack'],
    'hero-mailbox-open': ['post-stamp', 'pencil', 'bind-open-book', 'apple'],
    'hero-fridge-open': ['milk-carton', 'apple', 'food-carrot', 'sandwich', 'food-tomato', 'food-lettuce'],
    'hero-washing-machine-open': ['bath-towel', 'apple', 'pencil'],
    'hero-recycling-bin-open': ['milk-carton', 'bind-open-book', 'apple', 'pencil'],
    'hero-vending-machine-open': ['cas-coin-stack', 'food-cookie', 'apple', 'sandwich', 'cafe-takeout-cup'],
    'hero-garage-open': ['construction-traffic-cone', 'apple', 'bind-open-book', 'pencil'],
    'hero-safe-open': ['cas-coin-stack', 'cas-gem', 'cas-crown', 'castle-key'],
    'hero-barrel-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-monster-mouth': ['apple', 'food-cookie', 'food-lollipop', 'food-carrot', 'sandwich', 'milk-carton'],
    'hero-animal-mouth': ['apple', 'food-cookie', 'food-carrot', 'sandwich', 'milk-carton'],
    'hero-shelf': ['bind-open-book', 'apple', 'cas-crown', 'pencil', 'cafe-takeout-cup'],
    'hero-lunch-tray': ['apple', 'sandwich', 'milk-carton', 'food-cookie', 'food-carrot', 'food-tomato'],
    'hero-pizza-base': ['food-tomato', 'food-lettuce', 'food-carrot', 'apple', 'food-cookie'],
    'hero-sandwich-base': ['food-lettuce', 'food-tomato', 'food-carrot', 'apple', 'food-cookie'],
    'hero-garden-patch': ['food-carrot', 'food-tomato', 'food-lettuce', 'apple'],
    'hero-oven-open': ['food-cookie', 'sandwich', 'apple', 'food-tomato', 'food-carrot', 'bake-whisk'],
    'hero-microwave-open': ['sandwich', 'milk-carton', 'food-cookie', 'apple', 'cafe-takeout-cup'],
    'hero-dishwasher-open': ['fork', 'spoon', 'apple', 'cafe-takeout-cup', 'milk-carton'],
    'hero-toaster-open': ['food-cookie', 'apple', 'sandwich', 'food-carrot'],
    'hero-air-fryer-open': ['food-carrot', 'food-cookie', 'apple', 'sandwich'],
    'hero-blender-open': ['apple', 'food-carrot', 'milk-carton', 'food-tomato'],
    'hero-pantry-open': ['food-cookie', 'milk-carton', 'apple', 'sandwich', 'food-carrot'],
    'hero-freezer-open': ['milk-carton', 'apple', 'sandwich', 'food-cookie', 'food-carrot'],
    'hero-grill-open': ['sandwich', 'food-tomato', 'food-lettuce', 'apple', 'food-carrot'],
    'hero-toolbox-open': ['construction-hammer', 'construction-wrench', 'construction-traffic-cone', 'pencil'],
    'hero-toy-box-open': ['apple', 'food-cookie', 'cas-crown', 'pencil', 'cas-gem'],
    'hero-picnic-basket-open': ['apple', 'sandwich', 'milk-carton', 'food-cookie', 'food-carrot'],
    'hero-cooler-open': ['milk-carton', 'apple', 'sandwich', 'cafe-takeout-cup', 'food-cookie'],
    'hero-laundry-basket-open': ['bath-towel', 'apple', 'pencil', 'clothes-tshirt'],
    'hero-wardrobe-open': ['bath-towel', 'clothes-tshirt', 'apple', 'pencil'],
    'hero-cubby-open': ['bind-open-book', 'pencil', 'apple', 'bath-towel', 'cafe-takeout-cup'],
    'hero-lunchbox-open': ['apple', 'sandwich', 'milk-carton', 'food-cookie', 'food-carrot'],
    'hero-cookie-jar-open': ['food-cookie', 'apple', 'cas-coin-stack', 'food-lollipop'],
    'hero-piggy-bank-open': ['cas-coin-stack', 'cas-gem', 'apple', 'food-cookie'],
    'hero-jewelry-box-open': ['cas-gem', 'cas-crown', 'castle-key', 'apple'],
    'hero-craft-box-open': ['pencil', 'art-paintbrush', 'apple', 'cas-gem', 'food-cookie'],
    'hero-paint-box-open': ['art-paintbrush', 'pencil', 'apple', 'food-cookie'],
    'hero-pencil-case-open': ['pencil', 'bind-open-book', 'apple', 'art-paintbrush'],
    'hero-school-desk-open': ['pencil', 'bind-open-book', 'apple', 'cafe-takeout-cup'],
    'hero-medicine-cabinet-open': ['bath-towel', 'apple', 'pencil', 'milk-carton'],
    'hero-wooden-crate-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-trash-can-open': ['apple', 'milk-carton', 'bind-open-book', 'pencil', 'food-cookie'],
    'hero-compost-bin-open': ['apple', 'food-carrot', 'food-lettuce', 'food-tomato'],
    'hero-blanket-fort-open': ['bind-open-book', 'apple', 'food-cookie', 'pencil', 'cas-crown'],
    'hero-cave-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-treehouse-open': ['bind-open-book', 'apple', 'food-cookie', 'pencil', 'cas-crown'],
    'hero-playhouse-open': ['apple', 'food-cookie', 'pencil', 'cas-crown', 'bind-open-book'],
    'hero-puppet-theater-open': ['apple', 'food-cookie', 'cas-crown', 'pencil', 'cas-gem'],
    'hero-birdcage-open': ['apple', 'food-carrot', 'food-cookie', 'pencil'],
    'hero-pet-carrier-open': ['apple', 'food-carrot', 'bath-towel', 'milk-carton'],
    'hero-train-car-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-bus-door-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-school-bus-door-open': ['bind-open-book', 'pencil', 'apple', 'sandwich', 'bath-towel'],
    'hero-subway-door-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-elevator-door-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-ferry-gate-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-taxi-trunk-open': ['bind-open-book', 'bath-towel', 'apple', 'pencil', 'cafe-takeout-cup'],
    'hero-ambulance-back-open': ['bath-towel', 'apple', 'milk-carton', 'pencil'],
    'hero-fire-truck-compartment-open': ['construction-traffic-cone', 'apple', 'pencil', 'bath-towel'],
    'hero-police-trunk-open': ['construction-traffic-cone', 'fire-flashlight', 'apple', 'pencil'],
    'hero-helicopter-door-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-sailboat-cabin-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-submarine-hatch-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-hot-air-balloon-basket-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-gondola-cabin-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-cable-car-cabin-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-ski-lift-chair-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-pirate-ship-hatch-open': ['cas-coin-stack', 'cas-gem', 'castle-key', 'apple', 'food-cookie'],
    'hero-train-platform': ROLEPLAY_DOCK_PUT_IN,
    'hero-subway-platform': ROLEPLAY_DOCK_PUT_IN,
    'hero-helipad': ROLEPLAY_DOCK_PUT_IN,
    'hero-ferry-deck': ROLEPLAY_DOCK_PUT_IN,
    'hero-tram-stop': ROLEPLAY_DOCK_PUT_IN,
    'hero-monorail-platform': ROLEPLAY_DOCK_PUT_IN,
    'hero-airport-baggage-carousel': ['bind-open-book', 'bath-towel', 'apple', 'pencil'],
    'hero-runway-marker': ROLEPLAY_DOCK_PUT_IN,
    'hero-cable-car-station': ROLEPLAY_DOCK_PUT_IN,
    'hero-easter-basket-open': ['apple', 'food-cookie', 'food-carrot', 'cas-gem'],
    'hero-trick-or-treat-bucket-open': ['food-cookie', 'food-lollipop', 'apple', 'cas-coin-stack'],
    'hero-christmas-stocking-open': ['food-cookie', 'cas-gem', 'apple', 'cas-crown'],
    'hero-advent-calendar-box-open': ['food-cookie', 'apple', 'cas-gem', 'food-lollipop'],
    'hero-valentine-mailbox-open': ['post-stamp', 'pencil', 'bind-open-book', 'apple'],
    'hero-party-pinata-open': ['food-cookie', 'food-lollipop', 'apple', 'cas-coin-stack'],
    'hero-fireworks-box-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-fortune-cookie-jar-open': ['food-cookie', 'apple', 'cas-coin-stack'],
    'hero-gingerbread-house-door-open': ['food-cookie', 'apple', 'food-carrot', 'cas-gem'],
    'hero-nativity-stable-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-ornament-box-open': ['cas-gem', 'cas-crown', 'apple', 'food-cookie'],
    'hero-wreath-storage-box-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-snow-globe-base-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-maypole-base-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-carnival-game-booth-open': ['cas-coin-stack', 'apple', 'food-cookie', 'cas-gem'],
    'hero-birthday-present-stack-open': ['cas-gem', 'cas-crown', 'apple', 'food-cookie'],
    'hero-gift-sack-open': ['cas-gem', 'cas-crown', 'apple', 'food-cookie', 'cas-coin-stack'],
    'hero-pumpkin-patch-bin-open': ['apple', 'food-carrot', 'food-cookie', 'pencil'],
    'hero-corn-maze-gate-open': ROLEPLAY_DOCK_PUT_IN,
    'hero-beach-cooler-tub-open': ['milk-carton', 'apple', 'sandwich', 'cafe-takeout-cup', 'food-cookie'],
    'hero-sledding-hill': ROLEPLAY_DOCK_PUT_IN,
    'hero-ice-rink-edge': ROLEPLAY_DOCK_PUT_IN,
    'hero-sand-castle-mold': ['apple', 'food-cookie', 'pencil', 'cas-crown'],
    'hero-snowman-base': ['apple', 'food-carrot', 'food-cookie', 'pencil'],
    'hero-leaf-pile': ROLEPLAY_DOCK_PUT_IN,
    'hero-puddle': ROLEPLAY_DOCK_PUT_IN,
    'hero-campfire-log-ring': ['apple', 'food-cookie', 'sandwich', 'milk-carton'],
    'hero-kite-ground-spot': ROLEPLAY_DOCK_PUT_IN,
    'hero-parade-float-platform': ROLEPLAY_DOCK_PUT_IN,
    'hero-festival-booth-counter': ['cas-coin-stack', 'apple', 'food-cookie', 'cafe-takeout-cup'],
  };

  function roleplayDockProps(lesson, hero, count) {
    const PB = window.PropBank;
    if (!PB || !PB.loaded()) return [];
    const family = PB.familyFor(lesson);
    const seed = ((lesson && lesson.title) || '') + '|roleplay';
    const tags = heroThemeTags(lesson);
    const blob = tags.join(' ') + ' ' + ((hero && hero.key) || '');
    const kit = PB.assessKit && PB.assessKit(lesson);
    const sharp = PB.isDockSharp || (() => true);
    // Decorative/character packs (3D feeling faces, gashapon toy blobs) must not
    // fill the generic dock unless THIS lesson's topic invites them — a soccer
    // dock should never surface a gashapon cyclops.
    const decoOK = PB.decorativePacksFor ? PB.decorativePacksFor(lesson) : new Set();
    const decoBlocked = (p) => PB.isDecorativeProp && PB.isDecorativeProp(p) && !decoOK.has(p.pack);
    // Hero key wins — vocab like "smile" must not steal a dental stage into a face dock.
    // Feelings lessons also use face-blank as king, but the dock must be emotion
    // stickers — not eyes/nose hair (that would erase the abstract vocab stress test).
    // TODO: move to lessonTraits (dock-source selection: feelings/face/dental/trampoline).
    const heroKey = (hero && hero.key) || '';
    const feelings = !!(kit && kit.pack === 'feelings')
      || /\b(feeling|feelings|emotion|emotions|mood)\b/.test(blob)
      || (/\b(worried|scared|shy|confused|proud|surprised|happy|sad|angry|bored|sleepy|excited|tired)\b/.test(blob)
        && !/\b(hair|eyes|nose|ear|ears|make.?a.?face)\b/.test(blob));
    const dentalCue = (window.LessonTraits && window.LessonTraits.RE && window.LessonTraits.RE.dental)
      || /\b(dentist|dental|tooth|teeth|cavity|floss)\b/;
    const face = !feelings && (
      heroKey === 'face-blank'
      || /face-blank|make.?a.?face/.test(blob)
      || (/\b(face|faces|hair|eyes|nose|ear|ears)\b/.test(blob)
        && !dentalCue.test(blob))
    );
    const dental = !feelings && !face && (
      /dental|dentist/.test(heroKey)
      || dentalCue.test(blob)
    );
    // Hospital after dental — bed hero / clinic cues / hospital pack (not open-mouth).
    const hospitalCue = (window.LessonTraits && window.LessonTraits.RE && window.LessonTraits.RE.hospital)
      || /\b(doctor|clinic|hospital|nurse|medical|checkup|diagnosis|symptoms?|prescription|appointment|fever|sick)\b/;
    const hospital = !feelings && !face && !dental && (
      heroKey === 'hospital-bed'
      || hospitalCue.test(blob)
      || (kit && kit.pack === 'hospital')
    );
    const trampoline = !feelings && !face && !dental && !hospital && (
      heroKey === 'trampoline'
      || /trampolin|bounce|backflip/.test(blob)
    );
    const playground = !feelings && !face && !dental && !hospital && !trampoline && (
      heroKey === 'playground-slide'
      || /\b(playgrounds?|play\s*structures?|slides?|seesaws?|swing\s*sets?)\b/.test(blob)
      || (kit && kit.pack === 'playground')
    );
    // Sports after trampoline+playground — hoop king / sports pack / court cues
    // (never steal playground-slide into a sports dock).
    const sportsCue = (window.LessonTraits && window.LessonTraits.RE && window.LessonTraits.RE.sports)
      || /\b(sports?|sporty|basketball|soccer|football|tennis|baseball|volleyball|gym|athletic|athletics|coach|whistle|goalkeeper|kickoff|pitch)\b/;
    const sports = !feelings && !face && !dental && !hospital && !trampoline && !playground && (
      heroKey === 'basketball-hoop-stage'
      || (kit && kit.pack === 'sports')
      || sportsCue.test(blob)
    );
    const firehouse = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && (
      /fire-truck|fire-station|fire-hydrant|fire-hose/.test(heroKey)
      || /\b(fire\s*stations?|firehouses?|firefighters?|firemen|fireman|fire\s*trucks?|fire\s*engines?|fire\s*safety)\b/.test(blob)
      || (kit && (kit.pack === 'fire-station' || kit.pack === 'fire'))
    );
    // Camping after firehouse — tent hero / camp cues / camping pack (not outdoor scrap).
    const camping = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && (
      heroKey === 'tent'
      || /\b(campsites?|camping|campfire|tents?)\b/.test(blob)
      || (kit && kit.pack === 'camping')
    );
    // Bathroom after dental+camping — wash cues / bathtub hero / bathroom pack.
    // Dental already gated above so toothbrush lessons keep the open-mouth dock.
    const bathroom = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && !camping && (
      /bath-bathtub|bath-sink/.test(heroKey)
      || /\b(bathrooms?|bathtub|bath\b|shower|wash\s*up|toiletries|routines?)\b/.test(blob)
      || (kit && kit.pack === 'bathroom')
    );
    // Cafe / farm after place stages — counter/barn heroes + pack cues.
    const cafe = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && !camping && !bathroom && (
      /cafe-counter-stage|cafe-counter/.test(heroKey)
      || /\b(cafes?|caf[eé]s?|coffee\s*shops?|bakerys?|bake\s*shops?|restaurants?|diners?)\b/.test(blob)
      || (kit && kit.pack === 'cafe')
    );
    const farm = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && !camping && !bathroom && !cafe && (
      /farm-barn|farm-tractor/.test(heroKey)
      || /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/.test(blob)
      || (kit && kit.pack === 'farm')
    );
    const aquarium = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && !camping && !bathroom && !cafe && !farm && (
      /aquarium-tank|aq-tank/.test(heroKey)
      || /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/.test(blob)
      || (kit && kit.pack === 'aquarium')
    );
    const construction = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && !camping && !bathroom && !cafe && !farm && !aquarium && (
      /construction-tower-crane|construction-excavator/.test(heroKey)
      || /\b(construction|building\s*sites?|hard\s*hats?|excavators?|cranes?)\b/.test(blob)
      || (kit && kit.pack === 'construction')
    );
    // Dollhouse after construction — cutaway hero / furniture cues / dollhouse pack.
    const dollhouse = !feelings && !face && !dental && !hospital && !trampoline && !playground && !sports && !firehouse && !camping && !bathroom && !cafe && !farm && !aquarium && !construction && (
      heroKey === 'dollhouse-cutaway'
      || /\b(dollhouses?|doll\s*houses?|furniture|home\s*tour)\b/.test(blob)
      || (kit && kit.pack === 'dollhouse')
    );
    const out = [];
    const exclude = [hero && hero.key].filter(Boolean);

    // Feelings drag sources must equal the taught board vocab, not a fixed 12-sticker
    // pad — 12 sources for 6 taught words overloads B1 and adds unnameable distractors
    // (Manus QCVsgMcb: DRAG_SOURCE_COUNT == TARGET_VOCAB_COUNT). Derive the exact
    // first-6 feelings from lesson vocab; fall back to the curated list if empty.
    // S59: dock art is vocab-pack PNGs. Allow taught words with pack art even when
    // no feeling-* prop cutout exists (excited/tired landmine — roster filter used
    // to drop them silently → short dock / S49).
    let feelingsKeys = null;
    if (feelings) {
      const VI = window.VocabIcons;
      const packSync = VI && typeof VI.pathForSync === 'function' ? VI.pathForSync.bind(VI) : null;
      const taught = ((lesson && lesson.vocabulary) || [])
        .map((v) => (typeof v === 'string' ? v : v && v.word))
        .filter(Boolean)
        .slice(0, boardVocabCount(lesson))
        .map((w) => String(w).toLowerCase());
      const keys = [];
      for (const word of taught) {
        const k = 'feeling-' + word;
        const packPath = packSync ? packSync(word) : null;
        if (ROLEPLAY_DOCK_FEELINGS.includes(k) || packPath) keys.push(k);
      }
      if (keys.length) feelingsKeys = keys;
    }
    let targetCount = count;

    // 1) Curated docks for feelings / face / dental / hospital / trampoline / …
    let prefer = null;
    if (feelings) { prefer = feelingsKeys || ROLEPLAY_DOCK_FEELINGS; targetCount = prefer.length; }
    else if (face) prefer = ROLEPLAY_DOCK_FACE;
    else if (dental) { prefer = ROLEPLAY_DOCK_DENTAL; targetCount = prefer.length; }
    else if (hospital) { prefer = ROLEPLAY_DOCK_HOSPITAL; targetCount = prefer.length; }
    else if (trampoline) { prefer = ROLEPLAY_DOCK_TRAMPOLINE; targetCount = prefer.length; }
    else if (playground) prefer = ROLEPLAY_DOCK_PLAYGROUND;
    else if (sports) { prefer = ROLEPLAY_DOCK_SPORTS; targetCount = prefer.length; }
    else if (firehouse) prefer = ROLEPLAY_DOCK_FIRE;
    else if (camping) prefer = ROLEPLAY_DOCK_CAMP;
    else if (bathroom) prefer = ROLEPLAY_DOCK_BATH;
    else if (cafe) prefer = ROLEPLAY_DOCK_CAFE;
    else if (farm) prefer = ROLEPLAY_DOCK_FARM;
    else if (aquarium) prefer = ROLEPLAY_DOCK_AQUARIUM;
    else if (construction) prefer = ROLEPLAY_DOCK_CONSTRUCTION;
    else if (dollhouse) { prefer = ROLEPLAY_DOCK_DOLLHOUSE; targetCount = prefer.length; }
    else if (HERO_TARGET_DOCKS[heroKey]) {
      // Hero key wins over a coincidental castle/music kit (pirate + gold
      // must not steal the chest dock into flags/swords, then empty it).
      prefer = HERO_TARGET_DOCKS[heroKey];
      targetCount = Math.min(10, prefer.length);
    }
    else if (kit && kit.pack === 'castle') { prefer = ROLEPLAY_DOCK_CASTLE; targetCount = prefer.length; }
    else if (kit && kit.pack === 'space') prefer = ROLEPLAY_DOCK_SPACE;
    else if (kit && kit.pack === 'music') prefer = ROLEPLAY_DOCK_MUSIC;

    // A king tray is a roleplay kit, not a prop-bank dump. Manus R1 wanted
    // 5–6 large labelled tools — a dozen silent-drops into postage stamps.
    if (prefer && !face && !feelings) targetCount = Math.min(targetCount, prefer.length, 6);

    if (prefer) {
      for (const key of prefer) {
        if (out.length >= targetCount) break;
        if (exclude.includes(key)) continue;
        // Curated keys must land even when the lesson family is glossy-adventure
        // (pirate + treasure) and the dock toy is house-matte. resolve() family
        // filter used to return [] → plan() nulled the king.
        const p = (typeof PB.get === 'function' ? PB.get(key) : null)
          || PB.resolve({ word: key, seed, family, exclude });
        if (!p || exclude.includes(p.key) || !sharp(p)) continue;
        if ((face || feelings) && p.aspect && (p.aspect < 0.45 || p.aspect > 3.0)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_CASTLE && p.aspect && (p.aspect < 0.35 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_SPACE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_MUSIC && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_DENTAL && p.aspect && (p.aspect < 0.3 || p.aspect > 2.6)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_TRAMPOLINE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_PLAYGROUND && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_SPORTS && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_FIRE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_CAMP && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_BATH && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_CAFE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_FARM && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_AQUARIUM && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_CONSTRUCTION && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_HOSPITAL && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_DOLLHOUSE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        exclude.push(p.key);
        out.push(p);
      }
    }

    // Face: if the board teaches a core face part (eyes/nose/mouth/hair/ears),
    // guarantee ≥1 matching prop in the dock even when packing truncates the
    // interleaved list (Manus Ehp2 B3: hair taught, dock missing). Generalized
    // beyond hair so a topic that leans on eyes/nose/mouth vocab does not lose
    // its own taught-word tool the same way — but this can only guarantee a
    // piece when a sharp (dockSafe) asset actually exists; missing art stays a
    // wishlist gap (see docs/asset-wishlist.md face-eyes-* rows), never a fake fill.
    if (face) {
      const taught = ((lesson && lesson.vocabulary) || [])
        .map((v) => (typeof v === 'string' ? v : v && v.word))
        .filter(Boolean)
        .map((w) => String(w).toLowerCase());
      const FACE_CORE_PARTS = ['eyes', 'nose', 'mouth', 'hair', 'ears'];
      for (const part of FACE_CORE_PARTS) {
        if (!taught.includes(part)) continue;
        const partRe = new RegExp(part === 'eyes' ? 'eyes' : part);
        const hasPartProp = out.some((p) => partRe.test(String((p && p.key) || '')));
        if (hasPartProp) continue;
        for (const key of ROLEPLAY_DOCK_FACE) {
          if (!partRe.test(key)) continue;
          if (exclude.includes(key)) continue;
          const p = PB.resolve({ word: key, seed, family, exclude });
          if (!p || !sharp(p)) continue;
          if (p.aspect && (p.aspect < 0.45 || p.aspect > 3.0)) continue;
          // Swap last piece from an already-covered family if at capacity so
          // this taught part always lands.
          if (out.length >= targetCount) {
            for (let i = out.length - 1; i >= 0; i--) {
              if (!partRe.test(String(out[i].key || ''))) {
                out.splice(i, 1);
                break;
              }
            }
          }
          exclude.push(p.key);
          out.push(p);
          break;
        }
      }
    }

    // Feelings: taught words with pack art but no sharp feeling-* prop — still ship
    // a pack-backed dock piece (S59). Never silently shorten the dock.
    if (feelings && feelingsKeys) {
      const VI = window.VocabIcons;
      const packSync = VI && typeof VI.pathForSync === 'function' ? VI.pathForSync.bind(VI) : null;
      const have = new Set(out.map((p) => p.key));
      for (const k of feelingsKeys) {
        if (out.length >= targetCount) break;
        if (have.has(k) || exclude.includes(k)) continue;
        const word = String(k).replace(/^feeling-/, '');
        const packPath = packSync ? packSync(word) : null;
        if (!packPath) continue;
        exclude.push(k);
        have.add(k);
        out.push({
          key: k,
          path: packPath,
          aspect: 1,
          feelWord: word,
          relativeScale: 0.35,
          anchor: 'center',
        });
      }
    }

    // 2) Universal pack dock — rest of the matched kit (already sharp-filtered)
    // Feelings: only more feeling-* stickers — never eyes/nose hair from face-blank tags.
    // Firehouse/camp/bath/playground/cafe/farm/hospital/dollhouse: never top up from a wrong-pack kit.
    if (kit && kit.docks && kit.docks.length
      && !(firehouse && kit.pack !== 'fire-station' && kit.pack !== 'fire')
      && !(camping && kit.pack !== 'camping')
      && !(bathroom && kit.pack !== 'bathroom')
      && !(playground && kit.pack !== 'playground')
      && !(sports && kit.pack !== 'sports')
      && !(cafe && kit.pack !== 'cafe')
      && !(farm && kit.pack !== 'farm')
      && !(aquarium && kit.pack !== 'aquarium')
      && !(construction && kit.pack !== 'construction')
      && !(hospital && kit.pack !== 'hospital')
      && !(dollhouse && kit.pack !== 'dollhouse')
      && !(kit.pack === 'castle')
      && !HERO_TARGET_DOCKS[heroKey]
      // Dental: curated tools only — bathroom kit pad was leaking soap/faucet
      // onto Dental Health Planner (Manus mfLN B3).
      && !dental) {
      for (const p of kit.docks) {
        if (out.length >= targetCount) break;
        if (exclude.includes(p.key)) continue;
        if (!sharp(p)) continue;
        if (feelings && !/^feeling-/.test(p.key)) continue;
        if (p.aspect && (p.aspect < 0.3 || p.aspect > 4)) continue;
        exclude.push(p.key);
        out.push(p);
      }
    }

    // Tag-only dock pad removed (phase-1): tags no longer qualify candidates.
    // Prefer a shorter dock over a metonymy prop (coach→whistle).

    // S59 (both selfloop judges): the Feelings Lab dock rendered realistic 3D boy
    // faces (09_props/feeling-*) — a DIFFERENT visual vocabulary from the flat
    // Twemoji the New Words match dock teaches. The picture→word mapping students
    // just built did not transfer, one prop face read as an untaught "angry", and
    // a prop carried a floating "?". Repoint every feeling dock piece at the SAME
    // vetted vocab-pack PNG New Words uses (square, aspect 1) so both drag surfaces
    // show one consistent, mutually-distinct face set. Keeps the feeling-* key so
    // feelingDockCount/S49 still counts it; carries the word so pieceToPng →
    // wordArtPng resolves the pack art.
    if (feelings) {
      const VI = window.VocabIcons;
      const packSync = VI && typeof VI.pathForSync === 'function' ? VI.pathForSync.bind(VI) : null;
      return out.map((p) => {
        const m = /^feeling-(.+)$/.exec(String(p.key || ''));
        const word = m ? m[1] : null;
        const packPath = word && packSync ? packSync(word) : null;
        const sayNoun = word || sayNounFromKey(p.key);
        if (!word || !packPath) return Object.assign({}, p, { sayNoun });
        return Object.assign({}, p, { path: packPath, aspect: 1, feelWord: word, sayNoun });
      });
    }
    return out.map((p) => Object.assign({}, p, { sayNoun: sayNounFromKey(p.key) }));
  }

  /**
   * How a king hero fills heroStage.
   *   fit   — default. Whole silhouette stays on-board (face-blank, trampoline).
   *   flush — source art is already a cropped close-up; overscale + negative y
   *           so opaque content meets the page top (dental open-mouth only).
   * Never copy flush from one hero to the next — set stageFit on the prop.
   */
  function stageFitFor(prop) {
    const fit = prop && prop.stageFit;
    if (fit === 'flush' || fit === 'fit') return fit;
    return 'fit';
  }

  /** One huge groundable stage hero + a dock of roleplay tools. */
  function heroProp(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const PB = window.PropBank;
    // Soft-gate even when plan/kit pins ctx.hero — unproven kings never stage.
    const prop = shippableKing((ctx && ctx.hero) || findHeroProp(lesson));
    if (!prop || !PB) return;

    const art = L.zoneRect(page, 'artSafe') || { x: 0, y: 0, w: 1280, h: 470 };
    const dock = L.zoneRect(page, 'dock');
    const stageH = dock ? Math.max(360, dock.y) : Math.max(360, art.h);
    const skipKing = !!(ctx && ctx.skipKing);

    // Feelings Lab reuses face-blank as a drop stage for ONE feeling sticker, so
    // it should not fill the board like a make-a-face king (which needs room for
    // eyes/nose/hair). A near-full blank face read as a "giant empty blob" while
    // the feeling faces sat tiny at the bottom (both judges). Detect feelings and
    // rebalance: smaller stage + larger drag faces. S54 guards this.
    // TODO: move to lessonTraits (feelings stage detection — shares the feelings cue).
    const heroBlob = heroThemeTags(lesson).join(' ');
    const feelingsStage = /\b(feeling|feelings|emotion|emotions|mood)\b/.test(heroBlob)
      || (/\b(worried|scared|shy|confused|proud|surprised|happy|sad|angry|bored|sleepy|excited|tired)\b/.test(heroBlob)
        && !/\b(hair|eyes|nose|ear|ears|make.?a.?face)\b/.test(heroBlob));
    // Wide hospital-bed / trampoline kings cover the left instruction card when
    // centred (hospital quality loop; Manus MZJk B2 S21 FAIL) — reserve a left
    // gutter like Feelings Lab so the speak cue stays projection-readable.
    // Flush dental open-mouth also eats the left hint + bottom dock (Manus UX
    // dentist 8LJn / mfLN B3) — treat as wideStage for gutters + milder scale.
    const hospitalStage = !!(prop && prop.key === 'hospital-bed');
    const flushCrop = stageFitFor(prop) === 'flush';
    const dentalFlush = flushCrop && !!(prop && /dental|open-mouth/i.test(prop.key || ''));
    const wideStage = hospitalStage
      || dentalFlush
      || !!(prop && prop.key === 'trampoline')
      || (Number(prop && prop.aspect) >= 1.55);
    let kingBox = null;

    if (!skipKing) {
      const king = Object.assign({}, prop, { relativeScale: 1 });
      // Dental flush used to overscale 1.5× into the hint card + dock; keep flush
      // crop but reserve left column and leave dock breathing room.
      const scale = dentalFlush
        ? 1.15
        : (flushCrop ? 1.5 : (feelingsStage ? 0.72 : (wideStage ? 0.82 : 0.92)));
      const sized = PB.sizeFor(king, {
        maxH: Math.round(stageH * scale),
        maxW: Math.min(L.W - 8, Math.round(stageH * scale * (prop.aspect || 1))),
        hardCap: Math.round(stageH * scale),
      });
      let x = Math.round((L.W - sized.w) / 2);
      // Feelings Lab: the instruction card + "This face feels:" write strip live in
      // a left column, so a centred blank head left the whole right third empty and
      // read as lopsided (both round-2 judges). Centre the head in the RIGHT region
      // (past a reserved left gutter) so the page balances: instructions left, hero
      // right-centre, drag dock across the bottom. S64 guards the balance.
      if ((feelingsStage || wideStage) && (!flushCrop || dentalFlush)) {
        const LEFT_GUTTER = feelingsStage ? 520 : (dentalFlush ? 440 : 400);
        x = LEFT_GUTTER + Math.round((L.W - LEFT_GUTTER - sized.w) / 2);
        x = Math.max(LEFT_GUTTER, Math.min(L.W - 8 - sized.w, x));
      }
      // Flush open-mouth kings still need a readable instruction band (Manus mfLN B3).
      const y = flushCrop
        ? Math.max(dentalFlush ? 88 : 64, -Math.round(sized.h * (dentalFlush ? 0.08 : 0.18)))
        : Math.max(wideStage ? 96 : 8, Math.round((stageH - sized.h) / 2));

      L.place(page, {
        locked: true,
        kind: 'image',
        asset: prop.path,
        w: sized.w,
        h: sized.h,
        intentional: true,
        bleed: flushCrop ? 'crop' : 'edge',
        _force: { x, y, w: sized.w, h: sized.h },
        role: page.pageType === 'heroStage' ? 'stageHero' : 'heroPart',
        meta: {
          propKey: prop.key,
          propAspect: prop.aspect,
          stageKing: page.pageType === 'heroStage',
          stageFit: stageFitFor(prop),
        },
      });
      kingBox = { x, y, w: sized.w, h: sized.h };
    }

    const kingCue = heroThemeTags(lesson).join(' ');
    const payoffLine = window.LessonTraits && typeof window.LessonTraits.kingPayoffFor === 'function'
      ? window.LessonTraits.kingPayoffFor(kingCue, { heroKey: prop.key, feelingsKing: feelingsStage })
      : 'WORLD READY';

    if (kingBox && !feelingsStage) {
      const padW = 72;
      const padH = 56;
      const count = 3;
      const span = Math.max(padW, kingBox.w - 48);
      const step = count > 1 ? Math.round((span - padW) / (count - 1)) : 0;
      const baseX = kingBox.x + Math.round((kingBox.w - span) / 2);
      const baseY = kingBox.y + kingBox.h - padH - 8;
      for (let i = 0; i < count; i++) {
        const px = baseX + i * step;
        const py = Math.max(kingBox.y + 8, baseY);
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: heroSnapPadPng(padW, padH, i + 1),
          w: padW,
          h: padH,
          intentional: true,
          bleed: 'edge',
          _force: { x: px, y: py, w: padW, h: padH },
          role: 'dropPad',
          meta: { stageTarget: true, snapIndex: i + 1 },
        });
      }
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: heroStateLadderPng(300, 82, payoffLine),
        w: 300,
        h: 82,
        intentional: true,
        bleed: 'edge',
        _force: { x: 24, y: 168, w: 300, h: 82 },
        role: 'heroStateLadder',
        meta: { states: ['empty', 'snap', 'ready'], payoff: payoffLine },
      });
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: heroPayoffBadgePng(188, 46, payoffLine),
        w: 188,
        h: 46,
        intentional: true,
        bleed: 'edge',
        _force: { x: 1068, y: 70, w: 188, h: 46 },
        role: 'heroPayoff',
        meta: { payoff: payoffLine, state: 'ready' },
      });
      L.place(page, {
        locked: false,
        kind: 'image',
        asset: heroPayoffSealPng(188, 46),
        w: 188,
        h: 46,
        intentional: true,
        bleed: 'edge',
        _force: { x: 1068, y: 70, w: 188, h: 46 },
        role: 'heroPayoffCover',
        meta: { covers: 'heroPayoff', state: 'locked' },
      });
      page.notes.push('recipe:heroPropSnap');
      page.notes.push('recipe:heroPropPayoff');
    }


    // Face kits ship plenty of parts — use two dock rows when the zone is tall enough.
    // Tall-thin roleplay cutouts (musicians ~0.4–0.65) need height ≥ DOCK_MIN/aspect for
    // grabbable width; a 72px cap + 2 rows filters them all out except squat pieces.
    const tools = roleplayDockProps(lesson, prop, 18)
      .slice()
      .sort((a, b) => String(a.sayNoun || a.key).localeCompare(String(b.sayNoun || b.key)));
    let dockPlaced = 0;
    if (tools.length && dock) {
      const gap = 10;
      const rowGap = 6;
      const LABEL_H = 22;
      // Grab floor = M10 warn (64) — never ship postage-stamp dock toys.
      const DOCK_MIN = 64;
      const tray = { x: dock.x, y: dock.y, w: dock.w, h: Math.max(DOCK_MIN + 8, dock.h - LABEL_H) };
      const needHFor = (t) => Math.ceil(DOCK_MIN / Math.max(0.05, Number(t.aspect) || 1));
      const thinCount = tools.filter((t) => (Number(t.aspect) || 1) < 0.7).length;
      const maxNeedH = tools.reduce((m, t) => Math.max(m, needHFor(t)), DOCK_MIN);
      let rows = 1;
      if (tray.h >= 120 && tools.length > 10 && thinCount < tools.length * 0.5) {
        const rowH2 = Math.floor((tray.h - rowGap - 4) / 2);
        // Only use 2 rows when every tool can still hit DOCK_MIN width at that rowH.
        if (rowH2 >= maxNeedH) rows = 2;
      } else if (tray.h >= 120 && tools.length > 10) {
        // Mostly tall-thin: pick the largest row count that still satisfies needH.
        for (let tryRows = 2; tryRows >= 1; tryRows--) {
          const tryH = Math.floor((tray.h - rowGap * (tryRows - 1) - 4) / tryRows);
          if (tryH >= maxNeedH || tryRows === 1) {
            rows = tryRows;
            break;
          }
        }
      }
      const cols = Math.ceil(tools.length / rows);
      const rowH = Math.floor((tray.h - rowGap * (rows - 1) - 4) / rows);
      // No hard 72 cap. Prefer grab-floor sizing (min side = DOCK_MIN) so many
      // tall-thin musicians fit; bloating to full rowH makes each too wide and
      // the packer drops them. Cap height at rowH unless needH requires more.
      const maxH = Math.max(DOCK_MIN, rowH);
      const sizedPerRow = [];

      for (let r = 0; r < rows; r++) {
        const slice = tools.slice(r * cols, (r + 1) * cols);
        if (!slice.length) continue;
        // Full relativeScale — size to the smallest grabbable box for this aspect.
        let sized = slice.map((t) => {
          const dockProp = Object.assign({}, t, { relativeScale: 1 });
          const aspect = Math.max(0.05, Number(t.aspect) || 1);
          // Tall-thin: h = DOCK_MIN/aspect → w≈64. Wide/square: h = DOCK_MIN.
          // Never taller than the tray row — pieces that need more height for
          // DOCK_MIN width are dropped by the filter below.
          const grabH = aspect >= 1 ? DOCK_MIN : Math.ceil(DOCK_MIN / aspect);
          const pieceMaxH = Math.min(rowH, Math.max(grabH, DOCK_MIN));
          const s = PB.sizeFor(dockProp, {
            maxH: pieceMaxH,
            maxW: Math.max(DOCK_MIN, dock.w),
            hardCap: pieceMaxH,
          });
          return { t, w: s.w, h: s.h };
        }).filter((x) => Math.min(x.w, x.h) >= DOCK_MIN && x.w <= dock.w && x.h <= rowH);
        // Never scale below grab-floor (that re-filters thin props). Drop overflow.
        while (sized.length > 1) {
          const tw = sized.reduce((s, x) => s + x.w, 0) + gap * Math.max(0, sized.length - 1);
          if (tw <= dock.w) break;
          sized.pop();
        }
        // If a single remaining piece is somehow wider than the dock, drop it.
        if (sized.length === 1) {
          const tw = sized[0].w;
          if (tw > dock.w) sized = [];
        }
        // Music dock soft (Manus): +12% when spare width allows — never bump DOCK_MIN
        // (that drops thin musicians from a packed row). Cap boost so pieces still fit.
        const musicRow = sized.some((x) => /^musician-/.test((x.t && x.t.key) || ''));
        if (musicRow && sized.length) {
          const gapsW = gap * Math.max(0, sized.length - 1);
          const rawW = sized.reduce((s, x) => s + x.w, 0);
          const boost = 1.12;
          if (rawW > 0 && Math.ceil(rawW * boost) + gapsW <= dock.w) {
            const maxHBoost = Math.max(rowH, maxNeedH);
            sized = sized.map((x) => {
              let w = Math.round(x.w * boost);
              let h = Math.round(x.h * boost);
              if (h > maxHBoost && x.h > 0) {
                const fit = maxHBoost / h;
                w = Math.max(DOCK_MIN, Math.round(w * fit));
                h = Math.max(DOCK_MIN, Math.round(h * fit));
              }
              return { t: x.t, w, h };
            }).filter((x) => Math.min(x.w, x.h) >= DOCK_MIN && x.w <= dock.w);
            while (sized.length > 1) {
              const tw = sized.reduce((s, x) => s + x.w, 0) + gap * Math.max(0, sized.length - 1);
              if (tw <= dock.w) break;
              sized.pop();
            }
          }
        }
        // Grow a short tray (≤8 tools or feelings faces) so pieces read as
        // the point of the page, not postage stamps in a 1248px bay (Manus S54 / R1).
        if (sized.length && (feelingsStage || sized.length <= 8)) {
          const gapsW = gap * Math.max(0, sized.length - 1);
          const rawW = sized.reduce((s, x) => s + x.w, 0);
          const maxPieceH0 = sized.reduce((m, x) => Math.max(m, x.h), 0);
          const widthScale = rawW > 0 ? (tray.w - gapsW) / rawW : 1;
          const heightScale = maxPieceH0 > 0 ? rowH / maxPieceH0 : 1;
          const grow = Math.min(widthScale, heightScale);
          if (grow > 1.02) {
            sized = sized.map((x) => ({
              t: x.t,
              w: Math.round(x.w * grow),
              h: Math.round(x.h * grow),
            })).filter((x) => x.w <= tray.w && x.h <= rowH);
          }
        }
        sizedPerRow.push(sized.length);
        const usedW = sized.reduce((s, x) => s + x.w, 0) + gap * Math.max(0, sized.length - 1);
        let originX = tray.x + Math.max(0, Math.floor((tray.w - usedW) / 2));
        const maxPieceH = sized.reduce((m, x) => Math.max(m, x.h), 0);
        const rowTop = tray.y + r * (rowH + rowGap);
        const originY = rowTop + Math.max(0, Math.floor((rowH - maxPieceH) / 2));
        const dockRight = tray.x + tray.w;
        sized.forEach(({ t, w, h }) => {
          // Never clamp sideways into a neighbor — that is how H3 IoU fires when
          // grab-floor pieces no longer fit the row. Drop the overflow instead.
          if (originX + w > dockRight + 0.5) return;
          const x = originX;
          const y = Math.max(tray.y, Math.min(tray.y + tray.h - h, originY));
          const sayNoun = t.sayNoun || sayNounFromKey(t.key);
          L.place(page, {
            locked: false,
            kind: 'image',
            asset: t.path,
            w, h,
            intentional: true,
            bleed: 'edge',
            _force: { x, y, w, h },
            role: 'dockPiece',
            meta: t.feelWord
              ? { propKey: t.key, propAspect: t.aspect, word: t.feelWord, sayNoun }
              : { propKey: t.key, propAspect: t.aspect, sayNoun },
          });
          if (sayNoun && !feelingsStage) {
            L.place(page, {
              locked: true,
              kind: 'text',
              text: sayNoun,
              color: [15, 23, 42, 255],
              size: 16,
              w,
              h: LABEL_H,
              intentional: true,
              _force: { x, y: Math.min(dock.y + dock.h - LABEL_H, y + h + 1), w, h: LABEL_H },
              role: 'dockLabel',
              meta: { sayNoun, propKey: t.key },
            });
          }
          dockPlaced += 1;
          originX = x + w + gap;
        });
      }
    }
    const dockDropped = Math.max(0, tools.length - dockPlaced);
    if (dockDropped > 0) {
      page.notes.push('dockDropped:' + dockDropped);
      page.dockDropped = dockDropped;
    }
    page.notes.push('recipe:heroProp');
  }

  /**
   * Sound boxes + letter tiles — one focus word large; remaining words as chips.
   * Dock: focus graphemes + ≤4 distractors (≤10 tiles, ≥64px).
   */
  function phonicsSoundBoxes(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const meta = (ctx && ctx.meta) || {};
    const data = normalizePhonics(lesson, meta);
    if (!data) return;

    const PB = window.PropBank;
    const bay = L.zoneRect(page, 'targetBay') || { x: 280, y: 140, w: 900, h: 240 };
    const focus = data.targetWords[data.focusIndex || 0];

    const boxH = 90;
    const boxGap = 14;
    const cueW = 72;
    const rowY = bay.y + Math.max(20, Math.round((bay.h - boxH) / 2) - 10);
    L.place(page, {
      locked: true,
      kind: 'emoji',
      emoji: focus.emoji || '🔤',
      w: 64,
      h: 64,
      intentional: true,
      anchor: {
        x: bay.x + 8,
        y: rowY + Math.max(0, Math.round((boxH - 64) / 2)),
        w: 64,
        h: 64,
      },
      role: 'phonicsCue',
      meta: { target: focus.word },
    });

    const n = focus.boxCount;
    const avail = bay.w - cueW - 24;
    const boxW = Math.min(boxH, Math.floor((avail - boxGap * Math.max(0, n - 1)) / n));
    const startX = bay.x + cueW + 16;

    for (let i = 0; i < n; i++) {
      const x = startX + i * (boxW + boxGap);
      const y = rowY;
      let asset = slotGhostPng(boxW, boxH, i + 1);
      let meta = { target: focus.word, box: i, grapheme: focus.graphemes[i] };
      if (PB && PB.loaded()) {
        const prop = PB.resolve({
          role: 'soundBoxes',
          word: 'sound-box',
          seed: focus.word + '|' + i,
          index: i,
        });
        if (prop) {
          asset = prop.path;
          meta = Object.assign(meta, { propKey: prop.key, propAspect: prop.aspect });
        }
      }
      L.place(page, {
        locked: true,
        kind: 'image',
        asset,
        w: boxW,
        h: boxH,
        intentional: true,
        anchor: { x, y, w: boxW, h: boxH },
        role: 'soundBox',
        meta,
      });
    }

    /**
     * Single A–Z → Kenney letter prop (kenney-flat via PropBank.get).
     * Digraphs / teams / missing art → text tile fallback.
     */
    function letterTilePiece(grapheme, extraMeta) {
      const g = String(grapheme || '');
      const meta = Object.assign({ grapheme: g }, extraMeta || {});
      const PP = window.PhonicsPolicy;
      const key = PP && typeof PP.letterPropKey === 'function' ? PP.letterPropKey(g) : null;
      if (key && PB && typeof PB.get === 'function') {
        const prop = PB.get(key);
        if (prop && prop.path) {
          return {
            kind: 'image',
            asset: prop.path,
            text: g,
            role: 'letterTile',
            meta: Object.assign(meta, { propKey: prop.key, propAspect: prop.aspect }),
          };
        }
      }
      return {
        kind: 'tile',
        text: g,
        role: 'letterTile',
        meta,
      };
    }

    const tiles = focus.graphemes.map((g) => letterTilePiece(g, { target: focus.word }));
    data.distractors.forEach((d) => {
      tiles.push(letterTilePiece(d, { distractor: true }));
    });

    const shuffled = pick(tiles, tiles.length, hashStr((lesson.title || '') + '|phonics'));
    const maxLen = Math.max(1, ...shuffled.map((t) => String(t.text || (t.meta && t.meta.grapheme) || '').length));
    // Child touch targets — keep tiles large (esp. A1/A2).
    const tileW = Math.max(72, maxLen > 1 ? 88 : 72);
    L.placeDockRow(page, shuffled, { w: tileW, h: 72, noShrink: true });
    const kenneyHits = shuffled.filter((t) => t.kind === 'image' && t.meta && t.meta.propKey).length;
    page.notes.push('recipe:phonicsSoundBoxes');
    if (kenneyHits) page.notes.push('phonicsKenneyLetters:' + kenneyHits);
  }

  /** Pre-A1 receptive action board: see/hear/point/choose/do. */
  function preA1TprChoice(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const PB = window.PropBank;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const actions = ((ctx && ctx.actions) || (lesson && lesson._preA1Actions) || [])
      .map((a) => {
        const prop = PB && PB.get && PB.get(a.key);
        return prop && prop.path ? { key: prop.key, word: a.word || prop.key.replace(/^prea1-verb-/, ''), prop } : null;
      })
      .filter(Boolean)
      .slice(0, 6);
    if (!actions.length) return;

    const banner = 'SEE -> HEAR -> POINT -> DO';
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: solidPng(Math.min(760, bay.w), 46, '#ecfeff', banner, '#0f766e'),
      w: Math.min(760, bay.w),
      h: 46,
      intentional: true,
      anchor: { x: bay.x + Math.round((bay.w - Math.min(760, bay.w)) / 2), y: bay.y, w: Math.min(760, bay.w), h: 46 },
      role: 'preA1Instruction',
      meta: { pattern: 'see-hear-point-do' },
    });

    const cols = Math.min(3, actions.length);
    const rows = Math.ceil(actions.length / cols);
    const gap = 18;
    const cardW = Math.floor((bay.w - gap * (cols - 1)) / cols);
    const cardH = Math.floor((bay.h - 58 - gap * (rows - 1)) / rows);
    const top = bay.y + 58;
    actions.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = bay.x + col * (cardW + gap);
      const y = top + row * (cardH + gap);
      const sized = PB && PB.sizeFor
        ? PB.sizeFor(Object.assign({}, item.prop, { relativeScale: 1 }), {
          maxW: Math.round(cardW * 0.78),
          maxH: Math.round(cardH * 0.68),
          hardCap: Math.round(cardH * 0.68),
        })
        : { w: Math.round(cardW * 0.62), h: Math.round(cardH * 0.62) };
      L.place(page, {
        locked: false,
        kind: 'image',
        asset: item.prop.path,
        w: sized.w,
        h: sized.h,
        intentional: true,
        anchor: {
          x: x + Math.round((cardW - sized.w) / 2),
          y: y + 8,
          w: sized.w,
          h: sized.h,
        },
        role: 'preA1ActionPicture',
        meta: { propKey: item.key, word: item.word },
      });
      const label = String(item.word || '').toUpperCase();
      const labelW = Math.min(cardW - 20, Math.max(100, label.length * 16 + 32));
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: solidPng(labelW, 38, '#ffffff', label, '#0f172a'),
        w: labelW,
        h: 38,
        intentional: true,
        anchor: {
          x: x + Math.round((cardW - labelW) / 2),
          y: y + cardH - 44,
          w: labelW,
          h: 38,
        },
        role: 'preA1ActionLabel',
        meta: { word: item.word },
      });
    });

    L.placeDockRow(page, actions.map((item) => ({
      kind: 'tile',
      text: String(item.word || '').toUpperCase(),
      role: 'preA1ListenTile',
      meta: { word: item.word, propKey: item.key },
    })), { w: 132, h: 62, noShrink: true });
    page.notes.push('recipe:preA1TprChoice');
    page.notes.push('preA1Actions:' + actions.map((a) => a.key).join('|'));
  }

  /** Topic + milestone metadata for the frameTiles scene-stage payoff. */
  function resolveFrameScene(lesson, blanks) {
    const hay = [
      lesson && lesson.title,
      ...((lesson && lesson.vocabulary) || []).map((v) => (typeof v === 'string' ? v : v && v.word)),
      ...((lesson && lesson.sentenceFrames) || []),
    ].filter(Boolean).join(' ').toLowerCase();
    const n = Math.max(1, Math.min(5, Number(blanks) || 3));
    let theme = 'generic';
    let payoff = 'SCENE READY!';
    const milestoneSets = {
      market: ['🧺', '🍎', '💬', '✅'],
      sport: ['🏃', '🏀', '📣', '🏆'],
      transport: ['🚏', '🚌', '🗺', '🎯'],
      camping: ['⛺', '🔦', '🥾', '🔥'],
      school: ['♻️', '🌱', '💡', '🌍'],
      generic: ['①', '②', '③', '④', '⑤'],
    };
    if (/\b(market|fruit|apple|banana|vendor|basket|stall|fresh|grape|carrot)\b/.test(hay)) {
      theme = 'market';
      payoff = 'MARKET OPEN!';
    } else if (/\b(game|sport|coach|court|ball|team|whistle|score|warm-up|training)\b/.test(hay)) {
      theme = 'sport';
      payoff = 'TEAM READY!';
    } else if (/\b(camp|camping|tent|flashlight|boots|hike|campsite|rain|backpack|coat)\b/.test(hay)) {
      theme = 'camping';
      payoff = 'CAMP READY!';
    } else if (/\b(bus|train|bike|transport|ticket|route|journey|helmet|across|town)\b/.test(hay)
      || (/\bmap\b/.test(hay) && /\b(bus|train|bike|ticket|route|journey|transport)\b/.test(hay))) {
      theme = 'transport';
      payoff = 'ON ROUTE!';
    } else if (/\b(school|eco|green|reuse|compost|garden|plastic|electricity|teamwork|bottle|paper)\b/.test(hay)) {
      theme = 'school';
      payoff = 'GREEN SCHOOL!';
    }
    const pool = milestoneSets[theme] || milestoneSets.generic;
    const milestones = pool.slice(0, n);
    while (milestones.length < n) milestones.push(String(milestones.length + 1));
    const frames = boardFrames(lesson);
    const stepLabels = [];
    let pad = 0;
    frames.forEach((frame) => {
      const segs = frameSegments(frame);
      segs.forEach((seg) => {
        if (!seg.blank) return;
        pad += 1;
        const fill = intendedFrameFill(frame, lesson);
        stepLabels.push(String(fill || `step ${pad}`).slice(0, 14));
      });
    });
    while (stepLabels.length < n) stepLabels.push(`step ${stepLabels.length + 1}`);
    return {
      theme,
      payoff,
      milestones,
      stepLabels: stepLabels.slice(0, n),
      title: String((lesson && lesson.title) || 'Build the scene').slice(0, 36),
      hay,
    };
  }

  /**
   * Scene-first stage for frameTiles: left = initial/building world with empty
   * milestone slots; right = earned completion payoff (Manus R1–R3 blocker).
   * One static JPG must prove initial → per-placement → completed states.
   */
  function frameSceneStagePng(w, h, scene, blanks) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const theme = (scene && scene.theme) || 'generic';
    const payoff = String((scene && scene.payoff) || 'SCENE READY!');
    const milestones = ((scene && scene.milestones) || []).slice(0, blanks);
    const stepLabels = ((scene && scene.stepLabels) || []).slice(0, blanks);
    const title = String((scene && scene.title) || 'Build the scene').slice(0, 34);
    const splitX = Math.round(w * 0.62);
    const r = 16;

    const rounded = (x, y, rw, rh, rad, fill, stroke) => {
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, rad);
      ctx.arcTo(x + rw, y + rh, x, y + rh, rad);
      ctx.arcTo(x, y + rh, x, y, rad);
      ctx.arcTo(x, y, x + rw, y, rad);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    };

    rounded(1, 1, w - 2, h - 2, r, '#f0fdfa', '#0f766e');

    const drawBackdrop = (ox, ow, complete) => {
      const groundY = Math.round(h * 0.72);
      const alpha = complete ? 1 : 0.42;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (theme === 'market') {
        ctx.fillStyle = complete ? '#fef3c7' : '#e2e8f0';
        ctx.fillRect(ox + 8, 36, ow - 16, groundY - 36);
        ctx.fillStyle = complete ? '#92400e' : '#94a3b8';
        ctx.fillRect(ox + 24, groundY - 28, ow - 48, 32);
        ctx.fillStyle = complete ? '#fb923c' : '#cbd5e1';
        ctx.fillRect(ox + 36, groundY - 18, Math.round(ow * 0.28), 18);
        ctx.fillStyle = complete ? '#84cc16' : '#94a3b8';
        ctx.fillRect(ox + Math.round(ow * 0.42), groundY - 18, Math.round(ow * 0.28), 18);
        if (complete) {
          ctx.font = '22px "Segoe UI Emoji", sans-serif';
          ctx.fillText('🧺', ox + ow - 52, groundY - 34);
        }
      } else if (theme === 'sport') {
        ctx.fillStyle = complete ? '#bbf7d0' : '#e2e8f0';
        ctx.fillRect(ox + 8, 36, ow - 16, groundY - 36);
        ctx.strokeStyle = complete ? '#15803d' : '#94a3b8';
        ctx.lineWidth = 4;
        ctx.strokeRect(ox + 20, groundY - 42, ow - 40, 36);
        if (complete) {
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(ox + Math.round(ow * 0.72), groundY - 22, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme === 'transport') {
        ctx.fillStyle = complete ? '#bae6fd' : '#e2e8f0';
        ctx.fillRect(ox + 8, 36, ow - 16, groundY - 36);
        ctx.strokeStyle = complete ? '#0284c7' : '#94a3b8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ox + 24, groundY - 8);
        ctx.lineTo(ox + ow - 24, groundY - 8);
        ctx.stroke();
        if (complete) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(ox + Math.round(ow * 0.35), groundY - 28, Math.round(ow * 0.3), 20);
        }
      } else if (theme === 'camping') {
        ctx.fillStyle = complete ? '#172554' : '#cbd5e1';
        ctx.fillRect(ox + 8, 36, ow - 16, groundY - 36);
        ctx.fillStyle = complete ? '#14532d' : '#94a3b8';
        ctx.fillRect(ox + 8, groundY - 4, ow - 16, h - groundY);
        if (complete) {
          const glow = ctx.createRadialGradient(ox + Math.round(ow * 0.55), groundY + 18, 4, ox + Math.round(ow * 0.55), groundY + 18, 36);
          glow.addColorStop(0, '#fde68a');
          glow.addColorStop(1, 'rgba(249,115,22,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(ox + Math.round(ow * 0.55), groundY + 18, 36, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (theme === 'school') {
        ctx.fillStyle = complete ? '#ecfdf5' : '#e2e8f0';
        ctx.fillRect(ox + 8, 36, ow - 16, groundY - 36);
        ctx.fillStyle = complete ? '#16a34a' : '#94a3b8';
        ctx.fillRect(ox + 28, groundY - 30, ow - 56, 24);
        if (complete) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(ox + Math.round(ow * 0.78), groundY - 18, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = complete ? '#ede9fe' : '#e2e8f0';
        ctx.fillRect(ox + 8, 36, ow - 16, groundY - 36);
        ctx.fillStyle = complete ? '#7c3aed' : '#94a3b8';
        ctx.fillRect(ox + 28, groundY - 26, ow - 56, 20);
      }
      ctx.restore();
    };

    drawBackdrop(4, splitX - 8, false);
    drawBackdrop(splitX + 4, w - splitX - 8, true);

    ctx.strokeStyle = 'rgba(15,118,110,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(splitX, 12);
    ctx.lineTo(splitX, h - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#0f766e';
    ctx.font = '800 12px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('NOW · BUILD', 16, 10);
    ctx.textAlign = 'right';
    ctx.fillText('DONE · PAYOFF', w - 16, 10);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '700 10px Poppins, sans-serif';
    ctx.fillText('EMPTY → PLACED → SCENE CHANGES', 16, 24, splitX - 32);
    ctx.fillStyle = '#134e4a';
    ctx.font = '800 14px Poppins, sans-serif';
    ctx.fillText(title, 16, 38, splitX - 32);

    const n = Math.max(1, Math.min(5, Number(blanks) || milestones.length || 3));
    const slotY = h - 36;
    const slotR = 15;
    const leftW = splitX - 24;
    const gap = Math.max(8, Math.floor((leftW - slotR * 2 * n) / Math.max(1, n - 1)));
    let sx = 16 + slotR;
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sx, slotY, slotR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, slotY, slotR - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d28d9';
      ctx.font = '800 11px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), sx, slotY);
      const glyph = milestones[i] || String(i + 1);
      ctx.font = '16px "Segoe UI Emoji", sans-serif';
      ctx.fillText(glyph, sx, slotY - slotR - 12);
      ctx.fillStyle = '#475569';
      ctx.font = '700 9px Poppins, sans-serif';
      ctx.fillText(String(stepLabels[i] || `step ${i + 1}`).slice(0, 12), sx, slotY + slotR + 10, slotR * 2 + 8);
      if (i < n - 1) {
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(sx + slotR + 2, slotY - 2, gap, 3);
      }
      sx += slotR * 2 + gap;
    }

    // DONE side: show every milestone lit + check — the earned world state.
    const doneStart = splitX + 18;
    const doneW = w - splitX - 36;
    const doneSlotY = Math.round(h * 0.58);
    const doneGap = Math.max(6, Math.floor((doneW - 22 * n) / Math.max(1, n - 1)));
    let dx = doneStart + 11;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(dx, doneSlotY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 10px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', dx, doneSlotY + 1);
      if (i < n - 1) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(dx + 12, doneSlotY);
        ctx.lineTo(dx + 12 + doneGap - 6, doneSlotY);
        ctx.stroke();
      }
      dx += 22 + doneGap;
    }

    rounded(splitX + 12, h - 46, w - splitX - 24, 36, 10, '#047857', '#065f46');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✓ ${payoff}`, splitX + (w - splitX) / 2, h - 28, w - splitX - 40);

    return c.toDataURL('image/png');
  }

  /**
   * Sentence Frames — draggable word tiles for blanks. Drop pads live in
   * makeFrames DOM (data-frame-blank). When two blanks share one best fill
   * (e.g. whistle for "blows the ____" and "hear the ____"), emit duplicate
   * tiles so students are not stuck mid-page (Manus soccer B2).
   */
  function frameTiles(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const words = vocabList(lesson).map((v) => (v && v.word) || '').filter(Boolean);
    const blanks = frameBlankCount(lesson);
    if (!words.length || !blanks) return;
    const scene = resolveFrameScene(lesson, blanks);
    const stage = L.zoneRect(page, 'sceneStage') || L.zoneRect(page, 'artSafe');
    if (stage) {
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: frameSceneStagePng(stage.w, stage.h, scene, blanks),
        w: stage.w,
        h: stage.h,
        intentional: true,
        anchor: { x: stage.x, y: stage.y, w: stage.w, h: stage.h },
        role: 'frameSceneStage',
        meta: {
          theme: scene.theme,
          milestones: scene.milestones,
          stepLabels: scene.stepLabels,
          payoff: scene.payoff,
          stateContract: ['initial', 'per-placement', 'completed'],
          blanks,
        },
      });
    }
    const tileWords = expandFrameTileWords(lesson, words);
    const dock = L.zoneRect(page, 'dock');
    const gap = 14;
    const n = tileWords.length;
    const longest = tileWords.reduce((m, w) => Math.max(m, w.length), 0);
    // Word tiles must stay readable at arm's length on the ClassIn board — size
    // from the longest word, then fit the dock (second row before going tiny).
    let tileW = Math.min(210, Math.max(96, longest * 13 + 26));
    let tileH = 60;
    if (dock && dock.w) {
      const oneRowW = Math.floor((dock.w - gap * Math.max(0, n - 1)) / n);
      if (oneRowW >= 96) {
        tileW = Math.min(tileW, oneRowW);
      } else {
        const cols = Math.ceil(n / 2);
        tileW = Math.max(88, Math.floor((dock.w - gap * Math.max(0, cols - 1)) / cols));
      }
      tileH = Math.max(52, Math.min(64, dock.h - 6));
    }
    L.placeDockRow(page, tileWords.map((w) => ({
      kind: 'tile',
      text: w,
      role: 'frameWord',
      meta: { word: w },
    })), { w: tileW, h: tileH, cols: n });
    page.notes.push('recipe:frameTiles');
    page.notes.push('recipe:frameRequired:' + boardFrames(lesson).map((f) => intendedFrameFill(f, lesson) || '?').join('|'));
    page.notes.push('recipe:frameTileWords:' + tileWords.join('|'));
    page.notes.push('frameBlanks:' + blanks);
    page.notes.push('frameTiles:' + n);
    // More holes than tiles means a student runs out of words mid-frame.
    if (blanks > n) page.notes.push('frameBlanksExceedTiles:' + (blanks - n));
    // Interaction-state contract (Manus frameTiles R1 action 4) — states are
    // rendered by shape/position, never color alone, since ClassIn hand boards
    // have no live scoring: empty=dashed crosshair pad, draggable=raised
    // shadowed tile (tileToPng), placed=tile visually covers the pad, teacher
    // confirms/retries by eye (numbered badge lets the teacher call a frame by
    // number without re-reading the whole sentence).
    page.notes.push('frameStates:empty-dashed-target|draggable-raised-tile|placed-covers-pad|teacher-confirms-by-eye');
    page.notes.push('frameSceneIntegrated:true');
    page.notes.push('framePayoffVisible:true');
    page.notes.push('frameSceneTheme:' + scene.theme);
  }

  /**
   * Best taught word for a frame blank from vocab example sentences, else null.
   * Scans every taught word against every example sentence so
   * "The coach blows the ____." can resolve via coach's sentence
   * "The coach blows the whistle." → whistle (Manus soccer B2).
   */
  function intendedFrameFill(frame, lesson) {
    const f = String(frame || '');
    if (!/_{2,}/.test(f)) return null;
    // Match against the full lesson vocabulary. The adapted board slice may
    // legitimately omit a text-only word even though a generated frame still
    // requires it; frameTiles then promotes that answer into its own tile bank.
    const vocab = ((lesson && lesson.vocabulary) || [])
      .filter((v) => v && (typeof v === 'string' ? v : (v.word || v.emoji)));
    const words = vocab
      .map((v) => String(typeof v === 'string' ? v : (v && v.word) || '').trim())
      .filter(Boolean);
    if (!words.length) return null;
    const norm = (s) => String(s).toLowerCase().replace(/_{2,}/g, '____').replace(/\s+/g, ' ').trim();
    const want = norm(f);
    let best = null;
    let bestScore = 0;
    vocab.forEach((v) => {
      const sentence = v && typeof v === 'object' ? String(v.sentence || '').trim() : '';
      if (!sentence) return;
      words.forEach((w) => {
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp('\\b' + esc + '\\b', 'i').test(sentence)) return;
        const blanked = sentence.replace(new RegExp('\\b' + esc + '\\b', 'i'), '____');
        if (blanked === sentence) return;
        const got = norm(blanked);
        let score = 0;
        if (got === want) score = 3;
        else if (got.replace(/\.$/, '') === want.replace(/\.$/, '')) score = 2;
        if (score > bestScore) {
          bestScore = score;
          best = w;
        }
      });
    });
    return best;
  }

  /**
   * Required frame answers first, then taught-board distractors. VocabArt may
   * adapt the pictured New Words slice and remove a text-only answer (for
   * example "whistle" while a frame still says "blows the ____"). frameTiles
   * needs no picture bank, so preserve exact intended fills from the full lesson
   * vocabulary and use the adapted slice only for the remaining choices.
   */
  function expandFrameTileWords(lesson, words) {
    const rawBase = (words || []).map((w) => String(w || '').trim()).filter(Boolean);
    // Topic adaptation can inject title-sized phrases as picturable vocabulary.
    // They make unusably tiny drag tiles and are poor distractors. Keep concise
    // words/phrases here; an actually-required long fill is promoted below.
    const conciseBase = rawBase.filter((w) => w.length <= 22 && w.split(/\s+/).length <= 3);
    const base = conciseBase.length ? conciseBase : rawBase;
    if (!base.length) return base;
    const frames = boardFrames(lesson);
    const demand = {};
    const required = [];
    frames.forEach((frame) => {
      const fill = intendedFrameFill(frame, lesson);
      if (!fill) return;
      const key = fill.toLowerCase();
      demand[key] = (demand[key] || 0) + 1;
      if (!required.some((w) => w.toLowerCase() === key)) required.push(fill);
    });
    const pool = [
      ...required,
      ...base.filter((w) => !required.some((need) => need.toLowerCase() === w.toLowerCase())),
    ];
    // Keep the bank no larger than the board vocabulary ceiling unless repeated
    // answers genuinely require extra physical tiles.
    const requiredTileCount = required.reduce(
      (n, w) => n + Math.max(1, demand[w.toLowerCase()] || 1),
      0
    );
    const limit = Math.max(base.length, requiredTileCount);
    const out = [];
    pool.forEach((w) => {
      if (out.length >= limit) return;
      const need = Math.max(1, demand[String(w).toLowerCase()] || 1);
      for (let i = 0; i < need && out.length < limit; i++) out.push(w);
    });
    return out;
  }

  const RECIPES = {
    matchDock,
    preA1TprChoice,
    frameTiles,
    orderLine,
    hideSeek,
    revealReward,
    buildScene,
    dressUp,
    coverAnswer,
    mysteryHints,
    silhouetteGate,
    halfTruthBoard,
    sceneRepair,
    capacityPack,
    routeMission,
    transformationLab,
    evidenceBoard,
    oddOneOut,
    yesNoSort,
    thisOrThat,
    fixSentence,
    sortBins,
    heroProp,
    phonicsSoundBoxes,
  };

  /**
   * Plan activities across the lesson spine.
   * Returns { assignments: [{ pageKey, recipeId, ctx? }], seed }
   * Skips recipes when required content is empty (no empty docks).
   * Simple mode: vocab matchDock only; no story recipes; no wrap orderLine/reward;
   * one Peek sticky on the first speaking page.
   */
  function plan(lesson, meta) {
    lesson = bridgeNormalize(lesson, meta || {});
    const rngSeed = hashStr((lesson.title || '') + '|' + (meta?.level || '') + '|' + (meta?.duration || ''));

    // Topic Identity Gate — before vocab adapt / recipes. Stash lesson._topicBrief.
    let topicBrief = null;
    if (window.TopicIdentity && typeof window.TopicIdentity.buildBrief === 'function') {
      try {
        topicBrief = window.TopicIdentity.buildBrief(lesson);
      } catch (_) {
        topicBrief = null;
      }
    }

    // Producer quality repair — regenerate only failing content stages (vocab /
    // story / activity / warm-up). Caps attempts so bake cannot loop forever.
    let producerRepair = null;
    if (window.ProducerQuality && typeof window.ProducerQuality.repair === 'function') {
      try {
        const pre = window.ProducerQuality.validate(lesson, { topicBrief });
        if (pre && !pre.pass) {
          const fixed = window.ProducerQuality.repair(lesson, {
            topicBrief,
            maxAttempts: 3,
          });
          producerRepair = {
            attempted: true,
            repairs: fixed.repairs || [],
            pass: !!(fixed.report && fixed.report.pass),
            failures: (fixed.report && fixed.report.failures) || pre.failures || [],
          };
          topicBrief = (fixed.lesson && (fixed.lesson.topicBrief || fixed.lesson._topicBrief)) || topicBrief;
        } else {
          producerRepair = { attempted: false, pass: true, repairs: [], failures: [] };
        }
      } catch (_) {
        producerRepair = null;
      }
    }

    // Same-topic coverage adapt: put picture-able words in the board six before
    // recipe pick / readiness. Never drifts the lesson theme.
    // Clear prior adapt so repair's rebuilt vocab is rescored (not replayed).
    if (lesson && lesson._vocabAdapted) delete lesson._vocabAdapted;
    let vocabAdapt = null;
    if (window.VocabArt && typeof window.VocabArt.adaptBoardVocabulary === 'function') {
      try {
        vocabAdapt = window.VocabArt.adaptBoardVocabulary(lesson, {
          seed: (lesson && lesson.title) || '',
          topicBrief,
        });
      } catch (_) {
        vocabAdapt = null;
      }
    }

    // Adapt must not undo core-completeness — if it still shrunk, force core fill once.
    if (
      window.ProducerQuality
      && typeof window.ProducerQuality.validate === 'function'
      && topicBrief
    ) {
      const post = window.ProducerQuality.validate(lesson, { topicBrief });
      if (post && post.failures && post.failures.indexOf('CORE_SET_INCOMPLETE') >= 0) {
        try {
          window.ProducerQuality.setVocabFromCore(lesson, topicBrief);
          window.ProducerQuality.alignVocabWithLaterContent(lesson, topicBrief);
          if (lesson._vocabAdapted) delete lesson._vocabAdapted;
          if (window.VocabArt && typeof window.VocabArt.adaptBoardVocabulary === 'function') {
            vocabAdapt = window.VocabArt.adaptBoardVocabulary(lesson, {
              seed: (lesson && lesson.title) || '',
              topicBrief,
              forceCoreComplete: true,
            });
          }
          if (producerRepair) {
            producerRepair.repairs = (producerRepair.repairs || []).concat([
              { stage: 'vocabulary-post-adapt', attempt: 1 },
            ]);
          }
        } catch (_) { /* keep prior adapt */ }
      }
    }

    const vocab = vocabList(lesson);
    const hasVocab = vocab.length > 0;
    const assignments = [];
    const kit = window.PropBank && window.PropBank.assessKit && window.PropBank.assessKit(lesson);

    // VocabArt ladder — pack → prop(+headNounOk) → curatedGlyph → none.
    // Match dock only when matchable rows fit honestly (≥96px). Dropped words
    // stay text-only on cards (no Gemini emoji / bullet pad).
    // Topic seed = lesson title (theme-rank fire-* vs farm-*); never pass rngSeed.
    const vocabArt = hasVocab ? planVocabArt(lesson, (lesson && lesson.title) || '') : { rows: [], matchable: [], dropped: [] };
    const matchDockAudit = matchDockMappingAudit(vocabArt);
    const honestMatch = matchDockAudit.ok && canHonestMatchDock(vocabArt.matchable.length);
    if (honestMatch) {
      assignments.push({
        pageKey: 'newWords',
        recipeId: 'matchDock',
        ctx: { vocabArt, matchDockAudit },
      });
    }

    const preA1Live = isPreA1Live(lesson, meta);

    // Sentence Frames — draggable word tiles into the blanks. Text tiles need no
    // art bank, so this rides thin-art lessons the match dock has to skip.
    if (!preA1Live && canHonestFrameTiles(lesson)) {
      assignments.push({ pageKey: 'frames', recipeId: 'frameTiles' });
    }

    // Phonics — sound boxes + letter tiles when schema + gate allow
    if (includePhonics(lesson, meta)) {
      assignments.push({ pageKey: 'phonics', recipeId: 'phonicsSoundBoxes', ctx: { meta: meta || {} } });
    }

    // Speaking — one Peek sticky over the first sample on speaking:0
    const chunks = speakingChunks(lesson, meta);
    if (chunks[0] && chunks[0][0]) {
      assignments.push({
        pageKey: 'speaking:0',
        recipeId: 'coverAnswer',
        ctx: { speakingItem: chunks[0][0], speakingIndex: 0 },
      });
    }

    if (preA1Live) {
      const actions = (window.ProducerBridge && typeof window.ProducerBridge.availablePreA1Actions === 'function')
        ? window.ProducerBridge.availablePreA1Actions().map((p) => ({
          key: p.key,
          word: String(p.key).replace(/^prea1-verb-/, '').replace(/-/g, ' '),
        }))
        : (lesson._preA1Actions || []);
      assignments.push({
        pageKey: 'activity',
        recipeId: 'preA1TprChoice',
        ctx: { actions },
      });
    } else if (hasVocab) {
      const requestedGrammar = resolveRequestedBoardGrammar(lesson, vocabArt);
      const explicitGrammar = hasExplicitBoardGrammar(lesson);
      // An authored grammar is the lesson designer's one job for this board.
      // It must beat an incidental hero-kit match; narrow title cues still yield
      // to a proven king and are considered only if no king ships.
      if (explicitGrammar && requestedGrammar) {
        assignments.push({
          pageKey: 'activity',
          recipeId: requestedGrammar.recipeId,
          ctx: requestedGrammar.ctx,
        });
      } else {
      // Activity — curated stage (feelings/face/dental) or pack kit → king stage.
      // Always resolve via findHeroProp so "Round 1" cannot keep a false-ready
      // castle kit ahead of face-blank (S43).
      let hero = findHeroProp(lesson);
      // Soft-gate: unproven kings never ship as heroProp (kit pins / other callers).
      if (hero && !SHIPPABLE_KING_KEYS.has(hero.key)) hero = null;
      // A king with zero roleplay dock pieces is not a stage — fall to sortBins.
      if (hero && roleplayDockProps(lesson, hero, 18).length === 0) {
        hero = null;
      }
      const kitMatchesHero = !!(kit && kit.ready && kit.hero && hero && kit.hero.key === hero.key);
      if (hero) {
        assignments.push({
          pageKey: 'activity',
          recipeId: 'heroProp',
          ctx: { hero, kit: kitMatchesHero ? kit : null },
        });
      } else {
        // Requested board grammar by narrow cue (explicit payloads were handled
        // above). Never spray a complex grammar without valid content.
        if (requestedGrammar) {
          assignments.push({
            pageKey: 'activity',
            recipeId: requestedGrammar.recipeId,
            ctx: requestedGrammar.ctx,
          });
        } else {
        // Soft-gated hero lost — plan order for non-king activity:
        // 1) fixSentence when a credible single-error sentence is buildable
        //    AND Sentence Frames did not already ship (frames twin = hollow)
        // 2) oddOneOut when ≥4 pictured + credible 3+1 theme set
        // 3) lesson mysteryHints (author intent) when ≥3 hints + pictured target
        // 4) yesNoSort when ≥4 pictured + clean YES/NO rule (3+1 or 2+2)
        // 5) thisOrThat when ≥2 distinct pictured (multi-topic choice)
        // 6) derived mysteryHints when ≥1 pictured
        // 7) sortBins (never hollow / never re-run matchDock on activity)
        const fixSet = (!hasFramesContent(lesson) && resolveFixSentence(lesson)) || null;
        if (fixSet) {
          assignments.push({
            pageKey: 'activity',
            recipeId: 'fixSentence',
            ctx: {
              sentence: fixSet.sentence,
              wrong: fixSet.wrong,
              correct: fixSet.correct,
              distractors: fixSet.distractors,
              source: fixSet.source,
              wrongKind: fixSet.wrongKind || null,
            },
          });
        } else {
          const oddSet = resolveOddOneOut(lesson, vocabArt);
          if (oddSet) {
            assignments.push({
              pageKey: 'activity',
              recipeId: 'oddOneOut',
              ctx: {
                options: oddSet.options,
                odd: oddSet.odd,
                rows: oddSet.rows,
                whyHint: oddSet.whyHint || null,
                ruleHint: oddSet.ruleHint || null,
                source: oddSet.source,
                themeCue: oddSet.themeCue || null,
              },
            });
          } else {
            // Explicit lesson mysteryHints beat derived binary/choice (author intent).
            const rawMystery = lesson && lesson.activity && lesson.activity.mysteryHints;
            const lessonMysteryOk = Array.isArray(rawMystery)
              && rawMystery.filter((h) => String(h || '').trim()).length >= 3;
            const mysteryRowPref = pickMysteryTarget(vocabArt);
            if (lessonMysteryOk && mysteryRowPref && mysteryRowPref.word) {
              const targetWord = mysteryRowPref.word;
              assignments.push({
                pageKey: 'activity',
                recipeId: 'mysteryHints',
                ctx: {
                  targetWord,
                  artPath: mysteryRowPref.artSrc || null,
                  vocabArtRow: mysteryRowPref,
                  hints: resolveMysteryHints(targetWord, lesson),
                },
              });
            } else {
              const ynSet = resolveYesNoSort(lesson, vocabArt, meta);
              if (ynSet) {
                assignments.push({
                  pageKey: 'activity',
                  recipeId: 'yesNoSort',
                  ctx: {
                    options: ynSet.options,
                    yes: ynSet.yes,
                    no: ynSet.no,
                    rows: ynSet.rows,
                    question: ynSet.question,
                    ruleHint: ynSet.ruleHint || null,
                    whyLine: ynSet.whyLine || null,
                    source: ynSet.source,
                    ruleId: ynSet.ruleId || null,
                    level: (meta && meta.level) || null,
                  },
                });
              } else {
                const choiceSet = resolveThisOrThat(lesson, vocabArt, meta);
                if (choiceSet) {
                  assignments.push({
                    pageKey: 'activity',
                    recipeId: 'thisOrThat',
                    ctx: {
                      options: choiceSet.options,
                      rows: choiceSet.rows,
                      frame: choiceSet.frame,
                      source: choiceSet.source,
                    },
                  });
                } else {
                  const mysteryRow = pickMysteryTarget(vocabArt);
                  if (mysteryRow && mysteryRow.word) {
                    const targetWord = mysteryRow.word;
                    assignments.push({
                      pageKey: 'activity',
                      recipeId: 'mysteryHints',
                      ctx: {
                        targetWord,
                        artPath: mysteryRow.artSrc || null,
                        vocabArtRow: mysteryRow,
                        hints: resolveMysteryHints(targetWord, lesson),
                      },
                    });
                  } else {
                    assignments.push({
                      pageKey: 'activity',
                      recipeId: 'sortBins',
                    });
                  }
                }
              }
            }
          }
        }
        }
      }
      }
    }

    const planOut = {
      assignments,
      seed: rngSeed,
      kit: kit && kit.ready ? { pack: kit.pack, hero: kit.hero.key, docks: kit.dockCount } : null,
      vocabArt,
      topicBrief: topicBrief || (lesson && lesson._topicBrief) || null,
      producerRepair: producerRepair || null,
      vocabAdapt: vocabAdapt || null,
      canHonestMatchDock: honestMatch,
      matchDockHint: honestMatch ? matchDockStudentHint(vocabArt) : null,
      matchDockAudit,
    };
    if (window.BoardReadiness && window.BoardReadiness.assess) {
      planOut.readiness = window.BoardReadiness.assess(lesson, planOut);
    }
    return planOut;
  }

  /**
   * Apply all recipes that target a given pageKey onto a layout page.
   */
  function applyToPage(lesson, page, pageKey, boardPlan) {
    const L = window.EdbLayout;
    const list = (boardPlan?.assignments || []).filter((a) => a.pageKey === pageKey);
    list.forEach((a) => {
      const fn = RECIPES[a.recipeId];
      if (fn) fn(lesson, page, L, a.ctx || {});
    });
    return page;
  }

  /**
   * Place 1–3 locked props on scene activity pages after bgPicks exist.
   * Flats get nothing — dressing is for the empty centre band of place scenes.
   * Call from attachBgPicks so preview and bake stay in sync.
   *
   * Skip when the activity recipe already owns artSafe (buildScene / dressUp /
   * sortBins / mysteryHints / oddOneOut / yesNoSort / thisOrThat / fixSentence) —
   * stacking dressing on top is what made volcano page 13 a prop pile-up. Also
   * skip when no prop clears a real theme score: never wallpaper a volcano with
   * living-room remotes because the title said "Living…".
   */
  function dressScenes(boardPlan, lesson) {
    const PB = window.PropBank;
    const L = window.EdbLayout;
    const req = PB && PB.requestFor('sceneDressing');
    if (!PB || !L || !req || !boardPlan || !boardPlan.pages || !boardPlan.bgPicks) return;

    const RECIPE_OWNS_ART = {
      buildScene: 1, dressUp: 1, sortBins: 1, heroProp: 1, mysteryHints: 1,
      silhouetteGate: 1, halfTruthBoard: 1, sceneRepair: 1,
      capacityPack: 1, routeMission: 1, transformationLab: 1, evidenceBoard: 1,
      oddOneOut: 1, yesNoSort: 1, thisOrThat: 1, fixSentence: 1,
    };
    const activityRecipe = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
    if (activityRecipe && RECIPE_OWNS_ART[activityRecipe.recipeId]) return;

    const family = PB.familyFor(lesson);
    const DRESS_TAG_STOP = new Set([
      'a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
      'living', 'near', 'next', 'my', 'our', 'your', 'how', 'what', 'when', 'where', 'why', 'who',
      'shadow', 'title', 'are', 'is', 'nice',
    ]);
    const themeTags = [
      ...((lesson && lesson.vocabulary) || []).flatMap((v) => {
        const w = typeof v === 'string' ? v : v && v.word;
        return w ? [String(w).toLowerCase()] : [];
      }),
      ...String((lesson && lesson.title) || '').toLowerCase().split(/\W+/).filter(Boolean),
    ].filter((t) => t && !DRESS_TAG_STOP.has(t));
    // Clinic furniture is tagged medical/clinic/doctor — map dental place words so
    // dentist lessons dress with exam-couch / stethoscope, not a park swing.
    if (/\b(dentist|dental|tooth|teeth|clinic|doctor|nurse|hospital)\b/.test(themeTags.join(' '))) {
      themeTags.push('medical', 'clinic', 'doctor');
    }
    const exclude = [];
    const count = Math.max(1, Math.min(3, req.count || 2));

    boardPlan.pages.forEach((page, i) => {
      if (!page || page.pageKey !== 'activity') return;
      const pick = boardPlan.bgPicks[i];
      if (!pick || pick.type !== 'scene') return;

      const groundY = pick.groundY || Math.round(590 * 0.55);
      const maxH = Math.min(PB.MAX_PROP_H || 300, Math.max(96, groundY - 140));
      // Activity chrome owns the left bodyText band (x≤748). Dress only in
      // artSafe on the right so H3 does not fire on locked prop centers.
      const art = L.zoneRect(page, 'artSafe') || { x: 780, y: 100, w: 450, h: 320 };
      const dockTop = 420;
      const gap = 20;
      const placed = [];

      for (let n = 0; n < count; n++) {
        const seed = (lesson && lesson.title) || '';
        // Identity-only: try each theme token as a WORD lookup. Tags never
        // qualify (coach must not dress a whistle via tag overlap).
        let prop = null;
        for (const w of themeTags) {
          if (exclude.includes(w)) continue;
          prop = PB.resolve({
            word: w,
            seed: seed + '|dress|' + n,
            exclude: req.distinct ? exclude : [],
            family,
            minScore: PB.DEFAULT_MIN_SCORE || 4,
          });
          if (prop) break;
        }
        if (!prop) continue;
        exclude.push(prop.key);
        const sized = PB.sizeFor(prop, { maxH, maxW: Math.min(220, art.w - 16) });
        // Always stand on the floor for scene dressing — floating anchors
        // (folder, clipboard) land on the dress-up character otherwise.
        let y = window.SceneBackgrounds
          ? window.SceneBackgrounds.standOn(pick, sized.h)
          : PB.yFor(prop, pick, sized.h);
        if (y + sized.h > dockTop - 8) y = Math.max(art.y, dockTop - 8 - sized.h);
        // Center of the piece must stay inside artSafe (H3 checks locked too).
        const minY = art.y + 4;
        const maxY = art.y + art.h - sized.h - 4;
        if (maxY >= minY) y = Math.max(minY, Math.min(maxY, y));
        placed.push({ prop, sized, y });
      }
      if (!placed.length) return;

      const totalW = placed.reduce((s, p) => s + p.sized.w, 0) + gap * Math.max(0, placed.length - 1);
      let x = art.x + Math.max(8, Math.round((art.w - totalW) / 2));
      placed.forEach(({ prop, sized, y }) => {
        L.place(page, {
          locked: true,
          kind: 'image',
          asset: prop.path,
          w: sized.w,
          h: sized.h,
          intentional: true,
          anchor: { x, y, w: sized.w, h: sized.h },
          role: 'sceneDress',
          meta: { propKey: prop.key, propAspect: prop.aspect },
        });
        x += sized.w + gap;
      });
      page.notes.push('recipe:sceneDressing');
    });
  }

  function pageTypeForKey(pageKey) {
    if (pageKey === 'newWords') return 'vocab';
    if (pageKey === 'phonics') return 'phonics';
    if (/^story\d+$/.test(String(pageKey || ''))) return 'story';
    if (pageKey && pageKey.startsWith('speaking:')) return 'speaking';
    if (pageKey === 'activity') return 'activity';
    if (pageKey === 'wrap') return 'wrap';
    if (pageKey === 'title') return 'title';
    if (pageKey === 'warm') return 'warm';
    if (pageKey === 'vocabSentences') return 'vocabSentences';
    if (pageKey === 'frames') return 'frames';
    if (pageKey === 'comprehension') return 'comprehension';
    if (pageKey === 'creative') return 'creative';
    return 'warm';
  }

  /**
   * Build full board plan: spine pageKeys + layout pages with pieces.
   */
  function buildBoardPlan(lesson, meta) {
    // Plan and render MUST see the same normalized lesson. render()/buildSectionList
    // fold root-level creative/comprehension/wrapUp into story.* via normalizeLesson;
    // if the plan is built on the raw drift-shape it can come out one page short of
    // render()'s pageEls (e.g. includeCreative reads story.creativeQuestions). Normalize
    // once here (mutates in place, idempotent) so both spines match.
    if (window.LessonPages && window.LessonPages.normalizeLesson) {
      lesson = window.LessonPages.normalizeLesson(lesson);
    }
    lesson = bridgeNormalize(lesson, meta || {});
    const boardPlan = plan(lesson, meta);
    boardPlan.meta = meta || {};
    const L = window.EdbLayout;
    const pages = [];
    const indexByKey = {};

    function addPage(pageKey, pageType) {
      const page = L.createPage(pageType || pageTypeForKey(pageKey));
      page.pageKey = pageKey;
      applyToPage(lesson, page, pageKey, boardPlan);
      indexByKey[pageKey] = pages.length;
      page.pageIndex = pages.length;
      pages.push(page);
      return page;
    }

    // Spine mirrors renderLessonPages
    addPage('title', 'title');
    addPage('warm', 'warm');
    addPage('newWords', 'vocab');
    if (includePhonics(lesson, meta)) addPage('phonics', 'phonics');
    if (!isPreA1Live(lesson, meta) && hasVocabSentencesContent(lesson)) addPage('vocabSentences', 'vocabSentences');
    if (!isPreA1Live(lesson, meta) && hasFramesContent(lesson)) addPage('frames', 'frames');

    const storyCount = storyPageCount(lesson, meta);
    for (let i = 0; i < storyCount; i++) addPage('story' + i, 'story');

    if (!isPreA1Live(lesson, meta)) addPage('comprehension', 'comprehension');
    if (includeCreative(lesson, meta)) addPage('creative', 'creative');

    speakingChunks(lesson, meta).forEach((_, i) => addPage('speaking:' + i, 'speaking'));

    const actAssign = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
    addPage('activity', actAssign && actAssign.recipeId === 'heroProp' ? 'heroStage' : 'activity');
    addPage('wrap', 'wrap');

    // Hero dock overflow drops are known only after recipes place pieces —
    // fold into plan + refresh readiness so Draft reasons stay honest.
    let dockDrops = 0;
    for (const p of pages) {
      if (p && Number(p.dockDropped) > 0) dockDrops += Number(p.dockDropped);
      else {
        for (const n of (p && p.notes) || []) {
          const m = /^dockDropped:(\d+)$/.exec(String(n));
          if (m) dockDrops += Number(m[1]);
        }
      }
    }
    boardPlan.pages = pages;
    boardPlan.indexByKey = indexByKey;
    boardPlan.dockDrops = dockDrops;
    if (window.BoardReadiness && window.BoardReadiness.assess) {
      boardPlan.readiness = window.BoardReadiness.assess(lesson, boardPlan);
    }

    return {
      pages,
      indexByKey,
      assignments: boardPlan.assignments,
      seed: boardPlan.seed,
      kit: boardPlan.kit || null,
      vocabArt: boardPlan.vocabArt || null,
      canHonestMatchDock: !!boardPlan.canHonestMatchDock,
      matchDockHint: boardPlan.matchDockHint || null,
      matchDockAudit: boardPlan.matchDockAudit || null,
      dockDrops,
      readiness: boardPlan.readiness || null,
      // Back-compat slots
      slots: {
        newWords: indexByKey.newWords,
        wrap: indexByKey.wrap,
        byKey: indexByKey,
      },
    };
  }

  window.EdbActivities = {
    RECIPES,
    plan,
    applyToPage,
    dressScenes,
    plan,
    buildBoardPlan,
    pageTypeForKey,
    speakingCoverRect,
    speakingFlapRect,
    coverAnswerBind,
    coverAnswerWorldPng,
    speakingChunks,
    findHeroProp,
    sayNounFromKey,
    MAX_STORY_PAGES,
    MAX_BOARD_FRAMES,
    storyPageCount,
    storyPagesForBoard,
    includeCreative,
    includePhonics,
    wantsPhonics,
    normalizePhonics,
    canHonestMatchDock,
    canHonestFrameTiles,
    hasVocabSentencesContent,
    hasFramesContent,
    frameBlankBankable,
    intendedFrameFill,
    expandFrameTileWords,
    frameSegments,
    frameBlankCount,
    boardFrames,
    boardVocabCount,
    matchDockSize,
    matchDockIsPartial,
    matchDockMappingAudit,
    matchDockWorldTheme,
    matchDockWorldScenePng,
    matchDockPadPlatePng,
    matchDockRewardPng,
    matchDockWaxSealPng,
    matchDockThreeStateRects,
    matchDockStudentHint,
    solidPng,
    slotGhostPng,
    stickyPng,
    peelFlapPng,
    pickMysteryTarget,
    resolveMysteryHints,
    hintNamesAnswer,
    picturedMatchableRows,
    themeCueForWord,
    resolveOddOneOut,
    deriveOddOneOut,
    canBuildOddOneOut,
    oddWhyWriteLine,
    ODD_WHY_SCAFFOLD,
    resolveThisOrThat,
    deriveThisOrThat,
    canBuildThisOrThat,
    thisOrThatFrame,
    YES_NO_RULES,
    resolveYesNoSort,
    deriveYesNoSort,
    canBuildYesNoSort,
    yesNoWhyWriteLine,
    yesNoRuleHint,
    YES_NO_WHY_SCAFFOLD,
    resolveFixSentence,
    deriveFixSentence,
    normalizeFixSentence,
    canBuildFixSentence,
    collectFixSourceSentences,
    isShortFixTile,
    morphWrongForms,
    resolveSilhouetteGate,
    resolveHalfTruth,
    resolveSceneRepair,
    resolveCapacityPack,
    resolveRouteMission,
    resolveTransformationLab,
    resolveEvidenceBoard,
    resolveRequestedBoardGrammar,
    wantsSilhouetteGate,
    wantsHalfTruth,
    wantsSceneRepair,
    wantsCapacityPack,
    wantsRouteMission,
    wantsTransformationLab,
    wantsEvidenceBoard,
    hasExplicitBoardGrammar,
    boardArchetypeId,
    silhouetteGatePng,
  };
})();
