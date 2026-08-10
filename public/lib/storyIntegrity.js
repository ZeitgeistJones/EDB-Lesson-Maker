/**
 * storyIntegrity.js — keep comprehension grounded in the story body.
 * UMD: browser → window.StoryIntegrity; Node → module.exports.
 *
 * Clubs PDF fail: story ends mid-name ("…paintings. Ben") and Q2 asks why
 * Anna chose the choir while the body only has her at the art booth.
 * Prompt + normalize both enforce: complete sentences, questions answerable
 * from the joined story text (opinion / future inference allowed).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StoryIntegrity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP = new Set([
    'what', 'where', 'when', 'why', 'who', 'how', 'which', 'whose',
    'did', 'does', 'do', 'the', 'and', 'or', 'but', 'for', 'with', 'from',
    'into', 'onto', 'about', 'after', 'before', 'because', 'then', 'than',
    'that', 'this', 'these', 'those', 'they', 'them', 'their', 'there',
    'she', 'her', 'hers', 'him', 'his', 'you', 'your', 'yours', 'our', 'ours',
    'was', 'were', 'are', 'is', 'been', 'been', 'will', 'would', 'could',
    'should', 'can', 'may', 'might', 'have', 'has', 'had', 'been', 'been',
    'like', 'want', 'went', 'go', 'goes', 'going', 'come', 'came', 'look',
    'looked', 'choose', 'chose', 'chosen', 'make', 'made', 'take', 'took',
    'think', 'thought', 'feel', 'felt', 'say', 'said', 'tell', 'told',
    'find', 'found', 'help', 'helped', 'join', 'joined', 'play', 'played',
    'read', 'write', 'wrote', 'sing', 'sang', 'build', 'built',
    'student', 'students', 'school', 'class', 'classes', 'today', 'yesterday',
    'tomorrow', 'year', 'next', 'last', 'new', 'old', 'big', 'small',
    'good', 'bad', 'very', 'really', 'also', 'just', 'only', 'some', 'any',
    'many', 'much', 'more', 'most', 'other', 'another', 'each', 'every',
    'club', 'clubs', 'booth', 'fair', 'room', 'gym', 'place', 'thing',
    'something', 'someone', 'people', 'friend', 'friends', 'partner',
    'answer', 'question', 'story', 'page', 'lesson',
  ]);

  const OPINION_RE = /\b(what do you think|why do you think|do you think|how do you feel|would you|your opinion|imagine|next year|in the future)\b/i;

  function storyPages(lesson) {
    const pages = (lesson && lesson.story && lesson.story.pages) || [];
    return Array.isArray(pages) ? pages : [];
  }

  function joinStoryText(lesson) {
    return storyPages(lesson)
      .map((p) => String((p && p.text) || '').trim())
      .filter(Boolean)
      .join('\n');
  }

  function contentTokens(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/^'+|'+$/g, ''))
      .filter((w) => w.length >= 4 && !STOP.has(w));
  }

  function vocabTokens(lesson) {
    const out = new Set();
    (lesson && lesson.vocabulary || []).forEach((v) => {
      const w = typeof v === 'string' ? v : v && v.word;
      if (!w) return;
      String(w).toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).forEach((t) => {
        if (t.length >= 3) out.add(t);
      });
    });
    return out;
  }

  /** Page text must end in sentence punctuation — bare trailing names are truncations. */
  function isTruncatedPageText(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return false;
    if (/[.!?…]"?\s*$/.test(t) || /[.!?…]['’]?\s*$/.test(t)) return false;
    // "…paintings. Ben" / "…gym to find something new" cut mid-thought
    if (/\b[A-Z][a-z]{1,12}$/.test(t)) return true;
    if (/[a-z,;:]$/.test(t)) return true;
    return false;
  }

  function repairTruncatedText(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t || !isTruncatedPageText(t)) return t;
    const cut = t.match(/^(.*[.!?…])(?:\s+[^.!?…]+)?$/);
    if (cut && cut[1] && cut[1].trim().length >= 24) return cut[1].trim();
    return t;
  }

  function isOpinionOrFuture(question) {
    return OPINION_RE.test(String(question || ''));
  }

  /**
   * Grounded = opinion/future OK, else every distinctive question token that is
   * also lesson vocab (or a proper-ish name ≥5 letters) must appear in the story.
   */
  function questionGrounded(question, storyBlob, lesson) {
    const q = String(question || '').trim();
    if (!q) return false;
    const blob = String(storyBlob || '').toLowerCase();
    if (!blob.trim()) return false;
    if (isOpinionOrFuture(q)) return true;

    const vocab = vocabTokens(lesson);
    const tokens = contentTokens(q);
    if (!tokens.length) return true;

    const must = tokens.filter((t) => vocab.has(t) || t.length >= 5);
    const check = must.length ? must : tokens;
    const missing = check.filter((t) => !blob.includes(t));
    // Allow 0 missing. One soft miss OK only when ≥2 other hits (typo tolerance).
    if (missing.length === 0) return true;
    const hits = check.length - missing.length;
    return missing.length === 1 && hits >= 2;
  }

  function audit(lesson) {
    const pages = storyPages(lesson);
    const repairedPages = pages.map((p) => {
      if (!p || typeof p !== 'object') return p;
      const text = repairTruncatedText(p.text);
      return text === p.text ? p : Object.assign({}, p, { text });
    });
    const blob = repairedPages.map((p) => String((p && p.text) || '')).join('\n');
    const rawQs = (lesson && lesson.story && lesson.story.comprehensionQuestions) || [];
    const kept = [];
    const dropped = [];
    rawQs.forEach((q) => {
      const question = typeof q === 'string' ? q : (q && (q.question || q.text)) || '';
      const sampleAnswer = typeof q === 'string' ? '' : (q && (q.sampleAnswer || q.answer)) || '';
      if (questionGrounded(question, blob, lesson)) {
        kept.push(typeof q === 'string' ? { question, sampleAnswer: '' } : Object.assign({}, q, { question, sampleAnswer }));
      } else {
        dropped.push(question);
      }
    });
    return {
      pages: repairedPages,
      comprehensionQuestions: kept,
      droppedQuestions: dropped,
      truncatedRepaired: repairedPages.some((p, i) => p && pages[i] && p.text !== pages[i].text),
      storyBlob: blob,
    };
  }

  /** Mutates lesson.story in place; returns audit summary. */
  function repairLesson(lesson) {
    if (!lesson || typeof lesson !== 'object') return { droppedQuestions: [], truncatedRepaired: false };
    if (!lesson.story || typeof lesson.story !== 'object') lesson.story = {};
    const result = audit(lesson);
    lesson.story.pages = result.pages;
    if (result.comprehensionQuestions.length) {
      lesson.story.comprehensionQuestions = result.comprehensionQuestions;
    } else if (result.droppedQuestions.length) {
      // Keep at least nothing dishonest — empty triggers S19 / teacher cue.
      lesson.story.comprehensionQuestions = [];
    }
    lesson._storyIntegrity = {
      droppedQuestions: result.droppedQuestions.slice(),
      truncatedRepaired: result.truncatedRepaired,
    };
    return lesson._storyIntegrity;
  }

  /** Prompt block shared by api/generate-lesson.js + server.js */
  function promptRules() {
    return [
      'STORY INTEGRITY (hard):',
      '- Every story.pages[].text must be COMPLETE sentences that end with . ! or ? — never cut off mid-name or mid-clause (bad: "She liked the paintings. Ben").',
      '- story.comprehensionQuestions must be answerable from the story text alone. Do NOT ask about people, places, clubs, or choices the story never states (bad: story has Anna at the art booth, question asks why she chose the choir).',
      '- Literal recall questions must use names/facts that appear in story.pages. Opinion / "what do you think" / next-year questions are OK.',
      '- sampleAnswer must also stay consistent with the story body.',
    ].join('\n');
  }

  return {
    joinStoryText,
    isTruncatedPageText,
    repairTruncatedText,
    questionGrounded,
    isOpinionOrFuture,
    audit,
    repairLesson,
    promptRules,
    contentTokens,
  };
});
