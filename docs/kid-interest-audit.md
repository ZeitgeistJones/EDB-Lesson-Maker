# Kid-interest + Overview-worlds audit (Shift60)

Stockpile-only. No producer wiring. Art → `harvested/kid-interest/` + `harvested/overview-worlds/` (PNG **do not git-add**).

Scanned: `public/assets/09_props` (~5389 PNG), `public/assets/07_vocab-pack` (~6736 PNG), `harvested/` (content-worlds, builder-worlds, board-enabling, `_harvested_aside_during_filter`).

Date: 2026-08-20.

## Depth classes

| Domain | Class | Evidence (filename hits / notes) | Action |
|---|---|---|---|
| Ordinary ESL nouns (apple/chair/classroom/weather/household/jobs) | **DEEP_ENOUGH** | Massive vocab+prop coverage; CW weather families; EDB settings | **SKIP** regenerate |
| Pet breeds / body-type variation | **PARTIAL** | dog~20 cat~31 pet~50 but mostly generic + hotdog noise; few distinguishable body types; hamster/rabbit thin | Manufacture body-type + pet-life gear |
| Other pets (bird/fish tank/reptile/carrier) | **THIN** | Scattered fish/tank; carrier weak | Manufacture |
| Instruments (named) | **PARTIAL→DEEP** | Many cases (hero-*-case) + guitar/drum/violin/brass present | Prefer music-life over more identical guitars |
| Music-life (amp/stand/headphones/cases as kit) | **PARTIAL** | mic~30; headphones~5; amp hits noisy; stands thin as a set | Manufacture kit sheet |
| Soccer / basketball gear | **DEEP_ENOUGH** | soccer~26 basket~58 | Skip endless balls |
| Tennis / ski | **PARTIAL** | tennis~14 ski~25 | Light top-up only if distinctive |
| Badminton / kayak / gymnastics / martial | **THIN** | badminton~2 kayak~2 gymnast~1 | Manufacture |
| Skate / surf / scooter | **PARTIAL** | skate~22 surf~10 scooter~6 + bags; ramp thin as family | Gear + ramp family OK; not more identical boards |
| Digital / gaming (unbranded) | **THIN** | controller~4 headset~6; no ring-light; no green-screen | Manufacture |
| Creator / streaming / video | **THIN / MISSING** | camera~20 webcam exists; ring-light/karaoke/green-screen **MISSING** | Manufacture |
| Craft / maker / sensory | **THIN** | clay/yarn/glue thin; slime/origami **MISSING**; craft ACTIONS thin | Manufacture |
| Board / card / tabletop | **THIN** | chess~14 board-game~4 | Light pack OK |
| Fun leisure vehicles (go-kart, bumper, pedal boat) | **MISSING / THIN** | go-kart **MISSING**; bumper~1; carousel/gondola hero shells only | Manufacture |
| Amusement / attractions | **PARTIAL** | carousel~6; park settings exist (long-tail skate-park stages) | Prefer vehicles + overview, not more empty parks alone |
| Outdoors / adventure | **PARTIAL→DEEP** | camp~35; climbing~15; BW camping-pitch done | Skip camping clone |
| Collections (stamps/rocks/marbles) | **THIN** | stamp/gem noise; marble thin; collect~1 | Manufacture mid-obscure kits |
| Dance / performance | **THIN** | dance~9; karaoke **MISSING** | Manufacture |
| Science hobbies | **THIN** | telescope~11; robot~10; fossil/terrarium thin | Manufacture kit depth |
| Unusual kid clubs | **MISSING** | No dedicated packs (magic, marble-run, walkie, DJ) | Discover + manufacture |
| Overview worlds (multi-zone playable) | **MISSING** | CW = empty stages; BW = modular bases; K5 = route tiles — **not** multi-zone overview portfolio | Manufacture FULL-PAGE |
| Mia/Leo human actions | **DEEP_ENOUGH** (for this pass) | Aggressive S4 poses exist | Do not regen poses |

## Already-deep — do not regenerate

- Apple / fruit dumps, chair/furniture dumps, classroom noun dumps
- Generic weather overlays / CW weather families already fired
- Household appliances, generic jobs, industrial micro-parts
- Endless soccer/basketballs; identical guitar clones; camping pitch kit (BW done)
- Orchestra case open/close heroes (already rich)
- Mia/Leo face/pose regen

## Gaps worth manufacturing (this shift)

1. Pet body types + pet-life gear (carrier, bowl, leash, litter, perch)
2. Music-life kit (stand, headphones, amp blank, cable coil board-scale, capo, sticks)
3. Active sports gear beyond balls (badminton, kayak, martial pads, gym rings)
4. Unbranded gaming + creator (controller variants, ring light, green screen, blank monitor, boom arm)
5. Craft/sensory (slime tub, clay tools, origami stack, bead tray) + action still-lifes
6. Leisure vehicles (go-kart, bumper car, pedal boat, snow tube)
7. Discovered mid-obscure (marble run, magic kit, DJ deck, walkie pair, fossil dig, archery, stilts, hammock camp-lite)
8. Overview worlds full-page multi-zone (skate plaza, lakeside marina, maker fair, island cove, winter festival, observatory ridge)

## Harvested context (not PropBank)

- `harvested/content-worlds` — weather + everyday stages (not overview-worlds)
- `harvested/builder-worlds` — 6 modular kits done (canal, kaiten, bakery, market, theatre, camping)
- `harvested/board-enabling` + aside — multi-view / route / registered states (technical, not kid-hobby depth)
- No `harvested/kid-interest/` or `harvested/overview-worlds/` before this shift

See also: `docs/kid-interest-portfolio.json` (discovery list + rankings).
