/**
 * Shared bake bootstrap for producer verify scripts (feelings / classical / offtopic).
 * Server + Playwright open, CLI/env helpers, NDJSON debug log, page-JPG cleanup.
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

export function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

export function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

/** NDJSON debug line; sessionId fixed for this debug run. */
export function logLine(logPath, runId, hypothesisId, message, data) {
  fs.appendFileSync(
    logPath,
    JSON.stringify({
      sessionId: '3c9697',
      runId,
      timestamp: Date.now(),
      hypothesisId,
      message,
      data,
    }) + '\n'
  );
}

/** Remove stale page-N-*.jpg/png so Manus pickImages cannot attach old siblings. */
export function clearPageJpgs(outDir) {
  if (!fs.existsSync(outDir)) return;
  for (const n of fs.readdirSync(outDir)) {
    if (/^page-\d+-.+\.(jpe?g|png)$/i.test(n)) {
      try { fs.unlinkSync(path.join(outDir, n)); } catch { /* ignore */ }
    }
  }
}

/** Serve public/ on an ephemeral localhost port. */
export async function startPublicServer() {
  const publicRoot = path.join(ROOT, 'public');
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
    const file = path.join(publicRoot, rel);
    if (!file.startsWith(publicRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return {
    server,
    port,
    close() {
      server.close();
    },
  };
}

/** Playwright chromium on index.html; waits for board globals. */
export async function openBoardPage(port) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () =>
      window.LessonPages &&
      window.EdbActivities &&
      window.PropBank &&
      window.VocabIcons &&
      window.SceneBackgrounds &&
      window.BoardPreview
  );
  return { browser, page };
}

/**
 * Load or generate story-art into meta.storyArt (shared by feelings + classical).
 * Returns { storyArtResult, storyArtMeta }; storyArtMeta.applied is filled by callers after bake.
 */
export async function prepareStoryArt(lesson, meta, mode) {
  const storyArtMode = String(mode == null ? 'auto' : mode).toLowerCase();
  let storyArtResult = null;
  const storyArtMeta = { mode: storyArtMode, applied: 0, cacheKey: null, cacheHit: false };
  if (storyArtMode === '0' || storyArtMode === 'off' || storyArtMode === 'false') {
    return { storyArtResult, storyArtMeta };
  }
  try {
    const storyArtApi = require(path.join(ROOT, 'api', 'generate-story-art.js'));
    const pages = ((lesson.story && lesson.story.pages) || []).slice(0, 3).map((p, i) => ({
      index: i,
      heading: p.heading || '',
      text: p.text || '',
      visualCaption: p.visualCaption || p.visualTheme || '',
    }));
    const cacheKey = storyArtApi.cacheKeyFor(lesson.title || 'Story', meta.level, pages);
    storyArtMeta.cacheKey = cacheKey;
    storyArtResult = storyArtApi.loadCachedResult(cacheKey);
    if (storyArtResult) {
      storyArtMeta.cacheHit = true;
    } else if (storyArtMode === '1' || storyArtMode === 'true' || storyArtMode === 'on' || storyArtMode === 'gen') {
      const out = { statusCode: 200, body: null };
      const res = {
        setHeader() {},
        status(code) { out.statusCode = code; return this; },
        json(payload) { out.body = payload; return this; },
      };
      await storyArtApi(
        { method: 'POST', body: { title: lesson.title || 'Story', level: meta.level, pages } },
        res
      );
      if (out.statusCode < 400 && out.body && Array.isArray(out.body.pages)) {
        storyArtResult = out.body;
        storyArtMeta.cacheHit = !!out.body.cacheHit;
      }
    }
    if (storyArtResult) meta.storyArt = storyArtResult;
  } catch (err) {
    storyArtMeta.error = err.message || String(err);
  }
  return { storyArtResult, storyArtMeta };
}
