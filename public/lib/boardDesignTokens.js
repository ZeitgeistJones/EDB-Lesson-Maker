/* boardDesignTokens.js — shared ClassIn board UI tokens (UI layer).
 *
 * Classic script — attaches window.BoardDesignTokens.
 * Theme packs may override palette values; token *names* stay stable.
 * Structure (zones/recipes) and Background (SceneBackgrounds) stay separate.
 */
(function () {
  const BRAND = '#17827C';

  /** Default school / board-house family. */
  const DEFAULT_PALETTE = {
    page_bg: '#F7F8FA',
    card_bg: '#FFFFFF',
    text_primary: '#0f172a',
    text_secondary: '#475569',
    accent_primary: BRAND,
    accent_secondary: '#0B3B38',
    border_soft: '#E2E8F0',
    hint_bg: 'rgba(255,255,255,0.88)',
    success: '#15803d',
    warning: '#b45309',
  };

  /** Quiet theme-family palette overrides (same token names). */
  const THEME_PALETTES = {
    ocean: {
      page_bg: '#EEF8F8',
      card_bg: '#FFFFFF',
      text_primary: '#13243A',
      text_secondary: '#5B6F82',
      accent_primary: '#198B9A',
      accent_secondary: '#F08C6C',
      border_soft: '#D4E8EA',
    },
    space: {
      page_bg: '#0F172A',
      card_bg: '#FFFFFF',
      text_primary: '#0f172a',
      text_secondary: '#475569',
      accent_primary: '#38BDF8',
      accent_secondary: '#17827C',
      border_soft: '#CBD5E1',
    },
    parchment: {
      page_bg: '#F7F1E6',
      card_bg: '#FFFbf5',
      text_primary: '#1c1917',
      text_secondary: '#57534e',
      accent_primary: '#B45309',
      accent_secondary: '#17827C',
      border_soft: '#E7E0D4',
    },
    school: DEFAULT_PALETTE,
  };

  /** Map quiet flat set ids → palette family. */
  const SET_TO_FAMILY = {
    'aquarium-cool': 'ocean',
    'beach-warm': 'ocean',
    'pool-cool': 'ocean',
    'space-cool': 'space',
    'classical-moon': 'space',
    'outdoor-fresh': 'school',
    'board-house': 'school',
    'home-warm': 'school',
    'clinic-cool': 'school',
    'bakery-warm': 'parchment',
    'restaurant-warm': 'parchment',
    'volcano-cool': 'parchment',
  };

  const TYPE = {
    title: { fontSize: '40px', fontWeight: '800', lineHeight: '1.1' },
    section_title: { fontSize: '32px', fontWeight: '800', lineHeight: '1.15' },
    instruction: { fontSize: '22px', fontWeight: '700', lineHeight: '1.3' },
    body: { fontSize: '22px', fontWeight: '500', lineHeight: '1.35' },
    caption: { fontSize: '18px', fontWeight: '600', lineHeight: '1.3' },
    badge: { fontSize: '22px', fontWeight: '700', lineHeight: '1.2' },
  };

  const SPACE = {
    space_xs: 6,
    space_sm: 12,
    space_md: 16,
    space_lg: 24,
    space_xl: 36,
    page_pad_x: 44,
    page_pad_y: 28,
  };

  const RADIUS = {
    radius_sm: 10,
    radius_md: 18,
    radius_lg: 24,
  };

  const SHADOW = {
    card: '0 2px 10px rgba(15,23,42,0.07)',
    hero: '0 8px 28px rgba(15,23,42,0.14)',
  };

  /**
   * Fallback gradients when no pack BG is applied (rare). Brand-teal family —
   * never purple/violet (product doctrine).
   */
  const PAGE_FALLBACKS = {
    title: ['#0f766e', '#134e4a'],
    warm: ['#f0fdfa', '#ccfbf1'],
    vocab: ['#f8fafc', '#e2e8f0'],
    phonics: ['#fffbeb', '#fde68a'],
    frames: ['#0f172a', '#1e293b'],
    story: ['#f0fdfa', '#ccfbf1'],
    comp: ['#eff6ff', '#bfdbfe'],
    creative: ['#ecfdf5', '#a7f3d0'],
    speak: ['#f0fdf4', '#bbf7d0'],
    activity: ['#ecfeff', '#a5f3fc'],
    wrap: ['#1e293b', '#334155'],
  };

  function paletteForSet(setId) {
    const family = SET_TO_FAMILY[setId] || 'school';
    return Object.assign({}, DEFAULT_PALETTE, THEME_PALETTES[family] || {});
  }

  function resolve(setId) {
    const colors = paletteForSet(setId);
    return {
      colors,
      type: TYPE,
      space: SPACE,
      radius: RADIUS,
      shadow: SHADOW,
      brand: BRAND,
      pageFallbacks: PAGE_FALLBACKS,
      family: SET_TO_FAMILY[setId] || 'school',
    };
  }

  window.BoardDesignTokens = {
    BRAND,
    DEFAULT_PALETTE,
    THEME_PALETTES,
    SET_TO_FAMILY,
    TYPE,
    SPACE,
    RADIUS,
    SHADOW,
    PAGE_FALLBACKS,
    paletteForSet,
    resolve,
  };
})();
