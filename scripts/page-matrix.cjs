/**
 * Page-condition matrix — render one fixture with EVERY page forced onto one
 * background, for every background in the bank, and measure heading contrast
 * (M6) and bare-text-on-busy (M2) per page.
 *
 * This exists because the lesson bake can only fail on conditions its seeds
 * happen to produce. Real lessons kept shipping unreadable titles on pale
 * flats that no fixture ever drew. Here the condition is constructed, not
 * awaited.
 *
 *   node scripts/page-matrix.cjs [--case=doctor] [--bgs=flats|scenes|all|a,b,c]
 *
 * Writes tmp/page-matrix/report.json and a JPG for every failing page.
 * Exit 1 when any page × background lands under the M6 warn bar (4.5).
 */
const fs = require('fs');
const path = require('path');

const harness = require('./verify-board-visual.cjs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'page-matrix');
const M6_WARN = 4.5; // keep in step with ux-board-rubric.cjs
const M6_FAIL = 3;

function parseArgs(argv) {
  const out = { caseId: 'doctor', bgs: 'flats', save: 'fails' };
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    if (m[1] === 'case') out.caseId = m[2] || 'doctor';
    if (m[1] === 'bgs') out.bgs = m[2] || 'flats';
    if (m[1] === 'save') out.save = m[2] || 'fails';
  }
  return out;
}

function backgroundList(spec) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public', 'assets', '08_backgrounds', 'manifest.json'), 'utf8')
  );
  const flats = Object.keys(manifest.flats || {});
  const scenes = Object.keys(manifest.scenes || {});
  if (spec === 'flats') return flats.map((n) => ({ name: n, type: 'flat' }));
  if (spec === 'scenes') return scenes.map((n) => ({ name: n, type: 'scene' }));
  if (spec === 'all') {
    return [
      ...flats.map((n) => ({ name: n, type: 'flat' })),
      ...scenes.map((n) => ({ name: n, type: 'scene' })),
    ];
  }
  return spec.split(',').map((s) => s.trim()).filter(Boolean).map((n) => ({
    name: n,
    type: flats.includes(n) ? 'flat' : 'scene',
  }));
}

async function main() {
  const args = parseArgs(process.argv);
  const cases = JSON.parse(
    fs.readFileSync(path.join(harness.FIXTURES, 'cases.json'), 'utf8')
  ).cases;
  const c = cases.find((x) => x.id === args.caseId);
  if (!c) throw new Error(`case not found: ${args.caseId}`);
  const lesson = JSON.parse(fs.readFileSync(path.join(harness.FIXTURES, c.fixture), 'utf8'));
  const bgs = backgroundList(args.bgs);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const { chromium } = await harness.ensurePlaywright();
  const { server, port } = await harness.startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const rows = [];
  const failures = [];

  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () =>
        window.LessonPages && window.EdbActivities && window.SceneBackgrounds &&
        window.BoardPreview && window.EdbLayout
    );

    console.log(`Matrix: case=${args.caseId} × ${bgs.length} background(s)\n`);

    for (const bg of bgs) {
      const result = await page.evaluate(harness.measureInPage, {
        lesson,
        meta: c.meta,
        BOARD_W: harness.BOARD_W,
        BOARD_H: harness.BOARD_H,
        MAX_PAGES: harness.MAX_PAGES,
        MAX_UNLOCKED_IOU: harness.MAX_UNLOCKED_IOU,
        forceBg: bg.name,
      });

      const pages = result.pages.map((p) => ({
        pageKey: p.pageKey,
        index: p.index,
        M6: p.metrics ? p.metrics.M6 : null,
        M2: p.metrics ? p.metrics.M2 : null,
      }));
      rows.push({ bg: bg.name, type: bg.type, pages });

      const bad = [];
      for (const p of result.pages) {
        const m6 = p.metrics && p.metrics.M6;
        const failing = m6 != null && m6 < M6_WARN;
        if (failing) {
          bad.push({ bg: bg.name, type: bg.type, pageKey: p.pageKey, index: p.index, M6: m6 });
        }
        if (failing || args.save === 'all') {
          harness.saveJpeg(p.dataUrl, path.join(OUT, `${bg.name}--${p.pageKey.replace(':', '_')}.jpg`));
        }
      }
      failures.push(...bad);

      const worst = pages.reduce(
        (min, p) => (p.M6 != null && (min == null || p.M6 < min) ? p.M6 : min),
        null
      );
      const flag = bad.length ? `  ← ${bad.length} page(s) under ${M6_WARN}` : '';
      console.log(
        `  ${bg.name.padEnd(22)} worst M6 = ${worst == null ? '—' : worst}${flag}`
      );
    }
  } finally {
    await browser.close();
    server.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    caseId: args.caseId,
    bgSpec: args.bgs,
    warnBar: M6_WARN,
    failBar: M6_FAIL,
    backgrounds: rows.length,
    failures,
    rows,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n---');
  if (failures.length) {
    console.log(`${failures.length} page×background combo(s) under M6 ${M6_WARN}:`);
    for (const f of failures.sort((a, b) => a.M6 - b.M6)) {
      console.log(
        `  M6=${String(f.M6).padEnd(5)} ${f.bg} → ${f.pageKey}` +
          (f.M6 < M6_FAIL ? '   [FAIL bar]' : '')
      );
    }
    console.log(`Failure JPGs + report: ${OUT}`);
    process.exit(1);
  }
  console.log(`All combos clear M6 ${M6_WARN}. Report: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
