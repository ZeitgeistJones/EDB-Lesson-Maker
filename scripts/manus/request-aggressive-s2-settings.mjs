/**
 * Aggressive S2 EDB setting-drop harvest (second pack).
 *   node scripts/manus/request-aggressive-s2-settings.mjs --wave=space --fire
 *   node scripts/manus/request-aggressive-s2-settings.mjs --wave=space --poll-only
 *
 * Sheets: harvested/manus-aggressive-stockpile/s2-settings/<wave-id>/sheets/
 * Max 1 in-flight. No --all --fire. No PropBank wiring.
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  listMessages,
  latestAgentStatus,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';
import {
  STOCKPILE_REL,
  WAVES,
  WAVE_ORDER,
  BOARD,
  GROUND_Y_RANGE,
  resolveSetting,
  readS1FiringSlugs,
  writeTrackedDoc,
  PREFIX,
} from './aggressive-s2-settings-keys.mjs';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 55 * 60 * 1000;
const RATE_WAIT_MS = 90_000;
const NEED_SHEETS = 1;
const VARIANTS_ROOT = path.join(ROOT, 'harvested/manus-aggressive-stockpile/s2-variants');

const STYLE_LOCK = `EDB SETTING DROP — quiet lesson-stage environment (${BOARD.width}×${BOARD.height}):

WHAT WE WANT:
- Recognizable place with walls/floor/sky; furniture silhouettes at EDGES only
- Open center floor band (horizontal ~20%–80%, lower third) for dragging props
- Clear ground plane (groundY ${GROUND_Y_RANGE} px)
- Soft children's-book illustration — quiet stage, not cinematic, not photoreal
- Generic empty setting — no story plot

HARD FAIL:
- Abstract quiet-flat wash + tiny corner glyph only (bg-theme-sets anti-room flats)
- Furnished room with a cleared desk strip (busy interior as the hero)
- Decorative scenic poster / no usable floor
- People, faces, animals, readable text, letters, numbers, logos, key labels
- Black-field prop cutouts
- Cinematic movie stills / busy mid-frame clutter

quality: default ONLY (never high).`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function is429(err) {
  return /failed \(429\)|rate.?limit|too many requests/i.test(String(err && err.message));
}

async function listMessagesBackoff(taskId, opts = {}) {
  let wait = RATE_WAIT_MS;
  try {
    return await listMessages(taskId, opts);
  } catch (err) {
    if (!is429(err)) throw err;
    console.log(JSON.stringify({ phase: 'rate-limit', wait_ms: wait, retry: 1 }, null, 2));
    await sleep(wait);
    try {
      return await listMessages(taskId, opts);
    } catch (err2) {
      if (!is429(err2)) throw err2;
      wait *= 2;
      console.log(JSON.stringify({ phase: 'rate-limit', wait_ms: wait, retry: 'backoff-stop' }, null, 2));
      await sleep(wait);
      throw err2;
    }
  }
}

async function pollGently(taskId) {
  const started = Date.now();
  let lastStatus = null;
  while (Date.now() - started < TIMEOUT_MS) {
    const page = await listMessagesBackoff(taskId, { order: 'desc', limit: 80, allowMissing: true });
    const messages = (page && page.messages) || [];
    const st = latestAgentStatus(messages);
    lastStatus = (st && st.agent_status) || lastStatus;
    console.log(JSON.stringify({ phase: 'tick', task_id: taskId, agent_status: lastStatus || 'unknown' }, null, 2));
    if (lastStatus === 'stopped' || lastStatus === 'error') {
      const asc = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
      return { agent_status: lastStatus, messages: (asc && asc.messages) || messages };
    }
    await sleep(POLL_MS);
  }
  const asc = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
  return { agent_status: lastStatus || 'timeout', messages: (asc && asc.messages) || [] };
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function buildBrief(setting) {
  const cells = setting.variants.map((v, i) => `${i + 1}. ${PREFIX}${v.slug} — ${v.brief}`);
  return withEslAssetGeneratorBrief(`TASK: Produce **1 contact sheet** of reusable ESL **EDB setting-drop** landscape backgrounds for ClassIn boards.

These are FULL-BLEED quiet lesson-stage environments (NOT black-field props, NOT vocab icons, NOT empty pastel washes).

${STYLE_LOCK}

HARD RULES:
- Sheet layout: **1×2 grid** (2 landscape panels side by side), left→right.
- Each cell = ONE ~16:9 landscape setting (~${BOARD.width}×${BOARD.height} feel) with empty interaction floor.
- Category: **${setting.category}** — both variants same place type.
- NO TEXT ON THE PNG: no words, letters, numbers, captions, legends, filenames, or key labels (never print ${PREFIX}* on the sheet). Keys are for you only.
- Deliver 1 PNG sheet. 5-image cap is per generate_image call — keep working in THIS task until the sheet exists.

${cells.join('\n')}

Return 1 PNG sheet. No essay.`);
}

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      if (url) hits.push({ url, name: a.file_name || a.filename || a.name || 'sheet.png' });
    }
  }
  return hits;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  for (const f of fs.readdirSync(sheetDir).filter((n) => /\.png$/i.test(n))) {
    fs.unlinkSync(path.join(sheetDir, f));
  }
  const seen = new Set();
  const saved = [];
  let i = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const dest = path.join(sheetDir, `${String(i).padStart(2, '0')}.png`);
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    saved.push({ dest, bytes: buf.length, name: img.name, file: path.basename(dest) });
  }
  return saved;
}

function liveRun(runPath) {
  if (!fs.existsSync(runPath)) return false;
  const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const st = String(prev.agent_status || '');
  return Boolean(prev.task_id) && st !== 'stopped' && st !== 'error';
}

function anyS2Inflight(exceptId) {
  const hits = [];
  for (const name of WAVE_ORDER) {
    const other = WAVES[name];
    if (!other || other.id === exceptId) continue;
    if (liveRun(path.join(STOCKPILE, other.id, 'run.json'))) hits.push(other.id);
  }
  if (fs.existsSync(VARIANTS_ROOT)) {
    for (const name of fs.readdirSync(VARIANTS_ROOT)) {
      const p = path.join(VARIANTS_ROOT, name, 'run.json');
      if (liveRun(p)) hits.push(`variants/${name}`);
    }
  }
  return hits;
}

async function withInvLock(fn) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  for (let i = 0; i < 80; i += 1) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      break;
    } catch {
      await sleep(80);
    }
    if (i === 79) fs.rmSync(LOCK, { force: true });
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

function loadInv() {
  const invPath = path.join(STOCKPILE, 'inventory.json');
  if (!fs.existsSync(invPath)) {
    const empty = { spec: 'aggressive-s2-settings', updated_at: new Date().toISOString(), waves: {} };
    fs.writeFileSync(invPath, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function upsertInventory(wave, setting, dump) {
  const inv = loadInv();
  if (!inv.waves) inv.waves = {};
  inv.waves[wave.id] = {
    kind: 'edb-setting-drop',
    setting: setting.slug,
    category: setting.category,
    title: setting.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    qa_status: dump.qa_status || null,
    variant_count: setting.variants.length,
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    finished_at: dump.finished_at || null,
  };
  inv.updated_at = new Date().toISOString();
  const invPath = path.join(STOCKPILE, 'inventory.json');
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  writeTrackedDoc(inv);
  return invPath;
}

async function runWave(waveKey) {
  if (!waveKey) throw new Error('Need --wave=space|volcano|…');
  const { wave, setting } = resolveSetting(waveKey);
  const s1 = readS1FiringSlugs();
  if (s1.has(setting.slug)) {
    console.error(JSON.stringify({ phase: 'refuse-new-fire', reason: 's1-already-firing', slug: setting.slug }));
    process.exit(2);
  }
  const OUT_DIR = path.join(STOCKPILE, wave.id);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const KEYS_JSON = path.join(OUT_DIR, 'keys.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
  const pollOnly = process.argv.includes('--poll-only');
  const BRIEF = buildBrief(setting);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    KEYS_JSON,
    JSON.stringify({ wave: wave.id, setting: setting.slug, category: setting.category, variants: setting.variants }, null, 2),
  );

  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'aggressive-s2-settings',
    wave: wave.id,
    setting: setting.slug,
    sheet_dir: SHEET_DIR,
    variant_count: setting.variants.length,
    expected_sheets: NEED_SHEETS,
  };

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exit(2);
      }
    }
    const inflight = anyS2Inflight(wave.id);
    if (inflight.length) {
      console.error(JSON.stringify({ phase: 'refuse-new-fire', reason: 'max-1-inflight', others: inflight }));
      process.exit(2);
    }
    const created = await createTask({
      title: setting.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: BRIEF,
    });
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, setting, dump));
    console.log(JSON.stringify({
      phase: 'created',
      task_id: taskId,
      task_url: dump.task_url,
      wave: wave.id,
      setting: setting.slug,
      expected_sheets: NEED_SHEETS,
    }, null, 2));
    if (fireOnly) return;
  } else {
    if (!taskId && fs.existsSync(RUN_JSON)) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      taskId = prev.task_id;
      dump.started_at = prev.started_at || dump.started_at;
      dump.task_url = prev.task_url;
    }
    if (!taskId) throw new Error('--poll-only needs --task= or an existing run.json');
    dump.task_id = taskId;
    dump.task_url = dump.task_url || `https://manus.im/app/${taskId}`;
  }

  const result = await pollGently(taskId);
  const saved = await downloadSheets(result.messages || [], SHEET_DIR);
  const large = saved.filter((s) => s.bytes > 80_000);
  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at || dump.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, setting, dump));
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    setting: setting.slug,
    task_id: taskId,
    task_url: dump.task_url,
    count: saved.length,
    large: large.length,
    sheet_dir: SHEET_DIR,
    inventory: invPath,
  }, null, 2));
  if (large.length < NEED_SHEETS) process.exit(2);
}

apiKey();
if (process.argv.includes('--all') && (process.argv.includes('--fire') || process.argv.includes('--create-only'))) {
  console.error('REFUSING --all --fire (rate-limit: max 1 in-flight)');
  process.exit(2);
}
await runWave(arg('wave', ''));
