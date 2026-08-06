/* storyArt.js — session cache + fetch for realtime story illustrations.
 * Classic script → window.StoryArt
 */
(function () {
  const cache = new Map();

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

  function getCached(lesson, level) {
    return cache.get(cacheKey(lesson, level)) || null;
  }

  function setCached(lesson, level, result) {
    cache.set(cacheKey(lesson, level), result);
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
      };
      // Don't cache hard disables / missing key — allow retry after env change.
      if (!data.disabled && resp.status !== 500) setCached(lesson, level, result);
      return result;
    }

    const result = {
      pages: Array.isArray(data.pages) ? data.pages : [],
      styleRef: data.styleRef || null,
      model: data.model || null,
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
