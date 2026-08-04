/**
 * Board quality rubric + agent decision policy.
 *
 * Dual lens (required): score as Student + Teacher — see skill.
 * Pillars: readable, navigable, accurate vocab art, varied BGs,
 *          appropriate BGs, fun/charming.
 *
 * Hard (H*) — bake must fail / agent must fix this iteration.
 * Soft (S*) — agent judges from strip/page JPGs; fix when clear.
 * Promote (P1) — same soft root cause twice → craft roadmap easy win.
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

const PILLARS = {
  readable: ['S1', 'S5', 'S11', 'S13'],
  navigable: ['S4', 'S10', 'S14', 'H3'],
  accurateVocabArt: ['S15', 'S9', 'H5'],
  backgroundVariability: ['S2', 'S6', 'S18', 'H2'],
  appropriateBackgrounds: ['S3', 'S8', 'H1'],
  funCharming: ['S7', 'S12', 'S16', 'S17'],
};

/** Easy-win promotion order when P1 fires (from docs/edb-craft-roadmap.md). */
const EW_ORDER = ['EW1', 'EW3', 'EW2', 'EW4'];

const EW_BLURB = {
  EW1: 'Emit scenery lock=1 in buildEdb.js (ClassIn hand boards use 1, not 3)',
  EW3: 'Vocab/key phrases as styled image chips (tileToPng), not only DOM text',
  EW2: 'Optional teacher cue on title/warm',
  EW4: 'One collage activity page: scene BG + verified props/dock toys',
};

function decide({ hardFailures, softFindings, priorSoftRoots, iteration }) {
  const iter = iteration || 1;
  if (hardFailures && hardFailures.length) {
    return {
      action: 'fix_hard',
      codes: hardFailures.map((f) => f.code || 'H?'),
      message: 'Fix all hard failures this iteration; one theme if possible',
      stop: false,
    };
  }

  const clearSoft = (softFindings || []).filter((f) => f.clearFix);
  if (clearSoft.length) {
    // Prefer clarity/honesty pillars before pure charm
    const priority = ['S15', 'S13', 'S14', 'S18', 'S16', 'S17', 'S10', 'S12', 'S11'];
    clearSoft.sort((a, b) => {
      const ia = priority.indexOf(a.code);
      const ib = priority.indexOf(b.code);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return {
      action: 'fix_soft',
      codes: clearSoft.map((f) => f.code),
      primary: clearSoft[0],
      message: `Fix clearest soft issue: ${clearSoft[0].code} — ${clearSoft[0].note || SOFT[clearSoft[0].code]}`,
      stop: false,
    };
  }

  const roots = (softFindings || []).map((f) => f.root || f.code).filter(Boolean);
  const repeat = roots.find((r) => (priorSoftRoots || []).includes(r));
  if (repeat) {
    const nextEw = EW_ORDER.find((id) => !(priorSoftRoots || []).includes(`done:${id}`));
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

  if (!(softFindings || []).length) {
    return {
      action: 'clean',
      message: 'Hard + soft clean (student + teacher lenses) — commit and summarize',
      stop: true,
    };
  }

  return {
    action: 'note_soft',
    message: 'Soft findings unclear — note in report; do not thrash.',
    findings: softFindings,
    stop: false,
  };
}

module.exports = {
  HARD,
  SOFT,
  PILLARS,
  EW_ORDER,
  EW_BLURB,
  MAX_ITERATIONS,
  decide,
  HARD_CODES: Object.keys(HARD),
  SOFT_CODES: Object.keys(SOFT),
};
