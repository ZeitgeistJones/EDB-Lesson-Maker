# Content worlds JKLM — history / careers / music / wonders / math

Stockpile only. No producer wiring. No songs. Prefix `cw-`.
**L3** = one full-page 16:9 world per PNG (not a 2×2 poster grid). **L2** = black-field 3×3 companions.
Max 1 in-flight for this pack (1 of 4 Manus slots). Quality: default only.

- Runner: `scripts/manus/request-cw-jklm.mjs`
- Inventories: per harvest dir + `harvested/content-worlds/jklm-inventory.json`
- Do **not** write `harvested/content-worlds/inventory.json` (A+B owns that)

```
node scripts/manus/request-cw-jklm.mjs --wave=j1 --fire
node scripts/manus/request-cw-jklm.mjs --wave=j1 --poll-only
node scripts/manus/request-cw-jklm.mjs --loop
```

## Sibling skips (already commissioned elsewhere)

| Topic | Owner | JKLM action |
|---|---|---|
| Reef / tide pool empty biomes | A+B habitats | SKIP |
| Ocean-depth trench, reef wall, volcano, cave cutaways | CDE `d1` | SKIP (do **canyon + glacier** instead) |
| Archaeology strata trench | CDE `d3` `cut-archaeology-strata` | SKIP trench-clone; keep dig **workplace** (grid/finds tent) |
| Sorting hall / parcel depot | CDE `c2`/`c5` | SKIP sorting center |
| Radio booth as broadcast | CDE `c7` | SKIP radio studio |
| Empty recording-studio setting | S2 leftover | Do recording as **booth/live glass world**, not empty carpet |
| Picnic **plan** mission | CDE `e3` | SKIP picnic-plan; math picnic is **share plates** only |
| S4 F chef/photo/mechanic/… tools | S4 | SKIP more handheld tools |
| S2 concert-hall / volcano / castle | parked cinematic junk | Do orchestra **section floor** + canyon/glacier cutaways, not posters |
| S1 canyon-floor / radio-studio / kitchen / classroom | S1 settings | Through-time / cutaway must not clone those empty rooms |

## J — through-time history

Everyday systems: homes, schools, transport, communication, kitchens.
No leaders, battles, flags-as-heroes, dates, years, or century labels.

- **Era worlds:** four visual-technology stages of the same function (L3).
- **Before/after:** same door/window footprint, older vs later kit.
- **Timeline stages:** empty rails / plinths / split / dock for Cursor to drop era tiles later.

## K — career worlds (not more tools)

S4 already owns generic role tools. CDE already owns sorting + radio-as-pipeline.
This pack: **dig site as workplace** + **marine lab** (places kids stand in).

## L — music worlds (no notation)

Not S2 concert-hall posters, not S3 empty rehearsal-hall, not C7 radio/newsroom.
Orchestra section wedges, rehearsal stand-field (blank boards), recording glass cutaway.

## M — natural wonders

Cutaway / route / hidden feature. Canyon + glacier only (reef/trench/volcano are CDE/AB).

## MATH — story contexts

Market sharing + building-site quantity. No clocks, marked rulers, graphs, ten-frames.
Picnic share-plates only (not CDE picnic-plan).

## Waves

| Wave | Family | L3 | What |
|---|---|---:|---|
| `j1` | history | 4 | Homes through time |
| `j2` | history | 4 | Kitchens through time |
| `j3` | history | 4 | Blank timeline stages |
| `j4` | history | 4 | Schools through time |
| `j5` | history | 4 | Transport through time |
| `j6` | history | 4 | Communication through time |
| `j7` | history | 4 | Before/after pairs |
| `k1` | careers | 4 | Dig workplace + marine lab |
| `l1` | music | 4 | Orchestra world |
| `l2` | music | 4 | Rehearsal world |
| `l3` | music | 4 | Recording world |
| `m1` | wonders | 4 | Canyon cutaway/route |
| `m2` | wonders | 4 | Glacier cutaway/route |
| `math1` | math | 4 | Market + building-site share |

Each wave also fires 1 L2 companion sheet (5 PNGs / task).

Fire order: `j1` → `j3` (timeline) → `j2` → `m1` → `l1` → `j4` → `k1` → `m2` → `l3` → `math1` → `j5` → `j6` → `j7` → `l2`. Timeline sits right after homes because it is the unique play surface.

## Rate-limit

Max 1 JKLM in-flight. Poll ~30s. 429: 90s, one retry; still 429 wait 180s and stop. No `--all --fire`. `--loop` creates+polls+advances.

## Manus tasks

<!-- TASKS-START -->

| Metric | Count |
|---|---:|
| Fired | 14 |
| Sheets downloaded | 70 |
| L3 worlds | 56 |
| L2 companion sheets | 14 |
| PASS | 64 |
| HOLD | 6 |

| Wave | Family | Status |
|---|---|---|
| j1 | history | stopped — https://manus.im/app/8huwaCC5QKazPjNEsdPCag — sheets 5/5 — **4 PASS / 1 HOLD** (companion white plates) |
| j3 | history | stopped — https://manus.im/app/SKY3c8dQYziUcGttCpwFRX — sheets 5/5 — **5 PASS** |
| j2 | history | stopped — https://manus.im/app/aEd8rR5CUiks4fwkVtH5Rc — sheets 5/5 — **4 PASS / 1 HOLD** (companion white plates) |
| m1 | wonders | stopped — https://manus.im/app/X2ipdR4Y56aNNWrUEUuPVR — sheets 5/5 — **5 PASS** |
| l1 | music | stopped — https://manus.im/app/6Vbbf63UNJ5gwgTz4ahbET — sheets 5/5 — **3 PASS / 1 HOLD** (baked labels) + companion PASS |
| j4 | history | stopped — https://manus.im/app/dsAhVv2apsCZk27cHqyCPo — sheets 5/5 — **5 PASS** |
| k1 | careers | stopped — https://manus.im/app/DcPoTab79c5A7VoX4TQAa6 — sheets 5/5 — **5 PASS** |
| m2 | wonders | stopped — https://manus.im/app/EqgLuvbfxvKDu4YxS87JvU — sheets 5/5 — **5 PASS** |
| l3 | music | stopped — https://manus.im/app/HfVeKpgV2wqUhx7u6Vb4PA — sheets 5/5 — **4 PASS / 1 HOLD** (companion white plates) |
| math1 | math | stopped — https://manus.im/app/TzNi8Z6eJAv8J5fbe5ySLs — sheets 5/5 — **5 PASS** |
| j5 | history | stopped — https://manus.im/app/JYPN46UqENqA7dByfkJ4CT — sheets 5/5 — **5 PASS** |
| j6 | history | stopped — https://manus.im/app/fY9mqcpHNaEiix5uFcg3Ni — sheets 5/5 — **5 PASS** |
| j7 | history | stopped — https://manus.im/app/YSLUj9vs7GRqfmZFtHLNuM — sheets 5/5 — **3 PASS / 2 HOLD** (home-after footprint; companion hob drift) |
| l2 | music | stopped — https://manus.im/app/8SBDaETfP5quX73J6vVYzo — sheets 5/5 — **5 PASS** |

<!-- TASKS-END -->

## What we would regret if Manus went paid tomorrow

1. **Blank timeline stages** — unique play surface; era art can be in-housed later.
2. **Homes/kitchens/schools through time** — the bank is all *now* rooms; zero same-function-then plates.
3. **Canyon + glacier cutaways** — CDE spent the wonder slot on volcano/reef/trench posters-or-cutaways; canyon is still S1 dirt-floor; glacier does not exist.
4. **Orchestra section floor + recording glass** — concert-hall cinematic failed; C7 radio is a broadcast pipeline, not a music-making world.
5. **Dig grid + marine wet lab** — CDE owns strata cutaway + radio/sorting; S4 owns tools; these two workplaces are still missing.
6. **Market-share + unmarked beam lengths** — frames/clocks/graphs we can draw locally; share-places we cannot fake from a supermarket setting.

Skip without regret: more chef tools, another empty radio-studio, sorting depot, reef/trench/volcano, picnic-plan, songs, dated timelines, notation sheets.
