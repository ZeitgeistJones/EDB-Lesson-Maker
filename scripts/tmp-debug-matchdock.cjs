const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

function servePublic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
      const file = path.join(ROOT, 'public', rel);
      if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const ext = path.extname(file);
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const server = await servePublic();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('BROWSER:', msg.text()));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    window.LessonPages && window.EdbActivities && window.PropBank && window.VocabIcons);

  const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fixtures', 'fruit-market-lesson.json'), 'utf8'));

  const out = await page.evaluate(async (lessonIn) => {
    await window.PropBank.ready();
    await window.VocabIcons.ready();
    const lesson = JSON.parse(JSON.stringify(lessonIn));
    const TI = window.TopicIdentity;
    const PQ = window.ProducerQuality;
    const topicBrief = TI && TI.buildBrief ? TI.buildBrief(lesson) : null;
    const pre = PQ && PQ.validate ? PQ.validate(lesson, { topicBrief }) : null;
    let repairResult = null;
    let afterRepairVocab = null;
    if (pre && !pre.pass && PQ.repair) {
      repairResult = PQ.repair(lesson, { topicBrief, maxAttempts: 3 });
      afterRepairVocab = lesson.vocabulary;
    }
    return {
      topicBriefCoreConcepts: topicBrief && topicBrief.coreConcepts,
      topicBriefSupporting: topicBrief && topicBrief.supportingConcepts,
      pre: pre && { pass: pre.pass, failures: pre.failures, checks: (pre.checks || pre.results || []).map((c) => ({ code: c.code, pass: c.pass, detail: c.detail })) },
      repairRepairs: repairResult && repairResult.repairs,
      repairReportPass: repairResult && repairResult.report && repairResult.report.pass,
      repairReportFailures: repairResult && repairResult.report && repairResult.report.failures,
      afterRepairVocab,
    };
  }, lesson);

  console.log(JSON.stringify(out, null, 2));

  await browser.close();
  server.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
