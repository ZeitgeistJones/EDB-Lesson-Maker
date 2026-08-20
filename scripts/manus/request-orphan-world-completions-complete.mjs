/**
 * Orphan overview world zoom completions — COMPLETE IMPLEMENTATION.
 * Generate 1-3 coordinated views per selected orphan to unlock continuity.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT,
  createTask,
  pollUntilDone,
  listMessages,
  MANUS_SKILLS,
  resolveAgentProfile,
  fileContentPart,
} from './client.mjs';

// Re-export constants from original file
export const HARVEST_REL = 'harvested/world-zoom-completions';
export const INV_REL = 'docs/world-zoom-completions-inventory.json';
export const BOARD = { width: 1280, height: 590 };
export const REPO_SOFT_CAP = 5;
export const REPO_HARD_CAP = 6;

const HARVEST_ROOT = path.join(ROOT, HARVEST_REL);
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, padding across all views. MUST match parent overview world style when completing an existing overview.
TEXT LOCK: BLANK / text-free. No English words, captions, labels, letters, numbers, logos, brands, UI chrome, fake readable screens, watermarks. Pictograms OK for directional/functional markers only.
IP LOCK: NO brands, NO licensed characters, NO social logos, NO Pokémon-like creatures, NO Disney-like characters.
AGE LOCK: Pre-A1→B2 age-respectful — modern places OK; not preschool-only baby towns.
CONTINUITY LOCK: When completing a family, all views must feel like the SAME PLACE with consistent world logic, color palette, architectural details.
STOCKPILE LOCK: raw Manus sheets only. Do not wire into lessons/producer.
QUALITY: default only unless specified.
SCALE: BOARD-SCALE for ~${BOARD.width}×${BOARD.height} ClassIn board with ample negative space for drag play.`;

function cell(concept, brief, parent_overview) {
  return {
    key: `${parent_overview}-${concept}`,
    concept,
    brief,
    parent_overview,
    format: 'single-view-zoom',
  };
}

function sheet(id, title, cells) {
  return { id, title, format: 'zoom-completion-sheet', cells };
}

function world(id, opts) {
  return {
    id,
    family_id: opts.family_id || id,
    title: opts.title,
    lane: 'world-zoom-completion',
    stockpile: 'world-zoom-completions',
    bucket: opts.bucket || 'completion',
    parent_overview: opts.parent_overview,
    priority: opts.priority,
    composite_score: opts.composite_score,
    min_views: opts.min_views,
    why: opts.why || '',
    sheets: opts.sheets,
  };
}

// BATCH 1: HIGH PRIORITY
const BATCH_1_HIGH = {
  'wz-treehouse-forest': world('wz-treehouse-forest', {
    parent_overview: 'ow-treehouse-forest',
    family_id: 'treehouse-zoom-family',
    priority: 'HIGH',
    composite_score: 76,
    min_views: 2,
    bucket: 'nature-adventure',
    title: 'Treehouse forest zoom completion (OVERVIEW→EXTERIOR→INTERIOR ×2)',
    why: 'Treehouse = top-tier kid destination. Multiple rooms/levels = natural zoom family.',
    sheets: [
      sheet('S1', 'treehouse exterior + interior (2 views)', [
        cell(
          'treehouse-exterior-approach',
          `${STYLE}

TREEHOUSE LADDER VIEW — mid-scale outdoor perspective looking up at wooden treehouse built in large sturdy tree. Rope ladder hanging down, platform edge visible, small window, branch supports. Ground/trunk base with path approach. Forest background softly visible. Open negative space for prop play. Warm natural wood tones. MUST feel like same world as parent overview ow-treehouse-forest.

Kids-first adventure destination. Safe magical hideaway. No people. No text words.`,
          'ow-treehouse-forest'
        ),
        cell(
          'treehouse-room-interior',
          `${STYLE}

TREEHOUSE ROOM INTERIOR — cozy wooden room inside treehouse. Window with leafy forest view, rope through floor hatch opening, small wooden table, cushion, storage box/chest. Warm wood plank walls. Intimate shelter space with play surface for hide/discover activities. MUST match parent overview world's style and tone.

Safe adventure shelter. Inviting kids-first interior. No people. No text words.`,
          'ow-treehouse-forest'
        ),
      ]),
    ],
  }),

  'wz-dino-dig-site': world('wz-dino-dig-site', {
    parent_overview: 'ow-dino-dig-site',
    family_id: 'dino-dig-zoom-family',
    priority: 'HIGH',
    composite_score: 76,
    min_views: 2,
    bucket: 'science-discovery',
    title: 'Dino dig site zoom completion (OVERVIEW→PIT→TENT ×2)',
    why: 'Dino = peak kid interest. Dig pit + fossil tent = rich discovery/archaeology play surfaces.',
    sheets: [
      sheet('S1', 'dig pit + fossil tent (2 views)', [
        cell(
          'dig-pit-excavation',
          `${STYLE}

DINO DIG PIT — mid-scale excavation pit with large fossil bones partially visible in layered dirt/rock. Excavation tools (brush, trowel, bucket) arranged nearby, grid string markers, working area. Desert/canyon rocky setting with dig zone. Play surface for discovery/archaeology drag activities. MUST match parent overview ow-dino-dig-site desert palette and style.

Science adventure destination. Fossil discovery surface. No people. No text words.`,
          'ow-dino-dig-site'
        ),
        cell(
          'fossil-tent-workstation',
          `${STYLE}

FOSSIL CLEANING TENT — interior canvas tent workspace with folding table, cleaned fossil specimens laid out, magnifying glass, soft brushes, field notebook (blank pages), labeled specimen boxes (pictogram labels only). Tent fabric walls, field lantern lighting, supply crates. Archaeology workstation play surface. MUST coordinate with parent overview world's scientific field site tone.

Discovery research station. Science workspace destination. No people. No text words.`,
          'ow-dino-dig-site'
        ),
      ]),
    ],
  }),

  'wz-aquarium-campus': world('wz-aquarium-campus', {
    parent_overview: 'ow-aquarium-campus',
    family_id: 'aquarium-zoom-family',
    priority: 'HIGH',
    composite_score: 77,
    min_views: 2,
    bucket: 'education-destination',
    title: 'Aquarium campus zoom completion (OVERVIEW→ENTRANCE→TUNNEL ×2)',
    why: 'Aquarium = high-value kid destination. Underwater viewing = massive play/story surface.',
    sheets: [
      sheet('S1', 'aquarium entrance + tunnel (2 views)', [
        cell(
          'aquarium-entrance-lobby',
          `${STYLE}

AQUARIUM ENTRANCE — mid-scale interior lobby/atrium with welcome desk, small display tank with colorful fish visible in background, coral reef exhibit nearby, directional arrow signs (pictogram icons only, no text), open floor space. Modern public building interior. Welcoming educational space. MUST match parent overview ow-aquarium-campus architectural style and color scheme.

Marine education gateway. Public destination entry. No people. No text words.`,
          'ow-aquarium-campus'
        ),
        cell(
          'underwater-viewing-tunnel',
          `${STYLE}

UNDERWATER VIEWING TUNNEL — dramatic curved transparent glass tunnel interior with ocean/reef visible through curved walls on both sides and overhead. Tropical fish, colorful coral formations, manta rays swimming past glass. Blue-green ambient underwater lighting. Walking path with clear viewing area. Rich marine life play surface with ClassIn negative space for interaction. MUST coordinate with parent overview's marine/ocean theme.

Immersive ocean experience. Peak aquarium destination surface. No people. No text words.`,
          'ow-aquarium-campus'
        ),
      ]),
    ],
  }),
};

// BATCH 2: MEDIUM_HIGH
const BATCH_2_MEDIUM_HIGH = {
  'wz-escape-room-plaza': world('wz-escape-room-plaza', {
    parent_overview: 'ow-escape-room-plaza',
    family_id: 'escape-room-zoom-family',
    priority: 'MEDIUM_HIGH',
    composite_score: 72,
    min_views: 1,
    bucket: 'puzzle-adventure',
    title: 'Escape room plaza zoom completion (OVERVIEW→CHAMBER ×1)',
    why: 'Escape room = natural puzzle/mystery play surface. Room with locked boxes, clues = peak ESL activity.',
    sheets: [
      sheet('S1', 'escape room interior', [
        cell(
          'escape-room-puzzle-chamber',
          `${STYLE}

ESCAPE ROOM INTERIOR — themed mystery puzzle chamber with locked wooden boxes, combination lock number pad (digits 0-9 visual only), hidden compartments in walls, clue bulletin board with pictogram symbols and maps (no text words), mysterious adventure props (old key, hourglass, compass). Moody atmospheric lighting with lantern or spotlight. Rich puzzle/mystery play surface with drag-and-drop potential. MUST feel connected to parent overview ow-escape-room-plaza's adventure plaza theme.

Problem-solving destination. Puzzle adventure surface. No people. No text words.`,
          'ow-escape-room-plaza'
        ),
      ]),
    ],
  }),

  'wz-climbing-gym-yard': world('wz-climbing-gym-yard', {
    parent_overview: 'ow-climbing-gym-yard',
    family_id: 'climbing-gym-zoom-family',
    priority: 'MEDIUM_HIGH',
    composite_score: 65,
    min_views: 1,
    bucket: 'sports-leisure',
    title: 'Climbing gym zoom completion (OVERVIEW→WALL ×1)',
    why: 'Climbing wall = unique physical activity surface. Indoor gym with holds/routes = strong play.',
    sheets: [
      sheet('S1', 'climbing wall interior', [
        cell(
          'climbing-wall-gym-interior',
          `${STYLE}

INDOOR CLIMBING WALL — interior gym space with tall colorful artificial climbing wall. Textured wall surface with numerous climbing holds in various bright colors (red, blue, yellow, green — use color coding for routes but NO text/numbers on holds). Thick safety crash mats covering floor below. High ceiling with gym lighting. Physical challenge play surface. MUST coordinate with parent overview ow-climbing-gym-yard's outdoor facility style.

Active sports destination. Physical challenge surface. No people. No text words.`,
          'ow-climbing-gym-yard'
        ),
      ]),
    ],
  }),

  'wz-ice-cream-park': world('wz-ice-cream-park', {
    parent_overview: 'ow-ice-cream-park',
    family_id: 'ice-cream-zoom-family',
    priority: 'MEDIUM_HIGH',
    composite_score: 69,
    min_views: 1,
    bucket: 'food-treat',
    title: 'Ice cream park zoom completion (OVERVIEW→CART ×1)',
    why: 'Ice cream = peak kid appeal. Vendor cart = transactional play. High reuse (food, treats, ordering, summer).',
    sheets: [
      sheet('S1', 'ice cream cart close-up', [
        cell(
          'ice-cream-vendor-cart',
          `${STYLE}

ICE CREAM CART — close-up vendor cart/stand with open front display showing colorful ice cream tub flavors (visual flavor colors: vanilla, chocolate, strawberry, mint — NO text labels, only color/visual cues). Serving counter with scoops, stack of cones, topping containers (sprinkles, fruit visible), striped umbrella shade overhead. Park setting background softly visible. Transaction/ordering play surface. MUST feel connected to parent overview ow-ice-cream-park's outdoor event/park vibe.

Summer treat destination. Food ordering surface. No people. No text words.`,
          'ow-ice-cream-park'
        ),
      ]),
    ],
  }),
};

// BATCH 3: MEDIUM
const BATCH_3_MEDIUM = {
  'wz-film-backlot': world('wz-film-backlot', {
    parent_overview: 'ow-film-backlot',
    family_id: 'film-backlot-zoom-family',
    priority: 'MEDIUM',
    composite_score: 68,
    min_views: 1,
    bucket: 'creative-media',
    title: 'Film backlot zoom completion (OVERVIEW→SET ×1)',
    why: 'Film set = unique behind-scenes creative environment. Camera/director/props = rich play.',
    sheets: [
      sheet('S1', 'film set interior', [
        cell(
          'film-set-studio-interior',
          `${STYLE}

FILM SET INTERIOR — behind-the-scenes movie studio set with professional camera on tripod, director's canvas chair, clapperboard slate (blank, no text), scattered props (fake plant, small furniture pieces), lighting stands with spotlights, partial green screen or painted backdrop wall. Creative workspace atmosphere. Media/storytelling play surface. MUST align with parent overview ow-film-backlot's outdoor studio lot industrial-creative tone.

Behind-the-scenes creative destination. Media production surface. No people. No text words.`,
          'ow-film-backlot'
        ),
      ]),
    ],
  }),

  'wz-mountain-lodge-village': world('wz-mountain-lodge-village', {
    parent_overview: 'ow-mountain-lodge-village',
    family_id: 'mountain-lodge-zoom-family',
    priority: 'MEDIUM',
    composite_score: 67,
    min_views: 1,
    bucket: 'shelter-leisure',
    title: 'Mountain lodge zoom completion (OVERVIEW→LODGE ×1)',
    why: 'Lodge = cozy shelter story. Fireplace/gear/bunks = inviting interior. Good reuse (travel, shelter, mountain, vacation).',
    sheets: [
      sheet('S1', 'lodge common room', [
        cell(
          'lodge-fireplace-common-room',
          `${STYLE}

MOUNTAIN LODGE INTERIOR — cozy common room with large stone fireplace (warm orange glow visible), sturdy wooden furniture (chairs, bench), ski and hiking gear mounted on log walls (skis, poles, backpack), large window showing snowy mountain view, woven rug on wooden floor. Warm rustic shelter atmosphere. Winter/mountain stay play surface. MUST coordinate with parent overview ow-mountain-lodge-village's alpine village winter tone.

Cozy retreat destination. Winter shelter surface. No people. No text words.`,
          'ow-mountain-lodge-village'
        ),
      ]),
    ],
  }),

  'wz-music-conservatory': world('wz-music-conservatory', {
    parent_overview: 'ow-music-conservatory',
    family_id: 'music-conservatory-zoom-family',
    priority: 'MEDIUM',
    composite_score: 65,
    min_views: 1,
    bucket: 'education-arts',
    title: 'Music conservatory zoom completion (OVERVIEW→PRACTICE ×1)',
    why: 'Music school = education destination. Practice room with piano/stands = instrument play.',
    sheets: [
      sheet('S1', 'music practice room', [
        cell(
          'music-practice-room',
          `${STYLE}

MUSIC PRACTICE ROOM — small dedicated practice room interior with upright piano against wall, adjustable music stand (no sheet music text, stand is empty or has blank pages), closed instrument case (violin or flute case), cushioned chair, sound-absorbing wall panels, window with soft natural light, small side table. Quiet education space. Music/instrument learning play surface. MUST match parent overview ow-music-conservatory's elegant educational building style.

Music education destination. Practice space surface. No people. No text words.`,
          'ow-music-conservatory'
        ),
      ]),
    ],
  }),
};

const ALL_WORLDS = {
  ...BATCH_1_HIGH,
  ...BATCH_2_MEDIUM_HIGH,
  ...BATCH_3_MEDIUM,
};

// Inventory management
function loadInv() {
  const invPath = path.join(ROOT, INV_REL);
  if (!fs.existsSync(invPath)) {
    return { worlds: {}, created_at: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function saveInv(inv) {
  const invPath = path.join(ROOT, INV_REL);
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
}

function listInFlight() {
  const inv = loadInv();
  return Object.values(inv.worlds || {}).filter(w => {
    if (!w.task_id) return false;
    if (w.agent_status === 'stopped' || w.agent_status === 'error') return false;
    if (w.finished_at) return false;
    return true;
  });
}

async function buildBrief(world) {
  const parts = [STYLE];
  
  parts.push(`\n\nPARENT OVERVIEW WORLD: ${world.parent_overview}`);
  parts.push(`Complete this overview by generating ${world.min_views} coordinated zoom view(s).`);
  parts.push(`These zoom views MUST feel like the SAME PLACE as the parent overview — consistent palette, style, world logic.`);
  parts.push(`\n\nFAMILY: ${world.family_id}`);
  parts.push(`BUCKET: ${world.bucket}`);
  parts.push(`WHY: ${world.why}`);
  parts.push(`\n\nSHEETS TO GENERATE:`);
  
  world.sheets.forEach(sheet => {
    parts.push(`\n## ${sheet.title}`);
    sheet.cells.forEach(cell => {
      parts.push(`\n### ${cell.key}`);
      parts.push(cell.brief);
    });
  });
  
  return parts.join('\n');
}

async function fireWorld(world) {
  const worldDir = path.join(HARVEST_ROOT, world.id);
  const sheetDir = path.join(worldDir, 'sheets');
  const runJson = path.join(worldDir, 'run.json');
  
  fs.mkdirSync(worldDir, { recursive: true });
  fs.mkdirSync(sheetDir, { recursive: true });
  
  if (fs.existsSync(runJson)) {
    const prev = JSON.parse(fs.readFileSync(runJson, 'utf8'));
    const savedCount = Array.isArray(prev.saved) ? prev.saved.length : 0;
    if (prev.finished_at && savedCount > 0) {
      console.log(`SKIP ${world.id} already finished (${savedCount} saved, qa=${prev.qa || 'n/a'})`);
      return prev;
    }
    if (prev.task_id && !prev.finished_at) {
      console.log(`WARN ${world.id} already in-flight: ${prev.task_id}`);
      return prev;
    }
  }
  
  const inflight = listInFlight();
  if (inflight.length >= REPO_HARD_CAP) {
    throw new Error(`Repo in-flight limit: ${inflight.length}/${REPO_HARD_CAP}`);
  }
  
  console.log(`🔥 Firing ${world.id}...`);
  const brief = await buildBrief(world);
  
  // Prefer live board backgrounds, then harvested overview wave sheets
  function resolveParentOverviewPng(parentId) {
    const live = path.join(ROOT, 'public/assets/08_backgrounds/img', `${parentId}.png`);
    if (fs.existsSync(live)) return live;
    const flat = path.join(ROOT, 'harvested/overview-worlds', parentId, `${parentId}.png`);
    if (fs.existsSync(flat)) return flat;
    const owRoot = path.join(ROOT, 'harvested/overview-worlds');
    if (!fs.existsSync(owRoot)) return null;
    const stack = [owRoot];
    while (stack.length) {
      const dir = stack.pop();
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) stack.push(full);
        else if (ent.name === `${parentId}.png`) return full;
      }
    }
    return null;
  }

  const overviewPng = resolveParentOverviewPng(world.parent_overview);
  const contentParts = [{ type: 'text', text: brief }];

  if (overviewPng) {
    console.log(`  Attaching parent overview: ${path.relative(ROOT, overviewPng)}`);
    const filePart = await fileContentPart(overviewPng);
    contentParts.push(filePart);
  } else {
    console.log(`  WARN: No parent overview PNG found for ${world.parent_overview}`);
  }

  const created = await createTask({
    title: world.title,
    agent_profile: resolveAgentProfile(),
    force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
    interactive_mode: false,
    message: { content: contentParts },
  });
  
  const taskId = created.task_id || created.id;
  const dump = {
    world_id: world.id,
    task_id: taskId,
    task_url: created.task_url || `https://manus.im/app/${taskId}`,
    started_at: new Date().toISOString(),
    priority: world.priority,
    min_views: world.min_views,
    parent_overview: world.parent_overview,
  };
  
  fs.writeFileSync(runJson, JSON.stringify(dump, null, 2));
  
  const inv = loadInv();
  inv.worlds = inv.worlds || {};
  inv.worlds[world.id] = dump;
  saveInv(inv);
  
  console.log(`✅ Fired ${world.id} → ${dump.task_url}`);
  return dump;
}

async function pollWorld(world) {
  const worldDir = path.join(HARVEST_ROOT, world.id);
  const sheetDir = path.join(worldDir, 'sheets');
  const runJson = path.join(worldDir, 'run.json');
  
  if (!fs.existsSync(runJson)) {
    throw new Error(`No run.json for ${world.id}`);
  }
  
  const run = JSON.parse(fs.readFileSync(runJson, 'utf8'));
  const taskId = run.task_id;
  
  console.log(`📊 Polling ${world.id} (${taskId})...`);
  
  const result = await pollUntilDone(taskId, {
    intervalMs: POLL_MS,
    timeoutMs: TIMEOUT_MS,
    onTick: ({ agent_status }) => {
      console.log(`  ${world.id}: ${agent_status || 'unknown'}`);
    },
  });
  
  const msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  const messages = msgs.messages || result.messages || [];
  
  // Download sheets — Manus returns file blocks AND/OR attachments
  fs.mkdirSync(sheetDir, { recursive: true });
  const saved = [];
  const seen = new Set();
  function pushHit(filename, url) {
    if (!url || !filename) return;
    if (!/\.(png|jpe?g|webp)$/i.test(filename) && !/png|jpeg|jpg|webp/i.test(filename)) return;
    const key = filename + '|' + url;
    if (seen.has(key)) return;
    seen.add(key);
    saved.push({ filename, url });
  }
  for (const msg of messages) {
    const body = msg.assistant_message || (msg.type === 'assistant_message' ? msg : null);
    if (!body) continue;
    for (const block of body.blocks || []) {
      if (block.type === 'file' && block.file) {
        const file = block.file;
        pushHit(file.filename || file.name, file.url || file.download_url || file.file_url);
      }
    }
    for (const a of body.attachments || msg.attachments || []) {
      const name = a.file_name || a.filename || a.name || 'sheet.png';
      const url = a.url || a.download_url || a.file_url;
      pushHit(name, url);
    }
  }
  const downloaded = [];
  for (const hit of saved) {
    const savePath = path.join(sheetDir, hit.filename.replace(/[^a-zA-Z0-9._-]/g, '_'));
    console.log(`  Downloading ${hit.filename}...`);
    const res = await fetch(hit.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(savePath, buffer);
    downloaded.push({ filename: path.basename(savePath), bytes: buffer.length, path: savePath });
  }
  // rename local for clarity below
  saved.length = 0;
  for (const d of downloaded) saved.push(d);
  
  run.finished_at = new Date().toISOString();
  run.agent_status = result.agent_status;
  run.saved = saved;
  run.qa = saved.length >= world.min_views ? 'REG_A' : 'REG_C';
  
  fs.writeFileSync(runJson, JSON.stringify(run, null, 2));
  
  const inv = loadInv();
  inv.worlds[world.id] = run;
  saveInv(inv);
  
  console.log(`✅ Downloaded ${world.id}: ${saved.length}/${world.min_views} views, QA=${run.qa}`);
  return run;
}

async function fireBatch(batchNum) {
  const batches = [BATCH_1_HIGH, BATCH_2_MEDIUM_HIGH, BATCH_3_MEDIUM];
  const batch = batches[batchNum - 1];
  
  console.log(`\n🚀 Firing Batch ${batchNum}: ${Object.keys(batch).length} worlds\n`);
  
  const results = [];
  for (const [id, world] of Object.entries(batch)) {
    try {
      const inflight = listInFlight();
      while (inflight.length >= REPO_SOFT_CAP) {
        console.log(`⏳ Waiting for slot (${inflight.length}/${REPO_SOFT_CAP} in-flight)...`);
        await new Promise(r => setTimeout(r, 30000));
      }
      
      const result = await fireWorld(world);
      results.push({ world: id, status: 'fired', task_id: result.task_id });
      
      // Small delay between fires
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`❌ Failed to fire ${id}: ${err.message}`);
      results.push({ world: id, status: 'error', error: err.message });
    }
  }
  
  return results;
}

async function pollBatch(batchNum) {
  const batches = [BATCH_1_HIGH, BATCH_2_MEDIUM_HIGH, BATCH_3_MEDIUM];
  const batch = batches[batchNum - 1];
  
  console.log(`\n📊 Polling Batch ${batchNum}: ${Object.keys(batch).length} worlds\n`);
  
  const results = [];
  for (const [id, world] of Object.entries(batch)) {
    try {
      const result = await pollWorld(world);
      results.push({ world: id, status: 'done', qa: result.qa, views: result.saved.length });
    } catch (err) {
      console.error(`❌ Failed to poll ${id}: ${err.message}`);
      results.push({ world: id, status: 'error', error: err.message });
    }
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const auditOnly = args.includes('--audit-only');
  const fire = args.includes('--fire');
  const poll = args.includes('--poll');
  const batchArg = args.find((a) => a.startsWith('--batch='));

  if (!fs.existsSync(HARVEST_ROOT)) {
    fs.mkdirSync(HARVEST_ROOT, { recursive: true });
  }

  if (auditOnly) {
    console.log(`\n=== ORPHAN WORLD COMPLETION AUDIT ===`);
    console.log(`Total worlds: ${Object.keys(ALL_WORLDS).length}`);
    console.log(`Batch 1 (HIGH): ${Object.keys(BATCH_1_HIGH).length} worlds, ${Object.values(BATCH_1_HIGH).reduce((sum, w) => sum + w.min_views, 0)} views`);
    console.log(`Batch 2 (MEDIUM_HIGH): ${Object.keys(BATCH_2_MEDIUM_HIGH).length} worlds, ${Object.values(BATCH_2_MEDIUM_HIGH).reduce((sum, w) => sum + w.min_views, 0)} views`);
    console.log(`Batch 3 (MEDIUM): ${Object.keys(BATCH_3_MEDIUM).length} worlds, ${Object.values(BATCH_3_MEDIUM).reduce((sum, w) => sum + w.min_views, 0)} views`);
    console.log(`\nTotal new views to generate: ${Object.values(ALL_WORLDS).reduce((sum, w) => sum + w.min_views, 0)}`);
    console.log(`\nWorlds:`);
    Object.entries(ALL_WORLDS).forEach(([id, w]) => {
      console.log(`  ${id} [${w.priority}] — ${w.min_views} views — ${w.why.substring(0, 60)}...`);
    });
    console.log(`\nIn-flight: ${listInFlight().length}`);
    return;
  }

  if (batchArg) {
    const batchNum = parseInt(batchArg.split('=')[1]);
    if (batchNum < 1 || batchNum > 3) {
      console.error(`❌ Invalid batch number: ${batchNum}. Use 1-3.`);
      return;
    }
    
    if (fire) {
      await fireBatch(batchNum);
    } else if (poll) {
      await pollBatch(batchNum);
    } else {
      const batches = [BATCH_1_HIGH, BATCH_2_MEDIUM_HIGH, BATCH_3_MEDIUM];
      const batch = batches[batchNum - 1];
      console.log(`Batch ${batchNum}: ${Object.keys(batch).length} worlds`);
      Object.entries(batch).forEach(([id, w]) => {
        console.log(`  ${id} [${w.priority}] — ${w.min_views} views`);
      });
      console.log(`\nUse --fire to execute, --poll to download`);
    }
    return;
  }

  console.log(`\nUsage:`);
  console.log(`  --audit-only               Show what needs to be done`);
  console.log(`  --batch=N --fire          Fire batch N (1-3)`);
  console.log(`  --batch=N --poll          Poll & download batch N`);
}

const __filename = fileURLToPath(import.meta.url);
const isDirect =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === __filename ||
    String(process.argv[1]).endsWith('request-orphan-world-completions-complete.mjs'));

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
