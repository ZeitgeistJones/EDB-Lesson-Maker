# Scene sheet 01 — place backgrounds

Six places common in ESL lesson themes that the 40-scene pack does not cover.
Scenes are generated **one at a time** at 1280×590 — a grid does not leave
enough pixels for a room to hold together.

After generating, measure the ground line and add the entry to
`public/assets/08_backgrounds/manifest.json`:

```json
"subway-platform": { "file": "subway-platform.png", "groundY": 000,
                     "category": "transport", "tags": ["subway","train","station","platform"] }
```

`groundY` is the pixel row where the standing surface begins; a piece's BASE
sits there. Get it wrong and every character on that page floats or sinks.

| Slug | Category | Tags |
|---|---|---|
| `subway-platform` | transport | subway, metro, station, platform |
| `hotel-lobby` | commercial | hotel, lobby, reception, travel |
| `office` | work | office, work, desk, job |
| `back-garden` | home | garden, backyard, outdoor, home |
| `toy-store` | commercial | toys, shopping, store, play |
| `pet-shop` | commercial | pets, animals, shopping, store |

---

## Shared prompt frame

Use this frame for each of the six, swapping in the scene line:

Generate ONE illustrated background for an interactive English lesson whiteboard. Exactly 1280×590 pixels, landscape.

Style: clean flat vector illustration, soft muted colors, gentle even lighting, simple shapes with light shading — like a modern children's textbook. No photorealism, no harsh shadows, no heavy outlines. No people, no animals, no text, letters, numbers, logos, signs, price tags, or writing of any kind anywhere in the image.

Composition rules, these matter more than detail:
- There is a clear horizontal ground plane (floor, pavement, platform) running across the image. The far wall or horizon sits above it.
- The CENTRE of the image, from roughly 20% to 80% of the width, is deliberately EMPTY — a plain wall or open floor with nothing standing in it. Draggable lesson pieces are placed there, so anything drawn in that band will be covered up.
- All furniture, fixtures and detail sit in the LEFT THIRD and RIGHT THIRD only, framing the empty centre.
- Nothing crosses the middle: no dividing line, no central table, no doorway in the centre.
- Colors stay light enough that white and dark text placed on top stays readable.

Scene: **[scene line]**

## Scene lines

1) **subway-platform** — an underground subway platform: tiled platform floor running across the whole width, a train carriage side with closed doors along the left third, a bench and a blank departure board on the right third, tiled wall behind, empty centre.

2) **hotel-lobby** — a small hotel lobby: polished floor across the width, a reception counter with a bell and a plant on the left third, an armchair, a luggage trolley and a lamp on the right third, plain warm wall behind, empty centre.

3) **office** — a simple open-plan office: carpeted floor across the width, a desk with a monitor, chair and mug on the left third, a filing cabinet, plant and blank wall board on the right third, plain wall behind, empty centre.

4) **back-garden** — a home back garden: lawn running across the whole width with a low fence line behind it, a small tree and flower bed on the left third, a garden table with two chairs and a watering can on the right third, soft sky above the fence, empty centre lawn.

5) **toy-store** — a toy shop interior: wooden floor across the width, a shelf unit with simple blank-faced boxes and balls on the left third, a stack of crates and a hoop stand on the right third, plain wall behind, empty centre. No brands, no character toys, no faces on the toys.

6) **pet-shop** — a pet shop interior: tiled floor across the width, a stack of empty glass tanks and a bag pile on the left third, empty cages and a shelf of bowls on the right third, plain wall behind, empty centre. No animals in the tanks or cages.
