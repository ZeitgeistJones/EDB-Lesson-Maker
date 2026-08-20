/* vocabIcons.js — resolve lesson vocabulary words to Twemoji pack PNGs.
 * Classic script → window.VocabIcons
 */
(function () {
  const INDEX_URL = 'assets/07_vocab-pack/index.json';
  const IMG_BASE = 'assets/07_vocab-pack/img/';

  let indexPromise = null;
  let indexCache = null;
  /** Closed-compound → hyphenated pack key (ferriswheel → ferris-wheel). */
  let dehyphenIndex = null;
  /** Last load failure — cleared on success. Never permanently cache `{}` on error. */
  let lastLoadError = null;

  /** Map "ferriswheel" → "ferris-wheel" for keys that contain hyphens. */
  function buildDehyphenIndex(index) {
    const map = Object.create(null);
    for (const key of Object.keys(index || {})) {
      if (!key.includes('-')) continue;
      if (!index[key] || !index[key].file) continue;
      const closed = key.replace(/-/g, '');
      if (!closed || closed === key) continue;
      // First hyphenated spelling wins; exact keyed rows stay preferred via lookupKey.
      if (!map[closed]) map[closed] = key;
    }
    return map;
  }

  function normalize(word) {
    return String(word || '')
      .trim()
      .toLowerCase()
      .replace(/[^\w\s'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Abstract ESL words rarely match Twemoji filenames.
   * Map meaning → pack key so dock art stays accurate for students.
   */
  const PACK_ALIASES = {
    grater: 'grater-icon',
    'kitchen timer': 'timer',
    // synonyms and inflections that should land on existing pack art
    athletic: 'basketball',
    sporty: 'soccer',
    sports: 'soccer',
    gym: 'basketball',
    runner: 'run',
    running: 'run',
    jogging: 'run',
    walking: 'walk',
    swimming: 'swim',
    dancing: 'dance',
    reading: 'read',
    writing: 'write',
    cooking: 'cook',
    eating: 'eat',
    drinking: 'drink',
    sleeping: 'sleep',
    jumping: 'jump',
    physician: 'doctor',
    dentist: 'doctor',
    // clinic-building.png (wave30 sheet2) — dedicated exterior beats hospital stand-in
    clinic: 'clinic-building',
    symptoms: 'sick',
    fever: 'thermometer',
    checkup: 'stethoscope',
    prescription: 'medicine',
    brush: 'toothbrush',
    brushing: 'toothbrush',
    smile: 'happy',
    smiling: 'happy',
    captain: 'captain-hat',
    crew: 'crew-badge',
    proud: 'proud-cue',
    worried: 'worried-cue',
    scared: 'scared-cue',
    confused: 'confused-cue',
    airplane: 'plane',
    aeroplane: 'plane',
    flight: 'plane',
    fly: 'plane',
    'boarding pass': 'boarding-pass',
    boarding: 'boarding-pass',
    'night sky': 'night-sky',
    nightsky: 'night-sky',
    yogurt: 'yoghurt',
    // Airport waiting-area art — never bare "gate" (castle/portcullis via PropBank)
    // boarding-gate.png (wave30) is dedicated; keep departure/arrival on same cue
    'boarding gate': 'boarding-gate',
    'departure gate': 'boarding-gate',
    'arrival gate': 'boarding-gate',
    seatbelt: 'seat',
    'jet lag': 'tired',
    // classroom.png (wave30) is dedicated — removed school stand-in alias
    cozy: 'cosy',
    patients: 'patient',
    exam: 'table',
    'exam table': 'table',
    yummy: 'delicious',
    tasty: 'delicious',
    line: 'queue',
    'waiting line': 'queue',
    mom: 'mother',
    mum: 'mother',
    dad: 'father',
    grandma: 'grandmother',
    grandpa: 'grandfather',
    // readiness-loop gaps — map to existing pack art only
    cart: 'shopping cart',
    shop: 'store',
    bedroom: 'bed',
    bakery: 'bread',
    oven: 'bread',
    flour: 'bread',
    pool: 'swim',
    float: 'boat',
    kick: 'ball',
    dive: 'swim',
    // story / quiet / shelf have own Twemoji pack rows (M7 — no share with book/library)
    towel: 'bathtub',
    market: 'store',
    buy: 'money',
    wash: 'soap',
    fruit: 'apple',
    exercise: 'ball',
    // music / song stay pack keys or SAFE_EMOJI — never piano.png (M7 match cards)
    lava: 'volcano',
    // eruption/ash have dedicated pack PNGs (Sheet V12) — do not alias to volcano.png
    // (shared art breaks match cards). Keep SAFE_EMOJI glyphs only as cold-pack fallback.
    seed: 'plant',
    // team.png is dedicated group art — do not fall back to ball
    tape: 'tape-dispenser',
    // hotel-room.png (wave30 sheet2) was thin/halo — do not wire; door stays stand-in
    room: 'door',
    'hotel room': 'door',
    // Classical compose unit — dedicated ivory/gold pack PNGs (compose.png …);
    // keep aliases only as fallbacks if a dedicated file is missing.
    // Weather adjectives → noun pack art (sun.png / rain.png / … already exist)
    sunny: 'sun',
    rainy: 'rain',
    windy: 'wind',
    snowy: 'snow',
    // Birthday party — wrapped-present.png (wave30) is dedicated; gift.png remains for "gift"
    present: 'wrapped-present',
    // Live board gaps — short lesson words → dedicated pack compounds
    picnic: 'picnic-basket',
    benches: 'bench',
    sunblock: 'sunscreen',
    // Pets — puppy/kitten share adult animal pack art (no dedicated cub PNGs)
    puppy: 'dog',
    kitten: 'cat',
    // Shift20-C — mid-obscure → existing pack keys only (empty > wrong)
    draw: 'pencil',
    // photography has dedicated pack art (Manus 2026-08-10) — alias only if missing
    photography: 'camera',
    // jewelry.png (wave30) is dedicated tray art — exact key wins; spelling variant:
    jewellery: 'jewelry',
    planetarium: 'planetarium-dome',
    // wave30 densify + orphans — hyphen bridge covers spaced forms; aliases for short nouns
    cream: 'cream-carton',
    salt: 'salt-shaker',
    // pepper alone stays ambiguous (bell pepper vs shaker) — no alias
    // bracelet.png is sparse (~30%) — keep banked exact key; do not alias synonyms onto it
    // earrings / hotel-room culled (thin/halo) — no aliases
    'tape measure': 'tape-measure',
    'vacuum cleaner': 'vacuum-cleaner',
    hardhat: 'helmet',
    'hard hat': 'helmet',
    // Manus white zip 2026-08-10 — phrase / inflection → pack slug
    'sleeping bag': 'sleeping-bag',
    sleepingbag: 'sleeping-bag',
    'walk the dog': 'walk-dog',
    'walk dog': 'walk-dog',
    walkingdog: 'walk-dog',
    cycling: 'cycle',
    bike: 'bicycle',
    drum: 'drums',
    'drum set': 'drums',
    drumset: 'drums',
    'xylophone mallets': 'xylophone',
    earphone: 'headphones',
    earphones: 'headphones',
    binocular: 'binoculars',
    'camp fire': 'campfire',
    'water fall': 'waterfall',
    'house plant': 'houseplant',
    'watering can': 'watering-can',
    'wheel barrow': 'wheelbarrow',
    'bird house': 'birdhouse',
    'instant camera': 'instant-camera',
    polaroid: 'instant-camera',
    ukelele: 'ukulele',
    uke: 'ukulele',
    // sheets 04–13 (2026-08-14) — synonyms / compound variants only
    // (spaced↔hyphen already bridged in resolveKeyWithKind)
    'cookie sheet': 'baking-tray',
    'baking sheet': 'baking-tray',
    'tea strainer': 'tea-infuser',
    infuser: 'tea-infuser',
    'ice tray': 'ice-cube-tray',
    'dish drainer': 'dish-rack',
    'drying rack': 'dish-rack',
    'clothes peg': 'clothespin',
    'clothes pin': 'clothespin',
    clothespeg: 'clothespin',
    keychain: 'keyring',
    'key ring': 'keyring',
    'key chain': 'keyring',
    'thread spool': 'thread-spool',
    'bath robe': 'bathrobe',
    'rubber ducky': 'rubber-duck',
    ducky: 'rubber-duck',
    'drain stopper': 'drain-plug',
    'bath plug': 'drain-plug',
    'tap handle': 'faucet-handle',
    'bath caddy': 'bathtub-tray',
    'bath tray': 'bathtub-tray',
    'record player': 'turntable',
    vinyl: 'vinyl-record',
    'lp record': 'vinyl-record',
    maracas: 'maraca',
    'tuning key': 'tuning-peg',
    'machine head': 'tuning-peg',
    'alcohol burner': 'alcohol-lamp',
    'spirit lamp': 'alcohol-lamp',
    'conical flask': 'erlenmeyer-flask',
    erlenmeyer: 'erlenmeyer-flask',
    'measuring cylinder': 'graduated-cylinder',
    forceps: 'tweezers',
    'fume cupboard': 'fume-hood',
    'name tag': 'name-badge',
    'ink pad': 'stamp-pad',
    inkpad: 'stamp-pad',
    thumbtack: 'push-pin',
    'drawing compass': 'compass-set',
    'geometry set': 'compass-set',
    samara: 'maple-seed',
    'helicopter seed': 'maple-seed',
    'pine needle': 'pine-needles',
    seedpod: 'seed-pod',
    'enamel mug': 'camping-mug',
    'camping cup': 'camping-mug',
    'sleeping pad': 'sleeping-mat',
    'yoga mat': 'sleeping-mat',
    'vacuum flask': 'thermos',
    'ski poles': 'ski-pole',
    mitten: 'winter-mittens',
    'winter mitten': 'winter-mittens',
    'cycle helmet': 'bike-helmet',
    barrette: 'hair-clip',
    // sheet7 cell is a flower hairpin, not a U bobby pin
    hairpin: 'flower-hairpin',
    'hair pin': 'flower-hairpin',
    'flower hairpin': 'flower-hairpin',
    pendant: 'pendant-necklace',
    purse: 'handbag',
    'school bag': 'school-backpack',
    schoolbag: 'school-backpack',
    'tie bar': 'tie-clip',
    'tie pin': 'tie-clip',
    // sheet6 strap was wrongly keyed over clothing belt — dedicated leather-strap.png
    'leather strap': 'leather-strap',
    'watch strap': 'leather-strap',
    streetcar: 'tram',
    'tram car': 'tram',
    'metro map': 'subway-map',
    'tube map': 'subway-map',
    'transit map': 'subway-map',
    'passport holder': 'passport-cover',
    'ticket kiosk': 'ticket-machine',
    'ticket booth': 'ticket-machine',
    // sheets 14–28 remaining pack (2026-08-14) — synonyms / spelling variants only
    // (spaced↔hyphen already bridged; do NOT re-wire culled earrings / hotel-room)
    duster: 'feather-duster',
    'scrubbing brush': 'scrub-brush',
    'spirit level': 'measuring-level',
    'bubble level': 'measuring-level',
    'allen key': 'hex-key',
    'allen wrench': 'hex-key',
    'hex wrench': 'hex-key',
    trowel: 'brick-trowel',
    'caulk gun': 'caulking-gun',
    'wire cutters': 'wire-cutter',
    'set square': 'carpenter-square',
    'locking pliers': 'vise-grip',
    cinnamon: 'cinnamon-stick',
    'vanilla bean': 'vanilla-pod',
    sesame: 'sesame-seed',
    'ice pop': 'popsicle',
    'ice lolly': 'popsicle',
    lolly: 'popsicle',
    'life boat': 'lifeboat',
    'ship wheel': 'ship-wheel',
    'ships wheel': 'ship-wheel',
    helm: 'ship-wheel',
    bollard: 'traffic-bollard',
    'bus stop': 'bus-shelter',
    'boom barrier': 'parking-barrier',
    'jersey barrier': 'road-divider',
    gauze: 'gauze-pad',
    swab: 'specimen-swab',
    'pill box': 'pill-organizer',
    suspenders: 'suspender',
    sweatshirt: 'hoodie',
    nightcap: 'pajama-cap',
    'pyjama cap': 'pajama-cap',
    'windscreen wiper': 'windshield-wiper',
    'number plate': 'license-plate',
    'gear stick': 'gearshift',
    'gear lever': 'gearshift',
    'gear shift': 'gearshift',
    bulb: 'flower-bulb',
    'potting mix': 'potting-soil',
    'curtain rail': 'curtain-rod',
    'lamp shade': 'lampshade',
    'shin pad': 'shin-guard',
    'mouth guard': 'mouthguard',
    hurdle: 'relay-hurdle',
    windsock: 'wind-sock',
    hail: 'hailstone',
    'zip tie': 'cable-tie',
    'zip ties': 'cable-tie',
    'cable ties': 'cable-tie',
    'power adaptor': 'power-adapter',
    'plug adaptor': 'plug-adapter',
    scaffold: 'scaffolding',
    'work light': 'worklight',
    pulley: 'pulley-block',
    hoist: 'chain-hoist',
  };

  /**
   * Pack keys whose art is a misleading stand-in for the ESL word.
   * Force the alias even when index.json has an exact filename.
   * (clean.png is a kitchen sponge — soap is closer for dental hygiene.)
   */
  const PACK_OVERRIDES = {
    // clean.png is a kitchen sponge — prefer dental sparkle tooth when banked,
    // else soap (still better than sponge for hygiene units).
    clean: 'clean-tooth',
    // inspire.png is now dedicated ivory/gold lightbulb+lyre (classical pack).
    // Do NOT override to brain — that was the interim stand-in for the old starburst.
  };
  // Tried in order after the primary PACK_OVERRIDES target misses the index.
  const PACK_OVERRIDE_FALLBACKS = {
    clean: ['soap'],
  };

  /**
   * Concepts with no pack art but a glyph that is unmistakably them, and that
   * no pack word already uses — a shared picture makes matching unplayable.
   * Anything else belongs in docs/asset-wishlist.md, not a near-enough guess.
   */
  const SAFE_EMOJI = {
    // Pack art preferred when present; these are glyph-only fallbacks.
    energetic: '⚡',
    // Volcano B1+ fixture — unique glyphs so match cards stay playable (M7).
    abundant: '📦',
    remnant: '🗿',
    vulnerable: '⚠️',
    geothermal: '♨️',
    subterranean: '🕳️',
    trauma: '💔',
    dormant: '😴',
    evacuation: '🚪',
    seismic: '📉',
    tremors: '🫨',
    ash: '🌫️',
    // Music unit — only until Twemoji pack rows land; never share piano.png.
    music: '🎵',
    song: '🎶',
    // Library / space — pack PNGs preferred; glyphs keep isCurated if pack lags.
    shelf: '🗄️',
    quiet: '🤫',
    story: '📜',
    planet: '🪐',
    space: '🌌',
    // School clubs / STEM — glyph fallback if pack/prop cold; exact robot.png
    // from vocab-clubs sheet wins when warm. Soft gashapon/space robots stay
    // gated out of match via isDockSharp.
    robot: '🤖',
    // Sports — pack PNGs are white-plate icons; prefer these glyphs over pack
    // when PropBank has no dock-sharp cutout (Sports Arena white squares).
    ball: '⚽',
    soccer: '⚽',
    football: '⚽',
    team: '👥',
    score: '🏆',
    whistle: '📣',
    run: '🏃',
    game: '🎮', // video sense only — sports lessons override via VocabArt sense gate
    games: '🎮',
    goal: '🥅',
    net: '🥅',
    racket: '🎾',
    uniform: '👕',
    court: '🏟️',
    practice: '🏋️',
    effort: '💪',
    teamwork: '🤝',
    // Food / transport — glyphs when pack is gated out of board bake (no white
    // plates) and/or glossy family wrongly empties the matte identity pool.
    apple: '🍎',
    banana: '🍌',
    carrot: '🥕',
    grape: '🍇',
    bus: '🚌',
    bike: '🚲',
    bicycle: '🚲',
    // Postal wax seal — prop is dockSafe:false (white plate); glyph keeps
    // sense-corroborated "Sending a Letter" pictured without the plate.
    seal: '🔏',
    // School / desk — keep adapt probes able to promote pictured overflow when
    // pack white-plates are gated out of the board ladder.
    pencil: '✏️',
    eraser: '🧽',
    notebook: '📓',
    microscope: '🔬',
    clipboard: '📋',
    // Kitchen helpers — glyphs when densify kitchen-* props are white-plate
    // gated and bake-* aliases miss (board bake never paints pack plates).
    // Never 🥼 for apron — reads as doctor/lab coat (Kitchen Helpers story miss).
    whisk: '🥣',
    spatula: '🍳',
    grater: '🧀',
    blender: '🥤',
    timer: '⏲️',
  };

  /**
   * Distinct glyphs for feeling words whose default emoji collides with another
   * taught feeling. "shy" (😊 blushing smile) and "happy" (😄) both read as
   * smiles on the New Words match dock — students cannot tell the pads apart.
   * 😳 (flushed / looking-away) is the clear ESL "shy" face and is widely
   * supported. Overrides win in emojiFor over both SAFE_EMOJI and the fixture.
   */
  const EMOJI_OVERRIDES = {
    shy: '😳',
    // "confused" default 😕 reads as flat/meh (neutral 😐) on the New Words drag
    // dock — both judges flagged it. 🤔 (thinking / head-scratch) is unmistakably
    // puzzled and distinct from 😲 surprised / 😳 shy / 😟 worried. Override wins
    // over the fixture emoji so the match dock and Feelings Lab stay in sync.
    confused: '🤔',
    // Fallback glyph if PropBank/job-coach is cold or excluded. Fixture 🧑‍🏫
    // reads as "teacher" — cap is the clearer coach-adjacent stand-in. Prefer
    // VocabArt prop tier → job-coach when the cutout is loaded.
    coach: '🧢',
  };

  function emojiFor(word, fallback) {
    const key = normalize(word);
    return EMOJI_OVERRIDES[key] || SAFE_EMOJI[key] || fallback || '•';
  }

  /**
   * Human-vetted glyph only — SAFE_EMOJI / EMOJI_OVERRIDES (and alias→SAFE).
   * Never Gemini fallback, never bullet. Null = no curated glyph.
   */
  function curatedGlyph(word) {
    const key = normalize(word);
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(EMOJI_OVERRIDES, key)) {
      return EMOJI_OVERRIDES[key];
    }
    if (Object.prototype.hasOwnProperty.call(SAFE_EMOJI, key)) {
      return SAFE_EMOJI[key];
    }
    const alias = PACK_ALIASES[key];
    if (alias && Object.prototype.hasOwnProperty.call(SAFE_EMOJI, alias)) {
      return SAFE_EMOJI[alias];
    }
    return null;
  }

  /**
   * True when board art is human-vetted (not a Gemini guess): either a
   * curated glyph or a resolved Twemoji pack key (incl. aliases).
   * Requires ready()/loadIndex first for pack hits; curated glyphs work sync.
   */
  function isCurated(word) {
    const key = normalize(word);
    if (!key) return false;
    if (curatedGlyph(word)) return true;
    if (!indexCache) return false;
    return !!resolveKey(indexCache, word);
  }

  function indexReady() {
    return !!indexCache;
  }

  function loadError() {
    return lastLoadError;
  }

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL)
        .then((r) => {
          if (!r.ok) throw new Error('Vocab icon index failed to load (' + r.status + ')');
          return r.json();
        })
        .then((data) => {
          // Empty object is a valid warm index (zero pack rows) — but only after
          // a successful fetch. Failures must NOT lock a permanent cold cache.
          indexCache = data && typeof data === 'object' ? data : {};
          dehyphenIndex = buildDehyphenIndex(indexCache);
          lastLoadError = null;
          return indexCache;
        })
        .catch((err) => {
          indexPromise = null;
          lastLoadError = err instanceof Error ? err : new Error(String(err));
          console.warn('[VocabIcons] index load failed (retryable):', lastLoadError);
          return Promise.reject(lastLoadError);
        });
    }
    return indexPromise;
  }

  function lookupKey(index, key) {
    if (!key) return null;
    if (index[key] && index[key].file) return key;
    return null;
  }

  function resolveKey(index, word) {
    const hit = resolveKeyWithKind(index, word);
    return hit ? hit.key : null;
  }

  /**
   * How a pack PNG was chosen for this word.
   * exact/plural = dedicated (or close inflection) art — keep for New Words.
   * alias/override/token = stand-in — VocabArt may prefer a sharp black prop.
   * @returns {{ key: string, kind: 'exact'|'override'|'alias'|'plural'|'token' }|null}
   */
  function resolveKeyWithKind(index, word) {
    const raw = normalize(word);
    if (!raw || !index) return null;

    // Bad stand-ins (sponge-for-clean) — force the override before exact key.
    const override = PACK_OVERRIDES[raw];
    if (override) {
      const forced = lookupKey(index, override);
      if (forced) return { key: forced, kind: 'override' };
      const fallbacks = PACK_OVERRIDE_FALLBACKS[raw] || [];
      for (const fb of fallbacks) {
        const hitFb = lookupKey(index, fb);
        if (hitFb) return { key: hitFb, kind: 'override' };
      }
    }

    let hit = lookupKey(index, raw);
    if (hit) return { key: hit, kind: 'exact' };

    // Pack index keys are hyphenated (`pet-food`); lesson words keep spaces
    // (`pet food`). Bridge before aliases / last-token so dedicated art wins
    // Coverage@Demand instead of false gaps (routines, pets, library…).
    if (raw.includes(' ')) {
      const hyphen = raw.replace(/\s+/g, '-');
      hit = lookupKey(index, hyphen);
      if (hit) return { key: hit, kind: 'exact' };
    }

    // Closed compounds (Gemini often writes "ferriswheel") → hyphenated pack key.
    if (!raw.includes(' ') && !raw.includes('-') && dehyphenIndex) {
      const bridged = dehyphenIndex[raw.replace(/'/g, '')];
      if (bridged) {
        hit = lookupKey(index, bridged);
        if (hit) return { key: hit, kind: 'exact' };
      }
    }

    const alias = PACK_ALIASES[raw];
    if (alias) {
      hit = lookupKey(index, alias);
      if (hit) return { key: hit, kind: 'alias' };
      // Alias may be a spaced phrase that the index stores hyphenated.
      if (String(alias).includes(' ')) {
        hit = lookupKey(index, String(alias).replace(/\s+/g, '-'));
        if (hit) return { key: hit, kind: 'alias' };
      }
    }

    // plural → singular (simple trailing s) — skip -ous/-ss adjectives ("spacious")
    if (raw.length > 3 && raw.endsWith('s') && !raw.endsWith('ss') && !raw.endsWith('ous')) {
      hit = lookupKey(index, raw.slice(0, -1));
      if (hit) return { key: hit, kind: 'plural' };
    }

    // multi-token → last token
    if (raw.includes(' ')) {
      const parts = raw.split(' ');
      hit = lookupKey(index, parts[parts.length - 1]);
      if (hit) return { key: hit, kind: 'token' };
    }

    return null;
  }

  /**
   * Sync pack match kind — only after ready()/loadIndex.
   * Stand-ins (alias/override/token) are fair game for a sharper 09_props cutout.
   */
  function matchKindSync(word) {
    if (!indexCache) return null;
    const hit = resolveKeyWithKind(indexCache, word);
    return hit ? hit.kind : null;
  }

  function isStandInPack(word) {
    const kind = matchKindSync(word);
    return kind === 'alias' || kind === 'override' || kind === 'token';
  }

  async function pathFor(word) {
    const index = await loadIndex();
    const key = resolveKey(index, word);
    if (!key) return null;
    const file = index[key].file;
    return IMG_BASE + file;
  }

  /**
   * Synchronous pack-path resolver — only works after ready()/loadIndex has
   * populated indexCache. Lets the board planner (buildBoardPlan, synchronous)
   * repoint feeling dock pieces at the SAME vetted pack PNG the New Words match
   * dock renders, so both drag surfaces show one consistent face set (S59).
   */
  function pathForSync(word) {
    if (!indexCache) return null;
    const key = resolveKey(indexCache, word);
    if (!key) return null;
    const file = indexCache[key].file;
    return IMG_BASE + file;
  }

  async function has(word) {
    return (await pathFor(word)) != null;
  }

  /** Bake-session fetch memo — same pack path coalesces to one Promise. */
  const _pngByPath = new Map();

  async function loadPng(word) {
    const path = await pathFor(word);
    if (!path) return null;
    if (_pngByPath.has(path)) return _pngByPath.get(path);
    const pending = (async () => {
      try {
        const res = await fetch(path);
        if (!res.ok) return null;
        return new Uint8Array(await res.arrayBuffer());
      } catch (_) {
        return null;
      }
    })();
    _pngByPath.set(path, pending);
    return pending;
  }

  function allKeys() {
    return indexCache ? Object.keys(indexCache) : [];
  }

  window.VocabIcons = {
    pathFor,
    pathForSync,
    matchKindSync,
    isStandInPack,
    has,
    loadPng,
    emojiFor,
    curatedGlyph,
    isCurated,
    indexReady,
    loadError,
    allKeys,
    ready: loadIndex,
    CREDIT: 'Twemoji by Twitter, Inc and other contributors',
  };
})();
