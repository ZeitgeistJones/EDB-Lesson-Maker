/* coloringOutlines.js — topic-matched warm-up coloring outlines for A1/A2.
 * Classic script → window.ColoringOutlines
 *
 * Eyes are ONLY for face lessons. Prefer banked 2×2 PNG crops when present;
 * SVG fallbacks for eyes / castle / generic star. Never leak eyes as fallback.
 */
(function () {
  const EYES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block" fill="none" aria-label="Eye outlines to color">
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

  const CASTLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block" fill="none" aria-label="Castle outline to color">
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

  const STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block" fill="none" aria-label="Star outline to color">
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

  /** Primary PNG per theme — banked from 2×2 ChatGPT sheets. */
  const BANK = {
    beach: { file: 'sandcastle.png', label: 'sandcastle' },
    animals: { file: 'dog.png', label: 'dog' },
    food: { file: 'apple.png', label: 'apple' },
    vehicles: { file: 'car.png', label: 'car' },
    space: { file: 'rocket.png', label: 'rocket' },
    family: { file: 'house.png', label: 'house' },
    weather: { file: 'sun.png', label: 'sun' },
    nature: { file: 'tree.png', label: 'tree' },
  };

  const BANK_BASE = 'assets/10_coloring/img/';

  function imgHtml(file, label) {
    const src = BANK_BASE + file;
    return (
      `<img src="${src}" alt="${label} outline to color" ` +
      'style="max-height:300px;max-width:100%;width:auto;height:auto;object-fit:contain;display:block">'
    );
  }

  /** First matching rule wins. Generic never maps to eyes. */
  const RULES = [
    // Eyes are face-kit only — bare "smile"/"mouth" on dentist lessons must NOT
    // steal the face eye outline (board-ux: eyes = face lessons).
    { id: 'eyes', re: /\b(face|faces|eye|eyes|nose|hair)\b|make.?a.?face|blank.?face/ },
    { id: 'castle', re: /\b(castle|castles|knight|knights|dragon|dragons|royal|fortress)\b/ },
    { id: 'beach', re: /\b(beach|beaches|sand|sandcastle|ocean|sea|shell|seashell|pail|shovel)\b/ },
    { id: 'space', re: /\b(space|rocket|planet|moon|astronaut|starship|ufo|satellite)\b/ },
    { id: 'vehicles', re: /\b(car|cars|bus|train|bike|bicycle|airplane|plane|helicopter|boat|truck|vehicle)\b/ },
    { id: 'animals', re: /\b(dog|cat|bird|fish|rabbit|elephant|butterfly|frog|animal|animals|pet|pets)\b/ },
    { id: 'food', re: /\b(food|apple|banana|pizza|hamburger|burger|cake|carrot|ice.?cream|juice|eat|hungry)\b/ },
    { id: 'family', re: /\b(family|mom|dad|mother|father|baby|grandma|grandpa|sister|brother|house|home)\b/ },
    { id: 'weather', re: /\b(weather|sunny|rain|rainy|cloud|snow|snowflake|umbrella|wind|storm|sun)\b/ },
    { id: 'nature', re: /\b(tree|trees|flower|forest|park|garden|nature)\b/ },
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
   * @returns {null|{id:string,label:string,html:string,crayons:string,source:string}}
   * null when level is not A1/A2 (question-only warm-up).
   */
  function forLesson(lesson, meta) {
    if (!wantsColoring(meta)) return null;
    const id = pickOutlineId(lesson);

    if (id === 'eyes') {
      return { id: 'eyes', label: 'eyes', html: EYES, crayons: CRAYONS, source: 'svg' };
    }
    if (id === 'castle') {
      // No 2×2 castle sheet yet — crisp SVG until banked.
      return { id: 'castle', label: 'castle', html: CASTLE, crayons: CRAYONS, source: 'svg' };
    }
    if (id === 'star') {
      return { id: 'star', label: 'star', html: STAR, crayons: CRAYONS, source: 'svg' };
    }

    const bank = BANK[id];
    if (bank) {
      return {
        id,
        label: bank.label,
        html: imgHtml(bank.file, bank.label),
        crayons: CRAYONS,
        source: 'png',
      };
    }

    return { id: 'star', label: 'star', html: STAR, crayons: CRAYONS, source: 'svg' };
  }

  window.ColoringOutlines = {
    EYES,
    CASTLE,
    STAR,
    CRAYONS,
    BANK,
    RULES,
    wantsColoring,
    forLesson,
  };
})();
