# Board Archetype Consolidation

Repo-grounded audit of interactive board mechanics, followed by three low-risk prototypes.
Stockpile harvesting and global visual-grammar wiring were **not** part of this pass.

Generated: 2026-08-19

---

## Verified platform assumptions

### Board / canvas facts

| Claim | Verdict | Evidence |
|---|---|---|
| Visible board is **1280 × 590** | **TRUE** | `public/lib/buildEdb.js` (`BOARD_W`/`BOARD_H`), `edbLayout.js`, `docs/edb-lesson-spec.md`, board-ux skill |
| `.edb` has a very tall canvas | **TRUE, but for pages** | `CANVAS_H = BOARD_H * 50` (29500). Page `i` sits at `y = i * 590`. This is a **50-screen scroll stack**, not a free off-stage prop bay on one page |
| Off-page / off-stage staging is a reliable mechanic | **FALSE for product design** | Objects placed outside a page’s 590-band land in the next page’s viewport when the teacher scrolls. Do **not** build archetypes around hidden “below the fold” staging |
| Drag / lock / hide-reveal | **TRUE (limited)** | Locked scenery + unlocked pieces only (`docs/edb-lesson-spec.md`). Covers/flaps work as overlapping unlocked images. No scripting, no auto-score |
| Persistent state across pages | **FALSE** | Each page is independent locked BG + pieces. No shared runtime state between screens |
| State-pair art (open/closed hide-reveal) | **Assets live; mechanic unwired** | `09_props` pack `hide-reveal` (~40 keys). Live `hideSeek` still uses solid covers; planner does not select it today |
| StoryScene | **Renderer ready; producer partial** | `storyScene.js` + `renderLessonPages`; `ProducerBridge` can inject some scenes. Not a full semantic story pipeline |
| HeroProp | **Partially live** | Soft-gated `SHIPPABLE_KING_KEYS` + kit assessment; falls through to other recipes when unproven |
| Recipe / boardPlan path | **Solid** | `EdbActivities.plan` → assignments → `buildBoardPlan` → `LessonPages` → `.edb` |

### Delivery-model facts

| Claim | Verdict | Evidence |
|---|---|---|
| Primary experience is exclusively 1-on-1 | **NOT VERIFIED as exclusive** | Product is **teacher-coached ClassIn boards** (`docs/edb-lesson-spec.md`: “No auto-check… teacher coaches”). Phonics/story copy is teacher-led. ClassIn supports 1-on-1 *and* small groups |
| Two-student secret relay as default | **POOR FIT** | Adapt info-gap to **teacher Peek / learner does not see answer** (`coverAnswer`), not peer-only secrecy |

---

## Candidate classification (15)

Treat overlaps as one family where noted.

| # | Archetype | Class | Repo evidence | Assets | Missing | Teacher cue? | CEFR sweet spot | Gimmick risk | Meaning via drag? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Half-Truth Board | **EASY_WIRING** → prototyped | New recipe on existing pads/covers | VocabArt / props as evidence | Author `halfTruth` payload (or derived odd-set) | Yes (claim + peel) | A2–B2 | Medium if overused | **Yes** (verdict choice) |
| 2 | Deliberate Repair / Wrong Room / Scene Repair | **EASY_WIRING** → prototyped (+ text twin already live) | `fixSentence` already ships authored morph/vocab errors; `sceneRepair` adds visual wrongness | Props / VocabArt | Authored wrongness framing (done) | **Required** (“on purpose”) | A1–B1 | Low if framed | **Yes** |
| 3 | Layer Stack / Time Machine | **HEAVY_ARCHITECTURE** | No z-order animation; pages static | Some transform VG stockpile | State machine + multi-layer compositor | Yes | B1+ | High | Weak without real state |
| 4 | Silhouette Gate / Mystery Reveal | **EASY_WIRING** → prototyped (+ `mysteryHints` twin) | `mysteryHints` live; silhouette cover is new silhouette | Live art under cover; canvas silhouette gate (no manifest spray) | Optional real silhouettes later | Light | Pre-A1–A2 | Medium | **Yes** (guess → peel) |
| 5 | Viewpoint Token / Empty Chair | **MODERATE_WIRING** | Cast props exist; no viewpoint recipe | Cast / chair / window | Planner semantics + empty-seat art | Yes | B1–B2 | Medium | Yes if “who knows what” |
| 6 | Capacity Board / Pack-and-Check | **MODERATE_WIRING** | `heroProp` trays/containers; no capacity rule | Hero lunch tray / bags | Capacity constraint UI | Light | A1–A2 | Low–medium | **Yes** |
| 7 | Occluder | **DUPLICATES_EXISTING_RECIPE** | `coverAnswer`, `hideSeek`, mystery covers | Covers / hide-reveal | — | Light | All | High alone | Weak alone |
| 8 | Secret Instruction Relay | **POOR_FIT** (as two-student) / **ALREADY_POSSIBLE** adapted | `coverAnswer` = teacher Peek | Sticky covers | — | Teacher script | A2–B1 | High if forced pairs | Indirect |
| 9 | Subtraction / Disappearing Scene | **MODERATE_WIRING** | Drag-off only; no vanish | Props | “What left?” framing | Yes | A1–A2 | Medium | Yes |
| 10 | Consequence Chain | **HEAVY_ARCHITECTURE** | Needs cross-page state (**unsupported**) | — | Persistence | Yes | B1–B2 | High | N/A without state |
| 11 | Misconception Fork | **HEAVY_ARCHITECTURE** | No branching runtime | — | Branch UI | Yes | B1–B2 | High | Text-heavy |
| 12 | Evidence Wall | **MODERATE_WIRING** | Overlaps Half-Truth + sort | Props + carriers | Wall layout | Yes | B1–B2 | Medium | Yes |
| 13 | Living Map / Dispatch | **HEAVY_ARCHITECTURE** | No route/map recipe live | A2 stockpile maps (raw) | Map renderer | Yes | A2–B1 | Medium | Yes if built |
| 14 | Reaction Rack | **MODERATE_WIRING** | Feelings dock / face king adjacent | Feelings props | Reaction grid recipe | Light | A1–B1 | Medium | Partial |
| 15 | Curator / Limited Display | **MODERATE_WIRING** | Overlaps Capacity | Props | Slot limit chrome | Yes | A2–B2 | Medium | **Yes** |

### Research ideas that failed repo reality

- **Layer Stack / Time Machine** — no real layer time machine; tall canvas ≠ staging bay.
- **Consequence Chain** — depends on persistent cross-page state that does not exist.
- **Secret Instruction Relay (two students)** — delivery model is teacher-coached boards, not peer secrecy.

### Existing recipes that already solve part of the problem

| Need | Existing recipe |
|---|---|
| Authored language error | `fixSentence` |
| Mystery + peel hints | `mysteryHints` |
| Teacher-only answer | `coverAnswer` |
| Theme outlier | `oddOneOut` |
| Binary / constraint sort | `yesNoSort` |
| King stage play | `heroProp` |

---

## Final six core archetypes

Ranked by teacher value × engagement × reuse × CEFR scale × simplicity × asset readiness × distinct silhouette × ability to break repetitive match/sort loops.

1. **Silhouette Gate / Mystery Reveal** — uncertainty + staged reveal; scales Pre-A1 (point/guess) → B1 (justify).
2. **Half-Truth / Claim–Evidence** — partial truth forces precise language; strong A2–B2.
3. **Deliberate Repair (text + scene)** — find/fix intentional error; `fixSentence` + `sceneRepair`.
4. **Capacity / Pack-and-Check** — visible constraint on a hero container (next after prototypes).
5. **Viewpoint / Empty Chair** — somebody does not know something (B1–B2).
6. **Evidence Wall / Curator** — board keeps a limited visible record (distinct from Half-Truth by *accumulation*, not ternary verdict).

These six are meaningfully different: reveal, judge claim, fix wrongness, pack under limit, take a viewpoint, build a limited record.

### Deferred / rejected from the fifteen

- Occluder, Secret Relay → fold into Peek / Half-Truth / Silhouette.
- Layer Stack, Consequence Chain, Misconception Fork, Living Map → architecture or unsupported platform.
- Subtraction, Reaction Rack → useful later; lower distinctiveness vs existing docks/sorts.

---

## Three prototypes implemented

| Prototype | Recipe ID | Eligibility (no spray) |
|---|---|---|
| Silhouette Gate | `silhouetteGate` | `activity.boardArchetype` / `mysteryMode=silhouette` / narrow cue (`mystery shape`, `silhouette`, …) + pictured target + ≥3 hints |
| Half-Truth | `halfTruthBoard` | `boardArchetype=halfTruth` / `activity.halfTruth` / narrow cue + evidence set |
| Scene Repair | `sceneRepair` | `boardArchetype=sceneRepair` / `activity.sceneRepair` / narrow cue; wrongness must be **authored** (lesson payload or derived odd-set framed as intentional) |

Planner order (after heroProp, before legacy ladder): silhouette → halfTruth → sceneRepair → existing fix/odd/mystery/yesNo/thisOrThat/sortBins.

### Implementation changes

- `public/lib/edbActivities.js` — resolvers, recipes, eligibility helpers, planner branch, exports, `RECIPE_OWNS_ART`
- `public/lib/renderLessonPages.js` — titles/hints/`recipeOwnsPlay` for the three recipes
- `scripts/preview-board-archetype-prototypes.cjs` — matrix bake
- `docs/board-archetype-consolidation.md` — this report

No global visual-grammar wiring. Silhouette cover is a canvas PNG (distinct dark PEEL shape), not a harvested-manifest spray.

### Deliberate wrongness safety

- `sceneRepair` banner: **“FIND THE MISTAKE — the board put one wrong piece on purpose”**
- Never uses resolver failures as content; derived path only reuses an honest odd-one-out *set* and labels it as authored wrongness.

---

## Test matrix

| Slug | Level | Topic | Archetype | Result |
|---|---|---|---|---|
| `prea1-fruit-silhouetteGate` | A1 familiar* | Fruit shapes | silhouetteGate | OK |
| `a1-fruit-silhouetteGate` | A1 | Fruit Market | silhouetteGate | OK |
| `a2-fruit-halfTruth` | A2 | Fruit Market | halfTruthBoard | OK |
| `b1-sports-sceneRepair` | B1 | Sports and Games | sceneRepair | OK |
| `b2-abstract-halfTruth` | B2 | Abstract apartment words | halfTruthBoard | OK (evidence art weaker) |

\*Pre-A1 live path forces `preA1TprChoice`; silhouette prototype uses A1 framing on a Pre-A1-friendly concrete topic so the recipe is testable without fighting TPR.

### Preview paths

Under `tmp/board-archetype-prototypes/` (gitignored):

- `prea1-fruit-silhouetteGate.jpg`
- `a1-fruit-silhouetteGate.jpg`
- `a2-fruit-halfTruth.jpg`
- `b1-sports-sceneRepair.jpg`
- `b2-abstract-halfTruth.jpg`
- `report.json`

Bake: `node scripts/preview-board-archetype-prototypes.cjs`

### Prototype verdicts

| Prototype | Verdict | Notes |
|---|---|---|
| Silhouette Gate | **READY** | Distinct silhouette, peel hints, guess line; clear vs broken art |
| Half-Truth | **PROMISING_BUT_NEEDS_POLISH** | Fruit case strong; abstract evidence icons can be weak; Peek strip layout tightened |
| Scene Repair | **READY** | Authored wrongness framing is unmistakable; dock swap is clear |

### Self-check (summary)

1. Silhouette readable from dark PEEL cover; Half-Truth from claim+ternary pads; Repair from red “on purpose” banner.
2. Drag = verdict / remove-wrong / peel-to-confirm — not decorative.
3. Something changes (cover moves, chip lands, wrong piece leaves slot).
4. Uncertainty / constraint / intentional error present.
5. Language during play (guess, judge, explain fix).
6. Teacher can run in ~4 min with Peek key.
7. Less repetitive than bare match/sort when opted in.
8. Clutter controlled; Half-Truth needs care on crowded bays.
9. Uses live VocabArt/props; no custom scene harvest.
10. CEFR demand changes via claim complexity / explain-why — not just longer text.

---

## Known limitations

- Archetypes are **opt-in / narrow-cue**; producer schema does not yet emit `boardArchetype` by default (intentional — no spray).
- Pre-A1 live lessons still prefer TPR activity; silhouette is not auto-forced on Pre-A1.
- Half-Truth on abstract vocab depends on honest pictured evidence.
- Hide/reveal open–closed state swaps still unwired.
- No cross-page memory; Capacity / Viewpoint / Evidence Wall still not implemented.

---

## Next (prototypes 4–6) — only if first three prove worthwhile

Recommended order:

1. **Capacity / Pack-and-Check** — best next: rides `heroProp` trays, high teacher value, low new architecture.
2. **Viewpoint / Empty Chair** — strong B1–B2, needs cast/empty-seat honesty.
3. **Evidence Wall / Curator** — after Half-Truth is polished, so the two stay visually and pedagogically distinct.

Do **not** start Layer Stack or Consequence Chain until platform assumptions change.
