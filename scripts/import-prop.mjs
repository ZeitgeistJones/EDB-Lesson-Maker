/**
 * Turn a generated prop image into a board-ready cutout with real alpha.
 *
 * Props are generated one at a time on a pure black field, because the image
 * model has no transparency. Black cannot simply be deleted: an antialiased
 * edge pixel is already the object's colour blended toward black, so a plain
 * threshold leaves a dark rim that only reveals itself once the prop sits on a
 * pale background — which is where every prop ends up. Recovering the true
 * colour by dividing alpha back out does not work either, because a dark pixel
 * is genuinely ambiguous: half-covered pale blue and fully-covered navy look
 * identical against black.
 *
 * So we do what texture pipelines do. Threshold to a mask, feather that mask
 * for the alpha channel only, and bleed colour from the object's interior
 * outward past the silhouette. Edge pixels then carry honest interior colour
 * at partial alpha, and no black survives to fringe.
 *
 *   node scripts/import-prop.mjs --latest --name=backpack --role=container \
 *     --tags=bag,backpack,school
 *
 * A hosted image model will also return nine props as a 3x3 contact sheet on
 * one black field, which is nine props for one round trip instead of nine. So a
 * sheet is a first-class input: --sheet walks every cell in one browser, taking
 * the parallel lists in reading order, left to right and top to bottom.
 *
 *   node scripts/import-prop.mjs sheet.png --sheet --grid=3x3 \
 *     --names=desk,wall-clock,file-folder,clipboard,supply-caddy,magazine-file,pencil-pot,desk-mat,globe \
 *     --roles=furniture,timer,container,tool,container,container,container,furniture,object \
 *     --scales=0.8,0.3,0.25,0.3,0.35,0.3,0.2,0.45,0.35 \
 *     --anchors=bottom,center,center,center,bottom,bottom,bottom,bottom,bottom
 *
 * The same keying converts the legacy pack in place, which is what --convert
 * does: every manifest prop that is still a black-backed PNG, in one browser.
 *
 *   node scripts/import-prop.mjs --convert
 *
 * Options:
 *   --convert      re-key every non-alpha prop in the manifest, in place
 *   --latest       take the newest PNG the image tool wrote for this project
 *   --from=DIR     look in DIR instead (with --latest, or as the file's parent)
 *   --name         manifest key and output filename (default: input filename)
 *   --grid         RxC when the image is a contact sheet of several props
 *   --grid-bounds  optional x,y,width,height source rectangle for sheets whose
 *                  usable grid is inset inside a larger source canvas
 *   --min-filled-cells
 *                  fail a sheet when fewer than this many panels contain source
 *                  pixels after slicing; defaults to --names length in --sheet
 *   --cell         row,col (0-indexed) of the single panel to take from a grid
 *   --sheet        take every cell of --grid in one pass, reusing the browser
 *   --names        one slug per cell in reading order (--sheet; must fill RxC)
 *   --roles        parallel to --names; short lists fall back to --role
 *   --scales       parallel to --names; short lists fall back to --scale
 *   --anchors      parallel to --names; short lists fall back to --anchor
 *   --role         manifest role, e.g. cover / tray / container
 *   --tags         comma-separated manifest tags
 *   --pack         theme pack tag (e.g. castle) — written when --write is set
 *   --write        write the manifest row (not just print paste text)
 *   --components   how many separate shapes are legitimate (default 1; the
 *                  reward jar plus its detached lid is 2)
 *   --scale        real-world size relative to the biggest props, 0.1 to 1.0
 *                  (a door is 1.0, a chair 0.6, a pencil 0.1) so a pencil and a
 *                  bookshelf are not both drawn at 96px. Judgement, not pixels.
 *   --anchor       bottom (default, rests on the floor), top (hangs, e.g. a
 *                  swing) or center (free-floating, e.g. a speech bubble).
 *                  SceneBackgrounds.standOn puts a piece's base on groundY,
 *                  which is wrong for anything hanging or floating.
 *   --threshold    channel-max value above which a pixel is object (default 24)
 *   --white        key a NEAR-WHITE background to transparent instead of black.
 *                  The background is flood-filled inward from the border, so a
 *                  large INTERIOR white region — a chef hat, a bowl, a phone
 *                  screen — stays opaque instead of being punched into a hole,
 *                  which is the whole difference from a naive white threshold.
 *                  Framing gates (C2-C4) report but do not block in this mode,
 *                  because curated external packs are already-composed art.
 *   --white-tol    how far below 255 still counts as background white (default
 *                  14; corners of real packs sit near 253, not 255)
 *   --size         long edge of the output PNG (default 512)
 *   --margin       share of the output left empty on each side (default 0.08)
 *   --force        write the PNG even when a gate fails
 *   --outdir       write cutout PNGs here instead of the live prop img dir, so
 *                  a staged bulk run never touches shipped art
 *   --rawdir       bank the source raw here instead of assets-inbox/raw
 *   --stage        staging run: write PNGs (honouring --outdir) but never the
 *                  live manifest; pair with --sheet + --results for bulk import
 *   --stage-all    like --stage but also force past the hard gates, keeping
 *                  every non-empty panel so even flagged tiles can be eyeballed
 *   --results      dump a per-panel JSON report (gates, forced, staged path)
 *                  Note: decorative packs set decorative:true on staged rows
 *                  before merge (docs/prop-style-lock.md); no --decorative flag.
 *
 * On a --sheet, only C1/C6/C7 block a tile (dirty field / interior holes). The
 * framing gates C2-C4 are fixed by the re-pad, and C5/C8 misfire on thin/small
 * props, so they are auto-forced and reported per tile but never block or drop.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { mutateManifest } from './lib/manifest-lock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

// Output dirs default to the live prop pack, but --outdir / --rawdir redirect
// them to a scratch folder so a staged bulk run writes nothing into shipped art.
const OUT_DIR = path.resolve(ROOT, arg('outdir', path.join('public', 'assets', '09_props', 'img')));
const AUDIT_DIR = path.resolve(ROOT, arg('rawdir', path.join('assets-inbox', 'raw')));

/**
 * Where the image tool drops its output: the per-project folder under the
 * user's Cursor directory, named after this workspace path.
 */
function generatedDir() {
  const key = ROOT.replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase()).replace(/[\\/]/g, '-');
  return path.join(os.homedir(), '.cursor', 'projects', key, 'assets');
}

function newestPng(dir) {
  if (!fs.existsSync(dir)) return null;
  const pngs = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return pngs.length ? path.join(dir, pngs[0].f) : null;
}

function resolveSource() {
  const positional = process.argv[2];
  if (positional && !positional.startsWith('--')) {
    const dir = arg('from');
    return path.resolve(ROOT, dir ? path.join(dir, positional) : positional);
  }
  const dir = arg('from') ? path.resolve(ROOT, arg('from')) : generatedDir();
  const latest = newestPng(dir);
  if (!latest) {
    console.error(`No PNG found in ${dir}`);
    process.exit(1);
  }
  return latest;
}

/**
 * Where the panels of a contact sheet actually are.
 *
 * Cutting the sheet into exact RxC thirds assumes the generator centred every
 * object on that pitch, and it does not. On the first sheet this was built for,
 * equal thirds sliced the tips off the pencils, both ends off the desk mat and
 * the top off the globe, and dragged a green sliver of one prop into its
 * neighbour's frame. The black field makes the real cut lines cheap to find
 * instead: a gutter is a line with nothing on it. Columns are searched inside
 * each row band, because one row's gutter often sits where the row above still
 * has art.
 */
function parseGridBounds(value) {
  if (!value) return null;
  const parts = value.split(',').map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error('--grid-bounds must be x,y,width,height');
  }
  const [x, y, width, height] = parts.map((v) => Math.round(v));
  if (width < 1 || height < 1) throw new Error('--grid-bounds width and height must be positive');
  return { x, y, width, height };
}

async function panelRects(page, src, rows, cols, threshold, manualBounds = null) {
  const dataUrl = `data:image/png;base64,${fs.readFileSync(src).toString('base64')}`;
  return page.evaluate(
    async ({ url, T, rows: gr, cols: gc, manualBounds }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const W = img.width;
      const H = img.height;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, W, H).data;
      const on = (x, y) => {
        const i = (y * W + x) * 4;
        return (px[i] > px[i + 1] ? (px[i] > px[i + 2] ? px[i] : px[i + 2]) : px[i + 1] > px[i + 2] ? px[i + 1] : px[i + 2]) > T;
      };

      const lineActive = (axis, pos, from, to) => {
        let n = 0;
        if (axis === 'x') {
          for (let y = from; y < to; y++) if (on(pos, y)) n++;
        } else {
          for (let x = from; x < to; x++) if (on(x, pos)) n++;
        }
        return n;
      };

      const inferBounds = () => {
        if (manualBounds) {
          return {
            x0: Math.max(0, manualBounds.x),
            y0: Math.max(0, manualBounds.y),
            x1: Math.min(W, manualBounds.x + manualBounds.width),
            y1: Math.min(H, manualBounds.y + manualBounds.height),
            mode: 'manual',
          };
        }

        let minX = W;
        let minY = H;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (!on(x, y)) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
        if (maxX < 0) return { x0: 0, y0: 0, x1: W, y1: H, mode: 'empty' };

        const seekEmpty = (axis, start, step, limit, from, to) => {
          let p = start;
          while (p !== limit) {
            if (lineActive(axis, p, from, to) === 0) return p;
            p += step;
          }
          return limit;
        };
        const pad = Math.max(2, Math.round(Math.min(W / gc, H / gr) * 0.08));
        const x0 = Math.max(0, seekEmpty('x', minX, -1, -1, Math.max(0, minY - pad), Math.min(H, maxY + pad + 1)));
        const x1 = Math.min(W, seekEmpty('x', maxX, 1, W, Math.max(0, minY - pad), Math.min(H, maxY + pad + 1)) + 1);
        const y0 = Math.max(0, seekEmpty('y', minY, -1, -1, Math.max(0, minX - pad), Math.min(W, maxX + pad + 1)));
        const y1 = Math.min(H, seekEmpty('y', maxY, 1, H, Math.max(0, minX - pad), Math.min(W, maxX + pad + 1)) + 1);
        return { x0, y0, x1, y1, mode: 'inferred' };
      };

      const bounds = inferBounds();
      const BW = Math.max(1, bounds.x1 - bounds.x0);
      const BH = Math.max(1, bounds.y1 - bounds.y0);

      const snap = (guess, span, lower, upper, count) => {
        const reach = Math.min(Math.round(span * 0.5), guess - lower, upper - guess);
        const from = guess - reach;
        const counts = [];
        for (let p = from; p <= guess + reach; p++) counts.push(count(p));

        // Cut through the middle of the gutter nearest the guess. Hugging its
        // first empty line instead would leave whichever prop the cut lands
        // against no margin at all, and the framing gates would then fail for a
        // reason that is purely about where we cut.
        let best = null;
        let bestDist = Infinity;
        let run = -1;
        for (let i = 0; i <= counts.length; i++) {
          if (i < counts.length && counts[i] === 0) {
            if (run < 0) run = i;
            continue;
          }
          if (run >= 0) {
            const mid = from + Math.round((run + i - 1) / 2);
            if (Math.abs(mid - guess) < bestDist) {
              bestDist = Math.abs(mid - guess);
              best = mid;
            }
            run = -1;
          }
        }
        if (best != null) return best;

        // No clean gutter anywhere near: take the emptiest line and let the
        // gates report whatever bled across.
        let at = guess;
        let low = Infinity;
        counts.forEach((v, i) => {
          const p = from + i;
          if (v < low || (v === low && Math.abs(p - guess) < Math.abs(at - guess))) {
            low = v;
            at = p;
          }
        });
        return at;
      };

      const rowCuts = [bounds.y0];
      for (let r = 1; r < gr; r++) {
        rowCuts.push(
          snap(bounds.y0 + Math.round((r * BH) / gr), BH / gr, bounds.y0, bounds.y1, (y) => {
            let n = 0;
            for (let x = bounds.x0; x < bounds.x1; x++) if (on(x, y)) n++;
            return n;
          })
        );
      }
      rowCuts.push(bounds.y1);

      const rects = [];
      for (let r = 0; r < gr; r++) {
        const y = rowCuts[r];
        const y1 = rowCuts[r + 1];
        const colCuts = [bounds.x0];
        for (let cx = 1; cx < gc; cx++) {
          colCuts.push(
            snap(bounds.x0 + Math.round((cx * BW) / gc), BW / gc, bounds.x0, bounds.x1, (x) => {
              let n = 0;
              for (let yy = y; yy < y1; yy++) if (on(x, yy)) n++;
              return n;
            })
          );
        }
        colCuts.push(bounds.x1);
        for (let cx = 0; cx < gc; cx++) {
          const x = colCuts[cx];
          const width = colCuts[cx + 1] - x;
          const height = y1 - y;
          let active = 0;
          for (let yy = y; yy < y1; yy++) {
            for (let xx = x; xx < x + width; xx++) if (on(xx, yy)) active++;
          }
          rects.push({ x, y, width, height, active, activeRatio: active / Math.max(1, width * height) });
        }
      }
      return { bounds, rects };
    },
    { url: dataUrl, T: threshold, rows, cols, manualBounds }
  );
}

async function cutout(page, src, opts, rect) {
  const dataUrl = `data:image/png;base64,${fs.readFileSync(src).toString('base64')}`;
  return page.evaluate(
    async ({ url, T, SIZE, MARGIN, box, WHITE, WTOL }) => {
      const img = new Image();
      img.src = url;
      await img.decode();

      // A contact sheet is cut down to one panel first, so everything below —
      // the black-field check, the mask, the gates — only ever sees the pixels
      // of the prop it is actually keying.
      const panel = box || { x: 0, y: 0, width: img.width, height: img.height };
      const w = panel.width;
      const h = panel.height;
      const n = w * h;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, panel.x, panel.y, w, h, 0, 0, w, h);
      const image = ctx.getImageData(0, 0, w, h);
      const px = image.data;

      // Channel max, not luminance. Pure blue has a luminance of 29 but a
      // channel max of 255 — keying on luminance would eat saturated dark trim.
      const val = new Uint8Array(n);
      for (let i = 0, p = 0; i < px.length; i += 4, p++) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        val[p] = r > g ? (r > b ? r : b) : g > b ? g : b;
      }

      // C1 — is the frame the expected clean field, or did we get an
      // environment? Black mode wants a black border ring; white mode wants a
      // near-white one. Either way the border should read as background.
      const ring = Math.max(4, Math.round(Math.min(w, h) * 0.006));

      // The object mask and the ring-purity number are the only two things that
      // differ between the two fields, so they branch here and the rest of the
      // pipeline — feather, colour bleed, gates, crop, re-pad — is shared.
      //
      // Both modes flood-fill background from the border. A plain threshold
      // punches INTERIOR field-coloured regions transparent (white: chef hat /
      // bowl; black: camera lens, crab outlines). Only pixels that match the
      // field AND are connected to the edge are knocked out.
      const mask = new Uint8Array(n);
      const floodBgFromBorder = (isBg) => {
        const bg = new Uint8Array(n);
        const queue = new Int32Array(n);
        let qh = 0;
        const seed = (p) => {
          if (!bg[p] && isBg(p)) {
            bg[p] = 1;
            queue[qh++] = p;
          }
        };
        for (let x = 0; x < w; x++) {
          seed(x);
          seed((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          seed(y * w);
          seed(y * w + w - 1);
        }
        for (let qt = 0; qt < qh; qt++) {
          const cur = queue[qt];
          const cx = cur % w;
          const cy = (cur - cx) / w;
          if (cx > 0) seed(cur - 1);
          if (cx < w - 1) seed(cur + 1);
          if (cy > 0) seed(cur - w);
          if (cy < h - 1) seed(cur + w);
        }
        for (let p = 0; p < n; p++) mask[p] = bg[p] ? 0 : 1;
      };

      let ringPurity;
      if (WHITE) {
        // White is high on every channel, so test the channel MIN against a
        // tolerance below 255. A near-white background pixel has min >= wthr.
        const wthr = 255 - WTOL;
        const isBg = (p) => {
          const i = p * 4;
          return px[i] >= wthr && px[i + 1] >= wthr && px[i + 2] >= wthr;
        };
        floodBgFromBorder(isBg);

        let ringTotal = 0;
        let ringBg = 0;
        for (let y = 0; y < h; y++) {
          const edgeRow = y < ring || y >= h - ring;
          for (let x = 0; x < w; x++) {
            if (!edgeRow && x >= ring && x < w - ring) continue;
            ringTotal++;
            if (isBg(y * w + x)) ringBg++;
          }
        }
        ringPurity = ringBg / ringTotal;
      } else {
        let ringTotal = 0;
        let ringBlack = 0;
        for (let y = 0; y < h; y++) {
          const edgeRow = y < ring || y >= h - ring;
          for (let x = 0; x < w; x++) {
            if (!edgeRow && x >= ring && x < w - ring) continue;
            ringTotal++;
            if (val[y * w + x] <= 12) ringBlack++;
          }
        }
        ringPurity = ringBlack / ringTotal;
        // Opposite predicate of white mode: near-black channel-max is background.
        // Flood from the border so sealed dark interiors stay opaque.
        floodBgFromBorder((p) => val[p] <= T);
      }

      // Content bounding box.
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x]) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return { empty: true };

      const bboxW = maxX - minX + 1;
      const bboxH = maxY - minY + 1;
      const margins = {
        left: minX / w,
        right: (w - 1 - maxX) / w,
        top: minY / h,
        bottom: (h - 1 - maxY) / h,
      };
      // How much of the frame the object spans in its better direction. Raw
      // bbox area is unfair to a wide, short prop like a tray: it fills the
      // frame horizontally and is still only 40% of a squarish frame.
      const span = Math.max(bboxW / w, bboxH / h);

      const erode = (m, times) => {
        let cur = m;
        for (let t = 0; t < times; t++) {
          const next = new Uint8Array(n);
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const p = y * w + x;
              if (!cur[p]) continue;
              if (
                cur[p - 1] &&
                cur[p + 1] &&
                cur[p - w] &&
                cur[p + w] &&
                cur[p - w - 1] &&
                cur[p - w + 1] &&
                cur[p + w - 1] &&
                cur[p + w + 1]
              ) {
                next[p] = 1;
              }
            }
          }
          cur = next;
        }
        return cur;
      };

      // C6 — near-black regions well inside the object. Black keying cannot
      // preserve these, so they will punch holes or go translucent. Measured
      // away from the silhouette so ordinary antialiasing does not count.
      const inner = erode(mask, 3);
      let innerN = 0;
      let innerDark = 0;
      const wthr6 = 255 - WTOL;
      for (let p = 0; p < n; p++) {
        if (!inner[p]) continue;
        innerN++;
        if (WHITE) {
          // White mode: how much of the deep interior is itself near-white. It
          // is legitimately preserved (a chef hat), but a high number is the
          // signal to eyeball the cutout for eaten white or a re-opened hole.
          const i = p * 4;
          if (px[i] >= wthr6 && px[i + 1] >= wthr6 && px[i + 2] >= wthr6) innerDark++;
        } else if (val[p] <= T + 6) {
          // Black mode: near-black interior that keying would blow into holes.
          innerDark++;
        }
      }
      const darkInside = innerN ? innerDark / innerN : 0;

      // C9 (black mode) — residual white "plate" left after keying. Manus densify
      // sheets often put the object on a pale card; black key removes only the
      // void and ships a white rectangle behind the toy. That reads as an
      // unkeyed sticker on ClassIn docks. Fail when opaque near-white dominates.
      let plateN = 0;
      let plateWhite = 0;
      if (!WHITE) {
        const wthr9 = 255 - Math.min(WTOL, 24);
        for (let p = 0; p < n; p++) {
          if (!mask[p]) continue;
          plateN++;
          const i = p * 4;
          if (px[i] >= wthr9 && px[i + 1] >= wthr9 && px[i + 2] >= wthr9) plateWhite++;
        }
      }
      const whitePlate = plateN ? plateWhite / plateN : 0;

      // C5 — separate shapes. Counted on the eroded mask with 4-connectivity,
      // because a soft glow around two nearby props bridges them into one blob
      // otherwise, and the jar plus its detached lid would read as a single
      // object. Erosion snaps those thin bridges.
      const seen = new Uint8Array(n);
      const stack = new Int32Array(n);
      const minBlob = Math.max(24, Math.round(n * 0.0004));
      let blobs = 0;
      for (let i = 0; i < n; i++) {
        if (!inner[i] || seen[i]) continue;
        let top = 0;
        let area = 0;
        stack[top++] = i;
        seen[i] = 1;
        while (top > 0) {
          const cur = stack[--top];
          area++;
          const cx = cur % w;
          const cy = (cur - cx) / w;
          if (cx > 0 && inner[cur - 1] && !seen[cur - 1]) (seen[cur - 1] = 1), (stack[top++] = cur - 1);
          if (cx < w - 1 && inner[cur + 1] && !seen[cur + 1]) (seen[cur + 1] = 1), (stack[top++] = cur + 1);
          if (cy > 0 && inner[cur - w] && !seen[cur - w]) (seen[cur - w] = 1), (stack[top++] = cur - w);
          if (cy < h - 1 && inner[cur + w] && !seen[cur + w]) (seen[cur + w] = 1), (stack[top++] = cur + w);
        }
        if (area >= minBlob) blobs++;
      }

      // Alpha: feather the mask so edges are not a staircase. Colour is handled
      // separately below, so this blur never drags black into the picture.
      let alpha = new Float32Array(n);
      for (let p = 0; p < n; p++) alpha[p] = mask[p];
      for (let pass = 0; pass < 2; pass++) {
        const next = new Float32Array(n);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let sum = 0;
            let cnt = 0;
            for (let dy = -1; dy <= 1; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= h) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= w) continue;
                sum += alpha[ny * w + nx];
                cnt++;
              }
            }
            next[y * w + x] = sum / cnt;
          }
        }
        alpha = next;
      }

      // Colour bleed. Interior colour is trustworthy; everything from two
      // pixels of the edge outward gets refilled from its known neighbours so
      // that no black-blended pixel survives under a partial alpha.
      let core = erode(mask, 2);
      let coreN = 0;
      for (let p = 0; p < n; p++) if (core[p]) coreN++;
      if (WHITE && coreN < Math.max(16, Math.round(n * 0.0002))) {
        // White/light subjects such as doctor coats, chef clothes, snowmen and
        // goal nets can be mostly thin pale strokes. A two-pixel erosion may
        // leave no trusted colour seed, which then makes the legitimate white
        // body disappear. Relax the seed only in white-mode; the alpha mask is
        // still border-flooded, so connected background white stays transparent.
        core = erode(mask, 1);
        coreN = 0;
        for (let p = 0; p < n; p++) if (core[p]) coreN++;
        if (coreN < Math.max(16, Math.round(n * 0.0002))) core = mask;
      }
      const known = new Uint8Array(n);
      const cr = new Uint8ClampedArray(n);
      const cg = new Uint8ClampedArray(n);
      const cb = new Uint8ClampedArray(n);
      for (let p = 0; p < n; p++) {
        if (!core[p]) continue;
        known[p] = 1;
        cr[p] = px[p * 4];
        cg[p] = px[p * 4 + 1];
        cb[p] = px[p * 4 + 2];
      }
      for (let pass = 0; pass < 6; pass++) {
        const add = [];
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            if (known[p] || alpha[p] <= 0.002) continue;
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let cnt = 0;
            for (let dy = -1; dy <= 1; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= h) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= w) continue;
                const q = ny * w + nx;
                if (!known[q]) continue;
                sr += cr[q];
                sg += cg[q];
                sb += cb[q];
                cnt++;
              }
            }
            if (cnt) add.push(p, sr / cnt, sg / cnt, sb / cnt);
          }
        }
        if (!add.length) break;
        for (let i = 0; i < add.length; i += 4) {
          const p = add[i];
          cr[p] = add[i + 1];
          cg[p] = add[i + 2];
          cb[p] = add[i + 3];
          known[p] = 1;
        }
      }

      // Anything still unresolved sits outside the object entirely.
      const partial = new Uint8Array(n);
      const opaque = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        const a = known[p] ? alpha[p] : 0;
        const i = p * 4;
        if (a <= 0.002) {
          px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
          continue;
        }
        px[i] = cr[p];
        px[i + 1] = cg[p];
        px[i + 2] = cb[p];
        px[i + 3] = Math.round(Math.min(1, a) * 255);
        if (a > 0.15 && a < 0.85) partial[p] = 1;
        else if (a >= 0.85) opaque[p] = 1;
      }

      // C7 — compare each edge to the object right behind it, not to the whole
      // object. A speech bubble is a white fill inside a grey outline: against
      // the average it looks like fringe, against its own neighbour it is fine.
      let band = partial;
      for (let t = 0; t < 3; t++) {
        const next = new Uint8Array(n);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (band[p] || band[p - 1] || band[p + 1] || band[p - w] || band[p + w]) next[p] = 1;
          }
        }
        band = next;
      }
      const lumAt = (p) => 0.2126 * cr[p] + 0.7152 * cg[p] + 0.0722 * cb[p];
      let fringeSum = 0;
      let fringeN = 0;
      let nearSum = 0;
      let nearN = 0;
      for (let p = 0; p < n; p++) {
        if (partial[p]) {
          fringeSum += lumAt(p);
          fringeN++;
        } else if (opaque[p] && band[p]) {
          nearSum += lumAt(p);
          nearN++;
        }
      }
      const edgeRatio = fringeN && nearN ? fringeSum / fringeN / (nearSum / nearN) : 1;

      // Dominant body hue. Recolouring a prop later — a red balloon, a purple
      // backpack — means remapping one hue band and leaving neutral trim and
      // shadow alone. Measuring it here costs nothing while the pixels are
      // already in memory, and saves reprocessing the whole pack later.
      const hueBuckets = new Float64Array(36);
      let colouredN = 0;
      for (let p = 0; p < n; p++) {
        if (!opaque[p]) continue;
        const rr = cr[p];
        const gg = cg[p];
        const bb = cb[p];
        const mx = Math.max(rr, gg, bb);
        const mn = Math.min(rr, gg, bb);
        const d = mx - mn;
        if (!mx || d / mx < 0.18) continue;
        let hue;
        if (mx === rr) hue = ((gg - bb) / d) % 6;
        else if (mx === gg) hue = (bb - rr) / d + 2;
        else hue = (rr - gg) / d + 4;
        hue = (hue * 60 + 360) % 360;
        hueBuckets[Math.floor(hue / 10)] += d / mx;
        colouredN++;
      }
      let peak = -1;
      let peakAt = 0;
      for (let i = 0; i < 36; i++) {
        const around = hueBuckets[(i + 35) % 36] + hueBuckets[i] + hueBuckets[(i + 1) % 36];
        if (around > peak) {
          peak = around;
          peakAt = i;
        }
      }
      const bodyHue = colouredN > n * 0.01 ? peakAt * 10 + 5 : null;
      ctx.putImageData(image, 0, 0);

      // Trim to the object, then re-pad so every prop carries the same margin.
      // The long edge is capped at the panel's own long edge: a 3x3 slice of a
      // 1024px sheet holds ~340px, and resampling that up to the usual 512 only
      // invents soft pixels. Sliced props come out smaller, which costs nothing
      // because a board draws a prop at 96-220px either way.
      const size = Math.min(SIZE, Math.max(w, h));
      const outerW = bboxW / (1 - MARGIN * 2);
      const outerH = bboxH / (1 - MARGIN * 2);
      const scale = size / Math.max(outerW, outerH);
      const outW = Math.round(outerW * scale);
      const outH = Math.round(outerH * scale);
      const drawW = Math.round(bboxW * scale);
      const drawH = Math.round(bboxH * scale);

      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const octx = out.getContext('2d');
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(
        c,
        minX,
        minY,
        bboxW,
        bboxH,
        Math.round((outW - drawW) / 2),
        Math.round((outH - drawH) / 2),
        drawW,
        drawH
      );

      return {
        png: out.toDataURL('image/png'),
        source: { width: img.width, height: img.height },
        panel: { width: w, height: h },
        out: { width: outW, height: outH },
        ringPurity,
        margins,
        span,
        blobs,
        darkInside,
        whitePlate,
        edgeRatio,
        bodyHue,
      };
    },
    {
      url: dataUrl,
      T: opts.threshold,
      SIZE: opts.size,
      MARGIN: opts.margin,
      box: rect || null,
      WHITE: !!opts.white,
      WTOL: opts.whiteTol,
    }
  );
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function gatesFor(r, wantComponents) {
  const minMargin = Math.min(r.margins.left, r.margins.right, r.margins.top, r.margins.bottom);
  const person = !!(r && r.personSubject);
  return [
    {
      id: 'C1',
      what: 'background is a clean black field',
      got: `${pct(r.ringPurity)} of the border ring is black`,
      ok: r.ringPurity >= 0.98,
    },
    {
      id: 'C2',
      what: 'object clear of the frame edge',
      got: `closest edge ${pct(minMargin)}`,
      ok: minMargin >= 0.02,
    },
    {
      id: 'C3',
      what: 'safe margin in range',
      got: `min ${pct(minMargin)} (want 4-18%)`,
      ok: minMargin >= 0.04 && minMargin <= 0.18,
    },
    {
      id: 'C4',
      // The floor is 0.66, not 0.7: a prop with thin extremities — a swing's
      // chains, an umbrella's handle — legitimately leaves more empty frame
      // than a chunky object does. A real swing measured 69% and would have
      // been rejected for art that was fine.
      what: 'object fills the frame sensibly',
      got: `spans ${pct(r.span)} of its long side (want 66-96%)`,
      ok: r.span >= 0.66 && r.span <= 0.96,
    },
    {
      id: 'C5',
      what: 'expected number of shapes',
      got: `${r.blobs} (want ${wantComponents})`,
      ok: r.blobs === wantComponents,
    },
    {
      id: 'C6',
      what: 'no near-black areas that keying would erase',
      got: `${pct(r.darkInside)} of the interior (want under 1%)`,
      ok: r.darkInside < 0.01,
    },
    {
      id: 'C7',
      what: 'edge colour matches the interior',
      got: `${r.edgeRatio.toFixed(2)}x interior brightness (want 0.75+)`,
      ok: r.edgeRatio >= 0.75,
    },
    {
      id: 'C8',
      what: 'cutout large enough for a ClassIn dock (no mushy upscales)',
      got: `short side ${Math.min(r.out.width, r.out.height)}px (want ${MIN_DOCK_SRC}+)`,
      // Heroes may be large on one axis only; dock toys need both usable.
      ok: Math.min(r.out.width, r.out.height) >= MIN_DOCK_SRC,
    },
    {
      id: 'C9',
      what: 'no leftover white plate behind the object',
      got: `${pct(r.whitePlate || 0)} of the cutout is near-white (want under 12%)`,
      ok: (r.whitePlate || 0) < 0.12,
    },
    {
      id: 'C10',
      what: 'person/figure not clipped at the top of the frame',
      got: person
        ? `top margin ${pct(r.margins.top)} (want ≥3%)`
        : 'n/a (not a person subject)',
      ok: !person || r.margins.top >= 0.03,
    },
  ];
}

/** Full-body / face figures — C10 blocks head crops (astronaut helmet flat-top). */
function looksLikePersonKey(key, meta) {
  const k = String(key || '').toLowerCase();
  if (!k) return false;
  // Dress parts / wearable objects are not full figures — C10 is for head crops.
  if (meta && String(meta.role || '') === 'dressPart') return false;
  if (
    /(^|-)(hat|helmet|boot|glove|apron|mask|armband|jersey|cleat|toque)s?(-|$)/.test(k) &&
    !/astronaut|spacesuit|person|kid|boy|girl|family|patient/.test(k)
  ) {
    return false;
  }
  if (meta && String(meta.subject || '').toLowerCase() === 'person') return true;
  if (/^job-/.test(k) || /^family-/.test(k)) return true;
  // \bclown\b avoids aquarium-clownfish; acrobat = circus figure.
  return /astronaut|spacesuit|space-suit|dental-kid|face-blank|-kid-|-boy-|-girl-|patient|dentist-character|policeman|firefighter|scientist|farmer|librarian|teacher|chef|pilot|nurse|doctor|baker|\bclown\b|acrobat/.test(k);
}

/**
 * Gate report for --white cutouts. Same shape, thresholds and ids as gatesFor
 * so the QA readout is identical, but C1 measures a white border ring instead
 * of a black one, and C6 measures preserved interior white instead of near-black
 * holes. The black-field gates are left untouched.
 */
function gatesForWhite(r, wantComponents) {
  const minMargin = Math.min(r.margins.left, r.margins.right, r.margins.top, r.margins.bottom);
  return [
    {
      id: 'C1',
      what: 'background is a clean white field',
      got: `${pct(r.ringPurity)} of the border ring is near-white`,
      ok: r.ringPurity >= 0.98,
    },
    {
      id: 'C2',
      what: 'object clear of the frame edge',
      got: `closest edge ${pct(minMargin)}`,
      ok: minMargin >= 0.02,
    },
    {
      id: 'C3',
      what: 'safe margin in range',
      got: `min ${pct(minMargin)} (want 4-18%)`,
      ok: minMargin >= 0.04 && minMargin <= 0.18,
    },
    {
      id: 'C4',
      what: 'object fills the frame sensibly',
      got: `spans ${pct(r.span)} of its long side (want 66-96%)`,
      ok: r.span >= 0.66 && r.span <= 0.96,
    },
    {
      id: 'C5',
      what: 'expected number of shapes',
      got: `${r.blobs} (want ${wantComponents})`,
      ok: r.blobs === wantComponents,
    },
    {
      id: 'C6',
      what: 'interior white preserved, object not mostly background',
      got: `${pct(r.darkInside)} of the interior is near-white (inspect if high; fail over 60%)`,
      ok: r.darkInside <= 0.6,
    },
    {
      id: 'C7',
      what: 'edge colour matches the interior',
      got: `${r.edgeRatio.toFixed(2)}x interior brightness (want 0.75+)`,
      ok: r.edgeRatio >= 0.75,
    },
    {
      id: 'C8',
      what: 'cutout large enough for a ClassIn dock (no mushy upscales)',
      got: `short side ${Math.min(r.out.width, r.out.height)}px (want ${MIN_DOCK_SRC}+)`,
      ok: Math.min(r.out.width, r.out.height) >= MIN_DOCK_SRC,
    },
  ];
}

/**
 * External clipart packs are already-composed art, so their framing (C2-C4) is
 * settled history the way a --convert pack's is. In white mode only the gates
 * that predict a dirty cutout block a write; framing still reports.
 */
const WHITE_BLOCKING = new Set(['C1', 'C6', 'C7', 'C8']);

/** Dock toys under this short-side look soft when ClassIn enlarges them. */
const MIN_DOCK_SRC = 120;

// Converting the already-approved pack is a different job from vetting a fresh
// generation. C2-C5 describe how well the image was *composed*, which is settled
// history for art that already shipped; only the gates that predict a dirty
// cutout get to block a conversion. The framing numbers are still reported.
const CONVERT_BLOCKING = new Set(['C1', 'C6', 'C7', 'C9']);

// A contact sheet keyed in bulk is fresh generation, but the re-pad-to-margin
// step normalizes the output frame no matter how the source cell was composed,
// so C2-C4 (framing) are settled by the pipeline itself, and C5/C8 are
// measurement artifacts on thin/small props. Only a dirty field or a
// hole-punching near-black interior (C1/C6, and C7 which rides with C1) predicts
// a bad cutout — so a sheet tile blocks on exactly the same set a convert does.
const SHEET_BLOCKING = new Set(['C1', 'C6', 'C7', 'C9', 'C10']);

const rel = (p) => path.relative(ROOT, p);
const rawPath = (name) => path.join(AUDIT_DIR, `${name}-raw.png`);

const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
const pair = ([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`;
const entryLine = (key, entry) =>
  `    ${JSON.stringify(key)}: { ${Object.entries(entry).map(pair).join(', ')} }`;

// Manifest serialization (one prop per line, never pretty-printed) lives in
// scripts/lib/manifest-lock.mjs now, shared by every manifest writer.

/**
 * Bank the original first: in convert mode source and destination are one file.
 * Sliced props all share one raw, banked under the sheet's own name rather than
 * copied nine times.
 */
function writeCutout(job, r) {
  fs.copyFileSync(job.src, rawPath(job.rawName || job.name));
  fs.writeFileSync(job.dest, Buffer.from(r.png.split(',')[1], 'base64'));
}

/**
 * The manifest is still updated after every prop so a convert run which dies
 * partway records the props it already overwrote — but each update now goes
 * through mutateManifest (manifest-lock.mjs): lock → fresh read → patch just
 * this run's key → atomic write. Writing the whole startup copy back per prop
 * was the lost-update bug: a merge that landed mid-run got erased by our next
 * write from the stale in-memory manifest.
 */
async function patchManifestKey(dest, key, apply, fallbackRow) {
  await mutateManifest(dest, (m) => {
    if (!m.props[key] && fallbackRow) m.props[key] = fallbackRow;
    if (m.props[key]) apply(m.props[key]);
  });
}

const slug = (s) => s.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
const csv = (name) =>
  arg(name, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const ANCHORS = ['bottom', 'top', 'center'];

async function main() {
  const convert = flag('convert');
  const sheet = flag('sheet');
  // Staging run: write cutouts (to --outdir if given) but never the live
  // manifest. --stage-all additionally forces past the hard gates so every
  // non-empty panel lands for eyeballing.
  const stageAll = flag('stage-all');
  const stage = flag('stage') || stageAll;
  const opts = {
    threshold: Number(arg('threshold', '24')),
    size: Number(arg('size', '512')),
    margin: Number(arg('margin', '0.08')),
    white: flag('white'),
    whiteTol: Number(arg('white-tol', '14')),
  };

  const manifestPath = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');
  const jobs = [];
  // Always load: C10 personSubject reads manifest.props[job.name] even without --write.
  let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let grid = null;
  let skipped = 0;

  if (convert) {
    for (const [key, p] of Object.entries(manifest.props)) {
      if (p.alpha) continue;
      const src = path.join(OUT_DIR, p.file);
      if (!fs.existsSync(src)) {
        console.log(`SKIP  ${key} — no file at ${rel(src)}`);
        skipped++;
        continue;
      }
      jobs.push({ name: key, src, dest: src, components: p.components || 1 });
    }
    if (!jobs.length) {
      console.log('Nothing to convert — every manifest prop already has alpha.');
      return;
    }
    console.log(`Converting ${jobs.length} prop(s) in place.\n`);
  } else {
    const [rows, cols] = arg('grid', '1x1').split('x').map(Number);
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
      console.error('--grid must be RxC in whole numbers, e.g. --grid=3x3');
      process.exit(1);
    }
    const src = resolveSource();
    const gridBounds = parseGridBounds(arg('grid-bounds'));

    // In sheet mode the cells are the work list; otherwise there is one cell,
    // which for a plain image is the whole frame.
    const cells = sheet
      ? Array.from({ length: rows * cols }, (_, i) => [Math.floor(i / cols), i % cols])
      : [arg('cell', '0,0').split(',').map(Number)];
    const names = sheet ? csv('names') : [arg('name', path.basename(src, path.extname(src)))];
    if (sheet && names.length !== cells.length) {
      console.error(
        `--names lists ${names.length} prop(s) but --grid=${rows}x${cols} has ${cells.length} cells. ` +
          'Name every cell in reading order, left to right then top to bottom.'
      );
      process.exit(1);
    }
    if (cells.some(([r, c]) => !(r >= 0 && r < rows && c >= 0 && c < cols))) {
      console.error(`--cell must be row,col inside --grid=${rows}x${cols}`);
      process.exit(1);
    }

    const roles = csv('roles');
    const scales = csv('scales');
    const anchors = csv('anchors');
    // A sheet's raw is the sheet, so it is banked once rather than copied per
    // panel; a single import keeps banking under the prop's own name.
    const rawName = sheet ? slug(path.basename(src, path.extname(src))) : null;
    if (rows > 1 || cols > 1) grid = { rows, cols };

    cells.forEach(([row, col], i) => {
      const anchor = anchors[i] || arg('anchor', 'bottom');
      if (!ANCHORS.includes(anchor)) {
        console.error(`anchor "${anchor}" for ${names[i]} must be bottom, top or center`);
        process.exit(1);
      }
      const scale = scales[i] ?? arg('scale');
      const name = slug(names[i]);
      jobs.push({
        name,
        src,
        rawName,
        dest: path.join(OUT_DIR, `${name}.png`),
        row,
        col,
        cellIndex: row * cols + col,
        components: Number(arg('components', '1')),
        relativeScale: scale ? Number(scale) : null,
        anchor,
        role: roles[i] || arg('role', 'TODO'),
      });
    });
    if (sheet) {
      console.log(`Slicing ${jobs.length} panel(s) from a ${rows}x${cols} sheet.`);
      if (gridBounds) console.log(`Using explicit grid bounds ${gridBounds.x},${gridBounds.y},${gridBounds.width},${gridBounds.height}.`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  // One browser and one page for the whole run. A fresh browser per prop is
  // most of the wall clock when the entire pack goes through in one pass.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let converted = 0;
  const sheetRows = [];
  const stageResults = [];
  try {
    // Found once for the whole sheet, so nine panels cost one scan.
    const gridData = grid ? await panelRects(page, jobs[0].src, grid.rows, grid.cols, opts.threshold, parseGridBounds(arg('grid-bounds'))) : null;
    const rects = gridData ? gridData.rects : null;
    if (rects && sheet) {
      const filledCells = rects.filter((b) => b.active > 0).length;
      const minFilled = Number(arg('min-filled-cells', String(jobs.length)));
      if (!Number.isFinite(minFilled) || minFilled < 0) {
        throw new Error('--min-filled-cells must be a non-negative number');
      }
      console.log(
        `Grid bounds (${gridData.bounds.mode}): ${gridData.bounds.x1 - gridData.bounds.x0}x${gridData.bounds.y1 - gridData.bounds.y0}@${gridData.bounds.x0},${gridData.bounds.y0}`
      );
      console.log(
        `Panels: ${rects.map((b) => `${b.width}x${b.height}@${b.x},${b.y} active=${b.active}`).join('  ')}\n`
      );
      if (filledCells < minFilled) {
        throw new Error(
          `Sheet has ${filledCells} filled panel(s), below --min-filled-cells=${minFilled}. ` +
            'Check grid, bounds, or labels before positional identities can shift.'
        );
      }
    }

    for (const job of jobs) {
      const r = await cutout(page, job.src, opts, rects ? rects[job.cellIndex] : null);
      if (r.empty) {
        if (!convert && !sheet) {
          console.log(`\nNothing above the black threshold in ${rel(job.src)} — is it an empty frame?`);
          process.exitCode = 1;
          break;
        }
        console.log(`SKIP  ${job.name} — nothing above the black threshold`);
        if (sheet) {
          stageResults.push({ name: job.name, cell: [job.row, job.col], landed: false, reason: 'empty panel', gates: [] });
          process.exitCode = 1;
        }
        skipped++;
        continue;
      }

      r.personSubject = looksLikePersonKey(job.name, manifest.props[job.name]);
      const gates = opts.white ? gatesForWhite(r, job.components) : gatesFor(r, job.components);
      const failed = gates.filter((g) => !g.ok);

      if (convert) {
        const blocking = failed.filter((g) => CONVERT_BLOCKING.has(g.id));
        const notes = failed.map((g) => `${g.id} ${g.got}`).join('; ');
        if (blocking.length) {
          console.log(`SKIP  ${job.name} — ${blocking.map((g) => `${g.id} ${g.got}`).join('; ')}`);
          skipped++;
          continue;
        }
        writeCutout(job, r);
        const patchEntry = (entry) => {
          entry.alpha = true;
          entry.aspect = Number((r.out.width / r.out.height).toFixed(2));
          entry.srcW = r.out.width;
          entry.srcH = r.out.height;
          // Only a count above one is information. Thin-line art (slot-pad) erodes
          // to nothing and measures 0, which is a limit of the measurement, not a
          // prop with no pieces — recording it would put a lie in the manifest.
          if (r.blobs > 1) entry.components = r.blobs;
          if (r.bodyHue != null) entry.bodyHue = r.bodyHue;
          // Every prop needs an anchor for standOn to place it; resting on the
          // floor is the safe assumption when nobody has said otherwise.
          if (!entry.anchor) entry.anchor = 'bottom';
        };
        // Patch our in-memory copy (later C10 checks read it) and the live
        // file — the latter against a fresh read under the manifest lock.
        patchEntry(manifest.props[job.name]);
        await patchManifestKey(manifestPath, job.name, patchEntry, manifest.props[job.name]);
        converted++;
        console.log(
          `OK    ${job.name} — ${r.out.width}x${r.out.height}, edge ${r.edgeRatio.toFixed(2)}x, ` +
            `${r.blobs} shape(s)${notes ? `  [soft: ${notes}]` : ''}`
        );
        continue;
      }

      const sliced = r.panel.width !== r.source.width || r.panel.height !== r.source.height;
      const inDesc = sliced
        ? `${r.source.width}x${r.source.height} sheet, ${r.panel.width}x${r.panel.height} panel ` +
          `[${job.row},${job.col}]`
        : `${r.source.width}x${r.source.height}`;
      console.log(`\n${sheet ? `— ${job.name} — ` : ''}${inDesc} in, ${r.out.width}x${r.out.height} out\n`);
      for (const g of gates) console.log(`  ${g.ok ? 'PASS' : 'FAIL'}  ${g.id}  ${g.what} — ${g.got}`);

      if (opts.white && r.darkInside > 0.15) {
        console.log(
          `  NOTE large interior near-white area (${pct(r.darkInside)}) — eyeball for eaten white or a re-opened hole`
        );
      }

      // Which failures actually block a write. White mode blocks only the
      // dirty-cutout gates; a sheet blocks on {C1,C6,C7} and auto-forces the
      // rest; a single fresh prop still blocks on every failed gate, exactly as
      // before.
      const blockingFailed = opts.white
        ? failed.filter((g) => WHITE_BLOCKING.has(g.id))
        : sheet
        ? failed.filter((g) => SHEET_BLOCKING.has(g.id))
        : failed;

      // On a sheet, surface the soft gates that were auto-forced so the agent
      // still sees them, but they neither block nor drop the tile.
      if (sheet) {
        const softForced = failed.filter((g) => !blockingFailed.includes(g));
        if (softForced.length) {
          console.log(`  [soft-forced: ${softForced.map((g) => `${g.id} ${g.got}`).join(', ')}]`);
        }
      }

      if (blockingFailed.length && !flag('force') && !stageAll) {
        const soft = failed.filter((g) => !blockingFailed.includes(g)).map((g) => g.id);
        console.log(
          `\n${blockingFailed.length} gate(s) failed. Regenerate this prop with a targeted correction, ` +
            `or pass --force if you have looked at it and disagree.` +
            (soft.length ? ` (soft, not blocking: ${soft.join(', ')})` : '')
        );
        process.exitCode = 1;
        // One bad panel should not cost the other eight; the run reports at the
        // end which ones landed.
        if (sheet) {
          stageResults.push({
            name: job.name,
            cell: [job.row, job.col],
            landed: false,
            reason: blockingFailed.map((g) => `${g.id} ${g.got}`).join('; '),
            gates: gates.map((g) => ({ id: g.id, ok: g.ok, got: g.got })),
            failed: failed.map((g) => g.id),
          });
          skipped++;
          continue;
        }
        break;
      }

      writeCutout(job, r);
      console.log(`\nWrote ${rel(job.dest)}`);
      console.log(`Raw kept at ${rel(rawPath(job.rawName || job.name))}`);

      const tags = arg('tags', '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      // Field order matches what --convert writes, so a pasted row sits in the
      // manifest looking like its neighbours.
      const pack = arg('pack', '').trim();
      const row = {
        file: path.basename(job.dest),
        role: job.role,
        tags: tags.length ? tags : ['TODO'],
        relativeScale: job.relativeScale ?? 0.5,
        anchor: job.anchor,
        alpha: true,
        aspect: Number((r.out.width / r.out.height).toFixed(2)),
        srcW: r.out.width,
        srcH: r.out.height,
      };
      if (job.components !== 1) row.components = job.components;
      if (r.bodyHue != null) row.bodyHue = r.bodyHue;
      if (pack) row.pack = pack;

      if (job.relativeScale == null) {
        console.log('  NOTE no --scale given — relativeScale is a placeholder 0.5, set it deliberately');
      }
      if (flag('write') && !stage) {
        // In-memory copy for later C10 checks; live file via lock + fresh
        // read so a concurrent merge's keys survive (sorting happens there).
        manifest.props[job.name] = row;
        await mutateManifest(manifestPath, (m) => {
          m.props[job.name] = row;
        });
        console.log(`Wrote manifest row ${job.name}${pack ? ` pack=${pack}` : ''}`);
      }
      if (sheet) {
        sheetRows.push(entryLine(job.name, row));
        stageResults.push({
          name: job.name,
          cell: [job.row, job.col],
          landed: true,
          forced: blockingFailed.length > 0,
          gates: gates.map((g) => ({ id: g.id, ok: g.ok, got: g.got })),
          failed: failed.map((g) => g.id),
          dest: path.relative(ROOT, job.dest).replace(/\\/g, '/'),
          row,
        });
        continue;
      }
      if (!flag('write')) {
        console.log('\nPaste into public/assets/09_props/manifest.json under "props":\n');
        console.log(`${entryLine(job.name, row)},`);
        console.log('\nOr re-run with --write [--pack=theme]. Then: npm run assets:prop-qa');
      } else {
        console.log('\nThen: npm run assets:prop-qa   (see it on light and dark boards)');
      }
    }
  } finally {
    await browser.close();
  }

  if (convert) console.log(`\n${converted} converted, ${skipped} skipped.`);
  if (sheet) {
    console.log(`\n${sheetRows.length} panel(s) written, ${skipped} skipped.`);
    if (sheetRows.length && !stage) {
      console.log('\nPaste into public/assets/09_props/manifest.json under "props":\n');
      console.log(`${sheetRows.join(',\n')},`);
      console.log('\nThen: npm run assets:prop-qa   (see them on light and dark boards)');
    }
  }

  // A staged bulk run leaves a machine-readable record so a wrapper (or a later
  // merge step) can build rows / QA without re-parsing stdout.
  const resultsPath = arg('results');
  if (resultsPath) {
    fs.writeFileSync(path.resolve(ROOT, resultsPath), JSON.stringify(stageResults, null, 2));
    console.log(`\nWrote per-panel results to ${rel(path.resolve(ROOT, resultsPath))}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
