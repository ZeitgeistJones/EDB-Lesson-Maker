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

const sandbox = { window: {}, console, fetch: fileFetch };
vm.createContext(sandbox);
for (const rel of [
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js',
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
assert(/Drag each picture/i.test(fullHint), 'student hint keeps each picture');
assert(!/not every word/i.test(partialHint), 'student hint must not announce missing pictures');

// Art floor: Ready needs ≥5/6 teachable art (was 50%).
assert(Math.abs(W.BoardReadiness.VOCAB_ART_FLOOR - 5 / 6) < 1e-9, 'VOCAB_ART_FLOOR is 5/6');
const floorPct = Math.ceil(W.BoardReadiness.VOCAB_ART_FLOOR * 100);
const artFloorRe = new RegExp(
  `Only \\d+/\\d+ vocab words have board art \\(need ≥${floorPct}%\\)`
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
  !report6of6.reasons.some((r) => /board art \(need ≥/i.test(r)),
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
const adaptPlan = {
  vocabArt: W.VocabArt.planFor(adaptReadyLesson, { seed: adaptReadyLesson.title }),
  canHonestMatchDock: true,
  assignments: [],
  dockDrops: 0,
  vocabAdapt: adaptInfo,
};
const adaptReport = W.BoardReadiness.assess(adaptReadyLesson, adaptPlan, { ignoreKit: true });
assert(
  adaptReport.reasons.some((r) => /Only 2\/6 vocab words have board art/i.test(r)),
  'adapt: still Drafts when padded board misses art floor'
);
assert(
  !adaptReport.reasons.some((r) => /Board adapted to art coverage/i.test(r)),
  'adapt: overflow after reorder is non-blocking (UI adapt line only)'
);

// Short honest board clears art floor (3 pictured, no none-tier padding).
const shortHonest = {
  title: 'Short Honest Ready',
  vocabulary: [
    { word: 'xqzaaa' },
    { word: 'xqzbbb' },
    { word: 'xqzccc' },
    { word: 'xqzddd' },
    { word: 'xqzeee' },
    { word: 'soccer' },
    { word: 'pencil' },
    { word: 'microscope' },
  ],
};
const shortInfo = W.VocabArt.adaptBoardVocabulary(shortHonest, { seed: shortHonest.title });
assert(shortHonest._vocabAdapted.shortened && shortHonest._vocabAdapted.boardCount === 3, 'short ready: boardCount 3');
const shortArt = W.VocabArt.planFor(shortHonest, { seed: shortHonest.title });
const shortReport = W.BoardReadiness.assess(
  shortHonest,
  {
    vocabArt: shortArt,
    canHonestMatchDock: true,
    assignments: [{ pageKey: 'newWords', recipeId: 'matchDock', ctx: { vocabArt: shortArt } }],
    dockDrops: 0,
    vocabAdapt: shortInfo,
  },
  { ignoreKit: true }
);
assert(
  !shortReport.reasons.some((r) => /board art \(need ≥/i.test(r)),
  'short ready: no art-floor Draft'
);
assert(shortReport.vocabArt.hits === 3 && shortReport.vocabArt.total === 3, 'short ready: 3/3 hits');

// No-hero activity prefers sortBins (recipe adapt) — not dressUp lottery.
const noHeroLesson = {
  title: 'Abstract Patience Practice',
  vocabulary: [{ word: 'patient' }, { word: 'kind' }, { word: 'honest' }],
};
const noHeroPlan = W.EdbActivities.plan(noHeroLesson, { level: 'A2', duration: 30 });
const actRecipe = (noHeroPlan.assignments || []).find((a) => a.pageKey === 'activity');
assert(actRecipe && actRecipe.recipeId === 'sortBins', 'recipe adapt: no hero → sortBins');

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
  shortReady: { hits: shortReport.vocabArt.hits, total: shortReport.vocabArt.total, status: shortReport.status },
  noHeroRecipe: actRecipe && actRecipe.recipeId,
});
