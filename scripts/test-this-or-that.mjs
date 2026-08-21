/**
 * thisOrThat — ≥2 distinct pictured when fix/odd/yesNoSort not buildable; CEFR frames.
 * Precedence: fixSentence → oddOneOut → yesNoSort → thisOrThat → mysteryHints → sortBins.
 *
 *   npm run test:this-or-that
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
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
  return (plan.assignments || []).find((a) => a && a.pageKey === 'activity') || null;
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

assert(W.EdbActivities.thisOrThatFrame('A1') === 'I like ______.', 'A1 object frame');
assert(W.EdbActivities.thisOrThatFrame('A2') === 'I want the ______.', 'A2 object frame');
assert(/rather have/.test(W.EdbActivities.thisOrThatFrame('B1')), 'B1 object frame has rather have');
assert(W.EdbActivities.thisOrThatFrame('A2', ['museum', 'park']) === 'I want to go to ______.', 'A2 place frame');
assert(/rather go to/.test(W.EdbActivities.thisOrThatFrame('B1', ['zoo', 'beach'])), 'B1 place frame');
assert(W.EdbActivities.thisOrThatFrame('A1', ['dog', 'cat']) === 'I like ______.', 'A1 pets stay object frame');

// Two pictured pets, no sentences → thisOrThat (not mystery)
const twoPets = {
  title: 'Two Pets Choice',
  vocabulary: [
    { word: 'dog', emoji: '🐶' },
    { word: 'cat', emoji: '🐱' },
  ],
};
assert(!W.EdbActivities.canBuildFixSentence(twoPets), 'control: two pets no fixSentence');
assert(!W.EdbActivities.canBuildOddOneOut(twoPets), 'control: two pets no oddOneOut');
{
  const a = actRecipeWithoutCoverageAdapt(twoPets, { level: 'A1', duration: 25 });
  assert(a && a.recipeId === 'thisOrThat', 'two pictured → thisOrThat, got ' + (a && a.recipeId));
  assert(a.ctx && a.ctx.options && a.ctx.options.length === 2, 'two options');
  assert(a.ctx.frame === 'I like ______.', 'A1 plan uses A1 frame, got ' + (a.ctx && a.ctx.frame));
  const opts = (a.ctx.options || []).map((w) => String(w).toLowerCase()).sort();
  assert(opts.join('|') === 'cat|dog', 'prefer dog+cat over theme-bank pets, got ' + opts.join('|'));
}
{
  const a = actRecipeWithoutCoverageAdapt(twoPets, { level: 'B1', duration: 40 });
  assert(a && a.recipeId === 'thisOrThat', 'B1 still thisOrThat');
  assert(/rather/.test(a.ctx.frame), 'B1 plan uses reason frame');
}

// Lesson payload wins when valid
const lessonChoice = {
  title: 'Ball or Whistle',
  vocabulary: [
    { word: 'ball', emoji: '⚽' },
    { word: 'whistle', emoji: '😗' },
  ],
  activity: {
    thisOrThat: { options: ['ball', 'whistle'], frame: 'I pick the ______.' },
  },
};
{
  const a = actRecipe(lessonChoice, { level: 'A2', duration: 30 });
  assert(a && a.recipeId === 'thisOrThat', 'lesson thisOrThat ships');
  assert(a.ctx.source === 'lesson', 'source=lesson, got ' + (a.ctx && a.ctx.source));
  assert(a.ctx.frame === 'I pick the ______.', 'lesson frame kept');
}

// ≥4 pictured mixed still prefers oddOneOut over thisOrThat
const mixed = {
  title: 'Fruit Market Bus Trip',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'carrot', emoji: '🥕' },
    { word: 'bus', emoji: '🚌' },
  ],
};
{
  const a = actRecipe(mixed, { level: 'A2', duration: 30 });
  assert(a && a.recipeId === 'oddOneOut', '4 pictured mixed → oddOneOut not thisOrThat, got ' + (a && a.recipeId));
}

// Single pictured → mysteryHints (not thisOrThat)
const oneFruit = {
  title: 'One Fruit Card',
  vocabulary: [{ word: 'apple', emoji: '🍎' }],
};
{
  const a = actRecipe(oneFruit, { level: 'A2', duration: 25 });
  assert(a && a.recipeId === 'mysteryHints', '1 pictured → mysteryHints, got ' + (a && a.recipeId));
}

if (failed) {
  console.log('\nFAILED ' + failed);
  process.exit(1);
}
console.log('\nOK thisOrThat plan assignment');
