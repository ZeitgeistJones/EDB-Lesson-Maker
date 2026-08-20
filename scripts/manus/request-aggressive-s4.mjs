/**
 * Aggressive stockpile PACK 4 — streams E (a11y/manipulatives), F (role tools),
 * H (missing micro-actions), K (high-demand alt views).
 * Stockpile only. No producer wiring. If later merged: prefix aggressive-s4- only.
 *
 *   node scripts/manus/request-aggressive-s4.mjs --wave=e --fire
 *   node scripts/manus/request-aggressive-s4.mjs --wave=f --fire
 *   node scripts/manus/request-aggressive-s4.mjs --wave=hk --fire
 *   node scripts/manus/request-aggressive-s4.mjs --wave=e --poll-only
 *
 * Sheets: harvested/manus-aggressive-stockpile/s4-roles-a11y/<wave-id>/sheets/
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
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s4-roles-a11y';
export const TRACKED_INV_REL = 'docs/aggressive-stockpile-s4-inventory.json';
export const TRACKED_REPORT_REL = 'docs/aggressive-stockpile-s4.md';
export const MANIFEST_PREFIX = 'aggressive-s4-';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const TRACKED_INV = path.join(ROOT, TRACKED_INV_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 55 * 60 * 1000;

export const SAFETY_SKIP_KEYS = new Set([
  'rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun',
]);

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, and padding across every sheet. No photorealism, no glossy 3D, no sticker-pack chaos.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text, Braille-as-Latin, or fake readable text.
BLACK FIELD LOCK: every contact sheet is pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black.
INCLUSION LOCK: accessibility gear is ordinary everyday equipment — respectful, not a spectacle, not medical horror, not inspiration-porn. No exaggerated disability caricature.
STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to PropBank, modify renderer, or broaden this list.
QUALITY: default only.`;

const PEOPLE_LOCK = `PEOPLE BLACK-FIELD FAILURE LOCK: draw people directly on pure #000000 black. No white cards, white panels, grey rectangles, or white cell backgrounds. Avoid white clothing that vanishes in keying; use colored clothes with clear outlines. Generic children only — do NOT draw Mia or Leo identity (hair/outfit from the existing story-cast plates).`;

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
  e: {
    id: 's4e-a11y-manipulatives',
    title: 'Aggressive S4E accessibility + classroom manipulatives',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: everyday access equipment and blank classroom manipulatives. Isolated still-lifes, not people using them as a show. Communication boards and braille slates are EMPTY SHELLS — colored blank cells only, no pictograms that read as language, no letters, no numbers.`,
    sheets: [
      sh('S1', 'access sensory 3x3', 'black-contact-3x3', [
        c('E', 'white-cane', 'folded/unfolded-friendly long white mobility cane still-life, ordinary, no spectacle, no text'),
        c('E', 'braille-slate', 'small braille slate / writing frame with EMPTY round cells, no Latin letters, no readable dots-as-words'),
        c('E', 'braille-stylus', 'simple braille stylus tool still-life, kid-safe, no labels'),
        c('E', 'hearing-aid', 'behind-the-ear hearing aid still-life, ordinary, no brand, no text'),
        c('E', 'cochlear-implant', 'pediatric cochlear implant processor + simple magnet coil, ordinary medical accessory, not scary, no logos'),
        c('E', 'communication-board-shell', 'AAC communication board SHELL: empty colored square grid, ZERO pictograms, letters, or words'),
        c('E', 'tactile-paving-tile', 'one tactile paving / blister-dot sidewalk tile fragment, isolated, no street text'),
        c('E', 'hand-magnifier', 'simple handheld magnifying glass, no lens text or logos'),
        c('E', 'noise-reducing-headphones', 'kid over-ear noise-reducing headphones, ordinary, no brand'),
      ]),
      sh('S2', 'mobility variants 3x3', 'black-contact-3x3', [
        c('E', 'wheelchair-manual-side', 'manual wheelchair side-view still-life, ordinary, distinct from front-on pack icon, no labels'),
        c('E', 'wheelchair-power', 'compact power wheelchair still-life, ordinary, no joystick brands or screens with text'),
        c('E', 'wheelchair-sports', 'sports/everyday active wheelchair still-life, ordinary not a podium spectacle, no numbers'),
        c('E', 'walker-frame', 'simple folding walker / walking frame, ordinary, no height numbers'),
        c('E', 'rollator', 'four-wheel rollator with seat, ordinary, no brand'),
        c('E', 'forearm-crutches', 'pair of forearm / elbow crutches, distinct from underarm crutches already in pack, no text'),
        c('E', 'prosthetic-arm', 'respectful ordinary below-elbow prosthetic arm still-life, simple socket, not a robot claw, no logos'),
        c('E', 'prosthetic-leg', 'respectful ordinary below-knee prosthetic leg + shoe still-life, everyday, not a spectacle'),
        c('E', 'transfer-board', 'simple wooden transfer board, isolated, no instruction text'),
      ]),
      sh('S3', 'manipulatives A 3x3', 'black-contact-3x3', [
        c('E', 'rekenrek', '20-bead rekenrek / arithmetic rack, two rows of beads, NO numbers or letters on the frame'),
        c('E', 'geoboard', 'square geoboard with pegs, a few blank rubber bands, NO coordinate numbers'),
        c('E', 'tangram-set', 'classic 7-piece tangram set arranged as a square, solid colors, no printed outlines or letters'),
        c('E', 'linking-cubes', 'short train of interlocking linking cubes, mixed colors, no numerals on faces'),
        c('E', 'fraction-tiles', 'blank fraction tile set as colored bars of different lengths, NO printed fractions, numbers, or words'),
        c('E', 'number-rods', 'Cuisenaire-style number rods in a stair, length encodes value, NO printed numbers'),
        c('E', 'ten-frame-empty', 'empty 2×5 ten-frame board, no counters, no numerals'),
        c('E', 'pattern-blocks', 'small pile of classic pattern blocks (hex, trap, rhombus, triangle, square), no letters'),
        c('E', 'base-ten-flats', 'base-ten flats / rods / units still-life, NO printed hundreds/tens labels'),
      ]),
      sh('S4', 'manipulatives B 3x3', 'black-contact-3x3', [
        c('E', 'two-color-counters', 'small stack of two-color counters (red/yellow), no numerals'),
        c('E', 'attribute-blocks', 'attribute block set: mixed shapes/colors/sizes, no letters on pieces'),
        c('E', 'balance-scale', 'simple pan balance scale empty, classroom, no weight numbers'),
        c('E', 'student-clock-blank', 'geared student clock SHELL with hands, BLANK face — no numerals, no letters'),
        c('E', 'place-value-disks', 'colored place-value disks, NO printed 1/10/100 numerals'),
        c('E', 'unifix-stair', 'unifix / interlocking cube stair of different heights, no numbers'),
        c('E', 'spinner-blank', 'classroom spinner with empty colored wedges, no words or numbers'),
        c('E', 'dot-dice', 'standard pip dice still-life, pips only, no numerals or words'),
        c('E', 'choice-board-shell', 'simple 2×3 choice board SHELL, empty colored cells, ZERO icons/text'),
      ]),
    ],
  },
  f: {
    id: 's4f-role-detail-props',
    title: 'Aggressive S4F professional role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: handheld / table tools the EXISTING cast uses (chef, clinician, dentist, mechanic, teacher, gardener, photographer, tailor). Objects only — do NOT draw new character bodies, uniforms-as-people, or extra cast plates.
SKIP LOCK: do not redraw spatula, whisk, chef-hat, stethoscope, wrench, garden-trowel, common garden tools, dress-form, pinking-shears, spinning-wheel, or the existing photo-* kit.`,
    sheets: [
      sh('S1', 'chef tools 3x3', 'black-contact-3x3', [
        c('F', 'mixing-bowl', 'deep mixing bowl empty, kitchen still-life, no logos'),
        c('F', 'oven-mitt', 'quilted oven mitt / pot holder, no brand'),
        c('F', 'piping-bag', 'pastry piping bag with a simple star tip, no icing letters'),
        c('F', 'tasting-spoon', 'small tasting / chef spoon, still-life'),
        c('F', 'cutting-board', 'plain wooden cutting board empty, no burn marks that look like letters'),
        c('F', 'steamer-basket', 'bamboo or metal steamer basket, empty, no restaurant text'),
        c('F', 'pastry-brush', 'pastry / basting brush, still-life, no brand'),
        c('F', 'kitchen-timer-blank', 'mechanical kitchen timer, BLANK face, no numerals'),
        c('F', 'folded-apron', 'folded cloth apron still-life, no restaurant logos'),
      ]),
      sh('S2', 'clinician dentist tools 3x3', 'black-contact-3x3', [
        c('F', 'otoscope', 'child-safe otoscope still-life, no brand, not scary'),
        c('F', 'blood-pressure-cuff', 'simple BP cuff + gauge with BLANK dial (no numbers), kid-safe'),
        c('F', 'tongue-depressor', 'wooden tongue depressor, still-life, no printed size marks as words'),
        c('F', 'reflex-hammer', 'small reflex hammer, ordinary clinic tool, not a weapon'),
        c('F', 'pulse-oximeter', 'finger pulse oximeter, BLANK screen, no digits or logos'),
        c('F', 'dental-mirror', 'small mouth mirror on a handle, dentist tool still-life'),
        c('F', 'dental-explorer', 'sickle dental explorer tool, still-life, kid-safe illustration'),
        c('F', 'dental-bib', 'paper dental bib / napkin with clips, no clinic text'),
        c('F', 'dental-suction-tip', 'saliva ejector / suction tip, ordinary, not gore'),
      ]),
      sh('S3', 'mechanic teacher tools 3x3', 'black-contact-3x3', [
        c('F', 'car-jack', 'small floor / scissor jack still-life, no brand'),
        c('F', 'jumper-cables', 'jumper cable pair with clamps, coiled, no car-brand text'),
        c('F', 'oil-can', 'classic oil can, no brand label'),
        c('F', 'socket-set', 'small socket set in an open case, tools only, no size-number stamps that read as text'),
        c('F', 'mechanic-creeper', 'low mechanic creeper board, isolated, no garage signs'),
        c('F', 'teacher-pointer', 'simple classroom pointer stick, no laser-brand'),
        c('F', 'rubber-stamp-blank', 'rubber stamp with BLANK wooden handle face, no letters on the stamp'),
        c('F', 'attendance-clipboard-blank', 'clipboard with a completely BLANK sheet, zero writing'),
        c('F', 'magnet-wand', 'classroom magnet wand, still-life, no polarity letters'),
      ]),
      sh('S4', 'garden photo tailor tools 3x3', 'black-contact-3x3', [
        c('F', 'kneeling-pad', 'garden kneeling pad, isolated, no brand'),
        c('F', 'seed-tray', 'empty seedling tray / insert, no seed-packet text'),
        c('F', 'plant-cloche', 'small glass/plastic plant cloche, still-life'),
        c('F', 'tripod', 'compact photo tripod folded or standing, no brand'),
        c('F', 'lens-cap', 'camera lens cap still-life, no logo letters'),
        c('F', 'remote-shutter', 'simple camera remote / shutter release, blank, no brand'),
        c('F', 'seam-ripper', 'tailor seam ripper tool, still-life'),
        c('F', 'pin-cushion', 'tomato-style pin cushion with a few pins, no measurement numbers'),
        c('F', 'thimble', 'simple sewing thimble, still-life'),
      ]),
    ],
  },
  hk: {
    id: 's4hk-micro-actions-altviews',
    title: 'Aggressive S4 H micro-actions + K alt views',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: sheet S1 = missing high-frequency child micro-actions (generic kids, not Mia/Leo). Sheet S2 = alternative representations of HIGH-DEMAND objects (cutaway / profile / in-use) that enable a different activity — do NOT redraw the existing front-on vocab icon.
SKIP LOCK: do not redraw H1 poses (kneel-pick-up, search-under-table, knock, comfort, apologize, invite, permission, wait-in-line, peer-check), lt2 poses (carry-together, pass-object, peek-corner, tie-shoe, zip-coat, wash-hands), lt4 poses (share-umbrella, high-five, whisper, hold-door, help-up, cross-street), or Mia/Leo action plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach).
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'missing micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-look-inside-box', 'generic child looks inside an open box, clear look-inside action, black field, colored clothes, no text'),
        c('H', 'pose-pack-backpack', 'generic child packs items into an open backpack, packing action, black field, no logos or letters'),
        c('H', 'pose-pour', 'generic child pours from a simple pitcher into a cup, pouring action, black field, no labels'),
        c('H', 'pose-clap', 'generic child claps hands, celebration/attention pose, black field, no text'),
        c('H', 'pose-kneel-listen', 'generic child kneels on a rug to listen in a circle, distinct from picking something up, black field'),
        c('H', 'pose-point-to-object', 'generic child points at a nearby object on the floor/table, pointing action, black field'),
        c('H', 'pose-cover-eyes', 'generic child covers eyes with both hands (peekaboo / hide-eyes), black field, no text'),
        c('H', 'pose-give-to-adult', 'generic child hands an object to a standing adult, adult-handoff (not peer pass), black field'),
        c('H', 'pose-zip-bag', 'generic child zips a bag/lunchbag closed, getting-ready pack finish, black field, no brand'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand alt views 3x3', 'black-contact-3x3', [
        c('K', 'apple-cutaway', 'same apple idea as a CROSS-SECTION cutaway showing core/seeds, still-life, no labels'),
        c('K', 'sandwich-cutaway', 'sandwich CROSS-SECTION showing layers, distinct from a whole sandwich icon, no wrappers/text'),
        c('K', 'water-bottle-cutaway', 'clear water bottle CUTAWAY showing water inside, no brand or ml marks'),
        c('K', 'shoe-side-profile', 'shoe strict SIDE PROFILE, distinct from top-down, no size numbers or logos'),
        c('K', 'bus-side-profile', 'school/city bus SIDE PROFILE still-life, distinct from front-on, blank destination, no route numbers'),
        c('K', 'book-open-spread-blank', 'hardcover book open to a BLANK spread, usable as a write-on shell, zero letters'),
        c('K', 'house-cutaway', 'simple dollhouse-style house CUTAWAY with 2 empty rooms, no furniture labels or family names'),
        c('K', 'flashlight-in-use', 'flashlight IN USE with a simple cone of light, not just the off torch, no brand'),
        c('K', 'egg-cross-section', 'hard-boiled egg CROSS-SECTION (white + yolk), distinct from whole/cracked pair, no labels'),
      ]),
    ],
  },
  e2: {
    id: 's4e2-a11y-manipulatives-more',
    title: 'Aggressive S4E2 more access gear + manipulatives',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank manipulatives. Empty shells only. No spectacle. No letters or numbers.`,
    sheets: [
      sh('S1', 'more access everyday 3x3', 'black-contact-3x3', [
        c('E', 'pencil-grip', 'soft pencil grip / finger cushion still-life, ordinary, no brand'),
        c('E', 'slant-board', 'classroom slant board / writing slope empty, no letters on the surface'),
        c('E', 'adapted-scissors', 'self-opening adapted scissors, kid-safe, no brand'),
        c('E', 'reacher-grabber', 'long reacher / grabber tool, ordinary, no logos'),
        c('E', 'grab-bar', 'simple bathroom/wall grab bar fragment, isolated, no ADA text'),
        c('E', 'shower-chair', 'simple shower chair / bench, ordinary, not a spectacle'),
        c('E', 'lidded-straw-cup', 'lidded cup with a straw, still-life, no brand or ml marks'),
        c('E', 'scoop-bowl', 'scoop bowl with a high rim, ordinary meal aid, no labels'),
        c('E', 'visual-schedule-shell', 'vertical visual schedule SHELL: empty colored cards in a strip, ZERO pictograms or words'),
      ]),
      sh('S2', 'more mobility small aids 3x3', 'black-contact-3x3', [
        c('E', 'cane-tip', 'white-cane replacement tip still-life, ordinary'),
        c('E', 'wheelchair-lap-tray', 'wheelchair lap tray empty, isolated, no labels'),
        c('E', 'ankle-foot-orthosis', 'simple AFO / ankle-foot brace, respectful ordinary, not medical gore'),
        c('E', 'thick-frame-glasses', 'thick-frame eyeglasses still-life, ordinary, no brand'),
        c('E', 'braille-paper', 'sheet of braille paper with EMPTY dots grid, no Latin letters'),
        c('E', 'raised-line-paper', 'raised-line writing paper SHELL, blank lines only, no letters'),
        c('E', 'button-hook', 'button-hook dressing aid, ordinary still-life'),
        c('E', 'sock-aid', 'sock aid dressing tool, ordinary, no brand'),
        c('E', 'weighted-lap-pad', 'small weighted lap pad, ordinary classroom, no labels'),
      ]),
      sh('S3', 'more manipulatives 3x3', 'black-contact-3x3', [
        c('E', 'fraction-circles', 'blank fraction circle pieces nested, NO printed fractions or numbers'),
        c('E', 'counting-bears', 'small pile of counting bears, mixed colors, no numerals'),
        c('E', 'bead-string', '100-bead string / rekenrek-on-a-string, NO numbers on the string'),
        c('E', 'pentominoes', 'set of pentomino pieces, solid colors, no letters on faces'),
        c('E', 'lacing-card-blank', 'blank lacing card with holes, no printed picture-as-word, no letters'),
        c('E', 'color-tiles', 'square color tiles stack, no numerals'),
        c('E', 'domino-blank-pips', 'classroom domino with pips only, no numerals'),
        c('E', 'number-balance-blank', 'pan number-balance toy with EMPTY pegs, NO printed numerals'),
        c('E', 'geo-solids', 'small set of geometric solids (cube sphere cone cylinder), no labels'),
      ]),
    ],
  },
  f2: {
    id: 's4f2-role-detail-more',
    title: 'Aggressive S4F2 more role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools across the role bank (barista, waiter, hair, artist, science, vet, plumber, tailor, mechanic). Objects only — no new bodies.
SKIP LOCK: do not redraw spatula, whisk, chef-hat, stethoscope, wrench, garden-trowel, photo-* kit, dress-form, pinking-shears, mixing-bowl, tripod, seam-ripper.`,
    sheets: [
      sh('S1', 'cafe hair art tools 3x3', 'black-contact-3x3', [
        c('F', 'portafilter', 'espresso portafilter still-life, no brand or cafe text'),
        c('F', 'milk-pitcher', 'stainless milk frothing pitcher, empty, no logos'),
        c('F', 'serving-tray', 'round waiter serving tray empty, no restaurant text'),
        c('F', 'hair-comb', 'simple hair comb, still-life, no brand'),
        c('F', 'hair-clips', 'two plain hair clips / sectioning clips, still-life'),
        c('F', 'paint-palette', 'artist palette with a few paint blobs, no color-name text'),
        c('F', 'flat-paintbrush', 'flat paintbrush, still-life, no brand'),
        c('F', 'palette-knife', 'artist palette knife, still-life'),
        c('F', 'easel-clip', 'small easel clip / bulldog clip, still-life'),
      ]),
      sh('S2', 'science vet plumber tools 3x3', 'black-contact-3x3', [
        c('F', 'pipette', 'simple dropper pipette, still-life, no lab logos'),
        c('F', 'safety-goggles', 'clear safety goggles, still-life, no brand'),
        c('F', 'specimen-jar-blank', 'small specimen jar empty, BLANK label area, no words'),
        c('F', 'recovery-collar', 'soft pet recovery collar, ordinary, not a joke costume'),
        c('F', 'nail-trimmer', 'small pet/people nail trimmer, still-life'),
        c('F', 'plunger', 'cup plunger still-life, ordinary, no brand'),
        c('F', 'pipe-cutter', 'small pipe cutter tool, still-life'),
        c('F', 'drain-snake', 'hand drain snake coiled, still-life, no logos'),
        c('F', 'putty-knife', 'simple putty knife / scraper, still-life'),
      ]),
      sh('S3', 'tailor chef mechanic extras 3x3', 'black-contact-3x3', [
        c('F', 'tailor-chalk', 'triangle tailor chalk, still-life, no size numbers'),
        c('F', 'thread-spool', 'plain thread spool, unlabeled, no brand'),
        c('F', 'rotary-cutter', 'fabric rotary cutter, still-life, no brand'),
        c('F', 'measuring-tape-blank', 'soft measuring tape coiled, BLANK — no numerals or inch marks that read as numbers'),
        c('F', 'mechanic-funnel', 'shop funnel, still-life, no brand'),
        c('F', 'tire-iron', 'simple tire iron / lug wrench bar, still-life'),
        c('F', 'fish-turner', 'slotted fish turner / offset spatula, distinct from kitchen-spatula, no brand'),
        c('F', 'instant-read-thermometer-blank', 'instant-read kitchen thermometer, BLANK dial/screen, no digits'),
        c('F', 'mandoline-slicer', 'child-safe looking mandoline slicer still-life, no brand, blade not gory'),
      ]),
    ],
  },
  hk2: {
    id: 's4hk2-micro-actions-altviews-more',
    title: 'Aggressive S4 H2+K2 more micro-actions + alt views',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: more missing micro-actions (generic kids, not Mia/Leo) plus a few more HIGH-DEMAND alt views. Do not repeat S4 H1/K1 cells or H1/lt2/lt4/Mia-Leo plates.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-look-through-window', 'generic child looks through a small window fragment, look-inside/out action, black field, no signs'),
        c('H', 'pose-carry-tray', 'generic child carries a tray with both hands, black field, no food labels'),
        c('H', 'pose-sit-on-floor', 'generic child sits cross-legged on the floor, black field, colored clothes'),
        c('H', 'pose-stand-on-tiptoe', 'generic child stands on tiptoe reaching a high shelf fragment, black field'),
        c('H', 'pose-open-lid', 'generic child opens a box/jar lid, look-inside setup, black field'),
        c('H', 'pose-close-lid', 'generic child closes a lid, pack/finish action, black field'),
        c('H', 'pose-listen-to-device', 'generic child holds a phone/radio-shape to ear, listening, BLANK screen, no logos'),
        c('H', 'pose-trace-with-finger', 'generic child traces a shape in the air or on a blank card, black field, no letters'),
        c('H', 'pose-put-on-backpack', 'generic child puts on / shrugs into a backpack, packing-related, black field, no logos'),
      ], PEOPLE_LOCK),
      sh('S2', 'more high-demand alt views 3x3', 'black-contact-3x3', [
        c('K', 'banana-peeled-in-use', 'banana partly peeled IN USE, distinct from whole banana icon, no stickers'),
        c('K', 'door-ajar-in-use', 'door standing AJAR / in-use, distinct from closed-door vocab, no EXIT text'),
        c('K', 'clock-side-profile', 'analog clock SIDE PROFILE showing depth, BLANK face no numerals, distinct from front clock'),
        c('K', 'pencil-in-use-mark', 'pencil IN USE leaving a simple scribble mark, no letters or numbers'),
        c('K', 'umbrella-in-use-rain', 'open umbrella IN USE with a few raindrops, not just closed umbrella, no brand'),
        c('K', 'apple-bitten-in-use', 'apple with one bite IN USE, distinct from whole apple and from apple-cutaway'),
        c('K', 'car-side-profile', 'small car SIDE PROFILE still-life, distinct from front-on, no plates or letters'),
        c('K', 'tree-ring-cutaway', 'tree-stump CUTAWAY showing rings, no age numbers'),
        c('K', 'backpack-cutaway', 'backpack CUTAWAY / x-ray style showing empty compartments, no logos, distinct from closed backpack icon'),
      ]),
    ],
  },
  e3: {
    id: 's4e3-a11y-manipulatives-daily',
    title: 'Aggressive S4E3 daily access + more manipulatives',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank manipulatives. Empty shells only. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw white-cane, braille-slate, hearing-aid, cochlear-implant, wheelchairs, walker, rollator, rekenrek, geoboard, tangram-set, linking-cubes, fraction-tiles, number-rods, ten-frame-empty, pencil-grip, slant-board, adapted-scissors, or choice-board-shell.`,
    sheets: [
      sh('S1', 'classroom seating access 3x3', 'black-contact-3x3', [
        c('E', 'wobble-cushion', 'round inflatable wobble cushion / disco sit, ordinary classroom, no brand'),
        c('E', 'chair-resistance-band', 'elastic band looped on a chair legs for fidget feet, isolated, no logos'),
        c('E', 'chewable-necklace', 'simple chewable sensory necklace still-life, kid-safe, no brand'),
        c('E', 'keyboard-keyguard', 'keyboard keyguard SHELL over a blank keyboard, no letters on keys'),
        c('E', 'stand-magnifier', 'desktop stand magnifier, ordinary low-vision, no brand'),
        c('E', 'gel-seat-cushion', 'simple gel/foam seat cushion, ordinary, no labels'),
        c('E', 'crutch-arm-pad', 'soft crutch underarm or cuff pad still-life, ordinary'),
        c('E', 'wheelchair-push-gloves', 'pair of wheelchair push gloves, ordinary, no logos'),
        c('E', 'access-step-stool', 'short two-step stool, ordinary access aid, no height numbers'),
      ]),
      sh('S2', 'more blank manipulatives 3x3', 'black-contact-3x3', [
        c('E', 'numicon-shapes-blank', 'Numicon-style colored number shapes, holes only, NO printed numerals'),
        c('E', 'fraction-wall-blank', 'blank fraction wall bars stacked by length, NO printed fractions'),
        c('E', 'algebra-tiles-blank', 'blank algebra tiles (squares and bars), NO x or numerals printed'),
        c('E', 'double-ten-frame', 'empty double ten-frame (two 2×5 frames), no counters, no numerals'),
        c('E', 'five-frame-empty', 'empty 1×5 five-frame board, no counters, no numerals'),
        c('E', 'isometric-geoboard', 'isometric/circular geoboard with pegs, no coordinate numbers'),
        c('E', 'snap-cubes', 'short stack of snap cubes, mixed colors, no numerals'),
        c('E', 'hundred-bead-bar', 'single 100-bead bar, grouped colors, NO printed numbers'),
        c('E', 'color-chains', 'short paper/plastic color-link chain, no letters'),
      ]),
      sh('S3', 'daily living access 3x3', 'black-contact-3x3', [
        c('E', 'picture-exchange-book-shell', 'small PECS-style binder SHELL with empty colored velcro squares, ZERO pictograms or words'),
        c('E', 'ability-switch', 'simple large ability switch / button, ordinary, no brand or word on the cap'),
        c('E', 'head-stylus', 'simple head-pointer stylus, ordinary access tool, not a spectacle'),
        c('E', 'non-slip-mat', 'small non-slip dycem-style mat, still-life, no brand'),
        c('E', 'easy-grip-cutlery', 'one easy-grip spoon with a thick handle, ordinary, no labels'),
        c('E', 'partitioned-plate', 'sectioned plate / divided dish empty, no meal pictures or text'),
        c('E', 'straw-clip', 'cup straw clip / holder still-life, no brand'),
        c('E', 'zipper-pull', 'large zipper pull ring on a short zipper fragment, ordinary'),
        c('E', 'elastic-laces', 'coil elastic no-tie laces still-life, no brand'),
      ]),
    ],
  },
  f3: {
    id: 's4f3-role-detail-continue',
    title: 'Aggressive S4F3 more role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools across bakery, florist, library, shop, waiter, music, carpenter, clinic. Objects only — no new bodies.
SKIP LOCK: do not redraw mixing-bowl, spatula, whisk, chef-hat, stethoscope, wrench, tripod, portafilter, pipette, plunger, seam-ripper, pin-cushion, thimble.`,
    sheets: [
      sh('S1', 'bakery florist library tools 3x3', 'black-contact-3x3', [
        c('F', 'cake-stand', 'simple cake stand empty, no bakery text'),
        c('F', 'pastry-cutter', 'round pastry / biscuit cutter, still-life, no brand'),
        c('F', 'piping-coupler', 'piping bag coupler + extra tip, still-life'),
        c('F', 'flower-frog', 'metal flower frog / pin holder, florist still-life'),
        c('F', 'ribbon-spool', 'plain ribbon spool unlabeled, no brand'),
        c('F', 'due-stamp-blank', 'library due-date stamp with BLANK rubber face, no letters'),
        c('F', 'barcode-scanner', 'handheld barcode scanner, blank lights, no brand text'),
        c('F', 'book-ends', 'pair of simple bookends, still-life, no letters'),
        c('F', 'library-cart-small', 'small book cart empty, isolated, no library signs'),
      ]),
      sh('S2', 'shop waiter music tools 3x3', 'black-contact-3x3', [
        c('F', 'cash-drawer', 'open cash drawer empty of readable money, no currency numbers as text'),
        c('F', 'card-reader-blank', 'small card reader, BLANK screen, no brand or prices'),
        c('F', 'napkin-dispenser', 'table napkin dispenser, still-life, no logos'),
        c('F', 'plate-cloche', 'dining cloche / plate cover, still-life'),
        c('F', 'tuning-fork', 'simple tuning fork, still-life, no Hz numbers'),
        c('F', 'music-stand', 'folding music stand with BLANK sheet, zero notation or letters'),
        c('F', 'clarinet-reed', 'single woodwind reed still-life, no brand'),
        c('F', 'violin-rosin', 'cake of violin rosin, unlabeled'),
        c('F', 'guitar-capo', 'simple guitar capo, still-life, no brand'),
      ]),
      sh('S3', 'carpenter clinic extras 3x3', 'black-contact-3x3', [
        c('F', 'carpenter-square', 'L carpenter square, NO measurement numerals'),
        c('F', 'wood-clamp', 'small wood clamp / C-clamp, still-life'),
        c('F', 'hand-plane', 'wood hand plane, still-life, no brand'),
        c('F', 'wood-chisel', 'single wood chisel, kid-safe illustration, not a weapon'),
        c('F', 'finish-nail', 'few finish nails still-life, ordinary'),
        c('F', 'dental-prophy-cup', 'dental polishing cup on a latch, still-life, not gore'),
        c('F', 'gauze-roll', 'small gauze roll, still-life, no brand'),
        c('F', 'clinic-ice-pack', 'simple gel ice pack, ordinary, no logos'),
        c('F', 'probe-thermometer-blank', 'clinic probe thermometer, BLANK display, no digits'),
      ]),
    ],
  },
  hk3: {
    id: 's4hk3-micro-actions-altviews-more',
    title: 'Aggressive S4 H3+K3 more micro-actions + alt views',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: more missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND alt views. Do not repeat S4 H/K/H2/K2 cells or H1/lt2/lt4/Mia-Leo plates.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-look-inside-bag', 'generic child looks inside an open bag, look-inside action, black field, no logos'),
        c('H', 'pose-unpack', 'generic child unpacks a bag onto a table fragment, black field, no text'),
        c('H', 'pose-stir', 'generic child stirs a bowl with a spoon, black field, no labels'),
        c('H', 'pose-nod', 'generic child nods yes, clear head-nod, black field'),
        c('H', 'pose-shake-head', 'generic child shakes head no, black field, no text'),
        c('H', 'pose-hug-object', 'generic child hugs a stuffed toy / backpack, black field, no logos'),
        c('H', 'pose-turn-page', 'generic child turns a BLANK book page, black field, no letters'),
        c('H', 'pose-put-on-hat', 'generic child puts on a hat, getting-ready, black field, no brand'),
        c('H', 'pose-take-off-shoes', 'generic child takes off shoes, black field, no size numbers'),
      ], PEOPLE_LOCK),
      sh('S2', 'more high-demand alt views 3x3', 'black-contact-3x3', [
        c('K', 'orange-cutaway', 'orange CROSS-SECTION cutaway, distinct from whole orange, no stickers'),
        c('K', 'shoe-cutaway', 'shoe CUTAWAY showing inside, distinct from shoe-side-profile, no size numbers'),
        c('K', 'book-spine-profile', 'closed book SPINE / side profile, blank, distinct from open-spread'),
        c('K', 'house-side-profile', 'simple house SIDE PROFILE, distinct from house-cutaway, no address numbers'),
        c('K', 'car-cutaway', 'small car CUTAWAY showing empty seats, kid-safe, no plates or letters'),
        c('K', 'pencil-side-profile', 'pencil strict SIDE PROFILE, distinct from pencil-in-use, no brand'),
        c('K', 'umbrella-side-profile', 'closed umbrella SIDE PROFILE, distinct from umbrella-in-use-rain, no brand'),
        c('K', 'apple-side-profile', 'whole apple SIDE PROFILE with stem, distinct from apple-cutaway and bitten'),
        c('K', 'bottle-in-use-pour', 'bottle TIPPED pouring water IN USE, distinct from water-bottle-cutaway, no brand'),
      ]),
    ],
  },
  e4: {
    id: 's4e4-a11y-manipulatives-more',
    title: 'Aggressive S4E4 more access + blank manipulatives',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank manipulatives. Empty shells only. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw any prior S4 E keys (white-cane through elastic-laces, including rekenrek, geoboard, tangram, fraction-tiles, wheelchairs, wobble-cushion, numicon, PECS binder). Do not redraw lt4 keys.`,
    sheets: [
      sh('S1', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'wobble-stool', 'simple classroom wobble stool, distinct from wobble-cushion, no brand'),
        c('E', 'visual-timer-blank', 'disk visual timer SHELL, BLANK colored wedge, no numerals or words'),
        c('E', 'reading-guide-strip', 'simple colored reading-guide strip / tracker, no letters'),
        c('E', 'color-overlay-sheet', 'transparent tinted overlay sheet still-life, no text'),
        c('E', 'fidget-cube-blank', 'small fidget cube with BLANK faces, no letters or logos'),
        c('E', 'therapy-putty', 'small blob of therapy putty, ordinary, no brand'),
        c('E', 'universal-cuff', 'simple universal cuff / strap for holding a utensil, ordinary'),
        c('E', 'plate-guard', 'clip-on plate guard / food bumper, empty plate fragment, no labels'),
        c('E', 'two-handled-cup', 'two-handled training cup empty, no brand or ml marks'),
      ]),
      sh('S2', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'rocker-knife', 'rocker knife / mezzaluna-style meal aid, kid-safe still-life, not a weapon'),
        c('E', 'nosey-cup', 'cutout nosey cup empty, ordinary drinking aid, no labels'),
        c('E', 'built-up-handles', 'one built-up foam utensil handle sleeve, still-life'),
        c('E', 'book-stand-holder', 'simple book stand / page holder empty, no printed pages'),
        c('E', 'page-turner-ring', 'simple page-turner ring / stick, ordinary, no letters'),
        c('E', 'wrist-rest', 'keyboard wrist rest pad, ordinary, no brand'),
        c('E', 'tablet-stand', 'small tablet stand empty, BLANK screen, no logos'),
        c('E', 'pencil-weight', 'weighted pencil sleeve still-life, ordinary'),
        c('E', 'light-box-empty', 'small classroom light box empty, no letters on the surface'),
      ]),
      sh('S3', 'more blank manipulatives 3x3', 'black-contact-3x3', [
        c('E', 'twenty-frame-empty', 'empty 4×5 twenty-frame board, no counters, no numerals'),
        c('E', 'sorting-circles', 'two overlapping sorting hoops / Venn rings empty, no labels'),
        c('E', 'place-value-chart-blank', 'blank place-value pocket chart SHELL, empty columns, ZERO numerals or words'),
        c('E', 'fraction-squares-blank', 'blank colored fraction squares of different sizes, NO printed fractions'),
        c('E', 'protractor-blank', 'half-circle protractor SHELL, NO degree numerals'),
        c('E', 'compass-drawing-blank', 'drawing compass still-life, no degree marks or brand'),
        c('E', 'geostix-set', 'small pile of geostix / stick-and-node pieces, no letters'),
        c('E', 'mira-reflector', 'transparent geometry mira / reflector still-life, no brand'),
        c('E', 'array-cards-blank', 'blank array cards as empty grid rectangles, no numerals'),
      ]),
    ],
  },
  f4: {
    id: 's4f4-role-detail-more',
    title: 'Aggressive S4F4 more role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools across bakery, florist, shop, waiter, music, painter, electrician, carpenter. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F keys or lt4 textile tools (spinning-wheel, drop-spindle, pinking-shears). No spatula, whisk, chef-hat, stethoscope, wrench, tripod, portafilter, plunger, seam-ripper.`,
    sheets: [
      sh('S1', 'bakery florist shop extras 3x3', 'black-contact-3x3', [
        c('F', 'bench-scraper', 'bench scraper / dough cutter, still-life, no brand'),
        c('F', 'cooling-rack', 'wire cooling rack empty, still-life'),
        c('F', 'bun-pan', 'plain bun / sheet pan empty, no bakery text'),
        c('F', 'floral-tape', 'roll of florist tape unlabeled, no brand'),
        c('F', 'floral-wire', 'coil of florist wire, still-life'),
        c('F', 'shopping-basket', 'handheld shopping basket empty, no store text'),
        c('F', 'price-labeler-blank', 'handheld price labeler, BLANK window, no numerals or logos'),
        c('F', 'book-cover-protector', 'clear book-cover sleeve empty, no letters'),
        c('F', 'label-maker-blank', 'simple label maker, BLANK tape, no letters on the tape'),
      ]),
      sh('S2', 'waiter music painter extras 3x3', 'black-contact-3x3', [
        c('F', 'pepper-mill', 'pepper mill still-life, no brand'),
        c('F', 'crumb-scraper', 'table crumb scraper, still-life'),
        c('F', 'menu-holder-blank', 'table menu holder with BLANK card, zero words'),
        c('F', 'drumsticks-pair', 'pair of drumsticks, still-life, no brand'),
        c('F', 'metronome-blank', 'pyramid metronome, BLANK face, no numerals'),
        c('F', 'guitar-pick', 'simple guitar pick, still-life'),
        c('F', 'violin-bow', 'violin bow still-life, no brand'),
        c('F', 'paint-roller', 'small paint roller + tray empty, no brand'),
        c('F', 'painter-tape', 'roll of painter tape unlabeled'),
      ]),
      sh('S3', 'trades carpenter extras 3x3', 'black-contact-3x3', [
        c('F', 'spirit-level-blank', 'spirit level, BLANK vials, NO measurement numerals'),
        c('F', 'sandpaper-block', 'sandpaper block still-life, no grit numbers as text'),
        c('F', 'wood-rasp', 'wood rasp / file, still-life, not a weapon'),
        c('F', 'miter-box', 'small miter box empty, no angle numbers'),
        c('F', 'caulk-applicator', 'caulk applicator / cartridge tool, still-life, no brand'),
        c('F', 'wire-stripper', 'wire stripper tool, still-life, no gauge numbers as text'),
        c('F', 'wire-nuts', 'few wire nuts / connectors, still-life'),
        c('F', 'outlet-tester-blank', 'plug outlet tester, BLANK lights, no logos'),
        c('F', 'fish-tape', 'coiled electrician fish tape, still-life, no brand'),
      ]),
    ],
  },
  hk4: {
    id: 's4hk4-micro-actions-altviews-more',
    title: 'Aggressive S4 H4+K4 more micro-actions + alt views',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: more missing micro-actions (generic kids, not Mia/Leo; prefer sitting / kneeling / lying / floor-level horizontal poses) plus HIGH-DEMAND alt views only. Do not repeat S4 H/K cells or H1/lt2/lt4/Mia-Leo plates.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-lie-on-stomach', 'generic child lies on stomach looking at a BLANK book, horizontal pose, black field, no letters'),
        c('H', 'pose-crawl', 'generic child crawls on floor, horizontal travel pose, black field, colored clothes'),
        c('H', 'pose-sit-sideways', 'generic child sits sideways on the floor, black field, distinct from cross-legged sit'),
        c('H', 'pose-lean-on-table', 'generic child leans forearms on a table fragment, black field'),
        c('H', 'pose-fold-cloth', 'generic child folds a cloth on a table, packing-related, black field, no text'),
        c('H', 'pose-wipe-table', 'generic child wipes a table fragment, black field, no labels'),
        c('H', 'pose-open-drawer', 'generic child opens a drawer, look-inside setup, black field, no logos'),
        c('H', 'pose-push-chair-in', 'generic child pushes a chair in under a table, black field'),
        c('H', 'pose-stack-blocks', 'generic child stacks blank colored blocks, black field, no letters or numerals'),
      ], PEOPLE_LOCK),
      sh('S2', 'more high-demand alt views 3x3', 'black-contact-3x3', [
        c('K', 'banana-cutaway', 'banana CROSS-SECTION cutaway, distinct from peeled-in-use, no stickers'),
        c('K', 'watermelon-cutaway', 'watermelon CROSS-SECTION wedge, high-demand fruit, no labels'),
        c('K', 'cup-cutaway', 'cup CUTAWAY showing empty interior, no brand or ml marks'),
        c('K', 'chair-side-profile', 'chair strict SIDE PROFILE, distinct from front-on, no labels'),
        c('K', 'bus-cutaway', 'bus CUTAWAY showing empty seats, distinct from bus-side-profile, blank destination'),
        c('K', 'backpack-side-profile', 'backpack SIDE PROFILE, distinct from backpack-cutaway, no logos'),
        c('K', 'door-side-profile', 'door strict SIDE PROFILE, distinct from door-ajar, no EXIT text'),
        c('K', 'sandwich-side-profile', 'sandwich SIDE PROFILE stack, distinct from sandwich-cutaway, no wrappers'),
        c('K', 'bottle-side-profile', 'closed bottle SIDE PROFILE, distinct from cutaway and pour-in-use, no brand'),
      ]),
    ],
  },
  e5: {
    id: 's4e5-a11y-manipulatives-continue',
    title: 'Aggressive S4E5 more access + manipulative shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank classroom shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E4 keys.`,
    sheets: [
      sh('S1', 'more access objects 3x3', 'black-contact-3x3', [
        c('E', 'handheld-shower', 'handheld shower head on a short hose, ordinary, no brand'),
        c('E', 'raised-toilet-seat', 'raised toilet seat add-on, ordinary, not a spectacle'),
        c('E', 'short-bed-rail', 'short bedside rail fragment, isolated, no labels'),
        c('E', 'hearing-aid-case', 'small hearing-aid storage case open, empty, no brand'),
        c('E', 'wheelchair-cup-holder', 'clip-on wheelchair cup holder empty, isolated'),
        c('E', 'lap-desk', 'simple lap desk / tray empty, no text'),
        c('E', 'highlighter-guide', 'highlighting reading window card, empty, no letters'),
        c('E', 'tactile-ruler-blank', 'tactile ruler with ridges only, NO numerals'),
        c('E', 'velcro-dots', 'few velcro dots still-life, ordinary'),
      ]),
      sh('S2', 'more classroom manip 3x3', 'black-contact-3x3', [
        c('E', 'play-dough', 'lump of play dough and a simple cutter, no letters on the cutter'),
        c('E', 'stacking-rings', 'stacking ring toy on a post, mixed colors, no numerals'),
        c('E', 'nested-cups', 'nested cups, NO printed ml or numbers'),
        c('E', 'sorting-bowls', 'three small sorting bowls empty, still-life'),
        c('E', 'jumbo-tweezers', 'chunky classroom tweezers, still-life'),
        c('E', 'lacing-beads', 'large lacing beads on a string, no letters'),
        c('E', 'pop-tubes', 'two colorful pop-tubes, still-life, no brand'),
        c('E', 'sandpaper-shape', 'one sandpaper geometric shape card, no letters'),
        c('E', 'scoop-set', 'small scoop and bowl, still-life, no labels'),
      ]),
      sh('S3', 'more empty shells 3x3', 'black-contact-3x3', [
        c('E', 'first-then-board-shell', 'first-then board SHELL: two empty colored boxes, ZERO pictograms or words'),
        c('E', 'token-board-shell', 'token board SHELL: empty circles in a row, no words'),
        c('E', 'sequence-strip-shell', 'horizontal 4-box sequence strip SHELL, empty cells, no icons or text'),
        c('E', 'break-card-shell', 'simple break-card SHELL, solid color card, ZERO pictograms or words'),
        c('E', 'choice-strip-shell', '2-box choice strip SHELL, empty, no pictograms'),
        c('E', 'wait-card-shell', 'simple wait-card SHELL, solid color, no words'),
        c('E', 'all-done-bin', 'small all-done bin / finished box empty, no labels'),
        c('E', 'work-system-box', 'left-to-right work-system box empty, no text'),
        c('E', 'sensory-bin-empty', 'shallow sensory bin empty, no fillers drawn as letters'),
      ]),
    ],
  },
  f5: {
    id: 's4f5-role-detail-continue',
    title: 'Aggressive S4F5 more role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools (janitor, electrician, baker, tailor extras). Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F4 keys.`,
    sheets: [
      sh('S1', 'janitor electrician tools 3x3', 'black-contact-3x3', [
        c('F', 'mop-bucket', 'mop bucket with wringer, empty, no labels'),
        c('F', 'dustpan-brush', 'dustpan and hand brush set, still-life'),
        c('F', 'spray-bottle', 'generic spray bottle, blank, no chemical names'),
        c('F', 'squeegee', 'window squeegee, still-life'),
        c('F', 'wire-stripper', 'simple wire stripper tool, still-life, no size numbers as text'),
        c('F', 'voltage-tester-blank', 'non-contact tester, BLANK lights, no brand or voltage digits'),
        c('F', 'cable-ties', 'small bundle of cable ties, still-life'),
        c('F', 'paint-roller', 'paint roller with tray, still-life, no brand'),
        c('F', 'drop-cloth', 'folded drop cloth, still-life'),
      ]),
      sh('S2', 'baker extras 3x3', 'black-contact-3x3', [
        c('F', 'cookie-cutter', 'simple star cookie cutter, no letters'),
        c('F', 'cooling-rack', 'wire cooling rack empty, still-life'),
        c('F', 'bench-scraper', 'bench / dough scraper, still-life'),
        c('F', 'silicone-mat', 'silicone baking mat blank, no brand'),
        c('F', 'pastry-blender', 'pastry blender tool, still-life'),
        c('F', 'cake-leveler', 'simple cake leveler wire, still-life'),
        c('F', 'piping-tip-set', 'few piping tips, still-life, no brand'),
        c('F', 'turntable-cake', 'cake decorating turntable empty, no logos'),
        c('F', 'palette-knife-icing', 'straight icing palette knife, distinct from artist palette-knife'),
      ]),
      sh('S3', 'tailor florist extras 3x3', 'black-contact-3x3', [
        c('F', 'tailors-ham', 'tailor ham pressing cushion, still-life'),
        c('F', 'tracing-wheel', 'pattern tracing wheel, still-life'),
        c('F', 'bobbin', 'plain sewing bobbin, unlabeled'),
        c('F', 'floral-tape', 'roll of floral tape, unlabeled'),
        c('F', 'oasis-foam', 'block of floral foam, still-life'),
        c('F', 'watering-mister', 'small plant mister bottle, no brand'),
        c('F', 'ribbon-scissors', 'ribbon scissors, distinct from pinking-shears, no brand'),
        c('F', 'seam-gauge-blank', 'seam gauge, BLANK — no numerals'),
        c('F', 'press-cloth', 'plain press cloth folded, still-life'),
      ]),
    ],
  },
  hk5: {
    id: 's4hk5-micro-actions-altviews-more',
    title: 'Aggressive S4 H5+K5 more micro-actions + alt views',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: more missing micro-actions plus HIGH-DEMAND alt views. Do not repeat prior S4 H/K cells or H1/lt2/lt4/Mia-Leo plates.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-set-table', 'generic child sets a plate on a table fragment, black field, no labels'),
        c('H', 'pose-water-plant', 'generic child waters a small plant, black field, no text'),
        c('H', 'pose-push-button', 'generic child pushes a large button, black field, no letters on the button'),
        c('H', 'pose-look-in-fridge', 'generic child looks inside a fridge fragment, look-inside, black field, no food labels'),
        c('H', 'pose-write', 'generic child writes on a BLANK paper, black field, no letters appearing'),
        c('H', 'pose-read-aloud', 'generic child holds a BLANK open book, black field, no text on pages'),
        c('H', 'pose-line-leader', 'generic child stands at the front of a short line, black field, no signs'),
        c('H', 'pose-hang-coat', 'generic child hangs a coat on a hook fragment, black field, no logos'),
        c('H', 'pose-take-off-coat', 'generic child takes off a coat, black field, no logos'),
      ], PEOPLE_LOCK),
      sh('S2', 'more high-demand alt views 3x3', 'black-contact-3x3', [
        c('K', 'clock-back', 'analog clock BACK / rear view, no numerals, distinct from clock-side-profile'),
        c('K', 'tree-side-profile', 'simple tree SIDE PROFILE, distinct from tree-ring-cutaway'),
        c('K', 'egg-in-cup', 'egg standing IN USE in a cup, distinct from egg-cross-section'),
        c('K', 'flashlight-off-profile', 'flashlight OFF side profile, distinct from flashlight-in-use, no brand'),
        c('K', 'apple-top-view', 'apple TOP VIEW with stem, distinct from cutaway/side/bitten'),
        c('K', 'bus-front-view', 'bus FRONT VIEW, distinct from bus-side-profile and bus-cutaway, blank destination, no route numbers'),
        c('K', 'shoe-top-view', 'shoe TOP VIEW, distinct from side-profile and cutaway, no size numbers'),
        c('K', 'book-top-closed', 'closed book TOP VIEW, blank cover, distinct from spine-profile and open-spread'),
        c('K', 'house-front-view', 'simple house FRONT VIEW, distinct from side-profile and cutaway, no address numbers'),
      ]),
    ],
  },
  e6: {
    id: 's4e6-a11y-manipulatives-continue',
    title: 'Aggressive S4E6 more access + classroom shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E5 keys.`,
    sheets: [
      sh('S1', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'transfer-belt', 'simple transfer / gait belt, ordinary, no labels'),
        c('E', 'long-handled-sponge', 'long-handled bath sponge, ordinary, no brand'),
        c('E', 'jar-opener', 'rubber jar opener pad, still-life, no brand'),
        c('E', 'key-turner', 'large key-turner aid, ordinary, no house numbers'),
        c('E', 'card-holder-stand', 'playing-card holder stand empty, no suit letters'),
        c('E', 'signature-guide-shell', 'signature-guide stencil SHELL, empty window, no letters'),
        c('E', 'large-button-phone-blank', 'large-button phone, BLANK keys, no digits or words'),
        c('E', 'vibrating-alarm-clock-blank', 'simple vibrating alarm clock, BLANK face, no numerals'),
        c('E', 'fm-receiver', 'small FM/hearing-loop receiver pack, ordinary, no brand'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'switch-adapted-toy-shell', 'simple switch-adapted toy SHELL, no character logos or text'),
        c('E', 'joystick-switch', 'large joystick ability switch, ordinary, no brand'),
        c('E', 'bone-conduction-headset', 'bone-conduction headset, ordinary, no brand'),
        c('E', 'tactile-watch-blank', 'tactile watch, BLANK face, no numerals'),
        c('E', 'page-magnifier-sheet', 'full-page magnifier sheet, still-life, no text under it'),
        c('E', 'clipboard-low-vision', 'clipboard with extra-large blank sheet, ZERO writing'),
        c('E', 'stubby-crayon', 'short stubby crayon, still-life, no brand'),
        c('E', 'triangle-pencil', 'triangular grip pencil, still-life, no brand'),
        c('E', 'desk-easel', 'small desk easel empty, no letters'),
      ]),
      sh('S3', 'more manip shells 3x3', 'black-contact-3x3', [
        c('E', 'number-line-blank', 'blank number line strip, NO numerals, tick marks only'),
        c('E', 'hundreds-chart-blank', 'blank 10×10 hundreds chart SHELL, empty cells, ZERO numerals'),
        c('E', 'ten-frame-train', 'three empty ten-frames linked as a train, no counters, no numerals'),
        c('E', 'rekenrek-100', '100-bead rekenrek, distinct from 20-bead rekenrek, NO numbers'),
        c('E', 'color-tiles-grid', 'color tiles arranged in a small rectangle, no numerals'),
        c('E', 'pattern-block-puzzle-blank', 'blank pattern-block outline board, empty, no letters'),
        c('E', 'balance-weights-blank', 'simple balance weights, NO printed mass numbers'),
        c('E', 'dice-in-frame', 'dice in a dice frame, pips only, no numerals'),
        c('E', 'spinner-arrow-only', 'classroom spinner arrow hub with empty circle, no wedges-as-text'),
      ]),
    ],
  },
  f6: {
    id: 's4f6-role-detail-continue',
    title: 'Aggressive S4F6 photographer tailor mechanic dentist librarian coach tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: handheld tools for photographer, tailor, mechanic, dentist, librarian, coach. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F5 keys. Never re-list wire-stripper, paint-roller, drop-cloth, cooling-rack, bench-scraper, floral-tape.`,
    sheets: [
      sh('S1', 'photographer dentist tools 3x3', 'black-contact-3x3', [
        c('F', 'bounce-card', 'white bounce card / reflector, still-life, no brand'),
        c('F', 'lens-pen', 'lens cleaning pen, still-life, no logo'),
        c('F', 'sd-card-blank', 'memory card, BLANK, no brand letters'),
        c('F', 'backdrop-clamp', 'backdrop clamp, still-life'),
        c('F', 'flash-diffuser', 'small camera flash diffuser, still-life, no brand'),
        c('F', 'impression-tray-empty', 'empty dental impression tray, kid-safe still-life, not gore'),
        c('F', 'cotton-roll', 'few dental cotton rolls, still-life, no brand'),
        c('F', 'mouth-prop', 'simple dental mouth prop, ordinary, not scary'),
        c('F', 'air-water-syringe', 'dental air-water syringe still-life, kid-safe, no brand'),
      ]),
      sh('S2', 'tailor mechanic tools 3x3', 'black-contact-3x3', [
        c('F', 'tailor-clapper', 'wooden tailor clapper, still-life'),
        c('F', 'point-presser', 'point presser / pounding block, still-life'),
        c('F', 'thread-snips', 'small thread snips, still-life'),
        c('F', 'pattern-weights', 'few pattern weights, still-life, no letters'),
        c('F', 'oil-filter-wrench', 'oil-filter wrench strap, still-life, no brand'),
        c('F', 'creeper-seat', 'rolling mechanic stool, distinct from mechanic-creeper board'),
        c('F', 'drain-pan', 'low oil drain pan empty, still-life, no brand'),
        c('F', 'magnetic-parts-tray', 'magnetic parts tray empty, still-life'),
        c('F', 'work-lamp', 'small mechanic work lamp, BLANK, no brand'),
      ]),
      sh('S3', 'librarian coach tools 3x3', 'black-contact-3x3', [
        c('F', 'book-cradle', 'foam book-cradle / stand empty, no letters'),
        c('F', 'magazine-file', 'simple magazine file box empty, no library text'),
        c('F', 'book-duster', 'long book duster / wand, still-life'),
        c('F', 'date-due-cards-blank', 'stack of BLANK date-due cards, ZERO writing'),
        c('F', 'coach-whistle', 'simple coach whistle, still-life, no brand'),
        c('F', 'stopwatch-blank', 'stopwatch, BLANK face, no numerals'),
        c('F', 'sports-cone', 'one training cone, still-life, no numbers'),
        c('F', 'agility-ladder', 'flat agility ladder on the ground, still-life, no numerals'),
        c('F', 'ball-pump', 'ball pump with needle, still-life, no brand'),
      ]),
    ],
  },
  hk6: {
    id: 's4hk6-micro-actions-altviews-more',
    title: 'Aggressive S4 H6 micro-actions + K6 high-demand cutaways',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND CUTAWAYS only on sheet 2. Do not repeat prior S4 H/K cells or H1/lt2/lt4/Mia-Leo plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach).
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-tie-apron', 'generic child ties an apron behind their back, black field, no logos'),
        c('H', 'pose-wash-fruit', 'generic child washes fruit at a sink fragment, black field, no labels'),
        c('H', 'pose-peel', 'generic child peels a fruit with a peeler, black field, distinct from eat, no labels'),
        c('H', 'pose-scoop', 'generic child scoops from a bowl with a spoon, distinct from stir, black field'),
        c('H', 'pose-set-alarm-blank', 'generic child sets a BLANK clock face, no numerals appearing'),
        c('H', 'pose-look-under-bed', 'generic child looks under a bed fragment, look-inside, distinct from search-under-table, black field'),
        c('H', 'pose-zip-suitcase', 'generic child zips a suitcase, pack action, black field, no tags or letters'),
        c('H', 'pose-give-ticket-blank', 'generic child hands a BLANK ticket, black field, no letters'),
        c('H', 'pose-hold-umbrella', 'generic child holds an open umbrella alone, black field, distinct from share-umbrella and umbrella-in-use-rain still-life'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'pizza-cutaway', 'pizza CROSS-SECTION slice showing layers, high-demand, no labels'),
        c('K', 'cake-cutaway', 'layer-cake CROSS-SECTION slice, no writing on icing'),
        c('K', 'bread-loaf-cutaway', 'bread loaf CROSS-SECTION, distinct from sandwich-cutaway, no labels'),
        c('K', 'tomato-cutaway', 'tomato CROSS-SECTION, high-demand fruit/veg, no stickers'),
        c('K', 'lemon-cutaway', 'lemon CROSS-SECTION, distinct from orange-cutaway, no labels'),
        c('K', 'pear-cutaway', 'pear CROSS-SECTION, distinct from apple-cutaway, no stickers'),
        c('K', 'strawberry-cutaway', 'strawberry CROSS-SECTION, high-demand, no labels'),
        c('K', 'cucumber-cutaway', 'cucumber CROSS-SECTION rounds, no labels'),
        c('K', 'muffin-cutaway', 'muffin CROSS-SECTION, no wrappers or text'),
      ]),
    ],
  },
  e7: {
    id: 's4e7-a11y-manipulatives-continue',
    title: 'Aggressive S4E7 more access + blank manipulatives',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank manipulatives. Empty shells only. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E6 keys.`,
    sheets: [
      sh('S1', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'dressing-stick', 'dressing stick with a hook, ordinary, not a spectacle'),
        c('E', 'long-shoe-horn', 'long-handled shoe horn, still-life, no brand'),
        c('E', 'lotion-applicator', 'long-handle lotion applicator, ordinary, no labels'),
        c('E', 'suction-nail-brush', 'suction-cup nail brush, ordinary, no brand'),
        c('E', 'writing-claw-grip', 'writing claw / three-finger grip, distinct from pencil-grip, no brand'),
        c('E', 'book-weight', 'small book / page weight, still-life, no letters'),
        c('E', 'document-holder', 'upright document holder empty, no printed pages'),
        c('E', 'foot-rest-classroom', 'small classroom foot rest, ordinary, no height numbers'),
        c('E', 'trackball-mouse', 'trackball mouse still-life, BLANK, no logos'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'switch-mount-arm', 'simple switch-mount clamp arm empty, ordinary, no logos'),
        c('E', 'ring-binder-helper', 'ring-binder page helper / stick, still-life, no letters'),
        c('E', 'reading-window-card', 'simple reading window card, empty, distinct from highlighter-guide, no letters'),
        c('E', 'wrist-weight', 'small wrist weight cuff, ordinary classroom, no labels'),
        c('E', 'seat-pocket-organizer', 'chair-back seat pocket organizer empty, no text'),
        c('E', 'desk-privacy-shield', 'simple desk privacy shield empty, no letters'),
        c('E', 'noise-meter-blank', 'classroom noise-meter SHELL, BLANK face, no words or numerals'),
        c('E', 'visual-timer-sand', 'sand-style visual timer, no minute numerals, distinct from disk visual-timer-blank'),
        c('E', 'chunky-marker', 'chunky washable marker, unlabeled, no brand'),
      ]),
      sh('S3', 'more blank manipulatives 3x3', 'black-contact-3x3', [
        c('E', 'polar-geoboard', 'circular polar geoboard with pegs, distinct from isometric-geoboard, no numbers'),
        c('E', 'fraction-tower-blank', 'blank fraction tower cubes stacked by size, NO printed fractions'),
        c('E', 'decimal-tiles-blank', 'blank decimal tiles as colored squares, NO printed decimals'),
        c('E', 'bead-stair-blank', 'bead stair of different lengths, NO printed numbers'),
        c('E', 'unit-cubes-pile', 'small pile of unit cubes, distinct from base-ten-flats, no numerals'),
        c('E', 'hex-pattern-tiles', 'hexagon pattern tiles pile, distinct from pattern-blocks, no letters'),
        c('E', 'two-color-beans', 'small pile of two-color counting beans, distinct from two-color-counters, no numerals'),
        c('E', 'clock-stamp-blank', 'rubber clock stamp with BLANK face, no numerals'),
        c('E', 'number-bond-shell', 'blank number-bond diagram SHELL: empty circles, ZERO numerals'),
      ]),
    ],
  },
  f7: {
    id: 's4f7-role-detail-continue',
    title: 'Aggressive S4F7 more photographer tailor mechanic dentist librarian coach tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools for photographer, tailor, mechanic, dentist, librarian, coach. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F6 keys. Never re-list wire-stripper, paint-roller, drop-cloth, cooling-rack, bench-scraper, floral-tape.`,
    sheets: [
      sh('S1', 'photographer dentist extras 3x3', 'black-contact-3x3', [
        c('F', 'lens-hood', 'camera lens hood, still-life, no brand'),
        c('F', 'grey-card', 'photo grey card, still-life, no letters'),
        c('F', 'gaffer-tape-roll', 'roll of gaffer tape unlabeled, no brand'),
        c('F', 'camera-bag-empty', 'small camera bag open empty, no logos'),
        c('F', 'filter-pouch', 'small lens-filter pouch empty, no brand'),
        c('F', 'curing-light-blank', 'dental curing light, BLANK, kid-safe, no brand'),
        c('F', 'dappen-dish', 'small dappen dish empty, dental still-life, not gore'),
        c('F', 'prophy-angle', 'disposable prophy angle, still-life, not gore'),
        c('F', 'floss-dispenser', 'simple floss dispenser, unlabeled, no brand'),
      ]),
      sh('S2', 'tailor mechanic extras 3x3', 'black-contact-3x3', [
        c('F', 'sleeve-board', 'small sleeve board, tailor still-life'),
        c('F', 'needle-threader', 'needle threader, still-life'),
        c('F', 'bias-tape-maker', 'bias tape maker tool, still-life, no size numbers as text'),
        c('F', 'french-curve-blank', 'french curve template, NO measurement numerals'),
        c('F', 'breaker-bar', 'mechanic breaker bar, still-life, not a weapon'),
        c('F', 'feeler-gauges-blank', 'feeler gauge set, BLANK — no thickness numerals'),
        c('F', 'grease-applicator', 'grease applicator cartridge tool, still-life, no brand'),
        c('F', 'battery-tender-blank', 'small battery tender, BLANK lights, no logos'),
        c('F', 'magnetic-pickup', 'magnetic pickup wand, still-life, distinct from magnet-wand'),
      ]),
      sh('S3', 'librarian coach extras 3x3', 'black-contact-3x3', [
        c('F', 'book-return-bin', 'small book-return bin empty, no library signs'),
        c('F', 'newspaper-rod', 'newspaper stick / rod, still-life'),
        c('F', 'atlas-stand', 'small atlas / dictionary stand empty, no letters'),
        c('F', 'spine-repair-tape', 'roll of spine-repair tape unlabeled, distinct from book-tape if any'),
        c('F', 'pinnies-blank', 'two blank sports pinnies / bibs, ZERO numbers or letters'),
        c('F', 'jump-rope', 'simple jump rope coiled, still-life, no brand'),
        c('F', 'medicine-ball', 'medicine ball, still-life, NO printed weight numbers'),
        c('F', 'coaching-board-blank', 'handheld coaching board, BLANK, zero tactics letters'),
        c('F', 'marker-disc', 'flat field marker disc, still-life, no numerals'),
      ]),
    ],
  },
  hk7: {
    id: 's4hk7-micro-actions-cutaways-more',
    title: 'Aggressive S4 H7 micro-actions + K7 high-demand cutaways',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND CUTAWAYS only. Do not repeat prior S4 H/K or H1/lt2/lt4/Mia-Leo plates.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-erase-board', 'generic child erases a BLANK board, black field, no letters'),
        c('H', 'pose-sharpen-pencil', 'generic child uses a pencil sharpener, black field, no brand'),
        c('H', 'pose-button-shirt', 'generic child buttons a shirt, getting-ready, black field, no logos'),
        c('H', 'pose-put-on-socks', 'generic child puts on socks, black field, no size numbers'),
        c('H', 'pose-cover-mouth-yawn', 'generic child covers mouth while yawning, black field'),
        c('H', 'pose-lie-on-back', 'generic child lies on back looking up, horizontal pose, black field'),
        c('H', 'pose-roll-on-side', 'generic child rolls onto their side on the floor, black field'),
        c('H', 'pose-shrug', 'generic child shrugs both shoulders, black field, no text'),
        c('H', 'pose-close-drawer', 'generic child closes a drawer, distinct from open-drawer, black field'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'kiwi-cutaway', 'kiwi CROSS-SECTION, high-demand fruit, no labels'),
        c('K', 'peach-cutaway', 'peach CROSS-SECTION, distinct from apple-cutaway, no stickers'),
        c('K', 'avocado-cutaway', 'avocado CROSS-SECTION with pit, no labels'),
        c('K', 'pineapple-cutaway', 'pineapple CROSS-SECTION, distinct from lt4 tropical whole fruit, no labels'),
        c('K', 'onion-cutaway', 'onion CROSS-SECTION rings, no labels'),
        c('K', 'potato-cutaway', 'potato CROSS-SECTION, no labels'),
        c('K', 'carrot-cutaway', 'carrot CROSS-SECTION, no labels'),
        c('K', 'bagel-cutaway', 'bagel CROSS-SECTION, distinct from bread-loaf-cutaway, no text'),
        c('K', 'waffle-cutaway', 'waffle CROSS-SECTION, no syrup-as-letters'),
      ]),
    ],
  },
  e8: {
    id: 's4e8-a11y-manipulatives-continue',
    title: 'Aggressive S4E8 more access + classroom shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E7 keys.`,
    sheets: [
      sh('S1', 'more dressing meal access 3x3', 'black-contact-3x3', [
        c('E', 'inner-lip-plate', 'inner-lip plate empty, ordinary meal aid, no labels'),
        c('E', 'loop-scissors', 'loop-handle scissors, distinct from adapted-scissors, kid-safe, no brand'),
        c('E', 'small-weighted-blanket', 'folded small weighted blanket, ordinary, no labels'),
        c('E', 'chew-tube', 'simple chew tube / chew tool, kid-safe, no brand'),
        c('E', 'fm-neckloop', 'hearing FM neckloop, ordinary, no brand'),
        c('E', 'white-noise-machine-blank', 'small white-noise machine, BLANK face, no words or digits'),
        c('E', 'clothing-magnet', 'magnetic clothing fasteners still-life, ordinary, no logos'),
        c('E', 'lanyard-pouch-blank', 'blank ID lanyard pouch empty, ZERO writing'),
        c('E', 'pencil-box-empty', 'open pencil box empty, still-life, no brand'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'blank-key-keyboard', 'compact keyboard with BLANK keys, ZERO letters or numbers'),
        c('E', 'talking-calculator-blank', 'talking calculator SHELL, BLANK keys and screen, ZERO digits'),
        c('E', 'chair-pocket', 'chair-back pocket empty, distinct from seat-pocket-organizer, no text'),
        c('E', 'desk-carrel-blank', 'small desk carrel / study hood, BLANK surface, no letters'),
        c('E', 'page-up-holder', 'simple page-up copy holder empty, no letters'),
        c('E', 'gel-pen-grip', 'gel-style extra-thick pen grip, distinct from pencil-grip and writing-claw, no brand'),
        c('E', 'quiet-hands-fidget', 'simple stretchy quiet fidget band, still-life, no brand'),
        c('E', 'seat-wedge', 'foam seat wedge cushion, distinct from gel-seat-cushion, no labels'),
        c('E', 'line-tracker-arrow', 'simple reading line-tracker arrow card, no letters'),
      ]),
      sh('S3', 'more manip shells 3x3', 'black-contact-3x3', [
        c('E', 'base-ten-cube', 'one base-ten thousands cube, NO printed numerals'),
        c('E', 'part-part-whole-mat-blank', 'part-part-whole mat SHELL, empty boxes, ZERO numerals'),
        c('E', 'tens-ones-mat-blank', 'tens-and-ones place mat SHELL, empty columns, ZERO words or numerals'),
        c('E', 'magnetic-ten-frame', 'magnetic ten-frame board empty, no counters, no numerals'),
        c('E', 'dry-erase-frame-blank', 'small dry-erase frame empty, no letters'),
        c('E', 'cuisenaire-track', 'empty cuisenaire rod track / gutter, no rods, no numerals'),
        c('E', 'polyhedra-net-blank', 'blank cube net unfolded, no letters or numbers'),
        c('E', 'tangram-outline-blank', 'blank tangram silhouette card empty, no letters'),
        c('E', 'number-path-blank', 'blank number path strip, tick marks only, ZERO numerals'),
      ]),
    ],
  },
  f8: {
    id: 's4f8-role-detail-continue',
    title: 'Aggressive S4F8 more photographer tailor mechanic dentist librarian coach tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools for photographer, tailor, mechanic, dentist, librarian, coach. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F7 keys. Never re-list wire-stripper, paint-roller, drop-cloth, cooling-rack, bench-scraper, floral-tape.`,
    sheets: [
      sh('S1', 'photographer dentist extras 3x3', 'black-contact-3x3', [
        c('F', 'lens-cloth', 'microfiber lens cloth folded, unlabeled'),
        c('F', 'blower-brush', 'lens blower brush, still-life, no brand'),
        c('F', 'hot-shoe-cover', 'camera hot-shoe cover, still-life'),
        c('F', 'filter-wrench', 'lens filter wrench, still-life, no brand'),
        c('F', 'bib-chain', 'dental bib chain / clips, still-life, no clinic text'),
        c('F', 'cotton-pellet-jar', 'small cotton-pellet jar empty, still-life, not gore'),
        c('F', 'mixing-pad-blank', 'dental mixing pad, BLANK sheet, no words'),
        c('F', 'evacuator-tip', 'high-volume evacuator tip, distinct from dental-suction-tip, not gore'),
        c('F', 'prophy-paste-cup', 'tiny prophy paste cup empty, unlabeled'),
      ]),
      sh('S2', 'tailor mechanic extras 3x3', 'black-contact-3x3', [
        c('F', 'collar-stand', 'small collar stand, tailor still-life'),
        c('F', 'point-turner', 'point turner / corner tool, still-life'),
        c('F', 'tracing-paper-blank', 'sheet of tracing paper, completely BLANK'),
        c('F', 'hemming-bird', 'hemming bird clamp, still-life'),
        c('F', 'hose-clamp', 'simple hose clamp, still-life, no size numbers as text'),
        c('F', 'inspection-mirror', 'mechanic inspection mirror on a handle, distinct from dental-mirror'),
        c('F', 'oil-drain-plug-socket', 'oil drain-plug socket, still-life, no size numerals as text'),
        c('F', 'parts-brush', 'small parts cleaning brush, still-life'),
        c('F', 'fender-cover', 'folded fender cover cloth, unlabeled'),
      ]),
      sh('S3', 'librarian coach extras 3x3', 'black-contact-3x3', [
        c('F', 'due-card-pocket', 'blank due-card pocket empty, ZERO writing'),
        c('F', 'book-support-block', 'foam book-support block, distinct from book-cradle'),
        c('F', 'label-protector', 'clear label protector sheet, no letters'),
        c('F', 'periodical-display', 'small periodical display stand empty, no magazine text'),
        c('F', 'whistle-lanyard', 'whistle on a lanyard, still-life, no brand, distinct from coach-whistle alone'),
        c('F', 'cone-stack', 'short stack of training cones, no numbers'),
        c('F', 'mini-hurdle', 'one mini agility hurdle, still-life, no height numbers'),
        c('F', 'pinnie-clip', 'pinnie / bib clip, still-life'),
        c('F', 'ball-bag-empty', 'mesh ball bag empty, no logos'),
      ]),
    ],
  },
  hk8: {
    id: 's4hk8-micro-actions-altviews-more',
    title: 'Aggressive S4 H8+K8 more micro-actions + alt views',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: more missing micro-actions plus HIGH-DEMAND alt views. Do not repeat prior S4 H/K cells.
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-make-bed', 'generic child pulls a blanket onto a bed fragment, black field, no text'),
        c('H', 'pose-feed-pet', 'generic child holds a bowl toward a small pet silhouette, black field, no brand'),
        c('H', 'pose-knock-door', 'generic child knocks on a door fragment, black field, no EXIT text'),
        c('H', 'pose-open-window', 'generic child opens a window fragment, black field, no signs'),
        c('H', 'pose-close-curtain', 'generic child closes a curtain, black field, no patterns-as-letters'),
        c('H', 'pose-plug-in', 'generic child plugs a cord into a wall fragment, black field, no logos'),
        c('H', 'pose-turn-key-blank', 'generic child turns a key in a lock fragment, black field, no house numbers'),
        c('H', 'pose-bag-groceries', 'generic child bags produce into a bag, black field, no labels'),
        c('H', 'pose-stir-pot', 'generic child stirs a pot on a stove fragment, distinct from bowl-stir, black field, no text'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'plum-cutaway', 'plum CROSS-SECTION, high-demand fruit, no stickers'),
        c('K', 'grape-cutaway', 'one grape CROSS-SECTION, no labels'),
        c('K', 'melon-cutaway', 'cantaloupe-style melon CROSS-SECTION, distinct from watermelon-cutaway, no labels'),
        c('K', 'bell-pepper-cutaway', 'bell pepper CROSS-SECTION, no labels'),
        c('K', 'mushroom-cutaway', 'mushroom CROSS-SECTION, no labels'),
        c('K', 'corn-cutaway', 'corn cob CROSS-SECTION, no labels'),
        c('K', 'broccoli-cutaway', 'broccoli CROSS-SECTION, no labels'),
        c('K', 'cookie-cutaway', 'cookie CROSS-SECTION, distinct from muffin-cutaway, no letters'),
        c('K', 'pancake-cutaway', 'pancake stack CROSS-SECTION, no text'),
      ]),
    ],
  },
  e9: {
    id: 's4e9-a11y-manipulatives-continue',
    title: 'Aggressive S4E9 more access + classroom shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E8 keys.`,
    sheets: [
      sh('S1', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'transfer-disc', 'rotating transfer disc / turntable pad, ordinary, no labels'),
        c('E', 'sliding-sheet', 'folded sliding transfer sheet, ordinary, no brand'),
        c('E', 'mouth-stick', 'simple mouth-stick pointer, ordinary access tool, not a spectacle'),
        c('E', 'keyguard-tablet', 'tablet keyguard SHELL over a BLANK screen, no letters'),
        c('E', 'switch-latch', 'simple switch latch / mount clip empty, ordinary'),
        c('E', 'velcro-watch-band', 'wide velcro watch band, BLANK face, no numerals'),
        c('E', 'adaptive-stylus', 'chunky adaptive stylus, distinct from head-stylus, no brand'),
        c('E', 'page-magnifier-bar', 'bar magnifier for a line of text, still-life, no letters under it'),
        c('E', 'talking-pen-blank', 'talking pen SHELL, BLANK, no logos or words'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'wobble-foot-band', 'foot fidget band on empty chair legs, distinct from chair-resistance-band'),
        c('E', 'focus-hood', 'simple cardboard focus hood / carrel insert, BLANK, no letters'),
        c('E', 'name-plate-blank', 'desk name-plate SHELL, ZERO writing'),
        c('E', 'helper-badge-blank', 'blank helper badge / lanyard card, ZERO writing'),
        c('E', 'quiet-mouth-chew', 'simple chewable tube topper, kid-safe, no brand'),
        c('E', 'seat-sac', 'floor sit-sac / bean floor seat empty-looking, ordinary, no logos'),
        c('E', 'lap-weight-snake', 'weighted lap snake / tube, ordinary classroom, no labels'),
        c('E', 'noise-earplugs', 'pair of foam earplugs still-life, ordinary, no brand'),
        c('E', 'visual-countdown-blank', 'simple countdown strip SHELL, empty boxes, ZERO numerals'),
      ]),
      sh('S3', 'more manip shells 3x3', 'black-contact-3x3', [
        c('E', 'rekenrek-string-20', '20-bead string distinct from 100-bead string, NO numbers'),
        c('E', 'place-value-flip-blank', 'place-value flip chart SHELL, empty flaps, ZERO numerals'),
        c('E', 'fact-family-house-blank', 'fact-family house SHELL, empty rooms, ZERO numerals or letters'),
        c('E', 'ten-frame-cards-blank', 'stack of blank ten-frame cards empty, no dots as numbers'),
        c('E', 'array-mat-blank', 'blank array mat grid, ZERO numerals'),
        c('E', 'number-path-track', 'empty number-path track with tick marks only, ZERO numerals'),
        c('E', 'pattern-core-blank', 'blank AB pattern core strip, empty cells, no letters'),
        c('E', 'sorting-tray-6', 'six-cup sorting tray empty, still-life'),
        c('E', 'linking-people-set', 'small pile of linking people figures, no letters'),
      ]),
    ],
  },
  f9: {
    id: 's4f9-role-detail-continue',
    title: 'Aggressive S4F9 more role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools. Objects only — no new bodies. SKIP prior S4 F–F8 keys.`,
    sheets: [
      sh('S1', 'cafe teacher vet 3x3', 'black-contact-3x3', [
        c('F', 'coffee-tamper', 'espresso tamper still-life, no brand'),
        c('F', 'knock-box', 'espresso knock box empty, still-life, no cafe text'),
        c('F', 'demicup-pair', 'two empty demitasse cups, no logos'),
        c('F', 'teacher-bell', 'small teacher call bell, still-life, no brand'),
        c('F', 'popsicle-sticks-blank', 'bundle of blank craft sticks, ZERO writing'),
        c('F', 'name-chart-shell', 'pocket name-chart SHELL, empty slots, ZERO names'),
        c('F', 'soft-pet-muzzle', 'soft pet muzzle still-life, ordinary, not scary'),
        c('F', 'leash-clip', 'leash clip / carabiner still-life, no brand'),
        c('F', 'pet-nail-file', 'pet nail file, still-life, no brand'),
      ]),
      sh('S2', 'electric carpenter extras 3x3', 'black-contact-3x3', [
        c('F', 'heat-shrink-pack', 'few heat-shrink tubes, still-life, no size numbers as text'),
        c('F', 'cable-staples', 'cable staples still-life, ordinary'),
        c('F', 'crimp-tool', 'wire crimp tool, still-life, no brand'),
        c('F', 'multimeter-blank', 'multimeter, BLANK screen, no digits or logos'),
        c('F', 'torque-wrench-blank', 'torque wrench, BLANK scale, no numerals'),
        c('F', 'chalk-line', 'chalk line reel, unlabeled'),
        c('F', 'speed-square-blank', 'speed square, NO measurement numerals'),
        c('F', 'wood-glue-blank', 'wood glue bottle, BLANK label, no words'),
        c('F', 'sanding-sponge', 'sanding sponge still-life, no grit numbers as text'),
      ]),
      sh('S3', 'clinic garden extras 3x3', 'black-contact-3x3', [
        c('F', 'tongue-swab', 'simple oral swab, still-life, kid-safe, not gore'),
        c('F', 'ear-syringe-bulb', 'rubber ear syringe bulb, ordinary, not scary'),
        c('F', 'clinic-tray-empty', 'small clinic instrument tray empty, no labels'),
        c('F', 'seed-dibber-wide', 'wide seed dibber, distinct from garden-dibber if any, still-life'),
        c('F', 'hand-fork', 'garden hand fork, still-life'),
        c('F', 'leaf-scoop', 'leaf scoop / grabber, still-life'),
        c('F', 'twine-scissors', 'small garden twine scissors, kid-safe still-life'),
        c('F', 'plant-pot-empty', 'small empty plant pot, no brand'),
        c('F', 'saucer-pot', 'pot saucer empty, still-life'),
      ]),
    ],
  },
  hk9: {
    id: 's4hk9-micro-actions-cutaways-more',
    title: 'Aggressive S4 H9 micro-actions + K9 high-demand cutaways',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND CUTAWAYS only. Do not repeat prior S4 H/K or H1/lt2/lt4/Mia-Leo plates.
SKIP LOCK: do not redraw H1 poses (kneel-pick-up, search-under-table, knock, comfort, apologize, invite, permission, wait-in-line, peer-check), lt2 poses (carry-together, pass-object, peek-corner, tie-shoe, zip-coat, wash-hands), lt4 poses (share-umbrella, high-five, whisper, hold-door, help-up, cross-street), or Mia/Leo action plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach).
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-wash-face', 'generic child washes their face at a sink fragment, distinct from wash-hands, black field, no labels'),
        c('H', 'pose-put-on-glasses', 'generic child puts on eyeglasses, black field, no brand'),
        c('H', 'pose-take-off-glasses', 'generic child takes off eyeglasses, black field, no brand'),
        c('H', 'pose-march-in-place', 'generic child marches in place, distinct from run, black field'),
        c('H', 'pose-fist-bump', 'generic child fist-bumps toward camera/peer fragment, distinct from high-five, black field'),
        c('H', 'pose-blow-bubbles', 'generic child blows bubbles from a wand, black field, no brand'),
        c('H', 'pose-press-doorbell', 'generic child presses a doorbell button, distinct from knock, black field, no house numbers'),
        c('H', 'pose-sweep-floor', 'generic child sweeps with a small broom, black field, no labels'),
        c('H', 'pose-hang-towel', 'generic child hangs a towel on a bar fragment, black field, no text'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'mango-cutaway', 'mango CROSS-SECTION, high-demand fruit, no stickers'),
        c('K', 'lime-cutaway', 'lime CROSS-SECTION, distinct from lemon-cutaway, no labels'),
        c('K', 'coconut-cutaway', 'coconut CROSS-SECTION, no labels'),
        c('K', 'cabbage-cutaway', 'cabbage CROSS-SECTION, no labels'),
        c('K', 'cauliflower-cutaway', 'cauliflower CROSS-SECTION, distinct from broccoli-cutaway, no labels'),
        c('K', 'pumpkin-cutaway', 'pumpkin CROSS-SECTION, no carved faces or letters'),
        c('K', 'cherry-cutaway', 'cherry CROSS-SECTION with pit, no labels'),
        c('K', 'croissant-cutaway', 'croissant CROSS-SECTION, no bakery text'),
        c('K', 'cheese-cutaway', 'cheese wedge CROSS-SECTION, no brand'),
      ]),
    ],
  },
  e10: {
    id: 's4e10-a11y-manipulatives-continue',
    title: 'Aggressive S4E10 more access + classroom shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E9 keys.`,
    sheets: [
      sh('S1', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'dome-magnifier', 'dome / paperweight magnifier, still-life, no letters under it'),
        c('E', 'clip-on-lens', 'clip-on magnifying lens for glasses, ordinary, no brand'),
        c('E', 'talking-photo-album-blank', 'talking photo album SHELL, BLANK pages, no photos-as-text'),
        c('E', 'sip-puff-switch', 'simple sip-and-puff switch box, ordinary access, not medical gore'),
        c('E', 'pillow-switch', 'soft pillow / pad switch, ordinary, no labels'),
        c('E', 'chin-switch', 'simple chin switch, ordinary access tool, not a spectacle'),
        c('E', 'threshold-ramp', 'short door-threshold ramp fragment, ordinary, no ADA text'),
        c('E', 'bath-board', 'simple bath board, ordinary, not a spectacle'),
        c('E', 'transfer-bench', 'simple transfer bench, distinct from shower-chair, ordinary'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'check-guide-shell', 'check-writing guide SHELL, empty window, ZERO writing'),
        c('E', 'envelope-address-guide', 'envelope address guide SHELL, empty slots, ZERO letters'),
        c('E', 'dark-line-paper', 'dark-line writing paper SHELL, blank lines only, no letters'),
        c('E', 'writing-guide-frame', 'simple writing guide frame empty, no letters'),
        c('E', 'one-handed-keyboard-blank', 'compact one-handed keyboard SHELL, BLANK keys, ZERO letters'),
        c('E', 'dwell-clicker-blank', 'dwell / hover clicker SHELL, BLANK, no logos'),
        c('E', 'jumbo-remote-blank', 'large-button remote SHELL, BLANK buttons, ZERO text'),
        c('E', 'furniture-riser', 'furniture riser / block, ordinary, no labels'),
        c('E', 'spoke-guards', 'wheelchair spoke guards, ordinary, no logos'),
      ]),
      sh('S3', 'more manip shells 3x3', 'black-contact-3x3', [
        c('E', 'farm-animal-counters', 'small pile of farm-animal counters, no letters'),
        c('E', 'bug-counters', 'small pile of bug counters, no letters'),
        c('E', 'linking-chains', 'short chain of linking chain links, distinct from color-chains, no numerals'),
        c('E', 'soma-cube-blank', 'soma cube pieces, solid colors, no letters'),
        c('E', 'isometric-dot-paper-blank', 'isometric dot paper SHELL, dots only, ZERO numerals'),
        c('E', 'coordinate-grid-blank', 'blank coordinate grid SHELL, no axis numerals or letters'),
        c('E', 'skip-counting-strip-blank', 'blank skip-counting strip, tick marks only, ZERO numerals'),
        c('E', 'fact-triangles-blank', 'blank fact-family triangles, ZERO numerals'),
        c('E', 'ten-frame-dice-blank', 'ten-frame dice, frames only, no numerals'),
      ]),
    ],
  },
  f10: {
    id: 's4f10-role-detail-continue',
    title: 'Aggressive S4F10 more photographer tailor mechanic dentist librarian coach tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools for photographer, tailor, mechanic, dentist, librarian, coach. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F9 keys. Never re-list wire-stripper, paint-roller, drop-cloth, cooling-rack, bench-scraper, floral-tape. Do not redraw lt4 textile tools (spinning-wheel, drop-spindle, pinking-shears).`,
    sheets: [
      sh('S1', 'photographer dentist extras 3x3', 'black-contact-3x3', [
        c('F', 'monopod', 'camera monopod collapsed, still-life, distinct from tripod, no brand'),
        c('F', 'reflector-disc', 'foldable photo reflector disc, still-life, no brand'),
        c('F', 'body-cap', 'camera body cap, still-life, distinct from lens-cap and hot-shoe-cover'),
        c('F', 'camera-strap', 'plain camera strap coiled, unlabeled, no logos'),
        c('F', 'memory-card-reader-blank', 'small memory-card reader, BLANK, no brand or letters'),
        c('F', 'cheek-retractor', 'dental cheek retractor, still-life, kid-safe, not gore'),
        c('F', 'bite-block', 'dental bite block, still-life, not gore'),
        c('F', 'bur-block-empty', 'small dental bur block empty, still-life, no size numerals'),
        c('F', 'articulating-paper-blank', 'strip of articulating paper, unlabeled, not gore'),
      ]),
      sh('S2', 'tailor mechanic extras 3x3', 'black-contact-3x3', [
        c('F', 'rotary-mat', 'self-healing rotary cutting mat, BLANK grid, ZERO numerals or letters'),
        c('F', 'fabric-clips', 'few wonder-style fabric clips, still-life, distinct from hair-clips'),
        c('F', 'loop-turner', 'loop turner tool, still-life, distinct from point-turner'),
        c('F', 'presser-foot', 'sewing machine presser foot, still-life, no brand'),
        c('F', 'chalk-wheel', 'tailor chalk wheel, still-life, no size numbers'),
        c('F', 'wheel-chock', 'simple wheel chock, still-life, no garage text'),
        c('F', 'spark-plug-socket', 'spark-plug socket, still-life, no size numerals as text'),
        c('F', 'tire-pressure-gauge-blank', 'tire pressure gauge, BLANK dial, ZERO numerals'),
        c('F', 'trim-clip-remover', 'plastic trim-clip remover, still-life, not a weapon'),
      ]),
      sh('S3', 'librarian coach extras 3x3', 'black-contact-3x3', [
        c('F', 'book-pocket', 'blank book card pocket empty, ZERO writing, distinct from due-card-pocket'),
        c('F', 'catalog-card-blank', 'blank catalog card, ZERO writing'),
        c('F', 'pamphlet-binder', 'simple pamphlet binder empty, no letters'),
        c('F', 'felt-board-blank', 'small felt board, BLANK, no letters or shapes-as-words'),
        c('F', 'hold-shelf-bin', 'small hold-shelf bin empty, no library signs'),
        c('F', 'foam-roller', 'foam roller, still-life, no brand'),
        c('F', 'foam-balance-pad', 'foam balance pad, still-life, distinct from yoga-block, no brand'),
        c('F', 'pop-up-goal', 'small pop-up sports goal, still-life, no logos'),
        c('F', 'captain-armband-blank', 'blank captain armband, ZERO letters or numbers'),
      ]),
    ],
  },
  hk10: {
    id: 's4hk10-micro-actions-cutaways-more',
    title: 'Aggressive S4 H10 micro-actions + K10 high-demand cutaways',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND CUTAWAYS only. Do not repeat prior S4 H/K or H1/lt2/lt4/Mia-Leo plates.
SKIP LOCK: do not redraw H1 poses (kneel-pick-up, search-under-table, knock, comfort, apologize, invite, permission, wait-in-line, peer-check), lt2 poses (carry-together, pass-object, peek-corner, tie-shoe, zip-coat, wash-hands), lt4 poses (share-umbrella, high-five, whisper, hold-door, help-up, cross-street), or Mia/Leo action plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach).
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-thumbs-up', 'generic child gives a thumbs-up, black field, no text'),
        c('H', 'pose-handshake', 'generic child shakes hands with a peer fragment, distinct from high-five and fist-bump, black field'),
        c('H', 'pose-bow-hello', 'generic child bows in greeting, black field'),
        c('H', 'pose-stretch-arms', 'generic child stretches both arms overhead, distinct from shrug, black field'),
        c('H', 'pose-rub-eyes', 'generic child rubs tired eyes, black field'),
        c('H', 'pose-smell-flower', 'generic child smells a flower, black field, no labels'),
        c('H', 'pose-fold-paper', 'generic child folds a BLANK paper, black field, no letters'),
        c('H', 'pose-take-out-trash', 'generic child carries a small trash bag to a bin fragment, black field, no labels'),
        c('H', 'pose-put-on-gloves', 'generic child puts on gloves, black field, no brand'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'fig-cutaway', 'fig CROSS-SECTION, high-demand fruit, no labels'),
        c('K', 'pomegranate-cutaway', 'pomegranate CROSS-SECTION, no labels'),
        c('K', 'papaya-cutaway', 'papaya CROSS-SECTION with seeds, distinct from lt4 whole tropical fruit, no labels'),
        c('K', 'eggplant-cutaway', 'eggplant CROSS-SECTION, no labels'),
        c('K', 'radish-cutaway', 'radish CROSS-SECTION, no labels'),
        c('K', 'garlic-cutaway', 'garlic bulb CROSS-SECTION, no labels'),
        c('K', 'pie-cutaway', 'pie CROSS-SECTION, distinct from cake-cutaway, no letters'),
        c('K', 'dumpling-cutaway', 'dumpling CROSS-SECTION, no wrappers-as-text'),
        c('K', 'sushi-roll-cutaway', 'sushi roll CROSS-SECTION, no menu text'),
      ]),
    ],
  },
  e11: {
    id: 's4e11-a11y-manipulatives-continue',
    title: 'Aggressive S4E11 more access + classroom shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E10 keys.`,
    sheets: [
      sh('S1', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'bed-shaker-alarm', 'simple bed-shaker alarm puck, BLANK, no digits'),
        c('E', 'flashing-doorbell', 'flashing doorbell receiver, BLANK lights, no words'),
        c('E', 'wrist-splint', 'simple wrist splint, ordinary, not gore'),
        c('E', 'knee-brace', 'simple knee brace, ordinary, not a spectacle'),
        c('E', 'finger-splint', 'simple finger splint, ordinary'),
        c('E', 'therapy-ball', 'large therapy / physio ball, still-life, no brand'),
        c('E', 'peanut-ball', 'peanut-shaped therapy ball, distinct from therapy-ball'),
        c('E', 'crash-mat', 'folded crash / gym mat, ordinary, no logos'),
        c('E', 'body-sock', 'simple sensory body sock, ordinary, no brand'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'sensory-tunnel', 'short fabric sensory tunnel, empty, no letters'),
        c('E', 'chew-bracelet', 'simple chew bracelet, kid-safe, no brand'),
        c('E', 'visual-recipe-shell', 'visual recipe card SHELL: empty boxes, ZERO pictograms or words'),
        c('E', 'wait-card-shell', 'wait-card SHELL, solid color, ZERO pictograms'),
        c('E', 'help-card-shell', 'help-card SHELL, solid color, ZERO pictograms or letters'),
        c('E', 'break-pass-shell', 'break-pass SHELL, blank card, ZERO words'),
        c('E', 'timer-sand-desk', 'small desk sand timer, no minute numerals, distinct from visual-timer-sand'),
        c('E', 'noise-reducing-earbuds', 'simple noise-reducing earbuds, distinct from headphones, no brand'),
        c('E', 'reading-window-ruler', 'clear reading-window ruler, no letters or numerals'),
      ]),
      sh('S3', 'more manip shells 3x3', 'black-contact-3x3', [
        c('E', 'rekenrek-10', '10-bead rekenrek, distinct from 20-bead and 100-bead, NO numbers'),
        c('E', 'dot-cards-blank', 'blank subitizing dot cards with dots only, no numerals'),
        c('E', 'five-frame-cards-blank', 'stack of blank five-frame cards empty, no numerals'),
        c('E', 'part-whole-circles-blank', 'blank part-whole circle mat, ZERO numerals'),
        c('E', 'ten-frame-dice-blank', 'ten-frame dice, empty frames, no numerals'),
        c('E', 'bead-bars-short', 'short colored bead bars of different lengths, NO printed numbers'),
        c('E', 'sorting-tray-4', 'four-cup sorting tray empty, distinct from six-cup'),
        c('E', 'lacing-shapes-blank', 'blank lacing shapes with holes, no letters'),
        c('E', 'pattern-block-template-blank', 'blank pattern-block template card empty, no letters'),
      ]),
    ],
  },
  f11: {
    id: 's4f11-role-detail-continue',
    title: 'Aggressive S4F11 more role DETAIL tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools for photographer, tailor, mechanic, dentist, librarian, coach. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F10 keys. Never re-list wire-stripper, paint-roller, drop-cloth, cooling-rack, bench-scraper, floral-tape.`,
    sheets: [
      sh('S1', 'photo dentist extras 3x3', 'black-contact-3x3', [
        c('F', 'light-stand', 'small photo light stand empty, no brand'),
        c('F', 'softbox-mini', 'mini softbox, still-life, no brand'),
        c('F', 'clamshell-reflector', 'small clamshell reflector, distinct from bounce-card'),
        c('F', 'lens-pouch', 'padded lens pouch empty, no logos'),
        c('F', 'camera-rain-cover', 'simple camera rain cover, unlabeled'),
        c('F', 'saliva-ejector-holder', 'saliva-ejector holder empty, still-life, not gore'),
        c('F', 'cotton-roll-holder', 'cotton-roll holder empty, still-life'),
        c('F', 'dental-tray-cover', 'dental tray cover / lid, still-life, no clinic text'),
        c('F', 'prophy-brush', 'small prophy brush, still-life, not gore'),
      ]),
      sh('S2', 'tailor mechanic extras 3x3', 'black-contact-3x3', [
        c('F', 'bias-tape', 'roll of unlabeled bias tape, distinct from bias-tape-maker'),
        c('F', 'bodkin', 'bodkin / elastic threader, still-life'),
        c('F', 'needle-case', 'small needle case closed, no brand'),
        c('F', 'snips-holster', 'thread-snips holster empty, still-life'),
        c('F', 'pattern-notcher', 'pattern notcher tool, still-life'),
        c('F', 'cotter-pins', 'few cotter pins still-life, ordinary'),
        c('F', 'hose-pick', 'hose pick / O-ring pick, still-life, not a weapon'),
        c('F', 'brake-bleeder-cap', 'simple bleeder cap still-life, no brand'),
        c('F', 'funnel-paper', 'disposable paper funnel, still-life'),
      ]),
      sh('S3', 'librarian coach extras 3x3', 'black-contact-3x3', [
        c('F', 'book-tape', 'roll of book-repair tape unlabeled, distinct from spine-repair-tape'),
        c('F', 'corner-protectors', 'few book corner protectors, still-life'),
        c('F', 'periodical-box', 'periodical storage box empty, no library text'),
        c('F', 'map-weight', 'map weight / snake, still-life, no letters'),
        c('F', 'atlas-cradle', 'atlas cradle empty, distinct from book-cradle'),
        c('F', 'ladder-agility-mini', 'mini agility ladder, distinct from agility-ladder, no numerals'),
        c('F', 'resistance-loop', 'resistance loop band, still-life, no brand'),
        c('F', 'ankle-weights', 'pair of small ankle weights, no printed mass numbers'),
        c('F', 'coach-clipboard-blank', 'coach clipboard with BLANK sheet, ZERO writing, distinct from attendance-clipboard'),
      ]),
    ],
  },
  hk11: {
    id: 's4hk11-micro-actions-cutaways-more',
    title: 'Aggressive S4 H11 micro-actions + K11 high-demand cutaways',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND CUTAWAYS only. Do not repeat prior S4 H/K or H1/lt2/lt4/Mia-Leo plates.
SKIP LOCK: do not redraw H1 poses (kneel-pick-up, search-under-table, knock, comfort, apologize, invite, permission, wait-in-line, peer-check), lt2 poses (carry-together, pass-object, peek-corner, tie-shoe, zip-coat, wash-hands), lt4 poses (share-umbrella, high-five, whisper, hold-door, help-up, cross-street), or Mia/Leo action plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach).
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-cover-ears', 'generic child covers ears with both hands, distinct from cover-eyes, black field'),
        c('H', 'pose-point-up', 'generic child points up, black field'),
        c('H', 'pose-point-down', 'generic child points down, black field'),
        c('H', 'pose-spin-around', 'generic child spins in place, black field, distinct from run'),
        c('H', 'pose-ring-bell', 'generic child rings a small bell, black field, no text'),
        c('H', 'pose-hold-hands-circle', 'two generic children hold hands in a small circle fragment, black field, not Mia/Leo'),
        c('H', 'pose-blow-on-food', 'generic child blows on hot food, black field, no labels'),
        c('H', 'pose-tape-paper', 'generic child tapes BLANK paper, black field, no letters'),
        c('H', 'pose-glue-stick', 'generic child uses a glue stick on BLANK paper, black field, no brand'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'donut-cutaway', 'donut CROSS-SECTION, no icing letters'),
        c('K', 'celery-cutaway', 'celery CROSS-SECTION, no labels'),
        c('K', 'zucchini-cutaway', 'zucchini CROSS-SECTION, distinct from cucumber-cutaway, no labels'),
        c('K', 'beet-cutaway', 'beet CROSS-SECTION, no labels'),
        c('K', 'ginger-cutaway', 'ginger CROSS-SECTION, no labels'),
        c('K', 'chili-cutaway', 'chili pepper CROSS-SECTION, distinct from bell-pepper-cutaway, no labels'),
        c('K', 'blueberry-cutaway', 'blueberry CROSS-SECTION, no labels'),
        c('K', 'tart-cutaway', 'fruit tart CROSS-SECTION, distinct from pie-cutaway, no letters'),
        c('K', 'bun-cutaway', 'bread bun CROSS-SECTION, distinct from bread-loaf-cutaway, no text'),
      ]),
    ],
  },
  e12: {
    id: 's4e12-a11y-manipulatives-continue',
    title: 'Aggressive S4E12 more access + classroom shells',
    stream: 'E',
    family: 'a11y-manipulatives',
    style: `${STYLE}
FAMILY: more ordinary access equipment and blank shells. No spectacle. No letters or numbers.
SKIP LOCK: do not redraw prior S4 E–E11 keys.`,
    sheets: [
      sh('S1', 'more daily access 3x3', 'black-contact-3x3', [
        c('E', 'folding-cane-seat', 'white cane with a folding seat, ordinary, no spectacle, no text'),
        c('E', 'wheelchair-backpack', 'wheelchair-back bag empty, ordinary, no logos'),
        c('E', 'anti-tip-wheels', 'pair of wheelchair anti-tip wheels, ordinary'),
        c('E', 'gel-wheelchair-cushion', 'wheelchair gel cushion, distinct from gel-seat-cushion, no labels'),
        c('E', 'swivel-cushion', 'car/chair swivel cushion, ordinary, no labels'),
        c('E', 'door-knob-lever', 'add-on door-knob lever, ordinary, no brand'),
        c('E', 'bottle-opener-ring', 'ring-style bottle opener, still-life, no brand'),
        c('E', 'gas-cap-gripper', 'gas-cap gripper aid, ordinary, no logos'),
        c('E', 'car-handybar', 'car handybar / stand-assist handle, ordinary, not a weapon'),
      ]),
      sh('S2', 'more classroom access 3x3', 'black-contact-3x3', [
        c('E', 'talking-scale-blank', 'talking kitchen scale SHELL, BLANK screen, ZERO digits'),
        c('E', 'jumbo-cards-blank', 'jumbo playing cards, BLANK faces, ZERO pips-as-numbers-as-text'),
        c('E', 'eyegaze-frame-shell', 'eyegaze communication frame SHELL, empty cells, ZERO pictograms'),
        c('E', 'head-pointer-cap', 'head-pointer cap, ordinary access, not a spectacle'),
        c('E', 'switch-box-blank', 'simple switch interface box, BLANK, no logos'),
        c('E', 'high-contrast-stickers-blank', 'sheet of blank high-contrast key stickers, ZERO letters'),
        c('E', 'money-organizer', 'bill organizer wallet empty, no currency numerals as text'),
        c('E', 'signature-stamp-blank', 'signature stamp with BLANK face, no letters'),
        c('E', 'large-print-calendar-shell', 'desk calendar SHELL, empty boxes, ZERO numerals or words'),
      ]),
      sh('S3', 'more manip shells 3x3', 'black-contact-3x3', [
        c('E', 'sea-animal-counters', 'small pile of sea-animal counters, no letters'),
        c('E', 'vehicle-counters', 'small pile of vehicle counters, no letters'),
        c('E', 'fraction-bars-blank', 'blank fraction bars of different lengths, NO printed fractions'),
        c('E', 'percent-circle-blank', 'blank percent circle pieces, ZERO numerals'),
        c('E', 'angle-strips-blank', 'blank angle-strip pieces, ZERO degree numerals'),
        c('E', 'number-scroll-blank', 'blank number scroll strip, tick marks only, ZERO numerals'),
        c('E', 'place-value-arrows-blank', 'blank place-value arrow cards, ZERO numerals'),
        c('E', 'geoboard-circle-blank', 'circular geoboard empty, distinct from polar-geoboard, no numerals'),
        c('E', 'linking-stars', 'short chain of linking star shapes, no numerals'),
      ]),
    ],
  },
  f12: {
    id: 's4f12-role-detail-continue',
    title: 'Aggressive S4F12 more photographer tailor mechanic dentist librarian coach tools',
    stream: 'F',
    family: 'role-detail-props',
    style: `${STYLE}
FAMILY: more handheld tools for photographer, tailor, mechanic, dentist, librarian, coach. Objects only — no new bodies.
SKIP LOCK: do not redraw prior S4 F–F11 keys. Never re-list wire-stripper, paint-roller, drop-cloth, cooling-rack, bench-scraper, floral-tape.`,
    sheets: [
      sh('S1', 'photographer dentist extras 3x3', 'black-contact-3x3', [
        c('F', 'color-gel-set', 'few photo color gels, unlabeled, no letters'),
        c('F', 'boom-arm-mini', 'mini boom arm, still-life, no brand'),
        c('F', 'uv-filter', 'camera UV filter, still-life, no brand'),
        c('F', 'tether-cable', 'camera tether cable coiled, unlabeled'),
        c('F', 'snoot', 'photo snoot, still-life, no brand'),
        c('F', 'fluoride-tray-empty', 'dental fluoride tray empty, still-life, not gore'),
        c('F', 'cotton-pliers', 'cotton pliers, still-life, kid-safe, not gore'),
        c('F', 'xray-apron-fold', 'folded x-ray lead apron, ordinary, no clinic text'),
        c('F', 'curing-shield', 'orange curing-light shield, still-life, no brand'),
      ]),
      sh('S2', 'tailor mechanic extras 3x3', 'black-contact-3x3', [
        c('F', 'dress-form-mini', 'mini dress form, still-life, no size numbers'),
        c('F', 'walking-foot', 'sewing walking foot, still-life, distinct from presser-foot'),
        c('F', 'buttonhole-cutter', 'buttonhole cutter chisel, still-life, not a weapon'),
        c('F', 'hem-clips', 'few hem clips, distinct from fabric-clips'),
        c('F', 'serger-tweezers', 'serger tweezers, still-life'),
        c('F', 'ratchet-handle', 'ratchet handle, still-life, not a weapon'),
        c('F', 'oil-filter-pliers', 'oil-filter pliers, distinct from oil-filter-wrench'),
        c('F', 'spark-plug-gapper', 'spark-plug gap tool, BLANK, no thickness numerals'),
        c('F', 'cross-lug-wrench', 'cross lug wrench, still-life, not a weapon'),
      ]),
      sh('S3', 'librarian coach extras 3x3', 'black-contact-3x3', [
        c('F', 'stamp-pad', 'ink stamp pad closed, unlabeled'),
        c('F', 'acid-free-folder', 'acid-free folder empty, ZERO writing'),
        c('F', 'book-jacket-cover', 'clear book jacket cover empty, no letters'),
        c('F', 'display-easel-empty', 'small display easel empty, no signs'),
        c('F', 'library-card-blank', 'blank library card, ZERO writing'),
        c('F', 'batting-tee', 'simple batting tee, still-life, no height numbers'),
        c('F', 'slalom-pole', 'one slalom / agility pole, still-life, no height numbers'),
        c('F', 'megaphone-blank', 'megaphone SHELL, BLANK, no brand or letters'),
        c('F', 'pump-needle', 'ball pump needle, still-life, distinct from ball-pump'),
      ]),
    ],
  },
  hk12: {
    id: 's4hk12-micro-actions-cutaways-more',
    title: 'Aggressive S4 H12 micro-actions + K12 high-demand cutaways',
    stream: 'HK',
    family: 'micro-actions-altviews',
    style: `${STYLE}
FAMILY MIX: missing micro-actions (generic kids, not Mia/Leo) plus HIGH-DEMAND CUTAWAYS only. Do not repeat prior S4 H/K or H1/lt2/lt4/Mia-Leo plates.
SKIP LOCK: do not redraw H1 poses (kneel-pick-up, search-under-table, knock, comfort, apologize, invite, permission, wait-in-line, peer-check), lt2 poses (carry-together, pass-object, peek-corner, tie-shoe, zip-coat, wash-hands), lt4 poses (share-umbrella, high-five, whisper, hold-door, help-up, cross-street), or Mia/Leo action plates (jump/climb/eat/drink/kick/run/throw/catch/wave/push/swim/draw/brush + idle/hold/walk/talk/sit/listen/reach).
${PEOPLE_LOCK}`,
    sheets: [
      sh('S1', 'more micro-actions 3x3', 'black-contact-3x3', [
        c('H', 'pose-cheer', 'generic child cheers with both arms up, distinct from clap, black field'),
        c('H', 'pose-turn-around', 'generic child turns around looking back, black field'),
        c('H', 'pose-step-over', 'generic child steps over a small object, black field'),
        c('H', 'pose-duck-under', 'generic child ducks under a bar fragment, black field'),
        c('H', 'pose-scratch-head', 'generic child scratches their head thinking, black field'),
        c('H', 'pose-hold-nose', 'generic child holds their nose, black field'),
        c('H', 'pose-rinse-mouth', 'generic child rinses mouth at a sink fragment, distinct from wash-face, black field'),
        c('H', 'pose-balance-one-foot', 'generic child balances on one foot, distinct from hop/jump, black field'),
        c('H', 'pose-hang-art-blank', 'generic child hangs a BLANK paper on a wall fragment, black field, no letters'),
      ], PEOPLE_LOCK),
      sh('S2', 'high-demand cutaways 3x3', 'black-contact-3x3', [
        c('K', 'grapefruit-cutaway', 'grapefruit CROSS-SECTION, distinct from orange-cutaway, no labels'),
        c('K', 'persimmon-cutaway', 'persimmon CROSS-SECTION, no labels'),
        c('K', 'olive-cutaway', 'olive CROSS-SECTION, no labels'),
        c('K', 'leek-cutaway', 'leek CROSS-SECTION, no labels'),
        c('K', 'asparagus-cutaway', 'asparagus CROSS-SECTION, no labels'),
        c('K', 'taco-cutaway', 'taco CROSS-SECTION, no wrappers-as-text'),
        c('K', 'burrito-cutaway', 'burrito CROSS-SECTION, no labels'),
        c('K', 'ice-cream-scoop-cutaway', 'ice-cream scoop CROSS-SECTION, no brand'),
        c('K', 'chocolate-bar-cutaway', 'chocolate bar CROSS-SECTION, no brand letters'),
      ]),
    ],
  },
};

export const WAVE_ORDER = ['e', 'f', 'hk', 'e2', 'f2', 'hk2', 'e3', 'f3', 'hk3', 'e4', 'f4', 'hk4', 'e5', 'f5', 'hk5', 'e6', 'f6', 'hk6', 'e7', 'f7', 'hk7', 'e8', 'f8', 'hk8', 'e9', 'f9', 'hk9', 'e10', 'f10', 'hk10', 'e11', 'f11', 'hk11', 'e12', 'f12', 'hk12'];
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
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} aggressive-S4 black-field PNG contact sheet(s)** for ClassIn ESL.

SOURCE OF TRUTH: scripts/manus/request-aggressive-s4.mjs, this wave only. Partition harvested/manus-aggressive-stockpile/s4-roles-a11y/. Future merge prefix ${MANIFEST_PREFIX} only.

${wave.style}

HARD RULES:
- Generate ONLY the listed cells. Do not review, dedupe, research, broaden, or add concepts.
- Reading order left to right, top to bottom.
- One concept per cell, pure #000000 black field, clear gutters, nothing crossing cell boundaries.
- NO baked readable text, fake writing, labels, letters, numbers, prices, times, dates, dialogue, signs, badges, logos, UI text, or watermarks.
- Accessibility items are ordinary equipment, not a spectacle.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG contact sheet exists. The 5-image cap is per generate_image call, not per task. This wave has ${sheets.length} sheets: fire them inside THIS task.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return PNGs, preferably one zip plus CDN links. No essay.`);
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
  const r = spawnSync('tar', ['-xf', zipPath, '-C', outDir], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (ps.status !== 0) {
    throw new Error(
      `Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`,
    );
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
    spec: 'aggressive-s4-roles-a11y',
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
    by_stream: { E: 0, F: 0, H: 0, K: 0 },
    waves: {},
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.by_stream = {
    E: items.filter((it) => it.stream === 'E').length,
    F: items.filter((it) => it.stream === 'F').length,
    H: items.filter((it) => it.stream === 'H').length,
    K: items.filter((it) => it.stream === 'K').length,
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
  if (process.env.MANUS_FORCE_RERUN && !pollOnly && fs.existsSync(RUN_JSON)) {
    const preserveDir = `${OUT_DIR}-failed-source-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.cpSync(OUT_DIR, preserveDir, { recursive: true });
    fs.rmSync(path.join(SHEET_DIR, 'raw'), { recursive: true, force: true });
    fs.rmSync(path.join(SHEET_DIR, 'zip-extract'), { recursive: true, force: true });
    clearNumberedSheets(SHEET_DIR);
  }
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
    kind: 'aggressive-s4',
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
    const created = await createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: BRIEF,
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
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} aggressive-S4 black-field sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list.`,
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
  console.log(
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
  );
  if (largeCount < NEED_SHEETS) process.exit(2);
}

const counts = { E: 0, F: 0, H: 0, K: 0 };
for (const cell of MANUS_WORTHY) counts[cell.stream] += 1;
if (counts.E !== 333 || counts.F !== 333 || counts.H !== 108 || counts.K !== 108) {
  throw new Error(`S4 key integrity E/F/H/K ${JSON.stringify(counts)}`);
}
if (
  WAVES.e.sheets.length !== 4 ||
  WAVES.f.sheets.length !== 4 ||
  WAVES.hk.sheets.length !== 2 ||
  WAVES.e2.sheets.length !== 3 ||
  WAVES.f2.sheets.length !== 3 ||
  WAVES.hk2.sheets.length !== 2 ||
  WAVES.e3.sheets.length !== 3 ||
  WAVES.f3.sheets.length !== 3 ||
  WAVES.hk3.sheets.length !== 2 ||
  WAVES.e4.sheets.length !== 3 ||
  WAVES.f4.sheets.length !== 3 ||
  WAVES.hk4.sheets.length !== 2 ||
  WAVES.e5.sheets.length !== 3 ||
  WAVES.f5.sheets.length !== 3 ||
  WAVES.hk5.sheets.length !== 2 ||
  WAVES.e6.sheets.length !== 3 ||
  WAVES.f6.sheets.length !== 3 ||
  WAVES.hk6.sheets.length !== 2 ||
  WAVES.e7.sheets.length !== 3 ||
  WAVES.f7.sheets.length !== 3 ||
  WAVES.hk7.sheets.length !== 2 ||
  WAVES.e8.sheets.length !== 3 ||
  WAVES.f8.sheets.length !== 3 ||
  WAVES.hk8.sheets.length !== 2 ||
  WAVES.e9.sheets.length !== 3 ||
  WAVES.f9.sheets.length !== 3 ||
  WAVES.hk9.sheets.length !== 2 ||
  WAVES.e10.sheets.length !== 3 ||
  WAVES.f10.sheets.length !== 3 ||
  WAVES.hk10.sheets.length !== 2 ||
  WAVES.e11.sheets.length !== 3 ||
  WAVES.f11.sheets.length !== 3 ||
  WAVES.hk11.sheets.length !== 2 ||
  WAVES.e12.sheets.length !== 3 ||
  WAVES.f12.sheets.length !== 3 ||
  WAVES.hk12.sheets.length !== 2
) {
  throw new Error('S4 sheet counts must include e12/f12/hk12');
}

apiKey();
if (process.argv.includes('--all')) {
  for (const w of WAVE_ORDER) await runWave(w);
} else {
  await runWave(arg('wave', ''));
}
