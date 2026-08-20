/**
 * Visual-grammar stockpile keys.
 * Repo-grounded dedupe of interaction/stagecraft art. Stockpile only — no wiring.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const STOCKPILE_REL = 'harvested/manus-visual-grammar-stockpile';
export const DERIVED_REL = 'harvested/derived-visual-variants';
export const TRACKED_INV_REL = 'docs/visual-grammar-stockpile-inventory.json';
export const TRACKED_REPORT_REL = 'docs/visual-grammar-stockpile-report.md';
export const P1_SHORTLIST_REL = 'docs/visual-grammar-p1-shortlist.md';

export const SAFETY_SKIP_KEYS = new Set([
  'rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun',
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, and padding across every sheet in this harvest. No photorealism, no glossy 3D, no sticker-pack chaos, no alternate art styles.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text, or fake readable text.
BLACK FIELD LOCK: every contact sheet is pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black.
OVERLAY LOCK: comics effects, atmosphere, attention, and feedback assets are overlay atoms — compact, keyable, no full backgrounds, generous inner margin, recognizable at board size.
STATE LOCK: matched state families keep the same object identity, viewpoint, scale, baseline, and canvas convention.
STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to PropBank, modify renderer, or broaden this list.
QUALITY: default only.`;

function item(classification, family, key, extra = {}) {
  return { key, concept: key, family, classification, ...extra };
}
function m(family, key, brief) {
  return item('MANUS_WORTHY', family, key, { brief, status: 'pending', qa_status: null });
}
function have(family, key, existing, reason) {
  return item('HAVE_ENOUGH', family, key, { existing, reason });
}
function code(family, key, reason) {
  return item('CODE_LATER', family, key, { reason });
}
function low(family, key, reason) {
  return item('LOW_VALUE', family, key, { reason });
}
function local(family, key, reason) {
  return item('LOCAL_TRANSFORM', family, key, { reason });
}
function p1(family, key, reason) {
  return item('P1_HOLD', family, key, { reason });
}

function sh(id, title, format, cells, extra = '') {
  return { id, title, format, cells, extra };
}

const F1 = 'comics-action-effects';
const F2 = 'interaction-affordances';
const F3 = 'attention-search';
const F4 = 'reveal-mystery';
const F5 = 'foreground-surfaces';
const F6 = 'weather-atmosphere';
const F7 = 'text-carriers';
const F8 = 'transformation-states';
const F9 = 'sort-journey-surfaces';
const F10 = 'feedback-recovery';

/** Every P0 candidate considered. MANUS_WORTHY cells are the generate list. */
export const CANDIDATES = [
  // --- F1 comics: live bank has objects (confetti, price burst) not action grammar ---
  have(F1, 'sparkle-as-found-cue', 'overlay-found-item-sparkle', 'H3 found-item sparkle exists; comics action sparkle is a different job'),
  have(F1, 'celebration-confetti-overlay', 'overlay-celebration-bunting-confetti', 'H3 celebration overlay exists; not speed/impact grammar'),
  have(F1, 'party-confetti-object', 'party-confetti', 'party pack object, not reusable action overlay'),
  low(F1, 'shop-price-burst', 'topic-locked shopping burst, not comics grammar'),
  low(F1, 'sparkle-tooth', 'dental vocab still-life, not an effect overlay'),
  low(F1, 'animation-frame-sequences', 'do not generate animation cels'),
  low(F1, 'particle-systems', 'runtime particles are code, not stockpile art'),
  m(F1, 'fx-speed-lines-right', 'comic speed lines pointing right, overlay atom, no object, no text'),
  m(F1, 'fx-speed-lines-left', 'comic speed lines pointing left, same style as right variant'),
  m(F1, 'fx-motion-streak-right', 'motion streak / afterimage smear to the right, overlay atom'),
  m(F1, 'fx-motion-streak-left', 'motion streak to the left, matched to right variant'),
  m(F1, 'fx-dash-trail-right', 'dashed movement trail pointing right'),
  m(F1, 'fx-dash-trail-left', 'dashed movement trail pointing left'),
  m(F1, 'fx-motion-arc-up', 'curved motion arc upward, hop/jump cue'),
  m(F1, 'fx-motion-arc-right', 'curved motion arc to the right'),
  m(F1, 'fx-impact-burst', 'calm impact burst / hit star, overlay atom, no text'),
  m(F1, 'fx-impact-puff', 'soft impact puff cloud'),
  m(F1, 'fx-dust-poof', 'dust poof at feet / contact'),
  m(F1, 'fx-landing-puff', 'landing puff under a jump landing'),
  m(F1, 'fx-bounce-mark', 'bounce squash mark, still-frame cue not animation'),
  m(F1, 'fx-wobble-lines', 'wobble / jelly lines around a shaken object'),
  m(F1, 'fx-shake-lines', 'shake vibration lines'),
  m(F1, 'fx-spin-ribbon', 'spin ribbon / swirl around a center'),
  m(F1, 'fx-splash-arc-right', 'liquid splash arc to the right'),
  m(F1, 'fx-splash-arc-left', 'liquid splash arc to the left'),
  m(F1, 'fx-scatter-burst', 'small objects scatter burst, generic bits, no words'),
  m(F1, 'fx-sparkle-clean', 'clean sparkle / shine cluster, overlay atom'),
  m(F1, 'fx-sparkle-cluster', 'slightly denser sparkle cluster, same family'),
  m(F1, 'fx-surprise-rays', 'surprise rays from a point'),
  m(F1, 'fx-realization-marks', 'realization marks (lightbulb-free spark ticks / idea ticks), no letters'),
  m(F1, 'fx-sweat-drop', 'single comic sweat drop'),
  m(F1, 'fx-dizziness-stars', 'dizziness stars orbit, kid-safe, no injury'),
  m(F1, 'fx-heat-waves', 'heat shimmer waves, overlay atom'),
  m(F1, 'fx-smell-swirls', 'smell swirls rising, overlay atom'),
  m(F1, 'fx-sound-ripples', 'sound ripples from a source point'),
  m(F1, 'fx-quiet-aura', 'soft quiet aura / hush glow'),
  m(F1, 'fx-loud-burst', 'loud burst / bang star without letters or KO text'),
  m(F1, 'fx-magic-poof', 'transformation / magic poof cloud'),
  m(F1, 'fx-success-tada-rays', 'success ta-da rays, no trophy text'),
  m(F1, 'fx-speed-lines-calm', 'calmer / thinner speed lines, same direction-neutral burst'),
  m(F1, 'fx-impact-burst-strong', 'stronger impact burst, matched geometry to calm burst'),
  m(F1, 'fx-sparkle-small', 'tiny single sparkle, overlay atom'),
  m(F1, 'fx-bounce-arc', 'small bounce arc with landing tick'),

  // --- F2 affordances: containers exist; grammar sockets do not ---
  have(F2, 'container-destinations', 'hero-box-open / hero-backpack-open / hide-basket-open', 'hundreds of open containers already exist; do not make another box'),
  have(F2, 'animal-mouth-feed', 'hero-animal-mouth', 'topic-locked feeding mouth; still need a generic feeding opening'),
  have(F2, 'tray-surfaces', 'hero-lunch-tray / hero-art-palette-tray / hero-baking-sheet', 'topic trays exist; grammar wells still missing'),
  have(F2, 'h2-stages', 'stage-kitchen-workbench-mixing-bowl and H2 siblings', 'horizontal harvest already made four stage heroes'),
  code(F2, 'plain-boxes', 'plain destination boxes are code'),
  code(F2, 'plain-circles', 'plain target circles are code'),
  code(F2, 'simple-borders', 'simple borders are code'),
  code(F2, 'generic-arrows', 'generic arrows are code'),
  code(F2, 'generic-cards', 'generic cards are code'),
  m(F2, 'aff-ghost-destination', 'illustrated object ghost / shadow destination, not a plain box'),
  m(F2, 'aff-ghost-round', 'round ghost destination, matched family to object ghost'),
  m(F2, 'aff-puzzle-fit-socket', 'puzzle-fit destination socket with illustrated tab/slot, empty'),
  m(F2, 'aff-snap-halo', 'magnetic / snap halo ring, overlay around a drop point'),
  m(F2, 'aff-nesting-pad', 'nesting pad that reads as a place an object sits inside'),
  m(F2, 'aff-build-socket', 'build socket / peg receiver, empty, illustrated'),
  m(F2, 'aff-stack-base', 'stack base that shows where a pile starts'),
  m(F2, 'aff-route-gate', 'route gate kids drag through, illustrated arch/gate not a rectangle'),
  m(F2, 'aff-sorting-mouth', 'sorting mouth opening, generic not an animal face'),
  m(F2, 'aff-feeding-opening', 'generic feeding opening / hopper, not a specific animal'),
  m(F2, 'aff-collection-pocket', 'collection pocket / pouch destination, empty'),
  m(F2, 'aff-drop-habitat', 'illustrated drop habitat nest / hollow, empty'),
  m(F2, 'aff-matching-dock', 'matching dock with two illustrated wells, empty'),
  m(F2, 'aff-assembly-connector', 'assembly connector piece, empty join'),
  m(F2, 'aff-parking-spot', 'object parking spot with illustrated bay, not a plain rectangle'),
  m(F2, 'aff-landing-pad', 'target landing pad, illustrated, empty center'),
  m(F2, 'aff-empty-well', 'empty well state, same geometry as occupied well'),
  m(F2, 'aff-occupied-well', 'occupied well state, same geometry as empty well, generic object inside'),
  m(F2, 'aff-tray-well', 'illustrated tray well / indent, empty'),
  m(F2, 'aff-hook-hang', 'hook / hang spot for hanging objects'),
  m(F2, 'aff-slot-insert', 'slot to insert a card/object, illustrated'),
  m(F2, 'aff-ring-target', 'illustrated ring target / hoop'),
  m(F2, 'aff-magnet-snap', 'magnet snap plate, illustrated'),
  m(F2, 'aff-peg-hole', 'peg hole board socket, one hole, empty'),
  m(F2, 'aff-shelf-well', 'shelf well / cubby destination, empty'),
  m(F2, 'aff-bowl-nest', 'bowl nest destination, empty'),
  m(F2, 'aff-track-join', 'track join / rail connector, empty ends'),
  m(F2, 'aff-clip-dock', 'clip dock / clothespin-style hold point'),
  m(F2, 'aff-puzzle-tab', 'puzzle tab piece showing how two parts join'),
  m(F2, 'aff-bin-mouth', 'front-facing bin mouth, empty drop opening'),

  // --- F3 attention ---
  have(F3, 'magnifying-glass-objects', 'arch/geo/sch/optic/hobby magnifying glasses + gicon-loupe', 'glass-as-object is covered; need a magnifier WINDOW overlay'),
  have(F3, 'vocab-spotlight', 'vocab spotlight.png', 'spotlight as vocab object, not a cone overlay'),
  have(F3, 'lost-item-spotlight', 'overlay-lost-item-spotlight', 'H3 missing-item glow; still need a reusable spotlight cone'),
  code(F3, 'plain-attention-circles', 'plain circles are code'),
  code(F3, 'plain-attention-arrows', 'plain arrows are code'),
  m(F3, 'attn-spotlight-cone', 'spotlight cone overlay, transparent-capable, no full background'),
  m(F3, 'attn-spotlight-pool', 'soft spotlight pool on the ground'),
  m(F3, 'attn-vignette-aperture', 'vignette / darken aperture ring, overlay atom'),
  m(F3, 'attn-magnifier-window', 'illustrated magnifier window / circular view hole, not a handheld glass object'),
  m(F3, 'attn-binocular-frame', 'binocular view frame overlay'),
  m(F3, 'attn-clue-sparkle', 'clue sparkle, small discovery glint cluster'),
  m(F3, 'attn-clue-glint', 'single clue glint tick'),
  m(F3, 'attn-peeking-eyes', 'peeking eyes from a hide edge, kid-safe, no full face'),
  m(F3, 'attn-scan-band', 'scan band / search sweep overlay'),
  m(F3, 'attn-search-beam', 'search beam from a lamp/torch, overlay'),
  m(F3, 'attn-pointing-hand-left', 'illustrated pointing hand left, child-friendly, not a generic arrow'),
  m(F3, 'attn-pointing-hand-right', 'illustrated pointing hand right'),
  m(F3, 'attn-pointing-hand-down', 'illustrated pointing hand down'),
  m(F3, 'attn-pointing-hand-up', 'illustrated pointing hand up'),
  m(F3, 'attn-chalk-loop', 'hand-drawn / chalk attention loop, irregular, not a perfect circle'),
  m(F3, 'attn-emphasis-burst', 'emphasis burst frame around a target, illustrated'),
  m(F3, 'attn-footprint-trail', 'footprint search trail, 3-5 prints, no text'),
  m(F3, 'attn-spotlight-narrow', 'narrow spotlight cone variant'),
  m(F3, 'attn-peek-corner', 'peeking eyes from a corner flap'),
  m(F3, 'attn-search-glow-loop', 'illustrated search glow loop, not a plain circle'),

  // --- F4 reveal: containers/curtains exist; mystery presentation devices do not ---
  have(F4, 'curtain-closed-open', 'hide-curtain-closed / hide-curtain-open / hero-curtain-*', 'theatre curtain closed/open already banked; only peek is missing'),
  have(F4, 'cloche-cover', 'resto-cloche', 'cloche object exists; skip another cloche'),
  have(F4, 'hide-containers', 'hide-box / chest / locker / door / drawer / envelope / gift-box / tent', 'ordinary conceal containers already deep'),
  have(F4, 'keyhole-vocab', 'vocab keyhole.png', 'keyhole still-life exists; keyhole PORTAL reveal states do not'),
  have(F4, 'closed-door-barrier', 'overlay-closed-door-barrier', 'H3 closed-place cue exists'),
  m(F4, 'reveal-curtain-peek', 'theatre curtain slightly parted peek state, same geometry family as existing curtains, no text'),
  m(F4, 'reveal-torn-paper-closed', 'torn-paper reveal cover, closed / fully covering'),
  m(F4, 'reveal-torn-paper-open', 'torn-paper reveal open, matched geometry to closed'),
  m(F4, 'reveal-fog-cover', 'fog / mist cover overlay, dense'),
  m(F4, 'reveal-fog-thinned', 'thinned fog, matched to dense fog cover'),
  m(F4, 'reveal-cloud-wipe', 'cloud wipe cover, illustrated cloud mass'),
  m(F4, 'reveal-mystery-cloth-draped', 'mystery cloth draped over a hidden shape'),
  m(F4, 'reveal-mystery-cloth-lifted', 'mystery cloth lifted, matched geometry'),
  m(F4, 'reveal-puzzle-cover', 'puzzle-piece cover over a hidden area, empty/no picture baked in'),
  m(F4, 'reveal-keyhole-dark', 'keyhole portal reveal, dark / closed view'),
  m(F4, 'reveal-keyhole-open', 'keyhole portal open / lit view hole, matched geometry'),
  m(F4, 'reveal-peel-back-corner', 'peel-back corner of a cover'),
  m(F4, 'reveal-scratch-covered', 'scratch-reveal panel, fully covered texture, no letters'),
  m(F4, 'reveal-scratch-cleared', 'scratch-reveal panel partly cleared, matched geometry, still no text'),
  m(F4, 'reveal-silhouette-frame', 'shadow / silhouette presentation frame'),
  m(F4, 'reveal-peek-window-shut', 'peek window shutter shut'),
  m(F4, 'reveal-peek-window-open', 'peek window open, matched geometry'),
  m(F4, 'reveal-shadow-present-frame', 'shadow presentation frame for mystery objects'),

  // --- F5 foreground: full BGs exist; modular edges and neutral stages do not ---
  have(F5, 'full-backgrounds', '08_backgrounds scenes + flats', 'do not generate new full backgrounds'),
  have(F5, 'season-banners', 'season-spring/summer/autumn/winter', 'season frames exist; not modular foreground edges'),
  have(F5, 'dollhouse-curtains', 'dh-window-curtains / house-curtains', 'topic curtains, not a reusable curtain-edge overlay'),
  have(F5, 'circus-podium', 'circus-podium', 'topic podium; still want a NEUTRAL podium'),
  have(F5, 'hero-easel-stage', 'hero-easel', 'easel hero exists'),
  have(F5, 'hero-dock-plank', 'hero-dock-plank', 'one dock plank exists; not a full edge kit'),
  have(F5, 'h2-kitchen-wardrobe-lostfound-suitcase', 'H2 stage surfaces', 'already harvested'),
  m(F5, 'fg-grass-edge', 'modular grass foreground edge, tileable-ish ends, black field cutout'),
  m(F5, 'fg-flower-edge', 'flower bed foreground edge'),
  m(F5, 'fg-bush-foreground', 'bush foreground occlusion layer'),
  m(F5, 'fg-rock-edge', 'rock / stone foreground edge'),
  m(F5, 'fg-water-rim', 'water rim / shoreline edge'),
  m(F5, 'fg-sand-edge', 'sand edge / dune lip'),
  m(F5, 'fg-snowbank', 'snowbank foreground'),
  m(F5, 'fg-canopy-corner', 'branch / canopy corner overlay'),
  m(F5, 'fg-puddle-edge', 'puddle edge on ground'),
  m(F5, 'fg-reed-edge', 'reed / tall grass edge'),
  m(F5, 'fg-tree-trunk-side', 'tree trunk side occlusion'),
  m(F5, 'fg-fence-edge', 'fence edge foreground'),
  m(F5, 'fg-path-edge', 'garden path edge'),
  m(F5, 'fg-road-edge', 'road edge / curb'),
  m(F5, 'fg-sidewalk-edge', 'sidewalk edge'),
  m(F5, 'fg-desk-edge', 'desk edge in foreground'),
  m(F5, 'fg-counter-edge', 'counter edge'),
  m(F5, 'fg-shelf-edge', 'shelf edge'),
  m(F5, 'fg-windowsill', 'windowsill / window frame edge'),
  m(F5, 'fg-doorway-frame', 'doorway frame occlusion, empty opening, no room labels'),
  m(F5, 'fg-curtain-edge', 'curtain edge drape, not a full hide-curtain hero'),
  m(F5, 'fg-stage-lip', 'stage lip / apron edge'),
  m(F5, 'fg-crowd-silhouette', 'audience / crowd silhouette, small, no faces readable as portraits'),
  m(F5, 'surf-rug', 'neutral illustrated rug surface, empty'),
  m(F5, 'surf-round-rug', 'neutral round rug'),
  m(F5, 'surf-mat', 'neutral floor mat'),
  m(F5, 'surf-classroom-mat', 'neutral classroom sit mat'),
  m(F5, 'surf-low-platform', 'neutral low stage / platform'),
  m(F5, 'surf-work-table', 'neutral work table surface, empty'),
  m(F5, 'surf-neutral-podium', 'neutral podium, not circus-themed'),
  m(F5, 'surf-neutral-shelf', 'neutral display shelf, empty'),
  m(F5, 'surf-path-strip', 'neutral path strip'),
  m(F5, 'surf-display-board', 'neutral display surface / pinboard, blank, no text'),
  m(F5, 'surf-low-bench', 'neutral low bench / sit surface'),
  m(F5, 'fg-flower-corner', 'flower corner accent, modular'),
  m(F5, 'fg-bush-left', 'bush left-end modular piece'),
  m(F5, 'fg-grass-left-end', 'grass edge left tileable end'),
  m(F5, 'fg-grass-right-end', 'grass edge right tileable end'),

  // --- F6 atmosphere: H3 atoms exist; field overlays do not ---
  have(F6, 'h3-rain-atom', 'overlay-rain-cloud-puddle', 'compact rain+puddle atom exists; field rain overlay still useful'),
  have(F6, 'h3-snow-atom', 'overlay-snow-cold-wind', 'compact snow/wind atom exists'),
  have(F6, 'h3-night-atom', 'overlay-night-dim-window', 'night window cue exists; field night veil still useful'),
  have(F6, 'h3-celebration', 'overlay-celebration-bunting-confetti', 'celebration overlay exists'),
  have(F6, 'h3-busy-crowd', 'overlay-busy-crowd-small', 'busy crowd overlay exists'),
  low(F6, 'photoreal-weather', 'photoreal / glossy weather rejected'),
  m(F6, 'atmo-rain-light', 'light rain field overlay, sparse drops, no full background'),
  m(F6, 'atmo-rain-heavy', 'heavy rain field overlay, denser, still does not obscure a board target'),
  m(F6, 'atmo-snow-light', 'light snow field overlay'),
  m(F6, 'atmo-snow-heavy', 'heavier snow field overlay, still readable'),
  m(F6, 'atmo-mist-fog', 'mist / fog field overlay, low density'),
  m(F6, 'atmo-wind-gust', 'wind gust streaks, overlay atom'),
  m(F6, 'atmo-sun-rays', 'sun rays overlay, house-style flat, not glossy'),
  m(F6, 'atmo-cloudy-dim', 'cloudy / dim overlay wash, sparse clouds'),
  m(F6, 'atmo-night-veil', 'night veil / dim field, not a full night background'),
  m(F6, 'atmo-sunset-wash', 'warm sunset treatment overlay, restrained'),
  m(F6, 'atmo-falling-leaves', 'falling leaves overlay, few leaves'),
  m(F6, 'atmo-drifting-cloud', 'drifting cloud layer piece'),
  m(F6, 'atmo-ambient-stars', 'small ambient stars, sparse'),
  m(F6, 'atmo-puddle-sheen', 'ground puddle sheen overlay'),
  m(F6, 'atmo-heat-shimmer', 'heat shimmer stylization overlay'),
  m(F6, 'atmo-soft-haze', 'quiet / soft ambience haze'),

  // --- F7 carriers ---
  have(F7, 'generic-speech-bubble', 'speech-bubble', 'one generic bubble exists; illustrated tails still missing'),
  have(F7, 'castle-banner-blank', 'castle-banner-blank / cas-banner', 'themed castle banner exists'),
  have(F7, 'castle-scroll-blank', 'castle-scroll-blank', 'themed scroll exists'),
  have(F7, 'clipboard-objects', 'clipboard / sch-clipboard / post-clipboard', 'clipboards exist'),
  have(F7, 'sticky-note', 'sticky-note', 'sticky note exists'),
  have(F7, 'hero-easel', 'hero-easel / hobby-easel', 'easel exists'),
  have(F7, 'party-pennant', 'party-pennant-banner', 'party pennant exists'),
  have(F7, 'circus-banner', 'circus-banner', 'circus banner exists'),
  code(F7, 'plain-rounded-rect', 'plain rounded rectangle is code'),
  code(F7, 'plain-speech-geometry', 'generic plain speech bubble geometry is code'),
  m(F7, 'carrier-speech-tail-left', 'illustrated speech bubble with tail left, blank, irregular/characterful'),
  m(F7, 'carrier-speech-tail-right', 'illustrated speech bubble with tail right, blank'),
  m(F7, 'carrier-speech-tail-down', 'illustrated speech bubble with tail down, blank'),
  m(F7, 'carrier-thought-bubble', 'illustrated thought bubble, blank'),
  m(F7, 'carrier-speech-shout', 'illustrated shout burst bubble, blank, no letters'),
  m(F7, 'carrier-whisper-cloud', 'soft whisper cloud carrier, blank'),
  m(F7, 'carrier-ribbon-banner', 'ribbon / banner carrier, blank, not castle-themed'),
  m(F7, 'carrier-wooden-sign', 'wooden sign shell, blank, no writing'),
  m(F7, 'carrier-road-sign-shell', 'road / direction sign shell, blank, no arrows-as-text, no words'),
  m(F7, 'carrier-torn-paper-note', 'torn-paper note carrier, blank'),
  m(F7, 'carrier-name-tag', 'name-tag shape, blank'),
  m(F7, 'carrier-ticket-blank', 'illustrated ticket carrier, blank, no numbers'),
  m(F7, 'carrier-file-card', 'file card / index card illustrated carrier, blank'),
  m(F7, 'carrier-card-back', 'illustrated card back, no pip numbers or words'),
  m(F7, 'carrier-framed-display', 'framed display surface, blank interior'),
  m(F7, 'carrier-folded-note', 'folded note carrier, blank'),
  m(F7, 'carrier-chalkboard-mini', 'small illustrated chalkboard, blank'),
  m(F7, 'carrier-hanging-tag', 'hanging tag / luggage-style tag, blank'),

  // --- F8 transformation: ordinary pairs already banked ---
  have(F8, 'prea1-open-closed', 'prea1-rel-open / closed', 'relation tokens exist'),
  have(F8, 'prea1-full-empty', 'prea1-rel-full / empty', 'relation tokens exist'),
  have(F8, 'prea1-clean-dirty', 'prea1-rel-clean / dirty', 'relation tokens exist'),
  have(F8, 'prea1-wet-dry', 'prea1-rel-wet / dry', 'relation tokens exist'),
  have(F8, 'prea1-broken-fixed', 'prea1-rel-broken / fixed', 'relation tokens exist'),
  have(F8, 'prea1-hot-cold', 'prea1-rel-hot / cold', 'relation tokens exist'),
  have(F8, 'hero-open-closed', '750 hero open/closed variants', 'do not duplicate ordinary container states'),
  have(F8, 'h5-lamp-bag-plug', 'state-light-on-off-lamp / packed-unpacked-bag / plugged-unplugged-device', 'H5 pairs exist'),
  m(F8, 'xform-seed', 'same plant identity: seed state'),
  m(F8, 'xform-sprout', 'same plant identity: sprout state, matched geometry'),
  m(F8, 'xform-plant', 'same plant identity: small plant state'),
  m(F8, 'xform-folded-paper', 'same paper: folded'),
  m(F8, 'xform-unfolded-paper', 'same paper: unfolded, matched'),
  m(F8, 'xform-parts-pile', 'same toy: separate parts pile'),
  m(F8, 'xform-partial-build', 'same toy: partially assembled'),
  m(F8, 'xform-complete-toy', 'same toy: complete'),
  m(F8, 'xform-paints-separate', 'two paint blobs separate'),
  m(F8, 'xform-paints-mixed', 'same paints mixed, matched bowls'),
  m(F8, 'xform-ice-cube', 'ice cube intact'),
  m(F8, 'xform-ice-melting', 'same ice melting'),
  m(F8, 'xform-ice-puddle', 'same ice fully melted puddle'),
  m(F8, 'xform-balloon-inflated', 'balloon inflated'),
  m(F8, 'xform-balloon-flat', 'same balloon flat'),
  m(F8, 'xform-desk-organized', 'small desk organized'),
  m(F8, 'xform-desk-messy', 'same desk messy, matched'),
  m(F8, 'xform-dough', 'bread dough ball'),
  m(F8, 'xform-bread-baked', 'same dough baked as a loaf'),
  m(F8, 'xform-leaf-green', 'leaf green'),
  m(F8, 'xform-leaf-autumn', 'same leaf autumn colour'),
  m(F8, 'xform-leaf-fallen', 'same leaf fallen / dry'),
  m(F8, 'xform-candle-new', 'candle new / unlit'),
  m(F8, 'xform-candle-burning', 'same candle burning'),
  m(F8, 'xform-candle-stub', 'same candle burned down stub'),

  // --- F9 sort / journey ---
  have(F9, 'baskets-chests-suitcases', 'hero-basket / hide-chest / H2 packing suitcase / many trays', 'do not generate more containers'),
  have(F9, 'a1-sequence-docks', 'a1-seq-2-frame-dock stockpile', 'A1 sequence docks exist raw; still want a reusable illustrated track'),
  have(F9, 'balance-beam', 'hero-balance-beam', 'one beam exists'),
  code(F9, 'plain-venn', 'plain Venn diagrams are code'),
  code(F9, 'plain-tchart', 'plain T-charts are code'),
  code(F9, 'generic-timeline', 'generic timelines are code'),
  code(F9, 'plain-number-line', 'plain number lines are code'),
  code(F9, 'generic-grids', 'generic grids are code'),
  m(F9, 'sort-mat-2zone', 'illustrated 2-zone sorting mat, empty zones, not a plain rectangle split'),
  m(F9, 'sort-mat-3zone', 'illustrated 3-zone sorting mat, empty'),
  m(F9, 'journey-path-track', 'journey / path track surface, empty'),
  m(F9, 'journey-stepping-stones', 'stepping-stone path, empty stones'),
  m(F9, 'journey-route-board', 'route board surface with illustrated path, no map text'),
  m(F9, 'seq-track-3step', '3-step sequence track, empty pads'),
  m(F9, 'seq-track-4step', '4-step sequence track, empty pads, matched style'),
  m(F9, 'ladder-progress', 'ladder / progression surface, empty rungs, no numbers'),
  m(F9, 'compare-two-platforms', 'two compare platforms side by side, empty'),
  m(F9, 'compare-three-platforms', 'three compare platforms, empty'),
  m(F9, 'habitat-land-water', 'illustrated land vs water category habitats, empty'),
  m(F9, 'process-trail', 'process trail surface, illustrated stepping pads, no words'),
  m(F9, 'before-after-stage', 'before / after staging surface, two empty stages, no labels'),
  m(F9, 'journey-bridge-path', 'illustrated bridge path connector'),
  m(F9, 'sort-habitat-mat', 'illustrated category habitat mat, two habitats, empty'),
  m(F9, 'seq-stepping-dots', 'illustrated stepping-dot sequence, not a generic dotted UI line'),

  // --- F10 feedback: keep small ---
  have(F10, 'found-sparkle', 'overlay-found-item-sparkle', 'found success sparkle exists'),
  have(F10, 'celebration-overlay', 'overlay-celebration-bunting-confetti', 'celebration overlay exists'),
  have(F10, 'party-confetti', 'party-confetti', 'party object exists'),
  have(F10, 'star-svg', '04_decoration-ui/star.svg', 'tiny SVG star exists; still want a board-scale token'),
  low(F10, 'badge-economy', 'hundreds of badges / currencies rejected'),
  low(F10, 'punitive-failure', 'red explosion / shaming faces rejected'),
  low(F10, 'baked-great', 'baked-in Great! text rejected'),
  m(F10, 'fb-success-burst-gentle', 'gentle success burst, no text'),
  m(F10, 'fb-confetti-small', 'small confetti burst, overlay'),
  m(F10, 'fb-soft-halo', 'soft encouraging halo'),
  m(F10, 'fb-encourage-sparkle', 'encouraging sparkle, small'),
  m(F10, 'fb-near-miss-wobble', 'near-miss wobble marks, not punitive'),
  m(F10, 'fb-repair-patch', 'repair patch / bandage-on-object cue, kind'),
  m(F10, 'fb-retry-cue', 'retry cue, circular try-again gesture, no words'),
  m(F10, 'fb-group-success', 'group-success effect, small shared glow'),
  m(F10, 'fb-highfive-cloud', 'high-five cloud / teamwork puff, no faces required'),
  m(F10, 'fb-star-token', 'small star token'),
  m(F10, 'fb-seal-neutral', 'neutral achievement seal, no text, no rank'),
  m(F10, 'fb-token-circle', 'reusable collection token circle, blank'),
  m(F10, 'fb-token-star', 'reusable collection token star'),
  m(F10, 'fb-token-heart', 'reusable collection token heart, not a currency'),
  m(F10, 'fb-almost-glow', 'almost / near-success glow'),
  m(F10, 'fb-try-loop', 'try-again loop arrow illustrated, not a generic UI icon'),

  // local transform is a separate system, recorded here so counts stay honest
  local('derivatives', 'silhouette-lineart-high-demand', 'derive silhouette + line-art from top demand existing objects; not Manus'),

  // P1 hold — classify only
  p1('storytelling-visual-grammar', 'story-beat-markers', 'P1: storytelling visual grammar'),
  p1('reaction-emotion-overlays', 'emotion-overlays', 'P1: reaction/emotion overlays'),
  p1('discourse-choreography', 'participation-markers', 'P1: discourse/participation choreography'),
  p1('answer-history', 'consequence-markers', 'P1: answer-history / consequence markers'),
  p1('voice-listening-cues', 'pronunciation-expression', 'P1: voice/listening/pronunciation cues'),
  p1('connector-glue', 'rope-footprints-dotted-trails', 'P1: illustrated connector glue'),
  p1('thematic-micro-kits', 'three-pilot-skins', 'P1/strategy: 3 thin thematic kits only, do not manufacture now'),
  p1('representation-variants', 'extra-representation-variants', 'P1: additional representation variants'),
];

export const MANUS_WORTHY = CANDIDATES.filter((c) => c.classification === 'MANUS_WORTHY');

const F1_CELLS = MANUS_WORTHY.filter((c) => c.family === F1);
const F2_CELLS = MANUS_WORTHY.filter((c) => c.family === F2);
const F3_CELLS = MANUS_WORTHY.filter((c) => c.family === F3);
const F4_CELLS = MANUS_WORTHY.filter((c) => c.family === F4);
const F5_CELLS = MANUS_WORTHY.filter((c) => c.family === F5);
const F6_CELLS = MANUS_WORTHY.filter((c) => c.family === F6);
const F7_CELLS = MANUS_WORTHY.filter((c) => c.family === F7);
const F8_CELLS = MANUS_WORTHY.filter((c) => c.family === F8);
const F9_CELLS = MANUS_WORTHY.filter((c) => c.family === F9);
const F10_CELLS = MANUS_WORTHY.filter((c) => c.family === F10);

function take(arr, start, n) {
  return arr.slice(start, start + n);
}

export const WAVES = {
  vg1: {
    id: 'vg1-p0-core',
    title: 'Visual grammar VG1 comics + affordances + attention + reveal + foreground',
    family: 'visual-grammar-p0-core',
    families: [F1, F2, F3, F4, F5],
    style: `${STYLE}
FAMILY MIX: comics action overlays, illustrated interaction affordances, attention devices, mystery reveal devices, and modular foreground / neutral surfaces.
PEOPLE LOCK: pointing hands and peeking eyes only — no full cast portraits, no white clothing cards. Draw directly on #000000 black.`,
    sheets: [
      sh('S1', 'comics 3x4 A', 'black-contact-3x4', take(F1_CELLS, 0, 12)),
      sh('S2', 'comics 3x4 B', 'black-contact-3x4', take(F1_CELLS, 12, 12)),
      sh('S3', 'comics 3x4 C', 'black-contact-3x4', take(F1_CELLS, 24, 12)),
      sh('S4', 'affordances 3x5 A', 'black-contact-3x5', take(F2_CELLS, 0, 15)),
      sh('S5', 'affordances 3x5 B', 'black-contact-3x5', take(F2_CELLS, 15, 15)),
      sh('S6', 'attention 4x5', 'black-contact-4x5', F3_CELLS),
      sh('S7', 'reveal 3x3 A', 'black-contact-3x3', take(F4_CELLS, 0, 9)),
      sh('S8', 'reveal 3x3 B', 'black-contact-3x3', take(F4_CELLS, 9, 9)),
      sh('S9', 'foreground 4x4 A', 'black-contact-4x4', take(F5_CELLS, 0, 16)),
      sh('S10', 'foreground 4x4 B', 'black-contact-4x4', take(F5_CELLS, 16, 16)),
      sh('S11', 'foreground 2x3 C', 'black-contact-2x3', take(F5_CELLS, 32, 6)),
    ],
  },
  vg2: {
    id: 'vg2-p0-stagecraft',
    title: 'Visual grammar VG2 atmosphere + carriers + transform + journey + feedback',
    family: 'visual-grammar-p0-stagecraft',
    families: [F6, F7, F8, F9, F10],
    style: `${STYLE}
FAMILY MIX: weather/atmosphere field overlays, illustrated text carriers, transformation state sequences, sort/journey surfaces, and a SMALL feedback set.
TRANSFORM LOCK: seed/sprout/plant, ice melt, toy assembly, leaf, and candle families must keep one recognizable object across states.`,
    sheets: [
      sh('S1', 'atmosphere 4x4', 'black-contact-4x4', F6_CELLS),
      sh('S2', 'carriers 3x3 A', 'black-contact-3x3', take(F7_CELLS, 0, 9)),
      sh('S3', 'carriers 3x3 B', 'black-contact-3x3', take(F7_CELLS, 9, 9)),
      sh('S4', 'transform 4x4 A', 'black-contact-4x4', take(F8_CELLS, 0, 16)),
      sh('S5', 'transform 3x3 B', 'black-contact-3x3', take(F8_CELLS, 16, 9)),
      sh('S6', 'journey 4x4', 'black-contact-4x4', F9_CELLS),
      sh('S7', 'feedback 4x4', 'black-contact-4x4', F10_CELLS),
    ],
  },
  mop: {
    id: 'vg-mop-false-safety',
    title: 'Visual grammar mop: cloth drape + curtain edge',
    family: 'visual-grammar-mop',
    families: [F4, F5],
    style: `${STYLE}
FAMILY: two leftover overlay/edge atoms that were accidentally omitted from VG1. Same house style. Draw directly on #000000 black.`,
    sheets: [
      sh('S1', 'mop 1x2', 'black-contact-1x2', [
        F4_CELLS.find((c) => c.key === 'reveal-mystery-cloth-draped'),
        F5_CELLS.find((c) => c.key === 'fg-curtain-edge'),
      ].filter(Boolean)),
    ],
  },
};

export const WAVE_ORDER = ['vg1', 'vg2', 'mop'];

export const THEME_KITS_FUTURE = [
  {
    id: 'kit-discovery-mystery',
    why: 'Maps to hide/reveal, search beams, peek windows, clue sparkles already in this harvest.',
    thin: ['one mystery stage/surface', 'clue sparkle accent', 'one reveal cloth/peek', 'one token', 'one small effect'],
  },
  {
    id: 'kit-journey-expedition',
    why: 'Maps to path tracks, stepping stones, route boards, sequence tracks.',
    thin: ['one path/stage', 'trail accent', 'one map-reveal element', 'one trail marker', 'one small dust/wind effect'],
  },
  {
    id: 'kit-studio-workshop',
    why: 'Maps to build sockets, assembly connectors, work table, parts→complete transforms.',
    thin: ['one work surface', 'socket/peg accents', 'one cloth/cover', 'one workshop token', 'one small spark/poof'],
  },
];

export function classificationCounts() {
  const by = {};
  for (const c of CANDIDATES) {
    by[c.classification] = (by[c.classification] || 0) + 1;
  }
  const perFamily = {};
  for (const c of CANDIDATES) {
    if (c.classification === 'P1_HOLD' || c.family === 'derivatives') continue;
    if (!perFamily[c.family]) {
      perFamily[c.family] = {
        candidate: 0,
        HAVE_ENOUGH: 0,
        MANUS_WORTHY: 0,
        LOCAL_TRANSFORM: 0,
        CODE_LATER: 0,
        LOW_VALUE: 0,
      };
    }
    perFamily[c.family].candidate += 1;
    if (perFamily[c.family][c.classification] != null) perFamily[c.family][c.classification] += 1;
  }
  return {
    considered: CANDIDATES.filter((c) => c.classification !== 'P1_HOLD' && c.family !== 'derivatives').length,
    HAVE_ENOUGH: by.HAVE_ENOUGH || 0,
    MANUS_WORTHY: by.MANUS_WORTHY || 0,
    LOCAL_TRANSFORM: by.LOCAL_TRANSFORM || 0,
    CODE_LATER: by.CODE_LATER || 0,
    LOW_VALUE: by.LOW_VALUE || 0,
    P1_HOLD: by.P1_HOLD || 0,
    perFamily,
    sheetCount: WAVE_ORDER.reduce((n, k) => n + WAVES[k].sheets.length, 0),
  };
}

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

export function assertWaveIntegrity() {
  const problems = [];
  if (F1_CELLS.length !== 36) problems.push(`F1 ${F1_CELLS.length} != 36`);
  if (F2_CELLS.length !== 30) problems.push(`F2 ${F2_CELLS.length} != 30`);
  if (F3_CELLS.length !== 20) problems.push(`F3 ${F3_CELLS.length} != 20`);
  if (F4_CELLS.length !== 18) problems.push(`F4 ${F4_CELLS.length} != 18`);
  if (F5_CELLS.length !== 38) problems.push(`F5 ${F5_CELLS.length} != 38`);
  if (F6_CELLS.length !== 16) problems.push(`F6 ${F6_CELLS.length} != 16`);
  if (F7_CELLS.length !== 18) problems.push(`F7 ${F7_CELLS.length} != 18`);
  if (F8_CELLS.length !== 25) problems.push(`F8 ${F8_CELLS.length} != 25`);
  if (F9_CELLS.length !== 16) problems.push(`F9 ${F9_CELLS.length} != 16`);
  if (F10_CELLS.length !== 16) problems.push(`F10 ${F10_CELLS.length} != 16`);
  if (WAVES.vg1.sheets.length !== 11) problems.push(`vg1 sheets ${WAVES.vg1.sheets.length} != 11`);
  if (WAVES.vg2.sheets.length !== 7) problems.push(`vg2 sheets ${WAVES.vg2.sheets.length} != 7`);
  if (WAVES.mop.sheets.length !== 1) problems.push(`mop sheets ${WAVES.mop.sheets.length} != 1`);
  if (WAVES.mop.sheets[0].cells.length !== 2) problems.push(`mop cells ${WAVES.mop.sheets[0].cells.length} != 2`);
  const vg1Cells = WAVES.vg1.sheets.reduce((n, s) => n + s.cells.length, 0);
  const vg2Cells = WAVES.vg2.sheets.reduce((n, s) => n + s.cells.length, 0);
  if (vg1Cells !== 142) problems.push(`vg1 cells ${vg1Cells} != 142`);
  if (vg2Cells !== 91) problems.push(`vg2 cells ${vg2Cells} != 91`);
  if (MANUS_WORTHY.length !== 233) problems.push(`MANUS_WORTHY ${MANUS_WORTHY.length} != 233`);
  if (problems.length) throw new Error(`visual-grammar key integrity: ${problems.join('; ')}`);
}

export function writeClassificationLedger() {
  assertWaveIntegrity();
  const counts = classificationCounts();
  const dest = path.join(ROOT, TRACKED_INV_REL);
  const pileInv = path.join(ROOT, STOCKPILE_REL, 'inventory.json');
  let existing = {};
  for (const p of [pileInv, dest]) {
    if (fs.existsSync(p)) {
      try {
        existing = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch {
        existing = {};
      }
    }
  }
  const payload = {
    spec: 'visual-grammar-stockpile',
    updated_at: new Date().toISOString(),
    no_wiring: true,
    durable_root: STOCKPILE_REL,
    derived_root: DERIVED_REL,
    counts,
    theme_kits_future: THEME_KITS_FUTURE,
    p1_hold: CANDIDATES.filter((c) => c.classification === 'P1_HOLD'),
    have_enough: CANDIDATES.filter((c) => c.classification === 'HAVE_ENOUGH'),
    code_later: CANDIDATES.filter((c) => c.classification === 'CODE_LATER'),
    low_value: CANDIDATES.filter((c) => c.classification === 'LOW_VALUE'),
    manus_worthy: MANUS_WORTHY.map((c) => ({ key: c.key, family: c.family, brief: c.brief })),
    waves: existing.waves || {},
    running_total: existing.running_total || null,
  };
  const waveMeta = Object.fromEntries(
    WAVE_ORDER.map((k) => [
      WAVES[k].id,
      {
        title: WAVES[k].title,
        expected_sheets: WAVES[k].sheets.length,
        concept_count: WAVES[k].sheets.reduce((n, s) => n + s.cells.length, 0),
        sheets: WAVES[k].sheets.map((s) => ({
          id: s.id,
          title: s.title,
          format: s.format,
          keys: s.cells.map((c) => c.key),
        })),
      },
    ]),
  );
  payload.wave_plan = waveMeta;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(payload, null, 2));
  fs.mkdirSync(path.join(ROOT, STOCKPILE_REL), { recursive: true });
  fs.writeFileSync(pileInv, JSON.stringify(payload, null, 2));
  return dest;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  assertWaveIntegrity();
  const dest = writeClassificationLedger();
  console.log(JSON.stringify({ ok: true, ledger: dest, ...classificationCounts() }, null, 2));
}
