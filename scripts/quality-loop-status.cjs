/**
 * Where the board quality loop stands — for humans and for agents picking up
 * a loop that a previous chat started.
 *
 *   npm run quality:status
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'tmp', 'board-bg-verify', 'report.json');
const STATE_PATH = path.join(__dirname, 'quality-state.json');
const LOG_PATH = path.join(ROOT, 'docs', 'quality-log.md');
const WISHLIST_PATH = path.join(ROOT, 'docs', 'asset-wishlist.md');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}`);
}

const state = readJson(STATE_PATH, null);
section('Loop memory');
if (state) {
  console.log(`iteration: ${state.iteration || 0}   updated: ${state.updatedAt || '?'}`);
  console.log(`remembered soft roots: ${(state.softRoots || []).join(', ') || '(none)'}`);
  console.log(`easy wins implemented: ${(state.markers || []).join(', ') || '(none)'}`);
  const tail = (state.history || []).slice(-5);
  if (tail.length) {
    console.log('recent iterations:');
    tail.forEach((h) =>
      console.log(
        `  iter ${h.iteration} (${h.tier}) → ${h.action} ${(h.codes || []).join(',') || '—'}` +
          ` · hard ${h.hardFailures} · metric ${h.metricFails}f/${h.metricWarns}w · roots ${(h.roots || []).join(',') || '—'}`
      )
    );
  }
} else {
  console.log('no state yet — this is iteration 1 of a fresh loop');
}

const r = readJson(REPORT, null);
section('Last bake');
if (!r) {
  console.log('no report yet. Run: npm run quality');
} else {
  console.log(`generated: ${r.generatedAt}`);
  console.log(`tier: ${r.tier}   cases: ${(r.caseIds || []).join(', ')}`);
  console.log(`baseline used: ${r.baselineUsed ? 'yes' : 'no (run npm run quality:baseline once you are happy)'}`);
  console.log(`hard failures: ${(r.hardFailures || []).length}`);
  (r.hardFailures || []).forEach((f) => console.log(' •', f));

  const flags = r.metricFlags || [];
  const fails = flags.filter((f) => f.grade === 'fail');
  const warns = flags.filter((f) => f.grade === 'warn');
  console.log(`metric flags: ${fails.length} fail / ${warns.length} warn`);
  fails.forEach((f) =>
    console.log(`  FAIL ${f.code} ${f.caseId}${f.pageKey ? '/' + f.pageKey : ''} = ${f.value} — ${f.label}`)
  );
  if (warns.length) {
    const grouped = warns.reduce((acc, f) => {
      acc[f.code] = (acc[f.code] || 0) + 1;
      return acc;
    }, {});
    console.log(
      `  warns by code: ${Object.entries(grouped)
        .map(([k, v]) => `${k}×${v}`)
        .join(', ')}`
    );
  }

  const regs = r.regressions || [];
  console.log(`regressions vs baseline: ${regs.length}`);
  regs.forEach((x) => console.log(`  R1 ${x.caseId}: ${x.note}`));

  section('Review queue (look at these first)');
  for (const c of r.cases || []) {
    console.log(`\n${c.id} (${c.tier}) — contact sheet: ${c.contact}`);
    (c.reviewQueue || []).slice(0, 4).forEach((q) => {
      console.log(`  #${q.pageIndex} ${q.pageKey}${q.recipe ? ' · ' + q.recipe : ''} → ${q.image}`);
      (q.reasons || []).slice(0, 3).forEach((reason) => console.log(`      ${reason}`));
    });
  }

  section('Verdict');
  if (r.uxVerdict) {
    const v = r.uxVerdict;
    console.log(`iteration ${v.iteration} (${v.tier}) → ${v.decision?.action}`);
    console.log(v.decision?.message || '');
    console.log(`student: ${v.lens?.student || '—'}`);
    console.log(`teacher: ${v.lens?.teacher || '—'}`);
  } else {
    console.log('none yet — review the queue, then: npm run quality:judge -- tmp/verdict.json');
  }

  if ((r.wishlistCandidates || []).length) {
    section('Asset gaps the bake noticed');
    r.wishlistCandidates.forEach((w) => console.log(` • ${w.caseId}: ${w.need}`));
  }
}

section('Files');
if (fs.existsSync(WISHLIST_PATH)) {
  const openRows = (fs.readFileSync(WISHLIST_PATH, 'utf8').match(/\|\s*open\s*\|/gi) || []).length;
  console.log(`asset wishlist: ${WISHLIST_PATH} (open rows ≈ ${openRows})`);
} else {
  console.log('asset wishlist: (missing docs/asset-wishlist.md)');
}
console.log(`loop log: ${fs.existsSync(LOG_PATH) ? LOG_PATH : '(none yet)'}`);
console.log('\ncommands: npm run quality | fullquality | quality:judge | quality:baseline');
