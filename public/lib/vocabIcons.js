/* vocabIcons.js — resolve lesson vocabulary words to Twemoji pack PNGs.
 * Classic script → window.VocabIcons
 */
(function () {
  const INDEX_URL = 'assets/07_vocab-pack/index.json';
  const IMG_BASE = 'assets/07_vocab-pack/img/';

  let indexPromise = null;
  let indexCache = null;

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
  };

  function emojiFor(word, fallback) {
    const key = normalize(word);
    return EMOJI_OVERRIDES[key] || SAFE_EMOJI[key] || fallback || '•';
  }

  /**
   * True when board art is human-vetted (not a Gemini guess): either a
   * SAFE_EMOJI fallback or a resolved Twemoji pack key (incl. aliases).
   * Requires ready()/loadIndex first for pack hits; SAFE_EMOJI works sync.
   */
  function isCurated(word) {
    const key = normalize(word);
    if (!key) return false;
    if (Object.prototype.hasOwnProperty.call(SAFE_EMOJI, key)) return true;
    // Alias → SAFE_EMOJI (e.g. compose→music) without waiting on pack index.
    const alias = PACK_ALIASES[key];
    if (alias && Object.prototype.hasOwnProperty.call(SAFE_EMOJI, alias)) return true;
    if (!indexCache) return false;
    return !!resolveKey(indexCache, word);
  }

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL)
        .then((r) => {
          if (!r.ok) throw new Error('Vocab icon index failed to load');
          return r.json();
        })
        .then((data) => {
          indexCache = data || {};
          return indexCache;
        })
        .catch((err) => {
          indexPromise = null;
          console.warn(err);
          indexCache = {};
          return indexCache;
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

  async function loadPng(word) {
    const path = await pathFor(word);
    if (!path) return null;
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch (_) {
      return null;
    }
  }

  window.VocabIcons = {
    pathFor,
    pathForSync,
    has,
    loadPng,
    emojiFor,
    isCurated,
    ready: loadIndex,
    CREDIT: 'Twemoji by Twitter, Inc and other contributors',
  };
})();
