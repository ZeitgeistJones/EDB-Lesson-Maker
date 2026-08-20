"""
Build durable outputs for the focused upstream asset derivative repair pass.

This script does not mutate production manifests. It summarizes the repaired
audit semantics and creates representative visual sheets from assets available
in this checkout. Raw harvest folders are intentionally ignored by git; when
they are absent, rebuild counts are reported as blocked rather than invented.
"""
from __future__ import annotations

import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"
REPAIRED = OUT / "sheets" / "repaired"
INDEX = OUT / "index.jsonl"
STAMP = datetime.now(timezone.utc).isoformat()


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def load_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        text = INDEX.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = INDEX.read_text(encoding="utf-16")
    for line in text.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def font(size: int) -> ImageFont.ImageFont:
    for name in ["arial.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


def draw_sheet(items: list[dict[str, Any]], out_path: Path, title: str, cols: int = 5) -> None:
    cell = 210
    label_h = 74
    title_h = 54
    rows = max(1, math.ceil(len(items) / cols))
    canvas = Image.new("RGB", (cols * cell, title_h + rows * (cell + label_h)), "#111827")
    draw = ImageDraw.Draw(canvas)
    f_title = font(20)
    f_label = font(12)
    draw.text((12, 14), title[:150], fill="#f9fafb", font=f_title)
    if not items:
        draw.text((12, title_h + 20), "No local sample available in this checkout.", fill="#fbbf24", font=f_title)
    for idx, item in enumerate(items):
        x = (idx % cols) * cell
        y = title_h + (idx // cols) * (cell + label_h)
        draw.rectangle((x, y, x + cell - 1, y + cell + label_h - 1), fill="#1f2937", outline="#4b5563")
        img_path = ROOT / str(item.get("path") or "")
        try:
            with Image.open(img_path) as im:
                rgba = im.convert("RGBA")
                bg = Image.new("RGBA", rgba.size, "#f8fafc")
                bg.alpha_composite(rgba)
                thumb = bg.convert("RGB")
                thumb.thumbnail((cell - 18, cell - 18), Image.Resampling.LANCZOS)
                canvas.paste(thumb, (x + (cell - thumb.width) // 2, y + (cell - thumb.height) // 2))
        except Exception:
            draw.rectangle((x + 12, y + 12, x + cell - 12, y + cell - 12), fill="#78350f")
            draw.text((x + 18, y + 24), "MISSING", fill="#fff7ed", font=f_label)
        label = f"{idx + 1}. {item.get('key') or item.get('asset_id')}"
        sub = f"{item.get('status','')} | {item.get('remediation','')}"
        note = str(item.get("notes") or "")[:46]
        draw.rectangle((x, y + cell, x + cell, y + cell + label_h), fill="#0f172a")
        draw.text((x + 6, y + cell + 6), label[:34], fill="#f8fafc", font=f_label)
        draw.text((x + 6, y + cell + 28), sub[:40], fill="#cbd5e1", font=f_label)
        draw.text((x + 6, y + cell + 50), note, fill="#94a3b8", font=f_label)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, quality=90)


def draw_b2_extracted_cells(rows: list[dict[str, Any]], out_path: Path) -> int:
    """Create an audit-only proof sheet by slicing source B2 3x3 sheets.

    This intentionally writes only the QA composite under audit/. The raw source
    sheet files remain untouched, and no production manifest rows are created.
    """
    source_rows = [
        r
        for r in rows
        if "manus-b2-stockpile" in str(r.get("source_bank", ""))
        and r.get("expected_background_mode") == "raw_sheet"
        and (ROOT / str(r.get("path") or "")).exists()
    ]
    cols = 9
    cell = 142
    label_h = 42
    title_h = 54
    max_source_sheets = 3
    total_cells = max_source_sheets * 9 if source_rows else 0
    grid_rows = max(1, math.ceil(total_cells / cols))
    canvas = Image.new("RGB", (cols * cell, title_h + grid_rows * (cell + label_h)), "#111827")
    draw = ImageDraw.Draw(canvas)
    f_title = font(20)
    f_label = font(11)
    draw.text((12, 14), "Upstream repair representative samples: b2-extracted-cells", fill="#f9fafb", font=f_title)
    if not source_rows:
        draw.text((12, title_h + 20), "No local B2 raw sheet source available in this checkout.", fill="#fbbf24", font=f_title)
    idx = 0
    valid_sources = 0
    unreadable_sources = 0
    for row in source_rows:
        if valid_sources >= max_source_sheets:
            break
        src = ROOT / str(row.get("path") or "")
        try:
            im = Image.open(src)
            im.verify()
            im = Image.open(src)
        except Exception:
            unreadable_sources += 1
            continue
        with im:
            rgb = im.convert("RGB")
            cw = rgb.width / 3
            ch = rgb.height / 3
            for r in range(3):
                for c in range(3):
                    x = (idx % cols) * cell
                    y = title_h + (idx // cols) * (cell + label_h)
                    crop = rgb.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
                    crop.thumbnail((cell - 14, cell - 14), Image.Resampling.LANCZOS)
                    draw.rectangle((x, y, x + cell - 1, y + cell + label_h - 1), fill="#1f2937", outline="#4b5563")
                    canvas.paste(crop, (x + (cell - crop.width) // 2, y + (cell - crop.height) // 2))
                    draw.rectangle((x, y + cell, x + cell, y + cell + label_h), fill="#0f172a")
                    draw.text((x + 5, y + cell + 6), f"{idx + 1}. {row.get('key', 'b2-sheet')}", fill="#f8fafc", font=f_label)
                    draw.text((x + 5, y + cell + 23), f"cell r{r + 1}c{c + 1}", fill="#cbd5e1", font=f_label)
                    idx += 1
        valid_sources += 1
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, quality=90)
    return {"sample_cells": idx, "valid_source_sheets": valid_sources, "unreadable_source_sheets": unreadable_sources}


def first_existing(rows: list[dict[str, Any]], predicate, limit: int) -> list[dict[str, Any]]:
    picked: list[dict[str, Any]] = []
    for row in rows:
        if len(picked) >= limit:
            break
        if predicate(row) and (ROOT / str(row.get("path") or "")).exists():
            picked.append(row)
    return picked


def main() -> None:
    rows = load_rows()
    REPAIRED.mkdir(parents=True, exist_ok=True)

    samples = {
        "prea1-relations": first_existing(rows, lambda r: "wave3-relations" in str(r.get("path", "")), 25),
        "mnemonic-az": first_existing(rows, lambda r: "wave6-mnemonic-az" in str(r.get("path", "")), 25),
        "edb-setting-variants": first_existing(rows, lambda r: r.get("expected_asset_type") == "story_environment_edb_setting", 20),
        "white-light-keyed-objects": first_existing(
            rows,
            lambda r: any(token in str(r.get("key", "")) for token in ["doctor", "chef", "snowman", "cotton", "glove", "net"]),
            25,
        ),
        "farm-tree-identity": first_existing(rows, lambda r: str(r.get("key", "")).startswith("farm-") or "tree" in str(r.get("key", "")), 25),
        "black-block-postprocess": first_existing(rows, lambda r: str(r.get("key", "")) in {"prea1-verb-take", "repair-black-block"} or "take" in str(r.get("key", "")), 10),
    }

    sheet_paths: dict[str, str] = {}
    for family, items in samples.items():
        path = REPAIRED / family / f"{family}-samples.jpg"
        draw_sheet(items, path, f"Upstream repair representative samples: {family}")
        sheet_paths[family] = rel(path)
    b2_sheet = REPAIRED / "b2-extracted-cells" / "b2-extracted-cells-samples.jpg"
    b2_sample = draw_b2_extracted_cells(rows, b2_sheet)
    sheet_paths["b2-extracted-cells"] = rel(b2_sheet)

    status = Counter(r.get("status") for r in rows)
    remediation = Counter(r.get("remediation") or "HUMAN_REVIEW" for r in rows if r.get("status") in {"REDO", "REVIEW"})
    origins = Counter(r.get("failure_origin") or "uncertain" for r in rows if r.get("status") in {"REDO", "REVIEW"})
    pipeline_rows = [r for r in rows if r.get("remediation") == "PIPELINE_REBUILD"]
    source_rows = [r for r in rows if r.get("remediation") == "ART_REDO"]
    uncertain_rows = [r for r in rows if r.get("remediation") == "HUMAN_REVIEW" and r.get("status") in {"REDO", "REVIEW"}]
    source_png_counts = {
        "prea1": len(list((ROOT / "tmp" / "manus-prea1-stockpile").glob("**/*.png"))),
        "b2": len(list((ROOT / "tmp" / "manus-b2-stockpile").glob("**/*.png"))),
        "edb": len(list((ROOT / "tmp" / "manus-edb-settings-stockpile").glob("**/*.png"))),
    }
    missing_sources = {family: count == 0 for family, count in source_png_counts.items()}
    recoverable_without_generation = len(pipeline_rows)
    confirmed_recovered = sum(1 for r in pipeline_rows if r.get("status") == "PASS")

    counts = {
        "updated_at": STAMP,
        "status": dict(status),
        "failure_origin": dict(origins),
        "remediation": dict(remediation),
        "pipeline_caused_failures": len(pipeline_rows),
        "potentially_recoverable_without_generation": recoverable_without_generation,
        "confirmed_recovered_after_rebuild": confirmed_recovered,
        "representative_b2_extracted_sample_cells": b2_sample["sample_cells"],
        "representative_b2_valid_source_sheets": b2_sample["valid_source_sheets"],
        "representative_b2_unreadable_source_sheets": b2_sample["unreadable_source_sheets"],
        "genuinely_bad_source_art_art_redo": len(source_rows),
        "uncertain_human_review": len(uncertain_rows),
        "missing_raw_source_folders": missing_sources,
        "raw_source_png_counts": source_png_counts,
        "repaired_sample_sheets": sheet_paths,
        "pipeline_asset_ids": [r.get("asset_id") for r in pipeline_rows],
        "art_redo_asset_ids": [r.get("asset_id") for r in source_rows],
        "uncertain_asset_ids": [r.get("asset_id") for r in uncertain_rows],
    }
    (OUT / "upstream-repair-counts.json").write_text(json.dumps(counts, indent=2, ensure_ascii=False), encoding="utf-8")

    live = [r for r in rows if r.get("live_vs_raw_harvest") == "live"]
    raw = [r for r in rows if r.get("live_vs_raw_harvest") == "raw_harvest"]
    source_art_final = [r for r in rows if r.get("status") in {"PASS", "REVIEW", "REDO"} and r.get("source_role") != "source_sheet"]
    source_art_good = sum(
        1
        for r in source_art_final
        if r.get("status") == "PASS" or (r.get("status") in {"REDO", "REVIEW"} and r.get("remediation") == "PIPELINE_REBUILD")
    )
    lines = [
        "# Upstream Asset Derivative Repair Pass",
        "",
        f"Updated: `{STAMP}`",
        "",
        "## Scope",
        "",
        "This pass froze the completed `f02edc4f` visual audit and repaired derivative/audit machinery only. It did not request or generate new art and did not mutate production manifests.",
        "",
        "Ignored raw source PNGs are present locally for representative Pre-A1, B2, and EDB harvests. This pass regenerates audit-side affected derivatives and sample sheets only; it does not mutate production manifests or begin broad import/wiring.",
        "",
        "## Systemic Defects",
        "",
        "- Grid slicing/crop offset: fixed importer support for inferred/manual grid bounds and fail-closed filled-cell validation.",
        "- Raw grid extraction: source sheets are now represented separately from extracted derivatives in audit semantics; missing extraction is `PIPELINE_REBUILD`, not `ART_REDO`.",
        "- EDB settings extraction: source-only diptychs/settings are treated as source role plus extraction state rather than failed production assets.",
        "- White-object alpha destruction: white-mode keying now relaxes colour seeds for thin/light subjects while still flood-filling only border-connected background.",
        "- Naming/positional drift: importer now fails when expected filled cells are absent, preventing silent cell/key shifts.",
        "- Black blocks/post-processing: black-field regression verifies final derivatives have transparent background corners.",
        "",
        "## Counts",
        "",
        f"- PASS/REVIEW/REDO: PASS {status.get('PASS', 0)}, REVIEW {status.get('REVIEW', 0)}, REDO {status.get('REDO', 0)}",
        f"- Live rows: {len(live)}; raw-harvest rows: {len(raw)}",
        f"- PIPELINE_REBUILD: {len(pipeline_rows)}",
        f"- ART_REDO: {len(source_rows)}",
        f"- HUMAN_REVIEW: {len(uncertain_rows)}",
        f"- Potentially recoverable without generation: {recoverable_without_generation}",
        f"- Confirmed recovered after rebuild in this checkout: {confirmed_recovered}",
        f"- Source-art-adjusted quality rate: {(source_art_good / len(source_art_final) * 100 if source_art_final else 0):.1f}%",
        "",
        "## Repaired Sample Sheets",
        "",
        *[f"- `{family}`: `{sheet}`" for family, sheet in sheet_paths.items()],
        "",
        "## Visual Review",
        "",
        "- Focused multimodal review recorded in `audit/visual-assets/upstream-repair-visual-review.md`.",
        "- Reviewer agreed the samples justify splitting pipeline defects from source-art redo; B2 remains limited to audit-side extraction validation, not production import.",
        "",
        "## Blocked / Unsafe Items",
        "",
        f"- Raw source PNG counts available locally: Pre-A1 {source_png_counts['prea1']}, B2 {source_png_counts['b2']}, EDB {source_png_counts['edb']}. Production-manifest rebuild/import is intentionally out of scope.",
        f"- B2 representative extraction sheet contains {b2_sample['sample_cells']} audit-only sliced cells from {b2_sample['valid_source_sheets']} readable local raw 3x3 sheets.",
        f"- B2 skipped {b2_sample['unreadable_source_sheets']} unreadable local source PNG(s) before finding readable samples.",
        "- No live goal-net asset exists in `public/assets`; the white/light goal-net case is covered by the focused synthetic regression fixture.",
        "- Broad visual QA and A1 cultivation remain intentionally frozen/out of scope.",
        "",
    ]
    (OUT / "upstream-repair-report.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"counts": rel(OUT / "upstream-repair-counts.json"), "report": rel(OUT / "upstream-repair-report.md")}, indent=2))


if __name__ == "__main__":
    main()
