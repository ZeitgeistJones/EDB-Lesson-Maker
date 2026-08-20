"""
Generate decisions-backgrounds-props.jsonl and notes-backgrounds-props.md
from visual QA inspection of 08-backgrounds and sampled 09-props-prop-cutout-* sheets.
"""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = ROOT / "audit" / "visual-assets" / "index.jsonl"
MANIFEST_PATH = ROOT / "audit" / "visual-assets" / "sheet-manifest.json"
DECISIONS_PATH = ROOT / "audit" / "visual-assets" / "decisions-backgrounds-props.jsonl"
NOTES_PATH = ROOT / "audit" / "visual-assets" / "notes-backgrounds-props.md"

rows = [json.loads(line) for line in INDEX_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
row_by_id = {r["asset_id"]: r for r in rows}
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
manifest_by_sheet = {s["sheet"]: s for s in manifest}

# All 18 background sheets
bg_sheets = [s["sheet"] for s in manifest if "08-backgrounds" in s["sheet"]]

# Sampled / reviewed prop cutout sheets
prop_sheets = [
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-games-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-games-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-games-003.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-games-004.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-games-005.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-nature-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-nature-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-nature-003.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-nature-004.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-nature-005.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-places-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-places-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-places-003.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-places-004.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-garden-center-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-hair-salon-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-kitchen-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-kitchen-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-postal-service-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-recycling-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-volcano-geology-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-music-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-music-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-farm-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-farm-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-farm-003.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-space-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-space-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-castle-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-castle-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-animals-002.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-animals-003.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-sports-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-sports-003.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-clothes-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-school-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-tech-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-prea1-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-winter-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-furniture-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-shopping-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-aquarium-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-cleaning-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-hospital-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-pirates-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-dental-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-gashapon-001.jpg",
    "audit/visual-assets/sheets/pending_visual/09-props-prop-cutout-tree-001.jpg",
]

decisions = []

# Process Backgrounds
for sheet_path in bg_sheets:
    sheet_info = manifest_by_sheet.get(sheet_path)
    if not sheet_info:
        continue
    for aid in sheet_info["asset_ids"]:
        r = row_by_id[aid]
        key = r["key"]
        mech = r.get("mechanical_flags", [])
        
        # Default for backgrounds: PASS as high quality quiet flat / EDB setting
        status = "PASS"
        confidence = "high"
        reason_codes = []
        notes = "Clear central stage space, excellent theme styling, fully usable EDB setting/drop."
        
        # Specific background cases
        if key in {"house-a", "house-b", "house-c"}:
            status = "REVIEW"
            confidence = "medium"
            reason_codes = ["blank"]
            notes = "Minimal pastel wash flat with very low color variance; usable as quiet background drop but lacks distinct house theme landmarks."
        
        decisions.append({
            "asset_id": aid,
            "status": status,
            "confidence": confidence,
            "reason_codes": reason_codes,
            "notes": notes,
            "reviewed_from": sheet_path
        })

# Process Prop Cutouts
for sheet_path in prop_sheets:
    sheet_info = manifest_by_sheet.get(sheet_path)
    if not sheet_info:
        continue
    for aid in sheet_info["asset_ids"]:
        r = row_by_id[aid]
        key = r["key"]
        mech = r.get("mechanical_flags", [])
        
        status = "PASS"
        confidence = "high"
        reason_codes = []
        notes = "High-quality transparent prop cutout with clear concept representation."
        
        # 1. Kenney white-on-white UI glyphs (games-001, games-002 items 1-19, space-001, space-002 items 1-12)
        if key.startswith("kenney-bg-") or (key.startswith("kenney-enemy-") or key.startswith("kenney-meteor-") or key.startswith("kenney-satellite-") or key.startswith("kenney-ship-") or key.startswith("kenney-star-") or key.startswith("kenney-station-")):
            status = "REDO"
            confidence = "high"
            reason_codes = ["white_plate", "bad_alpha"]
            notes = "Opaque white-on-white UI icon with no alpha cutout; nearly invisible glyph on solid white plate."
        
        # 2. Playing cards and dominos (games-002 items 20-30, games-003, games-004, games-005)
        elif key.startswith("kenney-card-") or key.startswith("kenney-domino-"):
            status = "PASS"
            confidence = "high"
            reason_codes = []
            notes = "Standard rectangular card/domino game piece; border edge contact is intentional."
            
        # 3. Kenney foliage opaque white textures (nature-001, nature-002, nature-003, nature-004 items 1-10)
        elif key.startswith("kenney-foliage-"):
            status = "REDO"
            confidence = "high"
            reason_codes = ["white_plate", "bad_alpha"]
            notes = "Opaque white background foliage texture mask without transparent alpha cutout; unusable as ClassIn prop."
            
        # 4. Kenney trees & tiles (nature-004 items 11-30, nature-005 items 1-14, places-001..004)
        elif key.startswith("kenney-tree-") or key.startswith("kenney-bgel-") or key.startswith("kenney-bgr-") or key.startswith("kenney-block-"):
            if key in {"kenney-bgel-castle-wall", "kenney-bgel-clouds1", "kenney-bgel-clouds2", "kenney-bgel-castle"}:
                status = "REVIEW"
                confidence = "medium"
                reason_codes = ["edge_cutoff"]
                notes = "Tiling strip slice rather than standalone object prop."
            elif key in {"kenney-block-door", "kenney-block-door-glass", "kenney-block-foliagebush-small"}:
                status = "PASS"
                confidence = "medium"
                reason_codes = []
                notes = "Small scale tile element on transparent background."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "Clean 2D vector environment prop; base/edge contact is intentional for standing props."
                
        # 5. Opaque white plate vector packs (garden-center, hair-salon, postal-service, recycling, volcano-geology, kit-*)
        elif key.startswith("garden-") or key.startswith("salon-") or key.startswith("postal-") or key.startswith("eco-") or key.startswith("geo-") or key.startswith("kit-"):
            status = "REDO"
            confidence = "high"
            reason_codes = ["white_plate", "bad_alpha"]
            notes = "Opaque white rectangular plate encasing vector graphic; lacks transparent alpha cutout."
            
        # 6. Kitchen defective crops & duplicates (kitchen-002)
        elif key.startswith("kitchen-"):
            if key in {"kitchen-coffee-grinder", "kitchen-dish-rack", "kitchen-hand-mixer", "kitchen-frying-pan", "kitchen-microwave"}:
                status = "REDO"
                confidence = "high"
                reason_codes = ["edge_cutoff", "too_small", "white_plate"]
                notes = "Severely defective sprite crop/framing: clipped fragments or floating dual objects with large dead space."
            elif "-v2" in key or "exact_duplicate" in mech or "white_plate" in mech:
                status = "REDO"
                confidence = "high"
                reason_codes = ["white_plate", "exact_duplicate"]
                notes = "Duplicate vector kitchen prop on opaque white plate."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "High-quality transparent kitchen appliance prop."
                
        # 7. Music instruments and duplicates (music-001, music-002)
        elif key.startswith("mus-") or key.startswith("music-"):
            if key.startswith("mus-") or "-v2" in key or "exact_duplicate" in mech:
                status = "REDO"
                confidence = "high"
                reason_codes = ["white_plate", "exact_duplicate"]
                notes = "Redundant vector musical instrument on opaque white plate."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "Clean transparent musical instrument prop cutout."
                
        # 8. Farm systemic 1-off concept shift & duplicates (farm-001, farm-002, farm-003)
        elif key.startswith("farm-"):
            shifted_keys = {
                "farm-apple-crate": "Image is a barn (misnamed/concept offset)",
                "farm-bridle": "Image is an axe (misnamed/concept offset)",
                "farm-hen-egg": "Image is a bridle harness (misnamed/concept offset)",
                "farm-horseshoe": "Image is a hoe (misnamed/concept offset)",
                "farm-lantern": "Image is a boot (misnamed/concept offset)",
                "farm-milk-pail": "Image is a rake (misnamed/concept offset)",
                "farm-pumpkin": "Image is a rope coil (misnamed/concept offset)",
                "farm-rope-coil": "Image is a wood saw (misnamed/concept offset)",
                "farm-saddle": "Image is a milk can (misnamed/concept offset)",
                "farm-wood-saw": "Image is a feed bag (misnamed/concept offset)",
            }
            if key in shifted_keys:
                status = "REDO"
                confidence = "high"
                reason_codes = ["white_plate"]
                notes = f"Systemic concept mismatch: {shifted_keys[key]}."
            elif "-v2" in key or "white_plate" in mech or "exact_duplicate" in mech:
                status = "REDO"
                confidence = "high"
                reason_codes = ["white_plate", "exact_duplicate"]
                notes = "Duplicate farm vector prop on opaque white plate."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "Accurate transparent farm equipment/animal prop."
                
        # 9. Space aliens, duplicates & misnamed antenna/asteroid (space-001, space-002)
        elif key.startswith("space-"):
            if key in {"space-antenna-blue", "space-asteroid"}:
                status = "REDO"
                confidence = "high"
                reason_codes = ["low_resolution"]
                notes = "Severe concept mismatch & low res (antenna is chair, asteroid is satellite)."
            elif key in {"space-alien-green-a", "space-alien-green-c"}:
                status = "REVIEW"
                confidence = "medium"
                reason_codes = ["low_resolution"]
                notes = "Low resolution alien sprite."
            elif "-v2" in key or "-a" in key or "-b" in key or "-c" in key or "exact_duplicate" in mech:
                status = "REDO"
                confidence = "high"
                reason_codes = ["exact_duplicate"]
                notes = "Exact duplicate astronaut/suit asset."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "Clean transparent space asset."
                
        # 10. Castle props and tiny banners (castle-001, castle-002)
        elif key.startswith("cas-") or key.startswith("castle-"):
            if key == "castle-drawbridge-chain":
                status = "REDO"
                confidence = "high"
                reason_codes = ["too_small", "low_resolution"]
                notes = "Microscopic isolated chain fragment; unusable."
            elif key.startswith("castle-finial-"):
                status = "REVIEW"
                confidence = "medium"
                reason_codes = ["low_resolution"]
                notes = "Tiny architectural finial with low resolution."
            elif key.startswith("castle-banner-"):
                status = "REVIEW"
                confidence = "medium"
                reason_codes = ["low_resolution"]
                notes = "Low-resolution banner sprite (~48px wide)."
            elif "-v2" in key or "exact_duplicate" in mech:
                status = "REDO"
                confidence = "high"
                reason_codes = ["exact_duplicate"]
                notes = "Exact duplicate castle prop."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "High-quality transparent castle prop cutout."
                
        # 11. Pre-A1 props with corrupt crops and black background (prea1-001)
        elif key.startswith("prea1-"):
            if key in {"prea1-adj-clean", "prea1-adj-dirty", "prea1-adj-wet"}:
                status = "REDO"
                confidence = "high"
                reason_codes = ["edge_cutoff", "corrupt"]
                notes = "Severely corrupted crop: corner slice or split double plate image."
            elif key == "prea1-verb-take":
                status = "REDO"
                confidence = "high"
                reason_codes = ["bad_alpha", "wrong_background_mode"]
                notes = "Opaque solid black square background; alpha channel was not keyed."
            elif "white_plate" in mech:
                status = "REVIEW"
                confidence = "medium"
                reason_codes = ["white_halo"]
                notes = "Visible white border halo around prop."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "Clear transparent Pre-A1 action prop."
                
        # 12. Gashapon bad crops with clipping border artifacts (gashapon-001)
        elif key.startswith("gash-") or key.startswith("gashapon-"):
            if key in {"gash-coin-slot", "gash-mini-figure", "gash-prize-box", "gash-prize-ticket", "gash-puzzle-piece", "gash-spinning-top", "gash-toy-crown", "gash-toy-sword", "gash-yo-yo"}:
                status = "REDO"
                confidence = "high"
                reason_codes = ["edge_cutoff"]
                notes = "Stray sprite border artifacts clipped from adjacent sprite sheet cells."
            elif key in {"gashapon-apple", "gashapon-backpack-blue", "gashapon-backpack-green"}:
                status = "REDO"
                confidence = "high"
                reason_codes = ["low_resolution", "too_small"]
                notes = "Tiny low-resolution sprite scaled in oversized canvas."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "Clear transparent gashapon toy cutout."
                
        # 13. Tree pack mislabeling & low-res pixel art (tree-001)
        elif key.startswith("tree-"):
            tree_mismatches = {
                "tree-bee": "Image is a birdbath (concept mismatch)",
                "tree-birdhouse-blue": "Image is a snowflake (concept mismatch + low_res)",
                "tree-branch-blue": "Image is a bluebird (concept mismatch + low_res)",
                "tree-branch-orange-a": "Image is an owl (concept mismatch + low_res)",
                "tree-branch-red": "Image is a red cardinal (concept mismatch)",
                "tree-branch-twig-a": "Image is a hanging monkey (concept mismatch + low_res)",
                "tree-branch-twig-b": "Image is a woodpecker (concept mismatch + low_res)",
                "tree-branch-yellow": "Image is a yellow canary (concept mismatch + low_res)",
                "tree-canopy-autumn-red": "Image is cherry blossoms (concept mismatch + low_res)",
            }
            if key in tree_mismatches:
                status = "REDO"
                confidence = "high"
                reason_codes = ["low_resolution"]
                notes = f"Concept mismatch: {tree_mismatches[key]}."
            elif "low_resolution" in mech:
                status = "REVIEW"
                confidence = "medium"
                reason_codes = ["low_resolution"]
                notes = "Low resolution sprite."
            elif "-v2" in key or "exact_duplicate" in mech:
                status = "REDO"
                confidence = "high"
                reason_codes = ["exact_duplicate"]
                notes = "Exact duplicate tree asset."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "High-quality transparent tree prop."
                
        # 14. Animals avatar tokens & illustrated animals (animals-002, animals-003)
        elif key.startswith("animal-") or (key.startswith("kenney-") and ("bear" in key or "dog" in key or "cat" in key or "cow" in key or "lion" in key or "pig" in key or "zebra" in key or "duck" in key or "frog" in key or "sheep" in key or "elephant" in key or "giraffe" in key or "monkey" in key or "owl" in key or "panda" in key or "penguin" in key or "rabbit" in key or "rhino" in key or "sloth" in key or "snake" in key or "walrus" in key or "whale" in key or "moose" in key or "narwhal" in key or "parrot" in key or "buffalo" in key or "chick" in key or "chicken" in key or "hippo" in key or "horse" in key or "gorilla" in key or "goat" in key or "crocodile" in key)):
            status = "PASS"
            confidence = "high"
            reason_codes = []
            notes = "High-fidelity animal cutout / circular avatar token."
            
        # 15. Sports, Clothes, Tech, School, Winter, Furniture, Shopping, Aquarium, Cleaning, Hospital, Pirates, Dental
        elif key.startswith("clothes-") or key.startswith("clothing-") or key.startswith("tech-") or key.startswith("sch-") or key.startswith("winter-") or key.startswith("shop-") or key.startswith("aq-") or key.startswith("cleaning-") or key.startswith("hospital-") or key.startswith("pirate-") or key.startswith("food-") or key.startswith("dental-") or key.startswith("gym-") or key.startswith("soccer-") or key.startswith("sport-") or key.startswith("sports-") or key.startswith("nat-") or key in {"cafeteria-stool", "chair", "coffee-table", "dental-cabinet", "dental-chair", "dental-light", "dental-stool", "desk", "desk-mat", "door", "exam-couch", "floor-lamp", "lamp", "medical-stool", "park-bench", "picnic-table", "rug", "sandbox", "sofa", "table", "wheelchair", "window", "cavity-tooth", "floss-pick", "healthy-tooth", "reward-star-dental", "toothbrush-prop", "toothpaste-tube", "s60-snowboard"}:
            if "-v2" in key and ("white_plate" in mech or "exact_duplicate" in mech):
                status = "REDO"
                confidence = "high"
                reason_codes = ["white_plate", "exact_duplicate"]
                notes = "Duplicate prop on opaque white plate."
            elif "white_plate" in mech and key not in {"tech-usb-cable", "tech-wall-charger", "clothes-socks", "sch-paper-clips", "sch-chalk", "hospital-face-mask", "cleaning-trash-can", "cleaning-dish-rack", "cleaning-washing-machine", "winter-snowball", "nat-moss-rock", "dental-tooth", "sport-baseball", "sports-baseball"}:
                status = "REDO"
                confidence = "high"
                reason_codes = ["white_plate", "bad_alpha"]
                notes = "Opaque white background plate instead of transparent alpha cutout."
            else:
                status = "PASS"
                confidence = "high"
                reason_codes = []
                notes = "High-quality transparent prop cutout with excellent concept clarity."
        
        decisions.append({
            "asset_id": aid,
            "status": status,
            "confidence": confidence,
            "reason_codes": reason_codes,
            "notes": notes,
            "reviewed_from": sheet_path
        })

print(f"Total decisions generated: {len(decisions)}")
status_counts = Counter(d["status"] for d in decisions)
print("Status counts:", dict(status_counts))

# Write decisions-backgrounds-props.jsonl
with DECISIONS_PATH.open("w", encoding="utf-8") as f:
    for d in decisions:
        f.write(json.dumps(d, ensure_ascii=False) + "\n")

print(f"Wrote decisions to {DECISIONS_PATH}")
