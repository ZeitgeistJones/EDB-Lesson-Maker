// server.js
// Optional: only used for LOCAL development (`npm start`). When deployed to
// Vercel, this file is ignored — Vercel runs api/generate-lesson.js as a
// Serverless Function instead and serves public/ statically. Kept here so
// you can still `npm start` and test on http://localhost:3000 without Vercel.
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const PhonicsPolicy = require('./public/lib/phonicsPolicy.js');
const StoryIntegrity = require('./public/lib/storyIntegrity.js');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const APP_RUNS_DIR = path.join(__dirname, 'tmp', 'app-runs');
// Flash-Lite handles structured JSON well and is less capacity-starved than
// the newest flagship Flash models. Override with GEMINI_MODEL if needed.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// A bare "A2 level" leaves the model guessing, and neighbouring bands come back
// nearly identical without a concrete grammar range to aim at.
// Mirrored in api/generate-lesson.js — keep both in step.
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

app.use(express.json());
app.use(express.static('public'));

if (!API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY is not set. /api/generate-lesson will return an error until you set it in .env');
}

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
              storyScene: {
                type: 'object',
                description: 'Optional deterministic story scene: templateId, actionVerb, and named slots only.',
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

app.post('/api/generate-lesson', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to your .env file and restart.' });
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
- Prefer 5 strong primary concepts over 6–7 with a weak extra. Do not pad with parent-setting filler, generic verbs, or generic classroom actions just to complete a quota. Verbs are OK only when they are deliberate targets for TPR, routines, sports/playground, or another action-focused topic.

Also generate a short illustrated story tied to the topic:
- story.title: a catchy story title
- story.pages: EXACTLY ${counts.storyPages} pages. Each page needs heading, text (2–4 short paragraphs suitable for ${safeLevel} learners; use some lesson vocabulary), visualTheme (exactly one of: park, school, home, city, beach, nature, kitchen, sports), and visualCaption (short scene label)
- Optional story.pages[].storyScene may use existing deterministic templates only: charObject, dialogue, exchange, action, group3, travel, heroFocus, locationActivity. Visual honesty rule: caption/text may mention only characters, action, environment, and props bound in storyScene slots. If exact action is unsupported, simplify both scene and text to a supported action such as sees, holds, points, talks, or walks.
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

CEFR grammar for sentenceFrames:
- Pre-A1: single words and memorized chunks only; no grammar explanation.
- A1–A2: present simple, can, like/want, basic past if needed. No second conditional.
- B1: opinions with because, first conditional (If + present, will/can…), "I would like to ___". Prefer "If I am a musician, I will use ___ to …" over bare "If I were…" unless the blank itself teaches the form.
- B2+: second conditional OK when intentional.

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

      return res.json({ lesson, level: safeLevel, duration: safeDuration });
    }

    return res.status(lastError?.status || 503).json({
      error: lastError?.message || 'All Gemini models are currently unavailable. Try again shortly.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reach Gemini API. Check server network/logs.' });
  }
});

/**
 * Local-only run log for testing loops. Writes JSON under tmp/app-runs/
 * (gitignored). Fire-and-forget from the browser after readiness assess /
 * download. No-op-safe if the folder can't be created.
 */
// Optional story illustrations (STORY_ART=1). Same handler as Vercel serverless.
app.post('/api/generate-story-art', (req, res) => {
  require('./api/generate-story-art')(req, res);
});

app.post('/api/log-run', (req, res) => {
  try {
    fs.mkdirSync(APP_RUNS_DIR, { recursive: true });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const ts = new Date().toISOString();
    const stamp = ts.replace(/[:.]/g, '-');
    const titleSlug = String(body.title || body.topic || 'lesson')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'lesson';
    const event = String(body.event || 'preview').replace(/[^a-z0-9_-]/gi, '') || 'preview';
    const record = {
      ts,
      event,
      title: body.title || null,
      topic: body.topic || null,
      level: body.level || null,
      duration: body.duration || null,
      readiness: body.readiness || null,
      activityRecipe: body.activityRecipe || (body.readiness && body.readiness.activityRecipe) || null,
      kit: body.kit || (body.readiness && body.readiness.kit) || null,
      vocabArt: body.vocabArt || (body.readiness && body.readiness.vocabArt) || null,
      reasons: body.reasons || (body.readiness && body.readiness.reasons) || [],
      // Compact lesson fingerprint — not the full Gemini dump.
      vocab: Array.isArray(body.vocab) ? body.vocab.slice(0, 20) : null,
      warmUp: body.warmUp || null,
      activityTitle: body.activityTitle || null,
    };
    const file = path.join(APP_RUNS_DIR, `${stamp}_${event}_${titleSlug}.json`);
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
    fs.writeFileSync(path.join(APP_RUNS_DIR, 'latest.json'), JSON.stringify(record, null, 2));
    res.json({ ok: true, file: path.relative(__dirname, file) });
  } catch (err) {
    console.warn('log-run failed', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ClassIn Lesson Builder running at http://localhost:${PORT}`);
});
