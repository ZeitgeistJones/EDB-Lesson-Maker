---
name: board-ux-layout
description: >-
  Hard-won ClassIn board layout rules: fill write-in pages, warm-up coloring,
  vocab side-dock vs word cards, denser roleplay docks, title cutouts, branding.
  Use when polishing board pages, fixing dead space / tiny text / cramped blanks,
  rebaking face or similar lessons, or judging contact.jpg as teacher/student.
---

# Board UX layout (lessons learned)

Apply these when baking or polishing lesson boards. Prefer **filling the 1280×590
board** over floating a lonely mid-page card.

## Product defaults

1. **No “ClassIn” in lesson chrome or UI product name** — use Lesson Board Builder /
   Download Board (.edb). Technical `.edb` comments are fine.
2. **Title = topic-forward** — clear topic art (e.g. face trio), not easter eggs.
   Easter eggs belong on content flats only, and must be **lesson-specific**
   (face eyes only on `board-face`; never on default `board-house` / castle / school).
3. **Readability first** — if type can be bigger without clipping, make it bigger.
4. **Dead mid-board is a bug** — a single question floating in empty space needs a
   second job (coloring stage, write box, dock, etc.).

## Page patterns that work

### Warm-up (avoid awkward mid float)

- Question card **top**, not vertically centered alone.
- **A1/A2 only:** white **Color me!** coloring page + crayon corner charm
  (`public/lib/coloringOutlines.js`). Resolve outline by lesson tokens
  (title / activity / warm question / vocab): face/eyes → eyes SVG; castle →
  castle SVG until banked; beach/animals/food/vehicles/space/family/weather →
  banked **2×2 PNG** crops in `public/assets/10_coloring/` (`npm run assets:coloring`);
  else a generic **star** SVG (never eyes).
- Eyes outlines are **face-only** — never hardcode them on every warm-up.
- B1+: question-only warm (no coloring stage).
- PNG imgs use `object-fit:contain` + intrinsic size (do not stretch to width).
  Prefer **inline SVG** when no banked PNG so headless bake captures outlines.

### New Words (match dock)

- Vocab match dock is a **right column**, not a bottom tray.
- `pageShell({ reserveDock: false })` for vocab — side docks must not steal
  bottom padding (`edbLayout.dockReservePx` already special-cases side docks).
- Word cards: CSS grid `1fr` rows + `flex:1` / `height:100%` so cards fill the
  left column. Dock icons should be **peers**, not giants (cap match dock ~72–96px).

### Write-in pages (frames, comprehension, ideas)

- Use `chromeColumn(p)` then a **CSS grid** (`gridTemplateRows: 1fr 1fr…`) with
  `flex: 1 1 0%` on the column — plain `fillBody` + `justifyContent: stretch` does
  **not** reliably grow cards after `applyPackBg` injects an absolute BG.
- Each card: column flex, prompt fixed, **dashed write/draw region `flex:1`**.
- Bigger prompt type (frames ~40px, ideas ~36px, comp ~34px).

### Story (solo / 30-min)

- One flowing paragraph (not poem line breaks).
- Scale type up when text is short (~56px+); card fills remaining height.
- **Page background = quiet flat** (H2). Never put story body text on a full-bleed place scene.
- **Picture = separate zone** — side panel or solo banner (`[data-story-art]`); reading card stays pale. Place immersion goes in that panel (generated StoryArt or a future scene fill), not under the type.

### King activity dock (make-a-face, etc.)

- Prefer **more choices** when the dock has room — two rows if `dock.h >= ~120`.
- Size pieces with `PropBank.sizeFor` and `relativeScale: 1` for dock (manifest
  scales like 0.15 crush grab size). Never distort aspect (H7 ±0.02).
- Skip ultra-wide curated parts (brows ~aspect 5+) — they become postage stamps
  (M10). Mouths ~3.2 are the practical upper bound for dense docks.
- Face kit list lives in `ROLEPLAY_DOCK_FACE` in `edbActivities.js`.

### Title cutouts

- Decoration generated on black must be **keyed to real alpha** before use.
- A black (or white) rectangle around title faces = unkeyed PNG, not CSS.

## Verification habits

1. Bake: `node scripts/preflight-boards.cjs --cases=<id>` → `tmp/board-bg-verify/<id>/`.
2. Read `contact.jpg` then specific `page-*.jpg`.
3. **Do not trust vague “empty bottom” image descriptions alone** — if unsure,
   sample the JPEG (white-card row coverage). Face ideas page filled to ~y=560
   while a description still claimed 25% dead space.
4. Hard fail H7/M10 after dock changes → fix aspect / drop too-wide props before
   shipping more density.

## Code map

| Concern | Where |
|---------|--------|
| DOM pages / chromeColumn / warm coloring | `public/lib/renderLessonPages.js` |
| Topic coloring outlines (A1/A2) | `public/lib/coloringOutlines.js` |
| Zones, `dockReservePx`, `heroStage` dock | `public/lib/edbLayout.js` |
| `matchDock`, `heroProp`, `ROLEPLAY_DOCK_FACE` | `public/lib/edbActivities.js` |
| Quiet house flats / title pin | `public/lib/sceneBackgrounds.js`, `docs/bg-theme-sets.md` |
| Story panel art (not page BG) | `docs/story-art.md`, `applyStoryArt` in `renderLessonPages.js` |
| Quality loop | `.cursor/skills/board-quality-loop/SKILL.md` |
| King stage product rules | `.cursor/skills/king-stage-edb/SKILL.md` |

## Anti-patterns

- Bottom `reserveDock` on vocab (crushes word cards into a top strip).
- Centering one thin card in `flex:1` with no secondary activity.
- Scaling dock `w`/`h` independently (breaks H7).
- Shipping black-field title art “for now”.
- Leaving write-in pages as short cards with huge purple margins below.
- Full-bleed place scenes under story reading text (use the art panel instead).
