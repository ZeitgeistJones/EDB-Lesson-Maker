# Board quality progress

Area scores over time from `fullquality` / `quality` bakes. Written by
`npm run quality:progress -- --snap` and automatically on `quality:judge`.
Do not hand-edit the numbers — append via those commands.

**Reading the arrows:** ↑ improved · ↓ worsened · → flat.
Deltas only vs a prior row with the **same tier and case count**
(core×3 vs all×20 is not a trend — those rows show raw numbers only).
Prefer `fullquality` → `fullquality` for scoreboard reads.
Lower-is-better for fails/unvetted; higher-is-better for mean M5/M7 and pillars.

**Metric rates:** share of pages (M1/M2/M3/M6/M8/M9/M10) or cases (M4/M5/M7)
with a warn *or* fail. Prefer rates over raw warn counts as the bake grows;
thresholds can tighten later without changing the rate definition.

| Date | Tier | cases | Hard fails | Soft metric fails | Soft metric warns | M5 variety fails | M7 vocab-art fails | Layout soft fails (M8/M9/M10) | Unvetted vocab words | Open wishlist rows | Mean M5 (variety) | Mean M7 (vetted art) | Pillar score avg (0-3) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-07 | all | 20 | 0 | 18 | 145 | 10 | 3 | 5 | 26 | 7 | 0.363 | 0.767 | — |
| 2026-08-07 | core | 3 | 0 | 2 | 25 | 1 | 1 | 0 | 6 | 7 | 0.311 | 0.444 | 2.583 |
| 2026-08-07 | all | 20 | 0 | 3 ↑-15 | 139 ↑-6 | 0 ↑-10 | 3 | 0 ↑-5 | 26 | 9 ↓+2 | 0.533 ↑+0.17 | 0.767 | — |
| 2026-08-07 | all | 20 | 0 | 1 ↑-2 | 137 ↑-2 | 0 | 1 ↑-2 | 0 | 10 ↑-16 | 7 ↑-2 | 0.532 ↓-0.00 | 0.95 ↑+0.18 | — |
| 2026-08-07 | all | 20 | 20 ↓+20 | 1 | 34 ↑-103 | 0 | 1 | 0 | 10 | 7 | 0.533 ↑+0.00 | 0.95 | — |
| 2026-08-07 | all | 20 | 0 ↑-20 | 1 | 40 ↓+6 | 0 | 1 | 0 | 10 | 7 | 0.537 ↑+0.00 | 0.95 | — |

## Since first comparable `all` × 20 cases

_Baseline: 2026-08-07 → latest 2026-08-07_

- **Hard fails:** 0 → 0 (→)
- **Soft metric fails:** 18 → 1 (↑-17)
- **Soft metric warns:** 145 → 40 (↑-105)
- **M5 variety fails:** 10 → 0 (↑-10)
- **M7 vocab-art fails:** 3 → 1 (↑-2)
- **Layout soft fails (M8/M9/M10):** 5 → 0 (↑-5)
- **Unvetted vocab words:** 26 → 10 (↑-16)
- **Open wishlist rows:** 7 → 7 (→)
- **Mean M5 (variety):** 0.363 → 0.537 (↑+0.17)
- **Mean M7 (vetted art):** 0.767 → 0.95 (↑+0.18)
- **Pillar score avg (0-3):** — → — (·)

## Metric rates (latest)

_Denom: 227 pages · 20 cases_

| Metric | Scope | Rate | vs prior comparable |
| --- | --- | --- | --- |
| M1 tiny text | page | 0.0% (0/227) | → |
| M2 busy-bg text | page | 0.0% (0/227) | → |
| M3 sparse card | page | 0.0% (0/227) | → |
| M6 low contrast | page | 0.4% (1/227) | → |
| M8 short reach | page | 9.7% (22/227) | → |
| M9 dead space | page | 2.6% (6/227) | ↓+0.03 |
| M10 tiny dock piece | page | 3.5% (8/227) | → |
| M4 low visuals | case | 5.0% (1/20) | → |
| M5 low variety | case | 10.0% (2/20) | → |
| M7 weak vocab art | case | 5.0% (1/20) | → |
