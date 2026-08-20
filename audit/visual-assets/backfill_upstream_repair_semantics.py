"""
Atomic semantics migration for the completed f02edc4f visual-audit snapshot.

This intentionally does not rebuild the asset bank or regenerate broad review
sheets. It validates the frozen completed audit counts, backs up the restored
snapshot, adds failure_origin/remediation/source-role fields, and writes updated
index/csv/summary via temp files + atomic replace.
"""
from __future__ import annotations

import csv
import json
import os
import runpy
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"
INDEX = OUT / "index.jsonl"
CSV = OUT / "index.csv"
SUMMARY = OUT / "summary.md"
SNAPSHOTS = OUT / "snapshots"
SCHEMA_VERSION = "2026-08-18-upstream-repair-v2"
STAMP = datetime.now(timezone.utc).isoformat()
EXPECTED = {"total": 14002, "PASS": 11250, "REVIEW": 623, "REDO": 2129, "pending_visual": 0, "flagged_mechanical": 0}

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


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def load_rows(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-16")
    for line in text.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def validate_completed(rows: list[dict[str, Any]]) -> Counter:
    status = Counter(str(r.get("status") or "") for r in rows)
    got = {
        "total": len(rows),
        "PASS": status["PASS"],
        "REVIEW": status["REVIEW"],
        "REDO": status["REDO"],
        "pending_visual": status["pending_visual"],
        "flagged_mechanical": status["flagged_mechanical"],
    }
    if got != EXPECTED:
        raise SystemExit(f"Refusing migration: baseline mismatch. got={got} expected={EXPECTED}")
    return status


def backup_snapshot() -> Path:
    label = STAMP.replace(":", "").replace(".", "-")
    dest = SNAPSHOTS / f"f02edc4f-restored-{label}"
    dest.mkdir(parents=True, exist_ok=False)
    for path in [INDEX, CSV, SUMMARY]:
        shutil.copy2(path, dest / path.name)
    return dest


def classify(row: dict[str, Any]) -> None:
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


def atomic_text(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    if path.exists():
        path.chmod(0o666)
    try:
        tmp.replace(path)
    except PermissionError:
        path.unlink()
        os.replace(tmp, path)


def write_index(rows: list[dict[str, Any]]) -> None:
    atomic_text(INDEX, "\n".join(json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows) + "\n")
    fields = list(rows[0].keys())
    tmp = CSV.with_suffix(".csv.tmp")
    with tmp.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, list) else v for k, v in row.items()})
    if CSV.exists():
        CSV.chmod(0o666)
    try:
        tmp.replace(CSV)
    except PermissionError:
        CSV.unlink()
        os.replace(tmp, CSV)


def write_summary(rows: list[dict[str, Any]], backup_dir: Path) -> None:
    status = Counter(r["status"] for r in rows)
    live = [r for r in rows if r.get("live_vs_raw_harvest") == "live"]
    raw = [r for r in rows if r.get("live_vs_raw_harvest") == "raw_harvest"]
    remediation = Counter(r.get("remediation") for r in rows if r.get("status") in {"REDO", "REVIEW"})
    origins = Counter(r.get("failure_origin") for r in rows if r.get("status") in {"REDO", "REVIEW"})
    family_status: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        family_status[row.get("expected_asset_type") or "unknown"][row["status"]] += 1

    source_art_final = [r for r in rows if r.get("status") in {"PASS", "REVIEW", "REDO"} and r.get("source_role") != "source_sheet"]
    source_art_good = sum(
        1 for r in source_art_final
        if r.get("status") == "PASS" or (r.get("status") in {"REDO", "REVIEW"} and r.get("remediation") == "PIPELINE_REBUILD")
    )
    live_pass = sum(1 for r in live if r.get("status") == "PASS")
    raw_pass = sum(1 for r in raw if r.get("status") == "PASS")
    lines = [
        "# Visual Asset QA Audit",
        "",
        "Audit version: `2026-08-17-v1`",
        f"Last migrated: `{STAMP}`",
        f"Audit schema version: `{SCHEMA_VERSION}`",
        "",
        "This is a sidecar visual QA audit. It does not mutate production manifests.",
        "",
        "## Scope And Completion",
        "",
        f"- Total indexed assets: {len(rows)}",
        f"- Live indexed assets: {len(live)}",
        f"- Raw-harvest indexed assets: {len(raw)}",
        f"- Visually decided assets: {status['PASS'] + status['REVIEW'] + status['REDO']} (100.0%)",
        "- Remaining pending assets: 0 (0.0%)",
        "",
        "## Verdict Counts",
        "",
        f"- PASS: {status['PASS']} ({status['PASS'] / len(rows) * 100:.1f}%)",
        f"- REVIEW: {status['REVIEW']} ({status['REVIEW'] / len(rows) * 100:.1f}%)",
        f"- REDO: {status['REDO']} ({status['REDO'] / len(rows) * 100:.1f}%)",
        f"- pending_visual: {status['pending_visual']}",
        f"- flagged_mechanical: {status['flagged_mechanical']}",
        "",
        "## Source-Art Adjusted Quality",
        "",
        f"- Live-bank visual quality rate: {live_pass / len(live) * 100:.1f}% ({live_pass}/{len(live)} decided)",
        f"- Raw-harvest visual quality rate: {raw_pass / len(raw) * 100:.1f}% ({raw_pass}/{len(raw)} decided)",
        f"- Source-art-adjusted quality rate: {source_art_good / len(source_art_final) * 100:.1f}% ({source_art_good}/{len(source_art_final)})",
        f"- ART_REDO: {remediation['ART_REDO']}",
        f"- PIPELINE_REBUILD: {remediation['PIPELINE_REBUILD']}",
        f"- HUMAN_REVIEW: {remediation['HUMAN_REVIEW']}",
        "",
        "## Failure Origin",
        "",
        *[f"- `{k}`: {v}" for k, v in sorted(origins.items())],
        "",
        "## Status By Family",
        "",
        *[
            f"- {family}: PASS {counts['PASS']}, REVIEW {counts['REVIEW']}, REDO {counts['REDO']}, pending {counts['pending_visual'] + counts['flagged_mechanical']}"
            for family, counts in sorted(family_status.items())
        ],
        "",
        "## Snapshot Backup",
        "",
        f"- Restored completed snapshot backup: `{rel(backup_dir)}`",
        "",
        "## Durable Outputs",
        "",
        "- `audit/visual-assets/index.jsonl`",
        "- `audit/visual-assets/index.csv`",
        "- `audit/visual-assets/summary.md`",
        "- `audit/visual-assets/upstream-repair-counts.json`",
        "- `audit/visual-assets/upstream-repair-report.md`",
        "",
    ]
    atomic_text(SUMMARY, "\n".join(lines))


def main() -> None:
    rows = load_rows(INDEX)
    validate_completed(rows)
    tmp_copy = OUT / "index.migration-test.tmp.jsonl"
    tmp_copy.write_text("\n".join(json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows) + "\n", encoding="utf-8")
    validate_completed(load_rows(tmp_copy))
    tmp_copy.unlink()
    backup_dir = backup_snapshot()
    for row in rows:
        classify(row)
    write_index(rows)
    write_summary(rows, backup_dir)
    validate_completed(load_rows(INDEX))
    runpy.run_path(str(OUT / "build_upstream_repair_outputs.py"), run_name="__main__")
    print(json.dumps({"status": "ok", "backup": rel(backup_dir), "rows": len(rows)}, indent=2))


if __name__ == "__main__":
    main()
