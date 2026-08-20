"""Rebuild a Wave 2 mop sheet by turning border-connected white cells black.

This preserves the replacement artwork and removes the repeated Manus failure
mode where the contact-sheet field is drawn as white worksheet cells.
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path
from PIL import Image


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 8:
        return True
    return r >= 238 and g >= 238 and b >= 238


def flood_cell(pixels, width: int, height: int, box: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = box
    seen: set[tuple[int, int]] = set()
    q: deque[tuple[int, int]] = deque()
    margin = min(36, max(4, (right - left) // 8), max(4, (bottom - top) // 8))
    seed_left = max(left, 0)
    seed_right = min(right - 1, width - 1)
    seed_top = max(top, 0)
    seed_bottom = min(bottom - 1, height - 1)

    # Manus often draws a thick black gutter around a white card/backplate. Scan
    # the inner margin band so the flood starts on the actual white backplate.
    for y in range(seed_top, seed_bottom + 1):
        for x in range(seed_left, seed_right + 1):
            near_edge = (
                x - seed_left < margin
                or seed_right - x < margin
                or y - seed_top < margin
                or seed_bottom - y < margin
            )
            if near_edge and is_background(pixels[x, y]):
                q.append((x, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or (x, y) in seen:
            continue
        seen.add((x, y))
        if not is_background(pixels[x, y]):
            continue
        pixels[x, y] = (0, 0, 0, 255)
        if x > left:
            q.append((x - 1, y))
        if x < right - 1:
            q.append((x + 1, y))
        if y > top:
            q.append((x, y - 1))
        if y < bottom - 1:
            q.append((x, y + 1))


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: rebuild-b1-wave2-blackfield.py <input.png> <output.png>", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dest = Path(sys.argv[2])
    img = Image.open(src).convert("RGBA")
    width, height = img.size
    pixels = img.load()

    rows = cols = 4
    for row in range(rows):
        for col in range(cols):
            left = round(col * width / cols)
            right = round((col + 1) * width / cols)
            top = round(row * height / rows)
            bottom = round((row + 1) * height / rows)
            flood_cell(pixels, width, height, (left, top, right, bottom))

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    print(dest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
