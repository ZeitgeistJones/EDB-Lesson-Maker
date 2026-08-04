/**
 * Headless board quality bake — hard rules, measured UX metrics, and artifacts
 * for the agent review loop.
 *
 *   node scripts/verify-board-visual.cjs [--tier=core|adversarial|all] [--cases=gym,travel]
 *
 * Writes tmp/board-bg-verify/{case}/page-*.jpg, contact.jpg, strip.jpg, review.json
 * plus the aggregate tmp/board-bg-verify/report.json.
 *
 * Hard failures exit 1. Metrics (M*) and regressions (R1) never fail the bake —
 * they feed the review queue so the agent looks at the right pages first.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const rubric = require('./ux-board-rubric.cjs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify');
const FIXTURES = path.join(__dirname, 'fixtures');
const BASELINE_PATH = path.join(__dirname, 'quality-baseline.json');
const STATE_PATH = path.join(__dirname, 'quality-state.json');

const MAX_PAGES = 50;
const BOARD_W = 1280;
const BOARD_H = 590;
const MAX_UNLOCKED_IOU = 0.4;

/** Extra slack before a metric drop counts as a regression. */
const REGRESSION_ABS = { M1: 2, M2: 0.08, M3: 0.03, M4: 0.08, M5: 0.08, M6: 0.5, M7: 0.08, M8: 0.06 };
const REGRESSION_REL = 0.12;

const GRADIENT_HINTS = [
  [79, 70, 229],
  [255, 241, 242],
  [245, 243, 255],
];

function parseArgs(argv) {
  const out = { tier: 'core', cases: null };
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    if (m[1] === 'tier') out.tier = (m[2] || 'core').toLowerCase();
    if (m[1] === 'cases') out.cases = (m[2] || '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

function loadCases({ tier, cases }) {
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'cases.json'), 'utf8'));
  let list = manifest.cases || [];
  if (cases && cases.length) {
    list = list.filter((c) => cases.includes(c.id));
  } else if (tier !== 'all') {
    list = list.filter((c) => (c.tier || 'core') === tier);
  }
  if (!list.length) throw new Error(`No cases matched tier=${tier} cases=${cases || '(all)'}`);
  return list;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

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
    '.jpg': 'image/jpeg',
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

/** Runs in the browser: build the board, measure it, and rasterize artifacts. */
/* eslint-disable no-undef */
async function measureInPage({ lesson, meta, BOARD_W, BOARD_H, MAX_PAGES, MAX_UNLOCKED_IOU }) {
  const INTENTIONAL = { answerCover: 1, cover: 1, rewardFlap: 1, dressPart: 1, hideTarget: 1 };
  const HEADER_MIN_PX = 30;
  const BUSY_STDDEV = 26;

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
          fails.push({ code: 'H3', msg: `${pg.pageKey}: piece ${p.role} off-board (${x},${y},${w},${h})` });
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

  function parseColor(str) {
    const m = /rgba?\(([^)]+)\)/.exec(str || '');
    if (!m) return null;
    const parts = m[1].split(',').map((s) => parseFloat(s));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts.length > 3 ? parts[3] : 1 };
  }

  function relLum({ r, g, b }) {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(a, b) {
    const l1 = relLum(a);
    const l2 = relLum(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function blend(fg, bg, alpha) {
    return {
      r: fg.r * alpha + bg.r * (1 - alpha),
      g: fg.g * alpha + bg.g * (1 - alpha),
      b: fg.b * alpha + bg.b * (1 - alpha),
    };
  }

  const isEmoji = (() => {
    let re = null;
    try {
      re = new RegExp('\\p{Extended_Pictographic}', 'u');
    } catch (_) {
      re = /[\u2190-\u2BFF\uD800-\uDFFF]/;
    }
    return (s) => re.test(s);
  })();

  function directText(node) {
    let s = '';
    for (const c of node.childNodes) if (c.nodeType === 3) s += c.textContent;
    return s.replace(/\s+/g, ' ').trim();
  }

  function visible(node, cs) {
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return parseFloat(cs.opacity || '1') > 0.05;
  }

  async function waitForImages(host) {
    await Promise.all(
      [...host.querySelectorAll('img')].map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2000);
        });
      })
    );
    await new Promise((r) => setTimeout(r, 60));
  }

  /** Background pack image drawn with object-fit: cover, so metrics see what students see. */
  function bgStats(bgImg) {
    if (!bgImg || !bgImg.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = BOARD_W;
    c.height = BOARD_H;
    const ctx = c.getContext('2d');
    const nw = bgImg.naturalWidth;
    const nh = bgImg.naturalHeight;
    const scale = Math.max(BOARD_W / nw, BOARD_H / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    ctx.drawImage(bgImg, (BOARD_W - dw) / 2, (BOARD_H - dh) / 2, dw, dh);
    let data;
    try {
      data = ctx.getImageData(0, 0, BOARD_W, BOARD_H).data;
    } catch (_) {
      return null;
    }
    return {
      region(rect) {
        const x0 = Math.max(0, Math.floor(rect.x));
        const y0 = Math.max(0, Math.floor(rect.y));
        const x1 = Math.min(BOARD_W, Math.ceil(rect.x + rect.w));
        const y1 = Math.min(BOARD_H, Math.ceil(rect.y + rect.h));
        let n = 0;
        let sum = 0;
        let sumSq = 0;
        let sr = 0;
        let sg = 0;
        let sb = 0;
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * BOARD_W + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            n++;
            sum += gray;
            sumSq += gray * gray;
            sr += r;
            sg += g;
            sb += b;
          }
        }
        if (!n) return null;
        const mean = sum / n;
        const variance = Math.max(0, sumSq / n - mean * mean);
        return {
          stddev: Math.sqrt(variance),
          color: { r: sr / n, g: sg / n, b: sb / n },
        };
      },
    };
  }

  function measurePage(pageEl) {
    const pageRect = pageEl.getBoundingClientRect();
    const rel = (r) => ({
      x: r.left - pageRect.left,
      y: r.top - pageRect.top,
      w: r.width,
      h: r.height,
    });
    const pageArea = BOARD_W * BOARD_H;

    let bgImg = null;
    let wash = null;
    const cards = [];
    const overlays = [];
    const textBlocks = [];
    let artCount = 0;

    /** Strongest rgba stop in a gradient — our scrims darken from the top. */
    function gradientStop(bgImage) {
      const stops = String(bgImage || '').match(/rgba?\([^)]+\)/g) || [];
      let best = null;
      for (const s of stops) {
        const c = parseColor(s);
        if (!c) continue;
        if (!best || c.a > best.a) best = c;
      }
      return best;
    }

    for (const node of pageEl.querySelectorAll('*')) {
      const cs = getComputedStyle(node);
      if (!visible(node, cs)) continue;
      const r = rel(node.getBoundingClientRect());
      if (r.w <= 0 || r.h <= 0) continue;
      const area = r.w * r.h;
      const fullBleed = r.w >= BOARD_W * 0.94 && r.h >= BOARD_H * 0.94;

      if (node.tagName === 'IMG') {
        if (fullBleed && !bgImg) bgImg = node;
        else artCount++;
        continue;
      }

      if (/gradient/.test(cs.backgroundImage || '') && area > pageArea * 0.05) {
        const stop = gradientStop(cs.backgroundImage);
        if (stop) {
          overlays.push({ rect: r, color: stop, alpha: stop.a });
          if (fullBleed && !wash) wash = node;
          continue;
        }
      }

      const bgColor = parseColor(cs.backgroundColor);
      if (bgColor && bgColor.a >= 0.5 && area > pageArea * 0.02 && area < pageArea * 0.92) {
        cards.push({ rect: r, area, color: bgColor, lum: relLum(bgColor) });
      }

      const text = directText(node);
      if (!text) continue;
      const fontSize = parseFloat(cs.fontSize) || 0;
      const color = parseColor(cs.color) || { r: 15, g: 23, b: 42, a: 1 };
      if (isEmoji(text) && !/[a-zA-Z0-9]/.test(text)) {
        if (fontSize >= 24) artCount++;
        continue;
      }
      textBlocks.push({ rect: r, area, text, fontSize, color });
    }

    // Only a real content panel counts for fill ratio — not a 50px word chip.
    const PANEL_MIN_AREA = pageArea * 0.12;
    const lightCards = cards.filter((c) => c.lum >= 0.35);
    const primaryCard =
      lightCards
        .filter((c) => c.area >= PANEL_MIN_AREA)
        .sort((a, b) => b.area - a.area)[0] || null;

    function backingCard(block) {
      const bx = block.rect.x + block.rect.w / 2;
      const by = block.rect.y + block.rect.h / 2;
      let best = null;
      for (const c of cards) {
        if (
          bx >= c.rect.x && bx <= c.rect.x + c.rect.w &&
          by >= c.rect.y && by <= c.rect.y + c.rect.h &&
          c.area >= block.area
        ) {
          if (!best || c.area < best.area) best = c;
        }
      }
      return best;
    }

    function coveringOverlays(block) {
      const bx = block.rect.x + block.rect.w / 2;
      const by = block.rect.y + block.rect.h / 2;
      return overlays.filter(
        (o) =>
          bx >= o.rect.x && bx <= o.rect.x + o.rect.w && by >= o.rect.y && by <= o.rect.y + o.rect.h
      );
    }

    const stats = bgStats(bgImg);
    const readable = textBlocks.filter((b) => b.text.length >= 3 && b.area > 300);

    let bareOnBusy = 0;
    let minContrast = null;
    for (const b of readable) {
      const card = backingCard(b);
      const scrims = coveringOverlays(b);
      const region = stats && stats.region(b.rect);
      const busy = region ? region.stddev > BUSY_STDDEV : false;
      if (!card && !scrims.length && busy) bareOnBusy++;

      if (b.fontSize >= HEADER_MIN_PX) {
        let effBg = region ? region.color : { r: 240, g: 240, b: 245 };
        for (const o of scrims) effBg = blend(o.color, effBg, Math.min(1, o.alpha));
        if (card) effBg = blend(card.color, effBg, Math.min(1, card.color.a));
        const ratio = contrastRatio(b.color, effBg);
        if (minContrast == null || ratio < minContrast) minContrast = ratio;
      }
    }

    const textInPrimary = primaryCard
      ? readable
          .filter((b) => {
            const bx = b.rect.x + b.rect.w / 2;
            const by = b.rect.y + b.rect.h / 2;
            return (
              bx >= primaryCard.rect.x && bx <= primaryCard.rect.x + primaryCard.rect.w &&
              by >= primaryCard.rect.y && by <= primaryCard.rect.y + primaryCard.rect.h
            );
          })
          .reduce((s, b) => s + b.area, 0)
      : 0;

    const minTextPx = readable.length
      ? Math.min(...readable.map((b) => Math.round(b.fontSize)))
      : null;

    const contentBottom = [...readable, ...cards].reduce(
      (max, item) => Math.max(max, item.rect.y + item.rect.h),
      0
    );

    return {
      contentBottom,
      M1: minTextPx,
      M2: readable.length ? Number((bareOnBusy / readable.length).toFixed(3)) : 0,
      M3: primaryCard ? Number(Math.min(1, textInPrimary / primaryCard.area).toFixed(3)) : null,
      M6: minContrast == null ? null : Number(minContrast.toFixed(2)),
      artCount,
      textBlocks: readable.length,
      cardCount: cards.length,
      overlayCount: overlays.length,
      hasWash: !!wash,
      hasPackBg: !!bgImg,
    };
  }

  function histogram(canvas) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 64, 32);
    const data = ctx.getImageData(0, 0, 64, 32).data;
    const bins = new Array(64).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const idx =
        Math.floor(data[i] / 64) * 16 + Math.floor(data[i + 1] / 64) * 4 + Math.floor(data[i + 2] / 64);
      bins[idx]++;
    }
    const total = 64 * 32;
    return bins.map((v) => v / total);
  }

  function histDistance(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
    return d / 2; // 0..1
  }

  async function answerLeakCheck(boardPlan, rendered) {
    const hasMatch = (boardPlan.assignments || []).some((a) => a.recipeId === 'matchDock');
    if (!hasMatch) return { ok: true, skipped: true };
    const idx = rendered.slots?.byKey?.newWords;
    const el = rendered.pageEls[idx];
    if (!el) return { ok: true, reason: 'no newWords el' };
    const nested = [...el.querySelectorAll('img')].filter((img) => {
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
      msg: nested.length ? `matchDock answer leak: ${nested.length} icon(s) inside vocab cards` : null,
    };
  }

  /**
   * Vocab art is "vetted" when a human chose it: a verified pack PNG or a
   * curated SAFE_EMOJI glyph. A raw Gemini emoji is not vetted — that is how a
   * beach umbrella ended up on a gym lesson. Duplicate glyphs inside one lesson
   * are called out too: two different words showing the same picture confuses
   * students no matter how pretty it is.
   */
  async function vocabArtCoverage(lesson) {
    const entries = (lesson.vocabulary || []).filter((v) => v && v.word);
    if (!entries.length || !window.VocabIcons) {
      return { M7: null, unvettedWords: [], duplicateGlyphs: [], words: 0 };
    }
    await window.VocabIcons.ready();
    const unvetted = [];
    const glyphOwners = {};
    let vetted = 0;
    for (const v of entries) {
      const packPath = await window.VocabIcons.pathFor(v.word);
      const curated = window.VocabIcons.isCurated ? window.VocabIcons.isCurated(v.word) : false;
      if (packPath || curated) vetted++;
      else unvetted.push(v.word);
      const glyph = window.VocabIcons.emojiFor(v.word, v.emoji);
      if (glyph && glyph !== '•') {
        glyphOwners[glyph] = glyphOwners[glyph] || [];
        glyphOwners[glyph].push(v.word);
      }
    }
    const duplicateGlyphs = Object.entries(glyphOwners)
      .filter(([, ws]) => ws.length > 1)
      .map(([glyph, ws]) => ({ glyph, words: ws }));
    return {
      M7: Number((vetted / entries.length).toFixed(3)),
      unvettedWords: unvetted,
      duplicateGlyphs,
      words: entries.length,
    };
  }

  // ---- build board ----
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
  const pageKeys = (boardPlan.pages || []).map((p) => p.pageKey);
  const recipeByKey = {};
  for (const a of boardPlan.assignments || []) recipeByKey[a.pageKey] = a.recipeId;

  // DOM pass: geometry + type metrics
  const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
  await waitForImages(rendered.host);
  const leak = await answerLeakCheck(boardPlan, rendered);
  const domKeys = Object.entries(rendered.slots?.byKey || {}).reduce((acc, [k, i]) => {
    acc[i] = k;
    return acc;
  }, {});
  const pageMetrics = rendered.pageEls.map((el) => measurePage(el));
  window.LessonPages.cleanup(rendered.host);

  // Dock / prop art lives in the board plan and is painted straight to canvas,
  // so it never shows up in the DOM pass.
  const POSTER_PAGES = { title: 1, wrap: 1 };
  (boardPlan.pages || []).forEach((pg, i) => {
    const m = pageMetrics[i];
    if (!m) return;
    const pieces = [...(pg.locked || []), ...(pg.unlocked || [])];
    const pieceArt = pieces.filter((p) => p.kind !== 'text').length;
    m.pieceArt = pieceArt;
    m.artCount += pieceArt;

    // Dock pieces are real content, so a page that reserves space for them is
    // not empty. Poster pages are meant to be airy, and on a scene page the
    // "empty" lower half is the room the student is looking at — both exempt.
    const pieceBottom = pieces.reduce((max, p) => Math.max(max, (p.y || 0) + (p.h || 96)), 0);
    const onScene = ((boardPlan.bgPicks || [])[i] || {}).type === 'scene';
    m.M8 = POSTER_PAGES[pg.pageKey] || onScene
      ? null
      : Number((Math.max(m.contentBottom || 0, pieceBottom) / BOARD_H).toFixed(3));
    delete m.contentBottom;
  });

  const vocabArt = await vocabArtCoverage(lesson);

  // Pixel pass: composited canvases
  const canvases = await window.BoardPreview.renderCanvases(lesson, meta);
  const hists = canvases.map((c) => histogram(c));
  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < hists.length; i++) {
    for (let j = i + 1; j < hists.length; j++) {
      pairSum += histDistance(hists[i], hists[j]);
      pairs++;
    }
  }
  const meanPageDistance = pairs ? Number((pairSum / pairs).toFixed(3)) : 0;
  const distinctBg = new Set(picks.map((p) => `${p.type}:${p.name}`)).size;
  const distinctBgRatio = picks.length ? Number((distinctBg / picks.length).toFixed(3)) : 0;

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
    const key = pageKeys[i] || domKeys[i] || `page${i}`;
    pages.push({
      index: i,
      pageKey: key,
      recipe: recipeByKey[key] || null,
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      samples,
      metrics: pageMetrics[i] || null,
    });
  }

  const artPages = pageMetrics.filter((m) => m && m.artCount > 0).length;
  const caseMetrics = {
    M4: pageMetrics.length ? Number((artPages / pageMetrics.length).toFixed(3)) : null,
    M5: Number(Math.min(1, distinctBgRatio * 0.5 + Math.min(1, meanPageDistance * 2) * 0.5).toFixed(3)),
    M7: vocabArt.M7,
    distinctBgRatio,
    meanPageDistance,
    vocabUnvettedWords: vocabArt.unvettedWords,
    vocabDuplicateGlyphs: vocabArt.duplicateGlyphs,
    vocabWordCount: vocabArt.words,
  };

  // Tall strip (legacy scan) — kept, but the contact sheet is the review lens.
  const strip = document.createElement('canvas');
  strip.width = BOARD_W;
  strip.height = BOARD_H * canvases.length;
  const sctx = strip.getContext('2d');
  sctx.fillStyle = '#fff';
  sctx.fillRect(0, 0, strip.width, strip.height);
  canvases.forEach((c, i) => sctx.drawImage(c, 0, i * BOARD_H));

  // Labeled contact sheet: 2 columns, each page tagged with index / key / recipe
  const COLS = 2;
  const CELL_W = Math.floor(BOARD_W / COLS);
  const CELL_H = Math.round((CELL_W / BOARD_W) * BOARD_H);
  const LABEL_H = 24;
  const rows = Math.ceil(canvases.length / COLS);
  const contact = document.createElement('canvas');
  contact.width = CELL_W * COLS;
  contact.height = rows * (CELL_H + LABEL_H);
  const cctx = contact.getContext('2d');
  cctx.fillStyle = '#0f172a';
  cctx.fillRect(0, 0, contact.width, contact.height);
  canvases.forEach((c, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL_W;
    const y = row * (CELL_H + LABEL_H);
    cctx.drawImage(c, x, y + LABEL_H, CELL_W, CELL_H);
    cctx.fillStyle = '#111827';
    cctx.fillRect(x, y, CELL_W, LABEL_H);
    cctx.fillStyle = '#f8fafc';
    cctx.font = '700 15px Poppins, sans-serif';
    cctx.textBaseline = 'middle';
    const p = pages[i];
    const label = `#${i}  ${p.pageKey}${p.recipe ? '  ·  ' + p.recipe : ''}`;
    cctx.fillText(label, x + 10, y + LABEL_H / 2);
    cctx.strokeStyle = 'rgba(148,163,184,0.55)';
    cctx.lineWidth = 1;
    cctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, CELL_H + LABEL_H - 1);
  });

  return {
    pageCount: canvases.length,
    pickCount: picks.length,
    picks,
    pageKeys,
    assignments: boardPlan.assignments || [],
    titlePick: picks[0] || null,
    vocabPick: picks[2] || null,
    pages,
    caseMetrics,
    stripDataUrl: strip.toDataURL('image/jpeg', 0.6),
    contactDataUrl: contact.toDataURL('image/jpeg', 0.82),
    layoutFails,
    answerLeak: leak,
  };
}
/* eslint-enable no-undef */

function metricFlagsFor(caseId, result) {
  const flags = [];
  const push = (code, value, scope, pageKey, pageIndex) => {
    const grade = rubric.gradeMetric(code, value);
    if (grade === 'ok' || grade === 'unknown') return;
    flags.push({
      caseId,
      code,
      grade,
      value,
      scope,
      pageKey: pageKey || null,
      pageIndex: pageIndex == null ? null : pageIndex,
      label: rubric.METRICS[code].label,
      tier: rubric.codeTier(code),
    });
  };

  for (const p of result.pages) {
    if (!p.metrics) continue;
    push('M1', p.metrics.M1, 'page', p.pageKey, p.index);
    push('M2', p.metrics.M2, 'page', p.pageKey, p.index);
    push('M3', p.metrics.M3, 'page', p.pageKey, p.index);
    push('M6', p.metrics.M6, 'page', p.pageKey, p.index);
    push('M8', p.metrics.M8, 'page', p.pageKey, p.index);
  }
  push('M4', result.caseMetrics.M4, 'case');
  push('M5', result.caseMetrics.M5, 'case');
  push('M7', result.caseMetrics.M7, 'case');
  return flags;
}

function worseThan(code, current, base) {
  const m = rubric.METRICS[code];
  if (!m || current == null || base == null) return false;
  const slack = Math.max(REGRESSION_ABS[code] || 0, Math.abs(base) * REGRESSION_REL);
  return m.worseWhen === 'lower' ? current < base - slack : current > base + slack;
}

function regressionsFor(caseId, result, baselineCase) {
  if (!baselineCase) return [];
  const out = [];
  const basePages = baselineCase.pages || {};
  for (const p of result.pages) {
    const b = basePages[p.pageKey];
    if (!b || !p.metrics) continue;
    for (const code of ['M1', 'M2', 'M3', 'M6', 'M8']) {
      if (worseThan(code, p.metrics[code], b[code])) {
        out.push({
          caseId,
          code: 'R1',
          metric: code,
          pageKey: p.pageKey,
          pageIndex: p.index,
          from: b[code],
          to: p.metrics[code],
          tier: rubric.codeTier(code),
          note: `${code} regressed on ${p.pageKey}: ${b[code]} → ${p.metrics[code]} (${rubric.METRICS[code].label})`,
        });
      }
    }
  }
  const baseCaseMetrics = baselineCase.caseMetrics || {};
  for (const code of ['M4', 'M5', 'M7']) {
    if (worseThan(code, result.caseMetrics[code], baseCaseMetrics[code])) {
      out.push({
        caseId,
        code: 'R1',
        metric: code,
        pageKey: null,
        pageIndex: null,
        from: baseCaseMetrics[code],
        to: result.caseMetrics[code],
        tier: rubric.codeTier(code),
        note: `${code} regressed for the whole case: ${baseCaseMetrics[code]} → ${result.caseMetrics[code]} (${rubric.METRICS[code].label})`,
      });
    }
  }
  return out;
}

/** Ordered "look at these pages, for this reason" queue for the vision pass. */
function buildReviewQueue(caseId, result, flags, regressions) {
  const byIndex = new Map();
  const add = (index, reason, weight) => {
    if (index == null || index < 0 || index >= result.pages.length) return;
    const p = result.pages[index];
    const entry = byIndex.get(index) || {
      pageIndex: index,
      pageKey: p.pageKey,
      recipe: p.recipe,
      image: `tmp/board-bg-verify/${caseId}/page-${index}.jpg`,
      metrics: p.metrics,
      reasons: [],
      weight: 0,
    };
    entry.reasons.push(reason);
    entry.weight = Math.max(entry.weight, weight);
    byIndex.set(index, entry);
  };

  for (const r of regressions) {
    if (r.pageIndex != null) add(r.pageIndex, `regression: ${r.note}`, 100);
  }
  for (const f of flags) {
    if (f.scope !== 'page') continue;
    add(
      f.pageIndex,
      `${f.grade} ${f.code} = ${f.value} (${f.label})`,
      f.grade === 'fail' ? 80 : 60
    );
  }
  const keyIndex = (needle) => result.pages.findIndex((p) => String(p.pageKey).startsWith(needle));
  add(keyIndex('title'), 'first impression: title scene, wash, headline readability', 40);
  add(keyIndex('newWords'), 'vocab art accuracy + dock honesty (student lens)', 40);
  add(keyIndex('story'), 'story immersion + side art matches the place', 30);
  add(keyIndex('activity'), 'does the activity invite play (charm)', 30);
  add(keyIndex('warm'), 'warm-up density', 20);

  return [...byIndex.values()].sort((a, b) => b.weight - a.weight || a.pageIndex - b.pageIndex);
}

async function main() {
  const args = parseArgs(process.argv);
  const cases = loadCases(args);
  fs.mkdirSync(OUT, { recursive: true });

  const baseline = readJson(BASELINE_PATH, null);
  const state = readJson(STATE_PATH, null);

  const { chromium } = await ensurePlaywright();
  const { server, port } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const hardFailures = [];
  const allFlags = [];
  const allRegressions = [];
  const wishlistCandidates = [];
  const casesOut = [];

  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() =>
      window.LessonPages && window.EdbActivities && window.SceneBackgrounds && window.BoardPreview && window.EdbLayout
    );

    for (const c of cases) {
      const expectName = new RegExp(c.expectScene, 'i');
      const lesson = JSON.parse(fs.readFileSync(path.join(FIXTURES, c.fixture), 'utf8'));

      const result = await page.evaluate(measureInPage, {
        lesson,
        meta: c.meta,
        BOARD_W,
        BOARD_H,
        MAX_PAGES,
        MAX_UNLOCKED_IOU,
      });

      const caseDir = path.join(OUT, c.id);
      fs.mkdirSync(caseDir, { recursive: true });
      const caseHard = [];

      saveJpeg(result.stripDataUrl, path.join(caseDir, 'strip.jpg'));
      saveJpeg(result.contactDataUrl, path.join(caseDir, 'contact.jpg'));
      for (const p of result.pages) {
        saveJpeg(p.dataUrl, path.join(caseDir, `page-${p.index}.jpg`));
      }

      function fail(code, msg) {
        caseHard.push({ code, msg });
        hardFailures.push(`${c.id}: [${code}] ${msg}`);
      }

      const sceneCount = result.picks.filter((p) => p.type === 'scene').length;
      const flatCount = result.picks.filter((p) => p.type === 'flat').length;
      const placeName = result.titlePick && result.titlePick.name;

      console.log(`\n=== ${c.id} (${c.tier || 'core'}) ===`);
      console.log(`  pages=${result.pageCount} picks=${result.pickCount} scenes=${sceneCount} flats=${flatCount}`);
      console.log(`  title → ${result.titlePick?.type}:${result.titlePick?.name} score=${result.titlePick?.score}`);
      console.log('  plan:', result.picks.map((p, i) => `${i}:${p.type[0]}:${p.name}`).join(' | '));

      if (result.pickCount !== result.pageCount) {
        fail('H2', `pick/page length mismatch ${result.pickCount} vs ${result.pageCount}`);
      }
      if (!result.titlePick || result.titlePick.type !== 'scene' || !expectName.test(result.titlePick.name)) {
        fail('H1', `title pick expected scene~/${c.expectScene}/, got ${JSON.stringify(result.titlePick)}`);
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
      }

      for (const lf of result.layoutFails || []) fail(lf.code || 'H3', lf.msg);
      if (result.answerLeak && !result.answerLeak.ok) {
        fail(result.answerLeak.code || 'H5', result.answerLeak.msg || 'answer leak');
      }

      const flags = metricFlagsFor(c.id, result);
      const regressions = regressionsFor(c.id, result, baseline && baseline.cases && baseline.cases[c.id]);
      allFlags.push(...flags);
      allRegressions.push(...regressions);

      const cm = result.caseMetrics;
      console.log(
        `  metrics M4=${cm.M4} M5=${cm.M5} M7=${cm.M7} (distinctBg=${cm.distinctBgRatio} pageDiff=${cm.meanPageDistance})`
      );
      const worstText = Math.min(...result.pages.map((p) => (p.metrics && p.metrics.M1) || 999));
      console.log(`  smallest text on any page: ${Number.isFinite(worstText) ? worstText : '?'}px`);
      if (flags.length) {
        console.log(`  metric flags: ${flags.map((f) => `${f.grade}:${f.code}${f.pageKey ? '@' + f.pageKey : ''}`).join(', ')}`);
      }
      if (regressions.length) {
        console.log(`  REGRESSIONS: ${regressions.map((r) => `${r.metric}@${r.pageKey || 'case'}`).join(', ')}`);
      }
      if ((cm.vocabUnvettedWords || []).length) {
        console.log(`  unvetted vocab art (Gemini glyph only): ${cm.vocabUnvettedWords.join(', ')}`);
        wishlistCandidates.push({
          caseId: c.id,
          need: `Vetted icon choice for: ${cm.vocabUnvettedWords.join(', ')}`,
          words: cm.vocabUnvettedWords,
          kind: 'unvetted-glyph',
        });
      }
      for (const dup of cm.vocabDuplicateGlyphs || []) {
        console.log(`  same picture for different words: ${dup.glyph} → ${dup.words.join(', ')}`);
        wishlistCandidates.push({
          caseId: c.id,
          need: `Distinct art for words sharing ${dup.glyph}: ${dup.words.join(', ')}`,
          words: dup.words,
          kind: 'duplicate-glyph',
        });
      }

      const reviewQueue = buildReviewQueue(c.id, result, flags, regressions);
      fs.writeFileSync(
        path.join(caseDir, 'review.json'),
        JSON.stringify(
          {
            id: c.id,
            tier: c.tier || 'core',
            notes: c.notes || null,
            contact: `tmp/board-bg-verify/${c.id}/contact.jpg`,
            pageCount: result.pageCount,
            picks: result.picks,
            pageKeys: result.pageKeys,
            assignments: result.assignments,
            caseMetrics: cm,
            hardFailures: caseHard,
            metricFlags: flags,
            regressions,
            reviewQueue,
          },
          null,
          2
        )
      );

      casesOut.push({
        id: c.id,
        tier: c.tier || 'core',
        pageCount: result.pageCount,
        sceneCount,
        flatCount,
        title: result.titlePick,
        caseMetrics: cm,
        pageMetrics: result.pages.map((p) => ({
          pageIndex: p.index,
          pageKey: p.pageKey,
          recipe: p.recipe,
          ...(p.metrics || {}),
        })),
        hardFailures: caseHard,
        metricFlags: flags,
        regressions,
        contact: `tmp/board-bg-verify/${c.id}/contact.jpg`,
        strip: `tmp/board-bg-verify/${c.id}/strip.jpg`,
        review: `tmp/board-bg-verify/${c.id}/review.json`,
        reviewQueue: reviewQueue.slice(0, 6),
      });
    }
  } finally {
    await browser.close();
    server.close();
  }

  // Code drift guard: every code we emit must exist in the rubric.
  const known = new Set(rubric.allCodes());
  const emitted = new Set([
    ...casesOut.flatMap((c) => c.hardFailures.map((f) => f.code)),
    ...allFlags.map((f) => f.code),
    ...allRegressions.map((r) => r.code),
  ]);
  const unknown = [...emitted].filter((code) => !known.has(code));

  const report = {
    generatedAt: new Date().toISOString(),
    tier: args.tier,
    caseIds: casesOut.map((c) => c.id),
    iteration: state && state.iteration ? state.iteration + 1 : 1,
    hardFailures,
    metricFlags: allFlags,
    regressions: allRegressions,
    wishlistCandidates,
    baselineUsed: !!baseline,
    cases: casesOut,
    uxVerdict: null,
    policy: 'scripts/ux-board-rubric.cjs — submit judgment with: npm run quality:judge -- <verdict.json>',
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n---');
  console.log(`Aggregate report: ${path.join(OUT, 'report.json')}`);
  if (unknown.length) {
    console.error(`CODE DRIFT: emitted codes missing from rubric: ${unknown.join(', ')}`);
    process.exit(1);
  }
  if (hardFailures.length) {
    console.error('HARD FAILURES:');
    hardFailures.forEach((f) => console.error(' •', f));
    process.exit(1);
  }
  const fails = allFlags.filter((f) => f.grade === 'fail').length;
  const warns = allFlags.filter((f) => f.grade === 'warn').length;
  console.log(`All board hard checks passed. Metric flags: ${fails} fail / ${warns} warn.`);
  if (allRegressions.length) console.log(`Regressions vs baseline: ${allRegressions.length}`);
  console.log(`Artifacts: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
