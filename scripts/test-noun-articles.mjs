/**
 * Mass-noun / article producer regressions (beach "a sand", weak vocab sentences).
 *   node scripts/test-noun-articles.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {}, console, globalThis: {} };
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const rel of [
  'public/lib/nounArticles.js',
  'public/lib/storyIntegrity.js',
  'public/lib/producerBridge.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const NA = sandbox.window.NounArticles;
const SI = sandbox.window.StoryIntegrity;
const PB = sandbox.window.ProducerBridge;

assert.equal(NA.isMassNoun('sand'), true);
assert.equal(NA.isMassNoun('shell'), false);
assert.equal(NA.indefiniteArticle('sand'), '');
assert.equal(NA.indefiniteArticle('shell'), 'a');
assert.equal(NA.indefiniteArticle('apple'), 'an');
assert.equal(NA.seesNoun('sand'), 'sees the sand');
assert.equal(NA.seesNoun('shell'), 'sees a shell');
assert.equal(NA.doISeeNoun('sand'), 'Do I see sand?');
assert.ok(!/\ba sand\b/i.test(NA.doISeeNoun('sand')));

assert.ok(NA.isWeakExampleSentence('We use “sand” when we talk about the beach.', 'sand'));
assert.ok(NA.isWeakExampleSentence('We see shell where we find ocean beach', 'shell'));
assert.ok(!NA.isWeakExampleSentence('The sand is warm.', 'sand'));

const lesson = {
  title: 'A Day at the Beach',
  vocabulary: [
    { word: 'sand', sentence: 'We use “sand” when we talk about the beach.' },
    { word: 'shell', sentence: 'We see shell where we find ocean beach' },
    { word: 'beach', sentence: '' },
    { word: 'bucket', sentence: 'I have a bucket.' },
  ],
  story: {
    pages: [{ text: 'Mia sees a sand. Look and say: sand.' }],
    comprehensionQuestions: [],
  },
};
NA.repairLessonVocabulary(lesson);
NA.repairLessonTextFields(lesson);
assert.ok(!/\ba sand\b/i.test(lesson.story.pages[0].text), lesson.story.pages[0].text);
assert.ok(lesson.vocabulary.every((v) => String(v.sentence || '').trim().length >= 6), 'all cards have sentences');
assert.ok(!lesson.vocabulary.some((v) => /we use .+ when we talk about/i.test(v.sentence)));
assert.ok(/sand/i.test(lesson.vocabulary.find((v) => v.word === 'sand').sentence));

SI.repairLesson(lesson);
const qs = (lesson.story.comprehensionQuestions || []).map((q) => q.question);
assert.ok(!qs.some((q) => /\ba sand\b/i.test(q)), 'comprehension must not ask Do I see a sand?: ' + JSON.stringify(qs));

const b1VolcanoQs = {
  level: 'B1',
  vocabulary: [{ word: 'volcano' }, { word: 'lava' }],
  story: {
    pages: [{ text: 'People live near the volcano because the soil is rich. Lava can destroy roads.' }],
    comprehensionQuestions: [
      { question: 'Why do aliens farm on Mars?', sampleAnswer: 'Because it is red.' },
    ],
  },
};
SI.repairLesson(b1VolcanoQs);
assert.ok(
  !b1VolcanoQs.story.comprehensionQuestions.some((q) => /do i see|is there a/i.test(q.question)),
  'B1 must not get baby Do-I-see pads: ' + JSON.stringify(b1VolcanoQs.story.comprehensionQuestions)
);

// Bridge: sand must not become "sees a sand" when NounArticles is loaded.
// Minimal stub PropBank so bridge can resolve shell/bucket if present in text.
sandbox.window.PropBank = {
  get: () => null,
  resolve: ({ word }) => (word === 'shell' ? { key: 'shell', path: 'x.png' } : null),
  familyFor: () => null,
};
const beach = {
  title: 'A Day at the Beach',
  vocabulary: [
    { word: 'sand', sentence: 'The sand is warm.' },
    { word: 'shell', sentence: 'I find a shell.' },
  ],
  story: {
    pages: [{
      heading: 'Beach',
      text: 'Mia is at the beach. She looks at sand and a shell by the ocean.',
      visualTheme: 'beach',
      visualCaption: 'beach',
    }],
  },
};
PB.normalize(beach, { level: 'A1', duration: 30 });
const t = beach.story.pages[0].text + ' ' + (beach.story.pages[0].visualCaption || '');
assert.ok(!/\ba sand\b/i.test(t), 'bridge must not emit a sand: ' + t);
assert.ok(!/\bsees a sand\b/i.test(t), t);

// B1 authored prose must survive the StoryScene bridge (volcano regression).
const volcano = {
  title: 'Living Near a Volcano',
  level: 'B1',
  vocabulary: [
    { word: 'volcano', sentence: 'The volcano is dangerous but the land is fertile.' },
    { word: 'lava', sentence: 'Hot lava flows down the slope.' },
  ],
  story: {
    pages: [{
      heading: 'Our Mountain Home',
      text: 'People live near the volcano because the soil is rich. When ash falls, they close the windows and wait.',
      visualTheme: 'nature',
      visualCaption: 'village near a volcano',
    }],
  },
};
PB.normalize(volcano, { level: 'B1', duration: 30 });
assert.ok(
  /soil is rich|ash falls/i.test(volcano.story.pages[0].text),
  'B1 story prose must not be replaced with Look-and-say: ' + volcano.story.pages[0].text
);
assert.ok(
  !/look and say/i.test(volcano.story.pages[0].text),
  'B1 must not get Look and say baby talk'
);

console.log('OK noun-articles producer regressions');
