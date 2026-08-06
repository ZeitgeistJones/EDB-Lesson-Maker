---
name: king-stage-edb
description: >-
  Build ClassIn activity pages where one huge hero prop (king/stage EDB) is the
  play surface and a dock of handheld roleplay tools kids drag onto it — not
  vocab emoji strips or template card stacks. Use when the user says king EDB,
  hero stage, roleplay dock, open-mouth patient, trampoline hero, or wants the
  activity prop to dominate the page.
---

# King-stage EDB (hero roleplay)

When the activity’s job is **play on one big prop**, the page is a stage — not a
worksheet with a side illustration.

## Product rules (learned from dental)

1. **King owns the page** — hero fills most of the board; chrome is a short title
   + one hint. No activity template cards on king pages.
2. **Play surface > standing character** — prefer open-mouth patient /
   trampoline / similar over a thin standing figure. Standing dentists belong in
   the *dock* as cast, not as the stage.
3. **Dock = grabable roleplay tools** — real prop cutouts kids drag onto the
   king. Never vocab emoji / word tiles for this recipe.
4. **Quiet BG under the king** — calm flat wash (`clinic-cool`, etc.). Busy
   place scenes fight the EDB.
5. **Judge dock art at dock size** — if a prop reads as the wrong object when
   small (dental bib → “purse”), drop it. Clarity beats completeness.
6. **Cross-examine the whole prop bank** — scan `09_props` (and themed packs)
   for useful play pieces outside the topic sheet (apple / cup / milk for
   dental). Missing sweets (lollipop) → `docs/asset-wishlist.md`, don’t invent.
7. **Preview before declaring done** — bake a single activity JPEG and Read it.
   Code coords can be correct while eyes still see a gap.

## Implementation map

| Piece | Where |
|-------|--------|
| Zones (`heroStage`: artSafe y≈0, thin bottom dock) | `public/lib/edbLayout.js` |
| Recipe + dock lists + stage hero sizing | `public/lib/edbActivities.js` → `heroProp`, `findHeroProp`, `roleplayDockProps` |
| Minimal chrome when `recipeId === 'heroProp'` | `public/lib/renderLessonPages.js` → `makeActivity` |
| Prop resolve / `sizeFor` hardCap | `public/lib/propBank.js` |
| Dental dock prefs + matrix | `ROLEPLAY_DOCK_DENTAL` + `docs/dental-unit-matrix.md` |
| Face kit + dock prefs | `ROLEPLAY_DOCK_FACE` + `docs/face-kit.md` |
| Previews | `preview-dental-hero.cjs` / `preview-face-hero.cjs` → `tmp/*-hero-preview.jpg` |

`buildBoardPlan` must create the activity page as **`heroStage`** when the
assignment is `heroProp` (not the default side-art `activity` zones).

## Stage heroes (examples)

| King key | Theme tokens | Dock list |
|----------|--------------|-----------|
| `dental-kid-open-mouth` | dentist, tooth, floss, cavity… | `ROLEPLAY_DOCK_DENTAL` |
| `face-blank` | face, hair, eyes, nose, make-a-face… | `ROLEPLAY_DOCK_FACE` |
| `trampoline` | trampoline, bounce… | themed objects / tools |

## Stage hero vs floor hero

| Role | Use |
|------|-----|
| `stageHero` | King pages — keep recipe x/y (incl. negative crop). **Do not** put in `STAND_ROLES`. |
| `heroPart` | Groundable heroes (trampoline) — may stand on scene `groundY`. |

Preview/export re-ground `heroPart` via `SceneBackgrounds.standRow` on scenes.
A king forced through `heroPart` on a flat still looked “small with a weird top
gap” until role was `stageHero` + explicit crop.

## Sizing / stageFit gate (required)

Do **not** copy dental flush-crop onto the next king. Each hero opts in via
manifest `stageFit`:

| `stageFit` | When | Behavior |
|------------|------|----------|
| `fit` (default) | Full silhouette still in the PNG (`face-blank`, trampoline) | ~92% of stage height, centered, `bleed:'edge'` — crown stays on-board |
| `flush` | Source art is already a cropped close-up (`dental-kid-open-mouth`) | Overscale + negative `y` + `bleed:'crop'` so opaque content meets the page top |

Set `stageFit` when writing the manifest row. Missing → `fit`. Recipe reads
`prop.stageFit` only — no key regexes.

1. `relativeScale: 1` clone for sizing.
2. `sizeFor(..., { hardCap })` — house `MAX_PROP_H` (300) is too small for kings.
3. Confirm by Reading the preview JPEG — not only by printing piece coords.

## Roleplay dock curation

**Include:** handheld tools, face parts (eyes/mouth/hair), food/health contrasts,
reward stickers, one cast character (dentist).

**Exclude:** furniture (chair, cabinet, tray unit), scene dressing, chrome
covers, anything ambiguous at ~88px.

**Pattern for a new topic:**

```text
1. List theme props already tagged in manifest.
2. Grep full 09_props for cross-pack objects a kid would drag in play.
3. Curate an explicit KEY list (don’t rely on tag score alone — dentist aliased
   to standing character and stole the stage once).
4. Cap ~9–10 dock pieces; prefer clear silhouettes.
5. Wishlist true gaps (e.g. lollipop) instead of near-misses.
```

## Related

- Quality dual-lens: `.cursor/skills/board-quality-loop/SKILL.md`
- New cutouts: `.cursor/skills/prop-cutouts/SKILL.md`
- Dental inventory: `docs/dental-unit-matrix.md`
- Gaps: `docs/asset-wishlist.md`
