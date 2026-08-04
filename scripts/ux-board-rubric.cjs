/**
 * UX review rubric for board previews (agent + human).
 * Used by preflight: after bake, look at JPGs against these questions.
 *
 * Hard fails (must fix in code before ClassIn):
 *   H1  Wrong place (clinic lesson shows street/home; gym shows kitchen)
 *   H2  One wallpaper on every page (no flat/scene mix)
 *   H3  Unlocked pieces covering word cards / question text
 *   H4  Old solid gradient chrome still baked (scenes never applied)
 *
 * Soft UX (judge from images; fix when clearly bad):
 *   S1  Title readable on scene (wash strong enough, not muddy)
 *   S2  Drill pages feel like classroom surfaces (chalk/cork/desk/whiteboard)
 *   S3  Story pages feel like “being there”; drills feel like worksheets
 *   S4  Dock icons look intentional (aligned, not floating in empty void)
 *   S5  Cards opaque enough; text not fighting busy scenery
 *   S6  Rhythm: scene → flat → flat → scene… not scene spam or flat spam
 *   S7  Placeholders (emoji-only art blocks) don’t look broken if common
 *   S8  Story side-art emoji matches place (not Gemini visualTheme lies)
 *   S9  No html2canvas checkerboard behind icons
 *
 * Out of scope for this loop (needs ClassIn / product later):
 *   Real drag feel, lock=1 vs 3, generated story art, prop collage
 */
module.exports = {
  HARD: ['H1', 'H2', 'H3', 'H4'],
  SOFT: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9'],
};
