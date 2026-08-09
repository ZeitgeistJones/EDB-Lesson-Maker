/* storyArtCacheVersion.js — SINGLE source of truth for StoryArt cache versioning.
 * Bump PROMPT_VERSION here whenever the server image prompt/flow or image model
 * changes. Client (storyArt.js) and server (api/generate-story-art.js) both read
 * this so a bump invalidates disk cache + browser sessionStorage together.
 *
 * Classic script → window.STORY_ART_CACHE_VERSION
 * Node: require + .version (CommonJS export below).
 */
(function (root) {
  const VERSION = 'v2-charlock';
  if (typeof window !== 'undefined') {
    window.STORY_ART_CACHE_VERSION = VERSION;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { version: VERSION, PROMPT_VERSION: VERSION };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
