# Asset bank audit — props pack

Pass over `public/assets/` looking at what the board recipes actually need,
what the bank has, and how good it is. Focus is the generated prop pack
(`09_props/`), because that is the newest and the one the collage recipes
(LT1 in the craft roadmap) are waiting on.

## Inventory

| Pack | Path | Count | Style |
|---|---|---|---|
| Characters (Open Peeps) | `01_characters/` | 20 + 8 | CC0 cutouts |
| Scene placeholders | `02_scenes-backgrounds/` | 8 | project SVG gradients |
| Vocab icons | `03_vocab-icons/` | 6 | project SVG |
| Decoration / UI | `04_decoration-ui/` | 27 | illlustrations.co MIT |
| Source SVG | `05_source-svg/` | 68 | upstream kits |
| Board-ready PNG | `06_board-ready-png/` | 37 | rasterised characters/scenes |
| Vocab pack (Twemoji) | `07_vocab-pack/` | 170 | one consistent style |
| Backgrounds | `08_backgrounds/img/` | 44 (40 scenes + 4 flats) | generated, 1280×590 |
| Props | `09_props/img/` | 26 | generated + project vector |

## What was wrong with the prop pack

The pack shipped as "cutouts". They were not cutouts.

1. **The black matte was still baked in.** All 11 PNGs were 100% opaque with
   40–98% of their pixels near black. Dropped onto `flat_whiteboard.png` or
   any scene, each prop would have landed as a black rectangle. This is the
   whole reason the pack could not be wired into a recipe yet.
2. **Crops kept the matte margin, unevenly.** Panels came out 640×426,
   640×480 and 640×494 with the object off-centre inside the black (the
   reward jar sat well right of centre). Layout code placing by rect gets a
   different visual centre per prop.
3. **A generated dark halo at the object edge.** Even after keying, the
   1–2px blend band between object and matte carries black, which reads as a
   dirty outline on a light board unless it is decontaminated.
4. **No pipeline.** The sheets were cut by hand somewhere outside the repo,
   so nothing was reproducible and nothing checked the result.
5. **Recipe coverage holes.** `edbActivities.js` draws sort bins, hide-and-seek
   covers, reward flaps, build slots and answer strips as flat canvas
   rectangles (`solidPng`, `slotGhostPng`). The pack had one bin, one slot pad
   and no cover, flap, strip, chip or feedback token — so the recipes could
   not use it even once the alpha was fixed.

## What changed

- **`tools/assets/cut_grid.py`** — the missing half of the workflow. Slices a
  2×3 sheet into panels, keys the matte by flood fill *from the border*
  (interior linework and shadows survive; a global threshold would punch
  holes through the art), softens and colour-decontaminates the edge band,
  trims to the object, re-pads to an even 4% margin, downscales, and prints
  QC per prop. It flags the exact defect above: `NO-CUTOUT (matte still
  baked in)`.
- **All 11 generated props re-cut through it.** They are now true RGBA
  cutouts, trimmed and evenly padded. Pack size dropped from 1.1 MB to
  644 KB on the way. The black-matte originals stay in git history at
  `7b61e67` if the keying ever needs redoing at a different threshold.
- **15 geometric props authored** via `tools/assets/make_flat_props.py`,
  matched to the generated pack's palette and edge treatment. These are the
  props the recipes need to align to each other — a sort-bin *pair* in two
  colours with one silhouette, a slot pad and its wide variant at the same
  corner radius, blank tokens that stay blank. Image models do not hold that
  kind of consistency, and the props are shape work, so they are vector and
  regenerable rather than generated.
- **Manifest rebuilt** with `size`, `alpha` and `source`
  (`openai-grid` | `project-vector`) per prop, so a consumer can tell which
  pipeline a prop came from.

## Roles now covered

`answerStrip · arrow · correct · cover · dockRail · incorrect · miniBoard ·
orderPad · orderSlot · orderToken · reward · rewardContainer · rewardFlap ·
shelf · sortBin · speech · sticky · thought · tray · wordCard · wordChip`

Every recipe in `edbActivities.js` now has real art for the pieces it fakes
with canvas rectangles. Swapping the recipes over is a separate change —
this pass is the bank, not the renderer.

## Still missing (needs generation, not vector)

Prompt sheets are written and ready to paste in `docs/asset-prompts/`.
These are illustration-heavy objects where a hand-drawn vector would look
worse than a generated one:

| Sheet | Objects | Why the board needs them |
|---|---|---|
| `props-01-containers.md` | toy box, open backpack, suitcase, shopping basket, lunch tray, mailbox | drag-into targets for sort and put-away activities |
| `props-02-classroom.md` | flip-chart easel, pocket chart, cubby unit, pupil desk, classroom door, blank clock face | classroom-vocabulary and daily-routine pages |
| `props-03-reward-game.md` | treasure chest, gift box, medal ribbon, blank dice, spinner board, blank ticket | reward reveal and game-turn pages |
| `props-04-scene-parts.md` | tree, cloud, sun, small table, chair, rug | `buildScene` currently drags emoji into slots; these are the real set pieces |
| `scenes-01-places.md` | subway platform, hotel lobby, office, back garden, toy store, pet shop | scene gaps against common ESL lesson themes |
| `scenes-02-places.md` | gas station, snowy street, birthday party room, museum, laundromat, sports stadium | same |

## Workflow from here

```bash
# 1. generate a sheet from docs/asset-prompts/props-01-containers.md
# 2. cut it
python3 tools/assets/cut_grid.py ~/Downloads/sheet.png -o public/assets/09_props/img \
    --names toy-box backpack-open suitcase shopping-basket lunch-tray mailbox
# 3. check the QC line for each prop, then add manifest entries
```

Reject a panel and regenerate it if `cut_grid.py` reports `NO-CUTOUT`
(the matte was not pure black), `coverage > 0.9` (the object is jammed
against the panel edge — the 5% margin in the prompt was ignored), or
`soft=0` (no antialiasing, so the sheet was upscaled from something small).
