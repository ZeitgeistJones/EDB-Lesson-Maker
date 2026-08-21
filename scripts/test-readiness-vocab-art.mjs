/**
 * BoardReadiness + VocabArt reason smoke + matchDock student-hint honesty.
 *   node scripts/test-readiness-vocab-art.mjs
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

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  document: {
    createElement(tag) {
      if (tag !== 'canvas') return {};
      const c = {
        width: 0,
        height: 0,
        getContext() {
          return {
            fillStyle: '',
            font: '',
            textAlign: '',
            textBaseline: '',
            beginPath() {},
            moveTo() {},
            arcTo() {},
            closePath() {},
            fill() {},
            fillText() {},
            fillRect() {},
            stroke() {},
            strokeRect() {},
            setLineDash() {},
          };
        },
        toDataURL() {
          return 'data:image/png;base64,xx';
        },
      };
      return c;
    },
  },
};
vm.createContext(sandbox);
for (const rel of [
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js',
  'public/lib/edbLayout.js',
  'public/lib/edbActivities.js',
  'public/lib/boardReadiness.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

const hollow = {
  title: 'Odd Town',
  vocabulary: [
    { word: 'soccer' },
    { word: 'xqztplmnb' },
  ],
};
const art = W.VocabArt.planFor(hollow, { seed: hollow.title });
assert(art.dropped.some((d) => d.word === 'xqztplmnb'), 'dropped nonsense');
assert(art.matchable.some((m) => m.word === 'soccer'), 'soccer matchable');

const planPartial = {
  vocabArt: art,
  canHonestMatchDock: true,
  assignments: [{ pageKey: 'newWords', recipeId: 'matchDock', ctx: { vocabArt: art } }],
  dockDrops: 2,
};
const report = W.BoardReadiness.assess(hollow, planPartial, { ignoreKit: true });
assert(report.reasons.some((r) => /Dropped 1 vocab/i.test(r)), 'reason: dropped vocab');
assert(report.reasons.some((r) => /admin/i.test(r)), 'reason: admin-only gap note');
assert(!report.reasons.some((r) => /not every word/i.test(r)), 'no student-gap copy in Ready reasons');
assert(report.reasons.some((r) => /dock silently dropped 2/i.test(r)), 'reason: dockDrops');

const planNoDock = {
  vocabArt: { rows: art.rows, matchable: [], dropped: art.rows },
  canHonestMatchDock: false,
  assignments: [],
};
const report2 = W.BoardReadiness.assess(hollow, planNoDock, { ignoreKit: true });
assert(report2.reasons.some((r) => /Match dock skipped/i.test(r)), 'reason: match dock skipped');

// Student hint is always kid copy — never announces missing art (mapper/admin only).
assert(W.EdbActivities.matchDockIsPartial(art) === true, 'partial: clubs-style drop');
const partialHint = W.EdbActivities.matchDockStudentHint(art);
const fullArt = {
  rows: art.matchable,
  matchable: art.matchable,
  dropped: [],
};
assert(W.EdbActivities.matchDockIsPartial(fullArt) === false, 'full set not partial');
const fullHint = W.EdbActivities.matchDockStudentHint(fullArt);
assert(partialHint === fullHint, 'student hint identical whether partial or full');
assert(/park each picture/i.test(fullHint), 'student hint names the draggable picture source');
assert(/on its word/i.test(fullHint), 'student hint names the destination word pad');
assert(/say the word/i.test(fullHint), 'student hint includes retrieval aloud');
assert(!/not every word/i.test(partialHint), 'student hint must not announce missing pictures');

const clearMapping = W.EdbActivities.matchDockMappingAudit({
  matchable: [
    { word: 'dog', glyph: '🐶' },
    { word: 'cat', glyph: '🐱' },
  ],
});
assert(clearMapping.ok, 'mapping audit accepts unique, concrete word-picture pairs');

const ambiguousMapping = W.EdbActivities.matchDockMappingAudit({
  matchable: [
    { word: 'music', glyph: '🎵' },
    { word: 'song', glyph: '🎶' },
  ],
});
assert(!ambiguousMapping.ok, 'mapping audit rejects semantically confusable targets');
assert(
  ambiguousMapping.reasons.some((reason) => /semantic-confusability/.test(reason)),
  'mapping audit reports semantic confusability'
);

const duplicateSourceMapping = W.EdbActivities.matchDockMappingAudit({
  matchable: [
    { word: 'sea', artSrc: '/same-wave.png' },
    { word: 'ocean', artSrc: '/same-wave.png' },
  ],
});
assert(!duplicateSourceMapping.ok, 'mapping audit rejects duplicate source art');
assert(
  duplicateSourceMapping.reasons.includes('duplicate-source-art'),
  'mapping audit reports duplicate source art'
);

const campWorld = W.EdbActivities.matchDockWorldTheme({
  title: 'Campsite Fun',
  vocabulary: [{ word: 'tent' }, { word: 'campfire' }, { word: 'backpack' }],
});
assert(campWorld.id === 'camp', 'matchDock chooses the campsite world');
assert(/CAMP READY/.test(campWorld.payoff), 'campsite world has a topic payoff');

const musicWorld = W.EdbActivities.matchDockWorldTheme({
  title: 'Music Class',
  vocabulary: [{ word: 'piano' }, { word: 'drum' }],
});
assert(musicWorld.id === 'music', 'matchDock chooses the music-stage world');
assert(/BAND READY/.test(musicWorld.payoff), 'music world has a topic payoff');

const beachWorld = W.EdbActivities.matchDockWorldTheme({
  title: 'Beach Day Find',
  vocabulary: [{ word: 'shell' }, { word: 'crab' }, { word: 'umbrella' }],
});
assert(beachWorld.id === 'beach', 'matchDock chooses the beach world');
assert(/Park each picture/.test(beachWorld.metaphor), 'beach world uses one dock metaphor');
assert(typeof W.EdbActivities.matchDockWorldScenePng === 'function', 'matchDock paints a topic scene');
assert(typeof W.EdbActivities.matchDockWaxSealPng === 'function', 'matchDock paints a wax seal');
const starterRects = W.EdbActivities.matchDockThreeStateRects(false);
const solvedRects = W.EdbActivities.matchDockThreeStateRects(true);
assert(starterRects.seal.x !== solvedRects.seal.x, 'solved seal moves off the reward');
assert(starterRects.reward.w > starterRects.seal.w, 'locked seal is smaller so the reward peeks');

const takeBind = W.EdbActivities.coverAnswerBind(
  { question: 'What do you take camping?', sampleAnswer: 'I take a tent.' },
  { vocabulary: [{ word: 'tent' }, { word: 'backpack' }] }
);
assert(takeBind.ok, 'coverAnswerBind accepts take + I take');
assert(takeBind.intent === 'wh-take', 'coverAnswerBind classifies take questions');
assert(/I take/.test(takeBind.frame), 'coverAnswerBind does not bolt I like onto take');
const likeOnTake = W.EdbActivities.coverAnswerBind(
  { question: 'What do you take camping?', sampleAnswer: 'I like a tent.' },
  { vocabulary: [{ word: 'tent' }] }
);
assert(!likeOnTake.ok, 'coverAnswerBind rejects I like sample on a take question');
const weatherBind = W.EdbActivities.coverAnswerBind(
  { question: 'What weather do you like?', sampleAnswer: 'I like sunny days.' },
  { vocabulary: [{ word: 'sunny' }, { word: 'rainy' }] }
);
assert(weatherBind.ok && weatherBind.intent === 'wh-like', 'coverAnswerBind keeps I like on like-questions');

// Art floor: Ready needs ≥5/6 teachable art (was 50%).
assert(Math.abs(W.BoardReadiness.VOCAB_ART_FLOOR - 5 / 6) < 1e-9, 'VOCAB_ART_FLOOR is 5/6');
const floorPct = Math.ceil(W.BoardReadiness.VOCAB_ART_FLOOR * 100);
const artFloorRe = new RegExp(
  `Only \\d+/\\d+ board words have art \\(need ≥${floorPct}%\\)`
);

function syntheticRows(hitCount, total) {
  const rows = [];
  for (let i = 0; i < total; i++) {
    const ok = i < hitCount;
    rows.push({
      word: `w${i + 1}`,
      matchable: ok,
      tier: ok ? 'pack' : 'none',
      propKey: null,
    });
  }
  return rows;
}

function planFromRows(rows) {
  return {
    vocabArt: {
      rows,
      matchable: rows.filter((r) => r.matchable),
      dropped: [], // keep focus on art-floor; other reasons filtered via plan shape
    },
    canHonestMatchDock: true,
    assignments: [],
    dockDrops: 0,
  };
}

const sixWords = {
  title: 'Art Floor Probe',
  vocabulary: [1, 2, 3, 4, 5, 6].map((n) => ({ word: `w${n}` })),
};
const report3of6 = W.BoardReadiness.assess(
  sixWords,
  planFromRows(syntheticRows(3, 6)),
  { ignoreKit: true }
);
assert(report3of6.status === 'draft', '3/6 art → Draft');
assert(report3of6.reasons.some((r) => artFloorRe.test(r)), '3/6 art → art-floor reason');

const report6of6 = W.BoardReadiness.assess(
  sixWords,
  planFromRows(syntheticRows(6, 6)),
  { ignoreKit: true }
);
assert(
  !report6of6.reasons.some((r) => /board words have art \(need ≥/i.test(r)),
  '6/6 art → no art-floor reason'
);

// Coverage adapt reason surfaces when overflow was reordered onto the board six.
const adaptReadyLesson = {
  title: 'Adapt Ready Probe',
  vocabulary: [
    { word: 'xqzaaa' },
    { word: 'xqzbbb' },
    { word: 'xqzccc' },
    { word: 'xqzddd' },
    { word: 'xqzeee' },
    { word: 'xqzfff' },
    { word: 'soccer' },
    { word: 'pencil' },
  ],
};
const adaptInfo = W.VocabArt.adaptBoardVocabulary(adaptReadyLesson, {
  seed: adaptReadyLesson.title,
});
assert(adaptInfo.adapted, 'adapt probe: changed order');
assert(
  adaptInfo.board.includes('soccer') && adaptInfo.board.includes('pencil'),
  'adapt promotes pictured soccer/pencil onto the board'
);
assert(
  adaptReadyLesson._vocabAdapted.boardCount >= 2,
  'adapt probe: pictured boardCount ≥2, got ' + adaptReadyLesson._vocabAdapted.boardCount
);
const adaptPlan = {
  vocabArt: W.VocabArt.planFor(adaptReadyLesson, { seed: adaptReadyLesson.title }),
  canHonestMatchDock: true,
  assignments: [],
  dockDrops: 0,
  vocabAdapt: adaptInfo,
};
const adaptReport = W.BoardReadiness.assess(adaptReadyLesson, adaptPlan, { ignoreKit: true });
assert(adaptReport.status === 'draft', 'adapt probe without story spine stays Draft');
assert(
  !adaptReport.reasons.some((r) => /Board adapted to art coverage/i.test(r)),
  'adapt: overflow after reorder is non-blocking (UI adapt line only)'
);

// 5 pictured → Ready (art floor clears).
const fiveHonest = {
  title: 'Five Honest Ready',
  vocabulary: [
    { word: 'xqzaaa' },
    { word: 'xqzbbb' },
    { word: 'soccer' },
    { word: 'pencil' },
    { word: 'microscope' },
    { word: 'clipboard' },
    { word: 'eraser' },
  ],
};
const fiveInfo = W.VocabArt.adaptBoardVocabulary(fiveHonest, { seed: fiveHonest.title });
assert(fiveHonest._vocabAdapted.boardCount === 5, 'five ready: boardCount 5');
const fiveArt = W.VocabArt.planFor(fiveHonest, { seed: fiveHonest.title });
const fiveReport = W.BoardReadiness.assess(
  fiveHonest,
  {
    vocabArt: fiveArt,
    canHonestMatchDock: true,
    assignments: [{ pageKey: 'newWords', recipeId: 'matchDock', ctx: { vocabArt: fiveArt } }],
    dockDrops: 0,
    vocabAdapt: fiveInfo,
  },
  { ignoreKit: true }
);
assert(
  !fiveReport.reasons.some((r) => /board words have art \(need ≥/i.test(r)),
  'five ready: no art-floor Draft'
);
assert(fiveReport.vocabArt.hits === 5 && fiveReport.vocabArt.total === 5, 'five ready: 5/5 hits');

// 4 pictured → Ready.
const fourHonest = {
  title: 'Four Honest Ready',
  vocabulary: [
    { word: 'xqzaaa' },
    { word: 'xqzbbb' },
    { word: 'xqzccc' },
    { word: 'soccer' },
    { word: 'pencil' },
    { word: 'microscope' },
    { word: 'clipboard' },
  ],
};
const fourInfo = W.VocabArt.adaptBoardVocabulary(fourHonest, { seed: fourHonest.title });
assert(fourHonest._vocabAdapted.boardCount === 4, 'four ready: boardCount 4');
const fourArt = W.VocabArt.planFor(fourHonest, { seed: fourHonest.title });
const fourReport = W.BoardReadiness.assess(
  fourHonest,
  {
    vocabArt: fourArt,
    canHonestMatchDock: true,
    assignments: [{ pageKey: 'newWords', recipeId: 'matchDock', ctx: { vocabArt: fourArt } }],
    dockDrops: 0,
    vocabAdapt: fourInfo,
  },
  { ignoreKit: true }
);
assert(fourReport.vocabArt.hits === 4 && fourReport.vocabArt.total === 4, 'four ready: 4/4 hits');
assert(
  !fourReport.reasons.some((r) => /board words have art \(need ≥/i.test(r)),
  'four ready: no art-floor Draft'
);

// sortBins on N=4 uses adapted boardVocabCount (not hard 6).
W.EdbActivities.plan(fourHonest, { level: 'A2', duration: 30 });
assert(W.EdbActivities.boardVocabCount(fourHonest) === 4, 'sortBins: boardVocabCount 4');
assert(
  ((fourHonest.vocabulary || []).filter((v) => v && (v.word || v.emoji)).slice(0, W.EdbActivities.boardVocabCount(fourHonest))).length === 4,
  'sortBins: adapted list length 4'
);

// No-hero activity never falls to dressUp lottery — formulaic or sortBins OK.
const noHeroLesson = {
  title: 'Abstract Patience Practice',
  vocabulary: [{ word: 'patient' }, { word: 'kind' }, { word: 'honest' }],
};
const noHeroPlan = W.EdbActivities.plan(noHeroLesson, { level: 'A2', duration: 30 });
const actRecipe = (noHeroPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert(actRecipe, 'recipe adapt: activity assigned');
assert(
  actRecipe.recipeId !== 'dressUp' && actRecipe.recipeId !== 'heroProp',
  'recipe adapt: no hero → non-king, got ' + actRecipe.recipeId
);

// Identity-loop gate: hero-sized prop from a bare tag must share theme with the lesson.
// "sink" alone on pottery must NOT ship bath-sink (empty > wrong → non-king activity).
const potterySink = {
  title: 'Learning Pottery',
  vocabulary: [
    { word: 'clay' },
    { word: 'wheel' },
    { word: 'glaze' },
    { word: 'sink' },
    { word: 'bowl' },
    { word: 'vase' },
  ],
};
assert(
  !W.EdbActivities.findHeroProp(potterySink),
  'hero identity: pottery+sink must not ship bath-sink'
);
const potteryPlan = W.EdbActivities.plan(potterySink, { level: 'A2', duration: 30 });
const potteryAct = (potteryPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert(potteryAct, 'hero identity: pottery+sink activity assigned');
assert(
  potteryAct.recipeId !== 'dressUp' && potteryAct.recipeId !== 'heroProp',
  'hero identity: pottery+sink activity → non-king, got ' + potteryAct.recipeId
);

// Bathroom theme still clears a bath hero (stage rule / kit / gated identity).
const bathLesson = {
  title: 'Bathroom Routine',
  vocabulary: [
    { word: 'sink' },
    { word: 'soap' },
    { word: 'towel' },
    { word: 'toothbrush' },
    { word: 'shampoo' },
    { word: 'comb' },
  ],
};
const bathHero = W.EdbActivities.findHeroProp(bathLesson);
assert(bathHero && /^bath-/.test(bathHero.key), `bathroom theme hero, got ${bathHero && bathHero.key}`);

// Match dock floor: 1 matchable word is not a matching activity; 2+ can dock
// (thisOrThat thin boards need a real 2-pad New Words page).
assert(W.EdbActivities.canHonestMatchDock(1) === false, 'matchDock floor: 1 rejected');
assert(W.EdbActivities.canHonestMatchDock(2) === true, 'matchDock floor: 2 allowed');
assert(W.EdbActivities.canHonestMatchDock(3) === true, 'matchDock floor: 3 allowed');
assert(W.EdbActivities.canHonestMatchDock(4) === true, 'matchDock floor: 4 allowed');

// sortBins keeps every taught board word (no silent slice) and fills targetBay height.
const chessClub = {
  title: 'Joining the Chess Club',
  vocabulary: [
    { word: 'chess' },
    { word: 'king' },
    { word: 'queen' },
    { word: 'grandmaster' },
  ],
};
chessClub._boardVocabCount = 4;
const sortPage = W.EdbLayout.createPage('activity');
W.EdbActivities.RECIPES.sortBins(chessClub, sortPage, W.EdbLayout);
const sortCards = (sortPage.unlocked || []).filter((p) => p.role === 'sortCard');
assert(sortCards.length === 4, `sortBins keeps all 4 cards, got ${sortCards.length}`);
const sortBinPieces = (sortPage.locked || []).filter((p) => p.role === 'sortBin');
assert(sortBinPieces.length === 2, `sortBins places 2 bins, got ${sortBinPieces.length}`);
const bay = W.EdbLayout.zoneRect(sortPage, 'targetBay');
assert(
  sortBinPieces.every((b) => b.h >= bay.h - 30),
  `sortBins bins fill targetBay height (bay ${bay.h}, bins ${sortBinPieces.map((b) => b.h).join(',')})`
);

// Sentence-frame word tiles. Text tiles need no art bank, so a thin-art lesson
// the match dock must skip still gets draggable frames.
// Nonsense vocab + a non-place title keeps theme-bank from filling pictured
// camping props (title "Camping…" used to inject campfire/compass art).
const framesLesson = {
  title: 'Abstract Patience Day',
  vocabulary: [
    { word: 'xqztent' },
    { word: 'xqzfire' },
    { word: 'xqzhike' },
    { word: 'xqzgear' },
  ],
  sentenceFrames: [
    'I would like to __ because it is good for my health.',
    'If we go camping, we will need to bring __ with us.',
    'I prefer to __ when I am in the nature.',
  ],
};
framesLesson._boardVocabCount = 4;
assert(W.EdbActivities.frameBlankCount(framesLesson) === 3, 'frame blanks counted across 3 frames');
assert(W.EdbActivities.canHonestFrameTiles(framesLesson) === true, 'frame tiles allowed: 3 blanks + 4 words');

// Segment split must round-trip the sentence, or DOM pads land in the wrong place.
const segs = W.EdbActivities.frameSegments('I prefer to __ when I am __ home.');
assert(segs.filter((s) => s.blank).length === 2, 'frameSegments finds both blanks');
assert(
  segs.map((s) => (s.blank ? '__' : s.text)).join('') === 'I prefer to __ when I am __ home.',
  'frameSegments round-trips the frame text'
);

// One word is not a choice — leave those frames as write-on lines.
assert(
  W.EdbActivities.canHonestFrameTiles({
    vocabulary: [{ word: 'xqztent' }], sentenceFrames: ['I will bring my __.'], _boardVocabCount: 1,
  }) === false,
  'frame tiles floor: 1 word rejected'
);
// No blanks → nothing to drag into.
assert(
  W.EdbActivities.canHonestFrameTiles({
    vocabulary: [{ word: 'xqztent' }, { word: 'xqzgear' }],
    sentenceFrames: ['Tell your partner about your weekend.'],
    _boardVocabCount: 2,
  }) === false,
  'frame tiles floor: no blanks rejected'
);

// Tiles land inside the frames dock — one per taught word, none stranded.
const framePage = W.EdbLayout.createPage('frames');
W.EdbActivities.RECIPES.frameTiles(framesLesson, framePage, W.EdbLayout);
const frameWordTiles = (framePage.unlocked || []).filter((p) => p.role === 'frameWord');
assert(frameWordTiles.length === 4, `frameTiles places one tile per word, got ${frameWordTiles.length}`);
const frameDock = W.EdbLayout.zoneRect(framePage, 'dock');
assert(
  frameWordTiles.every((t) => t.x >= frameDock.x - 1 && t.y >= frameDock.y - 1
    && t.x + t.w <= frameDock.x + frameDock.w + 1 && t.y + t.h <= frameDock.y + frameDock.h + 1),
  'frameTiles stay inside the frames dock'
);
// Thin art must not cost the lesson its frame tiles — this is the whole point.
const thinArtPlan = W.EdbActivities.plan(framesLesson, { level: 'B1', duration: 30 });
assert(
  thinArtPlan.canHonestMatchDock === false,
  'thin-art frames lesson is below the match floor (guards the case below)'
);
assert(
  thinArtPlan.assignments.some((a) => a.pageKey === 'frames' && a.recipeId === 'frameTiles'),
  'frame tiles still assigned when the match dock is skipped'
);

// A board that teaches nothing is never Ready. plan() assigns no recipes when
// the lesson has no vocab, so New Words and the activity page ship empty —
// this used to score 0/0 = ratio 1 and pass the art floor as "Ready to teach".
const noVocab = { title: 'Learning Pottery', vocabulary: [] };
const noVocabPlan = W.EdbActivities.plan(noVocab, { level: 'B1', duration: 30 });
assert(noVocabPlan.assignments.length === 0, 'empty vocab → no recipes assigned');
const noVocabReport = W.BoardReadiness.assess(noVocab, noVocabPlan, { ignoreKit: true });
assert(noVocabReport.status === 'draft', 'empty vocab → draft, not ready');
assert(
  noVocabReport.reasons.some((r) => /teaches no vocabulary words/i.test(r)),
  'empty vocab reason: ' + noVocabReport.reasons.join(' | ')
);
assert(noVocabReport.vocabArt.ratio === 0, 'empty board scores 0 art, not a perfect 1');
assert(
  !/Ready to teach/.test(W.BoardReadiness.summaryLine(noVocabReport)),
  'empty board summary does not say Ready to teach'
);
// Kit gates on (the real Download path) must reach the same verdict.
const noVocab2 = { title: 'Learning Pottery', vocabulary: [] };
const noVocabKit = W.BoardReadiness.assess(
  noVocab2,
  W.EdbActivities.plan(noVocab2, { level: 'B1', duration: 30 })
);
assert(noVocabKit.status === 'draft', 'empty vocab → draft with kit gates on too');

// Manus R1 matchDock FAIL: hypernym/title-echo fills must never become drag pads.
const fruitLesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/fruit-market-lesson.json'), 'utf8'));
W.VocabArt.adaptBoardVocabulary(JSON.parse(JSON.stringify(fruitLesson)), { seed: fruitLesson.title });
const fruitArt = W.VocabArt.planFor(fruitLesson, { seed: fruitLesson.title, allowPackFallback: true });
const fruitMatchWords = fruitArt.matchable.map((r) => String(r.word).toLowerCase());
assert(!fruitMatchWords.includes('fruit'), 'fruit hypernym demoted from match dock');
assert(!fruitMatchWords.includes('fruit market'), 'title-echo compound demoted from match dock');
assert(fruitMatchWords.includes('apple') && fruitMatchWords.includes('banana'), 'hyponyms stay matchable');

console.log('OK readiness+vocabArt reasons + matchDock hint + art floor + adapt', {
  partial: report.reasons,
  noDock: report2.reasons,
  partialHint,
  fullHint,
  floor: W.BoardReadiness.VOCAB_ART_FLOOR,
  floorPct,
  art3of6: report3of6.reasons,
  art6of6Status: report6of6.status,
  adaptReasons: adaptReport.reasons,
  fiveReady: { hits: fiveReport.vocabArt.hits, total: fiveReport.vocabArt.total, status: fiveReport.status },
  fourReady: { hits: fourReport.vocabArt.hits, total: fourReport.vocabArt.total, status: fourReport.status },
  noHeroRecipe: actRecipe && actRecipe.recipeId,
  potteryAct: potteryAct && potteryAct.recipeId,
  bathHero: bathHero && bathHero.key,
});
