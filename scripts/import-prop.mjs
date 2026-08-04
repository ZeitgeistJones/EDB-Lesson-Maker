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
 *   --role         manifest role, e.g. cover / tray / container
 *   --tags         comma-separated manifest tags
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
 *   --size         long edge of the output PNG (default 512)
 *   --margin       share of the output left empty on each side (default 0.08)
 *   --force        write the PNG even when a gate fails
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', '09_props', 'img');
const AUDIT_DIR = path.join(ROOT, 'assets-inbox', 'raw');

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

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

async function cutout(page, src, opts) {
  const dataUrl = `data:image/png;base64,${fs.readFileSync(src).toString('base64')}`;
  return page.evaluate(
    async ({ url, T, SIZE, MARGIN }) => {
      const img = new Image();
      img.src = url;
      await img.decode();

      const w = img.width;
      const h = img.height;
      const n = w * h;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
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

      // C1 — is the frame actually a black field, or did we get an environment?
      const ring = Math.max(4, Math.round(Math.min(w, h) * 0.006));
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
      const ringPurity = ringBlack / ringTotal;

      const mask = new Uint8Array(n);
      for (let p = 0; p < n; p++) mask[p] = val[p] > T ? 1 : 0;

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
      for (let p = 0; p < n; p++) {
        if (!inner[p]) continue;
        innerN++;
        if (val[p] <= T + 6) innerDark++;
      }
      const darkInside = innerN ? innerDark / innerN : 0;

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
      const core = erode(mask, 2);
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
      const outerW = bboxW / (1 - MARGIN * 2);
      const outerH = bboxH / (1 - MARGIN * 2);
      const scale = SIZE / Math.max(outerW, outerH);
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
        source: { width: w, height: h },
        out: { width: outW, height: outH },
        ringPurity,
        margins,
        span,
        blobs,
        darkInside,
        edgeRatio,
        bodyHue,
      };
    },
    { url: dataUrl, T: opts.threshold, SIZE: opts.size, MARGIN: opts.margin }
  );
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function gatesFor(r, wantComponents) {
  const minMargin = Math.min(r.margins.left, r.margins.right, r.margins.top, r.margins.bottom);
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
  ];
}

// Converting the already-approved pack is a different job from vetting a fresh
// generation. C2-C5 describe how well the image was *composed*, which is settled
// history for art that already shipped; only the gates that predict a dirty
// cutout get to block a conversion. The framing numbers are still reported.
const CONVERT_BLOCKING = new Set(['C1', 'C6', 'C7']);

const rel = (p) => path.relative(ROOT, p);
const rawPath = (name) => path.join(AUDIT_DIR, `${name}-raw.png`);

const inline = (v) => (Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
const pair = ([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`;
const entryLine = (key, entry) =>
  `    ${JSON.stringify(key)}: { ${Object.entries(entry).map(pair).join(', ')} }`;

/**
 * One prop per line, the way the manifest was hand-written. A plain indented
 * stringify spreads every prop over eight lines, so adding one field to the
 * pack would read as a rewrite of the whole file in review.
 */
function serializeManifest(m) {
  const { props, ...head } = m;
  const headLines = Object.entries(head).map((e) => `  ${pair(e)}`);
  const propLines = Object.entries(props).map(([key, entry]) => entryLine(key, entry));
  return `{\n${headLines.join(',\n')},\n  "props": {\n${propLines.join(',\n')}\n  }\n}\n`;
}

/** Bank the original first: in convert mode source and destination are one file. */
function writeCutout(job, r) {
  fs.copyFileSync(job.src, rawPath(job.name));
  fs.writeFileSync(job.dest, Buffer.from(r.png.split(',')[1], 'base64'));
}

/**
 * The manifest is rewritten after every prop so that a convert run which dies
 * partway still records the props it already overwrote — otherwise a re-run
 * would key an already-keyed PNG. Rewriting one file forty times in a minute is
 * exactly what makes Windows hand back a transient UNKNOWN while a watcher or
 * scanner holds it open, so retry instead of losing the record.
 */
async function writeManifest(dest, manifest) {
  const text = serializeManifest(manifest);
  for (let attempt = 0; ; attempt++) {
    try {
      fs.writeFileSync(dest, text);
      return;
    } catch (err) {
      if (attempt >= 20) throw err;
      await new Promise((done) => setTimeout(done, 60));
    }
  }
}

async function main() {
  const convert = flag('convert');
  const opts = {
    threshold: Number(arg('threshold', '24')),
    size: Number(arg('size', '512')),
    margin: Number(arg('margin', '0.08')),
  };

  const manifestPath = path.join(ROOT, 'public', 'assets', '09_props', 'manifest.json');
  const jobs = [];
  let manifest = null;
  let skipped = 0;

  if (convert) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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
    if (!['bottom', 'top', 'center'].includes(arg('anchor', 'bottom'))) {
      console.error('--anchor must be bottom, top or center');
      process.exit(1);
    }
    const src = resolveSource();
    const name = arg('name', path.basename(src, path.extname(src)))
      .replace(/[^a-z0-9-]+/gi, '-')
      .toLowerCase();
    jobs.push({
      name,
      src,
      dest: path.join(OUT_DIR, `${name}.png`),
      components: Number(arg('components', '1')),
      relativeScale: arg('scale') ? Number(arg('scale')) : null,
      anchor: arg('anchor', 'bottom'),
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  // One browser and one page for the whole run. A fresh browser per prop is
  // most of the wall clock when the entire pack goes through in one pass.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let converted = 0;
  try {
    for (const job of jobs) {
      const r = await cutout(page, job.src, opts);
      if (r.empty) {
        if (!convert) {
          console.log(`\nNothing above the black threshold in ${rel(job.src)} — is it an empty frame?`);
          process.exitCode = 1;
          break;
        }
        console.log(`SKIP  ${job.name} — nothing above the black threshold`);
        skipped++;
        continue;
      }

      const gates = gatesFor(r, job.components);
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
        const entry = manifest.props[job.name];
        entry.alpha = true;
        entry.aspect = Number((r.out.width / r.out.height).toFixed(2));
        // Only a count above one is information. Thin-line art (slot-pad) erodes
        // to nothing and measures 0, which is a limit of the measurement, not a
        // prop with no pieces — recording it would put a lie in the manifest.
        if (r.blobs > 1) entry.components = r.blobs;
        if (r.bodyHue != null) entry.bodyHue = r.bodyHue;
        // Every prop needs an anchor for standOn to place it; resting on the
        // floor is the safe assumption when nobody has said otherwise.
        if (!entry.anchor) entry.anchor = 'bottom';
        await writeManifest(manifestPath, manifest);
        converted++;
        console.log(
          `OK    ${job.name} — ${r.out.width}x${r.out.height}, edge ${r.edgeRatio.toFixed(2)}x, ` +
            `${r.blobs} shape(s)${notes ? `  [soft: ${notes}]` : ''}`
        );
        continue;
      }

      console.log(`\n${r.source.width}x${r.source.height} in, ${r.out.width}x${r.out.height} out\n`);
      for (const g of gates) console.log(`  ${g.ok ? 'PASS' : 'FAIL'}  ${g.id}  ${g.what} — ${g.got}`);

      if (failed.length && !flag('force')) {
        console.log(
          `\n${failed.length} gate(s) failed. Regenerate this prop with a targeted correction, ` +
            `or pass --force if you have looked at it and disagree.`
        );
        process.exitCode = 1;
        break;
      }

      writeCutout(job, r);
      console.log(`\nWrote ${rel(job.dest)}`);
      console.log(`Raw kept at ${rel(rawPath(job.name))}`);

      const tags = arg('tags', '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      // Field order matches what --convert writes, so a pasted row sits in the
      // manifest looking like its neighbours.
      const row = {
        file: path.basename(job.dest),
        role: arg('role', 'TODO'),
        tags: tags.length ? tags : ['TODO'],
        relativeScale: job.relativeScale ?? 0.5,
        anchor: job.anchor,
        alpha: true,
        aspect: Number((r.out.width / r.out.height).toFixed(2)),
      };
      if (job.components !== 1) row.components = job.components;
      if (r.bodyHue != null) row.bodyHue = r.bodyHue;

      if (job.relativeScale == null) {
        console.log('  NOTE no --scale given — relativeScale is a placeholder 0.5, set it deliberately');
      }
      console.log('\nPaste into public/assets/09_props/manifest.json under "props":\n');
      console.log(`${entryLine(job.name, row)},`);
      console.log('\nThen: npm run assets:prop-qa   (see it on light and dark boards)');
    }
  } finally {
    await browser.close();
  }

  if (convert) console.log(`\n${converted} converted, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
