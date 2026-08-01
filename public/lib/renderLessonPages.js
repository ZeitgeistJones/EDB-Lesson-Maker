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

  function pageShell(bg) {
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
    return p;
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

  function makeTitle(lesson, meta) {
    const p = pageShell(THEME_COLORS.title);
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
    p.appendChild(img(characterUrl(0), { right: '60px', bottom: '30px', width: '280px', height: '320px' }));
    p.appendChild(img('assets/04_decoration-ui/star.svg', { right: '320px', top: '70px', width: '64px', height: '64px' }));
    return p;
  }

  function makeWarmUp(lesson) {
    const p = pageShell(THEME_COLORS.warm);
    p.appendChild(header('Warm Up', '#e11d48'));
    p.appendChild(card(`<div style="font-size:28px;font-weight:700;color:#1e3a8a;text-align:center">${esc(lesson.warmUp?.question || '')}</div>`));
    p.appendChild(el('div', { fontSize: '14px', color: '#64748b', margin: '8px 0 6px', fontWeight: '700' }, 'Sample answer'));
    p.appendChild(card(`<div style="font-size:22px;font-style:italic;color:#be123c;text-align:center">${esc(lesson.warmUp?.sampleAnswer || '')}</div>`));
    p.appendChild(img(characterUrl(1), { right: '40px', bottom: '20px', width: '200px', height: '240px', opacity: '0.95' }));
    return p;
  }

  function makeVocab(lesson) {
    const p = pageShell(THEME_COLORS.vocab);
    p.appendChild(header('New Words', '#7c3aed'));
    p.appendChild(el('div', { fontSize: '16px', color: '#64748b', marginBottom: '14px' },
      'Say each word. Drag the matching pictures onto the board.'));
    const grid = el('div', {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
    });
    (lesson.vocabulary || []).slice(0, 6).forEach((v, i) => {
      grid.appendChild(card(
        `<div style="display:flex;align-items:center;gap:14px">
          <div style="width:56px;height:56px;border-radius:12px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:28px">${esc(v.emoji || '•')}</div>
          <div style="font-size:26px;font-weight:800">${esc(v.word || '')}</div>
        </div>`,
        { marginBottom: '0' }
      ));
    });
    p.appendChild(grid);
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

  function makeStoryPage(lesson, page, index) {
    const p = pageShell('#fff7ed');
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
    const layout = el('div', { display: 'flex', gap: '24px', alignItems: 'stretch' });
    const side = el('div', {
      width: '320px', flexShrink: '0', borderRadius: '18px', overflow: 'hidden',
      background: 'rgba(255,255,255,0.85)', minHeight: '360px', position: 'relative',
    });
    side.appendChild(img(characterUrl(index + 2), {
      left: '20px', bottom: '10px', width: '260px', height: '300px', position: 'absolute',
    }));
    side.appendChild(el('div', {
      position: 'absolute', left: '16px', right: '16px', top: '16px',
      background: '#1e293b', color: '#fff', borderRadius: '10px', padding: '8px 12px',
      fontSize: '14px', fontWeight: '700', textAlign: 'center',
    }, esc(page?.visualCaption || page?.visualTheme || 'Scene')));
    const text = card(`<div style="font-size:18px;line-height:1.45;color:#1e293b">${esc(page?.text || '')}</div>`, {
      flex: '1', marginBottom: '0', minHeight: '360px',
    });
    layout.appendChild(side);
    layout.appendChild(text);
    content.appendChild(layout);
    p.appendChild(content);
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
    return p;
  }

  function makeSpeaking(item, i, total) {
    const p = pageShell(THEME_COLORS.speak);
    p.appendChild(header("Let's Talk!", '#15803d'));
    p.appendChild(el('div', { fontSize: '14px', color: '#64748b', marginBottom: '10px' },
      `Question ${i + 1} of ${total}`));
    p.appendChild(card(`<div style="font-size:26px;font-weight:800;text-align:center;color:#14532d">${esc(item.question || '')}</div>`));
    p.appendChild(el('div', { fontSize: '13px', color: '#64748b', fontWeight: '700', margin: '8px 0' }, 'Sample answer'));
    p.appendChild(card(`<div style="font-size:20px;font-style:italic;text-align:center;color:#166534">${esc(item.sampleAnswer || '')}</div>`));
    return p;
  }

  function makeActivity(lesson) {
    const p = pageShell(THEME_COLORS.activity);
    p.appendChild(header(lesson.activity?.title || 'Your Turn!', '#4338ca'));
    p.appendChild(el('div', { fontSize: '16px', color: '#64748b', marginBottom: '12px', textAlign: 'center' },
      esc(lesson.activity?.prompt || '')));
    (lesson.activity?.templates || []).slice(0, 5).forEach((t, i) => {
      p.appendChild(card(`<div style="font-size:20px;font-weight:700">${i + 1}. ${esc(t)}</div>`, { padding: '12px 16px' }));
    });
    return p;
  }

  function makeWrap(lesson) {
    const p = pageShell(THEME_COLORS.wrap);
    p.appendChild(el('div', {
      color: '#fff', fontSize: '48px', fontWeight: '800', textAlign: 'center', marginTop: '40px',
    }, 'Great Job!'));
    p.appendChild(el('div', {
      color: 'rgba(255,255,255,0.85)', fontSize: '18px', textAlign: 'center', margin: '12px 0 20px', fontStyle: 'italic',
    }, "Today's key sentences — build one with the word tiles"));
    (lesson.reviewSentences || []).slice(0, 3).forEach((s) => {
      p.appendChild(el('div', {
        color: '#fff', fontSize: '22px', textAlign: 'center', marginBottom: '10px',
      }, esc(s)));
    });
    p.appendChild(img(characterUrl(5), { left: '40px', bottom: '20px', width: '180px', height: '220px' }));
    p.appendChild(img('assets/04_decoration-ui/star.svg', { right: '80px', top: '60px', width: '80px', height: '80px' }));
    return p;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render(lesson, meta) {
    const host = el('div', {
      position: 'fixed', left: '-10000px', top: '0', width: W + 'px',
      pointerEvents: 'none', opacity: '0', zIndex: '-1',
    });
    document.body.appendChild(host);

    const pageEls = [];
    const slots = {};

    function push(node) {
      host.appendChild(node);
      pageEls.push(node);
      return pageEls.length - 1;
    }

    push(makeTitle(lesson, meta || {}));
    push(makeWarmUp(lesson));
    slots.newWords = push(makeVocab(lesson));
    push(makeVocabSentences(lesson));
    push(makeFrames(lesson));

    const storyPages = (lesson.story?.pages || []).slice(0, 2);
    if (storyPages.length === 0) {
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Read together.', visualTheme: 'nature' }, 0));
      push(makeStoryPage(lesson, { heading: 'Story', text: 'Continue the story.', visualTheme: 'park' }, 1));
    } else {
      storyPages.forEach((sp, i) => push(makeStoryPage(lesson, sp, i)));
      if (storyPages.length === 1) {
        push(makeStoryPage(lesson, { heading: 'Story', text: storyPages[0].text || '', visualTheme: storyPages[0].visualTheme }, 1));
      }
    }

    push(makeComprehension(lesson));
    push(makeCreative(lesson));

    const speaking = lesson.speakingQuestions || [];
    speaking.forEach((q, i) => push(makeSpeaking(q, i, speaking.length)));

    push(makeActivity(lesson));
    slots.wrap = push(makeWrap(lesson));

    return { pageEls, slots, host };
  }

  function cleanup(host) {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }

  window.LessonPages = { render, cleanup, BOARD_W: W, BOARD_H: H };
})();
