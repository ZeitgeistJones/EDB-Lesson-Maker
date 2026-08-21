/**
 * Fire remaining worlds manually
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT,
  createTask,
  MANUS_SKILLS,
  resolveAgentProfile,
  fileContentPart,
} from './client.mjs';

const HARVEST_ROOT = path.join(ROOT, 'harvested/world-zoom-completions');
const INV_PATH = path.join(ROOT, 'docs/world-zoom-completions-inventory.json');
const BOARD = { width: 1280, height: 590 };

const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, padding across all views. MUST match parent overview world style when completing an existing overview.
TEXT LOCK: BLANK / text-free. No English words, captions, labels, letters, numbers, logos, brands, UI chrome, fake readable screens, watermarks. Pictograms OK for directional/functional markers only.
IP LOCK: NO brands, NO licensed characters, NO social logos, NO Pokémon-like creatures, NO Disney-like characters.
AGE LOCK: Pre-A1→B2 age-respectful — modern places OK; not preschool-only baby towns.
CONTINUITY LOCK: When completing a family, all views must feel like the SAME PLACE with consistent world logic, color palette, architectural details.
STOCKPILE LOCK: raw Manus sheets only. Do not wire into lessons/producer.
QUALITY: default only unless specified.
SCALE: BOARD-SCALE for ~${BOARD.width}×${BOARD.height} ClassIn board with ample negative space for drag play.`;

const REMAINING = {
  'wz-ice-cream-park': {
    id: 'wz-ice-cream-park',
    family_id: 'ice-cream-zoom-family',
    priority: 'MEDIUM_HIGH',
    min_views: 1,
    bucket: 'food-treat',
    title: 'Ice cream park zoom completion (OVERVIEW→CART ×1)',
    why: 'Ice cream = peak kid appeal. Vendor cart = transactional play.',
    parent_overview: 'ow-ice-cream-park',
    sheets: [{
      id: 'S1',
      title: 'ice cream cart close-up',
      cells: [{
        key: 'ice-cream-vendor-cart',
        concept: 'ice-cream-vendor-cart',
        brief: `${STYLE}

ICE CREAM CART — close-up vendor cart/stand with open front display showing colorful ice cream tub flavors (visual flavor colors: vanilla, chocolate, strawberry, mint — NO text labels, only color/visual cues). Serving counter with scoops, stack of cones, topping containers (sprinkles, fruit visible), striped umbrella shade overhead. Park setting background softly visible. Transaction/ordering play surface. MUST feel connected to parent overview ow-ice-cream-park's outdoor event/park vibe.

Summer treat destination. Food ordering surface. No people. No text words.`,
        parent_overview: 'ow-ice-cream-park',
      }],
    }],
  },
  'wz-film-backlot': {
    id: 'wz-film-backlot',
    family_id: 'film-backlot-zoom-family',
    priority: 'MEDIUM',
    min_views: 1,
    bucket: 'creative-media',
    title: 'Film backlot zoom completion (OVERVIEW→SET ×1)',
    why: 'Film set = unique behind-scenes creative environment.',
    parent_overview: 'ow-film-backlot',
    sheets: [{
      id: 'S1',
      title: 'film set interior',
      cells: [{
        key: 'film-set-studio-interior',
        concept: 'film-set-studio-interior',
        brief: `${STYLE}

FILM SET INTERIOR — behind-the-scenes movie studio set with professional camera on tripod, director's canvas chair, clapperboard slate (blank, no text), scattered props (fake plant, small furniture pieces), lighting stands with spotlights, partial green screen or painted backdrop wall. Creative workspace atmosphere. Media/storytelling play surface. MUST align with parent overview ow-film-backlot's outdoor studio lot industrial-creative tone.

Behind-the-scenes creative destination. Media production surface. No people. No text words.`,
        parent_overview: 'ow-film-backlot',
      }],
    }],
  },
  'wz-mountain-lodge-village': {
    id: 'wz-mountain-lodge-village',
    family_id: 'mountain-lodge-zoom-family',
    priority: 'MEDIUM',
    min_views: 1,
    bucket: 'shelter-leisure',
    title: 'Mountain lodge zoom completion (OVERVIEW→LODGE ×1)',
    why: 'Lodge = cozy shelter story. Fireplace/gear/bunks = inviting interior.',
    parent_overview: 'ow-mountain-lodge-village',
    sheets: [{
      id: 'S1',
      title: 'lodge common room',
      cells: [{
        key: 'lodge-fireplace-common-room',
        concept: 'lodge-fireplace-common-room',
        brief: `${STYLE}

MOUNTAIN LODGE INTERIOR — cozy common room with large stone fireplace (warm orange glow visible), sturdy wooden furniture (chairs, bench), ski and hiking gear mounted on log walls (skis, poles, backpack), large window showing snowy mountain view, woven rug on wooden floor. Warm rustic shelter atmosphere. Winter/mountain stay play surface. MUST coordinate with parent overview ow-mountain-lodge-village's alpine village winter tone.

Cozy retreat destination. Winter shelter surface. No people. No text words.`,
        parent_overview: 'ow-mountain-lodge-village',
      }],
    }],
  },
  'wz-music-conservatory': {
    id: 'wz-music-conservatory',
    family_id: 'music-conservatory-zoom-family',
    priority: 'MEDIUM',
    min_views: 1,
    bucket: 'education-arts',
    title: 'Music conservatory zoom completion (OVERVIEW→PRACTICE ×1)',
    why: 'Music school = education destination. Practice room with piano/stands = instrument play.',
    parent_overview: 'ow-music-conservatory',
    sheets: [{
      id: 'S1',
      title: 'music practice room',
      cells: [{
        key: 'music-practice-room',
        concept: 'music-practice-room',
        brief: `${STYLE}

MUSIC PRACTICE ROOM — small dedicated practice room interior with upright piano against wall, adjustable music stand (no sheet music text, stand is empty or has blank pages), closed instrument case (violin or flute case), cushioned chair, sound-absorbing wall panels, window with soft natural light, small side table. Quiet education space. Music/instrument learning play surface. MUST match parent overview ow-music-conservatory's elegant educational building style.

Music education destination. Practice space surface. No people. No text words.`,
        parent_overview: 'ow-music-conservatory',
      }],
    }],
  },
};

function loadInv() {
  if (!fs.existsSync(INV_PATH)) {
    return { worlds: {} };
  }
  return JSON.parse(fs.readFileSync(INV_PATH, 'utf8'));
}

function saveInv(inv) {
  fs.writeFileSync(INV_PATH, JSON.stringify(inv, null, 2));
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
  const inv = loadInv();
  
  if (inv.worlds[world.id]) {
    console.log(`⏭️  Skipping ${world.id} (already fired)`);
    return inv.worlds[world.id];
  }
  
  const worldDir = path.join(HARVEST_ROOT, world.id);
  const sheetDir = path.join(worldDir, 'sheets');
  const runJson = path.join(worldDir, 'run.json');
  
  fs.mkdirSync(worldDir, { recursive: true });
  fs.mkdirSync(sheetDir, { recursive: true });
  
  console.log(`🔥 Firing ${world.id}...`);
  const brief = await buildBrief(world);
  
  const overviewPath = path.join(ROOT, 'harvested/overview-worlds', world.parent_overview);
  const overviewPng = path.join(overviewPath, `${world.parent_overview}.png`);
  
  const contentParts = [{ type: 'text', text: brief }];
  
  if (fs.existsSync(overviewPng)) {
    console.log(`  📎 Attaching parent overview: ${world.parent_overview}.png`);
    const filePart = await fileContentPart(overviewPng);
    contentParts.push(filePart);
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
  
  inv.worlds[world.id] = dump;
  saveInv(inv);
  
  console.log(`✅ Fired ${world.id} → ${dump.task_url}`);
  return dump;
}

async function fireRemaining() {
  console.log('\n🚀 Firing remaining worlds...\n');
  
  for (const [id, world] of Object.entries(REMAINING)) {
    try {
      await fireWorld(world);
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`❌ Failed to fire ${id}: ${err.message}`);
    }
  }
  
  console.log('\n✅ All remaining worlds fired!');
}

fireRemaining().catch((err) => {
  console.error(err);
  process.exit(1);
});
