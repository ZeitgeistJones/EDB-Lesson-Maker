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
assert(report.reasons.some((r) => /bin pictures only/i.test(r)), 'reason: partial hint honesty');
assert(report.reasons.some((r) => /dock silently dropped 2/i.test(r)), 'reason: dockDrops');

const planNoDock = {
  vocabArt: { rows: art.rows, matchable: [], dropped: art.rows },
  canHonestMatchDock: false,
  assignments: [],
};
const report2 = W.BoardReadiness.assess(hollow, planNoDock, { ignoreKit: true });
assert(report2.reasons.some((r) => /Match dock skipped/i.test(r)), 'reason: match dock skipped');

// Student hint honesty: partial art must not claim "each picture".
assert(W.EdbActivities.matchDockIsPartial(art) === true, 'partial: clubs-style drop');
const partialHint = W.EdbActivities.matchDockStudentHint(art);
assert(/bin/i.test(partialHint), 'partial hint mentions bin');
assert(!/Drag each picture/i.test(partialHint), 'partial hint must not say Drag each picture');

const fullArt = {
  rows: art.matchable,
  matchable: art.matchable,
  dropped: [],
};
assert(W.EdbActivities.matchDockIsPartial(fullArt) === false, 'full set not partial');
const fullHint = W.EdbActivities.matchDockStudentHint(fullArt);
assert(/Drag each picture/i.test(fullHint), 'full hint keeps each picture');

console.log('OK readiness+vocabArt reasons + matchDock hint', {
  partial: report.reasons,
  noDock: report2.reasons,
  partialHint,
  fullHint,
});
