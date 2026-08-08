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
