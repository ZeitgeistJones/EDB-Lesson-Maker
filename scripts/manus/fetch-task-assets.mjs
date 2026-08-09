/**
 * Poll/list an existing Manus task and download image attachments into OUT_DIR.
 * Does NOT create a new task. Safe for re-fetch into a dedicated folder.
 *
 *   node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/some-dir [--label=name]
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  apiKey,
  listMessages,
  pollUntilDone,
  latestAgentStatus,
} from './client.mjs';

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const taskId = arg('task');
const outRel = arg('out');
const label = arg('label', '');
const skipPoll = process.argv.includes('--skip-poll');
const timeoutMs = Number(arg('timeoutMs', String(20 * 60 * 1000))) || 20 * 60 * 1000;
const intervalMs = Number(arg('intervalMs', '15000')) || 15000;

if (!taskId || !outRel) {
  console.error('Usage: node scripts/manus/fetch-task-assets.mjs --task=<id> --out=tmp/dir [--label=] [--skip-poll]');
  process.exit(1);
}

apiKey();
const OUT_DIR = path.isAbsolute(outRel) ? outRel : path.join(ROOT, outRel);
fs.mkdirSync(OUT_DIR, { recursive: true });

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      const name = a.file_name || a.filename || a.name || 'sheet.png';
      const mime = String(a.mime_type || a.content_type || '');
      if (url && (/png|jpeg|jpg|webp/i.test(mime) || /\.(png|jpe?g|webp)$/i.test(name) || !mime)) {
        hits.push({ name, url, mime, content_type: a.content_type || mime });
      }
    }
  }
  return hits;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const dump = {
  label: label || null,
  task_id: taskId,
  task_url: `https://manus.im/app?taskId=${taskId}`,
  task_url_alt: `https://manus.im/app/${taskId}`,
  out_dir: OUT_DIR,
  started_at: new Date().toISOString(),
  skip_poll: skipPoll,
};

let poll = null;
if (!skipPoll) {
  console.error(`Polling ${taskId}…`);
  try {
    const done = await pollUntilDone(taskId, {
      intervalMs,
      timeoutMs,
      onTick: ({ agent_status }) => {
        if (agent_status) console.error(`  status=${agent_status}`);
      },
    });
    poll = {
      agent_status: done.agent_status || null,
      assistant_preview: (done.assistant_messages || []).slice(0, 2).map((t) => String(t).slice(0, 400)),
    };
  } catch (err) {
    poll = {
      error: String(err.message || err),
      code: err.code || null,
    };
    console.error(`Poll ended with: ${poll.error}`);
  }
}

const page = await listMessages(taskId, { order: 'asc', limit: 100, allowMissing: true });
if (page && page._http_status === 404) {
  dump.poll = poll;
  dump.error = 'task.listMessages 404';
  fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
  console.log(JSON.stringify({ ok: false, ...dump }, null, 2));
  process.exit(2);
}

const messages = page.messages || [];
fs.writeFileSync(path.join(OUT_DIR, 'messages-raw.json'), JSON.stringify(messages, null, 2));

const st = latestAgentStatus([...messages].reverse());
dump.poll = poll || {
  agent_status: st && st.agent_status,
  status_detail: st && st.status_detail,
};
dump.finished_at = new Date().toISOString();
dump.message_count = messages.length;
dump.latest_agent_status = (st && st.agent_status) || null;

const assistantTexts = messages
  .filter((m) => m.assistant_message || m.type === 'assistant_message')
  .map((m) => (m.assistant_message && m.assistant_message.content) || '')
  .filter(Boolean);
dump.assistant_excerpts = assistantTexts.map((t) => String(t).slice(0, 600));

const images = collectImageAtts(messages);
dump.image_count = images.length;
dump.image_names = images.map((i) => i.name);

const downloaded = [];
for (let i = 0; i < images.length; i++) {
  const safe = String(images[i].name).replace(/[^\w.\-]+/g, '_').slice(0, 80) || `sheet-${i}.png`;
  const dest = path.join(OUT_DIR, `${String(i + 1).padStart(2, '0')}-${safe}`);
  try {
    const bytes = await download(images[i].url, dest);
    downloaded.push({ name: safe, bytes, path: dest });
    console.error(`Downloaded ${safe} (${bytes} bytes)`);
  } catch (err) {
    downloaded.push({ name: safe, error: String(err.message || err) });
    console.error(`FAIL ${safe}: ${err.message || err}`);
  }
}
dump.downloaded = downloaded;

fs.writeFileSync(path.join(OUT_DIR, 'run.json'), JSON.stringify(dump, null, 2));
console.log(JSON.stringify({
  ok: true,
  label: dump.label,
  task_id: taskId,
  task_url: dump.task_url,
  status: dump.latest_agent_status || (dump.poll && dump.poll.agent_status) || null,
  image_count: images.length,
  downloaded_ok: downloaded.filter((d) => d.bytes).length,
  out_dir: OUT_DIR,
}, null, 2));
