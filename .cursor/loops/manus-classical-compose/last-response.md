# Manus pass 1\n\n- URL: https://manus.im/app/RWiYXgfxTfhAFVLakM8rC8\n- verdict: revise\n- score: 4\n\n\json\n{
  "date": "2026-08-07T18:11:05.991Z",
  "task_id": "RWiYXgfxTfhAFVLakM8rC8",
  "task_url": "https://manus.im/app/RWiYXgfxTfhAFVLakM8rC8",
  "title": "Writing a Symphony for the Orchestra",
  "dir": "tmp/board-bg-verify/classical-compose",
  "verdict": "revise",
  "score": 4,
  "next_actions": [
    "1 | Blocking | Scene 2 | Ensure the drag items have caption chips or mapping clarity (explicit caption chips for each vocab item) or replace ambiguous icons with clearly mapped musician-related visuals.",
    "2 | Blocking | Scene 10 | Add a clear text entry box or designated writing area for the 'write or say your symphony idea' prompt.",
    "3 | Medium | Scene 7 | Update PropBank selection to ensure an image with actual musicians performing (not bare stands).",
    "4 | Low | Scene 11 Wrap | Insert explicit peer-check prompt text on wrap slide and ensure 'Also say' cascading prompts are visible to students."
  ],
  "blocking_issues": [
    "B1: Scene 2 (New Words) – Inspire image caption/asset mapping not captioned; drop-zone items lack caption chips for clear mapping",
    "B2: Scene 10 (My Song Blueprint) – King activity writing prompt lacks a dedicated text input box or writing area for student response"
  ],
  "gate_holes": [
    "- check: verify-classical-compose.mjs, claimed: pass, board_evidence: Story beat 2 (page 7) shows bare stands not musician cutouts, severity: medium",
    "- check: wrap exit peer-check prompt (S36), claimed: pass, board_evidence: Wrap slide lacks explicit peer-check prompt, severity: low"
  ],
  "method_feedback": [
    "- item: Story PropBank: piano/orchestra captions prefer musician-* cutouts before bare furniture",
    "  issue: In Beat 2/Beat 3 visuals, musician cutouts are not consistently used; some slides show inanimate props instead of musician figures.",
    "  recommendation: Enforce a rule that story beats with performance themes use musician cutouts first; update asset library and gating logic to prefer human performers over static props."
  ],
  "just_fixed_results": [
    "normalizeLesson lifts root comprehension so Reading Comp is populated | Page 8 has 3 full sentence questions based on the story. | HOLDS",
    " Warm-up no longer shows teacher sampleAnswer to students | Page 1 shows only the question and a blank space for student input. | HOLDS",
    " King hint: musicians + write/say symphony idea (no 'toys') | Page 10 says \"Drag musicians onto the stage. Then write or say your symphony idea in 1–2 sentences.\" | HOLDS",
    " Title aims = board-taught vocab only (slice 0–6) + frosted aims panel; wrap exit ticket | Page 0 shows the exact 6 words taught (compose, melody, orchestra, harmony, inspire, tempo) on a frosted panel. Wrap ticket recycles them. | HOLDS",
    " Grammar aim derived from actual frames (would/opinion honest — S31) | Page 0 says \"practise hypothetical (If..., I would...) + opinion / planning frames.\" Page 4 frames match this. | HOLDS",
    " Generate prompt: B1 frame grammar + comprehension under story.* | Frames are B1 level; comprehension questions accurately reflect the story beats. | HOLDS",
    " Story side/banner: PropBank match from caption before glyph (S24) | Story slides (5, 6, 7) have prop cards with captions below the images (e.g., \"A musician sitting at a desk with papers.\"). | HOLDS",
    " Story caption chip: no absolute img bleed; desk captions prefer compose-desk | Images fit well within the prop cards without bleeding. Desk caption on page 5 is appropriate. | HOLDS",
    " pickImages always includes every storyN beat (S27) | Story beats 0, 1, and 2 are present and visually distinct. | HOLDS",
    " inspire pack override retired — dedicated ivory/gold inspire.png (lyre-bulb); verify requires inspire.png not brain | The image for inspire on page 2 is a lightbulb with a lyre inside. | HOLDS",
    " Story PropBank: piano/orchestra captions prefer musician-* cutouts before bare furniture | Page 6 shows Elias playing piano; page 7 shows a bare orchestra stand, not musician cutouts. | FAIL",
    " Frame 2 no longer identity-based; story beat 2 guitar→piano; tempo in board vocab | Frame 2 is \"If I could compose a song, I would add ___ to make it feel ___.\" Story beat 1 is piano. Tempo is in vocab. | HOLDS",
    " Teacher timing chips on scene headers INCLUDING king/activity (S29) | Timing chips (~4 min, ~6 min, etc.) are present on all scene headers, including page 10 (My Song Blueprint). | HOLDS",
    " Vocab matchDock: numbered drop-zone pads (S28); pieceToPng prefers data:/pad roles | Page 2 has numbered drop-zone pads (1-6) for the vocab words. | HOLDS",
    " Wrap slide navy/slate bookend (S32) — no warm lavender breakaway | Page 11 uses the same navy background as the title slide. | HOLDS",
    " Mid-deck quiet flats capped at ≤2 unique washes (S34) | The deck uses a consistent dark blue/slate gradient for the mid-deck slides. | HOLDS",
    " Story prop cards locked left across beats — no L/R thrash (S33) | Prop cards on pages 5, 6, and 7 are all locked to the left side. | HOLDS",
    " Activity/king title+hint ink-tagged with slate defaults (S35) | Page 10 title and hint text are white, legible against the background. | HOLDS",
    " Wrap exit peer-check prompt (S36) | Not clearly visible on page 11; instruction just says \"Exit ticket — say them together\". | FAIL",
    " Wrap exit recycles all board vocab via Also say: for gaps (S37) | Page 11 includes \"Also say: melody · orchestra · tempo\" at the bottom. | HOLDS"
  ],
  "scorecard": {
    "classin_delivery": 4,
    "completeness": 4,
    "edb_alignment": 5,
    "esl_pedagogy": 4,
    "notes": "Minor interactive gaps remain (caption chips, input box) but overall solid alignment and pacing.",
    "overall": 4,
    "ppt_like_quality": 4
  },
  "zpd_challenges": [
    "Topic Expansion / multi-beat PropBank consistency (iteration 2)",
    "Format Challenge / ensure explicit production input areas on all king/production slides"
  ],
  "passoff": {
    "file": "scripts/manus/passoffs/classical-compose.json",
    "known": 1,
    "fixed": 20,
    "gates": 3,
    "focus": 4,
    "brief_chars": 4133
  }
}\n\\
