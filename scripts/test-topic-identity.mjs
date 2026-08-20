/**
 * Topic Identity Gate — brief + drift validation.
 *
 *   npm run test:topic-identity
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
  else if (u.includes('08_backgrounds/manifest')) rel = path.join(PUBLIC, 'assets/08_backgrounds/manifest.json');
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
      width: 0,
      height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
      toDataURL: () => 'x',
    }),
  },
};
vm.createContext(sandbox);
for (const rel of [
  'public/lib/topicIdentity.js',
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js',
  'public/lib/sceneBackgrounds.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

let failed = 0;
function check(ok, msg) {
  if (!ok) {
    console.log('XX  ' + msg);
    failed++;
  } else {
    console.log('OK  ' + msg);
  }
}

const TI = W.TopicIdentity;
check(!!TI, 'TopicIdentity exported');
check(typeof TI.buildBrief === 'function', 'buildBrief');
check(typeof TI.scoreAsset === 'function', 'scoreAsset');
check(typeof TI.auditPage === 'function', 'auditPage');

// --- Beekeeping vs farm ---
const beeLesson = {
  title: 'Beekeeping Basics',
  vocabulary: [
    { word: 'bee' },
    { word: 'hive' },
    { word: 'honey' },
    { word: 'beekeeper' },
    { word: 'tractor' },
    { word: 'cow' },
  ],
};
const bee = TI.buildBrief(beeLesson);
check(bee.topicId === 'beekeeping', 'beekeeping topicId (got ' + bee.topicId + ')');
check(bee.parentCategories.includes('farm'), 'farm is parent, not primary');
check(bee.coreConcepts.some((c) => /bee|hive|honey/i.test(c)), 'core has bee/hive/honey');
check(
  bee.coreConcepts.some((c) => /honeycomb/i.test(c)),
  'core prefers honeycomb over bare comb'
);
check(
  !bee.coreConcepts.some((c) => /^comb$/i.test(String(c).trim())),
  'bare comb is not a core (hair-comb polysemy)'
);
check(
  bee.forbiddenSubstitutes.some((f) => /tractor|cow|barn/i.test(f)),
  'tractor/cow/barn forbidden'
);

const beesTitle = TI.buildBrief({
  title: 'A Day with the Bees',
  vocabulary: [{ word: 'farm' }, { word: 'comb' }, { word: 'bees' }],
});
check(beesTitle.topicId === 'beekeeping', 'Day with the Bees → beekeeping (got ' + beesTitle.topicId + ')');


const barnOnVocab = TI.scoreAsset(bee, {
  kind: 'prop',
  key: 'farm-barn',
  packs: ['farm'],
  tags: ['barn', 'farm'],
  pageTags: ['vocabulary'],
});
check(barnOnVocab.role === 'forbidden' || !barnOnVocab.ok, 'farm-barn rejected on New Words');

const barnOnStory = TI.scoreAsset(bee, {
  kind: 'bg',
  set: 'outdoor-fresh',
  pageTags: ['story'],
});
check(barnOnStory.ok === true, 'outdoor-fresh allowed as env on story (got ' + barnOnStory.role + ')');

const drift = TI.auditPage(
  bee,
  [
    { kind: 'prop', key: 'farm-barn', packs: ['farm'], pageTags: ['vocabulary'] },
    { kind: 'prop', key: 'farm-tractor', packs: ['farm'], pageTags: ['vocabulary'] },
    { kind: 'prop', key: 'farm-cow', packs: ['farm'], pageTags: ['vocabulary'] },
    { kind: 'vocab', word: 'hive', pageTags: ['vocabulary'] },
  ],
  ['vocabulary']
);
check(drift.drift === true, 'majority farm props → TOPIC_DRIFT');
check(drift.code === 'TOPIC_DRIFT', 'drift code TOPIC_DRIFT');

// --- Space / marine / volcano prefer sets ---
const space = TI.buildBrief({
  title: 'Learning about space',
  vocabulary: [{ word: 'rocket' }, { word: 'astronaut' }, { word: 'planet' }],
});
check(space.topicId === 'space', 'space topicId');
check(
  (space.backgroundCues.preferSets || []).includes('space-cool'),
  'space preferSets space-cool'
);

const sharks = TI.buildBrief({
  title: 'Sea Animals',
  vocabulary: [{ word: 'shark' }, { word: 'dolphin' }, { word: 'whale' }],
});
check(sharks.topicId === 'marine', 'marine topicId for sea animals');
check(
  (sharks.backgroundCues.preferSets || []).includes('aquarium-cool'),
  'marine prefer aquarium-cool'
);
check(
  (sharks.backgroundCues.avoidSets || []).includes('outdoor-fresh'),
  'marine avoids outdoor-fresh'
);

const volcano = TI.buildBrief({
  title: 'I live next to a volcano',
  vocabulary: [{ word: 'lava' }, { word: 'ash' }, { word: 'eruption' }],
});
check(volcano.topicId === 'volcano', 'volcano topicId');
check(
  (volcano.backgroundCues.preferSets || []).includes('volcano-cool'),
  'volcano prefer volcano-cool'
);

// lesson.topicBrief adoption
const adopted = TI.buildBrief({
  title: 'Random Title',
  vocabulary: [{ word: 'x' }],
  topicBrief: {
    topicId: 'beekeeping',
    topicLabel: 'beekeeping',
    parentCategories: ['farm'],
    coreConcepts: ['bee', 'hive', 'honey', 'beekeeper', 'comb', 'smoker'],
    primaryMotifs: ['hive', 'bee'],
    secondaryMotifs: ['farm'],
    forbiddenSubstitutes: ['tractor'],
  },
});
check(adopted.source === 'lesson', 'adopts lesson.topicBrief');
check(adopted.topicId === 'beekeeping', 'adopted topicId');

if (failed) {
  console.error('\nFAILED topic-identity — ' + failed + ' check(s)');
  process.exit(1);
}
console.log('\nOK topic-identity — brief + drift gate');
