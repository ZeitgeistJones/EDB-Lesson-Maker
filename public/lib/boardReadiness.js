/* boardReadiness.js — judge a planned board before Download ships it.
 *
 * Generate stays fast (text only). This gate answers: is the board Ready or
 * Draft? Ready = theme kit used when available + enough vocab art. Draft =
 * downloadable with an honest warning — never silently "done" when hollow.
 *
 * Classic script → window.BoardReadiness
 */
(function () {
  const VOCAB_ART_FLOOR = 5 / 6; // ≥5/6 words need real prop or vetted icon art (~83%)

  /** Reasons that are kit / hero-stage concerns (filterable via ignoreKit). */
  const KIT_REASON_RE =
    /theme kit|theme stage kit|build\/stage board|heroProp|generic template/i;

  function maxBoardVocab() {
    return (window.VocabArt && window.VocabArt.MAX_BOARD_VOCAB) || 6;
  }

  function vocabWords(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .map((w) => String(w));
  }

  /**
   * Prefer VocabArt.planFor (same ladder as bake). Falls back to legacy
   * pack/PropBank scan when VocabArt is unavailable or index is cold.
   */
  function vocabArtHits(lesson, boardPlan) {
    const planned = boardPlan && boardPlan.vocabArt;
    if (planned && Array.isArray(planned.rows)) {
      const detail = planned.rows.map((r) => ({
        word: r.word,
        prop: r.propKey || null,
        vetted: r.tier === 'pack' || r.tier === 'glyph',
        tier: r.tier,
        ok: !!r.matchable,
      }));
      const hits = detail.filter((d) => d.ok).length;
      const total = detail.length;
      return { hits, total, ratio: total ? hits / total : 1, detail };
    }

    if (window.VocabArt && typeof window.VocabArt.planFor === 'function'
      && window.VocabIcons && typeof window.VocabIcons.indexReady === 'function'
      && window.VocabIcons.indexReady()
      && !(window.VocabIcons.loadError && window.VocabIcons.loadError())) {
      try {
        const PB = window.PropBank;
        const art = window.VocabArt.planFor(lesson, {
          family: PB && PB.familyFor ? PB.familyFor(lesson) : null,
          seed: (lesson && lesson.title) || '',
        });
        return vocabArtHits(lesson, { vocabArt: art });
      } catch (_) {
        /* fall through to legacy */
      }
    }

    const words = vocabWords(lesson);
    const PB = window.PropBank;
    const VI = window.VocabIcons;
    const family = PB && PB.familyFor ? PB.familyFor(lesson) : null;
    const seed = (lesson && lesson.title) || '';
    const exclude = [];
    const usedPaths = new Set();
    const detail = [];
    let hits = 0;
    const floor = (PB && PB.DEFAULT_MIN_SCORE) || 4;
    for (const word of words) {
      let prop = null;
      let vetted = false;
      let path = null;

      if (VI && typeof VI.isCurated === 'function' && VI.isCurated(word)) {
        path = typeof VI.pathForSync === 'function' ? VI.pathForSync(word) : null;
        if (path && !usedPaths.has(path)) {
          vetted = true;
        } else if (!path) {
          vetted = true;
        }
      }

      if (!vetted && PB && PB.loaded()) {
        prop = PB.resolve({ word, seed, family, minScore: floor, exclude });
        const propPath = prop && (prop.path || prop.src);
        if (prop && propPath && usedPaths.has(propPath)) prop = null;
        if (prop && exclude.includes(prop.key)) prop = null;
        if (prop && window.VocabArt && typeof window.VocabArt.headNounOk === 'function'
          && !window.VocabArt.headNounOk(word, prop)) {
          prop = null;
        }
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

  function storyArtGaps(lesson, boardPlan) {
    const meta = (boardPlan && boardPlan.meta) || {};
    const pages = (window.EdbActivities && window.EdbActivities.storyPagesForBoard)
      ? window.EdbActivities.storyPagesForBoard(lesson, meta)
      : ((lesson && lesson.story && lesson.story.pages) || []).slice(0, 1);
    if (!pages.length) return [];
    const probe = window.LessonPages && typeof window.LessonPages.storyFallbackVisual === 'function'
      ? window.LessonPages.storyFallbackVisual.bind(window.LessonPages)
      : null;
    if (!probe) return [];
    const gaps = [];
    pages.forEach((sp, i) => {
      const vis = probe(lesson, sp);
      if (!vis || vis.type === 'none' || (vis.type === 'emoji' && !vis.emoji)) {
        gaps.push(i);
      }
    });
    return gaps;
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
    const vocabArt = vocabArtHits(lesson, boardPlan);

    const assignments = (boardPlan && boardPlan.assignments) || [];
    const act = assignments.find((a) => a.pageKey === 'activity') || null;
    const activityRecipe = act ? act.recipeId : null;
    const hasVocab = vocabArt.total > 0;
    const matchAssign = assignments.find((a) => a.pageKey === 'newWords' && a.recipeId === 'matchDock');

    // Generate may return 7 (30min) / 12 (60min); board + PDF only teach MAX.
    // After coverage adapt, overflow = words past the art-preferred board six.
    const allWords = vocabWords(lesson);
    const ceil = maxBoardVocab();
    const adapted = lesson && lesson._vocabAdapted;
    if (allWords.length > ceil) {
      const overflow = allWords.slice(ceil);
      const names = overflow.slice(0, 4).join(', ');
      if (adapted && adapted.changed) {
        const boardNames = (adapted.after || allWords.slice(0, ceil)).slice(0, 4).join(', ');
        reasons.push(
          `Board adapted to art coverage — teaches ${boardNames}${(adapted.after || []).length > 4 ? '…' : ''}; ${overflow.length} more not on cards/PDF: ${names}${overflow.length > 4 ? '…' : ''}.`
        );
      } else {
        reasons.push(
          `${overflow.length} vocab word(s) past board ceiling of ${ceil} (not on cards/PDF): ${names}${overflow.length > 4 ? '…' : ''}.`
        );
      }
    } else if (adapted && adapted.changed && adapted.promoted && adapted.promoted.length) {
      reasons.push(
        `Board vocab reordered for art coverage (promoted: ${adapted.promoted.slice(0, 4).join(', ')}${adapted.promoted.length > 4 ? '…' : ''}).`
      );
    }

    if (vocabArt.total > 0 && vocabArt.ratio < VOCAB_ART_FLOOR) {
      reasons.push(
        `Only ${vocabArt.hits}/${vocabArt.total} vocab words have board art (need ≥${Math.ceil(VOCAB_ART_FLOOR * 100)}%).`
      );
    }

    if (hasVocab && boardPlan && boardPlan.canHonestMatchDock === false && !matchAssign) {
      const matchableN = boardPlan.vocabArt && boardPlan.vocabArt.matchable
        ? boardPlan.vocabArt.matchable.length
        : 0;
      if (matchableN === 0) {
        reasons.push(
          'Match dock skipped — no vetted pictures for an honest N-to-N drag (text-only cards).'
        );
      } else {
        reasons.push(
          'Match dock skipped — vetted pictures would not fit the dock at ≥96px (text-only cards).'
        );
      }
    }

    const dropped = boardPlan && boardPlan.vocabArt && boardPlan.vocabArt.dropped;
    if (dropped && dropped.length && matchAssign) {
      const names = dropped.map((d) => d.word).slice(0, 4).join(', ');
      reasons.push(
        `Dropped ${dropped.length} vocab word(s) from match dock (no vetted art): ${names}${dropped.length > 4 ? '…' : ''} (admin — student board does not announce this).`
      );
    } else if (dropped && dropped.length && !matchAssign && boardPlan.canHonestMatchDock !== false) {
      // Dock not assigned for another reason — still surface missing art.
      const names = dropped.map((d) => d.word).slice(0, 4).join(', ');
      reasons.push(
        `No vetted art for ${dropped.length} vocab word(s): ${names}${dropped.length > 4 ? '…' : ''}.`
      );
    }

    const dockDrops = boardPlan && Number(boardPlan.dockDrops);
    if (dockDrops > 0) {
      reasons.push(
        `Activity dock silently dropped ${dockDrops} piece(s) that would not fit the grab floor.`
      );
    }

    const storyGaps = storyArtGaps(lesson, boardPlan);
    if (storyGaps.length) {
      reasons.push(
        `Story page(s) ${storyGaps.map((i) => i + 1).join(', ')} have no vetted art (caption-only plate — not a fake book).`
      );
    }

    // S73 — story↔comprehension honesty (clubs PDF: choir Q / truncated "Ben").
    // Silent StoryIntegrity repair is not Ready: surface Draft so teachers see it.
    const SI = window.StoryIntegrity;
    if (SI && typeof SI.audit === 'function') {
      const prior = (lesson && lesson._storyIntegrity) || null;
      const live = SI.audit(lesson);
      const dropped = (prior && prior.droppedQuestions && prior.droppedQuestions.length)
        ? prior.droppedQuestions
        : (live.droppedQuestions || []);
      const truncated = !!(prior && prior.truncatedRepaired)
        || !!(live.truncatedRepaired)
        || ((live.pages || []).some((p, i) => {
          const raw = (((lesson.story && lesson.story.pages) || [])[i] || {}).text;
          return SI.isTruncatedPageText && SI.isTruncatedPageText(raw);
        }));
      if (dropped.length) {
        const names = dropped.slice(0, 2).map((q) => String(q).slice(0, 48)).join(' · ');
        reasons.push(
          `S73: ${dropped.length} comprehension question(s) not grounded in the story${names ? ` (${names}${dropped.length > 2 ? '…' : ''})` : ''} — fix story/Qs (repair alone keeps Draft).`
        );
      }
      if (truncated) {
        reasons.push(
          'S73: story page text truncates mid-sentence — finish the beat before Ready.'
        );
      }
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
        const soft = kit.softDockCount || 0;
        reasons.push(
          `Theme pack “${kit.pack}” has stage hero “${kit.hero.key}” but only ${kit.dockCount} sharp dock toys (need ≥6${soft ? `; ${soft} soft scraps blocked` : ''}). Regen docks at ≥120px short side.`
        );
      }

      if (!kit && activityRecipe && activityRecipe !== 'heroProp' && vocabArt.ratio < 0.75) {
        reasons.push(
          'No theme stage kit matched — activity is a generic template. Add a pack or accept a draft board.'
        );
      }
    }

    let bg = null;
    if (SB && typeof SB.bgCoverage === 'function') {
      let manifest = opts.bgManifest || null;
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
    const vocabAdapted = (lesson && lesson._vocabAdapted) || (boardPlan && boardPlan.vocabAdapt) || null;
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
      vocabAdapt: vocabAdapted && vocabAdapted.changed
        ? {
            adapted: true,
            promoted: vocabAdapted.promoted || [],
            board: vocabAdapted.after || vocabAdapted.board || [],
          }
        : { adapted: false },
      activityRecipe,
      bg,
      dockDrops: dockDrops || 0,
      canHonestMatchDock: boardPlan ? !!boardPlan.canHonestMatchDock : null,
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
    maxBoardVocab,
  };
})();
