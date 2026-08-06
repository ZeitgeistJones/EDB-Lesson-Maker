---
name: bg-flat-sets
description: >-
  Generate quiet themed ESL board flat backgrounds in-house (no ChatGPT round-trip):
  read docs/bg-theme-sets.md style lock, generate 4 landscape washes with the native
  image tool, import via npm run assets:bg --flat --set, verify centre emptiness and
  textInk dark, wire TOPIC_SETS. Use when a lesson topic has no matching quiet flat
  set, quality loop flags a missing set, or the user asks for themed backgrounds /
  quiet flats / in-house bg generation.
---

# Quiet flat sets (in-house)

Same tight loop as prop-cutouts, adapted for full-bleed washes. No API key, no
human ChatGPT trip for the default path.

## When to run

- `SceneBackgrounds.setFor(topic)` would return a set id that has **&lt;2** flats
  in the manifest, or
- Topic has **no** `TOPIC_SETS` row and chrome looks generic/wrong, or
- User asks for a themed quiet set for a lesson (face, beach, bakery, …)

Quality loop: if the bake/review shows wallpaper spam or off-topic flats for a
clear topic, **invoke this skill** (do not block the whole loop waiting for
ChatGPT). Flag the gap, generate, re-bake.

## Decisions (locked)

| Choice | Rule |
|--------|------|
| Route | **In-house first** (4 individual landscape panels). ChatGPT 2×2 sheet only for bulk / max cross-panel match when the user wants it |
| Count | **4 panels** per set (`-a`…`-d`) |
| Aspect | Native tool **16:9** (closest to board); importer stretches to 1280×590 |
| QA | Not prop C1–C7. Check: empty centre, shared hue, no baked text, `textInk: dark` |

## Procedure

1. **Read [`docs/bg-theme-sets.md`](../../../docs/bg-theme-sets.md)** style lock + any topic prompt already there. Invent palette/motifs if the topic is new — keep centre empty.

2. **Pick ids**
   - `set`: kebab id (`face-soft`, `beach-warm`)
   - Panel names: `{set}-a` … `{set}-d` (or short stem `face-a` if the stem is clearer — stay consistent with `clinic-a` / `school-a`)

3. **Generate 4 images** (parallel OK). Each call: 16:9, explicit `filename` like `face-soft-a.png`. Prompt = style lock + **one shared palette** + **one unique corner motif** per panel. Forbidden: people, faces as the subject, furniture mid-frame, text, logos, busy scenery.

4. **Find outputs** in the project Cursor assets folder (same as props). Copy into `assets-inbox/` with short names if needed.

5. **Import each**

   ```bash
   npm run assets:bg -- assets-inbox/face-soft-a.png --flat --name=face-a \
     --set=face-soft --mood=calm --tone="face soft wash — plain blush cream"
   ```

   Repeat for `-b`/`-c`/`-d` with distinct tones. Importer prints JSON + warns if
   `midSd > 12` (busy middle) or mid-brightness heading strip.

6. **Gate by eye + importer notes**
   - Centre ~70% empty? If not → regenerate that panel with stronger “empty centre” language
   - Same hue family across four?
   - No letters/numbers?
   - `textInk` must be `dark` for pale washes — if importer says `light`, the wash is too dark; regenerate lighter

7. **Paste** flat entries into `public/assets/08_backgrounds/manifest.json` under `flats` (include `"set"`, `"quiet": true`, `"palette"`).

8. **Wire picker** — add/adjust a row in `TOPIC_SETS` in
   [`public/lib/sceneBackgrounds.js`](../../../public/lib/sceneBackgrounds.js).
   Put **specific** topics **before** broad ones (`face` before `school`).

9. **Verify**

   ```bash
   npm run test:bg-picks
   # optional: bake the fixture that should lock to this set
   ```

10. **Docs** — add the set to `docs/bg-theme-sets.md` priority table; wishlist row → wired.

## QA checklist (flats)

- [ ] Centre band empty enough for cards (importer `midSd` preferably ≤12)
- [ ] Four panels share one hue family
- [ ] No baked text / logos / people
- [ ] `textInk: "dark"` on pale washes
- [ ] Lesson topic locks via `TOPIC_SETS` (≥2 panels in set)

## Related

- Props: `.cursor/skills/prop-cutouts/SKILL.md`
- King EDB prefers quiet flats under the stage: `.cursor/skills/king-stage-edb/SKILL.md`
- Quality loop may call this when a set is missing: `.cursor/skills/board-quality-loop/SKILL.md`
