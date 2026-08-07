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
    const n = Math.max(1, count || 1);
    const zones = (window.EdbLayout && window.EdbLayout.ZONE_TEMPLATES
      && window.EdbLayout.ZONE_TEMPLATES.vocab) || {};
    const dock = zones.dock || { w: 450, h: 250 };
    const dockW = dock.w || 450;
    const dockH = dock.h || 250;
    const gap = 14; // keep in step with EdbLayout.MIN_GAP / placeDockRow
    // Prefer a clean 2×3 or 3×2 grid inside the right-column dock
    let cols = n <= 4 ? 2 : 3;
    let rows = Math.ceil(n / cols);
    let side = Math.min(
      Math.floor((dockW - gap * (cols - 1)) / cols),
      Math.floor((dockH - gap * (rows - 1)) / rows)
    );
    // Cap so dock icons stay peer-sized with word cards (96px honest floor).
    side = Math.min(side, 96);
    if (side >= 96) return { w: side, h: side, cols, rows };
    // Try one row across the dock
    cols = n;
    rows = 1;
    side = Math.floor((dockW - gap * (n - 1)) / n);
    if (side >= 96 && side <= dockH) return { w: side, h: side, cols, rows };
    return null;
  }

  function canHonestMatchDock(lesson) {
    return !!matchDockSize(vocabList(lesson).length);
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

  function matchDock(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const vocab = vocabList(lesson);
    if (!vocab.length) return;
    const size = matchDockSize(vocab.length);
    if (!size) return; // caller should fall back to icons-on-cards
    // Caption chips under icons (Manus B2) — pieceToPng composites word label.
    const chipH = 22;
    L.placeDockRow(page, vocab.map((v) => ({
      kind: 'emoji',
      emoji: (window.VocabIcons && window.VocabIcons.emojiFor)
        ? window.VocabIcons.emojiFor(v.word, v.emoji)
        : (v.emoji || '•'),
      role: 'matchPiece',
      label: v.word,
      meta: { word: v.word, captionChip: true },
    })), { w: size.w, h: size.h + chipH, cols: size.cols, noShrink: true });
    page.notes.push('recipe:matchDock');
    page.notes.push('recipe:matchDockCaptions');
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
    L.placeDockRow(page, props.map((v) => ({
      kind: 'emoji',
      emoji: v.emoji || '•',
      text: v.word,
      role: 'dressPart',
      meta: { word: v.word },
    })), { w: 96, h: 96, noShrink: true });
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
    const bins = ['A', 'B'];
    const binW = Math.floor((bay.w - 40) / 2);
    const binH = Math.min(180, bay.h - 20);
    const PB = window.PropBank;
    const req = PB && PB.requestFor('sortBins');
    const family = req ? PB.familyFor(lesson) : null;
    const exclude = [];
    bins.forEach((label, i) => {
      const cellX = bay.x + 10 + i * (binW + 20);
      const cellY = bay.y + 10;
      // Two DIFFERENT bins or none: excluding bin A's prop is what makes the
      // second miss visible instead of drawing the same bin twice.
      const prop = req
        ? PB.resolve({
            role: req.role,
            seed: lesson.title || '',
            index: i,
            exclude: req.distinct ? exclude : [],
            family,
          })
        : null;
      let asset = solidPng(binW, binH, i === 0 ? '#dbeafe' : '#dcfce7', 'Bin ' + label, '#1e293b');
      let w = binW;
      let h = binH;
      let x = cellX;
      let y = cellY;
      const meta = { bin: label };
      if (prop) {
        // fit:'contain' — size from aspect inside the cell; letterbox is structural.
        const sized = PB.sizeFor(prop, { maxH: binH, maxW: binW });
        w = sized.w;
        h = sized.h;
        x = cellX + Math.round((binW - w) / 2);
        y = cellY + Math.round((binH - h) / 2);
        asset = prop.path;
        exclude.push(prop.key);
        meta.propKey = prop.key;
        meta.propAspect = prop.aspect;
      }
      L.place(page, {
        locked: true,
        kind: 'image',
        asset,
        w, h,
        intentional: true,
        anchor: { x, y, w, h },
        role: 'sortBin',
        meta,
      });
    });
    const cards = vocabList(lesson).slice(0, 6);
    if (!cards.length) return;
    // Keep dock cards big enough to tap (M10). Shrinking six 140px tiles into one
    // row drops below ~40px — use noShrink + fewer cards if needed.
    const dock = L.zoneRect(page, 'dock');
    const gap = 14;
    let cardW = 140;
    let cardH = 72;
    let fit = cards;
    if (dock && dock.w) {
      const maxN = Math.max(2, Math.floor((dock.w + gap) / (96 + gap)));
      if (fit.length > maxN) fit = fit.slice(0, maxN);
      cardW = Math.max(96, Math.min(140, Math.floor((dock.w - gap * Math.max(0, fit.length - 1)) / fit.length)));
      cardH = Math.max(56, Math.min(72, cardW));
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

    // Pack kits first — banking a pack with a hero is enough (castle, jobs…).
    const kit = PB.assessKit && PB.assessKit(lesson);
    if (kit && kit.ready && kit.hero && isHeroSized(kit.hero)) return kit.hero;

    // Curated stage surfaces for kits that predate pack tags (face / dental).
    const STAGE_RULES = [
      { re: /\bface\b|\bhair\b|\beyes?\b|\bnose\b|\bear\b|make.?a.?face|blank.?face/, key: 'face-blank' },
      { re: /dentist|dental|tooth|teeth|clinic|patient|brush|floss|cavity/, key: 'dental-kid-open-mouth' },
      { re: /trampolin|bounce|backflip/, key: 'trampoline' },
      { re: /castle|medieval|knight|drawbridge|portcullis|royal/, key: 'castle-wall-gate' },
    ];
    for (const rule of STAGE_RULES) {
      if (rule.re.test(blob)) {
        const hit = PB.resolve({ word: rule.key, seed, family });
        if (isHeroSized(hit)) return hit;
      }
    }

    for (const t of tags) {
      const hit = PB.resolve({ word: t, seed, family });
      if (isHeroSized(hit)) return hit;
    }
    const scored = PB.resolve({
      tags,
      roles: ['hero', 'playPart'],
      minScore: 5,
      seed,
      family,
    });
    return isHeroSized(scored) ? scored : null;
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

  function roleplayDockProps(lesson, hero, count) {
    const PB = window.PropBank;
    if (!PB || !PB.loaded()) return [];
    const family = PB.familyFor(lesson);
    const seed = ((lesson && lesson.title) || '') + '|roleplay';
    const tags = heroThemeTags(lesson);
    const blob = tags.join(' ') + ' ' + ((hero && hero.key) || '');
    const kit = PB.assessKit && PB.assessKit(lesson);
    const sharp = PB.isDockSharp || (() => true);
    // Hero key wins — vocab like "smile" must not steal a dental stage into a face dock.
    const heroKey = (hero && hero.key) || '';
    const face = heroKey === 'face-blank'
      || /face-blank|make.?a.?face/.test(blob)
      || (/\b(face|faces|hair|eyes|nose|ear|ears)\b/.test(blob)
        && !/dentist|dental|tooth|teeth|clinic|floss|cavity|brush/.test(blob));
    const dental = !face && (
      /dental|dentist/.test(heroKey)
      || /dentist|dental|tooth|teeth|clinic|floss|cavity|brush/.test(blob)
    );
    const trampoline = !face && !dental && (
      heroKey === 'trampoline'
      || /trampolin|bounce|backflip/.test(blob)
    );
    const out = [];
    const exclude = [hero && hero.key].filter(Boolean);

    // 1) Curated docks for face / dental / trampoline / castle / space
    let prefer = null;
    if (face) prefer = ROLEPLAY_DOCK_FACE;
    else if (dental) prefer = ROLEPLAY_DOCK_DENTAL;
    else if (trampoline) prefer = ROLEPLAY_DOCK_TRAMPOLINE;
    else if (kit && kit.pack === 'castle') prefer = ROLEPLAY_DOCK_CASTLE;
    else if (kit && kit.pack === 'space') prefer = ROLEPLAY_DOCK_SPACE;
    else if (kit && kit.pack === 'music') prefer = ROLEPLAY_DOCK_MUSIC;

    if (prefer) {
      for (const key of prefer) {
        if (out.length >= count) break;
        if (exclude.includes(key)) continue;
        const p = PB.resolve({ word: key, seed, family, exclude });
        if (!p || !sharp(p)) continue;
        if (face && p.aspect && (p.aspect < 0.45 || p.aspect > 3.0)) continue;
        if (!face && prefer === ROLEPLAY_DOCK_CASTLE && p.aspect && (p.aspect < 0.35 || p.aspect > 3.5)) continue;
        if (!face && prefer === ROLEPLAY_DOCK_SPACE && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && prefer === ROLEPLAY_DOCK_MUSIC && p.aspect && (p.aspect < 0.3 || p.aspect > 3.5)) continue;
        if (!face && prefer === ROLEPLAY_DOCK_DENTAL && p.aspect && (p.aspect < 0.3 || p.aspect > 2.6)) continue;
        exclude.push(p.key);
        out.push(p);
      }
    }

    // 2) Universal pack dock — rest of the matched kit (already sharp-filtered)
    if (kit && kit.docks && kit.docks.length) {
      for (const p of kit.docks) {
        if (out.length >= count) break;
        if (exclude.includes(p.key)) continue;
        if (!sharp(p)) continue;
        if (p.aspect && (p.aspect < 0.3 || p.aspect > 4)) continue;
        exclude.push(p.key);
        out.push(p);
      }
    }

    while (out.length < count) {
      const p = PB.resolve({
        tags,
        roles: ['object', 'tool'],
        minScore: 3,
        seed,
        index: out.length,
        exclude,
        family,
      });
      if (!p) break;
      exclude.push(p.key);
      if (!sharp(p)) continue;
      out.push(p);
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

    if (!skipKing) {
      const king = Object.assign({}, prop, { relativeScale: 1 });
      const flushCrop = stageFitFor(prop) === 'flush';
      const scale = flushCrop ? 1.5 : 0.92;
      const sized = PB.sizeFor(king, {
        maxH: Math.round(stageH * scale),
        maxW: Math.min(L.W - 8, Math.round(stageH * scale * (prop.aspect || 1))),
        hardCap: Math.round(stageH * scale),
      });
      const x = Math.round((L.W - sized.w) / 2);
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
            meta: { propKey: t.key, propAspect: t.aspect },
          });
          originX = x + w + gap;
        });
      }
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

    const tiles = focus.graphemes.map((g) => ({
      kind: 'tile',
      text: g,
      role: 'letterTile',
      meta: { grapheme: g, target: focus.word },
    }));
    data.distractors.forEach((d) => {
      tiles.push({
        kind: 'tile',
        text: d,
        role: 'letterTile',
        meta: { grapheme: d, distractor: true },
      });
    });

    const shuffled = pick(tiles, tiles.length, hashStr((lesson.title || '') + '|phonics'));
    const maxLen = Math.max(1, ...shuffled.map((t) => String(t.text || '').length));
    // Child touch targets — keep tiles large (esp. A1/A2).
    const tileW = Math.max(72, maxLen > 1 ? 88 : 72);
    L.placeDockRow(page, shuffled, { w: tileW, h: 72, noShrink: true });
    page.notes.push('recipe:phonicsSoundBoxes');
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
    const seed = hashStr((lesson.title || '') + '|' + (meta?.level || '') + '|' + (meta?.duration || ''));
    const pickBit = (n) => ((seed >>> n) & 1) === 1;
    const vocab = vocabList(lesson);
    const hasVocab = vocab.length > 0;
    const assignments = [];
    const kit = window.PropBank && window.PropBank.assessKit && window.PropBank.assessKit(lesson);

    // New Words — honest dock only (≥96px); else chrome shows icons-on-cards
    if (hasVocab && canHonestMatchDock(lesson)) {
      assignments.push({ pageKey: 'newWords', recipeId: 'matchDock' });
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

    // Activity — pack kit or curated hero forces king stage; never bit-pick
    // dressUp when a ready kit exists (that was the "fast but empty" failure).
    if (hasVocab) {
      const hero = (kit && kit.ready && kit.hero) || findHeroProp(lesson);
      if (hero) {
        assignments.push({
          pageKey: 'activity',
          recipeId: 'heroProp',
          ctx: { hero, kit: kit && kit.ready ? kit : null },
        });
      } else {
        assignments.push({
          pageKey: 'activity',
          recipeId: pickBit(5) ? 'dressUp' : (pickBit(6) ? 'sortBins' : 'buildScene'),
        });
      }
    }

    const planOut = { assignments, seed, kit: kit && kit.ready ? { pack: kit.pack, hero: kit.hero.key, docks: kit.dockCount } : null };
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
        // Tags only + hard minScore. Passing roles here used to ignore a failed
        // theme score and dump any furniture via the roles bucket.
        const prop = PB.resolve({
          tags: themeTags,
          seed,
          index: n,
          exclude: req.distinct ? exclude : [],
          family,
          minScore: 3,
        });
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

    return {
      pages,
      indexByKey,
      assignments: boardPlan.assignments,
      seed: boardPlan.seed,
      kit: boardPlan.kit || null,
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
    matchDockSize,
    solidPng,
    slotGhostPng,
    stickyPng,
  };
})();
