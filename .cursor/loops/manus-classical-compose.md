# manus-classical-compose

type: manusloop  
case: classical-compose  
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Re-runnable with no chat history: `/manusloop run manus-classical-compose`

## Product intent

ClassIn ESL producer for “Composing a Classical Masterpiece” / fixture retitle “Writing a Symphony for the Orchestra”. Fix **machinery** (prompts, pickers, gates, verify) so Manus misses don’t recur — not one-off PNG edits.

## Stages

### 1 — Base

```bash
node scripts/verify-classical-compose.mjs
npm run manus:dry -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

Expect: `ok: true`, `storyPageCount: 3`, page-7-story2 on disk, dry-run `images` lists story0+story1+story2, `hasMatchPads` + `matchPadDomCount` = vocab size.

### 2 — Manus

Prefer **cached** review unless verify rebake clearly needs a second live pass:

- URL: https://manus.im/app/USYeNZYJPBBG83desbukbT
- verdict: pass · score: 98
- Cached body: `.cursor/loops/manus-classical-compose/last-response.md`
- Log: `.cursor/ratings/manus-reviews.jsonl` (task_id `USYeNZYJPBBG83desbukbT`)

Prior cached (pre-pad): https://manus.im/app/J4up6tWdwZyWUWP5wLq2pG · revise/72

Live only after producer fixes + updated pass-off:

```bash
npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

### 3 — Fix producer (map findings → code)

| Finding | Fix here |
|---------|----------|
| B1 story beat 3 “missing” | `scripts/manus/review.mjs` `pickImages` — attach all `storyN`; verify S27 |
| B2 inspire glyph | `public/lib/vocabIcons.js` PACK_OVERRIDES; `edbActivities` matchDock captions; `buildEdb` captionedArtPng; S26 |
| Aims / grammar | `public/lib/renderLessonPages.js` makeTitle; S25 |
| Frame 2 identity | fixture `scripts/fixtures/classical-compose-lesson.json` |
| Story guitar → piano | same fixture + PropBank caption |
| Timing chips | `header(..., { timing })` in renderLessonPages; S29 duration≥45 |
| Soft drop zones | `makeVocab` numbered `data-match-pad` under words + `recipe:matchDockPads`; S28 |
| matchPad → tiny vocab art | `pieceToPng` prefer data:/pad roles before wordArt |
| Pass-off | `scripts/manus/passoffs/classical-compose.json` |
| Soft codes | `scripts/ux-board-rubric.cjs` S25–S29 |
| Wishlist / skill | `docs/content-wishlist.md`, `.cursor/skills/manus-lesson-review` |

### 4 — Audit

```bash
node scripts/verify-classical-compose.mjs
npm run manus:dry -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json
```

Confirm: 3 story JPGs; inspire ≠ `inspire.png` starburst; dry-run lists all story pages; numbered pads on newWords; update **Last run** below.

## Last run

- **When:** 2026-08-07 (manusloop take-the-wheel · second live Manus)
- **Base:** verify **ok** (e0466b5 tip; story0/1/2 in packet)
- **Manus:** live **pass/98** (`USYeNZYJPBBG83desbukbT`) — JUST FIXED held; only soft leftover = numbered drop pads (known)
- **Producer fixes:** numbered matchDock DOM pads (S28); pieceToPng data:/pad-role before wordArt; S29 timing≥45; passoff/wishlist/skill
- **Audit:** verify **ok** — storyPageCount=3; hasMatchPads=true; matchPadDomCount=6; inspire=`pack:brain.png`; timingChipCount=9; pickImages includes story0/1/2
