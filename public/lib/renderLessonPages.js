/* renderLessonPages.js
 * Builds offscreen 1280×590 DOM pages for ClassIn EDB locked backgrounds.
 * Classic script — attaches window.LessonPages
 */
(function () {
  const W = 1280;
  const H = 590;

  /** Set for the duration of render() so header chips can scale to lesson length. */
  let _renderMeta = {};

  /**
   * Teacher timing chips assumed a ~55–60 min deck. Scale for 30-min lessons so
   * chip sum ≈ declared duration (Manus MZJk B3) instead of advertising ~50 min
   * on a 30-min title.
   */
  function timingChip(baseMin) {
    const dur = Number(_renderMeta && _renderMeta.duration);
    let n = Math.max(2, Math.round(Number(baseMin) || 3));
    if (Number.isFinite(dur) && dur > 0 && dur <= 30) {
      // Aggressive shrink for short packs (Manus mfLN B4 / MZJk B3) — default
      // chip table assumed ~55–60 min.
      n = Math.max(2, Math.round(n * 0.42));
    } else if (Number.isFinite(dur) && dur > 0 && dur < 50) {
      n = Math.max(2, Math.round(n * (dur / 55)));
    }
    return `~${n} min`;
  }

  const TOK = () => window.BoardDesignTokens || null;
  const tokens = () => (TOK() ? TOK().resolve() : null);

  /** Fallback gradients — prefer BoardDesignTokens.PAGE_FALLBACKS (no purple). */
  const THEME_COLORS = (TOK() && TOK().PAGE_FALLBACKS) || {
    title: ['#0f766e', '#134e4a'],
    warm: ['#f0fdfa', '#ccfbf1'],
    vocab: ['#f8fafc', '#e2e8f0'],
    phonics: ['#fffbeb', '#fde68a'],
    frames: ['#0f172a', '#1e293b'],
    story: ['#f0fdfa', '#ccfbf1'],
    comp: ['#eff6ff', '#bfdbfe'],
    creative: ['#ecfdf5', '#a7f3d0'],
    speak: ['#f0fdf4', '#bbf7d0'],
    activity: ['#ecfeff', '#a5f3fc'],
    wrap: ['#1e293b', '#334155'],
  };

  function el(tag, style, html) {
    const n = document.createElement(tag);
    if (style) Object.assign(n.style, style);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function pageShell(bg, opts) {
    const pageType = (opts && opts.pageType) || '';
    const t = tokens();
    const padX = t ? t.space.page_pad_x : 44;
    const padY = t ? t.space.page_pad_y : 28;
    const ink = t ? t.colors.text_primary : '#0f172a';
    // Solid backgroundColor under hex gradients so bake M6 / getComputedStyle
    // still see a dark wrap bookend (gradientStop only parsed rgba before).
    const p = el('div', {
      width: W + 'px',
      height: H + 'px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Poppins, Inter, system-ui, sans-serif',
      background: Array.isArray(bg)
        ? `linear-gradient(135deg, ${bg[0]}, ${bg[1]})`
        : (bg || (t ? t.colors.page_bg : '#fff')),
      backgroundColor: Array.isArray(bg) ? bg[0] : (bg || (t ? t.colors.page_bg : '#fff')),
      color: ink,
      padding: padY + 'px ' + padX + 'px',
    });
    if (pageType) p.dataset.pageType = pageType;
    if (opts && opts.reserveDock) {
      const pad = window.EdbLayout
        ? window.EdbLayout.dockReservePx(pageType || 'warm')
        : 130;
      p.style.paddingBottom = pad + 'px';
    }
    return p;
  }

  // Brand teal first, then darker teals, then near-black. White is last and
  // only used with a scrim — never alone on a mid-tone pastel.
  const INK_PALETTE = [
    { heading: '#17827C', hint: '#475569', shadow: false },
    { heading: '#0B3B38', hint: '#334155', shadow: false },
    { heading: '#0f172a', hint: '#334155', shadow: false },
    { heading: '#ffffff', hint: 'rgba(255,255,255,0.92)', shadow: true },
  ];
  const INK_WARN = 4.5; // match M6 warn bar in ux-board-rubric.cjs

  function hexRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function relLum({ r, g, b }) {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(a, b) {
    const l1 = relLum(a);
    const l2 = relLum(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  // Same busy threshold the bake uses for M2 — a photographic header band
  // with this much texture needs a scrim even if a dark ink clears 4.5:1.
  const BUSY_STDDEV = 26; // match verify-board-visual.cjs M2 threshold

  /** Mean RGB (+ stddev) of the heading band, drawn with the same
   *  object-fit:cover maths the bake uses for M6. */
  function sampleHeaderBg(bgImg) {
    if (!bgImg || !bgImg.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const nw = bgImg.naturalWidth;
    const nh = bgImg.naturalHeight;
    const scale = Math.max(W / nw, H / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    try {
      ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      // Header sits in the padded top band (~28–110px). Sample that strip.
      const data = ctx.getImageData(44, 28, W - 88, 90).data;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sumGray = 0;
      let sumSq = 0;
      let n = 0;
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        sr += r;
        sg += g;
        sb += b;
        sumGray += gray;
        sumSq += gray * gray;
        n++;
      }
      if (!n) return null;
      const mean = sumGray / n;
      return {
        r: sr / n,
        g: sg / n,
        b: sb / n,
        stddev: Math.sqrt(Math.max(0, sumSq / n - mean * mean)),
      };
    } catch (_) {
      return null;
    }
  }

  function paintInk(pageEl, choice) {
    pageEl.querySelectorAll('[data-ink="heading"]').forEach((n) => {
      n.style.color = choice.heading;
      n.style.textShadow = choice.shadow ? '0 2px 10px rgba(2,6,23,0.55)' : 'none';
    });
    pageEl.querySelectorAll('[data-ink="hint"]').forEach((n) => {
      n.style.color = choice.hint;
      n.style.textShadow = choice.shadow ? '0 1px 6px rgba(2,6,23,0.5)' : 'none';
    });
  }

  function makeScrim(bgImg) {
    const scrim = el('div', {
      position: 'absolute',
      left: '0',
      top: '0',
      width: W + 'px',
      height: '186px',
      background: 'linear-gradient(180deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.55) 55%, rgba(15,23,42,0) 100%)',
      zIndex: '0',
      pointerEvents: 'none',
    });
    bgImg.parentNode.insertBefore(scrim, bgImg.nextSibling);
    return scrim;
  }

  /**
   * Chrome text is authored for a light page. Manifest textInk is only a
   * fallback when the background image is not yet measurable — the durable
   * rule is to sample the real header-band pixels and pick the first brand-
   * first ink that clears the M6 warn bar (4.5:1). A scrim is added only when
   * no solid ink alone can.
   */
  function applyInkPolicy(pageEl, pick, bgImg, hasWash) {
    // Full-page wash (title/frames/wrap) already darkens the surface — white ink.
    if (hasWash) {
      paintInk(pageEl, INK_PALETTE[3]);
      return null;
    }

    // Quiet pale flats declare dark ink in the manifest — never flip to white
    // titles on a cream wash (that is the "titles too light" failure mode).
    if (pick && pick.type === 'flat' && pick.textInk === 'dark') {
      paintInk(pageEl, INK_PALETTE[2]); // near-black heading / slate hint
      return null;
    }

    const sample = sampleHeaderBg(bgImg);
    if (sample) {
      // Busy photographic bands (scenes) keep the scrim even when a dark ink
      // would clear M6 — otherwise body/hint text sits bare on texture (M2).
      const busy = sample.stddev > BUSY_STDDEV || pick.type === 'scene';
      if (!busy) {
        for (const choice of INK_PALETTE) {
          if (choice.heading === '#ffffff') continue; // white only with scrim
          if (contrastRatio(hexRgb(choice.heading), sample) >= INK_WARN) {
            paintInk(pageEl, choice);
            return null;
          }
        }
      }
      // No solid ink clears 4.5, or the band is too busy — darken, use white.
      const scrim = makeScrim(bgImg);
      paintInk(pageEl, INK_PALETTE[3]);
      return scrim;
    }

    // Image not loaded yet. Fall back to the manifest label so we still do
    // something useful before onload re-runs the measured path.
    const ink = pick.textInk || (pick.type === 'flat' ? 'light' : 'light');
    if (ink === 'light') {
      const scrim = makeScrim(bgImg);
      paintInk(pageEl, INK_PALETTE[3]);
      return scrim;
    }
    // Mid-tone pastels declare dark ink — brand teal fails on them; dark teal
    // clears the bar without a scrim. Whiteboards still get brand teal once
    // the image loads and the measured path runs.
    paintInk(pageEl, INK_PALETTE[1]);
    return null;
  }

  /** Full-bleed scene/flat under chrome. Uses <img> so html2canvas + waitForImages see it. */
  function applyPackBg(pageEl, pick, opts) {
    if (!pageEl || !pick || !pick.path) return;
    pageEl.style.background = '#0f172a';
    const bgImg = img(pick.path, {
      left: '0',
      top: '0',
      width: W + 'px',
      height: H + 'px',
      objectFit: 'cover',
      zIndex: '0',
    });
    bgImg.dataset.packBg = '1';
    bgImg.dataset.bgKind = pick.type || 'flat';
    if (pick.density) bgImg.dataset.bgDensity = pick.density;
    pageEl.insertBefore(bgImg, pageEl.firstChild);

    let wash = null;
    if (opts && opts.dimForLightText) {
      wash = el('div', {
        position: 'absolute',
        left: '0',
        top: '0',
        width: W + 'px',
        height: H + 'px',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.65), rgba(30,27,75,0.55))',
        zIndex: '0',
        pointerEvents: 'none',
      });
      pageEl.insertBefore(wash, bgImg.nextSibling);
    }

    let scrim = applyInkPolicy(pageEl, pick, bgImg, !!wash);

    // Measured path needs naturalWidth. Re-run once the pack image lands so
    // mid-tone flats don't keep the conservative dark-teal fallback forever.
    if (!wash && bgImg && !bgImg.complete) {
      bgImg.addEventListener(
        'load',
        () => {
          if (scrim && scrim.parentNode) scrim.parentNode.removeChild(scrim);
          scrim = applyInkPolicy(pageEl, pick, bgImg, false);
          liftChrome(pageEl, bgImg, wash, scrim);
        },
        { once: true }
      );
    }

    liftChrome(pageEl, bgImg, wash, scrim);
  }

  function liftChrome(pageEl, bgImg, wash, scrim) {
    Array.from(pageEl.children).forEach((child) => {
      if (child === bgImg || child === wash || child === scrim) return;
      if (!child.style.position || child.style.position === 'static') {
        child.style.position = 'relative';
      }
      if (!child.style.zIndex) child.style.zIndex = '1';
    });
  }

  const LIGHT_TEXT_PAGES = {};

  function drawDebugZones(p, pageType) {
    if (!window.EdbLayout) return;
    const debug = /(?:\?|&)edbDebug=1(?:&|$)/.test(location.search || '');
    if (!debug) return;
    const page = window.EdbLayout.createPage(pageType);
    window.EdbLayout.debugOverlay(page).forEach((z) => {
      const box = el('div', {
        position: 'absolute',
        left: z.x + 'px',
        top: z.y + 'px',
        width: z.w + 'px',
        height: z.h + 'px',
        boxSizing: 'border-box',
        border: z.noOverlap ? '2px dashed rgba(239,68,68,0.7)' : '2px dashed rgba(34,197,94,0.7)',
        pointerEvents: 'none',
        zIndex: '50',
        fontSize: '11px',
        color: z.noOverlap ? '#b91c1c' : '#15803d',
        padding: '2px 4px',
        background: 'rgba(255,255,255,0.15)',
      }, z.name);
      p.appendChild(box);
    });
  }

  function hasRecipe(boardPlan, pageKey) {
    return (boardPlan?.assignments || []).some((a) => a.pageKey === pageKey);
  }

  function recipeIdFor(boardPlan, pageKey) {
    const a = (boardPlan?.assignments || []).find((x) => x.pageKey === pageKey);
    return a ? a.recipeId : null;
  }

  function speakingChunks(lesson, meta) {
    if (window.EdbActivities && window.EdbActivities.speakingChunks) {
      return window.EdbActivities.speakingChunks(lesson, meta);
    }
    const qs = (lesson.speakingQuestions || []).slice(0, 4);
    if (!qs.length) return [];
    const dur = Number(meta?.duration);
    if (Number.isFinite(dur) && dur <= 30) return [qs];
    const pages = [];
    for (let i = 0; i < qs.length; i += 2) pages.push(qs.slice(i, i + 2));
    return pages;
  }

  // Keep in step with EdbActivities.MAX_STORY_PAGES — read as a literal because
  // this file can load before edbActivities.js.
  const MAX_STORY_PAGES = 3;

  function storyPageCount(lesson, meta) {
    if (window.EdbActivities && window.EdbActivities.storyPageCount) {
      return window.EdbActivities.storyPageCount(lesson, meta);
    }
    const n = (lesson.story?.pages || []).length;
    if (n <= 0) return 1;
    const dur = Number(meta && meta.duration);
    if (Number.isFinite(dur) && dur <= 30) return 1;
    return Math.min(MAX_STORY_PAGES, n);
  }

  function storyPagesForBoard(lesson, meta) {
    if (window.EdbActivities && window.EdbActivities.storyPagesForBoard) {
      return window.EdbActivities.storyPagesForBoard(lesson, meta);
    }
    const raw = (lesson.story && lesson.story.pages) || [];
    const count = storyPageCount(lesson, meta);
    if (!raw.length) {
      return [{ heading: 'Story', text: 'Read together.', visualTheme: 'nature', visualCaption: 'Scene' }];
    }
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
    if (lesson && lesson._preA1Live) return false;
    if (window.EdbActivities && window.EdbActivities.includeCreative) {
      return window.EdbActivities.includeCreative(lesson, meta);
    }
    const qs = lesson.story?.creativeQuestions || [];
    if (!qs.length) return false;
    const dur = Number(meta?.duration);
    if (Number.isFinite(dur) && dur <= 25) return false;
    return true;
  }

  function includePhonics(lesson, meta) {
    if (window.EdbActivities && window.EdbActivities.includePhonics) {
      return window.EdbActivities.includePhonics(lesson, meta);
    }
    return false;
  }

  function header(text, color, opts) {
    const timing = opts && opts.timing;
    const t = tokens();
    const titleType = t ? t.type.title : { fontSize: '40px', fontWeight: '800', lineHeight: '1.1' };
    const gap = t ? t.space.space_sm + 'px' : '12px';
    const mb = t ? t.space.space_md + 'px' : '16px';
    const accent = color || (t ? t.colors.accent_primary : '#17827C');
    const row = el('div', {
      display: 'flex',
      alignItems: 'center',
      gap,
      marginBottom: mb,
      flexWrap: 'wrap',
    });
    const n = el('div', {
      fontSize: titleType.fontSize,
      fontWeight: titleType.fontWeight,
      color: accent,
      letterSpacing: '-0.02em',
      lineHeight: titleType.lineHeight,
      marginBottom: '0',
    }, text);
    n.dataset.ink = 'heading';
    row.appendChild(n);
    if (timing) {
      // ≥22px chrome floor (board-ux M1). Light headers (wrap) get a dark chip
      // so hint ink isn't measured as slate-on-navy when the pill isn't a card.
      const lightHead = /^#f|^#e|^rgb\(\s*2[4-5]\d/i.test(String(color || ''));
      const badge = t ? t.type.badge : { fontSize: '22px', fontWeight: '700', lineHeight: '1.2' };
      const chip = el('div', {
        fontSize: badge.fontSize,
        fontWeight: badge.fontWeight,
        color: lightHead ? '#f8fafc' : (t ? t.colors.text_secondary : '#334155'),
        background: lightHead ? 'rgba(15,23,42,0.55)' : (t ? t.colors.hint_bg : 'rgba(255,255,255,0.88)'),
        border: lightHead ? '1px solid rgba(248,250,252,0.35)' : '1px solid rgba(148,163,184,0.7)',
        borderRadius: '999px',
        padding: '4px 12px',
        lineHeight: badge.lineHeight,
        flexShrink: '0',
      }, timing);
      chip.dataset.ink = 'hint';
      chip.dataset.timingChip = '1';
      row.appendChild(chip);
    }
    return row;
  }

  /** Small instruction line under a header. Sits on the raw background, so the
   *  background policy recolours it — see applyPackBg. */
  function hint(text, extra) {
    const t = tokens();
    const inst = t ? t.type.instruction : { fontSize: '22px', fontWeight: '700' };
    // Default slate (not soft gray) so instructions stay readable on pale flats
    // before ink policy runs; dataset.ink lets applyInkPolicy retarget on scenes.
    const n = el('div', Object.assign({
      fontSize: inst.fontSize,
      color: t ? t.colors.text_secondary : '#334155',
      fontWeight: inst.fontWeight,
      marginBottom: (t ? t.space.space_md : 14) + 'px',
    }, extra || {}), text);
    n.dataset.ink = 'hint';
    return n;
  }

  function card(html, extra) {
    // One card language: white, soft shadow, consistent radius, roomy padding.
    // Dark slabs are never the default — ink policy may still darken headers.
    // Always set backgroundColor (not only background) so bake/rasterizers
    // don't punch checkerboard holes at rounded corners on photo flats.
    const t = tokens();
    const body = t ? t.type.body : { fontSize: '22px' };
    const n = el('div', Object.assign({
      background: t ? t.colors.card_bg : '#ffffff',
      backgroundColor: t ? t.colors.card_bg : '#ffffff',
      borderRadius: (t ? t.radius.radius_md : 18) + 'px',
      padding: t ? '20px 24px' : '20px 24px',
      boxShadow: t ? t.shadow.card : '0 2px 10px rgba(15,23,42,0.07)',
      marginBottom: (t ? t.space.space_md : 14) + 'px',
      fontSize: body.fontSize,
      color: t ? t.colors.text_primary : '#0f172a',
      lineHeight: body.lineHeight || '1.35',
    }, extra || {}));
    if (html != null) n.innerHTML = html;
    n.dataset.chromeCard = '1';
    return n;
  }

  /**
   * Drill pages with only two or three items used to sit in the top strip with
   * a dead board underneath. This spreads the content down the page instead.
   * Only for pages without dock pieces — those own the lower band.
   */
  function fillBody(p, extra) {
    p.style.display = 'flex';
    p.style.flexDirection = 'column';
    const body = el('div', Object.assign({
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '14px',
      minHeight: '0',
    }, extra || {}));
    p.appendChild(body);
    return body;
  }

  /** Full-height column inside the page shell — keeps flex/grid stretch honest
   *  after applyPackBg injects an absolute background as the first child. */
  function chromeColumn(p) {
    p.style.display = 'flex';
    p.style.flexDirection = 'column';
    const col = el('div', {
      position: 'relative',
      zIndex: '1',
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 0%',
      width: '100%',
      minHeight: '0',
      boxSizing: 'border-box',
    });
    p.appendChild(col);
    return col;
  }

  function img(src, style) {
    const i = el('img', Object.assign({
      position: 'absolute',
      objectFit: 'contain',
      pointerEvents: 'none',
    }, style || {}));
    i.src = src;
    i.alt = '';
    return i;
  }

  /**
   * Tolerate fixture / LLM shape drift so boards don't ship hollow.
   * Manus 2026-08: classical fixture put comprehension/creative/wrapUp at root
   * while the renderer only read story.comprehensionQuestions / reviewSentences.
   */
  function maxBoardVocab() {
    return (window.VocabArt && window.VocabArt.MAX_BOARD_VOCAB) || 6;
  }

  /** Respect adaptBoardVocabulary.boardCount (usually 4–6; honest short may be 1–3). */
  function boardVocabCeil(lesson) {
    const adapted = lesson && lesson._vocabAdapted;
    const n = Number(adapted && adapted.boardCount);
    if (n >= 1 && n <= maxBoardVocab()) return n;
    return maxBoardVocab();
  }

  function boardVocabList(lesson) {
    if (window.VocabArt && typeof window.VocabArt.boardVocabulary === 'function') {
      return window.VocabArt.boardVocabulary(lesson);
    }
    return (lesson.vocabulary || []).slice(0, boardVocabCeil(lesson));
  }

  function normalizeLesson(lesson) {
    if (!lesson || typeof lesson !== 'object') return lesson || {};
    if (!lesson.story || typeof lesson.story !== 'object') lesson.story = {};
    const story = lesson.story;

    // Collapse duplicate vocabulary entries so padIndex / dock pieces stay 1:1.
    if (Array.isArray(lesson.vocabulary)) {
      const seen = new Set();
      lesson.vocabulary = lesson.vocabulary.filter((v) => {
        const w = typeof v === 'string' ? v : v && v.word;
        if (!w) return false;
        const key = String(w).toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (!(story.comprehensionQuestions && story.comprehensionQuestions.length)
      && Array.isArray(lesson.comprehension) && lesson.comprehension.length) {
      story.comprehensionQuestions = lesson.comprehension.map((q) => {
        if (typeof q === 'string') return { question: q, sampleAnswer: '' };
        return {
          question: q.question || q.text || '',
          sampleAnswer: q.sampleAnswer || q.answer || '',
        };
      });
    }

    if (!(story.creativeQuestions && story.creativeQuestions.length)
      && Array.isArray(lesson.creative) && lesson.creative.length) {
      story.creativeQuestions = lesson.creative.map((q) => {
        if (typeof q === 'string') return q;
        return q.question || q.text || q;
      });
    }

    if (!(lesson.reviewSentences && lesson.reviewSentences.length)
      && Array.isArray(lesson.wrapUp) && lesson.wrapUp.length) {
      lesson.reviewSentences = lesson.wrapUp.slice();
    }

    // Drop comprehension that invents story facts; trim mid-sentence page cuts.
    if (window.StoryIntegrity && typeof window.StoryIntegrity.repairLesson === 'function') {
      window.StoryIntegrity.repairLesson(lesson);
    }

    // a/an honesty — bare "a ____" with apple/orange in the bank teaches "a apple"
    // (Manus UX fruit bP5y). Rewrite frames + activity templates to a/an (or the
    // single correct article) before chrome / frameTiles ship.
    lesson = articleSafeFrames(lesson);
    return lesson;
  }

  /** Spelling heuristic for A1 boards — vowel-letter start → "an". */
  function needsAnArticle(word) {
    return /^[aeiou]/i.test(String(word || '').trim());
  }

  /**
   * Rewrite bare a/an blanks when taught vocab would force a wrong article.
   * Mixed bank → "a/an ____"; all-vowel → "an"; all-consonant → "a".
   */
  function articleSafeFrames(lesson) {
    if (!lesson || typeof lesson !== 'object') return lesson;
    const words = (lesson.vocabulary || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .map((w) => String(w || '').trim())
      .filter(Boolean);
    if (!words.length) return lesson;
    const hasAn = words.some(needsAnArticle);
    const hasA = words.some((w) => !needsAnArticle(w));
    const rewrite = (raw) => {
      let s = String(raw || '');
      if (!s) return s;
      // Already dual-form — leave alone.
      if (/\ba\/an\s+(_{2,}|\.{3}|…)/i.test(s)) return s;
      if (hasAn && hasA) {
        s = s.replace(/\b(an|a)\s+(_{2,}|\.{3}|…)/gi, 'a/an $2');
      } else if (hasAn) {
        s = s.replace(/\ba\s+(_{2,}|\.{3}|…)/gi, 'an $1');
      } else if (hasA) {
        s = s.replace(/\ban\s+(_{2,}|\.{3}|…)/gi, 'a $1');
      }
      return s;
    };
    if (Array.isArray(lesson.sentenceFrames)) {
      lesson.sentenceFrames = lesson.sentenceFrames.map(rewrite);
    }
    if (lesson.activity && Array.isArray(lesson.activity.templates)) {
      lesson.activity.templates = lesson.activity.templates.map(rewrite);
    }
    return lesson;
  }

  function comprehensionQuestions(lesson) {
    return (lesson.story && lesson.story.comprehensionQuestions) || [];
  }

  /** Section list for SceneBackgrounds.planFor — mirrors the render spine.
   *  Page picks stay quiet flats (H2): chrome + story *text* need empty washes.
   *  Story place art belongs in `[data-story-art]` panels, not as page scenes.
   *  Variety = rotating flats; thin place sets may borrow one house cool mid-panel. */
  function buildSectionList(lesson, meta) {
    lesson = normalizeLesson(lesson);
    if (window.ProducerBridge && typeof window.ProducerBridge.normalize === 'function') {
      window.ProducerBridge.normalize(lesson, meta || {});
    }
    const vocab = (lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)).filter(Boolean);
    const topic = lesson.title || '';
    const topicBlob = [topic, ...vocab].join(' ');
    // Music / classical title pages earn the terrace (or other) place scene —
    // chrome pages stay on quiet flats.
    const musicTitle = window.LessonTraits
      ? window.LessonTraits.traitsFor(lesson).musicTitle
      : !!(
        window.SceneBackgrounds &&
        window.SceneBackgrounds.moodsFor &&
        (window.SceneBackgrounds.moodsFor(topicBlob) || []).includes('music')
      );
    // Non-music kings (chest / pizza / dental / …) stay on quiet flats even
    // when a glossy title accidentally earns a music mood / terrace scene.
    const kingHero = window.EdbActivities && typeof window.EdbActivities.findHeroProp === 'function'
      ? window.EdbActivities.findHeroProp(lesson)
      : null;
    const quietKing = !!(kingHero && kingHero.key
      && !/^(concert-|musician-|grand-piano|dh-piano)/.test(kingHero.key));
    const quietStage = quietKing || !musicTitle;
    const sections = [
      {
        title: topic || 'Title',
        tags: ['title', topic, musicTitle ? 'classical' : ''].filter(Boolean),
        vocabulary: vocab,
        preferFlat: quietStage,
      },
      { title: 'Warm Up', tags: ['warmup', 'warm-up'], vocabulary: [], preferFlat: true },
      { title: 'New Words', tags: ['vocabulary', 'words', 'matching'], vocabulary: [], preferFlat: true },
    ];

    if (includePhonics(lesson, meta)) {
      sections.push({
        title: 'Sound Boxes',
        tags: ['phonics', 'sounds', 'letters'],
        vocabulary: [],
        preferFlat: true,
      });
    }

    const EA = window.EdbActivities;
    const shipSentences = EA && typeof EA.hasVocabSentencesContent === 'function'
      ? EA.hasVocabSentencesContent(lesson)
      : boardVocabList(lesson).some((v) => String((v && v.sentence) || '').trim());
    const shipFrames = EA && typeof EA.hasFramesContent === 'function'
      ? EA.hasFramesContent(lesson)
      : ((lesson.sentenceFrames || []).some((f) => /_{2,}|\bblank\b/i.test(String(f || ''))));
    if (shipSentences && !lesson._preA1Live) {
      sections.push(
        { title: 'Words in Sentences', tags: ['vocabulary', 'sentences', 'grammar'], vocabulary: [], preferFlat: true },
      );
    }
    if (shipFrames && !lesson._preA1Live) {
      sections.push(
        { title: 'Sentence Frames', tags: ['grammar', 'frames'], vocabulary: [], preferFlat: true },
      );
    }

    const boardStories = storyPagesForBoard(lesson, meta);
    boardStories.forEach((sp, i) => {
      sections.push({
        title: sp.heading || lesson.story?.title || ('Story ' + (i + 1)),
        tags: [sp.visualCaption, 'story', topic].filter(Boolean),
        vocabulary: [],
        preferFlat: true,
      });
    });

    if (!lesson._preA1Live) {
      sections.push(
        { title: 'Reading Comprehension', tags: ['comprehension', 'reading'], vocabulary: [], preferFlat: true }
      );
    }

    if (includeCreative(lesson, meta)) {
      sections.push({ title: 'Your Ideas', tags: ['creative', 'ideas'], vocabulary: [], preferFlat: true });
    }

    speakingChunks(lesson, meta).forEach((chunk, i) => {
      sections.push({
        title: (chunk[0] && chunk[0].question) || ('Speaking ' + (i + 1)),
        tags: ['speaking', 'talk'],
        vocabulary: [],
        preferFlat: true,
      });
    });

    sections.push(
      {
        // Music / classical king stage keeps the terrace (or matched place scene)
        // under the hero — quiet flats only when no music mood.
        title: lesson.activity?.title || 'Activity',
        tags: [lesson.activity?.title, lesson.activity?.prompt, 'activity', topic, musicTitle ? 'classical' : ''].filter(Boolean),
        vocabulary: vocab,
        preferFlat: quietStage,
      },
      { title: 'Wrap Up', tags: ['wrap', 'review', 'goodbye'], vocabulary: [], preferFlat: quietStage }
    );

    return sections;
  }

  function titleCharmSrc(lesson) {
    // Theme-data charm: charmPrefer / charmEmpty on LessonTraits.resolveTheme —
    // not per-topic if blocks. Empty / quiet flat beats a wrong or mushy dock.
    const PB = window.PropBank;
    const LT = window.LessonTraits;
    const theme = LT && typeof LT.resolveTheme === 'function' ? LT.resolveTheme(lesson) : null;
    if (!theme || theme.id === 'none' || theme.charmEmpty) return null;

    const topicBlob = [lesson.title, ...(lesson.vocabulary || []).map((v) => v.word || v)]
      .join(' ')
      .toLowerCase();
    const banRe = theme.charmBan instanceof RegExp
      ? theme.charmBan
      : (theme.charmBan ? new RegExp(theme.charmBan, 'i') : null);

    const looksLikeInstrument = (p) => {
      const k = String((p && p.key) || '').toLowerCase();
      if (!k) return false;
      return /^(musician-|music-|mus-|hobby-flute|flute|violin|cello|clarinet|trumpet|trombone|oboe|bassoon|harp|piano|saxophone|xylophone|piccolo|recorder|harmonica)/.test(k)
        || /flute|violin|clarinet|trumpet|trombone|saxophone|piccolo|recorder/.test(k);
    };
    const charmOk = (p) => {
      if (!p || !p.path || p.dockSafe === false) return false;
      if (banRe && banRe.test(String(p.key || ''))) return false;
      // Non-music themes never charm instruments (shared ban).
      if (theme.id !== 'music' && looksLikeInstrument(p)) return false;
      // Topic Identity Gate — forbidden / parent-only charms lose to empty.
      if (window.TopicIdentity && typeof window.TopicIdentity.scoreAsset === 'function') {
        const brief = window.TopicIdentity.ensureBrief
          ? window.TopicIdentity.ensureBrief(lesson)
          : (lesson && lesson._topicBrief);
        if (brief) {
          const scored = window.TopicIdentity.scoreAsset(brief, {
            kind: 'charm',
            key: p.key,
            tags: p.tags || [],
            packs: p.packs || (p.pack ? [p.pack] : []),
            pageTags: ['title'],
          });
          if (scored.role === 'forbidden' || (scored.role === 'secondary' && !scored.ok)) {
            return false;
          }
        }
      }
      if (typeof PB.isTitleCharmSharp === 'function') return PB.isTitleCharmSharp(p);
      if (typeof PB.isDockSharp === 'function') return PB.isDockSharp(p);
      return true;
    };

    if (theme.heroKey && PB && typeof PB.get === 'function') {
      const pinned = PB.get(theme.heroKey);
      if (charmOk(pinned)) return pinned.path;
    }

    if (Array.isArray(theme.charmPrefer) && theme.charmPrefer.length && PB && typeof PB.get === 'function') {
      for (const key of theme.charmPrefer) {
        const p = PB.get(key);
        if (charmOk(p)) return p.path;
      }
      // Prefer list exhausted — empty beats random kit dock for curated themes.
      if (theme.charmPrefer.length) return null;
    }

    if (PB && typeof PB.loaded === 'function' && PB.loaded() && PB.assessKit) {
      const kit = PB.assessKit(lesson);
      if (kit && kit.ready) {
        // Dental must never charm a bathtub (bathroom pack can outscore dental).
        if (theme.id === 'dental' && (
          (kit.hero && /bath|bathtub|sink|towel|faucet/.test(kit.hero.key || ''))
          || kit.pack === 'bathroom'
        )) {
          const mouth = typeof PB.get === 'function' ? PB.get('dental-kid-open-mouth') : null;
          if (charmOk(mouth)) return mouth.path;
          return null;
        }
        // Sports kit hero is often basketball-hoop-stage — skip unless basketball cue.
        if (
          theme.id === 'sports'
          && kit.hero
          && /basketball-hoop|park-basketball|sport-basketball-hoop|life-basketball-hoop/.test(kit.hero.key || '')
          && !/\bbasketball\b/.test(topicBlob)
        ) {
          const dock = (kit.docks || []).find((p) =>
            charmOk(p) && !/basketball-hoop|basketball/.test(String(p.key || '')));
          if (dock) return dock.path;
          return null;
        }
        if (charmOk(kit.hero)) return kit.hero.path;
        const dock = (kit.docks || []).find(charmOk);
        if (dock) return dock.path;
        return null;
      }
    }

    if (theme.id === 'face' || theme.id === 'feelings'
      || /\b(faces?|eyes?|nose|mouth|smile|cheek|make.?a.?face)\b/.test(topicBlob)) {
      return 'assets/04_decoration-ui/title-faces-hero.png';
    }
    return null;
  }

  /**
   * Small, verified topic cues for the lesson bookends. These are decorative
   * previews, not draggable activity pieces, and fail closed when pack art is
   * unavailable.
   */
  function chromeTopicCues(lesson, limit, opts) {
    const VI = window.VocabIcons;
    const pathFor = VI && typeof VI.pathForSync === 'function'
      ? VI.pathForSync.bind(VI)
      : null;
    if (!pathFor) return [];
    const seen = new Set();
    let words = boardVocabList(lesson)
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
    if (opts && opts.preferExact && typeof VI.matchKindSync === 'function') {
      words = words
        .map((word, index) => ({ word, index, exact: VI.matchKindSync(word) === 'exact' }))
        .sort((a, b) => Number(b.exact) - Number(a.exact) || a.index - b.index)
        .map((entry) => entry.word);
    }
    if (opts && opts.reverse) words.reverse();
    return words
      .map((word) => ({ word: String(word), src: pathFor(word) }))
      .filter((cue) => {
        if (!cue.src || seen.has(cue.src)) return false;
        seen.add(cue.src);
        return true;
      })
      .slice(0, Math.max(1, Number(limit) || 3));
  }

  function makeTitle(lesson, meta, boardPlan) {
    const p = pageShell(THEME_COLORS.title, {
      reserveDock: hasRecipe(boardPlan, 'title'), pageType: 'title',
    });
    p.style.display = 'flex';
    p.style.flexDirection = 'row';
    // Stretch (not center) so the topic-world panel below can claim full page
    // height — Manus title-loop R1: the hero read as a small decorative box on
    // a mostly empty canvas; it needs a true split composition, not a centered
    // circle floating in whitespace.
    p.style.alignItems = 'stretch';
    p.style.gap = '34px';

    const copy = el('div', {
      flex: '1',
      minWidth: '0',
      position: 'relative',
      zIndex: '1',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    });
    copy.appendChild(el('div', {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      color: '#0f766e',
      background: 'rgba(255,255,255,0.84)',
      border: '1px solid rgba(15,118,110,0.24)',
      borderRadius: '999px',
      padding: '7px 14px',
      fontSize: '15px',
      fontWeight: '800',
      letterSpacing: '1.4px',
      textTransform: 'uppercase',
      marginBottom: '14px',
    }, 'Today’s adventure'));
    // Board-taught vocab only (match dock / sentences = adapted board ceil) — Manus S30:
    // aims must not advertise words that never appear on New Words.
    const aimWords = boardVocabList(lesson)
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
    const title = el('div', {
      color: '#0f172a', fontSize: '62px', fontWeight: '800',
      maxWidth: '560px', lineHeight: '1.05',
    }, lesson.title || 'Lesson');
    title.dataset.ink = 'heading';
    copy.appendChild(title);
    const topicName = String(lesson.topic || '')
      .replace(/[.!?]+$/g, '')
      .trim();
    const anticipation = el('div', {
      color: '#0f766e',
      fontSize: '27px',
      fontWeight: '800',
      lineHeight: '1.25',
      marginTop: '12px',
      maxWidth: '600px',
    }, topicName
      ? `Get ready to explore ${topicName}!`
      : 'Look closely — today’s adventure starts now!');
    anticipation.dataset.titleAnticipation = '1';
    copy.appendChild(anticipation);
    const metaLine = el('div', {
      color: '#475569', fontSize: '20px', marginTop: '10px', fontWeight: '700',
    }, `${meta.level || ''}  ·  ${meta.duration || ''}-minute lesson`);
    metaLine.dataset.ink = 'hint';
    copy.appendChild(metaLine);
    let aims = null;
    let grammarAim = null;
    const aimsPanel = el('div', {
      marginTop: '14px',
      maxWidth: '610px',
      padding: '13px 18px',
      borderRadius: '16px',
      // Darker slab + lighter ink so aims/grammar read on a projector (was a
      // faint grey box + #cbd5e1 grammar line — barely legible). S55 guards this.
      background: 'rgba(15,23,42,0.86)',
      backdropFilter: 'blur(6px)',
      boxShadow: '0 14px 34px rgba(15,23,42,0.16)',
    });
    aimsPanel.dataset.aimsPanel = '1';
    if (aimWords.length) {
      // When the board includes a story, name receptive reading — not production-only "talk".
      const hasStoryPages = !!(lesson.story && Array.isArray(lesson.story.pages) && lesson.story.pages.length);
      // Name the actual topic when the lesson declares one — "today's topic" hides
      // what the lesson is about and undercuts aim honesty (S63 / Judge A).
      const topicNoun = String(lesson.topic || '').trim();
      const about = topicNoun ? `about ${topicNoun}` : 'about today\'s topic';
      const aimClause = hasStoryPages
        ? `to talk and read ${about}`
        : `to talk ${about}`;
      aims = el('div', {
        color: '#f8fafc', fontSize: '21px', fontWeight: '700',
        lineHeight: '1.35',
      }, `Aims: use ${aimWords.join(', ')} ${aimClause}.`);
      // NOT data-ink: this text lives on the dark frosted aims slab and must stay
      // light. The flat dark-ink policy (paintInk) would otherwise repaint it
      // slate-dark → dark-on-dark, the exact low-contrast bug judges flagged (S55).
      aims.dataset.aimsLine = '1';
      aimsPanel.appendChild(aims);
    }
    if ((lesson.sentenceFrames || []).length) {
      grammarAim = el('div', {
        color: '#f1f5f9', fontSize: '20px', marginTop: aimWords.length ? '7px' : '0',
        fontWeight: '700', lineHeight: '1.35',
      }, `Grammar aim: ${grammarAimLine(lesson.sentenceFrames)}`);
      // NOT data-ink — see aims note above; keep light on the dark slab (S55).
      grammarAim.dataset.grammarAim = '1';
      aimsPanel.appendChild(grammarAim);
    }
    if (aims || grammarAim) copy.appendChild(aimsPanel);
    p.appendChild(copy);

    // A single object cannot prove a social/relational headline ("Dentists are
    // nice", "Friends can help"). Use the honest multi-cue preview unless the
    // lesson has a real topic noun or a non-claim title.
    const claimLikeTitle = /\b(?:am|is|are|can|should|must|help|helps)\b/i
      .test(String(lesson.title || ''));
    const charmSrc = claimLikeTitle && !String(lesson.topic || '').trim()
      ? null
      : titleCharmSrc(lesson);
    const cues = chromeTopicCues(lesson, 3);
    // Full-height split panel, ~45% of the page width — Manus title-loop R1
    // wanted a full-bleed/split hero occupying 40–55% of the canvas, not a
    // small centered decoration on empty space.
    const world = el('div', {
      position: 'relative',
      width: '45%',
      height: '100%',
      flexShrink: '0',
      zIndex: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      padding: '26px',
      borderRadius: '34px',
      border: '2px solid rgba(255,255,255,0.76)',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.93), rgba(236,254,255,0.72))',
      boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
      overflow: 'hidden',
    });
    world.dataset.titleWorld = '1';
    world.appendChild(el('div', {
      position: 'absolute',
      width: '250px',
      height: '250px',
      borderRadius: '50%',
      right: '-72px',
      top: '-86px',
      background: 'rgba(45,212,191,0.18)',
    }));
    world.appendChild(el('div', {
      color: '#0f766e',
      fontSize: '15px',
      fontWeight: '800',
      letterSpacing: '1.6px',
      textTransform: 'uppercase',
      marginBottom: '10px',
      zIndex: '1',
    }, 'Look · notice · wonder'));
    if (charmSrc) {
      const tableau = el('div', {
        flex: '1',
        minHeight: '0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        zIndex: '1',
      });
      tableau.appendChild(img(charmSrc, {
        position: 'relative',
        width: cues.length ? '238px' : '92%',
        height: cues.length ? '252px' : '76%',
        maxWidth: '420px',
        maxHeight: '378px',
        zIndex: '1',
        objectFit: 'contain',
        background: 'transparent',
      }));
      if (cues.length) {
        const anchors = el('div', {
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
        });
        cues.forEach((cue) => {
          const bubble = el('div', {
            width: '76px',
            height: '76px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '20px',
            background: '#fff',
            border: '2px solid rgba(15,118,110,0.16)',
            boxShadow: '0 8px 18px rgba(15,23,42,0.12)',
          });
          bubble.appendChild(img(cue.src, {
            position: 'relative',
            width: '60px',
            height: '60px',
            objectFit: 'contain',
          }));
          anchors.appendChild(bubble);
        });
        tableau.appendChild(anchors);
      }
      world.appendChild(tableau);
    } else if (cues.length) {
      const cueArt = el('div', {
        flex: '1',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        zIndex: '1',
      });
      cues.forEach((cue, index) => {
        const bubble = el('div', {
          width: index === 0 ? '204px' : '138px',
          height: index === 0 ? '204px' : '138px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: '#fff',
          border: '2px solid rgba(15,118,110,0.16)',
          boxShadow: '0 12px 26px rgba(15,23,42,0.12)',
        });
        bubble.appendChild(img(cue.src, {
          position: 'relative',
          width: index === 0 ? '162px' : '102px',
          height: index === 0 ? '162px' : '102px',
          objectFit: 'contain',
        }));
        cueArt.appendChild(bubble);
      });
      world.appendChild(cueArt);
    }
    if (cues.length) {
      const labels = el('div', {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: '1',
      });
      cues.forEach((cue) => labels.appendChild(el('div', {
        color: '#0f172a',
        background: 'rgba(255,255,255,0.92)',
        borderRadius: '999px',
        padding: '6px 12px',
        fontSize: '16px',
        fontWeight: '800',
        boxShadow: '0 6px 14px rgba(15,23,42,0.08)',
      }, esc(cue.word))));
      world.appendChild(labels);
    }
    p.appendChild(world);

    drawDebugZones(p, 'title');
    return p;
  }

  function makeWarmUp(lesson, boardPlan, meta) {
    const outline = window.ColoringOutlines
      ? window.ColoringOutlines.forLesson(lesson, meta)
      : null;
    const p = pageShell(THEME_COLORS.warm, {
      reserveDock: hasRecipe(boardPlan, 'warm'), pageType: 'warm',
    });
    p.style.display = 'flex';
    p.style.flexDirection = 'column';
    p.appendChild(header('Warm Up', '#be123c', { timing: timingChip(4) }));
    p.appendChild(hint(
      outline
        ? 'Say your answer, then color the picture!'
        : 'Say your answer out loud.',
      { marginBottom: '10px', flexShrink: '0' }
    ));
    // Question rides the top — not floating alone in dead mid-board space.
    p.appendChild(card(
      `<div style="font-size:36px;font-weight:800;color:#1e3a8a;text-align:center;line-height:1.25">${esc(lesson.warmUp?.question || '')}</div>`,
      {
        padding: '22px 28px',
        marginBottom: outline ? '14px' : '12px',
        width: '100%',
        maxWidth: '980px',
        marginLeft: 'auto',
        marginRight: 'auto',
        boxSizing: 'border-box',
        flexShrink: '0',
      }
    ));
    // A1/A2 only: white coloring stage with topic-matched outline (never global eyes).
    if (outline) {
      const stage = el('div', {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '0',
        position: 'relative',
        background: '#ffffff',
        borderRadius: '22px',
        border: '3px solid #cbd5e1',
        boxSizing: 'border-box',
        padding: '12px 20px 16px',
        maxWidth: '980px',
        width: '100%',
        margin: '0 auto',
      });
      stage.dataset.coloringStage = '1';
      stage.appendChild(el('div', {
        fontSize: '22px',
        fontWeight: '700',
        color: '#64748b',
        marginBottom: '6px',
        flexShrink: '0',
      }, 'Color me!'));
      // Fit outline to remaining stage height — do NOT force 2/1 or overflow:hidden
      // (banked PNGs ~472×354/472; tall question cards shrink the art budget and
      // clipped wheels / paws under a hard max-height:300px + aspect box).
      stage.appendChild(el('div', {
        flex: '1 1 auto',
        minHeight: '0',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        margin: '0 auto',
      }, outline.html || outline.svg || ''));
      stage.appendChild(el('div', {
        position: 'absolute',
        right: '14px',
        bottom: '10px',
        pointerEvents: 'none',
        lineHeight: '0',
        opacity: '0.92',
      }, outline.crayons));
      p.appendChild(stage);
    } else {
      // B1+: big write-in stage. Never print sampleAnswer on the student board
      // (Manus / honesty — teacher samples bias kids). Keep sampleAnswer in JSON
      // for teacher scripts / PDF notes only.
      const writeIn = card(
        `<div style="font-size:28px;font-weight:700;color:#64748b;margin-bottom:14px;text-align:center">Write or say your answer here</div>
         <div data-warm-starter="1" style="font-size:26px;font-weight:800;color:#1e3a8a;background:#eff6ff;border:2px dashed #93c5fd;border-radius:14px;padding:12px 20px;margin:0 8% 18px;text-align:center">Try: I feel ____ because ____.</div>
         <div style="border-bottom:3px dashed #cbd5e1;height:52px;margin:12px 8% 0"></div>
         <div style="border-bottom:3px dashed #cbd5e1;height:52px;margin:20px 8% 0"></div>
         <div style="border-bottom:3px dashed #cbd5e1;height:52px;margin:20px 8% 0"></div>`,
        {
          flex: '1',
          marginBottom: '0',
          minHeight: '0',
          padding: '28px 32px',
          width: '100%',
          maxWidth: '980px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }
      );
      // Empty write lines are intentional — metrics must not treat this as a sparse text card.
      writeIn.dataset.writeInStage = '1';
      p.appendChild(writeIn);
    }
    drawDebugZones(p, 'warm');
    return p;
  }

  async function makeVocab(lesson, boardPlan) {
    const hasArtPlan = hasRecipe(boardPlan, 'newWords');
    // Interactive matchDock uses an unsolved picture deck + destination word pads.
    // Text-only fallback keeps the full-width cards below.
    const p = pageShell(THEME_COLORS.vocab, {
      reserveDock: hasArtPlan, pageType: 'vocab',
    });
    p.style.display = 'flex';
    p.style.flexDirection = 'column';
    p.appendChild(header('New Words', '#7c3aed', { timing: timingChip(6) }));
    const art = boardPlan && boardPlan.vocabArt;
    const EA = window.EdbActivities;
    const matchHint = hasArtPlan
      ? ((boardPlan && boardPlan.matchDockHint)
        || (EA && EA.matchDockStudentHint && EA.matchDockStudentHint(art))
        || 'Drag each picture to its word. Say the word, then check.')
      : 'Say each word together.';
    p.appendChild(hint(matchHint, { flexShrink: '0' }));
    const words = boardVocabList(lesson);
    const rowByWord = new Map();
    ((art && art.rows) || []).forEach((r) => rowByWord.set(r.word, r));

    if (hasArtPlan && art && Array.isArray(art.matchable) && art.matchable.length) {
      const wordByKey = new Map(
        words.map((v) => [String((v && v.word) || '').toLowerCase(), v])
      );
      const padWords = art.matchable.map((row) =>
        wordByKey.get(String((row && row.word) || '').toLowerCase()) || { word: row.word }
      );
      const n = padWords.length;
      const cols = n <= 3 ? 1 : 2;
      const rowsN = Math.max(1, Math.ceil(n / cols));

      // A scene-like source tray sits behind the real draggable EDB pieces. It
      // makes the source/destination contract obvious without printing answers
      // under the pictures or depending on one topic-specific background.
      const sourceTray = el('div', {
        position: 'absolute',
        left: '704px',
        top: '118px',
        width: '452px',
        height: '356px',
        borderRadius: '30px',
        border: '3px solid rgba(124,58,237,0.34)',
        background: 'linear-gradient(160deg, rgba(245,243,255,0.94), rgba(224,231,255,0.88))',
        boxShadow: '0 14px 34px rgba(49,46,129,0.16), inset 0 0 0 8px rgba(255,255,255,0.42)',
        zIndex: '0',
        pointerEvents: 'none',
      });
      sourceTray.dataset.matchSourceTray = '1';
      sourceTray.appendChild(el('div', {
        position: 'absolute',
        left: '24px',
        top: '14px',
        fontSize: '20px',
        fontWeight: '900',
        letterSpacing: '1.4px',
        color: '#5b21b6',
        textTransform: 'uppercase',
      }, 'Picture deck · pick one'));
      sourceTray.appendChild(el('div', {
        position: 'absolute',
        left: '22px',
        right: '22px',
        top: '54px',
        bottom: '20px',
        borderRadius: '22px',
        border: '2px dashed rgba(99,102,241,0.28)',
        background: 'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.78) 0 5px, transparent 6px), radial-gradient(circle at 82% 76%, rgba(255,255,255,0.72) 0 7px, transparent 8px)',
      }));
      p.appendChild(sourceTray);

      const finishBadge = el('div', {
        position: 'absolute',
        right: '42px',
        top: '26px',
        padding: '9px 16px',
        borderRadius: '999px',
        background: '#fef3c7',
        border: '2px solid #f59e0b',
        boxShadow: '0 5px 12px rgba(146,64,14,0.14)',
        color: '#92400e',
        fontSize: '18px',
        fontWeight: '900',
        zIndex: '2',
      }, `Match all ${n} → ⭐ Word Master`);
      finishBadge.dataset.matchReward = '1';
      p.appendChild(finishBadge);

      const targetStage = el('div', {
        width: '640px',
        flex: '1',
        minHeight: '0',
        marginTop: '2px',
        padding: '14px',
        boxSizing: 'border-box',
        borderRadius: '28px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.58), rgba(237,233,254,0.54))',
        border: '2px solid rgba(124,58,237,0.20)',
        display: 'grid',
        gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr',
        gridTemplateRows: `repeat(${rowsN}, 1fr)`,
        gap: '12px 14px',
        position: 'relative',
        zIndex: '1',
      });
      targetStage.dataset.matchTargetStage = '1';

      padWords.forEach((v, i) => {
        const word = String((v && v.word) || '');
        const pad = el('div', {
          minHeight: '0',
          padding: '10px 14px',
          boxSizing: 'border-box',
          borderRadius: '20px',
          border: `3px dashed ${i % 2 ? '#0f766e' : '#7c3aed'}`,
          background: i % 2 ? 'rgba(240,253,250,0.94)' : 'rgba(250,245,255,0.94)',
          boxShadow: '0 6px 14px rgba(30,41,59,0.10)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transform: `rotate(${i % 3 === 0 ? '-0.45' : i % 3 === 1 ? '0.4' : '0'}deg)`,
        });
        pad.dataset.matchPad = '1';
        pad.dataset.matchWord = word;
        pad.appendChild(el('div', {
          width: '42px',
          height: '42px',
          flex: '0 0 42px',
          borderRadius: '50%',
          background: i % 2 ? '#0f766e' : '#7c3aed',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          fontWeight: '900',
        }, String(i + 1)));
        pad.appendChild(el('div', {
          minWidth: '0',
          flex: '1',
        }, `<div style="font-size:${n <= 4 ? 38 : 32}px;font-weight:900;line-height:1.05;color:#172554;overflow-wrap:anywhere">${esc(word)}</div>
            <div style="font-size:16px;font-weight:800;color:#64748b;margin-top:5px;text-transform:uppercase;letter-spacing:.8px">drop picture here</div>`));
        targetStage.appendChild(pad);
      });
      p.appendChild(targetStage);
      drawDebugZones(p, 'vocab');
      return p;
    }

    // Shortened boards must still fill the page. cols=2 + ceil(n/2) rows leaves
    // a dead cell whenever n is odd — N=5 was six cells for five cards. The odd
    // card spans both columns instead, so 4 and 5 both fill edge to edge.
    const n = Math.max(1, words.length);
    const cols = n <= 2 ? 1 : 2;
    const rows = Math.max(1, Math.ceil(n / cols));
    const spanLast = cols === 2 && n % 2 === 1;
    const densePair = n === 2;
    const grid = el('div', {
      display: 'grid',
      gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr',
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: densePair ? '14px' : '16px',
      maxWidth: '100%',
      width: '100%',
      flex: '1',
      minHeight: '0',
      height: '100%',
      alignContent: 'stretch',
    });
    words.forEach((v) => {
      const row = rowByWord.get(v.word);
      // Always show art beside the word when VocabArt found any — never Gemini
      // emoji / bullet. Transparent bg for keyed props (no white chip).
      const glyphSize = n <= 2 ? 120 : n <= 4 ? 92 : 76;
      let glyphHtml = '';
      if (row && row.artSrc) {
        // Never paint a second plate behind pack/prop art — lavender chips made
        // white vocab-pack squares look worse (team/score/run on Sports boards).
        glyphHtml = `<img src="${esc(row.artSrc)}" alt="" style="width:${glyphSize}px;height:${glyphSize}px;object-fit:contain;flex-shrink:0;background:transparent">`;
      } else if (row && row.glyph) {
        // No colored chip — purple/white plates behind glyphs read as pack icons
        // (Sports Arena New Words). Transparent like keyed props.
        glyphHtml = `<div style="width:${glyphSize}px;height:${glyphSize}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(glyphSize * 0.55)}px;flex-shrink:0;background:transparent">${esc(row.glyph)}</div>`;
      }
      const wordPx = densePair ? 52 : n <= 2 ? 56 : n <= 3 ? 48 : n <= 5 ? 42 : 38;
      const writeLine = n <= 3
        ? `<div style="margin-top:10px;font-size:22px;font-weight:700;color:#64748b;text-align:center;line-height:1.35;max-width:90%">Say the word. Write it on the line.</div>
           <div style="margin-top:8px;border-bottom:3px dashed #cbd5e1;height:44px;width:80%;max-width:360px;flex-shrink:0"></div>`
        : '';
      const wordCard = card(
        `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;width:100%;box-sizing:border-box">
          <div style="display:flex;flex-direction:row;align-items:center;justify-content:center;gap:18px;flex-shrink:0;width:100%">
            ${glyphHtml}
            <div style="font-size:${wordPx}px;font-weight:800;line-height:1.05;text-align:left;min-width:0">${esc(v.word || '')}</div>
          </div>
          ${writeLine}
        </div>`,
        {
          marginBottom: '0',
          padding: densePair ? '14px 18px' : '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '0',
          height: '100%',
          boxSizing: 'border-box',
        }
      );
      if (writeLine) wordCard.dataset.writeInStage = '1';
      else if (glyphHtml) wordCard.dataset.matchCard = '1';
      grid.appendChild(wordCard);
    });
    if (spanLast && grid.lastChild) {
      grid.lastChild.style.gridColumn = '1 / -1';
    }
    p.appendChild(grid);
    drawDebugZones(p, 'vocab');
    return p;
  }

  function makePhonics(lesson, boardPlan, meta) {
    const data = window.EdbActivities && window.EdbActivities.normalizePhonics
      ? window.EdbActivities.normalizePhonics(lesson, meta || (boardPlan && boardPlan.meta) || {})
      : null;
    const interactive = hasRecipe(boardPlan, 'phonics');
    const p = pageShell(THEME_COLORS.phonics, {
      reserveDock: interactive, pageType: 'phonics',
    });
    p.appendChild(header('Sound Boxes', '#b45309'));

    const focus = data && data.targetWords && data.targetWords[data.focusIndex || 0];
    const script = (data && data.teacherScript) || {};
    const oneLine = script.modeling || script.warmup
      || (focus ? `Say each sound in "${focus.word}". Drag a tile into every box.` : 'Say each sound. Drag a letter tile into every box.');
    p.appendChild(hint(esc(oneLine), { marginBottom: '8px', fontSize: '22px' }));

    if (data && data.targetWords && data.targetWords.length > 1) {
      const chips = el('div', {
        display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px',
      });
      data.targetWords.forEach((w, i) => {
        const isFocus = i === (data.focusIndex || 0);
        chips.appendChild(el('div', {
          padding: '8px 14px',
          borderRadius: '999px',
          background: isFocus ? '#fbbf24' : '#fff7ed',
          border: isFocus ? '2px solid #b45309' : '1px solid #fcd34d',
          fontSize: '22px',
          fontWeight: '700',
          color: '#78350f',
        }, `${w.emoji || ''} ${esc(w.word)}${isFocus ? ' ← now' : ''}`));
      });
      p.appendChild(chips);
    }

    drawDebugZones(p, 'phonics');
    return p;
  }

  function makeVocabSentences(lesson, boardPlan) {
    const p = pageShell(THEME_COLORS.vocab, { pageType: 'vocabSentences' });
    p.appendChild(header('New Words — In Sentences', '#7c3aed', { timing: timingChip(5) }));
    const body = fillBody(p, { justifyContent: 'stretch', gap: '16px' });
    const words = boardVocabList(lesson);
    const artRows = (boardPlan && boardPlan.vocabArt && boardPlan.vocabArt.rows) || [];
    const artByWord = new Map(
      artRows.map((r) => [String((r && r.word) || '').toLowerCase(), r]).filter(([k]) => k)
    );
    // Gather up to 3 example sentences per word so the page fills when the
    // lesson has more content (primary sentence + review lines that use it).
    const extras = [];
    (lesson.reviewSentences || []).forEach((s) => {
      const t = String(s || '').trim().replace(/\s+/g, ' ');
      if (t.length >= 8) extras.push(t);
    });
    (lesson.sentenceFrames || []).forEach((f) => {
      // Skip blank frames — not readable example sentences.
      if (/_{2,}/.test(String(f || ''))) return;
      const t = String(f || '').trim().replace(/\s+/g, ' ');
      if (t.length >= 8) extras.push(t);
    });
    const n = Math.max(1, words.length);
    const sentencesFor = (v) => {
      const out = [];
      const seen = new Set();
      const push = (s) => {
        const t = String(s || '').trim().replace(/\s+/g, ' ');
        if (!t || t.length < 6) return;
        const key = t.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(t);
      };
      push(v && v.sentence);
      if (Array.isArray(v && v.sentences)) v.sentences.forEach(push);
      const w = String((v && v.word) || '').trim();
      if (w) {
        const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        extras.forEach((s) => { if (re.test(s)) push(s); });
      }
      return out.slice(0, n >= 6 ? 2 : 3);
    };
    const cols = n <= 2 ? 1 : 2;
    const rows = Math.max(1, Math.ceil(n / cols));
    const spanLast = cols === 2 && n % 2 === 1;
    const grid = el('div', {
      display: 'grid',
      gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr',
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: '16px',
      flex: '1',
      minHeight: '0',
      height: '100%',
    });
    const glyphSize = n >= 6 ? 52 : 64;
    words.forEach((v) => {
      const lines = sentencesFor(v);
      const multi = lines.length > 1;
      const lineFs = n >= 6
        ? (multi ? 22 : 24)
        : n <= 2 ? (multi ? 26 : 30) : (multi ? 22 : 26);
      const lineHtml = lines.length
        ? lines.map((s) =>
          `<div style="font-size:${lineFs}px;color:#334155;font-style:italic;line-height:1.3;margin-top:4px">${esc(s)}</div>`
        ).join('')
        : `<div style="font-size:${n <= 2 ? 30 : 26}px;color:#334155;font-style:italic;line-height:1.3"></div>`;
      const row = artByWord.get(String((v && v.word) || '').toLowerCase());
      let thumb = '';
      if (row && row.artSrc) {
        thumb = `<img src="${esc(row.artSrc)}" alt="" style="width:${glyphSize}px;height:${glyphSize}px;object-fit:contain;flex-shrink:0;background:transparent">`;
      } else if (row && row.glyph) {
        thumb = `<div style="width:${glyphSize}px;height:${glyphSize}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(glyphSize * 0.55)}px;flex-shrink:0;background:transparent">${esc(row.glyph)}</div>`;
      }
      grid.appendChild(card(
        `<div style="display:flex;align-items:flex-start;gap:12px;height:100%;min-height:0">
           ${thumb}
           <div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden">
             <div style="font-size:${n <= 2 ? 40 : 28}px;font-weight:800;margin-bottom:4px;line-height:1.1;flex-shrink:0">${esc(v.word || '')}</div>
             <div style="flex:1;min-height:0;overflow:hidden">${lineHtml}</div>
           </div>
         </div>`,
        {
          marginBottom: '0',
          padding: n >= 6 ? '12px 16px' : '18px 22px',
          height: '100%',
          minHeight: '0',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: multi ? 'flex-start' : 'center',
          overflow: 'hidden',
        }
      ));
    });
    if (spanLast && grid.lastChild) {
      grid.lastChild.style.gridColumn = '1 / -1';
    }
    body.appendChild(grid);
    return p;
  }

  function makeFrames(lesson, boardPlan) {
    // Draggable word tiles live in the dock (frameTiles recipe) — reserve the
    // footer so the frame stack never sits on top of them.
    const interactive = hasRecipe(boardPlan, 'frames');
    const EA = window.EdbActivities;
    const p = pageShell(THEME_COLORS.vocab, { pageType: 'frames', reserveDock: interactive });
    const col = chromeColumn(p);
    col.appendChild(header('Sentence Frames', '#7c3aed', { timing: timingChip(6) }));
    col.appendChild(hint(interactive
      ? 'Drag one tile into each blank. Say every completed sentence.'
      : 'Listen and say each frame first. Then fill the blanks and write your sentence.', {
      marginBottom: '8px', flexShrink: '0',
    }));
    // Word bank — reinforces the taught vocab and scaffolds open frames like
    // "I would feel ___ if someone ___." (two blanks, no cue). It restates the
    // words that are ON New Words, so it is not answer-leaking — it is the same
    // choice set students already met. Chips only; no per-frame mapping.
    const bankWords = boardVocabList(lesson)
      .map((v) => (typeof v === 'string' ? v : v.word))
      .filter(Boolean);
    // Interactive: the draggable dock tiles ARE the word bank. Painting static
    // chips too would show every word twice and leave students dragging past a
    // dead copy of the same list.
    if (bankWords.length && !interactive) {
      const bank = el('div', {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        flexShrink: '0',
      });
      bank.dataset.frameWordBank = '1';
      bank.appendChild(el('div', {
        fontSize: '22px',
        fontWeight: '800',
        color: '#7c3aed',
        marginRight: '2px',
      }, 'Word bank:'));
      bankWords.forEach((w) => {
        bank.appendChild(el('div', {
          padding: '6px 14px',
          borderRadius: '999px',
          background: '#f5f3ff',
          border: '1px solid #ddd6fe',
          fontSize: '22px',
          fontWeight: '700',
          color: '#5b21b6',
          lineHeight: '1.2',
        }, esc(w)));
      });
      col.appendChild(bank);
    }
    // S60: only model "If I felt…, I would…" when that IS the grammar on the board
    // (frames use if+would, or the lesson is a feelings topic). Soccer/fruit frames
    // are gap-fills — stuffing a feelings conditional there is dishonest (S31).
    // Use boardFrames (shared with frameTiles) — was hard slice(0,3) while generate
    // ships 4 and boardFrames allows up to 5 → lonely under-filled pages.
    const frames = (EA && typeof EA.boardFrames === 'function')
      ? EA.boardFrames(lesson)
      : (lesson.sentenceFrames || []).slice(0, 5).map((f) => String(f || ''));
    const frameStrings = frames.slice();
    const framesAreConditional = frameStrings.some((f) => /\bif\b/i.test(f) && /\bwould\b/i.test(f));
    const feelingsCue = [
      lesson && lesson.title,
      ...((lesson && lesson.vocabulary) || []).map((v) => (typeof v === 'string' ? v : v && v.word)),
    ].filter(Boolean).join(' ');
    const isFeelingsLesson = !!(window.LessonTraits && typeof window.LessonTraits.isFeelingsCue === 'function'
      && window.LessonTraits.isFeelingsCue(feelingsCue));
    if (framesAreConditional || isFeelingsLesson) {
      // Model MUST use a feeling that is NOT the given word in any frame — else the
      // first practice frame becomes copy-the-model, not production (round-2 Judge A).
      const taughtFeelings = (lesson.vocabulary || [])
        .map((v) => (typeof v === 'string' ? v : v && v.word))
        .filter(Boolean);
      const frameGivens = new Set();
      frameStrings.forEach((f) => {
        const s = f.toLowerCase();
        taughtFeelings.forEach((w) => {
          if (new RegExp('\\b' + String(w).toLowerCase() + '\\b').test(s)) frameGivens.add(String(w).toLowerCase());
        });
      });
      const modelWord = taughtFeelings.find((w) => !frameGivens.has(String(w).toLowerCase()))
        || taughtFeelings[0] || 'scared';
      const modelSentence = `If I felt ${esc(modelWord)}, I would ask for help.`;
      const model = el('div', {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '8px 14px',
        marginBottom: '10px',
        flexShrink: '0',
        borderRadius: '12px',
        background: '#ecfdf5',
        border: '1px solid #a7f3d0',
      });
      model.dataset.frameModel = '1';
      model.appendChild(el('div', {
        fontSize: '22px', fontWeight: '800', color: '#047857',
      }, 'Model:'));
      model.appendChild(el('div', {
        fontSize: '22px', fontWeight: '700', color: '#065f46', lineHeight: '1.3',
      }, modelSentence));
      col.appendChild(model);
    }
    const rows = Math.max(1, frames.length);
    const lens = frames.map((f) => String(f || '').length);
    const longest = Math.max(0, ...lens);
    if (interactive) {
      const blanks = EA && typeof EA.frameBlankCount === 'function'
        ? EA.frameBlankCount(lesson)
        : frames.reduce((n, f) => n + ((String(f).match(/_{2,}/g) || []).length), 0);
      const baseWords = boardVocabList(lesson)
        .map((v) => String(typeof v === 'string' ? v : (v && v.word) || '').trim())
        .filter(Boolean);
      const tileWords = EA && typeof EA.expandFrameTileWords === 'function'
        ? EA.expandFrameTileWords(lesson, baseWords)
        : baseWords;
      const extras = Math.max(0, tileWords.length - blanks);
      // One compact world contract replaces a separate rule strip + decorative
      // scene banner. The numbered sentence rows are visible progress steps and
      // the final topic payoff is explicit before the learner starts.
      const artRows = (((boardPlan && boardPlan.vocabArt) || {}).rows || [])
        .filter((row) => row && (row.artSrc || row.glyph))
        .slice(0, 2);
      const scene = el('div', {
        minHeight: rows >= 5 ? '46px' : '56px',
        marginBottom: rows >= 5 ? '6px' : '9px',
        padding: rows >= 5 ? '4px 14px' : '6px 16px',
        borderRadius: '16px',
        background: 'linear-gradient(90deg, rgba(237,233,254,0.96), rgba(236,253,245,0.96) 52%, rgba(254,249,195,0.94))',
        border: '2px solid rgba(5,150,105,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flexShrink: '0',
        overflow: 'hidden',
      });
      scene.dataset.frameSceneAnchor = '1';
      scene.dataset.frameCompletionPayoff = String(blanks);
      const contract = el('div', {
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        whiteSpace: 'nowrap',
        flexShrink: '0',
      });
      const contractRule = el('div', {
        fontSize: rows >= 5 ? '14px' : '16px',
        fontWeight: '900',
        color: '#6d28d9',
      }, `1 TILE / BLANK · ${extras ? `${extras} EXTRA` : 'USE ALL'}`);
      contractRule.dataset.frameTileRule = '1';
      contract.appendChild(contractRule);
      contract.appendChild(el('div', {
        fontSize: rows >= 5 ? '14px' : '16px',
        fontWeight: '900',
        color: '#065f46',
      }, esc((lesson && lesson.title) || 'Say it')));
      scene.appendChild(contract);
      const artTray = el('div', {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginLeft: 'auto',
        minWidth: '0',
      });
      if (artRows.length) {
        artRows.forEach((row) => {
          if (row.artSrc) {
            artTray.appendChild(el('img', {
              width: rows >= 5 ? '38px' : '46px',
              height: rows >= 5 ? '38px' : '46px',
              objectFit: 'contain',
              flexShrink: '0',
            }));
            artTray.lastChild.src = row.artSrc;
            artTray.lastChild.alt = '';
          } else {
            artTray.appendChild(el('div', {
              fontSize: rows >= 5 ? '28px' : '34px',
              lineHeight: '1',
              flexShrink: '0',
            }, esc(row.glyph)));
          }
        });
      } else {
        artTray.appendChild(el('div', {
          fontSize: rows >= 5 ? '28px' : '34px',
          lineHeight: '1',
        }, themeEmoji((lesson && lesson.title) || '') || '💬'));
      }
      scene.appendChild(artTray);
      const payoff = el('div', {
        padding: rows >= 5 ? '6px 10px' : '7px 12px',
        borderRadius: '12px',
        background: '#047857',
        color: '#ffffff',
        fontSize: rows >= 5 ? '15px' : '17px',
        fontWeight: '900',
        lineHeight: '1.1',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 5px rgba(6,78,59,0.22)',
        flexShrink: '0',
      }, `FINISH ${blanks} → ${/\b(game|sport|team|coach|court)\b/i.test((lesson && lesson.title) || '') ? 'TEAM READY!' : 'SCENE READY!'}`);
      payoff.dataset.framePayoff = '1';
      scene.appendChild(payoff);
      col.appendChild(scene);
    }
    // Long B1 frames at 40px overflow the 590px board — shrink type + wrap.
    // 4–5 frames: denser type so the page fills instead of 3 lonely bars.
    const fontPx = Math.max(
      22,
      rows >= 5
        ? (longest > 70 ? 22 : 24)
        : rows >= 4
          ? (longest > 70 ? 24 : 28)
          : longest > 75 ? 26 : longest > 55 ? 30 : rows <= 1 ? 44 : 34
    );
    // Frame copy MUST NOT clip descenders. line-height 1.25 + overflow:hidden was
    // cutting the tails of y/g/p/q/j AND comma tails (worried,→worried.) AND the
    // "____" underscores (both judges: shy→shv, my→mv, floating period). Give the
    // text real descender headroom (≥1.35 + bottom padding) and never vertically
    // clip it. Guarded by verify-feelings-compass S50/S51.
    const FRAME_LINE_HEIGHT = 1.4;
    const body = el('div', {
      flex: '1',
      minHeight: '0',
      display: 'grid',
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: rows >= 4 ? '6px' : '10px',
      width: '100%',
      overflow: 'hidden',
      // Gutter so Frame 3's write-line never sits flush on the board edge — the
      // round-1 model row pushed the stack down and it read as cut off (Judge B / S66).
      marginBottom: '14px',
    });
    body.dataset.framesBody = '1';
    // Blank runs become numbered drop pads sized to hold a dock tile. Segments
    // come from EdbActivities so the pad count and the tile count cannot drift.
    let padNo = 0;
    const frameHtml = (f) => {
      if (!interactive || !EA || typeof EA.frameSegments !== 'function') return esc(f);
      return EA.frameSegments(f).map((seg) => {
        if (!seg.blank) return esc(seg.text);
        padNo += 1;
        // inline-block keeps the pad on the text baseline so a wrapped B1 frame
        // does not push the pad onto a line of its own.
        // Empty-target state cue: dashed shape + a faint crosshair glyph (never
        // the answer word) so "drop here" reads by shape, not color alone — the
        // filled tile visually covers this glyph once placed, so "placed" needs
        // no separate art (Manus frameTiles R1 action 4).
        return `<span data-frame-blank="${padNo}" style="display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;min-width:${Math.round(fontPx * 4.2)}px;height:${Math.round(fontPx * 1.5)}px;margin:0 4px;border:3px dashed #94a3b8;border-radius:10px;background:rgba(148,163,184,0.14)"><span aria-hidden="true" style="font-size:${Math.round(fontPx * 0.7)}px;color:rgba(100,116,139,0.45);line-height:1">⌖</span></span>`;
      }).join('');
    };
    frames.forEach((f, i) => {
      const dense = rows >= 4;
      // Interactive docks already drop into in-line blank pads — a second
      // dashed write strip under dense 5-row stacks overlaps the frame text.
      const writeStrip = interactive
        ? ''
        : `<div style="border-bottom:3px dashed #94a3b8;flex:${dense ? '0 0 10px' : '1'};min-height:${dense ? 10 : 18}px;width:100%"></div>`;
      body.appendChild(card(
        `<div style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#ede9fe;color:#6d28d9;font-size:17px;font-weight:900">${i + 1}</div>
         <div data-frame-text style="font-size:${fontPx}px;font-weight:800;color:#1e293b;line-height:${FRAME_LINE_HEIGHT};padding:0.12em 0 0.18em 34px;margin-bottom:${dense ? 2 : 8}px;flex-shrink:0;overflow:visible;word-break:break-word">${frameHtml(f)}</div>
         ${writeStrip}`,
        {
          padding: dense ? '8px 12px' : '10px 16px',
          marginBottom: '0',
          height: '100%',
          minHeight: '0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: interactive ? 'center' : 'flex-start',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'visible',
        }
      ));
    });
    col.appendChild(body);
    drawDebugZones(p, 'frames');
    return p;
  }

  function themeEmoji(theme) {
    const t = String(theme || '').toLowerCase();
    // Strongest place cues first. Bare "living" in a title like
    // "Living in the Shadow of the Crater" must not steal the home house
    // when volcano words are also present.
    if (/\b(volcano|volcanic|crater|lava|eruption|ash|geothermal|magma|seismic)\b/.test(t)) return '🌋';
    // Music / compose before "Quiet Home" — classical lessons must not show 🏠.
    if (/\b(music|compose|composer|composition|orchestra|melody|harmony|guitar|piano|violin|concert|classical|symphony|strum|tempo|rhythm|performance)\b/.test(t)) return '🎼';
    // Castle before gym — "courtyard" must not hit includes('court') → basketball.
    if (/\b(castle|knight|dragon|medieval|moat|portcullis|drawbridge|royal|king|queen|fortress)\b/.test(t)) return '🏰';
    // Club fair / booths before gym — "walked around the gym" at a Club Fair
    // must not become a lone basketball (clubs PDF story plate).
    if (/\b(club|booth|poster|hobby)\b/.test(t)) return '🏫';
    if (/\b(gym|workout|athletic)\b/.test(t) || /\bcourt\b/.test(t)) return '🏀';
    if (t.includes('dentist') || t.includes('dental') || t.includes('tooth') || t.includes('teeth')) return '🦷';
    if (t.includes('doctor') || t.includes('clinic') || t.includes('hospital') || t.includes('sick') || t.includes('checkup')) return '🏥';
    if (t.includes('airport') || t.includes('travel') || t.includes('passport')) return '✈️';
    if (t.includes('school') || t.includes('classroom') || t.includes('teacher')) return '🏫';
    if (t.includes('kitchen') || t.includes('cook')) return '🍳';
    if (t.includes('beach')) return '🏖️';
    // Home only on explicit home place language — not the verb "living".
    if (/\b(living room|home|house|apartment|bedroom)\b/.test(t)) return '🏠';
    if (t.includes('city') || t.includes('street')) return '🏙️';
    if (t.includes('sport')) return '⚽';
    if (t.includes('park')) return '🌳';
    if (t.includes('bakery') || t.includes('food')) return '🥐';
    if (t.includes('zoo') || t.includes('animal')) return '🦁';
    if (t.includes('space') || t.includes('rocket') || t.includes('moon')) return '🚀';
    // Face/parts after places — "Make a Face" should not fall through to the book.
    if (/\b(face|eyes|nose|mouth|hair|smile|makeup)\b/.test(t)) return '😊';
    // No fake 📖 — empty plate + readiness reason beats a dishonest book glyph.
    return null;
  }

  function storyArtCue(lesson, page) {
    // Prefer lesson place language over Gemini visualTheme (often unrelated art direction).
    // Include story title — "The Brave Knight" should beat a bad visualTheme.
    return [
      lesson?.title,
      lesson?.story?.title,
      page?.visualCaption,
      page?.heading,
      page?.text,
    ].filter(Boolean).join(' ');
  }

  /**
   * Prefer a real PropBank cutout over a lone glyph when the caption names an
   * object we stock (Manus: story glyph panels). StoryArt still wins when cached.
   * Caption-local scenes (desk/papers/compose) beat lesson-theme prefer words
   * so "sitting at a desk…" does not grab orchestra-stands from the title.
   */
  function storyFallbackVisual(lesson, page) {
    const cue = storyArtCue(lesson, page);
    const PB = window.PropBank;
    if (PB && typeof PB.loaded === 'function' && PB.loaded()) {
      const caption = String(page?.visualCaption || '').toLowerCase();
      const cueLower = cue.toLowerCase();
      const deskScene = /\b(desk|papers?|compose|sheet\s*music|writing|manuscript|notebook)\b/.test(caption);
      const pianoScene = /\b(piano|keys|keyboard)\b/.test(caption) && !deskScene;
      const orchestraScene = /\b(orchestra|stage|concert|performance|performing|conductor)\b/.test(caption)
        && !deskScene && !pianoScene;
      const feelingsScene = /\b(worried|scared|confused|shy|surprised|happy|sad|angry|bored|sleepy|proud|feeling|feelings|emotion)\b/.test(cueLower);
      // Beach place before bare vocab — "wave" used to steal hair-long-blonde-wave (S24).
      const beachScene = /\b(beach|shore|seaside|sandcastle|ocean|seashell)\b/.test(cueLower)
        && !deskScene && !pianoScene && !orchestraScene && !feelingsScene;
      const sportsScene = /\b(sports?|soccer|basketball|whistle|team|score|gym|coach|ball|game)\b/.test(cueLower)
        && !deskScene && !pianoScene && !orchestraScene && !feelingsScene && !beachScene;
      const deskPrefer = [
        'compose-desk', 'desk', 'grand-piano', 'piano', 'pencil-pot',
      ];
      // Prefer a musician-at-instrument cutout over bare furniture for story beats.
      const pianoPrefer = [
        'musician-piano', 'grand-piano', 'piano', 'dh-piano',
      ];
      const orchestraPrefer = [
        'musician-conductor', 'orchestra-stands', 'musician-violin', 'musician-cello',
        'conductor-podium', 'violin', 'cello',
      ];
      const feelingsPrefer = [
        'feeling-confused', 'feeling-worried', 'feeling-scared', 'feeling-shy',
        'feeling-surprised', 'feeling-happy', 'feeling-sad', 'feeling-angry',
      ];
      const beachPrefer = [
        'beach-sandcastle', 'beach-umbrella', 'beach-seashell', 'beach-towel',
        'beach-bucket', 'beach-palm-tree', 'beach-ball',
      ];
      // Whistle before medal — "whistle is ready" beats a trophy for Game Day.
      const sportsPrefer = [
        'sports-whistle', 'sport-gold-medal', 'sport-basketball', 'sport-soccer',
      ];
      const themePrefer = [
        'orchestra', 'grand-piano', 'piano', 'violin', 'cello', 'guitar', 'flute',
        'musician-conductor', 'conductor', 'trumpet', 'harp', 'desk', 'compose-desk',
        'castle', 'dentist', 'face-blank', 'trampoline',
        'beach-sandcastle', 'beach-umbrella', 'beach-seashell',
      ];
      // Desk/piano/orchestra captions: match caption only — lesson title often says orchestra.
      // Feelings captions stay caption-local so "check a worksheet" cannot steal a checkmark.
      // Sports uses the full cue (story body names whistle/ball) — captions are often generic.
      const captionLocal = deskScene || pianoScene || orchestraScene || feelingsScene || beachScene;
      const hay = captionLocal ? caption : cueLower;
      const preferList = deskScene
        ? deskPrefer
        : pianoScene
          ? pianoPrefer
          : orchestraScene
            ? orchestraPrefer
            : feelingsScene
              ? feelingsPrefer
              : beachScene
                ? beachPrefer
                : sportsScene
                  ? sportsPrefer
                  : themePrefer;
      let prefer = preferList.filter((w) => hay.includes(w.replace(/^musician-/, '').replace(/^feeling-/, '').replace(/-/g, ' '))
        || hay.includes(w.split('-').pop()));
      // Force caption-local keys first (unshift reverses array order — concat instead).
      if (deskScene) {
        prefer = ['compose-desk', 'desk', ...prefer.filter((w) => w !== 'compose-desk' && w !== 'desk')];
      }
      if (pianoScene) {
        prefer = ['musician-piano', 'grand-piano', ...prefer.filter((w) => w !== 'musician-piano' && w !== 'grand-piano')];
      }
      if (orchestraScene) {
        prefer = [
          'musician-conductor', 'musician-violin', 'musician-cello',
          ...prefer.filter((w) => !/^musician-|^orchestra-stands$|^conductor-podium$/.test(w)),
        ];
      }
      if (feelingsScene) {
        prefer = [
          ...feelingsPrefer.filter((w) => hay.includes(w.replace(/^feeling-/, ''))),
          ...feelingsPrefer,
          ...prefer.filter((w) => !/^feeling-/.test(w)),
        ];
      }
      if (beachScene) {
        prefer = [
          ...beachPrefer,
          ...prefer.filter((w) => !/^beach-/.test(w)),
        ];
      }
      if (sportsScene) {
        prefer = [
          ...sportsPrefer,
          ...prefer.filter((w) => !/^sport|^soccer/.test(w)),
        ];
      }
      const stop = new Set([
        'with', 'from', 'that', 'this', 'have', 'sitting', 'local', 'near',
        'beautiful', 'musician', 'playing', 'performing',
        // "check a worksheet" must not resolve to a green checkmark badge (Manus Ssdp).
        'check', 'checking', 'together', 'students', 'student', 'partner',
        'smiled', 'explained', 'worksheet', 'looks', 'looking', 'left', 'her',
        // Generic place nouns that steal weird produce (Fruit stall → dragon-fruit).
        'stall', 'field', 'scene', 'picture', 'market', 'shop',
        // Ocean "wave" ≠ hair-long-blonde-wave dress part (beach S24).
        'wave', 'waves',
      ]);
      const captionWords = (caption.match(/\b[a-z]{4,}\b/g) || []).filter((w) => !stop.has(w));
      // Story-text nouns that are also taught vocab beat vague captions ("Fruit stall").
      const storyText = String(page?.text || '').toLowerCase();
      const vocabInStory = ((lesson && lesson.vocabulary) || [])
        .map((v) => (typeof v === 'string' ? v : v && v.word))
        .filter(Boolean)
        .map((w) => String(w).toLowerCase())
        .filter((w) => w.length >= 3 && storyText.includes(w) && !stop.has(w));
      // Caption words before theme prefer so scene text wins over title theme.
      // Vocab-in-story first so "apple and banana" beats caption "fruit".
      // Beach: prefer pack cutouts before vocab words (beach/sand have no head-noun hits).
      const tryWords = (beachScene || sportsScene
        ? [...prefer, ...vocabInStory, ...captionWords]
        : captionLocal
          ? [...vocabInStory, ...prefer, ...captionWords]
          : [...vocabInStory, ...captionWords, ...prefer]
      ).slice(0, 12);
      const exclude = [];
      const family = PB.familyFor ? PB.familyFor(lesson) : null;
      // Decorative/character packs (3D feeling faces, gashapon toy blobs) must not
      // become story art unless THIS lesson's topic invites them — a soccer beat
      // caption ("...felt worried") must not resolve to a 3D "worried" prop face.
      const decoOK = PB.decorativePacksFor ? PB.decorativePacksFor(lesson) : null;
      // Story side art is not a dock — allow sharp and soft props (conductor bust OK).
      const minScore = (PB.DEFAULT_MIN_SCORE != null) ? PB.DEFAULT_MIN_SCORE : 4;
      const sportStoryCue = /\b(sports?|basketball|soccer|football|tennis|baseball|volleyball|gym|athletic|team|score|court|hoops?|coach|whistle)\b/.test(cueLower);
      for (const w of tryWords) {
        const prop = PB.resolve({
          word: w,
          seed: cue + '|' + w,
          family,
          exclude,
          minScore,
        });
        if (!prop || !prop.path) continue;
        // White-plate densify cutouts look like stickers on the gray story card.
        if (prop.dockSafe === false) continue;
        if (window.VocabArt && typeof window.VocabArt.headNounOk === 'function'
          && !window.VocabArt.headNounOk(w, prop)) {
          continue;
        }
        // Sports "ball" must not land on sew-yarn-ball / cotton / disco (empty > wrong).
        if (sportStoryCue && /^(balls?)$/i.test(w)
          && /yarn|cotton|disco|foil|circus/.test(prop.key)) {
          continue;
        }
        // Prefer a real sport ball for basketball/soccer story beats only —
        // generic "Sports and Games" must not force a basketball over whistle.
        if (sportStoryCue && /^(balls?|basketball|soccer)$/i.test(w)) {
          const wantBb = /\bbasketball\b/.test(cueLower);
          const wantSoccer = /\b(soccer|football)\b/.test(cueLower) && !wantBb;
          const pin = PB.get && (
            wantBb
              ? (PB.get('sport-basketball') || PB.get('sports-basketball'))
              : wantSoccer
                ? (PB.get('sport-soccer') || PB.get('soccer-ball'))
                : null
          );
          if (pin && pin.path && pin.dockSafe !== false
            && (!exclude.includes(pin.key))) {
            exclude.push(pin.key);
            return { type: 'prop', src: pin.path, key: pin.key };
          }
        }
        exclude.push(prop.key);
        if (PB.isDecorativeProp && PB.isDecorativeProp(prop) && decoOK && !decoOK.has(prop.pack)) continue;
        // Desk caption must not settle on loose orchestra furniture.
        if (deskScene && /orchestra-stands|music-stand/.test(prop.key)) continue;
        // Orchestra/performance captions: musicians before bare stands.
        if (orchestraScene && /orchestra-stands|music-stand|conductor-podium/.test(prop.key)) continue;
        return { type: 'prop', src: prop.path, key: prop.key };
      }
      // Soft fallback: allow stands only after musician keys failed.
      if (orchestraScene) {
        for (const w of ['orchestra-stands', 'conductor-podium']) {
          const prop = PB.resolve({
            word: w, seed: cue + '|fb|' + w, family, exclude, minScore,
          });
          if (!prop || !prop.path) continue;
          if (window.VocabArt && typeof window.VocabArt.headNounOk === 'function'
            && !window.VocabArt.headNounOk(w, prop)) {
            continue;
          }
          return { type: 'prop', src: prop.path, key: prop.key };
        }
      }
    }
    const emoji = themeEmoji(cue);
    if (emoji) return { type: 'emoji', emoji };
    return { type: 'none' };
  }

  /**
   * Fill side/banner art. Do NOT use img() here — that helper defaults to
   * position:absolute (EDB piece overlay), which stacks the cutout on top of
   * the caption chip so red caption text bleeds through alpha props.
   * Prefer composable StoryScene when page.storyScene is set.
   */
  function storyEnvironmentKey(lesson, page) {
    if (!window.StoryScene || typeof window.StoryScene.environmentKeyForCue !== 'function') {
      return null;
    }
    const cue = [
      page && page.visualTheme,
      page && page.visualCaption,
      page && page.heading,
      page && page.text,
      lesson && lesson.title,
    ].filter(Boolean).join(' ');
    return window.StoryScene.environmentKeyForCue(
      cue,
      (key) => window.PropBank && window.PropBank.get ? window.PropBank.get(key) : null
    );
  }

  function fillStoryArtSlot(slot, lesson, page, bigEmoji) {
    slot.innerHTML = '';
    // Keep dataset.storyArt as the numeric page index for applyStoryArt —
    // never overwrite it with 'none' / delete it (that breaks StoryArt swaps).

    if (page && page.storyScene && window.StoryScene && window.PropBank) {
      const composed = fillStorySceneStage(
        slot,
        page.storyScene,
        bigEmoji,
        storyEnvironmentKey(lesson, page)
      );
      if (composed) return composed;
    }

    const vis = storyFallbackVisual(lesson, page);
    if (vis.type === 'prop') {
      slot.dataset.storyProp = vis.key || '1';
      delete slot.dataset.storyArtFallback;
      delete slot.dataset.storyScene;
      // Transparent holder — PropBank cutouts already have alpha. A hard white
      // plate behind them read as an uncropped sticker on the gray story card
      // (Sports "Big Game Day" basketball). Caption chip stays white separately.
      const plate = el('div', {
        flex: '1',
        minHeight: '0',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        borderRadius: '14px',
        position: 'relative',
        zIndex: '1',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: bigEmoji ? '10px' : '8px',
      });
      const i = document.createElement('img');
      i.src = vis.src;
      i.alt = '';
      Object.assign(i.style, {
        // Auto size + max bounds — width/height 100% + contain still looked
        // stretched in wide story banners when the plate flexed oddly.
        width: 'auto',
        height: 'auto',
        maxWidth: '100%',
        maxHeight: bigEmoji ? '220px' : '150px',
        objectFit: 'contain',
        display: 'block',
        position: 'relative',
        pointerEvents: 'none',
      });
      plate.appendChild(i);
      slot.appendChild(plate);
      return vis;
    }
    delete slot.dataset.storyProp;
    delete slot.dataset.storyScene;
    if (vis.type === 'none' || !vis.emoji) {
      // Caption-only plate — no fake book / bullet.
      slot.dataset.storyArtFallback = 'none';
      slot.appendChild(el('div', {
        flex: '1',
        minHeight: bigEmoji ? '120px' : '80px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
        position: 'relative',
        zIndex: '1',
      }));
      return vis;
    }
    delete slot.dataset.storyArtFallback;
    slot.appendChild(el('div', {
      fontSize: bigEmoji ? '96px' : '64px',
      lineHeight: '1',
      marginBottom: bigEmoji ? '14px' : '0',
      opacity: bigEmoji ? '1' : '0.85',
      position: 'relative',
      zIndex: '1',
    }, vis.emoji));
    return vis;
  }

  /** Layer PropBank cutouts into the story art slot using StoryScene templates. */
  function fillStorySceneStage(slot, storyScene, bigEmoji, environmentKey) {
    const stageW = bigEmoji ? 480 : 1000;
    const stageH = bigEmoji ? 380 : 120;
    const result = window.StoryScene.compose(storyScene, {
      stageW,
      stageH,
      propGet: (k) => window.PropBank.get(k),
      propSrc: (k, prop) => {
        const p = prop || window.PropBank.get(k);
        return p && p.path ? p.path : null;
      },
      environmentKey,
    });
    if (!result.layers.length) return null;

    slot.dataset.storyScene = String(storyScene.templateId || '1');
    if (result.warnings && result.warnings.length) {
      slot.dataset.storySceneWarn = result.warnings.join(' | ');
    } else {
      delete slot.dataset.storySceneWarn;
    }
    if (result.storyActionContract) {
      slot.dataset.storyActionContract = JSON.stringify(result.storyActionContract);
    } else {
      delete slot.dataset.storyActionContract;
    }
    delete slot.dataset.storyProp;
    delete slot.dataset.storyArtFallback;

    const stage = el('div', {
      flex: '1',
      minHeight: bigEmoji ? '240px' : '100px',
      width: '100%',
      position: 'relative',
      zIndex: '1',
      overflow: 'hidden',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.35)',
      boxSizing: 'border-box',
    });
    stage.dataset.storySceneStage = '1';
    for (const layer of result.layers) {
      const img = document.createElement('img');
      img.src = layer.src;
      img.alt = '';
      img.dataset.storyLayer = layer.slot || '';
      img.dataset.propKey = layer.key || '';
      if (layer.scaleClass) img.dataset.scaleClass = layer.scaleClass;
      if (layer.envMode) img.dataset.envMode = layer.envMode;
      const origin = layer.slot === 'item' || (layer.scaleClass === 'held')
        ? 'center center'
        : 'center bottom';
      Object.assign(img.style, {
        position: 'absolute',
        left: `${(100 * layer.x) / stageW}%`,
        top: `${(100 * layer.y) / stageH}%`,
        width: `${(100 * layer.w) / stageW}%`,
        height: `${(100 * layer.h) / stageH}%`,
        objectFit: layer.objectFit || 'contain',
        objectPosition: layer.objectPosition || (origin.includes('bottom') ? 'bottom center' : 'center'),
        pointerEvents: 'none',
        zIndex: String(layer.z || 1),
        transform: layer.flip ? 'scaleX(-1)' : 'none',
        transformOrigin: origin,
      });
      stage.appendChild(img);
    }
    slot.appendChild(stage);
    return {
      type: 'scene',
      templateId: result.templateId,
      layerCount: result.layers.length,
      environmentKey: result.environmentKey || null,
      actionContract: result.storyActionContract || null,
      warnings: result.warnings || [],
    };
  }

  function storyCaptionChip(text, opts) {
    const o = opts || {};
    // Charcoal ink on white chip — palette-cohesive (Manus soft); keep white plate
    // so StoryArt swap can still find the caption sibling.
    const chip = el('div', {
      background: '#ffffff',
      color: '#1e293b',
      borderRadius: '12px',
      padding: o.compact ? '8px 12px' : (o.padding || '10px 14px'),
      fontSize: o.fontSize || '22px',
      fontWeight: '700',
      textAlign: o.textAlign || 'center',
      width: '100%',
      boxSizing: 'border-box',
      lineHeight: o.lineHeight || '1.3',
      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
      flexShrink: '0',
      marginTop: o.marginTop || '0',
      marginBottom: o.marginBottom || '0',
      position: 'relative',
      zIndex: '2',
    }, esc(text));
    chip.dataset.storyCaptionChip = '1';
    return chip;
  }

  function makeStoryPage(lesson, page, index, boardPlan, opts) {
    const pageKey = 'story' + index;
    const p = pageShell(THEME_COLORS.story, {
      reserveDock: hasRecipe(boardPlan, pageKey), pageType: 'story',
    });
    const content = el('div', {
      position: 'relative', zIndex: '1',
      display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box',
    });
    const totalBeats = Math.max(1, Number(opts && opts.total) || 1);
    const heading = String(page?.heading || '').trim();
    const title = index === 0
      ? `Story: ${lesson.story?.title || 'Let\'s Read!'}${heading ? ` · ${heading}` : ''}`
      : `Story · ${index + 1}/${totalBeats}: ${heading || 'Next'}`;
    const titleEl = header(title, '#c2410c', { timing: timingChip(4) });
    titleEl.style.textShadow = '0 1px 0 #fff, 0 2px 10px rgba(255,255,255,0.85)';
    titleEl.style.position = 'relative';
    titleEl.style.zIndex = '2';
    content.appendChild(titleEl);

    const storyText = String(page?.text || '');
    const solo = !!(opts && opts.solo);
    const sourceIndex = Number.isFinite(Number(page && page._sourceIndex))
      ? Number(page._sourceIndex)
      : index;
    // Fit type to the board — solo+banner used to ship 56px and clip mid-clause
    // ("…he loves to") behind overflow:hidden (clubs board-preview miss).
    function storyBodyFontPx(text, isSolo) {
      const n = String(text || '').length;
      if (isSolo) {
        if (n <= 80) return 36;
        if (n <= 120) return 30;
        if (n <= 180) return 26;
        if (n <= 260) return 22;
        if (n <= 360) return 20;
        return 18;
      }
      if (n <= 50) return 44;
      if (n <= 100) return 36;
      if (n <= 160) return 30;
      if (n <= 240) return 26;
      return 22;
    }
    const textSize = storyBodyFontPx(storyText, solo);

    // Every story page is one integrated illustrated beat. The picture owns
    // the board; narration is the one preserved caption inside the same frame.
    const moment = el('div', {
      flex: '1 1 0%',
      minHeight: '360px',
      borderRadius: '20px',
      overflow: 'hidden',
      background: 'linear-gradient(200deg, #fffaf2, #fed7aa)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '10px',
      padding: '12px',
      boxSizing: 'border-box',
      position: 'relative',
      boxShadow: '0 8px 24px rgba(124,45,18,0.14)',
    });
    moment.dataset.storyArt = String(sourceIndex);
    moment.dataset.storyArtMode = 'side';
    moment.dataset.storyMoment = '1';
    fillStoryArtSlot(moment, lesson, page, true);
    const narration = storyCaptionChip(storyText || 'Read together.', {
      fontSize: `${textSize}px`,
      lineHeight: '1.35',
      padding: storyText.length <= 120 ? '14px 22px' : '10px 18px',
      textAlign: 'left',
    });
    narration.dataset.storyBody = '1';
    narration.dataset.storyNarration = '1';
    moment.appendChild(narration);
    content.appendChild(moment);
    p.appendChild(content);
    drawDebugZones(p, 'story');
    return p;
  }

  function makeComprehension(lesson) {
    const p = pageShell(THEME_COLORS.comp, { pageType: 'comprehension' });
    const col = chromeColumn(p);
    col.appendChild(header('Reading Comprehension', '#1d4ed8', { timing: timingChip(6) }));
    col.appendChild(hint('Answer in full sentences in the space under each question.', {
      marginBottom: '6px', flexShrink: '0',
    }));
    // Up to 3 on the board (Manus: 3–4; 4 rows crush type on 590px). But the visible 3
    // must include a higher-order (inferential/evaluative) question — recall-only crushes
    // the grammar/ZPD tie-in (Manus QCVsgMcb). If the top-3 are all recall and a later
    // question is inferential, swap it into the last slot instead of dropping it.
    const allComp = comprehensionQuestions(lesson);
    const inferRe = /\b(why|what do you think|how do you know|how might|what would|what could|infer|imagine)\b/i;
    const compText = (q) => (typeof q === 'string' ? q : (q && q.question) || '');
    const questions = allComp.slice(0, 3);
    if (questions.length && !questions.some((q) => inferRe.test(compText(q)))) {
      const infer = allComp.find((q) => inferRe.test(compText(q)));
      if (infer) questions[questions.length - 1] = infer;
    }
    const rows = Math.max(1, questions.length || 1);
    const body = el('div', {
      flex: '1 1 0%',
      minHeight: '0',
      display: 'grid',
      // One question must own the full column — a spare 1fr row left half the board dead (M8).
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      // S61 (Judge B): 3 cards with 100px write floors + 16px gaps overflowed the
      // board and clipped Q3's write box off the bottom. Tighter gap keeps all
      // three fully on-board.
      gap: '12px',
      width: '100%',
      overflow: 'hidden',
    });
    if (!questions.length) {
      const empty = card(
        `<div style="font-size:28px;font-weight:800;color:#9f1239;line-height:1.35;text-align:center">No reading questions in this lesson.</div>
         <div style="font-size:22px;font-weight:600;color:#64748b;margin-top:12px;text-align:center;line-height:1.35">Teacher: add story.comprehensionQuestions (or regenerate).</div>`,
        { padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
      );
      empty.dataset.emptyComprehension = '1';
      body.appendChild(empty);
    } else {
      questions.forEach((q, i) => {
        const qCard = card(
          `<div style="font-size:28px;font-weight:800;line-height:1.2;color:#0f172a;margin-bottom:10px;flex-shrink:0">${i + 1}. ${esc(q.question || '')}</div>
           <div data-comp-write style="border:2px dashed #94a3b8;border-radius:14px;flex:1;min-height:60px;background:rgba(248,250,252,0.9)"></div>`,
          {
            padding: '14px 20px',
            marginBottom: '0',
            height: '100%',
            minHeight: '0',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }
        );
        // Big write region on purpose — not a sparse text card (M3).
        qCard.dataset.writeInStage = '1';
        body.appendChild(qCard);
      });
    }
    col.appendChild(body);
    drawDebugZones(p, 'comprehension');
    return p;
  }

  function makeCreative(lesson) {
    const p = pageShell(THEME_COLORS.creative, { pageType: 'creative' });
    const col = chromeColumn(p);
    col.appendChild(header('Your Ideas!', '#059669', { timing: timingChip(5) }));
    col.appendChild(hint('Open-ended — no single right answer. Write or draw in the box.', {
      marginBottom: '8px', flexShrink: '0',
    }));
    const ideas = (lesson.story?.creativeQuestions || []).slice(0, 2)
      .map((q, i) => ({ i, text: creativePromptText(q) }))
      .filter((x) => x.text);
    const rows = Math.max(1, ideas.length);
    const body = el('div', {
      flex: '1 1 0%',
      minHeight: '0',
      display: 'grid',
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: '16px',
      width: '100%',
    });
    ideas.forEach(({ i, text }) => {
      const ideaCard = card(
        `<div style="font-size:22px;color:#64748b;font-weight:700;margin-bottom:6px;flex-shrink:0">Idea ${i + 1}</div>
         <div style="font-size:30px;font-weight:800;color:#134e4a;line-height:1.22;margin-bottom:10px;flex-shrink:0">${esc(text)}</div>
         <div style="border:2px dashed #94a3b8;border-radius:14px;flex:1;min-height:100px;background:rgba(248,250,252,0.85)"></div>`,
        {
          padding: '22px 26px',
          marginBottom: '0',
          height: '100%',
          minHeight: '0',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }
      );
      ideaCard.dataset.writeInStage = '1';
      body.appendChild(ideaCard);
    });
    col.appendChild(body);
    drawDebugZones(p, 'creative');
    return p;
  }

  /** One speaking board page with 1–3 stacked questions; Peek sticky on Q1 when covered. */
  function makeSpeakingPage(items, pageIndex, totalPages, boardPlan, lesson) {
    const pageKey = 'speaking:' + pageIndex;
    const covered = hasRecipe(boardPlan, pageKey);
    const p = pageShell(THEME_COLORS.speak, {
      reserveDock: covered, pageType: 'speaking',
    });
    const col = chromeColumn(p);
    col.appendChild(header("Let's Talk!", '#15803d', { timing: timingChip(6) }));
    const boardWords = boardVocabList(lesson || {})
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .slice(0, 6);
    // True yes/no questions only — anchored at the start. The old \b test
    // matched "do you" anywhere, so a WH-question like "What do you take
    // camping?" also got the "Say: I like ___" frame bolted on, producing a
    // non-sequitur (Manus R2 campsite: semantic mismatch between question and
    // model-answer frame). A WH-opener always wins even if an aux follows it.
    const yesNoCue = items.some((item) => {
      const q = String(item.question || '').trim();
      if (/^(what|where|when|why|who|which|how)\b/i.test(q)) return false;
      return /^(do you|does (?:he|she|it)|did you|is (?:it|he|she|this|that)|are you|can you)\b/i.test(q);
    });
    const productionCue = yesNoCue && boardWords.length
      ? `Answer out loud, then say a sentence with one of today’s words (${boardWords.slice(0, 4).join(', ')})`
      : 'Answer out loud first';
    const sub = totalPages > 1
      ? `Part ${pageIndex + 1} of ${totalPages}`
      : productionCue;
    col.appendChild(hint(sub, {
      fontSize: '22px', marginBottom: covered ? '6px' : '12px', flexShrink: '0',
    }));
    // Three-beat contract (Manus R1 fruit-market fix): SAY → PEEL → COMPARE.
    // Replaces the buried "peel the sticky after the first answer" hint
    // clause with a visible stepper a child can follow without the teacher
    // explaining it first.
    if (covered) {
      const stepChip = (n, label) => el('span', {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '15px',
        fontWeight: '800',
        color: '#15803d',
        background: '#f0fdf4',
        border: '1.5px solid #86efac',
        flexShrink: '0',
      }, `${n} · ${label}`);
      const stepArrow = () => el('span', {
        color: '#86efac', fontWeight: '800', fontSize: '16px', flexShrink: '0',
      }, '→');
      const stepper = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '10px', flexShrink: '0',
      });
      stepper.appendChild(stepChip(1, 'SAY'));
      stepper.appendChild(stepArrow());
      stepper.appendChild(stepChip(2, 'PEEL'));
      stepper.appendChild(stepArrow());
      stepper.appendChild(stepChip(3, 'COMPARE'));
      col.appendChild(stepper);
    }
    // Blank only — never prefill boardWords[0] (models *I like ball*).
    const speakFrameHtml = (yesNoCue && boardWords.length)
      ? `<div style="font-size:22px;font-weight:800;color:#14532d;line-height:1.3;margin-bottom:10px">Say: I like <span style="border-bottom:3px solid #86efac;padding:0 18px;min-width:4ch;display:inline-block">&nbsp;</span>. · Use one of today’s words.</div>`
      : '';

    // Covered pages keep a short Q1 card so the Peek sticky (fixed bay) doesn't
    // sit on chrome (H3). Uncovered pages stretch with write lines for M8 reach.
    if (covered) {
      items.forEach((item, qi) => {
        const showSticky = qi === 0;
        const qCard = card(
          `<div style="font-size:30px;font-weight:800;color:#14532d;line-height:1.25">${qi + 1}. ${esc(item.question || '')}</div>`,
          { padding: '16px 20px', marginBottom: showSticky ? '8px' : '14px', flexShrink: '0' }
        );
        qCard.dataset.writeInStage = '1';
        col.appendChild(qCard);
        if (showSticky) {
          // Keep in sync with EdbActivities.speakingFlapRect ribbon height —
          // the flap piece (drawn on top in the canvas pass) sits below this
          // ribbon so "MODEL ANSWER" stays visible pre-peel (Manus R1: card
          // read as a bare button with no reveal contrast).
          const RIBBON_H = 34;
          const r = (window.EdbActivities && window.EdbActivities.speakingCoverRect())
            || { x: 88, y: 240, w: 720, h: 132 };
          p.appendChild(el('div', {
            position: 'absolute',
            left: r.x + 'px',
            top: r.y + 'px',
            width: r.w + 'px',
            height: r.h + 'px',
            boxSizing: 'border-box',
            background: '#ffffff',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: '2',
            boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
            border: '2px solid #bbf7d0',
            overflow: 'hidden',
          }));
          const modelCard = p.lastChild;
          modelCard.appendChild(el('div', {
            height: RIBBON_H + 'px',
            flexShrink: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: '#dcfce7',
            borderBottom: '2px solid #bbf7d0',
            fontSize: '16px',
            fontWeight: '800',
            color: '#166534',
            letterSpacing: '0.02em',
          }, '✓ MODEL ANSWER'));
          const answerZone = el('div', {
            flex: '1 1 0%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 18px',
          });
          answerZone.appendChild(el('div', {
            fontSize: '22px',
            fontStyle: 'italic',
            color: '#166534',
            textAlign: 'center',
            lineHeight: '1.25',
          }, esc(item.sampleAnswer || '')));
          modelCard.appendChild(answerZone);
          col.appendChild(el('div', { height: Math.max(96, r.h + 16) + 'px', marginBottom: '8px', flexShrink: '0' }));
        }
      });
      // Production frame + Compare prompt sit in Notes (below the model-answer
      // card) so they never trip H3. Blank is deliberately small now — the
      // page's job is SAY → PEEL → COMPARE, not a worksheet writing block
      // (Manus R1: shrink worksheet-like notes / repurpose as comparison).
      const notes = card(
        `${speakFrameHtml}<div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px;flex-shrink:0">
           <span style="font-size:20px;font-weight:800;color:#166534">3 · Compare:</span>
           <span style="font-size:17px;font-weight:800;color:#166534;background:#dcfce7;border:1.5px solid #86efac;border-radius:999px;padding:4px 14px">Same ✓</span>
           <span style="font-size:17px;font-weight:700;color:#78350f;background:#fef3c7;border:1.5px solid #fde68a;border-radius:999px;padding:4px 14px">Different — try again</span>
         </div>
         <div style="font-size:17px;font-weight:700;color:#64748b;margin-bottom:6px;flex-shrink:0">Write one more answer:</div>
         <div style="border:2px dashed #86efac;border-radius:14px;flex:1;min-height:44px;background:#f0fdf4;background-color:#f0fdf4"></div>`,
        {
          flex: '1 1 0%',
          marginBottom: '0',
          minHeight: '130px',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }
      );
      notes.dataset.writeInStage = '1';
      if (speakFrameHtml) notes.dataset.speakFrame = '1';
      col.appendChild(notes);
    } else {
      if (speakFrameHtml) {
        const frameChip = card(speakFrameHtml, {
          padding: '12px 16px', marginBottom: '12px', flexShrink: '0',
          background: '#f0fdf4', border: '1px solid #86efac',
        });
        frameChip.dataset.speakFrame = '1';
        col.appendChild(frameChip);
      }
      const rows = Math.max(1, items.length);
      const body = el('div', {
        flex: '1 1 0%',
        minHeight: '0',
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '12px',
        width: '100%',
      });
      items.forEach((item, qi) => {
        const qCard = card(
          `<div style="font-size:30px;font-weight:800;color:#14532d;line-height:1.25;flex-shrink:0">${qi + 1}. ${esc(item.question || '')}</div>
           <div style="border:2px dashed #86efac;border-radius:14px;flex:1;min-height:72px;margin-top:12px;background:rgba(240,253,244,0.85)"></div>`,
          {
            padding: '16px 20px',
            marginBottom: '0',
            height: '100%',
            minHeight: '0',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }
        );
        qCard.dataset.writeInStage = '1';
        body.appendChild(qCard);
      });
      col.appendChild(body);
    }

    drawDebugZones(p, 'speaking');
    return p;
  }

  function makeActivity(lesson, boardPlan) {
    const interactive = hasRecipe(boardPlan, 'activity');
    const isKing = recipeIdFor(boardPlan, 'activity') === 'heroProp';
    const pageType = isKing ? 'heroStage' : 'activity';
    const p = pageShell(THEME_COLORS.activity, {
      reserveDock: interactive, pageType,
    });
    if (isKing) {
      // Chrome stays tiny — the stage hero + roleplay dock are the page.
      const faceCueStr = [
        lesson.title, lesson.activity?.title, lesson.activity?.prompt,
        ...(lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)),
      ].filter(Boolean).join(' ');
      const faceKing = recipeIdFor(boardPlan, 'activity') === 'heroProp'
        && (window.LessonTraits
          ? window.LessonTraits.isFaceCue(faceCueStr)
          : /face|hair|eyes|make.?a.?face/i.test(faceCueStr));
      const actAssign = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
      const actHeroKey = actAssign && actAssign.ctx && actAssign.ctx.hero && actAssign.ctx.hero.key;
      const kingMission = window.LessonTraits && window.LessonTraits.kingMissionFor
        ? window.LessonTraits.kingMissionFor(faceCueStr, { heroKey: actHeroKey })
        : (lesson.activity?.title || 'Build the World!');
      // One integrated tray makes the source area obvious without turning the
      // king page into a worksheet. Board pieces render above this quiet plate.
      const kingDockTray = el('div', {
        position: 'absolute',
        left: '14px',
        right: '14px',
        bottom: '8px',
        height: '184px',
        zIndex: '1',
        borderRadius: '22px',
        border: '2px solid rgba(148,163,184,0.42)',
        background: 'rgba(248,250,252,0.72)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 5px 18px rgba(15,23,42,0.08)',
      });
      kingDockTray.dataset.kingDockTray = '1';
      p.appendChild(kingDockTray);
      // Ink-tagged so applyInkPolicy can lift contrast on busy scene BGs (Manus).
      // Timing chip required on king/activity headers too (Manus S29 / gate hole).
      const kingRow = el('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '4px',
        maxWidth: '520px',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: '4',
      });
      const kingTitle = el('div', {
        color: '#0f172a',
        fontSize: '22px',
        fontWeight: '800',
        lineHeight: '1.2',
      }, esc(kingMission));
      kingTitle.dataset.ink = 'heading';
      kingRow.appendChild(kingTitle);
      const kingTiming = el('div', {
        fontSize: '22px',
        fontWeight: '700',
        color: '#334155',
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(148,163,184,0.7)',
        borderRadius: '999px',
        padding: '4px 12px',
        lineHeight: '1.2',
        flexShrink: '0',
      }, timingChip(10));
      kingTiming.dataset.ink = 'hint';
      kingTiming.dataset.timingChip = '1';
      kingRow.appendChild(kingTiming);
      p.appendChild(kingRow);
      // Hint must match the king — clinic default must not leak onto castle/face/etc.
      const kingCue = [
        lesson.title, lesson.activity?.title, lesson.activity?.prompt,
        ...(lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)),
      ].filter(Boolean).join(' ').toLowerCase();
      // Never say "toys" on language boards (Manus) — name the pieces + require
      // a speaking/writing beat so drag isn't the only "output".
      // Feelings before faceKing: emotion lessons reuse face-blank but dock is feeling-*.
      const feelingsKing = window.LessonTraits
        ? window.LessonTraits.isFeelingsCue(kingCue)
        : (/\b(feeling|feelings|emotion|emotions|mood)\b/.test(kingCue)
          || (/\b(worried|scared|shy|confused|proud|surprised|happy|sad|angry|bored|sleepy|excited|tired)\b/.test(kingCue)
            && !/\b(hair|eyes|nose|ear|ears|make.?a.?face)\b/.test(kingCue)));
      // Per-topic king hint now lives in LessonTraits.KING_HINTS (data table) so a
      // new topic is a row, not another else-if. feelings/face still decided here
      // (they depend on plan state, not just the cue) and passed in. Inline cascade
      // kept as the identical fallback when the registry script is absent.
      let kingHint = window.LessonTraits
        ? window.LessonTraits.kingHintFor(kingCue, { feelingsKing, faceKing, heroKey: actHeroKey })
        : 'Drag the pieces onto the stage. Then say or write one sentence about your idea.';
      if (!window.LessonTraits) {
        if (feelingsKing) {
          // Two-round Feelings Lab (Manus ZPD / classical Level-Up generalization).
          // Two skimmable lines (round-2 Judge B: one dense paragraph was hard from the
          // back). Round 2 reworded — the face is visible, so the partner READS it and
          // names the feeling; there is nothing hidden to "guess" (round-2 Judge A).
          kingHint = '<b>Round 1:</b> drag a feeling face onto the blank face; write or say how it feels.<br><b>Round 2:</b> your partner reads the face, names the feeling, then answers with If I felt ____, I would ____.';
        } else if (faceKing) {
          kingHint = 'Drag eyes, nose, mouth, and hair onto the face. Then say: My friend has ___';
        } else if (/\b(dentist|dental|tooth|teeth|cavity|floss)\b/.test(kingCue)
          || /\b(doctor|clinic|hospital|nurse|medical|checkup|diagnosis)\b/.test(kingCue)) {
          kingHint = 'Drag tools onto the patient. Then say what you used and why.';
        } else if (/\b(castle|knight|dragon|royal|fortress|portcullis)\b/.test(kingCue)) {
          kingHint = 'Drag pieces onto the castle. Then say what you built.';
        } else if (/\b(trampoline|bounce|backflip)\b/.test(kingCue)) {
          kingHint = 'Drag pieces onto the trampoline. Then say your bounce plan.';
        } else if (/\b(music|compose|composer|orchestra|symphony|concert|classical|melody|harmony|piano|violin)\b/.test(kingCue)) {
          kingHint = 'Drag musicians onto the stage. Then write or say your symphony idea in 1–2 sentences.';
        }
      }
      // Frosted instruction plate — projection-readable on busy terrace scenes (Manus).
      // Wider than the old 420px cramped panel but must clear the centre hero
      // face (widening into the middle overlapped the blank head). Fill the empty
      // LEFT-column vertical space instead: bigger type, more line-height, a few
      // comfortable lines stacking downward.
      // Wide stage heroes (hospital-bed ~1.7 aspect) cover the left column —
      // keep the hint card above the prop so teachers can still read the cue.
      const kingHintEl = hint(kingHint, {
        textAlign: 'left',
        fontSize: '24px',
        lineHeight: '1.45',
        maxWidth: '420px',
        marginBottom: '12px',
        background: 'rgba(248,250,252,0.96)',
        border: '1px solid rgba(148,163,184,0.65)',
        borderRadius: '14px',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.10)',
        color: '#0f172a',
        position: 'relative',
        zIndex: '4',
      });
      kingHintEl.dataset.kingHintCard = '1';
      p.appendChild(kingHintEl);
      const kingPayoff = el('div', {
        position: 'absolute',
        right: '22px',
        top: '16px',
        zIndex: '4',
        color: '#0f766a',
        background: 'rgba(240,253,250,0.94)',
        border: '2px solid rgba(13,148,136,0.5)',
        borderRadius: '999px',
        padding: '8px 15px',
        fontSize: '18px',
        fontWeight: '900',
        letterSpacing: '0.8px',
        boxShadow: '0 4px 14px rgba(15,23,42,0.10)',
      }, 'BUILD → POINT → SAY');
      kingPayoff.dataset.kingPayoff = '1';
      p.appendChild(kingPayoff);
      // Write strip whenever the hint asks write/say — music skipKing (S39) and
      // feelings Lab on face-blank (Manus kS8Er B1). Feelings: flow under the
      // hint card so absolute strip cannot cover Round 1/2 text (layout collide).
      const skipKing = !!(actAssign && actAssign.ctx && actAssign.ctx.skipKing);
      if ((skipKing || feelingsKing) && /write or say|say or write/i.test(kingHint)) {
        const strip = el('div', feelingsKing ? {
          position: 'relative',
          width: '420px',
          maxWidth: '100%',
          marginBottom: '10px',
          zIndex: '3',
          background: 'rgba(248,250,252,0.98)',
          border: '2px dashed rgba(51,65,85,0.55)',
          borderRadius: '14px',
          padding: '12px 14px',
          boxSizing: 'border-box',
          color: '#0f172a',
          fontSize: '22px',
          fontWeight: '700',
          lineHeight: '1.45',
          boxShadow: '0 2px 10px rgba(15,23,42,0.14)',
        } : {
          position: 'absolute',
          left: '28px',
          top: '128px',
          width: '460px',
          zIndex: '3',
          background: 'rgba(248,250,252,0.98)',
          border: '2px dashed rgba(51,65,85,0.55)',
          borderRadius: '14px',
          padding: '14px 16px',
          boxSizing: 'border-box',
          color: '#0f172a',
          fontSize: '22px',
          fontWeight: '700',
          lineHeight: '1.45',
          boxShadow: '0 2px 10px rgba(15,23,42,0.14)',
        });
        strip.dataset.prodWrite = '1';
        strip.dataset.ink = 'hint';
        strip.innerHTML = feelingsKing
          ? 'This face feels:<br><span style="display:block;margin-top:10px;border-bottom:2px solid #94a3b8;min-height:28px"></span><span style="display:block;margin-top:12px;border-bottom:2px solid #94a3b8;min-height:28px"></span>'
          : 'My symphony idea:<br><span style="display:block;margin-top:10px;border-bottom:2px solid #94a3b8;min-height:28px"></span><span style="display:block;margin-top:12px;border-bottom:2px solid #94a3b8;min-height:28px"></span>';
        p.appendChild(strip);
      }
      drawDebugZones(p, pageType);
      return p;
    }
    // Recipe owns the mechanic — never keep a fixture "Match each picture" prompt
    // when the board actually shipped sortBins / buildScene (soccer hollow loop).
    const actRecipe = recipeIdFor(boardPlan, 'activity');
    const EA = window.EdbActivities;
    const matchDockHint = (boardPlan && boardPlan.matchDockHint)
      || (EA && EA.matchDockStudentHint && EA.matchDockStudentHint(boardPlan && boardPlan.vocabArt))
      || 'Say each word. Look at the picture beside it.';
    const actAssign = (boardPlan && boardPlan.assignments || [])
      .find((a) => a && a.pageKey === 'activity');
    const activityCtx = (actAssign && actAssign.ctx) || {};
    const oddRuleHint = actAssign && actAssign.ctx && actAssign.ctx.ruleHint
      ? String(actAssign.ctx.ruleHint).trim()
      : '';
    const recipeHint = {
      sortBins: 'Sort each word card into a bin. Say why it belongs there.',
      buildScene: 'Drag the pieces into the scene. Say a sentence with each word.',
      dressUp: 'Add the pieces to the character. Say what you added.',
      matchDock: matchDockHint,
      mysteryHints: 'Guess the word. Peel a hint if you need help.',
      silhouetteGate: 'Guess from the mystery shape. Peel hints if you need help. Then say the word.',
      halfTruthBoard: 'Read the claim. Look at the evidence. Drag TRUE, HALF TRUE, or FALSE onto a pad. Peel the answer.',
      sceneRepair: 'Spot it → move it → repair it → explain why.',
      capacityPack: `Pack exactly ${activityCtx.limit || 3}. Say: “I pack ___ because ___.” Then: “I leave out ___ because ___.”`,
      routeMission: 'Arrange START to FINISH. Say: First… Next… Then… Finally… Lift to reveal.',
      transformationLab: 'Choose a cause. Put it in the middle. Say: I predict ___ because ___. Then peel the result.',
      evidenceBoard: 'Inspect each SOURCE ARTIFACT. File clues strongest to weakest using SOURCE QUALITY + CLAIM IMPACT. Then peel the sealed verdict.',
      oddOneOut: oddRuleHint
        || "Find the odd one out. Drag it to Doesn't fit. Write why.",
      yesNoSort: oddRuleHint
        || 'Sort each card into YES or NO. Say why.',
      thisOrThat: 'Pick one. Say your sentence with the word you chose.',
      fixSentence: 'Fix the sentence. Drag the right word into the blank. Say the fixed sentence out loud.',
    }[actRecipe];
    const activityTitle = actRecipe === 'sortBins'
      ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
        ? lesson.activity.title
        : 'Sort the words')
      : actRecipe === 'mysteryHints'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Mystery word')
      : actRecipe === 'silhouetteGate'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Mystery shape')
      : actRecipe === 'halfTruthBoard'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Half-truth check')
      : actRecipe === 'sceneRepair'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Find the mistake')
      : actRecipe === 'capacityPack'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Pack the mission')
      : actRecipe === 'routeMission'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Route mission')
      : actRecipe === 'transformationLab'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Transformation lab')
      : actRecipe === 'evidenceBoard'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Evidence board')
      : actRecipe === 'oddOneOut'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Odd one out')
      : actRecipe === 'yesNoSort'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Yes or no?')
      : actRecipe === 'thisOrThat'
        ? (lesson.activity?.title && !/match|this\s*or\s*that/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Which one?')
      : actRecipe === 'fixSentence'
        ? (lesson.activity?.title && !/match/i.test(lesson.activity.title)
          ? lesson.activity.title
          : 'Fix the sentence')
      : (lesson.activity?.title || 'Your Turn!');
    p.appendChild(header(activityTitle, '#4338ca', { timing: timingChip(10) }));
    p.appendChild(hint(esc(recipeHint || lesson.activity?.prompt || 'Work with a partner.'), {
      textAlign: 'left', lineHeight: '1.35', maxWidth: interactive ? '680px' : '100%',
    }));
    // Recipes that own the play surface (sortBins / dressUp / buildScene /
    // matchDock / mysteryHints / oddOneOut / yesNoSort / thisOrThat / fixSentence)
    // already fill targetBay+dock — stacking frame templates on top reads as a
    // second job and leaves a dead right column.
    const recipeOwnsPlay = actRecipe === 'sortBins' || actRecipe === 'dressUp'
      || actRecipe === 'buildScene' || actRecipe === 'matchDock'
      || actRecipe === 'mysteryHints' || actRecipe === 'silhouetteGate'
      || actRecipe === 'halfTruthBoard' || actRecipe === 'sceneRepair'
      || actRecipe === 'capacityPack' || actRecipe === 'routeMission'
      || actRecipe === 'transformationLab' || actRecipe === 'evidenceBoard'
      || actRecipe === 'oddOneOut'
      || actRecipe === 'yesNoSort'
      || actRecipe === 'thisOrThat'
      || actRecipe === 'fixSentence';
    if (!recipeOwnsPlay) {
      // Cap templates when interactive so DOM cards stay inside bodyText (H3 / collision).
      const maxTemplates = interactive ? 3 : 5;
      const list = el('div', {
        maxWidth: interactive ? '680px' : '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      });
      (lesson.activity?.templates || []).slice(0, maxTemplates).forEach((t, i) => {
        list.appendChild(card(
          `<div style="font-size:22px;font-weight:700;line-height:1.3">${i + 1}. ${esc(t)}</div>`,
          { padding: '14px 18px', marginBottom: '0' }
        ));
      });
      p.appendChild(list);
    }
    drawDebugZones(p, 'activity');
    return p;
  }

  /** Honest grammar-aim copy from the frames actually on the board (Manus S31 / Ehp2 B2). */
  function grammarAimLine(frames) {
    const list = (frames || []).map((f) => String(f || ''));
    const hasWill = list.some((f) => /\bI will\b|\bwill\b/i.test(f) && /\bif\b/i.test(f));
    // ESL label: If…, I would… = second conditional (Manus: name it explicitly).
    const hasWould = list.some((f) => /\bwould\b/i.test(f) && /\bif\b/i.test(f));
    const hasPlanning = list.some((f) => /planning to|I believe|most important/i.test(f));
    const hasSequence = list.some((f) => /\b(first|then|next|after|until)\b/i.test(f));
    const hasHave = list.some((f) => /\bi have\b|\bmy _{2,}|\bhave _{2,}/i.test(f)
      || /\bmy ____\b/i.test(f));
    const hasSee = list.some((f) => /\bi see\b|\bthere is\b|\bat the _{2,}/i.test(f)
      || /\bthe _{2,} is\b/i.test(f)
      || /\bis (big|small|red|blue|fresh|yellow|orange|sour)\b/i.test(f));
    // "Pass the ball" is sports vocab, not a polite request — need please / can I/you.
    const hasRequest = list.some((f) =>
      /\bplease\b|\bcan i (have|get)\b|\bcan you (pass|help|give)\b|\bpass me\b|\bmay i\b/i.test(f)
    );
    const hasHygiene = list.some((f) => /\bmy teeth\b|\bevery day\b|\bto _{2,}|\bfloss\b|\bbrush\b/i.test(f)
      || /\bgo to the dentist\b/i.test(f));
    const hasAdj = list.some((f) => /\b(feel|feels|am|is|are) _{2,}/i.test(f)
      || /\bvery _{2,}/i.test(f));
    const bits = [];
    if (hasWill) bits.push('first conditional (If…, I will…)');
    if (hasWould) bits.push('second conditional (If…, I would…)');
    if (hasHave) bits.push('have / possession frames');
    if (hasSee) bits.push('see / naming frames');
    if (hasRequest) bits.push('polite request frames');
    if (hasHygiene) bits.push('purpose / hygiene routines');
    if (hasAdj && !hasSee) bits.push('adjective / description frames');
    if (hasPlanning) bits.push('opinion / planning frames');
    if (hasSequence && !bits.length) bits.push('sequencing / action frames');
    // Never default to opinion/planning when frames don't support it
    // (Manus soccer S3G4 / fruit Y737 / gym D4PH).
    if (!bits.length) bits.push('the sentence frames on this page');
    // Title-loop R1: the label alone ("first conditional (If…, I will…)") reads
    // as producer jargon to a 7-year-old. Keep the named grammar family (whole-
    // lesson reviews want it explicit for teacher legibility) but anchor it with
    // one concrete, child-facing example pulled straight from a real frame.
    const example = list
      .map((f) => f.trim())
      .filter(Boolean)[0];
    if (example) {
      const clean = example.replace(/_{2,}/g, '___').replace(/[.!?]+$/, '');
      return `practise ${bits.join(' + ')} — like “${clean}.”`;
    }
    return `practise ${bits.join(' + ')}.`;
  }

  function makeWrap(lesson, boardPlan) {
    const interactive = hasRecipe(boardPlan, 'wrap');
    const p = pageShell(THEME_COLORS.wrap, {
      reserveDock: interactive, pageType: 'wrap',
    });
    p.style.display = 'flex';
    p.style.flexDirection = 'column';
    // Timing chip for ≥45 min pacing completeness (Manus 3Uc8 Soft High).
    p.appendChild(header('Wrap Up', '#f8fafc', { timing: timingChip(3) }));
    const aimWords = boardVocabList(lesson)
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
    const aims = aimWords.join(', ');
    const cues = chromeTopicCues(lesson, 3, { preferExact: true });
    const content = el('div', {
      flex: '1',
      minHeight: '0',
      display: 'flex',
      alignItems: 'stretch',
      gap: '10px',
      position: 'relative',
      zIndex: '1',
      boxSizing: 'border-box',
      padding: '18px',
      borderRadius: '28px',
      border: '3px solid #fbbf24',
      background: 'linear-gradient(112deg, rgba(248,250,252,0.98) 0%, rgba(248,250,252,0.98) 68%, rgba(15,118,110,0.96) 68%, rgba(13,148,136,0.92) 100%)',
      boxShadow: '0 22px 48px rgba(2,6,23,0.28)',
    });
    const payoff = el('div', {
      width: '300px',
      flexShrink: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      padding: '8px 10px',
    });
    payoff.dataset.wrapPayoff = '1';
    // Topic-native payoff badge — Manus wrap-loop R1 wanted a visual asset tied
    // to the topic confirming completion, not a bare generic numeral.
    const wrapCharmSrc = titleCharmSrc(lesson);
    const badge = el('div', {
      position: 'relative',
      width: '82px',
      height: '82px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#134e4a',
      background: wrapCharmSrc ? '#fff' : '#fef3c7',
      border: '7px solid rgba(255,255,255,0.85)',
      boxShadow: '0 12px 28px rgba(2,6,23,0.24)',
      fontSize: '44px',
      fontWeight: '900',
      lineHeight: '1',
      overflow: 'hidden',
    });
    if (wrapCharmSrc) {
      badge.appendChild(img(wrapCharmSrc, {
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }));
      const numChip = el('div', {
        position: 'absolute',
        right: '-4px',
        bottom: '-4px',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#134e4a',
        background: '#fef3c7',
        border: '3px solid #fff',
        fontSize: '16px',
        fontWeight: '900',
      }, '2');
      badge.appendChild(numChip);
    } else {
      badge.appendChild(document.createTextNode('2'));
    }
    payoff.appendChild(badge);
    payoff.appendChild(el('div', {
      color: '#fff',
      fontSize: '38px',
      fontWeight: '900',
      textAlign: 'center',
      lineHeight: '1.05',
      marginTop: '12px',
    }, 'High Five!'));
    payoff.appendChild(el('div', {
      color: '#ccfbf1',
      fontSize: '18px',
      fontWeight: '800',
      textAlign: 'center',
      marginTop: '5px',
      letterSpacing: '0.4px',
    }, 'After your sentence'));
    if (cues.length) {
      const cueRow = el('div', {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '14px',
      });
      cues.forEach((cue) => {
        const cueBubble = el('div', {
          width: '82px',
          height: '88px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '18px',
          background: 'rgba(255,255,255,0.94)',
          boxShadow: '0 8px 18px rgba(2,6,23,0.18)',
        });
        cueBubble.appendChild(img(cue.src, {
          position: 'relative',
          width: '48px',
          height: '48px',
          objectFit: 'contain',
        }));
        cueBubble.appendChild(el('div', {
          color: '#0f172a',
          fontSize: '12px',
          fontWeight: '900',
          lineHeight: '1.1',
          textAlign: 'center',
          marginTop: '3px',
          maxWidth: '74px',
        }, esc(cue.word)));
        cueRow.appendChild(cueBubble);
      });
      payoff.appendChild(cueRow);
    }
    if (aims) {
      const aimsLine = el('div', {
        color: '#ecfeff',
        fontSize: '14px',
        textAlign: 'center',
        marginTop: '9px',
        fontWeight: '700',
        lineHeight: '1.3',
      }, `Today we used: ${aims}`);
      aimsLine.dataset.wrapAims = '1';
      payoff.appendChild(aimsLine);
    }

    const ticket = el('div', {
      flex: '1',
      minWidth: '0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxSizing: 'border-box',
      padding: '8px 16px 8px 4px',
    });
    ticket.dataset.wrapTicket = '1';
    ticket.appendChild(el('div', {
      color: '#b45309',
      fontSize: '17px',
      fontWeight: '900',
      letterSpacing: '1.8px',
      textTransform: 'uppercase',
      textAlign: 'center',
    }, '1 · Exit ticket · one last win'));
    // One explicit proof action; the review cards below are language support.
    const peer = el('div', {
      color: '#0f172a', fontSize: '22px', textAlign: 'center', margin: '7px 8px 10px',
      fontWeight: '800', lineHeight: '1.3',
    }, aims
      ? 'Tell a partner one sentence using a word from today.'
      : 'Tell a partner one word or sentence you used well today.');
    peer.dataset.wrapPeer = '1';
    ticket.appendChild(peer);
    const review = (lesson.reviewSentences || []).slice(0, 3);
    review.forEach((s) => {
      ticket.appendChild(card(
        `<div style="font-size:21px;text-align:center;font-weight:800;line-height:1.25;color:#0f172a">${esc(s)}</div>`,
        {
          width: '100%',
          boxSizing: 'border-box',
          margin: '0 0 8px',
          padding: '10px 14px',
          border: '2px solid #e2e8f0',
          boxShadow: 'none',
        }
      ));
    });
    // Manus B3: exit must recycle all board-taught words, not only 3 sentences.
    const exitHay = review.join(' ').toLowerCase();
    const irregularPlural = {
      child: 'children',
      foot: 'feet',
      mouse: 'mice',
      person: 'people',
      tooth: 'teeth',
    };
    const exitMissing = boardVocabList(lesson)
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .filter((w) => {
        const word = String(w).toLowerCase();
        const forms = [word, `${word}s`, `${word}es`, irregularPlural[word]]
          .filter(Boolean)
          .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // "score" must match "scores" in review lines (exit recycle honesty).
        return !new RegExp(`\\b(?:${forms.join('|')})\\b`, 'i').test(exitHay);
      });
    if (exitMissing.length) {
      const also = card(
        `<div style="font-size:18px;text-align:center;font-weight:800;line-height:1.3;color:#0f172a">Word boost: ${esc(exitMissing.join(' · '))}</div>`,
        {
          width: '100%',
          boxSizing: 'border-box',
          margin: '0',
          padding: '9px 14px',
          background: '#fef3c7',
          border: '2px solid #fde68a',
          boxShadow: 'none',
        }
      );
      also.dataset.wrapExitAlso = '1';
      ticket.appendChild(also);
    }
    const proof = el('div', {
      color: '#0f766e',
      background: '#ccfbf1',
      border: '2px dashed #2dd4bf',
      borderRadius: '16px',
      padding: '11px 16px',
      marginTop: '12px',
      fontSize: '21px',
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: '0.2px',
    }, 'Say it → cross the finish line');
    proof.dataset.wrapProof = '1';
    ticket.appendChild(proof);
    content.appendChild(ticket);
    content.appendChild(el('div', {
      width: '44px',
      flexShrink: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f59e0b',
      fontSize: '42px',
      fontWeight: '900',
      textShadow: '0 2px 0 rgba(255,255,255,0.8)',
    }, '→'));
    content.appendChild(payoff);
    p.appendChild(content);
    p.appendChild(img('assets/04_decoration-ui/confetti.svg', {
      left: '18px', bottom: '12px', width: '104px', height: '104px', opacity: '0.72',
    }));
    p.appendChild(img('assets/04_decoration-ui/confetti.svg', {
      right: '18px', top: '18px', width: '104px', height: '104px', opacity: '0.72',
    }));
    drawDebugZones(p, 'wrap');
    return p;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** API schema uses strings; some fixtures use { question, sampleAnswer }. */
  function creativePromptText(q) {
    if (q == null) return '';
    if (typeof q === 'string') return q.trim();
    if (typeof q === 'object') {
      const t = q.question || q.prompt || q.text || '';
      return String(t).trim();
    }
    return String(q).trim();
  }

  /** Plan scene/flat picks and attach to boardPlan. Call before render for board exports. */
  async function attachBgPicks(lesson, meta, boardPlan) {
    if (!boardPlan) throw new Error('boardPlan required for background picks');
    if (!window.SceneBackgrounds) {
      throw new Error('SceneBackgrounds failed to load. Refresh and try again.');
    }
    const sections = buildSectionList(lesson, meta || {});
    const vocabWords = (lesson.vocabulary || [])
      .map((v) => (typeof v === 'string' ? v : v.word))
      .filter(Boolean);
    const bgPicks = await window.SceneBackgrounds.planFor(sections, {
      // Same lesson always lands on the same flats; different lessons do not.
      seed: lesson.title || '',
      // Title + vocab decide whether music/fantasy flats join the rotation.
      topicWords: [lesson.title || '', ...vocabWords],
      topicBrief: (lesson && lesson._topicBrief)
        || (window.TopicIdentity && window.TopicIdentity.ensureBrief
          ? window.TopicIdentity.ensureBrief(lesson)
          : null),
      lesson,
    });
    boardPlan.bgPicks = bgPicks;
    // Terrace scene already paints a grand piano — skip a second king cutout.
    const actAssign = (boardPlan.assignments || []).find((a) => a.pageKey === 'activity');
    const actIdx = sections.findIndex((s) => (s.tags || []).includes('activity'));
    const actPick = actIdx >= 0 ? bgPicks[actIdx] : null;
    if (
      actAssign &&
      actAssign.recipeId === 'heroProp' &&
      actPick &&
      actPick.type === 'scene' &&
      /piano|terrace|moonlit/i.test(String(actPick.name || ''))
    ) {
      const heroKey = actAssign.ctx && actAssign.ctx.hero && actAssign.ctx.hero.key;
      if (heroKey === 'grand-piano' || heroKey === 'dh-piano') {
        actAssign.ctx = Object.assign({}, actAssign.ctx || {}, { skipKing: true });
        // Pieces were applied in buildBoardPlan BEFORE bg picks — rebuild activity
        // so skipKing actually removes the duplicate piano cutout.
        const actPage = (boardPlan.pages || []).find((p) => p.pageKey === 'activity');
        if (actPage && window.EdbActivities && window.EdbActivities.applyToPage) {
          actPage.locked = [];
          actPage.unlocked = [];
          actPage.notes = [];
          actPage.occupied = [];
          window.EdbActivities.applyToPage(lesson, actPage, 'activity', boardPlan);
        }
      }
    }
    // Scene dressing needs groundY from the picks — run after, not in buildBoardPlan.
    if (window.EdbActivities && window.EdbActivities.dressScenes) {
      if (window.PropBank) await window.PropBank.ready();
      window.EdbActivities.dressScenes(boardPlan, lesson);
    }
    return bgPicks;
  }

  async function render(lesson, meta, boardPlan) {
    _renderMeta = meta || {};
    lesson = normalizeLesson(lesson);
    if (window.ProducerBridge && typeof window.ProducerBridge.normalize === 'function') {
      window.ProducerBridge.normalize(lesson, meta || {});
    }
    if (window.VocabIcons && window.VocabIcons.ready) {
      await window.VocabIcons.ready();
    }
    if (window.PropBank) await window.PropBank.ready();
    const m = meta || {};
    const sections = buildSectionList(lesson, m);

    const host = el('div', {
      position: 'fixed', left: '-10000px', top: '0', width: W + 'px',
      pointerEvents: 'none', opacity: '0', zIndex: '-1',
    });
    document.body.appendChild(host);

    const pageEls = [];
    const slots = { byKey: {} };

    function push(node, pageKey) {
      host.appendChild(node);
      pageEls.push(node);
      const idx = pageEls.length - 1;
      if (pageKey) slots.byKey[pageKey] = idx;
      return idx;
    }

    push(makeTitle(lesson, m, boardPlan), 'title');
    push(makeWarmUp(lesson, boardPlan, m), 'warm');
    slots.newWords = push(await makeVocab(lesson, boardPlan), 'newWords');
    if (includePhonics(lesson, m)) {
      push(makePhonics(lesson, boardPlan, m), 'phonics');
    }
    const EA = window.EdbActivities;
    if (!lesson._preA1Live && (EA && typeof EA.hasVocabSentencesContent === 'function'
      ? EA.hasVocabSentencesContent(lesson)
      : boardVocabList(lesson).some((v) => String((v && v.sentence) || '').trim()))) {
      push(makeVocabSentences(lesson, boardPlan), 'vocabSentences');
    }
    if (!lesson._preA1Live && (EA && typeof EA.hasFramesContent === 'function'
      ? EA.hasFramesContent(lesson)
      : ((lesson.sentenceFrames || []).some((f) => /_{2,}/.test(String(f || '')))))) {
      push(makeFrames(lesson, boardPlan), 'frames');
    }

    const boardStories = storyPagesForBoard(lesson, m);
    if (!boardStories.length) {
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Read together.', visualTheme: 'nature' }, 0, boardPlan, { solo: true }), 'story0');
    } else {
      const solo = boardStories.length === 1;
      boardStories.forEach((sp, i) => {
        push(makeStoryPage(lesson, sp, i, boardPlan, {
          solo,
          total: boardStories.length,
        }), 'story' + i);
      });
    }

    if (!lesson._preA1Live) push(makeComprehension(lesson), 'comprehension');
    if (includeCreative(lesson, m)) {
      push(makeCreative(lesson), 'creative');
    }

    const chunks = speakingChunks(lesson, m);
    chunks.forEach((chunk, i) => {
      push(makeSpeakingPage(chunk, i, chunks.length, boardPlan, lesson), 'speaking:' + i);
    });

    push(makeActivity(lesson, boardPlan), 'activity');
    slots.wrap = push(makeWrap(lesson, boardPlan), 'wrap');

    const bgPicks = boardPlan && boardPlan.bgPicks;
    if (bgPicks) {
      if (bgPicks.length !== pageEls.length) {
        throw new Error(
          `Background plan mismatch: ${bgPicks.length} picks for ${pageEls.length} pages`
        );
      }
      pageEls.forEach((pageEl, i) => {
        const pageType = pageEl.dataset.pageType || '';
        // Manus S32: wrap stays a deep bookend — skip pastel flat washes that
        // break the deck register. Scenes (e.g. terrace) may still bookend.
        if (pageType === 'wrap') {
          const pick = bgPicks[i];
          if (pick && pick.type === 'scene') {
            applyPackBg(pageEl, pick, { dimForLightText: true });
          }
          return;
        }
        applyPackBg(pageEl, bgPicks[i], {
          dimForLightText: !!LIGHT_TEXT_PAGES[pageType],
        });
      });
    }

    return { pageEls, slots, host, boardPlan: boardPlan || null, sections };
  }

  function cleanup(host) {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  /**
   * Swap generated illustrations into data-story-art slots.
   * results: { pages: [{ index, dataUrl|null }] } from /api/generate-story-art
   * Returns how many slots were filled.
   */
  function applyStoryArt(pageEls, results) {
    if (!pageEls || !results || !Array.isArray(results.pages)) return 0;
    const byIndex = new Map();
    results.pages.forEach((p) => {
      if (p && p.dataUrl && Number.isFinite(Number(p.index))) {
        byIndex.set(Number(p.index), p.dataUrl);
      }
    });
    if (!byIndex.size) return 0;

    let filled = 0;
    pageEls.forEach((pageEl) => {
      if (!pageEl || !pageEl.querySelectorAll) return;
      pageEl.querySelectorAll('[data-story-art]').forEach((slot) => {
        const idx = Number(slot.dataset.storyArt);
        const url = byIndex.get(idx);
        if (!url) return;
        const mode = slot.dataset.storyArtMode || 'side';
        // Prefer marked caption chip; fall back to white-plate sibling scan.
        let captionEl = null;
        if (mode === 'side') {
          const kids = Array.from(slot.children);
          captionEl = kids.find((c) => c.dataset && c.dataset.storyCaptionChip === '1')
            || kids.find((c) => c.tagName === 'DIV' && c.style && c.style.background
              && /rgb\(255,\s*255,\s*255\)|#fff|#ffffff/i.test(c.style.background)
              && (c.textContent || '').trim())
            || kids[kids.length - 1];
          if (captionEl && captionEl.tagName !== 'DIV') captionEl = null;
        }
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        delete slot.dataset.storyProp;
        slot.dataset.storyArtGen = '1';
        const wrap = document.createElement('div');
        wrap.style.cssText = mode === 'side'
          ? 'flex:1;min-height:0;width:100%;border-radius:14px;overflow:hidden;background:#fff;position:relative;z-index:1'
          : 'width:100%;height:100%;border-radius:16px;overflow:hidden';
        const imgEl = document.createElement('img');
        imgEl.src = url;
        imgEl.alt = '';
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = 'cover';
        imgEl.style.display = 'block';
        imgEl.style.position = 'relative';
        wrap.appendChild(imgEl);
        slot.style.padding = mode === 'side' ? slot.style.padding || '18px' : '0';
        slot.style.background = mode === 'side' ? slot.style.background : '#fff7ed';
        slot.appendChild(wrap);
        if (captionEl) slot.appendChild(captionEl);
        filled += 1;
      });
    });
    return filled;
  }

  window.LessonPages = {
    render, cleanup, buildSectionList, attachBgPicks, applyPackBg, applyStoryArt,
    normalizeLesson, comprehensionQuestions,
    storyFallbackVisual, themeEmoji,
    maxBoardVocab,
    BOARD_W: W, BOARD_H: H,
  };
})();
