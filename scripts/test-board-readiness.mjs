/**
 * Smoke: pack kit assessment + board readiness (no browser).
 *   node scripts/test-board-readiness.mjs
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
if (!kit || !kit.ready || kit.pack !== 'castle' || kit.hero.key !== 'castle-wall-gate') {
  console.error('FAIL kit', kit && { pack: kit.pack, hero: kit.hero && kit.hero.key, ready: kit.ready });
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
if (report.status !== 'ready') {
  console.error('FAIL readiness', report);
  process.exit(1);
}
console.log('OK castle kit + ready', {
  pack: kit.pack,
  hero: kit.hero.key,
  docks: kit.dockCount,
  vocab: `${hits.hits}/${hits.total}`,
});
