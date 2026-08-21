/**
 * Build a literal old-vs-new review surface for all 480 vocab candidates.
 *
 * The generated HTML shows the candidate cell cropped from its ordered 3x3
 * source sheet beside the current live original. Reviewers choose one explicit
 * verdict and download the updated JSON. No verdict mutates live art.
 *
 * Usage:
 *   node scripts/build-art-replacement-review.mjs
 *   node scripts/build-art-replacement-review.mjs --check
 *   node scripts/build-art-replacement-review.mjs --require-complete
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = path.join(ROOT, 'docs', 'art-replacements-stockpile-inventory.json');
const DECISIONS = path.join(ROOT, 'docs', 'art-replacement-review-decisions.json');
const RESOLUTIONS = path.join(ROOT, 'docs', 'art-replacement-resolutions.json');
const OUT_DIR = path.join(ROOT, 'tmp', 'art-replacement-review');
const HTML = path.join(OUT_DIR, 'index.html');
const CHECK = process.argv.includes('--check') || process.argv.includes('--require-complete');
const REQUIRE_COMPLETE = process.argv.includes('--require-complete');
const VERDICTS = new Set([
  'PENDING',
  'PASS_REPLACE',
  'HOLD_AMBIGUOUS',
  'JUNK_CANDIDATE',
  'SUPERSEDED_BY_APPROVED_LINEAGE',
]);
const QUALITY_DIMENSIONS = [
  'identity',
  'alpha_background',
  'crop',
  'sharpness',
  'text_logo',
];
const QUALITY_VALUES = new Set(['PENDING', 'PASS', 'FAIL', 'AMBIGUOUS', 'NOT_REVIEWED_SUPERSEDED']);

function dispositionFor(verdict) {
  if (verdict === 'PASS_REPLACE') return 'APPROVED_REPLACEMENT_SOURCE';
  if (verdict === 'HOLD_AMBIGUOUS') return 'HOLD';
  if (verdict === 'JUNK_CANDIDATE') return 'JUNK';
  if (verdict === 'SUPERSEDED_BY_APPROVED_LINEAGE') return 'REFERENCE_ONLY';
  return null;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function stable(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.generated_at;
  delete copy.updated_at;
  return JSON.stringify(copy);
}

function repoPath(value) {
  const absolute = path.isAbsolute(value) ? value : path.resolve(ROOT, value);
  return path.relative(ROOT, absolute).replace(/\\/g, '/');
}

function sheetPath(batch, sheet) {
  const dir = path.isAbsolute(batch.sheet_dir)
    ? batch.sheet_dir
    : path.resolve(ROOT, batch.sheet_dir);
  return path.join(dir, sheet.file);
}

const source = readJson(INVENTORY);
const queue = [];
for (const [batchId, batch] of Object.entries(source.batches || {})) {
  const sheets = batch.sheets || [];
  const items = batch.items || [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const sheetIndex = Math.floor(index / 9);
    const cellIndex = index % 9;
    const sheet = sheets[sheetIndex];
    if (!sheet) {
      throw new Error(`${batchId} item ${index} has no ordered source sheet`);
    }
    const candidate = sheetPath(batch, sheet);
    const original = path.resolve(ROOT, item.original_path || '');
    queue.push({
      replacement_key: item.replacement_key,
      original_key: item.original_key,
      batch: batchId,
      source_sheet: repoPath(candidate),
      source_cell: [Math.floor(cellIndex / 3), cellIndex % 3],
      original_path: item.original_path ? repoPath(original) : null,
      reason_codes: Array.isArray(item.reason_codes) ? item.reason_codes : [],
      source_notes: item.notes || null,
      verdict: 'PENDING',
      candidate_quality: {
        identity: 'PENDING',
        alpha_background: 'PENDING',
        crop: 'PENDING',
        sharpness: 'PENDING',
        text_logo: 'PENDING',
      },
      reviewer_note: '',
      approved_lineage_key: null,
      source_disposition_after_verdict: null,
    });
  }
}

if (queue.length !== 480) {
  throw new Error(`Expected 480 replacement candidates, found ${queue.length}`);
}

const existing = fs.existsSync(DECISIONS) ? readJson(DECISIONS) : null;
const existingByKey = new Map(
  (existing?.decisions || []).map((row) => [row.replacement_key, row])
);
const decisions = queue.map((row) => {
  const prior = existingByKey.get(row.replacement_key);
  if (!prior) return row;
  return {
    ...row,
    verdict: prior.verdict || 'PENDING',
    candidate_quality: Object.fromEntries(
      QUALITY_DIMENSIONS.map((dimension) => [
        dimension,
        prior.candidate_quality?.[dimension] || 'PENDING',
      ])
    ),
    reviewer_note: prior.reviewer_note || '',
    approved_lineage_key: prior.approved_lineage_key || null,
    source_disposition_after_verdict:
      prior.source_disposition_after_verdict || dispositionFor(prior.verdict),
  };
});

const errors = [];
const seen = new Set();
for (const row of decisions) {
  if (!row.replacement_key || seen.has(row.replacement_key)) {
    errors.push(`duplicate/missing replacement_key: ${row.replacement_key}`);
  }
  seen.add(row.replacement_key);
  if (!VERDICTS.has(row.verdict)) errors.push(`${row.replacement_key}: invalid verdict ${row.verdict}`);
  for (const dimension of QUALITY_DIMENSIONS) {
    if (!QUALITY_VALUES.has(row.candidate_quality?.[dimension])) {
      errors.push(
        `${row.replacement_key}: invalid ${dimension} quality ${row.candidate_quality?.[dimension]}`
      );
    }
  }
  if (!fs.existsSync(path.join(ROOT, row.source_sheet))) {
    errors.push(`${row.replacement_key}: missing candidate sheet ${row.source_sheet}`);
  }
  if (row.original_path && !fs.existsSync(path.join(ROOT, row.original_path))) {
    errors.push(`${row.replacement_key}: missing original ${row.original_path}`);
  }
  if (row.verdict === 'PASS_REPLACE' && row.original_key !== row.approved_lineage_key) {
    errors.push(`${row.replacement_key}: PASS_REPLACE must approve exact original_key lineage`);
  }
  if (
    row.verdict === 'PASS_REPLACE'
    && QUALITY_DIMENSIONS.some((dimension) => row.candidate_quality[dimension] !== 'PASS')
  ) {
    errors.push(`${row.replacement_key}: PASS_REPLACE requires PASS on all quality dimensions`);
  }
  if (
    row.verdict === 'HOLD_AMBIGUOUS'
    && !QUALITY_DIMENSIONS.some((dimension) => row.candidate_quality[dimension] === 'AMBIGUOUS')
  ) {
    errors.push(`${row.replacement_key}: HOLD_AMBIGUOUS requires an AMBIGUOUS quality dimension`);
  }
  if (
    row.verdict === 'JUNK_CANDIDATE'
    && !QUALITY_DIMENSIONS.some((dimension) => row.candidate_quality[dimension] === 'FAIL')
  ) {
    errors.push(`${row.replacement_key}: JUNK_CANDIDATE requires a FAIL quality dimension`);
  }
  if (
    row.verdict === 'SUPERSEDED_BY_APPROVED_LINEAGE'
    && !row.approved_lineage_key
  ) {
    errors.push(`${row.replacement_key}: superseded verdict needs approved_lineage_key`);
  }
  if (
    row.verdict === 'SUPERSEDED_BY_APPROVED_LINEAGE'
    && QUALITY_DIMENSIONS.some(
      (dimension) => row.candidate_quality[dimension] !== 'NOT_REVIEWED_SUPERSEDED'
    )
  ) {
    errors.push(
      `${row.replacement_key}: superseded verdict requires NOT_REVIEWED_SUPERSEDED quality`
    );
  }
  if (row.verdict !== 'PENDING' && !String(row.reviewer_note || '').trim()) {
    errors.push(`${row.replacement_key}: completed verdict requires a concrete reviewer note`);
  }
  if (row.source_disposition_after_verdict !== dispositionFor(row.verdict)) {
    errors.push(
      `${row.replacement_key}: source disposition must be ${dispositionFor(row.verdict)}`
    );
  }
}

const counts = Object.fromEntries([...VERDICTS].map((verdict) => [
  verdict,
  decisions.filter((row) => row.verdict === verdict).length,
]));
if (REQUIRE_COMPLETE && counts.PENDING) {
  errors.push(`${counts.PENDING} candidates still PENDING`);
}

const decisionDoc = {
  schema_version: 1,
  updated_at: new Date().toISOString(),
  source: 'docs/art-replacements-stockpile-inventory.json',
  policy: {
    PASS_REPLACE: 'Overwrite only original_key after candidate quality passes; preserve source lineage.',
    HOLD_AMBIGUOUS: 'Do not overwrite; retain candidate and original with a concrete unresolved note.',
    JUNK_CANDIDATE: 'Reject candidate only; keep the current live original and all source evidence.',
    SUPERSEDED_BY_APPROVED_LINEAGE: 'Do not overwrite from this candidate; retain it as reference evidence.',
  },
  accounting: counts,
  decisions,
};
const completedResolutions = decisions
  .filter((row) => row.verdict !== 'PENDING')
  .map((row) => {
    const hold = ['PASS_REPLACE', 'HOLD_AMBIGUOUS'].includes(row.verdict);
    const terminalState = hold
      ? 'HOLD'
      : row.verdict === 'JUNK_CANDIDATE'
        ? 'JUNK'
        : 'REFERENCE_ONLY';
    return {
      key: row.replacement_key,
      target_key: row.original_key,
      intended_disposition:
        row.verdict === 'PASS_REPLACE' ? 'GENERATOR_ELIGIBLE' : terminalState,
      terminal_state: terminalState,
      states: ['RAW', terminalState],
      remove_states: [
        'REVIEW_REQUIRED',
        'GENERATOR_ELIGIBLE',
        'SPECIALIZED',
        ...(hold ? [] : ['HOLD']),
      ],
      activation_blocker:
        row.verdict === 'PASS_REPLACE'
          ? 'APPROVED_REPLACEMENT_AWAITS_SAFE_IMPORT'
          : row.verdict === 'HOLD_AMBIGUOUS'
            ? 'AMBIGUOUS_REPLACEMENT_REVIEW'
            : null,
      blocker_detail:
        row.verdict === 'PASS_REPLACE'
          ? 'Visual comparison approved this exact original_key lineage. Keep fail-closed until the candidate cell is keyed, imported over the original key, and retrieval validation passes.'
          : row.verdict === 'HOLD_AMBIGUOUS'
            ? row.reviewer_note
            : null,
      art_replacement: {
        verdict: row.verdict,
        approved_lineage_key: row.approved_lineage_key,
        candidate_quality: row.candidate_quality,
        reviewer_note: row.reviewer_note,
        source_disposition_after_verdict: row.source_disposition_after_verdict,
      },
    };
  });
const resolutionDoc = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  source: 'docs/art-replacement-review-decisions.json',
  policy: {
    PASS_REPLACE: 'HOLD until the approved cell safely replaces original_key and passes retrieval validation.',
    HOLD_AMBIGUOUS: 'HOLD with the reviewer note as the concrete unresolved question.',
    JUNK_CANDIDATE: 'JUNK the candidate only; preserve the current live original.',
    SUPERSEDED_BY_APPROVED_LINEAGE: 'REFERENCE_ONLY source evidence; preserve approved lineage and do not overwrite.',
  },
  accounting: {
    completed: completedResolutions.length,
    pending: counts.PENDING,
    by_terminal_state: Object.fromEntries(
      ['HOLD', 'JUNK', 'REFERENCE_ONLY'].map((state) => [
        state,
        completedResolutions.filter((row) => row.terminal_state === state).length,
      ])
    ),
  },
  decisions: completedResolutions,
};

if (CHECK) {
  if (errors.length) {
    for (const error of errors) console.error(`FAIL ${error}`);
    process.exit(1);
  }
  if (!fs.existsSync(RESOLUTIONS) || stable(readJson(RESOLUTIONS)) !== stable(resolutionDoc)) {
    console.error(`FAIL missing or stale ${path.relative(ROOT, RESOLUTIONS)}`);
    process.exit(1);
  }
  console.log(`PASS 480 replacement decisions structurally valid; pending=${counts.PENDING}`);
  console.log(`PASS ${completedResolutions.length} completed verdict(s) have durable state overlays`);
  process.exit(0);
}

fs.writeFileSync(DECISIONS, `${JSON.stringify(decisionDoc, null, 2)}\n`);
fs.writeFileSync(RESOLUTIONS, `${JSON.stringify(resolutionDoc, null, 2)}\n`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const browserRows = decisions.map((row) => ({
  ...row,
  candidate_url: pathToFileURL(path.join(ROOT, row.source_sheet)).href,
  original_url: row.original_path
    ? pathToFileURL(path.join(ROOT, row.original_path)).href
    : null,
}));
const payload = JSON.stringify(browserRows).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Art replacement review</title>
<style>
body{margin:0;background:#121417;color:#eef;font:14px/1.4 system-ui}
header{position:sticky;top:0;z-index:2;background:#1d2128;padding:12px 18px;border-bottom:1px solid #444}
input,select{background:#0e1115;color:#eef;border:1px solid #556;border-radius:5px;padding:6px}
button{padding:7px 12px;border:0;border-radius:5px;background:#63a8ff;color:#07111f;font-weight:700}
#rows{padding:12px}.row{display:grid;grid-template-columns:180px 260px 260px 1fr;gap:12px;padding:12px;border-bottom:1px solid #303640}
.meta{word-break:break-word}.art{width:256px;height:256px;background:#fff;border:1px solid #667;border-radius:4px}
.candidate{background-repeat:no-repeat;background-size:300% 300%}
.original{object-fit:contain}.controls{display:grid;gap:8px;align-content:start}
.quality{display:grid;grid-template-columns:1fr 1fr;gap:6px}.quality label{display:grid;gap:2px;font-size:12px;color:#bbc}
.reason{color:#f5c76b}.missing{display:grid;place-items:center;color:#f88;background:#2a1111}
</style></head><body>
<header>
  <b>480 art replacements — literal candidate vs current original</b>
  <input id="search" placeholder="filter key/batch">
  <select id="filter"><option value="">all verdicts</option>${[...VERDICTS].map((v) => `<option>${v}</option>`).join('')}</select>
  <button id="download">Download decisions JSON</button>
  <span id="count"></span>
</header><main id="rows"></main>
<script>
const rows=${payload};
const verdicts=${JSON.stringify([...VERDICTS])};
const qualityDimensions=${JSON.stringify(QUALITY_DIMENSIONS)};
const qualityValues=${JSON.stringify([...QUALITY_VALUES])};
const root=document.getElementById('rows');
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  const q=document.getElementById('search').value.toLowerCase();
  const f=document.getElementById('filter').value;
  const shown=rows.filter(r=>(!q||JSON.stringify(r).toLowerCase().includes(q))&&(!f||r.verdict===f));
  document.getElementById('count').textContent=shown.length+' shown / '+rows.filter(r=>r.verdict==='PENDING').length+' pending';
  root.innerHTML=shown.map(r=>{
    const [rr,cc]=r.source_cell;
    const posX=cc===0?'0%':cc===1?'50%':'100%';
    const posY=rr===0?'0%':rr===1?'50%':'100%';
    return '<section class="row" data-key="'+esc(r.replacement_key)+'">'+
      '<div class="meta"><b>'+esc(r.replacement_key)+'</b><br>→ '+esc(r.original_key)+'<br>'+esc(r.batch)+'<br>cell '+rr+','+cc+'<p class="reason">'+esc(r.reason_codes.join(', '))+'</p></div>'+
      '<div><div>candidate</div><div class="art candidate" style="background-image:url(\\''+esc(r.candidate_url)+'\\');background-position:'+posX+' '+posY+'"></div></div>'+
      '<div><div>current original</div>'+(r.original_url?'<img class="art original" src="'+esc(r.original_url)+'">':'<div class="art missing">missing original</div>')+'</div>'+
      '<div class="controls"><select class="verdict">'+verdicts.map(v=>'<option '+(v===r.verdict?'selected':'')+'>'+v+'</option>').join('')+'</select>'+
      '<div class="quality">'+qualityDimensions.map(d=>'<label>'+esc(d)+'<select data-quality="'+esc(d)+'">'+qualityValues.map(v=>'<option '+(v===(r.candidate_quality[d]||'PENDING')?'selected':'')+'>'+v+'</option>').join('')+'</select></label>').join('')+'</div>'+
      '<input class="lineage" value="'+esc(r.approved_lineage_key||'')+'" placeholder="approved lineage key">'+
      '<input class="note" value="'+esc(r.reviewer_note||'')+'" placeholder="concrete review note">'+
      '<small>source disposition: <span class="disposition">'+esc(r.source_disposition_after_verdict||'pending')+'</span></small>'+
      '<small>'+esc(r.source_notes||'')+'</small></div></section>';
  }).join('');
  root.querySelectorAll('.row').forEach(el=>{
    const row=rows.find(r=>r.replacement_key===el.dataset.key);
    el.querySelector('.verdict').onchange=e=>{
      row.verdict=e.target.value;
      row.source_disposition_after_verdict=row.verdict==='PASS_REPLACE'?'APPROVED_REPLACEMENT_SOURCE':row.verdict==='HOLD_AMBIGUOUS'?'HOLD':row.verdict==='JUNK_CANDIDATE'?'JUNK':row.verdict==='SUPERSEDED_BY_APPROVED_LINEAGE'?'REFERENCE_ONLY':null;
      if(row.verdict==='PASS_REPLACE'){
        row.approved_lineage_key=row.original_key;
        qualityDimensions.forEach(d=>row.candidate_quality[d]='PASS');
      }else if(row.verdict==='SUPERSEDED_BY_APPROVED_LINEAGE'){
        qualityDimensions.forEach(d=>row.candidate_quality[d]='NOT_REVIEWED_SUPERSEDED');
      }
      render();
    };
    el.querySelectorAll('[data-quality]').forEach(select=>{
      select.onchange=e=>row.candidate_quality[e.target.dataset.quality]=e.target.value;
    });
    el.querySelector('.lineage').oninput=e=>row.approved_lineage_key=e.target.value||null;
    el.querySelector('.note').oninput=e=>row.reviewer_note=e.target.value;
  });
}
document.getElementById('search').oninput=render;
document.getElementById('filter').onchange=render;
document.getElementById('download').onclick=()=>{
  const accounting=Object.fromEntries(verdicts.map(v=>[v,rows.filter(r=>r.verdict===v).length]));
  const out={schema_version:1,updated_at:new Date().toISOString(),source:'docs/art-replacements-stockpile-inventory.json',accounting,decisions:rows.map(({candidate_url,original_url,...r})=>r)};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)+'\\n'],{type:'application/json'}));a.download='art-replacement-review-decisions.json';a.click();
};
render();
</script></body></html>`;
fs.writeFileSync(HTML, html);
console.log(`Wrote ${path.relative(ROOT, DECISIONS)} (${counts.PENDING} pending)`);
console.log(`Wrote ${path.relative(ROOT, RESOLUTIONS)} (${completedResolutions.length} resolved)`);
console.log(`Wrote ${path.relative(ROOT, HTML)} (open locally for side-by-side review)`);
