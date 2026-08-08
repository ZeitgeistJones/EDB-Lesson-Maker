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

## Last run

- **When:** 2026-08-08 (selfloop round 2, final)
- **Local:** verify ok (fails=[]; soft=[]; feelingDockCount=6; confusedGlyph=🤔;
  warmTargetLeaks=[]; matchPieceLabels=[]; frame LH 1.4; StoryArt 3/3; chips=11)
- **Confirmed on JPGs:** confused = 🤔 thinking/head-scratch, distinct from all 5
  others; warm-up target-neutral; drag pieces label/number-free; frames word bank;
  instruction card larger + clears hero.
- **Deferred (uncheckable/cosmetic → wishlist):** feeling-*.png visual cues for
  worried/scared/confused (needs prop regen); activity blank hero still largest
  (drop target by design) + right-side dead space.
