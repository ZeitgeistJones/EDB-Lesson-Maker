/**
 * fixSentence plan assignment — lesson payload / derived single-error sentence
 * beats oddOneOut & mysteryHints; shippable kings still heroProp; bare word
 * lists without sentences fall through.
 *
 *   npm run test:fix-sentence
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

// Lesson-provided fixSentence preferred when valid
const withFix = {
  title: 'School Morning',
  vocabulary: [
    { word: 'school', sentence: 'I go to school.' },
    { word: 'teacher', sentence: 'The teacher smiles.' },
    { word: 'bag', sentence: 'My bag is blue.' },
  ],
  activity: {
    title: 'Fix it',
    prompt: 'Fix the sentence.',
    templates: ['I go to ____.'],
    fixSentence: {
      sentence: 'She go to school.',
      wrong: 'go',
      correct: 'goes',
      distractors: ['went', 'going'],
    },
  },
};
const fixAct = actRecipe(withFix);
assert(fixAct && fixAct.recipeId === 'fixSentence',
  `lesson fixSentence → fixSentence, got ${fixAct && fixAct.recipeId}`);
assert(fixAct && fixAct.ctx && fixAct.ctx.source === 'lesson',
  `uses lesson payload, source=${fixAct && fixAct.ctx && fixAct.ctx.source}`);
assert(fixAct && fixAct.ctx && fixAct.ctx.wrong === 'go' && fixAct.ctx.correct === 'goes',
  'passes wrong/correct through');
assert(fixAct && fixAct.ctx && Array.isArray(fixAct.ctx.distractors) && fixAct.ctx.distractors.length >= 1,
  'has ≥1 distractor');

// Invalid lesson payload (wrong missing from sentence) → derive or fall through
const badFix = {
  title: 'School Morning',
  vocabulary: withFix.vocabulary,
  activity: {
    title: 'Fix',
    prompt: 'Fix',
    templates: ['____'],
    fixSentence: { sentence: 'She goes to school.', wrong: 'go', correct: 'goes' },
  },
};
const badResolved = W.EdbActivities.normalizeFixSentence(badFix.activity.fixSentence, badFix);
assert(!badResolved, 'invalid lesson fixSentence (wrong not in sentence) rejected');
const badAct = actRecipe(badFix);
assert(badAct && badAct.recipeId === 'fixSentence',
  `invalid payload falls to derive, got ${badAct && badAct.recipeId}`);
assert(badAct && badAct.ctx && badAct.ctx.source === 'derived',
  `derived source, got ${badAct && badAct.ctx && badAct.ctx.source}`);

// Soccer fixture has frames + sentences → skip fixSentence (Frames twin);
// oddOneOut wins when pictured≥4.
const soccer = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/soccer-coach-lesson.json'), 'utf8')
);
assert(W.EdbActivities.hasFramesContent(soccer), 'control: soccer ships frames');
assert(!W.EdbActivities.canBuildFixSentence(soccer),
  'control: frames demote fixSentence honesty');
const soccerAct = actRecipe(soccer);
assert(soccerAct && soccerAct.recipeId === 'oddOneOut',
  `soccer with frames → oddOneOut (not fixSentence twin), got ${soccerAct && soccerAct.recipeId}`);
assert(W.EdbActivities.canBuildOddOneOut(soccer, W.VocabArt.planFor(soccer)),
  'control: soccer builds oddOneOut');

// Sentences WITHOUT frames → fixSentence still preferred
const noFramesFix = {
  title: 'School Morning Grammar',
  vocabulary: withFix.vocabulary,
  sentenceFrames: [],
};
const noFramesAct = actRecipeWithoutCoverageAdapt(noFramesFix);
assert(W.EdbActivities.canBuildFixSentence(noFramesFix),
  'control: no frames → canBuildFixSentence');
assert(noFramesAct && noFramesAct.recipeId === 'fixSentence',
  `sentences without frames → fixSentence, got ${noFramesAct && noFramesAct.recipeId}`);

// Bare sports words (no sentences) → not fixSentence; oddOneOut when pictured≥4
const sports = {
  title: 'Playing Basketball with Friends',
  vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
};
const sportsAct = actRecipe(sports);
assert(!W.EdbActivities.canBuildFixSentence(sports),
  'control: bare basketball list cannot build fixSentence');
assert(sportsAct && sportsAct.recipeId === 'oddOneOut',
  `bare basketball → oddOneOut (no fixSentence), got ${sportsAct && sportsAct.recipeId}`);

// Thin pictured WITH vocab sentence → fixSentence before mysteryHints
const thinWithSentence = {
  title: 'One Fruit Card',
  vocabulary: [
    { word: 'apple', emoji: '🍎', sentence: 'I eat an apple.' },
    { word: 'perseverance', sentence: 'Keep trying.' },
    { word: 'gratitude', sentence: 'Say thank you.' },
  ],
};
const thinFix = actRecipe(thinWithSentence);
assert(thinFix && thinFix.recipeId === 'fixSentence',
  `thin pictured + sentence → fixSentence (before mystery), got ${thinFix && thinFix.recipeId}`);

// Thin pictured WITHOUT sentences → mysteryHints
const thinBare = {
  title: 'One Fruit Card Bare',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'perseverance' },
    { word: 'integrity' },
  ],
};
const thinBareAct = actRecipeWithoutCoverageAdapt(thinBare);
assert(!W.EdbActivities.canBuildFixSentence(thinBare),
  'control: bare thin list cannot build fixSentence');
assert(thinBareAct && thinBareAct.recipeId === 'mysteryHints',
  `thin bare pictured → mysteryHints, got ${thinBareAct && thinBareAct.recipeId}`);

// Shippable king still wins over fixSentence
const dental = {
  title: 'At the Dentist',
  vocabulary: [
    { word: 'tooth', sentence: 'I brush my tooth.' },
    { word: 'floss', sentence: 'I use floss.' },
    { word: 'dentist', sentence: 'The dentist smiles.' },
    { word: 'smile', sentence: 'I smile big.' },
  ],
};
const dentalAct = actRecipe(dental);
assert(dentalAct && dentalAct.recipeId === 'heroProp',
  `dental → heroProp (not fixSentence), got ${dentalAct && dentalAct.recipeId}`);

// No pictured + no usable sentences → sortBins
const noArt = {
  title: 'Ideas About Ideas',
  vocabulary: ['perseverance', 'integrity', 'curiosity', 'resilience']
    .map((word) => ({ word })),
};
const noArtAct = actRecipeWithoutCoverageAdapt(noArt);
assert(!W.EdbActivities.canBuildFixSentence(noArt),
  'control: abstract bare list cannot build fixSentence');
assert(noArtAct && noArtAct.recipeId === 'sortBins',
  `no art / no fix → sortBins, got ${noArtAct && noArtAct.recipeId}`);

// Deterministic derive
const a = W.EdbActivities.resolveFixSentence(soccer);
const b = W.EdbActivities.resolveFixSentence(soccer);
assert(a && b && a.wrong === b.wrong && a.correct === b.correct && a.sentence === b.sentence,
  'resolveFixSentence is deterministic for same title');

// Tile shortness gate
assert(W.EdbActivities.isShortFixTile('goes'), 'goes is short');
assert(!W.EdbActivities.isShortFixTile('supercalifragilistic'), 'long tile rejected');

if (failed) {
  console.log(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log('\nOK fixSentence plan assignment');
