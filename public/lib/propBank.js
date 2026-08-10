/* propBank.js — resolve board props out of 09_props by IDENTITY, then rank.
 *
 * Classic script (no ES modules) → window.PropBank, a deliberate sibling of
 * VocabIcons and SceneBackgrounds.
 *
 * Empty beats wrong. Tags never qualify a candidate into the pool — only exact
 * key / alias / pack-suffix head (endsWith -token) / optional identity[] do.
 * Non-head compound tokens do NOT qualify (grandfather↛clock, ear↛defenders,
 * coffee↛table). Tags may rank inside that pool (capped). Soft nouns live in
 * lib/propPolicy.json deny list; subjectLock / never / ambiguous / aliases are
 * phase-2 hard filters on top. Chrome / slot-fill uses pickDecor, not resolve().
 *
 * resolve() is synchronous so recipes (which run inside the synchronous
 * EdbActivities.buildBoardPlan) can call it. Await ready() once before building
 * a plan; until then the bank is empty and every query answers null.
 */
(function () {
  const BASE = 'assets/09_props';
  const POLICY_URL = 'lib/propPolicy.json';
  const BOARD_H = 590;
  /** Default scored-path floor. Identity exact hits via byWord bypass scoring. */
  const DEFAULT_MIN_SCORE = 4;
  /** Tag rank bonus inside an identity pool only — never candidacy. */
  const TAG_RANK_EACH = 1;
  const TAG_RANK_CAP = 2;

  /** relativeScale 1.0 against a 590px board, and the floor below which a cutout is mush. */
  const MAX_PROP_H = 300;
  const MIN_PROP_H = 64;
  /**
   * Min native px (short side) before a cutout may sit on a roleplay dock.
   * Hero-sheet splices under this look like mush when ClassIn scales them up —
   * drop them from docks and re-import larger, do not upscale postage stamps.
   */
  const MIN_DOCK_SRC = 120;

  /** Manifest omits styleFamily for the matte house style; name it so callers can compare. */
  const HOUSE_FAMILY = 'matte';
  /**
   * Flat object shelves share matte boards. They are provenance tags on the
   * manifest row (kenney-flat / game-icons), not a third exclusive family like
   * glossy-adventure — otherwise every gicon-* / kenney-* alias is dead on
   * classroom lessons.
   */
  const SHELF_AS_HOUSE = { 'kenney-flat': 1, 'game-icons': 1 };

  // Teaching chrome is shared across lessons: a cover flap and a sorting bin are
  // not scenery. Resolving them from the matte house pool means a glossy
  // adventure lesson does not fall back to plain rectangles just because the
  // glossy pack has no bins. styleFamily still governs scene dressing / vocab.
  const CHROME_ROLES = {
    cover: 1,
    sortBin: 1,
    orderPad: 1,
    rewardFlap: 1,
    reward: 1,
  };

  let bank = null;
  let policy = null;
  let pending = null;
  let warned = false;

  const EMPTY_POLICY = {
    version: 2,
    deny: [],
    subjectLock: {},
    never: {},
    ambiguous: {},
    aliases: {},
  };

  function normalizePolicy(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const deny = Array.isArray(p.deny)
      ? p.deny.map((d) => slug(d)).filter(Boolean)
      : [];
    return {
      version: p.version == null ? 2 : p.version,
      deny: [...new Set(deny)],
      subjectLock: p.subjectLock && typeof p.subjectLock === 'object' ? p.subjectLock : {},
      never: p.never && typeof p.never === 'object' ? p.never : {},
      ambiguous: p.ambiguous && typeof p.ambiguous === 'object' ? p.ambiguous : {},
      aliases: p.aliases && typeof p.aliases === 'object' ? p.aliases : {},
    };
  }

  function isDeniedWord(word) {
    if (!policy || !policy.deny || !policy.deny.length) return false;
    const key = slug(word);
    if (!key) return false;
    if (policy.deny.indexOf(key) >= 0) return true;
    // Token deny only for single-token queries. Multi-word phrases must not die
    // because an abstract token is embedded ("power bank" ≠ denied "power").
    const tokens = norm(word);
    if (tokens.length !== 1) return false;
    return policy.deny.indexOf(tokens[0]) >= 0;
  }

  /** Topic/seed tokens used by subjectLock topic-gates. */
  function topicTokens(seed, tags) {
    const out = new Set(norm(seed));
    for (const t of tags || []) {
      for (const n of norm(t)) out.add(n);
    }
    return out;
  }

  /**
   * Phase-2 subjectLock shapes:
   *   string  → prop.subject must equal it (missing subject fails)
   *   object  → { topics: [...], allow?: [propKeys] } topic-gate on lesson seed
   */
  function subjectLockEntry(word) {
    if (!policy || !policy.subjectLock) return null;
    const key = slug(word);
    if (!key) return null;
    const want = policy.subjectLock[key];
    return want == null ? null : want;
  }

  function subjectTopicGate(word, seed, tags) {
    const want = subjectLockEntry(word);
    if (!want || typeof want !== 'object' || Array.isArray(want)) return { ok: true };
    const need = Array.isArray(want.topics)
      ? want.topics.map(slug).filter(Boolean)
      : Array.isArray(want.requireTopic)
        ? want.requireTopic.map(slug).filter(Boolean)
        : [];
    if (!need.length) return { ok: true };
    const have = topicTokens(seed, tags);
    const matched = need.some(
      (t) => have.has(t) || [...have].some((h) => h.includes(t) || t.includes(h))
    );
    if (!matched) return { ok: false, reason: 'subject-lock' };
    return { ok: true };
  }

  /**
   * Homonyms / fuzzy place-words → null without an explicit sense.
   * true | non-empty array | non-empty object all count as ambiguous.
   */
  function isAmbiguousWord(word) {
    if (!policy || !policy.ambiguous) return false;
    const key = slug(word);
    if (!key) return false;
    const entry = policy.ambiguous[key];
    if (entry == null) return false;
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === 'object') return Object.keys(entry).length > 0;
    return !!entry;
  }

  /** Policy aliases overlay code PROP_ALIASES (policy wins on collision). */
  function aliasFor(token) {
    const key = slug(token);
    if (!key) return null;
    if (policy && policy.aliases && policy.aliases[key]) {
      return slug(policy.aliases[key]);
    }
    return PROP_ALIASES[key] || null;
  }

  /**
   * Drop props whose key / identity / words intersect policy.never[word].
   * Entries may be prop keys or identity tokens.
   */
  function isNeverProp(word, prop) {
    if (!policy || !policy.never || !prop) return false;
    const key = slug(word);
    const list = policy.never[key];
    if (!Array.isArray(list) || !list.length) return false;
    for (let i = 0; i < list.length; i++) {
      const bad = slug(list[i]);
      if (!bad) continue;
      if (prop.key === bad || prop.key.endsWith('-' + bad)) return true;
      if (prop.words && prop.words.includes(bad)) return true;
      if (prop.identity && prop.identity.includes(bad)) return true;
    }
    return false;
  }

  function failsSubjectLock(word, prop) {
    if (!prop) return false;
    const want = subjectLockEntry(word);
    if (want == null) return false;
    // Object form: allow-list only (topic gate runs earlier in resolve).
    if (typeof want === 'object' && !Array.isArray(want)) {
      const allow = Array.isArray(want.allow) ? want.allow.map(slug).filter(Boolean) : [];
      if (!allow.length) return false;
      const allowSet = new Set(allow);
      return !allowSet.has(prop.key) && !allowSet.has(baseOfProp(prop));
    }
    // String form: prop.subject must match (missing subject fails).
    const have = prop.subject ? String(prop.subject).toLowerCase() : '';
    return have !== String(want).toLowerCase();
  }

  function passesPolicyFilters(word, prop) {
    if (!prop) return false;
    if (isNeverProp(word, prop)) return false;
    if (failsSubjectLock(word, prop)) return false;
    return true;
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  }

  /** Manifest keys are slugs, so queries normalize to slug shape before lookup. */
  function slug(s) {
    return norm(s).join('-');
  }

  /**
   * Meaning-level word → prop key. The analogue of PACK_ALIASES: small,
   * hand-written, and never a fuzzy guess. One line is all a new word costs.
   */
  const PROP_ALIASES = {
    luggage: 'suitcase',
    bag: 'backpack',
    rucksack: 'backpack',
    clock: 'wall-clock',
    bin: 'sorting-bin',
    jar: 'reward-jar',
    star: 'reward-star',
    folder: 'file-folder',
    // bag-tote is the real tote; supply-caddy was a stand-in
    tote: 'bag-tote',
    mat: 'desk-mat',
    tray: 'activity-tray',
    whiteboard: 'mini-whiteboard',
    mic: 'microphone',
    card: 'flashcard-blank',
    dentist: 'dentist-character',
    // patient → dental-kid only under subjectLock topic gate (dentist lessons).
    patient: 'dental-kid-open-mouth',
    floss: 'floss-pick',
    cavity: 'cavity-tooth',
    toothbrush: 'toothbrush-prop',
    toothpaste: 'toothpaste-tube',
    face: 'face-blank',
    head: 'face-blank',
    eyes: 'face-eyes-brown',
    eye: 'face-eyes-brown',
    nose: 'face-nose-button',
    mouth: 'face-mouth-smile',
    smile: 'face-mouth-smile',
    hair: 'hair-messy-brown',
    glasses: 'face-glasses-round',
    // Feelings compass — emotion stickers (pack="feelings")
    // Do NOT alias cold/hot/sick/love — those collide with weather/health/theme props.
    worried: 'feeling-worried',
    scared: 'feeling-scared',
    confused: 'feeling-confused',
    shy: 'feeling-shy',
    surprised: 'feeling-surprised',
    happy: 'feeling-happy',
    sad: 'feeling-sad',
    angry: 'feeling-angry',
    bored: 'feeling-bored',
    sleepy: 'feeling-sleepy',
    proud: 'feeling-proud',
    silly: 'feeling-silly',
    // Castle build kit (matte pack) — New Words + docks resolve by lesson vocab
    castle: 'castle-wall-gate',
    gate: 'castle-portcullis',
    portcullis: 'castle-portcullis',
    king: 'castle-knight-blue',
    knight: 'castle-knight-blue',
    dragon: 'castle-dragon',
    door: 'castle-door-wood-double',
    flag: 'castle-flag-red',
    bridge: 'castle-bridge-stone',
    crown: 'castle-banner-purple-crown',
    tower: 'castle-tower-mid-a',
    banner: 'castle-banner-blue-fleur',
    // Weather adjectives → climate props (weather-sun etc. already exist;
    // cloudy already hits weather-partly-cloudy via pack-suffix identity)
    sunny: 'weather-sun',
    rainy: 'weather-rain',
    windy: 'weather-wind',
    snowy: 'weather-snow',
    // Clothes — slug "t-shirt" ≠ prop suffix "-tshirt"; keep distinct from pack shirt.png
    't-shirt': 'clothes-tshirt',
    tshirt: 'clothes-tshirt',
    'tee-shirt': 'clothes-tshirt',
    // Birthday party — piñata ñ folds badly (PropBank → pi-ata, VocabArt → piata);
    // party-pinata exists; ASCII pinata already hits via -pinata suffix.
    'pi-ata': 'party-pinata',
    piata: 'party-pinata',
    pinata: 'party-pinata',
    // Pets — aquarium kit tank is the object (keys are aquarium-* parts, not -aquarium)
    aquarium: 'aquarium-tank',
    // Shift20-C — shared-object mining. Alias only when: (1) bare word is NULL, or
    // (2) identity-score picks a clear false friend. Do NOT pin hose/helmet/ladder/map/
    // axe/scissors — topic theme-rank already picks the right prefix pack.
    hammer: 'tool-hammer', // else hospital-reflex-hammer
    wrench: 'tool-wrench',
    screwdriver: 'tool-screwdriver',
    pliers: 'tool-pliers',
    brush: 'tool-paintbrush', // else arch-brush
    'paint-brush': 'art-paintbrush',
    bottle: 'drink-water-bottle', // else medicine-bottle
    tire: 'auto-tire', // else farm-tractor-tire
    button: 'sew-button', // else face-nose-button
    // band-aid otherwise identity-hits gym-resistance-band via token "band"
    bandaid: 'aid-bandaid-box',
    'band-aid': 'aid-bandaid-box',
    medicine: 'medicine-bottle',
    seed: 'garden-seed-packet',
    package: 'postal-parcel-box',
    fabric: 'sew-fabric-bolt',
    smoke: 'fire-smoke-detector',
    // Bare "alarm" has no exact key; fire-alarm-bell is the unique station bell.
    alarm: 'fire-alarm-bell',
    hardhat: 'construction-hard-hat',
    conditioner: 'salon-conditioner-bottle',
    polaroid: 'photo-polaroid-camera',
    film: 'photo-film-roll',
    darkroom: 'photo-darkroom-tray',
    letter: 'post-sealed-envelope',
    'postage-stamp': 'post-stamp',
    'messenger-bag': 'bag-messenger', // else beach-bag via token "bag"
    jumpstart: 'auto-jumper-cables',
    'jump-start': 'auto-jumper-cables',
    trail: 'hike-trail-sign',
    'camp-stove': 'hike-camping-stove',
    // hiking (activity) → boot stand-in; do NOT alias camp→tent (both can co-appear).
    // canoe: no canoe prop — leave gap (boat/rescue-boat would be false friends).
    hiking: 'hike-hiking-boot',
    flashlight: 'camp-flashlight',
    binoculars: 'camp-binoculars',
    photography: 'photo-film-camera',
    draw: 'art-sketchbook',
    keys: 'routine-keys',
    keychain: 'acc-keychain',
    eyeglasses: 'optic-eyeglasses',
    necklace: 'acc-pearl-necklace',
    ring: 'acc-ring', // else target-ring
    thread: 'sew-thread-spool',
    yarn: 'sew-yarn-ball',
    thimble: 'sew-thimble',
    bobbin: 'sew-bobbin',
    loupe: 'clk-loupe',
    carabiner: 'hike-carabiner',
    multitool: 'hike-multi-tool',
    'multi-tool': 'hike-multi-tool',
    seedling: 'garden-seedling',
    hatchet: 'fire-axe',
    toolbox: 'construction-toolbox',
    // Shift30-B — honest gicon pins for unique mid-obscure tools (empty > wrong).
    // styleFamily game-icons coerces to matte via SHELF_AS_HOUSE so these resolve.
    sextant: 'gicon-sextant',
    trilobite: 'gicon-trilobite',
    'swiss-army-knife': 'gicon-swiss-army-knife', // else camp-pocket-knife via "knife"
    'box-cutter': 'gicon-box-cutter', // else gift-box via "box"
    boxcutter: 'gicon-box-cutter',
    crowbar: 'gicon-crowbar',
    clamp: 'gicon-clamp', // sole -clamp suffix in bank
    gears: 'gicon-gears',
    cog: 'gicon-cog',
    brick: 'gicon-clay-brick', // sole -brick suffix
    'broken-pottery': 'gicon-broken-pottery',
    'sewing-needle': 'gicon-sewing-needle', // else sew-needle
    pottery: 'gicon-pottery', // NULL bare; not broken-pottery amphora
    // Shift30-A — unique kenney remaster / board-icon shelves (empty > wrong).
    narwhal: 'kenney-narwhal',
    sloth: 'kenney-sloth',
    walrus: 'kenney-walrus',
    buffalo: 'kenney-buffalo',
    moose: 'kenney-moose',
    gorilla: 'kenney-gorilla',
    chick: 'kenney-chick',
    pouch: 'kenney-bg-pouch',
    award: 'kenney-bg-award',
    notepad: 'kenney-bg-notepad',
    dice: 'kenney-bg-dice',
    d6: 'kenney-bg-d6',
    d20: 'kenney-bg-d20',
    bishop: 'kenney-bg-chess-bishop',
    rook: 'kenney-bg-chess-rook',
    wheat: 'kenney-bg-resource-wheat',
    lumber: 'kenney-bg-resource-lumber',
    planks: 'kenney-bg-resource-planks',
    watchtower: 'kenney-bg-structure-watchtower',
    spinner: 'kenney-bg-spinner',
    domino: 'kenney-domino-6-6',
    lock: 'kenney-bg-lock-closed',
    dollar: 'kenney-bg-dollar', // else aquarium-sand-dollar
  };

  /**
   * Which family a lesson draws from. The two families in the bank must never
   * share a board — a matte desaturated chair next to a lacquered gold-trimmed
   * chest reads as unfinished art, not as a different object — so the choice
   * belongs at lesson level, where it cannot change halfway through.
   *
   * Classroom and teaching content is the house style. Glossy is *permitted*
   * for travel / adventure / story lessons, not mandated, so a matte hint wins.
   */
  const MATTE_HINTS = [
    'classroom', 'school', 'lesson', 'teacher', 'student', 'homework', 'study',
    'office', 'desk', 'library', 'phonics', 'grammar', 'spelling',
    'clinic', 'doctor', 'nurse', 'hospital', 'medical', 'dentist', 'health',
    'home', 'house', 'apartment', 'kitchen', 'bedroom', 'cafeteria', 'canteen',
    'shopping', 'weather', 'family', 'gym',
  ];
  // Glossy is only the small lacquered adventure set (wizard-hat, lantern…).
  // Do NOT put castle/dragon/space/tree/camp here — those kits are matte house art;
  // a camping lesson that picks glossy filters every camp-* / hike-* prop out of play.
  const GLOSSY_HINTS = [
    'adventure', 'quest', 'pirate', 'treasure', 'magic', 'wizard',
    'explorer', 'explore', 'jungle',
    'island', 'safari', 'journey', 'voyage',
    'travel', 'trip', 'holiday', 'vacation', 'airport', 'flight', 'flying',
    'tourist', 'suitcase',
  ];
  const MATTE_THEME_HINTS = [
    'castle', 'knight', 'dragon', 'medieval', 'moat',
    'aquarium', 'fish', 'ocean', 'coral',
    'space', 'rocket', 'astronaut', 'alien', 'station',
    'tree', 'forest', 'nature', 'season',
    // Camp / hike packs are matte; win over glossy travel/trip title words.
    'camping', 'camp', 'campsite', 'hiking', 'hike',
    'dollhouse', 'gashapon',
  ];

  /**
   * What the recipes ask the bank for, in one table, so the recipes and
   * scripts/prop-demand.mjs cannot drift apart about what art is missing.
   *
   *   slot      the piece role the recipe emits
   *   role      the prop role queried (roles: any of several is acceptable)
   *   count     how many props that slot needs
   *   distinct  true when the props must differ — orderLine wants five identical
   *             pads, so one prop satisfies it; sortBins wants two different
   *             bins, so one does not
   *   themed    true when the lesson's own words are part of the query, so a
   *             miss is a THEME gap ("no clinic prop") rather than a role gap
   *   fit       'contain' the art is letterboxed inside a rect the recipe owns
   *             'fill'    the art must cover the rect — it hides something
   *   wired     true when a recipe resolves this through PropBank today
   */
  const PROP_REQUESTS = {
    sortBins: [
      { slot: 'sortBin', role: 'sortBin', count: 2, distinct: true, themed: false, fit: 'contain', wired: true },
    ],
    coverAnswer: [
      { slot: 'answerCover', role: 'cover', count: 1, distinct: false, themed: false, fit: 'fill', wired: true },
    ],
    hideSeek: [
      { slot: 'cover', role: 'cover', count: 4, distinct: true, themed: false, fit: 'fill', wired: false },
    ],
    revealReward: [
      { slot: 'reward', role: 'reward', count: 1, distinct: false, themed: false, fit: 'contain', wired: false },
      { slot: 'rewardFlap', role: 'rewardFlap', count: 1, distinct: false, themed: false, fit: 'fill', wired: false },
    ],
    orderLine: [
      { slot: 'orderPad', role: 'orderPad', count: 5, distinct: false, themed: false, fit: 'contain', wired: false },
    ],
    buildScene: [
      { slot: 'buildSlot', role: 'orderPad', count: 4, distinct: false, themed: false, fit: 'contain', wired: false },
    ],
    sceneDressing: [
      {
        slot: 'sceneDressing',
        roles: ['furniture', 'shelf', 'container', 'object', 'playPart', 'tool'],
        count: 2,
        distinct: true,
        themed: true,
        fit: 'contain',
        wired: true,
      },
    ],
    heroProp: [
      {
        slot: 'hero',
        roles: ['hero', 'playPart'],
        count: 1,
        distinct: true,
        themed: true,
        fit: 'contain',
        wired: true,
      },
      {
        slot: 'roleplayTool',
        roles: ['object', 'tool'],
        count: 8,
        distinct: true,
        themed: true,
        fit: 'contain',
        wired: true,
      },
    ],
    phonicsSoundBoxes: [
      {
        slot: 'soundBox',
        role: 'soundBoxes',
        count: 5,
        distinct: false,
        themed: false,
        fit: 'contain',
        wired: true,
      },
    ],
  };

  /**
   * Two hard filters, applied before any matching can see a prop.
   *
   * alpha !== true drops the six props whose black field could not be keyed —
   * they would render as black squares. Re-keying one later is a pure manifest
   * edit that puts it straight into play.
   */
  function index(raw) {
    const out = { byKey: {}, all: [], skipped: [] };
    const props = (raw && raw.props) || {};
    for (const key of Object.keys(props).sort()) {
      const row = props[key];
      if (!row || !row.file) continue;
      if (row.alpha !== true) {
        out.skipped.push(key);
        continue;
      }
      const prop = {
        key,
        file: row.file,
        path: `${BASE}/img/${row.file}`,
        role: row.role || null,
        tags: [...new Set((row.tags || []).flatMap(norm))],
        // Identity tokens from the key slug only — never associative tags.
        words: norm(key),
        // Optional future field; absent on most rows. Tags must not fill this.
        identity: [...new Set((row.identity || []).flatMap(norm))],
        // person | object | place | scene | symbol — required for subjectLock.
        subject: row.subject ? String(row.subject).toLowerCase() : null,
        aspect: row.aspect || 1,
        relativeScale: row.relativeScale == null ? 0.5 : row.relativeScale,
        anchor: row.anchor || 'bottom',
        // King stage fill: 'fit' (default) keeps silhouette on-board; 'flush'
        // overscales cropped close-ups to the page edge. Opt-in only.
        stageFit: row.stageFit === 'flush' ? 'flush' : (row.stageFit === 'fit' ? 'fit' : null),
        family: SHELF_AS_HOUSE[row.styleFamily]
          ? HOUSE_FAMILY
          : row.styleFamily || HOUSE_FAMILY,
        bodyHue: row.bodyHue == null ? null : row.bodyHue,
        // Theme kit id (castle, jobs, animals…). Absent = loose bank piece.
        pack: row.pack ? String(row.pack).toLowerCase() : null,
        // Decorative/character filler (distinct art style, broad tags). Generic
        // dock/story selectors skip these unless the lesson topic invites the pack.
        // Source of truth = manifest row; see decorativeHints on the manifest root.
        decorative: row.decorative === true,
        srcW: row.srcW == null ? null : Number(row.srcW),
        srcH: row.srcH == null ? null : Number(row.srcH),
        // Variant convention: a manifest row may declare itself a duplicate of
        // another word's art with variantOf:"<baseKey>", or simply be named
        // <baseKey>-v2 / -v3. Both are collapsed to the same base by baseKeyOf
        // so the picker can rotate them for variety (see resolve/byWord).
        variantOf: row.variantOf ? slug(row.variantOf) : null,
      };
      out.byKey[key] = prop;
      out.all.push(prop);
    }
    // Pack → topic tokens that invite a decorative pack onto a matching lesson.
    out.decorativeHints = {};
    const hints = (raw && raw.decorativeHints) || {};
    for (const pack of Object.keys(hints)) {
      const list = Array.isArray(hints[pack]) ? hints[pack] : [];
      out.decorativeHints[String(pack).toLowerCase()] = list.map((h) => String(h).toLowerCase()).filter(Boolean);
    }
    return out;
  }

  function loadPolicy() {
    return fetch(POLICY_URL)
      .then((r) => {
        if (!r.ok) return EMPTY_POLICY;
        return r.json();
      })
      .then((raw) => normalizePolicy(raw))
      .catch(() => normalizePolicy(EMPTY_POLICY));
  }

  /** Load the manifest + policy once. Await before building a board plan. */
  function ready() {
    if (bank) return Promise.resolve(bank);
    if (!pending) {
      pending = Promise.all([
        fetch(`${BASE}/manifest.json`).then((r) => {
          if (!r.ok) throw new Error(`prop manifest not found at ${BASE}/manifest.json`);
          return r.json();
        }),
        loadPolicy(),
      ])
        .then(([raw, pol]) => {
          policy = pol;
          bank = index(raw);
          return bank;
        })
        .catch((err) => {
          pending = null;
          console.warn(err);
          if (!policy) policy = normalizePolicy(EMPTY_POLICY);
          bank = index(null);
          return bank;
        });
    }
    return pending;
  }

  function loaded() {
    return !!bank;
  }

  /** The request a recipe is allowed to make, by recipe id and optional slot. */
  function requestFor(recipe, slot) {
    const rows = PROP_REQUESTS[recipe] || [];
    if (!slot) return rows[0] || null;
    return rows.find((r) => r.slot === slot) || null;
  }

  function all() {
    return bank ? bank.all.slice() : [];
  }

  /** Manifest rows the alpha filter dropped — re-keying one puts it straight in play. */
  function skipped() {
    return bank ? bank.skipped.slice() : [];
  }

  function familyFor(lesson) {
    const words = new Set([
      ...norm(lesson && lesson.title),
      ...((lesson && lesson.vocabulary) || []).flatMap((v) => norm(typeof v === 'string' ? v : v && v.word)),
      ...norm(lesson && lesson.activity && lesson.activity.title),
    ]);
    // Theme kits we banked as matte win over glossy travel/adventure hints
    // (e.g. "dragon" alone must not exile the castle pack).
    for (const hint of MATTE_THEME_HINTS) if (words.has(hint)) return HOUSE_FAMILY;
    for (const hint of MATTE_HINTS) if (words.has(hint)) return HOUSE_FAMILY;
    for (const hint of GLOSSY_HINTS) if (words.has(hint)) return 'glossy-adventure';
    return HOUSE_FAMILY;
  }

  /**
   * Deterministic variety inside an already-narrowed band (variants of one
   * base, or a role bucket for pickDecor). Seed + index pick the slot —
   * callers must not pass a mixed equal-score object list (ball↛yarn-ball).
   */
  function rotatePick(band, seed, index_) {
    if (!band.length) return null;
    const rotate = (window.SceneBackgrounds && window.SceneBackgrounds.rotate) || (() => 0);
    const start = rotate(seed || '', band.length);
    return band[(start + (index_ || 0)) % band.length];
  }

  /** True when this row is a duplicate-kept variant, not a base prop. */
  const VARIANT_SUFFIX = /^(.+)-v\d+$/;
  function isVariantProp(prop) {
    return !!(prop && (prop.variantOf || VARIANT_SUFFIX.test(prop.key)));
  }

  /** Base identity of a prop: explicit variantOf, else <key> minus a -vN tail. */
  function baseOfProp(prop) {
    if (!prop) return null;
    if (prop.variantOf) return prop.variantOf;
    const m = VARIANT_SUFFIX.exec(prop.key);
    return m ? m[1] : prop.key;
  }

  /** Base identity from a bare key string (used to collapse the exclude set). */
  function baseKeyOf(key) {
    const known = bank && bank.byKey[key];
    if (known) return baseOfProp(known);
    const m = VARIANT_SUFFIX.exec(key);
    return m ? m[1] : key;
  }

  /**
   * All props in `pool` that share `hit`'s base — the variant set the picker
   * may rotate through. Sorted by key so base (<key>) precedes <key>-v2 and the
   * order never depends on manifest order. Returns [hit] when there is no set.
   */
  function variantBand(pool, hit) {
    const base = baseOfProp(hit);
    const band = pool.filter((p) => baseOfProp(p) === base);
    band.sort((a, b) => a.key.localeCompare(b.key));
    return band.length ? band : [hit];
  }

  function byWord(pool, q) {
    const rawWord = q && q.word;
    const key = slug(rawWord);
    if (!key) return null;
    const seed = (q && q.seed) || '';
    const find = (k) => pool.find((p) => p.key === k) || null;

    // A hit rotates across its variant set for cross-lesson variety, EXCEPT
    // when the caller pinned an exact variant key (word === that key) — an
    // explicit variant reference must resolve to exactly that prop.
    const pick = (hit) => {
      if (!hit) return null;
      if (hit.key === key && isVariantProp(hit)) return hit;
      const band = variantBand(pool, hit);
      if (band.length <= 1) return hit;
      // Seed on lesson seed + word so the same word is stable within a lesson
      // (and thus within a page) while different lessons/words diverge.
      return rotatePick(band, (seed ? seed + '|' : '') + key, 0);
    };

    let hit = find(key);
    if (hit) return pick(hit);

    const alias = aliasFor(key);
    if (alias) {
      hit = find(alias);
      if (hit) return pick(hit);
    }

    // Theme-rank a multi-match identity band; no theme signal → null.
    const pickThemedBand = (band) => {
      if (!band.length) return null;
      if (band.length === 1) return pick(band[0]);
      const theme = topicTokens(seed, q && q.tags);
      const themeScore = (p) => {
        let s = 0;
        for (const t of norm(String(p.key || '').replace(/-/g, ' '))) {
          if (theme.has(t)) s += 3;
        }
        for (const t of p.tags || []) {
          if (theme.has(t)) s += 1;
        }
        if (p.pack && theme.has(slug(p.pack))) s += 2;
        return s;
      };
      band.sort(
        (a, b) =>
          themeScore(b) - themeScore(a) ||
          a.key.length - b.key.length ||
          a.key.localeCompare(b.key)
      );
      if (themeScore(band[0]) === 0) return null;
      return pick(band[0]);
    };

    // Head-noun / pack-suffix only — never a non-head compound token
    // (grandfather-clock must not answer "grandfather").
    const identityPrefixed = (token) =>
      pool.filter((p) => !isNeverProp(rawWord, p) && identityHit(p, token));

    // Pack-prefixed keys / identity[]: teacher → job-teacher, etc.
    // Merge plural stem / singular plural into one band BEFORE early-returning a
    // sole suffix hit — otherwise gloves→laundry-rubber-gloves wins alone and
    // never reaches aid-medical-glove (stem "glove").
    const stem =
      key.length > 3 && key.endsWith('s') && !key.endsWith('ss') ? key.slice(0, -1) : null;
    const plural = key.length > 2 && !key.endsWith('s') ? key + 's' : null;
    const tokens = [key, stem, plural].filter(Boolean);
    const merged = [];
    const seen = new Set();
    for (const t of tokens) {
      if (t !== key) {
        const exact = find(t);
        if (exact && !isNeverProp(rawWord, exact) && !seen.has(exact.key)) {
          seen.add(exact.key);
          merged.push(exact);
        }
      }
      for (const p of identityPrefixed(t)) {
        if (seen.has(p.key)) continue;
        seen.add(p.key);
        merged.push(p);
      }
    }
    if (merged.length === 1) {
      const only = merged[0];
      // Sole hit via singular→plural suffix only (sand → *-sands landmark) is a
      // false friend — require theme overlap, same as a multi-match band.
      const matchesBareOrStem =
        identityHit(only, key) || (stem && identityHit(only, stem));
      if (!matchesBareOrStem) return pickThemedBand(merged);
      return pick(only);
    }
    if (merged.length > 1) {
      const tight = merged.filter((p) =>
        tokens.some((t) => p.key === t || p.key.endsWith('-' + t))
      );
      const band = tight.length ? tight : merged;
      return pickThemedBand(band);
    }
    return null;
  }

  function resolveLogEnabled() {
    try {
      if (typeof window !== 'undefined' && window.__PROP_RESOLVE_LOG__) return true;
    } catch (_) { /* ignore */ }
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('PROP_RESOLVE_LOG') === '1') {
        return true;
      }
    } catch (_) { /* ignore */ }
    try {
      if (typeof process !== 'undefined' && process.env && process.env.PROP_RESOLVE_LOG) {
        return true;
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  function logResolution(row) {
    if (!resolveLogEnabled()) return;
    const line = JSON.stringify(Object.assign({ t: Date.now() }, row));
    try {
      if (typeof window !== 'undefined') {
        if (!window.__PROP_RESOLVE_LOG_LINES__) window.__PROP_RESOLVE_LOG_LINES__ = [];
        window.__PROP_RESOLVE_LOG_LINES__.push(line);
      }
    } catch (_) { /* ignore */ }
    if (typeof console !== 'undefined' && console.info) console.info('[PropBank.resolve]', line);
  }

  /**
   * True when token is an identity hit on prop (never tags).
   * Compound keys only match on the head / pack-suffix (endsWith -token) or an
   * explicit identity[] entry — not on modifier tokens in words-from-key.
   */
  function identityHit(prop, token) {
    if (!prop || !token) return false;
    if (prop.key === token || prop.key.endsWith('-' + token)) return true;
    if (prop.identity && prop.identity.includes(token)) return true;
    const alias = aliasFor(token);
    if (alias && (prop.key === alias || prop.key.endsWith('-' + alias))) return true;
    return false;
  }

  /**
   * Identity-only candidate pool. Tags never add a prop here.
   * Tokens come from the word (and its slug), not from query tags.
   */
  function identityPool(pool, word) {
    const tokens = new Set();
    const key = slug(word);
    if (key) tokens.add(key);
    for (const t of norm(word)) tokens.add(t);
    if (key.length > 3 && key.endsWith('s') && !key.endsWith('ss')) {
      tokens.add(key.slice(0, -1));
    }
    if (!tokens.size) return [];
    return pool.filter((p) => {
      for (const t of tokens) {
        if (identityHit(p, t)) return true;
      }
      return false;
    });
  }

  /**
   * Resolve one prop for a WORD (or null). Empty beats wrong.
   *
   *   { role, word, tags, seed, index, exclude, minScore, family }
   *
   * Ladder: deny → exact key / PROP_ALIASES / pack-suffix (byWord) → score only
   * inside an identity pool (tags rank, capped) → null.
   *
   * Role-bucket fallback is gone from resolve. Chrome / slot-fill without a
   * word: use pickDecor(role) / pickByRole.
   *
   * Tag-only queries (no word) intentionally return null — prefer empty scene
   * dressing over a metonymy prop. Do not route vocab through a tag qualifier.
   */
  function resolve(query) {
    const q = query || {};
    if (!bank) {
      if (!warned) {
        warned = true;
        console.warn('PropBank.resolve called before ready() — no props will be used');
      }
      return null;
    }

    const word = q.word;
    if (word && isDeniedWord(word)) {
      logResolution({
        word: String(word),
        picked: null,
        score: 0,
        reason: 'deny',
        topic: q.seed || null,
      });
      return null;
    }
    // Topic-gated subjectLock (object form) — empty outside the allowed lesson.
    if (word) {
      const topicGate = subjectTopicGate(word, q.seed, q.tags);
      if (!topicGate.ok) {
        logResolution({
          word: String(word),
          picked: null,
          score: 0,
          reason: topicGate.reason || 'subject-lock',
          topic: q.seed || null,
        });
        return null;
      }
    }
    // Homonym / fuzzy place-word with no sense → empty (clinic↛clipboard).
    if (word && isAmbiguousWord(word) && !q.sense) {
      logResolution({
        word: String(word),
        picked: null,
        score: 0,
        reason: 'ambiguous',
        topic: q.seed || null,
      });
      return null;
    }

    const wantRole = q.role || null;
    const chrome = !!(wantRole && CHROME_ROLES[wantRole]);
    const family = chrome ? HOUSE_FAMILY : (q.family || HOUSE_FAMILY);
    const exclude = new Set(q.exclude || []);
    // Same-page guard: a caller building a distinct set (dock, bins, dressing)
    // pushes each picked key into `exclude`. Collapsing those to their base and
    // dropping every sibling means a second variant of an already-placed word
    // can never land on the same page — while single-prop words are unaffected
    // (baseKeyOf(k) === k when there is no variant set).
    const excludeBases = new Set();
    exclude.forEach((k) => excludeBases.add(baseKeyOf(k)));
    const pool = bank.all.filter(
      (p) =>
        p.family === family &&
        !exclude.has(p.key) &&
        !excludeBases.has(baseOfProp(p))
    );
    if (!pool.length) {
      logResolution({
        word: word ? String(word) : null,
        picked: null,
        score: 0,
        reason: 'empty-pool',
        topic: q.seed || null,
      });
      return null;
    }

    const named = byWord(pool, q);
    if (named && passesPolicyFilters(word, named)) {
      logResolution({
        word: word ? String(word) : null,
        picked: named.key,
        score: null,
        reason: 'byWord',
        topic: q.seed || null,
      });
      return named;
    }
    const blockedNamed = named && !passesPolicyFilters(word, named) ? named : null;

    // No word → no identity tokens. Tags alone cannot qualify (empty > wrong).
    if (!slug(word)) {
      logResolution({
        word: null,
        tags: q.tags || [],
        picked: null,
        score: 0,
        reason: blockedNamed ? 'policy-block' : 'no-identity',
        runnerUp: blockedNamed ? { key: blockedNamed.key, score: 0 } : null,
        topic: q.seed || null,
      });
      return null;
    }

    const candidates = identityPool(pool, word).filter((p) => passesPolicyFilters(word, p));
    if (!candidates.length) {
      logResolution({
        word: String(word),
        picked: null,
        score: 0,
        reason: blockedNamed ? 'policy-block' : 'no-identity',
        runnerUp: blockedNamed ? { key: blockedNamed.key, score: 0 } : null,
        topic: q.seed || null,
      });
      return null;
    }

    const tagTokens = [...new Set((q.tags || []).flatMap(norm))];
    const wordTokens = new Set([...norm(word), slug(word)].filter(Boolean));
    const scored = [];
    for (const p of candidates) {
      let score = 0;
      // Identity strength inside the already-filtered pool.
      for (const t of wordTokens) {
        if (p.key === t) score += 6;
        else if (p.key.endsWith('-' + t)) score += 5;
        else if (p.identity && p.identity.includes(t)) score += 4;
      }
      // Tags rank only — each +1, capped at +2 total.
      let tagBonus = 0;
      for (const t of tagTokens) {
        if (p.tags.includes(t)) tagBonus += TAG_RANK_EACH;
      }
      if (tagBonus > TAG_RANK_CAP) tagBonus = TAG_RANK_CAP;
      score += tagBonus;
      if (q.role && p.role === q.role) score += 2;
      else if (q.roles && q.roles.length && q.roles.indexOf(p.role) >= 0) score += 1;
      if (score > 0) scored.push({ p, score });
    }
    if (!scored.length) {
      logResolution({
        word: String(word),
        picked: null,
        score: 0,
        reason: 'no-score',
        topic: q.seed || null,
      });
      return null;
    }
    scored.sort((a, b) =>
      b.score - a.score ||
      a.p.tags.length - b.p.tags.length ||
      a.p.key.localeCompare(b.p.key)
    );
    const top = scored[0].score;
    const floor = q.minScore == null ? DEFAULT_MIN_SCORE : q.minScore;
    if (top >= floor) {
      // Equal-score ≠ same object (ball / yarn-ball / cotton-ball can tie).
      // Sort already chose a stable winner; rotate only inside that prop's
      // variant set — never across different bases.
      const hit = scored[0].p;
      const band = variantBand(pool, hit);
      const pick = rotatePick(band, q.seed, q.index);
      logResolution({
        word: String(word),
        picked: pick ? pick.key : null,
        score: top,
        reason: 'identity-score',
        runnerUp: scored[1] ? { key: scored[1].p.key, score: scored[1].score } : null,
        topic: q.seed || null,
      });
      return pick;
    }
    logResolution({
      word: String(word),
      picked: null,
      score: top,
      reason: 'below-floor',
      runnerUp: { key: scored[0].p.key, score: top },
      topic: q.seed || null,
      floor,
    });
    return null;
  }

  /**
   * Role-only chrome / slot-filling. No word, no tags — rotate props with the
   * matching role (cover, sortBin, orderPad, …). Prefer this over resolve()
   * when the recipe needs a bin/flap regardless of lesson vocabulary.
   */
  function pickDecor(role, opts) {
    const o = opts || {};
    if (!bank || !role) return null;
    const chrome = !!CHROME_ROLES[role];
    const family = chrome ? HOUSE_FAMILY : (o.family || HOUSE_FAMILY);
    const exclude = new Set(o.exclude || []);
    const excludeBases = new Set();
    exclude.forEach((k) => excludeBases.add(baseKeyOf(k)));
    const bucket = bank.all.filter(
      (p) =>
        p.family === family &&
        p.role === role &&
        !exclude.has(p.key) &&
        !excludeBases.has(baseOfProp(p))
    );
    if (!bucket.length) return null;
    return rotatePick(bucket, o.seed, o.index);
  }

  /** Alias: pick by a single role, or the first matching role in `roles`. */
  function pickByRole(roleOrRoles, opts) {
    const o = opts || {};
    if (Array.isArray(roleOrRoles)) {
      for (let i = 0; i < roleOrRoles.length; i++) {
        const hit = pickDecor(roleOrRoles[i], o);
        if (hit) return hit;
      }
      return null;
    }
    return pickDecor(roleOrRoles, o);
  }

  /**
   * Size a prop from a HEIGHT budget. Width always derives from aspect, which
   * is what makes distortion structurally impossible instead of merely fixed.
   *
   * The MIN_PROP_H floor is a deliberate legibility-over-realism compromise:
   * true real-world scale makes a pencil unreadable on a board.
   */
  function sizeFor(prop, opts) {
    const o = opts || {};
    const aspect = (prop && prop.aspect) || 1;
    const maxH = o.maxH == null ? MAX_PROP_H : o.maxH;
    // King / stage heroes may exceed the house 300px cap when the caller
    // passes hardCap (activity heroStage). Everything else stays capped.
    const hardCap = o.hardCap == null ? MAX_PROP_H : o.hardCap;
    const scale = prop && prop.relativeScale != null ? prop.relativeScale : 0.5;
    let h = Math.min(hardCap, Math.max(MIN_PROP_H, Math.round(maxH * scale)));
    if (o.maxW && Math.round(h * aspect) > o.maxW) {
      // Prefer fitting maxW, but never collapse under the grab floor — M10
      // measures min(w,h). Overflowing a tight cell beats a postage stamp.
      h = Math.min(hardCap, Math.max(MIN_PROP_H, Math.floor(o.maxW / aspect)));
    }
    // Tall-thin cutouts: height floor alone can leave width under MIN_PROP_H.
    // Only grow when the caller's hardCap still allows a grabbable min side;
    // otherwise return undersized width and let dock placers drop the piece.
    if (aspect > 0 && Math.round(h * aspect) < MIN_PROP_H) {
      const needH = Math.ceil(MIN_PROP_H / aspect);
      if (needH <= hardCap) h = Math.max(h, needH);
    }
    // Derived from h last, always: |w/h − aspect| then stays inside the bake's
    // 0.02 assertion for any height the board uses.
    return { w: Math.round(h * aspect), h };
  }

  /** Where a prop's top edge goes. anchor 'bottom' is the one honest floor rule. */
  function yFor(prop, pick, h) {
    const anchor = (prop && prop.anchor) || 'bottom';
    if (anchor === 'top') return 24;
    if (anchor === 'center') return Math.round(BOARD_H * 0.42 - h / 2);
    if (window.SceneBackgrounds) return window.SceneBackgrounds.standOn(pick, h);
    return BOARD_H - h - 24;
  }

  /**
   * True when the prop, drawn at its own aspect, covers `rect` completely.
   *
   * A cover has to pass this before it may replace a painted band: the answer
   * cover on a speaking page sits over the sample answer, and a letterboxed
   * cover leaves the answer showing at both ends. Failing this is a request for
   * art of the right shape, not a licence to stretch.
   */
  function fillsRect(prop, rect, tol) {
    if (!prop || !rect || !rect.w || !rect.h) return false;
    const want = rect.w / rect.h;
    const have = prop.aspect || 1;
    return Math.min(want, have) / Math.max(want, have) >= 1 - (tol == null ? 0.02 : tol);
  }

  const KIT_STOP = new Set([
    'a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
    'living', 'near', 'next', 'my', 'our', 'your', 'how', 'what', 'when', 'where',
    'why', 'who', 'i', 'do', 'is', 'are', 'was', 'were', 'be', 'been', 'build',
    'make', 'our', 'royal', 'lesson', 'about', 'focus',
    // Activity pedagogy words — "Round 1/2" must not claim castle-*-round (S43).
    'round', 'partner', 'switch', 'guess', 'guesses', 'feels', 'say', 'then',
    'lab', 'drag', 'write', 'onto', 'blank', 'face', 'faces',
  ]);

  /** Theme tokens from title + vocab + activity — used by kit + readiness. */
  function themeTokens(lesson) {
    const words = [
      ...((lesson && lesson.vocabulary) || []).flatMap((v) => {
        const w = typeof v === 'string' ? v : v && v.word;
        return w ? norm(w) : [];
      }),
      ...norm(lesson && lesson.title),
      ...norm(lesson && lesson.activity && lesson.activity.title),
      ...norm(lesson && lesson.activity && lesson.activity.prompt),
    ];
    return [...new Set(words.filter((t) => t && !KIT_STOP.has(t) && t.length > 2))];
  }

  // Legacy fallback only — new packs must set decorative:true + decorativeHints
  // on the manifest. Kept so un-migrated rows still fail closed during rollout.
  const LEGACY_DECORATIVE_PACKS = new Set(['feelings', 'gashapon']);
  const LEGACY_DECORATIVE_HINTS = {
    feelings: ['feeling', 'feelings', 'emotion', 'emotions', 'mood', 'moods'],
    gashapon: ['gashapon', 'capsule', 'toy', 'toys', 'prize', 'prizes', 'vending'],
  };

  /** True when a prop is decorative/character filler (manifest.decorative, else legacy pack). */
  function isDecorativeProp(prop) {
    if (!prop) return false;
    if (prop.decorative === true) return true;
    return !!(prop.pack && LEGACY_DECORATIVE_PACKS.has(prop.pack));
  }

  /** Decorative packs whose topic THIS lesson matches (so they may be surfaced). */
  function decorativePacksFor(lesson) {
    const tokens = new Set(themeTokens(lesson));
    const out = new Set();
    const hints = (bank && bank.decorativeHints) || {};
    // Discover decorative packs from indexed props (manifest.decorative:true).
    const packs = new Set();
    if (bank && bank.all) {
      for (const p of bank.all) {
        if (p.decorative && p.pack) packs.add(p.pack);
      }
    }
    for (const pack of LEGACY_DECORATIVE_PACKS) packs.add(pack);
    for (const pack of packs) {
      const list = hints[pack] || LEGACY_DECORATIVE_HINTS[pack] || [pack];
      if (list.some((h) => tokens.has(h))) out.add(pack);
    }
    return out;
  }

  function isHeroSized(p) {
    return !!(p && (p.role === 'hero' || (p.relativeScale == null ? 0 : p.relativeScale) >= 0.75));
  }

  /**
   * True when the keyed PNG is sharp enough to enlarge onto a ClassIn dock.
   * Missing srcW/srcH (legacy row) fails closed — re-run
   * `node scripts/backfill-prop-src-size.mjs` after importing.
   */
  function isDockSharp(p) {
    if (!p) return false;
    const w = p.srcW;
    const h = p.srcH;
    if (!(w > 0) || !(h > 0)) return false;
    return Math.min(w, h) >= MIN_DOCK_SRC;
  }

  /**
   * Universal theme-kit judgment: does this lesson match a banked pack with a
   * stage hero + enough dock toys? Pack tags on props are the source of truth —
   * banking a new kit is enough; no per-theme STAGE_RULES required.
   *
   * Returns null when no kit clears the bar (face/dental still use curated
   * stage rules in EdbActivities as a special case).
   */
  function assessKit(lesson) {
    if (!bank) return null;
    const tokens = themeTokens(lesson);
    if (!tokens.length) return null;
    const family = familyFor(lesson);
    const pool = bank.all.filter((p) => p.family === family);
    const byPack = new Map();
    for (const p of pool) {
      if (!p.pack) continue;
      if (!byPack.has(p.pack)) byPack.set(p.pack, []);
      byPack.get(p.pack).push(p);
    }

    let best = null;
    // Theme-matched packs that fail the sharp-dock floor stay visible as
    // ready:false near-misses so BoardReadiness can draft honestly (not null).
    let near = null;
    for (const [pack, members] of byPack) {
      let score = 0;
      let memberHits = 0;
      const packTok = norm(pack);
      const packHit = tokens.some((t) => packTok.includes(t) || t === pack);
      for (const t of tokens) {
        if (packTok.includes(t) || t === pack) score += 5;
      }
      for (const p of members) {
        let hitTok = false;
        for (const t of tokens) {
          if (p.tags.includes(t)) {
            score += 3;
            hitTok = true;
          }
          if (p.words.includes(t)) {
            score += 2;
            hitTok = true;
          }
          if (p.key === t || p.key.endsWith('-' + t)) {
            score += 4;
            hitTok = true;
          }
        }
        if (hitTok) memberHits++;
      }
      const heroes = members.filter(isHeroSized).sort(
        (a, b) => (b.relativeScale || 0) - (a.relativeScale || 0) || a.key.localeCompare(b.key)
      );
      const hero = heroes[0] || null;
      const dockPool = members
        .filter((p) => hero && p.key !== hero.key && (p.role === 'object' || p.role === 'tool' || !p.role));
      // Soft splices stay in the bank (heroes / future regen) but never ship on
      // the roleplay dock — min(srcW,srcH) must clear MIN_DOCK_SRC.
      const docks = dockPool.filter(isDockSharp).sort(
        (a, b) => (a.relativeScale || 0) - (b.relativeScale || 0) || a.key.localeCompare(b.key)
      );
      // Need a real theme link: pack name in lesson OR ≥2 pack pieces touched.
      // Stops "dragon" alone from claiming the gashapon machine.
      // Ready uses sharp docks only — a kit of mushy sheet scraps is not ready.
      const themeOk = score >= 8 && (packHit || memberHits >= 2);
      const ready = !!(hero && docks.length >= 6 && themeOk);
      const softDockCount = dockPool.length - docks.length;
      const candidate = {
        pack,
        hero,
        docks,
        dockCount: docks.length,
        softDockCount,
        score,
        ready,
        source: 'pack',
        tokens,
      };
      if (ready) {
        if (!best || score > best.score || (score === best.score && docks.length > best.dockCount)) {
          best = candidate;
        }
      } else if (hero && themeOk) {
        if (
          !near
          || score > near.score
          || (score === near.score && docks.length > near.dockCount)
        ) {
          near = candidate;
        }
      }
    }
    return best || near;
  }

  /**
   * How many vocab words resolve to a real prop (identity: key / alias /
   * pack-suffix / words-from-key). Uses resolve with an explicit minScore so a
   * weak identity-score cannot pass; exact byWord hits still early-return.
   * Soft/abstract nouns on the policy deny list count as misses (empty > wrong).
   */
  function vocabPropHits(lesson) {
    const vocab = (lesson && lesson.vocabulary) || [];
    const family = familyFor(lesson);
    const seed = (lesson && lesson.title) || '';
    let hits = 0;
    const detail = [];
    for (const v of vocab) {
      const word = typeof v === 'string' ? v : v && v.word;
      if (!word) continue;
      const prop = resolve({ word, seed, family, minScore: DEFAULT_MIN_SCORE });
      const ok = !!prop;
      if (ok) hits++;
      detail.push({ word: String(word), prop: prop ? prop.key : null, ok });
    }
    return { hits, total: detail.length, detail };
  }

  /**
   * Load prop bytes for EdbKit.addImage.
   *
   * `hue` is accepted and ignored. The recolour pass has one correct home — the
   * decoded PNG, here — and reserving the signature means it lands in one
   * function with no caller changes. Bolting it onto pieceToPng would force a
   * duplicate into exportBoardPreview.drawPiece, which is how the stretch bug
   * came to exist twice.
   */
  /** Bake-session fetch memo — same path coalesces to one in-flight Promise. */
  const _pngByPath = new Map();

  async function loadPng(prop, opts) {
    if (!prop || !prop.path) return null;
    void (opts && opts.hue);
    const path = prop.path;
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

  window.PropBank = {
    ready,
    loaded,
    all,
    skipped,
    resolve,
    pickDecor,
    pickByRole,
    requestFor,
    familyFor,
    themeTokens,
    assessKit,
    vocabPropHits,
    isDecorativeProp,
    decorativePacksFor,
    isHeroSized,
    isDockSharp,
    sizeFor,
    yFor,
    fillsRect,
    loadPng,
    isDeniedWord,
    isAmbiguousWord,
    identityHit,
    PROP_REQUESTS,
    PROP_ALIASES,
    HOUSE_FAMILY,
    CHROME_ROLES,
    DEFAULT_MIN_SCORE,
    MAX_PROP_H,
    MIN_PROP_H,
    MIN_DOCK_SRC,
    BASE,
    POLICY_URL,
  };

  // Start the fetch at load so a board built straight after page load does not
  // race it. Callers still await ready() — this only shortens the wait.
  ready();
})();
