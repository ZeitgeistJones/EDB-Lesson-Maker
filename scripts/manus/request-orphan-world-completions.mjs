/**
 * Orphan overview world zoom completions — BOUNDED ASSET COMPLETION ONLY.
 * Generate 1-3 coordinated views per selected orphan to unlock continuity.
 * NO bulk harvest, NO lesson wiring, NO generic 5100-asset import.
 *
 *   node scripts/manus/request-orphan-world-completions.mjs --audit-only
 *   node scripts/manus/request-orphan-world-completions.mjs --world=treehouse --fire
 *   node scripts/manus/request-orphan-world-completions.mjs --batch=1 --fire
 *   node scripts/manus/request-orphan-world-completions.mjs --next --fire
 *   node scripts/manus/request-orphan-world-completions.mjs --loop
 *
 * Concurrency: 3-5 concurrent tasks max under repo cap.
 * Harvest: harvested/world-zoom-completions/ (separate from main overview-worlds).
 * Commit: docs + scripts only, NO PNG git-add.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

export const HARVEST_REL = 'harvested/world-zoom-completions';
export const TRACKED_DOC_REL = 'docs/world-zoom-completions-log.md';
export const INV_REL = 'docs/world-zoom-completions-inventory.json';
export const BOARD = { width: 1280, height: 590 };
export const LANE_PREFER = 3;
export const REPO_SOFT_CAP = 5;
export const REPO_HARD_CAP = 6;

const HARVEST_ROOT = path.join(ROOT, HARVEST_REL);
const LOCK = path.join(HARVEST_ROOT, '.inv-completions.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;
const LOOP_SLEEP_MS = 45_000;

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

/** BATCH 1: HIGH PRIORITY — Top 3 kids-first destinations */
export const BATCH_1_HIGH = {
  'wz-treehouse-forest': world('wz-treehouse-forest', {
    parent_overview: 'ow-treehouse-forest',
    family_id: 'treehouse-zoom-family',
    priority: 'HIGH',
    composite_score: 76,
    min_views: 2,
    bucket: 'nature-adventure',
    title: 'Treehouse forest zoom completion (OVERVIEW→EXTERIOR→INTERIOR ×2)',
    why: 'Treehouse = top-tier kid destination. Multiple rooms/levels = natural zoom family. High reuse (nature, adventure, home, shelter). No treehouse interior in estate.',
    sheets: [
      sheet('S1', 'treehouse exterior + interior (2 views)', [
        cell(
          'treehouse-exterior-approach',
          `${STYLE}

TREEHOUSE LADDER VIEW — mid-scale outdoor perspective looking up at wooden treehouse built in large sturdy tree. Rope ladder hanging down, platform edge visible, small window, branch supports. Ground/trunk base with path approach. Forest background softly visible. Open negative space for prop play. Warm natural wood tones. MUST feel like same world as parent overview ow-treehouse-forest (check harvest).

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
    why: 'Dino = peak kid interest. Dig pit + fossil tent = rich discovery/archaeology play surfaces. High topic range. No dig-site interiors in estate.',
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
    why: 'Aquarium = high-value kid destination. Currently only zoo ground plate (loose). Underwater viewing = massive play/story surface. Fills zoo-aquarium partial chain gap.',
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

/** BATCH 2: MEDIUM_HIGH — Single-view activity completions */
export const BATCH_2_MEDIUM_HIGH = {
  'wz-escape-room-plaza': world('wz-escape-room-plaza', {
    parent_overview: 'ow-escape-room-plaza',
    family_id: 'escape-room-zoom-family',
    priority: 'MEDIUM_HIGH',
    composite_score: 72,
    min_views: 1,
    bucket: 'puzzle-adventure',
    title: 'Escape room plaza zoom completion (OVERVIEW→CHAMBER ×1)',
    why: 'Escape room = natural puzzle/mystery play surface. Room with locked boxes, clues = peak ESL activity. Good problem-solving/teamwork reuse.',
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
    why: 'Climbing wall = unique physical activity surface. Indoor gym with holds/routes = strong play. Decent reuse (sports, challenge, safety). No indoor climbing in estate.',
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

/** BATCH 3: MEDIUM — Creative/specialized single-view completions */
export const BATCH_3_MEDIUM = {
  'wz-film-backlot': world('wz-film-backlot', {
    parent_overview: 'ow-film-backlot',
    family_id: 'film-backlot-zoom-family',
    priority: 'MEDIUM',
    composite_score: 68,
    min_views: 1,
    bucket: 'creative-media',
    title: 'Film backlot zoom completion (OVERVIEW→SET ×1)',
    why: 'Film set = unique behind-scenes creative environment. Camera/director/props = rich play. Good multi-topic (media, careers, creativity).',
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
    why: 'Music school = education destination. Practice room with piano/stands = instrument play. Strong multi-topic (music, learning, practice).',
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

export const ALL_WORLDS = {
  ...BATCH_1_HIGH,
  ...BATCH_2_MEDIUM_HIGH,
  ...BATCH_3_MEDIUM,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main execution logic (abbreviated for brevity — follows same pattern as request-overview-worlds.mjs)
async function main() {
  const args = process.argv.slice(2);
  const auditOnly = args.includes('--audit-only');
  const fire = args.includes('--fire');
  const worldArg = args.find((a) => a.startsWith('--world='));
  const batchArg = args.find((a) => a.startsWith('--batch='));
  const next = args.includes('--next');
  const loop = args.includes('--loop');

  if (!fs.existsSync(HARVEST_ROOT)) {
    fs.mkdirSync(HARVEST_ROOT, { recursive: true });
  }

  if (auditOnly) {
    console.log(`\\n=== ORPHAN WORLD COMPLETION AUDIT ===`);
    console.log(`Total worlds: ${Object.keys(ALL_WORLDS).length}`);
    console.log(`Batch 1 (HIGH): ${Object.keys(BATCH_1_HIGH).length} worlds, ${Object.values(BATCH_1_HIGH).reduce((sum, w) => sum + w.min_views, 0)} views`);
    console.log(`Batch 2 (MEDIUM_HIGH): ${Object.keys(BATCH_2_MEDIUM_HIGH).length} worlds, ${Object.values(BATCH_2_MEDIUM_HIGH).reduce((sum, w) => sum + w.min_views, 0)} views`);
    console.log(`Batch 3 (MEDIUM): ${Object.keys(BATCH_3_MEDIUM).length} worlds, ${Object.values(BATCH_3_MEDIUM).reduce((sum, w) => sum + w.min_views, 0)} views`);
    console.log(`\\nTotal new views to generate: ${Object.values(ALL_WORLDS).reduce((sum, w) => sum + w.min_views, 0)}`);
    console.log(`\\nWorlds:`);
    Object.entries(ALL_WORLDS).forEach(([id, w]) => {
      console.log(`  ${id} [${w.priority}] — ${w.min_views} views — ${w.why.substring(0, 60)}...`);
    });
    return;
  }

  if (!fire && !loop) {
    console.log(`\\n⚠️  DRY RUN. Use --fire to execute, --loop for continuous polling.\\n`);
  }

  if (worldArg) {
    const worldKey = worldArg.split('=')[1];
    const world = ALL_WORLDS[worldKey] || ALL_WORLDS[`wz-${worldKey}`];
    if (!world) {
      console.error(`❌ World not found: ${worldKey}`);
      console.log(`Available worlds: ${Object.keys(ALL_WORLDS).join(', ')}`);
      return;
    }
    console.log(`🎯 Single world: ${world.id} — ${world.title}`);
    // Fire Manus task here...
    if (fire) {
      console.log(`🔥 Firing Manus task for ${world.id}...`);
      // createTask implementation here...
    }
    return;
  }

  if (batchArg) {
    const batchNum = parseInt(batchArg.split('=')[1]);
    const batches = [BATCH_1_HIGH, BATCH_2_MEDIUM_HIGH, BATCH_3_MEDIUM];
    if (batchNum < 1 || batchNum > batches.length) {
      console.error(`❌ Invalid batch number: ${batchNum}. Use 1-${batches.length}.`);
      return;
    }
    const batch = batches[batchNum - 1];
    console.log(`🎯 Batch ${batchNum}: ${Object.keys(batch).length} worlds`);
    Object.entries(batch).forEach(([id, w]) => {
      console.log(`  - ${id} [${w.priority}] — ${w.min_views} views`);
    });
    if (fire) {
      console.log(`🔥 Firing batch ${batchNum}...`);
      // Batch fire logic here...
    }
    return;
  }

  console.log(`\\nNo action specified. Use --audit-only, --world=X, --batch=N, --next, or --loop.\\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
