/* sceneBackgrounds.js — pick a board background for a lesson section.
 *
 * Classic script (no ES modules) — attaches to window.SceneBackgrounds,
 * matching the pattern used by buildEdb.js and vocabIcons.js.
 *
 * Two kinds of background, and the distinction matters:
 *
 *   SCENE  — a real place with a ground plane (classroom, bakery, farm).
 *            Used for scene-building activities where the student drags
 *            objects INTO an environment. Every scene declares a groundY:
 *            the pixel row where the standing surface begins, so a piece's
 *            BASE sits there and it looks like it's standing on the floor.
 *
 *   FLAT   — a near-plain wash. Used for functional pages (matching,
 *            fill-in-the-blank, vocabulary grids) where the structure comes
 *            from cards drawn on top and the background should disappear.
 *
 * Sections that don't describe a place — warm-up, wrap-up, grammar drill —
 * get a FLAT. Forcing them into a scene looks arbitrary and reads worse
 * than a clean background.
 */

(function () {
  const BASE = 'assets/08_backgrounds';
  let _manifest = null;

  async function manifest() {
    if (_manifest) return _manifest;
    const res = await fetch(`${BASE}/manifest.json`);
    if (!res.ok) throw new Error(`background manifest not found at ${BASE}/manifest.json`);
    _manifest = await res.json();
    return _manifest;
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  }

  /**
   * Expand query words so common lesson phrasing hits scene tags.
   * "clinic" alone never matched doctors-office (no clinic tag) → flats / wrong places.
   */
  const ALIASES = {
    clinic: ['doctor', 'medical', 'hospital', 'checkup'],
    clinics: ['doctor', 'medical', 'hospital'],
    doctors: ['doctor'],
    nurse: ['doctor', 'medical', 'hospital'],
    nurses: ['doctor', 'medical'],
    patient: ['doctor', 'medical', 'hospital'],
    sick: ['doctor', 'medical', 'health'],
    illness: ['doctor', 'medical', 'health'],
    fever: ['doctor', 'medical', 'health'],
    appointment: ['doctor', 'checkup', 'medical'],
    diagnosis: ['doctor', 'medical', 'hospital'],
    symptom: ['doctor', 'medical', 'health'],
    symptoms: ['doctor', 'medical', 'health'],
    prescription: ['pharmacy', 'medicine', 'doctor', 'medical'],
    medicine: ['pharmacy', 'medical', 'health'],
    bandage: ['doctor', 'medical'],
    checkup: ['doctor', 'medical', 'checkup'],
    'check-up': ['doctor', 'medical', 'checkup'],

    // Home lessons: "Our Spacious New Apartment" matched no scene at all and
    // fell back to a blank whiteboard. Nouns only — room adjectives like
    // "spacious" describe offices and gyms too, so they stay unmapped.
    apartment: ['home', 'living', 'room', 'family'],
    apartments: ['home', 'living', 'room'],
    house: ['home', 'living', 'room', 'family'],
    home: ['home', 'living', 'room'],
    lounge: ['living', 'room', 'home', 'relax'],
    sofa: ['living', 'room', 'home', 'relax'],
    couch: ['living', 'room', 'home', 'relax'],
    furniture: ['home', 'living', 'room'],
    rent: ['home', 'living', 'room'],

    // Air travel: strong flight vocabulary (passport, customs, departure) was
    // scoring zero because only the words "airport"/"travel" were mapped.
    fly: ['airport', 'travel', 'flight'],
    flying: ['airport', 'travel', 'flight'],
    flight: ['airport', 'travel', 'flight'],
    flights: ['airport', 'travel', 'flight'],
    airline: ['airport', 'travel', 'flight'],
    terminal: ['airport', 'travel'],
    passport: ['airport', 'travel', 'flight'],
    boarding: ['airport', 'travel', 'flight'],
    departure: ['airport', 'travel', 'flight'],
    departures: ['airport', 'travel', 'flight'],
    arrival: ['airport', 'travel', 'flight'],
    arrivals: ['airport', 'travel', 'flight'],
    customs: ['airport', 'travel'],
    layover: ['airport', 'travel', 'waiting'],
    luggage: ['airport', 'travel'],
    baggage: ['airport', 'travel'],
    suitcase: ['airport', 'travel'],
    seatbelt: ['airplane', 'flight', 'travel'],
    turbulence: ['airplane', 'flight'],

    // Volcano / geology — "crater" and "ash" must reach volcano-field tags,
    // and "Living in the Shadow of the Crater" must not lose to living-room
    // just because the title starts with Living.
    volcano: ['volcano', 'lava', 'eruption', 'mountain', 'nature'],
    volcanoes: ['volcano', 'lava', 'eruption', 'mountain'],
    volcanic: ['volcano', 'lava', 'eruption', 'mountain'],
    crater: ['volcano', 'lava', 'eruption', 'mountain'],
    lava: ['volcano', 'lava', 'eruption'],
    magma: ['volcano', 'lava', 'eruption'],
    ash: ['volcano', 'lava', 'eruption'],
    eruption: ['volcano', 'lava', 'eruption'],
    eruptions: ['volcano', 'lava', 'eruption'],
    geothermal: ['volcano', 'lava', 'nature'],
    seismic: ['volcano', 'earthquake', 'nature'],
    tremors: ['volcano', 'earthquake', 'nature'],
    dormant: ['volcano', 'lava', 'mountain'],
    evacuate: ['volcano', 'emergency', 'city'],
    evacuation: ['volcano', 'emergency', 'city'],

    // Trampoline / backyard play — must reach park or playground scenes
    trampoline: ['park', 'playground', 'outdoors', 'gym', 'sport'],
    backflip: ['gym', 'sport', 'park', 'playground'],
    bounce: ['park', 'playground', 'outdoors'],
    spotter: ['gym', 'sport', 'park'],
    backyard: ['home', 'park', 'outdoors', 'garden'],
  };

  /** Words that appear in titles but are not place signals on their own.
   *  "Living in the Shadow of the Crater" was scoring living-room (5) over
   *  volcano-field (3) because "living" hit the living-room name (+2) and
   *  the "living" half of tag "living room" (+3). */
  const SCORE_STOP = new Set([
    'a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
    'title', 'shadow', 'living', 'near', 'next', 'my', 'our', 'your', 'how',
    'what', 'when', 'where', 'why', 'who',
  ]);

  function expandTags(tags) {
    const out = new Set();
    for (const raw of tags || []) {
      for (const t of norm(raw)) {
        if (SCORE_STOP.has(t)) continue;
        out.add(t);
        const extra = ALIASES[t];
        if (extra) extra.forEach((x) => out.add(x));
      }
    }
    return [...out];
  }

  /**
   * Score every scene against a set of tags.
   * Returns [{name, scene, score}] sorted best-first.
   *
   * Scoring:
   *   +3  tag matches one of the scene's own tags exactly
   *   +2  tag matches the scene's name (e.g. "bakery" -> bakery)
   *   +1  category match
   * Ties break on tag-list length — a scene with FEWER tags that still
   * matched is more specific, so bakery(4 tags) beats grocery-store(4) only
   * if it also matched on name. This is deliberate: without it the winner
   * was whichever key happened to come first in the object, which is
   * arbitrary and changes silently.
   */
  async function rank(tags, category) {
    const m = await manifest();
    const want = new Set(expandTags(tags));
    const out = [];

    for (const [name, scene] of Object.entries(m.scenes)) {
      let score = 0;
      const sceneTags = new Set((scene.tags || []).flatMap(norm));
      const nameWords = new Set(norm(name));

      for (const t of want) {
        if (sceneTags.has(t)) score += 3;
        if (nameWords.has(t)) score += 2;
      }
      if (category && scene.category === category) score += 1;

      if (score > 0) out.push({ name, scene, score, specificity: (scene.tags || []).length });
    }

    out.sort((a, b) =>
      b.score - a.score ||
      a.specificity - b.specificity ||
      a.name.localeCompare(b.name)          // final deterministic tiebreak
    );
    return out;
  }

  /**
   * Pick a background for one lesson section.
   *
   * Returns:
   *   { type:'scene', name, file, path, groundY, score }
   *   { type:'flat',  name, file, path, reason }
   *
   * minScore is the confidence floor. A single weak tag overlap (score 3)
   * often produces a scene that's only loosely related — "food" matching a
   * grocery store for a lesson about table manners. Below the floor we'd
   * rather show a clean flat than a wrong place.
   */
  /**
   * Rotate flats from a per-lesson starting point.
   *
   * Round-robin from index 0 means every lesson opens on the same surface and,
   * once the bank grows past the number of drill pages, the flats at the end of
   * the list are never seen. Offsetting by a hash of the lesson keeps a single
   * lesson varied AND makes two lessons look different, while staying stable
   * for the same input so bakes and baselines do not wobble.
   */
  function flatOffset(seed, count) {
    if (!seed || count <= 1) return 0;
    let h = 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % count;
  }

  /**
   * Flats carry a mood (teaching / calm / music / fantasy).
   *
   * Drill pages with card chrome (warm-up, speaking, comprehension, …) only
   * rotate calm washes. Whiteboard / chalkboard / cork are "write-on"
   * surfaces — marker, chalk, or pinned cards ON the board — and must not
   * sit under floating text boxes. Music and fantasy flats still have to be
   * earned by the lesson topic.
   */
  const DEFAULT_MOODS = ['calm', 'teaching'];
  const MOOD_HINTS = {
    music: /\b(music|song|songs|sing|singing|piano|guitar|drum|drums|rhythm|band|dance|dancing|instrument|instruments|concert|compose|composer|composition|orchestra|melody|harmony|tempo|symphony|classical|violin|strum)\b/,
    fantasy: /\b(fairy|tale|tales|castle|magic|magical|dragon|dragons|princess|prince|knight|wizard|witch|monster|monsters|space|planet|planets|rocket|star|stars|moon|dream|dreams|night|halloween|dinosaur|dinosaurs)\b/,
  };

  /** Soft palette families for drill flats — bias clinic lessons away from beach/night lottery. */
  const FLAT_PALETTE = {
    whiteboard: 'neutral', chalkboard: 'neutral', cork: 'warm', desk: 'neutral',
    'sky-meadow': 'outdoor', 'sunrise-plane': 'travel', 'peach-blush': 'warm',
    'starry-night': 'night', 'seafoam-shore': 'coast', 'terracotta-arch': 'warm',
    'window-blue': 'cool', 'sage-leaves': 'cool', 'warm-window': 'warm',
    'world-map': 'travel', 'blue-alcove': 'cool', 'dawn-clouds': 'cool',
    'lavender-strings': 'music', 'cloud-castle': 'fantasy',
    'classical-moon-a': 'music', 'classical-moon-b': 'music',
    'classical-moon-c': 'music', 'classical-moon-d': 'music',
    'clinic-a': 'cool', 'clinic-b': 'cool', 'clinic-c': 'cool', 'clinic-d': 'cool',
    'school-a': 'warm', 'school-b': 'warm', 'school-c': 'warm', 'school-d': 'warm',
    'travel-a': 'travel', 'travel-b': 'travel', 'travel-c': 'travel', 'travel-d': 'travel',
    'home-a': 'warm', 'home-b': 'warm', 'home-c': 'warm', 'home-d': 'warm',
    'outdoor-a': 'outdoor', 'outdoor-b': 'outdoor', 'outdoor-c': 'outdoor', 'outdoor-d': 'outdoor',
    'gym-a': 'cool', 'gym-b': 'cool', 'gym-c': 'cool', 'gym-d': 'cool',
    'house-a': 'cool', 'house-b': 'cool', 'house-c': 'cool', 'house-d': 'cool',
    'face-a': 'cool', 'face-b': 'cool', 'face-c': 'cool', 'face-d': 'cool',
    'board-face-a': 'cool', 'board-face-b': 'cool', 'board-face-c': 'cool', 'board-face-d': 'cool',
  };

  /**
   * ClassIn house deck — default when no place theme matches.
   * Soft tinted walls only. Charm eggs must be topic-NEUTRAL (tiny stars / dots) —
   * never eyes/faces/winks. Face easter eggs live on `board-face` only.
   * Title pins to panel -a (clean); mid spine prefers -b…; wrap pins to -d.
   */
  const DEFAULT_SET = 'board-house';

  /** Topic → preferred quiet flat set id. Place themes + face-only charm set. */
  const TOPIC_SETS = [
    { re: /\b(dentists?|dental|doctors?|clinic|hospital|nurse|tooth|teeth|medical)\b/, set: 'clinic-cool' },
    // No bare "station" — "Space Station" must not steal travel-air; train/bus station still match.
    { re: /\b(airport|travel|train|bus|plane|passport|(?:train|bus|transit|railway)\s*stations?)\b/, set: 'travel-air' },
    { re: /\b(home|house|family|kitchen|apartment|bedroom|hotel)\b/, set: 'home-warm' },
    // Indoor gym before outdoor — "gym" must not land on park meadows.
    // Soccer/tennis/etc. beyond bare "gym" still lock court washes (not meadow).
    { re: /\b(gym|workout|athletic|basketball|fitness|sports?|soccer|football|tennis|baseball)\b/, set: 'gym-cool' },
    // Indoor tank washes before beach/ocean — "coral"/"tank" must not steal beach-warm.
    { re: /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/, set: 'aquarium-cool' },
    { re: /\b(zoo|park|animal|forest|garden|nature|trampoline|volcano|lava|eruption|crater|farm|pool|swim|swimming|campsites?|camp(?:ing|fire)?|playgrounds?)\b/, set: 'outdoor-fresh' },
    { re: /\b(beach|ocean|sea|shore|seaside|island)\b/, set: 'beach-warm' },
    // Place nouns only — bare "bread" must not steal supermarket lessons onto bakery.
    { re: /\b(bakerys?|bake\s*shop|pastry\s*shop|cafes?|caf[eé]s?)\b/, set: 'bakery-warm' },
    // Supermarket aisle washes — not outdoor-fresh meadow.
    { re: /\b(markets?|supermarkets?|grocer(?:y|ies)|farmers?\s*markets?)\b/, set: 'supermarket-cool' },
    // Feelings / emotion compass — same quiet board-face washes as make-a-face.
    { re: /\b(feeling|feelings|emotion|emotions|mood|worried|scared|shy|confused|proud|surprised)\b/, set: 'board-face' },
    // Face lessons only — tiny eye/wink eggs. Never the default for castle/school/etc.
    { re: /\b(faces?|eyes?|nose|mouth|cheek|make.?a.?face|blank.?face)\b/, set: 'board-face' },
    // Classical compose / concert — indigo moon washes (title may still take terrace scene).
    { re: /\b(compose|composer|composition|orchestra|classical|symphony|concert|masterpiece|melody|harmony|tempo)\b/, set: 'classical-moon' },
  ];

  /**
   * Place-like titles that should lock a quiet set (or report a bgGap).
   * Broader than TOPIC_SETS so missing place sets surface honestly.
   * School/library/museum/weather stay on board-house — not place-set gaps.
   * No bare "station" — space station is not travel.
   */
  const PLACE_SIGNALS = [
    /\b(dentists?|dental|doctors?|clinic|hospital|nurse|medical)\b/,
    /\b(airport|travel|train|bus|plane|passport|(?:train|bus|transit|railway)\s*stations?|hotel)\b/,
    /\b(home|house|family|kitchen|apartment|bedroom)\b/,
    /\b(zoo|park|animal|forest|garden|nature|gym|sport|trampoline|volcano)\b/,
    /\b(aquariums?|fish\s*tanks?)\b/,
    /\b(beach|ocean|sea|shore|seaside|island)\b/,
    /\b(bakerys?|bake\s*shop|pastry|cafes?|caf[eé]|restaurants?|markets?|supermarkets?|grocery|groceries)\b/,
    /\b(farm|campsites?|camp(?:ing)?|pool|swimming|playgrounds?)\b/,
  ];

  const TOPIC_PALETTE = [
    { re: /\b(dentists?|dental|doctors?|clinic|hospital|nurse|tooth|teeth|medical)\b/, want: ['cool', 'neutral', 'warm'] },
    { re: /\b(airport|travel|train|bus|plane|passport|(?:train|bus|transit|railway)\s*stations?)\b/, want: ['travel', 'cool', 'neutral'] },
    { re: /\b(aquariums?|fish\s*tanks?|coral)\b/, want: ['cool', 'coast', 'neutral'] },
    { re: /\b(beach|ocean|sea|shore|swim)\b/, want: ['coast', 'outdoor', 'cool'] },
    { re: /\b(volcano|lava|eruption|crater|ash|seismic|geothermal)\b/, want: ['outdoor', 'warm', 'cool'] },
    { re: /\b(zoo|park|animal|forest|garden|nature|campsites?|camping|playgrounds?)\b/, want: ['outdoor', 'cool', 'warm'] },
    // "Living in…" titles must not steal the home palette over a real place.
    { re: /\b(home|house|family|kitchen|apartment|bedroom)\b/, want: ['warm', 'neutral'] },
    { re: /\b(bakerys?|bake\s*shop|pastry|cafes?|caf[eé]|restaurants?)\b/, want: ['warm', 'neutral', 'cool'] },
    { re: /\b(markets?|supermarkets?|grocery|groceries)\b/, want: ['cool', 'neutral', 'warm'] },
    { re: /\b(school|classroom|teacher|library|museum|weather)\b/, want: ['neutral', 'cool', 'warm'] },
    { re: /\b(gym|sport|trampoline|play|workout|athletic|soccer|football|tennis)\b/, want: ['cool', 'outdoor', 'warm'] },
  ];

  function palettesFor(topicWords) {
    const text = ' ' + String(Array.isArray(topicWords) ? topicWords.join(' ') : (topicWords || '')).toLowerCase() + ' ';
    for (const row of TOPIC_PALETTE) {
      if (row.re.test(text)) return row.want;
    }
    return ['warm', 'cool', 'neutral'];
  }

  function setFor(topicWords) {
    const text = ' ' + String(Array.isArray(topicWords) ? topicWords.join(' ') : (topicWords || '')).toLowerCase() + ' ';
    for (const row of TOPIC_SETS) {
      if (row.re.test(text)) return row.set;
    }
    return null;
  }

  function isPlaceTopic(topicWords) {
    const text = ' ' + String(Array.isArray(topicWords) ? topicWords.join(' ') : (topicWords || '')).toLowerCase() + ' ';
    if (setFor(text)) return true;
    return PLACE_SIGNALS.some((re) => re.test(text));
  }

  /** Quiet flat count for a set id against a loaded (or passed) manifest. */
  function quietFlatCount(setId, m) {
    if (!setId || !m || !m.flats) return 0;
    return Object.keys(m.flats).filter((k) => {
      const f = m.flats[k];
      return f && f.set === setId && f.quiet !== false;
    }).length;
  }

  /**
   * Place-theme flat coverage. gap=true when the topic is a place but has no
   * TOPIC_SETS row, or the matched set has fewer than 2 quiet flats.
   */
  function bgCoverage(topicWords, m) {
    const text = Array.isArray(topicWords) ? topicWords.join(' ') : (topicWords || '');
    const place = isPlaceTopic(text);
    const set = setFor(text);
    if (!place) {
      return { place: false, set: null, flats: 0, gap: false };
    }
    if (!set) {
      return { place: true, set: null, flats: 0, gap: true, reason: 'place theme has no TOPIC_SETS row' };
    }
    const flats = quietFlatCount(set, m);
    if (flats < 2) {
      return {
        place: true,
        set,
        flats,
        gap: true,
        reason: `place set “${set}” has ${flats} quiet flat(s) (need ≥2)`,
      };
    }
    return { place: true, set, flats, gap: false };
  }


  function moodsFor(topicWords) {
    const text = ' ' + norm(Array.isArray(topicWords) ? topicWords.join(' ') : topicWords).join(' ') + ' ';
    const out = [...DEFAULT_MOODS];
    for (const [mood, re] of Object.entries(MOOD_HINTS)) {
      if (re.test(text)) out.push(mood);
    }
    return out;
  }

  /** True when a flat is safe under cards (default true; busy prop photos opt out). */
  function isQuietFlat(entry) {
    if (!entry) return true;
    if (entry.quiet === false) return false;
    return true;
  }

  function pickFlat(m, index, seed, reason, moods, topicWords, lockedSet, pin) {
    const all = Object.keys(m.flats);
    const fromSetFor = setFor(topicWords || seed);
    const wantSet = lockedSet || fromSetFor || DEFAULT_SET;
    // Prefer a quiet set (place theme or house default) when ≥2 members exist.
    if (wantSet) {
      const setKeys = all
        .filter((k) => m.flats[k].set === wantSet && isQuietFlat(m.flats[k]))
        .sort();
      if (setKeys.length >= 2) {
        let key;
        // Title leans hardest into the deck's personality panel (-a).
        // Mid spine prefers quieter panels (-b…) when available — readability first.
        // Wrap pins to last panel for a stable close.
        if (pin === 'open') key = setKeys[0];
        else if (pin === 'close') key = setKeys[setKeys.length - 1];
        else {
          // Thin sets (<3) recycle hard for M5. Borrow house cool panels only
          // when the place set is too short — never dilute a full 4-panel deck
          // (classical-moon was leaking house-a into music lessons).
          // Manus ≤2 bg registers: mid-deck rotates at most 2 quiet panels
          // (open/close pins stay on set ends; spine never fans across 3–4 washes).
          let midPool = setKeys.length >= 3 ? setKeys.slice(1) : setKeys.slice();
          if (setKeys.length < 3 && wantSet !== DEFAULT_SET) {
            const room = Math.max(0, 2 - midPool.length);
            if (room > 0) {
              const houseBoost = all.filter((k) => {
                const f = m.flats[k];
                if (!f || f.set !== DEFAULT_SET || !isQuietFlat(f)) return false;
                const pal = FLAT_PALETTE[k] || f.palette || 'neutral';
                return pal === 'cool' || pal === 'neutral';
              }).sort();
              if (houseBoost.length) midPool = midPool.concat(houseBoost.slice(0, room));
            }
          }
          midPool = midPool.slice(0, 2);
          key = midPool[(flatOffset(seed, midPool.length) + (index || 0)) % midPool.length];
        }
        return {
          type: 'flat',
          name: key,
          file: m.flats[key].file,
          path: `${BASE}/img/${m.flats[key].file}`,
          textInk: m.flats[key].textInk || 'light',
          set: wantSet,
          reason: reason + ` · set:${wantSet}` + (pin ? ` · pin:${pin}` : ''),
        };
      }
    }

    const allowed = (moods && moods.length
      ? all.filter((k) => moods.includes(m.flats[k].mood || 'calm'))
      : all
    ).filter((k) => isQuietFlat(m.flats[k]) && !m.flats[k].set);
    // Flats that declare a `set` are reserved for TOPIC_SETS / DEFAULT_SET —
    // they must not leak into the generic calm rotation.
    let flatKeys = allowed.length ? allowed : all.filter((k) => isQuietFlat(m.flats[k]));
    if (!flatKeys.length) flatKeys = all;
    const want = palettesFor(topicWords || seed);
    // Prefer flats whose palette matches the lesson family, then rotate.
    const ranked = flatKeys
      .map((k) => {
        const pal = FLAT_PALETTE[k] || m.flats[k].palette || 'neutral';
        const aff = want.indexOf(pal);
        return { k, score: aff < 0 ? 50 : aff };
      })
      .sort((a, b) => a.score - b.score || a.k.localeCompare(b.k));
    const preferred = ranked.filter((r) => r.score < 50).map((r) => r.k);
    // PPT-like: ≤2 mid-deck registers (Manus visual consistency). Never fall
    // open to the full quiet catalog — that reads as random.
    flatKeys = (preferred.length >= 2 ? preferred : ranked.map((r) => r.k)).slice(0, 2);
    const key = flatKeys[(flatOffset(seed, flatKeys.length) + (index || 0)) % flatKeys.length];
    return {
      type: 'flat',
      name: key,
      file: m.flats[key].file,
      path: `${BASE}/img/${m.flats[key].file}`,
      textInk: m.flats[key].textInk || 'light',
      set: m.flats[key].set || null,
      reason,
    };
  }

  async function pickFor(section, opts = {}) {
    const minScore = opts.minScore ?? 4;
    const m = await manifest();
    const secTags = section.tags || [];
    const pin = secTags.includes('title') ? 'open' : (secTags.includes('wrap') ? 'close' : null);

    // Drill / chrome pages: rotate flats. Place pages keep scene matching.
    if (section.preferFlat) {
      return pickFlat(
        m,
        opts.index,
        opts.seed,
        'preferFlat (quiet chrome)',
        opts.moods,
        opts.topicWords || opts.seed,
        opts.lockedSet,
        pin
      );
    }

    const tags = [
      ...(section.tags || []),
      ...norm(section.title),
      ...(section.vocabulary || []).map(v => (typeof v === 'string' ? v : v.word)),
    ].filter(Boolean);

    const ranked = await rank(tags, section.category);

    if (ranked.length && ranked[0].score >= minScore) {
      const best = ranked[0];
      return {
        type: 'scene',
        name: best.name,
        file: best.scene.file,
        path: `${BASE}/img/${best.scene.file}`,
        groundY: best.scene.groundY,
        score: best.score,
        // Photographic scenes vary too much to trust dark chrome text on them.
        textInk: 'light',
        runnersUp: ranked.slice(1, 3).map(r => `${r.name}(${r.score})`),
      };
    }

    return pickFlat(
      m,
      opts.index,
      opts.seed,
      ranked.length
        ? `best match ${ranked[0].name} scored ${ranked[0].score}, below floor of ${minScore}`
        : 'no scene matched any tag',
      opts.moods,
      opts.topicWords || opts.seed,
      opts.lockedSet,
      pin
    );
  }

  /**
   * Pick for a whole lesson.
   * Place pages reuse the first confident scene; drill pages rotate flats.
   */
  async function planFor(sections, opts = {}) {
    const out = [];
    let flatCount = 0;
    let placeScene = null;
    // One mood + one quiet theme-set decision per lesson (place or house default).
    const topicWords = opts.topicWords || opts.seed || '';
    const moods = moodsFor(topicWords);
    const setMatch = setFor(topicWords);
    const lockedSet = setMatch || DEFAULT_SET;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec.preferFlat && placeScene) {
        out.push(Object.assign({}, placeScene, { reused: true }));
        continue;
      }
      const p = await pickFor(sec, {
        ...opts,
        index: flatCount,
        moods,
        topicWords,
        lockedSet,
      });
      if (p.type === 'flat') flatCount++;
      if (p.type === 'scene' && !placeScene) placeScene = p;
      out.push(p);
    }
    return out;
  }

  /** Load a background as bytes, ready for EdbKit.addImage. */
  async function loadPng(pick) {
    const res = await fetch(pick.path);
    if (!res.ok) throw new Error(`background not found: ${pick.path}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  /**
   * Where to place a piece so it stands on the ground.
   * For a flat background there's no ground plane, so pieces are centred
   * in the lower half instead.
   */
  function standOn(pick, pieceHeight) {
    if (pick.type === 'scene' && pick.groundY) return pick.groundY - pieceHeight;
    return Math.round(590 * 0.55) - Math.round(pieceHeight / 2);
  }

  /** Unlocked roles that stand on the scene floor in a centred row.
   *  buildPart / dockPiece / dressPart stay in the dock — standing dress
   *  accessories mid-board was overlapping activity template cards.
   *  heroPart stands — the trampoline (etc.) belongs on the ground plane. */
  const STAND_ROLES = { sortCard: 1, heroPart: 1 };

  function isStandRole(role) {
    return !!STAND_ROLES[role];
  }

  /**
   * Centre standers on the scene ground. Returns null when the page should keep
   * recipe coordinates (no scene pick / empty list). Shared by .edb export and
   * board preview so the two paths cannot drift.
   */
  function standRow(standers, pick, boardW) {
    if (!standers || !standers.length || !pick || pick.type !== 'scene') return null;
    const n = standers.length;
    const gap = 16;
    const totalW = standers.reduce((s, p) => s + (p.w || 96), 0) + gap * Math.max(0, n - 1);
    let x = Math.max(260, Math.min(1020 - totalW, Math.round((boardW - totalW) / 2)));
    const out = [];
    for (const piece of standers) {
      const h = piece.h || 96;
      const w = piece.w || 96;
      out.push({ piece, x, y: standOn(pick, h), w, h });
      x += w + gap;
    }
    return out;
  }

  window.SceneBackgrounds = {
    manifest, rank, pickFor, planFor, loadPng, standOn, standRow, isStandRole,
    STAND_ROLES, rotate: flatOffset, moodsFor, BASE,
    setFor, isPlaceTopic, quietFlatCount, bgCoverage,
    TOPIC_SETS, PLACE_SIGNALS, DEFAULT_SET,
  };
})();
