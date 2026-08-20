/**
 * Theme lock — adversarial resolveTheme + picker honesty.
 *
 *   npm run test:theme-lock
 *
 * One lesson → one theme (or none) from title + vocab + activity title.
 * assessKit / findHeroProp / title charm must stay inside that theme's packs
 * or fall to empty (sortBins / no soft charm). Subsumes cat≠space,
 * basketball≠playground, circus≠face-on-happy pair-vetoes.
 *
 * Loop: fail loud on any regression; do not add one-off pack vetoes here —
 * fix LessonTraits.resolveTheme (or pack allow-list wiring) instead.
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
      width: 0, height: 0,
      getContext: () => new Proxy({}, { get: () => () => {} }),
      toDataURL: () => 'x',
    }),
  },
};
vm.createContext(sandbox);
for (const rel of [
  'public/lib/topicIdentity.js',
  'public/lib/producerQuality.js',
  'public/lib/propBank.js', 'public/lib/vocabIcons.js', 'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js', 'public/lib/edbLayout.js', 'public/lib/edbActivities.js',
  'public/lib/boardReadiness.js', 'public/lib/coloringOutlines.js',
  'public/lib/sceneBackgrounds.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

function lesson(title, words, activityTitle) {
  return {
    title,
    vocabulary: words.map((word) => ({ word })),
    activity: activityTitle ? { title: activityTitle } : undefined,
  };
}

let failed = 0;
function check(ok, msg) {
  if (!ok) {
    console.log('XX  ' + msg);
    failed++;
  } else {
    console.log('OK  ' + msg);
  }
}

const LT = W.LessonTraits;
check(typeof LT.resolveTheme === 'function', 'resolveTheme exported');

// --- resolveTheme id / heroKey ------------------------------------------------
const cases = [
  ['none', 'The Cat Ate My Homework', ['homework', 'cat', 'hungry', 'teacher', 'milk', 'school', 'star'], null],
  ['none', 'Pet Day at School', ['cat', 'dog', 'pet', 'homework'], null],
  ['none', 'Fruit Market', ['apple', 'banana', 'carrot', 'tomato', 'lemon', 'grape'], null],
  ['sports', 'Playing Basketball with Friends', ['ball', 'team', 'score', 'court'], null],
  ['circus', 'Circus Clown Show', ['clown', 'tent', 'happy', 'ticket'], null],
  ['circus', 'Circus Comes to Town', ['tent', 'clown', 'acrobat', 'ticket'], null],
  ['dental', 'At the Dentist', ['tooth', 'floss', 'dentist', 'smile'], 'dental-kid-open-mouth'],
  ['feelings', 'Talking About Feelings', ['happy', 'sad', 'worried', 'proud'], 'face-blank'],
  ['cafe', 'At the Cafe', ['coffee', 'cake', 'menu', 'barista'], 'cafe-counter-stage'],
  ['farm', 'Day on the Farm', ['barn', 'tractor', 'cow', 'farm'], 'farm-barn'],
  ['space', 'Trip to the Space Station', ['astronaut', 'rocket', 'space', 'planet'], null],
  ['playground', 'At the Playground', ['slide', 'swing', 'seesaw', 'playground'], 'playground-slide'],
  ['beach', 'Sandcastle Competition', ['sand', 'castle', 'bucket', 'beach'], 'beach-sandcastle'],
  ['bathroom', 'Bathroom Objects', ['toothbrush', 'towel', 'mirror', 'soap'], 'bath-bathtub'],
  ['kitchen', 'Washing Up After Dinner', ['plate', 'sponge', 'sink', 'dry'], 'bath-sink'],
  ['kitchen', 'In the Kitchen', ['spatula', 'pan', 'chef', 'oven'], null],
  ['trampoline', 'Backflip on My Trampoline', ['trampoline', 'bounce', 'backflip', 'mat'], 'trampoline'],
];

console.log('\n--- resolveTheme ---');
for (const [wantId, title, words, wantHero] of cases) {
  const L = lesson(title, words);
  const t = LT.resolveTheme(L);
  check(t.id === wantId, `theme ${wantId}: "${title}" → ${t.id}`);
  check(
    (t.heroKey || null) === (wantHero || null),
    `heroKey ${wantHero || '—'}: "${title}" → ${t.heroKey || '—'}`,
  );
}

// sampleAnswer must not steal theme (bus in answer ≠ vehicles / cat stays none-ish animals for coloring)
const catSample = {
  title: 'The Cat Ate My Homework',
  vocabulary: [{ word: 'homework' }, { word: 'cat' }],
  warmUp: { sampleAnswer: 'I rode the bus to the space station farm cafe.' },
};
const catTheme = LT.resolveTheme(catSample);
check(catTheme.id === 'none', 'sampleAnswer ignored: cat+homework → none (not space/farm/cafe)');

// --- assessKit / findHero -----------------------------------------------------
console.log('\n--- pickers ---');
const catHw = lesson('The Cat Ate My Homework', ['homework', 'cat', 'hungry', 'teacher', 'milk', 'school', 'star']);
const catKit = W.PropBank.assessKit(catHw);
check(!catKit || !catKit.ready, 'cat/homework: no ready kit');
check(
  !catKit || !['space', 'farm', 'cafe'].includes(catKit.pack),
  `cat/homework: kit pack not space/farm/cafe (got ${catKit && catKit.pack})`,
);
check(!W.EdbActivities.findHeroProp(catHw), 'cat/homework: no hero');

const bball = lesson('Playing Basketball with Friends', ['ball', 'team', 'score', 'court']);
const bballKit = W.PropBank.assessKit(bball);
check(!bballKit || bballKit.pack !== 'playground', 'basketball: kit not playground');
check(bballKit && bballKit.ready, `basketball: ready kit (got ${bballKit && bballKit.ready})`);
check(
  bballKit && bballKit.hero && bballKit.hero.key === 'basketball-hoop-stage',
  `basketball kit still banks hoop-stage (got ${bballKit && bballKit.hero && bballKit.hero.key})`,
);
check(!W.EdbActivities.findHeroProp(bball), 'basketball: no shippable hero (hoop deferred)');
const bballPlan = W.EdbActivities.plan(bball, { level: 'A2', duration: 30 });
const bballAct = (bballPlan.assignments || []).find((a) => a.pageKey === 'activity');
check(bballAct && bballAct.recipeId !== 'heroProp', `basketball activity not heroProp (got ${bballAct && bballAct.recipeId})`);
check(
  bballAct && ['fixSentence', 'oddOneOut', 'thisOrThat', 'mysteryHints', 'sortBins'].includes(bballAct.recipeId),
  `basketball activity formulaic (got ${bballAct && bballAct.recipeId})`
);


const circusHappy = lesson('Circus Clown Show', ['clown', 'tent', 'happy', 'ticket']);
const circusHero = W.EdbActivities.findHeroProp(circusHappy);
check(!circusHero, `circus+happy: no face-blank king (got ${circusHero && circusHero.key})`);
check(LT.resolveTheme(circusHappy).id === 'circus', 'circus+happy: theme=circus');

const fruit = lesson('Fruit Market', ['apple', 'banana', 'carrot', 'tomato']);
check(!W.EdbActivities.findHeroProp(fruit), 'fruit: no cafe/farm king');
check(!W.PropBank.assessKit(fruit) || !W.PropBank.assessKit(fruit).ready, 'fruit: no ready kit');

const dental = lesson('At the Dentist', ['tooth', 'floss', 'dentist', 'smile']);
check(W.EdbActivities.findHeroProp(dental)?.key === 'dental-kid-open-mouth', 'dental: open-mouth hero');
const dentalKit = W.PropBank.assessKit(dental);
check(dentalKit && dentalKit.ready, `dental: ready kit (got ${dentalKit && dentalKit.ready})`);
check(dentalKit && dentalKit.hero && dentalKit.hero.key === 'dental-kid-open-mouth', `dental kit hero open-mouth (got ${dentalKit && dentalKit.hero && dentalKit.hero.key})`);
check(dentalKit && (dentalKit.pack === 'dental' || dentalKit.pack === 'dentist'), `dental kit pack dental (got ${dentalKit && dentalKit.pack})`);

const feelings = lesson('Talking About Feelings', ['happy', 'sad', 'worried', 'proud']);
check(W.EdbActivities.findHeroProp(feelings)?.key === 'face-blank', 'feelings: face-blank hero');
const feelKit = W.PropBank.assessKit(feelings);
check(feelKit && feelKit.ready, `feelings: ready kit (got ${feelKit && feelKit.ready})`);
check(feelKit && feelKit.hero && feelKit.hero.key === 'face-blank', `feelings kit hero face-blank (got ${feelKit && feelKit.hero && feelKit.hero.key})`);

const tramp = lesson('Backflip on My Trampoline', ['trampoline', 'bounce', 'backflip', 'mat']);
check(W.EdbActivities.findHeroProp(tramp)?.key === 'trampoline', 'trampoline: hero');
const trampKit = W.PropBank.assessKit(tramp);
check(trampKit && trampKit.ready, `trampoline: ready kit (got ${trampKit && trampKit.ready})`);
check(trampKit && trampKit.hero && trampKit.hero.key === 'trampoline', `trampoline kit hero (got ${trampKit && trampKit.hero && trampKit.hero.key})`);

const wash = lesson('Washing Up After Dinner', ['plate', 'sponge', 'sink', 'dry']);
check(LT.resolveTheme(wash).id === 'kitchen', 'wash-up theme=kitchen');
check(W.EdbActivities.findHeroProp(wash)?.key === 'bath-sink', 'wash-up hero bath-sink');
const washKit = W.PropBank.assessKit(wash);
check(washKit && washKit.ready, `wash-up ready kit (got ${washKit && washKit.ready})`);
check(washKit && washKit.hero && washKit.hero.key === 'bath-sink', `wash-up kit hero bath-sink (got ${washKit && washKit.hero && washKit.hero.key})`);
const cook = lesson('In the Kitchen', ['spatula', 'pan', 'chef', 'oven']);
check(LT.resolveTheme(cook).id === 'kitchen', 'cook theme=kitchen');
check(!W.EdbActivities.findHeroProp(cook), 'cook: no bath-sink king');
const cookKit = W.PropBank.assessKit(cook);
check(!cookKit || !cookKit.ready || (cookKit.hero && cookKit.hero.key !== 'bath-sink'), 'cook: kit does not ready bath-sink');

const museum = lesson('Going to the Museum', ['quiet', 'look', 'interesting']);
check(LT.resolveTheme(museum).id === 'museum', 'museum theme=museum');
check(!W.EdbActivities.findHeroProp(museum), 'museum: no king');
{
  delete museum._vocabAdapted;
  const adapted = W.VocabArt.adaptBoardVocabulary(museum, { seed: museum.title });
  check(adapted.boardCount >= 4, `museum adapt boardCount≥4 (got ${adapted.boardCount})`);
  check(adapted.pictured >= 4, `museum adapt pictured≥4 (got ${adapted.pictured})`);
  const bakeArt = W.VocabArt.planFor(museum, { seed: museum.title, allowPackFallback: true });
  const withArt = (bakeArt.rows || []).filter((r) => r.tier === 'pack' || r.tier === 'prop' || r.tier === 'glyph');
  check(withArt.length >= 4, `museum bake pack art ≥4 (got ${withArt.length})`);
}

// VocabArt ball pin (fresh lesson — plan() mutates vocabulary for bake)
const art = W.VocabArt.planFor(
  lesson('Playing Basketball with Friends', ['ball', 'team', 'score', 'court'])
);
const ballRow = (art.rows || []).find((r) => r.word === 'ball');
check(ballRow && /basketball/.test(String(ballRow.propKey || '')), `VocabArt ball→basketball (got ${ballRow && ballRow.propKey})`);
check(ballRow && !/soccer|yarn/.test(String(ballRow.propKey || '')), 'VocabArt ball≠soccer/yarn');

// Cover charm: theme-data prefer / empty (render reads themeOf — no topic ifs)
console.log('\n--- cover charm (theme data) ---');
const spaceCharm = LT.resolveTheme(lesson('Trip to the Space Station', ['astronaut', 'rocket', 'space', 'planet']));
check(spaceCharm.id === 'space', `space charm theme (got ${spaceCharm.id})`);
check(
  Array.isArray(spaceCharm.charmPrefer) && spaceCharm.charmPrefer.some((k) => /rocket|spacesuit|astronaut/.test(k)),
  `space charmPrefer rocket/suit (got ${(spaceCharm.charmPrefer || []).slice(0, 3).join(',')})`,
);
check(!spaceCharm.charmEmpty, 'space not charmEmpty');
const preferHit = (spaceCharm.charmPrefer || [])
  .map((k) => W.PropBank.get(k))
  .find((p) => p && p.path && p.dockSafe !== false && W.PropBank.isTitleCharmSharp(p));
check(!!preferHit, `space charmPrefer resolves sharp dock (got ${preferHit && preferHit.key})`);

const musicCharm = LT.resolveTheme(lesson('Classical Concert Night', ['orchestra', 'symphony', 'piano', 'melody']));
check(musicCharm.id === 'music', `music theme (got ${musicCharm.id})`);
check(musicCharm.charmEmpty === true, 'music charmEmpty');
check(musicCharm.charmPrefer == null, 'music has no charmPrefer');

const museumCharm = LT.resolveTheme(lesson('Going to the Museum', ['quiet', 'look', 'interesting']));
check(museumCharm.id === 'museum', `museum theme (got ${museumCharm.id})`);
check(museumCharm.charmEmpty === true, 'museum charmEmpty');

const kitchenCharm = LT.resolveTheme(lesson('In the Kitchen', ['spatula', 'pan', 'chef', 'oven']));
check(kitchenCharm.id === 'kitchen', `kitchen theme (got ${kitchenCharm.id})`);
check(
  Array.isArray(kitchenCharm.charmPrefer) && kitchenCharm.charmPrefer.length > 0,
  `kitchen charmPrefer list (got ${(kitchenCharm.charmPrefer || []).join(',')})`,
);
check(typeof LT.themeOf === 'function', 'themeOf exported');
check(LT.THEME_NONE && LT.THEME_NONE.charmEmpty === true, 'THEME_NONE.charmEmpty');
check(
  LT.CHARM_BAN_SPORTS && typeof LT.CHARM_BAN_SPORTS.test === 'function',
  'CHARM_BAN_SPORTS exported',
);

// Title charm sharpness still applies; cat must not soft-charm a cockpit
const softCockpit = W.PropBank.get('space-module-blue-a');
check(!W.PropBank.isTitleCharmSharp(softCockpit), 'soft cockpit fails isTitleCharmSharp');

// Coloring: basketball → sports SVG, not vehicles/nature
const CO = W.ColoringOutlines;
const bballOut = CO.forLesson(bball, { level: 'A1' });
check(bballOut && bballOut.id === 'sports', `coloring basketball → sports (got ${bballOut && bballOut.id})`);
check(bballOut && bballOut.id !== 'vehicles' && bballOut.id !== 'nature', 'coloring basketball not vehicles/nature');
check(bballOut && /Basketball outline/.test(bballOut.html || ''), 'coloring basketball uses basketball SVG');

// Soccer coloring ≠ basketball; BG set ≠ gym-cool
const soccerLesson = {
  title: 'Soccer Time',
  vocabulary: [{ word: 'ball' }, { word: 'goal' }, { word: 'team' }, { word: 'kick' }, { word: 'coach' }, { word: 'game' }],
};
const soccerOut = CO.forLesson(soccerLesson, { level: 'A1' });
check(soccerOut && /Soccer ball outline/.test(soccerOut.html || ''), 'coloring soccer uses soccer SVG');
check(soccerOut && !/Basketball outline/.test(soccerOut.html || ''), 'coloring soccer ≠ basketball SVG');
const SB = W.SceneBackgrounds;
if (SB && typeof SB.setFor === 'function') {
  check(SB.setFor('Soccer Time ball goal kick coach') === 'soccer-fresh', 'soccer BG → soccer-fresh');
  check(SB.setFor('Basketball Practice hoop court') === 'gym-cool', 'basketball BG → gym-cool');
  // Bare sports/games titles use gym-cool washes (not anonymous house) — Sports
  // and Games board chrome. Soccer/pitch still wins outdoor-fresh above.
  check(SB.setFor('Going to space rocket astronaut') === 'space-cool', 'space BG → space-cool');
  check(SB.setFor('I live next to a volcano lava ash') === 'volcano-cool', 'volcano BG → volcano-cool');
  check(SB.setFor('Sports and Active Play team medal') === 'gym-cool', 'bare sports BG → gym-cool');
  check(SB.setFor('Day at the Park picnic') === 'outdoor-fresh', 'park picnic stays outdoor-fresh');
  check(SB.setFor('Sea Animals shark dolphin whale') === 'aquarium-cool', 'sea animals BG → aquarium-cool (not outdoor)');
  check(SB.setFor('Sharks') === 'aquarium-cool', 'bare sharks BG → aquarium-cool');
  check(SB.setFor('Sea Animals shark swim ocean fish') === 'aquarium-cool', 'sea animals + swim stays aquarium (not pool)');
  check(SB.setFor('Day at the Beach shells') === 'beach-warm', 'beach still beach-warm');
  check(typeof SB.densityClassFor === 'function', 'densityClassFor exported');
  if (typeof SB.densityClassFor === 'function') {
    check(SB.densityClassFor({ tags: ['vocabulary'], preferFlat: true }) === 'quiet', 'vocab density → quiet');
    check(SB.densityClassFor({ tags: ['title'] }) === 'expressive', 'title density → expressive');
    check(SB.densityClassFor({ tags: ['activity'] }) === 'work', 'activity density → work');
    check(SB.densityClassFor({ tags: ['wrap'] }) === 'close', 'wrap density → close');
  }
  // Ball-card lessons must not land gym-b basketball chrome (reads as unlabeled twin).
  check(SB.topicHasBallFamily('Playing Basketball with Friends ball team score'),
    'topicHasBallFamily detects ball word');
  check(!SB.topicHasBallFamily('Feelings Check-in happy sad'),
    'topicHasBallFamily ignores non-ball lessons');
  const gymM = await SB.manifest();
  check(
    SB.flatChromeMotifs(gymM.flats['gym-b']).includes('ball'),
    'gym-b declares ball chromeMotif'
  );
  const bballSecs = [
    { title: 'Playing Basketball with Friends', tags: ['title', 'basketball'], preferFlat: true },
    { title: 'Warm', tags: ['warmup'], preferFlat: true },
    { title: 'Words', tags: ['vocabulary'], preferFlat: true },
    { title: 'Story', tags: ['story'], preferFlat: true },
    { title: 'Activity', tags: ['activity'], preferFlat: true },
    { title: 'Wrap', tags: ['wrap'], preferFlat: true },
  ];
  const bballPicks = await SB.planFor(bballSecs, {
    seed: 'Playing Basketball with Friends',
    topicWords: 'Playing Basketball with Friends ball team score basketball friends',
  });
  const ballChromeHits = (bballPicks || []).filter((p) => p && p.name === 'gym-b');
  check(
    ballChromeHits.length === 0,
    `basketball lesson avoids gym-b ball chrome (got ${(bballPicks || []).map((p) => p.name).join(',')})`
  );
  const actPick = bballPicks && bballPicks[4];
  check(
    actPick && actPick.set === 'gym-cool' && actPick.name !== 'gym-b',
    `activity stays gym-cool without ball chrome (got ${actPick && actPick.name})`
  );
  // Soccer/pitch must not land picnic-blanket outdoor-b (reads as park picnic, not pitch).
  check(SB.topicIsSoccerPitch('Soccer Practice with Coach ball goal'),
    'topicIsSoccerPitch detects soccer');
  check(
    SB.flatChromeMotifs(gymM.flats['outdoor-b']).includes('picnic'),
    'outdoor-b declares picnic chromeMotif'
  );
  const soccerSecs = [
    { title: 'Soccer Practice with Coach', tags: ['title', 'soccer'], preferFlat: true },
    { title: 'Warm', tags: ['warmup'], preferFlat: true },
    { title: 'Words', tags: ['vocabulary'], preferFlat: true },
    { title: 'Story', tags: ['story'], preferFlat: true },
    { title: 'Activity', tags: ['activity'], preferFlat: true },
    { title: 'Wrap', tags: ['wrap'], preferFlat: true },
  ];
  const soccerPicks = await SB.planFor(soccerSecs, {
    seed: 'Soccer Practice with Coach',
    topicWords: 'Soccer Practice with Coach ball goal kick whistle coach',
  });
  const soccerSets = [...new Set((soccerPicks || []).filter((p) => p && p.set && p.set !== 'board-house').map((p) => p.set))];
  check(
    soccerSets.length === 1 && soccerSets[0] === 'soccer-fresh',
    `soccer bookends lock soccer-fresh (got ${soccerSets.join(',')}; picks=${(soccerPicks || []).map((p) => p.name).join(',')})`
  );
  const picnicHits = (soccerPicks || []).filter((p) => p && (p.name === 'outdoor-b' || /picnic/i.test(p.reason || '')));
  check(
    picnicHits.length === 0,
    `soccer lesson avoids picnic chrome (got ${(soccerPicks || []).map((p) => p.name).join(',')})`
  );
}

// Sense lock: game.png controller must not teach soccer "game"
const soccerArt = W.VocabArt.planFor(soccerLesson, { seed: soccerLesson.title });
const gameRow = (soccerArt.rows || []).find((r) => r.word === 'game');
check(
  !gameRow || gameRow.tier === 'none' || !(gameRow.artSrc || '').match(/game\.png/i),
  `soccer "game" must not be controller pack (got ${gameRow && gameRow.tier} ${gameRow && gameRow.artSrc})`
);

// night sky alias
const nightPath = W.VocabIcons.pathForSync && W.VocabIcons.pathForSync('night sky');
check(nightPath && /night-sky/.test(nightPath), `night sky alias → night-sky (got ${nightPath})`);

// Spaced lesson words → hyphen pack keys (false Coverage@Demand gaps)
for (const [word, needle] of [
  ['pet food', 'pet-food'],
  ['brush teeth', 'brush-teeth'],
  ['fairy tale', 'fairy-tale'],
  ['waiting room', 'waiting-room'],
]) {
  const p = W.VocabIcons.pathForSync && W.VocabIcons.pathForSync(word);
  check(p && p.includes(needle), `hyphen bridge "${word}" → ${needle} (got ${p})`);
}

// Pack-head + preferredPacks: place noun / polyseme pick the theme kit
const circusSeed = 'Circus Comes to Town|clown tent acrobat ticket';
const circusPacks = ['circus'];
const circusProp = W.PropBank.resolve({
  word: 'circus', seed: circusSeed, allowUnthemedIdentity: true, preferredPacks: circusPacks,
});
check(circusProp && circusProp.pack === 'circus', `pack-head circus → circus pack (got ${circusProp && circusProp.key})`);
const tentProp = W.PropBank.resolve({
  word: 'tent', seed: circusSeed, allowUnthemedIdentity: true, preferredPacks: circusPacks,
});
check(tentProp && tentProp.key === 'circus-tent', `themed band tent→circus-tent (got ${tentProp && tentProp.key})`);
const campTent = W.PropBank.resolve({
  word: 'tent', seed: 'Camping Weekend|campfire backpack trail', preferredPacks: ['camping'],
  allowUnthemedIdentity: true,
});
check(
  campTent && campTent.key !== 'circus-tent',
  `camp tent ≠ circus-tent (got ${campTent && campTent.key})`,
);
const beetleProp = W.PropBank.resolve({
  word: 'beetle', seed: 'Bugs and Beetles', allowUnthemedIdentity: true,
});
check(
  beetleProp && (beetleProp.key === 'beetle' || beetleProp.key === 's60-beetle'),
  `s60-prefix beetle resolves (got ${beetleProp && beetleProp.key})`,
);
const cleanPath = W.VocabIcons.pathForSync && W.VocabIcons.pathForSync('clean');
check(
  cleanPath && /clean-tooth\.png$/.test(cleanPath),
  `clean → clean-tooth pack (got ${cleanPath})`,
);
// sortBins fallback when theme none / no hero
const plan = W.EdbActivities.plan(catHw, { level: 'B1', duration: 30 });
const act = (plan.assignments || []).find((a) => a.pageKey === 'activity');
check(act && act.recipeId !== 'heroProp', `theme-none activity not heroProp (got ${act && act.recipeId})`);
check(
  act && ['fixSentence', 'oddOneOut', 'thisOrThat', 'mysteryHints', 'sortBins'].includes(act.recipeId),
  `theme-none activity formulaic (got ${act && act.recipeId})`
);

// White-plate densify cutouts must not pass dock sharpness (Sports Arena boxes).
const plate = W.PropBank.get && W.PropBank.get('sport-cone');
check(plate && plate.dockSafe === false, 'sport-cone dockSafe false (white plate)');
check(plate && !W.PropBank.isDockSharp(plate), 'sport-cone fails isDockSharp');
const cleanCone = W.PropBank.get && W.PropBank.get('sports-cone');
check(cleanCone && W.PropBank.isDockSharp(cleanCone), 'sports-cone still dock-sharp');

if (failed) {
  console.error(`\n${failed} theme-lock case(s) FAILED`);
  process.exit(1);
}
console.log(`\nOK theme lock — resolveTheme + pickers + coloring + night-sky`);
