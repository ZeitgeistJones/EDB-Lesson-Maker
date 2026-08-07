#!/usr/bin/env node
/**
 * Send a baked board JPG directory to Manus for structured ClassIn review.
 *
 *   npm run manus:review -- tmp/board-bg-verify/classical-compose
 *   node scripts/manus/review.mjs <dir> [--title=...] [--level=B1] [--duration=60] [--known=...]
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  uploadFile,
  createTask,
  pollUntilDone,
} from './client.mjs';
import { REVIEW_SCHEMA, buildReviewBrief } from './review-schema.mjs';

const KEY_PAGES = [
  'contact.jpg',
  'page-0-title.jpg',
  'page-2-newWords.jpg',
  'page-4-frames.jpg',
  'page-5-story0.jpg',
  'page-9-activity.jpg',
];

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function resolveDir(raw) {
  if (!raw) {
    throw new Error('Usage: npm run manus:review -- <verify-dir>');
  }
  const abs = path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new Error(`Not a directory: ${abs}`);
  }
  return abs;
}

function pickImages(dir) {
  const names = fs.readdirSync(dir).filter((n) => /\.(jpe?g|png)$/i.test(n));
  const preferred = KEY_PAGES.filter((n) => names.includes(n));
  const rest = names
    .filter((n) => !preferred.includes(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  // Cap attachments — overview + key beats + a few more if needed.
  const chosen = [...preferred];
  for (const n of rest) {
    if (chosen.length >= 10) break;
    if (/^page-\d+/.test(n)) chosen.push(n);
  }
  if (!chosen.length) {
    throw new Error(`No JPG/PNG pages in ${dir}`);
  }
  return chosen.map((n) => path.join(dir, n));
}

function appendLog(row) {
  const logDir = path.join(ROOT, '.cursor', 'ratings');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'manus-reviews.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(row) + '\n');
  return logPath;
}

async function main() {
  const dirArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const dir = resolveDir(dirArg);
  const title = arg('title', path.basename(dir));
  const level = arg('level', 'B1');
  const duration = arg('duration', '60');
  const knownRaw = arg('known', '');
  const knownIssues = knownRaw
    ? knownRaw.split('|').map((s) => s.trim()).filter(Boolean)
    : [
        'Title charm may stack a musician over terrace piano (wishlist)',
        'Story pages may still use cheap glyph side art (wishlist)',
      ];

  const images = pickImages(dir);
  process.stderr.write(`Uploading ${images.length} images from ${dir}...\n`);

  const content = [
    {
      type: 'text',
      text: buildReviewBrief({ title, level, duration, knownIssues }),
    },
  ];

  for (const filePath of images) {
    const up = await uploadFile(filePath);
    process.stderr.write(`  uploaded ${up.filename} (${up.bytes} bytes) → ${up.file_id}\n`);
    content.push({
      type: 'file',
      file_id: up.file_id,
      filename: up.filename,
    });
  }

  const created = await createTask({
    title: `ClassIn review: ${title}`,
    message: { content },
    structured_output_schema: REVIEW_SCHEMA,
    agent_profile: arg('profile', 'manus-1.6'),
    hide_in_task_list: false,
    interactive_mode: false,
  });

  const taskId = created.task_id;
  process.stderr.write(`Task ${taskId}\n${created.task_url || ''}\nPolling...\n`);

  const done = await pollUntilDone(taskId, {
    intervalMs: Number(arg('pollMs', '4000')),
    timeoutMs: Number(arg('timeoutMs', String(12 * 60 * 1000))),
    onTick: ({ agent_status }) => {
      process.stderr.write(`  status=${agent_status || 'unknown'}\n`);
    },
  });

  const value = done.structured && done.structured.value;
  const success = done.structured && done.structured.success;

  const out = {
    ok: done.agent_status === 'stopped' && success !== false,
    task_id: taskId,
    task_url: created.task_url || null,
    agent_status: done.agent_status,
    structured_success: success !== false,
    review: value || null,
    structured_error: (done.structured && done.structured.error) || null,
    assistant_excerpt: (done.assistant_messages || []).slice(-1)[0] || null,
  };

  const logPath = appendLog({
    date: new Date().toISOString(),
    task_id: taskId,
    task_url: created.task_url || null,
    title,
    dir: path.relative(ROOT, dir).replace(/\\/g, '/'),
    verdict: value && value.verdict,
    score: value && value.score,
    next_actions: (value && value.next_actions) || [],
    blocking_issues: (value && value.blocking_issues) || [],
  });
  process.stderr.write(`Logged → ${logPath}\n`);

  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.detail) console.error(JSON.stringify(err.detail, null, 2));
  process.exit(1);
});
