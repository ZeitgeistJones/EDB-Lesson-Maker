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
npm run manus:review -- tmp/board-bg-verify/classical-compose --title="Writing a Symphony for the Orchestra" --level=B1 --duration=60
```

Uploads key page JPGs (inline `file_data` when under 15MB), creates a task with structured output schema, polls until stopped, prints JSON, appends `.cursor/ratings/manus-reviews.jsonl`.

Optional: `--known="issue one|issue two"` to disclose wishlist items already known.

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

## Docs

- https://open.manus.ai/docs/v2/task.create
- https://open.manus.ai/docs/v2/task-lifecycle
- https://open.manus.ai/docs/v2/authentication
