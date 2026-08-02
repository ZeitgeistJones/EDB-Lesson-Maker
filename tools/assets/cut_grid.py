#!/usr/bin/env python3
"""cut_grid.py — turn a black-background prop sheet into board-ready cutouts.

The asset bank's props are generated as 2x3 grids on pure black (see
docs/asset-prompts/). This tool does the other half of that workflow:

    sheet.png (3840x1180)
      -> slice into 6 panels of 1280x590
      -> key the black matte out to real transparency
      -> de-fringe the dark halo left on the edge
      -> trim to the object, re-pad to a consistent margin
      -> downscale to a board-friendly size
      -> QC report

Keying is a flood fill from the panel border, not a global "black is
transparent" threshold. That matters: a prop with black linework or a dark
shadow inside it keeps those pixels, because they are not reachable from the
edge. A global threshold punches holes straight through the artwork.

Usage
-----
    # a 2x3 sheet, named left->right, top->bottom
    python3 tools/assets/cut_grid.py sheet.png -o public/assets/09_props/img \\
        --names bookshelf sorting-bin flashcard-blank sticky-note reward-star slot-pad

    # already-sliced single panels (re-key the existing pack in place)
    python3 tools/assets/cut_grid.py public/assets/09_props/img/*.png --rows 1 --cols 1 --in-place

    # inspect without writing anything
    python3 tools/assets/cut_grid.py sheet.png --dry-run

Requires: pillow, numpy  (pip install pillow numpy)
"""

import argparse
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

# A pixel counts as matte when every channel sits under this. Generation models
# do not emit a perfectly uniform #000 — there is sensor-ish noise and a soft
# vignette around the object — so the floor is above zero.
MATTE_MAX = 30
# Edge pixels between MATTE_MAX and this get partial alpha instead of a hard
# 0/1 cut, which is what keeps the outline from looking stair-stepped.
EDGE_REF = 150


def flood_matte(rgb):
    """Boolean mask of background pixels, grown inward from the panel border.

    Scanline flood fill over the 'dark enough to be matte' predicate. Interior
    dark pixels (linework, drop shadows, a black object face) are unreachable
    from the border and stay foreground.
    """
    h, w = rgb.shape[:2]
    dark = rgb.max(axis=2) <= MATTE_MAX
    bg = np.zeros((h, w), dtype=bool)

    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if dark[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return bg


def dilate(mask, iterations=1):
    out = mask.copy()
    for _ in range(iterations):
        p = np.pad(out, 1, constant_values=False)
        out = (
            p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
        )
    return out


def key_black(im):
    """RGB(A) panel on black -> RGBA cutout with a soft, decontaminated edge."""
    rgb = np.asarray(im.convert("RGB"), dtype=np.float32)
    bg = flood_matte(rgb.astype(np.uint8))

    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)

    # Transition band: foreground pixels touching the matte are a blend of the
    # object and the black behind it. Their brightness is the blend ratio, so
    # brightness doubles as an alpha estimate right at the boundary.
    band = dilate(bg, 2) & ~bg
    lum = rgb.max(axis=2)
    soft = np.clip(lum / EDGE_REF, 0.0, 1.0)
    alpha = np.where(band, np.minimum(alpha, soft), alpha)

    # Colour decontamination. A half-covered edge pixel carries half the
    # object's colour and half black; dividing it back out removes the grey
    # halo that otherwise reads as a dark outline on a light board.
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip(rgb / safe, 0, 255)

    out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim_and_pad(im, margin=0.04):
    """Crop to the visible object, then re-add an even margin around it."""
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 8)
    if not len(xs):
        return im
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if margin <= 0:
        return im
    pad_x = int(round(im.width * margin))
    pad_y = int(round(im.height * margin))
    out = Image.new("RGBA", (im.width + 2 * pad_x, im.height + 2 * pad_y), (0, 0, 0, 0))
    out.paste(im, (pad_x, pad_y))
    return out


def fit(im, longest):
    if longest <= 0 or max(im.size) <= longest:
        return im
    scale = longest / max(im.size)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    return im.resize(size, Image.LANCZOS)


def slice_grid(im, rows, cols):
    if im.width % cols or im.height % rows:
        print(
            f"  ! {im.width}x{im.height} does not divide evenly into {cols}x{rows}; "
            "panels will be rounded",
            file=sys.stderr,
        )
    pw, ph = im.width / cols, im.height / rows
    for r in range(rows):
        for c in range(cols):
            yield im.crop(
                (round(c * pw), round(r * ph), round((c + 1) * pw), round((r + 1) * ph))
            )


def qc(im):
    """Numbers worth failing a prop over, reported per file."""
    a = np.asarray(im).astype(np.int32)
    al = a[..., 3]
    vis = al > 8
    opaque = al > 200
    edge_px = a[..., :3][opaque]
    return {
        "size": list(im.size),
        "coverage": round(float(vis.mean()), 3),
        "soft_edge_px": int(((al > 8) & (al <= 200)).sum()),
        "mean_luma": round(float(edge_px.mean()) if edge_px.size else 0.0, 1),
        "fully_opaque": bool(vis.all()),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sheets", nargs="+", help="grid sheet(s) or single panels")
    ap.add_argument("-o", "--out", default=None, help="output directory")
    ap.add_argument("--in-place", action="store_true", help="overwrite each input file")
    ap.add_argument("--rows", type=int, default=2)
    ap.add_argument("--cols", type=int, default=3)
    ap.add_argument("--names", nargs="*", default=None, help="output slugs, panel order")
    ap.add_argument("--longest", type=int, default=640, help="longest output edge (0 = keep)")
    ap.add_argument("--margin", type=float, default=0.04, help="padding as a fraction of the object")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.in_place and not args.out and not args.dry_run:
        ap.error("need -o/--out, --in-place, or --dry-run")
    if args.out and not args.dry_run:
        os.makedirs(args.out, exist_ok=True)

    report = {}
    index = 0
    for sheet in args.sheets:
        src = Image.open(sheet)
        print(f"{sheet} {src.size}")
        for panel in slice_grid(src, args.rows, args.cols):
            if args.names and index < len(args.names):
                slug = args.names[index]
            elif args.rows * args.cols == 1:
                slug = os.path.splitext(os.path.basename(sheet))[0]
            else:
                slug = f"{os.path.splitext(os.path.basename(sheet))[0]}-{index + 1}"

            out_im = fit(trim_and_pad(key_black(panel), args.margin), args.longest)
            stats = qc(out_im)
            report[slug] = stats
            flags = []
            if stats["fully_opaque"]:
                flags.append("NO-CUTOUT (matte still baked in)")
            if stats["coverage"] > 0.9:
                flags.append("object fills the frame")
            if stats["soft_edge_px"] == 0:
                flags.append("hard edge, no antialiasing")
            print(
                f"  {slug:24s} {stats['size'][0]}x{stats['size'][1]} "
                f"coverage={stats['coverage']:.2f} soft={stats['soft_edge_px']}"
                + ("  <- " + "; ".join(flags) if flags else "")
            )

            if not args.dry_run:
                dest = sheet if args.in_place else os.path.join(args.out, f"{slug}.png")
                out_im.save(dest, optimize=True)
            index += 1

    if args.dry_run:
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
