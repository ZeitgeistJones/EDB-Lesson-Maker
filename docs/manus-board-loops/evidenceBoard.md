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

## Round 3 — festival-sound-failure (B2)

- BOARD_PATH: `tmp/manus-board-loops/evidenceBoard/round-03-festival-sound-failure.jpg`
- PACKET: `tmp/manus-board-loops/evidenceBoard/round-03-festival-sound-failure`
- TASK: https://manus.im/app/nbeETwquvMRwQ9Db7SyAnv
- MANUS_VERDICT: revise
- SCORE: 51
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: dimension: Play / Agency; sub_criterion: observable payoff and progression after actions; current_state: learners rank clues but there is no visible outcome or locked conclusion to reveal; required_improvement: implement a locked conclusion artifact and per-drop progression that visibly advances toward the final peek/reveal
- ESCALATION_HOMEWORK: challenge: introduce a topic-shell world (scene_shell) with a 3–6 clue ranking mode and a separate, explicit locked-conclusion artifact plus per-drop progression; rationale: generalizes the evaluation model beyond four fixed cards and tests the ability to scale the action→payoff loop; producer_response: ACCEPT
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: Evidence strength vs. claim direction is conflated across all four evidence cards (B1).
- BLOCK: Absence of inspectable source artifacts on evidence cards; labels exist but no logs, transcripts, timestamps, or artifacts to interrogate (B2).
- BLOCK: No locked conclusion artifact or staged payoff; no visible intermediate state or final reveal after filing clues (B3).
- ACTION: Blocking|Festival-evidence shell|Implement a world-shell (scene_shell) that houses the four evidence cards as part of a coherent investigative scene and adds a visible locked-conclusion artifact after the first drop.
- ACTION: High|Evidence Cards|Add a concrete, inspectable source_artifact (timestamped log, image annotation, or transcript fragment) to each card.
- ACTION: Medium|Ranking Mechanics|Parameterize card count to 3–6 and enable ties or a configurable ranking mode (strict_order vs tiered_with_ties).
- ACTION: Low|Polish|Reduce chrome and header noise; integrate visual theme to emphasize investigation world over form-like layout.

### Producer fold after Round 3

- FIXED: evidence cards now require a literal `artifactExcerpt` (log fragment, quote, measurement, or annotation), not only a source label.
- FIXED: strength is explicitly reliability + relevance and is independent of claim direction; the festival stress fixture ranks `alternative` above one `supports` clue.
- FIXED: `supports`, `contradicts`, `qualifies`, and `alternative` use separate semantic checks; vague timing adjacency fails closed.
- FIXED: the conclusion is a visible sealed-verdict artifact with 0/N progress dots, filled-pocket progression metadata, and an authored-order unlock contract.
- FIXED: 3–4 card copy limits and dock sizing preserve readable source artifacts, source quality, and claim impact without postage-stamp fallback.
- LOCAL_GATE: `node scripts/test-board-grammars.mjs` passed.
- FINAL_BAKE: `tmp/board-type-baselines/evidenceBoard.jpg`
- LOOP_STATUS: producer-folded after three Manus rounds; no fourth external review requested by the 2–3 round policy.

## Round 3 — festival-power-outage (B2)

- BOARD_PATH: `tmp/manus-board-loops/evidenceBoard/round-03-festival-power-outage.jpg`
- PACKET: `tmp/manus-board-loops/evidenceBoard/round-03-festival-power-outage`
- TASK: https://manus.im/app/4Z9MSSQhnRqticdPyKs9BM
- MANUS_VERDICT: revise
- SCORE: 63
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: Visual / Product Polish → Scene-integrated evidence presentation and material action-to-payoff
- ESCALATION_HOMEWORK: Propose a concrete generator change: implement two gating mechanisms on the evidenceBoard grammar—(1) an evidenceBoard.rankContract gate that requires each ranked card to show (a) a source artifact, (b) a fact/excerpt, (c) a claim relation, (d) a short, teacher-checkable rationale, and (e) a concise justification linking to the claim impact; (2) a causal-timeline solvability gate for timestamped cases that anchors every time-bearing artifact to an incident time. Produce a new board prototype using a non-physical-cause topic (e.g., community rumor) to test generalization of these gates. Producer decides ACCEPT or DECLINE.
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: B1 | EvidenceBoard rank contract missing: no explicit, teacher-checkable criteria tying each ranked card to a compact artifact, a direct/indirect/directness/claim-impact distinction, and a visible justification for ordering.
- BLOCK: B2 | Causal-timeline anchor missing: timestamps (19:29/19:32/19:42) exist without a clearly anchored incident time, undermining solvability of temporal relations.
- BLOCK: B3 | Material payoff at reveal: seal/lock bar is not a tangible biome for the learner; no intermediate/state morphs visible before peeling to a final verdict.
- ACTION: Blocking|EvidenceBoard|Implement rank-contract gate to enforce explicit, observable ranking criteria per card; add per-card artifact + relation + concise rationale + claim impact text visible at first view
- ACTION: High|EvidenceBoard|Introduce causal-timeline solvability gate for timestamped evidence and ensure an explicit incident time is present
- ACTION: Medium|Interaction|Replace or augment the lock-bar payoff with a material state reveal (e.g., a staged filing-to-peel transition)
- ACTION: Low|Visual|Differentiate artifact visuals (source-form variety) to reduce worksheet smell and improve asset distinction

### Producer fold after Round 3 (festival-power-outage worker)

- FIXED (R2 weakest link): added an `evidenceRelationIntegrity` gate (S77) in `resolveEvidenceBoard` — any card labelled `contradicts`/`qualifies`/`alternative` must carry real opposition language (negation, "less likely", "another plausible cause", etc.) in `claimImpact`/`text`; cards that are only weaker/temporally-adjacent fail closed (recipe falls back rather than shipping a false counter-evidence label).
- FIXED: tightened the `evidenceBoard` generator prompt (`api/generate-lesson.js`) to require an explicit opposition word in `claimImpact` for every non-`supports` card.
- SCORE TREND: R1 41 → R2 60 → R3 63 (this run) / R3 51 (sibling `festival-sound-failure` run) — steady but sub-ship; relation-integrity fix holds, remaining gaps are the rank-contract/causal-timeline/material-payoff items above.
- LOOP_STATUS: closing after 3 rounds per the established 2–3 round policy (see sibling `festival-sound-failure` fold above). No Round 4 requested; rank-contract gate, causal-timeline anchor, and material-payoff-state items are logged above as the next worker's starting backlog.
