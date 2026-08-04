# Prop style lock

The single source of truth for generating a board prop. Read this before asking
for any new prop art.

Props are board **pieces**: a child drags them around a 1280x590 ClassIn board,
and the same picture gets drawn as small as 96px in a dock. Forty-odd of them
already ship. A new prop that does not match the pack is worse than no new prop,
because it makes the whole board look assembled from scraps.

Generate **one prop per image**. Never a grid, a sheet, or two props side by
side — the importer keys one silhouette out of one frame, and the legacy props
that were cut out of contact sheets are exactly the ones that cannot be keyed
today (a neighbour's edge is still in the frame).

Ask for **1:1 aspect ratio**. Output arrives at 1024x1024.

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
unkeyable, and the importer will refuse it at gate C1.

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
