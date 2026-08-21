# Board-Type Review Roster

**Manus review/remediation contract:** [`manus-board-remediation-contract.md`](./manus-board-remediation-contract.md) — single-board grammar loops, SYSTEMIC vs INSTANCE-SPECIFIC findings, optional remediation packages, and two-topic graduation bar (Visual/Product ≥ 7/10, no P0).

Regenerate all representatives with:

`npm run preview:board-grammars`

Contact sheet: `tmp/board-type-baselines/contact.jpg`  
Machine report: `tmp/board-type-baselines/report.json`

Fallback recipes marked **isolated** are forced only in the baseline harness so
each renderer can be reviewed independently. Their normal planner activation is
covered by the existing recipe tests.

## Manus-ready compact roster

| BOARD_TYPE | REPRESENTATIVE_BOARD_PATH | KNOWN_WEAKNESS | WHAT_MANUS_SHOULD_SCRUTINIZE |
|---|---|---|---|
| `title` | `tmp/board-type-baselines/title.jpg` | can feel like a template aims slide | first impression, hierarchy, existing art/charm use, dead space, age fit, whether the opener creates interest |
| `wrap` | `tmp/board-type-baselines/wrap.jpg` | can feel like a generic “Great Job!” ending | last impression, visual polish, hierarchy, confetti/art use, dead space, age fit, whether the closer feels like a satisfying ending |
| `matchDock` | `tmp/board-type-baselines/matchDock.jpg` | retrieval support, not deep play | picture-word honesty and card readability |
| `frameTiles` | `tmp/board-type-baselines/frameTiles.jpg` | can feel worksheet-like | blank fit, tile count, readable frames |
| `phonicsSoundBoxes` | `tmp/board-type-baselines/phonicsSoundBoxes.jpg` | grapheme scope only | sound-box count and tile grab size |
| `coverAnswer` | `tmp/board-type-baselines/coverAnswer.jpg` | teacher-led reveal | cover fully hides model without hiding prompt |
| `preA1TprChoice` | `tmp/board-type-baselines/preA1TprChoice.jpg` | needs teacher voice/action | big action images and one-step clarity |
| `heroProp` | `tmp/board-type-baselines/heroProp.jpg` | quality depends on proven kit | king dominance, dock clarity, play-surface truth |
| `mysteryHints` | `tmp/board-type-baselines/mysteryHints.jpg` | identify/reveal family | staged hint value and answer leakage |
| `silhouetteGate` | `tmp/board-type-baselines/silhouetteGate.jpg` | shape can look generic | mystery intention vs broken art |
| `halfTruthBoard` | `tmp/board-type-baselines/halfTruthBoard.jpg` | evidence can crowd | claim precision and ternary judgment clarity |
| `sceneRepair` | `tmp/board-type-baselines/sceneRepair.jpg` | needs authored wrongness | funny/consequential error and obvious repair |
| `oddOneOut` | `tmp/board-type-baselines/oddOneOut.jpg` | isolated fallback; classification-heavy | credible 3+1 rule and write scaffold |
| `yesNoSort` | `tmp/board-type-baselines/yesNoSort.jpg` | isolated fallback; binary | rule honesty and balanced bins |
| `thisOrThat` | `tmp/board-type-baselines/thisOrThat.jpg` | isolated fallback; low state depth | real choice and required justification |
| `fixSentence` | `tmp/board-type-baselines/fixSentence.jpg` | text-only | exactly one error and non-trivial distractors |
| `sortBins` | `tmp/board-type-baselines/sortBins.jpg` | isolated last fallback | Things/Ideas rule and no tiny cards |
| `capacityPack` | `tmp/board-type-baselines/capacityPack.jpg` | open missions need teacher judgment | constraint visibility, exclusions, slot count |
| `routeMission` | `tmp/board-type-baselines/routeMission.jpg` | weak if steps are not materially ordered | start-finish flow and answer reveal |
| `transformationLab` | `tmp/board-type-baselines/transformationLab.jpg` | consequence is teacher-revealed, not simulated | cause/result coherence and prediction beat |
| `evidenceBoard` | `tmp/board-type-baselines/evidenceBoard.jpg` | evidence strength is authored | legibility, ranking purpose, grounded conclusion |

## Review descriptors

### `title`

- BOARD_TYPE_ID: `title`
- NAME: Lesson Title Opener
- CORE_PLAY_GRAMMAR: orient to the lesson before play begins
- LEARNER_JOB: see the topic, aims, and tone of the lesson
- WHAT_CHANGES: nothing interactive — this is the opening impression card
- WHAT_IS_REVEALED: title, level/duration, aims / grammar aims, optional title charm art
- ASSET_REQUIREMENTS: existing title background + optional title-charm / kit art already in estate
- CEFR_RANGE: Pre-A1–B2 (lesson chrome)
- KNOWN_WEAKNESSES: can read as a generic template aims slide; charm art is topic-dependent
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/title.jpg`

### `wrap`

- BOARD_TYPE_ID: `wrap`
- NAME: Wrap-Up / Completion Closer
- CORE_PLAY_GRAMMAR: close the lesson with review language and an exit ticket
- LEARNER_JOB: celebrate, recycle today’s words, say an exit ticket with a partner
- WHAT_CHANGES: review cards and peer-check remain as the closing state
- WHAT_IS_REVEALED: “Great Job!”, today’s words, exit-ticket sentences, peer check
- ASSET_REQUIREMENTS: existing wrap background + decoration confetti already in estate
- CEFR_RANGE: Pre-A1–B2 (lesson chrome)
- KNOWN_WEAKNESSES: can feel like a stock completion card; denser review text can crowd polish
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/wrap.jpg`

### `matchDock`

- BOARD_TYPE_ID: `matchDock`
- NAME: Picture–Word Connection
- CORE_PLAY_GRAMMAR: connect each pictured concept to its written word
- LEARNER_JOB: name and associate
- WHAT_CHANGES: the learner completes the picture-word association
- WHAT_IS_REVEALED: word meaning through adjacent art
- ASSET_REQUIREMENTS: honest VocabArt row for every pictured item
- CEFR_RANGE: Pre-A1–B1 support
- KNOWN_WEAKNESSES: low agency; never count as the main engaging activity
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/matchDock.jpg`

### `frameTiles`

- BOARD_TYPE_ID: `frameTiles`
- NAME: Sentence Frame Builder
- CORE_PLAY_GRAMMAR: move readable word tiles into meaningful blanks
- LEARNER_JOB: complete and say a sentence
- WHAT_CHANGES: incomplete frames become producible utterances
- WHAT_IS_REVEALED: grammatical fit
- ASSET_REQUIREMENTS: none; text tiles
- CEFR_RANGE: A1–B2
- KNOWN_WEAKNESSES: can duplicate `fixSentence`; blank bank must be honest
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/frameTiles.jpg`

### `phonicsSoundBoxes`

- BOARD_TYPE_ID: `phonicsSoundBoxes`
- NAME: Sound-Box Builder
- CORE_PLAY_GRAMMAR: arrange grapheme tiles into one focus word
- LEARNER_JOB: segment and build
- WHAT_CHANGES: empty sound boxes fill in order
- WHAT_IS_REVEALED: grapheme-to-sound structure
- ASSET_REQUIREMENTS: optional A–Z letter props; text fallback allowed
- CEFR_RANGE: Pre-A1–A2
- KNOWN_WEAKNESSES: not suitable for arbitrary spelling instruction
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/phonicsSoundBoxes.jpg`

### `coverAnswer`

- BOARD_TYPE_ID: `coverAnswer`
- NAME: Teacher Peek
- CORE_PLAY_GRAMMAR: learner answers before the teacher moves a cover
- LEARNER_JOB: produce, then compare
- WHAT_CHANGES: model answer becomes visible
- WHAT_IS_REVEALED: one sample answer
- ASSET_REQUIREMENTS: generated cover only
- CEFR_RANGE: Pre-A1–B2
- KNOWN_WEAKNESSES: teacher-led; not sufficient as a main activity
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/coverAnswer.jpg`

### `preA1TprChoice`

- BOARD_TYPE_ID: `preA1TprChoice`
- NAME: Listen, Point, Do
- CORE_PLAY_GRAMMAR: hear a command, point to a large action, then perform it
- LEARNER_JOB: respond physically
- WHAT_CHANGES: chosen action is isolated/performed
- WHAT_IS_REVEALED: comprehension through action
- ASSET_REQUIREMENTS: stocked Pre-A1 action props
- CEFR_RANGE: Pre-A1
- KNOWN_WEAKNESSES: teacher voice supplies the trigger
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/preA1TprChoice.jpg`

### `heroProp`

- BOARD_TYPE_ID: `heroProp`
- NAME: King-Stage Roleplay
- CORE_PLAY_GRAMMAR: drag roleplay tools onto one dominant play surface
- LEARNER_JOB: build or act out a scene
- WHAT_CHANGES: the hero stage becomes a created world
- WHAT_IS_REVEALED: learner plan through placement and explanation
- ASSET_REQUIREMENTS: shippable hero plus at least one coherent dock
- CEFR_RANGE: A1–B2
- KNOWN_WEAKNESSES: kit quality and hero fit vary by topic
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/heroProp.jpg`

### `mysteryHints`

- BOARD_TYPE_ID: `mysteryHints`
- NAME: Peel-Hint Mystery
- CORE_PLAY_GRAMMAR: make a guess and peel increasingly specific evidence
- LEARNER_JOB: infer a hidden word
- WHAT_CHANGES: hints accumulate and the target is uncovered
- WHAT_IS_REVEALED: category, feature, then identity
- ASSET_REQUIREMENTS: one honest pictured target
- CEFR_RANGE: A1–B1
- KNOWN_WEAKNESSES: can collapse into simple identification
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/mysteryHints.jpg`

### `silhouetteGate`

- BOARD_TYPE_ID: `silhouetteGate`
- NAME: Silhouette Gate
- CORE_PLAY_GRAMMAR: predict from a mystery shape, use hints, then peel
- LEARNER_JOB: hypothesize and confirm
- WHAT_CHANGES: silhouette cover leaves the target
- WHAT_IS_REVEALED: pictured identity
- ASSET_REQUIREMENTS: one honest pictured target; generated silhouette cover
- CEFR_RANGE: A1–A2
- KNOWN_WEAKNESSES: generic cover is not a true contour of every object
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/silhouetteGate.jpg`

### `halfTruthBoard`

- BOARD_TYPE_ID: `halfTruthBoard`
- NAME: Half-Truth Claim Board
- CORE_PLAY_GRAMMAR: judge a claim as true, half true, or false against evidence
- LEARNER_JOB: qualify a claim
- WHAT_CHANGES: a verdict chip records the judgment
- WHAT_IS_REVEALED: teacher reason under Peek
- ASSET_REQUIREMENTS: 2–4 evidence words; art preferred, text allowed
- CEFR_RANGE: A2–B2
- KNOWN_WEAKNESSES: weak claims become disguised multiple choice
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/halfTruthBoard.jpg`

### `sceneRepair`

- BOARD_TYPE_ID: `sceneRepair`
- NAME: Deliberate Scene Repair
- CORE_PLAY_GRAMMAR: remove one authored wrong piece and replace it
- LEARNER_JOB: diagnose, repair, explain
- WHAT_CHANGES: wrong scene becomes coherent
- WHAT_IS_REVEALED: why the replacement fits
- ASSET_REQUIREMENTS: wrong and correct concepts must both render honestly
- CEFR_RANGE: A1–B1
- KNOWN_WEAKNESSES: silent resolver errors must never become the joke
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/sceneRepair.jpg`

### `oddOneOut`

- BOARD_TYPE_ID: `oddOneOut`
- NAME: Odd-One-Out
- CORE_PLAY_GRAMMAR: isolate one item that breaks a 3+1 rule
- LEARNER_JOB: classify and explain
- WHAT_CHANGES: outsider moves to the Does Not Fit zone
- WHAT_IS_REVEALED: category boundary
- ASSET_REQUIREMENTS: four visually distinct pictured concepts
- CEFR_RANGE: A1–B2
- KNOWN_WEAKNESSES: classification-heavy; baseline is isolated
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/oddOneOut.jpg`

### `yesNoSort`

- BOARD_TYPE_ID: `yesNoSort`
- NAME: Yes/No Rule Sort
- CORE_PLAY_GRAMMAR: apply one visible binary question to every card
- LEARNER_JOB: classify by a stated constraint
- WHAT_CHANGES: two labeled groups fill
- WHAT_IS_REVEALED: rule membership
- ASSET_REQUIREMENTS: 4–6 distinct pictured concepts
- CEFR_RANGE: A1–B1
- KNOWN_WEAKNESSES: binary and repetitive; baseline is isolated
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/yesNoSort.jpg`

### `thisOrThat`

- BOARD_TYPE_ID: `thisOrThat`
- NAME: This-or-That Commitment
- CORE_PLAY_GRAMMAR: choose one of two pictured options and justify it
- LEARNER_JOB: commit and speak
- WHAT_CHANGES: one option occupies the choice slot
- WHAT_IS_REVEALED: learner preference/reason
- ASSET_REQUIREMENTS: two distinct pictured concepts
- CEFR_RANGE: Pre-A1–B1
- KNOWN_WEAKNESSES: shallow unless the reason is required; baseline is isolated
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/thisOrThat.jpg`

### `fixSentence`

- BOARD_TYPE_ID: `fixSentence`
- NAME: Sentence Repair
- CORE_PLAY_GRAMMAR: replace exactly one wrong word with the correct tile
- LEARNER_JOB: diagnose and repair language
- WHAT_CHANGES: sentence becomes grammatical or semantically true
- WHAT_IS_REVEALED: correct form through completed sentence
- ASSET_REQUIREMENTS: none; short text tiles
- CEFR_RANGE: A1–B2
- KNOWN_WEAKNESSES: one-error authoring must be strict
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/fixSentence.jpg`

### `sortBins`

- BOARD_TYPE_ID: `sortBins`
- NAME: Things / Ideas Sort
- CORE_PLAY_GRAMMAR: separate concrete things from abstract ideas
- LEARNER_JOB: classify every taught word
- WHAT_CHANGES: two large bins fill
- WHAT_IS_REVEALED: concrete/abstract distinction
- ASSET_REQUIREMENTS: none; readable word tiles
- CEFR_RANGE: A1–B2 fallback
- KNOWN_WEAKNESSES: generic last fallback; baseline is isolated
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/sortBins.jpg`

### `capacityPack`

- BOARD_TYPE_ID: `capacityPack`
- NAME: Capacity Pack
- CORE_PLAY_GRAMMAR: pack exactly N of more-than-N choices for a mission
- LEARNER_JOB: select under constraint and explain exclusions
- WHAT_CHANGES: numbered slots become a committed pack
- WHAT_IS_REVEALED: priorities and trade-offs
- ASSET_REQUIREMENTS: text works; pictured choices improve A1/A2 use
- CEFR_RANGE: A1–B1
- KNOWN_WEAKNESSES: open missions rely on teacher judgment
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/capacityPack.jpg`

### `routeMission`

- BOARD_TYPE_ID: `routeMission`
- NAME: Route Mission
- CORE_PLAY_GRAMMAR: arrange 3–5 materially ordered steps from start to finish
- LEARNER_JOB: plan and narrate
- WHAT_CHANGES: empty route becomes an executable sequence
- WHAT_IS_REVEALED: correct route under Peek
- ASSET_REQUIREMENTS: none; short text step cards
- CEFR_RANGE: A1–B1
- KNOWN_WEAKNESSES: invalid when steps can occur in any order
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/routeMission.jpg`

### `transformationLab`

- BOARD_TYPE_ID: `transformationLab`
- NAME: Transformation Lab
- CORE_PLAY_GRAMMAR: choose a cause between visible before and covered after
- LEARNER_JOB: predict a consequence and justify the cause
- WHAT_CHANGES: middle cause is placed; after state is peeled
- WHAT_IS_REVEALED: causal result
- ASSET_REQUIREMENTS: none; optional future state art
- CEFR_RANGE: A2–B2
- KNOWN_WEAKNESSES: teacher reveal, not a real simulation
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/transformationLab.jpg`

### `evidenceBoard`

- BOARD_TYPE_ID: `evidenceBoard`
- NAME: Evidence Board
- CORE_PLAY_GRAMMAR: rank 3–4 clues from strongest to weakest
- LEARNER_JOB: investigate and build an argument
- WHAT_CHANGES: blank case file becomes an evidence hierarchy
- WHAT_IS_REVEALED: grounded conclusion under Peek
- ASSET_REQUIREMENTS: none; concise text evidence
- CEFR_RANGE: B1–B2
- KNOWN_WEAKNESSES: producer must author genuinely different evidence strengths
- REPRESENTATIVE_BOARD_PATH: `tmp/board-type-baselines/evidenceBoard.jpg`
