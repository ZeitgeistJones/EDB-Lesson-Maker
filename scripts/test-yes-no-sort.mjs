/**
 * yesNoSort — ≥4 pictured + clean YES/NO rule (3+1 or 2+2) when fix/odd
 * are not buildable; never all-YES / color questions; CEFR why A2+.
 *
 * Precedence (non-king): fixSentence → oddOneOut → lesson mysteryHints →
 * yesNoSort → thisOrThat → derived mysteryHints → sortBins.
 *
 *   npm run test:yes-no-sort
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
  return (plan.assignments || []).find((a) => a && a.pageKey === 'activity') || null;
}

assert(W.EdbActivities.yesNoWhyWriteLine('A1') == null, 'A1 has no Why line');
assert(
  W.EdbActivities.yesNoWhyWriteLine('A2') === W.EdbActivities.YES_NO_WHY_SCAFFOLD,
  'A2 Why scaffold'
);
assert(/YES\/NO because/.test(W.EdbActivities.YES_NO_WHY_SCAFFOLD), 'scaffold mentions YES/NO');

// 2 food + 2 clothes: no oddOneOut (no cue ≥3) → yesNoSort "Can you eat it?"
const foodClothes = {
  title: 'Snack and Coat Day',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'hat', emoji: '🎩' },
    { word: 'coat', emoji: '🧥' },
  ],
};
assert(!W.EdbActivities.canBuildFixSentence(foodClothes), 'control: bare food+clothes no fix');
assert(!W.EdbActivities.canBuildOddOneOut(foodClothes, W.VocabArt.planFor(foodClothes)),
  'control: 2+2 themes cannot build oddOneOut');
{
  const a = actRecipe(foodClothes, { level: 'A2', duration: 30 });
  assert(a && a.recipeId === 'yesNoSort',
    `2 food + 2 clothes → yesNoSort, got ${a && a.recipeId}`);
  assert(a.ctx && a.ctx.source === 'derived', 'derived source');
  assert(a.ctx && /eat/i.test(a.ctx.question),
    `prefer eat rule, got ${a.ctx && a.ctx.question}`);
  assert(a.ctx && Array.isArray(a.ctx.options) && a.ctx.options.length === 4, '4 options');
  assert(a.ctx && a.ctx.yes && a.ctx.yes.length === 2 && a.ctx.no && a.ctx.no.length === 2,
    `2+2 split yes=${(a.ctx.yes || []).join(',')} no=${(a.ctx.no || []).join(',')}`);
  assert(a.ctx && a.ctx.ruleHint && /eat/i.test(a.ctx.ruleHint), 'ruleHint on page');
  assert(a.ctx && a.ctx.whyLine && /because/.test(a.ctx.whyLine), 'A2 ships Why line');
}
{
  const a = actRecipe(foodClothes, { level: 'A1', duration: 25 });
  assert(a && a.recipeId === 'yesNoSort', 'A1 still yesNoSort');
  assert(a.ctx && !a.ctx.whyLine, 'A1 no Why line');
}

// All-food foursome: eat = all YES → reject; fall to thisOrThat
const allFruit = {
  title: 'Fruit Market',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'carrot', emoji: '🥕' },
    { word: 'grape', emoji: '🍇' },
  ],
};
assert(!W.EdbActivities.canBuildYesNoSort(allFruit, W.VocabArt.planFor(allFruit)),
  'all-food cannot build yesNoSort (no NO)');
{
  const a = actRecipe(allFruit, { level: 'A2', duration: 30 });
  assert(a && a.recipeId === 'thisOrThat',
    `all-food → thisOrThat (not yesNoSort), got ${a && a.recipeId}`);
}

// 3+1 food+transport still prefers oddOneOut over yesNoSort
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
  assert(a && a.recipeId === 'oddOneOut',
    `3+1 mixed → oddOneOut before yesNoSort, got ${a && a.recipeId}`);
}

// 2 animals + 2 clothes → animal rule (after eat/wear fail or wear also works —
// wear: clothes YES=2, animals NO=2; eat fails. Prefer eat first — fails —
// then wear wins with 2+2 before animal.)
const petsClothes = {
  title: 'Pets and Hats',
  vocabulary: [
    { word: 'dog', emoji: '🐶' },
    { word: 'cat', emoji: '🐱' },
    { word: 'hat', emoji: '🎩' },
    { word: 'shoe', emoji: '👟' },
  ],
};
{
  const a = actRecipe(petsClothes, { level: 'A2', duration: 30 });
  assert(a && a.recipeId === 'yesNoSort',
    `2 animals + 2 clothes → yesNoSort, got ${a && a.recipeId}`);
  assert(a.ctx && /wear/i.test(a.ctx.question),
    `wear preferred over animal when both 2+2, got ${a.ctx && a.ctx.question}`);
}

// Lesson payload wins when valid
const lessonYn = {
  title: 'Ball or Banana Sort',
  vocabulary: [
    { word: 'apple', emoji: '🍎' },
    { word: 'banana', emoji: '🍌' },
    { word: 'ball', emoji: '⚽' },
    { word: 'whistle', emoji: '😗' },
  ],
  activity: {
    yesNoSort: {
      question: 'Can you eat it?',
      options: ['apple', 'banana', 'ball', 'whistle'],
      yes: ['apple', 'banana'],
    },
  },
};
{
  // oddOneOut may also build (2 food + sport) — strip by ensuring no 3-share cue:
  // actually apple+banana = food 2, ball+whistle = sport 2 → no oddOneOut.
  assert(!W.EdbActivities.canBuildOddOneOut(lessonYn, W.VocabArt.planFor(lessonYn)),
    'control: lessonYn no oddOneOut');
  const a = actRecipe(lessonYn, { level: 'A2', duration: 30 });
  assert(a && a.recipeId === 'yesNoSort', 'lesson yesNoSort ships');
  assert(a.ctx && a.ctx.source === 'lesson', `source=lesson, got ${a.ctx && a.ctx.source}`);
  assert(a.ctx && a.ctx.question === 'Can you eat it?', 'lesson question kept');
}

// Color question in lesson payload rejected → derive or fall through
const colorBad = {
  title: 'Snack and Coat Day',
  vocabulary: foodClothes.vocabulary,
  activity: {
    yesNoSort: {
      question: 'Is it yellow?',
      options: ['apple', 'banana', 'hat', 'coat'],
      yes: ['banana'],
    },
  },
};
{
  const resolved = W.EdbActivities.resolveYesNoSort(colorBad, W.VocabArt.planFor(colorBad), { level: 'A2' });
  assert(resolved && resolved.source === 'derived',
    `color lesson rejected → derived, got ${resolved && resolved.source}`);
  assert(resolved && !/yellow|color|colour/i.test(resolved.question),
    `no color question, got ${resolved && resolved.question}`);
}

// Deterministic
{
  const art = W.VocabArt.planFor(foodClothes);
  const a = W.EdbActivities.resolveYesNoSort(foodClothes, art, { level: 'A2' });
  const b = W.EdbActivities.resolveYesNoSort(foodClothes, art, { level: 'A2' });
  assert(a && b && a.options.join('|') === b.options.join('|') && a.question === b.question,
    'resolveYesNoSort deterministic for same title');
}

// Two pictured only → thisOrThat (yesNoSort needs ≥4)
const twoPets = {
  title: 'Two Pets Choice',
  vocabulary: [
    { word: 'dog', emoji: '🐶' },
    { word: 'cat', emoji: '🐱' },
  ],
};
{
  const a = actRecipe(twoPets, { level: 'A1', duration: 25 });
  assert(a && a.recipeId === 'thisOrThat',
    `2 pictured → thisOrThat not yesNoSort, got ${a && a.recipeId}`);
}

if (failed) {
  console.log(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log('\nOK yesNoSort plan assignment');
