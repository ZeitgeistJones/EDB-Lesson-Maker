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
| Dedicated inspire art | match dock / PACK_OVERRIDES→brain | Clear ivory/gold inspire icon | high | miss | yes |
| StoryArt interim | story0–2 side props | Better PropBank picks; full StoryArt later | med | musician-* props | no (prefer lists) |
| Vocab icons 11/12 | newWords | already on disk | ok | — | — |
| Wrap/terrace bookends | title/activity/wrap | terrace + classical-moon + navy wrap | ok | on disk | — |
| Match art | match pads | icons + numbered pads | ok | — | — |

## Last run

- **When:** 2026-08-07 (~15 min burst)
- **DURATION_MINUTES:** 15
- **gaps:** 4 ranked (1 high / 1 med / 2 ok)
- **located:** terrace, classical-moon flats, 11/12 vocab icons, music PropBank kit, wrap navy CSS
- **generated:** 1 — `inspire.png` (lyre-bulb + notes); removed brain override; S26/verify require dedicated inspire.png
- **wired:** `vocabIcons.js`, `renderLessonPages` piano/orchestra prefer musician-*, passoff + wishlist + manus skill row
- **still open:** full generative StoryArt scenes (PropBank interim; musician-piano / musician-conductor preferred when captions match)
- **Lead:** `Assetgaploop assetgap-classical-compose: gaps=4 · located=3 · generated=1 · still open=1`
