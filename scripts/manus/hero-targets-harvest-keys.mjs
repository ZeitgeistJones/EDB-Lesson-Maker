/**
 * Hero / interactive-target stockpile — waves 2–10 keys for harvest requests.
 * Same medium band as wave1 (~70–80% of cell). Prefix hero-. Do not retune %.
 *
 * Each wave: 20 closed/open pairs + 10 singles = 50 assets, 4× 4×4 sheets.
 */
export const PACK = 'hero-targets';
export const PREFIX = 'hero-';
export const RELATIVE_SCALE = 0.85;
export const ROLE = 'hero';

/** Wave1 already harvested — listed so later waves never overlap. */
export const WAVE1_USED = [
  'chest', 'box', 'backpack', 'suitcase', 'cupboard', 'drawer', 'door', 'curtain',
  'locker', 'envelope', 'gift-box', 'mailbox', 'fridge', 'washing-machine',
  'recycling-bin', 'vending-machine', 'garage', 'safe', 'tent', 'barrel',
  'monster-mouth', 'animal-mouth', 'shelf', 'lunch-tray', 'pizza-base',
  'sandwich-base', 'face-base', 'dress-body', 'aquarium', 'garden-patch',
];

export const WAVE2 = {
  id: 'wave2',
  title: 'ESL hero targets wave2 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave2',
  pairs: [
    {
      slug: 'oven',
      closed: 'bright red kitchen oven, door closed, front view, window dark, NO brand text. Body is RED not stainless/white',
      open: 'SAME red oven: door open downward, empty walnut-brown cavity, no racks of food',
    },
    {
      slug: 'microwave',
      closed: 'sky-blue microwave, door closed, front view, NO brand text. Body is BLUE not white/steel',
      open: 'SAME blue microwave: door open, empty olive interior, no plate of food',
    },
    {
      slug: 'toy-box',
      closed: 'bright yellow wooden toy box, lid shut, 3/4 view, painted stars but NO letters',
      open: 'SAME toy box: lid open, empty teal interior, no toys inside',
    },
    {
      slug: 'picnic-basket',
      closed: 'wicker picnic basket, lid closed, 3/4 view, red gingham ribbon (no text)',
      open: 'SAME basket: lid open, empty kraft-brown interior, no food',
    },
    {
      slug: 'birdcage',
      closed: 'round decorative birdcage, door shut, 3/4 view, gold bars, empty perch, no bird',
      open: 'SAME cage: small door swung open, empty mid-tone interior, still no bird',
    },
    {
      slug: 'cookie-jar',
      closed: 'round ceramic cookie jar, lid on, 3/4 view, painted cookies but NO words, cheerful blue glaze',
      open: 'SAME jar: lid off/open, empty teal interior, no cookies',
    },
    {
      slug: 'piggy-bank',
      closed: 'pink piggy bank standing, coin slot on top, rubber stopper in, 3/4 view, cute not scary',
      open: 'SAME piggy: belly hatch open, empty rose interior (not white, not black), no coins',
    },
    {
      slug: 'lunchbox',
      closed: 'kid metal lunchbox, latch closed, 3/4 view, bright orange, NO logos/text',
      open: 'SAME lunchbox: lid open, empty olive interior, no food',
    },
    {
      slug: 'pencil-case',
      closed: 'zippered pencil case, zipper closed, 3/4 view, bright purple fabric',
      open: 'SAME case: unzipped open, empty lilac interior, no pencils',
    },
    {
      slug: 'jewelry-box',
      closed: 'small jewelry box, lid shut with a jewel, 3/4 view, magenta/velvet look, no letters',
      open: 'SAME box: lid open, empty plum interior, no jewelry',
    },
    {
      slug: 'magician-hat',
      closed: 'black magician top hat with a colored hatband (teal/gold — hat body may be charcoal but band must be bright), upright, 3/4',
      open: 'SAME hat: tipped toward camera showing empty teal interior cavity, no rabbit',
    },
    {
      slug: 'laundry-hamper',
      closed: 'woven laundry hamper, lid on, 3/4 view, warm tan + teal lid',
      open: 'SAME hamper: lid open, empty kraft interior, no clothes',
    },
    {
      slug: 'cauldron',
      closed: 'iron cauldron with a copper lid on, 3/4 view, short legs, not scary',
      open: 'SAME cauldron: lid off, empty dark-olive hollow, no potion',
    },
    {
      slug: 'grill',
      closed: 'kettle barbecue grill, lid closed, 3/4 view, apple-red body (NOT black), short legs',
      open: 'SAME red grill: lid open, empty charcoal-gray grate cavity (mid-tone, not pure black), no food',
    },
    {
      slug: 'dishwasher',
      closed: 'front-load dishwasher, door closed, front view, mint-green body (NOT stainless/white), NO brand text',
      open: 'SAME mint dishwasher: door open down, empty olive racks, no dishes',
    },
    {
      slug: 'toolbox',
      closed: 'red metal toolbox, lid shut, 3/4 view, handle on top, NO brand text',
      open: 'SAME toolbox: lid open, empty walnut-brown tray interior, no tools',
    },
    {
      slug: 'cooler',
      closed: 'picnic cooler, lid closed, 3/4 view, cyan body + white lid OK, NO logos',
      open: 'SAME cooler: lid open, empty teal interior, no ice/drinks',
    },
    {
      slug: 'hamster-cage',
      closed: 'small pet cage, door shut, 3/4 view, colorful plastic base (not gray), empty, no hamster',
      open: 'SAME cage: wire door open, empty mid-tone interior, still no hamster',
    },
    {
      slug: 'waffle-iron',
      closed: 'electric waffle iron, plates closed, 3/4 view, cherry-red body, NO brand text',
      open: 'SAME waffle iron: plates open, empty golden grid interiors, no waffle',
    },
    {
      slug: 'blender',
      closed: 'kitchen blender, lid on pitcher, 3/4 view, lime-green base, clear-ish pitcher showing empty teal interior, NO brand',
      open: 'SAME blender: lid off, empty teal pitcher cavity, no smoothie',
    },
  ],
  singles: [
    { slug: 'mixing-bowl', brief: 'empty large mixing bowl, ceramic teal interior, 3/4 view from above-front, no food no whisk' },
    { slug: 'cutting-board', brief: 'empty wooden cutting board, 3/4 view, no food no knife, clear wood grain' },
    { slug: 'sandbox', brief: 'empty kids sandbox with low wooden frame, brown sand only, no toys, 3/4 view' },
    { slug: 'dump-truck-bed', brief: 'toy dump truck, empty open bed as a put-in target, bright yellow/orange, 3/4 view, no dirt, NO text' },
    { slug: 'wheelbarrow', brief: 'empty garden wheelbarrow, 3/4 view, red tub, no dirt no plants' },
    { slug: 'shopping-cart', brief: 'empty metal shopping cart, 3/4 view, no groceries, kid-friendly scale' },
    { slug: 'fishbowl', brief: 'round glass fishbowl, water + pebbles only, no fish no plants, 3/4 view' },
    { slug: 'nest', brief: 'empty bird nest of twigs, 3/4 view from above-front, no eggs no bird' },
    { slug: 'pond', brief: 'small round garden pond, water surface + stones, no fish no frogs, 3/4 view, put-in target' },
    { slug: 'cake-stand', brief: 'empty pedestal cake stand, 3/4 view, pastel plate, no cake' },
  ],
};

export const WAVE3 = {
  id: 'wave3',
  title: 'ESL hero targets wave3 crew — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave3-crew',
  pairs: [
    {
      slug: 'birdhouse',
      closed: 'wooden birdhouse, entrance covered by a tiny door/flap, 3/4 view, painted teal, no bird',
      open: 'SAME birdhouse: flap open, empty walnut hollow, still no bird',
    },
    {
      slug: 'tree-hollow',
      closed: 'stout cartoon tree trunk, hollow covered by bark door, 3/4 view, green leaves on top',
      open: 'SAME tree: bark door open, empty dark-olive hollow, no animals',
    },
    {
      slug: 'doll-cradle',
      closed: 'wooden doll cradle, hood/canopy down covering the bed, 3/4 view, pastel, no doll',
      open: 'SAME cradle: canopy up, empty mid-tone mattress hollow, still no doll',
    },
    {
      slug: 'toy-oven',
      closed: 'plastic toy kitchen oven, door closed, front view, pink/teal, NO brand text',
      open: 'SAME toy oven: door open, empty lilac interior, no play food',
    },
    {
      slug: 'puppet-theater',
      closed: 'tabletop puppet theater, curtain closed across the stage, front view, red/gold, NO letters',
      open: 'SAME theater: curtain pulled aside, empty dark-teal stage cavity, no puppets',
    },
    {
      slug: 'gumball-machine',
      closed: 'classic gumball machine, globe closed, 3/4 view, red base, colorful unlabeled gumballs, NO text',
      open: 'SAME machine: bottom chute flap open, empty dark chute; globe still closed. NO text',
    },
    {
      slug: 'first-aid-kit',
      closed: 'first-aid box, lid shut, 3/4 view, white cross as a SHAPE only (no letters), red body',
      open: 'SAME kit: lid open, empty olive interior, no bandages',
    },
    {
      slug: 'guitar-case',
      closed: 'hard guitar case, latches closed, 3/4 view, teal body',
      open: 'SAME case: lid open, empty velvet-plum interior, no guitar',
    },
    {
      slug: 'garden-gate',
      closed: 'picket garden gate in a short fence section, closed, front view, mint green',
      open: 'SAME gate: swung open, empty charcoal path cavity behind (not white lawn)',
    },
    {
      slug: 'handbag',
      closed: 'kid-sized handbag, flap closed, 3/4 view, bright magenta, no logos',
      open: 'SAME bag: flap open, empty colored interior (not white, not black)',
    },
    {
      slug: 'shopping-bag',
      closed: 'paper shopping bag, top rolled/closed, 3/4 view, kraft + teal handles, NO logos/text',
      open: 'SAME bag: top open, empty kraft interior, no items',
    },
    {
      slug: 'teapot',
      closed: 'ceramic teapot, lid on, 3/4 view, painted flowers, NO letters, cheerful blue',
      open: 'SAME teapot: lid off, empty teal interior, no tea',
    },
    {
      slug: 'camp-stove',
      closed: 'portable camp stove, lid/cover closed, 3/4 view, orange body, NO brand text',
      open: 'SAME stove: cover open, empty burner cavity, no pot',
    },
    {
      slug: 'bread-box',
      closed: 'kitchen bread box, roll-top/lid closed, 3/4 view, cream body OK if not white-hot, wood trim, NO text',
      open: 'SAME bread box: lid open, empty walnut interior, no bread',
    },
    {
      slug: 'rice-cooker',
      closed: 'rice cooker, lid closed, 3/4 view, pale-blue body (NOT white/steel), NO brand text',
      open: 'SAME cooker: lid open, empty olive inner pot, no rice',
    },
    {
      slug: 'pet-carrier',
      closed: 'plastic pet carrier, door shut, 3/4 view, coral/teal, empty, no animal, NO brand',
      open: 'SAME carrier: wire door open, empty mid-tone interior, still no animal',
    },
    {
      slug: 'toy-castle-keep',
      closed: 'toy castle keep, front gate/door closed, 3/4 view, gray stone + bright banners (no letters)',
      open: 'SAME keep: gate open, empty walnut courtyard cavity, no figures',
    },
    {
      slug: 'doll-stroller',
      closed: 'doll stroller, canopy down covering the seat, 3/4 view, pink, no doll',
      open: 'SAME stroller: canopy up, empty seat hollow, still no doll',
    },
    {
      slug: 'egg-carton',
      closed: 'egg carton, lid closed, 3/4 view, pale pulp carton (body OK), no printed text',
      open: 'SAME carton: lid open, empty tan cups, no eggs',
    },
    {
      slug: 'mason-jar',
      closed: 'glass mason jar, metal lid on, 3/4 view, empty but lid sealed, slight teal glass',
      open: 'SAME jar: lid off, empty teal-glass interior, no jam',
    },
  ],
  singles: [
    { slug: 'felt-board', brief: 'empty upright felt board on a stand, solid colored felt (not white), no letters no shapes stuck on, front 3/4' },
    { slug: 'puzzle-board', brief: 'empty jigsaw puzzle board/tray, flat, no pieces, 3/4 view from above-front' },
    { slug: 'spinner-board', brief: 'empty game spinner board, colorful circle with a spinner arrow, NO numbers/letters/words' },
    { slug: 'dice-tray', brief: 'empty felt dice tray with raised rim, 3/4 view, no dice' },
    { slug: 'goal-net', brief: 'small soccer goal with net as a put-in target, 3/4 view, empty net, no ball' },
    { slug: 'basketball-backboard', brief: 'mini basketball backboard + hoop + net, front 3/4, empty hoop as a put-through target, NO text/logos' },
    { slug: 'hopscotch', brief: 'hopscotch grid on the ground as a put-on target, pastel squares, NO numbers/letters' },
    { slug: 'taco-shell', brief: 'empty hard taco shell standing, 3/4 view, no fillings' },
    { slug: 'ice-cream-cone', brief: 'empty waffle cone pointing up, 3/4 view, no ice cream scoop' },
    { slug: 'hotdog-bun', brief: 'empty hotdog bun split open, 3/4 view, no sausage no toppings' },
  ],
};

/** Wave4 — NEW put-in / put-on heroes. No overlap with waves 1–3. */
export const WAVE4 = {
  id: 'wave4',
  title: 'ESL hero targets wave4 — 20 put-in/on pairs + 10 surfaces (medium)',
  kind: 'hero-targets-wave4',
  pairs: [
    {
      slug: 'wardrobe',
      closed: 'kids wardrobe/armoire, both doors shut, front view, painted teal wood, handles visible',
      open: 'SAME wardrobe: both doors open, empty walnut hanging cavity, no clothes',
    },
    {
      slug: 'pantry',
      closed: 'tall kitchen pantry cabinet, doors shut, front view, warm wood, no labels',
      open: 'SAME pantry: doors open, empty walnut shelves, no food',
    },
    {
      slug: 'dryer',
      closed: 'clothes dryer, round door closed, front view, butter-yellow body (NOT white/steel), NO brand text',
      open: 'SAME yellow dryer: round door open, empty teal drum (not a black hole), no clothes',
    },
    {
      slug: 'freezer',
      closed: 'upright freezer, door closed, front view, icy-blue body (NOT white/steel), NO brand text',
      open: 'SAME freezer: door open, empty olive shelves, no food',
    },
    {
      slug: 'toaster',
      closed: 'two-slice toaster, empty slots looking closed/idle, 3/4 view, cherry-red body, NO brand',
      open: 'SAME toaster: a slice-sized flap/lever down showing empty teal slot cavities, no bread',
    },
    {
      slug: 'honey-pot',
      closed: 'ceramic honey pot, lid on, 3/4 view, painted bees as SHAPES only (no words), golden glaze',
      open: 'SAME pot: lid off, empty amber interior, no honey dipper',
    },
    {
      slug: 'cereal-box',
      closed: 'cereal box standing, top flaps closed, 3/4 view, bright colors, painted grain shapes, NO letters/logos',
      open: 'SAME box: top open, empty kraft interior, no cereal',
    },
    {
      slug: 'tissue-box',
      closed: 'rectangular tissue box, slit closed/no tissue showing, 3/4 view, floral pattern, NO text',
      open: 'SAME box: top open, empty teal interior, no tissues',
    },
    {
      slug: 'duffel-bag',
      closed: 'sports duffel bag, zipper closed, 3/4 view, bright orange, no logos',
      open: 'SAME duffel: unzipped open, empty colored interior (not white, not black), no clothes',
    },
    {
      slug: 'playhouse',
      closed: 'kids plastic playhouse, door closed, 3/4 view, pink/teal, short building',
      open: 'SAME playhouse: door open, empty mid-tone interior, no furniture clutter',
    },
    {
      slug: 'dog-house',
      closed: 'wooden dog house, arched door covered by a flap, 3/4 view, red roof, no dog',
      open: 'SAME dog house: flap open, empty walnut hollow, still no dog',
    },
    {
      slug: 'rabbit-hutch',
      closed: 'garden rabbit hutch, door shut, 3/4 view, wood + wire, empty, no rabbit',
      open: 'SAME hutch: door open, empty mid-tone interior, still no rabbit',
    },
    {
      slug: 'chicken-coop',
      closed: 'small chicken coop, door shut, 3/4 view, red/wood, no chickens',
      open: 'SAME coop: door open, empty walnut interior, still no chickens',
    },
    {
      slug: 'barn',
      closed: 'toy barn, big front doors closed, 3/4 view, red barn + white trim OK, NO letters',
      open: 'SAME barn: doors open, empty walnut interior, no animals',
    },
    {
      slug: 'shed',
      closed: 'garden shed, door closed, 3/4 view, green walls, short building',
      open: 'SAME shed: door open, empty charcoal-olive interior, no tools',
    },
    {
      slug: 'window',
      closed: 'simple window in a short wall section, panes closed, front view, teal frame',
      open: 'SAME window: sash/casement open, empty mid-tone opening (not white sky filling the cell)',
    },
    {
      slug: 'school-desk',
      closed: 'lift-lid school desk, lid closed, 3/4 view, wood + metal legs, no books on top',
      open: 'SAME desk: lid open, empty walnut well, no pencils',
    },
    {
      slug: 'bento-box',
      closed: 'bento lunch box, lid on, 3/4 view, coral/teal, NO text',
      open: 'SAME bento: lid off, empty compartments in olive/teal, no food',
    },
    {
      slug: 'casserole',
      closed: 'ceramic casserole dish with lid on, 3/4 view, painted flowers, NO letters, orange glaze',
      open: 'SAME dish: lid off, empty walnut interior, no food',
    },
    {
      slug: 'medicine-cabinet',
      closed: 'bathroom medicine cabinet, mirrored door closed, front view, mint frame, NO text',
      open: 'SAME cabinet: door open, empty olive shelves, no bottles',
    },
  ],
  singles: [
    { slug: 'plate', brief: 'empty round dinner plate, 3/4 view from above-front, solid colored rim, no food' },
    { slug: 'fruit-bowl', brief: 'empty fruit bowl, ceramic, 3/4 view, no fruit' },
    { slug: 'bed', brief: 'made kid bed as a put-on target, empty top, colorful quilt, no person, 3/4 view' },
    { slug: 'sofa', brief: 'empty two-seat sofa as a put-on target, bright color, no pillows clutter, 3/4 view' },
    { slug: 'picnic-table', brief: 'empty picnic table with benches, 3/4 view, no food no people' },
    { slug: 'throne', brief: 'empty fancy throne chair as a put-on target, 3/4 view, gold + teal, no person' },
    { slug: 'stage', brief: 'empty small theater stage platform with curtains at sides, 3/4 view, empty boards, no actors' },
    { slug: 'kiddie-pool', brief: 'empty round plastic kiddie pool, 3/4 view, bright blue, little water, no toys' },
    { slug: 'bird-bath', brief: 'garden bird bath, empty shallow basin, 3/4 view, stone/teal, no birds' },
    { slug: 'wagon', brief: 'empty kids pull wagon, red, 3/4 view, open bed as a put-in target, no cargo, NO text' },
  ],
};

/** Wave5 — NEW put-in / put-on / hide-reveal / sorting heroes. No overlap with 1–4. */
export const WAVE5 = {
  id: 'wave5',
  title: 'ESL hero targets wave5 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave5',
  pairs: [
    {
      slug: 'dresser',
      closed: 'kids wooden dresser, ALL drawer fronts flush closed, 3/4 view, painted coral, round knobs, no clothes',
      open: 'SAME dresser: ONE top drawer pulled out, empty walnut well, other drawers stay shut, no clothes',
    },
    {
      slug: 'nightstand',
      closed: 'small bedside nightstand, drawer front flush closed, 3/4 view, teal wood, lamp-less empty top',
      open: 'SAME nightstand: drawer pulled open, empty walnut well, no books',
    },
    {
      slug: 'cubby',
      closed: 'classroom cubby cubicle with a small door shut, 3/4 view, bright yellow wood, no backpack, NO letters',
      open: 'SAME cubby: door open, empty kraft interior, still no backpack',
    },
    {
      slug: 'crayon-box',
      closed: 'flip-lid crayon box standing, lid closed, 3/4 view, bright colors, crayon SHAPES only, NO letters/logos',
      open: 'SAME box: lid open, empty row of teal wells, no crayons',
    },
    {
      slug: 'paint-box',
      closed: 'watercolor tin paint box, lid closed, 3/4 view, cherry-red metal, NO brand text',
      open: 'SAME tin: lid open, empty olive pan wells, no paints no brush',
    },
    {
      slug: 'pizza-box',
      closed: 'square pizza box, lid closed, 3/4 view, kraft cardboard + red pattern SHAPES, NO letters/logos',
      open: 'SAME box: lid open, empty kraft interior, no pizza',
    },
    {
      slug: 'takeout-box',
      closed: 'folded paper takeout box, top flaps closed, 3/4 view, white-red wire handle OK, body kraft/teal not white-hot, NO text',
      open: 'SAME box: top open, empty kraft interior, no noodles',
    },
    {
      slug: 'milk-carton',
      closed: 'gabled milk carton, top fully closed, 3/4 view, sky-blue body, painted cow SHAPE only, NO letters',
      open: 'SAME carton: spout/top open, empty teal interior, no milk',
    },
    {
      slug: 'ice-cream-tub',
      closed: 'round ice-cream tub, lid on, 3/4 view, pastel mint body, painted scoop SHAPES, NO letters',
      open: 'SAME tub: lid off, empty teal interior, no ice cream',
    },
    {
      slug: 'sugar-bowl',
      closed: 'ceramic sugar bowl, lid on with a knob, 3/4 view, painted flowers, NO letters, sunny yellow',
      open: 'SAME bowl: lid off, empty cream-to-gold interior (not white-hot), no sugar',
    },
    {
      slug: 'kettle',
      closed: 'stovetop kettle, lid on, 3/4 view, apple-red body + teal handle, NO brand text',
      open: 'SAME kettle: lid off, empty olive interior, no water',
    },
    {
      slug: 'saucepan',
      closed: 'saucepan with lid on, 3/4 view, teal pot + copper lid, one long handle, NO brand',
      open: 'SAME pan: lid off, empty walnut interior, no food',
    },
    {
      slug: 'air-fryer',
      closed: 'countertop air fryer, basket fully inserted/closed, 3/4 view, coral body (NOT white/steel), NO brand text',
      open: 'SAME fryer: basket pulled out, empty olive basket cavity, no food',
    },
    {
      slug: 'toaster-oven',
      closed: 'small toaster oven, glass door closed, 3/4 view, mint-green body (NOT white/steel), NO brand text',
      open: 'SAME oven: door open downward, empty walnut cavity, no food no rack clutter',
    },
    {
      slug: 'trash-can',
      closed: 'kitchen trash can, lid shut, 3/4 view, bright lime-green body, no trash showing',
      open: 'SAME can: lid up/open, empty charcoal-olive interior (mid-tone, not a black hole), no trash',
    },
    {
      slug: 'ottoman',
      closed: 'storage ottoman, lid closed, 3/4 view, magenta fabric cube, no buttons-as-text',
      open: 'SAME ottoman: lid open, empty plum interior, no blankets',
    },
    {
      slug: 'dollhouse',
      closed: 'wooden dollhouse, front facade closed like a little house, 3/4 view, pink/teal, door shut, no dolls',
      open: 'SAME dollhouse: front swung open, empty walnut rooms, no furniture clutter no dolls',
    },
    {
      slug: 'treehouse',
      closed: 'wooden treehouse in a stout tree, hatch/door closed, 3/4 view, green leaves, no kids',
      open: 'SAME treehouse: hatch open, empty walnut interior, still no kids',
    },
    {
      slug: 'violin-case',
      closed: 'hard violin case, latches closed, 3/4 view, deep purple body',
      open: 'SAME case: lid open, empty velvet-plum interior shaped for a violin, no violin',
    },
    {
      slug: 'glasses-case',
      closed: 'hard glasses case, snap shut, 3/4 view, bright orange, no logos',
      open: 'SAME case: lid open, empty teal interior, no glasses',
    },
  ],
  singles: [
    { slug: 'chalkboard', brief: 'empty classroom chalkboard, dark GREEN board + wood frame, no letters no chalk, front 3/4' },
    { slug: 'cork-board', brief: 'empty brown cork bulletin board, teal frame, no pins no papers, front 3/4' },
    { slug: 'easel', brief: 'empty kids A-frame art easel, kraft/teal paper on it (NOT white), no drawings, 3/4 view' },
    { slug: 'muffin-tin', brief: 'empty colorful 6-cup muffin tin as a sorting target, 3/4 view from above-front, no muffins' },
    { slug: 'ice-cube-tray', brief: 'empty teal ice-cube tray as a sorting target, 3/4 view from above-front, no ice' },
    { slug: 'building-baseplate', brief: 'empty bright-green studded building-brick baseplate as a build surface, 3/4, no bricks, NO logos' },
    { slug: 'water-table', brief: 'empty plastic kids water table, 3/4 view, bright teal, shallow water only, no toys' },
    { slug: 'trampoline', brief: 'empty mini trampoline as a put-on target, 3/4 view, colored pad + short legs, no person' },
    { slug: 'beanbag', brief: 'empty beanbag chair as a put-on target, bright orange, 3/4 view, no person' },
    { slug: 'picnic-blanket', brief: 'empty spread picnic blanket as a put-on target, red gingham, 3/4 from above-front, no food' },
  ],
};

/** Wave6 — next pipeline fill. No overlap with waves 1–5. */
export const WAVE6 = {
  id: 'wave6',
  title: 'ESL hero targets wave6 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave6',
  pairs: [
    {
      slug: 'filing-cabinet',
      closed: 'short 2-drawer filing cabinet, both drawers flush closed, front view, painted teal metal, NO labels/text',
      open: 'SAME cabinet: top drawer pulled open, empty walnut well, bottom stays shut',
    },
    {
      slug: 'shoe-box',
      closed: 'rectangular shoe box, lid on, 3/4 view, coral/kraft, painted shoe SHAPE only, NO letters',
      open: 'SAME box: lid off, empty kraft interior, no shoes',
    },
    {
      slug: 'hat-box',
      closed: 'round hat box, lid on, 3/4 view, magenta stripes, no letters',
      open: 'SAME box: lid off, empty plum interior, no hat',
    },
    {
      slug: 'gift-bag',
      closed: 'paper gift bag, top folded/closed, 3/4 view, teal + gold tissue peeking as SHAPE only, NO letters',
      open: 'SAME bag: top open, empty kraft interior, no tissue clutter',
    },
    {
      slug: 'lunch-bag',
      closed: 'brown paper lunch bag, top rolled closed, 3/4 view, kraft, no logos',
      open: 'SAME bag: top open, empty kraft interior, no food',
    },
    {
      slug: 'messenger-bag',
      closed: 'kid messenger bag, flap closed, 3/4 view, bright yellow, no logos',
      open: 'SAME bag: flap open, empty olive interior, no books',
    },
    {
      slug: 'briefcase',
      closed: 'kid-sized briefcase, latches closed, 3/4 view, cherry-red, no logos',
      open: 'SAME case: lid open, empty walnut interior, no papers',
    },
    {
      slug: 'thermos',
      closed: 'lunch thermos, lid/cup on, 3/4 view, sky-blue body, NO brand text',
      open: 'SAME thermos: lid off, empty teal interior, no soup',
    },
    {
      slug: 'water-bottle',
      closed: 'kids water bottle, cap on, 3/4 view, lime-green, NO brand text',
      open: 'SAME bottle: cap off, empty teal interior, no water',
    },
    {
      slug: 'coffee-pot',
      closed: 'glass coffee carafe with lid on, 3/4 view, orange handle/lid, empty teal-glass, NO brand',
      open: 'SAME pot: lid off, empty teal-glass interior, no coffee',
    },
    {
      slug: 'slow-cooker',
      closed: 'slow cooker, lid on, 3/4 view, butter-yellow crock (NOT white/steel), NO brand text',
      open: 'SAME cooker: lid off, empty olive interior, no stew',
    },
    {
      slug: 'dutch-oven',
      closed: 'enameled dutch oven, lid on, 3/4 view, cobalt-blue pot + matching lid, short loop handles',
      open: 'SAME pot: lid off, empty walnut interior, no food',
    },
    {
      slug: 'popcorn-popper',
      closed: 'tabletop popcorn popper, lid on, 3/4 view, cherry-red body, NO brand text',
      open: 'SAME popper: lid off, empty olive kettle, no popcorn',
    },
    {
      slug: 'cake-dome',
      closed: 'cake stand with a glass dome cover on, 3/4 view, pastel plate, empty under the dome',
      open: 'SAME stand: dome off, empty pastel plate, no cake',
    },
    {
      slug: 'compost-bin',
      closed: 'garden compost bin, lid shut, 3/4 view, apple-green plastic, NO text',
      open: 'SAME bin: lid open, empty kraft-olive interior, no scraps',
    },
    {
      slug: 'greenhouse',
      closed: 'small backyard greenhouse, door closed, 3/4 view, mint frame + teal-glass panels, no plants',
      open: 'SAME greenhouse: door open, empty mid-tone interior, still no plants',
    },
    {
      slug: 'blanket-fort',
      closed: 'chair-and-blanket fort, blanket closed across the entrance, 3/4 view, colorful blankets, no kids',
      open: 'SAME fort: blanket lifted aside, empty walnut hide-cavity inside, still no kids',
    },
    {
      slug: 'igloo',
      closed: 'toy igloo, entrance blocked by a snow door, 3/4 view, icy-blue (not white-hot), no people',
      open: 'SAME igloo: door open, empty teal interior cave, still no people',
    },
    {
      slug: 'cave',
      closed: 'small cartoon rock cave, mouth covered by a boulder door, 3/4 view, warm stone + moss',
      open: 'SAME cave: boulder aside, empty dark-olive hollow, no animals',
    },
    {
      slug: 'cash-register',
      closed: 'toy cash register, drawer shut, 3/4 view, gold + teal, buttons as SHAPES only, NO numbers/letters',
      open: 'SAME register: drawer open, empty olive till, no coins',
    },
  ],
  singles: [
    { slug: 'highchair', brief: 'empty baby highchair as a put-on target, 3/4 view, bright colors, no baby no tray food' },
    { slug: 'rocking-chair', brief: 'empty wooden rocking chair as a put-on target, 3/4 view, painted teal, no person' },
    { slug: 'slide', brief: 'empty kids playground slide as a put-on target, 3/4 view, cherry-red, no child' },
    { slug: 'swing', brief: 'empty kids swing on a small A-frame, 3/4 view, yellow seat, no child' },
    { slug: 'seesaw', brief: 'empty playground seesaw, 3/4 view, teal/orange, no children' },
    { slug: 'flower-pot', brief: 'empty terracotta flower pot as a put-in target, 3/4 view, no plant no soil mound' },
    { slug: 'watering-can', brief: 'empty metal watering can as a put-in target, 3/4 view, apple-red, no water splash' },
    { slug: 'play-mat', brief: 'empty kids floor play-mat as a put-on target, 3/4 from above-front, colorful roads/fields as SHAPES, NO letters' },
    { slug: 'frying-pan', brief: 'empty frying pan as a put-on target, 3/4 view, teal pan + black handle, no food' },
    { slug: 'colander', brief: 'empty kitchen colander as a put-in target, 3/4 view, lime-green, no pasta' },
  ],
};

/** Wave7 — NEW put-in / put-on / hide-reveal / sorting / build-surface. No overlap with 1–6. */
export const WAVE7 = {
  id: 'wave7',
  title: 'ESL hero targets wave7 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave7',
  pairs: [
    {
      slug: 'sewing-box',
      closed: 'wooden sewing box, lid shut, 3/4 view, painted coral + teal, button SHAPES only, NO letters',
      open: 'SAME box: lid open, empty walnut tray interior, no thread no scissors',
    },
    {
      slug: 'tackle-box',
      closed: 'plastic fishing tackle box, latches closed, 3/4 view, bright orange, NO brand text',
      open: 'SAME box: lid open, empty olive tray wells, no lures',
    },
    {
      slug: 'makeup-case',
      closed: 'hard makeup case, latch closed, 3/4 view, magenta, no logos',
      open: 'SAME case: lid open, empty plum interior, no makeup',
    },
    {
      slug: 'camera-bag',
      closed: 'padded camera bag, flap closed, 3/4 view, mustard-yellow, no logos',
      open: 'SAME bag: flap open, empty olive interior, no camera',
    },
    {
      slug: 'flute-case',
      closed: 'hard flute case, latches closed, 3/4 view, slim teal body',
      open: 'SAME case: lid open, empty velvet-plum interior shaped for a flute, no flute',
    },
    {
      slug: 'tote-bag',
      closed: 'canvas tote bag, top folded/closed, 3/4 view, sky-blue, NO letters/logos',
      open: 'SAME tote: top open, empty kraft interior, no items',
    },
    {
      slug: 'cookie-tin',
      closed: 'round metal cookie tin, lid on, 3/4 view, cherry-red with painted cookie SHAPES, NO letters',
      open: 'SAME tin: lid off, empty kraft interior, no cookies',
    },
    {
      slug: 'tea-caddy',
      closed: 'square tea caddy tin, lid on, 3/4 view, painted flowers, NO letters, jade-green',
      open: 'SAME caddy: lid off, empty olive interior, no tea bags',
    },
    {
      slug: 'flour-canister',
      closed: 'kitchen flour canister, lid on, 3/4 view, cream body OK if not white-hot, wood lid, painted wheat SHAPE, NO letters',
      open: 'SAME canister: lid off, empty kraft interior, no flour',
    },
    {
      slug: 'pressure-cooker',
      closed: 'stovetop pressure cooker, lid locked on with a weight, 3/4 view, apple-red pot (NOT steel), NO brand text',
      open: 'SAME cooker: lid off, empty walnut interior, no food',
    },
    {
      slug: 'steamer',
      closed: 'bamboo steamer, lid on, 3/4 view, warm wood + teal band',
      open: 'SAME steamer: lid off, empty kraft-wood basket, no dumplings',
    },
    {
      slug: 'sandwich-press',
      closed: 'electric sandwich press, plates closed, 3/4 view, lime-green body, NO brand text',
      open: 'SAME press: plates hinged open, empty golden grill interiors, no sandwich',
    },
    {
      slug: 'ice-cream-maker',
      closed: 'countertop ice-cream maker, lid on, 3/4 view, pastel mint body (NOT white/steel), NO brand text',
      open: 'SAME maker: lid off, empty teal freezer-bowl cavity, no ice cream',
    },
    {
      slug: 'terrarium',
      closed: 'glass terrarium, lid/cloche on, 3/4 view, mint frame, pebbles only, no plants no bugs',
      open: 'SAME terrarium: lid off, empty mid-tone pebble floor, still no plants',
    },
    {
      slug: 'wooden-crate',
      closed: 'slatted wooden crate, lid on, 3/4 view, warm pine + teal stencil SHAPES, NO letters',
      open: 'SAME crate: lid off, empty walnut interior, no produce',
    },
    {
      slug: 'china-cabinet',
      closed: 'glass-front china cabinet, doors shut, front view, painted cream-teal wood, empty shelves visible through glass OK',
      open: 'SAME cabinet: both doors open, empty walnut shelves, no dishes',
    },
    {
      slug: 'music-box',
      closed: 'small music box, lid shut, 3/4 view, gold + magenta, painted note SHAPES, NO letters',
      open: 'SAME box: lid open, empty plum interior, no ballerina no comb',
    },
    {
      slug: 'jack-in-the-box',
      closed: 'jack-in-the-box, lid shut, 3/4 view, circus stripes (red/teal), crank visible, NO letters, no clown showing',
      open: 'SAME box: lid sprung open, empty kraft interior (NO clown — empty play cavity only)',
    },
    {
      slug: 'display-case',
      closed: 'tabletop glass display case, lid/door shut, 3/4 view, gold frame + teal glass, empty',
      open: 'SAME case: lid open, empty olive interior tray, no trophies',
    },
    {
      slug: 'shoe-cabinet',
      closed: 'short shoe cabinet, doors shut, 3/4 view, painted coral wood, no shoes showing',
      open: 'SAME cabinet: doors open, empty walnut cubbies, no shoes',
    },
  ],
  singles: [
    { slug: 'pocket-chart', brief: 'empty classroom pocket chart hanging, colorful rows of empty fabric pockets, no cards no letters, front 3/4' },
    { slug: 'whiteboard', brief: 'empty classroom whiteboard, teal frame, board is pale-blue (NOT white-hot), no writing no magnets, front 3/4' },
    { slug: 'magnetic-board', brief: 'empty magnetic board as a put-on target, apple-red metal, no magnets no letters, front 3/4' },
    { slug: 'pegboard', brief: 'empty pegboard as a put-on/build surface, honey wood with empty holes, teal frame, no pegs, front 3/4' },
    { slug: 'ten-frame', brief: 'empty ten-frame sorting tray, 2×5 wells, 3/4 from above-front, teal wells, no counters' },
    { slug: 'paint-palette', brief: 'empty kidney paint palette as a sorting target, 3/4 from above-front, wood + empty teal wells, no paint' },
    { slug: 'light-table', brief: 'empty kids light-table as a build surface, 3/4 view, glowing teal panel, no shapes on it' },
    { slug: 'workbench', brief: 'empty kids workbench as a build surface, 3/4 view, wood top + red vise, no tools no projects' },
    { slug: 'kitchen-counter', brief: 'empty short kitchen counter as a put-on target, 3/4 view, teal backsplash + wood top, no food no appliances' },
    { slug: 'bucket', brief: 'empty plastic bucket as a put-in target, 3/4 view, cherry-red, handle up, no water no sand' },
  ],
};

/** Wave8 — next pipeline fill. No overlap with waves 1–7. */
export const WAVE8 = {
  id: 'wave8',
  title: 'ESL hero targets wave8 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave8',
  pairs: [
    {
      slug: 'saxophone-case',
      closed: 'hard saxophone case, latches closed, 3/4 view, deep gold-brass body',
      open: 'SAME case: lid open, empty velvet-plum interior shaped for a sax, no saxophone',
    },
    {
      slug: 'ukulele-case',
      closed: 'hard ukulele case, latches closed, 3/4 view, pineapple-yellow body',
      open: 'SAME case: lid open, empty teal interior, no ukulele',
    },
    {
      slug: 'laptop-bag',
      closed: 'padded laptop bag, zipper closed, 3/4 view, slate-teal, no logos',
      open: 'SAME bag: unzipped open, empty olive sleeve interior, no laptop',
    },
    {
      slug: 'diaper-bag',
      closed: 'diaper bag, zipper closed, 3/4 view, pastel coral, no logos no letters',
      open: 'SAME bag: unzipped open, empty kraft interior, no diapers',
    },
    {
      slug: 'knitting-bag',
      closed: 'fabric knitting bag, drawstring closed, 3/4 view, magenta with yarn SHAPES, NO letters',
      open: 'SAME bag: mouth open, empty plum interior, no yarn',
    },
    {
      slug: 'craft-box',
      closed: 'plastic craft organizer box, lid shut, 3/4 view, lime-green, NO brand text',
      open: 'SAME box: lid open, empty olive compartment wells, no beads',
    },
    {
      slug: 'spice-cabinet',
      closed: 'small wall spice cabinet, door shut, front 3/4, painted mustard wood, no labels',
      open: 'SAME cabinet: door open, empty walnut shelves, no jars',
    },
    {
      slug: 'cocoa-tin',
      closed: 'cocoa powder tin, lid on, 3/4 view, chocolate-brown + gold, painted mug SHAPE, NO letters',
      open: 'SAME tin: lid off, empty kraft interior, no powder',
    },
    {
      slug: 'coffee-can',
      closed: 'coffee can, lid on, 3/4 view, cherry-red metal, painted bean SHAPES, NO letters/logos',
      open: 'SAME can: lid off, empty kraft interior, no coffee',
    },
    {
      slug: 'stockpot',
      closed: 'tall stockpot, lid on, 3/4 view, cobalt-blue enamel, two side handles, NO brand',
      open: 'SAME pot: lid off, empty walnut interior, no soup',
    },
    {
      slug: 'wok',
      closed: 'wok with a lid on, 3/4 view, carbon-look bowl OK if mid-tone + cherry-red lid, long handle',
      open: 'SAME wok: lid off, empty olive interior, no food',
    },
    {
      slug: 'french-press',
      closed: 'french press, lid/plunger down, 3/4 view, orange lid + teal glass carafe, empty-looking, NO brand',
      open: 'SAME press: lid/plunger completely off, empty teal-glass carafe, no coffee',
    },
    {
      slug: 'tureen',
      closed: 'soup tureen, lid on with a knob, 3/4 view, painted flowers, NO letters, sunny yellow glaze',
      open: 'SAME tureen: lid off, empty gold-olive interior, no soup',
    },
    {
      slug: 'butter-dish',
      closed: 'ceramic butter dish, lid on, 3/4 view, painted flowers, NO letters, sky-blue',
      open: 'SAME dish: lid off, empty teal well, no butter',
    },
    {
      slug: 'ice-bucket',
      closed: 'party ice bucket, lid on, 3/4 view, silver-teal body (not chrome-white), gold handles',
      open: 'SAME bucket: lid off, empty teal interior, no ice no bottles',
    },
    {
      slug: 'playpen',
      closed: 'kids playpen, mesh door/panel zipped shut, 3/4 view, pastel teal frame, empty, no baby',
      open: 'SAME playpen: door panel open, empty mid-tone floor, still no baby',
    },
    {
      slug: 'crib',
      closed: 'baby crib, drop-side up / canopy down covering the mattress, 3/4 view, white-wood OK if not white-hot + teal, no baby',
      open: 'SAME crib: side down / canopy up, empty mid-tone mattress hollow, still no baby',
    },
    {
      slug: 'toy-sink',
      closed: 'plastic toy kitchen sink cabinet, doors shut, 3/4 view, pink/teal, empty basin on top OK',
      open: 'SAME sink: cabinet doors open, empty kraft interior, no play dishes',
    },
    {
      slug: 'lemonade-stand',
      closed: 'kids lemonade stand, service window shutter closed, 3/4 view, yellow/teal, painted lemon SHAPES, NO letters',
      open: 'SAME stand: shutter up, empty walnut counter cavity, no pitcher',
    },
    {
      slug: 'phone-booth',
      closed: 'classic phone booth, door closed, 3/4 view, cherry-red, empty inside, NO letters/logos',
      open: 'SAME booth: door open, empty teal interior, no phone clutter',
    },
  ],
  singles: [
    { slug: 'serving-platter', brief: 'empty oval serving platter as a put-on target, 3/4 from above-front, teal rim, no food' },
    { slug: 'baking-sheet', brief: 'empty metal baking sheet as a put-on target, 3/4 from above-front, gold-tan (not steel-white), no cookies' },
    { slug: 'pie-tin', brief: 'empty pie tin as a put-in target, 3/4 from above-front, gold foil, no pie' },
    { slug: 'stool', brief: 'empty round kitchen stool as a put-on target, 3/4 view, cherry-red seat, no person' },
    { slug: 'hammock', brief: 'empty garden hammock as a put-on target, 3/4 view, rainbow fabric, no person' },
    { slug: 'yoga-mat', brief: 'empty rolled-out yoga mat as a put-on target, 3/4 from above-front, magenta, no person' },
    { slug: 'windowsill', brief: 'empty windowsill as a put-on target, 3/4 view, teal frame + wood ledge, no plants no objects' },
    { slug: 'doormat', brief: 'empty doormat as a put-on target, 3/4 from above-front, coir + coral border, NO letters' },
    { slug: 'well', brief: 'small wishing well as a put-in target, 3/4 view, stone + wood roof, empty dark-olive shaft (mid-tone, not a black hole), no bucket hanging' },
    { slug: 'lily-pad', brief: 'empty round lily pad on water as a put-on target, 3/4 from above-front, bright green, no frog' },
  ],
};

/** Wave9 — next pipeline fill. No overlap with waves 1–8. */
export const WAVE9 = {
  id: 'wave9',
  title: 'ESL hero targets wave9 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave9',
  pairs: [
    {
      slug: 'trumpet-case',
      closed: 'hard trumpet case, latches closed, 3/4 view, brass-gold body, compact horn-bell silhouette at one end',
      open: 'SAME case: lid open, empty velvet-plum interior shaped for a trumpet, no trumpet',
    },
    {
      slug: 'clarinet-case',
      closed: 'hard clarinet case, latches closed, 3/4 view, slim teal body',
      open: 'SAME case: lid open, empty olive interior shaped for a clarinet, no clarinet',
    },
    {
      slug: 'trombone-case',
      closed: 'long trombone case, latches closed, 3/4 view, cherry-red body, elongated horn shape',
      open: 'SAME case: lid open, empty walnut interior shaped for a trombone, no trombone',
    },
    {
      slug: 'drum-case',
      closed: 'round snare-drum case, latches closed, 3/4 view, cobalt-blue, flat circular profile',
      open: 'SAME case: lid open, empty teal interior ring, no drum',
    },
    {
      slug: 'coin-purse',
      closed: 'kid coin purse, clasp/kiss-lock shut, 3/4 view, bright magenta, no logos',
      open: 'SAME purse: clasp open, empty plum interior, no coins',
    },
    {
      slug: 'wallet',
      closed: 'folding wallet, snapped shut, 3/4 view, lime-green, no logos no cards showing',
      open: 'SAME wallet: folded open, empty olive card slots, no money',
    },
    {
      slug: 'recipe-box',
      closed: 'kitchen recipe box, lid on, 3/4 view, painted flowers, NO letters, sunny yellow',
      open: 'SAME box: lid off, empty kraft interior, no recipe cards',
    },
    {
      slug: 'photo-album',
      closed: 'photo album, cover closed, 3/4 view, teal cover with heart SHAPES only, NO letters',
      open: 'SAME album: cover open, empty cream-to-gold page wells (not white-hot), no photos',
    },
    {
      slug: 'scrapbook',
      closed: 'kids scrapbook, cover closed, 3/4 view, coral + star SHAPES, NO letters',
      open: 'SAME scrapbook: cover open, empty kraft page wells, no stickers',
    },
    {
      slug: 'yarn-basket',
      closed: 'woven yarn basket, lid on, 3/4 view, warm tan + teal lid, no yarn showing',
      open: 'SAME basket: lid off, empty walnut interior, no yarn balls',
    },
    {
      slug: 'laundry-basket',
      closed: 'plastic laundry basket, handles up, rim covered by a fabric lid, 3/4 view, sky-blue, no clothes',
      open: 'SAME basket: lid off, empty olive interior, no clothes',
    },
    {
      slug: 'bread-basket',
      closed: 'woven bread basket with a cloth cover tied shut, 3/4 view, tan + red check cloth, no bread',
      open: 'SAME basket: cloth cover pulled back, empty kraft interior, no bread',
    },
    {
      slug: 'ticket-booth',
      closed: 'outdoor ticket booth window, shutter closed, 3/4 view, cherry-red + teal trim, NO letters',
      open: 'SAME booth: shutter up, empty walnut counter cavity, no tickets',
    },
    {
      slug: 'food-truck',
      closed: 'cartoon food truck, service window shutter closed, 3/4 view, yellow body + teal awning, NO logos',
      open: 'SAME truck: service window open, empty olive serving cavity, no food',
    },
    {
      slug: 'ice-cream-truck',
      closed: 'ice-cream truck, side window/door closed, 3/4 view, pastel pink + teal, painted cone SHAPES, NO letters',
      open: 'SAME truck: window open, empty walnut counter well, no ice cream',
    },
    {
      slug: 'newspaper-stand',
      closed: 'outdoor newspaper stand, metal door closed, 3/4 view, red body, NO readable headlines',
      open: 'SAME stand: door open, empty olive rack interior, no papers',
    },
    {
      slug: 'bakery-case',
      closed: 'bakery display case, glass door shut, 3/4 view, gold frame + teal glass, empty shelves OK',
      open: 'SAME case: door open, empty walnut shelves, no pastries',
    },
    {
      slug: 'deli-case',
      closed: 'deli counter display case, sliding door shut, 3/4 view, mint frame + clear-ish glass, empty',
      open: 'SAME case: door slid open, empty olive tray interior, no meat/cheese',
    },
    {
      slug: 'snack-cart',
      closed: 'playground snack cart, umbrella down / lid closed, 3/4 view, orange + teal, NO text',
      open: 'SAME cart: lid/umbrella up, empty kraft bin interior, no snacks',
    },
    {
      slug: 'concession-stand',
      closed: 'fair concession stand counter, serving window shutter closed, 3/4 view, red/white stripes, NO letters',
      open: 'SAME stand: shutter up, empty walnut counter cavity, no popcorn',
    },
  ],
  singles: [
    { slug: 'park-bench', brief: 'empty park bench as a put-on target, 3/4 view, teal slats + iron legs, no person' },
    { slug: 'coat-rack', brief: 'empty standing coat rack as a put-on target, 3/4 view, cherry-red posts + hooks, no coats' },
    { slug: 'shoe-rack', brief: 'empty shoe rack as a put-on target, 3/4 view, wood + teal tiers, no shoes' },
    { slug: 'towel-rack', brief: 'empty bathroom towel rack as a put-on target, front 3/4, mint bars, no towels' },
    { slug: 'bathtub', brief: 'empty bathtub as a put-in target, 3/4 view, sky-blue enamel, no water no toys' },
    { slug: 'diving-board', brief: 'empty pool diving board as a put-on target, 3/4 view, teal board + white supports, no person' },
    { slug: 'balance-beam', brief: 'empty gymnastics balance beam as a put-on target, 3/4 view, cherry-red pad, no child' },
    { slug: 'carousel-platform', brief: 'empty carousel ride platform as a put-on target, 3/4 view, gold + teal, no horses no kids' },
    { slug: 'garden-stepping-stones', brief: 'short path of round garden stepping stones as a put-on target, 3/4 from above-front, colorful stones, no plants' },
    { slug: 'porch-swing', brief: 'empty porch swing as a put-on target, 3/4 view, painted teal wood, no person' },
  ],
};

/** Wave10 — next pipeline fill. No overlap with waves 1–9. */
export const WAVE10 = {
  id: 'wave10',
  title: 'ESL hero targets wave10 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave10',
  pairs: [
    {
      slug: 'bass-case',
      closed: 'hard bass-guitar case, latches closed, 3/4 view, deep purple body, long guitar silhouette',
      open: 'SAME case: lid open, empty velvet-plum interior shaped for a bass, no instrument',
    },
    {
      slug: 'cello-case',
      closed: 'hard cello case, latches closed, 3/4 view, mahogany-brown body, tall curved silhouette',
      open: 'SAME case: lid open, empty walnut interior shaped for a cello, no cello',
    },
    {
      slug: 'banjo-case',
      closed: 'hard banjo case, latches closed, 3/4 view, mustard-yellow body, round pot silhouette at bottom',
      open: 'SAME case: lid open, empty olive interior shaped for a banjo, no banjo',
    },
    {
      slug: 'harmonica-case',
      closed: 'small harmonica case, clasp shut, 3/4 view, cherry-red, pocket-sized',
      open: 'SAME case: clasp open, empty teal velvet slot, no harmonica',
    },
    {
      slug: 'sewing-basket',
      closed: 'wicker sewing basket, lid on, 3/4 view, warm tan + magenta pincushion knob, no fabric showing',
      open: 'SAME basket: lid off, empty walnut interior, no thread no scissors',
    },
    {
      slug: 'map-case',
      closed: 'tube map case, cap on both ends shut, 3/4 view, teal leather-look, no labels',
      open: 'SAME case: one cap off, empty kraft tube interior, no map',
    },
    {
      slug: 'binocular-case',
      closed: 'hard binocular case, latch closed, 3/4 view, olive-green, compact rectangular',
      open: 'SAME case: lid open, empty plum foam interior, no binoculars',
    },
    {
      slug: 'doll-trunk',
      closed: 'small doll trunk, lid shut with straps, 3/4 view, coral + gold trim, no doll',
      open: 'SAME trunk: lid open, empty walnut interior, no doll clothes',
    },
    {
      slug: 'window-box',
      closed: 'flower window box under a short sill, lid/shutter closed over soil, 3/4 view, teal wood, no plants',
      open: 'SAME window box: shutter open, empty dark-olive soil well, no flowers',
    },
    {
      slug: 'planter-box',
      closed: 'raised garden planter box, hinged lid closed, 3/4 view, cedar wood + teal brackets, no plants',
      open: 'SAME planter: lid open, empty kraft-olive soil cavity, no seedlings',
    },
    {
      slug: 'seed-tray',
      closed: 'greenhouse seed tray with a clear dome lid ON, 3/4 view, lime tray + transparent dome, empty',
      open: 'SAME tray: dome lid OFF beside tray, empty olive cells, no sprouts',
    },
    {
      slug: 'pencil-roll',
      closed: 'fabric pencil roll, ties/buckle closed, 3/4 view, sky-blue, no pencils showing',
      open: 'SAME roll: unrolled open, empty teal slots, no pencils',
    },
    {
      slug: 'tool-pouch',
      closed: 'canvas tool pouch, flap closed, 3/4 view, orange, no logos',
      open: 'SAME pouch: flap open, empty olive interior, no tools',
    },
    {
      slug: 'jewelry-trunk',
      closed: 'small jewelry trunk, lid shut with clasp, 3/4 view, magenta + gold, no jewelry showing',
      open: 'SAME trunk: lid open, empty plum velvet trays, no jewelry',
    },
    {
      slug: 'spice-drawer',
      closed: 'kitchen spice drawer front flush closed, 3/4 view, teal cabinet face, no labels',
      open: 'SAME drawer: pulled open, empty walnut wells, no jars',
    },
    {
      slug: 'utensil-drawer',
      closed: 'kitchen utensil drawer front flush closed, 3/4 view, cherry-red cabinet face, no handles-as-text',
      open: 'SAME drawer: pulled open, empty olive dividers, no utensils',
    },
    {
      slug: 'silverware-tray',
      closed: 'drawer silverware tray with a lid/cover shut, 3/4 view, cream-teal tray, no cutlery showing',
      open: 'SAME tray: cover off, empty walnut slots, no forks',
    },
    {
      slug: 'napkin-basket',
      closed: 'table napkin basket with a cloth cover tied shut, 3/4 view, woven tan + coral cloth, no napkins',
      open: 'SAME basket: cover pulled back, empty kraft interior, no napkins',
    },
    {
      slug: 'bread-bin',
      closed: 'countertop bread bin, roll-top/lid closed, 3/4 view, butter-yellow body, NO text',
      open: 'SAME bin: lid open, empty walnut interior, no bread',
    },
    {
      slug: 'tea-chest',
      closed: 'wooden tea chest, lid shut, 3/4 view, painted flowers, NO letters, jade-green',
      open: 'SAME chest: lid open, empty olive compartments, no tea bags',
    },
  ],
  singles: [
    { slug: 'porch-step', brief: 'empty front porch step as a put-on target, 3/4 view, teal painted wood, no person no objects' },
    { slug: 'fire-pit', brief: 'empty stone fire pit as a put-in target, 3/4 view, gray ring + dark-olive ash bowl (mid-tone), no flames' },
    { slug: 'campfire-ring', brief: 'empty campfire ring of stones as a put-in target, 3/4 view, warm rocks + charcoal-olive center, no fire' },
    { slug: 'tree-stump', brief: 'empty flat tree stump as a put-on target, 3/4 view, warm wood rings, no mushrooms' },
    { slug: 'log-bench', brief: 'empty half-log bench as a put-on target, 3/4 view, natural wood, no person' },
    { slug: 'river-rock', brief: 'single large smooth river rock as a put-on target, 3/4 view, teal-gray stone, clear ground' },
    { slug: 'stepping-stone', brief: 'single round garden stepping stone as a put-on target, 3/4 from above-front, coral stone, no grass overlap' },
    { slug: 'garden-bench', brief: 'empty garden bench as a put-on target, 3/4 view, green slats + iron frame, no person' },
    { slug: 'bus-stop-bench', brief: 'empty bus stop bench as a put-on target, 3/4 view, teal seat + shelter post, NO route numbers/letters' },
    { slug: 'dock-plank', brief: 'empty wooden dock plank section as a put-on target, 3/4 view, weathered teal wood, no boat no water splash crossing cell' },
  ],
};

/** Wave11 — next pipeline fill. No overlap with waves 1–10. */
export const WAVE11 = {
  id: 'wave11',
  title: 'ESL hero targets wave11 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave11',
  pairs: [
    { slug: 'bowling-bag', closed: 'bowling ball bag, zipper closed, 3/4 view, cherry-red nylon, round ball silhouette inside', open: 'SAME bag: zipper open, empty olive interior shaped for a ball, no ball' },
    { slug: 'golf-bag', closed: 'kids golf bag, top flap tied shut, 3/4 view, lime-green, no clubs showing', open: 'SAME bag: flap open, empty walnut dividers, no clubs' },
    { slug: 'tennis-racket-bag', closed: 'tennis racket cover, zipper closed, 3/4 view, sky-blue, slim racket outline', open: 'SAME cover: zipper open, empty teal sleeve, no racket' },
    { slug: 'soccer-ball-bag', closed: 'mesh soccer ball bag, drawstring cinched shut, 3/4 view, orange mesh, no ball showing', open: 'SAME bag: drawstring open, empty olive mesh pocket, no ball' },
    { slug: 'basketball-bag', closed: 'basketball carry bag, zipper closed, 3/4 view, cobalt-blue, round bulge silhouette', open: 'SAME bag: zipper open, empty plum interior, no ball' },
    { slug: 'volleyball-bag', closed: 'volleyball mesh bag, cord cinched shut, 3/4 view, teal mesh, no ball', open: 'SAME bag: cord loose, empty kraft-lined mesh, no ball' },
    { slug: 'baseball-bat-bag', closed: 'baseball bat bag, zipper closed, 3/4 view, navy + red stripes, long slim silhouette', open: 'SAME bag: zipper open, empty olive tube interior, no bat' },
    { slug: 'hockey-bag', closed: 'hockey gear bag, main zipper closed, 3/4 view, black-red (clearly colored, not near-black ghost), bulky duffel', open: 'SAME bag: zipper open, empty walnut cavity, no stick no pads' },
    { slug: 'ice-skate-bag', closed: 'ice skate bag, zipper closed, 3/4 view, magenta, compact rectangular', open: 'SAME bag: zipper open, empty teal slots, no skates' },
    { slug: 'roller-skate-bag', closed: 'roller skate bag, flap closed, 3/4 view, sunny yellow, no wheels showing', open: 'SAME bag: flap open, empty olive interior, no skates' },
    { slug: 'scooter-bag', closed: 'folded-scooter carry bag, zipper closed, 3/4 view, coral-orange, no scooter showing', open: 'SAME bag: zipper open, empty walnut interior, no scooter' },
    { slug: 'skateboard-bag', closed: 'skateboard sleeve bag, velcro shut, 3/4 view, teal, long board outline', open: 'SAME sleeve: velcro open, empty olive pocket, no board' },
    { slug: 'helmet-case', closed: 'sports helmet case, clasp closed, 3/4 view, lime-green hard shell, dome silhouette', open: 'SAME case: clasp open, empty plum foam interior, no helmet' },
    { slug: 'knee-pad-bag', closed: 'knee pad mesh bag, drawstring closed, 3/4 view, orange mesh, no pads showing', open: 'SAME bag: drawstring open, empty teal mesh, no pads' },
    { slug: 'swim-goggles-case', closed: 'swim goggles hard case, snap shut, 3/4 view, cobalt-blue, pocket-sized', open: 'SAME case: snap open, empty olive foam slot, no goggles' },
    { slug: 'snorkel-bag', closed: 'snorkel gear bag, zipper closed, 3/4 view, aqua-teal, no gear showing', open: 'SAME bag: zipper open, empty walnut interior, no snorkel' },
    { slug: 'fins-bag', closed: 'swim fins bag, velcro flap closed, 3/4 view, cherry-red, fin-shaped bulge', open: 'SAME bag: flap open, empty olive interior, no fins' },
    { slug: 'wetsuit-bag', closed: 'wetsuit zip bag, main zipper closed, 3/4 view, navy-blue (colored, not black hole), wet-bag shape', open: 'SAME bag: zipper open, empty teal interior, no suit' },
    { slug: 'jump-rope-bag', closed: 'jump rope pouch, drawstring cinched, 3/4 view, magenta fabric, no rope showing', open: 'SAME pouch: drawstring open, empty kraft interior, no rope' },
    { slug: 'kite-bag', closed: 'kite storage bag, zipper closed, 3/4 view, sky-blue, long triangular silhouette', open: 'SAME bag: zipper open, empty olive interior, no kite' },
  ],
  singles: [
    { slug: 'soccer-goal-post', brief: 'empty soccer goal post frame as a put-on target, 3/4 view, white posts + net outline, no ball no players' },
    { slug: 'baseball-home-plate', brief: 'empty baseball home plate as a put-on target, 3/4 from above-front, white pentagon on dirt-teal ground, no players' },
    { slug: 'basketball-free-throw-line', brief: 'empty basketball free-throw line arc as a put-on target, 3/4 from above-front, coral court line on teal floor, no hoop focus' },
    { slug: 'volleyball-antenna-base', brief: 'empty volleyball court antenna base post as a put-on target, 3/4 view, red-white pole base, no net full frame' },
    { slug: 'tennis-net-post', brief: 'empty tennis net post base as a put-on target, 3/4 view, green post + walnut base, no ball' },
    { slug: 'four-square-pad', brief: 'empty four-square court pad as a put-on target, 3/4 from above-front, four colored squares, no kids' },
    { slug: 'tetherball-pole', brief: 'empty tetherball pole base as a put-on target, 3/4 view, yellow pole + teal base, no ball attached' },
    { slug: 'relay-baton-stand', brief: 'empty relay baton rest stand as a put-on target, 3/4 view, cherry-red holder slots, no batons' },
    { slug: 'starting-blocks', brief: 'empty track starting blocks as a put-on target, 3/4 view, teal metal blocks on walnut track strip, no runner' },
    { slug: 'gym-crash-mat', brief: 'empty folded gym crash mat as a put-on target, 3/4 view, magenta pad, no person' },
  ],
};

/** Wave12 — next pipeline fill. No overlap with waves 1–11. */
export const WAVE12 = {
  id: 'wave12',
  title: 'ESL hero targets wave12 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave12',
  pairs: [
    { slug: 'marker-case', closed: 'marker case, lid snapped shut, 3/4 view, teal plastic, no tips showing', open: 'SAME case: lid open, empty olive slots, no markers' },
    { slug: 'crayon-tin', closed: 'crayon tin, lid on, 3/4 view, golden-yellow metal, NO brand text', open: 'SAME tin: lid off beside tin, empty walnut wells, no crayons' },
    { slug: 'chalk-box', closed: 'chalk box, lid closed, 3/4 view, sky-blue cardboard, NO letters', open: 'SAME box: lid open, empty kraft compartments, no chalk' },
    { slug: 'eraser-box', closed: 'eraser storage box, lid shut, 3/4 view, coral-pink, no erasers showing', open: 'SAME box: lid open, empty olive interior, no erasers' },
    { slug: 'pencil-sharpener-box', closed: 'pencil sharpener box, flap closed, 3/4 view, lime-green, no shavings', open: 'SAME box: flap open, empty walnut cavity, no sharpener' },
    { slug: 'sticker-book', closed: 'kids sticker book, cover closed, 3/4 view, rainbow stars SHAPES only, NO letters', open: 'SAME book: cover open, empty cream-gold sticker wells (mid-tone), no stickers' },
    { slug: 'stamp-album', closed: 'stamp album, cover closed, 3/4 view, navy-blue + gold corners, NO text', open: 'SAME album: cover open, empty olive page grids, no stamps' },
    { slug: 'bead-box', closed: 'craft bead box, latch closed, 3/4 view, magenta + clear lid (tinted, not white plate), no beads visible', open: 'SAME box: latch open, empty teal compartments, no beads' },
    { slug: 'puzzle-box', closed: 'jigsaw puzzle box, lid shut, 3/4 view, teal + puzzle-piece SHAPES, NO title text', open: 'SAME box: lid open, empty walnut interior, no puzzle pieces' },
    { slug: 'board-game-box', closed: 'board game box, lid closed, 3/4 view, orange + dice SHAPES only, NO game name text', open: 'SAME box: lid open, empty olive interior, no board no pieces' },
    { slug: 'domino-box', closed: 'domino box, slide lid closed, 3/4 view, cherry-red, no dots showing', open: 'SAME box: slide lid open, empty kraft tray, no dominoes' },
    { slug: 'chess-box', closed: 'chess set box, clasp shut, 3/4 view, walnut wood + teal inlay, NO letters', open: 'SAME box: clasp open, empty olive felt interior, no pieces' },
    { slug: 'marbles-pouch', closed: 'marbles pouch, drawstring pulled shut, 3/4 view, velvet purple, no marbles showing', open: 'SAME pouch: drawstring open, empty teal interior, no marbles' },
    { slug: 'accordion-case', closed: 'accordion hard case, latches closed, 3/4 view, red body, bellows silhouette', open: 'SAME case: lid open, empty walnut interior shaped for accordion, no instrument' },
    { slug: 'recorder-case', closed: 'soprano recorder case, zipper closed, 3/4 view, sky-blue, slim flute shape', open: 'SAME case: zipper open, empty olive slot, no recorder' },
    { slug: 'xylophone-case', closed: 'xylophone case, latches closed, 3/4 view, sunny yellow, rectangular bar silhouette', open: 'SAME case: lid open, empty teal foam wells, no xylophone' },
    { slug: 'tambourine-bag', closed: 'tambourine gig bag, zipper closed, 3/4 view, coral-orange, round disc outline', open: 'SAME bag: zipper open, empty olive pocket, no tambourine' },
    { slug: 'maracas-pouch', closed: 'maracas pouch, drawstring closed, 3/4 view, lime-green fabric, no marbles sound holes showing', open: 'SAME pouch: drawstring open, empty walnut interior, no maracas' },
    { slug: 'whistle-pouch', closed: 'coach whistle pouch, snap flap closed, 3/4 view, navy-blue (colored), no whistle', open: 'SAME pouch: flap open, empty teal slot, no whistle' },
    { slug: 'diary', closed: 'kids diary, lock strap closed, 3/4 view, magenta cover + heart SHAPES, NO letters', open: 'SAME diary: strap open, empty cream-gold page wells (mid-tone), no writing' },
  ],
  singles: [
    { slug: 'classroom-rug', brief: 'empty classroom reading rug as a put-on target, 3/4 from above-front, teal oval rug, no kids no books' },
    { slug: 'library-step-stool', brief: 'empty library step stool as a put-on target, 3/4 view, cherry-red steps, no person' },
    { slug: 'book-return-slot', brief: 'library book return slot as a put-in target, 3/4 view, teal metal mouth + walnut chute (mid-tone hollow), no books' },
    { slug: 'science-lab-table', brief: 'empty science lab table surface as a put-on target, 3/4 view, black-teal counter top + colored legs, no beakers' },
    { slug: 'art-palette-tray', brief: 'empty art palette tray as a put-on target, 3/4 from above-front, walnut oval wells, no paint' },
    { slug: 'pottery-wheel-base', brief: 'empty pottery wheel base as a put-on target, 3/4 view, teal wheel + walnut splash pan, no clay' },
    { slug: 'weaving-loom-base', brief: 'empty small weaving loom base as a put-on target, 3/4 view, cherry frame + olive warp area empty, no yarn project' },
    { slug: 'potters-bench', brief: 'empty potter bench work surface as a put-on target, 3/4 view, wood top + teal legs, no tools' },
    { slug: 'music-stand-tray', brief: 'empty music stand tray ledge as a put-on target, 3/4 view, black-teal stand + walnut tray, no sheet music' },
    { slug: 'globe-stand-base', brief: 'empty globe stand base without globe as a put-on target, 3/4 view, cherry wood arc + teal pedestal, no sphere' },
  ],
};

/** Wave13 — next pipeline fill. No overlap with waves 1–12. */
export const WAVE13 = {
  id: 'wave13',
  title: 'ESL hero targets wave13 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave13',
  pairs: [
    { slug: 'train-car', closed: 'cartoon passenger train car, side door closed, 3/4 view, cherry-red body + teal windows, NO route numbers', open: 'SAME train car: side door open, empty walnut bench cavity, no passengers' },
    { slug: 'bus-door', closed: 'city bus front door closed, 3/4 view, sunny yellow body, NO route text', open: 'SAME bus: front door open, empty olive step well, no driver focus' },
    { slug: 'school-bus-door', closed: 'school bus entry door closed, 3/4 view, classic yellow + black stripe, NO district text', open: 'SAME bus: door open, empty mid-tone step cavity, no kids' },
    { slug: 'subway-door', closed: 'subway car sliding door closed, front 3/4, teal metal + glass, NO station names', open: 'SAME subway: doors slid open, empty olive interior gap, no people' },
    { slug: 'elevator-door', closed: 'building elevator doors closed, front view, brushed teal metal, NO floor numbers', open: 'SAME elevator: doors open, empty walnut shaft mouth (mid-tone, not black hole), no person' },
    { slug: 'ferry-gate', closed: 'ferry boarding gate closed, 3/4 view, navy-blue railing gate, NO port names', open: 'SAME gate: swung open, empty teak deck gap, no passengers' },
    { slug: 'taxi-trunk', closed: 'yellow taxi rear trunk lid closed, 3/4 view, checker stripe SHAPES only, NO taxi text', open: 'SAME taxi: trunk open, empty olive cargo well, no luggage' },
    { slug: 'ambulance-back', closed: 'ambulance rear doors closed, 3/4 view, white-red body OK, cross SHAPE only, NO letters', open: 'SAME ambulance: rear doors open, empty walnut interior, no stretcher' },
    { slug: 'fire-truck-compartment', closed: 'fire truck side compartment door closed, 3/4 view, cherry-red, NO station numbers', open: 'SAME truck: compartment open, empty olive bay, no hoses' },
    { slug: 'police-trunk', closed: 'police car trunk lid closed, 3/4 view, black-white (clearly colored panels), NO badge text', open: 'SAME car: trunk open, empty mid-tone well, no gear' },
    { slug: 'helicopter-door', closed: 'rescue helicopter side door closed, 3/4 view, orange body + teal skids, NO N-numbers', open: 'SAME helicopter: door open, empty olive cabin gap, no pilot' },
    { slug: 'sailboat-cabin', closed: 'small sailboat cabin hatch closed, 3/4 view, white-teal hull OK, no sails filling cell', open: 'SAME boat: hatch open, empty walnut cabin hollow, no sailor' },
    { slug: 'submarine-hatch', closed: 'cartoon submarine round hatch closed, 3/4 view, yellow body + teal portholes, NO markings', open: 'SAME sub: hatch open, empty olive interior tube, no diver' },
    { slug: 'spaceship-hatch', closed: 'cartoon spaceship round airlock closed, 3/4 view, silver-teal hull (not chrome-white), NO logos', open: 'SAME ship: hatch open, empty dark-olive airlock (mid-tone), no astronaut' },
    { slug: 'rocket-capsule', closed: 'cartoon rocket capsule hatch closed, 3/4 view, cherry-red + teal fins, NO agency text', open: 'SAME capsule: hatch open, empty walnut seat well, no astronaut' },
    { slug: 'hot-air-balloon-basket', closed: 'hot-air balloon wicker basket with gate closed, 3/4 view, teal balloon fabric above, NO sponsor text', open: 'SAME basket: gate open, empty walnut floor cavity, no passengers' },
    { slug: 'gondola-cabin', closed: 'ski gondola cabin door closed, 3/4 view, orange shell + teal windows, NO resort names', open: 'SAME gondola: door open, empty olive bench cavity, no skiers' },
    { slug: 'cable-car-cabin', closed: 'mountain cable-car cabin door closed, 3/4 view, cherry-red body, NO line names', open: 'SAME cabin: door open, empty walnut interior, no riders' },
    { slug: 'ski-lift-chair', closed: 'ski lift chair folded up / safety bar down, 3/4 view, teal seat + orange frame, no skier', open: 'SAME chair: bar up, empty olive seat as put-on target, still no skier' },
    { slug: 'pirate-ship-hatch', closed: 'cartoon pirate ship deck hatch closed, 3/4 view, wood + teal trim, NO skull text', open: 'SAME hatch: lid open, empty dark-olive cargo hold (mid-tone), no treasure' },
  ],
  singles: [
    { slug: 'train-platform', brief: 'empty train platform edge as a put-on target, 3/4 view, teal safety stripe + walnut planks, no train no people' },
    { slug: 'subway-platform', brief: 'empty subway platform edge as a put-on target, 3/4 view, yellow tactile strip + teal tiles, no train' },
    { slug: 'helipad', brief: 'empty helipad circle as a put-on target, 3/4 from above-front, teal H SHAPE only (not a letter), no helicopter' },
    { slug: 'ferry-deck', brief: 'empty ferry deck section as a put-on target, 3/4 view, teak planks + teal rail, no passengers' },
    { slug: 'tram-stop', brief: 'empty tram stop platform pad as a put-on target, 3/4 view, coral curb + teal shelter post, NO route numbers' },
    { slug: 'monorail-platform', brief: 'empty monorail platform section as a put-on target, 3/4 view, white-teal rail edge OK, no train' },
    { slug: 'rocket-launch-pad', brief: 'empty rocket launch pad ring as a put-on target, 3/4 view, gray ring + teal flame trench (no fire), no rocket' },
    { slug: 'airport-baggage-carousel', brief: 'empty airport baggage carousel belt as a put-on target, 3/4 view, teal rubber belt + walnut rim, no suitcases' },
    { slug: 'runway-marker', brief: 'empty runway touchdown marker stripe as a put-on target, 3/4 from above-front, white stripe on teal asphalt, no plane' },
    { slug: 'cable-car-station', brief: 'empty cable-car station boarding pad as a put-on target, 3/4 view, wood deck + teal posts, no cabin' },
  ],
};

/** Wave14 — next pipeline fill. No overlap with waves 1–13. */
export const WAVE14 = {
  id: 'wave14',
  title: 'ESL hero targets wave14 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave14',
  pairs: [
    { slug: 'easter-basket', closed: 'wicker easter basket, handle up, pastel grass liner tied shut with a bow, 3/4 view, no eggs showing', open: 'SAME basket: liner pulled open, empty kraft grass well, no eggs' },
    { slug: 'trick-or-treat-bucket', closed: 'plastic trick-or-treat pumpkin bucket, lid on, 3/4 view, orange + teal face SHAPES, NO words', open: 'SAME bucket: lid off, empty olive interior, no candy' },
    { slug: 'christmas-stocking', closed: 'large christmas stocking hung flat, top folded closed, 3/4 view, cherry-red + white cuff, NO names', open: 'SAME stocking: top open, empty plum interior, no gifts' },
    { slug: 'advent-calendar-box', closed: 'advent calendar box, all doors shut, front view, teal house shape, numbered SHAPES only not readable digits', open: 'SAME calendar: one big door open, empty walnut cavity behind, other doors stay shut' },
    { slug: 'valentine-mailbox', closed: 'classroom valentine mailbox slot closed, 3/4 view, magenta + heart SHAPES, NO letters', open: 'SAME mailbox: slot flap open, empty olive chute, no cards' },
    { slug: 'party-pinata', closed: 'star pinata hanging, bottom flap tied shut, 3/4 view, rainbow paper, NO text', open: 'SAME pinata: bottom open, empty kraft interior, no candy' },
    { slug: 'fireworks-box', closed: 'fireworks gift box, lid on, 3/4 view, navy + gold burst SHAPES, NO warning text', open: 'SAME box: lid off, empty olive interior, no rockets' },
    { slug: 'fortune-cookie-jar', closed: 'fortune cookie jar, lid on, 3/4 view, teal ceramic + cookie SHAPES, NO letters', open: 'SAME jar: lid off, empty walnut interior, no cookies' },
    { slug: 'gingerbread-house-door', closed: 'gingerbread house front, candy door shut, 3/4 view, brown walls + gumdrop SHAPES, NO words', open: 'SAME house: door open, empty dark-olive interior (mid-tone), no ginger kid' },
    { slug: 'nativity-stable', closed: 'small nativity stable facade, door closed, 3/4 view, wood + straw roof, star SHAPE only, NO text', open: 'SAME stable: door open, empty walnut manger cavity, no figures' },
    { slug: 'ornament-box', closed: 'christmas ornament storage box, lid on, 3/4 view, forest-green + gold stars, NO labels', open: 'SAME box: lid off, empty olive dividers, no ornaments' },
    { slug: 'wreath-storage-box', closed: 'round wreath storage box, lid on, 3/4 view, cherry-red lid + pine SHAPES, NO text', open: 'SAME box: lid off, empty kraft ring well, no wreath' },
    { slug: 'snow-globe-base', closed: 'snow globe base with empty dome ON (no scene inside), 3/4 view, teal base + clear dome, no snowman', open: 'SAME globe: dome lifted off, empty walnut pedestal well, still no figure' },
    { slug: 'maypole-base', closed: 'maypole base with ribbon bundle tied shut, 3/4 view, wood pole + colorful ribbons, NO text', open: 'SAME maypole: ribbon bundle open, empty olive ground ring, no dancers' },
    { slug: 'carnival-game-booth', closed: 'carnival game booth counter shutter closed, 3/4 view, red/teal stripes, NO game name text', open: 'SAME booth: shutter up, empty walnut counter cavity, no prizes' },
    { slug: 'birthday-present-stack', closed: 'stack of wrapped birthday presents, top box lid taped shut, 3/4 view, rainbow paper, NO name tags', open: 'SAME stack: top box open, empty olive interior, no toy' },
    { slug: 'gift-sack', closed: 'santa-style gift sack, top tied shut, 3/4 view, cherry-red velvet, gold cord, NO letters', open: 'SAME sack: top open, empty plum interior, no presents' },
    { slug: 'pumpkin-patch-bin', closed: 'pumpkin patch harvest bin, lid closed, 3/4 view, wood crate + orange lid, no pumpkins showing', open: 'SAME bin: lid open, empty kraft interior, no pumpkins' },
    { slug: 'corn-maze-gate', closed: 'corn maze wooden gate closed, 3/4 view, teal paint + corn stalk SHAPES at sides, NO text', open: 'SAME gate: swung open, empty walnut path mouth, no scarecrow' },
    { slug: 'beach-cooler-tub', closed: 'beach party tub cooler, lid on, 3/4 view, aqua-blue body, NO brand text', open: 'SAME tub: lid off, empty teal interior, no drinks' },
  ],
  singles: [
    { slug: 'sledding-hill', brief: 'empty sledding hill slope as a put-on target, 3/4 view, white-teal snow OK, no sled no kid' },
    { slug: 'ice-rink-edge', brief: 'empty ice rink border section as a put-on target, 3/4 view, white ice + teal dasher board, no skaters' },
    { slug: 'sand-castle-mold', brief: 'empty sand castle bucket mold as a put-in target, 3/4 view, coral plastic, no sand mound' },
    { slug: 'snowman-base', brief: 'empty snowman base snow mound as a put-on target, 3/4 view, white-teal snowball stack bottom only, no face' },
    { slug: 'leaf-pile', brief: 'empty leaf pile as a put-in target, 3/4 view, orange/red/teal leaves, no kid jumping' },
    { slug: 'puddle', brief: 'empty rain puddle as a put-in target, 3/4 from above-front, teal water ring on walnut ground, no boots' },
    { slug: 'campfire-log-ring', brief: 'empty campfire log ring as a put-in target, 3/4 view, warm logs + charcoal-olive center, no flames' },
    { slug: 'kite-ground-spot', brief: 'empty park kite-flying ground patch as a put-on target, 3/4 from above-front, teal grass, no kite' },
    { slug: 'parade-float-platform', brief: 'empty parade float platform as a put-on target, 3/4 view, gold + teal deck, no characters' },
    { slug: 'festival-booth-counter', brief: 'empty festival booth counter top as a put-on target, 3/4 view, striped awning edge + walnut counter, NO booth name text' },
  ],
};

/** Wave15 — ocean / marina / aquarium fill. No overlap with waves 1–14. */
export const WAVE15 = {
  id: 'wave15',
  title: 'ESL hero targets wave15 — 20 pairs + 10 play surfaces (medium)',
  kind: 'hero-targets-wave15',
  pairs: [
    { slug: 'treasure-chest', closed: 'wood pirate treasure chest, lid shut with gold latch, 3/4 view, walnut + teal trim, NO skull text', open: 'SAME chest: lid open, empty dark-olive cavity (mid-tone), no coins' },
    { slug: 'aquarium-tank', closed: 'small glass aquarium tank with lid ON, 3/4 view, teal frame + clear glass, NO fish', open: 'SAME tank: lid off, empty olive water-line cavity, still no fish' },
    { slug: 'lobster-trap', closed: 'wire lobster trap, door flap closed, 3/4 view, teal wire + wood base, NO labels', open: 'SAME trap: flap open, empty kraft funnel cavity, no lobster' },
    { slug: 'clam-shell', closed: 'giant cartoon clam shell shut, 3/4 view, peach + teal ridges, no pearl showing', open: 'SAME clam: shell open, empty soft-pink interior well, no pearl' },
    { slug: 'diving-bell', closed: 'cartoon diving bell hatch closed, 3/4 view, brass-gold + porthole, NO depth numbers', open: 'SAME bell: hatch open, empty olive interior dome, no diver' },
    { slug: 'lighthouse-door', closed: 'lighthouse base door closed, 3/4 view, white-red stripes OK, teal door, NO lighthouse text', open: 'SAME door: open, empty walnut stair cavity, no keeper' },
    { slug: 'beach-hut-door', closed: 'beach hut door closed, 3/4 view, sunny yellow walls + teal door, NO shop name', open: 'SAME hut: door open, empty kraft interior, no towels' },
    { slug: 'pier-locker', closed: 'wooden pier locker, latch shut, 3/4 view, weathered teal + brass latch, NO numbers', open: 'SAME locker: door open, empty olive cavity, no gear' },
    { slug: 'marina-dock-box', closed: 'marina dock storage box, lid on, 3/4 view, navy-blue + rope handles, NO marina text', open: 'SAME box: lid off, empty walnut well, no ropes' },
    { slug: 'oyster-shell', closed: 'giant oyster shell shut, 3/4 view, gray-teal ridges, no pearl', open: 'SAME oyster: open, empty soft-peach interior, no pearl' },
    { slug: 'shipwreck-hatch', closed: 'shipwreck deck hatch closed, 3/4 view, barnacle wood + teal iron, NO skull text', open: 'SAME hatch: open, empty dark-olive hold (mid-tone), no treasure' },
    { slug: 'coral-arch-gate', closed: 'coral arch gate closed with a seaweed curtain, 3/4 view, coral-pink + teal, NO text', open: 'SAME gate: curtain parted, empty olive path mouth, no fish' },
    { slug: 'tide-pool-gate', closed: 'tide-pool fence gate closed, 3/4 view, driftwood + teal hinges, NO signs', open: 'SAME gate: swung open, empty kraft rock-pool mouth, no crabs' },
    { slug: 'surfboard-locker', closed: 'surfboard locker cabinet, door closed, 3/4 view, sunny yellow + wave SHAPES, NO brand text', open: 'SAME locker: door open, empty olive tall cavity, no boards' },
    { slug: 'life-preserver-locker', closed: 'life-preserver wall locker, door closed, 3/4 view, cherry-red door + white rim SHAPE, NO text', open: 'SAME locker: door open, empty walnut cavity, no ring' },
    { slug: 'bait-box', closed: 'fishing bait box, lid shut, 3/4 view, forest-green + latch, NO labels', open: 'SAME box: lid open, empty olive compartments, no bait' },
    { slug: 'seaweed-curtain-gate', closed: 'undersea seaweed curtain tied shut across a rock arch, 3/4 view, teal-green strands, NO text', open: 'SAME curtain: parted open, empty dark-olive cave mouth (mid-tone), no mermaid' },
    { slug: 'mermaid-grotto-door', closed: 'mermaid grotto stone door closed, 3/4 view, teal stone + shell SHAPES, NO letters', open: 'SAME door: open, empty peach grotto cavity, no mermaid' },
    { slug: 'whale-watching-booth', closed: 'whale-watching booth shutter closed, 3/4 view, navy + white stripes, NO tour text', open: 'SAME booth: shutter up, empty walnut counter cavity, no binoculars' },
    { slug: 'paddleboard-rack-case', closed: 'paddleboard rack case with front panel closed, 3/4 view, teal wood + coral accents, NO brand', open: 'SAME case: panel open, empty olive rack bay, no boards' },
  ],
  singles: [
    { slug: 'sandbar', brief: 'empty sandbar mound as a put-on target, 3/4 view, warm sand + teal water edge, no people no boats' },
    { slug: 'tide-pool', brief: 'empty tide pool rock ring as a put-in target, 3/4 from above-front, teal water, no crabs' },
    { slug: 'coral-reef-ledge', brief: 'empty coral reef ledge as a put-on target, 3/4 view, coral-pink + teal, no fish' },
    { slug: 'lighthouse-pad', brief: 'empty lighthouse base pad as a put-on target, 3/4 view, stone ring + teal stripe, no lighthouse tower filling cell' },
    { slug: 'beach-towel-spot', brief: 'empty beach towel laid flat as a put-on target, 3/4 from above-front, coral stripes on sand, no person' },
    { slug: 'marina-cleat-pad', brief: 'empty marina dock cleat pad as a put-on target, 3/4 view, teak plank + teal cleat, no rope coil filling cell' },
    { slug: 'snorkeling-entry-pad', brief: 'empty snorkeling shore entry pad as a put-on target, 3/4 view, wet sand + teal shallow water, no snorkeler' },
    { slug: 'aquarium-floor', brief: 'empty aquarium gravel floor section as a put-on target, 3/4 from above-front, teal gravel, no fish no plants filling cell' },
    { slug: 'ship-deck-plank', brief: 'empty ship deck plank section as a put-on target, 3/4 view, walnut planks + teal rail stub, no sailor' },
    { slug: 'jetty-end', brief: 'empty jetty end platform as a put-on target, 3/4 view, weathered wood + teal water, no boats' },
  ],
};

export const WAVES = {
  2: WAVE2, 3: WAVE3, 4: WAVE4, 5: WAVE5, 6: WAVE6, 7: WAVE7, 8: WAVE8, 9: WAVE9, 10: WAVE10, 11: WAVE11, 12: WAVE12, 13: WAVE13, 14: WAVE14, 15: WAVE15,
  wave2: WAVE2, wave3: WAVE3, wave4: WAVE4, wave5: WAVE5, wave6: WAVE6, wave7: WAVE7, wave8: WAVE8, wave9: WAVE9, wave10: WAVE10, wave11: WAVE11, wave12: WAVE12, wave13: WAVE13, wave14: WAVE14, wave15: WAVE15,
};

export function pairCellNames(pairs) {
  const names = [];
  for (const p of pairs) names.push(`${p.slug}-closed`, `${p.slug}-open`);
  return names;
}

export function singleCellNames(singles) {
  return singles.map((s) => s.slug);
}

/** 4×4 reading order: 16 names, pad with emptyN. */
export function pad16(names) {
  const out = [...names];
  while (out.length < 16) out.push(`empty${out.length}`);
  return out;
}

export function sheetsFor(wave) {
  const pairNames = pairCellNames(wave.pairs);
  const singleNames = singleCellNames(wave.singles);
  return [
    { id: 'sheet1-pairs-a', grid: '4x4', names: pad16(pairNames.slice(0, 16)) },
    { id: 'sheet2-pairs-b', grid: '4x4', names: pad16(pairNames.slice(16, 32)) },
    {
      id: 'sheet3-pairs-c-plus-singles',
      grid: '4x4',
      names: pad16([...pairNames.slice(32, 40), ...singleNames.slice(0, 8)]),
    },
    { id: 'sheet4-singles-tail', grid: '4x4', names: pad16(singleNames.slice(8, 10)) },
  ];
}

export function usedSlugs() {
  const out = new Set(WAVE1_USED);
  for (const w of [WAVE2, WAVE3, WAVE4, WAVE5, WAVE6, WAVE7, WAVE8, WAVE9, WAVE10, WAVE11, WAVE12, WAVE13, WAVE14]) {
    for (const p of w.pairs) out.add(p.slug);
    for (const s of w.singles) out.add(s.slug);
  }
  return out;
}
