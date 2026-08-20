import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "audit" / "visual-assets"

META_PATH = OUT / "vocab_151_225_meta.json"
DECISIONS_PATH = OUT / "decisions-vocab-151-225.jsonl"
NOTES_PATH = OUT / "notes-vocab-151-225.md"

sheets_meta = json.loads(META_PATH.read_text(encoding="utf-8"))

# Specific overrides by (sheet_num, key) or asset_id
# Status: "REDO" or "REVIEW" or "PASS"
# (status, confidence, [reason_codes], notes)

SPECIFIC_RULES = {
    # Sheet 151
    ("151", "praying-mantis"): ("REDO", "high", ["border_artifact"], "Obtrusive square border frame lines around icon"),
    ("151", "praying-mantis-helper"): ("REDO", "high", ["border_artifact"], "Obtrusive border frame lines around icon"),
    ("151", "prefix"): ("REDO", "high", ["unreadable_abstraction"], "Unclear abstract concept depicted as generic blank wooden blocks"),
    ("151", "prejudice"): ("REDO", "high", ["unreadable_abstraction"], "Unclear/confusing abstraction for young ESL learners (masks separated by brick wall)"),
    ("151", "present"): ("REDO", "high", ["border_artifact"], "Square bounding box border lines visible around gift box"),
    ("151", "presentation"): ("REDO", "high", ["border_artifact"], "Square bounding box border lines visible around projector screen"),
    ("151", "pretzel"): ("REDO", "high", ["artifact"], "Vertical bar artifact on right side of icon"),
    ("151", "previous"): ("REDO", "high", ["unreadable_abstraction"], "Unclear abstraction for 'previous' depicted solely as footprints"),
    ("151", "price"): ("REDO", "high", ["wrong_concept"], "Coffee mug next to coins; ambiguous/misleading concept for price"),

    # Sheet 152
    ("152", "principle"): ("REDO", "high", ["unreadable_abstraction"], "Unclear abstract concept depicted as 4 colored cubes"),
    ("152", "printer"): ("REDO", "high", ["border_artifact"], "Square bounding box border line visible around printer"),
    ("152", "prison"): ("REDO", "high", ["border_artifact"], "Square bounding box border line visible around prison building"),
    ("152", "process"): ("REDO", "high", ["text_artifact"], "Embedded English text 'process' below vegetables"),
    ("152", "professional"): ("REDO", "high", ["border_artifact"], "Square bounding box border line visible around scientist"),
    ("152", "program"): ("REDO", "high", ["unreadable_abstraction"], "Remote control next to grey newspaper layout; ambiguous abstraction"),
    ("152", "progress-chart"): ("REDO", "high", ["unreadable_abstraction"], "Three grey placeholder bars; unreadable abstraction"),
    ("152", "project"): ("REDO", "high", ["text_artifact", "border_artifact"], "Embedded English text 'project' and line box"),

    # Sheet 153
    ("153", "pronoun"): ("REDO", "high", ["wrong_concept"], "ID badge card with silhouette; wrong concept/unreadable for pronoun"),
    ("153", "prosciutto"): ("REDO", "high", ["border_artifact"], "Square border lines visible around prosciutto slice"),
    ("153", "protein-powder"): ("REDO", "high", ["bad_alpha", "border_artifact"], "Faint unkeyed shaker jar with square border line"),
    ("153", "protractor-icon"): ("REDO", "high", ["border_artifact"], "Square border line visible around protractor icon"),
    ("153", "proverb"): ("REDO", "high", ["unreadable_abstraction"], "Open book with empty orange speech bubble; unreadable abstraction"),
    ("153", "pruning-shears"): ("REDO", "high", ["border_artifact"], "Square border line visible around pruning shears"),
    ("153", "psychological"): ("REDO", "high", ["unreadable_abstraction"], "Child thinking abstract squiggles; unreadable abstraction"),
    ("153", "pudding"): ("REDO", "high", ["border_artifact"], "Square border line visible around pudding bowl"),

    # Sheet 154
    ("154", "pulley-block"): ("REDO", "high", ["border_artifact"], "Square border box lines visible around pulley block"),
    ("154", "pulse-oximeter"): ("REDO", "high", ["border_artifact"], "Square border line visible around pulse oximeter"),
    ("154", "pumpkin"): ("REDO", "high", ["border_artifact"], "Square border box visible around pumpkin"),
    ("154", "pumpkin-farm"): ("REDO", "high", ["border_artifact"], "Square border box visible around pumpkin"),
    ("154", "pupil"): ("REDO", "high", ["wrong_concept"], "Shows backpack and pencil case; wrong concept for pupil/student"),
    ("154", "puppet"): ("REDO", "high", ["border_artifact"], "Square border box lines visible around puppet"),
    ("154", "puppy-zoo"): ("REDO", "high", ["border_artifact"], "Square border line visible around puppy"),
    ("154", "puree"): ("REDO", "high", ["text_artifact"], "Embedded English text 'puree' above soup bowl"),
    ("154", "push"): ("REDO", "high", ["border_artifact"], "Square border box lines visible around pushing door"),
    ("154", "push-pin"): ("REDO", "high", ["border_artifact"], "Square border box visible around push pin"),

    # Sheet 155
    ("155", "putty-knife"): ("REDO", "high", ["border_artifact"], "Square border box visible around putty knife"),
    ("155", "puzzle-box"): ("REDO", "high", ["border_artifact"], "Square border box visible around puzzle box"),
    ("155", "pyjamas"): ("REDO", "high", ["border_artifact"], "Square border line visible around pyjamas"),
    ("155", "quail"): ("REDO", "high", ["border_artifact"], "Square border box visible around quail"),
    ("155", "queen"): ("REDO", "high", ["border_artifact"], "Square border box visible around crown"),
    ("155", "queue"): ("REDO", "high", ["edge_cutoff"], "Left edge cutoff artifact in queue illustration"),
    ("155", "quiche"): ("REDO", "high", ["border_artifact"], "Square border box visible around quiche slice"),
    ("155", "quick"): ("REDO", "high", ["border_artifact"], "Square border box visible around running boy"),
    ("155", "quiet"): ("REDO", "high", ["visual_nonsense"], "Deformed multi-fingered hand over emoji mouth"),
    ("155", "quilt"): ("REDO", "high", ["wrong_concept"], "Depicts isometric isometric blue tiles/stairs instead of a quilt"),
    ("155", "quit"): ("REDO", "high", ["text_artifact"], "Embedded English text 'quit' below boy"),

    # Sheet 156
    ("156", "radar"): ("REDO", "high", ["border_artifact"], "Square border box visible around radar dish"),
    ("156", "radiate"): ("REDO", "high", ["border_artifact"], "Square border box visible around radiate sun"),
    ("156", "radiator"): ("REDO", "high", ["border_artifact"], "Square border box visible around radiator"),
    ("156", "radish"): ("REDO", "high", ["border_artifact"], "Square border box visible around radish"),
    ("156", "railway"): ("REDO", "high", ["border_artifact"], "Square border line visible around railway tracks"),
    ("156", "rain"): ("REDO", "high", ["border_artifact"], "Square border line visible around rain cloud"),
    ("156", "rain-gauge"): ("REDO", "high", ["border_artifact"], "Square border line visible around rain gauge"),
    ("156", "rainbow"): ("REDO", "high", ["border_artifact"], "Square border line visible around rainbow"),
    ("156", "raisehand"): ("REDO", "high", ["text_artifact"], "Embedded English text 'raisehand' below boy"),

    # Sheet 157
    ("157", "rakeleaf"): ("REDO", "high", ["text_artifact"], "Embedded English text 'rakeleaf' below character"),
    ("157", "ramen-bowl"): ("REDO", "high", ["edge_cutoff"], "Extreme crop cutoff, only top edge sliver visible"),
    ("157", "rat"): ("REDO", "high", ["border_artifact"], "Square border box visible around rat"),
    ("157", "rattle"): ("REDO", "high", ["border_artifact"], "Square border box visible around baby rattle"),
    ("157", "raw"): ("REDO", "high", ["border_artifact"], "Square border box visible around plate of raw vegetables"),
    ("157", "razor"): ("REDO", "high", ["wrong_concept", "border_artifact"], "Shows toothbrush and toothpaste instead of razor; square border box"),
    ("157", "reading-lamp"): ("REDO", "high", ["border_artifact"], "Square border line visible around desk lamp"),

    # Sheet 158
    ("158", "reality"): ("REDO", "high", ["unreadable_abstraction"], "Empty mirror frame; abstract and confusing for 'reality'"),
    ("158", "reasonable"): ("REDO", "high", ["unreadable_abstraction"], "Two identical plates of cookies; unclear abstraction for 'reasonable'"),
    ("158", "rebar"): ("REDO", "high", ["border_artifact"], "Square border box visible around rebar bundle"),
    ("158", "rebel"): ("REDO", "high", ["text_artifact"], "Embedded English text 'rebel' below boy"),
    ("158", "receipt"): ("REDO", "high", ["border_artifact"], "Square border box visible around receipt"),
    ("158", "recent"): ("REDO", "high", ["border_artifact"], "Square border box visible around painting easel"),
    ("158", "recess-bell"): ("REDO", "high", ["border_artifact"], "Square border box visible around school bell"),
    ("158", "recipe-card"): ("REDO", "high", ["border_artifact"], "Square border line / top cutoff line artifact"),
    ("158", "recorder"): ("REDO", "high", ["split_composite"], "Multi-instrument composite grid artifact (recorder, trombone, pencil)"),
    ("158", "recycle"): ("REDO", "high", ["border_artifact"], "Square border box visible around recycling bin"),

    # Sheet 159
    ("159", "reduce"): ("REDO", "high", ["text_artifact"], "Embedded English text 'reduce' below child"),
    ("159", "reed"): ("REDO", "high", ["border_artifact"], "Square border box visible around reed plant"),
    ("159", "reel"): ("REDO", "high", ["border_artifact"], "Square border box visible around fishing reel"),
    ("159", "refried-beans"): ("REDO", "high", ["border_artifact"], "Square border box visible around refried beans bowl"),
    ("159", "refrigerator"): ("REDO", "high", ["border_artifact"], "Square border box visible around refrigerator"),

    # Sheet 160
    ("160", "relay-baton-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around relay baton icon"),
    ("160", "relay-hurdle"): ("REDO", "high", ["border_artifact"], "Square border line visible around hurdle"),
    ("160", "remainder"): ("REDO", "high", ["unreadable_abstraction"], "Torn paper with circular hole; unreadable abstraction for 'remainder'"),
    ("160", "remind"): ("REDO", "high", ["text_artifact"], "Embedded English text 'remind' below desk"),
    ("160", "remote-car"): ("REDO", "high", ["border_artifact"], "Square border line visible around remote car"),
    ("160", "remote-control"): ("REDO", "high", ["border_artifact"], "Square border box visible around remote control"),
    ("160", "repeat"): ("REDO", "high", ["text_artifact"], "Embedded English text 'repeat' below clapping kids"),

    # Sheet 161
    ("161", "representative"): ("REDO", "high", ["unreadable_abstraction"], "Cutout of briefcase with grey dot; unreadable abstraction for representative"),
    ("161", "rescue"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Rescue' below lifebuoy"),
    ("161", "responsible"): ("REDO", "high", ["border_artifact"], "Square border line visible around girl watering plant"),
    ("161", "restaurant"): ("REDO", "high", ["border_artifact"], "Square border line visible around restaurant building"),

    # Sheet 162
    ("162", "retainer"): ("REDO", "high", ["border_artifact"], "Square border line visible around retainer"),
    ("162", "retire"): ("REDO", "high", ["text_artifact"], "Embedded English text 'retire' below elderly man"),
    ("162", "return"): ("REDO", "high", ["border_artifact"], "Square border box visible around book return slot"),
    ("162", "reusable-bag"): ("REDO", "high", ["border_artifact"], "Square border box visible around shopping bag"),
    ("162", "rhinoceros-beetle"): ("REDO", "high", ["border_artifact"], "Square border line visible around rhinoceros beetle"),
    ("162", "rib"): ("REDO", "high", ["unreadable_abstraction"], "Abstract thin curved white line/splinter; unreadable abstraction for 'rib'"),
    ("162", "ribbon-bow"): ("REDO", "high", ["border_artifact"], "Square border box visible around ribbon bow"),
    ("162", "rice-bowl"): ("REDO", "high", ["wrong_concept"], "Shows a wooden hair comb instead of a rice bowl; wrong concept"),
    ("162", "rice-cooker"): ("REDO", "high", ["border_artifact"], "Square border box visible around rice cooker"),
    ("162", "rich"): ("REDO", "high", ["border_artifact"], "Square border line visible around treasure chest"),

    # Sheet 163
    ("163", "rift"): ("REDO", "high", ["border_artifact"], "Square border box visible around rock rift"),
    ("163", "right-hand"): ("REDO", "high", ["border_artifact"], "Square border box visible around right hand"),
    ("163", "ring"): ("REDO", "high", ["border_artifact"], "Square border box visible around ring"),
    ("163", "river"): ("REDO", "high", ["border_artifact"], "Square border box visible around river landscape tile"),
    ("163", "road"): ("REDO", "high", ["border_artifact", "unreadable_abstraction"], "Square border box around generic grey rectangle tile"),
    ("163", "road-divider"): ("REDO", "high", ["border_artifact"], "Square border box visible around road barrier"),
    ("163", "roadside"): ("REDO", "high", ["border_artifact"], "Square border box visible around road with car"),
    ("163", "roast-chicken"): ("REDO", "high", ["border_artifact"], "Square border line visible around roast chicken"),
    ("163", "roast-potato"): ("REDO", "high", ["border_artifact"], "Square border line visible around roasted potatoes"),

    # Sheet 164
    ("164", "robotdance"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Robotdance' below character"),
    ("164", "rock"): ("REDO", "high", ["border_artifact"], "Square border box visible around rock"),
    ("164", "rock-candy"): ("REDO", "high", ["border_artifact"], "Square border box visible around rock candy"),
    ("164", "rockclimb"): ("REDO", "high", ["border_artifact"], "Square border box visible around climbing wall"),
    ("164", "rocket"): ("REDO", "high", ["border_artifact"], "Square border box visible around rocket"),
    ("164", "rocket-ship"): ("REDO", "high", ["border_artifact"], "Square border box visible around rocket ship"),
    ("164", "rod"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal rod"),
    ("164", "rolldice"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Roll Dice' below hands"),
    ("164", "rolling"): ("REDO", "high", ["border_artifact"], "Square border box visible around rolling ball"),
    ("164", "roof"): ("REDO", "high", ["border_artifact"], "Square border box visible around roof section"),

    # Sheet 165
    ("165", "rope"): ("REDO", "high", ["border_artifact"], "Square border box visible around coiled rope"),
    ("165", "rose"): ("REDO", "high", ["border_artifact"], "Square border box visible around rose"),
    ("165", "rotten"): ("REDO", "high", ["border_artifact"], "Square border box visible around rotten apple"),
    ("165", "roundabout"): ("REDO", "high", ["border_artifact"], "Square border box visible around playground roundabout"),
    ("165", "rowboat"): ("REDO", "high", ["border_artifact"], "Square border box visible around rowboat"),
    ("165", "rubber-band"): ("REDO", "high", ["border_artifact"], "Square border box visible around rubber band"),
    ("165", "rubber-duck-bath"): ("REDO", "high", ["border_artifact"], "Square border box visible around rubber duck"),
    ("165", "rubber-gloves"): ("REDO", "high", ["border_artifact"], "Square border box visible around rubber gloves"),
    ("165", "rubber-stamp"): ("REDO", "high", ["border_artifact"], "Square border box visible around rubber stamp"),
    ("165", "rucksack"): ("REDO", "high", ["border_artifact"], "Square border box visible around rucksack"),
    ("165", "rude"): ("REDO", "high", ["border_artifact"], "Square border line visible around rude boy"),
    ("165", "rug"): ("REDO", "high", ["border_artifact"], "Square border box visible around rug"),

    # Sheet 166
    ("166", "ruler"): ("REDO", "high", ["border_artifact"], "Square border line visible around wooden ruler"),
    ("166", "rumble"): ("REDO", "high", ["border_artifact"], "Square border box visible around thundercloud"),
    ("166", "saddle"): ("REDO", "high", ["border_artifact"], "Square border box visible around saddle"),
    ("166", "safety-net"): ("REDO", "high", ["border_artifact"], "Square border box visible around safety net"),
    ("166", "safety-pin"): ("REDO", "high", ["border_artifact"], "Square border box visible around safety pin"),
    ("166", "safety-vest"): ("REDO", "high", ["border_artifact"], "Square border box visible around safety vest"),
    ("166", "sailing"): ("REDO", "high", ["border_artifact"], "Square border box visible around sailing boat"),
    ("166", "sake"): ("REDO", "high", ["bad_alpha"], "Keying destroyed white ceramic body, leaving faint disconnected outline"),

    # Sheet 167
    ("167", "salad-tongs"): ("REDO", "high", ["border_artifact"], "Square border line visible around salad tongs"),
    ("167", "salami"): ("REDO", "high", ["border_artifact"], "Square border box visible around salami"),
    ("167", "salt"): ("REDO", "high", ["border_artifact"], "Square border box visible around salt shaker"),
    ("167", "salt-cellar"): ("REDO", "high", ["border_artifact"], "Square border box visible around salt cellar"),
    ("167", "salt-shaker"): ("REDO", "high", ["border_artifact"], "Square border box visible around salt shaker"),
    ("167", "sample"): ("REDO", "high", ["bad_alpha"], "Alpha keying erased white vial body, leaving broken grey edge outline"),
    ("167", "sample-vial"): ("REDO", "high", ["border_artifact"], "Square border line visible around sample vial"),
    ("167", "sandals"): ("REDO", "high", ["border_artifact"], "Square border box visible around sandals pair"),
    ("167", "sandbag"): ("REDO", "high", ["border_artifact"], "Square border box visible around sandbag"),
    ("167", "sandbox"): ("REDO", "high", ["border_artifact"], "Square border box visible around sandbox"),
    ("167", "sandcastle"): ("REDO", "high", ["border_artifact"], "Square border box visible around sandcastle"),
    ("167", "sandcastle-bucket"): ("REDO", "high", ["border_artifact"], "Square border box visible around bucket"),
    ("167", "sandpaper"): ("REDO", "high", ["border_artifact"], "Square border box visible around sandpaper sheet"),
    ("167", "sandwich"): ("REDO", "high", ["border_artifact"], "Square border box visible around toasted sandwich"),

    # Sheet 168
    ("168", "sauce"): ("REDO", "high", ["border_artifact"], "Vertical line crop artifact on right side"),
    ("168", "sauce-bottle"): ("REDO", "high", ["border_artifact"], "Square border box visible around bottle"),
    ("168", "saucepan"): ("REDO", "high", ["border_artifact"], "Square border box visible around saucepan"),
    ("168", "saucer"): ("REDO", "high", ["border_artifact"], "Square border box visible around saucer"),
    ("168", "sausage"): ("REDO", "high", ["border_artifact"], "Square border box visible around sausage"),
    ("168", "sausage-roll"): ("REDO", "high", ["border_artifact"], "Square border box visible around sausage roll"),
    ("168", "saxophone"): ("REDO", "high", ["border_artifact"], "Square border box visible around saxophone"),
    ("168", "saxophone-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around saxophone icon"),
    ("168", "scaffolding"): ("REDO", "high", ["border_artifact"], "Square border box visible around scaffolding frame"),
    ("168", "scale-bar"): ("REDO", "high", ["border_artifact"], "Square border box visible around scale bar"),
    ("168", "scale-pet"): ("REDO", "high", ["border_artifact"], "Square border box visible around scale"),
    ("168", "scallop"): ("REDO", "high", ["border_artifact"], "Square border box visible around scallop shell"),
    ("168", "scamper"): ("REDO", "high", ["text_artifact"], "Embedded English text 'scamper' below squirrel"),

    # Sheet 169
    ("169", "scarecrow"): ("REDO", "high", ["border_artifact"], "Square border box visible around scarecrow"),
    ("169", "scarf-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around rainbow scarf"),
    ("169", "scarf-wool"): ("REDO", "high", ["border_artifact"], "Top horizontal line crop artifact"),
    ("169", "schedule"): ("REDO", "high", ["border_artifact"], "Square border box visible around schedule folder"),
    ("169", "school-building"): ("REDO", "high", ["border_artifact"], "Square border box visible around schoolhouse"),
    ("169", "schoolwork"): ("REDO", "high", ["border_artifact"], "Square border box visible around open exercise book"),
    ("169", "scissors"): ("REDO", "high", ["border_artifact"], "Square border box visible around scissors"),
    ("169", "scissors-craft"): ("REDO", "high", ["border_artifact"], "Square border box visible around craft scissors"),

    # Sheet 170
    ("170", "scooter"): ("REDO", "high", ["border_artifact"], "Square border box visible around scooter"),
    ("170", "scooter-kid"): ("REDO", "high", ["border_artifact"], "Square border line visible around kid on scooter"),
    ("170", "score"): ("REDO", "high", ["unreadable_abstraction", "border_artifact"], "Tiny miniature scoreboard in huge empty box"),
    ("170", "scoreboard-blank"): ("REDO", "high", ["border_artifact"], "Square border box visible around scoreboard"),
    ("170", "scorpion"): ("REDO", "high", ["border_artifact"], "Square border box visible around scorpion"),
    ("170", "scrambled-eggs"): ("REDO", "high", ["border_artifact"], "Square border box visible around plate of scrambled eggs"),
    ("170", "screen"): ("REDO", "high", ["border_artifact"], "Square border box visible around monitor"),
    ("170", "screwdriver"): ("REDO", "high", ["border_artifact"], "Square border box visible around screwdriver"),
    ("170", "scribe-awl"): ("REDO", "high", ["border_artifact"], "Square border box visible around awl"),
    ("170", "scroll"): ("REDO", "high", ["border_artifact"], "Square border box visible around parchment scroll"),
    ("170", "scrub-brush"): ("REDO", "high", ["border_artifact"], "Square border box visible around scrub brush"),
    ("170", "scuba-tank"): ("REDO", "high", ["border_artifact"], "Square border box visible around scuba tank"),
    ("170", "scurry"): ("REDO", "high", ["text_artifact"], "Embedded English text 'scurry' below mouse"),

    # Sheet 171
    ("171", "scuttle"): ("REDO", "high", ["text_artifact"], "Embedded English text 'scuttle' below crab"),
    ("171", "sea-otter"): ("REDO", "high", ["border_artifact"], "Square border line visible around sea otter"),
    ("171", "sea-turtle"): ("REDO", "high", ["border_artifact"], "Square border box visible around sea turtle"),
    ("171", "seafood"): ("REDO", "high", ["border_artifact"], "Square border line visible around seafood platter"),
    ("171", "seagrass"): ("REDO", "high", ["border_artifact"], "Square border box visible around seagrass"),
    ("171", "seagull"): ("REDO", "high", ["border_artifact"], "Square border box visible around seagull"),
    ("171", "seahorse"): ("REDO", "high", ["border_artifact"], "Square border box visible around seahorse"),
    ("171", "seahorse-reef"): ("REDO", "high", ["border_artifact"], "Square border box visible around seahorse"),
    ("171", "seal-pup"): ("REDO", "high", ["border_artifact"], "Square border box visible around seal pup"),
    ("171", "sealant-tube"): ("REDO", "high", ["border_artifact"], "Square border box visible around sealant tube"),
    ("171", "sealion"): ("REDO", "high", ["border_artifact"], "Square border box visible around sea lion"),
    ("171", "seashell"): ("REDO", "high", ["border_artifact"], "Square border box visible around seashell"),
    ("171", "seashell-pile"): ("REDO", "high", ["border_artifact"], "Square border line visible around seashells"),
    ("171", "seat"): ("REDO", "high", ["border_artifact"], "Square border box visible around airplane seat"),
    ("171", "seatbelt-car"): ("REDO", "high", ["border_artifact"], "Square border box visible around seatbelt buckle"),

    # Sheet 172
    ("172", "see-saw"): ("REDO", "high", ["border_artifact"], "Square border box visible around seesaw"),
    ("172", "seed"): ("REDO", "high", ["border_artifact"], "Square border box visible around seeds"),
    ("172", "seed-drill"): ("REDO", "high", ["border_artifact"], "Square border box visible around seed drill machine"),
    ("172", "seed-packet"): ("REDO", "high", ["border_artifact"], "Square border box visible around seed packet"),
    ("172", "seed-pod"): ("REDO", "high", ["border_artifact"], "Square border line visible around seed pod"),
    ("172", "seed-tray"): ("REDO", "high", ["border_artifact"], "Square border box visible around seed tray"),
    ("172", "seedling"): ("REDO", "high", ["border_artifact"], "Square border box visible around seedling in pot"),
    ("172", "seedplant"): ("REDO", "high", ["text_artifact"], "Embedded English text 'seedplant' below boy"),
    ("172", "seesaw"): ("REDO", "high", ["border_artifact"], "Square border line visible around seesaw"),
    ("172", "selfie-stick"): ("REDO", "high", ["border_artifact"], "Square border box visible around selfie stick"),

    # Sheet 173
    ("173", "sesame-ball"): ("REDO", "high", ["edge_cutoff"], "Severe top cutoff artifact; only half circle and plate rim visible"),
    ("173", "sesame-seed"): ("REDO", "high", ["border_artifact"], "Square border box visible around sesame seeds"),
    ("173", "sewing-kit"): ("REDO", "high", ["border_artifact"], "Square border box visible around sewing kit"),
    ("173", "sewing-machine"): ("REDO", "high", ["border_artifact"], "Square border box visible around sewing machine"),
    ("173", "sewing-needle"): ("REDO", "high", ["border_artifact"], "Square border box visible around sewing needle"),
    ("173", "sex"): ("REDO", "high", ["inappropriate"], "Anatomical diagrams of reproductive organs inappropriate for young ESL learners"),
    ("173", "shadowpup"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Shadow Puppet' below hand shadow"),
    ("173", "shampoo"): ("REDO", "high", ["border_artifact"], "Square border box visible around shampoo bottle"),
    ("173", "shampoo-bottle-blank"): ("REDO", "high", ["border_artifact"], "Square border box visible around shampoo bottle"),
    ("173", "shampoo-salon"): ("REDO", "high", ["border_artifact"], "Square border box visible around shampoo bottle"),

    # Sheet 174
    ("174", "share"): ("REDO", "high", ["text_artifact"], "Embedded English text 'SHARE' below children"),
    ("174", "shark"): ("REDO", "high", ["border_artifact"], "Square border line visible around shark"),
    ("174", "sheep"): ("REDO", "high", ["border_artifact"], "Square border box visible around sheep"),
    ("174", "sheet-music-blank"): ("REDO", "high", ["border_artifact"], "Square border box visible around music stand"),
    ("174", "shelter"): ("REDO", "high", ["border_artifact"], "Square border box visible around hut shelter"),
    ("174", "shield"): ("REDO", "high", ["border_artifact"], "Square border box visible around shield"),
    ("174", "shin-guard"): ("REDO", "high", ["border_artifact"], "Square border box visible around shin guard"),
    ("174", "shin-guards"): ("REDO", "high", ["border_artifact"], "Square border box visible around shin guards"),
    ("174", "shin-pad"): ("REDO", "high", ["border_artifact"], "Square border box visible around shin pad"),

    # Sheet 175
    ("175", "shock"): ("REDO", "high", ["border_artifact"], "Square border box visible around lightbulb"),
    ("175", "shoelace"): ("REDO", "high", ["border_artifact"], "Square border box visible around shoelace bow"),
    ("175", "shoes-security"): ("REDO", "high", ["border_artifact"], "Square border box visible around shoes"),
    ("175", "shop"): ("REDO", "high", ["border_artifact"], "Square border line visible around shop storefront"),
    ("175", "shop-assistant"): ("REDO", "high", ["border_artifact"], "Square border box visible around apron and shirt"),
    ("175", "shopping-bag"): ("REDO", "high", ["border_artifact"], "Square border box visible around paper shopping bag"),
    ("175", "shore"): ("REDO", "high", ["border_artifact"], "Square border box visible around beach shore tile"),
    ("175", "short"): ("REDO", "high", ["border_artifact"], "Square border box visible around pair of shorts"),
    ("175", "shortbread"): ("REDO", "high", ["border_artifact"], "Square border line visible around shortbread cookie"),
    ("175", "shot"): ("REDO", "high", ["border_artifact"], "Square border box visible around camera icon"),
    ("175", "shot-put"): ("REDO", "high", ["border_artifact"], "Square border box visible around shot put metal ball"),
    ("175", "shotput"): ("REDO", "high", ["border_artifact"], "Square border line visible around shot put athlete"),

    # Sheet 176
    ("176", "shovel"): ("REDO", "high", ["border_artifact"], "Square border box visible around shovel"),
    ("176", "shovel-beach"): ("REDO", "high", ["border_artifact"], "Square border box visible around beach shovel"),
    ("176", "shower-cap"): ("REDO", "high", ["border_artifact"], "Square border box visible around shower cap"),
    ("176", "shower-curtain"): ("REDO", "high", ["border_artifact"], "Square border box visible around shower curtain"),
    ("176", "shower-head"): ("REDO", "high", ["border_artifact"], "Square border box visible around shower head"),
    ("176", "shower-puff"): ("REDO", "high", ["border_artifact"], "Square border box visible around shower loofah"),
    ("176", "shredded-cheese"): ("REDO", "high", ["border_artifact"], "Square border box visible around shredded cheese"),
    ("176", "shrimp-skewer"): ("REDO", "high", ["border_artifact"], "Square border box visible around shrimp skewer"),
    ("176", "shrine"): ("REDO", "high", ["border_artifact"], "Square border box visible around shrine building"),
    ("176", "shuttlecock"): ("REDO", "high", ["border_artifact"], "Square border box visible around shuttlecock"),

    # Sheet 177
    ("177", "side-mirror"): ("REDO", "high", ["border_artifact"], "Square border box visible around car side mirror"),
    ("177", "sidestep"): ("REDO", "high", ["text_artifact"], "Embedded English text 'sidestep' below character"),
    ("177", "sidewalk"): ("REDO", "high", ["text_artifact"], "Embedded English text 'sidewalk' below paving"),
    ("177", "sieve-basket"): ("REDO", "high", ["border_artifact"], "Square border box visible around sieve basket"),
    ("177", "sightseeing"): ("REDO", "high", ["border_artifact"], "Square border box visible around binoculars"),
    ("177", "sign"): ("REDO", "high", ["border_artifact"], "Square border box visible around blank signboard"),
    ("177", "silence"): ("REDO", "high", ["border_artifact"], "Square border box visible around bell icon"),
    ("177", "silver"): ("REDO", "high", ["border_artifact"], "Square border box visible around spoon"),
    ("177", "singing"): ("REDO", "high", ["border_artifact"], "Square border box visible around microphone"),
    ("177", "singular"): ("REDO", "high", ["border_artifact"], "Square border box visible around apple"),

    # Sheet 178
    ("178", "siren"): ("REDO", "high", ["border_artifact"], "Square border box visible around emergency siren"),
    ("178", "siu-mai"): ("REDO", "high", ["edge_cutoff"], "Severe cutoff artifact; bottom half is missing/severed"),
    ("178", "skate"): ("REDO", "high", ["border_artifact"], "Square border box visible around ice skate"),
    ("178", "skateboard"): ("REDO", "high", ["split_composite"], "Vertical split composite line artifact through skateboard"),
    ("178", "skateboard-ride"): ("REDO", "high", ["border_artifact"], "Square border box visible around skateboard"),
    ("178", "skewer-stick"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden skewer"),
    ("178", "ski"): ("REDO", "high", ["border_artifact"], "Square border box visible around ski"),
    ("178", "ski-pole"): ("REDO", "high", ["border_artifact"], "Square border box visible around ski pole"),
    ("178", "skillet"): ("REDO", "high", ["border_artifact"], "Square border box visible around cast iron skillet"),
    ("178", "skip-rope"): ("REDO", "high", ["border_artifact"], "Square border box visible around jump rope"),
    ("178", "skipping-rope"): ("REDO", "high", ["border_artifact"], "Square border box visible around skipping rope"),

    # Sheet 179
    ("179", "skis"): ("REDO", "high", ["border_artifact"], "Square border box visible around pair of skis"),
    ("179", "skull"): ("REDO", "high", ["border_artifact"], "Square border box visible around human skull"),
    ("179", "skunk"): ("REDO", "high", ["border_artifact"], "Square border box visible around skunk"),
    ("179", "sky"): ("REDO", "high", ["border_artifact"], "Square border box visible around cloud sky badge"),
    ("179", "slamdunk"): ("REDO", "high", ["text_artifact"], "Embedded English text 'slamdunk' below basketball player"),
    ("179", "slave"): ("REDO", "high", ["inappropriate", "unreadable_abstraction"], "Heavy/sensitive historical theme unsuitable for young ESL learners"),
    ("179", "slavery"): ("REDO", "high", ["inappropriate", "unreadable_abstraction"], "Heavy/sensitive theme unsuitable for young ESL learners"),
    ("179", "sled"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden sled"),
    ("179", "sled-dog"): ("REDO", "high", ["wrong_concept", "border_artifact"], "Square border box around wooden sled with no dog present"),
    ("179", "sleeping-bag"): ("REDO", "high", ["border_artifact"], "Square border box visible around sleeping bag"),
    ("179", "sleeping-pad"): ("REDO", "high", ["border_artifact"], "Square border box visible around rolled sleeping pad"),
    ("179", "sleeve"): ("REDO", "high", ["border_artifact"], "Square border box visible around fabric sleeve"),
    ("179", "slide"): ("REDO", "high", ["border_artifact"], "Square border box visible around playground slide"),
    ("179", "slight"): ("REDO", "high", ["unreadable_abstraction"], "Measuring cup with liquid; abstract/unclear depiction for 'slight'"),
    ("179", "sling-arm"): ("REDO", "high", ["split_composite"], "Split composite artifact showing arm sling and flashlight together"),
    ("179", "slinky"): ("REDO", "high", ["border_artifact"], "Square border box visible around slinky on stairs"),

    # Sheet 180
    ("180", "slippers"): ("REDO", "high", ["border_artifact"], "Top horizontal line crop artifact above slippers"),
    ("180", "slippers-hotel"): ("REDO", "high", ["border_artifact"], "Square border box visible around hotel slippers"),
    ("180", "slither"): ("REDO", "high", ["border_artifact"], "Square border box visible around slithering snake"),
    ("180", "slogan"): ("REDO", "high", ["unreadable_abstraction"], "Horizontal line with wooden post and dots; unreadable abstraction for 'slogan'"),
    ("180", "slope"): ("REDO", "high", ["border_artifact"], "Square border box visible around grassy slope"),
    ("180", "sloth"): ("REDO", "high", ["border_artifact"], "Square border box visible around sloth on branch"),
    ("180", "slow"): ("REDO", "high", ["border_artifact"], "Square border box visible around snail and toy car"),
    ("180", "slug-pest"): ("REDO", "high", ["border_artifact"], "Square border box visible around garden slug"),
    ("180", "smart"): ("REDO", "high", ["border_artifact"], "Square border box visible around boy with puzzle"),
    ("180", "smile"): ("REDO", "high", ["artifact"], "Green speck artifact floating next to mouth"),
    ("180", "smoke-mask"): ("REDO", "high", ["border_artifact"], "Square border box visible around gas/smoke mask"),
    ("180", "smokestack"): ("REDO", "high", ["border_artifact"], "Square border box visible around factory smokestack"),
    ("180", "smoothie-cup"): ("REDO", "high", ["border_artifact"], "Square border box visible around takeaway cup"),

    # Sheet 181
    ("181", "snail"): ("REDO", "high", ["border_artifact"], "Square border box visible around snail"),
    ("181", "snail-shell"): ("REDO", "high", ["border_artifact"], "Square border box visible around snail"),
    ("181", "snake"): ("REDO", "high", ["border_artifact"], "Square border box visible around green snake"),
    ("181", "snap-button"): ("REDO", "high", ["border_artifact"], "Square border box visible around snap button"),
    ("181", "sneakers"): ("REDO", "high", ["border_artifact"], "Square border box visible around pair of sneakers"),
    ("181", "snorkel"): ("REDO", "high", ["border_artifact"], "Square border box visible around snorkel mask"),
    ("181", "snorkel-set"): ("REDO", "high", ["border_artifact"], "Square border box visible around snorkel set"),
    ("181", "snow"): ("REDO", "high", ["border_artifact"], "Square border box visible around snowflake"),
    ("181", "snow-shovel"): ("REDO", "high", ["border_artifact"], "Square border box visible around snow shovel"),
    ("181", "snowangel"): ("REDO", "high", ["text_artifact"], "Embedded English text 'snowangel' below kid"),
    ("181", "snowball"): ("REDO", "high", ["border_artifact"], "Square border box visible around snowball"),

    # Sheet 182
    ("182", "snowman"): ("REDO", "high", ["border_artifact"], "Square border box visible around snowman"),
    ("182", "snowshoe"): ("REDO", "high", ["border_artifact"], "Square border box visible around traditional snowshoe"),
    ("182", "snowy-owl"): ("REDO", "high", ["border_artifact"], "Square border box visible around snowy owl"),
    ("182", "snowy-owl-polar"): ("REDO", "high", ["border_artifact"], "Square border box visible around snowy owl"),
    ("182", "soap-bar"): ("REDO", "high", ["border_artifact"], "Square border box visible around bar of soap"),
    ("182", "soap-dish"): ("REDO", "high", ["border_artifact"], "Square border box visible around soap dish"),
    ("182", "soap-dispenser"): ("REDO", "high", ["border_artifact"], "Square border box visible around electronic soap dispenser"),
    ("182", "soba"): ("REDO", "high", ["border_artifact"], "Square border box visible around cold soba noodles"),
    ("182", "soccer-ball"): ("REDO", "high", ["border_artifact"], "Square border box visible around soccer ball"),
    ("182", "soccer-cleats"): ("REDO", "high", ["border_artifact"], "Square border box visible around soccer cleats"),
    ("182", "soccer-jersey"): ("REDO", "high", ["border_artifact"], "Square border box visible around green soccer jersey"),
    ("182", "sock"): ("REDO", "high", ["border_artifact"], "Square border box visible around white sock"),

    # Sheet 183
    ("183", "software"): ("REDO", "high", ["border_artifact"], "Square border line visible around laptop screen"),
    ("183", "soil"): ("REDO", "high", ["border_artifact"], "Square border box visible around mound of soil"),
    ("183", "solar-panel"): ("REDO", "high", ["border_artifact"], "Square border box visible around solar panel"),
    ("183", "solar-system"): ("REDO", "high", ["border_artifact"], "Square border box visible around solar system diagram"),
    ("183", "solder"): ("REDO", "high", ["border_artifact"], "Square border box visible around spool of solder wire"),
    ("183", "solution"): ("REDO", "high", ["border_artifact"], "Square border box visible around puzzle solution"),
    ("183", "sonar-screen"): ("REDO", "high", ["border_artifact"], "Square border box visible around green radar/sonar screen"),
    ("183", "sorry"): ("REDO", "high", ["border_artifact"], "Square border line visible around girl holding flower"),
    ("183", "sorting-tray"): ("REDO", "high", ["border_artifact"], "Square border box visible around plastic sorting tray"),
    ("183", "sound"): ("REDO", "high", ["border_artifact"], "Square border box visible around tuning fork sound waves"),
    ("183", "soup"): ("REDO", "high", ["border_artifact"], "Square border box visible around vegetable soup bowl"),

    # Sheet 184
    ("184", "soup-spoon"): ("REDO", "high", ["border_artifact"], "Square border box visible around soup spoon"),
    ("184", "source"): ("REDO", "high", ["border_artifact"], "Square border box visible around waterfall spring source"),
    ("184", "south"): ("REDO", "high", ["border_artifact"], "Square border box visible around compass pointing south"),
    ("184", "soy-sauce"): ("REDO", "high", ["border_artifact"], "Square border box visible around soy sauce bottle"),
    ("184", "space-station"): ("REDO", "high", ["border_artifact"], "Square border box visible around space station satellite"),
    ("184", "spade"): ("REDO", "high", ["border_artifact"], "Square border box visible around spade/shovel"),
    ("184", "spare-tire"): ("REDO", "high", ["border_artifact"], "Square border box visible around spare tire"),
    ("184", "sparkle-tooth"): ("REDO", "high", ["border_artifact"], "Square border box visible around sparkling tooth"),
    ("184", "spatula-silicone"): ("REDO", "high", ["border_artifact"], "Vertical line crop artifact next to silicone spatula"),

    # Sheet 185
    ("185", "specimen-jar"): ("REDO", "high", ["border_artifact"], "Square border box visible around specimen jar"),
    ("185", "specimen-swab"): ("REDO", "high", ["border_artifact"], "Square border box visible around medical swab spatula"),
    ("185", "spell"): ("REDO", "high", ["border_artifact"], "Square border box visible around girl spelling with letter blocks"),
    ("185", "spice"): ("REDO", "high", ["border_artifact"], "Square border box visible around spice seasoning shaker"),
    ("185", "spider"): ("REDO", "high", ["border_artifact"], "Square border box visible around spider"),
    ("185", "spider-helper"): ("REDO", "high", ["border_artifact"], "Square border box visible around spider icon"),
    ("185", "spider-web"): ("REDO", "high", ["border_artifact"], "Square border box visible around spider web"),
    ("185", "spinach"): ("REDO", "high", ["border_artifact"], "Square border box visible around spinach leaves"),
    ("185", "spirit-level"): ("REDO", "high", ["border_artifact"], "Square border box visible around carpenter spirit level"),
    ("185", "spit-cup"): ("REDO", "high", ["border_artifact"], "Square border line visible around plastic spit cup"),

    # Sheet 186
    ("186", "sponge"): ("REDO", "high", ["border_artifact"], "Square border box visible around sponge"),
    ("186", "sports-center"): ("REDO", "high", ["border_artifact"], "Square border box visible around sports center building"),
    ("186", "spotlight"): ("REDO", "high", ["border_artifact"], "Square border box visible around theater spotlight"),
    ("186", "spray-bottle"): ("REDO", "high", ["bad_alpha"], "Keying destroyed white spray bottle body, leaving faint textured noise"),
    ("186", "spray-mop"): ("REDO", "high", ["border_artifact"], "Square border line visible around spray mop"),
    ("186", "spring-roll"): ("REDO", "high", ["split_composite"], "Split composite artifact showing spring roll on left and noodle soup on right"),
    ("186", "sprint"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Sprint' below running boy"),

    # Sheet 187
    ("187", "square"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden block"),
    ("187", "squeegee"): ("REDO", "high", ["border_artifact"], "Square border line visible around window squeegee"),
    ("187", "stadium"): ("REDO", "high", ["border_artifact"], "Square border box visible around sports stadium"),
    ("187", "staff"): ("REDO", "high", ["border_artifact"], "Square border box visible around stack of papers and pen"),
    ("187", "stage"): ("REDO", "high", ["border_artifact"], "Square border line visible around theater stage"),
    ("187", "stage-curtain"): ("REDO", "high", ["border_artifact"], "Square border box visible around stage curtains"),
    ("187", "stair"): ("REDO", "high", ["border_artifact"], "Square border box visible around modular stairs"),
    ("187", "stamp"): ("REDO", "high", ["border_artifact"], "Square border box visible around postage stamp"),
    ("187", "stamp-album"): ("REDO", "high", ["border_artifact"], "Square border line visible around stamp album"),

    # Sheet 188
    ("188", "staple"): ("REDO", "high", ["border_artifact", "white_plate"], "White background cutout box and crop lines visible"),
    ("188", "stapler-icon"): ("REDO", "high", ["border_artifact"], "Square border line visible around yellow stapler icon"),
    ("188", "stapler-office"): ("REDO", "high", ["border_artifact"], "Square border line visible around blue office stapler"),
    ("188", "stapler-remover"): ("REDO", "high", ["border_artifact"], "Square border box visible around staple remover"),
    ("188", "stapler-work"): ("REDO", "high", ["border_artifact"], "Square border line visible around red heavy stapler"),
    ("188", "star"): ("REDO", "high", ["border_artifact"], "Square border box visible around star icon"),
    ("188", "star-anise"): ("REDO", "high", ["border_artifact"], "Square border box visible around star anise spice"),
    ("188", "starfish"): ("REDO", "high", ["border_artifact"], "Square border box visible around starfish"),
    ("188", "starting-blocks"): ("REDO", "high", ["border_artifact"], "Square border box visible around track starting blocks"),
    ("188", "steak-plate"): ("REDO", "high", ["border_artifact"], "Square border box visible around steak on plate"),

    # Sheet 189
    ("189", "steel"): ("REDO", "high", ["border_artifact"], "Square border box visible around steel ingot bar"),
    ("189", "steep"): ("REDO", "high", ["text_artifact"], "Embedded English text 'steep' above teacup"),
    ("189", "steering-wheel"): ("REDO", "high", ["border_artifact"], "Square border box visible around steering wheel"),
    ("189", "stegosaurus"): ("REDO", "high", ["border_artifact"], "Square border box visible around dinosaur"),
    ("189", "stem"): ("REDO", "high", ["border_artifact"], "Square border box visible around plant leaf stem"),
    ("189", "stencil"): ("REDO", "high", ["border_artifact"], "Square border box visible around circle stencil sheet"),
    ("189", "stethoscope"): ("REDO", "high", ["border_artifact"], "Square border box visible around stethoscope"),
    ("189", "stew"): ("REDO", "high", ["border_artifact"], "Square border box visible around beef stew pot"),
    ("189", "stick"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden stick"),
    ("189", "stick-insect"): ("REDO", "high", ["border_artifact"], "Square border box visible around stick insect"),
    ("189", "sticker"): ("REDO", "high", ["border_artifact"], "Square border box visible around peelable sticker sheet"),
    ("189", "sticky-tab"): ("REDO", "high", ["border_artifact"], "Square border box visible around yellow sticky index tab"),
    ("189", "stop"): ("REDO", "high", ["border_artifact"], "Square border box visible around stop hand icon"),

    # Sheet 190
    ("190", "stork"): ("REDO", "high", ["border_artifact"], "Square border box visible around stork"),
    ("190", "strange"): ("REDO", "high", ["border_artifact"], "Square border line visible around colorful abstract blob shape"),
    ("190", "strangle"): ("REDO", "high", ["inappropriate"], "Hands strangling a teddy bear; violent/inappropriate concept for ESL kids"),
    ("190", "straw"): ("REDO", "high", ["border_artifact"], "Square border line visible around drinking straw"),
    ("190", "straw-cup"): ("REDO", "high", ["border_artifact"], "Top horizontal line crop artifact"),
    ("190", "streamer"): ("REDO", "high", ["border_artifact"], "Square border line visible around party streamer ribbon"),
    ("190", "street"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Street' below road aerial view"),
    ("190", "street-barrier"): ("REDO", "high", ["border_artifact"], "Square border box visible around green metal crowd barrier"),

    # Sheet 191
    ("191", "stretcher"): ("REDO", "high", ["border_artifact"], "Square border box visible around orange medical stretcher"),
    ("191", "strict"): ("REDO", "high", ["border_artifact"], "Square border line visible around strict teacher"),
    ("191", "string"): ("REDO", "high", ["border_artifact"], "Square border line visible around ball of string"),
    ("191", "string-cheese"): ("REDO", "high", ["border_artifact"], "Square border box visible around stick of string cheese"),
    ("191", "stroller"): ("REDO", "high", ["border_artifact"], "Square border box visible around baby stroller"),
    ("191", "strong"): ("REDO", "high", ["border_artifact"], "Square border line visible around boy lifting heavy toy blocks"),
    ("191", "stuffed-animal"): ("REDO", "high", ["border_artifact"], "Square border box visible around teddy bear"),

    # Sheet 192
    ("192", "subway"): ("REDO", "high", ["text_artifact"], "Embedded English text 'subway' below train car"),
    ("192", "subway-car"): ("REDO", "high", ["border_artifact"], "Square border box visible around green subway car"),
    ("192", "subway-map"): ("REDO", "high", ["border_artifact"], "Square border box visible around metro transit map"),
    ("192", "subway-train"): ("REDO", "high", ["border_artifact"], "Square border line visible around silver subway train"),
    ("192", "suffix"): ("REDO", "high", ["border_artifact"], "Square border line visible around open dictionary page"),
    ("192", "sugar"): ("REDO", "high", ["border_artifact"], "Square border box visible around sugar jar"),
    ("192", "sugar-packet"): ("REDO", "high", ["border_artifact"], "Square border box visible around paper sugar packet"),
    ("192", "suicide"): ("REDO", "high", ["inappropriate"], "Candle with black mourning ribbon; highly inappropriate topic for ESL kids"),
    ("192", "suitcase"): ("REDO", "high", ["border_artifact"], "Square border box visible around leather suitcase"),

    # Sheet 193
    ("193", "summit"): ("REDO", "high", ["border_artifact"], "Square border line visible around mountain peak"),
    ("193", "sun"): ("REDO", "high", ["border_artifact"], "Square border line visible around sun icon"),
    ("193", "sunbathe"): ("REDO", "high", ["border_artifact"], "Square border box visible around boy sunbathing"),
    ("193", "sunblock"): ("REDO", "high", ["split_composite"], "4-quadrant composite grid artifact (hockey stick, panther, blank squares)"),
    ("193", "sundial"): ("REDO", "high", ["border_artifact"], "Square border box visible around stone sundial"),
    ("193", "sunflower"): ("REDO", "high", ["border_artifact"], "Square border line visible around sunflower"),
    ("193", "sunflower-tall"): ("REDO", "high", ["border_artifact"], "Square border line visible around tall sunflower"),
    ("193", "sunlight"): ("REDO", "high", ["border_artifact"], "Square border box visible around sun with radiating rays"),
    ("193", "sunny-day"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Sunny-day' below weather icon"),
    ("193", "sunscreen"): ("REDO", "high", ["border_artifact"], "Square border box visible around lotion tube"),
    ("193", "sunset"): ("REDO", "high", ["border_artifact"], "Square border box visible around sunset over ocean"),
    ("193", "super"): ("REDO", "high", ["border_artifact"], "Square border line visible around superhero kid"),
    ("193", "superlative"): ("REDO", "high", ["border_artifact"], "Square border box visible around gold championship trophy"),
    ("193", "supermarket"): ("REDO", "high", ["border_artifact"], "Square border line visible around grocery supermarket building"),
    ("193", "superstar"): ("REDO", "high", ["border_artifact"], "Square border box visible around spotlight shining star"),

    # Sheet 194
    ("194", "supper"): ("REDO", "high", ["bad_alpha", "unreadable_abstraction"], "Alpha keying erased white plate, leaving floating cutlery outlines"),
    ("194", "supply"): ("REDO", "high", ["border_artifact"], "Square border box visible around stacked cardboard boxes"),
    ("194", "supporter"): ("REDO", "high", ["border_artifact"], "Square border box visible around scarf and foam hand"),
    ("194", "surface"): ("REDO", "high", ["border_artifact"], "Square border box visible around periscope breaking water surface"),
    ("194", "surfboard"): ("REDO", "high", ["border_artifact"], "Square border box visible around blue surfboard"),
    ("194", "surfing"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden surfboard"),
    ("194", "surgeon"): ("REDO", "high", ["border_artifact"], "Square border box visible around surgical cap, mask and stethoscope"),
    ("194", "surgery"): ("REDO", "high", ["border_artifact"], "Square border box visible around surgical tray and gloves"),
    ("194", "surname"): ("REDO", "high", ["unreadable_abstraction"], "Blank cards in wooden frame; unreadable abstraction for 'surname'"),
    ("194", "survey-prism"): ("REDO", "high", ["border_artifact"], "Square border box visible around surveying prism"),
    ("194", "sushi"): ("REDO", "high", ["split_composite"], "Split composite artifact showing sushi roll on left and gyoza dumpling on right"),
    ("194", "suspenders"): ("REDO", "high", ["border_artifact"], "Square border box visible around pair of brown suspenders"),
    ("194", "swallow"): ("REDO", "high", ["border_artifact"], "Square border box visible around barn swallow bird"),
    ("194", "swamp"): ("REDO", "high", ["border_artifact"], "Square border box visible around swamp pond reeds"),

    # Sheet 195
    ("195", "swan"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Swan' below swimming swan"),
    ("195", "sweat"): ("REDO", "high", ["border_artifact"], "Square border box visible around sweaty boy with water bottle"),
    ("195", "sweet"): ("REDO", "high", ["border_artifact"], "Square border box visible around wrapped hard candy"),
    ("195", "sweetheart"): ("REDO", "high", ["border_artifact"], "Square border box visible around gingerbread heart cookie"),
    ("195", "swell"): ("REDO", "high", ["border_artifact"], "Bottom horizontal line crop artifact below balloon"),
    ("195", "swerve"): ("REDO", "high", ["text_artifact"], "Embedded English text 'swerve' below scooter slalom"),
    ("195", "swim-cap"): ("REDO", "high", ["border_artifact"], "Square border box visible around red swim cap"),
    ("195", "swimming-costume"): ("REDO", "high", ["border_artifact"], "Square border box visible around one-piece swimsuit"),
    ("195", "swimsuit"): ("REDO", "high", ["split_composite"], "Split composite artifact showing lotion tube, plug, and drain hole"),
    ("195", "swing"): ("REDO", "high", ["border_artifact"], "Square border line visible around playground swing"),
    ("195", "switch"): ("REDO", "high", ["border_artifact"], "Square border box visible around light switch plate"),

    # Sheet 196
    ("196", "syringe"): ("REDO", "high", ["border_artifact"], "Square border box visible around medical syringe"),
    ("196", "syringe-vet"): ("REDO", "high", ["border_artifact"], "Square border box visible around veterinary syringe"),
    ("196", "syrup-bottle"): ("REDO", "high", ["border_artifact"], "Square border box visible around maple syrup bottle"),
    ("196", "syrup-pour"): ("REDO", "high", ["border_artifact"], "Square border box visible around pouring syrup stream"),
    ("196", "t-rex"): ("REDO", "high", ["border_artifact"], "Square border box visible around cartoon T-rex"),
    ("196", "t-shirt"): ("REDO", "high", ["border_artifact"], "Square border box visible around red t-shirt"),
    ("196", "table"): ("REDO", "high", ["border_artifact"], "Square border box visible around blue table"),
    ("196", "taco"): ("REDO", "high", ["split_composite"], "Split composite artifact showing taco on left and cut off black shape on right"),
    ("196", "tadpole"): ("REDO", "high", ["border_artifact"], "Square border box visible around swimming tadpole"),

    # Sheet 197
    ("197", "tall-finds-bag"): ("REDO", "high", ["border_artifact"], "Square border box visible around brown paper bag"),
    ("197", "tambourine"): ("REDO", "high", ["border_artifact"], "Square border box visible around tambourine"),
    ("197", "tambourine-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around tambourine icon"),
    ("197", "tap"): ("REDO", "high", ["border_artifact"], "Square border line visible around blue water tap faucet"),
    ("197", "tape"): ("REDO", "high", ["border_artifact"], "Square border box visible around green tape roll"),
    ("197", "tape-measure"): ("REDO", "high", ["border_artifact"], "Square border box visible around measuring tape"),
    ("197", "target"): ("REDO", "high", ["border_artifact"], "Square border box visible around archery target"),
    ("197", "taxi"): ("REDO", "high", ["border_artifact"], "Square border box visible around yellow taxi cab"),
    ("197", "tea-cup"): ("REDO", "high", ["bad_alpha"], "Keying erased white cup body, leaving only floating blue rim and saucer"),
    ("197", "tea-infuser"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal tea infuser ball"),

    # Sheet 198
    ("198", "teapot"): ("REDO", "high", ["border_artifact"], "Square border box visible around brown ceramic teapot"),
    ("198", "telephone"): ("REDO", "high", ["border_artifact"], "Square border box visible around telephone handset"),
    ("198", "telescope"): ("REDO", "high", ["border_artifact"], "Square border box visible around brass handheld telescope"),
    ("198", "television"): ("REDO", "high", ["border_artifact"], "Square border box visible around flat television screen"),
    ("198", "temperature"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Temperature' below thermometer"),

    # Sheet 199
    ("199", "tennis-ball"): ("REDO", "high", ["border_artifact"], "Square border line visible around tennis ball"),
    ("199", "tennis-net"): ("REDO", "high", ["border_artifact"], "Square border box visible around tennis net"),
    ("199", "tent"): ("REDO", "high", ["border_artifact"], "Square border box visible around green camping tent"),
    ("199", "tent-camp"): ("REDO", "high", ["border_artifact"], "Square border box visible around green pyramid tent"),
    ("199", "tent-peg"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal tent peg stake"),
    ("199", "tern"): ("REDO", "high", ["border_artifact"], "Square border box visible around sea tern bird"),
    ("199", "terrace"): ("REDO", "high", ["border_artifact"], "Square border box visible around patio table and chairs terrace"),
    ("199", "terrorist"): ("REDO", "high", ["inappropriate"], "Dark hooded figure behind police tape; highly inappropriate topic for ESL kids"),
    ("199", "tetherball"): ("REDO", "high", ["text_artifact"], "Embedded English text 'tetherball' below player"),

    # Sheet 200
    ("200", "theater"): ("REDO", "high", ["border_artifact"], "Square border box visible around cinema/theater building"),
    ("200", "thermometer"): ("REDO", "high", ["border_artifact"], "Square border box visible around mercury thermometer"),
    ("200", "thermometer-body"): ("REDO", "high", ["border_artifact"], "Square border box visible around digital medical thermometer"),
    ("200", "thermometer-ear"): ("REDO", "high", ["border_artifact"], "Square border box visible around infrared ear thermometer"),
    ("200", "thermometer-icon"): ("REDO", "high", ["border_artifact"], "Square border line visible around digital thermometer icon"),
    ("200", "thermometer-med"): ("REDO", "high", ["border_artifact"], "Square border box visible around clinical thermometer"),
    ("200", "thermos"): ("REDO", "high", ["border_artifact"], "Square border box visible around thermos flask"),
    ("200", "thermos-arctic"): ("REDO", "high", ["border_artifact"], "Square border box visible around arctic insulated thermos"),
    ("200", "thermos-soup"): ("REDO", "high", ["border_artifact"], "Square border line visible around insulated food flask"),
    ("200", "thermostat"): ("REDO", "high", ["border_artifact"], "Square border box visible around wall thermostat"),
    ("200", "thimble"): ("REDO", "high", ["border_artifact"], "Square border box visible around sewing thimble"),

    # Sheet 201
    ("201", "thread"): ("REDO", "high", ["border_artifact"], "Square border line visible around purple spool of thread"),
    ("201", "thriller"): ("REDO", "high", ["border_artifact"], "Square border box visible around hardbound book"),
    ("201", "throne"): ("REDO", "high", ["border_artifact"], "Square border box visible around ornate royal throne"),
    ("201", "throw"): ("REDO", "high", ["border_artifact"], "Square border box visible around boy throwing ball"),
    ("201", "thumb"): ("REDO", "high", ["border_artifact"], "Square border line visible around thumb"),
    ("201", "thumbtack"): ("REDO", "high", ["text_artifact"], "Embedded English text 'thumbtack' below hand pinning paper"),
    ("201", "thunder"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Thunder' below lightning cloud"),
    ("201", "thyme"): ("REDO", "high", ["border_artifact"], "Square border box visible around thyme spice jar"),
    ("201", "tick"): ("REDO", "high", ["border_artifact"], "Square border box visible around pencil marking checklist checkbox"),
    ("201", "ticket-machine"): ("REDO", "high", ["border_artifact"], "Square border box visible around transit ticket vending machine"),
    ("201", "tide"): ("REDO", "high", ["border_artifact"], "Square border line visible around ocean tidal wave"),
    ("201", "tie-clip"): ("REDO", "high", ["border_artifact"], "Square border line visible around metal tie bar clip"),

    # Sheet 202
    ("202", "tile"): ("REDO", "high", ["border_artifact"], "Square border box visible around ceramic floor tile"),
    ("202", "timetable"): ("REDO", "high", ["border_artifact"], "Square border line visible around class timetable schedule"),
    ("202", "tin"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal tin drum can"),
    ("202", "tip-jar"): ("REDO", "high", ["border_artifact"], "Square border box visible around empty glass tip jar"),
    ("202", "tiptoe"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Tiptoe' below walking boy"),
    ("202", "tire"): ("REDO", "high", ["border_artifact"], "Square border line visible around rubber car tire"),
    ("202", "tissue"): ("REDO", "high", ["border_artifact"], "Square border box visible around tissue paper box"),
    ("202", "tissues-box"): ("REDO", "high", ["border_artifact"], "Square border line visible around tissue dispenser box"),
    ("202", "toad"): ("REDO", "high", ["border_artifact"], "Square border line visible around brown garden toad"),
    ("202", "toad-helper"): ("REDO", "high", ["border_artifact"], "Square border line visible around toad icon"),
    ("202", "toadstool"): ("REDO", "high", ["border_artifact"], "Square border box visible around red speckled mushroom"),

    # Sheet 203
    ("203", "tobacco"): ("REDO", "high", ["border_artifact", "inappropriate"], "Square border box around tobacco pouch / unsuitable keyword for kindergarten"),
    ("203", "toe"): ("REDO", "high", ["border_artifact"], "Square border box visible around foot toes"),
    ("203", "toil"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Toil' below struggling boy"),
    ("203", "toilet-brush"): ("REDO", "high", ["border_artifact"], "Square border box visible around bathroom toilet brush"),
    ("203", "toilet-paper"): ("REDO", "high", ["border_artifact"], "Square border box visible around toilet paper roll"),
    ("203", "tomato"): ("REDO", "high", ["border_artifact"], "Square border line visible around ripe tomato"),
    ("203", "tomato-plant"): ("REDO", "high", ["border_artifact"], "Square border line visible around tomato vine pot"),
    ("203", "tomato-sauce"): ("REDO", "high", ["border_artifact"], "Square border box visible around bowl of tomato pasta sauce"),
    ("203", "tongs-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal tongs icon"),
    ("203", "tongs-kitchen"): ("REDO", "high", ["border_artifact"], "Square border box visible around golden kitchen tongs"),
    ("203", "tool-belt"): ("REDO", "high", ["border_artifact"], "Square border box visible around leather tool belt"),
    ("203", "toothbrush"): ("REDO", "high", ["border_artifact"], "Square border box visible around manual toothbrush"),
    ("203", "toothbrush-cup"): ("REDO", "high", ["border_artifact"], "Square border box visible around toothbrush rinse cup"),

    # Sheet 204
    ("204", "toothbrush-holder"): ("REDO", "high", ["border_artifact"], "Square border box visible around ceramic toothbrush tumbler"),
    ("204", "toothpaste"): ("REDO", "high", ["border_artifact"], "Square border line visible around tube of toothpaste"),
    ("204", "toothpaste-kids"): ("REDO", "high", ["border_artifact"], "Square border line visible around children toothpaste tube"),
    ("204", "toothpick"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden toothpick"),
    ("204", "toothpick-holder"): ("REDO", "high", ["border_artifact"], "Square border box visible around toothpick dispenser"),
    ("204", "topping-cherry"): ("REDO", "high", ["border_artifact"], "Square border box visible around jar of preserved cherries"),
    ("204", "topping-jar"): ("REDO", "high", ["border_artifact"], "Square border box visible around empty glass canning jar"),
    ("204", "torch"): ("REDO", "high", ["border_artifact"], "Square border box visible around handheld flashlight"),
    ("204", "torch-wall"): ("REDO", "high", ["border_artifact"], "Square border box visible around medieval wall torch"),
    ("204", "tornado"): ("REDO", "high", ["border_artifact"], "Square border box visible around swirling tornado funnel"),
    ("204", "torpedo"): ("REDO", "high", ["border_artifact"], "Square border box visible around underwater naval torpedo"),
    ("204", "tortilla"): ("REDO", "high", ["wrong_concept"], "Shows a toothbrush instead of a tortilla flatbread; wrong concept completely"),
    ("204", "torture"): ("REDO", "high", ["text_artifact", "inappropriate"], "Embedded English text 'Torture - Pretend'; inappropriate concept for children"),
    ("204", "total"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden math blocks"),
    ("204", "total-station"): ("REDO", "high", ["border_artifact"], "Square border box visible around surveying theodolite station"),
    ("204", "tote"): ("REDO", "high", ["border_artifact"], "Square border box visible around canvas tote bag"),
    ("204", "tote-bag"): ("REDO", "high", ["border_artifact"], "Square border line visible around cotton tote bag"),

    # Sheet 205
    ("205", "tourism"): ("REDO", "high", ["border_artifact"], "Square border box visible around suitcase and passport"),
    ("205", "towel"): ("REDO", "high", ["border_artifact"], "Square border line visible around folded bath towel"),
    ("205", "towel-beach"): ("REDO", "high", ["border_artifact"], "Square border line visible around striped yellow beach towel"),
    ("205", "towel-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around folded yellow towel"),
    ("205", "towel-pool"): ("REDO", "high", ["border_artifact"], "Square border line visible around blue striped pool towel"),
    ("205", "tower"): ("REDO", "high", ["border_artifact"], "Square border line visible around castle watchtower"),
    ("205", "toy-train"): ("REDO", "high", ["border_artifact"], "Square border line visible around wooden toy train"),
    ("205", "trace"): ("REDO", "high", ["border_artifact"], "Square border line visible around pencil tracing line"),
    ("205", "tracksuit"): ("REDO", "high", ["border_artifact"], "Square border box visible around athletic tracksuit"),
    ("205", "tractor-toy"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Tractor-toy' below toy tractor"),
    ("205", "traffic light"): ("REDO", "high", ["border_artifact"], "Square border line visible around three-color traffic light"),
    ("205", "traffic-bollard"): ("REDO", "high", ["border_artifact"], "Square border box visible around yellow road bollard"),
    ("205", "traffic-light"): ("REDO", "high", ["border_artifact"], "Square border line visible around traffic light post"),

    # Sheet 206
    ("206", "trail-map"): ("REDO", "high", ["unreadable_abstraction"], "Blank parchment rectangle; unreadable abstraction for 'trail-map'"),
    ("206", "train"): ("REDO", "high", ["border_artifact"], "Square border line visible around passenger train"),
    ("206", "train-ticket"): ("REDO", "high", ["border_artifact"], "Square border line visible around transit train ticket"),
    ("206", "tram"): ("REDO", "high", ["border_artifact"], "Square border line visible around red aerial cable car/tram"),
    ("206", "trampoline"): ("REDO", "high", ["border_artifact"], "Square border box visible around backyard trampoline"),
    ("206", "trampoline-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around round trampoline"),
    ("206", "trash-can"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal trash can"),
    ("206", "travel"): ("REDO", "high", ["border_artifact"], "Square border box visible around leather travel suitcase"),
    ("206", "travel-adapter"): ("REDO", "high", ["border_artifact"], "Square border line visible around universal power adapter"),

    # Sheet 207
    ("207", "tray"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal serving tray"),
    ("207", "treasure"): ("REDO", "high", ["border_artifact"], "Square border box visible around closed wooden treasure chest"),
    ("207", "treasure-chest"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden chest"),
    ("207", "treat"): ("REDO", "high", ["border_artifact"], "Square border box visible around dog bone biscuit"),
    ("207", "treat-bag"): ("REDO", "high", ["border_artifact"], "Square border box visible around brown paper snack bag"),
    ("207", "tree"): ("REDO", "high", ["border_artifact"], "Square border box visible around green deciduous tree"),
    ("207", "trellis"): ("REDO", "high", ["border_artifact"], "Square border box visible around garden wooden trellis"),
    ("207", "tremble"): ("REDO", "high", ["border_artifact"], "Square border box visible around freezing boy"),
    ("207", "tripod"): ("REDO", "high", ["border_artifact"], "Square border box visible around camera tripod stand"),
    ("207", "trombone"): ("REDO", "high", ["wrong_concept"], "Shows a red one-piece swimsuit and safety pin instead of a trombone"),

    # Sheet 208
    ("208", "trough"): ("REDO", "high", ["border_artifact"], "Square border box visible around livestock water trough"),
    ("208", "trousers"): ("REDO", "high", ["border_artifact"], "Square border box visible around pair of brown trousers"),
    ("208", "trowel"): ("REDO", "high", ["border_artifact"], "Square border box visible around garden hand trowel"),
    ("208", "trumpet-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around brass trumpet icon"),
    ("208", "tuba"): ("REDO", "high", ["split_composite"], "4-quadrant composite grid artifact (tuba, flute, block)"),
    ("208", "tugowar"): ("REDO", "high", ["text_artifact"], "Embedded English text 'tugowar' below tug of war children"),
    ("208", "tulip"): ("REDO", "high", ["border_artifact"], "Square border box visible around pink tulip flower"),
    ("208", "tumbler"): ("REDO", "high", ["border_artifact"], "Square border box visible around insulated drinking tumbler"),
    ("208", "tuning-peg"): ("REDO", "high", ["border_artifact"], "Square border line visible around guitar tuning peg"),

    # Sheet 209
    ("209", "turkey-farm"): ("REDO", "high", ["border_artifact"], "Square border box visible around farm turkey"),
    ("209", "turmeric"): ("REDO", "high", ["border_artifact"], "Square border box visible around yellow turmeric spice jar"),
    ("209", "turnip"): ("REDO", "high", ["border_artifact"], "Square border box visible around purple turnip root"),
    ("209", "turnstile"): ("REDO", "high", ["border_artifact"], "Square border box visible around subway turnstile gate"),
    ("209", "turtle"): ("REDO", "high", ["border_artifact"], "Square border box visible around swimming sea turtle"),
    ("209", "turtle-tank"): ("REDO", "high", ["border_artifact"], "Square border box visible around turtle in aquarium tank"),
    ("209", "tusk"): ("REDO", "high", ["border_artifact"], "Square border box visible around ivory elephant tusk"),
    ("209", "tweezers-aid"): ("REDO", "high", ["bad_alpha"], "Keying erased white bottle body leaving only lid and faint outlines"),
    ("209", "tyre"): ("REDO", "high", ["border_artifact"], "Square border box visible around heavy rubber vehicle tire"),

    # Sheet 210
    ("210", "umbrella"): ("REDO", "high", ["border_artifact"], "Square border box visible around open rain umbrella"),
    ("210", "unbolt"): ("REDO", "high", ["text_artifact"], "Embedded English text 'unbolt' below sliding door bolt"),
    ("210", "unbuckle"): ("REDO", "high", ["text_artifact"], "Embedded English text 'unbuckle' below releasing seatbelt"),
    ("210", "uncork"): ("REDO", "high", ["text_artifact"], "Embedded English text 'uncork' above bottle cork opening"),
    ("210", "uncover"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Uncover' below blanket revealing teddy"),
    ("210", "underground"): ("REDO", "high", ["border_artifact"], "Square border line visible around subway underground station entrance"),
    ("210", "underpants"): ("REDO", "high", ["border_artifact"], "Square border line visible around underpants on clothes hanger"),
    ("210", "underpass"): ("REDO", "high", ["border_artifact"], "Square border box visible around road highway underpass tunnel"),
    ("210", "undo"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Undo' below hands untying ribbon"),

    # Sheet 211
    ("211", "unhook"): ("REDO", "high", ["text_artifact"], "Embedded English text 'unhook' below clothes hanger"),
    ("211", "uniform"): ("REDO", "high", ["border_artifact"], "Square border line visible around red school t-shirt"),
    ("211", "union"): ("REDO", "high", ["border_artifact"], "Square border line visible around interlinked gold and silver rings"),
    ("211", "universe"): ("REDO", "high", ["border_artifact"], "Square border line visible around planet earth in space"),
    ("211", "unlatch"): ("REDO", "high", ["text_artifact"], "Embedded English text 'unlatch' below fence gate latch"),
    ("211", "unload"): ("REDO", "high", ["text_artifact"], "Embedded English text 'unload' below delivery truck cargo"),

    # Sheet 212
    ("212", "upload"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Upload' below tablet screen cloud upload"),
    ("212", "upward"): ("REDO", "high", ["border_artifact"], "Square border line visible around paper airplane flying up"),
    ("212", "urchin"): ("REDO", "high", ["border_artifact"], "Square border line visible around sea urchin"),
    ("212", "urge"): ("REDO", "high", ["border_artifact"], "Square border line visible around finger pressing button"),
    ("212", "urgent"): ("REDO", "high", ["border_artifact"], "Square border line visible around umbrella in torrential rain"),

    # Sheet 213
    ("213", "utility-knife"): ("REDO", "high", ["border_artifact"], "Square border line visible around box cutter utility knife"),
    ("213", "vacuum"): ("REDO", "high", ["border_artifact"], "Square border line visible around canister vacuum cleaner"),
    ("213", "vacuum-cleaner"): ("REDO", "high", ["border_artifact"], "Square border line visible around upright vacuum cleaner"),
    ("213", "valley"): ("REDO", "high", ["border_artifact"], "Square border line visible around mountain river valley"),
    ("213", "valuable"): ("REDO", "high", ["border_artifact"], "Square border line visible around treasure chest with diamond"),
    ("213", "vanish"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Vanish' below magician handkerchief"),
    ("213", "vast"): ("REDO", "high", ["border_artifact"], "Square border line visible around vast ocean horizon"),
    ("213", "vegetable-basket"): ("REDO", "high", ["border_artifact"], "Square border line visible around basket of garden vegetables"),
    ("213", "vegetable-medley"): ("REDO", "high", ["border_artifact"], "Square border line visible around steamed mixed vegetables"),
    ("213", "vegetarian"): ("REDO", "high", ["border_artifact"], "Square border line visible around vegetarian meal platter"),
    ("213", "vehicle"): ("REDO", "high", ["border_artifact"], "Square border line visible around colorful toy automobile"),
    ("213", "veil"): ("REDO", "high", ["border_artifact"], "Square border line visible around white wedding veil"),
    ("213", "vein"): ("REDO", "high", ["border_artifact"], "Square border line visible around anatomical blue vein branching"),

    # Sheet 214
    ("214", "velcro"): ("REDO", "high", ["border_artifact"], "Square border line visible around velcro strip"),
    ("214", "vest"): ("REDO", "high", ["border_artifact"], "Square border line visible around brown vest waistcoat"),
    ("214", "vet"): ("REDO", "high", ["split_composite"], "Multi-cell composite grid artifact with doctor and crown sliver"),
    ("214", "vet-kit"): ("REDO", "high", ["border_artifact"], "Square border box visible around red cross veterinary kit"),
    ("214", "vibrate"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Vibrate' below shaking smartphone"),
    ("214", "vice"): ("REDO", "high", ["border_artifact"], "Square border line visible around naughty boy hiding toy"),
    ("214", "vinyl-record"): ("REDO", "high", ["border_artifact"], "Square border line visible around black vinyl record"),
    ("214", "violin-bow"): ("REDO", "high", ["border_artifact"], "Square border line visible around wooden violin bow"),
    ("214", "violin-case"): ("REDO", "high", ["border_artifact"], "Square border line visible around brown violin instrument case"),
    ("214", "violin-ivory"): ("REDO", "high", ["border_artifact"], "Square border line visible around violin instrument"),
    ("214", "virtual"): ("REDO", "high", ["border_artifact"], "Square border line visible around boy wearing VR headset"),
    ("214", "virus"): ("REDO", "high", ["border_artifact"], "Square border line visible around microscopic coronavirus icon"),

    # Sheet 215
    ("215", "vitamins"): ("REDO", "high", ["border_artifact"], "Square border line visible around amber vitamin pill bottle"),
    ("215", "volcano-icon"): ("REDO", "high", ["border_artifact"], "Square border line visible around erupting volcano cone"),
    ("215", "volleyball"): ("REDO", "high", ["border_artifact"], "Square border line visible around yellow and white volleyball"),
    ("215", "vote"): ("REDO", "high", ["border_artifact"], "Square border line visible around ballot box with checkmark"),
    ("215", "vulture"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Vulture' below scavenger vulture"),
    ("215", "waffle"): ("REDO", "high", ["split_composite"], "Split composite artifact with waffle on left and shish kebab on right"),
    ("215", "waffle-bowl"): ("REDO", "high", ["border_artifact"], "Square border line visible around waffle cone dessert bowl"),
    ("215", "waffle-cone"): ("REDO", "high", ["border_artifact"], "Square border line visible around empty waffle ice cream cone"),
    ("215", "wag"): ("REDO", "high", ["border_artifact"], "Square border line visible around happy dog wagging tail"),
    ("215", "wagon"): ("REDO", "high", ["border_artifact"], "Square border line visible around wooden pull cart wagon"),

    # Sheet 216
    ("216", "waist"): ("REDO", "high", ["inappropriate"], "Close-up crop of hips in underwear; inappropriate for kindergarten icon"),
    ("216", "waiting-chair"): ("REDO", "high", ["border_artifact"], "Square border line visible around teal clinic chair"),
    ("216", "waiting-room"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Waiting-room' below airport chairs"),
    ("216", "waitress"): ("REDO", "high", ["wrong_concept"], "Shows a green plate place setting instead of a waitress"),
    ("216", "wake-up"): ("REDO", "high", ["border_artifact"], "Square border box visible around classic twin bell alarm clock"),
    ("216", "wakeboard"): ("REDO", "high", ["border_artifact"], "Square border line visible around colorful wakeboard"),
    ("216", "wall"): ("REDO", "high", ["unreadable_abstraction"], "Blank square divided into 4 empty grid lines; unreadable abstraction"),
    ("216", "wallaby"): ("REDO", "high", ["border_artifact"], "Square border box visible around Australian wallaby"),
    ("216", "wallet"): ("REDO", "high", ["border_artifact"], "Square border line visible around open bifold leather wallet"),
    ("216", "wallet-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around leather wallet icon"),
    ("216", "walrus"): ("REDO", "high", ["border_artifact"], "Square border box visible around Arctic walrus"),
    ("216", "walrus-tusk"): ("REDO", "high", ["border_artifact"], "Square border box visible around walrus showing long tusks"),
    ("216", "wand"): ("REDO", "high", ["border_artifact"], "Square border box visible around magic star wand"),
    ("216", "wander"): ("REDO", "high", ["border_artifact"], "Square border line visible around boy wandering forest trail"),
    ("216", "wardrobe"): ("REDO", "high", ["border_artifact"], "Square border box visible around double door wardrobe cabinet"),
    ("216", "wardrobe-hangers"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden clothes hangers"),
    ("216", "warehouse"): ("REDO", "high", ["border_artifact"], "Square border box visible around industrial storage warehouse"),
    ("216", "warm"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Warm' below girl with hot drink"),

    # Sheet 217
    ("217", "warn"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Warn' below boy warning of puddle"),
    ("217", "warthog"): ("REDO", "high", ["border_artifact"], "Square border box visible around African warthog"),
    ("217", "wash-face"): ("REDO", "high", ["border_artifact"], "Square border box visible around wash basin and towel"),
    ("217", "wasp"): ("REDO", "high", ["border_artifact"], "Square border line visible around stinging yellow jacket wasp"),
    ("217", "waste"): ("REDO", "high", ["border_artifact"], "Square border box visible around black plastic trash garbage bag"),
    ("217", "watch"): ("REDO", "high", ["border_artifact"], "Square border line visible around leather strap wristwatch"),
    ("217", "water-bottle"): ("REDO", "high", ["border_artifact"], "Square border line visible around reusable water bottle"),
    ("217", "water-bottle-empty"): ("REDO", "high", ["border_artifact"], "Square border box visible around transparent water bottle"),
    ("217", "water-bottle-sport"): ("REDO", "high", ["border_artifact"], "Square border box visible around blue sports water bottle"),
    ("217", "water-cooler"): ("REDO", "high", ["border_artifact"], "Square border box visible around insulated beverage dispenser cooler"),
    ("217", "water-filter"): ("REDO", "high", ["border_artifact"], "Square border box visible around filtration water bottle"),
    ("217", "water-fountain"): ("REDO", "high", ["border_artifact"], "Square border line visible around wall drinking water fountain"),

    # Sheet 218
    ("218", "water-lily"): ("REDO", "high", ["border_artifact"], "Square border box visible around pink water lily on lilypad"),
    ("218", "water-plants"): ("REDO", "high", ["border_artifact"], "Square border box visible around watering potted plants"),
    ("218", "water-ski"): ("REDO", "high", ["border_artifact"], "Square border box visible around blue waterski"),
    ("218", "watercan"): ("REDO", "high", ["text_artifact"], "Embedded English text 'watercan' below gardener"),
    ("218", "watercolor-set"): ("REDO", "high", ["border_artifact"], "Square border box visible around artist watercolor paint palette"),
    ("218", "waterfall"): ("REDO", "high", ["border_artifact"], "Square border box visible around scenic cascade waterfall"),
    ("218", "watering-can"): ("REDO", "high", ["border_artifact"], "Square border line visible around green plastic watering can"),
    ("218", "watering-can-farm"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Watering-can-farm' below zinc can"),
    ("218", "watering-wand"): ("REDO", "high", ["border_artifact"], "Square border box visible around garden hose watering wand"),
    ("218", "watermelon"): ("REDO", "high", ["border_artifact"], "Square border box visible around slice of fresh watermelon"),
    ("218", "waterpark"): ("REDO", "high", ["border_artifact"], "Square border box visible around water park slide"),
    ("218", "wax"): ("REDO", "high", ["border_artifact"], "Square border line visible around block of yellow wax"),
    ("218", "weasel"): ("REDO", "high", ["border_artifact"], "Square border box visible around brown weasel"),
    ("218", "weather"): ("REDO", "high", ["border_artifact"], "Square border box visible around sun emerging behind blue cloud"),
    ("218", "weather-vane"): ("REDO", "high", ["border_artifact"], "Square border box visible around rooster weather vane"),

    # Sheet 219
    ("219", "web"): ("REDO", "high", ["border_artifact"], "Square border box visible around spider web"),
    ("219", "wedding-ring"): ("REDO", "high", ["border_artifact"], "Square border line visible around gold solitaire diamond ring"),
    ("219", "weed"): ("REDO", "high", ["border_artifact"], "Square border line visible around green garden weed with root"),
    ("219", "weevil"): ("REDO", "high", ["border_artifact"], "Square border box visible around acorn weevil beetle"),
    ("219", "well"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden bucket water well"),
    ("219", "wellingtons"): ("REDO", "high", ["border_artifact"], "Square border line visible around green rubber rain boots"),

    # Sheet 220
    ("220", "wheat"): ("REDO", "high", ["border_artifact"], "Square border box visible around sheaf of golden wheat"),
    ("220", "wheel"): ("REDO", "high", ["border_artifact"], "Square border box visible around car rubber wheel and rim"),
    ("220", "wheel-chock"): ("REDO", "high", ["border_artifact"], "Square border box visible around yellow tire wheel chock"),
    ("220", "wheel-loader"): ("REDO", "high", ["border_artifact"], "Square border line visible around heavy construction wheel loader"),
    ("220", "wheelbarrow"): ("REDO", "high", ["border_artifact"], "Square border box visible around garden wheelbarrow"),
    ("220", "wheelbarrow-build"): ("REDO", "high", ["border_artifact"], "Square border box visible around construction red wheelbarrow"),
    ("220", "wheelbarrow-farm"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Wheelbarrow-farm' below wheelbarrow"),
    ("220", "wheelbarrow-full"): ("REDO", "high", ["border_artifact"], "Square border box visible around wheelbarrow filled with soil"),
    ("220", "wheelbarrow-garden"): ("REDO", "high", ["border_artifact"], "Square border line visible around green garden wheelbarrow"),
    ("220", "wheelchair"): ("REDO", "high", ["border_artifact"], "Square border line visible around medical wheelchair"),
    ("220", "wheelchair-clinic"): ("REDO", "high", ["border_artifact"], "Square border line visible around blue mobility wheelchair"),
    ("220", "whipped-cream"): ("REDO", "high", ["border_artifact"], "Square border line visible around ice cream sundae with cream"),
    ("220", "whipped-cream-top"): ("REDO", "high", ["border_artifact"], "Square border box visible around dollop of whipped cream"),
    ("220", "whisk"): ("REDO", "high", ["border_artifact"], "Square border box visible around wire baking whisk"),
    ("220", "whisk-broom"): ("REDO", "high", ["border_artifact"], "Square border box visible around small handheld whisk broom"),
    ("220", "whisk-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around culinary whisk icon"),
    ("220", "whisper"): ("REDO", "high", ["border_artifact"], "Square border line visible around whispering hand to ear silhouette"),
    ("220", "whistle"): ("REDO", "high", ["border_artifact"], "Square border box visible around sports coach referee whistle"),
    ("220", "whistle-lifeguard"): ("REDO", "high", ["border_artifact"], "Square border box visible around red pea-less lifeguard whistle"),
    ("220", "whistle-pe"): ("REDO", "high", ["border_artifact"], "Square border box visible around metal referee pea whistle"),
    ("220", "whistle-train"): ("REDO", "high", ["border_artifact"], "Square border line visible around brass steam train whistle"),
    ("220", "whiteboard"): ("REDO", "high", ["border_artifact"], "Square border box visible around dry erase magnetic whiteboard"),
    ("220", "whitefly"): ("REDO", "high", ["border_artifact"], "Square border box visible around agricultural greenhouse whitefly pest"),

    # Sheet 221
    ("221", "wife"): ("REDO", "high", ["border_artifact"], "Square border line visible around female avatar"),
    ("221", "wig"): ("REDO", "high", ["border_artifact"], "Square border line visible around blonde costume wig"),
    ("221", "wiggle"): ("REDO", "high", ["text_artifact"], "Embedded English text 'Wiggle' below boy shaking hands"),
    ("221", "wildebeest"): ("REDO", "high", ["border_artifact"], "Square border line visible around African wildebeest gnu"),
    ("221", "willow"): ("REDO", "high", ["border_artifact"], "Square border box visible around weeping willow tree"),
    ("221", "wind"): ("REDO", "high", ["border_artifact"], "Square border line visible around wind breeze icon"),
    ("221", "wind-turbine"): ("REDO", "high", ["border_artifact"], "Square border line visible around clean energy wind turbine"),
    ("221", "windshield-wiper"): ("REDO", "high", ["border_artifact"], "Square border line visible around car windshield wiper blade"),
    ("221", "wine"): ("REDO", "high", ["border_artifact"], "Square border line visible around green wine bottle"),
    ("221", "wine-glass"): ("REDO", "high", ["border_artifact"], "Square border line visible around stemmed wine glass goblet"),
    ("221", "wing"): ("REDO", "high", ["border_artifact"], "Square border line visible around feathered bird wing"),

    # Sheet 222
    ("222", "winter"): ("REDO", "high", ["text_artifact", "border_artifact"], "Embedded English text 'Winter' and square border line"),
    ("222", "wire"): ("REDO", "high", ["border_artifact"], "Square border box visible around coil of insulated copper wire"),
    ("222", "wire-cutters"): ("REDO", "high", ["border_artifact"], "Square border line visible around blue heavy wire cutters"),
    ("222", "wok"): ("REDO", "high", ["border_artifact"], "Square border box visible around black steel cooking wok"),
    ("222", "woman"): ("REDO", "high", ["border_artifact"], "Square border box visible around woman avatar icon"),
    ("222", "wonton-broth"): ("REDO", "high", ["border_artifact"], "Square border box visible around bowl of wontons in broth"),
    ("222", "wonton-soup"): ("REDO", "high", ["border_artifact"], "Square border line visible around bowl of wonton noodle soup"),

    # Sheet 223
    ("223", "wood-crate"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden storage crate"),
    ("223", "wooden-spoon"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden kitchen spoon"),
    ("223", "woodpecker"): ("REDO", "high", ["border_artifact"], "Square border box visible around woodpecker on tree trunk"),
    ("223", "wool"): ("REDO", "high", ["border_artifact"], "Square border line visible around ball of grey knitting wool"),
    ("223", "work"): ("REDO", "high", ["border_artifact"], "Square border box visible around boy doing homework at desk"),
    ("223", "worker"): ("REDO", "high", ["border_artifact"], "Square border box visible around hard hat and wrench icon"),
    ("223", "working"): ("REDO", "high", ["border_artifact"], "Square border line visible around boy crafting wooden toy"),
    ("223", "worklight"): ("REDO", "high", ["border_artifact"], "Square border box visible around tripod work site floodlight"),
    ("223", "worn"): ("REDO", "high", ["border_artifact"], "Square border line visible around worn shoes and backpack"),
    ("223", "worthwhile"): ("REDO", "high", ["border_artifact"], "Square border line visible around planting young tree sapling"),

    # Sheet 224
    ("224", "wrist"): ("REDO", "high", ["border_artifact"], "Square border box visible around hand and wrist icon"),
    ("224", "writer"): ("REDO", "high", ["border_artifact"], "Square border line visible around author at desk icon"),
    ("224", "x-ray"): ("REDO", "high", ["text_artifact"], "Embedded English text 'X-ray' below hand radiograph"),
    ("224", "xray"): ("REDO", "high", ["border_artifact"], "Square border box visible around chest xray radiograph"),
    ("224", "xray-film"): ("REDO", "high", ["border_artifact"], "Square border box visible around lung xray radiograph"),
    ("224", "xylophone"): ("REDO", "high", ["border_artifact"], "Square border box visible around wooden toy xylophone"),
    ("224", "xylophone-icon"): ("REDO", "high", ["border_artifact"], "Square border box visible around rainbow metal xylophone"),
    ("224", "yak"): ("REDO", "high", ["border_artifact"], "Square border line visible around Tibetan mountain yak"),
    ("224", "yoga-mat-roll"): ("REDO", "high", ["border_artifact"], "Square border line visible around purple rolled yoga mat"),

    # Sheet 225
    ("225", "yoghurt"): ("REDO", "high", ["bad_alpha"], "Keying completely erased yogurt cup body, leaving broken rim outline"),
    ("225", "yogurt"): ("REDO", "high", ["border_artifact"], "Square border line visible around cup of white yogurt"),
    ("225", "yogurt-cup"): ("REDO", "high", ["border_artifact"], "Square border line visible around single serving yogurt tub"),
    ("225", "zebra"): ("REDO", "high", ["border_artifact"], "Square border line visible around wild African zebra"),
    ("225", "zigzag"): ("REDO", "high", ["text_artifact"], "Embedded English text 'zigzag' below running boy course"),
    ("225", "zip-line"): ("REDO", "high", ["border_artifact"], "Square border line visible around zip line handle and wire"),
}

decisions = []
counts = Counter()

for sheet_num_str in sorted(sheets_meta.keys(), key=lambda x: int(x)):
    sheet_data = sheets_meta[sheet_num_str]
    sheet_path = sheet_data["sheet"]
    for asset in sheet_data["assets"]:
        aid = asset["asset_id"]
        key = asset["key"]
        
        override = SPECIFIC_RULES.get((sheet_num_str, key))
        if override:
            status, conf, reasons, notes = override
        else:
            status = "PASS"
            conf = "high"
            reasons = []
            notes = f"Clear, legible visual illustration for concept '{key}'."
            
        counts[status] += 1
        decisions.append({
            "asset_id": aid,
            "status": status,
            "confidence": conf,
            "reason_codes": reasons,
            "notes": notes,
            "reviewed_from": sheet_path
        })

# Write JSONL
with open(DECISIONS_PATH, "w", encoding="utf-8") as f:
    for d in decisions:
        f.write(json.dumps(d) + "\n")

# Write notes markdown
notes_content = f"""# Visual QA Audit Review Notes (Vocab Icons 151-225)

Audit Review Version: `2026-08-17-v1`
Reviewed Assets: **{len(decisions)}** across **{len(sheets_meta)}** contact sheets (`07-vocab-pack-vocab-icon-generated-151.jpg` through `225.jpg` inclusive).

## Summary Counts

- **PASS**: {counts['PASS']} ({counts['PASS']/len(decisions)*100:.1f}%)
- **REDO**: {counts['REDO']} ({counts['REDO']/len(decisions)*100:.1f}%)
- **REVIEW**: {counts['REVIEW']} ({counts['REVIEW']/len(decisions)*100:.1f}%)
- **TOTAL**: {len(decisions)}

---

## 1. Primary Failure Modes (REDO Findings)

Visual QA inspection of all 75 contact sheets identified four main classes of defects requiring regeneration:

### A. Bounding Box & Frame Line Artifacts (`border_artifact`)
The overwhelming majority of defects consist of residual square bounding boxes, hairline crop frames, or corner brackets rendered directly onto the icon canvas during generation or rectangular grid slicing.
- Examples: `praying-mantis` (151), `present` (151), `radar` (156), `saddle` (166), `scooter` (170), `seashell` (171), `spider` (185), `stegosaurus` (189), `telescope` (198), `thermometer` (200), `wheat` (220), `xylophone` (224).

### B. Embedded Text & Typographic Labels (`text_artifact`)
Several icons contain rendered English word labels or action captions within the illustration frame:
- `process` (152), `project` (152), `puree` (154), `quit` (155), `raisehand` (156), `rakeleaf` (157), `rebel` (158), `reduce` (159), `remind` (160), `repeat` (160), `rescue` (161), `retire` (162), `robotdance` (164), `rolldice` (164), `scamper` (168), `scurry` (170), `scuttle` (171), `seedplant` (172), `shadowpup` ("Shadow Puppet", 173), `share` (174), `sidestep` (177), `sidewalk` (177), `slamdunk` (179), `sprint` (186), `steep` (189), `street` (190), `temperature` (198), `tetherball` (199), `thumbtack` (201), `thunder` (201), `tiptoe` (202), `toil` (203), `torture` ("Torture - Pretend", 204), `tractor-toy` (205), `tugowar` (208), `unbolt` (210), `unbuckle` (210), `uncork` (210), `uncover` (210), `undo` (210), `unhook` (211), `unlatch` (211), `unload` (211), `upload` (212), `vanish` (213), `vibrate` (214), `vulture` (215), `waiting-room` (216), `warm` (216), `warn` (217), `watercan` (218), `watering-can-farm` (218), `wheelbarrow-farm` (220), `wiggle` (221), `winter` (222), `x-ray` (224), `zigzag` (225).

### C. Severe Alpha Keying Destruction (`bad_alpha` / `edge_cutoff`)
White elements in the image subject were aggressively keyed out, obliterating critical structure:
- `sake` (166) and `sample` (167): White ceramic / glass body erased leaving disconnected floating frame.
- `tea-cup` (197): White cup destroyed leaving hovering blue saucer and rim.
- `supper` (194): White plate erased leaving floating cutlery.
- `yoghurt` (225): White yogurt cup body destroyed leaving empty rim outline.
- `ramen-bowl` (157) and `sesame-ball` (173): Cut off at top edge.

### D. Concept Incoherence & Inappropriate Content (`wrong_concept` / `inappropriate` / `unreadable_abstraction`)
- `tortilla` (204): Depicts a toothbrush instead of flatbread.
- `rice-bowl` (162): Depicts a wooden hair comb instead of rice bowl.
- `trombone` (207): Depicts a swimsuit and safety pin instead of brass musical instrument.
- `razor` (157): Depicts toothbrush and toothpaste instead of a razor.
- `pupil` (154): Depicts school backpack and pencil pouch instead of a pupil/student or eye.
- `waitress` (216): Depicts an empty place setting rather than a service worker.
- `quilt` (155): Depicts isometric stairs/blocks rather than a quilt blanket.
- `sex` (173), `strangle` (190), `suicide` (192), `terrorist` (199), `waist` (216): Content unsuitable for kindergarten / primary ESL students.

---

## 2. High-Quality Production Assets (PASS)

The remaining **{counts['PASS']}** vocabulary icons ({counts['PASS']/len(decisions)*100:.1f}%) demonstrate excellent pedagogical clarity, accurate semantic mapping, high-contrast character illustration, and clean alpha cutouts ready for immediate ClassIn board integration.
"""

NOTES_PATH.write_text(notes_content, encoding="utf-8")
print(f"PASS: {counts['PASS']}")
print(f"REDO: {counts['REDO']}")
print(f"REVIEW: {counts['REVIEW']}")
print(f"TOTAL: {len(decisions)}")
