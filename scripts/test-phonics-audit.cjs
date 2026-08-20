/**
 * Phonics audit matrix (PH1/PH2 first slice).
 * Cases 1–9: acceptsGraphemes / split vs eligibility.
 * Cases 10–12: normalize / edb shim — still open (PH3/PH5/PH6); skipped until those land.
 *
 * Run: npm run test:phonics
 */
const PhonicsPolicy = require('../public/lib/phonicsPolicy.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const OPEN = {
  8: 'PH4 cluster rejection',
  10: 'PH3 distractor filter over letters',
  // #11: with PH1, Gemini over-splits are rejected so the bank row is admitted;
  // full PH5 (replace accepted Gemini with bank when both present) still open.
  12: 'PH6 delete legacy normalizePhonics fallback',
};

let passed = 0;
let skipped = 0;

function run(n, title, fn) {
  if (OPEN[n]) {
    console.log(`skip #${n} ${title} — open: ${OPEN[n]}`);
    skipped += 1;
    return;
  }
  fn();
  console.log(`ok   #${n} ${title}`);
  passed += 1;
}

// --- PH1: required-multigraph reject ---
run(1, "ship → s|h|i|p A2 reject (breaks sh)", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('ship', ['s', 'h', 'i', 'p'], 'A2') === false,
    'over-split ship must reject'
  );
});

run(2, "ship → sh|i|p A2 accept", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('ship', ['sh', 'i', 'p'], 'A2') === true,
    'correct ship split must accept'
  );
});

run(3, "shy → s|h|y A2 reject (breaks sh)", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('shy', ['s', 'h', 'y'], 'A2') === false,
    'over-split shy must reject'
  );
});

// --- PH2: split validity vs word-eligibility ---
run(4, "shy → sh|y well-formed but word too thin", () => {
  assert(
    PhonicsPolicy.isSplitWellFormed('shy', ['sh', 'y'], 'A2') === true,
    'shy→[sh,y] is a correct split'
  );
  assert(
    PhonicsPolicy.wordEligibleForLevel('shy', ['sh', 'y'], 'A2') === false,
    '2 boxes under A2 minBoxes'
  );
  assert(
    PhonicsPolicy.acceptsGraphemes('shy', ['sh', 'y'], 'A2') === false,
    'page rejects the word, not by preferring s|h|y'
  );
  assert(
    PhonicsPolicy.acceptsGraphemes('shy', ['s', 'h', 'y'], 'A2') === false,
    'over-split still rejected'
  );
});

run(5, "cake → c|a|k|e B1 reject (lone magic-e)", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('cake', ['c', 'a', 'k', 'e'], 'B1') === false,
    'terminal lone e with magic-e allowed must reject'
  );
});

run(6, "cake → c|a|ke B1 accept", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('cake', ['c', 'a', 'ke'], 'B1') === true,
    'magic-e absorbed into last grapheme must accept'
  );
});

run(7, "rain → r|a|i|n B1 reject (breaks ai)", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('rain', ['r', 'a', 'i', 'n'], 'B1') === false,
    'vowel-team over-split must reject'
  );
  assert(
    PhonicsPolicy.acceptsGraphemes('rain', ['r', 'ai', 'n'], 'B1') === true,
    'correct rain split must accept'
  );
});

run(8, "best → b|e|st A2 reject (cluster)", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('best', ['b', 'e', 'st'], 'A2') === false,
    'st cluster must reject'
  );
});

run(9, "the → t|h|e A1 reject (irregular denylist)", () => {
  assert(
    PhonicsPolicy.acceptsGraphemes('the', ['t', 'h', 'e'], 'A1') === false,
    'irregular sight word must never be a decoding target'
  );
  assert(
    PhonicsPolicy.isSplitWellFormed('the', ['t', 'h', 'e'], 'A1') === false,
    'denylist hits before CVC-looking over-split'
  );
});

run(10, "focus ship distractors must not contain s/h", () => {
  const out = PhonicsPolicy.normalize(
    {
      vocabulary: [{ word: 'ship' }],
      phonics: {
        targetWords: [{ word: 'ship', graphemes: ['sh', 'i', 'p'], emoji: '🚢' }],
        distractors: ['s', 'h', 't'],
      },
    },
    { level: 'A2', phonics: 'on' }
  );
  assert(out, 'normalize should succeed');
  assert(!out.distractors.includes('s'), 'dock must not contain s');
  assert(!out.distractors.includes('h'), 'dock must not contain h');
  // t may remain
});

run(11, "bank split wins over Gemini over-split for ship", () => {
  const out = PhonicsPolicy.normalize(
    {
      vocabulary: [{ word: 'ship' }],
      phonics: {
        targetWords: [{ word: 'ship', graphemes: ['s', 'h', 'i', 'p'], emoji: '🚢' }],
        distractors: ['a', 't'],
      },
    },
    { level: 'A2', phonics: 'on' }
  );
  assert(out, 'normalize should succeed via bank');
  const ship = out.targetWords.find((w) => w.word === 'ship');
  assert(ship, 'ship present');
  assert(
    ship.graphemes.join('|') === 'sh|i|p',
    `expected bank split sh|i|p, got ${ship.graphemes.join('|')}`
  );
});

run(12, "normalizePhonics null when PhonicsPolicy absent", () => {
  // Exercised in browser edbActivities; Node stub documents expected contract.
  assert(false, 'edbActivities legacy fallback still accepts raw 3–5 box rows');
});

console.log(`phonics audit: ${passed} passed, ${skipped} skipped (open work)`);
if (passed < 1) throw new Error('expected PH1/PH2 cases to pass');
