/**
 * coverageloop — honest pack coverage for Manus mass-fill.
 *
 * DEFAULT: dictionary ∩ pack exact/plural (scripts/dict-pack-coverage.mjs).
 * Aliases / weak props do NOT count as covered.
 *
 * Legacy topic ladder (VocabArt.planFor per demand topic):
 *   npm run coverageloop -- --mode=topics
 *
 *   npm run coverageloop
 *   npm run coverageloop -- --shard=1/5          (topics mode only)
 *   npm run coverageloop -- --topics=soccer-coach,beach
 *   npm run coverageloop -- --out=tmp/asset-coverage/shard-1.json
 *   npm run coverageloop:merge
 *
 * Outputs:
 *   tmp/asset-coverage/latest.json
 *   tmp/asset-coverage/history.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { runDictCoverage } from './dict-pack-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const FIXTURES = path.join(ROOT, 'scripts', 'fixtures');
const OUT_DIR = path.join(ROOT, 'tmp', 'asset-coverage');

const PERSON_WORDS = new Set([
  'coach', 'teacher', 'doctor', 'nurse', 'chef', 'firefighter', 'pilot', 'police',
  'farmer', 'artist', 'dentist', 'scientist', 'astronaut', 'veterinarian',
  'construction worker', 'mail carrier', 'librarian', 'baker', 'cashier',
  'student', 'teammate', 'spotter', 'friend', 'officer', 'vet', 'waiter',
  'waitress', 'barista', 'patient', 'king', 'queen', 'knight',
  'mother', 'father', 'brother', 'sister', 'grandma', 'grandpa', 'baby',
  'customer', 'host', 'hostess',
]);

/** Stable ordered catalog — shard N/K takes index % K === N-1 */
const TOPIC_CATALOG = [
  // Core lesson fixtures (real-ish demand)
  {
    id: 'soccer-coach',
    title: 'Soccer Practice with Coach',
    source: 'fixture:soccer-coach-lesson.json',
    fixture: 'soccer-coach-lesson.json',
  },
  {
    id: 'fruit-market',
    title: 'Fruit Market',
    source: 'fixture:fruit-market-lesson.json',
    fixture: 'fruit-market-lesson.json',
  },
  {
    id: 'beach',
    title: 'Sunny Beach Day',
    source: 'fixture:loop3-beach.json',
    fixture: 'loop3-beach.json',
  },
  {
    id: 'hospital',
    title: 'Doctor Visit',
    source: 'fixture:doctor-lesson.json',
    fixture: 'doctor-lesson.json',
  },
  {
    id: 'routines',
    title: 'Bathroom Routines',
    source: 'fixture:bathroom-routines-lesson.json',
    fixture: 'bathroom-routines-lesson.json',
  },
  {
    id: 'gym',
    title: 'The Clown at the Gym',
    source: 'fixture:gym-lesson.json',
    fixture: 'gym-lesson.json',
  },
  {
    id: 'school',
    title: 'School Day',
    source: 'fixture:school-lesson.json',
    fixture: 'school-lesson.json',
  },
  {
    id: 'dentist',
    title: 'Dentist Visit',
    source: 'fixture:dentist-lesson.json',
    fixture: 'dentist-lesson.json',
  },
  // Demand lists (fixtures + gap-scan staples) — fixed when gap-scan JSON missing
  {
    id: 'sports-demand',
    title: 'Sports Day',
    source: 'demand',
    words: [
      'soccer', 'basketball', 'tennis', 'ball', 'run', 'jump', 'team', 'race',
      'trophy', 'medal', 'goal', 'whistle', 'racket', 'net', 'coach', 'fair',
      'together', 'win', 'stadium', 'teammate',
    ],
  },
  {
    id: 'jobs-demand',
    title: 'Community Jobs',
    source: 'demand',
    words: [
      'teacher', 'doctor', 'nurse', 'chef', 'firefighter', 'pilot', 'police',
      'farmer', 'artist', 'dentist', 'coach', 'scientist', 'astronaut',
      'veterinarian', 'construction worker', 'mail carrier', 'librarian',
      'baker', 'cashier', 'student',
    ],
  },
  {
    id: 'playground-demand',
    title: 'Park Play Time',
    source: 'demand',
    words: [
      'playground', 'park', 'slide', 'swing', 'ball', 'run', 'friend',
      'sandbox', 'seesaw', 'monkey bars', 'climb', 'jump', 'fun',
      'together', 'friendship', 'bike', 'scooter', 'bench',
    ],
  },
  // Live shipped boards (not the easy demand staples) — keep the meter honest
  {
    id: 'park-live',
    title: 'A Day at the Park',
    source: 'live-board',
    words: [
      'playground', 'fountain', 'picnic', 'benches', 'pathway', 'jogger',
    ],
  },
  {
    id: 'waterpark-live',
    title: 'A Day at the Waterpark',
    source: 'live-board',
    words: [
      'sunblock', 'waterpark', 'towel', 'locker', 'uncomfortable', 'lifeguard',
    ],
  },
  {
    id: 'cafe-demand',
    title: 'At the Cafe',
    source: 'demand',
    words: [
      'coffee', 'tea', 'menu', 'cup', 'mug', 'saucer', 'espresso', 'latte',
      'croissant', 'pastry', 'barista', 'counter', 'sugar', 'cream', 'napkin',
      'tray', 'order', 'tip', 'takeout', 'cake',
    ],
  },
  {
    id: 'kitchen-demand',
    title: 'In the Kitchen',
    source: 'demand',
    words: [
      'kitchen', 'chef', 'pan', 'pot', 'spatula', 'oven', 'stove', 'fridge',
      'plate', 'bowl', 'knife', 'spoon', 'fork', 'cup', 'mixer', 'blender',
      'toaster', 'kettle', 'flour', 'salt',
    ],
  },
  {
    id: 'beach-demand',
    title: 'Beach Day Demand',
    source: 'demand',
    words: [
      'beach', 'sand', 'shell', 'wave', 'sun', 'ocean', 'towel', 'umbrella',
      'sunscreen', 'bucket', 'spade', 'sandcastle', 'swim', 'ball', 'flip-flops',
      'deckchair', 'crab', 'seashell', 'surfboard', 'life jacket',
    ],
  },
  {
    id: 'hospital-demand',
    title: 'At the Hospital Demand',
    source: 'demand',
    words: [
      'doctor', 'nurse', 'hospital', 'patient', 'clinic', 'bandage', 'thermometer',
      'stethoscope', 'medicine', 'ambulance', 'bed', 'x-ray', 'cast', 'crutches',
      'mask', 'gloves', 'injection', 'wheelchair', 'waiting room', 'pharmacy',
    ],
  },
  {
    id: 'routines-demand',
    title: 'Daily Routines Demand',
    source: 'demand',
    words: [
      'wake up', 'get up', 'brush teeth', 'wash face', 'take a shower', 'get dressed',
      'eat breakfast', 'go to school', 'pack bag', 'do homework', 'have dinner',
      'go to bed', 'alarm clock', 'calendar', 'toothbrush', 'soap', 'towel',
      'slippers', 'lunchbox', 'keys',
    ],
  },
  {
    id: 'winter-demand',
    title: 'Winter Day',
    source: 'demand',
    words: [
      'winter', 'snow', 'snowflake', 'snowman', 'cold', 'ice', 'sled', 'mittens',
      'gloves', 'scarf', 'boots', 'coat', 'hat', 'ice skates', 'hot cocoa',
      'icicle', 'snowball', 'beanie', 'earmuffs', 'parka',
    ],
  },
  {
    id: 'feelings',
    title: 'Feelings Compass',
    source: 'fixture:feelings-compass-lesson.json',
    fixture: 'feelings-compass-lesson.json',
  },
  {
    id: 'castle',
    title: 'Castle Adventure',
    source: 'fixture:castle-lesson.json',
    fixture: 'castle-lesson.json',
  },
  // Shard-5 themes: transport / city / camping / music / space / animals
  {
    id: 'travel',
    title: 'Airport Travel Day',
    source: 'fixture:travel-lesson.json',
    fixture: 'travel-lesson.json',
  },
  {
    id: 'hotel',
    title: 'Hotel Stay',
    source: 'fixture:hotel-lesson.json',
    fixture: 'hotel-lesson.json',
  },
  {
    id: 'campsite',
    title: 'Campsite Fun',
    source: 'fixture:campsite-lesson.json',
    fixture: 'campsite-lesson.json',
  },
  {
    id: 'music',
    title: 'Music Class',
    source: 'fixture:music-lesson.json',
    fixture: 'music-lesson.json',
  },
  {
    id: 'space',
    title: 'Space Station Trip',
    source: 'fixture:space-lesson.json',
    fixture: 'space-lesson.json',
  },
  {
    id: 'aquarium',
    title: 'Aquarium Visit',
    source: 'fixture:aquarium-lesson.json',
    fixture: 'aquarium-lesson.json',
  },
  {
    id: 'zoo',
    title: 'A Day at the Zoo',
    source: 'fixture:zoo-phonics-lesson.json',
    fixture: 'zoo-phonics-lesson.json',
  },
  {
    id: 'transport-demand',
    title: 'Transport and Vehicles',
    source: 'demand',
    words: [
      'bus', 'train', 'car', 'plane', 'boat', 'bike', 'taxi', 'subway', 'ticket',
      'station', 'airport', 'passport', 'suitcase', 'helmet', 'truck', 'motorcycle',
      'ferry', 'scooter', 'bridge', 'traffic light',
    ],
  },
  {
    id: 'city-demand',
    title: 'City Buildings',
    source: 'demand',
    words: [
      'city', 'street', 'building', 'house', 'apartment', 'shop', 'bank', 'library',
      'station', 'park', 'traffic light', 'sidewalk', 'skyscraper', 'hotel',
      'restaurant', 'museum', 'bridge', 'mailbox', 'crosswalk', 'fountain',
    ],
  },
  {
    id: 'camping-demand',
    title: 'Camping Trip Demand',
    source: 'demand',
    words: [
      'tent', 'campfire', 'backpack', 'map', 'flashlight', 'camp', 'sleeping bag',
      'marshmallow', 'compass', 'lantern', 'cooler', 'hiking', 'trail', 'canoe',
      'canteen', 'rope', 'hatchet', 'picnic table', 'camp stove', 'binoculars',
    ],
  },
  {
    id: 'music-demand',
    title: 'Music Instruments Demand',
    source: 'demand',
    words: [
      'music', 'sing', 'drum', 'piano', 'dance', 'song', 'guitar', 'violin', 'flute',
      'trumpet', 'microphone', 'headphones', 'conductor', 'orchestra', 'note',
      'xylophone', 'tambourine', 'cello', 'saxophone', 'harmonica',
    ],
  },
  {
    id: 'space-demand',
    title: 'Space Demand',
    source: 'demand',
    words: [
      'rocket', 'astronaut', 'planet', 'moon', 'star', 'space', 'satellite', 'alien',
      'earth', 'spaceship', 'telescope', 'comet', 'galaxy', 'helmet', 'station',
      'orbit', 'meteor', 'sun', 'asteroid', 'spacesuit',
    ],
  },
  {
    id: 'animals-demand',
    title: 'Animals Demand',
    source: 'demand',
    words: [
      'lion', 'bear', 'fish', 'zoo', 'elephant', 'monkey', 'tiger', 'bird', 'dog',
      'cat', 'horse', 'cow', 'giraffe', 'penguin', 'shark', 'dolphin', 'coral',
      'turtle', 'zebra', 'kangaroo',
    ],
  },
  // gap-scan-C leftovers (no prior catalog id to enrich into)
  {
    id: 'hobbies-demand',
    title: 'My Hobbies',
    source: 'demand+gap-scan-C',
    words: [
      'hobby', 'paint', 'paintbrush', 'draw', 'chess', 'knitting', 'garden',
      'camera', 'photography', 'kite', 'read', 'sing', 'dance', 'collect',
      'fishing', 'board game', 'piano', 'skateboard', 'bike', 'cook',
    ],
  },
  {
    id: 'bags-demand',
    title: 'Bags and Accessories',
    source: 'demand+gap-scan-C',
    words: [
      'bag', 'backpack', 'handbag', 'purse', 'wallet', 'suitcase', 'briefcase',
      'umbrella', 'watch', 'glasses', 'sunglasses', 'hat', 'belt', 'gloves',
      'scarf', 'jewelry', 'necklace', 'ring', 'tote', 'duffel',
    ],
  },
  {
    id: 'office-demand',
    title: 'At the Office',
    source: 'demand+gap-scan-C',
    words: [
      'office', 'desk', 'computer', 'laptop', 'phone', 'stapler', 'scissors',
      'tape', 'paperclip', 'calculator', 'folder', 'clipboard', 'pen', 'pencil',
      'eraser', 'notebook', 'calendar', 'lamp', 'envelope', 'printer',
    ],
  },
  {
    id: 'bathroom-demand',
    title: 'Bathroom Routines Demand',
    source: 'demand+gap-scan-C',
    words: [
      'shower', 'soap', 'toothbrush', 'toothpaste', 'towel', 'mirror', 'toilet',
      'sink', 'shampoo', 'bathtub', 'comb', 'hairbrush', 'razor', 'scale',
      'bathroom scale', 'mouthwash', 'floss', 'faucet', 'bathrobe', 'plunger',
    ],
  },
  // Shift20-C — shared tools / mid-obscure objects (matte title; trends alias wins)
  {
    id: 'tools-demand',
    title: 'Tools and Hardware',
    source: 'demand+shift20-C',
    words: [
      'hammer', 'wrench', 'screwdriver', 'pliers', 'drill', 'saw', 'nail', 'screw',
      'flashlight', 'binoculars', 'rope', 'scissors', 'needle', 'brush', 'glue',
      'tape', 'toolbox', 'hatchet', 'bandaid', 'thread', 'button', 'hardhat',
    ],
  },
  // Wave-3: 10 non-overlapping topics for parallel coverageloop runs
  // (not in prior sports/jobs/cafe/…/bathroom / camping / space set)
  {
    id: 'family',
    title: 'My Family',
    source: 'demand+YL-common',
    words: [
      'family', 'mother', 'father', 'brother', 'sister', 'baby', 'grandma',
      'grandpa', 'uncle', 'aunt', 'cousin', 'home', 'hug', 'photo',
      'dinner', 'love', 'parents', 'kids', 'pet', 'house',
    ],
  },
  {
    id: 'clothes',
    title: 'Clothes',
    source: 'demand+YL-common',
    words: [
      'shirt', 'pants', 'dress', 'skirt', 'socks', 'shoes', 'hat', 'coat',
      'jacket', 'gloves', 'scarf', 'boots', 'sweater', 't-shirt', 'shorts',
      'pajamas', 'belt', 'tie', 'swimsuit', 'raincoat',
    ],
  },
  {
    id: 'weather',
    title: 'Weather',
    source: 'demand+YL-common',
    words: [
      'sunny', 'rainy', 'cloudy', 'windy', 'snowy', 'hot', 'cold', 'storm',
      'rainbow', 'umbrella', 'lightning', 'thunder', 'fog', 'hail',
      'temperature', 'forecast', 'drizzle', 'breeze', 'sunny day', 'raindrop',
    ],
  },
  {
    id: 'birthday-party',
    title: 'Birthday Party',
    source: 'demand+YL-common',
    words: [
      'birthday', 'cake', 'candle', 'balloon', 'present', 'gift', 'party',
      'hat', 'card', 'piñata', 'streamer', 'confetti', 'ice cream', 'juice',
      'invitation', 'wish', 'song', 'friend', 'candle cake', 'party bag',
    ],
  },
  {
    id: 'pets',
    title: 'Pets',
    source: 'demand+YL-common',
    words: [
      'dog', 'cat', 'fish', 'bird', 'hamster', 'rabbit', 'turtle', 'pet',
      'leash', 'collar', 'pet food', 'cage', 'aquarium', 'bone', 'toy',
      'vet', 'puppy', 'kitten', 'feather', 'bowl',
    ],
  },
  {
    id: 'dinosaurs',
    title: 'Dinosaurs',
    source: 'demand+YL-mid-obscure',
    words: [
      'dinosaur', 'T-rex', 'triceratops', 'stegosaurus', 'fossil', 'bone',
      'egg', 'claw', 'tail', 'volcano', 'jungle', 'museum', 'skeleton',
      'roar', 'spike', 'nest', 'herbivore', 'carnivore', 'footprint', 'extinct',
    ],
  },
  {
    id: 'fire-station',
    title: 'Fire Station',
    source: 'demand+YL-mid-obscure',
    words: [
      'firefighter', 'fire truck', 'hose', 'helmet', 'ladder', 'fire station',
      'hydrant', 'axe', 'boots', 'uniform', 'siren', 'smoke', 'alarm',
      'dalmatian', 'pole', 'mask', 'extinguisher', 'badge', 'radio', 'rescue',
    ],
  },
  {
    id: 'library',
    title: 'Library',
    source: 'demand+YL-mid-obscure',
    words: [
      'library', 'book', 'shelf', 'librarian', 'quiet', 'story', 'read',
      'bookmark', 'magazine', 'dictionary', 'card', 'desk', 'computer',
      'whisper', 'borrow', 'return', 'page', 'cover', 'fairy tale', 'map',
    ],
  },
  {
    id: 'submarine',
    title: 'Submarine',
    source: 'demand+YL-very-obscure',
    words: [
      'submarine', 'periscope', 'hatch', 'porthole', 'depth', 'ocean',
      'sonar', 'propeller', 'captain', 'crew', 'torpedo', 'dive', 'surface',
      'bubble', 'octopus', 'whale', 'coral', 'map', 'compass', 'engine',
    ],
  },
  {
    id: 'planetarium',
    title: 'Planetarium',
    source: 'demand+YL-very-obscure',
    words: [
      'planetarium', 'dome', 'projector', 'constellation', 'star', 'planet',
      'orbit', 'telescope', 'galaxy', 'comet', 'moon', 'seat', 'dark',
      'ticket', 'guide', 'solar system', 'nebula', 'meteor', 'night sky',
      'astronomy',
    ],
  },

  // --- B1 band -------------------------------------------------------------
  // The catalog above is almost entirely A1/A2 concrete nouns, which is why
  // global Coverage@Demand reads high while real B1 boards keep landing in
  // Draft. B1 vocab is abstract nouns, verb phrases and adjectives — the exact
  // shapes the pack/prop ladder has no answer for. These rows exist so that
  // failure is measured instead of inferred from one-off lessons.
  {
    id: 'b1-routines',
    title: 'B1 Morning Routine',
    source: 'demand+B1',
    words: [
      'alarm', 'routine', 'freshen up', 'skip', 'oversleep', 'commute',
      'prioritize', 'schedule', 'productive', 'organized', 'rush', 'prepare',
      'energy', 'habit', 'snooze', 'punctual', 'chaotic', 'calm',
    ],
  },
  {
    id: 'b1-outdoors',
    title: 'B1 Camping and Outdoors',
    source: 'demand+B1',
    words: [
      'hike', 'gear', 'campfire', 'tent', 'wilderness', 'trail', 'shelter',
      'navigate', 'pack', 'explore', 'scenery', 'wander', 'remote', 'rugged',
      'sunrise', 'wind down', 'set off', 'adventure',
    ],
  },
  {
    id: 'b1-feelings',
    title: 'B1 Talking About Feelings',
    source: 'demand+B1',
    words: [
      'nervous', 'proud', 'lonely', 'excited', 'frustrated', 'confident',
      'anxious', 'relieved', 'grateful', 'overwhelmed', 'calm', 'disappointed',
      'jealous', 'embarrassed', 'cheerful', 'homesick',
    ],
  },
  {
    id: 'b1-school-life',
    title: 'B1 School and Study',
    source: 'demand+B1',
    words: [
      'deadline', 'revise', 'assignment', 'presentation', 'progress', 'effort',
      'concentrate', 'struggle', 'improve', 'feedback', 'grade', 'research',
      'motivation', 'distraction', 'achieve', 'participate',
    ],
  },
  {
    id: 'b1-money',
    title: 'B1 Money and Choices',
    source: 'demand+B1',
    words: [
      'budget', 'save', 'spend', 'afford', 'borrow', 'lend', 'income',
      'expense', 'bargain', 'waste', 'invest', 'discount', 'receipt',
      'allowance', 'worth', 'value',
    ],
  },
  {
    id: 'b1-environment',
    title: 'B1 Environment and Habits',
    source: 'demand+B1',
    words: [
      'recycle', 'reuse', 'waste', 'pollution', 'litter', 'energy', 'reduce',
      'sustainable', 'habit', 'impact', 'protect', 'climate', 'landfill',
      'container', 'responsible', 'throw away',
    ],
  },
];

function parseArgs(argv) {
  const opts = {
    mode: 'dictionary', // default — honest dict ∩ pack
    shardIndex: null,
    shardTotal: null,
    topics: null,
    out: null,
    noHistory: false,
  };
  for (const a of argv) {
    if (a.startsWith('--mode=')) {
      const m = a.slice('--mode='.length).trim().toLowerCase();
      if (m !== 'dictionary' && m !== 'dict' && m !== 'topics') {
        throw new Error(`Bad --mode= (want dictionary|topics, got ${a})`);
      }
      opts.mode = m === 'dict' ? 'dictionary' : m;
    } else if (a.startsWith('--shard=')) {
      const m = /^(\d+)\/(\d+)$/.exec(a.slice('--shard='.length).trim());
      if (!m) throw new Error(`Bad --shard= (want N/K, got ${a})`);
      opts.shardIndex = Number(m[1]);
      opts.shardTotal = Number(m[2]);
      if (opts.shardIndex < 1 || opts.shardIndex > opts.shardTotal) {
        throw new Error(`--shard index must be 1..${opts.shardTotal}`);
      }
      opts.mode = 'topics'; // shards only apply to topic ladder
    } else if (a.startsWith('--topics=')) {
      opts.topics = a
        .slice('--topics='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      opts.mode = 'topics';
    } else if (a.startsWith('--out=')) {
      opts.out = path.resolve(ROOT, a.slice('--out='.length).trim());
    } else if (a === '--no-history') {
      opts.noHistory = true;
    } else if (a === '--help' || a === '-h') {
      opts.help = true;
    }
  }
  return opts;
}

function fileFetch(url) {
  const u = String(url).replace(/^\//, '');
  const rel = u.startsWith('assets/')
    ? path.join(PUBLIC, u)
    : u.includes('propPolicy')
      ? path.join(PUBLIC, 'lib/propPolicy.json')
      : u.includes('09_props/manifest')
        ? path.join(PUBLIC, 'assets/09_props/manifest.json')
        : u.includes('07_vocab-pack/index')
          ? path.join(PUBLIC, 'assets/07_vocab-pack/index.json')
          : path.join(PUBLIC, u.replace(/^\.?\//, ''));
  if (!rel.startsWith(PUBLIC) || !fs.existsSync(rel)) {
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    });
  }
  const body = fs.readFileSync(rel);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => JSON.parse(body.toString('utf8')),
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

function loadSandbox() {
  const sandbox = { window: {}, console, fetch: fileFetch, setTimeout, clearTimeout };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const rel of [
    'public/lib/propBank.js',
    'public/lib/vocabIcons.js',
    'public/lib/vocabArt.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  }
  return sandbox.window;
}

function vocabFromFixture(file) {
  const fp = path.join(FIXTURES, file);
  if (!fs.existsSync(fp)) return { title: file, words: [] };
  const lesson = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const words = ((lesson && lesson.vocabulary) || [])
    .map((v) => (typeof v === 'string' ? v : v && v.word))
    .filter(Boolean)
    .map((w) => String(w));
  return { title: lesson.title || file, words, lesson };
}

/**
 * Prefer enriching *-demand / source:demand topics — never inflate fixture
 * lessons (keeps Coverage@Demand denom stable and avoids double-count).
 */
function enrichTarget(byId, id) {
  if (byId.has(`${id}-demand`)) return byId.get(`${id}-demand`);
  const t = byId.get(id);
  if (!t) return null;
  if (t.fixture) return null;
  return t;
}

/** Merge extra words from tmp/gap-scan-*.json when present (optional enrichment). */
function enrichFromGapScans(topics) {
  const tmpDir = path.join(ROOT, 'tmp');
  if (!fs.existsSync(tmpDir)) return topics;
  const files = fs.readdirSync(tmpDir).filter((f) => /^gap-scan-.*\.json$/i.test(f));
  const byId = new Map(topics.map((t) => [t.id, { ...t, words: t.words ? [...t.words] : null }]));

  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(tmpDir, f), 'utf8'));
    } catch {
      continue;
    }
    // Shape A: byTopic[id].rows[].word
    if (data.byTopic && typeof data.byTopic === 'object') {
      for (const [id, block] of Object.entries(data.byTopic)) {
        const words = [];
        if (Array.isArray(block.rows)) {
          for (const r of block.rows) if (r && r.word) words.push(r.word);
        }
        if (!words.length) continue;
        const existing = enrichTarget(byId, id);
        if (existing) {
          const set = new Set(existing.words || []);
          for (const w of words) set.add(w);
          existing.words = [...set];
          existing.source = `${existing.source}+gap-scan`;
        }
      }
    }
    // Shape B/C: topics: [{ id, words: [{word}|string] }]
    if (Array.isArray(data.topics)) {
      for (const t of data.topics) {
        if (!t || !t.id) continue;
        const words = (t.words || [])
          .map((w) => (typeof w === 'string' ? w : w && w.word))
          .filter(Boolean);
        if (!words.length) continue;
        const existing = enrichTarget(byId, t.id);
        if (existing) {
          const set = new Set(existing.words || []);
          for (const w of words) set.add(w);
          existing.words = [...set];
          existing.source = `${existing.source}+gap-scan`;
        }
      }
    }
  }
  return topics.map((t) => byId.get(t.id) || t);
}

function resolveTopicWords(topic) {
  if (topic.fixture) {
    const fromFix = vocabFromFixture(topic.fixture);
    const extra = topic.words || [];
    const set = new Set([...fromFix.words, ...extra]);
    return {
      id: topic.id,
      title: fromFix.title || topic.title,
      source: topic.source,
      words: [...set],
      fixtureLesson: fromFix.lesson || null,
    };
  }
  return {
    id: topic.id,
    title: topic.title,
    source: topic.source,
    words: [...(topic.words || [])],
    fixtureLesson: null,
  };
}

function selectTopics(opts) {
  let catalog = enrichFromGapScans(TOPIC_CATALOG);
  if (opts.topics && opts.topics.length) {
    const want = new Set(opts.topics.map((t) => t.toLowerCase()));
    catalog = catalog.filter((t) => want.has(t.id.toLowerCase()));
    const missing = opts.topics.filter(
      (t) => !TOPIC_CATALOG.some((c) => c.id.toLowerCase() === t.toLowerCase())
    );
    if (missing.length) {
      console.warn('Unknown --topics (skipped):', missing.join(', '));
      console.warn('Known ids:', TOPIC_CATALOG.map((t) => t.id).join(', '));
    }
    // Explicit --topics wins; do not also slice by --shard index.
    return catalog;
  }
  if (opts.shardIndex != null) {
    catalog = catalog.filter((_, i) => i % opts.shardTotal === opts.shardIndex - 1);
  }
  return catalog;
}

/**
 * Feelings — one expression sheet covers the whole set, so these rank as a
 * single high-reuse commission rather than N separate still lifes.
 */
const EXPRESSION_WORDS = new Set([
  'nervous', 'proud', 'lonely', 'excited', 'frustrated', 'confident', 'anxious',
  'relieved', 'grateful', 'overwhelmed', 'calm', 'disappointed', 'jealous',
  'embarrassed', 'cheerful', 'homesick', 'shy', 'angry', 'sad', 'happy',
  'tired', 'bored', 'surprised', 'scared', 'worried', 'curious', 'confused',
  'annoyed', 'hopeful', 'ashamed',
]);

/**
 * Words with no honest still-life form. A photo of "prioritize" or "worth"
 * does not exist, so commissioning art for them wastes a sheet and invites a
 * vague plate that means nothing at 96px. These are not a coverage debt to pay
 * down — they are words the board should teach through sentence frames and
 * text tiles instead of pictures.
 */
const ABSTRACT_WORDS = new Set([
  // judgement / value
  'worth', 'value', 'impact', 'progress', 'effort', 'quality', 'benefit',
  // process verbs with no single frame
  'prioritize', 'achieve', 'participate', 'improve', 'prepare', 'struggle',
  'concentrate', 'revise', 'research', 'explore', 'navigate', 'wander',
  'protect', 'reduce', 'reuse', 'afford', 'borrow', 'lend', 'invest', 'spend',
  'save', 'skip', 'rush', 'oversleep', 'commute', 'set off', 'wind down',
  'freshen up', 'throw away',
  // states / dispositions
  'organized', 'productive', 'punctual', 'chaotic', 'responsible', 'remote',
  'rugged', 'sustainable', 'motivation', 'distraction', 'habit', 'routine',
  'schedule', 'deadline', 'feedback', 'grade', 'income', 'expense', 'budget',
  'allowance', 'bargain', 'discount', 'adventure', 'climate',
]);

/**
 * What a human should actually draw for this word.
 *   person     — character plate
 *   expression — face sheet (feelings share one commission)
 *   object     — still life, the default and the only cheap win
 *   abstract   — do NOT commission; route to text tiles / frames
 * Unknown words fall through to `object`: the cost of a missed still life is
 * lower than the cost of wrongly telling someone not to draw something.
 */
function suggestedArtType(word) {
  const w = String(word).toLowerCase();
  if (PERSON_WORDS.has(w)) return 'person';
  if (EXPRESSION_WORDS.has(w)) return 'expression';
  if (ABSTRACT_WORDS.has(w)) return 'abstract';
  return 'object';
}

/** Prop counts as dedicated only when the key is the word or a clear compound of it. */
function propIsDedicated(word, propKey) {
  const w = String(word || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
  const k = String(propKey || '')
    .toLowerCase()
    .replace(/\.png$/i, '');
  if (!w || !k) return false;
  if (k === w) return true;
  // park-bench for bench; picnic-basket for picnic
  if (k.endsWith(`-${w}`) || k.startsWith(`${w}-`)) return true;
  return false;
}

function scoreBucket(W, topicTitle, word, topicWords) {
  // Full topic vocab as sense context — single-word lessons let mail-locker
  // win for "locker" and picnic-cup win for "picnic".
  const vocab = (topicWords && topicWords.length ? topicWords : [word]).map((w) => ({
    word: w,
    emoji: '•',
    sentence: `I see ${w}.`,
  }));
  const lesson = {
    title: topicTitle,
    vocabulary: vocab,
  };
  const family = W.PropBank.familyFor(lesson);
  // allowPackFallback: banked 07_vocab-pack keys count for Coverage@Demand
  // identify. Board bake still gates white plates unless adapt/opt-in sets this.
  const art = W.VocabArt.planFor(lesson, {
    seed: topicTitle,
    family,
    allowPackFallback: true,
  });
  const row =
    (art.rows || []).find(
      (r) => String(r.word || '').toLowerCase() === String(word).toLowerCase()
    ) ||
    art.rows[0] || {
      tier: 'none',
      matchable: false,
      propKey: null,
      artSrc: null,
      glyph: null,
    };
  const denied = !!(W.PropBank.isDeniedWord && W.PropBank.isDeniedWord(word));
  const ambiguous = !!(W.PropBank.isAmbiguousWord && W.PropBank.isAmbiguousWord(word));
  const packKind =
    W.VocabIcons && typeof W.VocabIcons.matchKindSync === 'function'
      ? W.VocabIcons.matchKindSync(word)
      : null;
  const packStandIn =
    W.VocabIcons && typeof W.VocabIcons.isStandInPack === 'function'
      ? W.VocabIcons.isStandInPack(word)
      : packKind === 'alias' || packKind === 'override' || packKind === 'token';

  let bucket = 'gap';
  let why = 'dropped-none';
  if (denied) {
    bucket = 'deny';
    why = 'deny';
  } else if (row.tier === 'pack') {
    if (packStandIn || packKind === 'alias' || packKind === 'override' || packKind === 'token') {
      bucket = 'ok';
      why = `pack-standin:${packKind || 'alias'}`;
    } else {
      bucket = 'strong';
      why = 'pack';
    }
  } else if (row.tier === 'prop') {
    if (propIsDedicated(word, row.propKey)) {
      bucket = 'strong';
      why = 'prop';
    } else {
      // Hitchhike (picnic→picnic-cup, locker→post-mail-locker) — not dedicated art
      bucket = 'ok';
      why = 'weak-prop';
    }
  } else if (row.tier === 'glyph') {
    bucket = 'ok';
    why = 'glyph';
  } else {
    bucket = 'gap';
    why = ambiguous ? 'ambiguous-none' : 'dropped-none';
  }

  return {
    word,
    bucket,
    why,
    tier: row.tier,
    propKey: row.propKey || null,
    artSrc: row.artSrc || null,
    glyph: row.glyph || null,
    denied,
    ambiguous,
    family,
    artTypeGuess: suggestedArtType(word),
    packKind: packKind || null,
  };
}

function coverageRatio(counts, { includeOk = false } = {}) {
  const denom = counts.words - counts.deny;
  if (denom <= 0) return null;
  const num = includeOk ? counts.strong + counts.ok : counts.strong;
  return num / denom;
}

/** Weak pack/prop hits still need dedicated art for Manus mass-fill. */
function needsDedicatedArt(scored) {
  if (scored.bucket === 'gap') return true;
  if (scored.bucket !== 'ok') return false;
  if (scored.artTypeGuess === 'abstract') return false;
  const why = String(scored.why || '');
  return why.startsWith('weak-prop') || why.startsWith('pack-standin');
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return 'n/a';
  return `${(n * 100).toFixed(1)}%`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage:
  npm run coverageloop
  npm run coverageloop -- --mode=dictionary   (default) dict ∩ pack exact
  npm run coverageloop -- --mode=topics       legacy VocabArt topic ladder
  --shard=N/K   Topic mode only
  --topics=a,b  Topic mode filter
  --out=path    Override output JSON path
  --no-history  Do not append history jsonl
`);
    return;
  }

  // Default: dictionary ∩ pack — the number you can trust for Manus mass-fill
  if (opts.mode !== 'topics') {
    runDictCoverage({ noHistory: opts.noHistory, out: opts.out });
    return;
  }

  const selected = selectTopics(opts);
  if (!selected.length) {
    console.error('No topics selected. Check --shard / --topics.');
    process.exit(1);
  }

  const W = loadSandbox();
  await W.PropBank.ready();
  await W.VocabIcons.ready();
  if (!W.VocabIcons.indexReady()) throw new Error('VocabIcons index not ready');

  const topicReports = [];
  const gapRows = [];
  const global = { words: 0, strong: 0, ok: 0, gap: 0, deny: 0 };

  for (const raw of selected) {
    const topic = resolveTopicWords(raw);
    const counts = { words: 0, strong: 0, ok: 0, gap: 0, deny: 0 };
    const rows = [];
    for (const word of topic.words) {
      const scored = scoreBucket(W, topic.title, word, topic.words);
      rows.push(scored);
      counts.words++;
      counts[scored.bucket]++;
      global.words++;
      global[scored.bucket]++;
      // True gaps + weak/stand-in picturable matches → Manus queue
      if (needsDedicatedArt(scored)) {
        gapRows.push({
          word: scored.word,
          topic: topic.id,
          why: scored.why,
          artTypeGuess: scored.artTypeGuess,
          tier: scored.tier,
          ambiguous: scored.ambiguous,
        });
      }
    }

    // Optional: full-fixture bake path (≤6 words together) for realism note
    let fixtureBake = null;
    if (topic.fixtureLesson) {
      const art = W.VocabArt.planFor(topic.fixtureLesson, {
        seed: topic.fixtureLesson.title,
        allowPackFallback: true,
      });
      fixtureBake = {
        rows: art.rows.map((r) => ({
          word: r.word,
          tier: r.tier,
          propKey: r.propKey,
          matchable: r.matchable,
        })),
        dropped: art.dropped.map((r) => r.word),
      };
    }

    topicReports.push({
      id: topic.id,
      title: topic.title,
      source: topic.source,
      counts,
      coverageAtDemand: coverageRatio(counts),
      coverageIncludingStandins: coverageRatio(counts, { includeOk: true }),
      gaps: rows.filter((r) => r.bucket === 'gap').map((r) => r.word),
      needsArt: rows.filter((r) => needsDedicatedArt(r)).map((r) => r.word),
      denies: rows.filter((r) => r.bucket === 'deny').map((r) => r.word),
      okGlyph: rows.filter((r) => r.bucket === 'ok').map((r) => r.word),
      strong: rows
        .filter((r) => r.bucket === 'strong')
        .map((r) => ({ word: r.word, tier: r.tier, propKey: r.propKey })),
      rows,
      fixtureBake,
    });
  }

  // Rank gaps: more topics mentioning a word → higher; ambiguous last among gaps
  const byWord = new Map();
  for (const g of gapRows) {
    const prev = byWord.get(g.word);
    if (!prev) {
      byWord.set(g.word, {
        word: g.word,
        topics: [g.topic],
        why: g.why,
        artTypeGuess: g.artTypeGuess,
        hits: 1,
      });
    } else {
      prev.hits++;
      if (!prev.topics.includes(g.topic)) prev.topics.push(g.topic);
    }
  }
  // Rank Manus queue: picturable objects first, then by topic hits
  const artRank = (t) =>
    t === 'object' ? 0 : t === 'person' ? 1 : t === 'expression' ? 2 : 3;
  const rankedGaps = [...byWord.values()].sort(
    (a, b) =>
      artRank(a.artTypeGuess) - artRank(b.artTypeGuess) ||
      b.hits - a.hits ||
      a.word.localeCompare(b.word)
  );

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    method:
      'Coverage@Demand = dedicated strong only (exact/plural pack or dedicated prop). ' +
      'Stand-ins/weak props → ok + Manus queue when picturable. Sense context = full topic vocab. ' +
      'Identifies gaps only — does not fire Manus or bake boards.',
    shard:
      opts.shardIndex != null
        ? { index: opts.shardIndex, total: opts.shardTotal }
        : null,
    topicFilter: opts.topics || null,
    topicIds: topicReports.map((t) => t.id),
    global: {
      ...global,
      coverageAtDemand: coverageRatio(global),
      coverageIncludingStandins: coverageRatio(global, { includeOk: true }),
      manusQueueCount: rankedGaps.length,
      manusPicturableCount: rankedGaps.filter((g) => g.artTypeGuess === 'object' || g.artTypeGuess === 'person').length,
    },
    topics: topicReports.map((t) => ({
      id: t.id,
      title: t.title,
      source: t.source,
      counts: t.counts,
      coverageAtDemand: t.coverageAtDemand,
      coverageIncludingStandins: t.coverageIncludingStandins,
      gaps: t.gaps,
      needsArt: t.needsArt,
      denies: t.denies,
      okGlyph: t.okGlyph,
      strongCount: t.strong.length,
      fixtureBake: t.fixtureBake,
    })),
    rankedGaps,
    // Full per-topic rows kept for tooling (larger)
    detail: topicReports,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let outPath;
  if (opts.out) {
    outPath = opts.out;
  } else if (opts.shardIndex != null) {
    outPath = path.join(OUT_DIR, `shard-${opts.shardIndex}.json`);
  } else {
    outPath = path.join(OUT_DIR, 'latest.json');
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  if (!opts.noHistory) {
    const histLine = JSON.stringify({
      generatedAt,
      shard: report.shard,
      topicIds: report.topicIds,
      global: report.global,
      topicCoverage: Object.fromEntries(
        topicReports.map((t) => [t.id, t.coverageAtDemand])
      ),
      gapCount: rankedGaps.length,
      out: path.relative(ROOT, outPath).replace(/\\/g, '/'),
    });
    const histFile =
      opts.shardIndex != null
        ? path.join(OUT_DIR, `history-shard-${opts.shardIndex}.jsonl`)
        : path.join(OUT_DIR, 'history.jsonl');
    fs.appendFileSync(histFile, histLine + '\n', 'utf8');
  }

  // Stdout summary
  const label =
    opts.shardIndex != null
      ? `coverageloop shard ${opts.shardIndex}/${opts.shardTotal}`
      : 'coverageloop';
  console.log(`${label}`);
  console.log(`  wrote ${path.relative(ROOT, outPath)}`);
  console.log(
    `  Coverage@Demand global: ${pct(report.global.coverageAtDemand)}` +
      `  (strong=${global.strong} ok=${global.ok} gap=${global.gap} deny=${global.deny} words=${global.words})`
  );
  console.log('  Per topic:');
  for (const t of topicReports) {
    console.log(
      `    ${t.id}: ${pct(t.coverageAtDemand)}` +
        `  strong=${t.counts.strong} ok=${t.counts.ok} gap=${t.counts.gap} deny=${t.counts.deny}` +
        (t.gaps.length ? `  gaps=[${t.gaps.join(', ')}]` : '')
    );
  }
  console.log(`  Ranked gaps (${rankedGaps.length}) — top for Manus/in-house (identify only):`);
  for (const g of rankedGaps.slice(0, 25)) {
    console.log(
      `    ${g.word}  topics=${g.topics.join(',')}  why=${g.why}  art=${g.artTypeGuess}`
    );
  }
  if (rankedGaps.length > 25) {
    console.log(`    … +${rankedGaps.length - 25} more in ${path.relative(ROOT, outPath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
