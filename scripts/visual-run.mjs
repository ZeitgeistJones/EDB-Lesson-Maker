/**
 * Visual-quality run wrapper — dated evidence folders over existing bake.
 *
 *   node scripts/visual-run.mjs --suite=full --round=2
 *   node scripts/visual-run.mjs --suite=benchmarks --round=2
 *   node scripts/visual-run.mjs --suite=unseen --round=2
 *   node scripts/visual-run.mjs --streak=5
 *
 * Streak bar: N consecutive rounds where EACH round passes fixed benchmarks
 * AND a fresh unseen set (rotated by round). Cap: 10 improvement rounds.
 *
 * Writes tmp/visual-runs/run-NNN/{benchmarks,unseen,reports}/ via
 * verify-board-visual.cjs --out= (does not fork the bake pipeline).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const rubric = require('./ux-board-rubric.cjs');

const MAX_ROUNDS = 10;
const STREAK_TARGET = 5;

const BENCHMARK_CASES = ['sharks', 'space', 'fruit-market', 'castle', 'jobs'];

/** Fresh unseen set each streak round — never reuse the prior round's five. */
const UNSEEN_BY_ROUND = [
  ['weather', 'campsite', 'supermarket', 'construction', 'playground'], // 1
  ['aquarium', 'fire-station', 'cafe', 'hotel', 'library'], // 2
  ['music', 'bathroom-routines', 'volcano', 'trampoline', 'circus'], // 3
  ['zoo-phonics', 'travel', 'school', 'dollhouse', 'soccer-coach'], // 4
  ['gym', 'dentist', 'face', 'doctor', 'kitchen-helpers'], // 5
  ['loop2-beach', 'loop2-bakery', 'loop2-farm', 'loop2-home', 'music'], // 6+ overflow
  ['cafe', 'hotel', 'library', 'aquarium', 'volcano'],
  ['trampoline', 'circus', 'zoo-phonics', 'travel', 'school'],
  ['dollhouse', 'soccer-coach', 'gym', 'dentist', 'face'],
  ['doctor', 'kitchen-helpers', 'fire-station', 'campsite', 'weather'],
];

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function unseenForRound(roundNum) {
  const idx = ((Math.max(1, roundNum) - 1) % UNSEEN_BY_ROUND.length);
  return UNSEEN_BY_ROUND[idx];
}

function nextRunId(runsRoot) {
  fs.mkdirSync(runsRoot, { recursive: true });
  const existing = fs.readdirSync(runsRoot)
    .map((n) => /^run-(\d+)$/.exec(n))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const n = existing.length ? Math.max(...existing) + 1 : 1;
  return String(n).padStart(3, '0');
}

function runBake(cases, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts', 'verify-board-visual.cjs'),
      `--cases=${cases.join(',')}`,
      `--out=${outDir}`,
    ],
    { cwd: ROOT, stdio: 'inherit', shell: false }
  );
  return r.status == null ? 1 : r.status;
}

function collectCritical(outDir, caseIds) {
  const reportPath = path.join(outDir, 'report.json');
  if (!fs.existsSync(reportPath)) return { ok: false, error: 'missing report.json', criticalPages: [] };
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const pages = [];
  for (const c of report.cases || []) {
    if (caseIds && !caseIds.includes(c.id)) continue;
    const pageRows = c.pageMetrics || c.pages || [];
    for (const p of pageRows) {
      const hardOnPage = (c.hardFailures || [])
        .filter((h) => {
          const msg = typeof h === 'string' ? h : (h.msg || h.code || '');
          return String(msg).includes(p.pageKey || '') || h.pageIndex === p.pageIndex;
        })
        .map((h) => (typeof h === 'string' ? (h.match(/\[([A-Z]\d+)\]/) || [])[1] : h.code))
        .filter(Boolean);
      const fails = rubric.criticalVisualFails(p, hardOnPage);
      if (fails.length) {
        pages.push({
          caseId: c.id,
          pageKey: p.pageKey,
          pageIndex: p.pageIndex,
          fails,
        });
      }
    }
  }
  return {
    ok: pages.length === 0 && !(report.hardFailures || []).length,
    hardFailures: report.hardFailures || [],
    metricFailFlags: (report.metricFlags || []).filter((f) => f.grade === 'fail'),
    criticalPages: pages,
    contactSheets: (report.cases || []).map((c) => ({
      id: c.id,
      contact: c.contact,
    })),
  };
}

function writeSuiteReport(reportsDir, suite, summary) {
  fs.writeFileSync(path.join(reportsDir, `${suite}-critical.json`), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, `${suite}-summary.md`), [
    `# Visual run ${summary.runId} — ${suite}`,
    '',
    `- cases: ${summary.cases.join(', ')}`,
    `- bake exit: ${summary.bakeExit}`,
    `- critical page fails: ${(summary.criticalPages || []).length}`,
    `- hard failures: ${(summary.hardFailures || []).length}`,
    `- metric fail flags: ${(summary.metricFailFlags || []).length}`,
    '',
    '## Contact sheets',
    ...(summary.contactSheets || []).map((c) => `- ${c.id}: ${c.contact || '(missing)'}`),
    '',
    '## Critical fails',
    ...((summary.criticalPages || []).length
      ? summary.criticalPages.map(
        (p) => `- ${p.caseId}/${p.pageKey}: ${p.fails.map((f) => `${f.bucket}:${f.code}=${f.value}`).join(', ')}`
      )
      : ['- none']),
    '',
  ].join('\n'));
}

function runThemeLock() {
  if (hasFlag('skip-theme-lock')) return 0;
  const theme = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'test-theme-lock.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  return theme.status == null ? 1 : theme.status;
}

function runOneSuite(suite, roundNum, runDir, reportsDir) {
  const cases = suite === 'unseen' ? unseenForRound(roundNum) : BENCHMARK_CASES;
  const suiteDir = path.join(runDir, suite === 'unseen' ? 'unseen' : 'benchmarks');
  const runId = String(roundNum).padStart(3, '0');
  console.log(`\n══ visual-run run-${runId} suite=${suite} cases=${cases.join(',')} ══`);
  console.log(`out=${path.relative(ROOT, suiteDir)}`);

  const bakeCode = runBake(cases, suiteDir);
  const critical = collectCritical(suiteDir, cases);
  const summary = {
    runId,
    round: roundNum,
    maxRounds: MAX_ROUNDS,
    suite,
    cases,
    bakeExit: bakeCode,
    generatedAt: new Date().toISOString(),
    ...critical,
  };
  writeSuiteReport(reportsDir, suite, summary);
  console.log(`\nWrote ${path.relative(ROOT, path.join(reportsDir, `${suite}-critical.json`))}`);
  const ok = !bakeCode && critical.ok;
  if (!ok) {
    console.error(`VISUAL RUN FAIL — suite=${suite} (see reports/). Fix general producer, then re-run.`);
  } else {
    console.log(`VISUAL RUN PASS — suite=${suite}`);
  }
  return { ok, summary };
}

function runFullRound(roundNum) {
  if (roundNum > MAX_ROUNDS) {
    console.error(`Round ${roundNum} exceeds MAX_ROUNDS=${MAX_ROUNDS}`);
    return { ok: false, roundNum };
  }
  const runsRoot = path.join(ROOT, 'tmp', 'visual-runs');
  const runId = String(roundNum).padStart(3, '0');
  const runDir = path.join(runsRoot, `run-${runId}`);
  const reportsDir = path.join(runDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  console.log(`\n████ FULL ROUND ${roundNum} / streak target ${STREAK_TARGET} ████`);
  console.log(`unseen set: ${unseenForRound(roundNum).join(', ')}`);

  const themeCode = runThemeLock();
  if (themeCode) {
    console.error('theme-lock failed — fix TOPIC_SETS / density before baking.');
    return { ok: false, roundNum, themeCode };
  }

  const bench = runOneSuite('benchmarks', roundNum, runDir, reportsDir);
  if (!bench.ok) return { ok: false, roundNum, failed: 'benchmarks', ...bench };

  const unseen = runOneSuite('unseen', roundNum, runDir, reportsDir);
  if (!unseen.ok) return { ok: false, roundNum, failed: 'unseen', ...unseen };

  const streakNote = {
    round: roundNum,
    ok: true,
    benchmarks: bench.summary.cases,
    unseen: unseen.summary.cases,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(reportsDir, 'full-round.json'), `${JSON.stringify(streakNote, null, 2)}\n`);
  console.log(`\nFULL ROUND ${roundNum} PASS`);
  return { ok: true, roundNum, streakNote };
}

function updateStreakLog(results) {
  const runsRoot = path.join(ROOT, 'tmp', 'visual-runs');
  const logPath = path.join(runsRoot, 'STREAK.md');
  const lines = [
    '# Visual streak log',
    '',
    `Target: **${STREAK_TARGET} consecutive** full rounds (benchmarks + fresh unseen).`,
    '',
    '| Round | Result | Unseen set |',
    '|------:|--------|------------|',
    ...results.map((r) =>
      `| ${r.roundNum} | ${r.ok ? 'PASS' : 'FAIL'}${r.failed ? ` (${r.failed})` : ''} | ${(unseenForRound(r.roundNum) || []).join(', ')} |`
    ),
    '',
    `Consecutive passes: **${results.filter((r) => r.ok).length}** / ${STREAK_TARGET}`,
    '',
  ];
  fs.writeFileSync(logPath, lines.join('\n'));
  console.log(`\nWrote ${path.relative(ROOT, logPath)}`);
}

function main() {
  const streakArg = arg('streak', '');
  if (streakArg) {
    const target = Number(streakArg) || STREAK_TARGET;
    const start = Number(arg('from', '1')) || 1;
    const results = [];
    // Credit prior consecutive full passes already on disk (run-001 … run-(start-1)).
    for (let p = 1; p < start; p++) {
      const prior = path.join(ROOT, 'tmp', 'visual-runs', `run-${String(p).padStart(3, '0')}`, 'reports');
      const bp = path.join(prior, 'benchmarks-critical.json');
      const up = path.join(prior, 'unseen-critical.json');
      if (!fs.existsSync(bp) || !fs.existsSync(up)) break;
      try {
        const b = JSON.parse(fs.readFileSync(bp, 'utf8'));
        const u = JSON.parse(fs.readFileSync(up, 'utf8'));
        if (!(b.ok && u.ok)) break;
        results.push({ ok: true, roundNum: p, credited: true });
        console.log(`Crediting run-${String(p).padStart(3, '0')} as streak round ${p} PASS`);
      } catch (_) {
        break;
      }
    }
    for (let r = start; r <= target; r++) {
      if (results.some((x) => x.roundNum === r && x.ok)) continue;
      // Theme-lock once at the start of the streak batch; subsequent rounds bake only.
      if (results.filter((x) => !x.credited).length >= 1 || (start > 1 && results.some((x) => x.credited))) {
        if (!process.argv.includes('--skip-theme-lock')) process.argv.push('--skip-theme-lock');
      }
      const out = runFullRound(r);
      results.push(out);
      updateStreakLog(results);
      if (!out.ok) {
        console.error(`\nSTREAK BROKEN at round ${r}. Fix producer, then: node scripts/visual-run.mjs --streak=${target} --from=${r}`);
        process.exit(1);
      }
    }
    const passes = results.filter((x) => x.ok).length;
    // Also accept on-disk consecutive passes covering 1..target (resume edge cases).
    let diskStreak = 0;
    for (let p = 1; p <= target; p++) {
      const prior = path.join(runsRoot, `run-${String(p).padStart(3, '0')}`, 'reports');
      const bp = path.join(prior, 'benchmarks-critical.json');
      const up = path.join(prior, 'unseen-critical.json');
      if (!fs.existsSync(bp) || !fs.existsSync(up)) break;
      try {
        const b = JSON.parse(fs.readFileSync(bp, 'utf8'));
        const u = JSON.parse(fs.readFileSync(up, 'utf8'));
        if (!(b.ok && u.ok)) break;
        diskStreak++;
      } catch (_) {
        break;
      }
    }
    updateStreakLog(
      Array.from({ length: Math.max(passes, diskStreak) }, (_, i) => ({
        ok: true,
        roundNum: i + 1,
      }))
    );
    if (passes >= target || diskStreak >= target) {
      console.log(`\nSTREAK COMPLETE — ${Math.max(passes, diskStreak)} consecutive full passes.`);
      process.exit(0);
    }
    process.exit(1);
  }

  const suite = (arg('suite', 'full') || 'full').toLowerCase();
  const forcedRound = arg('round', '');
  const runsRoot = path.join(ROOT, 'tmp', 'visual-runs');
  const roundNum = forcedRound ? Number(forcedRound) : Number(nextRunId(runsRoot));

  if (suite === 'full') {
    const out = runFullRound(roundNum);
    process.exit(out.ok ? 0 : 1);
  }

  // Single-suite mode (legacy)
  const runId = String(roundNum).padStart(3, '0');
  const runDir = path.join(runsRoot, `run-${runId}`);
  const reportsDir = path.join(runDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const themeCode = runThemeLock();
  if (themeCode) process.exit(themeCode);
  const out = runOneSuite(suite === 'unseen' ? 'unseen' : 'benchmarks', roundNum, runDir, reportsDir);
  process.exit(out.ok ? 0 : 1);
}

main();
