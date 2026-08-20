/**
 * Small P0 activation diagnostic bake: four deterministic lessons, board JPGs,
 * and a compact report under tmp/p0-activation.
 *
 *   node scripts/preview-p0-activation.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tmp', 'p0-activation');
const PORT = 8800 + Math.floor(Math.random() * 700);

const LESSONS = [
  {
    slug: 'prea1-zoo-animals',
    meta: { level: 'Pre-A1', duration: '30', phonics: 'auto' },
    lesson: baseLesson('Zoo Animals', ['lion', 'monkey', 'elephant', 'zoo'], {
      storyText: 'A girl kicks a ball by a fence.',
      visualCaption: 'girl kicking ball by fence',
      activityTitle: 'Sentence Practice',
    }),
  },
  {
    slug: 'a1-day-at-the-zoo',
    meta: { level: 'A1', duration: '30', phonics: 'auto' },
    lesson: baseLesson('A Day at the Zoo', ['lion', 'monkey', 'ticket', 'zoo'], {
      storyText: 'Mia visits the zoo. She sees a lion.',
      visualCaption: 'Mia sees a lion at the zoo',
      activityTitle: 'Zoo Choice',
    }),
  },
  {
    slug: 'a2-playing-badminton',
    meta: { level: 'A2', duration: '30', phonics: 'auto' },
    lesson: baseLesson('Playing Badminton', ['racket', 'shuttlecock', 'court', 'net'], {
      storyText: 'Leo plays badminton on the court. He sees the shuttlecock.',
      visualCaption: 'Leo on a court with a shuttlecock',
      activityTitle: 'Badminton Practice',
    }),
  },
  {
    slug: 'b1-world-of-beekeeping',
    meta: { level: 'B1', duration: '30', phonics: 'off' },
    lesson: baseLesson('The World of Beekeeping', ['bee', 'hive', 'honey', 'beekeeper', 'smoker'], {
      storyText: 'Mia sees a bee near the hive. The beekeeper checks the honey carefully.',
      visualCaption: 'Mia sees a bee near a hive',
      activityTitle: 'Beekeeping Choices',
    }),
  },
];

function baseLesson(title, vocab, opts) {
  return {
    title,
    warmUp: { question: 'What can you see?', sampleAnswer: 'I can see it.' },
    vocabulary: vocab.map((word) => ({ word, emoji: '•', sentence: `I see the ${word}.` })),
    sentenceFrames: ['I see ___.', 'The ___ is here.'],
    story: {
      title: `${title} Story`,
      pages: [
        {
          heading: 'Look',
          text: opts.storyText,
          visualTheme: /zoo/i.test(title) ? 'nature' : 'school',
          visualCaption: opts.visualCaption,
        },
        {
          heading: 'Say',
          text: `Mia says: I see ${vocab[0]}.`,
          visualTheme: /zoo/i.test(title) ? 'nature' : 'school',
          visualCaption: `Mia sees ${vocab[0]}`,
        },
      ],
      comprehensionQuestions: [
        { question: `What does Mia see?`, sampleAnswer: vocab[0] },
        { question: `Where is the story?`, sampleAnswer: title },
        { question: `What happens next?`, sampleAnswer: 'They look and say the word.' },
      ],
      creativeQuestions: ['What do you want to see?'],
    },
    speakingQuestions: [
      { question: 'What can you see?', sampleAnswer: `I can see ${vocab[0]}.` },
      { question: 'What do you choose?', sampleAnswer: `I choose ${vocab[1] || vocab[0]}.` },
    ],
    activity: {
      title: opts.activityTitle,
      prompt: 'Choose and say.',
      templates: ['I choose ___.', 'I see ___.'],
    },
    reviewSentences: [`I see ${vocab[0]}.`, `I choose ${vocab[1] || vocab[0]}.`],
  };
}

function servePublic() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
    const file = path.join(ROOT, 'public', rel);
    if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.css': 'text/css',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await servePublic();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.BoardPreview && window.PropBank && window.ProducerBridge
  );

  const report = [];
  for (const item of LESSONS) {
    const out = path.join(OUT_DIR, item.slug);
    fs.mkdirSync(out, { recursive: true });
    for (const f of fs.readdirSync(out)) {
      if (/\.jpe?g$/i.test(f)) fs.unlinkSync(path.join(out, f));
    }

    const result = await page.evaluate(async ({ lesson, meta }) => {
      await window.PropBank.ready();
      await window.VocabIcons.ready();
      const boardPlan = window.EdbActivities.buildBoardPlan(lesson, meta);
      await window.LessonPages.attachBgPicks(lesson, meta, boardPlan);
      const canvases = await window.BoardPreview.renderCanvases(lesson, meta, boardPlan);
      const assignments = boardPlan.assignments || [];
      const activity = assignments.find((a) => a.pageKey === 'activity') || null;
      const storyScenes = ((lesson.story && lesson.story.pages) || [])
        .map((p) => p && p.storyScene && p.storyScene.templateId)
        .filter(Boolean);
      return {
        pageKeys: (boardPlan.pages || []).map((p) => p.pageKey),
        activityRecipe: activity && activity.recipeId,
        hero: activity && activity.ctx && activity.ctx.hero && activity.ctx.hero.key,
        storyScenes,
        preA1Actions: lesson._preA1Actions || [],
        storyCaptions: ((lesson.story && lesson.story.pages) || []).map((p) => p.visualCaption),
        jpgs: canvases.map((c, i) => ({
          i,
          key: (boardPlan.pages && boardPlan.pages[i] && boardPlan.pages[i].pageKey) || String(i),
          dataUrl: c.toDataURL('image/jpeg', 0.88),
        })),
      };
    }, { lesson: item.lesson, meta: item.meta });

    for (const jpg of result.jpgs) {
      const b64 = jpg.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(path.join(out, `page-${jpg.i}-${jpg.key}.jpg`), Buffer.from(b64, 'base64'));
    }
    fs.writeFileSync(path.join(out, 'lesson.json'), JSON.stringify(item.lesson, null, 2));
    fs.writeFileSync(path.join(out, 'board-summary.json'), JSON.stringify(result, null, 2));
    report.push({
      slug: item.slug,
      level: item.meta.level,
      pages: result.pageKeys,
      activityRecipe: result.activityRecipe,
      hero: result.hero || null,
      storyScenes: result.storyScenes,
      preA1Actions: result.preA1Actions,
      previewDir: path.relative(ROOT, out),
    });
    console.log('Wrote', path.relative(ROOT, out), result.activityRecipe, result.hero || '');
  }

  await browser.close();
  server.close();

  const lines = [
    '# P0 Activation Diagnostic',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'StoryArt: OFF (no story-art calls; deterministic board compositor only).',
    '',
    ...report.flatMap((r) => [
      `## ${r.level} — ${r.slug}`,
      `- Preview: \`${r.previewDir}\``,
      `- Pages: ${r.pages.join(', ')}`,
      `- Activity: ${r.activityRecipe || 'none'}${r.hero ? ` (${r.hero})` : ''}`,
      `- StoryScene templates: ${r.storyScenes.join(', ') || 'none'}`,
      `- Pre-A1 actions: ${(r.preA1Actions || []).map((a) => a.key).join(', ') || 'n/a'}`,
      '',
    ]),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  console.log('Wrote', path.relative(ROOT, path.join(OUT_DIR, 'report.md')));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
