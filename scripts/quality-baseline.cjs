/**
 * Snapshot the metrics from the last bake as the regression baseline.
 *
 *   npm run quality:baseline
 *
 * Cases missing from the last run keep their previous baseline, so a fast
 * core-only bake never wipes the adversarial numbers.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'tmp', 'board-bg-verify', 'report.json');
const BASELINE_PATH = path.join(__dirname, 'quality-baseline.json');

const PAGE_METRICS = ['M1', 'M2', 'M3', 'M6', 'M8', 'M9', 'M10'];
const CASE_METRICS = ['M4', 'M5', 'M7'];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

const report = readJson(REPORT, null);
if (!report) {
  console.error('No bake report found. Run: npm run fullquality');
  process.exit(1);
}
if ((report.hardFailures || []).length) {
  console.error('Refusing to baseline a bake with hard failures — fix those first.');
  process.exit(1);
}

const prev = readJson(BASELINE_PATH, { cases: {} });
const cases = { ...(prev.cases || {}) };

for (const c of report.cases || []) {
  const pages = {};
  for (const p of c.pageMetrics || []) {
    const entry = {};
    for (const code of PAGE_METRICS) entry[code] = p[code] ?? null;
    pages[p.pageKey] = entry;
  }
  const caseMetrics = {};
  for (const code of CASE_METRICS) caseMetrics[code] = (c.caseMetrics || {})[code] ?? null;
  cases[c.id] = {
    tier: c.tier,
    pageCount: c.pageCount,
    caseMetrics,
    pages,
  };
}

const out = {
  generatedAt: new Date().toISOString(),
  note: 'Regression baseline for board UX metrics. Refresh with: npm run quality:baseline (after a clean bake you are happy with).',
  sourceTier: report.tier || 'core',
  cases,
};

fs.writeFileSync(BASELINE_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`Baseline written: ${BASELINE_PATH}`);
console.log(`Cases stored: ${Object.keys(cases).join(', ')}`);
console.log(`Updated from this run: ${(report.cases || []).map((c) => c.id).join(', ')}`);
