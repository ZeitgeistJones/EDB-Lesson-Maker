/**
 * Regenerate one representative baseline for every surviving interactive board
 * grammar. Outputs are review artifacts, not source assets:
 *   tmp/board-type-baselines/<BOARD_TYPE_ID>.jpg
 *   tmp/board-type-baselines/contact.jpg
 *   tmp/board-type-baselines/report.json
 *
 * Focused stress test:
 *   node scripts/preview-board-type-baselines.cjs --only=capacityPack --variant=camping
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'board-type-baselines');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((value) => value.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', name), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cliArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function withActivity(input, boardArchetype, payloadKey, payload, title, prompt) {
  const lesson = clone(input);
  lesson.activity = Object.assign({}, lesson.activity || {}, {
    title: title || 'Your mission',
    prompt: prompt || 'Build the answer on the board.',
    templates: ['I chose ___ because ___.'],
    boardArchetype,
    [payloadKey]: payload,
  });
  lesson.sentenceFrames = [];
  return lesson;
}

function compactLesson(title, vocabulary) {
  return {
    title,
    warmUp: { question: 'What do you already know?', sampleAnswer: 'A little.' },
    vocabulary: vocabulary.map((word) => ({ word, sentence: `I can use ${word}.` })),
    sentenceFrames: [],
    story: {
      title: 'Mission Story',
      pages: [
        { heading: 'First', text: 'Mia checks the plan.', visualTheme: 'school', visualCaption: 'Mia checks a plan' },
        { heading: 'Next', text: 'Mia packs the bag.', visualTheme: 'school', visualCaption: 'Mia packs a bag' },
        { heading: 'Last', text: 'Mia gets on the bus.', visualTheme: 'city', visualCaption: 'Mia gets on a bus' },
      ],
      comprehensionQuestions: [
        { question: 'What does Mia check?', sampleAnswer: 'The plan.' },
        { question: 'What does Mia pack?', sampleAnswer: 'The bag.' },
      ],
      creativeQuestions: [],
    },
    speakingQuestions: [{ question: 'What would you choose?', sampleAnswer: 'I would choose the book.' }],
    activity: {
      title: 'Your mission',
      prompt: 'Build the answer on the board.',
      templates: ['I chose ___ because ___.'],
    },
    reviewSentences: ['Mia checks the plan.'],
  };
}

const fruit = fixture('fruit-market-lesson.json');
const dentist = fixture('dentist-lesson.json');
const zooPhonics = fixture('zoo-phonics-lesson.json');
const sportsBare = fixture('basketball-bare-lesson.json');
const snackCoat = fixture('snack-coat-day-lesson.json');
const twoPets = fixture('two-pets-choice-lesson.json');
const mysteryApple = fixture('mystery-apple-lesson.json');
const storyScenes = fixture(arg('story-fixture', 'story-scene-templates-4-lesson.json'));
const storyPageKey = arg('story-page', 'story0');
const storyLevel = arg('story-level', 'A1');
const storyDuration = Number(arg('story-duration', '30')) || 30;
const base = compactLesson('School Trip Mission', ['book', 'apple', 'banana', 'milk', 'bus', 'pencil']);
const CAPACITY_VARIANTS = {
  'school-trip': {
    title: 'School Trip Mission',
    vocabulary: ['book', 'apple', 'banana', 'milk', 'bus', 'pencil'],
    payload: {
      mission: 'Choose three useful things for the school trip.',
      constraint: 'The bus leaves early and you must record one new fact.',
      containerLabel: 'Trip pack',
      payoff: 'Ready to report a new fact',
      limit: 3,
      options: ['book', 'apple', 'banana', 'milk', 'pencil'],
      mustInclude: ['pencil'],
    },
  },
  camping: {
    title: 'Rainy Night Camp',
    vocabulary: ['tent', 'flashlight', 'water', 'map', 'coat', 'ball'],
    payload: {
      mission: 'Choose three things for a safe rainy-night camp.',
      constraint: 'Rain is coming and you will set up after dark.',
      containerLabel: 'Camp pack',
      payoff: 'Ready for a safe night',
      limit: 3,
      options: ['tent', 'flashlight', 'water', 'map', 'coat', 'ball'],
      mustInclude: ['tent', 'flashlight'],
    },
  },
  'creator-kit': {
    title: 'Space Video Creator Kit',
    vocabulary: ['camera', 'microphone', 'tripod', 'light', 'laptop', 'paintbrush'],
    payload: {
      mission: 'Choose four tools to film a space-news video.',
      constraint: 'The video must have clear pictures and sound.',
      containerLabel: 'Creator kit',
      payoff: 'Ready to record',
      limit: 4,
      options: ['camera', 'microphone', 'tripod', 'light', 'laptop', 'paintbrush'],
      mustInclude: ['camera', 'microphone'],
    },
  },
};
const capacityVariantId = cliArg('variant', 'school-trip');
const capacityVariant = CAPACITY_VARIANTS[capacityVariantId] || CAPACITY_VARIANTS['school-trip'];
const capacityLesson = compactLesson(capacityVariant.title, capacityVariant.vocabulary);

const SCENE_REPAIR_VARIANTS = {
  'fruit-market': {
    title: 'Fruit Market Repair',
    level: 'A1',
    vocabulary: ['apple', 'banana', 'carrot', 'grape', 'basket', 'market'],
    payload: {
      slotLabel: 'Fruit market basket',
      sceneCue: 'fruit market stall',
      wrongWord: 'carrot',
      correctWord: 'apple',
    },
    activityTitle: 'Fix the fruit stall',
  },
  camping: {
    title: 'Camping Repair',
    level: 'A1',
    vocabulary: ['tent', 'campfire', 'wood', 'flashlight', 'ice cream', 'boots'],
    payload: {
      slotLabel: 'Campfire',
      sceneCue: 'night camping forest',
      wrongWord: 'ice cream',
      correctWord: 'wood',
    },
    activityTitle: 'Fix the campsite',
  },
  restaurant: {
    title: 'Restaurant Repair',
    level: 'A2',
    vocabulary: ['table', 'plate', 'fork', 'menu', 'surfboard', 'water'],
    payload: {
      slotLabel: 'Restaurant table',
      sceneCue: 'indoor cafe dinner table',
      wrongWord: 'surfboard',
      correctWord: 'fork',
    },
    activityTitle: 'Fix the table',
  },
  surfing: {
    title: 'Beach Repair',
    level: 'A2',
    vocabulary: ['beach', 'wave', 'surfboard', 'towel', 'fork', 'sun'],
    payload: {
      slotLabel: 'Surf beach',
      sceneCue: 'sunny beach ocean waves',
      wrongWord: 'fork',
      correctWord: 'surfboard',
    },
    activityTitle: 'Fix the beach',
  },
};
const sceneVariantId = cliArg('variant', 'fruit-market');
const sceneVariant = SCENE_REPAIR_VARIANTS[sceneVariantId] || SCENE_REPAIR_VARIANTS['fruit-market'];
const sceneLesson = compactLesson(sceneVariant.title, sceneVariant.vocabulary);

const FRAME_VARIANTS = {
  'fruit-market': { lesson: fruit, level: 'A1' },
  'game-day': {
    level: 'A2',
    lesson: {
      ...compactLesson('Game Day Training', ['ball', 'team', 'score', 'court', 'coach', 'whistle']),
      vocabulary: [
        { word: 'ball', sentence: 'Before I shoot, I pass the ball to my teammate.' },
        { word: 'team', sentence: 'Our team works together until the final whistle.' },
        { word: 'score', sentence: 'After we make a basket, our team adds one point to the score.' },
        { word: 'court', sentence: 'We move into position on the court.' },
        { word: 'coach', sentence: 'During practice, the coach helps everyone improve.' },
        { word: 'whistle', sentence: 'When our team is ready to begin, the coach blows the whistle.' },
      ],
      sentenceFrames: [
        'Before the game begins, we start our ____ with a careful warm-up.',
        'Before I shoot, I pass the ____ to my teammate.',
        'Before the game begins, everyone walks onto the ____.',
        'During practice, the ____ helps everyone improve.',
      ],
    },
  },
  'city-transport': {
    level: 'B1',
    lesson: {
      ...compactLesson('A Greener Journey Across Town', ['bus', 'bike', 'train', 'map', 'ticket', 'helmet']),
      vocabulary: [
        { word: 'bus', sentence: 'When it rains, I take the bus instead of walking.' },
        { word: 'bike', sentence: 'For a short journey, I usually ride my bike.' },
        { word: 'train', sentence: 'To avoid the busy roads, our family travels by train.' },
        { word: 'map', sentence: 'Before leaving home, I check the map for the safest route.' },
        { word: 'ticket', sentence: 'At the station, I keep my ticket ready for inspection.' },
        { word: 'helmet', sentence: 'Whenever I cycle across town, I always wear a helmet.' },
      ],
      sentenceFrames: [
        'When heavy rain makes walking difficult, I take the ____ across town.',
        'Before leaving home, I plan each part of my ____ carefully.',
        'To reach the museum without a car, we travel across ____ by bus.',
        'On the transport map, the safest route is marked in ____.',
        'After getting off the train, we walk ____ the bridge together.',
      ],
    },
  },
  'camping-weather': {
    level: 'A2',
    lesson: {
      ...compactLesson('Camping Weather Challenge', ['coat', 'tent', 'flashlight', 'boots', 'map', 'water', 'backpack']),
      vocabulary: [
        { word: 'coat', sentence: 'Before the rain starts, I put the coat inside my backpack.' },
        { word: 'tent', sentence: 'We sleep safely inside the tent.' },
        { word: 'flashlight', sentence: 'At the dark campsite, I use the flashlight to see the path.' },
        { word: 'boots', sentence: 'If my feet get wet, I change into dry boots.' },
        { word: 'map', sentence: 'To find our camping place safely, I check the map.' },
        { word: 'water', sentence: 'I carry water on the hike.' },
        { word: 'backpack', sentence: 'My backpack keeps our things dry.' },
      ],
      sentenceFrames: [
        'Before the rain starts, I put the ____ inside my backpack.',
        'At the dark campsite, I use the ____ to see the path.',
        'If my feet get wet, I change into dry ____.',
        'To find our camping place safely, I check the ____.',
      ],
    },
  },
  'eco-school': {
    level: 'B1',
    lesson: {
      ...compactLesson('Our Greener School Plan', ['reuse', 'bottle', 'compost', 'paper', 'electricity', 'garden', 'plastic', 'teamwork']),
      vocabulary: [
        { word: 'reuse', sentence: 'Instead of throwing useful materials away, we reuse them.' },
        { word: 'bottle', sentence: 'At lunch, I refill my bottle instead of buying another drink.' },
        { word: 'compost', sentence: 'After lunch, we put fruit scraps into the compost.' },
        { word: 'paper', sentence: 'When only one side is used, we save the paper for drawing.' },
        { word: 'electricity', sentence: 'Before leaving the classroom, we save electricity.' },
        { word: 'garden', sentence: 'To make the playground greener, our class plants a garden.' },
        { word: 'plastic', sentence: 'Our class tries to use less plastic each week.' },
        { word: 'teamwork', sentence: 'A greener school depends on teamwork.' },
      ],
      sentenceFrames: [
        'Instead of throwing useful materials away, we ____ them.',
        'At lunch, I refill my ____ instead of buying another drink.',
        'After lunch, we put fruit scraps into the ____.',
        'Before leaving the classroom, we save ____.',
        'A greener school depends on ____.',
      ],
    },
  },
};
const frameVariantId = cliArg('variant', 'fruit-market');
const frameVariant = FRAME_VARIANTS[frameVariantId] || FRAME_VARIANTS['fruit-market'];
if (cliArg('only', '') === 'frameTiles') {
  console.log('FRAME_VARIANT', frameVariantId, frameVariant.lesson.title, frameVariant.level);
}

const MATCH_DOCK_VARIANTS = {
  'fruit-market': { lesson: fruit, level: 'A1' },
  zoo: { lesson: zooPhonics, level: 'A1' },
};
const matchDockVariantId = cliArg('variant', 'fruit-market');
const matchDockVariant = MATCH_DOCK_VARIANTS[matchDockVariantId] || MATCH_DOCK_VARIANTS['fruit-market'];
if (cliArg('only', '') === 'matchDock') {
  console.log('MATCH_DOCK_VARIANT', matchDockVariantId, matchDockVariant.lesson.title, matchDockVariant.level);
}

const ROUTE_MISSION_VARIANTS = {
  'school-trip': {
    title: 'School Trip Mission',
    level: 'A2',
    vocabulary: ['book', 'bag', 'bus', 'pencil'],
    payload: {
      mission: 'Help Mia reach the bus on time.',
      mover: 'Mia',
      goal: 'Bus',
      steps: ['Check the plan', 'Pack the bag', 'Walk to the stop', 'Get on the bus'],
      landmarks: ['Plan', 'Bag', 'Bus stop', 'Bus'],
      orderEvidence: [
        'The plan tells Mia what to pack.',
        'Mia must pack before leaving for the stop.',
        'Mia must reach the stop before boarding the bus.',
      ],
      answerOrder: ['Check the plan', 'Pack the bag', 'Walk to the stop', 'Get on the bus'],
    },
  },
  beach: {
    title: 'Beach Rescue Route',
    level: 'A2',
    vocabulary: ['radio', 'flag', 'bridge', 'boat'],
    payload: {
      mission: 'Guide Kai from the beach hut to the rescue boat.',
      mover: 'Kai',
      goal: 'Rescue boat',
      steps: ['Take the radio', 'Follow the flags', 'Cross the footbridge', 'Reach the rescue boat'],
      landmarks: ['Radio', 'Flag trail', 'Footbridge', 'Rescue boat'],
      orderEvidence: [
        'Kai needs the radio before leaving the hut.',
        'The flags lead Kai to the footbridge.',
        'Kai must cross the bridge to reach the boat.',
      ],
      answerOrder: ['Take the radio', 'Follow the flags', 'Cross the footbridge', 'Reach the rescue boat'],
    },
  },
  'amusement-park': {
    title: 'Roller-Coaster Route',
    level: 'A2',
    vocabulary: ['map', 'ticket', 'gate', 'roller coaster'],
    payload: {
      mission: 'Help Zoe reach the roller coaster before the ride starts.',
      mover: 'Zoe',
      goal: 'Roller coaster',
      steps: ['Check the park map', 'Buy a ride ticket', 'Enter the blue gate', 'Join the coaster line'],
      landmarks: ['Park map', 'Ride ticket', 'Blue gate', 'Coaster line'],
      orderEvidence: [
        'The map shows where to buy the right ticket.',
        'Zoe needs a ticket before entering the ride gate.',
        'Zoe must enter the gate before joining the coaster line.',
      ],
      answerOrder: ['Check the park map', 'Buy a ride ticket', 'Enter the blue gate', 'Join the coaster line'],
    },
  },
  camping: {
    title: 'Campfire Safety Route',
    level: 'B1',
    vocabulary: ['bucket', 'water', 'fire', 'tent'],
    payload: {
      mission: 'Lead Team Pine from a cold campsite to a safe campfire.',
      mover: 'Team Pine',
      goal: 'Safe campfire',
      steps: ['Choose a clear fire ring', 'Fill the safety bucket', 'Build a small wood stack', 'Light it with an adult', 'Put out every ember'],
      landmarks: ['Fire ring', 'Safety bucket', 'Wood stack', 'Campfire', 'Cold embers'],
      orderEvidence: [
        'The team must choose a safe ring before preparing equipment.',
        'The safety bucket must be ready before the wood is built.',
        'The wood stack must be built before an adult lights it.',
        'The fire must burn before the team can put out every ember.',
      ],
      answerOrder: ['Choose a clear fire ring', 'Fill the safety bucket', 'Build a small wood stack', 'Light it with an adult', 'Put out every ember'],
    },
  },
};
const routeVariantId = cliArg('variant', 'school-trip');
const routeVariant = ROUTE_MISSION_VARIANTS[routeVariantId] || ROUTE_MISSION_VARIANTS['school-trip'];
const routeLesson = compactLesson(routeVariant.title, routeVariant.vocabulary);

const fixLesson = compactLesson('Daily Routine Grammar', ['school', 'book', 'pencil', 'bus']);
fixLesson.activity = {
  title: 'Fix the sentence',
  prompt: 'Repair one word.',
  templates: [],
  fixSentence: {
    sentence: 'She go to school.',
    wrong: 'go',
    correct: 'goes',
    distractors: ['going', 'went'],
  },
};

const preA1 = compactLesson('Action Time', ['jump', 'sit', 'wave', 'point']);
preA1.activity = { title: 'Listen, Point, Do', prompt: 'Listen and do the action.', templates: [] };

const ALL_CASES = [
  // Existing lesson chrome (not activity recipes) — first/last impression for Manus.
  { id: 'title', pageKey: 'title', expected: 'title', pageFormat: true, lesson: fruit, meta: { level: 'A1', duration: 30 } },
  {
    id: 'story',
    pageKey: storyPageKey,
    expected: 'story',
    pageFormat: true,
    lesson: storyScenes,
    meta: { level: storyLevel, duration: storyDuration },
  },
  { id: 'wrap', pageKey: 'wrap', expected: 'wrap', pageFormat: true, lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'matchDock', pageKey: 'newWords', expected: 'matchDock', lesson: matchDockVariant.lesson, meta: { level: matchDockVariant.level, duration: 30 } },
  { id: 'frameTiles', pageKey: 'frames', expected: 'frameTiles', lesson: frameVariant.lesson, meta: { level: frameVariant.level, duration: 30 } },
  { id: 'phonicsSoundBoxes', pageKey: 'phonics', expected: 'phonicsSoundBoxes', lesson: zooPhonics, meta: { level: 'A1', duration: 30, phonics: 'on' }, force: true },
  { id: 'coverAnswer', pageKey: 'speaking:0', expected: 'coverAnswer', lesson: fruit, meta: { level: 'A1', duration: 30 } },
  { id: 'preA1TprChoice', pageKey: 'activity', expected: 'preA1TprChoice', lesson: preA1, meta: { level: 'Pre-A1', duration: 30, phonics: 'off' } },
  { id: 'heroProp', pageKey: 'activity', expected: 'heroProp', lesson: dentist, meta: { level: 'A1', duration: 30 } },
  {
    id: 'silhouetteGate',
    pageKey: 'activity',
    expected: 'silhouetteGate',
    lesson: withActivity(fruit, 'silhouetteGate', 'mysteryHints', [
      'It is something you can eat.',
      'It is often round and red or green.',
      'It starts with A.',
    ], 'Mystery shape', 'Guess, peel, and say.'),
    meta: { level: 'A1', duration: 30 },
  },
  {
    id: 'halfTruthBoard',
    pageKey: 'activity',
    expected: 'halfTruthBoard',
    lesson: withActivity(fruit, 'halfTruth', 'halfTruth', {
      claim: 'All of these belong in a fruit basket.',
      verdict: 'half',
      why: 'Carrot is a vegetable.',
      evidence: ['apple', 'banana', 'carrot', 'grape'],
    }, 'Half-truth check'),
    meta: { level: 'A2', duration: 30 },
  },
  {
    id: 'sceneRepair',
    pageKey: 'activity',
    expected: 'sceneRepair',
    lesson: withActivity(
      sceneLesson,
      'sceneRepair',
      'sceneRepair',
      sceneVariant.payload,
      sceneVariant.activityTitle
    ),
    meta: { level: sceneVariant.level, duration: 30 },
  },
  { id: 'oddOneOut', pageKey: 'activity', expected: 'oddOneOut', lesson: sportsBare, meta: { level: 'A2', duration: 30 }, force: true },
  { id: 'yesNoSort', pageKey: 'activity', expected: 'yesNoSort', lesson: snackCoat, meta: { level: 'A2', duration: 30 }, force: true },
  { id: 'thisOrThat', pageKey: 'activity', expected: 'thisOrThat', lesson: twoPets, meta: { level: 'A1', duration: 30 }, force: true },
  { id: 'fixSentence', pageKey: 'activity', expected: 'fixSentence', lesson: fixLesson, meta: { level: 'A2', duration: 30 } },
  { id: 'mysteryHints', pageKey: 'activity', expected: 'mysteryHints', lesson: mysteryApple, meta: { level: 'A2', duration: 30 }, force: true },
  {
    id: 'sortBins',
    pageKey: 'activity',
    expected: 'sortBins',
    lesson: compactLesson('Things and Ideas', ['ball', 'book', 'effort', 'practice', 'teamwork', 'hope']),
    meta: { level: 'B1', duration: 30 },
    force: true,
  },
  {
    id: 'capacityPack',
    pageKey: 'activity',
    expected: 'capacityPack',
    lesson: withActivity(
      capacityLesson,
      'capacityPack',
      'capacityPack',
      capacityVariant.payload,
      capacityVariant.title
    ),
    meta: { level: 'A2', duration: 30 },
  },
  {
    id: 'routeMission',
    pageKey: 'activity',
    expected: 'routeMission',
    lesson: withActivity(
      routeLesson,
      'routeMission',
      'routeMission',
      routeVariant.payload,
      'Route mission'
    ),
    meta: { level: routeVariant.level, duration: 30 },
  },
  {
    id: 'transformationLab',
    pageKey: 'activity',
    expected: 'transformationLab',
    lesson: withActivity(base, 'transformationLab', 'transformationLab', {
      question: 'Which change keeps the lunch fresh?',
      before: 'The lunch is warm in an open bag.',
      changes: ['Add a cool pack', 'Leave it in the sun', 'Pour in hot water'],
      correctChange: 'Add a cool pack',
      after: 'The lunch stays cool and fresh.',
    }, 'Transformation lab'),
    meta: { level: 'B1', duration: 30 },
  },
  {
    id: 'evidenceBoard',
    pageKey: 'activity',
    expected: 'evidenceBoard',
    lesson: withActivity(
      compactLesson('Festival Sound Mystery', ['festival', 'stage', 'rain', 'camera', 'power', 'speaker']),
      'evidenceBoard',
      'evidenceBoard',
      {
      claim: 'Rain caused the main-stage sound failure.',
      evidence: [
        {
          text: 'Water was found in the tripped power box.',
          source: 'Electrician report',
          artifactExcerpt: '19:42 — breaker tripped; water inside box',
          relation: 'supports',
          rationale: 'Direct expert inspection.',
          claimImpact: 'Water in the failed circuit supports rain.',
          strength: 4,
        },
        {
          text: 'Heavy rain began 10 minutes before failure.',
          source: 'Weather station',
          artifactExcerpt: '19:32 — heavy rain began',
          relation: 'supports',
          rationale: 'Automatic timing.',
          claimImpact: 'Rain timing supports, but cannot prove cause.',
          strength: 2,
        },
        {
          text: 'A heat alarm appeared before the rain began.',
          source: 'Sound-desk log',
          artifactExcerpt: '19:29 — AMPLIFIER HEAT ALARM',
          relation: 'alternative',
          rationale: 'Automatic timestamp.',
          claimImpact: 'Another plausible cause is overheating.',
          strength: 3,
        },
        {
          text: 'A witness remembers the power-box cover closed.',
          source: 'Witness interview',
          artifactExcerpt: '"The power-box cover looked closed."',
          relation: 'qualifies',
          rationale: 'Memory may be wrong.',
          claimImpact: 'Closed cover makes rain less likely.',
          strength: 1,
        },
      ],
      conclusion: 'Rain is the leading cause, but the heat alarm means overheating remains plausible.',
      reasoningFrame: 'I rank ___ above ___ because its source is more direct, reliable, and relevant.',
      teacherCheck: 'Ask which clue proves cause most directly and which offers a real alternative.',
    }, 'Festival case file'),
    meta: { level: 'B2', duration: 30 },
  },
];
const onlyId = cliArg('only', '');
const CASES = onlyId ? ALL_CASES.filter((item) => item.id === onlyId) : ALL_CASES;

function servePublic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
      const file = path.join(ROOT, 'public', rel);
      if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(file);
      const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = arg('only', '').trim();
  const artifactTag = arg('tag', '').trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '');
  const artifactSuffix = artifactTag ? `-${artifactTag}` : '';
  const selectedCases = only ? CASES.filter((c) => c.id === only) : CASES;
  if (!selectedCases.length) throw new Error(`Unknown board baseline id: ${only}`);
  const server = await servePublic();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview
    && window.PropBank && window.VocabIcons
  );

  const results = [];
  const contactRows = [];
  for (const c of selectedCases) {
    const row = await page.evaluate(async ({ lesson, meta, pageKey, expected, force, id, pageFormat }) => {
      await window.PropBank.ready();
      await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);

      // Title / wrap are existing page formats, not interaction recipes.
      if (pageFormat) {
        await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
        const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
        const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
        if (idx < 0 || !canvases[idx]) {
          return { ok: false, id, expected, actual: null, error: `missing page-format canvas for ${pageKey}` };
        }
        const layoutPage = boardPlan.pages[idx];
        return {
          ok: true,
          id,
          recipeId: expected,
          pageKey,
          forced: false,
          dataUrl: canvases[idx].toDataURL('image/jpeg', 0.9),
          locked: (layoutPage.locked || []).length,
          unlocked: (layoutPage.unlocked || []).length,
          notes: [`pageFormat:${expected}`],
        };
      }

      let assignment = (boardPlan.assignments || []).find((a) => a.pageKey === pageKey);
      let forced = false;

      if ((!assignment || assignment.recipeId !== expected) && force) {
        let forceCtx = {};
        const art = boardPlan.vocabArt || { matchable: [] };
        if (expected === 'phonicsSoundBoxes') {
          forceCtx = { meta };
        } else if (expected === 'oddOneOut') {
          forceCtx = window.EdbActivities.resolveOddOneOut(lesson, art) || {
            options: ['ball', 'team', 'score', 'court'],
            odd: 'score',
            rows: window.EdbActivities.picturedMatchableRows(art),
            source: 'baseline',
            ruleHint: 'Which one is an idea or result, not a person, place, or thing?',
          };
        } else if (expected === 'yesNoSort') {
          forceCtx = window.EdbActivities.resolveYesNoSort(lesson, art, meta) || {
            options: ['apple', 'banana', 'hat', 'coat'],
            yes: ['apple', 'banana'],
            no: ['hat', 'coat'],
            rows: window.EdbActivities.picturedMatchableRows(art),
            question: 'Can you eat it?',
            ruleHint: 'YES = food · NO = something you wear',
            source: 'baseline',
          };
        } else if (expected === 'thisOrThat') {
          forceCtx = window.EdbActivities.resolveThisOrThat(lesson, art, meta) || {
            options: ['dog', 'cat'],
            rows: window.EdbActivities.picturedMatchableRows(art),
            frame: 'I would choose ____ because ____.',
            source: 'baseline',
          };
        } else if (expected === 'mysteryHints') {
          const target = window.EdbActivities.pickMysteryTarget(art) || {
            word: 'apple',
            glyph: '🍎',
            matchable: true,
          };
          forceCtx = {
            targetWord: target.word,
            artPath: target.artSrc || null,
            vocabArtRow: target,
            hints: window.EdbActivities.resolveMysteryHints(target.word, lesson),
          };
        }
        boardPlan.assignments = (boardPlan.assignments || []).filter((a) => a.pageKey !== pageKey);
        assignment = { pageKey, recipeId: expected, ctx: forceCtx };
        boardPlan.assignments.push(assignment);
        const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
        if (idx < 0) throw new Error(`cannot force missing page ${pageKey}`);
        const pageType = window.EdbActivities.pageTypeForKey(pageKey);
        const layoutPage = window.EdbLayout.createPage(pageType);
        layoutPage.pageKey = pageKey;
        layoutPage.pageIndex = idx;
        window.EdbActivities.applyToPage(lesson, layoutPage, pageKey, boardPlan);
        boardPlan.pages[idx] = layoutPage;
        forced = true;
      }

      if (!assignment || assignment.recipeId !== expected) {
        return {
          ok: false,
          id,
          expected,
          actual: assignment && assignment.recipeId || null,
          error: `expected ${expected} on ${pageKey}`,
        };
      }

      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const idx = boardPlan.pages.findIndex((p) => p.pageKey === pageKey);
      if (idx < 0 || !canvases[idx]) {
        return { ok: false, id, expected, actual: assignment.recipeId, error: `missing canvas for ${pageKey}` };
      }
      const layoutPage = boardPlan.pages[idx];
      return {
        ok: true,
        id,
        recipeId: assignment.recipeId,
        pageKey,
        forced,
        dataUrl: canvases[idx].toDataURL('image/jpeg', 0.9),
        locked: (layoutPage.locked || []).length,
        unlocked: (layoutPage.unlocked || []).length,
        notes: (layoutPage.notes || []).filter((n) => /recipe:|Limit:|Steps:|Count:|Target:|Correct:|Wrong|authoredWrongness/i.test(String(n))),
        pieces: [...(layoutPage.locked || []), ...(layoutPage.unlocked || [])]
          .map((p) => ({ role: p.role, word: p.meta && p.meta.word, kind: p.kind })),
      };
    }, Object.assign({}, c, { pageFormat: !!c.pageFormat }));

    if (!row.ok) {
      results.push(row);
      console.error('FAIL', c.id, row.actual, row.error);
      continue;
    }
    const outPath = path.join(OUT_DIR, `${c.id}${artifactSuffix}.jpg`);
    fs.writeFileSync(outPath, Buffer.from(row.dataUrl.split(',')[1], 'base64'));
    const result = {
      id: c.id,
      ok: true,
      recipeId: row.recipeId,
      pageKey: row.pageKey,
      forced: row.forced,
      locked: row.locked,
      unlocked: row.unlocked,
      notes: row.notes,
      pieces: row.pieces,
      path: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    };
    results.push(result);
    contactRows.push({ id: c.id, dataUrl: row.dataUrl, forced: row.forced });
    console.log('OK', c.id, result.path, row.forced ? '(forced fallback baseline)' : '');
  }

  const reportPath = path.join(
    OUT_DIR,
    only ? `report-${only}${artifactSuffix}.json` : `report${artifactSuffix}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: results.filter((r) => r.ok).length,
    expectedCount: selectedCases.length,
    results,
  }, null, 2));

  const contactHtml = `<!doctype html><html><head><style>
    body{margin:0;padding:20px;background:#e2e8f0;font-family:Arial,sans-serif}
    h1{font-size:28px;color:#0f172a;margin:0 0 18px}
    .grid{display:grid;grid-template-columns:repeat(2,640px);gap:18px}
    .card{background:#fff;padding:10px;border-radius:12px;box-shadow:0 2px 8px #64748b44}
    .label{font-size:20px;font-weight:800;color:#1e293b;margin:0 0 8px}
    img{display:block;width:620px;height:auto;border:1px solid #cbd5e1}
  </style></head><body><h1>Board Type Baselines — ${contactRows.length}/${selectedCases.length}</h1>
  <div class="grid">${contactRows.map((row) =>
    `<div class="card"><div class="label">${row.id}${row.forced ? ' · fallback' : ''}</div><img src="${row.dataUrl}"></div>`
  ).join('')}</div></body></html>`;
  await page.setViewportSize({ width: 1330, height: 900 });
  await page.setContent(contactHtml, { waitUntil: 'load' });
  const contactPath = path.join(
    OUT_DIR,
    only ? `contact-${only}${artifactSuffix}.jpg` : `contact${artifactSuffix}.jpg`
  );
  await page.screenshot({ path: contactPath, fullPage: true, type: 'jpeg', quality: 88 });

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log('Wrote', path.relative(ROOT, reportPath), `(${results.length - failed.length}/${CASES.length})`);
  console.log('Wrote', path.relative(ROOT, contactPath));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
