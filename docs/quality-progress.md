# Board quality progress

Area scores over time from `fullquality` / `quality` bakes. Written by
`npm run quality:progress -- --snap` and automatically on `quality:judge`.
Do not hand-edit the numbers — append via those commands.

**Reading the arrows:** ↑ improved · ↓ worsened · → flat (vs previous snapshot).
Lower-is-better for fails/unvetted; higher-is-better for mean M5/M7 and pillars.

| Date | Tier | cases | Hard fails | Soft metric fails | Soft metric warns | M5 variety fails | M7 vocab-art fails | Layout soft fails (M8/M9/M10) | Unvetted vocab words | Open wishlist rows | Mean M5 (variety) | Mean M7 (vetted art) | Pillar score avg (0-3) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-07 | all | 20 | 0 | 18 | 145 | 10 | 3 | 5 | 26 | 7 | 0.363 | 0.767 | — |
| 2026-08-07 | core | 3 | 0 | 2 ↑-16 | 25 ↑-120 | 1 ↑-9 | 1 ↑-2 | 0 ↑-5 | 6 ↑-20 | 7 | 0.311 ↓-0.05 | 0.444 ↓-0.32 | 2.583 |
| 2026-08-07 | all | 20 | 0 | 3 ↓+1 | 139 ↓+114 | 0 ↑-1 | 3 ↓+2 | 0 | 26 ↓+20 | 9 ↓+2 | 0.533 ↑+0.22 | 0.767 ↑+0.32 | — |
| 2026-08-07 | all | 20 | 0 | 1 ↑-2 | 137 ↑-2 | 0 | 1 ↑-2 | 0 | 10 ↑-16 | 7 ↑-2 | 0.532 ↓-0.00 | 0.95 ↑+0.18 | — |

## Since first snapshot

- **Hard fails:** 0 → 0 (→)
- **Soft metric fails:** 18 → 1 (↑-17)
- **Soft metric warns:** 145 → 137 (↑-8)
- **M5 variety fails:** 10 → 0 (↑-10)
- **M7 vocab-art fails:** 3 → 1 (↑-2)
- **Layout soft fails (M8/M9/M10):** 5 → 0 (↑-5)
- **Unvetted vocab words:** 26 → 10 (↑-16)
- **Open wishlist rows:** 7 → 7 (→)
- **Mean M5 (variety):** 0.363 → 0.532 (↑+0.17)
- **Mean M7 (vetted art):** 0.767 → 0.95 (↑+0.18)
- **Pillar score avg (0-3):** — → — (·)
