/**
 * Headless board-background verify loop.
 * Expectation: title + vocab pages bake a topic-relevant scene (not solid gradient).
 *
 * Usage:
 *   node scripts/verify-board-visual.mjs
 *   npm run test:board-bg
 *
 * Requires: playwright + browsers, and `npm start` OR auto-starts static via playwright.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify');
const PORT = Number(process.env.BOARD_BG_PORT || 3457);

const CASES = [
  {
    id: 'doctor',
    fixture: 'doctor-lesson.json',
    expectName: /doctor|hospital|clinic|medical|dentist/i,
    meta: { level: 'A1', duration: '25' },
  },
  {
    id: 'clown-clinic',
    fixture: 'clown-clinic-lesson.json',
    expectName: /doctor|hospital|clinic|medical|pharmacy/i,
    meta: { level: 'B1', duration: '45' },
  },
  {
    id: 'travel',
    fixture: 'travel-lesson.json',
    expectName: /airport|travel|station|bus|train/i,
    meta: { level: 'A1', duration: '25' },
  },
  {
    id: 'school',
    fixture: 'school-lesson.json',
    expectName: /school|classroom|library|hallway/i,
    meta: { level: 'A1', duration: '25' },
  },
];

/** Old chrome gradients — if corner pixels still match these, scenes did not bake. */
const GRADIENT_HINTS = [
  [79, 70, 229],   // title indigo
  [255, 241, 242], // warm pink
  [245, 243, 255], // vocab lilac
];

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function looksLikeOldGradient(rgb) {
  return GRADIENT_HINTS.some((g) => colorDist(rgb, g) < 40);
}

async function ensurePlaywright() {
  try {
    return require('playwright');
  } catch (_) {
    console.error('Installing playwright (one-time)…');
    const { execSync } = require('child_process');
    execSync('npm install -D playwright', { cwd: ROOT, stdio: 'inherit' });
    execSync('npx playwright install chromium', { cwd: ROOT, stdio: 'inherit' });
    return require('playwright');
  }
}

function startStaticServer() {
  const publicDir = path.join(ROOT, 'public');
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(publicDir, urlPath.replace(/^\//, ''));
    if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = await ensurePlaywright();
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const failures = [];
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      window.LessonPages && window.EdbActivities && window.SceneBackgrounds && window.BoardPreview
    );

    for (const c of CASES) {
      const lesson = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', c.fixture), 'utf8')
      );

      const result = await page.evaluate(async ({ lesson, meta }) => {
        const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
        await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
        const picks = (boardPlan.bgPicks || []).map((p) => ({
          type: p.type,
          name: p.name,
          score: p.score ?? null,
          path: p.path,
          groundY: p.groundY ?? null,
        }));

        const canvases = await window.BoardPreview.renderCanvases(lesson, meta);
        const pages = [];
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i];
          const ctx = canvas.getContext('2d');
          // Sample outer corners — cards sit inward; scenes/flats fill edges
          const samples = [
            [8, 8],
            [canvas.width - 9, 8],
            [8, canvas.height - 9],
            [canvas.width - 9, canvas.height - 9],
            [40, 40],
          ].map(([x, y]) => {
            const d = ctx.getImageData(x, y, 1, 1).data;
            return [d[0], d[1], d[2]];
          });
          pages.push({
            index: i,
            dataUrl: canvas.toDataURL('image/jpeg', 0.72),
            samples,
          });
        }
        return {
          pageCount: canvases.length,
          pickCount: picks.length,
          picks,
          titlePick: picks[0] || null,
          vocabPick: picks[2] || null,
          pages: pages.slice(0, 4), // title, warm, vocab, sentences — enough to judge
        };
      }, { lesson, meta: c.meta });

      const caseDir = path.join(OUT, c.id);
      fs.mkdirSync(caseDir, { recursive: true });
      fs.writeFileSync(path.join(caseDir, 'report.json'), JSON.stringify({
        expectName: String(c.expectName),
        ...result,
        pages: result.pages.map((p) => ({ index: p.index, samples: p.samples })),
      }, null, 2));

      for (const p of result.pages) {
        const b64 = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        fs.writeFileSync(path.join(caseDir, `page-${p.index}.jpg`), Buffer.from(b64, 'base64'));
      }

      console.log(`\n=== ${c.id} ===`);
      console.log(`  pages=${result.pageCount} picks=${result.pickCount}`);
      console.log(`  title → ${result.titlePick?.type}:${result.titlePick?.name} score=${result.titlePick?.score}`);
      console.log(`  vocab → ${result.vocabPick?.type}:${result.vocabPick?.name} ${result.vocabPick?.reason || ''}`);

      const sceneCount = result.picks.filter((p) => p.type === 'scene').length;
      const flatCount = result.picks.filter((p) => p.type === 'flat').length;
      console.log(`  mix scenes=${sceneCount} flats=${flatCount}`);

      if (result.pickCount !== result.pageCount) {
        failures.push(`${c.id}: pick/page length mismatch ${result.pickCount} vs ${result.pageCount}`);
      }
      if (!result.titlePick || result.titlePick.type !== 'scene' || !c.expectName.test(result.titlePick.name)) {
        failures.push(`${c.id}: title pick expected scene~${c.expectName}, got ${JSON.stringify(result.titlePick)}`);
      }
      if (!result.vocabPick || result.vocabPick.type !== 'flat') {
        failures.push(`${c.id}: vocab pick expected flat (whiteboard feel), got ${JSON.stringify(result.vocabPick)}`);
      }
      if (flatCount < 3 || sceneCount < 2) {
        failures.push(`${c.id}: expected mixed backgrounds (flats>=3 scenes>=2), got f=${flatCount} s=${sceneCount}`);
      }

      // Pixel check: title corners must not look like old solid indigo chrome
      const titleSamples = result.pages[0]?.samples || [];
      const gradientHits = titleSamples.filter(looksLikeOldGradient).length;
      if (gradientHits >= 3) {
        failures.push(
          `${c.id}: title page corners still look like old gradient chrome (${gradientHits}/5 samples)`
        );
      } else {
        console.log(`  pixel check: title corners OK (gradient-like ${gradientHits}/5)`);
      }

      // Title page should match the place scene file
      if (result.titlePick?.type === 'scene' && result.titlePick.path && titleSamples.length >= 4) {
        const sceneOk = await page.evaluate(async ({ scenePath, samples }) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('scene load fail ' + scenePath));
            img.src = scenePath;
          });
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const pts = [
            [8, 8],
            [c.width - 9, 8],
            [8, c.height - 9],
            [c.width - 9, c.height - 9],
          ];
          const sceneSamples = pts.map(([x, y]) => {
            const d = ctx.getImageData(x, y, 1, 1).data;
            return [d[0], d[1], d[2]];
          });
          // Title uses a dark wash — compare only that samples aren't pure indigo gradient
          let err = 0;
          for (let i = 0; i < 4; i++) {
            err += Math.abs(samples[i][0] - sceneSamples[i][0]);
            err += Math.abs(samples[i][1] - sceneSamples[i][1]);
            err += Math.abs(samples[i][2] - sceneSamples[i][2]);
          }
          return { err: err / 4 };
        }, { scenePath: result.titlePick.path, samples: titleSamples });
        console.log(`  title↔scene corner MAE≈${sceneOk.err.toFixed(1)} (wash; soft)`);
      }

      // matchDock pieces must stay in the dock — not parked on groundY over word cards
      const overlap = await page.evaluate(async ({ lesson, meta }) => {
        const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
        await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
        const vocabPage = boardPlan.pages.find((p) => p.pageKey === 'newWords');
        if (!vocabPage) return { ok: true, reason: 'no vocab page' };
        const pieces = (vocabPage.unlocked || []).filter((p) => p.role === 'matchPiece');
        if (!pieces.length) return { ok: true, reason: 'no match pieces' };
        const L = window.EdbLayout;
        const dock = L.zoneRect(vocabPage, 'dock');
        const body = L.zoneRect(vocabPage, 'bodyText');
        const offenders = [];
        for (const p of pieces) {
          const cy = (p.y || 0) + (p.h || 96) / 2;
          const inBody = body && cy >= body.y && cy <= body.y + body.h;
          const inDock = dock && cy >= dock.y - 20 && cy <= dock.y + dock.h + 40;
          if (inBody && !inDock) {
            offenders.push({ x: p.x, y: p.y, cy, bodyY: body.y, dockY: dock?.y });
          }
        }
        return { ok: offenders.length === 0, offenders, dock, body };
      }, { lesson, meta: c.meta });

      if (!overlap.ok) {
        failures.push(
          `${c.id}: matchDock pieces overlap bodyText (standOn leak): ${JSON.stringify(overlap.offenders.slice(0, 3))}`
        );
      } else {
        console.log('  matchDock dock placement OK');
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n---');
  if (failures.length) {
    console.error('FAILURES:');
    failures.forEach((f) => console.error(' •', f));
    console.error(`\nArtifacts: ${OUT}`);
    process.exit(1);
  }
  console.log('All board-background visual checks passed.');
  console.log(`Artifacts: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
