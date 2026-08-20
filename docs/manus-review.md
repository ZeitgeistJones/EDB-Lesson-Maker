# Manus ClassIn review bridge

Cursor sends **baked board JPGs** to Manus for structured critique (judge only). Manus does not need a special “talk to Cursor” setup — this repo calls the Manus API.

## Auth

Set `MANUS_API_KEY` in the environment or in the gitignored repo `.env`:

```
MANUS_API_KEY=...
```

Never commit the key. Create keys in Manus → API Integration settings.

## CLI

```bash
# Preview pass-off brief + attachments (no API call)
npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=scripts/manus/passoffs/classical-compose.json --dry-run

# Live review (auto-loads <dir>/manus-passoff.json if present)
npm run manus:review -- tmp/board-bg-verify/classical-compose --title="Writing a Symphony for the Orchestra"
```

Pass-off fields (JSON or `--known=` / `--fixed=` / `--gates=` / `--focus=` pipe lists):

| Field | Purpose |
|-------|---------|
| `knownIssues` | Already owned — don’t re-litigate unless worse |
| `justFixed` | Verify these still hold; fail → `method_feedback` |
| `localChecks` | What we claim passed |
| `focus` | This pass’s ask |
| `notes` | Optional one-liner |

Schema adds `gate_holes` + `method_feedback` + `just_fixed_results` + `/5 scorecard` + `zpd_challenges` + `weakest_link` + `escalation_homework` so Manus can call out check/process misses and Level-Up the producer after strong passes.

Standing review bar baked into every brief (`buildReviewBrief`):

1. **Primary ask** — “What do you think of this lesson?” Holistic teacher+student judgment of the JPGs.
2. **Everything is fair game** — pedagogy, visual/UX, delivery, completeness, mechanical misses; no category off-limits. Structured fields are output/foldability requirements, not don’t-look rules.
3. **Optional context** — `knownIssues` / `justFixed` / `localChecks` / `focus` are light hints only (never “do not re-report”).
4. **Anti-inflation + escalation_homework** — still required; they add feedback quality without shrinking the lens.

`review.mjs` logs `weakest_link` + `escalation_homework` into `.cursor/ratings/manus-reviews.jsonl` alongside verdict/score/zpd.

Aligned to Manus upstream skill `classin-lesson-quality-review-skill` (mirrored at `.cursor/skills/manus-lesson-review/manus-upstream-SKILL.md`).

Template: [`scripts/manus/passoff.example.json`](../scripts/manus/passoff.example.json).

## MCP (Cursor Agent tools)

Add to Cursor MCP settings (`mcp.json`):

```json
{
  "mcpServers": {
    "manus": {
      "command": "node",
      "args": [
        "C:/dev/PPT-Lesson-Maker-for-Classin/scripts/manus/mcp-server.mjs"
      ]
    }
  }
}
```

Ensure `MANUS_API_KEY` is visible to Cursor (user env or put it in the `env` block of that server — do not commit that file with the key).

Tools:

| Tool | Role |
|------|------|
| `manus_review_bake` | One-shot: JPG dir → create → poll → structured verdict |
| `manus_create_task` | `task.create` (+ optional review schema / file_ids) |
| `manus_poll_task` | One `task.listMessages` snapshot |
| `manus_confirm` | `task.confirmAction` when status is `waiting` |
| `manus_review_brief` | Build judge-only brief text (no API call) |

## After feedback

Always fold Manus output into **producer + local checks** — see `.cursor/skills/manus-lesson-review/SKILL.md` (“After feedback REQUIRED”). Do not only summarize in chat.

## Docs

- https://open.manus.ai/docs/v2/task.create
- https://open.manus.ai/docs/v2/task-lifecycle
- https://open.manus.ai/docs/v2/authentication

## Asset tasks (vs review)

Board **review** always passes `agent_profile: manus-1.6` (`REVIEW_AGENT_PROFILE`) and does not attach `esl-asset-generator`.

Asset / sheet-request / spike creates omit that override so they use **`MANUS_AGENT_PROFILE`** (default **`manus-1.6-lite`**) and pass `message.force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR]` (`L6pNb9BaysxKxawADNwTWE`, name `esl-asset-generator`). See `scripts/manus/client.mjs` and `tmp/manus-attachment-spike-run.mjs`.

### Cursor rules for every `esl-asset-generator` call

There is **no in-repo skill mirror** for `esl-asset-generator` (upstream lives on the Manus account). Cursor must follow these on every future asset call — enforced in `withEslAssetGeneratorBrief` / `createTask` in `scripts/manus/client.mjs`:

1. **Deduplicate** — never run the same sheet list twice if two identical files/attachments appear. One `createTask` only; `dedupeMessageFileParts` drops duplicate file parts in one message.
2. **`quality: default` only** — never `quality: high` in task prompts. The skill overrides; high costs 3–5× with no gain for flat vector. Callers that still say “prefer high / 4K” are sanitized to default.
3. **People / face sheets** — accept soft-3D drift; do **not** ask Manus to repair or regenerate people or face-icon sheets for flatness.
4. **Perfect-11 / multi-call** — the **5-image limit is per `generate_image` call, not per task**. Put the **full** sheet list (up to 11) in **one** Cursor `createTask` / one Manus message. Manus must fire **5+5+1** (or a shorter trailing call) **inside that same task** until every listed sheet PNG exists. Do **not** handcuff with “this call is exactly 5 sheets,” and do **not** split Call 2/3 into new Cursor chats (new chat = memory wipe). Completion = count PNGs against the list.

**Cost ceiling (mental model):** an 11-sheet run ≤ 3 `generate_image` calls (5+5+1) at default quality — **one Manus task**, not three Cursor tasks.
