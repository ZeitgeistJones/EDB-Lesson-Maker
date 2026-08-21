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
const policy = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'public/lib/propPolicy.json'), 'utf8')
);
const lesson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures/castle-lesson.json'), 'utf8')
);

const sandbox = {
  window: {},
  console,
  fetch: (url) => {
    const u = String(url);
    if (u.includes('propPolicy')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(policy) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) });
  },
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

// heroProp approval must verify the rendered hero, dock family, and language frame.
sandbox.window.EdbActivities = {
  findHeroProp: () => kit.hero,
};
sandbox.window.LessonTraits = {
  kingHintFor: () => 'Build the castle. Then say: I put the ___ on the castle.',
};
const castleDock = [
  'castle-flag-red',
  'castle-crown',
  'castle-shield',
  'castle-sword',
  'castle-key',
  'castle-door-wood',
].map((propKey) => ({ role: 'dockPiece', asset: `assets/09_props/${propKey}.png`, meta: { propKey } }));
const contractPlan = {
  pages: [{
    pageKey: 'activity',
    locked: [
      { role: 'dropPad', asset: 'pad.png', meta: { snapIndex: 1 } },
      { role: 'dropPad', asset: 'pad.png', meta: { snapIndex: 2 } },
      { role: 'heroStateLadder', asset: 'ladder.png', meta: { payoff: 'CASTLE READY' } },
      { role: 'heroPayoff', asset: 'payoff.png', meta: { payoff: 'CASTLE READY' } },
    ],
    unlocked: [
      { role: 'stageHero', meta: { propKey: 'castle-wall-gate', stageKing: true } },
      ...castleDock,
    ],
  }],
};
const contractAct = {
  pageKey: 'activity',
  recipeId: 'heroProp',
  ctx: { hero: kit.hero },
};
const contract = sandbox.window.BoardReadiness.heroStageContract(lesson, contractPlan, contractAct);
if (!contract || !contract.ok) {
  console.error('FAIL aligned heroProp contract', contract);
  process.exit(1);
}
const driftPlan = JSON.parse(JSON.stringify(contractPlan));
driftPlan.pages[0].unlocked[1].meta.propKey = 'camp-flashlight';
const drift = sandbox.window.BoardReadiness.heroStageContract(lesson, driftPlan, contractAct);
if (!drift || drift.ok || !drift.reasons.some((r) => /off-topic dock/i.test(r))) {
  console.error('FAIL heroProp contract must reject semantic drift', drift);
  process.exit(1);
}

const promisedHint = {
  kingHintFor: () => 'Drag eyes, nose, and hair onto the face. Then say: I add the ___.',
};
sandbox.window.LessonTraits = promisedHint;
const ghostEyes = sandbox.window.BoardReadiness.heroStageContract(lesson, contractPlan, contractAct);
if (!ghostEyes || ghostEyes.ok || !ghostEyes.reasons.some((r) => /promised noun/i.test(r))) {
  console.error('FAIL heroProp contract must reject promised nouns with no dock source', ghostEyes);
  process.exit(1);
}
sandbox.window.LessonTraits = {
  kingHintFor: () => 'Build the castle. Then say: I put the ___ on the castle.',
};

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
