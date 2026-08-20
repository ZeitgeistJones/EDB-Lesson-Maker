"""
Sidecar visual asset QA audit for the ClassIn lesson bank.

Reads live manifests and current raw harvest folders, writes resumable audit rows
under audit/visual-assets without mutating production asset manifests.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import os
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageStat


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"
SHEETS = OUT / "sheets"
VERSION = "2026-08-17-v1"
SCHEMA_VERSION = "2026-08-18-upstream-repair-v2"
STAMP = datetime.now(timezone.utc).isoformat()

LIVE_VOCAB = ROOT / "public" / "assets" / "07_vocab-pack"
LIVE_PROPS = ROOT / "public" / "assets" / "09_props"
LIVE_BGS = ROOT / "public" / "assets" / "08_backgrounds"

RAW_FOLDERS = [
    ROOT / "tmp" / "manus-prea1-stockpile",
    ROOT / "tmp" / "manus-b2-stockpile",
    ROOT / "tmp" / "manus-edb-settings-stockpile",
    ROOT / "tmp" / "manus-hero-stockpile",
    ROOT / "tmp" / "manus-hero-targets-wave1",
]

REASON_CODES = {
    "missing",
    "corrupt",
    "zero_byte",
    "low_resolution",
    "too_small",
    "excess_dead_space",
    "edge_cutoff",
    "white_plate",
    "white_halo",
    "background_contamination",
    "wrong_background_mode",
    "bad_alpha",
    "weak_contrast",
    "exact_duplicate",
    "blank",
}


@dataclass
class Row:
    audit_version: str
    asset_id: str
    key: str
    concept: str
    path: str
    source_bank: str
    pack_category: str
    live_state: str
    expected_asset_type: str
    expected_background_mode: str
    expected_concept_word: str
    pair_group_identity: str = ""
    status: str = "pending_visual"
    reason_codes: list[str] = field(default_factory=list)
    confidence: str = ""
    notes: str = ""
    width: int | None = None
    height: int | None = None
    format: str = ""
    bytes: int | None = None
    sha256: str = ""
    mechanical_flags: list[str] = field(default_factory=list)
    reviewed_from: str = ""
    audit_schema_version: str = SCHEMA_VERSION
    failure_origin: str = "uncertain"
    remediation: str = "HUMAN_REVIEW"
    source_role: str = "production_asset"
    extraction_state: str = "not_applicable"
    timestamp: str = STAMP

    def as_dict(self) -> dict[str, Any]:
        return {
            "audit_version": self.audit_version,
            "asset_id": self.asset_id,
            "key": self.key,
            "concept": self.concept,
            "path": self.path,
            "source_bank": self.source_bank,
            "pack_category": self.pack_category,
            "live_vs_raw_harvest": self.live_state,
            "expected_asset_type": self.expected_asset_type,
            "expected_background_mode": self.expected_background_mode,
            "expected_concept_word": self.expected_concept_word,
            "pair_group_identity": self.pair_group_identity,
            "status": self.status,
            "reason_codes": self.reason_codes,
            "confidence": self.confidence,
            "notes": self.notes,
            "width": self.width,
            "height": self.height,
            "format": self.format,
            "bytes": self.bytes,
            "sha256": self.sha256,
            "mechanical_flags": self.mechanical_flags,
            "reviewed_from": self.reviewed_from,
            "audit_schema_version": self.audit_schema_version,
            "failure_origin": self.failure_origin,
            "remediation": self.remediation,
            "source_role": self.source_role,
            "extraction_state": self.extraction_state,
            "timestamp": self.timestamp,
        }


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def slug_text(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def prop_family(key: str, row: dict[str, Any]) -> tuple[str, str]:
    role = str(row.get("role") or "")
    pack = str(row.get("pack") or row.get("subject") or "")
    tags = " ".join(str(t) for t in row.get("tags") or [])
    hay = f"{key} {role} {pack} {tags}".lower()
    if key.startswith("hero-") or role == "hero" or "king" in hay:
        return "hero_king_interactive_target", pack or role or "hero"
    if key.startswith("cast-"):
        if any(action in key for action in ["-talk-", "-listen-", "-reach-", "-walk-", "-sit-", "-push-", "-jump-", "-hold-"]):
            return "story_action_plate", pack or "cast"
        return "story_cast", pack or "cast"
    if "open" in hay or "closed" in hay or "hide" in hay or "reveal" in hay or key.startswith("cover-"):
        return "open_closed_hide_reveal_pair", pack or role or "hide-reveal"
    if "plate" in hay or role in {"rolePlate", "role-plate"}:
        return "role_plate", pack or role or "role"
    if key.startswith("letter-") or "phonics" in hay or "alphabet" in hay:
        return "letters_literacy", pack or role or "letters"
    if "mia" in hay or "leo" in hay or "kid3" in hay:
        return "story_cast", pack or "cast"
    return "prop_cutout", pack or role or "uncategorized"


def add_flag(row: Row, code: str, note: str | None = None) -> None:
    if code not in row.mechanical_flags:
        row.mechanical_flags.append(code)
    if code in REASON_CODES and code not in row.reason_codes:
        row.reason_codes.append(code)
    if row.status == "pending_visual":
        row.status = "flagged_mechanical"
    if note and note not in row.notes:
        row.notes = f"{row.notes}; {note}".strip("; ")


def panel_rects_for_sheet(src: Image.Image, rows_count: int, cols: int, threshold: int = 24) -> list[tuple[int, int, int, int]]:
    """Infer real black-field sheet bounds/cuts instead of assuming equal pitch."""
    rgb = src.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    def on(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        return max(r, g, b) > threshold

    active: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if on(x, y):
                active.append((x, y))
    if not active:
        cell_w = w // cols
        cell_h = h // rows_count
        return [
            (c * cell_w, r * cell_h, min(w, (c + 1) * cell_w), min(h, (r + 1) * cell_h))
            for r in range(rows_count)
            for c in range(cols)
        ]

    min_x = min(x for x, _ in active)
    max_x = max(x for x, _ in active)
    min_y = min(y for _, y in active)
    max_y = max(y for _, y in active)
    pad = max(2, round(min(w / cols, h / rows_count) * 0.08))

    def line_count(axis: str, pos: int, start: int, end: int) -> int:
        if axis == "x":
            return sum(1 for yy in range(max(0, start), min(h, end)) if on(pos, yy))
        return sum(1 for xx in range(max(0, start), min(w, end)) if on(xx, pos))

    def seek_empty(axis: str, start: int, step: int, limit: int, lo: int, hi: int) -> int:
        p = start
        while p != limit:
            if line_count(axis, p, lo, hi) == 0:
                return p
            p += step
        return limit

    x0 = max(0, seek_empty("x", min_x, -1, -1, min_y - pad, max_y + pad + 1))
    x1 = min(w, seek_empty("x", max_x, 1, w, min_y - pad, max_y + pad + 1) + 1)
    y0 = max(0, seek_empty("y", min_y, -1, -1, min_x - pad, max_x + pad + 1))
    y1 = min(h, seek_empty("y", max_y, 1, h, min_x - pad, max_x + pad + 1) + 1)

    def snap(guess: int, span: float, lower: int, upper: int, count_fn) -> int:
        reach = min(round(span * 0.5), guess - lower, upper - guess)
        start = guess - reach
        counts = [count_fn(p) for p in range(start, guess + reach + 1)]
        best = None
        best_dist = 10**9
        run = -1
        for i in range(len(counts) + 1):
            if i < len(counts) and counts[i] == 0:
                if run < 0:
                    run = i
                continue
            if run >= 0:
                mid = start + round((run + i - 1) / 2)
                dist = abs(mid - guess)
                if dist < best_dist:
                    best = mid
                    best_dist = dist
                run = -1
        if best is not None:
            return best
        return min(
            range(start, guess + reach + 1),
            key=lambda p: (count_fn(p), abs(p - guess)),
        )

    bw = max(1, x1 - x0)
    bh = max(1, y1 - y0)
    row_cuts = [y0]
    for r in range(1, rows_count):
        row_cuts.append(snap(y0 + round(r * bh / rows_count), bh / rows_count, y0, y1, lambda yy: line_count("y", yy, x0, x1)))
    row_cuts.append(y1)
    rects: list[tuple[int, int, int, int]] = []
    for r in range(rows_count):
        cy0 = row_cuts[r]
        cy1 = row_cuts[r + 1]
        col_cuts = [x0]
        for c in range(1, cols):
            col_cuts.append(snap(x0 + round(c * bw / cols), bw / cols, x0, x1, lambda xx: line_count("x", xx, cy0, cy1)))
        col_cuts.append(x1)
        for c in range(cols):
            rects.append((col_cuts[c], cy0, col_cuts[c + 1], cy1))
    return rects


def measure(row: Row, expected_alpha: bool, min_short: int, min_area: int = 0) -> None:
    path = ROOT / row.path
    if not path.exists():
        row.status = "REDO"
        row.reason_codes = ["missing"]
        row.confidence = "high"
        row.notes = "Mechanical REDO: file is missing."
        return
    row.bytes = path.stat().st_size
    if row.bytes == 0:
        row.status = "REDO"
        row.reason_codes = ["zero_byte"]
        row.confidence = "high"
        row.notes = "Mechanical REDO: file is zero bytes."
        return
    row.sha256 = hashlib.sha256(path.read_bytes()).hexdigest()
    try:
        with Image.open(path) as im:
            row.format = im.format or ""
            w, h = im.size
            row.width = w
            row.height = h
            if min(w, h) < min_short or (min_area and w * h < min_area):
                add_flag(row, "low_resolution", f"{w}x{h}")
            rgba = im.convert("RGBA")
            alpha = rgba.getchannel("A")
            alpha_bbox = alpha.point(lambda p: 255 if p > 10 else 0).getbbox()
            if expected_alpha:
                if alpha.getextrema() == (255, 255):
                    add_flag(row, "bad_alpha", "opaque image where alpha cutout expected")
                if alpha_bbox:
                    x0, y0, x1, y1 = alpha_bbox
                    occ = ((x1 - x0) * (y1 - y0)) / max(1, w * h)
                    if occ < 0.06:
                        add_flag(row, "too_small", f"alpha bbox occupancy {occ:.3f}")
                    if x0 <= 1 or y0 <= 1 or x1 >= w - 1 or y1 >= h - 1:
                        add_flag(row, "edge_cutoff", "opaque pixels touch image edge")
                    x0, y0, x1, y1 = alpha_bbox
                    step = max(1, int(max(x1 - x0, y1 - y0) / 96))
                    opaque = 0
                    white = 0
                    px = rgba.load()
                    for yy in range(y0, y1, step):
                        for xx in range(x0, x1, step):
                            r, g, b, a = px[xx, yy]
                            if a < 200:
                                continue
                            opaque += 1
                            if r + g + b >= 720:
                                white += 1
                    if opaque:
                        ratio = white / opaque
                        if ratio >= 0.35:
                            add_flag(row, "white_plate", f"white opaque ratio {ratio:.2f}")
                else:
                    add_flag(row, "blank", "no visible alpha bbox")
            else:
                stat = ImageStat.Stat(rgba.convert("RGB").resize((64, 64)))
                if sum(stat.var) < 18:
                    add_flag(row, "blank", "very low color variance")
    except Exception as exc:
        row.status = "REDO"
        row.reason_codes = ["corrupt"]
        row.confidence = "high"
        row.notes = f"Mechanical REDO: PIL could not open image: {exc}"


def live_vocab_rows() -> list[Row]:
    index = load_json(LIVE_VOCAB / "index.json")
    rows: list[Row] = []
    for key, item in sorted(index.items()):
        file_name = item.get("file") if isinstance(item, dict) else None
        if not file_name:
            continue
        path = LIVE_VOCAB / "img" / file_name
        row = Row(
            VERSION,
            f"live:vocab:{key}",
            key,
            key.replace("-", " "),
            rel(path),
            "07_vocab-pack",
            str(item.get("source") or "generated"),
            "live",
            "vocab_icon",
            "icon_image",
            key.replace("-", " "),
        )
        measure(row, expected_alpha=False, min_short=96)
        rows.append(row)
    return rows


def live_prop_rows() -> list[Row]:
    manifest = load_json(LIVE_PROPS / "manifest.json")
    rows: list[Row] = []
    for key, item in sorted((manifest.get("props") or {}).items()):
        if not item.get("file"):
            continue
        family, pack = prop_family(key, item)
        path = LIVE_PROPS / "img" / item["file"]
        expected_mode = "alpha_cutout" if item.get("alpha") is True else "opaque_prop"
        row = Row(
            VERSION,
            f"live:prop:{key}",
            key,
            key.replace("-", " "),
            rel(path),
            "09_props",
            pack,
            "live",
            family,
            expected_mode,
            key.replace("-", " "),
            pair_group_identity=pair_identity_for_key(key),
        )
        measure(row, expected_alpha=item.get("alpha") is True, min_short=80)
        rows.append(row)
    return rows


def pair_identity_for_key(key: str) -> str:
    for token in ["-open", "-closed", "-hide", "-reveal", "-front", "-back"]:
        if token in key:
            return key.replace(token, "")
    return ""


def live_background_rows() -> list[Row]:
    manifest = load_json(LIVE_BGS / "manifest.json")
    rows: list[Row] = []
    for section, expected_type in [("scenes", "story_environment_edb_setting"), ("flats", "background")]:
        for key, item in sorted((manifest.get(section) or {}).items()):
            if not item.get("file"):
                continue
            path = LIVE_BGS / "img" / item["file"]
            row = Row(
                VERSION,
                f"live:bg:{section}:{key}",
                key,
                key.replace("-", " "),
                rel(path),
                "08_backgrounds",
                str(item.get("category") or section),
                "live",
                expected_type,
                "full_bleed_background",
                key.replace("-", " "),
            )
            measure(row, expected_alpha=False, min_short=400, min_area=400_000)
            rows.append(row)
    return rows


def prea1_item_rows() -> list[Row]:
    inv = load_json(ROOT / "docs" / "prea1-stockpile-inventory.json")
    rows: list[Row] = []
    for wave_key, wave in sorted((inv.get("waves") or {}).items()):
        sheet_dir = Path(str(wave.get("sheet_dir") or ""))
        by_sheet: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in wave.get("items") or []:
            by_sheet[str(item.get("sheet_file") or "")].append(item)
        cell_paths: dict[str, Path] = {}
        for sheet_file, items in by_sheet.items():
            if not sheet_file:
                continue
            sheet_path = sheet_dir / sheet_file
            if not sheet_path.is_absolute():
                sheet_path = ROOT / sheet_path
            if not sheet_path.exists():
                continue
            try:
                with Image.open(sheet_path) as sheet:
                    src = sheet.convert("RGB")
                    count = len(items)
                    cols = 3 if count <= 9 else 4 if count <= 16 else 5
                    rows_count = math.ceil(count / cols)
                    rects = panel_rects_for_sheet(src, rows_count, cols)
                    for idx, item in enumerate(items):
                        key = str(item.get("key") or slug_text(str(item.get("concept") or "")))
                        if idx >= len(rects):
                            continue
                        crop = src.crop(rects[idx])
                        out_cell = OUT / "cells" / "prea1" / wave_key / f"{key}.jpg"
                        out_cell.parent.mkdir(parents=True, exist_ok=True)
                        crop.save(out_cell, quality=92)
                        cell_paths[key] = out_cell
            except Exception:
                continue
        for item in wave.get("items") or []:
            concept = str(item.get("concept") or item.get("key") or "")
            key = str(item.get("key") or slug_text(concept))
            sheet_file = str(item.get("sheet_file") or "")
            source_path = sheet_dir / sheet_file if sheet_file else ROOT / "tmp" / "manus-prea1-stockpile" / wave_key / "sheets" / "missing.png"
            if not source_path.is_absolute():
                source_path = ROOT / source_path
            path = cell_paths.get(key, source_path)
            row = Row(
                VERSION,
                f"raw:prea1:{key}",
                key,
                concept,
                rel(path),
                "tmp/manus-prea1-stockpile",
                str(item.get("family") or wave.get("family") or wave_key),
                "raw_harvest",
                "prea1_functional",
                "cropped_contact_cell" if key in cell_paths else "contact_sheet_cell",
                concept,
                pair_group_identity=str(item.get("sheet_id") or ""),
                notes=f"source_sheet={rel(source_path)}" if key in cell_paths else "",
            )
            measure(row, expected_alpha=False, min_short=120)
            rows.append(row)
    return rows


def raw_sheet_rows() -> list[Row]:
    rows: list[Row] = []
    for folder in RAW_FOLDERS:
        if not folder.exists():
            continue
        for path in sorted(folder.rglob("*")):
            if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                continue
            rel_path = rel(path)
            # Pre-A1 concepts are represented per item above; keep only raw sheet files
            # here to avoid double counting zip-extract duplicates as separate concepts.
            if "zip-extract" in rel_path.replace("\\", "/"):
                continue
            if folder.name == "manus-prea1-stockpile" and "/sheets/raw/" not in rel_path:
                continue
            stem = path.stem
            wave = path.parent.parent.name if path.parent.name in {"sheets", "raw"} else path.parent.name
            expected_type = "raw_harvest_sheet"
            if "hero" in folder.name:
                expected_type = "hero_king_interactive_target"
            elif "edb" in folder.name:
                expected_type = "story_environment_edb_setting"
            elif "b2" in folder.name:
                expected_type = "vocab_icon"
            elif "prea1" in folder.name:
                expected_type = "prea1_functional_sheet"
            row = Row(
                VERSION,
                f"raw:sheet:{folder.name}:{slug_text(rel_path)}",
                stem,
                stem.replace("-", " "),
                rel_path,
                f"tmp/{folder.name}",
                wave,
                "raw_harvest",
                expected_type,
                "raw_sheet",
                stem.replace("-", " "),
            )
            measure(row, expected_alpha=False, min_short=400, min_area=400_000)
            rows.append(row)
    return rows


def mark_exact_dupes(rows: list[Row]) -> None:
    by_hash: dict[str, list[Row]] = defaultdict(list)
    for row in rows:
        if row.sha256:
            by_hash[row.sha256].append(row)
    for dupes in by_hash.values():
        if len(dupes) <= 1:
            continue
        for row in dupes[1:]:
            add_flag(row, "exact_duplicate", f"duplicate of {dupes[0].asset_id}")


PIPELINE_REASON_CODES = {
    "bad_crop",
    "edge_cutoff",
    "white_plate",
    "white_halo",
    "background_contamination",
    "wrong_background_mode",
    "bad_alpha",
    "missing",
    "corrupt",
    "zero_byte",
    "blank",
}

SOURCE_ART_REASON_CODES = {
    "wrong_concept",
    "wrong_sense",
    "ambiguous_concept",
    "action_mismatch",
    "emotion_mismatch",
    "identity_drift",
    "role_mismatch",
    "generation_artifact",
    "bad_anatomy",
    "text_artifact",
    "logo_artifact",
    "pair_mismatch",
    "bad_open_state",
    "poor_cavity",
    "poor_stage_space",
    "too_busy",
    "bad_perspective",
    "story_specific",
    "wrong_letter",
    "wrong_letter_state",
    "malformed_glyph",
    "unclear_instruction",
    "weak_contrast",
}


def classify_semantics(row: Row) -> None:
    """Separate current derivative status from true source-art quality."""
    if row.expected_background_mode == "raw_sheet":
        row.source_role = "source_sheet"
        row.extraction_state = "source_only"
        row.failure_origin = "pipeline"
        row.remediation = "PIPELINE_REBUILD"
        return
    if row.expected_background_mode in {"cropped_contact_cell", "contact_sheet_cell"}:
        row.source_role = "extracted_derivative"
        row.extraction_state = "extracted" if row.expected_background_mode == "cropped_contact_cell" else "pending_extraction"
    else:
        row.source_role = "production_asset"
        row.extraction_state = "not_applicable"
    if row.status not in {"REDO", "REVIEW"}:
        row.failure_origin = "uncertain"
        row.remediation = "HUMAN_REVIEW"
        return
    reasons = set(row.reason_codes or []) | set(row.mechanical_flags or [])
    if reasons & SOURCE_ART_REASON_CODES:
        row.failure_origin = "source_art"
        row.remediation = "ART_REDO"
    elif reasons & PIPELINE_REASON_CODES:
        row.failure_origin = "pipeline"
        row.remediation = "PIPELINE_REBUILD"
    else:
        row.failure_origin = "uncertain"
        row.remediation = "HUMAN_REVIEW"


def font(size: int) -> ImageFont.ImageFont:
    for name in ["arial.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


def draw_sheet(rows: list[Row], out_path: Path, title: str, cell: int = 220, cols: int = 5) -> None:
    if not rows:
        return
    label_h = 58
    title_h = 44
    rows_count = math.ceil(len(rows) / cols)
    canvas = Image.new("RGB", (cols * cell, title_h + rows_count * (cell + label_h)), "#111827")
    draw = ImageDraw.Draw(canvas)
    f_title = font(20)
    f_label = font(13)
    draw.text((12, 10), title[:140], fill="#f9fafb", font=f_title)
    for idx, row in enumerate(rows):
        x = (idx % cols) * cell
        y = title_h + (idx // cols) * (cell + label_h)
        draw.rectangle((x, y, x + cell - 1, y + cell + label_h - 1), fill="#1f2937", outline="#4b5563")
        img_path = ROOT / row.path
        try:
            with Image.open(img_path) as im:
                im = im.convert("RGBA")
                bg = Image.new("RGBA", im.size, "#f8fafc")
                bg.alpha_composite(im)
                im = bg.convert("RGB")
                im.thumbnail((cell - 18, cell - 18), Image.Resampling.LANCZOS)
                ix = x + (cell - im.width) // 2
                iy = y + (cell - im.height) // 2
                canvas.paste(im, (ix, iy))
        except Exception:
            draw.rectangle((x + 10, y + 10, x + cell - 10, y + cell - 10), fill="#7f1d1d")
            draw.text((x + 18, y + 20), "UNREADABLE", fill="#fff", font=f_label)
        label = f"{idx + 1}. {row.key}"
        sub = f"{row.expected_asset_type} | {','.join(row.mechanical_flags[:3]) or 'no mech flag'}"
        draw.rectangle((x, y + cell, x + cell, y + cell + label_h), fill="#0f172a")
        draw.text((x + 6, y + cell + 6), label[:34], fill="#f8fafc", font=f_label)
        draw.text((x + 6, y + cell + 28), sub[:38], fill="#cbd5e1", font=f_label)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, quality=90)


def build_review_sheets(rows: list[Row]) -> list[str]:
    sheet_paths: list[str] = []
    eligible = [r for r in rows if r.status in {"pending_visual", "flagged_mechanical"}]
    grouped: dict[str, list[Row]] = defaultdict(list)
    for row in eligible:
        source = row.source_bank.replace("/", "_")
        family = slug_text(f"{source}-{row.expected_asset_type}-{row.pack_category}")[:80]
        grouped[family].append(row)

    manifest = []
    for family, items in sorted(grouped.items()):
        batch_size = 24 if "prea1" in family or "action" in family or "hero" in family else 30
        for batch_idx in range(0, len(items), batch_size):
            batch = items[batch_idx : batch_idx + batch_size]
            out_path = SHEETS / "pending_visual" / f"{family}-{batch_idx // batch_size + 1:03d}.jpg"
            draw_sheet(batch, out_path, f"{family} ({batch_idx + 1}-{batch_idx + len(batch)} of {len(items)})")
            sheet_paths.append(rel(out_path))
            for row in batch:
                row.reviewed_from = rel(out_path)
            manifest.append({
                "sheet": rel(out_path),
                "family": family,
                "asset_ids": [r.asset_id for r in batch],
                "keys": [r.key for r in batch],
            })

    (OUT / "sheet-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return sheet_paths


def write_outputs(rows: list[Row], sheet_paths: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for sub in ["redo", "review", "pass-samples", "pending_visual"]:
        (SHEETS / sub).mkdir(parents=True, exist_ok=True)

    dicts = [r.as_dict() for r in rows]
    (OUT / "index.jsonl").write_text(
        "\n".join(json.dumps(d, ensure_ascii=False, sort_keys=True) for d in dicts) + "\n",
        encoding="utf-8",
    )
    fields = list(dicts[0].keys()) if dicts else []
    with (OUT / "index.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for d in dicts:
            writer.writerow({
                k: json.dumps(v, ensure_ascii=False) if isinstance(v, list) else v
                for k, v in d.items()
            })

    status = Counter(r.status for r in rows)
    live_status = Counter(r.status for r in rows if r.live_state == "live")
    raw_status = Counter(r.status for r in rows if r.live_state == "raw_harvest")
    by_family = Counter(r.expected_asset_type for r in rows)
    flags = Counter(flag for r in rows for flag in r.mechanical_flags)
    lines = [
        "# Visual Asset QA Audit",
        "",
        f"Audit version: `{VERSION}`",
        f"Generated: `{STAMP}`",
        "",
        "This is a sidecar audit. It does not mutate production manifests.",
        "",
        "## Scope",
        "",
        f"- Total indexed assets: {len(rows)}",
        f"- Live indexed assets: {sum(1 for r in rows if r.live_state == 'live')}",
        f"- Raw-harvest indexed assets: {sum(1 for r in rows if r.live_state == 'raw_harvest')}",
        f"- Review contact sheets: {len(sheet_paths)}",
        "",
        "## Status Counts",
        "",
        *[f"- {k}: {v}" for k, v in sorted(status.items())],
        "",
        "## Live Status Counts",
        "",
        *[f"- {k}: {v}" for k, v in sorted(live_status.items())],
        "",
        "## Raw-Harvest Status Counts",
        "",
        *[f"- {k}: {v}" for k, v in sorted(raw_status.items())],
        "",
        "## Families Indexed",
        "",
        *[f"- {k}: {v}" for k, v in sorted(by_family.items())],
        "",
        "## Mechanical Flags",
        "",
        *[f"- {k}: {v}" for k, v in flags.most_common(25)],
        "",
        "## Durable Outputs",
        "",
        "- `audit/visual-assets/index.jsonl`",
        "- `audit/visual-assets/index.csv`",
        "- `audit/visual-assets/sheet-manifest.json`",
        "- `audit/visual-assets/sheets/pending_visual/`",
        "- `audit/visual-assets/sheets/redo/`",
        "- `audit/visual-assets/sheets/review/`",
        "- `audit/visual-assets/sheets/pass-samples/`",
        "",
        "## Visual Review State",
        "",
        "Rows with `PASS`, `REVIEW`, or `REDO` require visual inspection of the referenced sheet or image. Mechanical failures only set `REDO` when the file is missing, corrupt, or zero-byte.",
        "",
    ]
    (OUT / "summary.md").write_text("\n".join(lines), encoding="utf-8")


def write_checkpoint(rows: list[Row], label: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    checkpoint = OUT / "index.checkpoint.jsonl"
    checkpoint.write_text(
        "\n".join(json.dumps(r.as_dict(), ensure_ascii=False, sort_keys=True) for r in rows) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "checkpoint": label,
        "rows": len(rows),
        "path": rel(checkpoint),
    }), flush=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows: list[Row] = []
    rows.extend(live_vocab_rows())
    write_checkpoint(rows, "live_vocab")
    rows.extend(live_prop_rows())
    write_checkpoint(rows, "live_props")
    rows.extend(live_background_rows())
    write_checkpoint(rows, "live_backgrounds")
    rows.extend(prea1_item_rows())
    write_checkpoint(rows, "prea1_items")
    rows.extend(raw_sheet_rows())
    write_checkpoint(rows, "raw_sheets")
    mark_exact_dupes(rows)
    for row in rows:
        classify_semantics(row)
    if os.environ.get("VISUAL_AUDIT_SKIP_STATUS_SHEETS") == "1":
        print("Skipping broad pending sheet regeneration (VISUAL_AUDIT_SKIP_STATUS_SHEETS=1)")
        sheets = []
    else:
        sheets = build_review_sheets(rows)
    write_outputs(rows, sheets)
    print(json.dumps({
        "version": VERSION,
        "total": len(rows),
        "status": Counter(r.status for r in rows),
        "sheets": len(sheets),
        "out": rel(OUT),
    }, indent=2))


if __name__ == "__main__":
    main()
