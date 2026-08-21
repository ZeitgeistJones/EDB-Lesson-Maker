// api/generate-lesson.js
// Vercel Serverless Function. Same logic as the old Express route in
// server.js, just in Vercel's (req, res) handler shape. Vercel's Node
// runtime has global fetch built in, so node-fetch/express are not needed.
// GEMINI_API_KEY must be set in Vercel Project Settings -> Environment
// Variables, not in a committed .env file.

const PhonicsPolicy = require('../public/lib/phonicsPolicy.js');
const StoryIntegrity = require('../public/lib/storyIntegrity.js');

const API_KEY = process.env.GEMINI_API_KEY;
// Flash-Lite handles structured JSON well and is less capacity-starved than
// the newest flagship Flash models. Override with GEMINI_MODEL if needed.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
// Keep the fallback list short — each attempt can take several seconds and
// Vercel will kill the function (returning plain text, not JSON) if we exceed
// maxDuration while trying too many models.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// A bare "A2 level" leaves the model guessing, and neighbouring bands come back
// nearly identical without a concrete grammar range to aim at.
// Mirrored in server.js — keep both in step.
const CEFR_LEVELS = {
  'Pre-A1': 'Pre-A1 (starter: classroom language, single words, chunks, listen-and-point, trace/say routines)',
  A1: 'A1 (beginner: present simple, 2–5 word sentences, concrete everyday nouns)',
  A2: 'A2 (elementary: past and future simple, short connected sentences)',
  B1: 'B1 (intermediate: opinions with reasons, common phrasal verbs)',
  B2: 'B2 (upper-intermediate: abstract topics, nuanced connectors, some idiom)',
};

// Vocab counts may exceed the board ceiling (VocabArt.MAX_BOARD_VOCAB = 6).
// Board + teacher PDF teach an art-preferred 6 (VocabArt.adaptBoardVocabulary);
// overflow is a BoardReadiness draft reason — same topic, never silent theme drift.
const DURATION_COUNTS = {
  30: { vocab: 7, questions: 4, storyPages: 2, comprehension: 3 },
  60: { vocab: 12, questions: 7, storyPages: 3, comprehension: 4 },
};

const LESSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    warmUp: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        sampleAnswer: { type: 'string' },
      },
      required: ['question', 'sampleAnswer'],
    },
    vocabulary: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          emoji: { type: 'string' },
          sentence: { type: 'string' },
        },
        required: ['word', 'emoji', 'sentence'],
      },
    },
    sentenceFrames: { type: 'array', items: { type: 'string' } },
    story: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string' },
              text: { type: 'string' },
              visualTheme: {
                type: 'string',
                description:
                  'Place that matches THIS lesson topic (not a random mood). One of: park, school, home, city, beach, nature, kitchen, sports, circus, cafe, farm, space, hospital, dental, dentist, playground, castle, bathroom, camp, camping, fire, construction, aquarium, market, classroom',
              },
              visualCaption: { type: 'string' },
              storyScene: {
                type: 'object',
                description:
                  'Optional semantic scene for deterministic board compositor. Use only when all named things are actually bound in slots. No pixel coords.',
                properties: {
                  templateId: {
                    type: 'string',
                    enum: ['charObject', 'dialogue', 'exchange', 'action', 'group3', 'travel', 'heroFocus', 'locationActivity'],
                  },
                  actionVerb: { type: 'string' },
                  slots: { type: 'object' },
                },
              },
            },
            required: ['heading', 'text', 'visualTheme', 'visualCaption'],
          },
        },
        comprehensionQuestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              sampleAnswer: { type: 'string' },
            },
            required: ['question', 'sampleAnswer'],
          },
        },
        creativeQuestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['title', 'pages', 'comprehensionQuestions', 'creativeQuestions'],
    },
    speakingQuestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          sampleAnswer: { type: 'string' },
        },
        required: ['question', 'sampleAnswer'],
      },
    },
    activity: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        prompt: { type: 'string' },
        templates: { type: 'array', items: { type: 'string' } },
        boardArchetype: {
          type: 'string',
          enum: [
            'silhouetteGate',
            'halfTruth',
            'sceneRepair',
            'capacityPack',
            'routeMission',
            'transformationLab',
            'evidenceBoard',
          ],
          description:
            'Optional single activity grammar. Use only when its matching payload below is complete; otherwise omit.',
        },
        halfTruth: {
          type: 'object',
          properties: {
            claim: { type: 'string' },
            verdict: { type: 'string', enum: ['true', 'half', 'false'] },
            why: { type: 'string' },
            evidence: { type: 'array', items: { type: 'string' } },
          },
          required: ['claim', 'verdict', 'evidence'],
        },
        sceneRepair: {
          type: 'object',
          properties: {
            slotLabel: { type: 'string' },
            wrongWord: { type: 'string' },
            correctWord: { type: 'string' },
            distractors: { type: 'array', items: { type: 'string' } },
          },
          required: ['slotLabel', 'wrongWord', 'correctWord'],
        },
        capacityPack: {
          type: 'object',
          description:
            'A limited-pack mission with a visible condition: learner chooses exactly limit items, so options must outnumber the limit.',
          properties: {
            mission: { type: 'string' },
            constraint: { type: 'string' },
            containerLabel: { type: 'string' },
            payoff: { type: 'string' },
            limit: { type: 'number' },
            options: { type: 'array', items: { type: 'string' } },
            mustInclude: { type: 'array', items: { type: 'string' } },
          },
          required: ['mission', 'constraint', 'containerLabel', 'payoff', 'limit', 'options', 'mustInclude'],
        },
        routeMission: {
          type: 'object',
          description:
            'A 3–5 step mission with a named mover and materially ordered actions that create a real start-to-finish route.',
          properties: {
            mission: { type: 'string' },
            mover: {
              type: 'string',
              description: 'Short visible name for the person, team, animal, or vehicle moving along the route.',
            },
            goal: {
              type: 'string',
              description: 'Short visible destination label shown at FINISH.',
            },
            steps: { type: 'array', items: { type: 'string' } },
            landmarks: {
              type: 'array',
              items: { type: 'string' },
              description:
                'One short concrete landmark/tool label per step, paired to that movable card. Never print these in order on empty checkpoints.',
            },
            orderEvidence: {
              type: 'array',
              items: { type: 'string' },
              description:
                'One short dependency reason per transition (steps.length - 1) proving why the next action cannot reasonably come earlier.',
            },
            answerOrder: { type: 'array', items: { type: 'string' } },
          },
          required: ['mission', 'mover', 'goal', 'steps', 'landmarks', 'orderEvidence', 'answerOrder'],
        },
        transformationLab: {
          type: 'object',
          description:
            'A visible before → chosen cause → predicted and revealed result board. The correct cause must coherently produce the after state.',
          properties: {
            question: { type: 'string' },
            before: { type: 'string' },
            changes: { type: 'array', items: { type: 'string' } },
            correctChange: { type: 'string' },
            after: { type: 'string' },
          },
          required: ['question', 'before', 'changes', 'correctChange', 'after'],
        },
        evidenceBoard: {
          type: 'object',
          description:
            'A B1–B2 case file: learner ranks 3–4 sourced clues before revealing a grounded conclusion.',
          properties: {
            claim: { type: 'string' },
            evidence: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string', maxLength: 72 },
                  source: {
                    type: 'string',
                    maxLength: 26,
                    description: 'Short visible source artifact, e.g. Water sensor, Keeper log, Witness interview.',
                  },
                  artifactExcerpt: {
                    type: 'string',
                    maxLength: 48,
                    description: 'Literal inspectable fragment from that source, such as a timestamped log line, short quote, measurement, or image annotation.',
                  },
                  relation: {
                    type: 'string',
                    enum: ['supports', 'contradicts', 'qualifies', 'alternative'],
                  },
                  rationale: {
                    type: 'string',
                    maxLength: 56,
                    description: 'Short reason this source is more or less reliable/relevant to the claim.',
                  },
                  claimImpact: {
                    type: 'string',
                    maxLength: 68,
                    description: 'Short explanation of exactly how this clue strengthens, contradicts, limits, or offers an alternative to the claim.',
                  },
                  strength: { type: 'number' },
                },
                required: ['text', 'source', 'artifactExcerpt', 'relation', 'rationale', 'claimImpact', 'strength'],
              },
            },
            conclusion: { type: 'string' },
            reasoningFrame: { type: 'string' },
            teacherCheck: { type: 'string' },
          },
          required: ['claim', 'evidence', 'conclusion'],
        },
        mysteryHints: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional exactly 3 CEFR-safe peel hints for the mystery activity: [category, feature/use, near-giveaway]. Omit if unsure — the board fills templates. Never put the answer word in hints 1–2.',
        },
        oddOneOut: {
          type: 'object',
          description:
            'Optional odd-one-out activity: four pictured vocab options and which one does not belong. Prefer when ≥4 concrete nouns share a clear theme with one outsider.',
          properties: {
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Exactly 4 vocabulary words (three that fit a theme, one that does not).',
            },
            odd: {
              type: 'string',
              description: 'The option that does not belong (must be one of options).',
            },
            whyHint: {
              type: 'string',
              description: 'Optional teacher-facing why (not shown as the student answer).',
            },
          },
          required: ['options', 'odd'],
        },
        fixSentence: {
          type: 'object',
          description:
            'Optional fix-the-sentence activity: one short sentence with exactly one wrong word, plus the correct word and 1–2 short distractors. Prefer for grammar or any-topic lessons (no pictures required). Omit if unsure.',
          properties: {
            sentence: {
              type: 'string',
              description: 'The student-facing sentence containing exactly one wrong word (e.g. "She go to school.").',
            },
            wrong: {
              type: 'string',
              description: 'The single wrong word as it appears in sentence (must occur exactly once).',
            },
            correct: {
              type: 'string',
              description: 'The word that should replace wrong (must differ from wrong).',
            },
            distractors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional 1–2 short wrong-choice tiles (board vocab or common confusions).',
            },
          },
          required: ['sentence', 'wrong', 'correct'],
        },
      },
      required: ['title', 'prompt', 'templates'],
    },
    reviewSentences: { type: 'array', items: { type: 'string' } },
    topicBrief: {
      type: 'object',
      description:
        'Topic Identity Gate: primary topic grounding so a secondary setting (farm) never overpowers the requested topic (beekeeping).',
      properties: {
        topicId: {
          type: 'string',
          description: 'Kebab primary id (beekeeping, volcano, space) — NOT the parent category alone.',
        },
        topicLabel: { type: 'string' },
        requestedTopic: {
          type: 'string',
          description: 'Original requested topic string (may match topicLabel).',
        },
        specificTopicIdentity: {
          type: 'string',
          description: 'Specific educational identity (beekeeping), not the broader context (farm).',
        },
        parentCategories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Broader buckets (farm, outdoor, sports) that must not dominate visuals.',
        },
        broaderContext: {
          type: 'array',
          items: { type: 'string' },
          description: 'Alias of parentCategories — broader environment only.',
        },
        coreConcepts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exactly 6 primary teach/visual concepts for THIS topic (≥80% of vocab must come from here).',
        },
        supportingConcepts: { type: 'array', items: { type: 'string' } },
        primaryMotifs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Motifs that must dominate page identity (hive, bee, smoker).',
        },
        secondaryMotifs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Environmental only (farm field, barn silhouette) — never the main identity.',
        },
        primaryVisualMotifs: { type: 'array', items: { type: 'string' } },
        secondaryVisualMotifs: { type: 'array', items: { type: 'string' } },
        preferredPalette: { type: 'array', items: { type: 'string' } },
        backgroundCues: {
          type: 'object',
          properties: {
            preferSets: { type: 'array', items: { type: 'string' } },
            preferTags: { type: 'array', items: { type: 'string' } },
            avoidSets: { type: 'array', items: { type: 'string' } },
            allowSecondaryOn: {
              type: 'array',
              items: { type: 'string' },
              description: 'Page tags that may use secondary env: title, story, activity, wrap.',
            },
          },
        },
        forbiddenSubstitutes: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Hard reject as primary identity (tractor, cow, barn-hero when topic is beekeeping).',
        },
        likelyConfusions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Alias of forbiddenSubstitutes — near-miss concepts that must not replace core.',
        },
        weakSubstitutes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Demote / warn (lone flower, generic garden).',
        },
      },
      required: [
        'topicId',
        'topicLabel',
        'parentCategories',
        'coreConcepts',
        'primaryMotifs',
        'secondaryMotifs',
        'forbiddenSubstitutes',
      ],
    },
    phonics: {
      type: 'object',
      description: 'Optional sound-boxes page. Omit or null when not requested.',
      properties: {
        targetWords: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string' },
              graphemes: {
                type: 'array',
                items: { type: 'string' },
                description: 'One grapheme per sound box; digraphs stay together (sh, ch, th)',
              },
              topicRelevance: { type: 'string' },
              emoji: { type: 'string' },
            },
            required: ['word', 'graphemes'],
          },
        },
        distractors: {
          type: 'array',
          items: { type: 'string' },
          description: '4–6 single letters not used as sole answers',
        },
        teacherScript: {
          type: 'object',
          properties: {
            warmup: { type: 'string' },
            modeling: { type: 'string' },
            check: { type: 'string' },
          },
        },
      },
      required: ['targetWords'],
    },
  },
  required: ['title', 'warmUp', 'vocabulary', 'sentenceFrames', 'story', 'speakingQuestions', 'activity', 'reviewSentences', 'topicBrief'],
};

function modelCandidates() {
  return [...new Set([PRIMARY_MODEL, ...FALLBACK_MODELS])].slice(0, 2);
}

function isCapacityError(status, message) {
  const msg = String(message || '').toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    msg.includes('high demand') ||
    msg.includes('try again later') ||
    msg.includes('resource exhausted') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded')
  );
}

async function generateWithModel(model, prompt) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: LESSON_SCHEMA,
        },
      }),
    }
  );

  const raw = await resp.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { error: { message: raw.slice(0, 300) || `Non-JSON response from Gemini (${resp.status})` } };
  }
  return { resp, data };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it in Vercel Project Settings -> Environment Variables, then redeploy.' });
  }

  const { topic, level, focus, duration, phonics } = req.body || {};
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Missing "topic" in request body.' });
  }

  const safeLevel = CEFR_LEVELS[level] ? level : 'B1';
  const safeDuration = DURATION_COUNTS[String(duration)] ? String(duration) : '30';
  const focusLine = focus ? `\nSpecific focus: ${focus}.` : '';

  const counts = DURATION_COUNTS[safeDuration];
  const topicAsksPhonics = /\b(phonics|sounds?|blends?|sound\s*boxes?|cvc)\b/i.test(topic);
  const wantPhonics = PhonicsPolicy.autoWantPhonics(safeLevel, topicAsksPhonics, phonics);
  const phonicsBlock = PhonicsPolicy.promptBlock(safeLevel, wantPhonics);

  const prompt = `You are an expert ESL curriculum designer. Generate a ${safeDuration}-minute structured lesson about "${topic}" for ${CEFR_LEVELS[safeLevel]} English learners.${focusLine}

Generate ${Math.max(5, counts.vocab - 1)}–${counts.vocab} vocabulary items, 4 sentenceFrames, ${counts.questions} speakingQuestions, 4 activity templates, 3 reviewSentences.
The ClassIn board and teacher PDF teach at most 6 vocabulary items (art-preferred order at bake — put concrete picturable words early; extras may appear in speaking/story but will not get board cards unless promoted by coverage adapt).
Every vocabulary item MUST include a short example sentence using that word (In Sentences page is omitted when sentences are missing — bare word lists are not teachable on that page).
Story text must use every board vocabulary word at least once across story pages (aim-coverage — Manus: words that only appear as match labels never reach production).
Every sentenceFrame MUST contain a literal "___" blank (Frames page is omitted when there are no blanks).

TOPIC IDENTITY (required topicBrief — do this BEFORE choosing vocab/story art cues):
- topicId / topicLabel / requestedTopic / specificTopicIdentity = the PRIMARY requested topic (e.g. beekeeping), never only the parent setting (farm).
- coreConcepts: exactly 6 primary teach/visual concepts that belong to the primary topic (not the broader setting).
- HARD RULE: at least 80% of the main vocabulary list MUST be coreConcepts (or close morphological variants). Supporting/setting words may appear in story/discussion but must not crowd the teach list.
- HARD RULE: ship a strong teach list, not a padded count. Prefer 5 strong primary concepts over 6–7 with a weak extra. If you cannot find enough strong core concepts, stop at the lower end of the requested range — do not pad with parent-setting filler (farm for beekeeping), generic verbs, or generic classroom actions just to complete a quota. Do not omit central words used later in story/frames/activity.
- Parent-setting words (farm, clinic, outdoor…) are context — not primary vocabulary when a more specific topic was requested.
- parentCategories / broaderContext: broader buckets (farm, outdoor, sports) that MUST NOT overpower the primary.
- primaryMotifs / primaryVisualMotifs dominate visuals; secondaryMotifs / secondaryVisualMotifs are environmental only (field behind a hive).
- forbiddenSubstitutes / likelyConfusions: parent false friends that must not be the main identity (tractor/cow/barn for beekeeping; picnic for volcano; basketball for soccer).
- weakSubstitutes: peripheral associated words (garden/flower/suit) — demote; do not use them as the primary teach set.
- story.pages[].visualTheme must match the PRIMARY topic (or a close primary place), NOT a parent false friend.
- story text must naturally use several coreConcepts (not only the setting).
- activity title/prompt/templates must mention topic-core words (not a shell that could be reused unchanged on unrelated topics).
- If the topic is a niche under a parent (beekeeping under farm, archaeology under history), vocabulary and captions must be niche-first.
- Asset availability must NOT decide vocabulary — pick the right words first.

Also generate a short illustrated story tied to the topic:
- story.title: a catchy story title
- story.pages: EXACTLY ${counts.storyPages} pages. Each page needs heading, text (2–4 short paragraphs suitable for ${safeLevel} learners; use some lesson vocabulary), visualTheme (exactly one place label that matches THIS lesson topic — e.g. circus→circus, dentist→dental/dentist, basketball→sports, cafe→cafe, farm→farm, space→space, playground→playground, fruit market→market; never park/school/kitchen just because they are common), and visualCaption (short paint-able scene: who + where + action — concrete nouns a story illustration or PropBank cutout can depict; not abstract mood alone). Allowed visualTheme values: park, school, home, city, beach, nature, kitchen, sports, circus, cafe, farm, space, hospital, dental, dentist, playground, castle, bathroom, camp, camping, fire, construction, aquarium, market, classroom.
- Optional story.pages[].storyScene may use existing deterministic templates only: charObject, dialogue, exchange, action, group3, travel, heroFocus, locationActivity. Visual honesty rule: caption/text may mention only characters, action, environment, and props bound in storyScene slots. If exact action is unsupported, simplify both scene and text to a supported action such as sees, holds, points, talks, or walks. Never leave "kick/bounce/write" in visible text if the scene does not bind that action.
- story.comprehensionQuestions: EXACTLY ${counts.comprehension} reading comprehension questions about the story, each with a sampleAnswer
- story.creativeQuestions: EXACTLY 2 open-ended creative questions related to the story (imagining, personal connection, or continuing the story) — no sample answers
${StoryIntegrity.promptRules()}
${phonicsBlock}

All content appropriate for ${safeLevel} ESL learners. Sentence frames and activity templates should contain a literal "___" blank.

Pre-A1 path:
- Use SEE -> HEAR -> POINT/CHOOSE -> MOVE/MATCH -> IMITATE/ACT routines, one-word or 2–3 word chunks, and very concrete pictureable targets.
- Vocabulary may include deliberate TPR/classroom actions only when the topic is action/routine based; otherwise prefer visible people, objects, colors, shapes, feelings, body parts, animals, and classroom items.
- Story pages are tiny teacher-led picture beats, not reading passages. Keep story text to chantable lines and repeated chunks.
- Sentence frames should be empty or only oral chunks such as "I see ___." / "It is ___." / "I can ___." when a listed target fits the blank. Do not write reading-comprehension paragraphs or generic discussion prompts for Pre-A1.

warmUp.question must ELICIT prior knowledge and stay target-neutral: do NOT name or pre-cue any target vocabulary word (that gives the answer away before it is taught). Ask about the learner's own experience in general terms (e.g. "How are you feeling right now, and why?" / "Tell your partner about your morning."). Keep warmUp.sampleAnswer for the teacher only and free of the target vocabulary too.

CEFR grammar for sentenceFrames:
- Pre-A1: single words and memorized chunks only; no grammar explanation.
- A1–A2: present simple, can, like/want, basic past if needed. No second conditional.
- B1: opinions with because, first conditional (If + present, will/can…), "I would like to ___". Prefer "If I am a musician, I will use ___ to …" over bare "If I were…" unless the blank itself teaches the form.
- B2+: second conditional OK when intentional.
- EVERY blank must be completable by at least one vocabulary word as a grammatical fit (do NOT write "until I ___." when the bank is mostly nouns; rewrite the frame or include a verb in the bank). Grammar aim on the title must match the frames actually shipped (sequencing vs conditional vs opinion).
- a/an honesty: never write bare "a ____" or "an ____" when the vocab bank mixes vowel- and consonant-initial nouns (that teaches "a apple"). Prefer "a/an ____", "the ____", or plural "____s". Same rule for activity.templates.
- Speech-cue honesty: never end a frame with says/said/asks/told ____ unless a board vocab tile is itself a short speech word (hi/yes/go/stop) or a quoted phrase. Prefer action frames like "The coach blows the ____." / "I hear the ____." that a noun tile completes idiomatically.

ENGAGING ACTIVITY GRAMMAR (optional — choose AT MOST ONE complete grammar; omit boardArchetype and all payloads when none fits naturally):
- Do not default to identify/match/sort. Prefer a visible action that changes the board and leaves a useful record.
- capacityPack (A1–B1): a real mission, 3–6 short picturable options, integer limit 1–4, and options.length > limit. Add one short observable constraint (weather, route, budget, task, or audience), a 2–3 word containerLabel, a short topic-specific payoff describing what the full pack unlocks, and 1–2 mustInclude entries copied exactly from options whose need follows from that constraint. Include clearly useful and clearly excludable choices. The learner packs exactly the limit and explains exclusions; never hide the deciding rule in teacher-only metadata.
- When using capacityPack, make activity.title name its world or goal (for example "Rainy-night camp" or "Space video kit"), not generic "Pack the mission". Mission, constraint, containerLabel, mustInclude, and options must all describe that same world.
- routeMission (A1–B1): name one mover (person, team, animal, or vehicle), one short visible goal/destination, and write 3–5 short, materially ordered actions that carry that mover from a real START to that FINISH. steps are the movable cards; answerOrder contains those exact strings in correct order. landmarks must have exactly one distinct short concrete visual label paired to each movable step card (for example radio, flag trail, footbridge, rescue boat); the producer keeps empty checkpoints neutral so the ordered landmarks never leak the answer. orderEvidence must contain exactly steps.length - 1 short dependency reasons proving why each next action cannot reasonably happen earlier (for example "You need a ticket before entering the gate"). Reject disconnected facts, duplicate landmarks, and actions that could happen in any order.
- transformationLab (A2–B2): a concrete before state, 2–4 plausible cause choices in mixed order, one correctChange copied exactly from changes, and a concrete after consequence that follows specifically from that cause. The learner must be able to predict the after state and justify it with because before reveal; do not write a magic/instant simulation or make the correct answer consistently first. B2 should reason about cause, trade-off, or condition — not just use longer labels.
- evidenceBoard (B1–B2 only): one debatable claim, 3–4 concise evidence objects with distinct strength numbers, a source label, literal artifactExcerpt (timestamped log fragment, quote, measurement, or image annotation), relation, source-quality rationale, claimImpact, and a grounded conclusion. relation meanings are strict: supports strengthens the claim; contradicts cannot comfortably be true with the claim; qualifies narrows the claim or exposes a real limit; alternative offers another plausible cause. Include at least one supports clue and at least one contradicts/qualifies/alternative clue. Strength measures reliability + relevance, NOT whether a clue supports the claim: counter-evidence may be strongest and supporting evidence may be weak. NEVER mark a clue as counter-evidence merely because it is weaker, earlier, later, temporally adjacent, or incomplete. claimImpact must explicitly state the logical effect: opposition for contradicts, a real limit for qualifies, or another plausible cause/explanation for alternative. Evidence and artifact excerpts must come from the lesson/story, not invented outside facts. reasoningFrame must let learners compare source reliability/relevance; teacherCheck asks one observable source-quality question.
- halfTruth (A2–B2): claim + 2–4 visible evidence words + true/half/false verdict + why. Use when precision matters, not as disguised multiple choice.
- sceneRepair (A1–B1): one funny or consequential wrong item placed on purpose, one clearly better replacement, and optional distractors. Wrong/correct must be visibly and semantically different.
- silhouetteGate (A1–A2): use boardArchetype plus mysteryHints only for a concrete pictured noun with three staged hints. Pre-A1 keeps the TPR action path.
- One job per board. Never emit two of halfTruth, sceneRepair, capacityPack, routeMission, transformationLab, evidenceBoard on the same activity.

activity.fixSentence (optional; preferred non-king activity when you can write one clean single-error sentence):
- sentence: one short CEFR-safe line for ${safeLevel} with EXACTLY one wrong word already in it (e.g. "She go to school." or "I see a banana." when the lesson word is apple).
- wrong: that wrong word as it appears (must occur once). correct: the replacement (must differ). distractors: optional 1–2 short tiles from this lesson's vocabulary or common confusions.
- One error only — never two mistakes, never a full rewrite. Keep tiles short (≤14 letters). Omit if you cannot make a credible single-error item.

activity.mysteryHints (optional when the lesson has concrete picturable nouns but NOT a fixSentence and NOT a clear odd-one-out set):
- Exactly 3 short strings for a ClassIn peel-hint mystery: Hint 1 = broad category (e.g. "It is something you use in sports."), Hint 2 = a clear feature or use, Hint 3 = almost gives it away (first letter or a blanked sentence is OK).
- NEVER put the answer vocabulary word in Hint 1 or Hint 2. Keep CEFR-appropriate for ${safeLevel}.
- If the topic is abstract feelings-only with no object words, omit mysteryHints.

activity.oddOneOut (optional; used when fixSentence is omitted and ≥4 pictured words form a clear set):
- options: exactly 4 vocabulary words from this lesson — three that share a simple theme, one that does not belong.
- odd: which of the four is the outsider (must be one of options).
- whyHint: optional short **teacher-only** note (e.g. "Bus is transport; the others are food.") — never shown as the student write line. Students always get a blank scaffold ("It doesn't fit because ______.") unless whyHint itself contains "___".
- Omit if you cannot make a credible 3+1 set (do not force a stretch).

story.comprehensionQuestions:
- EXACTLY ${counts.comprehension} questions, each with sampleAnswer using ONLY words/facts from story.pages text (never invent places or details absent from the body — StoryIntegrity will drop ungrounded Qs and thin the board).
- Hard floor: keep ≥2 grounded questions after honesty checks (one literal recall + one detail/outcome or "what do you think"). Never ship a single-question comprehension page.
- Cover identity/recall AND at least one sequence, outcome, or inferential (why / what happens next) question.

When the topic is a place / concrete setting (circus, dentist, farm, sports, beach, playground, space, cafe, castle, camp, kitchen, …) or names a concrete subject (dinosaur, submarine, …):
- Prefer CONCRETE picturable nouns for vocabulary (objects, places, tools, animals kids can see on cards).
- Do NOT fill the main vocabulary list with abstract adjectives (spectacular, amusing, gigantic, clumsy, beautiful, amazing…) — those may appear inside story sentences only.
- Put the most picturable nouns first so the ClassIn board can show real icons.

When the topic is feelings, emotions, or moods:
- Prefer abstract emotion vocabulary (worried, confused, shy, proud, surprised…) — not only happy/sad.
- Activity should be a two-round Feelings Lab (Round 1: build + say the feeling; Round 2: partner guesses, then produce a second-conditional line: If I felt ____, I would ____).
- story.visualCaption must lead with the feeling word then a short scene cue (e.g. "worried — Mia at her desk"), so art resolves to the emotion and teachers see the target word first.
- Include at least one inferential comprehension question (why / what do you think), not only literal recall.
- warmUp.question must NOT contain any feeling/emotion target word (worried, scared, confused, shy, surprised, happy, sad, angry…): elicit the learner's current mood in target-neutral language before the words are taught.

Put comprehension under story.comprehensionQuestions (never only a top-level "comprehension" array). Put closing review lines in reviewSentences. Do not put teacher sample answers on student-facing copy fields.`;

  try {
    const models = modelCandidates();
    let lastError = null;

    for (const model of models) {
      const { resp, data } = await generateWithModel(model, prompt);
      if (!resp.ok) {
        const message = data?.error?.message || `Gemini API error (${resp.status})`;
        lastError = { status: resp.status, message };
        if (isCapacityError(resp.status, message) && model !== models[models.length - 1]) {
          console.warn(`Model ${model} busy (${resp.status}); trying fallback…`);
          continue;
        }
        return res.status(resp.status).json({ error: message });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const blockReason = data.promptFeedback?.blockReason;
        return res.status(502).json({ error: blockReason ? `Blocked by Gemini: ${blockReason}` : 'Empty response from model.' });
      }

      let lesson;
      try {
        lesson = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({ error: 'Model did not return valid JSON.' });
      }

      try {
        StoryIntegrity.repairLesson(lesson);
      } catch (e) {
        console.warn('storyIntegrity.repairLesson failed:', e && e.message);
      }

      return res.status(200).json({ lesson, level: safeLevel, duration: safeDuration });
    }

    return res.status(lastError?.status || 503).json({
      error: lastError?.message || 'All Gemini models are currently unavailable. Try again shortly.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reach Gemini API. Check function logs.' });
  }
};
