/**
 * Content-world stockpile JKLM — history through-time, career worlds,
 * music worlds, canyon/glacier cutaways, math share contexts.
 * Stockpile only. No producer wiring. No songs.
 *
 *   node scripts/manus/request-cw-jklm.mjs --wave=j1 --fire
 *   node scripts/manus/request-cw-jklm.mjs --wave=j1 --poll-only
 *   node scripts/manus/request-cw-jklm.mjs --loop
 *
 * L3 = full-page 16:9 world (NOT a grid). L2 = black-field 3×3 companions.
 * Max 1 in-flight. Prefix cw-. Does NOT write harvested/content-worlds/inventory.json (A+B).
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

export const PREFIX = 'cw-';
export const TRACKED_DOC_REL = 'docs/content-worlds-jklm.md';
export const ROLLUP_REL = 'harvested/content-worlds/jklm-inventory.json';
export const BOARD = { width: 1280, height: 590 };
export const FAMILIES = {
  history: 'harvested/content-worlds/history-through-time',
  careers: 'harvested/content-worlds/careers-public-services',
  music: 'harvested/content-worlds/music-media',
  wonders: 'harvested/content-worlds/natural-wonders',
  math: 'harvested/content-worlds/math-worlds',
};

const LOCK_ROOT = path.join(ROOT, 'harvested/content-worlds');
const LOCK = path.join(LOCK_ROOT, '.inv.lock');
const POLL_MS = 30_000;
const TIMEOUT_MS = 70 * 60 * 1000;
const RATE_WAIT_MS = 90_000;

const WORLD_STYLE = `L3 ADAPTABLE PRESET WORLD — one independent full-bleed 16:9 landscape PNG (~${BOARD.width}×${BOARD.height} ClassIn board).

THIS IS NOT A CONTACT SHEET. The scene fills the entire frame. No gutters. No 2×2 grid. No poster border.

WHAT WE WANT:
- Children's-book / museum-education illustration. Soft readable color. Age-respectful.
- ONE strong visual premise. Open foreground play zone (~35–50%). Furniture / landform mass at EDGES or as the cutaway wall.
- Through-time, workplace-as-system, music-world, landform-cutaway, or share-place — not a generic empty room.
- Clear ground plane. Kids can stand and drag tokens.

HARD FAIL:
- 2×2 or 3×3 grid of mini-posters
- Cinematic movie still (sunset volcano, fairy-tale castle, concert-hall glamour shot)
- Quiet pastel wash, worksheet chrome, title card, infographic, labeled diagram
- People, faces, animals as subjects (no horses, no fish-heroes, no musicians)
- Readable text, letters, numbers, dates, years, centuries, logos, flags, maps
- Music notation: no staves, notes, clefs, titles, lyrics
- Math precision: no marked rulers, clock faces, graphs, axes, ten-frames
- Empty diner/kitchen/classroom/canyon-dirt-path/radio-studio-floor clones

quality: default ONLY (never high).`;

const COMP_STYLE = `L2 COMPANION SHEET — one PNG, pure #000000 black field, 3×3 grid, one isolated object per cell, clear gutters, PLAY-SCALE keyable cutouts.
NO tiny bolts. NO text, logos, labels, dates, notation, ruler marks. quality: default ONLY.`;

const DEDUPE = `DO NOT CLONE:
A+B: water-cycle stages, reef/tide-pool empty biomes, habitat animals.
CDE: sorting hall/depot, radio booth broadcast, newsroom, ocean-depth trench, reef wall, volcano, cave, archaeology strata trench, picnic-plan mission, farm-to-kitchen, parcel packing.
S1: classroom, kitchen, bathroom, bedroom, canyon-floor/path, empty radio-studio.
S2 parked junk: space, volcano, castle, concert-hall. Leftover quiet recording-studio carpet.
S3: empty radio-studio, rehearsal-hall (piano + stacked chairs), newsroom, greenroom.
S4 F: chef/dentist/photo/tailor/mechanic/teacher/librarian/coach TOOLS.
NO SONGS. NO LEADERS. NO BATTLES. NO FLAGS-AS-HEROES.`;

function world(slug, brief, archetypes, extra = {}) {
  return {
    key: `${PREFIX}${slug}`,
    concept: slug,
    layer: 'L3',
    role: 'hero-world',
    format: 'fullpage-16x9',
    archetypes,
    brief,
    ...extra,
  };
}

function companion(slug, cells, extra = {}) {
  return {
    key: `${PREFIX}${slug}`,
    concept: slug,
    layer: 'L2',
    role: 'companion-sheet',
    format: 'black-field-3x3',
    cells,
    brief: cells.map((c, i) => `${i + 1}. ${c.key} — ${c.brief}`).join('\n'),
    ...extra,
  };
}

function tok(slug, brief) {
  return { key: `${PREFIX}${slug}`, brief };
}

function pack(id, family, stream, title, subfamily, worlds, companionSheet) {
  return {
    id,
    family,
    stream,
    title,
    subfamily,
    worlds,
    companion: companionSheet,
    outputs: [...worlds, companionSheet],
  };
}

const J1_WORLDS = [
  world('hist-home-shelter', 'THROUGH-TIME HOME era 1: round timber/thatch dwelling, hearth pit at back, open dirt play floor 35–50%, utensils at edges, SAME home-function first era, no people no animals no dates no text', ['compare', 'sequence', 'build-the-world'], { subfamily: 'homes' }),
  world('hist-home-timber', 'THROUGH-TIME HOME era 2: timber-frame hall, trestle table at back EDGE, open wood play floor, next era of the SAME home-function, no people no house numbers no dates', ['compare', 'sequence'], { subfamily: 'homes' }),
  world('hist-home-brick', 'THROUGH-TIME HOME era 3: brick townhouse parlor, iron stove at side EDGE, open play floor, next era, no people no address numbers no dates', ['compare', 'sequence'], { subfamily: 'homes' }),
  world('hist-home-apartment', 'THROUGH-TIME HOME era 4: modern apartment living, sofa + blank TV at back EDGE, balcony window, open play floor, LAST era of SAME home-function, NOT a generic S3 living-room clone, no people no text no dates', ['compare', 'sequence'], { subfamily: 'homes' }),
];
const J1_COMP = companion('hist-home-tokens-3x3', [
  tok('hist-hearth-stone', 'hearth stone / fire ring, still-life'),
  tok('hist-trestle-table', 'small trestle table, still-life'),
  tok('hist-iron-stove', 'small iron stove, still-life'),
  tok('hist-sofa-simple', 'simple sofa, still-life'),
  tok('hist-thatch-bundle', 'thatch bundle, still-life'),
  tok('hist-brick-stack', 'small brick stack, still-life'),
  tok('hist-window-sash', 'empty window sash, still-life'),
  tok('hist-oil-lamp', 'oil lamp, no flame text, still-life'),
  tok('hist-floor-rug', 'simple floor rug, still-life'),
], { subfamily: 'homes' });

const J2_WORLDS = [
  world('hist-kitchen-hearth', 'THROUGH-TIME KITCHEN era 1: open cooking hearth with hanging pot, stone play floor 35–50%, utensils at edges, NOT S1 modern kitchen, no people no dates no text', ['compare', 'sequence'], { subfamily: 'kitchens' }),
  world('hist-kitchen-range', 'THROUGH-TIME KITCHEN era 2: black iron range along back wall, dresser at EDGE, open play floor, no people no brand no dates', ['compare', 'sequence'], { subfamily: 'kitchens' }),
  world('hist-kitchen-gas', 'THROUGH-TIME KITCHEN era 3: early enamel gas-range kitchen, enamel table at EDGE, open floor, DISTINCT from S1 kitchen, blank dials NO numbers, no people no dates', ['compare', 'sequence'], { subfamily: 'kitchens' }),
  world('hist-kitchen-modern', 'THROUGH-TIME KITCHEN era 4: modern island kitchen, appliances at EDGES, blank glass faces, open play floor, last era of SAME kitchen-function, NOT CDE kitchen-as-food-destination, no fruit-bowl clutter, no people no text', ['compare', 'sequence'], { subfamily: 'kitchens' }),
];
const J2_COMP = companion('hist-kitchen-tokens-3x3', [
  tok('hist-hanging-pot', 'hanging cook pot, still-life'),
  tok('hist-bellows', 'fireplace bellows, still-life'),
  tok('hist-kettle-iron', 'iron kettle, still-life'),
  tok('hist-enamel-pot', 'enamel saucepan, still-life'),
  tok('hist-wood-spoon', 'wooden spoon, still-life'),
  tok('hist-range-lid', 'iron range hotplate lid, still-life'),
  tok('hist-mixing-bowl-empty', 'empty mixing bowl, still-life'),
  tok('hist-cutting-board', 'blank cutting board, still-life'),
  tok('hist-tea-towel', 'folded tea towel, still-life'),
], { subfamily: 'kitchens' });

const J3_WORLDS = [
  world('hist-timeline-rail', 'BLANK TIMELINE STAGE: horizontal museum rail with 4 empty square frames in a row, open floor below for kids to stand, absolutely NO years dates numbers letters, empty frames for later era tiles', ['sequence', 'compare', 'build-the-world'], { subfamily: 'timeline' }),
  world('hist-timeline-plinths', 'BLANK TIMELINE STAGE: 4 empty stepped plinths left-to-right, blank tops for dropping era tiles, open floor in front, NO dates numbers letters', ['sequence', 'compare'], { subfamily: 'timeline' }),
  world('hist-timeline-split', 'BLANK BEFORE/AFTER STAGE: floor split by a blank vertical gutter into two empty halves, open floors both sides, NO words, no dates', ['compare', 'before-after'], { subfamily: 'timeline' }),
  world('hist-timeline-dock', 'BLANK TIMELINE STAGE: left dock of 4 empty portrait slots + right large empty comparison floor, NO labels dates numbers', ['sequence', 'compare'], { subfamily: 'timeline' }),
];
const J3_COMP = companion('hist-timeline-tokens-3x3', [
  tok('hist-empty-frame', 'empty square picture frame, still-life'),
  tok('hist-empty-plinth', 'empty museum plinth, still-life'),
  tok('hist-era-tile-blank', 'blank square tile, still-life'),
  tok('hist-clip-peg', 'wooden clip peg, still-life'),
  tok('hist-stand-easel', 'tiny blank easel, still-life'),
  tok('hist-arrow-token', 'simple chevron arrow token, NO letters, still-life'),
  tok('hist-dot-token', 'plain round token, still-life'),
  tok('hist-bar-rail', 'short museum rail segment, still-life'),
  tok('hist-gutter-strip', 'blank vertical gutter strip, still-life'),
], { subfamily: 'timeline' });

const J4_WORLDS = [
  world('hist-school-circle', 'THROUGH-TIME SCHOOL era 1: outdoor teaching circle, low stone benches around open dirt play floor, no people no animals no dates no text', ['compare', 'sequence'], { subfamily: 'schools' }),
  world('hist-school-oneroom', 'THROUGH-TIME SCHOOL era 2: one-room schoolhouse, recitation bench at back EDGE, wood stove at side, blank blackboard (NO chalk letters), open wood play floor, no people no dates', ['compare', 'sequence'], { subfamily: 'schools' }),
  world('hist-school-desks', 'THROUGH-TIME SCHOOL era 3: wooden desks in rows at SIDES/BACK only, open aisle play floor, blank boards, NOT the generic S1 modern classroom, no people no letters no dates', ['compare', 'sequence'], { subfamily: 'schools' }),
  world('hist-school-later', 'THROUGH-TIME SCHOOL era 4: SAME window-wall silhouette as the desk classroom, blank screens at back EDGE, open play floor, last era of SAME school-function, no people no logos no dates', ['compare', 'sequence'], { subfamily: 'schools' }),
];
const J4_COMP = companion('hist-school-tokens-3x3', [
  tok('hist-slate-blank', 'blank slate, NO letters, still-life'),
  tok('hist-ink-pot', 'ink pot, still-life'),
  tok('hist-wood-desk', 'small wood school desk, still-life'),
  tok('hist-school-bell', 'hand bell, still-life'),
  tok('hist-globe-blank', 'blank globe, NO country names, still-life'),
  tok('hist-chalk-stick', 'stick of chalk, still-life'),
  tok('hist-book-closed', 'closed book, NO title, still-life'),
  tok('hist-bench-short', 'short recitation bench, still-life'),
  tok('hist-backpack-simple', 'simple backpack, no logo'),
], { subfamily: 'schools' });

const J5_WORLDS = [
  world('hist-transport-track', 'THROUGH-TIME TRANSPORT era 1: dirt cart-track with ruts, empty parked cart at EDGE (NO animal), open path play floor, fence at far edge, no people no dates no text', ['compare', 'sequence', 'route'], { subfamily: 'transport' }),
  world('hist-transport-canal', 'THROUGH-TIME TRANSPORT era 2: canal towpath, water at BACK edge, empty barge silhouette at side EDGE, open towpath play floor, no people no animals no dates', ['compare', 'sequence', 'route'], { subfamily: 'transport' }),
  world('hist-transport-rail', 'THROUGH-TIME TRANSPORT era 3: early wooden rail platform, small shelter at EDGE, blank destination board (NO letters/numbers), DISTINCT from modern train-platform and from CDE station-as-journey, open platform play, no people no dates', ['compare', 'sequence'], { subfamily: 'transport' }),
  world('hist-transport-street', 'THROUGH-TIME TRANSPORT era 4: paved street with sidewalks, tram-rail hint, blank signs (NO letters), open street play floor, NOT an S2 street-town clone and NOT CDE bike-path journey, no people no plates no dates', ['compare', 'sequence'], { subfamily: 'transport' }),
];
const J5_COMP = companion('hist-transport-tokens-3x3', [
  tok('hist-cart-empty', 'empty two-wheel cart, no animal, still-life'),
  tok('hist-barge-token', 'simple barge token, still-life'),
  tok('hist-rail-tie', 'rail and sleeper chunk, still-life'),
  tok('hist-tram-token', 'simple tram token, no numbers'),
  tok('hist-wheel-wood', 'wooden cart wheel, still-life'),
  tok('hist-lantern-road', 'road lantern, still-life'),
  tok('hist-ticket-blank', 'blank ticket stub, NO letters'),
  tok('hist-suitcase-old', 'old suitcase, no stickers'),
  tok('hist-bike-simple', 'simple bicycle, still-life'),
], { subfamily: 'transport' });

const J6_WORLDS = [
  world('hist-comms-writing', 'THROUGH-TIME COMMUNICATION era 1: writing-room with pigeonholes + desk at EDGES, blank papers (NO letters), open play floor, no people no dates', ['compare', 'sequence'], { subfamily: 'communication' }),
  world('hist-comms-telegraph', 'THROUGH-TIME COMMUNICATION era 2: telegraph office, sounder/key as furniture at back EDGE, blank tape reel (NO Morse letters), open play floor, no people no dates', ['compare', 'sequence'], { subfamily: 'communication' }),
  world('hist-comms-switchboard', 'THROUGH-TIME COMMUNICATION era 3: switchboard room, jack-board as dots at back (NO numbers), empty chair at EDGE, open play floor, no people no dates', ['compare', 'sequence'], { subfamily: 'communication' }),
  world('hist-comms-video', 'THROUGH-TIME COMMUNICATION era 4: video-call room, blank screens, camera stand at EDGE, open play floor, NOT C7 newsroom/radio-booth, no logos no letters no dates', ['compare', 'sequence'], { subfamily: 'communication' }),
];
const J6_COMP = companion('hist-comms-tokens-3x3', [
  tok('hist-quill', 'quill pen, still-life'),
  tok('hist-scroll', 'rolled blank scroll, still-life'),
  tok('hist-pigeonhole', 'pigeonhole cubby, still-life'),
  tok('hist-telegraph-key', 'telegraph key, still-life'),
  tok('hist-headset-old', 'old operator headset, still-life'),
  tok('hist-patch-cord', 'patch cord, still-life'),
  tok('hist-camera-stand', 'camera on stand, no brand'),
  tok('hist-blank-screen', 'blank tablet screen, still-life'),
  tok('hist-envelope-blank', 'blank envelope, NO address'),
], { subfamily: 'communication' });

const J7_WORLDS = [
  world('hist-home-before', 'BEFORE plate: timber hall home matching hist-home-timber, empty play floor, same door/window placement the after plate will keep, no people no dates no text', ['before-after', 'compare'], { subfamily: 'compare' }),
  world('hist-home-after', 'AFTER plate: later brick/apartment of the SAME footprint (door and window aligned with before), empty play floor, no people no dates no text', ['before-after', 'compare'], { subfamily: 'compare' }),
  world('hist-school-before', 'BEFORE plate: one-room schoolhouse matching hist-school-oneroom, same door/window, empty floor, no people no dates', ['before-after', 'compare'], { subfamily: 'compare' }),
  world('hist-school-after', 'AFTER plate: later classroom of the SAME schoolhouse footprint, empty floor, no people no dates no letters on boards', ['before-after', 'compare'], { subfamily: 'compare' }),
];
const J7_COMP = companion('hist-compare-tokens-3x3', [
  tok('hist-door-wood', 'wood door, still-life'),
  tok('hist-door-modern', 'modern door, still-life'),
  tok('hist-lamp-oil', 'oil lamp, still-life'),
  tok('hist-lamp-electric', 'simple electric lamp, still-life'),
  tok('hist-desk-old', 'old school desk, still-life'),
  tok('hist-desk-new', 'modern blank desk, still-life'),
  tok('hist-stove-old', 'iron stove token, still-life'),
  tok('hist-hob-blank', 'blank cooktop, no knobs numbers'),
  tok('hist-compare-tile', 'two-square blank compare tile, still-life'),
], { subfamily: 'compare' });

const K1_WORLDS = [
  world('career-dig-grid', 'DIG SITE WORKPLACE: string excavation grid over open trench play floor 35–50%, shade tent at EDGE, NOT CDE archaeology-strata cutaway (this is the workplace you stand in), no people no bones-as-heroes no dates no text', ['build-the-world', 'sort'], { subfamily: 'dig' }),
  world('career-dig-finds', 'same dig workplace: finds-table under shade, empty trays on the table as the stage, open dirt play floor, NOT S4 sorting-tray as hero, no people no labels', ['sort', 'reveal'], { subfamily: 'dig' }),
  world('career-marine-tanks', 'MARINE LAB WORLD: aquaria along the back wall, wet-lab tile play floor center, NOT a zoo/ocean story plate, NOT AB reef biome, no fish-as-heroes, no people no tank labels', ['build-the-world', 'observe'], { subfamily: 'marine' }),
  world('career-marine-wet', 'same marine lab: stainless wet table + hose at EDGE, empty trays, open tile play floor, no handheld tool close-ups (S4), no people no text', ['build-the-world', 'sort'], { subfamily: 'marine' }),
];
const K1_COMP = companion('career-dig-marine-tokens-3x3', [
  tok('career-grid-peg', 'string-grid peg, still-life'),
  tok('career-finds-tray', 'empty finds tray, still-life'),
  tok('career-sample-bag', 'blank sample bag, NO letters'),
  tok('career-shade-weight', 'tent shade weight, still-life'),
  tok('career-net-scoop', 'small aquarium scoop net, still-life'),
  tok('career-sample-crate', 'sample crate, still-life'),
  tok('career-hose-nozzle', 'lab hose nozzle, still-life'),
  tok('career-wet-tray', 'stainless wet tray, still-life'),
  tok('career-clip-board-blank', 'blank clipboard, NO letters'),
], { subfamily: 'dig' });

const L1_WORLDS = [
  world('music-orchestra-floor', 'ORCHESTRA WORLD: empty seating-section floor wedges (front/center/back/side patches), a few empty chairs at EDGES, open play floor to place players later, NO notation staves notes clefs, NOT a cinematic concert-hall poster, no people', ['build-the-world', 'sort'], { subfamily: 'orchestra' }),
  world('music-orchestra-pit', 'same orchestra: sunken pit below stage lip, empty pit play floor, rail at edge, no people no notation no text', ['build-the-world'], { subfamily: 'orchestra' }),
  world('music-orchestra-wing', 'same orchestra: backstage wing, curtains at EDGE, empty instrument cases, open wing play floor, no people no logos', ['build-the-world'], { subfamily: 'orchestra' }),
  world('music-orchestra-riser', 'same orchestra: empty choir/riser steps, open stage play floor in front, no people no notation no text', ['build-the-world'], { subfamily: 'orchestra' }),
];
const L1_COMP = companion('music-orchestra-tokens-3x3', [
  tok('music-stand-blank', 'music stand with BLANK white board, NO staves notes clefs'),
  tok('music-chair-black', 'orchestra chair, still-life'),
  tok('music-mute-token', 'brass mute, still-life'),
  tok('music-case-violin', 'violin case closed, still-life'),
  tok('music-case-flute', 'flute case closed, still-life'),
  tok('music-podium-empty', 'empty conductor podium, still-life'),
  tok('music-baton', 'baton, still-life'),
  tok('music-rostrum', 'short choir step, still-life'),
  tok('music-curtain-swag', 'curtain swag token, still-life'),
], { subfamily: 'orchestra' });

const L2_WORLDS = [
  world('music-rehearsal-stands', 'REHEARSAL WORLD: field of EMPTY music stands with blank white boards — absolutely NO staves notes clefs titles, open play floor between stands, DISTINCT from S3 empty rehearsal-hall (that was piano + stacked chairs), no people', ['build-the-world', 'sort'], { subfamily: 'rehearsal' }),
  world('music-rehearsal-cases', 'same rehearsal: wall of empty instrument cases at EDGE, open play floor center, no people no logos no notation', ['build-the-world'], { subfamily: 'rehearsal' }),
  world('music-rehearsal-podium', 'same rehearsal: grand piano at back EDGE, empty conductor podium, open wood play floor, no people no scores', ['build-the-world'], { subfamily: 'rehearsal' }),
  world('music-rehearsal-horseshoe', 'same rehearsal: chairs in a horseshoe, open center play floor, stands present but boards BLANK no notation, no people', ['build-the-world'], { subfamily: 'rehearsal' }),
];
const L2_COMP = companion('music-rehearsal-tokens-3x3', [
  tok('music-stand-tall', 'tall blank music stand, NO notation'),
  tok('music-piano-lid', 'piano lid closed, still-life'),
  tok('music-metronome-blank', 'metronome with BLANK face, NO numbers'),
  tok('music-case-horn', 'horn case closed, still-life'),
  tok('music-case-drum', 'snare case closed, still-life'),
  tok('music-tuner-blank', 'clip tuner, blank screen, no letters'),
  tok('music-pencil', 'pencil, still-life'),
  tok('music-water-bottle', 'water bottle, no brand'),
  tok('music-chair-fold', 'folding chair, still-life'),
], { subfamily: 'rehearsal' });

const L3_WORLDS = [
  world('music-record-cutaway', 'RECORDING WORLD CUTAWAY: glass between control room and live room, empty play floors both sides, blank screens, NOT S2 leftover quiet recording-studio carpet, NOT C7 radio-booth, NO notation, no people no logos', ['cutaway', 'build-the-world'], { subfamily: 'recording' }),
  world('music-record-iso', 'same studio: small isolation booth, window, open booth play floor, blank door, no people no letters', ['build-the-world'], { subfamily: 'recording' }),
  world('music-record-baffles', 'same studio: live room with gobo baffles at EDGES, empty mic stands, open play floor center, no people no notation', ['build-the-world'], { subfamily: 'recording' }),
  world('music-record-vocal', 'same studio: vocal booth, pop-filter stand empty, foam at edges, open play floor, no people no lyrics no notation', ['build-the-world'], { subfamily: 'recording' }),
];
const L3_COMP = companion('music-record-tokens-3x3', [
  tok('music-gobo', 'gobo baffle panel, still-life'),
  tok('music-pop-filter', 'pop filter on stand, still-life'),
  tok('music-xlr-cable', 'coiled cable, still-life'),
  tok('music-headphone-cans', 'studio headphones, still-life'),
  tok('music-mic-stand-empty', 'empty mic stand, still-life'),
  tok('music-amp-combo', 'small combo amp, NO logo'),
  tok('music-road-case', 'road case, still-life'),
  tok('music-foam-wedge', 'foam wedge, still-life'),
  tok('music-talkback-blank', 'blank talkback box, NO letters'),
], { subfamily: 'recording' });

const M1_WORLDS = [
  world('wonder-canyon-layers', 'CANYON GEOLOGIC CROSS-SECTION: stacked rock strata as a cutaway wall, river at the bottom, educational diagram quality NOT a scenic sunset poster, NOT S1 canyon-floor dirt path, NOT CDE volcano, open river-edge play floor in the foreground, no people no labels no scale numbers', ['cutaway', 'compare'], { subfamily: 'canyon' }),
  world('wonder-canyon-switchback', 'same canyon: pale switchback trail zigzag on the cliff, open path play floor in the foreground, route readable at a glance, no people no text no dates', ['route', 'seek-and-find'], { subfamily: 'canyon' }),
  world('wonder-canyon-alcove', 'same canyon: hidden overhang alcove pocket, open sand play floor inside the alcove, cliff mass at edges, no people no text', ['seek-and-find', 'reveal'], { subfamily: 'canyon' }),
  world('wonder-canyon-river', 'same canyon: looking along the river between walls, open wet-sand play floor center, walls at edges, not a fantasy gorge poster, no people no text', ['route', 'build-the-world'], { subfamily: 'canyon' }),
];
const M1_COMP = companion('wonder-canyon-tokens-3x3', [
  tok('wonder-strata-block', 'layered rock block, still-life, no labels'),
  tok('wonder-switchback-token', 'zigzag trail token, still-life'),
  tok('wonder-alcove-stone', 'overhang stone, still-life'),
  tok('wonder-river-pebble', 'smooth river pebble, still-life'),
  tok('wonder-canyon-ledge', 'narrow ledge token, still-life'),
  tok('wonder-sand-fan', 'sand fan deposit, still-life'),
  tok('wonder-cactus-small', 'small cactus, still-life'),
  tok('wonder-water-bottle-hike', 'hike bottle, no brand'),
  tok('wonder-hat-sun', 'sun hat, still-life'),
], { subfamily: 'canyon' });

const M2_WORLDS = [
  world('wonder-glacier-layers', 'GLACIER ICE STRATIGRAPHY CROSS-SECTION: layered firn/ice/rock, educational cutaway not a mountain poster, open ice-edge play floor in foreground, no people no labels no thickness numbers', ['cutaway', 'compare'], { subfamily: 'glacier' }),
  world('wonder-glacier-crevasse', 'glacier CREVASSE CROSS-SECTION: crack opening in ice, open ice play floor beside the crevasse, no people no danger signs no text', ['cutaway', 'reveal'], { subfamily: 'glacier' }),
  world('wonder-glacier-moraine', 'glacier moraine path: rocky debris path, ice wall at back EDGE, open gravel play floor center, no people no text', ['route', 'build-the-world'], { subfamily: 'glacier' }),
  world('wonder-glacier-snout', 'glacier snout/terminus: ice ending in melt stream, open gravel play floor center, not a cinematic mountain still, no people no text', ['route', 'compare'], { subfamily: 'glacier' }),
];
const M2_COMP = companion('wonder-glacier-tokens-3x3', [
  tok('wonder-ice-block', 'layered ice block, still-life, no labels'),
  tok('wonder-crevasse-wedge', 'ice wedge token, still-life'),
  tok('wonder-moraine-rock', 'moraine rock, still-life'),
  tok('wonder-melt-pool', 'small melt pool token, still-life'),
  tok('wonder-crampon', 'crampon, still-life'),
  tok('wonder-ice-axe', 'ice axe, still-life'),
  tok('wonder-snow-bridge', 'snow-bridge token, still-life'),
  tok('wonder-glove-wool', 'wool glove, still-life'),
  tok('wonder-thermos', 'thermos, still-life'),
], { subfamily: 'glacier' });

const MATH1_WORLDS = [
  world('math-market-baskets', 'MATH SHARE CONTEXT: market stall, 6 empty baskets in two rows of 3 for sharing language, produce crates at EDGES, hanging scale with BLANK face (NO numerals ticks), open play floor, NOT CDE market-unload, no people no prices no graphs', ['sort', 'compare', 'build-the-world'], { subfamily: 'market' }),
  world('math-market-plates', 'same market: counter with two empty plates + fruit bowl, open play floor, sharing/more-fewer language place, no numbers no people', ['compare', 'sort'], { subfamily: 'market' }),
  world('math-site-bricks', 'MATH SHARE CONTEXT: building site, brick stacks of different HEIGHTS as visual quantity, open dirt play floor, NO numerals on stacks, NO marked rulers, no people', ['compare', 'build-the-world'], { subfamily: 'site' }),
  world('math-site-beams', 'same site: beams of different LENGTHS on trestles, NO ruler marks ticks numbers, open play floor, no people', ['compare', 'measure-without-marks'], { subfamily: 'site' }),
];
const MATH1_COMP = companion('math-share-tokens-3x3', [
  tok('math-basket-empty', 'empty share basket, still-life'),
  tok('math-plate-empty', 'empty plate, still-life'),
  tok('math-bowl-empty', 'empty bowl, still-life'),
  tok('math-scale-blank', 'hanging scale, BLANK face, NO numerals'),
  tok('math-brick', 'single brick, still-life'),
  tok('math-brick-stack', 'short brick stack, NO numbers'),
  tok('math-beam-short', 'short unmarked beam, still-life'),
  tok('math-beam-long', 'longer unmarked beam, still-life'),
  tok('math-wheelbarrow-empty', 'empty wheelbarrow, still-life'),
], { subfamily: 'market' });

export const WAVES = {
  j1: pack('cw-j1-homes', 'history', 'J', 'CW JKLM J1 homes through time + companions', 'homes', J1_WORLDS, J1_COMP),
  j2: pack('cw-j2-kitchens', 'history', 'J', 'CW JKLM J2 kitchens through time + companions', 'kitchens', J2_WORLDS, J2_COMP),
  j3: pack('cw-j3-timeline', 'history', 'J', 'CW JKLM J3 blank timeline stages + companions', 'timeline', J3_WORLDS, J3_COMP),
  j4: pack('cw-j4-schools', 'history', 'J', 'CW JKLM J4 schools through time + companions', 'schools', J4_WORLDS, J4_COMP),
  j5: pack('cw-j5-transport', 'history', 'J', 'CW JKLM J5 transport through time + companions', 'transport', J5_WORLDS, J5_COMP),
  j6: pack('cw-j6-comms', 'history', 'J', 'CW JKLM J6 communication through time + companions', 'communication', J6_WORLDS, J6_COMP),
  j7: pack('cw-j7-before-after', 'history', 'J', 'CW JKLM J7 home/school before-after + companions', 'compare', J7_WORLDS, J7_COMP),
  k1: pack('cw-k1-dig-marine', 'careers', 'K', 'CW JKLM K1 dig workplace + marine lab + companions', 'dig', K1_WORLDS, K1_COMP),
  l1: pack('cw-l1-orchestra', 'music', 'L', 'CW JKLM L1 orchestra worlds + companions', 'orchestra', L1_WORLDS, L1_COMP),
  l2: pack('cw-l2-rehearsal', 'music', 'L', 'CW JKLM L2 rehearsal worlds + companions', 'rehearsal', L2_WORLDS, L2_COMP),
  l3: pack('cw-l3-recording', 'music', 'L', 'CW JKLM L3 recording worlds + companions', 'recording', L3_WORLDS, L3_COMP),
  m1: pack('cw-m1-canyon', 'wonders', 'M', 'CW JKLM M1 canyon cutaway worlds + companions', 'canyon', M1_WORLDS, M1_COMP),
  m2: pack('cw-m2-glacier', 'wonders', 'M', 'CW JKLM M2 glacier cutaway worlds + companions', 'glacier', M2_WORLDS, M2_COMP),
  math1: pack('cw-math1-share', 'math', 'MATH', 'CW JKLM MATH1 market/building share contexts + companions', 'market', MATH1_WORLDS, MATH1_COMP),
};

export const WAVE_ORDER = [
  'j1', 'j3', 'j2', 'm1', 'l1', 'j4', 'k1', 'm2', 'l3', 'math1', 'j5', 'j6', 'j7', 'l2',
];

function familyDir(wave) {
  return path.join(ROOT, FAMILIES[wave.family]);
}

function expectedSheets(wave) {
  return wave.outputs.length;
}

function arg(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function isRateLimitError(err) {
  const msg = String(err && err.message ? err.message : err);
  return /\b429\b/.test(msg) || /rate limit/i.test(msg) || /resource_exhausted/i.test(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRateBackoff(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isRateLimitError(err)) throw err;
    console.error(`429 — waiting ${RATE_WAIT_MS / 1000}s then one retry`);
    await sleep(RATE_WAIT_MS);
    try {
      return await fn();
    } catch (err2) {
      if (!isRateLimitError(err2)) throw err2;
      const wait2 = RATE_WAIT_MS * 2;
      console.error(`429 again — backing off ${wait2 / 1000}s, not firing more`);
      await sleep(wait2);
      throw err2;
    }
  }
}

function liveRun(runPath) {
  if (!fs.existsSync(runPath)) return false;
  const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  const st = String(prev.agent_status || '');
  return Boolean(prev.task_id) && !prev.finished_at && st !== 'stopped' && st !== 'error';
}

function otherInFlight(thisWaveId) {
  const hits = [];
  for (const name of WAVE_ORDER) {
    const other = WAVES[name];
    if (!other || other.id === thisWaveId) continue;
    if (liveRun(path.join(familyDir(other), other.id, 'run.json'))) hits.push(other.id);
  }
  return hits;
}

function buildBrief(wave) {
  const worldBlocks = wave.worlds.map((w, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `WORLD ${i + 1} — filename ${n}-${w.key}.png — FULL-PAGE 16:9 (entire frame is this one scene; NOT a grid).
Key: ${w.key}
Archetypes: ${w.archetypes.join(', ')}
Brief: ${w.brief}`;
  }).join('\n\n');
  const c = wave.companion;
  const compN = String(wave.worlds.length + 1).padStart(2, '0');
  return withEslAssetGeneratorBrief(`TASK: Produce **${expectedSheets(wave)} PNG files** for ClassIn ESL content-world stockpile ${wave.id}.

${wave.worlds.length} files are L3 FULL-PAGE WORLDS.
1 file is an L2 BLACK-FIELD 3×3 COMPANION SHEET.

GENERATE CALL PLAN:
- Call 1: the ${wave.worlds.length} independent 16:9 world PNGs (one scene per image; never pack worlds into a grid).
- Call 2: the single companion contact sheet.
Keep firing generate_image inside THIS task until every listed PNG exists. The 5-image cap is per call, not per task.

${WORLD_STYLE}

${DEDUPE}

STREAM ${wave.stream} — ${wave.title}
Subfamily: ${wave.subfamily}

HARD RULES:
- Generate ONLY the listed worlds + one companion sheet. Do not review, research, broaden, add songs, add leaders, add battles, or add extra tools.
- NO baked readable text, labels, numbers, dates, logos, maps, flags, worksheets, notation, ruler marks, clock faces, graphs.
- quality: default ONLY.

${worldBlocks}

COMPANION SHEET — filename ${compN}-${c.key}.png
${COMP_STYLE}
Key: ${c.key}
Cells left→right, top→bottom:
${c.brief}

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
  const r = spawnSync('tar', ['-xf', zipPath, '-C', outDir], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status === 0) return;
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (ps.status !== 0) {
    throw new Error(
      `Failed to extract zip (tar: ${r.stderr || r.status}; Expand-Archive: ${ps.stderr || ps.status})`,
    );
  }
}

function clearNumberedSheets(sheetDir) {
  if (!fs.existsSync(sheetDir)) return;
  for (const f of fs.readdirSync(sheetDir)) {
    if (/^\d{2}(-.*)?\.(png|jpg|jpeg|webp)$/i.test(f) && !fs.statSync(path.join(sheetDir, f)).isDirectory()) {
      fs.unlinkSync(path.join(sheetDir, f));
    }
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

function splitWorldCompanion(wave, saved, outDir) {
  const worldsDir = path.join(outDir, 'worlds');
  const compsDir = path.join(outDir, 'companions');
  fs.mkdirSync(worldsDir, { recursive: true });
  fs.mkdirSync(compsDir, { recursive: true });
  const large = saved.filter((s) => s.bytes > 80_000);
  const worldCount = wave.worlds.length;
  large.forEach((s, i) => {
    const dest = path.join(i < worldCount ? worldsDir : compsDir, s.file);
    fs.copyFileSync(s.dest, dest);
  });
}

function provenance(wave, item, dump) {
  return {
    asset_id: item.key,
    content_family: wave.family,
    title: item.concept,
    source: 'manus-generated',
    rights_status: 'generated-stockpile',
    verification_date: dump.finished_at || dump.created_at || new Date().toISOString(),
    factual_sources: [],
    cultural_review_needed: false,
    map_review_needed: false,
    factual_review_required: wave.family === 'history' || wave.family === 'wonders',
    notes: wave.stream === 'J' ? 'no dates baked; era by technology only' : '',
    allowed_text_scope: 'none',
    manus_task_id: dump.task_id || null,
    generation_date: dump.finished_at || dump.created_at || new Date().toISOString(),
    digital_source_type: 'generative_ai',
    review_status: 'raw',
  };
}

function recomputeTotals(inv) {
  const waves = Object.values(inv.waves || {});
  const items = waves.flatMap((w) => w.items || []);
  inv.running_total = {
    pass: items.filter((it) => it.review_status === 'pass' || it.qa_status === 'PASS').length,
    hold: items.filter((it) => it.review_status === 'hold' || it.qa_status === 'HOLD').length,
    raw: items.filter((it) => it.status === 'generated_raw').length,
    worlds: items.filter((it) => it.layer === 'L3').length,
    companions: items.filter((it) => it.layer === 'L2').length,
    sheets_downloaded: waves.reduce((n, w) => n + (w.sheets || []).length, 0),
    tasks_used: waves.filter((w) => w.task_id).length,
  };
}

async function withInvLock(fn) {
  fs.mkdirSync(LOCK_ROOT, { recursive: true });
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

function loadFamilyInv(wave) {
  const invPath = path.join(familyDir(wave), 'inventory.json');
  if (!fs.existsSync(invPath)) {
    return { kind: `content-worlds-jklm-${wave.family}`, prefix: PREFIX, no_wiring: true, waves: {}, running_total: {} };
  }
  return JSON.parse(fs.readFileSync(invPath, 'utf8'));
}

function writeFamilyInv(wave, inv) {
  inv.updated_at = new Date().toISOString();
  if (!inv.waves) inv.waves = {};
  recomputeTotals(inv);
  fs.mkdirSync(familyDir(wave), { recursive: true });
  const invPath = path.join(familyDir(wave), 'inventory.json');
  fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
  return invPath;
}

function writeRollup() {
  const waves = {};
  const tot = { tasks_used: 0, sheets_downloaded: 0, worlds: 0, companions: 0, pass: 0, hold: 0, raw: 0 };
  const seenFamily = new Set();
  for (const name of WAVE_ORDER) {
    const spec = WAVES[name];
    const invPath = path.join(familyDir(spec), 'inventory.json');
    if (!fs.existsSync(invPath)) continue;
    const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    const rec = (inv.waves || {})[spec.id];
    if (rec) waves[spec.id] = rec;
    if (seenFamily.has(spec.family)) continue;
    seenFamily.add(spec.family);
    const t = inv.running_total || {};
    for (const k of Object.keys(tot)) tot[k] += t[k] || 0;
  }
  const rollup = {
    spec: 'content-worlds-jklm',
    prefix: PREFIX,
    no_wiring: true,
    updated_at: new Date().toISOString(),
    running_total: tot,
    waves,
  };
  const dest = path.join(ROOT, ROLLUP_REL);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(rollup, null, 2));
  return dest;
}

function writeDocStub() {
  const docPath = path.join(ROOT, TRACKED_DOC_REL);
  if (!fs.existsSync(docPath)) return;
  let body = fs.readFileSync(docPath, 'utf8');
  const start = '<!-- TASKS-START -->';
  const end = '<!-- TASKS-END -->';
  const a = body.indexOf(start);
  const b = body.indexOf(end);
  if (a < 0 || b < 0 || b < a) return;
  const rollupPath = path.join(ROOT, ROLLUP_REL);
  const tot = fs.existsSync(rollupPath)
    ? (JSON.parse(fs.readFileSync(rollupPath, 'utf8')).running_total || {})
    : {};
  const rows = WAVE_ORDER.map((name) => {
    const spec = WAVES[name];
    const invPath = path.join(familyDir(spec), 'inventory.json');
    let rec = null;
    if (fs.existsSync(invPath)) rec = (JSON.parse(fs.readFileSync(invPath, 'utf8')).waves || {})[spec.id];
    const status = rec && rec.task_id
      ? `${rec.agent_status || 'fired'} — ${rec.task_url} — sheets ${(rec.sheets || []).length}/${rec.expected_sheets || 5}`
      : 'pending';
    return `| ${name} | ${spec.family} | ${status} |`;
  });
  const block = [
    start,
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Fired | ${tot.tasks_used || 0} |`,
    `| Sheets downloaded | ${tot.sheets_downloaded || 0} |`,
    `| L3 worlds | ${tot.worlds || 0} |`,
    `| L2 companion sheets | ${tot.companions || 0} |`,
    '',
    `| Wave | Family | Status |`,
    `|---|---|---|`,
    ...rows,
    '',
    end,
  ].join('\n');
  body = `${body.slice(0, a)}${block}${body.slice(b + end.length)}`;
  fs.writeFileSync(docPath, body);
}

function upsertInventory(wave, dump) {
  const inv = loadFamilyInv(wave);
  const haveLarge = (dump.saved || []).filter((s) => s.bytes > 80_000).length >= expectedSheets(wave);
  const items = wave.outputs.map((c) => ({
    ...c,
    status: haveLarge ? 'generated_raw' : dump.task_id ? 'fired' : 'pending',
    qa_status: c.qa_status || null,
    review_status: 'raw',
    qa_note: haveLarge ? 'Raw downloaded; visual QA must record PASS or HOLD.' : null,
    path: dump.sheet_dir || null,
    manus_task_id: dump.task_id || null,
    ...provenance(wave, c, dump),
  }));
  inv.waves[wave.id] = {
    family: wave.family,
    stream: wave.stream,
    title: wave.title,
    subfamily: wave.subfamily,
    task_id: dump.task_id || null,
    task_url: dump.task_url || null,
    agent_status: dump.agent_status || null,
    sheet_dir: dump.sheet_dir || null,
    expected_sheets: expectedSheets(wave),
    concept_count: items.length,
    sheets: (dump.saved || []).map((s) => ({ file: s.file || path.basename(s.dest || ''), bytes: s.bytes, name: s.name || null })),
    items,
    holds: dump.holds || [],
    finished_at: dump.finished_at || null,
  };
  const p = writeFamilyInv(wave, inv);
  writeRollup();
  writeDocStub();
  return p;
}

export function nextUnfiredWave() {
  for (const name of WAVE_ORDER) {
    const wave = WAVES[name];
    const runPath = path.join(familyDir(wave), wave.id, 'run.json');
    if (!fs.existsSync(runPath)) return name;
    try {
      const prev = JSON.parse(fs.readFileSync(runPath, 'utf8'));
      if (!prev.task_id) return name;
    } catch {
      return name;
    }
  }
  return null;
}

export async function runWave(waveName) {
  const wave = WAVES[waveName];
  if (!wave) throw new Error(`Need --wave=${WAVE_ORDER.join('|')}`);

  const OUT_DIR = path.join(familyDir(wave), wave.id);
  const SHEET_DIR = path.join(OUT_DIR, 'sheets');
  const RUN_JSON = path.join(OUT_DIR, 'run.json');
  const looping = process.argv.includes('--loop');
  const fireOnly = !looping && (process.argv.includes('--fire') || process.argv.includes('--create-only'));
  const pollOnly = process.argv.includes('--poll-only');
  const NEED_SHEETS = expectedSheets(wave);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'keys.json'),
    JSON.stringify(
      {
        wave: wave.id,
        stream: wave.stream,
        family: wave.family,
        subfamily: wave.subfamily,
        prefix: PREFIX,
        expected_sheets: NEED_SHEETS,
        worlds: wave.worlds.map((w) => ({ key: w.key, archetypes: w.archetypes, layer: w.layer })),
        companion: { key: wave.companion.key, cells: wave.companion.cells.map((c) => c.key) },
      },
      null,
      2,
    ),
  );

  const BRIEF = buildBrief(wave);
  let taskId = arg('task');
  const dump = {
    started_at: new Date().toISOString(),
    kind: 'content-worlds-jklm',
    wave: wave.id,
    family: wave.family,
    sheet_dir: SHEET_DIR,
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
    const busy = otherInFlight(wave.id);
    if (busy.length) {
      console.error(JSON.stringify({ phase: 'refuse-new-fire', reason: 'max-1-inflight', others: busy }));
      process.exit(3);
    }
    const created = await withRateBackoff(() => createTask({
      title: wave.title,
      agent_profile: resolveAgentProfile(),
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      interactive_mode: false,
      message: BRIEF,
    }));
    taskId = created.task_id || created.id;
    dump.task_id = taskId;
    dump.task_url = created.task_url || `https://manus.im/app/${taskId}`;
    dump.created_at = new Date().toISOString();
    fs.writeFileSync(RUN_JSON, JSON.stringify({ ...dump, brief: BRIEF }, null, 2));
    await withInvLock(() => upsertInventory(wave, dump));
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

  let result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
  let msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
  let saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
  let large = saved.filter((s) => s.bytes > 80_000);

  if (large.length < NEED_SHEETS) {
    console.log(JSON.stringify({ phase: 'need-more-sheets', have: large.length, need: NEED_SHEETS }, null, 2));
    await withRateBackoff(() => sendMessage(taskId, {
      force_skills: [MANUS_SKILLS.ESL_ASSET_GENERATOR],
      message: withEslAssetGeneratorBrief(
        `Continue THIS task. You returned ${large.length} usable PNG file(s); we need exactly ${NEED_SHEETS}: ${wave.worlds.length} full-page 16:9 worlds plus 1 black-field 3×3 companion sheet. Do not restart. Do not add text, dates, notation, or tools. Do not pack worlds into a grid. Keep firing generate_image until every listed PNG exists.`,
      ),
    }));
    result = await pollUntilDone(taskId, { intervalMs: POLL_MS, timeoutMs: TIMEOUT_MS });
    msgs = await listMessages(taskId, { order: 'asc', limit: 120 });
    saved = await downloadSheets(msgs.messages || [], SHEET_DIR);
    large = saved.filter((s) => s.bytes > 80_000);
  }

  splitWorldCompanion(wave, saved, OUT_DIR);
  dump.saved = saved;
  dump.agent_status = result && result.agent_status;
  dump.finished_at = new Date().toISOString();
  if (large.length < NEED_SHEETS) {
    dump.holds = [`Downloaded ${large.length}/${NEED_SHEETS} large PNGs; raw kept for mop.`];
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
  console.log(JSON.stringify({
    phase: 'downloaded',
    wave: wave.id,
    family: wave.family,
    task_id: dump.task_id,
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

const isMain = process.argv[1] && path.normalize(process.argv[1]).endsWith('request-cw-jklm.mjs');
if (isMain) {
  apiKey();
  if (process.argv.includes('--all') && (process.argv.includes('--fire') || process.argv.includes('--create-only'))) {
    console.error('REFUSING --all --fire (rate-limit: max 1 in-flight)');
    process.exit(2);
  }
  const loop = process.argv.includes('--loop');
  if (loop) {
    const maxWaves = Number(arg('max-waves', '99')) || 99;
    let start = arg('wave', '') || nextUnfiredWave();
    for (let n = 0; n < maxWaves; n += 1) {
      const name = start || nextUnfiredWave();
      start = '';
      if (!name) {
        console.log(JSON.stringify({ phase: 'loop-done', reason: 'no-unfired-waves' }, null, 2));
        break;
      }
      await runWave(name);
      if (process.exitCode && process.exitCode !== 0) break;
    }
  } else {
    const names = (arg('wave', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) throw new Error(`Need --wave=${WAVE_ORDER.join('|')} (comma-ok) or --loop`);
    if (names.length > 1 && (process.argv.includes('--fire') || process.argv.includes('--create-only'))) {
      console.error('REFUSING multi-wave --fire (max 1 in-flight)');
      process.exit(2);
    }
    for (const n of names) await runWave(n);
  }
}
