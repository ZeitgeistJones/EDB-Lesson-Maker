/**
 * Story board grammar gate: one honest 30-minute beat, scene-dominant chrome,
 * and reusable environment completion for StoryScene templates.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  startPublicServer,
  openBoardPage,
} from './lib/verify-harness.mjs';

const lesson = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'scripts/fixtures/story-scene-templates-4-lesson.json'),
    'utf8'
  )
);

const { port, close } = await startPublicServer();
const { browser, page } = await openBoardPage(port);

try {
  const result = await page.evaluate(async (fixture) => {
    await window.PropBank.ready();
    await window.VocabIcons.ready();

    async function inspect(meta, pageKey) {
      const lessonCopy = JSON.parse(JSON.stringify(fixture));
      const boardPlan = window.EdbActivities.buildBoardPlan(lessonCopy, meta);
      await window.LessonPages.attachBgPicks(lessonCopy, meta, boardPlan);
      const rendered = await window.LessonPages.render(lessonCopy, meta, boardPlan);
      const pageIndex = rendered.slots.byKey[pageKey];
      const pageEl = rendered.pageEls[pageIndex];
      const art = pageEl && pageEl.querySelector('[data-story-art]');
      const stage = art && art.querySelector('[data-story-scene-stage]');
      const body = pageEl && pageEl.querySelector('[data-story-body]');
      const moment = pageEl && pageEl.querySelector('[data-story-moment]');
      const storyKeys = Object.keys(rendered.slots.byKey).filter((key) => /^story\d+$/.test(key));
      const layers = stage
        ? Array.from(stage.querySelectorAll('[data-story-layer]')).map((node) => ({
            slot: node.dataset.storyLayer,
            key: node.dataset.propKey,
            height: Math.round(node.getBoundingClientRect().height),
          }))
        : [];
      const out = {
        storyKeys,
        body: body ? String(body.textContent || '').trim() : '',
        hasMoment: !!moment,
        momentHeight: moment ? Math.round(moment.getBoundingClientRect().height) : 0,
        artWidth: art ? Math.round(art.getBoundingClientRect().width) : 0,
        hasStage: !!stage,
        warnings: art ? art.dataset.storySceneWarn || '' : '',
        layers,
      };
      if (window.LessonPages.cleanup) window.LessonPages.cleanup(rendered.host);
      return out;
    }

    return {
      solo: await inspect({ level: 'A1', duration: 30, phonics: 'off' }, 'story0'),
      zoo: await inspect({ level: 'A1', duration: 60, phonics: 'off' }, 'story2'),
      exchange: window.StoryScene.compose({
        templateId: 'exchange',
        actionVerb: 'gives',
        slots: {
          giver: { who: 'mia', pose: 'hold', emotion: 'happy' },
          receiver: { who: 'leo', pose: 'reach', emotion: 'happy' },
          item: { propKey: 'sch-hardcover-book', scaleClass: 'held' },
        },
      }, {
        stageW: 480,
        stageH: 380,
        environmentKey: 'story-env-classroom',
        propGet: (key) => window.PropBank.get(key),
      }),
      inferredHome: window.StoryScene.environmentKeyForCue(
        'Mom, Mia, and Leo are together at home.',
        (key) => window.PropBank.get(key)
      ),
    };
  }, lesson);

  assert.deepEqual(result.solo.storyKeys, ['story0'], '30-minute board must render one story beat');
  assert.equal(
    result.solo.body,
    lesson.story.pages[0].text,
    'single story page must not concatenate unseen later beats'
  );
  assert(result.solo.hasMoment, 'solo story must use scene-first moment chrome');
  assert(result.solo.momentHeight >= 300, `solo scene is too short: ${result.solo.momentHeight}px`);
  assert(result.solo.hasStage, 'solo story must render StoryScene');
  assert.equal(result.solo.warnings, '', `solo StoryScene warnings: ${result.solo.warnings}`);
  assert(
    result.solo.layers.some((layer) => layer.slot === 'environment' && layer.key === 'story-env-home'),
    'family story must infer the existing home environment'
  );
  assert(
    result.solo.layers.filter((layer) => ['left', 'center', 'right'].includes(layer.slot)).length === 3,
    'family beat must stage all three characters'
  );

  assert(result.zoo.hasStage, 'zoo beat must render StoryScene');
  assert.equal(result.zoo.warnings, '', `zoo StoryScene warnings: ${result.zoo.warnings}`);
  assert(
    result.zoo.layers.some((layer) => layer.key === 'story-env-zoo'),
    'zoo beat must include its environment'
  );
  assert(
    result.zoo.layers.some((layer) => layer.slot === 'hero' && layer.key === 'animal-lion'),
    'zoo beat must preserve the lion focal relationship'
  );
  assert.equal(result.exchange.warnings.length, 0, result.exchange.warnings.join(' | '));
  assert.equal(result.exchange.storyActionContract?.ok, true, 'exchange must satisfy transfer contract');
  assert(
    result.exchange.layers.some(
      (layer) => layer.slot === 'giver' && layer.key === 'cast-mia-reach-happy'
    ),
    'transfer must stage the giver with a reach pose'
  );
  assert(
    result.exchange.layers.some(
      (layer) => layer.slot === 'receiver' && layer.key === 'cast-leo-reach-happy'
    ),
    'transfer must stage the recipient ready to receive'
  );
  assert.equal(result.inferredHome, 'story-env-home');

  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} finally {
  await browser.close();
  close();
}
