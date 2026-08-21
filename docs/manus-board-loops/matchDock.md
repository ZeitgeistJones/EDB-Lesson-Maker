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

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-02-zoo.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-02-zoo`
- TASK: https://manus.im/app/kPPXxbp3JHi9bHQ4DtXzAW
- MANUS_VERDICT: pass
- SCORE: 0
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: n/a
- ESCALATION_HOMEWORK: n/a
- STATUS: structured_ok
- LOOP_STATUS: `provisional_pass_after_R2_generalization`

### Blocking / next actions

## Round 2 — music-class (A1) [parallel stress-test — not blocking close]

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-02-music-class.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-02-music-class`
- TASK: https://manus.im/app/2mYfEdkjeaTHgrceTrtBLB
- MANUS_VERDICT: revise
- SCORE: 64
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: VISUAL SYSTEMIC: One-to-one semantic mapping gate for matchDock (Target words must map 1:1 to visible source cards; no confusable targets; bijection required).
- ESCALATION_HOMEWORK: implement a one-to-one semantic mapping audit gate for matchDock releases
- STATUS: structured_ok
- PRODUCER_RESPONSE: `ACCEPT`
- FIX: `matchDockMappingAudit` now requires unique target words, unique source art, and rejects explicit semantic-confusability / whole-token nesting before `matchDock` can ship.
- FIX: interactive planning excludes opaque white-pack fallback plates; keyed props and curated glyphs remain eligible.
- TEST: duplicate-source and music/song confusability cases are locked in `scripts/test-readiness-vocab-art.mjs`.

## Round 3 — campsite (A1)

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-03-campsite.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-03-campsite`
- TASK: https://manus.im/app/8SZz65CZpmMAzU7nr8pJGH
- MANUS_VERDICT: revise
- SCORE: 6
- POLISH (ppt_like_quality): 4
- WEAKEST_LINK: Systemic - Visual/World Integration: The current matchDock starting state is clean but still feels worksheet-like. There is no topic-anchored scene or observable completion-state that ties the three matches to a campsite world, so the payoff remains textual rather than visual. Required_improvement: implement a topic-integrated dock surface and a visible completion payoff that activates only after all three correct matches are placed, preserving learner work and clearly signaling success.
- ESCALATION_HOMEWORK: The producer is invited to ACCEPT or DECLINE exactly one buildable escalation: introduce a topic-linked completion-state mechanic for matchDock (starter vs. completion render) that visibly rewards correct matches with a campsite-relevant payoff (e.g., campfire lights up, Word Master badge appears) and pairs with a world-integrated scene surface. If ACCEPTED, the board grammar must generate both starter and completion renders and QA them against dock-fit and padding checks.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Priority: Scene-integrated completion-state rendering for matchDock (Blocking/High) — add a visible payoff state that accompanies all three correct matches and preserves placed cards; ensure a corresponding starter and completion render are produced and QA’d.
- ACTION: Scene design: replace left-side generic drop zones with a theme-led docking surface integrated into a campsite scene; keep three pads, but embed them in a coherent world.
- ACTION: Draggable affordance: apply a consistent grab halo, lift state, and spacing rules so draggables read as movable assets rather than decor.
- ACTION: Dock-fit verification: implement automated checks to ensure dragged items land within pads without occluding words or borders and that the final state shows a completed set.
- ACTION: Completion-state reward: define and QA a visible payoff (e.g., campfire lighting, Word Master badge) that proves completion beyond a label.

### Systemic response (post-R3)

- PRODUCER_RESPONSE: `ACCEPT`
- FIX: `matchDockWorldTheme` maps reusable topic families to a scene surface and earned payoff (`CAMP READY`, `BAND READY`, `ZOO EXPERT`, `MARKET OPEN`, etc.).
- FIX: 1–3 pad boards become a staggered trail embedded in the topic world instead of a full-width worksheet stack.
- FIX: a movable `MATCH ALL N · PEEL TO REVEAL` seal covers the locked topic payoff; moving it after matching creates a real two-state EDB while preserving placed cards.
- GATE: every source layout records `matchDockFit:N×W×H`; the existing ≥96px sizing floor remains mandatory.

## Loop status

- STATUS: `OPEN_FOR_FINAL_STRESS_TEST` — zoo passed, but music and campsite exposed producer-level gates that were accepted and implemented.
