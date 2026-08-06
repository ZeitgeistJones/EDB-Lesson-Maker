# Story-page illustrations

Optional realtime Gemini art for **story reading pages only** (not vocab docks, not activity props). Comprehension stays text-only.

## Enable

1. Server: set `STORY_ART=1` (and `GEMINI_API_KEY`) in `.env` / Vercel env.
2. UI: check **Illustrate story pages** before Generate.

Optional:

| Env | Default | Role |
|-----|---------|------|
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` | Image generation |
| `GEMINI_VISION_MODEL` | `GEMINI_MODEL` / flash-lite | Legible-text gate |
| `STORY_ART_TIMEOUT_MS` | `45000` | Per-image abort |

## Producer policy

- **Literal** paragraph-matching scenes for A1–A2 (not inferential / ironic art).
- Flat children’s-book gouache wash; culturally generic; uncluttered.
- **No text / letters / signs** in prompts; a cheap vision YES/NO check rejects failures.
- One **style reference** image per lesson, passed into every page call with an explicit style-reference role.
- Partial success is fine — null pages keep today’s quiet flat + emoji/caption side art.

## Pipeline

1. Lesson JSON returns immediately (unchanged `/api/generate-lesson`).
2. Preview kicks off `POST /api/generate-story-art` in the background.
3. Session cache (`public/lib/storyArt.js`) keys on title + page text/captions.
4. `LessonPages.applyStoryArt` fills `[data-story-art]` slots (solo = top banner; multi-page = side panel).
5. Board / preview PDF / PNG downloads rasterize whatever is in the DOM — art is baked if ready, otherwise quiet flats.

## Layout

Illustration and reading card are **separate zones** (no text over art). Matches board readability rules and picture-book pedagogy for novice readers.

## Smoke

```bash
npm run test:story-art-latency
```

Needs `GEMINI_API_KEY`. Prints p50/p95 for a single 1K image — use that to judge how long teachers should linger on preview before download.
