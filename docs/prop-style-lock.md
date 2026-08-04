# Prop style lock

The single source of truth for generating a board prop. Read this before asking
for any new prop art.

Props are board **pieces**: a child drags them around a 1280x590 ClassIn board,
and the same picture gets drawn as small as 96px in a dock. Forty-odd of them
already ship. A new prop that does not match the pack is worse than no new prop,
because it makes the whole board look assembled from scraps.

Ask for **1:1 aspect ratio**. Output arrives at 1024x1024.

## Two routes in

Both go through the same keying, the same C1-C7 gates and the same manifest
fields. Pick by the shape of the job, not by preference.

**A 3x3 contact sheet from ChatGPT, for bulk.** Nine related props in one
generation is the cheapest way to fill a category — all the desk objects, all
the playground pieces — and nine props that were drawn in one pass are more
consistent with each other than nine drawn separately. Costs a human round trip.

**Native in-house generation, for targeted work.** One missing prop, or a retry
after a gate failure. There is no human in the loop, so generate → import →
read the gate → regenerate is a tight loop. Never wait on a sheet to fix one
prop.

### What a sheet must be

- **One prop per cell**, on the same solid black field as a single generation —
  black edge to edge across the whole sheet, no per-cell frame, border, gutter
  line or label.
- **Each prop has its own margin inside its own cell.** The composition rules
  below apply per cell, not to the sheet.
- **Nothing crosses a cell boundary.** This is the one that actually goes wrong:
  a model asked for a 3x3 grid will happily draw a bottom row half a cell too
  large. The importer finds the real gutters rather than assuming exact thirds,
  so a modest drift is absorbed — but two props sharing black with no gutter
  between them cannot be separated, and both will fail.
- **Nine props that belong together.** A sheet's value is consistency; a sheet of
  nine unrelated objects is nine single generations with extra steps.

Sliced props come out **smaller than 512px** — a 3x3 slice of a 1024px sheet is
only about 340px per panel, and the importer refuses to resample above the panel
it came from rather than invent soft pixels. That is fine: a board draws a prop
at 96-220px either way.

## The style lock

Paste this verbatim into every prop prompt.

> Solid pure black background, #000000, edge to edge, no gradient and no vignette.
> Premium educational-app vector illustration with restrained dimensionality:
> soft muted desaturated palette, subtle material cues, gentle shading, minimal
> clean edge definition, soft lighting from the upper left and front. Mostly
> front-on, with a slight three-quarter turn only where it helps recognition.
> Not photorealistic, not a glossy 3D product render, not thick-outlined clip
> art.

The black field is not decoration. The image model has no transparency, so
`scripts/import-prop.mjs` keys the alpha channel out of the black. Any glow,
gradient or second object that reaches the frame border makes the frame
unkeyable, and the importer will refuse it at gate C1. On a sheet, "the frame"
means the cell: a glow that crosses into the next cell fails both of them.

## Recolourability: one body colour, neutral everything else

Give each prop **one dominant body colour**, with trim, fittings, hardware and
accessories in neutrals — grey, charcoal, cream, brown, white.

This is what makes a prop reusable. A colour lesson wants a red balloon and a
purple backpack; a recolour pass remaps a single hue band and leaves the greys
and browns untouched, so the handle stays grey and the shading stays honest. A
prop painted in three saturated colours has no single band to remap: shifting
one of them leaves the others fighting it, and shifting all of them turns the
prop into a monochrome smear.

The importer measures the dominant band and records it as `bodyHue` in the
manifest, so the recolour pass does not have to guess.

**Good:** the suitcase — teal shell, grey telescoping handle, charcoal wheels.
One hue to move, and the hardware still reads as hardware afterwards.

**Bad:** a backpack with a red body, green straps and a blue zip. Nothing can be
recoloured without breaking the other two.

## Composition

Per frame, and on a sheet the frame is one cell.

- Exactly one object in the frame. Nothing else, not even a small companion item.
- Centred.
- The object spans **66-96%** of its long side.
- Roughly **8% safe margin** on every side.
- Nothing touches or crosses the frame edge.
- The object is **complete**: handles, straps, feet, chains, lids, wheels all
  inside the frame. A prop cut off at the edge cannot be fixed later.

## Negatives

Keep this short. A long wall of prohibitions dilutes the description of the
object and makes the model over-serve the negatives instead of drawing the prop.

> One object only, nothing else in frame. No text, letters, numbers, labels,
> logos or brand marks. No people, no animals, no hands. Empty means empty —
> nothing inside or on the prop. Pure black field only, no floor, no wall, no
> surface, no scenery, no shadow cast onto anything.

## PROP paragraphs

Each of these goes after the style lock and before the negative block.

**Empty reward jar** — import with `--components=2`; the lid is a second shape
and C5 will otherwise reject it.

> PROP: A single empty clear glass storage jar standing upright, with its round
> lid lying flat and detached on the ground to the right of it, not touching the
> jar. The jar is completely empty — no stickers, no contents, no liquid. Pale
> cool glass with soft highlights so the glass reads as glass rather than a dark
> hole; the lid is a plain neutral cream.

**Blank rounded cover flap**

> PROP: A single blank rounded rectangular card, like a flashcard cover flap
> seen face-on, with softly rounded corners, a slight thickness at its edge and
> a gentle drop of shading. One flat muted body colour across the whole face.
> Completely blank — no writing, no icon, no border pattern.

**Empty freestanding mini whiteboard**

> PROP: A single small freestanding mini whiteboard on a simple A-frame stand,
> seen front-on. The writing surface is completely blank white. Slim neutral
> grey frame and legs. No writing, no pen, no eraser, no tray contents.

**Empty low activity tray**

> PROP: A single shallow low-sided rectangular activity tray, empty, seen from a
> slightly raised front angle so the inside floor of the tray is visible. One
> muted body colour, soft rounded corners, gentle inner shading. Nothing inside
> it.

**Blank speech bubble**

> PROP: A single rounded speech bubble with one tail pointing down and to the
> left, seen face-on. Soft off-white fill with a thin neutral grey outline that
> is dark enough to read against a pale background. Completely blank inside — no
> words, no punctuation, no dots.

**Empty children's backpack**

> PROP: A single small children's backpack standing upright and seen front-on,
> with the main flap open so the inside is visible and clearly empty. One muted
> body colour for the fabric; straps, buckles and zip pulls in a neutral darker
> shade of the same family. Both shoulder straps fully inside the frame. Nothing
> inside, nothing hanging off it.

## Template for a new prop

Fill the three slots and generate. Then run the import line under it.

```
Solid pure black background, #000000, edge to edge, no gradient and no vignette.
Premium educational-app vector illustration with restrained dimensionality: soft
muted desaturated palette, subtle material cues, gentle shading, minimal clean
edge definition, soft lighting from the upper left and front. Mostly front-on,
with a slight three-quarter turn only where it helps recognition. Not
photorealistic, not a glossy 3D product render, not thick-outlined clip art.

PROP: <one object, its angle, its one body colour, its neutral fittings, and
what "empty" means for it>

Centred, spanning about 80% of the frame's long side, with an even margin of
roughly 8% on every side. The whole object is inside the frame including
<handles / straps / feet / chains / lid>.

One object only, nothing else in frame. No text, letters, numbers, labels, logos
or brand marks. No people, no animals, no hands. Empty means empty — nothing
inside or on the prop. Pure black field only, no floor, no wall, no surface, no
scenery, no shadow cast onto anything.
```

Square aspect ratio, 1:1.

```bash
npm run assets:prop -- --latest --name=<slug> --role=<role> --tags=a,b,c \
  --scale=<0.1-1.0> --anchor=<bottom|top|center> [--components=<n>]
```

- `--role` — what the board uses it for: `container`, `furniture`, `cover`,
  `tray`, `dressPart`, `reward`, `tool`, `object`, and so on. Match an existing
  role in `public/assets/09_props/manifest.json` when one fits.
- `--tags` — the words a picker would search on.
- `--scale` — real-world size against the biggest props, 0.1 to 1.0. A door or
  bookshelf is 1.0, a chair 0.6, a backpack 0.35, a pencil 0.1. This cannot be
  measured from pixels and is nobody's default: set it deliberately, or a pencil
  and a bookshelf both end up drawn at 96px.
- `--anchor` — `bottom` (default, rests on the floor: chair, table, backpack,
  suitcase), `top` (hangs from above: a swing), `center` (free-floating: speech
  bubble, reward star, cover flap). `SceneBackgrounds.standOn` puts a piece's
  base on the scene's `groundY`, which is wrong for anything hanging or floating.
- `--components` — how many separate shapes are legitimate. Default 1. The
  reward jar plus its detached lid is 2.

## Importing a sheet

`--sheet` walks every cell of `--grid` in one pass, reusing one browser. The
lists are parallel and in **reading order** — left to right, then top to bottom —
and `--names` must fill the grid exactly or the run refuses to start. `--roles`,
`--scales` and `--anchors` fall back to the singular `--role` / `--scale` /
`--anchor` (or their defaults) wherever the list runs short.

```bash
npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \
  --names=desk,wall-clock,file-folder,clipboard,supply-caddy,magazine-file,pencil-pot,desk-mat,globe \
  --roles=furniture,timer,container,tool,container,container,container,furniture,object \
  --scales=0.8,0.3,0.25,0.3,0.35,0.3,0.2,0.45,0.35 \
  --anchors=bottom,center,center,center,bottom,bottom,bottom,bottom,bottom
```

Every panel prints its own gate block, one bad panel does not cost the other
eight, and the manifest rows for whatever landed are printed together at the end.
`--tags` applies to the whole run, so set per-prop tags in the manifest
afterwards. `--grid` with `--cell=r,c` takes a single panel out of a sheet when
that is all you want.

Then look at it: `npm run assets:prop-qa -- --only=<slug>` and open
`tmp/prop-qa.jpg`. The gates cannot see style drift or faint micro-text.

## Known failure modes

Observed on real generations, in rough order of how often they bite.

- **Thin extremities running off the top edge.** A swing's chains, an umbrella's
  crook, a lamp's flex. The model composes the bulky part nicely and lets the
  thin part leave the frame. Ask explicitly for the named part to be inside the
  frame.
- **Drift into glossy photoreal rendering.** Especially on hard-shelled objects:
  luggage, jars, plastic bins pick up specular highlights and studio reflections
  and stop matching the pack. Re-state "not a glossy 3D product render".
- **Stray labels and micro-text.** Luggage tags, book spines, screens and trays
  attract tiny illegible lettering. It survives every gate — the gates measure
  geometry and colour, not glyphs — and only a human eye catches it. Anything
  with a flat panel needs checking at full size, not at dock size.
- **Wrong count of small details.** Four wheels asked, three drawn; three sound
  boxes asked, four drawn. Count them by eye before accepting.
- **Ambient light bleeding to the frame border.** A strongly coloured prop
  throws a wash of its own colour across the black field, which reaches the
  border and fails C1. Ask for a flat unlit black field with no glow.
- **A sheet's bottom row drawn oversized.** Asked for a 3x3 grid, the model
  keeps the top rows on pitch and lets the last row grow until its props nearly
  touch. There is usually still a gutter, so the importer recovers — but if two
  props in a row meet, that row has to be regenerated.
