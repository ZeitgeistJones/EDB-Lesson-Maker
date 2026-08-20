/**
 * EDB setting-drop stockpile — real lesson-stage environments via Manus.
 * NOT quiet flat washes (see deprecated request-bg-cards-harvest.mjs).
 *
 * Each wave = one setting category, 1 Manus task, 2 variant panels on a 2×1 sheet.
 * Batch 1 (interiors): classroom, bedroom, kitchen, bathroom — fire concurrently.
 */
export const BOARD = { width: 1280, height: 590 };
export const GROUND_Y_RANGE = '340–434';

/** Per-setting briefs — open floor, real place identity, composable for EDB. */
export const SETTINGS = {
  classroom: {
    slug: 'classroom',
    category: 'classroom',
    title: 'EDB setting drop — classroom (2 variants)',
    variants: [
      {
        slug: 'classroom-a',
        brief:
          'empty elementary classroom: chalkboard + teacher desk along back wall, student desks pushed to side walls, wide open floor center, clear standing surface, soft illustration',
      },
      {
        slug: 'classroom-b',
        brief:
          'same classroom type, alternate angle: bulletin board + bookshelf at edges only, wide empty floor band center, no kids no text on board',
      },
    ],
  },
  bedroom: {
    slug: 'bedroom',
    category: 'bedroom',
    title: 'EDB setting drop — bedroom (2 variants)',
    variants: [
      {
        slug: 'bedroom-a',
        brief:
          'cozy kid bedroom: bed + nightstand along side wall, rug on floor, open play space center, window with simple curtain at edge, no people no posters with text',
      },
      {
        slug: 'bedroom-b',
        brief:
          'same bedroom feel: wardrobe + toy box at edges, wide empty floor center, soft lamp glow, no people',
      },
    ],
  },
  kitchen: {
    slug: 'kitchen',
    category: 'kitchen',
    title: 'EDB setting drop — kitchen (2 variants)',
    variants: [
      {
        slug: 'kitchen-a',
        brief:
          'home kitchen: counters + fridge along back and side walls, open floor center with tile/wood surface, simple stove silhouette at edge, no people no food clutter mid-frame',
      },
      {
        slug: 'kitchen-b',
        brief:
          'same kitchen type: island/counter at one edge, dining nook corner, wide empty floor band for props, no people',
      },
    ],
  },
  bathroom: {
    slug: 'bathroom',
    category: 'bathroom',
    title: 'EDB setting drop — bathroom (2 variants)',
    variants: [
      {
        slug: 'bathroom-a',
        brief:
          'home bathroom: sink + mirror + toilet along walls, open floor center with tile, bathtub silhouette at edge, no people no readable labels on bottles',
      },
      {
        slug: 'bathroom-b',
        brief:
          'same bathroom feel: shower/tub at back corner, towel rack edge detail, wide empty floor center, no people',
      },
    ],
  },
  'living-room': {
    slug: 'living-room',
    category: 'living room',
    title: 'EDB setting drop — living room (2 variants)',
    variants: [
      {
        slug: 'living-room-a',
        brief:
          'family living room: sofa + low table along back wall, open floor center, simple window at edge, no people no TV logos',
      },
      {
        slug: 'living-room-b',
        brief:
          'same living room: armchair + bookshelf at edges, wide empty rug/floor center, no people',
      },
    ],
  },
  playground: {
    slug: 'playground',
    category: 'playground',
    title: 'EDB setting drop — playground (2 variants)',
    variants: [
      {
        slug: 'playground-a',
        brief:
          'school playground outdoor: slide + swing set at far edges, open rubber/grass floor center, fence silhouette background, no kids',
      },
      {
        slug: 'playground-b',
        brief:
          'same playground: climbing frame at one side, wide open play surface center, blue sky band top, no kids',
      },
    ],
  },
  park: {
    slug: 'park',
    category: 'park',
    title: 'EDB setting drop — park (2 variants)',
    variants: [
      {
        slug: 'park-a',
        brief:
          'neighborhood park: bench + tree line at edges, open grass path center, simple pond or flower bed at far edge, no people',
      },
      {
        slug: 'park-b',
        brief:
          'same park feel: playground peek at far corner, wide lawn center for props, no people',
      },
    ],
  },
  'street-town': {
    slug: 'street-town',
    category: 'street/town',
    title: 'EDB setting drop — street/town (2 variants)',
    variants: [
      {
        slug: 'street-town-a',
        brief:
          'quiet town street: shop fronts + lamppost at edges, open sidewalk/road center, crosswalk stripes, no people no readable signs',
      },
      {
        slug: 'street-town-b',
        brief:
          'same town feel: parked car silhouettes at edges, wide pedestrian zone center, no people',
      },
    ],
  },
  shop: {
    slug: 'shop',
    category: 'shop/supermarket',
    title: 'EDB setting drop — shop/supermarket (2 variants)',
    variants: [
      {
        slug: 'shop-a',
        brief:
          'small grocery shop interior: shelves along walls, open aisle floor center, checkout counter at edge, no people no brand labels',
      },
      {
        slug: 'shop-b',
        brief:
          'same shop type: fruit display at one edge, wide empty aisle center, no people',
      },
    ],
  },
  restaurant: {
    slug: 'restaurant',
    category: 'restaurant/cafe',
    title: 'EDB setting drop — restaurant/cafe (2 variants)',
    variants: [
      {
        slug: 'restaurant-a',
        brief:
          'casual cafe interior: counter + menu board silhouette at back (no readable text), tables at edges, open floor center, no people',
      },
      {
        slug: 'restaurant-b',
        brief:
          'same cafe: booth seating along walls, wide open floor center, no people',
      },
    ],
  },
  clinic: {
    slug: 'clinic',
    category: 'clinic/dentist',
    title: 'EDB setting drop — clinic/dentist (2 variants)',
    variants: [
      {
        slug: 'clinic-a',
        brief:
          'dentist/clinic room: exam chair + cabinet along walls, open floor center, simple medical cross at edge, no people no logos',
      },
      {
        slug: 'clinic-b',
        brief:
          'same clinic: waiting-area chairs at edge, wide empty floor band center, no people',
      },
    ],
  },
  library: {
    slug: 'library',
    category: 'library',
    title: 'EDB setting drop — library (2 variants)',
    variants: [
      {
        slug: 'library-a',
        brief:
          'public library interior: bookshelves along walls, open reading floor center, study table at edge, no people no readable book titles',
      },
      {
        slug: 'library-b',
        brief:
          'same library: desk + lamp at corner, wide empty carpet center, no people',
      },
    ],
  },
  farm: {
    slug: 'farm',
    category: 'farm',
    title: 'EDB setting drop — farm (2 variants)',
    variants: [
      {
        slug: 'farm-a',
        brief:
          'farm pasture: barn + fence at edges, open grass field center, simple tractor silhouette far edge, no animals no people',
      },
      {
        slug: 'farm-b',
        brief:
          'same farm: hay bales at corner, wide open field center, no animals no people',
      },
    ],
  },
  zoo: {
    slug: 'zoo',
    category: 'zoo',
    title: 'EDB setting drop — zoo (2 variants)',
    variants: [
      {
        slug: 'zoo-a',
        brief:
          'zoo walkway: enclosure fence + rocks/plants habitat at edges, open path center, gate silhouette, no animals no people',
      },
      {
        slug: 'zoo-b',
        brief:
          'same zoo: viewing platform at edge, wide open path center, no animals no people',
      },
    ],
  },
  beach: {
    slug: 'beach',
    category: 'beach',
    title: 'EDB setting drop — beach (2 variants)',
    variants: [
      {
        slug: 'beach-a',
        brief:
          'sunny beach: ocean horizon top, sand floor center, umbrella + towel at far edge, no people',
      },
      {
        slug: 'beach-b',
        brief:
          'same beach: pier/boardwalk silhouette at edge, wide open sand center, no people',
      },
    ],
  },
  forest: {
    slug: 'forest',
    category: 'forest',
    title: 'EDB setting drop — forest (2 variants)',
    variants: [
      {
        slug: 'forest-a',
        brief:
          'forest path: tree trunks + foliage at edges, open dirt path center, soft light through canopy, no animals no people',
      },
      {
        slug: 'forest-b',
        brief:
          'same forest: log + mushrooms at edge, wide clear path center, no animals no people',
      },
    ],
  },
  airport: {
    slug: 'airport',
    category: 'airport',
    title: 'EDB setting drop — airport (2 variants)',
    variants: [
      {
        slug: 'airport-a',
        brief:
          'airport terminal: check-in counters + departure board silhouette at back (no readable text), open floor center, no people no logos',
      },
      {
        slug: 'airport-b',
        brief:
          'same airport: seating rows at edges, wide open terminal floor center, no people',
      },
    ],
  },
  'bus-stop': {
    slug: 'bus-stop',
    category: 'bus stop',
    title: 'EDB setting drop — bus stop (2 variants)',
    variants: [
      {
        slug: 'bus-stop-a',
        brief:
          'street bus stop: shelter + bench at edge, open sidewalk center, blank sign panel, no bus no people',
      },
      {
        slug: 'bus-stop-b',
        brief:
          'same bus stop: curb + road at bottom edge, wide waiting area center, no people',
      },
    ],
  },
  'train-platform': {
    slug: 'train-platform',
    category: 'train platform',
    title: 'EDB setting drop — train platform (2 variants)',
    variants: [
      {
        slug: 'train-platform-a',
        brief:
          'train station platform: shelter roof + tracks at edge, open platform floor center, no train no people',
      },
      {
        slug: 'train-platform-b',
        brief:
          'same platform: bench + timetable board silhouette (no text), wide open platform center, no people',
      },
    ],
  },
  'train-interior': {
    slug: 'train-interior',
    category: 'train interior',
    title: 'EDB setting drop — train interior (2 variants)',
    variants: [
      {
        slug: 'train-interior-a',
        brief:
          'train cabin interior: seat rows along walls, open aisle floor center, window band top, no people',
      },
      {
        slug: 'train-interior-b',
        brief:
          'same train: poles + luggage rack at edges, wide empty aisle center, no people',
      },
    ],
  },
  'bus-interior': {
    slug: 'bus-interior',
    category: 'bus interior',
    title: 'EDB setting drop — bus interior (2 variants)',
    variants: [
      {
        slug: 'bus-interior-a',
        brief:
          'bus cabin: seats + poles along walls, open aisle floor center, front windshield band, no people',
      },
      {
        slug: 'bus-interior-b',
        brief:
          'same bus: back seats at edge, wide empty aisle center, no people',
      },
    ],
  },
  'sports-field': {
    slug: 'sports-field',
    category: 'sports field',
    title: 'EDB setting drop — sports field (2 variants)',
    variants: [
      {
        slug: 'sports-field-a',
        brief:
          'outdoor sports field: goal posts + bleachers at edges, open grass center with field lines, no players',
      },
      {
        slug: 'sports-field-b',
        brief:
          'same field: track lane at edge, wide open turf center, no players',
      },
    ],
  },
  'basketball-court': {
    slug: 'basketball-court',
    category: 'basketball court',
    title: 'EDB setting drop — basketball court (2 variants)',
    variants: [
      {
        slug: 'basketball-court-a',
        brief:
          'indoor basketball court: hoop + backboard at one end, painted court lines, open floor center, no players',
      },
      {
        slug: 'basketball-court-b',
        brief:
          'same court: bench + scoreboard silhouette at edge (no numbers), wide open court center, no players',
      },
    ],
  },
  'swimming-pool': {
    slug: 'swimming-pool',
    category: 'swimming pool',
    title: 'EDB setting drop — swimming pool (2 variants)',
    variants: [
      {
        slug: 'swimming-pool-a',
        brief:
          'indoor pool: lane ropes + pool edge at bottom, open deck floor center, starting blocks at edge, no swimmers',
      },
      {
        slug: 'swimming-pool-b',
        brief:
          'same pool: diving board at far edge, wide open pool deck center, no swimmers',
      },
    ],
  },
};

/** Wave registry — batch 1 = interiors (4 concurrent). Extend for later batches. */
export const WAVES = {
  classroom: { id: 'wave1-classroom', setting: 'classroom', batch: 1 },
  bedroom: { id: 'wave1-bedroom', setting: 'bedroom', batch: 1 },
  kitchen: { id: 'wave1-kitchen', setting: 'kitchen', batch: 1 },
  bathroom: { id: 'wave1-bathroom', setting: 'bathroom', batch: 1 },
  'living-room': { id: 'wave2-living-room', setting: 'living-room', batch: 2 },
  playground: { id: 'wave2-playground', setting: 'playground', batch: 2 },
  park: { id: 'wave2-park', setting: 'park', batch: 2 },
  'street-town': { id: 'wave2-street-town', setting: 'street-town', batch: 2 },
  shop: { id: 'wave3-shop', setting: 'shop', batch: 3 },
  restaurant: { id: 'wave3-restaurant', setting: 'restaurant', batch: 3 },
  clinic: { id: 'wave3-clinic', setting: 'clinic', batch: 3 },
  library: { id: 'wave3-library', setting: 'library', batch: 3 },
  farm: { id: 'wave4-farm', setting: 'farm', batch: 4 },
  zoo: { id: 'wave4-zoo', setting: 'zoo', batch: 4 },
  beach: { id: 'wave4-beach', setting: 'beach', batch: 4 },
  forest: { id: 'wave4-forest', setting: 'forest', batch: 4 },
  airport: { id: 'wave5-airport', setting: 'airport', batch: 5 },
  'bus-stop': { id: 'wave5-bus-stop', setting: 'bus-stop', batch: 5 },
  'train-platform': { id: 'wave5-train-platform', setting: 'train-platform', batch: 5 },
  'train-interior': { id: 'wave5-train-interior', setting: 'train-interior', batch: 5 },
  'bus-interior': { id: 'wave5-bus-interior', setting: 'bus-interior', batch: 5 },
  'sports-field': { id: 'wave6-sports-field', setting: 'sports-field', batch: 6 },
  'basketball-court': { id: 'wave6-basketball-court', setting: 'basketball-court', batch: 6 },
  'swimming-pool': { id: 'wave6-swimming-pool', setting: 'swimming-pool', batch: 6 },
};

export const BATCH_SETTINGS = {
  1: ['classroom', 'bedroom', 'kitchen', 'bathroom'],
  2: ['living-room', 'playground', 'park', 'street-town'],
  3: ['shop', 'restaurant', 'clinic', 'library'],
  4: ['farm', 'zoo', 'beach', 'forest'],
  5: ['airport', 'bus-stop', 'train-platform', 'train-interior', 'bus-interior'],
  6: ['sports-field', 'basketball-court', 'swimming-pool'],
};

export function resolveSetting(key) {
  const wave = WAVES[key];
  if (!wave) throw new Error(`Unknown setting wave key: ${key}. Use classroom|bedroom|… or see edb-settings-stockpile-keys.mjs`);
  const setting = SETTINGS[wave.setting];
  if (!setting) throw new Error(`Missing SETTINGS entry for ${wave.setting}`);
  return { wave, setting };
}
