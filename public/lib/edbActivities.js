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
   * Normalize Gemini phonics payload. Returns null when unusable.
   * Enforces: 2–3 words, 3–5 graphemes each, ≤14 dock tiles with distractors.
   */
  function normalizePhonics(lesson) {
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
    let distractors = (raw.distractors || raw.distractor_letters || [])
      .map((d) => String(d || '').trim().toLowerCase())
      .filter((d) => d && d.length <= 2 && !used.has(d));
    distractors = [...new Set(distractors)].slice(0, 6);

    const script = raw.teacherScript || raw.teacher_script || {};
    // Focus word first; dock = its graphemes + ≤4 distractors (≤10 tiles total)
    const focusCount = words[0].graphemes.length;
    const maxDist = Math.max(0, Math.min(4, 10 - focusCount));
    distractors = distractors.slice(0, maxDist);

    return {
      targetWords: words,
      distractors,
      focusIndex: 0,
      teacherScript: {
        warmup: script.warmup || 'Say the word slowly. How many sounds do you hear?',
        modeling: script.modeling || 'Watch me drag each sound into a box.',
        check: script.check || 'Can you point to a box with two letters?',
      },
    };
  }

  function includePhonics(lesson, meta) {
    return wantsPhonics(lesson, meta) && !!normalizePhonics(lesson);
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
    L.placeDockRow(page, vocab.map((v) => ({
      kind: 'emoji',
      emoji: (window.VocabIcons && window.VocabIcons.emojiFor)
        ? window.VocabIcons.emojiFor(v.word, v.emoji)
        : (v.emoji || '•'),
      role: 'matchPiece',
      meta: { word: v.word },
    })), { w: size.w, h: size.h, cols: size.cols, noShrink: true });
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
    L.placeDockRow(page, cards.map((v) => ({
      kind: 'tile',
      text: v.word,
      emoji: v.emoji,
      role: 'sortCard',
      meta: { word: v.word },
    })), { w: 140, h: 52 });
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
   * Exact word/key match first (trampoline), then a strong tag score on
   * hero / large playPart roles. Returns null when the lesson has no hero.
   */
  function findHeroProp(lesson) {
    const PB = window.PropBank;
    if (!PB || !PB.loaded()) return null;
    const family = PB.familyFor(lesson);
    const seed = (lesson && lesson.title) || '';
    const tags = heroThemeTags(lesson);
    const isHeroSized = (p) =>
      !!(p && (p.role === 'hero' || ((p.relativeScale == null ? 0 : p.relativeScale) >= 0.75)));

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

  /** One big groundable prop + a short vocab dock — the interactive focus page. */
  function heroProp(lesson, page, layout, ctx) {
    const L = layout || window.EdbLayout;
    const PB = window.PropBank;
    const prop = (ctx && ctx.hero) || findHeroProp(lesson);
    if (!prop || !PB) return;

    const art = L.zoneRect(page, 'artSafe') || { x: 700, y: 80, w: 520, h: 340 };
    const maxH = Math.min(300, Math.max(160, art.h - 24));
    const sized = PB.sizeFor(prop, { maxH, maxW: Math.min(520, art.w - 16) });
    const x = art.x + Math.max(8, Math.round((art.w - sized.w) / 2));
    const y = art.y + Math.max(8, art.h - sized.h - 12);

    L.place(page, {
      locked: false,
      kind: 'image',
      asset: prop.path,
      w: sized.w,
      h: sized.h,
      intentional: true,
      anchor: { x, y, w: sized.w, h: sized.h },
      role: 'heroPart',
      meta: { propKey: prop.key, propAspect: prop.aspect },
    });

    const vocab = vocabList(lesson).slice(0, 4);
    if (vocab.length) {
      L.placeDockRow(page, vocab.map((v) => ({
        kind: 'emoji',
        emoji: (window.VocabIcons && window.VocabIcons.emojiFor)
          ? window.VocabIcons.emojiFor(v.word, v.emoji)
          : (v.emoji || '•'),
        role: 'dockPiece',
        meta: { word: v.word },
      })), { w: 88, h: 88 });
    }
    page.notes.push('recipe:heroProp');
  }

  /**
   * Sound boxes + letter tiles — one focus word large; remaining words as chips.
   * Dock: focus graphemes + ≤4 distractors (≤10 tiles, ≥64px).
   */
  function phonicsSoundBoxes(lesson, page, layout) {
    const L = layout || window.EdbLayout;
    const data = normalizePhonics(lesson);
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
    const tileW = Math.max(64, maxLen > 1 ? 80 : 64);
    L.placeDockRow(page, shuffled, { w: tileW, h: 64, noShrink: true });
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

    // New Words — honest dock only (≥96px); else chrome shows icons-on-cards
    if (hasVocab && canHonestMatchDock(lesson)) {
      assignments.push({ pageKey: 'newWords', recipeId: 'matchDock' });
    }

    // Phonics — sound boxes + letter tiles when schema + gate allow
    if (includePhonics(lesson, meta)) {
      assignments.push({ pageKey: 'phonics', recipeId: 'phonicsSoundBoxes' });
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

    // Activity section — hero prop wins when the topic earns a big interactive piece
    if (hasVocab) {
      const hero = findHeroProp(lesson);
      if (hero) {
        assignments.push({
          pageKey: 'activity',
          recipeId: 'heroProp',
          ctx: { hero },
        });
      } else {
        assignments.push({
          pageKey: 'activity',
          recipeId: pickBit(5) ? 'dressUp' : (pickBit(6) ? 'sortBins' : 'buildScene'),
        });
      }
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
    dressScenes,
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
