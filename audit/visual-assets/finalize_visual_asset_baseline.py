"""
Close the durable visual asset audit with one exclusive final disposition.

This is audit tooling only. It does not mutate production manifests, call Manus,
generate art, or change producer code. It starts from the completed visual audit
and the upstream repair semantics added at 08d38ae8, then writes final indexes,
queues, contact sheets, and deterministic validation outputs.
"""
from __future__ import annotations

import csv
import json
import math
import os
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"
INDEX = OUT / "index.jsonl"
CSV = OUT / "index.csv"
FINAL_INDEX = OUT / "final-index.jsonl"
FINAL_CSV = OUT / "final-index.csv"
SUMMARY = OUT / "summary.md"
FINAL_REPORT = OUT / "final-quality-report.md"
COUNTS = OUT / "final-baseline-counts.json"
QUEUES = OUT / "queues"
SHEETS = OUT / "sheets"
SNAPSHOTS = OUT / "snapshots"
STAMP = datetime.now(timezone.utc).isoformat()
SCHEMA_VERSION = "2026-08-18-final-baseline-v1"
EXPECTED_TOTAL = 14002
FINAL_DISPOSITIONS = {"PASS", "REVIEW", "ART_REDO", "PIPELINE_REBUILD", "SOURCE_CORRUPT"}
FOLLOW_UP_REVIEW_OVERRIDES = {
    "live:vocab:chef-hat": {
        "final_disposition": "REVIEW",
        "final_reason_codes": ["weak_contrast"],
        "final_review_follow_up": "Follow-up repair-sheet review found the white/light object very pale; human preference needed before treating as production-good.",
    },
    "live:vocab:cotton": {
        "final_disposition": "REVIEW",
        "final_reason_codes": ["ambiguous_concept"],
        "final_review_follow_up": "Follow-up repair-sheet review found the object visually ambiguous at classroom scale.",
    },
    "live:vocab:cotton-ball": {
        "final_disposition": "REVIEW",
        "final_reason_codes": ["ambiguous_concept"],
        "final_review_follow_up": "Follow-up repair-sheet review found the object visually ambiguous at classroom scale.",
    },
    "live:vocab:cotton-swab": {
        "final_disposition": "REVIEW",
        "final_reason_codes": ["weak_contrast"],
        "final_review_follow_up": "Follow-up repair-sheet review found the object too faint; human preference needed before treating as production-good.",
    },
}
PIPELINE_REPAIR_SHEETS = {
    "prea1-relations": "audit/visual-assets/sheets/repaired/prea1-relations/prea1-relations-samples.jpg",
    "mnemonic-az": "audit/visual-assets/sheets/repaired/mnemonic-az/mnemonic-az-samples.jpg",
    "edb-setting-variants": "audit/visual-assets/sheets/repaired/edb-setting-variants/edb-setting-variants-samples.jpg",
    "white-light-keyed-objects": "audit/visual-assets/sheets/repaired/white-light-keyed-objects/white-light-keyed-objects-samples.jpg",
    "farm-tree-identity": "audit/visual-assets/sheets/repaired/farm-tree-identity/farm-tree-identity-samples.jpg",
    "black-block-postprocess": "audit/visual-assets/sheets/repaired/black-block-postprocess/black-block-postprocess-samples.jpg",
    "b2-extracted-cells": "audit/visual-assets/sheets/repaired/b2-extracted-cells/b2-extracted-cells-samples.jpg",
}
PREA1_INVENTORY = ROOT / "tmp" / "manus-prea1-stockpile" / "inventory.json"
PREA1_WAVE_TASKS: dict[str, dict[str, str]] | None = None


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def load_rows(path: Path = INDEX) -> list[dict[str, Any]]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-16")
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def atomic_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    if path.exists():
        path.chmod(0o666)
    try:
        tmp.replace(path)
    except PermissionError:
        path.unlink()
        os.replace(tmp, path)


def atomic_csv(path: Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                key: json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value
                for key, value in row.items()
            })
    if path.exists():
        path.chmod(0o666)
    try:
        tmp.replace(path)
    except PermissionError:
        path.unlink()
        os.replace(tmp, path)


def backup_checkpoint() -> Path:
    existing = sorted(SNAPSHOTS.glob("final-baseline-prewrite-*"))
    if existing:
        return existing[0]
    label = STAMP.replace(":", "").replace(".", "-")
    dest = SNAPSHOTS / f"final-baseline-prewrite-{label}"
    dest.mkdir(parents=True, exist_ok=False)
    for path in [INDEX, CSV, SUMMARY, OUT / "upstream-repair-report.md", OUT / "upstream-repair-counts.json"]:
        if path.exists():
            shutil.copy2(path, dest / path.name)
    return dest


def is_source_corrupt(row: dict[str, Any]) -> bool:
    if row.get("source_role") != "source_sheet":
        return False
    reasons = set(row.get("reason_codes") or []) | set(row.get("mechanical_flags") or [])
    notes = str(row.get("notes") or "")
    format_missing = not row.get("format") or row.get("height") in {None, "", 0} or row.get("width") in {None, "", 0}
    pil_unreadable = "PIL could not open image" in notes or "cannot identify image file" in notes
    return "corrupt" in reasons and (format_missing or pil_unreadable)


def disposition_for(row: dict[str, Any]) -> str:
    status = str(row.get("status") or "")
    remediation = str(row.get("remediation") or "")
    if status == "PASS":
        return "PASS"
    if is_source_corrupt(row):
        return "SOURCE_CORRUPT"
    if remediation == "ART_REDO":
        return "ART_REDO"
    if remediation == "PIPELINE_REBUILD":
        return "PIPELINE_REBUILD"
    if status == "REVIEW" or remediation == "HUMAN_REVIEW":
        return "REVIEW"
    if status == "REDO":
        return "ART_REDO"
    return "REVIEW"


def major_family(row: dict[str, Any]) -> str:
    family = str(row.get("expected_asset_type") or "")
    bank = str(row.get("source_bank") or "")
    path = str(row.get("path") or "")
    if family == "background":
        return "background"
    if family == "vocab_icon":
        if "manus-b2-stockpile" in bank or "manus-b2-stockpile" in path:
            return "B2/raw settings"
        return "vocab"
    if family == "prop_cutout":
        return "props"
    if family == "hero_king_interactive_target":
        return "heroes"
    if family == "open_closed_hide_reveal_pair":
        return "hide/reveal"
    if family in {"story_action_plate", "story_cast", "role_plate", "story_environment_edb_setting"}:
        return "story cast/actions/roles/environments"
    if family == "letters_literacy":
        return "letters/literacy"
    if family in {"prea1_functional", "prea1_functional_sheet"}:
        return "Pre-A1 functional"
    return family or "unknown"


def repair_evidence_for(row: dict[str, Any]) -> str:
    path = str(row.get("path") or "")
    key = str(row.get("key") or "")
    family = str(row.get("expected_asset_type") or "")
    bank = str(row.get("source_bank") or "")
    if "wave3-relations" in path:
        return PIPELINE_REPAIR_SHEETS["prea1-relations"]
    if "wave6-mnemonic-az" in path or family == "letters_literacy":
        return PIPELINE_REPAIR_SHEETS["mnemonic-az"]
    if family == "story_environment_edb_setting":
        return PIPELINE_REPAIR_SHEETS["edb-setting-variants"]
    if any(token in key for token in ["doctor", "chef", "snowman", "cotton", "glove", "net"]):
        return PIPELINE_REPAIR_SHEETS["white-light-keyed-objects"]
    if key.startswith("farm-") or "tree" in key:
        return PIPELINE_REPAIR_SHEETS["farm-tree-identity"]
    if key == "prea1-verb-take" or "take" in key:
        return PIPELINE_REPAIR_SHEETS["black-block-postprocess"]
    if "manus-b2-stockpile" in path or "manus-b2-stockpile" in bank:
        return PIPELINE_REPAIR_SHEETS["b2-extracted-cells"]
    return str(row.get("reviewed_from") or "")


def prea1_wave_tasks() -> dict[str, dict[str, str]]:
    global PREA1_WAVE_TASKS
    if PREA1_WAVE_TASKS is not None:
        return PREA1_WAVE_TASKS
    tasks: dict[str, dict[str, str]] = {}
    if PREA1_INVENTORY.exists():
        try:
            inventory = json.loads(PREA1_INVENTORY.read_text(encoding="utf-8"))
            for wave, meta in (inventory.get("waves") or {}).items():
                if isinstance(meta, dict):
                    tasks[wave] = {
                        "task_id": str(meta.get("task_id") or ""),
                        "task_url": str(meta.get("task_url") or ""),
                    }
        except Exception:
            tasks = {}
    PREA1_WAVE_TASKS = tasks
    return tasks


def source_task_reference(row: dict[str, Any]) -> dict[str, str]:
    path = str(row.get("path") or "")
    if "tmp/manus-prea1-stockpile/" in path:
        parts = path.split("/")
        try:
            wave = parts[parts.index("manus-prea1-stockpile") + 1]
        except Exception:
            wave = ""
        if wave:
            return prea1_wave_tasks().get(wave, {})
    return {}


def provenance_for(row: dict[str, Any]) -> dict[str, Any]:
    provenance = {
        "asset_id": row.get("asset_id"),
        "key": row.get("key"),
        "concept": row.get("concept"),
        "source_bank": row.get("source_bank"),
        "source_role": row.get("source_role"),
        "source_path": row.get("path"),
        "expected_asset_type": row.get("expected_asset_type"),
        "expected_background_mode": row.get("expected_background_mode"),
        "expected_concept_word": row.get("expected_concept_word"),
        "reviewed_from": row.get("reviewed_from"),
        "decision_source": row.get("decision_source"),
        "sha256": row.get("sha256"),
        "bytes": row.get("bytes"),
        "notes": row.get("notes"),
        "reason_codes": row.get("reason_codes") or [],
    }
    task_ref = source_task_reference(row)
    if task_ref:
        provenance["source_task_id"] = task_ref.get("task_id", "")
        provenance["source_task_url"] = task_ref.get("task_url", "")
    return provenance


def font(size: int) -> ImageFont.ImageFont:
    for name in ["arial.ttf", "DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


def short_text(value: Any, limit: int) -> str:
    text = str(value or "")
    return text if len(text) <= limit else text[: limit - 1] + "."


def draw_sheet(rows: list[dict[str, Any]], out_path: Path, title: str, cols: int = 4, cell: int = 238) -> None:
    if not rows:
        return
    label_h = 92
    title_h = 54
    page_rows = max(1, math.ceil(len(rows) / cols))
    canvas = Image.new("RGB", (cols * cell, title_h + page_rows * (cell + label_h)), "#111827")
    draw = ImageDraw.Draw(canvas)
    f_title = font(20)
    f_label = font(12)
    draw.text((12, 14), short_text(title, 140), fill="#f9fafb", font=f_title)
    for idx, row in enumerate(rows):
        x = (idx % cols) * cell
        y = title_h + (idx // cols) * (cell + label_h)
        draw.rectangle((x, y, x + cell - 1, y + cell + label_h - 1), fill="#1f2937", outline="#4b5563")
        img_path = ROOT / str(row.get("path") or "")
        try:
            with Image.open(img_path) as im:
                rgba = im.convert("RGBA")
                bg = Image.new("RGBA", rgba.size, "#f8fafc")
                bg.alpha_composite(rgba)
                thumb = bg.convert("RGB")
                thumb.thumbnail((cell - 18, cell - 18), Image.Resampling.LANCZOS)
                canvas.paste(thumb, (x + (cell - thumb.width) // 2, y + (cell - thumb.height) // 2))
        except Exception:
            draw.rectangle((x + 12, y + 12, x + cell - 12, y + cell - 12), fill="#7f1d1d")
            draw.text((x + 18, y + 24), "UNREADABLE / SOURCE ONLY", fill="#fff7ed", font=f_label)
        label = f"{idx + 1}. {row.get('key') or row.get('asset_id')}"
        sub = f"{row.get('final_disposition')} | {','.join(row.get('final_reason_codes') or row.get('reason_codes') or [])}"
        note = str(row.get("final_review_follow_up") or row.get("notes") or "")
        draw.rectangle((x, y + cell, x + cell, y + cell + label_h), fill="#0f172a")
        draw.text((x + 6, y + cell + 7), short_text(label, 36), fill="#f8fafc", font=f_label)
        draw.text((x + 6, y + cell + 31), short_text(sub, 44), fill="#cbd5e1", font=f_label)
        draw.text((x + 6, y + cell + 55), short_text(note, 46), fill="#94a3b8", font=f_label)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, quality=90)


def clean_sheet_folder(folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.jpg"):
        old.unlink()


def write_grouped_sheets(rows: list[dict[str, Any]], base: Path, title_prefix: str, per_sheet: int = 24) -> list[str]:
    clean_sheet_folder(base)
    written: list[str] = []
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        reasons = row.get("final_reason_codes") or row.get("reason_codes") or ["no_reason_code"]
        group = f"{major_family(row)}--{reasons[0]}".replace("/", "-").replace(" ", "-")
        grouped[group].append(row)
    for group, group_rows in sorted(grouped.items()):
        for idx in range(0, len(group_rows), per_sheet):
            chunk = group_rows[idx : idx + per_sheet]
            path = base / f"{group}-{idx // per_sheet + 1:03d}.jpg"
            draw_sheet(chunk, path, f"{title_prefix}: {group}")
            written.append(rel(path))
    return written


def write_queue(name: str, rows: list[dict[str, Any]], fields: list[str]) -> dict[str, Any]:
    QUEUES.mkdir(parents=True, exist_ok=True)
    jsonl = QUEUES / f"{name}.jsonl"
    csv_path = QUEUES / f"{name}.csv"
    queue_rows = [{key: row.get(key) for key in fields} for row in rows]
    atomic_text(jsonl, "\n".join(json.dumps(row, ensure_ascii=False, sort_keys=True) for row in queue_rows) + ("\n" if queue_rows else ""))
    atomic_csv(csv_path, queue_rows, fields)
    return {"jsonl": rel(jsonl), "csv": rel(csv_path), "count": len(rows)}


def pct(count: int, total: int) -> str:
    return f"{count / total * 100:.2f}%" if total else "0.00%"


def build_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    final_rows: list[dict[str, Any]] = []
    for row in rows:
        row = dict(row)
        disposition = disposition_for(row)
        override = FOLLOW_UP_REVIEW_OVERRIDES.get(str(row.get("asset_id") or ""))
        if override:
            disposition = str(override["final_disposition"])
        row["audit_schema_version"] = SCHEMA_VERSION
        row["final_disposition"] = disposition
        row["final_disposition_at"] = STAMP
        row["final_disposition_version"] = SCHEMA_VERSION
        row["major_family"] = major_family(row)
        row["final_reason_codes"] = list((override or {}).get("final_reason_codes") or row.get("reason_codes") or [])
        row["final_review_follow_up"] = str((override or {}).get("final_review_follow_up") or "")
        row["source_provenance"] = provenance_for(row)
        if row.get("remediation") == "PIPELINE_REBUILD" or disposition in {"PIPELINE_REBUILD", "SOURCE_CORRUPT"}:
            row["repair_evidence_sheet"] = repair_evidence_for(row)
        else:
            row["repair_evidence_sheet"] = ""
        if disposition == "SOURCE_CORRUPT":
            row["final_disposition_reason"] = "Required source file is unreadable from local provenance."
        elif disposition == "PIPELINE_REBUILD":
            row["final_disposition_reason"] = "Source appears recoverable, but a production-good derivative was not landed in this audit-only pass."
        elif disposition == "ART_REDO":
            row["final_disposition_reason"] = "Source/generated art itself needs regeneration."
        elif disposition == "REVIEW":
            row["final_disposition_reason"] = "Visual result is borderline or needs human preference."
        else:
            row["final_disposition_reason"] = "Current derivative is visually production-good."
        final_rows.append(row)
    return final_rows


def validate(final_rows: list[dict[str, Any]]) -> None:
    if len(final_rows) != EXPECTED_TOTAL:
        raise SystemExit(f"Expected {EXPECTED_TOTAL} rows, got {len(final_rows)}")
    ids = [str(row.get("asset_id") or "") for row in final_rows]
    duplicate_ids = [asset_id for asset_id, count in Counter(ids).items() if count > 1]
    if duplicate_ids:
        raise SystemExit(f"Duplicate asset_id rows: {duplicate_ids[:10]}")
    dispositions = Counter(row.get("final_disposition") for row in final_rows)
    if set(dispositions) - FINAL_DISPOSITIONS:
        raise SystemExit(f"Unexpected final dispositions: {set(dispositions) - FINAL_DISPOSITIONS}")
    if sum(dispositions.values()) != EXPECTED_TOTAL:
        raise SystemExit(f"Final dispositions do not add up: {dispositions}")
    bad_status = [
        row.get("asset_id")
        for row in final_rows
        if row.get("status") in {"pending_visual", "flagged_mechanical"} or row.get("final_disposition") in {"pending_visual", "flagged_mechanical", "", None}
    ]
    if bad_status:
        raise SystemExit(f"Generic pending/flagged rows remain: {bad_status[:10]}")
    changed_pipeline = [
        row
        for row in final_rows
        if row.get("remediation") == "PIPELINE_REBUILD" and row.get("status") == "PASS"
    ]
    missing_evidence = [row.get("asset_id") for row in changed_pipeline if not row.get("repair_evidence_sheet")]
    if missing_evidence:
        raise SystemExit(f"Pipeline-recovered rows missing repair evidence: {missing_evidence[:10]}")


def write_outputs(final_rows: list[dict[str, Any]], backup: Path) -> dict[str, Any]:
    fields = list(final_rows[0].keys())
    text = "\n".join(json.dumps(row, ensure_ascii=False, sort_keys=True) for row in final_rows) + "\n"
    atomic_text(INDEX, text)
    atomic_text(FINAL_INDEX, text)
    atomic_csv(CSV, final_rows, fields)
    atomic_csv(FINAL_CSV, final_rows, fields)

    dispositions = Counter(row["final_disposition"] for row in final_rows)
    by_live_raw: dict[str, Counter] = defaultdict(Counter)
    by_family: dict[str, Counter] = defaultdict(Counter)
    for row in final_rows:
        by_live_raw[str(row.get("live_vs_raw_harvest") or "unknown")][row["final_disposition"]] += 1
        by_family[row["major_family"]][row["final_disposition"]] += 1

    art_redo = [row for row in final_rows if row["final_disposition"] == "ART_REDO"]
    review = [row for row in final_rows if row["final_disposition"] == "REVIEW"]
    pipeline = [row for row in final_rows if row["final_disposition"] == "PIPELINE_REBUILD"]
    source_corrupt = [row for row in final_rows if row["final_disposition"] == "SOURCE_CORRUPT"]
    pipeline_recovered = [
        row for row in final_rows
        if row.get("remediation") == "PIPELINE_REBUILD" and row.get("status") == "PASS"
    ]
    pipeline_scope = [row for row in final_rows if row.get("remediation") == "PIPELINE_REBUILD"]
    genuine_reasons = Counter(
        code
        for row in art_redo
        for code in (row.get("reason_codes") or ["no_reason_code"])
        if code not in {"bad_crop", "edge_cutoff", "white_plate", "white_halo", "background_contamination", "wrong_background_mode", "bad_alpha", "missing", "corrupt", "zero_byte", "blank"}
    )

    art_sheets = write_grouped_sheets(art_redo, SHEETS / "art-redo", "ART_REDO final queue")
    review_sheets = write_grouped_sheets(review, SHEETS / "review", "REVIEW final queue")
    repaired_sheet_paths = [path for path in PIPELINE_REPAIR_SHEETS.values() if (ROOT / path).exists()]

    queue_fields = [
        "asset_id", "key", "concept", "major_family", "live_vs_raw_harvest", "source_bank",
        "source_role", "path", "final_disposition", "final_reason_codes", "reason_codes", "notes",
        "final_review_follow_up",
        "reviewed_from", "repair_evidence_sheet", "source_provenance",
    ]
    queues = {
        "art_redo": write_queue("art-redo-regeneration-queue", art_redo, queue_fields),
        "review": write_queue("review-queue", review, queue_fields),
        "unresolved_pipeline": write_queue("unresolved-pipeline-queue", pipeline, queue_fields),
        "source_corrupt": write_queue("source-corrupt-queue", source_corrupt, queue_fields),
    }

    total = len(final_rows)
    live_raw_lines = []
    for bucket, counts in sorted(by_live_raw.items()):
        bucket_total = sum(counts.values())
        parts = ", ".join(f"{name} {counts[name]} ({pct(counts[name], bucket_total)})" for name in sorted(FINAL_DISPOSITIONS))
        live_raw_lines.append(f"- {bucket}: {bucket_total} rows; {parts}")

    family_lines = []
    for family, counts in sorted(by_family.items()):
        family_total = sum(counts.values())
        parts = ", ".join(f"{name} {counts[name]} ({pct(counts[name], family_total)})" for name in sorted(FINAL_DISPOSITIONS))
        family_lines.append(f"- {family}: {family_total} rows; {parts}")

    source_corrupt_lines = [
        f"- `{row.get('asset_id')}` -> `{row.get('path')}` ({short_text(row.get('notes'), 120)})"
        for row in source_corrupt[:40]
    ]
    if len(source_corrupt) > 40:
        source_corrupt_lines.append(f"- ... {len(source_corrupt) - 40} more in `{queues['source_corrupt']['jsonl']}`")

    top_reason_lines = [
        f"- {reason}: {count}"
        for reason, count in genuine_reasons.most_common(15)
    ] or ["- none"]

    report_lines = [
        "# Final Visual Asset Quality Baseline",
        "",
        f"Closed: `{STAMP}`",
        f"Audit schema version: `{SCHEMA_VERSION}`",
        "",
        "## Scope",
        "",
        "- Inventory remains 14,002 rows with zero generic pending rows.",
        "- This closure used existing durable audit decisions and existing source/derivative evidence only.",
        "- No A1 generation, Manus generation/harvesting/sends, lesson wiring, producer refactors, or production manifest imports were run.",
        "- Raw source/contact sheet rows remain typed as source provenance; production derivative failures are separated from raw-source availability.",
        "",
        "## Five-Category Final Disposition",
        "",
        *[
            f"- {name}: {dispositions[name]} ({pct(dispositions[name], total)})"
            for name in ["PASS", "REVIEW", "ART_REDO", "PIPELINE_REBUILD", "SOURCE_CORRUPT"]
        ],
        "",
        "## Repair Scope",
        "",
        f"- Pipeline-caused/potentially recoverable rows at 08d38ae8: {len(pipeline_scope)}",
        f"- Confirmed recovered / production-good after existing repair evidence: {len(pipeline_recovered)}",
        f"- Still unresolved as PIPELINE_REBUILD: {len(pipeline)}",
        f"- Source corrupt/unreadable: {len(source_corrupt)}",
        "",
        "## Live Vs Raw-Harvest Quality",
        "",
        *live_raw_lines,
        "",
        "## Quality By Major Family",
        "",
        *family_lines,
        "",
        "## Most Common Genuine ART_REDO Reasons",
        "",
        *top_reason_lines,
        "",
        "## Source-Corrupt Provenance",
        "",
        *source_corrupt_lines,
        "",
        "## Evidence And Queues",
        "",
        f"- Final index JSONL: `{rel(FINAL_INDEX)}`",
        f"- Final index CSV: `{rel(FINAL_CSV)}`",
        f"- ART_REDO regeneration queue: `{queues['art_redo']['jsonl']}` ({queues['art_redo']['count']} rows)",
        f"- REVIEW queue: `{queues['review']['jsonl']}` ({queues['review']['count']} rows)",
        f"- Unresolved pipeline queue: `{queues['unresolved_pipeline']['jsonl']}` ({queues['unresolved_pipeline']['count']} rows)",
        f"- Source-corrupt queue: `{queues['source_corrupt']['jsonl']}` ({queues['source_corrupt']['count']} rows)",
        f"- ART_REDO sheets: `audit/visual-assets/sheets/art-redo/` ({len(art_sheets)} sheets)",
        f"- REVIEW sheets: `audit/visual-assets/sheets/review/` ({len(review_sheets)} sheets)",
        f"- Repaired/rejudged evidence sheets: {', '.join(f'`{path}`' for path in repaired_sheet_paths)}",
        f"- Atomic prewrite checkpoint: `{rel(backup)}`",
        "",
        "## Validation",
        "",
        "- Final dispositions are exclusive and add to 14,002.",
        "- Stable asset IDs are unique.",
        "- No pending_visual or flagged_mechanical rows remain.",
        "- ART_REDO queue contains only final ART_REDO rows.",
        "- SOURCE_CORRUPT rows retain local source path, source role, hash/byte metadata when present, and original notes.",
        "",
    ]
    atomic_text(FINAL_REPORT, "\n".join(report_lines))
    atomic_text(SUMMARY, "\n".join([
        "# Visual Asset QA Audit",
        "",
        f"Audit version: `2026-08-17-v1`",
        f"Finalized: `{STAMP}`",
        f"Audit schema version: `{SCHEMA_VERSION}`",
        "",
        "This is a sidecar visual QA audit. It does not mutate production manifests.",
        "",
        "## Scope And Completion",
        "",
        f"- Total indexed assets: {total}",
        f"- Visually reviewed / total inventory: {total}/{total} (100.00%)",
        "- Remaining generic pending assets: 0 (0.00%)",
        "",
        "## Exclusive Final Disposition",
        "",
        *[
            f"- {name}: {dispositions[name]} ({pct(dispositions[name], total)})"
            for name in ["PASS", "REVIEW", "ART_REDO", "PIPELINE_REBUILD", "SOURCE_CORRUPT"]
        ],
        "",
        "## Durable Outputs",
        "",
        f"- `{rel(FINAL_INDEX)}`",
        f"- `{rel(FINAL_CSV)}`",
        f"- `{rel(FINAL_REPORT)}`",
        f"- `{queues['art_redo']['jsonl']}`",
        f"- `{queues['review']['jsonl']}`",
        f"- `{queues['unresolved_pipeline']['jsonl']}`",
        f"- `{queues['source_corrupt']['jsonl']}`",
        "- `audit/visual-assets/sheets/art-redo/`",
        "- `audit/visual-assets/sheets/review/`",
        "- `audit/visual-assets/sheets/repaired/`",
        "",
    ]))

    counts = {
        "updated_at": STAMP,
        "audit_schema_version": SCHEMA_VERSION,
        "total": total,
        "dispositions": dict(dispositions),
        "rates": {name: pct(dispositions[name], total) for name in sorted(FINAL_DISPOSITIONS)},
        "live_vs_raw_harvest": {bucket: dict(counts) for bucket, counts in sorted(by_live_raw.items())},
        "major_family": {family: dict(counts) for family, counts in sorted(by_family.items())},
        "pipeline_scope_count": len(pipeline_scope),
        "pipeline_recovered_count": len(pipeline_recovered),
        "freshly_re_reviewed_evidence_sheet_count": len(repaired_sheet_paths),
        "art_redo_top_reasons": dict(genuine_reasons.most_common(20)),
        "queues": queues,
        "sheets": {
            "art_redo": art_sheets,
            "review": review_sheets,
            "repaired_rejudged": repaired_sheet_paths,
        },
        "checkpoint": rel(backup),
        "no_manus_or_generation_calls": True,
    }
    atomic_text(COUNTS, json.dumps(counts, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    return counts


def main() -> None:
    rows = load_rows()
    backup = backup_checkpoint()
    final_rows = build_rows(rows)
    validate(final_rows)
    counts = write_outputs(final_rows, backup)
    validate(load_rows(FINAL_INDEX))
    print(json.dumps({
        "status": "ok",
        "rows": len(final_rows),
        "dispositions": counts["dispositions"],
        "checkpoint": counts["checkpoint"],
        "report": rel(FINAL_REPORT),
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
