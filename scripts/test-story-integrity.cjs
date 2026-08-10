/**
 * Clubs PDF regression: truncated story + choir Q when Anna is at art.
 * Run: node scripts/test-story-integrity.mjs
 */
const assert = require('assert');
const StoryIntegrity = require('../public/lib/storyIntegrity.js');

const clubsLike = {
  title: 'All Kinds of School Clubs',
  vocabulary: [
    { word: 'chess' }, { word: 'art' }, { word: 'choir' },
    { word: 'math' }, { word: 'drama' }, { word: 'robot' },
  ],
  story: {
    title: 'The Big Club Fair',
    pages: [
      {
        heading: 'Club Fair',
        text: 'The school was very busy today. It was the annual Club Fair. Students walked around the gym to find something new. Anna looked at the art booth. She liked the paintings. Ben',
      },
    ],
    comprehensionQuestions: [
      { question: 'Where did the students go to look for clubs?', sampleAnswer: 'They walked around the gym.' },
      { question: 'Why did Anna choose the choir?', sampleAnswer: 'She liked singing.' },
      { question: 'What do you think the students will do at the club fair next year?', sampleAnswer: 'They will look for new clubs again.' },
    ],
  },
};

const summary = StoryIntegrity.repairLesson(clubsLike);
assert.ok(summary.truncatedRepaired, 'expected truncated "Ben" tail repaired');
assert.ok(
  !/Ben\s*$/.test(clubsLike.story.pages[0].text),
  'repaired text must not end on bare Ben: ' + clubsLike.story.pages[0].text
);
assert.ok(/paintings\./i.test(clubsLike.story.pages[0].text), 'keep complete sentence through paintings');

const qs = clubsLike.story.comprehensionQuestions.map((q) => q.question);
assert.ok(qs.some((q) => /gym|look for clubs/i.test(q)), 'keep grounded gym question');
assert.ok(qs.some((q) => /next year|think/i.test(q)), 'keep opinion/future question');
assert.ok(!qs.some((q) => /choir/i.test(q)), 'drop choir question not in story: ' + JSON.stringify(qs));
assert.ok(summary.droppedQuestions.some((q) => /choir/i.test(q)), 'audit lists dropped choir Q');

// Happy path — choir in story keeps the question
const ok = {
  vocabulary: [{ word: 'choir' }, { word: 'art' }],
  story: {
    pages: [{ text: 'Anna walked to the choir booth. She chose the choir because she loved to sing.' }],
    comprehensionQuestions: [
      { question: 'Why did Anna choose the choir?', sampleAnswer: 'She loved to sing.' },
    ],
  },
};
StoryIntegrity.repairLesson(ok);
assert.equal(ok.story.comprehensionQuestions.length, 1, 'grounded choir Q kept');

assert.ok(StoryIntegrity.promptRules().includes('STORY INTEGRITY'), 'prompt rules exported');

console.log('test-story-integrity: ok');
