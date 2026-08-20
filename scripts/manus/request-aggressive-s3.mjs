/**
 * Aggressive stockpile PACK 3 — peek crops (D) + modular env pieces (I).
 * Stockpile only. No PropBank merge, producer, recipes, or renderer wiring.
 *
 *   node scripts/manus/request-aggressive-s3.mjs --wave=d1 --fire
 *   node scripts/manus/request-aggressive-s3.mjs --wave=i1 --fire
 *   node scripts/manus/request-aggressive-s3.mjs --wave=d1 --poll-only
 *
 * Partition: harvested/manus-aggressive-stockpile/s3-peek-env/
 * Prefix: aggressive-s3-
 * SAFETY_SKIP: word-boundary only (do not substring-skip "drape").
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

export const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s3-peek-env';
export const TRACKED_DOC_REL = 'docs/aggressive-stockpile-s3.md';
export const PREFIX = 'aggressive-s3-';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
/** User lock: poll 30–45s. Do not hammer Manus. */
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

function isRateLimitError(err) {
  const msg = String(err && err.message ? err.message : err);
  return /\b429\b/.test(msg) || /rate limit/i.test(msg) || /resource_exhausted/i.test(msg);
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    const wait = RATE_WAIT_MS;
    console.error(`429 — waiting ${wait / 1000}s then one retry`);
    await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } catch (err2) {
      if (!isRateLimitError(err2)) throw err2;
      const wait2 = wait * 2;
      console.error(`429 again — backing off ${wait2 / 1000}s, not firing more`);
      await new Promise((r) => setTimeout(r, wait2));
      throw err2;
    }
  }
}

function otherInFlight(thisWaveId) {
  if (!fs.existsSync(STOCKPILE)) return null;
  for (const ent of fs.readdirSync(STOCKPILE, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const runPath = path.join(STOCKPILE, ent.name, 'run.json');
    if (!fs.existsSync(runPath)) continue;
    let prev;
    try {
      prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    } catch {
      continue;
    }
    if (prev.task_id && !prev.finished_at && prev.wave !== thisWaveId) {
      return { wave: prev.wave, task_id: prev.task_id };
    }
  }
  return null;
}

export const SAFETY_SKIP_KEYS = new Set([
  'rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun',
]);

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const cell of cells) {
    const hay = String(cell.key || '').toLowerCase();
    const hit = [...SAFETY_SKIP_KEYS].find((deny) =>
      new RegExp(`(^|[^a-z0-9])${deny}([^a-z0-9]|$)`).test(hay),
    );
    if (hit) skipped.push({ key: cell.key, deny: hit });
    else kept.push(cell);
  }
  return { kept, skipped };
}

function cell(stream, slug, brief) {
  return {
    key: `${PREFIX}${slug}`,
    concept: slug,
    stream,
    family: stream === 'D' ? 'peek-crop' : 'modular-env',
    brief,
  };
}

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, padding.
TEXT LOCK: BLANK only. No letters, numbers, logos, signs, watermarks, fake writing.
BLACK FIELD LOCK: pure #000000 edge-to-edge, one cutout per cell, clear gutters, nothing crossing cells.
QUALITY: default only.
STOCKPILE: modular pieces kids can compose later. NOT complete scenes, NOT cinematic wallpaper, NOT busy story illustrations, NOT VG overlay grammar.`;

const DEDUPE = `DO NOT CLONE (already harvested):
- Visual-grammar reveal devices: torn paper, fog/cloud wipe, keyhole portal, scratch panel, peel-back corner, mystery-cloth overlay, silhouette FRAME, peek-WINDOW shutter pair, curtain-edge overlay, crowd silhouette overlay.
- Hide/reveal container pairs (chest/box/curtain closed-open heroes).
- Long-tail civic STAGES: bakery, barbershop, pharmacy, marina, laundromat, hardware, ferry, florist, recycling center, marketplace as full shops.
- Full story-env strips (classroom, home, airport counter, train platform, bus interior).
- Whole hero-door / hero-window / cafe-counter as already-banked heroes.

MAKE instead: NEW object PEEKS (crop of a high-demand thing) and NEW architecture SECTIONS (doorway/window/path/fence/stall/hedge pieces with empty play space).`;

/** Wave D1 — 5× 4×4 peek sheets (80). High-demand object crops. */
const D1_SHEETS = [
  {
    id: 'S1',
    title: 'peek tails-out 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-tail-out', 'cat tail only, rest of cat off-frame left, isolated on black'),
      cell('D', 'peek-dog-tail-out', 'dog tail only, body off-frame, isolated on black'),
      cell('D', 'peek-fox-tail-out', 'fox tail crop, body off-frame'),
      cell('D', 'peek-mouse-tail-out', 'mouse tail crop, body off-frame'),
      cell('D', 'peek-fish-tail-out', 'fish tail / caudal fin crop, body off-frame'),
      cell('D', 'peek-bird-tail-feathers', 'bird tail feathers crop, body off-frame'),
      cell('D', 'peek-horse-tail-out', 'horse tail crop, body off-frame'),
      cell('D', 'peek-rabbit-tail-puff', 'rabbit puff tail crop, body off-frame'),
      cell('D', 'peek-squirrel-tail-out', 'squirrel tail crop, body off-frame'),
      cell('D', 'peek-pig-tail-curl', 'curly pig tail crop, body off-frame'),
      cell('D', 'peek-cow-tail-out', 'cow tail crop, body off-frame'),
      cell('D', 'peek-lizard-tail-out', 'lizard tail crop, body off-frame'),
      cell('D', 'peek-whale-fluke-out', 'whale fluke crop, body off-frame'),
      cell('D', 'peek-peacock-tail-fan-crop', 'partial peacock tail fan crop, not a full bird'),
      cell('D', 'peek-monkey-tail-out', 'monkey tail crop, body off-frame'),
      cell('D', 'peek-sheep-tail-out', 'sheep tail crop, woolly body off-frame'),
    ],
  },
  {
    id: 'S2',
    title: 'peek handles-out 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-mug-handle-out', 'mug handle only sticking into frame, mug body mostly off-frame'),
      cell('D', 'peek-teapot-handle-out', 'teapot handle crop, body off-frame'),
      cell('D', 'peek-saucepan-handle-out', 'saucepan handle crop, pan mostly off-frame'),
      cell('D', 'peek-frying-pan-handle-out', 'frying-pan handle crop'),
      cell('D', 'peek-suitcase-handle-out', 'suitcase telescoping handle crop, case off-frame'),
      cell('D', 'peek-umbrella-handle-out', 'umbrella J-handle crop, canopy off-frame'),
      cell('D', 'peek-basket-handle-out', 'wicker basket handle crop'),
      cell('D', 'peek-bucket-handle-out', 'bucket wire handle crop'),
      cell('D', 'peek-briefcase-handle-out', 'briefcase handle crop'),
      cell('D', 'peek-watering-can-handle-out', 'watering-can handle crop'),
      cell('D', 'peek-shopping-bag-handles-out', 'shopping-bag loop handles crop, bag body mostly off-frame'),
      cell('D', 'peek-jug-handle-out', 'pitcher/jug handle crop'),
      cell('D', 'peek-drawer-pull-out', 'drawer pull/knob crop, drawer face mostly off-frame'),
      cell('D', 'peek-paintbrush-handle-out', 'paintbrush handle crop, bristles off-frame'),
      cell('D', 'peek-racket-handle-out', 'tennis racket grip crop, head off-frame'),
      cell('D', 'peek-ladle-handle-out', 'soup ladle handle crop, bowl off-frame'),
    ],
  },
  {
    id: 'S3',
    title: 'peek object-in-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-apple-in-bag', 'paper bag with apple top peeking out, isolated'),
      cell('D', 'peek-book-in-bag', 'tote bag with blank book spine peeking, no letters'),
      cell('D', 'peek-ball-in-bag', 'sports ball peeking from open bag'),
      cell('D', 'peek-banana-in-bag', 'banana curve peeking from grocery bag'),
      cell('D', 'peek-carrot-in-bag', 'carrot tops peeking from bag'),
      cell('D', 'peek-bread-in-bag', 'loaf end peeking from paper bag'),
      cell('D', 'peek-teddy-in-bag', 'teddy ear/head peeking from tote, no face portrait close-up'),
      cell('D', 'peek-hat-in-bag', 'hat brim peeking from bag'),
      cell('D', 'peek-orange-in-bag', 'orange peeking from mesh/produce bag'),
      cell('D', 'peek-flower-in-bag', 'flower bloom peeking from paper cone/bag'),
      cell('D', 'peek-shoe-in-box', 'shoebox ajar with shoe toe peeking, no logos'),
      cell('D', 'peek-cookie-in-tin', 'tin lid ajar, cookie edge peeking'),
      cell('D', 'peek-block-in-bucket', 'toy block peeking from bucket'),
      cell('D', 'peek-sock-in-drawer', 'sock cuff peeking from open drawer'),
      cell('D', 'peek-pencil-in-case', 'pencil tip peeking from pencil case, no letters'),
      cell('D', 'peek-umbrella-in-stand', 'umbrella handle peeking from stand cup'),
    ],
  },
  {
    id: 'S4',
    title: 'peek behind-hide 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-paw-under-curtain', 'cat paw only from under a curtain hem, not a VG curtain overlay'),
      cell('D', 'peek-dog-nose-behind-door', 'dog nose/muzzle peeking around a door edge'),
      cell('D', 'peek-gift-corner-behind-curtain', 'wrapped gift corner peeking beside a drape'),
      cell('D', 'peek-ball-lump-under-blanket', 'round lump under blanket implying a hidden ball'),
      cell('D', 'peek-shoe-under-bed-skirt', 'shoe toe under bed skirt'),
      cell('D', 'peek-backpack-strap-behind-wall', 'backpack strap peeking past a wall edge'),
      cell('D', 'peek-bike-wheel-behind-fence', 'bicycle wheel crop behind fence slats'),
      cell('D', 'peek-balloon-behind-curtain', 'balloon top peeking above a curtain rail'),
      cell('D', 'peek-guitar-neck-behind-door', 'guitar neck peeking from behind a door'),
      cell('D', 'peek-plant-behind-curtain', 'leafy plant peeking beside a drape'),
      cell('D', 'peek-ladder-behind-wall', 'ladder rails peeking past a wall'),
      cell('D', 'peek-wagon-behind-hedge', 'wagon wheel peeking from behind a hedge section'),
      cell('D', 'peek-scooter-bar-behind-door', 'scooter handlebar peeking around a door'),
      cell('D', 'peek-lamp-behind-curtain', 'lamp shade peeking beside a drape'),
      cell('D', 'peek-kite-behind-tree', 'kite corner peeking from behind a tree trunk'),
      cell('D', 'peek-box-behind-sofa-arm', 'cardboard box corner behind a sofa arm'),
    ],
  },
  {
    id: 'S5',
    title: 'peek closeup-silhouette 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-apple-closeup-crop', 'tight apple crop, part of fruit off-frame'),
      cell('D', 'peek-clock-rim-crop', 'clock rim/hands crop, no numerals'),
      cell('D', 'peek-car-front-crop', 'car front corner crop, no plate letters'),
      cell('D', 'peek-bus-wheel-crop', 'bus wheel + fender crop'),
      cell('D', 'peek-house-roof-corner', 'roof corner + chimney crop, not a full house'),
      cell('D', 'peek-tree-trunk-crop', 'tree trunk section crop, canopy off-frame'),
      cell('D', 'peek-sun-partial-disk', 'sun disk cropped by frame edge'),
      cell('D', 'peek-moon-partial-disk', 'moon disk cropped by frame edge'),
      cell('D', 'peek-key-teeth-crop', 'key teeth crop, bow off-frame'),
      cell('D', 'peek-spoon-bowl-crop', 'spoon bowl crop, handle off-frame'),
      cell('D', 'peek-fork-tines-crop', 'fork tines crop, handle off-frame'),
      cell('D', 'peek-shoe-toe-crop', 'shoe toe crop, heel off-frame, no logos'),
      cell('D', 'peek-hat-brim-crop', 'hat brim crop, crown off-frame'),
      cell('D', 'peek-book-edge-crop', 'closed book page-edge crop, blank spine, no letters'),
      cell('D', 'peek-cup-rim-closeup', 'cup rim close-up crop'),
      cell('D', 'peek-partial-object-silhouette', 'generic mystery object silhouette, partial, not a presentation frame'),
    ],
  },
];

/** Wave I1 — 5× 4×4 modular architecture (80). Keep empty interaction space. */
const I1_SHEETS = [
  {
    id: 'S1',
    title: 'env doorways-windows 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-doorway', 'empty rectangular doorway frame, open floor through it, isolated'),
      cell('I', 'env-arch-arched-doorway', 'empty stone/wood arched doorway, play space through opening'),
      cell('I', 'env-arch-double-doorway', 'empty double-door frame, doors not filling the opening'),
      cell('I', 'env-arch-dutch-door-half', 'dutch door lower half closed, upper open, empty play space'),
      cell('I', 'env-arch-sliding-door-panel', 'one sliding-door panel on a track, empty opening beside it'),
      cell('I', 'env-arch-screen-door-frame', 'screen-door frame, empty, no text'),
      cell('I', 'env-arch-sash-window', 'sash window unit, empty glass, not a hide-window hero'),
      cell('I', 'env-arch-bay-window-section', 'bay window section only, not a full room'),
      cell('I', 'env-arch-round-window', 'round porthole-style window, empty glass'),
      cell('I', 'env-arch-casement-window', 'casement window slightly ajar, empty'),
      cell('I', 'env-arch-skylight-panel', 'angled skylight panel, isolated'),
      cell('I', 'env-arch-shopfront-window-empty', 'empty shopfront window pane + sill, no goods, no letters'),
      cell('I', 'env-arch-ticket-window-empty', 'empty ticket/service window with shelf, no glass logos'),
      cell('I', 'env-arch-pass-through', 'kitchen pass-through opening in a short wall section'),
      cell('I', 'env-arch-french-doors', 'french-door pair, mostly glass, empty, isolated'),
      cell('I', 'env-arch-dormer-window', 'dormer window bump, roof fragment only'),
    ],
  },
  {
    id: 'S2',
    title: 'env counters-stalls 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-shop-counter-section', 'short empty shop counter section, open floor in front'),
      cell('I', 'env-arch-cafe-bar-section', 'cafe bar section, empty top, not a full cafe stage'),
      cell('I', 'env-arch-kitchen-island-end', 'kitchen island END only, stools optional, lots of black'),
      cell('I', 'env-arch-reception-L-section', 'L-shaped reception counter corner, empty, no logos'),
      cell('I', 'env-arch-market-stall-front', 'empty market stall front (posts + counter), no produce pile'),
      cell('I', 'env-arch-food-kiosk-front', 'small food kiosk front counter, empty, no menu text'),
      cell('I', 'env-arch-library-desk-section', 'library issue-desk section, empty, no letters'),
      cell('I', 'env-arch-lab-bench-section', 'science lab bench section, empty top'),
      cell('I', 'env-arch-workbench-section', 'workshop workbench section, empty'),
      cell('I', 'env-arch-checkout-section', 'store checkout counter section, empty belt, no prices'),
      cell('I', 'env-arch-info-desk-section', 'low info desk section, empty, no signs'),
      cell('I', 'env-arch-display-case-empty', 'empty glass display counter, nothing inside'),
      cell('I', 'env-arch-concession-counter', 'concession stand counter section, empty'),
      cell('I', 'env-arch-craft-table-section', 'craft table section, empty surface'),
      cell('I', 'env-arch-potting-bench-section', 'garden potting bench section, empty'),
      cell('I', 'env-arch-ice-cream-window-empty', 'walk-up service window + small counter, empty, no flavors text'),
    ],
  },
  {
    id: 'S3',
    title: 'env path-fence-road 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-sidewalk-slab', 'one sidewalk slab section, isolated, colored concrete not grey-on-white'),
      cell('I', 'env-arch-sidewalk-corner', 'sidewalk corner piece'),
      cell('I', 'env-arch-crosswalk-section', 'short zebra-stripe crosswalk SECTION, no letters'),
      cell('I', 'env-arch-cobble-path-section', 'cobblestone path section'),
      cell('I', 'env-arch-dirt-path-section', 'dirt path section'),
      cell('I', 'env-arch-garden-path-section', 'garden stepping-stone path section'),
      cell('I', 'env-arch-boardwalk-section', 'wood boardwalk section'),
      cell('I', 'env-arch-asphalt-road-section', 'short asphalt road section with one dashed line, no text'),
      cell('I', 'env-arch-curb-section', 'street curb section'),
      cell('I', 'env-arch-picket-fence-section', 'picket fence SECTION, not a full yard'),
      cell('I', 'env-arch-iron-fence-section', 'iron fence section'),
      cell('I', 'env-arch-stone-wall-section', 'low stone wall section'),
      cell('I', 'env-arch-chain-fence-section', 'chain-link fence section, no signs'),
      cell('I', 'env-arch-garden-gate-open', 'open garden gate with a bit of fence, empty path through'),
      cell('I', 'env-arch-low-brick-wall', 'low brick wall section'),
      cell('I', 'env-arch-planter-border', 'planter-border curb section'),
    ],
  },
  {
    id: 'S4',
    title: 'env stairs-rail-bench-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-stairs-straight', 'short straight stair flight, empty, isolated'),
      cell('I', 'env-arch-stairs-corner', 'corner/L stair fragment'),
      cell('I', 'env-arch-stoop-steps', 'house stoop three steps, empty'),
      cell('I', 'env-arch-ramp-section', 'short accessibility ramp section, no pictograms'),
      cell('I', 'env-arch-handrail-section', 'standalone handrail section'),
      cell('I', 'env-arch-balcony-rail', 'balcony railing section'),
      cell('I', 'env-arch-bridge-rail-section', 'bridge railing section over a tiny gap, not a full landscape'),
      cell('I', 'env-arch-park-bench', 'simple park bench, isolated, empty'),
      cell('I', 'env-arch-wall-bench', 'bench attached to a short wall section'),
      cell('I', 'env-arch-hedge-section', 'rectangular hedge SECTION'),
      cell('I', 'env-arch-hedge-corner', 'hedge corner piece'),
      cell('I', 'env-arch-topiary-ball', 'single topiary ball on a stem'),
      cell('I', 'env-arch-planter-box', 'empty planter box'),
      cell('I', 'env-arch-tree-planter', 'square tree planter with short trunk, canopy cropped'),
      cell('I', 'env-arch-shrub-row', 'low shrub row section'),
      cell('I', 'env-arch-flower-bed-edge', 'flower-bed edge section, sparse flowers, lots of soil/black'),
    ],
  },
  {
    id: 'S5',
    title: 'env awning-curtain-porch 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-stripe-awning', 'shop awning SECTION, stripes, no letters'),
      cell('I', 'env-arch-solid-awning', 'solid-color awning section'),
      cell('I', 'env-arch-shop-canopy', 'small shop canopy over empty space'),
      cell('I', 'env-arch-porch-roof-section', 'porch roof + two posts, empty floor, not a house'),
      cell('I', 'env-arch-two-columns', 'two columns / colonnade fragment, empty between'),
      cell('I', 'env-arch-garden-archway', 'garden archway with empty path through'),
      cell('I', 'env-arch-pergola-section', 'pergola bay section, empty'),
      cell('I', 'env-arch-gazebo-corner', 'gazebo corner fragment, not a full park scene'),
      cell('I', 'env-arch-curtain-panel', 'full hanging curtain PANEL as furniture, not a VG overlay atom'),
      cell('I', 'env-arch-cafe-curtain-half', 'cafe half-curtain on a rod, window implied empty'),
      cell('I', 'env-arch-stage-valance', 'stage valance/drape header only'),
      cell('I', 'env-arch-tent-flap-open', 'tent flap open, empty dark interior, not a campsite story'),
      cell('I', 'env-arch-booth-side-curtain', 'photo-booth / stall side curtain panel'),
      cell('I', 'env-arch-window-box', 'window box on a short sill, sparse plants'),
      cell('I', 'env-arch-shutter-pair', 'pair of shutters, isolated, not a hide-window'),
      cell('I', 'env-arch-trellis-section', 'garden trellis section, mostly empty'),
    ],
  },
];

/** Wave D2 — more object peeks if D1 is low-yield / keep-firing. */
const D2_SHEETS = [
  {
    id: 'S1',
    title: 'peek food-vehicle-clothes 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-pizza-from-box', 'pizza box ajar, one slice corner peeking, no logos'),
      cell('D', 'peek-ice-cream-from-freezer', 'ice-cream tub lid ajar, scoop peeking'),
      cell('D', 'peek-sandwich-from-wrapper', 'sandwich corner from paper wrap'),
      cell('D', 'peek-watermelon-from-cooler', 'watermelon wedge from open cooler'),
      cell('D', 'peek-train-from-tunnel', 'train nose crop from a tunnel mouth, no letters'),
      cell('D', 'peek-boat-from-dock-edge', 'boat bow crop at a dock edge, not a marina stage'),
      cell('D', 'peek-plane-from-cloud', 'airplane wing/nose crop from a cloud, isolated'),
      cell('D', 'peek-truck-from-garage', 'truck bumper crop from garage opening'),
      cell('D', 'peek-sleeve-from-closet', 'coat sleeve peeking from closet, no people'),
      cell('D', 'peek-boot-from-rack', 'boot top from a rack, rest off-frame'),
      cell('D', 'peek-glove-from-drawer', 'glove fingers from a drawer'),
      cell('D', 'peek-scarf-from-hook', 'scarf end from a wall hook'),
      cell('D', 'peek-crayon-from-box', 'crayon tips from a box, no brand'),
      cell('D', 'peek-map-from-tube', 'rolled map end from a tube, blank paper'),
      cell('D', 'peek-camera-from-bag', 'camera lens from a camera bag, no logos'),
      cell('D', 'peek-headphones-from-case', 'headphone cup from an open case'),
    ],
  },
  {
    id: 'S2',
    title: 'peek more hides 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-eyes-under-table', 'cat eyes/ears under a table edge, no full face portrait'),
      cell('D', 'peek-dog-paw-under-sofa', 'dog paw from under a sofa'),
      cell('D', 'peek-mouse-from-hole', 'mouse nose from a baseboard hole'),
      cell('D', 'peek-bird-from-nest-edge', 'bird tail from a nest rim'),
      cell('D', 'peek-fishbowl-partial', 'fishbowl crop, fish tail only inside'),
      cell('D', 'peek-present-from-tree-skirt', 'gift peeking from a tree skirt (no tree scene)'),
      cell('D', 'peek-ball-from-net', 'ball caught in a net crop'),
      cell('D', 'peek-book-from-shelf-gap', 'book edge from a shelf gap, blank spine'),
      cell('D', 'peek-phone-from-pocket', 'phone corner from a pocket, no UI'),
      cell('D', 'peek-keys-from-bowl', 'key heads from a bowl'),
      cell('D', 'peek-glasses-from-case', 'glasses arm from an open case'),
      cell('D', 'peek-watch-from-cuff', 'watch face from a sleeve cuff, no numerals required'),
      cell('D', 'peek-candle-from-holder', 'candle top from a holder, flame optional'),
      cell('D', 'peek-flower-from-vase-rim', 'flower bloom over a vase rim, vase mostly off-frame'),
      cell('D', 'peek-brush-from-cup', 'brush handles from a cup'),
      cell('D', 'peek-letter-from-slot', 'blank envelope from a mail slot, no address'),
    ],
  },
  {
    id: 'S3',
    title: 'peek closeups 2 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-banana-curve-crop', 'banana curve crop'),
      cell('D', 'peek-strawberry-crop', 'strawberry close crop'),
      cell('D', 'peek-carrot-tip-crop', 'carrot tip crop'),
      cell('D', 'peek-egg-partial', 'egg partial silhouette'),
      cell('D', 'peek-soccer-ball-panel', 'soccer ball panel crop, no logos'),
      cell('D', 'peek-basketball-lines', 'basketball line crop'),
      cell('D', 'peek-teddy-ear-crop', 'teddy ear crop only'),
      cell('D', 'peek-backpack-zip-crop', 'backpack zipper/pocket crop'),
      cell('D', 'peek-pencil-tip-crop', 'pencil tip crop'),
      cell('D', 'peek-eraser-end-crop', 'eraser end crop'),
      cell('D', 'peek-scissors-blades-crop', 'scissors blades crop, handles off-frame'),
      cell('D', 'peek-ruler-end-crop', 'ruler end crop, no numbers'),
      cell('D', 'peek-globe-partial', 'globe partial, no country labels'),
      cell('D', 'peek-lamp-shade-crop', 'lamp shade crop'),
      cell('D', 'peek-chair-back-crop', 'chair back crop'),
      cell('D', 'peek-table-corner-crop', 'table corner crop'),
    ],
  },
];

/** Wave I2 — more architecture sections (no civic stages). */
const I2_SHEETS = [
  {
    id: 'S1',
    title: 'env indoor-rail-lockers 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-locker-row-section', 'short locker row SECTION, blank doors, no numbers'),
      cell('I', 'env-arch-cubby-wall-section', 'cubby wall section, empty cubbies'),
      cell('I', 'env-arch-bookshelf-endcap', 'bookshelf ENDCAP, blank spines, empty floor beside'),
      cell('I', 'env-arch-whiteboard-section', 'blank whiteboard section on a short wall, no writing'),
      cell('I', 'env-arch-corkboard-empty', 'empty corkboard, no pins/notes'),
      cell('I', 'env-arch-coat-hook-rail', 'coat-hook rail on a short wall, empty'),
      cell('I', 'env-arch-stair-landing', 'stair landing fragment with rail'),
      cell('I', 'env-arch-mezzanine-rail', 'indoor mezzanine rail section'),
      cell('I', 'env-arch-stage-lip', 'low stage lip / platform edge, empty top'),
      cell('I', 'env-arch-bleacher-section', 'short bleacher section, empty'),
      cell('I', 'env-arch-partition-screen', 'folding partition screen, empty'),
      cell('I', 'env-arch-alcove', 'wall alcove / niche, empty'),
      cell('I', 'env-arch-service-hatch', 'service hatch in a wall, open empty'),
      cell('I', 'env-arch-loading-dock-lip', 'loading-dock lip section, not a warehouse story'),
      cell('I', 'env-arch-greenhouse-bay', 'greenhouse frame bay, empty, not a garden scene'),
      cell('I', 'env-arch-bus-shelter-frame', 'bus shelter FRAME only, blank panels, no timetable'),
    ],
  },
  {
    id: 'S2',
    title: 'env outdoor-more 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-lamp-post', 'single lamp post, isolated'),
      cell('I', 'env-arch-bike-rack-section', 'bike rack section, empty'),
      cell('I', 'env-arch-playground-fence-section', 'playground fence section'),
      cell('I', 'env-arch-sandpit-edge', 'sandpit edge section, empty sand'),
      cell('I', 'env-arch-picnic-table', 'picnic table, isolated, empty'),
      cell('I', 'env-arch-kiosk-roof', 'tiny kiosk roof + posts, empty, not a shop stage'),
      cell('I', 'env-arch-bandstand-rail', 'bandstand rail fragment'),
      cell('I', 'env-arch-pier-section', 'short pier/deck section, not a marina'),
      cell('I', 'env-arch-canal-wall-section', 'canal wall + water strip section, not a lock stage'),
      cell('I', 'env-arch-retaining-wall', 'retaining wall section'),
      cell('I', 'env-arch-stepping-stones', 'three stepping stones, isolated'),
      cell('I', 'env-arch-log-border', 'log border section'),
      cell('I', 'env-arch-stone-steps-garden', 'garden stone steps, short flight'),
      cell('I', 'env-arch-arch-trellis-gate', 'trellis gate arch, empty path'),
      cell('I', 'env-arch-palisade-section', 'wood palisade section'),
      cell('I', 'env-arch-bollard-pair', 'two bollards with a bit of pavement'),
    ],
  },
];

/** Wave D3 — keep-firing peek crops. */
const D3_SHEETS = [
  {
    id: 'S1',
    title: 'peek more tails-bags 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-duck-tail-out', 'duck tail crop, body off-frame'),
      cell('D', 'peek-goose-tail-out', 'goose tail crop, body off-frame'),
      cell('D', 'peek-kangaroo-tail-out', 'kangaroo tail crop, body off-frame'),
      cell('D', 'peek-dino-tail-out', 'friendly dinosaur tail crop, body off-frame'),
      cell('D', 'peek-grapes-in-bag', 'grape cluster peeking from produce bag'),
      cell('D', 'peek-milk-in-bag', 'milk carton top peeking from grocery bag, no letters'),
      cell('D', 'peek-laptop-in-bag', 'laptop corner peeking from a tote, no logos'),
      cell('D', 'peek-soccer-in-net-bag', 'soccer ball in a mesh bag, partial'),
      cell('D', 'peek-toast-from-toaster', 'toast slice peeking from toaster slots'),
      cell('D', 'peek-pan-from-oven', 'pan handle peeking from an oven'),
      cell('D', 'peek-cake-from-box', 'cake box ajar, cake edge peeking, no text'),
      cell('D', 'peek-lollipop-from-jar', 'lollipop sticks from a jar'),
      cell('D', 'peek-crayon-box-open', 'open crayon box, tips only, no brand'),
      cell('D', 'peek-marker-from-cup', 'marker caps from a cup, no labels'),
      cell('D', 'peek-yarn-from-basket', 'yarn ball peeking from a basket'),
      cell('D', 'peek-ribbon-from-spool', 'ribbon end from a spool'),
    ],
  },
  {
    id: 'S2',
    title: 'peek more hides-closeups 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-behind-box', 'cat ear/tail behind a cardboard box'),
      cell('D', 'peek-present-under-table', 'gift box under a table edge'),
      cell('D', 'peek-ball-behind-curtain-hem', 'ball curve under a curtain hem'),
      cell('D', 'peek-boot-behind-door', 'boot toe behind a door'),
      cell('D', 'peek-umbrella-from-stand-top', 'umbrella canopy peak from a stand'),
      cell('D', 'peek-book-under-pillow', 'book corner under a pillow, blank cover'),
      cell('D', 'peek-sock-from-hamper', 'sock from a laundry hamper'),
      cell('D', 'peek-hat-from-hook', 'hat brim from a wall hook'),
      cell('D', 'peek-leaf-from-book', 'leaf bookmark peeking from a closed book, no letters'),
      cell('D', 'peek-coin-from-purse', 'coin edge from an open purse'),
      cell('D', 'peek-ticket-from-pocket', 'blank ticket stub from a pocket, no text'),
      cell('D', 'peek-flashlight-from-drawer', 'flashlight head from a drawer'),
      cell('D', 'peek-binoculars-from-case', 'binoculars from an open case'),
      cell('D', 'peek-compass-partial', 'compass partial, no letters'),
      cell('D', 'peek-wheel-partial', 'wagon/bike wheel partial crop'),
      cell('D', 'peek-ladder-rungs-crop', 'ladder rungs crop, rails continuing off-frame'),
    ],
  },
  {
    id: 'S3',
    title: 'peek high-demand objects 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-apple-behind-bag-fold', 'apple behind a folded bag lip'),
      cell('D', 'peek-banana-from-bowl', 'banana curve over a bowl rim'),
      cell('D', 'peek-carrot-from-crate', 'carrot tops from a crate'),
      cell('D', 'peek-fish-from-ice', 'fish tail on ice, rest off-frame'),
      cell('D', 'peek-bread-from-basket', 'loaf end from a bread basket'),
      cell('D', 'peek-cupcake-from-box', 'cupcake top from a bakery box, no logo'),
      cell('D', 'peek-ice-pop-from-wrapper', 'ice-pop tip from a wrapper, no text'),
      cell('D', 'peek-water-bottle-from-bag', 'bottle neck from a bag, no label'),
      cell('D', 'peek-phone-from-book', 'phone edge from under a book, no UI'),
      cell('D', 'peek-headphones-from-bag', 'headphone cup from a bag'),
      cell('D', 'peek-camera-strap-out', 'camera strap dangling, camera off-frame'),
      cell('D', 'peek-keyring-from-pocket', 'keyring from a pocket'),
      cell('D', 'peek-watch-partial-face', 'watch partial, no numerals'),
      cell('D', 'peek-glasses-fold-crop', 'folded glasses crop'),
      cell('D', 'peek-toothbrush-from-cup', 'toothbrush heads from a cup'),
      cell('D', 'peek-soap-from-dish', 'soap bar from a dish, partial'),
    ],
  },
];

/** Wave I3 — keep-firing modular architecture. */
const I3_SHEETS = [
  {
    id: 'S1',
    title: 'env more indoor 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-transom-doorway', 'doorway with transom window, empty opening'),
      cell('I', 'env-arch-stained-glass-panel', 'stained-glass window panel, no letters or symbols'),
      cell('I', 'env-arch-half-wall', 'half-wall section with empty top, play space'),
      cell('I', 'env-arch-wainscot-section', 'wainscot wall section'),
      cell('I', 'env-arch-picture-rail', 'picture-rail wall section, empty'),
      cell('I', 'env-arch-closet-opening', 'closet opening with empty rod, no clothes pile'),
      cell('I', 'env-arch-pantry-opening', 'pantry doorway, empty shelves fragment'),
      cell('I', 'env-arch-service-window-ledge', 'service window with empty ledge'),
      cell('I', 'env-arch-newel-stair-rail', 'newel post + short stair rail'),
      cell('I', 'env-arch-rope-rail', 'rope railing section'),
      cell('I', 'env-arch-banquette-section', 'banquette / built-in bench section, empty'),
      cell('I', 'env-arch-booth-seat', 'cafe booth seat fragment, empty table stub'),
      cell('I', 'env-arch-host-stand', 'empty host stand, no menus/text'),
      cell('I', 'env-arch-coat-check-counter', 'coat-check counter section, empty'),
      cell('I', 'env-arch-ticket-booth-empty', 'tiny ticket booth shell, empty, no letters'),
      cell('I', 'env-arch-stage-wing', 'stage wing curtain + empty floor, not a full theatre'),
    ],
  },
  {
    id: 'S2',
    title: 'env more outdoor 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-brick-path-section', 'brick path section'),
      cell('I', 'env-arch-gravel-path-section', 'gravel path section'),
      cell('I', 'env-arch-split-rail-fence', 'split-rail fence section'),
      cell('I', 'env-arch-bamboo-fence-section', 'bamboo fence section'),
      cell('I', 'env-arch-hedge-arch', 'hedge with an arch opening, empty path'),
      cell('I', 'env-arch-lattice-fence', 'lattice fence section'),
      cell('I', 'env-arch-stone-lintel-gate', 'stone lintel gate, empty'),
      cell('I', 'env-arch-fountain-basin-empty', 'empty fountain basin, isolated, not a plaza scene'),
      cell('I', 'env-arch-pond-edge', 'short pond edge section, not a marina'),
      cell('I', 'env-arch-footbridge-section', 'tiny footbridge section over a gap'),
      cell('I', 'env-arch-boardwalk-rail', 'boardwalk with rail section'),
      cell('I', 'env-arch-lookout-rail', 'lookout railing section'),
      cell('I', 'env-arch-awning-side-panel', 'awning side panel fragment'),
      cell('I', 'env-arch-market-umbrella-empty', 'empty market umbrella, no logos, isolated'),
      cell('I', 'env-arch-planter-urn', 'garden urn planter, empty or sparse'),
      cell('I', 'env-arch-low-hedge-gap', 'low hedge with a gap opening'),
    ],
  },
];

/** Wave D4 — keep manufacturing peek crops. */
const D4_SHEETS = [
  {
    id: 'S1',
    title: 'peek kitchen-school 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-kettle-spout-out', 'kettle spout crop, body off-frame'),
      cell('D', 'peek-toaster-slot-out', 'toast corners in toaster slots'),
      cell('D', 'peek-fridge-door-ajar', 'fridge door ajar, one shelf item peeking, no labels'),
      cell('D', 'peek-oven-mitt-from-hook', 'oven mitt from a hook'),
      cell('D', 'peek-whisk-from-crock', 'whisk handles from a crock'),
      cell('D', 'peek-rolling-pin-from-drawer', 'rolling-pin end from a drawer'),
      cell('D', 'peek-apple-from-lunchbox', 'apple from an open lunchbox'),
      cell('D', 'peek-thermos-from-bag', 'thermos lid from a bag, no logos'),
      cell('D', 'peek-glue-from-caddy', 'glue-stick cap from a caddy, no brand'),
      cell('D', 'peek-stapler-from-drawer', 'stapler nose from a drawer'),
      cell('D', 'peek-tape-from-dispenser', 'tape end from a dispenser'),
      cell('D', 'peek-clip-from-jar', 'paper clips from a jar'),
      cell('D', 'peek-magnet-from-fridge', 'magnet on a fridge fragment, no letters'),
      cell('D', 'peek-note-from-pad', 'blank sticky note from a pad, no writing'),
      cell('D', 'peek-folder-from-stack', 'folder tab from a stack, blank'),
      cell('D', 'peek-globe-from-shelf', 'globe partial from a shelf, no labels'),
    ],
  },
  {
    id: 'S2',
    title: 'peek outdoor-play 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-kite-from-bag', 'kite corner from a bag'),
      cell('D', 'peek-bat-from-bag', 'baseball bat handle from a bag'),
      cell('D', 'peek-helmet-from-hook', 'bike helmet from a hook, no logos'),
      cell('D', 'peek-skateboard-from-door', 'skateboard nose from behind a door'),
      cell('D', 'peek-jump-rope-from-hook', 'jump-rope handles from a hook'),
      cell('D', 'peek-bucket-from-sand', 'bucket rim from sand, rest off-frame'),
      cell('D', 'peek-shovel-from-sand', 'shovel handle from sand'),
      cell('D', 'peek-frisbee-from-grass', 'frisbee edge from grass tuft'),
      cell('D', 'peek-tent-peg-from-ground', 'tent peg and guy-line crop'),
      cell('D', 'peek-lantern-from-pack', 'lantern top from a pack'),
      cell('D', 'peek-compass-from-pocket', 'compass partial from a pocket, no letters'),
      cell('D', 'peek-map-from-pocket', 'blank folded map from a pocket'),
      cell('D', 'peek-leaf-from-book-edge', 'leaf from a closed book edge'),
      cell('D', 'peek-acorn-from-leaf', 'acorn under a leaf'),
      cell('D', 'peek-shell-from-sand', 'shell from sand'),
      cell('D', 'peek-pebble-from-water', 'pebble at a water edge, not a marina'),
    ],
  },
];

/** Wave I4 — keep manufacturing modular env. */
const I4_SHEETS = [
  {
    id: 'S1',
    title: 'env more frames 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-stable-door-half', 'stable-style split door, upper open, empty'),
      cell('I', 'env-arch-revolving-door-slice', 'one slice of a revolving door, empty, no logos'),
      cell('I', 'env-arch-loading-door-open', 'loading door raised, empty opening, not a warehouse story'),
      cell('I', 'env-arch-cellar-bulkhead', 'cellar bulkhead doors, one open, empty'),
      cell('I', 'env-arch-attic-hatch', 'attic hatch open, empty, isolated'),
      cell('I', 'env-arch-clerestory-band', 'clerestory window band, empty glass'),
      cell('I', 'env-arch-glass-block-panel', 'glass-block wall panel section'),
      cell('I', 'env-arch-jalousie-window', 'jalousie / louver window, empty'),
      cell('I', 'env-arch-shop-valance-empty', 'shop valance over empty opening, no letters'),
      cell('I', 'env-arch-portico-two-posts', 'tiny portico, two posts + pediment, empty floor'),
      cell('I', 'env-arch-arcade-bay', 'arcade bay, one arch, empty'),
      cell('I', 'env-arch-breezeway-section', 'breezeway roof + posts, empty path'),
      cell('I', 'env-arch-mudroom-bench', 'mudroom bench + cubby fragment, empty'),
      cell('I', 'env-arch-shoe-shelf-empty', 'empty shoe shelf section'),
      cell('I', 'env-arch-umbrella-stand-empty', 'empty umbrella stand'),
      cell('I', 'env-arch-coat-tree', 'empty coat tree, isolated'),
    ],
  },
  {
    id: 'S2',
    title: 'env more outdoor-civic-not-stages 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-bus-stop-pole', 'bus-stop pole + blank flag, no letters, not a full stop stage'),
      cell('I', 'env-arch-mailbox-post', 'mailbox on a post, flag down, no text'),
      cell('I', 'env-arch-fire-hydrant-curb', 'hydrant + short curb, isolated'),
      cell('I', 'env-arch-newsstand-empty', 'empty newsstand shell, no papers/text'),
      cell('I', 'env-arch-phone-booth-empty', 'empty phone-booth frame, no logos'),
      cell('I', 'env-arch-kiosk-panel-blank', 'blank kiosk panel, no ads'),
      cell('I', 'env-arch-planter-trough', 'long planter trough, sparse plants'),
      cell('I', 'env-arch-tree-grate', 'tree grate with short trunk, canopy cropped'),
      cell('I', 'env-arch-bike-locker-section', 'bike locker section, blank doors'),
      cell('I', 'env-arch-turnstile-empty', 'empty turnstile, no signs'),
      cell('I', 'env-arch-platform-edge-yellow', 'platform edge strip, no letters, not a train stage'),
      cell('I', 'env-arch-ferry-rail-only', 'short deck rail only, not a ferry stage'),
      cell('I', 'env-arch-gazebo-rail', 'gazebo rail fragment'),
      cell('I', 'env-arch-bandstand-step', 'bandstand step fragment'),
      cell('I', 'env-arch-statue-plinth-empty', 'empty plinth, no statue'),
      cell('I', 'env-arch-clock-post-blank', 'post clock, no numerals'),
    ],
  },
];

/** Wave D5 — keep-firing peek crops (not in d1–d4). */
const D5_SHEETS = [
  {
    id: 'S1',
    title: 'peek music-play-garden 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-drumstick-from-case', 'drumstick tips from an open case'),
      cell('D', 'peek-flute-from-case', 'flute end from an open case, no logos'),
      cell('D', 'peek-trumpet-bell-out', 'trumpet bell crop, body off-frame'),
      cell('D', 'peek-xylophone-end-crop', 'xylophone bar end crop, no letters'),
      cell('D', 'peek-puzzle-from-box', 'puzzle piece from an open box, blank art'),
      cell('D', 'peek-dice-from-cup', 'dice spilling from a cup, no numerals required'),
      cell('D', 'peek-marble-from-bag', 'marbles from a cloth bag'),
      cell('D', 'peek-yo-yo-from-pocket', 'yo-yo edge from a pocket'),
      cell('D', 'peek-whistle-from-lanyard', 'whistle on a lanyard crop, no letters'),
      cell('D', 'peek-trophy-from-shelf', 'trophy cup crop from a shelf, no plaques'),
      cell('D', 'peek-doorknob-crop', 'doorknob crop, door mostly off-frame'),
      cell('D', 'peek-hose-from-reel', 'garden hose end from a reel'),
      cell('D', 'peek-watering-can-spout-out', 'watering-can spout crop, body off-frame'),
      cell('D', 'peek-trowel-from-soil', 'trowel handle from soil'),
      cell('D', 'peek-wheelbarrow-handle-out', 'wheelbarrow handle crop, bin off-frame'),
      cell('D', 'peek-wagon-tongue-out', 'wagon tongue/handle crop, wagon off-frame'),
    ],
  },
  {
    id: 'S2',
    title: 'peek food-weather-home 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-pear-from-bowl', 'pear top over a bowl rim'),
      cell('D', 'peek-corn-from-husk', 'corn tip from husk, rest off-frame'),
      cell('D', 'peek-cheese-wedge-crop', 'cheese wedge crop, no labels'),
      cell('D', 'peek-pretzel-from-bag', 'pretzel from an open bag, no brand'),
      cell('D', 'peek-popcorn-from-bucket', 'popcorn from a bucket rim, no letters'),
      cell('D', 'peek-pillow-from-bed', 'pillow corner from a bed edge'),
      cell('D', 'peek-blanket-corner-out', 'blanket corner crop'),
      cell('D', 'peek-curtain-tassel-out', 'curtain tassel crop, not a VG overlay'),
      cell('D', 'peek-sled-nose-out', 'sled nose crop, rest off-frame'),
      cell('D', 'peek-mitten-from-snow', 'mitten in a snow tuft, no people'),
      cell('D', 'peek-boot-from-mud', 'boot toe from mud, rest off-frame'),
      cell('D', 'peek-raincoat-from-hook', 'raincoat hem from a hook, no people'),
      cell('D', 'peek-mailbox-flag-out', 'mailbox flag crop, box mostly off-frame, no text'),
      cell('D', 'peek-hose-bib-drip', 'outdoor faucet drip crop on a wall fragment'),
      cell('D', 'peek-birdhouse-hole-crop', 'birdhouse entrance hole crop, not a full garden scene'),
      cell('D', 'peek-wind-chime-partial', 'wind-chime tubes partial, isolated'),
    ],
  },
];

/** Wave I5 — keep-firing modular architecture (not civic shop stages). */
const I5_SHEETS = [
  {
    id: 'S1',
    title: 'env farm-outbuilding-not-stages 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-barn-door-track', 'barn sliding-door on a track, empty opening, not a farm scene'),
      cell('I', 'env-arch-well-curb', 'stone well curb, empty opening, isolated'),
      cell('I', 'env-arch-windmill-base', 'windmill tower base fragment, blades cropped'),
      cell('I', 'env-arch-coop-door-empty', 'small coop door, empty, isolated'),
      cell('I', 'env-arch-greenhouse-door', 'greenhouse door frame, empty, not a garden story'),
      cell('I', 'env-arch-shed-opening', 'garden-shed opening, empty, isolated'),
      cell('I', 'env-arch-fence-stile', 'fence stile / step-over, empty path'),
      cell('I', 'env-arch-cattle-gate-open', 'open field gate with a bit of fence, empty'),
      cell('I', 'env-arch-hayloft-opening', 'hayloft square opening, empty, isolated'),
      cell('I', 'env-arch-cornice-section', 'roof cornice section'),
      cell('I', 'env-arch-gutter-section', 'rain gutter section'),
      cell('I', 'env-arch-downspout-section', 'downspout on a short wall'),
      cell('I', 'env-arch-chimney-stack', 'chimney stack fragment, not a house'),
      cell('I', 'env-arch-flagpole-blank', 'flagpole, blank flag, no letters'),
      cell('I', 'env-arch-birdbath-empty', 'empty birdbath, isolated'),
      cell('I', 'env-arch-sundial-plinth', 'sundial on a small plinth, no numerals required'),
    ],
  },
  {
    id: 'S2',
    title: 'env yard-deck-fragments 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-stone-bench-garden', 'stone garden bench, isolated, empty'),
      cell('I', 'env-arch-pergola-end', 'pergola END bay, empty'),
      cell('I', 'env-arch-arbor-seat', 'arbor with a tiny bench, empty path'),
      cell('I', 'env-arch-raised-bed-empty', 'empty raised garden bed, isolated'),
      cell('I', 'env-arch-rain-barrel', 'rain barrel beside a short wall, isolated'),
      cell('I', 'env-arch-hose-bib-wall', 'hose bib on a short wall section'),
      cell('I', 'env-arch-window-well', 'basement window well, empty, isolated'),
      cell('I', 'env-arch-storm-door-frame', 'storm-door frame, empty, isolated'),
      cell('I', 'env-arch-screen-porch-bay', 'screen-porch bay, empty floor'),
      cell('I', 'env-arch-deck-stair-short', 'short deck stair flight, empty'),
      cell('I', 'env-arch-pool-ladder-section', 'pool ladder section, no water scene'),
      cell('I', 'env-arch-trellis-corner', 'garden trellis corner, mostly empty'),
      cell('I', 'env-arch-stone-edging', 'stone edging section'),
      cell('I', 'env-arch-gravel-strip', 'narrow gravel strip section'),
      cell('I', 'env-arch-mulch-bed-edge', 'mulch-bed edge section, sparse plants'),
      cell('I', 'env-arch-yard-lamp-short', 'short path lamp, isolated'),
    ],
  },
];

/** Wave D6 — bag / curtain / furniture / buried / silhouette peeks (not in d1–d5). */
const D6_SHEETS = [
  {
    id: 'S1',
    title: 'peek bag-curtain 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-pear-in-mesh-bag', 'pear top peeking from a mesh produce bag'),
      cell('D', 'peek-lemon-in-paper-bag', 'lemon peeking from a paper bag'),
      cell('D', 'peek-potato-in-sack', 'potato peeking from a burlap sack'),
      cell('D', 'peek-toy-car-in-tote', 'toy car nose peeking from a tote, no logos'),
      cell('D', 'peek-scarf-in-tote-bag', 'scarf end peeking from a tote'),
      cell('D', 'peek-lunchbox-from-backpack-pocket', 'lunchbox corner from a backpack pocket'),
      cell('D', 'peek-crayon-in-pouch', 'crayon tips from a zipper pouch, no brand'),
      cell('D', 'peek-yarn-in-tote', 'yarn ball peeking from a tote'),
      cell('D', 'peek-cat-tail-beside-drape', 'cat tail beside a drape hem, not a VG overlay'),
      cell('D', 'peek-dog-ear-beside-drape', 'dog ear beside a drape, no full face'),
      cell('D', 'peek-gift-under-drape-hem', 'wrapped gift under a drape hem'),
      cell('D', 'peek-toy-behind-valance', 'toy block behind a valance, no letters'),
      cell('D', 'peek-book-behind-drape', 'blank book spine behind a drape'),
      cell('D', 'peek-lamp-beside-drape', 'lamp base beside a drape, shade cropped'),
      cell('D', 'peek-plant-pot-beside-drape', 'plant pot rim beside a drape'),
      cell('D', 'peek-ball-beside-drape', 'ball curve beside a drape'),
    ],
  },
  {
    id: 'S2',
    title: 'peek furniture-buried-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-under-armchair', 'cat tail/paw under an armchair, no full face'),
      cell('D', 'peek-shoe-under-ottoman', 'shoe toe under an ottoman'),
      cell('D', 'peek-box-under-desk', 'cardboard box under a desk'),
      cell('D', 'peek-sock-under-nightstand', 'sock under a nightstand'),
      cell('D', 'peek-book-behind-headboard', 'blank book behind a headboard'),
      cell('D', 'peek-cushion-edge-crop', 'cushion corner crop, rest off-frame'),
      cell('D', 'peek-rug-corner-crop', 'rug corner crop'),
      cell('D', 'peek-carrot-in-soil', 'carrot top buried in soil, rest hidden'),
      cell('D', 'peek-potato-in-soil', 'potato partially buried in soil'),
      cell('D', 'peek-key-in-sand', 'key bow in sand, teeth hidden'),
      cell('D', 'peek-coin-in-soil', 'coin edge in soil, no numerals'),
      cell('D', 'peek-spoon-in-flour', 'spoon handle in a flour pile'),
      cell('D', 'peek-bone-toy-in-sand', 'toy bone partially buried in sand'),
      cell('D', 'peek-boot-silhouette-crop', 'boot silhouette partial, not a presentation frame'),
      cell('D', 'peek-hat-silhouette-crop', 'hat silhouette partial crop'),
      cell('D', 'peek-cup-silhouette-crop', 'cup silhouette partial crop'),
    ],
  },
];

/** Wave I6 — door/window/counter/fence/path/stall/hedge/rail variants (not in i1–i5). */
const I6_SHEETS = [
  {
    id: 'S1',
    title: 'env door-window-counter-stall 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-pocket-door-open', 'pocket door slid open, empty opening, isolated'),
      cell('I', 'env-arch-saloon-doors-empty', 'cafe saloon-door pair, empty, no logos'),
      cell('I', 'env-arch-bead-curtain-doorway', 'bead-curtain doorway, empty play space through'),
      cell('I', 'env-arch-hopper-window', 'hopper window tilted open, empty glass'),
      cell('I', 'env-arch-picture-window-empty', 'large picture-window pane + sill, empty, no letters'),
      cell('I', 'env-arch-transom-only', 'transom window bar only, isolated'),
      cell('I', 'env-arch-oriel-window-section', 'oriel window bump section, not a full room'),
      cell('I', 'env-arch-frosted-window-pane', 'frosted window pane section, empty, no symbols'),
      cell('I', 'env-arch-butcher-block-end', 'butcher-block counter END, empty top'),
      cell('I', 'env-arch-fold-down-counter', 'fold-down wall counter, empty, open'),
      cell('I', 'env-arch-window-counter-shelf', 'window counter shelf, empty, isolated'),
      cell('I', 'env-arch-bar-rail-section', 'bar foot-rail section only, isolated'),
      cell('I', 'env-arch-serving-hatch-shelf', 'serving-hatch shelf, empty, not a kitchen story'),
      cell('I', 'env-arch-craft-stall-side', 'craft stall SIDE wall + post, empty, not a shop stage'),
      cell('I', 'env-arch-flower-stall-empty-posts', 'empty flower-stall posts + shelf, no blooms pile, not a florist stage'),
      cell('I', 'env-arch-produce-stall-empty-frame', 'produce-stall FRAME only, empty, not a market stage'),
    ],
  },
  {
    id: 'S2',
    title: 'env fence-path-hedge-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-woven-hurdle-fence', 'woven hurdle fence section'),
      cell('I', 'env-arch-wire-fence-section', 'smooth-wire fence section, no barbs, no signs'),
      cell('I', 'env-arch-privacy-fence-section', 'solid privacy-fence section'),
      cell('I', 'env-arch-picket-gate-ajar', 'picket gate ajar with a bit of fence, empty path'),
      cell('I', 'env-arch-ha-ha-wall-section', 'low ha-ha / drop-wall section'),
      cell('I', 'env-arch-flagstone-path', 'flagstone path section'),
      cell('I', 'env-arch-wood-chip-path', 'wood-chip path section'),
      cell('I', 'env-arch-tile-path-section', 'garden tile path section'),
      cell('I', 'env-arch-ramp-curb-cut', 'curb-cut ramp section, no pictograms'),
      cell('I', 'env-arch-cloud-hedge-section', 'cloud-pruned hedge SECTION'),
      cell('I', 'env-arch-spiral-topiary', 'single spiral topiary, isolated'),
      cell('I', 'env-arch-hedge-alcove', 'hedge with a shallow alcove, empty'),
      cell('I', 'env-arch-glass-rail-section', 'glass balcony-rail section'),
      cell('I', 'env-arch-cable-rail-section', 'cable railing section'),
      cell('I', 'env-arch-wood-deck-rail', 'wood deck railing section'),
      cell('I', 'env-arch-stair-baluster-section', 'stair baluster section, isolated'),
    ],
  },
];

/** Wave D7 — more bag/furniture/buried peeks. */
const D7_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bags-furniture 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-apple-in-picnic-basket', 'apple peeking from a picnic basket'),
      cell('D', 'peek-sandwich-in-tin', 'sandwich corner from a tin, no labels'),
      cell('D', 'peek-cookie-from-jar', 'cookie from a jar mouth'),
      cell('D', 'peek-lemon-from-pitcher', 'lemon slice on a pitcher rim, pitcher mostly off-frame'),
      cell('D', 'peek-straw-from-glass', 'straw from a glass rim, glass mostly off-frame'),
      cell('D', 'peek-napkin-from-ring', 'napkin from a napkin ring'),
      cell('D', 'peek-fork-from-drawer', 'fork tines from a drawer'),
      cell('D', 'peek-lid-from-pot', 'pot lid ajar, steam optional, pot mostly off-frame'),
      cell('D', 'peek-cork-from-bottle', 'cork from a bottle neck, no labels'),
      cell('D', 'peek-matchbox-ajar', 'matchbox ajar, match heads, no brand'),
      cell('D', 'peek-vase-neck-crop', 'vase neck crop, body off-frame'),
      cell('D', 'peek-mirror-frame-crop', 'empty mirror frame corner crop, no face'),
      cell('D', 'peek-picture-frame-empty-crop', 'empty picture-frame corner, blank, no art'),
      cell('D', 'peek-clock-pendulum-crop', 'clock pendulum crop, no numerals'),
      cell('D', 'peek-remote-in-cushion-gap', 'remote edge in a cushion gap, no UI/text'),
      cell('D', 'peek-hat-on-bedpost', 'hat on a bedpost, rest of bed off-frame'),
    ],
  },
  {
    id: 'S2',
    title: 'peek more buried-hides 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-in-laundry-basket', 'cat ear from a laundry basket, no full face'),
      cell('D', 'peek-sock-behind-washer', 'sock behind a washer corner'),
      cell('D', 'peek-ball-under-crib', 'ball under a crib rail'),
      cell('D', 'peek-book-in-magazine-rack', 'blank magazine/book in a rack, no letters'),
      cell('D', 'peek-umbrella-behind-coat-rack', 'umbrella handle behind a coat rack'),
      cell('D', 'peek-shoe-in-cubby', 'shoe in a cubby hole, no logos'),
      cell('D', 'peek-key-under-doormat', 'key edge under a doormat corner'),
      cell('D', 'peek-letter-under-doormat', 'blank envelope under a doormat, no address'),
      cell('D', 'peek-bone-under-rug', 'toy bone lump under a rug'),
      cell('D', 'peek-marble-in-gravel', 'marble in gravel'),
      cell('D', 'peek-lego-in-rice', 'toy brick in a rice bin, no brand studs logos'),
      cell('D', 'peek-spoon-in-sugar', 'spoon in a sugar bowl, bowl mostly off-frame'),
      cell('D', 'peek-leaf-silhouette-crop', 'leaf silhouette partial crop'),
      cell('D', 'peek-umbrella-silhouette-crop', 'umbrella silhouette partial, not a VG overlay'),
      cell('D', 'peek-bicycle-partial-sil', 'bicycle silhouette partial crop, no logos'),
      cell('D', 'peek-kite-silhouette-crop', 'kite silhouette partial crop'),
    ],
  },
];

/** Wave I7 — more door/window/counter/fence/path modules. */
const I7_SHEETS = [
  {
    id: 'S1',
    title: 'env more doors-windows-counters 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-bifold-door-open', 'bifold door stacked open, empty opening'),
      cell('I', 'env-arch-pivot-door-ajar', 'pivot door slightly ajar, empty, isolated'),
      cell('I', 'env-arch-gateleg-counter', 'gate-leg counter leaf up, empty top'),
      cell('I', 'env-arch-breakfast-bar-stub', 'breakfast-bar stub, empty, lots of black'),
      cell('I', 'env-arch-nook-bench-counter', 'nook bench + tiny counter stub, empty'),
      cell('I', 'env-arch-awning-window', 'awning window cranked out, empty glass'),
      cell('I', 'env-arch-slider-window', 'horizontal slider window, empty'),
      cell('I', 'env-arch-garden-window-box-empty', 'garden window box, empty soil, on a short sill'),
      cell('I', 'env-arch-ticket-ledge-only', 'ticket ledge only, no booth, no letters'),
      cell('I', 'env-arch-pharmacy-window-empty-frame', 'empty service-window FRAME only, not a pharmacy stage'),
      cell('I', 'env-arch-bakery-shelf-empty', 'empty wall shelf section, not a bakery stage'),
      cell('I', 'env-arch-hardware-pegboard-empty', 'empty pegboard section, no tools, not a hardware stage'),
      cell('I', 'env-arch-barbershop-pole-blank', 'barber-pole shape blank stripes only, isolated, not a shop stage'),
      cell('I', 'env-arch-marina-cleat-rail', 'deck cleat on a short rail, not a marina stage'),
      cell('I', 'env-arch-ferry-bench-stub', 'short deck bench stub, not a ferry stage'),
      cell('I', 'env-arch-laundromat-fold-table', 'empty fold table section, not a laundromat stage'),
    ],
  },
  {
    id: 'S2',
    title: 'env more fence-path-hedge-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-wattle-fence-section', 'wattle fence section'),
      cell('I', 'env-arch-board-fence-gap', 'board fence with a gap opening, empty'),
      cell('I', 'env-arch-post-and-rail-gate', 'post-and-rail with an open gap, empty path'),
      cell('I', 'env-arch-mesh-fence-section', 'welded-mesh fence section, no signs'),
      cell('I', 'env-arch-brick-herringbone-path', 'herringbone brick path section'),
      cell('I', 'env-arch-resin-path-section', 'smooth resin/pebble path section'),
      cell('I', 'env-arch-rail-trail-section', 'short rail-trail ballast + one tie, no letters'),
      cell('I', 'env-arch-boardwalk-turn', 'boardwalk 90-degree turn section'),
      cell('I', 'env-arch-box-hedge-ball', 'box hedge ball, isolated'),
      cell('I', 'env-arch-pleached-hedge-section', 'pleached hedge SECTION, trunks + canopy strip'),
      cell('I', 'env-arch-ivy-rail-section', 'ivy on a short rail section, sparse'),
      cell('I', 'env-arch-pipe-rail-section', 'simple pipe railing section'),
      cell('I', 'env-arch-mesh-rail-section', 'mesh infill railing section'),
      cell('I', 'env-arch-stone-parapet', 'low stone parapet section'),
      cell('I', 'env-arch-wood-picket-rail', 'low picket rail / pony wall, not a full yard'),
      cell('I', 'env-arch-bench-with-rail', 'bench attached to a short rail, empty'),
    ],
  },
];

/** Wave D8 / I8 — extra keep-fire so the runner does not go empty. */
const D8_SHEETS = [
  {
    id: 'S1',
    title: 'peek more sil-furniture-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-pear-silhouette-crop', 'pear silhouette partial crop'),
      cell('D', 'peek-banana-silhouette-crop', 'banana silhouette partial crop'),
      cell('D', 'peek-shoe-silhouette-crop', 'shoe silhouette partial, no logos'),
      cell('D', 'peek-bag-silhouette-crop', 'shopping-bag silhouette partial'),
      cell('D', 'peek-chair-leg-crop', 'chair leg crop, seat off-frame'),
      cell('D', 'peek-table-leg-crop', 'table leg crop, top off-frame'),
      cell('D', 'peek-sofa-arm-crop', 'sofa arm crop, rest off-frame'),
      cell('D', 'peek-drawer-ajar-crop', 'drawer slightly ajar, empty dark interior'),
      cell('D', 'peek-closet-rod-crop', 'closet rod crop, empty hangers optional'),
      cell('D', 'peek-bookshelf-gap-crop', 'bookshelf gap crop, blank spines'),
      cell('D', 'peek-basket-from-shelf', 'basket rim from a shelf'),
      cell('D', 'peek-box-from-closet', 'cardboard box from a closet'),
      cell('D', 'peek-bag-from-hook', 'tote bag from a wall hook, empty-looking'),
      cell('D', 'peek-coat-from-chair', 'coat hem over a chair back, no people'),
      cell('D', 'peek-scarf-from-banister', 'scarf over a banister, rest off-frame'),
      cell('D', 'peek-hat-from-stair-newel', 'hat on a newel post'),
    ],
  },
];

const I8_SHEETS = [
  {
    id: 'S1',
    title: 'env leftover modules 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-dutch-upper-open', 'dutch door UPPER open lower closed, empty'),
      cell('I', 'env-arch-screen-slider', 'screen slider panel, empty opening beside'),
      cell('I', 'env-arch-service-counter-cutout', 'service counter with a cutout, empty, no glass logos'),
      cell('I', 'env-arch-island-overhang', 'kitchen-island overhang only, stools optional, lots of black'),
      cell('I', 'env-arch-window-seat-empty', 'window-seat bench empty, short wall, not a room'),
      cell('I', 'env-arch-dormer-cheek', 'dormer cheek wall + tiny window, roof fragment'),
      cell('I', 'env-arch-fanlight-bar', 'fanlight bar over a doorway, empty opening below'),
      cell('I', 'env-arch-sidelight-panel', 'sidelight glass panel, empty, isolated'),
      cell('I', 'env-arch-stockade-fence', 'stockade fence section'),
      cell('I', 'env-arch-horse-fence-section', 'three-board horse fence section'),
      cell('I', 'env-arch-hog-wire-section', 'hog-wire fence section, no signs'),
      cell('I', 'env-arch-pea-gravel-path', 'pea-gravel path section'),
      cell('I', 'env-arch-sleeper-path', 'timber-sleeper path section'),
      cell('I', 'env-arch-yew-hedge-section', 'yew hedge SECTION'),
      cell('I', 'env-arch-beech-hedge-section', 'beech hedge SECTION'),
      cell('I', 'env-arch-wrought-rail-section', 'wrought-iron rail section, simple, no spikes as weapons'),
    ],
  },
];

const D9_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bag-closet-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-orange-in-crate', 'orange peeking from a crate'),
      cell('D', 'peek-melon-from-mesh-bag', 'melon from a mesh bag, partial'),
      cell('D', 'peek-celery-from-bag', 'celery tops from a grocery bag'),
      cell('D', 'peek-broom-from-closet', 'broom bristles from a closet, handle off-frame'),
      cell('D', 'peek-mop-from-bucket', 'mop head from a bucket'),
      cell('D', 'peek-dustpan-from-closet', 'dustpan from a closet gap'),
      cell('D', 'peek-hanger-from-rod', 'empty hanger from a closet rod'),
      cell('D', 'peek-belt-from-hook', 'belt end from a hook, no people'),
      cell('D', 'peek-tie-from-rack', 'tie from a rack, no logos'),
      cell('D', 'peek-glove-from-pocket', 'glove fingers from a pocket'),
      cell('D', 'peek-wallet-from-drawer', 'wallet edge from a drawer, no cards/text'),
      cell('D', 'peek-bookmark-from-pages', 'blank bookmark from a closed book, no letters'),
      cell('D', 'peek-stamp-from-tin', 'blank stamp-sized paper from a tin, no letters'),
      cell('D', 'peek-toast-from-rack', 'toast from a cooling rack'),
      cell('D', 'peek-lid-from-jar', 'jar lid ajar, contents peeking, no labels'),
      cell('D', 'peek-ribbon-from-gift', 'ribbon bow on a gift corner, rest off-frame, no text'),
    ],
  },
];

const I9_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-path-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-accordion-door', 'accordion door stacked open, empty opening'),
      cell('I', 'env-arch-curtain-door-track', 'curtain-on-track doorway, empty play space'),
      cell('I', 'env-arch-kitchen-pass-shelf', 'kitchen pass shelf only, empty, isolated'),
      cell('I', 'env-arch-tilt-window', 'tilt window, empty glass, isolated'),
      cell('I', 'env-arch-corner-window-section', 'corner window section, empty, not a room'),
      cell('I', 'env-arch-picket-dog-ear-fence', 'dog-ear picket fence section'),
      cell('I', 'env-arch-ranch-rail-section', 'ranch rail fence section'),
      cell('I', 'env-arch-crushed-shell-path', 'crushed-shell path section, not a marina'),
      cell('I', 'env-arch-tanbark-path', 'tanbark path section'),
      cell('I', 'env-arch-hornbeam-hedge', 'hornbeam hedge SECTION'),
      cell('I', 'env-arch-privet-hedge-section', 'privet hedge SECTION'),
      cell('I', 'env-arch-steel-cable-rail', 'steel cable rail section'),
      cell('I', 'env-arch-timber-rail-section', 'chunky timber rail section'),
      cell('I', 'env-arch-kiosk-counter-stub', 'tiny kiosk counter stub, empty, not a shop stage'),
      cell('I', 'env-arch-espresso-counter-stub', 'espresso-bar stub empty, not a cafe stage'),
      cell('I', 'env-arch-folding-stall-front', 'folding stall front, empty, not a market stage'),
    ],
  },
];

const D10_SHEETS = [
  {
    id: 'S1',
    title: 'peek more curtain-furniture 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-cat-paw-beside-drape', 'cat paw beside a drape hem, not a VG overlay'),
      cell('D', 'peek-ball-under-drape', 'ball under a drape puddle'),
      cell('D', 'peek-box-behind-armchair', 'box behind an armchair'),
      cell('D', 'peek-shoe-under-rocker', 'shoe under a rocking chair'),
      cell('D', 'peek-book-under-sofa-cushion', 'blank book under a sofa cushion'),
      cell('D', 'peek-toy-under-rug-corner', 'toy under a rug corner'),
      cell('D', 'peek-key-in-planter-soil', 'key in planter soil'),
      cell('D', 'peek-spoon-in-planter', 'spoon in a planter, sparse soil'),
      cell('D', 'peek-apple-in-hoodie-pocket', 'apple in a hoodie pocket, no person'),
      cell('D', 'peek-ball-in-hoodie-pocket', 'ball in a hoodie pocket, no person'),
      cell('D', 'peek-carrot-in-cooler', 'carrot tops from a cooler'),
      cell('D', 'peek-bottle-in-cooler', 'bottle neck from a cooler, no label'),
      cell('D', 'peek-hat-silhouette-brim', 'hat brim silhouette crop'),
      cell('D', 'peek-bag-handle-silhouette', 'bag-handle silhouette crop'),
      cell('D', 'peek-chair-silhouette-crop', 'chair silhouette partial crop'),
      cell('D', 'peek-lamp-silhouette-crop', 'lamp silhouette partial crop'),
    ],
  },
];

const I10_SHEETS = [
  {
    id: 'S1',
    title: 'env more stall-rail-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-ticket-stall-empty', 'empty ticket stall shell, no letters, not a stage'),
      cell('I', 'env-arch-info-kiosk-empty', 'empty info kiosk shell, blank panels'),
      cell('I', 'env-arch-leaning-shelf-empty', 'leaning empty shelf section'),
      cell('I', 'env-arch-wall-counter-fold', 'wall-mounted fold counter, empty'),
      cell('I', 'env-arch-hopper-door-open', 'hopper-style stable door, empty'),
      cell('I', 'env-arch-louver-door-ajar', 'louver door ajar, empty, isolated'),
      cell('I', 'env-arch-ribbon-window', 'ribbon window strip, empty glass'),
      cell('I', 'env-arch-corner-sash', 'corner sash window, empty'),
      cell('I', 'env-arch-hurdle-gate-open', 'hurdle gate open, empty path'),
      cell('I', 'env-arch-estate-fence-section', 'estate metal fence section, simple'),
      cell('I', 'env-arch-hoggin-path', 'hoggin path section'),
      cell('I', 'env-arch-setts-path', 'stone setts path section'),
      cell('I', 'env-arch-laurel-hedge-section', 'laurel hedge SECTION'),
      cell('I', 'env-arch-boxwood-hedge-low', 'low boxwood hedge SECTION'),
      cell('I', 'env-arch-balcony-glass-rail', 'balcony glass rail section'),
      cell('I', 'env-arch-bridge-wood-rail', 'short wood bridge rail, tiny gap, not a landscape'),
    ],
  },
];

const D11_SHEETS = [
  {
    id: 'S1',
    title: 'peek more produce-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-plum-from-bag', 'plum from a produce bag'),
      cell('D', 'peek-onion-from-sack', 'onion from a mesh sack'),
      cell('D', 'peek-leek-from-bag', 'leek tops from a grocery bag'),
      cell('D', 'peek-garlic-from-mesh', 'garlic bulb from a mesh bag'),
      cell('D', 'peek-pepper-from-bag', 'bell pepper from a bag, no labels'),
      cell('D', 'peek-cucumber-from-crate', 'cucumber from a crate'),
      cell('D', 'peek-avocado-from-bag', 'avocado from a produce bag'),
      cell('D', 'peek-mango-from-crate', 'mango from a crate'),
      cell('D', 'peek-pineapple-from-bag', 'pineapple crown from a bag'),
      cell('D', 'peek-coconut-from-sack', 'coconut from a sack'),
      cell('D', 'peek-lime-from-bag', 'lime from a mesh bag'),
      cell('D', 'peek-peach-from-crate', 'peach from a crate'),
      cell('D', 'peek-kiwi-from-bag', 'kiwi from a produce bag'),
      cell('D', 'peek-fig-from-basket', 'fig from a small basket'),
      cell('D', 'peek-date-from-tin', 'date from a tin, no labels'),
      cell('D', 'peek-radish-from-bunch', 'radish tops from a bunch, rest off-frame'),
    ],
  },
];

const I11_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-fence-path 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-pivot-window', 'pivot window, empty glass, isolated'),
      cell('I', 'env-arch-clerestory-single', 'single clerestory pane, empty'),
      cell('I', 'env-arch-service-door-ajar', 'service door ajar, empty opening, not a warehouse story'),
      cell('I', 'env-arch-gatehouse-arch', 'tiny gatehouse arch, empty path, not a castle scene'),
      cell('I', 'env-arch-wicket-gate', 'wicket gate in a fence, empty, isolated'),
      cell('I', 'env-arch-haha-rail', 'ha-ha with a short rail section'),
      cell('I', 'env-arch-chestnut-paling', 'chestnut paling fence section'),
      cell('I', 'env-arch-estate-rail-gap', 'estate rail with a gap, empty path'),
      cell('I', 'env-arch-self-binding-path', 'self-binding gravel path section'),
      cell('I', 'env-arch-clay-path-section', 'packed-clay path section'),
      cell('I', 'env-arch-holly-hedge-section', 'holly hedge SECTION, sparse'),
      cell('I', 'env-arch-escallonia-hedge', 'escallonia hedge SECTION'),
      cell('I', 'env-arch-pool-fence-section', 'pool-code fence section, no water scene'),
      cell('I', 'env-arch-stair-glass-rail', 'indoor stair glass rail section'),
      cell('I', 'env-arch-dock-cleat-rail', 'short dock rail + cleat, not a marina stage'),
      cell('I', 'env-arch-market-awning-stall', 'awning over empty stall posts, not a marketplace stage'),
    ],
  },
];

const D12_SHEETS = [
  {
    id: 'S1',
    title: 'peek more furniture-buried 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-sock-under-cushion', 'sock under a cushion'),
      cell('D', 'peek-remote-under-ottoman', 'remote under an ottoman, no UI'),
      cell('D', 'peek-cat-in-basket-lid', 'cat ear from a lidded basket, no full face'),
      cell('D', 'peek-ball-in-planter', 'ball in an empty planter'),
      cell('D', 'peek-key-under-plant-pot', 'key under a plant-pot rim'),
      cell('D', 'peek-letter-in-book', 'blank letter in a book, no writing'),
      cell('D', 'peek-coin-in-couch', 'coin in a couch gap, no numerals'),
      cell('D', 'peek-crayon-under-fridge', 'crayon from under a fridge, no brand'),
      cell('D', 'peek-sponge-from-sink', 'sponge from a sink edge'),
      cell('D', 'peek-brush-from-caddy', 'brush from a caddy'),
      cell('D', 'peek-comb-from-drawer', 'comb from a drawer'),
      cell('D', 'peek-soap-from-caddy', 'soap from a caddy, partial'),
      cell('D', 'peek-towel-from-rack', 'towel from a rack, rest off-frame'),
      cell('D', 'peek-cup-from-dish-rack', 'cup from a dish rack'),
      cell('D', 'peek-lid-from-pantry', 'jar lid from a pantry shelf, no labels'),
      cell('D', 'peek-bag-from-pantry', 'paper bag from a pantry, empty-looking'),
    ],
  },
];

const I12_SHEETS = [
  {
    id: 'S1',
    title: 'env more window-hedge-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-garden-door-light', 'garden door with a small light pane, empty, no letters'),
      cell('I', 'env-arch-stable-latch-door', 'stable door with latch, upper open, empty'),
      cell('I', 'env-arch-folding-window-wall', 'one folding-window panel, empty glass'),
      cell('I', 'env-arch-corner-counter-empty', 'corner counter empty, lots of black'),
      cell('I', 'env-arch-pass-shelf-deep', 'deep pass-through shelf, empty'),
      cell('I', 'env-arch-estate-picket-mix', 'mixed picket + rail section'),
      cell('I', 'env-arch-park-rail-low', 'low park rail section'),
      cell('I', 'env-arch-boardwalk-gap-rail', 'boardwalk section with rail and a gap'),
      cell('I', 'env-arch-hoggin-curve', 'hoggin path curve section'),
      cell('I', 'env-arch-setts-curve', 'stone setts curve section'),
      cell('I', 'env-arch-beech-hedge-gap', 'beech hedge with a gap opening, empty'),
      cell('I', 'env-arch-yew-hedge-alcove', 'yew hedge alcove, empty'),
      cell('I', 'env-arch-ivy-fence-section', 'ivy on a fence section, sparse'),
      cell('I', 'env-arch-cable-stair-rail', 'stair cable rail section'),
      cell('I', 'env-arch-glass-stair-bal', 'glass stair balustrade section'),
      cell('I', 'env-arch-market-counter-empty-top', 'market counter empty top, not a marketplace stage'),
    ],
  },
];

const D13_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bag-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-berry-from-punnet', 'berry from a punnet, rest off-frame'),
      cell('D', 'peek-cherry-from-bag', 'cherry from a produce bag'),
      cell('D', 'peek-pea-from-pod-bag', 'pea pod from a bag'),
      cell('D', 'peek-corn-from-crate', 'corn ear from a crate'),
      cell('D', 'peek-squash-from-sack', 'squash from a sack'),
      cell('D', 'peek-beet-from-bunch', 'beet tops from a bunch'),
      cell('D', 'peek-turnip-from-crate', 'turnip from a crate'),
      cell('D', 'peek-cabbage-from-bag', 'cabbage from a bag, partial'),
      cell('D', 'peek-lettuce-from-bag', 'lettuce from a bag, partial'),
      cell('D', 'peek-herb-from-pot', 'herb sprigs from a pot, pot mostly off-frame'),
      cell('D', 'peek-baguette-from-paper', 'baguette end from paper wrap, no letters'),
      cell('D', 'peek-pretzel-from-stand', 'pretzel from a stand, no brand'),
      cell('D', 'peek-muffin-from-tin', 'muffin top from a tin, no labels'),
      cell('D', 'peek-pie-from-dish', 'pie crust edge from a dish'),
      cell('D', 'peek-tart-from-box', 'tart from a box, no logo'),
      cell('D', 'peek-donut-from-box', 'donut from a box, no text'),
    ],
  },
];

const I13_SHEETS = [
  {
    id: 'S1',
    title: 'env more stall-path-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-food-stall-empty-roof', 'tiny food-stall roof + posts, empty, not a shop stage'),
      cell('I', 'env-arch-craft-counter-empty', 'craft counter empty, isolated'),
      cell('I', 'env-arch-window-ledge-wide', 'wide window ledge, empty, isolated'),
      cell('I', 'env-arch-casement-pair-empty', 'casement pair, empty glass'),
      cell('I', 'env-arch-garden-hatch', 'garden hatch / coal-door, one open, empty'),
      cell('I', 'env-arch-picket-radius-section', 'curved picket fence section'),
      cell('I', 'env-arch-rail-and-picket', 'rail over picket section'),
      cell('I', 'env-arch-gravel-curve-path', 'gravel path curve section'),
      cell('I', 'env-arch-brick-curve-path', 'brick path curve section'),
      cell('I', 'env-arch-laurel-hedge-gap', 'laurel hedge with a gap, empty'),
      cell('I', 'env-arch-privet-hedge-corner', 'privet hedge corner piece'),
      cell('I', 'env-arch-box-hedge-alcove', 'box hedge alcove, empty'),
      cell('I', 'env-arch-pipe-stair-rail', 'pipe stair rail section'),
      cell('I', 'env-arch-wood-stair-bal', 'wood stair balustrade section'),
      cell('I', 'env-arch-lookout-glass-rail', 'lookout glass rail section'),
      cell('I', 'env-arch-pier-cleat-rail', 'short pier rail + cleat, not a marina stage'),
    ],
  },
];

const D14_SHEETS = [
  {
    id: 'S1',
    title: 'peek more curtain-furniture-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-lampshade-from-drape', 'lampshade peeking from a drape, rest off-frame'),
      cell('D', 'peek-vase-from-curtain', 'vase from a curtain edge'),
      cell('D', 'peek-clock-from-drape', 'clock face edge from a drape, no numbers'),
      cell('D', 'peek-mirror-from-curtain', 'mirror edge from a curtain'),
      cell('D', 'peek-stool-from-cloth', 'stool seat from a cloth, buried rest'),
      cell('D', 'peek-ottoman-from-throw', 'ottoman from a throw blanket'),
      cell('D', 'peek-headboard-from-sheet', 'headboard top from a sheet, partial'),
      cell('D', 'peek-nightstand-from-cloth', 'nightstand corner from a cloth'),
      cell('D', 'peek-bookshelf-from-drape', 'bookshelf edge from a drape, no titles'),
      cell('D', 'peek-wardrobe-from-curtain', 'wardrobe door edge from a curtain'),
      cell('D', 'peek-rocker-from-throw', 'rocking-chair arm from a throw'),
      cell('D', 'peek-crib-from-sheet', 'crib rail from a sheet, empty'),
      cell('D', 'peek-hammock-from-tree-sil', 'hammock silhouette from trees, partial'),
      cell('D', 'peek-tent-from-canvas', 'tent peak from canvas, buried rest'),
      cell('D', 'peek-suitcase-from-cloth', 'suitcase corner from a cloth'),
      cell('D', 'peek-backpack-from-drape', 'backpack strap from a drape'),
    ],
  },
];

const I14_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-window-fence 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-dutch-door-empty', 'dutch door half-open, empty, isolated'),
      cell('I', 'env-arch-screen-door-empty', 'screen door, empty, isolated'),
      cell('I', 'env-arch-storm-door-empty', 'storm door, empty glass, isolated'),
      cell('I', 'env-arch-transom-window-empty', 'transom window bar, empty glass'),
      cell('I', 'env-arch-clerestory-strip', 'clerestory window strip, empty'),
      cell('I', 'env-arch-bay-window-empty', 'bay-window section, empty glass'),
      cell('I', 'env-arch-service-counter-gap', 'service counter with a gap, empty'),
      cell('I', 'env-arch-ticket-counter-empty', 'ticket counter empty, not a station stage'),
      cell('I', 'env-arch-post-and-rail-gap', 'post-and-rail fence with a gap'),
      cell('I', 'env-arch-split-rail-section', 'split-rail fence section'),
      cell('I', 'env-arch-wattle-fence-section', 'wattle fence section'),
      cell('I', 'env-arch-flagstone-path-gap', 'flagstone path with a gap'),
      cell('I', 'env-arch-mulch-path-curve', 'mulch path curve section'),
      cell('I', 'env-arch-flower-stall-empty', 'tiny flower-stall posts, empty, not a florist stage'),
      cell('I', 'env-arch-hornbeam-hedge-gap', 'hornbeam hedge with a gap, empty'),
      cell('I', 'env-arch-bridge-rail-short', 'short bridge rail section, not a marina'),
    ],
  },
];

const D15_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bag-buried-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-carrot-from-soil', 'carrot top from soil, rest buried'),
      cell('D', 'peek-potato-from-sack', 'potato from a sack'),
      cell('D', 'peek-onion-from-net', 'onion from a net bag'),
      cell('D', 'peek-garlic-from-braid', 'garlic from a braid, rest off-frame'),
      cell('D', 'peek-pepper-from-crate', 'pepper from a crate'),
      cell('D', 'peek-tomato-from-punnet', 'tomato from a punnet'),
      cell('D', 'peek-melon-from-crate', 'melon from a crate, partial'),
      cell('D', 'peek-pumpkin-from-vine', 'pumpkin from a vine, rest buried'),
      cell('D', 'peek-umbrella-from-stand', 'umbrella handle from a stand'),
      cell('D', 'peek-hat-from-hook', 'hat brim from a hook, rest off-frame'),
      cell('D', 'peek-scarf-from-peg', 'scarf end from a peg'),
      cell('D', 'peek-boot-from-mat', 'boot from a mat, partial'),
      cell('D', 'peek-glove-from-pocket', 'glove from a coat pocket'),
      cell('D', 'peek-ball-from-net-bag', 'ball from a net bag'),
      cell('D', 'peek-kite-from-bag', 'kite corner from a bag'),
      cell('D', 'peek-wagon-from-hedge-sil', 'wagon silhouette from a hedge, partial'),
    ],
  },
];

const I15_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-counter-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-barn-slide-door', 'barn sliding door section, empty'),
      cell('I', 'env-arch-cellar-bulkhead', 'cellar bulkhead doors, one open, empty'),
      cell('I', 'env-arch-loft-hatch-empty', 'loft hatch, open, empty'),
      cell('I', 'env-arch-dormer-window-empty', 'dormer window, empty glass'),
      cell('I', 'env-arch-porthole-window-empty', 'round porthole window, empty, not a ferry stage'),
      cell('I', 'env-arch-kitchen-pass-empty', 'kitchen pass window, empty'),
      cell('I', 'env-arch-bar-rail-counter', 'bar-rail counter empty, not a tavern stage'),
      cell('I', 'env-arch-island-counter-empty', 'kitchen island counter empty, isolated'),
      cell('I', 'env-arch-chain-link-gap', 'chain-link fence with a gap'),
      cell('I', 'env-arch-bamboo-fence-section', 'bamboo fence section'),
      cell('I', 'env-arch-boardwalk-plank-path', 'boardwalk plank path section'),
      cell('I', 'env-arch-cobble-path-gap', 'cobble path with a gap'),
      cell('I', 'env-arch-produce-stall-empty', 'tiny produce-stall posts, empty, not a market stage'),
      cell('I', 'env-arch-holly-hedge-gap', 'holly hedge with a gap, empty'),
      cell('I', 'env-arch-cedar-hedge-corner', 'cedar hedge corner piece'),
      cell('I', 'env-arch-balcony-rail-short', 'short balcony rail section'),
    ],
  },
];

const D16_SHEETS = [
  {
    id: 'S1',
    title: 'peek more furniture-sil-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-sofa-from-throw', 'sofa arm from a throw, rest buried'),
      cell('D', 'peek-armchair-from-drape', 'armchair back from a drape'),
      cell('D', 'peek-desk-from-cloth', 'desk corner from a cloth'),
      cell('D', 'peek-bench-from-hedge-sil', 'bench silhouette from a hedge'),
      cell('D', 'peek-crate-from-sack', 'crate corner from a sack'),
      cell('D', 'peek-barrel-from-cloth', 'barrel rim from a cloth'),
      cell('D', 'peek-ladder-from-wall', 'ladder rail from a wall, partial'),
      cell('D', 'peek-wheelbarrow-from-hedge', 'wheelbarrow from a hedge, partial'),
      cell('D', 'peek-pail-from-bag', 'pail handle from a bag'),
      cell('D', 'peek-basket-from-cloth', 'basket rim from a cloth'),
      cell('D', 'peek-lantern-from-drape', 'lantern from a drape, no text'),
      cell('D', 'peek-candle-from-holder', 'candle from a holder, rest off-frame'),
      cell('D', 'peek-rug-from-floor-crop', 'rug corner crop, rest off-frame'),
      cell('D', 'peek-pillow-from-sofa', 'pillow from a sofa, rest buried'),
      cell('D', 'peek-quilt-from-chest', 'quilt from a chest, chest mostly off-frame'),
      cell('D', 'peek-coat-from-hook-sil', 'coat silhouette from a hook, partial'),
    ],
  },
];

const I16_SHEETS = [
  {
    id: 'S1',
    title: 'env more window-path-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-french-door-empty', 'french door pair, empty glass, isolated'),
      cell('I', 'env-arch-patio-slider-empty', 'patio slider section, empty glass'),
      cell('I', 'env-arch-skylight-panel-empty', 'skylight panel, empty'),
      cell('I', 'env-arch-shop-window-empty', 'shop window frame, empty, not a store stage'),
      cell('I', 'env-arch-reception-counter-empty', 'reception counter empty, isolated'),
      cell('I', 'env-arch-fold-counter-empty', 'folding counter empty, isolated'),
      cell('I', 'env-arch-ranch-fence-gap', 'ranch fence with a gap'),
      cell('I', 'env-arch-mesh-fence-section', 'mesh fence section'),
      cell('I', 'env-arch-stepping-stone-path', 'stepping-stone path section'),
      cell('I', 'env-arch-dirt-path-curve', 'dirt path curve section'),
      cell('I', 'env-arch-news-stall-empty', 'tiny news-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-boxwood-hedge-gap', 'boxwood hedge with a gap, empty'),
      cell('I', 'env-arch-cypress-hedge-row', 'short cypress hedge row section'),
      cell('I', 'env-arch-rope-rail-section', 'rope rail section'),
      cell('I', 'env-arch-iron-rail-scroll', 'short iron rail with a scroll, empty'),
      cell('I', 'env-arch-deck-rail-gap', 'deck rail with a gap'),
    ],
  },
];

const D17_SHEETS = [
  {
    id: 'S1',
    title: 'peek more curtain-buried-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-plant-from-drape', 'houseplant from a drape, pot off-frame'),
      cell('D', 'peek-frame-from-curtain', 'picture frame edge from a curtain, no art text'),
      cell('D', 'peek-shelf-from-cloth', 'shelf end from a cloth, empty'),
      cell('D', 'peek-drawer-from-drape', 'drawer front from a drape, no labels'),
      cell('D', 'peek-trunk-from-throw', 'trunk lid from a throw, rest buried'),
      cell('D', 'peek-hamper-from-cloth', 'hamper rim from a cloth'),
      cell('D', 'peek-ironing-board-from-drape', 'ironing-board end from a drape'),
      cell('D', 'peek-sewing-machine-from-cloth', 'sewing machine from a cloth, no brand'),
      cell('D', 'peek-typewriter-from-drape', 'typewriter from a drape, no letters'),
      cell('D', 'peek-radio-from-cloth', 'radio from a cloth, no text'),
      cell('D', 'peek-phone-from-drape', 'old phone from a drape, no numbers'),
      cell('D', 'peek-camera-from-bag', 'camera from a bag, no brand'),
      cell('D', 'peek-binoculars-from-case', 'binoculars from a case'),
      cell('D', 'peek-compass-from-pocket', 'compass from a pocket, no letters'),
      cell('D', 'peek-map-from-bag-sil', 'folded map silhouette from a bag, no writing'),
      cell('D', 'peek-thermos-from-sack', 'thermos from a sack'),
    ],
  },
];

const I17_SHEETS = [
  {
    id: 'S1',
    title: 'env more stall-hedge-fence 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-icebox-counter-empty', 'icebox counter empty, isolated'),
      cell('I', 'env-arch-wash-counter-empty', 'wash counter empty, not a laundromat stage'),
      cell('I', 'env-arch-greenhouse-door-empty', 'greenhouse door, empty, isolated'),
      cell('I', 'env-arch-potting-window-empty', 'potting-shed window, empty glass'),
      cell('I', 'env-arch-arbor-gap', 'garden arbor with a gap, empty'),
      cell('I', 'env-arch-trellis-section', 'trellis section, empty'),
      cell('I', 'env-arch-stockade-fence-gap', 'stockade fence with a gap'),
      cell('I', 'env-arch-rail-fence-curve', 'rail fence curve section'),
      cell('I', 'env-arch-pea-gravel-path', 'pea-gravel path section'),
      cell('I', 'env-arch-wood-chip-path', 'wood-chip path section'),
      cell('I', 'env-arch-lemonade-stall-empty', 'tiny lemonade-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-lilac-hedge-gap', 'lilac hedge with a gap, empty'),
      cell('I', 'env-arch-forsythia-hedge-corner', 'forsythia hedge corner piece'),
      cell('I', 'env-arch-pool-rail-short', 'short pool rail section'),
      cell('I', 'env-arch-ramp-rail-short', 'short ramp rail section'),
      cell('I', 'env-arch-dock-rail-short', 'short dock rail, not a marina stage'),
    ],
  },
];

const D18_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bag-furniture-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-apple-from-sack', 'apple from a sack, rest buried'),
      cell('D', 'peek-pear-from-crate', 'pear from a crate'),
      cell('D', 'peek-grape-from-punnet', 'grape cluster from a punnet'),
      cell('D', 'peek-lemon-from-bag', 'lemon from a produce bag'),
      cell('D', 'peek-lime-from-bag', 'lime from a produce bag'),
      cell('D', 'peek-peach-from-punnet', 'peach from a punnet'),
      cell('D', 'peek-plum-from-crate', 'plum from a crate'),
      cell('D', 'peek-kiwi-from-punnet', 'kiwi from a punnet'),
      cell('D', 'peek-table-from-cloth', 'table corner from a cloth'),
      cell('D', 'peek-chair-from-drape', 'chair back from a drape'),
      cell('D', 'peek-cabinet-from-curtain', 'cabinet edge from a curtain'),
      cell('D', 'peek-sideboard-from-cloth', 'sideboard from a cloth, partial'),
      cell('D', 'peek-piano-from-drape', 'piano lid from a drape, no notes'),
      cell('D', 'peek-music-stand-from-cloth', 'music stand from a cloth, empty, no notes'),
      cell('D', 'peek-easel-from-drape', 'easel from a drape, empty canvas'),
      cell('D', 'peek-scooter-from-hedge-sil', 'scooter silhouette from a hedge, partial'),
    ],
  },
];

const I18_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-window-path 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-saloon-door-empty', 'saloon-style half doors, empty, isolated'),
      cell('I', 'env-arch-revolving-door-empty', 'revolving-door fragment, empty'),
      cell('I', 'env-arch-loading-door-empty', 'loading door, open, empty'),
      cell('I', 'env-arch-louver-window-empty', 'louver window, empty'),
      cell('I', 'env-arch-stained-window-empty', 'stained-glass window, empty pattern, no letters'),
      cell('I', 'env-arch-awning-window-empty', 'awning window, empty glass'),
      cell('I', 'env-arch-pharmacy-counter-empty', 'pharmacy counter empty, not a pharmacy stage'),
      cell('I', 'env-arch-bakery-counter-empty', 'bakery counter empty, not a bakery stage'),
      cell('I', 'env-arch-palisade-fence-gap', 'palisade fence with a gap'),
      cell('I', 'env-arch-hurdle-fence-section', 'hurdle fence section'),
      cell('I', 'env-arch-tanbark-path', 'tanbark path section'),
      cell('I', 'env-arch-sand-path-curve', 'sand path curve section'),
      cell('I', 'env-arch-fish-stall-empty', 'tiny fish-stall posts, empty, not a market stage'),
      cell('I', 'env-arch-hawthorn-hedge-gap', 'hawthorn hedge with a gap, empty'),
      cell('I', 'env-arch-oleander-hedge-row', 'short oleander hedge row'),
      cell('I', 'env-arch-handrail-return', 'handrail return piece, isolated'),
    ],
  },
];

const D19_SHEETS = [
  {
    id: 'S1',
    title: 'peek more buried-sil-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-radish-from-soil', 'radish from soil, rest buried'),
      cell('D', 'peek-leek-from-crate', 'leek from a crate'),
      cell('D', 'peek-celery-from-bag', 'celery from a bag'),
      cell('D', 'peek-broccoli-from-crate', 'broccoli from a crate'),
      cell('D', 'peek-cauliflower-from-bag', 'cauliflower from a bag, partial'),
      cell('D', 'peek-cucumber-from-crate', 'cucumber from a crate'),
      cell('D', 'peek-zucchini-from-sack', 'zucchini from a sack'),
      cell('D', 'peek-eggplant-from-crate', 'eggplant from a crate'),
      cell('D', 'peek-fan-from-drape', 'fan from a drape, rest off-frame'),
      cell('D', 'peek-heater-from-cloth', 'small heater from a cloth, no brand'),
      cell('D', 'peek-humidifier-from-drape', 'humidifier from a drape, no text'),
      cell('D', 'peek-scale-from-cloth', 'kitchen scale from a cloth, no numbers'),
      cell('D', 'peek-mixer-from-drape', 'mixer from a drape, no brand'),
      cell('D', 'peek-toaster-from-cloth', 'toaster from a cloth, no brand'),
      cell('D', 'peek-kettle-from-drape', 'kettle from a drape, no letters'),
      cell('D', 'peek-bike-from-hedge-sil', 'bike wheel silhouette from a hedge'),
    ],
  },
];

const I19_SHEETS = [
  {
    id: 'S1',
    title: 'env more counter-fence-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-hardware-counter-empty', 'hardware counter empty, not a hardware stage'),
      cell('I', 'env-arch-ferry-counter-empty', 'ferry ticket counter empty, not a ferry stage'),
      cell('I', 'env-arch-stable-window-empty', 'stable window, empty glass'),
      cell('I', 'env-arch-silo-hatch-empty', 'silo hatch, open, empty'),
      cell('I', 'env-arch-root-cellar-door', 'root-cellar door, open, empty'),
      cell('I', 'env-arch-cupola-window-empty', 'cupola window, empty glass'),
      cell('I', 'env-arch-zigzag-fence-section', 'zigzag fence section'),
      cell('I', 'env-arch-ha-ha-wall-gap', 'ha-ha wall with a gap'),
      cell('I', 'env-arch-boardwalk-curve-path', 'boardwalk curve path section'),
      cell('I', 'env-arch-rubber-path-section', 'rubber playground path section'),
      cell('I', 'env-arch-ticket-stall-empty', 'tiny ticket-stall posts, empty, not a booth stage'),
      cell('I', 'env-arch-myrtle-hedge-gap', 'myrtle hedge with a gap, empty'),
      cell('I', 'env-arch-photinia-hedge-row', 'short photinia hedge row'),
      cell('I', 'env-arch-mezzanine-rail', 'short mezzanine rail section'),
      cell('I', 'env-arch-catwalk-rail', 'short catwalk rail section'),
      cell('I', 'env-arch-bleacher-rail', 'short bleacher rail section'),
    ],
  },
];

const D20_SHEETS = [
  {
    id: 'S1',
    title: 'peek more curtain-sil-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-lamp-from-curtain', 'lamp from a curtain, rest off-frame'),
      cell('D', 'peek-globe-from-drape', 'globe from a drape, no letters'),
      cell('D', 'peek-telescope-from-cloth', 'telescope from a cloth'),
      cell('D', 'peek-microscope-from-drape', 'microscope from a drape, no brand'),
      cell('D', 'peek-abacus-from-cloth', 'abacus from a cloth, no numbers'),
      cell('D', 'peek-metronome-from-drape', 'metronome from a drape, no marks'),
      cell('D', 'peek-drum-from-cloth', 'drum from a cloth, partial'),
      cell('D', 'peek-guitar-from-drape', 'guitar neck from a drape, rest buried'),
      cell('D', 'peek-violin-from-case', 'violin from a case, partial'),
      cell('D', 'peek-flute-from-bag', 'flute from a bag'),
      cell('D', 'peek-trumpet-from-case', 'trumpet from a case, partial'),
      cell('D', 'peek-xylophone-from-cloth', 'xylophone from a cloth, no letters'),
      cell('D', 'peek-skate-from-bag', 'ice skate from a bag'),
      cell('D', 'peek-helmet-from-hook', 'helmet from a hook, no brand'),
      cell('D', 'peek-bat-from-bag', 'ball-bat from a bag'),
      cell('D', 'peek-tent-peg-from-soil', 'tent peg from soil, rest buried'),
    ],
  },
];

const I20_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-path-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-garage-side-door', 'garage side door, empty, isolated'),
      cell('I', 'env-arch-mudroom-door-empty', 'mudroom door, empty, isolated'),
      cell('I', 'env-arch-pantry-door-empty', 'pantry door, open, empty'),
      cell('I', 'env-arch-hopper-window-empty', 'hopper window, empty glass'),
      cell('I', 'env-arch-picture-window-empty', 'picture window, empty glass'),
      cell('I', 'env-arch-garden-window-empty', 'garden window box empty, isolated'),
      cell('I', 'env-arch-deli-counter-empty', 'deli counter empty, not a shop stage'),
      cell('I', 'env-arch-ice-cream-counter-empty', 'ice-cream counter empty, not a shop stage'),
      cell('I', 'env-arch-cattle-fence-gap', 'cattle fence with a gap'),
      cell('I', 'env-arch-sheep-hurdle-section', 'sheep hurdle section'),
      cell('I', 'env-arch-cinder-path-section', 'cinder path section'),
      cell('I', 'env-arch-crushed-shell-path', 'crushed-shell path section'),
      cell('I', 'env-arch-craft-stall-empty', 'tiny craft-stall posts, empty, not a market stage'),
      cell('I', 'env-arch-spirea-hedge-gap', 'spirea hedge with a gap, empty'),
      cell('I', 'env-arch-viburnum-hedge-row', 'short viburnum hedge row'),
      cell('I', 'env-arch-fire-escape-rail', 'short fire-escape rail section'),
    ],
  },
];

const D21_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bag-furniture-buried 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-orange-from-crate', 'orange from a crate'),
      cell('D', 'peek-banana-from-bunch', 'banana from a bunch, rest off-frame'),
      cell('D', 'peek-mango-from-crate', 'mango from a crate'),
      cell('D', 'peek-pineapple-from-sack', 'pineapple from a sack, partial'),
      cell('D', 'peek-coconut-from-crate', 'coconut from a crate'),
      cell('D', 'peek-avocado-from-punnet', 'avocado from a punnet'),
      cell('D', 'peek-fig-from-box', 'fig from a box, no logo'),
      cell('D', 'peek-date-from-box', 'date from a box, no text'),
      cell('D', 'peek-dresser-from-drape', 'dresser from a drape, partial'),
      cell('D', 'peek-vanity-from-curtain', 'vanity from a curtain, empty, no labels'),
      cell('D', 'peek-changing-table-from-cloth', 'changing table from a cloth, empty'),
      cell('D', 'peek-highchair-from-drape', 'highchair from a drape, empty'),
      cell('D', 'peek-stroller-from-cloth', 'stroller from a cloth, partial'),
      cell('D', 'peek-carseat-from-bag', 'carseat from a bag, partial'),
      cell('D', 'peek-wagon-from-shed-sil', 'wagon from a shed silhouette'),
      cell('D', 'peek-sled-from-snow', 'sled from snow, rest buried'),
    ],
  },
];

const I21_SHEETS = [
  {
    id: 'S1',
    title: 'env more window-stall-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-cellar-window-empty', 'cellar window, empty glass'),
      cell('I', 'env-arch-attic-window-empty', 'attic window, empty glass'),
      cell('I', 'env-arch-fanlight-empty', 'fanlight over a door, empty glass'),
      cell('I', 'env-arch-sidelight-empty', 'sidelight pane, empty glass'),
      cell('I', 'env-arch-pass-door-empty', 'pass-through door, open, empty'),
      cell('I', 'env-arch-service-hatch-empty', 'service hatch, open, empty'),
      cell('I', 'env-arch-barber-counter-empty', 'barber counter empty, not a barbershop stage'),
      cell('I', 'env-arch-marina-counter-empty', 'marina counter empty, not a marina stage'),
      cell('I', 'env-arch-post-rail-fence-gap', 'post-and-rail fence with a wide gap'),
      cell('I', 'env-arch-hurdle-curve-section', 'hurdle fence curve section'),
      cell('I', 'env-arch-brick-dust-path', 'brick-dust path section'),
      cell('I', 'env-arch-pine-needle-path', 'pine-needle path section'),
      cell('I', 'env-arch-book-stall-empty', 'tiny book-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-azalea-hedge-gap', 'azalea hedge with a gap, empty'),
      cell('I', 'env-arch-camellia-hedge-row', 'short camellia hedge row'),
      cell('I', 'env-arch-porch-rail-return', 'porch rail return piece, isolated'),
    ],
  },
];

const D22_SHEETS = [
  {
    id: 'S1',
    title: 'peek more sil-curtain-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-broom-from-closet', 'broom from a closet, rest buried'),
      cell('D', 'peek-mop-from-bucket', 'mop from a bucket'),
      cell('D', 'peek-dustpan-from-cloth', 'dustpan from a cloth'),
      cell('D', 'peek-watering-can-from-shed', 'watering can from a shed, partial'),
      cell('D', 'peek-rake-from-hedge-sil', 'rake from a hedge silhouette'),
      cell('D', 'peek-hose-from-reel', 'hose from a reel, rest off-frame'),
      cell('D', 'peek-trowel-from-soil', 'trowel from soil, rest buried'),
      cell('D', 'peek-seed-packet-from-bag', 'seed packet from a bag, no letters'),
      cell('D', 'peek-birdhouse-from-drape', 'birdhouse from a drape'),
      cell('D', 'peek-feeder-from-branch', 'bird feeder from a branch, no text'),
      cell('D', 'peek-nest-from-hedge', 'nest from a hedge, empty'),
      cell('D', 'peek-beehive-from-cloth', 'beehive box from a cloth, no letters'),
      cell('D', 'peek-wheel-from-cart', 'cart wheel from a cart, rest off-frame'),
      cell('D', 'peek-yoke-from-barn', 'yoke from a barn, partial'),
      cell('D', 'peek-saddle-from-rail', 'saddle from a rail, partial'),
      cell('D', 'peek-horseshoe-from-door', 'horseshoe from a door, no luck-text'),
    ],
  },
];

const I22_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-fence-path 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-bifold-door-empty', 'bifold door, open, empty'),
      cell('I', 'env-arch-pocket-door-empty', 'pocket door, open, empty'),
      cell('I', 'env-arch-trapdoor-empty', 'trapdoor, open, empty'),
      cell('I', 'env-arch-jalousie-window-empty', 'jalousie window, empty'),
      cell('I', 'env-arch-oriel-window-empty', 'oriel window, empty glass'),
      cell('I', 'env-arch-ribbon-window-empty', 'ribbon window strip, empty'),
      cell('I', 'env-arch-florist-counter-empty', 'florist counter empty, not a florist stage'),
      cell('I', 'env-arch-recycle-counter-empty', 'recycle counter empty, not a recycling stage'),
      cell('I', 'env-arch-woven-fence-gap', 'woven fence with a gap'),
      cell('I', 'env-arch-log-fence-section', 'log fence section'),
      cell('I', 'env-arch-bark-path-section', 'bark path section'),
      cell('I', 'env-arch-resin-path-section', 'resin-bound path section'),
      cell('I', 'env-arch-toy-stall-empty', 'tiny toy-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-hydrangea-hedge-gap', 'hydrangea hedge with a gap, empty'),
      cell('I', 'env-arch-rhododendron-hedge-row', 'short rhododendron hedge row'),
      cell('I', 'env-arch-stair-rail-return', 'stair rail return piece, isolated'),
    ],
  },
];

const D23_SHEETS = [
  {
    id: 'S1',
    title: 'peek more furniture-bag-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-loveseat-from-throw', 'loveseat from a throw, rest buried'),
      cell('D', 'peek-recliner-from-drape', 'recliner from a drape, partial'),
      cell('D', 'peek-futon-from-cloth', 'futon from a cloth, partial'),
      cell('D', 'peek-daybed-from-sheet', 'daybed from a sheet, empty'),
      cell('D', 'peek-bunk-from-ladder', 'bunk rail from a ladder, empty'),
      cell('D', 'peek-loft-from-curtain', 'loft bed rail from a curtain, empty'),
      cell('D', 'peek-beanbag-from-drape', 'beanbag from a drape'),
      cell('D', 'peek-floor-cushion-from-cloth', 'floor cushion from a cloth'),
      cell('D', 'peek-hamper-lid-from-drape', 'hamper lid from a drape'),
      cell('D', 'peek-laundry-bag-from-hook', 'laundry bag from a hook, no letters'),
      cell('D', 'peek-ironing-from-board', 'iron from a board, no brand'),
      cell('D', 'peek-clothespin-from-line', 'clothespin from a line'),
      cell('D', 'peek-basket-handle-from-cloth', 'basket handle from a cloth'),
      cell('D', 'peek-crate-lid-from-sack', 'crate lid from a sack'),
      cell('D', 'peek-mailbox-from-hedge-sil', 'mailbox from a hedge silhouette, no letters'),
      cell('D', 'peek-birdbath-from-hedge', 'birdbath from a hedge, partial'),
    ],
  },
];

const I23_SHEETS = [
  {
    id: 'S1',
    title: 'env more counter-hedge-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-laundromat-counter-empty', 'laundromat counter empty, not a laundromat stage'),
      cell('I', 'env-arch-ferry-gate-empty', 'ferry gate posts, empty, not a ferry stage'),
      cell('I', 'env-arch-stable-hatch-empty', 'stable hatch, open, empty'),
      cell('I', 'env-arch-hayloft-door-empty', 'hayloft door, open, empty'),
      cell('I', 'env-arch-cupboard-window-empty', 'cupboard window, empty glass'),
      cell('I', 'env-arch-lantern-window-empty', 'lantern window, empty glass'),
      cell('I', 'env-arch-picket-and-hedge', 'picket fence meeting a hedge section'),
      cell('I', 'env-arch-stone-wall-gap', 'low stone wall with a gap'),
      cell('I', 'env-arch-slate-path-section', 'slate path section'),
      cell('I', 'env-arch-tile-path-curve', 'tile path curve section'),
      cell('I', 'env-arch-snack-stall-empty', 'tiny snack-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-escallonia-hedge-gap', 'escallonia hedge with a gap, empty'),
      cell('I', 'env-arch-pittosporum-hedge-row', 'short pittosporum hedge row'),
      cell('I', 'env-arch-banister-volute', 'banister volute piece, isolated'),
      cell('I', 'env-arch-newel-post-empty', 'newel post with a short rail, isolated'),
      cell('I', 'env-arch-landing-rail-gap', 'landing rail with a gap'),
    ],
  },
];

const D24_SHEETS = [
  {
    id: 'S1',
    title: 'peek more bag-buried-curtain 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-strawberry-from-punnet', 'strawberry from a punnet'),
      cell('D', 'peek-blueberry-from-punnet', 'blueberry from a punnet'),
      cell('D', 'peek-raspberry-from-punnet', 'raspberry from a punnet'),
      cell('D', 'peek-watermelon-from-crate', 'watermelon from a crate, partial'),
      cell('D', 'peek-cantaloupe-from-sack', 'cantaloupe from a sack'),
      cell('D', 'peek-papaya-from-crate', 'papaya from a crate'),
      cell('D', 'peek-pomegranate-from-bag', 'pomegranate from a bag'),
      cell('D', 'peek-persimmon-from-crate', 'persimmon from a crate'),
      cell('D', 'peek-screen-from-drape', 'folding screen from a drape, partial'),
      cell('D', 'peek-divider-from-curtain', 'room divider from a curtain'),
      cell('D', 'peek-coatstand-from-drape', 'coatstand from a drape, empty'),
      cell('D', 'peek-umbrella-stand-from-cloth', 'umbrella stand from a cloth'),
      cell('D', 'peek-doormat-from-floor', 'doormat corner crop, rest off-frame'),
      cell('D', 'peek-welcome-mat-from-step', 'mat on a step, no letters'),
      cell('D', 'peek-planter-from-porch', 'planter from a porch, plant partial'),
      cell('D', 'peek-wreath-from-door-sil', 'wreath from a door silhouette, no letters'),
    ],
  },
];

const I24_SHEETS = [
  {
    id: 'S1',
    title: 'env more window-path-stall 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-casement-single-empty', 'single casement window, empty glass'),
      cell('I', 'env-arch-sash-pair-empty', 'sash pair, empty glass'),
      cell('I', 'env-arch-garden-door-half', 'half garden door, empty'),
      cell('I', 'env-arch-potting-hatch-empty', 'potting hatch, open, empty'),
      cell('I', 'env-arch-icehouse-door-empty', 'icehouse door, open, empty'),
      cell('I', 'env-arch-smokehouse-window-empty', 'smokehouse window, empty glass'),
      cell('I', 'env-arch-kiosk-counter-empty', 'kiosk counter empty, not a shop stage'),
      cell('I', 'env-arch-booth-counter-empty', 'booth counter empty, isolated'),
      cell('I', 'env-arch-estate-rail-gap', 'estate rail with a gap'),
      cell('I', 'env-arch-paddock-rail-section', 'paddock rail section'),
      cell('I', 'env-arch-ash-path-section', 'ash path section'),
      cell('I', 'env-arch-clinker-path-section', 'clinker path section'),
      cell('I', 'env-arch-hat-stall-empty', 'tiny hat-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-lavender-hedge-row', 'short lavender hedge row'),
      cell('I', 'env-arch-rosemary-hedge-gap', 'rosemary hedge with a gap, empty'),
      cell('I', 'env-arch-bridge-rail-return', 'bridge rail return piece, not a marina'),
    ],
  },
];

const D25_SHEETS = [
  {
    id: 'S1',
    title: 'peek more sil-furniture-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-rocking-horse-from-drape', 'rocking horse from a drape, partial'),
      cell('D', 'peek-dollhouse-from-cloth', 'dollhouse from a cloth, no letters'),
      cell('D', 'peek-blocks-from-bag', 'blocks from a bag, no letters'),
      cell('D', 'peek-train-from-track', 'toy train from a track, rest off-frame'),
      cell('D', 'peek-puzzle-from-box', 'puzzle piece from a box, no picture-text'),
      cell('D', 'peek-crayon-from-tin', 'crayon from a tin, no labels'),
      cell('D', 'peek-paintbrush-from-jar', 'paintbrush from a jar'),
      cell('D', 'peek-palette-from-cloth', 'palette from a cloth, no letters'),
      cell('D', 'peek-scissors-from-cup', 'blunt scissors from a cup'),
      cell('D', 'peek-glue-from-bag', 'glue stick from a bag, no brand'),
      cell('D', 'peek-tape-from-dispenser', 'tape from a dispenser, no logo'),
      cell('D', 'peek-stapler-from-drape', 'stapler from a drape, no brand'),
      cell('D', 'peek-paperclip-from-tin', 'paperclip from a tin'),
      cell('D', 'peek-eraser-from-box', 'eraser from a box, no letters'),
      cell('D', 'peek-ruler-from-drawer', 'ruler from a drawer, no numbers'),
      cell('D', 'peek-backpack-from-hook-sil', 'backpack from a hook silhouette'),
    ],
  },
];

const I25_SHEETS = [
  {
    id: 'S1',
    title: 'env more door-hedge-fence 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-accordion-door-empty', 'accordion door, open, empty'),
      cell('I', 'env-arch-curtain-door-empty', 'curtain doorway, empty, isolated'),
      cell('I', 'env-arch-bead-door-empty', 'bead doorway, empty, isolated'),
      cell('I', 'env-arch-oval-window-empty', 'oval window, empty glass'),
      cell('I', 'env-arch-hex-window-empty', 'hex window, empty glass'),
      cell('I', 'env-arch-circle-window-empty', 'circle window, empty glass'),
      cell('I', 'env-arch-concession-counter-empty', 'concession counter empty, not a shop stage'),
      cell('I', 'env-arch-info-counter-empty', 'info counter empty, isolated'),
      cell('I', 'env-arch-wire-fence-gap', 'wire fence with a gap'),
      cell('I', 'env-arch-panel-fence-section', 'panel fence section'),
      cell('I', 'env-arch-hoggin-path-gap', 'hoggin path with a gap'),
      cell('I', 'env-arch-setts-path-straight', 'stone setts path straight section'),
      cell('I', 'env-arch-veg-stall-empty', 'tiny veg-stall posts, empty, not a market stage'),
      cell('I', 'env-arch-box-hedge-gap', 'box hedge with a gap, empty'),
      cell('I', 'env-arch-yew-hedge-row', 'short yew hedge row'),
      cell('I', 'env-arch-gallery-rail-short', 'short gallery rail section'),
    ],
  },
];

const D26_SHEETS = [
  {
    id: 'S1',
    title: 'peek more curtain-bag-sil 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-teapot-from-drape', 'teapot from a drape, no letters'),
      cell('D', 'peek-cup-from-saucer', 'cup from a saucer, rest off-frame'),
      cell('D', 'peek-bowl-from-cloth', 'bowl from a cloth'),
      cell('D', 'peek-plate-from-drape', 'plate from a drape, no pattern-text'),
      cell('D', 'peek-pitcher-from-cloth', 'pitcher from a cloth'),
      cell('D', 'peek-cutting-board-from-drape', 'cutting board from a drape'),
      cell('D', 'peek-rolling-pin-from-cloth', 'rolling pin from a cloth'),
      cell('D', 'peek-whisk-from-jar', 'whisk from a jar'),
      cell('D', 'peek-ladle-from-hook', 'ladle from a hook'),
      cell('D', 'peek-colander-from-drape', 'colander from a drape'),
      cell('D', 'peek-jar-from-shelf', 'jar from a shelf, no labels'),
      cell('D', 'peek-tin-from-cloth', 'tin from a cloth, no brand'),
      cell('D', 'peek-napkin-from-ring', 'napkin from a ring'),
      cell('D', 'peek-placemat-from-table', 'placemat corner from a table'),
      cell('D', 'peek-coaster-from-cloth', 'coaster from a cloth'),
      cell('D', 'peek-tray-from-drape', 'tray from a drape, empty'),
    ],
  },
];

const I26_SHEETS = [
  {
    id: 'S1',
    title: 'env more fence-path-rail 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-double-door-empty', 'double door, open, empty'),
      cell('I', 'env-arch-arched-door-empty', 'arched door, open, empty'),
      cell('I', 'env-arch-wicket-door-empty', 'wicket in a larger door, empty'),
      cell('I', 'env-arch-bullseye-window-empty', 'bullseye window, empty glass'),
      cell('I', 'env-arch-leaded-window-empty', 'leaded window, empty glass, no letters'),
      cell('I', 'env-arch-shuttered-window-empty', 'shuttered window, one shutter open, empty'),
      cell('I', 'env-arch-breakfast-counter-empty', 'breakfast counter empty, isolated'),
      cell('I', 'env-arch-island-end-empty', 'island-end counter empty, isolated'),
      cell('I', 'env-arch-chestnut-paling-gap', 'chestnut paling with a gap'),
      cell('I', 'env-arch-hurdle-gap-section', 'hurdle with a gap'),
      cell('I', 'env-arch-woodchip-path-gap', 'woodchip path with a gap'),
      cell('I', 'env-arch-gravel-path-straight', 'gravel path straight section'),
      cell('I', 'env-arch-bread-stall-empty', 'tiny bread-stall posts, empty, not a bakery stage'),
      cell('I', 'env-arch-beech-hedge-row', 'short beech hedge row'),
      cell('I', 'env-arch-hornbeam-hedge-row', 'short hornbeam hedge row'),
      cell('I', 'env-arch-terrace-rail-short', 'short terrace rail section'),
    ],
  },
];

const D27_SHEETS = [
  {
    id: 'S1',
    title: 'peek more buried-sil-bag 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('D', 'peek-carrot-from-crate', 'carrot from a crate'),
      cell('D', 'peek-parsnip-from-sack', 'parsnip from a sack'),
      cell('D', 'peek-celery-root-from-soil', 'celery root from soil, rest buried'),
      cell('D', 'peek-kohlrabi-from-crate', 'kohlrabi from a crate'),
      cell('D', 'peek-fennel-from-bag', 'fennel from a bag'),
      cell('D', 'peek-artichoke-from-crate', 'artichoke from a crate'),
      cell('D', 'peek-asparagus-from-bunch', 'asparagus from a bunch'),
      cell('D', 'peek-okra-from-crate', 'okra from a crate'),
      cell('D', 'peek-curtain-tassel-from-drape', 'curtain tassel from a drape'),
      cell('D', 'peek-valance-from-rod', 'valance from a rod, partial'),
      cell('D', 'peek-tieback-from-curtain', 'tieback from a curtain'),
      cell('D', 'peek-blind-slat-from-window', 'blind slat from a window, rest off-frame'),
      cell('D', 'peek-shade-from-roll', 'shade from a roll, partial'),
      cell('D', 'peek-canopy-from-bed', 'canopy from a bed, rest buried'),
      cell('D', 'peek-mosquito-net-from-frame', 'mosquito net from a frame, partial'),
      cell('D', 'peek-hammock-from-porch-sil', 'hammock from a porch silhouette'),
    ],
  },
];

const I27_SHEETS = [
  {
    id: 'S1',
    title: 'env more window-counter-hedge 4x4',
    format: 'black-contact-4x4',
    cells: [
      cell('I', 'env-arch-servants-door-empty', 'servants door, open, empty'),
      cell('I', 'env-arch-coal-hatch-empty', 'coal hatch, open, empty'),
      cell('I', 'env-arch-milk-hatch-empty', 'milk hatch, open, empty'),
      cell('I', 'env-arch-fanlight-bar-empty', 'fanlight bar, empty glass'),
      cell('I', 'env-arch-transom-bar-empty', 'transom bar, empty glass'),
      cell('I', 'env-arch-clerestory-gap', 'clerestory strip with a gap'),
      cell('I', 'env-arch-butcher-counter-empty', 'butcher counter empty, not a shop stage'),
      cell('I', 'env-arch-fishmonger-counter-empty', 'fishmonger counter empty, not a market stage'),
      cell('I', 'env-arch-haha-gap-section', 'ha-ha with a gap section'),
      cell('I', 'env-arch-espalier-fence-section', 'espalier fence section, empty'),
      cell('I', 'env-arch-boardwalk-straight', 'boardwalk straight section'),
      cell('I', 'env-arch-brick-path-straight', 'brick path straight section'),
      cell('I', 'env-arch-jam-stall-empty', 'tiny jam-stall posts, empty, not a shop stage'),
      cell('I', 'env-arch-privet-hedge-gap', 'privet hedge with a gap, empty'),
      cell('I', 'env-arch-laurel-hedge-row', 'short laurel hedge row'),
      cell('I', 'env-arch-promenade-rail-short', 'short promenade rail, not a marina stage'),
    ],
  },
];

export const WAVES = {
  d1: {
    id: 's3-d1-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D1 — peek/crop mystery pieces (black-field 5×4×4)',
    sheets: D1_SHEETS,
  },
  i1: {
    id: 's3-i1-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I1 — modular env architecture (black-field 5×4×4)',
    sheets: I1_SHEETS,
  },
  d2: {
    id: 's3-d2-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D2 — more peek crops (black-field 3×4×4)',
    sheets: D2_SHEETS,
  },
  i2: {
    id: 's3-i2-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I2 — more modular env (black-field 2×4×4)',
    sheets: I2_SHEETS,
  },
  d3: {
    id: 's3-d3-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D3 — more peek crops (black-field 3×4×4)',
    sheets: D3_SHEETS,
  },
  i3: {
    id: 's3-i3-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I3 — more modular env (black-field 2×4×4)',
    sheets: I3_SHEETS,
  },
  d4: {
    id: 's3-d4-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D4 — more peek crops (black-field 2×4×4)',
    sheets: D4_SHEETS,
  },
  i4: {
    id: 's3-i4-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I4 — more modular env (black-field 2×4×4)',
    sheets: I4_SHEETS,
  },
  d5: {
    id: 's3-d5-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D5 — more peek crops (black-field 2×4×4)',
    sheets: D5_SHEETS,
  },
  i5: {
    id: 's3-i5-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I5 — more modular env (black-field 2×4×4)',
    sheets: I5_SHEETS,
  },
  d6: {
    id: 's3-d6-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D6 — bag/curtain/furniture/buried peeks (black-field 2×4×4)',
    sheets: D6_SHEETS,
  },
  i6: {
    id: 's3-i6-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I6 — more door/window/fence/path modules (black-field 2×4×4)',
    sheets: I6_SHEETS,
  },
  d7: {
    id: 's3-d7-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D7 — more peek crops (black-field 2×4×4)',
    sheets: D7_SHEETS,
  },
  i7: {
    id: 's3-i7-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I7 — more modular env (black-field 2×4×4)',
    sheets: I7_SHEETS,
  },
  d8: {
    id: 's3-d8-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D8 — more peek crops (black-field 1×4×4)',
    sheets: D8_SHEETS,
  },
  i8: {
    id: 's3-i8-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I8 — more modular env (black-field 1×4×4)',
    sheets: I8_SHEETS,
  },
  d9: {
    id: 's3-d9-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D9 — more peek crops (black-field 1×4×4)',
    sheets: D9_SHEETS,
  },
  i9: {
    id: 's3-i9-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I9 — more modular env (black-field 1×4×4)',
    sheets: I9_SHEETS,
  },
  d10: {
    id: 's3-d10-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D10 — more peek crops (black-field 1×4×4)',
    sheets: D10_SHEETS,
  },
  i10: {
    id: 's3-i10-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I10 — more modular env (black-field 1×4×4)',
    sheets: I10_SHEETS,
  },
  d11: {
    id: 's3-d11-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D11 — more peek crops (black-field 1×4×4)',
    sheets: D11_SHEETS,
  },
  i11: {
    id: 's3-i11-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I11 — more modular env (black-field 1×4×4)',
    sheets: I11_SHEETS,
  },
  d12: {
    id: 's3-d12-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D12 — more peek crops (black-field 1×4×4)',
    sheets: D12_SHEETS,
  },
  i12: {
    id: 's3-i12-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I12 — more modular env (black-field 1×4×4)',
    sheets: I12_SHEETS,
  },
  d13: {
    id: 's3-d13-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D13 — more peek crops (black-field 1×4×4)',
    sheets: D13_SHEETS,
  },
  i13: {
    id: 's3-i13-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I13 — more modular env (black-field 1×4×4)',
    sheets: I13_SHEETS,
  },
  d14: {
    id: 's3-d14-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D14 — more peek crops (black-field 1×4×4)',
    sheets: D14_SHEETS,
  },
  i14: {
    id: 's3-i14-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I14 — more modular env (black-field 1×4×4)',
    sheets: I14_SHEETS,
  },
  d15: {
    id: 's3-d15-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D15 — more peek crops (black-field 1×4×4)',
    sheets: D15_SHEETS,
  },
  i15: {
    id: 's3-i15-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I15 — more modular env (black-field 1×4×4)',
    sheets: I15_SHEETS,
  },
  d16: {
    id: 's3-d16-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D16 — more peek crops (black-field 1×4×4)',
    sheets: D16_SHEETS,
  },
  i16: {
    id: 's3-i16-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I16 — more modular env (black-field 1×4×4)',
    sheets: I16_SHEETS,
  },
  d17: {
    id: 's3-d17-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D17 — more peek crops (black-field 1×4×4)',
    sheets: D17_SHEETS,
  },
  i17: {
    id: 's3-i17-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I17 — more modular env (black-field 1×4×4)',
    sheets: I17_SHEETS,
  },
  d18: {
    id: 's3-d18-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D18 — more peek crops (black-field 1×4×4)',
    sheets: D18_SHEETS,
  },
  i18: {
    id: 's3-i18-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I18 — more modular env (black-field 1×4×4)',
    sheets: I18_SHEETS,
  },
  d19: {
    id: 's3-d19-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D19 — more peek crops (black-field 1×4×4)',
    sheets: D19_SHEETS,
  },
  i19: {
    id: 's3-i19-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I19 — more modular env (black-field 1×4×4)',
    sheets: I19_SHEETS,
  },
  d20: {
    id: 's3-d20-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D20 — more peek crops (black-field 1×4×4)',
    sheets: D20_SHEETS,
  },
  i20: {
    id: 's3-i20-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I20 — more modular env (black-field 1×4×4)',
    sheets: I20_SHEETS,
  },
  d21: {
    id: 's3-d21-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D21 — more peek crops (black-field 1×4×4)',
    sheets: D21_SHEETS,
  },
  i21: {
    id: 's3-i21-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I21 — more modular env (black-field 1×4×4)',
    sheets: I21_SHEETS,
  },
  d22: {
    id: 's3-d22-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D22 — more peek crops (black-field 1×4×4)',
    sheets: D22_SHEETS,
  },
  i22: {
    id: 's3-i22-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I22 — more modular env (black-field 1×4×4)',
    sheets: I22_SHEETS,
  },
  d23: {
    id: 's3-d23-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D23 — more peek crops (black-field 1×4×4)',
    sheets: D23_SHEETS,
  },
  i23: {
    id: 's3-i23-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I23 — more modular env (black-field 1×4×4)',
    sheets: I23_SHEETS,
  },
  d24: {
    id: 's3-d24-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D24 — more peek crops (black-field 1×4×4)',
    sheets: D24_SHEETS,
  },
  i24: {
    id: 's3-i24-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I24 — more modular env (black-field 1×4×4)',
    sheets: I24_SHEETS,
  },
  d25: {
    id: 's3-d25-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D25 — more peek crops (black-field 1×4×4)',
    sheets: D25_SHEETS,
  },
  i25: {
    id: 's3-i25-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I25 — more modular env (black-field 1×4×4)',
    sheets: I25_SHEETS,
  },
  d26: {
    id: 's3-d26-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D26 — more peek crops (black-field 1×4×4)',
    sheets: D26_SHEETS,
  },
  i26: {
    id: 's3-i26-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I26 — more modular env (black-field 1×4×4)',
    sheets: I26_SHEETS,
  },
  d27: {
    id: 's3-d27-peek',
    stream: 'D',
    family: 'peek-crop',
    title: 'Aggressive S3 D27 — more peek crops (black-field 1×4×4)',
    sheets: D27_SHEETS,
  },
  i27: {
    id: 's3-i27-env',
    stream: 'I',
    family: 'modular-env',
    title: 'Aggressive S3 I27 — more modular env (black-field 1×4×4)',
    sheets: I27_SHEETS,
  },
};

export const WAVE_ORDER = ['d1', 'i1', 'd2', 'i2', 'd3', 'i3', 'd4', 'i4', 'd5', 'i5', 'd6', 'i6', 'd7', 'i7', 'd8', 'i8', 'd9', 'i9', 'd10', 'i10', 'd11', 'i11', 'd12', 'i12', 'd13', 'i13', 'd14', 'i14', 'd15', 'i15', 'd16', 'i16', 'd17', 'i17', 'd18', 'i18', 'd19', 'i19', 'd20', 'i20', 'd21', 'i21', 'd22', 'i22', 'd23', 'i23', 'd24', 'i24', 'd25', 'i25', 'd26', 'i26', 'd27', 'i27'];

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  return `SHEET ${index} — ${sheet.title} (${sheet.format}, one cutout per cell):\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function buildBrief(wave, sheets) {
  const streamRules =
    wave.stream === 'D'
      ? `STREAM D — PARTIAL / CROPPED / PEEK cutouts for mystery/reveal PLAY.
Each cell is ONE high-demand object crop: tail-out, handle-out, object-in-bag, behind-curtain/door, partial silhouette, close-up.
The rest of the object is OFF-FRAME. Isolated composable cutout. NOT a full animal/object still-life. NOT a presentation overlay.`
      : `STREAM I — MODULAR ENVIRONMENT COMPONENTS.
Doorways, windows, counters, fence/path/road/sidewalk SECTIONS, stairs, stalls, hedges, benches, curtains, awnings, railings.
Settings should feel different when these are composed — without a new full background.
Keep EMPTY interaction space (open floor/opening). Isolated architecture fragment. NOT a busy street illustration. NOT a civic shop stage.`;

  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} black-field PNG contact sheet(s)** for ClassIn ESL aggressive stockpile PACK 3.

${STYLE}

${DEDUPE}

${streamRules}

HARD RULES:
- Generate ONLY the listed cells. Do not review, research, broaden, or add concepts.
- Reading order left→right, top→bottom.
- One concept per cell, pure #000000, clear gutters.
- NO people, faces, hands as portraits (tiny animal-part peeks OK).
- NO baked readable text.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists. The 5-image cap is per generate_image call, not per task.

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

function countPeekEnv(items) {
  return {
    peek: items.filter((it) => it.stream === 'D' || it.family === 'peek-crop').length,
    env: items.filter((it) => it.stream === 'I' || it.family === 'modular-env').length,
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  const pe = countPeekEnv(items);
  inv.running_total = {
    pass: items.filter((it) => it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.qa_status === 'HOLD').length,
    peek_cells: pe.peek,
    env_cells: pe.env,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    tasks_used: waves.filter((w) => w.task_id).length,
    safety_skipped: waves.reduce((n, w) => n + (w.safety_skipped_at_fire || []).length, 0),
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
  if (!fs.existsSync(invPath)) {
    return {
      kind: 'aggressive-s3-peek-env',
      prefix: PREFIX,
      waves: {},
      running_total: {},
    };
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  const json = JSON.stringify(inv, null, 2);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(STOCKPILE, 'inventory.json'), json);
  return path.join(STOCKPILE, 'inventory.json');
}

function upsertInventory(wave, sheets, dump) {
  const inv = loadInv();
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = sheets.flatMap((s) => s.cells.map((cell) => ({
    ...cell,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: cell.qa_status || null,
    recovered_locally: false,
    regenerated: false,
    qa_note: haveLarge
      ? 'Raw sheet downloaded; visual QA must record PASS or HOLD before close.'
      : null,
    path: dump.sheet_dir || null,
    sheet_id: s.id,
    manus_task_id: dump.task_id || null,
  })));
  inv.waves[wave.id] = {
    family: wave.family,
    stream: wave.stream,
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

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const lines = [
    '# Aggressive stockpile S3 — peek crops + modular env',
    '',
    'Stockpile only. No producer wiring. Prefix `aggressive-s3-`. Manifest writes go through `harvested/manus-aggressive-stockpile/s3-peek-env/.inv.lock`.',
    '',
    'Streams: **D** partial/peek object crops · **I** modular architecture sections.',
    '',
    'Deduped against visual-grammar reveal devices (`23361b9b`) and long-tail civic stages (laundromat/hardware/ferry/bakery/barbershop/pharmacy/marina).',
    '',
    '## Running totals',
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Tasks | ${tot.tasks_used || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Peek cells | ${tot.peek_cells || 0} |`,
    `| Env cells | ${tot.env_cells || 0} |`,
    `| PASS | ${tot.pass || 0} |`,
    `| HOLD | ${tot.hold || 0} |`,
    `| Safety skips | ${tot.safety_skipped || 0} |`,
    '',
    '## Waves',
    '',
  ];
  for (const [id, w] of Object.entries(inv.waves || {})) {
    lines.push(`- **${id}** stream ${w.stream || '?'} — ${w.task_url || 'unfired'} — sheets ${w.expected_sheets || 0} — cells ${w.concept_count || 0}`);
  }
  lines.push(
    '',
    '## HOLD',
    '',
    '- `aggressive-s3-peek-cow-tail-out` — smiling animal face, not a cow-tail crop',
    '- `aggressive-s3-peek-ruler-end-crop` — measurement marks baked on',
    '- `aggressive-s3-peek-watch-from-cuff` — wrist/person fragment',
    '',
    '## QA notes',
    '',
    '- Numbered `01.png` is filename sort, not S1–Sn. Use each wave `keys.json`.',
    '- Peek crops are modular object fragments, not VG overlay devices. Env pieces are sections, not civic shop stages.',
    '- SAFETY_SKIP is word-boundary only (do not substring-skip "drape").',
    '- Stockpile only. No producer wiring.',
    '',
  );
  fs.mkdirSync(path.dirname(path.join(ROOT, TRACKED_DOC_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}

export async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

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
        prefix: PREFIX,
        concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        safety_skipped: safetyAll.skipped,
        sheets: sheets.map((s) => ({ id: s.id, title: s.title, format: s.format, keys: s.cells.map((c) => c.key) })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave, sheets);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'aggressive-s3',
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
    return dump;
  }

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exit(2);
      }
    }
    const busy = otherInFlight(wave.id);
    if (busy) {
      console.error(`REFUSING fire — max 1 in-flight. ${busy.wave} ${busy.task_id} still open`);
      process.exit(3);
    }
    const created = await withRateBackoff(() => createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: BRIEF,
    }));
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => {
      const invPath = upsertInventory(wave, sheets, dump);
      writeDocStub(loadInv());
      return invPath;
    });
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return dump;
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
    await withRateBackoff(() => sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} black-field sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
      ),
    }));
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
    dump.created_at = prev.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => {
    const p = upsertInventory(wave, sheets, dump);
    writeDocStub(loadInv());
    return p;
  });
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
        peek_vs_env: wave.stream === 'D' ? { peek: dump.concept_count, env: 0 } : { peek: 0, env: dump.concept_count },
        sheet_dir: SHEET_DIR,
        inventory: invPath,
      },
      null,
      2,
    ),
  );
  if (largeCount < NEED_SHEETS) process.exitCode = 2;
  return dump;
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-aggressive-s3.mjs');
if (isMain) {
  apiKey();
  const names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} (comma-ok)`);
  for (const n of names) {
    await runWave(n);
  }
}
