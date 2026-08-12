/**
 * Hero theme honesty — adversarial king-stage sweep.
 *
 *   npm run test:hero-theme
 *
 * The curated stage tables in `findHeroProp` are hand-written regexes, and the
 * failure they produce is invisible to unit tests written alongside them: the
 * rule looks right, the pack exists, the board says Ready, and a teacher opens
 * ClassIn to find a bathtub on a lesson about productivity. Every case below is
 * a real hole found by sweeping polysemous cue words through off-theme lessons.
 *
 * OFF  — the cue word appears in a lesson that is NOT about that theme. No king
 *        stage may fire. Empty beats wrong: the board falls to sortBins, which
 *        is honest.
 * KEEP — the theme really is the lesson. The stage must still win, so the guards
 *        above cannot be "fixed" by simply switching the cues off.
 * KNOWN — currently wrong, but the honest fix is asset metadata, not another
 *        regex. Asserted so the day someone retags the props, this test tells
 *        them the behaviour changed instead of silently drifting.
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
  if (!rel || !fs.existsSync(rel)) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  const body = fs.readFileSync(rel);
  return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(body.toString('utf8')) });
}

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  document: {
    createElement: (t) => (t !== 'canvas' ? {} : {
      width: 0, height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
      toDataURL: () => 'x',
    }),
  },
};
vm.createContext(sandbox);
for (const rel of [
  'public/lib/propBank.js', 'public/lib/vocabIcons.js', 'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js', 'public/lib/edbLayout.js', 'public/lib/edbActivities.js',
  'public/lib/boardReadiness.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

/** [kind, title, vocab, expected hero key or null] */
const CASES = [
  // --- off-theme cues that used to ship a wrong king stage -------------------
  ['OFF', 'My Productive Morning Routine', ['alarm', 'routine', 'schedule', 'habit'], null],
  ['OFF', 'Giving a Class Presentation', ['slide', 'projector', 'notes', 'audience'], null],
  ['OFF', 'Birds of the Wetlands', ['crane', 'heron', 'marsh', 'feather'], null],
  ['OFF', 'Rain Showers in Spring', ['shower', 'rain', 'cloud', 'umbrella'], null],
  ['OFF', 'Circus Comes to Town', ['tent', 'clown', 'acrobat', 'ticket'], null],

  // --- the same cues, on lessons that really are that theme ------------------
  ['KEEP', 'Sandcastle Competition', ['sand', 'castle', 'bucket', 'beach'], 'beach-sandcastle'],
  ['KEEP', 'Bathroom Objects', ['toothbrush', 'towel', 'mirror', 'soap'], 'bath-bathtub'],
  ['KEEP', 'My Morning Routine at Home', ['wash face', 'brush teeth', 'towel', 'routine'], 'bath-bathtub'],
  ['KEEP', 'Camping in the Forest', ['tent', 'campfire', 'forest', 'backpack'], 'tent'],
  ['KEEP', 'At the Playground', ['slide', 'swing', 'seesaw', 'playground'], 'playground-slide'],
  ['KEEP', 'Construction Site Day', ['crane', 'hard hat', 'excavator', 'construction'], 'construction-tower-crane'],
  ['KEEP', 'Life in a Medieval Castle', ['castle', 'knight', 'royal', 'drawbridge'], 'castle-wall-gate'],
  ['KEEP', 'At the Dentist', ['tooth', 'floss', 'dentist', 'smile'], 'dental-kid-open-mouth'],
  ['KEEP', 'Talking About Feelings', ['happy', 'sad', 'worried', 'proud'], 'face-blank'],
  ['KEEP', 'Fire Station Visit', ['fire truck', 'firefighter', 'hose', 'ladder'], 'fire-truck'],
  ['KEEP', 'At the Cafe', ['coffee', 'cake', 'menu', 'barista'], 'cafe-counter-stage'],
  ['KEEP', 'Day on the Farm', ['barn', 'tractor', 'cow', 'farm'], 'farm-barn'],

  // `sink` and `sponge` are keyed bathroom-only, so the kit scores bathroom on a
  // washing-up lesson. Guarding this with another regex would be over-fitting —
  // the fix is tagging those two props kitchen as well. Tracked in
  // docs/asset-wishlist.md.
  ['KNOWN', 'Washing Up After Dinner', ['plate', 'sponge', 'sink', 'dry'], 'bath-bathtub'],
];

let failed = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('kind', 7) + pad('lesson', 34) + pad('want', 26) + 'got');
console.log('-'.repeat(94));
for (const [kind, title, words, want] of CASES) {
  const lesson = { title, vocabulary: words.map((word) => ({ word })) };
  const hero = W.EdbActivities.findHeroProp(lesson);
  const got = hero ? hero.key : null;
  const ok = got === want;
  if (!ok) failed++;
  console.log((ok ? '  ' : 'XX') + pad(kind, 7) + pad(title, 34) + pad(want || '— none —', 26) + (got || '— none —'));
}

// An off-theme cue must not merely lose the hero — the board still has to teach.
// sortBins is the honest landing place; an activity page with neither is hollow.
const offNoHero = { title: 'My Productive Morning Routine', vocabulary: ['alarm', 'routine', 'schedule', 'habit'].map((word) => ({ word })) };
const plan = W.EdbActivities.plan(offNoHero, { level: 'B1', duration: 30 });
const act = (plan.assignments || []).find((a) => a.pageKey === 'activity');
if (!act || act.recipeId !== 'sortBins') {
  console.log(`XX     a vetoed hero must fall to sortBins, got ${act ? act.recipeId : 'no activity'}`);
  failed++;
}

if (failed) {
  console.error(`\n${failed} hero-theme case(s) FAILED`);
  process.exit(1);
}
console.log(`\nOK hero theme honesty — ${CASES.length} cases + sortBins fallback`);
