/* propBank.js — resolve board props out of 09_props by ROLE and TAG.
 *
 * Classic script (no ES modules) → window.PropBank, a deliberate sibling of
 * VocabIcons and SceneBackgrounds.
 *
 * The point of this layer is that adding a manifest row is enough for a prop to
 * start appearing: nothing here enumerates prop keys. Inputs are role, tags,
 * alpha, aspect, relativeScale, anchor and styleFamily, all read from the
 * manifest at fetch time. Recipes ask by role / tags / word only.
 *
 * Borrowed from vocabIcons.js, and the important half: resolve() returns null
 * rather than a near-enough prop. A wrong prop on a board is worse than the
 * canvas rectangle the recipe would have drawn, because it is confidently wrong.
 *
 * resolve() is synchronous so recipes (which run inside the synchronous
 * EdbActivities.buildBoardPlan) can call it. Await ready() once before building
 * a plan; until then the bank is empty and every query answers null.
 */
(function () {
  const BASE = 'assets/09_props';
  const BOARD_H = 590;

  /** relativeScale 1.0 against a 590px board, and the floor below which a cutout is mush. */
  const MAX_PROP_H = 300;
  const MIN_PROP_H = 64;

  /** Manifest omits styleFamily for the matte house style; name it so callers can compare. */
  const HOUSE_FAMILY = 'matte';

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
  let pending = null;
  let warned = false;

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
    tote: 'supply-caddy',
    mat: 'desk-mat',
    tray: 'activity-tray',
    whiteboard: 'mini-whiteboard',
    mic: 'microphone',
    card: 'flashcard-blank',
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
  const GLOSSY_HINTS = [
    'adventure', 'quest', 'pirate', 'treasure', 'magic', 'wizard', 'dragon',
    'fantasy', 'castle', 'camping', 'camp', 'explorer', 'explore', 'jungle',
    'island', 'safari', 'space', 'journey', 'voyage',
    'travel', 'trip', 'holiday', 'vacation', 'airport', 'flight', 'flying',
    'tourist', 'suitcase',
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
        words: norm(key),
        aspect: row.aspect || 1,
        relativeScale: row.relativeScale == null ? 0.5 : row.relativeScale,
        anchor: row.anchor || 'bottom',
        family: row.styleFamily || HOUSE_FAMILY,
        bodyHue: row.bodyHue == null ? null : row.bodyHue,
      };
      out.byKey[key] = prop;
      out.all.push(prop);
    }
    return out;
  }

  /** Load the manifest once. Await before building a board plan. */
  function ready() {
    if (bank) return Promise.resolve(bank);
    if (!pending) {
      pending = fetch(`${BASE}/manifest.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`prop manifest not found at ${BASE}/manifest.json`);
          return r.json();
        })
        .then((raw) => {
          bank = index(raw);
          return bank;
        })
        .catch((err) => {
          pending = null;
          console.warn(err);
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
    for (const hint of MATTE_HINTS) if (words.has(hint)) return HOUSE_FAMILY;
    for (const hint of GLOSSY_HINTS) if (words.has(hint)) return 'glossy-adventure';
    return HOUSE_FAMILY;
  }

  /**
   * Deterministic variety: rotate inside the top-score band from a per-lesson
   * start, then step by index. Seed is lesson.title — the same seed
   * attachBgPicks uses — so one lesson reproduces exactly while two diverge.
   */
  function rotatePick(band, seed, index_) {
    if (!band.length) return null;
    const rotate = (window.SceneBackgrounds && window.SceneBackgrounds.rotate) || (() => 0);
    const start = rotate(seed || '', band.length);
    return band[(start + (index_ || 0)) % band.length];
  }

  function byWord(pool, word) {
    const key = slug(word);
    if (!key) return null;
    const find = (k) => pool.find((p) => p.key === k) || null;

    let hit = find(key);
    if (hit) return hit;

    const alias = PROP_ALIASES[key];
    if (alias) {
      hit = find(alias);
      if (hit) return hit;
    }

    if (key.length > 3 && key.endsWith('s') && !key.endsWith('ss')) {
      hit = find(key.slice(0, -1));
      if (hit) return hit;
    }
    return null;
  }

  /**
   * Resolve one prop, or null.
   *
   *   { role, word, tags, seed, index, exclude, minScore, family }
   *
   * Ladder: exact key → PROP_ALIASES → scored rank over tags + role → role
   * bucket (so role:'cover' always works while the bank has a cover) → null.
   *
   * Scoring mirrors sceneBackgrounds.rank so both pickers behave the same way:
   * +3 a query word is one of the prop's tags, +2 it is part of the prop's key,
   * +2 the role matches. Ties break on FEWER tags (more specific) then key, so
   * the winner never depends on manifest order. A role match alone scores 2 and
   * so does not clear the default floor — role-only queries land on the bucket
   * step instead, which is rotated rather than ranked.
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

    const wantRole = q.role || null;
    const chrome = !!(wantRole && CHROME_ROLES[wantRole]);
    const family = chrome ? HOUSE_FAMILY : (q.family || HOUSE_FAMILY);
    const exclude = new Set(q.exclude || []);
    const pool = bank.all.filter((p) => p.family === family && !exclude.has(p.key));
    if (!pool.length) return null;

    const named = byWord(pool, q.word);
    if (named) return named;

    // The word's own tokens join the tag query: an exact tag match is still an
    // exact match, so this widens reach without inventing a resemblance.
    const want = new Set([...(q.tags || []).flatMap(norm), ...norm(q.word)]);
    const scored = [];
    for (const p of pool) {
      let score = 0;
      for (const t of want) {
        if (p.tags.includes(t)) score += 3;
        if (p.words.includes(t)) score += 2;
      }
      if (q.role && p.role === q.role) score += 2;
      if (score > 0) scored.push({ p, score });
    }
    if (scored.length) {
      scored.sort((a, b) =>
        b.score - a.score ||
        a.p.tags.length - b.p.tags.length ||
        a.p.key.localeCompare(b.p.key)
      );
      const top = scored[0].score;
      if (top >= (q.minScore == null ? 3 : q.minScore)) {
        return rotatePick(scored.filter((s) => s.score === top).map((s) => s.p), q.seed, q.index);
      }
      // Explicit minScore means "theme or nothing" — do not fall through to a
      // role bucket (that is how remotes landed on volcano activity pages).
      if (q.minScore != null) return null;
    } else if (q.minScore != null) {
      // Same rule when nothing scored at all (dentist → swing via playPart bucket).
      return null;
    }

    if (q.role) {
      const bucket = pool.filter((p) => p.role === q.role);
      if (bucket.length) return rotatePick(bucket, q.seed, q.index);
    }
    if (q.roles && q.roles.length) {
      const bucket = pool.filter((p) => q.roles.indexOf(p.role) >= 0);
      if (bucket.length) return rotatePick(bucket, q.seed, q.index);
    }

    return null;
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
    const scale = prop && prop.relativeScale != null ? prop.relativeScale : 0.5;
    let h = Math.min(MAX_PROP_H, Math.max(MIN_PROP_H, Math.round(maxH * scale)));
    if (o.maxW && Math.round(h * aspect) > o.maxW) {
      h = Math.max(1, Math.floor(o.maxW / aspect));
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

  /**
   * Load prop bytes for EdbKit.addImage.
   *
   * `hue` is accepted and ignored. The recolour pass has one correct home — the
   * decoded PNG, here — and reserving the signature means it lands in one
   * function with no caller changes. Bolting it onto pieceToPng would force a
   * duplicate into exportBoardPreview.drawPiece, which is how the stretch bug
   * came to exist twice.
   */
  async function loadPng(prop, opts) {
    if (!prop || !prop.path) return null;
    void (opts && opts.hue);
    const res = await fetch(prop.path);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }

  window.PropBank = {
    ready,
    loaded,
    all,
    skipped,
    resolve,
    requestFor,
    familyFor,
    sizeFor,
    yFor,
    fillsRect,
    loadPng,
    PROP_REQUESTS,
    PROP_ALIASES,
    HOUSE_FAMILY,
    CHROME_ROLES,
    MAX_PROP_H,
    MIN_PROP_H,
    BASE,
  };

  // Start the fetch at load so a board built straight after page load does not
  // race it. Callers still await ready() — this only shortens the wait.
  ready();
})();
