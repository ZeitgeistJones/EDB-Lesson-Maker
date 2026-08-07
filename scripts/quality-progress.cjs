/**
 * Board quality progress rollup — area scores over time so we can see if
 * loops actually improve things (not just churn soft roots).
 *
 *   npm run quality:progress              # print + refresh docs/quality-progress.md
 *   npm run quality:progress -- --snap    # snapshot last bake into the series
 *
 * Snapshots are also written automatically by quality:judge.
 *
 * Deltas only compare same tier + same case count (core×3 vs all×20 is not a trend).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'tmp', 'board-bg-verify', 'report.json');
const SERIES_PATH = path.join(__dirname, 'quality-progress.json');
const MD_PATH = path.join(ROOT, 'docs', 'quality-progress.md');
const WISHLIST_PATH = path.join(ROOT, 'docs', 'asset-wishlist.md');
const SERIES_CAP = 40;

const AREAS = [
  { key: 'hard', label: 'Hard fails', better: 'lower' },
  { key: 'metricFails', label: 'Soft metric fails', better: 'lower' },
  { key: 'metricWarns', label: 'Soft metric warns', better: 'lower' },
  { key: 'm5Fails', label: 'M5 variety fails', better: 'lower' },
  { key: 'm7Fails', label: 'M7 vocab-art fails', better: 'lower' },
  { key: 'layoutFails', label: 'Layout soft fails (M8/M9/M10)', better: 'lower' },
  { key: 'unvettedWords', label: 'Unvetted vocab words', better: 'lower' },
  { key: 'wishlistOpen', label: 'Open wishlist rows', better: 'lower' },
  { key: 'meanM5', label: 'Mean M5 (variety)', better: 'higher' },
  { key: 'meanM7', label: 'Mean M7 (vetted art)', better: 'higher' },
  { key: 'pillarAvg', label: 'Pillar score avg (0-3)', better: 'higher' },
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function countOpenWishlist(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return (text.match(/\|\s*open\s*\|/gi) || []).length;
  } catch (_) {
    return null;
  }
}

function mean(nums) {
  const xs = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!xs.length) return null;
  return Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3));
}

function pillarAverage(scores) {
  if (!scores || typeof scores !== 'object') return null;
  const vals = [];
  for (const caseScores of Object.values(scores)) {
    if (!caseScores || typeof caseScores !== 'object') continue;
    for (const v of Object.values(caseScores)) {
      if (typeof v === 'number') vals.push(v);
    }
  }
  return mean(vals);
}

/** Build one snapshot from a bake report (+ optional verdict scores). */
function snapshotFromReport(report, extra = {}) {
  const flags = report.metricFlags || [];
  const fails = flags.filter((f) => f.grade === 'fail');
  const warns = flags.filter((f) => f.grade === 'warn');
  const byCode = (code) => fails.filter((f) => f.code === code).length;

  let unvetted = 0;
  const m5s = [];
  const m7s = [];
  for (const c of report.cases || []) {
    const cm = c.caseMetrics || {};
    if (typeof cm.M5 === 'number') m5s.push(cm.M5);
    if (typeof cm.M7 === 'number') m7s.push(cm.M7);
    const words = cm.vocabUnvettedWords || [];
    unvetted += words.length;
  }

  return {
    at: new Date().toISOString(),
    tier: report.tier || 'core',
    cases: (report.caseIds || []).length,
    iteration: extra.iteration ?? report.iteration ?? null,
    hard: (report.hardFailures || []).length,
    metricFails: fails.length,
    metricWarns: warns.length,
    m5Fails: byCode('M5'),
    m7Fails: byCode('M7'),
    layoutFails: byCode('M8') + byCode('M9') + byCode('M10'),
    unvettedWords: unvetted,
    wishlistOpen: countOpenWishlist(WISHLIST_PATH),
    meanM5: mean(m5s),
    meanM7: mean(m7s),
    pillarAvg: pillarAverage(extra.scores || report.uxVerdict?.scores),
    regressions: (report.regressions || []).length,
    note: extra.note || null,
  };
}

function loadSeries() {
  return readJson(SERIES_PATH, { note: 'Append-only quality area snapshots.', snapshots: [] });
}

function saveSeries(series) {
  if (series.snapshots.length > SERIES_CAP) {
    series.snapshots = series.snapshots.slice(-SERIES_CAP);
  }
  series.updatedAt = new Date().toISOString();
  fs.writeFileSync(SERIES_PATH, JSON.stringify(series, null, 2) + '\n');
}

function appendSnapshot(snap) {
  const series = loadSeries();
  series.snapshots = series.snapshots || [];
  // Dedupe identical bake+iteration within ~2 minutes
  const last = series.snapshots[series.snapshots.length - 1];
  if (
    last &&
    last.tier === snap.tier &&
    last.cases === snap.cases &&
    last.metricFails === snap.metricFails &&
    last.hard === snap.hard &&
    last.iteration === snap.iteration &&
    Math.abs(new Date(snap.at) - new Date(last.at)) < 120000
  ) {
    return { series, snap: last, deduped: true };
  }
  series.snapshots.push(snap);
  saveSeries(series);
  return { series, snap, deduped: false };
}

function comparable(a, b) {
  if (!a || !b) return false;
  return a.tier === b.tier && a.cases === b.cases;
}

function deltaStr(prev, cur, better) {
  if (prev == null || cur == null) return '·';
  const d = cur - prev;
  if (Math.abs(d) < 0.0005) return '→';
  const improved = better === 'lower' ? d < 0 : d > 0;
  const arrow = improved ? '↑' : '↓';
  const n = Number.isInteger(d) ? String(d) : d.toFixed(2);
  return `${arrow}${d > 0 ? '+' : ''}${n}`;
}

/** Previous snap that is safe to delta against (same tier + case count). */
function priorComparable(snaps, index) {
  const cur = snaps[index];
  for (let i = index - 1; i >= 0; i--) {
    if (comparable(snaps[i], cur)) return snaps[i];
  }
  return null;
}

function firstComparable(snaps, last) {
  for (let i = 0; i < snaps.length; i++) {
    if (comparable(snaps[i], last)) return snaps[i];
  }
  return null;
}

function warnHonestyLine(snap) {
  if (!snap || typeof snap.metricWarns !== 'number') return null;
  if (snap.metricFails === 0 && snap.metricWarns >= 40) {
    return 'Note: 0 soft *fails* but **' + snap.metricWarns + ' soft warns** — not “clean” yet; warns still need an owner.';
  }
  if (snap.metricFails <= 2 && snap.metricWarns >= 80) {
    return 'Note: almost no soft fails, but **' + snap.metricWarns + ' soft warns** remain — don’t treat this as done.';
  }
  return null;
}

function writeMarkdown(series) {
  const snaps = series.snapshots || [];
  const lines = [
    '# Board quality progress',
    '',
    'Area scores over time from `fullquality` / `quality` bakes. Written by',
    '`npm run quality:progress -- --snap` and automatically on `quality:judge`.',
    'Do not hand-edit the numbers — append via those commands.',
    '',
    '**Reading the arrows:** ↑ improved · ↓ worsened · → flat.',
    'Deltas only vs a prior row with the **same tier and case count**',
    '(core×3 vs all×20 is not a trend — those rows show raw numbers only).',
    'Prefer `fullquality` → `fullquality` for scoreboard reads.',
    'Lower-is-better for fails/unvetted; higher-is-better for mean M5/M7 and pillars.',
    '',
  ];

  if (!snaps.length) {
    lines.push('_No snapshots yet. Run `npm run fullquality` then `npm run quality:progress -- --snap`._', '');
    fs.writeFileSync(MD_PATH, lines.join('\n'));
    return;
  }

  const last = snaps[snaps.length - 1];
  const honesty = warnHonestyLine(last);
  if (honesty) {
    lines.push(`> ${honesty}`, '');
  }

  const recent = snaps.slice(-12);
  const header = ['Date', 'Tier', 'cases', ...AREAS.map((a) => a.label)];
  lines.push('| ' + header.join(' | ') + ' |');
  lines.push('| ' + header.map(() => '---').join(' | ') + ' |');

  const absStart = snaps.length - recent.length;
  recent.forEach((s, i) => {
    const prev = priorComparable(snaps, absStart + i);
    const date = String(s.at || '').slice(0, 10);
    const cells = [
      date,
      s.tier || '?',
      String(s.cases ?? ''),
      ...AREAS.map((a) => {
        const v = s[a.key];
        const shown = v == null ? '—' : String(v);
        if (!prev) return shown;
        const d = deltaStr(prev[a.key], v, a.better);
        return d && d !== '·' && d !== '→' ? `${shown} ${d}` : shown;
      }),
    ];
    lines.push('| ' + cells.join(' | ') + ' |');
  });

  const first = firstComparable(snaps, last);
  lines.push('', `## Since first comparable \`${last.tier}\` × ${last.cases} cases`, '');
  if (!first || first === last) {
    lines.push('_Need another snapshot with the same tier and case count before trends mean anything._', '');
  } else {
    lines.push(
      `_Baseline: ${String(first.at || '').slice(0, 10)} → latest ${String(last.at || '').slice(0, 10)}_`,
      ''
    );
    for (const a of AREAS) {
      const d = deltaStr(first[a.key], last[a.key], a.better);
      lines.push(`- **${a.label}:** ${first[a.key] ?? '—'} → ${last[a.key] ?? '—'} (${d})`);
    }
    lines.push('');
  }
  fs.writeFileSync(MD_PATH, lines.join('\n'));
}

function printTrends(series) {
  const snaps = series.snapshots || [];
  console.log(`\n── Progress ${'─'.repeat(50)}`);
  if (snaps.length < 1) {
    console.log('no snapshots yet — run: npm run quality:progress -- --snap');
    return;
  }
  const last = snaps[snaps.length - 1];
  const prev = priorComparable(snaps, snaps.length - 1);
  console.log(
    `snapshots: ${snaps.length}   latest: ${last.at}  tier=${last.tier}  cases=${last.cases}` +
      (last.iteration != null ? `  iter=${last.iteration}` : '')
  );
  if (!prev) {
    console.log('  (no prior same-tier / same-case-count snap — deltas withheld)');
  } else {
    console.log(`  vs prior comparable: ${prev.at}  tier=${prev.tier}  cases=${prev.cases}`);
  }
  const honesty = warnHonestyLine(last);
  if (honesty) console.log(`  ${honesty.replace(/\*\*/g, '').replace(/\*/g, '')}`);
  for (const a of AREAS) {
    const v = last[a.key];
    const d = prev ? deltaStr(prev[a.key], v, a.better) : '·';
    console.log(`  ${a.label.padEnd(32)} ${String(v ?? '—').padStart(6)}  ${d}`);
  }
  console.log(`  file: ${MD_PATH}`);
}

function main() {
  const snapFlag = process.argv.includes('--snap');
  const report = readJson(REPORT, null);
  let series = loadSeries();

  if (snapFlag) {
    if (!report) {
      console.error('No bake report. Run npm run fullquality (or quality) first.');
      process.exit(1);
    }
    const { series: s, snap, deduped } = appendSnapshot(snapshotFromReport(report));
    series = s;
    console.log(deduped ? 'Snapshot unchanged (deduped).' : `Snapshot added: hard=${snap.hard} fails=${snap.metricFails} M5=${snap.m5Fails} M7=${snap.m7Fails}`);
  }

  writeMarkdown(series);
  printTrends(series);
}

if (require.main === module) {
  main();
}

module.exports = {
  snapshotFromReport,
  appendSnapshot,
  writeMarkdown,
  loadSeries,
  printTrends,
  comparable,
  priorComparable,
  AREAS,
};
