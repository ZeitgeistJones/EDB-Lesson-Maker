/**
 * Submit an agent judgment for the last board bake and get the next action.
 *
 *   npm run quality:judge -- tmp/verdict.json
 *   npm run quality:judge -- --stdin < verdict.json
 *   npm run quality:judge -- tmp/verdict.json --mark-done=EW1
 *   npm run quality:judge -- --reset            (start a fresh loop, keep history)
 *
 * Verdict JSON:
 * {
 *   "lens":   { "student": "...", "teacher": "..." },
 *   "scores": { "gym": { "readable": 2, "funCharming": 1 } },       // 0-3 per pillar, optional
 *   "findings": [
 *     { "code": "M6", "caseId": "gym", "pageKey": "newWords",
 *       "note": "purple heading is unreadable on the dark chalkboard",
 *       "root": "dark-flat-contrast", "clearFix": true, "assetGap": false }
 *   ],
 *   "clean": false
 * }
 *
 * Unknown codes are rejected, so the harness and the rubric cannot drift.
 * Hard failures come from the bake, not the agent.
 */
const fs = require('fs');
const path = require('path');

const rubric = require('./ux-board-rubric.cjs');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'tmp', 'board-bg-verify', 'report.json');
const STATE_PATH = path.join(__dirname, 'quality-state.json');
const LOG_PATH = path.join(ROOT, 'docs', 'quality-log.md');
const HISTORY_CAP = 24;

const LOG_HEADER = `# Board quality loop log

Append-only memory for the board quality loop. One line per judged iteration, newest last.
Written by \`npm run quality:judge\` — do not hand-edit. Machine state lives in \`scripts/quality-state.json\`.

`;

function parseArgs(argv) {
  const out = { file: null, stdin: false, reset: false, markDone: [], dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--stdin') out.stdin = true;
    else if (a === '--reset') out.reset = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--mark-done=')) out.markDone.push(a.split('=')[1]);
    else if (!a.startsWith('--')) out.file = a;
  }
  return out;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function emptyState() {
  return { updatedAt: null, iteration: 0, softRoots: [], markers: [], history: [] };
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_) {
    return '';
  }
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  if (state.history.length > HISTORY_CAP) {
    state.history = state.history.slice(-HISTORY_CAP);
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function appendLog(line) {
  let body = '';
  if (fs.existsSync(LOG_PATH)) body = fs.readFileSync(LOG_PATH, 'utf8');
  if (!body.trim()) body = LOG_HEADER;
  if (!body.endsWith('\n')) body += '\n';
  fs.writeFileSync(LOG_PATH, body + line + '\n');
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function main() {
  const args = parseArgs(process.argv);
  const state = readJson(STATE_PATH, emptyState());
  state.softRoots = state.softRoots || [];
  state.markers = state.markers || [];
  state.history = state.history || [];

  if (args.reset) {
    state.iteration = 0;
    saveState(state);
    console.log('Loop reset: iteration 0. History and markers kept.');
    console.log(`Roots remembered: ${state.softRoots.join(', ') || '(none)'}`);
    return;
  }

  if (args.markDone.length) {
    for (const ew of args.markDone) {
      const marker = `done:${ew}`;
      if (!state.markers.includes(marker)) state.markers.push(marker);
    }
    saveState(state);
    console.log(`Marked implemented: ${args.markDone.join(', ')}`);
    if (!args.file && !args.stdin) return;
  }

  const report = readJson(REPORT, null);
  if (!report) {
    console.error('No bake report found. Run: npm run quality');
    process.exit(1);
  }

  const raw = args.stdin ? readStdin() : args.file ? fs.readFileSync(args.file, 'utf8') : '';
  if (!raw.trim()) {
    console.error('Provide a verdict file: npm run quality:judge -- tmp/verdict.json');
    process.exit(1);
  }

  let verdict;
  try {
    verdict = JSON.parse(raw);
  } catch (e) {
    console.error(`Verdict is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  const check = rubric.validateVerdict(verdict);
  if (!check.ok) {
    console.error('Verdict rejected:');
    check.errors.forEach((e) => console.error(' •', e));
    console.error('\nKnown codes:', rubric.allCodes().join(', '));
    process.exit(1);
  }

  const hardFailures = (report.cases || []).flatMap((c) =>
    (c.hardFailures || []).map((f) => ({ ...f, caseId: c.id }))
  );
  const softFindings = (verdict.findings || []).filter((f) => !String(f.code).startsWith('H'));
  const agentHard = (verdict.findings || []).filter((f) => String(f.code).startsWith('H'));

  const priors = [...state.softRoots, ...state.markers];
  const iteration = (state.iteration || 0) + 1;
  const decision = rubric.decide({
    hardFailures: [...hardFailures, ...agentHard],
    softFindings,
    priorSoftRoots: priors,
    iteration,
  });

  const roots = [...new Set(softFindings.map((f) => f.root || f.code).filter(Boolean))];
  const metricFails = (report.metricFlags || []).filter((f) => f.grade === 'fail').length;
  const metricWarns = (report.metricFlags || []).filter((f) => f.grade === 'warn').length;

  const enriched = {
    generatedAt: new Date().toISOString(),
    iteration,
    tier: report.tier || 'core',
    lens: verdict.lens,
    scores: verdict.scores || null,
    findings: softFindings.map((f) => ({ ...f, tier: rubric.codeTier(f.code) })),
    decision,
    priorSoftRoots: priors,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(enriched, null, 2));
    return;
  }

  report.uxVerdict = enriched;
  report.iteration = iteration;
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  state.iteration = iteration;
  state.softRoots = [...new Set([...state.softRoots, ...roots])];
  state.history.push({
    at: new Date().toISOString(),
    iteration,
    tier: report.tier || 'core',
    cases: report.caseIds || [],
    action: decision.action,
    codes: decision.codes || (decision.code ? [decision.code] : []),
    roots,
    hardFailures: hardFailures.length,
    metricFails,
    metricWarns,
    regressions: (report.regressions || []).length,
  });
  saveState(state);

  const codes = (decision.codes || (decision.code ? [decision.code] : [])).join(', ') || '—';
  appendLog(
    `- ${fmtDate(new Date())} iter ${iteration} (${report.tier || 'core'}) — **${decision.action}** ${codes} · hard ${hardFailures.length} · metric ${metricFails} fail / ${metricWarns} warn · roots: ${roots.join(', ') || '—'}${
      decision.action === 'wishlist' ? ' · asset gap logged' : ''
    }`
  );

  console.log(`Verdict accepted — iteration ${iteration} (${report.tier || 'core'})`);
  console.log(`Hard failures from bake: ${hardFailures.length}`);
  console.log(`Metric flags: ${metricFails} fail / ${metricWarns} warn · regressions: ${(report.regressions || []).length}`);
  console.log(`Roots this pass: ${roots.join(', ') || '(none)'}`);
  console.log('');
  console.log(`NEXT ACTION: ${decision.action}`);
  console.log(decision.message);
  if (decision.stop) {
    console.log('\nLoop should stop here. Commit the work and summarize for the user.');
  } else {
    console.log('\nApply the fix, then re-run: npm run quality (or quality:full before declaring clean)');
  }
  if ((report.wishlistCandidates || []).length) {
    console.log('\nAsset gaps the bake noticed (append to docs/asset-wishlist.md if you agree):');
    report.wishlistCandidates.forEach((w) => console.log(` • ${w.caseId}: ${w.need}`));
  }
  console.log(`\nLog: ${LOG_PATH}`);
}

main();
