/**
 * Pre-A1 visual-language stockpile — harvest keys (stockpile only).
 * Waves: instructions, TPR, relations, phonology, prewriting, mnemonic A–Z,
 * articulation, interaction surfaces.
 *
 * Mnemonic A–Z mapping is locked in prea1-mnemonic-az-map.json — do not invent
 * a second phonics convention at fire time.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SAFETY_SKIP_KEYS = new Set([
  'rape',
  'massacre',
  'murder',
  'suicide',
  'torture',
  'missile',
  'bomb',
  'gun',
]);

export const STOCKPILE_REL = 'tmp/manus-prea1-stockpile';
export const TRACKED_INV_REL = 'docs/prea1-stockpile-inventory.json';

function c(key, brief, extra = {}) {
  return { key, brief, ...extra };
}

function sh(id, title, grid, cells) {
  return { id, title, grid, cells };
}

const SHARED_FIELD = `HARD FIELD: pure #000000 black edge to edge. One concept per cell. Clear black gutter. Nothing crossing cell boundaries. NO readable text, letters-as-labels, numbers, logos, watermarks on the art. Soft matte educational cutouts. quality: default only. Object bodies clearly colored (not near-black, not ghost-gray) so they survive a black-key.`;

export const WAVES = {
  1: {
    id: 'wave1-instructions',
    n: 1,
    kind: 'instructions',
    title: 'ESL Pre-A1 wave1 — instruction + feedback visuals',
    family: 'instructions',
    people: true,
    style: `${SHARED_FIELD}

FAMILY: universal classroom instruction + feedback icons. Child-friendly, text-light, obvious hands/body language, simple silhouettes, MINIMAL/NO scenery.
ONE consistent visual language: the same rounded cartoon child (short dark hair, blue shirt, simple shoes) on every gesture cell. Same hand style. Same palette.
UI chips (sheet 5) are NOT people — they are a matching token family (rounded tiles, same thickness, same glow language).
Do NOT invent a new metaphor per cell. No themed rooms.`,
    sheets: [
      sh('S1', 'greet + attention', '3x3', [
        c('prea1-instr-hello', 'child waving hello, big open palm, smiling, no scenery'),
        c('prea1-instr-goodbye', 'same child waving goodbye / turning slightly away, still clear wave'),
        c('prea1-instr-look', 'same child pointing to own eyes, then looking forward — LOOK'),
        c('prea1-instr-listen', 'same child cupping ear, head tilted — LISTEN'),
        c('prea1-instr-repeat', 'same child with a small echo/loop gesture (hand circling near mouth), no text'),
        c('prea1-instr-think', 'same child finger on temple, thinking pose'),
        c('prea1-instr-wait', 'same child both palms forward, waiting / hold on'),
        c('prea1-instr-stop', 'same child clear STOP palm facing camera'),
        c('prea1-instr-go', 'same child pointing forward, ready-to-go step'),
      ]),
      sh('S2', 'board actions', '3x3', [
        c('prea1-instr-show-me', 'child presenting an object on open palms toward camera — SHOW ME'),
        c('prea1-instr-point', 'child index finger pointing at a small generic target'),
        c('prea1-instr-touch', 'child fingertip touching a simple square'),
        c('prea1-instr-choose', 'child hand hovering then picking one of two simple shapes'),
        c('prea1-instr-drag', 'child hand pulling a simple token sideways (motion implied, no arrows-as-text)'),
        c('prea1-instr-match', 'two matching simple shapes being brought together by hands'),
        c('prea1-instr-trace', 'child finger following a dotted curve (dots OK, no letters)'),
        c('prea1-instr-colour', 'child crayon colouring a simple circle, bright stroke'),
        c('prea1-instr-say', 'child speaking, simple open mouth + small sound puff, no letters'),
      ]),
      sh('S3', 'turns + classroom talk', '3x3', [
        c('prea1-instr-my-turn', 'child pointing to self with a small turn-token in hand'),
        c('prea1-instr-your-turn', 'child offering the same turn-token toward camera'),
        c('prea1-instr-yes', 'child big nod + thumbs up, clear YES'),
        c('prea1-instr-no', 'child head shake + palms crossing, clear NO (friendly, not angry)'),
        c('prea1-instr-help', 'child raising hand, other hand on chest — HELP'),
        c('prea1-instr-finished', 'child showing empty hands / done gesture beside a small finish flag'),
        c('prea1-instr-again', 'child looping gesture (circular hand) — AGAIN'),
        c('prea1-instr-slow-down', 'child both palms pressing downward slowly — SLOW DOWN'),
        c('prea1-instr-quiet', 'child finger on lips, calm QUIET (not scared)'),
      ]),
      sh('S4', 'feedback gestures', '3x3', [
        c('prea1-instr-good-job', 'child celebrating small — clap or both fists happy, not fireworks scene'),
        c('prea1-instr-try-again', 'child encouraging retry: open palm + small loop, friendly not scolding'),
        c('prea1-instr-question', 'child puzzled shrug + head tilt; optional simple ?-shape as a PROP not text'),
        c('prea1-instr-celebration', 'child jumping tiny celebration, confetti dots OK, no scenery'),
        c('prea1-instr-calm-breathe', 'child hands on belly, eyes calm, small breath puffs — CALM / BREATHE'),
      ]),
      sh('S5', 'UI token family', '4x3', [
        c('prea1-ui-correct', 'green rounded check-token / correct chip, no letters, matching UI family'),
        c('prea1-ui-try-again', 'amber retry-loop chip, same tile language as correct'),
        c('prea1-ui-target-glow', 'empty drop-zone plate with a soft gold glow ring, mid-tone centre (not white, not black)'),
        c('prea1-ui-hidden', 'simple card BACK / covered tile (pattern, no text)'),
        c('prea1-ui-revealed', 'SAME card flipped FACE, empty picture window, same size as hidden'),
        c('prea1-ui-turn-token', 'small round turn token / pawn kids can drag, no letters'),
        c('prea1-ui-finish-flag', 'small finish flag on a pin, child-friendly'),
        c('prea1-ui-audio-cue', 'speaker / ear audio cue chip, no letters, not a real brand logo'),
        c('prea1-ui-start-marker', 'start star or green start-dot marker on a small pin'),
        c('prea1-ui-celebration-sparkle', 'small sparkle burst token, no people, no text'),
      ]),
    ],
  },

  2: {
    id: 'wave2-tpr',
    n: 2,
    kind: 'tpr',
    title: 'ESL Pre-A1 wave2 — TPR command action atoms',
    family: 'tpr',
    people: true,
    style: `${SHARED_FIELD}

FAMILY: Total Physical Response ACTION ATOMS. The ACTION must be unmistakable in one glance.
Reusable atoms — NOT "jump at the zoo". NO themed scenery, NO furniture sets, NO extra props unless the verb needs one object (eat=apple, brush=toothbrush).
SAME child as wave1 if possible (short dark hair, blue shirt). Full body, clear silhouette, one verb per cell.
Look / listen / point / touch / go / stop here are BODY ACTIONS, not UI chips.`,
    sheets: [
      sh('S1', 'classroom body', '3x3', [
        c('prea1-tpr-stand-up', 'child rising from a sit to stand, knees bent mid-stand'),
        c('prea1-tpr-sit-down', 'child sitting down onto an invisible seat, knees bent'),
        c('prea1-tpr-look', 'child looking hard at a small floating shape, body leaning'),
        c('prea1-tpr-listen', 'child cupping both ears, freeze-listen pose'),
        c('prea1-tpr-point', 'child full-arm point to the side'),
        c('prea1-tpr-touch', 'child touching a simple cube with one finger'),
        c('prea1-tpr-show', 'child holding a small ball out toward camera'),
        c('prea1-tpr-give', 'child handing a small ball to an unseen partner (arm extended)'),
        c('prea1-tpr-take', 'child receiving / taking a small ball into both hands'),
      ]),
      sh('S2', 'move + stop', '3x3', [
        c('prea1-tpr-open', 'child opening a simple box lid with both hands'),
        c('prea1-tpr-close', 'child closing the SAME simple box, lid down'),
        c('prea1-tpr-come', 'child beckoning toward self, come-here wave'),
        c('prea1-tpr-go', 'child walking away / stepping forward GO'),
        c('prea1-tpr-stop', 'child freeze, both feet planted, palm STOP'),
        c('prea1-tpr-clap', 'child clapping, hands meeting'),
        c('prea1-tpr-jump', 'child mid-jump, both feet off ground, no scenery'),
        c('prea1-tpr-turn-around', 'child spinning / turning, seeing back and face'),
        c('prea1-tpr-walk', 'child walking, one foot stepping'),
      ]),
      sh('S3', 'hands + care', '3x3', [
        c('prea1-tpr-run', 'child running, clear stride, no track scenery'),
        c('prea1-tpr-wave', 'child big hello wave, full arm'),
        c('prea1-tpr-pick-up', 'child bending to pick a block up from the ground line'),
        c('prea1-tpr-put-down', 'child placing a block down onto the ground line'),
        c('prea1-tpr-hold', 'child holding a block to chest with two hands'),
        c('prea1-tpr-reach', 'child reaching UP for a high block'),
        c('prea1-tpr-wash', 'child washing hands, water droplets, no sink scenery'),
        c('prea1-tpr-brush', 'child brushing teeth with a toothbrush'),
        c('prea1-tpr-eat', 'child biting a simple apple'),
      ]),
      sh('S4', 'rest + play', '3x3', [
        c('prea1-tpr-drink', 'child drinking from a cup'),
        c('prea1-tpr-sleep', 'child sleeping, eyes closed, simple crescent, no bed room'),
        c('prea1-tpr-play', 'child playing with a simple ball, happy, no playground'),
      ]),
    ],
  },

  3: {
    id: 'wave3-relations',
    n: 3,
    kind: 'relations',
    title: 'ESL Pre-A1 wave3 — concept/relationship systems',
    family: 'relations',
    people: false,
    style: `${SHARED_FIELD}

FAMILY: concept / relationship SYSTEMS. Matched pairs with STABLE irrelevant details — learner sees WHAT changed.
PAIR RULE: adjacent pair cells are the SAME object, SAME colour, SAME viewpoint, SAME ground. Only the named quality changes.
NO people. NO faces. NO hundreds of baked composites like "ball under table".
Spatial cells are reusable TOKENS (a simple icon of the relation), not unique story scenes.
Sheet 5 is generic LOCATION ANCHORS + movable objects kids can combine later.`,
    sheets: [
      sh('S1', 'identity', '3x3', [
        c('prea1-rel-same', 'two identical red balls side by side — SAME'),
        c('prea1-rel-different', 'red ball + blue cube — DIFFERENT (same scale)'),
        c('prea1-rel-match', 'two matching puzzle-piece tokens fitting together'),
        c('prea1-rel-not-match', 'two puzzle pieces that clearly do not fit'),
        c('prea1-rel-one', 'exactly ONE red block, empty space around it'),
        c('prea1-rel-many', 'MANY of the SAME red block in a cluster'),
        c('prea1-rel-all', 'a complete set of 4 matching blocks, grouped as ALL'),
        c('prea1-rel-first', 'a row of 3 beads, leftmost highlighted as FIRST'),
        c('prea1-rel-last', 'SAME row of 3 beads, rightmost highlighted as LAST'),
      ]),
      sh('S2', 'physical pairs A', '4x4', [
        c('prea1-rel-big', 'BIG red apple, fills most of cell'),
        c('prea1-rel-small', 'SAME red apple SMALL, lots of black around — pair with big'),
        c('prea1-rel-long', 'LONG blue ribbon / stick, horizontal'),
        c('prea1-rel-short', 'SAME blue ribbon SHORT — pair with long'),
        c('prea1-rel-tall', 'TALL green tree, same style'),
        c('prea1-rel-short-height', 'SAME green tree SHORT — pair with tall (not the long/short ribbon)'),
        c('prea1-rel-full', 'glass FULL of orange juice, mid-tone liquid'),
        c('prea1-rel-empty', 'SAME glass EMPTY, mid-tone interior (not white, not black)'),
        c('prea1-rel-clean', 'white-ish shirt CLEAN, neat'),
        c('prea1-rel-dirty', 'SAME shirt DIRTY with mud spots — pair with clean'),
        c('prea1-rel-open', 'simple box OPEN, mid-tone cavity'),
        c('prea1-rel-closed', 'SAME box CLOSED — pair with open'),
        c('prea1-rel-hot', 'mug with steam — HOT'),
        c('prea1-rel-cold', 'SAME mug with ice, no steam — COLD'),
        c('prea1-rel-wet', 'sponge dripping water — WET'),
        c('prea1-rel-dry', 'SAME sponge DRY — pair with wet'),
      ]),
      sh('S3', 'physical pairs B', '3x3', [
        c('prea1-rel-fast', 'simple toy car motion-blur / leaning — FAST (no road scene)'),
        c('prea1-rel-slow', 'SAME toy car still / snail-slow — pair with fast'),
        c('prea1-rel-heavy', 'small crate sinking a scale down — HEAVY'),
        c('prea1-rel-light', 'SAME crate floating high / scale up — LIGHT'),
        c('prea1-rel-broken', 'simple cup cracked / in two pieces — BROKEN'),
        c('prea1-rel-fixed', 'SAME cup whole — FIXED'),
      ]),
      sh('S4', 'spatial tokens', '4x3', [
        c('prea1-rel-in', 'token: small ball INSIDE a square box (relation icon, not a room)'),
        c('prea1-rel-on', 'token: small ball ON TOP of a flat box'),
        c('prea1-rel-under', 'token: small ball UNDER a table-slab'),
        c('prea1-rel-next-to', 'token: ball NEXT TO a box, side by side'),
        c('prea1-rel-behind', 'token: ball partly hidden BEHIND a box'),
        c('prea1-rel-between', 'token: ball BETWEEN two boxes'),
        c('prea1-rel-above', 'token: ball floating ABOVE a box with a gap'),
        c('prea1-rel-below', 'token: ball BELOW a box with a gap'),
        c('prea1-rel-up', 'token: arrow-free UP — ball high, small ground line low'),
        c('prea1-rel-down', 'token: ball low near ground line — DOWN'),
        c('prea1-rel-near', 'token: ball NEAR a box, small gap'),
        c('prea1-rel-far', 'token: ball FAR from a box, large gap, same objects'),
      ]),
      sh('S5', 'anchors + movables', '4x3', [
        c('prea1-rel-box', 'generic closed box, three-quarter, reusable anchor'),
        c('prea1-rel-table', 'simple 4-leg table, empty top, reusable anchor'),
        c('prea1-rel-chair', 'simple chair, empty, reusable anchor'),
        c('prea1-rel-bed', 'simple bed, empty, reusable anchor'),
        c('prea1-rel-tree', 'simple tree, no landscape'),
        c('prea1-rel-shelf', 'simple empty shelf, mid-tone insides'),
        c('prea1-rel-block', 'generic wooden cube, movable object'),
        c('prea1-rel-ball', 'generic red ball, movable object'),
        c('prea1-rel-cup', 'generic cup, mid-tone interior'),
        c('prea1-rel-bag', 'generic tote bag, empty-ish, mid-tone opening'),
        c('prea1-rel-hoop', 'generic hoop / ring stand, empty centre mid-tone'),
        c('prea1-rel-mat', 'generic round mat / place-spot'),
      ]),
    ],
  },

  4: {
    id: 'wave4-phonology',
    n: 4,
    kind: 'phonology',
    title: 'ESL Pre-A1 wave4 — phonological-awareness toolkit',
    family: 'phonology',
    people: false,
    style: `${SHARED_FIELD}

FAMILY: phonological-awareness TOOLKIT. Modular, mostly text-free classroom toys.
NO IPA. NO alphabet letters on these sheets (letter SLOT is an empty window, not an A).
NO people except a tiny listening mascot if listed (simple creature, not a realistic face).
Empty slots / box interiors = MID-TONE (teal/kraft/walnut), never white, never pure black.`,
    sheets: [
      sh('S1', 'listen family', '3x3', [
        c('prea1-pa-ear', 'large friendly ear — LISTEN, no head attached if possible'),
        c('prea1-pa-sound-wave', 'simple colourful sound-wave arcs, no letters'),
        c('prea1-pa-quiet', 'ear with a soft mute / sleeping sound-wave, calm'),
        c('prea1-pa-listening-mascot', 'tiny round mascot cupping an ear, cute not scary'),
        c('prea1-pa-start-flag', 'green start flag for a sound path'),
        c('prea1-pa-finish-flag', 'chequered or red finish flag for a sound path'),
        c('prea1-pa-first-marker', 'position marker labelled only by a gold 1-dot / star — FIRST, no digit glyphs if possible (star)'),
        c('prea1-pa-last-marker', 'position marker with a stop-dot — LAST'),
        c('prea1-pa-sound-magnifier', 'magnifying glass over a small sound-wave, SOUND MAGNIFIER'),
      ]),
      sh('S2', 'word train + slots', '3x3', [
        c('prea1-pa-word-train', 'toy train engine + 3 EMPTY mid-tone slot cars, no letters'),
        c('prea1-pa-train-slot', 'one empty train-car SLOT, mid-tone cavity'),
        c('prea1-pa-comparison-surface', 'two empty wells on a tray — comparison surface'),
        c('prea1-pa-same-sound', 'two matching sound-wave chips — SAME SOUND'),
        c('prea1-pa-different-sound', 'two mismatching sound-wave chips — DIFFERENT SOUND'),
        c('prea1-pa-letter-slot', 'empty square letter window (no letter inside), mid-tone'),
        c('prea1-pa-picture-slot', 'empty rounded picture window, mid-tone'),
        c('prea1-pa-sound-token-slot', 'empty circle for a sound token, mid-tone'),
        c('prea1-pa-mouth-cue-slot', 'empty oval mouth-cue window, mid-tone'),
      ]),
      sh('S3', 'beat kit', '3x3', [
        c('prea1-pa-clap', 'two simple hands clapping, no full person'),
        c('prea1-pa-drum', 'small hand drum + beater'),
        c('prea1-pa-beat-1', 'ONE beat token (single pebble/chip)'),
        c('prea1-pa-beat-2', 'TWO beat tokens grouped'),
        c('prea1-pa-beat-3', 'THREE beat tokens grouped'),
        c('prea1-pa-beat-4', 'FOUR beat tokens grouped'),
        c('prea1-pa-hop-stone', 'one hop-stone / lily pad for a beat path'),
        c('prea1-pa-beat-path', 'a short path of 4 hop-stones, empty, no scenery'),
        c('prea1-pa-rest-token', 'quiet rest token (empty beat)'),
      ]),
      sh('S4', 'elkonin + rhyme', '4x4', [
        c('prea1-pa-sound-box-2', '2 empty sound boxes in a row, mid-tone wells'),
        c('prea1-pa-sound-box-3', '3 empty sound boxes in a row, mid-tone wells'),
        c('prea1-pa-sound-box-4', '4 empty sound boxes in a row, mid-tone wells'),
        c('prea1-pa-chip', 'one Elkonin chip / counter'),
        c('prea1-pa-push-together', 'two chips sliding TOGETHER, blend'),
        c('prea1-pa-pull-apart', 'two chips sliding APART, segment'),
        c('prea1-pa-stretch-snail', 'stretchy snail / slinky for slow sounds'),
        c('prea1-pa-blend-arrow', 'simple blend chevron/arrow as a PROP (not text)'),
        c('prea1-pa-rhyme-house', 'tiny house with two empty windows for rhyming pair'),
        c('prea1-pa-rhyme-bridge', 'small bridge joining two empty pads'),
        c('prea1-pa-sound-family-bucket', 'bucket / bin for a sound family, mid-tone inside'),
        c('prea1-pa-join', 'two chain links joining'),
        c('prea1-pa-split', 'one chain link splitting into two'),
      ]),
    ],
  },

  5: {
    id: 'wave5-prewriting',
    n: 5,
    kind: 'prewriting',
    title: 'ESL Pre-A1 wave5 — pre-writing / motor system',
    family: 'prewriting',
    people: false,
    style: `${SHARED_FIELD}

FAMILY: pre-writing motor system. DO NOT draw A–Z instructional letters. No alphabet.
Strokes and paths are child-friendly, BROAD/EASY first, high contrast on black.
Writing supports are empty scaffolds. Construction pieces are generic sticks/curves kids can drag.
NO scenery. NO people.`,
    sheets: [
      sh('S1', 'strokes', '4x4', [
        c('prea1-pw-stroke-vertical', 'one thick vertical stroke'),
        c('prea1-pw-stroke-horizontal', 'one thick horizontal stroke'),
        c('prea1-pw-stroke-diag-down-left', 'thick diagonal down-left'),
        c('prea1-pw-stroke-diag-down-right', 'thick diagonal down-right'),
        c('prea1-pw-stroke-circle', 'thick open-friendly circle'),
        c('prea1-pw-stroke-oval', 'thick oval'),
        c('prea1-pw-stroke-c-curve', 'thick C-curve (shape only, not a letter lesson)'),
        c('prea1-pw-stroke-s-curve', 'thick S-curve / snake path'),
        c('prea1-pw-stroke-hook', 'thick hook'),
        c('prea1-pw-stroke-loop', 'thick loop'),
        c('prea1-pw-stroke-zigzag', 'thick easy zigzag'),
        c('prea1-pw-stroke-wave', 'thick easy wave'),
        c('prea1-pw-stroke-dots', 'a short dotted path (trace dots)'),
        c('prea1-pw-stroke-cross', 'thick plus/cross'),
        c('prea1-pw-stroke-u-curve', 'thick U-curve'),
        c('prea1-pw-stroke-arch', 'thick arch / rainbow stroke'),
      ]),
      sh('S2', 'easy paths', '3x3', [
        c('prea1-pw-path-wide-horizontal', 'VERY wide easy horizontal path / road for a finger'),
        c('prea1-pw-path-wide-vertical', 'VERY wide easy vertical path'),
        c('prea1-pw-path-wide-curve', 'wide easy curve path'),
        c('prea1-pw-path-wide-circle', 'wide easy circular track'),
        c('prea1-pw-path-mountain', 'wide easy up-and-over mountain path'),
        c('prea1-pw-path-valley', 'wide easy valley / dip path'),
        c('prea1-pw-path-spiral-easy', 'loose easy spiral, not tight'),
        c('prea1-pw-path-bumps', 'wide bump path (2–3 humps)'),
        c('prea1-pw-path-snake', 'wide snake path, generous'),
      ]),
      sh('S3', 'writing supports', '3x3', [
        c('prea1-pw-support-baseline', 'single baseline bar, empty'),
        c('prea1-pw-support-midline', 'baseline + dashed midline, empty'),
        c('prea1-pw-support-sky-grass-ground', 'three-band sky/grass/ground writing strip, empty, no letters'),
        c('prea1-pw-support-letter-box', 'empty letter box / frame, mid-tone inside'),
        c('prea1-pw-support-start-dot', 'green start dot on a small tick mark'),
        c('prea1-pw-support-name-strip', 'empty name strip / long box, no text'),
        c('prea1-pw-support-lined-strip', 'short lined-paper strip, empty'),
        c('prea1-pw-support-arrow-start', 'start arrow as a PROP pointing to a start dot, no letters'),
        c('prea1-pw-support-trace-guide', 'empty dotted letter-box guide, no actual letter'),
      ]),
      sh('S4', 'construction pieces', '3x3', [
        c('prea1-pw-piece-long-line', 'long straight stick piece'),
        c('prea1-pw-piece-short-line', 'short straight stick piece'),
        c('prea1-pw-piece-diagonal', 'diagonal stick piece'),
        c('prea1-pw-piece-small-curve', 'small curve piece'),
        c('prea1-pw-piece-large-curve', 'large curve piece'),
        c('prea1-pw-piece-loop', 'loop piece'),
        c('prea1-pw-piece-circle', 'circle / ring piece'),
        c('prea1-pw-piece-oval', 'oval piece'),
        c('prea1-pw-piece-hook', 'hook piece'),
      ]),
    ],
  },

  6: {
    id: 'wave6-mnemonic-az',
    n: 6,
    kind: 'mnemonic-az',
    title: 'ESL Pre-A1 wave6 — mnemonic alphabet (locked mapping)',
    family: 'mnemonic-az',
    people: false,
    style: `${SHARED_FIELD}

FAMILY: child-friendly MNEMONIC alphabet, SEPARATE from clean handwriting letters.
LOCKED mapping is in the cell list — do not swap mnemonics.
The LETTER MUST remain a clearly recognizable letterform. Add a memorable visual cue (the named object) beside/through it. NOT an illustration vaguely shaped like a letter.
SAME mnemonic object for uppercase and lowercase of that letter.
Bright, child-friendly, no labels, no scenery, consistent art family across all 4 sheets.
Phonics: common SOUND first (short vowels, hard C, hard G, X=/ks/ fox, Y=/j/ yo-yo).`,
    sheets: 'mnemonic',
  },

  7: {
    id: 'wave7-articulation',
    n: 7,
    kind: 'articulation',
    title: 'ESL Pre-A1 wave7 — compact articulation kit',
    family: 'articulation',
    people: true,
    style: `${SHARED_FIELD}

FAMILY: compact articulation kit. SMALL. Not clinical IPA. No every-phoneme library. No IPA charts.
Front/visible mouth features + a few sensory tokens + a handful of simple child-friendly SIDE-VIEW diagrams.
Friendly, not medical. No teeth-horror. Same simple face language if a face is needed.`,
    sheets: [
      sh('S1', 'visible mouth', '3x3', [
        c('prea1-art-lips-together', 'front view: lips closed together'),
        c('prea1-art-lips-apart', 'front view: lips apart, relaxed'),
        c('prea1-art-lip-to-teeth', 'front view: lower lip to upper teeth'),
        c('prea1-art-tongue-between-teeth', 'front view: tongue between teeth, gentle'),
        c('prea1-art-tongue-behind-teeth', 'front view: tongue tip behind teeth'),
        c('prea1-art-tongue-tip-up', 'front view / slight open: tongue tip up'),
        c('prea1-art-lips-rounded', 'front view: rounded lips'),
        c('prea1-art-lips-spread', 'front view: spread smile lips (not a grin scene)'),
        c('prea1-art-jaw-open', 'front view: jaw open, dark mid-tone mouth interior'),
      ]),
      sh('S2', 'sensory + side views', '3x3', [
        c('prea1-art-hand-on-throat', 'simple neck + hand on throat (voice feel), no gore'),
        c('prea1-art-airflow', 'lips + a soft air puff stream'),
        c('prea1-art-voice-on', 'throat with a small glow / vibration marks — voice ON'),
        c('prea1-art-voice-off', 'throat quiet, no glow — voice OFF'),
        c('prea1-art-long-air', 'long air stream (hissing length)'),
        c('prea1-art-quick-pop', 'small pop burst at the lips'),
        c('prea1-art-mirror', 'small hand mirror, empty mid-tone glass'),
        c('prea1-art-stretch', 'mouth stretch / wide open stretch, friendly'),
        c('prea1-art-side-view', 'ONE simple child-friendly SIDE-VIEW head diagram, mouth visible, not clinical'),
      ]),
    ],
  },

  8: {
    id: 'wave8-surfaces',
    n: 8,
    kind: 'surfaces',
    title: 'ESL Pre-A1 wave8 — interaction surface shells',
    family: 'surfaces',
    people: false,
    style: `${SHARED_FIELD}

FAMILY: Pre-A1 interaction SURFACE SHELLS. Neutral reusable boards with EMPTY functional space.
NOT fully authored lessons. Empty wells / hide places / bins must be MID-TONE (kraft, teal, walnut, slate) — NEVER white/cream and NEVER pure black (keying would delete them).
No people. No letters. No scenery beyond the shell itself.
Kids will drag other props onto these later.`,
    sheets: [
      sh('S1', 'choice + listen-drag', '3x3', [
        c('prea1-surf-choice-2', 'shell: 2 empty choice wells side by side'),
        c('prea1-surf-choice-3', 'shell: 3 empty choice wells'),
        c('prea1-surf-choice-4', 'shell: 4 empty choice wells in a 2×2'),
        c('prea1-surf-listen-drag-2', 'shell: speaker cue + 2 empty drop targets'),
        c('prea1-surf-listen-drag-3', 'shell: speaker cue + 3 empty drop targets'),
        c('prea1-surf-listen-drag-4', 'shell: speaker cue + 4 empty drop targets'),
        c('prea1-surf-listen-drag-6', 'shell: speaker cue + 6 empty drop targets'),
        c('prea1-surf-pair-match', 'shell: two columns of 3 empty pair slots'),
        c('prea1-surf-line-match', 'shell: two rows of 3 empty nodes for line-match'),
      ]),
      sh('S2', 'memory + sort + hide', '3x3', [
        c('prea1-surf-memory-match', 'shell: 2×3 empty card backs / wells for memory'),
        c('prea1-surf-bin-sort-2', 'shell: 2 empty bins'),
        c('prea1-surf-bin-sort-3', 'shell: 3 empty bins'),
        c('prea1-surf-hide-3', 'shell: 3 hide places (lids/doors closed, mid-tone)'),
        c('prea1-surf-hide-4', 'shell: 4 hide places'),
        c('prea1-surf-hide-6', 'shell: 6 hide places'),
        c('prea1-surf-where-is-it', 'shell: 5-position where-is-it board (empty pads: on/under/in/next/behind icons as empty spots)'),
        c('prea1-surf-feed', 'shell: friendly empty mouth/bowl to FEED into, mid-tone cavity'),
        c('prea1-surf-place', 'shell: empty place-mat with 4 pads'),
      ]),
      sh('S3', 'build + trace + sequence', '3x3', [
        c('prea1-surf-build-face', 'empty face outline with empty feature pads'),
        c('prea1-surf-build-body', 'empty body outline with empty pads'),
        c('prea1-surf-build-dress', 'empty dress-up silhouette with empty clothing pads'),
        c('prea1-surf-build-letter', 'empty letter construction frame (NO letter drawn)'),
        c('prea1-surf-build-scene', 'empty mini-stage tray with ground line, no scenery'),
        c('prea1-surf-trace-follow', 'wide empty path to trace / follow'),
        c('prea1-surf-sequence-2', '2 empty sequence boxes in a row'),
        c('prea1-surf-sequence-3', '3 empty sequence boxes'),
        c('prea1-surf-sequence-4', '4 empty sequence boxes'),
      ]),
      sh('S4', 'story parking', '3x3', [
        c('prea1-surf-story-2-frame', '2 empty picture-story frames / parking zones'),
        c('prea1-surf-story-3-frame', '3 empty picture-story frames / parking zones'),
      ]),
    ],
  },
};

export function loadMnemonicMap() {
  const p = path.join(HERE, 'prea1-mnemonic-az-map.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function mnemonicSheetsFromMap(map) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const make = (letter, caseName) => {
    const row = map.letters[letter];
    const glyph = caseName === 'upper' ? row.upper : letter;
    const caseWord = caseName === 'upper' ? 'UPPERCASE' : 'lowercase';
    return c(
      `prea1-letter-${letter}-${row.slug}-${caseName}`,
      `${caseWord} "${glyph}" as a CLEAR recognizable letterform PLUS ${row.mnemonic} cue for ${row.sound} (${row.sound_label}). Letter stays a letter. Cue object: ${row.mnemonic}. Avoid: ${row.avoid || 'none'}.`,
    );
  };
  const upper = letters.map((l) => make(l, 'upper'));
  const lower = letters.map((l) => make(l, 'lower'));
  return [
    sh('S1', 'uppercase A–P', '4x4', upper.slice(0, 16)),
    sh('S2', 'uppercase Q–Z', '4x4', upper.slice(16)),
    sh('S3', 'lowercase a–p', '4x4', lower.slice(0, 16)),
    sh('S4', 'lowercase q–z', '4x4', lower.slice(16)),
  ];
}

export function sheetsFor(wave) {
  if (wave.sheets === 'mnemonic') {
    return mnemonicSheetsFromMap(loadMnemonicMap());
  }
  return wave.sheets;
}

export function conceptCount(wave) {
  return sheetsFor(wave).reduce((n, s) => n + s.cells.length, 0);
}

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const blob = `${cell.key} ${cell.brief}`.toLowerCase();
    let hit = null;
    for (const bad of SAFETY_SKIP_KEYS) {
      if (blob.split(/[^a-z0-9]+/).includes(bad)) {
        hit = bad;
        break;
      }
    }
    if (hit) skipped.push({ key: cell.key, reason: hit });
    else kept.push(cell);
  }
  return { kept, skipped };
}

export function resolveWave(raw) {
  const wave = WAVES[Number(raw)];
  if (!wave) {
    throw new Error('Need --wave=1..8 (or use request-prea1-waveN.mjs)');
  }
  return wave;
}
