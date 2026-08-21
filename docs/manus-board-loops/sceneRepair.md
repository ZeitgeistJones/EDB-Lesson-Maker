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

## Round 2 — camping (A1)

- BOARD_PATH: `tmp/manus-board-loops/sceneRepair/round-02-camping.jpg`
- PACKET: `tmp/manus-board-loops/sceneRepair/round-02-camping`
- TASK: https://manus.im/app/hbJUTrnBVRuRrt9TAj9FY5
- MANUS_VERDICT: fail
- SCORE: 2
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: Scene-native repair contract and destination visibility (Systemic → S77/S79)
- ESCALATION_HOMEWORK: escalating_homework:
  challenge: Add a second, topic-native repair asset and a visible, connected destination in the starter state (e.g., a snapped-on log supported by a visible campfire). The repair must have a clearly visible target anchor and a consequential, scene-level payoff on success (before/after transformation).
  rationale: This generalizes the repair-contract semantics beyond a single, door-like object and requires learners to identify a concrete missing affordance and attach a semantically coherent repair, improving generalization across outdoor-scene topics.
  producer_response: DECLINE
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Priority: Blocking | Scene | Recompose campfire as a dominant, repairable scene feature with a clearly visible missing element and a dock that integrates into terrain.
High: Scene-native removal holder and repair dock with explicit destinations.
Medium: Remove opaque white panels around movable assets; ensure snap areas do not obstruct key target visuals.
Low: Simplify header chrome; move timing chip out of the central scene,”],
- ACTION: zpd_challenges [

## Round 2 — camping (A1)

- BOARD_PATH: `tmp/manus-board-loops/sceneRepair/round-02-camping.jpg`
- PACKET: `tmp/manus-board-loops/sceneRepair/round-02-camping`
- TASK: https://manus.im/app/dDVhQduJnXkqm6w7XD9KvG
- MANUS_VERDICT: revise
- SCORE: 63
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: SYSTEMIC|sceneRepairSemanticTuple gap|The current board lacks a single, coherent semantic tuple tying named location, wrong_prop, correct_prop, and snap_target to a visible repaired outcome.
- ESCALATION_HOMEWORK: One buildable generalisation challenge: Add a scene-wide semantic tuple schema and rendered-state QA gate for sceneRepair, such that every render must name a location, wrong prop, correct prop, and a visible repaired state that coherently ties to that location. The replacement must be demonstrably functional within the scene (not a detached card). Rationale: generalizes the repair contract to any topic; producer can ACCEPT/DECLINE.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking|Scene|Action: Introduce a sceneRepairSemanticTuple schema with fields: named_location, wrong_prop, correct_prop, snap_target, spoken_frame, success_visual; enforce that all four map to the same repair event.
- ACTION: High|Scene|Visual: Move the repair dock in-scene to the edge instead of a detached card, and ensure the destination remains visible after the wrong object moves away.
- ACTION: Medium|Scene|Action: Ensure a clearly visible success state (e.g., campfire glows) after repair to provide a strong payoff.

## Loop status — 7/10 contract

- GRADUATION: two consecutive Manus rounds on DIFFERENT topics with Visual/Product Polish ≥ 7/10 (score≥70 or overall≥3.5) AND no P0 failures. Remediation packets optional — do not wait.
- LAST SCORED: R1 fruit-market polish 2 / score 3; R2 camping polish 3 / score 63. Not graduated.
- R3 TOPIC: restaurant (A2). Local bake is ready; three Manus tasks early-stopped with no structured score (CNcCJJLe, PXUM5SyB, 2v5XUH7u). Retrying on max profile.
- LOCAL_GATE: `scripts/test-board-grammars.mjs` green. Bake: `tmp/board-type-baselines/sceneRepair-r3-restaurant.jpg`.
- LOCAL JUDGMENT: MOVE ME sits on the surfboard. AFTER hidden under a full peel. Semantic tuple + in-scene dock + broken starter hold. No P0 on local inspect.
- NEXT: land a structured R3 score; if polish < 7, fold next_actions into the producer and rotate topic.

### CHANGES_MADE before R3 (producer, not one-off art)
- `public/lib/edbActivities.js` — semantic tuple gate; starter world paints BROKEN (empty place-setting hole / cold fire / empty basket); large AFTER of the same place hidden until peel; terrain-tinted in-scene repair pocket; MOVE ME locked to the wrong piece, not the destination.
- `public/lib/renderLessonPages.js` — sceneRepair-only compact header; worksheet hint strip removed so the painted world is the hero.
- `scripts/test-board-grammars.mjs` — asserts broken-world starter, AFTER peel size, MOVE ME on the wrong piece, unique fit, in-scene dock.

## Round 3 — restaurant (A2)

- BOARD_PATH: `tmp/manus-board-loops/sceneRepair/round-03-restaurant.jpg`
- PACKET: `tmp/manus-board-loops/sceneRepair/round-03-restaurant`
- TASK: https://manus.im/app/CNcCJJLe68upMwaVYMSY44
- MANUS_VERDICT: n/a
- SCORE: n/a
- POLISH (ppt_like_quality): n/a
- WEAKEST_LINK: n/a
- ESCALATION_HOMEWORK: n/a
- STATUS: needs_attention
- REVIEW_VALIDITY: ok

### Blocking / next actions

## Round 3 — restaurant (A2)

- BOARD_PATH: `tmp/manus-board-loops/sceneRepair/round-03-restaurant.jpg`
- PACKET: `tmp/manus-board-loops/sceneRepair/round-03-restaurant`
- TASK: https://manus.im/app/PXUM5SyBvSkWNBaUn9uMxK
- MANUS_VERDICT: n/a
- SCORE: n/a
- POLISH (ppt_like_quality): n/a
- WEAKEST_LINK: n/a
- ESCALATION_HOMEWORK: n/a
- STATUS: needs_attention
- REVIEW_VALIDITY: ok

### Blocking / next actions

## Round 3 — restaurant (A2)

- BOARD_PATH: `tmp/manus-board-loops/sceneRepair/round-03-restaurant.jpg`
- PACKET: `tmp/manus-board-loops/sceneRepair/round-03-restaurant`
- TASK: https://manus.im/app/2v5XUH7udZ5YLJGD8ikj8A
- MANUS_VERDICT: n/a
- SCORE: n/a
- POLISH (ppt_like_quality): n/a
- WEAKEST_LINK: n/a
- ESCALATION_HOMEWORK: n/a
- STATUS: needs_attention
- REVIEW_VALIDITY: ok

### Blocking / next actions
