---
name: board-quality-loop
description: >-
  Autonomous ClassIn board quality loop: bake fixtures, enforce hard layout/background
  rules, visually judge full board strips as both teacher and student (readable,
  navigable, accurate vocab art, varied/appropriate backgrounds, fun/charming), fix
  code, and re-bake up to 5 iterations. Use when the user says quality loop, preflight
  and fix, take the wheel on boards, or asks to improve board UX automatically.
---

# Board quality loop

Take the wheel on board quality. Do not ask the user to screenshot ClassIn first.

## Dual lens (required on every vision pass)

Judge **every** strip/page twice before scoring:

### Student (kid in ClassIn)
- Can I read the words fast without squinting?
- Do I know what to do next without the teacher explaining the UI?
- Do the dock pictures clearly mean the vocab words (not random/wrong)?
- Does this page feel fun — like a place or a game board — not a boring form?

### Teacher (standing in front of class)
- Can I glance and run the page in under 5 seconds?
- Is the activity honest (no answer already on the card)?
- Do backgrounds match the topic and change enough that the lesson doesn’t feel copy-pasted?
- Would I be embarrassed if a parent peeked at this board?

If student and teacher disagree, prefer **clarity + honesty** (readable, accurate, no answer leak), then charm.

## Product pillars (must score)

1. **Easy to read** — big type, contrast, no text fighting scenery  
2. **Easy to navigate** — clear page job; dock/targets obvious  
3. **Accurate vocab images** — dock icons match the word meaning  
4. **Background variability** — place scenes + rotating flats; not one wallpaper forever  
5. **Appropriate backgrounds** — clinic≠street, gym≠kitchen  
6. **Fun and charming** — warm, story, activity should delight a little; drills can be clean classroom surfaces  

Map pillars → rubric codes in `scripts/ux-board-rubric.cjs` (S1–S18).

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
3. **If `hardFailures` non-empty:** fix those codes first. One coherent theme per iteration. Re-run step 1.
4. **If hard clean:** for **each** case, Read `strip.jpg` + review pages. Apply **dual lens** + pillars.
5. Score soft codes. Write `uxVerdict` into `tmp/board-bg-verify/report.json` including `lens: { student, teacher }`.
6. Apply decision from `ux-board-rubric.decide(...)`.
7. Re-bake. Same soft root twice → **P1** (next EW).

## Judgment tips

- Prefer pedagogical clarity (matchDock must not show answers on cards)
- Prefer place/worksheet rhythm over wallpaper spam
- Prefer one high-impact fix over drive-by refactors
- Charm without clutter — one delightful thing beats five stickers
- After vision pass, land at least one clear fix on the first clean hard bake if `clearFix` exists

## Commands

```bash
npm run quality
npm run quality:status
```
