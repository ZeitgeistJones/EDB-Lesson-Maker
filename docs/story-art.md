# Story-page illustrations

Optional realtime Gemini art for **story reading pages only** (not vocab docks, not activity props). Comprehension stays text-only.

**v1 direction (locked, not implemented):** composable story scenes from reusable cutouts + 8 templates — see [story-scenes.md](story-scenes.md). This file documents today’s opportunistic stills path until the placer ships.

## Enable

1. Server: set `STORY_ART=1` (and `GEMINI_API_KEY`) in `.env` / Vercel env.
2. UI: check **Illustrate story pages** before Generate.

Optional:

| Env | Default | Role |
|-----|---------|------|
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-image` | Image generation (cheaper 1K lane; override if needed) |
| `GEMINI_VISION_MODEL` | `GEMINI_MODEL` / flash-lite | Legible-text gate |
| `STORY_ART_TIMEOUT_MS` | `45000` | Per-image abort |
| `STORY_ART_CACHE` | `1` | Disk cache under `tmp/story-art-cache/<hash>/` |
| `STORY_ART_BAKE` | `auto` | Verify default: apply cache if present (`0` skip, `1` generate on miss) |

## Producer policy

- **Literal** paragraph-matching scenes for A1–A2 (not inferential / ironic art).
- Flat children’s-book gouache wash; culturally generic; uncluttered.
- Captions should be **paint-able** (who + where + action). Feelings lessons lead with `feeling — scene`.
- **No text / letters / signs** in prompts; a cheap vision YES/NO check rejects failures (one page retry).
- One **style reference** image per lesson **only when there are 2+ story pages**; solo pages use prompt-only style (saves one paid image).
- Partial success is fine — null pages keep today’s quiet flat + PropBank/emoji side art.

## Pipeline

1. Lesson JSON returns immediately (unchanged `/api/generate-lesson`).
2. Preview kicks off `POST /api/generate-story-art` in the background.
3. Caches: in-memory + `sessionStorage` (client) and `tmp/story-art-cache/` (server). Same lesson fingerprint skips re-billing. Partial cache hits **fill only missing pages** (no re-bill of good pages); one short retry on Gemini “high demand” spikes.
4. `LessonPages.applyStoryArt` fills `[data-story-art]` slots (solo = top banner; multi-page = side panel) and sets `data-story-art-gen=1`.
5. Board / preview PDF / PNG downloads rasterize whatever is in the DOM — art is baked if ready, otherwise quiet flats + PropBank.

## Fixture / verify

```bash
# Generate + disk-cache art for a fixture (uses Gemini image credits)
node scripts/illustrate-fixture-story.mjs feelings-compass-lesson.json --title="Reading the Feelings Compass"

# Verify applies cache when present (soft S47 if missing)
node scripts/verify-feelings-compass.mjs --story-art=auto
node scripts/verify-classical-compose.mjs --story-art=auto
```

## Layout

Illustration and reading card are **separate zones** (no text over art). Matches board readability rules and picture-book pedagogy for novice readers.

**Invariant:** the **page** background stays a quiet flat (H2). Do not reopen place scenes as full-bleed story page picks — put dentist/beach/etc. art in the banner/side slot only. PropBank/emoji caption art is the offline fallback when StoryArt is off or fails.

## Smoke

```bash
npm run test:story-art
npm run test:story-art-latency
```

Needs `GEMINI_API_KEY` for latency. Prints p50/p95 for a single 1K image — use that to judge how long teachers should linger on preview before download.
