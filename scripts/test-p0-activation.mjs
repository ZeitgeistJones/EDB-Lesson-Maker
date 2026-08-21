/**
 * P0 activation bridge regressions:
 * - Pre-A1 uses receptive/TPR board path, not frames/comprehension.
 * - StoryScene bridge emits honest bound scenes and rewrites unsupported actions.
 * - HeroProp bridge intentionally picks useful food/face stages, not random off-topic kings.
 * - StoryArt remains opt-in only in the normal teacher flow.
 */
import assert from 'node:assert/strict';
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
  else if (u.includes('08_backgrounds/manifest')) rel = path.join(PUBLIC, 'assets/08_backgrounds/manifest.json');
  if (!rel || !fs.existsSync(rel)) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  const body = fs.readFileSync(rel);
  return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(body.toString('utf8')) });
}

function fakeCanvas() {
  const ctx = new Proxy(
    {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      globalAlpha: 1,
      createRadialGradient: () => ({ addColorStop() {} }),
      createLinearGradient: () => ({ addColorStop() {} }),
      measureText: (text) => ({ width: String(text || '').length * 12 }),
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => target;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  );
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,AA==',
  };
}

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  document: { createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}) },
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const rel of [
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js',
  'public/lib/storyScene.js',
  'public/lib/nounArticles.js',
  'public/lib/producerBridge.js',
  'public/lib/edbLayout.js',
  'public/lib/edbActivities.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

function lesson(title, vocabulary) {
  return {
    title,
    warmUp: { question: 'Look and listen.', sampleAnswer: '' },
    vocabulary: vocabulary.map((word) => ({ word, sentence: `I see ${word}.` })),
    sentenceFrames: ['I see ___.', 'The ___ is here.'],
    story: {
      title: title + ' Story',
      pages: [
        {
          heading: 'Story',
          text: 'A girl kicks a ball by a fence on sunny grass.',
          visualTheme: 'zoo',
          visualCaption: 'girl kicking ball by fence on sunny grass',
        },
      ],
      comprehensionQuestions: [{ question: 'What does she kick?', sampleAnswer: 'A ball.' }],
      creativeQuestions: ['What happens next?'],
    },
    speakingQuestions: [{ question: 'What can you see?', sampleAnswer: 'I see it.' }],
    activity: { title: 'Sentence Practice', prompt: 'Use the frame.', templates: ['I see ___.'] },
    reviewSentences: ['I see it.'],
  };
}

const pre = lesson('Zoo Animals', ['lion', 'monkey', 'elephant', 'zoo']);
const prePlan = W.EdbActivities.plan(pre, { level: 'Pre-A1', duration: 30, phonics: 'auto' });
const preRecipes = (prePlan.assignments || []).map((a) => a.recipeId);
assert(preRecipes.includes('preA1TprChoice'), 'Pre-A1 activity must use TPR/choice path');
assert(!preRecipes.includes('frameTiles'), 'Pre-A1 must not plan sentence-frame tiles');
assert(!preRecipes.includes('fixSentence'), 'Pre-A1 must not plan literacy-heavy fixSentence');
const preBoard = W.EdbActivities.buildBoardPlan(pre, { level: 'Pre-A1', duration: 30, phonics: 'auto' });
const prePageKeys = (preBoard.pages || []).map((p) => p.pageKey);
assert(!prePageKeys.includes('frames'), 'Pre-A1 board must omit Frames page');
assert(!prePageKeys.includes('comprehension'), 'Pre-A1 board must omit Reading Comprehension page');
assert(prePageKeys.includes('activity'), 'Pre-A1 board must keep a live activity page');
assert((pre._preA1Actions || []).length > 0, 'Pre-A1 live action props must be reachable');

const zoo = lesson('A Day at the Zoo', ['lion', 'monkey', 'zoo', 'ticket']);
W.ProducerBridge.normalize(zoo, { level: 'A1', duration: 30 });
const storyPage = zoo.story.pages[0];
assert(storyPage.storyScene, 'StoryScene bridge must emit a storyScene for a bound zoo beat');
assert.equal(storyPage.storyScene.templateId, 'locationActivity');
assert(!/\bgirl|fence|sunny grass|kick|kicks\b/i.test(storyPage.text), 'story text must not keep unbound/unsupported claims');
assert(!/\bgirl|fence|sunny grass|kick|kicks\b/i.test(storyPage.visualCaption), 'caption must not keep unbound/unsupported claims');
const composed = W.StoryScene.compose(storyPage.storyScene, { propGet: (key) => W.PropBank.get(key) });
assert(composed.layers.length >= 2, 'bound StoryScene must compose real layers');

const bounce = lesson('Playground Actions', ['ball', 'zoo']);
bounce.story.pages[0].text = 'Mia bounces a ball.';
bounce.story.pages[0].visualCaption = 'Mia bounces a ball';
W.ProducerBridge.normalize(bounce, { level: 'A1', duration: 30 });
assert(!/\bbounce|bounces\b/i.test(bounce.story.pages[0].text), 'unsupported action fallback must rewrite story text');
assert(!/\bbounce|bounces\b/i.test(bounce.story.pages[0].visualCaption), 'unsupported action fallback must rewrite caption');

const food = lesson('Choose Food for Lunch', ['apple', 'sandwich', 'milk', 'cookie']);
const foodPlan = W.EdbActivities.plan(food, { level: 'A1', duration: 30 });
const foodAct = (foodPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert.equal(foodAct && foodAct.recipeId, 'heroProp', 'food/lunch lesson should use heroProp');
assert.equal(foodAct && foodAct.ctx && foodAct.ctx.hero && foodAct.ctx.hero.key, 'hero-lunch-tray');

const face = lesson('Make a Face', ['eyes', 'nose', 'mouth', 'hair']);
const facePlan = W.EdbActivities.plan(face, { level: 'A1', duration: 30 });
const faceAct = (facePlan.assignments || []).find((a) => a.pageKey === 'activity');
assert.equal(faceAct && faceAct.recipeId, 'heroProp', 'face lesson should use heroProp');
assert.equal(faceAct && faceAct.ctx && faceAct.ctx.hero && faceAct.ctx.hero.key, 'face-blank');

const zooActPlan = W.EdbActivities.plan(lesson('Zoo Animals', ['lion', 'monkey', 'elephant', 'zoo']), { level: 'A1', duration: 30 });
const zooAct = (zooActPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert.notEqual(zooAct && zooAct.ctx && zooAct.ctx.hero && zooAct.ctx.hero.key, 'hero-chest-open', 'zoo must not steal treasure chest');

const badmintonPlan = W.EdbActivities.plan(lesson('Playing Badminton', ['racket', 'shuttlecock', 'court', 'net']), { level: 'A2', duration: 30 });
const badmintonAct = (badmintonPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert.notEqual(badmintonAct && badmintonAct.recipeId, 'heroProp', 'badminton must not use a random suitcase/king stage');

const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
assert(/function storyArtInternalEnabled\(\)/.test(indexHtml), 'StoryArt must remain internal opt-in');
assert(/if \(!storyArtInternalEnabled\(\) \|\| !window\.StoryArt\)/.test(indexHtml), 'StoryArt.generate must be gated off by default');

console.log('OK P0 activation bridge regressions');
