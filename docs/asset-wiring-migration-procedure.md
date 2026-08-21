# Asset Wiring Migration Procedure

This is the Phase B runbook for activating the harvested asset stockpile without
flattening specialized families or manually mapping thousands of files.

Source of truth:

- Machine inventory: `docs/asset-wiring-migration-inventory.json`
- Family rules: `scripts/lib/asset-wiring-rules.mjs`
- Audit/proof: `scripts/audit-asset-wiring.mjs`
- World relationships: `docs/world-zoom-relationships.json` and `.md`

## 1. What “wired” means

An asset is not wired merely because a PNG exists.

1. **RAW** — surviving source evidence exists under `harvested/`.
2. **IMPORTED** — an exact row exists in a live manifest/index.
3. **ADDRESSABLE** — that row points to an existing live file.
4. **GENERATOR_ELIGIBLE** — a current picker may return it without bypassing
   identity, sharpness, family, topic, or specialization gates.

Current live paths:

- Prop: `09_props/manifest.json` → `PropBank` → identity/pack/role picker →
  `VocabArt`, activity, or story renderer.
- Background: `08_backgrounds/manifest.json` → `SceneBackgrounds` → section,
  activity, or story renderer.
- Vocab: `07_vocab-pack/index.json` → `VocabIcons` → `VocabArt`.

The required migration chain is:

`FAMILY → RULE → IMPORTER → MANIFEST/INDEX → ELIGIBILITY OR EXCEPTION`

## 2. State taxonomy

States are additive. For example, a registered scene can be
`RAW + SPECIALIZED + HOLD`; a safe prop can be
`RAW + IMPORTED + ADDRESSABLE + GENERATOR_ELIGIBLE`.

- **RAW** — source exists. No quality claim.
- **IMPORTED** — exact live row exists.
- **ADDRESSABLE** — live row and referenced file both exist.
- **GENERATOR_ELIGIBLE** — current generic picker can safely return it.
- **SPECIALIZED** — only a named mechanic, pack, sequence, or relationship-aware
  selector may use it.
- **REFERENCE_ONLY** — preserve source/metadata; do not activate generically.
- **REVIEW_REQUIRED** — route, identity, QA, or semantics are unresolved.
- **HOLD** — required planner/renderer/state mechanic is absent or the stockpile
  is explicitly closed.
- **JUNK** — failed/rejected art. Never import and never preserve as a variant.

Never convert `SPECIALIZED`, `REFERENCE_ONLY`, or `HOLD` to generic eligibility
just to increase the wired count.

## 3. Importer paths

### Single prop

Use `scripts/import-prop.mjs`. It keys black/white fields, enforces gates, writes
alpha metadata, and can print or write one manifest row.

### Contact-sheet props

1. `scripts/import-sheet.mjs`
2. Review the generated QA composite and `*-rows.json`.
3. Set `skip:true` for junk, unresolved labels, or near-identical duplicates.
4. Add family metadata before merge: `variantOf`, `subject`, `decorative`,
   `dockSafe`, `stageFit`, and deliberate scale/anchor where required.
5. Dry-run and then use `scripts/merge-staged-props.mjs`.

Staging is mandatory. Never write thousands of sheet cells directly into the
live manifest.

### Backgrounds

Use `scripts/import-background.mjs` only for a confirmed single full-page scene
or quiet flat. Preserve `category`, `groundY`, tags, and any external
relationship metadata.

`scripts/import-harvest-stockpile.mjs` orchestrates known families and now:

- skips existing keys by default;
- requires `--replace-existing` for deliberate replacement;
- accepts `--families=...` for bounded waves;
- blocks generic loose import of multi-view, registered-state, and other
  specialized board-enabling paths;
- exposes `--audit` and `--proof`.

### Vocab and vocab replacements

Use `scripts/import-vocab-sheet.mjs` and `07_vocab-pack/index.json`.
Replacement stockpile rows target `original_key`; never publish `redo-*` as a
new teach-word. A replacement is an overwrite only after visual review and an
explicit collision decision.

## 4. IDs and schema

### Canonical IDs

- Lowercase ASCII kebab-case.
- Stable across reruns.
- Never derive identity solely from zip order or a guessed cell position.
- Prefix only to prevent a real collision or preserve a meaningful family
  namespace.
- Do not rename existing live IDs during this migration.

### Variants

Keep a good duplicate when it adds a distinct pose, view, framing, or useful
style-consistent choice.

- Prefer `<base>-v2`, `<base>-v3`, and so on; or
- set `"variantOf": "<base>"`.

Do not collapse distinct views or registered states into variants. Variants are
interchangeable depictions of one identity; views/states are coordinated family
members with different semantics.

### Prop manifest fields

Required:

- `file`, `role`, `tags`, `relativeScale`, `anchor`
- `alpha:true`, `aspect`, `srcW`, `srcH`

Preserve when applicable:

- `pack` or `packs`
- `variantOf`
- `subject`
- `decorative:true` plus root `decorativeHints`
- `dockSafe:false`
- `stageFit`
- `styleFamily`

Generic prop eligibility requires:

- live file exists;
- `alpha:true`;
- `dockSafe !== false`;
- identity-safe resolution;
- native short side at least 120px for docks;
- decorative topic gate passes;
- family/style gate passes.

Addressable does not imply dock-safe or generator-eligible.

### Background manifest fields

Scenes require `file`, `groundY`, `category`, and tags. Flats use their existing
flat schema. Multi-view registration, zoom chains, state ladders, and compatible
world links remain in `docs/world-zoom-relationships.*`; do not invent N×N
manifest links.

## 5. Relationship rules

Use only these relationship claims:

- `SAME_WORLD` when a coordinated manufacture/registration proves continuity.
- `COMPATIBLE` for thematic or pedagogical continuity without geometric proof.
- Registered K1 ladders are same-camera **states**, not viewpoints.
- K3 sheets are coordinated **views**, not one flattened scene.
- Builder-world plates are ordered sequence surfaces, not camera variants.

Never infer every overview-to-interior combination. Add one family record or one
explicit compatible link, not N×N pairs.

### Recovered world-zoom exception

The nine recovered zoom families contain 12 imported scenes. They are already
`REG_A`, addressable in `08_backgrounds`, and represented in
`docs/world-zoom-relationships.json`.

**Verify only. Do not remanufacture, redownload, call Manus, or re-import them.**

## 6. Family rules

Rules are executable data in `scripts/lib/asset-wiring-rules.mjs`.

- `world-zoom-completions` — verify-only specialized backgrounds.
- `overview-worlds` — confirmed single scenes may become generic backgrounds.
- `builder-worlds` — addressable sequence-specialized backgrounds.
- `content-worlds` — relationship-preserving reference-only family; companions,
  worlds, and sheets need a dedicated inventory/importer before activation.
- `kid-interest` — named black-field cells through stage/QA/merge.
- `long-tail-props` — explicit mixed-stockpile HOLD (`no_wiring` / STOCKPILE
  LOCK); no importer until an intentional unlock and prop/background split.
- `art-replacements` — REVIEW_REQUIRED vocab replacement route; never new
  `redo-*` identities and never overwrite without per-cell visual QA.
- `aggressive-stockpile` — split mixed families before selecting an importer.
- `board-enabling-multi-view` — reference-only relationship family.
- `board-enabling-registered-states` — specialized hold.
- `board-enabling` fallback — specialized review, fail closed.
- `prea1/a1/a2/b1/b2` structural/discourse families — specialized hold until a
  named renderer and producer contract exist.
- `visual-grammar` — specialized hold.
- `horizontal-harvest` — closed specialized hold.
- Unclassified harvest — review required; add a family rule before import.

## 7. Phase B Sonnet waves

Do bounded family waves. Regenerate the inventory after each merged wave.

### Wave 0 — baseline

Run audit, proof, manifest-lock, picker, and vocab tests. Stop if baseline fails.

### Wave 1 — safe generic prop sheets

- Remaining `kid-interest` families with explicit cell catalogs.
- Do not run `long-tail-props`; its source-level STOCKPILE LOCK supersedes the
  earlier candidate wording in this wave plan.
- Prop-only slices of `aggressive-stockpile` after family separation.

Each sheet: stage → QA → cull/metadata → merge dry-run → merge → tests.

### Wave 2 — vocab replacements

- `art-replacements` by target `original_key`.
- Import only reviewed improvements.
- No `redo-*` teach-word IDs.

### Wave 3 — single-scene backgrounds

- Remaining `overview-worlds`.
- Do not bulk-import `content-worlds`; preserve coordinated
  `companions/` + `worlds/` + `sheets/` families until a relationship-aware
  inventory/importer exists.
- Builder-world plates only with sequence metadata and specialized eligibility.

Do not run a loose board-enabling sweep.

### Wave 4 — already imported specialized banks

Verify addressability and selector constraints for `hero-targets`, `story-cast`,
`hide-reveal`, registered state-like packs, and other existing specialized
PropBank families. This is metadata/index validation, not generic activation.

### Wave 5 — holds and exceptions

Inventory only:

- K3 multi-view
- K1 registered states
- horizontal H1-H6
- Pre-A1/A1/A2 structural systems
- B1/B2 discourse/argument systems
- visual grammar

Do not import these into generic selectors. Escalate when a real mechanic exists.

## 8. Validation commands

Baseline and after every wave:

```bash
npm run assets:wiring-audit
npm run test:asset-wiring
npm run test:asset-wiring-proof
npm run test:manifest-lock
npm run test:bg-picks
npm run test:vocab-art
node scripts/verify-offtopic-props.mjs
```

For a bounded harvest family:

```bash
npm run assets:import-harvest -- --dry-run --families=<family-id> --limit=<small-number>
```

For staged props:

```bash
npm run assets:merge-staged -- <rows.json> --dry-run --verbose
npm run assets:merge-staged -- <rows.json>
```

After merge, rerun the audit so `IMPORTED`, `ADDRESSABLE`, and
`GENERATOR_ELIGIBLE` are measured from repo truth.

## 9. Commit boundary

Commit:

- importer/rule/audit code;
- manifests and live transformed outputs intentionally produced by the wave;
- regenerated machine inventory;
- relationship metadata when explicitly reviewed.

Never commit:

- `harvested/**/*.png`;
- raw downloads, temporary stages, QA composites, run logs, or credentials;
- unrelated pre-existing working-tree changes.

## 10. Escalate to Sol

Stop the wave and call Sol back when:

- a family has no rule or needs a new importer/manifest shape;
- existing-key replacement is required outside reviewed vocab replacement;
- more than 5% of a sheet has uncertain identity, cell order, or hard-gate fails;
- a proposed change alters `PropBank`, `VocabArt`, `SceneBackgrounds`, producer
  semantics, or generator eligibility;
- multi-view/state/zoom relationships are ambiguous;
- a specialized family would need generic activation to appear “wired”;
- audit counts move unexpectedly by more than 2% after a bounded wave;
- any validation command fails.
