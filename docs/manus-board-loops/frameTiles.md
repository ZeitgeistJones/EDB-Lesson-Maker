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
