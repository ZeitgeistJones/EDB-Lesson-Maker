/**
 * Send ONE board JPG to Manus for SINGLE BOARD / BOARD-GRAMMAR REVIEW.
 *
 *   node scripts/manus/review-single-board.mjs \
 *     --board=tmp/board-type-baselines/sceneRepair.jpg \
 *     --type=sceneRepair --round=1 --topic=fruit-market --level=A1 \
 *     --job="diagnose, repair, explain" \
 *     --movable="wrong piece + correct replacement" \
 *     --changes="wrong scene becomes coherent" \
 *     [--dry-run]
 *
 * Stages a private packet under tmp/manus-board-loops/<type>/round-NN-<topic>/
 * so prior rounds are never overwritten, then calls the existing Manus review
 * bridge with maxImages=1.
 */
import fs from 'fs';
import path from 'path';
import { ROOT } from './client.mjs';
import { runBoardReview, arg } from './review.mjs';

function slug(s) {
  return String(s || 'topic')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'topic';
}

function padRound(n) {
  const num = Math.max(1, Number(n) || 1);
  return String(num).padStart(2, '0');
}

function buildSingleBoardBrief(meta) {
  const prior = (meta.priorSystemicFixes || []).filter(Boolean);
  return [
    'MODE: SINGLE BOARD / BOARD-GRAMMAR REVIEW',
    'You are reviewing this SINGLE BOARD using your SINGLE BOARD / BOARD-GRAMMAR REVIEW skill.',
    '',
    'Judge BOTH:',
    '1) this actual rendered board, and',
    '2) what it reveals about the reusable board grammar.',
    '',
    'Do NOT review an unseen whole lesson. Do NOT invent other pages. Do NOT implement code.',
    'Be demanding about VISUAL / PRODUCT POLISH, child engagement, worksheet smell, and action→payoff.',
    '',
    'Separate findings clearly into:',
    '- SYSTEMIC (reusable grammar / producer / layout / scale / hierarchy)',
    '- INSTANCE-SPECIFIC (this topic/asset only)',
    '',
    `BOARD_TYPE_ID: ${meta.boardType}`,
    `ROUND: ${meta.round}`,
    `TOPIC: ${meta.topic}`,
    `CEFR LEVEL: ${meta.level}`,
    `CORE LEARNER JOB: ${meta.job}`,
    `WHAT IS SUPPOSED TO BE MOVABLE: ${meta.movable}`,
    `WHAT IS SUPPOSED TO CHANGE / REVEAL: ${meta.changes}`,
    prior.length
      ? `PREVIOUS SYSTEMIC FIXES (Round > 1):\n- ${prior.join('\n- ')}`
      : 'PREVIOUS SYSTEMIC FIXES: none (Round 1 or first pass)',
    '',
    'Also report:',
    '- verdict (SHIP / NEAR-SHIP / REVISE / FAIL) in notes if your schema verdict maps poorly',
    '- Visual/Product Polish score emphasis',
    '- child curiosity test (7–12, before teacher explains)',
    '- recommended next stress-test topic that differs materially from this one',
    '',
    'Prefer next_actions aimed at the reusable producer/grammar, not one-off Photoshop.',
    meta.notes ? `\nExtra notes:\n${meta.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const boardArg = arg('board', '');
  if (!boardArg) {
    throw new Error(
      'Usage: node scripts/manus/review-single-board.mjs --board=<jpg> --type=<id> --round=N --topic=... --level=A1 --job=... --movable=... --changes=...'
    );
  }
  const boardAbs = path.isAbsolute(boardArg) ? boardArg : path.join(ROOT, boardArg);
  if (!fs.existsSync(boardAbs) || !fs.statSync(boardAbs).isFile()) {
    throw new Error(`Board image not found: ${boardAbs}`);
  }

  const boardType = arg('type', path.basename(boardAbs, path.extname(boardAbs)));
  const round = Number(arg('round', '1')) || 1;
  const topic = arg('topic', 'unspecified');
  const level = arg('level', 'A1');
  const job = arg('job', 'complete the board activity');
  const movable = arg('movable', 'the interactive pieces on this board');
  const changes = arg('changes', 'visible board state after learner action');
  const priorRaw = arg('prior', '');
  const priorSystemicFixes = priorRaw
    ? priorRaw.split('|').map((s) => s.trim()).filter(Boolean)
    : [];
  const notes = arg('notes', '');

  const packetDir = path.join(
    ROOT,
    'tmp',
    'manus-board-loops',
    boardType,
    `round-${padRound(round)}-${slug(topic)}`
  );
  fs.mkdirSync(packetDir, { recursive: true });

  const stagedName = `board-${boardType}.jpg`;
  const stagedPath = path.join(packetDir, stagedName);
  fs.copyFileSync(boardAbs, stagedPath);
  // Keep a durable compare copy outside the Manus packet naming.
  const archivePath = path.join(
    ROOT,
    'tmp',
    'manus-board-loops',
    boardType,
    `round-${padRound(round)}-${slug(topic)}.jpg`
  );
  fs.copyFileSync(boardAbs, archivePath);

  const brief = buildSingleBoardBrief({
    boardType,
    round,
    topic,
    level,
    job,
    movable,
    changes,
    priorSystemicFixes,
    notes,
  });

  const passoff = {
    title: `Single board · ${boardType} · R${round} · ${topic}`,
    level,
    duration: '30',
    knownIssues: [],
    justFixed: priorSystemicFixes,
    localChecks: [
      'single-board packet: exactly one JPG attached',
      'topic-rotated board-grammar loop',
    ],
    focus: [
      'SINGLE BOARD / BOARD-GRAMMAR REVIEW mode',
      'visual/product polish',
      'systemic vs instance-specific',
      'child engagement before teacher explains',
      'worksheet smell / action→payoff',
    ],
    notes: brief,
  };
  const passoffPath = path.join(packetDir, 'manus-passoff.json');
  fs.writeFileSync(passoffPath, JSON.stringify(passoff, null, 2));

  if (process.argv.includes('--dry-run') || arg('dry-run', '') === '1') {
    console.log(JSON.stringify({
      ok: true,
      dry_run: true,
      boardType,
      round,
      topic,
      level,
      packetDir: path.relative(ROOT, packetDir).replace(/\\/g, '/'),
      archive: path.relative(ROOT, archivePath).replace(/\\/g, '/'),
      board: stagedName,
      brief_chars: brief.length,
      key_present: !!(process.env.MANUS_API_KEY || '').trim(),
    }, null, 2));
    return;
  }

  const out = await runBoardReview({
    dir: packetDir,
    passOffFile: passoffPath,
    title: passoff.title,
    level,
    duration: '30',
    maxImages: 1,
    onTick: (t) => {
      if (t.phase === 'created') {
        console.log('CREATED', t.task_id, t.task_url || '');
      } else if (t.phase === 'attach') {
        console.log('ATTACH', t.filename, t.bytes);
      } else if (t.phase === 'poll' && t.agent_status) {
        process.stdout.write(`\rPOLL ${t.agent_status}   `);
      }
    },
  });
  process.stdout.write('\n');

  const resultPath = path.join(packetDir, 'manus-result.json');
  fs.writeFileSync(resultPath, JSON.stringify(out, null, 2));

  const logMd = path.join(ROOT, 'docs', 'manus-board-loops', `${boardType}.md`);
  fs.mkdirSync(path.dirname(logMd), { recursive: true });
  const review = out.review || {};
  const block = [
    '',
    `## Round ${round} — ${topic} (${level})`,
    '',
    `- BOARD_PATH: \`${path.relative(ROOT, archivePath).replace(/\\/g, '/')}\``,
    `- PACKET: \`${path.relative(ROOT, packetDir).replace(/\\/g, '/')}\``,
    `- TASK: ${out.task_url || out.task_id || 'n/a'}`,
    `- MANUS_VERDICT: ${review.verdict || 'n/a'}`,
    `- SCORE: ${review.score != null ? review.score : 'n/a'}`,
    `- POLISH (ppt_like_quality): ${review.scorecard && review.scorecard.ppt_like_quality != null ? review.scorecard.ppt_like_quality : 'n/a'}`,
    `- WEAKEST_LINK: ${review.weakest_link || 'n/a'}`,
    `- ESCALATION_HOMEWORK: ${review.escalation_homework || 'n/a'}`,
    `- STATUS: ${out.ok ? 'structured_ok' : 'needs_attention'}`,
    '',
    '### Blocking / next actions',
    ...(review.blocking_issues || []).map((s) => `- BLOCK: ${s}`),
    ...(review.next_actions || []).slice(0, 12).map((s) => `- ACTION: ${s}`),
    '',
  ].join('\n');
  if (!fs.existsSync(logMd)) {
    fs.writeFileSync(
      logMd,
      `# Manus board loop — \`${boardType}\`\n\nIndependent single-board optimization log.\n`
    );
  }
  fs.appendFileSync(logMd, block);

  console.log(JSON.stringify({
    ok: out.ok,
    boardType,
    round,
    topic,
    verdict: review.verdict || null,
    score: review.score != null ? review.score : null,
    polish: review.scorecard && review.scorecard.ppt_like_quality,
    task_url: out.task_url,
    result: path.relative(ROOT, resultPath).replace(/\\/g, '/'),
    log: path.relative(ROOT, logMd).replace(/\\/g, '/'),
    archive: path.relative(ROOT, archivePath).replace(/\\/g, '/'),
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
