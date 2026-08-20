# CEFR-J Wave1 — redo list

**At:** 2026-08-16  
**Manus sends this pass:** **3 done + imported** (P1 + S50 + V01; cap ≤3)  
**Pack:** nouns **520/520** · verbs **32/32** (**72** keys refreshed this pass)

Keep tracks separate:

| Track | What it fixes |
|-------|----------------|
| **Empty / stopped task** | Missing sheets / dead known IDs |
| **Quality redo (iconey)** | Banked art exists but looks emoji / UI-glyph / flat icon |

---

## Quality redo — Shift30 send A (2026-08-16) — imported

| Label | task_id | URL | Sheets | Status |
|-------|---------|-----|--------|--------|
| qr-n1 P0a | `eM66pbFquYPgvmCy6WQCst` | https://manus.im/app/eM66pbFquYPgvmCy6WQCst | S40, S44, S45 | **imported** 27 keys |
| qr-n2 P0b | `YcK7cWMdYYW6hBoHJ7EGVu` | https://manus.im/app/YcK7cWMdYYW6hBoHJ7EGVu | S55, S57, S58 | **imported** 25 keys |
| qr-v V03 | `DFMh9WWTH3Pay2xKy4pPU2` | https://manus.im/app/DFMh9WWTH3Pay2xKy4pPU2 | V03 (`cefrj-verbs-03`) | **imported** 9 keys |

## Quality redo — Shift30 send B (2026-08-16) — imported

| Label | task_id | URL | Sheets | Status |
|-------|---------|-----|--------|--------|
| qr-n3 P1a | `DbdpVXRbtHt3KUFUbd7HYy` | https://manus.im/app/DbdpVXRbtHt3KUFUbd7HYy | S27, S28, S31 | **imported** 27 keys |
| qr-n4 P1b | `LYCbzARDGNVYh8xBN8Mfqk` | https://manus.im/app/LYCbzARDGNVYh8xBN8Mfqk | S34, S37, S50, S56 | **imported** 36 keys (S50 = P0 leftover) |
| qr-v V01 | `cn4Mr5nPLRrsDPGWGcWQaN` | https://manus.im/app/cn4Mr5nPLRrsDPGWGcWQaN | V01 (`cefrj-verbs-01`) | **imported** 9 keys |

Scripts: `scripts/manus/request-shift60-cefrj-nouns-wave1-quality-redo.mjs` (`--batch=p1a|p1b`), `…-verbs-wave1-quality-redo.mjs` (`--sheets=V01`), poll `wave1-quality-redo-poll-import.mjs`.

**Cooking:** none.  
**Skipped this pass:** P2 · V02 · V04.

---

## Empty / stopped task redo

**Coverage gaps: none.** Earlier n3 was 5/11 (S28–S33); re-fetch after Manus finished → 11/11 imported.

### Known task IDs — fetch + import status

| Label | task_id | URL | CDN fetch | Plan sheets | Pack keys | Status |
|-------|---------|-----|-----------|-------------|-----------|--------|
| n1 | `YWnz39PPMpSWqMzCjXCXoq` | https://manus.im/app/YWnz39PPMpSWqMzCjXCXoq | **0 images** (stopped) | 11 (01–11) | 99/99 via supersede | **empty** (known ID) |
| n2 | `m2MXrPd63XSpAisndwBJsG` | https://manus.im/app/m2MXrPd63XSpAisndwBJsG | 11/11 | 11 (12–22) | 99/99 | **ok** |
| n3 | `YSB3NyimFhC9yDEdbWosYJ` | https://manus.im/app/YSB3NyimFhC9yDEdbWosYJ | 11/11 (was 5; finished) | 11 (23–33) | 99/99 | **ok** |
| n4 | `VprmqRsPxmj7SiYY34K5JH` | https://manus.im/app/VprmqRsPxmj7SiYY34K5JH | **0 images** (stopped) | 11 (34–44) | 99/99 via supersede | **empty** (known ID) |
| n5 | `cVkwdaeanyAA8DtCQZ2Eyf` | https://manus.im/app/cVkwdaeanyAA8DtCQZ2Eyf | 11/11 | 11 (45–55) | 99/99 | **ok** |
| n6 | `ckTHW4o6mUXgUaAx9miRSb` | https://manus.im/app/ckTHW4o6mUXgUaAx9miRSb | 3 unique | 3 (56–58) | 25/25 | **ok** |
| v1 | `4zhL6Mni6QMSdQEpKVnjFq` | https://manus.im/app/4zhL6Mni6QMSdQEpKVnjFq | 4/4 | 4 | 32/32 | **ok** |

### Superseding IDs that delivered art (do not treat as missing)

| Covers | Supersede task_id |
|--------|-------------------|
| n1 sheets 01–11 | `fC9oognx5iTEkcFLY9pMZn` |
| n4 sheets 34–44 | `eVegWP4zwWEZkQdzXW5ez5` |
| n2 also-ok | `fEuja8Kt2TR2Mnkodn7n2W` |
| n5 also-ok | `Bgc4k7SMJxSK6dF5w86Nbo` |
| n6 also-ok | `Ww6HXKqY9RSxFuPtgtz3TX` |
| v1 also-ok | `8kn5SdG2HRbUkAmsGdPeGw` |

**Empty redo still needed:** **none for missing keys.** Never re-fire known empty IDs `YWnz39…` / `Vprmq…` / dead `WGc6…` / accidental `XGKE…`. Optional new Perfect-11 only if supersede art is rejected on quality review.

---

## Quality redo (iconey)

**Hypothesis:** concurrent Perfect-11 blast → many sheets collapsed to flat generic icon / emoji / UI-glyph look instead of rich ESL still-life / kid-illustration cutouts.

**Spot-check:** opened staged contact sheets under `assets-inbox/manus-cefrj-nouns-w1` (S23–S58) + `manus-cefrj-verbs-w1`, plus pack cells (`skateboarding`, `receptionist`).

**Sheets sampled:** **21** contact sheets (17 nouns + 4 verbs) + pack spot-checks.

Severity:

- **P0** — silhouette / UI-glyph junk; re-commission whole sheet
- **P1** — strong flat icon-pack; re-commission sheet or worst cells
- **P2** — soft clipart; banked OK as stopgap

### P0 — whole-sheet redo

| Sheet | Theme | Why | Keys | Redo status |
|-------|-------|-----|------|-------------|
| **S40** | `cefrj-nouns-40` | Emoji **mood** (sun/cloud faces); red-X **mistake** doc; silhouette **model** | meter, middle, mineral-water, mistake, model, mood, mosque, mp3-player, murder | **imported** qr-n1 |
| **S44** | `cefrj-nouns-44` | Blank-face figures; rainbow-heart **pride**; star-row **rating**; silhouette **public** | policewoman, portrait, pride, pro, promise, psychologist, public, quiz, rating | **imported** qr-n1 |
| **S45** | `cefrj-nouns-45` | Two-tone blue/peach **UI icon set** | receptionist, release, rent, reply, report, request, research, response, reunion | **imported** qr-n1 |
| **S50** | `cefrj-nouns-50` | **White silhouettes on grey cards** — not white-field ESL still-lifes | sitting-room, skateboarding, skating, skiing, slave, snack, snowboarding, soda, soft-drink | **imported** qr-n4 |
| **S55** | `cefrj-nouns-55` | Same white-on-grey silhouette / UI-glyph treatment | thief, thunderstorm, tights, tip, title, tone, tonight, toothache, tour | **imported** qr-n2 |
| **S57** | `cefrj-nouns-57` | Browser/wireframe **website** / **web-page**; emoji **weep** face | video-game, visitor, vocabulary, walking, washing-up, web-page, website, wedding, weep | **imported** qr-n2 |
| **S58** | `cefrj-nouns-58` | Mono charcoal glyphs + thin/empty-looking cells | weight, west, winner, wisdom, writing, youth, zone | **imported** qr-n2 |

### P1 — strong iconey (prefer sheet redo)

| Sheet | Theme | Why | Worst keys | Redo status |
|-------|-------|-----|------------|-------------|
| **S27** | `cefrj-nouns-27` | Icon metaphors; on-art labels on some drops | dislike, director, doubt, disco | **imported** qr-n3 |
| **S28** | `cefrj-nouns-28` | Schema icons (east=arrow, envy=gem) | east, envy, ending, driver's-license | **imported** qr-n3 |
| **S31** | `cefrj-nouns-31` | Flat badge/flag icons; label risk | first-name, final, fiction, feel | **imported** qr-n3 |
| **S34** | `cefrj-nouns-34` | Blank-face **headteacher**; stock medal/ghost | headteacher, horror, honor, help | **imported** qr-n4 |
| **S37** | `cefrj-nouns-37` | Nav glyph **left**=arrow; map **lane** | left, lane, lawyer, lack | **imported** qr-n4 |
| **S56** | `cefrj-nouns-56` | Schematic **traffic**; abstract **unit**/**verb** glyphs | traffic, truth, unit, verb, training | **imported** qr-n4 |

### P2 — soft / borderline (optional later)

| Sheet | Theme | Note |
|-------|-------|------|
| **S23** | `cefrj-nouns-23` | Object still-lifes readable; still clipart-flat |
| **S25** | `cefrj-nouns-25` | Same; couple/creature lean emoji |
| **S48** | `cefrj-nouns-48` | Seaside objects OK; set/shadow abstract |
| **S52** | `cefrj-nouns-52` | Clearer props (stomach, suit) but icon-pack finish |

**Not fully sampled** (second-pass candidates): S24, S26, S29–S30, S32–S33, S35–S36, S38–S39, S41–S43, S46–S47, S49, S51, S53–S54 — watch for same P0 silhouette/emoji pattern.

### Verbs wave10

| Sheet | Theme | Verdict | Keys | Redo status |
|-------|-------|---------|------|-------------|
| **V01** | `cefrj-verbs-01` | **P1** — flat sticker characters; **disappear**=silhouette+puff | add, beg, chat, check, create, disappear, divide, exercise, finish | **imported** qr-v V01 |
| **V02** | `cefrj-verbs-02` | **P2** — clipart scenes; optional upgrade | frighten, graduate, grow, help, hurry, invent, marry, move, offer | skip |
| **V03** | `cefrj-verbs-03` | **P1** — flat; **pollute** factory+arrow glyph | perform, play, pollute, pray, prepare, pretend, receive, relax, shut | **imported** qr-v |
| **V04** | `cefrj-verbs-04` | **P2** — richer scenes; only 5 keys by plan | spell, step, sweat, wander, work | skip |

**Verb priority:** redo **V01** / **V03** before V02/V04 — **both done**.

---

## Future brief note

Brief templates + quality-redo runners strengthen anti-iconey language:

- Prefer concrete **still-life / kid-illustration cutouts** with soft shading and material cues  
- **Avoid** emoji-flat UI glyphs, mono silhouettes on grey cards, on-art text/labels, symbolic arrows/hearts/browser chrome when a physical prop exists  

---

## Pack policy

- **No cull** of banked keys from this audit.
- Prefer sheet-level re-commission over hand-Photoshop.
- Do **not** resend superseded empty task IDs.

## Confirm

- Empty/coverage gaps: **none** (520/520 + 32/32)
- Quality redo P0 imported: **S40, S44, S45, S50, S55, S57, S58** (+ V03)
- Quality redo P1 imported: **S27, S28, S31, S34, S37, S56** (+ V01)
- Sheets sampled: **21**
- Manus createTask send B: **3** (cap) — all landed + imported; **nothing cooking**
- Still optional later: P2 · V02 · V04

## Import artifacts (coverage crew)

- Audit JSON: `tmp/cefrj-manus/wave1-audit.json`
- Noun import: `tmp/manus-shift60-cefrj-nouns-wave1/import-summary.json`
- Verb import: `tmp/manus-shift60-picturable-verbs-import/import-summary.json`
- Quality redo poll: `tmp/cefrj-manus/wave1-quality-redo-poll-snapshot.json`
