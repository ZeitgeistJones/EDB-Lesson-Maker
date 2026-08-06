---
name: prop-cutouts
description: >-
  Generate ClassIn board props on a black field — one at a time in-house for targeted
  work, or many at a time from a ChatGPT contact sheet (3×3, 4×4, 4×6 / 6×4) for bulk —
  key them to real alpha cutouts with scripts/import-prop.mjs, map each failed gate to
  its specific prompt correction, then look at the QA sheet as both teacher and student
  before writing manifest rows. Use when the user asks for a new board prop, a prop
  cutout, more collage/activity pieces, or says the prop pack is missing something.
---

# Prop cutouts

## Pick the route first

**Targeted work — generate in house, one prop per image.** One missing prop, or a
retry after a gate failure. No human round trip, so generate → import → read the
gate → regenerate is a tight loop. This is the default, and it is the only route
for a retry.

**Bulk — ask the user for a ChatGPT contact sheet.** Filling a whole category
at once: desk objects, playground pieces, face parts. Prefer **4×4 (16)** or
**6×4 (24)** when bang-for-buck matters; **3×3 (9)** is still fine for tight
themes. Props drawn in one pass match each other better than many drawn
separately. Costs a round trip through the user, so never use it to fix one prop.

`--grid` is **rows×cols** (e.g. a sheet with 6 rows of 4 features is `--grid=6x4`,
not `4x6`). ClassIn can stretch small cutouts; sliced cells under 512px are OK.

A sheet must be **one prop per cell** on the same solid black field, each with
its own margin inside its cell, and nothing crossing a cell boundary. Do **not**
ship labeled multi-packs (many beards in one cell with a title) — the importer
keys the whole collage. Re-prompt those as one-item sheets. The importer finds
the real gutters instead of assuming equal pitch, so a row drawn slightly
oversized still slices correctly — but two props that meet with no black between
them cannot be separated.

The six legacy props in this pack that cannot be keyed today came off old contact
sheets that had none of that structure — a neighbour's edge was already inside
the frame. A sheet is a supported input; a crowded sheet is not.

## Procedure

1. **Read [`docs/prop-style-lock.md`](../../../docs/prop-style-lock.md).** It is
   the prompt. Use its style lock, one `PROP:` paragraph (or write a new one in
   the same shape), the composition lines, and its negative block — in that
   order.

2. **Generate one image.** Request 1:1 aspect ratio and pass an explicit
   `filename`. The image tool honours the filename, and that is how you find the
   output afterwards.

3. **Find it.** Output lands in
   `%USERPROFILE%\.cursor\projects\c-dev-PPT-Lesson-Maker-for-Classin\assets\<filename>`.
   `--latest` picks the newest PNG in that folder, which is the one you just
   made.

4. **Import it.**

   ```bash
   npm run assets:prop -- --latest --name=<slug> --role=<role> --tags=a,b,c \
     --scale=<0.1-1.0> --anchor=<bottom|top|center> [--components=<n>]
   ```

   `--scale` and `--anchor` are judgement calls, not defaults to skip. `--scale`
   is real-world size against the biggest props (door 1.0, chair 0.6, backpack
   0.35, pencil 0.1) so a pencil and a bookshelf are not both drawn at 96px.
   `--anchor` is `bottom` for anything resting on the floor, `top` for anything
   hanging, `center` for anything floating — `SceneBackgrounds.standOn` puts a
   piece's base on `groundY`, which is wrong for a swing or a speech bubble.

   For a sheet, `--sheet` walks every cell of `--grid` in one pass. The lists are
   parallel and in **reading order**, left to right then top to bottom, and
   `--names` must fill the grid exactly:

   ```bash
   npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \
     --names=desk,wall-clock,file-folder,clipboard,supply-caddy,magazine-file,pencil-pot,desk-mat,globe \
     --roles=furniture,timer,container,tool,container,container,container,furniture,object \
     --scales=0.8,0.3,0.25,0.3,0.35,0.3,0.2,0.45,0.35 \
     --anchors=bottom,center,center,center,bottom,bottom,bottom,bottom,bottom
   ```

   `--roles`, `--scales` and `--anchors` fall back to the singular flags wherever
   a list runs short. Each panel prints its own gate block, one bad panel does
   not cost the other eight, and the rows for whatever landed are printed
   together at the end. `--tags` applies to the whole run, so set per-prop tags
   in the manifest afterwards. `--grid` with `--cell=r,c` takes one panel only.

5. **Fix any failed gate at the prompt, then regenerate.** Each gate maps to one
   correction:

   | Gate | What it means | What to ask for next |
   |---|---|---|
   | C1 | an environment was produced instead of a black field (or a colour glow reaches the border) | pure black #000000 edge to edge, flat and unlit, no gradient, no vignette, no floor or surface |
   | C2 | the object is too close to the frame edge | a larger, even margin on every side |
   | C3 | the margin is outside 4-18% | too tight → bigger margin; too loose → fill more of the frame |
   | C4 low | the object is too small in frame | make the object larger, ~80% of the long side |
   | C4 high | the object is too large in frame | make the object smaller, leave ~8% margin |
   | C5 | an unexpected extra object, or a declared component is missing | one object only — or pass the honest `--components=` if the extra shape is a real detached piece like a jar lid |
   | C6 | near-black regions that keying will erase into holes | lighter trim, fittings and shadows; nothing close to black |
   | C7 | edge colour does not match the interior | usually follows a C1 failure — fix the field first |

   On a sheet, C2/C3/C4 are measured against the cell the panel was cut from, so
   a prop drawn small inside a generous cell reads as loosely framed even though
   the art is fine. C1 and C5 failing together usually means a neighbour bled
   across the boundary, which is a sheet defect rather than a prop defect. Read
   the cutout before deciding, and say what you saw if you `--force`.

6. **Then look at it.**

   ```bash
   npm run assets:prop-qa -- --only=<slug>[,<slug>...]
   ```

   **Actually open `tmp/prop-qa.jpg` with the Read tool.** Judge it twice:

   - **As a student** seeing it at 96px in a dock: do I know what this is in one
     glance, without the teacher telling me?
   - **As a teacher** running the page cold: does it read instantly from the
     front of the room, and would I be happy for a parent to see it?

   Check specifically for:

   - a **dark rim** on the light flat — keying left black-blended edge pixels
   - the prop **vanishing on the dark flat** — pale or thin-outlined art
   - **mush at dock size** — fine detail that collapses at 96px
   - **style consistency** with the rest of the pack — no gloss, no photoreal, no
     heavy outlines

7. **Only then add the manifest row** to `public/assets/09_props/manifest.json`.
   The importer prints the row ready to paste, already formatted for the file.

## The visual pass is not optional

The gates measure geometry, black purity, blob count and edge colour. They
cannot see:

- **style drift** — a glossy 3D product render passes every gate
- **faint micro-text** — a tiny illegible luggage tag or book spine passes every
  gate, and baked-in lettering can never be corrected or translated on a board

So a prop that passes 7/7 can still be wrong. Look at it.

## Never

- Never silently accept a failed gate.
- `--force` requires that you have opened the image with the Read tool **and**
  stated in your reply why the gate is wrong about this particular picture. A
  real example: the suitcase measured C5 = 3 shapes because the 3px erosion snaps
  its thin handle posts and wheel housings off the shell in the measurement mask
  only — the actual silhouette is one connected piece with nothing missing.
- Never fake a prop that does not exist. If there is no honest art for a gap, add
  a row to [`docs/asset-wishlist.md`](../../../docs/asset-wishlist.md) with
  status `open` instead.

## Model note

This procedure is mechanical once the style lock is written: generate, import,
read the gate table, regenerate, look. It runs fine on a fast model. Writing a
new `PROP:` paragraph for an object the doc does not cover, or deciding whether a
prop is stylistically out of step with the pack, deserves a stronger one.
