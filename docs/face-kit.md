# Face kit (make-a-face EDB)

King-stage activity: blank head is the play surface; kids drag face parts from
the dock. See `.cursor/skills/king-stage-edb/SKILL.md`.

## Imported (v1)

| Source sheet | Grid | Count | Keys |
|--------------|------|------:|------|
| `face-blank.png` | 1×1 | 1 | `face-blank` (hero) |
| `face-features-4x6.png` | **6×4** | 24 | `face-eyes-*`, `face-brows-*`, `face-nose-*`, `face-ears-*`, `face-mouth-*`, `face-hair-*`, `face-glasses-round` |
| `face-hair-color-4x4.png` | 4×4 | 16 | `hair-*` |

All live in `public/assets/09_props/` with `alpha: true`. Fixture:
`scripts/fixtures/face-lesson.json`. Preview:
`node scripts/preview-face-hero.cjs` → `tmp/face-hero-preview.jpg`.

**Grid reminder:** importer `--grid` is rows×cols. A ChatGPT “4 across × 6 down”
features sheet is `--grid=6x4`.

## Activity dock (curated)

`ROLEPLAY_DOCK_FACE` in `edbActivities.js` — ~10 clear pieces, not the whole bank:

eyes (brown, blue) · mouths (smile, open) · nose · ears · 3 hairs · glasses

Remaining props stay in PropBank for teachers / future lessons.

## Deferred

| Sheet | Why skipped |
|-------|-------------|
| Labeled extras (beards, masks, hearing aids, …) | Many items + titles per cell — cannot import as 4×4 one-prop cells |
| Dark hair 4×4 | Optional follow-up; colorful set covers dock diversity for v1 |

### Re-prompt extras (one prop per cell)

Black field, no cell titles, one beard / mustache / glasses / mask / hearing-aid
/ cochlear / bandage per cell. Then `--sheet --grid=4x4`. Inclusivity pieces are
worth keeping on that sheet.
