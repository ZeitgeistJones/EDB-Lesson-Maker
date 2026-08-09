/**
 * MAX_BOARD_VOCAB ceiling: VocabArt / BoardReadiness / PDF slice agree,
 * overflow words become readiness reasons, normalize dedupes duplicates.
 *
 *   node scripts/test-vocab-overflow.mjs
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
  if (!rel || !fs.existsSync(rel)) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  const body = fs.readFileSync(rel);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

function stubEl() {
  const el = {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {},
    setAttribute() {},
    getAttribute() { return null; },
    remove() {},
    addEventListener() {},
    textContent: '',
    innerHTML: '',
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  return el;
}

const sandbox = {
  window: {},
  document: {
    createElement: () => stubEl(),
    createTextNode: (t) => ({ textContent: t }),
    body: stubEl(),
  },
  console,
  fetch: fileFetch,
};
vm.createContext(sandbox);
for (const rel of [
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/boardReadiness.js',
  'public/lib/renderLessonPages.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

assert(W.VocabArt.MAX_BOARD_VOCAB === 6, 'MAX_BOARD_VOCAB === 6');
assert(W.BoardReadiness.maxBoardVocab() === 6, 'BoardReadiness.maxBoardVocab === 6');
assert(W.LessonPages.maxBoardVocab() === 6, 'LessonPages.maxBoardVocab === 6');

// Apostrophe strip for tier-2 identity
assert(W.VocabArt.slug("don't") === 'dont', 'slug strips apostrophe: don\'t → dont');
assert(W.VocabArt.slug("don't") !== "don't", 'slug does not keep apostrophe');

const overflow = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/overflow-lesson.json'), 'utf8')
);
assert(overflow.vocabulary.length === 12, 'fixture has 12 vocab words');

const art = W.VocabArt.planFor(overflow, { seed: overflow.title });
assert(art.rows.length === W.VocabArt.MAX_BOARD_VOCAB, 'planFor rows capped at MAX');
assert(
  art.rows.every((r, i) => r.word === overflow.vocabulary[i].word),
  'planFor keeps first MAX words in order'
);
assert(
  !art.rows.some((r) => r.word === 'jet lag'),
  'overflow word jet lag not in VocabArt rows'
);

const boardWords = W.VocabArt.vocabWords(overflow);
assert(boardWords.length === 6, 'vocabWords length === MAX');
assert(boardWords[5] === 'arrival', '6th board word is arrival');
assert(!boardWords.includes('seatbelt'), 'seatbelt (7th) not board-taught');

const report = W.BoardReadiness.assess(overflow, {
  vocabArt: art,
  canHonestMatchDock: true,
  assignments: [{ pageKey: 'newWords', recipeId: 'matchDock', ctx: { vocabArt: art } }],
}, { ignoreKit: true });
assert(report.status === 'draft', 'overflow lesson is draft');
assert(
  report.reasons.some((r) => /past board ceiling of 6/i.test(r)),
  'reason mentions board ceiling: ' + report.reasons.join(' | ')
);
assert(
  report.reasons.some((r) => /seatbelt|turbulence|customs|delayed/i.test(r)),
  'reason names an overflow word'
);

// PDF helper must use same ceiling (eval the small helper from buildLessonPdf)
const pdfSrc = fs.readFileSync(path.join(ROOT, 'public/lib/buildLessonPdf.js'), 'utf8');
assert(/MAX_BOARD_VOCAB/.test(pdfSrc), 'buildLessonPdf references MAX_BOARD_VOCAB');
assert(!/slice\(0,\s*8\)/.test(pdfSrc), 'buildLessonPdf no longer slices vocab to 8');

// Duplicate collapse in normalizeLesson
const dupLesson = {
  title: 'Dupes',
  vocabulary: [
    { word: 'passport', emoji: '🛂', sentence: 'A' },
    { word: 'Passport', emoji: '🎫', sentence: 'B' },
    { word: 'suitcase', emoji: '🧳', sentence: 'C' },
  ],
};
W.LessonPages.normalizeLesson(dupLesson);
assert(dupLesson.vocabulary.length === 2, 'normalize dedupes case-insensitive word');
assert(dupLesson.vocabulary[0].word === 'passport', 'keeps first passport');
assert(dupLesson.vocabulary[1].word === 'suitcase', 'keeps suitcase');

console.log('OK vocab overflow + MAX_BOARD_VOCAB', {
  max: W.VocabArt.MAX_BOARD_VOCAB,
  planned: art.rows.map((r) => r.word),
  overflowReason: report.reasons.find((r) => /ceiling/i.test(r)),
  slugDont: W.VocabArt.slug("don't"),
});
