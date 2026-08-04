/**
 * Preflight board checks — run before you open ClassIn / Board Preview.
 *
 *   npm run preflight
 *
 * Layer 1 — concrete rules (auto fail):
 *   topic scene match, flat/scene mix, dock not over cards, no old gradients
 *
 * Layer 2 — UX judgment (agent reads baked JPGs vs scripts/ux-board-rubric.cjs):
 *   readability, rhythm, worksheet vs place feel, muddy washes, cheap placeholders
 *
 * Exit 0 from this script = layer 1 passed. Layer 2 is done in chat after bake.
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
code = run('2/2  Headless board bake (visual rules)', 'npm', ['run', 'test:board-bg']) || code;

console.log('\n══════════════════════════════════════');
if (code) {
  console.error('PREFLIGHT FAILED (rules) — skip manual ClassIn.');
  console.error('Fix failures above, then: npm run preflight');
  process.exit(code);
}

console.log('PREFLIGHT RULES PASSED');
console.log('Artifacts for UX review:');
if (fs.existsSync(OUT)) {
  for (const dir of fs.readdirSync(OUT)) {
    const p = path.join(OUT, dir);
    if (!fs.statSync(p).isDirectory()) continue;
    const pages = fs.readdirSync(p).filter((f) => f.startsWith('page-') && f.endsWith('.jpg'));
    console.log(`  ${dir}/  (${pages.length} pages) → ${p}`);
  }
}
console.log('\nNext: agent/human UX pass using scripts/ux-board-rubric.cjs');
console.log('  Soft: title wash, drill surfaces, story place feel, dock alignment, card contrast');
process.exit(0);
