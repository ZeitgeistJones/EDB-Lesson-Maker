/* producerBridge.js — small producer-side activation bridges.
 * Classic script -> window.ProducerBridge
 *
 * This does not create new lesson architecture. It normalizes generated lesson
 * JSON so existing StoryScene, heroProp, and Pre-A1 board mechanics can fire.
 */
(function () {
  const PREA1_ACTION_KEYS = [
    'prea1-verb-look',
    'prea1-verb-give',
    'prea1-verb-take',
    'prea1-verb-eat',
    'prea1-verb-run',
    'prea1-verb-sleep',
    'prea1-verb-close',
  ];

  const FOOD_WORDS = [
    'apple', 'banana', 'sandwich', 'milk', 'cookie', 'carrot', 'tomato',
    'lunch', 'food', 'foods', 'meal', 'snack', 'juice', 'tray',
  ];
  const FACE_WORDS = ['face', 'eyes', 'eye', 'nose', 'mouth', 'hair', 'ears', 'ear', 'smile'];
  const ZOO_WORDS = ['zoo', 'lion', 'monkey', 'elephant', 'tiger', 'giraffe', 'zebra', 'bear', 'hippo'];
  const STORY_OBJECTS = [
    'lion', 'monkey', 'elephant', 'tiger', 'giraffe', 'zebra', 'bear', 'hippo',
    'apple', 'banana', 'sandwich', 'milk', 'cookie', 'carrot', 'ball',
    'book', 'pencil', 'backpack', 'hive', 'bee', 'honey',
  ];
  const ENV_BY_CUE = [
    { re: /\bzoo|lion|monkey|elephant|giraffe|zebra|tiger|hippo\b/i, key: 'story-env-zoo' },
    { re: /\bclassroom|teacher|student|school\b/i, key: 'story-env-classroom' },
    { re: /\bhome|bedroom|family\b/i, key: 'story-env-home' },
    { re: /\bwoods|forest|camp|camping\b/i, key: 'story-env-woods' },
    { re: /\bsoccer|football|pitch\b/i, key: 'story-env-soccer-field' },
    { re: /\bbasketball|court\b/i, key: 'story-env-basketball-court' },
    { re: /\bocean|sea|beach\b/i, key: 'story-env-ocean' },
    { re: /\bpicnic|park|grass|outdoor\b/i, key: 'story-env-grass-field' },
  ];

  function words(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean);
  }

  function blob(lesson, page) {
    return [
      lesson && lesson.title,
      lesson && lesson.activity && lesson.activity.title,
      page && page.heading,
      page && page.visualTheme,
      page && page.visualCaption,
      page && page.text,
      ...words(lesson),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function hasAny(text, list) {
    return list.some((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text));
  }

  function isPreA1(meta) {
    return String((meta && meta.level) || '').toLowerCase() === 'pre-a1';
  }

  function propGet(key) {
    const PB = window.PropBank;
    return PB && typeof PB.get === 'function' ? PB.get(key) : null;
  }

  function resolveWord(word, seed) {
    const PB = window.PropBank;
    if (!PB || typeof PB.resolve !== 'function') return null;
    return PB.resolve({ word, seed: seed || '', family: PB.familyFor && PB.familyFor({ title: seed }) });
  }

  function availablePreA1Actions() {
    return PREA1_ACTION_KEYS
      .map((key) => propGet(key))
      .filter((p) => p && p.path)
      .slice(0, 6);
  }

  function preA1ActionLabel(key) {
    return String(key || '')
      .replace(/^prea1-verb-/, '')
      .replace(/-/g, ' ');
  }

  function activatePreA1(lesson, meta) {
    if (!lesson || typeof lesson !== 'object') return;
    if (!isPreA1(meta)) {
      delete lesson._preA1Live;
      delete lesson._preA1Actions;
      return;
    }
    lesson._preA1Live = true;
    const actions = availablePreA1Actions();
    lesson._preA1Actions = actions.map((p) => ({ key: p.key, word: preA1ActionLabel(p.key) }));
    if (!lesson.activity || typeof lesson.activity !== 'object') lesson.activity = {};
    if (!lesson.activity.title || /sentence|frame|comprehension|discussion/i.test(lesson.activity.title)) {
      lesson.activity.title = 'Listen, Point, Do';
    }
    lesson.activity.prompt = 'Teacher says a word. Students point, choose, then do the action.';
    lesson.activity.templates = ['Look.', 'Point.', 'Do it.'];
    lesson.sentenceFrames = [];
    if (lesson.story && Array.isArray(lesson.story.comprehensionQuestions)) {
      lesson.story.comprehensionQuestions = [];
    }
    if (lesson.story && Array.isArray(lesson.story.creativeQuestions)) {
      lesson.story.creativeQuestions = [];
    }
  }

  function semanticHeroIntent(lesson) {
    const text = blob(lesson, null);
    if (!text) return null;
    if (/\b(badminton|racket|shuttlecock|shuttle|court)\b/i.test(text)) return null;
    if (hasAny(text, ZOO_WORDS) && !/\bfeed(?:ing)?\s+(?:the\s+)?(hippo|monster|bird)\b/i.test(text)) return null;

    // Narrow convenience intents must never outrank a resolved topic king.
    // "smile" in a dentist lesson used to pin face-blank before findHeroProp
    // could select the open-mouth patient. The topic resolver owns that choice.
    const LT = window.LessonTraits;
    const theme = LT && typeof LT.resolveTheme === 'function'
      ? LT.resolveTheme(lesson)
      : null;
    if (theme && theme.heroKey && theme.heroKey !== 'face-blank') return null;

    if (hasAny(text, FACE_WORDS)) {
      return { key: 'face-blank', mechanic: 'customize', reason: 'face-feature practice' };
    }
    if (hasAny(text, FOOD_WORDS) && /\b(lunch|meal|snack|food|foods|eat|choose|tray|cafeteria)\b/i.test(text)) {
      return { key: 'hero-lunch-tray', mechanic: 'choose/place food', reason: 'food choice surface' };
    }
    return null;
  }

  function activateHeroIntent(lesson) {
    if (!lesson || typeof lesson !== 'object') return;
    const intent = semanticHeroIntent(lesson);
    if (!intent || !propGet(intent.key)) {
      delete lesson._heroPropIntent;
      if (lesson.activity && lesson.activity.heroProp) delete lesson.activity.heroProp;
      return;
    }
    lesson._heroPropIntent = intent;
    if (!lesson.activity || typeof lesson.activity !== 'object') lesson.activity = {};
    lesson.activity.heroProp = { key: intent.key, mechanic: intent.mechanic };
  }

  function chooseEnv(lesson, page) {
    const text = blob(lesson, page);
    for (const rule of ENV_BY_CUE) {
      if (!rule.re.test(text)) continue;
      const hit = propGet(rule.key);
      if (hit && hit.path) return hit;
    }
    return null;
  }

  function firstCast(who, pose) {
    const p = pose || 'idle';
    const key = `cast-${who}-${p}-happy`;
    if (propGet(key)) return { who, pose: p, emotion: 'happy' };
    const neutral = `cast-${who}-${p}-neutral`;
    if (propGet(neutral)) return { who, pose: p, emotion: 'neutral' };
    return null;
  }

  function NA() {
    return window.NounArticles || null;
  }

  /** "a shell" / "the sand" / "some milk" — never "a sand". */
  function np(word, prefer) {
    const api = NA();
    if (api && typeof api.nounPhrase === 'function') {
      return api.nounPhrase(word, prefer ? { prefer } : undefined);
    }
    const w = String(word || '').trim();
    if (!w) return '';
    return /^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`;
  }

  function seesLine(whoName, word) {
    const api = NA();
    if (api && typeof api.seesNoun === 'function') {
      return `${whoName} ${api.seesNoun(word)}`;
    }
    return `${whoName} sees ${np(word)}`;
  }

  function givesLine(whoName, receiver, word) {
    // Mass nouns: "gives Leo milk" / countable: "gives Leo a shell"
    const api = NA();
    if (api && typeof api.isMassNoun === 'function' && api.isMassNoun(word)) {
      return `${whoName} gives ${receiver} ${api.nounPhrase(word, { prefer: 'some' })}`;
    }
    if (api && typeof api.isPluralNoun === 'function' && api.isPluralNoun(word)) {
      return `${whoName} gives ${receiver} ${api.nounPhrase(word, { prefer: 'some' })}`;
    }
    return `${whoName} gives ${receiver} ${np(word)}`;
  }

  /**
   * Prefer countable pictured vocab for "sees a ___": sand/ocean as mass heads
   * produce illegal "a sand" and weak A1 practice.
   */
  function chooseStoryObject(lesson, page) {
    const text = blob(lesson, page);
    const candidates = [...words(lesson), ...STORY_OBJECTS];
    const api = NA();
    const scored = [];
    const seen = new Set();
    for (const raw of candidates) {
      const word = String(raw || '').toLowerCase().trim();
      if (!word || seen.has(word)) continue;
      seen.add(word);
      if (!new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text)) continue;
      const hit = resolveWord(word, text);
      if (!(hit && hit.path)) continue;
      let score = 10;
      if (api && api.isMassNoun && api.isMassNoun(word)) score -= 6;
      if (api && api.isPluralNoun && api.isPluralNoun(word)) score -= 2;
      // Prefer concrete dockable objects over scene umbrellas.
      if (/^(beach|ocean|sea|zoo|park|school|home)$/i.test(word)) score -= 4;
      scored.push({ word, prop: hit, score });
    }
    scored.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    return scored.length ? { word: scored[0].word, prop: scored[0].prop } : null;
  }

  function bindStoryPage(lesson, page, index, meta) {
    if (!page || page.storyScene) return null;
    const object = chooseStoryObject(lesson, page);
    const env = chooseEnv(lesson, page);
    const text = blob(lesson, page);
    const transfer = /\b(give|gives|gave|hand|hands|share|shares|show|shows)\b/i.test(text);
    if (transfer && object) {
      const giver = firstCast('mia', 'reach');
      const receiver = firstCast('leo', 'reach');
      if (giver && receiver) {
        const whoName = 'Mia';
        const envKey = env && env.key;
        const give = givesLine(whoName, 'Leo', object.word);
        return {
          scene: {
            templateId: 'exchange',
            actionVerb: 'gives',
            environmentKey: envKey || undefined,
            slots: {
              giver,
              receiver,
              item: { propKey: object.prop.key, scaleClass: 'held' },
            },
          },
          caption: `${give}.`,
          text: isPreA1(meta)
            ? `${give}. Point.`
            : `${give}. Leo smiles.`,
        };
      }
    }
    const actor = firstCast(index % 2 ? 'leo' : 'mia', 'idle');
    if (!actor || (!object && !env)) return null;

    const whoName = actor.who === 'leo' ? 'Leo' : 'Mia';
    if (env && object) {
      const scene = {
        templateId: 'locationActivity',
        actionVerb: 'sees',
        slots: {
          backdrop: { propKey: env.key, scaleClass: 'envBackdrop' },
          actor,
          prop: { propKey: object.prop.key },
        },
      };
      const place = env.key.replace(/^story-env-/, '').replace(/-/g, ' ');
      const see = seesLine(whoName, object.word);
      return {
        scene,
        caption: `${see} at the ${place}.`,
        text: isPreA1(meta)
          ? `${see}. Point to the ${object.word}.`
          : `${see}. Look and say: ${object.word}.`,
      };
    }
    if (object) {
      const see = seesLine(whoName, object.word);
      return {
        scene: {
          templateId: 'charObject',
          actionVerb: 'sees',
          slots: {
            actor,
            object: { propKey: object.prop.key },
          },
        },
        caption: `${see}.`,
        text: isPreA1(meta)
          ? `${see}. Point.`
          : `${see}. Say: ${object.word}.`,
      };
    }
    return {
      scene: {
        templateId: 'locationActivity',
        actionVerb: 'sees',
        slots: {
          backdrop: { propKey: env.key, scaleClass: 'envBackdrop' },
          actor,
        },
      },
      caption: `${whoName} is at the ${env.key.replace(/^story-env-/, '').replace(/-/g, ' ')}.`,
      text: `${whoName} is here. Look.`,
    };
  }

  function activateStoryScenes(lesson, meta) {
    const pages = lesson && lesson.story && Array.isArray(lesson.story.pages) ? lesson.story.pages : [];
    if (!pages.length) return;
    let count = 0;
    const level = String((meta && meta.level) || lesson.level || '').toLowerCase();
    pages.forEach((page, index) => {
      const bound = bindStoryPage(lesson, page, index, meta);
      if (!bound) return;
      page.storyScene = bound.scene;
      const existing = String((page && page.text) || '').replace(/\s+/g, ' ').trim();
      const mustRewrite = storyTextNeedsBridgeRewrite(existing, bound, meta, level);
      if (mustRewrite) {
        page.visualCaption = bound.caption;
        page.text = bound.text;
      } else {
        // Keep CEFR-authored prose (B1 volcano / beach paragraphs). Still attach
        // the bound scene so StoryScene can compose — do not infantilize the text.
        if (!String(page.visualCaption || '').trim()) page.visualCaption = bound.caption;
      }
      count += 1;
    });
    if (count) lesson._storySceneBridge = { count };
  }

  /**
   * Pre-A1 always uses bridge lines. A1 rewrites unsupported/unbound claims.
   * A2/B1/B2 keep complete authored paragraphs (producer was destroying B1
   * volcano/beach stories into "Mia sees a X. Look and say: X.").
   */
  function storyTextNeedsBridgeRewrite(existing, bound, meta, level) {
    if (isPreA1(meta)) return true;
    if (!existing || existing.length < 20) return true;
    if (/look and say:|point to the\b/i.test(existing)) return false;
    const starter = !level || level === 'a1' || level === 'pre-a1';
    if (!starter) {
      // A2+: keep complete multi-word prose ending in sentence punctuation.
      if (/[.!?…]/.test(existing) && existing.length >= 40) return false;
    }
    // A1 (and thin A2): rewrite when text claims unsupported motion or unnamed "girl/boy"
    // while the bound beat is a sees/gives cast scene (P0 bounce/kick tests).
    const verb = bound && bound.scene && bound.scene.actionVerb;
    if (verb === 'sees' || verb === 'gives') {
      if (/\b(bounces?|kicks?|kick|jumps?|flies|fly|runs?|running)\b/i.test(existing)) return true;
      if (/\b(girl|boy|child|children)\b/i.test(existing) && /\b(Mia|Leo)\b/.test(bound.text || '')) {
        return true;
      }
    }
    // A1 with short caption-like text — prefer bound line for honesty with props.
    if (starter && existing.length < 48) return true;
    return false;
  }

  function normalize(lesson, meta) {
    if (!lesson || typeof lesson !== 'object') return lesson || {};
    if (meta && meta.level && !lesson.level) lesson.level = meta.level;
    activatePreA1(lesson, meta || {});
    activateHeroIntent(lesson);
    activateStoryScenes(lesson, meta || {});
    return lesson;
  }

  window.ProducerBridge = {
    PREA1_ACTION_KEYS,
    normalize,
    isPreA1,
    availablePreA1Actions,
    semanticHeroIntent,
  };
})();
