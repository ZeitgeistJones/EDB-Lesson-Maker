/**
 * Board grammar regressions: explicit action-led grammars must validate, win
 * the activity slot, render their visual contract, and fail closed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

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

function fakeCanvas() {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    setLineDash() {},
    fillRect() {},
    strokeRect() {},
    fillText() {},
    ellipse() {},
    measureText: (text) => ({ width: String(text || '').length * 12 }),
  };
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,AA==',
  };
}

const sandbox = {
  window: {},
  console,
  fetch: fileFetch,
  document: { createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}) },
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const rel of [
  'public/lib/propBank.js',
  'public/lib/vocabIcons.js',
  'public/lib/vocabArt.js',
  'public/lib/lessonTraits.js',
  'public/lib/edbLayout.js',
  'public/lib/edbActivities.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

const W = sandbox.window;
await W.PropBank.ready();
await W.VocabIcons.ready();

function lesson(title, boardArchetype, payloadKey, payload) {
  return {
    title,
    warmUp: { question: 'What do you already know?', sampleAnswer: 'A little.' },
    vocabulary: ['apple', 'banana', 'carrot', 'milk', 'book', 'bus'].map((word) => ({
      word,
      sentence: `I see ${word}.`,
    })),
    sentenceFrames: [],
    story: {
      title: 'A Short Mission',
      pages: [
        { heading: 'First', text: 'Mia checks the plan.', visualTheme: 'school', visualCaption: 'Mia checks a plan' },
        { heading: 'Next', text: 'Mia packs the bag.', visualTheme: 'school', visualCaption: 'Mia packs a bag' },
        { heading: 'Last', text: 'Mia gets on the bus.', visualTheme: 'city', visualCaption: 'Mia gets on a bus' },
      ],
      comprehensionQuestions: [
        { question: 'What does Mia check?', sampleAnswer: 'The plan.' },
        { question: 'Where does Mia go?', sampleAnswer: 'To the bus.' },
      ],
      creativeQuestions: [],
    },
    speakingQuestions: [{ question: 'What would you choose?', sampleAnswer: 'I would choose the book.' }],
    activity: {
      title: 'Mission board',
      prompt: 'Build the answer on the board.',
      templates: ['I chose ___ because ___.'],
      boardArchetype,
      [payloadKey]: payload,
    },
    reviewSentences: ['Mia checks the plan.'],
  };
}

function activityFor(input, meta = { level: 'B1', duration: 30 }) {
  const plan = W.EdbActivities.buildBoardPlan(input, meta);
  const assignment = plan.assignments.find((a) => a.pageKey === 'activity');
  const page = plan.pages.find((p) => p.pageKey === 'activity');
  return { plan, assignment, page };
}

const cases = [
  {
    id: 'sceneRepair',
    payloadKey: 'sceneRepair',
    payload: {
      slotLabel: 'Fruit market basket',
      wrongWord: 'carrot',
      correctWord: 'apple',
      distractors: ['banana', 'milk'],
    },
    roles: [
      'sceneRepairStage',
      'sceneRepairDestination',
      'sceneRepairWrong',
      'sceneRepairDockLabel',
      'sceneRepairPart',
    ],
    singleRepair: true,
  },
  {
    id: 'capacityPack',
    payloadKey: 'capacityPack',
    payload: {
      mission: 'Pack exactly three useful things for a school trip.',
      constraint: 'The bus leaves early and you must record one new fact.',
      containerLabel: 'Trip pack',
      payoff: 'Ready to report',
      limit: 3,
      options: ['book', 'milk', 'apple', 'banana', 'bus'],
      mustInclude: ['book'],
    },
    roles: [
      'capacityScene', 'capacityMission', 'capacityLanguageFrame', 'capacityStateLadder',
      'capacityContainer', 'capacitySlot', 'capacityPayoff', 'capacityChoice',
    ],
  },
  {
    id: 'routeMission',
    payloadKey: 'routeMission',
    payload: {
      mission: 'Help Mia reach the bus.',
      mover: 'Mia',
      goal: 'Bus',
      steps: ['Check the plan', 'Pack the bag', 'Get on the bus'],
      landmarks: ['Plan', 'Bag', 'Bus'],
      orderEvidence: [
        'You must check the plan before packing the right bag.',
        'You must pack the bag before getting on the bus.',
      ],
      answerOrder: ['Check the plan', 'Pack the bag', 'Get on the bus'],
    },
    roles: ['routeMissionBrief', 'routePath', 'routeStep', 'routeTile', 'routeAnswerCover'],
  },
  {
    id: 'transformationLab',
    payloadKey: 'transformationLab',
    payload: {
      question: 'What change keeps the apple fresh?',
      before: 'The apple is cut and warm.',
      changes: ['Put it in a cool box', 'Leave it in the sun', 'Add hot water'],
      correctChange: 'Put it in a cool box',
      after: 'The apple stays cool and fresh.',
    },
    roles: ['transformationState', 'transformationChangeSlot', 'transformationChange', 'transformationResultCover'],
  },
  {
    id: 'evidenceBoard',
    payloadKey: 'evidenceBoard',
    payload: {
      claim: 'The bus is the best way to reach school today.',
      evidence: [
        {
          text: 'The next bus arrives in three minutes.',
          source: 'Live bus tracker',
          artifactExcerpt: '08:12 — Route 5 arrives in 3 min',
          relation: 'supports',
          rationale: 'It is current, direct timing evidence.',
          claimImpact: 'A bus arriving soon makes the bus a practical choice.',
          strength: 3,
        },
        {
          text: 'The bus stop is beside the school gate.',
          source: 'School route map',
          artifactExcerpt: 'Stop S4 — School Gate',
          relation: 'supports',
          rationale: 'It clearly shows the route is convenient.',
          claimImpact: 'A stop at the gate strengthens the convenience claim.',
          strength: 2,
        },
        {
          text: 'Roadworks may delay buses by fifteen minutes.',
          source: 'Traffic alert',
          artifactExcerpt: '08:05 — delays up to 15 minutes',
          relation: 'qualifies',
          rationale: 'It is an official current alert.',
          claimImpact: 'A long delay limits the claim that the bus is best today.',
          strength: 4,
        },
      ],
      conclusion: 'The official delay alert is strongest, so the bus may not be best today.',
    },
    roles: [
      'evidenceCaseFile',
      'evidenceClaim',
      'evidenceReasoningFrame',
      'evidenceRankSlot',
      'evidenceCard',
      'evidenceConclusionCover',
    ],
  },
];

for (const c of cases) {
  const input = lesson(`Explicit ${c.id}`, c.id, c.payloadKey, c.payload);
  const { assignment, page } = activityFor(input);
  assert.equal(assignment && assignment.recipeId, c.id, `${c.id} must win the activity slot`);
  assert(page.notes.includes(`recipe:${c.id}`), `${c.id} must mark its rendered page`);
  const roles = new Set([...page.locked, ...page.unlocked].map((piece) => piece.role));
  for (const role of c.roles) {
    assert(roles.has(role), `${c.id} must render ${role}`);
  }
  const choiceRoles = new Set([
    'sceneRepairPart',
    'capacityChoice',
    'routeTile',
    'transformationChange',
    'evidenceCard',
  ]);
  const choices = page.unlocked.filter((piece) => choiceRoles.has(piece.role));
  if (c.singleRepair) {
    assert.equal(choices.length, 1, 'sceneRepair must expose exactly one defensible replacement');
    assert.equal(choices[0].meta && choices[0].meta.word, c.payload.correctWord,
      'sceneRepair dock must contain only the authored correct replacement');
    const stage = page.locked.find((piece) => piece.role === 'sceneRepairStage');
    assert(stage && stage.w >= 1000 && stage.h >= 200,
      'sceneRepair must render a scene-first stage across the activity bay');
    assert(page.notes.includes('sceneRepairUniqueFit:1'),
      'sceneRepair must mark the one-hole/one-fit contract');
  } else {
    assert(choices.length >= 2, `${c.id} must expose multiple meaningful choices`);
  }
  assert(choices.every((piece) => piece.w >= 64 && piece.h >= 64),
    `${c.id} choice pieces must meet the 64px grab floor`);
  if (c.id === 'routeMission') {
    const pathPiece = page.locked.find((piece) => piece.role === 'routePath');
    assert.equal(pathPiece?.meta?.persistent, true,
      'routeMission must retain a connected route after cards are placed');
    assert.equal(pathPiece?.meta?.mover, 'Mia',
      'routeMission must name the mover on the visible route');
    assert.equal(pathPiece?.meta?.goal, 'Bus',
      'routeMission must name the destination at FINISH');
    const checkpoints = page.locked.filter((piece) => piece.role === 'routeStep');
    assert(checkpoints[0]?.meta?.start, 'routeMission must mark START');
    assert(checkpoints.at(-1)?.meta?.finish, 'routeMission must mark FINISH');
    assert(checkpoints.every((piece) => !piece.meta?.landmark),
      'empty route checkpoints must not leak the ordered landmark answers');
    assert(checkpoints.every((piece) => piece.meta?.routeSegment),
      'every route checkpoint must map to a persistent route segment');
    const completion = page.locked.find((piece) => piece.role === 'routeAnswer');
    assert.equal(completion?.meta?.completionState, true,
      'routeMission peek must reveal an explicit completed route state');
    assert.equal(completion?.meta?.orderEvidence?.length, 2,
      'routeMission reveal must retain dependency evidence for every transition');
    assert.deepEqual(Array.from(pathPiece?.meta?.stateContract || []), ['empty', 'placed', 'revealed'],
      'routeMission must declare empty, placed, and revealed interaction states');
    const routeTiles = page.unlocked.filter((piece) => piece.role === 'routeTile');
    assert(routeTiles.every((piece) =>
      piece.kind === 'image' && piece.meta?.visualAnchor && piece.meta?.landmark
    ), 'routeMission cards must carry concrete visual anchors');
    assert.equal(
      Array.from(routeTiles, (piece) => piece.meta.landmark).sort().join('|'),
      ['Plan', 'Bag', 'Bus'].sort().join('|'),
      'routeMission must preserve one landmark on each shuffled step card'
    );
  }
  if (c.id === 'capacityPack') {
    const scene = page.locked.find((piece) => piece.role === 'capacityScene');
    assert(scene && scene.meta && scene.meta.integrated === true,
      'capacityPack must host mission + pack in one integrated scene shell (no disconnected panels)');
    const ladder = page.locked.find((piece) => piece.role === 'capacityStateLadder');
    assert(ladder && Array.isArray(ladder.meta?.states) &&
      ladder.meta.states.join('|') === 'empty|filling|committed',
      'capacityPack must prove the empty→filling→committed lifecycle in the single bake');
    assert(ladder.meta.payoff, 'capacityPack state ladder must name the topic-relevant payoff');
    const frame = page.locked.find((piece) => piece.role === 'capacityLanguageFrame');
    assert(frame && frame.meta?.includeFrame && frame.meta?.excludeFrame && frame.meta?.teacherCheck === true,
      'capacityPack must render reusable inclusion/exclusion frames with a teacher-confirmation check');
    const payoffBanner = page.locked.find((piece) => piece.role === 'capacityPayoff');
    assert(payoffBanner && payoffBanner.meta?.payoff === c.payload.payoff,
      'capacityPack must show a persistent payoff banner, not just a small footer line');
    const slots = page.locked.filter((piece) => piece.role === 'capacitySlot');
    assert(slots.length === c.payload.limit, 'capacityPack must render exactly `limit` pockets');
    assert(slots.every((piece) => piece.meta?.ordered === false),
      'capacityPack pockets must not carry ordinal/order-dependent meaning');
  }
  if (c.id === 'evidenceBoard') {
    const cards = page.unlocked.filter((piece) => piece.role === 'evidenceCard');
    assert(cards.every((piece) =>
      piece.meta?.source && piece.meta?.artifactExcerpt
      && piece.meta?.rationale && piece.meta?.claimImpact
      && ['supports', 'contradicts', 'qualifies', 'alternative'].includes(piece.meta?.relation)
    ), 'evidenceBoard cards must expose source, relation, source quality, and claim impact');
    assert(cards.some((piece) => piece.meta?.relation !== 'supports'),
      'evidenceBoard must include counter-evidence');
    const strongest = cards.slice().sort((a, b) => b.meta.strength - a.meta.strength)[0];
    assert.notEqual(strongest.meta.relation, 'supports',
      'evidenceBoard strength must be independent of support/counter direction');
    assert(page.notes.includes('evidenceStrengthsDistinct:true'),
      'evidenceBoard must mark honest distinct strength ranks');
    assert(page.notes.includes('evidenceSourcesComplete:true'),
      'evidenceBoard must mark complete source artifacts');
    assert(page.notes.includes('evidenceArtifactsInspectable:true'),
      'evidenceBoard must mark literal source excerpts as inspectable');
    assert(page.notes.includes('evidenceLockedConclusion:true'),
      'evidenceBoard must expose a sealed conclusion artifact');
    assert(page.notes.includes('evidenceCounterSemantics:true'),
      'evidenceBoard must mark the strict counter-relation contract');
  }
}

const lunchCapacity = lesson('Choose Food for Lunch', 'capacityPack', 'capacityPack', {
  mission: 'Pack two foods for lunch.',
  constraint: 'Lunch must include one drink.',
  containerLabel: 'Lunch bag',
  payoff: 'Ready to eat',
  limit: 2,
  options: ['apple', 'banana', 'carrot', 'milk'],
  mustInclude: ['milk'],
});
assert.equal(
  activityFor(lunchCapacity, { level: 'A1', duration: 30 }).assignment.recipeId,
  'capacityPack',
  'explicit grammar must beat an incidental lunch-tray hero'
);

const invalidCapacity = lesson('Invalid capacity', 'capacityPack', 'capacityPack', {
  mission: 'Pack everything.',
  constraint: 'Take every item.',
  containerLabel: 'Bag',
  payoff: 'Ready to go',
  limit: 3,
  options: ['apple', 'banana', 'carrot'],
  mustInclude: [],
});
assert.notEqual(
  activityFor(invalidCapacity).assignment.recipeId,
  'capacityPack',
  'capacityPack must fail closed when options do not exceed the limit'
);

const hiddenRuleCapacity = lesson('Hidden rule', 'capacityPack', 'capacityPack', {
  mission: 'Pack two things.',
  containerLabel: 'Trip bag',
  payoff: 'Ready to go',
  limit: 2,
  options: ['apple', 'book', 'pencil'],
  mustInclude: ['book'],
});
assert.notEqual(
  activityFor(hiddenRuleCapacity).assignment.recipeId,
  'capacityPack',
  'capacityPack must fail closed when its deciding constraint is hidden'
);

const invalidRoute = lesson('Ambiguous route', 'routeMission', 'routeMission', {
  mission: 'Help Mia visit three places.',
  mover: 'Mia',
  goal: 'Park',
  steps: ['See the fountain', 'See the trees', 'See the gate'],
  landmarks: ['Fountain', 'Trees', 'Gate'],
  answerOrder: ['See the fountain', 'See the trees', 'See the gate'],
  orderEvidence: [],
});
assert.notEqual(
  activityFor(invalidRoute).assignment.recipeId,
  'routeMission',
  'routeMission must reject actions with no dependency evidence'
);

const invalidTransform = lesson('Invalid transform', 'transformationLab', 'transformationLab', {
  question: 'What changes?',
  before: 'It is warm.',
  changes: ['Wait', 'Add water'],
  correctChange: 'Use ice',
  after: 'It is cold.',
});
assert.notEqual(
  activityFor(invalidTransform).assignment.recipeId,
  'transformationLab',
  'transformationLab must reject an answer missing from changes'
);

const invalidEvidence = lesson('Thin evidence', 'evidenceBoard', 'evidenceBoard', {
  claim: 'This is best.',
  evidence: [{ text: 'One clue', strength: 1 }, { text: 'Two clues', strength: 2 }],
  conclusion: 'Not enough evidence.',
});
assert.notEqual(
  activityFor(invalidEvidence).assignment.recipeId,
  'evidenceBoard',
  'evidenceBoard requires at least three evidence cards'
);

const vagueCounterEvidence = lesson('Vague counter relation', 'evidenceBoard', 'evidenceBoard', {
  claim: 'The bus is best.',
  evidence: [
    {
      text: 'The bus arrives soon.',
      source: 'Tracker',
      artifactExcerpt: 'Route 5 — 3 min',
      relation: 'supports',
      rationale: 'It is current.',
      claimImpact: 'A short wait supports the claim.',
      strength: 3,
    },
    {
      text: 'The stop is nearby.',
      source: 'Route map',
      artifactExcerpt: 'Stop S4 — School Gate',
      relation: 'supports',
      rationale: 'It is official.',
      claimImpact: 'A nearby stop supports convenience.',
      strength: 2,
    },
    {
      text: 'It rained earlier.',
      source: 'Weather note',
      artifactExcerpt: '07:50 — light rain',
      relation: 'challenges',
      rationale: 'It is current.',
      claimImpact: 'This is merely adjacent, not genuine counter-evidence.',
      strength: 1,
    },
  ],
  conclusion: 'The evidence is mixed.',
});
assert.notEqual(
  activityFor(vagueCounterEvidence).assignment.recipeId,
  'evidenceBoard',
  'evidenceBoard must reject the vague challenges label in favor of an explicit logical relation'
);

const ordinaryKing = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/dentist-lesson.json'), 'utf8')
);
assert.equal(
  activityFor(ordinaryKing, { level: 'A1', duration: 30 }).assignment.recipeId,
  'heroProp',
  'ordinary proven king lessons must keep heroProp'
);

const campingKing = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/campsite-lesson.json'), 'utf8')
);
const campingResult = activityFor(campingKing, { level: 'A1', duration: 30 });
assert.equal(campingResult.assignment.recipeId, 'heroProp',
  'camping must resolve to a real scene-building king');
assert.equal(campingResult.assignment.ctx.hero.key, 'tent',
  'camping must keep the tent as its canonical world anchor');
assert.equal(
  campingResult.page.unlocked.filter((piece) => piece.role === 'dockPiece').length,
  12,
  'scene-building kings must expose one readable dozen roleplay tools'
);
assert(!campingResult.page.notes.some((note) => /^dockDropped:/.test(note)),
  'scene-building king docks must not silently drop overflow tools');
assert.equal(W.LessonTraits.isWorldBuilderHero('tent'), true,
  'tent must receive the created-world ground and completion grammar');
assert.equal(W.LessonTraits.isWorldBuilderHero('hero-backpack-open'), false,
  'container kings must keep the hero itself as their drop surface');

console.log('OK board grammar selection, validation, visual contracts, and grab floors');
