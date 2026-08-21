/**
 * Final asset-migration retrieval checks.
 *
 * Exercises generator-facing selectors for representative generic topics, then
 * verifies that relationship-aware and specialized families remain outside the
 * loose harvest importer.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  ruleForPath,
  shouldSkipLooseHarvestPath,
} from './lib/asset-wiring-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function fileFetch(url) {
  const value = String(url);
  let file = null;
  if (value.includes('07_vocab-pack/index')) file = 'public/assets/07_vocab-pack/index.json';
  else if (value.includes('08_backgrounds/manifest')) file = 'public/assets/08_backgrounds/manifest.json';
  else if (value.includes('09_props/manifest')) file = 'public/assets/09_props/manifest.json';
  else if (value.includes('propPolicy')) file = 'public/lib/propPolicy.json';
  if (!file || !fs.existsSync(path.join(ROOT, file))) {
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  }
  const body = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(body) });
}

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  document: {
    createElement: (tag) => (tag !== 'canvas' ? {} : {
      width: 0,
      height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
      toDataURL: () => 'x',
    }),
  },
};
vm.createContext(sandbox);
for (const relativePath of [
  'public/lib/sceneBackgrounds.js',
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js',
  'public/lib/edbLayout.js',
  'public/lib/edbActivities.js',
  'public/lib/storyScene.js',
]) {
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, relativePath), 'utf8'),
    sandbox,
    { filename: relativePath }
  );
}

const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

const propsManifest = readJson('public/assets/09_props/manifest.json');
const backgroundsManifest = readJson('public/assets/08_backgrounds/manifest.json');
const relationships = readJson('docs/world-zoom-relationships.json');
const zoomInventory = readJson('docs/world-zoom-completions-inventory.json');

let failures = 0;
const results = [];

function check(id, condition, detail) {
  const pass = !!condition;
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
  if (!pass) failures++;
}

function vocabRow(title, word) {
  const plan = W.VocabArt.planFor({
    title,
    vocabulary: [{ word }],
  });
  return (plan.rows || []).find((row) => String(row.word).toLowerCase() === word.toLowerCase()) || null;
}

function genericProp(word, title) {
  const lesson = { title, vocabulary: [{ word }] };
  return W.PropBank.resolve({
    word,
    seed: title,
    family: W.PropBank.familyFor(lesson),
    minScore: W.PropBank.DEFAULT_MIN_SCORE,
    allowUnthemedIdentity: true,
  });
}

function isSpecializedPack(prop) {
  return !!(prop && ['hero-targets', 'story-cast', 'hide-reveal'].includes(prop.pack));
}

for (const sample of [
  ['DOG', 'Pet Dog Care', 'dog'],
  ['INSTRUMENT', 'Orchestra Instruments', 'flute'],
  ['SURF', 'Surf Club', 'surfboard'],
  ['CREATOR', 'Young Creator Studio', 'ring light'],
  ['MUSIC', 'Music Conservatory', 'cello'],
]) {
  const [id, title, word] = sample;
  const row = vocabRow(title, word);
  check(
    id,
    row && row.tier !== 'none' && (row.artSrc || row.glyph),
    row ? `${word} -> ${row.propKey || row.artSrc || row.glyph} (${row.tier})` : `${word} -> no row`
  );
  const prop = genericProp(word, title);
  check(
    `${id}_NO_SPECIALIZED_LEAK`,
    !prop || !isSpecializedPack(prop),
    prop ? `${word} -> ${prop.key} [${prop.pack || 'loose'}]` : `${word} -> no generic prop`
  );
}

const genericDogHouse = genericProp('dog house', 'Pet Dog Care');
check(
  'SPECIALIZED_PROP_POOLS_BLOCKED',
  !genericDogHouse || !isSpecializedPack(genericDogHouse),
  genericDogHouse
    ? `dog house -> ${genericDogHouse.key} [${genericDogHouse.pack || 'loose'}]`
    : 'dog house -> no generic prop'
);

const farm = await W.SceneBackgrounds.pickFor({
  title: 'Farm Adventure',
  tags: ['farm', 'outdoors', 'animals'],
  vocabulary: [{ word: 'farm' }],
}, { seed: 'Farm Adventure', topicWords: 'farm outdoors animals' });
check(
  'FARM',
  farm && farm.type === 'scene' && /farm/i.test(farm.name),
  farm ? `${farm.type}:${farm.name}` : 'no background'
);

const town = await W.SceneBackgrounds.pickFor({
  title: 'Town Main Street Overview',
  tags: ['town', 'community', 'main street', 'overview'],
  vocabulary: [{ word: 'town' }],
}, { seed: 'Town Main Street Overview', topicWords: 'town community main street overview' });
check(
  'TOWN_OVERVIEW',
  town && town.type === 'scene' && /^ow-/i.test(town.name),
  town ? `${town.type}:${town.name}` : 'no background'
);

const multiView = (relationships.multi_view_families || [])
  .find((family) => family.view_family_id === 'be-k3-classroom');
check(
  'CLASSROOM_MULTI_VIEW',
  multiView
    && multiView.live_background_key
    && backgroundsManifest.scenes[multiView.live_background_key]
    && multiView.registration_grade === 'REG_A',
  multiView
    ? `${multiView.view_family_id} -> ${multiView.live_background_key} (${multiView.registration_grade})`
    : 'family missing'
);

const storyRows = Object.entries(propsManifest.props || {})
  .filter(([, row]) => row.pack === 'story-cast');
check(
  'STORY',
  storyRows.length >= 1 && W.StoryScene,
  `${storyRows.length} story-cast rows; StoryScene ${W.StoryScene ? 'loaded' : 'missing'}`
);

const registered = relationships.k1_state_ladders_note || {};
const registeredRule = ruleForPath('harvested/board-enabling/registered-scene-states/example/sheets/01.png');
check(
  'REGISTERED_SCENE',
  (registered.family_ids || []).length >= 11
    && registeredRule.route === 'specialized_hold'
    && registeredRule.genericEligibility === false,
  `${(registered.family_ids || []).length} state families; route=${registeredRule.route}`
);

const builderChain = (relationships.zoom_chains || [])
  .find((chain) => chain.chain_id === 'canal-waterworks-zoom');
const builderKeys = Object.keys(backgroundsManifest.scenes || {})
  .filter((key) => key.startsWith('ow-bw-canal-lock-'));
check(
  'BUILDER',
  builderChain && builderKeys.length >= 4,
  `${builderKeys.length} canal-lock scenes; chain=${builderChain ? builderChain.chain_id : 'missing'}`
);

const specializedSceneCandidates = await W.SceneBackgrounds.rank([
  'builder-world',
  'board-enabling',
  'world-zoom',
  'zoom-completion',
]);
check(
  'SPECIALIZED_SCENE_POOLS_BLOCKED',
  specializedSceneCandidates.every(({ scene }) => W.SceneBackgrounds.isGenericScene(scene)),
  `${specializedSceneCandidates.length} generic candidates; 0 specialized candidates`
);

const mysteryHints = W.EdbActivities.resolveMysteryHints('apple', {
  title: 'Fruit Mystery',
  vocabulary: [{ word: 'apple', sentence: 'I eat an apple.' }],
});
check(
  'MYSTERY',
  Array.isArray(mysteryHints)
    && mysteryHints.length === 3
    && !W.EdbActivities.hintNamesAnswer(mysteryHints[0], 'apple')
    && !W.EdbActivities.hintNamesAnswer(mysteryHints[1], 'apple'),
  Array.isArray(mysteryHints) ? mysteryHints.join(' | ') : 'no hints'
);

for (const sample of [
  ['LONG_TAIL_LOCK', 'harvested/manus-long-tail-stockpile/lt1/sheets/01.png'],
  ['CONTENT_WORLDS_LOCK', 'harvested/content-worlds/cw-k1-dig-marine/companions/01.png'],
]) {
  const [id, sourcePath] = sample;
  const rule = ruleForPath(sourcePath);
  check(
    id,
    shouldSkipLooseHarvestPath(sourcePath)
      && rule.genericEligibility === false
      && rule.importers.length === 0,
    `route=${rule.route}; generic=${rule.genericEligibility}; importers=${rule.importers.length}`
  );
}

const zoomWorlds = Object.values(zoomInventory.worlds || {});
const zoomKeys = zoomWorlds.flatMap((world) => world.imported_scenes || []);
const zoomFamilies = (relationships.multi_view_families || [])
  .filter((family) => family.source === 'orphan-world-zoom-completions');
check(
  'RECOVERED_ZOOM_SCENES',
  zoomWorlds.length === 9
    && zoomKeys.length === 12
    && zoomWorlds.every((world) => world.qa === 'REG_A')
    && zoomKeys.every((key) => backgroundsManifest.scenes[key])
    && zoomKeys.every((key) => zoomFamilies.some((family) =>
      (family.live_background_keys || []).includes(key))),
  `${zoomWorlds.length} families / ${zoomKeys.length} scenes / ${zoomFamilies.length} relationship families`
);

console.log(`\n${results.length - failures}/${results.length} asset migration retrieval checks passed.`);
if (failures) process.exit(1);
