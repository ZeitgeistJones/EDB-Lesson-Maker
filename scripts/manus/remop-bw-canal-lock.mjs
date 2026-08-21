/**
 * One-shot remop for canal-lock white-field / projection drift.
 * node scripts/manus/remop-bw-canal-lock.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  sendMessage,
  pollUntilDone,
  listMessages,
  MANUS_SKILLS,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

const TASK_ID = 'gEBkuSQLdPBep3wcQXDmw6';
const SHEET_DIR = path.join(ROOT, 'harvested/builder-worlds/canal-lock/sheets');
const RUN_JSON = path.join(ROOT, 'harvested/builder-worlds/canal-lock/run.json');

function collectImageAtts(messages) {
  const hits = [];
  for (const m of messages || []) {
    const b = m.assistant_message || (m.type === 'assistant_message' ? m : null);
    if (!b) continue;
    for (const a of b.attachments || []) {
      const url = a.url || a.download_url || a.file_url;
      const name = a.file_name || a.filename || a.name || 'sheet.png';
      const mime = String(a.mime_type || a.content_type || '');
      if (url && (/png|jpeg|jpg|webp|zip/i.test(mime) || /\.(png|jpe?g|webp|zip)$/i.test(name) || !mime)) {
        hits.push({ name, url, mime });
      }
    }
  }
  return hits;
}

function sniffKind(buf, name) {
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (/\.zip$/i.test(name)) return 'zip';
  if (/\.jpe?g$/i.test(name)) return 'jpg';
  return 'png';
}

function safeName(name, fallback) {
  const base = path.basename(String(name || fallback)).replace(/[^\w.\-]+/g, '_');
  return base || fallback;
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const r = spawnSync('tar', ['-xf', zipPath, '-C', destDir], { encoding: 'utf8' });
  if (r.status !== 0) {
    const r2 = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`],
      { encoding: 'utf8' },
    );
    if (r2.status !== 0) throw new Error(`unzip failed ${zipPath}`);
  }
}

function walkPngs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPngs(p, acc);
    else if (/\.(png|jpe?g|webp)$/i.test(ent.name)) acc.push(p);
  }
  return acc;
}

async function downloadSheets(messages, sheetDir) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const rawDir = path.join(sheetDir, 'raw-remop');
  const unzipRoot = path.join(sheetDir, 'zip-extract-remop');
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
    if (!res.ok) throw new Error(`download ${res.status}`);
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
  const byName = new Map();
  for (const p of [...walkPngs(unzipRoot), ...walkPngs(rawDir)]) {
    const key = path.basename(p).toLowerCase();
    if (!byName.has(key)) byName.set(key, p);
  }
  const sorted = [...byName.values()].sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'en'));
  // Keep 01.png base; overwrite 02-04 with newest remop if we got 3+
  const remopDir = path.join(sheetDir, 'remop');
  fs.mkdirSync(remopDir, { recursive: true });
  const saved = [];
  sorted.forEach((src, idx) => {
    const file = `${String(idx + 1).padStart(2, '0')}.png`;
    const dest = path.join(remopDir, file);
    fs.copyFileSync(src, dest);
    saved.push({ file, bytes: fs.statSync(dest).size, name: path.basename(src) });
  });
  // If remop produced exactly 3 sheets, map to 02-04 keeping base 01
  if (saved.filter((s) => s.bytes > 80_000).length >= 3 && fs.existsSync(path.join(sheetDir, '01.png'))) {
    const large = saved.filter((s) => s.bytes > 80_000).slice(-3);
    large.forEach((s, i) => {
      const dest = path.join(sheetDir, `${String(i + 2).padStart(2, '0')}.png`);
      fs.copyFileSync(path.join(remopDir, s.file), dest);
    });
  } else {
    // Full replace numbered sheets from remop dump
    for (const f of fs.readdirSync(sheetDir)) {
      if (/^\d{2}\.(png|jpg|jpeg|webp)$/i.test(f)) fs.unlinkSync(path.join(sheetDir, f));
    }
    saved.forEach((s, i) => {
      const dest = path.join(sheetDir, `${String(i + 1).padStart(2, '0')}.png`);
      fs.copyFileSync(path.join(remopDir, s.file), dest);
    });
  }
  return saved;
}

apiKey();
const brief = withEslAssetGeneratorBrief(`REMOP for THIS task only — regenerate sheets S2, S3, S4 (keep S1 base if already good).

CRITICAL FIXES:
1. BLACK FIELD: every contact sheet cell must be pure #000000 black edge-to-edge. NO white cards, white panels, white rounded rectangles, grey plates, or cream gutters filling cells.
2. PROJECTION LOCK: match the S1 base — TOP-DOWN / plan orthographic play-world (NOT isometric 3/4). Same camera as the corridor base.
3. BOARD-SCALE modules/tokens/problems on black. No tiny fasteners. No text.

Regenerate:
- S2: 3x3 modules+connectors (chambers, gates open/closed, gate-pocket, towpath, ladder, water-high, water-low) on pure black
- S3: 3x3 tokens (narrowboat, small-boat, barge, rope, life-ring, bollard, crate, duck, fish-splash) on pure black
- S4: 3x3 problems (gate-stuck, leak-spray, debris-log, rope-tangle, low-water-mud, missing-gate, overflow-foam, crack-wall, repair-patch) on pure black

Return exactly 3 new PNGs (S2 S3 S4). quality: default ONLY.`);

await sendMessage(TASK_ID, {
  force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
  message: brief,
});
console.log(JSON.stringify({ phase: 'remop-sent', task_id: TASK_ID }, null, 2));

const result = await pollUntilDone(TASK_ID, {
  intervalMs: 30_000,
  timeoutMs: 70 * 60 * 1000,
  onTick: ({ agent_status }) => {
    console.log(JSON.stringify({ phase: 'tick', task_id: TASK_ID, agent_status: agent_status || 'unknown' }));
  },
});
const msgs = await listMessages(TASK_ID, { order: 'asc', limit: 120 });
const saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
const large = saved.filter((x) => x.bytes > 80_000);
const dump = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8').replace(/^\uFEFF/, ''));
dump.remop_at = new Date().toISOString();
dump.remop_saved = saved;
dump.agent_status = result && result.agent_status;
fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
console.log(JSON.stringify({
  phase: 'remop-downloaded',
  task_id: TASK_ID,
  count: saved.length,
  large: large.length,
  sheet_dir: SHEET_DIR,
}, null, 2));
