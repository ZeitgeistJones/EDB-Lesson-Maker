/**
 * Preflight / quality entry — hard bake plus measured UX metrics.
 *
 *   npm run quality              core cases (fast)
 *   npm run fullquality          core + adversarial cases
 *   node scripts/preflight-boards.cjs --cases=gym,travel
 *   node scripts/preflight-boards.cjs --cases=doctor --out=tmp/board-bg-verify-hospital
 *
 * Exit 0 = hard rules passed. The agent must then run the board-quality-loop
 * skill: read the review queue, judge with both lenses, submit via
 * npm run quality:judge, and obey the printed action.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const forwarded = process.argv.slice(2);
function outFromArgs(argv) {
  for (const a of argv) {
    const m = /^--out=(.+)$/.exec(a);
    if (m) return path.resolve(ROOT, m[1]);
  }
  return path.join(ROOT, 'tmp', 'board-bg-verify');
}
const OUT = outFromArgs(forwarded);

function run(label, cmd, args) {
  console.log(`\n▓▓▓▓ ${label} ▓▓▓▓`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.error) {
    console.error(r.error);
    return 1;
  }
  return r.status == null ? 1 : r.status;
}

let code = 0;
code = run('1/2  Background picks (fast)', 'node', ['scripts/smoke-bg-picks.mjs']) || code;
code =
  run('2/2  Headless board bake (hard rules + metrics)', 'node', [
    'scripts/verify-board-visual.cjs',
    ...forwarded,
  ]) || code;

const reportPath = path.join(OUT, 'report.json');
console.log('\n══════════════════════════════════════');
if (code) {
  console.error('QUALITY HARD FAIL — fix report hardFailures, then re-run.');
  console.error(`Report: ${reportPath}`);
  process.exit(code);
}

console.log('QUALITY HARD PASS');

let report = null;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (_) {
  /* report is optional for the footer */
}

if (report) {
  const fails = (report.metricFlags || []).filter((f) => f.grade === 'fail');
  const warns = (report.metricFlags || []).filter((f) => f.grade === 'warn');
  console.log(`tier=${report.tier}  cases=${(report.caseIds || []).join(', ')}`);
  console.log(`metrics: ${fails.length} fail / ${warns.length} warn   regressions: ${(report.regressions || []).length}`);
  for (const c of report.cases || []) {
    const top = (c.reviewQueue || [])[0];
    console.log(
      `  ${c.id}: ${c.pageCount} pages · contact=${c.contact}` +
        (top ? `\n      start at #${top.pageIndex} ${top.pageKey} — ${(top.reasons || [])[0]}` : '')
    );
  }
  if (!report.baselineUsed) {
    console.log('\nNo regression baseline yet. After a bake you are happy with: npm run quality:baseline');
  }
}

console.log('\nAGENT next steps (board-quality-loop skill):');
console.log('  1. npm run quality:status            (loop memory + review queue)');
console.log('  2. read each case contact.jpg + the queued page-*.jpg');
console.log('  3. judge as student AND teacher, write tmp/verdict.json');
console.log('  4. npm run quality:judge -- tmp/verdict.json   (validates + decides)');
console.log('  5. do exactly what NEXT ACTION says; re-bake (max 7 iterations)');
console.log(`\nReport: ${reportPath}`);
process.exit(0);
