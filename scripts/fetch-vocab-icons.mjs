/**
 * Build public/assets/07_vocab-pack from Twemoji.
 *
 * The pack used to be assembled by fuzzy-matching lesson words against Twemoji
 * shortnames, which is how "corn" ended up as a hamster and "school" as a bus.
 * Every mapping below is chosen by hand, and the build refuses to run if two
 * words would land on the same picture — a match activity needs distinct art.
 *
 *   node scripts/fetch-vocab-icons.mjs          only fetch what is missing
 *   node scripts/fetch-vocab-icons.mjs --force  re-render everything
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'public', 'assets', '07_vocab-pack');
const IMG = path.join(PACK, 'img');
const INDEX = path.join(PACK, 'index.json');
const CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg';
const SIZE = 256;

/** word → the emoji a child should name correctly when they see it. */
const WORDS = {
  // food and drink
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', lemon: '🍋',
  strawberry: '🍓', watermelon: '🍉', peach: '🍑', cherry: '🍒', pear: '🍐',
  pineapple: '🍍', mango: '🥭', coconut: '🥥', kiwi: '🥝', avocado: '🥑',
  bread: '🍞', cheese: '🧀', egg: '🥚', milk: '🥛', rice: '🍚',
  noodle: '🍜', soup: '🍲', salad: '🥗', pizza: '🍕', sandwich: '🥪',
  cake: '🍰', cookie: '🍪', carrot: '🥕', potato: '🥔', tomato: '🍅',
  onion: '🧅', corn: '🌽', mushroom: '🍄', broccoli: '🥦', cucumber: '🥒',
  meat: '🍖', hamburger: '🍔', 'hot dog': '🌭', 'french fries': '🍟',
  popcorn: '🍿', donut: '🍩', pancake: '🥞', 'ice cream': '🍦',
  chocolate: '🍫', candy: '🍬', juice: '🧃', tea: '🍵', coffee: '☕',

  // animals
  dog: '🐶', cat: '🐱', bird: '🐦', fish: '🐟', horse: '🐴',
  cow: '🐮', pig: '🐷', sheep: '🐑', chicken: '🐔', duck: '🦆',
  rabbit: '🐰', mouse: '🐭', lion: '🦁', tiger: '🐯', bear: '🐻',
  elephant: '🐘', monkey: '🐵', giraffe: '🦒', zebra: '🦓', panda: '🐼',
  fox: '🦊', wolf: '🐺', frog: '🐸', snake: '🐍', turtle: '🐢',
  whale: '🐳', dolphin: '🐬', shark: '🦈', octopus: '🐙', crab: '🦀',
  butterfly: '🦋', bee: '🐝', ant: '🐜', spider: '🕷️', penguin: '🐧',
  koala: '🐨', hippo: '🦛', kangaroo: '🦘', camel: '🐫', squirrel: '🐿️',

  // nature and weather
  tree: '🌳', flower: '🌸', leaf: '🍃', grass: '🌿', cactus: '🌵',
  sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️', rain: '🌧️',
  snow: '❄️', fire: '🔥', water: '💧', wind: '🌬️', rainbow: '🌈',
  storm: '⛈️', hot: '🥵', cold: '🥶', morning: '🌅', night: '🌃',

  // places
  house: '🏠', school: '🏫', hospital: '🏥', bank: '🏦', store: '🏪',
  park: '🏞️', bridge: '🌉', castle: '🏰', tent: '⛺', factory: '🏭',
  hotel: '🏨', museum: '🏛️', church: '⛪', library: '📚',

  // transport
  car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', boat: '⛵',
  ship: '🚢', bicycle: '🚲', motorcycle: '🏍️', truck: '🚚', taxi: '🚕',
  rocket: '🚀', tractor: '🚜', 'traffic light': '🚦',

  // school and objects
  book: '📕', pencil: '✏️', pen: '🖊️', ruler: '📏', scissors: '✂️',
  backpack: '🎒', computer: '💻', phone: '📱', camera: '📷', clock: '⏰',
  watch: '⌚', key: '🔑', lock: '🔒', door: '🚪', window: '🪟',
  bed: '🛏️', chair: '🪑', lamp: '💡', mirror: '🪞', homework: '📝',
  notebook: '📓', crayon: '🖍️', paint: '🎨', calculator: '🧮',
  question: '❓', alphabet: '🔤', menu: '📋', receipt: '🧾',
  wallet: '👛', 'credit card': '💳', 'shopping cart': '🛒',

  // home
  sofa: '🛋️', bathtub: '🛁', toilet: '🚽', broom: '🧹', plant: '🪴',
  stairs: '🪜', shower: '🚿', soap: '🧼', toothbrush: '🪥',

  // clothes
  shirt: '👕', dress: '👗', hat: '🎩', shoe: '👟', glove: '🧤',
  coat: '🧥', glasses: '👓', ring: '💍', crown: '👑', socks: '🧦',
  pants: '👖', boots: '🥾', scarf: '🧣', cap: '🧢',

  // people and jobs
  doctor: '🧑‍⚕️', nurse: '👩‍⚕️', teacher: '👩‍🏫', student: '🧑‍🎓',
  chef: '👨‍🍳', police: '👮', firefighter: '🧑‍🚒', farmer: '🧑‍🌾',
  pilot: '🧑‍✈️', mechanic: '🧑‍🔧', scientist: '🧑‍🔬', artist: '🧑‍🎨',
  singer: '🧑‍🎤', astronaut: '🧑‍🚀', baby: '👶', family: '👨‍👩‍👧',
  friend: '🤝', mother: '👩', father: '👨', sister: '👧', brother: '👦',
  grandmother: '👵', grandfather: '👴',

  // feelings
  happy: '😀', sad: '😢', angry: '😠', tired: '😫', scared: '😨',
  surprised: '😲', excited: '🤩', bored: '🥱', shy: '😊', worried: '😟',
  // "confused" was 😕 (1f615) — reads as a flat/meh neutral face at board size
  // (both feelings-compass judges). 🤔 (1f914, thinking / head-scratch) is
  // unmistakably puzzled and distinct from 😲 surprised / 😳 shy / 😟 worried.
  // This is the picture the New Words drag dock actually renders (wordArtPng →
  // vocab pack PNG), so the pack mapping — not just the emoji override — must change.
  confused: '🤔', sick: '🤒', hurt: '🤕', sleepy: '😴',

  // actions
  run: '🏃', walk: '🚶', swim: '🏊', dance: '💃', sing: '🎙️',
  read: '📖', write: '✍️', sleep: '🛌', eat: '🍽️', drink: '🥤',
  cook: '🍳', clean: '🧽', jump: '🤸',

  // health
  medicine: '💊', bandage: '🩹', injection: '💉', thermometer: '🌡️',
  stethoscope: '🩺', ambulance: '🚑', mask: '😷', wheelchair: '🦽',
  appointment: '📅', calendar: '🗓️',

  // travel
  passport: '🛂', ticket: '🎫', suitcase: '🧳', luggage: '🛄',
  customs: '🛃', departure: '🛫', arrival: '🛬', seat: '💺', delayed: '⏳',

  // body
  heart: '❤️', eye: '👁️', ear: '👂', nose: '👃', mouth: '👄',
  hand: '✋', foot: '🦶', brain: '🧠', tooth: '🦷',

  // sport, play, music
  ball: '🏐', soccer: '⚽', basketball: '🏀', football: '🏈', tennis: '🎾',
  baseball: '⚾', trophy: '🏆', medal: '🏅', cycling: '🚴', camping: '🏕️',
  fishing: '🎣', game: '🎮', puzzle: '🧩', kite: '🪁', skateboard: '🛹',
  chess: '♟️', slide: '🛝', guitar: '🎸', piano: '🎹', drum: '🥁',
  violin: '🎻', trumpet: '🎺', microphone: '🎤', headphone: '🎧',
  // Distinct from piano — match cards need one picture per word (M7).
  music: '🎵', song: '🎶',

  // geography
  map: '🗺️', globe: '🌍', compass: '🧭', flag: '🚩', mountain: '⛰️',
  volcano: '🌋', island: '🏝️', beach: '🏖️', desert: '🏜️',

  // misc
  money: '💰', gift: '🎁', balloon: '🎈', candle: '🕯️', bell: '🔔',
  umbrella: '☂️', basket: '🧺', bag: '👜', box: '📦',

  // library / space / quiet — these had real index.json rows but were missing
  // from this map, so every pack rebuild deleted their PNGs as "stale". Keep the
  // producer self-consistent with the pack (mirrors vocabIcons SAFE_EMOJI).
  planet: '🪐', space: '🌌', story: '📜', shelf: '🗄️', quiet: '🤫',
};

/** Twemoji filename rule: codepoints joined by '-', FE0F dropped unless ZWJ. */
function codePoint(emoji) {
  const src = emoji.indexOf('\u200D') < 0 ? emoji.replace(/\uFE0F/g, '') : emoji;
  return [...src].map((c) => c.codePointAt(0).toString(16)).join('-');
}

function fileNameFor(word) {
  return `${word.replace(/[^a-z0-9]+/g, '-')}.png`;
}

async function main() {
  const force = process.argv.includes('--force');

  const seen = new Map();
  const collisions = [];
  for (const [word, emoji] of Object.entries(WORDS)) {
    const cp = codePoint(emoji);
    if (seen.has(cp)) collisions.push(`${word} and ${seen.get(cp)} both use ${emoji}`);
    else seen.set(cp, word);
  }
  if (collisions.length) {
    console.error('Two words cannot share one picture:');
    collisions.forEach((c) => console.error(`  ${c}`));
    process.exit(1);
  }

  fs.mkdirSync(IMG, { recursive: true });
  const prev = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : {};
  const generated = Object.fromEntries(
    Object.entries(prev).filter(([, e]) => e && e.source === 'generated')
  );

  const todo = Object.entries(WORDS).filter(([word, emoji]) => {
    // Hand-drawn sheet icons win over Twemoji until someone deletes source:generated.
    if (generated[word] && fs.existsSync(path.join(IMG, generated[word].file || fileNameFor(word)))) {
      return false;
    }
    if (force) return true;
    const entry = prev[word];
    return !entry || entry.emoji !== emoji || !fs.existsSync(path.join(IMG, fileNameFor(word)));
  });
  console.log(`${Object.keys(WORDS).length} words in pack, ${todo.length} to render`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  const failed = [];
  let done = 0;

  for (const [word, emoji] of todo) {
    const cp = codePoint(emoji);
    const res = await fetch(`${CDN}/${cp}.svg`);
    if (!res.ok) {
      failed.push(`${word} (${emoji}, ${cp}) — HTTP ${res.status}`);
      continue;
    }
    const svg = await res.text();
    const b64 = Buffer.from(svg, 'utf8').toString('base64');
    await page.setContent(
      `<style>html,body{margin:0;padding:0}img{display:block;width:${SIZE}px;height:${SIZE}px}</style>` +
        `<img src="data:image/svg+xml;base64,${b64}">`
    );
    await page.locator('img').screenshot({
      path: path.join(IMG, fileNameFor(word)),
      omitBackground: true,
    });
    done += 1;
    if (done % 40 === 0) console.log(`  rendered ${done}/${todo.length}`);
  }
  await browser.close();

  if (failed.length) {
    console.error('\nNo Twemoji art for these — fix the mapping or wishlist the word:');
    failed.forEach((f) => console.error(`  ${f}`));
  }

  const index = {};
  for (const word of Object.keys(WORDS).sort()) {
    const gen = generated[word];
    if (gen && fs.existsSync(path.join(IMG, gen.file || fileNameFor(word)))) {
      index[word] = gen;
      continue;
    }
    const file = fileNameFor(word);
    if (!fs.existsSync(path.join(IMG, file))) continue;
    index[word] = { file, emoji: WORDS[word], codepoint: codePoint(WORDS[word]) };
  }
  // Keep generated-only keys (abstract adjectives etc. not in Twemoji WORDS).
  for (const [word, entry] of Object.entries(generated)) {
    if (index[word]) continue;
    if (!entry.file || !fs.existsSync(path.join(IMG, entry.file))) continue;
    index[word] = entry;
  }
  const ordered = {};
  for (const k of Object.keys(index).sort()) ordered[k] = index[k];
  fs.writeFileSync(INDEX, `${JSON.stringify(ordered, null, 1)}\n`);

  const stale = fs
    .readdirSync(IMG)
    .filter((f) => f.endsWith('.png') && !Object.values(ordered).some((e) => e.file === f));
  stale.forEach((f) => fs.rmSync(path.join(IMG, f)));

  console.log(`\nindex.json: ${Object.keys(ordered).length} words`);
  if (stale.length) console.log(`removed ${stale.length} stale files`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
