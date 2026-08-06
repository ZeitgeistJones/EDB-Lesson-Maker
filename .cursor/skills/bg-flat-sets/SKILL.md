---
name: bg-flat-sets
description: >-
  Generate quiet themed ESL board flat backgrounds in-house (no ChatGPT round-trip):
  read docs/bg-theme-sets.md style lock, generate 4 landscape washes with the native
  image tool, import via npm run assets:bg --flat --set, verify centre emptiness and
  textInk dark, wire TOPIC_SETS for place themes only. Use when a place topic has no
  matching quiet flat set, quality loop flags a missing place set, or the user asks
  for themed backgrounds / quiet flats / in-house bg generation. Non-place topics
  stay on board-house — do not invent body-part or skin palettes.
---

# Quiet flat sets (in-house)

Same tight loop as prop-cutouts, adapted for full-bleed washes. No API key, no
human ChatGPT trip for the default path.

## When to run

- A **place** topic (`clinic`, `travel`, `home`, `outdoor`, …) has a `TOPIC_SETS`
  set id with **&lt;2** flats in the manifest, or
- Quality loop shows off-topic place washes for a clear place lesson, or
- User asks for a themed quiet set for a **place** lesson

**Do not run** for face / body-part / generic school lessons — those use
`DEFAULT_SET = board-house`. Never invent flesh/skin/peach-as-body washes.

Quality loop: if the bake shows wallpaper spam for a clear *place*, invoke this
skill. If the topic is not a place, leave it on the house deck.

## Decisions (locked)

| Choice | Rule |
|--------|------|
| Default deck | `board-house` (paper cream + sage + pale sky) for face, school, unmatched |
| Place sets | Only clinic / travel / home / outdoor (and future *places*) |
| Route | **In-house first** (4 individual landscape panels). ChatGPT 2×2 sheet only for bulk |
| Count | **4 panels** per set (`-a`…`-d`) |
| Aspect | Native tool **16:9**; importer stretches to 1280×590 |
| QA | Centre empty, shared hue, no baked text, `textInk: dark`, **no skin tones** |
| Open/close | Title pins to first panel, wrap to last (picker handles this) |

## Procedure

1. **Read [`docs/bg-theme-sets.md`](../../../docs/bg-theme-sets.md)** style lock + place prompt. Confirm the topic is a **place**, not a body part.

2. **Pick ids**
   - `set`: kebab id (`beach-warm`, `bakery-warm`)
   - Panel names: short stem consistent with existing (`clinic-a`, `travel-a`)

3. **Generate 4 images** (parallel OK). Each call: 16:9, explicit `filename`. Prompt = style lock + **one shared palette** + **one unique corner motif**. Forbidden: people, faces as subject, furniture mid-frame, text, logos, **flesh/skin peach washes**.

4. **Find outputs** in the project Cursor assets folder. Copy into `assets-inbox/` if needed.

5. **Import each**

   ```bash
   npm run assets:bg -- assets-inbox/clinic-cool-a.png --flat --name=clinic-a \
     --set=clinic-cool --mood=calm --tone="clinic cool wash — plain teal white"
   ```

6. **Gate by eye + importer notes**
   - Centre ~70% empty? (`midSd` preferably ≤12)
   - Same hue family across four?
   - No letters/numbers / no skin-metaphor palette?
   - `textInk` must be `dark` on pale washes

7. **Paste** flat entries into `public/assets/08_backgrounds/manifest.json` under `flats`.

8. **Wire picker** — add/adjust a row in `TOPIC_SETS` in
   [`public/lib/sceneBackgrounds.js`](../../../public/lib/sceneBackgrounds.js).
   Place-specific rows only. Do **not** add face/skin/body-part sets.

9. **Verify**

   ```bash
   npm run test:bg-picks
   # optional: bake a fixture that should lock to this set
   ```

10. **Docs** — add the set to `docs/bg-theme-sets.md`; wishlist row → wired.

## QA checklist (flats)

- [ ] Centre band empty enough for cards
- [ ] Four panels share one hue family
- [ ] No baked text / logos / people
- [ ] No flesh / skin / body-part metaphor palette
- [ ] `textInk: "dark"` on pale washes
- [ ] Place topic locks via `TOPIC_SETS` (≥2 panels), or non-place stays on `board-house`

## Related

- Props: `.cursor/skills/prop-cutouts/SKILL.md`
- King EDB prefers quiet flats under the stage: `.cursor/skills/king-stage-edb/SKILL.md`
- Quality loop may call this when a *place* set is missing: `.cursor/skills/board-quality-loop/SKILL.md`
