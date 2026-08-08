# assetgap-story-art

type: assetgaploop  
case: story-art (feelings-compass + classical-compose)  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-run: `/assetgaploop run assetgap-story-art` or `npm run story-art:illustrate -- <fixture>`

## Surfaces scanned

- `api/generate-story-art.js` (prompts, text gate, disk cache)
- `public/lib/storyArt.js` (session + sessionStorage)
- `LessonPages.applyStoryArt` / `meta.storyArt` bake inject
- PropBank `storyFallbackVisual` (interim when cache miss)
- Fixtures: `feelings-compass-lesson.json`, `classical-compose-lesson.json`

## Asset dirs

- Cache: `tmp/story-art-cache/<hash>/` (gitignored)
- Reports: `tmp/story-art-loop/`
- Bake: `tmp/board-bg-verify/{feelings-compass,classical-compose}/`

## Policy

Locate/cache first, then generate. Fix machinery (prompts, cache, verify hydrate, caption prompts) — not one-off Photoshop of a story JPG.

## Gap template

| Gap | Where | Need | Severity | Locate? | Generate? |
|-----|-------|------|----------|---------|-----------|
| Disk cache for fixture fingerprints | tmp/story-art-cache | reuse across verify | high | yes | on miss |
| Feelings story panels generative | verify bake | 3 pages data-story-art-gen | high | cache | Gemini |
| Classical story panels generative | verify bake | same | med | cache | Gemini |
| Paint-able captions | generate-lesson | who+where+action | med | — | prompt |

## Last run

- **When:** 2026-08-08 (Shift60 StoryArt machinery)
- **DURATION_MINUTES:** ~60 (producer; Manus deferred if credits empty / operator away)
- **gaps:** generative art not wired into verify before this pass
- **located:** PropBank feeling-* / musician-* fallbacks already good
- **generated:** via `illustrate-fixture-story.mjs` when run
- **wired:** disk cache, verify `--story-art=auto`, S47 soft, sessionStorage
- **still open:** classical illustrate cache (Gemini credits); live Manus after credits; palette soft
- **Lead:** `Assetgaploop assetgap-story-art: feelings cache green · classical hydrate parity · Manus deferred`
