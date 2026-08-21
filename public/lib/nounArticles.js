/**
 * nounArticles.js — A1-safe determiners for countable vs mass/plural nouns.
 * UMD: browser → window.NounArticles; Node → module.exports.
 *
 * Fixes producer bugs like "Mia sees a sand" / "Do I see a sand?" where vowel
 * heuristics alone are not enough (sand/water/rice are consonant-initial mass).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.NounArticles = api;
    if (root.window && root.window !== root) root.window.NounArticles = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  /** Common ESL mass / uncountable nouns (extend carefully — keep concrete). */
  const MASS = new Set([
    'sand', 'water', 'rice', 'milk', 'bread', 'butter', 'cheese', 'meat', 'fish',
    'fruit', 'food', 'juice', 'tea', 'coffee', 'soup', 'sugar', 'salt', 'flour',
    'air', 'rain', 'snow', 'ice', 'wind', 'weather', 'sun', 'sunshine', 'heat',
    'fun', 'music', 'noise', 'homework', 'work', 'money', 'paper', 'trash',
    'rubbish', 'garbage', 'litter', 'grass', 'dirt', 'mud', 'dust', 'smoke',
    'fire', 'hair', 'help', 'love', 'luck', 'time', 'information', 'advice',
    'furniture', 'luggage', 'traffic', 'equipment', 'news', 'honey', 'jam',
    'yogurt', 'yoghurt', 'cereal', 'toast', 'pasta', 'spaghetti', 'salad',
    'pizza', // often mass in A1 "I like pizza"
  ]);

  /** Words that are almost always plural / pluralia in A1 boards. */
  const ALWAYS_PLURAL = new Set([
    'glasses', 'scissors', 'pants', 'trousers', 'shorts', 'jeans', 'clothes',
    'shoes', 'socks', 'gloves', 'eyes', 'ears', 'teeth', 'people',
  ]);

  function normWord(word) {
    return String(word || '')
      .toLowerCase()
      .trim()
      .replace(/^[“"']+|[”"'.!,?;:]+$/g, '');
  }

  function isMassNoun(word) {
    const w = normWord(word);
    if (!w) return false;
    if (MASS.has(w)) return true;
    // Simple compound heads: "beach sand" → sand
    const parts = w.split(/\s+/);
    if (parts.length > 1 && MASS.has(parts[parts.length - 1])) return true;
    return false;
  }

  function isPluralNoun(word) {
    const w = normWord(word);
    if (!w) return false;
    if (ALWAYS_PLURAL.has(w)) return true;
    if (MASS.has(w)) return false;
    // Naive plural: ends in s, not ss/us/is proper, length > 3
    if (w.length > 3 && /s$/i.test(w) && !/(ss|us|is|ous|ness)$/i.test(w)) return true;
    return false;
  }

  /** true when indefinite a/an is grammatical before this noun. */
  function takesIndefinite(word) {
    if (isMassNoun(word) || isPluralNoun(word)) return false;
    return true;
  }

  function needsAn(word) {
    return /^[aeiou]/i.test(normWord(word));
  }

  /**
   * Indefinite article only: 'a' | 'an' | '' (mass/plural).
   */
  function indefiniteArticle(word) {
    if (!takesIndefinite(word)) return '';
    return needsAn(word) ? 'an' : 'a';
  }

  /**
   * Build a noun phrase with a safe determiner.
   * opts.prefer: 'a' | 'the' | 'some' | 'bare' — hint when multiple are OK.
   */
  function nounPhrase(word, opts) {
    opts = opts || {};
    const raw = String(word || '').trim();
    const w = normWord(raw);
    if (!w) return '';
    const display = raw; // keep caller casing when sensible
    if (isMassNoun(w)) {
      if (opts.prefer === 'bare') return display;
      if (opts.prefer === 'some') return `some ${display}`;
      return `the ${display}`;
    }
    if (isPluralNoun(w)) {
      if (opts.prefer === 'some') return `some ${display}`;
      if (opts.prefer === 'bare') return display;
      return `the ${display}`;
    }
    const art = indefiniteArticle(w);
    if (opts.prefer === 'the') return `the ${display}`;
    return art ? `${art} ${display}` : display;
  }

  /** "sees a shell" / "sees the sand" / "sees the shoes" */
  function seesNoun(word) {
    return `sees ${nounPhrase(word, { prefer: isMassNoun(word) ? 'the' : 'a' })}`;
  }

  /** "Do I see a shell?" / "Do I see sand?" */
  function doISeeNoun(word) {
    if (isMassNoun(word) || isPluralNoun(word)) {
      return `Do I see ${nounPhrase(word, { prefer: 'bare' })}?`;
    }
    return `Do I see ${nounPhrase(word)}?`;
  }

  function isThereNoun(word) {
    if (isMassNoun(word) || isPluralNoun(word)) {
      return `Is there ${nounPhrase(word, { prefer: 'bare' })}?`;
    }
    return `Is there ${nounPhrase(word)}?`;
  }

  /**
   * Short teachable example sentence for a vocab card (not meta "We use…").
   */
  function exampleSentence(word, topicLabel) {
    const w = String(word || '').trim();
    if (!w) return '';
    const topic = String(topicLabel || '').trim();
    if (isMassNoun(w)) {
      return topic && /beach|ocean|sea/i.test(topic)
        ? `I see ${nounPhrase(w, { prefer: 'the' })}.`
        : `I like ${nounPhrase(w, { prefer: 'bare' })}.`;
    }
    if (isPluralNoun(w)) {
      return `I see ${nounPhrase(w, { prefer: 'the' })}.`;
    }
    return `I see ${nounPhrase(w)}.`;
  }

  /**
   * Rewrite bad "a/an + mass|plural" in free text (LLM or bridge residue).
   */
  function repairIndefiniteMass(text) {
    let t = String(text || '');
    if (!t) return t;
    // a sand / an sand / a water / a rice / a music …
    t = t.replace(/\b(an?)\s+([A-Za-z][A-Za-z'-]*)\b/g, (full, _art, noun) => {
      const n = normWord(noun);
      if (isMassNoun(n) || isPluralNoun(n)) {
        // Prefer bare after see/find/like/need; "the" after other verbs is OK too —
        // bare is safest for A1 mass nouns.
        return noun;
      }
      return full;
    });
    return t;
  }

  /** True when a vocab sentence is unusable (empty, meta, truncated). */
  function isWeakExampleSentence(sentence, word) {
    const s = String(sentence || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length < 6) return true;
    if (/we use\s+[“"']?\w+[”"']?\s+when we talk about/i.test(s)) return true;
    if (/^a word for\b/i.test(s)) return true;
    if (!/[.!?…]["']?\s*$/.test(s)) return true;
    if (/\b(to|the|a|an|and|or|of|for|with|at|in|on|we|i|find|build|beach)\s*$/i.test(s)) {
      return true;
    }
    const w = normWord(word);
    if (w && !new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(s)) {
      return true;
    }
    // Illegal indefinite + mass in the example itself
    if (/\b(an?)\s+([A-Za-z']+)\b/i.test(s)) {
      const m = s.match(/\b(an?)\s+([A-Za-z']+)\b/i);
      if (m && (isMassNoun(m[2]) || isPluralNoun(m[2]))) return true;
    }
    return false;
  }

  function repairVocabEntry(entry, topicLabel) {
    if (entry == null) return entry;
    if (typeof entry === 'string') {
      const word = entry;
      return {
        word,
        emoji: '',
        sentence: exampleSentence(word, topicLabel),
      };
    }
    if (typeof entry !== 'object') return entry;
    const word = String(entry.word || '').trim();
    if (!word) return entry;
    let sentence = String(entry.sentence || entry.example || '').trim();
    sentence = repairIndefiniteMass(sentence);
    if (isWeakExampleSentence(sentence, word)) {
      sentence = exampleSentence(word, topicLabel);
    }
    const out = Object.assign({}, entry, { sentence });
    if (out.example != null) out.example = sentence;
    return out;
  }

  function repairLessonVocabulary(lesson) {
    if (!lesson || typeof lesson !== 'object') return lesson;
    const topic = (lesson.topicBrief && lesson.topicBrief.topicLabel)
      || lesson.title
      || '';
    if (!Array.isArray(lesson.vocabulary)) return lesson;
    lesson.vocabulary = lesson.vocabulary.map((v) => repairVocabEntry(v, topic));
    return lesson;
  }

  function repairLessonTextFields(lesson) {
    if (!lesson || typeof lesson !== 'object') return lesson;
    const fix = (s) => repairIndefiniteMass(s);
    if (lesson.story && Array.isArray(lesson.story.pages)) {
      lesson.story.pages = lesson.story.pages.map((p) => {
        if (!p || typeof p !== 'object') return p;
        return Object.assign({}, p, {
          text: fix(p.text),
          visualCaption: fix(p.visualCaption),
          heading: fix(p.heading),
        });
      });
    }
    if (Array.isArray(lesson.reviewSentences)) {
      lesson.reviewSentences = lesson.reviewSentences.map(fix);
    }
    if (lesson.activity) {
      if (lesson.activity.prompt) lesson.activity.prompt = fix(lesson.activity.prompt);
      if (Array.isArray(lesson.activity.templates)) {
        lesson.activity.templates = lesson.activity.templates.map(fix);
      }
    }
    return lesson;
  }

  return {
    MASS,
    ALWAYS_PLURAL,
    normWord,
    isMassNoun,
    isPluralNoun,
    takesIndefinite,
    needsAn,
    indefiniteArticle,
    nounPhrase,
    seesNoun,
    doISeeNoun,
    isThereNoun,
    exampleSentence,
    repairIndefiniteMass,
    isWeakExampleSentence,
    repairVocabEntry,
    repairLessonVocabulary,
    repairLessonTextFields,
  };
});
