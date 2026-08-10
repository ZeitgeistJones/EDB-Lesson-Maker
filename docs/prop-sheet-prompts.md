# Prop sheet prompts (ChatGPT 3×3)

Paste-ready prompts for the demand report’s top theme voids. Use the **ChatGPT
image model** (5.3 is fine for bulk). Prefer a **flatter** read than glossy
game-icons so sheets match the matte house pack — see the house-style block
below.

After generation: drop the PNG in chat (or `assets-inbox/`) and ask the agent to
run the `--sheet` import. One prop per cell, black field edge-to-edge, gutters
between cells, nothing crossing a boundary.

## House style (flatter matte — paste into every sheet)

```
HOUSE STYLE:
• Flat educational vector icons with only restrained soft shading (not soft-3D, not isometric product renders)
• Clean silhouette, simple solid shapes
• At most two flat tones per object (base + one shadow shape) — NO strong gradients, NO specular highlights, NO glass shine, NO metallic reflections
• Front-on or pure side view preferred; very slight 3/4 only when recognition needs it
• Soft muted desaturated palette (no neon, no pastel wash-out)
• Soft studio light from upper-left; gentle contact shadow on the object only
• Same corner roundness / edge weight across all 9 panels
• Solid pure black (#000000) background edge to edge — no gutters drawn as lines, no labels, no frame

Every panel: exactly ONE object, centered, ~5–8% margin, fully visible, no crop, no bleed into neighbours.
No people, animals, text, letters, numbers, logos, labels, or writing.
Empty means empty — nothing inside the prop.
```

## Sheet 1 — Medical / clinic (highest priority)

Zero medical-tagged props today; two clinic fixtures (`doctor`, `clown-clinic`) run scene dressing with classroom furniture instead.

```
Generate a 3×3 grid of premium classroom prop cutouts for an interactive English lesson whiteboard. Each panel contains ONE different object. Panels are divided evenly with NO gutters or divider lines.

[HOUSE STYLE — paste the block above]

Generate these NINE objects in reading order (left→right, top→bottom):
1. Examination couch / clinic bed (empty paper roll OK, no patient)
2. Stethoscope (coiled, one muted body colour, neutral earpieces)
3. Medicine bottle with simple cap (empty/opaque — not clear glass over black)
4. First-aid kit box (closed, red cross shape only as a flat colour mark — no text)
5. Wheelchair (empty, side view, complete wheels in frame)
6. Clinic clipboard with blank sheet (no writing)
7. Thermometer (simple digital stick, no readout numbers)
8. Rolling medical stool (empty seat)
9. Tissue box (plain, no brand, no text)

Import line (after you save the sheet):
npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \
  --names=exam-couch,stethoscope,medicine-bottle,first-aid-kit,wheelchair,clinic-clipboard,thermometer,medical-stool,tissue-box \
  --roles=furniture,tool,object,container,furniture,tool,tool,furniture,object \
  --scales=0.7,0.15,0.2,0.25,0.55,0.25,0.12,0.35,0.2 \
  --anchors=bottom,center,bottom,bottom,bottom,center,center,bottom,bottom --tags=medical,clinic,doctor
```

## Sheet 2 — Gym / sports

```
Generate a 3×3 grid of premium classroom prop cutouts for an interactive English lesson whiteboard. Each panel contains ONE different object. Panels are divided evenly with NO gutters or divider lines.

[HOUSE STYLE — paste the block above]

Generate these NINE objects in reading order:
1. Gym mat (rolled or flat rectangle)
2. Basketball (simple panels, muted orange)
3. Soccer ball (simple pentagon pattern, muted)
4. Jump rope (coiled)
5. Cone marker (sports cone)
6. Water bottle (opaque sports bottle — not clear glass)
7. Whistle (on a short cord loop)
8. Dumbbell (one piece, muted metal + grip)
9. Stopwatch (blank face — no numerals)

Import line:
npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \
  --names=gym-mat,basketball,soccer-ball,jump-rope,sports-cone,water-bottle,whistle,dumbbell,stopwatch \
  --roles=furniture,object,object,object,object,object,tool,object,timer \
  --scales=0.5,0.25,0.25,0.2,0.2,0.2,0.1,0.2,0.15 \
  --anchors=bottom,bottom,bottom,center,bottom,bottom,center,bottom,center --tags=gym,sport,play
```

## Sheet 3 — Cafeteria

```
Generate a 3×3 grid of premium classroom prop cutouts for an interactive English lesson whiteboard. Each panel contains ONE different object. Panels are divided evenly with NO gutters or divider lines.

[HOUSE STYLE — paste the block above]

Generate these NINE objects in reading order:
1. Lunch tray (empty compartments)
2. Milk carton (plain, no brand text)
3. Apple (simple fruit)
4. Sandwich (plain, no logo wrapper)
5. Napkin stack
6. Plastic cup (opaque or solid colour — not clear)
7. Fork (single utensil)
8. Spoon
9. Cafeteria stool (empty)

Import line:
npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \
  --names=lunch-tray,milk-carton,apple,sandwich,napkin-stack,plastic-cup,fork,spoon,cafeteria-stool \
  --roles=tray,object,object,object,object,object,tool,tool,furniture \
  --scales=0.4,0.2,0.15,0.2,0.15,0.15,0.12,0.12,0.4 \
  --anchors=bottom,bottom,bottom,bottom,center,bottom,center,center,bottom --tags=cafeteria,food,school
```

## Sheet 4 — Phonics / legacy repairs (props)

**Status: wired** earlier.

Replaces the four still-unkeyable contact-sheet crops. Extra cells fill related phonics gaps.

```
Generate a 3×3 grid of premium classroom prop cutouts for an interactive English lesson whiteboard. Each panel contains ONE different object. Panels are divided evenly with NO gutters or divider lines.

[HOUSE STYLE — paste the block above]

Generate these NINE objects in reading order:
1. Blue letter tile — solid muted blue square tile, blank face, soft round corners (no letter)
2. Elkonin / sound boxes — a horizontal strip of THREE empty rounded boxes side by side, one connected piece, blank insides
3. Blank word strip — long horizontal cream strip with soft corners, completely blank (no lines of text)
4. Yellow pencil — whole pencil tip to eraser in frame, one muted yellow body, pink eraser, grey tip
5. Green letter tile — same shape as #1, muted green, blank
6. Orange letter tile — same shape as #1, muted orange, blank
7. Single sound box — one empty rounded square box (phonics)
8. Pointer stick / teacher pointer — thin stick with a soft round tip, whole object in frame
9. Rubber eraser — simple rectangular pink eraser, blank

Import line:
npm run assets:prop -- <sheet.png> --sheet --grid=3x3 \
  --names=tile-blue,sound-boxes,word-strip,pencil,tile-green,tile-orange,sound-box,pointer-stick,eraser-block \
  --roles=letterTile,soundBoxes,wordStrip,tool,letterTile,letterTile,soundBoxes,tool,tool \
  --scales=0.15,0.35,0.4,0.15,0.15,0.15,0.15,0.35,0.12 \
  --anchors=center,center,center,center,center,center,center,center,center --tags=phonics,classroom
```

---

## Vocab dock icons (different from props)

These go in `07_vocab-pack` (match-dock pictures), **not** `09_props`. Square 1:1, plain
**white** background (not black), one subject, readable at ~96px. No text in the art.

**Batch preference:** for white-bg vocab 3×3 sheets, ask **Manus** (`esl-asset-generator`, `quality: default` only) first — see `scripts/manus/client.mjs` + `docs/manus-review.md` asset rules. ChatGPT paste prompts below remain the optional fallback.

```
VOCAB ICON STYLE:
• Flat educational vector, soft muted palette, restrained shading
• Square 1:1 image, solid white (#FFFFFF) background edge to edge
• Exactly ONE subject, centered, ~10% margin
• No black field, no photo, no glossy 3D, no text/letters/numbers/logos
• Must read clearly at small dock size (~96px)
```

### Sheet V1 — Clinic people + words (wishlist: doctor/nurse/patient/diagnosis/clumsy/table)

**Status: wired** — imported via `npm run assets:vocab-sheet` into `07_vocab-pack`.

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE subject on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order:
1. doctor — adult in a WHITE coat with a stethoscope, clearly different from nurse
2. nurse — adult in COLOURED scrubs (blue or green), no white coat, clearly different from doctor
3. patient — person sitting on an exam table or in a chair looking unwell (simple, kid-safe)
4. diagnosis — clipboard with a simple heart or cross mark only (NO writing, NO letters)
5. clumsy — person who has just tipped a cup; small spill shape; no blood, kid-safe comedy
6. table — plain four-leg TABLE (furniture), not a ping-pong table, not a desk clutter
7. appointment — calendar page with a simple coloured block mark (NO numbers, NO letters)
8. sick — person with thermometer, simple and clear
9. stethoscope — coiled medical stethoscope alone (backup icon)

Drop the sheet in chat; agent will slice into 07_vocab-pack keys:
doctor, nurse, patient, diagnosis, clumsy, table, appointment, sick, stethoscope
```

### Sheet V2 — Room adjectives (cramped / spacious / tidy / cluttered / cosy / huge)

**Status: wired** — imported into `07_vocab-pack`.

These need **contrast pairs**, not random objects.

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE mini-scene on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order — same room shape across a pair so the difference is obvious:
1. cramped — tiny room packed wall-to-wall with furniture
2. spacious — THE SAME room almost empty, one chair, lots of open floor
3. tidy — child's bedroom, everything put away
4. cluttered — THE SAME bedroom, toys and clothes on the floor
5. cosy — armchair + blanket + warm lamp in a corner
6. huge — giant simple object (e.g. oversized ball) next to a tiny person silhouette for scale (no face detail)
7. small — tiny object next to a normal chair for scale
8. empty — nearly bare room, one window
9. full — same room shape stuffed with boxes (no labels)

Keys: cramped, spacious, tidy, cluttered, cosy, huge, small, empty, full
```

### Sheet V3 — Travel procedure words

**Status: wired** — imported into `07_vocab-pack`.

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE subject on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order:
1. security — airport metal-detector arch, empty, no people required (or tiny plain silhouettes from behind)
2. turbulence — aeroplane with a simple wavy motion trail in bumpy air
3. connection — two boarding-pass shapes or two linked flight arrows (NO letters, NO flight numbers)
4. passport — closed booklet, maroon/blue, blank cover (NO text)
5. boarding pass — blank ticket stub shape (NO text)
6. suitcase — simple wheeled case
7. gate — airport gate waiting area cue (empty chairs + window), no signage letters
8. runway — simple runway with dashed centre line, plane small in distance
9. customs — simple desk / booth shape, no flag text, no letters

Keys: security, turbulence, connection, passport, boarding-pass, suitcase, gate, runway, customs
```

### Sheet V4 — Cafeteria words (vocab icons; props are Sheet 3)

**Status: wired** — imported into `07_vocab-pack`.

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE subject on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order:
1. tray — school lunch tray, empty compartments
2. queue — three plain kid silhouettes in a line from behind (no faces needed)
3. napkin — folded napkin
4. delicious — simple meal plate with steam curls (happy food, no face required on food)
5. cafeteria — lunch table + tray cue
6. lunch — lunchbox closed, blank
7. hungry — simple empty plate + fork
8. thirsty — cup with straw
9. menu — blank folded card (NO writing)

Keys: tray, queue, napkin, delicious, cafeteria, lunch, hungry, thirsty, menu
```

### Sheet V5 — Castle + face words (wishlist: knight/dragon/face/hair)

**Status: wired** — imported via `npm run assets:vocab-sheet` into `07_vocab-pack`
(`assets-inbox/vocab-castle-face-3x3.png`).

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE subject on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order:
1. knight — armored knight with sword and shield, standing, kid-safe cartoon
2. dragon — friendly green dragon, clear wings and tail (not a lizard, not a dinosaur)
3. castle — simple stone castle with towers and a gate
4. face — simple blank kid face outline (no hair, ready for features)
5. hair — one clear hair style alone (wavy brown locks), not a whole head with face
6. eyes — pair of simple cartoon eyes
7. smile — simple smiling mouth
8. bridge — stone arched bridge
9. flag — red pennant flag on a pole

Keys: knight, dragon, castle, face, hair, eyes, smile, bridge, flag
```

### Sheet V6 — Zoo words

**Status: wired** — `vocab-zoo-3x3.png` → `07_vocab-pack`.

Keys: zoo, cage, feed, lion, monkey, giraffe, elephant, zookeeper, ticket

### Sheet V7 — Beach words

**Status: wired** — `vocab-beach-3x3.png` → `07_vocab-pack`.

Keys: sand, shell, wave, ocean, beach, towel, bucket, sunscreen, sunglasses

### Sheet V8 — Trampoline unit

**Status: wired** — `vocab-trampoline-3x3.png` → `07_vocab-pack`.

Keys: trampoline, backflip, bounce, balance, spotter, mat, jump, stretch, helmet

### Sheet V9 — Daily (floss / farm / kitchen / bakery distinct)

**Status: wired** — `vocab-daily-3x3.png` → `07_vocab-pack`.

Keys: floss, farm, kitchen, bread, bakery, oven, flour, cake, dough

### Sheet V10 — Hobbies / after-school (wishlist + Desktop queue #2)

**Status: open** — prefer Manus white 3×3 (`scripts/manus/request-white-vocab-hobbies-sports.mjs`). Do **not** redo clubs sheet (art/chess/sports/music/science/drama/robot/choir/math).

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE subject on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order:
1. hobby — knitting yarn ball + needles OR stamp collection cue (clear “hobby”, no text)
2. club — simple membership badge/pin shape (blank, no letters)
3. join — two puzzle pieces almost connecting
4. practice — metronome OR simple target with arrows (no numbers)
5. team — three plain kid silhouettes standing together (from behind OK)
6. coach — whistle + clipboard (blank clipboard, no writing)
7. member — simple ID card shape (blank, no text)
8. meeting — round table with 3–4 empty chairs (top-down simple)
9. after-school — backpack + clock face with NO numbers (hands only)

Keys: hobby, club, join, practice, team, coach, member, meeting, after-school
```

### Sheet V11 — Sports abstract (wishlist + Desktop queue #3)

**Status: open** — metaphors must be unmistakable; else leave word text-only. Prefer Manus white 3×3 (same request script as V10). Note: `practice` also appears on V10 — import sports last if both land.

```
Generate a 3×3 grid of vocabulary icons for young ESL learners. Each panel ONE subject on solid white. Panels divided evenly, no divider lines.

[VOCAB ICON STYLE]

Reading order — keep metaphors dead simple:
1. practice — player kicking toward a cone (training cue)
2. effort — person pushing a sled or climbing a small hill (strain clear, kid-safe)
3. teamwork — two kids passing a ball to each other
4. win — simple gold trophy (no engraving text)
5. lose — simple silver medal with a small sad-but-kind face optional OR broken ribbon (no text)
6. score — blank scoreboard shape with two empty boxes (NO digits)
7. goalkeeper — gloves + goal silhouette
8. whistle — metal whistle alone
9. uniform — folded sports jersey (blank, no numbers/letters)

Keys: practice, effort, teamwork, win, lose, score, goalkeeper, whistle, uniform
```

## Not promptable (code)

- **Programmatic prop recolouring** — already has `bodyHue` in the manifest; no art to generate.
