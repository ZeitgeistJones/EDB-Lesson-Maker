/**
 * Aggressive stockpile S4 partition — Mia/Leo story poses + composable scene dressing.
 * Stockpile only. No producer wiring. If later merged: prefix aggressive-s4ml- only.
 *
 *   node scripts/manus/request-aggressive-s4-mia-leo.mjs --wave=ml1 --fire
 *   node scripts/manus/request-aggressive-s4-mia-leo.mjs --wave=ml1 --poll-only
 *
 * Sheets: harvested/manus-aggressive-stockpile/s4-mia-leo-story/<wave-id>/sheets/
 *
 * DEDUPE: do not redraw H1 interaction poses, existing cast-mia/cast-leo action plates,
 * lt4 pose-whisper (generic kids), s4-roles-a11y generic poses, VG affordances, hero-envelope/suitcase,
 * vocab coat-hook, s2 backpack-on-floor.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  fileContentPart,
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s4-mia-leo-story';
export const TRACKED_INV_REL = 'docs/aggressive-stockpile-s4-mia-leo-inventory.json';
export const MANIFEST_PREFIX = 'aggressive-s4ml-';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const TRACKED_INV = path.join(ROOT, TRACKED_INV_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const REF_MIA = path.join(ROOT, 'public/assets/09_props/img/cast-mia-idle-happy.png');
const REF_LEO = path.join(ROOT, 'public/assets/09_props/img/cast-leo-idle-happy.png');

export const SAFETY_SKIP_KEYS = new Set([
  'rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun',
]);

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration matching the attached Mia/Leo idle plates. Same line weight, palette, and padding across every sheet. No photorealism, no glossy 3D, no sticker-pack chaos.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text, or fake readable text.
BLACK FIELD LOCK: every contact sheet is pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black.
STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to PropBank, modify renderer, or broaden this list.
QUALITY: default only.`;

const IDENTITY = `IDENTITY LOCK (mandatory): MIA = attached cast-mia-idle-happy.png — shoulder-length wavy brown hair, pink flower headband, yellow tee, blue denim overall dress, pink sneakers. LEO = attached cast-leo-idle-happy.png — messy dark-brown hair, blue tee with chest pocket, tan cargo shorts, blue sneakers. Keep face, hair, and outfit locked. Do not invent a third named child. Do not redraw H1 generic interaction kids or s4-roles generic poses as if they were Mia/Leo.
PEOPLE BLACK-FIELD FAILURE LOCK: Recent people sheets FAILED by putting kids on WHITE. That is a reject. The FULL PNG and every cell background MUST be solid #000000 black edge-to-edge. Draw Mia/Leo directly on black. No white cards, white panels, white contact-sheet cells, grey rectangles, cream paper, or white gutters filling a cell. Thin dark gutters only. Keep the existing colored outfits (not all-white clothes).`;

const SKIP = `SKIP LOCK: do not redraw H1 (kneel-pick-up, search-under-table, knock-and-enter, comfort, apologize, invite, permission, wait-in-line, peer-check). Do not redraw existing cast-mia/cast-leo plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach). Do not redraw generic s4-roles poses (look-inside-box, pack-backpack, give-to-adult, kneel-listen, carry-tray) as anonymous kids — these cells are Mia/Leo identity plates only. Do not redraw lt4 pose-whisper as generic kids. Do not redraw hero-envelope, hero-suitcase, vocab coat-hook, or s2 backpack-on-floor. No chef tools. No new named characters.`;

function c(stream, key, brief) {
  return {
    key,
    concept: key,
    brief,
    stream,
    family: stream,
    classification: 'MANUS_WORTHY',
    status: 'pending',
    qa_status: null,
    recovered_locally: false,
    regenerated: false,
  };
}

function sh(id, title, format, cells, extra = '') {
  return { id, title, format, cells, extra };
}

export const WAVES = {
  ml1: {
    id: 's4ml1-mia-leo-story-poses-dressing',
    title: 'Aggressive S4 Mia/Leo story poses + composable dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: missing high-frequency Mia/Leo story poses plus small black-field story dressing (not full settings BGs).
${IDENTITY}
${SKIP}`,
    sheets: [
      sh('S1', 'Mia story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-handover-happy', 'MIA happy, facing right, hands an object toward the right (peer off-canvas), distinct from hold/reach plates, black field, no text'),
        c('P', 'cast-mia-look-inside-happy', 'MIA happy looks down into an open box fragment, look-inside action, identity locked, black field, no letters'),
        c('P', 'cast-mia-kneel-happy', 'MIA happy kneels on both knees, ready/listening, NOT picking an item up, distinct from H1 kneel-pick-up, black field'),
        c('P', 'cast-mia-carry-two-hands-happy', 'MIA happy carries a small box with BOTH hands in front, distinct from hold-one-hand plates, black field, no labels'),
        c('P', 'cast-mia-whisper-happy', 'MIA happy leans right and whispers (hand near mouth), identity locked, no peer body required, black field, no letters'),
        c('P', 'cast-mia-pack-happy', 'MIA happy packs into an open backpack fragment, identity locked, distinct from generic pack-backpack pose, black field, no logos'),
        c('P', 'cast-mia-handover-left-happy', 'MIA happy facing LEFT offering an object leftward, composition mirror of handover-right, black field'),
        c('P', 'cast-mia-carry-two-hands-left-happy', 'MIA happy facing LEFT carrying a small box with both hands, black field, no labels'),
        c('P', 'cast-mia-look-inside-left-happy', 'MIA happy facing LEFT looking into an open bag fragment, black field, no letters'),
      ], IDENTITY),
      sh('S2', 'Leo story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-handover-happy', 'LEO happy, facing right, hands an object toward the right, distinct from hold/reach plates, black field, no text'),
        c('P', 'cast-leo-look-inside-happy', 'LEO happy looks down into an open box fragment, look-inside action, identity locked, black field, no letters'),
        c('P', 'cast-leo-kneel-happy', 'LEO happy kneels on both knees, ready/listening, NOT picking an item up, distinct from H1 kneel-pick-up, black field'),
        c('P', 'cast-leo-carry-two-hands-happy', 'LEO happy carries a small box with BOTH hands in front, distinct from hold-one-hand plates, black field, no labels'),
        c('P', 'cast-leo-whisper-happy', 'LEO happy leans right and whispers (hand near mouth), identity locked, no peer body required, black field, no letters'),
        c('P', 'cast-leo-pack-happy', 'LEO happy packs into an open backpack fragment, identity locked, black field, no logos'),
        c('P', 'cast-leo-handover-left-happy', 'LEO happy facing LEFT offering an object leftward, composition mirror, black field'),
        c('P', 'cast-leo-carry-two-hands-left-happy', 'LEO happy facing LEFT carrying a small box with both hands, black field, no labels'),
        c('P', 'cast-leo-look-inside-left-happy', 'LEO happy facing LEFT looking into an open bag fragment, black field, no letters'),
      ], IDENTITY),
      sh('S3', 'story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-noticeboard-blank', 'classroom noticeboard / bulletin board SHELL, empty, ZERO pins-as-letters or flyers with text'),
        c('D', 'story-classroom-rug', 'small oval classroom rug, still-life, no alphabet border'),
        c('D', 'story-potted-plant-corner', 'simple potted plant for a room corner, still-life, no plant labels'),
        c('D', 'story-letter-folded-blank', 'folded letter sheet, completely BLANK, distinct from hero-envelope'),
        c('D', 'story-postcard-blank', 'blank postcard back, ZERO writing or stamps-as-letters'),
        c('D', 'story-cubby-empty', 'one open school cubby / cubbyhole empty, no name plate writing'),
        c('D', 'story-picture-frame-blank', 'simple picture frame with a BLANK picture area, no letters'),
        c('D', 'story-floor-cushion', 'floor cushion / sit pad, still-life, no logos'),
        c('D', 'story-doormat', 'plain indoor doormat, ZERO welcome letters'),
      ]),
    ],
  },
  ml2: {
    id: 's4ml2-story-dressing-more',
    title: 'Aggressive S4 more composable story dressing',
    stream: 'D',
    family: 'mia-leo-story',
    attachRefs: false,
    style: `${STYLE}
FAMILY: more black-field story dressing atoms so StoryScenes feel authored. Objects only. Not full room BGs (those are S1–S3).
${SKIP}
SKIP MORE: do not redraw ml1 dressing keys.`,
    sheets: [
      sh('S1', 'home dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-nightstand-empty', 'small nightstand empty, still-life, no clock numerals'),
        c('D', 'story-side-table', 'small side table empty, still-life'),
        c('D', 'story-throw-pillow', 'one throw pillow, still-life, no letters'),
        c('D', 'story-blanket-folded', 'folded blanket, still-life, no patterns-as-letters'),
        c('D', 'story-lamp-table', 'small table lamp, still-life, no brand, BLANK shade'),
        c('D', 'story-slippers-pair', 'pair of child slippers, still-life, no size numbers'),
        c('D', 'story-toy-box-closed', 'closed toy box, unlabeled, distinct from suitcase heroes'),
        c('D', 'story-wastebasket', 'small wastebasket empty, still-life'),
        c('D', 'story-key-bowl', 'small entry key bowl empty, still-life'),
      ]),
      sh('S2', 'school dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-bookshelf-short-empty', 'short empty bookshelf, no spine letters'),
        c('D', 'story-bench-short', 'short hallway bench empty, still-life'),
        c('D', 'story-calendar-blank', 'wall calendar SHELL, BLANK grid, ZERO numerals or month names'),
        c('D', 'story-windowsill-empty', 'short windowsill fragment empty, still-life, no outdoor scene'),
        c('D', 'story-umbrella-closed', 'closed umbrella standing, still-life, no brand'),
        c('D', 'story-mail-slot', 'door mail slot fragment, still-life, no house numbers'),
        c('D', 'story-tissue-box', 'tissue box unlabeled, still-life'),
        c('D', 'story-lunchbag-closed', 'closed cloth lunchbag, unlabeled, distinct from backpack-on-floor'),
        c('D', 'story-water-bottle-plain', 'plain closed water bottle, no brand or ml marks, distinct from cutaway bottles'),
      ]),
      sh('S3', 'more dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-floor-lamp', 'simple floor lamp, still-life, distinct from table lamp'),
        c('D', 'story-curtain-panel', 'one curtain panel hanging, still-life, no letters in pattern'),
        c('D', 'story-shoe-tray', 'shoe tray empty, still-life'),
        c('D', 'story-coat-peg-single', 'one wall coat peg empty, distinct from vocab coat-hook and s3 coat-hook-rail'),
        c('D', 'story-map-blank', 'wall map SHELL, land shapes only, ZERO country names or letters'),
        c('D', 'story-flag-blank', 'small classroom flag with BLANK field, ZERO letters or stars-as-text'),
        c('D', 'story-bin-recycling-blank', 'small recycling bin, unlabeled, no chasing-arrows letters'),
        c('D', 'story-pencil-cup-empty', 'desk pencil cup empty, still-life, no brand'),
        c('D', 'story-folder-stack-blank', 'small stack of blank folders, ZERO tabs-as-words'),
      ]),
    ],
  },
  ml3: {
    id: 's4ml3-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1/ml2 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-point-happy', 'MIA happy points at a nearby object fragment, identity locked, distinct from reach plates, black field, no text'),
        c('P', 'cast-mia-nod-happy', 'MIA happy nods yes, identity locked, black field'),
        c('P', 'cast-mia-shake-head-happy', 'MIA happy shakes head no, identity locked, black field'),
        c('P', 'cast-mia-clap-happy', 'MIA happy claps, identity locked, black field'),
        c('P', 'cast-mia-cover-eyes-happy', 'MIA happy covers eyes (peekaboo), identity locked, black field'),
        c('P', 'cast-mia-turn-page-happy', 'MIA happy turns a BLANK book page, identity locked, black field, no letters'),
        c('P', 'cast-mia-hug-object-happy', 'MIA happy hugs a small object (toy/pillow fragment), identity locked, black field, no logos'),
        c('P', 'cast-mia-backpack-on-happy', 'MIA happy puts on a backpack, identity locked, distinct from pack-into-bag, black field, no logos'),
        c('P', 'cast-mia-open-lid-happy', 'MIA happy opens a box lid, identity locked, black field, no labels'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-point-happy', 'LEO happy points at a nearby object fragment, identity locked, distinct from reach plates, black field, no text'),
        c('P', 'cast-leo-nod-happy', 'LEO happy nods yes, identity locked, black field'),
        c('P', 'cast-leo-shake-head-happy', 'LEO happy shakes head no, identity locked, black field'),
        c('P', 'cast-leo-clap-happy', 'LEO happy claps, identity locked, black field'),
        c('P', 'cast-leo-cover-eyes-happy', 'LEO happy covers eyes (peekaboo), identity locked, black field'),
        c('P', 'cast-leo-turn-page-happy', 'LEO happy turns a BLANK book page, identity locked, black field, no letters'),
        c('P', 'cast-leo-hug-object-happy', 'LEO happy hugs a small object, identity locked, black field, no logos'),
        c('P', 'cast-leo-backpack-on-happy', 'LEO happy puts on a backpack, identity locked, black field, no logos'),
        c('P', 'cast-leo-open-lid-happy', 'LEO happy opens a box lid, identity locked, black field, no labels'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-bed-empty', 'simple child bed fragment empty, still-life, no headboard letters'),
        c('D', 'story-alarm-clock-blank', 'bedside alarm clock SHELL, BLANK face, ZERO numerals'),
        c('D', 'story-photo-album-blank', 'closed photo album, unlabeled, no cover text'),
        c('D', 'story-desk-blotter-blank', 'desk blotter / mat, completely BLANK, no letters'),
        c('D', 'story-sticky-pad-blank', 'stack of sticky notes, completely BLANK, no writing'),
        c('D', 'story-magnet-board-empty', 'small magnetic board empty, ZERO letters or doodles-as-words'),
        c('D', 'story-student-chair', 'simple student chair empty, still-life, no name stickers'),
        c('D', 'story-backpack-open-empty', 'open backpack empty standing, distinct from s2 backpack-on-floor and pack poses, no logos'),
        c('D', 'story-hook-rail-short', 'short 2-peg wall rail empty, distinct from coat-peg-single and vocab coat-hook, no labels'),
      ]),
    ],
  },
  ml4: {
    id: 's4ml4-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml3 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-zip-bag-happy', 'MIA happy zips a bag closed, identity locked, black field, no logos'),
        c('P', 'cast-mia-pour-happy', 'MIA happy pours from a pitcher into a cup, identity locked, black field, no labels'),
        c('P', 'cast-mia-give-adult-happy', 'MIA happy hands an object up to an off-canvas adult, identity locked, black field'),
        c('P', 'cast-mia-shrug-happy', 'MIA happy shrugs both shoulders, identity locked, black field'),
        c('P', 'cast-mia-close-lid-happy', 'MIA happy closes a box lid, distinct from open-lid, identity locked, black field'),
        c('P', 'cast-mia-hat-on-happy', 'MIA happy puts on a hat, identity locked, black field, no logos'),
        c('P', 'cast-mia-shoes-off-happy', 'MIA happy takes off shoes, identity locked, black field, no size numbers'),
        c('P', 'cast-mia-wait-standing-happy', 'MIA happy stands waiting (not a line of kids), distinct from H1 wait-in-line, identity locked, black field'),
        c('P', 'cast-mia-peek-door-happy', 'MIA happy peeks around a door edge, distinct from H1 knock-and-enter, identity locked, black field, no EXIT text'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-zip-bag-happy', 'LEO happy zips a bag closed, identity locked, black field, no logos'),
        c('P', 'cast-leo-pour-happy', 'LEO happy pours from a pitcher into a cup, identity locked, black field, no labels'),
        c('P', 'cast-leo-give-adult-happy', 'LEO happy hands an object up to an off-canvas adult, identity locked, black field'),
        c('P', 'cast-leo-shrug-happy', 'LEO happy shrugs both shoulders, identity locked, black field'),
        c('P', 'cast-leo-close-lid-happy', 'LEO happy closes a box lid, identity locked, black field'),
        c('P', 'cast-leo-hat-on-happy', 'LEO happy puts on a hat, identity locked, black field, no logos'),
        c('P', 'cast-leo-shoes-off-happy', 'LEO happy takes off shoes, identity locked, black field, no size numbers'),
        c('P', 'cast-leo-wait-standing-happy', 'LEO happy stands waiting, distinct from H1 wait-in-line, identity locked, black field'),
        c('P', 'cast-leo-peek-door-happy', 'LEO happy peeks around a door edge, distinct from H1 knock-and-enter, identity locked, black field, no EXIT text'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-laundry-basket-empty', 'laundry basket empty, still-life, no labels'),
        c('D', 'story-hanger-empty', 'one clothes hanger empty, still-life'),
        c('D', 'story-window-blinds', 'window blinds fragment closed, still-life, no outdoor scene'),
        c('D', 'story-doorbell-blank', 'doorbell button, BLANK, no house numbers'),
        c('D', 'story-porch-light', 'simple porch light, still-life, no brand'),
        c('D', 'story-garden-hose-coil', 'coiled garden hose, still-life, no brand'),
        c('D', 'story-scooter-parked', 'child kick scooter standing, unlabeled, no logos'),
        c('D', 'story-helmet-blank', 'child helmet, unlabeled, no brand letters'),
        c('D', 'story-bedside-rug', 'small bedside rug, still-life, distinct from classroom-rug, no letters'),
      ]),
    ],
  },
  ml5: {
    id: 's4ml5-mia-leo-story-poses-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml4 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-raise-hand-happy', 'MIA happy raises one hand (classroom), identity locked, distinct from wave/reach, black field'),
        c('P', 'cast-mia-sit-floor-happy', 'MIA happy sits cross-legged on the floor, identity locked, distinct from chair sit plates, black field'),
        c('P', 'cast-mia-lie-down-happy', 'MIA happy lies on her side/back resting, identity locked, distinct from sit, black field'),
        c('P', 'cast-mia-look-window-happy', 'MIA happy looks out a small window fragment, identity locked, distinct from peek-door, black field, no outdoor scene, no letters'),
        c('P', 'cast-mia-water-plant-happy', 'MIA happy waters a small potted plant with a watering can, identity locked, black field, no labels'),
        c('P', 'cast-mia-sweep-happy', 'MIA happy sweeps with a small broom, identity locked, black field'),
        c('P', 'cast-mia-stretch-up-happy', 'MIA happy stretches both arms up, identity locked, distinct from wave, black field'),
        c('P', 'cast-mia-shh-happy', 'MIA happy finger to lips (quiet), identity locked, distinct from whisper, black field, no letters'),
        c('P', 'cast-mia-thumbs-up-happy', 'MIA happy gives a thumbs-up, identity locked, distinct from nod, black field'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-raise-hand-happy', 'LEO happy raises one hand (classroom), identity locked, distinct from wave/reach, black field'),
        c('P', 'cast-leo-sit-floor-happy', 'LEO happy sits cross-legged on the floor, identity locked, distinct from chair sit plates, black field'),
        c('P', 'cast-leo-lie-down-happy', 'LEO happy lies on his side/back resting, identity locked, distinct from sit, black field'),
        c('P', 'cast-leo-look-window-happy', 'LEO happy looks out a small window fragment, identity locked, distinct from peek-door, black field, no outdoor scene, no letters'),
        c('P', 'cast-leo-water-plant-happy', 'LEO happy waters a small potted plant with a watering can, identity locked, black field, no labels'),
        c('P', 'cast-leo-sweep-happy', 'LEO happy sweeps with a small broom, identity locked, black field'),
        c('P', 'cast-leo-stretch-up-happy', 'LEO happy stretches both arms up, identity locked, distinct from wave, black field'),
        c('P', 'cast-leo-shh-happy', 'LEO happy finger to lips (quiet), identity locked, distinct from whisper, black field, no letters'),
        c('P', 'cast-leo-thumbs-up-happy', 'LEO happy gives a thumbs-up, identity locked, distinct from nod, black field'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-stuffed-animal', 'simple stuffed animal toy, still-life, no logos or face-text'),
        c('D', 'story-toy-ball', 'plain child ball, still-life, no numbers or brand'),
        c('D', 'story-jump-rope', 'child jump rope coiled, still-life'),
        c('D', 'story-building-blocks', 'small stack of unlabeled building blocks, still-life, no letters'),
        c('D', 'story-crayon-box-blank', 'crayon box SHELL, unlabeled, no brand letters'),
        c('D', 'story-notebook-blank', 'closed notebook, blank cover, ZERO letters'),
        c('D', 'story-soap-bar', 'plain bar of soap, still-life, no brand'),
        c('D', 'story-hand-towel', 'folded hand towel, still-life, no monogram letters'),
        c('D', 'story-step-stool', 'small child step stool empty, still-life'),
      ]),
    ],
  },
  ml6: {
    id: 's4ml6-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml5 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-backpack-off-happy', 'MIA happy takes a backpack off, identity locked, distinct from backpack-on and pack, black field, no logos'),
        c('P', 'cast-mia-coat-on-happy', 'MIA happy puts on a coat/jacket, identity locked, distinct from hat-on, black field, no logos'),
        c('P', 'cast-mia-wash-hands-happy', 'MIA happy washes hands at a sink fragment, identity locked, black field, no labels'),
        c('P', 'cast-mia-cover-ears-happy', 'MIA happy covers ears, identity locked, distinct from cover-eyes, black field'),
        c('P', 'cast-mia-beckon-happy', 'MIA happy beckons come-here with one hand, identity locked, distinct from H1 invite, black field'),
        c('P', 'cast-mia-stop-palm-happy', 'MIA happy holds palm out (stop/wait), identity locked, distinct from wait-standing, black field'),
        c('P', 'cast-mia-hop-happy', 'MIA happy hops on one foot, identity locked, distinct from jump/run, black field'),
        c('P', 'cast-mia-crawl-happy', 'MIA happy crawls on hands and knees, identity locked, distinct from kneel, black field'),
        c('P', 'cast-mia-look-up-happy', 'MIA happy looks up (teacher/sky), identity locked, distinct from idle/listen, black field'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-backpack-off-happy', 'LEO happy takes a backpack off, identity locked, distinct from backpack-on and pack, black field, no logos'),
        c('P', 'cast-leo-coat-on-happy', 'LEO happy puts on a coat/jacket, identity locked, distinct from hat-on, black field, no logos'),
        c('P', 'cast-leo-wash-hands-happy', 'LEO happy washes hands at a sink fragment, identity locked, black field, no labels'),
        c('P', 'cast-leo-cover-ears-happy', 'LEO happy covers ears, identity locked, distinct from cover-eyes, black field'),
        c('P', 'cast-leo-beckon-happy', 'LEO happy beckons come-here with one hand, identity locked, distinct from H1 invite, black field'),
        c('P', 'cast-leo-stop-palm-happy', 'LEO happy holds palm out (stop/wait), identity locked, distinct from wait-standing, black field'),
        c('P', 'cast-leo-hop-happy', 'LEO happy hops on one foot, identity locked, distinct from jump/run, black field'),
        c('P', 'cast-leo-crawl-happy', 'LEO happy crawls on hands and knees, identity locked, distinct from kneel, black field'),
        c('P', 'cast-leo-look-up-happy', 'LEO happy looks up (teacher/sky), identity locked, distinct from idle/listen, black field'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-toothbrush-cup', 'cup with a toothbrush, unlabeled, still-life, no brand'),
        c('D', 'story-sink-basin-empty', 'bathroom sink basin empty, still-life, no faucet brand'),
        c('D', 'story-night-light', 'small night light, still-life, no numerals'),
        c('D', 'story-wall-clock-blank', 'wall clock SHELL, BLANK face, ZERO numerals'),
        c('D', 'story-chalkboard-blank', 'small chalkboard SHELL, completely BLANK, ZERO letters'),
        c('D', 'story-whiteboard-blank', 'small whiteboard SHELL, completely BLANK, ZERO letters'),
        c('D', 'story-child-desk-empty', 'small child desk empty, still-life, no name plate'),
        c('D', 'story-lunch-tray-empty', 'empty cafeteria lunch tray, still-life, no labels'),
        c('D', 'story-water-fountain-fragment', 'drinking fountain fragment, still-life, no outdoor scene, no letters'),
      ]),
    ],
  },
  ml7: {
    id: 's4ml7-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml6 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-read-open-book-happy', 'MIA happy reads an OPEN BLANK book, identity locked, distinct from turn-page, black field, no letters'),
        c('P', 'cast-mia-write-paper-happy', 'MIA happy writes on a BLANK paper, identity locked, distinct from draw plates, black field, no letters'),
        c('P', 'cast-mia-hang-coat-happy', 'MIA happy hangs a coat on a peg, identity locked, distinct from coat-on, black field, no labels'),
        c('P', 'cast-mia-wipe-table-happy', 'MIA happy wipes a small table surface, identity locked, black field'),
        c('P', 'cast-mia-count-fingers-happy', 'MIA happy counts on fingers, identity locked, black field, no numerals in scene'),
        c('P', 'cast-mia-high-five-happy', 'MIA happy high-fives toward off-canvas peer, identity locked, distinct from clap/wave, black field'),
        c('P', 'cast-mia-pull-toy-happy', 'MIA happy pulls a small toy on a string, identity locked, black field, no logos'),
        c('P', 'cast-mia-skip-happy', 'MIA happy skip-steps, identity locked, distinct from hop/jump/run, black field'),
        c('P', 'cast-mia-hide-behind-happy', 'MIA happy hides behind a small object fragment, identity locked, distinct from peek-door and cover-eyes, black field'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-read-open-book-happy', 'LEO happy reads an OPEN BLANK book, identity locked, distinct from turn-page, black field, no letters'),
        c('P', 'cast-leo-write-paper-happy', 'LEO happy writes on a BLANK paper, identity locked, distinct from draw plates, black field, no letters'),
        c('P', 'cast-leo-hang-coat-happy', 'LEO happy hangs a coat on a peg, identity locked, distinct from coat-on, black field, no labels'),
        c('P', 'cast-leo-wipe-table-happy', 'LEO happy wipes a small table surface, identity locked, black field'),
        c('P', 'cast-leo-count-fingers-happy', 'LEO happy counts on fingers, identity locked, black field, no numerals in scene'),
        c('P', 'cast-leo-high-five-happy', 'LEO happy high-fives toward off-canvas peer, identity locked, distinct from clap/wave, black field'),
        c('P', 'cast-leo-pull-toy-happy', 'LEO happy pulls a small toy on a string, identity locked, black field, no logos'),
        c('P', 'cast-leo-skip-happy', 'LEO happy skip-steps, identity locked, distinct from hop/jump/run, black field'),
        c('P', 'cast-leo-hide-behind-happy', 'LEO happy hides behind a small object fragment, identity locked, distinct from peek-door and cover-eyes, black field'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-wagon-empty', 'child wagon empty, still-life, no logos'),
        c('D', 'story-sandbox-fragment', 'small sandbox fragment empty, still-life, no outdoor full BG'),
        c('D', 'story-slide-fragment', 'playground slide fragment, still-life, no outdoor full BG, no letters'),
        c('D', 'story-swing-empty', 'empty swing seat, still-life, no outdoor full BG'),
        c('D', 'story-picnic-blanket', 'picnic blanket folded or spread, still-life, no checks-as-letters'),
        c('D', 'story-picnic-basket-empty', 'picnic basket empty, still-life, no labels'),
        c('D', 'story-kite-plain', 'plain kite, unlabeled, no letters'),
        c('D', 'story-bike-parked', 'child bicycle standing, unlabeled, no logos'),
        c('D', 'story-flower-bed-fragment', 'small flower bed fragment, still-life, distinct from potted-plant-corner, no plant labels'),
      ]),
    ],
  },
  ml8: {
    id: 's4ml8-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml7 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-make-bed-happy', 'MIA happy smooths a blanket on a bed fragment, identity locked, black field, no headboard letters'),
        c('P', 'cast-mia-fold-clothes-happy', 'MIA happy folds a small shirt, identity locked, black field, no logos'),
        c('P', 'cast-mia-look-mirror-happy', 'MIA happy looks into a small BLANK hand/wall mirror, identity locked, black field, no letters'),
        c('P', 'cast-mia-wash-face-happy', 'MIA happy washes face at a sink fragment, identity locked, distinct from wash-hands, black field'),
        c('P', 'cast-mia-bounce-ball-happy', 'MIA happy bounces a plain ball, identity locked, distinct from throw/catch/kick, black field, no numbers'),
        c('P', 'cast-mia-jump-rope-happy', 'MIA happy mid jump-rope swing, identity locked, distinct from jump/hop, black field'),
        c('P', 'cast-mia-open-door-happy', 'MIA happy opens a door inward, identity locked, distinct from peek-door and H1 knock-and-enter, black field, no EXIT text'),
        c('P', 'cast-mia-throw-trash-happy', 'MIA happy drops trash into a bin fragment, identity locked, black field, no labels'),
        c('P', 'cast-mia-yawn-happy', 'MIA happy yawns covering mouth, identity locked, black field'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-make-bed-happy', 'LEO happy smooths a blanket on a bed fragment, identity locked, black field, no headboard letters'),
        c('P', 'cast-leo-fold-clothes-happy', 'LEO happy folds a small shirt, identity locked, black field, no logos'),
        c('P', 'cast-leo-look-mirror-happy', 'LEO happy looks into a small BLANK hand/wall mirror, identity locked, black field, no letters'),
        c('P', 'cast-leo-wash-face-happy', 'LEO happy washes face at a sink fragment, identity locked, distinct from wash-hands, black field'),
        c('P', 'cast-leo-bounce-ball-happy', 'LEO happy bounces a plain ball, identity locked, distinct from throw/catch/kick, black field, no numbers'),
        c('P', 'cast-leo-jump-rope-happy', 'LEO happy mid jump-rope swing, identity locked, distinct from jump/hop, black field'),
        c('P', 'cast-leo-open-door-happy', 'LEO happy opens a door inward, identity locked, distinct from peek-door and H1 knock-and-enter, black field, no EXIT text'),
        c('P', 'cast-leo-throw-trash-happy', 'LEO happy drops trash into a bin fragment, identity locked, black field, no labels'),
        c('P', 'cast-leo-yawn-happy', 'LEO happy yawns covering mouth, identity locked, black field'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-hand-mirror-blank', 'small hand mirror, BLANK glass, no letters on handle'),
        c('D', 'story-duvet-folded', 'folded duvet / comforter, still-life, distinct from blanket-folded'),
        c('D', 'story-dustpan', 'dustpan empty, still-life'),
        c('D', 'story-mop', 'simple mop standing, still-life, no brand'),
        c('D', 'story-bucket-empty', 'cleaning bucket empty, still-life, no labels'),
        c('D', 'story-spray-bottle-blank', 'spray bottle unlabeled, still-life, no brand letters'),
        c('D', 'story-comb', 'simple hair comb, still-life'),
        c('D', 'story-hairbrush', 'simple hairbrush, still-life, no brand'),
        c('D', 'story-tissue-pack-blank', 'small tissue pack unlabeled, distinct from tissue-box, no letters'),
      ]),
    ],
  },
  ml9: {
    id: 's4ml9-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml8 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-set-table-happy', 'MIA happy sets a plate on a table fragment, identity locked, black field, no labels'),
        c('P', 'cast-mia-dry-hands-happy', 'MIA happy dries hands on a towel, identity locked, distinct from wash-hands, black field'),
        c('P', 'cast-mia-helmet-on-happy', 'MIA happy puts on a helmet, identity locked, distinct from hat-on, black field, no brand letters'),
        c('P', 'cast-mia-ride-scooter-happy', 'MIA happy stands on a kick scooter, identity locked, black field, no logos'),
        c('P', 'cast-mia-plant-seed-happy', 'MIA happy plants a seed in a small pot, identity locked, black field, no labels'),
        c('P', 'cast-mia-pet-animal-happy', 'MIA happy pets a small generic animal fragment (not a named character), identity locked, black field'),
        c('P', 'cast-mia-take-photo-happy', 'MIA happy holds a BLANK camera/phone taking a photo, identity locked, black field, no UI text'),
        c('P', 'cast-mia-dance-happy', 'MIA happy dances, identity locked, distinct from jump/hop/skip, black field'),
        c('P', 'cast-mia-hold-umbrella-happy', 'MIA happy holds an OPEN umbrella, identity locked, distinct from closed-umbrella dressing, black field, no brand'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-set-table-happy', 'LEO happy sets a plate on a table fragment, identity locked, black field, no labels'),
        c('P', 'cast-leo-dry-hands-happy', 'LEO happy dries hands on a towel, identity locked, distinct from wash-hands, black field'),
        c('P', 'cast-leo-helmet-on-happy', 'LEO happy puts on a helmet, identity locked, distinct from hat-on, black field, no brand letters'),
        c('P', 'cast-leo-ride-scooter-happy', 'LEO happy stands on a kick scooter, identity locked, black field, no logos'),
        c('P', 'cast-leo-plant-seed-happy', 'LEO happy plants a seed in a small pot, identity locked, black field, no labels'),
        c('P', 'cast-leo-pet-animal-happy', 'LEO happy pets a small generic animal fragment (not a named character), identity locked, black field'),
        c('P', 'cast-leo-take-photo-happy', 'LEO happy holds a BLANK camera/phone taking a photo, identity locked, black field, no UI text'),
        c('P', 'cast-leo-dance-happy', 'LEO happy dances, identity locked, distinct from jump/hop/skip, black field'),
        c('P', 'cast-leo-hold-umbrella-happy', 'LEO happy holds an OPEN umbrella, identity locked, distinct from closed-umbrella dressing, black field, no brand'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-camera-blank', 'simple camera, unlabeled, no brand or screen text'),
        c('D', 'story-headphones', 'child headphones, unlabeled, no brand'),
        c('D', 'story-seed-packet-blank', 'seed packet SHELL, completely BLANK, ZERO letters'),
        c('D', 'story-watering-can', 'small watering can, still-life, no brand'),
        c('D', 'story-pet-bowl-empty', 'pet food bowl empty, still-life, no labels'),
        c('D', 'story-leash-coiled', 'coiled pet leash, still-life, no brand'),
        c('D', 'story-umbrella-open', 'open umbrella, still-life, distinct from umbrella-closed, no brand'),
        c('D', 'story-raincoat', 'child raincoat hanging, unlabeled, no logos'),
        c('D', 'story-puddle-fragment', 'small rain puddle fragment, still-life, no outdoor full BG'),
      ]),
    ],
  },
  ml10: {
    id: 's4ml10-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml9 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-tie-shoes-happy', 'MIA happy ties shoelaces, identity locked, distinct from shoes-off, black field, no size numbers'),
        c('P', 'cast-mia-socks-on-happy', 'MIA happy puts on a sock, identity locked, black field'),
        c('P', 'cast-mia-sneeze-elbow-happy', 'MIA happy sneezes into elbow, identity locked, black field'),
        c('P', 'cast-mia-think-happy', 'MIA happy thinks (hand to chin), identity locked, black field'),
        c('P', 'cast-mia-look-down-happy', 'MIA happy looks down at the floor, identity locked, distinct from look-inside, black field'),
        c('P', 'cast-mia-carry-tray-happy', 'MIA happy carries a tray with both hands, identity locked, distinct from carry-two-hands box, black field, no labels'),
        c('P', 'cast-mia-close-door-happy', 'MIA happy closes a door, identity locked, distinct from open-door and peek-door, black field, no EXIT text'),
        c('P', 'cast-mia-share-plate-happy', 'MIA happy offers food on a plate toward off-canvas peer, identity locked, distinct from handover, black field, no labels'),
        c('P', 'cast-mia-blow-bubbles-happy', 'MIA happy blows bubbles from a wand, identity locked, black field, no logos'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-tie-shoes-happy', 'LEO happy ties shoelaces, identity locked, distinct from shoes-off, black field, no size numbers'),
        c('P', 'cast-leo-socks-on-happy', 'LEO happy puts on a sock, identity locked, black field'),
        c('P', 'cast-leo-sneeze-elbow-happy', 'LEO happy sneezes into elbow, identity locked, black field'),
        c('P', 'cast-leo-think-happy', 'LEO happy thinks (hand to chin), identity locked, black field'),
        c('P', 'cast-leo-look-down-happy', 'LEO happy looks down at the floor, identity locked, distinct from look-inside, black field'),
        c('P', 'cast-leo-carry-tray-happy', 'LEO happy carries a tray with both hands, identity locked, distinct from carry-two-hands box, black field, no labels'),
        c('P', 'cast-leo-close-door-happy', 'LEO happy closes a door, identity locked, distinct from open-door and peek-door, black field, no EXIT text'),
        c('P', 'cast-leo-share-plate-happy', 'LEO happy offers food on a plate toward off-canvas peer, identity locked, distinct from handover, black field, no labels'),
        c('P', 'cast-leo-blow-bubbles-happy', 'LEO happy blows bubbles from a wand, identity locked, black field, no logos'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-bubble-wand', 'bubble wand, still-life, no brand'),
        c('D', 'story-snack-plate-empty', 'empty snack plate, still-life'),
        c('D', 'story-napkin-folded', 'folded napkin, still-life, no letters'),
        c('D', 'story-fork', 'child fork, still-life'),
        c('D', 'story-spoon', 'child spoon, still-life'),
        c('D', 'story-plate-empty', 'empty dinner plate, still-life'),
        c('D', 'story-cup-empty', 'empty cup, still-life, no brand, no ml marks'),
        c('D', 'story-sock-pair', 'pair of child socks, still-life, no size numbers'),
        c('D', 'story-shoelace-loose', 'loose shoelace still-life, no brand'),
      ]),
    ],
  },
  ml11: {
    id: 's4ml11-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml10 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-sit-desk-happy', 'MIA happy sits at a small student desk, identity locked, distinct from chair-sit and sit-floor, black field, no name stickers'),
        c('P', 'cast-mia-stand-from-chair-happy', 'MIA happy stands up from a chair, identity locked, black field'),
        c('P', 'cast-mia-pull-curtain-happy', 'MIA happy pulls a curtain panel, identity locked, black field, no letters in fabric'),
        c('P', 'cast-mia-open-blinds-happy', 'MIA happy opens window blinds, identity locked, distinct from blinds dressing still-life, black field, no outdoor scene'),
        c('P', 'cast-mia-ring-doorbell-happy', 'MIA happy presses a doorbell, identity locked, distinct from H1 knock-and-enter, black field, no house numbers'),
        c('P', 'cast-mia-feed-pet-happy', 'MIA happy pours food into a pet bowl, identity locked, distinct from pet-animal, black field, no labels'),
        c('P', 'cast-mia-ride-bike-happy', 'MIA happy sits on a child bicycle, identity locked, distinct from ride-scooter, black field, no logos'),
        c('P', 'cast-mia-fly-kite-happy', 'MIA happy holds a kite string, identity locked, black field, no letters on kite'),
        c('P', 'cast-mia-sit-swing-happy', 'MIA happy sits on a swing seat, identity locked, black field, no outdoor full BG'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-sit-desk-happy', 'LEO happy sits at a small student desk, identity locked, distinct from chair-sit and sit-floor, black field, no name stickers'),
        c('P', 'cast-leo-stand-from-chair-happy', 'LEO happy stands up from a chair, identity locked, black field'),
        c('P', 'cast-leo-pull-curtain-happy', 'LEO happy pulls a curtain panel, identity locked, black field, no letters in fabric'),
        c('P', 'cast-leo-open-blinds-happy', 'LEO happy opens window blinds, identity locked, distinct from blinds dressing still-life, black field, no outdoor scene'),
        c('P', 'cast-leo-ring-doorbell-happy', 'LEO happy presses a doorbell, identity locked, distinct from H1 knock-and-enter, black field, no house numbers'),
        c('P', 'cast-leo-feed-pet-happy', 'LEO happy pours food into a pet bowl, identity locked, distinct from pet-animal, black field, no labels'),
        c('P', 'cast-leo-ride-bike-happy', 'LEO happy sits on a child bicycle, identity locked, distinct from ride-scooter, black field, no logos'),
        c('P', 'cast-leo-fly-kite-happy', 'LEO happy holds a kite string, identity locked, black field, no letters on kite'),
        c('P', 'cast-leo-sit-swing-happy', 'LEO happy sits on a swing seat, identity locked, black field, no outdoor full BG'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-doorknob', 'simple doorknob on a door fragment, still-life, no house numbers'),
        c('D', 'story-light-switch-blank', 'wall light switch, BLANK plate, ZERO letters'),
        c('D', 'story-flashlight', 'small flashlight, unlabeled, no brand'),
        c('D', 'story-remote-blank', 'TV remote SHELL, BLANK buttons as shapes only, ZERO letters or numerals'),
        c('D', 'story-tv-blank-screen', 'small TV with BLANK dark screen, no logos or UI text'),
        c('D', 'story-speaker-small', 'small speaker, unlabeled, no brand'),
        c('D', 'story-thermometer-blank', 'thermometer SHELL, BLANK face, ZERO numerals'),
        c('D', 'story-bandaid-blank', 'plain adhesive bandage, unlabeled, no brand letters'),
        c('D', 'story-first-aid-box-blank', 'small first-aid box, unlabeled, ZERO cross-as-letters or brand'),
      ]),
    ],
  },
  ml12: {
    id: 's4ml12-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml11 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-go-down-slide-happy', 'MIA happy sits on a playground slide fragment, identity locked, black field, no outdoor full BG, no letters'),
        c('P', 'cast-mia-play-sandbox-happy', 'MIA happy plays in a sandbox fragment, identity locked, black field, no outdoor full BG'),
        c('P', 'cast-mia-picnic-sit-happy', 'MIA happy sits on a picnic blanket fragment, identity locked, black field, no letters on blanket'),
        c('P', 'cast-mia-comb-hair-happy', 'MIA happy combs hair, identity locked, black field'),
        c('P', 'cast-mia-listen-headphones-happy', 'MIA happy wears headphones listening, identity locked, distinct from listen plates, black field, no brand'),
        c('P', 'cast-mia-stack-blocks-happy', 'MIA happy stacks unlabeled blocks, identity locked, black field, no letters'),
        c('P', 'cast-mia-erase-board-happy', 'MIA happy erases a BLANK board, identity locked, black field, no letters'),
        c('P', 'cast-mia-smell-flower-happy', 'MIA happy smells a flower, identity locked, black field'),
        c('P', 'cast-mia-splash-puddle-happy', 'MIA happy splashes a small puddle, identity locked, black field, no outdoor full BG'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-go-down-slide-happy', 'LEO happy sits on a playground slide fragment, identity locked, black field, no outdoor full BG, no letters'),
        c('P', 'cast-leo-play-sandbox-happy', 'LEO happy plays in a sandbox fragment, identity locked, black field, no outdoor full BG'),
        c('P', 'cast-leo-picnic-sit-happy', 'LEO happy sits on a picnic blanket fragment, identity locked, black field, no letters on blanket'),
        c('P', 'cast-leo-comb-hair-happy', 'LEO happy combs hair, identity locked, black field'),
        c('P', 'cast-leo-listen-headphones-happy', 'LEO happy wears headphones listening, identity locked, distinct from listen plates, black field, no brand'),
        c('P', 'cast-leo-stack-blocks-happy', 'LEO happy stacks unlabeled blocks, identity locked, black field, no letters'),
        c('P', 'cast-leo-erase-board-happy', 'LEO happy erases a BLANK board, identity locked, black field, no letters'),
        c('P', 'cast-leo-smell-flower-happy', 'LEO happy smells a flower, identity locked, black field'),
        c('P', 'cast-leo-splash-puddle-happy', 'LEO happy splashes a small puddle, identity locked, black field, no outdoor full BG'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-chalk', 'piece of chalk, still-life'),
        c('D', 'story-board-eraser', 'chalkboard eraser, still-life, no brand'),
        c('D', 'story-gluestick-blank', 'glue stick unlabeled, still-life, no brand letters'),
        c('D', 'story-tape-roll', 'roll of tape, still-life, no brand'),
        c('D', 'story-scissors', 'child scissors, still-life, no brand'),
        c('D', 'story-stamp-blank', 'rubber stamp SHELL, BLANK, ZERO letters'),
        c('D', 'story-paper-stack-blank', 'stack of blank paper, ZERO letters'),
        c('D', 'story-crayon-loose', 'one crayon, unlabeled, no brand'),
        c('D', 'story-marker-blank', 'marker unlabeled, cap on, no brand letters'),
      ]),
    ],
  },
  ml13: {
    id: 's4ml13-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml12 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-bow-happy', 'MIA happy bows (thank-you), identity locked, distinct from H1 apologize, black field'),
        c('P', 'cast-mia-hands-on-hips-happy', 'MIA happy stands with hands on hips, identity locked, black field'),
        c('P', 'cast-mia-cross-arms-happy', 'MIA happy crosses arms, identity locked, black field'),
        c('P', 'cast-mia-lamp-on-happy', 'MIA happy turns on a table lamp, identity locked, black field, no brand'),
        c('P', 'cast-mia-light-off-happy', 'MIA happy flips a light switch off, identity locked, black field, no letters'),
        c('P', 'cast-mia-take-from-shelf-happy', 'MIA happy takes a small unlabeled object from a shelf fragment, identity locked, distinct from reach, black field, no labels'),
        c('P', 'cast-mia-walk-dog-happy', 'MIA happy holds a leash (dog off-canvas or tiny generic dog fragment, not a named character), identity locked, black field'),
        c('P', 'cast-mia-pick-flower-happy', 'MIA happy picks a flower, identity locked, distinct from smell-flower, black field'),
        c('P', 'cast-mia-spin-happy', 'MIA happy spins in place, identity locked, distinct from dance/skip, black field'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-bow-happy', 'LEO happy bows (thank-you), identity locked, distinct from H1 apologize, black field'),
        c('P', 'cast-leo-hands-on-hips-happy', 'LEO happy stands with hands on hips, identity locked, black field'),
        c('P', 'cast-leo-cross-arms-happy', 'LEO happy crosses arms, identity locked, black field'),
        c('P', 'cast-leo-lamp-on-happy', 'LEO happy turns on a table lamp, identity locked, black field, no brand'),
        c('P', 'cast-leo-light-off-happy', 'LEO happy flips a light switch off, identity locked, black field, no letters'),
        c('P', 'cast-leo-take-from-shelf-happy', 'LEO happy takes a small unlabeled object from a shelf fragment, identity locked, distinct from reach, black field, no labels'),
        c('P', 'cast-leo-walk-dog-happy', 'LEO happy holds a leash (dog off-canvas or tiny generic dog fragment, not a named character), identity locked, black field'),
        c('P', 'cast-leo-pick-flower-happy', 'LEO happy picks a flower, identity locked, distinct from smell-flower, black field'),
        c('P', 'cast-leo-spin-happy', 'LEO happy spins in place, identity locked, distinct from dance/skip, black field'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-outlet-blank', 'wall outlet SHELL, BLANK plate, ZERO letters'),
        c('D', 'story-vase-empty', 'simple vase empty, still-life'),
        c('D', 'story-flower-single', 'one flower still-life, distinct from flower-bed-fragment'),
        c('D', 'story-shelf-fragment', 'short wall shelf empty, still-life, no spine letters'),
        c('D', 'story-book-closed-blank', 'closed book, blank cover, ZERO letters, distinct from notebook-blank'),
        c('D', 'story-dog-collar', 'pet collar, unlabeled, no brand'),
        c('D', 'story-rake', 'leaf rake standing, still-life'),
        c('D', 'story-leaf-pile', 'small leaf pile, still-life, no outdoor full BG'),
        c('D', 'story-candle-unlit', 'unlit candle, still-life, no brand'),
      ]),
    ],
  },
  ml14: {
    id: 's4ml14-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml13 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-sharpen-pencil-happy', 'MIA happy sharpens a pencil, identity locked, black field #000000, no brand, no letters'),
        c('P', 'cast-mia-cut-paper-happy', 'MIA happy cuts BLANK paper with child scissors, identity locked, black field #000000, no letters'),
        c('P', 'cast-mia-glue-paper-happy', 'MIA happy glues BLANK paper, identity locked, black field #000000, no brand letters'),
        c('P', 'cast-mia-fold-paper-happy', 'MIA happy folds a BLANK paper, identity locked, black field #000000, no letters'),
        c('P', 'cast-mia-gloves-on-happy', 'MIA happy puts on gloves, identity locked, black field #000000, no logos'),
        c('P', 'cast-mia-scarf-on-happy', 'MIA happy puts on a scarf, identity locked, distinct from coat-on/hat-on, black field #000000, no logos'),
        c('P', 'cast-mia-rake-leaves-happy', 'MIA happy rakes a small leaf pile fragment, identity locked, black field #000000, no outdoor full BG'),
        c('P', 'cast-mia-stomp-happy', 'MIA happy stomps one foot, identity locked, distinct from kick/hop, black field #000000'),
        c('P', 'cast-mia-blow-candle-happy', 'MIA happy blows out a candle, identity locked, black field #000000, no brand'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-sharpen-pencil-happy', 'LEO happy sharpens a pencil, identity locked, black field #000000, no brand, no letters'),
        c('P', 'cast-leo-cut-paper-happy', 'LEO happy cuts BLANK paper with child scissors, identity locked, black field #000000, no letters'),
        c('P', 'cast-leo-glue-paper-happy', 'LEO happy glues BLANK paper, identity locked, black field #000000, no brand letters'),
        c('P', 'cast-leo-fold-paper-happy', 'LEO happy folds a BLANK paper, identity locked, black field #000000, no letters'),
        c('P', 'cast-leo-gloves-on-happy', 'LEO happy puts on gloves, identity locked, black field #000000, no logos'),
        c('P', 'cast-leo-scarf-on-happy', 'LEO happy puts on a scarf, identity locked, distinct from coat-on/hat-on, black field #000000, no logos'),
        c('P', 'cast-leo-rake-leaves-happy', 'LEO happy rakes a small leaf pile fragment, identity locked, black field #000000, no outdoor full BG'),
        c('P', 'cast-leo-stomp-happy', 'LEO happy stomps one foot, identity locked, distinct from kick/hop, black field #000000'),
        c('P', 'cast-leo-blow-candle-happy', 'LEO happy blows out a candle, identity locked, black field #000000, no brand'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-pencil-sharpener', 'small pencil sharpener, unlabeled, no brand'),
        c('D', 'story-glue-bottle-blank', 'glue bottle unlabeled, distinct from gluestick-blank, no brand letters'),
        c('D', 'story-gloves-pair', 'pair of child gloves, still-life, no logos'),
        c('D', 'story-scarf', 'child scarf, unlabeled, no logos'),
        c('D', 'story-mitten-pair', 'pair of mittens, still-life, no logos'),
        c('D', 'story-gift-box-blank', 'closed gift box, unlabeled, ZERO letters, no bow-as-text'),
        c('D', 'story-wrapping-paper-blank', 'roll of wrapping paper, BLANK pattern, ZERO letters'),
        c('D', 'story-ribbon-coil', 'coiled ribbon, still-life, no brand'),
        c('D', 'story-candle-lit', 'simple lit candle, still-life, distinct from candle-unlit, no brand'),
      ]),
    ],
  },
  ml15: {
    id: 's4ml15-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml14 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-cough-elbow-happy', 'MIA happy coughs into elbow, identity locked, distinct from sneeze-elbow, black field #000000'),
        c('P', 'cast-mia-wink-happy', 'MIA happy winks, identity locked, black field #000000'),
        c('P', 'cast-mia-thumbs-down-happy', 'MIA happy thumbs-down, identity locked, distinct from thumbs-up, black field #000000'),
        c('P', 'cast-mia-point-self-happy', 'MIA happy points at herself, identity locked, distinct from point-at-object, black field #000000'),
        c('P', 'cast-mia-hug-self-happy', 'MIA happy hugs herself, identity locked, distinct from hug-object, black field #000000'),
        c('P', 'cast-mia-sit-stool-happy', 'MIA happy sits on a step stool, identity locked, distinct from sit-desk/sit-floor, black field #000000'),
        c('P', 'cast-mia-push-swing-happy', 'MIA happy pushes an empty swing, identity locked, distinct from sit-swing and push plates, black field #000000, no outdoor full BG'),
        c('P', 'cast-mia-wrap-gift-happy', 'MIA happy wraps a BLANK gift box, identity locked, black field #000000, no letters'),
        c('P', 'cast-mia-zip-coat-happy', 'MIA happy zips a coat closed, identity locked, distinct from zip-bag and coat-on, black field #000000, no logos'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-cough-elbow-happy', 'LEO happy coughs into elbow, identity locked, distinct from sneeze-elbow, black field #000000'),
        c('P', 'cast-leo-wink-happy', 'LEO happy winks, identity locked, black field #000000'),
        c('P', 'cast-leo-thumbs-down-happy', 'LEO happy thumbs-down, identity locked, distinct from thumbs-up, black field #000000'),
        c('P', 'cast-leo-point-self-happy', 'LEO happy points at himself, identity locked, distinct from point-at-object, black field #000000'),
        c('P', 'cast-leo-hug-self-happy', 'LEO happy hugs himself, identity locked, distinct from hug-object, black field #000000'),
        c('P', 'cast-leo-sit-stool-happy', 'LEO happy sits on a step stool, identity locked, distinct from sit-desk/sit-floor, black field #000000'),
        c('P', 'cast-leo-push-swing-happy', 'LEO happy pushes an empty swing, identity locked, distinct from sit-swing and push plates, black field #000000, no outdoor full BG'),
        c('P', 'cast-leo-wrap-gift-happy', 'LEO happy wraps a BLANK gift box, identity locked, black field #000000, no letters'),
        c('P', 'cast-leo-zip-coat-happy', 'LEO happy zips a coat closed, identity locked, distinct from zip-bag and coat-on, black field #000000, no logos'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-tissue-crumpled', 'one crumpled tissue, still-life, distinct from tissue-box and tissue-pack'),
        c('D', 'story-hat-blank', 'child hat, unlabeled, distinct from helmet-blank, no logos'),
        c('D', 'story-coat-hanging', 'child coat hanging, unlabeled, distinct from raincoat, no logos'),
        c('D', 'story-gift-open-empty', 'open gift box empty, unlabeled, ZERO letters'),
        c('D', 'story-bow-plain', 'plain gift bow, still-life, no letters'),
        c('D', 'story-stool-round', 'round stool empty, distinct from step-stool, still-life'),
        c('D', 'story-swing-empty-alt', 'empty swing with ropes, distinct from swing-empty chains, still-life, no outdoor full BG'),
        c('D', 'story-pencil-plain', 'one plain pencil, unlabeled, no brand, no letters'),
        c('D', 'story-paper-folded-blank', 'folded blank paper, ZERO letters, distinct from letter-folded-blank'),
      ]),
    ],
  },
  ml16: {
    id: 's4ml16-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml15 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-hat-off-happy', 'MIA happy takes a hat off, identity locked, distinct from hat-on, black field #000000, no logos'),
        c('P', 'cast-mia-mittens-on-happy', 'MIA happy puts on mittens, identity locked, distinct from gloves-on, black field #000000, no logos'),
        c('P', 'cast-mia-hang-picture-happy', 'MIA happy hangs a BLANK picture frame, identity locked, black field #000000, no letters'),
        c('P', 'cast-mia-stairs-up-happy', 'MIA happy walks up a short stair fragment, identity locked, black field #000000, no outdoor full BG'),
        c('P', 'cast-mia-stairs-down-happy', 'MIA happy walks down a short stair fragment, identity locked, black field #000000'),
        c('P', 'cast-mia-blow-nose-happy', 'MIA happy blows nose into a tissue, identity locked, distinct from sneeze-elbow, black field #000000'),
        c('P', 'cast-mia-point-you-happy', 'MIA happy points toward off-canvas viewer/peer, identity locked, distinct from point-self and point-object, black field #000000'),
        c('P', 'cast-mia-climb-stool-happy', 'MIA happy climbs onto a step stool, identity locked, distinct from sit-stool and climb plates, black field #000000'),
        c('P', 'cast-mia-tumble-blocks-happy', 'MIA happy topples a block tower, identity locked, distinct from stack-blocks, black field #000000, no letters'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-hat-off-happy', 'LEO happy takes a hat off, identity locked, distinct from hat-on, black field #000000, no logos'),
        c('P', 'cast-leo-mittens-on-happy', 'LEO happy puts on mittens, identity locked, distinct from gloves-on, black field #000000, no logos'),
        c('P', 'cast-leo-hang-picture-happy', 'LEO happy hangs a BLANK picture frame, identity locked, black field #000000, no letters'),
        c('P', 'cast-leo-stairs-up-happy', 'LEO happy walks up a short stair fragment, identity locked, black field #000000, no outdoor full BG'),
        c('P', 'cast-leo-stairs-down-happy', 'LEO happy walks down a short stair fragment, identity locked, black field #000000'),
        c('P', 'cast-leo-blow-nose-happy', 'LEO happy blows nose into a tissue, identity locked, distinct from sneeze-elbow, black field #000000'),
        c('P', 'cast-leo-point-you-happy', 'LEO happy points toward off-canvas viewer/peer, identity locked, distinct from point-self and point-object, black field #000000'),
        c('P', 'cast-leo-climb-stool-happy', 'LEO happy climbs onto a step stool, identity locked, distinct from sit-stool and climb plates, black field #000000'),
        c('P', 'cast-leo-tumble-blocks-happy', 'LEO happy topples a block tower, identity locked, distinct from stack-blocks, black field #000000, no letters'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-stairs-fragment', 'short indoor stair fragment, still-life, no outdoor full BG, no letters'),
        c('D', 'story-banister-fragment', 'short banister / handrail fragment, still-life'),
        c('D', 'story-picture-hook', 'one wall picture hook empty, still-life'),
        c('D', 'story-mitten-one', 'one mitten, still-life, distinct from mitten-pair'),
        c('D', 'story-glove-one', 'one glove, still-life, distinct from gloves-pair'),
        c('D', 'story-block-tower', 'small unlabeled block tower, still-life, no letters'),
        c('D', 'story-tissue-in-hand', 'tissue held as still-life (no person), unlabeled'),
        c('D', 'story-frame-hanging-blank', 'blank frame hanging, distinct from picture-frame-blank standing, ZERO letters'),
        c('D', 'story-hat-on-hook', 'hat on a peg, unlabeled, distinct from hat-blank, no logos'),
      ]),
    ],
  },
  ml17: {
    id: 's4ml17-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml16 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-open-window-happy', 'MIA happy opens a window fragment, identity locked, distinct from look-window, black field #000000, no outdoor scene, no letters'),
        c('P', 'cast-mia-close-window-happy', 'MIA happy closes a window fragment, identity locked, black field #000000, no letters'),
        c('P', 'cast-mia-sit-bench-happy', 'MIA happy sits on a short bench, identity locked, distinct from sit-stool/sit-desk, black field #000000'),
        c('P', 'cast-mia-stand-on-stool-happy', 'MIA happy stands on a step stool, identity locked, distinct from sit-stool and climb-stool, black field #000000'),
        c('P', 'cast-mia-carry-chair-happy', 'MIA happy carries a small chair, identity locked, distinct from carry-tray/carry-two-hands, black field #000000'),
        c('P', 'cast-mia-hang-towel-happy', 'MIA happy hangs a towel, identity locked, black field #000000, no monogram letters'),
        c('P', 'cast-mia-water-hose-happy', 'MIA happy holds a garden hose spraying, identity locked, distinct from water-plant, black field #000000, no outdoor full BG, no brand'),
        c('P', 'cast-mia-pour-pet-water-happy', 'MIA happy pours water into a pet bowl, identity locked, distinct from feed-pet, black field #000000, no labels'),
        c('P', 'cast-mia-gloves-off-happy', 'MIA happy takes gloves off, identity locked, distinct from gloves-on, black field #000000'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-open-window-happy', 'LEO happy opens a window fragment, identity locked, distinct from look-window, black field #000000, no outdoor scene, no letters'),
        c('P', 'cast-leo-close-window-happy', 'LEO happy closes a window fragment, identity locked, black field #000000, no letters'),
        c('P', 'cast-leo-sit-bench-happy', 'LEO happy sits on a short bench, identity locked, distinct from sit-stool/sit-desk, black field #000000'),
        c('P', 'cast-leo-stand-on-stool-happy', 'LEO happy stands on a step stool, identity locked, distinct from sit-stool and climb-stool, black field #000000'),
        c('P', 'cast-leo-carry-chair-happy', 'LEO happy carries a small chair, identity locked, distinct from carry-tray/carry-two-hands, black field #000000'),
        c('P', 'cast-leo-hang-towel-happy', 'LEO happy hangs a towel, identity locked, black field #000000, no monogram letters'),
        c('P', 'cast-leo-water-hose-happy', 'LEO happy holds a garden hose spraying, identity locked, distinct from water-plant, black field #000000, no outdoor full BG, no brand'),
        c('P', 'cast-leo-pour-pet-water-happy', 'LEO happy pours water into a pet bowl, identity locked, distinct from feed-pet, black field #000000, no labels'),
        c('P', 'cast-leo-gloves-off-happy', 'LEO happy takes gloves off, identity locked, distinct from gloves-on, black field #000000'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-window-latch', 'window latch fragment, still-life, no outdoor scene'),
        c('D', 'story-window-open-fragment', 'open window fragment empty, still-life, no outdoor full BG, no letters'),
        c('D', 'story-bench-park-short', 'short bench empty, distinct from bench-short hallway, still-life'),
        c('D', 'story-chair-child', 'small child chair empty, distinct from student-chair, still-life'),
        c('D', 'story-towel-hanging', 'towel hanging on a bar, still-life, no letters'),
        c('D', 'story-hose-nozzle', 'hose nozzle still-life, distinct from garden-hose-coil, no brand'),
        c('D', 'story-water-bowl-pet', 'pet water bowl empty, distinct from pet-bowl-empty food, still-life'),
        c('D', 'story-window-crank', 'window crank handle, still-life'),
        c('D', 'story-stair-rail', 'short stair handrail fragment, still-life, distinct from banister-fragment'),
      ]),
    ],
  },
  ml18: {
    id: 's4ml18-mia-leo-story-poses-dressing-more',
    title: 'Aggressive S4 more Mia/Leo story poses + dressing',
    stream: 'ML',
    family: 'mia-leo-story',
    attachRefs: true,
    style: `${STYLE}
FAMILY: more missing Mia/Leo story poses plus composable black-field dressing. Not full BGs. Not new named kids.
${IDENTITY}
${SKIP}
SKIP MORE: do not redraw ml1–ml17 keys.`,
    sheets: [
      sh('S1', 'Mia more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-mia-zip-backpack-happy', 'MIA happy zips a backpack, identity locked, distinct from zip-bag and zip-coat, black field #000000, no logos'),
        c('P', 'cast-mia-unscrew-lid-happy', 'MIA happy unscrews a bottle lid, identity locked, distinct from open-lid box, black field #000000, no labels'),
        c('P', 'cast-mia-toast-cups-happy', 'MIA happy toasts with a cup toward off-canvas, identity locked, distinct from pour, black field #000000, no labels'),
        c('P', 'cast-mia-wave-both-happy', 'MIA happy waves both hands, identity locked, distinct from wave plates, black field #000000'),
        c('P', 'cast-mia-sit-bed-happy', 'MIA happy sits on a bed fragment, identity locked, distinct from lie-down, black field #000000, no headboard letters'),
        c('P', 'cast-mia-tuck-in-happy', 'MIA happy tucks a blanket on a bed fragment, identity locked, distinct from make-bed, black field #000000'),
        c('P', 'cast-mia-turn-knob-happy', 'MIA happy turns a doorknob, identity locked, distinct from open-door, black field #000000, no EXIT text'),
        c('P', 'cast-mia-carry-pillow-happy', 'MIA happy carries a pillow, identity locked, distinct from hug-object and carry-two-hands, black field #000000, no letters'),
        c('P', 'cast-mia-put-book-shelf-happy', 'MIA happy puts a BLANK book on a shelf, identity locked, distinct from take-from-shelf, black field #000000, no spine letters'),
      ], IDENTITY),
      sh('S2', 'Leo more story poses 3x3', 'black-contact-3x3', [
        c('P', 'cast-leo-zip-backpack-happy', 'LEO happy zips a backpack, identity locked, distinct from zip-bag and zip-coat, black field #000000, no logos'),
        c('P', 'cast-leo-unscrew-lid-happy', 'LEO happy unscrews a bottle lid, identity locked, distinct from open-lid box, black field #000000, no labels'),
        c('P', 'cast-leo-toast-cups-happy', 'LEO happy toasts with a cup toward off-canvas, identity locked, distinct from pour, black field #000000, no labels'),
        c('P', 'cast-leo-wave-both-happy', 'LEO happy waves both hands, identity locked, distinct from wave plates, black field #000000'),
        c('P', 'cast-leo-sit-bed-happy', 'LEO happy sits on a bed fragment, identity locked, distinct from lie-down, black field #000000, no headboard letters'),
        c('P', 'cast-leo-tuck-in-happy', 'LEO happy tucks a blanket on a bed fragment, identity locked, distinct from make-bed, black field #000000'),
        c('P', 'cast-leo-turn-knob-happy', 'LEO happy turns a doorknob, identity locked, distinct from open-door, black field #000000, no EXIT text'),
        c('P', 'cast-leo-carry-pillow-happy', 'LEO happy carries a pillow, identity locked, distinct from hug-object and carry-two-hands, black field #000000, no letters'),
        c('P', 'cast-leo-put-book-shelf-happy', 'LEO happy puts a BLANK book on a shelf, identity locked, distinct from take-from-shelf, black field #000000, no spine letters'),
      ], IDENTITY),
      sh('S3', 'more story dressing 3x3', 'black-contact-3x3', [
        c('D', 'story-bottle-cap', 'bottle cap still-life, unlabeled, no brand'),
        c('D', 'story-cup-pair', 'two empty cups, still-life, no brand, no ml marks'),
        c('D', 'story-pillow-sleep', 'bed pillow, still-life, distinct from throw-pillow, no letters'),
        c('D', 'story-blanket-tucked', 'tucked blanket on a bed fragment empty, still-life, distinct from blanket-folded'),
        c('D', 'story-knob-round', 'round knob still-life, distinct from doorknob on door'),
        c('D', 'story-straw-plain', 'plain drinking straw, still-life, no brand'),
        c('D', 'story-lunchbox-closed', 'closed lunchbox unlabeled, distinct from lunchbag-closed, no logos'),
        c('D', 'story-book-standing-blank', 'one standing book, blank cover/spine, ZERO letters'),
        c('D', 'story-shelf-with-gap', 'short shelf with a gap for a book, empty-ish, no spine letters'),
      ]),
    ],
  },
};

export const WAVE_ORDER = ['ml1', 'ml2', 'ml3', 'ml4', 'ml5', 'ml6', 'ml7', 'ml8', 'ml9', 'ml10', 'ml11', 'ml12', 'ml13', 'ml14', 'ml15', 'ml16', 'ml17', 'ml18'];
export const MANUS_WORTHY = WAVE_ORDER.flatMap((k) => WAVES[k].sheets.flatMap((s) => s.cells));

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const hay = [cell.key, cell.concept, cell.brief].join(' ').toLowerCase();
    const hit = [...SAFETY_SKIP_KEYS].find((deny) => new RegExp(`(^|[^a-z0-9])${deny}([^a-z0-9]|$)`).test(hay));
    if (hit) skipped.push({ key: cell.key, reason: `MANUS_SAFETY_DENY:${hit}` });
    else kept.push(cell);
  }
  return { kept, skipped };
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((cell, i) => `${i + 1}. ${cell.key} — ${cell.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format}, one concept per cell):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((x) => x.key).join(',')}${sheet.extra ? `\n${sheet.extra}` : ''}`;
}

function buildBrief(wave, sheets) {
  return `TASK: Produce **${sheets.length} aggressive-S4 Mia/Leo story black-field PNG contact sheet(s)** for ClassIn ESL.

SOURCE OF TRUTH: scripts/manus/request-aggressive-s4-mia-leo.mjs, this wave only. Partition harvested/manus-aggressive-stockpile/s4-mia-leo-story/. Future merge prefix ${MANIFEST_PREFIX} only.

${wave.style}

HARD RULES:
- Generate ONLY the listed cells. Do not review, dedupe, research, broaden, or add concepts.
- Reading order left to right, top to bottom.
- One concept per cell, pure #000000 black field, clear gutters, nothing crossing cell boundaries.
- NO baked readable text, fake writing, labels, letters, numbers, prices, times, dates, dialogue, signs, badges, logos, UI text, or watermarks.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG contact sheet exists. The 5-image cap is per generate_image call, not per task. This wave has ${sheets.length} sheets: fire them inside THIS task.
- People/face sheets: accept soft-3D drift; do not regenerate for flatness. Do regenerate if any cell is on white/grey instead of #000000 black.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return PNGs, preferably one zip plus CDN links. No essay.`;
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      if (url) hits.push({ url, name: a.file_name || a.filename || a.name || 'sheet.png' });
    }
  }
  return hits;
}

function sniffKind(buf, name = '') {
  const n = String(name).toLowerCase();
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (n.endsWith('.zip')) return 'zip';
  if (n.endsWith('.png')) return 'png';
  return 'other';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback).replace(/\\/g, '/'));
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-') || fallback;
}

function walkPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPngs(p));
    else if (/\.png$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync('tar', ['-xf', zipPath, '-C', outDir], { encoding: 'utf8', windowsHide: true });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`],
    { encoding: 'utf8', windowsHide: true },
  );
  if (ps.status !== 0) {
    throw new Error(`Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`);
  }
}

function clearNumberedSheets(sheetDir) {
  if (!fs.existsSync(sheetDir)) return;
  for (const f of fs.readdirSync(sheetDir)) {
    if (/^\d{2}\.(png|jpg|jpeg|webp)$/i.test(f)) fs.unlinkSync(path.join(sheetDir, f));
  }
}

function materializePngs(sheetDir) {
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  const byName = new Map();
  for (const p of [...walkPngs(unzipRoot), ...walkPngs(rawDir)]) {
    const key = path.basename(p).toLowerCase();
    if (!byName.has(key)) byName.set(key, p);
  }
  const sorted = [...byName.values()].sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en'));
  clearNumberedSheets(sheetDir);
  const saved = [];
  sorted.forEach((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    saved.push({ dest, bytes: fs.statSync(dest).size, name: path.basename(src), file });
  });
  return saved;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  fs.mkdirSync(rawDir, { recursive: true });
  if (fs.existsSync(unzipRoot)) fs.rmSync(unzipRoot, { recursive: true, force: true });
  fs.mkdirSync(unzipRoot, { recursive: true });
  const seen = new Set();
  let i = 0;
  let zipN = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const kind = sniffKind(buf, img.name);
    const fallback = `${String(i).padStart(2, '0')}.${kind === 'zip' ? 'zip' : kind === 'jpg' ? 'jpg' : 'png'}`;
    const dest = path.join(rawDir, safeName(img.name, fallback));
    fs.writeFileSync(dest, buf);
    if (kind === 'zip') {
      zipN += 1;
      extractZip(dest, path.join(unzipRoot, `z${zipN}`));
    }
  }
  return materializePngs(sheetDir);
}

function expectedSheets(wave) {
  return wave.sheets.length;
}

function emptyInv() {
  return {
    spec: 'aggressive-s4-mia-leo-story',
    partition: STOCKPILE_REL,
    manifest_prefix: MANIFEST_PREFIX,
    no_wiring: true,
    updated_at: null,
    running_total: {
      original_manus_worthy: MANUS_WORTHY.length,
      pass: 0,
      hold: 0,
      locally_recovered: 0,
      regenerated: 0,
      safety_skipped: 0,
      sheets_downloaded: 0,
      tasks_used: 0,
    },
    by_stream: { P: 0, D: 0 },
    waves: {},
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.by_stream = {
    P: items.filter((it) => it.stream === 'P').length,
    D: items.filter((it) => it.stream === 'D').length,
  };
  inv.running_total = {
    original_manus_worthy: MANUS_WORTHY.length,
    pass: items.filter((it) => it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.qa_status === 'HOLD').length,
    locally_recovered: items.filter((it) => it.recovered_locally).length,
    regenerated: items.filter((it) => it.regenerated).length,
    safety_skipped: waves.reduce((n, w) => n + (w.safety_skipped_at_fire || []).length, 0),
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    tasks_used: waves.filter((w) => w.task_id).length,
  };
}

async function withInvLock(fn) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  for (let i = 0; i < 80; i += 1) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 80));
    }
    if (i === 79) fs.rmSync(LOCK, { force: true });
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

function loadInv() {
  const invPath = path.join(STOCKPILE, 'inventory.json');
  for (const p of [invPath, TRACKED_INV]) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch {
        /* continue */
      }
    }
  }
  return emptyInv();
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  const json = JSON.stringify(inv, null, 2);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), json);
  fs.mkdirSync(path.dirname(TRACKED_INV), { recursive: true });
  fs.writeFileSync(TRACKED_INV, json);
  return TRACKED_INV;
}

function upsertInventory(wave, sheets, dump) {
  const inv = loadInv();
  if (!inv.waves) inv.waves = {};
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((s) => s.cells.map((cell) => ({
    ...cell,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: cell.qa_status || null,
    recovered_locally: false,
    regenerated: false,
    qa_note: haveLarge
      ? 'Raw sheet downloaded; visual QA/recovery must record PASS or HOLD before close.'
      : null,
    path: dump.sheet_dir || null,
    sheet_id: s.id,
    manus_task_id: dump.task_id || null,
  })));
  inv.waves[wave.id] = {
    stream: wave.stream,
    family: wave.family,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    safety_skipped_at_fire: dump.safety_skipped || [],
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  return writeInv(inv);
}

async function filePart(filePath) {
  const part = await fileContentPart(filePath);
  return {
    type: 'file',
    filename: part.filename,
    ...(part.file_data ? { file_data: part.file_data } : { file_id: part.file_id }),
  };
}

async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --all`);

  const OUT_DIR = path.join(STOCKPILE, wave.id);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
  const pollOnly = process.argv.includes('--poll-only');

  const safetyAll = { keptSheets: [], skipped: [] };
  for (const s of wave.sheets) {
    const { kept, skipped } = filterSafety(s.cells);
    safetyAll.skipped.push(...skipped);
    safetyAll.keptSheets.push({ ...s, cells: kept });
  }
  const sheets = safetyAll.keptSheets.filter((s) => s.cells.length);
  const NEED_SHEETS = expectedSheets(wave);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        stream: wave.stream,
        family: wave.family,
        manifest_prefix: MANIFEST_PREFIX,
        concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        safety_skipped: safetyAll.skipped,
        sheets: sheets.map((s) => ({ id: s.id, title: s.title, format: s.format, keys: s.cells.map((x) => x.key) })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave, sheets);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'aggressive-s4-mia-leo',
    wave: wave.id,
    stream: wave.stream,
    family: wave.family,
    sheet_dir: SHEET_DIR,
    safety_skipped: safetyAll.skipped,
    concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
    expected_sheets: NEED_SHEETS,
  };

  if (!sheets.length) {
    console.log(JSON.stringify({ phase: 'nothing-to-send', wave: wave.id }, null, 2));
    return;
  }

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exit(2);
      }
    }
    const content = [{ type: 'text', text: BRIEF }];
    if (wave.attachRefs) {
      content.push(await filePart(REF_MIA), await filePart(REF_LEO));
    }
    const created = await createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: { content },
    });
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, sheets, dump));
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return;
  } else {
    if (!taskId && fs.existsSync(RUN_JSON)) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      taskId = prev.task_id;
      dump.started_at = prev.started_at || dump.started_at;
      dump.task_url = prev.task_url;
    }
    if (!taskId) throw new Error('--poll-only needs --task= or an existing run.json');
    dump.task_id = taskId;
    dump.task_url = dump.task_url || `https://manus.im/app/${taskId}`;
  }

  let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
  let large = saved.filter((s) => s.bytes > 80_000);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} black-field sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list.`,
      ),
    });
    result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
    large = saved.filter((s) => s.bytes > 80_000);
  }

  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (large.length < NEED_SHEETS) {
    dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNG sheets; raw kept for mop.`];
  }
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at || dump.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, sheets, dump));
  const largeCount = saved.filter((s) => s.bytes > 80_000).length;
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    stream: wave.stream,
    task_id: taskId,
    task_url: dump.task_url,
    count: saved.length,
    large: largeCount,
    expected_sheets: NEED_SHEETS,
    sheet_dir: SHEET_DIR,
    inventory: invPath,
  }, null, 2));
  if (largeCount < NEED_SHEETS) process.exit(2);
}

const counts = { P: 0, D: 0 };
for (const cell of MANUS_WORTHY) counts[cell.stream] += 1;
if (counts.P !== 306 || counts.D !== 180) {
  throw new Error(`S4 Mia/Leo key integrity P/D ${JSON.stringify(counts)}`);
}

apiKey();
if (process.argv.includes('--all')) {
  for (const w of WAVE_ORDER) await runWave(w);
} else {
  await runWave(arg('wave', ''));
}
