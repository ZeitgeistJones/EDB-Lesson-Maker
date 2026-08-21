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
    id: 'capacityPack',
    payloadKey: 'capacityPack',
    payload: {
      mission: 'Pack exactly three useful things for a school trip.',
      limit: 3,
      options: ['book', 'milk', 'apple', 'banana', 'bus'],
      mustInclude: ['book'],
    },
    roles: ['capacityMission', 'capacitySlot', 'capacityChoice'],
  },
  {
    id: 'routeMission',
    payloadKey: 'routeMission',
    payload: {
      mission: 'Help Mia reach the bus.',
      steps: ['Check the plan', 'Pack the bag', 'Get on the bus'],
      answerOrder: ['Check the plan', 'Pack the bag', 'Get on the bus'],
    },
    roles: ['routeMissionBrief', 'routeStep', 'routeTile', 'routeAnswerCover'],
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
        { text: 'The road is open.', strength: 2 },
        { text: 'The bus stops beside the school.', strength: 3 },
        { text: 'It is raining hard.', strength: 1 },
      ],
      conclusion: 'The bus is practical because it stops beside the school.',
    },
    roles: ['evidenceClaim', 'evidenceRankSlot', 'evidenceCard', 'evidenceConclusionCover'],
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
    'capacityChoice',
    'routeTile',
    'transformationChange',
    'evidenceCard',
  ]);
  const choices = page.unlocked.filter((piece) => choiceRoles.has(piece.role));
  assert(choices.length >= 2, `${c.id} must expose multiple meaningful choices`);
  assert(choices.every((piece) => piece.w >= 64 && piece.h >= 64),
    `${c.id} choice pieces must meet the 64px grab floor`);
}

const lunchCapacity = lesson('Choose Food for Lunch', 'capacityPack', 'capacityPack', {
  mission: 'Pack two foods for lunch.',
  limit: 2,
  options: ['apple', 'banana', 'carrot', 'milk'],
});
assert.equal(
  activityFor(lunchCapacity, { level: 'A1', duration: 30 }).assignment.recipeId,
  'capacityPack',
  'explicit grammar must beat an incidental lunch-tray hero'
);

const invalidCapacity = lesson('Invalid capacity', 'capacityPack', 'capacityPack', {
  mission: 'Pack everything.',
  limit: 3,
  options: ['apple', 'banana', 'carrot'],
});
assert.notEqual(
  activityFor(invalidCapacity).assignment.recipeId,
  'capacityPack',
  'capacityPack must fail closed when options do not exceed the limit'
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

const ordinaryKing = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/dentist-lesson.json'), 'utf8')
);
assert.equal(
  activityFor(ordinaryKing, { level: 'A1', duration: 30 }).assignment.recipeId,
  'heroProp',
  'ordinary proven king lessons must keep heroProp'
);

console.log('OK board grammar selection, validation, visual contracts, and grab floors');
