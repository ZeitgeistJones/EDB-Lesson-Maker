/**
 * Preflight / quality entry — hard bake for board quality loop.
 *
 *   npm run preflight
 *   npm run quality
 *
 * Exit 0 = hard rules passed. Agent must then run board-quality-loop skill
 * (read strips, score soft UX, fix, re-run; max 5 iterations).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tmp', 'board-bg-verify');

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
code = run('1/2  Background picks (fast)', 'npm', ['run', 'test:bg-picks']) || code;
code = run('2/2  Headless board bake (hard rules)', 'npm', ['run', 'test:board-bg']) || code;

console.log('\n══════════════════════════════════════');
if (code) {
  console.error('QUALITY HARD FAIL — fix report hardFailures, then re-run.');
  console.error(`Report: ${path.join(OUT, 'report.json')}`);
  process.exit(code);
}

console.log('QUALITY HARD PASS');
if (fs.existsSync(OUT)) {
  for (const dir of fs.readdirSync(OUT)) {
    const p = path.join(OUT, dir);
    if (!fs.statSync(p).isDirectory()) continue;
    const strip = path.join(p, 'strip.jpg');
    const pages = fs.readdirSync(p).filter((f) => f.startsWith('page-') && f.endsWith('.jpg'));
    console.log(`  ${dir}/  strip=${fs.existsSync(strip) ? 'yes' : 'no'}  pages=${pages.length}`);
  }
}
console.log(`\nReport: ${path.join(OUT, 'report.json')}`);
console.log('AGENT: run board-quality-loop skill — read strips, fix soft UX, re-run (max 5).');
process.exit(0);
