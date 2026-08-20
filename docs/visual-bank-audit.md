# Visual bank audit — 2026-08-04

Question asked: what art is missing, is there a free source for it, and what is
worth spending the ~$5 OpenAI credit on.

Short answer: the bank was less short of art than it was wrong about the art it
already had, and fixing that cost nothing. Only about fifteen words and seven
scenes are genuinely worth generating.

## What is in the bank

| Folder | Count | Source | Commercial use |
|---|---|---|---|
| `01_characters`, `05_source-svg` | 88 | Open Peeps (CC0), illlustrations.co (MIT) | yes |
| `02_scenes-backgrounds`, `04_decoration-ui`, `06_board-ready-png` | 72 | project-authored + illlustrations.co | yes |
| `07_vocab-pack` | 309 | Twemoji (CC BY 4.0, credited) | yes, with credit |
| `08_backgrounds` | 40 scenes + 4 flats | generated for this project | yes |
| `09_props` | 41 | generated for this project | yes |

## The finding: a fifth of the vocab pack taught the wrong word

The original 309-icon pack started life as 170 icons matched by fuzzy string
comparison between the lesson word and Twemoji shortnames. Nobody looked at the
result. Roughly a fifth of it named something else entirely:

| Word | Showed | Should be |
|---|---|---|
| corn | 🐹 hamster | 🌽 |
| school | 🚌 bus | 🏫 |
| computer | 📀 dvd | 💻 |
| lamp | 🧞 genie | 💡 |
| table | 🏓 ping-pong paddle | (no emoji exists — dropped) |
| glove | 🥎 softball | 🧤 |
| water | 🦆 duck | 💧 |
| grass | 🐄 cow | 🌿 |
| plane | 🧑‍✈️ pilot | ✈️ |
| heart | 💋 kiss | ❤️ |

Separately, eight groups of words shared a single picture — `cheese`, `milk`,
`grass` and `cow` were all the same cow; `car` and `taxi` the same taxi; `sun`,
`fire` and `beach` the same sun. On a drag-to-match page that is not a hard
activity, it is an impossible one.

The `PACK_ALIASES` table made this worse in the core lessons by design:
`doctor`, `nurse`, `patient` and `sick` were all aliased to the hospital
building, so the flagship doctor lesson shipped a match page with three
identical cards.

**Why the harness missed it.** `M7` counted a word as having good art if a pack
file existed for it. A file existing says nothing about whether the picture is
right, and nothing about whether three words point at it. Both are now checked:
art shared between words no longer counts toward coverage, and the duplicate
report keys on the resolved file, not just the emoji.

## What was fixed for free

`scripts/fetch-vocab-icons.mjs` rebuilds the pack from Twemoji with every
word→emoji pair chosen by hand. It refuses to build if two words resolve to the
same picture, so this class of bug cannot come back silently.

The pack went from 170 words to 309, closing the categories the old one had
nothing for: jobs, family, feelings, actions, health, travel procedure,
classroom and home objects. Cost: nothing. Twemoji is CC BY 4.0 and the credit
line is already in the asset ledger and in `vocabIcons.js`.

Measured effect on the fixtures — share of vocab with correct, unshared art:

| Lesson | Before | After |
|---|---|---|
| doctor | 0.25 | 1.00 |
| overflow (air travel) | 0.17 | 0.75 |
| minimal (playground) | 0.00 | 0.50 |
| travel, school | 1.00 | 1.00 |

Two core lessons dipped from 1.00 to 0.75, and that is the honest number: they
were previously credited for `diagnosis` shown as a clipboard and `clumsy` shown
as a cartwheel. Those are guesses, so they are wishlist rows now.

## Free sources reviewed

| Source | License | Verdict |
|---|---|---|
| Twemoji (jdecked fork) | CC BY 4.0 | **in use** — 309 icons, one consistent style, credit already given |
| unDraw | free commercial, no attribution | worth a look later for story/scene illustration; wrong shape for single-word icons |
| Open Peeps | CC0 | already in bank for characters |
| Humaaans | CC BY 4.0 | recommended manual drop, still not fetched |
| illlustrations.co | MIT | already in bank |
| Openclipart, Public Domain Vectors | CC0 | quality too uneven, style clashes with Twemoji |
| Kenney | CC0 | game art, wrong style |
| OpenMoji | CC BY-**SA** 4.0 | **rejected** — share-alike is a bad fit for sellable lesson PDFs |
| Noto Emoji | OFL 1.1 | usable, but a second emoji style on the same board looks like a mistake |
| Pixabay, Pexels | own license, commercial ok | photos clash with the flat board style; model and trademark risk |

No free bank covers what is left, because what is left is not icon-shaped.
"Cramped", "tidy" and "turbulence" are little scenes, not objects.

## What the $5 should buy

Prices as of Aug 2026: GPT Image 1.5 is about $0.034 per medium 1024x1024 and
$0.20 per high 1536x1024; GPT Image 1 is retiring in October and should not be
used for new work.

| Batch | Count | Size / quality | Est. |
|---|---|---|---|
| Scene backgrounds: hotel lobby, office, stadium, party room, snowy street, train platform, vet clinic | 7 | 1536x1024 high | $1.40 |
| Abstract adjective pairs: cramped/spacious, tidy/cluttered, cosy | 5 | 1024x1024 medium | $0.17 |
| Cafeteria and travel words: tray, queue, napkin, delicious, security, turbulence, connection | 7 | 1024x1024 medium | $0.24 |
| Playground swing, plus a purpose-drawn doctor/nurse pair | 3 | 1024x1024 medium | $0.10 |
| Retry headroom (2-3 attempts is normal) | — | — | ~$2 |

About $4 of the $5, with the scenes taking most of it because they are seen
full-board and the existing 40 set a quality bar the new ones have to match.

Do the scenes first: a missing scene drops a whole page back to a flat
background, which is far more visible to a student than one imperfect word icon.
