/**
 * Offline smoke: story-art API module loads and respects STORY_ART gate.
 */
process.env.STORY_ART = '0';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';

const handler = require('../api/generate-story-art.js');

function mockRes() {
  const out = { statusCode: 200, body: null };
  return {
    out,
    setHeader() {},
    status(code) { out.statusCode = code; return this; },
    json(payload) { out.body = payload; return this; },
  };
}

(async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { title: 'Test', pages: [{ index: 0, text: 'Hi', visualCaption: 'hi' }] } }, res);
  if (res.out.statusCode !== 403 || !res.out.body?.disabled) {
    console.error('expected 403 disabled when STORY_ART=0', res.out);
    process.exit(1);
  }

  const bad = mockRes();
  await handler({ method: 'GET', body: {} }, bad);
  if (bad.out.statusCode !== 405) {
    console.error('expected 405 for GET', bad.out);
    process.exit(1);
  }

  console.log('ok: story-art module gate + method check');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
