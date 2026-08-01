# ClassIn EDB lesson spec

One continuous board = the interactive twin of the PDF lesson.
Same `lesson` JSON. Locked page backgrounds + optional draggable pieces on pages that need them.

## Board geometry

- Screen size: **1280 × 590**
- Page `i` sits at `y = i * 590`
- Backgrounds: locked images full-width
- Pieces: unlocked images/text on that page’s y-band

## Page spine (PDF parity)

| Index | Page | Interactions (v1) |
|------:|------|-------------------|
| 0 | Title | none |
| 1 | Warm-Up | none |
| 2 | New Words | **draggable emoji glyphs** (match to words) |
| 3 | Words in Sentences | none |
| 4 | Sentence Frames | none |
| 5–6 | Story (2 pages) | none |
| 7 | Reading Comprehension | none |
| 8 | Your Ideas (creative) | none |
| 9… | Let's Talk (1 per question) | none |
| N | Activity | none |
| N+1 | Great Job / Wrap | **draggable word tiles** from first review sentence |

No trailing bolt-on activity pages after wrap.

## Slots API

`LessonPages.render(lesson, meta)` returns:

```js
{ pageEls: HTMLElement[], slots: { newWords: number, wrap: number } }
```

`EdbKit.buildLessonEdb(lesson, meta, pageEls, slots)` places overlays using those indices.

## Assets

See [`public/assets/LICENSE.md`](../public/assets/LICENSE.md) and [`public/assets/manifests/themes.json`](../public/assets/manifests/themes.json).
