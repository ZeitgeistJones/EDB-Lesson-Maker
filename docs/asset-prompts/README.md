# Asset generation prompts

Every generated pack in this bank came from one prompt shape. It is written
down here so future sheets match the ones already in `08_backgrounds/` and
`09_props/` instead of drifting into a second style.

## The two shapes

**Prop sheet** — 2×3 grid, 3840×1180, black matte, six cutouts.
**Scene sheet** — one 1280×590 board background at a time (scenes are too
detailed to survive a grid).

## Why black, not transparent

Image models produce cleaner, better-lit objects on a solid black field than
they do asked for transparency, and a pure black matte keys out predictably.
`tools/assets/cut_grid.py` does the keying by flood fill from the panel
border, so black *inside* the object (linework, a shadow under a shelf) is
kept. That only works if the field is actually uniform — a dark grey or
vignetted background will leave a rim. If a panel comes back with a soft
grey glow around the object, regenerate it rather than lowering the
threshold.

## Non-negotiables in every prop prompt

- Solid pure black background, no gutters, no divider lines
- One object per panel, fully visible, centred, ~5% margin from the edges
- Flat vector, soft muted colours, consistent lighting across all six
- No people, animals, text, letters, numbers, logos, labels or writing
- Empty / blank where the object is a container or a card — the board layer
  puts the content in, so baked-in content makes the prop single-use

The no-glyph rule matters more than it looks. A slot pad with a "1" on it
only works for slot one, in one language.

## After generating

```bash
python3 tools/assets/cut_grid.py sheet.png -o public/assets/09_props/img \
    --names slug-1 slug-2 slug-3 slug-4 slug-5 slug-6
```

Then add the six entries to `public/assets/09_props/manifest.json` with a
`role` that an `edbActivities.js` recipe asks for, and update
`public/assets/LICENSE.md`.

## Sheets

| File | Contents |
|---|---|
| `props-01-containers.md` | drag-into targets: box, backpack, suitcase, basket, tray, mailbox |
| `props-02-classroom.md` | easel, pocket chart, cubbies, desk, door, clock face |
| `props-03-reward-game.md` | chest, gift, medal, dice, spinner, ticket |
| `props-04-scene-parts.md` | tree, cloud, sun, table, chair, rug |
| `scenes-01-places.md` | subway, hotel lobby, office, garden, toy store, pet shop |
| `scenes-02-places.md` | gas station, snowy street, party room, museum, laundromat, stadium |
