/* boardReadiness.js — judge a planned board before Download ships it.
 *
 * Generate stays fast (text only). This gate answers: is the board Ready or
 * Draft? Ready = theme kit used when available + enough vocab art. Draft =
 * downloadable with an honest warning — never silently "done" when hollow.
 *
 * Classic script → window.BoardReadiness
 *
 * ── The art floor is measured over the ADAPTED BOARD, not the whole list ────
 * VocabArt.adaptBoardVocabulary decides how many words the board teaches
 * (boardCount: usually 4–6; may be 1–3 when honestly short — those stay Draft).
 * Everything here scores that slice:
 *
 *   boardCount 6, 6 pictured → 6/6 = 1.00 → Ready
 *   boardCount 5, 5 pictured → 5/5 = 1.00 → Ready   (honest short board)
 *   boardCount 4, 4 pictured → 4/4 = 1.00 → Ready   (honest short board)
 *   boardCount 3, 3 pictured → Draft (below MIN_BOARD_VOCAB)
 *   boardCount 4, 3 pictured → 3/4 = 0.75 → Draft   (too few to be honest)
 *
 * Thin pictured lists should theme-bank-fill toward four before Ready; we do
 * not pad with blank icon cards.
 *
 * Previously vocabWords() returned the FULL vocabulary list despite a comment
 * saying it was board-sliced, so the legacy fallback path scored the floor over
 * all 7 or 12 generated words and produced false Drafts whenever VocabArt was
 * cold. It is board-sliced now; allVocabWords() is the full list, used only for
 * the overflow check.
 */
(function () {
  const VOCAB_ART_FLOOR = 5 / 6; // ≥5/6 of the BOARD words need real art (~83%)

  /** Reasons that are kit / hero-stage concerns (filterable via ignoreKit). */
  const KIT_REASON_RE =
    /theme kit|theme stage kit|build\/stage board|heroProp|generic template/i;

  function maxBoardVocab() {
    return (window.VocabArt && window.VocabArt.MAX_BOARD_VOCAB) || 6;
  }

  /** How many cells the board actually teaches (adapted). */
  function boardCount(lesson) {
    if (window.VocabArt && typeof window.VocabArt.boardCount === 'function') {
      return window.VocabArt.boardCount(lesson);
    }
    const all = (lesson && lesson.vocabulary) || [];
    const adapted = lesson && lesson._vocabAdapted;
    return Math.min(
      maxBoardVocab(),
      all.length || maxBoardVocab(),
      Math.max(1, Number(adapted && adapted.boardCount) || maxBoardVocab())
    );
  }

  /** Every word the lesson generated — used for the overflow reason only. */
  function allVocabWords(lesson) {
    return ((lesson && lesson.vocabulary) || [])
      .map((v) => (typeof v === 'string' ? v : v && v.word))
      .filter(Boolean)
      .map((w) => String(w));
  }

  /** The words the board and PDF actually teach. */
  function vocabWords(lesson) {
    if (window.VocabArt && typeof window.VocabArt.vocabWords === 'function') {
      return window.VocabArt.vocabWords(lesson);
    }
    return allVocabWords(lesson).slice(0, boardCount(lesson));
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
      // No board words = nothing pictured. Ratio 1 here used to read as a
      // perfect score and slipped an empty board past the art floor.
      return { hits, total, ratio: total ? hits / total : 0, detail };
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
          // Match edbActivities.planVocabArt / adapt — pack icons paint on New Words.
          allowPackFallback: true,
        });
        return vocabArtHits(lesson, { vocabArt: art });
      } catch (_) {
        /* fall through to legacy */
      }
    }

    // Legacy scan — board slice only, same as the ladder above.
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
    return { hits, total: words.length, ratio: words.length ? hits / words.length : 0, detail };
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
   * heroProp semantic contract: the rendered king, planned king, topic resolver,
   * dock family, and learner sentence frame must all tell the same story.
   * Returns null for pre-render plan() calls; buildBoardPlan() reruns readiness
   * after pages exist, so Download approval always receives the strict result.
   */
  function heroStageContract(lesson, boardPlan, act) {
    if (!act || act.recipeId !== 'heroProp' || !boardPlan || !Array.isArray(boardPlan.pages)) {
      return null;
    }
    const page = boardPlan.pages.find((p) => p && p.pageKey === 'activity');
    if (!page) return null;
    const pieces = [...(page.locked || []), ...(page.unlocked || [])];
    const stage = pieces.find((p) => p && (p.role === 'stageHero' || (p.meta && p.meta.stageKing)));
    const dock = pieces.filter((p) => p && p.role === 'dockPiece');
    const heroKey = String((stage && stage.meta && stage.meta.propKey) || '');
    const plannedKey = String((act.ctx && act.ctx.hero && act.ctx.hero.key) || '');
    const resolved = window.EdbActivities && typeof window.EdbActivities.findHeroProp === 'function'
      ? window.EdbActivities.findHeroProp(lesson)
      : null;
    const canonicalKey = String((resolved && resolved.key) || '');
    const dockKeys = dock.map((p) => String((p.meta && p.meta.propKey) || '')).filter(Boolean);
    const isTarget = /^hero-/.test(heroKey);
    const minDock = isTarget ? 3 : 6;
    const cue = [
      lesson && lesson.title,
      lesson && lesson.activity && lesson.activity.title,
      lesson && lesson.activity && lesson.activity.prompt,
      ...((lesson && lesson.vocabulary) || []).map((v) => (typeof v === 'string' ? v : v && v.word)),
    ].filter(Boolean).join(' ');
    const LT = window.LessonTraits;
    const hint = LT && typeof LT.kingHintFor === 'function'
      ? LT.kingHintFor(cue.toLowerCase(), { heroKey })
      : '';
    const languageScaffold = !LT || (/_{3,}/.test(hint) && /\bthen\b/i.test(hint));

    let family = null;
    if (heroKey === 'dental-kid-open-mouth') {
      family = /^(toothbrush-prop|toothpaste-tube|floss-pick|dental-|cavity-tooth|healthy-tooth|food-(?:lollipop|cookie|wrapped-candy-pink)|apple|plastic-cup|milk-carton|reward-star-dental|dentist-character)$/;
    } else if (heroKey === 'face-blank') {
      family = /^(face-|hair-|feeling-)/;
    } else if (heroKey === 'trampoline') {
      family = /^(gym-mat|sports-cone|water-bottle|whistle|stopwatch|jump-rope)$/;
    } else if (heroKey === 'fire-truck') {
      family = /^fire-/;
    } else if (heroKey === 'tent') {
      family = /^camp-/;
    } else if (/^bath-(?:bathtub|sink)$/.test(heroKey)) {
      family = /^bath-/;
    } else if (heroKey === 'hospital-bed') {
      family = /^(hospital-|aid-)/;
    } else if (heroKey === 'playground-slide') {
      family = /^(park-|playground-)/;
    } else if (heroKey === 'cafe-counter-stage') {
      family = /^cafe-/;
    } else if (heroKey === 'farm-barn') {
      family = /^farm-/;
    } else if (heroKey === 'aquarium-tank') {
      family = /^(aquarium-|aq-)/;
    } else if (heroKey === 'construction-tower-crane') {
      family = /^construction-/;
    } else if (heroKey === 'dollhouse-cutaway') {
      family = /^dh-/;
    } else if (heroKey === 'castle-wall-gate') {
      family = /^castle-/;
    }
    const offFamily = family ? dockKeys.filter((key) => !family.test(key)) : [];
    const reasons = [];
    if (!heroKey) reasons.push('no rendered stage hero');
    if (!plannedKey || plannedKey !== heroKey) reasons.push('planned hero does not match rendered stage');
    if (canonicalKey && canonicalKey !== heroKey) reasons.push('lesson topic resolves to a different hero');
    if (dockKeys.length < minDock) reasons.push(`only ${dockKeys.length}/${minDock} visible roleplay tools`);
    if (offFamily.length) reasons.push(`off-topic dock tools: ${offFamily.slice(0, 3).join(', ')}`);
    if (!languageScaffold) reasons.push('missing action-to-language sentence frame');
    return {
      ok: reasons.length === 0,
      heroKey,
      plannedKey,
      canonicalKey,
      dockKeys,
      minDock,
      languageScaffold,
      reasons,
    };
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
    const heroContract = heroStageContract(lesson, boardPlan, act);
    if (heroContract && !heroContract.ok) {
      reasons.push(`heroProp semantic contract failed — ${heroContract.reasons.join('; ')}.`);
    }

    // Generate may return 7 (30min) / 12 (60min); board + PDF teach the adapted
    // slice (4–6 words — see the boardCount policy in vocabArt.js).
    const adapted = lesson && lesson._vocabAdapted;
    const ceil = boardCount(lesson);
    const fullWords = allVocabWords(lesson);
    if (fullWords.length > ceil) {
      const overflow = fullWords.slice(ceil);
      const names = overflow.slice(0, 4).join(', ');
      if (adapted && adapted.changed) {
        // Adapted overflow is expected (same topic, art-preferred board) — do not
        // block Ready. Teachers see the adapt line in UI / vocabAdapt on the report.
      } else {
        reasons.push(
          `${overflow.length} vocab word(s) past board ceiling of ${ceil} (not on cards/PDF): ${names}${overflow.length > 4 ? '…' : ''}.`
        );
      }
    }

    // A board with no words teaches nothing: New Words and the activity page
    // ship empty, and plan() assigns no recipes. Never Ready.
    if (vocabArt.total === 0) {
      reasons.push(
        'Board teaches no vocabulary words — New Words and the activity page would ship empty.'
      );
    }

    // Honest short boards of 1–3 pictured words are allowed to bake, but never Ready.
    const minBoard = (window.VocabArt && window.VocabArt.MIN_BOARD_VOCAB) || 4;
    if (ceil > 0 && ceil < minBoard) {
      reasons.push(
        `Board teaches only ${ceil} word(s) — need ≥${minBoard} pictured for Ready (theme-bank fill or more picturable vocab).`
      );
    }

    if (vocabArt.total > 0 && vocabArt.ratio < VOCAB_ART_FLOOR) {
      reasons.push(
        `Only ${vocabArt.hits}/${vocabArt.total} board words have art (need ≥${Math.ceil(VOCAB_ART_FLOOR * 100)}%). Bank art for more words in this topic, or accept a draft board.`
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

    const artDropped = boardPlan && boardPlan.vocabArt && boardPlan.vocabArt.dropped;
    if (artDropped && artDropped.length && matchAssign) {
      const names = artDropped.map((d) => d.word).slice(0, 4).join(', ');
      reasons.push(
        `Dropped ${artDropped.length} vocab word(s) from match dock (no vetted art): ${names}${artDropped.length > 4 ? '…' : ''} (admin — student board does not announce this).`
      );
    } else if (artDropped && artDropped.length && !matchAssign && boardPlan.canHonestMatchDock !== false) {
      // Dock not assigned for another reason — still surface missing art.
      const names = artDropped.map((d) => d.word).slice(0, 4).join(', ');
      reasons.push(
        `No vetted art for ${artDropped.length} vocab word(s): ${names}${artDropped.length > 4 ? '…' : ''}.`
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
      const droppedQs = (prior && prior.droppedQuestions && prior.droppedQuestions.length)
        ? prior.droppedQuestions
        : (live.droppedQuestions || []);
      const truncated = !!(prior && prior.truncatedRepaired)
        || !!(live.truncatedRepaired)
        || ((live.pages || []).some((p, i) => {
          const raw = (((lesson.story && lesson.story.pages) || [])[i] || {}).text;
          return SI.isTruncatedPageText && SI.isTruncatedPageText(raw);
        }));
      if (droppedQs.length) {
        const names = droppedQs.slice(0, 2).map((q) => String(q).slice(0, 48)).join(' · ');
        reasons.push(
          `S73: ${droppedQs.length} comprehension question(s) not grounded in the story${names ? ` (${names}${droppedQs.length > 2 ? '…' : ''})` : ''} — fix story/Qs (repair alone keeps Draft).`
        );
      }
      if (truncated) {
        reasons.push(
          'S73: story page text truncates mid-sentence — finish the beat before Ready.'
        );
      }
    }

    // S74 — comprehension floor after StoryIntegrity (Manus MZJk B4). Silent drop
    // of ungrounded Qs must not leave a one-question page looking Ready.
    const compQs = (lesson && lesson.story && lesson.story.comprehensionQuestions) || [];
    if (compQs.length < 2) {
      reasons.push(
        `S74: only ${compQs.length} comprehension question(s) after integrity — need ≥2 grounded Qs (recall + sequence/outcome or inferential).`
      );
    }

    // S75 — every frame blank must be completable from the taught bank (Manus MZJk B1).
    if (window.EdbActivities && typeof window.EdbActivities.frameBlankBankable === 'function') {
      const bank = window.EdbActivities.frameBlankBankable(lesson);
      if (bank && bank.ok === false && bank.bad && bank.bad.length) {
        reasons.push(
          `S75: frame blank(s) not completable from taught vocab — rewrite: ${bank.bad.slice(0, 2).join(' · ')}${bank.bad.length > 2 ? '…' : ''}.`
        );
      }
    }

    // S76 — aim-coverage: every board word should appear in story text or a
    // vocab example sentence before speaking/exit (Manus basketball production chain).
    {
      const boardWords = ((boardPlan && boardPlan.vocabArt && boardPlan.vocabArt.rows) || [])
        .map((r) => String((r && r.word) || '').trim().toLowerCase())
        .filter(Boolean);
      if (boardWords.length) {
        const storyBlob = [
          ...((((lesson.story && lesson.story.pages) || []).map((p) => p && p.text)) || []),
          ...((lesson.vocabulary || []).map((v) => (v && typeof v === 'object' ? v.sentence : '') || '')),
        ].join(' ').toLowerCase();
        const missing = boardWords.filter((w) => {
          try {
            return !new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(storyBlob);
          } catch (_) {
            return true;
          }
        });
        if (missing.length) {
          reasons.push(
            `S76: ${missing.length} board word(s) never appear in story/vocab sentences (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}) — contextualise before speaking.`
          );
        }
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

    // Topic Identity Gate — TOPIC_DRIFT when page visuals lean on parent category.
    const TI = window.TopicIdentity;
    let topicBrief = null;
    let topicDrift = null;
    let producerQuality = null;
    if (TI && typeof TI.ensureBrief === 'function') {
      topicBrief = (boardPlan && boardPlan.topicBrief) || TI.ensureBrief(lesson);
      if (topicBrief && typeof TI.auditPage === 'function') {
        const vocabWords = (lesson.vocabulary || [])
          .map((v) => (typeof v === 'string' ? v : v && v.word))
          .filter(Boolean)
          .slice(0, 8);
        const visuals = vocabWords.map((word) => ({ kind: 'vocab', word, pageTags: ['vocabulary'] }));
        if (kit && kit.hero) {
          visuals.push({
            kind: 'prop',
            key: kit.hero.key || kit.hero,
            packs: kit.pack ? [kit.pack] : [],
            pageTags: ['activity'],
          });
        }
        if (bg && bg.set) {
          visuals.push({ kind: 'bg', set: bg.set, pageTags: ['title'] });
        }
        const audit = TI.auditPage(topicBrief, visuals, ['vocabulary', 'activity']);
        if (audit && audit.drift) {
          topicDrift = audit;
          reasons.push(
            audit.message
              || `TOPIC_DRIFT: visuals lean on parent category, not “${topicBrief.topicId}”.`
          );
        }
      }
    }

    // Producer content gate — critical topic-understanding checks (no averages).
    const PQ = window.ProducerQuality;
    if (PQ && typeof PQ.validate === 'function' && lesson) {
      producerQuality = PQ.validate(lesson, { topicBrief: topicBrief || undefined });
      if (producerQuality && !producerQuality.pass) {
        for (const code of producerQuality.failures || []) {
          const row = (producerQuality.checks || []).find((c) => c.code === code);
          reasons.push(
            row && row.detail ? `${code}: ${row.detail}` : code
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
      // boardCount / generated let the UI say "board teaches 4 of 7 words"
      // instead of only "reordered for art coverage".
      vocabAdapt: vocabAdapted && vocabAdapted.changed
        ? {
            adapted: true,
            promoted: vocabAdapted.promoted || [],
            board: vocabAdapted.after || vocabAdapted.board || [],
            boardCount: ceil,
            generated: fullWords.length,
            shortened: ceil < Math.min(maxBoardVocab(), fullWords.length),
          }
        : { adapted: false, boardCount: ceil, generated: fullWords.length, shortened: false },
      activityRecipe,
      heroContract,
      bg,
      topicBrief: topicBrief
        ? {
            topicId: topicBrief.topicId,
            topicLabel: topicBrief.topicLabel,
            parentCategories: topicBrief.parentCategories,
            source: topicBrief.source,
          }
        : null,
      topicDrift: topicDrift
        ? {
            drift: true,
            primaryShare: topicDrift.primaryShare,
            parentOnlyShare: topicDrift.parentOnlyShare,
            message: topicDrift.message,
          }
        : null,
      producerQuality: producerQuality
        ? {
            pass: !!producerQuality.pass,
            failures: producerQuality.failures || [],
            checks: (producerQuality.checks || []).map((c) => ({
              code: c.code,
              pass: !!c.pass,
              detail: c.detail,
            })),
          }
        : null,
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
    heroStageContract,
    VOCAB_ART_FLOOR,
    KIT_REASON_RE,
    maxBoardVocab,
    boardCount,
  };
})();
