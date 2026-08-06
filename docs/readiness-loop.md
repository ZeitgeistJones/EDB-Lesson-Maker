# Readiness loop

Random A1 topic titles scored for **vocab art** + **place flat BG coverage**.
Hero / king-stage kit reasons are ignored (`BoardReadiness.assess(..., { ignoreKit: true })`).

```bash
npm run test:readiness-loop              # default round=1 seed=42
npm run test:readiness-loop -- --round=2 --seed=42
```

Artifacts: `tmp/readiness-loop/round-N.json`  
Script: `scripts/readiness-loop.mjs`

## Scoreboard

| Round | Seed | Ready | Draft | Ready % |
|-------|------|------:|------:|--------:|
| R1 | 42 | 22 | 8 | 73% |
| R2 | 42 | **30** | **0** | **100%** |

Same 30-title pool (shuffled with seed 42). Gate = vocab art ≥50% **and** place themes have a TOPIC_SETS row with ≥2 quiet flats.

## What the gate checks (non-hero)

1. **Vocab art floor** — PropBank resolve **or** curated Twemoji pack hit (`VocabIcons.isCurated` after index load).
2. **Place BG coverage** — `SceneBackgrounds.bgCoverage`: place topic with no TOPIC_SETS row, or matched set with &lt;2 quiet flats → draft reason.
3. **ignoreKit** — skips theme-kit / heroProp / generic-template reasons so this loop stays honest about vocab+bg only.

### Human / agent BG bar (beyond file count)

The automated gate only checks that a place set **exists** (≥2 quiet flats).
That is **not** visual quality. “4 flats exist” must not be treated as a pass
when judging boards or shipping new sets. Agents must still apply the
**place-true motif** bar from `.cursor/skills/bg-flat-sets/SKILL.md` and
`docs/bg-theme-sets.md` Anti-formula: corner motifs must make the place
unmistakable in one second (bakery → dough/flour/loaf — not wheat-as-warmth).
If motifs are formulaic, fix the skill/prompt process, then regenerate — do not
only patch one PNG and leave the formula in place.

## R1 → R2: what failed the gate

| Draft title (R1) | Reasons |
|------------------|---------|
| Morning at the Bakery | `bakery-warm` had 0 flats |
| Beach Day Fun | `beach-warm` had 0 flats |
| Supermarket Shopping | falsely locked to `bakery-warm` via vocab “bread”; set empty |
| Fruit Market | place signal, no TOPIC_SETS row |
| Farm Animals | place signal, no TOPIC_SETS row |
| Hotel Stay | place signal, no TOPIC_SETS row |
| Swimming Pool | vocab &lt;50% + no TOPIC_SETS |
| Library Quiet Time | falsely treated as place gap (school → house deck) |

## Fixes made

| Area | Change |
|------|--------|
| Pack honesty | `isCurated` counts Twemoji pack resolves (not only SAFE_EMOJI) |
| BoardReadiness | `assess(lesson, plan, { ignoreKit, bgManifest })` + bg gap reasons |
| SceneBackgrounds | `bgCoverage` / `isPlaceTopic` / `setFor` exported; TOPIC_SETS for beach, bakery, market, hotel, farm, pool/swim |
| Bakery regex | place nouns only — bare “bread” no longer steals supermarket onto bakery |
| Library | removed from PLACE_SIGNALS (stays on `board-house`) |
| PACK_ALIASES | cart→shopping cart, shop→store, pool→swim, float→boat, bakery/oven/flour→bread, … |
| Flats | in-house `beach-warm` + `bakery-warm` (4 panels each) imported + manifest wired |

## Asset gap tally (R2 residual)

Lessons are Ready, but these words still miss pack/prop art (below floor, for wishlist):

`plate`, `knife`, `stop`, `street`, `wake`, `camp`, `forest`, `feed`, `party`

No remaining **bgGap** sets for the R2 pool. Future place themes without TOPIC_SETS (e.g. restaurant-only titles if added) should follow `.cursor/skills/bg-flat-sets/SKILL.md`.

## Wired place sets (picker)

| Set | Topics |
|-----|--------|
| `clinic-cool` | dentist / doctor / hospital |
| `travel-air` | airport / travel / train / bus |
| `home-warm` | home / family / hotel |
| `outdoor-fresh` | park / zoo / farm / pool / market / sport / volcano |
| `beach-warm` | beach / ocean / shore |
| `bakery-warm` | bakery / café |
| `board-house` | default (face, school, library, unmatched) |
