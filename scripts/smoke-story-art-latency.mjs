/**
 * Benchmark gemini-3.1-flash-image latency (p50/p95) for story-art planning.
 *
 * Usage: node scripts/smoke-story-art-latency.mjs [N]
 * Needs GEMINI_API_KEY in .env (or env). Optional GEMINI_IMAGE_MODEL.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const N = Math.max(1, Math.min(10, Number(process.argv[2]) || 3));

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY — set it in .env and re-run.');
  process.exit(1);
}

const PROMPT = `Flat children's-book illustration, soft gouache wash, warm palette.
A friendly stone castle with an open wooden gate and a small orange cat nearby.
No text, no letters, no signs, no writing of any kind. Uncluttered, culturally generic.`;

async function oneShot() {
  const t0 = Date.now();
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '4:3', imageSize: '1K' },
        },
      }),
    }
  );
  const raw = await resp.text();
  const ms = Date.now() - t0;
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, ms, error: `non-JSON ${resp.status}` };
  }
  if (!resp.ok) {
    return { ok: false, ms, error: data?.error?.message || `HTTP ${resp.status}` };
  }
  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData && p.inlineData.data);
  if (!img) {
    return { ok: false, ms, error: 'no inline image in response' };
  }
  return { ok: true, ms, bytes: Buffer.from(img.inlineData.data, 'base64').length };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[i];
}

console.log(`Smoke story-art latency: model=${MODEL} N=${N}`);
const results = [];
for (let i = 0; i < N; i++) {
  process.stdout.write(`  run ${i + 1}/${N}… `);
  const r = await oneShot();
  results.push(r);
  console.log(r.ok ? `${r.ms}ms (${r.bytes} bytes)` : `FAIL ${r.ms}ms — ${r.error}`);
}

const okMs = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
console.log('\nSummary');
console.log(`  ok: ${okMs.length}/${N}`);
if (okMs.length) {
  console.log(`  p50: ${percentile(okMs, 50)}ms`);
  console.log(`  p95: ${percentile(okMs, 95)}ms`);
  console.log(`  min: ${okMs[0]}ms  max: ${okMs[okMs.length - 1]}ms`);
}
process.exit(okMs.length ? 0 : 1);
