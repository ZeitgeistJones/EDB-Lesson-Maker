/**
 * POST /api/generate-story-art
 *
 * Generates one style-locked illustration per story page for ESL boards.
 * Gated by STORY_ART=1 and GEMINI_API_KEY. Partial success is OK — null
 * pages fall back to quiet flats / emoji side art in the client.
 *
 * Body: { title, level?, pages: [{ index, heading, text, visualCaption }] }
 * Returns: { pages: [{ index, dataUrl|null, reason? }], styleRef?: dataUrl }
 */
const API_KEY = process.env.GEMINI_API_KEY;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const PER_IMAGE_MS = Number(process.env.STORY_ART_TIMEOUT_MS) || 45000;
const MAX_PAGES = 3;

function storyArtEnabled() {
  const v = String(process.env.STORY_ART || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}

function stylePrompt(title, level) {
  const lvl = level || 'A1';
  return `Create a STYLE REFERENCE sheet for a children's ESL storybook about "${title || 'a lesson'}".
Flat soft gouache wash, warm friendly palette, simple shapes, culturally generic characters and settings.
Aimed at ${lvl} young learners. Leave large empty areas — this is a palette/style sample, not a finished scene.
Absolutely no text, letters, numbers, signs, logos, or writing of any kind.`;
}

function pagePrompt(page, title) {
  const caption = page.visualCaption || page.heading || 'scene';
  const text = String(page.text || '').slice(0, 600);
  return `Image 1 is a STYLE REFERENCE only — match its flat children's-book gouache wash, color palette, and simple shapes. Do not copy its composition.

Paint ONE literal story illustration for this ESL reading page (title: "${title || 'Story'}"):
Scene label: ${caption}
Story text to depict literally (not metaphorically): ${text}

Rules:
- Uncluttered composition suitable for young A1–A2 learners
- Culturally generic, friendly, warm
- Absolutely no text, letters, numbers, signs, logos, captions, or writing of any kind
- Do not invent extra busy details that fight the reading`;
}

async function geminiJson(model, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      }
    );
    const raw = await resp.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: { message: raw.slice(0, 300) || `Non-JSON (${resp.status})` } };
    }
    return { resp, data };
  } finally {
    clearTimeout(timer);
  }
}

function firstInlineImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p.inlineData && p.inlineData.data) {
      const mime = p.inlineData.mimeType || 'image/png';
      return {
        mime,
        base64: p.inlineData.data,
        dataUrl: `data:${mime};base64,${p.inlineData.data}`,
      };
    }
  }
  return null;
}

async function generateImage(parts, aspectRatio) {
  const { resp, data } = await geminiJson(
    IMAGE_MODEL,
    {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: aspectRatio || '4:3', imageSize: '1K' },
      },
    },
    PER_IMAGE_MS
  );
  if (!resp.ok) {
    return { ok: false, reason: data?.error?.message || `image HTTP ${resp.status}` };
  }
  const img = firstInlineImage(data);
  if (!img) {
    const block = data?.promptFeedback?.blockReason;
    return { ok: false, reason: block ? `blocked:${block}` : 'no image in response' };
  }
  return { ok: true, ...img };
}

async function hasLegibleText(img) {
  const { resp, data } = await geminiJson(
    VISION_MODEL,
    {
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: img.mime, data: img.base64 } },
          {
            text:
              'Does this image contain any legible text, letters, numbers, written words, or readable signs? ' +
              'Answer with exactly YES or NO.',
          },
        ],
      }],
    },
    Math.min(PER_IMAGE_MS, 20000)
  );
  if (!resp.ok) {
    // Fail open on vision errors would risk garbled literacy art — fail closed.
    return { reject: true, reason: data?.error?.message || `vision HTTP ${resp.status}` };
  }
  const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
    .trim()
    .toUpperCase();
  if (text.startsWith('YES') || /\bYES\b/.test(text)) {
    return { reject: true, reason: 'legible-text' };
  }
  if (text.startsWith('NO') || /\bNO\b/.test(text)) {
    return { reject: false };
  }
  return { reject: true, reason: `vision-unclear:${text.slice(0, 40)}` };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!storyArtEnabled()) {
    return res.status(403).json({
      error: 'Story art is disabled. Set STORY_ART=1 on the server to enable.',
      disabled: true,
    });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  const body = req.body || {};
  const title = typeof body.title === 'string' ? body.title : 'Story';
  const level = typeof body.level === 'string' ? body.level : 'A1';
  const pagesIn = Array.isArray(body.pages) ? body.pages.slice(0, MAX_PAGES) : [];
  if (!pagesIn.length) {
    return res.status(400).json({ error: 'Missing pages[] for story art.' });
  }

  const multi = pagesIn.length > 1;
  const aspect = multi ? '3:4' : '16:9';

  try {
    const styleRes = await generateImage(
      [{ text: stylePrompt(title, level) }],
      '1:1'
    );
    if (!styleRes.ok) {
      return res.status(502).json({
        error: `Style reference failed: ${styleRes.reason}`,
        pages: pagesIn.map((p) => ({
          index: Number(p.index) || 0,
          dataUrl: null,
          reason: 'style-failed',
        })),
      });
    }

    const styleCheck = await hasLegibleText(styleRes);
    let styleRef = styleRes;
    if (styleCheck.reject) {
      // Retry style once without accepting texty sheet
      const retry = await generateImage(
        [{ text: stylePrompt(title, level) + '\nReminder: ZERO text or letters. No color labels, no alphabet samples.' }],
        '1:1'
      );
      if (retry.ok) {
        const retryCheck = await hasLegibleText(retry);
        if (!retryCheck.reject) styleRef = retry;
        else styleRef = null;
      } else {
        styleRef = null;
      }
    }

    // If style lock failed the text gate, still try page arts with prompt-only
    // style (better than blanking the whole lesson).
    const outPages = [];
    for (const page of pagesIn) {
      const index = Number.isFinite(Number(page.index)) ? Number(page.index) : outPages.length;
      try {
        const parts = styleRef
          ? [
              {
                text:
                  'Image 1 = style reference: flat children\'s-book gouache wash, warm palette. ' +
                  'Apply this style; do not copy composition.',
              },
              { inlineData: { mimeType: styleRef.mime, data: styleRef.base64 } },
              { text: pagePrompt(page, title) },
            ]
          : [{
              text:
                pagePrompt(page, title) +
                '\nStyle (no reference image available): flat children\'s-book gouache wash, warm palette, soft simple shapes.',
            }];
        const gen = await generateImage(parts, aspect);
        if (!gen.ok) {
          outPages.push({ index, dataUrl: null, reason: gen.reason });
          continue;
        }
        const gate = await hasLegibleText(gen);
        if (gate.reject) {
          outPages.push({ index, dataUrl: null, reason: gate.reason });
          continue;
        }
        outPages.push({
          index,
          dataUrl: gen.dataUrl,
          reason: styleRef ? undefined : 'prompt-only-style',
        });
      } catch (err) {
        const reason = err?.name === 'AbortError' ? 'timeout' : (err.message || 'page-failed');
        outPages.push({ index, dataUrl: null, reason });
      }
    }

    return res.json({
      model: IMAGE_MODEL,
      styleRef: styleRef ? styleRef.dataUrl : null,
      pages: outPages,
    });
  } catch (err) {
    console.error('generate-story-art', err);
    const reason = err?.name === 'AbortError' ? 'timeout' : 'Failed to reach Gemini image API.';
    return res.status(500).json({ error: reason });
  }
};
