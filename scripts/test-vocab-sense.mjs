/**
 * Vocab sense honesty — the same word, two lessons, two meanings.
 *
 *   npm run test:vocab-sense
 *
 * The bank holds ONE picture per word and resolution is keyed on the string, so
 * before propPolicy.senses existed a lesson about nocturnal animals taught the
 * word "bat" with a picture of a baseball bat, and an arctic animals lesson
 * taught "seal" with a postal wax seal. Nine of ten polysemous words drew the
 * identical picture in both senses.
 *
 * Each pair below is two honest ESL lessons using opposite senses. The rule is
 * not "always draw something" — it is: draw the right sense, or draw nothing.
 * A word may legitimately resolve to art in one column and to none in the other.
 * What must never happen is the SAME picture in both.
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
  window: {}, console, fetch: fileFetch,
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

/** [word, [titleA, vocabA], [titleB, vocabB]] — opposite senses. */
const PAIRS = [
  ['bat', ['Animals of the Night', ['bat', 'owl', 'moth', 'cave']], ['Baseball Practice', ['bat', 'ball', 'glove', 'base']]],
  ['bank', ['Saving Money', ['bank', 'coin', 'save', 'account']], ['Down by the River', ['bank', 'river', 'fish', 'reed']]],
  ['glasses', ['At the Optician', ['glasses', 'eyes', 'frame', 'lens']], ['Setting the Table', ['glasses', 'plate', 'fork', 'napkin']]],
  ['mouse', ['Small Animals', ['mouse', 'rabbit', 'hamster', 'cage']], ['Using a Computer', ['mouse', 'keyboard', 'screen', 'click']]],
  ['star', ['The Night Sky', ['star', 'moon', 'planet', 'telescope']], ['Movie Night', ['star', 'film', 'actor', 'ticket']]],
  ['nail', ['Fixing a Shelf', ['nail', 'hammer', 'wood', 'screw']], ['At the Salon', ['nail', 'polish', 'hand', 'file']]],
  ['ring', ['A Wedding Day', ['ring', 'bride', 'cake', 'dress']], ['Boxing Club', ['ring', 'glove', 'punch', 'coach']]],
  ['plant', ['Growing a Garden', ['plant', 'seed', 'soil', 'water']], ['Factory Tour', ['plant', 'machine', 'worker', 'shift']]],
  ['seal', ['Arctic Animals', ['seal', 'walrus', 'ice', 'polar bear']], ['Sending a Letter', ['seal', 'envelope', 'stamp', 'post']]],
  ['light', ['Lamps and Lighting', ['light', 'lamp', 'bulb', 'switch']], ['Heavy or Light', ['light', 'heavy', 'weigh', 'carry']]],
];

const artId = (row) => {
  if (!row) return null;
  if (row.propKey) return row.propKey;
  if (row.artSrc) return String(row.artSrc).split('/').pop();
  return row.glyph || null;
};
const planWord = (title, words, word) => {
  const lesson = { title, vocabulary: words.map((w) => ({ word: w })) };
  const family = W.PropBank.familyFor(lesson);
  const plan = W.VocabArt.planFor(lesson, { seed: title, family });
  return artId(plan.rows.find((r) => r.word === word));
};

let failed = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('word', 9) + pad('sense A', 24) + pad('sense B', 24) + 'verdict');
console.log('-'.repeat(74));
for (const [word, [tA, wA], [tB, wB]] of PAIRS) {
  const a = planWord(tA, wA, word);
  const b = planWord(tB, wB, word);
  const collided = a !== null && b !== null && a === b;
  if (collided) failed++;
  console.log((collided ? 'XX' : '  ') + pad(word, 7) + pad(a || '— none —', 24) + pad(b || '— none —', 24)
    + (collided ? 'SAME PICTURE, BOTH SENSES' : 'ok'));
}

// The sense gate must not be a blanket mute: where the lesson does corroborate,
// the picture still has to ship. Without this, "drop everything" would pass.
const mustKeep = [
  ['bat', 'Baseball Practice', ['bat', 'ball', 'glove', 'base']],
  ['seal', 'Sending a Letter', ['seal', 'envelope', 'stamp', 'post']],
  ['mouse', 'Small Animals', ['mouse', 'rabbit', 'hamster', 'cage']],
  ['bank', 'Saving Money', ['bank', 'coin', 'save', 'account']],
  // A bank on a city tour is the building, and an accessories lesson really
  // does mean eyewear — corroboration is topic-wide, not one narrow word list.
  ['bank', 'Around the City', ['bank', 'street', 'shop', 'building']],
  ['glasses', 'Bags and Accessories', ['glasses', 'bag', 'belt', 'watch']],
];
for (const [word, title, words] of mustKeep) {
  if (planWord(title, words, word) === null) {
    console.log(`XX     "${word}" lost its picture on "${title}" — sense lock is too strict`);
    failed++;
  }
}

// Self-reference must not corroborate: a lesson whose only cue is the word.
if (W.PropBank.senseCorroborated('bat', ['Bats', 'bat'])) {
  console.log('XX     "bat" corroborated itself');
  failed++;
}

if (failed) {
  console.error(`\n${failed} vocab-sense case(s) FAILED`);
  process.exit(1);
}
console.log(`\nOK vocab sense honesty — ${PAIRS.length} polyseme pairs + ${mustKeep.length} must-keep + self-reference`);
