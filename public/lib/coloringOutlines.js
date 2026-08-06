/* coloringOutlines.js — topic-matched warm-up coloring outlines for A1/A2.
 * Classic script → window.ColoringOutlines
 *
 * Eyes are ONLY for face lessons. Generic fallback is a star — never eyes.
 */
(function () {
  const EYES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" width="100%" height="100%" style="max-height:280px" fill="none" aria-label="Eye outlines to color">
  <g stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="170" cy="150" rx="110" ry="72"/>
    <circle cx="170" cy="150" r="36" stroke-width="7"/>
    <circle cx="170" cy="150" r="14" fill="#334155" stroke="none"/>
    <path d="M70 88 Q170 28 270 88" stroke-width="7"/>
    <ellipse cx="470" cy="150" rx="110" ry="72"/>
    <circle cx="470" cy="150" r="36" stroke-width="7"/>
    <circle cx="470" cy="150" r="14" fill="#334155" stroke="none"/>
    <path d="M370 88 Q470 28 570 88" stroke-width="7"/>
  </g>
</svg>`;

  const CASTLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" style="max-height:280px" fill="none" aria-label="Castle outline to color">
  <g stroke="#334155" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M80 280 L80 140 L120 140 L120 100 L160 100 L160 140 L200 140 L200 80 L240 80 L240 140 L280 140 L280 60 L360 60 L360 140 L400 140 L400 80 L440 80 L440 140 L480 140 L480 100 L520 100 L520 140 L560 140 L560 280 Z"/>
    <path d="M280 60 L300 30 L320 60 L340 30 L360 60"/>
    <rect x="300" y="180" width="40" height="100"/>
    <path d="M300 180 Q320 150 340 180"/>
    <circle cx="200" cy="200" r="18"/>
    <circle cx="440" cy="200" r="18"/>
    <path d="M120 280 L120 240 L160 240 L160 280" stroke-width="5"/>
    <path d="M480 280 L480 240 L520 240 L520 280" stroke-width="5"/>
  </g>
</svg>`;

  const BEACH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" style="max-height:280px" fill="none" aria-label="Sandcastle outline to color">
  <g stroke="#334155" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 280 Q160 250 320 280 Q480 310 600 270" stroke-width="6"/>
    <path d="M160 280 L200 160 L280 160 L320 100 L360 160 L440 160 L480 280 Z"/>
    <path d="M280 160 L300 120 L320 160 L340 120 L360 160" stroke-width="5"/>
    <rect x="300" y="200" width="40" height="80"/>
    <path d="M300 200 Q320 175 340 200"/>
    <circle cx="240" cy="210" r="14"/>
    <circle cx="400" cy="210" r="14"/>
    <path d="M500 180 L520 120 L540 180" stroke-width="5"/>
    <circle cx="520" cy="110" r="16" stroke-width="5"/>
    <path d="M100 220 L90 200 M100 220 L110 200 M100 220 L100 250" stroke-width="5"/>
  </g>
</svg>`;

  const STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" style="max-height:280px" fill="none" aria-label="Star outline to color">
  <g stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M320 28 L355 130 L470 130 L378 192 L412 294 L320 232 L228 294 L262 192 L170 130 L285 130 Z"/>
  </g>
</svg>`;

  const CRAYONS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" width="110" height="82" aria-hidden="true">
  <g stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 78 L18 40 L28 28 L38 40 Z" fill="#fda4af"/>
    <path d="M28 28 L28 18" stroke-width="2"/>
    <path d="M58 78 L52 36 L62 22 L72 36 Z" fill="#93c5fd"/>
    <path d="M62 22 L62 10" stroke-width="2"/>
    <path d="M90 78 L82 42 L94 28 L104 42 Z" fill="#fde68a"/>
    <path d="M94 28 L94 16" stroke-width="2"/>
  </g>
</svg>`;

  const OUTLINES = {
    eyes: { id: 'eyes', label: 'eyes', svg: EYES },
    castle: { id: 'castle', label: 'castle', svg: CASTLE },
    beach: { id: 'beach', label: 'sandcastle', svg: BEACH },
    star: { id: 'star', label: 'star', svg: STAR },
  };

  /** First matching rule wins. Generic never maps to eyes. */
  const RULES = [
    { id: 'eyes', re: /\b(face|faces|eye|eyes|nose|mouth|smile|hair)\b/ },
    { id: 'castle', re: /\b(castle|castles|knight|knights|dragon|dragons|royal|fortress)\b/ },
    { id: 'beach', re: /\b(beach|beaches|sand|sandcastle|ocean|sea|shell|seashell)\b/ },
  ];

  function wantsColoring(meta) {
    const level = String((meta && meta.level) || '').trim().toUpperCase();
    return level === 'A1' || level === 'A2';
  }

  function lessonBlob(lesson) {
    if (!lesson) return '';
    const bits = [
      lesson.title,
      lesson.activity && lesson.activity.title,
      lesson.activity && lesson.activity.prompt,
      lesson.warmUp && lesson.warmUp.question,
      lesson.warmUp && lesson.warmUp.sampleAnswer,
    ];
    const vocab = lesson.vocabulary || [];
    for (const v of vocab) {
      bits.push(typeof v === 'string' ? v : v && v.word);
    }
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  function pickOutlineId(lesson) {
    const blob = lessonBlob(lesson);
    for (const rule of RULES) {
      if (rule.re.test(blob)) return rule.id;
    }
    return 'star';
  }

  /**
   * @returns {null|{id:string,label:string,svg:string,crayons:string}}
   * null when level is not A1/A2 (question-only warm-up).
   */
  function forLesson(lesson, meta) {
    if (!wantsColoring(meta)) return null;
    const id = pickOutlineId(lesson);
    const base = OUTLINES[id] || OUTLINES.star;
    return {
      id: base.id,
      label: base.label,
      svg: base.svg,
      crayons: CRAYONS,
    };
  }

  window.ColoringOutlines = {
    EYES,
    CASTLE,
    BEACH,
    STAR,
    CRAYONS,
    RULES,
    OUTLINES,
    wantsColoring,
    forLesson,
  };
})();
