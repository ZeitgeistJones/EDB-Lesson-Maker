/**
 * Smoke: bare "a ____" with apple/banana bank must rewrite to a/an (Manus UX bP5y).
 *   node scripts/smoke-article-frames.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  window: {},
  console,
  document: {
    createElement: () => ({
      style: {},
      dataset: {},
      appendChild() {},
      setAttribute() {},
    }),
  },
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'public/lib/renderLessonPages.js'), 'utf8'),
  sandbox,
  { filename: 'renderLessonPages.js' }
);

const LP = sandbox.window.LessonPages;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const mixed = LP.normalizeLesson({
  vocabulary: [{ word: 'apple' }, { word: 'banana' }, { word: 'carrot' }],
  sentenceFrames: ['I see a ____.', 'An ____ is red.'],
  activity: { templates: ['I see a ____.'] },
});
assert(
  mixed.sentenceFrames[0] === 'I see a/an ____.',
  'mixed bank rewrites bare a → a/an, got: ' + mixed.sentenceFrames[0]
);
assert(
  mixed.sentenceFrames[1] === 'a/an ____ is red.' || mixed.sentenceFrames[1] === 'A/an ____ is red.',
  'mixed bank rewrites bare An → a/an, got: ' + mixed.sentenceFrames[1]
);
assert(
  mixed.activity.templates[0] === 'I see a/an ____.',
  'activity templates rewritten, got: ' + mixed.activity.templates[0]
);

const vowelOnly = LP.normalizeLesson({
  vocabulary: [{ word: 'apple' }, { word: 'orange' }],
  sentenceFrames: ['I see a ____.'],
});
assert(
  vowelOnly.sentenceFrames[0] === 'I see an ____.',
  'all-vowel bank → an, got: ' + vowelOnly.sentenceFrames[0]
);

const consOnly = LP.normalizeLesson({
  vocabulary: [{ word: 'banana' }, { word: 'carrot' }],
  sentenceFrames: ['I see an ____.'],
});
assert(
  consOnly.sentenceFrames[0] === 'I see a ____.',
  'all-consonant bank → a, got: ' + consOnly.sentenceFrames[0]
);

const fruit = LP.normalizeLesson(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/fruit-market-lesson.json'), 'utf8'))
);
assert(
  !(fruit.sentenceFrames || []).some((f) => /\ba\s+_{2,}/i.test(f) && !/a\/an/i.test(f)),
  'fruit fixture frames stay article-safe'
);
assert(
  !(fruit.activity.templates || []).some((f) => /\ba\s+_{2,}/i.test(f) && !/a\/an/i.test(f)),
  'fruit fixture templates stay article-safe'
);

console.log('ok: article frame smoke');
