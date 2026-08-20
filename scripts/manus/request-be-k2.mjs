/**
 * Board-enabling K2 — Mia/Leo EPISTEMIC / who-knows-what poses (stockpile only).
 *
 * Audit first: skip ordinary emotions/actions already deep in s4-mia-leo + PropBank cast plates.
 * Fill knowledge-state singles (~60 max) + two-shots where relative eyeline matters (~12–15).
 *
 *   node scripts/manus/request-be-k2.mjs --audit-only
 *   node scripts/manus/request-be-k2.mjs --wave=k2-mia --fire
 *   node scripts/manus/request-be-k2.mjs --wave=k2-mia --poll-only
 *   node scripts/manus/request-be-k2.mjs --next --fire
 *   node scripts/manus/request-be-k2.mjs --grade=be-epi-2shot-mia-knows-leo-unaware:REG_A --notes="eyelines lock"
 *   node scripts/manus/request-be-k2.mjs --doc-only
 *
 * Slot: 1 of 4 global Manus (this stream max 1 in-flight under epistemic-character-poses/).
 * Art: harvested/board-enabling/epistemic-character-poses/ (PNG — do NOT git-add).
 * Tracked: scripts/manus/request-be-k2.mjs, docs/board-enabling-k2.md, inventory-k2.json.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  fileContentPart,
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/board-enabling/epistemic-character-poses';
export const TRACKED_DOC_REL = 'docs/board-enabling-k2.md';
export const INV_REL = path.join(STOCKPILE_REL, 'inventory-k2.json');
export const PREFIX = 'be-epi-';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv-k2.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;
const REF_MIA = path.join(ROOT, 'public/assets/09_props/img/cast-mia-idle-happy.png');
const REF_LEO = path.join(ROOT, 'public/assets/09_props/img/cast-leo-idle-happy.png');

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration matching the attached Mia/Leo idle plates. Same line weight, palette, and padding across every sheet. No photorealism, no glossy 3D, no sticker-pack chaos.
TEXT LOCK: BLANK / text-free only. Do NOT bake English words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text, or fake readable text.
BLACK FIELD LOCK: every contact sheet is pure #000000 black edge-to-edge with clear gutters. One concept per cell. Nothing crosses cell boundaries. Empty unused cells stay pure black.
STOCKPILE LOCK: raw Manus sheets only. Do not wire, import to PropBank, modify renderer, or broaden this list.
QUALITY: default only.`;

const IDENTITY = `IDENTITY LOCK (mandatory): MIA = attached cast-mia-idle-happy.png — shoulder-length wavy brown hair, pink flower headband, yellow tee, blue denim overall dress, pink sneakers. LEO = attached cast-leo-idle-happy.png — messy dark-brown hair, blue tee with chest pocket, tan cargo shorts, blue sneakers. Keep face, hair, and outfit locked. Do not invent a third named child.
PEOPLE BLACK-FIELD FAILURE LOCK: The FULL PNG and every cell background MUST be solid #000000 black edge-to-edge. Draw Mia/Leo directly on black. No white cards, white panels, white contact-sheet cells, grey rectangles, cream paper, or white gutters filling a cell. Thin dark gutters only. Keep the existing colored outfits (not all-white clothes).`;

/** Repo audit — ordinary banks are ALREADY_DEEP; epistemic/who-knows-what is the gap. */
export const POSE_AUDIT = [
  { bank: 'PropBank cast-mia/cast-leo (idle/hold/walk/talk/sit/listen/reach + action verbs)', class: 'ALREADY_DEEP', note: 'Ordinary emotions + locomotion/actions. Skip redraw.' },
  { bank: 'Aggressive S4 mia-leo-story (306 poses)', class: 'ALREADY_DEEP', note: 'Story actions: handover, pack, nod, clap, peek-door, hide-behind-object, whisper-send, shh, think, point*, beckon, wait, cover-eyes, etc. Skip.' },
  { bank: 'Horizontal H1 interaction poses', class: 'ALREADY_DEEP', note: 'Generic kids: kneel-pick-up, comfort, apologize, invite, wait-in-line, peer-check. Skip.' },
  { bank: 'S4 whisper / shh / cover-eyes / peek / hide-behind-object', class: 'PARTIAL', note: 'Sender whisper + quiet + peek exist; missing receive-whisper, note pass, behind-back hide, knowledge asymmetry.' },
  { bank: 'Mia/Leo coordinated TWO-SHOTS with locked relative eyeline', class: 'MISSING', note: 'No registered two-character knowledge scenes.' },
  { bank: 'Who-knows-what singles (realize, unaware, pretend, over-shoulder, secret containers…)', class: 'MISSING', note: 'This stockpile — epistemic gap fill only.' },
];

/** Gaps we explicitly skip (already covered). */
export const GAPS_SKIPPED = [
  'whisper-send (cast-*-whisper-happy)',
  'shh (cast-*-shh-happy)',
  'cover-own-eyes (cast-*-cover-eyes-happy)',
  'peek-door / hide-behind-object',
  'think / look-up / look-down / shrug / wink',
  'beckon / stop-palm / wait-standing',
  'point-object / point-self / point-you / nod / shake-head',
  'handover / high-five / give-adult',
  'ordinary jump/run/eat/drink/sit/walk/talk/listen/idle plates',
];

const EPISTEMIC_SINGLES = [
  ['realize', 'just learned / realization — brows up, soft gasp or bright eyes, body leans into discovery, NOT generic happy idle'],
  ['unaware', 'blankly UNAWARE — pleasant vacant focus forward, clearly not noticing anything off-panel'],
  ['look-away', 'deliberately LOOKS AWAY (head turned), avoiding seeing something off-panel'],
  ['missed-it', 'MISSED what happened — facing the WRONG direction while an event is implied off-panel'],
  ['whisper-receive', 'being WHISPERED TO — leans ear toward off-panel peer, listening; distinct from cast-*-whisper-happy sender'],
  ['pass-note', 'discreetly PASSES a folded BLANK note sideways toward off-panel peer'],
  ['receive-note', 'RECEIVES a folded BLANK note from off-panel peer'],
  ['hide-behind-back', 'HIDES a small object BEHIND THEIR BACK with both hands; distinct from cast-*-hide-behind-happy (behind furniture)'],
  ['hide-under-cover', 'HIDES a small object under a cloth/blanket fragment'],
  ['discover', 'DISCOVERS a hidden object (lifting cover / finding), surprised recognition'],
  ['read-private', 'reads a BLANK paper angled so the VIEWER cannot see the face of the page (private information)'],
  ['react-before', 'REACTS BEFORE an off-panel event — tense anticipation looking toward where something will happen'],
  ['react-after', 'REACTS AFTER an off-panel event — aftermath face/body (shock or relief), looking toward where it happened'],
  ['pretend-innocent', 'PRETENDING innocence — fake-casual whistle/look-at-ceiling while clearly hiding knowledge'],
  ['over-shoulder', 'checks OVER ONE SHOULDER (secret check), body mostly facing forward'],
  ['hold-box-closed', 'holds a CLOSED unlabeled box/jar carefully (secret container closed)'],
  ['hold-box-open', 'holds the SAME style box/jar OPEN (reveal state); pair with closed plate'],
  ['explain', 'EXPLAINING with open explanatory hand gestures toward off-panel peer'],
  ['listen-skeptical', 'listening SKEPTICALLY — eyebrow raise / slight lean back, not convinced'],
  ['listen-convinced', 'listening and becoming CONVINCED — softening into agreement / nod-ready'],
  ['decide-two', 'DECIDING between TWO unlabeled object fragments (eyes/hands choosing)'],
  ['refuse', 'firm REFUSE — palm out + head turn; distinct from casual cast-*-shake-head-happy'],
  ['agree-reluctant', 'RELUCTANT agreement — half-nod / hesitant thumbs-ish body language'],
  ['search-active', 'actively SEARCHING (scanning / looking under a small fragment); distinct from H1 search-under-table generic kids'],
  ['find-got-it', 'FINDING / got it — holds found unlabeled object with clear discovery triumph'],
  ['give-up', 'GIVING UP search — slumped shoulders, palms up empty'],
  ['knowing-smile', 'KNOWING smile / secret smile while glancing sideways (who-knows-what)'],
  ['gasp-mouth', 'hand covers mouth in startled JUST-LEARNED gasp'],
  ['sneak-tiptoe', 'sneaking on tip-toes (quiet approach / avoid being noticed)'],
  ['cup-hands-secret', 'cups hands around mouth for a barrier-style secret (not the same as whisper-send lean)'],
];

const TWO_SHOTS = [
  ['mia-knows-leo-unaware', 'MIA knows (knowing face) while LEO is clearly UNAWARE — relative eyelines must prove asymmetry'],
  ['leo-knows-mia-unaware', 'LEO knows while MIA is clearly UNAWARE — mirrored asymmetry, matched scale'],
  ['whisper-pair-mia-to-leo', 'MIA whispers into LEO\'s ear; Leo receives — one composed two-shot, matched eyeline'],
  ['secret-handoff', 'secret handoff behind backs / low between them — both kids, object mid-pass, eyelines careful'],
  ['mia-hides-leo-looks', 'MIA hides an object behind her back while LEO looks toward her suspiciously'],
  ['mia-looks-leo-away', 'MIA looks at something off-panel while LEO deliberately looks AWAY'],
  ['mia-explains-leo-doubts', 'MIA explains with gestures; LEO listens skeptically — locked relative eyeline'],
  ['mia-points-leo-follows', 'MIA points off-panel; LEO\'s gaze FOLLOWS the same off-panel target'],
  ['mia-discovers-leo-unaware', 'MIA discovers a hidden object; LEO remains unaware beside her'],
  ['mia-sees-clue-leo-misses', 'MIA sees a clue/object; LEO faces the wrong way and misses it'],
  ['barrier-cup-whisper', 'both kids cup-hands barrier whisper toward each other (no readable mouth shapes-as-letters)'],
  ['mia-hidden-card-leo-curious', 'MIA holds a BLANK card/paper hidden from Leo; LEO leans curious — information asymmetry'],
  ['leo-whisper-mia-receive', 'LEO whispers; MIA receives — mirror of mia-to-leo whisper pair'],
  ['share-secret-smile', 'both share a knowing secret smile looking the same off-panel way'],
  ['leo-hides-mia-searches', 'LEO hides an object behind his back; MIA searches / looks for it'],
];

function cell(who, slug, briefExtra) {
  const whoU = who.toUpperCase();
  return {
    key: `${PREFIX}${who}-${slug}`,
    concept: `${who}-${slug}`,
    kind: 'single',
    character: who,
    brief: `${whoU} — ${briefExtra}. Identity locked to attached ref. Pure #000000 black field. No text.`,
  };
}

function twoShot(slug, briefExtra) {
  return {
    key: `${PREFIX}2shot-${slug}`,
    concept: `2shot-${slug}`,
    kind: 'twoshot',
    character: 'mia+leo',
    brief: `TWO-SHOT (both MIA and LEO in ONE cell, drawn together — not pasted singles): ${briefExtra}. Matched scale, matched camera, RELATIVE EYELINE must read clearly. Identity locked. Pure #000000 black field. No text.`,
  };
}

function sh(id, title, format, cells) {
  return { id, title, format, cells };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function singlesSheets(who) {
  const cells = EPISTEMIC_SINGLES.map(([slug, brief]) => cell(who, slug, brief));
  const groups = chunk(cells, 9);
  return groups.map((g, i) => {
    const format = 'black-contact-3x3';
    const pad = [];
    // Keep exact keys; if <9, brief tells Manus unused cells stay black
    const title = `${who} epistemic ${i + 1}/${groups.length} (${g.length} cells)`;
    return sh(`S${i + 1}`, title, format, g);
  });
}

export const WAVES = {
  'k2-mia': {
    id: 'k2-mia',
    title: 'BE-K2 Mia epistemic who-knows-what singles',
    family_id: `${PREFIX}mia-singles`,
    kind: 'singles',
    character: 'mia',
    attachRefs: true,
    sheets: singlesSheets('mia'),
  },
  'k2-leo': {
    id: 'k2-leo',
    title: 'BE-K2 Leo epistemic who-knows-what singles',
    family_id: `${PREFIX}leo-singles`,
    kind: 'singles',
    character: 'leo',
    attachRefs: true,
    sheets: singlesSheets('leo'),
  },
  'k2-2shot': {
    id: 'k2-2shot',
    title: 'BE-K2 Mia+Leo epistemic TWO-SHOTS (relative eyeline)',
    family_id: `${PREFIX}twoshots`,
    kind: 'twoshots',
    character: 'mia+leo',
    attachRefs: true,
    sheets: (() => {
      const cells = TWO_SHOTS.map(([slug, brief]) => twoShot(slug, brief));
      const groups = chunk(cells, 9);
      return groups.map((g, i) =>
        sh(`S${i + 1}`, `epistemic two-shots ${i + 1}/${groups.length}`, 'black-contact-3x3', g),
      );
    })(),
  },
};

export const WAVE_ORDER = ['k2-mia', 'k2-leo', 'k2-2shot'];

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function walkRunJsons(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkRunJsons(p));
    else if (ent.name === 'run.json') out.push(p);
  }
  return out;
}

async function withRateBackoff(fn) {
  for (let i = 0; i < 8; i += 1) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      if (!/429|rate|capac/i.test(msg) || i === 7) throw err;
      console.log(JSON.stringify({ phase: 'rate-wait', attempt: i + 1, ms: RATE_WAIT_MS }));
      await new Promise((r) => setTimeout(r, RATE_WAIT_MS));
    }
  }
  return null;
}

function otherInFlight(thisWaveId) {
  for (const runPath of walkRunJsons(STOCKPILE)) {
    let prev;
    try {
      prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    } catch {
      continue;
    }
    if (prev.task_id && !prev.finished_at && prev.wave !== thisWaveId) {
      return { wave: prev.wave, task_id: prev.task_id };
    }
  }
  return null;
}

function waveOutDir(wave) {
  return path.join(STOCKPILE, wave.id);
}

function expectedSheets(wave) {
  return wave.sheets.length;
}

function sheetBlock(sheet) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`);
  const unused = sheet.format === 'black-contact-3x3' && sheet.cells.length < 9
    ? `\nUNUSED CELLS: any remaining cells after ${sheet.cells.length} stay pure #000000 black empty.`
    : '';
  return `SHEET ${sheet.id} — ${sheet.title}
Format: ${sheet.format} (reading order L→R, T→B)
${lines.join('\n')}${unused}`;
}

function buildBrief(wave) {
  const sheets = wave.sheets;
  const twoShotRule = wave.kind === 'twoshots'
    ? `TWO-SHOT RULE (hard): Each cell is ONE composed scene with BOTH Mia and Leo drawn together. Matched body scale, shared camera, correct RELATIVE EYELINE. Do NOT paste two separate cutouts with wrong eye contact or mismatched feet. The pedagogical value is their knowledge relationship.`
    : `SINGLE RULE: One character per cell (the named character only). Off-panel peers are implied by pose/gaze — do not invent a third named kid.`;

  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length}** black-field PNG contact sheet(s) for board-enabling K2 epistemic Mia/Leo poses.

${STYLE}

${IDENTITY}

${twoShotRule}

FAMILY: who-knows-what / information-state poses. NOT ordinary emotions. NOT redraw of cast-*-whisper-happy, shh, cover-eyes, peek-door, hide-behind-object, think, point, beckon, wait, handover.

Wave: ${wave.id} (${wave.family_id})
Character focus: ${wave.character}

HARD RULES:
- Generate ONLY the listed cells. No extra concepts.
- NO baked readable text.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists. The 5-image cap is per generate_image call, not per task.
- Accept soft-3D drift on faces; do NOT regenerate for flatness. DO regenerate if any cell sits on white/grey instead of #000000.

Attached refs: cast-mia-idle-happy.png + cast-leo-idle-happy.png — lock identity to these.

${sheets.map((sh) => sheetBlock(sh)).join('\n\n')}

Return exactly ${sheets.length} PNG sheet(s) (zip + CDN ok). No essay.`);
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

function sniffKind(buf, name = '') {
  const n = String(name).toLowerCase();
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (n.endsWith('.zip')) return 'zip';
  if (n.endsWith('.png')) return 'png';
  return 'other';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback).replace(/\\/g, '/'));
  return base.replace(/[^a-zA-Z0-9._-]+/g, '-') || fallback;
}

function walkPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPngs(p));
    else if (/\.png$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function extractZip(zipPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync('tar', ['-xf', zipPath, '-C', outDir], { encoding: 'utf8', windowsHide: true });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`],
    { encoding: 'utf8', windowsHide: true },
  );
  if (ps.status !== 0) {
    throw new Error(`Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`);
  }
}

function clearNumberedSheets(sheetDir) {
  if (!fs.existsSync(sheetDir)) return;
  for (const f of fs.readdirSync(sheetDir)) {
    if (/^\d{2}\.(png|jpg|jpeg|webp)$/i.test(f)) fs.unlinkSync(path.join(sheetDir, f));
  }
}

function materializePngs(sheetDir) {
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  const byName = new Map();
  for (const p of [...walkPngs(unzipRoot), ...walkPngs(rawDir)]) {
    const key = path.basename(p).toLowerCase();
    if (!byName.has(key)) byName.set(key, p);
  }
  const sorted = [...byName.values()].sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en'));
  clearNumberedSheets(sheetDir);
  const saved = [];
  sorted.forEach((src, i) => {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    const dest = path.join(sheetDir, file);
    fs.copyFileSync(src, dest);
    saved.push({ dest, bytes: fs.statSync(dest).size, name: path.basename(src), file });
  });
  return saved;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const rawDir = path.join(sheetDir, 'raw');
  const unzipRoot = path.join(sheetDir, 'zip-extract');
  fs.mkdirSync(rawDir, { recursive: true });
  if (fs.existsSync(unzipRoot)) fs.rmSync(unzipRoot, { recursive: true, force: true });
  fs.mkdirSync(unzipRoot, { recursive: true });
  const seen = new Set();
  let i = 0;
  let zipN = 0;
  for (const img of collectImageAtts(messages)) {
    if (!img.url || seen.has(img.url)) continue;
    seen.add(img.url);
    i += 1;
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`download ${res.status} ${img.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const kind = sniffKind(buf, img.name);
    const fallback = `${String(i).padStart(2, '0')}.${kind === 'zip' ? 'zip' : kind === 'jpg' ? 'jpg' : 'png'}`;
    const dest = path.join(rawDir, safeName(img.name, fallback));
    fs.writeFileSync(dest, buf);
    if (kind === 'zip') {
      zipN += 1;
      extractZip(dest, path.join(unzipRoot, `z${zipN}`));
    }
  }
  return materializePngs(sheetDir);
}

async function withInvLock(fn) {
  fs.mkdirSync(STOCKPILE, { recursive: true });
  for (let i = 0; i < 80; i += 1) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 80));
    }
    if (i === 79) fs.rmSync(LOCK, { force: true });
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

function emptyInv() {
  return {
    spec: 'board-enabling-k2',
    partition: STOCKPILE_REL,
    prefix: PREFIX,
    no_wiring: true,
    pose_audit: POSE_AUDIT,
    gaps_skipped: GAPS_SKIPPED,
    waves: {},
    items: {},
    running_total: {},
  };
}

function loadInv() {
  const invPath = path.join(ROOT, INV_REL);
  if (!fs.existsSync(invPath)) return emptyInv();
  try {
    return JSON.parse(fs.readFileSync(invPath, 'utf8'));
  } catch {
    return emptyInv();
  }
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = Object.values(inv.items || {});
  const singles = items.filter((it) => it.kind === 'single');
  const twoshots = items.filter((it) => it.kind === 'twoshot');
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    singles_planned: EPISTEMIC_SINGLES.length * 2,
    twoshots_planned: TWO_SHOTS.length,
    singles_harvested: singles.filter((it) => it.status === 'generated_raw').length,
    twoshots_harvested: twoshots.filter((it) => it.status === 'generated_raw').length,
    twoshots_graded: twoshots.filter((it) => it.registration_grade && !['PENDING', 'FIRED'].includes(it.registration_grade)).length,
    reg_a: twoshots.filter((it) => it.registration_grade === 'REG_A').length,
    reg_b: twoshots.filter((it) => it.registration_grade === 'REG_B').length,
    reg_c: twoshots.filter((it) => it.registration_grade === 'REG_C').length,
    reg_fail: twoshots.filter((it) => it.registration_grade === 'REG_FAIL').length,
    waves_planned: WAVE_ORDER.length,
  };
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  if (!inv.items) inv.items = {};
  inv.pose_audit = POSE_AUDIT;
  inv.gaps_skipped = GAPS_SKIPPED;
  recomputeTotals(inv);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(ROOT, INV_REL), JSON.stringify(inv, null, 2));
  // Tracked mirror under docs/ for git (no PNGs)
  const trackedMirror = path.join(ROOT, 'docs', 'board-enabling-k2-inventory.json');
  fs.writeFileSync(trackedMirror, JSON.stringify(inv, null, 2));
  return path.join(ROOT, INV_REL);
}

function upsertInventory(wave, dump) {
  const inv = loadInv();
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  const allCells = wave.sheets.flatMap((s) => s.cells);
  inv.waves[wave.id] = {
    family_id: wave.family_id,
    kind: wave.kind,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    concept_count: allCells.length,
    sheets: (dump.saved || []).map((x) => ({ file: x.file || path.basename(x.dest || ''), bytes: x.bytes, name: x.name || null })),
    finished_at: dump.finished_at || null,
    holds: dump.holds || [],
  };
  for (const cell of allCells) {
    const prev = inv.items[cell.key] || {};
    inv.items[cell.key] = {
      ...cell,
      status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
      registration_grade: cell.kind === 'twoshot'
        ? (prev.registration_grade && !['PENDING', 'FIRED'].includes(prev.registration_grade)
          ? prev.registration_grade
          : haveLarge ? 'PENDING' : dump.task_id ? 'FIRED' : 'PENDING')
        : null,
      grade_notes: prev.grade_notes || '',
      manus_task_id: dump.task_id || prev.manus_task_id || null,
      wave: wave.id,
      sheet_dir: dump.sheet_dir || prev.sheet_dir || null,
    };
  }
  return writeInv(inv);
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const lines = [
    '# Board-enabling K2 — Mia/Leo epistemic / knowledge poses',
    '',
    'Stockpile only. No producer wiring. Prefix `be-epi-`.',
    'Art partition: `harvested/board-enabling/epistemic-character-poses/` (PNG — **do not git-add**).',
    'Tracked: `scripts/manus/request-be-k2.mjs`, this doc, `docs/board-enabling-k2-inventory.json`.',
    '',
    '## Goal',
    '',
    'Poses that communicate **who knows what** — not ordinary emotions/actions.',
    `~${EPISTEMIC_SINGLES.length * 2} singles (Mia+Leo) + ~${TWO_SHOTS.length} two-shots with relative eyeline.`,
    '',
    'Two-shot registration grades: `REG_A` / `REG_B` / `REG_C` / `REG_FAIL` (matched scale + relative eyeline lock).',
    '',
    '## Pose bank audit',
    '',
    '| Bank | Class | Note |',
    '|---|---|---|',
  ];
  for (const row of POSE_AUDIT) {
    lines.push(`| ${row.bank} | ${row.class} | ${row.note} |`);
  }
  lines.push('', '## Gaps skipped (already deep)', '');
  for (const g of GAPS_SKIPPED) lines.push(`- ${g}`);
  lines.push(
    '',
    '## Running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Waves planned | ${tot.waves_planned || WAVE_ORDER.length} |`,
    `| Tasks | ${tot.tasks || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Singles planned | ${tot.singles_planned || EPISTEMIC_SINGLES.length * 2} |`,
    `| Singles harvested | ${tot.singles_harvested || 0} |`,
    `| Two-shots planned | ${tot.twoshots_planned || TWO_SHOTS.length} |`,
    `| Two-shots harvested | ${tot.twoshots_harvested || 0} |`,
    `| Two-shots graded | ${tot.twoshots_graded || 0} |`,
    `| REG_A | ${tot.reg_a || 0} |`,
    `| REG_B | ${tot.reg_b || 0} |`,
    `| REG_C | ${tot.reg_c || 0} |`,
    `| REG_FAIL | ${tot.reg_fail || 0} |`,
    '',
    '## Waves',
    '',
  );
  for (const id of WAVE_ORDER) {
    const meta = WAVES[id];
    const w = (inv.waves || {})[id];
    const status = w && w.finished_at ? 'downloaded' : w && w.task_id ? 'fired' : 'unfired';
    const url = (w && w.task_url) || 'unfired';
    const n = meta.sheets.reduce((a, s) => a + s.cells.length, 0);
    lines.push(`- **${id}** \`${meta.family_id}\` — ${status} — ${n} cells — ${url}`);
  }
  lines.push('', '## Two-shot REG grades', '');
  const twos = Object.values(inv.items || {}).filter((it) => it.kind === 'twoshot');
  if (!twos.length) {
    lines.push('_None graded yet._');
  } else {
    for (const it of twos.sort((a, b) => a.key.localeCompare(b.key))) {
      lines.push(`- \`${it.key}\` — ${it.registration_grade || 'PENDING'}${it.grade_notes ? ` — ${it.grade_notes}` : ''}`);
    }
  }
  lines.push(
    '',
    '## QA notes',
    '',
    '- Singles: identity lock + black field; epistemic readability over cute idle.',
    '- Two-shots: REG grades on relative eyeline + matched scale; REG_C/FAIL are not coordinated stock.',
    '- Stream B: max 1 Manus in-flight under this partition.',
    '',
  );
  fs.writeFileSync(path.join(ROOT, TRACKED_DOC_REL), `${lines.join('\n')}\n`);
}

function waveIsDone(wave) {
  const runPath = path.join(waveOutDir(wave), 'run.json');
  if (!fs.existsSync(runPath)) return false;
  try {
    const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const large = (prev.saved || []).filter((x) => x.bytes > 80_000).length;
    return Boolean(prev.finished_at && large >= expectedSheets(wave));
  } catch {
    return false;
  }
}

function nextWaveName() {
  return WAVE_ORDER.find((id) => !waveIsDone(WAVES[id])) || null;
}

async function buildMessageContent(wave) {
  const brief = buildBrief(wave);
  const content = [{ type: 'text', text: brief }];
  if (wave.attachRefs) {
    for (const abs of [REF_MIA, REF_LEO]) {
      if (!fs.existsSync(abs)) {
        console.error(`WARN missing ref ${abs}`);
        continue;
      }
      const part = await fileContentPart(abs);
      content.push({
        type: 'file',
        filename: part.filename,
        ...(part.file_data ? { file_data: part.file_data } : { file_id: part.file_id }),
      });
    }
  }
  return content;
}

function applyGrade(spec) {
  const [target, grade, ...rest] = String(spec).split(':');
  const notes = rest.join(':') || arg('notes', '');
  if (!target || !grade) throw new Error('Need --grade=be-epi-2shot-…:REG_A|REG_B|REG_C|REG_FAIL');
  const ok = ['REG_A', 'REG_B', 'REG_C', 'REG_FAIL'];
  if (!ok.includes(grade)) throw new Error(`grade must be one of ${ok.join('|')}`);
  const inv = loadInv();
  let key = target;
  if (!inv.items[key] && inv.items[`${PREFIX}${target}`]) key = `${PREFIX}${target}`;
  if (!inv.items[key]) {
    inv.items[key] = {
      key,
      kind: 'twoshot',
      registration_grade: grade,
      grade_notes: notes,
      status: 'graded_only',
    };
  } else {
    if (inv.items[key].kind && inv.items[key].kind !== 'twoshot') {
      throw new Error(`REG grades are for two-shots only; ${key} is ${inv.items[key].kind}`);
    }
    inv.items[key].registration_grade = grade;
    inv.items[key].grade_notes = notes;
  }
  writeInv(inv);
  writeDocStub(inv);
  return { key, registration_grade: grade, notes };
}

export async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  const OUT_DIR = waveOutDir(wave);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only');
  const pollOnly = process.argv.includes('--poll-only');
  const NEED_SHEETS = expectedSheets(wave);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        family_id: wave.family_id,
        prefix: PREFIX,
        kind: wave.kind,
        character: wave.character,
        concept_count: wave.sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        sheets: wave.sheets.map((s) => ({
          id: s.id,
          title: s.title,
          format: s.format,
          keys: s.cells.map((c) => c.key),
        })),
      },
      null,
      2,
    ),
  );

  const dump = {
    started_at: new Date().toISOString(),
    kind: 'board-enabling-k2',
    wave: wave.id,
    family_id: wave.family_id,
    sheet_dir: SHEET_DIR,
    expected_sheets: NEED_SHEETS,
  };

  let taskId = arg('task');

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exit(2);
      }
    }
    const busy = otherInFlight(wave.id);
    if (busy) {
      console.error(`REFUSING fire — max 1 in-flight. ${busy.wave} ${busy.task_id} still open`);
      process.exit(3);
    }
    const content = await buildMessageContent(wave);
    const created = await withRateBackoff(() => createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: { content },
    }));
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    dump.brief = typeof content[0].text === 'string' ? content[0].text.slice(0, 2000) : '';
    fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
    await withInvLock(() => {
      upsertInventory(wave, dump);
      writeDocStub(loadInv());
    });
    console.log(JSON.stringify({ phase: 'created', ...dump }, null, 2));
    if (fireOnly) return dump;
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

  const result = await pollUntilDone(taskId, {
    intervalMs: POLL_MS,
    timeoutMs: TIMEOUT_MS,
    onTick: ({ agent_status }) => {
      console.log(JSON.stringify({ phase: 'tick', task_id: taskId, agent_status: agent_status || 'unknown' }));
    },
  });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
  let large = saved.filter((x) => x.bytes > 80_000);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() => sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} black-field sheet(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
      ),
    }));
    const result2 = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || result2.messages || [], SHEET_DIR);
    large = saved.filter((x) => x.bytes > 80_000);
  }

  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (large.length < NEED_SHEETS) {
    dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNG sheets; raw kept for mop.`];
  }
  if (fs.existsSync(RUN_JSON)) {
    const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
    dump.started_at = prev.started_at || dump.started_at;
    dump.created_at = prev.created_at;
    dump.task_url = dump.task_url || prev.task_url;
    dump.brief = prev.brief;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => {
    const p = upsertInventory(wave, dump);
    writeDocStub(loadInv());
    return p;
  });
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    family_id: wave.family_id,
    task_id: taskId,
    task_url: dump.task_url,
    count: saved.length,
    large: large.length,
    expected_sheets: NEED_SHEETS,
    sheet_dir: SHEET_DIR,
    inventory: invPath,
  }, null, 2));
  if (large.length < NEED_SHEETS) process.exitCode = 2;
  return dump;
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-be-k2.mjs');
if (isMain) {
  if (process.argv.includes('--audit-only')) {
    const singles = EPISTEMIC_SINGLES.length * 2;
    const twos = TWO_SHOTS.length;
    console.log(JSON.stringify({
      phase: 'audit',
      pose_audit: POSE_AUDIT,
      gaps_skipped: GAPS_SKIPPED,
      singles_planned: singles,
      twoshots_planned: twos,
      waves: WAVE_ORDER,
      sheets_per_wave: Object.fromEntries(WAVE_ORDER.map((id) => [id, WAVES[id].sheets.length])),
    }, null, 2));
    process.exit(0);
  }
  if (process.argv.includes('--doc-only')) {
    const inv = loadInv();
    writeInv(inv);
    writeDocStub(inv);
    console.log(JSON.stringify({ phase: 'doc', path: TRACKED_DOC_REL, inventory: INV_REL }, null, 2));
    process.exit(0);
  }
  const gradeSpec = arg('grade', '');
  if (gradeSpec) {
    const g = applyGrade(gradeSpec);
    console.log(JSON.stringify({ phase: 'graded', ...g }, null, 2));
    process.exit(0);
  }
  apiKey();
  let names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.argv.includes('--next')) {
    const n = nextWaveName();
    if (!n) {
      console.log(JSON.stringify({ phase: 'all-done', waves: WAVE_ORDER.length }, null, 2));
      process.exit(0);
    }
    names = [n];
  }
  if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --next`);
  for (const n of names) {
    await runWave(n);
  }
}
