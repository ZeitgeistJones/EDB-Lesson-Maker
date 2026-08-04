---
name: prop-cutouts
description: >-
  Generate one ClassIn board prop at a time on a black field, key it to a real alpha
  cutout with scripts/import-prop.mjs, map each failed gate to its specific prompt
  correction, then look at the QA sheet as both teacher and student before writing a
  manifest row. Use when the user asks for a new board prop, a prop cutout, more
  collage/activity pieces, or says the prop pack is missing something.
---

# Prop cutouts

One prop per turn. Do not batch.

## Rule zero

**Never request a grid, a contact sheet, or more than one prop in one image.**
The importer keys one silhouette out of one frame. Six legacy props in this pack
were cut out of contact sheets and none of them can be keyed today, because a
neighbouring prop's edge is still inside the frame.

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

6. **Then look at it.**

   ```bash
   npm run assets:prop-qa -- --only=<slug>
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
