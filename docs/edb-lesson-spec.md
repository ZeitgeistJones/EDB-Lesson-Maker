# ClassIn EDB lesson spec

One continuous board = the interactive twin of the PDF lesson.
Same `lesson` JSON. Locked page backgrounds + optional draggable pieces on pages that need them.

**Constraint:** `.edb` only supports **images + text**, each **locked** or **draggable**. There is no scripting or win-state. Mechanics are staged with layers:

- **Locked** = scenery, targets, answer keys, rewards
- **Unlocked** = pieces students drag (icons, covers, tiles, clothes)

## Board geometry

- Screen size: **1280 × 590**
- Page `i` sits at `y = i * 590`
- Backgrounds: locked images full-width
- Pieces: unlocked images/text on that page’s y-band

## Page spine (PDF parity)

| Index | Page | Typical interactions |
|------:|------|----------------------|
| 0 | Title | none |
| 1 | Warm-Up | none |
| 2 | New Words | `matchDock` or `hideSeek` |
| 3 | Words in Sentences | none |
| 4 | Sentence Frames | none |
| 5–6 | Story (2 pages) | `buildScene` or `hideSeek` on one page |
| 7 | Reading Comprehension | none |
| 8 | Your Ideas (creative) | none |
| 9… | Let's Talk (1 per question) | `coverAnswer` on 1–2 questions |
| N | Activity | `dressUp`, `buildScene`, or `sortBins` |
| N+1 | Great Job / Wrap | `orderLine` + optional `revealReward` |

Planner assigns **≤5 unique interactive pageKeys** per lesson. Recipe choice rotates by topic hash.

## Planner guards (empty content)

Never label a page “Interactive” with zero pieces:

| Missing input | Skipped recipes |
|---------------|-----------------|
| Empty `vocabulary` | `matchDock`, `hideSeek`, `buildScene`, `dressUp`, `sortBins` (newWords / story1 / activity) |
| Empty / unusable `reviewSentences[0]` | `orderLine`, `revealReward` on wrap |
| Zero speaking questions | `coverAnswer` |
| Vocab length &lt; 3 | Prefer `matchDock` over `hideSeek` on New Words |

After filtering, drop extras in order: `revealReward` → `speaking:1` → `story1` → … until ≤5 unique pageKeys.

## Zones (`EdbLayout`)

Each page type declares named rectangles:

| Zone | Role |
|------|------|
| `header` | Title band — **noOverlap** |
| `bodyText` | Primary content cards — **noOverlap** |
| `artSafe` | Characters / scenery |
| `dock` | Piece tray for unlocked items |
| `targetBay` | Locked targets / pads / sample-answer band |
| `rewardPocket` | Locked prize under a flap (not answer keys) |
| `answerStrip` | Wrap teacher answer key (separate from reward) |

On **vocab** pages, `targetBay` is the right art column — covers never sit on word cards.

`renderLessonPages` reserves bottom padding via `dockReservePx(pageType)` so html2canvas backgrounds don’t paint over docks. Optional `?edbDebug=1` draws zone outlines.

## Overlap policy

**Awkward (forbidden):**

- Unlocked piece center inside `header` / `bodyText` (except intentional `coverAnswer` sticky over `targetBay`)
- Two unlocked pieces with IoU &gt; 0.4
- Character covering primary question text
- Wrap character baked into the dock when `orderLine` is active (character skipped)

**OK intentional** (recipe flags):

- `cover` ⊃ target — hide-and-seek
- `flap` ⊃ reward — reveal reward (rewardPocket only)
- clothing ⊃ body — dress-up (pieces start in dock)
- `answerCover` sticky ⊃ sample band (`targetBay` on speaking pages)

Margin ~24px from edges; min gap ~14px between unlocked pieces unless stacking is intentional. Dock rows shrink-to-fit inside the dock rectangle.

## Activity recipes (`EdbActivities`)

| ID | Feel | EDB mapping |
|----|------|-------------|
| `matchDock` | Match icons to words | Locked word row + unlocked icons in dock |
| `orderLine` | Sequence | Locked numbered pads + shuffled word tiles; answer on `answerStrip` |
| `hideSeek` | Hide and seek | Locked targets + unlocked covers in `targetBay` / art column |
| `revealReward` | Locked rewards | Locked star under unlocked flap in `rewardPocket` |
| `buildScene` | Build something | Locked dashed slots + unlocked parts in dock |
| `dressUp` | Dress the character | Locked body + unlocked outfit/prop tiles |
| `coverAnswer` | Oral first | Sample answer painted under sticky at shared `speakingCoverRect` |
| `sortBins` | Categorize | Locked bin labels + unlocked cards |

Asset role stubs in [`themes.json`](../public/assets/manifests/themes.json): `covers`, `flaps`, `parts` (programmatic canvas tiles OK until more art exists).

## Asset / piece PNG fallback

`pieceToPng` order: **asset** → emoji glyph → word tile → solid canvas placeholder. Prizes and dock parts must not silently vanish if an SVG path 404s.

## Pipeline API

```js
const boardPlan = EdbActivities.buildBoardPlan(lesson, meta);
// { pages: [{ pageIndex, pageKey, locked[], unlocked[], notes[] }], assignments, slots }

const { pageEls, slots, host } = LessonPages.render(lesson, meta, boardPlan);
// Optional: LessonPages.applyStoryArt(pageEls, await StoryArt.generate(lesson, meta))
// when STORY_ART=1 — see docs/story-art.md
const blob = await EdbKit.buildLessonEdb(lesson, meta, pageEls, boardPlan);
```

`buildLessonEdb` throws if `boardPlan.pages.length !== pageEls.length`. Legacy `slots: { newWords, wrap }` still works if no full plan is passed.

## Non-goals

- No Gemini schema change for v1 (local heuristics)
- No binary format changes
- No auto-check “correctness” in ClassIn (teacher coaches)
- No bundler

## Assets

See [`public/assets/LICENSE.md`](../public/assets/LICENSE.md) and [`public/assets/manifests/themes.json`](../public/assets/manifests/themes.json).
