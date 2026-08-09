/* boardReadiness.js — judge a planned board before Download ships it.
 *
 * Generate stays fast (text only). This gate answers: is the board Ready or
 * Draft? Ready = theme kit used when available + enough vocab art. Draft =
 * downloadable with an honest warning — never silently "done" when hollow.
 *
 * Classic script → window.BoardReadiness
 */
(function () {
  const VOCAB_ART_FLOOR = 0.5; // ≥ half the words need real prop or vetted icon art

  /** Reasons that are kit / hero-stage concerns (filterable via ignoreKit). */
  const KIT_REASON_RE =
    /theme kit|theme stage kit|build\/stage board|heroProp|generic template/i;

  function vocabWords(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .map((w) => String(w));
  }

  /**
   * Art hit = PropBank prop OR VocabIcons vetted pack glyph (not a Gemini guess).
   * Shared PNG / prop key across two words does not count — matches bake
   * uniqueness in wordArtPng (empty > duplicate match cards).
   */
  function vocabArtHits(lesson) {
    const words = vocabWords(lesson);
    const PB = window.PropBank;
    const VI = window.VocabIcons;
    const family = PB && PB.familyFor ? PB.familyFor(lesson) : null;
    const seed = (lesson && lesson.title) || '';
    const exclude = [];
    const usedPaths = new Set();
    const detail = [];
    let hits = 0;
    for (const word of words) {
      let prop = null;
      let vetted = false;
      let path = null;

      if (VI && typeof VI.isCurated === 'function' && VI.isCurated(word)) {
        path = typeof VI.pathForSync === 'function' ? VI.pathForSync(word) : null;
        if (path && !usedPaths.has(path)) {
          vetted = true;
        } else if (!path) {
          // SAFE_EMOJI curated with no pack file — still a distinct glyph hit.
          vetted = true;
        }
      }

      if (!vetted && PB && PB.loaded()) {
        prop = PB.resolve({ word, seed, family, minScore: 3, exclude });
        const propPath = prop && (prop.path || prop.src);
        if (prop && propPath && usedPaths.has(propPath)) prop = null;
        if (prop && exclude.includes(prop.key)) prop = null;
      }

      const ok = !!(prop || vetted);
      if (ok) hits++;
      if (prop) {
        exclude.push(prop.key);
        if (prop.path || prop.src) usedPaths.add(prop.path || prop.src);
      } else if (vetted && path) {
        usedPaths.add(path);
      }
      detail.push({
        word,
        prop: prop ? prop.key : null,
        vetted: !!vetted,
        ok,
      });
    }
    return { hits, total: words.length, ratio: words.length ? hits / words.length : 1, detail };
  }

  function topicBlob(lesson) {
    const words = vocabWords(lesson);
    return [lesson && lesson.title, ...words].filter(Boolean).join(' ');
  }

  /**
   * @param {object} lesson
   * @param {object} [boardPlan] from EdbActivities.buildBoardPlan / plan
   * @param {object} [opts]
   * @param {boolean} [opts.ignoreKit] skip kit/hero-stage reasons (vocab+bg only)
   * @param {object} [opts.bgManifest] backgrounds manifest (flats/scenes); else SB.manifest sync cache
   * @returns {{ status: 'ready'|'draft', reasons: string[], kit: object|null, vocabArt: object, activityRecipe: string|null, bg: object|null }}
   */
  function assess(lesson, boardPlan, opts) {
    opts = opts || {};
    const reasons = [];
    const PB = window.PropBank;
    const SB = window.SceneBackgrounds;
    const kit = PB && PB.assessKit ? PB.assessKit(lesson) : null;
    const vocabArt = vocabArtHits(lesson);

    const assignments = (boardPlan && boardPlan.assignments) || [];
    const act = assignments.find((a) => a.pageKey === 'activity') || null;
    const activityRecipe = act ? act.recipeId : null;

    if (vocabArt.total > 0 && vocabArt.ratio < VOCAB_ART_FLOOR) {
      reasons.push(
        `Only ${vocabArt.hits}/${vocabArt.total} vocab words have board art (need ≥${Math.ceil(VOCAB_ART_FLOOR * 100)}%).`
      );
    }

    if (!opts.ignoreKit) {
      if (kit && kit.ready) {
        if (activityRecipe !== 'heroProp') {
          reasons.push(
            `Theme kit “${kit.pack}” is ready (${kit.dockCount} dock pieces) but the activity is “${activityRecipe || 'none'}” — should be a build/stage board.`
          );
        } else if (act && act.ctx && act.ctx.hero && kit.hero && act.ctx.hero.key !== kit.hero.key) {
          // Soft: different hero still ok if king stage
        }
      } else if (kit && !kit.ready && kit.hero) {
        // Producer honesty: theme pack exists but soft/mushy docks were banned —
        // do not ship as Ready with a hollow king stage.
        const soft = kit.softDockCount || 0;
        reasons.push(
          `Theme pack “${kit.pack}” has stage hero “${kit.hero.key}” but only ${kit.dockCount} sharp dock toys (need ≥6${soft ? `; ${soft} soft scraps blocked` : ''}). Regen docks at ≥120px short side.`
        );
      }

      // Hollow activity: no kit, no hero, collage recipe — fine as draft text board
      if (!kit && activityRecipe && activityRecipe !== 'heroProp' && vocabArt.ratio < 0.75) {
        reasons.push(
          'No theme stage kit matched — activity is a generic template. Add a pack or accept a draft board.'
        );
      }
    }

    let bg = null;
    if (SB && typeof SB.bgCoverage === 'function') {
      let manifest = opts.bgManifest || null;
      // Prefer explicit manifest; sync cache may not exist until planFor/manifest().
      if (!manifest && typeof SB._cachedManifest === 'function') {
        manifest = SB._cachedManifest();
      }
      if (manifest) {
        bg = SB.bgCoverage(topicBlob(lesson), manifest);
        if (bg && bg.gap) {
          reasons.push(
            bg.reason ||
              (bg.set
                ? `Place set “${bg.set}” needs ≥2 quiet flats (have ${bg.flats}).`
                : 'Place theme has no quiet flat TOPIC_SETS coverage.')
          );
        }
      }
    }

    let filtered = reasons;
    if (opts.ignoreKit) {
      filtered = reasons.filter((r) => !KIT_REASON_RE.test(r));
    }

    const status = filtered.length ? 'draft' : 'ready';
    return {
      status,
      reasons: filtered,
      kit: kit && kit.ready
        ? { pack: kit.pack, hero: kit.hero.key, docks: kit.dockCount, score: kit.score }
        : null,
      vocabArt: {
        hits: vocabArt.hits,
        total: vocabArt.total,
        ratio: Number(vocabArt.ratio.toFixed(2)),
        detail: vocabArt.detail,
      },
      activityRecipe,
      bg,
    };
  }

  function summaryLine(report) {
    if (!report) return '';
    if (report.status === 'ready') {
      const kit = report.kit ? ` · kit ${report.kit.pack}` : '';
      const bg = report.bg && report.bg.set ? ` · bg ${report.bg.set}` : '';
      return `Ready to teach${kit}${bg} · vocab art ${report.vocabArt.hits}/${report.vocabArt.total}`;
    }
    return `Draft board · ${report.reasons[0] || 'needs review'}`;
  }

  window.BoardReadiness = {
    assess,
    vocabArtHits,
    summaryLine,
    VOCAB_ART_FLOOR,
    KIT_REASON_RE,
  };
})();
