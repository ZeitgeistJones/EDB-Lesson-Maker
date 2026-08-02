#!/usr/bin/env python3
"""make_flat_props.py — author the geometric half of the board prop bank.

The bank has two kinds of prop, and they want two different pipelines:

  ILLUSTRATED props (a bookshelf, a jar, a backpack) are generated from the
  grid prompts in docs/asset-prompts/ and cut with tools/assets/cut_grid.py.
  Drawing those by hand looks worse than generating them.

  GEOMETRIC props (bins, slots, strips, tokens, bubbles, arrows) are shape
  work. Generating them is the worse option: a model will not hold a slot pad
  and its wide variant to the same corner radius, will not give a sort-bin
  pair the same silhouette in two colours, and will smuggle glyphs into a
  token that is supposed to be blank. Those are exactly the props the board
  recipes need to line up pixel-for-pixel, so they are authored here and
  stay regenerable.

Style is matched to the generated pack: soft muted fills, a vertical
gradient, a thin darker edge, a light top highlight, no baked shadow.

Usage:
    python3 tools/assets/make_flat_props.py -o public/assets/09_props/img
    python3 tools/assets/make_flat_props.py -o out --svg-dir out/svg   # keep sources

Requires: cairosvg  (pip install cairosvg)
"""

import argparse
import os

import cairosvg

# Palette sampled from the generated props so a hand-authored bin sits next to
# a generated one without reading as a different pack.
INK = "#5b6b7a"          # muted slate outline used across the pack
PALETTES = {
    "blue": ("#a9cde8", "#6ea8d4", "#4b83ad"),
    "green": ("#b3d9b8", "#7cba86", "#55906a"),
    "amber": ("#f3d9a4", "#e3b567", "#b98c3e"),
    "rose": ("#eab6b0", "#d4867f", "#a85e58"),
    "teal": ("#a8d4d0", "#6fb2ad", "#4b8985"),
    "cream": ("#fbf7ec", "#f1e9d5", "#cbbf9f"),
    "paper": ("#ffffff", "#f4f4f2", "#cfd4d8"),
    "grey": ("#d8dde2", "#b6bfc8", "#8d99a4"),
}


def defs(name, pal, vertical=True):
    light, mid, dark = pal
    x2, y2 = ("0", "1") if vertical else ("1", "0")
    return f"""
  <linearGradient id="{name}" x1="0" y1="0" x2="{x2}" y2="{y2}">
    <stop offset="0" stop-color="{light}"/>
    <stop offset="1" stop-color="{mid}"/>
  </linearGradient>"""


def svg(w, h, body, gradients=""):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}">\n<defs>{gradients}\n</defs>\n{body}\n</svg>'
    )


# --------------------------------------------------------------------------
# Props. Each returns (svg_string, longest_output_edge).
# --------------------------------------------------------------------------

def sort_bin(colour):
    """Sort bin matching the generated blue bin's silhouette, recoloured.

    sortBins() needs two or three bins that read as the same object in
    different colours. Generating that pair never held the shape steady.
    """
    pal = PALETTES[colour]
    light, mid, dark = pal
    g = defs("body", pal) + defs("rim", (light, light, mid), vertical=False)
    body = f"""
  <path d="M40 92 L62 250 Q65 268 84 268 L396 268 Q415 268 418 250 L440 92 Z"
        fill="url(#body)" stroke="{dark}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M124 108 L132 258 M240 108 L240 258 M356 108 L348 258"
        stroke="{dark}" stroke-width="2.5" opacity="0.3" fill="none"/>
  <path d="M62 250 Q240 262 418 250" stroke="{light}" stroke-width="4"
        opacity="0.45" fill="none"/>
  <rect x="18" y="58" width="444" height="52" rx="24" fill="url(#rim)"
        stroke="{dark}" stroke-width="3"/>
  <rect x="46" y="66" width="388" height="34" rx="17" fill="{dark}"/>
  <path d="M63 84 Q240 70 417 84 L417 96 Q240 82 63 96 Z" fill="{mid}" opacity="0.85"/>
  <rect x="18" y="58" width="444" height="18" rx="9" fill="#ffffff" opacity="0.28"/>"""
    return svg(480, 300, body, g), 480


def dock_rail():
    """Wide shallow rail the dock row of pieces sits on."""
    pal = PALETTES["amber"]
    light, mid, dark = pal
    g = defs("rail", pal)
    body = f"""
  <rect x="12" y="40" width="596" height="34" rx="14" fill="url(#rail)"
        stroke="{dark}" stroke-width="3"/>
  <rect x="12" y="40" width="596" height="13" rx="6" fill="#ffffff" opacity="0.35"/>
  <rect x="58" y="74" width="26" height="34" rx="8" fill="{mid}" stroke="{dark}" stroke-width="3"/>
  <rect x="536" y="74" width="26" height="34" rx="8" fill="{mid}" stroke="{dark}" stroke-width="3"/>"""
    return svg(620, 120, body, g), 620


def answer_strip():
    """Long blank strip for a written answer — orderLine's answer key."""
    pal = PALETTES["cream"]
    light, mid, dark = pal
    g = defs("strip", pal)
    body = f"""
  <rect x="10" y="10" width="580" height="92" rx="14" fill="url(#strip)"
        stroke="{dark}" stroke-width="3"/>
  <rect x="10" y="10" width="580" height="30" rx="14" fill="#ffffff" opacity="0.55"/>
  <path d="M40 74 H560" stroke="{dark}" stroke-width="2.5" opacity="0.45"/>"""
    return svg(600, 112, body, g), 600


def slot_pad(w, h):
    """Dashed ghost slot — 'place a card here'. No glyphs, per the pack rule."""
    body = f"""
  <rect x="8" y="8" width="{w - 16}" height="{h - 16}" rx="20"
        fill="#ffffff" fill-opacity="0.10"
        stroke="{PALETTES['grey'][2]}" stroke-width="6"
        stroke-dasharray="26 20" stroke-linecap="round"/>"""
    return svg(w, h, body), max(w, h)


def cover_tile():
    """Opaque tile that hides a target until a student drags it off."""
    pal = PALETTES["teal"]
    light, mid, dark = pal
    g = defs("tile", pal)
    body = f"""
  <rect x="10" y="10" width="300" height="300" rx="34" fill="url(#tile)"
        stroke="{dark}" stroke-width="3"/>
  <rect x="10" y="10" width="300" height="120" rx="34" fill="#ffffff" opacity="0.22"/>
  <rect x="42" y="42" width="236" height="236" rx="22" fill="none"
        stroke="#ffffff" stroke-width="4" opacity="0.5"/>"""
    return svg(320, 320, body, g), 320


def prize_flap():
    """Lift-up flap over a reward pocket — folded corner reads as 'pull me'."""
    pal = PALETTES["amber"]
    light, mid, dark = pal
    g = defs("flap", pal)
    body = f"""
  <path d="M12 12 H348 V214 Q348 228 334 228 H26 Q12 228 12 214 Z"
        fill="url(#flap)" stroke="{dark}" stroke-width="3" stroke-linejoin="round"/>
  <rect x="12" y="12" width="336" height="70" fill="#ffffff" opacity="0.25"/>
  <path d="M348 12 L272 12 L348 88 Z" fill="{light}" stroke="{dark}" stroke-width="3"
        stroke-linejoin="round"/>
  <path d="M272 12 L348 88" stroke="{dark}" stroke-width="3" opacity="0.5"/>"""
    return svg(360, 240, body, g), 360


def thought_bubble():
    """Cloud bubble with trailing dots — pairs with the generated oval bubble."""
    pal = PALETTES["paper"]
    light, mid, dark = pal
    g = defs("cloud", pal)
    stroke = "#8ea39b"
    body = f"""
  <path d="M120 60 Q150 18 208 26 Q250 4 300 28 Q360 16 386 62
           Q440 74 434 128 Q446 176 396 196 Q360 232 302 220
           Q252 244 204 218 Q142 226 118 184 Q66 172 74 124 Q70 78 120 60 Z"
        fill="url(#cloud)" stroke="{stroke}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="120" cy="264" r="30" fill="url(#cloud)" stroke="{stroke}" stroke-width="5"/>
  <circle cx="68" cy="312" r="19" fill="url(#cloud)" stroke="{stroke}" stroke-width="5"/>
  <circle cx="30" cy="346" r="11" fill="url(#cloud)" stroke="{stroke}" stroke-width="5"/>"""
    return svg(500, 366, body, g), 500


def speech_bubble_square():
    """Rounded-rect bubble with a left tail — for a second speaker on a page."""
    pal = PALETTES["paper"]
    light, mid, dark = pal
    g = defs("box", pal)
    stroke = "#8ea39b"
    body = f"""
  <path d="M14 14 H486 Q506 14 506 34 V236 Q506 256 486 256 H150
           L74 320 L92 256 H34 Q14 256 14 236 V34 Q14 14 34 14 Z"
        fill="url(#box)" stroke="{stroke}" stroke-width="5" stroke-linejoin="round"/>"""
    return svg(520, 334, body, g), 520


def arrow_right():
    """Sequencing arrow — 'this then that' on order and story pages."""
    pal = PALETTES["blue"]
    light, mid, dark = pal
    g = defs("arrow", pal, vertical=False)
    body = f"""
  <path d="M12 74 H228 V26 L348 116 L228 206 V158 H12 Z"
        fill="url(#arrow)" stroke="{dark}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M20 84 H222" stroke="#ffffff" stroke-width="8" opacity="0.35" stroke-linecap="round"/>"""
    return svg(360, 232, body, g), 360


def token(kind):
    """Round feedback token — check or cross, drawn not lettered."""
    pal = PALETTES["green"] if kind == "check" else PALETTES["rose"]
    light, mid, dark = pal
    g = defs("tok", pal)
    mark = (
        '<path d="M64 122 L104 162 L182 76" fill="none" stroke="#ffffff" '
        'stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>'
        if kind == "check"
        else '<path d="M78 78 L166 166 M166 78 L78 166" fill="none" stroke="#ffffff" '
        'stroke-width="20" stroke-linecap="round"/>'
    )
    body = f"""
  <circle cx="122" cy="122" r="110" fill="url(#tok)" stroke="{dark}" stroke-width="4"/>
  <path d="M122 12 A110 110 0 0 1 232 122 A110 110 0 0 0 122 12 Z" fill="#ffffff" opacity="0.2"/>
  <circle cx="122" cy="122" r="90" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.45"/>
  {mark}"""
    return svg(244, 244, body, g), 244


def number_token():
    """Blank round token. The board layer draws the number on top, so the art
    stays language- and digit-free (same rule as the generated pack)."""
    pal = PALETTES["cream"]
    light, mid, dark = pal
    g = defs("blank", pal)
    body = f"""
  <circle cx="118" cy="118" r="106" fill="url(#blank)" stroke="{dark}" stroke-width="4"/>
  <circle cx="118" cy="118" r="86" fill="none" stroke="{dark}" stroke-width="3" opacity="0.4"/>
  <path d="M118 12 A106 106 0 0 1 224 118 A106 106 0 0 0 118 12 Z" fill="#ffffff" opacity="0.35"/>"""
    return svg(236, 236, body, g), 236


def word_tile():
    """Small blank chip for a single word — the draggable unit in match/order."""
    pal = PALETTES["paper"]
    light, mid, dark = pal
    g = defs("chip", pal)
    body = f"""
  <rect x="8" y="8" width="344" height="112" rx="24" fill="url(#chip)"
        stroke="{PALETTES['grey'][2]}" stroke-width="3"/>
  <rect x="8" y="8" width="344" height="44" rx="22" fill="#ffffff" opacity="0.6"/>"""
    return svg(360, 128, body, g), 360


def portrait_card():
    """Tall blank card — the generated flashcard is landscape only."""
    pal = PALETTES["cream"]
    light, mid, dark = pal
    g = defs("card", pal)
    body = f"""
  <rect x="10" y="10" width="252" height="348" rx="22" fill="url(#card)"
        stroke="{dark}" stroke-width="3"/>
  <rect x="34" y="34" width="204" height="204" rx="14" fill="#ffffff" opacity="0.75"
        stroke="{dark}" stroke-width="2.5" stroke-opacity="0.5"/>
  <path d="M46 286 H226 M46 320 H180" stroke="{dark}" stroke-width="4"
        opacity="0.3" stroke-linecap="round"/>"""
    return svg(272, 368, body, g), 272


PROPS = {
    "sorting-bin-green": (lambda: sort_bin("green"), "sortBin", ["bin", "sort", "tray", "activity"]),
    "sorting-bin-amber": (lambda: sort_bin("amber"), "sortBin", ["bin", "sort", "tray", "activity"]),
    "dock-rail": (dock_rail, "dockRail", ["dock", "rail", "shelf", "row"]),
    "answer-strip": (answer_strip, "answerStrip", ["answer", "strip", "write", "blank"]),
    "slot-pad-wide": (lambda: slot_pad(520, 180), "orderSlot", ["slot", "order", "sentence", "ghost"]),
    "cover-tile": (cover_tile, "cover", ["cover", "hide", "reveal", "tile"]),
    "prize-flap": (prize_flap, "rewardFlap", ["reward", "flap", "prize", "reveal"]),
    "thought-bubble": (thought_bubble, "thought", ["think", "bubble", "speaking"]),
    "speech-bubble-square": (speech_bubble_square, "speech", ["speech", "bubble", "dialogue"]),
    "arrow-right": (arrow_right, "arrow", ["arrow", "order", "sequence", "next"]),
    "check-token": (lambda: token("check"), "correct", ["check", "correct", "feedback"]),
    "cross-token": (lambda: token("cross"), "incorrect", ["cross", "wrong", "feedback"]),
    "number-token": (number_token, "orderToken", ["token", "order", "number", "blank"]),
    "word-tile": (word_tile, "wordChip", ["chip", "word", "tile", "drag"]),
    "portrait-card": (portrait_card, "wordCard", ["card", "portrait", "vocab", "flashcard"]),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-o", "--out", required=True, help="PNG output directory")
    ap.add_argument("--svg-dir", default=None, help="also write the SVG sources here")
    ap.add_argument("--only", nargs="*", default=None, help="subset of prop slugs")
    ap.add_argument("--scale", type=float, default=2.0, help="render scale over the authored size")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    if args.svg_dir:
        os.makedirs(args.svg_dir, exist_ok=True)

    for slug, (fn, role, tags) in PROPS.items():
        if args.only and slug not in args.only:
            continue
        markup, longest = fn()
        if args.svg_dir:
            with open(os.path.join(args.svg_dir, f"{slug}.svg"), "w") as fh:
                fh.write(markup)
        dest = os.path.join(args.out, f"{slug}.png")
        cairosvg.svg2png(
            bytestring=markup.encode(),
            write_to=dest,
            output_width=int(longest * args.scale),
        )
        print(f"  {slug:24s} role={role:12s} -> {dest}")


if __name__ == "__main__":
    main()
