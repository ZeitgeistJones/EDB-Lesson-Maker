/**
 * Ragged black-field sheet → connected-component crops (QA only).
 *
 * Uniform RxC gutters (`import-prop.mjs --sheet --grid`) are the wrong tool when
 * one prop spans several "rows" and scales differ wildly. This script:
 *   1. Thresholds the black field
 *   2. Optional morphological dilate (merge chains / lance tips / thin poles)
 *   3. 4-connected components → bounding boxes
 *   4. Writes a numbered QA sheet + blobs.json — does NOT key or write PropBank
 *
 *   node scripts/slice-blob-sheet.mjs assets-inbox/castle-medieval-sheet.png
 *   node scripts/slice-blob-sheet.mjs sheet.png --dilate=2 --min-area=80 --pad=8
 *
 * Knobs:
 *   --threshold   channel-max above which a pixel is object (default 24)
 *   --dilate      dilate passes before CC (default 1). 0 = no merge.
 *   --min-area    drop blobs smaller than this many mask pixels (default 120)
 *   --pad         bbox pad in source pixels before crop preview (default 6)
 *   --gap-warn    expanded-bbox gap under this → "cluster" ambiguity (default 14)
 *   --out         output dir (default tmp/blob-slice/<sheet-slug>)
 *
 * Import comes later: read blobs.json, name the numbered crops, then feed each
 * rect into import-prop cutout() (or a future --blobs import mode). Keep the
 * model out of pixel cutting.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function slug(s) {
  return String(s || 'sheet')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'sheet';
}

async function main() {
  const positional = process.argv[2];
  if (!positional || positional.startsWith('--')) {
    console.error('usage: node scripts/slice-blob-sheet.mjs <sheet.png> [--dilate=1] [--min-area=120]');
    process.exit(1);
  }
  const src = path.resolve(ROOT, positional);
  if (!fs.existsSync(src)) {
    console.error(`missing: ${src}`);
    process.exit(1);
  }

  const opts = {
    threshold: Number(arg('threshold', '24')),
    dilate: Number(arg('dilate', '1')),
    minArea: Number(arg('min-area', '120')),
    pad: Number(arg('pad', '6')),
    gapWarn: Number(arg('gap-warn', '14')),
  };
  const outDir = path.resolve(
    ROOT,
    arg('out', path.join('tmp', 'blob-slice', slug(path.basename(src, path.extname(src)))))
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'crops'), { recursive: true });

  const dataUrl = `data:image/png;base64,${fs.readFileSync(src).toString('base64')}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const result = await page.evaluate(
    async ({ url, T, dilateN, minArea, pad, gapWarn }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const W = img.width;
      const H = img.height;
      const n = W * H;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, W, H).data;

      const mask = new Uint8Array(n);
      for (let i = 0, p = 0; i < px.length; i += 4, p++) {
        const v = px[i] > px[i + 1]
          ? (px[i] > px[i + 2] ? px[i] : px[i + 2])
          : (px[i + 1] > px[i + 2] ? px[i + 1] : px[i + 2]);
        mask[p] = v > T ? 1 : 0;
      }

      const dilate = (m, times) => {
        let cur = m;
        for (let t = 0; t < times; t++) {
          const next = new Uint8Array(n);
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const p = y * W + x;
              if (cur[p]) {
                next[p] = 1;
                continue;
              }
              // 8-neighbour grow — reconnects thin chains / poles better than 4.
              let hit = 0;
              for (let dy = -1; dy <= 1 && !hit; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= H) continue;
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  if (nx < 0 || nx >= W) continue;
                  if (cur[ny * W + nx]) {
                    hit = 1;
                    break;
                  }
                }
              }
              next[p] = hit;
            }
          }
          cur = next;
        }
        return cur;
      };

      const work = dilateN > 0 ? dilate(mask, dilateN) : mask;

      // Label on dilated mask; measure bbox on ORIGINAL mask so crops stay tight.
      const label = new Int32Array(n);
      const stack = new Int32Array(n);
      const comps = []; // { id, areaDilate, areaOrig, minX, minY, maxX, maxY }
      let nextId = 1;

      for (let i = 0; i < n; i++) {
        if (!work[i] || label[i]) continue;
        let top = 0;
        let areaDilate = 0;
        let areaOrig = 0;
        let minX = W;
        let minY = H;
        let maxX = -1;
        let maxY = -1;
        const id = nextId++;
        stack[top++] = i;
        label[i] = id;
        while (top > 0) {
          const cur = stack[--top];
          areaDilate++;
          const cx = cur % W;
          const cy = (cur - cx) / W;
          if (mask[cur]) {
            areaOrig++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
          }
          const tryPush = (np) => {
            if (work[np] && !label[np]) {
              label[np] = id;
              stack[top++] = np;
            }
          };
          if (cx > 0) tryPush(cur - 1);
          if (cx < W - 1) tryPush(cur + 1);
          if (cy > 0) tryPush(cur - W);
          if (cy < H - 1) tryPush(cur + W);
        }
        if (areaOrig >= minArea && maxX >= 0) {
          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          const fill = areaOrig / Math.max(1, bw * bh);
          // Compression dust + dilate can weave a sheet-wide sparse "web"
          // that is one CC but not a prop. Drop near-full-frame ghosts.
          const spansSheet = bw > W * 0.85 && bh > H * 0.85;
          if (spansSheet && fill < 0.25) continue;
          comps.push({
            id,
            areaDilate,
            areaOrig,
            minX,
            minY,
            maxX,
            maxY,
            w: bw,
            h: bh,
          });
        }
      }

      // Reading order: top-to-bottom, then left-to-right (row bands by center Y).
      comps.sort((a, b) => {
        const ay = (a.minY + a.maxY) / 2;
        const by = (b.minY + b.maxY) / 2;
        const row = Math.round(ay / 40) - Math.round(by / 40);
        if (row) return row;
        return a.minX - b.minX;
      });

      const blobs = comps.map((c, i) => {
        const x = Math.max(0, c.minX - pad);
        const y = Math.max(0, c.minY - pad);
        const x2 = Math.min(W - 1, c.maxX + pad);
        const y2 = Math.min(H - 1, c.maxY + pad);
        return {
          index: i + 1,
          x,
          y,
          w: x2 - x + 1,
          h: y2 - y + 1,
          area: c.areaOrig,
          aspect: Number(((x2 - x + 1) / Math.max(1, y2 - y + 1)).toFixed(3)),
          flags: [],
        };
      });

      // Ambiguity: only flag meaningful cases — packed sheets always have
      // neighbours within ~10px, so "near anyone" is noise.
      const areas = blobs.map((b) => b.area).sort((a, b) => a - b);
      const median = areas.length ? areas[Math.floor(areas.length / 2)] : 1;
      for (let i = 0; i < blobs.length; i++) {
        const a = blobs[i];
        if (a.area < median * 0.08) a.flags.push('tiny-vs-median');
        const fill = a.area / Math.max(1, a.w * a.h);
        if (fill < 0.12 && a.w * a.h > 800) a.flags.push('sparse-bbox-lattice?');
        for (let j = i + 1; j < blobs.length; j++) {
          const b = blobs[j];
          const gx = b.x >= a.x + a.w ? b.x - (a.x + a.w) : a.x >= b.x + b.w ? a.x - (b.x + b.w) : 0;
          const gy = b.y >= a.y + a.h ? b.y - (a.y + a.h) : a.y >= b.y + b.h ? a.y - (b.y + b.h) : 0;
          const sep = Math.max(gx, gy);
          if (sep > gapWarn) continue;
          const aTiny = a.area < median * 0.15;
          const bTiny = b.area < median * 0.15;
          // Touching shred next to a real prop → split risk (lance tip, roof scrap).
          if (sep <= 2 && (aTiny || bTiny)) {
            a.flags.push(`fragment-near:#${b.index}`);
            b.flags.push(`fragment-near:#${a.index}`);
          }
          // Overlapping bboxes (sep 0) with very different areas → one may be debris
          // inside another's frame (not used for side-by-side banner rows).
          if (sep === 0 && Math.min(a.area, b.area) / Math.max(a.area, b.area) < 0.25) {
            a.flags.push(`overlap-debris:#${b.index}`);
            b.flags.push(`overlap-debris:#${a.index}`);
          }
        }
        a.flags = [...new Set(a.flags)];
      }

      // Numbered QA overlay on source
      const qa = document.createElement('canvas');
      qa.width = W;
      qa.height = H;
      const qctx = qa.getContext('2d');
      qctx.drawImage(img, 0, 0);
      qctx.lineWidth = Math.max(2, Math.round(Math.min(W, H) / 400));
      qctx.font = `bold ${Math.max(14, Math.round(Math.min(W, H) / 45))}px sans-serif`;
      blobs.forEach((b) => {
        const amb = b.flags.length > 0;
        qctx.strokeStyle = amb ? '#f59e0b' : '#22c55e';
        qctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        const label = String(b.index);
        const tw = qctx.measureText(label).width + 10;
        const th = Math.max(18, Math.round(Math.min(W, H) / 40));
        qctx.fillStyle = amb ? 'rgba(245,158,11,0.92)' : 'rgba(34,197,94,0.92)';
        qctx.fillRect(b.x, b.y, tw, th);
        qctx.fillStyle = '#0f172a';
        qctx.textBaseline = 'middle';
        qctx.fillText(label, b.x + 5, b.y + th / 2);
      });

      // Contact strip of crops (numbered tiles)
      const cols = Math.ceil(Math.sqrt(blobs.length));
      const rows = Math.ceil(blobs.length / cols);
      const cell = 160;
      const strip = document.createElement('canvas');
      strip.width = cols * cell;
      strip.height = rows * cell;
      const sctx = strip.getContext('2d');
      sctx.fillStyle = '#111827';
      sctx.fillRect(0, 0, strip.width, strip.height);
      blobs.forEach((b, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = col * cell;
        const oy = row * cell;
        sctx.fillStyle = b.flags.length ? '#3b2f1a' : '#1f2937';
        sctx.fillRect(ox + 2, oy + 2, cell - 4, cell - 4);
        const scale = Math.min((cell - 28) / b.w, (cell - 36) / b.h);
        const dw = Math.max(1, Math.round(b.w * scale));
        const dh = Math.max(1, Math.round(b.h * scale));
        sctx.drawImage(
          img,
          b.x, b.y, b.w, b.h,
          ox + Math.floor((cell - dw) / 2),
          oy + 22 + Math.floor((cell - 28 - dh) / 2),
          dw, dh
        );
        sctx.fillStyle = b.flags.length ? '#fbbf24' : '#86efac';
        sctx.font = 'bold 14px sans-serif';
        sctx.fillText(`#${b.index}`, ox + 8, oy + 16);
      });

      // Individual crop data URLs (PNG) for later review
      const crops = blobs.map((b) => {
        const cc = document.createElement('canvas');
        cc.width = b.w;
        cc.height = b.h;
        cc.getContext('2d').drawImage(img, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        return { index: b.index, png: cc.toDataURL('image/png') };
      });

      return {
        width: W,
        height: H,
        blobCount: blobs.length,
        blobs,
        qaPng: qa.toDataURL('image/png'),
        stripPng: strip.toDataURL('image/png'),
        crops,
        medianArea: median,
      };
    },
    {
      url: dataUrl,
      T: opts.threshold,
      dilateN: opts.dilate,
      minArea: opts.minArea,
      pad: opts.pad,
      gapWarn: opts.gapWarn,
    }
  );

  await browser.close();

  function writeDataUrl(file, dataUrl) {
    const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  }

  writeDataUrl(path.join(outDir, 'qa-numbered.png'), result.qaPng);
  writeDataUrl(path.join(outDir, 'qa-strip.png'), result.stripPng);
  for (const crop of result.crops) {
    writeDataUrl(path.join(outDir, 'crops', `${String(crop.index).padStart(3, '0')}.png`), crop.png);
  }

  const ambiguous = result.blobs.filter((b) => b.flags.length);
  const summary = {
    source: path.relative(ROOT, src).replace(/\\/g, '/'),
    generatedAt: new Date().toISOString(),
    sheet: { width: result.width, height: result.height },
    opts,
    blobCount: result.blobCount,
    medianArea: result.medianArea,
    ambiguousCount: ambiguous.length,
    blobs: result.blobs,
    outputs: {
      qaNumbered: path.relative(ROOT, path.join(outDir, 'qa-numbered.png')).replace(/\\/g, '/'),
      qaStrip: path.relative(ROOT, path.join(outDir, 'qa-strip.png')).replace(/\\/g, '/'),
      cropsDir: path.relative(ROOT, path.join(outDir, 'crops')).replace(/\\/g, '/'),
    },
    notes: [
      'Green boxes = clean singleton. Amber = flagged (cluster / tiny / sparse lattice).',
      'Dilate merges thin gaps; raise --dilate if swords split, lower if finials fuse.',
      'Portcullis / grates often shatter (black between bars) — expect sparse-bbox flags.',
      'No PropBank import yet — name from this QA, then key via import-prop.',
    ],
  };
  fs.writeFileSync(path.join(outDir, 'blobs.json'), JSON.stringify(summary, null, 2));

  console.log(`\nSheet ${result.width}×${result.height}`);
  console.log(`Blobs: ${result.blobCount}  (median area ${result.medianArea})`);
  console.log(`Ambiguous: ${ambiguous.length}`);
  if (ambiguous.length) {
    console.log('\nFlagged crops:');
    for (const b of ambiguous) {
      console.log(`  #${String(b.index).padStart(2)}  ${b.w}×${b.h}  area=${b.area}  ${b.flags.join(', ')}`);
    }
  }
  console.log(`\nQA numbered: ${summary.outputs.qaNumbered}`);
  console.log(`QA strip:    ${summary.outputs.qaStrip}`);
  console.log(`JSON:        ${path.relative(ROOT, path.join(outDir, 'blobs.json'))}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
