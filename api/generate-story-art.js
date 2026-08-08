/**
 * POST /api/generate-story-art
 *
 * Generates one style-locked illustration per story page for ESL boards.
 * Gated by STORY_ART=1 and GEMINI_API_KEY. Partial success is OK — null
 * pages fall back to quiet flats / emoji side art in the client.
 *
 * Disk cache (tmp/story-art-cache/<hash>/) avoids re-billing the same
 * lesson fingerprint. Set STORY_ART_CACHE=0 to disable.
 *
 * Body: { title, level?, pages: [{ index, heading, text, visualCaption }] }
 * Returns: { pages: [{ index, dataUrl|null, reason? }], styleRef?: dataUrl, cacheKey?, cacheHit? }
 */
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const PER_IMAGE_MS = Number(process.env.STORY_ART_TIMEOUT_MS) || 45000;
const MAX_PAGES = 3;
const ROOT = path.resolve(__dirname, '..');
const CACHE_ROOT = path.join(ROOT, 'tmp', 'story-art-cache');

function storyArtEnabled() {
  const v = String(process.env.STORY_ART || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}

function cacheEnabled() {
  const v = String(process.env.STORY_ART_CACHE || '1').trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off');
}

/** Stable fingerprint shared with scripts/verify + illustrate-fixture. */
function cacheKeyFor(title, level, pages) {
  const raw = JSON.stringify({
    model: IMAGE_MODEL,
    title: title || '',
    level: level || '',
    pages: (pages || []).map((p) => ({
      i: Number(p.index) || 0,
      t: String(p.text || ''),
      c: String(p.visualCaption || ''),
      h: String(p.heading || ''),
    })),
  });
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'sa_' + (h >>> 0).toString(16);
}

function extFromMime(mime) {
  if (/jpeg|jpg/i.test(mime || '')) return 'jpg';
  if (/webp/i.test(mime || '')) return 'webp';
  return 'png';
}

function dataUrlToParts(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2], dataUrl };
}

function fileToDataUrl(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg'
    ? 'image/jpeg'
    : ext === '.webp'
      ? 'image/webp'
      : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function loadCachedResult(cacheKey) {
  if (!cacheEnabled() || !cacheKey) return null;
  const dir = path.join(CACHE_ROOT, cacheKey);
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
  const pages = (meta.pages || []).map((p) => {
    if (!p || !p.ok || !p.file) {
      return { index: Number(p && p.index) || 0, dataUrl: null, reason: (p && p.reason) || 'cache-miss-page' };
    }
    const dataUrl = fileToDataUrl(path.join(dir, p.file));
    if (!dataUrl) {
      return { index: Number(p.index) || 0, dataUrl: null, reason: 'cache-file-missing' };
    }
    return { index: Number(p.index) || 0, dataUrl, reason: p.reason || undefined };
  });
  const hits = pages.filter((p) => p.dataUrl).length;
  if (!hits) return null;
  let styleRef = null;
  if (meta.styleRefFile) styleRef = fileToDataUrl(path.join(dir, meta.styleRefFile));
  return {
    model: meta.model || IMAGE_MODEL,
    styleRef,
    pages,
    cacheKey,
    cacheHit: true,
  };
}

function writeCachedResult(cacheKey, result) {
  if (!cacheEnabled() || !cacheKey || !result) return;
  const hits = (result.pages || []).filter((p) => p && p.dataUrl).length;
  if (!hits) return;
  const dir = path.join(CACHE_ROOT, cacheKey);
  fs.mkdirSync(dir, { recursive: true });
  const metaPages = [];
  for (const p of result.pages || []) {
    const index = Number(p.index) || 0;
    if (!p.dataUrl) {
      metaPages.push({ index, ok: false, reason: p.reason || 'null' });
      continue;
    }
    const parts = dataUrlToParts(p.dataUrl);
    if (!parts) {
      metaPages.push({ index, ok: false, reason: 'bad-data-url' });
      continue;
    }
    const file = `page-${index}.${extFromMime(parts.mime)}`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(parts.base64, 'base64'));
    metaPages.push({ index, ok: true, file, reason: p.reason || undefined });
  }
  let styleRefFile = null;
  if (result.styleRef) {
    const parts = dataUrlToParts(result.styleRef);
    if (parts) {
      styleRefFile = `style-ref.${extFromMime(parts.mime)}`;
      fs.writeFileSync(path.join(dir, styleRefFile), Buffer.from(parts.base64, 'base64'));
    }
  }
  fs.writeFileSync(
    path.join(dir, 'meta.json'),
    JSON.stringify({
      model: result.model || IMAGE_MODEL,
      styleRefFile,
      pages: metaPages,
      savedAt: new Date().toISOString(),
    }, null, 2)
  );
}

function stylePrompt(title, level) {
  const lvl = level || 'A1';
  return `Create a STYLE REFERENCE sheet for a children's ESL storybook about "${title || 'a lesson'}".
Flat soft gouache wash, warm friendly palette, simple shapes, culturally generic characters and settings.
Aimed at ${lvl} young learners. Leave large empty areas — this is a palette/style sample, not a finished scene.
Absolutely no text, letters, numbers, signs, logos, or writing of any kind.`;
}

function pagePrompt(page, title, level) {
  const caption = String(page.visualCaption || page.heading || 'scene').trim();
  const text = String(page.text || '').slice(0, 600);
  const lvl = level || 'A1';
  const feelingLead = caption.match(
    /^(worried|scared|confused|shy|surprised|happy|sad|angry|bored|sleepy|proud|silly|excited|tired|feelings?)\b/i
  );
  const emotionRule = feelingLead
    ? `- Show clear body language / facial expression for "${feelingLead[1].toLowerCase()}" (readable at small side-panel size)`
    : '- Prefer a concrete place + action the caption names (not abstract symbols)';
  return `Image 1 is a STYLE REFERENCE only — match its flat children's-book gouache wash, color palette, and simple shapes. Do not copy its composition.

Paint ONE literal story illustration for this ESL reading page (title: "${title || 'Story'}", level ${lvl}):
Scene label: ${caption}
Story text to depict literally (not metaphorically): ${text}

Rules:
- Uncluttered composition for a small story side panel / banner — one clear focal action
- Culturally generic, friendly, warm
${emotionRule}
- Depict the caption scene literally; do not invent ironic or adult subtext
- Absolutely no text, letters, numbers, signs, logos, captions, speech bubbles with writing, or writing of any kind
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

function buildPageParts(page, title, level, styleRef) {
  const prompt = pagePrompt(page, title, level);
  if (styleRef) {
    return [
      {
        text:
          'Image 1 = style reference: flat children\'s-book gouache wash, warm palette. ' +
          'Apply this style; do not copy composition.',
      },
      { inlineData: { mimeType: styleRef.mime, data: styleRef.base64 } },
      { text: prompt },
    ];
  }
  return [{
    text:
      prompt +
      '\nStyle (no reference image available): flat children\'s-book gouache wash, warm palette, soft simple shapes.',
  }];
}

async function generatePageArt(page, title, level, styleRef, aspect) {
  const parts = buildPageParts(page, title, level, styleRef);
  let gen = await generateImage(parts, aspect);
  if (!gen.ok) return { ok: false, reason: gen.reason };

  let gate = await hasLegibleText(gen);
  if (!gate.reject) {
    return {
      ok: true,
      ...gen,
      reason: styleRef ? undefined : 'prompt-only-style',
    };
  }

  // One retry with a harder no-text reminder (style sheet already retries once).
  const retryParts = buildPageParts(page, title, level, styleRef);
  retryParts.push({
    text: 'Reminder: ZERO text or letters anywhere. No signs, worksheets with writing, name tags, or alphabet.',
  });
  const retry = await generateImage(retryParts, aspect);
  if (!retry.ok) return { ok: false, reason: gate.reason };
  gate = await hasLegibleText(retry);
  if (gate.reject) return { ok: false, reason: gate.reason };
  return {
    ok: true,
    ...retry,
    reason: styleRef ? 'text-gate-retry' : 'prompt-only-style-retry',
  };
}

async function handler(req, res) {
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

  const force = !!(body.force || body.nocache);
  const cacheKey = cacheKeyFor(title, level, pagesIn);
  if (!force) {
    const hit = loadCachedResult(cacheKey);
    if (hit) {
      return res.json(hit);
    }
  }

  const multi = pagesIn.length > 1;
  const aspect = multi ? '3:4' : '16:9';

  try {
    // One story page: skip the paid style-reference image — nothing to lock across pages.
    // Prompt-only style keeps the look; saves ~1 image (+ possible text-gate retry).
    let styleRef = null;
    if (multi) {
      const styleRes = await generateImage(
        [{ text: stylePrompt(title, level) }],
        '1:1'
      );
      if (!styleRes.ok) {
        return res.status(502).json({
          error: `Style reference failed: ${styleRes.reason}`,
          cacheKey,
          pages: pagesIn.map((p) => ({
            index: Number(p.index) || 0,
            dataUrl: null,
            reason: 'style-failed',
          })),
        });
      }

      const styleCheck = await hasLegibleText(styleRes);
      styleRef = styleRes;
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
    }

    // If style lock failed the text gate, still try page arts with prompt-only
    // style (better than blanking the whole lesson).
    const outPages = [];
    for (const page of pagesIn) {
      const index = Number.isFinite(Number(page.index)) ? Number(page.index) : outPages.length;
      try {
        const gen = await generatePageArt(page, title, level, styleRef, aspect);
        if (!gen.ok) {
          outPages.push({ index, dataUrl: null, reason: gen.reason });
          continue;
        }
        outPages.push({
          index,
          dataUrl: gen.dataUrl,
          reason: gen.reason || (styleRef ? undefined : (multi ? 'prompt-only-style' : 'solo-prompt-style')),
        });
      } catch (err) {
        const reason = err?.name === 'AbortError' ? 'timeout' : (err.message || 'page-failed');
        outPages.push({ index, dataUrl: null, reason });
      }
    }

    const payload = {
      model: IMAGE_MODEL,
      styleRef: styleRef ? styleRef.dataUrl : null,
      pages: outPages,
      cacheKey,
      cacheHit: false,
    };
    writeCachedResult(cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error('generate-story-art', err);
    const reason = err?.name === 'AbortError' ? 'timeout' : 'Failed to reach Gemini image API.';
    return res.status(500).json({ error: reason, cacheKey });
  }
}

handler.cacheKeyFor = cacheKeyFor;
handler.loadCachedResult = loadCachedResult;
handler.writeCachedResult = writeCachedResult;
handler.CACHE_ROOT = CACHE_ROOT;
module.exports = handler;
