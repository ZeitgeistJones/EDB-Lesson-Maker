/**
 * Builder worlds STREAM B — lower half of docs/builder-worlds-portfolio.json.
 * Families: bakery-line, market-stall, theatre-wings, camping-pitch.
 * Stockpile only. No producer, recipes, PropBank, or renderer wiring.
 *
 *   node scripts/manus/request-builder-worlds-b.mjs --wave=bak1 --fire
 *   node scripts/manus/request-builder-worlds-b.mjs --wave=bak1 --poll-only
 *   node scripts/manus/request-builder-worlds-b.mjs --loop
 *
 * Partition: harvested/builder-worlds/{bakery-line,market-stall,theatre-wings,camping-pitch}/
 * Slot: max 1 in-flight under harvested/builder-worlds/ (shared with stream A).
 * Art PNGs are local stockpile — never git-add. Track scripts + docs + inventory JSON.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  createTask,
  listMessages,
  latestAgentStatus,
  sendMessage,
  MANUS_SKILLS,
  resolveAgentProfile,
  withEslAssetGeneratorBrief,
  apiKey,
} from './client.mjs';

export const STOCKPILE_REL = 'harvested/builder-worlds';
export const TRACKED_DOC_REL = 'docs/builder-worlds-b-log.md';
export const INV_REL = 'docs/builder-worlds-b-inventory.json';
export const INV_LOCAL_REL = path.join(STOCKPILE_REL, 'b-inventory.json');
export const PREFIX = 'bw-';
export const STREAM = 'B';

const STOCKPILE = path.join(ROOT, STOCKPILE_REL);
const LOCK = path.join(STOCKPILE, '.b.lock');
const INV_PATH = path.join(ROOT, INV_REL);
const INV_LOCAL_PATH = path.join(ROOT, INV_LOCAL_REL);
const POLL_MS = 30_000;
const TIMEOUT_MS = 65 * 60 * 1000;
const RATE_WAIT_MS = 90_000;
const LARGE_BYTES = 80_000;

const STYLE_BASE = `BUILDER-WORLD BASE — full-page 16:9 landscape empty play world for ClassIn ESL.
BOARD FEEL: panoramic children's-book soft-matte illustration, house style.
PLAY ZONE: ~35–50% open center/lower band so kids drag modules/tokens freely.
Stations/pads may exist as EMPTY silhouettes at edges — nothing living fused in.
NO snapping grid, NO LEGO studs, NO puzzle tabs that require precise edge-join.
NO baked readable text, letters, numbers, logos, price tags with words, maps, flags, UI.
NO people, faces, Mia, Leo, mascots. quality: default ONLY. STOCKPILE ONLY.`;

const STYLE_CONTACT = `BLACK-FIELD CONTACT — pure #000000 edge-to-edge, clear gutters, one concept per cell.
PLAY SCALE: each piece fills most of its cell with generous black margin (board-drag size, not postage stamp).
Modules/connectors/tokens/problems are isolated still-lifes — NOT miniature full backgrounds.
NO white/grey/cream cell plates. NO text/letters/numbers/logos/captions.
Bodies must be clearly colored (not near-black) so they survive black-key.
quality: default ONLY. STOCKPILE ONLY.`;

const DEDUPE = `DO NOT CLONE (already deep / other streams):
- K5 town→country route tiles / path join systems
- CW A+B habitat biomes + science-process worlds
- Zoo enclosures, amusement rides, parking-garage, bridge-span tiles
- Aggressive S1 place washes (forest/beach/market-as-room) as sealed posters
- Stream A builder families: canal-lock, kaiten-belt, beehive-stack, harbor-berth
- Recycling-logo lines, space-mission pads, castle-wall brand kits
- Mia/Leo poses, classroom noun dumps, tiny fasteners
This stream manufactures MODULAR BUILDER ATOMS only — free-drag, no snap physics.`;

const B_FAMILIES = ['bakery-line', 'market-stall', 'theatre-wings', 'camping-pitch'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function is429(err) {
  return /failed \(429\)|rate.?limit|too many requests|resource_exhausted/i.test(String(err && err.message));
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!is429(err)) throw err;
    console.log(JSON.stringify({ phase: 'rate-limit', wait_ms: RATE_WAIT_MS, retry: 1 }, null, 2));
    await sleep(RATE_WAIT_MS);
    try {
      return await fn();
    } catch (err2) {
      if (!is429(err2)) throw err2;
      const wait2 = RATE_WAIT_MS * 2;
      console.log(JSON.stringify({ phase: 'rate-limit', wait_ms: wait2, retry: 'backoff-stop' }, null, 2));
      await sleep(wait2);
      throw err2;
    }
  }
}

async function listMessagesBackoff(taskId, opts = {}) {
  return withRateBackoff(() => listMessages(taskId, opts));
}

async function pollGently(taskId) {
  const started = Date.now();
  let lastStatus = null;
  await sleep(2500);
  while (Date.now() - started < TIMEOUT_MS) {
    const page = await listMessagesBackoff(taskId, {
      order: 'desc',
      limit: 80,
      allowMissing: Date.now() - started < 90_000,
    });
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

function cell(opts) {
  const { slug, family, part, kind, brief } = opts;
  return {
    key: `${PREFIX}${slug}`,
    asset_id: `bw-${slug}`,
    concept: slug,
    family,
    part,
    kind,
    brief,
  };
}

function fp(id, title, cells) {
  return { id, title, format: 'fullpage-landscape', cells };
}

function ct(id, title, format, cells) {
  return { id, title, format, cells };
}

/** bakery-line — production counters, not a shop poster */
const BAK1_SHEETS = [
  fp('bak1-base', 'bakery-line empty production base', [
    cell({
      slug: 'bakery-line-base',
      family: 'bakery-line',
      part: 'base',
      kind: 'stage',
      brief:
        'empty bakery PRODUCTION LINE world: long open counter play band 35-50% across lower/center, empty station pads at edges (dough bench, tray slot, oven mouth silhouette, cooling rack outline) — no bread fused, no people, no price tags, no labels',
    }),
  ]),
  ct('bak1-mod', 'bakery modules+connectors 4x3', 'black-contact-4x3', [
    cell({ slug: 'bak-mod-dough-bench', family: 'bakery-line', part: 'module', kind: 'module', brief: 'PLAY SCALE empty dough kneading bench module, isolated, no text' }),
    cell({ slug: 'bak-mod-tray-rack', family: 'bakery-line', part: 'module', kind: 'module', brief: 'PLAY SCALE empty tray rack / sheet-pan shelf module, isolated, no bread fused, no text' }),
    cell({ slug: 'bak-mod-oven-mouth', family: 'bakery-line', part: 'module', kind: 'module', brief: 'PLAY SCALE oven mouth / open oven cavity module (mid-tone hollow), isolated, no text' }),
    cell({ slug: 'bak-mod-cool-rack', family: 'bakery-line', part: 'module', kind: 'module', brief: 'PLAY SCALE empty wire cooling rack module, isolated, no text' }),
    cell({ slug: 'bak-mod-mixer-pad', family: 'bakery-line', part: 'module', kind: 'module', brief: 'PLAY SCALE empty mixer-stand pad / bowl station module, bowl EMPTY, no text' }),
    cell({ slug: 'bak-mod-proof-box', family: 'bakery-line', part: 'module', kind: 'module', brief: 'PLAY SCALE empty proofing box / cabinet module with open door, mid-tone hollow, no text' }),
    cell({ slug: 'bak-con-counter-join', family: 'bakery-line', part: 'connector', kind: 'connector', brief: 'PLAY SCALE short counter-join piece (visual connector, NOT snap tile), isolated, no text' }),
    cell({ slug: 'bak-con-tray-rail', family: 'bakery-line', part: 'connector', kind: 'connector', brief: 'PLAY SCALE tray-slide rail fragment connector, isolated, no text' }),
    cell({ slug: 'bak-con-oven-hinge', family: 'bakery-line', part: 'connector', kind: 'connector', brief: 'PLAY SCALE oven-door hinge / latch fragment connector, isolated, no text' }),
    cell({ slug: 'bak-con-shelf-bracket', family: 'bakery-line', part: 'connector', kind: 'connector', brief: 'PLAY SCALE shelf bracket pair connector, isolated, no text' }),
    cell({ slug: 'bak-con-flour-chute', family: 'bakery-line', part: 'connector', kind: 'connector', brief: 'PLAY SCALE small flour chute / spout connector fragment, isolated, no text' }),
    cell({ slug: 'bak-con-pass-window', family: 'bakery-line', part: 'connector', kind: 'connector', brief: 'PLAY SCALE pass-through window frame connector (empty), isolated, no text' }),
  ]),
  ct('bak1-tok', 'bakery tokens 3x3', 'black-contact-3x3', [
    cell({ slug: 'bak-tok-dough-ball', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE raw dough ball token, still-life, no face, no text' }),
    cell({ slug: 'bak-tok-dough-flat', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE flattened dough disc token, isolated, no text' }),
    cell({ slug: 'bak-tok-raw-loaf', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE unbaked loaf on tray token, pale dough, no text' }),
    cell({ slug: 'bak-tok-baked-loaf', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE baked golden loaf token, isolated, no text' }),
    cell({ slug: 'bak-tok-rolling-pin', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE rolling pin token, isolated, no text' }),
    cell({ slug: 'bak-tok-oven-mitt', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE oven mitt token, isolated, no text' }),
    cell({ slug: 'bak-tok-sheet-pan', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE empty sheet pan / tray token, isolated, no text' }),
    cell({ slug: 'bak-tok-flour-scoop', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE flour scoop token with a bit of flour, no bag brand, no text' }),
    cell({ slug: 'bak-tok-pastry-brush', family: 'bakery-line', part: 'token', kind: 'token', brief: 'PLAY SCALE pastry brush token, isolated, no text' }),
  ]),
  ct('bak1-prob', 'bakery problems+states 3x3', 'black-contact-3x3', [
    cell({ slug: 'bak-st-burnt-loaf', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE burnt/overdone loaf problem state, readable without text' }),
    cell({ slug: 'bak-st-spill-flour', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE spilled flour pile problem token, isolated, no text' }),
    cell({ slug: 'bak-st-empty-tray', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE conspicuously EMPTY tray problem state, isolated' }),
    cell({ slug: 'bak-st-overflow-tray', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE overflowing tray with too many rolls problem state, no text' }),
    cell({ slug: 'bak-st-cracked-bowl', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE cracked mixing bowl problem state, isolated, no text' }),
    cell({ slug: 'bak-st-dough-stuck', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE dough stuck on rolling pin problem state, isolated' }),
    cell({ slug: 'bak-st-oven-smoke', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE compact oven-smoke puff problem overlay atom, not full background, no text' }),
    cell({ slug: 'bak-st-tidy-loaf', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE tidy repaired/good loaf on clean tray TRANSFORM pair counterpart, isolated' }),
    cell({ slug: 'bak-st-repaired-bowl', family: 'bakery-line', part: 'problem', kind: 'state', brief: 'PLAY SCALE intact mixing bowl TRANSFORM counterpart to cracked-bowl, same scale, isolated' }),
  ]),
];

/** market-stall — stall atoms, not marketplace place-wash */
const MKT1_SHEETS = [
  fp('mkt1-base', 'market-stall empty arcade base', [
    cell({
      slug: 'market-stall-base',
      family: 'market-stall',
      part: 'base',
      kind: 'stage',
      brief:
        'empty market arcade / aisle builder world: open center play band 35-50%, empty stall footprint pads along both sides, soft canopy silhouettes at edges — no produce fused, no people, no price signs, no logos',
    }),
  ]),
  ct('mkt1-mod', 'market modules+connectors 4x3', 'black-contact-4x3', [
    cell({ slug: 'mkt-mod-stall-shell', family: 'market-stall', part: 'module', kind: 'module', brief: 'PLAY SCALE empty stall shell module (counter+posts), no goods, no text' }),
    cell({ slug: 'mkt-mod-stall-shelves', family: 'market-stall', part: 'module', kind: 'module', brief: 'PLAY SCALE stall shell with EMPTY shelves module, no produce, no text' }),
    cell({ slug: 'mkt-mod-corner-stall', family: 'market-stall', part: 'module', kind: 'module', brief: 'PLAY SCALE corner stall shell module, empty, isolated, no text' }),
    cell({ slug: 'mkt-mod-tall-end', family: 'market-stall', part: 'module', kind: 'module', brief: 'PLAY SCALE tall end-cap stall module, empty, isolated, no text' }),
    cell({ slug: 'mkt-mod-crate-table', family: 'market-stall', part: 'module', kind: 'module', brief: 'PLAY SCALE low crate-table display module, empty top, no text' }),
    cell({ slug: 'mkt-mod-hanging-rail', family: 'market-stall', part: 'module', kind: 'module', brief: 'PLAY SCALE hanging-goods rail module (empty hooks), isolated, no text' }),
    cell({ slug: 'mkt-con-awning-span', family: 'market-stall', part: 'connector', kind: 'connector', brief: 'PLAY SCALE awning fabric span connector (BLANK — no logos/letters), isolated' }),
    cell({ slug: 'mkt-con-awning-pole', family: 'market-stall', part: 'connector', kind: 'connector', brief: 'PLAY SCALE awning support pole connector, isolated, no text' }),
    cell({ slug: 'mkt-con-stall-beam', family: 'market-stall', part: 'connector', kind: 'connector', brief: 'PLAY SCALE stall-join beam connector, visual only (not snap tile), no text' }),
    cell({ slug: 'mkt-con-crate-shelf', family: 'market-stall', part: 'connector', kind: 'connector', brief: 'PLAY SCALE crate shelf plank connector, isolated, no text' }),
    cell({ slug: 'mkt-con-bunting-blank', family: 'market-stall', part: 'connector', kind: 'connector', brief: 'PLAY SCALE blank colorful bunting strip connector — NO letters/flags-of-nations, isolated' }),
    cell({ slug: 'mkt-con-hook-bar', family: 'market-stall', part: 'connector', kind: 'connector', brief: 'PLAY SCALE short hook bar connector, isolated, no text' }),
  ]),
  ct('mkt1-tok', 'market tokens 3x3', 'black-contact-3x3', [
    cell({ slug: 'mkt-tok-basket-empty', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE empty woven basket token, isolated, no text' }),
    cell({ slug: 'mkt-tok-produce-pile', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE generic colorful produce pile token (no labels), isolated' }),
    cell({ slug: 'mkt-tok-flower-bunch', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE flower bunch token, isolated, no text' }),
    cell({ slug: 'mkt-tok-cheese-wheel', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE plain cheese wheel token, NO brand rind text' }),
    cell({ slug: 'mkt-tok-cloth-bolt', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE folded cloth bolt token, pattern ok, no letters' }),
    cell({ slug: 'mkt-tok-jar-blank', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE blank glass jar token, NO label text' }),
    cell({ slug: 'mkt-tok-scale-pan', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE balance scale pan token (simple), no numbers on dial' }),
    cell({ slug: 'mkt-tok-crate-full', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE small full produce crate token, no text' }),
    cell({ slug: 'mkt-tok-hanging-bag', family: 'market-stall', part: 'token', kind: 'token', brief: 'PLAY SCALE hanging mesh bag token, isolated, no text' }),
  ]),
  ct('mkt1-prob', 'market problems+states 3x3', 'black-contact-3x3', [
    cell({ slug: 'mkt-st-empty-stall', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE conspicuously bare/empty stall problem state, isolated' }),
    cell({ slug: 'mkt-st-collapsed-awning', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE collapsed/sagging awning problem state, isolated, no text' }),
    cell({ slug: 'mkt-st-spilled-basket', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE spilled basket produce problem state, isolated' }),
    cell({ slug: 'mkt-st-torn-awning', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE torn awning flap problem state, isolated, no logos' }),
    cell({ slug: 'mkt-st-broken-shelf', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE broken/sagging shelf problem state, isolated' }),
    cell({ slug: 'mkt-st-stocked-stall', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE neatly stocked stall TRANSFORM counterpart, still no text/logos' }),
    cell({ slug: 'mkt-st-fixed-awning', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE taut repaired awning TRANSFORM counterpart, blank fabric, no text' }),
    cell({ slug: 'mkt-st-upright-basket', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE upright full basket TRANSFORM counterpart to spill, isolated' }),
    cell({ slug: 'mkt-st-fixed-shelf', family: 'market-stall', part: 'problem', kind: 'state', brief: 'PLAY SCALE sturdy level shelf TRANSFORM counterpart, isolated' }),
  ]),
];

/** theatre-wings — wing/flat kit, not empty hall poster */
const THW1_SHEETS = [
  fp('thw1-base', 'theatre-wings empty stage base', [
    cell({
      slug: 'theatre-wings-base',
      family: 'theatre-wings',
      part: 'base',
      kind: 'stage',
      brief:
        'empty theatre stage builder world: open stage floor play band 35-50%, left and right WING pockets as empty pads, blank proscenium silhouette at top edge — no actors, no faces, no curtain text, no logos',
    }),
  ]),
  ct('thw1-mod', 'theatre modules+connectors 4x3', 'black-contact-4x3', [
    cell({ slug: 'thw-mod-flat-left', family: 'theatre-wings', part: 'module', kind: 'module', brief: 'PLAY SCALE left wing flat / scenic panel module (blank art), isolated, no text' }),
    cell({ slug: 'thw-mod-flat-right', family: 'theatre-wings', part: 'module', kind: 'module', brief: 'PLAY SCALE right wing flat module (blank), isolated, no text' }),
    cell({ slug: 'thw-mod-backdrop', family: 'theatre-wings', part: 'module', kind: 'module', brief: 'PLAY SCALE wide blank backdrop flat module, soft color wash, NO letters' }),
    cell({ slug: 'thw-mod-curtain-half', family: 'theatre-wings', part: 'module', kind: 'module', brief: 'PLAY SCALE half-drawn curtain module, blank fabric, no logos' }),
    cell({ slug: 'thw-mod-prop-table', family: 'theatre-wings', part: 'module', kind: 'module', brief: 'PLAY SCALE empty prop table pad module, isolated, no text' }),
    cell({ slug: 'thw-mod-platform-riser', family: 'theatre-wings', part: 'module', kind: 'module', brief: 'PLAY SCALE low stage riser / platform module, empty top, no text' }),
    cell({ slug: 'thw-con-flat-foot', family: 'theatre-wings', part: 'connector', kind: 'connector', brief: 'PLAY SCALE flat stand foot / brace connector, isolated, no text' }),
    cell({ slug: 'thw-con-curtain-rod', family: 'theatre-wings', part: 'connector', kind: 'connector', brief: 'PLAY SCALE curtain rod end connector, isolated, no text' }),
    cell({ slug: 'thw-con-wing-hinge', family: 'theatre-wings', part: 'connector', kind: 'connector', brief: 'PLAY SCALE wing hinge / pivot connector fragment, isolated' }),
    cell({ slug: 'thw-con-sandbag', family: 'theatre-wings', part: 'connector', kind: 'connector', brief: 'PLAY SCALE stage sandbag weight connector, isolated, no text' }),
    cell({ slug: 'thw-con-rope-loop', family: 'theatre-wings', part: 'connector', kind: 'connector', brief: 'PLAY SCALE rope loop / fly-rail rope connector, isolated, no text' }),
    cell({ slug: 'thw-con-clamp', family: 'theatre-wings', part: 'connector', kind: 'connector', brief: 'PLAY SCALE C-clamp / pipe clamp connector, isolated, no text' }),
  ]),
  ct('thw1-tok', 'theatre prop tokens 3x3', 'black-contact-3x3', [
    cell({ slug: 'thw-tok-chair-prop', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE simple stage chair prop token, isolated, no text' }),
    cell({ slug: 'thw-tok-box-prop', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE wooden prop box / crate token, blank, no text' }),
    cell({ slug: 'thw-tok-tree-flat', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE tree silhouette scenic flat token, small, no text' }),
    cell({ slug: 'thw-tok-moon-disc', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE moon disc prop token, isolated, no face' }),
    cell({ slug: 'thw-tok-lantern', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE stage lantern prop token, isolated, no text' }),
    cell({ slug: 'thw-tok-stool', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE stool prop token, isolated, no text' }),
    cell({ slug: 'thw-tok-mask-blank', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE blank comedy/tragedy-neutral MASK shape token — NO letters, still-life object not a face plate for Mia' }),
    cell({ slug: 'thw-tok-script-blank', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE blank folded script / paper prop — pages BLANK, no readable writing' }),
    cell({ slug: 'thw-tok-spotlight-cone', family: 'theatre-wings', part: 'token', kind: 'token', brief: 'PLAY SCALE compact spotlight cone / light pool token, not full stage wash, no text' }),
  ]),
  ct('thw1-prob', 'theatre problems+states 3x3', 'black-contact-3x3', [
    cell({ slug: 'thw-st-wrong-curtain', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE messy wrong/tangled curtain problem state, isolated' }),
    cell({ slug: 'thw-st-fallen-flat', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE fallen scenic flat problem state, isolated' }),
    cell({ slug: 'thw-st-tangled-rope', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE tangled fly rope problem state, isolated' }),
    cell({ slug: 'thw-st-missing-prop-gap', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE empty prop-table with obvious missing-object gap problem, isolated' }),
    cell({ slug: 'thw-st-ripped-backdrop', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE ripped backdrop edge problem state, no text on tear' }),
    cell({ slug: 'thw-st-neat-curtain', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE neatly hung curtain TRANSFORM counterpart, blank fabric' }),
    cell({ slug: 'thw-st-upright-flat', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE upright braced flat TRANSFORM counterpart, isolated' }),
    cell({ slug: 'thw-st-coiled-rope', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE neatly coiled rope TRANSFORM counterpart, isolated' }),
    cell({ slug: 'thw-st-set-prop-table', family: 'theatre-wings', part: 'problem', kind: 'state', brief: 'PLAY SCALE tidy prop table with props in place TRANSFORM counterpart, no text' }),
  ]),
];

/** camping-pitch — pitch kit, not forest place-wash */
const CMP1_SHEETS = [
  fp('cmp1-base', 'camping-pitch empty clearing base', [
    cell({
      slug: 'camping-pitch-base',
      family: 'camping-pitch',
      part: 'base',
      kind: 'stage',
      brief:
        'empty camping clearing builder world: open grass/dirt play band 35-50%, empty tent footprint pad, empty fire-ring pad, soft tree silhouettes at far edges only — no tent fused, no people, no trail signs with letters',
    }),
  ]),
  ct('cmp1-mod', 'camp modules+connectors 4x3', 'black-contact-4x3', [
    cell({ slug: 'cmp-mod-tent-pad', family: 'camping-pitch', part: 'module', kind: 'module', brief: 'PLAY SCALE empty tent footprint / groundsheet pad module, isolated, no text' }),
    cell({ slug: 'cmp-mod-fire-ring', family: 'camping-pitch', part: 'module', kind: 'module', brief: 'PLAY SCALE empty stone fire-ring module (no flames fused), isolated' }),
    cell({ slug: 'cmp-mod-picnic-table', family: 'camping-pitch', part: 'module', kind: 'module', brief: 'PLAY SCALE empty picnic table module, isolated, no text' }),
    cell({ slug: 'cmp-mod-trail-post', family: 'camping-pitch', part: 'module', kind: 'module', brief: 'PLAY SCALE blank trail marker post module — NO letters/arrows with words' }),
    cell({ slug: 'cmp-mod-gear-tarp', family: 'camping-pitch', part: 'module', kind: 'module', brief: 'PLAY SCALE empty gear tarp / ground cloth module, isolated' }),
    cell({ slug: 'cmp-mod-log-bench', family: 'camping-pitch', part: 'module', kind: 'module', brief: 'PLAY SCALE log bench / seat module, empty, isolated, no text' }),
    cell({ slug: 'cmp-con-tent-peg', family: 'camping-pitch', part: 'connector', kind: 'connector', brief: 'PLAY SCALE tent peg connector, isolated, no text' }),
    cell({ slug: 'cmp-con-guy-line', family: 'camping-pitch', part: 'connector', kind: 'connector', brief: 'PLAY SCALE short guy-line stub connector, isolated, no text' }),
    cell({ slug: 'cmp-con-pole-joint', family: 'camping-pitch', part: 'connector', kind: 'connector', brief: 'PLAY SCALE tent pole joint / elbow connector, isolated' }),
    cell({ slug: 'cmp-con-carabiner', family: 'camping-pitch', part: 'connector', kind: 'connector', brief: 'PLAY SCALE carabiner clip connector, isolated, no text' }),
    cell({ slug: 'cmp-con-stake-loop', family: 'camping-pitch', part: 'connector', kind: 'connector', brief: 'PLAY SCALE stake-loop cord connector, isolated, no text' }),
    cell({ slug: 'cmp-con-zipper-pull', family: 'camping-pitch', part: 'connector', kind: 'connector', brief: 'PLAY SCALE zipper pull / tent door toggle connector, isolated' }),
  ]),
  ct('cmp1-tok', 'camp tokens 3x3', 'black-contact-3x3', [
    cell({ slug: 'cmp-tok-tent-collapsed', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE collapsed tent bundle token, isolated, no text' }),
    cell({ slug: 'cmp-tok-tent-pitched', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE pitched small tent token, blank fabric, no logos' }),
    cell({ slug: 'cmp-tok-sleeping-bag', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE rolled sleeping bag token, isolated, no text' }),
    cell({ slug: 'cmp-tok-lantern', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE camp lantern token, isolated, no text' }),
    cell({ slug: 'cmp-tok-backpack', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE backpack token, blank, no logos' }),
    cell({ slug: 'cmp-tok-camp-stool', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE folding camp stool token, isolated' }),
    cell({ slug: 'cmp-tok-cooler', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE cooler/ice-box token, blank, NO brand text' }),
    cell({ slug: 'cmp-tok-kindling', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE kindling / wood bundle token, isolated' }),
    cell({ slug: 'cmp-tok-water-jug', family: 'camping-pitch', part: 'token', kind: 'token', brief: 'PLAY SCALE water jug token, blank, no text' }),
  ]),
  ct('cmp1-prob', 'camp problems+states 3x3', 'black-contact-3x3', [
    cell({ slug: 'cmp-st-fallen-tent', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE fallen / collapsed pitched-tent problem state, isolated' }),
    cell({ slug: 'cmp-st-rain-puddle', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE rain puddle on tent pad problem token, isolated' }),
    cell({ slug: 'cmp-st-wet-gear', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE wet gear heap problem state, isolated' }),
    cell({ slug: 'cmp-st-broken-peg', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE bent/broken tent peg problem state, isolated' }),
    cell({ slug: 'cmp-st-smoky-ring', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE smoky messy fire-ring problem state (controlled smoke puff), no text' }),
    cell({ slug: 'cmp-st-pitched-good', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE neat pitched tent TRANSFORM counterpart, blank fabric' }),
    cell({ slug: 'cmp-st-dry-pad', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE dry clear tent pad TRANSFORM counterpart to puddle' }),
    cell({ slug: 'cmp-st-packed-gear', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE neatly packed gear stack TRANSFORM counterpart, isolated' }),
    cell({ slug: 'cmp-st-fixed-peg', family: 'camping-pitch', part: 'problem', kind: 'state', brief: 'PLAY SCALE straight intact peg TRANSFORM counterpart, isolated' }),
  ]),
];

export const WAVES = {
  'bakery-line': {
    id: 'bakery-line',
    stream: STREAM,
    family: 'bakery-line',
    partition: 'bakery-line',
    title: 'BW-B bakery-line kit (base+modules+tokens+states)',
    sheets: BAK1_SHEETS,
  },
  'market-stall': {
    id: 'market-stall',
    stream: STREAM,
    family: 'market-stall',
    partition: 'market-stall',
    title: 'BW-B market-stall kit (base+modules+tokens+states)',
    sheets: MKT1_SHEETS,
  },
  'theatre-wings': {
    id: 'theatre-wings',
    stream: STREAM,
    family: 'theatre-wings',
    partition: 'theatre-wings',
    title: 'BW-B theatre-wings kit (base+modules+tokens+states)',
    sheets: THW1_SHEETS,
  },
  'camping-pitch': {
    id: 'camping-pitch',
    stream: STREAM,
    family: 'camping-pitch',
    partition: 'camping-pitch',
    title: 'BW-B camping-pitch kit (base+modules+tokens+states)',
    sheets: CMP1_SHEETS,
  },
};

export const WAVE_ORDER = ['bakery-line', 'market-stall', 'theatre-wings', 'camping-pitch'];

function ensurePartition(name) {
  const dir = path.join(STOCKPILE, name);
  fs.mkdirSync(path.join(dir, 'sheets'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'manifests'), { recursive: true });
  return dir;
}

function waveDir(wave) {
  // Match stream A layout: harvested/builder-worlds/<family>/
  return path.join(STOCKPILE, wave.partition);
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sheetBlock(sheet, index) {
  const lines = sheet.cells.map((c, i) => `${i + 1}. ${c.key} [${c.part}/${c.kind}] — ${c.brief}`);
  const layout =
    sheet.format === 'fullpage-landscape'
      ? 'ONE full-page 16:9 landscape PNG (not a grid of tiny stages)'
      : `${sheet.format} black-field contact, L→R T→B`;
  return `SHEET ${index} — ${sheet.title}\nLayout: ${layout}\n${lines.join('\n')}\nKeys: ${sheet.cells.map((c) => c.key).join(',')}`;
}

function buildBrief(wave) {
  const sheets = wave.sheets;
  const nFull = sheets.filter((s) => s.format === 'fullpage-landscape').length;
  const nContact = sheets.length - nFull;
  const kindLine = [
    nFull ? `${nFull} full-page base PNG(s)` : null,
    nContact ? `${nContact} black-field contact sheet(s)` : null,
  ]
    .filter(Boolean)
    .join(' + ');
  return withEslAssetGeneratorBrief(`TASK: Produce **${sheets.length} PNG(s)** (${kindLine}) for ClassIn ESL BUILDER-WORLD stockpile STREAM ${wave.stream}.

${nFull ? STYLE_BASE : ''}
${nContact ? STYLE_CONTACT : ''}

${DEDUPE}

FAMILY ${wave.family} (${wave.id}). Prefix ${PREFIX} only.
KIT RULES:
- Modular free-drag builder: bases + modules + connectors + tokens + problem/transform states.
- Connectors are VISUAL vocabulary — do NOT draw LEGO studs, puzzle tabs, or snap-fit geometry.
- Problem/state cells must read as broken↔fixed or empty↔full WITHOUT any text.
- Generate ONLY the listed cells. Do not research, broaden, or write an essay.
- Keep generating inside THIS task until every listed PNG exists. 5-image cap is per generate_image call, not per task.

${sheets.map((s, i) => sheetBlock(s, i + 1)).join('\n\n')}

Return PNGs, preferably one zip plus CDN links. No essay.`);
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

function emptyInv() {
  return {
    kind: 'builder-worlds-b',
    stream: STREAM,
    prefix: PREFIX,
    families: B_FAMILIES,
    waves: {},
    running_total: {},
  };
}

function readInv() {
  if (!fs.existsSync(INV_PATH)) return emptyInv();
  try {
    return JSON.parse(fs.readFileSync(INV_PATH, 'utf8'));
  } catch {
    return emptyInv();
  }
}

function writeInv(inv) {
  fs.mkdirSync(path.dirname(INV_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(INV_LOCAL_PATH), { recursive: true });
  recomputeTotals(inv);
  const body = JSON.stringify(inv, null, 2);
  fs.writeFileSync(INV_PATH, body);
  fs.writeFileSync(INV_LOCAL_PATH, body);
  return INV_PATH;
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    tasks_used: waves.filter((w) => w.task_id).length,
    sheets_downloaded: waves.reduce((n, w) => n + ((w.sheets && w.sheets.length) || 0), 0),
    bases: items.filter((it) => it.part === 'base').length,
    modules_connectors: items.filter((it) => it.part === 'module' || it.part === 'connector').length,
    tokens: items.filter((it) => it.part === 'token').length,
    problems_states: items.filter((it) => it.part === 'problem').length,
    raw: items.filter((it) => (it.review_status || 'raw') === 'raw').length,
    assets: items.length,
  };
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
    return await fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

function upsertInventory(wave, dump) {
  const inv = readInv();
  const items = [];
  for (const sheet of wave.sheets) {
    for (const c of sheet.cells) {
      items.push({
        key: c.key,
        family: c.family,
        part: c.part,
        kind: c.kind,
        sheet_id: sheet.id,
        format: sheet.format,
        review_status: 'raw',
      });
    }
  }
  inv.waves[wave.id] = {
    id: wave.id,
    stream: wave.stream,
    family: wave.family,
    partition: wave.partition,
    title: wave.title,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: wave.sheets.length,
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({
      file: s.file || path.basename(s.dest || ''),
      bytes: s.bytes,
      name: s.name || null,
    })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  const invPath = writeInv(inv);
  writeDocTotals(inv);
  return invPath;
}

function writeDocTotals(inv) {
  const docPath = path.join(ROOT, TRACKED_DOC_REL);
  let body = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';
  const tot = inv.running_total || {};
  const waveLines = Object.entries(inv.waves || {}).map(
    ([id, w]) =>
      `- **${id}** ${w.family || ''} — ${w.task_url || 'unfired'} — sheets ${(w.sheets && w.sheets.length) || 0}/${w.expected_sheets || 0} — cells ${w.concept_count || 0}${w.finished_at ? ' — done' : ''}`,
  );
  const block = [
    '## Running totals',
    '',
    '| Metric | Count |',
    '|---|---:|',
    `| Tasks | ${tot.tasks_used || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| Bases | ${tot.bases || 0} |`,
    `| Modules+connectors | ${tot.modules_connectors || 0} |`,
    `| Tokens | ${tot.tokens || 0} |`,
    `| Problems/states | ${tot.problems_states || 0} |`,
    `| RAW | ${tot.raw || 0} |`,
    '',
    '## Waves',
    '',
    waveLines.length ? waveLines.join('\n') : '_none yet_',
    '',
  ].join('\n');
  if (body.includes('<!-- TOTALS:START -->') && body.includes('<!-- TOTALS:END -->')) {
    body = body.replace(/<!-- TOTALS:START -->[\s\S]*?<!-- TOTALS:END -->/, `<!-- TOTALS:START -->\n${block}\n<!-- TOTALS:END -->`);
  } else {
    body += `\n<!-- TOTALS:START -->\n${block}\n<!-- TOTALS:END -->\n`;
  }
  fs.writeFileSync(docPath, body);
}

function listAllRuns() {
  const hits = [];
  if (!fs.existsSync(STOCKPILE)) return hits;
  // Walk any run.json under builder-worlds/ (stream A uses <family>/run.json;
  // nested <family>/<wave>/run.json also supported).
  const stack = [STOCKPILE];
  while (stack.length) {
    const dir = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.name === 'run.json') {
        try {
          const run = JSON.parse(fs.readFileSync(p, 'utf8'));
          hits.push({
            family: path.basename(path.dirname(p)),
            wave: run.wave || path.basename(path.dirname(p)),
            runPath: p,
            run,
          });
        } catch {
          /* skip */
        }
      }
    }
  }
  return hits;
}

function otherInFlight(exceptWaveId) {
  for (const hit of listAllRuns()) {
    const r = hit.run;
    if (!r.task_id) continue;
    if (r.finished_at) continue;
    if (hit.wave === exceptWaveId || r.wave === exceptWaveId) continue;
    return { wave: r.wave || hit.wave, task_id: r.task_id, family: hit.family };
  }
  return null;
}

function waveFinished(wave) {
  const runPath = path.join(waveDir(wave), 'run.json');
  if (!fs.existsSync(runPath)) return false;
  try {
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    if (!run.finished_at) return false;
    const sheets = (run.saved || []).filter((s) => (s.bytes || 0) > LARGE_BYTES);
    return sheets.length >= wave.sheets.length;
  } catch {
    return false;
  }
}

function openRun(wave) {
  const runPath = path.join(waveDir(wave), 'run.json');
  if (!fs.existsSync(runPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(runPath, 'utf8'));
  } catch {
    return null;
  }
}

export async function runWave(waveName, opts = {}) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  ensurePartition(wave.partition);
  const OUT_DIR = waveDir(wave);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const fireOnly = process.argv.includes('--fire') || process.argv.includes('--create-only') || opts.fireOnly;
  const pollOnly = process.argv.includes('--poll-only') || opts.pollOnly;
  const sheets = wave.sheets;
  const NEED_SHEETS = sheets.length;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        stream: wave.stream,
        family: wave.family,
        partition: wave.partition,
        prefix: PREFIX,
        concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
        expected_sheets: NEED_SHEETS,
        sheets: sheets.map((s) => ({
          id: s.id,
          title: s.title,
          format: s.format,
          keys: s.cells.map((c) => c.key),
          parts: s.cells.map((c) => c.part),
        })),
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave);
  let taskId = arg('task') || opts.taskId || '';
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'builder-worlds-b',
    wave: wave.id,
    stream: wave.stream,
    family: wave.family,
    partition: wave.partition,
    sheet_dir: SHEET_DIR,
    concept_count: sheets.reduce((n, s) => n + s.cells.length, 0),
    expected_sheets: NEED_SHEETS,
  };

  if (!pollOnly) {
    if (fs.existsSync(RUN_JSON) && !process.env.MANUS_FORCE_RERUN) {
      const prev = JSON.parse(fs.readFileSync(RUN_JSON, 'utf8'));
      if (prev.task_id) {
        console.error('REFUSING duplicate', prev.task_id);
        process.exitCode = 2;
        return prev;
      }
    }
    const busy = otherInFlight(wave.id);
    if (busy) {
      console.error(`REFUSING fire — max 1 in-flight under builder-worlds/. ${busy.wave} ${busy.task_id} still open (${busy.family})`);
      process.exitCode = 3;
      return dump;
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
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, dump));
    console.log(JSON.stringify({ phase: 'created', task_id: taskId, task_url: dump.task_url, wave: wave.id }, null, 2));
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

  let result = await pollGently(taskId);
  let msgs = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
  let saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
  let large = saved.filter((s) => s.bytes > LARGE_BYTES);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() =>
      sendMessage(taskId, {
        force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
        message: withEslAssetGeneratorBrief(
          `Continue THIS task. You returned ${large.length} usable PNG(s); we need exactly ${NEED_SHEETS} PNG(s) listed in the original brief. Do not restart. Do not add text. Do not change the key list. Keep firing generate_image until every listed sheet exists.`,
        ),
      }),
    );
    result = await pollGently(taskId);
    msgs = await listMessagesBackoff(taskId, { order: 'asc', limit: 120, allowMissing: true });
    saved = await downloadSheets(msgs.messages || result.messages || [], SHEET_DIR);
    large = saved.filter((s) => s.bytes > LARGE_BYTES);
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
    dump.task_id = dump.task_id || prev.task_id;
  }
  fs.writeFileSync(RUN_JSON, JSON.stringify(dump, null, 2));
  const invPath = await withInvLock(() => upsertInventory(wave, dump));
  console.log(
    JSON.stringify(
      {
        phase: 'downloaded',
        wave: wave.id,
        family: wave.family,
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

async function runLoop() {
  for (const name of WAVE_ORDER) {
    const wave = WAVES[name];
    if (waveFinished(wave)) {
      console.log(JSON.stringify({ phase: 'skip-done', wave: wave.id }, null, 2));
      continue;
    }
    const open = openRun(wave);
    if (open && open.task_id && !open.finished_at) {
      console.log(JSON.stringify({ phase: 'resume-poll', wave: wave.id, task_id: open.task_id }, null, 2));
      await runWave(name, { pollOnly: true, taskId: open.task_id });
      continue;
    }
    // Shared 1-slot with stream A under builder-worlds/ — wait until free.
    for (let waitN = 0; waitN < 90; waitN += 1) {
      const busy = otherInFlight(wave.id);
      if (!busy) break;
      console.log(JSON.stringify({ phase: 'wait-slot', waitN, busy, sleep_ms: 60_000 }, null, 2));
      await sleep(60_000);
      if (waitN === 89) {
        console.error(`REFUSING fire — slot busy after ~90min. ${busy.wave} ${busy.task_id}`);
        process.exitCode = 3;
        return;
      }
    }
    await runWave(name);
    await sleep(2000);
  }
}

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-builder-worlds-b.mjs');
if (isMain) {
  apiKey();
  for (const f of B_FAMILIES) ensurePartition(f);
  if (process.argv.includes('--loop')) {
    await runLoop();
  } else {
    const names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} or --loop`);
    for (const n of names) await runWave(n);
  }
}
