# Dental unit — asset matrix (by CEFR)

Goal: one topic pack that can teach **A1 → B1** without improvising glyphs.
Split by **surface** (what the board needs), not by “make everything.”

| Surface | What it’s for | A1 (concrete) | A2 | B1 |
|---------|---------------|---------------|----|----|
| **Vocab dock icons** (white-bg, ~96px) | New Words match / label | dentist, tooth, smile, brush, clean, floss | cavity, gums, checkup, mouthwash | braces, filling, extraction, anaesthetic |
| **EDB props** (black-field cutouts) | Activity hero / dress / sort | open-mouth kid (hero), toothbrush, toothpaste, floss pick | dentist character, dental mirror, cavity tooth | x-ray film, braces tray, chair |
| **Quiet flats** | Chrome under cards | `clinic-cool` set | same | same |
| **Place scene** | Only if scene is the hero | optional `dentist-office` | optional | optional |

## What we have today

| Need | Status |
|------|--------|
| Quiet clinic flats | wired (`clinic-a`…`d`) |
| Vocab: tooth, toothbrush, mouth | pack |
| Vocab: dentist, smile, clean, brush | aliases (doctor / happy / soap / toothbrush) |
| Vocab: floss, cavity, gums… | missing / wishlist |
| Prop: dental kid open mouth | wired `dental-kid-open-mouth` (hero) |
| Prop: dentist person, cavity tooth, floss, mirror | **none** — medical sheet is general clinic furniture only |

## Mass-produce plan (wise order)

1. **A1 dental vocab sheet** (white 3×3): dentist, smile, floss, cavity, gums, toothpaste, mouthwash, dental-mirror, checkup  
2. **A1 dental prop sheet** (black 3×3): dentist-character, toothbrush, toothpaste-tube, floss-pick, dental-mirror, cavity-tooth, healthy-tooth, bib, prize-sticker  
3. **A2/B1 sheet** only after A1 boards bake clean — don’t invent B1 EDBs first.

EDB recipes already exist (`heroProp`, `matchDock`, `buildScene`). New art plugs into tags; we do **not** need a new recipe per level — we need honest pictures per word/role.

## Prompt for next ChatGPT prop sheet

See `docs/prop-sheet-prompts.md` house style, then:

```
Generate a 3×3 grid of premium classroom prop cutouts…
[HOUSE STYLE]
1. Dentist character (white coat, friendly, standing, full body)
2. Toothbrush
3. Toothpaste tube
4. Floss pick / dental floss
5. Dental mirror (hand tool)
6. One tooth with a dark cavity spot
7. One clean healthy tooth
8. Light blue dental bib (folded/flat)
9. Small star sticker / prize sticker
```
