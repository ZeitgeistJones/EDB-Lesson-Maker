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

Planner assigns **~3–5** activities per lesson (not every page). Recipe choice rotates by topic hash.

## Zones (`EdbLayout`)

Each page type declares named rectangles:

| Zone | Role |
|------|------|
| `header` | Title band — **noOverlap** |
| `bodyText` | Primary content cards — **noOverlap** |
| `artSafe` | Characters / scenery |
| `dock` | Piece tray for unlocked items |
| `targetBay` | Locked targets / pads |
| `rewardPocket` | Locked prize under a flap |

`renderLessonPages` reserves bottom padding (`reserveDock`) on interactive pages so html2canvas backgrounds don’t paint over docks. Optional `?edbDebug=1` draws zone outlines.

## Overlap policy

**Awkward (forbidden):**

- Unlocked piece center inside `header` / `bodyText`
- Two unlocked pieces with IoU &gt; 0.4
- Character covering primary question text

**OK intentional** (recipe flags):

- `cover` ⊃ target — hide-and-seek
- `flap` ⊃ reward — reveal reward
- clothing ⊃ body — dress-up (pieces start in dock; ghost targets on locked bg)

Margin ~24px from edges; min gap ~14px between unlocked pieces unless stacking is intentional.

## Activity recipes (`EdbActivities`)

| ID | Feel | EDB mapping |
|----|------|-------------|
| `matchDock` | Match icons to words | Locked word row + unlocked icons in dock |
| `orderLine` | Sequence | Locked numbered pads + shuffled word tiles |
| `hideSeek` | Hide and seek | Locked targets + unlocked covers overlapping them |
| `revealReward` | Locked rewards | Locked star under unlocked flap |
| `buildScene` | Build something | Locked dashed slots + unlocked parts in dock |
| `dressUp` | Dress the character | Locked body + unlocked outfit/prop tiles |
| `coverAnswer` | Oral first | Sample answer under unlocked sticky |
| `sortBins` | Categorize | Locked bin labels + unlocked cards |

Asset role stubs in [`themes.json`](../public/assets/manifests/themes.json): `covers`, `flaps`, `parts` (programmatic canvas tiles OK until more art exists).

## Pipeline API

```js
const boardPlan = EdbActivities.buildBoardPlan(lesson, meta);
// { pages: [{ pageIndex, pageKey, locked[], unlocked[], notes[] }], assignments, slots }

const { pageEls, slots, host } = LessonPages.render(lesson, meta, boardPlan);
const blob = await EdbKit.buildLessonEdb(lesson, meta, pageEls, boardPlan);
```

`buildLessonEdb` places `plan.locked` / `plan.unlocked` from the board plan. Legacy `slots: { newWords, wrap }` still works if no full plan is passed.

## Non-goals

- No Gemini schema change for v1 (local heuristics)
- No binary format changes
- No auto-check “correctness” in ClassIn (teacher coaches)
- No bundler

## Assets

See [`public/assets/LICENSE.md`](../public/assets/LICENSE.md) and [`public/assets/manifests/themes.json`](../public/assets/manifests/themes.json).
