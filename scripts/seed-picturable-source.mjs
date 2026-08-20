/**
 * One-time / maintainable seed: extract ONLY explicit words[] from TOPIC_CATALOG
 * and coreConcepts from TopicIdentity — never global quote-harvest.
 *
 *   node scripts/seed-picturable-source.mjs
 *
 * Writes scripts/data/esl-picturable-source.json (merged with extras/deny/whitelist).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/data/esl-picturable-source.json');

const DENY = [
  // abstracts / instructional
  'worth', 'value', 'impact', 'progress', 'effort', 'quality', 'benefit',
  'prioritize', 'achieve', 'participate', 'improve', 'prepare', 'struggle',
  'concentrate', 'revise', 'research', 'explore', 'navigate', 'wander',
  'protect', 'reduce', 'reuse', 'afford', 'borrow', 'lend', 'invest', 'spend',
  'save', 'skip', 'rush', 'oversleep', 'commute', 'set off', 'wind down',
  'freshen up', 'throw away', 'organized', 'productive', 'punctual', 'chaotic',
  'responsible', 'remote', 'rugged', 'sustainable', 'motivation', 'distraction',
  'habit', 'routine', 'schedule', 'deadline', 'feedback', 'grade', 'income',
  'expense', 'budget', 'allowance', 'bargain', 'discount', 'adventure', 'climate',
  'fun', 'together', 'friendship', 'fair', 'win', 'dark',
  // feelings / states
  'proud', 'lonely', 'excited', 'frustrated', 'confident', 'anxious', 'relieved',
  'grateful', 'overwhelmed', 'calm', 'disappointed', 'jealous', 'embarrassed',
  'cheerful', 'homesick', 'shy', 'angry', 'sad', 'happy', 'tired', 'bored',
  'surprised', 'scared', 'worried', 'curious', 'confused', 'annoyed', 'hopeful',
  'ashamed', 'uncomfortable', 'comfortable', 'nervous', 'shy',
  // verbs / actions / multi-word instructional frames that aren't still-life icons
  'run', 'jump', 'climb', 'kick', 'swim', 'dance', 'read', 'draw', 'walk',
  'fly', 'dive', 'win', 'play', 'order', 'tip', 'buy', 'wash', 'exercise',
  'dig', 'sort', 'love', 'energy', 'note', 'post', 'mail', 'sewing',
  'go to bed', 'do homework', 'go to school', 'take a shower',
  'mail carrier', 'construction worker',
  // meta / labels that must never enter the dict
  'demand', 'fixture', 'source', 'title', 'words', 'id', 'ok', 'gap', 'deny',
  'strong', 'pack', 'prop', 'glyph', 'object', 'person', 'expression', 'abstract',
  'live-board', 'live', 'board', 'tmp', 'mode', 'dictionary', 'topics', 'shard',
  'asset-coverage', 'coverageloop', 'animals demand', 'animals-demand',
].map((w) => w.toLowerCase());

/** Niche picturable nouns not always in demand topic lists. */
const EXTRAS = `
waterpark lifeguard sunblock sunscreen pathway jogger fountain picnic benches locker
limestone evacuation tunnel engineer subway goggles raft snorkel flippers sandcastle
honeycomb beekeeper nectar hive sidewalk crosswalk overpass underpass escalator
turnstile platform carriage locomotive pickaxe hardhat blueprint vest cone barrier
postcard invitation guidebook brochure badge clipboard
ambulance anchor apricot arrow attic avalanche balcony bamboo bandage barnacle barrel
basement beak beehive binoculars blanket blender bolt booth boulder bouquet bowl brake
branch brick briefcase broccoli broom bubble bucket buckle buffalo bulb bulldozer
bumper bungalow bunk buoy bush butterfly button cabin cactus cage calculator calendar
calf camel camera campfire canal candle canoe canopy cape capsule caravan cardigan
cargo carousel carpet carrot carton castle caterpillar cattle cauldron cave ceiling
celery cello cement cereal chain chalk chandelier charger cheek cheese cherry chess
chest chick chimney chipmunk chisel chocolate chopsticks church cinnamon circle circus
clamp clarinet claw cliff cloak clock closet cloth cloud clover clown coal coast cobra
cockpit coconut cocoon coffee coil coin collar compass computer cone cookie coral cork
corn corridor costume cottage cotton couch counter coupon court cover cow cowboy crab
crane crate crayon creek crib cricket crocodile croissant crow crown crutch crystal
cucumber cupboard curtain cushion cycle cylinder cymbal dagger daisy dam dandelion
dart dashboard deer desk dessert dew diamond diary dice dinosaur dish dock doll dolphin
dome donkey door doorbell doorknob doughnut dove dragon dragonfly drain drawer dress
dresser drill drum duck dune dustbin eagle earring easel eel egg eggplant elbow
elephant elevator emerald engine envelope eraser eruption escalator excavator factory
fairy falcon fan fang farm faucet feather fence fern ferry field fig finch finger
fireplace firework fish flag flame flashlight flask floor flour flute fog foil forehead
fork fort fountain fox frame freezer fridge frog frost fruit funnel fur furnace garage
garden garlic gate gazelle gear gem generator giraffe glacier glass glasses globe glove
glue goat goggles goldfish goose gorilla gown grape grapefruit grass grasshopper gravel
greenhouse guitar gull gum gutter gym hail hair hairbrush hammer hammock hamster handbag
handkerchief handle hanger harbor harmonica harp hat hatch hawk hay headlight
headphones hedge hedgehog heel helicopter helmet herb heron hill hippo hive hockey
hoe hole holly honey hood hook hoop horn horse hose hospital hotdog hotel hourglass
house hovercraft hut hyena iceberg icicle igloo insect iron island jacket jaguar jar jaw
jeep jelly jellyfish jet jewel joystick jug juice jumper jungle kangaroo kayak kebab
kettle key keyboard keyhole kitchen kite kitten kiwi knee knife knight koala ladder
ladle ladybird lake lamb lamp lantern laptop lasagna latch laundry lawn leaf leash
leather leek lemon leopard letter lettuce lever library lid lifeboat lighthouse lily
lime lion lips lipstick lizard llama lobster lock locomotive log lollipop loom lorry
luggage lunchbox magnet mailbox mall mango map maple marble marker marshmallow mask mat
match mattress meadow medal melon microphone microscope microwave milk mill mirror mitt
mitten mixer mole money monkey moon moose mop mosquito moss moth motorcycle mountain
mouse mouth mug mushroom mustard nail napkin necklace needle nest net newspaper noodle
nose nozzle nut oak oar oasis octopus oil olive onion orange orchard orchid ostrich otter
oven owl ox oyster paddle padlock pail paint paintbrush painting palace palm pancake
panda panther pants paper parachute parcel park parrot parsley passport pasta path patio
paw pea peach peacock peanut pear pearl pebble pedal pelican pen pencil penguin pepper
perfume petal phone photo piano pickle picture pie pier pig pigeon pillow pin pineapple
pipe pirate pizza plane planet plant plaster plate platform platypus playground pliers
plug plum pocket pod polar-bear pole pond pony pool popcorn porcupine porch port
postcard pot potato pouch powder prawn present pretzel printer prison propeller pumpkin
puppet purse puzzle pyramid quail queen quilt rabbit raccoon radar radiator radio raft
rail railway rain rainbow rake raspberry rat rattle razor recorder refrigerator reindeer
ribbon rice ring river road robot rock rocket rod roof rooster rope rose rowboat rubber
rug ruler saddle sail sailboat salad salmon salt sandal sandwich satellite saucepan
sausage saw saxophone scale scarecrow scarf school scissors scooter scoreboard scorpion
screwdriver scroll seagull seahorse seal seashell seat seaweed seed seesaw shark sheep
shelf shell shield ship shirt shoe shop shore shovel shower shrimp shrine sidewalk sign
sink skate skateboard skeleton ski skirt skull skunk sky skyscraper sledge
sleeping-bag sleeve slide slippers slope slug snail snake snorkel snow snowball
snowflake snowman soap sock sofa soil soup spade spaghetti sparrow spatula speaker spider
spinach sponge spoon spotlight spray spring squirrel stadium stage stamp star starfish
statue steak steam steel stem stew stick sticker stingray stool stopwatch stork stove
strawberry street string stroller submarine sugar suitcase sun sunflower sunglasses
supermarket surfboard swan sweater swing sword syringe table taco tail tambourine tank
tape target taxi teapot teddy telephone telescope television tent terrace thermometer
thistle thorn thread throne thumb thunder ticket tiger tile toaster toe toilet tomato
tongs tongue toolbox tooth toothbrush toothpaste torch tornado tortoise tower tractor
traffic-light trail train trampoline trap tray treasure tree triangle tricycle trolley
trombone trophy truck trumpet tuba tulip tuna tunnel turkey turnip turtle tusk tweezers
typewriter tyre umbrella underground uniform vacuum valley van vase vegetable veil vest
village vine vinegar violin volcano vulture wagon wall wallet walnut walrus wand
wardrobe warehouse wasp watch water waterfall watermelon wave wax weasel web weed well
whale wheat wheel wheelbarrow wheelchair whistle wig willow windmill window wine wing
wire wolf wood woodpecker wool workshop worm wrench wrist xylophone yacht yak yard yarn
yoghurt yolk zebra zipper zoo
`
  .trim()
  .split(/\s+/)
  .map((w) => w.toLowerCase().trim())
  .filter(Boolean);

const PERSON_ROLES = new Set(
  `teacher doctor nurse chef firefighter pilot police farmer artist dentist coach scientist astronaut veterinarian baker cashier student librarian engineer lifeguard beekeeper jogger soldier queen king fairy clown vet pilot barista`
    .split(/\s+/)
);

function extractTopicCatalogWords() {
  const loop = fs.readFileSync(path.join(ROOT, 'scripts/asset-coverage-loop.mjs'), 'utf8');
  const start = loop.indexOf('const TOPIC_CATALOG');
  if (start < 0) throw new Error('TOPIC_CATALOG not found');
  const end = loop.indexOf('\n];', start);
  if (end < 0) throw new Error('TOPIC_CATALOG end not found');
  const slice = loop.slice(start, end + 3);
  const sandbox = { module: { exports: {} } };
  vm.createContext(sandbox);
  vm.runInContext(`${slice}\nmodule.exports = TOPIC_CATALOG;`, sandbox);
  const catalog = sandbox.module.exports;
  const topics = [];
  for (const t of catalog) {
    if (!t?.id || !Array.isArray(t.words) || !t.words.length) continue;
    topics.push({
      id: String(t.id),
      words: t.words.map((w) => String(w).toLowerCase().trim()).filter(Boolean),
    });
  }
  return topics;
}

function extractTopicIdentityCores() {
  const code = fs.readFileSync(path.join(ROOT, 'public/lib/topicIdentity.js'), 'utf8');
  const topics = [];
  // Only match coreConcepts: [ ... ] arrays (not titles / match patterns)
  const re = /coreConcepts:\s*\[([^\]]*)\]/g;
  let i = 0;
  for (const m of code.matchAll(re)) {
    const words = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1].toLowerCase().trim());
    if (!words.length) continue;
    topics.push({ id: `ti-core-${++i}-${words[0]}`, words });
  }
  return topics;
}

function main() {
  const topics = [...extractTopicCatalogWords(), ...extractTopicIdentityCores()];
  const usefulness = {};
  for (const t of topics) {
    for (const w of t.words) {
      if (!usefulness[w]) usefulness[w] = 0.7; // demand/topic listed
    }
  }
  for (const w of EXTRAS) {
    if (usefulness[w] == null) usefulness[w] = 0.5; // extras-only
  }
  // Boost very common A1-ish concrete nouns that appear in many topics
  const A1_BOOST = [
    'ball', 'book', 'cat', 'dog', 'apple', 'water', 'house', 'school', 'car',
    'bus', 'train', 'bike', 'fish', 'bird', 'tree', 'flower', 'sun', 'moon',
    'star', 'pen', 'pencil', 'bag', 'shoe', 'hat', 'door', 'window', 'table',
    'chair', 'bed', 'phone', 'cake', 'bread', 'milk', 'egg', 'rice', 'soup',
  ];
  for (const w of A1_BOOST) usefulness[w] = 1.0;

  const picturable = {};
  const allWords = new Set([...topics.flatMap((t) => t.words), ...EXTRAS]);
  for (const w of allWords) {
    if (DENY.includes(w)) continue;
    picturable[w] = PERSON_ROLES.has(w) ? 0.4 : 1.0;
  }

  const source = {
    version: 1,
    note:
      'Curated picturable ESL source for dictionary coverage. topics[].words are demand/lesson lists; extras are niche nouns. deny excludes non-picturables. Regenerated via scripts/seed-picturable-source.mjs then hand-edited as needed.',
    topics,
    extras: EXTRAS.filter((w) => !DENY.includes(w)),
    deny: [...new Set(DENY)].sort(),
    usefulness,
    picturable,
    canonicalWhitelist: {
      'airport gate': 'gate.png',
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(source, null, 2) + '\n');
  const dictWords = new Set();
  for (const t of topics) {
    for (const w of t.words) {
      if (!DENY.includes(w)) dictWords.add(w);
    }
  }
  for (const w of source.extras) dictWords.add(w);
  console.log(
    `seeded ${OUT}\n  topics=${topics.length} extras=${source.extras.length} deny=${source.deny.length} uniqueWords≈${dictWords.size}`
  );
}

main();
