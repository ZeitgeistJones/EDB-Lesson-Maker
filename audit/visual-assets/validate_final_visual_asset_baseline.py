"""
Validate the final visual asset audit baseline.

This is intentionally narrow: it verifies exclusive final dispositions, row
counts, stable identity uniqueness, queue alignment, and generic pending removal.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"
INDEX = OUT / "final-index.jsonl"
EXPECTED_TOTAL = 14002
FINAL_DISPOSITIONS = {"PASS", "REVIEW", "ART_REDO", "PIPELINE_REBUILD", "SOURCE_CORRUPT"}


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def assert_queue(name: str, expected_disposition: str, rows_by_id: dict[str, dict[str, Any]]) -> int:
    path = OUT / "queues" / f"{name}.jsonl"
    queue_rows = load_jsonl(path) if path.exists() else []
    for row in queue_rows:
        asset_id = str(row.get("asset_id") or "")
        indexed = rows_by_id.get(asset_id)
        if not indexed:
            raise SystemExit(f"{name}: unknown asset_id {asset_id}")
        if indexed.get("final_disposition") != expected_disposition:
            raise SystemExit(
                f"{name}: {asset_id} has {indexed.get('final_disposition')}, expected {expected_disposition}"
            )
    indexed_count = sum(1 for row in rows_by_id.values() if row.get("final_disposition") == expected_disposition)
    if len(queue_rows) != indexed_count:
        raise SystemExit(f"{name}: queue has {len(queue_rows)} rows, index has {indexed_count}")
    return len(queue_rows)


def main() -> None:
    rows = load_jsonl(INDEX)
    if len(rows) != EXPECTED_TOTAL:
        raise SystemExit(f"Expected {EXPECTED_TOTAL} rows, got {len(rows)}")

    ids = [str(row.get("asset_id") or "") for row in rows]
    duplicates = [asset_id for asset_id, count in Counter(ids).items() if count > 1]
    if duplicates:
        raise SystemExit(f"Duplicate asset_id rows: {duplicates[:10]}")

    dispositions = Counter(row.get("final_disposition") for row in rows)
    unexpected = set(dispositions) - FINAL_DISPOSITIONS
    if unexpected:
        raise SystemExit(f"Unexpected final dispositions: {sorted(unexpected)}")
    if sum(dispositions.values()) != EXPECTED_TOTAL:
        raise SystemExit(f"Disposition total mismatch: {dict(dispositions)}")

    generic_pending = [
        row.get("asset_id")
        for row in rows
        if row.get("status") in {"pending_visual", "flagged_mechanical"}
        or row.get("final_disposition") in {"pending_visual", "flagged_mechanical", "", None}
    ]
    if generic_pending:
        raise SystemExit(f"Generic pending/flagged rows remain: {generic_pending[:10]}")

    rows_by_id = {str(row["asset_id"]): row for row in rows}
    queue_counts = {
        "art_redo": assert_queue("art-redo-regeneration-queue", "ART_REDO", rows_by_id),
        "review": assert_queue("review-queue", "REVIEW", rows_by_id),
        "unresolved_pipeline": assert_queue("unresolved-pipeline-queue", "PIPELINE_REBUILD", rows_by_id),
        "source_corrupt": assert_queue("source-corrupt-queue", "SOURCE_CORRUPT", rows_by_id),
    }

    print(json.dumps({
        "status": "ok",
        "rows": len(rows),
        "dispositions": dict(dispositions),
        "queue_counts": queue_counts,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
