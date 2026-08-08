// api/generate-lesson.js
// Vercel Serverless Function. Same logic as the old Express route in
// server.js, just in Vercel's (req, res) handler shape. Vercel's Node
// runtime has global fetch built in, so node-fetch/express are not needed.
// GEMINI_API_KEY must be set in Vercel Project Settings -> Environment
// Variables, not in a committed .env file.

const PhonicsPolicy = require('../public/lib/phonicsPolicy.js');

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
  A1: 'A1 (beginner: present simple, 2–5 word sentences, concrete everyday nouns)',
  A2: 'A2 (elementary: past and future simple, short connected sentences)',
  B1: 'B1 (intermediate: opinions with reasons, common phrasal verbs)',
  B2: 'B2 (upper-intermediate: abstract topics, nuanced connectors, some idiom)',
  C1: 'C1 (advanced: precise register, strong collocation, implicit meaning)',
  C2: 'C2 (proficient: near-native subtlety, idiom and connotation)',
};

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
                description: 'One of: park, school, home, city, beach, nature, kitchen, sports',
              },
              visualCaption: { type: 'string' },
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
      },
      required: ['title', 'prompt', 'templates'],
    },
    reviewSentences: { type: 'array', items: { type: 'string' } },
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
  required: ['title', 'warmUp', 'vocabulary', 'sentenceFrames', 'story', 'speakingQuestions', 'activity', 'reviewSentences'],
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

Generate exactly: ${counts.vocab} vocabulary items, 4 sentenceFrames, ${counts.questions} speakingQuestions, 4 activity templates, 3 reviewSentences.

Also generate a short illustrated story tied to the topic:
- story.title: a catchy story title
- story.pages: EXACTLY ${counts.storyPages} pages. Each page needs heading, text (2–4 short paragraphs suitable for ${safeLevel} learners; use some lesson vocabulary), visualTheme (exactly one of: park, school, home, city, beach, nature, kitchen, sports), and visualCaption (short paint-able scene: who + where + action — concrete nouns a story illustration or PropBank cutout can depict; not abstract mood alone)
- story.comprehensionQuestions: EXACTLY ${counts.comprehension} reading comprehension questions about the story, each with a sampleAnswer
- story.creativeQuestions: EXACTLY 2 open-ended creative questions related to the story (imagining, personal connection, or continuing the story) — no sample answers
${phonicsBlock}

All content appropriate for ${safeLevel} ESL learners. Sentence frames and activity templates should contain a literal "___" blank.

CEFR grammar for sentenceFrames:
- A1–A2: present simple, can, like/want, basic past if needed. No second conditional.
- B1: opinions with because, first conditional (If + present, will/can…), "I would like to ___". Prefer "If I am a musician, I will use ___ to …" over bare "If I were…" unless the blank itself teaches the form.
- B2+: second conditional OK when intentional.

When the topic is feelings, emotions, or moods:
- Prefer abstract emotion vocabulary (worried, confused, shy, proud, surprised…) — not only happy/sad.
- Activity should be a two-round Feelings Lab (Round 1: build + say the feeling; Round 2: partner guesses, then produce a second-conditional line: If I felt ____, I would ____).
- story.visualCaption must lead with the feeling word then a short scene cue (e.g. "worried — Mia at her desk"), so art resolves to the emotion and teachers see the target word first.
- Include at least one inferential comprehension question (why / what do you think), not only literal recall.

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
