/**
 * Manus commission for vocab-image-audit no-exact-key gaps (44 concepts).
 * No re-filter. Exact-dedupe once before send. White 3×3. One Perfect-5 task.
 *
 *   node scripts/manus/request-vocab-audit-no-exact-key.mjs           # dry-run
 *   node scripts/manus/request-vocab-audit-no-exact-key.mjs --send
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  createTask,
  listMessages,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';
import { normalize, slug, verifiedPackHit } from '../lib/pack-exact-match.mjs';

const SEND = process.argv.includes('--send');
const DRY = !SEND || process.argv.includes('--dry-run');
const POLL = process.argv.includes('--poll-import');

const QUEUE = path.join(ROOT, 'tmp/vocab-image-audit/no-exact-key-manus-ready.txt');
const INDEX_PATH = path.join(ROOT, 'public/assets/07_vocab-pack/index.json');
const DICT_PATH = path.join(ROOT, 'scripts/data/esl-picturable-dictionary.json');
const OUT_ROOT = path.join(ROOT, 'tmp', 'manus-vocab-audit-no-exact-key');
const INBOX = path.join(ROOT, 'assets-inbox', 'manus-vocab-audit-no-exact-key');
const CELLS = 9;

function loadWhitelist() {
  if (!fs.existsSync(DICT_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')).canonicalWhitelist || {};
  } catch {
    return {};
  }
}

function loadAndDedupe() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const whitelist = loadWhitelist();
  const kept = [];
  const dropped = [];
  const seen = new Set();
  for (const line of fs.readFileSync(QUEUE, 'utf8').split(/\r?\n/)) {
    const w = normalize(line);
    if (!w) continue;
    const key = slug(w);
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = verifiedPackHit(index, w, whitelist);
    if (hit?.verified) {
      dropped.push({ word: w, key: hit.key });
      continue;
    }
    kept.push({ word: w, key, label: w });
  }
  return { kept, dropped };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildSheets(kept) {
  return chunk(kept, CELLS).map((cells, i) => ({
    id: `S${i + 1}`,
    theme: `audit-nokey-${String(i + 1).padStart(2, '0')}`,
    title: `AUDIT NOKEY ${i + 1}`,
    cells: cells.map((c) => [c.key, c.label, c.word]),
  }));
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map(([key, label], i) => `${i + 1}. ${key} — ${label}`);
  return `SHEET ${index} — ${sheet.title}:\n${lines.join('\n')}\nKeys: ${sheet.cells.map(([k]) => k).join(',')}`;
}

function buildBrief(sheets) {
  return withEslAssetGeneratorBrief(`TASK: White-background ESL vocab 3×3 still-life / clear picturable icon sheets. One concept per cell. Skip logos/text.

HARD STYLE: #FFFFFF; even 3×3; flat vector; ZERO text/logos/numbers; quality: default. Deliver ${sheets.length} PNGs.

Special: roller-coaster = amusement-park roller coaster ride (NOT a drink coaster). Phrasal verbs (dry-off, look-into, show-off, wash-up) = clear kid-readable action stills.

Keep working until EVERY listed sheet PNG exists (Perfect-11 multi-call if needed).

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return ${sheets.length} PNGs + short legends. No essay.`);
}

function extractCdnUrls(messages) {
  const urls = [];
  const seen = new Set();
  const re = /https?:\/\/[^\s"'<>]+\.png/gi;
  for (const m of messages || []) {
    const blob = JSON.stringify(m);
    let hit;
    while ((hit = re.exec(blob))) {
      const u = hit[0].replace(/[),.;]+$/, '');
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

async function downloadPngs(taskId, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const page = await listMessages(taskId, { order: 'asc', limit: 120, allowMissing: true });
  const msgs = page?.data || page?.messages || page || [];
  const list = Array.isArray(msgs) ? msgs : [];
  const urls = extractCdnUrls(list);
  const saved = [];
  let i = 0;
  for (const url of urls) {
    i += 1;
    const dest = path.join(outDir, `cdn-${String(i).padStart(2, '0')}.png`);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) continue;
      fs.writeFileSync(dest, buf);
      saved.push(dest);
    } catch {
      /* skip */
    }
  }
  return { saved, urls: urls.length, status: list.map((m) => m.agent_status || m.status).filter(Boolean).slice(-3) };
}

function importSheets(sheets, inboxDir) {
  const pngs = fs
    .readdirSync(inboxDir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(inboxDir, f));
  if (!pngs.length) throw new Error(`No PNGs in ${inboxDir}`);

  // Match by order when filenames are opaque CDN names — plan order is commission order.
  const results = [];
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const png = pngs[i];
    if (!png) {
      results.push({ sheet: sheet.id, ok: false, error: 'missing png' });
      continue;
    }
    const names = sheet.cells.map((c) => c[0]).join(',');
    const r = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'scripts/import-vocab-sheet.mjs'),
        png,
        '--sheet',
        '--grid=3x3',
        `--names=${names}`,
        '--white-min=200',
        '--white-chroma=32',
        '--gutter-inset=8',
      ],
      { cwd: ROOT, encoding: 'utf8' }
    );
    results.push({
      sheet: sheet.id,
      theme: sheet.theme,
      png: path.basename(png),
      status: r.status,
      out: (r.stdout || '').slice(-400),
      err: (r.stderr || '').slice(-400),
    });
  }
  return results;
}

async function main() {
  const { kept, dropped } = loadAndDedupe();
  const sheets = buildSheets(kept);
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const plan = {
    generatedAt: new Date().toISOString(),
    queue: QUEUE,
    kept: kept.length,
    dropped,
    sheets: sheets.map((s) => ({
      id: s.id,
      theme: s.theme,
      keys: s.cells.map((c) => c[0]),
    })),
  };
  fs.writeFileSync(path.join(OUT_ROOT, 'plan.json'), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(OUT_ROOT, 'all-keys.txt'), kept.map((k) => k.key).join('\n') + '\n');

  console.log(JSON.stringify({ phase: 'planned', kept: kept.length, dropped: dropped.length, sheets: sheets.length }, null, 2));

  const runJson = path.join(OUT_ROOT, 'task1', 'run.json');
  fs.mkdirSync(path.dirname(runJson), { recursive: true });

  if (POLL) {
    if (!fs.existsSync(runJson)) throw new Error('No run.json — send first');
    const prev = JSON.parse(fs.readFileSync(runJson, 'utf8'));
    const taskId = prev.task_id;
    if (!taskId) throw new Error('No task_id');
    fs.mkdirSync(INBOX, { recursive: true });
    const dl = await downloadPngs(taskId, INBOX);
    console.log(JSON.stringify({ phase: 'downloaded', ...dl, files: dl.saved.length }, null, 2));
    const sheetsPlan = (prev.sheets || plan.sheets).map((s) => ({
      id: s.id,
      theme: s.theme,
      cells: (s.keys || []).map((k) => [k, k, k]),
    }));
    // rebuild cells from plan.json if needed
    const fullSheets = sheets.length ? sheets : sheetsPlan;
    const imported = importSheets(fullSheets, INBOX);
    fs.writeFileSync(path.join(OUT_ROOT, 'import-results.json'), JSON.stringify(imported, null, 2));
    console.log(JSON.stringify({ phase: 'imported', results: imported.map((r) => ({ sheet: r.sheet, status: r.status })) }, null, 2));
    return;
  }

  if (fs.existsSync(runJson) && SEND && !process.env.MANUS_FORCE_RERUN) {
    const prev = JSON.parse(fs.readFileSync(runJson, 'utf8'));
    if (prev.task_id) {
      console.error('REFUSING already sent', prev.task_id);
      process.exit(2);
    }
  }

  const brief = buildBrief(sheets);
  const profile = resolveAgentProfile();
  const force = [MANUS_SKILLS.ESL_ASSET_GENERATOR];
  const dumpBase = {
    started_at: new Date().toISOString(),
    agent_profile: profile,
    force_skills: force,
    quality: 'default',
    kind: 'vocab-audit-no-exact-key',
    sheet_count: sheets.length,
    keys: kept.map((k) => k.key),
    sheets: sheets.map((s) => ({
      id: s.id,
      theme: s.theme,
      keys: s.cells.map((c) => c[0]),
    })),
    dropped,
  };

  if (DRY) {
    fs.writeFileSync(runJson, JSON.stringify({ ...dumpBase, dry_run: true, brief }, null, 2));
    console.log(JSON.stringify({ phase: 'dry-run', sheets: sheets.length, keys: kept.length }));
    return;
  }

  apiKey();
  const created = await createTask({
    title: `ESL white vocab 3×3: audit no-exact-key gaps (${sheets.length} sheets, ${kept.length} keys)`,
    message: brief,
    agent_profile: profile,
    force_skills: force,
    hide_in_task_list: false,
    interactive_mode: false,
  });
  const taskId = created.task_id || created.id || null;
  const taskUrl = created.task_url || (taskId ? `https://manus.im/app/${taskId}` : null);
  fs.writeFileSync(
    runJson,
    JSON.stringify({ ...dumpBase, task_id: taskId, task_url: taskUrl, created }, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_ROOT, 'send-summary.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), task_id: taskId, task_url: taskUrl, keys: kept.length }, null, 2)
  );
  console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: taskUrl, keys: kept.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
