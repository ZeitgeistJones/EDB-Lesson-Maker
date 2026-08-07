/**
 * Smoke: pack kit assessment + board readiness (no browser).
 *   node scripts/test-board-readiness.mjs
 *
 * Castle currently has a sharp king (castle-wall-gate) but soft blob-sheet
 * docks banned by MIN_DOCK_SRC — assessKit must return ready:false near-miss
 * and BoardReadiness must draft, not silently Ready.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/assets/09_props/manifest.json'), 'utf8')
);
const lesson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/castle-lesson.json'), 'utf8')
);

const sandbox = {
  window: {},
  console,
  fetch: () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(manifest),
    }),
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/lib/propBank.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/lib/boardReadiness.js'), 'utf8'), sandbox);

await sandbox.window.PropBank.ready();
const kit = sandbox.window.PropBank.assessKit(lesson);
const hits = sandbox.window.PropBank.vocabPropHits(lesson);

if (!kit || kit.pack !== 'castle' || !kit.hero || kit.hero.key !== 'castle-wall-gate') {
  console.error('FAIL kit near-miss shape', kit && {
    pack: kit.pack,
    hero: kit.hero && kit.hero.key,
    ready: kit.ready,
    docks: kit.dockCount,
  });
  process.exit(1);
}

if (kit.ready) {
  // Sharp docks restored — full ready path.
  if (kit.dockCount < 6) {
    console.error('FAIL ready kit needs ≥6 sharp docks', kit.dockCount);
    process.exit(1);
  }
  const plan = {
    assignments: [{ pageKey: 'activity', recipeId: 'heroProp', ctx: { hero: kit.hero } }],
  };
  const report = sandbox.window.BoardReadiness.assess(lesson, plan);
  if (report.status !== 'ready') {
    console.error('FAIL readiness expected ready', report);
    process.exit(1);
  }
  console.log('OK castle kit + ready', {
    pack: kit.pack,
    hero: kit.hero.key,
    docks: kit.dockCount,
    vocab: `${hits.hits}/${hits.total}`,
  });
  process.exit(0);
}

// Soft-dock ban path: near-miss must draft honestly.
if (kit.dockCount >= 6) {
  console.error('FAIL expected soft-dock near-miss but dockCount≥6', kit.dockCount);
  process.exit(1);
}
if (hits.hits < 4) {
  console.error('FAIL vocab hits', hits);
  process.exit(1);
}
const plan = {
  assignments: [{ pageKey: 'activity', recipeId: 'heroProp', ctx: { hero: kit.hero } }],
};
const report = sandbox.window.BoardReadiness.assess(lesson, plan);
if (report.status !== 'draft') {
  console.error('FAIL readiness expected draft (soft docks)', report);
  process.exit(1);
}
if (!report.reasons.some((r) => /sharp dock|soft scraps/i.test(r))) {
  console.error('FAIL missing soft-dock reason', report.reasons);
  process.exit(1);
}
console.log('OK castle near-miss → draft', {
  pack: kit.pack,
  hero: kit.hero.key,
  docks: kit.dockCount,
  soft: kit.softDockCount,
  vocab: `${hits.hits}/${hits.total}`,
  reason: report.reasons[0],
});
