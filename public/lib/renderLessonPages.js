/* renderLessonPages.js
 * Builds offscreen 1280×590 DOM pages for ClassIn EDB locked backgrounds.
 * Classic script — attaches window.LessonPages
 */
(function () {
  const W = 1280;
  const H = 590;

  const THEME_COLORS = {
    title: ['#4f46e5', '#7c3aed'],
    warm: ['#fff1f2', '#fecdd3'],
    vocab: ['#f5f3ff', '#ddd6fe'],
    phonics: ['#fffbeb', '#fde68a'],
    frames: ['#1e293b', '#334155'],
    story: ['#fff7ed', '#ffedd5'],
    comp: ['#eff6ff', '#bfdbfe'],
    creative: ['#ecfdf5', '#a7f3d0'],
    speak: ['#f0fdf4', '#bbf7d0'],
    activity: ['#eef2ff', '#c7d2fe'],
    wrap: ['#fff7ed', '#fdba74'],
  };

  function el(tag, style, html) {
    const n = document.createElement(tag);
    if (style) Object.assign(n.style, style);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function pageShell(bg, opts) {
    const pageType = (opts && opts.pageType) || '';
    const p = el('div', {
      width: W + 'px',
      height: H + 'px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Poppins, Inter, system-ui, sans-serif',
      background: Array.isArray(bg)
        ? `linear-gradient(135deg, ${bg[0]}, ${bg[1]})`
        : (bg || '#fff'),
      color: '#0f172a',
      padding: '28px 44px',
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
        text: raw.map((p) => p && p.text).filter(Boolean).join(' '),
        visualTheme: first.visualTheme,
        visualCaption: first.visualCaption || '',
      }];
    }
    return raw.slice(0, count);
  }

  function includeCreative(lesson, meta) {
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

  function header(text, color) {
    const n = el('div', {
      fontSize: '40px',
      fontWeight: '800',
      color: color || '#17827C',
      marginBottom: '16px',
      letterSpacing: '-0.02em',
      lineHeight: '1.1',
    }, text);
    n.dataset.ink = 'heading';
    return n;
  }

  /** Small instruction line under a header. Sits on the raw background, so the
   *  background policy recolours it — see applyPackBg. */
  function hint(text, extra) {
    const n = el('div', Object.assign({
      fontSize: '22px',
      color: '#64748b',
      fontWeight: '600',
      marginBottom: '14px',
    }, extra || {}), text);
    n.dataset.ink = 'hint';
    return n;
  }

  function card(html, extra) {
    // One card language: white, soft shadow, 18px radius, roomy padding.
    // Dark slabs are never the default — ink policy may still darken headers.
    const n = el('div', Object.assign({
      background: '#ffffff',
      borderRadius: '18px',
      padding: '20px 24px',
      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      marginBottom: '14px',
      fontSize: '22px',
      color: '#0f172a',
      lineHeight: '1.35',
    }, extra || {}), html);
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

  /** Section list for SceneBackgrounds.planFor — mirrors the render spine.
   *  Scenes (clinic, zoo, …) are for EDB/activity pages with groundable pieces.
   *  Title, story, and drill chrome use calm flats so text stays readable. */
  function buildSectionList(lesson, meta) {
    const vocab = (lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)).filter(Boolean);
    const topic = lesson.title || '';
    const sections = [
      { title: topic || 'Title', tags: ['title', topic], vocabulary: vocab, preferFlat: true },
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

    sections.push(
      { title: 'Words in Sentences', tags: ['vocabulary', 'sentences', 'grammar'], vocabulary: [], preferFlat: true },
      { title: 'Sentence Frames', tags: ['grammar', 'frames'], vocabulary: [], preferFlat: true },
    );

    const boardStories = storyPagesForBoard(lesson, meta);
    boardStories.forEach((sp, i) => {
      sections.push({
        title: sp.heading || lesson.story?.title || ('Story ' + (i + 1)),
        tags: [sp.visualCaption, 'story', topic].filter(Boolean),
        vocabulary: [],
        preferFlat: true,
      });
    });

    sections.push(
      { title: 'Reading Comprehension', tags: ['comprehension', 'reading'], vocabulary: [], preferFlat: true }
    );

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
        // Quiet flat under EDB — place scenes add noise when pieces are the star.
        title: lesson.activity?.title || 'Activity',
        tags: [lesson.activity?.title, lesson.activity?.prompt, 'activity', topic].filter(Boolean),
        vocabulary: vocab,
        preferFlat: true,
      },
      { title: 'Wrap Up', tags: ['wrap', 'review', 'goodbye'], vocabulary: [], preferFlat: true }
    );

    return sections;
  }

  function titleCharmSrc(lesson) {
    // Theme-kit hero when PropBank has a ready pack (castle → castle-wall-gate, etc.)
    const PB = window.PropBank;
    if (PB && typeof PB.loaded === 'function' && PB.loaded() && PB.assessKit) {
      const kit = PB.assessKit(lesson);
      if (kit && kit.ready && kit.hero && kit.hero.path) return kit.hero.path;
    }
    // Non-kit fallback: curated face decoration for face lessons only
    const topicBlob = [lesson.title, ...(lesson.vocabulary || []).map((v) => v.word || v)].join(' ').toLowerCase();
    if (/\b(faces?|eyes?|nose|mouth|smile|cheek|make.?a.?face)\b/.test(topicBlob)) {
      return 'assets/04_decoration-ui/title-faces-hero.png';
    }
    return null;
  }

  function makeTitle(lesson, meta, boardPlan) {
    const p = pageShell(THEME_COLORS.title, {
      reserveDock: hasRecipe(boardPlan, 'title'), pageType: 'title',
    });
    p.style.display = 'flex';
    p.style.flexDirection = 'row';
    p.style.alignItems = 'center';
    p.style.gap = '28px';

    const copy = el('div', {
      flex: '1',
      minWidth: '0',
      position: 'relative',
      zIndex: '1',
    });
    const title = el('div', {
      color: '#0f172a', fontSize: '72px', fontWeight: '800',
      maxWidth: '640px', lineHeight: '1.05',
    }, lesson.title || 'Lesson');
    title.dataset.ink = 'heading';
    copy.appendChild(title);
    const metaLine = el('div', {
      color: '#334155', fontSize: '26px', marginTop: '22px', fontStyle: 'italic',
    }, `${meta.level || ''}  ·  ${meta.duration || ''}-minute lesson`);
    metaLine.dataset.ink = 'hint';
    copy.appendChild(metaLine);
    p.appendChild(copy);

    const charmSrc = titleCharmSrc(lesson);
    if (charmSrc) {
      p.appendChild(img(charmSrc, {
        position: 'relative',
        width: '440px',
        height: '440px',
        flexShrink: '0',
        zIndex: '1',
        objectFit: 'contain',
        background: 'transparent',
      }));
    }

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
    p.appendChild(header('Warm Up', '#be123c'));
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
        fontSize: '18px',
        fontWeight: '700',
        color: '#64748b',
        marginBottom: '6px',
        flexShrink: '0',
      }, 'Color me!'));
      stage.appendChild(el('div', {
        flex: '1 1 auto',
        minHeight: '0',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '300px',
        aspectRatio: '2 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
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
      // B1+: big write-in stage so the warm page isn't a lonely question strip.
      const sample = lesson.warmUp?.sampleAnswer
        ? `<div style="margin-top:18px;font-size:22px;font-weight:600;color:#94a3b8;text-align:center">Teacher sample (after kids try): ${esc(lesson.warmUp.sampleAnswer)}</div>`
        : '';
      const writeIn = card(
        `<div style="font-size:28px;font-weight:700;color:#64748b;margin-bottom:16px;text-align:center">Write or say your answer here</div>
         <div style="border-bottom:3px dashed #cbd5e1;height:56px;margin:12px 8% 0"></div>
         <div style="border-bottom:3px dashed #cbd5e1;height:56px;margin:20px 8% 0"></div>
         <div style="border-bottom:3px dashed #cbd5e1;height:56px;margin:20px 8% 0"></div>
         ${sample}`,
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
    const interactive = hasRecipe(boardPlan, 'newWords');
    // Vocab match dock is a side column — do not reserve bottom chrome for it.
    // (reserveDock would crush word cards into the top strip.)
    const p = pageShell(THEME_COLORS.vocab, {
      reserveDock: false, pageType: 'vocab',
    });
    p.style.display = 'flex';
    p.style.flexDirection = 'column';
    p.appendChild(header('New Words', '#7c3aed'));
    p.appendChild(hint(
      interactive
        ? 'Say each word. Drag the matching pictures onto the board.'
        : 'Say each word together.',
      { flexShrink: '0' }
    ));
    const words = (lesson.vocabulary || []).slice(0, 6);
    const grid = el('div', {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
      gap: '18px',
      // Leave the right column clear for the match dock.
      maxWidth: interactive ? '680px' : '100%',
      width: '100%',
      flex: '1',
      minHeight: '0',
      height: '100%',
      alignContent: 'stretch',
    });
    for (const v of words) {
      const glyphHtml = interactive
        ? ''
        : `<div style="width:64px;height:64px;border-radius:12px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0">${esc(v.emoji || '•')}</div>`;
      grid.appendChild(card(
        `<div style="display:flex;align-items:center;justify-content:center;gap:16px;height:100%;width:100%">
          ${glyphHtml}
          <div style="font-size:44px;font-weight:800;line-height:1.05;text-align:center">${esc(v.word || '')}</div>
        </div>`,
        {
          marginBottom: '0',
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '0',
          height: '100%',
          boxSizing: 'border-box',
        }
      ));
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
    p.appendChild(hint(esc(oneLine), { marginBottom: '8px', fontSize: '20px' }));

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
          fontSize: '18px',
          fontWeight: '700',
          color: '#78350f',
        }, `${w.emoji || ''} ${esc(w.word)}${isFocus ? ' ← now' : ''}`));
      });
      p.appendChild(chips);
    }

    drawDebugZones(p, 'phonics');
    return p;
  }

  function makeVocabSentences(lesson) {
    const p = pageShell(THEME_COLORS.vocab, { pageType: 'vocabSentences' });
    p.appendChild(header('New Words — In Sentences', '#7c3aed'));
    const body = fillBody(p, { justifyContent: 'stretch', gap: '16px' });
    const grid = el('div', {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
      gap: '16px',
      flex: '1',
      minHeight: '0',
      height: '100%',
    });
    (lesson.vocabulary || []).slice(0, 6).forEach((v) => {
      grid.appendChild(card(
        `<div style="font-size:32px;font-weight:800;margin-bottom:10px;line-height:1.1">${esc(v.word || '')}</div>
         <div style="font-size:26px;color:#334155;font-style:italic;line-height:1.35">${esc(v.sentence || '')}</div>`,
        {
          marginBottom: '0',
          padding: '22px 24px',
          height: '100%',
          minHeight: '0',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }
      ));
    });
    body.appendChild(grid);
    return p;
  }

  function makeFrames(lesson) {
    const p = pageShell(THEME_COLORS.vocab, { pageType: 'frames' });
    const col = chromeColumn(p);
    col.appendChild(header('Sentence Frames', '#7c3aed'));
    col.appendChild(hint('Say each frame out loud. Fill the blank, then write your sentence.', {
      marginBottom: '8px', flexShrink: '0',
    }));
    const frames = (lesson.sentenceFrames || []).slice(0, 3);
    const body = el('div', {
      flex: '1',
      minHeight: '0',
      display: 'grid',
      gridTemplateRows: '1fr 1fr 1fr',
      gap: '14px',
      width: '100%',
    });
    frames.forEach((f, i) => {
      body.appendChild(card(
        `<div style="font-size:15px;font-weight:700;color:#64748b;margin-bottom:8px;flex-shrink:0">Frame ${i + 1}</div>
         <div style="font-size:40px;font-weight:800;color:#1e293b;line-height:1.2;margin-bottom:14px;flex-shrink:0">${esc(f)}</div>
         <div style="border-bottom:4px dashed #94a3b8;flex:1;min-height:56px;width:100%"></div>`,
        {
          padding: '20px 26px',
          marginBottom: '0',
          height: '100%',
          minHeight: '0',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }
      ));
    });
    col.appendChild(body);
    // #region agent log
    fetch('http://127.0.0.1:7298/ingest/2c7b9048-535d-4975-be12-acca9b0197ba',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3c9697'},body:JSON.stringify({sessionId:'3c9697',runId:'ux-pre',hypothesisId:'H1',location:'renderLessonPages.js:makeFrames',message:'frames type+write space',data:{frameCount:frames.length,frameFontPx:40,writeMinH:56,layout:'chromeColumn-grid'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    drawDebugZones(p, 'frames');
    return p;
  }

  function themeEmoji(theme) {
    const t = String(theme || '').toLowerCase();
    // Strongest place cues first. Bare "living" in a title like
    // "Living in the Shadow of the Crater" must not steal the home house
    // when volcano words are also present.
    if (/\b(volcano|volcanic|crater|lava|eruption|ash|geothermal|magma|seismic)\b/.test(t)) return '🌋';
    // Castle before gym — "courtyard" must not hit includes('court') → basketball.
    if (/\b(castle|knight|dragon|medieval|moat|portcullis|drawbridge|royal|king|queen|fortress)\b/.test(t)) return '🏰';
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
    return '📖';
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

  function makeStoryPage(lesson, page, index, boardPlan, opts) {
    const pageKey = 'story' + index;
    const p = pageShell(THEME_COLORS.story, {
      reserveDock: hasRecipe(boardPlan, pageKey), pageType: 'story',
    });
    const content = el('div', {
      position: 'relative', zIndex: '1',
      display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box',
    });
    const title = index === 0
      ? `Story: ${lesson.story?.title || 'Let\'s Read!'}`
      : `Story (cont.): ${page?.heading || ''}`;
    const titleEl = header(title, '#c2410c');
    titleEl.style.textShadow = '0 1px 0 #fff, 0 2px 10px rgba(255,255,255,0.85)';
    titleEl.style.position = 'relative';
    titleEl.style.zIndex = '2';
    content.appendChild(titleEl);

    const storyText = String(page?.text || '');
    const solo = !!(opts && opts.solo);
    // One merged 30-min beat (or any solo page) should fill the board; scale up.
    // Short multi-page beats need big type so the card doesn't look empty (M3/S12).
    const textSize = solo
      ? (storyText.length <= 220 ? 56 : storyText.length <= 360 ? 48 : 40)
      : (storyText.length <= 50 ? 52 : storyText.length <= 100 ? 44 : storyText.length <= 160 ? 34 : 28);

    if (solo) {
      const caption = page?.visualCaption || page?.visualTheme;
      if (caption) {
        content.appendChild(el('div', {
          color: '#9a3412', fontSize: '18px', fontWeight: '700',
          marginBottom: '10px', opacity: '0.9',
        }, esc(caption)));
      }
      // Banner slot for realtime story art (separate from the reading card).
      const banner = el('div', {
        height: '180px',
        flexShrink: '0',
        borderRadius: '16px',
        marginBottom: '12px',
        overflow: 'hidden',
        background: 'linear-gradient(200deg, #fff7ed, #fdba74)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      banner.dataset.storyArt = String(index);
      banner.dataset.storyArtMode = 'banner';
      banner.appendChild(el('div', {
        fontSize: '64px', lineHeight: '1', opacity: '0.85',
      }, themeEmoji(storyArtCue(lesson, page))));
      content.appendChild(banner);
      // One flowing paragraph — fill the card; bigger type when there is room.
      const text = card(
        `<div style="font-size:${textSize}px;line-height:1.45;color:#1e293b;font-weight:600;width:100%">${esc(storyText)}</div>`,
        {
          flex: '1',
          marginBottom: '0',
          marginTop: '4px',
          minHeight: '0',
          padding: '28px 36px',
          display: 'flex',
          alignItems: 'flex-start',
          overflow: 'hidden',
        }
      );
      content.appendChild(text);
    } else {
      const layout = el('div', {
        display: 'flex', gap: '24px', alignItems: 'stretch', flex: '1',
      });
      const artOnRight = index % 2 === 1;
      const side = el('div', {
        width: '220px', flexShrink: '0', borderRadius: '18px',
        background: artOnRight
          ? 'linear-gradient(160deg, #ffedd5, #fed7aa)'
          : 'linear-gradient(200deg, #fff7ed, #fdba74)',
        minHeight: '240px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      });
      side.dataset.storyArt = String(index);
      side.dataset.storyArtMode = 'side';
      side.appendChild(el('div', { fontSize: '96px', lineHeight: '1', marginBottom: '14px' },
        themeEmoji(storyArtCue(lesson, page))));
      side.appendChild(el('div', {
        background: '#ffffff', color: '#9a3412', borderRadius: '12px', padding: '10px 14px',
        fontSize: '16px', fontWeight: '700', textAlign: 'center', width: '100%',
        boxSizing: 'border-box', lineHeight: '1.3',
        boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
      }, esc(page?.visualCaption || page?.visualTheme || 'Scene')));

      const text = card(
        `<div style="font-size:${textSize}px;line-height:1.45;color:#1e293b;font-weight:600">${esc(storyText)}</div>`,
        {
          flex: '1',
          marginBottom: '0',
          minHeight: storyText.length <= 100 ? '0' : '320px',
          padding: storyText.length <= 100 ? '48px 40px' : '36px 32px',
          display: 'flex',
          alignItems: storyText.length <= 100 ? 'flex-start' : 'center',
        }
      );
      if (artOnRight) {
        layout.appendChild(text);
        layout.appendChild(side);
      } else {
        layout.appendChild(side);
        layout.appendChild(text);
      }
      content.appendChild(layout);
    }
    p.appendChild(content);
    drawDebugZones(p, 'story');
    return p;
  }

  function makeComprehension(lesson) {
    const p = pageShell(THEME_COLORS.comp, { pageType: 'comprehension' });
    const col = chromeColumn(p);
    col.appendChild(header('Reading Comprehension', '#1d4ed8'));
    col.appendChild(hint('Answer in full sentences in the space under each question.', {
      marginBottom: '6px', flexShrink: '0',
    }));
    const questions = (lesson.story?.comprehensionQuestions || []).slice(0, 2);
    const body = el('div', {
      flex: '1',
      minHeight: '0',
      display: 'grid',
      gridTemplateRows: '1fr 1fr',
      gap: '16px',
      width: '100%',
    });
    questions.forEach((q, i) => {
      body.appendChild(card(
        `<div style="font-size:34px;font-weight:800;line-height:1.25;color:#0f172a;margin-bottom:14px;flex-shrink:0">${i + 1}. ${esc(q.question || '')}</div>
         <div style="border:2px dashed #94a3b8;border-radius:14px;flex:1;min-height:110px;background:rgba(248,250,252,0.9)"></div>`,
        {
          padding: '22px 26px',
          marginBottom: '0',
          height: '100%',
          minHeight: '0',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }
      ));
    });
    col.appendChild(body);
    // #region agent log
    fetch('http://127.0.0.1:7298/ingest/2c7b9048-535d-4975-be12-acca9b0197ba',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3c9697'},body:JSON.stringify({sessionId:'3c9697',runId:'ux-pre',hypothesisId:'H1',location:'renderLessonPages.js:makeComprehension',message:'comp type+write',data:{qCount:questions.length,qFontPx:34,writeMinH:110,layout:'chromeColumn-grid'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    drawDebugZones(p, 'comprehension');
    return p;
  }

  function makeCreative(lesson) {
    const p = pageShell(THEME_COLORS.creative, { pageType: 'creative' });
    const col = chromeColumn(p);
    col.appendChild(header('Your Ideas!', '#059669'));
    col.appendChild(hint('Open-ended — no single right answer. Write or draw in the box.', {
      marginBottom: '8px', flexShrink: '0',
    }));
    const body = el('div', {
      flex: '1',
      minHeight: '0',
      display: 'grid',
      gridTemplateRows: '1fr 1fr',
      gap: '16px',
      width: '100%',
    });
    (lesson.story?.creativeQuestions || []).slice(0, 2).forEach((q, i) => {
      const text = creativePromptText(q);
      if (!text) return;
      body.appendChild(card(
        `<div style="font-size:16px;color:#64748b;font-weight:700;margin-bottom:8px;flex-shrink:0">Idea ${i + 1}</div>
         <div style="font-size:36px;font-weight:800;color:#134e4a;line-height:1.25;margin-bottom:14px;flex-shrink:0">${esc(text)}</div>
         <div style="border:2px dashed #94a3b8;border-radius:14px;flex:1;min-height:120px;background:rgba(248,250,252,0.85)"></div>`,
        {
          padding: '22px 26px',
          marginBottom: '0',
          height: '100%',
          minHeight: '0',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }
      ));
    });
    col.appendChild(body);
    // #region agent log
    fetch('http://127.0.0.1:7298/ingest/2c7b9048-535d-4975-be12-acca9b0197ba',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3c9697'},body:JSON.stringify({sessionId:'3c9697',runId:'ux-pre',hypothesisId:'H1',location:'renderLessonPages.js:makeCreative',message:'ideas type+write',data:{ideaFontPx:36,writeMinH:120,layout:'chromeColumn-grid'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    drawDebugZones(p, 'creative');
    return p;
  }

  /** One speaking board page with 1–3 stacked questions; Peek sticky on Q1 when covered. */
  function makeSpeakingPage(items, pageIndex, totalPages, boardPlan) {
    const pageKey = 'speaking:' + pageIndex;
    const covered = hasRecipe(boardPlan, pageKey);
    const p = pageShell(THEME_COLORS.speak, {
      reserveDock: covered, pageType: 'speaking',
    });
    p.appendChild(header("Let's Talk!", '#15803d'));
    const sub = totalPages > 1
      ? `Part ${pageIndex + 1} of ${totalPages}`
      : 'Answer out loud first';
    p.appendChild(hint(sub + (covered ? ' — peel the sticky after the first answer' : ''), {
      fontSize: '16px', marginBottom: '12px',
    }));

    items.forEach((item, qi) => {
      const showSticky = covered && qi === 0;
      p.appendChild(card(
        `<div style="font-size:17px;color:#64748b;font-weight:700;margin-bottom:8px">Question ${qi + 1}</div>
         <div style="font-size:28px;font-weight:800;color:#14532d;line-height:1.25">${esc(item.question || '')}</div>`,
        { padding: '16px 20px', marginBottom: showSticky ? '8px' : '14px' }
      ));

      if (showSticky) {
        const r = (window.EdbActivities && window.EdbActivities.speakingCoverRect())
          || { x: 88, y: 218, w: 720, h: 72 };
        p.appendChild(el('div', {
          position: 'absolute',
          left: r.x + 'px',
          top: r.y + 'px',
          width: r.w + 'px',
          height: r.h + 'px',
          boxSizing: 'border-box',
          background: '#ffffff',
          borderRadius: '14px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontStyle: 'italic',
          color: '#166534',
          textAlign: 'center',
          zIndex: '2',
          boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
        }, esc(item.sampleAnswer || '')));
        // Below the sticky: above it the label collided with the question card.
        p.appendChild(hint('Sample answer', {
          position: 'absolute',
          left: r.x + 'px',
          top: (r.y + r.h + 8) + 'px',
          fontSize: '16px',
          fontWeight: '700',
          marginBottom: '0',
          zIndex: '2',
        }));
        // Spacer so following questions clear the sticky band
        p.appendChild(el('div', { height: '96px', marginBottom: '8px' }));
      }
      // Other questions: no sample — produce first
    });

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
      const faceKing = recipeIdFor(boardPlan, 'activity') === 'heroProp'
        && /face|hair|eyes|make.?a.?face/i.test([
          lesson.title, lesson.activity?.title, lesson.activity?.prompt,
          ...(lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)),
        ].filter(Boolean).join(' '));
      p.appendChild(el('div', {
        color: '#4338ca',
        fontSize: '22px',
        fontWeight: '800',
        marginTop: '4px',
        maxWidth: '380px',
        lineHeight: '1.2',
      }, esc(lesson.activity?.title || 'Your Turn!')));
      // Hint must match the king — clinic default must not leak onto castle/face/etc.
      const kingCue = [
        lesson.title, lesson.activity?.title, lesson.activity?.prompt,
        ...(lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)),
      ].filter(Boolean).join(' ').toLowerCase();
      let kingHint = 'Drag toys onto the stage. Play!';
      if (faceKing) kingHint = 'Drag parts onto the face. Make a friend!';
      else if (/\b(dentist|dental|tooth|teeth|cavity|floss|patient)\b/.test(kingCue)) {
        kingHint = 'Drag tools onto the patient!';
      } else if (/\b(castle|knight|dragon|royal|fortress|portcullis)\b/.test(kingCue)) {
        kingHint = 'Drag toys onto the castle. Build!';
      } else if (/\b(trampoline|bounce|backflip)\b/.test(kingCue)) {
        kingHint = 'Drag toys onto the trampoline. Bounce!';
      }
      p.appendChild(hint(kingHint, {
        textAlign: 'left', lineHeight: '1.3', maxWidth: '380px',
      }));
      drawDebugZones(p, pageType);
      return p;
    }
    p.appendChild(header(lesson.activity?.title || 'Your Turn!', '#4338ca'));
    p.appendChild(hint(esc(lesson.activity?.prompt || 'Work with a partner.'), {
      textAlign: 'left', lineHeight: '1.35', maxWidth: interactive ? '680px' : '100%',
    }));
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
    drawDebugZones(p, 'activity');
    return p;
  }

  function makeWrap(lesson, boardPlan) {
    const interactive = hasRecipe(boardPlan, 'wrap');
    const p = pageShell(THEME_COLORS.wrap, {
      reserveDock: interactive, pageType: 'wrap',
    });
    p.appendChild(el('div', {
      color: '#9a3412', fontSize: '78px', fontWeight: '800', textAlign: 'center', marginTop: '48px',
    }, 'Great Job!'));
    p.appendChild(el('div', {
      color: '#c2410c', fontSize: '26px', textAlign: 'center', margin: '16px 0 28px', fontWeight: '600',
    }, "Today's key sentences — say them together"));
    (lesson.reviewSentences || []).slice(0, 3).forEach((s) => {
      p.appendChild(card(
        `<div style="font-size:28px;text-align:center;font-weight:700;line-height:1.35;color:#9a3412">${esc(s)}</div>`,
        { maxWidth: '900px', margin: '0 auto 16px', padding: '18px 24px' }
      ));
    });
    p.appendChild(img('assets/04_decoration-ui/confetti.svg', {
      left: '40px', bottom: '36px', width: '110px', height: '110px',
    }));
    p.appendChild(img('assets/04_decoration-ui/confetti.svg', {
      right: '40px', bottom: '36px', width: '110px', height: '110px',
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
    });
    boardPlan.bgPicks = bgPicks;
    // Scene dressing needs groundY from the picks — run after, not in buildBoardPlan.
    if (window.EdbActivities && window.EdbActivities.dressScenes) {
      if (window.PropBank) await window.PropBank.ready();
      window.EdbActivities.dressScenes(boardPlan, lesson);
    }
    return bgPicks;
  }

  async function render(lesson, meta, boardPlan) {
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
    push(makeVocabSentences(lesson), 'vocabSentences');
    push(makeFrames(lesson), 'frames');

    const boardStories = storyPagesForBoard(lesson, m);
    if (!boardStories.length) {
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Read together.', visualTheme: 'nature' }, 0, boardPlan, { solo: true }), 'story0');
    } else {
      const solo = boardStories.length === 1;
      boardStories.forEach((sp, i) => {
        push(makeStoryPage(lesson, sp, i, boardPlan, { solo }), 'story' + i);
      });
    }

    push(makeComprehension(lesson), 'comprehension');
    if (includeCreative(lesson, m)) {
      push(makeCreative(lesson), 'creative');
    }

    const chunks = speakingChunks(lesson, m);
    chunks.forEach((chunk, i) => {
      push(makeSpeakingPage(chunk, i, chunks.length, boardPlan), 'speaking:' + i);
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
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.borderRadius = slot.dataset.storyArtMode === 'banner' ? '16px' : '18px';
        slot.style.padding = '0';
        slot.style.background = '#fff7ed';
        slot.appendChild(img);
        filled += 1;
      });
    });
    return filled;
  }

  window.LessonPages = {
    render, cleanup, buildSectionList, attachBgPicks, applyPackBg, applyStoryArt,
    BOARD_W: W, BOARD_H: H,
  };
})();
