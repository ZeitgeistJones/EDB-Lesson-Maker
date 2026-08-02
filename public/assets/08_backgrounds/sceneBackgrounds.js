/* sceneBackgrounds.js — pick a board background for a lesson section.
 *
 * Classic script (no ES modules) — attaches to window.SceneBackgrounds,
 * matching the pattern used by buildEdb.js and vocabIcons.js.
 *
 * Two kinds of background, and the distinction matters:
 *
 *   SCENE  — a real place with a ground plane (classroom, bakery, farm).
 *            Used for scene-building activities where the student drags
 *            objects INTO an environment. Every scene declares a groundY:
 *            the pixel row where the standing surface begins, so a piece's
 *            BASE sits there and it looks like it's standing on the floor.
 *
 *   FLAT   — a near-plain wash. Used for functional pages (matching,
 *            fill-in-the-blank, vocabulary grids) where the structure comes
 *            from cards drawn on top and the background should disappear.
 *
 * Sections that don't describe a place — warm-up, wrap-up, grammar drill —
 * get a FLAT. Forcing them into a scene looks arbitrary and reads worse
 * than a clean background.
 */

(function () {
  const BASE = 'assets/08_backgrounds';
  let _manifest = null;

  async function manifest() {
    if (_manifest) return _manifest;
    const res = await fetch(`${BASE}/manifest.json`);
    if (!res.ok) throw new Error(`background manifest not found at ${BASE}/manifest.json`);
    _manifest = await res.json();
    return _manifest;
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  }

  /**
   * Score every scene against a set of tags.
   * Returns [{name, scene, score}] sorted best-first.
   *
   * Scoring:
   *   +3  tag matches one of the scene's own tags exactly
   *   +2  tag matches the scene's name (e.g. "bakery" -> bakery)
   *   +1  category match
   * Ties break on tag-list length — a scene with FEWER tags that still
   * matched is more specific, so bakery(4 tags) beats grocery-store(4) only
   * if it also matched on name. This is deliberate: without it the winner
   * was whichever key happened to come first in the object, which is
   * arbitrary and changes silently.
   */
  async function rank(tags, category) {
    const m = await manifest();
    const want = new Set(tags.flatMap(norm));
    const out = [];

    for (const [name, scene] of Object.entries(m.scenes)) {
      let score = 0;
      const sceneTags = new Set((scene.tags || []).flatMap(norm));
      const nameWords = new Set(norm(name));

      for (const t of want) {
        if (sceneTags.has(t)) score += 3;
        if (nameWords.has(t)) score += 2;
      }
      if (category && scene.category === category) score += 1;

      if (score > 0) out.push({ name, scene, score, specificity: (scene.tags || []).length });
    }

    out.sort((a, b) =>
      b.score - a.score ||
      a.specificity - b.specificity ||
      a.name.localeCompare(b.name)          // final deterministic tiebreak
    );
    return out;
  }

  /**
   * Pick a background for one lesson section.
   *
   * Returns:
   *   { type:'scene', name, file, path, groundY, score }
   *   { type:'flat',  name, file, path, reason }
   *
   * minScore is the confidence floor. A single weak tag overlap (score 3)
   * often produces a scene that's only loosely related — "food" matching a
   * grocery store for a lesson about table manners. Below the floor we'd
   * rather show a clean flat than a wrong place.
   */
  async function pickFor(section, opts = {}) {
    const minScore = opts.minScore ?? 4;
    const m = await manifest();

    const tags = [
      ...(section.tags || []),
      ...norm(section.title),
      ...(section.vocabulary || []).map(v => (typeof v === 'string' ? v : v.word)),
    ].filter(Boolean);

    const ranked = await rank(tags, section.category);

    if (ranked.length && ranked[0].score >= minScore) {
      const best = ranked[0];
      return {
        type: 'scene',
        name: best.name,
        file: best.scene.file,
        path: `${BASE}/img/${best.scene.file}`,
        groundY: best.scene.groundY,
        score: best.score,
        runnersUp: ranked.slice(1, 3).map(r => `${r.name}(${r.score})`),
      };
    }

    // no confident scene -> flat, chosen by section index so consecutive
    // functional pages don't all look identical
    const flatKeys = Object.keys(m.flats);
    const key = flatKeys[(opts.index || 0) % flatKeys.length];
    return {
      type: 'flat',
      name: key,
      file: m.flats[key].file,
      path: `${BASE}/img/${m.flats[key].file}`,
      reason: ranked.length
        ? `best match ${ranked[0].name} scored ${ranked[0].score}, below floor of ${minScore}`
        : 'no scene matched any tag',
    };
  }

  /** Pick for a whole lesson at once. Useful for previewing the plan. */
  async function planFor(sections, opts = {}) {
    const out = [];
    let flatCount = 0;                    // rotate flats across FLAT pages only,
    for (let i = 0; i < sections.length; i++) {   // not across section index, or
      const p = await pickFor(sections[i], { ...opts, index: flatCount });  // two
      if (p.type === 'flat') flatCount++;         // flats several pages apart end
      out.push(p);                                // up identical.
    }
    return out;
  }

  /** Load a background as bytes, ready for EdbKit.addImage. */
  async function loadPng(pick) {
    const res = await fetch(pick.path);
    if (!res.ok) throw new Error(`background not found: ${pick.path}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  /**
   * Where to place a piece so it stands on the ground.
   * For a flat background there's no ground plane, so pieces are centred
   * in the lower half instead.
   */
  function standOn(pick, pieceHeight) {
    if (pick.type === 'scene' && pick.groundY) return pick.groundY - pieceHeight;
    return Math.round(590 * 0.55) - Math.round(pieceHeight / 2);
  }

  window.SceneBackgrounds = { manifest, rank, pickFor, planFor, loadPng, standOn, BASE };
})();
