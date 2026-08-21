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

## Round 4 — kitchen (A2)

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-04-kitchen.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-04-kitchen`
- TASK: https://manus.im/app/WifB9WEqX7FeSGsumVqD5y
- MANUS_VERDICT: revise
- SCORE: 7
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: TEXTURE/STATE-CHANGE AND PAYOFF: The board advertises a peel-to-reveal Word Master payoff but renders no visible unlock state or reward in the starter view. This breaks the action→payoff loop and weakens motivation and transfer.
- ESCALATION_HOMEWORK: Add a generator-level matchDock success-state contract that emits starter and solved renders, verifies every card fits its destination pad, and requires the named reward to be visibly present only after completion.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking|Render a visible locked Word Master reward in the starter state and ensure QA captures a full success render showing all pads filled and the reward revealed.
- ACTION: High|Rebuild source items as individually bounded draggable picture cards with clear hit areas and shadows; verify dock-fit on all pads in the success state.
- ACTION: Medium|Introduce a topic-world surface behind the dock (e.g., kitchen counter) to reduce worksheet smell while preserving the matchDock contract.
- ACTION: Medium|Balance visual weight across all four target tools (grater, whisk, spatula, apron) for equal salience and legibility.
- ACTION: Low|If peel-to-reveal is part of the contract, render a visible peelable element or rename the action to match the actual finish state.

### Why this round exists — R1's fixture was still broken after "post-R1" fix

Re-auditing the original R1 `fruit-market` fixture (score-3 fail) found the vocab corruption
that drove the `ANTI-INFLATION` weakest-link was **not fully fixed** by the post-R1 response
above. `isJunkFillWord` only guards `vocabArt.js`'s adaptation path. A separate, earlier-firing
path was still corrupting `lesson.vocabulary` directly and bypassing `vocabArt.js` entirely:

1. `topicIdentity.js` `stemsFromToken(topicId)` — `norm()` turns `-` into a space *before*
   `stemsFromToken`'s own `.replace(/-/g, '')` runs, so a multi-word `topicId` like `fruit-market`
   came back out as the single "stem" `"fruit market"` (space intact) instead of being peeled
   per-word. That fake stem got bumped into `coreConcepts` as a bogus two-word vocabulary
   candidate parroting the title back at itself.
2. `producerQuality.js` `setVocabFromCore` / `alignVocabWithLaterContent` / `CORE_VOCAB_MISALIGNMENT`
   read `topicBrief.coreConcepts` directly and write `lesson.vocabulary`, with **no** hypernym or
   scene-word filtering. Title tokens like `fruit` (hypernym of apple/banana/carrot…) and `market`
   (a scene/setting noun, not a matchable object) scored highest via title+stem+pack bumps and
   physically displaced the lesson's own good words (`lemon`, `grape`) — the duplicate/nonsense-
   icon pattern Manus flagged as `ANTI-INFLATION` in R1.

### Systemic response (post-R1, deeper pass — precedes R4 send)

- FIX: `stemsFromToken` now recurses per-word when the normalized token still contains a space
  (i.e. it was a multi-word kebab id), instead of returning the whole phrase as one bogus stem.
- FIX: `topicIdentity.js` `expandCoreConcepts` pack-key loop rejects a multi-token pack key whose
  tokens are *all* already the lesson title's own words (title-echo guard), so a `fruit-market.png`
  asset key can't reintroduce `"fruit market"` as a coreConcept even indirectly.
- FIX: `producerQuality.js` adds `SCENE_SETTING_WORDS` + `GENERIC_CATEGORY_WORDS` and a shared
  `isSceneOrCategoryFiller()` guard, wired into `setVocabFromCore.acceptable()`,
  `alignVocabWithLaterContent.displaceFor()`, and `checkCoreVocabMisalignment`'s candidate scan —
  so a scene noun or bare hypernym can score high on "later content mentions" without being
  allowed to evict a lesson's own concrete, matchable vocabulary.
- REGRESSION-VERIFIED (local): re-baked `fruit-market` matchDock now renders the original 6
  fixture words (apple/banana/carrot/tomato/lemon/grape) with distinct art — no `fruit`/`market`/
  `fruit market` pads. `ProducerQuality.repair` passes in 1 attempt instead of 3 and no longer
  needed to touch vocabulary at all.
- GENERALIZATION-VERIFIED (Manus R4 above): `kitchen` (Kitchen Helpers, A2) chosen specifically
  because `kitchen` is a scene word — matchDock rendered 4 honest, distinct tool icons
  (whisk/spatula/grater/apron), no `kitchen` pad, and **zero vocab-hygiene findings** from Manus.
  R4's only weakest-link is the pre-existing, already-tracked completion-state/payoff-visibility
  gap from R3 (see PRODUCER_RESPONSE below) — not a new content-quality regression.
- PREVIEW: `node scripts/preview-board-type-baselines.cjs --only=matchDock --variant=kitchen` (also
  `--variant=fruit-market`, `--variant=zoo`).

## Loop status

- STATUS: `OPEN_FOR_FINAL_STRESS_TEST` — zoo passed; music and campsite exposed producer-level
  gates that were accepted and implemented; R4 kitchen (deeper vocab-hygiene fix) confirms the
  R1 `ANTI-INFLATION` corruption is now fully closed, with the R3 payoff-visibility gate still
  the single open item.
- DEFERRED: Scene-integrated completion-state rendering for matchDock (R3 campsite + R4 kitchen
  both flag the same starter-state reward-visibility gap — `matchDockWorldTheme`'s "peel to
  reveal" seal exists but R4's kitchen render shows no visible locked state) — next producer
  pass, not blocking.

## Round 4 — farm-animals (A1)

- BOARD_PATH: `tmp/manus-board-loops/matchDock/round-04-farm-animals.jpg`
- PACKET: `tmp/manus-board-loops/matchDock/round-04-farm-animals`
- TASK: https://manus.im/app/3fE8gdhw5BKsY3meVkwmBL
- MANUS_VERDICT: revise
- SCORE: 72
- POLISH (ppt_like_quality): 4
- WEAKEST_LINK: SYSTEMIC / Visual-language coherence: topic-world embedding and payoff reveal are not convincingly integrated into the farm world, leaving a worksheet feel despite six animal targets.
- ESCALATION_HOMEWORK: Exactly one escalating generalization challenge proposed as a buildable spec that stresses the PRODUCER (a new topic, a new page type, a harder CEFR level, or a multi-round activity), escalating relative to what has already passed. The proposal below is ACCEPT/DECLINE in the producer response to be captured on the next pass.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Priority: Systemic: Require scene-world embedding for matchDock; 2) High: Render three-state payoff with visible locked seal; 3) Medium: Replace repeated 'DROP PICTURE HERE' instructions with a single cohesive dock metaphor; 4) Low: Add explicit edge/hand-drawn boundaries for docks to enable precise landings; 5) Low: Align barn and animal art style to a single farm-world visual language.

## Final loop status

- STATUS: `ESCALATION_NEEDED`
- TOPICS: fruit-market (fail 3), zoo (pass), music-class (revise 64), campsite (revise 6), kitchen (revise 7), farm-animals (revise 72).
- CLOSED PRODUCER GAPS: true match interaction, shuffled unlabeled source cards, bijective semantic mapping audit, junk/title-echo vocabulary guards, transparent-art preference, ≥96px dock fit, topic payoff metadata.
- OPEN PRODUCER GAP: the exported board still lacks a fully verified three-state contract (`starter` → `all pads filled` → `topic-world reward revealed`). A movable seal and themed surface alone do not prove the solved render or remove worksheet smell on dense six-item boards.
- NEXT OWNER: implement solved-state rendering plus automated starter/solved dock-fit snapshots before another Manus send. Do not add more topics until this gate exists.
