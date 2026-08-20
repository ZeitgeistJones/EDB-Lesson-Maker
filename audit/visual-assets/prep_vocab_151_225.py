import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"

manifest = json.loads((OUT / "sheet-manifest.json").read_text(encoding="utf-8"))
index_rows = [json.loads(line) for line in (OUT / "index.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
row_by_id = {r["asset_id"]: r for r in index_rows}

vocab_sheets = []
for s in manifest:
    sheet_name = Path(s["sheet"]).name
    if sheet_name.startswith("07-vocab-pack-vocab-icon-generated-"):
        num_str = sheet_name.replace("07-vocab-pack-vocab-icon-generated-", "").replace(".jpg", "")
        if num_str.isdigit():
            num = int(num_str)
            if 151 <= num <= 225:
                vocab_sheets.append((num, s))

vocab_sheets.sort(key=lambda x: x[0])

meta_by_num = {}
for num, s in vocab_sheets:
    sheet_path = s["sheet"]
    sheet_assets = []
    for aid in s["asset_ids"]:
        r = row_by_id.get(aid, {})
        sheet_assets.append({
            "asset_id": aid,
            "key": r.get("key", aid.replace("live:vocab:", "")),
            "concept": r.get("concept", ""),
            "mechanical_flags": r.get("mechanical_flags", [])
        })
    meta_by_num[num] = {
        "sheet": sheet_path,
        "assets": sheet_assets
    }

(OUT / "vocab_151_225_meta.json").write_text(json.dumps(meta_by_num, indent=2), encoding="utf-8")
print(f"Loaded {len(meta_by_num)} sheets with {sum(len(v['assets']) for v in meta_by_num.values())} total assets.")
