/**
 * Board quality rubric + agent decision policy.
 *
 * Dual lens (required): score as Student + Teacher — see skill.
 *
 * Code families:
 *   H*  hard  — bake fails; agent must fix this iteration
 *   M*  metric — measured by the bake; soft until calibrated
 *   R1  regression — metric got worse than scripts/quality-baseline.json
 *   S*  soft  — agent judges from contact sheet / page JPGs
 *   P1  promote — same soft root twice → craft roadmap easy win
 *
 * Tiers decide what gets fixed first: honesty before beauty.
 */

const MAX_ITERATIONS = 5;

const HARD = {
  H1: 'Wrong / inappropriate place scene (topic mismatch or place page not reusing title scene)',
  H2: 'Background variability broken (no scene/flat mix, flats not rotating, drill got a scene)',
  H3: 'Layout overlap / off-board / unlocked IoU > 0.4 / piece in header|bodyText — hard to navigate',
  H4: 'Old solid gradient chrome still baked (scenes never applied)',
  H5: 'matchDock answer leak — vocab cards embed the dock icons (dishonest for students)',
  H6: 'Page count exceeds ClassIn board limit (50)',
};

/**
 * Measured proxies for the soft pillars. The bake computes these so a cheap
 * model can tell improvement from regression instead of guessing.
 *
 *   scope      'page' | 'case'
 *   worseWhen  'lower' | 'higher'
 *   warn/fail  thresholds; severity stays 'soft' until calibrated on all tiers
 */
const METRICS = {
  M1: {
    label: 'Smallest rendered text size on the page (px)',
    scope: 'page',
    worseWhen: 'lower',
    warn: 16,
    fail: 12,
    severity: 'soft',
    why: 'Kid reading from the back of the room (18px body reads fine; 13px hints do not)',
  },
  M2: {
    label: 'Share of text blocks sitting on busy background with no card/wash behind',
    scope: 'page',
    worseWhen: 'higher',
    warn: 0.15,
    fail: 0.35,
    severity: 'soft',
    why: 'Text fighting scenery',
  },
  M3: {
    label: 'Primary card fill ratio (text area / card area)',
    scope: 'page',
    worseWhen: 'lower',
    warn: 0.18,
    fail: 0.1,
    severity: 'soft',
    why: 'Sparse warm-up / story card that wastes the board',
  },
  M4: {
    label: 'Share of pages with at least one non-text visual element',
    scope: 'case',
    worseWhen: 'lower',
    warn: 0.5,
    fail: 0.3,
    severity: 'soft',
    why: 'Bland-form proxy — a board of pure text lists',
  },
  M5: {
    label: 'Variety index (distinct backgrounds + pixel difference between pages)',
    scope: 'case',
    worseWhen: 'lower',
    warn: 0.45,
    fail: 0.3,
    severity: 'soft',
    why: 'Student saying every page looks the same',
  },
  M6: {
    label: 'Lowest header/title contrast ratio against the background behind it',
    scope: 'page',
    worseWhen: 'lower',
    warn: 4.5,
    fail: 3,
    severity: 'soft',
    why: 'Headline readability on scenes',
  },
  M8: {
    label: 'How far down the board the content reaches (0-1)',
    scope: 'page',
    worseWhen: 'lower',
    warn: 0.62,
    fail: 0.45,
    severity: 'soft',
    why: 'Content stuck in the top strip leaves a big dead board — skipped on poster pages (title, wrap)',
  },
  M7: {
    label: 'Vetted vocab art (verified pack PNG or curated glyph, not a Gemini guess)',
    scope: 'case',
    worseWhen: 'lower',
    warn: 0.6,
    fail: 0.25,
    severity: 'soft',
    why: 'Unvetted glyphs are how a beach umbrella landed on a gym lesson — wishlist candidates',
  },
};

const REGRESSION = {
  R1: 'Metric regressed past tolerance vs scripts/quality-baseline.json',
};

const SOFT = {
  // Readable
  S1: 'Title readable on scene (wash strong enough, not muddy)',
  S5: 'Cards opaque enough; text not fighting busy scenery',
  S11: 'Title / headers not clipping into busy scenery awkwardly',
  S13: 'Type size / contrast easy for a kid to read from a distance',

  // Navigable
  S4: 'Dock icons look intentional (aligned, not floating in empty void)',
  S10: 'Warm-up not sparse — question card fills vertical attention',
  S14: 'Page job is obvious in 2 seconds (teacher can run it cold)',

  // Accurate vocab images
  S15: 'Dock / match pictures clearly match the vocab word meaning',
  S9: 'No html2canvas checkerboard behind icons',

  // Background variability + appropriateness
  S2: 'Drill pages feel like classroom surfaces (chalk/cork/desk/whiteboard)',
  S3: 'Story pages feel like being there; drills feel like worksheets',
  S6: 'Rhythm: scene → flat → flat → scene (not spam)',
  S8: 'Story side-art emoji matches place (not Gemini visualTheme lies)',

  // Fun / charming
  S7: 'Placeholders (emoji-only art) look intentional, not broken',
  S12: 'Story text card not mostly empty whitespace',
  S16: 'Board feels a little fun/charming — not a bland form',
  S17: 'Activity page invites play (not only another text list)',
  S18: 'Strip as a whole has variety — student would not say “every page is the same”',
};

/**
 * Fix order. Honesty and readability beat charm — a charming board that lies
 * to students or cannot be read is worse than a plain one.
 */
const TIER_ORDER = ['honesty', 'readable', 'navigable', 'variety', 'charm'];

const TIERS = {
  honesty: ['H5', 'H1', 'S15', 'S8', 'M7'],
  readable: ['H4', 'S1', 'S5', 'S11', 'S13', 'S9', 'M1', 'M2', 'M6'],
  navigable: ['H3', 'H6', 'S4', 'S10', 'S14', 'M3', 'M8'],
  variety: ['H2', 'S2', 'S3', 'S6', 'S18', 'M5'],
  charm: ['S7', 'S12', 'S16', 'S17', 'M4'],
};

/** Product pillars as the user states them, mapped to codes for reporting. */
const PILLARS = {
  readable: ['S1', 'S5', 'S11', 'S13', 'M1', 'M2', 'M6'],
  navigable: ['S4', 'S10', 'S14', 'M3', 'M8', 'H3'],
  accurateVocabArt: ['S15', 'S9', 'M7', 'H5'],
  backgroundVariability: ['S2', 'S6', 'S18', 'M5', 'H2'],
  appropriateBackgrounds: ['S3', 'S8', 'H1'],
  funCharming: ['S7', 'S12', 'S16', 'S17', 'M4'],
};

/** Easy-win promotion order when P1 fires (from docs/edb-craft-roadmap.md). */
const EW_ORDER = ['EW1', 'EW3', 'EW2', 'EW4'];

const EW_BLURB = {
  EW1: 'Emit scenery lock=1 in buildEdb.js (ClassIn hand boards use 1, not 3)',
  EW3: 'Vocab/key phrases as styled image chips (tileToPng), not only DOM text',
  EW2: 'Optional teacher cue on title/warm',
  EW4: 'One collage activity page: scene BG + verified props/dock toys',
};

function describe(code) {
  if (HARD[code]) return HARD[code];
  if (SOFT[code]) return SOFT[code];
  if (METRICS[code]) return METRICS[code].label;
  if (REGRESSION[code]) return REGRESSION[code];
  if (code === 'P1') return 'Promote to craft roadmap easy win';
  return null;
}

function codeTier(code) {
  for (const tier of TIER_ORDER) {
    if (TIERS[tier].includes(code)) return tier;
  }
  return 'unknown';
}

function tierRank(code) {
  const i = TIER_ORDER.indexOf(codeTier(code));
  return i === -1 ? TIER_ORDER.length : i;
}

function allCodes() {
  return [
    ...Object.keys(HARD),
    ...Object.keys(SOFT),
    ...Object.keys(METRICS),
    ...Object.keys(REGRESSION),
    'P1',
  ];
}

/** ok | warn | fail for a measured value. */
function gradeMetric(code, value) {
  const m = METRICS[code];
  if (!m || value == null || Number.isNaN(value)) return 'unknown';
  if (m.worseWhen === 'lower') {
    if (value < m.fail) return 'fail';
    if (value < m.warn) return 'warn';
    return 'ok';
  }
  if (value > m.fail) return 'fail';
  if (value > m.warn) return 'warn';
  return 'ok';
}

/**
 * Validate an agent verdict before it is allowed into the report / log.
 * Rejects unknown codes so harness strings cannot silently drift.
 */
function validateVerdict(verdict) {
  const errors = [];
  if (!verdict || typeof verdict !== 'object') {
    return { ok: false, errors: ['verdict must be an object'] };
  }
  const known = new Set(allCodes());
  const findings = Array.isArray(verdict.findings) ? verdict.findings : [];
  if (!findings.length && !verdict.clean) {
    errors.push('findings is empty — set "clean": true if the board is genuinely clean');
  }
  findings.forEach((f, i) => {
    if (!f || typeof f !== 'object') {
      errors.push(`findings[${i}] must be an object`);
      return;
    }
    if (!f.code) errors.push(`findings[${i}] missing code`);
    else if (!known.has(f.code)) errors.push(`findings[${i}] unknown code "${f.code}"`);
    if (!f.caseId) errors.push(`findings[${i}] missing caseId`);
    if (!f.note) errors.push(`findings[${i}] missing note (say what a student/teacher sees)`);
  });
  const lens = verdict.lens || {};
  if (!lens.student) errors.push('lens.student prose required (dual lens)');
  if (!lens.teacher) errors.push('lens.teacher prose required (dual lens)');
  return { ok: errors.length === 0, errors };
}

function decide({ hardFailures, softFindings, priorSoftRoots, iteration }) {
  const iter = iteration || 1;
  const priors = priorSoftRoots || [];

  if (hardFailures && hardFailures.length) {
    const codes = [...new Set(hardFailures.map((f) => f.code || 'H?'))];
    codes.sort((a, b) => tierRank(a) - tierRank(b));
    return {
      action: 'fix_hard',
      codes,
      message: `Fix hard failures this iteration (tier order: ${codes.join(', ')})`,
      stop: false,
    };
  }

  const findings = softFindings || [];
  const assetGaps = findings.filter((f) => f.assetGap);
  const actionable = findings.filter((f) => !f.assetGap);

  const clear = actionable.filter((f) => f.clearFix);
  clear.sort((a, b) => tierRank(a.code) - tierRank(b.code));
  if (clear.length) {
    const primary = clear[0];
    return {
      action: 'fix_soft',
      codes: clear.map((f) => f.code),
      primary,
      tier: codeTier(primary.code),
      message: `Fix clearest ${codeTier(primary.code)} issue: ${primary.code} — ${primary.note || describe(primary.code)}`,
      stop: false,
    };
  }

  if (assetGaps.length && !actionable.length) {
    return {
      action: 'wishlist',
      codes: [...new Set(assetGaps.map((f) => f.code))],
      needs: assetGaps.map((f) => f.note || describe(f.code)),
      message:
        'Remaining issues are missing verified art, not code. Append rows to docs/asset-wishlist.md, keep the honest stand-in, and stop.',
      stop: true,
    };
  }

  const roots = actionable.map((f) => f.root || f.code).filter(Boolean);
  const repeat = roots.find((r) => priors.includes(r));
  if (repeat) {
    const nextEw = EW_ORDER.find((id) => !priors.includes(`done:${id}`));
    if (nextEw) {
      return {
        action: 'promote_ew',
        code: 'P1',
        ew: nextEw,
        message: `P1: soft root "${repeat}" repeated → implement ${nextEw}: ${EW_BLURB[nextEw]}`,
        stop: false,
      };
    }
    return {
      action: 'stop_human',
      message: 'Soft issues remain but no safe EW left — ClassIn smoke needed',
      stop: true,
    };
  }

  if (iter >= MAX_ITERATIONS) {
    return {
      action: 'stop_cap',
      message: `Hit max iterations (${MAX_ITERATIONS})`,
      stop: true,
    };
  }

  if (!findings.length) {
    return {
      action: 'clean',
      message: 'Hard + soft clean (student + teacher lenses) — commit and summarize',
      stop: true,
    };
  }

  return {
    action: 'note_soft',
    message: 'Soft findings unclear — note in report; do not thrash.',
    findings,
    stop: false,
  };
}

module.exports = {
  HARD,
  SOFT,
  METRICS,
  REGRESSION,
  PILLARS,
  TIERS,
  TIER_ORDER,
  EW_ORDER,
  EW_BLURB,
  MAX_ITERATIONS,
  decide,
  describe,
  codeTier,
  tierRank,
  gradeMetric,
  validateVerdict,
  allCodes,
  HARD_CODES: Object.keys(HARD),
  SOFT_CODES: Object.keys(SOFT),
  METRIC_CODES: Object.keys(METRICS),
};
