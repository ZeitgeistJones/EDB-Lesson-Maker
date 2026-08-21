# Manus board loop — `matchDock`

Independent single-board optimization log.

## Round 1 — fruit-market (A1)

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-01-fruit-market.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-01-fruit-market`
- TASK: https://manus.im/app/TMTRVYLZhrP539c3xAL2D9
- MANUS_VERDICT: fail
- SCORE: 3
- POLISH (ppt_like_quality): 2
- WEAKEST_LINK: ANTI-INFLATION
- ESCALATION_HOMEWORK: Test revised grammar with a higher-contrast, scene-plus-dock market layout using 4–6 source cards and 4–6 empty destination pads embedded in the scene, with a visible payoff (e.g., stall fills or a celebratory state) on correct matches. Rationale: probes generalization of the matchDock contract beyond flat lists.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: Replace starter with a clearly movable source card set and empty pads; add a visible payoff state upon correct matches.
- ACTION: High: Integrate a scene-plus-dock layout to replace the 3x2 grid; unify asset family for market theme.
- ACTION: Medium: Align instruction text with the actual interaction contract (e.g., 'Match the word cards to the pictures. Drag, say, and check.')
- ACTION: Low: Establish a single, cohesive asset family (fruit market visuals) and remove pre-paired pairs to preserve the problem-solve dynamic.

### Systemic response (post-R1)

- FIX: Scene-plus-dock layout — empty numbered word pads on the left, unsolved picture deck tray on the right, `Match all N → ⭐ Word Master` payoff badge.
- FIX: Student hint locked to `Drag each picture to its word. Say the word, then check.`
- FIX: `isJunkFillWord` + `demoteJunkMatchables` block hypernym fills (`fruit` beside apple/banana) and title-echo compounds (`fruit market` from pack key).
- FIX: Injection paths in `adaptBoardVocabulary` and `themeBankFillWords` share the same junk guard.
- TEST: `scripts/test-readiness-vocab-art.mjs` asserts fruit-market match dock excludes junk pads.
- PREVIEW: `node scripts/preview-board-type-baselines.cjs --only=matchDock [--variant=zoo]`

## Round 2 — zoo (A1)

- STATUS: pending Manus review

## Round 2 — music-class (A1)

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-02-music-class.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-02-music-class`
- TASK: https://manus.im/app/2mYfEdkjeaTHgrceTrtBLB
- MANUS_VERDICT: revise
- SCORE: 64
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: VISUAL SYSTEMIC: One-to-one semantic mapping gate for matchDock (Target words must map 1:1 to visible source cards; no confusable targets; bijection required).
- ESCALATION_HOMEWORK: In Escalating Homework, propose exactly one buildable generalisation challenge: implement a one-to-one semantic mapping audit gate for matchDock releases, enforcing bijective mapping between target words and source cards and requiring explicit semantic-confusability checks before release. This should be parameterized so future decks can reuse the gate with different vocab sets. Rationale: generalizes the core systemic weakness (mapping ambiguity) while keeping the requirement concrete and testable. Producer_response: ACCEPT | DECLINE
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: rework matchDock to ensure bijective mapping with explicit source-card→target-word mapping and a visible, earned payoff state on completion
- ACTION: High: add per-source-card export QA to remove opaque fields and clipping (asset integrity gate)
- ACTION: Medium: replace worksheet-like layout with an embedded music-stage interaction surface; ensure stage spots visually fill on drop and trigger payoff
- ACTION: Low: adjust tray label to clearly reflect drag-from-deck rather than “Pick One” conflict; remove stray marks beneath clef card
