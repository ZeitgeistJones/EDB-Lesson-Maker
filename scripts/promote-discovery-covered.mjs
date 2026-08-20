/**
 * Promote high-confidence discovery newCoveredConcept into curated extras.
 * Never auto-merges needsReview or newDiscoveryGap (those need art first).
 *
 *   node scripts/promote-discovery-covered.mjs           # dry-run
 *   node scripts/promote-discovery-covered.mjs --apply   # write source
 *   node scripts/build-picturable-dictionary.mjs
 *   npm run coverageloop
 *
 * Source: tmp/asset-discovery/latest.json (run npm run discovery first).
 * Does NOT loosen pack-exact-match. Verified canonical hits only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DISCOVERY = path.join(ROOT, 'tmp/asset-discovery/latest.json');
const SOURCE = path.join(ROOT, 'scripts/data/esl-picturable-source.json');
const APPLY = process.argv.includes('--apply');

/** Ambiguous lemmas — pack may exist but ESL sense is muddy. */
const AMBIGUOUS = new Set([
  'level',
  'switch',
  'reel',
  'hem',
  'cuff',
  'amber',
  'cap',
  'bat',
  'heart',
  'brain',
]);

/** Adult/lab specialty rarely needed on kid boards (still pack-verified). */
const NICHE = new Set([
  'bunsen burner',
  'petri dish',
  'pipette',
  'circuit breaker',
  'dental drill',
  'blood pressure cuff',
  'otoscope',
  'plumb bob',
  'seam ripper',
  'multimeter',
  'anemometer',
  'barometer',
  'bobbin',
  'allen key',
  'embroidery hoop',
  'pin cushion',
  'thimble',
  'welding mask',
  'pipe wrench',
  'utility knife',
  'metal detector',
]);

function highConfidence(row) {
  const picturable = +row.picturable || 0;
  const usefulness = +row.usefulness || 0;
  return (
    (picturable >= 0.9 && usefulness >= 0.55) ||
    (picturable >= 0.85 && usefulness >= 0.65)
  );
}

function main() {
  if (!fs.existsSync(DISCOVERY)) {
    throw new Error(`Missing ${DISCOVERY}. Run: npm run discovery`);
  }
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing ${SOURCE}`);
  }

  const discovery = JSON.parse(fs.readFileSync(DISCOVERY, 'utf8'));
  const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const deny = new Set((src.deny || []).map((w) => String(w).toLowerCase().trim()));
  const inDict = new Set([
    ...(src.extras || []).map((w) => String(w).toLowerCase().trim()),
    ...(src.topics || []).flatMap((t) => t.words || []).map((w) => String(w).toLowerCase().trim()),
  ]);

  const ncc = Array.isArray(discovery.buckets?.newCoveredConcept)
    ? discovery.buckets.newCoveredConcept
    : [];

  const totalsNcc = discovery.totals?.newCoveredConcept;
  if (
    typeof totalsNcc === 'number' &&
    totalsNcc > 0 &&
    ncc.length === 0
  ) {
    throw new Error(
      `latest.json totals.newCoveredConcept=${totalsNcc} but buckets.newCoveredConcept is empty. ` +
        `Re-run a full discovery (npm run discovery), not a gaps-only snapshot.`
    );
  }

  const rejected = { notVerified: [], lowConf: [], ambiguous: [], niche: [], alreadyInDict: [], denied: [] };
  const promote = [];

  for (const row of ncc) {
    const word = String(row.word || '')
      .toLowerCase()
      .trim();
    if (!word) continue;
    if (!row.verified) {
      rejected.notVerified.push(word);
      continue;
    }
    if (deny.has(word)) {
      rejected.denied.push(word);
      continue;
    }
    if (inDict.has(word)) {
      rejected.alreadyInDict.push(word);
      continue;
    }
    if (AMBIGUOUS.has(word)) {
      rejected.ambiguous.push(word);
      continue;
    }
    if (NICHE.has(word)) {
      rejected.niche.push(word);
      continue;
    }
    if (!highConfidence(row)) {
      rejected.lowConf.push(word);
      continue;
    }
    promote.push(word);
  }

  const unique = [...new Set(promote)].sort((a, b) => a.localeCompare(b));
  const report = {
    generatedAt: new Date().toISOString(),
    apply: APPLY,
    discoveryNewCovered: ncc.length,
    promoteCount: unique.length,
    promote: unique,
    rejected,
  };

  const outReport = path.join(ROOT, 'tmp/asset-discovery/promote-covered-report.json');
  fs.mkdirSync(path.dirname(outReport), { recursive: true });
  fs.writeFileSync(outReport, JSON.stringify(report, null, 2) + '\n');

  console.log(`newCoveredConcept: ${ncc.length}`);
  console.log(`promote (high-confidence): ${unique.length}`);
  console.log(`rejected ambiguous=${rejected.ambiguous.length} niche=${rejected.niche.length} lowConf=${rejected.lowConf.length}`);
  console.log(`report: ${path.relative(ROOT, outReport)}`);

  if (!APPLY) {
    console.log('Dry-run only. Re-run with --apply to append into extras.');
    return;
  }

  const extras = [
    ...new Set([
      ...(src.extras || []).map((w) => String(w).toLowerCase().trim()),
      ...unique,
    ]),
  ].sort((a, b) => a.localeCompare(b));
  src.extras = extras;
  if (!String(src.note || '').includes('Discovery promote')) {
    src.note =
      (src.note || '') +
      ' Discovery promote batches append verified newCoveredConcept into extras only.';
  }
  fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + '\n');
  console.log(`Applied ${unique.length} words → ${path.relative(ROOT, SOURCE)} (extras=${extras.length})`);
  console.log('Next: node scripts/build-picturable-dictionary.mjs && npm run coverageloop');
}

main();
