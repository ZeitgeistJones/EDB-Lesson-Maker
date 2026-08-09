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

## Style families: `styleFamily` in the manifest

The style lock above describes one art family, and it is the house style. A
second family now exists in the pack, so every prop carries — or pointedly does
not carry — a `styleFamily` field.

- **absent** — the **matte house style**: soft muted desaturated palette, gentle
  shading, minimal edge definition, a gentle contact shadow. This is the default
  and the target for anything new generated from this document.
- **`"glossy-adventure"`** — glossy game-icon art: strong specular highlights,
  saturated colour, heavy gold trim, chunky three-quarter forms. The nine
  travel/adventure/fantasy props imported from the August 2026 contact sheet
  (`wizard-hat`, `suitcase-vintage`, `lantern`, `telescope`, `game-controller`,
  `tent`, `potion-bottle`, `treasure-chest`, `camera`).

**A board should draw its props from one family.** The two do not mix: put a
matte, desaturated chair next to a lacquered gold-banded treasure chest and the
chair reads as unfinished art rather than as a different object. Mixing them is
the same failure as mixing in a photoreal render, only harder to spot because
each prop is internally consistent.

Absent means matte, so the 50-odd props that predate the field need no edit —
but anything added from here on should set the field deliberately, including
setting it to nothing when the art is matte. Classifying nine props while they
are in front of you costs one field; discovering the need at 150 props means
hand-sorting the whole pack from memory.

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

There is no flag for `styleFamily`: it is a judgement about the finished art, so
it goes into the manifest by hand after the visual pass, and only when the prop
is not matte house style.

## Decorative packs: `decorative` + `decorativeHints`

Some packs are **character / toy / filler art** in a distinct style that would
look wrong on an unrelated lesson — 3D emotion faces (`feelings`), gashapon toy
blobs, and similar. Mark those in **manifest data**, not in `propBank.js`.

**When to set `"decorative": true` on each prop row**

- The art is a **distinct style family** (glossy 3D character, capsule-toy blob,
  etc.) that would clash if a generic dock or story-art picker grabbed it for
  an off-topic lesson (e.g. soccer captions naming “worried” or “toy”).
- Ordinary house-style objects (desk tools, furniture, animals in the matte
  pack) stay **unmarked** — they are fine as generic filler.

**Also extend root `decorativeHints`**

On the same `manifest.json`, add or extend the root map so the lesson topic can
invite the pack:

```json
"decorativeHints": {
  "feelings": ["feeling", "feelings", "emotion", "emotions", "mood", "moods"],
  "gashapon": ["gashapon", "capsule", "toy", "toys", "prize", "prizes"],
  "<pack>": ["<topic-token>", "..."]
}
```

Keys are **pack** names (same as the row’s `pack`); values are topic / word
tokens that mean “this lesson may use this decorative pack.” Without matching
hints, generic selectors skip the pack.

**What is gated vs what is not**

- **Gated:** generic dock fill and story-fallback visual resolve — they skip
  decorative props unless the lesson topic invites the pack via hints.
- **Not gated:** curated / explicit resolves (feelings dock, kit docks, pinned
  keys). Those still work on any lesson that asks for them by name.

**Regression gate**

After merging a decorative pack, run S71:

```bash
node scripts/verify-offtopic-props.mjs
```

It bakes an off-topic lesson that baits emotion/toy words and fails if decorative
art leaks onto the dock or story art.

At merge time (or when editing staged `*-rows.json` before merge), set
`decorative: true` on every row of a decorative pack and update
`decorativeHints` — do not hardcode pack names in producer code.

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

## Vehicles, wheeled objects, and wide props

Two patterns bite hard enough on a specific class of prop to be worth their own
rules. Both come out of real generations that fought the gates.

### Vehicles / wheeled objects: grey the base, keep it one connected solid

Prompt the wheels **and** the undercarriage as **MEDIUM GREY** — one connected
solid base, **never near-black**. A car, bus, train, bike or wagon whose wheels
and chassis-shadow are painted dark charcoal or black reads to the keyer as part
of the black field: the alpha punches straight through the wheels, the base
splits into disconnected islands, and **C5 rejects it as too many components**
(a "blob-split"). Medium grey keeps the base a single solid shape the keyer
holds onto, so the vehicle stays one piece.

- Body: the one dominant recolourable hue (per the recolourability rule above).
- Wheels, axles, undercarriage, wheel wells: **medium grey**, connected, not
  near-black. Grey tyres are correct here — do not "realism" them to black.
- This is the reliable fix for wheeled props failing C5 with a split base.

### Wide props (aspect ratio ≳1.5): a clean single gen is a valid `--force`

Buses, trains, whales, sharks, planes and other long objects (long side ≳1.5×
the short side) routinely land in a **thin C3/C4 source-margin dead-zone**: the
object is composed correctly and centred, but because it is wide, its long side
eats into the 8% margin band and the source-margin gates (C3/C4) read the frame
as too tight — even when the art itself is clean.

This is a **measurement artefact, not a bad generation.** The C1 border check is
the one that actually matters for keyability, and when C1 is clean the frame is
keyable. `scripts/import-prop.mjs` re-pads every output to a uniform **~8%
margin** on export, so a wide prop that only trips C3/C4 comes out correctly
padded anyway.

So: **an otherwise-clean single generation of a wide prop is a valid `--force`
case.** If C1 passes and the only failures are the C3/C4 source-margin gates on
a genuinely wide object, import it with `--force` rather than burning three more
generations trying to buy margin the model can't give a wide shape. Still eyeball
the result — `--force` skips the gate, not the human check.

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
