/**
 * Send a baked board JPG directory to Manus for structured ClassIn review.
 *
 *   npm run manus:review -- tmp/board-bg-verify/classical-compose --passoff=manus-passoff.json
 *   node scripts/manus/review.mjs <dir> [--title=...] [--known=a|b] [--fixed=...] [--gates=...] [--focus=...]
 *
 * Pass-off auto-loads <dir>/manus-passoff.json when present (see scripts/manus/passoff.example.json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT,
  fileContentPart,
  createTask,
  pollUntilDone,
} from './client.mjs';
import {
  REVIEW_SCHEMA,
  buildReviewBrief,
  normalizePassOff,
} from './review-schema.mjs';

const KEY_PAGES = [
  'contact.jpg',
  'page-0-title.jpg',
  'page-2-newWords.jpg',
  'page-4-frames.jpg',
  'page-5-story0.jpg',
  'page-8-comprehension.jpg',
  'page-9-activity.jpg',
];

export function arg(name, fallback, argv = process.argv) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function splitPipe(raw) {
  if (!raw) return [];
  return String(raw).split('|').map((s) => s.trim()).filter(Boolean);
}

export function resolveDir(raw) {
  if (!raw) {
    throw new Error('Usage: npm run manus:review -- <verify-dir> [--passoff=manus-passoff.json]');
  }
  const abs = path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new Error(`Not a directory: ${abs}`);
  }
  return abs;
}

export function pickImages(dir) {
  const names = fs.readdirSync(dir).filter((n) => /\.(jpe?g|png)$/i.test(n));
  const preferred = KEY_PAGES.filter((n) => names.includes(n));
  const rest = names
    .filter((n) => !preferred.includes(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
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

/** Load pass-off JSON: --passoff= path, else <dir>/manus-passoff.json. */
export function loadPassOffFile(dir, passoffArg) {
  const candidates = [];
  if (passoffArg) {
    candidates.push(
      path.isAbsolute(passoffArg) ? passoffArg : path.join(dir, passoffArg),
      path.isAbsolute(passoffArg) ? passoffArg : path.join(ROOT, passoffArg)
    );
  }
  candidates.push(path.join(dir, 'manus-passoff.json'));
  for (const p of candidates) {
    if (p && fs.existsSync(p) && fs.statSync(p).isFile()) {
      return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
    }
  }
  return null;
}

function appendLog(row) {
  const logDir = path.join(ROOT, '.cursor', 'ratings');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'manus-reviews.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(row) + '\n');
  return logPath;
}

/**
 * Shared bake→Manus review used by CLI and MCP.
 */
export async function runBoardReview(opts) {
  const dir = resolveDir(opts.dir);
  const filePass = opts.passOffFile
    ? { path: opts.passOffFile, data: JSON.parse(fs.readFileSync(opts.passOffFile, 'utf8')) }
    : loadPassOffFile(dir, opts.passoff);
  const pass = normalizePassOff(filePass ? filePass.data : {}, {
    title: opts.title || path.basename(dir),
    level: opts.level || 'B1',
    duration: opts.duration || '60',
    knownIssues: opts.knownIssues || [],
    justFixed: opts.justFixed || [],
    localChecks: opts.localChecks || [],
    focus: opts.focus || [],
    notes: opts.notes || '',
  });

  const images = pickImages(dir);
  const brief = buildReviewBrief(pass);
  const content = [{ type: 'text', text: brief }];

  for (const filePath of images) {
    const part = await fileContentPart(filePath);
    if (opts.onTick) {
      opts.onTick({ phase: 'attach', filename: part.filename, via: part.via, bytes: part.bytes });
    }
    const { via, bytes, ...contentPart } = part;
    void via;
    void bytes;
    content.push(contentPart);
  }

  const created = await createTask({
    title: `ClassIn review: ${pass.title}`,
    message: { content },
    structured_output_schema: REVIEW_SCHEMA,
    agent_profile: opts.profile || 'manus-1.6',
    hide_in_task_list: false,
    interactive_mode: false,
  });

  const taskId = created.task_id;
  if (opts.onTick) {
    opts.onTick({
      phase: 'created',
      task_id: taskId,
      task_url: created.task_url,
      passoff: filePass ? path.relative(ROOT, filePass.path).replace(/\\/g, '/') : null,
    });
  }

  const done = await pollUntilDone(taskId, {
    intervalMs: opts.pollMs || 4000,
    timeoutMs: opts.timeoutMs || 12 * 60 * 1000,
    onTick: (t) => opts.onTick && opts.onTick({ phase: 'poll', ...t }),
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
    images: images.map((p) => path.basename(p)),
    passoff: {
      file: filePass ? path.relative(ROOT, filePass.path).replace(/\\/g, '/') : null,
      known: pass.knownIssues.length,
      fixed: pass.justFixed.length,
      gates: (Array.isArray(pass.localChecks) ? pass.localChecks : []).length,
      focus: (Array.isArray(pass.focus) ? pass.focus : []).length,
      brief_chars: brief.length,
    },
  };

  const logPath = appendLog({
    date: new Date().toISOString(),
    task_id: taskId,
    task_url: created.task_url || null,
    title: pass.title,
    dir: path.relative(ROOT, dir).replace(/\\/g, '/'),
    verdict: value && value.verdict,
    score: value && value.score,
    next_actions: (value && value.next_actions) || [],
    blocking_issues: (value && value.blocking_issues) || [],
    gate_holes: (value && value.gate_holes) || [],
    method_feedback: (value && value.method_feedback) || [],
    passoff: out.passoff,
  });
  out.log_path = path.relative(ROOT, logPath).replace(/\\/g, '/');
  return out;
}

async function main() {
  const dirArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const dir = resolveDir(dirArg);
  const passoffArg = arg('passoff', '');
  const cliDefaults = {
    title: arg('title', path.basename(dir)),
    level: arg('level', 'B1'),
    duration: arg('duration', '60'),
    knownIssues: splitPipe(arg('known', '')),
    justFixed: splitPipe(arg('fixed', '')),
    localChecks: splitPipe(arg('gates', '')),
    focus: splitPipe(arg('focus', '')),
    notes: arg('notes', ''),
  };
  const filePass = loadPassOffFile(dir, passoffArg || undefined);
  const pass = normalizePassOff(filePass ? filePass.data : {}, cliDefaults);

  if (arg('dry-run', '') === '1' || process.argv.includes('--dry-run')) {
    const images = pickImages(dir);
    const brief = buildReviewBrief(pass);
    console.log(JSON.stringify({
      ok: true,
      dry_run: true,
      dir: path.relative(ROOT, dir).replace(/\\/g, '/'),
      title: pass.title,
      passoff_file: filePass
        ? path.relative(ROOT, filePass.path).replace(/\\/g, '/')
        : null,
      passoff: {
        knownIssues: pass.knownIssues,
        justFixed: pass.justFixed,
        localChecks: pass.localChecks,
        focus: pass.focus,
      },
      images: images.map((p) => path.basename(p)),
      brief,
      brief_chars: brief.length,
      schema_keys: Object.keys(REVIEW_SCHEMA.properties),
      key_present: !!(process.env.MANUS_API_KEY || '').trim(),
    }, null, 2));
    return;
  }

  const out = await runBoardReview({
    dir,
    ...cliDefaults,
    passoff: passoffArg || undefined,
    profile: arg('profile', 'manus-1.6'),
    pollMs: Number(arg('pollMs', '4000')),
    timeoutMs: Number(arg('timeoutMs', String(12 * 60 * 1000))),
    onTick: (ev) => {
      if (ev.phase === 'attach') {
        process.stderr.write(`  attach ${ev.filename} via ${ev.via} (${ev.bytes} bytes)\n`);
      } else if (ev.phase === 'created') {
        process.stderr.write(
          `Task ${ev.task_id}\n${ev.task_url || ''}\nPass-off: ${ev.passoff || '(cli flags only)'}\nPolling...\n`
        );
      } else if (ev.phase === 'poll') {
        process.stderr.write(`  status=${ev.agent_status || 'unknown'}\n`);
      }
    },
  });

  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    if (err.detail) console.error(JSON.stringify(err.detail, null, 2));
    process.exit(1);
  });
}
