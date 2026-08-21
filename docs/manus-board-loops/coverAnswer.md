# Manus board loop — `coverAnswer`

Independent single-board optimization log.

## Round 1 — fruit-market (A1)

- BOARD_PATH: `tmp/manus-board-loops/coverAnswer/round-01-fruit-market.jpg`
- PACKET: `tmp/manus-board-loops/coverAnswer/round-01-fruit-market`
- TASK: https://manus.im/app/XA9hL2SaKcr5HJfVFPHHQF
- MANUS_VERDICT: revise
- SCORE: 68
- POLISH (ppt_like_quality): 4
- WEAKEST_LINK: ANTI-INFLATION requires naming the single weakest page + improvement. weakest_link: dimension: Visual / Product Polish; sub_criterion: Overlapping, tangible cover that reads as a peel rather than a detached button; current_state: Cover UI reads as a generic yellow button with no overlap onto the model-answer card; required_improvement: redesign cover to physically overlay the model-answer card with a peel corner, drop shadow, and a visible reveal state that clearly contrasts pre- and post-reveal content.
- ESCALATION_HOMEWORK: escalating_homework:
  challenge: Create a fully topic-integrated cover-answer interaction for a second topic (e.g., a simple weather/season scene) that preserves the exact three-beat reveal contract (say → peel → compare) and requires the model answer to be visually revealed beneath a tangible cover. The new topic should include a micro-world behind the task (scene with context clues) and repurpose the same cover grammar, not rely on generic UI buttons.
  rationale: This stresses generalization of the reusable cover-answer grammar across topics, ensuring the interaction feels premium and world-integrated rather than worksheet-like.
  producer_response: ACCEPT
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: Overhaul cover-answer affordance to physically overlap model language and read as a real flap with shadow and peel cue.
- ACTION: High: Introduce a topic-integrated micro-world behind the task (market scene, weather stall, etc.).
- ACTION: High: Establish a three-beat contract (say → peel → compare) with explicit visual cues and a learner-facing comparison prompt.
- ACTION: High: Remove worksheet smell by shrinking the large blank Notes area and repurposing it as a learner-facing comparison prompt (Same/Different) after reveal.
- ACTION: Medium: Add a visible reward cue on reveal (e.g., check, sparkles) to reinforce payoff.
- ACTION: Medium: Enforce a single coherent local word set aligned with the cover scene (e.g., apples/bananas/carrots in a market scene) to improve Vocab-Frame alignment.
- ACTION: 3. Child-curiosity test integrated prompts (describe what a child would notice, want to interact with, and what currently hurts premium feel)

## Round 2 — campsite (A1)

- BOARD_PATH: `tmp/manus-board-loops/coverAnswer/round-02-campsite.jpg`
- PACKET: `tmp/manus-board-loops/coverAnswer/round-02-campsite`
- TASK: https://manus.im/app/KVmtz93uq52K2QGB2FBVAJ
- MANUS_VERDICT: pass
- SCORE: 5
- POLISH (ppt_like_quality): 5
- WEAKEST_LINK: INSTANCE-SPECIFIC | Camping-specific vocabulary binding | The current state binds a question about camping to a frame (I like ___) that cannot naturally answer What do you take camping?, causing semantic misalignment and open-answer evaluation confusion.
- ESCALATION_HOMEWORK: Propose one buildable generalisation challenge focused on semantic binding and stateful reveal logic for coverAnswer boards, escalating from current campsite topic to a contrasting Topic: Abstract process or indoor/outdoor swap with open-ended prompts. Provide a concrete generator/prompt and gate change for acceptance or decline.
- STATUS: structured_ok

### Blocking / next actions
- ACTION: Blocking: reinforce tangible peel affordance with reinforced lift cue and guaranteed payoff on reveal.
- ACTION: High: align question/response frame and model answer so they semantically bind to the same target vocabulary (e.g., replace “I like ___” with a campsite-appropriate frame like “I take ___ camping.”)
- ACTION: Medium: collapse worksheet-like note area and tighten the 3-beat contract so the flow Say → Peel → Compare feels like a cooperative classroom task, not a form-filling exercise.
- ACTION: Low: introduce a topic-rich campsite vignette that supports target nouns (tent, backpack, campfire, sleeping bag) without leaking the model answer.
- ACTION: Blocking: implement a one-job layout rule that keeps the interaction cluster compact and visually premium.

### Producer fixes applied (this pass)

R1 blockers/highs → `coverAnswer` grammar in `public/lib/edbActivities.js` +
`public/lib/renderLessonPages.js` (`makeSpeakingPage`), `speaking.targetBay`
resized in `public/lib/edbLayout.js`:

1. **Peel-able flap, not a flat button.** New `speakingFlapRect()` insets the
   flap INSIDE the model-answer card (was the exact same rect as the card).
   New `peelFlapPng()` draws it with a ~2° tilt, a drop shadow, and a folded
   top-right dog-ear so it reads as a note stuck onto a bigger card.
2. **Model-answer card, not a bare box.** The card now has an always-visible
   "✓ MODEL ANSWER" ribbon header above the flap, taller bay (72px → 132px)
   so the ribbon + flap + margins all fit without cramming.
3. **Three-beat contract made visible.** Added a `1·SAY → 2·PEEL → 3·COMPARE`
   stepper chip row above the question (was buried in a hint-text clause).
4. **Worksheet Notes shrunk + repurposed.** Replaced the "Notes / more
   answers" label + large dashed blank with a `Same ✓ / Different — try
   again` comparison-prompt row and a much smaller write line.
5. **R2 post-pass fix (semantic binding, found in campsite stress test):**
   `yesNoCue` regex matched `\bdo you\b` *anywhere*, so a WH-question like
   "What do you take camping?" also got the "Say: I like ___" frame bolted
   on — a non-sequitur. Tightened to require a true yes/no opener anchored
   at the start of the question, with an explicit WH-word veto
   (`renderLessonPages.js`).

Verified: `node scripts/verify-board-visual.cjs --cases=fruit-market` and
`--cases=campsite` — all hard checks pass on both topics; full `--tier=core`
(19 cases) run also has 0 hard failures after the change. Not implemented
this pass (left as ZPD fuel below, none were `blocking_issues` — R2's
`blocking_issues` list was empty despite the severity-worded next_actions
text): a stronger "lift" cue beyond the fold/shadow/tilt, and a topic
micro-world scene behind the card (background pack selection is a separate
producer surface from this recipe).

### ZPD next-loop fuel (R2 `zpd_challenges`, overall score 5)
- Dedicated semantic-binding gate: every `coverAnswer` board should declare
  `question_intent` / `answer_frame` / `model_answer` / `eligible_vocab` and
  reject mismatches at render time (generalizes the R2 post-pass regex fix
  into a real gate instead of a string heuristic).
- A tangible peel-state machine with a clearly lifted corner / pull-tab cue
  and a definitive revealed state with an immediate payoff (sparkle/check)
  — meaningful once this ships to an actual interactive ClassIn board, not
  just the static preview JPG.

## STATUS

| Round | Topic | Verdict | Score | Commit |
|---|---|---|---|---|
| R1 | fruit-market (A1) | revise | 68 | none (pre-existing, logged only) |
| R2 | campsite (A1) | **pass** | 5/5 (polish 5/5) | this pass — see below |

R3: not run — R2 passed clean (`blocking_issues: []`) and cost policy caps
this loop at "R3 only if needed." Remaining R2 next_actions are enhancement
ZPD fuel above, not gating.
