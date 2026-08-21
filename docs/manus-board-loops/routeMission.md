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

## Round 3 — amusement-park (A2)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-03-amusement-park.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-03-amusement-park`
- TASK: https://manus.im/app/e8VjNp5FLtS3bLCHxhu2Pm
- MANUS_VERDICT: revise
- SCORE: 2
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: SYSTEMIC: The route is not answer-honest or spatially grounded — no visible landmarks mapped to cards and no defensible unique sequence yet.
- ESCALATION_HOMEWORK: Exactly ONE escalating generalization challenge proposed as a buildable spec that stresses the PRODUCER (a new topic, a new page type, a harder CEFR level, or a multi-round activity), escalating relative to what has already passed. It is phrased as a proposal the human can accept or decline.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Priority|Blocking: Gate on unique visible sequence evidence; reject hidden-convention answers.
- ACTION: High: Generate a mapped route world with matched landmark stops, route persistence, and mover travel.
- ACTION: High: Emit the three tested interaction states and preserve learner decisions during reveal.
- ACTION: High: Add narration frames and an observable A2 tell-the-route requirement.
- ACTION: Medium: Correct the blue-gate and queue assets; establish spatial route evidence and urgency.

## Round 3 — campfire-safety (B1)

- BOARD_PATH: `tmp/manus-board-loops/routeMission/round-03-campfire-safety.jpg`
- PACKET: `tmp/manus-board-loops/routeMission/round-03-campfire-safety`
- TASK: https://manus.im/app/9F4hwFgjsQy2BN7De7Tvp7
- MANUS_VERDICT: revise
- SCORE: 62
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: Visual / Product Polish — action-to-payoff scene integration. current_state: The supplied render shows start text and cards but no campsite scene or finish tableau. required_improvement: Render a scene-first route with an illustrated campsite world and a visible finish; show Team Pine traveling along the route.
- ESCALATION_HOMEWORK: challenge: Add a routeMission generator gate to require an illustrated topic-scene plus a paired reveal-state render showing persistent placed cards, mover arrival, and at least one visible scene-state change. rationale: generalizes the scene-based route grammar across topics and ensures a tangible payoff. producer_response: ACCEPT | DECLINE
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: B1: No illustrated campsite world; start state not clearly visible and reveal state not shown.
- BLOCK: B2: Finish scene not visualized; Team Pine token not shown traveling to finish.
- BLOCK: B3: Landmark icons duplicated; not unique; not map to actions.
- BLOCK: B4: Action-to-payoff not evidenced; no visible transformation on completion.
- ACTION: Blocking | Start Scene / Route World | Introduce illustrated campsite world behind checkpoints and ensure start state and a visible route are present; ensure mover persists to finish.
- ACTION: High | Checkpoints area | Replace generic arrows with unique landmark icons tied to actions; enforce one-to-one landmark-action mapping per card.
- ACTION: Medium | Narration scaffold | Add a reusable narration rail (First, Next, Then, Finally) and require a short spoken-order proof before reveal.
- ACTION: Low | Finish scene polish | Render a finished campsite tableau with Team Pine and a visible campfire payoff; reduce reliance on text labels for finish.

## Loop status

- STATUS: `REVISE` — the ordering mechanic is now honest and executable, but a P0 visual payoff remains.
- TOPICS: school trip (A2) → beach rescue (A2) → campfire safety (B1).
- VALID VERDICTS: R1 `revise` (62) → R2 `revise` (62) → R3 `revise` (62).
- INVALID CALLS: the first R1 returned an empty zero-score schema; the first campfire R3 packet was overwritten by the shared beach artifact and is not evidence.
- LANDED SYSTEMIC FIXES: persistent connected checkpoints; named mover/start/goal; neutral empty stops (no ordered-landmark answer leak); shuffled step cards with card-bound visual anchors; explicit arrived-state answer reveal; materially ordered route payload contract; topic-tagged preview artifacts.
- REMAINING P0: routeMission still reads as a polished sequencing board, not a scene-first mission. Next producer iteration needs a visible start world, mover travel, and finish tableau without making one-off art or exposing the answer order.

### Independent amusement-park stress test

- TOPIC / VERDICT: amusement park (A2) — `revise`; findings accepted, malformed negative scorecard dimensions excluded from trend scoring.
- POST-R3 PRODUCER FOLD: explicit routes now fail closed unless they provide distinct card-bound landmarks and one dependency reason per transition; empty checkpoints remain answer-neutral.
- LOCAL PROOF: route grammar tests pass; final bake shows the explicit First / Next / Then / Finally narration scaffold and the empty → placed → revealed state contract.

### Final decision (sole-owner, 2026-08-21)

- STATUS: `NEAR_DONE` — mechanics honest (persistent path, mover/start/goal, checkpoints, card anchors, completion reveal); three valid Manus REVISE at 62 across school-trip → beach-rescue → campfire-safety.
- P0 REMAINING: scene-first mover-to-finish visual payoff — illustrated start world, visible mover travel, finish tableau. Crosses routeMission into shared scene-shell architecture; not a bounded single-grammar patch.
- DECISION: **PAUSE** — `ESCALATION_NEEDED` for shared scene-first mission renderer. Round budget used (3 topics). No fourth Manus topic this phase.
