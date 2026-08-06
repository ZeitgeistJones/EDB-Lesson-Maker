---
name: board-quality-loop
description: >-
  Autonomous ClassIn board quality loop: bake fixtures, enforce hard layout/background
  rules, read measured UX metrics, visually judge queued board pages as both teacher and
  student (readable, navigable, accurate vocab art, varied/appropriate backgrounds,
  fun/charming), submit a validated verdict, fix code, and re-bake up to 5 iterations.
  Use when the user says quality loop, preflight and fix, take the wheel on boards, or
  asks to improve board UX automatically.
---

# Board quality loop

Take the wheel on board quality. Do not ask the user to screenshot ClassIn first.

The loop has memory. Start by reading it — a previous chat may already have tried
your idea.

## Commands

```bash
npm run quality:status                        # loop memory + last bake + review queue
npm run quality                               # bake core cases (fast)
npm run quality:full                          # bake core + adversarial (before declaring clean)
npm run quality:judge -- tmp/verdict.json     # validate judgment, get NEXT ACTION
npm run quality:baseline                      # snapshot metrics as the regression baseline
```

Never hand-edit `tmp/board-bg-verify/report.json`. The judge CLI writes it, appends
`docs/quality-log.md`, and updates `scripts/quality-state.json`.

## Loop (max 5 iterations)

1. `npm run quality:status` — read remembered soft roots, implemented easy wins, and
   recent iterations. Do not re-try a root that already repeated; that is what P1 is for.
2. `npm run quality` (or `quality:full`).
3. **Hard failures?** Fix them first, one coherent theme per iteration, then re-bake.
   Hard failures come from the bake, not from your judgment.
4. **Hard clean?** For each case, Read `contact.jpg` (labeled grid — page index, pageKey,
   recipe) then Read the queued `page-*.jpg` from `review.json` → `reviewQueue`. The queue
   is ordered: regressions first, then metric failures, then warnings, then the pages that
   always matter (title, newWords, story, activity, warm).
5. Apply the **dual lens** and pillars below to what you actually see. Metrics are hints,
   not verdicts — confirm or overrule them with your eyes and say which in the note.
   For layout/dead-space/write-in/dock density fixes, also follow
   [board-ux-layout](../board-ux-layout/SKILL.md).
6. Write `tmp/verdict.json` and submit it: `npm run quality:judge -- tmp/verdict.json`.
7. Do exactly what `NEXT ACTION` says. Re-bake. Same soft root twice → P1 (next easy win);
   after implementing one, record it with `--mark-done=EW1`.
8. Before telling the user it is clean: `npm run quality:full`, and if you are happy with
   the numbers, `npm run quality:baseline` so future regressions are caught.

## Verdict file

```json
{
  "lens": {
    "student": "what a kid sees, in one or two sentences",
    "teacher": "what the teacher sees running the page cold"
  },
  "scores": { "gym": { "readable": 2, "navigable": 3, "accurateVocabArt": 1, "funCharming": 1 } },
  "findings": [
    {
      "code": "M6",
      "caseId": "gym",
      "pageKey": "newWords",
      "note": "purple heading on the dark chalkboard flat is unreadable from the back",
      "root": "dark-flat-contrast",
      "clearFix": true,
      "assetGap": false
    }
  ],
  "clean": false
}
```

- `code` must exist in [scripts/ux-board-rubric.cjs](../../../scripts/ux-board-rubric.cjs)
  (H\*, S\*, M\*, R1). Unknown codes are rejected.
- `root` is the **cause**, not the symptom — repeated roots are what trigger promotion.
- `clearFix: true` means you know the code change and it is inside allowed scope.
- `assetGap: true` means the art is wrong and nothing verified exists. Do not force a
  substitute; see Wishlist.
- Scores are 0-3 per pillar per case. They are the trend line across iterations.

## Dual lens (required on every vision pass)

### Student (kid in ClassIn)
- Can I read the words fast without squinting?
- Do I know what to do next without the teacher explaining the UI?
- Do the dock pictures clearly mean the vocab words (not random/wrong)?
- Does this page feel fun — like a place or a game board — not a boring form?

### Teacher (standing in front of class)
- Can I glance and run the page in under 5 seconds?
- Is the activity honest (no answer already on the card)?
- Do backgrounds match the topic and change enough that the lesson doesn't feel copy-pasted?
- Would I be embarrassed if a parent peeked at this board?

If student and teacher disagree, prefer **clarity + honesty** (readable, accurate, no
answer leak), then charm.

## Product pillars

1. **Easy to read** — big type, contrast, no text fighting scenery (M1, M2, M6)
2. **Easy to navigate** — clear page job; dock/targets obvious (M3)
3. **Accurate vocab images** — dock icons match the word meaning (M7)
4. **Background variability** — place scenes + rotating flats (M5)
5. **Appropriate backgrounds** — clinic≠street, gym≠kitchen
6. **Fun and charming** — warm, story, activity should delight a little (M4)

Fix order is tiered in the rubric: honesty → readable → navigable → variety → charm.
A charming board that lies to students or cannot be read is worse than a plain one.

## What the metrics mean

| Code | Reads | Watch for |
|---|---|---|
| M1 | smallest text on the page | 13px hint labels; 18px body is fine |
| M2 | text on busy background with no card/wash | story/activity captions on scenes |
| M3 | how full the main content card is | sparse warm-up and story cards |
| M4 | share of pages with any non-text art | whole board reading as a form |
| M5 | background variety across the case | wallpaper spam |
| M6 | header contrast against what is behind it | dark text on dark flats (chalkboard) |
| M7 | vocab words with vetted art (pack or curated glyph) | abstract words → wishlist, not fake icons |
| M8 | how far down the board content reaches | comprehension/warm pages stranded in the top strip |

Metrics never fail the bake. They order your review queue and catch regressions.

## Wishlist (fetch later)

File: `docs/asset-wishlist.md`

When the art is wrong or weak **and** no verified in-repo asset exists:

- Append one row (`Need`, why/case, preferred type, safe source, `Status: open`)
- Keep the best legal stand-in (stadium for *spacious* — not a door)
- Mark the finding `assetGap: true` so the policy logs it instead of forcing a fix
- The bake proposes candidates: `wishlistCandidates` lists vocab words with no pack art
- Fetch/wire only when the user asks; never close a row with scraped clipart

## Sacred (never)

- Rewrite `.edb` byte packing in `buildEdb.js` writer format
- Add unverified / scraped clipart
- Put scene wallpaper on Lesson PDF chrome
- Promote a metric from soft to hard gate without asking the user

## Allowed scope

- `public/lib/*` board chrome, picker, recipes, layout
- Verified assets already in `public/assets/08_backgrounds` / `09_props` (props only if EW4)
- Roadmap easy wins EW1 → EW3 → EW2 → EW4 when **P1** fires
- Tests and harness under `scripts/`

## Judgment tips

- Prefer pedagogical clarity (matchDock must not show answers on cards)
- Prefer place/worksheet rhythm over wallpaper spam
- Prefer one high-impact fix over drive-by refactors
- Charm without clutter — one delightful thing beats five stickers
- Prefer wishlist + honest stand-in over a misleading substitute
- Adversarial cases (`abstract-words`, `bad-theme`, `minimal`, `overflow`) exist to catch
  the failure classes that already bit us. Treat their findings as first-class.

## Model note

Foundation work and sticky judgment calls (rubric, thresholds, policy, ambiguous art
accuracy) deserve a high-reasoning model. Mechanical iterations — one alias, one padding
fix, one re-bake — run fine on a fast model once the harness is green.

## Related skills

- **Process over artifacts:** [`.cursor/rules/fix-the-producer.mdc`](../../rules/fix-the-producer.mdc) — fix skill/prompt/gate/recipe, then re-bake; don’t hand-edit one board JPEG as the fix
- **King-stage / roleplay EDB** (huge hero + tool dock): `.cursor/skills/king-stage-edb/SKILL.md`
- **Prop cutouts**: `.cursor/skills/prop-cutouts/SKILL.md`
- **Quiet flat sets (in-house)**: `.cursor/skills/bg-flat-sets/SKILL.md` — when a
  *place* set is missing (≥2 panels), generate four landscape washes and wire
  `TOPIC_SETS`. Non-place topics stay on `board-house`; never invent skin washes
