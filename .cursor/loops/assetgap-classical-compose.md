# assetgap-classical-compose

type: assetgaploop  
case: classical-compose  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-run: `/assetgaploop run assetgap-classical-compose`

## Surfaces scanned

- `scripts/fixtures/classical-compose-lesson.json` vocab (12 words)
- `public/assets/07_vocab-pack/img` classical ivory/gold pack
- `public/lib/vocabIcons.js` PACK_OVERRIDES / aliases
- Story PropBank fallback (`renderLessonPages.storyFallbackVisual`)
- Terrace / classical-moon BGs + wrap navy THEME bookend
- Match dock icons (no caption chips — producer gate)

## Asset dirs

- Vocab: `public/assets/07_vocab-pack/`
- Props: `public/assets/09_props/`
- BGs: `public/assets/08_backgrounds/`
- Bake: `tmp/board-bg-verify/classical-compose/`

## Policy

Locate first, then generate. Fix machinery (manifests, vocabIcons, PropBank prefer lists, verify) — not one-off Photoshop.

## Gap template

| Gap | Where | Need | Severity | Locate? | Generate? |
|-----|-------|------|----------|---------|-----------|
| Dedicated inspire art | match dock | inspire.png on disk | ok | yes | no |
| Vocab icons 12/12 | newWords | all exact PNGs | ok | — | — |
| Musician kit | activity dock / story | 18 musician-* + compose-desk | ok | — | — |
| Wrap/terrace bookends | title/activity/wrap | terrace + classical-moon + navy wrap | ok | on disk | — |
| Match pads / dock scale | producer sizing | not new art | n/a | — | — (edbActivities / renderLessonPages) |

## Last run

- **When:** 2026-08-07 (pre-manusloop scan)
- **DURATION_MINUTES:** n/a (locate-only gate)
- **gaps:** **no critical gaps**
- **located:** inspire.png, compose…masterpiece (12/12), musician-* kit, compose-desk, terrace/classical-moon
- **generated:** 0 (skipped generate burst)
- **wired:** n/a
- **still open:** full generative StoryArt scenes (PropBank interim — not a missing file)
- **Lead:** `Assetgaploop assetgap-classical-compose: gaps=0 critical · located=all · generated=0 · still open=StoryArt (deferred)`
