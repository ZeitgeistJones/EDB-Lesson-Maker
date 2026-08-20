/**
 * oddOneOut plan assignment — ≥4 pictured + credible 3+1 → oddOneOut when
 * fixSentence is not buildable; shippable kings still heroProp; <4 pictured /
 * no outlier → mystery or sort.
 *
 * Precedence (non-king): fixSentence → oddOneOut → lesson mysteryHints →
 * yesNoSort → thisOrThat → mysteryHints (derived) → sortBins.
 *
 *   npm run test:odd-one-out
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

// Bare mixed theme (no sentences): 3 food + 1 transport → derived oddOneOut
const mixed = {
  title: 'Fruit Market Bus Trip',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'carrot', emoji: '🥕' },
    { word: 'bus', emoji: '🚌' },
  ],
};
const mixedArt = W.VocabArt.planFor(mixed);
assert((mixedArt.matchable || []).length >= 4, 'control: mixed has ≥4 pictured');
assert(!W.EdbActivities.canBuildFixSentence(mixed),
  'control: bare mixed cannot build fixSentence');
const mixedAct = actRecipe(mixed);
assert(mixedAct && mixedAct.recipeId === 'oddOneOut',
  `mixed pictured → oddOneOut, got ${mixedAct && mixedAct.recipeId}`);
assert(mixedAct && mixedAct.ctx && Array.isArray(mixedAct.ctx.options) && mixedAct.ctx.options.length === 4,
  'odd ctx has 4 options');
assert(mixedAct && mixedAct.ctx && mixedAct.ctx.odd
  && mixedAct.ctx.options.some((o) => String(o).toLowerCase() === String(mixedAct.ctx.odd).toLowerCase()),
  'odd ∈ options');
assert(mixedAct && mixedAct.ctx && String(mixedAct.ctx.odd).toLowerCase() === 'bus',
  `derived odd is bus, got ${mixedAct && mixedAct.ctx && mixedAct.ctx.odd}`);

// With sentences (no frames), fixSentence wins over oddOneOut (precedence)
const mixedSentenced = {
  title: 'Fruit Market Bus Trip',
  vocabulary: [
    { word: 'apple', emoji: '🍎', sentence: 'I eat an apple.' },
    { word: 'banana', emoji: '🍌', sentence: 'A yellow banana.' },
    { word: 'carrot', emoji: '🥕', sentence: 'A crunchy carrot.' },
    { word: 'bus', emoji: '🚌', sentence: 'We ride the bus.' },
  ],
};
const mixedFix = actRecipe(mixedSentenced);
assert(W.EdbActivities.canBuildOddOneOut(mixedSentenced, W.VocabArt.planFor(mixedSentenced)),
  'control: sentenced mixed could build oddOneOut');
assert(mixedFix && mixedFix.recipeId === 'fixSentence',
  `sentenced mixed → fixSentence before oddOneOut, got ${mixedFix && mixedFix.recipeId}`);

// Frames already ship → skip fixSentence twin; oddOneOut wins
const mixedFramed = {
  ...mixedSentenced,
  sentenceFrames: ['I like the ____.', 'I see a ____.'],
};
const mixedFramedAct = actRecipe(mixedFramed);
assert(!W.EdbActivities.canBuildFixSentence(mixedFramed),
  'control: frames demote fixSentence');
assert(mixedFramedAct && mixedFramedAct.recipeId === 'oddOneOut',
  `framed mixed → oddOneOut not fixSentence, got ${mixedFramedAct && mixedFramedAct.recipeId}`);

// Lesson-provided oddOneOut preferred when valid + pictured + no fixSentence
const withOoo = {
  title: 'Pets and Things',
  vocabulary: [
    { word: 'dog', emoji: '🐶' },
    { word: 'cat', emoji: '🐱' },
    { word: 'bird', emoji: '🐦' },
    { word: 'hat', emoji: '🎩' },
  ],
  activity: {
    title: 'Odd one',
    prompt: 'Find the odd one.',
    templates: ['This is a ____.'],
    oddOneOut: {
      options: ['dog', 'cat', 'bird', 'hat'],
      odd: 'hat',
      whyHint: 'Hat is clothes; the others are animals.',
    },
  },
};
assert(!W.EdbActivities.canBuildFixSentence(withOoo),
  'control: bare pets cannot build fixSentence');
const oooAct = actRecipe(withOoo);
assert(oooAct && oooAct.recipeId === 'oddOneOut',
  `lesson oddOneOut → oddOneOut, got ${oooAct && oooAct.recipeId}`);
assert(oooAct && oooAct.ctx && oooAct.ctx.source === 'lesson',
  `uses lesson payload, source=${oooAct && oooAct.ctx && oooAct.ctx.source}`);
assert(oooAct && oooAct.ctx && String(oooAct.ctx.odd).toLowerCase() === 'hat',
  `lesson odd=hat, got ${oooAct && oooAct.ctx && oooAct.ctx.odd}`);
assert(oooAct && oooAct.ctx && oooAct.ctx.ruleHint && /clothes/i.test(oooAct.ctx.ruleHint),
  'answer-shaped whyHint routes to ruleHint (page cue)');
assert(
  W.EdbActivities.oddWhyWriteLine(oooAct.ctx) === W.EdbActivities.ODD_WHY_SCAFFOLD,
  'teacher answer whyHint does not paint on student write line'
);
assert(
  W.EdbActivities.oddWhyWriteLine({ whyHint: '___ is different because ______.' })
    === '___ is different because ______.',
  'scaffold whyHint with blanks may appear on the write line'
);
assert(
  W.EdbActivities.oddWhyWriteLine({ odd: 'bus' }) === W.EdbActivities.ODD_WHY_SCAFFOLD
  && /doesn't fit because/i.test(W.EdbActivities.ODD_WHY_SCAFFOLD),
  'Why write line falls back to CEFR scaffold without whyHint'
);

// Same-theme foursome (no outlier) → not oddOneOut (mysteryHints when bare)
const allFruit = {
  title: 'Fruit Market',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'carrot', emoji: '🥕' },
    { word: 'grape', emoji: '🍇' },
  ],
};
const fruitAct = actRecipe(allFruit);
assert(!fruitAct || fruitAct.recipeId !== 'oddOneOut',
  `all-food foursome must not force oddOneOut, got ${fruitAct && fruitAct.recipeId}`);
assert(fruitAct && fruitAct.recipeId === 'thisOrThat',
  `all-food bare → thisOrThat, got ${fruitAct && fruitAct.recipeId}`);

// Soccer fixture has frames → oddOneOut (fixSentence demoted as Frames twin)
const soccer = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/soccer-coach-lesson.json'), 'utf8')
);
const soccerAct = actRecipe(soccer);
assert(soccerAct && soccerAct.recipeId === 'oddOneOut',
  `soccer coach → oddOneOut (frames demote fixSentence), got ${soccerAct && soccerAct.recipeId}`);
assert(W.EdbActivities.canBuildOddOneOut(soccer, W.VocabArt.planFor(soccer)),
  'control: soccer oddOneOut still buildable');
assert(!W.EdbActivities.canBuildFixSentence(soccer),
  'control: soccer frames demote canBuildFixSentence');

// Basketball title adapt expands pictured set ≥4 → oddOneOut (no sentences)
const sports = {
  title: 'Playing Basketball with Friends',
  vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
};
const sportsPlan = W.EdbActivities.plan(sports, { level: 'A2', duration: 30 });
assert((sportsPlan.vocabArt.matchable || []).length >= 4,
  `control: basketball plan matchable ≥4 (got ${(sportsPlan.vocabArt.matchable || []).length})`);
const sportsAct = (sportsPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert(sportsAct && sportsAct.recipeId === 'oddOneOut',
  `basketball ≥4 pictured bare → oddOneOut, got ${sportsAct && sportsAct.recipeId}`);
// Visual twin ban: never ship ball + basketball together (both look like basketballs)
const sportsOpts = (sportsAct && sportsAct.ctx && sportsAct.ctx.options) || [];
const sportsLower = sportsOpts.map((w) => String(w).toLowerCase());
assert(!(sportsLower.includes('ball') && sportsLower.includes('basketball')),
  `oddOneOut must not twin ball+basketball, got ${sportsOpts.join(',')}`);
assert(new Set(sportsOpts.map((w) => String(w).toLowerCase())).size === 4,
  'oddOneOut still ships 4 distinct option words');
// Match dock: ball + basketball must not both be matchable (same ball look).
const sportsMatch = (sportsPlan.vocabArt.matchable || []).map((r) => String(r.word || '').toLowerCase());
assert(!(sportsMatch.includes('ball') && sportsMatch.includes('basketball')),
  `matchDock must not twin ball+basketball pads (got ${sportsMatch.join(',')})`);
const sportsBoard = ((sportsPlan.vocabArt.rows || []).map((r) => String(r.word || '').toLowerCase()));
assert(!(sportsBoard.includes('ball') && sportsBoard.includes('basketball')),
  `board slice must not keep ball+basketball orphans (got ${sportsBoard.join(',')})`);
assert(!sportsBoard.some((w) => /aerobic|elliptical|treadmill|snowboard|s60/i.test(w)),
  `sports board must not theme-bank gym/sheet junk (got ${sportsBoard.join(',')})`);
const hoopTwin = W.VocabArt.visualTwinKey({
  word: 'hoop', propKey: 'sport-basketball-hoop', artSrc: 'assets/09_props/img/sport-basketball-hoop.png',
});
const ballTwin = W.VocabArt.visualTwinKey({
  word: 'ball', propKey: 'sport-basketball', artSrc: 'assets/09_props/img/sport-basketball.png',
});
assert(hoopTwin !== 'ball-family' && ballTwin === 'ball-family',
  `hoop twin key must not be ball-family (hoop=${hoopTwin} ball=${ballTwin})`);
if (sportsAct && sportsAct.ctx && sportsAct.ctx.themeCue === 'concrete-vs-abstract') {
  assert(sportsAct.ctx.ruleHint && /points|number|idea/i.test(sportsAct.ctx.ruleHint),
    'concrete-vs-abstract ships category ruleHint for the page');
}

// Lesson payload with visual twins falls through to derive (or other recipe)
const twinLesson = {
  title: 'Playing Basketball with Friends',
  vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
  activity: {
    title: 'Odd',
    prompt: 'Odd',
    templates: ['____'],
    oddOneOut: {
      options: ['ball', 'basketball', 'team', 'score'],
      odd: 'score',
    },
  },
};
const twinAct = actRecipe(twinLesson);
assert(twinAct && twinAct.recipeId === 'oddOneOut',
  `twin lesson payload still plans oddOneOut via derive, got ${twinAct && twinAct.recipeId}`);
assert(twinAct && twinAct.ctx && twinAct.ctx.source === 'derived',
  `twin lesson → derived (not lesson), got ${twinAct && twinAct.ctx && twinAct.ctx.source}`);
const twinOpts = ((twinAct && twinAct.ctx && twinAct.ctx.options) || []).map((w) => String(w).toLowerCase());
assert(!(twinOpts.includes('ball') && twinOpts.includes('basketball')),
  `derived after twin reject still unique visuals, got ${twinOpts.join(',')}`);

// Thin pictured (1 pictured + abstracts) bare → mysteryHints, not oddOneOut
const thinPic = {
  title: 'One Fruit Card',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'perseverance' },
    { word: 'gratitude' },
  ],
};
const thinAct = actRecipe(thinPic);
assert(thinAct && thinAct.recipeId === 'mysteryHints',
  `1 pictured bare → mysteryHints, got ${thinAct && thinAct.recipeId}`);

// Shippable king still wins over oddOneOut
const dental = {
  title: 'At the Dentist',
  vocabulary: ['tooth', 'floss', 'dentist', 'smile'].map((word) => ({ word })),
};
const dentalAct = actRecipe(dental);
assert(dentalAct && dentalAct.recipeId === 'heroProp',
  `dental → heroProp (not oddOneOut), got ${dentalAct && dentalAct.recipeId}`);

// Invalid lesson odd (not in options) → derive or fall through
const badOoo = {
  title: 'Fruit Market Bus Trip',
  vocabulary: mixed.vocabulary,
  activity: {
    title: 'Odd',
    prompt: 'Odd',
    templates: ['____'],
    oddOneOut: { options: ['apple', 'banana', 'carrot', 'bus'], odd: 'plane' },
  },
};
const badAct = actRecipe(badOoo);
assert(badAct && badAct.recipeId === 'oddOneOut',
  `invalid lesson odd falls to derive, got ${badAct && badAct.recipeId}`);
assert(badAct && badAct.ctx && badAct.ctx.source === 'derived',
  `invalid lesson → derived, got ${badAct && badAct.ctx && badAct.ctx.source}`);

// Deterministic: same title → same odd set
const a = W.EdbActivities.resolveOddOneOut(mixed, mixedArt);
const b = W.EdbActivities.resolveOddOneOut(mixed, mixedArt);
assert(a && b && a.odd === b.odd && a.options.join('|') === b.options.join('|'),
  'resolveOddOneOut is deterministic for same title');

// Hollow practice pages: bare word lists must not ship Frames / In Sentences
const bare = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/basketball-bare-lesson.json'), 'utf8')
);
assert(!W.EdbActivities.hasVocabSentencesContent(bare), 'bare fixture has no vocab sentences');
assert(!W.EdbActivities.hasFramesContent(bare), 'bare fixture has no frame blanks');
const barePlan = W.EdbActivities.buildBoardPlan(bare, { level: 'A1', duration: '30' });
const bareKeys = Object.keys(barePlan.indexByKey || {});
assert(!bareKeys.includes('vocabSentences'), 'bare bake omits vocabSentences page');
assert(!bareKeys.includes('frames'), 'bare bake omits frames page');
assert(bareKeys.includes('newWords') && bareKeys.includes('activity'), 'bare bake still has core spine');

const soccerFull = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/soccer-coach-lesson.json'), 'utf8')
);
assert(W.EdbActivities.hasVocabSentencesContent(soccerFull), 'soccer has vocab sentences');
assert(W.EdbActivities.hasFramesContent(soccerFull), 'soccer has frame blanks');
const soccerPlan = W.EdbActivities.buildBoardPlan(soccerFull, { level: 'A1', duration: '30' });
assert(soccerPlan.indexByKey.vocabSentences != null, 'soccer still ships vocabSentences');
assert(soccerPlan.indexByKey.frames != null, 'soccer still ships frames');

if (failed) {
  console.log(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log('\nOK oddOneOut plan assignment');
