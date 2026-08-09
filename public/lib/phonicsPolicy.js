/**
 * phonicsPolicy.js — CEFR-gated sound-box rules (producer source of truth).
 * UMD: browser → window.PhonicsPolicy; Node → module.exports.
 *
 * Matrix (ESL / ClassIn live beat):
 *   A1  CVC only, 3 boxes, 1–2 distractors, vocab-first
 *   A2  + blends + sh/ch/th/ck, 3–4 boxes, 2–3 distractors
 *   B1  + vowel teams / magic-e / simple 2-syllable, 4–5 boxes, 3–4 distractors
 *   B2  optional (multisyllabic / r-controlled) — still allowed when forced on
 *   C1+ omit unless meta.phonics=on
 *
 * Split correctness (required digraphs/teams, magic-e) is checked before
 * word-eligibility (minBoxes/maxBoxes) so a correct 2-box split is never
 * rejected in favour of an illegal over-split that merely hits minBoxes.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PhonicsPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LEVEL_RULES = {
    A1: {
      minBoxes: 3,
      maxBoxes: 3,
      maxDistractors: 2,
      minDistractors: 1,
      maxWords: 2,
      minWords: 2,
      allowDigraphs: false,
      allowBlends: false,
      allowVowelTeams: false,
      allowMagicE: false,
      allowMultisyllable: false,
      scriptHint: 'Say each letter SOUND (not the letter name), then blend.',
    },
    A2: {
      minBoxes: 3,
      maxBoxes: 4,
      maxDistractors: 3,
      minDistractors: 2,
      maxWords: 3,
      minWords: 2,
      allowDigraphs: true, // sh ch th ck
      allowBlends: true, // CCVC / CVCC as single letters still
      allowVowelTeams: false,
      allowMagicE: false,
      allowMultisyllable: false,
      scriptHint: 'Say each sound, then blend the whole word.',
    },
    B1: {
      minBoxes: 3,
      maxBoxes: 5,
      maxDistractors: 4,
      minDistractors: 3,
      maxWords: 3,
      minWords: 2,
      allowDigraphs: true,
      allowBlends: true,
      allowVowelTeams: true,
      allowMagicE: true,
      allowMultisyllable: true, // simple 2-syllable only (≤2 vowel nuclei)
      scriptHint: 'Say each sound, then blend. Watch for two letters that make one sound.',
    },
    B2: {
      minBoxes: 4,
      maxBoxes: 6,
      maxDistractors: 5,
      minDistractors: 3,
      maxWords: 3,
      minWords: 2,
      allowDigraphs: true,
      allowBlends: true,
      allowVowelTeams: true,
      allowMagicE: true,
      allowMultisyllable: true,
      scriptHint: 'Chunk by sounds or syllables, then blend.',
    },
  };

  /** Multigraphs that must stay in one box when the level permits them. Longest first. */
  const REQUIRED_DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ng', 'qu', 'wh', 'ph'];
  const REQUIRED_VOWEL_TEAMS = [
    'igh', 'ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'oo', 'ou', 'oi', 'oy', 'ie', 'ue', 'ew',
  ];

  const CORE_DIGRAPHS = new Set(REQUIRED_DIGRAPHS);
  const VOWEL_TEAMS = new Set(REQUIRED_VOWEL_TEAMS);
  const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

  /**
   * Irregular sight words — never a decoding target (promptBlock already asks this in prose).
   * Fixes the PH2 "the → t|h|e" path that otherwise looks like legal A1 CVC.
   */
  const IRREGULAR_DENYLIST = new Set([
    'the', 'said', 'one', 'two', 'come', 'some', 'was', 'are', 'were', 'they',
    'you', 'your', 'who', 'of', 'do', 'to', 'there', 'where', 'been', 'done',
    'love', 'give', 'once',
  ]);

  /** Small decodable bank when lesson vocab is irregular for the level. */
  const FALLBACK_BANK = {
    A1: [
      { word: 'cat', graphemes: ['c', 'a', 't'], emoji: '🐱' },
      { word: 'dog', graphemes: ['d', 'o', 'g'], emoji: '🐶' },
      { word: 'sun', graphemes: ['s', 'u', 'n'], emoji: '☀️' },
      { word: 'bed', graphemes: ['b', 'e', 'd'], emoji: '🛏️' },
      { word: 'big', graphemes: ['b', 'i', 'g'], emoji: '🐘' },
      { word: 'map', graphemes: ['m', 'a', 'p'], emoji: '🗺️' },
      { word: 'pen', graphemes: ['p', 'e', 'n'], emoji: '🖊️' },
      { word: 'red', graphemes: ['r', 'e', 'd'], emoji: '🔴' },
    ],
    A2: [
      { word: 'fish', graphemes: ['f', 'i', 'sh'], emoji: '🐟' },
      { word: 'ship', graphemes: ['sh', 'i', 'p'], emoji: '🚢' },
      { word: 'duck', graphemes: ['d', 'u', 'ck'], emoji: '🦆' },
      { word: 'frog', graphemes: ['f', 'r', 'o', 'g'], emoji: '🐸' },
      { word: 'jump', graphemes: ['j', 'u', 'm', 'p'], emoji: '🦘' },
      { word: 'best', graphemes: ['b', 'e', 's', 't'], emoji: '⭐' },
      { word: 'thin', graphemes: ['th', 'i', 'n'], emoji: '➖' },
      { word: 'chat', graphemes: ['ch', 'a', 't'], emoji: '💬' },
    ],
    B1: [
      { word: 'rain', graphemes: ['r', 'ai', 'n'], emoji: '🌧️' },
      { word: 'boat', graphemes: ['b', 'oa', 't'], emoji: '⛵' },
      { word: 'night', graphemes: ['n', 'igh', 't'], emoji: '🌙' },
      { word: 'cake', graphemes: ['c', 'a', 'ke'], emoji: '🎂' },
      { word: 'tree', graphemes: ['t', 'r', 'ee'], emoji: '🌳' },
      { word: 'home', graphemes: ['h', 'o', 'me'], emoji: '🏠' },
    ],
    B2: [
      { word: 'garden', graphemes: ['g', 'ar', 'd', 'en'], emoji: '🌻' },
      { word: 'doctor', graphemes: ['d', 'o', 'c', 't', 'or'], emoji: '👨‍⚕️' },
      { word: 'sunset', graphemes: ['s', 'u', 'n', 's', 'et'], emoji: '🌇' },
    ],
  };

  function rulesFor(level) {
    const key = String(level || 'A1').toUpperCase();
    return LEVEL_RULES[key] || LEVEL_RULES.A1;
  }

  function cleanWord(word) {
    return String(word || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  function cleanGraphemes(graphemes) {
    return (graphemes || [])
      .map((x) => String(x || '').trim().toLowerCase())
      .filter(Boolean);
  }

  function syllableHint(word) {
    const w = String(word || '').toLowerCase();
    let n = 0;
    let prevV = false;
    for (const ch of w) {
      const v = VOWELS.has(ch);
      if (v && !prevV) n += 1;
      prevV = v;
    }
    return n || 1;
  }

  function graphemeKind(g) {
    const x = String(g || '').toLowerCase();
    if (CORE_DIGRAPHS.has(x)) return 'digraph';
    if (VOWEL_TEAMS.has(x)) return 'vowelTeam';
    if (/^[a-z]e$/.test(x) && x.length === 2) return 'magicE'; // a_e style stored as "ke" etc.
    if (x.length === 1) return 'letter';
    if (x.length >= 2) return 'cluster';
    return 'other';
  }

  /** Required multigraphs for this level, longest-match first (igh before ie). */
  function requiredMultigraphs(rules) {
    const list = [];
    if (rules.allowDigraphs) list.push(...REQUIRED_DIGRAPHS);
    if (rules.allowVowelTeams) list.push(...REQUIRED_VOWEL_TEAMS);
    return list.slice().sort((a, b) => b.length - a.length);
  }

  /**
   * True when a level-permitted multigraph in the word is split across box boundaries.
   * Walks the word left-to-right with longest-match; does not invent under-splits.
   */
  function breaksRequiredMultigraph(word, graphemes, rules) {
    const w = cleanWord(word);
    const g = cleanGraphemes(graphemes);
    if (!w || !g.length) return false;

    const spans = [];
    let offset = 0;
    for (const part of g) {
      spans.push({ start: offset, end: offset + part.length });
      offset += part.length;
    }
    if (offset !== w.length) return false;

    function boxIndexAt(charIndex) {
      for (let i = 0; i < spans.length; i += 1) {
        if (charIndex >= spans[i].start && charIndex < spans[i].end) return i;
      }
      return -1;
    }

    const required = requiredMultigraphs(rules);
    let i = 0;
    while (i < w.length) {
      let matched = null;
      for (const m of required) {
        if (w.startsWith(m, i)) {
          matched = m;
          break;
        }
      }
      if (!matched) {
        i += 1;
        continue;
      }
      const start = i;
      const end = i + matched.length;
      const boxStart = boxIndexAt(start);
      const boxEnd = boxIndexAt(end - 1);
      if (boxStart < 0 || boxEnd < 0 || boxStart !== boxEnd) return true;
      i = end;
    }
    return false;
  }

  /**
   * Magic-e: when the level allows it, a VCe word must not put terminal silent e
   * in its own sound box (cake → c|a|k|e is wrong; c|a|ke is right).
   */
  function breaksMagicE(word, graphemes, rules) {
    if (!rules.allowMagicE) return false;
    const w = cleanWord(word);
    const g = cleanGraphemes(graphemes);
    if (g.length < 2) return false;
    // Classic silent-e shape: ... vowel + consonant + e
    if (!/[aeiou][^aeiou]e$/.test(w)) return false;
    return g[g.length - 1] === 'e';
  }

  /**
   * Structural split check — correctness only (no minBoxes/maxBoxes).
   * A 2-box shy→[sh,y] returns true here; page eligibility is separate.
   */
  function isSplitWellFormed(word, graphemes, level) {
    const rules = rulesFor(level);
    const g = cleanGraphemes(graphemes);
    const w = cleanWord(word);
    if (!w || !g.length) return false;
    if (IRREGULAR_DENYLIST.has(w)) return false;

    const joined = g.join('');
    if (joined !== w) return false;

    const syllables = syllableHint(w);
    if (!rules.allowMultisyllable && syllables > 1) return false;
    if (rules.allowMultisyllable && syllables > 2 && String(level).toUpperCase() === 'B1') return false;

    for (const part of g) {
      const kind = graphemeKind(part);
      if (kind === 'digraph' && !rules.allowDigraphs) return false;
      if (kind === 'vowelTeam' && !rules.allowVowelTeams) return false;
      if (kind === 'magicE' && !rules.allowMagicE) return false;
      if (kind === 'cluster' && part.length > 1) {
        // multi-letter that's not digraph/team — treat as blend chunk; A1 forbids
        // (PH4 will reject clusters at every level; kept permissive here for now.)
        if (!rules.allowDigraphs && !rules.allowBlends && !rules.allowVowelTeams) return false;
      }
      if (part.length > 3) return false;
    }

    // A1: every grapheme must be a single letter
    if (!rules.allowDigraphs && !rules.allowVowelTeams && !rules.allowMagicE) {
      if (g.some((x) => x.length !== 1)) return false;
    }

    if (breaksRequiredMultigraph(w, g, rules)) return false;
    if (breaksMagicE(w, g, rules)) return false;

    return true;
  }

  /**
   * Word rich enough for a sound-box page at this level (box-count gate).
   * Applied only after the split is well-formed — never used to prefer a wrong split.
   */
  function wordEligibleForLevel(word, graphemes, level) {
    const rules = rulesFor(level);
    const g = cleanGraphemes(graphemes);
    if (!g.length) return false;
    if (g.length < rules.minBoxes || g.length > rules.maxBoxes) return false;
    return true;
  }

  /**
   * Validate grapheme split for a CEFR level. Returns false if the word/split
   * should not appear on a sound-box page at that level.
   *
   * Order: denylist / well-formed split first, then minBoxes–maxBoxes eligibility.
   */
  function acceptsGraphemes(word, graphemes, level) {
    if (!isSplitWellFormed(word, graphemes, level)) return false;
    if (!wordEligibleForLevel(word, graphemes, level)) return false;
    return true;
  }

  function scoreWordForLevel(entry, level, vocabSet) {
    const rules = rulesFor(level);
    if (!acceptsGraphemes(entry.word, entry.graphemes, level)) return -1;
    let score = 10;
    if (vocabSet.has(entry.word)) score += 50; // known-vocab-first
    // Prefer easier (fewer boxes) as focus — caller sorts descending
    score += (rules.maxBoxes - entry.graphemes.length) * 2;
    return score;
  }

  function vocabSetFromLesson(lesson) {
    const set = new Set();
    for (const v of (lesson && lesson.vocabulary) || []) {
      const w = String(typeof v === 'string' ? v : (v && v.word) || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '');
      if (w) set.add(w);
    }
    return set;
  }

  /**
   * Normalize lesson.phonics for boards. Pass meta.level for CEFR gating.
   * When Gemini words fail the gate, fall back to the level bank (still
   * prefer any bank word that overlaps lesson vocab).
   */
  function normalize(lesson, meta) {
    const level = String((meta && meta.level) || 'A1').toUpperCase();
    if (level === 'C1' || level === 'C2') {
      if (!(meta && (meta.phonics === true || meta.phonics === 'on'))) return null;
    }
    const rules = rulesFor(level);
    const raw = lesson && lesson.phonics;
    const vocabSet = vocabSetFromLesson(lesson);
    const candidates = [];

    if (raw && typeof raw === 'object') {
      const rows = raw.targetWords || raw.target_words || [];
      for (const row of rows) {
        if (!row) continue;
        const word = String(row.word || '').trim().toLowerCase();
        const graphemes = (row.graphemes || []).map((g) => String(g || '').trim().toLowerCase()).filter(Boolean);
        if (!acceptsGraphemes(word, graphemes, level)) continue;
        candidates.push({
          word,
          graphemes,
          boxCount: graphemes.length,
          emoji: row.emoji || '🔤',
          topicRelevance: row.topicRelevance || row.topic_relevance || '',
          source: vocabSet.has(word) ? 'vocab' : 'gemini',
        });
      }
    }

    // Fill from fallback bank if Gemini under-delivered after gating
    const bank = FALLBACK_BANK[level] || FALLBACK_BANK.A1;
    for (const row of bank) {
      if (candidates.some((c) => c.word === row.word)) continue;
      if (!acceptsGraphemes(row.word, row.graphemes, level)) continue;
      candidates.push({
        word: row.word,
        graphemes: row.graphemes.slice(),
        boxCount: row.graphemes.length,
        emoji: row.emoji || '🔤',
        topicRelevance: 'Decodable practice word',
        source: vocabSet.has(row.word) ? 'vocab-bank' : 'bank',
      });
    }

    candidates.sort((a, b) => scoreWordForLevel(b, level, vocabSet) - scoreWordForLevel(a, level, vocabSet));
    // Prefer at least one vocab-sourced word in the set when available
    const vocabHits = candidates.filter((c) => c.source === 'vocab' || c.source === 'vocab-bank');
    const hadGeminiRows = !!(raw && typeof raw === 'object'
      && ((raw.targetWords || raw.target_words || []).length > 0));
    const forcedOn = !!(meta && (meta.phonics === true || meta.phonics === 'on'));
    // A1 auto-want used to pad every lesson with cat/dog from the bank — bathroom
    // routines then taught "cat" on a shower/soap board (quality loop honesty).
    // Only inject pure bank fillers when Gemini shipped rows or phonics is forced.
    if (!vocabHits.length && !hadGeminiRows && !forcedOn) return null;

    let words = [];
    if (vocabHits.length) {
      words.push(vocabHits[0]);
      for (const c of candidates) {
        if (words.length >= rules.maxWords) break;
        if (words.some((w) => w.word === c.word)) continue;
        words.push(c);
      }
    } else {
      words = candidates.slice(0, rules.maxWords);
    }

    words = words.slice(0, rules.maxWords);
    if (words.length < Math.min(rules.minWords, 2)) return null;

    // Focus = easiest among selected (fewest boxes, then vocab)
    words.sort((a, b) => {
      if (a.graphemes.length !== b.graphemes.length) return a.graphemes.length - b.graphemes.length;
      const av = vocabSet.has(a.word) ? 1 : 0;
      const bv = vocabSet.has(b.word) ? 1 : 0;
      return bv - av;
    });

    const used = new Set(words.flatMap((w) => w.graphemes));
    let distractors = [];
    if (raw && typeof raw === 'object') {
      distractors = (raw.distractors || raw.distractor_letters || [])
        .map((d) => String(d || '').trim().toLowerCase())
        .filter((d) => d && d.length <= 2 && !used.has(d));
    }
    // Pad single-letter distractors from alphabet
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    for (const ch of alphabet) {
      if (distractors.length >= rules.maxDistractors) break;
      if (!used.has(ch) && !distractors.includes(ch)) distractors.push(ch);
    }
    distractors = [...new Set(distractors)].slice(0, rules.maxDistractors);

    const focusCount = words[0].graphemes.length;
    const dockCap = Math.max(0, 10 - focusCount);
    distractors = distractors.slice(0, Math.min(rules.maxDistractors, dockCap));

    const script = (raw && (raw.teacherScript || raw.teacher_script)) || {};
    // Modeling line MUST name the focus word's graphemes. Gemini often ships a
    // stale "c, then a, then t" while focusIndex points at map/pen after sort —
    // kids see tiles for map and hear instructions for cat (PH1/PH2 honesty).
    const focusGraphemes = (words[0] && words[0].graphemes) || [];
    const focusModel = focusGraphemes.length
      ? `Watch me drag ${focusGraphemes.join(', then ')} into the boxes.`
      : 'Watch me drag each sound into a box.';
    return {
      level,
      rules: {
        minBoxes: rules.minBoxes,
        maxBoxes: rules.maxBoxes,
        maxDistractors: rules.maxDistractors,
      },
      targetWords: words.map((w) => ({
        word: w.word,
        graphemes: w.graphemes,
        boxCount: w.graphemes.length,
        emoji: w.emoji,
        topicRelevance: w.topicRelevance,
        source: w.source,
      })),
      distractors,
      focusIndex: 0,
      teacherScript: {
        warmup: script.warmup || rules.scriptHint,
        modeling: focusModel,
        check: script.check || 'Say the sounds, then say the whole word.',
      },
    };
  }

  /** Gemini prompt fragment for a CEFR level. */
  function promptBlock(level, wantPhonics) {
    if (!wantPhonics) {
      return `
Do NOT include a phonics object (omit it). This lesson level/topic does not need a phonics page.`;
    }
    const key = String(level || 'A1').toUpperCase();
    const rules = rulesFor(key);
    const byLevel = {
      A1: `A1 ONLY: CVC words with SINGLE-LETTER graphemes (exactly 3 boxes: c-a-t). Refuse digraphs, blends as chunks, vowel teams, magic-e, multisyllabic words.`,
      A2: `A2: CVC, CCVC/CVCC (one letter per box), and core digraphs sh/ch/th/ck as ONE grapheme each. 3–4 boxes. Refuse vowel teams and magic-e.`,
      B1: `B1: allow vowel teams (ai/ee/oa/igh) and magic-e (cake → c,a,ke). 3–5 boxes. Simple 2-syllable words OK if decodable.`,
      B2: `B2: multisyllabic / r-controlled OK. 4–6 boxes. Still refuse fully irregular sight words on this page.`,
    };
    return `
Also generate phonics for a ClassIn sound-boxes page (teacher-led; teach letter SOUNDS not names):
- phonics.targetWords: EXACTLY ${rules.minWords} or ${rules.maxWords} words.
- KNOWN-VOCABULARY-FIRST: prefer phonetically regular words drawn FROM the lesson vocabulary (same spelling). If vocab is irregular (castle, knight, could), use a separate decodable practice word that fits the topic — never put an unteachable irregular on the decoding page.
- Put the easiest legal word FIRST (focus word for the large boxes).
- Each target word needs: word, graphemes (ONE grapheme per sound box), topicRelevance, optional emoji.
- graphemes length must be ${rules.minBoxes}–${rules.maxBoxes}; box count = graphemes.length.
- phonics.distractors: ${rules.minDistractors}–${rules.maxDistractors} single letters (or one digraph at A2+) NOT in the focus word's graphemes.
- phonics.teacherScript: warmup, modeling, check — short cold-read lines. Warmup should stress sounds not letter names.
- ${byLevel[key] || byLevel.A1}`;
  }

  function autoWantPhonics(level, topicAsks, phonicsFlag) {
    if (phonicsFlag === true || phonicsFlag === 'on') return true;
    if (phonicsFlag === false || phonicsFlag === 'off') return false;
    const lv = String(level || '').toUpperCase();
    if (topicAsks) return true;
    return lv === 'A1' || lv === 'A2';
  }

  return {
    LEVEL_RULES,
    FALLBACK_BANK,
    IRREGULAR_DENYLIST,
    rulesFor,
    graphemeKind,
    breaksRequiredMultigraph,
    isSplitWellFormed,
    wordEligibleForLevel,
    acceptsGraphemes,
    normalize,
    promptBlock,
    autoWantPhonics,
    vocabSetFromLesson,
  };
});
