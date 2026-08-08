# gptbrief

type: brief command (read-only scan → emits a paste-ready ChatGPT / Manus brief)
repo: `C:\dev\PPT-Lesson-Maker-for-Classin`

Invocation: `/gptbrief`
Output: a dated brief file `.cursor/loops/gptbrief-<date>.md` listing the packs
worth sending out-of-house, each with a **paste-ready prompt** built from the
default template below.

## Purpose

`/gptbrief` is a **read-only** scan that decides what (if anything) is worth
handing to an external image model (ChatGPT) or an agentic batcher (Manus)
instead of generating in-house. It emits prompts the human can paste directly.

The only thing that belongs in a brief is a **coherent set that must share one
style** (a face kit, an emotion-face set, a themed dressing pack). Single props,
backgrounds, and vocab icons stay in-house — say so with a reason. See the dated
output for how the routed-in-house / excluded section reads.

## Scan surfaces (read-only)

- `.cursor/loops/*` (assetscout, assetgap, story-art, manus/self loops)
- `docs/content-wishlist.md`, `docs/asset-wishlist.md`, `docs/face-kit.md`
- `public/assets/09_props/manifest.json` + `npm run assets:prop-demand`

## Default prompt template (what gptbrief emits)

Every emitted prompt — single or sheet — must carry these **hard rules
verbatim**. They are the difference between a keyable sheet and a wasted round
trip. Do not soften or drop any line.

> HARD RULES (every tile):
> - Pure solid BLACK field, #000000, edge to edge — no grey, no grid, no graph
>   paper, no gradient, no vignette, no per-cell frame or gutter line.
> - Exactly ONE object per tile. Nothing else in the tile, not even a small
>   companion item. Nothing crosses a tile/cell border.
> - Flat matte vector illustration, POSITIVELY anchored as: "flat 2-tone vector,
>   Material Design icon style, orthographic front view" — two flat colour values
>   per surface (a base tone + one darker shade), hard colour boundaries, no
>   blending. (Positive style anchoring pulls harder than a list of don'ts.)
>   Still forbid: NO gloss, NO 3D product render, NO photoreal, NO heavy black
>   outline, NO drop shadow, NO cast shadow.
> - Centred, with an even margin (~8% each side); the whole object inside its
>   tile including thin parts (handles, straps, wheels, tails, antennae).
> - ZERO text: no letters, numbers, labels, cell titles, captions, watermarks,
>   or brand/company logos — and NO real brand marks (no Mastercard / Apple /
>   Nike-type marks) anywhere on the sheet or on any object.
> - Consistent STYLE across the set — same line weight, shading approach and
>   lighting — but EACH object keeps its OWN natural, distinct colours (a banana
>   is yellow, an apple red). Do NOT force the whole sheet into a single palette:
>   "two flat values per surface" applies PER OBJECT, not per sheet. (Forcing one
>   palette turned a whole transport sheet mono-gold.)
> - No near-black or pure-white as an object's MAIN body colour — it vanishes on
>   the black field or blows out on white boards. Give dark/white subjects a
>   coloured or medium-grey body (a "black" cat → dark grey; a "white" ghost →
>   pale blue). Near-black interiors also trip the importer's C6 hole gate.
> - Vehicles / wheeled objects: draw the wheels AND undercarriage as MEDIUM
>   GREY, one connected solid base, never near-black (near-black wheels key out
>   and split the base — the importer's C5 gate then rejects it).
> - Concrete, recognisable B1 nouns — real objects a child would name, beyond
>   emoji basics. No abstract glyphs, no icon-of-an-idea.
> - Export at MAX resolution. Target a sheet ≥2048px on its long side so each of
>   16 tiles is ≥512px after slicing. Bigger is always better; never downscale.
> - Don't hyperfixate. If a tile won't come out clean after a try or two, SKIP it
>   and keep the rest — a 14/16 sheet is fine. Don't loop perfecting stubborn
>   tiles; the missing few can be topped up in-house or on the next sheet.

### Variant A — single object

Use when the gap is one prop that still wants to match the kit's style.

```
[HARD RULES block above]

OBJECT: <one concrete B1 noun, its angle, its one body colour, its neutral/grey
fittings, and what "empty" means for it if it's a container>

One object, centred, ~8% margin, complete and inside the frame. Pure black
field, nothing else. Export at max resolution (≥1024px square, larger if you can).
```

### Variant B — batch contact sheet

Use when a **coherent set** must share one style (the whole reason to send out).

```
[HARD RULES block above]

Draw <N> separate props for <purpose>, arranged in a clean <R> rows × <C>
columns grid. One prop per cell, its own margin inside its cell, nothing
crossing a cell border. Same line weight, palette and lighting across all <N>.
Props (reading order, left→right then top→bottom):
  1. <prop> … N. <prop>
Export as ONE PNG at maximum resolution (see the ≥2048px rule above).
```

### Variant C — batch (4×8, high-quality 4K — 32 tiles)

Use when the 4K model is available (`nano-banana-pro` / `nano-banana-2`) and you
want to DOUBLE the props per image at the same keying quality. Requires a TALL
canvas so 32 sliced tiles still land ≥512px each. If only the default /
`gpt-image-2` model is available, **fall back to Variant B (4×4, 16 tiles)** — do
NOT run 4×8 at 2048px, the tiles drop below the ~512px keying floor.

```
[HARD RULES block above]

MODEL / RENDER SETTINGS:
- quality="high", model nano-banana-pro (fallback nano-banana-2).
- aspect_ratio: 9:16 (or "auto" + "ultra-tall portrait"), long side ≥4096px so
  each of 32 tiles is ≥512px after slicing. NEVER run this grid at 2048px.

Draw 32 separate props for <purpose>, arranged in a clean 4 columns × 8 rows
grid on a pure solid #000000 field. One prop per cell, its own ~8% margin inside
its cell, nothing crossing a cell border. Every prop is a flat 2-tone vector,
Material Design icon style, orthographic front view — two flat colour values per
surface (base tone + one darker shade), hard boundaries, no blending, no gloss,
no 3D, no photoreal, no heavy outline, no drop/cast shadow.

Consistent STYLE across all 32 (same line weight, shading, lighting) but EACH
object keeps its OWN natural, distinct colours — "two flat values per surface"
applies PER OBJECT, not per sheet. No near-black or pure-white as any object's
MAIN body colour; give dark/white subjects a coloured or medium-grey body.
Vehicles/wheeled objects: wheels AND undercarriage as ONE connected MEDIUM GREY
base, never near-black.

ZERO text anywhere — no letters, numbers, labels, captions, watermarks, or
brand/company logos, and no real brand marks on any object.

Props (reading order, left→right then top→bottom):
  1. <prop> … 32. <prop>

Don't hyperfixate: if a tile won't come out clean after a try or two, SKIP it
and keep the rest — a 30/32 sheet is fine. Export as ONE PNG at maximum
resolution (long side ≥4096px).
```

### Resolution ↔ grid tradeoff (state it in the brief)

Sliced tiles inherit a fraction of the sheet's pixels, and the importer refuses
to resample above the tile it came from. So grid size is bounded by what the
generator will actually export. The caps below are **confirmed** (Manus asked &
answered — see the Manus note), not guessed:

- **Default quality / `gpt-image-2`:** long side caps at **~2048px**.
- **High quality (`quality="high"`) + `nano-banana-pro` / `nano-banana-2`:** up
  to **4096px** long side (nano-banana-pro sometimes up to 5632px).
- **Keying floor stays ~512px per tile** — the importer won't resample above the
  slice it came from.

Decision rule:

- **Default / `gpt-image-2` (2048px cap):** use **4×4 (16 tiles)** on a
  square/near-square canvas → ~512px/tile. This is the **safe default**.
- **High quality + `nano-banana-pro` / `nano-banana-2` (4096px):** use **4×8 (32
  tiles)** on a **TALL** canvas (`aspect_ratio` 9:16, or `auto` + "ultra-tall
  portrait", long side ~4096px) → still ~512px/tile, **doubling props per image
  at the same keying quality**. This is the preferred efficient unit whenever the
  4K model is available.
- **Never let the grid outrun the resolution.** 6×6 at 2048, or 4×8 at 2048,
  drops tiles below the ~512px floor — reject. When unsure, prefer the smaller
  grid.
- **Exact pixel dims** (e.g. 2048×4096) if a target requires them: generate at
  the nearest aspect preset (9:16 for tall) and PIL/Pillow resize/extend as a
  post-step — deterministic, no quality loss.

### Manus (agentic) note

Manus is not a single-shot image model — it can **batch several themed sheets in
one run** and **self-check each tile and regenerate the failures** before handing
back. For a large multi-theme gap (e.g. a face kit + an emotion set + a dressing
pack), route it to Manus with the same hard rules and let it iterate on failing
tiles, rather than paying a human round trip per sheet in ChatGPT. Still eyeball
the returned tiles as teacher + student — Manus's self-check catches geometry,
not style drift or faint micro-text.

Validated Run-5 findings (fold these into the Manus instructions):

- **Batch cap is HARD at 5 images per `generate_image` call.** There is no
  workaround — don't ask Manus for more per call. Plan sheets around this (one
  4×4 sheet is one image; multiple sheets = multiple calls).
- **Single-call grid vision check.** Send the WHOLE sliced sheet in ONE vision
  request and have Manus return JSON of only the failing cells by grid index
  (e.g. `{"fails":[3,11]}`) — not a per-tile call. This is ~16× cheaper than
  checking each tile separately and is confirmed working.
- **Division of labor — the importer is the real backstop.** Our
  `assets:import-sheet` (gates C1/C6/C7) already enforces background purity,
  holes, and margins. So Manus's vision check should NARROW to only what keying
  can't catch: multi-object tiles, brand/IP logos, and gross 3D gloss. Don't have
  Manus re-check background purity or margins — the importer does that harder.
- **Model tier: `default` quality is enough** for flat-vector art. The PROMPT is
  the stronger lever, not the model — don't pay for a pro tier.
- **Success metric = "tiles that survive our importer,"** not "tiles that pass
  Manus's own vision check." Judge a Manus run by how many cleanly key through
  `assets:import-sheet`, not by Manus's self-reported pass rate.

Confirmed canvas limits (asked & answered — don't re-ask next run):

- **Model → max resolution (long side):** `gpt-image-2` = 2048px; default
  quality mode ≈ 2048px; `nano-banana-2` = 4096px (4K); `nano-banana-pro` = up to
  4096px, sometimes up to 5632px. Reach the 4K tiers with `quality="high"`.
- **Non-square is supported** via aspect presets — landscape 3:2 / 4:3 / 16:9 /
  21:9; portrait 2:3 / 3:4 / 4:5 / 9:16; square 1:1. Tallest preset is 9:16
  (0.5625). `aspect_ratio="auto"` + "ultra-tall portrait" in the prompt gets close
  to arbitrary shapes (near 1:2).
- **Exact pixel dims** (e.g. 2048×4096) are achievable via post-processing:
  generate at the nearest preset (9:16), then PIL/Pillow resize/extend —
  deterministic, no quality loss.
- **Takeaway:** high quality + a tall canvas unlocks **4×8 / 32-tile sheets**
  (Variant C) at the same ~512px/tile keying quality, doubling props per image.
  Default / `gpt-image-2` stays on 4×4 / 16 tiles.

## Policy

Read-only. `/gptbrief` never writes assets, never edits the manifest, never
touches producer/gate/fixture files. It emits a dated brief and nothing else.
Anything that can be done in-house (single prop, background, vocab icon) is
routed in-house with a reason, not sent out.
