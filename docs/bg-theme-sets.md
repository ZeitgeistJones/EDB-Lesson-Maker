# Themed background sets (quiet flats)

Boards read best like a short PPT deck: **one lesson palette**, small
variations page to page — not a new photograph every slide, and not a busy
place scene under EDB chrome.

Place scenes (`08_backgrounds` scenes with a floor) stay useful when the
**scene is the hero** (empty centre band for standing props). Most spine pages
want **quiet flats**: soft washes with almost nothing in the middle so cards,
icons, and docks stay the star.

## Routes (pick one)

| Route | When | How |
|-------|------|-----|
| **In-house (default)** | Missing set during a quality loop / one topic need | `.cursor/skills/bg-flat-sets/SKILL.md` — generate 4 landscape panels with the native image tool → `npm run assets:bg --flat --set=…` |
| **ChatGPT 2×2 sheet** | Bulk / max cross-panel consistency | Free ChatGPT app → `assets-inbox/` → import with `--grid=2x2` (below) |

No API key required for the in-house path.

## Style lock (paste into every prompt)

> Soft pastel wash background for an ESL lesson slide. Wide panoramic banner
> (about 3:2). Same flat-vector feel as a children's book endpaper: gentle
> gradients, muted colours, no harsh outlines. The **centre 70% must stay
> empty and low-texture** — soft colour only — so white cards and icons can
> sit on top. Tiny decorative hints only in the far corners or along the very
> bottom edge. No people, no faces, no animals, no furniture close-ups, no
> books, no vases, no windows with props, no text, no letters, no numbers, no
> logos. Calm, uncluttered, classroom-safe. Each panel in a set must share the
> **same hue family** and only change value / a small motif.
>
> **Never flesh / skin washes.** Do not use peach-blush or pale rose as a
> body-part metaphor (face lessons must not look like skin). Prefer paper
> cream, soft sage, pale sky, or a clear *place* palette (clinic teal, travel
> dawn). Body-part topics use the house deck — they do not get their own hue.

## What a “set” is

| Field | Meaning |
|-------|---------|
| `set` | Shared id, e.g. `clinic-cool` — picker locks the lesson onto this band |
| `quiet` | `true` = safe under cards (default for new flats). Busy photo-props → `false` |
| `mood` | `calm` for normal lessons; `music` / `fantasy` only when topic asks |
| `textInk` | Usually `dark` on these pale washes |

A set is **4 panels**. Same palette, tiny variations — enough for a 30–60 min
board without looking random.

## Wired sets

| Set | Topic | Status |
|-----|-------|--------|
| `board-house` | **Default** — face, school, phonics, unmatched A1 | wired (in-house Aug 2026) |
| `clinic-cool` | dentist / doctor / hospital | wired |
| `travel-air` | airport / trip / plane | wired |
| `home-warm` | family / house / daily routine | wired |
| `outdoor-fresh` | park / zoo / sport (when scene is not the hero) | wired |
| `school-soft` | (legacy) superseded by `board-house` | kept on disk, not picker-default |
| `face-soft` | **retired** — skin-tone peach read as literal skin | kept on disk, unwired |

### `board-house` — ClassIn default deck

Palette: **paper cream + soft sage + pale sky**. Empty centre. Corner motifs
(sparkle, chalk dots, soft sky band, sage alcove). Title pins to `house-a`,
wrap to `house-d`; middle pages rotate. Use for face / school / any lesson
without a clear place — never invent a body-part palette.

## Priority place sets (ChatGPT prompts for bulk regen)

Use the in-house skill for gaps. Only generate **place** themes — not body parts.
Missing non-place topics → stay on `board-house`.

### 1. `clinic-cool` — dentist / doctor / hospital

**Must read as indoor clinic calm — not grass, not hills, not nature.**

Palette: sterile soft **white + pale sky-teal + very light grey**. Optional blush
pink only as a tiny corner accent. Ground = soft horizontal wall/floor wash or
a pale vinyl strip — **never green turf**.

Corner motifs only (pick different ones per panel, keep centre empty):
tiny tooth outline, soft sparkle, faint cross (not red emergency), soft exam-lamp
glow in a corner, pale arched alcove on the far edge.

> Soft pastel wash for an ESL lesson slide. Wide panoramic banner (~3:2). Flat
> vector / children's-book endpaper look: gentle gradients, muted colours, no
> harsh outlines. The centre 70% must stay empty and low-texture — soft colour
> only — so white cards sit on top. Tiny decorative hints only in far corners
> or along the very bottom edge. No people, no faces, no animals, no furniture
> close-ups, no dental chairs, no instruments filling the frame, no books, no
> vases, no text, no logos. Calm, uncluttered, classroom-safe.
>
> Generate a 2×2 grid of quiet ESL slide backgrounds for a **dentist / clinic**
> lesson. All four panels share one cool clinic palette: soft white, pale
> sky-teal, light grey (like a clean children's clinic wall — NOT green grass,
> NOT outdoor hills, NOT nature landscapes).
>
> Panel A: almost-plain pale teal-white wash with a soft horizontal floor line
> in light grey only.
> Panel B: same wash, faint soft sparkles in one upper corner.
> Panel C: same wash, a tiny simple tooth outline watermark in one corner
> (small, pale, not the focus).
> Panel D: same wash, very faint arched alcove shadow on the far right edge
> only.
>
> Forbidden: green hills, meadows, bushes, flowers, sunsets over landscape,
> playground, park. This must feel like a clean indoor clinic backdrop.

### 2. `travel-air` — airport / trip / plane
Palette: soft teal + peach dawn. Corner motifs: tiny paper-plane silhouette,
faint cloud band at top only.

> [style lock] Generate a 2×2 grid of quiet ESL slide backgrounds. Shared
> travel palette (teal, peach, pale sky). Empty centre. Tiny cloud or paper
> plane only in a corner — never a full airport scene.

### 3. `home-warm` — family / house / daily routine
Palette: peach, cream, soft gold. Corner motifs: faint curtain fold or soft
arch shadow at the edge only.

> [style lock] Generate a 2×2 grid of quiet ESL slide backgrounds. Shared warm
> home palette. Empty centre. No sofas, no lamps, no window plants in the
> middle band.

### 4. `outdoor-fresh` — park / zoo / sport (when scene is not the hero)
Palette: soft green + sky. Corner motifs: faint grass fringe at bottom, soft
leaf corner.

> [style lock] Generate a 2×2 grid of quiet ESL slide backgrounds. Shared
> outdoor palette (sage, sky, soft sun). Empty centre. Not a playground photo;
> not a full zoo habitat.

## Import (ChatGPT sheet)

```bash
# After saving ChatGPT 2×2 PNG to assets-inbox/clinic-cool.png
npm run assets:bg -- assets-inbox/clinic-cool.png --flat --grid=2x2 --cell=0,0 \
  --name=clinic-a --set=clinic-cool --mood=calm --tone="clinic cool wash A"
npm run assets:bg -- assets-inbox/clinic-cool.png --flat --grid=2x2 --cell=0,1 \
  --name=clinic-b --set=clinic-cool --mood=calm --tone="clinic cool wash B"
npm run assets:bg -- assets-inbox/clinic-cool.png --flat --grid=2x2 --cell=1,0 \
  --name=clinic-c --set=clinic-cool --mood=calm --tone="clinic cool wash C"
npm run assets:bg -- assets-inbox/clinic-cool.png --flat --grid=2x2 --cell=1,1 \
  --name=clinic-d --set=clinic-cool --mood=calm --tone="clinic cool wash D"
```

## Import (in-house single panel)

```bash
npm run assets:bg -- assets-inbox/board-house-a.png --flat --name=house-a \
  --set=board-house --mood=calm --tone="ClassIn house wash — paper cream sage"
```

Paste the printed JSON into `public/assets/08_backgrounds/manifest.json`
under `flats`, then:

```bash
npm run test:bg-picks
node scripts/verify-board-visual.cjs --cases=face
```

## Picker behaviour (once sets are in the manifest)

1. Place topic words pick a preferred `set` (dentist → `clinic-cool`, travel →
   `travel-air`, …). Otherwise **`DEFAULT_SET = board-house`** (face, school,
   overflow titles).
2. The whole lesson stays **inside that set**. Title pins to panel `-a`, wrap
   to last panel; middle pages rotate.
3. Set-tagged flats never leak into the generic calm lottery.
4. Busy legacy flats (`blue-alcove` books, desk ledge, prop-heavy windows) are
   marked `quiet: false` and stay out of normal chrome rotation.

## Not for this pipeline

- **Busy place scenes** — still use the scene style lock in
  [`asset-prompts.md`](asset-prompts.md) when you truly need a floor for
  standing props.
- **Black-field character cutouts** (open mouth, dentist kid, etc.) — those are
  **props** via `npm run assets:prop`, not slide backgrounds.
