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

  function vocabList(lesson) {
    return (lesson.vocabulary || []).filter((v) => v && (v.word || v.emoji)).slice(0, 6);
  }

  function reviewWords(lesson) {
    const sentence = (lesson.reviewSentences || [])[0] || '';
    return sentence.replace(/[.!?]$/, '').split(/\s+/).filter(Boolean).slice(0, 5);
  }

  /** Must match speaking.targetBay in edbLayout ZONE_TEMPLATES. */
  function speakingCoverRect() {
    return { x: 88, y: 218, w: 720, h: 72 };
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

  /** Speaking spine: up to 2 Qs per page, max 2 pages (4 Qs). Mirrors LessonPages. */
  function speakingChunks(lesson) {
    const qs = (lesson.speakingQuestions || []).slice(0, 4);
    if (!qs.length) return [];
    const pages = [];
    for (let i = 0; i < qs.length; i += 2) pages.push(qs.slice(i, i + 2));
    return pages;
  }

  function storyPageCount(lesson) {
    const n = (lesson.story?.pages || []).length;
    if (n <= 0) return 1;
    return Math.min(2, n);
  }

  function includeCreative(lesson, meta) {
    const qs = lesson.story?.creativeQuestions || [];
    if (!qs.length) return false;
    const dur = Number(meta?.duration);
    if (Number.isFinite(dur) && dur <= 25) return false;
    return true;
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
    return solidPng(w, h, '#fef08a', 'Peek?', '#854d0e');
  }

  // ── Recipes ─────────────────────────────────────────────────────

  function matchDock(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const vocab = vocabList(lesson);
    if (!vocab.length) return;
    // Pack icons resolved at export via VocabIcons + meta.word (no mixed SVG styles)
    L.placeDockRow(page, vocab.map((v) => ({
      kind: 'emoji',
      emoji: (window.VocabIcons && window.VocabIcons.emojiFor)
        ? window.VocabIcons.emojiFor(v.word, v.emoji)
        : (v.emoji || '•'),
      role: 'matchPiece',
      meta: { word: v.word },
    })), { w: 96, h: 96 });
    page.notes.push('recipe:matchDock');
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

  function buildScene(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const parts = vocabList(lesson).slice(0, 4);
    if (!parts.length) return;
    const slotW = 100;
    const slotH = 100;
    parts.forEach((_, i) => {
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
    L.placeDockRow(page, parts.map((v) => ({
      kind: 'emoji',
      emoji: v.emoji || '•',
      role: 'buildPart',
      meta: { word: v.word },
    })), { w: 96, h: 96 });
    page.notes.push('recipe:buildScene');
  }

  function dressUp(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const props = vocabList(lesson).slice(0, 4);
    if (!props.length) return;
    const art = L.zoneRect(page, 'artSafe');
    const body = CHAR_PATHS[hashStr(lesson.title) % CHAR_PATHS.length];
    L.place(page, {
      locked: true,
      kind: 'image',
      asset: body,
      w: 180, h: 220,
      intentional: true,
      anchor: { x: art.x + 20, y: art.y + 20, w: 180, h: 220 },
      role: 'dressBody',
    });
    L.placeDockRow(page, props.map((v) => ({
      kind: 'emoji',
      emoji: v.emoji || '•',
      text: v.word,
      role: 'dressPart',
      meta: { word: v.word },
    })), { w: 96, h: 96 });
    page.notes.push('recipe:dressUp');
  }

  function coverAnswer(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const q = ctx?.speakingItem;
    if (!q) return;
    // Sticky covers targetBay — painted sample band uses the same rect
    const coverRect = L.zoneRect(page, 'targetBay') || speakingCoverRect();
    L.place(page, {
      locked: false,
      kind: 'image',
      asset: stickyPng(coverRect.w, coverRect.h),
      w: coverRect.w, h: coverRect.h,
      intentional: true,
      anchor: coverRect,
      role: 'answerCover',
      meta: { sample: q.sampleAnswer },
    });
    page.notes.push('recipe:coverAnswer');
  }

  function sortBins(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const bay = L.zoneRect(page, 'targetBay') || L.zoneRect(page, 'artSafe');
    const bins = ['A', 'B'];
    const binW = Math.floor((bay.w - 40) / 2);
    const binH = Math.min(180, bay.h - 20);
    bins.forEach((label, i) => {
      const x = bay.x + 10 + i * (binW + 20);
      const y = bay.y + 10;
      L.place(page, {
        locked: true,
        kind: 'image',
        asset: solidPng(binW, binH, i === 0 ? '#dbeafe' : '#dcfce7', 'Bin ' + label, '#1e293b'),
        w: binW, h: binH,
        intentional: true,
        anchor: { x, y, w: binW, h: binH },
        role: 'sortBin',
        meta: { bin: label },
      });
    });
    const cards = vocabList(lesson).slice(0, 6);
    if (!cards.length) return;
    L.placeDockRow(page, cards.map((v) => ({
      kind: 'tile',
      text: v.word,
      emoji: v.emoji,
      role: 'sortCard',
      meta: { word: v.word },
    })), { w: 140, h: 52 });
    page.notes.push('recipe:sortBins');
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
  };

  /**
   * Plan activities across the lesson spine.
   * Returns { assignments: [{ pageKey, recipeId, ctx? }], seed }
   * Skips recipes when required content is empty (no empty docks).
   * Simple mode: vocab matchDock only; no story recipes; no wrap orderLine/reward;
   * one Peek sticky on the first speaking page.
   */
  function plan(lesson, meta) {
    const seed = hashStr((lesson.title || '') + '|' + (meta?.level || '') + '|' + (meta?.duration || ''));
    const pickBit = (n) => ((seed >>> n) & 1) === 1;
    const vocab = vocabList(lesson);
    const hasVocab = vocab.length > 0;
    const assignments = [];

    // New Words — dock pieces only (hideSeek fights chrome; revisit later)
    if (hasVocab) {
      assignments.push({ pageKey: 'newWords', recipeId: 'matchDock' });
    }

    // Speaking — one Peek sticky over the first sample on speaking:0
    const chunks = speakingChunks(lesson);
    if (chunks[0] && chunks[0][0]) {
      assignments.push({
        pageKey: 'speaking:0',
        recipeId: 'coverAnswer',
        ctx: { speakingItem: chunks[0][0], speakingIndex: 0 },
      });
    }

    // Activity section
    if (hasVocab) {
      assignments.push({
        pageKey: 'activity',
        recipeId: pickBit(5) ? 'dressUp' : (pickBit(6) ? 'sortBins' : 'buildScene'),
      });
    }

    // Wrap is chrome-only for now (orderLine/reward mismatched review blanks)

    return {
      assignments: capAssignments(assignments, 5),
      seed,
      recipes: Object.keys(RECIPES),
    };
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

  function pageTypeForKey(pageKey) {
    if (pageKey === 'newWords') return 'vocab';
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
    const boardPlan = plan(lesson, meta);
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
    addPage('vocabSentences', 'vocabSentences');
    addPage('frames', 'frames');

    const storyCount = storyPageCount(lesson);
    for (let i = 0; i < storyCount; i++) addPage('story' + i, 'story');

    addPage('comprehension', 'comprehension');
    if (includeCreative(lesson, meta)) addPage('creative', 'creative');

    speakingChunks(lesson).forEach((_, i) => addPage('speaking:' + i, 'speaking'));

    addPage('activity', 'activity');
    addPage('wrap', 'wrap');

    return {
      pages,
      indexByKey,
      assignments: boardPlan.assignments,
      seed: boardPlan.seed,
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
    buildBoardPlan,
    pageTypeForKey,
    speakingCoverRect,
    speakingChunks,
    storyPageCount,
    includeCreative,
    solidPng,
    slotGhostPng,
    stickyPng,
  };
})();
