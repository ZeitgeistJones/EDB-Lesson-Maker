# Manus board loop — `evidenceBoard`

Independent single-board optimization log.

## Round 1 — school-commute (B1)

- BOARD_PATH: `tmp/manus-board-loops/evidenceBoard/round-01-school-commute.jpg`
- PACKET: `tmp/manus-board-loops/evidenceBoard/round-01-school-commute`
- TASK: https://manus.im/app/USNJvaWbaCpZErkyPWbxLb
- MANUS_VERDICT: revise
- SCORE: 41
- POLISH (ppt_like_quality): 4
- WEAKEST_LINK: INSTANCE-SPECIFIC: Evidence realism and reveal mechanism. The current board relies on text-only clues and generic visuals, and the reveal is not materially tied to the completed ranking; this weakens the investigative intent and premium feel.
- ESCALATION_HOMEWORK: Not applicable in this phase.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking|Redesign evidence-board around a tangible case-file / evidence desk scene to replace empty dashed boxes; introduce topic-specific visuals (school bus, road/weather indicators) and explicit strength tiers in the slots.
- ACTION: High|Define an evidenceCard schema with source artifact, concise fact, claim relation, and strength rationale; ensure at least one counter-evidence clue is included when ranking is the learner job.
- ACTION: Medium|Replace the current generic reveal control (Peek?) with an explicit, stateful action like "File all 3 clues to open the conclusion" and tie the final conclusion to the filed order.
- ACTION: Low|Replace the three dashed boxes with a tiered evidence pocket layout that adapitates to variable asset counts and text lengths, maintaining a consistent visual hierarchy.
- ACTION: Medium|Provide a compact B1 reasoning frame and one observable teacher check whenever learners are asked to judge strength; ensure the frame is reusable across topics.
- ACTION: High|Standardise the primary reveal controls with explicit verb-object actions and unambiguous unlock states.

## Round 2 — aquarium-escape (B2)

- BOARD_PATH: `tmp/manus-board-loops/evidenceBoard/round-02-aquarium-escape.jpg`
- PACKET: `tmp/manus-board-loops/evidenceBoard/round-02-aquarium-escape`
- TASK: https://manus.im/app/8Eqp5kKARDbX63d2Wu5Bm8
- MANUS_VERDICT: revise
- SCORE: 60
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: SYSTEMIC | Evidence-relation integrity | The CHALLENGES card asserts a relation that is not semantically opposed to the claim and thus fails to provide true counter-evidence. | Implement a relation gate: a challenges card must contradict, qualify, or offer an alternate explanation for the claim; reject non-contradictory or temporally adjacent evidence as counter-evidence.
- ESCALATION_HOMEWORK: PROMISING BUT NEEDS WORK — REVISE the evidence-relations gate: add a semantic check that counter-evidence must genuinely contradict, qualify, or offer an alternate plausible cause, not merely be temporally adjacent or weaker.
- STATUS: structured_ok

### Blocking / next actions
