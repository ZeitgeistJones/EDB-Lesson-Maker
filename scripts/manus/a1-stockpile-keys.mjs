/**
 * A1 visual operating-system stockpile keys.
 *
 * A1 is controlled recombination: visible slots, relationships, question/answer
 * surfaces, ownership, turn-taking, and text-ready shells. Stockpile only.
 */

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

export const STOCKPILE_REL = 'tmp/manus-a1-stockpile';
export const TRACKED_INV_REL = 'docs/a1-stockpile-inventory.json';
export const TRACKED_SPEC_REL = 'docs/a1-stockpile-spec.json';

function c(key, brief, extra = {}) {
  return { key, brief, ...extra };
}

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}

const STYLE = `STYLE LOCK: child-friendly ClassIn ESL board art, clean sparse vector/soft-matte educational illustration, generous empty space, obvious target zones, no logos, no watermarks, no fake UI text.
TEXT LOCK: BLANK / text-ready only. Do NOT bake English sentences, question words, labels, letters, numbers, menu items, profile text, or pretend handwriting into the art.
A1 FIREWALL: controlled recombination only. No past narratives, route giving, shopping negotiations, because-reasoning, paragraphs, independent writing, or open roleplay.
RELATION LOCK: relationships must be visible and manipulable. Stable viewpoint, scale, framing, and paired states. "object under anchor" must not look interchangeable with "anchor under object".
DELIVERY: PNG sheets. For board/shell sheets use landscape 16:9 with empty functional space; for icon/dock sheets use black-field contact sheets with one item per cell and clear gutters. quality: default only.`;

export const WAVES = {
  1: {
    id: 'p0-1-sentence-architecture',
    phase: 'P0.1',
    family: 'sentence-architecture-kit',
    title: 'A1 P0.1 sentence architecture kit',
    style: `${STYLE}
FAMILY: reusable sentence architecture. Visual slots and rails only, no baked words. Slots should make who/action/object/location/time visibly different.`,
    sheets: [
      sh('S1', 'sentence board masters', 'landscape-shells', [
        c('a1-sent-who-action-object-board', 'landscape board: three large linked slots for WHO + ACTION + OBJECT, empty picture wells, visible reading rail, no text'),
        c('a1-sent-who-action-object-location-board', 'landscape board: WHO + ACTION + OBJECT + LOCATION slots, location zone visually distinct as a place pad'),
        c('a1-sent-model-partial-blank-board', 'landscape board with three rows: model row, partial row, blank build row; all slots empty and text-ready'),
        c('a1-sent-swap-slot-board', 'landscape board showing one sentence rail with one highlighted replaceable slot and side dock for alternatives'),
      ]),
      sh('S2', 'sentence slot tokens', 'black-contact-4x4', [
        c('a1-sent-who-slot', 'empty WHO/person slot token with friendly person silhouette cue, no word'),
        c('a1-sent-action-slot', 'empty ACTION slot token with motion cue / verb spark, no word'),
        c('a1-sent-object-slot', 'empty OBJECT slot token with small object tray cue, no word'),
        c('a1-sent-location-slot', 'empty LOCATION slot token with map-pin/place-pad cue, no word'),
        c('a1-sent-time-slot', 'empty TIME slot token with clock/sun cue, no numbers'),
        c('a1-sent-linker-arrow', 'soft connector arrow/token between slots, no text'),
        c('a1-sent-build-rail-3', 'three-slot sentence rail as a draggable strip, blank wells'),
        c('a1-sent-build-rail-4', 'four-slot sentence rail as a draggable strip, blank wells'),
        c('a1-sent-choice-dock-3', 'small dock with three empty alternative slots'),
        c('a1-sent-choice-dock-4', 'small dock with four empty alternative slots'),
        c('a1-sent-check-target', 'empty target/check surface for completed build, no checkmark word'),
        c('a1-sent-error-swap-cue', 'gentle swap/try-again cue token, no text'),
      ]),
    ],
  },
  2: {
    id: 'p0-2-question-answer-system',
    phase: 'P0.2',
    family: 'question-answer-system',
    title: 'A1 P0.2 question to answer visual system',
    style: `${STYLE}
FAMILY: visual answer-type cues. Do not write WHO/WHAT/WHERE words. The cue shape must request the answer type visually.`,
    sheets: [
      sh('S1', 'qa board masters', 'landscape-shells', [
        c('a1-qa-two-speaker-rail', 'landscape board: two speaker avatars, question slot, answer slot, turn path between them, no text'),
        c('a1-qa-listen-answer-board', 'landscape board: ear/speaker cue, question surface, answer choice dock, empty response zone'),
        c('a1-qa-ask-pick-answer-board', 'landscape board: one large visual question bubble pointing to answer-type surface and three empty choices'),
      ]),
      sh('S2', 'answer type cues', 'black-contact-4x4', [
        c('a1-qa-who-cue', 'answer-type cue: asks for a person; empty person silhouette frame, no word'),
        c('a1-qa-what-cue', 'answer-type cue: asks for an object; empty object tray / mystery object silhouette, no word'),
        c('a1-qa-where-cue', 'answer-type cue: asks for a place; map pin over empty place pad, no word'),
        c('a1-qa-how-many-cue', 'answer-type cue: asks for quantity; grouped empty counting dots/chips, no digits'),
        c('a1-qa-colour-cue', 'answer-type cue: asks for colour; paint palette / colour swatch slots, no labels'),
        c('a1-qa-when-cue', 'answer-type cue: asks for time; blank clock/calendar cue, no numbers'),
        c('a1-qa-yes-no-cue', 'answer-type cue: two response pads with friendly agree/disagree icon shapes, no words'),
        c('a1-qa-possession-cue', 'answer-type cue: owner badge pointing to object well'),
        c('a1-qa-preference-cue', 'answer-type cue: heart/choice between two empty wells, no text'),
        c('a1-qa-ability-cue', 'answer-type cue: action spark beside person silhouette, no text'),
        c('a1-qa-question-bubble-empty', 'empty question bubble with visual question mark-like curiosity shape acceptable but no letters'),
        c('a1-qa-answer-bubble-empty', 'empty answer bubble with response surface'),
      ]),
    ],
  },
  3: {
    id: 'p0-3-reference-pronoun-ownership',
    phase: 'P0.3',
    family: 'reference-pronoun-ownership',
    title: 'A1 P0.3 reference, pronoun, ownership',
    style: `${STYLE}
FAMILY: speaker/listener/referent and ownership. Same objects, badges change meaning. No grammar labels.`,
    sheets: [
      sh('S1', 'ownership boards', 'landscape-shells', [
        c('a1-own-speaker-listener-board', 'landscape board: Speaker A, Speaker B, third referent area, object dock, ownership ribbons connect owner to object'),
        c('a1-own-whose-object-shell', 'landscape board: several owner badges above empty object wells, one target question surface, no text'),
        c('a1-own-my-your-swap-board', 'landscape board: two speakers facing, same object switches side with visible owner ribbon'),
      ]),
      sh('S2', 'reference tokens', 'black-contact-4x4', [
        c('a1-own-speaker-badge', 'Speaker A badge token, simple child avatar circle, no A letter'),
        c('a1-own-listener-badge', 'Speaker B/listener badge token, different color avatar circle, no B letter'),
        c('a1-own-referent-halo', 'third-person referent halo/ring token for highlighting someone/something'),
        c('a1-own-owner-ribbon', 'ownership ribbon/connector from owner badge to object well'),
        c('a1-own-object-well', 'empty owned-object well/tray'),
        c('a1-pron-he-cue', 'masculine person cue badge, no word'),
        c('a1-pron-she-cue', 'feminine person cue badge, no word'),
        c('a1-pron-it-cue', 'single object/animal cue badge, no word'),
        c('a1-pron-they-cue', 'small group cue badge, no word'),
        c('a1-ref-one-cue', 'one-item reference cue, no digit'),
        c('a1-ref-many-cue', 'many-items reference cue, no digit'),
        c('a1-ref-pointing-hand', 'neutral pointing hand cue for referent selection'),
      ]),
    ],
  },
  4: {
    id: 'p0-4-micro-text-shells',
    phase: 'P0.4',
    family: 'micro-text-shells',
    title: 'A1 P0.4 micro-text visual shells',
    style: `${STYLE}
FAMILY: blank micro-text genres. Shells must invite text later but contain no fake writing now.`,
    sheets: [
      sh('S1', 'micro text shells A', 'landscape-shells', [
        c('a1-text-caption-shell', 'blank caption strip under a picture window; no text'),
        c('a1-text-mini-dialogue-shell', 'two blank speech bubbles with two speaker icons; no text'),
        c('a1-text-message-shell', 'blank phone/message card with empty lines represented as soft placeholders, not readable text'),
        c('a1-text-note-shell', 'blank sticky note / note card with empty writable area'),
      ]),
      sh('S2', 'micro text shells B', 'landscape-shells', [
        c('a1-text-invitation-shell', 'blank invitation card shell with picture spot and empty text area, no fake words'),
        c('a1-text-postcard-shell', 'blank postcard shell with stamp box and address/text zones empty'),
        c('a1-text-notice-shell', 'blank classroom notice board card with icon slot and empty text area'),
        c('a1-text-profile-shell', 'blank profile card with avatar spot and empty fields, no labels'),
      ]),
      sh('S3', 'forms and reading surfaces', 'landscape-shells', [
        c('a1-text-form-shell', 'blank simple form with a few empty fields and checkbox shapes, no labels'),
        c('a1-text-ticket-shell', 'blank ticket shell with empty zones, no numbers'),
        c('a1-text-menu-shell', 'blank menu/list shell with picture slots and price/tag spaces empty'),
        c('a1-text-timetable-shell', 'blank timetable grid with no days/times written'),
      ]),
    ],
  },
  5: {
    id: 'p0-5-listening-detail-boards',
    phase: 'P0.5',
    family: 'listening-detail-boards',
    title: 'A1 P0.5 listening-for-detail boards',
    style: `${STYLE}
FAMILY: listen then choose/match/fill/move. Response surfaces only, no generated audio, no written prompts.`,
    sheets: [
      sh('S1', 'listening boards', 'landscape-shells', [
        c('a1-listen-choose-4-board', 'landscape board: audio cue, four empty choice wells, answer target'),
        c('a1-listen-match-board', 'landscape board: audio cue, two columns of empty match slots with connector space'),
        c('a1-listen-fill-slot-board', 'landscape board: audio cue and sentence/phrase rail with one empty picture/text slot'),
        c('a1-listen-move-object-board', 'landscape board: audio cue, empty place scene, movable object dock, target zones'),
      ]),
      sh('S2', 'detail response tokens', 'black-contact-4x4', [
        c('a1-listen-price-tag-shell', 'blank price tag shell, no currency or numbers'),
        c('a1-listen-clock-shell', 'blank clock response shell with movable hands area, no numbers'),
        c('a1-listen-place-pad', 'empty place response pad with map-pin cue'),
        c('a1-listen-select-chip', 'selection chip/token for choosing an answer'),
        c('a1-listen-audio-cue', 'speaker/ear listening cue token, no text'),
        c('a1-listen-repeat-cue', 'repeat/listen-again loop cue token, no text'),
        c('a1-listen-drag-target', 'empty drag target pad'),
        c('a1-listen-check-slot', 'empty check/answer slot'),
      ]),
    ],
  },
  6: {
    id: 'p0-6-conversation-turn-system',
    phase: 'P0.6',
    family: 'conversation-turn-system',
    title: 'A1 P0.6 conversation and turn system',
    style: `${STYLE}
FAMILY: reusable two-turn conversation mechanics. Few master boards, no themed dialogues, no written lines.`,
    sheets: [
      sh('S1', 'turn boards', 'landscape-shells', [
        c('a1-conv-speaker-a-b-board', 'landscape board: two speaker sides, current turn glow, listen/say surfaces, blank speech bubbles'),
        c('a1-conv-request-give-board', 'landscape board: requester side, giver side, object dock, request arrow to give arrow, no text'),
        c('a1-conv-qa-turn-board', 'landscape board: question bubble, answer bubble, turn token moving between speakers'),
        c('a1-conv-repair-board', 'landscape board: confused listener cue, repeat/slow/again option surfaces, no words'),
      ]),
      sh('S2', 'turn tokens', 'black-contact-4x4', [
        c('a1-conv-current-turn-token', 'current turn glow token / spotlight'),
        c('a1-conv-listen-token', 'listen token with ear cue, no text'),
        c('a1-conv-say-token', 'say token with mouth/speech cue, no text'),
        c('a1-conv-repeat-token', 'repeat loop token, no text'),
        c('a1-conv-slow-token', 'slow down token with gentle speed cue, no text'),
        c('a1-conv-again-token', 'again token with loop cue, no text'),
        c('a1-conv-dont-understand-cue', 'confused but friendly cue icon, no words'),
        c('a1-conv-request-token', 'request hand/token, no text'),
        c('a1-conv-give-token', 'give hand/token, no text'),
        c('a1-conv-thank-you-cue', 'friendly gratitude gesture cue, no words'),
      ]),
    ],
  },
  7: {
    id: 'p1-1-clock-calendar-schedule',
    phase: 'P1.1',
    family: 'clock-calendar-schedule',
    title: 'A1 P1.1 clock, calendar, schedule',
    style: `${STYLE}
FAMILY: modular time/schedule shells. No fixed times or written weekdays/months.`,
    sheets: [
      sh('S1', 'time shells', 'landscape-shells', [
        c('a1-time-analogue-clock-shell', 'large blank analogue clock face shell with movable hand area, no numbers'),
        c('a1-time-digital-clock-shell', 'blank digital time display shell, no digits'),
        c('a1-time-calendar-shell', 'blank calendar grid shell, no month/day names or numbers'),
        c('a1-time-timetable-board', 'blank timetable board with picture slots and time slots, no text'),
      ]),
    ],
  },
  8: {
    id: 'p1-2-quantity-price-request',
    phase: 'P1.2',
    family: 'quantity-price-request',
    title: 'A1 P1.2 quantity, price, request',
    style: `${STYLE}
FAMILY: simple request/quantity/price surfaces. No flexible shopping maths, no written prices.`,
    sheets: [
      sh('S1', 'request shop shells', 'landscape-shells', [
        c('a1-qty-counting-board', 'landscape board with object dock and empty counting response chips, no digits'),
        c('a1-price-tag-board', 'landscape board with item well and blank price tag response surface, no currency/numbers'),
        c('a1-request-basket-shell', 'empty basket/request board with object slots and giver/listener side'),
        c('a1-cafe-shop-shell', 'sparse cafe/shop counter shell with blank menu/item wells, no text'),
      ]),
    ],
  },
  9: {
    id: 'p1-3-picture-sequence',
    phase: 'P1.3',
    family: 'picture-sequence',
    title: 'A1 P1.3 picture sequence shells',
    style: `${STYLE}
FAMILY: sequence docks, not complete stories. No past narrative content.`,
    sheets: [
      sh('S1', 'sequence shells', 'landscape-shells', [
        c('a1-seq-2-frame-dock', 'two empty picture sequence frames with movable card dock'),
        c('a1-seq-3-frame-dock', 'three empty picture sequence frames with movable card dock'),
        c('a1-seq-4-frame-dock', 'four empty picture sequence frames with movable card dock'),
        c('a1-seq-before-after-shell', 'before/after visual shell with two empty frames, no words'),
      ]),
    ],
  },
  10: {
    id: 'p1-4-picture-difference',
    phase: 'P1.4',
    family: 'picture-difference',
    title: 'A1 P1.4 picture difference systems',
    style: `${STYLE}
FAMILY: twin-scene difference systems. Paired states stable and not busy.`,
    sheets: [
      sh('S1', 'difference boards', 'landscape-shells', [
        c('a1-diff-twin-scene-colour', 'two simple twin panels with empty object wells; colour difference cue surfaces'),
        c('a1-diff-twin-scene-number', 'two simple twin panels with countable object wells; number difference cue, no digits'),
        c('a1-diff-twin-scene-location', 'two simple twin panels with same anchor and movable object location pads'),
        c('a1-diff-twin-scene-action', 'two simple twin panels with person/action slot differences, no written action labels'),
      ]),
    ],
  },
  11: {
    id: 'p1-5-supported-writing-scaffolds',
    phase: 'P1.5',
    family: 'supported-writing-scaffolds',
    title: 'A1 P1.5 supported writing scaffolds',
    style: `${STYLE}
FAMILY: COPY -> CHOOSE -> GAP -> BUILD -> one/two sentence scaffolds. Visual shells only, no fake text.`,
    sheets: [
      sh('S1', 'writing scaffold boards', 'landscape-shells', [
        c('a1-write-copy-shell', 'copy scaffold board with model area and blank copy area, no text'),
        c('a1-write-choose-shell', 'choose scaffold board with picture choices and empty sentence rail, no words'),
        c('a1-write-gap-shell', 'gap-fill scaffold board with blank slot in a writing rail, no text'),
        c('a1-write-build-2-sentence-shell', 'two short sentence build rails with picture slots and blank writing areas, no fake text'),
      ]),
    ],
  },
};

export function sheetsFor(wave) {
  return wave.sheets;
}

export function conceptCount(wave) {
  return sheetsFor(wave).reduce((n, s) => n + s.cells.length, 0);
}

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const parts = `${cell.key} ${cell.brief}`.toLowerCase().split(/[^a-z0-9]+/);
    const hit = [...SAFETY_SKIP_KEYS].find((bad) => parts.includes(bad));
    if (hit) skipped.push({ key: cell.key, reason: hit });
    else kept.push(cell);
  }
  return { kept, skipped };
}

export function resolveWave(raw) {
  const wave = WAVES[Number(raw)];
  if (!wave) throw new Error('Need --wave=1..11');
  return wave;
}

