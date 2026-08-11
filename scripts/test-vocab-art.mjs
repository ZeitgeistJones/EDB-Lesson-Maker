/**
 * VocabArt / F13 ladder smoke (no browser).
 * Cases: 1 pack hit, 3 cold index throws, 4 headNounOk, 6 curatedGlyph, 7 none→dropped
 *
 *   node scripts/test-vocab-art.mjs
 *   npm run test:vocab-art
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

function fileFetch(url) {
  const u = String(url).replace(/^\//, '');
  const rel = u.startsWith('assets/') ? path.join(PUBLIC, u)
    : u.includes('propPolicy') ? path.join(PUBLIC, 'lib/propPolicy.json')
    : u.includes('09_props/manifest') ? path.join(PUBLIC, 'assets/09_props/manifest.json')
    : u.includes('07_vocab-pack/index') ? path.join(PUBLIC, 'assets/07_vocab-pack/index.json')
    : null;
  if (!rel || !fs.existsSync(rel)) {
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    });
  }
  const body = fs.readFileSync(rel);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

function loadSandbox() {
  const sandbox = {
    window: {},
    console,
    fetch: fileFetch,
  };
  vm.createContext(sandbox);
  for (const rel of [
    'public/lib/propBank.js',
    'public/lib/vocabIcons.js',
    'public/lib/vocabArt.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  }
  return sandbox.window;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

async function main() {
  const W = loadSandbox();
  await W.PropBank.ready();
  await W.VocabIcons.ready();
  assert(W.VocabIcons.indexReady(), 'case1: indexReady after ready()');

  // Case 1 — pack hit when index warm (soccer / ball-like sports word with pack row)
  const sports = {
    title: 'Sports Day',
    vocabulary: [
      { word: 'soccer', emoji: '❌' },
      { word: 'basketball', emoji: '❌' },
    ],
  };
  const art1 = W.VocabArt.planFor(sports, { seed: sports.title });
  const soccer = art1.rows.find((r) => r.word === 'soccer');
  assert(soccer && soccer.tier === 'pack' && soccer.artSrc, 'case1: soccer pack tier');
  assert(soccer.matchable, 'case1: soccer matchable');

  // Case 6 — curatedGlyph, no Gemini fallback (coach override → cap)
  const glyph = W.VocabIcons.curatedGlyph('coach');
  assert(glyph === '🧢', 'case6: curatedGlyph(coach)=cap');
  assert(W.VocabIcons.curatedGlyph('zzzz-not-a-word') == null, 'case6: unknown → null (not bullet)');
  assert(W.VocabIcons.emojiFor('zzzz-not-a-word', '🤖') === '🤖', 'case6: emojiFor still allows explicit fallback');

  // Case 7 — none → dropped (nonsense word with no pack/prop/glyph)
  const hollow = {
    title: 'Odd Words',
    vocabulary: [
      { word: 'soccer', emoji: '⚽' },
      { word: 'xqztplmnb', emoji: '•' },
    ],
  };
  const art7 = W.VocabArt.planFor(hollow, { seed: hollow.title });
  const drop = art7.dropped.find((r) => r.word === 'xqztplmnb');
  assert(drop && drop.tier === 'none', 'case7: nonsense dropped');
  assert(art7.matchable.every((r) => r.word !== 'xqztplmnb'), 'case7: not in matchable');

  // Case 4 — headNounOk rejects modifier-only compounds (grandfather ↛ grandfather-clock)
  const clock = W.PropBank.resolve({ word: 'grandfather', seed: 'clock shop', minScore: 4 });
  if (clock) {
    assert(
      !W.VocabArt.headNounOk('grandfather', clock) || !/clock/.test(clock.key),
      'case4: grandfather must not head-ok a *-clock prop'
    );
  } else {
    // Empty resolve is also correct post f2db9af
    assert(true, 'case4: grandfather resolves null (head-noun gate)');
  }

  // Case 3 — cold index throws; failed load must not permanent-cache {}
  const W2 = loadSandbox();
  let threw = false;
  try {
    W2.VocabArt.planFor(sports, { seed: 'cold' });
  } catch (e) {
    threw = /cold|not ready|VocabIcons/i.test(String(e && e.message));
  }
  assert(threw, 'case3: planFor throws when index cold');

  // Simulate failed fetch: ready rejects and indexCache stays null (retryable)
  const W3 = loadSandbox();
  const brokenFetch = () => Promise.resolve({
    ok: false,
    status: 500,
    json: async () => { throw new Error('no'); },
  });
  // Re-bind fetch on a fresh sandbox by monkey-patching VocabIcons ready path:
  // call loadIndex via ready after swapping window fetch — recreate with failing fetch.
  const failBox = {
    window: {},
    console,
    fetch: () => Promise.reject(new Error('network down')),
  };
  vm.createContext(failBox);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'public/lib/vocabIcons.js'), 'utf8'),
    failBox,
    { filename: 'vocabIcons.js' }
  );
  let rejected = false;
  try {
    await failBox.window.VocabIcons.ready();
  } catch (_) {
    rejected = true;
  }
  assert(rejected, 'case3: ready() rejects on fetch failure');
  assert(!failBox.window.VocabIcons.indexReady(), 'case3: index not warm after failure');
  assert(!!failBox.window.VocabIcons.loadError(), 'case3: loadError set');
  // Same-instance retry must work — failures must not lock a permanent {} cache.
  failBox.fetch = fileFetch;
  await failBox.window.VocabIcons.ready();
  assert(failBox.window.VocabIcons.indexReady(), 'case3: same-instance retry warms index');
  assert(!failBox.window.VocabIcons.loadError(), 'case3: loadError cleared after retry');

  // Case: soccer coach → job-coach prop (not whistle metonymy / not teacher emoji)
  const soccerCoach = {
    title: 'Soccer Practice with Coach',
    vocabulary: [
      { word: 'coach', emoji: '🧑‍🏫' },
      { word: 'whistle', emoji: '📣' },
      { word: 'ball', emoji: '⚽' },
    ],
  };
  const artJobs = W.VocabArt.planFor(soccerCoach, { seed: soccerCoach.title });
  const coachRow = artJobs.rows.find((r) => r.word === 'coach');
  assert(coachRow && coachRow.matchable, 'jobs: coach matchable');
  assert(coachRow.tier === 'prop', 'jobs: coach prop tier (job-coach cutout)');
  assert(coachRow.propKey === 'job-coach', 'jobs: coach→job-coach not whistle');
  assert(coachRow.artSrc && /job-coach/.test(coachRow.artSrc), 'jobs: coach artSrc is job-coach');
  assert(coachRow.tier !== 'none', 'jobs: coach not dropped');

  // Sport lesson: ball skips volleyball pack → soccer-ball prop
  const ballRow = artJobs.rows.find((r) => r.word === 'ball');
  assert(ballRow && ballRow.matchable, 'sport-ball: ball matchable');
  assert(ballRow.tier === 'prop', 'sport-ball: ball prop tier (not volleyball pack)');
  assert(ballRow.propKey === 'soccer-ball', 'sport-ball: ball→soccer-ball');
  assert(ballRow.artSrc && /soccer-ball/.test(ballRow.artSrc), 'sport-ball: artSrc soccer-ball');
  assert(W.VocabArt.isSportBallLesson(soccerCoach, soccerCoach.title), 'sport-ball: lesson flagged sport');

  // Non-sport: bare ball still uses pack (do not break park / generic ball)
  const parkBall = {
    title: 'Park Play Time',
    vocabulary: [
      { word: 'ball', emoji: '⚽' },
      { word: 'slide', emoji: '🛝' },
    ],
  };
  const artPark = W.VocabArt.planFor(parkBall, { seed: parkBall.title });
  const parkBallRow = artPark.rows.find((r) => r.word === 'ball');
  assert(parkBallRow && parkBallRow.tier === 'pack', 'park-ball: still pack tier');
  assert(/ball\.png/.test(parkBallRow.artSrc || ''), 'park-ball: pack ball.png');
  assert(!W.VocabArt.isSportBallLesson(parkBall, parkBall.title), 'park-ball: not sport lesson');

  // Dedup: two words cannot claim the same pack src
  const twin = {
    title: 'Twin share',
    vocabulary: [
      { word: 'soccer', emoji: 'x' },
      { word: 'football', emoji: 'x' }, // often aliases toward soccer pack
    ],
  };
  const artTwin = W.VocabArt.planFor(twin, { seed: twin.title });
  const srcs = artTwin.matchable.map((r) => r.artSrc).filter(Boolean);
  assert(new Set(srcs).size === srcs.length, 'dedupe: unique artSrc among matchable');

  // Soft / decorative blob must not ship on New Words (gashapon-robot gate hole).
  // Clubs white sheet now supplies exact pack rows — keep those; still refuse soft robots.
  const clubs = {
    title: 'All Kinds of School Clubs',
    vocabulary: [
      { word: 'art' },
      { word: 'choir' },
      { word: 'math' },
      { word: 'drama' },
      { word: 'chess' },
      { word: 'robot' },
    ],
  };
  const artClubs = W.VocabArt.planFor(clubs, { seed: clubs.title });
  const robotRow = artClubs.rows.find((r) => r.word === 'robot');
  assert(robotRow, 'clubs: robot row present');
  assert(robotRow.propKey !== 'gashapon-robot', 'clubs: robot must not use soft gashapon-robot');
  assert(robotRow.propKey !== 'space-robot-gray', 'clubs: robot must not use soft space-robot-gray');
  assert(
    !(robotRow.artSrc && /gashapon-robot|space-robot-gray/.test(robotRow.artSrc)),
    'clubs: robot artSrc must not be soft robot PNG'
  );
  assert(robotRow.tier === 'pack' && /robot\.png/.test(robotRow.artSrc || ''), 'clubs: robot → exact pack');
  assert(robotRow.matchable, 'clubs: robot matchable via pack');
  const chessRow = artClubs.rows.find((r) => r.word === 'chess');
  assert(chessRow && chessRow.tier === 'pack', 'clubs: chess pack tier');
  for (const w of ['art', 'choir', 'math', 'drama']) {
    const row = artClubs.rows.find((r) => r.word === w);
    assert(row && row.tier === 'pack', `clubs: ${w} exact pack (vocab-clubs sheet)`);
  }

  // Black-field props fill New Words when no pack icon (dock-sharp + identity-clear)
  const propOnly = {
    title: 'Sports Kit and Science Desk',
    vocabulary: [
      { word: 'clipboard' },
      { word: 'eraser' },
      { word: 'microscope' },
      { word: 'glue' },
      { word: 'goal' },
      { word: 'cone' },
    ],
  };
  const artProp = W.VocabArt.planFor(propOnly, { seed: propOnly.title });
  const expectProp = {
    clipboard: 'clipboard',
    eraser: 'eraser',
    glue: 'office-liquid-glue',
    goal: 'soccer-goal',
  };
  for (const [w, wantKey] of Object.entries(expectProp)) {
    const row = artProp.rows.find((r) => r.word === w);
    assert(row && row.tier === 'prop', `prop-fill: ${w} prop tier (no pack)`);
    assert(row.propKey === wantKey, `prop-fill: ${w}→${wantKey} (got ${row && row.propKey})`);
    assert(row.matchable && row.artSrc, `prop-fill: ${w} matchable artSrc`);
    assert(!W.VocabIcons.pathForSync(w), `prop-fill: ${w} still has no pack icon`);
  }
  const microRow = artProp.rows.find((r) => r.word === 'microscope');
  assert(microRow && microRow.tier === 'prop', 'prop-fill: microscope prop tier');
  assert(
    microRow.propKey && /microscope/.test(microRow.propKey),
    `prop-fill: microscope→*-microscope (got ${microRow && microRow.propKey})`
  );
  assert(!W.VocabIcons.pathForSync('microscope'), 'prop-fill: microscope still has no pack icon');
  const coneRow = artProp.rows.find((r) => r.word === 'cone');
  assert(coneRow && coneRow.tier === 'prop', 'prop-fill: cone prop tier');
  assert(coneRow.propKey && /cone/.test(coneRow.propKey), 'prop-fill: cone→*-cone cutout');
  assert(!W.VocabIcons.pathForSync('cone'), 'prop-fill: cone still has no pack icon');

  // Stand-in pack (gym→basketball) yields to tight city-gym prop; dental brush keeps toothbrush pack
  const gymLesson = {
    title: 'Gym Class Today',
    vocabulary: [{ word: 'gym' }, { word: 'clipboard' }],
  };
  const artGym = W.VocabArt.planFor(gymLesson, { seed: gymLesson.title });
  const gymRow = artGym.rows.find((r) => r.word === 'gym');
  assert(W.VocabIcons.isStandInPack('gym'), 'stand-in: gym pack is alias');
  assert(gymRow && gymRow.tier === 'prop', 'stand-in: gym prefers tight prop over basketball pack');
  assert(gymRow.propKey === 'city-gym', 'stand-in: gym→city-gym');
  const dentalBrush = {
    title: 'Brush Your Teeth Dental',
    vocabulary: [{ word: 'brush' }, { word: 'toothpaste' }],
  };
  const artBrush = W.VocabArt.planFor(dentalBrush, { seed: dentalBrush.title });
  const brushRow = artBrush.rows.find((r) => r.word === 'brush');
  assert(brushRow && brushRow.tier === 'pack', 'stand-in: brush keeps toothbrush pack (not paintbrush)');
  assert(/toothbrush/.test(brushRow.artSrc || ''), 'stand-in: brush artSrc toothbrush pack');

  assert(W.VocabArt.MAX_BOARD_VOCAB === 6, 'MAX_BOARD_VOCAB === 6');
  assert(W.VocabArt.slug("don't") === 'dont', 'slug: don\'t → dont');

  // Coverage adapt — promote picturable overflow into the board six (same topic).
  const adaptLesson = {
    title: 'Weekend Sports Club',
    vocabulary: [
      { word: 'xqzaaa' },
      { word: 'xqzbbb' },
      { word: 'xqzccc' },
      { word: 'xqzddd' },
      { word: 'xqzeee' },
      { word: 'xqzfff' },
      { word: 'soccer' },
      { word: 'pencil' },
    ],
  };
  const adapt = W.VocabArt.adaptBoardVocabulary(adaptLesson, { seed: adaptLesson.title });
  assert(adapt.adapted, 'adapt: reorders when overflow has art');
  const boardSix = adaptLesson.vocabulary.slice(0, 6).map((v) => v.word);
  assert(boardSix.includes('soccer'), 'adapt: soccer promoted onto board');
  assert(boardSix.includes('pencil'), 'adapt: pencil promoted onto board');
  assert(!boardSix.includes('xqzaaa') || adapt.board.includes('soccer'), 'adapt: board prefers art words');
  const again = W.VocabArt.adaptBoardVocabulary(adaptLesson, { seed: adaptLesson.title });
  assert(again.adapted === adapt.adapted, 'adapt: idempotent flag');
  assert(
    adaptLesson.vocabulary.slice(0, 6).map((v) => v.word).join('|') === boardSix.join('|'),
    'adapt: second call does not reshuffle'
  );

  console.log('OK vocab-art cases 1,3,4,6,7 + jobs/coach + sport-ball + dedupe + clubs-pack + prop-fill + stand-in + adapt', {
    soccerTier: soccer.tier,
    coachGlyph: glyph,
    coachTier: coachRow.tier,
    coachProp: coachRow.propKey,
    ballTier: ballRow.tier,
    ballProp: ballRow.propKey,
    parkBallTier: parkBallRow.tier,
    robotTier: robotRow.tier,
    robotSrc: robotRow.artSrc,
    gymProp: gymRow.propKey,
    brushTier: brushRow.tier,
    adaptBoard: boardSix,
    adaptPromoted: adapt.promoted,
    propFill: Object.fromEntries(
      artProp.rows.map((r) => [r.word, r.propKey])
    ),
    dropped: art7.dropped.map((d) => d.word),
    grandfather: clock ? clock.key : null,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
