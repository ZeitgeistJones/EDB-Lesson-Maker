# Prop sheet 04 — scene set pieces

`buildScene` drags Twemoji into ghost slots today, which reads as icons on a
photo-style background rather than as building a scene. These are cutouts at
the same weight as the scene backgrounds, so a piece dropped on a scene's
`groundY` looks like it belongs there.

Slugs, panel order:
`tree` `cloud` `sun` `side-table` `chair` `rug`

Roles: `scenePart` for all six.

Note the ground rule: the outdoor pieces are drawn standing on nothing, with
their base flat, so `standOn()` can seat them on a scene's `groundY` without
a floating gap.

---

Generate a 2×3 grid of scene-building cutouts for an interactive English lesson whiteboard (2 rows, 3 columns). Overall size 3840×1180 so each panel is exactly 1280×590. Panels divided evenly, NO white gutters or divider lines.

Every panel: solid pure black background. Flat vector, clean and simple, soft muted colors, consistent style and lighting across all six. Front-on. ONE object per panel, fully visible, centered, ~5% margin from edges. No people, animals, text, letters, numbers, logos, labels, or writing of any kind.

These get dropped onto illustrated room and outdoor backgrounds, so they must read as objects in a scene, not as flat icons. Objects that stand on a floor must have a FLAT BASE sitting on an invisible ground line at the bottom of the object — no floating, no drop shadow, no ground patch, no grass tuft under them.

6 pieces, left→right, top→bottom:

1) Tree — simple broadleaf tree, muted green canopy and soft brown trunk, trunk base flat.
2) Cloud — single soft white-grey cloud, simple rounded lobes, no rain, no face.
3) Sun — simple warm yellow sun disc with short soft rays, no face, no sunglasses.
4) Side table — small round or square wooden side table, light wood, front-on, empty top, legs flat on the ground line.
5) Chair — simple wooden dining chair seen slightly from the side, muted wood with a soft cushion seat, legs flat on the ground line.
6) Rug — small rectangular floor rug seen in perspective from above-front, muted pastel color with a plain border, no pattern, no fringe text.

Black backgrounds only. Consistent lighting. Premium cutouts ready to crop.
