#!/usr/bin/env node
/** Kitchen Helpers producer proof: VocabArt + activity + bg set. */
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
  else if (u.includes('08_backgrounds/manifest') || u.includes('sceneBackgrounds')) {
    rel = path.join(PUBLIC, 'assets/08_backgrounds/manifest.json');
  }
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

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  setTimeout,
  clearTimeout,
  document: {
    createElement: (t) => (t !== 'canvas' ? {} : {
      width: 0, height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
      toDataURL: () => 'x',
    }),
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of [
  'public/lib/lessonTraits.js',
  'public/lib/vocabIcons.js',
  'public/lib/propBank.js',
  'public/lib/vocabArt.js',
  'public/lib/sceneBackgrounds.js',
  'public/lib/edbLayout.js',
  'public/lib/edbActivities.js',
  'public/lib/boardReadiness.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });
}

const W = sandbox.window;
await W.VocabIcons.ready();
await W.PropBank.ready();
if (W.SceneBackgrounds && W.SceneBackgrounds.ready) await W.SceneBackgrounds.ready();

const lesson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/kitchen-helpers-lesson.json'), 'utf8')
);

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

const theme = W.LessonTraits.resolveTheme(lesson);
assert(theme && theme.id === 'kitchen', 'theme kitchen, got ' + JSON.stringify(theme));
assert((theme.packs || []).includes('bakery'), 'kitchen packs include bakery');

W.VocabArt.adaptBoardVocabulary(lesson, { seed: lesson.title });
const art = W.VocabArt.planFor(lesson, { seed: lesson.title });
for (const w of ['whisk', 'spatula', 'grater', 'blender', 'timer', 'apron']) {
  const row = art.rows.find((r) => r.word === w);
  assert(row && row.tier !== 'none', `${w} pictured, got ${JSON.stringify(row)}`);
  console.log('art', w, { tier: row.tier, propKey: row.propKey, glyph: row.glyph });
}

assert(W.EdbActivities.hasFramesContent(lesson), 'fixture has frames');
assert(!W.EdbActivities.canBuildFixSentence(lesson), 'frames demote fixSentence');
const plan = W.EdbActivities.plan(lesson, { level: 'A2', duration: 30 });
const act = (plan.assignments || []).find((a) => a.pageKey === 'activity');
assert(act && act.recipeId !== 'fixSentence',
  `activity not fixSentence twin, got ${act && act.recipeId}`);
console.log('activity', act && act.recipeId);

const set = W.SceneBackgrounds.setFor
  ? W.SceneBackgrounds.setFor(lesson.title + ' ' + lesson.vocabulary.map((v) => v.word).join(' '))
  : null;
const cov = W.SceneBackgrounds.bgCoverage
  ? W.SceneBackgrounds.bgCoverage(lesson)
  : null;
console.log('bg setFor', set, 'coverage', cov);
assert(
  (set === 'bakery-warm')
  || (cov && cov.set === 'bakery-warm')
  || (typeof set === 'object' && set && set.set === 'bakery-warm'),
  'kitchen → bakery-warm flats, got ' + JSON.stringify({ set, cov })
);

console.log('\nOK kitchen-helpers producer proof');
