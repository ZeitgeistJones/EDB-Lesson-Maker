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

1. **Division of labor** — mechanical/rendering + gated classes (and everything in `localChecks`) are handled locally; Manus spends judgment on pedagogy, level-fit, and generalization, not re-reporting them. The gate list is pulled dynamically from the pass-off.
2. **Anti-inflation** — `weakest_link` (single weakest page + one required improvement) is REQUIRED even on a pass; no perfect/near-perfect score without a named weakest link.
3. **Escalating homework** — `escalation_homework` is exactly ONE buildable generalization challenge (new topic / new page type / harder CEFR / multi-round) that stresses the producer; a proposal the human triages, not an auto-build.

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
