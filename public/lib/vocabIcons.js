/* vocabIcons.js — resolve lesson vocabulary words to Twemoji pack PNGs.
 * Classic script → window.VocabIcons
 */
(function () {
  const INDEX_URL = 'assets/07_vocab-pack/index.json';
  const IMG_BASE = 'assets/07_vocab-pack/img/';

  let indexPromise = null;
  let indexCache = null;
  /** Last load failure — cleared on success. Never permanently cache `{}` on error. */
  let lastLoadError = null;

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
    clinic: 'hospital',
    symptoms: 'sick',
    fever: 'thermometer',
    checkup: 'stethoscope',
    prescription: 'medicine',
    brush: 'toothbrush',
    brushing: 'toothbrush',
    smile: 'happy',
    smiling: 'happy',
    airplane: 'plane',
    aeroplane: 'plane',
    flight: 'plane',
    fly: 'plane',
    'boarding pass': 'boarding-pass',
    boarding: 'boarding-pass',
    // Airport waiting-area art — never bare "gate" (castle/portcullis via PropBank)
    'boarding gate': 'airport gate',
    'departure gate': 'airport gate',
    'arrival gate': 'airport gate',
    seatbelt: 'seat',
    'jet lag': 'tired',
    classroom: 'school',
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
    eruption: 'volcano',
    // ash stays SAFE_EMOJI — sharing volcano.png with eruption breaks match cards
    seed: 'plant',
    team: 'ball',
    // hotel place noun — door.png is the vetted stand-in (not Gemini)
    room: 'door',
    // Classical compose unit — dedicated ivory/gold pack PNGs (compose.png …);
    // keep aliases only as fallbacks if a dedicated file is missing.
    // Weather adjectives → noun pack art (sun.png / rain.png / … already exist)
    sunny: 'sun',
    rainy: 'rain',
    windy: 'wind',
    snowy: 'snow',
    // Birthday party — present is the ESL synonym for gift.png (already in pack)
    present: 'gift',
    // Pets — puppy/kitten share adult animal pack art (no dedicated cub PNGs)
    puppy: 'dog',
    kitten: 'cat',
    // Shift20-C — mid-obscure → existing pack keys only (empty > wrong)
    draw: 'pencil',
    photography: 'camera',
    jewelry: 'ring',
    hardhat: 'helmet',
    'hard hat': 'helmet',
  };

  /**
   * Pack keys whose art is a misleading stand-in for the ESL word.
   * Force the alias even when index.json has an exact filename.
   * (clean.png is a kitchen sponge — soap is closer for dental hygiene.)
   */
  const PACK_OVERRIDES = {
    clean: 'soap',
    // inspire.png is now dedicated ivory/gold lightbulb+lyre (classical pack).
    // Do NOT override to brain — that was the interim stand-in for the old starburst.
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
    // School clubs / STEM — both bank robots are soft blob splices (< MIN_DOCK_SRC);
    // glyph until a sharp vocab-pack or dock-safe cutout lands.
    robot: '🤖',
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
    const raw = normalize(word);
    if (!raw) return null;

    // Bad stand-ins (sponge-for-clean) — force the override before exact key.
    const override = PACK_OVERRIDES[raw];
    if (override) {
      const forced = lookupKey(index, override);
      if (forced) return forced;
    }

    let hit = lookupKey(index, raw);
    if (hit) return hit;

    const alias = PACK_ALIASES[raw];
    if (alias) {
      hit = lookupKey(index, alias);
      if (hit) return hit;
    }

    // plural → singular (simple trailing s) — skip -ous/-ss adjectives ("spacious")
    if (raw.length > 3 && raw.endsWith('s') && !raw.endsWith('ss') && !raw.endsWith('ous')) {
      hit = lookupKey(index, raw.slice(0, -1));
      if (hit) return hit;
    }

    // multi-token → last token
    if (raw.includes(' ')) {
      const parts = raw.split(' ');
      hit = lookupKey(index, parts[parts.length - 1]);
      if (hit) return hit;
    }

    return null;
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

  window.VocabIcons = {
    pathFor,
    pathForSync,
    has,
    loadPng,
    emojiFor,
    curatedGlyph,
    isCurated,
    indexReady,
    loadError,
    ready: loadIndex,
    CREDIT: 'Twemoji by Twitter, Inc and other contributors',
  };
})();
