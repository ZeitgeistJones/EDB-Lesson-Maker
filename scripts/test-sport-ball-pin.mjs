/**
 * Sport-ball pin + white-plate gate smoke.
 *   node scripts/test-sport-ball-pin.mjs
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

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

const sandbox = { window: {}, console, fetch: fileFetch, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of [
  'public/lib/lessonTraits.js',
  'public/lib/vocabIcons.js',
  'public/lib/propBank.js',
  'public/lib/vocabArt.js',
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });
}

await sandbox.window.VocabIcons.ready();
await sandbox.window.PropBank.ready();

assert(
  sandbox.window.VocabArt.sportBallPinKey({ title: 'Sports and Games', vocabulary: [{ word: 'ball' }] }, 'Sports and Games') === 'sport-soccer',
  'generic sports ball pin → sport-soccer'
);
assert(
  sandbox.window.VocabArt.sportBallPinKey({ title: 'Basketball Fun', vocabulary: [{ word: 'ball' }, { word: 'hoop' }] }, 'Basketball Fun') === 'sport-basketball',
  'basketball pin → sport-basketball'
);

const sports = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/sports-and-games-lesson.json'), 'utf8')
);
const art = sandbox.window.VocabArt.planFor(sports, { seed: sports.title });
const ball = art.rows.find((r) => r.word === 'ball');
assert(ball && ball.tier !== 'pack', 'sports ball not white pack, got ' + (ball && ball.tier));
assert(
  (ball.tier === 'glyph' && ball.glyph === '⚽')
    || (ball.tier === 'prop' && ball.propKey && ball.propKey !== 'soccer-ball' && ball.propKey !== 'sport-soccer'),
  'sports ball uses clean glyph or non-fringed prop, got ' + JSON.stringify({ tier: ball.tier, glyph: ball.glyph, propKey: ball.propKey })
);
assert(!/07_vocab-pack/.test(String(ball.artSrc || '')), 'sports ball not white pack path');

const score = art.rows.find((r) => r.word === 'score');
assert(score && score.tier === 'prop' && score.propKey === 'sport-gold-medal',
  'sports score is gold medal prop, got ' + JSON.stringify(score && { tier: score.tier, propKey: score.propKey }));

const game = art.rows.find((r) => r.word === 'game');
assert(game && game.tier === 'glyph', 'sports game is glyph (sense-blocked video art)');
assert(game.glyph === '🎯', 'sports game glyph is target not medal/controller, got ' + game.glyph);

const packTiers = art.rows.filter((r) => r.tier === 'pack');
assert(packTiers.length === 0, 'board bake ships no pack white-plates, got ' + packTiers.map((r) => r.word).join(','));

console.log('OK sport-ball pin + no white-plate pack on sports fixture', {
  ball: { tier: ball.tier, glyph: ball.glyph, propKey: ball.propKey },
  game: game.glyph,
  tiers: art.rows.map((r) => r.word + ':' + r.tier),
});
