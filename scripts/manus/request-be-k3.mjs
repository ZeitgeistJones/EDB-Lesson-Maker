/**
 * Board-enabling K3 — MULTI-VIEW environment sets (stockpile only).
 *
 * Same place × 4 coordinated viewpoints with INFORMATION ASYMMETRY
 * (not four cinematic angles):
 *   wide → doorway → window/partial → overhead/plan-ish
 *
 * Overlaps K1 locked identities (be-k1-* SAME locks). Prefer K1 geometry.
 *
 *   node scripts/manus/request-be-k3.mjs --wave=k3-01 --fire
 *   node scripts/manus/request-be-k3.mjs --wave=k3-01 --poll-only
 *   node scripts/manus/request-be-k3.mjs --next --fire
 *   node scripts/manus/request-be-k3.mjs --grade=k3-01:REG_A --notes="asymmetry holds"
 *   node scripts/manus/request-be-k3.mjs --doc-only
 *
 * Slot: 1 Manus in-flight for this stream.
 * Art: harvested/board-enabling/multi-view-environments/ (PNG — do NOT git-add).
 * Tracked: scripts/manus/request-be-k3.mjs, docs/board-enabling-k3.md, inventory-k3.json.
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
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/board-enabling/multi-view-environments';
export const TRACKED_DOC_REL = 'docs/board-enabling-k3.md';
export const INV_REL = path.join(STOCKPILE_REL, 'inventory-k3.json');
export const PREFIX = 'be-k3-';
export const K1_PREFIX = 'be-k1-';
export const BOARD = { width: 1280, height: 590 };

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.inv-k3.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const STAGE_LOCK = `EDB BOARD-ENABLING MULTI-VIEW — same place, four USEFUL viewpoints.

BOARD: panoramic ${BOARD.width}×${BOARD.height} landscape feel per CELL (LARGE cells on a 2×2 contact sheet).
Soft children's-book / ClassIn ESL house illustration. Empty of people and faces.
NO readable text, letters, numbers, logos, watermarks, flags, maps, seals.
quality: default ONLY. STOCKPILE ONLY — do not wire producer.`;

const FAMILY_RULE = `REGISTERED MULTI-VIEW RULE (hard):
- All FOUR cells are the SAME place / same world identity (furniture footprints, materials, color family, lighting mood).
- Views differ by CAMERA POSITION and WHAT THEY CAN SEE — not by inventing a new room.
- INFORMATION ASYMMETRY is mandatory: something visible in one cell is HIDDEN or only hinted in another.
- Do NOT produce four cinematic beauty angles of the same full reveal.
- Reading order L→R, T→B on ONE 2×2 sheet with LARGE cells:
  1 wide establishing | 2 doorway/entrance
  3 window/partial    | 4 overhead/plan-ish
- Open floor / play affordance where the viewpoint allows it.`;

const VIEWS = [
  { id: 'wide', label: 'wide establishing', hint: 'Full place overview from inside; establishes layout + focal props.' },
  { id: 'doorway', label: 'doorway / entrance', hint: 'From threshold looking in; framing hides side/back zones the wide shows.' },
  { id: 'window', label: 'window / partial', hint: 'Through glass or occluding frame; shows a slice, hides floor/side secrets.' },
  { id: 'overhead', label: 'overhead / plan-ish', hint: 'Top-down / plan-ish; reveals spatial relations and object positions other views obscure.' },
];

function v(familySlug, viewId, briefExtra) {
  const vw = VIEWS.find((x) => x.id === viewId);
  return {
    key: `${PREFIX}${familySlug}-${viewId}`,
    concept: `${familySlug}-${viewId}`,
    view: viewId,
    family_id: `${PREFIX}${familySlug}`,
    k1_family_id: `${K1_PREFIX}${familySlug}`,
    brief: briefExtra,
    view_label: vw.label,
  };
}

function familySheet(familySlug, title, sameLock, viewBriefs) {
  const cells = VIEWS.map((vw) =>
    v(familySlug, vw.id, `${sameLock} VIEW ${vw.label}: ${viewBriefs[vw.id]} (${vw.hint})`),
  );
  return {
    id: `S1-${familySlug}`,
    title,
    format: 'landscape-contact-2x2',
    cells,
  };
}

function wave(id, familySlug, title, sameLock, viewBriefs, opts = {}) {
  return {
    id,
    family_id: `${PREFIX}${familySlug}`,
    family_slug: familySlug,
    k1_family_id: `${K1_PREFIX}${familySlug}`,
    title,
    kind: 'multi-view',
    asymmetry: opts.asymmetry || '',
    reuse_note: opts.reuse_note || `overlap K1 ${K1_PREFIX}${familySlug}`,
    sheets: [familySheet(familySlug, title, sameLock, viewBriefs)],
  };
}

/** Locked place identities — mirror K1 SAME strings so streams agree. */
const SAME = {
  kitchen:
    'REGISTERED WORLD be-k3-kitchen ↔ be-k1-kitchen. SAME home kitchen: counters + fridge along back/side, stove silhouette at edge, open tile floor center. No people no brand labels no text.',
  bedroom:
    'REGISTERED WORLD be-k3-bedroom ↔ be-k1-bedroom. SAME kid bedroom: bed + nightstand along side wall, window/curtain at edge, open play floor center. No people no poster text.',
  living:
    'REGISTERED WORLD be-k3-living ↔ be-k1-living. SAME living room: sofa + TV stand along walls, lamp at edge, open rug floor center. No people no screen content no text.',
  cafe:
    'REGISTERED WORLD be-k3-cafe ↔ be-k1-cafe. SAME casual cafe: service counter at back, chairs/tables at EDGES, blank menu board silhouette, open floor center. Not a bakery civic stage. No people no logos.',
  shop:
    'REGISTERED WORLD be-k3-shop ↔ be-k1-shop. SAME small neighborhood shop: counter at back, shelves at sides, open floor center. Not supermarket wash. No people no logos.',
  library:
    'REGISTERED WORLD be-k3-library ↔ be-k1-library. SAME public library: shelves along walls, reading table at edge, open carpet floor center. No people no readable spines.',
  classroom:
    'REGISTERED WORLD be-k3-classroom ↔ be-k1-classroom. SAME elementary classroom: blank chalkboard + teacher desk along BACK wall, student desks pushed to SIDE walls, wide open floor center. No people no wall letters.',
  workshop:
    'REGISTERED WORLD be-k3-workshop ↔ be-k1-workshop. SAME home/school workshop: workbench along wall, lumber rack at edge, open floor center. No people no brand labels.',
  clinic:
    'REGISTERED WORLD be-k3-clinic ↔ be-k1-clinic. SAME clinic exam room: cabinet + exam bed along walls, open floor center. No people no logos.',
  bus:
    'REGISTERED WORLD be-k3-bus ↔ be-k1-bus. SAME glass/metal bus shelter, bench, blank timetable panel (ZERO letters), curb/street. Open curb/shelter floor. No people no logos.',
  platform:
    'REGISTERED WORLD be-k3-platform ↔ be-k1-platform. SAME train platform edge, canopy posts, bench, blank departure-board shape (ZERO letters/numbers). Open platform floor. No people no logos.',
  greenhouse:
    'REGISTERED WORLD be-k3-greenhouse ↔ be-k1-greenhouse. SAME glasshouse aisle, potting bench at edge, hose reel, roof vents. Open aisle center. No people no text.',
};

export const WAVES = {
  'k3-01': wave('k3-01', 'kitchen', 'BE-K3 kitchen multi-view 2×2', SAME.kitchen, {
    wide: 'standing inside — FULL kitchen: counters, stove edge, fridge, AND a tipped bowl + spill under the table that is clearly visible',
    doorway: 'from hallway door frame looking in — see counters/fridge; table BASE visible but spill UNDER table is HIDDEN by tabletop/door jamb',
    window: 'from outside through kitchen window — see sink wall + stove silhouette; floor spill and fridge side HIDDEN by sill/frame',
    overhead: 'plan-ish top-down — shows table footprint + spill blob position + fridge/stove layout that doorway/window cannot map',
  }, {
    asymmetry: 'spill under table: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-kitchen',
  }),

  'k3-02': wave('k3-02', 'bedroom', 'BE-K3 bedroom multi-view 2×2', SAME.bedroom, {
    wide: 'inside room — bed, nightstand, open floor, AND a gift box peeking from UNDER the bed (clearly readable)',
    doorway: 'from bedroom door — see bed + window wall; under-bed gift HIDDEN by bed skirt / door frame crop',
    window: 'through curtains from outside — see bed silhouette + lamp; floor toys and under-bed zone HIDDEN',
    overhead: 'plan-ish — bed rectangle + gift box under bed + nightstand positions revealed',
  }, {
    asymmetry: 'under-bed gift: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-bedroom',
  }),

  'k3-03': wave('k3-03', 'living', 'BE-K3 living multi-view 2×2', SAME.living, {
    wide: 'inside living room — sofa, TV stand, rug, AND a remote + snack plate on the FAR side table (clear)',
    doorway: 'from entry — sofa back faces you; side table with remote is HIDDEN behind sofa mass',
    window: 'through curtains — see sofa + lamp glow; side table contents HIDDEN by curtain edge',
    overhead: 'plan-ish — sofa/TV/side-table layout + remote plate location mapped',
  }, {
    asymmetry: 'side-table remote: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-living',
  }),

  'k3-04': wave('k3-04', 'cafe', 'BE-K3 cafe multi-view 2×2', SAME.cafe, {
    wide: 'inside cafe — counter, blank menu board, chairs at edges, AND a reserved card + cup on the RIGHT booth (clear)',
    doorway: 'from street door — see counter + open floor; RIGHT booth cup/card HIDDEN by door frame / left seating',
    window: 'from sidewalk through front window — counter glow visible; booth details and floor bag HIDDEN by window muntins',
    overhead: 'plan-ish — counter bar, booth U-shapes, cup/card seat position revealed',
  }, {
    asymmetry: 'right-booth cup: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-cafe',
  }),

  'k3-05': wave('k3-05', 'shop', 'BE-K3 shop multi-view 2×2', SAME.shop, {
    wide: 'inside shop — counter, side shelves, open floor, AND an open cash drawer with a coin tray visible behind counter',
    doorway: 'from shop entrance — shelves + counter front; cash drawer contents HIDDEN behind counter face',
    window: 'through storefront glass — shelf silhouettes; counter back / drawer HIDDEN',
    overhead: 'plan-ish — aisle + counter L + drawer niche position mapped',
  }, {
    asymmetry: 'open cash drawer: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-shop',
  }),

  'k3-06': wave('k3-06', 'library', 'BE-K3 library multi-view 2×2', SAME.library, {
    wide: 'inside library — wall shelves, reading table, open carpet, AND a backpack left under the far table (clear)',
    doorway: 'from library doors — see first stack aisle; far-table backpack HIDDEN behind stacks',
    window: 'through tall window — reading lamp + shelf slice; under-table backpack HIDDEN by sill',
    overhead: 'plan-ish — stack rows + table rectangle + backpack under table mapped',
  }, {
    asymmetry: 'under-table backpack: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-library',
  }),

  'k3-07': wave('k3-07', 'classroom', 'BE-K3 classroom multi-view 2×2', SAME.classroom, {
    wide: 'inside classroom — blank board, teacher desk back, side desks, open floor, AND a forgotten lunchbox under a side desk',
    doorway: 'from hallway door — see board + open floor; under-desk lunchbox HIDDEN by desk mass / door crop',
    window: 'through classroom window — board wall slice; under-desk zone and door side HIDDEN',
    overhead: 'plan-ish — desk rows + teacher desk + lunchbox under specific desk mapped',
  }, {
    asymmetry: 'under-desk lunchbox: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-classroom',
  }),

  'k3-08': wave('k3-08', 'workshop', 'BE-K3 workshop multi-view 2×2', SAME.workshop, {
    wide: 'inside workshop — workbench, lumber rack, open floor, AND a sawhorse with a clamped board behind the rack (clear)',
    doorway: 'from shop door — workbench face; sawhorse/clamp zone HIDDEN behind lumber rack',
    window: 'through high workshop window — bench tools silhouette; floor clamp zone HIDDEN',
    overhead: 'plan-ish — bench, rack, sawhorse triangle mapped',
  }, {
    asymmetry: 'hidden sawhorse: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-workshop',
  }),

  'k3-09': wave('k3-09', 'clinic', 'BE-K3 clinic multi-view 2×2', SAME.clinic, {
    wide: 'inside exam room — cabinet, exam bed, open floor, AND a folder tray + cup on the FAR counter (clear)',
    doorway: 'from clinic door — bed + near cabinet; far counter tray HIDDEN by privacy curtain / door frame',
    window: 'through frosted/clear clinic window strip — bed silhouette; far counter details HIDDEN',
    overhead: 'plan-ish — bed, cabinet, far counter tray positions mapped',
  }, {
    asymmetry: 'far counter tray: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-clinic',
  }),

  'k3-10': wave('k3-10', 'bus', 'BE-K3 bus-shelter multi-view 2×2', SAME.bus, {
    wide: 'street view — full shelter, bench, blank timetable, curb, AND a dropped mitten under the bench (clear)',
    doorway: 'approaching from sidewalk as if entering shelter bay — bench front; mitten UNDER bench HIDDEN',
    window: 'through shelter glass from street — bench silhouette; under-bench mitten HIDDEN by seat/glass reflection band',
    overhead: 'plan-ish — shelter footprint, bench, curb, mitten under seat mapped',
  }, {
    asymmetry: 'mitten under bench: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-bus (street/shelter)',
  }),

  'k3-11': wave('k3-11', 'platform', 'BE-K3 platform multi-view 2×2', SAME.platform, {
    wide: 'along platform — canopy posts, bench, blank board shape, track edge, AND a suitcase left behind the far post (clear)',
    doorway: 'from station stairs/entrance looking onto platform — near canopy; far-post suitcase HIDDEN by perspective/post',
    window: 'from waiting-room window onto platform — bench + track; far suitcase HIDDEN by frame',
    overhead: 'plan-ish — platform strip, posts, bench, suitcase behind far post mapped',
  }, {
    asymmetry: 'far-post suitcase: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-platform (station)',
  }),

  'k3-12': wave('k3-12', 'greenhouse', 'BE-K3 greenhouse multi-view 2×2', SAME.greenhouse, {
    wide: 'inside glasshouse aisle — potting bench, hose reel, vents, open aisle, AND a watering can tipped behind the bench (clear)',
    doorway: 'from greenhouse door — aisle + plants at edges; tipped can behind bench HIDDEN',
    window: 'through glass wall from outside — aisle glow; behind-bench can HIDDEN by benches/glass mullions',
    overhead: 'plan-ish — aisle, bench, hose reel, tipped can behind bench mapped',
  }, {
    asymmetry: 'tipped can behind bench: visible wide+overhead; hidden doorway+window',
    reuse_note: 'overlap K1 be-k1-greenhouse (garden)',
  }),
};

export const WAVE_ORDER = Object.keys(WAVES);

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function isRateLimitError(err) {
  return /429/.test(String(err && err.message));
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    console.error(`429 — waiting ${RATE_WAIT_MS / 1000}s then one retry`);
    await new Promise((r) => setTimeout(r, RATE_WAIT_MS));
    try {
      return await fn();
    } catch (err2) {
      if (!isRateLimitError(err2)) throw err2;
      const wait2 = RATE_WAIT_MS * 2;
      console.error(`429 again — backing off ${wait2 / 1000}s`);
      await new Promise((r) => setTimeout(r, wait2));
      throw err2;
    }
  }
}

function walkRunJsons(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkRunJsons(p, acc);
    else if (ent.name === 'run.json') acc.push(p);
  }
  return acc;
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
  return `SHEET ${sheet.id} — ${sheet.title}
Format: ONE landscape PNG contact sheet, 2×2 grid, LARGE cells (each cell ~board stage, not icon).
Reading order L→R, T→B (wide | doorway / window | overhead):
${lines.join('\n')}`;
}

function buildBrief(wave) {
  return withEslAssetGeneratorBrief(`TASK: Produce **${wave.sheets.length}** landscape PNG contact sheet(s) for board-enabling K3 multi-view stockpile.

${STAGE_LOCK}

${FAMILY_RULE}

Family: ${wave.family_id} (K1 twin: ${wave.k1_family_id})
Asymmetry target: ${wave.asymmetry}
Reuse: ${wave.reuse_note}

HARD RULES:
- Generate ONLY the listed cells. No extra concepts.
- NO people, faces, animals as subjects.
- NO baked readable text.
- quality: default ONLY.
- Keep generating inside THIS task until every listed PNG exists.

${wave.sheets.map((sh) => sheetBlock(sh)).join('\n\n')}

Return exactly ${wave.sheets.length} PNG sheet(s).`);
}

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
    if (r2.status !== 0) throw new Error(`unzip failed ${zipPath}: ${r.stderr || r2.stderr}`);
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

function loadInv() {
  const invPath = path.join(ROOT, INV_REL);
  if (!fs.existsSync(invPath)) {
    return {
      kind: 'board-enabling-k3',
      prefix: PREFIX,
      views: VIEWS.map((v) => v.id),
      waves: {},
      families: {},
      running_total: {},
      secondary: { s1_cutaway: 'deferred', s2_time_era: 'deferred', note: 'only after critical K3 healthy' },
    };
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const fams = Object.values(inv.families || {});
  inv.running_total = {
    tasks: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    worlds_planned: WAVE_ORDER.length,
    worlds_fired: fams.filter((f) => f.manus_task_id).length,
    worlds_graded: fams.filter((f) => f.registration_grade && !['PENDING', 'FIRED'].includes(f.registration_grade)).length,
    reg_a: fams.filter((f) => f.registration_grade === 'REG_A').length,
    reg_b: fams.filter((f) => f.registration_grade === 'REG_B').length,
    reg_c: fams.filter((f) => f.registration_grade === 'REG_C').length,
    reg_fail: fams.filter((f) => f.registration_grade === 'REG_FAIL').length,
    view_cells: fams.reduce((n, f) => n + (f.siblings || []).length, 0),
  };
}

function writeInv(inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  if (!inv.families) inv.families = {};
  if (!inv.secondary) {
    inv.secondary = { s1_cutaway: 'deferred', s2_time_era: 'deferred', note: 'only after critical K3 healthy' };
  }
  recomputeTotals(inv);
  fs.mkdirSync(STOCKPILE, { recursive: true });
  fs.writeFileSync(path.join(ROOT, INV_REL), JSON.stringify(inv, null, 2));
  return path.join(ROOT, INV_REL);
}

function upsertInventory(wave, dump) {
  const inv = loadInv();
  const siblings = wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key));
  const haveLarge = (dump.saved || []).filter((x) => x.bytes > 80_000).length >= expectedSheets(wave);
  inv.waves[wave.id] = {
    family_id: wave.family_id,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    sheets: (dump.saved || []).map((x) => ({ file: x.file || path.basename(x.dest || ''), bytes: x.bytes, name: x.name || null })),
    finished_at: dump.finished_at || null,
    holds: dump.holds || [],
  };
  const prev = inv.families[wave.family_id] || {};
  inv.families[wave.family_id] = {
    family_id: wave.family_id,
    wave: wave.id,
    slug: wave.family_slug,
    k1_family_id: wave.k1_family_id,
    asymmetry: wave.asymmetry,
    reuse_note: wave.reuse_note,
    siblings,
    views: VIEWS.map((v) => v.id),
    registration_grade: prev.registration_grade || (haveLarge ? 'PENDING' : dump.task_id ? 'FIRED' : 'PENDING'),
    grade_notes: prev.grade_notes || '',
    manus_task_id: dump.task_id || prev.manus_task_id || null,
    task_url: dump.task_url || prev.task_url || null,
    sheet_dir: dump.sheet_dir || prev.sheet_dir || null,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
  };
  return writeInv(inv);
}

function writeDocStub(inv) {
  const tot = inv.running_total || {};
  const sec = inv.secondary || {};
  const lines = [
    '# Board-enabling K3 — multi-view environments',
    '',
    'Stockpile only. No producer wiring. Prefix `be-k3-`.',
    'Art partition: `harvested/board-enabling/multi-view-environments/` (PNG/JPG — **do not git-add**).',
    'Tracked: `scripts/manus/request-be-k3.mjs`, this doc, `inventory-k3.json`.',
    '',
    '## Four views (per world)',
    '',
    '1. wide establishing',
    '2. doorway / entrance',
    '3. window / partial occluded',
    '4. overhead / plan-ish',
    '',
    'Pedagogy: **information asymmetry** — one view hides what another reveals. Not four cinematic angles.',
    '',
    'Registration grades: `REG_A` / `REG_B` / `REG_C` / `REG_FAIL` (same-place lock + asymmetry).',
    '',
    '## K1 overlap',
    '',
    'All 12 worlds twin locked K1 identities (`be-k1-*`). Geometry briefs mirror K1 SAME locks.',
    '',
    '## Running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Worlds planned | ${tot.worlds_planned || WAVE_ORDER.length} |`,
    `| Tasks | ${tot.tasks || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Worlds graded | ${tot.worlds_graded || 0} |`,
    `| REG_A | ${tot.reg_a || 0} |`,
    `| REG_B | ${tot.reg_b || 0} |`,
    `| REG_C | ${tot.reg_c || 0} |`,
    `| REG_FAIL | ${tot.reg_fail || 0} |`,
    `| View cells | ${tot.view_cells || 0} |`,
    '',
    '## Secondary (runway only)',
    '',
    `- S1 registered cutaway layers: **${sec.s1_cutaway || 'deferred'}**`,
    `- S2 time-era same-place: **${sec.s2_time_era || 'deferred'}**`,
    `- Note: ${sec.note || 'only after critical K3 healthy'}`,
    '',
    '## Waves / worlds',
    '',
  ];
  for (const id of WAVE_ORDER) {
    const meta = WAVES[id];
    const fam = (inv.families || {})[meta.family_id];
    const w = (inv.waves || {})[id];
    const grade = (fam && fam.registration_grade) || 'unfired';
    const url = (w && w.task_url) || (fam && fam.task_url) || 'unfired';
    lines.push(
      `- **${id}** \`${meta.family_id}\` ↔ \`${meta.k1_family_id}\` — ${grade} — ${url} — ${meta.asymmetry}`,
    );
  }
  lines.push(
    '',
    '## QA notes',
    '',
    '- World is the job: same place identity across four views; asymmetry must read at a glance.',
    '- Prefer 2×2 contact sheet with LARGE cells.',
    '- Stream E: max 1 Manus in-flight under this partition.',
    '- Do not balloon into secondary S1/S2 until critical K3 is healthy and runway remains.',
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

function applyGrade(spec) {
  const [target, grade, ...rest] = String(spec).split(':');
  const notes = rest.join(':') || arg('notes', '');
  if (!target || !grade) throw new Error('Need --grade=waveOrFamily:REG_A|REG_B|REG_C|REG_FAIL');
  const ok = ['REG_A', 'REG_B', 'REG_C', 'REG_FAIL'];
  if (!ok.includes(grade)) throw new Error(`grade must be one of ${ok.join('|')}`);
  const inv = loadInv();
  let familyId = null;
  if (WAVES[target]) familyId = WAVES[target].family_id;
  else if ((inv.families || {})[target]) familyId = target;
  else if ((inv.families || {})[`${PREFIX}${target}`]) familyId = `${PREFIX}${target}`;
  else throw new Error(`Unknown grade target ${target}`);
  if (!inv.families[familyId]) {
    inv.families[familyId] = {
      family_id: familyId,
      siblings: [],
      registration_grade: grade,
      grade_notes: notes,
    };
  } else {
    inv.families[familyId].registration_grade = grade;
    inv.families[familyId].grade_notes = notes;
  }
  writeInv(inv);
  writeDocStub(inv);
  return { family_id: familyId, registration_grade: grade, notes };
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
        k1_family_id: wave.k1_family_id,
        prefix: PREFIX,
        asymmetry: wave.asymmetry,
        reuse_note: wave.reuse_note,
        views: VIEWS.map((v) => v.id),
        siblings: wave.sheets.flatMap((sh) => sh.cells.map((c) => c.key)),
        expected_sheets: NEED_SHEETS,
        sheets: wave.sheets.map((sh) => ({
          id: sh.id,
          title: sh.title,
          format: sh.format,
          keys: sh.cells.map((c) => c.key),
        })),
      },
      null,
      2,
    ),
  );

  const dump = {
    started_at: new Date().toISOString(),
    kind: 'board-enabling-k3',
    wave: wave.id,
    family_id: wave.family_id,
    sheet_dir: SHEET_DIR,
    expected_sheets: NEED_SHEETS,
  };

  let taskId = arg('task');
  const BRIEF = buildBrief(wave);

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
    const created = await withRateBackoff(() =>
      createTask({
        title: wave.title,
        agent_profile: resolveAgentProfile(),
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        interactive_mode: false,
        message: BRIEF,
      }),
    );
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    dump.brief = BRIEF.slice(0, 2000);
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
    await withRateBackoff(() =>
      sendMessage(taskId, {
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        message: withEslAssetGeneratorBrief(
          `Continue THIS task. You returned ${large.length} usable PNG sheet(s); we need exactly ${NEED_SHEETS} sheet(s) listed in the original brief (one 2×2 multi-view sheet). Do not restart. Do not add text. Keep firing generate_image until the listed sheet exists.`,
        ),
      }),
    );
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
  console.log(
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
  );
  if (large.length < NEED_SHEETS) process.exitCode = 2;
  return dump;
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-be-k3.mjs');
if (isMain) {
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
