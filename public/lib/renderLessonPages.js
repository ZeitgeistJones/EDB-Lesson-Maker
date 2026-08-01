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
      padding: '36px 48px',
    });
    if (opts && opts.reserveDock) {
      // Match dock zone height so chrome doesn't paint over pieces
      const pageType = opts.pageType || 'warm';
      const pad = window.EdbLayout
        ? window.EdbLayout.dockReservePx(pageType)
        : 130;
      p.style.paddingBottom = pad + 'px';
    }
    return p;
  }

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

  function placeCharacter(p, pageType, index) {
    if (!window.EdbLayout) {
      p.appendChild(img(characterUrl(index), {
        right: '40px', bottom: '20px', width: '200px', height: '240px',
      }));
      return;
    }
    const page = window.EdbLayout.createPage(pageType);
    const piece = window.EdbLayout.place(page, {
      locked: true,
      kind: 'image',
      asset: characterUrl(index),
      w: pageType === 'title' ? 280 : 200,
      h: pageType === 'title' ? 320 : 240,
      prefer: 'artSafe',
      role: 'character',
    });
    p.appendChild(img(piece.asset, {
      left: piece.x + 'px',
      top: piece.y + 'px',
      width: piece.w + 'px',
      height: piece.h + 'px',
    }));
  }

  function recipeHint(boardPlan, pageKey) {
    const ids = (boardPlan?.assignments || [])
      .filter((a) => a.pageKey === pageKey)
      .map((a) => a.recipeId);
    return ids.length ? ids.join(' + ') : '';
  }

  function hasRecipe(boardPlan, pageKey) {
    return (boardPlan?.assignments || []).some((a) => a.pageKey === pageKey);
  }

  function header(text, color) {
    return el('div', {
      fontSize: '34px',
      fontWeight: '800',
      color: color || '#17827C',
      marginBottom: '18px',
      letterSpacing: '-0.02em',
    }, text);
  }

  function card(html, extra) {
    return el('div', Object.assign({
      background: 'rgba(255,255,255,0.92)',
      borderRadius: '16px',
      padding: '18px 22px',
      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      marginBottom: '12px',
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

  function themeBgUrl(theme) {
    const t = String(theme || 'nature').toLowerCase();
    const known = ['park', 'school', 'home', 'city', 'beach', 'nature', 'kitchen', 'sports'];
    const key = known.includes(t) ? t : 'nature';
    return `assets/02_scenes-backgrounds/${key}/${key}-bg.svg`;
  }

  function characterUrl(i) {
    const names = ['alex', 'bailey', 'casey', 'drew', 'eden', 'finley', 'gray', 'harper'];
    return `assets/01_characters/${names[i % names.length]}.png`;
  }

  function makeTitle(lesson, meta, boardPlan) {
    const p = pageShell(THEME_COLORS.title, {
      reserveDock: hasRecipe(boardPlan, 'title'), pageType: 'title',
    });
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.75)', fontSize: '16px', fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '90px',
    }, 'ClassIn Lesson'));
    p.appendChild(el('div', {
      color: '#fff', fontSize: '54px', fontWeight: '800', marginTop: '12px',
      maxWidth: '820px', lineHeight: '1.1',
    }, lesson.title || 'Lesson'));
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.9)', fontSize: '22px', marginTop: '18px', fontStyle: 'italic',
    }, `${meta.level || ''}  ·  ${meta.duration || ''}-minute lesson`));
    placeCharacter(p, 'title', 0);
    p.appendChild(img('assets/04_decoration-ui/star.svg', { right: '320px', top: '70px', width: '64px', height: '64px' }));
    drawDebugZones(p, 'title');
    return p;
  }

  function makeWarmUp(lesson, boardPlan) {
    const p = pageShell(THEME_COLORS.warm, {
      reserveDock: hasRecipe(boardPlan, 'warm'), pageType: 'warm',
    });
    p.appendChild(header('Warm Up', '#e11d48'));
    p.appendChild(card(`<div style="font-size:28px;font-weight:700;color:#1e3a8a;text-align:center">${esc(lesson.warmUp?.question || '')}</div>`));
    p.appendChild(el('div', { fontSize: '14px', color: '#64748b', margin: '8px 0 6px', fontWeight: '700' }, 'Sample answer'));
    p.appendChild(card(`<div style="font-size:22px;font-style:italic;color:#be123c;text-align:center">${esc(lesson.warmUp?.sampleAnswer || '')}</div>`));
    placeCharacter(p, 'warm', 1);
    drawDebugZones(p, 'warm');
    return p;
  }

  function makeVocab(lesson, boardPlan) {
    const interactive = hasRecipe(boardPlan, 'newWords');
    const p = pageShell(THEME_COLORS.vocab, {
      reserveDock: interactive, pageType: 'vocab',
    });
    p.appendChild(header('New Words', '#7c3aed'));
    const hint = recipeHint(boardPlan, 'newWords');
    p.appendChild(el('div', { fontSize: '16px', color: '#64748b', marginBottom: '14px' },
      interactive
        ? `Interactive: ${hint || 'drag pieces'}. Say each word, then use the pieces.`
        : 'Say each word. Drag the matching pictures onto the board.'));
    const grid = el('div', {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
      maxWidth: interactive ? '700px' : '100%',
    });
    (lesson.vocabulary || []).slice(0, 6).forEach((v) => {
      grid.appendChild(card(
        `<div style="display:flex;align-items:center;gap:14px">
          <div style="width:56px;height:56px;border-radius:12px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:28px">${esc(v.emoji || '•')}</div>
          <div style="font-size:26px;font-weight:800">${esc(v.word || '')}</div>
        </div>`,
        { marginBottom: '0' }
      ));
    });
    p.appendChild(grid);
    drawDebugZones(p, 'vocab');
    return p;
  }

  function makeVocabSentences(lesson) {
    const p = pageShell(THEME_COLORS.vocab);
    p.appendChild(header('New Words — In Sentences', '#7c3aed'));
    const grid = el('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' });
    (lesson.vocabulary || []).slice(0, 6).forEach((v) => {
      grid.appendChild(card(
        `<div style="font-size:18px;font-weight:800;margin-bottom:6px">${esc(v.word || '')}</div>
         <div style="font-size:15px;color:#475569;font-style:italic">${esc(v.sentence || '')}</div>`,
        { marginBottom: '0', padding: '14px 16px' }
      ));
    });
    p.appendChild(grid);
    return p;
  }

  function makeFrames(lesson) {
    const p = pageShell(THEME_COLORS.frames);
    p.appendChild(header('Sentence Frames', '#c4b5fd'));
    (lesson.sentenceFrames || []).slice(0, 5).forEach((f, i) => {
      const row = el('div', {
        display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', color: '#fff',
      });
      row.appendChild(el('div', {
        width: '16px', height: '16px', borderRadius: '50%',
        background: ['#f43f5e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][i % 5],
        flexShrink: '0',
      }));
      row.appendChild(el('div', { fontSize: '26px', fontWeight: '700' }, esc(f)));
      p.appendChild(row);
    });
    return p;
  }

  function makeStoryPage(lesson, page, index, boardPlan) {
    const pageKey = 'story' + index;
    const p = pageShell('#fff7ed', {
      reserveDock: hasRecipe(boardPlan, pageKey), pageType: 'story',
    });
    const bg = el('img', {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
      objectFit: 'cover', opacity: '0.35', zIndex: '0',
    });
    bg.src = themeBgUrl(page?.visualTheme);
    p.appendChild(bg);
    const content = el('div', { position: 'relative', zIndex: '1' });
    const title = index === 0
      ? `Story: ${lesson.story?.title || 'Let\'s Read!'}`
      : `Story (cont.): ${page?.heading || ''}`;
    content.appendChild(header(title, '#c2410c'));
    const hint = recipeHint(boardPlan, pageKey);
    if (hint) {
      content.appendChild(el('div', { fontSize: '14px', color: '#9a3412', marginBottom: '8px' },
        'Interactive: ' + hint));
    }
    const layout = el('div', { display: 'flex', gap: '24px', alignItems: 'stretch' });
    const side = el('div', {
      width: '320px', flexShrink: '0', borderRadius: '18px', overflow: 'hidden',
      background: 'rgba(255,255,255,0.85)', minHeight: '300px', position: 'relative',
    });
    side.appendChild(img(characterUrl(index + 2), {
      left: '20px', bottom: '10px', width: '260px', height: '280px', position: 'absolute',
    }));
    side.appendChild(el('div', {
      position: 'absolute', left: '16px', right: '16px', top: '16px',
      background: '#1e293b', color: '#fff', borderRadius: '10px', padding: '8px 12px',
      fontSize: '14px', fontWeight: '700', textAlign: 'center',
    }, esc(page?.visualCaption || page?.visualTheme || 'Scene')));
    const text = card(`<div style="font-size:18px;line-height:1.45;color:#1e293b">${esc(page?.text || '')}</div>`, {
      flex: '1', marginBottom: '0', minHeight: '300px',
    });
    layout.appendChild(side);
    layout.appendChild(text);
    content.appendChild(layout);
    p.appendChild(content);
    drawDebugZones(p, 'story');
    return p;
  }

  function makeComprehension(lesson) {
    const p = pageShell(THEME_COLORS.comp);
    p.appendChild(header('Reading Comprehension', '#1d4ed8'));
    (lesson.story?.comprehensionQuestions || []).slice(0, 3).forEach((q, i) => {
      p.appendChild(card(
        `<div style="font-size:18px;font-weight:800;margin-bottom:6px">${i + 1}. ${esc(q.question || '')}</div>
         <div style="font-size:15px;color:#64748b;font-style:italic">Sample: ${esc(q.sampleAnswer || '')}</div>`
      ));
    });
    drawDebugZones(p, 'comprehension');
    return p;
  }

  function makeCreative(lesson) {
    const p = pageShell(THEME_COLORS.creative);
    p.appendChild(header('Your Ideas!', '#059669'));
    p.appendChild(el('div', { fontSize: '15px', color: '#64748b', marginBottom: '14px' },
      'Open-ended — no single right answer.'));
    (lesson.story?.creativeQuestions || []).slice(0, 2).forEach((q, i) => {
      p.appendChild(card(
        `<div style="font-size:14px;color:#64748b;font-weight:700;margin-bottom:8px">Creative ${i + 1}</div>
         <div style="font-size:22px;font-weight:800;color:#134e4a">${esc(q)}</div>`
      ));
    });
    p.appendChild(img('assets/04_decoration-ui/confetti.svg', {
      right: '50px', bottom: '40px', width: '120px', height: '120px',
    }));
    drawDebugZones(p, 'creative');
    return p;
  }

  function makeSpeaking(item, i, total, boardPlan) {
    const pageKey = 'speaking:' + i;
    const covered = hasRecipe(boardPlan, pageKey);
    const p = pageShell(THEME_COLORS.speak, {
      reserveDock: covered, pageType: 'speaking',
    });
    p.appendChild(header("Let's Talk!", '#15803d'));
    p.appendChild(el('div', { fontSize: '14px', color: '#64748b', marginBottom: '10px' },
      `Question ${i + 1} of ${total}` + (covered ? ' — peel the sticky after answering' : '')));
    p.appendChild(card(`<div style="font-size:26px;font-weight:800;text-align:center;color:#14532d">${esc(item.question || '')}</div>`));
    if (covered) {
      // Sample band aligned to sticky (speaking.targetBay / speakingCoverRect)
      const r = (window.EdbActivities && window.EdbActivities.speakingCoverRect())
        || { x: 88, y: 300, w: 520, h: 90 };
      p.appendChild(el('div', {
        position: 'absolute',
        left: r.x + 'px',
        top: r.y + 'px',
        width: r.w + 'px',
        height: r.h + 'px',
        boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
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
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '700',
        zIndex: '2',
      }, 'Sample answer'));
    } else {
      p.appendChild(el('div', { fontSize: '13px', color: '#64748b', fontWeight: '700', margin: '8px 0' }, 'Sample answer'));
      p.appendChild(card(`<div style="font-size:20px;font-style:italic;text-align:center;color:#166534">${esc(item.sampleAnswer || '')}</div>`));
    }
    drawDebugZones(p, 'speaking');
    return p;
  }

  function makeActivity(lesson, boardPlan) {
    const interactive = hasRecipe(boardPlan, 'activity');
    const p = pageShell(THEME_COLORS.activity, {
      reserveDock: interactive, pageType: 'activity',
    });
    p.appendChild(header(lesson.activity?.title || 'Your Turn!', '#4338ca'));
    const hint = recipeHint(boardPlan, 'activity');
    p.appendChild(el('div', { fontSize: '16px', color: '#64748b', marginBottom: '12px', textAlign: 'center' },
      esc(lesson.activity?.prompt || '') + (hint ? ` · Interactive: ${hint}` : '')));
    const list = el('div', { maxWidth: interactive ? '680px' : '100%' });
    (lesson.activity?.templates || []).slice(0, 5).forEach((t, i) => {
      list.appendChild(card(`<div style="font-size:20px;font-weight:700">${i + 1}. ${esc(t)}</div>`, { padding: '12px 16px' }));
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
      color: '#fff', fontSize: '48px', fontWeight: '800', textAlign: 'center', marginTop: '40px',
    }, 'Great Job!'));
    const hint = recipeHint(boardPlan, 'wrap');
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.85)', fontSize: '18px', textAlign: 'center', margin: '12px 0 20px', fontStyle: 'italic',
    }, hint
      ? `Interactive: ${hint}`
      : "Today's key sentences — build one with the word tiles"));
    (lesson.reviewSentences || []).slice(0, 3).forEach((s) => {
      p.appendChild(el('div', {
        color: '#fff', fontSize: '22px', textAlign: 'center', marginBottom: '10px',
      }, esc(s)));
    });
    // Skip character on interactive wrap so tiles aren't baked onto the mascot
    if (!interactive) placeCharacter(p, 'wrap', 5);
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

  function render(lesson, meta, boardPlan) {
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

    push(makeTitle(lesson, meta || {}, boardPlan), 'title');
    push(makeWarmUp(lesson, boardPlan), 'warm');
    slots.newWords = push(makeVocab(lesson, boardPlan), 'newWords');
    push(makeVocabSentences(lesson), 'vocabSentences');
    push(makeFrames(lesson), 'frames');

    const storyPages = (lesson.story?.pages || []).slice(0, 2);
    if (storyPages.length === 0) {
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Read together.', visualTheme: 'nature' }, 0, boardPlan), 'story0');
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Continue the story.', visualTheme: 'park' }, 1, boardPlan), 'story1');
    } else {
      storyPages.forEach((sp, i) => push(makeStoryPage(lesson, sp, i, boardPlan), 'story' + i));
      if (storyPages.length === 1) {
        push(makeStoryPage(lesson, {
          heading: 'Story',
          text: storyPages[0].text || '',
          visualTheme: storyPages[0].visualTheme,
        }, 1, boardPlan), 'story1');
      }
    }

    push(makeComprehension(lesson), 'comprehension');
    push(makeCreative(lesson), 'creative');

    const speaking = lesson.speakingQuestions || [];
    speaking.forEach((q, i) => push(makeSpeaking(q, i, speaking.length, boardPlan), 'speaking:' + i));

    push(makeActivity(lesson, boardPlan), 'activity');
    slots.wrap = push(makeWrap(lesson, boardPlan), 'wrap');

    return { pageEls, slots, host, boardPlan: boardPlan || null };
  }

  function cleanup(host) {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  window.LessonPages = { render, cleanup, BOARD_W: W, BOARD_H: H };
})();
