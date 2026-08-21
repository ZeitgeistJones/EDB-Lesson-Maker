# Manus board loop — `frameTiles`

Independent single-board optimization log.

## Round 1 — fruit-market (A1)

- BOARD_PATH: `tmp/manus-board-loops/frameTiles/round-01-fruit-market.jpg`
- PACKET: `tmp/manus-board-loops/frameTiles/round-01-fruit-market`
- TASK: https://manus.im/app/8egFouVW2PLHgtvXkvNBGW
- MANUS_VERDICT: revise
- SCORE: 38
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: dimension: Visual / Product Polish  sub_criterion: Worksheet smell + scene integration  current_state: Tile-pool contract missing; three oversized white strips; no scene anchor or payoff; tiles do not visually connect to a market scene  required_improvement: Introduce a tile-pool contract and a scene-based payoff; bind each correct placement to a visible market action and ensure the final utterance changes the scene state.
- ESCALATION_HOMEWORK: Exactly ONE escalating generalization challenge proposed as a buildable spec that stresses the PRODUCER (a new topic, a new page type, a harder CEFR level, or a multi-round activity), escalating relative to what has already passed. Phrase as a proposal the human can accept or decline — not an auto-build.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking | Tile-pool contract: declare mode, required number of tiles per frame, and whether all tiles must be used or if distractors are allowed; render a visible rule. | FrameTiles: require explicit scene_anchor and completion_payoff to connect correct placements to a topic-world change.
- ACTION: High | Scene anchor: bind each correct placement to a semantic outcome in the market scene (e.g., an item goes into a basket, vendor responds, or an order card updates).
- ACTION: High | Adaptive layout: replace the fixed three-strip template with a scene-first, compact instruction region and a dock integrated into the foreground that scales with word/phrase length.
- ACTION: High | Interaction-state system: define empty target, draggable item, placed item, confirmed-correct item, and teacher-retry state with distinct visual cues beyond color.
- ACTION: Medium | Worksheet-smell guard: if the board reads like title + instruction + rectangles + cards, require a scene-integrated anchor or a documented non-scenic justification.
- ACTION: Medium | Student instruction separation: produce a concise student line (e.g., “Drag a word. Say the sentence.”) while moving multi-step guidance to teacher-facing notes.
- ACTION: Low | Tile-pool contract documentation gate: implement a generator-level rule visible on render; ensure exact answer multiplicity and frame-fit.

## Round 2 — game-day-training (A2)

- BOARD_PATH: `tmp/manus-board-loops/frameTiles/round-02-game-day-training.jpg`
- PACKET: `tmp/manus-board-loops/frameTiles/round-02-game-day-training`
- TASK: https://manus.im/app/JhqkpJaJpSR8eay8UbYYXd
- MANUS_VERDICT: revise
- SCORE: 70
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: Visual / Product Polish: The frameTiles interaction lacks a scene-integrated payoff and a functional world anchor; the current render treats the game-day theme as decorative rather than the task’s locus.
- ESCALATION_HOMEWORK: escalating_homework:
  challenge: Create a reusable frameTiles completion-state contract where every correct tile changes a visible element of the scene and all four frames culminate in a final, topic-relevant payoff state.
  rationale: Directly converts the worksheet-like surface into a game-driven payoff, proving the reusable grammar works across topics.
  producer_response: ACCEPT | DECLINE
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: B1 (frameTiles): Incomplete scene anchor – the rendered board uses a decorative header (BUILD THE SCENE) with no visible world-state change when tiles are placed, so the action lacks a meaningful payoff.
- BLOCK: B2 (payoff): No learner-visible payoff or progress state is emitted as tiles are placed, leaving the task feel like a worksheet rather than an interactive game-day scene.
- BLOCK: B3 (distractors): Distractor tiles (e.g., whistle, game) can plausibly complete rows but do not reinforce the target grammar/lexicon; this risks incidental learning and reduces clarity of which word belongs to which blank.
- BLOCK: B4 (visual hierarchy): Top chrome/header takes excessive space and competes with the main task surface, contributing to worksheet smell and reducing premium visual polish.
- ACTION: Blocking: Bind a functional, observable scene canvas to correct tile placements (e.g., coach nod, players reacting, court state updating) so payoff is visible on each correct fill.
- ACTION: High: Move the tile bank into an integrated dock within the scene (bench/side-line) instead of a detached bottom strip; ensure drag targets clearly indicate valid drop zones and give immediate feedback.
- ACTION: Medium: Revisit distractor set for stronger semantic/pragmatic compatibility with the four blanks to avoid near-plausible but incorrect completions.
- ACTION: Low: Revise header hierarchy to reduce chrome and allow the scene/world surface to dominate the composition; ensure the world anchor reads as the task context rather than decoration.
- ACTION: Optional polish: add a progress/reward cue (e.g., “Team ready!” state) after all blanks are filled to enhance perceived payoff and motivation.

## Round 2 — game-day-training (A2)

- BOARD_PATH: `tmp/manus-board-loops/frameTiles/round-02-game-day-training.jpg`
- PACKET: `tmp/manus-board-loops/frameTiles/round-02-game-day-training`
- TASK: https://manus.im/app/XVjzcrvGGHv5trUeXUwNVq
- MANUS_VERDICT: revise
- SCORE: 62
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: SYSTEMIC - frameTiles action-payoff gate: The current render lacks initial/correct-placement/completed-state payoff and a scene-stage that meaningfully anchors the activity; improvement requires a visible, earned payoff tied to a coherent scene-world rather than a worksheet-like sequence.
- ESCALATION_HOMEWORK: challenge: Propose a single buildable generalisation that escalates the frameTiles grammar to a 5-frame board with 6–8 tiles, including 1–2 distractors, and a scene-stage payoff that reveals a visible game-state after each correct placement and a final completion state; ensure the payoff is non-textual or scene-based to reinforce action→payoff. rationale: This extends the current grammar to a longer sequence and stronger world-building, testing generalisation across topics and frame counts. producer_response: ACCEPT.
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: B1: FrameTiles lacks a coherent, scene-integrated stage; no observable initial-state, correct-placement state, or completion payoff evidenced on render.
- BLOCK: B1: Scene anchor remains decorative rather than establishing game-day world with context and payoff.
- BLOCK: B1: Tile-bank/layout imbalance: four long frame strips stacked above a left-aligned, underutilized lower-right quadrant reduces visual focus and mediates engagement.
- BLOCK: B1: Worksheet-smell risk persists due to a predominantly text-and-box interaction without a compelling, play-driven payoff visible to learners.
- ACTION: Blocking | FrameTiles: Implement a robust action-payoff state contract with initial-state, correct-placement state, and completed-state payoff; require visible, non-answer-leaking progression in the scene.
- ACTION: High | Scene anchor: Replace the decorative scene strip with a coherent game-day scene-stage that anchors the frames and provides contextual cues (players, coach, court, ball, whistle).
- ACTION: Medium | Adaptive layout: Make frame-density responsive to frame count and word length rather than fixed presets; reflow the tile dock and frame blocks accordingly.
- ACTION: Low | Dock balance: Center/integrate the word tile dock to avoid large unused quadrants and improve visual weight distribution.

## Round 3 — city-transport (B1)

- BOARD_PATH: `tmp/manus-board-loops/frameTiles/round-03-city-transport.jpg`
- PACKET: `tmp/manus-board-loops/frameTiles/round-03-city-transport`
- TASK: https://manus.im/app/BjRXJk9F4jsKzWZMdK6s3b
- MANUS_VERDICT: revise
- SCORE: 59
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: SYSTEMIC: FrameTiles payoff gate and world integration; sub_criterion: completion payoff must bind to a visible scene/object in initial state and final state. current_state: payoff is text-only and the city-scene is not rendered. required_improvement: implement a visible, topic-mapped payoff scene that activates upon completion of tiles.
- ESCALATION_HOMEWORK: Not provided in this final document draft.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: FrameTiles render payoff gate should bind to a visible scene-change after final tile; ensure visible scene in round 3 report.
- ACTION: High: Introduce a topic-mapped city-route stage (map, landmarks, bus route) integrated with five tile actions for a visible payoff.
- ACTION: Medium: Collapse chrome budget to a single primary task surface with minimal container chrome; keep five numbered rows as a coherent task surface.
- ACTION: Low: If assets are updated, ensure consistent visual baseline and alignment across all frames and docks.
