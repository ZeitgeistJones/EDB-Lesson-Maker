/**
 * Producer topic-understanding streak harness.
 *
 * Pass bar: 5 consecutive *unseen topics* (not rounds). Any fail resets streak.
 * Beekeeping / Volcanoes = regression only (do not count toward streak).
 *
 *   npm run test:producer-topic-streak
 *   node scripts/producer-topic-streak.mjs --from=1
 *
 * Evidence: producer-tests/round-NNN/{regression,unseen,validation.json,summary.md}
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT_ROOT = path.join(ROOT, 'producer-tests');

const MAX_ROUNDS = 10;
const STREAK_TARGET = 5;

const REGRESSION = ['Beekeeping', 'Volcanoes'];

/** Diverse unseen queue — one domain after another; never Beekeeping/Volcanoes. */
const UNSEEN_QUEUE = [
  'Coral Reefs',
  'Locksmith',
  'Recycling Center',
  'Pottery',
  'Archaeology',
  'Earthquakes',
  'Florist',
  'Airport Baggage',
  'Photography',
  'Lighthouse Keeping',
  'Weather Stations',
  'Optician',
  'Train Station',
  'Sewing',
  'Mapmaking',
  'Insects',
  'Postal Service',
  'Museum Archive',
  'Camping',
  'Medieval Castle',
];

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function loadProducer() {
  const packIndex = JSON.parse(
    fs.readFileSync(path.join(PUBLIC, 'assets/07_vocab-pack/index.json'), 'utf8')
  );
  function fileFetch(url) {
    const u = String(url);
    let rel = null;
    if (u.includes('07_vocab-pack/index')) rel = path.join(PUBLIC, 'assets/07_vocab-pack/index.json');
    else if (u.includes('propPolicy')) rel = path.join(PUBLIC, 'lib/propPolicy.json');
    else if (u.includes('09_props/manifest')) rel = path.join(PUBLIC, 'assets/09_props/manifest.json');
    else if (u.includes('08_backgrounds/manifest')) rel = path.join(PUBLIC, 'assets/08_backgrounds/manifest.json');
    if (!rel || !fs.existsSync(rel)) {
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => JSON.parse(fs.readFileSync(rel, 'utf8')),
    });
  }
  const sandbox = {
    window: { __TOPIC_PACK_KEYS__: Object.keys(packIndex) },
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
    'public/lib/producerQuality.js',
    'public/lib/propBank.js',
    'public/lib/vocabIcons.js',
    'public/lib/vocabArt.js',
    'public/lib/lessonTraits.js',
    'public/lib/sceneBackgrounds.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  }
  return sandbox.window;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

function runTopic(W, topic, kind, outDir) {
  const PQ = W.ProducerQuality;
  const TI = W.TopicIdentity;

  let lesson;
  if (kind === 'regression' && /beekeep/i.test(topic)) {
    lesson = {
      title: 'Beekeeping',
      targetVocabCount: 6,
      vocabulary: [
        { word: 'honeycomb' },
        { word: 'bee' },
        { word: 'farm' },
      ],
      warmUp: { question: 'What animals live on a farm?', sampleAnswer: 'Cows.' },
      story: {
        title: 'On the farm',
        pages: [
          {
            heading: 'Hive',
            text: 'The beekeeper opens the hive. Bees make honey. The queen is in the colony.',
            visualTheme: 'farm',
            visualCaption: 'beekeeper at hive',
          },
          {
            heading: 'Honey',
            text: 'The beekeeper takes honey from the hive. The colony is busy.',
            visualTheme: 'farm',
            visualCaption: 'honey',
          },
          {
            heading: 'Nectar',
            text: 'Bees bring nectar to the hive. The beekeeper smiles.',
            visualTheme: 'farm',
            visualCaption: 'nectar',
          },
        ],
      },
      sentenceFrames: [
        'The beekeeper opens the ___.',
        'Bees make ___.',
        'The queen lives in the ___.',
        'Bees collect ___.',
      ],
      activity: {
        title: 'Farm words',
        prompt: 'Talk about the farm.',
        templates: ['I see a ___.', 'This is a ___.', 'We need a ___.', 'Find the ___.'],
      },
    };
  } else {
    lesson = PQ.synthesizeFromTopic(topic, { level: 'A1' });
  }

  const brief = TI.buildBrief(lesson);
  lesson.topicBrief = brief;
  lesson._topicBrief = brief;

  const before = PQ.validate(lesson, { topicBrief: brief });
  const fixed = before.pass
    ? { lesson, report: before, repairs: [] }
    : PQ.repair(lesson, { topicBrief: brief, maxAttempts: 3 });

  const finalLesson = fixed.lesson;
  const report = fixed.report;
  const topicDir = path.join(outDir, topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  ensureDir(topicDir);
  writeJson(path.join(topicDir, 'topic-brief.json'), finalLesson.topicBrief || brief);
  writeJson(path.join(topicDir, 'lesson.json'), {
    topic,
    level: 'A1',
    duration: '30',
    vocabulary: finalLesson.vocabulary,
    warmUp: finalLesson.warmUp,
    story: finalLesson.story,
    activity: finalLesson.activity,
    outline: {
      title: finalLesson.title,
      coreConcepts: (finalLesson.topicBrief || brief).coreConcepts,
    },
  });
  writeJson(path.join(topicDir, 'validation.json'), {
    topic,
    kind,
    pass: !!report.pass,
    failures: report.failures || [],
    checks: report.checks || [],
    repairs: fixed.repairs || [],
    beforeFailures: before.failures || [],
  });

  return {
    topic,
    kind,
    pass: !!report.pass,
    failures: report.failures || [],
    checks: report.checks || [],
    repairs: fixed.repairs || [],
    coreConcepts: (finalLesson.topicBrief || brief).coreConcepts,
    vocabulary: (finalLesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v.word)),
    dir: topicDir,
  };
}

function runRegression(W, roundDir) {
  const regDir = path.join(roundDir, 'regression');
  ensureDir(regDir);
  return REGRESSION.map((t) => runTopic(W, t, 'regression', regDir));
}

async function main() {
  const queueStart = Math.max(0, Number(arg('from', '0')) || 0);
  const W = loadProducer();
  await W.VocabIcons.ready();
  W.__TOPIC_PACK_KEYS__ = W.VocabIcons.allKeys();

  let streak = 0;
  let improvementRounds = 0;
  const passed = [];
  const history = [];
  let queueIdx = queueStart;
  let round = 0;

  while (streak < STREAK_TARGET && improvementRounds < MAX_ROUNDS && queueIdx < UNSEEN_QUEUE.length) {
    round += 1;
    const roundId = String(round).padStart(3, '0');
    const roundDir = path.join(OUT_ROOT, `round-${roundId}`);
    const unDir = path.join(roundDir, 'unseen');
    ensureDir(unDir);

    console.log(`\n████ ROUND ${round} — streak ${streak}/${STREAK_TARGET} — next “${UNSEEN_QUEUE[queueIdx]}” ████`);

    const regression = runRegression(W, roundDir);
    const regOk = regression.every((r) => r.pass);
    if (!regOk) {
      streak = 0;
      improvementRounds += 1;
      console.error('REGRESSION FAIL');
      for (const r of regression.filter((x) => !x.pass)) {
        console.error(`  XX ${r.topic}: ${r.failures.join(', ')}`);
      }
      writeJson(path.join(roundDir, 'validation.json'), {
        round,
        streak,
        regression,
        unseen: [],
        stop: 'REGRESSION_FAIL',
      });
      fs.writeFileSync(
        path.join(roundDir, 'summary.md'),
        `# Round ${round}\n\nRegression failed. Fix TopicIdentity/ProducerQuality generally.\n`
      );
      writeJson(path.join(OUT_ROOT, 'final-report.json'), {
        stopReason: 'REGRESSION_FAIL',
        streak,
        history,
        passed,
      });
      process.exit(1);
    }

    const topic = UNSEEN_QUEUE[queueIdx];
    queueIdx += 1;
    const result = runTopic(W, topic, 'unseen', unDir);
    history.push({ round, topic, pass: result.pass, failures: result.failures, vocabulary: result.vocabulary });

    writeJson(path.join(roundDir, 'validation.json'), {
      round,
      streakBefore: streak,
      streakAfter: result.pass ? streak + 1 : 0,
      regression,
      unseen: [result],
      generatedAt: new Date().toISOString(),
    });
    fs.writeFileSync(
      path.join(roundDir, 'summary.md'),
      [
        `# Round ${round}`,
        '',
        `- topic: ${topic}`,
        `- result: ${result.pass ? 'PASS' : 'FAIL'}`,
        `- streak: ${result.pass ? streak + 1 : 0}/${STREAK_TARGET}`,
        `- vocab: ${(result.vocabulary || []).join(' · ')}`,
        `- core: ${(result.coreConcepts || []).join(' · ')}`,
        `- failures: ${(result.failures || []).join(', ') || 'none'}`,
        '',
      ].join('\n')
    );

    if (result.pass) {
      streak += 1;
      passed.push({
        topic: result.topic,
        vocabulary: result.vocabulary,
        coreConcepts: result.coreConcepts,
        checks: (result.checks || []).filter((c) => c.pass).map((c) => c.code),
      });
      // Anti-gaming: repaired/synthesized primary set must stay complete.
      if ((result.vocabulary || []).length < 5) {
        console.error(`FAIL ${topic} — vocab shrunk to ${(result.vocabulary || []).length} (anti-gaming)`);
        streak = 0;
        improvementRounds += 1;
        break;
      }
      console.log(`PASS ${topic} — streak ${streak}/${STREAK_TARGET}`);
      console.log(`  vocab: ${(result.vocabulary || []).join(' · ')}`);
    } else {
      streak = 0;
      improvementRounds += 1;
      console.error(`FAIL ${topic} — streak reset (improvement round ${improvementRounds}/${MAX_ROUNDS})`);
      console.error(`  failures: ${result.failures.join(', ')}`);
      console.error(`  vocab: ${(result.vocabulary || []).join(', ')}`);
      console.error(`  core: ${(result.coreConcepts || []).join(', ')}`);
      writeJson(path.join(roundDir, 'failure-report.json'), {
        topic,
        failures: result.failures,
        category: result.failures[0] || 'UNKNOWN',
        advice: [
          'Diagnose the general failure category (brief / vocab / story / activity / assets).',
          'Change reusable TopicIdentity / ProducerQuality logic — no topic if-branches.',
          `Re-run after fix: node scripts/producer-topic-streak.mjs --from=${queueIdx}`,
        ],
      });
      // Offline synthesizer should usually pass after producer fixes; stop so
      // the agent can patch the general gate rather than spinning.
      break;
    }
  }

  const stopReason = streak >= STREAK_TARGET
    ? 'STREAK_COMPLETE'
    : improvementRounds >= MAX_ROUNDS
      ? 'MAX_ROUNDS'
      : 'STOPPED_ON_FAIL';

  const final = {
    stopReason,
    streak,
    target: STREAK_TARGET,
    improvementRounds,
    passedUnseen: passed.slice(-STREAK_TARGET),
    history,
  };
  writeJson(path.join(OUT_ROOT, 'final-report.json'), final);

  console.log('\n════════ FINAL ════════');
  console.log(`streak=${streak}/${STREAK_TARGET} stop=${stopReason}`);
  if (final.passedUnseen && final.passedUnseen.length) {
    for (const p of final.passedUnseen) {
      console.log(`PASS ${p.topic} — ${(p.vocabulary || []).join(' · ')}`);
      console.log(`     checks: ${(p.checks || []).join(', ')}`);
    }
  }
  if (streak < STREAK_TARGET) {
    console.error('\nFAILED to reach 5 consecutive unseen passes.');
    process.exit(1);
  }
  console.log('\nOK producer topic streak — 5 consecutive unseen passes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
