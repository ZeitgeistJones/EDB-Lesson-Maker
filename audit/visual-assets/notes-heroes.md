# Hero & King Interactive Target QA Review Notes

Audit Review Version: `2026-08-17-v1`
Reviewed Assets: **2068** across **144** contact sheets

## Summary Counts

- **PASS**: 1341 (64.8%)
- **REVIEW**: 583 (28.2%)
- **REDO**: 144 (7.0%)

---

## 1. Recurring Failure Modes (REDO Findings)

Visual inspection of the 144 contact sheets revealed several distinct systemic failure modes in the hero target generation pipeline:

### A. Background Keying Destruction of White Graphic Elements (`bad_alpha` / `white_plate`)
The single most frequent root cause of fatal failures is background keying algorithms misidentifying white graphic components as background canvas and erasing them.
- **Christmas Stocking Pair** (`hero-christmas-stocking-closed`, `hero-christmas-stocking-open`): The white fleece cuff at the top was entirely keyed out, severing the hanging hook from the sock body and eliminating the open entry mouth.
- **Magician Top Hat** (`hero-magician-hat-closed`, `hero-magician-hat-open`): The white crown of the hat was erased, leaving only a disconnected black rim and band floating in air.
- **Lighthouse Door** (`hero-lighthouse-door-closed`, `hero-lighthouse-door-open`): The white painted stripe of the tower wall was keyed away, severing the lighthouse into disconnected top and bottom halves.
- **Hockey Bag** (`hero-hockey-bag-closed`, `hero-hockey-bag-open`): The white fabric duffel body was keyed out, leaving only red straps and zipper outlines floating with no container body.
- **Police Car Trunk** (`hero-police-trunk-closed`, `hero-police-trunk-open`): White body paint of the police patrol car was erased, destroying the vehicle and leaving unusable floating windows and tail lights.
- **Snowman Base** (`hero-snowman-base`): Pure white snowman spheres were keyed out completely, leaving only faint ground slush.
- **Toy Castle Keep** (`hero-toy-castle-keep-closed`, `hero-toy-castle-keep-open`): White stone rampart walls were keyed out, leaving floating flags and an open door frame.
- **Sports Goals & Nets** (`hero-goal-net`, `hero-soccer-goal-post`): White net meshes were completely erased by color range thresholding, rendering the goal invisible (`blank`).
- **Rocket Launch Pad** (`hero-rocket-launch-pad`): White/light-grey launch platform base was keyed away, leaving only a thin curved support ring.

### B. Alpha Disconnection & Fragmentation (`bad_alpha` / `edge_cutoff`)
- **Art Easel** (`hero-easel`): The tripod frame was completely obliterated during alpha processing, leaving 6 disconnected paint cup rings hovering in empty space.
- **Doll Stroller** (`hero-doll-stroller-closed`, `hero-doll-stroller-open`): Thin pink tubular frame and wheel struts were fractured into detached bits with white artifacts.
- **Toaster** (`hero-toaster-closed`): The toaster body was bisected with a large curved alpha bite through the middle.
- **Kettle Pair** (`hero-kettle-closed`, `hero-kettle-open`): Spout and handle broke off with irregular jagged bites.
- **Shipwreck Hatch** (`hero-shipwreck-hatch-closed`): Hatch lid fractured into dozens of disconnected floating wood splinters.
- **Grill Pair** (`hero-grill-closed`, `hero-grill-open`): Lower kettle bowl and tripod legs were severed by keying errors.
- **Tram Stop** (`hero-tram-stop`): Bench seating and roof shelter disconnected into floating halves.

### C. Blank Grid Slices from Rectangular Slicing (`blank`)
- In `tmp-manus-hero-targets-wave1-hero-king-interactive-target-sheet4-face-body`, intermediate grid slicing generated 13 empty placeholder assets (`hero-empty2` through `hero-empty15`) that contain 0 opaque pixels.

---

## 2. Strongest Asset Families (Production-Grade PASS)

The vast majority of hero containers and stage surfaces achieved exceptional visual quality and strong pedagogical utility for king-stage ClassIn boards:

1. **Musical Instrument Cases** (`hero-banjo-case-*`, `hero-bass-case-*`, `hero-cello-case-*`, `hero-clarinet-case-*`, `hero-flute-case-*`, `hero-guitar-case-*`, `hero-harmonica-case-*`, `hero-recorder-case-*`, `hero-saxophone-case-*`, `hero-trombone-case-*`, `hero-trumpet-case-*`, `hero-ukulele-case-*`, `hero-violin-case-*`):
   - Flawless open/closed pairing with plush velvet interiors contoured exactly to the instruments, offering intuitive, tactile drop targets for young learners.
2. **Storage Containers & Chests** (`hero-treasure-chest-*`, `hero-toy-box-*`, `hero-jewelry-trunk-*`, `hero-bento-box-*`, `hero-craft-box-*`, `hero-toolbox-*`, `hero-first-aid-kit-*`, `hero-tackle-box-*`, `hero-bread-bin-*`, `hero-picnic-basket-*`):
   - Consistent isometric perspectives, sturdy hinges, deep cavity shadows, and distinct visual state changes when open.
3. **Appliance & Vehicle Stages** (`hero-oven-*`, `hero-refrigerator-*`, `hero-microwave-*`, `hero-washing-machine-*`, `hero-dryer-*`, `hero-subway-door-*`, `hero-train-car-*`, `hero-helicopter-door-*`, `hero-submarine-hatch-*`, `hero-spaceship-hatch-*`):
   - Expansive interior stage cavities suitable for multi-prop drag-and-drop activities (e.g. baking ingredients, loading passengers, storing cargo).
4. **Natural & Themed Stages** (`hero-tree-hollow-*`, `hero-treehouse-*`, `hero-tent-*`, `hero-dog-house-*`, `hero-chicken-coop-*`, `hero-birdhouse-*`, `hero-barn-*`, `hero-cave-*`, `hero-igloo-*`, `hero-mermaid-grotto-*`):
   - Rich environmental character without visual clutter, keeping the play zone readable and quiet.
5. **Surface Playboards & Trays** (`hero-baking-sheet`, `hero-cutting-board`, `hero-dice-tray`, `hero-felt-board`, `hero-chalkboard`, `hero-pocket-chart`, `hero-play-mat`, `hero-puzzle-board`, `hero-sandbox`, `hero-ten-frame`, `hero-stage`):
   - Clean, unobstructed floor/table staging areas providing ample surface area for roleplay tools and token arrangement.

---

## 3. Decision Breakdown by Source

| Source Bank | Total Assets | PASS | REVIEW | REDO |
|---|---|---|---|---|
| `public/assets/09_props` (Live Hero Targets) | 750 | 674 | 8 | 68 |
| `public/assets/09_props` (Themed Topic Packs) | 133 | 128 | 0 | 5 |
| `tmp/manus-hero-stockpile` (Raw Harvest Stockpile) | 1050 | 694 | 266 | 90 |
| `tmp/manus-hero-targets-wave1` (Wave 1 Raw Harvest) | 135 | 45 | 48 | 42 |
| **Total** | **2068** | **1341** | **583** | **144** |

---

## 4. Recommendations for Producer Pipeline

1. **Hue-Aware Keying for White Props**: Update prompt generator and keying script to avoid pure white luminance keying on objects containing white materials (stocking cuffs, hats, police cars, snowmen, goal nets). Use chromatic backdrops (e.g., magenta `#ff00ff` or pure black `#000000` with threshold bounds) rather than high-key white plates.
2. **Connectivity Filter Gate**: Introduce an automated topological connectivity check during prop harvesting. Any cutout that splits into multiple disconnected components exceeding a fragmentation threshold should trigger a pipeline warning before entering live manifests.
3. **Paired Ingestion Atomic Unit**: Treat open/closed pairs as an indivisible atomic asset unit during ingestion. If either state fails QA, the entire pair should remain in draft state until re-harvested.
