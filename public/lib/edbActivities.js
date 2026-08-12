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

  function reviewWords(lesson) {
    const sentence = (lesson.reviewSentences || [])[0] || '';
    return sentence.replace(/[.!?]$/, '').split(/\s+/).filter(Boolean).slice(0, 5);
  }

  /** Must match speaking.targetBay in edbLayout ZONE_TEMPLATES. */
  function speakingCoverRect() {
    // Below the Q1 chrome card (header + hint + one question line). Keep in sync
    // with edbLayout speaking.targetBay when bumping type sizes.
    return { x: 88, y: 240, w: 720, h: 72 };
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

  /** Honest dock = ≥3 matchable pieces that fit ≥96px cells. Accepts a count or lesson.
   *  1–2 draggable pictures is not a matching activity — text-only cards instead. */
  function canHonestMatchDock(lessonOrCount) {
    const MIN_MATCHABLE = 3;
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
  function matchDockIsPartial(vocabArt) {
    if (!vocabArt) return false;
    const matchableN = Array.isArray(vocabArt.matchable) ? vocabArt.matchable.length : 0;
    const droppedN = Array.isArray(vocabArt.dropped) ? vocabArt.dropped.length : 0;
    if (droppedN > 0) return true;
    const rowsN = Array.isArray(vocabArt.rows) ? vocabArt.rows.length : 0;
    return matchableN > 0 && rowsN > 0 && matchableN < rowsN;
  }

  /**
   * Student-facing New Words / matchDock instruction.
   * Always kid copy — never announce missing art ("not every word has a picture").
   * Partial coverage stays on BoardReadiness / admin Draft reasons only.
   * Pads + bin already only include matchable pictures, so "each picture" = each in the bin.
   */
  function matchDockStudentHint(_vocabArt) {
    return 'Say each word. Drag each picture onto its numbered drop pad.';
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
    return window.VocabArt.planFor(lesson, {
      family,
      seed: topicSeed || (lesson && lesson.title) || '',
    });
  }

  /** 60-minute lessons ask Gemini for 3 story pages; 30-min keeps one fuller beat. */
  const MAX_STORY_PAGES = 3;

  function storyPageCount(lesson, meta) {
    const n = (lesson.story?.pages || []).length;
    if (n <= 0) return 1;
    const dur = Number(meta && meta.duration);
    // Two thin story cards on a 30-min board feel unfinished — one fuller page.
    if (Number.isFinite(dur) && dur <= 30) return 1;
    return Math.min(MAX_STORY_PAGES, n);
  }

  /** Board story pages: collapse short multi-page stories into one fuller beat. */
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
        text: raw.map((p) => p && p.text).filter(Boolean).join(' '),
        visualTheme: first.visualTheme,
        visualCaption: first.visualCaption || (raw[1] && raw[1].visualCaption) || '',
      }];
    }
    return raw.slice(0, count);
  }

  function includeCreative(lesson, meta) {
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

  function stickyPng(w, h) {
    // Dark ink on bright yellow — never white-on-pale (was unreadable on
    // terracotta / dawn flats when a light cover prop replaced this).
    return solidPng(w, h, '#facc15', 'Peek?', '#422006');
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
    // Numbered drop pads live in makeVocab DOM (data-match-pad) so they stay
    // under the word label. Match pieces are VocabArt matchable only — never
    // raw Gemini emoji / bullet / wrong PropBank fill. Do NOT set `label`
    // — pieceToPng would bake answer-naming chips into the dock PNG.
    L.placeDockRow(page, rows.map((row) => {
      const meta = {
        word: row.word,
        artSrc: row.artSrc || null,
        artTier: row.tier,
      };
      // H7: any 09_props draw must carry PropBank provenance. Dock cells are
      // square peers — stamp propKey only (not propAspect) so sizeFor aspect
      // checks do not fire on letterboxed match icons.
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
        emoji: row.glyph,
        role: 'matchPiece',
        meta,
      };
    }), { w: size.w, h: size.h, cols: size.cols, noShrink: true });
    page.notes.push('recipe:matchDock');
    page.notes.push('recipe:matchDockPads');
    page.notes.push('recipe:matchDockNoCaptions');
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
    // Sticky covers targetBay — painted sample band uses the same rect
    const coverRect = L.zoneRect(page, 'targetBay') || speakingCoverRect();
    // Always use the painted Peek sticky for speaking covers. Cover props are
    // often pale flaps with no readable label; white/cream art under ink-policy
    // white chrome made "Let's Talk" / Peek impossible to read on Board PNGs.
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: stickyPng(coverRect.w, coverRect.h),
      w: coverRect.w, h: coverRect.h,
      intentional: true,
      anchor: coverRect,
      role: 'answerCover',
      meta: {
        sample: q.sampleAnswer,
      },
    });
    page.notes.push('recipe:coverAnswer');
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
    const binW = Math.floor((bay.w - 40) / 2);
    const binH = Math.min(180, bay.h - 20);
    bins.forEach((bin, i) => {
      const cellX = bay.x + 10 + i * (binW + 20);
      const cellY = bay.y + 10;
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
    // Keep dock cards big enough to tap (M10) and wide enough for long words
    // ("toothbrush"). Prefer fewer wider tiles over clipped labels.
    const dock = L.zoneRect(page, 'dock');
    const gap = 14;
    const longest = cards.reduce((n, v) => Math.max(n, String(v.word || '').length), 0);
    const minWForWord = Math.min(200, Math.max(96, longest * 13 + 24));
    let cardW = Math.max(140, minWForWord);
    let cardH = 72;
    let fit = cards;
    if (dock && dock.w) {
      const maxN = Math.max(2, Math.floor((dock.w + gap) / (minWForWord + gap)));
      if (fit.length > maxN) fit = fit.slice(0, maxN);
      cardW = Math.max(
        minWForWord,
        Math.min(200, Math.floor((dock.w - gap * Math.max(0, fit.length - 1)) / fit.length))
      );
      cardH = Math.max(56, Math.min(72, Math.round(cardW * 0.45)));
    }
    L.placeDockRow(page, fit.map((v) => ({
      kind: 'tile',
      text: v.word,
      emoji: v.emoji,
      role: 'sortCard',
      meta: { word: v.word },
    })), { w: cardW, h: cardH, noShrink: true });
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
   * Find a large interactive prop the activity page can center on.
   * Prefer roleplay-stage surfaces (open mouth, trampoline) over standing
   * characters — kids drag tools onto the stage, not beside a stick figure.
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

    // Curated emotion/face/dental stages BEFORE pack kits — "Round 1" used to
    // token-match castle-tree-round / castle-window-round and steal the hero (S43).
    // TODO: move to lessonTraits (curated stage rules — keep with STAGE_RULES below).
    // Dental must use word boundaries — bare `tooth`/`brush` steals bathroom
    // "toothbrush" lessons onto the open-mouth patient (quality loop).
    const dentalCue = (window.LessonTraits && window.LessonTraits.RE && window.LessonTraits.RE.dental)
      || /\b(dentist|dental|tooth|teeth|cavity|floss)\b/;
    const hospitalCue = (window.LessonTraits && window.LessonTraits.RE && window.LessonTraits.RE.hospital)
      || /\b(doctor|clinic|hospital|nurse|medical|checkup|diagnosis|symptoms?|prescription|appointment|fever|sick)\b/;
    const CURATED_STAGE_FIRST = [
      { re: /\b(feeling|feelings|emotion|emotions|mood)\b|\b(worried|scared|shy|confused|proud|surprised|happy|sad|angry|bored|sleepy|excited|tired)\b/, key: 'face-blank' },
      { re: /\bface\b|\bhair\b|\beyes?\b|\bnose\b|\bear\b|make.?a.?face|blank.?face/, key: 'face-blank' },
      { re: dentalCue, key: 'dental-kid-open-mouth' },
      // Clinic/doctor lessons stage the hospital bed — not the dental open mouth
      // (clown-clinic / loop2-doctor quality loop). Dental cue wins first.
      { re: hospitalCue, key: 'hospital-bed' },
    ];
    for (const rule of CURATED_STAGE_FIRST) {
      if (rule.re.test(blob)) {
        const hit = PB.resolve({ word: rule.key, seed, family });
        if (isHeroSized(hit)) return hit;
      }
    }

    // Pack kits — banking a pack with a hero is enough (castle, jobs…).
    const kit = PB.assessKit && PB.assessKit(lesson);
    if (kit && kit.ready && kit.hero && isHeroSized(kit.hero)) return kit.hero;

    // Remaining curated stages (trampoline / castle / beach) after kits.
    // Beach sandcastle is also kit-promoted (hero-scale); rule is belt-and-suspenders
    // so "sand" never falls through to landmark-marina-bay-sands.
    const STAGE_RULES = [
      { re: /trampolin|bounce|backflip/, key: 'trampoline' },
      { re: /castle|medieval|knight|drawbridge|portcullis|royal/, key: 'castle-wall-gate' },
      { re: /\b(beach|shore|seaside|sandcastle)\b/, key: 'beach-sandcastle' },
      // Fire / camp / bath / playground — pack heroes exist; cues beat identity fallthrough.
      // Dental/hospital already won in CURATED_STAGE_FIRST (bathroom must not steal open-mouth).
      { re: /\b(fire\s*stations?|firehouses?|firefighters?|firemen|fireman|fire\s*trucks?|fire\s*engines?|fire\s*safety)\b/, key: 'fire-truck' },
      { re: /\b(campsites?|camping|campfire|tents?)\b/, key: 'tent' },
      { re: /\b(bathrooms?|bathtub|bath\b|shower|wash\s*up|toiletries|routines?)\b/, key: 'bath-bathtub' },
      { re: /\b(playgrounds?|play\s*structures?|slides?|seesaws?|swing\s*sets?)\b/, key: 'playground-slide' },
      // Cafe / farm — pack heroes exist; cues beat identity fallthrough.
      { re: /\b(cafes?|caf[eé]s?|coffee\s*shops?|bakerys?|bake\s*shops?|restaurants?|diners?)\b/, key: 'cafe-counter-stage' },
      { re: /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/, key: 'farm-barn' },
      { re: /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/, key: 'aquarium-tank' },
      { re: /\b(construction|building\s*sites?|hard\s*hats?|excavators?|cranes?)\b/, key: 'construction-tower-crane' },
      // Dollhouse — cutaway hero; home/furniture kits also win via assessKit.
      { re: /\b(dollhouses?|doll\s*houses?|furniture|home\s*tour)\b/, key: 'dollhouse-cutaway' },
    ];
    for (const rule of STAGE_RULES) {
      if (rule.re.test(blob)) {
        const hit = PB.resolve({ word: rule.key, seed, family });
        if (isHeroSized(hit)) return hit;
      }
    }

    // Identity word lookups — gated (empty > wrong). A hero-sized hit from a bare
    // tag is only accepted when the key head-matches that tag, or the prop's pack
    // is shared with the lesson theme. Otherwise "sink" on a pottery lesson ships
    // bath-sink as the king stage.
    for (const t of tags) {
      const hit = PB.resolve({ word: t, seed, family });
      if (!isHeroSized(hit)) continue;
      if (heroIdentityOk(hit, t, tags, PB, seed, family)) return hit;
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
   * Dental core + cross-pack cafeteria/clinic bits (apple/cup/milk/tissues).
   * Dropped dental-bib — at dock size it reads as a purse, not a bib.
   * No lollipop/candy in the bank yet (wishlist).
   */
  const ROLEPLAY_DOCK_DENTAL = [
    'toothbrush-prop',
    'toothpaste-tube',
    'floss-pick',
    'dental-mirror',
    'cavity-tooth',
    'healthy-tooth',
    'apple',
    'plastic-cup',
    'milk-carton',
    'reward-star-dental',
    'dentist-character',
  ];

  /** Curated make-a-face dock — eyes/mouths/noses/ears/hair/glasses (no ultra-wide brows). */
  const ROLEPLAY_DOCK_FACE = [
    'face-eyes-brown',
    'face-eyes-blue',
    'face-eyes-green',
    'face-eyes-dark',
    'face-mouth-smile',
    'face-mouth-open',
    'face-nose-button',
    'face-nose-round',
    'face-nose-point',
    'face-nose-long',
    'face-ears-round',
    'face-ears-oval',
    'face-ears-large',
    'hair-messy-brown',
    'hair-pony-blonde',
    'hair-afro-dark',
    'hair-bob-red',
    'hair-spiky-blonde',
    'hair-double-bun',
    'hair-braids-brown',
    'hair-wavy-brown',
    'hair-slick-black',
    'face-hair-curly',
    'face-hair-pigtails',
    'face-hair-shaggy',
    'face-glasses-round',
  ];

  /** Firehouse roleplay dock — sharp handheld tools (not space station junk). */
  const ROLEPLAY_DOCK_FIRE = [
    'fire-hose',
    'fire-hydrant',
    'fire-ladder',
    'fire-axe',
    'fire-helmet',
    'fire-extinguisher',
    'fire-alarm-bell',
    'fire-flashlight',
    'fire-gloves',
    'fire-walkie-talkie',
    'fire-safety-cone',
    'fire-blanket',
    'fire-mask',
    'fire-megaphone',
    'fire-water-bucket',
    'fire-first-aid-kit',
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
  const ROLEPLAY_DOCK_TRAMPOLINE = [
    'gym-mat',
    'sports-cone',
    'soccer-ball',
    'basketball',
    'playground-ball',
    'water-bottle',
    'whistle',
    'jump-rope',
    'stopwatch',
    'dumbbell',
    'sport-frisbee',
    'sport-skateboard',
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
    const firehouse = !feelings && !face && !dental && !hospital && !trampoline && !playground && (
      /fire-truck|fire-station|fire-hydrant|fire-hose/.test(heroKey)
      || /\b(fire\s*stations?|firehouses?|firefighters?|firemen|fireman|fire\s*trucks?|fire\s*engines?|fire\s*safety)\b/.test(blob)
      || (kit && (kit.pack === 'fire-station' || kit.pack === 'fire'))
    );
    // Camping after firehouse — tent hero / camp cues / camping pack (not outdoor scrap).
    const camping = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && (
      heroKey === 'tent'
      || /\b(campsites?|camping|campfire|tents?)\b/.test(blob)
      || (kit && kit.pack === 'camping')
    );
    // Bathroom after dental+camping — wash cues / bathtub hero / bathroom pack.
    // Dental already gated above so toothbrush lessons keep the open-mouth dock.
    const bathroom = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && !camping && (
      /bath-bathtub|bath-sink/.test(heroKey)
      || /\b(bathrooms?|bathtub|bath\b|shower|wash\s*up|toiletries|routines?)\b/.test(blob)
      || (kit && kit.pack === 'bathroom')
    );
    // Cafe / farm after place stages — counter/barn heroes + pack cues.
    const cafe = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && !camping && !bathroom && (
      /cafe-counter-stage|cafe-counter/.test(heroKey)
      || /\b(cafes?|caf[eé]s?|coffee\s*shops?|bakerys?|bake\s*shops?|restaurants?|diners?)\b/.test(blob)
      || (kit && kit.pack === 'cafe')
    );
    const farm = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && !camping && !bathroom && !cafe && (
      /farm-barn|farm-tractor/.test(heroKey)
      || /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/.test(blob)
      || (kit && kit.pack === 'farm')
    );
    const aquarium = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && !camping && !bathroom && !cafe && !farm && (
      /aquarium-tank|aq-tank/.test(heroKey)
      || /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/.test(blob)
      || (kit && kit.pack === 'aquarium')
    );
    const construction = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && !camping && !bathroom && !cafe && !farm && !aquarium && (
      /construction-tower-crane|construction-excavator/.test(heroKey)
      || /\b(construction|building\s*sites?|hard\s*hats?|excavators?|cranes?)\b/.test(blob)
      || (kit && kit.pack === 'construction')
    );
    // Dollhouse after construction — cutaway hero / furniture cues / dollhouse pack.
    const dollhouse = !feelings && !face && !dental && !hospital && !trampoline && !playground && !firehouse && !camping && !bathroom && !cafe && !farm && !aquarium && !construction && (
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
    else if (dental) prefer = ROLEPLAY_DOCK_DENTAL;
    else if (hospital) { prefer = ROLEPLAY_DOCK_HOSPITAL; targetCount = prefer.length; }
    else if (trampoline) prefer = ROLEPLAY_DOCK_TRAMPOLINE;
    else if (playground) prefer = ROLEPLAY_DOCK_PLAYGROUND;
    else if (firehouse) prefer = ROLEPLAY_DOCK_FIRE;
    else if (camping) prefer = ROLEPLAY_DOCK_CAMP;
    else if (bathroom) prefer = ROLEPLAY_DOCK_BATH;
    else if (cafe) prefer = ROLEPLAY_DOCK_CAFE;
    else if (farm) prefer = ROLEPLAY_DOCK_FARM;
    else if (aquarium) prefer = ROLEPLAY_DOCK_AQUARIUM;
    else if (construction) prefer = ROLEPLAY_DOCK_CONSTRUCTION;
    else if (dollhouse) { prefer = ROLEPLAY_DOCK_DOLLHOUSE; targetCount = prefer.length; }
    else if (kit && kit.pack === 'castle') prefer = ROLEPLAY_DOCK_CASTLE;
    else if (kit && kit.pack === 'space') prefer = ROLEPLAY_DOCK_SPACE;
    else if (kit && kit.pack === 'music') prefer = ROLEPLAY_DOCK_MUSIC;

    if (prefer) {
      for (const key of prefer) {
        if (out.length >= targetCount) break;
        if (exclude.includes(key)) continue;
        const p = PB.resolve({ word: key, seed, family, exclude });
        if (!p || !sharp(p)) continue;
        if ((face || feelings) && p.aspect && (p.aspect < 0.45 || p.aspect > 3.0)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_CASTLE && p.aspect && (p.aspect < 0.35 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_SPACE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_MUSIC && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_DENTAL && p.aspect && (p.aspect < 0.3 || p.aspect > 2.6)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_TRAMPOLINE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && !feelings && prefer === ROLEPLAY_DOCK_PLAYGROUND && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
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
      && !(cafe && kit.pack !== 'cafe')
      && !(farm && kit.pack !== 'farm')
      && !(aquarium && kit.pack !== 'aquarium')
      && !(construction && kit.pack !== 'construction')
      && !(hospital && kit.pack !== 'hospital')
      && !(dollhouse && kit.pack !== 'dollhouse')) {
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
        if (!word || !packPath) return p;
        return Object.assign({}, p, { path: packPath, aspect: 1, feelWord: word });
      });
    }
    return out;
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
    const prop = (ctx && ctx.hero) || findHeroProp(lesson);
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
    // Wide hospital-bed king covers the left instruction card when centred
    // (hospital quality loop) — reserve a left gutter like Feelings Lab.
    const hospitalStage = !!(prop && prop.key === 'hospital-bed');

    if (!skipKing) {
      const king = Object.assign({}, prop, { relativeScale: 1 });
      const flushCrop = stageFitFor(prop) === 'flush';
      const scale = flushCrop ? 1.5 : (feelingsStage ? 0.72 : (hospitalStage ? 0.82 : 0.92));
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
      if ((feelingsStage || hospitalStage) && !flushCrop) {
        const LEFT_GUTTER = feelingsStage ? 520 : 400;
        x = LEFT_GUTTER + Math.round((L.W - LEFT_GUTTER - sized.w) / 2);
        x = Math.max(LEFT_GUTTER, Math.min(L.W - 8 - sized.w, x));
      }
      const y = flushCrop
        ? -Math.round(sized.h * 0.34)
        : Math.max(8, Math.round((stageH - sized.h) / 2));

      L.place(page, {
        locked: false,
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
    }


    // Face kits ship plenty of parts — use two dock rows when the zone is tall enough.
    // Tall-thin roleplay cutouts (musicians ~0.4–0.65) need height ≥ DOCK_MIN/aspect for
    // grabbable width; a 72px cap + 2 rows filters them all out except squat pieces.
    const tools = roleplayDockProps(lesson, prop, 18);
    let dockPlaced = 0;
    if (tools.length && dock) {
      const gap = 6;
      const rowGap = 6;
      // Grab floor = M10 warn (64) — never ship postage-stamp dock toys.
      const DOCK_MIN = 64;
      const needHFor = (t) => Math.ceil(DOCK_MIN / Math.max(0.05, Number(t.aspect) || 1));
      const thinCount = tools.filter((t) => (Number(t.aspect) || 1) < 0.7).length;
      const maxNeedH = tools.reduce((m, t) => Math.max(m, needHFor(t)), DOCK_MIN);
      let rows = 1;
      if (dock.h >= 120 && tools.length > 10 && thinCount < tools.length * 0.5) {
        const rowH2 = Math.floor((dock.h - rowGap - 4) / 2);
        // Only use 2 rows when every tool can still hit DOCK_MIN width at that rowH.
        if (rowH2 >= maxNeedH) rows = 2;
      } else if (dock.h >= 120 && tools.length > 10) {
        // Mostly tall-thin: pick the largest row count that still satisfies needH.
        for (let tryRows = 2; tryRows >= 1; tryRows--) {
          const tryH = Math.floor((dock.h - rowGap * (tryRows - 1) - 4) / tryRows);
          if (tryH >= maxNeedH || tryRows === 1) {
            rows = tryRows;
            break;
          }
        }
      }
      const cols = Math.ceil(tools.length / rows);
      const rowH = Math.floor((dock.h - rowGap * (rows - 1) - 4) / rows);
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
          const grabH = aspect >= 1 ? DOCK_MIN : Math.ceil(DOCK_MIN / aspect);
          const pieceMaxH = Math.min(Math.max(grabH, DOCK_MIN), Math.max(rowH, grabH));
          const s = PB.sizeFor(dockProp, {
            maxH: pieceMaxH,
            maxW: Math.max(DOCK_MIN, dock.w),
            hardCap: pieceMaxH,
          });
          return { t, w: s.w, h: s.h };
        }).filter((x) => Math.min(x.w, x.h) >= DOCK_MIN && x.w <= dock.w);
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
        // Feelings faces are square stickers; a single uncrowded row defaulted to
        // the 64px grab-floor and looked lost in the 1248px dock. Grow them to
        // fill the dock height (capped so the whole row still fits width) so the
        // drag targets read as the point of the page (Manus S54).
        if (feelingsStage && sized.length) {
          const gapsW = gap * Math.max(0, sized.length - 1);
          const rawW = sized.reduce((s, x) => s + x.w, 0);
          const maxPieceH0 = sized.reduce((m, x) => Math.max(m, x.h), 0);
          const widthScale = rawW > 0 ? (dock.w - gapsW) / rawW : 1;
          const heightScale = maxPieceH0 > 0 ? rowH / maxPieceH0 : 1;
          const grow = Math.min(widthScale, heightScale);
          if (grow > 1.02) {
            sized = sized.map((x) => ({
              t: x.t,
              w: Math.round(x.w * grow),
              h: Math.round(x.h * grow),
            })).filter((x) => x.w <= dock.w);
          }
        }
        sizedPerRow.push(sized.length);
        const usedW = sized.reduce((s, x) => s + x.w, 0) + gap * Math.max(0, sized.length - 1);
        let originX = dock.x + Math.max(0, Math.floor((dock.w - usedW) / 2));
        const maxPieceH = sized.reduce((m, x) => Math.max(m, x.h), 0);
        const rowTop = dock.y + r * (rowH + rowGap);
        const originY = rowTop + Math.max(0, Math.floor((rowH - maxPieceH) / 2));
        const dockRight = dock.x + dock.w;
        sized.forEach(({ t, w, h }) => {
          // Never clamp sideways into a neighbor — that is how H3 IoU fires when
          // grab-floor pieces no longer fit the row. Drop the overflow instead.
          if (originX + w > dockRight + 0.5) return;
          const x = originX;
          const y = Math.max(dock.y, Math.min(dock.y + dock.h - h, originY));
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
              ? { propKey: t.key, propAspect: t.aspect, word: t.feelWord }
              : { propKey: t.key, propAspect: t.aspect },
          });
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

  const RECIPES = {
    matchDock,
    orderLine,
    hideSeek,
    revealReward,
    buildScene,
    dressUp,
    coverAnswer,
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
    const rngSeed = hashStr((lesson.title || '') + '|' + (meta?.level || '') + '|' + (meta?.duration || ''));

    // Same-topic coverage adapt: put picture-able words in the board six before
    // recipe pick / readiness. Never drifts the lesson theme.
    let vocabAdapt = null;
    if (window.VocabArt && typeof window.VocabArt.adaptBoardVocabulary === 'function') {
      try {
        vocabAdapt = window.VocabArt.adaptBoardVocabulary(lesson, {
          seed: (lesson && lesson.title) || '',
        });
      } catch (_) {
        vocabAdapt = null;
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
    const honestMatch = vocabArt.matchable.length > 0 && canHonestMatchDock(vocabArt.matchable.length);
    if (honestMatch) {
      assignments.push({
        pageKey: 'newWords',
        recipeId: 'matchDock',
        ctx: { vocabArt },
      });
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

    // Activity — curated stage (feelings/face/dental) or pack kit → king stage.
    // Always resolve via findHeroProp so "Round 1" cannot keep a false-ready
    // castle kit ahead of face-blank (S43).
    if (hasVocab) {
      let hero = findHeroProp(lesson);
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
      } else if (honestMatch) {
        // No king stage — do NOT re-run matchDock on the activity layout (vocab
        // zones are missing → templates + a lonely bottom icon row). sortBins
        // uses activity targetBay + dock and keeps the taught words as cards.
        assignments.push({
          pageKey: 'activity',
          recipeId: 'sortBins',
        });
      } else {
        // No hero + no honest match dock — prefer sortBins (taught words as
        // cards) over dressUp/buildScene that need a prop kit we don't have.
        assignments.push({
          pageKey: 'activity',
          recipeId: 'sortBins',
        });
      }
    }

    const planOut = {
      assignments,
      seed: rngSeed,
      kit: kit && kit.ready ? { pack: kit.pack, hero: kit.hero.key, docks: kit.dockCount } : null,
      vocabArt,
      vocabAdapt: vocabAdapt || null,
      canHonestMatchDock: honestMatch,
      matchDockHint: honestMatch ? matchDockStudentHint(vocabArt) : null,
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
   * sortBins) — stacking dressing on top is what made volcano page 13 a
   * prop pile-up. Also skip when no prop clears a real theme score: never
   * wallpaper a volcano with living-room remotes because the title said
   * "Living…".
   */
  function dressScenes(boardPlan, lesson) {
    const PB = window.PropBank;
    const L = window.EdbLayout;
    const req = PB && PB.requestFor('sceneDressing');
    if (!PB || !L || !req || !boardPlan || !boardPlan.pages || !boardPlan.bgPicks) return;

    const RECIPE_OWNS_ART = { buildScene: 1, dressUp: 1, sortBins: 1, heroProp: 1 };
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
    if (pageKey === 'story0' || pageKey === 'story1') return 'story';
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
    addPage('vocabSentences', 'vocabSentences');
    addPage('frames', 'frames');

    const storyCount = storyPageCount(lesson, meta);
    for (let i = 0; i < storyCount; i++) addPage('story' + i, 'story');

    addPage('comprehension', 'comprehension');
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
    speakingChunks,
    findHeroProp,
    MAX_STORY_PAGES,
    storyPageCount,
    storyPagesForBoard,
    includeCreative,
    includePhonics,
    wantsPhonics,
    normalizePhonics,
    canHonestMatchDock,
    boardVocabCount,
    matchDockSize,
    matchDockIsPartial,
    matchDockStudentHint,
    solidPng,
    slotGhostPng,
    stickyPng,
  };
})();
