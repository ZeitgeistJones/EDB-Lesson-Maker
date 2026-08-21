# Manus board loop — `heroProp`

Independent single-board optimization log.

## Round 1 — dentist (A1)

- BOARD_PATH: `tmp/manus-board-loops/heroProp/round-01-dentist.jpg`
- PACKET: `tmp/manus-board-loops/heroProp/round-01-dentist`
- TASK: https://manus.im/app/WV8kiH59jVdNxHPa7L8G7r
- MANUS_VERDICT: revise
- SCORE: 24
- POLISH (ppt_like_quality): 2
- WEAKEST_LINK: SYSTEMIC — Reusability / Generalization: semantic-contract integrity. The current tokens (title, learner verb, prop set, stage targets, and payoff) are not consistently aligned to the dentist board job, causing a drift between intended activity and observable world.
- ESCALATION_HOMEWORK: challenge: Implement a heroProp semantic-contract gate to enforce topic-verb-tool alignment and ensure stage payoff is visible before approval; rationale: generalizes quality across topics by preventing semantic drift; producer_response: ACCEPT
- STATUS: structured_ok

### Blocking / next actions

- BLOCK: B1: Title/instruction promises dental tools yet the provided dock assets show facial features, creating a semantic-contract mismatch that blocks meaningful heroProp use.
- BLOCK: B2: Central stage lacks a defined dental context and visible before/after payoff; learners cannot observe a transformation from tool use to a created world.
- BLOCK: B3: Production task lacks observable target-language evidence aligned to A1; prompts such as "Drag tools onto the patient, then say what you used and why" are not scaffolded for beginner language.
- BLOCK: B4: Asset choices (mouth/face parts) do not map to a dentist role, undermining topic coherence and reducing reusability across topics.
- ACTION: Blocking|Scene|Redesign the stage around a dental chair with a readable mouth focal point and a clearly defined patient
- ACTION: High|Scene|Introduce a clearly labelled dental tool tray (5–6 large tools) with distinct hit areas and a predictable vocabulary mapping
- ACTION: Medium|Scene|Rename the local title to a concrete mission (e.g., "Help the Dentist!") and add simple frames such as "I use the ___ to ___" alongside images
- ACTION: Medium|Scene|Attach the dock as an integrated clinic tray with consistent baseline and padding; ensure spacing prevents overlap and misinterpretation
- ACTION: Low|Scene|Add a visible before/after payoff state showing the patient with a treated smile after the tool placements

### Systemic response

- FIX: Strong resolved topic kings now outrank narrow convenience intents (`smile` can no longer replace a dentist patient with `face-blank`).
- FIX: King copy is keyed by the actual hero, uses a concrete build mission, and exposes an observable sentence frame.
- FIX: Every king board renders a quiet source tray plus the visible payoff sequence `BUILD → POINT → SAY`.
- FIX: The tray preserves thin tools at the 64px grab floor and caps themed kits at 12 instead of silently dropping overflow.
- GATE: `BoardReadiness.heroStageContract` checks planned/rendered/canonical hero agreement, visible dock count, dock-family alignment, and action-to-language scaffolding before Ready.
- REGENERATED: `tmp/dental-hero-preview.jpg` — open-mouth patient, dental roleplay tools, concrete mission, A1 frame, integrated tray.

## Round 2 — camping (A1)

- BOARD_PATH: `tmp/manus-board-loops/heroProp/round-02-camping.jpg`
- PACKET: `tmp/manus-board-loops/heroProp/round-02-camping`
- TASK: https://manus.im/app/kqW2stbPBDsB8zeKWdfA5S
- MANUS_VERDICT: revise
- SCORE: 72
- POLISH (ppt_like_quality): 4
- WEAKEST_LINK: SYSTEMIC | Visual/World integration | The dock does not convincingly anchor a cohesive campsite world; stage is largely empty and the prop set reads as an inventory strip rather than a scene-building ecosystem. Required_improvement: reframe the world around a ground plane and staged anchors; ensure every dock item has a clear scene-role and a visible completion state that demonstrates a tangible campsite transformation.
- ESCALATION_HOMEWORK: Exactly ONE escalating generalization challenge as a buildable spec that stresses the PRODUCER (a new topic, a new page type, a harder CEFR level, or a multi-round activity), escalating relative to what has already passed. Phrase as a proposal the human can accept or decline — not an auto-build.
- STATUS: structured_ok

### Blocking / next actions

### Systemic response

- FIX: Open-world kings are now explicitly classified apart from container kings, so scene builders receive created-world chrome while backpacks/fridges keep the hero itself as the drop surface.
- FIX: Scene builders render a quiet ground plane around the hero instead of leaving movable props as a detached inventory strip.
- FIX: The visible completion contract now says `FINISH · 3 PIECES + 1 SENTENCE`, connecting placement to an observable language payoff.
- GATE: Camping regression proves a tent hero, exactly 12 visible dock tools, zero silent drops, and world-builder classification.
- REGENERATED: `tmp/board-type-baselines/heroProp.jpg` — tent anchors a marked build world; dock remains a separate source tray.
