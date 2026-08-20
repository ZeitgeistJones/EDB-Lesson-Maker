# Visual Asset QA Audit Notes: Pre-A1, B2 & EDB Settings Stockpiles

**Audit Date:** 2026-08-17  
**Scope:** 468 indexed assets across 50 pending contact sheets from `tmp-manus-prea1-stockpile`, `tmp-manus-b2-stockpile`, and `tmp-manus-edb-settings-stockpile`.

---

## Executive Summary

| Category | Total Assets | PASS | REVIEW | REDO | Pass Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pre-A1 Articulation** | 18 | 18 | 0 | 0 | 100% |
| **Pre-A1 Phonology** | 40 | 40 | 0 | 0 | 100% |
| **Pre-A1 Prewriting** | 43 | 43 | 0 | 0 | 100% |
| **Pre-A1 Surfaces** | 29 | 27 | 0 | 2 | 93.1% |
| **Pre-A1 TPR** | 30 | 27 | 0 | 3 | 90.0% |
| **Pre-A1 Instructions** | 42 | 27 | 0 | 15 | 64.3% |
| **Pre-A1 Mnemonic A-Z** | 52 | 32 | 0 | 20 | 61.5% |
| **Pre-A1 Relations** | 55 | 9 | 0 | 46 | 16.4% |
| **Pre-A1 Sheet-Sheets (Raw)** | 28 | 0 | 0 | 28 | 0.0% |
| **B2 Vocab Icons (Raw)** | 110 | 0 | 0 | 110 | 0.0% |
| **EDB Settings Backgrounds (Raw)** | 21 | 0 | 0 | 21 | 0.0% |
| **TOTAL** | **468** | **223** | **0** | **245** | **47.6%** |

---

## Strongest Assets (Production-Ready)

1. **Pre-A1 Articulation (18/18 PASS):**
   - Anatomical mouth aperture cues, tongue placements (/th/, /l/, /t/), sagittal profiles, and voiced/unvoiced contrast pairs demonstrate high pedagogical clarity for young ESL learners.

2. **Pre-A1 Phonology (40/40 PASS):**
   - Clean Elkonin sound boxes (2, 3, 4 slots), phoneme counter chips, sound-wave magnifiers, blending arrows, and syllable counters.

3. **Pre-A1 Prewriting (43/43 PASS):**
   - Precise directional strokes, letter-formation tracking paths (spiral, mountain, valley, bumps), sky-grass-dirt guidelines, and tactile wooden piece components.

4. **Pre-A1 Interactive Surfaces & TPR (54/59 PASS):**
   - Tray cavities, sorting bins, feed mouth cavities, and TPR action poses (stand, sit, look, listen, point, touch, show, give, take, wash, brush, eat) allow immediate comprehension without text.

---

## Weakest Recurring Failures

1. **Vertical Grid Misalignment & Slicing (`bad_crop`, `edge_cutoff`):**
   - **Pre-A1 Relations (46/55 REDO):** Sheets 2 and 3 suffered a severe vertical offset during harvesting, cutting through window frame lines and slicing cups, boxes, trees, and character limbs in half.
   - **Pre-A1 Mnemonic A-Z (20/52 REDO):** Letters Q–Z (upper and lower) were sliced mid-card, showing the top of one letter paired with the bottom of the next row.
   - **Pre-A1 Instructions (15/42 REDO):** Split UI tokens and severed character poses (e.g., celebration/calm-breathe missing heads).

2. **Raw Harvest Uncut Composites (`wrong_background_mode`, `bad_crop`):**
   - **B2 Vocab Icons (110/110 REDO):** Harvested as entire 3x3 contact grids rather than individual sliced icon assets with alpha cutouts.
   - **EDB Settings (21/21 REDO):** Harvested as dual-panel room variations/diptychs with white margins and letterboxing instead of single 16:9 full-bleed backgrounds.
   - **Pre-A1 Sheet-Sheets (28/28 REDO):** Composite parent sheets requiring downstream extraction.

3. **Embedded Text Artifacts (`text_artifact`):**
   - B2 vocab sheets (waves 4, 6, 7, 9, 10) burned English vocabulary text directly into the illustration field.
   - EDB settings contain panel annotations like `(a)`, `(b)`, and `living room a`.

4. **Incomplete Generation & Dead Space (`excess_dead_space`, `generation_artifact`):**
   - B2 wave 6/8/10 and Pre-A1 sheet-sheets contain empty black grid cells and incomplete batch harvests.
