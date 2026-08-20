/* topicIdentity.js — Topic Identity Gate (grounding before plan/render).
 *
 * Classic script → window.TopicIdentity
 *
 * Builds a TopicBrief for every lesson so secondary settings (farm) cannot
 * overpower a primary topic (beekeeping). Layouts stay untouched — this only
 * grounds vocab / BG / prop / charm selection and BoardReadiness TOPIC_DRIFT.
 */
(function () {
  const DEFAULT_ALLOW_SECONDARY = Object.freeze(['title', 'story', 'activity', 'wrap']);

  /**
   * Generic environment / parent-ish words — never preferred as core when a
   * more specific topic head exists. Data list, not per-topic if-branches.
   */
  const GENERIC_ENV_WORDS = Object.freeze([
    'garden', 'flower', 'tree', 'leaf', 'suit', 'smoke', 'worker', 'animal', 'place',
    'thing', 'nature', 'outdoor', 'field', 'park', 'people', 'person', 'job', 'helper',
    'tool', 'object', 'stuff', 'area', 'world', 'life', 'day', 'time', 'water', 'air',
    'ground', 'sky', 'cloud', 'fun', 'happy', 'big', 'small', 'good', 'nice',
  ]);

  /** Morphological occupation / craft tails → keep the head as a core stem. */
  const OCCUPATION_TAIL_RE =
    /^(?:(.+?)(?:keeper|smith|maker|wright|tist|cian|grapher|ologist|ographer)|(.+?)(?:ing|tion|ment|ness|ology|graphy))$/;

  /**
   * Catalog: narrow primary topics with parent false-friends.
   * Passthrough rows mirror resolveTheme ids so known themes still get a brief.
   */
  const CATALOG = [
    {
      match: /\b(beekeep(?:er|ing)?|bee\s*keep|apiary|honeyc?omb|hive\s*bee|beekeeper|honey\s*bees?|bees?)\b/,
      topicId: 'beekeeping',
      topicLabel: 'beekeeping',
      parentCategories: ['farm', 'outdoor', 'nature'],
      coreConcepts: ['bee', 'hive', 'honey', 'beekeeper', 'honeycomb', 'nectar'],
      supportingConcepts: ['pollen', 'wax', 'queen', 'smoker', 'veil', 'frame'],
      primaryMotifs: ['hive', 'bee', 'honeycomb', 'beekeeper', 'honey jar'],
      secondaryMotifs: ['farm', 'field', 'flower meadow', 'barn silhouette'],
      preferredPalette: ['warm', 'amber', 'cream'],
      backgroundCues: {
        preferSets: ['outdoor-fresh'],
        preferTags: ['bee', 'hive', 'honey', 'garden'],
        avoidSets: [],
        // Farm picnic washes are env-only — never the whole deck's identity.
        parentAvoidAsPrimary: ['outdoor-fresh'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: [
        'tractor', 'cow', 'pig', 'sheep', 'barn', 'scarecrow', 'hay bale', 'farm-barn',
        'chicken', 'horse', 'plow',
      ],
      weakSubstitutes: ['flower', 'garden', 'tree', 'leaf', 'butterfly'],
    },
    {
      match: /\b(volcanoes?|volcanic|lava|eruptions?|craters?|magma|ash|geothermal|seismic)\b/,
      topicId: 'volcano',
      topicLabel: 'volcano',
      parentCategories: ['outdoor', 'nature', 'geology'],
      coreConcepts: ['volcano', 'lava', 'ash', 'eruption', 'crater', 'rock'],
      supportingConcepts: ['magma', 'smoke', 'tremor', 'hot', 'mountain'],
      primaryMotifs: ['crater', 'lava', 'ash plume', 'volcano cone'],
      secondaryMotifs: ['mountain', 'sky', 'cloud'],
      preferredPalette: ['warm', 'cool', 'ash'],
      backgroundCues: {
        preferSets: ['volcano-cool'],
        preferTags: ['volcano', 'lava', 'ash'],
        avoidSets: ['outdoor-fresh'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['picnic', 'zoo', 'park bench', 'trampoline', 'farm'],
      weakSubstitutes: ['mountain alone', 'rock alone'],
    },
    {
      match: /\b(sea\s*animals?|ocean\s*animals?|marine|underwater|sharks?|whales?|dolphins?|orcas?)\b/,
      topicId: 'marine',
      topicLabel: 'sea animals',
      parentCategories: ['beach', 'ocean', 'outdoor', 'aquarium'],
      coreConcepts: ['shark', 'dolphin', 'whale', 'fish', 'ocean', 'swim'],
      supportingConcepts: ['fin', 'tail', 'coral', 'wave', 'reef'],
      primaryMotifs: ['shark', 'dolphin', 'whale', 'fish', 'bubbles'],
      secondaryMotifs: ['ocean wash', 'wave fringe', 'tank glass'],
      preferredPalette: ['cool', 'coast', 'aqua'],
      backgroundCues: {
        preferSets: ['aquarium-cool'],
        preferTags: ['aquarium', 'ocean', 'fish', 'marine'],
        avoidSets: ['outdoor-fresh', 'beach-warm'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['picnic', 'sandcastle', 'umbrella', 'park', 'zoo gate'],
      weakSubstitutes: ['shell', 'sand', 'sun'],
    },
    {
      match: /\b(aquariums?|fish\s*tanks?|coral\s*reefs?)\b/,
      topicId: 'aquarium',
      topicLabel: 'aquarium',
      parentCategories: ['beach', 'ocean', 'outdoor'],
      coreConcepts: ['fish', 'tank', 'coral', 'bubble', 'seaweed', 'water'],
      supportingConcepts: ['reef', 'shell', 'crab', 'jellyfish'],
      primaryMotifs: ['tank', 'bubbles', 'coral', 'seaweed', 'fish'],
      secondaryMotifs: ['water wash', 'glass rim'],
      preferredPalette: ['cool', 'coast', 'aqua'],
      backgroundCues: {
        preferSets: ['aquarium-cool'],
        preferTags: ['aquarium', 'fish', 'tank', 'coral'],
        avoidSets: ['beach-warm', 'outdoor-fresh'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['sandcastle', 'beach umbrella', 'picnic', 'surfboard'],
      weakSubstitutes: ['shell', 'sand'],
    },
    {
      match: /\b(soccer|football|goalkeeper|kickoff|pitch|fifa|striker|goalie)\b/,
      topicId: 'soccer',
      topicLabel: 'soccer',
      parentCategories: ['sports', 'gym', 'outdoor'],
      coreConcepts: ['soccer', 'ball', 'goal', 'kick', 'coach', 'team'],
      supportingConcepts: ['whistle', 'cleats', 'jersey', 'net', 'field'],
      primaryMotifs: ['soccer ball', 'goal', 'pitch line', 'corner flag'],
      secondaryMotifs: ['field green', 'crowd fringe'],
      preferredPalette: ['fresh', 'green', 'cool'],
      backgroundCues: {
        preferSets: ['soccer-fresh'],
        preferTags: ['soccer', 'football', 'pitch'],
        avoidSets: ['gym-cool', 'outdoor-fresh'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['basketball', 'hoop', 'tennis racket', 'picnic'],
      weakSubstitutes: ['medal', 'trophy'],
    },
    // Niche topics that must not collapse into parent settings (data seed).
    {
      match: /\b(locksmiths?|lock\s*smith|padlocks?|deadbolts?)\b/,
      topicId: 'locksmith',
      topicLabel: 'locksmith',
      parentCategories: ['jobs', 'community', 'tools'],
      coreConcepts: ['locksmith', 'lock', 'key', 'padlock', 'door', 'keyring'],
      supportingConcepts: ['deadbolt', 'keyhole', 'hinge', 'tool'],
      primaryMotifs: ['lock', 'key', 'padlock'],
      secondaryMotifs: ['door frame', 'workshop'],
      preferredPalette: ['cool', 'metal'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['lock', 'key', 'door'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['clock', 'block', 'police', 'firefighter'],
      weakSubstitutes: ['worker', 'tool', 'job'],
    },
    {
      match: /\b(recycl(?:e|ing|er)?|recycling\s*center|sort(?:ing)?\s*waste|compost)\b/,
      topicId: 'recycling',
      topicLabel: 'recycling',
      parentCategories: ['community', 'outdoor', 'city'],
      coreConcepts: ['recycle', 'bin', 'plastic', 'paper', 'glass', 'sort'],
      supportingConcepts: ['compost', 'waste', 'can', 'bottle'],
      primaryMotifs: ['recycle bin', 'sorted bottles', 'arrows'],
      secondaryMotifs: ['city street', 'center'],
      preferredPalette: ['fresh', 'green'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['recycle', 'bin', 'sort'],
        avoidSets: ['outdoor-fresh'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['picnic', 'park bench', 'playground'],
      weakSubstitutes: ['center', 'place', 'city'],
    },
    {
      match: /\b(potter(?:y|ies)?|ceramics?|kiln|clay\s*pot|potter.?s?\s*wheel)\b/,
      topicId: 'pottery',
      topicLabel: 'pottery',
      parentCategories: ['art', 'craft', 'hobby'],
      coreConcepts: ['pottery', 'clay', 'kiln', 'glaze', 'wheel', 'pot'],
      supportingConcepts: ['ceramic', 'bowl', 'vase', 'sculpt'],
      primaryMotifs: ['clay pot', 'wheel', 'kiln'],
      secondaryMotifs: ['studio shelf'],
      preferredPalette: ['warm', 'earth'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['pottery', 'clay', 'kiln'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['paintbrush only', 'crayon', 'marker'],
      weakSubstitutes: ['art', 'craft', 'hobby'],
    },
    {
      match: /\b(archaeolog(?:y|ist)?|excavation|artifact|fossil\s*dig|dig\s*site)\b/,
      topicId: 'archaeology',
      topicLabel: 'archaeology',
      parentCategories: ['history', 'museum', 'science'],
      coreConcepts: ['archaeology', 'artifact', 'fossil', 'dig', 'brush', 'map'],
      supportingConcepts: ['excavation', 'bone', 'ruin', 'site'],
      primaryMotifs: ['dig site', 'artifact tray', 'fossil brush'],
      secondaryMotifs: ['museum hall'],
      preferredPalette: ['warm', 'earth'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['archaeology', 'artifact', 'fossil', 'dig'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['king crown', 'castle only', 'textbook'],
      weakSubstitutes: ['history', 'museum', 'old'],
    },
    {
      match: /\b(photograph(?:y|er)?|cameras?|lens|darkroom|snapshot)\b/,
      topicId: 'photography',
      topicLabel: 'photography',
      parentCategories: ['art', 'hobby', 'media'],
      coreConcepts: ['camera', 'photo', 'lens', 'tripod', 'flash', 'photograph'],
      supportingConcepts: ['album', 'focus', 'portrait', 'shutter'],
      primaryMotifs: ['camera', 'lens', 'photo'],
      secondaryMotifs: ['studio light'],
      preferredPalette: ['cool', 'neutral'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['camera', 'photo', 'lens'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['paint palette', 'crayon', 'microscope'],
      weakSubstitutes: ['art', 'picture', 'image'],
    },
    {
      match: /\b(lighthouses?|lighthouse\s*keep|beacon|light\s*keeper)\b/,
      topicId: 'lighthouse',
      topicLabel: 'lighthouse',
      parentCategories: ['coast', 'outdoor', 'jobs'],
      coreConcepts: ['lighthouse', 'beacon', 'lamp', 'coast', 'keeper', 'tower'],
      supportingConcepts: ['fog', 'ship', 'stairs', 'lens'],
      primaryMotifs: ['lighthouse tower', 'beacon light'],
      secondaryMotifs: ['sea wash', 'cliff'],
      preferredPalette: ['cool', 'coast'],
      backgroundCues: {
        preferSets: ['beach-warm'],
        preferTags: ['lighthouse', 'beacon', 'coast'],
        avoidSets: ['outdoor-fresh'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['goalkeeper', 'picnic', 'sandcastle'],
      weakSubstitutes: ['tower', 'building', 'job'],
    },
    {
      match: /\b(postal|mail\s*carrier|mailman|post\s*office|postage|letter\s*carrier)\b/,
      topicId: 'postal-service',
      topicLabel: 'postal service',
      parentCategories: ['community', 'jobs', 'city'],
      coreConcepts: ['mail', 'letter', 'stamp', 'mailbox', 'package', 'post'],
      supportingConcepts: ['envelope', 'carrier', 'address', 'parcel'],
      primaryMotifs: ['mailbox', 'stamp', 'letter'],
      secondaryMotifs: ['street', 'post office'],
      preferredPalette: ['fresh', 'cool'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['mail', 'stamp', 'mailbox'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['police', 'firefighter', 'doctor'],
      weakSubstitutes: ['job', 'worker', 'helper'],
    },
    {
      match: /\b(sew(?:ing)?|needle(?:work)?|thread|fabric|hem|stitch)\b/,
      topicId: 'sewing',
      topicLabel: 'sewing',
      parentCategories: ['craft', 'hobby', 'home'],
      coreConcepts: ['sewing', 'needle', 'thread', 'fabric', 'button', 'stitch'],
      supportingConcepts: ['hem', 'pin', 'scissors', 'pattern'],
      primaryMotifs: ['needle', 'thread', 'fabric'],
      secondaryMotifs: ['sewing table'],
      preferredPalette: ['warm', 'soft'],
      backgroundCues: {
        preferSets: [],
        preferTags: ['sewing', 'needle', 'thread'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['paintbrush', 'hammer', 'wrench'],
      weakSubstitutes: ['craft', 'hobby', 'cloth'],
    },
    // --- passthroughs aligned with resolveTheme / TOPIC_SETS ---
    {
      match: /\b(space|spaceships?|spacecraft|rockets?|astronauts?|planets?|orbit|galaxy|nasa|mars|lunar)\b/,
      topicId: 'space',
      topicLabel: 'space',
      parentCategories: ['science', 'school'],
      coreConcepts: ['rocket', 'astronaut', 'planet', 'moon', 'star', 'space'],
      supportingConcepts: ['satellite', 'galaxy', 'orbit', 'helmet', 'telescope'],
      primaryMotifs: ['rocket', 'planet', 'stars', 'crescent moon', 'astronaut'],
      secondaryMotifs: ['indigo wash', 'nebula fringe'],
      preferredPalette: ['cool', 'indigo', 'periwinkle'],
      backgroundCues: {
        preferSets: ['space-cool'],
        preferTags: ['space', 'planet', 'rocket'],
        avoidSets: ['board-house'],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['school desk', 'park', 'kitchen'],
      weakSubstitutes: ['cloud', 'dawn'],
    },
    {
      match: /\b(farms?|barns?|tractors?|scarecrows?|hay\s*bales?)\b/,
      topicId: 'farm',
      topicLabel: 'farm',
      parentCategories: ['outdoor', 'nature'],
      coreConcepts: ['farm', 'barn', 'tractor', 'cow', 'chicken', 'hay'],
      supportingConcepts: ['pig', 'sheep', 'scarecrow', 'field'],
      primaryMotifs: ['barn', 'tractor', 'hay', 'farm animal'],
      secondaryMotifs: ['field', 'sky'],
      preferredPalette: ['warm', 'fresh', 'outdoor'],
      backgroundCues: {
        preferSets: ['outdoor-fresh'],
        preferTags: ['farm', 'barn', 'outdoor'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: [],
      weakSubstitutes: [],
    },
    {
      match: /\b(dentists?|dental|tooth|teeth|cavity|floss)\b/,
      topicId: 'dental',
      topicLabel: 'dental',
      parentCategories: ['clinic', 'hospital', 'medical'],
      coreConcepts: ['tooth', 'toothbrush', 'dentist', 'floss', 'cavity', 'smile'],
      supportingConcepts: ['mirror', 'paste', 'checkup'],
      primaryMotifs: ['tooth', 'toothbrush', 'open mouth'],
      secondaryMotifs: ['clinic wash'],
      preferredPalette: ['cool', 'clinic'],
      backgroundCues: {
        preferSets: ['clinic-cool'],
        preferTags: ['dental', 'dentist', 'clinic'],
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: ['bathtub', 'shower', 'towel'],
      weakSubstitutes: [],
    },
  ];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function kebab(s) {
    return norm(s).replace(/\s+/g, '-') || 'topic';
  }

  function uniq(arr) {
    const out = [];
    const seen = new Set();
    for (const x of arr || []) {
      const k = norm(x);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(String(x).trim());
    }
    return out;
  }

  function stopWord(w) {
    return /^(the|and|about|with|for|our|my|a|an|of|in|to|on|at|from|into|after|before|over|under|next|near)$/.test(w);
  }

  function titleTokens(text) {
    return norm(text)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWord(w));
  }

  /** Strip common suffixes; also split occupation compounds (locksmith → lock). */
  function stemsFromToken(token) {
    const t = norm(token).replace(/-/g, '');
    if (!t || t.length < 3) return [];
    const out = [t];
    const m = OCCUPATION_TAIL_RE.exec(t);
    if (m) {
      const head = m[1] || m[2];
      if (head && head.length >= 3) out.push(head);
    }
    // light suffix peel for pack matching
    for (const suf of ['ing', 'ers', 'er', 'ors', 'or', 'ists', 'ist', 'ies', 'es', 's']) {
      if (t.length > suf.length + 3 && t.endsWith(suf)) {
        out.push(t.slice(0, -suf.length));
        break;
      }
    }
    return uniq(out);
  }

  function packIndexKeys() {
    if (Array.isArray(window.__TOPIC_PACK_KEYS__) && window.__TOPIC_PACK_KEYS__.length) {
      return window.__TOPIC_PACK_KEYS__;
    }
    const VI = window.VocabIcons;
    if (VI && typeof VI.allKeys === 'function') {
      const keys = VI.allKeys();
      if (keys && keys.length) return keys;
    }
    return null;
  }

  function isGenericEnv(word) {
    const n = norm(word);
    if (!n) return true;
    if (GENERIC_ENV_WORDS.includes(n)) return true;
    return false;
  }

  /** True when pack key honestly relates to a topic stem (not lock⊂clock). */
  function stemHitsKey(stem, key) {
    const s = norm(stem).replace(/\s+/g, '');
    const kn = norm(key).replace(/\s+/g, '-');
    if (!s || !kn) return false;
    if (kn === s || kn.replace(/-/g, '') === s) return true;
    const tokens = kn.split('-').filter(Boolean);
    if (!tokens.length) return false;

    // Single-token keys: equality / short prefix / longer prefix — never mid-token
    // (chest ⊂ orchestra used to poison pirate coreConcepts → music).
    if (tokens.length === 1) {
      const t = tokens[0];
      if (t === s) return true;
      if (s.length <= 4) return t.startsWith(s) && t.length <= s.length + 2;
      if (t.startsWith(s) || (s.startsWith(t) && t.length >= 4)) return true;
      return false;
    }

    // Multi-token keys: stem must match the head noun (last token) only —
    // first-token hitchhiking made "clean" pull "clean-tooth" into toy-box
    // cores → ProducerQuality rewrote the board into a dental lesson.
    const last = tokens[tokens.length - 1];
    if (last === s) return true;
    if (s.length >= 4 && (last === s + 's' || (s.endsWith('s') && last === s.slice(0, -1)))) {
      return true;
    }
    if (s.length <= 4) {
      return last.startsWith(s) && last.length <= s.length + 2;
    }
    if (last.startsWith(s) || (s.startsWith(last) && last.length >= 4)) return true;
    return false;
  }

  /** Pack-key fluff that must not count as topic identity (open/closed/color). */
  const PACK_STATE_TOKENS = new Set([
    'open', 'closed', 'empty', 'full', 'big', 'small', 'red', 'blue', 'green',
    'hot', 'cold', 'new', 'old', 'icon', 'prop', 'kit', 'gicon',
  ]);

  function packContentTokens(key) {
    return norm(key)
      .replace(/\s+/g, '-')
      .split('-')
      .filter((t) => t.length >= 3 && !PACK_STATE_TOKENS.has(t));
  }

  /**
   * Pack expansion gate — "clean" must not unlock clean-tooth / pipe-cleaner,
   * and "basketball" must not unlock bare "basket". Multi-token keys need ≥2
   * content-token hits; single-token peels of a longer title stem are refused
   * unless the title/lesson already says that exact word.
   */
  function packKeySupportedByStems(key, stems, titleBits, lessonWords) {
    const tokens = packContentTokens(key);
    if (!tokens.length) return false;
    const stemHit = (t) => stems.some((s) => s === t || stemHitsKey(s, t) || stemHitsKey(t, s));
    const mentioned = (t) => {
      const bits = (titleBits || []).map((b) => norm(b).replace(/\s+/g, '-'));
      const words = (lessonWords || []).map((w) => norm(w).replace(/\s+/g, '-'));
      return bits.includes(t) || words.includes(t);
    };
    if (tokens.length === 1) {
      const t = tokens[0];
      if (mentioned(t)) return true;
      // Peel guard: basket ⊂ basketball, ball ⊂ basketball, clean ⊂ cleaner…
      const onlyAsPeel = stems.some((s) => {
        if (s === t || s.length <= t.length + 1) return false;
        return s.startsWith(t) || stemHitsKey(s, t);
      });
      if (onlyAsPeel) return false;
      // Elongation guard: friend → friendship, play → player
      const elongatesStem = stems.some((s) => {
        if (s === t || t.length <= s.length + 1) return false;
        return t.startsWith(s) || stemHitsKey(s, t);
      });
      if (elongatesStem) return false;
      return stemHit(t);
    }
    let hits = 0;
    for (const t of tokens) {
      if (stemHit(t)) hits += 1;
    }
    return hits >= 2;
  }

  /**
   * Rank pack keys / lesson words by stem overlap with the requested topic.
   * General — no per-topic branches. Used when catalog misses.
   */
  function expandCoreConcepts(opts) {
    opts = opts || {};
    const titleBits = (opts.titleBits || []).slice();
    const lessonWords = (opts.lessonWords || []).filter(Boolean);
    const parents = (opts.parentCategories || []).map(norm);
    const topicLabel = String(opts.topicLabel || '');
    const stems = uniq(
      titleBits.flatMap(stemsFromToken).concat(stemsFromToken(opts.topicId || ''))
    ).filter((s) => s.length >= 3);

    const scored = new Map();
    function bump(word, pts, why) {
      const w = String(word || '').trim();
      if (!w) return;
      const n = norm(w).replace(/\s+/g, '-');
      if (!n || n.length < 2) return;
      if (parents.some((p) => p && (n === p || n === p + 's'))) {
        pts = Math.min(pts, 0.5);
      }
      if (isGenericEnv(n) || isGenericEnv(w)) pts -= 3;
      const prev = scored.get(n) || { word: w.replace(/-/g, ' '), score: 0, why: [] };
      prev.score += pts;
      if (why) prev.why.push(why);
      if (!prev.word.includes(' ') && w.includes(' ')) prev.word = w;
      if (w.length < prev.word.length && !/-/.test(w)) prev.word = w;
      scored.set(n, prev);
    }

    for (const t of titleBits) bump(t, 6, 'title');
    for (const s of stems) bump(s, 5, 'stem');

    for (const lw of lessonWords) {
      const ln = norm(lw);
      const hit = stems.some((s) => stemHitsKey(s, ln) || ln === s);
      bump(lw, hit ? 4 : 0.2, hit ? 'lesson-stem' : 'lesson-weak');
    }

    const keys = packIndexKeys();
    if (keys && keys.length && stems.length) {
      for (const key of keys) {
        if (!packKeySupportedByStems(key, stems, titleBits, lessonWords)) continue;
        let best = 0;
        for (const s of stems) {
          if (!stemHitsKey(s, key)) continue;
          best = Math.max(best, s.length >= 5 ? 5 : 3.5);
        }
        if (best > 0) bump(key.replace(/-/g, ' '), best, 'pack');
      }
    }

    const ranked = [...scored.values()].sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    const core = [];
    const supporting = [];
    const weak = [];
    for (const row of ranked) {
      if (row.score < 1.5) {
        if (row.score > 0 && isGenericEnv(row.word)) weak.push(row.word);
        continue;
      }
      if (isGenericEnv(row.word) && !stems.includes(norm(row.word))) {
        weak.push(row.word);
        continue;
      }
      // Drop ultra-short stem peels ("hot" from photo, "cent" from center)
      if (norm(row.word).length < 4 && !titleBits.some((t) => norm(t) === norm(row.word))) {
        continue;
      }
      if (core.length < 8) core.push(row.word);
      else if (supporting.length < 10) supporting.push(row.word);
    }

    if (topicLabel && !core.some((c) => norm(c).includes(norm(topicLabel).split(/\s+/)[0]))) {
      const head = titleBits[0] || topicLabel;
      if (head) core.unshift(head);
    }

    return {
      core: padCore(uniq(core).slice(0, 8), titleBits),
      supporting: uniq(supporting.concat(lessonWords.filter((w) => !core.some((c) => norm(c) === norm(w))))),
      weak: uniq(weak.concat(GENERIC_ENV_WORDS.slice(0, 8))),
    };
  }

  /** True when title is more specific than the resolved parent theme. */
  function isNicheOverParent(topicLabel, topicId, parents) {
    if (!parents || !parents.length) return false;
    const blob = norm(topicLabel + ' ' + topicId);
    return parents.every((p) => {
      const pn = norm(p);
      if (!pn) return true;
      return blob !== pn && !blob.includes(pn);
    });
  }

  function lessonBlob(lesson) {
    if (!lesson) return '';
    const words = (lesson.vocabulary || []).map((v) => (typeof v === 'string' ? v : v && v.word));
    return [
      lesson.title,
      lesson.activity && lesson.activity.title,
      lesson.activity && lesson.activity.prompt,
      ...(words || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  function padCore(list, fallback) {
    const out = uniq(list).slice(0, 8);
    for (const f of fallback || []) {
      if (out.length >= 6) break;
      if (!out.some((x) => norm(x) === norm(f))) out.push(f);
    }
    // Never pad with duplicates — duplicated cores poison vocab quality.
    return out.slice(0, 8);
  }

  function emptyCues() {
    return {
      preferSets: [],
      preferTags: [],
      avoidSets: [],
      parentAvoidAsPrimary: [],
      allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
    };
  }

  function normalizeBrief(raw) {
    const b = raw && typeof raw === 'object' ? raw : {};
    const cues = Object.assign(emptyCues(), b.backgroundCues || {});
    if (!Array.isArray(cues.allowSecondaryOn) || !cues.allowSecondaryOn.length) {
      cues.allowSecondaryOn = DEFAULT_ALLOW_SECONDARY.slice();
    }
    const topicId = kebab(b.topicId || b.specificTopicIdentity || b.topicLabel || 'topic');
    const topicLabel = String(b.topicLabel || b.specificTopicIdentity || b.topicId || 'topic');
    const parentCategories = uniq(b.parentCategories || b.broaderContext || []);
    const forbidden = uniq(
      (b.forbiddenSubstitutes || []).concat(b.likelyConfusions || [])
    );
    return {
      topicId,
      topicLabel,
      // Spec aliases (same data — keep both for validators / generate schema)
      requestedTopic: String(b.requestedTopic || b.topicLabel || topicLabel),
      specificTopicIdentity: String(b.specificTopicIdentity || topicLabel),
      broaderContext: parentCategories.slice(),
      parentCategories,
      coreConcepts: padCore(b.coreConcepts || [], b.supportingConcepts),
      supportingConcepts: uniq(b.supportingConcepts || []),
      primaryMotifs: uniq(b.primaryMotifs || b.primaryVisualMotifs || b.coreConcepts || []),
      secondaryMotifs: uniq(b.secondaryMotifs || b.secondaryVisualMotifs || []),
      primaryVisualMotifs: uniq(b.primaryVisualMotifs || b.primaryMotifs || b.coreConcepts || []),
      secondaryVisualMotifs: uniq(b.secondaryVisualMotifs || b.secondaryMotifs || []),
      preferredPalette: uniq(b.preferredPalette || ['neutral']),
      backgroundCues: {
        preferSets: uniq(cues.preferSets || []),
        preferTags: uniq(cues.preferTags || []),
        avoidSets: uniq(cues.avoidSets || []),
        parentAvoidAsPrimary: uniq(cues.parentAvoidAsPrimary || []),
        allowSecondaryOn: uniq(cues.allowSecondaryOn).map((t) => String(t).toLowerCase()),
      },
      forbiddenSubstitutes: forbidden,
      likelyConfusions: forbidden.slice(),
      weakSubstitutes: uniq(b.weakSubstitutes || []),
      source: b.source || 'unknown',
    };
  }

  function validateBriefShape(brief) {
    if (!brief || typeof brief !== 'object') return false;
    if (!brief.topicId || !Array.isArray(brief.coreConcepts)) return false;
    // Prefer 6, accept ≥4 unique after expansion (no duplicate padding).
    if (uniq(brief.coreConcepts).length < 4) return false;
    return true;
  }

  function fromCatalog(row, lesson) {
    const words = (lesson.vocabulary || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
    return normalizeBrief({
      ...row,
      coreConcepts: padCore(row.coreConcepts, words.concat(row.supportingConcepts || [])),
      supportingConcepts: uniq((row.supportingConcepts || []).concat(words)),
      source: 'catalog',
    });
  }

  function fromFallback(lesson) {
    const blob = lessonBlob(lesson);
    const words = (lesson.vocabulary || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
    const titleBits = titleTokens(lesson && lesson.title);
    const topicLabel = titleBits.slice(0, 4).join(' ') || words[0] || 'topic';
    const topicId = kebab(topicLabel);

    let parentCategories = [];
    let preferSets = [];
    const LT = window.LessonTraits;
    if (LT && typeof LT.resolveTheme === 'function') {
      const theme = LT.resolveTheme(lesson);
      if (theme && theme.id && theme.id !== 'none') parentCategories.push(theme.id);
      if (theme && theme.packs) parentCategories = uniq(parentCategories.concat(theme.packs));
    }
    const SB = window.SceneBackgrounds;
    if (SB && typeof SB.setFor === 'function') {
      const setId = SB.setFor(blob);
      if (setId) preferSets = [setId];
    }

    const expanded = expandCoreConcepts({
      topicId,
      topicLabel,
      titleBits,
      lessonWords: words,
      parentCategories,
    });

    const niche = isNicheOverParent(topicLabel, topicId, parentCategories);
    const secondaryMotifs = niche ? parentCategories.slice(0, 3) : [];
    // When niche-over-parent, parent labels are weak substitutes (not core).
    const weak = uniq(
      expanded.weak.concat(niche ? parentCategories : [])
    );

    return normalizeBrief({
      topicId,
      topicLabel,
      requestedTopic: topicLabel,
      specificTopicIdentity: topicLabel,
      parentCategories,
      broaderContext: parentCategories.slice(),
      coreConcepts: expanded.core,
      supportingConcepts: expanded.supporting,
      primaryMotifs: expanded.core.slice(0, 4),
      secondaryMotifs,
      preferredPalette: ['neutral'],
      backgroundCues: {
        preferSets,
        preferTags: titleBits.slice(0, 4),
        avoidSets: [],
        allowSecondaryOn: DEFAULT_ALLOW_SECONDARY.slice(),
      },
      forbiddenSubstitutes: [],
      weakSubstitutes: weak,
      source: 'fallback',
    });
  }

  /**
   * Build or adopt a TopicBrief. Prefer lesson.topicBrief when valid; always
   * merge catalog forbidden lists when a catalog row matches.
   */
  function buildBrief(lesson) {
    const blob = lessonBlob(lesson);
    let catalogRow = null;
    for (const row of CATALOG) {
      if (row.match.test(blob)) {
        catalogRow = row;
        break;
      }
    }

    let brief;
    if (lesson && lesson.topicBrief && validateBriefShape(lesson.topicBrief)) {
      brief = normalizeBrief(Object.assign({}, lesson.topicBrief, { source: 'lesson' }));
      if (catalogRow) {
        brief.forbiddenSubstitutes = uniq(
          brief.forbiddenSubstitutes.concat(catalogRow.forbiddenSubstitutes || [])
        );
        brief.weakSubstitutes = uniq(
          brief.weakSubstitutes.concat(catalogRow.weakSubstitutes || [])
        );
        brief.parentCategories = uniq(
          brief.parentCategories.concat(catalogRow.parentCategories || [])
        );
        if (!brief.backgroundCues.preferSets.length && catalogRow.backgroundCues) {
          brief.backgroundCues.preferSets = uniq(catalogRow.backgroundCues.preferSets || []);
        }
        if (!brief.backgroundCues.avoidSets.length && catalogRow.backgroundCues) {
          brief.backgroundCues.avoidSets = uniq(catalogRow.backgroundCues.avoidSets || []);
        }
      }
    } else if (catalogRow) {
      brief = fromCatalog(catalogRow, lesson);
    } else {
      brief = fromFallback(lesson);
    }

    if (lesson) lesson._topicBrief = brief;
    return brief;
  }

  function ensureBrief(lesson) {
    if (lesson && lesson._topicBrief && validateBriefShape(lesson._topicBrief)) {
      return lesson._topicBrief;
    }
    return buildBrief(lesson);
  }

  function haystack(opts) {
    const parts = [
      opts.key,
      opts.word,
      opts.set,
      opts.scene,
      ...(opts.tags || []),
      ...(opts.packs || []),
    ];
    return norm(parts.filter(Boolean).join(' '));
  }

  function listHit(list, hay) {
    if (!list || !list.length || !hay) return null;
    const hayN = norm(hay);
    const hayCompact = hayN.replace(/\s+/g, '');
    const hayTokens = hayN.split(/[\s-]+/).filter(Boolean);
    if (hayCompact && !hayTokens.includes(hayCompact)) hayTokens.push(hayCompact);
    for (const item of list) {
      const n = norm(item);
      if (!n) continue;
      if (hayN === n) return item;
      const compact = n.replace(/\s+/g, '');
      // Token equality always counts (farm-barn ↔ barn).
      if (hayTokens.some((t) => t === n || t === compact)) return item;
      // Substring: only when the LIST item appears inside the asset hay
      // (ban "barn" hits "farm barn"). Never the reverse — "clock".includes("lock")
      // would falsely ban the word lock.
      if (n.length >= 3 && (hayN.includes(n) || (compact.length >= 3 && hayCompact.includes(compact)))) {
        return item;
      }
    }
    return null;
  }

  function pageAllowsSecondary(brief, pageTags) {
    const allow = (brief.backgroundCues && brief.backgroundCues.allowSecondaryOn) || DEFAULT_ALLOW_SECONDARY;
    const tags = (pageTags || []).map((t) => String(t).toLowerCase());
    if (!tags.length) return false;
    for (const t of tags) {
      if (allow.includes(t)) return true;
      if (/^story/.test(t) && allow.some((a) => a === 'story')) return true;
    }
    return false;
  }

  /**
   * Score one asset/word against the brief.
   * @returns {{ ok: boolean, role: string, reasons: string[] }}
   */
  function scoreAsset(brief, opts) {
    opts = opts || {};
    const b = brief || normalizeBrief({});
    const hay = haystack(opts);
    const reasons = [];
    const allowSec = pageAllowsSecondary(b, opts.pageTags);

    const forbidden = listHit(b.forbiddenSubstitutes, hay);
    if (forbidden) {
      // Secondary env pages may show parent scenery, not forbidden hero substitutes
      // unless the hit is clearly a primary identity prop key.
      if (!allowSec || opts.kind === 'prop' || opts.kind === 'charm' || opts.kind === 'vocab') {
        return {
          ok: false,
          role: 'forbidden',
          reasons: [`forbidden substitute “${forbidden}” for topic ${b.topicId}`],
        };
      }
    }

    const primary =
      listHit(b.coreConcepts, hay)
      || listHit(b.primaryMotifs, hay)
      || listHit([b.topicId, b.topicLabel], hay);
    if (primary) {
      return { ok: true, role: 'primary', reasons: [`primary “${primary}”`] };
    }

    const supporting = listHit(b.supportingConcepts, hay);
    if (supporting) {
      return { ok: true, role: 'primary', reasons: [`supporting “${supporting}”`] };
    }

    // Parent pack alone is secondary only when the brief has false-friends
    // (beekeeping→farm). Passthrough / fallback themes where parent === working
    // identity must stay neutral so PropBank kits keep their docks.
    const secondaryMotif = listHit(b.secondaryMotifs, hay);
    const parentHit = listHit(b.parentCategories, hay);
    const nicheOverParent = (b.forbiddenSubstitutes || []).length > 0;
    const secondary = secondaryMotif || (nicheOverParent ? parentHit : null);
    if (secondary) {
      if (allowSec) {
        return {
          ok: true,
          role: 'secondary',
          reasons: [`secondary/parent “${secondary}” allowed on this page`],
        };
      }
      return {
        ok: false,
        role: 'secondary',
        reasons: [
          `secondary/parent “${secondary}” must not overpower primary topic ${b.topicId}`,
        ],
      };
    }

    const weak = listHit(b.weakSubstitutes, hay);
    if (weak) {
      return {
        ok: true,
        role: 'weak',
        reasons: [`weak substitute “${weak}”`],
      };
    }

    // BG set checks
    if (opts.set) {
      const prefer = (b.backgroundCues.preferSets || []).map(norm);
      const avoid = (b.backgroundCues.avoidSets || []).map(norm);
      const setN = norm(opts.set);
      if (prefer.includes(setN)) {
        return { ok: true, role: 'primary', reasons: [`prefer set ${opts.set}`] };
      }
      if (avoid.includes(setN) && !allowSec) {
        return {
          ok: false,
          role: 'forbidden',
          reasons: [`avoid set ${opts.set} for ${b.topicId}`],
        };
      }
      if (
        (b.backgroundCues.parentAvoidAsPrimary || []).map(norm).includes(setN)
        && !allowSec
      ) {
        return {
          ok: false,
          role: 'secondary',
          reasons: [`parent set ${opts.set} is env-only for ${b.topicId}`],
        };
      }
    }

    return { ok: true, role: 'neutral', reasons };
  }

  /**
   * Audit identity-bearing visuals on one page.
   * visuals: [{ kind, key, tags, packs, word, set, scene }]
   */
  function auditPage(brief, visuals, pageTags) {
    const list = Array.isArray(visuals) ? visuals : [];
    if (!list.length) {
      return {
        drift: false,
        primaryShare: 1,
        secondaryShare: 0,
        parentOnlyShare: 0,
        roles: [],
      };
    }
    const roles = [];
    let primary = 0;
    let secondary = 0;
    let parentOnly = 0;
    let forbidden = 0;
    let weak = 0;
    let neutral = 0;
    for (const v of list) {
      const scored = scoreAsset(brief, Object.assign({}, v, { pageTags: pageTags || v.pageTags }));
      roles.push(scored.role);
      if (scored.role === 'primary') primary++;
      else if (scored.role === 'secondary') {
        secondary++;
        parentOnly++;
      } else if (scored.role === 'forbidden') {
        forbidden++;
        parentOnly++;
      } else if (scored.role === 'weak') weak++;
      else neutral++;
    }
    const n = list.length;
    const primaryShare = primary / n;
    const secondaryShare = secondary / n;
    const parentOnlyShare = parentOnly / n;
    const allowSec = pageAllowsSecondary(brief, pageTags);
    // Drift: majority parent/secondary on pages that must stay primary-led.
    // allowSecondaryOn pages may lean env; still drift when primary share ≈ 0
    // and identity assets are mostly forbidden (not merely neutral).
    let drift = false;
    if (forbidden > 0 && !allowSec) drift = true;
    if (!allowSec && parentOnlyShare > 0.5 && primaryShare < 0.5) drift = true;
    if (!allowSec && primaryShare === 0 && (secondary + forbidden + weak) / n > 0.5) drift = true;
    if (allowSec && primaryShare === 0 && forbidden / n > 0.5) drift = true;

    return {
      drift,
      primaryShare,
      secondaryShare,
      parentOnlyShare,
      roles,
      code: drift ? 'TOPIC_DRIFT' : undefined,
      message: drift
        ? `TOPIC_DRIFT: page identity leans on parent/secondary (${(parentOnlyShare * 100).toFixed(0)}%) not ${brief.topicId}`
        : undefined,
    };
  }

  /** Prefer preferSets[0] when catalog/brief has one; else null. */
  function preferredBgSet(brief) {
    const sets = brief && brief.backgroundCues && brief.backgroundCues.preferSets;
    return sets && sets.length ? sets[0] : null;
  }

  function isForbiddenWord(brief, word) {
    const scored = scoreAsset(brief, { kind: 'vocab', word: word });
    return scored.role === 'forbidden';
  }

  function conceptBoost(brief, word) {
    const scored = scoreAsset(brief, { kind: 'vocab', word: word });
    if (scored.role === 'primary') return 3;
    if (scored.role === 'weak') return -1;
    if (scored.role === 'secondary' || scored.role === 'forbidden') return -5;
    return 0;
  }

  window.TopicIdentity = {
    CATALOG,
    DEFAULT_ALLOW_SECONDARY,
    GENERIC_ENV_WORDS,
    buildBrief,
    ensureBrief,
    normalizeBrief,
    validateBriefShape,
    scoreAsset,
    auditPage,
    preferredBgSet,
    isForbiddenWord,
    conceptBoost,
    pageAllowsSecondary,
    lessonBlob,
    expandCoreConcepts,
    isNicheOverParent,
    titleTokens,
    stemsFromToken,
  };
})();
