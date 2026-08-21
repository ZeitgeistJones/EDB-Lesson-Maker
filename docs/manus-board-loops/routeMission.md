# Manus board loop — `routeMission`

Independent single-board optimization log.

## Round 1 — school-trip (A2)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-01-school-trip.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-01-school-trip`
- TASK: https://manus.im/app/JoN9AtkmKWYS2J7UEDGc6U
- MANUS_VERDICT: pass
- SCORE: 0
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: n/a
- ESCALATION_HOMEWORK: n/a
- STATUS: structured_ok

### Blocking / next actions

## Round 1 — school-trip-retry (A2)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-01-school-trip-retry.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-01-school-trip-retry`
- TASK: https://manus.im/app/9hBKNmwMuHZJisdLHwjfKJ
- MANUS_VERDICT: revise
- SCORE: 62
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: SYSTEMIC | Route-embodiment gate | The current board renders a four-card, grid-like sequence with no visible route, mover, start, finish, or connected checkpoints. | Implement a visible route contract in the reusable grammar: add a named mover, START/FINISH, a connected path with checkpoints, and map each ordered card to a route segment.
- ESCALATION_HOMEWORK: n/a
- STATUS: structured_ok

### Blocking / next actions

## Round 2 — beach-rescue (A2)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-02-beach-rescue.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-02-beach-rescue`
- TASK: https://manus.im/app/DpSHhcpgZ57txyzhSja3nW
- MANUS_VERDICT: revise
- SCORE: 62
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: INSTANCE-SPECIFIC: The rescue sequence remains text-first with no scene anchors or visible mission progression; the learner cannot visibly see Kai acting within a rescuelike scene after card placement.
- ESCALATION_HOMEWORK: Exactly ONE escalating generalization challenge proposed as a generator/prompt change the producer can accept or decline. See section 7.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: Implement a route-state contract where landing a card activates a named route landmark and moves the mover along a visible path; “FINISH” shows a completed state.
- ACTION: High: Introduce topic-specific visual anchors (Kai, hut, radio, flags, footbridge, boat) bound to each step card before rendering.
- ACTION: Medium: Replace four static destination boxes with an adaptive route layout that can bend/turn while preserving ordered badges.
- ACTION: Low: Add an oral narration scaffold beneath the route like: “First, Kai ___. Then, he ___. Next, he ___. Finally, he ___.” with level-appropriate variants.
- ACTION: Blocking: Validate that the mover persists and that destination anchors visually progress the story when cards land.
- ACTION: High: Embed a richer visual payoff at completion (Kai reaches boat with a flag raised).

## Round 2 — beach-rescue (A2)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-02-beach-rescue.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-02-beach-rescue`
- TASK: https://manus.im/app/BzFs7ERZ3s8fePyuq8pyaX
- MANUS_VERDICT: revise
- SCORE: 40
- POLISH (ppt_like_quality): 2
- WEAKEST_LINK: dimension: Visual / Product Polish; sub_criterion: Scene integration and action-to-payoff; current_state: The board supplies a beach-coloured backdrop behind generic numbered placement boxes, with no visible mover, landmarks, goal, or completed-world transformation; required_improvement: Make the renderer emit a landmarked route scene in which every placed card visibly advances Kai or completes a segment of the journey toward the rescue boat.
- ESCALATION_HOMEWORK: Propose a buildable generalisation: Implement a routeMission data-contract and generator that requires a visible mover at START, a finish object at FINISH, and per-step scene-integrated landmarks; ensure each placement preserves a visible route and progresses the mover toward the goal, then stress-test with a kitchen/indoor-object-mission to prove generalization. Rationale: tests whether the grammar generalizes beyond outdoor travel into process-oriented tasks with visible state changes.
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: B1: START lacks a visibly rendered named mover (Kai) at START, making the intended user action unclear.
- BLOCK: B2: No scene-integrated landmarks or finish object visible for each action card, breaking the route-to-landmark mapping.
- BLOCK: B3: Route spine remains visually vanishing or obscured once cards are placed; no persistent progression is observable.
- BLOCK: B4: Inconsistent and missing reveal mechanism (peel vs. peek) that actually exposes the route or answer; current affordance does not deliver an observable payoff.
- ACTION: Blocking|Start Scene|Render Kai (named mover) at START and a clearly visible rescue-boat at FINISH; ensure the route spine remains visible after each card placement.
- ACTION: High|Introduce explicit landmarks for each action card (radio/hut, flag trail, footbridge) and bind each card to a concrete post-action state in the world.
- ACTION: Medium|Replace ambiguous language with a single visible reveal control (e.g., a folded corner labeled Lift to Reveal or a Reveal Route button) and align it with the instruction text.
- ACTION: Low|Simplify header/hero area to maximize world canvas space and integrate a scenic backdrop that supports the mission narrative.

## Round 3 — campfire-safety (B1)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-03-campfire-safety.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-03-campfire-safety`
- TASK: https://manus.im/app/23RZCmAMsXWJ3nwoXrkzNx
- MANUS_VERDICT: fail
- SCORE: 4
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: SITE-WINDER (SYSTEMIC) Topic-binding release gate: topic-to-render coherence between declared campfire-safety and rendered beach-rescue content; missing five-step machine-action tokens and incomplete route-state persistence.
- ESCALATION_HOMEWORK: Provide exactly one buildable generalisation challenge that escalates the topic, format, or scaffold, and present it as a concrete generator/prompt/gate change for the producer to ACCEPT or DECLINE.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: Topic-binding gate: enforce domain-consistent mission copy, goal, and landmarks before render;
- ACTION: High: Ensure five-material-step contract is met; no duplicate FINISH card; ensure route persistence is visible across drops;
- ACTION: Medium: Replace beach-rescue theme with campfire-safety specifics;
- ACTION: Low: Enforce icon-landmark fidelity (one icon = one landmark/action) across all cards
