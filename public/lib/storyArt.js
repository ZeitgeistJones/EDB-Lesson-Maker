/* storyArt.js — session cache + fetch for realtime story illustrations.
 * Classic script → window.StoryArt
 *
 * Memory Map + sessionStorage so a refresh still hydrates board downloads
 * without re-billing Gemini for the same lesson fingerprint.
 *
 * Opportunistic only: BoardReadiness / Ready must not depend on StoryArt
 * succeeding. Caption + PropBank story plates are the reliable path; generative
 * panels are a bonus when the API is warm (quota/429 must not block Ready).
 */
(function () {
  const cache = new Map();
  // Single source of truth: public/lib/storyArtCacheVersion.js (also required by
  // api/generate-story-art.js). Bump THERE — not here — so client + server stay in lockstep.
  const CLIENT_CACHE_VERSION = (typeof window !== 'undefined' && window.STORY_ART_CACHE_VERSION)
    || 'v2-charlock';
  const STORAGE_PREFIX = `storyArt:${CLIENT_CACHE_VERSION}:`;

  function normalizePages(lesson) {
    const pages = (lesson && lesson.story && lesson.story.pages) || [];
    return pages.slice(0, 3).map((p, i) => ({
      index: i,
      heading: p.heading || '',
      text: p.text || '',
      visualCaption: p.visualCaption || p.visualTheme || '',
    }));
  }

  function cacheKey(lesson, level) {
    const pages = normalizePages(lesson);
    const raw = JSON.stringify({
      v: CLIENT_CACHE_VERSION,
      title: lesson && lesson.title,
      level: level || '',
      pages: pages.map((p) => ({
        t: p.text,
        c: p.visualCaption,
        h: p.heading,
      })),
    });
    // Simple stable hash — good enough for session Map keys.
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'sa_' + (h >>> 0).toString(16);
  }

  function readStorage(key) {
    try {
      if (!window.sessionStorage) return null;
      const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.pages)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeStorage(key, result) {
    try {
      if (!window.sessionStorage || !result) return;
      const hits = (result.pages || []).filter((p) => p && p.dataUrl).length;
      if (!hits) return;
      // Skip huge payloads that may blow sessionStorage (~5MB).
      const approx = JSON.stringify(result).length;
      if (approx > 4.5e6) return;
      window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({
        pages: result.pages,
        styleRef: result.styleRef || null,
        model: result.model || null,
        cacheKey: result.cacheKey || key,
      }));
    } catch (_) {
      /* quota / private mode — memory cache still works */
    }
  }

  function getCached(lesson, level) {
    const key = cacheKey(lesson, level);
    const mem = cache.get(key);
    if (mem) return mem;
    const stored = readStorage(key);
    if (stored) {
      cache.set(key, stored);
      return stored;
    }
    return null;
  }

  function setCached(lesson, level, result) {
    const key = cacheKey(lesson, level);
    cache.set(key, result);
    writeStorage(key, result);
    return result;
  }

  /**
   * POST /api/generate-story-art. Returns { pages, styleRef?, error? }.
   * Uses session cache when the same lesson fingerprint was already illustrated.
   */
  async function generate(lesson, meta, opts) {
    const level = (meta && meta.level) || '';
    if (!(opts && opts.force)) {
      const hit = getCached(lesson, level);
      if (hit) return hit;
    }

    const pages = normalizePages(lesson);
    if (!pages.length) {
      return { pages: [], skipped: true };
    }

    const resp = await fetch('/api/generate-story-art', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: (lesson && lesson.title) || (lesson && lesson.story && lesson.story.title) || 'Story',
        level,
        pages,
        force: !!(opts && opts.force),
      }),
    });
    const raw = await resp.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw.slice(0, 200) || `HTTP ${resp.status}` };
    }

    if (!resp.ok) {
      const result = {
        pages: pages.map((p) => ({ index: p.index, dataUrl: null, reason: data.error || `HTTP ${resp.status}` })),
        error: data.error || `HTTP ${resp.status}`,
        disabled: !!data.disabled,
        cacheKey: data.cacheKey || null,
      };
      // Don't cache hard disables/missing key OR transient failures. A 429
      // (rate limit) or 5xx (capacity/timeout/style-ref 502) is retryable —
      // memoizing it would blank story art for the WHOLE session off one blip,
      // since getCached would keep serving the dead dataUrl:null result until a
      // refresh clears the Map + sessionStorage. Only genuinely permanent
      // responses (e.g. 4xx bad-request) are safe to remember.
      const retryable = resp.status === 429 || resp.status >= 500;
      if (!data.disabled && !retryable) setCached(lesson, level, result);
      return result;
    }

    const result = {
      pages: Array.isArray(data.pages) ? data.pages : [],
      styleRef: data.styleRef || null,
      model: data.model || null,
      cacheKey: data.cacheKey || null,
      cacheHit: !!data.cacheHit,
    };
    setCached(lesson, level, result);
    return result;
  }

  window.StoryArt = {
    generate,
    getCached,
    setCached,
    cacheKey,
    normalizePages,
  };
})();
