import json
from pathlib import Path

manifest_path = Path('audit/visual-assets/sheet-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

target_sheets = [s for s in manifest if '07-vocab-pack-vocab-icon-generated-' in s['sheet']]
target_sheets_151_225 = []
for s in target_sheets:
    num_str = s['sheet'].split('-')[-1].split('.')[0]
    if num_str.isdigit():
        num = int(num_str)
        if 151 <= num <= 225:
            target_sheets_151_225.append((num, s))

target_sheets_151_225.sort(key=lambda x: x[0])
print(f'Total sheets in range 151-225: {len(target_sheets_151_225)}')
total_assets = sum(len(s['asset_ids']) for _, s in target_sheets_151_225)
print(f'Total asset IDs in sheets 151-225: {total_assets}')
for num, s in target_sheets_151_225[:5]:
    print(num, s['sheet'], len(s['asset_ids']), s['asset_ids'][:3])
for num, s in target_sheets_151_225[-5:]:
    print(num, s['sheet'], len(s['asset_ids']), s['asset_ids'][:3])
