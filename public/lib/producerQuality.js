/* producerQuality.js — Content-intelligence gate for TopicBrief-grounded lessons.
 *
 * Classic script → window.ProducerQuality
 *
 * Critical checks (all must pass — no average hide):
 *   CORE_SET_INCOMPLETE, CORE_TOPIC_COVERAGE, TOPIC_SPECIFICITY, VOCAB_QUALITY,
 *   CORE_VOCAB_MISALIGNMENT, ASSET_SEMANTIC_MATCH, STORY_TOPIC_GROUNDING,
 *   ACTIVITY_TOPIC_GROUNDING, PROMPT_VISUAL_MATCH
 *
 * Anti-gaming: never pass by shrinking the teach set, near-synonym padding,
 * or promoting parent-setting filler. Repair regenerates only failing stages.
 */
(function () {
  const MAX_REPAIR = 3;
  const CORE_RATIO = 0.8;
  /** Primary teach set size (board slice). Config may request fewer explicitly. */
  const MIN_PRIMARY = 5;
  const MAX_PRIMARY = 7;
  const DEFAULT_PRIMARY = 6;

  const CRITICAL = Object.freeze([
    'CORE_SET_INCOMPLETE',
    'CORE_TOPIC_COVERAGE',
    'TOPIC_SPECIFICITY',
    'VOCAB_QUALITY',
    'CORE_VOCAB_MISALIGNMENT',
    'ASSET_SEMANTIC_MATCH',
    'STORY_TOPIC_GROUNDING',
    'ACTIVITY_TOPIC_GROUNDING',
    'PROMPT_VISUAL_MATCH',
  ]);

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function vocabWords(lesson) {
    return (lesson.vocabulary || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
  }

  /**
   * How many distinct primary concepts this lesson must teach.
   * Explicit lesson/opts target wins; otherwise default board size (6).
   * Never silently drop below MIN_PRIMARY unless allowShortVocab is set.
   */
  function targetPrimaryCount(lesson, opts) {
    opts = opts || {};
    if (opts.allowShortVocab && opts.targetVocabCount != null) {
      return Math.max(1, Number(opts.targetVocabCount) || DEFAULT_PRIMARY);
    }
    const raw = opts.targetVocabCount != null
      ? opts.targetVocabCount
      : (lesson && (lesson.targetVocabCount || lesson._requestedVocabCount));
    if (raw != null && Number(raw) > 0) {
      return Math.min(MAX_PRIMARY, Math.max(MIN_PRIMARY, Number(raw)));
    }
    const dur = String((lesson && lesson.duration) || opts.duration || '30');
    // 60-min generates more overflow, but primary teach set stays 5–7 (board 6).
    if (dur === '60') return DEFAULT_PRIMARY;
    return DEFAULT_PRIMARY;
  }

  function boardWords(lesson, opts) {
    const target = targetPrimaryCount(lesson, opts);
    const all = vocabWords(lesson);
    // Evaluate the primary teach slice — do not hide shrink by only scoring 3.
    return all.slice(0, Math.max(target, MAX_PRIMARY));
  }

  /** Collapse near-duplicates (honey/honeycomb) into one family for variety checks. */
  function conceptFamily(word) {
    const w = norm(word).replace(/\s+/g, '');
    if (!w) return '';
    if (w.length <= 4) return w;
    for (const suf of ['keeper', 'smith', 'comb', 'ing', 'ers', 'er', 'ors', 'or', 'ies', 'es', 's']) {
      if (w.length > suf.length + 3 && w.endsWith(suf)) return w.slice(0, -suf.length);
    }
    return w;
  }

  // Words that describe a SETTING (backdrop the scene happens in) rather than
  // a discrete object a child can point at and match. Letting these leak into
  // primary vocabulary is exactly what produced the matchDock R1 fail (score 3,
  // weakest link ANTI-INFLATION): "market" got picked as a "matchable" word,
  // rendered as a generic building/stall icon indistinguishable from its
  // neighbors, and displaced a real object word (lemon/grape) that had a
  // clean, honest icon.
  const SCENE_SETTING_WORDS = new Set([
    'market', 'farm', 'zoo', 'park', 'school', 'store', 'shop', 'kitchen',
    'garden', 'forest', 'beach', 'playground', 'classroom', 'city', 'town',
    'village', 'mall', 'restaurant', 'library', 'museum', 'airport',
    'station', 'hospital', 'office', 'house', 'room', 'street', 'stall',
    'market place', 'marketplace',
  ]);

  // Bare category umbrellas ("fruit" next to apple/banana") — same trap as
  // vocabArt.js's isJunkFillWord, duplicated here because setVocabFromCore /
  // alignVocabWithLaterContent write lesson.vocabulary directly and never
  // route through vocabArt's adaptation pass.
  const GENERIC_CATEGORY_WORDS = new Set([
    'fruit', 'fruits', 'vegetable', 'vegetables', 'animal', 'animals', 'food',
    'foods', 'toy', 'toys', 'vehicle', 'vehicles', 'pet', 'pets', 'shape',
    'shapes', 'color', 'colors', 'colour', 'colours',
  ]);

  /**
   * A candidate is filler — not worth a matchDock/newWords slot — when it's a
   * scene/setting noun or a bare category umbrella AND the pool already has
   * at least a couple of concrete object words to teach instead. Never blocks
   * the word when it's genuinely the ONLY vocabulary the lesson has (a lesson
   * that is actually *about* "the market" as its one taught word is fine).
   */
  function isSceneOrCategoryFiller(word, poolConcreteCount) {
    const w = norm(word);
    if (!w) return false;
    if (poolConcreteCount < 2) return false;
    return SCENE_SETTING_WORDS.has(w) || GENERIC_CATEGORY_WORDS.has(w);
  }

  function distinctFamilies(words) {
    const fams = new Set();
    for (const w of words) {
      const f = conceptFamily(w);
      if (f) fams.add(f);
    }
    return fams.size;
  }

  function conceptSet(brief) {
    const b = brief || {};
    const list = []
      .concat(b.coreConcepts || [])
      .concat(b.supportingConcepts || [])
      .concat(b.primaryMotifs || [])
      .concat(b.primaryVisualMotifs || []);
    return new Set(list.map((x) => norm(x)).filter(Boolean));
  }

  function wordMatchesConcept(word, concepts) {
    const w = norm(word);
    if (!w) return false;
    if (concepts.has(w)) return true;
    for (const c of concepts) {
      if (!c) continue;
      if (w === c || w.includes(c) || c.includes(w)) return true;
      const wc = w.replace(/\s+/g, '');
      const cc = c.replace(/\s+/g, '');
      if (wc.length >= 4 && cc.length >= 4 && (wc.includes(cc) || cc.includes(wc))) return true;
    }
    return false;
  }

  function storyText(lesson) {
    const pages = (lesson.story && lesson.story.pages) || [];
    return pages
      .map((p) => [p.heading, p.text, p.visualCaption, p.visualTheme].filter(Boolean).join(' '))
      .join(' ');
  }

  function framesText(lesson) {
    const frames = lesson.sentenceFrames || [];
    return frames
      .map((f) => (typeof f === 'string' ? f : f && (f.frame || f.sentence || f.text)))
      .filter(Boolean)
      .join(' ');
  }

  function speakingText(lesson) {
    const qs = lesson.speakingQuestions || [];
    return qs
      .map((q) => (typeof q === 'string' ? q : [q && q.question, q && q.sampleAnswer].filter(Boolean).join(' ')))
      .join(' ');
  }

  function activityText(lesson) {
    const a = lesson.activity || {};
    const bits = [a.title, a.prompt, a.type];
    if (Array.isArray(a.templates)) {
      for (const t of a.templates) {
        bits.push(typeof t === 'string' ? t : t && (t.sentence || t.text || t.prompt));
      }
    }
    if (a.oddOneOut && Array.isArray(a.oddOneOut.options)) {
      bits.push(...a.oddOneOut.options);
    }
    if (a.fixSentence) {
      bits.push(a.fixSentence.sentence, a.fixSentence.correct, a.fixSentence.wrong);
    }
    return bits.filter(Boolean).join(' ');
  }

  function laterLessonBlob(lesson) {
    return [storyText(lesson), framesText(lesson), activityText(lesson), speakingText(lesson)]
      .filter(Boolean)
      .join(' ');
  }

  function uniqNorm(list) {
    const out = [];
    const seen = new Set();
    for (const x of list || []) {
      const n = norm(x);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out;
  }

  function checkCoreCompleteness(lesson, brief, opts) {
    const target = targetPrimaryCount(lesson, opts);
    const board = boardWords(lesson, opts);
    const unique = new Set(board.map(norm).filter(Boolean));
    const families = distinctFamilies(board);
    const reasons = [];
    if (unique.size < MIN_PRIMARY && !(opts && opts.allowShortVocab)) {
      reasons.push(`only ${unique.size} distinct words (need ≥${MIN_PRIMARY})`);
    }
    if (unique.size < target) {
      reasons.push(`primary set ${unique.size} < required ${target}`);
    }
    // Near-synonym padding: 6 words but only 2–3 families → incomplete variety
    if (board.length >= MIN_PRIMARY && families < MIN_PRIMARY - 1) {
      reasons.push(`only ${families} concept families (near-synonym padding)`);
    }
    // Brief itself must offer enough core concepts to teach
    const coreUnique = new Set((brief.coreConcepts || []).map(norm).filter(Boolean));
    if (coreUnique.size < MIN_PRIMARY) {
      reasons.push(`TopicBrief coreConcepts only ${coreUnique.size} (need ≥${MIN_PRIMARY})`);
    }
    return {
      code: 'CORE_SET_INCOMPLETE',
      pass: reasons.length === 0,
      detail: reasons.length
        ? `CORE_SET_INCOMPLETE: ${reasons.join('; ')}`
        : `${unique.size} distinct primary concepts (target ${target})`,
      unique: unique.size,
      families,
      target,
    };
  }

  function checkCoreCoverage(lesson, brief, opts) {
    const board = boardWords(lesson, opts);
    if (!board.length) {
      return { code: 'CORE_TOPIC_COVERAGE', pass: false, detail: 'no vocabulary' };
    }
    const concepts = conceptSet(brief);
    const coreOnly = new Set((brief.coreConcepts || []).map(norm));
    let hits = 0;
    for (const w of board) {
      if (wordMatchesConcept(w, coreOnly) || wordMatchesConcept(w, concepts)) hits++;
    }
    const ratio = hits / board.length;
    return {
      code: 'CORE_TOPIC_COVERAGE',
      pass: ratio >= CORE_RATIO,
      detail: `${hits}/${board.length} board words match core/supporting (${(ratio * 100).toFixed(0)}%, need ≥80%)`,
      ratio,
    };
  }

  function checkSpecificity(lesson, brief, opts) {
    const TI = window.TopicIdentity;
    const board = boardWords(lesson, opts);
    if (!board.length) {
      return { code: 'TOPIC_SPECIFICITY', pass: false, detail: 'no vocabulary' };
    }
    let primary = 0;
    let parentish = 0;
    for (const w of board) {
      const scored = TI && typeof TI.scoreAsset === 'function'
        ? TI.scoreAsset(brief, { kind: 'vocab', word: w, pageTags: ['vocabulary'] })
        : { role: 'neutral', ok: true };
      if (scored.role === 'primary') primary++;
      else if (scored.role === 'secondary' || scored.role === 'forbidden' || scored.role === 'weak') {
        parentish++;
      } else if (wordMatchesConcept(w, conceptSet(brief))) {
        primary++;
      } else {
        const parents = (brief.parentCategories || brief.broaderContext || []).map(norm);
        if (parents.some((p) => norm(w) === p || norm(w).includes(p))) parentish++;
      }
    }
    const primaryShare = primary / board.length;
    const parentShare = parentish / board.length;
    const drift = parentShare > 0.5 && primaryShare < 0.5;
    return {
      code: 'TOPIC_SPECIFICITY',
      pass: !drift && primaryShare >= 0.5,
      detail: `primary=${(primaryShare * 100).toFixed(0)}% parentish=${(parentShare * 100).toFixed(0)}%`,
      primaryShare,
      parentShare,
    };
  }

  function checkVocabQuality(lesson, brief, opts) {
    const board = boardWords(lesson, opts);
    const target = targetPrimaryCount(lesson, opts);
    if (board.length < MIN_PRIMARY && !(opts && opts.allowShortVocab)) {
      return {
        code: 'VOCAB_QUALITY',
        pass: false,
        detail: `only ${board.length} board words (need ≥${MIN_PRIMARY}; shrink-to-pass rejected)`,
      };
    }
    const generics = (window.TopicIdentity && window.TopicIdentity.GENERIC_ENV_WORDS) || [];
    const weakSet = new Set(
      (brief.weakSubstitutes || []).map(norm).concat(generics.map(norm))
    );
    const forbidden = new Set((brief.forbiddenSubstitutes || brief.likelyConfusions || []).map(norm));
    const parents = new Set((brief.parentCategories || brief.broaderContext || []).map(norm));
    let bad = 0;
    const seen = new Set();
    let dupes = 0;
    for (const w of board) {
      const n = norm(w);
      if (seen.has(n)) dupes++;
      seen.add(n);
      if (weakSet.has(n) || forbidden.has(n)) bad++;
      else if (generics.includes(n)) bad++;
      // Parent-category label as a primary teach word (farm on beekeeping)
      else if (parents.has(n) && !wordMatchesConcept(w, new Set((brief.coreConcepts || []).map(norm)))) {
        bad++;
      }
    }
    const distinct = seen.size / Math.max(board.length, 1);
    const pass = bad / Math.max(board.length, 1) <= 0.25
      && distinct >= 0.85
      && dupes === 0
      && seen.size >= Math.min(MIN_PRIMARY, target);
    return {
      code: 'VOCAB_QUALITY',
      pass,
      detail: `weak/forbidden/parent-filler=${bad} dupes=${dupes} distinct=${seen.size}/${board.length}`,
    };
  }

  /**
   * Concepts used heavily later in the lesson but missing from primary vocab.
   */
  function checkCoreVocabMisalignment(lesson, brief, opts) {
    const board = boardWords(lesson, opts);
    const boardSet = new Set(board.map(norm));
    const blob = norm(laterLessonBlob(lesson));
    if (!blob || blob.length < 20) {
      return {
        code: 'CORE_VOCAB_MISALIGNMENT',
        pass: true,
        detail: 'later content thin — skip misalignment',
        missing: [],
      };
    }
    const candidates = uniqNorm(
      [].concat(brief.coreConcepts || [], brief.supportingConcepts || [], brief.primaryMotifs || [])
    );
    const missing = [];
    for (const c of candidates) {
      if (!c || c.length < 3) continue;
      if (boardSet.has(c) || [...boardSet].some((b) => b.includes(c) || c.includes(b))) continue;
      // A scene/setting noun or bare category umbrella ("market", "fruit")
      // dominating the story text doesn't mean the vocab is misaligned — the
      // story is set IN that scene, it doesn't need to be taught AS a word
      // when the board already teaches enough concrete objects.
      if (isSceneOrCategoryFiller(c, board.length)) continue;
      const re = new RegExp('\\b' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
      const hits = (blob.match(re) || []).length;
      if (hits >= 2) missing.push({ concept: c, hits });
    }
    const pass = missing.length < 2;
    return {
      code: 'CORE_VOCAB_MISALIGNMENT',
      pass,
      detail: pass
        ? 'primary vocab covers heavily used later concepts'
        : `CORE_VOCAB_MISALIGNMENT: later lesson leans on ${missing
          .slice(0, 4)
          .map((m) => `${m.concept}×${m.hits}`)
          .join(', ')} but primary vocab omitted them`,
      missing,
    };
  }

  function checkAssetSemantic(lesson, brief, opts) {
    const VI = window.VocabIcons;
    const TI = window.TopicIdentity;
    const board = boardWords(lesson, opts);
    if (!board.length) {
      return { code: 'ASSET_SEMANTIC_MATCH', pass: false, detail: 'no vocabulary' };
    }
    const coreStems = new Set();
    for (const c of (brief.coreConcepts || []).concat(brief.primaryMotifs || [])) {
      const n = norm(c).replace(/\s+/g, '');
      if (n.length >= 3) coreStems.add(n);
      if (n.length >= 4) coreStems.add(n.slice(0, 4));
    }
    let mismatches = 0;
    let checked = 0;
    const notes = [];
    for (const w of board) {
      checked++;
      const scored = TI && typeof TI.scoreAsset === 'function'
        ? TI.scoreAsset(brief, { kind: 'vocab', word: w, pageTags: ['vocabulary'] })
        : { role: 'neutral', ok: true };
      if (scored.role === 'forbidden') {
        mismatches++;
        notes.push(`${w}:forbidden`);
        continue;
      }
      if (VI && typeof VI.matchKindSync === 'function' && VI.indexReady && VI.indexReady()) {
        const kind = VI.matchKindSync(w);
        if (kind === 'alias' || kind === 'token') {
          const path = typeof VI.pathForSync === 'function' ? VI.pathForSync(w) : null;
          const key = path ? String(path).split('/').pop().replace(/\.png$/i, '') : '';
          const kn = norm(key).replace(/-/g, '');
          const wn = norm(w).replace(/\s+/g, '');
          const keyOnTopic = [...coreStems].some(
            (s) => kn.includes(s) || s.includes(kn) || kn.slice(0, 4) === s.slice(0, 4)
          );
          const wordOnKey = kn && wn && (kn.includes(wn) || wn.includes(kn) || kn.slice(0, 4) === wn.slice(0, 4));
          if (key && !wordOnKey && !keyOnTopic) {
            mismatches++;
            notes.push(`${w}→${key}`);
          }
        }
      }
    }
    const pass = mismatches === 0;
    return {
      code: 'ASSET_SEMANTIC_MATCH',
      pass,
      detail: mismatches
        ? `ASSET_SEMANTIC_MISMATCH: ${notes.slice(0, 4).join('; ')}`
        : `checked ${checked}, no semantic mismatches`,
      mismatches,
    };
  }

  function checkStoryGrounding(lesson, brief) {
    const text = norm(storyText(lesson));
    const core = (brief.coreConcepts || []).map(norm).filter(Boolean);
    if (!text) {
      return { code: 'STORY_TOPIC_GROUNDING', pass: false, detail: 'empty story' };
    }
    let hits = 0;
    const found = [];
    for (const c of core) {
      if (c.length < 3) continue;
      if (text.includes(c) || text.replace(/\s+/g, '').includes(c.replace(/\s+/g, ''))) {
        hits++;
        found.push(c);
      }
    }
    const need = Math.min(3, Math.max(2, Math.ceil(core.length * 0.4)));
    return {
      code: 'STORY_TOPIC_GROUNDING',
      pass: hits >= need,
      detail: `story covers ${hits} core concepts (need ≥${need}): ${found.join(', ') || 'none'}`,
      hits,
    };
  }

  function checkActivityGrounding(lesson, brief) {
    const text = norm(activityText(lesson));
    const core = (brief.coreConcepts || []).map(norm).filter((c) => c.length >= 3);
    const topic = norm(brief.topicLabel || brief.topicId || '');
    if (!text) {
      return { code: 'ACTIVITY_TOPIC_GROUNDING', pass: false, detail: 'empty activity' };
    }
    let hits = 0;
    for (const c of core) {
      if (text.includes(c)) hits++;
    }
    if (topic && text.includes(topic.split(/\s+/)[0])) hits++;
    const pass = hits >= 2;
    return {
      code: 'ACTIVITY_TOPIC_GROUNDING',
      pass,
      detail: `activity mentions ${hits} topic/core tokens (need ≥2)`,
      hits,
    };
  }

  function checkWarmUp(lesson, brief) {
    const wu = lesson.warmUp || {};
    const q = norm(wu.question || '');
    if (!q) {
      return { code: 'PROMPT_VISUAL_MATCH', pass: false, detail: 'missing warm-up question' };
    }
    const topicBits = norm(brief.topicLabel || brief.requestedTopic || '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const core = (brief.coreConcepts || []).map(norm).filter((c) => c.length > 3);
    const bridge = [].concat(topicBits, core.slice(0, 4));
    const parents = (brief.parentCategories || []).map(norm);
    const parentOnly =
      parents.length
      && parents.some((p) => q.includes(p))
      && !bridge.some((b) => q.includes(b));
    const cue = wu.imageWord || wu.visual || wu.emojiWord;
    let visualOk = true;
    if (cue && window.TopicIdentity && typeof window.TopicIdentity.scoreAsset === 'function') {
      const scored = window.TopicIdentity.scoreAsset(brief, {
        kind: 'vocab',
        word: cue,
        pageTags: ['warm'],
      });
      if (scored.role === 'forbidden') {
        visualOk = false;
      }
    }
    const pass = !parentOnly && visualOk;
    return {
      code: 'PROMPT_VISUAL_MATCH',
      pass,
      detail: parentOnly
        ? 'PROMPT_VISUAL_MISMATCH: warm-up leans on parent category only'
        : visualOk
          ? 'warm-up present and not parent-only'
          : 'PROMPT_VISUAL_MISMATCH: warm-up visual cue forbidden for topic',
    };
  }

  function validate(lesson, opts) {
    opts = opts || {};
    const TI = window.TopicIdentity;
    let brief = opts.topicBrief
      || (lesson && lesson._topicBrief)
      || (lesson && lesson.topicBrief)
      || null;
    if (!brief && TI && typeof TI.ensureBrief === 'function') {
      brief = TI.ensureBrief(lesson);
    }
    if (!brief) {
      return {
        pass: false,
        brief: null,
        checks: CRITICAL.map((code) => ({ code, pass: false, detail: 'no TopicBrief' })),
        failures: CRITICAL.slice(),
      };
    }

    const checks = [
      checkCoreCompleteness(lesson, brief, opts),
      checkCoreCoverage(lesson, brief, opts),
      checkSpecificity(lesson, brief, opts),
      checkVocabQuality(lesson, brief, opts),
      checkCoreVocabMisalignment(lesson, brief, opts),
      checkAssetSemantic(lesson, brief, opts),
      checkStoryGrounding(lesson, brief),
      checkActivityGrounding(lesson, brief),
      checkWarmUp(lesson, brief),
    ];
    const failures = checks.filter((c) => !c.pass).map((c) => c.code);
    return {
      pass: failures.length === 0,
      brief,
      checks,
      failures,
    };
  }

  function pushVocabWord(words, seen, families, w, brief, target, preferNewFamily) {
    if (words.length >= target) return false;
    const raw = String(w || '').trim();
    if (!raw) return false;
    const n = norm(raw);
    if (!n || seen.has(n)) return false;
    const fam = conceptFamily(raw);
    const famNew = fam && !families.has(fam);
    if (preferNewFamily && !famNew && families.size < MIN_PRIMARY) return false;
    if (!famNew && families.size >= MIN_PRIMARY - 1 && words.length < target) {
      const cores = new Set((brief.coreConcepts || []).map(norm));
      if (!cores.has(n)) return false;
    }
    seen.add(n);
    if (fam) families.add(fam);
    words.push({
      word: raw,
      definition: `A word for ${brief.topicLabel || 'this topic'}.`,
      example: `We use “${raw}” when we talk about ${brief.topicLabel || 'the topic'}.`,
      sentence: `We use “${raw}” when we talk about ${brief.topicLabel || 'the topic'}.`,
    });
    return true;
  }

  function setVocabFromCore(lesson, brief, opts) {
    opts = opts || {};
    const TI = window.TopicIdentity;
    const target = targetPrimaryCount(lesson, opts);
    const parents = new Set((brief.parentCategories || []).map(norm));
    const weak = new Set((brief.weakSubstitutes || []).map(norm));
    const forbidden = new Set((brief.forbiddenSubstitutes || []).map(norm));

    const lessonWordList = vocabWords(lesson);
    const concreteLessonWordCount = lessonWordList.filter(
      (w) => !isSceneOrCategoryFiller(w, 2)
    ).length;

    function acceptable(w) {
      const n = norm(w);
      if (!n || n.length < 2) return false;
      if (forbidden.has(n)) return false;
      if (parents.has(n)) return false;
      if (weak.has(n) && !(brief.coreConcepts || []).some((c) => norm(c) === n)) return false;
      // Never let a scene/setting noun or bare category umbrella (market,
      // fruit) crowd out a lesson's own concrete, matchable words.
      if (isSceneOrCategoryFiller(n, concreteLessonWordCount)) return false;
      return true;
    }

    // Keep the lesson's own board words first — expandCore pack hits must not
    // erase ball/team/score just because "friends" unlocked friendship packs.
    let pool = []
      .concat(vocabWords(lesson))
      .concat(brief.coreConcepts || [])
      .concat(brief.supportingConcepts || [])
      .concat(brief.primaryMotifs || [])
      .filter(acceptable);

    // Expand brief if core pool is thin — never shrink the teach set to pass.
    if (pool.length < target && TI && typeof TI.expandCoreConcepts === 'function') {
      const titleBits = typeof TI.titleTokens === 'function'
        ? TI.titleTokens(lesson.title || brief.topicLabel || '')
        : norm(lesson.title || '').split(/\s+/);
      const expanded = TI.expandCoreConcepts({
        topicId: brief.topicId,
        topicLabel: brief.topicLabel,
        titleBits,
        lessonWords: vocabWords(lesson),
        parentCategories: brief.parentCategories || [],
      });
      pool = pool.concat(expanded.core || [], expanded.supporting || []).filter(acceptable);
      if (expanded.core && expanded.core.length >= MIN_PRIMARY) {
        brief.coreConcepts = expanded.core.slice(0, 8);
      }
    }

    const words = [];
    const seen = new Set();
    const families = new Set();
    for (const w of pool) {
      pushVocabWord(words, seen, families, w, brief, target, true);
      if (words.length >= target) break;
    }
    if (words.length < target) {
      for (const w of pool) {
        pushVocabWord(words, seen, families, w, brief, target, false);
        if (words.length >= target) break;
      }
    }

    lesson.vocabulary = words;
    lesson.targetVocabCount = target;
    delete lesson._vocabAdapted;
    return words;
  }

  function groundStory(lesson, brief) {
    const core = (brief.coreConcepts || []).slice(0, 6);
    const topic = brief.topicLabel || brief.topicId || 'the topic';
    if (!lesson.story) lesson.story = {};
    const pages = Array.isArray(lesson.story.pages) ? lesson.story.pages.slice() : [];
    while (pages.length < 3) {
      pages.push({ heading: '', text: '', visualTheme: topic, visualCaption: '' });
    }
    for (let i = 0; i < pages.length; i++) {
      const c0 = core[i % core.length] || topic;
      const c1 = core[(i + 1) % core.length] || c0;
      const c2 = core[(i + 2) % core.length] || c1;
      const existing = pages[i] || {};
      const rawText = String(existing.text || '').trim();
      // Hand-authored story-scene beats and real ESL sentences must not be
      // replaced by TopicBrief filler just because coreConcepts aren't echoed.
      const keepAuthored =
        !!existing.storyScene
        || (rawText.length >= 24
          && /[.!?…]/.test(rawText)
          && !/^We learn about\b/i.test(rawText));
      const hasCorePair =
        rawText
        && norm(rawText).includes(norm(c0))
        && norm(rawText).includes(norm(c1));
      pages[i] = Object.assign({}, existing, {
        heading: existing.heading || `${c0}`,
        text: keepAuthored || hasCorePair
          ? rawText
          : `We learn about ${topic}. First we see a ${c0}. Then we find the ${c1}. We also talk about ${c2}.`,
        visualTheme: existing.visualTheme || topic,
        visualCaption: existing.visualCaption || `${c0} — ${topic}`,
      });
    }
    lesson.story.pages = pages;
    if (!lesson.story.title) lesson.story.title = `A day with ${topic}`;
    return lesson.story;
  }

  function groundActivity(lesson, brief) {
    const core = (brief.coreConcepts || []).slice(0, 4);
    const topic = brief.topicLabel || brief.topicId || 'topic';
    if (!lesson.activity) lesson.activity = {};
    lesson.activity.title = lesson.activity.title || `Use the ${topic} words`;
    lesson.activity.prompt =
      lesson.activity.prompt
      || `Say a sentence with ${core[0] || topic} and ${core[1] || topic}.`;
    if (!Array.isArray(lesson.activity.templates) || lesson.activity.templates.length < 2) {
      lesson.activity.templates = [
        `I see a ___ (${core[0] || topic}).`,
        `The ${core[1] || topic} is next to the ___.`,
        `We need a ___ for ${topic}.`,
        `Can you find the ___?`,
      ];
    } else {
      const blob = norm(activityText(lesson));
      let hits = 0;
      for (const c of core) if (blob.includes(norm(c))) hits++;
      if (hits < 2) {
        lesson.activity.templates = [
          `I use the ${core[0] || topic} near the ___.`,
          `Please pass me the ___.`,
          `This ${core[1] || topic} helps with ${topic}.`,
          `We talk about ___ and ${core[0] || topic}.`,
        ];
      }
    }
    return lesson.activity;
  }

  function groundWarmUp(lesson, brief, opts) {
    opts = opts || {};
    const topic = brief.topicLabel || brief.requestedTopic || 'this topic';
    if (!lesson.warmUp) lesson.warmUp = {};
    const force = !!opts.force;
    if (force || !lesson.warmUp.question) {
      lesson.warmUp.question = `What do you already know about ${topic}?`;
    }
    if (force || !lesson.warmUp.sampleAnswer) {
      lesson.warmUp.sampleAnswer = `I know a little about ${topic}.`;
    }
    if (force) {
      delete lesson.warmUp.imageWord;
      delete lesson.warmUp.visual;
      delete lesson.warmUp.emojiWord;
    }
    return lesson.warmUp;
  }

  /**
   * Promote heavily used later concepts into the primary vocab set.
   * When the set is already at target size, displace the least-used board
   * words (never drop a concept that itself is heavy in later content).
   */
  function alignVocabWithLaterContent(lesson, brief, opts) {
    const mis = checkCoreVocabMisalignment(lesson, brief, opts);
    if (mis.pass || !mis.missing || !mis.missing.length) return lesson.vocabulary;
    const target = targetPrimaryCount(lesson, opts);
    const blob = norm(laterLessonBlob(lesson));
    const parents = new Set((brief.parentCategories || []).map(norm));
    const coreRank = new Map();
    (brief.coreConcepts || []).forEach((c, i) => coreRank.set(norm(c), i));

    function laterHits(word) {
      const c = norm(word);
      if (!c || c.length < 3) return 0;
      try {
        const re = new RegExp('\\b' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
        return (blob.match(re) || []).length;
      } catch (_) {
        return blob.split(c).length - 1;
      }
    }

    const words = vocabWords(lesson).map((w) => ({
      word: w,
      definition: `A word for ${brief.topicLabel || 'this topic'}.`,
      example: `We use “${w}” when we talk about ${brief.topicLabel || 'the topic'}.`,
      sentence: `We use “${w}” when we talk about ${brief.topicLabel || 'the topic'}.`,
    }));
    const seen = new Set(words.map((w) => norm(w.word)));

    function displaceFor(concept) {
      if (seen.has(concept) || parents.has(concept)) return false;
      // A scene/setting noun or bare category umbrella showing up a lot in
      // the story text ("market", "fruit") is expected — the story is ABOUT
      // that setting — but it must not evict a concrete taught object just
      // because it's mentioned more often than that object was.
      if (isSceneOrCategoryFiller(concept, words.length)) return false;
      // Prefer replacing parent filler, then words with 0 later hits, then
      // lowest-ranked core (comb/smoker before bee/hive).
      let best = -1;
      let bestScore = Infinity;
      for (let i = 0; i < words.length; i++) {
        const n = norm(words[i].word);
        if (parents.has(n)) {
          best = i;
          bestScore = -100;
          break;
        }
        const hits = laterHits(words[i].word);
        const rank = coreRank.has(n) ? coreRank.get(n) : 99;
        const score = hits * 10 + (10 - Math.min(rank, 10));
        // Never displace a word that appears as often as the incoming concept
        if (hits >= laterHits(concept)) continue;
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      const entry = {
        word: concept,
        definition: `A word for ${brief.topicLabel || 'this topic'}.`,
        example: `We use “${concept}” when we talk about ${brief.topicLabel || 'the topic'}.`,
        sentence: `We use “${concept}” when we talk about ${brief.topicLabel || 'the topic'}.`,
      };
      if (best >= 0) {
        seen.delete(norm(words[best].word));
        words[best] = entry;
        seen.add(concept);
        return true;
      }
      if (words.length < target) {
        words.push(entry);
        seen.add(concept);
        return true;
      }
      return false;
    }

    for (const m of mis.missing.sort((a, b) => b.hits - a.hits)) {
      displaceFor(m.concept);
    }

    lesson.vocabulary = words.slice(0, Math.max(target, Math.min(words.length, MAX_PRIMARY)));
    delete lesson._vocabAdapted;
    return lesson.vocabulary;
  }

  function repair(lesson, opts) {
    opts = opts || {};
    const max = opts.maxAttempts != null ? opts.maxAttempts : MAX_REPAIR;
    const TI = window.TopicIdentity;
    const repairs = [];
    let current = lesson;
    let report = validate(current, opts);

    for (let attempt = 0; attempt < max && !report.pass; attempt++) {
      const fails = new Set(report.failures);

      if (
        fails.has('CORE_SET_INCOMPLETE')
        || fails.has('CORE_TOPIC_COVERAGE')
        || fails.has('TOPIC_SPECIFICITY')
        || fails.has('VOCAB_QUALITY')
        || fails.has('CORE_VOCAB_MISALIGNMENT')
      ) {
        if (TI && typeof TI.buildBrief === 'function') {
          delete current._topicBrief;
          const brief = TI.buildBrief(current);
          setVocabFromCore(current, brief, opts);
          // Always re-align after a core fill so story-heavy concepts are taught.
          alignVocabWithLaterContent(current, brief, opts);
          repairs.push({ stage: 'vocabulary', attempt: attempt + 1 });
        }
      }

      if (fails.has('STORY_TOPIC_GROUNDING')) {
        groundStory(current, report.brief || current._topicBrief || current.topicBrief);
        repairs.push({ stage: 'story', attempt: attempt + 1 });
      }

      if (fails.has('ACTIVITY_TOPIC_GROUNDING')) {
        groundActivity(current, report.brief || current._topicBrief || current.topicBrief);
        repairs.push({ stage: 'activity', attempt: attempt + 1 });
      }

      if (fails.has('PROMPT_VISUAL_MATCH')) {
        groundWarmUp(current, report.brief || current._topicBrief || current.topicBrief, { force: true });
        repairs.push({ stage: 'warmUp', attempt: attempt + 1 });
      }

      if (fails.has('ASSET_SEMANTIC_MATCH')) {
        const brief = report.brief || (TI && TI.ensureBrief(current));
        setVocabFromCore(current, brief, opts);
        repairs.push({ stage: 'assets', attempt: attempt + 1 });
      }

      if (TI && typeof TI.buildBrief === 'function') {
        delete current._topicBrief;
        current.topicBrief = TI.buildBrief(current);
      }

      report = validate(current, Object.assign({}, opts, {
        topicBrief: current.topicBrief || current._topicBrief,
      }));
    }

    return { lesson: current, report, repairs };
  }

  function synthesizeFromTopic(topic, opts) {
    opts = opts || {};
    const TI = window.TopicIdentity;
    const title = String(topic || 'Topic').trim();
    const seed = {
      title,
      vocabulary: [],
      level: opts.level || 'A1',
      duration: opts.duration || '30',
      targetVocabCount: opts.targetVocabCount || DEFAULT_PRIMARY,
    };
    const brief = TI && typeof TI.buildBrief === 'function'
      ? TI.buildBrief(seed)
      : null;
    if (!brief) throw new Error('TopicIdentity.buildBrief required');

    const lesson = {
      title,
      level: opts.level || 'A1',
      duration: opts.duration || '30',
      targetVocabCount: opts.targetVocabCount || DEFAULT_PRIMARY,
      topicBrief: brief,
      warmUp: {
        question: `What do you already know about ${brief.topicLabel}?`,
        sampleAnswer: `I know a little about ${brief.topicLabel}.`,
      },
      vocabulary: [],
      sentenceFrames: [
        `I see a ___.`,
        `This is a ___.`,
        `We need a ___.`,
        `Can you find the ___?`,
      ],
      story: { title: '', pages: [], comprehensionQuestions: [], creativeQuestions: [] },
      speakingQuestions: [
        { question: `Tell me about ${brief.topicLabel}.`, sampleAnswer: '' },
        { question: `What is important in ${brief.topicLabel}?`, sampleAnswer: '' },
      ],
      activity: { title: '', prompt: '', templates: [] },
      reviewSentences: [
        `Today we learned about ${brief.topicLabel}.`,
        `I can say words about ${brief.topicLabel}.`,
        `I will practice ${brief.coreConcepts[0] || brief.topicLabel}.`,
      ],
    };

    setVocabFromCore(lesson, brief, opts);
    groundStory(lesson, brief);
    groundActivity(lesson, brief);
    groundWarmUp(lesson, brief);
    lesson._topicBrief = brief;
    lesson.topicBrief = brief;
    return lesson;
  }

  window.ProducerQuality = {
    CRITICAL,
    CORE_RATIO,
    MIN_PRIMARY,
    MAX_PRIMARY,
    DEFAULT_PRIMARY,
    MAX_REPAIR,
    validate,
    repair,
    synthesizeFromTopic,
    setVocabFromCore,
    alignVocabWithLaterContent,
    groundStory,
    groundActivity,
    groundWarmUp,
    boardWords,
    targetPrimaryCount,
    checkCoreCompleteness,
    checkCoreVocabMisalignment,
  };
})();
