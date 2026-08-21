# Board-Type Audit Final Report

Generated: 2026-08-20

## Outcome

- Audited 13 reusable page formats, eight StoryScene compositions, and all 24
  registered interaction recipes.
- Kept 19 useful interaction grammars and retired five planner-dormant,
  decorative, hollow, or duplicate recipes.
- Discovered and scored 42 candidates; 26 (62%) were not named in the prompt.
- Implemented four high-value grammars: `capacityPack`, `routeMission`,
  `transformationLab`, and `evidenceBoard`.
- Added real producer schema/prompt support, strict resolver validation, planner
  precedence, renderer contracts, regression tests, and representative bakes.
- Generated 19/19 representative boards plus one contact sheet.
- Did not call Manus, generate art, harvest assets, or touch the asset backlog.

## Deliverable paths

- Full audit and candidate scoring: `docs/board-type-audit.md`
- Review roster and complete descriptors: `docs/board-type-review-roster.md`
- Final report: `docs/board-type-final-report.md`
- Baseline generator: `scripts/preview-board-type-baselines.cjs`
- Baseline contact sheet: `tmp/board-type-baselines/contact.jpg`
- Baseline machine report: `tmp/board-type-baselines/report.json`
- Individual baselines: `tmp/board-type-baselines/<BOARD_TYPE_ID>.jpg`
- New regression suite: `scripts/test-board-grammars.mjs`

## Kept board types

Support grammars:

`matchDock`, `frameTiles`, `phonicsSoundBoxes`, `coverAnswer`

Main/fallback activity grammars:

`preA1TprChoice`, `heroProp`, `mysteryHints`, `silhouetteGate`,
`halfTruthBoard`, `sceneRepair`, `oddOneOut`, `yesNoSort`, `thisOrThat`,
`fixSentence`, `sortBins`, `capacityPack`, `routeMission`,
`transformationLab`, `evidenceBoard`

Planner-retired compatibility recipes:

`orderLine`, `hideSeek`, `revealReward`, `buildScene`, `dressUp`

## Verification

- New grammar selection, fail-closed validation, visual contracts, and 64px
  meaningful-choice floor: covered by `scripts/test-board-grammars.mjs`.
- All 19 surviving representative boards: baked successfully.
- Existing recipe and quality suites remain the regression source for legacy
  planner activation.

## Final question

**Is the board system now meaningfully less dependent on
choose/match/sort/identify?**

Yes. Those mechanics remain useful support and fallback tools, but the live
producer can now choose constrained creation, route planning, scene/language
repair, causal transformation, evidence investigation, judgment, reveal, and
king-stage roleplay. The child can now truthfully say the board changed because
of what they did.
