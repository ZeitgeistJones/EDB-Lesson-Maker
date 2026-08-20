/**
 * Bake story-scene E2E prototype → page JPGs + story contact strip.
 *
 *   node scripts/preview-story-scene-proto.mjs
 *   node scripts/preview-story-scene-proto.mjs --fixture=story-scene-templates-4-lesson.json --out=tmp/story-scene-templates-4
 *   node scripts/preview-story-scene-proto.mjs --story-art=0
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  arg,
  loadEnv,
  clearPageJpgs,
  startPublicServer,
  openBoardPage,
  prepareStoryArt,
} from './lib/verify-harness.mjs';

const FIXTURE = arg('fixture', 'story-scene-mia-leo-lesson.json');
const OUT = path.join(ROOT, arg('out', 'tmp/story-scene-proto'));

loadEnv();
const lesson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/fixtures', FIXTURE), 'utf8')
);
const meta = { level: 'A1', duration: '60', phonics: 'off' };
const storyArtMode = String(arg('story-art', '0')).toLowerCase();
const { storyArtMeta } = await prepareStoryArt(lesson, meta, storyArtMode);

fs.mkdirSync(OUT, { recursive: true });
clearPageJpgs(OUT);

const { port, close } = await startPublicServer();
const { browser, page } = await openBoardPage(port);

const result = await page.evaluate(async ({ lesson, meta }) => {
  await window.PropBank.ready();
  await window.VocabIcons.ready();
  if (!window.StoryScene) {
    return { error: 'StoryScene missing — check public/index.html script order' };
  }

  const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
  await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
  const sections = window.LessonPages.buildSectionList(lesson, meta);

  const storyIdxs = sections
    .map((s, i) => ((s.tags || []).includes('story') ? i : -1))
    .filter((i) => i >= 0);

  const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
  const pages = [];
  for (let i = 0; i < canvases.length; i++) {
    pages.push({
      index: i,
      key: (boardPlan.pages && boardPlan.pages[i] && boardPlan.pages[i].pageKey) || String(i),
      dataUrl: canvases[i].toDataURL('image/jpeg', 0.9),
    });
  }

  const rendered = await window.LessonPages.render(lesson, meta, boardPlan);
  const byKey = (rendered.slots && rendered.slots.byKey) || {};

  const storyQa = [];
  for (let storyI = 0; storyI < storyIdxs.length; storyI++) {
    const key = 'story' + storyI;
    const el = rendered.pageEls[byKey[key]];
    const sp = (lesson.story && lesson.story.pages && lesson.story.pages[storyI]) || {};
    const slot = el && el.querySelector('[data-story-art]');
    const stage = slot && slot.querySelector('[data-story-scene-stage]');
    const layers = stage
      ? Array.from(stage.querySelectorAll('img')).map((im) => ({
          slot: im.dataset.storyLayer || '',
          key: im.dataset.propKey || '',
          flip: /scaleX\(-1\)/.test(String((im.style && im.style.transform) || '')),
          z: Number(im.style.zIndex) || 0,
          scaleClass: im.dataset.scaleClass || '',
        }))
      : [];
    const caption = slot && slot.querySelector('[data-story-caption-chip]');
    storyQa.push({
      i: storyI,
      pageKey: key,
      templateId: (sp.storyScene && sp.storyScene.templateId) || null,
      actionVerb: (sp.storyScene && sp.storyScene.actionVerb) || null,
      hasStage: !!stage,
      layerCount: layers.length,
      layers,
      warnings: (slot && slot.dataset.storySceneWarn) || null,
      caption: caption ? String(caption.textContent || '').trim() : null,
      sideW: slot ? Math.round(slot.getBoundingClientRect().width) : 0,
    });
  }

  if (window.LessonPages.cleanup) window.LessonPages.cleanup(rendered.host);

  return {
    title: lesson.title,
    storyPageCount: storyIdxs.length,
    templates: window.StoryScene.supportedTemplates(),
    storyQa,
    pages,
    pageKeys: (boardPlan.pages || []).map((p) => p.pageKey),
  };
}, { lesson, meta });

await browser.close();
close();

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

for (const p of result.pages) {
  const b64 = p.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(path.join(OUT, `page-${p.index}-${p.key}.jpg`), Buffer.from(b64, 'base64'));
}

const storyPages = result.pages.filter((p) => /^story\d+$/i.test(p.key));
const contactPath = path.join(OUT, 'story-pages-contact.jpg');

if (storyPages.length) {
  const { chromium } = await import('playwright');
  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage({ viewport: { width: 1600, height: 700 } });
  await p2.setContent('<!doctype html><canvas id="c"></canvas>');
  const labels = (result.storyQa || []).map(
    (q) => `${q.templateId || q.pageKey}${q.actionVerb ? ' · ' + q.actionVerb : ''}`
  );
  const contactUrl = await p2.evaluate(
    async ({ stories, labels }) => {
      const gap = 12;
      const labelH = 36;
      const imgs = await Promise.all(
        stories.map(
          (s) =>
            new Promise((resolve, reject) => {
              const im = new Image();
              im.onload = () => resolve(im);
              im.onerror = reject;
              im.src = s.dataUrl;
            })
        )
      );
      const cellH = 520;
      const scales = imgs.map((im) => cellH / im.height);
      const cellWs = imgs.map((im, i) => Math.round(im.width * scales[i]));
      const w = cellWs.reduce((a, b) => a + b, 0) + gap * (imgs.length + 1);
      const h = labelH + cellH + gap * 2;
      const canvas = document.getElementById('c');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 18px system-ui,sans-serif';
      ctx.fillText('Story-scene templates — real story pages', gap, 26);
      let x = gap;
      for (let i = 0; i < imgs.length; i++) {
        const im = imgs[i];
        const cw = cellWs[i];
        ctx.drawImage(im, x, labelH, cw, cellH);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillText(labels[i] || stories[i].key, x + 4, labelH + cellH + 14);
        x += cw + gap;
      }
      return canvas.toDataURL('image/jpeg', 0.92);
    },
    { stories: storyPages, labels }
  );
  await b2.close();
  const b64 = contactUrl.replace(/^data:image\/jpeg;base64,/, '');
  fs.writeFileSync(contactPath, Buffer.from(b64, 'base64'));
}

const summary = {
  title: result.title,
  fixture: FIXTURE,
  out: OUT,
  storyPageCount: result.storyPageCount,
  templates: result.templates,
  storyQa: result.storyQa,
  storyArt: storyArtMeta,
  pageFiles: result.pages.map((p) => `page-${p.index}-${p.key}.jpg`),
  contact: storyPages.length ? 'story-pages-contact.jpg' : null,
  ok:
    result.storyPageCount === 4 &&
    (result.storyQa || []).every((q) => q.hasStage && q.layerCount >= 2),
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
