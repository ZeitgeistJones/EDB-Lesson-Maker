# Board quality progress

Area scores over time from `fullquality` / `quality` bakes. Written by
`npm run quality:progress -- --snap` and automatically on `quality:judge`.
Do not hand-edit the numbers — append via those commands.

**Reading the arrows:** ↑ improved · ↓ worsened · → flat.
Deltas only vs a prior row with the **same tier and case count**
(core×3 vs all×20 is not a trend — those rows show raw numbers only).
Prefer `fullquality` → `fullquality` for scoreboard reads.
Lower-is-better for fails/unvetted; higher-is-better for mean M5/M7 and pillars.

> Note: almost no soft fails, but **137 soft warns** remain — don’t treat this as done.

| Date | Tier | cases | Hard fails | Soft metric fails | Soft metric warns | M5 variety fails | M7 vocab-art fails | Layout soft fails (M8/M9/M10) | Unvetted vocab words | Open wishlist rows | Mean M5 (variety) | Mean M7 (vetted art) | Pillar score avg (0-3) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-07 | all | 20 | 0 | 18 | 145 | 10 | 3 | 5 | 26 | 7 | 0.363 | 0.767 | — |
| 2026-08-07 | core | 3 | 0 | 2 | 25 | 1 | 1 | 0 | 6 | 7 | 0.311 | 0.444 | 2.583 |
| 2026-08-07 | all | 20 | 0 | 3 ↑-15 | 139 ↑-6 | 0 ↑-10 | 3 | 0 ↑-5 | 26 | 9 ↓+2 | 0.533 ↑+0.17 | 0.767 | — |
| 2026-08-07 | all | 20 | 0 | 1 ↑-2 | 137 ↑-2 | 0 | 1 ↑-2 | 0 | 10 ↑-16 | 7 ↑-2 | 0.532 ↓-0.00 | 0.95 ↑+0.18 | — |

## Since first comparable `all` × 20 cases

_Baseline: 2026-08-07 → latest 2026-08-07_

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
