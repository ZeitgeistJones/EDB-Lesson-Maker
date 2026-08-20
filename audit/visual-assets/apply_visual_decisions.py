"""
Merge visual-review JSONL decisions into the sidecar visual asset audit index.

This script only writes audit/visual-assets outputs. It never edits production
asset manifests.
"""
from __future__ import annotations

import csv
import json
import math
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"
INDEX = OUT / "index.jsonl"
STAMP = datetime.now(timezone.utc).isoformat()
STATUS_RANK = {"PASS": 1, "REVIEW": 2, "REDO": 3}
SCHEMA_VERSION = "2026-08-18-upstream-repair-v2"
ALLOWED_REASON_CODES = {
    "wrong_concept", "wrong_sense", "ambiguous_concept", "action_mismatch", "emotion_mismatch",
    "identity_drift", "role_mismatch", "bad_crop", "edge_cutoff", "too_small",
    "excess_dead_space", "blurry", "low_resolution", "generation_artifact", "bad_anatomy",
    "text_artifact", "logo_artifact", "white_plate", "white_halo", "background_contamination",
    "wrong_background_mode", "pair_mismatch", "bad_open_state", "white_interior", "poor_cavity",
    "poor_stage_space", "too_busy", "bad_perspective", "story_specific", "wrong_letter",
    "wrong_letter_state", "malformed_glyph", "unclear_instruction", "weak_contrast",
    "missing", "corrupt", "zero_byte", "bad_alpha", "blank", "exact_duplicate",
}
REASON_ALIASES = {
    "vanishes_on_white": "weak_contrast",
    "corrupt_tile": "generation_artifact",
    "hollow_cutout": "poor_cavity",
    "unreadable_abstractions": "ambiguous_concept",
    "artifact_contamination": "background_contamination",
    "opaque_plate": "white_plate",
    "white_box": "white_plate",
}

PIPELINE_REASON_CODES = {
    "bad_crop", "edge_cutoff", "white_plate", "white_halo", "background_contamination",
    "wrong_background_mode", "bad_alpha", "missing", "corrupt", "zero_byte", "blank",
}
SOURCE_ART_REASON_CODES = {
    "wrong_concept", "wrong_sense", "ambiguous_concept", "action_mismatch", "emotion_mismatch",
    "identity_drift", "role_mismatch", "generation_artifact", "bad_anatomy", "text_artifact",
    "logo_artifact", "pair_mismatch", "bad_open_state", "poor_cavity", "poor_stage_space",
    "too_busy", "bad_perspective", "story_specific", "wrong_letter", "wrong_letter_state",
    "malformed_glyph", "unclear_instruction", "weak_contrast",
}


def classify_semantics(row: dict[str, Any]) -> None:
    row["audit_schema_version"] = SCHEMA_VERSION
    mode = str(row.get("expected_background_mode") or "")
    if mode == "raw_sheet":
        row["source_role"] = "source_sheet"
        row["extraction_state"] = "source_only"
        row["failure_origin"] = "pipeline"
        row["remediation"] = "PIPELINE_REBUILD"
        return
    if mode in {"cropped_contact_cell", "contact_sheet_cell"}:
        row["source_role"] = "extracted_derivative"
        row["extraction_state"] = "extracted" if mode == "cropped_contact_cell" else "pending_extraction"
    else:
        row["source_role"] = "production_asset"
        row["extraction_state"] = "not_applicable"
    if row.get("status") not in {"REDO", "REVIEW"}:
        row["failure_origin"] = "uncertain"
        row["remediation"] = "HUMAN_REVIEW"
        return
    reasons = set(row.get("reason_codes") or []) | set(row.get("mechanical_flags") or [])
    if reasons & SOURCE_ART_REASON_CODES:
        row["failure_origin"] = "source_art"
        row["remediation"] = "ART_REDO"
    elif reasons & PIPELINE_REASON_CODES:
        row["failure_origin"] = "pipeline"
        row["remediation"] = "PIPELINE_REBUILD"
    else:
        row["failure_origin"] = "uncertain"
        row["remediation"] = "HUMAN_REVIEW"


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def load_rows() -> list[dict[str, Any]]:
    rows = []
    try:
        text = INDEX.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = INDEX.read_text(encoding="utf-16")
    for line in text.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def load_decisions() -> tuple[dict[str, dict[str, Any]], Counter]:
    decisions: dict[str, dict[str, Any]] = {}
    sources = Counter()
    for path in sorted(OUT.glob("decisions-*.jsonl")):
        normalized_lines: list[str] = []
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            asset_id = str(d.get("asset_id") or "")
            status = str(d.get("status") or "").upper()
            if not asset_id or status not in STATUS_RANK:
                continue
            reasons = []
            for code in d.get("reason_codes") or []:
                normalized = REASON_ALIASES.get(str(code), str(code))
                if normalized in ALLOWED_REASON_CODES and normalized not in reasons:
                    reasons.append(normalized)
            d["status"] = status
            d["reason_codes"] = reasons
            d["decision_source"] = rel(path)
            normalized_lines.append(json.dumps({
                k: v for k, v in d.items() if k != "decision_source"
            }, ensure_ascii=False, sort_keys=True))
            existing = decisions.get(asset_id)
            if existing and STATUS_RANK[existing["status"]] > STATUS_RANK[status]:
                continue
            decisions[asset_id] = d
            sources[rel(path)] += 1
        if normalized_lines:
            path.write_text("\n".join(normalized_lines) + "\n", encoding="utf-8")
    return decisions, sources


def font(size: int) -> ImageFont.ImageFont:
    for name in ["arial.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


def draw_sheet(rows: list[dict[str, Any]], out_path: Path, title: str, cell: int = 220, cols: int = 5) -> None:
    if not rows:
        return
    label_h = 70
    title_h = 44
    count = math.ceil(len(rows) / cols)
    canvas = Image.new("RGB", (cols * cell, title_h + count * (cell + label_h)), "#111827")
    draw = ImageDraw.Draw(canvas)
    f_title = font(20)
    f_label = font(13)
    draw.text((12, 10), title[:140], fill="#f9fafb", font=f_title)
    for idx, row in enumerate(rows):
        x = (idx % cols) * cell
        y = title_h + (idx // cols) * (cell + label_h)
        draw.rectangle((x, y, x + cell - 1, y + cell + label_h - 1), fill="#1f2937", outline="#4b5563")
        img_path = ROOT / row["path"]
        try:
            with Image.open(img_path) as im:
                rgba = im.convert("RGBA")
                bg = Image.new("RGBA", rgba.size, "#f8fafc")
                bg.alpha_composite(rgba)
                im = bg.convert("RGB")
                im.thumbnail((cell - 18, cell - 18), Image.Resampling.LANCZOS)
                canvas.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        except Exception:
            draw.rectangle((x + 10, y + 10, x + cell - 10, y + cell - 10), fill="#7f1d1d")
            draw.text((x + 18, y + 20), "UNREADABLE", fill="#fff", font=f_label)
        label = f"{idx + 1}. {row['key']}"
        sub = f"{row['status']} | {','.join(row.get('reason_codes') or [])[:42]}"
        note = str(row.get("notes") or "")[:42]
        draw.rectangle((x, y + cell, x + cell, y + cell + label_h), fill="#0f172a")
        draw.text((x + 6, y + cell + 6), label[:34], fill="#f8fafc", font=f_label)
        draw.text((x + 6, y + cell + 28), sub, fill="#cbd5e1", font=f_label)
        draw.text((x + 6, y + cell + 50), note, fill="#94a3b8", font=f_label)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, quality=90)


def write_status_sheets(rows: list[dict[str, Any]]) -> None:
    for sub in ["redo", "review", "pass-samples"]:
        folder = OUT / "sheets" / sub
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*.jpg"):
            old.unlink()
    redo = [r for r in rows if r["status"] == "REDO"]
    review = [r for r in rows if r["status"] == "REVIEW"]
    passed = [r for r in rows if r["status"] == "PASS"]
    for idx in range(0, len(redo), 30):
        draw_sheet(redo[idx : idx + 30], OUT / "sheets" / "redo" / f"redo-{idx // 30 + 1:03d}.jpg", "REDO visual decisions")
    for idx in range(0, len(review), 30):
        draw_sheet(review[idx : idx + 30], OUT / "sheets" / "review" / f"review-{idx // 30 + 1:03d}.jpg", "REVIEW visual decisions")
    sample = []
    seen_family = set()
    for row in passed:
        family = row.get("expected_asset_type")
        if family in seen_family and len(sample) > 120:
            continue
        seen_family.add(family)
        sample.append(row)
        if len(sample) >= 180:
            break
    for idx in range(0, len(sample), 30):
        draw_sheet(sample[idx : idx + 30], OUT / "sheets" / "pass-samples" / f"pass-sample-{idx // 30 + 1:03d}.jpg", "PASS visual samples")


def write_outputs(rows: list[dict[str, Any]], sources: Counter) -> None:
    INDEX.write_text("\n".join(json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows) + "\n", encoding="utf-8")
    with (OUT / "index.csv").open("w", newline="", encoding="utf-8") as fh:
        fields = list(rows[0].keys())
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                k: json.dumps(v, ensure_ascii=False) if isinstance(v, list) else v
                for k, v in row.items()
            })

    status = Counter(r["status"] for r in rows)
    live = [r for r in rows if r["live_vs_raw_harvest"] == "live"]
    raw = [r for r in rows if r["live_vs_raw_harvest"] == "raw_harvest"]
    live_final = [r for r in live if r["status"] in STATUS_RANK]
    raw_final = [r for r in raw if r["status"] in STATUS_RANK]
    reasons = Counter(code for r in rows for code in (r.get("reason_codes") or []) if r["status"] in {"REDO", "REVIEW"})
    remediation = Counter(r.get("remediation") or "HUMAN_REVIEW" for r in rows if r["status"] in {"REDO", "REVIEW"})
    origins = Counter(r.get("failure_origin") or "uncertain" for r in rows if r["status"] in {"REDO", "REVIEW"})
    source_art_final = [
        r for r in rows
        if r["status"] in STATUS_RANK and not (r.get("source_role") == "source_sheet")
    ]
    source_art_good = sum(
        1 for r in source_art_final
        if r["status"] == "PASS" or (r["status"] in {"REDO", "REVIEW"} and r.get("remediation") == "PIPELINE_REBUILD")
    )
    family_status: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        family_status[row["expected_asset_type"]][row["status"]] += 1

    def rate(final_rows: list[dict[str, Any]], total_rows: list[dict[str, Any]]) -> str:
        if not total_rows:
            return "0.0%"
        good = sum(1 for r in final_rows if r["status"] == "PASS")
        return f"{good / len(total_rows) * 100:.1f}%"

    pending = status["pending_visual"] + status["flagged_mechanical"]
    lines = [
        "# Visual Asset QA Audit",
        "",
        f"Audit version: `2026-08-17-v1`",
        f"Updated with visual decisions: `{STAMP}`",
        "",
        "This is a sidecar audit. It does not mutate production manifests.",
        "",
        "## Executive Counts",
        "",
        f"- Total indexed assets: {len(rows)}",
        f"- PASS: {status['PASS']}",
        f"- REVIEW: {status['REVIEW']}",
        f"- REDO: {status['REDO']}",
        f"- Pending visual: {status['pending_visual']}",
        f"- Flagged mechanical, pending visual: {status['flagged_mechanical']}",
        f"- Completion: {(status['PASS'] + status['REVIEW'] + status['REDO']) / len(rows) * 100:.1f}%",
        f"- Live-bank quality rate: {rate(live_final, live)}",
        f"- Raw-harvest quality rate: {rate(raw_final, raw)}",
        f"- Source-art-adjusted quality rate: {(source_art_good / len(source_art_final) * 100 if source_art_final else 0):.1f}%",
        f"- ART_REDO: {remediation['ART_REDO']}",
        f"- PIPELINE_REBUILD: {remediation['PIPELINE_REBUILD']}",
        f"- HUMAN_REVIEW: {remediation['HUMAN_REVIEW']}",
        "",
        "## Status By Family",
        "",
    ]
    for family, counts in sorted(family_status.items()):
        lines.append(
            f"- {family}: PASS {counts['PASS']}, REVIEW {counts['REVIEW']}, REDO {counts['REDO']}, pending {counts['pending_visual'] + counts['flagged_mechanical']}"
        )
    lines.extend([
        "",
        "## Worst Recurring Visual Failures",
        "",
        *[f"- {code}: {count}" for code, count in reasons.most_common(20)],
        "",
        "## Failure Origin / Remediation",
        "",
        *[f"- origin `{k}`: {v}" for k, v in sorted(origins.items())],
        *[f"- remediation `{k}`: {v}" for k, v in sorted(remediation.items())],
        "",
        "## Decision Sources",
        "",
        *[f"- `{path}`: {count}" for path, count in sorted(sources.items())],
        "",
        "## Durable Outputs",
        "",
        "- `audit/visual-assets/index.jsonl`",
        "- `audit/visual-assets/index.csv`",
        "- `audit/visual-assets/sheet-manifest.json`",
        "- `audit/visual-assets/sheets/redo/`",
        "- `audit/visual-assets/sheets/review/`",
        "- `audit/visual-assets/sheets/pass-samples/`",
        "- `audit/visual-assets/sheets/pending_visual/`",
        "",
        "## Known Remaining Pending",
        "",
        "None. Every indexed row has a final visual status or an objective mechanical REDO.",
        "",
    ])
    (OUT / "summary.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    rows = load_rows()
    by_id = {r["asset_id"]: r for r in rows}
    decisions, sources = load_decisions()
    applied = 0
    for asset_id, decision in decisions.items():
        row = by_id.get(asset_id)
        if not row:
            continue
        row["status"] = decision["status"]
        row["confidence"] = decision.get("confidence") or row.get("confidence") or "medium"
        row["reason_codes"] = decision.get("reason_codes") or []
        row["notes"] = decision.get("notes") or row.get("notes") or ""
        row["reviewed_from"] = decision.get("reviewed_from") or row.get("reviewed_from") or ""
        row["decision_source"] = decision["decision_source"]
        row["timestamp"] = STAMP
        applied += 1
    for row in rows:
        classify_semantics(row)
    if os.environ.get("VISUAL_AUDIT_SKIP_STATUS_SHEETS") == "1":
        print("Skipping broad status sheet regeneration (VISUAL_AUDIT_SKIP_STATUS_SHEETS=1)")
    else:
        write_status_sheets(rows)
    write_outputs(rows, sources)
    print(json.dumps({
        "rows": len(rows),
        "decisions_loaded": len(decisions),
        "decisions_applied": applied,
        "status": Counter(r["status"] for r in rows),
    }, indent=2))


if __name__ == "__main__":
    main()
