/* edbLayout.js — zone templates + AABB occupancy for ClassIn board pages.
 * Classic script → window.EdbLayout
 *
 * Overlap policy:
 *   Awkward (forbidden): unlocked center in header/bodyText; unlocked IoU > 0.4;
 *                        decoration covering primary question text.
 *   OK intentional: cover⊃target, flap⊃reward, clothing⊃body (role flags).
 */
(function () {
  const W = 1280;
  const H = 590;
  const MARGIN = 24;
  const MIN_GAP = 14;
  const MAX_UNLOCKED_IOU = 0.4;

  /** Named zone templates per page type (board coords, origin top-left). */
  const ZONE_TEMPLATES = {
    title: {
      header:    { x: 48, y: 80,  w: 780, h: 200, noOverlap: true },
      bodyText:  { x: 48, y: 280, w: 720, h: 80,  noOverlap: true },
      artSafe:   { x: 900, y: 180, w: 320, h: 360, noOverlap: false },
      dock:      { x: 48, y: 480, w: 820, h: 90,  noOverlap: false },
      targetBay: { x: 900, y: 80,  w: 320, h: 90,  noOverlap: false },
      rewardPocket: { x: 1040, y: 40, w: 180, h: 120, noOverlap: false },
    },
    warm: {
      header:    { x: 48, y: 36,  w: 900, h: 50,  noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 900, h: 340, noOverlap: true },
      artSafe:   { x: 980, y: 260, w: 250, h: 280, noOverlap: false },
      dock:      { x: 48, y: 460, w: 900, h: 100, noOverlap: false },
      targetBay: { x: 980, y: 100, w: 250, h: 140, noOverlap: false },
      rewardPocket: { x: 1080, y: 40, w: 160, h: 100, noOverlap: false },
    },
    vocab: {
      header:    { x: 48, y: 36,  w: 700, h: 50,  noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 700, h: 320, noOverlap: true },
      artSafe:   { x: 780, y: 100, w: 450, h: 200, noOverlap: false },
      dock:      { x: 780, y: 320, w: 450, h: 230, noOverlap: false },
      targetBay: { x: 48, y: 100, w: 700, h: 320, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 90, noOverlap: false },
    },
    vocabSentences: {
      header:    { x: 48, y: 36,  w: 1184, h: 50, noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 1184, h: 420, noOverlap: true },
      artSafe:   { x: 1000, y: 420, w: 230, h: 140, noOverlap: false },
      dock:      { x: 48, y: 500, w: 900, h: 70, noOverlap: false },
      targetBay: { x: 48, y: 100, w: 1184, h: 380, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 60, noOverlap: false },
    },
    frames: {
      header:    { x: 48, y: 36,  w: 1184, h: 50, noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 1184, h: 400, noOverlap: true },
      artSafe:   { x: 1000, y: 420, w: 230, h: 140, noOverlap: false },
      dock:      { x: 48, y: 500, w: 900, h: 70, noOverlap: false },
      targetBay: { x: 48, y: 100, w: 1184, h: 380, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 60, noOverlap: false },
    },
    story: {
      header:    { x: 48, y: 36,  w: 1184, h: 50, noOverlap: true },
      bodyText:  { x: 400, y: 100, w: 830, h: 380, noOverlap: true },
      artSafe:   { x: 48, y: 100, w: 330, h: 380, noOverlap: false },
      dock:      { x: 400, y: 490, w: 830, h: 80, noOverlap: false },
      targetBay: { x: 60, y: 160, w: 300, h: 280, noOverlap: false },
      rewardPocket: { x: 1100, y: 40, w: 140, h: 80, noOverlap: false },
    },
    comprehension: {
      header:    { x: 48, y: 36,  w: 1184, h: 50, noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 1184, h: 400, noOverlap: true },
      artSafe:   { x: 1040, y: 420, w: 200, h: 140, noOverlap: false },
      dock:      { x: 48, y: 500, w: 960, h: 70, noOverlap: false },
      targetBay: { x: 48, y: 100, w: 1184, h: 380, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 60, noOverlap: false },
    },
    creative: {
      header:    { x: 48, y: 36,  w: 1000, h: 50, noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 1000, h: 360, noOverlap: true },
      artSafe:   { x: 1060, y: 400, w: 180, h: 150, noOverlap: false },
      dock:      { x: 48, y: 480, w: 980, h: 90, noOverlap: false },
      targetBay: { x: 48, y: 100, w: 1000, h: 340, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 80, noOverlap: false },
    },
    speaking: {
      header:    { x: 48, y: 36,  w: 1184, h: 50, noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 1000, h: 280, noOverlap: true },
      artSafe:   { x: 1060, y: 140, w: 180, h: 220, noOverlap: false },
      dock:      { x: 48, y: 420, w: 1184, h: 140, noOverlap: false },
      targetBay: { x: 48, y: 300, w: 1000, h: 100, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 80, noOverlap: false },
    },
    activity: {
      header:    { x: 48, y: 36,  w: 900, h: 50, noOverlap: true },
      bodyText:  { x: 48, y: 100, w: 700, h: 300, noOverlap: true },
      artSafe:   { x: 780, y: 100, w: 450, h: 320, noOverlap: false },
      dock:      { x: 48, y: 420, w: 700, h: 140, noOverlap: false },
      targetBay: { x: 800, y: 140, w: 400, h: 260, noOverlap: false },
      rewardPocket: { x: 1100, y: 36, w: 140, h: 80, noOverlap: false },
    },
    wrap: {
      header:    { x: 200, y: 40,  w: 880, h: 100, noOverlap: true },
      bodyText:  { x: 200, y: 150, w: 880, h: 160, noOverlap: true },
      artSafe:   { x: 40, y: 300, w: 220, h: 260, noOverlap: false },
      dock:      { x: 280, y: 400, w: 900, h: 150, noOverlap: false },
      targetBay: { x: 280, y: 320, w: 900, h: 70, noOverlap: false },
      rewardPocket: { x: 1080, y: 40, w: 160, h: 110, noOverlap: false },
    },
  };

  function rect(x, y, w, h) {
    return { x, y, w, h, x2: x + w, y2: y + h };
  }

  function area(r) {
    return Math.max(0, r.w) * Math.max(0, r.h);
  }

  function intersect(a, b) {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const x2 = Math.min(a.x2 != null ? a.x2 : a.x + a.w, b.x2 != null ? b.x2 : b.x + b.w);
    const y2 = Math.min(a.y2 != null ? a.y2 : a.y + a.h, b.y2 != null ? b.y2 : b.y + b.h);
    if (x2 <= x || y2 <= y) return null;
    return rect(x, y, x2 - x, y2 - y);
  }

  function iou(a, b) {
    const i = intersect(normalize(a), normalize(b));
    if (!i) return 0;
    const u = area(normalize(a)) + area(normalize(b)) - area(i);
    return u <= 0 ? 0 : area(i) / u;
  }

  function normalize(r) {
    return rect(r.x, r.y, r.w, r.h);
  }

  function center(r) {
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  function containsPoint(r, p) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function createPage(pageType) {
    const zones = ZONE_TEMPLATES[pageType] || ZONE_TEMPLATES.warm;
    const page = {
      pageType,
      zones: JSON.parse(JSON.stringify(zones)),
      occupied: [], // { rect, role, noOverlap, intentional }
      locked: [],
      unlocked: [],
      notes: [],
    };
    // Seed noOverlap zones as occupied soft blockers
    Object.keys(page.zones).forEach((name) => {
      const z = page.zones[name];
      if (z.noOverlap) {
        page.occupied.push({
          rect: normalize(z),
          role: 'zone:' + name,
          noOverlap: true,
          intentional: false,
        });
      }
    });
    return page;
  }

  function zoneRect(page, name) {
    const z = page.zones[name];
    return z ? normalize(z) : null;
  }

  function candidateGrid(zone, w, h, step) {
    const s = step || 28;
    const out = [];
    const maxX = zone.x + zone.w - w;
    const maxY = zone.y + zone.h - h;
    for (let y = zone.y; y <= maxY; y += s) {
      for (let x = zone.x; x <= maxX; x += s) {
        out.push(rect(x, y, w, h));
      }
    }
    if (!out.length && zone.w >= w && zone.h >= h) {
      out.push(rect(zone.x, zone.y, w, h));
    }
    return out;
  }

  function scoreCandidate(page, candidate, opts) {
    const intentional = !!(opts && opts.intentional);
    const prefer = (opts && opts.prefer) || 'artSafe';
    const c = normalize(candidate);
    const mid = center(c);

    // Edge margin
    if (c.x < MARGIN || c.y < MARGIN || c.x + c.w > W - MARGIN || c.y + c.h > H - MARGIN) {
      return -1e9;
    }

    // Forbidden: center inside noOverlap occupied (unless intentional)
    if (!intentional) {
      for (const occ of page.occupied) {
        if (!occ.noOverlap) continue;
        if (containsPoint(occ.rect, mid)) return -1e9;
        const hit = intersect(c, occ.rect);
        if (hit && area(hit) / area(c) > 0.25) return -1e9;
      }
    }

    // Unlocked-vs-unlocked IoU (unless intentional stack)
    if (!intentional) {
      for (const u of page.unlocked) {
        if (iou(c, u) > MAX_UNLOCKED_IOU) return -1e9;
        const gapOk =
          c.x + c.w + MIN_GAP <= u.x ||
          u.x + u.w + MIN_GAP <= c.x ||
          c.y + c.h + MIN_GAP <= u.y ||
          u.y + u.h + MIN_GAP <= c.y;
        if (!gapOk && iou(c, u) > 0.05) return -1e6;
      }
    }

    let score = 0;
    const preferZ = zoneRect(page, prefer);
    if (preferZ) {
      const hit = intersect(c, preferZ);
      score += hit ? area(hit) / area(c) * 100 : -20;
    }

    // Prefer lower clustering: distance from other unlocked centers
    for (const u of page.unlocked) {
      const d = Math.hypot(mid.x - (u.x + u.w / 2), mid.y - (u.y + u.h / 2));
      score += Math.min(d, 400) * 0.05;
    }

    // Slight preference for right/bottom docks for trays
    if (prefer === 'dock') score += (c.y / H) * 10;

    return score;
  }

  /**
   * Place a piece. Returns placed rect or null.
   * opts: { prefer, intentional, role, kind, asset, locked, meta, anchor }
   * If intentional + anchor provided, place overlapping the anchor.
   */
  function place(page, opts) {
    const w = opts.w || 96;
    const h = opts.h || 96;
    const intentional = !!opts.intentional;
    const prefer = opts.prefer || 'artSafe';

    let chosen = null;

    if (intentional && opts.anchor) {
      const a = normalize(opts.anchor);
      // Center piece on anchor (cover / flap / dress)
      chosen = rect(
        Math.round(a.x + a.w / 2 - w / 2),
        Math.round(a.y + a.h / 2 - h / 2),
        w,
        h
      );
      // Clamp to board
      chosen.x = Math.max(MARGIN, Math.min(W - MARGIN - w, chosen.x));
      chosen.y = Math.max(MARGIN, Math.min(H - MARGIN - h, chosen.y));
      page.notes.push(`intentional:${opts.role || opts.kind || 'overlap'}`);
    } else {
      const zone = zoneRect(page, prefer) || zoneRect(page, 'artSafe') || rect(MARGIN, MARGIN, W - 2 * MARGIN, H - 2 * MARGIN);
      const candidates = candidateGrid(zone, w, h, opts.step || 28);
      let best = -1e12;
      for (const cand of candidates) {
        const s = scoreCandidate(page, cand, { intentional, prefer });
        if (s > best) {
          best = s;
          chosen = cand;
        }
      }
      if (!chosen || best < -1e8) {
        // Fallback: pack into dock left-to-right
        const dock = zoneRect(page, 'dock') || zone;
        const n = page.unlocked.length;
        chosen = rect(
          dock.x + (n % 6) * (w + MIN_GAP),
          dock.y + Math.floor(n / 6) * (h + MIN_GAP),
          w,
          h
        );
        chosen.x = Math.max(MARGIN, Math.min(W - MARGIN - w, chosen.x));
        chosen.y = Math.max(MARGIN, Math.min(H - MARGIN - h, chosen.y));
      }
    }

    const piece = {
      kind: opts.kind || 'image',
      asset: opts.asset || null,
      x: chosen.x,
      y: chosen.y,
      w,
      h,
      role: opts.role || 'piece',
      meta: opts.meta || null,
      text: opts.text || null,
      color: opts.color || null,
      size: opts.size || null,
      emoji: opts.emoji || null,
      label: opts.label || null,
    };

    if (opts.locked) {
      page.locked.push(piece);
    } else {
      page.unlocked.push(piece);
    }

    page.occupied.push({
      rect: normalize(chosen),
      role: piece.role,
      noOverlap: !intentional && !!opts.blocksOthers,
      intentional,
    });

    return piece;
  }

  function placeInDock(page, items, size) {
    const dock = zoneRect(page, 'dock');
    const w = size?.w || 100;
    const h = size?.h || 54;
    const gap = MIN_GAP;
    const cols = Math.max(1, Math.floor((dock.w + gap) / (w + gap)));
    return items.map((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = dock.x + col * (w + gap);
      const y = dock.y + row * (h + gap);
      return place(page, Object.assign({}, item, {
        w, h,
        intentional: false,
        prefer: 'dock',
        // Force dock cell via anchor-like rect inside dock
        intentional: false,
        // Direct placement override:
        _force: rect(x, y, w, h),
      }));
    });
  }

  // Stronger dock placer that doesn't rely on score grid
  function placeDockRow(page, items, size) {
    const dock = zoneRect(page, 'dock');
    const w = size?.w || 100;
    const h = size?.h || 54;
    const gap = MIN_GAP;
    const cols = Math.max(1, Math.floor((dock.w + gap) / (w + gap)));
    const placed = [];
    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      let x = dock.x + col * (w + gap);
      let y = dock.y + row * (h + gap);
      x = Math.max(MARGIN, Math.min(W - MARGIN - w, x));
      y = Math.max(MARGIN, Math.min(H - MARGIN - h, y));
      const piece = {
        kind: item.kind || 'image',
        asset: item.asset || null,
        x, y, w, h,
        role: item.role || 'dockPiece',
        meta: item.meta || null,
        text: item.text || null,
        emoji: item.emoji || null,
        label: item.label || null,
        color: item.color || null,
        size: item.size || null,
      };
      page.unlocked.push(piece);
      page.occupied.push({
        rect: rect(x, y, w, h),
        role: piece.role,
        noOverlap: false,
        intentional: false,
      });
      placed.push(piece);
    });
    return placed;
  }

  function debugOverlay(page) {
    const lines = [];
    Object.keys(page.zones).forEach((name) => {
      const z = page.zones[name];
      lines.push({ name, ...normalize(z), noOverlap: !!z.noOverlap });
    });
    return lines;
  }

  window.EdbLayout = {
    W, H, MARGIN, ZONE_TEMPLATES,
    createPage, zoneRect, place, placeDockRow, placeInDock,
    rect, iou, intersect, center, normalize, debugOverlay, area,
  };
})();
