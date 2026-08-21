/**
 * mysteryHints plan assignment — pictured non-king → mystery when fixSentence
 * and oddOneOut are not buildable; abstract → not; shippable dental/trampoline
 * still heroProp.
 *
 * Precedence (non-king): fixSentence → oddOneOut → mysteryHints (lesson) /
 * yesNoSort → thisOrThat → mysteryHints (derived) → sortBins.
 *
 *   npm run test:mystery-hints
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

function fileFetch(url) {
  const u = String(url);
  let rel = null;
  if (u.includes('07_vocab-pack/index')) rel = path.join(PUBLIC, 'assets/07_vocab-pack/index.json');
  else if (u.includes('propPolicy')) rel = path.join(PUBLIC, 'lib/propPolicy.json');
  else if (u.includes('09_props/manifest')) rel = path.join(PUBLIC, 'assets/09_props/manifest.json');
  if (!rel || !fs.existsSync(rel)) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  const body = fs.readFileSync(rel);
  return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(body.toString('utf8')) });
}

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  document: {
    createElement: (t) => (t !== 'canvas' ? {} : {
      width: 0, height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
      toDataURL: () => 'x',
    }),
  },
};
vm.createContext(sandbox);
for (const rel of [
  'public/lib/propBank.js', 'public/lib/vocabIcons.js', 'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js', 'public/lib/edbLayout.js', 'public/lib/edbActivities.js',
  'public/lib/boardReadiness.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.log('XX  ' + msg);
    failed++;
  } else {
    console.log('OK  ' + msg);
  }
}

function actRecipe(lesson, meta) {
  const plan = W.EdbActivities.plan(lesson, meta || { level: 'A2', duration: 30 });
  return (plan.assignments || []).find((a) => a.pageKey === 'activity') || null;
}

function actRecipeWithoutCoverageAdapt(lesson, meta) {
  const adapt = W.VocabArt.adaptBoardVocabulary;
  W.VocabArt.adaptBoardVocabulary = null;
  try {
    return actRecipe(lesson, meta);
  } finally {
    W.VocabArt.adaptBoardVocabulary = adapt;
  }
}

// Pictured sports bare — no shippable king; ≥4 pictured → oddOneOut (no fixSentence)
const sports = {
  title: 'Playing Basketball with Friends',
  vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
};
const sportsAct = actRecipe(sports);
assert(sportsAct && sportsAct.recipeId === 'oddOneOut',
  `pictured basketball bare → oddOneOut (≥4 pictured), got ${sportsAct && sportsAct.recipeId}`);
assert(sportsAct && sportsAct.ctx && sportsAct.ctx.odd,
  `oddOneOut ctx has odd, got ${sportsAct && sportsAct.ctx && sportsAct.ctx.odd}`);

// <4 pictured board words, bare (no sentences) → mysteryHints
const thinPic = {
  title: 'One Fruit Card',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'perseverance' },
    { word: 'integrity' },
  ],
};
const thinArt = W.VocabArt.planFor(thinPic);
const thinMatchN = (thinArt.matchable || []).length;
assert(thinMatchN >= 1 && thinMatchN < 4,
  `control: thinPic matchable in 1..3 (got ${thinMatchN})`);
assert(!W.EdbActivities.canBuildFixSentence(thinPic),
  'control: bare thin cannot build fixSentence');
const thinAct = actRecipeWithoutCoverageAdapt(thinPic);
assert(thinAct && thinAct.ctx && thinAct.ctx.targetWord,
  `mystery ctx has targetWord, got ${thinAct && thinAct.ctx && thinAct.ctx.targetWord}`);
assert(thinAct && thinAct.recipeId === 'mysteryHints',
  `1–3 pictured bare → mysteryHints, got ${thinAct && thinAct.recipeId}`);
assert(thinAct && thinAct.ctx && Array.isArray(thinAct.ctx.hints) && thinAct.ctx.hints.length === 3,
  'mystery ctx has 3 hints');
assert(
  thinAct && thinAct.ctx && thinAct.ctx.hints
    && !W.EdbActivities.hintNamesAnswer(thinAct.ctx.hints[0], thinAct.ctx.targetWord)
    && !W.EdbActivities.hintNamesAnswer(thinAct.ctx.hints[1], thinAct.ctx.targetWord),
  'hints 1–2 do not name the answer'
);
// Derived Hint 2 should be feature-level (not circular category restatement).
const derivedHints = W.EdbActivities.resolveMysteryHints('apple', {
  title: 'Fruit Snack',
  vocabulary: [{ word: 'apple' }],
});
assert(
  derivedHints && /round|snack|red|green/i.test(derivedHints[1])
    && !/^It is something you can eat/i.test(derivedHints[1]),
  `derived apple Hint 2 is feature-level (got ${derivedHints && derivedHints[1]})`
);
// Title already says "Fruit" — lesson Hint 1 that restates fruit must fall back.
const titleFruit = {
  title: 'One Fruit Card',
  vocabulary: [{ word: 'apple', emoji: '🍎' }, { word: 'perseverance' }, { word: 'gratitude' }],
  activity: {
    title: 'Mystery',
    prompt: 'Guess',
    templates: ['____'],
    mysteryHints: [
      'It is a fruit you can eat.',
      'It is round and often red or green.',
      'It starts with A.',
    ],
  },
};
const titleFruitHints = W.EdbActivities.resolveMysteryHints('apple', titleFruit);
assert(
  titleFruitHints && !/fruit you can eat/i.test(titleFruitHints[0]),
  `title-category Hint 1 rejected (got ${titleFruitHints && titleFruitHints[0]})`
);

// Thin pictured WITH sentence → fixSentence before mystery
const thinSentenced = {
  title: 'One Fruit Card',
  vocabulary: [
    { word: 'apple', emoji: '🍎', sentence: 'I eat an apple.' },
    { word: 'perseverance', sentence: 'Keep trying.' },
    { word: 'gratitude', sentence: 'Say thank you.' },
  ],
};
const thinFix = actRecipe(thinSentenced);
assert(thinFix && thinFix.recipeId === 'fixSentence',
  `thin + sentence → fixSentence before mystery, got ${thinFix && thinFix.recipeId}`);

const soccer = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/soccer-coach-lesson.json'), 'utf8')
);
const soccerAct = actRecipe(soccer);
// Frames ship → skip fixSentence twin; oddOneOut when pictured≥4
assert(soccerAct && soccerAct.recipeId === 'oddOneOut',
  `soccer coach fixture → oddOneOut (frames demote fixSentence), got ${soccerAct && soccerAct.recipeId}`);

// Lesson-provided mysteryHints when valid (bare pictured, no odd set, no fix)
const withHints = {
  title: 'Apple Banana Carrot',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'carrot', emoji: '🥕' },
  ],
  activity: {
    title: 'Guess',
    prompt: 'Guess',
    templates: ['I see a ____.'],
    mysteryHints: [
      'It is a fruit you can eat.',
      'It is round and often red or green.',
      'Teachers give one to good students. It starts with A.',
    ],
  },
};
const fruitAct = actRecipeWithoutCoverageAdapt(withHints);
assert(fruitAct && fruitAct.recipeId === 'mysteryHints',
  `fruit pictured bare (no odd set) → mysteryHints, got ${fruitAct && fruitAct.recipeId}`);
if (fruitAct && fruitAct.ctx && fruitAct.ctx.targetWord === 'apple') {
  assert(
    fruitAct.ctx.hints[0] === 'It is a fruit you can eat.',
    'uses lesson.activity.mysteryHints when valid'
  );
}

// No pictured VocabArt rows → not mysteryHints (sortBins).
const noArt = {
  title: 'Ideas About Ideas',
  vocabulary: ['perseverance', 'integrity', 'curiosity', 'resilience']
    .map((word) => ({ word })),
};
const noArtPlan = W.VocabArt.planFor(noArt);
assert((noArtPlan.matchable || []).length === 0, 'control: noArt lesson has 0 matchable');
const noArtAct = actRecipeWithoutCoverageAdapt(noArt);
assert(!noArtAct || noArtAct.recipeId !== 'mysteryHints',
  `no pictured art must not be mysteryHints, got ${noArtAct && noArtAct.recipeId}`);
assert(noArtAct && noArtAct.recipeId === 'sortBins',
  `no pictured art → sortBins, got ${noArtAct && noArtAct.recipeId}`);

// Shippable dental / trampoline still heroProp
const dental = {
  title: 'At the Dentist',
  vocabulary: ['tooth', 'floss', 'dentist', 'smile'].map((word) => ({ word })),
};
const dentalAct = actRecipe(dental);
assert(dentalAct && dentalAct.recipeId === 'heroProp',
  `dental → heroProp, got ${dentalAct && dentalAct.recipeId}`);

const tramp = {
  title: 'Backflip on My Trampoline',
  vocabulary: ['trampoline', 'bounce', 'backflip', 'mat'].map((word) => ({ word })),
};
const trampAct = actRecipe(tramp);
assert(trampAct && trampAct.recipeId === 'heroProp',
  `trampoline → heroProp, got ${trampAct && trampAct.recipeId}`);

// Invalid lesson hints (answer in hint 1) → templates fill in
const badHints = W.EdbActivities.resolveMysteryHints('ball', {
  vocabulary: [{ word: 'ball', sentence: 'Pass the ball.' }],
  activity: { mysteryHints: ['The ball is round.', 'You kick it.', 'It starts with B.'] },
});
assert(badHints[0] && !W.EdbActivities.hintNamesAnswer(badHints[0], 'ball'),
  'invalid lesson hints fall back so hint 1 omits answer');
assert(badHints.length === 3, 'fallback always returns 3 hints');

if (failed) {
  console.log(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log('\nOK mysteryHints plan assignment');
