/**
 * Hero / interactive-target stockpile — shared keys for request + finish.
 * Medium band from calibration (~60–65% of ClassIn board). Do not retune %.
 *
 * 20 paired states + 10 single play surfaces = 50 assets.
 * Prefix hero- so dock hide-* pairs stay untouched.
 */
export const PACK = 'hero-targets';
export const PREFIX = 'hero-';
export const RELATIVE_SCALE = 0.85;
export const ROLE = 'hero';

/** Closed/open pairs — adjacent cells, same identity / viewpoint / scale / ground line. */
export const PAIRS = [
  {
    slug: 'chest',
    closed: 'wooden treasure chest, lid shut, 3/4 view, gold trim, no coins spilling',
    open: 'SAME chest: lid open, empty walnut-brown hollow interior, no treasure inside',
  },
  {
    slug: 'box',
    closed: 'plain cardboard box, flaps closed, 3/4 view',
    open: 'SAME box: flaps open, empty kraft-brown interior, no items',
  },
  {
    slug: 'backpack',
    closed: 'kid backpack, zipper closed, front 3/4 view, bright color (not gray, not black)',
    open: 'SAME backpack: main pocket unzipped, empty colored interior (not white, not black)',
  },
  {
    slug: 'suitcase',
    closed: 'travel suitcase standing, lid closed, 3/4 view',
    open: 'SAME suitcase: lid open, empty mid-tone fabric interior, no clothes',
  },
  {
    slug: 'cupboard',
    closed: 'kitchen cupboard, doors shut, front view, wood, handles visible',
    open: 'SAME cupboard: both doors open, empty walnut shelves inside, no dishes',
  },
  {
    slug: 'drawer',
    closed: 'small dresser, all drawer fronts flush, handle visible, front 3/4',
    open: 'SAME dresser: ONE drawer pulled out, empty hollow interior, rest stay closed',
  },
  {
    slug: 'door',
    closed: 'simple interior door in a short doorframe, closed, front view',
    open: 'SAME door: swung open, empty charcoal doorway cavity (not white room)',
  },
  {
    slug: 'curtain',
    closed: 'full curtain covering a window/doorway, closed, front view',
    open: 'SAME curtain: pulled aside, empty dark opening behind (not white)',
  },
  {
    slug: 'locker',
    closed: 'single school locker, door shut, front view, metal, vent slots',
    open: 'SAME locker: door open, empty mid-tone metal interior, no clothes',
  },
  {
    slug: 'envelope',
    closed: 'paper envelope, flap sealed/closed, 3/4 view, cream paper OK (body not interior)',
    open: 'SAME envelope: flap open, empty tan paper interior, no letter',
  },
  {
    slug: 'gift-box',
    closed: 'wrapped gift box with lid on + bow, 3/4 view, bright wrap',
    open: 'SAME gift: lid off/open, empty colored interior, no present inside',
  },
  {
    slug: 'mailbox',
    closed: 'standing mailbox, door closed, 3/4 view',
    open: 'SAME mailbox: door open, empty dark interior, no mail',
  },
  {
    slug: 'fridge',
    closed: 'home refrigerator, door closed, front view, no brand text',
    open: 'SAME fridge: door open, empty mid-tone shelves, no food',
  },
  {
    slug: 'washing-machine',
    closed: 'front-load washer, round door closed, front view, no brand text',
    open: 'SAME washer: round door open, empty dark drum, no clothes',
  },
  {
    slug: 'recycling-bin',
    closed: 'recycling bin, lid closed, 3/4 view, green or blue body, no logos',
    open: 'SAME bin: lid open, empty interior, no trash',
  },
  {
    slug: 'vending-machine',
    closed: 'vending machine, glass closed, colorful unlabeled snacks behind glass, dispense slot shut. NO readable text/logos',
    open: 'SAME machine: bottom dispense flap open, empty dark chute. Glass still closed. NO text',
  },
  {
    slug: 'garage',
    closed: 'single-car garage, door fully down, front view, short building',
    open: 'SAME garage: door up, empty charcoal interior, no car',
  },
  {
    slug: 'safe',
    closed: 'metal safe, door closed, 3/4 view, dial, no numbers readable',
    open: 'SAME safe: door open, empty dark interior, no money',
  },
  {
    slug: 'tent',
    closed: 'camping tent, door zipped/closed, 3/4 view',
    open: 'SAME tent: door tied open, empty dark interior, no sleeping bags',
  },
  {
    slug: 'barrel',
    closed: 'wooden barrel, lid on, 3/4 view',
    open: 'SAME barrel: lid off, empty walnut hollow, no contents',
  },
];

/** Single-state play surfaces. */
export const SINGLES = [
  {
    slug: 'monster-mouth',
    brief: 'cute friendly monster (not scary), huge open mouth as a feed target, empty dark mouth cavity, no food, head+shoulders only',
  },
  {
    slug: 'animal-mouth',
    brief: 'cute hippo head, huge open mouth feed target, empty dark mouth, no food, friendly eyes',
  },
  {
    slug: 'shelf',
    brief: 'empty wooden bookcase, 3–4 empty shelves, no books no objects, front 3/4',
  },
  {
    slug: 'lunch-tray',
    brief: 'empty cafeteria lunch tray with 3–4 empty compartments, no food, 3/4 view from above-front',
  },
  {
    slug: 'pizza-base',
    brief: 'plain pizza dough circle, faint sauce only, NO toppings, 3/4 view',
  },
  {
    slug: 'sandwich-base',
    brief: 'one slice of bread as sandwich base, empty of fillings, 3/4 view',
  },
  {
    slug: 'aquarium',
    brief: 'empty glass aquarium tank, water + gravel only, no fish no plants no ornaments, 3/4 view',
  },
  {
    slug: 'garden-patch',
    brief: 'empty raised garden bed with brown soil, no plants, 3/4 view',
  },
  {
    slug: 'face-base',
    brief: 'blank oval kid head + neck, peach/tan skin, NO eyes NO mouth NO hair NO glasses — empty face customization base',
  },
  {
    slug: 'dress-body',
    brief: 'simple standing kid body, featureless/blank face, bright blue leotard (NOT white), arms slightly out, empty dress-up base, no extra clothes',
  },
];

export function pairCellNames() {
  const names = [];
  for (const p of PAIRS) names.push(`${p.slug}-closed`, `${p.slug}-open`);
  return names;
}

export function singleCellNames() {
  return SINGLES.map((s) => s.slug);
}

/** 4×4 reading order: 16 names, pad with emptyN. */
export function pad16(names) {
  const out = [...names];
  while (out.length < 16) out.push(`empty${out.length}`);
  return out;
}

export const SHEETS = [
  { id: 'sheet1-pairs-a', grid: '4x4', names: pad16(pairCellNames().slice(0, 16)) },
  { id: 'sheet2-pairs-b', grid: '4x4', names: pad16(pairCellNames().slice(16, 32)) },
  {
    id: 'sheet3-pairs-c-plus-singles',
    grid: '4x4',
    names: pad16([...pairCellNames().slice(32, 40), ...singleCellNames().slice(0, 8)]),
  },
  { id: 'sheet4-face-body', grid: '4x4', names: pad16(singleCellNames().slice(8, 10)) },
];
