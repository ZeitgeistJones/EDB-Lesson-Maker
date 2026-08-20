# self-feelings-compass

type: selfloop  
case: feelings-compass  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Two read-only judges (teacher + student) re-review the baked board; the single
serialized builder folds every finding into the **producer** (prompts / fixtures
/ gates / pickers), never one-off PNGs. Honors `.cursor/rules/fix-the-producer`.

## Product intent

B1 feelings board, abstract-vocab stress test. face-blank king + feeling-* dock;
aims ⊆ board vocab; second-conditional honesty; New Words is drag-picture-to-
numbered-word so it lives or dies on **unmistakable, mutually-distinct icons**;
warm-up elicits prior knowledge target-neutral; drag pieces stay label/number-free.

## Audit

```bash
node scripts/verify-feelings-compass.mjs --story-art=auto
```
Re-read `page-1-warm.jpg`, `page-2-newWords.jpg`, `page-4-frames.jpg`,
`page-10-activity.jpg` on the images (gates cannot see everything).

## Round 1 (log)

7 fixes shipped and re-checked as HELD in round 2:
- Frame copy vertical clip (line-height 1.4 + no clip) — S50/S51
- `shy` glyph == `happy` smile → EMOJI_OVERRIDES shy→😳 — S52
- board-face corner eye-egg leak on emotion board → egg-free board-house — S53
- feelings drag faces postage-stamp (64px) → enlarged to ~135px — S54
- title aims/grammar panel dark-on-dark → light ink on dark slab — S55
- (plus prior loop) two-round Feelings Lab + If…would Round 2; leading feeling
  captions; wrap timing chip.

## Round 2 (this run) — 2026-08-08

Merged teacher+student fix list, priority order:

| # | Sev | Finding | Producer fix (then regen) | Gate |
|---|-----|---------|---------------------------|------|
| 1 | MED (both) | "confused" reads as flat neutral 😐 on the New Words drag dock | **Root:** dock renders the vocab-pack PNG via `wordArtPng`, NOT the emoji — pack always wins. Repoint `fetch-vocab-icons.mjs` confused 😕(1f615)→🤔(1f914) + re-render `confused.png` + index.json; also EMOJI_OVERRIDES confused→🤔 + fixture emoji (fallback/consistency) | S56 |
| 2 | tiebreak | student asked to number/label the drag emoji | **REJECT** — reveals the match, violates S26 no-answer-naming. Solve guessing via unambiguous + mutually-distinct icons (fix #1), keep drag pieces label/number-free | S58 |
| 3 | MED | warm-up pre-cued "surprised" before it's taught | fixture question → "How are you feeling right now, and why?"; generate-lesson warmUp target-neutral rule (general + feelings) | S57 |
| 4 | MED | activity six faces (feeling-*.png) hard to tell apart | **Uncheckable in producer** without regenerating feeling-* prop art with per-emotion cue marks (tears/sweat/brow). No answer labels (S58). → wishlist | — |
| 5 | LOW | Frame 3 "I would feel ___ if someone ___." two open blanks, no scaffold | `makeFrames` renders a Word bank chip row of the six taught feelings (data-frame-word-bank) — same choice set as New Words, no per-frame mapping | — |
| 6 | LOW | activity instruction card cramped | widened 420→ font 22→24px / line-height 1.45; kept width ~400px so it clears the centre hero and fills the empty left-column vertically (640px overlapped the head) | — |

### New gates (continue S-series)
- **S56** — confused icon not neutral + six board feelings mutually distinct.
  Guards BOTH the emoji (`emojiFor`) AND the actual rendered vocab-pack codepoint
  (closes the gate hole: pack PNG wins over emoji). Rubric: readable tier.
- **S57** — warm-up contains no taught feeling word (question + rendered text + sample). Honesty tier.
- **S58** — draggable match pieces stay label- and number-free (protects the tiebreak). Honesty tier.

### Producer bug found + fixed (not product)
`fetch-vocab-icons.mjs` deleted `planet/quiet/shelf/space/story` PNGs every run
(present in index.json + vocabIcons SAFE_EMOJI but missing from its WORDS map).
Added those 5 to WORDS so pack rebuilds are self-consistent and can't nuke them.

## Round 3 (selfloopx2 — round 1) — 2026-08-08

Judges on rendered JPGs. **A (teacher/CELTA):** 6 findings (1 HIGH, 2 MED, 3 LOW).
**B (student/12yo):** 10 findings (3 HIGH, 3 MED, 4 LOW). **Merged → 9** after dedupe.

| # | Sev | Finding (judges) | Producer fix | Gate |
|---|-----|------------------|--------------|------|
| 1 | HIGH (A+B) | Feelings Lab dock = 3D `feeling-*` prop faces, different art from New Words flat Twemoji; mapping doesn't transfer + one reads "angry" + floating "?" | `roleplayDockProps` feelings → repoint dock at vocab-pack PNG (`VocabIcons.pathForSync`) + `meta.word`; both drag surfaces now share one vetted, mutually-distinct face set | **S59** |
| 2 | HIGH→MED (B+A) | New Words dock far-right + dead centre gap; shy≈happy (both smiles) | shy pack gate-hole: `shy.png`=😊 beat emoji override (pack wins, like S56/confused) → `fetch-vocab-icons` shy 😊→😳 (1f633) + re-render | **S52 pack** |
| 3 | MED (A) | 2nd conditional never modeled receptively (reading all past simple) | `makeFrames` green worked **Model** chip "If I felt worried, I would take a deep breath." + "fill the blanks" plural | **S60** |
| 4 | MED (B) | Comprehension Q3 write box clipped off board bottom | `makeComprehension` tighter grid (gap 12 / write 60 / q 28px) + overflow guard | **S61** |
| 5 | MED (B) | Story body medium-gray, washes out projected | `makeStoryPage` body ink → #0f172a weight 700 (`data-story-body`) | **S62** |
| 6 | HIGH (B) | Activity page lopsided / empty right third | Dock art+size fixed (S59); overall balance **deferred to round 2** | wishlist |
| 7 | MED (B) | Warm-up sparse; wanted example feelings | **TIEBREAK pedagogy>aesthetics:** reject — would break S57 target-neutral | wishlist (wont) |
| 8 | LOW (A) | Story2 caption leads "surprised" but art shows happy | StoryArt generative drift — uncheckable in producer | wishlist |
| 9 | LOW (A/B) | Title right-half dead space | cosmetic; carried open | wishlist |

**Conflict tiebreak recorded:** B wanted feeling faces on the warm-up (fill dead space);
A's S57 target-neutral honesty wins → warm-up stays neutral (no taught feelings).

### New gates (continue S-series)
- **S59** — Feelings Lab dock renders the same 07_vocab-pack art as New Words (word set + asset source; no 09_props feeling face). Honesty/navigable.
- **S60** — a completed second-conditional model is on the frames board (If…would, no blank). Honesty.
- **S61** — comprehension write-in cards sit fully on-board (no clip). Navigable.
- **S62** — story body ink is near-black. Readable.
- **S52 (pack)** — shy.png codepoint not a smile-family Twemoji (closes the pack-wins-over-emoji hole, mirrors S56).

### Producer note
`VocabIcons.pathForSync` added (sync pack path from cached index) so the synchronous
board planner can share New Words' art on the activity dock.

## Round 4 (selfloopx2 — round 2) — 2026-08-08

Judges on the round-1-fixed JPGs. **A (teacher/CELTA):** 5 findings (0 HIGH, 2 MED,
3 LOW) — verdict "ClassIn-ready, nothing blocks teaching cold". **B (student/12yo):**
top item was (again) the New Words dock layout + activity balance. **Merged → 10**,
tiebreak = student-blocking layout + pedagogy honesty first.

| # | Sev | Finding (judges) | Producer fix | Gate |
|---|-----|------------------|--------------|------|
| 1 | HIGH (B) | New Words faces stranded mid-right + dead gap from cards, too small | **Root:** `placeDockRow` centres a 96px 2×3 block in a 450-wide dock at x780. Rebuilt: `ZONE_TEMPLATES.vocab.dock`→ wide 3×2 bin `x724 w412` hugging cards; `matchDockSize` prefers wide grid + cap 96→128; `makeVocab` paints a framed **"Picture bin"** tray. Faces now 128px, edge-to-edge (x724→1136), tray present | **S65** |
| 2 | MED (A) | Frames **Model** "If I felt worried…" duplicated Frame 1's given → copy-the-model | `makeFrames` picks a model feeling NOT given in any frame (worried/shy excluded → "scared") | **S60** (ext) |
| 3 | MED (A) | Frame 3 reversed "I would feel ___ if someone ___" → unmodeled past-form trap | fixture frame 3 → taught If-first order "If someone ____, I would feel ____." | **S67** |
| 4 | MED (B) | Activity lopsided — head centred, right third dead | `heroProp` feelings king centred in RIGHT region past a 520px left gutter (x=786) | **S64** |
| 5 | MED (B) | Frame 3 flush on the board bottom, looks cut off | `makeFrames` body bottom gutter (marginBottom 14 → 42px measured) | **S66** |
| 6 | MED (B) | Warm-up = one question + big empty box | `makeWarmUp` target-neutral starter chip "Try: I feel ___ because ___." (no taught feeling → S57 safe) | **S68** |
| 7 | LOW (A) | Comp "why…surprised at the end" is retrieval, not inference | fixture Q4 → "Why do you think Mia's partner smiled and helped her?" | **S70** |
| 8 | LOW (A) | Activity Round 2 says "partner guesses" but face is visible | king hint reworded → "partner reads the face, names the feeling…" + split to 2 lines | **S69** |
| 9 | LOW (A) | Title aim "talk and read about today's topic" hides topic | fixture `topic:"feelings"`; `makeTitle` aim → "about feelings" | **S63** |
| 10 | LOW (B) | Title right-half empty / face order p2≠p10 | cosmetic → wishlist | — |

**Conflict tiebreak recorded:** B again wanted feeling faces on warm-up/title to fill
dead space; A's target-neutral honesty (S57) wins for warm-up — used a blank
sentence-starter instead (scaffolds, leaks nothing).

### New gates (continue S-series)
- **S63** — title Aims name the declared `lesson.topic` (never "today's topic"). Honesty.
- **S64** — Feelings Lab hero balanced into the right region (kingHeroX ≥480). Navigable.
- **S65** — New Words match dock is a framed picture bin: hugs cards (minX≤dockX+24),
  fills width (maxX2≥dockRight−24), faces ≥110px, wide grid (cols≥3). Navigable.
- **S66** — frames stack keeps a ≥20px bottom gutter (Frame 3 not flush). Navigable.
- **S67** — no reversed result-first conditional frame (past-form trap). Honesty.
- **S68** — warm-up carries a target-neutral starter scaffold (no taught vocab). Charm.
- **S69** — activity Round 2 says "reads the face", never "partner guesses". Honesty.
- **S70** — surfaced inferential comp Q is not stated-fact retrieval ("surprised at the end"). Honesty.
- **S60 (ext)** — Model feeling must not equal any frame's given feeling (copy-the-model guard).

## Last run

- **When:** 2026-08-08 (selfloopx2 — round 2, final)
- **Local:** verify ok (fails=[]; soft=[]). New round-2 signals: aimHidesTopic=false /
  aimNamesTopic=true; kingHeroX=786; matchBin minX724 maxX2 1136 minSide 128 cols 3
  tray=true; framesGutter=42; warmStarter="Try: I feel ___ because ___."; readsFace=true;
  compBoardStaleInfer=false; Model="scared" (not a frame given); StoryArt 3/3; chips=11.
- **Confirmed on JPGs:** New Words = framed "Picture bin", 128px 3×2 faces hugging
  cards (no dead gap); activity head balanced right + 2-line rounds; frames Model
  "scared" + Frame 3 If-first with a bottom gutter; warm-up neutral starter chip.
- **Deferred (uncheckable/cosmetic → wishlist):** feeling-*.png per-emotion visual cues
  (needs prop regen); title right-half empty + p2/p10 face-order parity; story2 caption
  vs generative art drift.
- **Total across selfloopx2:** round1 5 fixes / 5 gates, round2 9 fixes / 9 gates.
