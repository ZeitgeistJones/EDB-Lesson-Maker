/**
 * Board quality rubric + agent decision policy.
 *
 * Hard (H*) — bake must fail / agent must fix this iteration.
 * Soft (S*) — agent judges from strip/page JPGs; fix when clear.
 * Promote (P1) — same soft root cause twice → craft roadmap easy win.
 */

const MAX_ITERATIONS = 5;

const HARD = {
  H1: 'Wrong place scene (topic/clinic/gym mismatch or place page not reusing title scene)',
  H2: 'Background rhythm broken (no scene/flat mix, flats not rotating, drill got a scene)',
  H3: 'Layout overlap / off-board / unlocked IoU > 0.4 / piece in header|bodyText',
  H4: 'Old solid gradient chrome still baked (scenes never applied)',
  H5: 'matchDock answer leak — vocab cards embed the dock icons',
  H6: 'Page count exceeds ClassIn board limit (50)',
};

const SOFT = {
  S1: 'Title readable on scene (wash strong enough, not muddy)',
  S2: 'Drill pages feel like classroom surfaces (chalk/cork/desk/whiteboard)',
  S3: 'Story pages feel like being there; drills feel like worksheets',
  S4: 'Dock icons look intentional (aligned, not floating in empty void)',
  S5: 'Cards opaque enough; text not fighting busy scenery',
  S6: 'Rhythm: scene → flat → flat → scene (not spam)',
  S7: 'Placeholders (emoji-only art) look intentional, not broken',
  S8: 'Story side-art emoji matches place (not Gemini visualTheme lies)',
  S9: 'No html2canvas checkerboard behind icons',
  S10: 'Warm-up not sparse — question card fills vertical attention',
  S11: 'Title / headers not clipping into busy scenery awkwardly',
  S12: 'Story text card not mostly empty whitespace',
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
      message: 'Hard + soft clean — commit and summarize',
      stop: true,
    };
  }

  return {
    action: 'note_soft',
    message: 'Soft findings unclear — note in report; do not thrash. Re-bake once more only if a clear fix appears.',
    findings: softFindings,
    stop: false,
  };
}

module.exports = {
  HARD,
  SOFT,
  EW_ORDER,
  EW_BLURB,
  MAX_ITERATIONS,
  decide,
  HARD_CODES: Object.keys(HARD),
  SOFT_CODES: Object.keys(SOFT),
};
