# Vocab image audit

Generated: 2026-08-16T22:45:30.757Z

## Overall

- Lessons audited: **93**
- Generate errors (excluded): **0**
- Total vocab words: **739**
- Successes: **651** (88.1%)
- Failures: **88** (11.9%)
- Board-slice words: **520** · board failures: **21** (4.0%)

## Lesson-level (board slice)

- Zero missing: **80** / 93
- ≥1 missing: **13** / 93
- Multiple missing (≥2): **5** / 93

## Failure causes

- `no exact key`: 50
- `silent blank slot`: 36
- `render insertion failure`: 2

## Worst offender words

- `rollercoaster`: 2
- `game`: 2
- `recipe`: 2
- `price`: 2
- `acrobat`: 2
- `ball`: 2
- `tent`: 2
- `check-in`: 1
- `keeper`: 1
- `crust`: 1
- `eyelashes`: 1
- `warm-up`: 1
- `pasture`: 1
- `livestock`: 1
- `poultry`: 1
- `change`: 1
- `reception`: 1
- `reservation`: 1
- `suite`: 1
- `check-out`: 1
- `amenity`: 1
- `housekeeping`: 1
- `checkup`: 1
- `pain`: 1
- `route`: 1

## Failure key patterns

- single-token: 82
- hyphenated: 4
- long-closed-compound: 2

## Topics with highest fail rate

- Hotel Stay: 53.3% (8/15 across 2 lesson(s))
- Campsite Fun: 50.0% (3/6 across 1 lesson(s))
- Circus Comes to Town: 50.0% (3/6 across 1 lesson(s))
- Rainforest Trek: 42.9% (3/7 across 1 lesson(s))
- Photography Class: 41.7% (5/12 across 1 lesson(s))
- One Fruit Card: 33.3% (1/3 across 1 lesson(s))
- Recycling Center: 28.6% (2/7 across 1 lesson(s))
- Farm Animals: 27.3% (3/11 across 1 lesson(s))
- Amusement Park: 25.0% (3/12 across 2 lesson(s))
- Volcano Science: 25.0% (3/12 across 1 lesson(s))
- Circus Day: 25.0% (3/12 across 1 lesson(s))
- Fire Station Visit: 25.0% (2/8 across 1 lesson(s))
- Learning how to do a backflip on my trampoline: 25.0% (2/8 across 1 lesson(s))
- Playing Basketball with Friends: 25.0% (1/4 across 1 lesson(s))
- Supermarket Shopping: 20.0% (4/20 across 2 lesson(s))

## Amusement-park debug

| word | normalized key | exact index? | path resolved? | file on disk? | on board? | outcome | failure reason |
|---|---|---|---|---|---|---|---|
| ticket | ticket | yes | yes | yes | yes | ok (prop: gash-prize-ticket.png) | — |
| popcorn | popcorn | yes | yes | yes | yes | ok (pack: popcorn.png) | — |
| ferris wheel | ferris-wheel | yes | yes | yes | yes | ok (pack: ferris-wheel.png) | — |
| entrance | entrance | yes | yes | yes | yes | ok (pack: entrance.png) | — |
| rollercoaster | rollercoaster | no | no | no | no | FAIL (no exact key) | no exact key |
| prize | prize | yes | yes | yes | yes | ok (pack: prize.png) | — |

Board after adapt: ticket, popcorn, ferris wheel, entrance, prize, amuse
Overflow: rollercoaster, fun, park, amused, amusement park fun, bench park, car park, amusement

## Single best fix (producer)

**Do not force blank-art words onto the board via core-complete padding.** Of 21 board-slice failures, **17 are `no exact key`** (Gemini teach words with no pack/prop/glyph) and only 3 are pack-present `silent blank slot` (often sense-blocked, e.g. sports `game`). `adaptBoardVocabulary` already overflows no-art words when free to shrink — core-complete keeps them as empty cards. Prefer pictured theme/brief fills (or an honest shorter board) over blank New Words slots.

Already shipped with this audit: closed-compound → hyphen pack bridge (`ferriswheel` → `ferris-wheel`). True gap example: commission `roller-coaster.png` later — do not alias to drink-`coaster`.
