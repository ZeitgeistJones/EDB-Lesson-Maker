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
