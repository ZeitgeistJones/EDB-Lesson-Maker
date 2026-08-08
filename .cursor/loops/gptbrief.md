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
> - Flat matte vector illustration. NO gloss, NO 3D product render, NO
>   photoreal, NO heavy black outline, NO drop shadow, NO cast shadow.
> - Centred, with an even margin (~8% each side); the whole object inside its
>   tile including thin parts (handles, straps, wheels, tails, antennae).
> - ZERO text: no letters, numbers, labels, cell titles, captions, watermarks,
>   or brand logos anywhere on the sheet or on any object.
> - One consistent, soft, muted palette across the whole set (one coherent kit).
> - Vehicles / wheeled objects: draw the wheels AND undercarriage as MEDIUM
>   GREY, one connected solid base, never near-black (near-black wheels key out
>   and split the base — the importer's C5 gate then rejects it).
> - Concrete, recognisable B1 nouns — real objects a child would name, beyond
>   emoji basics. No abstract glyphs, no icon-of-an-idea.
> - Export at MAX resolution. Target a sheet ≥2048px on its long side so each of
>   16 tiles is ≥512px after slicing. Bigger is always better; never downscale.

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

### Resolution ↔ grid tradeoff (state it in the brief)

Sliced tiles inherit a fraction of the sheet's pixels, and the importer refuses
to resample above the tile it came from. So grid size is bounded by what the
generator will actually export:

- **4×4 (16 tiles)** needs a **≥2048px** sheet to land ≥512px per tile. Ask for
  it explicitly, and reject a sheet that comes back at 1024px.
- If the generator **caps around ~1024px**, drop to **3×3 (9 tiles)** — a 1024px
  3×3 slice is ~340px per panel, which still keys and draws fine at dock size
  (96–220px). Better nine clean big tiles than sixteen soft ones.
- Never let the grid outrun the resolution. When unsure, prefer the smaller grid.

### Manus (agentic) note

Manus is not a single-shot image model — it can **batch several themed sheets in
one run** and **self-check each tile and regenerate the failures** before handing
back. For a large multi-theme gap (e.g. a face kit + an emotion set + a dressing
pack), route it to Manus with the same hard rules and let it iterate on failing
tiles, rather than paying a human round trip per sheet in ChatGPT. Still eyeball
the returned tiles as teacher + student — Manus's self-check catches geometry,
not style drift or faint micro-text.

## Policy

Read-only. `/gptbrief` never writes assets, never edits the manifest, never
touches producer/gate/fixture files. It emits a dated brief and nothing else.
Anything that can be done in-house (single prop, background, vocab icon) is
routed in-house with a reason, not sent out.
