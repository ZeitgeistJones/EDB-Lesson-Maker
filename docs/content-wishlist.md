# Content wishlist (lesson English / pedagogy)

Gaps in **lesson content** — not art. For us (agent + you) when something teaches weird, mismatches CEFR, or the story/questions don’t line up. No teacher-complaint channel; we log what we notice during generates, fixtures, or quality reviews.

**Sister list:** art gaps → [`asset-wishlist.md`](asset-wishlist.md)

**Rules**
- Fix the **producer** when it’s a pattern (prompt, schema, `PhonicsPolicy`, CEFR counts) — then regen
- One-off flukes still get a row so we remember
- Do **not** invent a special-case for one lesson title as the only fix
- `Status`: `open` → `prompt-fixed` / `schema-fixed` → `verified` (or `wont`)

| Date | Issue | Why (topic / level / page) | Likely producer | Status |
|------|-------|----------------------------|-----------------|--------|
| 2026-08-07 | Title charm stacks a musician cutout on a terrace scene that already has a piano — awkward double-instrument title | Classical compose / Manus reviews | `titleCharmSrc` skips charm for music/classical packs | prompt-fixed |
| 2026-08-07 | Story PropBank fallback: caption bled through alpha prop (absolute img) + desk caption → orchestra-stands | classical-compose story0 | `fillStoryArtSlot` relative plate + chip; desk-scene prefer in `storyFallbackVisual`; S24 soft gate | prompt-fixed |
| 2026-08-07 | Reading comprehension page empty despite fixture having questions | Fixture used root `comprehension[]`; renderer only read `story.comprehensionQuestions` — Manus fail/revise | `normalizeLesson` + S19 | schema-fixed |
| 2026-08-07 | Warm-up shows teacher sampleAnswer to students | Honesty / answer leak — Manus | Warm page no longer renders sample; keep JSON for teachers | schema-fixed |
| 2026-08-07 | King activity hint says “Drag toys…” with no language production | Manus ClassIn fit | Theme-aware king hints + speak/write cue; S21 | schema-fixed |
| 2026-08-07 | B1 frames use bare second conditional without scaffold | Manus language_accuracy | Generate-lesson CEFR frame rules | prompt-fixed |
| 2026-08-07 | No visible aims / weak wrap-up exit ticket | Manus EDB alignment | Title aims line + wrap “Today we used” / exit ticket; S22/S23 | schema-fixed |
| 2026-08-07 | Manus thought story beat 3 missing | Review `pickImages` soft-max 10 dropped story2 after preferred roles | `pickImages` mandates all storyN; S27 + verify | schema-fixed |
| 2026-08-07 | inspire dock icon = ambiguous starburst glyph | Vocab match clarity / Manus B2 | PACK_OVERRIDES inspire→brain; S26 clear icons | schema-fixed |
| 2026-08-07 | Title aims truncated before inspire; no grammar aim; identity Frame 2; guitar in classical story | classical-compose Manus soft | Aims≤8 + grammar line; fixture frames/story piano; timing chips | schema-fixed |
| 2026-08-07 | Vocab match drop-zone affordances soft (word cards only; no numbered pads) | classical-compose Manus ClassIn fit | matchDock numbered pads + DOM data-match-pad; S28 | schema-fixed |
| 2026-08-07 | matchPad with meta.word rendered tiny vocab icons on cards (answer-ish leak) | pieceToPng wordArt before data-URL asset | Prefer data:/pad roles in pieceToPng; matchPad meta.targetWord | schema-fixed |

| 2026-08-07 | Title aims listed words not taught on New Words (tempo in aims/creative, board slice 0–6) | Manus skill v2 / USYe report EDB | Aims = board vocab; fixture orders tempo into top 6; S30 | schema-fixed |
| 2026-08-07 | Grammar aim claimed first-conditional while Frame 2 used would / opinion frames | Manus honesty | `grammarAimLine()`; S31 | schema-fixed |
| 2026-08-07 | Wrap slide warm lavender broke navy deck register | Manus PPT-like | THEME_COLORS.wrap navy/slate; S32 | schema-fixed |
| 2026-08-07 | Match caption chips named the answer (label→label, no inference) | Manus skill v2 ClassIn delivery | Drop student caption chips; keep clear pack icons + pads; S26 | schema-fixed |
| 2026-08-07 | Mid-deck flat washes fanned across 3–4 panels (Manus ≤2 registers) | classical-compose palette / PPT-like | pickFlat midPool + generic band capped at 2; S34 | schema-fixed |
| 2026-08-07 | Story prop card alternated L/R across beats | Manus PPT-like consistency | makeStoryPage always left side; S33 | schema-fixed |
| 2026-08-07 | Activity king title purple / soft gray hint on busy scene | Instruction contrast | ink-tagged heading+hint; slate defaults; S35 | schema-fixed |
| 2026-08-07 | Wrap exit lacked peer-feedback beat | Manus nice-to-have engagement | Peer check line on wrap; S36 | schema-fixed |
| 2026-08-07 | Match dock still baked answer-naming caption chips (label→label) despite S26 claim | Manus LgtX B1 / gate_hole | Drop matchPiece.label; pieceToPng never captions matchPiece; verify on piece.label | schema-fixed |
| 2026-08-07 | King/activity header missing timing chip | Manus LgtX B2 | King row timing chip; actTimingChip gate; S29 | schema-fixed |
| 2026-08-07 | Exit ticket recycled only 3 of 6 board words | Manus LgtX B3 | Wrap Also say: for missing vocab; S37 | schema-fixed |
| 2026-08-07 | Orchestra story beat used bare stands not musicians | Manus RWiY gate_hole / FAIL just_fixed | Prefer musician-* before stands; skip furniture first pass; S38 | schema-fixed |
| 2026-08-07 | skipKing music activity asked write/say with no write strip | Manus RWiY B2 | Frosted My symphony idea write lines on skipKing heroProp; S39 | schema-fixed |
| 2026-08-07 | Wrap peer-check in DOM but clipped under overflowing cards | Manus RWiY FAIL S36 | Peer chip above review cards + on-board gate | schema-fixed |
| 2026-08-07 | Manus re-asked match caption chips after S26 kill | Manus RWiY B1 | Reject — answer leak; keep pads+clear icons; passoff knownIssues | wont-fix |
| 2026-08-07 | ZPD (pass/99): abstract vocab stress test + two-round production format | Manus 3Jr6 Level-Up | Next loop fuel — not this bake | open |
| 2026-08-07 | Music dock musicians ~10–15% larger (soft next_action on pass) | Manus 3Jr6 | Spare-room +12% boost in edbActivities (no DOCK_MIN bump) + slightly larger match pads | closed |
| 2026-08-07 | Grammar aim said “hypothetical” not “second conditional” | Manus bNsAK soft Blocking | `grammarAimLine` labels second conditional; S31 gate | schema-fixed |
| 2026-08-07 | King instruction low contrast on terrace; story caption terracotta | Manus bNsAK Medium | Frosted king hint card + charcoal caption chips; S40 | schema-fixed |
| 2026-08-07 | ZPD (pass/100): two-round peer eval + composer’s-choice instrument constraint | Manus bNsAK Level-Up | Log only — do not invent new lesson this pass | open |
| 2026-08-07 | Abstract vocab stress test: new topic away from arts-music | Manus ZPD / shift30 | `feelings-compass` fixture + verify; feelings dock on face-blank; TOPIC_SETS board-face | schema-fixed |
| 2026-08-07 | Feelings king dock padded with face eyes/nose after curated feeling-* list | Producer generalization | Stop feelings dock pad with non-feeling kit/tag resolve | schema-fixed |
| 2026-08-07 | Story caption “check a worksheet” → green checkmark badge | Manus Ssdp B2 feelings-compass | storyFallbackVisual feelings prefer + stop “check”; fixture caption | schema-fixed |
| 2026-08-07 | Manus OCR misread frame commas as periods (B1) | Manus Ssdp | False positive — frames already comma; keep verify soft note | wont-fix |
| 2026-08-07 | Manus wants mint wrap; navy wrap is S32 bookend | Manus Ssdp B3 vs classical S32 | Keep navy wrap; passoff knownIssues | wont-fix |
| 2026-08-07 | ZPD: two-round Feelings Lab + abstract emotion vocab + caption names feeling | Manus Ssdp ZPD / JkBr5 blocked | feelingsKing Round1/2 hint; generate-lesson feelings block; S41 | schema-fixed |
| 2026-08-07 | Manus task user_stop before structured_output (false structured_success) | Manusloop JkBr5… | review.mjs require value; client retry pulls after stop | schema-fixed |
| 2026-08-07 | “Round 1/2” activity prompt → token round → castle-*-round stole face-blank hero | feelings-compass verify after S41 | KIT_STOP round+pedagogy; curated face/dental before assessKit (S43) | schema-fixed |
| 2026-08-07 | Feelings Lab “write or say” with no write strip; captions not leading with feeling word | Manus kS8Er fail/90 B1/B2 | feelingsKing prodWrite strip; caption `feeling — scene`; S44 | schema-fixed |
| 2026-08-07 | Manus re-asks mint wrap vs navy bookend | Manus kS8Er B3 | Reject — S32; keep knownIssues | wont-fix |
| 2026-08-07 | ZPD after pass/99: inferential comprehension + Round 2 second conditional | Manus LSSgv | hint If I felt…would; fixture inferential Q; generate-lesson; S45 | schema-fixed |
| 2026-08-07 | Wrap page missing timing chip on ≥45 min boards | Manus 3Uc8 Soft High | makeWrap header ~3 min; S46 verify | schema-fixed |
| 2026-08-08 | Story panels stay PropBank-only; generative StoryArt not in verify bake | feelings/classical soft ceiling | disk cache + illustrate-fixture + verify `--story-art`; S47 soft; caption paint-able prompt | prompt-fixed |
| 2026-08-08 | Title Aims talk-only on story boards (no receptive reading) | Manus feelings leftover | Aims: talk and read when story.pages; S48 soft | schema-fixed |
| 2026-08-07 | Manus OCR letter-sub on frames (mv/shv) | Manus 3Uc8 | False positive like Ssdp B1 — keep string frames; soft only | wont-fix |
| 2026-08-08 | REVERSAL: frame mv/shv + comma→period was NOT OCR — real vertical clip (line-height 1.25 + overflow:hidden max-height cut y/g/p tails, comma tails, and the "____" blank) confirmed on baked JPG (teacher+student judges) | feelings-compass page-4-frames | makeFrames line-height 1.4 + padding-bottom + overflow visible + flex-shrink:0; S50/S51 verify (line-height ratio + no vertical clip + leading-If comma) | verified |
| 2026-08-08 | shy match-dock glyph 😊 same smile as happy 😄 — students can't tell pads apart | feelings New Words | vocabIcons EMOJI_OVERRIDES shy→😳 + fixture emoji; S52 (shy≠happy glyph) | verified |
| 2026-08-08 | Floating unlabeled googly-eyes prop bottom-right on newWords/activity (board-face corner eye eggs on emotion board) | feelings newWords/activity | TOPIC_SETS feelings→board-house (egg-free); S53 forbids board-face flat leak | verified |
| 2026-08-08 | Feelings drag faces postage-stamp (64px) at bottom while blank hero face dominated as empty blob | feelings activity heroStage | heroProp feelingsStage: king scale 0.92→0.72 + grow dock faces to fill row (now ~135px); S54 min dock side ≥96 | verified |
| 2026-08-08 | Title aims/grammar panel dark-on-dark (data-ink="hint" repainted slate on the dark frosted slab) | feelings title | Drop data-ink on aims/grammar; light ink on darkened slab (0.82); S55 | verified |
| 2026-08-08 | "confused" 😕 still reads as neutral, not clearly puzzled (judges noted alongside shy) | feelings New Words | vocabIcons EMOJI_OVERRIDES confused→🤔 + fixture emoji; S56 (confused not neutral + six glyphs mutually distinct) | verified |
| 2026-08-08 | Activity heroStage still leaves right-side/upper dead space; blank drop-face is the largest element by design (drop target) | feelings activity | Soft: king shrunk + faces enlarged; instruction card widened (S6 round-2); fuller stage composition (balance right / raise dock band) stays uncheckable polish for a later loop | open |
| 2026-08-08 | Warm-up pre-cued a target word ("surprised") before New Words taught it — undercuts eliciting prior knowledge | feelings page-1-warm | generate-lesson warmUp target-neutral rule + fixture "How are you feeling right now, and why?"; S57 (warm-up no target vocab) | verified |
| 2026-08-08 | Frame 3 "I would feel ___ if someone ___." has two open blanks, no scaffold | feelings page-4-frames | makeFrames renders a Word bank chip row of the six taught feelings (data-frame-word-bank) — restates the New Words choice set, no per-frame mapping | verified |
| 2026-08-08 | Activity instruction card cramped (3 lines small text in a narrow panel while board had empty space) | feelings page-10-activity | kingHint card widened 420→640px + font 22→24px / line-height 1.4 | verified |
| 2026-08-08 | Activity six feeling faces (feeling-*.png) hard to tell apart (worried/scared/confused similar); wants distinguishing VISUAL cues (tears=scared, sweat=worried) not word labels | feelings page-10-activity | UNCHECKABLE in producer without regenerating the feeling-* prop art with per-emotion cue marks (tears/sweat/brow). Do NOT add answer-giving labels (S58). Next-loop: regen feeling-* cutouts via prop-cutouts skill with distinct cue marks | open |
| 2026-08-08 | Student judge asked to number/label the draggable feeling emoji to pre-map them to the numbered pads | feelings New Words | REJECT — would reveal the match and violate S26/S58 no-answer-naming. Pedagogy: solve guessing via unambiguous, mutually-distinct icons (S56), keep drag pieces label/number-free; numbered PADS (targets) stay clear | wont-fix |
| 2026-08-08 | No lesson/topic coverage for **health** (doctor, dentist, first-aid, sick/hurt) or **community** (helpers + places: post office, market, bus stop) — no fixtures and no keyed prop pack | shift10 gptbrief/assetswarm coverage scan | Candidate white-key prop pack + lesson topic. EDGE-RISK: medical accuracy + cultural sensitivity — prompts need careful review, not a blind swarm. **Art home = `asset-wishlist.md`** (mirror there next pass); logged here as a topic-coverage gap. | open |
| 2026-08-08 | Guidance: **emotions / nature / prepositions are NOT prop-pack candidates** — do not send to a white-key swarm | shift10 topic-routing note | emotions = faces already tracked (feeling-* regen row above, cue-clarity); nature + prepositions are abstract/relational, don't key as single objects on black. Route these as vocab icons / backgrounds / activity design, never as prop cutouts. | open |
| 2026-08-08 | Feelings Lab drag dock rendered 3D `feeling-*` prop faces — a DIFFERENT face vocabulary from the flat Twemoji taught on New Words; picture→word mapping didn't transfer, one prop read as untaught "angry", one carried a floating "?" | selfloop r1 (teacher+student HIGH) feelings page-10-activity | edbActivities roleplayDockProps repoints feelings dock at the vocab-pack PNG (VocabIcons.pathForSync) + meta.word so pieceToPng→wordArtPng renders the same set; S59 gate (dock art = 07_vocab-pack, no 09_props feeling face) | verified |
| 2026-08-08 | REVERSAL of S52 emoji-only fix: shy still read as happy's smile — the New Words dock renders the vocab-pack PNG (wordArtPng), so shy.png=😊 (1f60a) beat the emojiFor override (same gate hole S56 closed for confused) | selfloop r1 feelings New Words | fetch-vocab-icons shy 😊→😳 (1f633) + re-render shy.png; S52 extended with a pack-codepoint smile-family guard | verified |
| 2026-08-08 | Second-conditional grammar aim never modeled in the input — reading is all past simple, students meet "If I felt X, I would ___" cold only in production | selfloop r1 (teacher CELTA) feelings page-4-frames | makeFrames renders a green worked Model chip ("If I felt worried, I would take a deep breath.") + "fill the blanks" plural; S60 gate (completed If…would model, no blank) | verified |
| 2026-08-08 | Comprehension Q3 write-in box clipped off the bottom edge (3 cards × 100px write floors + 16px gaps overflowed the board) | selfloop r1 (student) feelings page-8-comprehension | makeComprehension tighter grid (gap 12, write min 60, q 28px) + overflow guard; S61 gate (write cards on-board) | verified |
| 2026-08-08 | Story body copy read as medium-gray, washed out projected | selfloop r1 (student) feelings story beats | makeStoryPage body ink #1e293b→#0f172a weight 700, data-story-body; S62 gate (near-black) | verified |
| 2026-08-08 | Activity heroStage still lopsided — instruction+answer crammed top-left, big empty right third, dock as a bottom band (dock art + size now fixed via S59, but overall balance not yet) | selfloop r1 (student) feelings page-10-activity | heroProp feelingsStage centres the blank head in the RIGHT region past a 520px left gutter (kingHeroX≥480) so instructions-left / hero-right-centre / dock-bottom balances; S64 | verified |
| 2026-08-08 | New Words faces stranded mid-right with a dead gap from the word cards + too small (placeDockRow centred a 96px 2×3 block in a 450-wide x780 dock) | selfloopx2 r2 (student HIGH) feelings page-2-newWords | ZONE_TEMPLATES.vocab.dock→ wide 3×2 bin x724 w412 hugging cards; matchDockSize wide-grid + cap 96→128; makeVocab paints framed "Picture bin" tray; S65 (hug + fill + ≥110px + cols≥3 + tray) | verified |
| 2026-08-08 | Frames worked Model "If I felt worried…" duplicated Frame 1's given word → first practice frame was copy-the-model, not production | selfloopx2 r2 (teacher/CELTA) feelings page-4-frames | makeFrames picks a model feeling NOT given in any frame (worried/shy excluded → "scared"); S60 extended (model≠any frame given) | verified |
| 2026-08-08 | Frame 3 reversed "I would feel ___ if someone ___" silently required an unmodeled past-form verb → invites present-tense B1 error | selfloopx2 r2 (teacher/CELTA) feelings page-4-frames | fixture frame 3 → taught If-first order "If someone ____, I would feel ____."; S67 (no reversed result-first frame) | verified |
| 2026-08-08 | Frame 3 write-line flush on the board bottom, read as cut off (round-1 Model row pushed the stack down) | selfloopx2 r2 (student) feelings page-4-frames | makeFrames body bottom gutter (marginBottom 14 → 42px measured); S66 (≥20px gutter) | verified |
| 2026-08-08 | Warm-up sparse — one question over a large empty write box, boring | selfloopx2 r2 (student) feelings page-1-warm | makeWarmUp target-neutral starter chip "Try: I feel ___ because ___." (no taught feeling → S57 safe); S68 (neutral starter present, no leak) | verified |
| 2026-08-08 | Comprehension "Why do you think Mia felt surprised at the end?" is answered verbatim in the story → retrieval disguised as inference | selfloopx2 r2 (teacher/CELTA) feelings page-8-comprehension | fixture Q4 → "Why do you think Mia's partner smiled and helped her?" (genuinely inferential); S70 (no stated-fact "surprised at the end") | verified |
| 2026-08-08 | Activity Round 2 said "partner guesses" but the chosen face is dragged on in full view — nothing hidden to guess | selfloopx2 r2 (teacher/CELTA) feelings page-10-activity | king hint reworded → "your partner reads the face, names the feeling, then answers with If I felt ___, I would ___" + split to two skimmable lines; S69 | verified |
| 2026-08-08 | Title aim "talk and read about today's topic" hides what the lesson is about | selfloopx2 r2 (teacher/CELTA) feelings page-0-title | fixture topic:"feelings"; makeTitle aim clause names lesson.topic ("about feelings"); S63 | verified |
| 2026-08-08 | Title right-half empty; New Words grid (p2) vs activity single-row (p10) present the six faces in different visual arrangement | selfloopx2 r2 (student LOW) feelings title/newWords/activity | Cosmetic — both drag surfaces already share the same underlying order + art (S59); grid-vs-row is inherent to page type. Optional next-loop: small face motif on title / align arrangements | open |
| 2026-08-08 | Warm-up feels sparse (one question + large empty box) — student wanted example feelings added | selfloop r1 feelings page-1-warm | TIEBREAK (pedagogy>aesthetics): do NOT add taught feeling faces/words — that violates S57 target-neutral warm-up. Fill vertically with neutral scaffold only if needed; keep eliciting prior knowledge | wont-fix |
| 2026-08-08 | Story beat 3 caption leads "surprised" but the generated illustration shows Mia leaving happy | selfloop r1 (teacher) feelings page-7-story2 | StoryArt is generative from caption+text — image/caption feeling-lead can drift. Uncheckable in producer without regen; consider caption lead alignment or story-art prompt emphasis next loop | open |

<!-- Classical compose note (2026-08-07): Activity dock + skipKing piano-on-piano fixed (f21ca03). Manus dual reviews LbVd…/oEDh… folded into producer 2026-08-07. Story glyphs still open. Manusloop J4up… revise/72 folded: pickImages + inspire override + aims/frames/story. Second live pass USYe… pass/98 — numbered pads + pieceToPng pad fix. Shift20: Manus skill delta → schema scorecard/ZPD + S30–S32 producer. Shift21: live Manus LgtX… revise/84 → S26 caption bake kill + S29 king timing + S33–S37. Shift22 assetgap+manus x2: inspire.png + RWiY → S38/S39. -->

## How to add a row

When you see bad English/teaching and can’t (or shouldn’t) auto-fix it in this turn:

1. Append one row above (dedupe first).
2. If it’s a repeating pattern, also note the `root` in the quality verdict / chat so the next pass can change the prompt or gate.
3. After a producer fix, mark `prompt-fixed` / `schema-fixed`, then `verified` once a regen looks right.

## Common issue types (examples)

- Story text vs comprehension / creative questions don’t match
- Vocab or story language too hard/easy for the chosen CEFR level
- Phonics word irregular or wrong for the level (also enforced by `PhonicsPolicy` — log if Gemini keeps fighting the gate)
- Sentence frames / activity templates without a usable `___` blank
- Speaking samples that don’t fit the topic
- Duplicate or near-duplicate vocab that makes matching pointless
