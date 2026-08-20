# Board quality & lesson production — audit brief

**Audience:** Independent reviewer (human or AI) auditing process design, gaps, and incentives.  
**Product:** ESL lesson → ClassIn `.edb` board generator (`PPT-Lesson-Maker-for-Classin`).  
**Stack:** Vanilla JS frontend, Express/Vercel API, Gemini structured JSON, Playwright headless bake.  
**Date context:** 2026-08 (post story-art spike + CEFR phonics policy).  
**North-star rule:** Fix the **producer** (prompts, gates, recipes, importers, pickers), then regenerate — do not hand-patch one lesson artifact.

---

## 1. End-to-end product pipeline

```
Teacher topic + CEFR + duration + phonics flag
        │
        ▼
POST /api/generate-lesson  (Gemini + LESSON_SCHEMA)
        │
        ▼
Lesson JSON (title, warmUp, vocabulary, phonics?, story, speaking, activity, …)
        │
        ├─► Optional: POST /api/generate-story-art  (async; STORY_ART=1)
        │         style ref → page images → vision “legible text?” gate
        │
        ▼
Client: EdbActivities.plan / buildBoardPlan
        │  recipes: matchDock, phonicsSoundBoxes, coverAnswer, heroProp, …
        │  PropBank kits, SceneBackgrounds picks, PhonicsPolicy.normalize
        │
        ▼
BoardReadiness.assess  → UI “Ready” vs “Draft” (non-blocking)
        │
        ▼
LessonPages.render (1280×590 DOM pages) + applyStoryArt if cached
        │
        ├─► buildLessonPdf (parallel text path; NOT recipe/board spine)
        └─► EdbKit.buildLessonEdb (html2canvas lock pages + unlocked pieces)
```

**Important:** Clicking “Generate” does **not** run the quality bake. Generation returns JSON only. Quality is a separate CLI/agent loop over fixtures.

---

## 2. Lesson generation (producer: text)

| Item | Detail |
|------|--------|
| Entry | `api/generate-lesson.js` (Vercel) / twin route in `server.js` |
| Auth | `GEMINI_API_KEY`; models `GEMINI_MODEL` + `GEMINI_FALLBACK_MODELS` |
| Output | Strict JSON via `responseMimeType` + `responseSchema: LESSON_SCHEMA` |
| Counts | Hard-coded by duration (30 vs 60 min vocab/story/comprehension) |
| Phonics | `PhonicsPolicy.promptBlock(level)` — CEFR-gated; vocab-first; omit C1+ unless forced |
| Validation | HTTP + JSON.parse only; **no** deep semantic validation server-side |
| Fallback | Capacity errors retry next model; invalid JSON → 502 (not always retried) |

Schema lives only as Gemini `responseSchema` + fixtures — **no TypeScript types**.

---

## 3. Board planning (producer: structure)

| Module | Role |
|--------|------|
| `edbLayout.js` | Zone templates per page type; place/dock; overlap policy |
| `edbActivities.js` | Recipes + `plan()` assignments; `buildBoardPlan()` |
| `propBank.js` | Prop resolve, aliases, family (matte/glossy), `assessKit` |
| `vocabIcons.js` | Twemoji / generated pack; aliases; overrides |
| `phonicsPolicy.js` | CEFR normalize + fallback bank + Gemini prompt fragment |
| `sceneBackgrounds.js` | Flat/scene picks; topic sets; ink policy helpers |
| `boardReadiness.js` | Pre-download Ready/Draft gate |
| `renderLessonPages.js` | DOM page builders (`makeTitle` … `makeWrap`) |
| `buildEdb.js` | Binary `.edb` writer |
| `storyArt.js` + `api/generate-story-art.js` | Optional realtime story illustrations |

### Current recipes typically assigned by `plan()`
- `matchDock` on New Words (if dock can be honest size)
- `phonicsSoundBoxes` when `includePhonics`
- `coverAnswer` on first speaking sample
- Activity: `heroProp` if kit/hero exists, else `dressUp` / `sortBins` / `buildScene`

Docs (`docs/edb-lesson-spec.md`) may drift from current `plan()` (fewer recipes auto-assigned than historically documented).

### Phonics normalize (client)
- Level matrix: A1 CVC-only 3 boxes / 1–2 distractors; A2 + digraphs/blends; B1+ richer if on; C1+ omit unless forced
- Drop illegal Gemini splits; prefer lesson vocab; fill from `FALLBACK_BANK`
- Teacher script bias: sounds not letter names

### Story art (optional)
- Gated `STORY_ART=1` + UI checkbox
- Style reference + per-page image; vision text gate; prompt-only fallback if style fails
- Session cache; applied at EDB/preview bake time — **not** in “Download Lesson PDF”

---

## 4. BoardReadiness (app-time soft gate)

**File:** `public/lib/boardReadiness.js`  
**When:** After generate, async in UI.  
**Blocking download?** No — Draft still downloadable with warning.

Checks (approx):
1. **Vocab art floor** ≥ 50% of words have PropBank hit **or** curated VocabIcons (`isCurated`)
2. **Kit / hero-stage** honesty when activity implies a build/stage board
3. Optional bg manifest sanity

Statuses: `ready` | `draft` + human-readable `reasons[]`.

---

## 5. Quality bake / preflight (machine loop)

### Commands
```bash
npm run quality              # core fixtures
npm run quality:full         # core + adversarial
npm run quality:status       # loop memory + review queue
npm run quality:judge -- tmp/verdict.json
npm run quality:baseline     # snapshot metrics for regression
npm run preflight            # alias path → smoke-bg + verify-board-visual
```

### Orchestration (`scripts/preflight-boards.cjs`)
1. `scripts/smoke-bg-picks.mjs` — background picker smoke  
2. `scripts/verify-board-visual.cjs` — headless Playwright bake of fixture lessons → contact JPGs + metrics  
3. Exit **0** only if **hard rules** pass. Soft metrics do not alone fail the process exit (they flag for the agent).

### Artifacts
- `tmp/board-bg-verify/report.json`
- Per-case `contact.jpg`, `page-*.jpg`, `review.json` queues
- Memory: `scripts/quality-state.json`, `docs/quality-log.md`, `scripts/quality-baseline.json`

### Fixture cases
Defined in `scripts/fixtures/cases.json` + lesson JSON under `scripts/fixtures/` (e.g. gym, travel, zoo-phonics, castle, dental, …).

---

## 6. Hard rules (H*) — bake must pass

From `scripts/ux-board-rubric.cjs` / `verify-board-visual.cjs`:

| Code | Meaning |
|------|---------|
| **H1** | Wrong / inappropriate place **scene** for topic on activity/EDB page |
| **H2** | Background system broken: no flat/scene mix, flats not rotating, drill page got a scene, flat band too wide/narrow, title/vocab/activity pick type wrong |
| **H3** | Layout: piece off-board, center in header/bodyText, unlocked IoU > 0.4, navigability failures |
| **H4** | Old solid gradient chrome still present (scenes/flats never applied) — corner pixel heuristic |
| **H5** | matchDock **answer leak** — vocab cards embed the same icons as the dock (dishonest) |
| **H6** | Page count > ClassIn limit (50) |
| **H7** | Prop art wrong aspect / `09_props` art without PropBank provenance |

Hard failures → agent must fix **producer** and re-bake (max 7 iterations in skill).

---

## 7. Measured metrics (M*) — soft until calibrated

| Code | Measures | Worse when | Warn / Fail (approx) |
|------|----------|------------|----------------------|
| **M1** | Smallest text px | lower | 22 / 14 |
| **M2** | Share of text on busy bg without card/wash | higher | 0.15 / 0.35 |
| **M3** | Primary card fill (text/card area) | lower | 0.18 / 0.10 |
| **M4** | Share of pages with ≥1 non-text visual | lower | 0.50 / 0.30 |
| **M5** | Background variety index | lower | 0.45 / 0.30 |
| **M6** | Min header contrast ratio | lower | 4.5 / 3.0 |
| **M7** | Vocab with vetted unique art | lower | (case-level honesty) |
| **M8** | Vertical content reach (skip title/wrap) | lower | 0.62 / 0.45 |
| **M9** | Dead-space ratio | higher | (page sparse) |
| **M10** | Smallest unlocked interactive piece (min side px) | lower | ~8 fail band |

**R1:** Regression vs `scripts/quality-baseline.json` (metric worse than snapshot).

Metrics are **hints** for the vision judge — skill says confirm/overrule with eyes.

---

## 8. Soft vision codes (S*) + dual lens

Agent (or human) views `contact.jpg` + queued `page-*.jpg` as:

**Student:** readable? know what to do? dock art = word meaning? fun vs form?  
**Teacher:** cold-run in &lt;5s? activity honest? BGs topic-fit + not copy-paste? parent-safe?

Pillars (scored 0–3 per case): `readable`, `navigable`, `accurateVocabArt`, `backgroundVariability`, `funCharming` (plus honesty cluster).

Soft codes (S*) live in `ux-board-rubric.cjs` — agent-judged from images (e.g. charm, wrong emoji, busy bg). Exact S-list is in that file; unknown codes rejected by judge CLI.

---

## 9. Verdict → next action (`quality:judge`)

Agent writes `tmp/verdict.json`:

```json
{
  "lens": { "student": "...", "teacher": "..." },
  "scores": { "<caseId>": { "readable": 0-3, "navigable": 0-3, "accurateVocabArt": 0-3, "funCharming": 0-3 } },
  "findings": [
    {
      "code": "M6|H3|S…",
      "caseId": "gym",
      "pageKey": "newWords",
      "note": "…",
      "root": "dark-flat-contrast",
      "clearFix": true,
      "assetGap": false
    }
  ],
  "clean": false
}
```

`scripts/quality-verdict.cjs` validates codes, updates state/log, prints **NEXT ACTION**, e.g.:
- Fix hard failures this iteration  
- Fix soft finding with `clearFix`  
- **P1 promote:** same soft `root` twice → implement a craft-roadmap easy win  
- **Wishlist:** `assetGap: true` — don’t force wrong art  
- Declare clean only after `quality:full` (+ optional baseline)

**Max iterations:** 7 (`MAX_ITERATIONS` in rubric).

**Allowed fix scope (skill):** producer code/skills/docs/fixtures — not Photoshopping one fixture PNG as the only fix (`fix-the-producer` rule).

---

## 10. Parallel / related checks (not the same loop)

| Check | What |
|-------|------|
| `npm run test:board-ready` | BoardReadiness / kit smoke |
| `npm run test:phonics` | PhonicsPolicy CEFR + vocab-first |
| `npm run test:story-art` | Story-art API gate (STORY_ART off) |
| `npm run test:story-art-latency` | Image model latency (needs key + billing) |
| `scripts/loop-story-art.mjs` | Manual E2E generate + illustrate |
| Prop import gates | `import-prop.mjs` / prop-cutouts skill (keying, C1, etc.) |
| App run log | `POST /api/log-run` → `tmp/app-runs/` (local only) |

---

## 11. Known gaps / audit targets (honest)

1. **Generate path ≠ quality path** — teachers can download Draft boards that never saw H*/M*.  
2. **PDF spine ≠ board spine** — `buildLessonPdf` skips recipes/phonics interactivity; story art not on lesson PDF.  
3. **Spec drift** — `docs/edb-lesson-spec.md` may describe older planner recipe set.  
4. **No TS schema package** — Gemini schema + fixtures are source of truth.  
5. **Soft metrics partially calibrated** — severity often soft; vision judgment is the real soft gate.  
6. **Story art** — paid Gemini image quota; async; vision gate false positives mitigated by prompt-only fallback.  
7. **EDB lock flags** — craft debt (lock value 3 vs ClassIn hand-board norms).  
8. **Chinese-market ESL phonics** — policy adapted from L1 sequences; not yet classroom-piloted at scale.  
9. **Formulaic spine** — fixed page list by design; variety deferred until current pages are strong (product intent).  
10. **Agent loop depends on vision LLM/human** — contact sheets are the soft oracle; metrics alone insufficient.

---

## 12. Invariants the process claims to protect

1. **Honesty:** dock art ≠ answer printed on cards; vocab pictures mean the word.  
2. **Readability:** text size, contrast, cards vs busy flats.  
3. **Navigability:** pieces on-canvas, not covering chrome, drag targets usable.  
4. **Topic-fit backgrounds:** scenes/flats match lesson; variety without chaos.  
5. **Producer over artifact:** fix machinery, then regen.  
6. **Level-appropriate phonics:** A1 does not get digraph soup.  
7. **Optional charm:** story illustrations / title kits — degrade to quiet flats.

---

## 13. Suggested audit questions for the independent reviewer

1. Are H* rules the right **must-fix** set for ClassIn live teaching, or over/under-fitted to fixture quirks?  
2. Is 50% vocab-art floor (`BoardReadiness`) too weak for “Ready to teach”?  
3. Should generate-lesson block or auto-queue quality bake before download?  
4. Is dual-lens + 5-iter agent loop robust, or does it incentivize metric gaming?  
5. Does CEFR phonics matrix match Chinese-market young learner practice?  
6. Is separating PDF vs board acceptable, or a trust hazard?  
7. Where should new slide types plug in without exploding H2/M5 variety rules?  
8. What’s missing for accessibility / color vision / low bandwidth ClassIn clients?

---

## 14. Key file index

| Path | Purpose |
|------|---------|
| `.cursor/skills/board-quality-loop/SKILL.md` | Agent loop SOP |
| `.cursor/rules/fix-the-producer.mdc` | Producer-first rule |
| `scripts/preflight-boards.cjs` | Quality entry |
| `scripts/verify-board-visual.cjs` | Hard bake + metrics |
| `scripts/ux-board-rubric.cjs` | H/M/S codes + decision policy |
| `scripts/quality-verdict.cjs` | Verdict intake |
| `scripts/quality-baseline.json` | Regression snapshot |
| `scripts/fixtures/cases.json` | Bake cases |
| `public/lib/boardReadiness.js` | Ready/Draft |
| `public/lib/edbActivities.js` | Plan/recipes |
| `public/lib/phonicsPolicy.js` | CEFR phonics |
| `api/generate-lesson.js` | Gemini lesson |
| `api/generate-story-art.js` | Story images |
| `docs/edb-lesson-spec.md` | Board geometry / pipeline (may drift) |
| `docs/phonics-policy.md` | Phonics matrix |
| `docs/story-art.md` | Story illustration |

---

*End of audit brief. Reviewer: challenge incentives, false confidence from soft metrics, and any gap between “Ready” in UI vs quality bake coverage.*
