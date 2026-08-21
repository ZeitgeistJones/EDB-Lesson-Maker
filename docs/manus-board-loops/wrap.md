# Manus board loop — `wrap`

Independent single-board optimization log.

## Round 1 — fruit-market (A1)

- BOARD_PATH: `tmp/manus-board-loops/wrap/round-01-fruit-market.jpg`
- PACKET: `tmp/manus-board-loops/wrap/round-01-fruit-market`
- TASK: https://manus.im/app/QsKPgAzB8Tjy4FvRWVMiRy
- MANUS_VERDICT: revise
- SCORE: 0
- POLISH (ppt_like_quality): 0
- WEAKEST_LINK: Visual / Product Polish
- ESCALATION_HOMEWORK: One buildable generalisation challenge focusing on transition from concrete objects to affective language and non-concrete vocabulary, escalating the cognitive/linguistic demand while preserving the wrap-board payoff. Proposal: create an A1 Feelings Check-Out wrap board that uses visual anchors (emotion icons) and a single, clear exit-ticket action (e.g., 
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Priority|Blocking|Scene|Add a topic-native payoff asset (e.g., market basket/receipt) that visually confirms completion|BLOCKING
- ACTION: High|High|Scene|Unify exit-ticket mechanism into one explicit action with a single proof requirement and a visible confirmation|HIGH
- ACTION: Medium|Close|Scene|Replace multi-layered text blocks with topic-native prompts (receipt, badge, or scene-object) to reduce 

## Round 2 — dentist (A1)

- BOARD_PATH: `tmp/manus-board-loops/wrap/round-02-dentist.jpg`
- PACKET: `tmp/manus-board-loops/wrap/round-02-dentist`
- TASK: https://manus.im/app/WYR3AnwULo6fNNnQWmnM6S
- MANUS_VERDICT: revise
- SCORE: 58
- POLISH (ppt_like_quality): 3
- WEAKEST_LINK: Closing-state truthfulness|Exit-state gating|The initial state shows a 'Lesson complete' cue before exit-ticket; fix gating to ensure pre-action vs post-action states are distinct
- ESCALATION_HOMEWORK: Propose escalating generalisation: implement a scene-led closing with a single verifiable action and a post-exit payoff; rationale: tests generalization of completion gating across topics; producer_response: ACCEPT | DECLINE
- STATUS: structured_ok

### Blocking / next actions
- BLOCK: B1 Closing payoff shown pre-exit: completion state appears before exit ticket; action→payoff sequence not verifiable
- BLOCK: B2 Heavy two-panel closing layout creates worksheet smell; needs scene-led close composition
- BLOCK: B3 Recap cues (dental mirror) not tied to listed vocabulary; leads to weak semantic mapping
- BLOCK: B4 Word boost: singular 'tooth' vs model sentence with 'teeth' creates morphology mismatch
- BLOCK: B5 Missing/weak dental objects (floss/toothbrush) support; lack of topic-owned cues
- ACTION: Priority 1 (Blocking) | Scene: Wrap-up payoff redesign | Action: Replace the two-panel closing with a scene-led close featuring a visible earned reward after exit
- ACTION: Priority 2 (High) | Scene: Exit ticket alignment | Action: Remove pre-awarded 'Lesson complete' state; ensure exiting yields state after teacher confirm
- ACTION: Priority 3 (Medium) | Scene: Recap assets | Action: Replace dental mirror with toothbrush or floss, or declare mirror as taught word
- ACTION: Priority 4 (Medium) | Scene: Vocabulary alignment | Action: Align 'tooth/teeth' in word-boost with a single clear model sentence
- ACTION: Priority 5 (Low) | Scene: Visual polish | Action: Tighten typography and color to reduce worksheet aesthetic; emphasize celebration moment

## Round 3 — camping (A1)

- BOARD_PATH: `tmp/manus-board-loops/wrap/round-03-camping.jpg`
- PACKET: `tmp/manus-board-loops/wrap/round-03-camping`
- TASK: https://manus.im/app/77yw3uvhzGqsQ3JzGWKSvq
- MANUS_VERDICT: revise
- SCORE: 52
- POLISH (ppt_like_quality): 4
- WEAKEST_LINK: Visual / Product Polish | PAYOFF_CONTRACT | The wrap finishes with a static “High Five” label that does not visibly change after the student speaks; the exit-ticket payoff contract is not observable in the closing state.
- ESCALATION_HOMEWORK: escalating_homework:
  challenge: Create a topic-agnostic wrap-completion payoff that always results in a visible post-action state (e.g., lit campfire, stamped badge, or character reaction) after the exit-ticket sentence, implemented as scene-driven closure rather than a static label.
  rationale: Generalizes the closure payoff rule across topics and reinforces the required action→payoff loop for premium quality.
  producer_response: DECLINE
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking|Define a distinct post-action state for exit-tickets on wrap boards (systemic)
- ACTION: High|Redesign the finish-line composition to be scene-led rather than a stacked-card worksheet
- ACTION: Medium|Bind each recap word to a specific, grammatically valid frame route
- ACTION: Medium|Replace the unused/camouflaged word fund with a camping-appropriate target word or remove it from the set
- ACTION: Low|Increase the payoff emphasis by enlarging a single final campsite moment and reducing chrome around the wrap

### Systemic response (Sonnet R1 chrome pass — before Round 4 retest)

- FIX: Payoff badge (`payoff.dataset.wrapPayoff`) now shows a topic-native hero image (via `titleCharmSrc(lesson)` — the same asset the title panel uses) with a small step-number chip overlaid, instead of a bare generic numeral in a plain circle. Falls back to the plain numeral when no charm asset exists for the topic.
- REGENERATED: `tmp/title-wrap-topic-preview/wrap-dentist-lesson.jpg`, `tmp/title-wrap-topic-preview/wrap-fruit-market-lesson.jpg` (via new `scripts/preview-title-wrap-topic.cjs`).
- RESULT: Round 4 retest (dentist) below scored 58, and the reviewer explicitly credited the topic-native badge as working ("Low: Maintain topic-native badge but integrate it into the finish area") rather than flagging it as missing. Remaining gaps are deeper: a visible payoff *bridge* from the exit-ticket action to the High Five zone (Blocking) and consolidating the four stacked slabs into one primary action panel (High) — left for the next round since they are layout/sequencing changes, not a badge-asset fix.

## Round 4 — dentist-retest (A1)

- BOARD_PATH: `tmp/manus-board-loops/wrap/round-02-dentist.jpg`
- PACKET: `tmp/manus-board-loops/wrap/round-02-dentist`
- TASK: https://manus.im/app/NUPsSfbgmMKRevxoYn5quK
- MANUS_VERDICT: revise
- SCORE: 58
- POLISH (ppt_like_quality): 3.5
- WEAKEST_LINK: SYSTEMIC — Payoff bridge and visual-contract for exit ticket (S78/S79); INSTANCE-SPECIFIC — Topic-native dentist image does not clearly anchor the target noun (dentist) at board scale
- ESCALATION_HOMEWORK: Introduce a static-wrap proof contract for spoken exit tickets with one visible spatial payoff (finish line, path, gate, or prize) that directly links the learner’s spoken output to the reward.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: Implement a visible payoff bridge from the exit ticket to the High Five zone (e.g., a finish path or finish line gate).
- ACTION: High: Establish a single primary learner-action panel and clearly labeled optional supports to reduce visual clutter (rework the four stacked slabs).
- ACTION: Medium: Replace the dentist recap art with an unmistakable dentist portrait; enlarge/clarify the recap tiles (dentist, tooth, smile) for legibility at projection scale.
- ACTION: Low: Maintain topic-native badge but integrate it into the finish area as a prize/celebration object.
- ACTION: Next Round Stress-Test: Use an A1 playground feelings wrap to stress generalization of the static-wrap payoff and ensure cross-topic applicability.

## Loop status

- STATUS: `NEAR_DONE` — topic-native payoff badge landed; camping R3 polish 4; dentist retest 58.
- TOPICS: fruit-market (A1) → dentist (A1) → camping (A1); round budget used (3 topics + 1 retest).
- VALID VERDICTS: R1 REVISE 0 → R2 REVISE 58 → R3 REVISE 52 (polish 4) → R4 retest REVISE 58.
- REMAINING P1: observable post-speech payoff — exit-ticket action must visibly bridge to High Five / finish-line state; requires layout/sequencing redesign, not badge chrome.
- DECISION: **PAUSE** — `ESCALATION_NEEDED` for static-wrap proof contract (spatial payoff bridge). No further Manus rounds this phase.

## Loop status

- STATUS: `NEAR_DONE` — topic-native payoff badge landed; gating and finish-line copy improved across fruit → dentist → camping. Round budget exhausted.
- BEST VALID SCORE: camping R3 `revise` 52 (polish 4); dentist R4 retest `revise` 58 (polish 3.5).
- P1 (documented, not auto-built): observable post-speech payoff — exit-ticket action must visibly bridge to the High Five / celebration zone (finish path, gate, or lit state change), not a static label.
- ESCALATION_NEEDED: payoff bridge + single primary action panel require layout/sequencing redesign beyond badge chrome. Pause external Manus rounds until scoped.
