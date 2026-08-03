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
    frames: ['#1e293b', '#334155'],
    story: ['#fff7ed', '#ffedd5'],
    comp: ['#eff6ff', '#bfdbfe'],
    creative: ['#ecfdf5', '#a7f3d0'],
    speak: ['#f0fdf4', '#bbf7d0'],
    activity: ['#eef2ff', '#c7d2fe'],
    wrap: ['#4f46e5', '#6366f1'],
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

    Array.from(pageEl.children).forEach((child) => {
      if (child === bgImg || child === wash) return;
      if (!child.style.position || child.style.position === 'static') {
        child.style.position = 'relative';
      }
      if (!child.style.zIndex) child.style.zIndex = '1';
    });
  }

  const LIGHT_TEXT_PAGES = { title: 1, frames: 1, wrap: 1 };

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

  function speakingChunks(lesson) {
    if (window.EdbActivities && window.EdbActivities.speakingChunks) {
      return window.EdbActivities.speakingChunks(lesson);
    }
    const qs = (lesson.speakingQuestions || []).slice(0, 4);
    if (!qs.length) return [];
    const pages = [];
    for (let i = 0; i < qs.length; i += 2) pages.push(qs.slice(i, i + 2));
    return pages;
  }

  function storyPageCount(lesson) {
    if (window.EdbActivities && window.EdbActivities.storyPageCount) {
      return window.EdbActivities.storyPageCount(lesson);
    }
    const n = (lesson.story?.pages || []).length;
    if (n <= 0) return 1;
    return Math.min(2, n);
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

  function header(text, color) {
    return el('div', {
      fontSize: '40px',
      fontWeight: '800',
      color: color || '#17827C',
      marginBottom: '16px',
      letterSpacing: '-0.02em',
      lineHeight: '1.1',
    }, text);
  }

  function card(html, extra) {
    // Opaque white — avoids html2canvas checkerboard on translucent layers
    return el('div', Object.assign({
      background: '#ffffff',
      borderRadius: '16px',
      padding: '20px 24px',
      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      marginBottom: '14px',
    }, extra || {}), html);
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

  /** Section list for SceneBackgrounds.planFor — mirrors the render spine. */
  function buildSectionList(lesson, meta) {
    const vocab = (lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)).filter(Boolean);
    const topic = lesson.title || '';
    // Include topic on every section so vocab/grammar pages still match place scenes
    // (tags like "vocabulary" alone never clear the picker floor).
    const sections = [
      { title: topic || 'Title', tags: ['title', topic], vocabulary: vocab },
      { title: 'Warm Up', tags: ['warmup', 'warm-up', topic], vocabulary: vocab },
      { title: 'New Words', tags: ['vocabulary', 'words', 'matching', topic], vocabulary: vocab },
      { title: 'Words in Sentences', tags: ['vocabulary', 'sentences', 'grammar', topic], vocabulary: vocab },
      { title: 'Sentence Frames', tags: ['grammar', 'frames', topic], vocabulary: vocab },
    ];

    const storyPages = (lesson.story?.pages || []).slice(0, 2);
    const storyCount = storyPageCount(lesson);
    for (let i = 0; i < storyCount; i++) {
      const sp = storyPages[i] || {};
      sections.push({
        title: sp.heading || lesson.story?.title || ('Story ' + (i + 1)),
        tags: [sp.visualTheme, sp.visualCaption, 'story', topic].filter(Boolean),
        vocabulary: vocab,
        category: null,
      });
    }

    sections.push(
      { title: 'Reading Comprehension', tags: ['comprehension', 'reading', topic], vocabulary: vocab }
    );

    if (includeCreative(lesson, meta)) {
      sections.push({ title: 'Your Ideas', tags: ['creative', 'ideas', topic], vocabulary: vocab });
    }

    speakingChunks(lesson).forEach((chunk, i) => {
      sections.push({
        title: (chunk[0] && chunk[0].question) || ('Speaking ' + (i + 1)),
        tags: ['speaking', 'talk', topic],
        vocabulary: vocab,
      });
    });

    sections.push(
      {
        title: lesson.activity?.title || 'Activity',
        tags: [lesson.activity?.title, lesson.activity?.prompt, 'activity', topic].filter(Boolean),
        vocabulary: vocab,
      },
      { title: 'Wrap Up', tags: ['wrap', 'review', 'goodbye', topic], vocabulary: vocab }
    );

    return sections;
  }

  function makeTitle(lesson, meta, boardPlan) {
    const p = pageShell(THEME_COLORS.title, {
      reserveDock: hasRecipe(boardPlan, 'title'), pageType: 'title',
    });
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.75)', fontSize: '18px', fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '70px',
    }, 'ClassIn Lesson'));
    p.appendChild(el('div', {
      color: '#fff', fontSize: '64px', fontWeight: '800', marginTop: '14px',
      maxWidth: '900px', lineHeight: '1.08',
    }, lesson.title || 'Lesson'));
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.9)', fontSize: '26px', marginTop: '22px', fontStyle: 'italic',
    }, `${meta.level || ''}  ·  ${meta.duration || ''}-minute lesson`));
    drawDebugZones(p, 'title');
    return p;
  }

  function makeWarmUp(lesson, boardPlan) {
    const p = pageShell(THEME_COLORS.warm, {
      reserveDock: hasRecipe(boardPlan, 'warm'), pageType: 'warm',
    });
    p.appendChild(header('Warm Up', '#e11d48'));
    p.appendChild(el('div', {
      fontSize: '18px', color: '#64748b', marginBottom: '18px', fontWeight: '600',
    }, 'Think, then share with your teacher.'));
    p.appendChild(card(
      `<div style="font-size:36px;font-weight:800;color:#1e3a8a;text-align:center;line-height:1.25">${esc(lesson.warmUp?.question || '')}</div>`,
      { padding: '36px 28px', marginTop: '24px' }
    ));
    // Sample omitted — students answer first
    drawDebugZones(p, 'warm');
    return p;
  }

  async function makeVocab(lesson, boardPlan) {
    const interactive = hasRecipe(boardPlan, 'newWords');
    const p = pageShell(THEME_COLORS.vocab, {
      reserveDock: interactive, pageType: 'vocab',
    });
    p.appendChild(header('New Words', '#7c3aed'));
    p.appendChild(el('div', { fontSize: '18px', color: '#64748b', marginBottom: '16px' },
      interactive
        ? 'Say each word. Drag the matching pictures onto the board.'
        : 'Say each word together.'));
    const grid = el('div', {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px',
      maxWidth: interactive ? '720px' : '100%',
    });
    const words = (lesson.vocabulary || []).slice(0, 6);
    for (const v of words) {
      let glyphHtml = `<div style="width:64px;height:64px;border-radius:12px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:32px">${esc(v.emoji || '•')}</div>`;
      if (window.VocabIcons) {
        const iconPath = await window.VocabIcons.pathFor(v.word);
        if (iconPath) {
          glyphHtml = `<img src="${esc(iconPath)}" alt="" width="64" height="64" style="width:64px;height:64px;object-fit:contain;border-radius:12px;background:#ede9fe;padding:4px;box-sizing:border-box"/>`;
        }
      }
      grid.appendChild(card(
        `<div style="display:flex;align-items:center;gap:16px">
          ${glyphHtml}
          <div style="font-size:30px;font-weight:800">${esc(v.word || '')}</div>
        </div>`,
        { marginBottom: '0', padding: '16px 18px' }
      ));
    }
    p.appendChild(grid);
    drawDebugZones(p, 'vocab');
    return p;
  }

  function makeVocabSentences(lesson) {
    const p = pageShell(THEME_COLORS.vocab, { pageType: 'vocabSentences' });
    p.appendChild(header('New Words — In Sentences', '#7c3aed'));
    const grid = el('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' });
    (lesson.vocabulary || []).slice(0, 6).forEach((v) => {
      grid.appendChild(card(
        `<div style="font-size:22px;font-weight:800;margin-bottom:8px">${esc(v.word || '')}</div>
         <div style="font-size:18px;color:#334155;font-style:italic;line-height:1.35">${esc(v.sentence || '')}</div>`,
        { marginBottom: '0', padding: '16px 18px' }
      ));
    });
    p.appendChild(grid);
    return p;
  }

  function makeFrames(lesson) {
    const p = pageShell(THEME_COLORS.frames, { pageType: 'frames' });
    p.appendChild(header('Sentence Frames', '#c4b5fd'));
    p.appendChild(el('div', {
      fontSize: '18px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px',
    }, 'Practice out loud. Fill the blanks.'));
    (lesson.sentenceFrames || []).slice(0, 5).forEach((f, i) => {
      const row = el('div', {
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', color: '#fff',
      });
      row.appendChild(el('div', {
        width: '18px', height: '18px', borderRadius: '50%',
        background: ['#f43f5e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][i % 5],
        flexShrink: '0',
      }));
      row.appendChild(el('div', { fontSize: '32px', fontWeight: '700', lineHeight: '1.2' }, esc(f)));
      p.appendChild(row);
    });
    return p;
  }

  function themeEmoji(theme) {
    const t = String(theme || '').toLowerCase();
    if (t.includes('beach')) return '🏖️';
    if (t.includes('school')) return '🏫';
    if (t.includes('kitchen') || t.includes('home')) return '🏠';
    if (t.includes('city')) return '🏙️';
    if (t.includes('sport')) return '⚽';
    if (t.includes('park')) return '🌳';
    if (t.includes('bakery') || t.includes('food')) return '🥐';
    if (t.includes('doctor') || t.includes('clinic') || t.includes('hospital') || t.includes('sick')) return '🏥';
    return '📖';
  }

  function makeStoryPage(lesson, page, index, boardPlan) {
    const pageKey = 'story' + index;
    const p = pageShell(THEME_COLORS.story, {
      reserveDock: hasRecipe(boardPlan, pageKey), pageType: 'story',
    });
    const content = el('div', { position: 'relative', zIndex: '1' });
    const title = index === 0
      ? `Story: ${lesson.story?.title || 'Let\'s Read!'}`
      : `Story (cont.): ${page?.heading || ''}`;
    content.appendChild(header(title, '#c2410c'));
    const layout = el('div', { display: 'flex', gap: '24px', alignItems: 'stretch' });
    const side = el('div', {
      width: '240px', flexShrink: '0', borderRadius: '18px',
      background: 'linear-gradient(160deg, #ffedd5, #fed7aa)',
      minHeight: '340px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      boxSizing: 'border-box',
    });
    side.appendChild(el('div', { fontSize: '88px', lineHeight: '1', marginBottom: '14px' },
      themeEmoji(page?.visualTheme)));
    side.appendChild(el('div', {
      background: '#1e293b', color: '#fff', borderRadius: '10px', padding: '10px 14px',
      fontSize: '16px', fontWeight: '700', textAlign: 'center', width: '100%',
      boxSizing: 'border-box', lineHeight: '1.3',
    }, esc(page?.visualCaption || page?.visualTheme || 'Scene')));
    const text = card(
      `<div style="font-size:24px;line-height:1.5;color:#1e293b">${esc(page?.text || '')}</div>`,
      { flex: '1', marginBottom: '0', minHeight: '340px', padding: '28px 26px' }
    );
    layout.appendChild(side);
    layout.appendChild(text);
    content.appendChild(layout);
    p.appendChild(content);
    drawDebugZones(p, 'story');
    return p;
  }

  function makeComprehension(lesson) {
    const p = pageShell(THEME_COLORS.comp, { pageType: 'comprehension' });
    p.appendChild(header('Reading Comprehension', '#1d4ed8'));
    p.appendChild(el('div', {
      fontSize: '18px', color: '#64748b', marginBottom: '16px', fontWeight: '600',
    }, 'Answer in full sentences. No peeking at notes!'));
    (lesson.story?.comprehensionQuestions || []).slice(0, 3).forEach((q, i) => {
      p.appendChild(card(
        `<div style="font-size:24px;font-weight:800;line-height:1.35">${i + 1}. ${esc(q.question || '')}</div>`,
        { padding: '22px 24px' }
      ));
    });
    drawDebugZones(p, 'comprehension');
    return p;
  }

  function makeCreative(lesson) {
    const p = pageShell(THEME_COLORS.creative, { pageType: 'creative' });
    p.appendChild(header('Your Ideas!', '#059669'));
    p.appendChild(el('div', { fontSize: '18px', color: '#64748b', marginBottom: '16px' },
      'Open-ended — no single right answer.'));
    (lesson.story?.creativeQuestions || []).slice(0, 2).forEach((q, i) => {
      p.appendChild(card(
        `<div style="font-size:16px;color:#64748b;font-weight:700;margin-bottom:10px">Idea ${i + 1}</div>
         <div style="font-size:26px;font-weight:800;color:#134e4a;line-height:1.3">${esc(q)}</div>`,
        { padding: '22px 24px' }
      ));
    });
    p.appendChild(img('assets/04_decoration-ui/confetti.svg', {
      right: '50px', bottom: '40px', width: '120px', height: '120px',
    }));
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
    p.appendChild(el('div', { fontSize: '16px', color: '#64748b', marginBottom: '12px', fontWeight: '600' },
      sub + (covered ? ' — peel the sticky after the first answer' : '')));

    items.forEach((item, qi) => {
      const showSticky = covered && qi === 0;
      p.appendChild(card(
        `<div style="font-size:15px;color:#64748b;font-weight:700;margin-bottom:8px">Question ${qi + 1}</div>
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
        p.appendChild(el('div', {
          position: 'absolute',
          left: r.x + 'px',
          top: (r.y - 22) + 'px',
          fontSize: '13px',
          color: '#64748b',
          fontWeight: '700',
          zIndex: '2',
        }, 'Sample answer'));
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
    const p = pageShell(THEME_COLORS.activity, {
      reserveDock: interactive, pageType: 'activity',
    });
    p.appendChild(header(lesson.activity?.title || 'Your Turn!', '#4338ca'));
    p.appendChild(el('div', {
      fontSize: '18px', color: '#64748b', marginBottom: '14px', textAlign: 'center', lineHeight: '1.35',
    }, esc(lesson.activity?.prompt || 'Work with a partner.')));
    const list = el('div', { maxWidth: interactive ? '700px' : '100%' });
    (lesson.activity?.templates || []).slice(0, 5).forEach((t, i) => {
      list.appendChild(card(
        `<div style="font-size:22px;font-weight:700;line-height:1.3">${i + 1}. ${esc(t)}</div>`,
        { padding: '14px 18px' }
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
      color: '#fff', fontSize: '52px', fontWeight: '800', textAlign: 'center', marginTop: '28px',
    }, 'Great Job!'));
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.9)', fontSize: '22px', textAlign: 'center', margin: '14px 0 28px',
    }, "Today's key sentences — say them together"));
    (lesson.reviewSentences || []).slice(0, 3).forEach((s) => {
      p.appendChild(el('div', {
        color: '#fff', fontSize: '28px', textAlign: 'center', marginBottom: '16px',
        fontWeight: '700', lineHeight: '1.3',
      }, esc(s)));
    });
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

  /** Plan scene/flat picks and attach to boardPlan. Call before render for board exports. */
  async function attachBgPicks(lesson, meta, boardPlan) {
    if (!boardPlan) throw new Error('boardPlan required for background picks');
    if (!window.SceneBackgrounds) {
      throw new Error('SceneBackgrounds failed to load. Refresh and try again.');
    }
    const sections = buildSectionList(lesson, meta || {});
    const bgPicks = await window.SceneBackgrounds.planFor(sections);
    boardPlan.bgPicks = bgPicks;
    return bgPicks;
  }

  async function render(lesson, meta, boardPlan) {
    if (window.VocabIcons && window.VocabIcons.ready) {
      await window.VocabIcons.ready();
    }
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
    push(makeWarmUp(lesson, boardPlan), 'warm');
    slots.newWords = push(await makeVocab(lesson, boardPlan), 'newWords');
    push(makeVocabSentences(lesson), 'vocabSentences');
    push(makeFrames(lesson), 'frames');

    const storyPages = (lesson.story?.pages || []).slice(0, 2);
    const storyCount = storyPageCount(lesson);
    if (storyPages.length === 0) {
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Read together.', visualTheme: 'nature' }, 0, boardPlan), 'story0');
    } else {
      for (let i = 0; i < storyCount; i++) {
        push(makeStoryPage(lesson, storyPages[i] || storyPages[0], i, boardPlan), 'story' + i);
      }
    }

    push(makeComprehension(lesson), 'comprehension');
    if (includeCreative(lesson, m)) {
      push(makeCreative(lesson), 'creative');
    }

    const chunks = speakingChunks(lesson);
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

  window.LessonPages = {
    render, cleanup, buildSectionList, attachBgPicks, applyPackBg,
    BOARD_W: W, BOARD_H: H,
  };
})();
