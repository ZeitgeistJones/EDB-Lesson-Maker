# Full Board-Type Audit

Generated: 2026-08-20

Scope: live producers, planner, recipe registry, layout templates, renderers,
story compositor, fixtures, previews, tests, dormant recipes, and prior
prototypes. This is a board-system audit. It does not resume asset work.

## Decision rule

A theme is not a board type. After stripping topic nouns, every type must answer:

1. What does the child physically do?
2. What visible state changes?
3. What does the board remember after the move?
4. What language is needed during the move?
5. Is its silhouette distinct from choose, match, identify, or generic sorting?

One board gets one learner job. Pieces must be large enough for ClassIn. There
is no scoring, snapping, physics, animation, or cross-page state.

## Live architecture inventory

### Producer and planning path

- `api/generate-lesson.js`: lesson schema and content prompt.
- `public/lib/producerBridge.js`: Pre-A1, hero-stage, and deterministic story
  normalization.
- `public/lib/edbActivities.js`: 24 registered interaction recipes, content
  resolvers, planner precedence, and board plan construction.
- `public/lib/edbLayout.js`: 13 page-zone templates on the 1280×590 board.
- `public/lib/renderLessonPages.js`: DOM chrome and page-specific visual
  contracts.
- `public/lib/storyScene.js`: eight deterministic story-stage compositions.
- `public/lib/buildEdb.js` and `public/lib/exportBoardPreview.js`: `.edb` and
  review render paths.

### Reusable page formats

| Page format | Learner job after nouns are removed | Status |
|---|---|---|
| `title` | orient to lesson | KEEP as chrome, not play |
| `warm` | connect prior experience; A1/A2 may color | KEEP |
| `vocab` | name and connect picture to word | KEEP as support |
| `vocabSentences` | notice a word in a model sentence | KEEP as support |
| `frames` | complete and produce sentence frames | KEEP |
| `story` | follow one story beat with a separate picture stage | KEEP |
| `comprehension` | recall/infer and write | KEEP |
| `creative` | imagine/draw/write a continuation | KEEP |
| `speaking` | answer, then reveal a model | KEEP |
| `activity` | one selected play grammar | KEEP |
| `heroStage` | play on one dominant roleplay surface | KEEP |
| `wrap` | retrieve and say lesson language | KEEP |
| `phonics` | build grapheme sequence in sound boxes | KEEP |

These are delivery formats, not all distinct play grammars. They remain covered
by the quality fixture suite rather than inflating the activity-type count.

### Story visual grammars

| StoryScene template | Visual relation | Status |
|---|---|---|
| `charObject` | one actor attends to one object | KEEP |
| `dialogue` | two speakers face each other | KEEP |
| `exchange` | one item passes between people | KEEP |
| `action` | actor performs an honest stocked pose | KEEP |
| `group3` | three-person group focus | KEEP |
| `travel` | actor approaches a destination/vehicle | KEEP |
| `heroFocus` | one large noun/place feature dominates | KEEP |
| `locationActivity` | actor acts inside a place | KEEP |

These compose story illustrations. They do not themselves give the learner a
drag job. Story remains first-class, but story sequencing needs a separate
learner grammar.

## Recipe-by-recipe inventory

The live registry now contains 24 recipes. Nineteen survive as useful,
isolatable interaction grammars. Five remain in code only for compatibility and
are not planner-selected.

| Recipe | Child job | Visible change / memory | Verdict |
|---|---|---|---|
| `matchDock` | connect picture and word | picture-word association on card | KEEP support |
| `frameTiles` | complete blanks | finished utterance remains | KEEP support |
| `phonicsSoundBoxes` | build sound sequence | graphemes occupy boxes | KEEP support |
| `coverAnswer` | answer, then peel model | answer becomes visible | KEEP support |
| `preA1TprChoice` | hear, point, choose, do | selected action is performed | KEEP main |
| `heroProp` | place roleplay tools on a dominant stage | created scene remains | KEEP main |
| `mysteryHints` | guess and peel staged hints | evidence accumulates | KEEP narrow |
| `silhouetteGate` | predict from shape, then reveal | hidden identity appears | KEEP main |
| `halfTruthBoard` | judge a claim against evidence | verdict chip records judgment | KEEP main |
| `sceneRepair` | remove authored wrongness and replace it | scene becomes correct | KEEP main |
| `oddOneOut` | remove/classify an outsider | outsider is isolated | KEEP fallback |
| `yesNoSort` | apply one binary rule | two groups remain | KEEP fallback |
| `thisOrThat` | commit to one option and justify | choice remains visible | KEEP fallback |
| `fixSentence` | replace one wrong word | sentence becomes grammatical/true | KEEP main |
| `sortBins` | separate things from ideas | categories remain | KEEP last fallback |
| `capacityPack` | choose exactly N items under a constraint | packed slots record decision | NEW / KEEP main |
| `routeMission` | arrange materially ordered mission steps | route remains from start to finish | NEW / KEEP main |
| `transformationLab` | choose a cause, predict, reveal result | before becomes explained after | NEW / KEEP main |
| `evidenceBoard` | rank clues by strength | case file records argument | NEW / KEEP main |
| `orderLine` | reorder words on wrap | sentence order remains | RETIRE: wrap collision and frame twin |
| `hideSeek` | move generic covers | hidden emoji appears | RETIRE: mystery/silhouette duplicate |
| `revealReward` | move a decorative prize flap | star appears | RETIRE: no language consequence |
| `buildScene` | put four pictures into generic numbered slots | arbitrary collage remains | RETIRE: hollow expression |
| `dressUp` | place vocab pictures on a random body | arbitrary overlap remains | RETIRE: wrong activity shape |

Retired recipes are deliberately not deleted in this pass. The planner already
does not emit them, and removal would create unnecessary compatibility risk.

## Engagement/play diagnosis

Before this pass, the main activity ladder leaned heavily on:

- identify/reveal: `mysteryHints`, `silhouetteGate`
- choose: `thisOrThat`, `halfTruthBoard`
- classify/sort: `oddOneOut`, `yesNoSort`, `sortBins`
- one strong create surface: `heroProp`
- two strong repairs: `sceneRepair`, `fixSentence`

The problem was not that matching or sorting existed. Those are useful support
jobs. The problem was that the planner lacked reusable grammars for constrained
creation, route planning, causal transformation, and accumulating evidence.

## Candidate discovery

Scoring dimensions, each 0–5:

- **A** learner agency
- **C** visible consequence / board memory
- **D** distinctness from choose-match-sort
- **F** ClassIn fit
- **R** content/renderer readiness
- **L** CEFR scalability

Total is out of 30. A high score does not force implementation; overlap and
authoring burden can still reject a candidate.

| # | Candidate grammar | A | C | D | F | R | L | Total | Decision |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Capacity Pack | 5 | 5 | 5 | 5 | 5 | 4 | 29 | IMPLEMENT |
| 2 | Route Mission | 5 | 5 | 5 | 5 | 5 | 4 | 29 | IMPLEMENT |
| 3 | Transformation Lab | 5 | 5 | 5 | 5 | 4 | 5 | 29 | IMPLEMENT |
| 4 | Evidence Board | 5 | 5 | 5 | 5 | 4 | 5 | 29 | IMPLEMENT |
| 5 | Scene Repair | 5 | 5 | 5 | 5 | 5 | 4 | 29 | KEEP |
| 6 | Hero Builder World | 5 | 5 | 5 | 5 | 4 | 4 | 28 | KEEP |
| 7 | Half-Truth Claim Change | 4 | 4 | 4 | 5 | 5 | 5 | 27 | KEEP |
| 8 | Silhouette Gate | 4 | 4 | 4 | 5 | 5 | 4 | 26 | KEEP |
| 9 | Story Sequence | 5 | 5 | 4 | 5 | 3 | 5 | 27 | DEFER; overlaps Route Mission |
| 10 | Viewpoint Chair | 4 | 4 | 5 | 4 | 2 | 5 | 24 | DEFER; authoring semantics |
| 11 | Toolbelt Draft | 5 | 5 | 5 | 5 | 4 | 4 | 28 | FOLD into Capacity Pack |
| 12 | Rescue Triage | 5 | 5 | 5 | 4 | 2 | 5 | 26 | DEFER; needs scenario authoring |
| 13 | Priority Ladder | 4 | 5 | 4 | 5 | 4 | 5 | 27 | FOLD into Evidence Board |
| 14 | Constraint Auction | 5 | 4 | 5 | 3 | 2 | 5 | 24 | REJECT; teacher bookkeeping |
| 15 | Budget Board | 5 | 5 | 5 | 3 | 2 | 5 | 25 | DEFER; arithmetic burden |
| 16 | Trade-off Bench | 5 | 4 | 5 | 4 | 3 | 5 | 26 | DEFER; B1/B2 payload |
| 17 | Prediction Window | 4 | 5 | 4 | 5 | 4 | 5 | 27 | FOLD into Transformation |
| 18 | Cause Chain | 5 | 5 | 5 | 3 | 2 | 5 | 25 | REJECT; cross-page state |
| 19 | Missing Step Repair | 5 | 5 | 4 | 5 | 4 | 4 | 27 | FOLD into Route Mission |
| 20 | Timeline Repair | 5 | 5 | 4 | 5 | 3 | 5 | 27 | FOLD into Route Mission |
| 21 | Recipe Assembly | 5 | 5 | 4 | 5 | 3 | 4 | 26 | FOLD into Route Mission |
| 22 | Storyboard Director | 5 | 5 | 5 | 4 | 2 | 5 | 26 | DEFER; needs story card producer |
| 23 | Dialogue Director | 5 | 4 | 5 | 5 | 3 | 5 | 27 | DEFER; speech payload |
| 24 | Question Builder | 5 | 4 | 5 | 5 | 3 | 5 | 27 | DEFER; grammar validation |
| 25 | Sentence Surgery | 5 | 5 | 4 | 5 | 5 | 5 | 29 | Existing `fixSentence` |
| 26 | Contradiction Hunt | 4 | 5 | 5 | 5 | 3 | 5 | 27 | FOLD into Half-Truth |
| 27 | Witness Lineup | 4 | 4 | 5 | 5 | 2 | 5 | 25 | DEFER; cast truthfulness |
| 28 | Rumor Filter | 4 | 4 | 4 | 5 | 3 | 5 | 25 | FOLD into Evidence Board |
| 29 | Proof Ladder | 5 | 5 | 5 | 5 | 4 | 5 | 29 | FOLD into Evidence Board |
| 30 | Risk Radar | 4 | 4 | 5 | 4 | 2 | 5 | 24 | DEFER; abstract labels |
| 31 | Rule Inventor | 5 | 4 | 5 | 5 | 3 | 5 | 27 | DEFER; teacher-led extension |
| 32 | Classification Boundary | 4 | 4 | 4 | 5 | 4 | 5 | 26 | DEFER; too close to sort |
| 33 | Analogy Bridge | 4 | 4 | 5 | 5 | 3 | 5 | 26 | DEFER; B1/B2 authoring |
| 34 | Map Legend Builder | 5 | 5 | 5 | 4 | 2 | 4 | 25 | DEFER; map renderer |
| 35 | Caption Detective | 4 | 4 | 4 | 5 | 4 | 5 | 26 | DEFER; story integration |
| 36 | Collocation Forge | 5 | 4 | 4 | 5 | 3 | 5 | 26 | DEFER; linguistic validator |
| 37 | Pronoun Relay | 4 | 4 | 4 | 5 | 3 | 5 | 25 | DEFER; sentence system |
| 38 | Tone Switchboard | 4 | 4 | 5 | 5 | 2 | 5 | 25 | DEFER; B2 only |
| 39 | Register Repair | 5 | 5 | 5 | 5 | 2 | 5 | 27 | DEFER; B2 payload |
| 40 | Perspective Swap | 4 | 4 | 5 | 4 | 2 | 5 | 24 | DEFER; viewpoint semantics |
| 41 | Occlusion Reveal | 3 | 4 | 2 | 5 | 5 | 4 | 23 | Existing mystery family |
| 42 | Information Gap | 4 | 3 | 4 | 3 | 3 | 5 | 22 | Use teacher `coverAnswer` only |

Twenty-six of 42 names are outside the prompt's named examples (62%). The
selection is intentionally four, not a quota fill: several high scorers are
better expressed as variants of the four new visual contracts.

## Implemented visual contracts

### `capacityPack`

- Job: commit exactly 1–4 of 3–6 options to a mission.
- State change: numbered slots fill; excluded choices stay visible.
- Board memory: the final packed set.
- CEFR: A1 names choices; A2 justifies exclusions; B1 weighs constraints.
- MIN/MAX: 3–6 options; 1–4 slots; options must exceed slots.

### `routeMission`

- Job: arrange 3–5 materially ordered steps from start to finish.
- State change: blank route becomes a sequence.
- Board memory: completed plan.
- CEFR: A1 first/next/last; A2 instructions; B1 dependencies and reasons.
- MIN/MAX: 3–5 steps.

### `transformationLab`

- Job: place one of 2–4 change cards between before and after, predict, reveal.
- State change: cause occupies the middle; consequence is uncovered.
- Board memory: before → cause → after.
- CEFR: A2 concrete causes; B1 condition/reason; B2 trade-off/counterfactual.
- MIN/MAX: exactly one before and after; 2–4 changes; one valid answer.

### `evidenceBoard`

- Job: rank 3–4 clues from strongest to weakest and reveal conclusion.
- State change: empty case file becomes an ordered argument.
- Board memory: evidence hierarchy.
- CEFR: B1 because/therefore; B2 quality, relevance, and limitations.
- MIN/MAX: 3–4 evidence cards.

## Producer fix

This pass fixes the machinery, not only four fixtures:

- the lesson schema can author all four grammars;
- the generation prompt defines eligibility, MIN/MAX, and CEFR changes;
- resolvers validate payloads and fail closed;
- explicit board grammar beats an incidental hero-kit match;
- narrow title cues still yield to a proven king;
- renderers supply grammar-specific titles, instructions, and one-job chrome;
- a shared baseline generator isolates every surviving recipe.

## Final 10-question engagement audit

1. **Can the child state the one job?** Yes; every kept baseline has one verb-led cue.
2. **Does dragging carry meaning?** Yes for main grammars; support drills remain
   explicitly classified as support.
3. **Does something visible change?** Yes for all main grammars.
4. **Does the board remember the decision?** Yes: filled slots, ordered route,
   cause bridge, ranked evidence, repair, verdict, or built stage.
5. **Is there uncertainty, constraint, or consequence?** Yes in the four new
   grammars and the strongest existing types.
6. **Must the learner speak during play?** Yes; renderer cues require naming,
   predicting, explaining, or justifying.
7. **Are pieces ClassIn-sized?** Yes; meaningful movable choices use the 64px
   grab floor or larger.
8. **Does CEFR change cognition, not item count?** Yes; descriptors specify
   different language demands, especially for B1/B2.
9. **Are choose/match/sort still present but bounded?** Yes; they survive as
   support or fallback, not the whole portfolio.
10. **Can a child truthfully say “the board changed because of what I did”?**
    Yes. Capacity, route, transformation, evidence, repair, and hero-stage now
    provide that answer without unsupported simulation.

## Final verdict

The system is no longer conceptually dependent on choose/match/sort/identify.
Those mechanics still serve retrieval and fallback needs, but the main grammar
portfolio now includes constrained creation, planning, repair, causal change,
investigation, reveal, judgment, language correction, and roleplay.
