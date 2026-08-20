# Upstream Repair Visual Review

Reviewer: `gpt-5.5-medium` focused multimodal review

Follow-up reviewers: `gpt-5.5-medium` focused multimodal reviews on repaired evidence sheets, completed after final baseline commit `4d22f6e4`.

## Verdict

The representative sheets justify splitting pipeline defects from true source-art redo. The strongest pipeline evidence is crop/cell slicing, black-field/keying, white-object preservation, identity-map mismatch, and B2 3x3 source-sheet extraction. B2 was validated on readable local raw sheets only; one corrupt local PNG was skipped and recorded.

## Family Notes

- `Pre-A1 relations`: top relation cards are strong; lower samples still show crop/keying defects, supporting `PIPELINE_REBUILD` rather than automatic art redo.
- `Mnemonic A-Z`: A-P look good; Q-Y show slicing/cropping problems, supporting pipeline classification.
- `B2 extracted cells`: PASS for representative extraction mechanics; 27 cells from 3 readable raw 3x3 source sheets are cleanly separated and source sheets are preserved.
- `EDB setting variants`: coherent stage/background assets with clear center space; no obvious source-art redo in the sample.
- `White/light keyed objects`: mostly supports the repair claim; some sampled concepts such as `genetic`, `marionette`, and artifacted gloves remain true source-art or human-review issues.
- `Farm/tree identity mapping`: mixed but useful; tree identity mostly works, while some text/duplicate/mismatched concepts are source-art or human-review cases.
- `Black-block/post-processing`: mostly clean; labeled/scene-like examples such as `overtake` are source-art redo, not a post-process issue.

## Follow-Up Review Notes

- `Pre-A1 relations`: PASS/HUMAN_REVIEW samples at the top of the sheet remain production-good; lower repaired derivatives still show crop/keying failures and correctly remain `PIPELINE_REBUILD` or source-art rejection rather than `PASS`.
- `Mnemonic A-Z`: A-P remain production-good; Q-Y still show slice/crop failures and correctly remain pipeline work.
- `B2 extracted cells`: extraction proof remains production-good overall; a few cells are conceptually borderline, but no additional art-redo or pipeline category change is required from the proof sheet.
- `EDB setting variants`: setting backgrounds remain production-good overall, with only light preference-level contrast/sparsity notes.
- `White/light keyed objects`: `genetic` and `marionette` were already `ART_REDO`, and `gloves-latex` was already `REVIEW`. Follow-up review moved `chef-hat`, `cotton`, `cotton-ball`, and `cotton-swab` from final `PASS` to final `REVIEW` because they are pale or visually ambiguous at classroom scale.
- `Farm/tree identity mapping`: clear tree/farm assets remain PASS; duplicate, low-resolution, opaque-box, text, or identity mismatch cases remain split between `REVIEW`, `ART_REDO`, and `PIPELINE_REBUILD`.
