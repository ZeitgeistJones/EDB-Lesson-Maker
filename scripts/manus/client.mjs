/**
 * Thin Manus API v2 client for Cursor ↔ Manus lesson reviews.
 * Auth: MANUS_API_KEY via process env or repo .env (never log the key).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(ROOT, '.env') });

const BASE = 'https://api.manus.ai/v2';

export function apiKey() {
  const key = (process.env.MANUS_API_KEY || '').trim();
  if (!key) {
    throw new Error(
      'MANUS_API_KEY missing. Add it to repo .env (see .env.example) or set a User env var, then restart Cursor. Create a key at https://manus.im (API Integration settings).'
    );
  }
  return key;
}

async function api(method, route, body, { allowStatuses = [] } = {}) {
  const url = route.startsWith('http') ? route : `${BASE}${route}`;
  const headers = {
    'x-manus-api-key': apiKey(),
  };
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Manus ${method} ${route} non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (allowStatuses.includes(res.status)) {
    return { ...data, _http_status: res.status };
  }
  if (!res.ok || data.ok === false) {
    const err = data.error || {};
    throw new Error(
      `Manus ${method} ${route} failed (${res.status}): ${err.code || ''} ${err.message || text.slice(0, 300)}`
    );
  }
  return data;
}

/** Create a task. See https://open.manus.ai/docs/v2/task.create */
export async function createTask(opts) {
  const {
    message,
    title,
    structured_output_schema,
    agent_profile = 'manus-1.6',
    hide_in_task_list = false,
    interactive_mode = false,
  } = opts;
  const body = {
    message: typeof message === 'string' ? { content: message } : message,
    agent_profile,
    hide_in_task_list,
    interactive_mode,
  };
  if (title) body.title = title;
  if (structured_output_schema) body.structured_output_schema = structured_output_schema;
  return api('POST', '/task.create', body);
}

/** List task events / messages. */
export async function listMessages(taskId, { order = 'desc', limit = 50, cursor, allowMissing = false } = {}) {
  const q = new URLSearchParams({
    task_id: taskId,
    order,
    limit: String(limit),
  });
  if (cursor) q.set('cursor', cursor);
  return api('GET', `/task.listMessages?${q}`, undefined, {
    allowStatuses: allowMissing ? [404] : [],
  });
}

/** Confirm a waiting action (terminal, high-credit notice, etc.). */
export async function confirmAction(taskId, eventId, input) {
  return api('POST', '/task.confirmAction', {
    task_id: taskId,
    event_id: eventId,
    input: input || { accept: true },
  });
}

/**
 * Upload a local file via file.upload → PUT upload_url.
 * Returns file.id for use as message content file_id.
 */
export async function uploadFile(filePath) {
  const filename = path.basename(filePath);
  const meta = await api('POST', '/file.upload', { filename });
  const uploadUrl = meta.upload_url;
  const fileId = meta.file && meta.file.id;
  if (!uploadUrl || !fileId) {
    throw new Error(`file.upload missing upload_url/id for ${filename}`);
  }
  const bytes = fs.readFileSync(filePath);
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  if (!put.ok) {
    const t = await put.text();
    throw new Error(`PUT upload failed for ${filename} (${put.status}): ${t.slice(0, 200)}`);
  }
  // Docs: wait until status is uploaded before attaching to task.create.
  for (let i = 0; i < 10; i++) {
    const detail = await api('GET', `/file.detail?file_id=${encodeURIComponent(fileId)}`);
    const status = detail.file && detail.file.status;
    if (status === 'uploaded') break;
    if (status === 'error') throw new Error(`file.upload error state for ${filename}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  return { file_id: fileId, filename, bytes: bytes.length };
}

const INLINE_MAX = 15 * 1024 * 1024; // under Manus 20MB file_data cap

/**
 * Build a message.content File part from a local path.
 * Board JPGs are tiny — prefer inline file_data (data URI).
 * Larger files use file.upload → file_id.
 */
export async function fileContentPart(filePath) {
  const filename = path.basename(filePath);
  const bytes = fs.readFileSync(filePath);
  if (bytes.length <= INLINE_MAX) {
    const ext = path.extname(filename).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
            : 'image/jpeg';
    return {
      type: 'file',
      filename,
      // Manus rejects raw base64 — requires a data URI.
      file_data: `data:${mime};base64,${bytes.toString('base64')}`,
      bytes: bytes.length,
      via: 'file_data',
    };
  }
  const up = await uploadFile(filePath);
  return {
    type: 'file',
    filename: up.filename,
    file_id: up.file_id,
    bytes: up.bytes,
    via: 'file_id',
  };
}

/**
 * Latest agent_status from status_update events (desc order preferred).
 */
export function latestAgentStatus(messages) {
  const list = messages || [];
  for (const m of list) {
    const su = m.status_update || (m.type === 'status_update' ? m : null);
    if (su && su.agent_status) {
      return {
        agent_status: su.agent_status,
        status_detail: su.status_detail || null,
        brief: su.brief || null,
        event: m,
      };
    }
    if (m.type === 'status_update' && m.status_update && m.status_update.agent_status) {
      return {
        agent_status: m.status_update.agent_status,
        status_detail: m.status_update.status_detail || null,
        brief: m.status_update.brief || null,
        event: m,
      };
    }
  }
  return null;
}

/** First structured_output_result.value in the message list. */
export function extractStructuredOutput(messages) {
  for (const m of messages || []) {
    const r = m.structured_output_result
      || (m.type === 'structured_output_result' ? m.structured_output_result : null);
    if (r) return r;
  }
  return null;
}

/**
 * Poll until stopped/error or timeout.
 * Auto-confirms apiHighCreditNotice only; other waiting types throw with detail.
 */
export async function pollUntilDone(taskId, {
  intervalMs = 4000,
  timeoutMs = 10 * 60 * 1000,
  onTick,
} = {}) {
  const started = Date.now();
  let lastStatus = null;
  // Fresh tasks sometimes 404 for a few seconds before listMessages is consistent.
  const missingGraceMs = 90 * 1000;
  await sleep(2500);

  while (Date.now() - started < timeoutMs) {
    const allowMissing = Date.now() - started < missingGraceMs;
    const page = await listMessages(taskId, { order: 'desc', limit: 80, allowMissing });
    if (page && page._http_status === 404) {
      if (onTick) onTick({ agent_status: 'pending', messages: [] });
      await sleep(intervalMs);
      continue;
    }
    const messages = page.messages || [];
    const st = latestAgentStatus(messages);
    lastStatus = st && st.agent_status;
    if (onTick) onTick({ agent_status: lastStatus, messages });

    if (st && st.agent_status === 'waiting') {
      const detail = st.status_detail || {};
      const typ = detail.waiting_for_event_type || '';
      const eventId = detail.waiting_for_event_id;
      if (typ === 'apiHighCreditNotice' && eventId) {
        await confirmAction(taskId, eventId, { action: 'accept' });
        await sleep(intervalMs);
        continue;
      }
      const err = new Error(
        `Manus task waiting (${typ || 'unknown'}): ${detail.waiting_description || 'needs confirmation'}`
      );
      err.code = 'WAITING';
      err.detail = detail;
      err.task_id = taskId;
      throw err;
    }

    if (st && (st.agent_status === 'stopped' || st.agent_status === 'error')) {
      // Structured output can land a beat after stopped — one extra pull if missing.
      let structured = extractStructuredOutput(messages);
      let msgs = messages;
      if (!structured) {
        await sleep(2000);
        const again = await listMessages(taskId, { order: 'desc', limit: 80 });
        msgs = again.messages || messages;
        structured = extractStructuredOutput(msgs);
      }
      const assistant = (msgs || [])
        .filter((m) => m.assistant_message || m.type === 'assistant_message')
        .map((m) => (m.assistant_message && m.assistant_message.content) || '')
        .filter(Boolean);
      return {
        agent_status: st.agent_status,
        structured,
        assistant_messages: assistant,
        messages: msgs,
      };
    }

    await sleep(intervalMs);
  }
  const err = new Error(`Manus poll timeout after ${timeoutMs}ms (last=${lastStatus})`);
  err.code = 'TIMEOUT';
  err.task_id = taskId;
  throw err;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export { ROOT, BASE };
