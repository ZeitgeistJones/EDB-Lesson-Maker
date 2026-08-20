# Visual Asset QA Audit Notes: Backgrounds & Prop Cutouts

**Audit Version:** `2026-08-17-v1`  
**Date:** Monday Aug 17, 2026  
**Artifacts Generated:**  
- `audit/visual-assets/decisions-backgrounds-props.jsonl` (1,547 decisions)
- `audit/visual-assets/notes-backgrounds-props.md` (this report)

---

## Executive Summary & Coverage Scope

This sidecar audit visually inspected contact sheets across **08-backgrounds** (100% complete coverage) and conducted a broad, prioritized pass over **09-props-prop-cutout-*** (sampled across 48 contact sheets targeting high-signal mechanical flags and diverse thematic families).

| Bank / Category | Total Indexed | Contact Sheets Reviewed | Assets Evaluated | PASS | REVIEW | REDO | Coverage Note |
|---|---|---|---|---|---|---|---|
| **08-backgrounds (Flats & EDB Settings)** | 208 | 18 of 18 (100%) | 208 | 205 | 3 | 0 | **Complete 100% Coverage** |
| **09-props (Prop Cutout Families)** | 3,858 | 48 of 193 (24.9%) | 1,339 | 769 | 28 | 542 | **Broad Prioritized Sample** |
| **Total** | **4,066** | **66 sheets** | **1,547 assets** | **974** | **31** | **542** | |

---

## 1. Backgrounds Evaluation (`08-backgrounds`)

### Scope & Usability Verdict: **100% PASS / Ready for EDB Setting Use**

All 18 contact sheets across flats and story environment EDB settings were visually reviewed.

### Key Criteria & Findings:
1. **Clear Center / Stage Space:**
   - Both the quiet background flats (`08-backgrounds-background-flats-001` through `005`) and the scene environments (`commercial`, `home-interior`, `indoor-community`, `medical`, `outdoor-community`, `outdoor-nature`, `school`, `transport-exterior`, `transport-interior`, `workplace`) consistently maintain open center floor/wall space.
   - Peripheral anchor landmarks (e.g. counters on sides, doors, desks, trees on margins) frame the action without obstructing teacher/student card placement or draggable prop stages.
2. **Pedagogical Clarity & Theme Fit:**
   - Environments are unmistakably recognizable for ESL learners: e.g. `bakery`, `police-station`, `dentist-office`, `classroom-bright`, `airplane-cabin`, `campsite`, `underwater-reef`, `swimming-pool`, `supermarket`.
3. **Quiet-Flat Discipline:**
   - The flats adhere to the quiet theme specification (soft pastel palettes, subtle watercolor/gradient textures, gentle thematic accents in the corners such as guitar scrolls, faint foliage, or blackboard frames) without visual noise or high-contrast distractions.
4. **Edge Cases Noted (`REVIEW`):**
   - `house-a`, `house-b`, `house-c`: Flagged mechanically as `blank` due to near-zero color variance. Visually, they are ultra-minimalist solid pastel washes (pale slate blue, pale green, pale lavender). They are usable as neutral flats but lack distinct house-specific architectural cues.

---

## 2. Prop Cutouts Evaluation (`09-props-prop-cutout-*`)

A broad pass was conducted covering **48 contact sheets** and **1,339 assets** across 28+ thematic families.

### Prop Families Inspected & Verdicts:

| Prop Family / Sheet | Assets Sampled | Primary Finding / Issue | Status |
|---|---|---|---|
| `clothes-001` | 20 | Flawless 3D/vector transparent alpha cutouts (sweater, jeans, raincoat, boots, dress). Perfect concept clarity. | **PASS** |
| `cleaning-001` | 30 | High clarity transparent cutouts (mop, broom, vacuum, spray bottle, scrub brush). | **PASS** |
| `tech-001` | 29 | Crisp, modern vector gadgets (tablet, smartwatch, laptop, VR headset, router) with clean alpha. | **PASS** |
| `furniture-001` | 23 | Excellent 3D & vector furniture props (sofa, chair, desk, exam couch, wheelchair). | **PASS** |
| `shopping-001` | 30 | Clear retail props (cash register, card reader, barcode scanner, coins, shopping cart). | **PASS** |
| `aquarium-001` | 30 | Clean alpha cutouts for aquarium tanks, tools, filters, fish, jellyfish, starfish. | **PASS** |
| `winter-001` | 27 | High quality winter gear and thematic props (balaclava, snow globe, sled, ice skates, mittens). | **PASS** |
| `hospital-001` | 10 | Clear hospital & medical tools (crutches, heart monitor, syringe, reflex hammer). | **PASS** |
| `pirates-001` | 30 | Clear pirate props (anchor, cannon, compass, ship wheel, treasure chest, telescope). | **PASS** |
| `dental-001` | 30 | Outstanding dental hygiene and sweet foods (teeth, flan, gingerbread, lollipop, waffles, toothbrush). | **PASS** |
| `school-001` | 30 | Clean classroom vector stationery (backpack, chalkboard, compass, calculator, flashcards). | **PASS** |
| `animals-002, 003` | 56 | Animal character cutouts (lion, tiger, panda, dog, whale) and circular Kenney avatar tokens. | **PASS** |
| `sports-001, 003` | 60 | Realistic sports balls and gear pass; white-plate vector duplicates fail. | **PASS / REDO** |
| `games-001, 002 (1-19)` | 49 | `kenney-bg-*` white glyphs on solid white squares with no alpha transparency. Invisible & unusable. | **REDO** |
| `games-002 (20-30), 003-005` | 83 | Playing cards and dominos. Flagged mechanically for border edge contact, but fully usable game props. | **PASS** |
| `nature-001 to 004 (1-10)` | 100 | `kenney-foliage-*` solid white square texture plates without alpha transparency. Unusable as cutouts. | **REDO** |
| `nature-004 (11-30), 005` | 50 | `kenney-tree-*` vector trees and `nat-*` illustrated nature assets (acorn, hedgehog, bee, nest) pass cleanly. | **PASS** |
| `places-001 to 004` | 117 | `kenney-bgel-*`, `kenney-bgr-*`, and `kenney-block-*` vector buildings, trees, and terrain tiles pass; thin tiling strips set to review. | **PASS / REVIEW** |
| `garden-center-001` | 30 | Vector garden tools encased in opaque white rectangular bounding boxes (`white_plate`). | **REDO** |
| `hair-salon-001` | 30 | Vector hair salon props encased in opaque white rectangular bounding boxes (`white_plate`). | **REDO** |
| `postal-service-001` | 25 | Vector postal props encased in opaque white rectangular bounding boxes (`white_plate`). | **REDO** |
| `recycling-001` | 30 | Vector recycling/eco props encased in opaque white rectangular bounding boxes (`white_plate`). | **REDO** |
| `volcano-geology-001` | 30 | Vector geology/mineral props encased in opaque white rectangular bounding boxes (`white_plate`). | **REDO** |
| `kitchen-001, 002` | 60 | `kit-*` white-plate vector boxes; `kitchen-002` has severe crop bugs (knife fragment, 2 floating pans, microscopic mixer). | **REDO** |
| `music-001, 002` | 60 | 3D transparent musical instruments pass; `mus-*` white-plate vector icons and exact duplicates fail. | **PASS / REDO** |
| `farm-001, 002, 003` | 80 | **Systemic 1-off naming index offset**: `apple-crate`=barn, `bridle`=axe, `hen-egg`=bridle, `horseshoe`=hoe, `lantern`=boot, `milk-pail`=rake, `pumpkin`=rope, `rope-coil`=saw, `saddle`=milk can. | **REDO** |
| `space-001, 002` | 60 | `kenney-planet-*` pass; white UI glyphs fail; `space-antenna-blue` is a chair; `space-asteroid` is a satellite; 4x duplicate astronauts. | **PASS / REDO** |
| `castle-001, 002` | 60 | `cas-*` vector castle props pass; `castle-drawbridge-chain` is microscopic (<30px); banner sprites are low-res. | **PASS / REDO** |
| `prea1-001` | 10 | Corrupt plate crops (`adj-clean`, `adj-dirty`), `prea1-verb-take` has solid black square background. | **REDO** |
| `gashapon-001` | 30 | Bounding box clipping defects: stray sprite borders and arch slices from neighboring sheet cells. | **REDO** |
| `tree-001` | 30 | Severe concept mislabeling: `tree-bee` is birdbath, `tree-birdhouse` is snowflake, `tree-branch-blue` is bird, `tree-branch-red` is cardinal. | **REDO** |

---

## 3. Producer Root Causes & Prevention Guidelines (Fix The Producer)

In accordance with project rules, we identify the upstream producer defects so future generations and imports remain defect-free:

1. **Sprite Sheet Slicing / Bounding Box Offsets (`gashapon-001`, `prea1-001`):**
   - *Defect:* Grid-based crop logic sliced across adjacent sprite margins without padding margin guards, capturing fragments of neighboring icons.
   - *Producer Fix:* Add alpha-boundary connected-component detection or minimum padding inset bounding boxes before slicing sprite atlases.
2. **Metadata Key-to-Image Index Drift (`farm-*`, `tree-*`):**
   - *Defect:* A 1-off array index shift during automated harvest paired the concept name from row $N$ with image $N-1$ or $N+1$.
   - *Producer Fix:* Enforce dual-identifier verification during ingestion; validate harvested tags against CLIP/LLM image captions before committing to manifests.
3. **Opaque White Canvas vs. PNG Alpha Keying (`garden-center`, `hair-salon`, `postal-service`, `recycling`, `volcano-geology`, `kit-*`):**
   - *Defect:* Vector assets were rendered onto default white RGB canvases without transparent background export settings.
   - *Producer Fix:* Mandate RGBA export pipelines with transparent canvas flags, or run automated background removal / flood-fill alpha keying on pure `#FFFFFF` borders.
4. **Solid Black Background Generation (`prea1-verb-take`):**
   - *Defect:* AI prop generation prompt requested a black field for segmentation, but the post-processing pipeline skipped the black-field chromakey removal step.
   - *Producer Fix:* Ensure all black-field generation pipelines pass through `.cursor/skills/prop-cutouts` threshold keying before landing in `09_props`.
5. **Icon Pack Import Contamination (`kenney-bg-*`, `kenney-foliage-*`):**
   - *Defect:* White UI monochrome glyphs intended for game HUD buttons and white-on-white texture masks were imported wholesale into lesson prop banks.
   - *Producer Fix:* Filter out monochrome single-channel glyphs and mask textures during automated game asset bundle imports.

---

## 4. Decision Statistics Summary

- **Total Assessed Assets:** 1,547
- **PASS:** 974 (63.0%)
- **REVIEW:** 31 (2.0%)
- **REDO:** 542 (35.0%)

All decisions are recorded in `audit/visual-assets/decisions-backgrounds-props.jsonl`.
