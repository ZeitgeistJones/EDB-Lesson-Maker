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

  // Soft / decorative blob must not ship on New Words (gashapon-robot gate hole)
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
  assert(robotRow.tier === 'glyph' && robotRow.glyph === '🤖', 'clubs: robot → curated glyph until sharp art');
  assert(robotRow.matchable, 'clubs: robot still matchable via glyph');
  const chessRow = artClubs.rows.find((r) => r.word === 'chess');
  assert(chessRow && chessRow.tier === 'pack', 'clubs: chess pack tier');
  for (const w of ['art', 'choir', 'math', 'drama']) {
    const row = artClubs.rows.find((r) => r.word === w);
    assert(row && row.tier === 'none', `clubs: ${w} still coverage-gap (none)`);
  }

  assert(W.VocabArt.MAX_BOARD_VOCAB === 6, 'MAX_BOARD_VOCAB === 6');
  assert(W.VocabArt.slug("don't") === 'dont', 'slug: don\'t → dont');

  console.log('OK vocab-art cases 1,3,4,6,7 + jobs/coach + sport-ball + dedupe + clubs-robot', {
    soccerTier: soccer.tier,
    coachGlyph: glyph,
    coachTier: coachRow.tier,
    coachProp: coachRow.propKey,
    ballTier: ballRow.tier,
    ballProp: ballRow.propKey,
    parkBallTier: parkBallRow.tier,
    robotTier: robotRow.tier,
    robotGlyph: robotRow.glyph,
    dropped: art7.dropped.map((d) => d.word),
    grandfather: clock ? clock.key : null,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
