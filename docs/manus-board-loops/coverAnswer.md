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
