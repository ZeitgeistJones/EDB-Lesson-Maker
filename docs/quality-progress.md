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
| 2026-08-07 | all | 20 | 0 | 1 ↑-2 | 137 ↑-2 | 0 | 1 ↑-2 | 0 | 10 ↑-16 | 7 ↑-2 | 0.532 ↓-0.00 | 0.95 ↑+0.18 | — |
| 2026-08-07 | all | 20 | 20 ↓+20 | 1 | 34 ↑-103 | 0 | 1 | 0 | 10 | 7 | 0.533 ↑+0.00 | 0.95 | — |
| 2026-08-07 | all | 20 | 0 ↑-20 | 1 | 40 ↓+6 | 0 | 1 | 0 | 10 | 7 | 0.537 ↑+0.00 | 0.95 | — |
| 2026-08-07 | all | 20 | 0 | 15 ↓+14 | 15 ↑-25 | 0 | 1 | 0 | 10 | 7 | 0.521 ↓-0.02 | 0.95 | — |
| 2026-08-07 | all | 20 | 0 | 1 ↑-14 | 16 ↓+1 | 0 | 1 | 0 | 10 | 7 | 0.519 ↓-0.00 | 0.95 | — |
| 2026-08-09 | core | 3 | 0 | 1 ↑-1 | 16 ↑-9 | 0 ↑-1 | 0 ↑-1 | 1 ↓+1 | 3 ↑-3 | 10 ↓+3 | 0.417 ↑+0.11 | 0.833 ↑+0.39 | 2.25 ↓-0.33 |
| 2026-08-09 | core | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 10 | 0.404 | 1 | 2.5 |
| 2026-08-09 | core | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 10 | 0.435 ↑+0.03 | 1 | 2 ↓-0.50 |
| 2026-08-09 | core | 4 | 0 | 0 | 19 | 0 | 0 | 0 | 0 | 10 | 0.415 | 1 | 2.5 |
| 2026-08-09 | core | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 10 | 0.404 ↓-0.03 | 1 | 2.75 ↑+0.75 |
| 2026-08-09 | core | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 3 ↓+3 | 15 ↓+5 | 0.481 ↑+0.08 | 0.5 ↓-0.50 | 2.333 ↓-0.42 |
| 2026-08-09 | core | 4 | 0 | 0 | 4 ↑-15 | 0 | 0 | 0 | 0 | 16 ↓+6 | 0.415 | 1 | 2.75 ↑+0.25 |

## Since first comparable `core` × 4 cases

_Baseline: 2026-08-09 → latest 2026-08-09_

- **Hard fails:** 0 → 0 (→)
- **Soft metric fails:** 0 → 0 (→)
- **Soft metric warns:** 19 → 4 (↑-15)
- **M5 variety fails:** 0 → 0 (→)
- **M7 vocab-art fails:** 0 → 0 (→)
- **Layout soft fails (M8/M9/M10):** 0 → 0 (→)
- **Unvetted vocab words:** 0 → 0 (→)
- **Open wishlist rows:** 10 → 16 (↓+6)
- **Mean M5 (variety):** 0.415 → 0.415 (→)
- **Mean M7 (vetted art):** 1 → 1 (→)
- **Pillar score avg (0-3):** 2.5 → 2.75 (↑+0.25)

## Metric rates (latest)

_Denom: 42 pages · 4 cases_

| Metric | Scope | Rate | vs prior comparable |
| --- | --- | --- | --- |
| M1 tiny text | page | 0.0% (0/42) | ↑-0.36 |
| M2 busy-bg text | page | 0.0% (0/42) | → |
| M3 sparse card | page | 0.0% (0/42) | → |
| M6 low contrast | page | 0.0% (0/42) | → |
| M8 short reach | page | 0.0% (0/42) | → |
| M9 dead space | page | 0.0% (0/42) | → |
| M10 tiny dock piece | page | 0.0% (0/42) | → |
| M4 low visuals | case | 0.0% (0/4) | → |
| M5 low variety | case | 100.0% (4/4) | → |
| M7 weak vocab art | case | 0.0% (0/4) | → |
