# Manus board loop — `sceneRepair`

Independent single-board optimization log.

## Round 1 — fruit-market (A1)

- BOARD_PATH: `tmp/manus-board-loops/sceneRepair/round-01-fruit-market.jpg`
- PACKET: `tmp/manus-board-loops/sceneRepair/round-01-fruit-market`
- TASK: https://manus.im/app/g3r9bJZjwHVToE5MBqHZDR
- MANUS_VERDICT: revise
- SCORE: 3
- POLISH (ppt_like_quality): 2
- WEAKEST_LINK: INSTANCE-SPECIFIC: The board lacks a cohesive, market-appropriate scene and a clearly solvable one-hole repair with a perceivable before/after payoff; SYSTEMIC: scenePresence and repair-heuristic gating are not enforced by the reusable grammar (no scene-first layout, no single-defensible replacement, no visible outcome).
- ESCALATION_HOMEWORK: Unprompted
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: Redesign the board to render a topic-authentic fruit-market scene with a clearly embedded wrong item and a single, defensible correct replacement; ensure a visible before/after payoff at projection scale.
- ACTION: High: Replace the heavy header/banner with a scene-native cue and collapse redundant copy into a concise, in-scene instruction; shift layout priority to scene-first so the world is the hero.
- ACTION: Medium: Introduce a clearly marked dock/drag-area for the replacement item and visibly mark the wrong piece as movable.
- ACTION: Low: Improve asset choices to resemble a cohesive fruit-market setting (basket, stall, vendor) rather than detached icons.

### SYSTEMIC (grammar-level gap, per Manus)
- No scene-first layout contract: the recipe filled the activity bay with worksheet-style chrome instead of making a themed scene the visual hero.
- No single-defensible-replacement rule: the grammar could ship an odd-one-out-style option set (up to 4 resolver candidates) into the repair dock instead of forcing exactly one correct fit against the one authored wrong piece.
- No visible outcome contract: nothing in the recipe or the local test suite asserted that the destination, the "move" cue, and the payoff were actually present and legible before shipping to review.

### INSTANCE (fruit-market R1 specifics, per Manus)
- Detached icons rather than a coherent fruit market — the board read as loose pictures, not a stall/basket scene.
- Heavy header/banner ate space that should have gone to the scene.
- No clear drag/dock affordance for the replacement piece, and the wrong piece wasn't visibly marked as movable.
- Remaining limitation carried into this round: local asset availability for some fill-in art still falls back to a generic/mismatched icon rather than a topic-exact picture in this dev environment (see prior worker note — this is a shared asset-warehouse gap, not a sceneRepair grammar defect, and is intentionally not being reopened here).

### CHANGES_MADE (producer fixes, not one-off art)
- `public/lib/edbActivities.js` — `sceneRepair()` now renders a scene-first contextual stage (`sceneRepairStagePng`) that fills the activity bay with a themed backdrop (market/camp/beach/cafe/sport-aware), plus an explicit destination ring (`sceneRepairTargetPng`), a "MOVE ME" cue on the wrong piece, and a labeled dock ("YOUR REPAIR PIECE").
- `public/lib/edbActivities.js` — dock `options` are now built directly from the resolved `[correctWord, wrongWord]` pair instead of slicing the raw resolver candidate pool, so exactly one defensible replacement ever reaches the dock (previously could double up with an extra same-theme word).
- `public/lib/renderLessonPages.js` — shortened the on-page instruction to the scene-first action line ("Spot it → move it → repair it → explain why."), replacing the old worksheet-style prompt.
- `scripts/test-board-grammars.mjs` — added a local regression contract for `sceneRepair`: asserts exactly one `sceneRepairPart` choice in the dock, a full-bay `sceneRepairStage`, and the `sceneRepairUniqueFit:1` note, so a future edit can't silently reintroduce the multi-replacement or non-scene-first regressions without failing this suite.
- `scripts/preview-board-type-baselines.cjs` — added focused `sceneRepair` topic variants (fruit-market / camping / restaurant / surfing) behind the existing `--only`/`--variant` flags, so future rounds can bake and eyeball any theme without hand-editing fixtures.
- `scripts/manus/review-single-board.mjs` — fixed the staged screenshot filename to `page-00-<type>.jpg` (was `board-*.jpg`), which the shared review picker was rejecting, so single-board Manus submissions for this loop actually attach the right image.

## Loop status

- STATUS: `R2_PENDING` — R1 producer fixes landed locally; ready for Manus R2 on rotated topic (camping or restaurant).
- LOCAL_GATE: `scripts/test-board-grammars.mjs` asserts scene-first stage, single replacement, unique-fit note.
- REMAINING P1: visible before/after payoff at projection scale (asset-dependent); not blocking R2 Manus if scene-first contract holds.
