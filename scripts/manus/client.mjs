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

/**
 * Known Manus skill IDs from skill.list — use in message.enable_skills / force_skills.
 * Names are comments only; the API wants these IDs.
 */
export const MANUS_SKILLS = {
  /**
   * name: esl-asset-generator — contact sheets / prop packs.
   * Cursor lock: quality default only; dedupe sheet lists; no people/face regen.
   * See ESL_ASSET_CURSOR_RULES + docs/manus-review.md (no in-repo skill mirror).
   */
  ESL_ASSET_GENERATOR: 'L6pNb9BaysxKxawADNwTWE',
  /** name: classin-lesson-quality-review-skill — board review (account default; review path does not force) */
  CLASSIN_LESSON_REVIEW: 'KjagHR66epsrThXw8ryUdV',
};

/** Review callers pass this explicitly so asset-default lite does not leak into reviews. */
export const REVIEW_AGENT_PROFILE = 'manus-1.6';

/**
 * Resolve agent_profile for task.create.
 * MANUS_AGENT_PROFILE: manus-1.6 | manus-1.6-lite | manus-1.6-max (default manus-1.6-lite for asset creates).
 */
export function resolveAgentProfile(explicit) {
  if (explicit != null && String(explicit).trim()) return String(explicit).trim();
  // MANUS_AGENT_PROFILE — default agent_profile when callers omit it (asset path: lite).
  return (process.env.MANUS_AGENT_PROFILE || '').trim() || 'manus-1.6-lite';
}

/**
 * Opening line for asset-gen briefs. force_skills alone is not enough — Manus
 * should also see the skill named in the message (same pattern as review briefs
 * naming the ClassIn review skill).
 */
export const ESL_ASSET_GENERATOR_BRIEF_LINE =
  'Use your esl-asset-generator skill for this whole task (contact sheets / prop packs). Follow that skill\'s rules; do not improvise a different asset pipeline.';

/**
 * Cursor ↔ Manus asset-call rules (esl-asset-generator skill lock).
 * No in-repo skill mirror — keep these in client + docs/manus-review.md.
 * Cost ceiling: ~11 sheets = 3 createTask calls (5+5+1) at default quality.
 * Completion: count sheet PNGs — must be 11 before reporting Perfect-11 done.
 */
export const ESL_ASSET_CURSOR_RULES = [
  'CURSOR ASSET RULES (mandatory):',
  '1. DEDUPE — never attach the same file twice; never fire a second identical run of the same sheet list.',
  '2. quality: default ONLY — never quality: high / quality="high". Skill overrides; high costs 3–5× with no gain for flat vector.',
  '3. PEOPLE / FACE sheets — accept soft-3D drift; do NOT ask Manus to repair or regenerate people or face-icon sheets for flatness.',
  '4. PERFECT-11 BATCH — 11 sheets need 3 calls (5+5+1). Max ~5 sheets per call. Import each call when sheets land; wait for user credit OK before Call 2/3.',
].join('\n');

/**
 * Rewrite caller briefs that still ask for quality high (legacy batch runners).
 * Skill + cost model: default only for flat-vector contact sheets.
 */
export function sanitizeEslAssetBrief(content) {
  let body = String(content || '');
  if (!body) return body;
  // Explicit API-ish forms
  body = body.replace(/\bquality\s*[:=]\s*["']?high["']?/gi, 'quality: default');
  body = body.replace(/\bquality\s*=\s*["']high["']/gi, 'quality="default"');
  // Prose that nudges Manus toward high / 4K spend
  body = body.replace(
    /Prefer\s+quality\s*[:=]\s*["']?(?:high|default)["']?[^.]*\./gi,
    'Use quality: default only (never high). Prefer denser grids only when default resolution still keys cleanly; otherwise use 4×4.',
  );
  body = body.replace(
    /\bUse high quality\s*\/\s*4K\b[^.]*\./gi,
    'Use quality: default only (never high). Prefer 4×4 when default res is tight; do not pay for high/4K.',
  );
  body = body.replace(/\bhigh quality\s*\/\s*4K\b/gi, 'quality: default');
  return body;
}

/** Prepend skill + Cursor rules; strip quality:high from the brief body. */
export function withEslAssetGeneratorBrief(content) {
  let body = sanitizeEslAssetBrief(String(content || '').trim());
  if (!body) {
    return `${ESL_ASSET_GENERATOR_BRIEF_LINE}\n\n${ESL_ASSET_CURSOR_RULES}`;
  }
  body = sanitizeEslAssetBrief(body);
  const parts = [];
  if (!/\besl-asset-generator\b/i.test(body)) {
    parts.push(ESL_ASSET_GENERATOR_BRIEF_LINE);
  }
  // Marker only — do not key off "quality: default" prose (sanitize injects that too).
  if (!/CURSOR ASSET RULES/i.test(body)) {
    parts.push(ESL_ASSET_CURSOR_RULES);
  }
  parts.push(body);
  return parts.join('\n\n');
}

/**
 * Drop duplicate file parts (same filename + same file_id / file_data).
 * Prevents accidental double-attach of identical sheets in one createTask.
 */
export function dedupeMessageFileParts(content) {
  if (!Array.isArray(content)) return content;
  const seen = new Set();
  const out = [];
  for (const part of content) {
    if (!part || part.type !== 'file') {
      out.push(part);
      continue;
    }
    const key = [
      String(part.filename || '').toLowerCase(),
      part.file_id || '',
      typeof part.file_data === 'string' ? `data:${part.file_data.length}` : '',
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

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

/**
 * Create a task. See https://open.manus.ai/docs/v2/task.create
 *
 * Options:
 * - agent_profile — omit to use MANUS_AGENT_PROFILE / manus-1.6-lite (review should pass REVIEW_AGENT_PROFILE)
 * - enable_skills / force_skills — Manus skill IDs on message (see MANUS_SKILLS)
 */
export async function createTask(opts) {
  const {
    message,
    title,
    structured_output_schema,
    agent_profile,
    hide_in_task_list = false,
    interactive_mode = false,
    enable_skills,
    force_skills,
  } = opts;
  const msg =
    typeof message === 'string'
      ? { content: message }
      : { ...(message || {}) };
  if (Array.isArray(msg.content)) {
    msg.content = dedupeMessageFileParts(msg.content);
  }
  if (Array.isArray(enable_skills) && enable_skills.length) {
    msg.enable_skills = enable_skills;
  }
  if (Array.isArray(force_skills) && force_skills.length) {
    msg.force_skills = force_skills;
    // When forcing the asset skill, also name it in the message text so the
    // agent sees the instruction in-chat (force_skills alone is easy to miss).
    // Also strip quality:high and inject Cursor asset rules (default quality,
    // dedupe, no people/face regen).
    if (force_skills.includes(MANUS_SKILLS.ESL_ASSET_GENERATOR)) {
      if (typeof msg.content === 'string') {
        msg.content = withEslAssetGeneratorBrief(msg.content);
      } else if (Array.isArray(msg.content)) {
        msg.content = msg.content.map((part) => {
          if (part && part.type === 'text' && typeof part.text === 'string') {
            return { ...part, text: withEslAssetGeneratorBrief(part.text) };
          }
          return part;
        });
      }
    }
  }
  const body = {
    message: msg,
    agent_profile: resolveAgentProfile(agent_profile),
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
      // Structured output can land after stopped — retry a few times (JkBr5 early stop).
      let structured = extractStructuredOutput(messages);
      let msgs = messages;
      for (let i = 0; !structured && i < 4; i++) {
        await sleep(2500);
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
