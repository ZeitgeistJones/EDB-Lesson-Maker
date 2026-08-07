#!/usr/bin/env node
/**
 * Minimal stdio MCP server for Manus task.create / poll / confirm.
 * Log only to stderr — stdout is the JSON-RPC channel.
 *
 * Cursor mcp.json example:
 * {
 *   "mcpServers": {
 *     "manus": {
 *       "command": "node",
 *       "args": ["C:/dev/PPT-Lesson-Maker-for-Classin/scripts/manus/mcp-server.mjs"],
 *       "env": {}
 *     }
 *   }
 * }
 * Ensure MANUS_API_KEY is in the environment or repo .env.
 */
import readline from 'readline';
import {
  createTask,
  listMessages,
  confirmAction,
  latestAgentStatus,
  extractStructuredOutput,
  apiKey,
} from './client.mjs';
import { REVIEW_SCHEMA, buildReviewBrief } from './review-schema.mjs';
import { runBoardReview } from './review.mjs';

const SERVER_INFO = { name: 'manus', version: '1.0.0' };

const TOOLS = [
  {
    name: 'manus_review_bake',
    description:
      'One-shot: attach JPGs from a tmp/board-bg-verify/<case> dir, create a Manus ClassIn review task with structured schema, poll until done, return verdict JSON. Prefer this after an internal quality bake.',
    inputSchema: {
      type: 'object',
      properties: {
        dir: {
          type: 'string',
          description: 'Path to bake dir with page-*.jpg (absolute or repo-relative)',
        },
        title: { type: 'string' },
        level: { type: 'string' },
        duration: { type: 'string' },
        known_issues: { type: 'array', items: { type: 'string' } },
        just_fixed: { type: 'array', items: { type: 'string' } },
        local_checks: { type: 'array', items: { type: 'string' } },
        focus: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
        passoff_path: {
          type: 'string',
          description: 'Optional path to manus-passoff.json (defaults to <dir>/manus-passoff.json)',
        },
        agent_profile: {
          type: 'string',
          enum: ['manus-1.6', 'manus-1.6-lite', 'manus-1.6-max'],
        },
      },
      required: ['dir'],
    },
  },
  {
    name: 'manus_create_task',
    description:
      'Create a Manus task (optionally with ClassIn lesson review schema). Prefer manus_review_bake when you have a verify JPG directory.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Task prompt / brief' },
        title: { type: 'string' },
        use_review_schema: {
          type: 'boolean',
          description: 'If true, attach the ClassIn structured review schema',
        },
        lesson_title: { type: 'string' },
        level: { type: 'string' },
        duration: { type: 'string' },
        file_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Manus file_ids already uploaded via file.upload',
        },
        agent_profile: {
          type: 'string',
          enum: ['manus-1.6', 'manus-1.6-lite', 'manus-1.6-max'],
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'manus_poll_task',
    description:
      'Poll task.listMessages once. Returns agent_status, structured_output if present, and waiting detail.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'manus_confirm',
    description:
      'Confirm a waiting Manus action via task.confirmAction (e.g. apiHighCreditNotice).',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        event_id: { type: 'string' },
        input: { type: 'object', description: 'Confirm payload; default { accept: true }' },
      },
      required: ['task_id', 'event_id'],
    },
  },
  {
    name: 'manus_review_brief',
    description: 'Build the standard ClassIn pass-off brief text (no API call).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        level: { type: 'string' },
        duration: { type: 'string' },
        known_issues: { type: 'array', items: { type: 'string' } },
        just_fixed: { type: 'array', items: { type: 'string' } },
        local_checks: { type: 'array', items: { type: 'string' } },
        focus: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      required: ['title'],
    },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function okResult(id, data) {
  send({
    jsonrpc: '2.0',
    id,
    result: {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    },
  });
}

function errResult(id, message) {
  send({
    jsonrpc: '2.0',
    id,
    result: {
      content: [{ type: 'text', text: message }],
      isError: true,
    },
  });
}

async function callTool(name, args) {
  if (name === 'manus_review_brief') {
    return {
      brief: buildReviewBrief({
        title: args.title,
        level: args.level,
        duration: args.duration,
        knownIssues: args.known_issues,
        justFixed: args.just_fixed,
        localChecks: args.local_checks,
        focus: args.focus,
        notes: args.notes,
      }),
    };
  }

  if (name === 'manus_review_bake') {
    apiKey();
    return runBoardReview({
      dir: args.dir,
      title: args.title,
      level: args.level,
      duration: args.duration,
      knownIssues: args.known_issues || [],
      justFixed: args.just_fixed || [],
      localChecks: args.local_checks || [],
      focus: args.focus || [],
      notes: args.notes,
      passoff: args.passoff_path,
      profile: args.agent_profile || 'manus-1.6',
    });
  }

  // Touch key early for clearer errors
  apiKey();

  if (name === 'manus_create_task') {
    const content = [{ type: 'text', text: args.text }];
    for (const fid of args.file_ids || []) {
      content.push({ type: 'file', file_id: fid });
    }
    const created = await createTask({
      title: args.title || (args.lesson_title ? `ClassIn review: ${args.lesson_title}` : undefined),
      message: { content },
      structured_output_schema: args.use_review_schema ? REVIEW_SCHEMA : undefined,
      agent_profile: args.agent_profile || 'manus-1.6',
    });
    return {
      task_id: created.task_id,
      task_url: created.task_url,
      task_title: created.task_title,
    };
  }

  if (name === 'manus_poll_task') {
    const page = await listMessages(args.task_id, { order: 'desc', limit: 80 });
    const messages = page.messages || [];
    const st = latestAgentStatus(messages);
    const structured = extractStructuredOutput(messages);
    return {
      task_id: args.task_id,
      agent_status: (st && st.agent_status) || null,
      status_detail: (st && st.status_detail) || null,
      structured,
      assistant_excerpt: messages
        .filter((m) => m.assistant_message)
        .map((m) => m.assistant_message.content)
        .filter(Boolean)
        .slice(-1)[0] || null,
    };
  }

  if (name === 'manus_confirm') {
    const res = await confirmAction(
      args.task_id,
      args.event_id,
      args.input || { accept: true }
    );
    return { ok: true, response: res };
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handle(msg) {
  if (!msg || msg.jsonrpc !== '2.0') return;

  if (msg.method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    });
    return;
  }

  if (msg.method === 'notifications/initialized' || msg.method === 'initialized') {
    return;
  }

  if (msg.method === 'tools/list') {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      result: { tools: TOOLS },
    });
    return;
  }

  if (msg.method === 'tools/call') {
    const name = msg.params && msg.params.name;
    const args = (msg.params && msg.params.arguments) || {};
    try {
      const data = await callTool(name, args);
      okResult(msg.id, data);
    } catch (e) {
      errResult(msg.id, e.message || String(e));
    }
    return;
  }

  if (msg.method === 'ping') {
    send({ jsonrpc: '2.0', id: msg.id, result: {} });
    return;
  }

  // Unknown method with id — empty error
  if (msg.id != null) {
    send({
      jsonrpc: '2.0',
      id: msg.id,
      error: { code: -32601, message: `Method not found: ${msg.method}` },
    });
  }
}

// Validate key presence at boot (warn only — tools still throw clearly)
try {
  apiKey();
  console.error('manus MCP: MANUS_API_KEY loaded');
} catch (e) {
  console.error('manus MCP:', e.message);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    console.error('manus MCP: bad JSON line');
    return;
  }
  handle(msg).catch((e) => {
    console.error('manus MCP handle error:', e.message || e);
    if (msg.id != null) errResult(msg.id, e.message || String(e));
  });
});
