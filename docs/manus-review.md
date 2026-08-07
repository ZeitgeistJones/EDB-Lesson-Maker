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

Schema adds `gate_holes` + `method_feedback` + `just_fixed_results` + `/5 scorecard` + `zpd_challenges` so Manus can call out check/process misses and Level-Up the producer after strong passes.

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
