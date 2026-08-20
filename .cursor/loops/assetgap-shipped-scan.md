# assetgap-shipped-scan

type: assetgaploop
case: broad scan of current shipped fixture lessons + asset manifests
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-run: `/assetgaploop run assetgap-shipped-scan`
Reports (read-only, no writes): `node tmp/assetgap-scan.mjs`, `npm run test:bg-picks`, `npm run assets:prop-demand`

## Surfaces scanned

- Manifests: `09_props/manifest.json` (778), `08_backgrounds/manifest.json` (80 scenes), `07_vocab-pack/index.json` (396), `10_coloring/manifest.json` (33), `manifests/themes.json` (12 chars)
- Fixtures: all 25 `scripts/fixtures/*-lesson.json` (resolve assets by tags, not hardcoded paths)
- UI: `public/index.html` (only a text input placeholder — no image gaps)
- Resolvers exercised read-only: `sceneBackgrounds.js` (bg picks), `propBank.js` (prop demand)

## Asset dirs

- Props: `public/assets/09_props/img/`
- Backgrounds: `public/assets/08_backgrounds/img/`
- Vocab: `public/assets/07_vocab-pack/img/`
- Coloring: `public/assets/10_coloring/img/`
- Characters: `public/assets/01_characters/**`

## Policy

Locate before generate. This pass = **scan + locate only** (collision window: builder editing
`renderLessonPages.js` / verify scripts / feelings+classical fixtures / gates; assetscout appending
prop-manifest rows). Do NOT edit shared producer code, feelings/classical fixtures, verify scripts,
or the prop manifest. Fix the producer (picker weights, prompts, manifest via owning loop) — not one-off art.

## Ranked gap table

| Gap | Where | Need | Severity | Locate (existing reuse?) | Generate later? |
|-----|-------|------|----------|--------------------------|-----------------|
| Scene backgrounds never selected — all 25 fixtures pick `scenes=0 flats=10` | `sceneBackgrounds.js` picker vs `08_backgrounds` (80 scene PNGs) | Investigate why 80 shipped scene PNGs score `-`; lessons look flat-only | high | YES — 80 scene PNGs already on disk; no new art needed, likely a picker/scoring/tag fix | No — producer (picker) fix, builder owns this window → defer |
| `glossy-adventure` scene-dressing empty: medical, cafeteria, school, home, gym = 0 props; park = 1 | `propBank` theme demand | ≥2 distinct glossy dressing props per theme | med | Partial — matte house-family dressing exists; glossy family thin | No — needs prop art + manifest rows → assetscout owns → defer |
| Phonics soundBoxes 0/5 (glossy-adventure) | `phonicsSoundBoxes/soundBox` recipe (travel, overflow, campsite) | 5 soundBox props | med | No glossy soundBox in bank | No — prop + manifest → assetscout → defer |
| Travel heroProp roleplay tool short 7/8 | travel + overflow fixtures | 1 more distinct glossy roleplay tool | low | 7/8 already resolve from existing bank | No — 1 prop + manifest → assetscout → defer |
| Campsite heroProp roleplay tool short 6/8 | campsite fixture | 2 more distinct glossy roleplay tools | low | 6/8 already resolve from existing bank | No — prop + manifest → assetscout → defer |
| Broken manifest→file references | props/bg/vocab/coloring/characters | (none) | none | N/A — 0 broken, all 1,266 refs resolve | N/A |

## Locate summary (reuse found)

- **80 scene backgrounds** already keyed and on disk but unused by picker → reuse target, not a missing asset.
- Matte house-family dressing/hero props cover most non-glossy recipes; travel/campsite heroTool already resolve 6–7 of 8 from the existing bank.
- No orphaned/broken image paths — nothing to repair.

## Deferred: active writers

This window has two concurrent loops writing shared files:
- builder → `renderLessonPages.js`, `verify-*.mjs`, feelings/classical fixtures, gates
- assetscout → new-topic assets + `09_props/manifest.json` rows

All prop-side gaps (glossy dressing themes, soundBoxes, hero tools) require **prop art + manifest rows** → assetscout owns; **deferred**.
Background-selection gap requires a **picker/producer fix** in `sceneBackgrounds.js`/`renderLessonPages.js` → builder owns; **deferred**.
No standalone asset was found that needs zero shared-file and zero manifest edits, so **generated=0** this pass.

## Last run

- **When:** 2026-08-08 (scan-safe pass, active writers)
- **DURATION_MINUTES:** 5
- **gaps:** 5 real (+1 clean "no broken refs" row)
- **located:** 2 reuse wins (80 scene PNGs unused; hero tools 6–7/8 from bank)
- **generated:** 0 (scan-safe — no shared/manifest edits allowed this window)
- **still open:** 5, all deferred to owning loops (builder + assetscout)
- **Lead:** `Assetgaploop shipped-scan: gaps=5 · located=2 · generated=0 (scan-safe) · still open=5`
