/**
 * Aggressive stockpile PACK 2 — variants (B), clusters (J), overlays/states (G).
 * Stockpile only. Prefix aggressive-s2-. No producer wiring.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const STOCKPILE_REL = 'harvested/manus-aggressive-stockpile/s2-variants';
export const TRACKED_DOC_REL = 'docs/aggressive-stockpile-s2.md';
export const PREFIX = 'aggressive-s2-';
export const SAFETY_SKIP_KEYS = new Set([
  'rape', 'massacre', 'murder', 'suicide', 'torture', 'missile', 'bomb', 'gun',
]);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const STYLE = `STYLE LOCK: ONE coherent child-friendly ClassIn ESL house style — clean sparse vector / soft-matte educational illustration. Same line weight, palette, padding. No photorealism, no glossy 3D, no recolors-as-variants.
TEXT LOCK: BLANK / text-free. No words, captions, labels, letters, numbers, prices, times, dates, handwriting, signs, badges, logos, UI text.
BLACK FIELD LOCK: pure #000000 black edge-to-edge, clear gutters, one concept per cell, nothing crossing cells.
VARIANT LOCK: useful state/pose/orientation/subtype (empty/full, open/closed, sliced, hanging, left/right) — NOT a hue swap.
CLUSTER LOCK: natural small group as ONE prop (three apples, shoe pair, book stack). No numerals or labels.
OVERLAY LOCK: compact keyable atoms (crack, tear, stain, drip, wrap). Generous margin. Not full scenes.
STATE LOCK: registered whole-object states; keep identity/viewpoint/scale. Do NOT clone H5 lamp on/off, packed/unpacked bag, plugged/unplugged, or long-tail/VG pair cells.
STOCKPILE LOCK: raw Manus sheets only. Do not wire or import to PropBank.
QUALITY: default only.`;

function cell(family, stem, brief) {
  return {
    key: `${PREFIX}${stem}`,
    concept: `${PREFIX}${stem}`,
    family,
    classification: 'MANUS_WORTHY',
    brief,
    status: 'pending',
    qa_status: null,
  };
}

function pack(family, rows, extra) {
  return rows.map(([stem, b]) => cell(family, stem, `${b} ${extra}`));
}

export const VARIANT_CELLS = pack('variant', [
  ['v-apple-sliced', 'red apple cut into fanned slices, not whole'],
  ['v-apple-halved', 'apple half showing seeds'],
  ['v-apple-bitten', 'apple with one crescent bite'],
  ['v-apple-core', 'eaten apple core with stem'],
  ['v-banana-peeled', 'banana half-peeled, peel hanging'],
  ['v-banana-bunch', 'small bunch of three bananas at the crown'],
  ['v-banana-broken', 'banana snapped in half, two pieces'],
  ['v-orange-halved', 'orange half, juicy cross-section, no sticker'],
  ['v-orange-segments', 'loose orange segments, not whole fruit'],
  ['v-orange-peeled-spiral', 'orange with a long peel spiral attached'],
  ['v-lemon-sliced', 'lemon rounds fanned'],
  ['v-lemon-wedge', 'single lemon wedge'],
  ['v-lemon-squeezed', 'spent squeezed lemon wedge'],
  ['v-lime-halved', 'lime cut in half'],
  ['v-watermelon-wedge', 'triangular watermelon wedge with rind'],
  ['v-watermelon-sliced', 'round watermelon slice with rind ring'],
  ['v-strawberry-halved', 'strawberry half, interior seeds'],
  ['v-strawberry-hulled', 'strawberry with green top removed'],
  ['v-grape-single', 'one grape with a tiny stem, vs a bunch'],
  ['v-pear-halved', 'pear half, seeds showing'],
  ['v-peach-halved', 'peach half, pit showing'],
  ['v-cherry-stem', 'two cherries on one stem'],
  ['v-pineapple-sliced', 'pineapple ring slice with hole'],
  ['v-mango-sliced', 'mango cheek hedgehog-sliced'],
  ['v-kiwi-halved', 'kiwi half, green interior'],
  ['v-avocado-halved', 'avocado half with pit'],
  ['v-avocado-sliced', 'fanned avocado slices, no pit'],
  ['v-tomato-sliced', 'tomato rounds fanned'],
  ['v-tomato-halved', 'tomato half, seeds showing'],
  ['v-carrot-sliced', 'carrot coins'],
  ['v-carrot-sticks', 'carrot sticks / batons'],
  ['v-carrot-peeled', 'peeled carrot with peel ribbons beside'],
  ['v-cucumber-sliced', 'cucumber rounds'],
  ['v-potato-sliced', 'raw potato slices'],
  ['v-potato-baked-open', 'baked potato split open with steam'],
  ['v-onion-halved', 'onion half, rings visible'],
  ['v-onion-rings', 'loose onion rings'],
  ['v-garlic-clove', 'single peeled garlic clove'],
  ['v-pepper-halved', 'bell pepper half, seeds visible'],
  ['v-broccoli-floret', 'one broccoli floret, not a whole head'],
  ['v-corn-cob-eaten', 'corn cob with some kernels eaten'],
  ['v-bread-sliced-loaf', 'loaf with several slices already cut'],
  ['v-bread-toasted', 'two browned toast slices'],
  ['v-bread-torn', 'torn bread chunk, ragged crumb'],
  ['v-bagel-sliced', 'bagel sliced horizontally'],
  ['v-bagel-toasted', 'toasted bagel half'],
  ['v-croissant-torn', 'croissant torn, flaky interior'],
  ['v-cake-wedge', 'cake slice / wedge, not a whole cake'],
  ['v-cake-bitten', 'cake slice with one bite missing'],
  ['v-cupcake-unwrapped', 'cupcake with liner peeled down'],
  ['v-cupcake-bitten', 'cupcake with a bite'],
  ['v-cookie-bitten', 'round cookie with one bite'],
  ['v-cookie-broken', 'cookie broken in two pieces'],
  ['v-donut-bitten', 'donut with a bite, no icing letters'],
  ['v-pizza-slice', 'one pizza slice, cheese stretch'],
  ['v-pizza-boxed-open', 'open pizza box, pie inside, blank lid'],
  ['v-sandwich-diagonal', 'sandwich cut into two triangles'],
  ['v-sandwich-open-face', 'open-faced sandwich, toppings visible'],
  ['v-burger-open', 'burger bun lifted showing fillings'],
  ['v-hotdog-bitten', 'hotdog in bun with a bite'],
  ['v-taco-open', 'taco held open showing filling'],
  ['v-sushi-nigiri', 'two nigiri pieces, no kanji'],
  ['v-ice-cream-cone', 'ice cream cone, scoop intact'],
  ['v-ice-cream-melted', 'melted ice cream puddle, cone fallen beside'],
  ['v-ice-cream-cup', 'ice cream in a small cup, spoon standing'],
  ['v-popsicle-bitten', 'popsicle with a bite, dripping'],
  ['v-chocolate-broken', 'chocolate bar broken into squares, blank wrap aside'],
  ['v-cheese-wedge', 'wedge of cheese'],
  ['v-cheese-sliced', 'few cheese slices fanned'],
  ['v-egg-fried', 'sunny-side-up fried egg'],
  ['v-egg-boiled-halved', 'hard-boiled egg cut in half'],
  ['v-egg-scrambled', 'mound of scrambled egg'],
  ['v-bacon-cooked', 'cooked bacon strips'],
  ['v-sausage-sliced', 'cooked sausage coins'],
  ['v-chicken-drumstick', 'one cooked drumstick, kid-safe'],
  ['v-fish-fillet', 'raw fish fillet, not a whole fish'],
  ['v-rice-bowl-full', 'bowl heaped with rice'],
  ['v-rice-bowl-empty', 'empty rice bowl, same style'],
  ['v-soup-steaming', 'bowl of soup with steam'],
  ['v-noodles-bowl', 'noodle bowl with chopsticks resting'],
  ['v-salad-bowl', 'bowl of mixed salad'],
  ['v-cereal-bowl-full', 'cereal bowl with milk'],
  ['v-cereal-bowl-empty', 'empty cereal bowl with spoon'],
  ['v-mug-steaming', 'mug with rising steam'],
  ['v-mug-empty', 'empty mug, interior visible'],
  ['v-mug-on-saucer', 'mug on a saucer'],
  ['v-glass-juice-full', 'glass full of orange juice (not a water pair clone)'],
  ['v-glass-juice-empty', 'empty juice glass'],
  ['v-water-bottle-full', 'clear sports bottle full, cap on, no brand'],
  ['v-water-bottle-empty', 'same bottle empty, slightly crushed'],
  ['v-water-bottle-open', 'sports bottle cap flipped open'],
  ['v-teapot-lid-off', 'teapot with lid off beside it'],
  ['v-teapot-pouring', 'teapot tilted mid-pour, tea stream'],
  ['v-kettle-steaming', 'kettle with steam, no brand'],
  ['v-pot-lid-on', 'cooking pot with lid on'],
  ['v-pot-lid-off', 'cooking pot lid off, empty interior'],
  ['v-pot-steaming', 'pot lid ajar with steam'],
  ['v-pan-empty', 'empty frying pan'],
  ['v-pan-with-egg', 'frying pan with a frying egg'],
  ['v-lunchbox-closed', 'closed kids lunchbox, no logos'],
  ['v-lunchbox-open-full', 'open lunchbox packed with food'],
  ['v-lunchbox-open-empty', 'open lunchbox empty compartments'],
  ['v-jar-closed', 'closed glass jar, jam-colored, no label'],
  ['v-jar-open', 'open jar, lid beside'],
  ['v-jar-empty', 'empty glass jar'],
  ['v-can-closed', 'unopened food can, blank metal'],
  ['v-can-opened', 'opened can, lid peeled back, blank'],
  ['v-carton-closed', 'closed milk carton, blank faces'],
  ['v-carton-open-spout', 'milk carton spout open'],
  ['v-bowl-empty', 'empty mixing bowl'],
  ['v-bowl-batter', 'bowl of batter with whisk'],
  ['v-plate-empty', 'empty dinner plate'],
  ['v-plate-crumbs', 'plate with crumbs only'],
  ['v-fork-tines-up', 'fork resting tines up'],
  ['v-spoon-full', 'spoon holding soup'],
  ['v-knife-in-block', 'kitchen knife in a small block, kid-safe'],
  ['v-chopsticks-resting', 'chopsticks on a rest'],
  ['v-umbrella-inside-out', 'umbrella blown inside-out (not open/closed pair)'],
  ['v-umbrella-dripping', 'open umbrella dripping water'],
  ['v-umbrella-folded-strap', 'closed umbrella strap wrapped'],
  ['v-backpack-open', 'open backpack showing books inside'],
  ['v-backpack-hanging', 'backpack hanging from one strap'],
  ['v-backpack-on-floor', 'backpack slumped packed on the floor'],
  ['v-suitcase-open', 'open suitcase with folded clothes, no tags'],
  ['v-suitcase-upright', 'closed suitcase standing on wheels'],
  ['v-suitcase-flat', 'closed suitcase lying flat'],
  ['v-handbag-open', 'open handbag showing wallet/keys'],
  ['v-handbag-closed', 'closed handbag standing'],
  ['v-wallet-open', 'open wallet, blank cards, no numbers'],
  ['v-wallet-closed', 'closed bi-fold wallet'],
  ['v-shoe-left', 'single left sneaker, no logos'],
  ['v-shoe-right', 'matching right sneaker'],
  ['v-shoe-untied-laces', 'sneaker laces hanging loose (not tied/untied pair cell)'],
  ['v-shoe-muddy', 'sneaker caked with mud'],
  ['v-boot-upright', 'rain boot standing'],
  ['v-boot-tipped', 'rain boot fallen on its side'],
  ['v-sock-inside-out', 'sock turned inside-out'],
  ['v-sock-balled', 'sock rolled into a ball'],
  ['v-hat-brim-up', 'sun hat brim flipped up'],
  ['v-hat-on-hook', 'hat hanging on a small hook fragment'],
  ['v-cap-backwards', 'baseball cap brim back, no logos'],
  ['v-cap-forwards', 'baseball cap brim forward, no logos'],
  ['v-shirt-on-hanger', 't-shirt on a hanger, blank fabric'],
  ['v-shirt-inside-out', 't-shirt inside-out, seams showing'],
  ['v-shirt-crumpled', 'one crumpled t-shirt'],
  ['v-pants-folded', 'neatly folded pants'],
  ['v-pants-on-hanger', 'pants on a hanger'],
  ['v-coat-on-hook', 'coat on a hook (not a zip pair)'],
  ['v-coat-crumpled', 'coat in a heap'],
  ['v-dress-on-hanger', 'simple dress on a hanger'],
  ['v-glove-left', 'single left knit glove'],
  ['v-glove-right', 'matching right knit glove'],
  ['v-glove-inside-out', 'glove inside-out'],
  ['v-scarf-draped', 'scarf draped in a loop (not tied/untied pair)'],
  ['v-scarf-folded', 'neatly folded scarf'],
  ['v-book-spine', 'hardcover standing, blank spine facing camera'],
  ['v-book-face-down', 'closed book lying face-down, blank cover'],
  ['v-book-dog-eared', 'closed book with a bent corner'],
  ['v-notebook-open-blank', 'open notebook, both pages blank'],
  ['v-notebook-spiral', 'closed spiral notebook, blank cover'],
  ['v-pencil-sharpened', 'freshly sharpened pencil, blank barrel'],
  ['v-pencil-stub', 'short used pencil stub'],
  ['v-pencil-broken', 'pencil broken in half'],
  ['v-crayon-new', 'new crayon, blank wrap'],
  ['v-crayon-stub', 'short crayon stub'],
  ['v-crayon-peeled', 'crayon with paper peeled in a curl'],
  ['v-eraser-new', 'new rectangular eraser, blank'],
  ['v-eraser-worn', 'worn-down rounded eraser'],
  ['v-scissors-open', 'scissors blades open'],
  ['v-scissors-closed', 'scissors blades closed'],
  ['v-glue-cap-off', 'glue bottle cap off beside it, blank'],
  ['v-glue-squeezed', 'glue bottle squeezed with a glue bead'],
  ['v-ruler-blank', 'ruler with ticks but NO numerals'],
  ['v-pencil-case-closed', 'closed pencil case'],
  ['v-pencil-case-open-full', 'open pencil case full of supplies'],
  ['v-pencil-case-open-empty', 'open empty pencil case'],
  ['v-clipboard-empty', 'clipboard with blank paper, zero writing'],
  ['v-phone-face-down', 'smartphone face-down, blank back'],
  ['v-phone-face-up-blank', 'smartphone face-up, totally blank dark screen'],
  ['v-phone-charging', 'phone with cable plugged in (not H5 plug pair)'],
  ['v-headphones-cup-up', 'over-ear headphones cups up'],
  ['v-headphones-around', 'headphones standing on the headband'],
  ['v-earbuds-in-case', 'earbuds in an open case'],
  ['v-camera-front', 'simple camera front, no brand'],
  ['v-camera-back-blank', 'camera back, blank screen'],
  ['v-tv-off', 'small TV off, dark blank screen'],
  ['v-remote-face-up', 'TV remote face-up, buttons without numerals'],
  ['v-lamp-shade-askew', 'desk lamp shade tilted (not on/off pair)'],
  ['v-chair-tipped', 'small chair tipped on its side'],
  ['v-chair-stacked', 'two small chairs stacked'],
  ['v-stool-upright', 'stool standing'],
  ['v-stool-tipped', 'stool on its side'],
  ['v-table-folded', 'small folding table folded'],
  ['v-table-cloth-on', 'small table with a plain tablecloth'],
  ['v-bed-made', 'small bed neatly made'],
  ['v-bed-unmade', 'small bed rumpled unmade'],
  ['v-pillow-fluffy', 'plump pillow'],
  ['v-pillow-flat', 'flattened slept-on pillow'],
  ['v-blanket-folded', 'neatly folded blanket'],
  ['v-blanket-rumpled', 'rumpled blanket heap'],
  ['v-door-ajar', 'door fragment slightly ajar, no signs'],
  ['v-door-wide-open', 'door fragment open 90 degrees'],
  ['v-window-open-sash', 'window fragment sash raised'],
  ['v-window-rain-streaked', 'closed window with rain streaks'],
  ['v-mirror-front', 'handheld mirror, mute reflection, no face'],
  ['v-mirror-back', 'handheld mirror back side'],
  ['v-toothbrush-dry', 'dry toothbrush upright'],
  ['v-toothbrush-paste', 'toothbrush with toothpaste blob'],
  ['v-soap-new', 'new rectangular soap bar'],
  ['v-soap-worn', 'thin worn soap sliver'],
  ['v-towel-hanging', 'towel hanging from a bar (not wet/dry pair)'],
  ['v-towel-crumpled', 'crumpled towel heap'],
  ['v-bike-kickstand', 'bicycle on kickstand'],
  ['v-bike-lying', 'bicycle lying on its side'],
  ['v-helmet-visor-up', 'bike helmet visor up'],
  ['v-helmet-visor-down', 'bike helmet visor down'],
  ['v-skateboard-tail-up', 'skateboard standing on tail'],
  ['v-skateboard-wheels-up', 'skateboard flipped wheels up'],
  ['v-ball-soccer-inflated', 'soccer ball fully inflated, no logos'],
  ['v-ball-soccer-deflated', 'soccer ball wrinkled deflated'],
  ['v-racket-face', 'tennis racket face-on'],
  ['v-racket-edge', 'tennis racket edge-on'],
  ['v-bat-standing', 'baseball bat standing on the knob'],
  ['v-bat-lying', 'baseball bat lying down'],
  ['v-flower-bud', 'flower still in bud'],
  ['v-flower-bloom', 'same flower type fully bloomed'],
  ['v-flower-wilted', 'same flower wilted drooping (not bouquet clone)'],
  ['v-potted-plant-dry-soil', 'potted plant with cracked dry soil, still upright'],
  ['v-potted-plant-wet-soil', 'potted plant with dark wet soil'],
  ['v-leaf-wet', 'single leaf with water drops (not VG autumn sequence)'],
  ['v-leaf-curled', 'single leaf curled inward'],
  ['v-envelope-sealed', 'sealed envelope, blank, no address'],
  ['v-envelope-open', 'open envelope with blank paper peeking'],
  ['v-letter-folded', 'blank paper folded in thirds'],
  ['v-gift-wrapped', 'wrapped gift with bow, no tags'],
  ['v-gift-unwrapped', 'opened gift box, tissue paper'],
  ['v-box-taped', 'cardboard box sealed with tape, blank (not open/closed pair)'],
  ['v-box-dented', 'closed cardboard box, dented corner'],
  ['v-trash-bag-full', 'tied full trash bag, kid-safe'],
  ['v-trash-bag-empty', 'empty crumpled trash bag'],
  ['v-recycle-bin-full', 'small bin full of paper/bottles, no recycling letters'],
  ['v-recycle-bin-empty', 'empty bin, no letters'],
  ['v-watering-can-upright', 'watering can standing'],
  ['v-watering-can-pour', 'watering can tilted pouring a stream'],
  ['v-hose-coiled', 'garden hose neatly coiled'],
  ['v-hose-kinked', 'garden hose with a kink'],
  ['v-bucket-empty', 'empty bucket'],
  ['v-bucket-full', 'bucket full of water'],
  ['v-basket-empty', 'empty wicker basket'],
  ['v-basket-full-laundry', 'basket overflowing with clothes'],
  ['v-broom-standing', 'broom standing bristles down'],
  ['v-broom-leaning', 'broom leaning as if against a wall'],
  ['v-mop-wet', 'mop with wet dripping strands'],
  ['v-mop-dry', 'mop with dry fluffy strands'],
  ['v-clock-face-blank-ticks', 'analog clock ticks but NO numerals, hands at an angle'],
  ['v-key-single', 'single house key, no tag text'],
  ['v-key-ring', 'few keys on a ring, no tags'],
  ['v-lock-open-shackle', 'padlock shackle open (not locked/unlocked pair cell)'],
  ['v-hanger-empty', 'empty clothes hanger'],
  ['v-hanger-with-shirt', 'hanger holding a shirt'],
], 'Isolated still-life on black. No text, no logos.');

export const CLUSTER_CELLS = pack('cluster', [
  ['cl-apples-three', 'three apples clustered, no count label'],
  ['cl-bananas-two', 'two bananas side by side'],
  ['cl-oranges-three', 'three oranges in a small pile'],
  ['cl-lemons-three', 'three lemons clustered'],
  ['cl-limes-three', 'three limes clustered'],
  ['cl-pears-three', 'three pears clustered'],
  ['cl-peaches-three', 'three peaches clustered'],
  ['cl-strawberries-punnet', 'open punnet of strawberries, blank carton'],
  ['cl-grapes-bunch', 'one grape bunch on the stem'],
  ['cl-cherries-bowl', 'small bowl of cherries'],
  ['cl-tomatoes-vine', 'three tomatoes on a vine cluster'],
  ['cl-carrots-bunch', 'carrot bunch, greens on, blank tie'],
  ['cl-radishes-bunch', 'small radish bunch'],
  ['cl-asparagus-bundle', 'asparagus bundle tied, no tags'],
  ['cl-mushrooms-cluster', 'cluster of three mushrooms'],
  ['cl-garlic-bulb-group', 'two garlic bulbs together'],
  ['cl-onions-mesh', 'three onions in a blank mesh bag'],
  ['cl-potatoes-sack', 'open sack showing several potatoes'],
  ['cl-eggs-carton-six', 'open egg carton with six eggs, no numbers'],
  ['cl-eggs-bowl-three', 'three whole eggs in a bowl'],
  ['cl-cookies-stack', 'stack of four cookies'],
  ['cl-pancakes-stack', 'pancake stack with a pat of butter'],
  ['cl-donuts-box', 'open bakery box with several donuts, blank lid'],
  ['cl-cupcakes-four', 'four cupcakes in a tight group'],
  ['cl-muffins-tin', 'muffin tin with several muffins'],
  ['cl-bread-basket', 'basket with several bread rolls'],
  ['cl-bagels-two', 'two bagels paired'],
  ['cl-pizza-slices-group', 'three pizza slices overlapping'],
  ['cl-sushi-set', 'small sushi set on a board, no kanji'],
  ['cl-fruit-bowl', 'mixed fruit bowl, no labels'],
  ['cl-veggie-crate', 'small crate of mixed vegetables'],
  ['cl-grocery-bags', 'two grocery bags, produce peeking, no logos'],
  ['cl-grocery-spill', 'loose groceries clustered as if unpacked'],
  ['cl-bottles-group', 'three beverage bottles, blank labels'],
  ['cl-cans-sixpack', 'six-pack of blank cans'],
  ['cl-jars-three', 'three jam-style jars in a row, blank'],
  ['cl-yogurt-cups-four', 'four yogurt cups, blank lids'],
  ['cl-ice-cubes-group', 'loose ice-cube cluster (not a melt sequence)'],
  ['cl-books-stack', 'stack of 4–5 books, blank spines'],
  ['cl-magazines-pile', 'messy magazine pile, mute covers, no titles'],
  ['cl-newspapers-stack', 'folded newspaper stack, NO headlines'],
  ['cl-notebooks-stack', 'stack of notebooks, blank covers'],
  ['cl-papers-stack', 'neat stack of blank paper'],
  ['cl-papers-messy', 'messy scatter of blank papers'],
  ['cl-envelopes-stack', 'stack of blank envelopes'],
  ['cl-letters-bundle', 'blank envelopes tied with string'],
  ['cl-shoe-pair', 'left and right shoes as a pair, no logos'],
  ['cl-boot-pair', 'pair of rain boots standing together'],
  ['cl-sock-pair', 'pair of socks overlapping'],
  ['cl-glove-pair', 'pair of gloves together'],
  ['cl-slippers-pair', 'pair of slippers'],
  ['cl-sandals-pair', 'pair of sandals'],
  ['cl-chopsticks-pair', 'pair of chopsticks parallel'],
  ['cl-skis-pair', 'pair of skis, no brand'],
  ['cl-ice-skates-pair', 'pair of ice skates'],
  ['cl-luggage-set', 'two suitcases plus a small bag, no tags'],
  ['cl-duffel-and-backpack', 'duffel beside a backpack'],
  ['cl-hats-stack', 'two hats stacked'],
  ['cl-hanger-group', 'three empty hangers hooked together'],
  ['cl-coats-on-rack', 'two or three coats on a fragment rack'],
  ['cl-laundry-pile', 'messy laundry pile'],
  ['cl-laundry-folded-stack', 'stack of folded laundry'],
  ['cl-towels-stack', 'stack of folded towels'],
  ['cl-blankets-pile', 'pile of folded blankets'],
  ['cl-pillows-two', 'two pillows stacked'],
  ['cl-plates-stack', 'stack of plates'],
  ['cl-bowls-stack', 'stack of bowls'],
  ['cl-cups-cluster', 'three mugs clustered (not stacked-unstacked pair)'],
  ['cl-glasses-cluster', 'three drinking glasses grouped'],
  ['cl-cutlery-set', 'fork knife spoon together'],
  ['cl-pots-nested', 'two pots nested'],
  ['cl-pans-two', 'two pans overlapping'],
  ['cl-lids-pile', 'small pile of pot lids'],
  ['cl-tupperware-stack', 'stack of food containers, blank'],
  ['cl-lunchboxes-two', 'two lunchboxes side by side'],
  ['cl-pencils-cup', 'cup stuffed with pencils, blank barrels'],
  ['cl-crayons-heap', 'heap of crayons, blank wraps'],
  ['cl-markers-cup', 'cup of markers, caps on'],
  ['cl-paintbrushes-jar', 'jar of paintbrushes'],
  ['cl-chalk-pieces', 'several chalk sticks together'],
  ['cl-erasers-two', 'two erasers together'],
  ['cl-paperclips-pile', 'pile of paperclips (not a chain clone)'],
  ['cl-buttons-pile', 'small pile of mixed buttons'],
  ['cl-coins-pile', 'mute disc coin pile, no numerals'],
  ['cl-marbles-group', 'small marble cluster'],
  ['cl-blocks-pile', 'wooden blocks loose pile, NO letters'],
  ['cl-lego-pile', 'brick pile, no logos or letters'],
  ['cl-cars-three', 'three toy cars grouped'],
  ['cl-stuffed-animals-two', 'two stuffed animals together'],
  ['cl-balls-three', 'three sports balls grouped, no logos'],
  ['cl-balloon-bunch', 'bunch of 4 balloons tied, no faces'],
  ['cl-gifts-stack', 'stack of wrapped gifts, no tags'],
  ['cl-flowers-bouquet', 'fresh bouquet (not wilted-bouquet clone)'],
  ['cl-flower-pots-three', 'three small potted plants in a row'],
  ['cl-shells-group', 'cluster of seashells'],
  ['cl-pebbles-group', 'cluster of smooth pebbles'],
  ['cl-pinecones-three', 'three pinecones together'],
  ['cl-acorns-group', 'small group of acorns'],
  ['cl-keys-bowl', 'bowl with several keys'],
  ['cl-toiletries-group', 'toothbrush cup soap grouped'],
  ['cl-bottles-shampoo-two', 'two blank pump bottles together'],
  ['cl-towels-rolled-three', 'three rolled towels standing'],
  ['cl-picnic-set', 'picnic basket with blanket roll and two cups'],
  ['cl-camping-set', 'rolled sleeping bag, lantern, canteen'],
  ['cl-toolbox-tools', 'open toolbox with several tools'],
  ['cl-art-supplies', 'brush palette scissors clustered'],
  ['cl-mail-pile', 'blank envelopes plus a parcel'],
  ['cl-parcels-three', 'three small blank parcels stacked'],
  ['cl-shopping-basket-full', 'hand basket full of produce, no barcodes'],
  ['cl-shoes-messy-heap', 'messy heap of several shoes'],
  ['cl-socks-laundry', 'several socks in a small heap'],
  ['cl-hats-and-scarves', 'hat plus scarf plus gloves winter set'],
  ['cl-school-supplies', 'book notebook pencil case grouped'],
  ['cl-desk-clutter', 'mug papers stapler clutter, no text'],
  ['cl-kitchen-utensil-crock', 'crock stuffed with spatulas/spoons'],
  ['cl-spice-jars-three', 'three small spice jars, blank'],
  ['cl-tea-set', 'teapot plus two cups'],
  ['cl-coffee-set', 'coffee pot plus cup plus spoon'],
  ['cl-breakfast-set', 'plate toast cup juice glass grouped'],
  ['cl-dinner-set', 'plate bowl cup cutlery grouped'],
  ['cl-snack-bowl-mix', 'bowl of mixed snacks, no packaging text'],
  ['cl-nut-bowl', 'bowl of mixed nuts'],
  ['cl-berry-bowl', 'bowl of mixed berries'],
  ['cl-melon-slices-group', 'several melon slices on a plate'],
  ['cl-cookie-tin-open', 'open tin with cookies, blank lid'],
  ['cl-cracker-stack', 'stack of crackers'],
  ['cl-cheese-board', 'small cheese board with two cheeses and grapes'],
  ['cl-sandwich-halves-pair', 'two sandwich halves as a pair'],
], 'Natural group as ONE prop. No numerals, no labels, no text.');

export const OVERLAY_CELLS = pack('overlay', [
  ['ov-crack-hairline', 'thin hairline crack overlay, no object body'],
  ['ov-crack-star', 'small star-shaped glass crack, kid-safe, no flying shards'],
  ['ov-chip-edge', 'tiny edge-chip overlay'],
  ['ov-tear-flap', 'cloth/paper tear flap overlay'],
  ['ov-tear-hole', 'small torn hole overlay'],
  ['ov-hole-moth', 'tiny moth-eaten hole cluster overlay'],
  ['ov-stain-round', 'round stain blot overlay'],
  ['ov-stain-drip', 'drip-shaped stain overlay'],
  ['ov-stain-splatter', 'small splatter stain overlay'],
  ['ov-mud-splat', 'mud splat overlay'],
  ['ov-mud-smear', 'mud smear overlay'],
  ['ov-water-ring', 'circular water-ring stain overlay'],
  ['ov-water-droplets', 'few water droplets overlay'],
  ['ov-leak-drip', 'single leak drip hanging overlay'],
  ['ov-leak-stream', 'short leak stream overlay'],
  ['ov-wet-sheen', 'wet glossy patch overlay'],
  ['ov-rust-patch', 'rust patch overlay'],
  ['ov-dust-puff', 'dust puff overlay'],
  ['ov-dust-layer', 'thin dusty film patch overlay'],
  ['ov-scratch-line', 'surface scratch overlay'],
  ['ov-dent-circle', 'round dent highlight overlay'],
  ['ov-scorch-patch', 'small brown scorch patch, no flames'],
  ['ov-wrinkle-fold', 'fabric wrinkle fold overlay'],
  ['ov-crease', 'sharp paper crease overlay'],
  ['ov-peel-curl', 'paint/paper peel curl overlay'],
  ['ov-bandage-strip', 'plain bandage strip overlay, no brand'],
  ['ov-tape-strip', 'blank masking tape strip overlay'],
  ['ov-tape-x', 'two blank tape strips in an X'],
  ['ov-patch-square', 'cloth patch square overlay, no letters'],
  ['ov-patch-round', 'round cloth patch overlay'],
  ['ov-wrap-paper', 'loose wrapping-paper fold overlay'],
  ['ov-wrap-bow', 'gift bow overlay, no tag'],
  ['ov-ribbon-loop', 'ribbon loop overlay'],
  ['ov-string-tied', 'tied string knot overlay'],
  ['ov-rubber-band', 'rubber band overlay'],
  ['ov-plastic-wrap', 'cling-film crinkle overlay'],
  ['ov-foil-crinkle', 'foil crinkle overlay'],
  ['ov-bubble-wrap', 'small bubble-wrap patch overlay'],
  ['ov-frost-edge', 'frosty edge overlay'],
  ['ov-melt-drip', 'melt drip overlay, no letters'],
  ['ov-wilt-droop', 'drooping petal/leaf wilt overlay atom'],
  ['ov-steam-puff', 'small steam puff overlay'],
  ['ov-smoke-wisp', 'thin smoke wisp, kid-safe'],
  ['ov-shadow-blob', 'soft contact-shadow blob overlay'],
  ['ov-highlight-sheen', 'specular highlight slash overlay'],
  ['ov-fingerprint-smudge', 'fingerprint smudge overlay'],
  ['ov-grease-smear', 'grease smear overlay'],
  ['ov-ink-blot', 'ink blot overlay, not letters'],
  ['ov-paint-splat', 'paint splat overlay'],
  ['ov-crumb-dots', 'tiny crumb specks overlay'],
  ['ov-dew-beads', 'dew bead row overlay'],
  ['ov-cobweb-corner', 'tiny corner cobweb overlay (not a full web still-life)'],
  ['ov-moss-patch', 'small moss patch overlay'],
  ['ov-sticker-blank', 'blank circular sticker overlay, ZERO text'],
  ['ov-clip-binder', 'binder clip overlay atom'],
  ['ov-clothespin-clip', 'clothespin overlay atom'],
  ['ov-magnet-dot', 'small fridge magnet overlay, no letters'],
  ['ov-pin-push', 'pushpin overlay'],
  ['ov-safety-pin', 'safety pin overlay'],
  ['ov-zip-pull', 'zipper pull overlay'],
  ['ov-button-loose', 'single loose button overlay'],
  ['ov-thread-tangle', 'small thread tangle overlay'],
  ['ov-lint-fuzz', 'lint fuzz overlay'],
  ['ov-leaf-stuck', 'single stuck leaf overlay'],
  ['ov-snow-cap-tiny', 'tiny snow cap overlay for object tops'],
  ['ov-icicle-tiny', 'tiny icicle overlay'],
  ['ov-drip-trail', 'wet drip trail overlay'],
  ['ov-condensation', 'condensation droplet field overlay'],
  ['ov-fog-smudge', 'foggy smudge overlay for glass'],
  ['ov-crack-ceramic', 'ceramic crackle overlay'],
  ['ov-chipped-paint', 'chipped paint edge overlay'],
  ['ov-peeling-label-blank', 'peeling blank label corner, no text'],
  ['ov-sun-fade', 'sun-fade bleached patch overlay'],
  ['ov-water-damage', 'water-damage tide line overlay'],
  ['ov-mold-spot', 'tiny kid-safe mold specks overlay'],
  ['ov-ice-pack-glow', 'cold-pack frost overlay patch'],
  ['ov-heat-shimmer', 'tiny heat shimmer lines overlay'],
  ['ov-foam-suds', 'small soap-suds puff overlay'],
  ['ov-bandage-plus', 'two cloth bandage strips as a plus, no red-cross logo'],
  ['ov-pollen-dust', 'yellow pollen dust overlay'],
], 'Compact overlay atom, keyable, generous margin, no full background, no text.');

export const STATE_CELLS = pack('state', [
  ['st-cup-cracked', 'mug with a visible crack, still whole, kid-safe'],
  ['st-plate-chipped', 'plate with one chipped rim'],
  ['st-bowl-cracked', 'bowl with a crack line'],
  ['st-glass-chipped', 'drinking glass with a tiny rim chip'],
  ['st-phone-cracked-screen', 'phone hairline cracked screen, still blank, no UI'],
  ['st-frame-cracked', 'picture frame glass cracked, mute picture, no faces required'],
  ['st-mirror-cracked', 'handheld mirror with a crack, no face'],
  ['st-window-cracked', 'window fragment with a crack'],
  ['st-egg-leaking', 'cracked egg leaking white (not LT whole/cracked pair)'],
  ['st-bottle-leaking', 'bottle leaking at the seam, blank'],
  ['st-pipe-leaking', 'short pipe fragment dripping'],
  ['st-faucet-running', 'faucet with a running stream (not a single-drip clone)'],
  ['st-sink-full', 'sink basin fragment full of water'],
  ['st-sink-empty', 'sink basin fragment empty'],
  ['st-bucket-overflow', 'bucket overflowing at the rim'],
  ['st-plant-wilted-single', 'single potted plant wilted (not wilt/watered pair)'],
  ['st-plant-perky-single', 'single potted plant perky, registered cousin'],
  ['st-flower-pressed', 'pressed dried flower flat'],
  ['st-bread-mold-tiny', 'bread slice with tiny kid-safe mold specks'],
  ['st-apple-bruised', 'apple with a visible bruise'],
  ['st-banana-overripe', 'very spotted overripe banana (not green/yellow pair)'],
  ['st-tomato-split', 'ripe tomato skin split'],
  ['st-paper-crumpled', 'crumpled blank paper ball'],
  ['st-paper-torn-sheet', 'torn blank sheet as one concept'],
  ['st-paper-wet', 'wet sagging blank paper'],
  ['st-cardboard-soggy', 'soggy cardboard box corner, closed'],
  ['st-book-wet', 'closed book, wet warped cover, blank'],
  ['st-shirt-stained', 't-shirt with a stain, otherwise blank'],
  ['st-shirt-torn', 't-shirt with a small tear'],
  ['st-shirt-patched', 't-shirt with a visible cloth patch'],
  ['st-jeans-ripped', 'jeans with a small kid-safe knee rip'],
  ['st-sock-hole', 'sock with a toe hole'],
  ['st-shoe-worn-sole', 'sneaker with a worn sole, no logos'],
  ['st-shoe-laces-broken', 'sneaker with a broken lace'],
  ['st-hat-crushed', 'hat crushed out of shape'],
  ['st-backpack-ripped', 'backpack with a torn pocket'],
  ['st-umbrella-torn-panel', 'umbrella with one torn panel (not open/closed pair)'],
  ['st-balloon-tied', 'inflated balloon with a tied knot (not inflated/deflated pair)'],
  ['st-balloon-popped-remnant', 'popped balloon remnant, kid-safe'],
  ['st-candle-dripped', 'unlit candle with dripped wax (not lit/unlit pair)'],
  ['st-ice-partial-melt', 'ice cube rounded from melting (not VG trio)'],
  ['st-chocolate-melted', 'chocolate bar softening at a corner'],
  ['st-ice-cream-half-melt', 'cone with half-melted scoop'],
  ['st-soap-cracked', 'soap bar with a crack'],
  ['st-sponge-wet', 'wet sponge expanded'],
  ['st-sponge-dry', 'dry sponge compressed'],
  ['st-towel-damp', 'hanging towel looking damp/darker (not wet/dry pair)'],
  ['st-toothbrush-worn', 'toothbrush with splayed bristles'],
  ['st-pencil-chewed', 'pencil with a chewed end, kid-safe'],
  ['st-crayon-melted', 'crayon bent/melted from heat'],
  ['st-glue-dried-nozzle', 'glue bottle with dried glue on the nozzle'],
  ['st-marker-dried', 'marker with dried frayed tip, cap off'],
  ['st-tape-tangled', 'tape roll with a messy loose end'],
  ['st-yarn-tangled', 'tangled yarn ball'],
  ['st-necklace-tangled', 'tangled necklace'],
  ['st-hose-leaking', 'garden hose spraying from a puncture'],
  ['st-tire-flat', 'isolated bicycle tire looking flat'],
  ['st-can-dented', 'dented blank can'],
  ['st-can-rusty', 'rusty blank can'],
  ['st-jar-sticky-lid', 'jar with sticky drips on the lid, blank'],
  ['st-fridge-door-open', 'fridge fragment door open, empty shelves'],
  ['st-oven-door-open', 'oven fragment door open, empty'],
  ['st-microwave-open', 'microwave open empty, no clock digits'],
  ['st-washer-open', 'washing machine door open, empty drum'],
  ['st-dryer-open', 'dryer door open, empty'],
  ['st-dishwasher-open', 'dishwasher open, empty racks'],
  ['st-toolbox-open', 'toolbox open with a few tools'],
  ['st-first-aid-open', 'first-aid box open, no drug names, no logo letters'],
  ['st-pencil-case-burst', 'overstuffed pencil case bursting open'],
  ['st-envelope-ripped-open', 'envelope ripped open, blank'],
  ['st-parcel-opened', 'opened parcel, blank packing paper'],
  ['st-gift-half-wrap', 'gift half-wrapped, paper mid-fold'],
  ['st-tent-pitched', 'small pitched tent, isolated'],
  ['st-tent-collapsed', 'collapsed tent heap'],
  ['st-sleeping-bag-open', 'sleeping bag unzipped open (not yoga-mat pair)'],
  ['st-sleeping-bag-stuffed', 'sleeping bag stuffed in its sack'],
  ['st-lantern-hanging', 'lantern hanging from a hook fragment, unlit'],
  ['st-flashlight-beam-only', 'flashlight with a cone of light (not on/off pair)'],
  ['st-matches-spent', 'spent match, charred head, no fire scene'],
  ['st-campfire-unlit', 'unlit campfire log teepee, no flames'],
  ['st-umbrella-wet-closed', 'closed umbrella shiny-wet (not open/closed pair)'],
  ['st-coat-wet', 'coat hanging dripping wet'],
  ['st-doormat-wet', 'doormat darkened wet, no letters'],
  ['st-doormat-muddy', 'doormat with mud tracks, no letters'],
  ['st-window-fogged', 'window fragment fogged, no writing in the fog'],
  ['st-mirror-fogged', 'mirror fogged, no writing, no face'],
  ['st-glasses-fogged', 'eyeglasses fogged'],
  ['st-glasses-cracked', 'eyeglasses with a cracked lens'],
  ['st-mug-chipped-handle', 'mug with a chipped handle'],
  ['st-teapot-stained', 'teapot with interior tea stain, lid off'],
  ['st-cutting-board-scarred', 'cutting board with knife scars'],
  ['st-pan-scorched', 'frying pan with a scorch mark, empty'],
  ['st-pot-boiling-over', 'pot boiling over with foam'],
  ['st-toast-burnt', 'burnt toast slice, kid-safe, not flaming'],
  ['st-cookie-burnt', 'overbaked dark cookie'],
  ['st-cake-collapsed', 'sunken collapsed cake'],
  ['st-balloon-underinflated', 'saggy underinflated balloon (not flat-deflated pair)'],
  ['st-ball-wet', 'soccer ball wet/shiny, no logos'],
  ['st-ball-muddy', 'soccer ball muddy, no logos'],
  ['st-racket-broken-string', 'tennis racket with a broken string'],
  ['st-bat-cracked', 'wooden bat with a crack'],
  ['st-helmet-scuffed', 'helmet with scuffs'],
  ['st-bike-rusty', 'bicycle with rust patches'],
  ['st-kite-tangled', 'kite with tangled string'],
  ['st-jump-rope-tangled', 'tangled jump rope'],
  ['st-lightbulb-dark', 'unlit lightbulb (not lamp on/off pair)'],
  ['st-lightbulb-lit', 'glowing isolated lightbulb (not lamp pair)'],
  ['st-battery-corroded', 'battery with tiny corrosion, no brand or numerals'],
  ['st-cable-frayed', 'frayed cable end, kid-safe'],
  ['st-camera-lens-cap-on', 'camera with lens cap on'],
  ['st-camera-lens-cap-off', 'camera with lens cap dangling'],
  ['st-tv-static-mute', 'TV showing mute static grain, NO letters'],
  ['st-remote-battery-door-open', 'remote battery door open'],
  ['st-wallet-empty', 'open empty wallet'],
  ['st-wallet-stuffed', 'overstuffed wallet, blank cards'],
  ['st-purse-spilled', 'purse spilled contents, no logos'],
  ['st-backpack-overstuffed', 'overstuffed backpack, zipper straining'],
  ['st-suitcase-burst', 'overstuffed suitcase, lid not closing'],
  ['st-trash-overflow', 'small bin overflowing trash, kid-safe'],
  ['st-watering-can-empty', 'watering can obviously empty, dry spout'],
  ['st-watering-can-full', 'watering can with water visible at the mouth'],
  ['st-hose-spraying', 'hose nozzle spraying a fan of water'],
  ['st-bucket-soapy', 'bucket with soapy water and bubbles'],
  ['st-mop-in-bucket', 'mop standing in a bucket'],
  ['st-broom-and-dustpan', 'broom with dustpan as one still-life'],
  ['st-sponge-soapy', 'sponge full of suds'],
  ['st-gloves-wet', 'rubber gloves dripping wet'],
  ['st-apron-stained', 'apron with cooking stains, no text'],
  ['st-lunchbox-leaking', 'lunchbox leaking at a corner'],
  ['st-thermos-pouring', 'thermos pouring a stream, blank'],
  ['st-cup-lid-on', 'takeaway cup lid on, blank, no logos'],
  ['st-cup-lid-off', 'takeaway cup lid off beside, blank'],
  ['st-cup-sleeved', 'takeaway cup with a blank cardboard sleeve'],
  ['st-napkin-crumpled', 'crumpled used napkin'],
  ['st-napkin-folded', 'neatly folded napkin'],
], 'Registered whole-object state. Same identity/viewpoint/scale as a typical canonical. No text.');

/** Extra variants packed as n1+ so w1–w5 sheet lists stay stable. */
export const NEXT_VARIANT_CELLS = pack('variant', [
  ['v-pear-sliced', 'pear cut into fanned slices'],
  ['v-peach-sliced', 'peach fanned slices, no pit'],
  ['v-plum-halved', 'plum cut in half, pit showing'],
  ['v-melon-balls', 'small cluster of melon balls in a spoon'],
  ['v-coconut-halved', 'coconut half showing white meat'],
  ['v-pomegranate-open', 'pomegranate broken open, seeds visible'],
  ['v-fig-halved', 'fig cut in half'],
  ['v-date-pitted', 'date with the pit beside it'],
  ['v-olive-bowl-single', 'few olives in a tiny dish'],
  ['v-pickle-spear', 'one pickle spear'],
  ['v-pretzel-twisted', 'twisted pretzel, no salt-letters'],
  ['v-waffle-quarter', 'waffle cut into a quarter'],
  ['v-pancake-rolled', 'pancake rolled up'],
  ['v-omelette-folded', 'folded omelette on a plate fragment'],
  ['v-toast-buttered', 'toast with a butter smear, no text'],
  ['v-jam-on-toast', 'toast with jam smear, no label'],
  ['v-yogurt-cup-open', 'open yogurt cup, blank lid beside, spoon standing'],
  ['v-smoothie-glass', 'smoothie in a glass, straw, no logo'],
  ['v-tea-cup-full', 'teacup full, steam, on saucer'],
  ['v-coffee-mug-latte-art-mute', 'mug of coffee, mute foam swirl, no letters'],
  ['v-salt-shaker', 'salt shaker, no S letter'],
  ['v-pepper-shaker', 'pepper shaker, no P letter'],
  ['v-oil-bottle-pour', 'oil bottle tilted pouring a stream, blank'],
  ['v-cutting-board-empty', 'empty wooden cutting board'],
  ['v-rolling-pin-floured', 'rolling pin with a dusting of flour'],
  ['v-measuring-cup-full', 'measuring cup full of liquid, NO numerals'],
  ['v-measuring-cup-empty', 'empty measuring cup, NO numerals'],
  ['v-colander-full', 'colander full of washed vegetables'],
  ['v-colander-empty', 'empty colander'],
  ['v-mixer-bowl-attached', 'hand mixer in a bowl of batter'],
  ['v-oven-mitt-pair-left', 'single oven mitt'],
  ['v-apron-hanging', 'apron hanging on a hook, blank'],
  ['v-recipe-card-blank', 'blank recipe card, ZERO writing'],
  ['v-shopping-list-pad-blank', 'blank notepad, ZERO writing'],
  ['v-price-tag-blank', 'blank price tag shape, no numerals'],
  ['v-receipt-blank', 'blank receipt paper curl, no numerals'],
  ['v-barcode-mute', 'mute barcode-like stripes with NO digits'],
  ['v-stamp-blank', 'blank postage-stamp shape, no letters'],
  ['v-magnet-letterless', 'fridge magnet shape, no letters'],
  ['v-photo-frame-empty', 'empty photo frame, mute mat, no faces'],
  ['v-calendar-blank', 'wall calendar grid with NO numbers or words'],
  ['v-alarm-clock-blank', 'alarm clock, ticks only, NO numerals'],
  ['v-flashlight-standing', 'flashlight standing, off, no beam (not on/off pair)'],
  ['v-battery-aa-pair', 'two blank batteries side by side, no brand'],
  ['v-usb-stick', 'USB stick, no logo'],
  ['v-mouse-computer', 'computer mouse, no brand'],
  ['v-keyboard-blank', 'keyboard with blank keycaps, no letters'],
  ['v-tablet-blank', 'tablet with blank dark screen'],
  ['v-charger-brick', 'charger brick and cable coiled, no brand'],
  ['v-speaker-small', 'small speaker, no brand'],
  ['v-game-controller-front', 'game controller front, no logos or letters'],
  ['v-dice-blank-pips-only', 'one die showing pips, no numerals'],
  ['v-playing-card-back', 'playing card back pattern, no rank letters'],
  ['v-puzzle-piece', 'single jigsaw puzzle piece'],
  ['v-board-game-box-blank', 'blank game box, no title'],
  ['v-kite-idle', 'kite resting, string coiled'],
  ['v-jump-rope-coiled', 'jump rope neatly coiled'],
  ['v-hula-hoop', 'hula hoop standing'],
  ['v-skipping-stone', 'flat skipping stone'],
  ['v-bucket-sand-castle-mold', 'sand castle mold beside a bucket'],
  ['v-shovel-beach', 'small beach shovel'],
  ['v-pail-sand', 'pail full of sand'],
  ['v-shell-single', 'one large seashell'],
  ['v-starfish', 'starfish still-life, kid-safe'],
  ['v-mitten-left', 'single left knit mitten'],
  ['v-mitten-right', 'matching right knit mitten'],
  ['v-raincoat-hood-up', 'raincoat with hood up, blank'],
  ['v-raincoat-hood-down', 'raincoat with hood down, blank'],
  ['v-sandal-left', 'single left sandal, no logos'],
  ['v-sandal-right', 'matching right sandal'],
  ['v-slipper-upright', 'house slipper standing'],
  ['v-slipper-tipped', 'house slipper on its side'],
  ['v-tie-loosened', 'necktie knot pulled loose, blank'],
  ['v-bow-untied', 'untied bow / ribbon, no letters'],
  ['v-overall-bib-unclipped', 'kid overalls with one bib strap unclipped'],
  ['v-thermos-open-steam', 'open thermos with steam, blank'],
  ['v-straw-cup', 'cup with a straw, no logo'],
  ['v-placemat-empty', 'empty placemat, no pattern text'],
  ['v-chopsticks-crossed', 'two chopsticks crossed, not on a rest'],
  ['v-napkin-crumpled', 'one crumpled napkin'],
], 'Isolated still-life on black. No text, no logos.');

/** n3+ variants — do not append to NEXT_VARIANT_CELLS (that would resize n2). */
export const N3_VARIANT_CELLS = pack('variant', [
  ['v-duffel-open', 'open duffel bag empty-ish, no logos'],
  ['v-tote-slouch', 'slouchy tote bag standing, blank'],
  ['v-purse-closed', 'small closed purse, no logos'],
  ['v-messenger-flap-up', 'messenger bag flap lifted, blank'],
  ['v-fanny-pack-open', 'open fanny pack, empty pocket'],
  ['v-rolling-bag-tilted', 'rolling bag tipped on its back, no tags'],
  ['v-garment-bag-hanging', 'garment bag hanging, blank'],
  ['v-belt-buckled', 'leather belt buckled in a loop, blank'],
  ['v-watch-face-blank', 'wristwatch, blank face, no numerals'],
  ['v-armchair-tipped', 'small armchair tipped on its side'],
  ['v-sofa-cushion-out', 'sofa fragment with one cushion pulled out'],
  ['v-dresser-drawer-open', 'dresser with one drawer open, empty'],
  ['v-nightstand-drawer-open', 'nightstand drawer open, empty'],
  ['v-bookshelf-empty', 'small empty bookshelf'],
  ['v-wardrobe-open-empty', 'wardrobe doors open, empty rail'],
  ['v-hamper-full', 'laundry hamper stuffed with clothes'],
], 'Isolated still-life on black. No text, no logos.');

/** n4 variants — do not append to N3 (that would resize n3). */
export const N4_VARIANT_CELLS = pack('variant', [
  ['v-ottoman-round', 'round ottoman, blank fabric'],
  ['v-beanbag-slumped', 'slumped beanbag chair'],
  ['v-crib-empty', 'empty crib, no mobile letters'],
  ['v-highchair-tray-up', 'highchair with tray lifted'],
  ['v-stroller-folded', 'folded stroller standing, no logos'],
  ['v-bike-helmet-upside-down', 'bike helmet upside-down, no logos'],
  ['v-scooter-folded', 'kick scooter folded, no logos'],
  ['v-cooler-open', 'open picnic cooler, empty-ish, blank'],
  ['v-yoga-mat-rolled', 'yoga mat rolled and strapped, no logos'],
  ['v-life-jacket-flat', 'life jacket laid flat, no logos'],
  ['v-snorkel-mask', 'snorkel mask still-life, no brand'],
  ['v-fishing-rod-leaning', 'fishing rod leaning, no brand'],
  ['v-tent-bag-stuffed', 'stuffed tent sack, no logos'],
  ['v-lantern-standing-unlit', 'camping lantern standing unlit (not lamp on/off)'],
  ['v-camp-stool-folded', 'folded camp stool'],
  ['v-sleeping-pad-rolled', 'sleeping pad rolled with a strap'],
], 'Isolated still-life on black. No text, no logos.');

/** n5 variants — do not append to N4 (that would resize n4). */
export const N5_VARIANT_CELLS = pack('variant', [
  ['v-rocking-chair-still', 'rocking chair at rest, empty'],
  ['v-bench-tipped', 'small bench tipped on its side'],
  ['v-barstool-empty', 'barstool standing empty'],
  ['v-tv-stand-empty', 'empty TV stand, no screen digits'],
  ['v-coffee-table-bare', 'bare coffee table, no magazines'],
  ['v-floor-lamp-standing', 'floor lamp standing unlit (not on/off pair)'],
  ['v-ceiling-fan-still', 'ceiling-fan fragment, blades still'],
  ['v-mailbox-flag-up', 'mailbox with flag up, no letters or numbers'],
  ['v-wheelbarrow-empty', 'empty wheelbarrow'],
  ['v-lawnmower-side', 'push mower from the side, no brand'],
  ['v-rake-leaning', 'garden rake leaning, tines visible'],
  ['v-spade-upright', 'garden spade standing in a soil clump'],
  ['v-pruner-closed', 'closed pruning shears, no brand'],
  ['v-watering-can-tipped', 'watering can on its side, empty'],
  ['v-birdhouse-blank', 'blank birdhouse, no numbers or words'],
  ['v-planter-empty', 'empty planter pot'],
], 'Isolated still-life on black. No text, no logos.');

/** n6 variants — do not append to N5. */
export const N6_VARIANT_CELLS = pack('variant', [
  ['v-blender-empty', 'empty blender jar, lid beside, no logos'],
  ['v-toaster-empty', 'toaster empty slots, no brand'],
  ['v-hand-mixer-standing', 'hand mixer standing, beaters down, no brand'],
  ['v-grater-upright', 'box grater standing'],
  ['v-whisk-upright', 'balloon whisk standing alone'],
  ['v-ladle-hanging', 'ladle hanging from a hook fragment'],
  ['v-tongs-open', 'kitchen tongs open'],
  ['v-can-opener', 'manual can opener, no brand'],
  ['v-ice-tray-empty', 'empty ice cube tray'],
  ['v-slow-cooker-lid-off', 'slow cooker lid off beside, blank, no digits'],
  ['v-rice-cooker-closed', 'closed rice cooker, no digits or logos'],
  ['v-air-fryer-basket-out', 'air fryer with basket pulled out, empty, no logos'],
  ['v-mortar-pestle', 'mortar with pestle resting'],
  ['v-zester-upright', 'citrus zester standing'],
  ['v-mandoline-closed', 'mandoline slicer folded closed, no brand'],
  ['v-funnel-upright', 'kitchen funnel standing'],
], 'Isolated still-life on black. No text, no logos.');

/** c3+ clusters — append-only so c1/c2 sheet lists stay 4+4. */
export const NEXT_CLUSTER_CELLS = pack('cluster', [
  ['cl-waffles-stack', 'stack of waffles as one prop'],
  ['cl-pretzels-bowl', 'bowl of pretzels, no letters'],
  ['cl-tacos-three', 'three tacos clustered'],
  ['cl-hotdogs-two', 'two hotdogs in buns side by side'],
  ['cl-burgers-two', 'two burgers stacked offset'],
  ['cl-nuggets-plate', 'plate of chicken nuggets'],
  ['cl-fries-cones-two', 'two paper cones of fries, blank'],
  ['cl-drumsticks-two', 'two cooked drumsticks'],
  ['cl-kebabs-two', 'two skewers of food'],
  ['cl-dumplings-plate', 'plate of dumplings, no labels'],
  ['cl-spring-rolls-group', 'cluster of spring rolls'],
  ['cl-noodles-bowls-two', 'two noodle bowls together'],
  ['cl-corn-cobs-three', 'three corn cobs clustered'],
  ['cl-peppers-three', 'three bell peppers clustered'],
  ['cl-cucumbers-three', 'three cucumbers clustered'],
  ['cl-avocados-three', 'three avocados clustered'],
  ['cl-kiwis-three', 'three kiwis clustered'],
  ['cl-mangoes-two', 'two mangoes side by side'],
  ['cl-broccoli-heads-two', 'two broccoli heads together'],
  ['cl-lettuce-heads-two', 'two lettuce heads together'],
  ['cl-olives-bowl', 'bowl of olives'],
  ['cl-ice-cream-scoops-three', 'three ice cream scoops on a plate'],
  ['cl-popsicles-two', 'two popsicles, no brand'],
  ['cl-chocolates-box-open', 'open chocolate box, blank lid, no letters'],
  ['cl-handbags-two', 'two handbags standing together'],
  ['cl-totes-three', 'three tote bags in a row, blank'],
  ['cl-backpacks-two', 'two backpacks side by side'],
  ['cl-purses-two', 'two small purses together'],
  ['cl-wallets-two', 'two closed wallets'],
  ['cl-belts-coiled-two', 'two coiled belts'],
  ['cl-ties-two', 'two neckties draped together'],
  ['cl-scarves-draped-two', 'two scarves draped as one cluster'],
  ['cl-caps-three', 'three baseball caps stacked, no logos'],
  ['cl-beanies-two', 'two beanies stacked'],
  ['cl-tshirts-folded-stack', 'stack of folded t-shirts'],
  ['cl-jeans-folded-two', 'two pairs of folded jeans'],
  ['cl-dresses-hangers-two', 'two dresses on hangers together'],
  ['cl-umbrellas-closed-two', 'two closed umbrellas standing'],
  ['cl-sunglasses-two', 'two pairs of sunglasses'],
  ['cl-watches-two', 'two watches, blank faces, no numerals'],
  ['cl-shopping-bags-three', 'three shopping bags, no logos'],
  ['cl-messenger-bags-two', 'two messenger bags'],
  ['cl-fanny-packs-two', 'two fanny packs'],
  ['cl-suitcases-two', 'two suitcases standing'],
  ['cl-garment-bags-two', 'two garment bags hanging together'],
  ['cl-earmuffs-two', 'two pairs of earmuffs'],
  ['cl-aprons-two', 'two aprons hanging together, blank'],
  ['cl-raincoats-two', 'two raincoats hanging together'],
  ['cl-stools-two', 'two stools side by side'],
  ['cl-lamps-desk-two', 'two desk lamps together'],
  ['cl-picture-frames-three', 'three empty picture frames, mute mats'],
  ['cl-vases-three', 'three vases in a row'],
  ['cl-cushions-pile', 'pile of sofa cushions'],
  ['cl-rugs-rolled-two', 'two rolled rugs'],
  ['cl-baskets-three', 'three baskets nested or grouped'],
  ['cl-storage-boxes-three', 'three storage boxes stacked, blank'],
  ['cl-clocks-two', 'two analog clocks, ticks only, NO numerals'],
  ['cl-chairs-dining-two', 'two dining chairs together'],
  ['cl-armchairs-two', 'two small armchairs'],
  ['cl-side-tables-two', 'two small side tables'],
  ['cl-plant-stands-two', 'two plant stands with pots'],
  ['cl-coat-racks-two', 'two coat-rack fragments with coats'],
  ['cl-shoe-racks-two', 'two small shoe racks with shoes'],
  ['cl-hampers-two', 'two laundry hampers'],
  ['cl-quesadillas-two', 'two quesadillas stacked offset'],
  ['cl-burritos-two', 'two burritos side by side'],
  ['cl-falafel-plate', 'plate of falafel balls'],
  ['cl-samosas-group', 'cluster of samosas'],
  ['cl-empanadas-group', 'cluster of empanadas'],
  ['cl-croissants-three', 'three croissants clustered'],
  ['cl-scones-two', 'two scones together'],
  ['cl-brownies-stack', 'stack of brownies'],
  ['cl-cardigans-two', 'two cardigans folded together'],
  ['cl-hoodies-two', 'two hoodies stacked'],
  ['cl-shorts-folded-two', 'two pairs of folded shorts'],
  ['cl-pajamas-folded', 'folded pajama set as one cluster'],
  ['cl-hiking-boots-two', 'two hiking boots together, no logos'],
  ['cl-loafers-two', 'two loafers together, no logos'],
  ['cl-blazers-hangers-two', 'two blazers on hangers'],
  ['cl-tank-tops-folded-two', 'two folded tank tops'],
], 'Natural group as ONE prop. No numerals, no labels, no text.');

/** g1 overlays — separate from o1/o2 so o2 stays 1 sheet. */
export const NEXT_OVERLAY_CELLS = pack('overlay', [
  ['ov-pilling-fabric', 'fabric pilling fuzz overlay'],
  ['ov-seam-rip', 'short ripped seam overlay'],
  ['ov-hem-loose', 'loose hanging hem thread overlay'],
  ['ov-button-missing-thread', 'empty button stitches overlay, no button'],
  ['ov-pocket-flap-up', 'pocket flap lifted overlay atom'],
  ['ov-velcro-strip', 'small velcro strip overlay, no letters'],
  ['ov-snap-fastener', 'clothing snap fastener overlay'],
  ['ov-drawstring-bow', 'drawstring bow overlay'],
  ['ov-elastic-ruche', 'elastic ruched fabric overlay'],
  ['ov-collar-tab', 'tiny collar tab overlay'],
  ['ov-cuff-unbuttoned', 'unbuttoned cuff tab overlay'],
  ['ov-bag-strap-twist', 'twisted bag-strap overlay'],
  ['ov-zipper-teeth', 'short zipper-teeth run overlay'],
  ['ov-name-tape-blank', 'blank name-tape rectangle, ZERO letters'],
  ['ov-lint-roller-sheet', 'lint-roller sheet overlay with fuzz'],
  ['ov-hanger-crease', 'hanger-shoulder bump crease overlay'],
], 'Compact overlay atom, keyable, generous margin, no full background, no text.');

/** t4 states — do not append to STATE_CELLS (that would resize t3). */
export const NEXT_STATE_CELLS = pack('state', [
  ['st-chair-wobbly', 'chair with one short leg, slightly tilted'],
  ['st-table-wobbly', 'small table with a matchbook under one leg'],
  ['st-sofa-sagging', 'sofa fragment with a sagging cushion'],
  ['st-mattress-rolled', 'mattress rolled and strapped'],
  ['st-curtain-tied-back', 'curtain tied back on a fragment rod'],
  ['st-blind-half-down', 'window blind half-lowered, no numerals'],
  ['st-drawer-jammed-open', 'drawer stuck half-open, empty'],
  ['st-closet-overflow', 'closet fragment overflowing clothes'],
  ['st-hamper-overflow', 'hamper overflowing laundry'],
  ['st-coat-rack-full', 'coat rack packed with coats'],
  ['st-umbrella-stand-full', 'umbrella stand with several umbrellas'],
  ['st-shoe-rack-full', 'shoe rack packed with shoes'],
  ['st-bed-unmade', 'unmade bed fragment, rumpled blanket'],
  ['st-pillow-on-floor', 'pillow on the floor beside a bed fragment'],
  ['st-blanket-dragged', 'blanket trailing off a bed fragment'],
  ['st-rug-curled-corner', 'rug with one corner curled up'],
], 'Registered whole-object state. Same identity/viewpoint/scale as a typical canonical. No text.');

/** c5 clusters — do not append to NEXT_CLUSTER_CELLS (that would resize c4). */
export const C5_CLUSTER_CELLS = pack('cluster', [
  ['cl-chicken-wings-plate', 'plate of chicken wings'],
  ['cl-mozzarella-sticks', 'pile of mozzarella sticks'],
  ['cl-garlic-bread-two', 'two slices of garlic bread'],
  ['cl-baguettes-two', 'two baguettes side by side'],
  ['cl-churros-group', 'cluster of churros, no letters'],
  ['cl-macarons-stack', 'small stack of macarons, no logos'],
  ['cl-donut-holes-bowl', 'bowl of donut holes'],
  ['cl-parfaits-two', 'two parfait glasses, no logos'],
  ['cl-smoothies-two', 'two smoothie cups, blank, no logos'],
  ['cl-polo-shirts-two', 'two polo shirts folded, blank'],
  ['cl-sweatpants-folded-two', 'two pairs of folded sweatpants'],
  ['cl-leggings-folded-two', 'two pairs of folded leggings'],
  ['cl-skirts-hangers-two', 'two skirts on hangers'],
  ['cl-vests-two', 'two vests together, blank'],
  ['cl-cleats-two', 'two sports cleats, no logos'],
  ['cl-helmets-bike-two', 'two bike helmets, no logos'],
], 'Natural group as ONE prop. No numerals, no labels, no text.');

/** c6 clusters — do not append to C5 (that would resize c5). */
export const C6_CLUSTER_CELLS = pack('cluster', [
  ['cl-tater-tots-plate', 'plate of tater tots'],
  ['cl-fish-sticks-plate', 'plate of fish sticks'],
  ['cl-corn-dogs-two', 'two corn dogs'],
  ['cl-soft-pretzels-two', 'two soft pretzels, no letters'],
  ['cl-cinnamon-rolls-two', 'two cinnamon rolls, no icing letters'],
  ['cl-onigiri-two', 'two rice triangles, no nori letters'],
  ['cl-bao-two', 'two steamed buns'],
  ['cl-tamales-two', 'two tamales'],
  ['cl-arepas-two', 'two arepas'],
  ['cl-salads-bowls-two', 'two salad bowls'],
  ['cl-tracksuits-two', 'two folded tracksuits, blank'],
  ['cl-windbreakers-two', 'two windbreakers, no logos'],
  ['cl-overalls-two', 'two kid overalls'],
  ['cl-onesies-two', 'two baby onesies, no letters'],
  ['cl-snow-boots-two', 'two snow boots, no logos'],
  ['cl-rain-boots-kids-two', 'two kid rain boots (not the adult pair cell)'],
], 'Natural group as ONE prop. No numerals, no labels, no text.');

/** c7 clusters — do not append to C6 (that would resize c6). */
export const C7_CLUSTER_CELLS = pack('cluster', [
  ['cl-ravioli-plate', 'plate of ravioli'],
  ['cl-lasagna-slices-two', 'two lasagna slices'],
  ['cl-meatballs-bowl', 'bowl of meatballs'],
  ['cl-gyros-two', 'two gyros, no letters'],
  ['cl-naan-two', 'two naan breads'],
  ['cl-pita-stack', 'small stack of pita'],
  ['cl-curry-bowls-two', 'two curry bowls, no labels'],
  ['cl-bento-two', 'two bento boxes, blank lids'],
  ['cl-thermos-two', 'two thermoses, blank'],
  ['cl-water-bottles-two', 'two sports bottles, no logos'],
  ['cl-turtlenecks-two', 'two turtlenecks folded, blank'],
  ['cl-flannels-two', 'two flannel shirts folded, blank'],
  ['cl-denim-jackets-two', 'two denim jackets, no logos'],
  ['cl-parkas-two', 'two parkas, no logos'],
  ['cl-ponchos-two', 'two rain ponchos, blank'],
  ['cl-overalls-bib-two', 'two bib overalls (not the kid-overalls cell)'],
], 'Natural group as ONE prop. No numerals, no labels, no text.');

/** c8 clusters — do not append to C7. */
export const C8_CLUSTER_CELLS = pack('cluster', [
  ['cl-wontons-plate', 'plate of wontons'],
  ['cl-gnocchi-bowl', 'bowl of gnocchi'],
  ['cl-risotto-bowls-two', 'two risotto bowls'],
  ['cl-enchiladas-two', 'two enchiladas on a plate'],
  ['cl-hummus-plates-two', 'two hummus plates with pita triangles'],
  ['cl-tabbouleh-bowls-two', 'two tabbouleh bowls'],
  ['cl-couscous-bowls-two', 'two couscous bowls'],
  ['cl-polenta-slices-two', 'two polenta slices'],
  ['cl-quiche-slices-two', 'two quiche slices'],
  ['cl-crew-sweaters-two', 'two crewneck sweaters folded, blank'],
  ['cl-henleys-two', 'two henley shirts folded, blank'],
  ['cl-blouses-two', 'two simple blouses on hangers, blank'],
  ['cl-oxford-shirts-two', 'two oxford shirts folded, blank, no logos'],
  ['cl-sarongs-two', 'two sarongs folded, blank'],
  ['cl-kimonos-two', 'two simple kimonos, no motifs that look like letters'],
  ['cl-coveralls-two', 'two work coveralls, blank, no logos'],
], 'Natural group as ONE prop. No numerals, no labels, no text.');

/** g2 overlays — do not append to NEXT_OVERLAY_CELLS (that would resize g1). */
export const G2_OVERLAY_CELLS = pack('overlay', [
  ['ov-snag-thread', 'single fabric snag thread overlay'],
  ['ov-frayed-cuff', 'tiny frayed cuff-edge overlay'],
  ['ov-iron-shine', 'iron-shine patch overlay'],
  ['ov-lint-ball', 'single lint ball overlay'],
  ['ov-static-cling', 'tiny static-cling hair overlay'],
  ['ov-safety-pin-closed', 'closed safety pin overlay'],
  ['ov-hook-and-eye', 'hook-and-eye fastener overlay'],
  ['ov-toggle-button', 'toggle-button overlay, no letters'],
  ['ov-drawcord-tip', 'drawcord aglet overlay'],
  ['ov-belt-loop', 'empty belt-loop overlay'],
  ['ov-grommet-ring', 'fabric grommet ring overlay'],
  ['ov-rivet-dot', 'tiny metal rivet overlay'],
  ['ov-contrast-stitch', 'short contrast-stitch run overlay'],
  ['ov-piping-trim', 'short piping-trim overlay'],
  ['ov-lace-edge', 'tiny lace-edge overlay'],
  ['ov-pom-pom', 'single pom-pom overlay'],
], 'Compact overlay atom, keyable, generous margin, no full background, no text.');

/** g3 overlays — do not append to G2 (that would resize g2). */
export const G3_OVERLAY_CELLS = pack('overlay', [
  ['ov-bias-tape', 'short bias-tape overlay'],
  ['ov-rickrack', 'short rickrack overlay'],
  ['ov-pleat-fold', 'single pleat-fold overlay'],
  ['ov-dart-stitch', 'tiny dart-stitch overlay'],
  ['ov-placket-tab', 'placket tab overlay, no letters'],
  ['ov-epaulette', 'epaulette overlay, no rank marks'],
  ['ov-vent-slit', 'short vent-slit overlay'],
  ['ov-kick-pleat', 'kick-pleat overlay'],
  ['ov-ruffle-trim', 'tiny ruffle-trim overlay'],
  ['ov-tassel-one', 'single tassel overlay'],
  ['ov-bead-row', 'short bead-row overlay'],
  ['ov-appliqué-blob', 'blank appliqué blob overlay, no letters'],
  ['ov-yoke-seam', 'yoke-seam overlay'],
  ['ov-godet-insert', 'tiny godet insert overlay'],
  ['ov-cording-edge', 'short cording-edge overlay'],
  ['ov-facing-peek', 'facing peek overlay'],
], 'Compact overlay atom, keyable, generous margin, no full background, no text.');

/** g4 overlays — do not append to G3. */
export const G4_OVERLAY_CELLS = pack('overlay', [
  ['ov-welt-pocket', 'welt-pocket overlay atom'],
  ['ov-patch-pocket', 'patch-pocket overlay atom'],
  ['ov-bound-buttonhole', 'bound buttonhole overlay, no letters'],
  ['ov-french-seam', 'short french-seam overlay'],
  ['ov-flat-fell', 'flat-fell seam overlay'],
  ['ov-serged-edge', 'serged-edge overlay'],
  ['ov-pinked-edge', 'pinked-edge overlay'],
  ['ov-blind-hem', 'blind-hem overlay'],
  ['ov-bar-tack', 'tiny bar-tack overlay'],
  ['ov-stay-tape', 'short stay-tape overlay'],
  ['ov-interfacing-peek', 'interfacing peek overlay'],
  ['ov-understitch', 'understitch overlay'],
  ['ov-topstitch-row', 'short topstitch row overlay'],
  ['ov-edge-stitch', 'edge-stitch overlay'],
  ['ov-catch-stitch', 'catch-stitch overlay'],
  ['ov-in-seam-pocket', 'in-seam pocket overlay atom'],
], 'Compact overlay atom, keyable, generous margin, no full background, no text.');

export const MANUS_WORTHY = [
  ...VARIANT_CELLS,
  ...CLUSTER_CELLS,
  ...OVERLAY_CELLS,
  ...STATE_CELLS,
  ...NEXT_VARIANT_CELLS,
  ...N3_VARIANT_CELLS,
  ...N4_VARIANT_CELLS,
  ...N5_VARIANT_CELLS,
  ...N6_VARIANT_CELLS,
  ...NEXT_CLUSTER_CELLS,
  ...C5_CLUSTER_CELLS,
  ...C6_CLUSTER_CELLS,
  ...C7_CLUSTER_CELLS,
  ...C8_CLUSTER_CELLS,
  ...NEXT_OVERLAY_CELLS,
  ...G2_OVERLAY_CELLS,
  ...G3_OVERLAY_CELLS,
  ...G4_OVERLAY_CELLS,
  ...NEXT_STATE_CELLS,
];

function gridFor(n) {
  if (n >= 16) return { format: 'black-contact-4x4', title: '4x4' };
  if (n === 12) return { format: 'black-contact-3x4', title: '3x4' };
  if (n === 9) return { format: 'black-contact-3x3', title: '3x3' };
  if (n === 8) return { format: 'black-contact-4x2', title: '4x2' };
  if (n === 6) return { format: 'black-contact-3x2', title: '3x2' };
  if (n === 4) return { format: 'black-contact-2x2', title: '2x2' };
  return { format: `black-contact-1x${n}`, title: `1x${n}` };
}

export function chunkSheets(idPrefix, titlePrefix, cells, size = 16) {
  const sheets = [];
  for (let i = 0; i < cells.length; i += size) {
    let slice = cells.slice(i, i + size);
    const g = gridFor(slice.length);
    sheets.push({
      id: `${idPrefix}-S${sheets.length + 1}`,
      title: `${titlePrefix} ${g.title}`,
      format: g.format,
      cells: slice,
      extra: '',
    });
  }
  return sheets;
}

const variantSheets = chunkSheets('V', 'variants', VARIANT_CELLS);
const clusterSheets = chunkSheets('C', 'clusters', [...CLUSTER_CELLS, ...NEXT_CLUSTER_CELLS]);
const overlaySheets = chunkSheets('O', 'overlays', OVERLAY_CELLS);
const stateSheets = chunkSheets('T', 'states', STATE_CELLS);
const nextVariantSheets = chunkSheets('N', 'variants-next', NEXT_VARIANT_CELLS);
const n3Sheets = chunkSheets('N3', 'variants-n3', N3_VARIANT_CELLS);
const n4Sheets = chunkSheets('N4', 'variants-n4', N4_VARIANT_CELLS);
const n5Sheets = chunkSheets('N5', 'variants-n5', N5_VARIANT_CELLS);
const n6Sheets = chunkSheets('N6', 'variants-n6', N6_VARIANT_CELLS);
const c5Sheets = chunkSheets('C5', 'clusters-c5', C5_CLUSTER_CELLS);
const c6Sheets = chunkSheets('C6', 'clusters-c6', C6_CLUSTER_CELLS);
const c7Sheets = chunkSheets('C7', 'clusters-c7', C7_CLUSTER_CELLS);
const c8Sheets = chunkSheets('C8', 'clusters-c8', C8_CLUSTER_CELLS);
const nextOverlaySheets = chunkSheets('G', 'overlays-next', NEXT_OVERLAY_CELLS);
const g2Sheets = chunkSheets('G2', 'overlays-g2', G2_OVERLAY_CELLS);
const g3Sheets = chunkSheets('G3', 'overlays-g3', G3_OVERLAY_CELLS);
const g4Sheets = chunkSheets('G4', 'overlays-g4', G4_OVERLAY_CELLS);
const t4Sheets = chunkSheets('T4', 'states-next', NEXT_STATE_CELLS);

/** Manus task.create cap is ~5000 tokens — keep 4 sheets/task (not 8–11 of 4×4). */
const SHEETS_PER_TASK = 4;

function wave(id, title, family, sheets) {
  return { id, title, family, families: [family], style: STYLE, sheets };
}

function packNamed(prefix, title, family, sheets) {
  const out = {};
  let n = 0;
  for (let i = 0; i < sheets.length; i += SHEETS_PER_TASK) {
    n += 1;
    const slice = sheets.slice(i, i + SHEETS_PER_TASK);
    const key = `${prefix}${n}`;
    out[key] = wave(
      `s2-${key}-${family}`,
      `Aggressive S2 ${key.toUpperCase()} ${title} (${slice.length} sheets)`,
      family,
      slice,
    );
  }
  return out;
}

export const WAVES = {
  ...packNamed('w', 'variants', 'variant', variantSheets),
  ...packNamed('c', 'clusters', 'cluster', clusterSheets),
  ...packNamed('o', 'overlays', 'overlay', overlaySheets),
  ...packNamed('t', 'states', 'state', stateSheets),
  ...packNamed('n', 'variants-next', 'variant', nextVariantSheets),
  n3: wave('s2-n3-variant', `Aggressive S2 N3 variants-next (${n3Sheets.length} sheets)`, 'variant', n3Sheets),
  n4: wave('s2-n4-variant', `Aggressive S2 N4 variants-next (${n4Sheets.length} sheets)`, 'variant', n4Sheets),
  n5: wave('s2-n5-variant', `Aggressive S2 N5 variants-next (${n5Sheets.length} sheets)`, 'variant', n5Sheets),
  n6: wave('s2-n6-variant', `Aggressive S2 N6 variants-next (${n6Sheets.length} sheets)`, 'variant', n6Sheets),
  ...packNamed('g', 'overlays-next', 'overlay', nextOverlaySheets),
  g2: wave('s2-g2-overlay', `Aggressive S2 G2 overlays-next (${g2Sheets.length} sheets)`, 'overlay', g2Sheets),
  g3: wave('s2-g3-overlay', `Aggressive S2 G3 overlays-next (${g3Sheets.length} sheets)`, 'overlay', g3Sheets),
  g4: wave('s2-g4-overlay', `Aggressive S2 G4 overlays-next (${g4Sheets.length} sheets)`, 'overlay', g4Sheets),
  t4: wave('s2-t4-state', `Aggressive S2 T4 states-next (${t4Sheets.length} sheets)`, 'state', t4Sheets),
  c5: wave('s2-c5-cluster', `Aggressive S2 C5 clusters (${c5Sheets.length} sheets)`, 'cluster', c5Sheets),
  c6: wave('s2-c6-cluster', `Aggressive S2 C6 clusters (${c6Sheets.length} sheets)`, 'cluster', c6Sheets),
  c7: wave('s2-c7-cluster', `Aggressive S2 C7 clusters (${c7Sheets.length} sheets)`, 'cluster', c7Sheets),
  c8: wave('s2-c8-cluster', `Aggressive S2 C8 clusters (${c8Sheets.length} sheets)`, 'cluster', c8Sheets),
};

export const WAVE_ORDER = Object.keys(WAVES);

export function filterSafety(cells) {
  const kept = [];
  const skipped = [];
  for (const c of cells) {
    const hay = [c.key, c.concept, c.brief].join(' ').toLowerCase();
    const hit = [...SAFETY_SKIP_KEYS].find((deny) => new RegExp(`(^|[^a-z0-9])${deny}([^a-z0-9]|$)`).test(hay));
    if (hit) skipped.push({ key: c.key, reason: `MANUS_SAFETY_DENY:${hit}` });
    else kept.push(c);
  }
  return { kept, skipped };
}

export function counts() {
  return {
    variant: VARIANT_CELLS.length + NEXT_VARIANT_CELLS.length + N3_VARIANT_CELLS.length + N4_VARIANT_CELLS.length + N5_VARIANT_CELLS.length + N6_VARIANT_CELLS.length,
    cluster: CLUSTER_CELLS.length + NEXT_CLUSTER_CELLS.length + C5_CLUSTER_CELLS.length + C6_CLUSTER_CELLS.length + C7_CLUSTER_CELLS.length + C8_CLUSTER_CELLS.length,
    overlay: OVERLAY_CELLS.length + NEXT_OVERLAY_CELLS.length + G2_OVERLAY_CELLS.length + G3_OVERLAY_CELLS.length + G4_OVERLAY_CELLS.length,
    state: STATE_CELLS.length + NEXT_STATE_CELLS.length,
    total: MANUS_WORTHY.length,
    sheets: WAVE_ORDER.reduce((n, k) => n + WAVES[k].sheets.length, 0),
  };
}

export function assertWaveIntegrity() {
  const problems = [];
  const seen = new Set();
  for (const c of MANUS_WORTHY) {
    if (!c.key.startsWith(PREFIX)) problems.push(`bad prefix ${c.key}`);
    if (seen.has(c.key)) problems.push(`dup ${c.key}`);
    seen.add(c.key);
  }
  const used = new Set();
  for (const w of Object.values(WAVES)) {
    if (!w.sheets.length) problems.push(`${w.id} empty`);
    if (w.sheets.length > 11) problems.push(`${w.id} ${w.sheets.length} sheets > 11`);
    for (const s of w.sheets) {
      if (!s.cells.length) problems.push(`${w.id} ${s.id} empty`);
      if (s.cells.length > 16) problems.push(`${w.id} ${s.id} ${s.cells.length} > 16`);
      for (const c of s.cells) {
        if (!c) problems.push(`${w.id} ${s.id} hole`);
        else used.add(c.key);
      }
    }
  }
  if (problems.length) throw new Error(`aggressive-s2 integrity: ${problems.join('; ')}`);
  return { used: used.size, defined: MANUS_WORTHY.length, unused: MANUS_WORTHY.length - used.size };
}

export function writeLedger(extra = {}) {
  assertWaveIntegrity();
  const destDir = path.join(ROOT, STOCKPILE_REL);
  fs.mkdirSync(destDir, { recursive: true });
  const invPath = path.join(destDir, 'inventory.json');
  let existing = {};
  if (fs.existsSync(invPath)) {
    try { existing = JSON.parse(fs.readFileSync(invPath, 'utf8')); } catch { existing = {}; }
  }
  const payload = {
    spec: 'aggressive-s2-stockpile',
    updated_at: new Date().toISOString(),
    no_wiring: true,
    prefix: PREFIX,
    durable_root: STOCKPILE_REL,
    counts: counts(),
    integrity: assertWaveIntegrity(),
    wave_plan: Object.fromEntries(WAVE_ORDER.map((k) => [WAVES[k].id, {
      title: WAVES[k].title,
      expected_sheets: WAVES[k].sheets.length,
      concept_count: WAVES[k].sheets.reduce((n, s) => n + s.cells.length, 0),
      sheets: WAVES[k].sheets.map((s) => ({
        id: s.id, title: s.title, format: s.format, keys: s.cells.map((c) => c.key),
      })),
    }])),
    waves: extra.waves || existing.waves || {},
    running_total: extra.running_total || existing.running_total || null,
  };
  fs.writeFileSync(invPath, JSON.stringify(payload, null, 2));
  return invPath;
}

export function writeTrackedDoc(inv) {
  const c = inv.counts || counts();
  const waves = inv.waves || {};
  const lines = [
    '# Aggressive stockpile S2 — variants / clusters / overlays',
    '',
    'Pack 2 harvest stream. Stockpile only. No PropBank wiring, no producer/recipe/renderer edits.',
    '',
    `- Prefix: \`${PREFIX}\``,
    `- Durable root: \`${STOCKPILE_REL}\``,
    `- Runner: \`scripts/manus/request-aggressive-s2.mjs\``,
    `- Updated: ${inv.updated_at || new Date().toISOString()}`,
    '',
    '## Rate-limit lock',
    '',
    '- **No new fires. No `--all --fire`.** Max 1 in-flight poll.',
    '- Poll interval 35s. On HTTP 429: wait 90s, one retry, then double wait.',
    '- Do not send continue-messages. Download/QA locally while waiting.',
    '',
    '## Counts',
    '',
    `| Kind | n |`,
    `|---|---|`,
    `| variants (B) | ${c.variant} |`,
    `| clusters (J) | ${c.cluster} |`,
    `| overlays (G) | ${c.overlay} |`,
    `| registered states (G) | ${c.state} |`,
    `| total cells | ${c.total} |`,
    `| sheets planned | ${c.sheets} |`,
    '',
    'Deduped vs live bank + visual-grammar + long-tail lt1–lt10. Skips H5 lamp/bag/plug pairs. Does not clone LT/VG matched pair cells.',
    '',
    '## Waves',
    '',
  ];
  for (const k of WAVE_ORDER) {
    const w = WAVES[k];
    const row = waves[w.id] || {};
    lines.push(`### ${w.id}`);
    lines.push('');
    lines.push(`- Title: ${w.title}`);
    lines.push(`- Sheets: ${w.sheets.length} (expected)`);
    lines.push(`- Concepts: ${w.sheets.reduce((n, s) => n + s.cells.length, 0)}`);
    lines.push(`- Task: ${row.task_id || '(pending)'} ${row.task_url || ''}`);
    lines.push(`- Agent: ${row.agent_status || '(n/a)'}`);
    lines.push(`- QA: PASS ${ (row.items || []).filter((i) => i.qa_status === 'PASS').length } / HOLD ${ (row.items || []).filter((i) => i.qa_status === 'HOLD').length }`);
    if (row.holds && row.holds.length) lines.push(`- Holds: ${row.holds.join('; ')}`);
    lines.push('');
  }
  if (inv.running_total) {
    lines.push('## Running total');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(inv.running_total, null, 2));
    lines.push('```');
    lines.push('');
  }
  const dest = path.join(ROOT, TRACKED_DOC_REL);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${lines.join('\n')}\n`);
  return dest;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const info = assertWaveIntegrity();
  const invPath = writeLedger();
  const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
  writeTrackedDoc(inv);
  console.log(JSON.stringify({ ok: true, inventory: invPath, ...counts(), ...info }, null, 2));
}
