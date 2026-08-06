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
    music: /\b(music|song|songs|sing|singing|piano|guitar|drum|drums|rhythm|band|dance|dancing|instrument|instruments|concert)\b/,
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
    // Themed quiet sets (docs/bg-theme-sets.md) land here as they are imported.
  };

  /** Topic → preferred quiet flat set id (once those flats exist in the manifest). */
  const TOPIC_SETS = [
    { re: /\b(dentist|dental|doctor|clinic|hospital|nurse|tooth|teeth|medical)\b/, set: 'clinic-cool' },
    { re: /\b(airport|travel|train|bus|plane|passport|station)\b/, set: 'travel-air' },
    { re: /\b(home|house|family|kitchen|apartment|bedroom)\b/, set: 'home-warm' },
    { re: /\b(school|classroom|teacher|library|phonics|grammar)\b/, set: 'school-soft' },
    { re: /\b(zoo|park|animal|forest|garden|nature|gym|sport|trampoline|volcano|lava|eruption|crater)\b/, set: 'outdoor-fresh' },
  ];

  const TOPIC_PALETTE = [
    { re: /\b(dentist|dental|doctor|clinic|hospital|nurse|tooth|teeth|medical)\b/, want: ['cool', 'neutral', 'warm'] },
    { re: /\b(airport|travel|train|bus|plane|passport|station)\b/, want: ['travel', 'cool', 'neutral'] },
    { re: /\b(beach|ocean|sea|shore|swim)\b/, want: ['coast', 'outdoor', 'cool'] },
    { re: /\b(volcano|lava|eruption|crater|ash|seismic|geothermal)\b/, want: ['outdoor', 'warm', 'cool'] },
    { re: /\b(zoo|park|animal|forest|garden|nature)\b/, want: ['outdoor', 'cool', 'warm'] },
    // "Living in…" titles must not steal the home palette over a real place.
    { re: /\b(home|house|family|kitchen|apartment|bedroom)\b/, want: ['warm', 'neutral'] },
    { re: /\b(school|classroom|teacher|library)\b/, want: ['neutral', 'cool', 'warm'] },
    { re: /\b(gym|sport|trampoline|play)\b/, want: ['outdoor', 'warm', 'cool'] },
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

  function pickFlat(m, index, seed, reason, moods, topicWords, lockedSet) {
    const all = Object.keys(m.flats);
    const wantSet = lockedSet || setFor(topicWords || seed);
    // Prefer a themed quiet set when the lesson has one with ≥2 members.
    if (wantSet) {
      const setKeys = all.filter((k) => m.flats[k].set === wantSet && isQuietFlat(m.flats[k]));
      if (setKeys.length >= 2) {
        const key = setKeys[(flatOffset(seed, setKeys.length) + (index || 0)) % setKeys.length];
        return {
          type: 'flat',
          name: key,
          file: m.flats[key].file,
          path: `${BASE}/img/${m.flats[key].file}`,
          textInk: m.flats[key].textInk || 'light',
          set: wantSet,
          reason: reason + ` · set:${wantSet}`,
        };
      }
    }

    const allowed = (moods && moods.length
      ? all.filter((k) => moods.includes(m.flats[k].mood || 'calm'))
      : all
    ).filter((k) => isQuietFlat(m.flats[k]));
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
    // PPT-like: stay inside a short band of matching washes, not the whole bank.
    // Never fall open to the full quiet catalog — that reads as random.
    flatKeys = (preferred.length >= 2 ? preferred : ranked.map((r) => r.k)).slice(0, 4);
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

    // Drill / chrome pages: rotate flats. Place pages keep scene matching.
    if (section.preferFlat) {
      return pickFlat(
        m,
        opts.index,
        opts.seed,
        'preferFlat (quiet chrome)',
        opts.moods,
        opts.topicWords || opts.seed,
        opts.lockedSet
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
      opts.lockedSet
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
    // One mood + one quiet theme-set decision per lesson.
    const topicWords = opts.topicWords || opts.seed || '';
    const moods = moodsFor(topicWords);
    const lockedSet = setFor(topicWords);
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
  };
})();
