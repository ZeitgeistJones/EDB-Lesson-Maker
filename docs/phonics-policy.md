# Phonics policy (producer)

CEFR-gated sound-box rules live in [`public/lib/phonicsPolicy.js`](../public/lib/phonicsPolicy.js). Gemini prompts (`api/generate-lesson.js`, `server.js`) and board normalize (`EdbActivities.normalizePhonics`) both use this module.

## Matrix

| Level | Include | Word types | Boxes | Distractors |
|-------|---------|------------|-------|-------------|
| A1 | yes (auto) | CVC, single-letter graphemes only | 3 | 1–2 |
| A2 | yes (auto) | + CCVC/CVCC + sh/ch/th/ck | 3–4 | 2–3 |
| B1 | only if forced / keyword | + vowel teams, magic-e, simple 2-syllable | 3–5 | 3–4 |
| B2 | only if forced / keyword | + multisyllabic / r-controlled | 4–6 | 3–5 |
| C1+ | omit unless `phonics=on` | — | — | — |

## Vocab-first

1. Prefer decodable words **from lesson vocabulary**.
2. Drop irregular Gemini words (castle, knight, …) that fail the level gate.
3. Fill from a small **fallback bank** so the page still ships when vocab is irregular.

Teacher scripts stress **letter sounds, not letter names** (EFL-appropriate).

## Smoke

```bash
npm run test:phonics
```
