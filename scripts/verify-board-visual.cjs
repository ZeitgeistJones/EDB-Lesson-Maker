/**
 * Headless board quality bake — hard rules + artifacts for agent UX loop.
 *
 *   npm run test:board-bg
 *
 * Writes tmp/board-bg-verify/{case}/page-*.jpg, strip.jpg, and aggregate report.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify');
const MAX_PAGES = 50;
const BOARD_W = 1280;
const BOARD_H = 590;
const MAX_UNLOCKED_IOU = 0.4;

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
    id: 'gym',
    fixture: 'gym-lesson.json',
    expectName: /gym|school|playground|sport/i,
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

const GRADIENT_HINTS = [
  [79, 70, 229],
  [255, 241, 242],
  [245, 243, 255],
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
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr && addr.port });
    });
  });
}

function saveJpeg(dataUrl, filePath) {
  const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = await ensurePlaywright();
  const { server, port } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const hardFailures = [];
  const softHints = [];
  const casesOut = [];

  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      window.LessonPages && window.EdbActivities && window.SceneBackgrounds && window.BoardPreview && window.EdbLayout
    );

    for (const c of CASES) {
      const lesson = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', c.fixture), 'utf8')
      );

      const result = await page.evaluate(async ({ lesson, meta, BOARD_W, BOARD_H, MAX_PAGES, MAX_UNLOCKED_IOU }) => {
        const INTENTIONAL = {
          answerCover: 1, cover: 1, rewardFlap: 1, dressPart: 1, hideTarget: 1,
        };

        function iou(a, b) {
          const x1 = Math.max(a.x, b.x);
          const y1 = Math.max(a.y, b.y);
          const x2 = Math.min(a.x + a.w, b.x + b.w);
          const y2 = Math.min(a.y + a.h, b.y + b.h);
          const w = Math.max(0, x2 - x1);
          const h = Math.max(0, y2 - y1);
          const inter = w * h;
          const union = a.w * a.h + b.w * b.h - inter;
          return union <= 0 ? 0 : inter / union;
        }

        function centerIn(rect, cx, cy) {
          return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h;
        }

        function layoutHardFails(boardPlan) {
          const fails = [];
          if (!boardPlan.pages) return fails;
          if (boardPlan.pages.length > MAX_PAGES) {
            fails.push({ code: 'H6', msg: `page count ${boardPlan.pages.length} > ${MAX_PAGES}` });
          }
          for (const pg of boardPlan.pages) {
            const unlocked = pg.unlocked || [];
            const header = window.EdbLayout.zoneRect(pg, 'header');
            const body = window.EdbLayout.zoneRect(pg, 'bodyText');
            for (const p of unlocked) {
              const w = p.w || 96;
              const h = p.h || 96;
              const x = p.x || 0;
              const y = p.y || 0;
              if (x < 0 || y < 0 || x + w > BOARD_W || y + h > BOARD_H) {
                fails.push({
                  code: 'H3',
                  msg: `${pg.pageKey}: piece ${p.role} off-board (${x},${y},${w},${h})`,
                });
              }
              const intentional = !!(p.intentional || INTENTIONAL[p.role]);
              const cx = x + w / 2;
              const cy = y + h / 2;
              if (!intentional) {
                if (header && centerIn(header, cx, cy)) {
                  fails.push({ code: 'H3', msg: `${pg.pageKey}: ${p.role} center in header` });
                }
                if (body && centerIn(body, cx, cy)) {
                  fails.push({ code: 'H3', msg: `${pg.pageKey}: ${p.role} center in bodyText` });
                }
              }
            }
            for (let i = 0; i < unlocked.length; i++) {
              for (let j = i + 1; j < unlocked.length; j++) {
                const a = unlocked[i];
                const b = unlocked[j];
                if (a.intentional || b.intentional || INTENTIONAL[a.role] || INTENTIONAL[b.role]) continue;
                const ra = { x: a.x || 0, y: a.y || 0, w: a.w || 96, h: a.h || 96 };
                const rb = { x: b.x || 0, y: b.y || 0, w: b.w || 96, h: b.h || 96 };
                const v = iou(ra, rb);
                if (v > MAX_UNLOCKED_IOU) {
                  fails.push({
                    code: 'H3',
                    msg: `${pg.pageKey}: unlocked IoU ${v.toFixed(2)} > ${MAX_UNLOCKED_IOU} (${a.role}/${b.role})`,
                  });
                }
              }
            }
          }
          return fails;
        }

        async function answerLeakCheck(lesson, meta, boardPlan) {
          const hasMatch = (boardPlan.assignments || []).some((a) => a.recipeId === 'matchDock');
          if (!hasMatch) return { ok: true, skipped: true };
          const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
          try {
            const keys = rendered.slots?.byKey || {};
            const idx = keys.newWords;
            const el = rendered.pageEls[idx];
            if (!el) return { ok: true, reason: 'no newWords el' };
            // Word cards should not embed answer pictures when matchDock is on
            const cardImgs = el.querySelectorAll('img');
            // Background pack imgs are ok (full-bleed); card icons are nested in white cards
            const nested = [...cardImgs].filter((img) => {
              let n = img.parentElement;
              while (n && n !== el) {
                const bg = (n.style && n.style.background) || '';
                if (bg.includes('#ffffff') || bg.includes('rgb(255, 255, 255)')) return true;
                n = n.parentElement;
              }
              return false;
            });
            return {
              ok: nested.length === 0,
              nestedCount: nested.length,
              code: nested.length ? 'H5' : null,
              msg: nested.length
                ? `matchDock answer leak: ${nested.length} icon(s) inside vocab cards`
                : null,
            };
          } finally {
            window.LessonPages.cleanup(rendered.host);
          }
        }

        const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
        await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
        const picks = (boardPlan.bgPicks || []).map((p) => ({
          type: p.type,
          name: p.name,
          score: p.score ?? null,
          path: p.path,
          groundY: p.groundY ?? null,
          reason: p.reason || null,
          reused: !!p.reused,
        }));

        const layoutFails = layoutHardFails(boardPlan);
        const leak = await answerLeakCheck(lesson, meta, boardPlan);

        const canvases = await window.BoardPreview.renderCanvases(lesson, meta);
        const pages = [];
        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i];
          const ctx = canvas.getContext('2d');
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

        const strip = document.createElement('canvas');
        strip.width = BOARD_W;
        strip.height = BOARD_H * canvases.length;
        const sctx = strip.getContext('2d');
        sctx.fillStyle = '#fff';
        sctx.fillRect(0, 0, strip.width, strip.height);
        canvases.forEach((c, i) => sctx.drawImage(c, 0, i * BOARD_H));

        return {
          pageCount: canvases.length,
          pickCount: picks.length,
          picks,
          pageKeys: (boardPlan.pages || []).map((p) => p.pageKey),
          assignments: boardPlan.assignments || [],
          titlePick: picks[0] || null,
          vocabPick: picks[2] || null,
          pages,
          stripDataUrl: strip.toDataURL('image/jpeg', 0.7),
          layoutFails,
          answerLeak: leak,
        };
      }, { lesson, meta: c.meta, BOARD_W, BOARD_H, MAX_PAGES, MAX_UNLOCKED_IOU });

      const caseDir = path.join(OUT, c.id);
      fs.mkdirSync(caseDir, { recursive: true });
      const caseHard = [];
      const caseSoft = [];

      saveJpeg(result.stripDataUrl, path.join(caseDir, 'strip.jpg'));
      for (const p of result.pages) {
        saveJpeg(p.dataUrl, path.join(caseDir, `page-${p.index}.jpg`));
      }

      console.log(`\n=== ${c.id} ===`);
      console.log(`  pages=${result.pageCount} picks=${result.pickCount}`);
      console.log(`  title → ${result.titlePick?.type}:${result.titlePick?.name} score=${result.titlePick?.score}`);
      console.log(`  vocab → ${result.vocabPick?.type}:${result.vocabPick?.name}`);

      const sceneCount = result.picks.filter((p) => p.type === 'scene').length;
      const flatCount = result.picks.filter((p) => p.type === 'flat').length;
      const placeName = result.titlePick && result.titlePick.name;
      console.log(`  mix scenes=${sceneCount} flats=${flatCount}`);
      console.log(
        '  plan:',
        result.picks.map((p, i) => `${i}:${p.type[0]}:${p.name}`).join(' | ')
      );

      function fail(code, msg) {
        const line = `${c.id}: [${code}] ${msg}`;
        caseHard.push({ code, msg });
        hardFailures.push(line);
      }

      if (result.pickCount !== result.pageCount) {
        fail('H2', `pick/page length mismatch ${result.pickCount} vs ${result.pageCount}`);
      }
      if (!result.titlePick || result.titlePick.type !== 'scene' || !c.expectName.test(result.titlePick.name)) {
        fail('H1', `title pick expected scene~${c.expectName}, got ${JSON.stringify(result.titlePick)}`);
      }
      if (!result.vocabPick || result.vocabPick.type !== 'flat') {
        fail('H2', `vocab pick expected flat, got ${JSON.stringify(result.vocabPick)}`);
      }
      if (flatCount < 3 || sceneCount < 2) {
        fail('H2', `expected mix flats>=3 scenes>=2, got f=${flatCount} s=${sceneCount}`);
      }

      (result.pageKeys || []).forEach((key, i) => {
        const pick = result.picks[i];
        if (!pick) return;
        const isPlace = key === 'title' || key === 'activity' || String(key).startsWith('story');
        if (isPlace) {
          if (pick.type !== 'scene' || pick.name !== placeName) {
            fail('H1', `place page ${key} should reuse ${placeName}, got ${pick.type}:${pick.name}`);
          }
        } else if (pick.type !== 'flat') {
          fail('H2', `drill page ${key} should be flat, got ${pick.type}:${pick.name}`);
        }
      });

      const flatNames = result.picks.filter((p) => p.type === 'flat').map((p) => p.name);
      if (flatNames.length >= 3 && new Set(flatNames).size === 1) {
        fail('H2', `flats not rotating (all ${flatNames[0]})`);
      }

      const titleSamples = result.pages[0]?.samples || [];
      const gradientHits = titleSamples.filter(looksLikeOldGradient).length;
      if (gradientHits >= 3) {
        fail('H4', `title corners look like old gradient chrome (${gradientHits}/5)`);
      } else {
        console.log(`  pixel check: title corners OK (gradient-like ${gradientHits}/5)`);
      }

      for (const lf of result.layoutFails || []) {
        fail(lf.code || 'H3', lf.msg);
      }
      if (result.answerLeak && !result.answerLeak.ok) {
        fail(result.answerLeak.code || 'H5', result.answerLeak.msg || 'answer leak');
      } else {
        console.log('  matchDock answer-leak check OK');
      }

      // Soft hints for agent (not hard fail)
      const warmIdx = (result.pageKeys || []).indexOf('warm');
      if (warmIdx >= 0) {
        caseSoft.push({ code: 'S10', page: warmIdx, hint: 'Check warm-up emptiness / vertical balance' });
      }
      const storyIdx = (result.pageKeys || []).findIndex((k) => String(k).startsWith('story'));
      if (storyIdx >= 0) {
        caseSoft.push({ code: 'S12', page: storyIdx, hint: 'Check sparse story card / side-art cue' });
      }
      softHints.push(...caseSoft.map((s) => ({ caseId: c.id, ...s })));

      fs.writeFileSync(path.join(caseDir, 'report.json'), JSON.stringify({
        id: c.id,
        expectName: String(c.expectName),
        pageCount: result.pageCount,
        picks: result.picks,
        pageKeys: result.pageKeys,
        assignments: result.assignments,
        hardFailures: caseHard,
        softHints: caseSoft,
        artifacts: {
          strip: path.join(caseDir, 'strip.jpg'),
          pages: result.pages.map((p) => path.join(caseDir, `page-${p.index}.jpg`)),
        },
      }, null, 2));

      casesOut.push({
        id: c.id,
        pageCount: result.pageCount,
        sceneCount,
        flatCount,
        title: result.titlePick,
        hardFailures: caseHard,
        softHints: caseSoft,
        strip: `tmp/board-bg-verify/${c.id}/strip.jpg`,
        reviewPages: [0, 1, 2, storyIdx >= 0 ? storyIdx : 5, (result.pageKeys || []).indexOf('activity')]
          .filter((i) => i >= 0)
          .map((i) => `tmp/board-bg-verify/${c.id}/page-${i}.jpg`),
      });
    }
  } finally {
    await browser.close();
    server.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    hardFailures,
    softHints,
    cases: casesOut,
    uxVerdict: null,
    iteration: null,
    policy: 'See scripts/ux-board-rubric.cjs — agent fills uxVerdict after strip review',
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n---');
  console.log(`Aggregate report: ${path.join(OUT, 'report.json')}`);
  if (hardFailures.length) {
    console.error('HARD FAILURES:');
    hardFailures.forEach((f) => console.error(' •', f));
    process.exit(1);
  }
  console.log('All board hard checks passed.');
  console.log(`Artifacts: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
