/* coloringOutlines.js — topic-matched warm-up coloring outlines for A1/A2.
 * Classic script → window.ColoringOutlines
 *
 * Eyes are ONLY for face lessons. Prefer banked PNG crops when present;
 * SVG fallbacks for eyes / castle / generic star. Never leak eyes as fallback.
 *
 * Topic pick prefers title + vocab (+ activity / warm question) over sampleAnswer
 * so incidental words like "bus" don't steal a cat lesson's outline.
 */
(function () {
  const EYES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-height:100%;max-width:100%" fill="none" aria-label="Eye outlines to color">
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

  const CASTLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-height:100%;max-width:100%" fill="none" aria-label="Castle outline to color">
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

  const STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-height:100%;max-width:100%" fill="none" aria-label="Star outline to color">
  <g stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M320 28 L355 130 L470 130 L378 192 L412 294 L320 232 L228 294 L262 192 L170 130 L285 130 Z"/>
  </g>
</svg>`;

  /** Basketball / sports warm-up — no banked PNG yet; SVG beats wrong-theme tree/car. */
  const BASKETBALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-height:100%;max-width:100%" fill="none" aria-label="Basketball outline to color">
  <g stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="320" cy="160" r="118"/>
    <path d="M320 42 V278" stroke-width="7"/>
    <path d="M202 160 H438" stroke-width="7"/>
    <path d="M230 70 Q320 120 410 70" stroke-width="7"/>
    <path d="M230 250 Q320 200 410 250" stroke-width="7"/>
  </g>
</svg>`;

  /** Soccer ball warm-up — soccer lessons must not get the basketball outline. */
  const SOCCER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-height:100%;max-width:100%" fill="none" aria-label="Soccer ball outline to color">
  <g stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="320" cy="160" r="118"/>
    <path d="M320 70 L370 105 L350 165 L290 165 L270 105 Z" stroke-width="7"/>
    <path d="M370 105 L430 130 L410 190 L350 165" stroke-width="6"/>
    <path d="M270 105 L210 130 L230 190 L290 165" stroke-width="6"/>
    <path d="M350 165 L410 190 L380 250 L320 230 L290 165" stroke-width="6"/>
    <path d="M290 165 L230 190 L260 250 L320 230" stroke-width="6"/>
  </g>
</svg>`;

  /** Bathroom / daily wash warm-up — toothbrush + toothpaste still-life (no banked PNG yet). */
  const BATHROOM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-height:100%;max-width:100%" fill="none" aria-label="Toothbrush and toothpaste outline to color">
  <g stroke="#334155" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M110 250 L250 110" stroke-width="10"/>
    <rect x="228" y="88" width="92" height="44" rx="10" stroke-width="7"/>
    <path d="M248 132 V152 M268 132 V152 M288 132 V152 M308 132 V152" stroke-width="5"/>
    <path d="M248 152 V168 M268 152 V168 M288 152 V168 M308 152 V168" stroke-width="4"/>
    <path d="M420 78 L470 58 L510 78 L510 228 L470 248 L420 228 Z" stroke-width="7"/>
    <path d="M445 58 L475 58 L475 78 L445 78 Z" stroke-width="6"/>
    <path d="M460 48 Q475 34 490 48" stroke-width="6"/>
    <path d="M470 248 L470 268 Q455 282 440 268 L440 248" stroke-width="6"/>
    <path d="M438 118 L502 118 M438 148 L502 148 M438 178 L502 178" stroke-width="5"/>
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

  /** Default PNG per theme — banked from 2×2 ChatGPT sheets. */
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

  /** Specific bank files when the topic names them (first match wins). */
  const BANK_OVERRIDES = {
    animals: [
      { re: /\bcat\b/, file: 'cat.png', label: 'cat' },
      { re: /\bdog\b/, file: 'dog.png', label: 'dog' },
      { re: /\brabbit\b/, file: 'rabbit.png', label: 'rabbit' },
      { re: /\belephant\b/, file: 'elephant.png', label: 'elephant' },
      { re: /\bbutterfly\b/, file: 'butterfly.png', label: 'butterfly' },
      { re: /\bfrog\b/, file: 'frog.png', label: 'frog' },
    ],
    vehicles: [
      { re: /\b(bike|bicycle)\b/, file: 'bicycle.png', label: 'bicycle' },
      { re: /\btrain\b/, file: 'train.png', label: 'train' },
      { re: /\b(airplane|plane)\b/, file: 'airplane.png', label: 'airplane' },
      { re: /\b(car|cars|bus|truck|vehicle)\b/, file: 'car.png', label: 'car' },
    ],
    food: [
      { re: /\bbanana\b/, file: 'banana.png', label: 'banana' },
      { re: /\bpizza\b/, file: 'pizza.png', label: 'pizza' },
      { re: /\b(hamburger|burger)\b/, file: 'hamburger.png', label: 'hamburger' },
      { re: /\bcarrot\b/, file: 'carrot.png', label: 'carrot' },
      { re: /\bcake\b/, file: 'cake.png', label: 'cake' },
      { re: /\bice.?cream\b/, file: 'ice-cream.png', label: 'ice cream' },
      { re: /\bjuice\b/, file: 'juice-box.png', label: 'juice' },
      { re: /\bapple\b/, file: 'apple.png', label: 'apple' },
    ],
    beach: [
      { re: /\b(pail|shovel)\b/, file: 'pail.png', label: 'pail' },
      { re: /\b(shell|seashell)\b/, file: 'seashell.png', label: 'seashell' },
      { re: /\bsandcastle\b/, file: 'sandcastle.png', label: 'sandcastle' },
    ],
    space: [
      { re: /\bplanet\b/, file: 'planet.png', label: 'planet' },
      { re: /\bmoon\b/, file: 'moon.png', label: 'moon' },
      { re: /\bastronaut\b/, file: 'astronaut.png', label: 'astronaut' },
      { re: /\brocket\b/, file: 'rocket.png', label: 'rocket' },
    ],
    family: [
      { re: /\b(mom|mother)\b/, file: 'mom.png', label: 'mom' },
      { re: /\b(dad|father)\b/, file: 'dad.png', label: 'dad' },
      { re: /\bbaby\b/, file: 'baby.png', label: 'baby' },
      { re: /\b(house|home)\b/, file: 'house.png', label: 'house' },
    ],
    nature: [
      { re: /\bflower\b/, file: 'flower.png', label: 'flower' },
      { re: /\b(tree|trees|forest|park|garden|nature)\b/, file: 'tree.png', label: 'tree' },
    ],
    weather: [
      { re: /\b(sun|sunny)\b/, file: 'sun.png', label: 'sun' },
    ],
  };

  const BANK_BASE = 'assets/10_coloring/img/';

  function imgHtml(file, label) {
    const src = BANK_BASE + file;
    return (
      `<img src="${src}" alt="${label} outline to color" ` +
      'style="max-height:100%;max-width:100%;width:auto;height:auto;object-fit:contain;display:block">'
    );
  }

  /**
   * First matching rule wins on the blob it is given.
   * Animals before vehicles so "cat" / pet lessons aren't stolen by incidental
   * transport words when both somehow appear in the same primary blob.
   */
  const RULES = [
    // Eyes are face-kit only — bare "smile"/"mouth" on dentist lessons must NOT
    // steal the face eye outline (board-ux: eyes = face lessons).
    { id: 'eyes', re: /\b(face|faces|eye|eyes|nose|hair)\b|make.?a.?face|blank.?face/ },
    { id: 'castle', re: /\b(castle|castles|knight|knights|dragon|dragons|royal|fortress)\b/ },
    // Bathroom before sports/nature — "wash"/"mirror" must not fall through to star.
    { id: 'bathroom', re: /\b(bathrooms?|bathtub|shower|soap|toothbrush|toothpaste|towel|mirror|toilet|shampoo|faucet|loofah|wash\s*(?:your\s*)?(?:hands|face)|brush\s*teeth|wash\s*up)\b/ },
    { id: 'beach', re: /\b(beach|beaches|sand|sandcastle|ocean|sea|shell|seashell|pail|shovel)\b/ },
    { id: 'space', re: /\b(space|rocket|planet|moon|astronaut|starship|ufo|satellite)\b/ },
    // Sports before animals/nature/vehicles — "court"/"hoop" must not steal
    // a basketball lesson onto dog / tree / car (basketball SVG until banked PNG).
    { id: 'sports', re: /\b(basketball|soccer|football|tennis|baseball|volleyball|sports?|sporty|gym|athletic|athletics|coach|whistle|goalkeeper|kickoff|pitch|court|hoops?)\b/ },
    { id: 'animals', re: /\b(dog|cat|bird|fish|rabbit|elephant|butterfly|frog|animal|animals|pet|pets)\b/ },
    { id: 'vehicles', re: /\b(car|cars|bus|train|bike|bicycle|airplane|plane|helicopter|boat|truck|vehicle)\b/ },
    { id: 'food', re: /\b(food|apple|banana|pizza|hamburger|burger|cake|carrot|ice.?cream|juice|eat|hungry)\b/ },
    { id: 'family', re: /\b(family|mom|dad|mother|father|baby|grandma|grandpa|sister|brother|house|home)\b/ },
    { id: 'weather', re: /\b(weather|sunny|rain|rainy|cloud|snow|snowflake|umbrella|wind|storm|sun)\b/ },
    { id: 'nature', re: /\b(tree|trees|flower|forest|park|garden|nature)\b/ },
  ];

  function wantsColoring(meta) {
    const level = String((meta && meta.level) || '').trim().toUpperCase();
    return level === 'A1' || level === 'A2';
  }

  /** Title / vocab / activity / warm question — NOT sampleAnswer. */
  function topicBlob(lesson) {
    if (!lesson) return '';
    const bits = [
      lesson.title,
      lesson.activity && lesson.activity.title,
      lesson.activity && lesson.activity.prompt,
      lesson.warmUp && lesson.warmUp.question,
    ];
    const vocab = lesson.vocabulary || [];
    for (const v of vocab) {
      bits.push(typeof v === 'string' ? v : v && v.word);
    }
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  /** Full blob including sampleAnswer — fallback only when topic is silent. */
  function lessonBlob(lesson) {
    if (!lesson) return '';
    const bits = [topicBlob(lesson)];
    if (lesson.warmUp && lesson.warmUp.sampleAnswer) {
      bits.push(String(lesson.warmUp.sampleAnswer));
    }
    return bits.filter(Boolean).join(' ').toLowerCase();
  }

  function matchRuleId(blob) {
    if (!blob) return null;
    for (const rule of RULES) {
      if (rule.re.test(blob)) return rule.id;
    }
    return null;
  }

  function pickOutlineId(lesson) {
    // Prefer title/vocab so "I rode the bus…" in sampleAnswer cannot steal a cat lesson.
    return matchRuleId(topicBlob(lesson)) || matchRuleId(lessonBlob(lesson)) || 'star';
  }

  function resolveBankEntry(id, lesson) {
    const fallback = BANK[id];
    if (!fallback) return null;
    const blob = topicBlob(lesson) || lessonBlob(lesson);
    const overrides = BANK_OVERRIDES[id] || [];
    // Earliest mention in the topic blob wins (dog before cat when both appear).
    let best = null;
    let bestIdx = Infinity;
    for (const o of overrides) {
      const m = blob.match(o.re);
      if (m && typeof m.index === 'number' && m.index < bestIdx) {
        bestIdx = m.index;
        best = o;
      }
    }
    if (best) return { file: best.file, label: best.label };
    return fallback;
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
    if (id === 'bathroom') {
      return { id: 'bathroom', label: 'toothbrush and toothpaste', html: BATHROOM, crayons: CRAYONS, source: 'svg' };
    }
    if (id === 'star') {
      return { id: 'star', label: 'star', html: STAR, crayons: CRAYONS, source: 'svg' };
    }
    if (id === 'sports') {
      const blob = topicBlob(lesson) || lessonBlob(lesson);
      const soccer = /\b(soccer|football|goalkeeper|kickoff|pitch|fifa|goalie|striker)\b/.test(blob)
        && !/\bbasketball\b/.test(blob);
      if (soccer) {
        return { id: 'sports', label: 'soccer ball', html: SOCCER, crayons: CRAYONS, source: 'svg' };
      }
      return { id: 'sports', label: 'basketball', html: BASKETBALL, crayons: CRAYONS, source: 'svg' };
    }

    const bank = resolveBankEntry(id, lesson);
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
    BASKETBALL,
    SOCCER,
    BATHROOM,
    CRAYONS,
    BANK,
    BANK_OVERRIDES,
    RULES,
    wantsColoring,
    topicBlob,
    lessonBlob,
    forLesson,
  };
})();
