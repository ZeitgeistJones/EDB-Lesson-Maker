/**
 * Smoke CEFR phonics gating + vocab-first fallback.
 */
const PhonicsPolicy = require('../public/lib/phonicsPolicy.js');
const fs = require('fs');
const path = require('path');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const zoo = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'zoo-phonics-lesson.json'), 'utf8')
);

// A1 must strip digraph/CVCC from zoo fixture and still yield a page via bank/vocab
const a1 = PhonicsPolicy.normalize(zoo, { level: 'A1', phonics: 'on' });
assert(a1, 'A1 normalize should succeed');
assert(a1.targetWords.every((w) => w.graphemes.length === 3), 'A1 only 3-box CVC');
assert(a1.targetWords.every((w) => w.graphemes.every((g) => g.length === 1)), 'A1 single-letter only');
assert(a1.distractors.length <= 2, 'A1 ≤2 distractors');
assert(a1.targetWords.some((w) => w.word === 'cat' || w.word === 'map'), 'A1 keeps vocab-friendly CVC');
console.log('A1 zoo →', a1.targetWords.map((w) => w.word + ':' + w.graphemes.join('-')).join(', '),
  'dist', a1.distractors.length);

// A2 may keep fish (sh) and jump
const a2 = PhonicsPolicy.normalize(zoo, { level: 'A2', phonics: 'on' });
assert(a2, 'A2 normalize should succeed');
assert(a2.targetWords.some((w) => w.word === 'fish' || w.word === 'jump' || w.word === 'cat'), 'A2 keeps zoo phonics');
assert(a2.distractors.length <= 3, 'A2 ≤3 distractors');
console.log('A2 zoo →', a2.targetWords.map((w) => w.word + ':' + w.graphemes.join('-')).join(', '));

// Irregular castle vocab → bank fill at A1
const castle = {
  title: 'I Live in a Castle',
  vocabulary: [
    { word: 'castle' }, { word: 'gate' }, { word: 'king' },
    { word: 'hall' }, { word: 'bed' }, { word: 'cat' },
  ],
  phonics: {
    targetWords: [
      { word: 'castle', graphemes: ['c', 'a', 'stle'] },
      { word: 'king', graphemes: ['k', 'i', 'ng'] },
    ],
    distractors: ['x', 'q', 'z', 'w'],
  },
};
const c1 = PhonicsPolicy.normalize(castle, { level: 'A1', phonics: 'on' });
assert(c1, 'castle A1 should succeed via bank/vocab');
assert(!c1.targetWords.some((w) => w.word === 'castle'), 'reject irregular castle');
assert(c1.targetWords.some((w) => w.word === 'cat' || w.word === 'bed'), 'prefer bed/cat from vocab/bank');
console.log('A1 castle →', c1.targetWords.map((w) => `${w.word}(${w.source})`).join(', '));

// C1 omits unless forced
assert(PhonicsPolicy.normalize(zoo, { level: 'C1' }) == null, 'C1 omits phonics');
assert(PhonicsPolicy.normalize(zoo, { level: 'C1', phonics: 'on' }), 'C1 with phonics=on keeps');

// Prompt blocks differ by level
const pA1 = PhonicsPolicy.promptBlock('A1', true);
const pOff = PhonicsPolicy.promptBlock('B1', false);
assert(/CVC/.test(pA1) && /SINGLE-LETTER/.test(pA1), 'A1 prompt mentions CVC');
assert(/Do NOT include a phonics object/.test(pOff), 'off prompt omits');

// Single-letter graphemes → Kenney letter-tile keys; digraphs stay text.
assert(PhonicsPolicy.letterPropKey('A') === 'kenney-letter-a', 'A → kenney-letter-a');
assert(PhonicsPolicy.letterPropKey('z') === 'kenney-letter-z', 'z → kenney-letter-z');
assert(PhonicsPolicy.letterPropKey('sh') == null, 'digraph sh → null (text fallback)');
assert(PhonicsPolicy.letterPropKey('ee') == null, 'vowel team ee → null');
assert(PhonicsPolicy.letterPropKey('') == null, 'empty → null');

console.log('ok: phonics policy smoke');
