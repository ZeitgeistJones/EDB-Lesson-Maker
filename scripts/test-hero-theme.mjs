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
  // Full plan() path — TopicIdentity/ProducerQuality used to erase pirate chest
  // via orchestra ⊂ chest stem pollution. Asserts must load them.
  'public/lib/topicIdentity.js', 'public/lib/producerQuality.js',
]) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: rel });
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
  // Lone "happy" must not face-blank a circus lesson (theme lock / feelingsCore).
  ['OFF', 'Circus Comes to Town', ['tent', 'clown', 'acrobat', 'ticket', 'happy'], null],
  // Activity title "Match the food words" used to score cafe kit ready via
  // broad "food" tags despite apple/banana/carrot vocab (Manus Y737).
  ['OFF', 'Fruit Market', ['apple', 'banana', 'carrot', 'tomato', 'lemon', 'grape'], null],
  // Pet / homework / school must never resolve space (star tag bleed) or farm
  // (milk/cat tag bleed) — empty → sortBins beats a spaceship cockpit.
  ['OFF', 'The Cat Ate My Homework', ['homework', 'cat', 'hungry', 'teacher', 'milk', 'school'], null],
  ['OFF', 'The Cat Ate My Homework', ['homework', 'cat', 'hungry', 'teacher', 'milk', 'school', 'star'], null],
  ['OFF', 'Pet Day at School', ['cat', 'dog', 'pet', 'homework'], null],
  // Basketball / sports — themed pack OK, but hoop is not shippable yet → no king.
  ['OFF', 'Playing Basketball with Friends', ['ball', 'team', 'score', 'court'], null],
  // Dishwashing is a kitchen wash-up king (bath-sink), not a bathtub.
  ['KEEP', 'Washing Up After Dinner', ['plate', 'sponge', 'sink', 'dry'], 'bath-sink'],
  // Cooking without a shippable kitchen king stays empty — spatula alone is not an oven.
  ['OFF', 'In the Kitchen', ['spatula', 'pan', 'chef', 'whisk'], null],
  // Oven title+vocab → open oven king (waves 2–12).
  ['KEEP', 'Bake Cookies in the Oven', ['oven', 'cookie', 'bake', 'tray'], 'hero-oven-open'],
  // --- the same cues, on lessons that really are that theme ------------------
  // Beach sandcastle has no curated ROLEPLAY_DOCK_* — soft-gate excludes (empty > weak).
  ['OFF', 'Sandcastle Competition', ['sand', 'castle', 'bucket', 'beach'], null],
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
  // Space cockpits are soft / not in SHIPPABLE_KING_KEYS — sortBins until curated.
  ['OFF', 'Trip to the Space Station', ['astronaut', 'rocket', 'space', 'planet'], null],
  ['KEEP', 'Backflip on My Trampoline', ['trampoline', 'bounce', 'backflip', 'mat'], 'trampoline'],
  // Medium hero-targets — play surfaces, not existing kings
  ['KEEP', 'Pirate Treasure Chest', ['treasure', 'chest', 'gold', 'map'], 'hero-chest-open'],
  ['KEEP', 'Pack Your Backpack', ['backpack', 'book', 'pencil', 'lunch'], 'hero-backpack-open'],
  ['KEEP', 'Make a Pizza', ['pizza', 'crust', 'topping', 'slice'], 'hero-pizza-base'],
  ['KEEP', 'Feed the Hippo', ['hippo', 'apple', 'hungry', 'mouth'], 'hero-animal-mouth'],
  ['KEEP', 'Open the Fridge', ['fridge', 'milk', 'cold', 'door'], 'hero-fridge-open'],
  ['KEEP', 'Pack a Picnic Basket', ['picnic basket', 'sandwich', 'apple', 'blanket'], 'hero-picnic-basket-open'],
  ['KEEP', 'Clean Up the Toy Box', ['toy box', 'blocks', 'doll', 'car'], 'hero-toy-box-open'],
  ['KEEP', 'Build a Blanket Fort', ['blanket fort', 'pillow', 'flashlight', 'book'], 'hero-blanket-fort-open'],
  ['KEEP', 'Feed the Birdcage', ['birdcage', 'bird', 'seed', 'perch'], 'hero-birdcage-open'],
  ['KEEP', 'Put Away the Toolbox', ['toolbox', 'hammer', 'wrench', 'nail'], 'hero-toolbox-open'],
  // Waves 13–14 — transport / holiday (space/rocket stay soft)
  ['KEEP', 'School Bus Morning', ['school bus', 'door', 'seat', 'backpack'], 'hero-school-bus-door-open'],
  ['KEEP', 'Ambulance Rescue', ['ambulance', 'siren', 'stretcher', 'help'], 'hero-ambulance-back-open'],
  ['KEEP', 'Easter Egg Basket', ['easter basket', 'egg', 'candy', 'spring'], 'hero-easter-basket-open'],
  ['KEEP', 'Beach Cooler Party', ['beach cooler', 'ice', 'soda', 'towel'], 'hero-beach-cooler-tub-open'],
  ['OFF', 'Trip to the Space Station', ['astronaut', 'rocket', 'space', 'planet', 'hatch'], null],
  // Must not steal camping tent / dentist / fruit market / homework
  ['OFF', 'The Cat Ate My Homework', ['homework', 'cat', 'hungry', 'teacher', 'feed'], null],
  // Tent king already exists — hero-tent-open must not steal camping.
  ['OFF', 'Circus Comes to Town', ['tent', 'clown', 'acrobat', 'ticket', 'cave'], null],
  // Bare "cabinet" without school must not steal medicine cabinet; locker needs school.
  ['OFF', 'Office Filing Day', ['file', 'paper', 'folder', 'desk'], null],
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
// Pictured words → fixSentence / oddOneOut / mysteryHints; abstract-only → sortBins.
const offNoHero = { title: 'My Productive Morning Routine', vocabulary: ['alarm', 'routine', 'schedule', 'habit'].map((word) => ({ word })) };
const plan = W.EdbActivities.plan(offNoHero, { level: 'B1', duration: 30 });
const act = (plan.assignments || []).find((a) => a.pageKey === 'activity');
const offOk = act && (act.recipeId === 'sortBins' || act.recipeId === 'mysteryHints'
  || act.recipeId === 'oddOneOut' || act.recipeId === 'fixSentence'
  || act.recipeId === 'thisOrThat');
if (!offOk) {
  console.log(`XX     a vetoed hero must fall to fixSentence/oddOneOut/mysteryHints/sortBins/thisOrThat, got ${act ? act.recipeId : 'no activity'}`);
  failed++;
}

function assertHeroPlan(title, words, heroKey) {
  const planned = W.EdbActivities.plan(
    { title, vocabulary: words.map((word) => ({ word })) },
    { level: 'A1', duration: 30 }
  );
  const act = (planned.assignments || []).find((a) => a.pageKey === 'activity');
  const got = act && act.ctx && act.ctx.hero && act.ctx.hero.key;
  if (!act || act.recipeId !== 'heroProp' || got !== heroKey) {
    console.log(`XX     ${title} activity must be heroProp/${heroKey}, got ${act && act.recipeId}/${got}`);
    failed++;
  }
}
assertHeroPlan('Pirate Treasure Chest', ['treasure', 'chest', 'gold', 'map'], 'hero-chest-open');
assertHeroPlan('Pack Your Backpack', ['backpack', 'book', 'pencil', 'lunch'], 'hero-backpack-open');
assertHeroPlan('Make a Pizza', ['pizza', 'crust', 'topping', 'slice'], 'hero-pizza-base');
assertHeroPlan('Feed the Hippo', ['hippo', 'apple', 'hungry', 'mouth'], 'hero-animal-mouth');
assertHeroPlan('Open the Fridge', ['fridge', 'milk', 'cold', 'door'], 'hero-fridge-open');
assertHeroPlan('Bake Cookies in the Oven', ['oven', 'cookie', 'bake', 'tray'], 'hero-oven-open');
assertHeroPlan('Pack a Picnic Basket', ['picnic basket', 'sandwich', 'apple', 'blanket'], 'hero-picnic-basket-open');
assertHeroPlan('Clean Up the Toy Box', ['toy box', 'blocks', 'doll', 'car'], 'hero-toy-box-open');
assertHeroPlan('School Bus Morning', ['school bus', 'door', 'seat', 'backpack'], 'hero-school-bus-door-open');
assertHeroPlan('Easter Egg Basket', ['easter basket', 'egg', 'candy', 'spring'], 'hero-easter-basket-open');

// TopicIdentity must not expand "chest" into orchestra (mid-token stem bug).
if (W.TopicIdentity && typeof W.TopicIdentity.expandCoreConcepts === 'function') {
  const expanded = W.TopicIdentity.expandCoreConcepts({
    topicId: 'pirate-treasure-chest',
    topicLabel: 'pirate treasure chest',
    titleBits: ['pirate', 'treasure', 'chest'],
    lessonWords: ['treasure', 'chest', 'gold', 'map'],
    parentCategories: [],
  });
  const core = (expanded.core || []).map((c) => String(c).toLowerCase());
  if (core.some((c) => /\borchestra\b/.test(c))) {
    console.log(`XX     pirate expandCoreConcepts must not include orchestra, got ${core.join(', ')}`);
    failed++;
  }
  const cleanCore = W.TopicIdentity.expandCoreConcepts({
    topicId: 'clean-toy-box',
    topicLabel: 'clean toy box',
    titleBits: ['clean', 'toy', 'box'],
    lessonWords: ['toy box', 'blocks', 'doll', 'car'],
    parentCategories: [],
  });
  const cleanWords = (cleanCore.core || []).map((c) => String(c).toLowerCase());
  if (cleanWords.some((c) => /\btooth\b|\bdentist\b|\bfloss\b/.test(c))) {
    console.log(`XX     clean toy box cores must not pull dental pack keys, got ${cleanWords.join(', ')}`);
    failed++;
  }
}

// Cat/homework + star must not claim space kit (title charm / space dock).
const catHw = {
  title: 'The Cat Ate My Homework',
  vocabulary: ['homework', 'cat', 'hungry', 'teacher', 'milk', 'school', 'star'].map((word) => ({ word })),
};
const catKit = W.PropBank.assessKit(catHw);
if (catKit && catKit.ready && (catKit.pack === 'space' || catKit.pack === 'farm' || catKit.pack === 'cafe')) {
  console.log(`XX     cat/homework kit must not be ${catKit.pack}, got ready ${catKit.pack}/${catKit.hero && catKit.hero.key}`);
  failed++;
}
const softCockpit = W.PropBank.get('space-module-blue-a');
if (W.PropBank.isTitleCharmSharp(softCockpit)) {
  console.log('XX     soft space cockpit must fail isTitleCharmSharp');
  failed++;
}
const sharpStar = W.PropBank.get('space-star');
if (!W.PropBank.isTitleCharmSharp(sharpStar)) {
  console.log('XX     sharp space-star cutout must pass isTitleCharmSharp');
  failed++;
}

// Basketball: kit may still bank the hoop; soft-gate must not ship it as king.
const bball = {
  title: 'Playing Basketball with Friends',
  vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
};
const bballKit = W.PropBank.assessKit(bball);
if (bballKit && bballKit.ready && bballKit.pack === 'playground') {
  console.log(`XX     basketball kit must not be playground, got ${bballKit.hero && bballKit.hero.key}`);
  failed++;
}
const bballHero = W.EdbActivities.findHeroProp(bball);
if (bballHero) {
  console.log(`XX     basketball must not ship a hero (hoop deferred), got ${bballHero.key}`);
  failed++;
}
const bballActPlan = W.EdbActivities.plan(
  { title: bball.title, vocabulary: bball.vocabulary.map((v) => ({ word: v.word })) },
  { level: 'A2', duration: 30 }
);
const bballAct = (bballActPlan.assignments || []).find((a) => a.pageKey === 'activity');
// Soft-gated sports: no king. fixSentence wins over oddOneOut when buildable.
if (!bballAct || bballAct.recipeId === 'heroProp'
  || !/^(oddOneOut|fixSentence|thisOrThat|mysteryHints|sortBins|yesNoSort)$/.test(bballAct.recipeId)) {
  console.log(`XX     basketball activity must be non-king formulaic, got ${bballAct && bballAct.recipeId}`);
  failed++;
}
const dentalLesson = {
  title: 'At the Dentist',
  vocabulary: ['tooth', 'floss', 'dentist', 'smile'].map((word) => ({ word })),
};
const dentalHero = W.EdbActivities.findHeroProp(dentalLesson);
if (!dentalHero || dentalHero.key !== 'dental-kid-open-mouth') {
  console.log(`XX     dental must still ship open-mouth hero, got ${dentalHero && dentalHero.key}`);
  failed++;
}
const dentalActPlan = W.EdbActivities.plan(dentalLesson, { level: 'A2', duration: 30 });
const dentalAct = (dentalActPlan.assignments || []).find((a) => a.pageKey === 'activity');
if (!dentalAct || dentalAct.recipeId !== 'heroProp') {
  console.log(`XX     dental activity must be heroProp, got ${dentalAct && dentalAct.recipeId}`);
  failed++;
}
const trampLesson = {
  title: 'Backflip on My Trampoline',
  vocabulary: ['trampoline', 'bounce', 'backflip', 'mat'].map((word) => ({ word })),
};
const trampHero = W.EdbActivities.findHeroProp(trampLesson);
if (!trampHero || trampHero.key !== 'trampoline') {
  console.log(`XX     trampoline must still ship hero, got ${trampHero && trampHero.key}`);
  failed++;
}
const bballFresh = {
  title: 'Playing Basketball with Friends',
  vocabulary: ['ball', 'team', 'score', 'court'].map((word) => ({ word })),
};
const bballPlan = W.VocabArt.planFor(bballFresh);
const bballBall = (bballPlan.rows || []).find((r) => r.word === 'ball');
if (!bballBall || bballBall.propKey === 'soccer-ball' || /soccer/.test(String(bballBall.propKey || ''))) {
  console.log(`XX     basketball VocabArt ball must pin basketball art, got ${bballBall && bballBall.propKey}`);
  failed++;
}
if (bballBall && !/basketball/.test(String(bballBall.propKey || ''))) {
  console.log(`XX     basketball VocabArt ball key should include basketball, got ${bballBall.propKey}`);
  failed++;
}
const yarnBall = W.PropBank.resolve({
  word: 'ball',
  seed: 'Playing Basketball with Friends|They bounce the ball.',
  family: W.PropBank.familyFor(bballFresh),
  minScore: W.PropBank.DEFAULT_MIN_SCORE,
});
if (yarnBall && /yarn|cotton|disco|foil|circus/.test(yarnBall.key)) {
  console.log(`XX     story resolve(ball) must not be yarn/craft, got ${yarnBall.key}`);
  failed++;
}
if (yarnBall && !/basketball/.test(yarnBall.key)) {
  console.log(`XX     story resolve(ball) on basketball lesson should be basketball art, got ${yarnBall.key}`);
  failed++;
}

// Theme lock: resolveTheme is the single source of truth (title+vocab+activity title).
const LT = W.LessonTraits;
if (!LT || typeof LT.resolveTheme !== 'function') {
  console.log('XX     LessonTraits.resolveTheme missing');
  failed++;
} else {
  const themeOf = (title, words, activityTitle) => LT.resolveTheme({
    title,
    vocabulary: words.map((word) => ({ word })),
    activity: activityTitle ? { title: activityTitle } : undefined,
  });
  const catTheme = themeOf('The Cat Ate My Homework', ['homework', 'cat', 'hungry', 'teacher', 'milk', 'school', 'star']);
  if (!catTheme || catTheme.id !== 'none') {
    console.log(`XX     cat/homework resolveTheme must be none, got ${catTheme && catTheme.id}`);
    failed++;
  }
  const bballTheme = themeOf('Playing Basketball with Friends', ['ball', 'team', 'score', 'court']);
  if (!bballTheme || bballTheme.id !== 'sports') {
    console.log(`XX     basketball resolveTheme must be sports, got ${bballTheme && bballTheme.id}`);
    failed++;
  }
  if (!bballTheme || bballTheme.heroKey) {
    console.log(`XX     basketball resolveTheme must have no heroKey (hoop deferred), got ${bballTheme && bballTheme.heroKey}`);
    failed++;
  }
  const circusTheme = themeOf('Circus Comes to Town', ['tent', 'clown', 'acrobat', 'happy']);
  if (!circusTheme || circusTheme.id !== 'circus' || circusTheme.heroKey) {
    console.log(`XX     circus resolveTheme must be circus with no hero, got ${circusTheme && circusTheme.id}/${circusTheme && circusTheme.heroKey}`);
    failed++;
  }
  // sampleAnswer must not steal theme (activity title only — never warm-up prose).
  const stolen = LT.resolveTheme({
    title: 'Pets at Home',
    vocabulary: [{ word: 'cat' }, { word: 'dog' }],
    warmUp: { sampleAnswer: 'We flew a rocket to the space station on Mars.' },
  });
  if (stolen && stolen.id === 'space') {
    console.log('XX     sampleAnswer must not lock space theme');
    failed++;
  }
  const feelTheme = themeOf('Talking About Feelings', ['happy', 'sad', 'worried', 'proud']);
  if (!feelTheme || feelTheme.id !== 'feelings' || feelTheme.heroKey !== 'face-blank') {
    console.log(`XX     feelings resolveTheme must pin face-blank, got ${feelTheme && feelTheme.id}/${feelTheme && feelTheme.heroKey}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} hero-theme case(s) FAILED`);
  process.exit(1);
}
console.log(`\nOK hero theme honesty — ${CASES.length} cases + sortBins fallback + title-charm sharpness + basketball soft-gate + resolveTheme lock`);
