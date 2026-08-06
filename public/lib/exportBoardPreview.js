/* exportBoardPreview.js — rasterize the ClassIn board pages to PDF or PNG.
 * Same LessonPages + boardPlan spine as .edb export (for quick visual checks).
 * Classic script → window.exportBoardPreview
 */
(function () {
  const W = 1280;
  const H = 590;

  async function waitForImages(host) {
    await Promise.all(
      [...host.querySelectorAll('img')].map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 2000);
        });
      })
    );
    await new Promise((r) => setTimeout(r, 80));
  }

  async function pngBytesToBitmap(bytes) {
    if (!bytes) return null;
    const blob = new Blob([bytes], { type: 'image/png' });
    try {
      return await createImageBitmap(blob);
    } catch (_) {
      return null;
    }
  }

  async function drawPiece(ctx, piece, artCtx) {
    if (piece.kind === 'text' && piece.text) {
      ctx.save();
      const rgba = piece.color || [30, 41, 59, 255];
      ctx.fillStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${(rgba[3] ?? 255) / 255})`;
      ctx.font = `700 ${piece.size || 14}px Poppins, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(piece.text, piece.x, piece.y, piece.w || 400);
      ctx.restore();
      return;
    }
    if (!window.EdbKit || !window.EdbKit.pieceToPng) return;
    const bytes = await window.EdbKit.pieceToPng(piece, artCtx);
    const bmp = await pngBytesToBitmap(bytes);
    if (!bmp) return;
    const destW = piece.w || bmp.width;
    const destH = piece.h || bmp.height;
    // Letterbox at the bitmap's natural aspect inside the piece rect.
    const scale = Math.min(destW / bmp.width, destH / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    const dx = piece.x + Math.round((destW - dw) / 2);
    const dy = piece.y + Math.round((destH - dh) / 2);
    ctx.drawImage(bmp, dx, dy, dw, dh);
    if (bmp.close) bmp.close();
  }

  /** Build one canvas per board page (background + locked/unlocked pieces).
   *  boardPlanIn lets the page-matrix harness pass a plan with forced picks
   *  so pixel output and metrics describe the same board. */
  async function renderCanvases(lesson, meta, boardPlanIn) {
    if (!window.LessonPages || !window.EdbActivities || !window.EdbKit) {
      throw new Error('Board libraries failed to load. Refresh and try again.');
    }
    if (window.PropBank) await window.PropBank.ready();
    const artCtx = {
      lesson,
      seed: (lesson && lesson.title) || '',
      family: (window.PropBank && window.PropBank.familyFor)
        ? window.PropBank.familyFor(lesson)
        : undefined,
    };
    const boardPlan = boardPlanIn || window.EdbActivities.buildBoardPlan(lesson, meta || {});
    if (!boardPlan.bgPicks) {
      await window.LessonPages.attachBgPicks(lesson, meta || {}, boardPlan);
    }
    const rendered = await window.LessonPages.render(lesson, meta || {}, boardPlan);
    await waitForImages(rendered.host);

    const bgPicks = boardPlan.bgPicks || null;

    const canvases = [];
    try {
      if (bgPicks && bgPicks.length !== rendered.pageEls.length) {
        throw new Error(
          `Background plan mismatch: ${bgPicks.length} picks for ${rendered.pageEls.length} pages`
        );
      }
      for (let i = 0; i < rendered.pageEls.length; i++) {
        const bgPng = await window.EdbKit.elementToPng(rendered.pageEls[i], W, H);
        const bmp = await pngBytesToBitmap(bgPng);
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        if (bmp) {
          ctx.drawImage(bmp, 0, 0, W, H);
          if (bmp.close) bmp.close();
        }

        const page = boardPlan.pages && boardPlan.pages[i];
        const pick = bgPicks && bgPicks[i];
        if (page) {
          for (const piece of page.locked || []) await drawPiece(ctx, piece, artCtx);

          const unlocked = page.unlocked || [];
          const SB = window.SceneBackgrounds;
          const stands = (p) => !!(SB && SB.isStandRole(p.role));
          const standers = unlocked.filter(stands);
          const floaters = unlocked.filter((p) => !stands(p));
          for (const piece of floaters) await drawPiece(ctx, piece, artCtx);

          const row = SB ? SB.standRow(standers, pick, W) : null;
          if (row) {
            for (const slot of row) {
              await drawPiece(ctx, Object.assign({}, slot.piece, {
                x: slot.x, y: slot.y, w: slot.w, h: slot.h,
              }), artCtx);
            }
          } else {
            for (const piece of standers) await drawPiece(ctx, piece, artCtx);
          }
        }

        // Page index badge for quick scanning
        ctx.fillStyle = 'rgba(15,23,42,0.55)';
        ctx.fillRect(12, 12, 54, 26);
        ctx.fillStyle = '#fff';
        ctx.font = '700 14px Poppins, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), 28, 26);

        canvases.push(c);
      }
    } finally {
      window.LessonPages.cleanup(rendered.host);
    }
    return canvases;
  }

  function slug(lesson) {
    return (lesson.title || 'board')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-') || 'board';
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function toPdf(lesson, meta) {
    const canvases = await renderCanvases(lesson, meta);
    const jspdfNs = (typeof jspdf !== 'undefined' && jspdf) || window.jspdf;
    const jsPDF = jspdfNs && jspdfNs.jsPDF;
    if (!jsPDF) throw new Error('jsPDF failed to load');

    // Board aspect as mm (1280×590 ≈ 297×136.8 landscape strip)
    const pageW = 297;
    const pageH = (H / W) * pageW;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pageW, pageH] });

    canvases.forEach((c, i) => {
      if (i > 0) doc.addPage([pageW, pageH]);
      const dataUrl = c.toDataURL('image/jpeg', 0.92);
      doc.addImage(dataUrl, 'JPEG', 0, 0, pageW, pageH);
    });

    doc.save(slug(lesson) + '-board-preview.pdf');
    return { pages: canvases.length };
  }

  async function toPng(lesson, meta) {
    const canvases = await renderCanvases(lesson, meta);
    // One tall strip — scroll through the whole board in one image
    const strip = document.createElement('canvas');
    strip.width = W;
    strip.height = H * canvases.length;
    const ctx = strip.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, strip.width, strip.height);
    canvases.forEach((c, i) => ctx.drawImage(c, 0, i * H));

    const blob = await new Promise((resolve, reject) => {
      strip.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
    });
    triggerDownload(blob, slug(lesson) + '-board-preview.png');
    return { pages: canvases.length };
  }

  async function exportBoardPreview(lesson, meta, format) {
    const fmt = String(format || 'pdf').toLowerCase();
    if (fmt === 'png') return toPng(lesson, meta);
    return toPdf(lesson, meta);
  }

  window.exportBoardPreview = exportBoardPreview;
  window.BoardPreview = { exportBoardPreview, renderCanvases, toPdf, toPng };
})();
