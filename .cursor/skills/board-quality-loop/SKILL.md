---
name: board-quality-loop
description: >-
  Autonomous ClassIn board quality loop: bake fixtures, enforce hard layout/background
  rules, visually judge full board strips against the UX rubric, fix code, and re-bake
  up to 5 iterations. Use when the user says quality loop, preflight and fix, take the
  wheel on boards, or asks to improve board UX automatically.
---

# Board quality loop

Take the wheel on board quality. Do not ask the user to screenshot ClassIn first.

## Sacred (never)

- Rewrite `.edb` byte packing in `buildEdb.js` writer format
- Add unverified / scraped clipart
- Put scene wallpaper on Lesson PDF chrome

## Allowed scope

- `public/lib/*` board chrome, picker, recipes, layout
- Verified assets already in `public/assets/08_backgrounds` / `09_props` (props only if EW4)
- Roadmap easy wins EW1 → EW3 → EW2 → EW4 when **P1** fires
- Tests under `scripts/`

## Loop (max 5 iterations)

1. Run `npm run quality` (alias of preflight).
2. Read `tmp/board-bg-verify/report.json`.
3. **If `hardFailures` non-empty:** fix those codes first (see `scripts/ux-board-rubric.cjs`). One coherent theme per iteration. Re-run step 1.
4. **If hard clean:** for **each** case in the report, Read:
   - `strip.jpg` (full board)
   - review pages listed in `cases[].reviewPages` (title, warm, vocab, story, activity)
5. Score soft codes S1–S12. Write `uxVerdict` into `tmp/board-bg-verify/report.json`:
   ```json
   {
     "uxVerdict": {
       "iteration": 1,
       "softFindings": [{ "code": "S10", "caseId": "gym", "clearFix": true, "root": "warm-empty", "note": "..." }],
       "decision": { "action": "fix_soft", "message": "..." }
     }
   }
   ```
   Use `require('./scripts/ux-board-rubric.cjs').decide(...)` logic when choosing action.
6. Apply the decision:
   - `fix_hard` / `fix_soft` → patch code
   - `promote_ew` → implement that EW briefly, then re-bake
   - `clean` → commit + push (user git rules), summarize
   - `stop_*` → stop and tell user what remains ClassIn-only
7. Re-bake. If the **same soft root** appears again → treat as P1 next iteration.

## Judgment tips

- Prefer pedagogical clarity (matchDock must not show answers on cards)
- Prefer place/worksheet rhythm over wallpaper spam
- Prefer one high-impact fix over drive-by refactors
- After vision pass, always land at least one clear fix on the first clean hard bake if soft clearFix exists

## Commands

```bash
npm run quality
npm run quality:status
```
