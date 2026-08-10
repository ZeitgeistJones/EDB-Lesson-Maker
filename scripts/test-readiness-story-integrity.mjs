/**
 * BoardReadiness must Draft on S73 story integrity fails (clubs PDF class).
 *   node scripts/test-readiness-story-integrity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

const sandbox = { window: {}, console, fetch: () => Promise.resolve({ ok: false }) };
vm.createContext(sandbox);
for (const rel of [
  'public/lib/storyIntegrity.js',
  'public/lib/boardReadiness.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
assert(W.StoryIntegrity && W.BoardReadiness, 'APIs loaded');

const clubs = {
  title: 'All Kinds of School Clubs',
  vocabulary: [
    { word: 'chess' }, { word: 'art' }, { word: 'choir' },
    { word: 'math' }, { word: 'drama' }, { word: 'robot' },
  ],
  story: {
    pages: [{
      text: 'The school was very busy today. It was the annual Club Fair. Students walked around the gym to find something new. Anna looked at the art booth. She liked the paintings. Ben',
    }],
    comprehensionQuestions: [
      { question: 'Where did the students go to look for clubs?', sampleAnswer: 'The gym.' },
      { question: 'Why did Anna choose the choir?', sampleAnswer: 'She liked singing.' },
      { question: 'What do you think the students will do at the club fair next year?', sampleAnswer: 'Look again.' },
    ],
  },
};

// Unrepaired lesson → live audit drafts
const draftLive = W.BoardReadiness.assess(clubs, { assignments: [] }, { ignoreKit: true });
assert(draftLive.status === 'draft', 'live clubs → draft');
assert(draftLive.reasons.some((r) => /S73:.*comprehension/i.test(r)), 'S73 Q reason: ' + draftLive.reasons.join(' | '));
assert(draftLive.reasons.some((r) => /S73:.*truncat/i.test(r)), 'S73 truncate reason: ' + draftLive.reasons.join(' | '));

// After repair, prior flags still keep Draft (silent fix ≠ Ready)
W.StoryIntegrity.repairLesson(clubs);
assert(clubs._storyIntegrity && clubs._storyIntegrity.droppedQuestions.length, 'repair recorded drops');
const draftPrior = W.BoardReadiness.assess(clubs, { assignments: [] }, { ignoreKit: true });
assert(draftPrior.status === 'draft', 'repaired clubs still draft');
assert(draftPrior.reasons.some((r) => /S73:/i.test(r)), 'prior S73 still surfaces');

// Clean grounded lesson → no S73
const clean = {
  title: 'Choir Day',
  vocabulary: [{ word: 'choir' }, { word: 'art' }],
  story: {
    pages: [{ text: 'Anna walked to the choir booth. She chose the choir because she loved to sing.' }],
    comprehensionQuestions: [
      { question: 'Why did Anna choose the choir?', sampleAnswer: 'She loved to sing.' },
    ],
  },
};
const readyish = W.BoardReadiness.assess(clean, { assignments: [] }, { ignoreKit: true });
assert(!readyish.reasons.some((r) => /S73:/i.test(r)), 'clean lesson no S73: ' + readyish.reasons.join(' | '));

// Partial art still drafts for missing pictures (admin) — student hint is not policed.
const hollowArt = {
  rows: [{ word: 'chess', matchable: true }, { word: 'art', matchable: false }],
  matchable: [{ word: 'chess' }],
  dropped: [{ word: 'art' }],
};
const partialAdmin = W.BoardReadiness.assess(
  { title: 'X', vocabulary: [{ word: 'chess' }, { word: 'art' }], story: { pages: [{ text: 'Hi.' }], comprehensionQuestions: [] } },
  {
    vocabArt: hollowArt,
    matchDockHint: 'Say each word. Drag each picture onto its numbered drop pad.',
    assignments: [{ pageKey: 'newWords', recipeId: 'matchDock' }],
  },
  { ignoreKit: true }
);
assert(partialAdmin.reasons.some((r) => /Dropped 1 vocab/i.test(r)), 'admin dropped reason: ' + partialAdmin.reasons.join(' | '));
assert(!partialAdmin.reasons.some((r) => /not every word/i.test(r)), 'no student-gap copy in Ready reasons');

console.log('test-readiness-story-integrity: ok', {
  liveReasons: draftLive.reasons.filter((r) => /S73/.test(r)),
  priorReasons: draftPrior.reasons.filter((r) => /S73/.test(r)),
});
