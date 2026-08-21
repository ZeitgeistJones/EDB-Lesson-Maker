/* buildEdb.js — write ClassIn .edb blackboard files in the browser.
 *
 * Companion to buildLessonPdf.js. Same lesson object, different output:
 * the PDF is for printing, the EDB is an interactive ClassIn board with
 * locked page backgrounds and draggable pieces on top.
 *
 * Format notes (reverse-engineered, verified against ClassIn 6.0.8.2791):
 *
 *   file    = 11-byte outer header + GZIP(payload)
 *   payload = 43-byte file header + a flat list of self-describing objects
 *
 *   file header (43 bytes)
 *     [0:2]   0x0032           magic
 *     [2:4]   uint16           OBJECT COUNT — must be exact or nothing renders
 *     [4:8]   float32          board height (590)
 *     [8:12]  float32          board width  (1280)
 *     [16]    uint8            length of version string
 *     [17:27] ascii            "6.0.8.2791"
 *     [31:35] uint32           unix timestamp
 *
 *   image object = 50-byte record + hiPNG + uint32(thumbSize) + thumbPNG
 *   text  object = 49-byte record + utf8 + 0x00
 *
 *   shared record fields
 *     [0]     type             0x04 image, 0x03 text
 *     [1:5]   uint32           this object's TOTAL size, record included
 *     [5]     0x28             marker
 *     [6:8]   uint16           object id
 *     [8:12]  uint32           reference id
 *     [12:16] uint32           0 = draggable, 1 = locked (ClassIn hand boards; not 3)
 *     [20:28] float32 x2       scale (1,1)
 *     [28:32] float32          x
 *     [32:36] float32          y
 *   image only:
 *     [36:40] float32          width
 *     [40:44] float32          height
 *     [46:50] uint32           hi-res PNG byte length
 *   text only:
 *     [36]    uint8            font size in points
 *     [37:41] RGBA
 *     [41:45] float32          text box width
 *     [45:49] uint32           utf8 byte length
 *
 *   Coordinates are normalised on TWO different units:
 *     x, width   ->  board width       (1280)
 *     y, height  ->  board height * 50 (29500) — the board scrolls 50 screens
 */

const BOARD_W = 1280;
const BOARD_H = 590;
const CANVAS_H = BOARD_H * 50;      // 29500
const PAGE = BOARD_H;               // one screen == one "page"

const VERSION = '6.0.8.2791';
const OUTER = [0x00, 0x00, 0x00, 0x04, 0x65, 0x64, 0x62, 0x00, 0x00, 0x32, 0x01];
const UNLOCKED = 0;
// EW1: hand-authored ClassIn boards lock scenery with 1 (not 3).
const LOCKED = 1;

// ── CRC32, needed for the gzip trailer ────────────────────────────
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    CRC_TABLE[n] = c >>> 0;
  }
  return CRC_TABLE;
}
function crc32(bytes) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  w.write(bytes); w.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

function concat(chunks) {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// ── builder ───────────────────────────────────────────────────────

class Edb {
  constructor(boardW = BOARD_W, boardH = BOARD_H) {
    this.boardW = boardW;
    this.boardH = boardH;
    this.canvasH = boardH * 50;
    this.objects = [];
    this.nextId = 0;
  }

  /** Place a PNG (Uint8Array) at x,y in pixels. */
  addImage(png, x, y, { w, h, thumb, locked = false } = {}) {
    const size = pngSize(png);
    const ww = w ?? size.w;
    const hh = h ?? size.h;
    const th = thumb ?? png;

    const rec = new Uint8Array(50);
    const dv = new DataView(rec.buffer);
    const id = this.nextId++;

    rec[0] = 0x04;
    dv.setUint32(1, 50 + png.length + 4 + th.length);
    rec[5] = 0x28;
    dv.setUint16(6, id);
    dv.setUint32(8, id);
    dv.setUint32(12, locked ? LOCKED : UNLOCKED);
    dv.setFloat32(20, 1);
    dv.setFloat32(24, 1);
    dv.setFloat32(28, x / this.boardW);
    dv.setFloat32(32, y / this.canvasH);
    dv.setFloat32(36, ww / this.boardW);
    dv.setFloat32(40, hh / this.canvasH);
    dv.setUint32(46, png.length);

    const link = new Uint8Array(4);
    new DataView(link.buffer).setUint32(0, th.length);

    this.objects.push(concat([rec, png, link, th]));
    return this;
  }

  /** Place a text box at x,y in pixels. color is [r,g,b,a]. */
  addText(text, x, y, {
    size = 18, color = [255, 255, 255, 255], width = 0.04, locked = false,
  } = {}) {
    const utf8 = new TextEncoder().encode(text);
    const total = 49 + utf8.length + 1;

    const rec = new Uint8Array(49);
    const dv = new DataView(rec.buffer);
    const id = this.nextId++;

    rec[0] = 0x03;
    dv.setUint32(1, total);
    rec[5] = 0x28;
    dv.setUint16(6, id);
    dv.setUint32(8, id);
    dv.setUint32(12, locked ? LOCKED : UNLOCKED);
    dv.setFloat32(20, 1);
    dv.setFloat32(24, 1);
    dv.setFloat32(28, x / this.boardW);
    dv.setFloat32(32, y / this.canvasH);
    rec[36] = size & 0xFF;
    rec.set(color, 37);
    dv.setFloat32(41, width);
    dv.setUint32(45, utf8.length);

    this.objects.push(concat([rec, utf8, new Uint8Array([0])]));
    return this;
  }

  payload() {
    const h = new Uint8Array(43);
    const dv = new DataView(h.buffer);
    h[0] = 0x00; h[1] = 0x32;
    dv.setUint16(2, this.objects.length);       // object count
    dv.setFloat32(4, this.boardH);
    dv.setFloat32(8, this.boardW);
    h[16] = VERSION.length;
    for (let i = 0; i < VERSION.length; i++) h[17 + i] = VERSION.charCodeAt(i);
    dv.setUint32(31, Math.floor(Date.now() / 1000));
    return concat([h, ...this.objects]);
  }

  async toBlob() {
    const p = this.payload();
    const body = await deflateRaw(p);
    const head = new Uint8Array([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0, 0, 0x0a]);
    const tail = new Uint8Array(8);
    const tv = new DataView(tail.buffer);
    tv.setUint32(0, crc32(p), true);           // gzip trailer is little-endian
    tv.setUint32(4, p.length >>> 0, true);
    return new Blob([new Uint8Array(OUTER), head, body, tail],
                    { type: 'application/octet-stream' });
  }
}

function pngSize(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

// ── helpers for turning page content into PNGs ────────────────────

/** Sync fallback when canvas.toBlob is missing (rare). */
function canvasToPngSync(canvas) {
  const url = canvas.toDataURL('image/png');
  return dataUrlToPng(url);
}

/**
 * Encode canvas → PNG bytes via toBlob (async, non-blocking).
 * toDataURL + atob was the bake hot-path bottleneck on every page/tile.
 */
function canvasToPng(canvas) {
  if (typeof canvas.toBlob !== 'function') {
    return Promise.resolve(canvasToPngSync(canvas));
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        try {
          resolve(canvasToPngSync(canvas));
        } catch (err) {
          reject(err);
        }
        return;
      }
      blob.arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(reject);
    }, 'image/png');
  });
}

/** Rasterise a DOM element (one lesson page) to a PNG at board width. */
async function elementToPng(el, width = BOARD_W, height = PAGE) {
  if (typeof html2canvas !== 'function') {
    throw new Error('html2canvas is required — add its <script> tag to index.html');
  }
  const canvas = await html2canvas(el, {
    width, height, scale: 1, backgroundColor: '#ffffff', logging: false,
    useCORS: true,
  });
  return canvasToPng(canvas);
}

/** Draw an emoji (or any short string) as a transparent square PNG. */
async function glyphToPng(glyph, px = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  ctx.font = `${Math.floor(px * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, px / 2, px / 2 + px * 0.04);
  return canvasToPng(c);
}

/**
 * Draw a rounded word tile — used for sentence-building activities.
 * Raised (shadow + darker base edge) so it reads as a liftable/draggable
 * piece at a glance, distinct from the flat dashed drop pad it targets —
 * an interaction-state cue that survives grayscale/color-blind viewing
 * (Manus frameTiles R1 action 4: states need shape, not just color).
 */
async function tileToPng(text, {
  w = 186, h = 54, bg = '#F5C518', fg = '#1E2A38', size = 24,
} = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const r = 9;
  const tilePath = () => {
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
  };
  // Drop shadow first (own path pass) so it never bleeds onto the border/text.
  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.32)';
  ctx.shadowBlur = Math.max(3, Math.round(h * 0.12));
  ctx.shadowOffsetY = Math.max(2, Math.round(h * 0.07));
  tilePath();
  ctx.fillStyle = bg; ctx.fill();
  ctx.restore();
  // Darker base edge reads as a bevel (liftable) without relying on the shadow alone.
  tilePath();
  ctx.lineWidth = Math.max(1.5, Math.round(h * 0.035));
  ctx.strokeStyle = 'rgba(15,23,42,0.22)';
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Shrink type until the word fits — "toothbrush" on a 140px sort card
  // used to clip to "oothbrusl" (bathroom quality loop).
  const label = String(text || '');
  const pad = Math.max(10, Math.round(w * 0.08));
  let px = size;
  while (px >= 14) {
    ctx.font = `700 ${px}px Poppins, sans-serif`;
    if (ctx.measureText(label).width <= w - pad) break;
    px -= 1;
  }
  ctx.fillText(label, w / 2, h / 2, w - pad);
  return canvasToPng(c);
}

function dataUrlToPng(url) {
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Bake-session memo: same src@w×h reuses one decode/raster promise. */
const _assetPngCache = new Map();

/** Load a path or data-URL into PNG bytes (SVGs rasterised via Image).
 * Letterboxes into w×h at the image's natural aspect — never stretches. */
async function loadAssetPng(src, w, h) {
  if (!src) return null;
  if (typeof src === 'string' && src.startsWith('data:image/png')) {
    return dataUrlToPng(src);
  }
  const key = `${src}\0${w || 0}\0${h || 0}`;
  if (_assetPngCache.has(key)) return _assetPngCache.get(key);
  const pending = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const nw = img.naturalWidth || 128;
        const nh = img.naturalHeight || 128;
        const c = document.createElement('canvas');
        c.width = w || nw;
        c.height = h || nh;
        const ctx = c.getContext('2d');
        const scale = Math.min(c.width / nw, c.height / nh);
        const dw = nw * scale;
        const dh = nh * scale;
        ctx.drawImage(img, Math.round((c.width - dw) / 2), Math.round((c.height - dh) / 2), dw, dh);
        resolve(await canvasToPng(c));
      } catch (_) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  _assetPngCache.set(key, pending);
  return pending;
}

async function placeholderPng(w, h, label) {
  const c = document.createElement('canvas');
  c.width = Math.max(24, w || 96);
  c.height = Math.max(24, h || 96);
  const ctx = c.getContext('2d');
  const r = 10;
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.arcTo(c.width, 0, c.width, c.height, r);
  ctx.arcTo(c.width, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r);
  ctx.arcTo(0, 0, c.width, 0, r); ctx.closePath();
  ctx.fill();
  // Never stamp piece.role ("matchPiece") as shippable art — blank plate only
  // when a caller still needs a solid chip. Prefer null from pieceToPng instead.
  const text = label != null && String(label).trim() && String(label) !== '•'
    ? String(label).slice(0, 12)
    : '';
  if (text) {
    ctx.fillStyle = '#475569';
    ctx.font = `700 ${Math.max(12, Math.floor(c.height * 0.22))}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2, c.width - 12);
  }
  return canvasToPng(c);
}

/** Curated VocabIcons pack first, then PropBank cutout — never silent-drop.
 *  PropBank-first stole abstract vocab (compose→desk, melody→trumpet) and
 *  skipped dedicated ivory/gold pack icons.
 *
 *  Bake-aligned uniqueness: ctx.usedPropKeys / ctx.usedArtPaths track what
 *  this board already claimed. Empty beats two words sharing one PNG. */
async function wordArtPng(word, ctx) {
  if (!word) return null;
  const c = ctx || {};
  if (!(c.usedPropKeys instanceof Set)) c.usedPropKeys = new Set();
  if (!(c.usedArtPaths instanceof Set)) c.usedArtPaths = new Set();
  const VI = window.VocabIcons;
  const PB = window.PropBank;

  const claim = (path, propKey) => {
    if (path) c.usedArtPaths.add(path);
    if (propKey) c.usedPropKeys.add(propKey);
  };
  const packPath = async (w) => {
    if (!VI) return null;
    if (typeof VI.pathForSync === 'function') {
      const sync = VI.pathForSync(w);
      if (sync) return sync;
    }
    if (typeof VI.pathFor === 'function') return VI.pathFor(w);
    return null;
  };

  if (VI && typeof VI.isCurated === 'function' && VI.isCurated(word)) {
    const path = await packPath(word);
    if (path && !c.usedArtPaths.has(path)) {
      const pack = await VI.loadPng(word);
      if (pack) {
        claim(path, null);
        return pack;
      }
    }
    // Shared pack path → fall through (empty > duplicate match card).
  }

  if (PB && typeof PB.loaded === 'function' && PB.loaded()) {
    const family = c.family
      || (c.lesson && PB.familyFor ? PB.familyFor(c.lesson) : null)
      || PB.HOUSE_FAMILY;
    const minScore = (PB.DEFAULT_MIN_SCORE != null) ? PB.DEFAULT_MIN_SCORE : 4;
    const prop = PB.resolve({
      word,
      family,
      seed: c.seed || (c.lesson && c.lesson.title) || word,
      exclude: Array.from(c.usedPropKeys),
      minScore,
    });
    const headOk = !window.VocabArt || typeof window.VocabArt.headNounOk !== 'function'
      || window.VocabArt.headNounOk(word, prop);
    if (prop && headOk) {
      const path = prop.path || prop.src || null;
      if (!path || !c.usedArtPaths.has(path)) {
        const png = await PB.loadPng(prop);
        if (png) {
          claim(path, prop.key);
          return png;
        }
      }
    }
  }

  if (VI) {
    const path = await packPath(word);
    if (path && !c.usedArtPaths.has(path)) {
      const pack = await VI.loadPng(word);
      if (pack) {
        claim(path, null);
        return pack;
      }
    }
  }
  return null;
}

/** Match-dock icon + one-word caption chip (Manus B2 — kill ambiguous glyphs). */
function pngBytesToDataUrl(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(s)}`;
}

function captionedArtPng(artBytes, label, w, h) {
  const width = Math.max(64, w || 96);
  const height = Math.max(80, h || 118);
  const chipH = Math.max(18, Math.min(28, Math.floor(height * 0.2)));
  const artBox = height - chipH - 2;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || 96;
      const nh = img.naturalHeight || 96;
      const scale = Math.min(width / nw, artBox / nh);
      const dw = nw * scale;
      const dh = nh * scale;
      ctx.drawImage(img, Math.round((width - dw) / 2), Math.round((artBox - dh) / 2), dw, dh);
      const chipY = artBox + 1;
      const r = 8;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.beginPath();
      ctx.moveTo(r, chipY);
      ctx.arcTo(width, chipY, width, height, r);
      ctx.arcTo(width, height, 0, height, r);
      ctx.arcTo(0, height, 0, chipY, r);
      ctx.arcTo(0, chipY, width, chipY, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 ${Math.max(11, Math.floor(chipH * 0.62))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(label || '').slice(0, 14), width / 2, chipY + chipH / 2, width - 8);
      canvasToPng(c).then(resolve, () => resolve(artBytes));
    };
    img.onerror = () => resolve(artBytes);
    img.src = pngBytesToDataUrl(artBytes);
  });
}

/** Planned artSrc → wordArt → curated emoji → text tile. Never bullet / role label. */
async function pieceToPng(piece, ctx) {
  const word = piece.meta && piece.meta.word;
  const artSrc = piece.meta && piece.meta.artSrc;
  // Match-dock icons must NEVER bake answer-naming caption chips (Manus S26 /
  // skill v2). Words live on the numbered drop pads — pictures stay unlabeled.
  const isMatchIcon = piece.role === 'matchPiece';
  const wantCaption = !isMatchIcon && !!(piece.label || (piece.meta && piece.meta.captionChip));
  const assetStr = piece.asset != null ? String(piece.asset) : '';
  const padRole = /^(matchPad|orderPad|buildSlot)$/.test(piece.role || '');
  // Loud fail only for planned match art — chrome (hero/dress/star) skips null.
  const mustHaveArt = isMatchIcon || !!artSrc;

  // VocabArt-planned path wins (match dock + any piece with meta.artSrc).
  if (artSrc) {
    const png = await loadAssetPng(artSrc, piece.w, piece.h);
    if (png) {
      if (wantCaption && (piece.label || word)) {
        return captionedArtPng(png, piece.label || word, piece.w, piece.h);
      }
      return png;
    }
    if (mustHaveArt) {
      throw new Error('pieceToPng: missing artSrc file for ' + (word || artSrc));
    }
  }

  // Explicit data-URL canvases (slot ghosts / solid pads) must win over word-art
  // lookup — matchPad used to set meta.word and rendered tiny vocab icons on cards.
  if (piece.asset && (assetStr.startsWith('data:') || padRole)) {
    const png = await loadAssetPng(piece.asset, piece.w, piece.h);
    if (png) {
      if (wantCaption && (piece.label || word)) {
        return captionedArtPng(png, piece.label || word, piece.w, piece.h);
      }
      return png;
    }
  }
  // Word tiles (orderLine) carry meta.word for tracing — never steal the tile
  // into a picture just because that field is set.
  if (piece.kind === 'tile' || (piece.text && piece.kind !== 'text' && piece.kind !== 'emoji' && piece.kind !== 'image')) {
    return await tileToPng(piece.text || piece.label || '?', {
      w: piece.w || 186,
      h: piece.h || 54,
    });
  }
  if (word) {
    const art = await wordArtPng(word, ctx);
    if (art) {
      if (wantCaption) {
        return captionedArtPng(art, piece.label || word, piece.w, piece.h);
      }
      return art;
    }
    // Labeled: text-only beats wrong picture / bullet.
    if (wantCaption || piece.label) {
      return await tileToPng(piece.label || word, {
        w: piece.w || 186,
        h: piece.h || 54,
      });
    }
  }
  if (piece.asset) {
    const png = await loadAssetPng(piece.asset, piece.w, piece.h);
    if (png) {
      if (wantCaption && (piece.label || word)) {
        return captionedArtPng(png, piece.label || word, piece.w, piece.h);
      }
      return png;
    }
    if (mustHaveArt) {
      throw new Error('pieceToPng: image asset failed to load (' + (word || piece.role || assetStr) + ')');
    }
    return null;
  }
  const glyph = piece.emoji && String(piece.emoji) !== '•' ? piece.emoji : null;
  if ((piece.kind === 'emoji' || glyph) && glyph) {
    const g = await glyphToPng(glyph, Math.max(piece.w || 96, piece.h || 96, 64));
    if (wantCaption && (piece.label || word)) {
      return captionedArtPng(g, piece.label || word, piece.w, piece.h);
    }
    return g;
  }
  if (piece.text && piece.kind !== 'text') {
    return await tileToPng(piece.text, { w: piece.w || 186, h: piece.h || 54 });
  }
  if (mustHaveArt) {
    throw new Error('pieceToPng: no vetted art for ' + (word || piece.role || 'matchPiece'));
  }
  // Chrome / unlabeled pieces without art — skip (empty > role-label / bullet).
  return null;
}

/**
 * Build a ClassIn board from a lesson.
 *
 * pageEls   — DOM elements, one per lesson page (locked backgrounds).
 * boardPlan — from EdbActivities.buildBoardPlan (pages with locked/unlocked pieces).
 *             Fourth arg may also be legacy `slots` { newWords, wrap }.
 */
async function buildLessonEdb(lesson, meta, pageEls, boardPlanOrSlots) {
  if (window.PropBank) await window.PropBank.ready();
  if (window.VocabIcons && typeof window.VocabIcons.ready === 'function') {
    await window.VocabIcons.ready();
  }
  const artCtx = {
    lesson,
    seed: (lesson && lesson.title) || '',
    family: (window.PropBank && window.PropBank.familyFor)
      ? window.PropBank.familyFor(lesson)
      : undefined,
    // Shared across every pieceToPng/wordArtPng call so match-dock vocab
    // cannot double-claim one cutout/pack PNG.
    usedPropKeys: new Set(),
    usedArtPaths: new Set(),
  };
  const e = new Edb();
  const pages = pageEls || [];
  const MAX_PAGES = 50;   // a ClassIn board is 50 screens tall
  if (pages.length > MAX_PAGES) {
    throw new Error(
      `This lesson is ${pages.length} pages. A ClassIn board holds ${MAX_PAGES}. ` +
      `Shorten the lesson or split it into two boards.`
    );
  }
  const plan = boardPlanOrSlots && Array.isArray(boardPlanOrSlots.pages)
    ? boardPlanOrSlots
    : null;
  const slots = plan ? plan.slots : boardPlanOrSlots;

  if (plan && plan.pages.length && pages.length && plan.pages.length !== pages.length) {
    throw new Error(
      `Board spine mismatch: plan has ${plan.pages.length} pages but rendered ${pages.length}`
    );
  }
  if (plan && plan.bgPicks && pages.length && plan.bgPicks.length !== pages.length) {
    throw new Error(
      `Background plan mismatch: ${plan.bgPicks.length} picks for ${pages.length} pages`
    );
  }

  for (let i = 0; i < pages.length; i++) {
    const png = await elementToPng(pages[i]);
    e.addImage(png, 0, i * PAGE, { w: BOARD_W, h: PAGE, locked: true });
  }

  if (plan && plan.pages.length) {
    const bgPicks = plan.bgPicks || null;
    for (const page of plan.pages) {
      const y0 = (page.pageIndex != null ? page.pageIndex : 0) * PAGE;
      const pick = bgPicks && bgPicks[page.pageIndex];
      for (const piece of page.locked || []) {
        if (piece.kind === 'text' && piece.text) {
          e.addText(piece.text, piece.x, y0 + piece.y, {
            size: piece.size || 14,
            color: piece.color || [30, 41, 59, 255],
            locked: true,
            width: (piece.w || 400) / BOARD_W,
          });
          continue;
        }
        const png = await pieceToPng(piece, artCtx);
        if (png) e.addImage(png, piece.x, y0 + piece.y, {
          w: piece.w, h: piece.h, locked: true,
        });
      }
      // Scene-building recipes: stand pieces on groundY in the clear centre band.
      // matchDock / orderLine stay in the dock — standing them mid-board covers cards.
      const SB = window.SceneBackgrounds;
      const stands = (p) => !!(SB && SB.isStandRole(p.role));
      const standers = (page.unlocked || []).filter(stands);
      const floaters = (page.unlocked || []).filter((p) => !stands(p));

      for (const piece of floaters) {
        const png = await pieceToPng(piece, artCtx);
        if (png) e.addImage(png, piece.x, y0 + piece.y, {
          w: piece.w, h: piece.h, locked: false,
        });
      }

      const row = SB ? SB.standRow(standers, pick, BOARD_W) : null;
      if (row) {
        for (const slot of row) {
          const png = await pieceToPng(slot.piece, artCtx);
          if (!png) continue;
          e.addImage(png, slot.x, y0 + slot.y, { w: slot.w, h: slot.h, locked: false });
        }
      } else {
        for (const piece of standers) {
          const png = await pieceToPng(piece, artCtx);
          if (png) e.addImage(png, piece.x, y0 + piece.y, {
            w: piece.w, h: piece.h, locked: false,
          });
        }
      }
    }
    return e.toBlob();
  }

  // Legacy: spine slots without full plan
  const maxVocab = (window.VocabArt && window.VocabArt.MAX_BOARD_VOCAB) || 6;
  const vocab = (lesson.vocabulary || []).slice(0, maxVocab);
  const hasSpine = pages.length > 0 && slots && Number.isInteger(slots.newWords);

  if (hasSpine) {
    if (vocab.length && Number.isInteger(slots.newWords)) {
      const y0 = slots.newWords * PAGE;
      const shuffled = [...vocab].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        const v = shuffled[i];
        const col = i % 3, row = Math.floor(i / 3);
        const png = (await wordArtPng(v.word, artCtx))
          || null;
        if (!png) continue;
        e.addImage(png, 780 + col * 140, y0 + 280 + row * 130, { w: 88, h: 88 });
      }
    }

    const sentence = (lesson.reviewSentences || [])[0];
    if (sentence && Number.isInteger(slots.wrap)) {
      const y0 = slots.wrap * PAGE;
      const words = sentence.replace(/[.]$/, '').split(/\s+/).slice(0, 5);
      const shuffledWords = [...words].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffledWords.length; i++) {
        e.addImage(await tileToPng(shuffledWords[i]), 104 + i * 222, y0 + 455, { w: 186, h: 54 });
      }
      e.addText(`Answer: ${sentence}`, 70, y0 + 535,
                { size: 14, color: [255, 255, 255, 220], locked: true });
    }
    return e.toBlob();
  }

  // Legacy path: trailing activity pages when no rendered spine was passed
  const vocabPageIndex = pages.length;

  if (vocab.length) {
    const section = {
      title: 'New Words',
      tags: ['vocabulary', ...(vocab.map((v) => v.word))],
      vocabulary: vocab.map((v) => v.word),
    };
    let pick = null;
    let bg = null;
    if (window.SceneBackgrounds) {
      pick = await window.SceneBackgrounds.pickFor(section, { index: 0 });
      bg = await window.SceneBackgrounds.loadPng(pick);
    } else {
      bg = await activityBackground('New Words', 'Say each word. Look at the picture beside it.',
                              vocab.map((v) => v.word));
    }
    e.addImage(bg, 0, vocabPageIndex * PAGE, { w: BOARD_W, h: PAGE, locked: true });

    const shuffled = [...vocab].sort(() => Math.random() - 0.5);
    const pieceH = 96;
    const pieceW = 96;
    const gap = 20;
    const totalW = shuffled.length * pieceW + gap * Math.max(0, shuffled.length - 1);
    let x = Math.max(260, Math.min(1020 - totalW, Math.round((BOARD_W - totalW) / 2)));
    for (let i = 0; i < shuffled.length; i++) {
      const v = shuffled[i];
      const png = (await wordArtPng(v.word, artCtx))
        || null;
      if (!png) continue;
      const yLocal = (pick && window.SceneBackgrounds)
        ? window.SceneBackgrounds.standOn(pick, pieceH)
        : (235 + Math.floor(i / 3) * 150);
      e.addImage(png, x, vocabPageIndex * PAGE + yLocal, { w: pieceW, h: pieceH });
      x += pieceW + gap;
    }
  }

  const sentence = (lesson.reviewSentences || [])[0];
  if (sentence) {
    const idx = vocabPageIndex + (vocab.length ? 1 : 0);
    const words = sentence.replace(/[.]$/, '').split(/\s+/).slice(0, 5);
    const section = {
      title: 'Build a Sentence',
      tags: ['sentence', 'review', ...words],
      vocabulary: words,
    };
    let pick = null;
    let bg = null;
    if (window.SceneBackgrounds) {
      pick = await window.SceneBackgrounds.pickFor(section, { index: 1 });
      bg = await window.SceneBackgrounds.loadPng(pick);
    } else {
      bg = await buildBackground('Build a Sentence',
                               'Drag the word tiles into order, then read it out loud.');
    }
    e.addImage(bg, 0, idx * PAGE, { w: BOARD_W, h: PAGE, locked: true });

    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const pieceW = 186;
    const pieceH = 54;
    const gap = 16;
    const totalW = shuffled.length * pieceW + gap * Math.max(0, shuffled.length - 1);
    let x = Math.max(260, Math.min(1020 - totalW, Math.round((BOARD_W - totalW) / 2)));
    for (const word of shuffled) {
      const yLocal = (pick && window.SceneBackgrounds)
        ? window.SceneBackgrounds.standOn(pick, pieceH)
        : 455;
      e.addImage(await tileToPng(word), x, idx * PAGE + yLocal, { w: pieceW, h: pieceH });
      x += pieceW + gap;
    }
    e.addText(`Answer: ${sentence}`, 70, idx * PAGE + 535,
              { size: 14, color: [90, 105, 120, 255], locked: true });
  }

  return e.toBlob();
}

// simple programmatic backgrounds for the activity pages
async function activityBackground(title, intro, words) {
  const c = document.createElement('canvas');
  c.width = BOARD_W; c.height = PAGE;
  const ctx = c.getContext('2d');
  paintChrome(ctx, title, intro, '#FDF8F0');
  const maxVocab = (window.VocabArt && window.VocabArt.MAX_BOARD_VOCAB) || 6;
  words.slice(0, maxVocab).forEach((w, i) => {
    const y = 200 + i * 62;
    roundRect(ctx, 70, y, 530, 54, 11, '#FFFFFF', '#EEE8DC');
    ctx.fillStyle = '#17827C';
    ctx.font = '700 26px Poppins, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(w, 96, y + 14);
    roundRect(ctx, 480, y + 4, 112, 46, 8, '#E7F3F2', '#17827C');
  });
  roundRect(ctx, 680, 190, 530, 370, 14, '#F7F1E7', '#EEE8DC');
  return canvasToPng(c);
}

async function buildBackground(title, intro) {
  const c = document.createElement('canvas');
  c.width = BOARD_W; c.height = PAGE;
  const ctx = c.getContext('2d');
  paintChrome(ctx, title, intro, '#1E2A38', '#FFFFFF', '#96A5B4');
  roundRect(ctx, 70, 215, 1140, 110, 14, '#2A3848', '#46586C');
  for (let k = 0; k < 5; k++) roundRect(ctx, 104 + k * 222, 243, 186, 54, 9, '#344456');
  ctx.strokeStyle = '#46586C'; ctx.beginPath();
  ctx.moveTo(70, 420); ctx.lineTo(1210, 420); ctx.stroke();
  ctx.fillStyle = '#F5C518'; ctx.font = '700 14px Poppins, sans-serif';
  ctx.fillText('WORD TILES', 70, 432);
  return canvasToPng(c);
}

function paintChrome(ctx, title, intro, bg, titleColor = '#17827C', introColor = '#6B7A87') {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, BOARD_W, PAGE);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = titleColor;
  ctx.font = '800 44px Poppins, sans-serif';
  ctx.fillText(title, 70, 92);
  ctx.fillStyle = introColor;
  ctx.font = '400 20px Poppins, sans-serif';
  ctx.fillText(intro, 70, 152);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

// ── expose as a global (index.html uses classic <script> tags) ────
window.EdbKit = {
  Edb, buildLessonEdb, elementToPng, pieceToPng, wordArtPng, glyphToPng, tileToPng,
  BOARD_W, BOARD_H, CANVAS_H, PAGE,
};
