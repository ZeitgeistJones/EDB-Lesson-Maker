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
  H1: 'Wrong / inappropriate place scene (topic mismatch on activity/EDB page)',
  H2: 'Background variability broken (no scene/flat mix, flats not rotating, drill got a scene)',
  H3: 'Layout overlap / off-board / unlocked IoU > 0.4 / piece in header|bodyText — hard to navigate',
  H4: 'Old solid gradient chrome still baked (scenes never applied)',
  H5: 'matchDock answer leak — vocab cards embed the dock icons (dishonest for students)',
  H6: 'Page count exceeds ClassIn board limit (50)',
  H7: 'Prop art drawn at the wrong aspect, or 09_props art on a piece with no PropBank provenance',
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
    warn: 22,
    fail: 14,
    severity: 'soft',
    why: 'Kid reading from a ClassIn window (22px body reads; 13px hints do not)',
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
    label: 'Vocab words with vetted art that is theirs alone (no Gemini guess, no picture shared with another word)',
    scope: 'case',
    worseWhen: 'lower',
    warn: 0.6,
    fail: 0.25,
    severity: 'soft',
    why: 'Unvetted glyphs are how a beach umbrella landed on a gym lesson — wishlist candidates',
  },
  M9: {
    label: 'Dead-space ratio (1 − content coverage of the board)',
    scope: 'page',
    worseWhen: 'higher',
    warn: 0.55,
    fail: 0.72,
    severity: 'soft',
    why: 'Sparse frames / comprehension pages that leave a dead board',
  },
  M10: {
    label: 'Smallest interactive (unlocked) piece size in px (min of w,h)',
    scope: 'page',
    worseWhen: 'lower',
    warn: 64,
    fail: 40,
    severity: 'soft',
    why: 'Postage-stamp dock icons students cannot grab in ClassIn',
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
  S2: 'Drill pages use calm washes under card chrome — not write-on boards (chalk/cork/whiteboard)',
  S3: 'Story pages feel like being there; drills feel like worksheets',
  S6: 'Rhythm: scene → flat → flat → scene (not spam)',
  S8: 'Story side-art emoji matches place (not Gemini visualTheme lies)',

  // Fun / charming
  S7: 'Placeholders (emoji-only art) look intentional, not broken',
  S12: 'Story text card not mostly empty whitespace',
  S16: 'Board feels a little fun/charming — not a bland form',
  S17: 'Activity page invites play (not only another text list)',
  S18: 'Strip as a whole has variety — student would not say “every page is the same”',

  // Pedagogy / honesty (Manus ClassIn reviews 2026-08)
  S19: 'Reading comprehension has real questions (not an empty write-in void)',
  S20: 'Warm-up does not show teacher sample answers to students',
  S21: 'King/activity hint names pieces accurately (not “toys”) and asks for speak/write output',
  S22: 'Wrap-up / exit ticket consolidates aims (not only “Great Job!”)',
  S23: 'Title / intro states learning aims (vocab or communicative goal visible)',
  S24: 'Story side/banner uses a real prop cutout when PropBank has a match (not only a glyph); caption stays a white chip below/above art — never free red text bleeding through an absolute alpha cutout',
  // Manus classical-compose 2026-08 (revise/72 + skill v2 / pass-98 report)
  S25: 'Title aims list the board-taught vocab (first 6 match-dock words) and state a honest grammar aim when sentence frames exist',
  S26: 'Vocab match-dock icons map 1:1 without student-facing answer-naming caption chips (no piece.label / no pieceToPng caption bake); inspire uses dedicated pack art (inspire.png lightbulb — not brain stand-in, not ambiguous starburst)',
  S27: 'Manus/review pickImages includes every storyN beat before comprehension (never drop middle story pages at soft max)',
  S28: 'Vocab matchDock shows numbered drop-zone pads on word cards (not word text alone as the only target)',
  S29: 'Lessons ≥45 min show teacher timing chips on major scene headers including king/activity (pacing cues)',
  S30: 'Title aims and creative prompts only use board-taught vocab (no orphan words like tempo in aims/creative but not New Words)',
  S31: 'Grammar aim line matches the frames on the board (do not claim first-conditional when frames are would/opinion only)',
  S32: 'Wrap slide background stays in the deck register (deep navy/slate — not a warm lavender breakaway)',
  S33: 'Multi-beat story prop cards stay on the same side (no L/R thrash across storyN)',
  S34: 'Mid-deck quiet flats use ≤2 distinct washes (Manus ≤2 registers heuristic; open/close pins may bookend)',
  S35: 'Activity/king instruction chrome is ink-tagged (heading+hint) with slate-weight defaults — not low-contrast purple/gray on scenes',
  S36: 'Wrap exit includes a short peer-feedback prompt (not only Great Job + review sentences)',
  S37: 'Wrap exit recycles all board-taught vocab (review sentences and/or Also say: line — not a 3-word subset)',
  S38: 'Orchestra/performance story captions prefer musician-* PropBank cutouts over bare stands/podium furniture',
  S39: 'skipKing / write-or-say king activities show a visible production write strip (not oral-only)',
  // StoryArt soft — generative panels preferred when cache/API available
  S47: 'When StoryArt cache/results are applied, story slots mark data-story-art-gen and drop PropBank-only storyProp fallback',
  // Title aims: story lessons name receptive reading, not production-only "talk"
  S48: 'When lesson has story pages, title Aims line mentions read/reading (not talk-only)',
  // Feelings-compass judge pass 2026-08 (teacher + student agree)
  S50: 'Sentence-frame copy keeps descender headroom (line-height ≥1.35, no vertical clip) — never cuts y/g/p/q/j tails, comma tails (worried,→worried.) or the "____" blank',
  S51: 'Second-conditional frames use a comma (If I felt X, I would ___) — never a mid-sentence period; the blank sits on the line, not floating before a period',
  S52: 'Feelings New Words glyphs are mutually distinct — shy does not share the smiley used by happy (students can tell the match pads apart)',
  S53: 'No unlabeled stray prop (board-face corner eye/wink easter egg) on emotion-vocab newWords/activity boards — feelings ride the egg-free board-house deck',
  S54: 'Feelings drag faces are grabbably large on the stage (≥96px) and the blank drop-face does not dominate as a giant empty blob',
  S55: 'Title aims/grammar panel is projector-legible — light ink on a dark frosted slab, not repainted dark-on-dark by the flat ink policy',
  S56: 'Feelings New Words icons are unmistakable and mutually distinct — "confused" reads as clearly puzzled (🤔/furrowed brow), never a neutral/meh 😐; no two of the six board feelings share a glyph',
  S57: 'Warm-up elicits prior knowledge target-neutral — it does not pre-cue a taught feeling word before New Words teaches it',
  S58: 'Draggable match/drag pieces stay label- and number-free — icons carry no answer-naming caption and are not pre-mapped/numbered to the drop pads (fix guessing via unambiguous icons, not by revealing the match)',
  // Feelings-compass selfloop round 1 (teacher + student agree)
  S59: 'Activity/roleplay feeling dock reuses the SAME vetted vocab-pack face art the New Words match dock teaches — not a second 3D prop face vocabulary; picture→word mapping transfers and no untaught expression (e.g. "angry") or stray "?" leaks onto the drag pieces',
  S60: 'Second-conditional (If…would) grammar aim is modeled receptively — a completed worked example appears on the board (frames Model or story line) before students must produce the structure cold',
  S61: 'Comprehension write-in cards all sit fully on the board — the last question\'s answer box is not clipped off the bottom edge',
  S62: 'Story reading copy is near-black (high contrast) so the paragraph does not wash out as medium-gray when projected',
  // Feelings-compass selfloop round 2 (teacher + student agree)
  S63: 'Title Aims name the actual topic (e.g. "about feelings") — never hide it behind generic "today\'s topic"',
  S64: 'Feelings Lab hero is balanced into the right region past the left instruction column — a centred blank head leaves the right third dead and the page reads lopsided',
  S65: 'New Words match dock is a framed "picture bin" that hugs the word cards and fills the column edge-to-edge with large faces (wide grid) — not a centred narrow block of small icons stranded mid-right with a dead gap',
  S66: 'Sentence-frame stack keeps a bottom gutter — Frame 3\'s write-line is never flush on the board edge / reading as cut off',
  S67: 'Conditional frames lead with the modeled If-clause order — no reversed "I would feel ___ if someone ___" trap that silently requires an unmodeled past-form verb',
  S68: 'Warm-up carries a target-neutral sentence-starter scaffold (no taught feeling word) so it is not one lonely question over an empty box',
  S69: 'Activity Round 2 describes the real mechanic (partner READS the visible face and names the feeling) — never a misleading "partner guesses" when nothing is hidden',
  S70: 'Surfaced inferential comprehension question is genuinely inferential — not a stated fact answered verbatim in the story ("surprised at the end")',
};

/**
 * Fix order. Honesty and readability beat charm — a charming board that lies
 * to students or cannot be read is worse than a plain one.
 */
const TIER_ORDER = ['honesty', 'readable', 'navigable', 'variety', 'charm'];

const TIERS = {
  honesty: ['H5', 'H1', 'S15', 'S8', 'M7', 'S19', 'S20', 'S26', 'S30', 'S31', 'S37', 'S51', 'S52', 'S57', 'S58', 'S59', 'S60', 'S63', 'S67', 'S69', 'S70'],
  readable: ['H4', 'S1', 'S5', 'S11', 'S13', 'S9', 'M1', 'M2', 'M6', 'S35', 'S50', 'S55', 'S56', 'S62'],
  navigable: ['H3', 'H6', 'S4', 'S10', 'S14', 'M3', 'M8', 'S21', 'S23', 'S25', 'S27', 'S28', 'S29', 'S33', 'S54', 'S61', 'S64', 'S65', 'S66'],
  variety: ['H2', 'S2', 'S3', 'S6', 'S18', 'M5', 'S32', 'S34'],
  charm: ['S7', 'S12', 'S16', 'S17', 'M4', 'H7', 'S22', 'S24', 'S36', 'S53', 'S68'],
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
